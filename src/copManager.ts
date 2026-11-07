import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';

let isInitialized = false;
/** Cache für bereits angelegte Datenbank-Objekte zur Vermeidung unnötiger DB-Zugriffe */
const ensuredObjects = new Set<string>();

/**
 * Stellt einmalig pro Adapter-Laufzeit sicher, dass ein internes COP-Objekt existiert.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die Objekt-ID.
 * @param obj Die Objekt-Definition.
 */
async function ensureCopObject(adapter: LuxtronikAdapter, id: string, obj: ioBroker.SettableObject): Promise<void> {
	if (ensuredObjects.has(id)) {
		return;
	}
	await adapter.setObjectNotExistsAsync(id, obj);
	ensuredObjects.add(id);
}

/**
 * Verarbeitet die COP-Daten und berechnet Live-Werte anhand von absoluten Zählern und Snapshots.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param bzVal Der aktuelle Betriebszustand der Wärmepumpe als String.
 * @returns Ein Promise, das nach Abschluss der Berechnung aufgelöst wird.
 */
export async function processCopData(adapter: LuxtronikAdapter, bzVal: string): Promise<void> {
	const config = adapter.config as any;
	if (!config.cop_calculation_active) {
		return;
	}

	try {
		writeLog(`COP Manager gestartet. Modus: ${bzVal}`, 'debug');

		const isExternalPower = config.cop_source_power === 'external' && Boolean(config.cop_oid_power_total);
		const isExternalThermal = config.cop_source_thermal === 'external' && Boolean(config.cop_oid_thermal_total);

		// 1. ALLE STROMZÄHLER ABRUFEN (Gesamt + Einzelzähler)
		let currentPowerTotal = 0;
		let currentPowerHeating = 0;
		let currentPowerWater = 0;

		if (isExternalPower) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_power_total);
			if (state && typeof state.val === 'number') {
				currentPowerTotal = state.val;
			}
		} else {
			const [sTotal, sHeat, sWater] = await Promise.all([
				adapter.getStateAsync(getDpPath('energy_total')),
				adapter.getStateAsync(getDpPath('energy_heating')),
				adapter.getStateAsync(getDpPath('energy_warmwater')),
			]);
			if (sTotal && typeof sTotal.val === 'number') {
				currentPowerTotal = sTotal.val;
			}
			if (sHeat && typeof sHeat.val === 'number') {
				currentPowerHeating = sHeat.val;
			}
			if (sWater && typeof sWater.val === 'number') {
				currentPowerWater = sWater.val;
			}
		}

		// 2. ALLE WÄRMEMENGENZÄHLER ABRUFEN (Gesamt + Einzelzähler)
		let currentThermalTotal = 0;
		let currentThermalHeating = 0;
		let currentThermalWater = 0;

		if (isExternalThermal) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_thermal_total);
			if (state && typeof state.val === 'number') {
				currentThermalTotal = state.val;
			}
		} else {
			const [sTotal, sHeat, sWater] = await Promise.all([
				adapter.getStateAsync(getDpPath('thermalenergy_total')),
				adapter.getStateAsync(getDpPath('thermalenergy_heating')),
				adapter.getStateAsync(getDpPath('thermalenergy_warmwater')),
			]);
			if (sTotal && typeof sTotal.val === 'number') {
				currentThermalTotal = sTotal.val;
			}
			if (sHeat && typeof sHeat.val === 'number') {
				currentThermalHeating = sHeat.val;
			}
			if (sWater && typeof sWater.val === 'number') {
				currentThermalWater = sWater.val;
			}
		}

		// --- SEPARATE REFERENZ-SPEICHER (Verhindert Sprünge beim Taktwechsel!) ---
		const rawPowerTotalId = 'hidden.cop_buckets.last_raw_power';
		const rawPowerHeatId = 'hidden.cop_buckets.last_raw_power_heating';
		const rawPowerWaterId = 'hidden.cop_buckets.last_raw_power_water';

		const rawThermalTotalId = 'hidden.cop_buckets.last_raw_thermal';
		const rawThermalHeatId = 'hidden.cop_buckets.last_raw_thermal_heating';
		const rawThermalWaterId = 'hidden.cop_buckets.last_raw_thermal_water';

		const rawTrackers = [
			{ id: rawPowerTotalId, name: 'Last Raw Power Total', current: currentPowerTotal },
			{ id: rawPowerHeatId, name: 'Last Raw Power Heating', current: currentPowerHeating },
			{ id: rawPowerWaterId, name: 'Last Raw Power Water', current: currentPowerWater },
			{ id: rawThermalTotalId, name: 'Last Raw Thermal Total', current: currentThermalTotal },
			{ id: rawThermalHeatId, name: 'Last Raw Thermal Heating', current: currentThermalHeating },
			{ id: rawThermalWaterId, name: 'Last Raw Thermal Water', current: currentThermalWater },
		];

		if (!isInitialized) {
			for (const tracker of rawTrackers) {
				await ensureCopObject(adapter, tracker.id, {
					type: 'state',
					common: { name: tracker.name, type: 'number', role: 'value', read: true, write: false },
					native: {},
				});
				const stateInit = await adapter.getStateAsync(tracker.id);
				if (!stateInit || stateInit.val === null) {
					await adapter.setState(tracker.id, { val: tracker.current, ack: true });
				}
			}

			isInitialized = true;
			await handleTimeRollover(adapter);
			return;
		}

		// 3. LETZTE ZÄHLERSTÄNDE LADEN & DELTAS ISOLIERT BERECHNEN
		const readAndCalcDelta = async (id: string, currentVal: number): Promise<number> => {
			const lastState = await adapter.getStateAsync(id);
			const lastVal = lastState && typeof lastState.val === 'number' ? lastState.val : currentVal;
			const delta = Math.max(0, currentVal - lastVal);

			// Referenzwert sofort nachziehen (sowohl bei Zuwachs als auch bei Zähler-Reset)
			if (currentVal !== lastVal) {
				await adapter.setState(id, { val: currentVal, ack: true });
			}
			return delta;
		};

		const deltaPowerTotal = await readAndCalcDelta(rawPowerTotalId, currentPowerTotal);
		const deltaPowerHeating = await readAndCalcDelta(rawPowerHeatId, currentPowerHeating);
		const deltaPowerWater = await readAndCalcDelta(rawPowerWaterId, currentPowerWater);

		const deltaThermalTotal = await readAndCalcDelta(rawThermalTotalId, currentThermalTotal);
		const deltaThermalHeating = await readAndCalcDelta(rawThermalHeatId, currentThermalHeating);
		const deltaThermalWater = await readAndCalcDelta(rawThermalWaterId, currentThermalWater);

		// 4. ZEITWECHSEL PRÜFEN
		await handleTimeRollover(adapter);

		// 5. INTELLIGENTE ZUORDNUNG MIT AUTOMATISCHEM FALLBACK AUF TOTAL
		let modeDeltaPower = 0;
		let modeDeltaThermal = 0;

		if (bzVal === '0' || bzVal === '4') {
			// HEIZEN (inkl. Abtauen): Einzelzähler nutzen; falls 0 -> Fallback auf Gesamtzähler-Delta
			modeDeltaPower = isExternalPower
				? deltaPowerTotal
				: deltaPowerHeating > 0
					? deltaPowerHeating
					: deltaPowerTotal;
			modeDeltaThermal = isExternalThermal
				? deltaThermalTotal
				: deltaThermalHeating > 0
					? deltaThermalHeating
					: deltaThermalTotal;

			if (modeDeltaPower > 0 || modeDeltaThermal > 0) {
				await addDeltaToBucket(adapter, 'Heating', modeDeltaPower, modeDeltaThermal);
			}
		} else if (bzVal === '1') {
			// WARMWASSER: Einzelzähler nutzen; falls 0 (z.B. Novelan Bug) -> Fallback auf Gesamtzähler-Delta
			modeDeltaPower = isExternalPower
				? deltaPowerTotal
				: deltaPowerWater > 0
					? deltaPowerWater
					: deltaPowerTotal;
			modeDeltaThermal = isExternalThermal
				? deltaThermalTotal
				: deltaThermalWater > 0
					? deltaThermalWater
					: deltaThermalTotal;

			if (!isExternalPower && deltaPowerWater === 0 && deltaPowerTotal > 0) {
				writeLog(
					`[COP] WW-Stromzähler meldet 0 Delta. Nutze Delta von energy_total (${deltaPowerTotal} kWh) als Fallback.`,
					'debug',
				);
			}
			if (!isExternalThermal && deltaThermalWater === 0 && deltaThermalTotal > 0) {
				writeLog(
					`[COP] WW-Wärmezähler meldet 0 Delta. Nutze Delta von thermalenergy_total (${deltaThermalTotal} kWh) als Fallback.`,
					'debug',
				);
			}

			if (modeDeltaPower > 0 || modeDeltaThermal > 0) {
				await addDeltaToBucket(adapter, 'HotWater', modeDeltaPower, modeDeltaThermal);
			}
		}

		// TOTAL-BUCKET: Nimmt das reale Gesamtdelta (oder das Modus-Delta als Fallback)
		const totalBucketPower = deltaPowerTotal > 0 ? deltaPowerTotal : modeDeltaPower;
		const totalBucketThermal = deltaThermalTotal > 0 ? deltaThermalTotal : modeDeltaThermal;

		if (totalBucketPower > 0 || totalBucketThermal > 0) {
			await addDeltaToBucket(adapter, 'Total', totalBucketPower, totalBucketThermal);
		}

		// 6. LIVE COP BERECHNEN UND SCHREIBEN
		await calculateAndWriteCop(adapter, 'Total');
		await calculateAndWriteCop(adapter, 'Heating');
		await calculateAndWriteCop(adapter, 'HotWater');
	} catch (err: any) {
		writeLog(`Fehler bei der COP-Berechnung: ${err.message}`, 'error');
	}
}

/**
 * Prüft auf Tages-, Monats- oder Jahreswechsel (lokale Systemzeit) und erstellt Snapshots der Endloszähler.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 */
async function handleTimeRollover(adapter: LuxtronikAdapter): Promise<void> {
	writeLog(`Prüfe Tageswechsel und lege Ordner an...`, 'debug');
	const dateStateId = 'hidden.cop_buckets.last_date';
	await ensureCopObject(adapter, 'hidden', {
		type: 'folder',
		common: { name: 'Hidden System Data' },
		native: {},
	});
	await ensureCopObject(adapter, 'hidden.cop_buckets', {
		type: 'folder',
		common: { name: 'COP Data Buckets' },
		native: {},
	});
	await ensureCopObject(adapter, dateStateId, {
		type: 'state',
		common: { name: 'Last calculation date', type: 'string', role: 'date', read: true, write: false },
		native: {},
	});

	const state = await adapter.getStateAsync(dateStateId);
	const lastDate = state && typeof state.val === 'string' ? state.val : '';

	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	const currentDate = `${y}-${m}-${d}`; // Lokales Datum: YYYY-MM-DD
	const currentMonth = `${y}-${m}`; // Lokaler Monat: YYYY-MM
	const currentYear = `${y}`; // Lokales Jahr: YYYY

	if (lastDate !== currentDate) {
		const lastMonth = lastDate ? lastDate.substring(0, 7) : '';
		const lastYear = lastDate ? lastDate.substring(0, 4) : '';
		const categories = ['Total', 'Heating', 'HotWater'];

		for (const cat of categories) {
			const powerAbs = await getAbsoluteValue(adapter, cat, 'power');
			const thermalAbs = await getAbsoluteValue(adapter, cat, 'thermal');

			// IMMER: Tageswechsel Snapshot
			await setSnapshot(adapter, cat, 'today', powerAbs, thermalAbs);

			// Historie für 7-Tage-COP aktualisieren
			await update7DaysHistory(adapter, cat, powerAbs, thermalAbs);

			// Monatswechsel Snapshot
			if (lastMonth !== currentMonth) {
				await setSnapshot(adapter, cat, 'month', powerAbs, thermalAbs);
			}

			// Jahreswechsel Snapshot
			if (lastYear !== currentYear) {
				await setSnapshot(adapter, cat, 'year', powerAbs, thermalAbs);
			}
		}

		await adapter.setState(dateStateId, { val: currentDate, ack: true });
		writeLog(`Tageswechsel erkannt. COP-Snapshots für ${currentDate} wurden gesichert.`, 'info');
	}
}

/**
 * Liest den Endloszähler für eine spezifische Kategorie aus.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die Kategorie (Total, Heating, HotWater).
 * @param type Art der Energie (power oder thermal).
 * @returns Der absolute Wert in kWh.
 */
async function getAbsoluteValue(
	adapter: LuxtronikAdapter,
	category: string,
	type: 'power' | 'thermal',
): Promise<number> {
	const id = `hidden.cop_buckets.${category}_${type}_absolute`;
	await ensureCopObject(adapter, id, {
		type: 'state',
		common: { name: `${category} ${type} Absolute`, type: 'number', role: 'value', read: true, write: false },
		native: {},
	});
	const state = await adapter.getStateAsync(id);
	return state && typeof state.val === 'number' ? state.val : 0;
}

/**
 * Schreibt einen Snapshot-Wert.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die Kategorie.
 * @param timeframe Der Zeitraum (today, month, year).
 * @param power Der zu sichernde Stromwert.
 * @param thermal Der zu sichernde Wärmewert.
 */
async function setSnapshot(
	adapter: LuxtronikAdapter,
	category: string,
	timeframe: string,
	power: number,
	thermal: number,
): Promise<void> {
	const powerId = `hidden.cop_buckets.${category}_power_start_${timeframe}`;
	const thermalId = `hidden.cop_buckets.${category}_thermal_start_${timeframe}`;

	await ensureCopObject(adapter, powerId, {
		type: 'state',
		common: {
			name: `${category} Power Start ${timeframe}`,
			type: 'number',
			role: 'value',
			read: true,
			write: false,
		},
		native: {},
	});
	await ensureCopObject(adapter, thermalId, {
		type: 'state',
		common: {
			name: `${category} Thermal Start ${timeframe}`,
			type: 'number',
			role: 'value',
			read: true,
			write: false,
		},
		native: {},
	});

	await adapter.setState(powerId, { val: power, ack: true });
	await adapter.setState(thermalId, { val: thermal, ack: true });
}

/**
 * Verwaltet einen rollierenden 7-Tage-Speicher als JSON.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die Kategorie.
 * @param currentPower Der absolute Stromzähler.
 * @param currentThermal Der absolute Wärmezähler.
 */
async function update7DaysHistory(
	adapter: LuxtronikAdapter,
	category: string,
	currentPower: number,
	currentThermal: number,
): Promise<void> {
	const historyId = `hidden.cop_buckets.${category}_history_7d`;
	await ensureCopObject(adapter, historyId, {
		type: 'state',
		common: { name: `${category} 7 Days History`, type: 'string', role: 'json', read: true, write: false },
		native: {},
	});

	const state = await adapter.getStateAsync(historyId);
	let history: { power: number; thermal: number }[] = [];

	if (state && typeof state.val === 'string' && state.val !== '') {
		try {
			history = JSON.parse(state.val);
		} catch {
			/* ignore */
		}
	}

	history.push({ power: currentPower, thermal: currentThermal });
	if (history.length > 7) {
		history.shift(); // Ältesten Eintrag entfernen (Ringpuffer)
	}

	await adapter.setState(historyId, { val: JSON.stringify(history), ack: true });
}

/**
 * Addiert die neuen kWh-Deltas auf die internen Endloszähler.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die zu aktualisierende Kategorie.
 * @param deltaPower Die verbrauchte elektrische Energie.
 * @param deltaThermal Die erzeugte thermische Energie.
 */
async function addDeltaToBucket(
	adapter: LuxtronikAdapter,
	category: string,
	deltaPower: number,
	deltaThermal: number,
): Promise<void> {
	const powerId = `hidden.cop_buckets.${category}_power_absolute`;
	const thermalId = `hidden.cop_buckets.${category}_thermal_absolute`;

	const currentPower = await getAbsoluteValue(adapter, category, 'power');
	const currentThermal = await getAbsoluteValue(adapter, category, 'thermal');

	await adapter.setState(powerId, { val: currentPower + deltaPower, ack: true });
	await adapter.setState(thermalId, { val: currentThermal + deltaThermal, ack: true });
}

/**
 * Liest die Endloszähler und Snapshots aus, berechnet die Differenz und schreibt den COP.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die auszulesende Kategorie (Total, Heating, HotWater).
 */
async function calculateAndWriteCop(adapter: LuxtronikAdapter, category: string): Promise<void> {
	const currentPower = await getAbsoluteValue(adapter, category, 'power');
	const currentThermal = await getAbsoluteValue(adapter, category, 'thermal');

	const dpMap: Record<string, Record<string, string>> = {
		Total: { today: 'cop_total_today', '7d': 'cop_total_7d', month: 'cop_total_month', year: 'cop_total_year' },
		Heating: {
			today: 'cop_heating_today',
			'7d': 'cop_heating_7d',
			month: 'cop_heating_month',
			year: 'cop_heating_year',
		},
		HotWater: { today: 'cop_water_today', '7d': 'cop_water_7d', month: 'cop_water_month', year: 'cop_water_year' },
	};

	// 1. Berechnung für Heute, Monat, Jahr
	const timeframes = ['today', 'month', 'year'];
	for (const tf of timeframes) {
		const powerStartId = `hidden.cop_buckets.${category}_power_start_${tf}`;
		const thermalStartId = `hidden.cop_buckets.${category}_thermal_start_${tf}`;

		const pState = await adapter.getStateAsync(powerStartId);
		const tState = await adapter.getStateAsync(thermalStartId);

		const pStart = pState && typeof pState.val === 'number' ? pState.val : currentPower;
		const tStart = tState && typeof tState.val === 'number' ? tState.val : currentThermal;

		const pUsed = currentPower - pStart;
		const tGen = currentThermal - tStart;

		if (pUsed > 0) {
			const cop = Math.round((tGen / pUsed) * 100) / 100;
			const targetId = getDpPath(dpMap[category][tf]);
			if (targetId) {
				await adapter.setState(targetId, { val: cop, ack: true });
			}
		}
	}

	// 2. Berechnung für rollierende 7 Tage
	const historyId = `hidden.cop_buckets.${category}_history_7d`;
	const hState = await adapter.getStateAsync(historyId);
	if (hState && typeof hState.val === 'string' && hState.val !== '') {
		try {
			const history = JSON.parse(hState.val);
			if (history.length > 0) {
				const oldest = history[0];
				const pUsed = currentPower - oldest.power;
				const tGen = currentThermal - oldest.thermal;
				if (pUsed > 0) {
					const cop = Math.round((tGen / pUsed) * 100) / 100;
					const targetId = getDpPath(dpMap[category]['7d']);
					if (targetId) {
						await adapter.setState(targetId, { val: cop, ack: true });
					}
				}
			}
		} catch {
			/* ignore */
		}
	}
}

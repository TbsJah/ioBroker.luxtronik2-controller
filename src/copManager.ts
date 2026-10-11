import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';

// Lokaler Cache für den Zählerstand des letzten Pollings
let lastPowerTotal = 0;
let lastThermalTotal = 0;
let isInitialized = false; // NEU: Sicheres Flag für den Start

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
		// 1. STROMVERBRAUCH ABRUFEN
		let currentPower = 0;
		if (config.cop_source_power === 'external' && config.cop_oid_power_total) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_power_total);
			if (state && typeof state.val === 'number') {
				currentPower = state.val;
			}
		} else {
			const state = await adapter.getStateAsync(getDpPath('energy_total'));
			if (state && typeof state.val === 'number') {
				currentPower = state.val;
			}
		}

		// 2. WÄRMEMENGE ABRUFEN
		let currentThermal = 0;
		if (config.cop_source_thermal === 'external' && config.cop_oid_thermal_total) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_thermal_total);
			if (state && typeof state.val === 'number') {
				currentThermal = state.val;
			}
		} else {
			const state = await adapter.getStateAsync(getDpPath('thermalenergy_total'));
			if (state && typeof state.val === 'number') {
				currentThermal = state.val;
			}
		}

		// Initialisierung beim ersten Durchlauf
		if (!isInitialized) {
			lastPowerTotal = currentPower;
			lastThermalTotal = currentThermal;
			isInitialized = true;
			// WICHTIG: Beim ersten Start prüfen wir direkt, ob wir Tageswechsel anstoßen müssen
			await handleTimeRollover(adapter);
			return;
		}

		// 3. DELTA BERECHNEN (Zuwachs seit letztem Polling in kWh)
		const deltaPower = currentPower - lastPowerTotal;

		const deltaThermal = currentThermal - lastThermalTotal;

		lastPowerTotal = currentPower;
		lastThermalTotal = currentThermal;

		// 4. ZEITWECHSEL PRÜFEN (Hat ein neuer Tag/Monat/Jahr begonnen?)
		await handleTimeRollover(adapter);

		// Wenn sich die Zähler nicht bewegt haben, keine Eimer füllen
		if (deltaPower > 0 || deltaThermal > 0) {
			// 5. WERTE IN DIE ENDLOS-ZÄHLER VERTEILEN
			await addDeltaToBucket(adapter, 'Total', deltaPower, deltaThermal);

			if (bzVal === '0') {
				await addDeltaToBucket(adapter, 'Heating', deltaPower, deltaThermal);
			} else if (bzVal === '1') {
				await addDeltaToBucket(adapter, 'HotWater', deltaPower, deltaThermal);
			}
		}

		// 6. LIVE COP BERECHNEN UND SCHREIBEN (Endloszähler minus Snapshot)
		await calculateAndWriteCop(adapter, 'Total');
		await calculateAndWriteCop(adapter, 'Heating');
		await calculateAndWriteCop(adapter, 'HotWater');
	} catch (err: any) {
		writeLog(`Fehler bei der COP-Berechnung: ${err.message}`, 'error');
	}
}

/**
 * Prüft auf Tages-, Monats- oder Jahreswechsel und erstellt Snapshots der Endloszähler.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 */
async function handleTimeRollover(adapter: LuxtronikAdapter): Promise<void> {
	writeLog(`Prüfe Tageswechsel und lege Ordner an...`, 'debug');
	const dateStateId = 'hidden.cop_buckets.last_date';
	await adapter.setObjectNotExistsAsync('hidden', {
		type: 'folder',
		common: { name: 'Hidden System Data' },
		native: {},
	});
	await adapter.setObjectNotExistsAsync('hidden.cop_buckets', {
		type: 'folder',
		common: { name: 'COP Data Buckets' },
		native: {},
	});
	await adapter.setObjectNotExistsAsync(dateStateId, {
		type: 'state',
		common: { name: 'Last calculation date', type: 'string', role: 'date', read: true, write: false },
		native: {},
	});

	const state = await adapter.getStateAsync(dateStateId);
	const lastDate = state && typeof state.val === 'string' ? state.val : '';

	const now = new Date();
	const currentDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
	const currentMonth = currentDate.substring(0, 7); // Format: YYYY-MM
	const currentYear = currentDate.substring(0, 4); // Format: YYYY

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
	await adapter.setObjectNotExistsAsync(id, {
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

	await adapter.setObjectNotExistsAsync(powerId, {
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
	await adapter.setObjectNotExistsAsync(thermalId, {
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
	await adapter.setObjectNotExistsAsync(historyId, {
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

	// Mapping der Ziel-Datenpunkte
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
				const oldest = history[0]; // Das ist der Stand vor bis zu 7 Tagen
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

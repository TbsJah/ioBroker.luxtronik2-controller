import type { AdapterInstance } from '@iobroker/adapter-core';
import {
	ERROR_CODES,
	HP_TYPES,
	OUTAGE_CODES,
	STATE_HEATING,
	STATE_ZEILE_1,
	STATE_ZEILE_2,
	STATE_ZEILE_3,
} from './codes';
import { writeLog } from './logger';
import { sanitizeName } from './objectManager';
import { getDpPath, getLuxIdByKey } from './stateMapping';

// ==========================================
// BERECHNUNGEN (DRY-Prinzip)
// ==========================================

/**
 * Universelle Hilfsfunktion, um zwei Werte aus dem ioBroker zu addieren.
 *
 * @param adapter - ioBroker Adapter-Instanz
 * @param sourceId1 - Pfad des ersten Quell-States
 * @param sourceId2 - Pfad des zweiten Quell-States
 * @param targetId - Pfad des Ziel-States, in den das Ergebnis geschrieben wird
 * @param logName - Name für Log-Einträge
 */
async function calculateSum(
	adapter: AdapterInstance,
	sourceId1: string,
	sourceId2: string,
	targetId: string,
	logName: string,
): Promise<void> {
	try {
		const [state1, state2] = await Promise.all([
			adapter.getStateAsync(sourceId1),
			adapter.getStateAsync(sourceId2),
		]);

		const val1 = state1 && typeof state1.val === 'number' ? state1.val : 0;
		const val2 = state2 && typeof state2.val === 'number' ? state2.val : 0;

		await adapter.setStateChangedAsync(targetId, val1 + val2, true);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler bei der Berechnung der ${logName}: ${msg}`, 'error');
	}
}

/**
 * Berechnet die gesamte Wärmemenge (Heizung + Warmwasser) und schreibt sie in den Ziel-State.
 *
 * @param adapter - ioBroker Adapter-Instanz
 * @returns void
 */
export async function calculateTotalThermalEnergy(adapter: AdapterInstance): Promise<void> {
	await calculateSum(
		adapter,
		'Informationen.09_Wärmemenge.thermalenergy_heating',
		'Informationen.09_Wärmemenge.thermalenergy_warmwater',
		'Informationen.09_Wärmemenge.thermalenergy_total',
		'Gesamt-Wärmemenge',
	);
}

/**
 * Berechnet die gesamte Energie (Heizung + Warmwasser) und schreibt sie in den Ziel-State.
 *
 * @param adapter - ioBroker Adapter-Instanz
 * @returns void
 */
export async function calculateTotalEnergy(adapter: AdapterInstance): Promise<void> {
	await calculateSum(
		adapter,
		'Informationen.10_Energie.energy_heating',
		'Informationen.10_Energie.energy_warmwater',
		'Informationen.10_Energie.energy_total',
		'Gesamt-Energie',
	);
}

// ==========================================
// HISTORIEN & LOGS (DRY-Prinzip)
// ==========================================

interface HistoryEntry {
	code: number;
	beschreibung: string;
	datum: string;
	timestamp: number;
}

async function updateHistory(
	adapter: AdapterInstance,
	rawValues: number[],
	timeStartIndex: number,
	codeStartIndex: number,
	targetStateId: string,
	fallbackPrefix: string,
	codeMap: Record<number, string>,
): Promise<void> {
	try {
		const historyList: HistoryEntry[] = [];

		for (let i = 0; i < 5; i++) {
			const code = rawValues[codeStartIndex + i];
			const timestamp = rawValues[timeStartIndex + i];

			if (timestamp !== undefined && timestamp > 0) {
				const date = new Date(timestamp * 1000);
				const formattedDate = date.toLocaleString('de-DE');

				let beschreibung = `${fallbackPrefix} (${code})`;
				if (codeMap[code] !== undefined) {
					beschreibung = codeMap[code];
				}

				historyList.push({
					code: code,
					beschreibung: beschreibung,
					datum: formattedDate,
					timestamp: timestamp, // Behoben: Timestamp ist wieder enthalten!
				});
			}
		}

		// Sortiert die Liste absteigend nach Timestamp
		historyList.sort((a, b) => b.timestamp - a.timestamp);

		const cleanList = historyList.map((entry, idx) => ({
			index: idx + 1,
			code: entry.code,
			beschreibung: entry.beschreibung,
			datum: entry.datum,
			timestamp: entry.timestamp,
		}));
		const jsonStr = JSON.stringify(cleanList);

		// Performance-Optimierung: Direkt über setStateChangedAsync regeln!
		const result = await adapter.setStateChangedAsync(targetStateId, { val: jsonStr, ack: true });
		if (result && (result as any).numChanges > 0) {
			writeLog(`Historie für ${targetStateId} aus Rohdaten aktualisiert.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aktualisieren der Historie: ${msg}`, 'error');
	}
}

/**
 * Updates the error history with the latest error codes.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values from the device.
 */
export async function updateErrorHistory(adapter: AdapterInstance, rawValues: number[]): Promise<void> {
	await updateHistory(
		adapter,
		rawValues,
		95,
		100,
		'Informationen.06_Fehlerspeicher.Fehlerspeicher',
		'Unbekannter Fehler',
		ERROR_CODES,
	);
}

/**
 * Updates the outage history with the latest outage codes.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values from the device.
 */
export async function updateOutageHistory(adapter: AdapterInstance, rawValues: number[]): Promise<void> {
	await updateHistory(
		adapter,
		rawValues,
		111,
		106,
		'Informationen.07_Abschaltungen.Abschaltungen',
		'Unbekannter Abschaltgrund',
		OUTAGE_CODES,
	);
}

/**
 * Calculates the temperature spread between supply and return temperatures.
 *
 * @param adapter - The adapter instance.
 */
export async function calculateTemperatureSpread(adapter: AdapterInstance): Promise<void> {
	try {
		const vorlaufPath = getDpPath('temperature_supply');
		const ruecklaufPath = getDpPath('temperature_return');

		if (!vorlaufPath || !ruecklaufPath) {
			return;
		}

		const [vorlaufState, ruecklaufState] = await Promise.all([
			adapter.getStateAsync(vorlaufPath),
			adapter.getStateAsync(ruecklaufPath),
		]);

		if (vorlaufState && ruecklaufState && vorlaufState.val !== null && ruecklaufState.val !== null) {
			const spreizung = parseFloat((Number(vorlaufState.val) - Number(ruecklaufState.val)).toFixed(2));
			const targetSpreadPath = getDpPath('spreizung_vorlauf_ruecklauf');
			if (targetSpreadPath) {
				await adapter.setStateChangedAsync(targetSpreadPath, spreizung, true);
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler bei der Berechnung der Temperatur-Spreizung: ${msg}`, 'error');
	}
}

/**
 * Updates the status strings based on raw sensor values and parameters.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values array from the Luxtronik device.
 * @param rawParams - The raw parameters array from the Luxtronik device.
 */
export async function updateStatusStrings(
	adapter: AdapterInstance,
	rawValues: number[],
	rawParams: number[],
): Promise<void> {
	try {
		const Heizgrenze = (rawParams[getLuxIdByKey('thresholdHeatingLimit')] || 0) / 10;
		const Absenkung = (rawParams[getLuxIdByKey('deltaHeatingReduction')] || 0) / 10;
		const AbsenkungMax = (rawParams[getLuxIdByKey('thresholdTemperatureSetBack')] || 0) / 10;
		const RücklaufSollMin = (rawParams[getLuxIdByKey('returnTemperatureTargetMin')] || 15) / 10;
		const RücklaufSoll = (rawValues[getLuxIdByKey('temperature_target_return')] || 15) / 10;
		const BetriebsartHeizung = rawParams[getLuxIdByKey('heating_operation_mode')] || 0;
		const Außentemperatur = (rawValues[getLuxIdByKey('temperature_outside')] || 0) / 10;
		const Mitteltemperatur = (rawValues[getLuxIdByKey('Mitteltemperatur')] || 0) / 10;

		let heatingStr = 'Unbekannt';

		if (
			BetriebsartHeizung === 0 &&
			Mitteltemperatur >= Heizgrenze &&
			(RücklaufSoll === RücklaufSollMin || (RücklaufSoll === 20 && Außentemperatur < 10))
		) {
			heatingStr = Außentemperatur >= 10 ? `Heizgrenze (Soll ${RücklaufSollMin} °C)` : 'Frostschutz (Soll 20 °C)';
		} else {
			heatingStr = STATE_HEATING[BetriebsartHeizung] || `unbekannt (${BetriebsartHeizung})`;
			if (BetriebsartHeizung === 0) {
				heatingStr =
					AbsenkungMax <= Außentemperatur
						? `${heatingStr} ${Absenkung} °C`
						: `Normal da < ${AbsenkungMax} °C`;
			}
		}

		const dpHeating = getDpPath('opStateHeatingString');
		if (dpHeating) {
			await adapter.setStateChangedAsync(dpHeating, heatingStr, true);
		}

		const codeZ1 = rawValues[117];
		const codeZ2 = rawValues[118];
		const codeZ3 = rawValues[119];
		const zeitSec = rawValues[120];

		const hotWaterBoilerValve = rawValues[getLuxIdByKey('hotWaterBoilerValve')] || 0;
		const opStateHotWaterOriginal = rawValues[124];

		const h = Math.floor((zeitSec || 0) / 3600);
		const m = Math.floor(((zeitSec || 0) % 3600) / 60);
		const s = (zeitSec || 0) % 60;
		const zeitString = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

		const stateStr = STATE_ZEILE_3[codeZ3] || 'Unbekannt';
		const dpExtState = getDpPath('heatpump_extendet_state_string');
		if (dpExtState) {
			await adapter.setStateChangedAsync(dpExtState, stateStr, true);
		}

		let extStateStr = 'Unbekannt';
		if (STATE_ZEILE_1[codeZ1]) {
			const textZ2 = STATE_ZEILE_2[codeZ2] || '';
			extStateStr = `${STATE_ZEILE_1[codeZ1]} ${textZ2} ${zeitString}`.trim();
		}
		const dpState = getDpPath('heatpump_state_string');
		if (dpState) {
			await adapter.setStateChangedAsync(dpState, extStateStr, true);
		}

		let hotWaterStr = 'Unbekannt';
		if (opStateHotWaterOriginal === 0) {
			hotWaterStr = 'Sperrzeit';
		} else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 1) {
			hotWaterStr = 'Aufheizen';
		} else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 0) {
			hotWaterStr = 'Temp. OK';
		} else if (opStateHotWaterOriginal === 3) {
			hotWaterStr = 'Aus';
		} else {
			hotWaterStr = `Unknown [${opStateHotWaterOriginal}/${hotWaterBoilerValve}]`;
		}
		const dpHotWater = getDpPath('opStateHotWaterString');
		if (dpHotWater) {
			await adapter.setStateChangedAsync(dpHotWater, hotWaterStr, true);
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aktualisieren der Status-Strings: ${msg}`, 'error');
	}
}

/**
 * Liest die einzelnen Start/Ende Zeiten aus den Einstellungen und erzeugt ein formatiertes JSON-Array.
 *
 * @param adapter The adapter instance
 */
export async function updateTimerTables(adapter: AdapterInstance): Promise<void> {
	try {
		// Cache für gelesene Zeit-Datenpunkte, um mehrfache DB-Zugriffe zu reduzieren
		const timeCache = new Map<string, string>();

		const getTime = async (key: string): Promise<string> => {
			if (timeCache.has(key)) {
				return timeCache.get(key) || '00:00';
			}

			try {
				const dpPath = getDpPath(key);
				if (!dpPath) {
					return '00:00';
				}

				const state = await adapter.getStateAsync(dpPath);
				if (state && typeof state.val === 'string') {
					const match = state.val.match(/^(\d{1,2}):(\d{1,2})/);
					if (match) {
						const formatted = `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
						timeCache.set(key, formatted);
						return formatted;
					}
				}
				return '00:00';
			} catch {
				return '00:00';
			}
		};

		const processTable = async (
			targetKey: string,
			prefix: string,
			endStr: string,
			slots: number,
		): Promise<void> => {
			try {
				const table: { on: string; off: string }[] = [];

				for (let i = 1; i <= slots; i++) {
					const [onTime, offTime] = await Promise.all([
						getTime(`${prefix}Start${i}`),
						getTime(`${prefix}${endStr}${i}`),
					]);
					table.push({ on: onTime, off: offTime });
				}

				const targetPath = getDpPath(targetKey);
				if (targetPath) {
					const jsonStr = JSON.stringify(table, null, 2);
					await adapter.setStateChangedAsync(targetPath, jsonStr, true);
				}
			} catch {
				// Ignorieren, falls Ziel-Datenpunkt nicht existiert
			}
		};

		const configs = [
			// === HEIZEN (3 Slots) ===
			{ target: 'heatingOperationTimerTableWeek', prefix: 'HZ_MoSo_', end: 'End', slots: 3 },
			{ target: 'heatingOperationTimerTable52MonFri', prefix: 'HZ_MoFr_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTable52SatSun', prefix: 'HZ_SaSo_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayMonday', prefix: 'HZ_Montag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayTuesday', prefix: 'HZ_Dienstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayWednesday', prefix: 'HZ_Mittwoch_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayThursday', prefix: 'HZ_Donnerstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayFriday', prefix: 'HZ_Freitag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDaySaturday', prefix: 'HZ_Samstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDaySunday', prefix: 'HZ_Sonntag_', end: 'Ende', slots: 3 },

			// === WARMWASSER (5 Slots) ===
			{ target: 'hotWaterTableWeek', prefix: 'WW_MoSo_', end: 'End', slots: 5 },
			{ target: 'hotWaterTable52MonFri', prefix: 'WW_MoFr_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTable52SatSun', prefix: 'WW_SaSo_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDayMonday', prefix: 'WW_Montag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDayTuesday', prefix: 'WW_Dienstag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDayWednesday', prefix: 'WW_Mittwoch_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDayThursday', prefix: 'WW_Donnerstag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDayFriday', prefix: 'WW_Freitag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDaySaturday', prefix: 'WW_Samstag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterTableDaySunday', prefix: 'WW_Sonntag_', end: 'Ende', slots: 5 },

			// === ZIRKULATION (5 Slots) ===
			{ target: 'hotWaterCircPumpTimerTableWeek', prefix: 'Zirkulation_MoSo_', end: 'End', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTable52MonFri', prefix: 'Zirkulation_MoFr_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTable52SatSun', prefix: 'Zirkulation_SaSo_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTableDayMonday', prefix: 'Zirkulation_Montag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTableDayTuesday', prefix: 'Zirkulation_Dienstag_', end: 'Ende', slots: 5 },
			{
				target: 'hotWaterCircPumpTimerTableDayWednesday',
				prefix: 'Zirkulation_Mittwoch_',
				end: 'Ende',
				slots: 5,
			},
			{
				target: 'hotWaterCircPumpTimerTableDayThursday',
				prefix: 'Zirkulation_Donnerstag_',
				end: 'Ende',
				slots: 5,
			},
			{ target: 'hotWaterCircPumpTimerTableDayFriday', prefix: 'Zirkulation_Freitag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTableDaySaturday', prefix: 'Zirkulation_Samstag_', end: 'Ende', slots: 5 },
			{ target: 'hotWaterCircPumpTimerTableDaySunday', prefix: 'Zirkulation_Sonntag_', end: 'Ende', slots: 5 },
		];

		// Performance-Optimierung: Alle Tabellen-Generierungen parallel via Promise.all abarbeiten!
		await Promise.all(configs.map(cfg => processTable(cfg.target, cfg.prefix, cfg.end, cfg.slots)));
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Erstellen der JSON-Timer-Tabellen: ${msg}`, 'error');
	}
}

interface CustomStateConfig {
	active: boolean;
	luxId?: number;
	name: string;
	source: 'parameter' | 'value';
	type: 'number' | 'boolean' | 'datetime' | 'string';
	factor?: number | null;
}

/**
 * Aktualisiert benutzerdefinierte Zustände basierend auf konfigurierten Luxtronik-IDs.
 *
 * @param adapter - ioBroker Adapter-Instanz
 * @param rawValues - Rohwerte aus der Luxtronik-Gerätedatenübertragung
 * @param rawParams - Rohparameter aus der Luxtronik-Gerätedatenübertragung
 */
export async function updateCustomStates(
	adapter: AdapterInstance,
	rawValues: number[],
	rawParams: number[],
): Promise<void> {
	try {
		const customStates = ((adapter.config as any).custom_states as CustomStateConfig[]) || [];
		for (const custom of customStates) {
			if (!custom.active || custom.luxId === undefined || !custom.name) {
				continue;
			}

			const rawArray = custom.source === 'parameter' ? rawParams : rawValues;
			const rawVal = rawArray[custom.luxId];

			if (rawVal === undefined) {
				continue;
			}

			let finalVal: string | number | boolean; // Typsicherheit erhöht (kein any mehr)

			if (custom.type === 'number') {
				finalVal = Number(rawVal);
				if (custom.factor !== undefined && custom.factor !== null) {
					finalVal = finalVal * custom.factor;
					finalVal = Math.round(finalVal * 10000) / 10000;
				}
			} else if (custom.type === 'boolean') {
				finalVal = rawVal === 1 || String(rawVal).toLowerCase() === 'true';
			} else if (custom.type === 'datetime') {
				const ts = Number(rawVal);
				if (!isNaN(ts) && ts > 0) {
					finalVal = new Date(ts * 1000).toLocaleString('de-DE', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						hour12: false,
					});
				} else {
					finalVal = 'Ungültig';
				}
			} else {
				finalVal = String(rawVal);
			}

			const cleanId = sanitizeName(custom.name);
			const stateId = `${adapter.namespace}.Benutzer.${cleanId}`;

			await adapter.setForeignStateChangedAsync(stateId, finalVal, true);
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aktualisieren der benutzerdefinierten Werte: ${msg}`, 'error');
	}
}

/**
 * Universelle Hilfsfunktion, um System-Datenpunkte typsicher und effizient zu aktualisieren.
 *
 * @param adapter Adapter-Instanz des ioBroker-Adapters
 * @param key Schlüssel des System-Datenpunkts
 * @param value Neuer Wert für den Datenpunkt
 */
async function setChangedSystemState(adapter: AdapterInstance, key: string, value: string): Promise<void> {
	const dp = getDpPath(key);
	if (dp) {
		await adapter.setStateChangedAsync(dp, value, true);
	}
}

/**
 * Aktualisiert System-Informationen wie Firmware, IP-Adresse und Wärmepumpentyp.
 *
 * @param adapter Adapter-Instanz des ioBroker-Adapters
 * @param rawValues Array mit Rohdaten aus dem System
 */
export async function updateSystemInfos(adapter: AdapterInstance, rawValues: number[]): Promise<void> {
	try {
		const firmwareBuf = rawValues.slice(81, 91);
		const firmwareString = createFirmwareString(firmwareBuf);
		await setChangedSystemState(adapter, 'firmware', firmwareString);

		const ipAddress = int2ipAddress(rawValues[91]);
		await setChangedSystemState(adapter, 'ip_address', ipAddress);

		const subnet = int2ipAddress(rawValues[92]);
		await setChangedSystemState(adapter, 'subnet', subnet);

		const broadcastAddress = int2ipAddress(rawValues[93]);
		await setChangedSystemState(adapter, 'broadcast_address', broadcastAddress);

		const gateway = int2ipAddress(rawValues[94]);
		await setChangedSystemState(adapter, 'standard_gateway', gateway);

		const hpTypeIndex = rawValues[78];
		const hpTypeString = createHeatPumpTypeString(hpTypeIndex);
		await setChangedSystemState(adapter, 'heatpump_type', hpTypeString);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aktualisieren der System-Infos: ${msg}`, 'error');
	}
}

/**
 * Konvertiert ein Array von Luxtronik-ASCII-Zahlen in einen lesbaren Firmware-String
 *
 * @param buf Array von ASCII-Zahlen für den Firmware-String
 */
function createFirmwareString(buf: number[]): string {
	if (!buf || !Array.isArray(buf)) {
		return 'Unbekannt';
	}
	// Elegantere, moderne Array-Pipeline
	return buf
		.filter(v => v !== 0)
		.map(v => String.fromCharCode(v))
		.join('')
		.trim();
}

/**
 * Konvertiert einen 32-Bit-Integer-Wert der Luxtronik in eine IPv4-Adresse
 *
 * @param value 32-Bit-Integer-Wert der Luxtronik
 */
function int2ipAddress(value: number): string {
	if (value === undefined || value === null || isNaN(value)) {
		return '0.0.0.0';
	}

	const part1 = value & 255;
	const part2 = (value >>> 8) & 255;
	const part3 = (value >>> 16) & 255;
	const part4 = (value >>> 24) & 255;

	return `${part4}.${part3}.${part2}.${part1}`;
}

/**
 * Liest den Klarnamen des Anlagentyps aus dem Dictionary
 *
 * @param value Index des Anlagentyps im Dictionary
 */
function createHeatPumpTypeString(value: number): string {
	return HP_TYPES[value] || HP_TYPES[-1];
}

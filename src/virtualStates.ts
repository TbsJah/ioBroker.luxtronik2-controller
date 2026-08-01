import type { AdapterInstance } from '@iobroker/adapter-core';
import { ERROR_CODES, HP_TYPES, OUTAGE_CODES, STATE_HEATING, STATE_LINE_1, STATE_LINE_2, STATE_LINE_3 } from './codes';
import { writeLog } from './logger';
import { sanitizeName } from './objectManager';
import { getDpPath, getLuxIdByKey } from './stateMapping';

// ==========================================
// CALCULATIONS (DRY-Principle)
// ==========================================

/**
 * Universal helper function to add two values from the ioBroker state tree.
 *
 * @param adapter - ioBroker adapter instance
 * @param sourceId1 - Path of the first source state
 * @param sourceId2 - Path of the second source state
 * @param targetId - Path of the target state where the result will be written
 * @param logName - Name used for log entries
 * @returns A promise resolving after the addition completes
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
		writeLog(`Error calculating ${logName}: ${msg}`, 'error');
	}
}

/**
 * Calculates the total thermal energy (heating + hot water) and writes it to the target state.
 *
 * @param adapter - ioBroker adapter instance
 * @returns A promise resolving upon completion
 */
export async function calculateTotalThermalEnergy(adapter: AdapterInstance): Promise<void> {
	await calculateSum(
		adapter,
		getDpPath('thermalenergy_heating'),
		getDpPath('thermalenergy_warmwater'),
		getDpPath('thermalenergy_total'),
		'Total Thermal Energy',
	);
}

/**
 * Calculates the total energy consumed (heating + hot water) and writes it to the target state.
 *
 * @param adapter - ioBroker adapter instance
 * @returns A promise resolving upon completion
 */
export async function calculateTotalEnergy(adapter: AdapterInstance): Promise<void> {
	await calculateSum(
		adapter,
		getDpPath('energy_heating'),
		getDpPath('energy_warmwater'),
		getDpPath('energy_total'),
		'Total Energy',
	);
}

// ==========================================
// HISTORY & LOGS (DRY-Principle)
// ==========================================

/**
 * Structure of an entry in the error or outage history.
 */
interface HistoryEntry {
	/** The code of the registered error or outage */
	code: number;
	/** The clear text description of the code */
	beschreibung: string;
	/** The formatted date of occurrence */
	datum: string;
	/** The raw Unix timestamp */
	timestamp: number;
}

/**
 * Internal helper function to generate error and outage histories.
 *
 * @param adapter The adapter instance.
 * @param rawValues The raw values from the heat pump.
 * @param timeStartIndex Index of the first timestamp in the raw data.
 * @param codeStartIndex Index of the first code in the raw data.
 * @param targetStateId The ioBroker ID where the JSON should be written.
 * @param fallbackPrefix Fallback text for unknown codes.
 * @param codeMap The dictionary mapping codes to readable text.
 * @returns A promise resolving upon completion
 */
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
				const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);

				let beschreibung = `${fallbackPrefix} (${code})`;
				if (codeMap[code] !== undefined) {
					beschreibung = codeMap[code];
				}

				historyList.push({
					code: code,
					beschreibung: beschreibung,
					datum: formattedDate,
					timestamp: timestamp,
				});
			}
		}

		historyList.sort((a, b) => b.timestamp - a.timestamp);

		const cleanList = historyList.map((entry, idx) => ({
			index: idx + 1,
			code: entry.code,
			beschreibung: entry.beschreibung,
			datum: entry.datum,
			timestamp: entry.timestamp,
		}));
		const jsonStr = JSON.stringify(cleanList);

		const result = await adapter.setStateChangedAsync(targetStateId, { val: jsonStr, ack: true });
		if (result && (result as any).numChanges > 0) {
			writeLog(`History for ${targetStateId} updated from raw data.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error updating history: ${msg}`, 'error');
	}
}

/**
 * Updates the error history with the latest error codes.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values from the device.
 * @returns A promise resolving upon completion
 */
export async function updateErrorHistory(adapter: AdapterInstance, rawValues: number[]): Promise<void> {
	const dpPath = getDpPath('Fehlerspeicher');
	if (dpPath) {
		await updateHistory(adapter, rawValues, 95, 100, dpPath, 'Unknown error', ERROR_CODES);
	}
}

/**
 * Updates the outage history with the latest outage codes.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values from the device.
 * @returns A promise resolving upon completion
 */
export async function updateOutageHistory(adapter: AdapterInstance, rawValues: number[]): Promise<void> {
	const dpPath = getDpPath('Abschaltungen');
	if (dpPath) {
		await updateHistory(adapter, rawValues, 111, 106, dpPath, 'Unknown outage cause', OUTAGE_CODES);
	}
}

/**
 * Calculates the temperature spread between supply and return temperatures.
 *
 * @param adapter - The adapter instance.
 * @returns A promise resolving upon completion
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
		writeLog(`Error calculating temperature spread: ${msg}`, 'error');
	}
}

/**
 * Updates the status strings based on raw sensor values and parameters.
 *
 * @param adapter - The adapter instance.
 * @param rawValues - The raw values array from the Luxtronik device.
 * @param rawParams - The raw parameters array from the Luxtronik device.
 * @returns A promise resolving upon completion
 */
export async function updateStatusStrings(
	adapter: AdapterInstance,
	rawValues: number[],
	rawParams: number[],
): Promise<void> {
	try {
		const config = adapter.config as any;
		const lang = config.language === 'de' ? 'de' : 'en';

		// ==========================================
		// 1. ZEIT- UND DAUERBERECHNUNG (GLOBAL)
		// ==========================================
		let zeitSec = rawValues[120];
		const codeZ1 = rawValues[117];
		const codeZ3 = rawValues[119];
		const isModernFirmware = (codeZ1 === undefined || codeZ1 === 0) && (codeZ3 === undefined || codeZ3 === 0);

		// FW 3.x Fallback: Wenn zeitSec fehlt, berechnen wir es aus der letzten Statusänderung
		if (isModernFirmware && (zeitSec === undefined || zeitSec === 0)) {
			const bzState = await adapter.getStateAsync(getDpPath('WP_BZ_akt'));
			if (bzState && bzState.lc) {
				zeitSec = Math.floor((Date.now() - bzState.lc) / 1000);
			} else {
				zeitSec = 0;
			}
		}

		// HH:MM:SS Format (z.B. für FW 2.x und heatpump_duration)
		const h = Math.floor((zeitSec || 0) / 3600);
		const m = Math.floor(((zeitSec || 0) % 3600) / 60);
		const s = (zeitSec || 0) % 60;
		const zeitStringDuration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

		// Ausgeschriebenes Format (z.B. für FW 3.x und Kühlung)
		const hText = lang === 'de' ? (h === 1 ? 'Stunde' : 'Stunden') : h === 1 ? 'hour' : 'hours';
		const mText = lang === 'de' ? (m === 1 ? 'Minute' : 'Minuten') : m === 1 ? 'minute' : 'minutes';
		const sText = lang === 'de' ? (s === 1 ? 'Sekunde' : 'Sekunden') : s === 1 ? 'second' : 'seconds';
		const zeitStringText = `${h} ${hText} ${m} ${mText} ${s} ${sText}`;

		// ==========================================
		// 2. STATUS HEIZUNG BERECHNEN
		// ==========================================
		const line1Map = STATE_LINE_1[lang] || STATE_LINE_1.en;
		const line2Map = STATE_LINE_2[lang] || STATE_LINE_2.en;
		const line3Map = STATE_LINE_3[lang] || STATE_LINE_3.en;
		const stateHeatingMap = STATE_HEATING[lang] || STATE_HEATING.en;

		const Absenkung = (rawParams[getLuxIdByKey('deltaHeatingReduction')] || 0) / 10;
		const AbsenkungMax = (rawParams[getLuxIdByKey('thresholdTemperatureSetBack')] || 0) / 10;
		const RücklaufSollMin = (rawParams[getLuxIdByKey('returnTemperatureTargetMin')] || 15) / 10;
		const BetriebsartHeizung = rawParams[getLuxIdByKey('heating_operation_mode')] || 0;
		const Außentemperatur = (rawValues[getLuxIdByKey('temperature_outside')] || 0) / 10;
		const HeatingLimit = rawParams[getLuxIdByKey('heatingLimit')] || 0;
		const opStateHeatingVal = rawValues[getLuxIdByKey('opStateHeating')] ?? 3;
		const Mitteltemperatur = (rawValues[getLuxIdByKey('Mitteltemperatur')] || 15) / 10;
		const thresholdHeatingLimit = (rawParams[getLuxIdByKey('thresholdHeatingLimit')] || 15) / 10;
		const temperature_target_return = (rawValues[getLuxIdByKey('temperature_target_return')] || 15) / 10;
		let heatingStr = stateHeatingMap[opStateHeatingVal] || `Unknown (${opStateHeatingVal})`;

		if (opStateHeatingVal === 2) {
			heatingStr += ` (Target ${RücklaufSollMin} °C)`;
		} else if (opStateHeatingVal === 4) {
			heatingStr += ` (Target 20 °C)`;
		} else if (opStateHeatingVal === 0 || opStateHeatingVal === 1) {
			//writeLog(`opStateHeatingVal = 0`, 'info');
			if (HeatingLimit === 1 && Mitteltemperatur > thresholdHeatingLimit && Außentemperatur < 10) {
				//	writeLog(`HeatingLimit = true`, 'info');
				const textFrost = lang === 'de' ? 'Frostschutz' : 'Frost Protection';
				heatingStr = `${textFrost} ${temperature_target_return} °C`;
			} else if (HeatingLimit === 1 && Mitteltemperatur > thresholdHeatingLimit && Außentemperatur > 10) {
				const text = lang === 'de' ? 'Heizgrenze' : 'Heating limit';
				heatingStr = `${text} ${temperature_target_return} °C`;
			} else if (BetriebsartHeizung === 0) {
				const textNormal = lang === 'de' ? 'Normal da' : 'Normal as';
				if (AbsenkungMax <= Außentemperatur) {
					heatingStr += ` ${Absenkung} °C`;
				} else {
					heatingStr = `${textNormal} < ${AbsenkungMax} °C`;
				}
			}
		}

		const dpHeating = getDpPath('opStateHeatingString');
		if (dpHeating) {
			await adapter.setStateChangedAsync(dpHeating, heatingStr, true);
		}

		// ==========================================
		// 3. ERWEITERTE STATUS-TEXTE (DISPLAY)
		// ==========================================
		let stateStr = 'Unknown';
		let extStateStr = 'Unknown';

		if (!isModernFirmware) {
			// Alte Firmware
			const codeZ2 = rawValues[118];
			stateStr = line3Map[codeZ3] || 'Unknown';

			if (line1Map[codeZ1]) {
				const textZ2 = line2Map[codeZ2] || '';
				extStateStr = `${line1Map[codeZ1]} ${textZ2} ${zeitStringDuration}`.trim();
			}
		} else {
			// Moderne Firmware 3.x
			const bzMapEn: Record<number, string> = {
				0: 'Heating operation',
				1: 'Hot water',
				2: 'Swimming pool / Photovoltaics',
				3: 'Lock time',
				4: 'Defrosting',
				5: 'No demand',
				6: 'Ext. heat source',
				7: 'Cooling',
			};
			const bzMapDe: Record<number, string> = {
				0: 'Heizbetrieb',
				1: 'Warmwasser',
				2: 'Schwimmbad / PV',
				3: 'EVU-Sperre',
				4: 'Abtauen',
				5: 'Kein Bedarf',
				6: 'Zweiter Erzeuger',
				7: 'Kühlbetrieb',
			};
			const bzMap = lang === 'de' ? bzMapDe : bzMapEn;

			const currentStateCode = rawValues[getLuxIdByKey('WP_BZ_akt')] || 5;
			stateStr = bzMap[currentStateCode] || `Status ${currentStateCode}`;

			const isRunning = [0, 1, 2, 4, 6, 7].includes(currentStateCode);
			const line1Text = isRunning ? line1Map[0] || 'Heat pump running' : line1Map[1] || 'Heat pump idle';
			const line2Text = line2Map[0] || 'since';

			extStateStr = `${line1Text} ${line2Text} ${zeitStringText}`;

			const dpDuration = getDpPath('heatpump_duration');
			if (dpDuration) {
				await adapter.setStateChangedAsync(dpDuration, zeitStringDuration, true);
			}
		}

		const dpExtState = getDpPath('heatpump_extendet_state_string');
		if (dpExtState) {
			await adapter.setStateChangedAsync(dpExtState, stateStr, true);
		}

		const dpState = getDpPath('heatpump_state_string');
		if (dpState) {
			await adapter.setStateChangedAsync(dpState, extStateStr, true);
		}

		// ==========================================
		// 4. STATUS WARMWASSER
		// ==========================================
		const hotWaterBoilerValve = rawValues[getLuxIdByKey('hotWaterBoilerValve')] || 0;
		const opStateHotWaterOriginal = rawValues[124];
		let hotWaterStr = 'Unknown';

		if (opStateHotWaterOriginal === 0) {
			hotWaterStr = lang === 'de' ? 'Sperrzeit' : 'Lock time';
		} else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 1) {
			hotWaterStr = lang === 'de' ? 'Aufheizen' : 'Heating up';
		} else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 0) {
			hotWaterStr = 'Temp. OK';
		} else if (opStateHotWaterOriginal === 3) {
			hotWaterStr = lang === 'de' ? 'Aus' : 'Off';
		} else {
			hotWaterStr = `Unknown [${opStateHotWaterOriginal}/${hotWaterBoilerValve}]`;
		}

		const dpHotWater = getDpPath('opStateHotWaterString');
		if (dpHotWater) {
			await adapter.setStateChangedAsync(dpHotWater, hotWaterStr, true);
		}

		// ==========================================
		// STATUS KÜHLUNG BERECHNEN (opStateCoolingString)
		// ==========================================
		const coolingOpMode = rawParams[getLuxIdByKey('cooling_operation_mode')]; // 0 = Aus, 1 = Automatik
		const coolingReleaseTemp = (rawParams[getLuxIdByKey('cooling_release_temp')] || 0) / 10;

		// Boolean Prüfung für Freigabe (Index 207 / cooling_release)
		const rawFreigabe = rawValues[getLuxIdByKey('cooling_release')];
		// Fängt sowohl '1/0' als Zahl als auch echte true/false Booleans sicher ab
		const isReleased = rawFreigabe === 1 || String(rawFreigabe).toLowerCase() === 'true';

		// Aktueller Betriebszustand der Wärmepumpe (Index 80 / WP_BZ_akt)
		const currentStateCode = rawValues[getLuxIdByKey('WP_BZ_akt')];

		let coolingStr = lang === 'de' ? 'Unbekannt' : 'Unknown';

		if (coolingOpMode === 0) {
			coolingStr = lang === 'de' ? 'Aus' : 'Off';
		} else if (coolingOpMode === 1) {
			if (currentStateCode === 7) {
				// PRIORITÄT 1: Betriebszustand ist 7 (Wärmepumpe kühlt AKTIV)
				coolingStr = lang === 'de' ? `Kühlen seit ${zeitStringText}` : `Cooling since ${zeitStringText}`;
			} else if (coolingReleaseTemp > Außentemperatur) {
				// PRIORITÄT 2: Zu kalt draußen (Außentemperatur unter Freigabetemperatur)
				const textKuehlgrenze = lang === 'de' ? 'Kühlgrenze' : 'Cooling limit';
				coolingStr = `${textKuehlgrenze} (${coolingReleaseTemp.toFixed(1)} °C)`;
			} else if (!isReleased) {
				// PRIORITÄT 3: Warm genug, aber Freigabe-Boolean ist noch false (Timer zählt noch runter)
				coolingStr = lang === 'de' ? 'Wartet auf Timer-Freigabe' : 'Waiting for timer release';
			} else {
				// PRIORITÄT 4: Warm genug UND Freigabe ist erteilt, aber Anlage kühlt gerade nicht (Kein Bedarf im Haus)
				coolingStr = lang === 'de' ? 'Keine Anforderung / Bereit' : 'No demand / Ready';
			}
		}

		const dpCooling = getDpPath('opStateCoolingString');
		if (dpCooling) {
			await adapter.setStateChangedAsync(dpCooling, coolingStr, true);
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error updating status strings: ${msg}`, 'error');
	}
}

/**
 * Reads individual start/end times from the settings and generates a formatted JSON array.
 *
 * @param adapter The adapter instance
 * @returns A promise resolving upon completion
 */
export async function updateTimerTables(adapter: AdapterInstance): Promise<void> {
	try {
		const timeCache = new Map<string, string>();

		/**
		 * Internal helper to fetch and parse a specific time string.
		 *
		 * @param key The state key to fetch
		 * @returns A promise resolving to the formatted time string
		 */
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

		/**
		 * Internal helper to compile and save a single timer table array.
		 *
		 * @param targetKey The target state key for the JSON string
		 * @param prefix The prefix identifying the associated timer slots
		 * @param endStr The suffix indicating an end-time parameter
		 * @param slots The total number of slots to iterate over
		 * @returns A promise resolving when processing finishes
		 */
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
				void 0;
			}
		};

		const configs = [
			{ target: 'heatingOperationTimerTableWeek', prefix: 'HZ_MoSo_', end: 'End1', slots: 3 },
			{ target: 'heatingOperationTimerTable52MonFri', prefix: 'HZ_MoFr_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTable52SatSun', prefix: 'HZ_SaSo_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayMonday', prefix: 'HZ_Montag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayTuesday', prefix: 'HZ_Dienstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayWednesday', prefix: 'HZ_Mittwoch_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayThursday', prefix: 'HZ_Donnerstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDayFriday', prefix: 'HZ_Freitag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDaySaturday', prefix: 'HZ_Samstag_', end: 'Ende', slots: 3 },
			{ target: 'heatingOperationTimerTableDaySunday', prefix: 'HZ_Sonntag_', end: 'Ende', slots: 3 },
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

		await Promise.all(configs.map(cfg => processTable(cfg.target, cfg.prefix, cfg.end, cfg.slots)));
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error generating JSON timer tables: ${msg}`, 'error');
	}
}

/**
 * Configuration of a custom data point based on the adapter settings.
 */
interface CustomStateConfig {
	/** Indicates whether the custom state is enabled */
	active: boolean;
	/** The corresponding Luxtronik internal ID */
	luxId?: number;
	/** The user-defined display name */
	name: string;
	/** The source classification (parameter or value) */
	source: 'parameter' | 'value';
	/** The intended ioBroker data type */
	type: 'number' | 'boolean' | 'datetime' | 'string';
	/** Optional factor for numerical conversion */
	factor?: number | null;
}

/**
 * Updates custom states based on configured Luxtronik IDs.
 *
 * @param adapter - ioBroker adapter instance
 * @param rawValues - Raw telemetry values
 * @param rawParams - Raw parameters
 * @returns A promise resolving upon completion
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

			let finalVal: string | number | boolean;

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
					finalVal = new Date(ts * 1000).toISOString().replace('T', ' ').substring(0, 19);
				} else {
					finalVal = 'Invalid';
				}
			} else {
				finalVal = String(rawVal);
			}

			const cleanId = sanitizeName(custom.name);
			const stateId = `${adapter.namespace}.Custom.${cleanId}`;

			await adapter.setForeignStateChangedAsync(stateId, finalVal, true);
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error updating custom values: ${msg}`, 'error');
	}
}

/**
 * Universal helper function to update system data points securely.
 *
 * @param adapter Adapter instance
 * @param key Key of the system data point
 * @param value New value
 * @returns A promise resolving upon completion
 */
async function setChangedSystemState(adapter: AdapterInstance, key: string, value: string): Promise<void> {
	const dp = getDpPath(key);
	if (dp) {
		await adapter.setStateChangedAsync(dp, value, true);
	}
}

/**
 * Updates system information such as firmware, IP address, and heat pump type.
 *
 * @param adapter Adapter instance
 * @param rawValues Array with raw data
 * @returns A promise resolving upon completion
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
		writeLog(`Error updating system information: ${msg}`, 'error');
	}
}

/**
 * Converts an array of ASCII numbers into a readable firmware string.
 *
 * @param buf Array of ASCII numbers
 * @returns Cleaned firmware string
 */
function createFirmwareString(buf: number[]): string {
	if (!buf || !Array.isArray(buf)) {
		return 'Unknown';
	}
	return buf
		.filter(v => v !== 0)
		.map(v => String.fromCharCode(v))
		.join('')
		.trim();
}

/**
 * Converts a 32-bit integer into an IPv4 address.
 *
 * @param value 32-bit integer
 * @returns IPv4 address as a string
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
 * Retrieves the clear text name of the system type from the dictionary.
 *
 * @param value Index of the system type
 * @returns Clear text string of the system type
 */
function createHeatPumpTypeString(value: number): string {
	return HP_TYPES[value] || HP_TYPES[-1];
}

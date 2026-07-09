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
// Imports anpassen
import { sanitizeName } from './objectManager';
import { getDpPath, getLuxIdByKey } from './stateMapping';

// ==========================================
// BERECHNUNGEN (DRY-Prinzip)
// ==========================================

/**
 * Universelle Hilfsfunktion, um zwei Werte aus dem ioBroker zu addieren.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param sourceId1 Die ioBroker-ID des ersten Summanden
 * @param sourceId2 Die ioBroker-ID des zweiten Summanden
 * @param targetId Die ioBroker-ID des Ziel-Datenpunkts, in den das Ergebnis geschrieben wird
 * @param logName Der Anzeigename für das ioBroker-Log im Fehlerfall
 */
async function calculateSum(
	adapter: any,
	sourceId1: string,
	sourceId2: string,
	targetId: string,
	logName: string,
): Promise<void> {
	try {
		// Paralleler Abruf beider Summanden
		const [state1, state2] = await Promise.all([
			adapter.getStateAsync(sourceId1),
			adapter.getStateAsync(sourceId2),
		]);

		const val1 = state1 && typeof state1.val === 'number' ? state1.val : 0;
		const val2 = state2 && typeof state2.val === 'number' ? state2.val : 0;

		await adapter.setStateChangedAsync(targetId, val1 + val2, true);
	} catch (err: any) {
		writeLog(`Fehler bei der Berechnung der ${logName}: ${err.message}`, 'error');
	}
}

/**
 * Berechnet die Gesamt-Wärmemenge aus Heizung und Warmwasser.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 */
export async function calculateTotalThermalEnergy(adapter: any): Promise<void> {
	await calculateSum(
		adapter,
		'Informationen.09_Wärmemenge.thermalenergy_heating',
		'Informationen.09_Wärmemenge.thermalenergy_warmwater',
		'Informationen.09_Wärmemenge.thermalenergy_total',
		'Gesamt-Wärmemenge',
	);
}

/**
 * Berechnet die Gesamt-Energie aus Heizung und Warmwasser.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 */
export async function calculateTotalEnergy(adapter: any): Promise<void> {
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

/**
 * Universelle Hilfsfunktion, um Arrays aus Befehl 3004 in ein JSON-Objekt zu übersetzen.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param rawValues Das Array der rohen Messwerte (Befehl 3004)
 * @param startIdxTime Der Array-Index für den ersten Zeitstempel
 * @param startIdxCode Der Array-Index für den ersten Fehler-/Abschaltcode
 * @param targetId Die ioBroker-ID des Ziel-Datenpunkts (JSON)
 * @param dictKeys Array mit möglichen Objekt-Schlüsseln für das Wörterbuch im Luxtronik-Modul
 * @param fallbackPrefix Präfix für den Text, falls der Code gänzlich unbekannt ist
 */

async function updateHistory(
	adapter: any,
	rawValues: number[],
	timeStartIndex: number,
	codeStartIndex: number,
	targetStateId: string,
	_keys: string[],
	fallbackPrefix: string,
	codeMap: Record<number, string>,
): Promise<void> {
	try {
		const historyList: any[] = [];

		for (let i = 0; i < 5; i++) {
			const code = rawValues[codeStartIndex + i];
			const timestamp = rawValues[timeStartIndex + i];

			if (timestamp !== undefined && timestamp > 0) {
				const date = new Date(timestamp * 1000);
				const formattedDate = date.toLocaleString('de-DE');

				let beschreibung = `${fallbackPrefix} (${code})`;

				// Text aus der jeweils übergebenen Map ziehen
				if (codeMap[code] !== undefined) {
					beschreibung = codeMap[code];
				}

				historyList.push({
					code: code,
					beschreibung: beschreibung,
					datum: formattedDate,
					//timestamp: timestamp,
				});
			}
		}

		historyList.sort((a, b) => b.timestamp - a.timestamp);

		// Finale Liste mit Index (1-5) für Tabellen und inkl. Timestamp für Skripte
		const cleanList = historyList.map((entry, idx) => {
			return {
				index: idx + 1,
				code: entry.code,
				beschreibung: entry.beschreibung,
				datum: entry.datum,
				timestamp: entry.timestamp,
			};
		});
		const jsonStr = JSON.stringify(cleanList);

		const currentState = await adapter.getStateAsync(targetStateId);
		if (!currentState || currentState.val !== jsonStr) {
			await adapter.setStateAsync(targetStateId, { val: jsonStr, ack: true });
			writeLog(`Historie für ${targetStateId} aus Rohdaten aktualisiert.`, 'info');
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aktualisieren der Historie: ${err.message}`, 'error');
	}
}

/**
 * Aktualisiert die Fehlerhistorie (JSON) im ioBroker.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param rawValues Das Array der rohen Messwerte (Befehl 3004)
 */
export async function updateErrorHistory(adapter: any, rawValues: number[]): Promise<void> {
	await updateHistory(
		adapter,
		rawValues,
		95, // Start-Index für Zeitstempel
		100, // Start-Index für Codes
		'Informationen.06_Fehlerspeicher.Fehlerspeicher',
		[],
		'Unbekannter Fehler',
		ERROR_CODES, // <--- Gibt das Fehler-Wörterbuch mit
	);
}
/**
 * Aktualisiert die Abschalthistorie (JSON) im ioBroker.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param rawValues Das Array der rohen Messwerte (Befehl 3004)
 */
export async function updateOutageHistory(adapter: any, rawValues: number[]): Promise<void> {
	await updateHistory(
		adapter,
		rawValues,
		111, // Start-Index für Zeitstempel
		106, // Start-Index für Codes
		'Informationen.07_Abschaltungen.Abschaltungen',
		[],
		'Unbekannter Abschaltgrund',
		OUTAGE_CODES, // <--- Gibt das Abschalt-Wörterbuch mit
	);
}

/**
 * Berechnet die aktuelle Spreizung (Vorlauf minus Rücklauf)
 *
 * @param adapter	Die Instanz des ioBroker-Adapters (this)
 */
export async function calculateTemperatureSpread(adapter: any): Promise<void> {
	try {
		const [vorlaufState, ruecklaufState] = await Promise.all([
			adapter.getStateAsync(getDpPath('temperature_supply')),
			adapter.getStateAsync(getDpPath('temperature_return')),
		]);

		if (vorlaufState && ruecklaufState && vorlaufState.val !== null && ruecklaufState.val !== null) {
			const spreizung = parseFloat((Number(vorlaufState.val) - Number(ruecklaufState.val)).toFixed(2));

			await adapter.setStateChangedAsync(getDpPath('spreizung_vorlauf_ruecklauf'), spreizung, true);
		}
	} catch (err: any) {
		writeLog(`Fehler bei der Berechnung der Temperatur-Spreizung: ${err.message}`, 'error');
	}
}

/**
 * Aktualisiert die Klartext-Strings für den Status der Wärmepumpe.
 * Nutzt dynamisch das stateMapping für die Indizes und die Logik der Original-Bibliothek.
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param rawValues Die rohen Werte aus der Luxtronik
 * @param rawParams Zusätzliche Parameter aus der Luxtronik zur Berechnung des Status
 */
export async function updateStatusStrings(adapter: any, rawValues: number[], rawParams: number[]): Promise<void> {
	try {
		// --- 1. Indizes aus dem Mapping dynamisch abrufen ---
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
			await adapter.setStateAsync(dpHeating, { val: heatingStr, ack: true });
		}

		// --- 2. Werte vorbereiten ---
		const codeZ1 = rawValues[117];
		const codeZ2 = rawValues[118];
		const codeZ3 = rawValues[119];
		const zeitSec = rawValues[120];

		const hotWaterBoilerValve = rawValues[getLuxIdByKey('hotWaterBoilerValve')] || 0;
		const opStateHotWaterOriginal = rawValues[124];

		// Zeit formatieren
		const h = Math.floor((zeitSec || 0) / 3600);
		const m = Math.floor(((zeitSec || 0) % 3600) / 60);
		const s = (zeitSec || 0) % 60;
		const zeitString = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

		const stateStr = STATE_ZEILE_3[codeZ3] || 'Unbekannt';
		const dpExtState = getDpPath('heatpump_extendet_state_string');
		if (dpExtState) {
			await adapter.setStateAsync(dpExtState, { val: stateStr, ack: true });
		}

		let extStateStr = 'Unbekannt';
		if (STATE_ZEILE_1[codeZ1]) {
			const textZ2 = STATE_ZEILE_2[codeZ2] || '';
			extStateStr = `${STATE_ZEILE_1[codeZ1]} ${textZ2} ${zeitString}`.trim();
		}
		const dpState = getDpPath('heatpump_state_string');
		if (dpState) {
			await adapter.setStateAsync(dpState, { val: extStateStr, ack: true });
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
			await adapter.setStateAsync(dpHotWater, { val: hotWaterStr, ack: true });
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aktualisieren der Status-Strings: ${err.message}`, 'error');
	}
}

/**
 * Liest die einzelnen Start/Ende Zeiten aus den Einstellungen
 * und erzeugt ein formatiertes JSON-Array für die Informationstabellen.
 *
 * @param adapter Der ioBroker-Adapter zur Kommunikation mit den Datenpunkten.
 */
export async function updateTimerTables(adapter: any): Promise<void> {
	try {
		// 1. Hilfsfunktion: Holt die Zeit und formatiert sie sicher als "HH:mm"
		const getTime = async (key: string): Promise<string> => {
			try {
				const dpPath = getDpPath(key);
				if (!dpPath) {
					return '00:00';
				}

				const state = await adapter.getStateAsync(dpPath);
				if (state && typeof state.val === 'string') {
					// Fängt "09:00", "9:00" oder unsaubere Strings auf
					const match = state.val.match(/^(\d{1,2}):(\d{1,2})/);
					if (match) {
						return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
					}
				}
				return '00:00';
			} catch {
				return '00:00';
			}
		};

		// 2. Hilfsfunktion: Baut das JSON für eine spezifische Tabelle zusammen
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

				// Nur schreiben, wenn es das Ziel im Mapping gibt
				const targetPath = getDpPath(targetKey);
				if (targetPath) {
					// Das ", null, 2" formatiert das JSON exakt so schön wie in deinem Beispiel
					const jsonStr = JSON.stringify(table, null, 2);
					const current = await adapter.getStateAsync(targetPath);

					// Nur in ioBroker schreiben, wenn sich wirklich was geändert hat
					if (!current || current.val !== jsonStr) {
						await adapter.setStateAsync(targetPath, { val: jsonStr, ack: true });
					}
				}
			} catch {
				// Ignorieren, falls ein Ziel (z.B. Zirkulation) noch nicht existiert
			}
		};

		// 3. Konfiguration der Zuordnungen (Ziel-DP, Präfix, Suffix, Slot-Anzahl)
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
			// Hypothetische Ziel-Keys (Sobald du diese ins Mapping einträgst, läuft es automatisch mit)
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

		// Führe die Generierung für alle Tabellen parallel oder nacheinander aus
		for (const cfg of configs) {
			await processTable(cfg.target, cfg.prefix, cfg.end, cfg.slots);
		}
	} catch (err: any) {
		writeLog(`Fehler beim Erstellen der JSON-Timer-Tabellen: ${err.message}`, 'error');
	}
}
/**
 * Aktualisiert benutzerdefinierte Datenpunkte aus der dynamischen JSON-Tabelle.
 *
 * @param adapter Adapter-Instanz des ioBroker-Adapters, verwendet zum Lesen/Schreiben von States (z.B. adapter.getForeignStateAsync/adapter.setForeignStateAsync)
 * @param rawValues Array mit rohen Datenwerten (z.B. aus den Messwerten)
 * @param rawParams Array mit rohen Parameterwerten (z.B. aus den Luxtronik-Parametern)
 */
export async function updateCustomStates(adapter: any, rawValues: number[], rawParams: number[]): Promise<void> {
	try {
		const customStates = adapter.config.custom_states || [];
		for (const custom of customStates) {
			if (!custom.active || custom.luxId === undefined || !custom.name) {
				continue;
			}

			const rawArray = custom.source === 'parameter' ? rawParams : rawValues;
			const rawVal = rawArray[custom.luxId];

			if (rawVal === undefined) {
				continue;
			}

			let finalVal: any = rawVal;

			// Typ-Konvertierung und Faktor-Verrechnung
			// Typ-Konvertierung und Faktor-Verrechnung
			if (custom.type === 'number') {
				finalVal = Number(rawVal);
				if (custom.factor !== undefined && custom.factor !== null) {
					finalVal = finalVal * custom.factor;
					finalVal = Math.round(finalVal * 10000) / 10000;
				}
			} else if (custom.type === 'boolean') {
				finalVal = rawVal === 1 || String(rawVal).toLowerCase() === 'true';
			} else if (custom.type === 'datetime') {
				// Unix Timestamp in ein perfekt lesbares Datum mit führenden Nullen umwandeln
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

			// Nur schreiben, wenn Wert sich geändert hat
			const current = await adapter.getForeignStateAsync(stateId);
			if (!current || current.val !== finalVal) {
				await adapter.setForeignStateAsync(stateId, { val: finalVal, ack: true });
			}
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aktualisieren der benutzerdefinierten Werte: ${err.message}`, 'error');
	}
}

/**
 * Liest Firmware und IP aus den Rohwerten und schreibt sie in die Datenpunkte
 *
 * @param adapter Die Instanz des ioBroker-Adapters (this)
 * @param rawValues Die Rohwerte aus der Luxtronik
 */
export async function updateSystemInfos(adapter: any, rawValues: number[]): Promise<void> {
	try {
		const firmwareBuf = rawValues.slice(81, 91);
		const firmwareString = createFirmwareString(firmwareBuf);

		// Bitte 'firmware' an den Key aus deiner stateMapping.ts anpassen, falls er anders heißt!
		const dpFirmware = getDpPath('firmware');
		if (dpFirmware) {
			const currentFw = await adapter.getStateAsync(dpFirmware);
			if (!currentFw || currentFw.val !== firmwareString) {
				await adapter.setStateAsync(dpFirmware, { val: firmwareString, ack: true });
			}
		}

		// 2. IP-ADRESSE (Liegt bei Luxtronik auf Index 112)
		const ipAddress = int2ipAddress(rawValues[91]);
		const dpIp = getDpPath('ip_address');
		if (dpIp) {
			const currentIp = await adapter.getStateAsync(dpIp);
			if (!currentIp || currentIp.val !== ipAddress) {
				await adapter.setStateAsync(dpIp, { val: ipAddress, ack: true });
			}
		}

		const subnet = int2ipAddress(rawValues[92]);
		const dpSubnet = getDpPath('subnet');
		if (dpSubnet) {
			const currentSubnet = await adapter.getStateAsync(dpSubnet);
			if (!currentSubnet || currentSubnet.val !== subnet) {
				await adapter.setStateAsync(dpSubnet, { val: subnet, ack: true });
			}
		}

		const broadcastAddress = int2ipAddress(rawValues[93]);
		const dpBroadcast = getDpPath('broadcast_address');
		if (dpBroadcast) {
			const currentBroadcast = await adapter.getStateAsync(dpBroadcast);
			if (!currentBroadcast || currentBroadcast.val !== broadcastAddress) {
				await adapter.setStateAsync(dpBroadcast, { val: broadcastAddress, ack: true });
			}
		}

		const gateway = int2ipAddress(rawValues[94]);
		const dpGateway = getDpPath('standard_gateway');
		if (dpGateway) {
			const currentGateway = await adapter.getStateAsync(dpGateway);
			if (!currentGateway || currentGateway.val !== gateway) {
				await adapter.setStateAsync(dpGateway, { val: gateway, ack: true });
			}
		}

		const hpTypeIndex = rawValues[78];
		const hpTypeString = createHeatPumpTypeString(hpTypeIndex);

		const dpHpType = getDpPath('heatpump_type');
		if (dpHpType) {
			const currentHpType = await adapter.getStateAsync(dpHpType);
			if (!currentHpType || currentHpType.val !== hpTypeString) {
				await adapter.setStateAsync(dpHpType, { val: hpTypeString, ack: true });
			}
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aktualisieren der System-Infos: ${err.message}`, 'error');
	}
}

/**
 * Konvertiert ein Array von Luxtronik-ASCII-Zahlen in einen lesbaren Firmware-String
 *
 * @param buf Das Array der ASCII-Werte
 */
function createFirmwareString(buf: number[]): string {
	if (!buf || !Array.isArray(buf)) {
		return 'Unbekannt';
	}
	let firmware = '';
	for (const val of buf) {
		if (val !== 0) {
			firmware += String.fromCharCode(val);
		}
	}
	return firmware.trim();
}

/**
 * Konvertiert einen 32-Bit-Integer-Wert der Luxtronik in eine IPv4-Adresse
 *
 * @param value Der 32-Bit-Wert, der in eine IPv4-Adresse umgewandelt werden soll
 */
function int2ipAddress(value: number): string {
	if (value === undefined || value === null || isNaN(value)) {
		return '0.0.0.0';
	}

	// WICHTIG: >>> (unsigned right shift) statt >> (signed) verhindert Fehler bei 192.x.x.x IPs
	const part1 = value & 255;
	const part2 = (value >>> 8) & 255;
	const part3 = (value >>> 16) & 255;
	const part4 = (value >>> 24) & 255;

	return `${part4}.${part3}.${part2}.${part1}`;
}

/**
 * Liest den Klarnamen des Anlagentyps aus dem Dictionary
 *
 * @param value Der Wert des Anlagentyps
 */
function createHeatPumpTypeString(value: number): string {
	return HP_TYPES[value] || HP_TYPES[-1];
}

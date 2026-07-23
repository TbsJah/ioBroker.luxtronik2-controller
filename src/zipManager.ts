import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath, STATE_MAPPING } from './stateMapping';

// =========================================================
// CONSTANTS
// =========================================================

/**
 * Constants used for the circulation pump and deaeration configurations.
 */
const CONSTANTS = {
	/** Command ID for the deaeration program */
	CMD_DEAERATE: 158,
	/** Command ID for the circulation pump (ZIP) */
	CMD_ZIP: 684,
	/** Seconds representing the end of a day (23:59:00) */
	END_OF_DAY: 86340,
	/** Delay in milliseconds between consecutive hardware write operations */
	WRITE_DELAY: 100,
};

// =========================================================
// TYPES & INTERFACES
// =========================================================

/**
 * Defines the structure for saving and restoring the original circulation pump configuration.
 */
export type ZipConfig = Partial<Record<keyof typeof STATE_MAPPING, ioBroker.StateValue | null>>;

/**
 * Extended adapter interface to provide type safety for dynamic properties and methods.
 */
interface ExtendedAdapter extends AdapterInstance {
	config: ioBroker.AdapterConfig & Record<string, any>;
	/** Cached copy of the original circulation pump settings before macro activation */
	originalZipConfig?: ZipConfig | null;
	/** ioBroker timeout handle for the hot water circulation pump macro */
	zipTimer?: ioBroker.Timeout;
	/** Determines whether verbose debugging output is enabled */
	isDebugLogActive?: boolean;
	/**
	 * Function to queue a hardware write operation.
	 *
	 * @param luxId - Target parameter register ID
	 * @param value - The value payload to write
	 * @returns A promise resolving once the task is queued
	 */
	queueWrite: (luxId: number, value: number) => Promise<void>;
	/**
	 * Function to synchronize a configuration value.
	 *
	 * @param key - The unique key identifier within the STATE_MAPPING
	 * @param value - The raw or parsed value to apply
	 * @returns A promise resolving when the synchronization finishes
	 */
	syncConfigValue: (key: string, value: any) => Promise<void>;
	/**
	 * Function to safely update an internal state if the value differs.
	 *
	 * @param dpPath - The state path ID
	 * @param value - The updated value to process
	 * @param ack - Explicit acknowledgment flag status
	 * @returns A promise resolving when the write operation completes
	 */
	setOwnStateIfDifferent: (dpPath: string, value: any, ack?: boolean) => Promise<void>;
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================
/**
 * Schützt den Speicher durch Read-Before-Write direkt auf Rohwert-Ebene.
 * Blockiert unnötige Schreibbefehle an die Luxtronik.
 *
 * @param adapter - The extended adapter instance used for state and write operations
 * @param key - The state mapping key to write
 * @param luxId - The Luxtronik register ID to update
 * @param rawValue - The raw value to write to the device
 */
async function safeRawWrite(
	adapter: ExtendedAdapter,
	key: keyof typeof STATE_MAPPING,
	luxId: number,
	rawValue: number,
): Promise<void> {
	const dpPath = getDpPath(key);
	if (!dpPath) {
		return;
	}

	const state = await adapter.getStateAsync(dpPath);

	if (state && state.val !== null) {
		let currentRaw: number | null = null;

		// IoBroker-Werte in Luxtronik-Rohwerte (Zahlen) zurückrechnen
		if (typeof state.val === 'boolean') {
			currentRaw = state.val ? 1 : 0;
		} else if (typeof state.val === 'number') {
			currentRaw = state.val;
		} else if (typeof state.val === 'string') {
			// Wandelt Zeit-Strings (z.B. "23:59:00") zurück in reine Sekunden
			const timeMatch = state.val.match(/^(\d{1,2}):(\d{1,2})/);
			if (timeMatch) {
				currentRaw = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
			}
		}

		// DIE ENTSCHEIDENDE PRÜFUNG: Ist der Wert bereits identisch?
		if (currentRaw === rawValue) {
			if (adapter.isDebugLogActive) {
				writeLog(
					`[SafeWrite] Wert für '${key}' ist bereits auf Zielwert (${rawValue}). Schreibvorgang blockiert!`,
					'debug',
				);
			}
			return; // Abbrechen! Schont den Flash-Speicher.
		}
	}

	// Nur schreiben, wenn es eine echte Änderung gibt
	if (adapter.isDebugLogActive) {
		writeLog(`[SafeWrite] Änderung erkannt. Schreibe ${rawValue} in Register ${luxId} (${key})...`, 'debug');
	}
	await adapter.queueWrite(luxId, rawValue);

	// Kurze Hardware-Schonpause nach dem Senden
	await new Promise<void>(resolve => {
		adapter.setTimeout(resolve, CONSTANTS.WRITE_DELAY);
	});
}

/**
 * Safely clears the active circulation pump macro timer.
 *
 * @param adapter - The extended adapter instance
 */
function clearZipTimer(adapter: ExtendedAdapter): void {
	if (!adapter.zipTimer) {
		return;
	}
	adapter.clearTimeout(adapter.zipTimer);
	adapter.zipTimer = undefined;
}

// =========================================================
// MAIN EXPORTS
// =========================================================

/**
 * Restores the original circulation pump configuration from the saved cache.
 *
 * @param adapter - The extended adapter instance
 * @returns A promise resolving when the restoration completes
 */
export async function restoreOriginalZipConfig(adapter: ExtendedAdapter): Promise<void> {
	if (!adapter.originalZipConfig) {
		return;
	}

	try {
		for (const [key, val] of Object.entries(adapter.originalZipConfig)) {
			if (val === null || val === undefined) {
				continue;
			}

			const def = STATE_MAPPING[key];
			if (!def || !def.luxWriteId) {
				continue;
			}

			let rawVal = val;

			if (def.role === 'value.datetime' && typeof val === 'string') {
				const timeMatch = val.match(/^(\d{1,2}):(\d{1,2})/);
				if (timeMatch) {
					rawVal = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
				} else {
					rawVal = 0;
				}
			}

			const targetPath = getDpPath(key);
			if (targetPath) {
				await adapter.setState(targetPath, { val: val, ack: true });
			}

			const luxId = Number(def.luxWriteId);
			if (!isNaN(luxId)) {
				await adapter.queueWrite(luxId, Number(rawVal));
				await new Promise<void>(resolve => {
					adapter.setTimeout(() => {
						resolve();
					}, CONSTANTS.WRITE_DELAY);
				});
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error restoring ZIP configuration: ${msg}`, 'error');
	} finally {
		adapter.originalZipConfig = null;
	}
}

/**
 * Stops the active circulation pump macro and deaeration program.
 *
 * @param adapter - The extended adapter instance
 * @returns A promise resolving when the processes are stopped
 */
export async function stopZipAndDeaeration(adapter: ExtendedAdapter): Promise<void> {
	const actors = adapter.config.actors || [];
	const validActors = actors.filter((a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '');

	// Alle externen Relais abschalten, falls konfiguriert
	if (validActors.length > 0) {
		try {
			for (const actor of validActors) {
				await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
			}
			if (adapter.isDebugLogActive) {
				writeLog(`[ZIP] Not-Aus für externe Relais gesendet.`, 'debug');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[ZIP] Fehler beim Ausschalten der externen Relais: ${msg}`, 'error');
		}
	}

	try {
		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));
		const runDeaerateState = await adapter.getStateAsync(getDpPath('runDeaerate'));

		const isZipActive = activateZipState?.val === true || adapter.zipTimer || adapter.originalZipConfig !== null;
		const isDeaerateActive = runDeaerateState?.val === 1 || runDeaerateState?.val === true;

		if (isZipActive || isDeaerateActive) {
			if (adapter.isDebugLogActive) {
				writeLog('Conditions met: Stopping active ZIP macro and deaeration program...', 'info');
			}

			clearZipTimer(adapter);
			await restoreOriginalZipConfig(adapter);

			// NEU: Sicherer Stopp über Read-Before-Write
			await safeRawWrite(adapter, 'runDeaerate', CONSTANTS.CMD_DEAERATE, 0);
			await safeRawWrite(adapter, 'hotWaterCircPumpDeaerate', CONSTANTS.CMD_ZIP, 0);

			// UI-Datenpunkte lokal aktualisieren, ohne erneuten Netzwerktraffic zu erzeugen
			const dpDeaerate = getDpPath('runDeaerate');
			const dpCircDeaerate = getDpPath('hotWaterCircPumpDeaerate');
			if (dpDeaerate) {
				await adapter.setOwnStateIfDifferent(dpDeaerate, false, true);
			}
			if (dpCircDeaerate) {
				await adapter.setOwnStateIfDifferent(dpCircDeaerate, false, true);
			}

			const dpZip = getDpPath('Activate_Zip');
			if (dpZip) {
				await adapter.setOwnStateIfDifferent(dpZip, false, true);
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error stopping ZIP/Deaeration: ${msg}`, 'error');
	}
}

/**
 * Activates the circulation pump (ZIP) macro or deaeration program for a specified duration.
 *
 * @param adapter - The extended adapter instance
 * @param id - The ID of the triggered state
 * @param durationSeconds - The duration in seconds to keep the process active
 * @returns A promise resolving when the activation sequence completes
 */
export async function handleActivateZip(adapter: ExtendedAdapter, id: string, durationSeconds: number): Promise<void> {
	// 1. EXTERNE AKTOREN AUSLESEN
	// (Aus der neuen Array-Tabelle in der Konfiguration)
	const actors = adapter.config.actors || [];
	const validActors = actors.filter((a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '');

	let isZipAlreadyRunning = false;

	// 2. STATUS PRÜFEN: LÄUFT DIE ZIRKULATION BEREITS?
	if (validActors.length > 0) {
		// A) Externe Aktoren prüfen
		for (const actor of validActors) {
			try {
				const foreignState = await adapter.getForeignStateAsync(actor.zip_external_relay_id);
				if (foreignState && foreignState.val === true) {
					isZipAlreadyRunning = true;
					break; // Ein aktives Relais reicht aus
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				if (adapter.isDebugLogActive) {
					writeLog(
						`[ZIP] Konnte Status des externen Relais ${actor.zip_external_relay_id} nicht lesen: ${msg}`,
						'debug',
					);
				}
			}
		}
	} else {
		// B) Luxtronik intern prüfen (Fallback)
		try {
			const internalZip = await adapter.getStateAsync(getDpPath('ZIPout'));
			if (internalZip && (internalZip.val === 1 || internalZip.val === true)) {
				isZipAlreadyRunning = true;
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (adapter.isDebugLogActive) {
				writeLog(`[ZIP] ${msg}`, 'debug');
			}
		}
	}

	// Setze den lokalen Button/Sensor-Status auf true
	const localId = id.replace(`${adapter.namespace}.`, '');
	await adapter.setState(localId, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setState(localId, { val: false, ack: true });
		return;
	}

	const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);

	// 3. LOGIK-WEICHE A: PUMPE LÄUFT BEREITS -> NUR TIMER VERLÄNGERN
	if (isZipAlreadyRunning) {
		if (adapter.isDebugLogActive) {
			writeLog(
				'[ZIP] Zirkulationspumpe läuft bereits. Verlängere Timer, überspringe erneuten Start-Befehl.',
				'debug',
			);
		}

		if (adapter.zipTimer) {
			adapter.clearTimeout(adapter.zipTimer);
		}

		adapter.zipTimer = adapter.setTimeout(async () => {
			if (validActors.length > 0) {
				// Externe Aktoren abschalten
				for (const actor of validActors) {
					try {
						await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						writeLog(`[ZIP] Fehler beim Ausschalten des Relais: ${msg}`, 'error');
					}
				}
				if (adapter.isDebugLogActive) {
					writeLog(`[ZIP] Zeit abgelaufen. Externe Relais ausgeschaltet.`, 'debug');
				}
			} else {
				// Luxtronik abschalten
				await stopZipAndDeaeration(adapter);
			}
		}, safeDurationSeconds * 1000);

		return; // WICHTIG: Funktion hier abbrechen, damit keine redundanten "Einschalten"-Befehle gesendet werden!
	}

	// 4. LOGIK-WEICHE B: EXTERNE RELAIS EINSCHALTEN
	if (validActors.length > 0) {
		if (adapter.isDebugLogActive) {
			writeLog(`[ZIP] Externer Relais-Modus aktiv. Schalte ${validActors.length} Aktor(en) auf TRUE`, 'debug');
		}

		for (const actor of validActors) {
			try {
				await adapter.setForeignStateAsync(actor.zip_external_relay_id, true, false);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				writeLog(`[ZIP] Fehler beim Einschalten von ${actor.zip_external_relay_id}: ${msg}`, 'error');
			}
		}

		if (adapter.zipTimer) {
			adapter.clearTimeout(adapter.zipTimer);
		}

		adapter.zipTimer = adapter.setTimeout(async () => {
			for (const actor of validActors) {
				try {
					await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					writeLog(`[ZIP] Fehler beim Ausschalten von ${actor.zip_external_relay_id}: ${msg}`, 'error');
				}
			}
			if (adapter.isDebugLogActive) {
				writeLog(`[ZIP] Zeit abgelaufen. Externe Relais ausgeschaltet.`, 'debug');
			}
		}, safeDurationSeconds * 1000);

		return; // WICHTIG: Luxtronik-Fallback überspringen!
	}

	// 5. LOGIK-WEICHE C: NORMALE LUXTRONIK-STEUERUNG (Falls keine Aktoren eingetragen sind)
	const bzState = await adapter.getStateAsync(getDpPath('WP_BZ_akt'));
	const bzVal = bzState ? Number(bzState.val) : 5;

	const [wwIstS, wwSollS, wwHystS, rLState, rSollState, hzHystState] = await Promise.all([
		adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
		adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
		adapter.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
		adapter.getStateAsync(getDpPath('temperature_return')),
		adapter.getStateAsync(getDpPath('temperature_target_return')),
		adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
	]);

	const useDeaeration =
		bzVal === 5 &&
		Number(wwIstS?.val) > Number(wwSollS?.val) - Number(wwHystS?.val) &&
		Number(rLState?.val) > Number(rSollState?.val) - Number(hzHystState?.val);

	clearZipTimer(adapter);

	if (useDeaeration) {
		// Sicherer Start über Read-Before-Write
		await safeRawWrite(adapter, 'runDeaerate', CONSTANTS.CMD_DEAERATE, 1);
		await safeRawWrite(adapter, 'hotWaterCircPumpDeaerate', CONSTANTS.CMD_ZIP, 1);

		// UI-Datenpunkte lokal aktualisieren
		const dpDeaerate = getDpPath('runDeaerate');
		const dpCircDeaerate = getDpPath('hotWaterCircPumpDeaerate');
		if (dpDeaerate) {
			await adapter.setOwnStateIfDifferent(dpDeaerate, true, true);
		}
		if (dpCircDeaerate) {
			await adapter.setOwnStateIfDifferent(dpCircDeaerate, true, true);
		}
	} else {
		const onTimeMinutes = Math.ceil(safeDurationSeconds / 60);
		if (!adapter.originalZipConfig) {
			const keysToSave = [
				'hotWaterCircPumpTimerTableSelected',
				'WW_MoSo_Start1',
				'WW_MoSo_End1',
				'WW_MoSo_Start2',
				'WW_MoSo_End2',
				'WW_MoSo_Start3',
				'WW_MoSo_End3',
				'WW_MoSo_Start4',
				'WW_MoSo_End4',
				'WW_MoSo_Start5',
				'WW_MoSo_End5',
				'hotWaterCircPumpOnTime',
				'hotWaterCircPumpOffTime',
			] as const;

			const states = await Promise.all(keysToSave.map(key => adapter.getStateAsync(getDpPath(key as any))));

			adapter.originalZipConfig = {};
			keysToSave.forEach((key, index) => {
				if (adapter.originalZipConfig) {
					adapter.originalZipConfig[key] = states[index] ? states[index].val : null;
				}
			});
		}

		const updates = [
			{ key: 'hotWaterCircPumpTimerTableSelected', raw: 0 },
			{ key: 'WW_MoSo_Start1', raw: 0 },
			{ key: 'WW_MoSo_End1', raw: CONSTANTS.END_OF_DAY },
			{ key: 'WW_MoSo_Start2', raw: 0 },
			{ key: 'WW_MoSo_End2', raw: 0 },
			{ key: 'hotWaterCircPumpOnTime', raw: onTimeMinutes },
			{ key: 'hotWaterCircPumpOffTime', raw: 60 },
		];

		for (const u of updates) {
			const def = STATE_MAPPING[u.key];
			if (def && def.luxWriteId) {
				// Tabellen-Updates laufen jetzt durch die Schreibsperre
				await safeRawWrite(adapter, u.key, parseInt(def.luxWriteId, 10), u.raw);
			}
		}
	}

	adapter.zipTimer = adapter.setTimeout(async () => {
		await stopZipAndDeaeration(adapter);
	}, safeDurationSeconds * 1000);
}

/**
 * Abonniert die in der Konfiguration hinterlegten Bewegungsmelder (Foreign States).
 * Aufruf erfolgt einmalig in der onReady() des Adapters.
 *
 * @param adapter - Die erweiterte Adapter-Instanz
 */
export function subscribeMotionSensors(adapter: ExtendedAdapter): void {
	const config = adapter.config;
	if (config.motion_sensors_aktiv && Array.isArray(config.motionSensors)) {
		for (const sensor of config.motionSensors) {
			if (sensor.oid && typeof sensor.oid === 'string' && sensor.oid.trim() !== '') {
				adapter.subscribeForeignStates(sensor.oid.trim());
				if (adapter.isDebugLogActive) {
					writeLog(`Motion sensor subscribed: ${sensor.name} (${sensor.oid})`, 'info');
				}
			}
		}
	}
}

/**
 * Prüft bei einem StateChange, ob ein abonnierter Bewegungsmelder ausgelöst hat.
 * Wendet die Cooldown-Logik an und triggert bei Bedarf das ZIP-Makro.
 *
 * @param adapter - Die erweiterte Adapter-Instanz
 * @param id - Die ID des Datenpunkts, der sich geändert hat
 * @param state - Der neue ioBroker-Zustand
 * @returns true, wenn das Event von einem Bewegungsmelder stammte (sodass onStateChange abbrechen kann)
 */
/**
 * Prüft bei einem StateChange, ob ein abonnierter Bewegungsmelder ausgelöst hat.
 * Wendet die Cooldown-Logik an und triggert bei Bedarf das ZIP-Makro.
 *
 * @param adapter - Die erweiterte Adapter-Instanz
 * @param id - Die ID des Datenpunkts, der sich geändert hat
 * @param state - Der neue ioBroker-Zustand
 * @returns true, wenn das Event von einem Bewegungsmelder stammte (sodass onStateChange abbrechen kann)
 */
export async function checkAndHandleMotionSensor(
	adapter: ExtendedAdapter,
	id: string,
	state: ioBroker.State,
): Promise<boolean> {
	const config = adapter.config;

	// Prüfen ob die Überwachung überhaupt aktiv und richtig konfiguriert ist
	if (!config.motion_sensors_aktiv || !config.motionSensors || !Array.isArray(config.motionSensors)) {
		return false; // Funktion ist aus, weiter in der main.ts
	}

	const matchedSensor = config.motionSensors.find((s: any) => s.oid && s.oid.trim() === id);

	if (!matchedSensor) {
		return false; // Kein hinterlegter Bewegungsmelder, weiter in der main.ts
	}

	// Wir reagieren nur, wenn der Melder auf "true" (Bewegung) geht
	if (state.val === true) {
		// NEU: Wir prüfen den Status unseres eigenen virtuellen Trigger-Datenpunkts anstatt ZIPout
		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));

		const now = Date.now();
		const lastZipChange = activateZipState?.lc || 0;
		const isCurrentlyActive = activateZipState?.val === true;

		// NEU: Cooldown-Prüfung
		// Wir starten ODER verlängern, wenn die ZIP GERADE LÄUFT (isCurrentlyActive)
		// ODER wenn die eingestellte Cooldown-Sperrzeit abgelaufen ist.
		if (isCurrentlyActive || now - lastZipChange > (config.zip_last_run_min || 600) * 1000) {
			if (adapter.isDebugLogActive) {
				writeLog(
					`Motion registered at sensor '${matchedSensor.name || id}'. Launching or extending circulation pump ZIP macro sequence.`,
					'debug',
				);
			}
			// Trigger für das Activate_Zip Makro (Löst die handleActivateZip Funktion aus)
			await adapter.setState(getDpPath('Activate_Zip'), {
				val: true,
				ack: false,
			});
		} else {
			if (adapter.isDebugLogActive) {
				writeLog(
					`Motion registered at sensor '${matchedSensor.name || id}' but circulation pump execution suppressed due to anti-cycling protective interval timer.`,
					'debug',
				);
			}
		}
	}

	// Da es unser Sensor war, geben wir true zurück (auch wenn der Wert false war)
	return true;
}
/**
 * Deaktiviert die regulären Hardware-Timer der Zirkulationspumpe beim Adapter-Start.
 * Schreibt die Hardware-schonenden Vorgabewerte (00:00, 60 Min Aus, 0 Min An) in die Luxtronik.
 * Dank 'safeRawWrite' passiert dies physisch nur, wenn die Werte abweichen.
 *
 * @param adapter - Die erweiterte Adapter-Instanz
 */
export async function disableHardwareZipTimer(adapter: ExtendedAdapter): Promise<void> {
	const config = adapter.config;

	// Prüfen, ob die Checkbox "Deaktiviere reguläre ZIP Werte" aktiv ist
	// (Passe den Namen 'zip_hardware_timer_disable' an deine jsonConfig an, falls er anders heißt)
	if (config.zip_hardware_timer_disable === true) {
		if (adapter.isDebugLogActive) {
			writeLog('Applying safe hardware defaults for ZIP timers (disabling standard schedule)...', 'info');
		}

		try {
			// 1. Tabelle auf "Woche (Mo-So)" stellen (Register 506 = 0)
			await safeRawWrite(adapter, 'hotWaterCircPumpTimerTableSelected', 506, 0);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpTimerTableSelected'), 0, true);

			// 2. Taktzeiten einstellen (An: 0 Minuten, Aus: 60 Minuten)
			await safeRawWrite(adapter, 'hotWaterCircPumpOnTime', 697, 0);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpOnTime'), 0, true);

			await safeRawWrite(adapter, 'hotWaterCircPumpOffTime', 698, 60);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpOffTime'), 60, true);

			// 3. Alle Start-/Endzeiten der Mo-So Tabelle auf "00:00 - 00:00" (Rohwert = 0 Sekunden) setzen
			const timeIds = [
				{ key: 'Zirkulation_MoSo_Start1', id: 507 },
				{ key: 'Zirkulation_MoSo_End1', id: 508 },
				{ key: 'Zirkulation_MoSo_Start2', id: 509 },
				{ key: 'Zirkulation_MoSo_End2', id: 510 },
				{ key: 'Zirkulation_MoSo_Start3', id: 511 },
				{ key: 'Zirkulation_MoSo_End3', id: 512 },
				{ key: 'Zirkulation_MoSo_Start4', id: 513 },
				{ key: 'Zirkulation_MoSo_End4', id: 514 },
				{ key: 'Zirkulation_MoSo_Start5', id: 515 },
				{ key: 'Zirkulation_MoSo_End5', id: 516 },
			];

			for (const t of timeIds) {
				// Rohwert 0 entspricht 00:00:00 Uhr
				await safeRawWrite(adapter, t.key, t.id, 0);
				// UI-State synchronisieren (ioBroker erwartet das String-Format)
				await adapter.setOwnStateIfDifferent(getDpPath(t.key), '00:00', true);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`Error applying safe ZIP defaults: ${msg}`, 'error');
		}
	}
}

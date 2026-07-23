import type { AdapterInstance } from '@iobroker/adapter-core';
import { timeStringToSeconds } from './convert';
import { writeLog } from './logger';
import { queueWrite } from './rawFunctions';
import { getDpPath, STATE_MAPPING } from './stateMapping';
// =========================================================
// CONSTANTS
// =========================================================

const CONSTANTS = {
	CMD_DEAERATE: 158,
	CMD_ZIP: 684,
	END_OF_DAY: 86340,
	WRITE_DELAY: 100,
};

// =========================================================
// TYPES & INTERFACES
// =========================================================

export type ZipConfig = Partial<Record<keyof typeof STATE_MAPPING, ioBroker.StateValue | null>>;

interface ExtendedAdapter extends AdapterInstance {
	config: ioBroker.AdapterConfig & Record<string, any>;
	originalZipConfig?: ZipConfig | null;
	zipTimer?: ioBroker.Timeout;
	isDebugLogActive?: boolean;
	syncConfigValue: (key: string, value: any) => Promise<void>;
	setOwnStateIfDifferent: (dpPath: string, value: any, ack?: boolean) => Promise<void>;
	writeCyclesToday: number;
	writeCyclesTotal: number;
	writeQueue: (() => Promise<void>)[];
	isWriting: boolean;
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Schützt den Speicher durch Read-Before-Write direkt auf Rohwert-Ebene.
 *
 * @param adapter The adapter instance used to read/write states and queue writes
 * @param key The state mapping key to write
 * @param luxId The Luxtronik register id to write to
 * @param rawValue The raw numeric value to write into the register
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

		if (typeof state.val === 'boolean') {
			currentRaw = state.val ? 1 : 0;
		} else if (typeof state.val === 'number') {
			currentRaw = state.val;
		} else if (typeof state.val === 'string') {
			// NEU: Frühjahrsputz! Nutzt die zentrale Funktion anstatt Inline-RegEx
			currentRaw = timeStringToSeconds(state.val);
		}

		if (currentRaw === rawValue) {
			if (adapter.isDebugLogActive) {
				writeLog(
					`[SafeWrite] Wert für '${key}' ist bereits auf Zielwert (${rawValue}). Schreibvorgang blockiert!`,
					'debug',
				);
			}
			return;
		}
	}

	if (adapter.isDebugLogActive) {
		writeLog(`[SafeWrite] Änderung erkannt. Schreibe ${rawValue} in Register ${luxId} (${key})...`, 'debug');
	}
	await queueWrite(adapter, luxId, rawValue);

	await new Promise<void>(resolve => {
		adapter.setTimeout(resolve, CONSTANTS.WRITE_DELAY);
	});
}

function clearZipTimer(adapter: ExtendedAdapter): void {
	if (!adapter.zipTimer) {
		return;
	}
	adapter.clearTimeout(adapter.zipTimer);
	adapter.zipTimer = undefined;
}

/**
 * Prüft dynamisch, ob die aktuelle Uhrzeit laut den Luxtronik-Zeitplänen für die Zirkulation freigegeben ist.
 *
 * @param adapter - Instanz des Adapters, verwendet zum Lesen von States und Konfigurationen
 */
async function isZipAllowedBySchedule(adapter: ExtendedAdapter): Promise<boolean> {
	const config = adapter.config;

	// Wenn Hardware-Timer deaktivert sind -> Dauerfreigabe
	if (config.zip_hardware_timer_disable === true) {
		return true;
	}

	try {
		const tableState = await adapter.getStateAsync(getDpPath('hotWaterCircPumpTimerTableSelected'));
		const tableMode = tableState ? Number(tableState.val) : 0;

		const now = new Date();
		const day = now.getDay();
		const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

		let prefix = 'Zirkulation_MoSo';
		let endSuffix = 'End';

		if (tableMode === 1) {
			// 5+2
			prefix = day >= 1 && day <= 5 ? 'Zirkulation_MoFr' : 'Zirkulation_SaSo';
			endSuffix = 'Ende';
		} else if (tableMode === 2) {
			// Einzeltage
			const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
			prefix = `Zirkulation_${days[day]}`;
			endSuffix = 'Ende';
		}

		let isAllowed = false;

		for (let i = 1; i <= 5; i++) {
			const startKey = `${prefix}_Start${i}`;
			const endKey = `${prefix}_${endSuffix}${i}`;

			const startState = await adapter.getStateAsync(getDpPath(startKey));
			const endState = await adapter.getStateAsync(getDpPath(endKey));

			if (startState && startState.val && endState && endState.val) {
				const startSec = timeStringToSeconds(String(startState.val));
				const endSec = timeStringToSeconds(String(endState.val));

				if (startSec !== endSec) {
					let actualEndSec = endSec;
					if (endSec === 0 && startSec > 0) {
						actualEndSec = 86400; // Mitternacht
					}
					if (currentSeconds >= startSec && currentSeconds <= actualEndSec) {
						isAllowed = true;
						break;
					}
				}
			}
		}
		return isAllowed;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (adapter.isDebugLogActive) {
			writeLog(`[ZIP] Fehler bei der Zeitplan-Prüfung: ${msg}`, 'error');
		}
		return true; // Fallback: Erlauben, damit es im Fehlerfall warm bleibt
	}
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
				// NEU: Frühjahrsputz! Nutzt die zentrale Funktion
				rawVal = timeStringToSeconds(val);
			}

			const targetPath = getDpPath(key);
			if (targetPath) {
				await adapter.setState(targetPath, { val: val, ack: true });
			}

			const luxId = Number(def.luxWriteId);
			if (!isNaN(luxId)) {
				await queueWrite(adapter, luxId, Number(rawVal));
				await new Promise<void>(resolve => {
					adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY);
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
				writeLog('Stopping active ZIP macro and deaeration program...', 'info');
			}

			clearZipTimer(adapter);
			await restoreOriginalZipConfig(adapter);

			await safeRawWrite(adapter, 'runDeaerate', CONSTANTS.CMD_DEAERATE, 0);
			await safeRawWrite(adapter, 'hotWaterCircPumpDeaerate', CONSTANTS.CMD_ZIP, 0);

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
	const actors = adapter.config.actors || [];
	const validActors = actors.filter((a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '');

	let isZipAlreadyRunning = false;

	if (validActors.length > 0) {
		for (const actor of validActors) {
			try {
				const foreignState = await adapter.getForeignStateAsync(actor.zip_external_relay_id);
				if (foreignState && foreignState.val === true) {
					isZipAlreadyRunning = true;
					break;
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

	const localId = id.replace(`${adapter.namespace}.`, '');
	await adapter.setState(localId, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setState(localId, { val: false, ack: true });
		return;
	}

	const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);

	if (isZipAlreadyRunning) {
		if (adapter.isDebugLogActive) {
			writeLog('[ZIP] Pumpe läuft bereits. Verlängere Timer.', 'debug');
		}

		if (adapter.zipTimer) {
			adapter.clearTimeout(adapter.zipTimer);
		}

		adapter.zipTimer = adapter.setTimeout(async () => {
			if (validActors.length > 0) {
				for (const actor of validActors) {
					try {
						await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
						writeLog(`[ZIP] Fehler beim Ausschalten des Relais: ${msg}`, 'error');
					}
				}
				await adapter.setState(localId, { val: false, ack: true }); // Reset Button
			} else {
				await stopZipAndDeaeration(adapter);
			}
		}, safeDurationSeconds * 1000);

		return;
	}

	if (validActors.length > 0) {
		if (adapter.isDebugLogActive) {
			writeLog(`[ZIP] Schalte ${validActors.length} externe(n) Aktor(en) EIN`, 'debug');
		}

		for (const actor of validActors) {
			try {
				await adapter.setForeignStateAsync(actor.zip_external_relay_id, true, false);
			} catch (err) {
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
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					writeLog(`[ZIP] Fehler beim Ausschalten von ${actor.zip_external_relay_id}: ${msg}`, 'error');
				}
			}
			await adapter.setState(localId, { val: false, ack: true }); // Reset Button
			if (adapter.isDebugLogActive) {
				writeLog(`[ZIP] Zeit abgelaufen. Externe Relais AUS.`, 'debug');
			}
		}, safeDurationSeconds * 1000);

		return;
	}

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
		await safeRawWrite(adapter, 'runDeaerate', CONSTANTS.CMD_DEAERATE, 1);
		await safeRawWrite(adapter, 'hotWaterCircPumpDeaerate', CONSTANTS.CMD_ZIP, 1);

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
export async function checkAndHandleMotionSensor(
	adapter: ExtendedAdapter,
	id: string,
	state: ioBroker.State,
): Promise<boolean> {
	const config = adapter.config;

	if (!config.motion_sensors_aktiv || !config.motionSensors || !Array.isArray(config.motionSensors)) {
		return false;
	}

	const matchedSensor = config.motionSensors.find((s: any) => s.oid && s.oid.trim() === id);
	if (!matchedSensor) {
		return false;
	}

	if (state.val === true) {
		const isAllowedBySchedule = await isZipAllowedBySchedule(adapter);

		if (!isAllowedBySchedule) {
			if (adapter.isDebugLogActive) {
				writeLog(
					`Motion registered at sensor '${matchedSensor.name || id}', but action ignored because it is outside the configured Luxtronik ZIP schedule.`,
					'debug',
				);
			}
			return true;
		}

		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));
		const now = Date.now();
		const lastZipChange = activateZipState?.lc || 0;
		const isCurrentlyActive = activateZipState?.val === true;

		if (isCurrentlyActive || now - lastZipChange > (config.zip_last_run_min || 600) * 1000) {
			if (adapter.isDebugLogActive) {
				writeLog(
					`Motion registered at sensor '${matchedSensor.name || id}'. Launching or extending circulation pump ZIP macro sequence.`,
					'debug',
				);
			}
			await adapter.setState(getDpPath('Activate_Zip'), { val: true, ack: false });
		} else {
			if (adapter.isDebugLogActive) {
				writeLog(
					`Motion registered at sensor '${matchedSensor.name || id}' but circulation pump execution suppressed due to anti-cycling protective interval timer.`,
					'debug',
				);
			}
		}
	}

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

	if (config.zip_hardware_timer_disable === true) {
		if (adapter.isDebugLogActive) {
			writeLog('Applying safe hardware defaults for ZIP timers...', 'info');
		}

		try {
			await safeRawWrite(adapter, 'hotWaterCircPumpTimerTableSelected', 506, 0);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpTimerTableSelected'), 0, true);

			await safeRawWrite(adapter, 'hotWaterCircPumpOnTime', 697, 0);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpOnTime'), 0, true);

			await safeRawWrite(adapter, 'hotWaterCircPumpOffTime', 698, 60);
			await adapter.setOwnStateIfDifferent(getDpPath('hotWaterCircPumpOffTime'), 60, true);

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
				await safeRawWrite(adapter, t.key, t.id, 0);
				await adapter.setOwnStateIfDifferent(getDpPath(t.key), '00:00', true);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`Error applying safe ZIP defaults: ${msg}`, 'error');
		}
	}
}

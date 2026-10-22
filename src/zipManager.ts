import { timeStringToSeconds } from './convert';
import { writeLog } from './logger';
import { queueWrite } from './rawFunctions';
import { getDpPath, STATE_MAPPING } from './stateMapping';
import type { LuxtronikAdapter } from './types';

// =========================================================
// CONSTANTS
// =========================================================

const CONSTANTS = {
	CMD_DEAERATE: 158,
	CMD_ZIP: 684,
	MODBUS_COIL_ZIP: 7,
	END_OF_DAY: 86340,
	WRITE_DELAY: 100,
	COUNTDOWN_TICK_MS: 5000, // Update-Intervall für Restlaufzeit (5s schont DB)
};

// =========================================================
// LEGACY STATE ID MAPPINGS
// =========================================================
const LEGACY_DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// =========================================================
// TYPES & INTERFACES
// =========================================================

export type ZipConfig = Partial<Record<keyof typeof STATE_MAPPING, ioBroker.StateValue | null>>;

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Schützt den Speicher durch Read-Before-Write direkt auf Rohwert-Ebene.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param key Der betroffene Datenpunkt-Schlüssel.
 * @param luxId Die Luxtronik-ID.
 * @param rawValue Der rohe Messwert.
 */
async function safeRawWrite(
	adapter: LuxtronikAdapter,
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
			currentRaw = timeStringToSeconds(state.val);
		}

		if (currentRaw === rawValue) {
			if (adapter.isDebugLogActive) {
				writeLog(`[SafeWrite] Value for '${key}' is already at target (${rawValue}). Write blocked!`, 'debug');
			}
			return;
		}
	}

	if (adapter.isDebugLogActive) {
		writeLog(`[SafeWrite] Change detected. Writing ${rawValue} to register ${luxId} (${key})...`, 'debug');
	}
	await queueWrite(adapter, luxId, rawValue);

	await new Promise<void>(resolve => {
		adapter.setTimeout(resolve, CONSTANTS.WRITE_DELAY);
	});
}

/**
 * Stoppt sowohl den Haupt-Timeout als auch das Countdown-Intervall der ZIP.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
function clearZipTimer(adapter: LuxtronikAdapter): void {
	if (adapter.zipTimer) {
		adapter.clearTimeout(adapter.zipTimer);
		adapter.zipTimer = undefined;
	}
	if (adapter.zipCountdownInterval) {
		adapter.clearInterval(adapter.zipCountdownInterval);
		adapter.zipCountdownInterval = undefined;
	}
	adapter.zipEndTime = undefined;
}

/**
 * Startet bzw. verlängert den Haupt-Timer und den sichtbaren Restlaufzeit-Countdown.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param durationSeconds Die Dauer in Sekunden.
 * @param onTimeoutCallback Callback wenn der Timer abläuft.
 */
async function startZipTimerAndCountdown(
	adapter: LuxtronikAdapter,
	durationSeconds: number,
	onTimeoutCallback: () => Promise<void>,
): Promise<void> {
	clearZipTimer(adapter);

	adapter.zipEndTime = Date.now() + durationSeconds * 1000;

	const remainingDp = getDpPath('Virtual_ZIP_Remaining_Time');
	if (remainingDp) {
		await adapter.setStateChangedAsync(remainingDp, { val: durationSeconds, ack: true });
	}

	// Zyklisches Update der Restlaufzeit
	adapter.zipCountdownInterval = adapter.setInterval(async () => {
		if (!adapter.zipEndTime) {
			return;
		}
		const remaining = Math.max(0, Math.round((adapter.zipEndTime - Date.now()) / 1000));
		if (remainingDp) {
			await adapter.setStateChangedAsync(remainingDp, { val: remaining, ack: true });
		}
	}, CONSTANTS.COUNTDOWN_TICK_MS);

	// Haupt-Timer zum Ausschalten nach Ablauf
	adapter.zipTimer = adapter.setTimeout(async () => {
		clearZipTimer(adapter);
		if (remainingDp) {
			await adapter.setStateChangedAsync(remainingDp, { val: 0, ack: true });
		}
		await onTimeoutCallback();
	}, durationSeconds * 1000);
}

/**
 * Dynamically checks whether the current time is enabled for circulation according to the Luxtronik schedules.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
async function isZipAllowedBySchedule(adapter: LuxtronikAdapter): Promise<boolean> {
	const config = adapter.config;

	// Bei Modbus oder deaktivierten Hardware-Timern immer freigeben
	if (config.zip_control_mode === 'modbus' || config.zip_lWP_aktiv === true) {
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
			prefix = day >= 1 && day <= 5 ? 'Zirkulation_MoFr' : 'Zirkulation_SaSo';
			endSuffix = 'Ende';
		} else if (tableMode === 2) {
			prefix = `Zirkulation_${LEGACY_DAYS[day]}`;
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
						actualEndSec = 86400; // Midnight
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
			writeLog(`[ZIP] Error during schedule check: ${msg}`, 'error');
		}
		return true;
	}
}

// =========================================================
// MAIN EXPORTS
// =========================================================

/**
 * Restores the original circulation pump configuration from the saved cache.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
export async function restoreOriginalZipConfig(adapter: LuxtronikAdapter): Promise<void> {
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
 * Stops the active circulation pump macro and deaeration program across all modes.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
export async function stopZipAndDeaeration(adapter: LuxtronikAdapter): Promise<void> {
	const mode = adapter.config.zip_control_mode || 'controller';
	const actors = adapter.config.actors || [];
	const validActors = actors.filter((a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '');

	clearZipTimer(adapter);

	// 1. Externe Aktoren abschalten (falls Modus = 'actor' oder als Fallback konfiguriert)
	if (mode === 'actor' || validActors.length > 0) {
		try {
			for (const actor of validActors) {
				await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
			}
			if (adapter.isDebugLogActive && validActors.length > 0) {
				writeLog(`[ZIP] Emergency/Timeout stop sent for external relays.`, 'debug');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[ZIP] Error switching off external relays: ${msg}`, 'error');
		}
	}

	// 2. Modbus Coil 7 abschalten (falls Modus = 'modbus')
	if (mode === 'modbus') {
		try {
			if (adapter.modbusManager && adapter.modbusManager.isAvailable) {
				await adapter.modbusManager.writeRegister(CONSTANTS.MODBUS_COIL_ZIP, 0, true);
				if (adapter.isDebugLogActive) {
					writeLog(`[ZIP] Modbus Coil ${CONSTANTS.MODBUS_COIL_ZIP} switched OFF.`, 'debug');
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[ZIP] Error switching off Modbus Coil 7: ${msg}`, 'error');
		}
	}

	// 3. Internen Luxtronik-Regler zurücksetzen (falls Modus = 'controller' oder noch ein altes Makro lief)
	try {
		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));
		const runDeaerateState = await adapter.getStateAsync(getDpPath('runDeaerate'));

		const isZipActive = activateZipState?.val === true || adapter.originalZipConfig !== null;
		const isDeaerateActive = runDeaerateState?.val === 1 || runDeaerateState?.val === true;

		if (mode === 'controller' && (isZipActive || isDeaerateActive)) {
			if (adapter.isDebugLogActive) {
				writeLog('Stopping active controller ZIP macro and deaeration program...', 'info');
			}

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
		}

		const dpZip = getDpPath('Activate_Zip');
		if (dpZip) {
			await adapter.setOwnStateIfDifferent(dpZip, false, true);
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error stopping ZIP/Deaeration: ${msg}`, 'error');
	} finally {
		// GARANTIERTER RESET: Virtueller Status und Restlaufzeit immer auf AUS / 0 setzen
		const virtualDp = getDpPath('Virtual_ZIP_Status');
		if (virtualDp) {
			await adapter.setStateChangedAsync(virtualDp, { val: false, ack: true });
		}
		const remainingDp = getDpPath('Virtual_ZIP_Remaining_Time');
		if (remainingDp) {
			await adapter.setStateChangedAsync(remainingDp, { val: 0, ack: true });
		}
	}
}

/**
 * Activates the circulation pump (ZIP) via the selected control mode for a specified duration.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param id Die ID des Datenpunkts.
 * @param durationSeconds Die Dauer in Sekunden.
 */
export async function handleActivateZip(adapter: LuxtronikAdapter, id: string, durationSeconds: number): Promise<void> {
	const mode = adapter.config.zip_control_mode || 'controller';
	const actors = adapter.config.actors || [];
	const validActors = actors.filter((a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '');

	const localId = id.replace(`${adapter.namespace}.`, '');
	await adapter.setState(localId, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await stopZipAndDeaeration(adapter);
		return;
	}

	const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);

	// Prüfen, ob die Pumpe bereits über unseren Adapter-Timer läuft
	const virtualStatusState = await adapter.getStateAsync(getDpPath('Virtual_ZIP_Status'));
	const isZipAlreadyRunning = Boolean(adapter.zipTimer) || virtualStatusState?.val === true;

	if (isZipAlreadyRunning) {
		if (adapter.isDebugLogActive) {
			writeLog(
				`[ZIP] Pump is already running (Mode: ${mode}). Extending timer to ${safeDurationSeconds}s.`,
				'debug',
			);
		}
		await startZipTimerAndCountdown(adapter, safeDurationSeconds, async () => {
			await stopZipAndDeaeration(adapter);
		});
		return;
	}

	// =========================================================
	// WEICHE 1: EXTERNER AKTOR (z.B. Shelly)
	// =========================================================
	if (mode === 'actor') {
		if (validActors.length === 0) {
			writeLog('[ZIP] Mode is set to external actor, but no valid actor OIDs are configured!', 'warn');
			await adapter.setState(localId, { val: false, ack: true });
			return;
		}

		if (adapter.isDebugLogActive) {
			writeLog(`[ZIP] Switching ON ${validActors.length} external actor(s) for ${safeDurationSeconds}s`, 'debug');
		}

		for (const actor of validActors) {
			try {
				await adapter.setForeignStateAsync(actor.zip_external_relay_id, true, false);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				writeLog(`[ZIP] Error switching on ${actor.zip_external_relay_id}: ${msg}`, 'error');
			}
		}

		const virtualDp = getDpPath('Virtual_ZIP_Status');
		if (virtualDp) {
			await adapter.setStateChangedAsync(virtualDp, { val: true, ack: true });
		}

		await startZipTimerAndCountdown(adapter, safeDurationSeconds, async () => {
			await stopZipAndDeaeration(adapter);
		});
		return;
	}

	// =========================================================
	// WEICHE 2: MODBUS TCP (Coil 7)
	// =========================================================
	if (mode === 'modbus') {
		if (!adapter.modbusManager || !adapter.modbusManager.isAvailable) {
			writeLog('[ZIP] Mode is set to Modbus TCP, but Modbus is disabled or unreachable!', 'warn');
			await adapter.setState(localId, { val: false, ack: true });
			return;
		}

		if (adapter.isDebugLogActive) {
			writeLog(
				`[ZIP] Switching ON via Modbus Coil ${CONSTANTS.MODBUS_COIL_ZIP} for ${safeDurationSeconds}s`,
				'debug',
			);
		}

		await adapter.modbusManager.writeRegister(CONSTANTS.MODBUS_COIL_ZIP, 1, true);

		const virtualDp = getDpPath('Virtual_ZIP_Status');
		if (virtualDp) {
			await adapter.setStateChangedAsync(virtualDp, { val: true, ack: true });
		}

		await startZipTimerAndCountdown(adapter, safeDurationSeconds, async () => {
			await stopZipAndDeaeration(adapter);
		});
		return;
	}

	// =========================================================
	// WEICHE 3: INTERNER LUXTRONIK REGLER (Standard)
	// =========================================================
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
		] as const;

		for (const u of updates) {
			const def = STATE_MAPPING[u.key];
			if (def && def.luxWriteId) {
				await safeRawWrite(adapter, u.key, parseInt(def.luxWriteId, 10), u.raw);
			}
		}
	}

	const virtualDp = getDpPath('Virtual_ZIP_Status');
	if (virtualDp) {
		await adapter.setStateChangedAsync(virtualDp, { val: true, ack: true });
	}

	await startZipTimerAndCountdown(adapter, safeDurationSeconds, async () => {
		await stopZipAndDeaeration(adapter);
	});
}

/**
 * Abonniert die in der Konfiguration hinterlegten Bewegungsmelder (Foreign States).
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
export function subscribeMotionSensors(adapter: LuxtronikAdapter): void {
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
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param id Die ID des Datenpunkts.
 * @param state Der neue Status des Datenpunkts.
 */
export async function checkAndHandleMotionSensor(
	adapter: LuxtronikAdapter,
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
		if (!state.ack) {
			return false;
		}
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
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
export async function disableHardwareZipTimer(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;

	// Bei Modbus-Steuerung müssen wir die internen Timer nicht anfassen
	if (config.zip_control_mode === 'modbus') {
		return;
	}

	if (config.zip_lWP_aktiv === true) {
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
			] as const;

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

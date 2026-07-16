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

			await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 0);
			await new Promise<void>(resolve => {
				adapter.setTimeout(() => {
					resolve();
				}, CONSTANTS.WRITE_DELAY);
			});

			await adapter.queueWrite(CONSTANTS.CMD_ZIP, 0);
			await new Promise<void>(resolve => {
				adapter.setTimeout(() => {
					resolve();
				}, CONSTANTS.WRITE_DELAY);
			});

			await adapter.syncConfigValue('runDeaerate', false);
			await adapter.syncConfigValue('hotWaterCircPumpDeaerate', false);

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
	const localId = id.replace(`${adapter.namespace}.`, '');
	await adapter.setStateAsync(localId, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setStateAsync(localId, { val: false, ack: true });
		return;
	}

	const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);
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
		await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 1);
		await new Promise<void>(resolve => {
			adapter.setTimeout(() => {
				resolve();
			}, CONSTANTS.WRITE_DELAY);
		});

		await adapter.queueWrite(CONSTANTS.CMD_ZIP, 1);
		await adapter.syncConfigValue('runDeaerate', true);
		await adapter.syncConfigValue('hotWaterCircPumpDeaerate', true);
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
				await adapter.queueWrite(parseInt(def.luxWriteId, 10), u.raw);
				await new Promise<void>(resolve => {
					adapter.setTimeout(() => {
						resolve();
					}, CONSTANTS.WRITE_DELAY);
				});
			}
		}
	}

	adapter.zipTimer = adapter.setTimeout(async () => {
		await stopZipAndDeaeration(adapter);
	}, safeDurationSeconds * 1000);
}

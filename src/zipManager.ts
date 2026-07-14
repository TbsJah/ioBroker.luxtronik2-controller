import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath, STATE_MAPPING } from './stateMapping';

// =========================================================
// KONSTANTEN (Magic Numbers & Verzögerungen eliminiert)
// =========================================================
const CONSTANTS = {
	CMD_DEAERATE: 158,
	CMD_ZIP: 684,
	END_OF_DAY: 86340, // 23:59:00 in Sekunden
	WRITE_DELAY: 100, // 100ms Pause zwischen Schreibvorgängen
};

// Typdefinition für die Sicherung der Original-Konfiguration
export type ZipConfig = Partial<Record<keyof typeof STATE_MAPPING, ioBroker.StateValue | null>>;

// Erweiterung des Adapter-Typs, um TypeScript die dynamischen Eigenschaften bekannt zu machen
interface ExtendedAdapter extends AdapterInstance {
	originalZipConfig?: ZipConfig | null;
	zipTimer?: ioBroker.Timeout;
	isDebugLogActive?: boolean;
	queueWrite: (luxId: number, value: number) => Promise<void>;
	syncConfigValue: (key: string, value: number) => Promise<void>;
	setOwnStateIfDifferent: (dpPath: string, value: any, ack?: boolean) => Promise<void>;
}

// =========================================================
// HILFSFUNKTIONEN
// =========================================================

/**
 * Löscht den aktiven Zirkulations-Timer sicher über die ioBroker-Methode.
 *
 * @param adapter - The adapter instance
 */
function clearZipTimer(adapter: ExtendedAdapter): void {
	if (!adapter.zipTimer) {
		return;
	}
	adapter.clearTimeout(adapter.zipTimer);
	adapter.zipTimer = undefined;
}

// =========================================================
// WIEDERHERSTELLUNG & STEUERUNG
// =========================================================

/**
 * Stellt die ursprüngliche Konfiguration der Zirkulationspumpe (Timer) wieder her.
 *
 * @param adapter - Die Adapter-Instanz, von der Zustände gelesen und geschrieben werden.
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
				continue; // Absicherung, falls ein Mapping fehlt oder ungültig ist
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
				// FIX: Leere Pfeilfunktion löst den TS2554 Fehler!
				await new Promise<void>(resolve => adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY));
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler bei der Wiederherstellung der ZIP Konfiguration: ${msg}`, 'error');
	} finally {
		adapter.originalZipConfig = null;
	}
}

/**
 * Stoppt die Zirkulationspumpe bzw. das zweckentfremdete Entlüftungsprogramm.
 *
 * @param adapter - Die Adapter-Instanz, von der Zustände gelesen und geschrieben werden.
 */
export async function stopZipAndDeaeration(adapter: ExtendedAdapter): Promise<void> {
	try {
		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));
		const runDeaerateState = await adapter.getStateAsync(getDpPath('runDeaerate'));

		const isZipActive = activateZipState?.val === true || adapter.zipTimer || adapter.originalZipConfig !== null;
		const isDeaerateActive = runDeaerateState?.val === 1 || runDeaerateState?.val === true;

		if (isZipActive || isDeaerateActive) {
			if (adapter.isDebugLogActive) {
				writeLog('Bedingungen erfüllt: Stoppe aktives ZIP Makro und Entlüftungsprogramm...', 'info');
			}

			// Nutzt den neuen, sicheren Timer-Helper
			clearZipTimer(adapter);

			await restoreOriginalZipConfig(adapter);

			// Nutzt die lesbaren Konstanten für die Register
			await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 0);
			// FIX: Leere Pfeilfunktion
			await new Promise<void>(resolve => adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY));

			await adapter.queueWrite(CONSTANTS.CMD_ZIP, 0);
			// FIX: Leere Pfeilfunktion
			await new Promise<void>(resolve => adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY));

			await adapter.syncConfigValue('runDeaerate', 0);
			await adapter.syncConfigValue('hotWaterCircPumpDeaerate', 0);

			const dpZip = getDpPath('Activate_Zip');
			if (dpZip) {
				await adapter.setOwnStateIfDifferent(dpZip, false, true);
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Stoppen von ZIP/Entlüftung: ${msg}`, 'error');
	}
}

/**
 * Aktiviert die Zirkulationspumpe (oder Entlüftung) für eine bestimmte Dauer.
 *
 * @param adapter - Die Adapter-Instanz
 * @param id - Der Datenpunkt-Pfad
 * @param durationSeconds - Die Dauer in Sekunden
 */
export async function handleActivateZip(adapter: ExtendedAdapter, id: string, durationSeconds: number): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setForeignStateAsync(id, { val: false, ack: true });
		return;
	}

	// Absicherung der Dauer, damit keine ungültigen Timer-Werte (z.B. NaN) übergeben werden
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

	// Eventuell laufenden Timer vor dem Neustart stoppen
	clearZipTimer(adapter);

	if (useDeaeration) {
		await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 1);
		// FIX: Leere Pfeilfunktion
		await new Promise<void>(resolve => adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY));

		await adapter.queueWrite(CONSTANTS.CMD_ZIP, 1);
		await adapter.syncConfigValue('runDeaerate', 1);
		await adapter.syncConfigValue('hotWaterCircPumpDeaerate', 1);
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

			// HOCHGRADIG OPTIMIERT: Alle 13 States parallel laden!
			const states = await Promise.all(keysToSave.map(key => adapter.getStateAsync(getDpPath(key))));

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
				// FIX: Leere Pfeilfunktion
				await new Promise<void>(resolve => adapter.setTimeout(() => resolve(), CONSTANTS.WRITE_DELAY));
			}
		}
	}

	adapter.zipTimer = adapter.setTimeout(async () => {
		await stopZipAndDeaeration(adapter);
	}, safeDurationSeconds * 1000);
}

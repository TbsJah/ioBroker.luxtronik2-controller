import { writeLog } from './logger';
import { getDpPath, STATE_MAPPING } from './stateMapping';

/**
 * Stellt die ursprüngliche Konfiguration der Zirkulationspumpe (Timer) wieder her.
 *
 * @param adapter - Die Adapter-Instanz
 */
export async function restoreOriginalZipConfig(adapter: any): Promise<void> {
	if (!adapter.originalZipConfig) {
		return;
	}

	try {
		for (const [key, val] of Object.entries(adapter.originalZipConfig)) {
			if (val === null || val === undefined) {
				continue;
			}

			const def = STATE_MAPPING[key];
			let rawVal = val;

			if (def.role === 'value.datetime' && typeof val === 'string') {
				const timeMatch = val.match(/^(\d{1,2}):(\d{1,2})/);
				if (timeMatch) {
					rawVal = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
				} else {
					rawVal = 0;
				}
			}

			await adapter.setState(getDpPath(key), { val: val, ack: true });

			const luxId = parseInt(def.luxWriteId as string, 10);
			await adapter.queueWrite(luxId, rawVal);
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	} catch (err: any) {
		writeLog(`Fehler bei der Wiederherstellung der ZIP Konfiguration: ${err.message}`, 'error');
	} finally {
		adapter.originalZipConfig = null;
	}
}

/**
 * Stoppt die Zirkulationspumpe bzw. das zweckentfremdete Entlüftungsprogramm.
 *
 * @param adapter - Die Adapter-Instanz
 */
export async function stopZipAndDeaeration(adapter: any): Promise<void> {
	try {
		const activateZipState = await adapter.getStateAsync(getDpPath('Activate_Zip'));
		const runDeaerateState = await adapter.getStateAsync(getDpPath('runDeaerate'));

		const isZipActive = activateZipState?.val === true || adapter.zipTimer || adapter.originalZipConfig !== null;
		const isDeaerateActive = runDeaerateState?.val === 1 || runDeaerateState?.val === true;

		if (isZipActive || isDeaerateActive) {
			if (adapter.isDebugLogActive) {
				writeLog('Bedingungen erfüllt: Stoppe aktives ZIP Makro und Entlüftungsprogramm...', 'info');
			}

			if (adapter.zipTimer) {
				clearTimeout(adapter.zipTimer);
				adapter.zipTimer = undefined;
			}

			await restoreOriginalZipConfig(adapter);

			await adapter.queueWrite(158, 0);
			await new Promise(resolve => setTimeout(resolve, 100));
			await adapter.queueWrite(684, 0);
			await new Promise(resolve => setTimeout(resolve, 100));

			await adapter.syncConfigValue('runDeaerate', 0);
			await adapter.syncConfigValue('hotWaterCircPumpDeaerate', 0);
			await adapter.setOwnStateIfDifferent(getDpPath('Activate_Zip'), false, true);
		}
	} catch (err: any) {
		writeLog(`Fehler beim Stoppen von ZIP/Entlüftung: ${err.message}`, 'error');
	}
}

/**
 * Aktiviert die Zirkulationspumpe (oder Entlüftung) für eine bestimmte Dauer.
 *
 * @param adapter - Die Adapter-Instanz
 * @param id - Die State-ID des Auslösers
 * @param durationSeconds - Dauer in Sekunden
 */
export async function handleActivateZip(adapter: any, id: string, durationSeconds: number): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setForeignStateAsync(id, { val: false, ack: true });
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

	if (adapter.zipTimer) {
		clearTimeout(adapter.zipTimer);
		adapter.zipTimer = undefined;
	}

	if (useDeaeration) {
		await adapter.queueWrite(158, 1);
		await new Promise(r => setTimeout(r, 100));
		await adapter.queueWrite(684, 1);
		await adapter.syncConfigValue('runDeaerate', 1);
		await adapter.syncConfigValue('hotWaterCircPumpDeaerate', 1);
	} else {
		const onTimeMinutes = Math.ceil(durationSeconds / 60);
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
			adapter.originalZipConfig = {};
			for (const k of keysToSave) {
				const s = await adapter.getStateAsync(getDpPath(k));
				adapter.originalZipConfig[k] = s ? s.val : null;
			}
		}

		const updates = [
			{ key: 'hotWaterCircPumpTimerTableSelected', raw: 0 },
			{ key: 'WW_MoSo_Start1', raw: 0 },
			{ key: 'WW_MoSo_End1', raw: 86340 },
			{ key: 'WW_MoSo_Start2', raw: 0 },
			{ key: 'WW_MoSo_End2', raw: 0 },
			{ key: 'hotWaterCircPumpOnTime', raw: onTimeMinutes },
			{ key: 'hotWaterCircPumpOffTime', raw: 60 },
		];

		for (const u of updates) {
			await adapter.queueWrite(parseInt(STATE_MAPPING[u.key].luxWriteId as string, 10), u.raw);
			await new Promise(r => setTimeout(r, 100));
		}
	}

	adapter.zipTimer = setTimeout(async () => {
		await stopZipAndDeaeration(adapter);
	}, durationSeconds * 1000);
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import { writeLog } from './logger';

let backupJob: schedule.Job | null = null;

/**
 * Initialisiert den automatischen Backup-Zeitplan basierend auf der ioBroker-Konfiguration.
 *
 * @param adapter Die ioBroker Adapter-Instanz
 */
export function initAutoBackup(adapter: AdapterInstance): void {
	const config = adapter.config as any;
	stopAutoBackup();

	if (config.autoBackupActive && config.autoBackupCron) {
		writeLog(`Initializing automated DTA backup with cron schedule: ${config.autoBackupCron}`, 'info');
		backupJob = schedule.scheduleJob(config.autoBackupCron, async () => {
			await executeDtaBackup(adapter);
		});
	}
}

/**
 * Führt den eigentlichen Download aus und speichert die Datei im ioBroker.
 *
 * @param adapter Die ioBroker Adapter-Instanz
 */
export async function executeDtaBackup(adapter: AdapterInstance): Promise<void> {
	const config = adapter.config as any;
	const ip = config.host;

	if (!ip) {
		writeLog('Backup aborted: No IP address configured.', 'warn');
		return;
	}

	try {
		writeLog('Triggering live DTA flush (/NewProc)...', 'debug');

		// 1. Zwingt die Luxtronik, den aktuellen Arbeitsspeicher zu flushen
		let response = await fetch(`http://${ip}/NewProc`).catch(() => null);
		let arrayBuffer = response && response.ok ? await response.arrayBuffer() : null;

		let isLive = true;

		// 2. Wenn die Antwort sehr klein ist (< 1000 Bytes), handelt es sich nur um die leere Trigger-Seite
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('Live dump triggered. Waiting 3 seconds for internal file generation...', 'debug');
			await new Promise(resolve => adapter.setTimeout(resolve, 3000));

			writeLog('Downloading generated live DTA file (/procdta)...', 'debug');

			// Versuche, die frisch generierte DTA-Datei (Live-Stand) herunterzuladen
			response = await fetch(`http://${ip}/procdta`).catch(() => null);

			// 3. Fallback: Lade das letzte reguläre Log herunter (kann 2-3h alt sein)
			if (!response || !response.ok) {
				writeLog('/procdta not found. Falling back to existing log (/proclog)...', 'debug');
				response = await fetch(`http://${ip}/proclog`).catch(() => null);
				isLive = false;
			}

			// 4. Letzter Fallback für ganz alte V1/V2 Webclient-Strukturen
			if (!response || !response.ok) {
				writeLog('/proclog not found, trying fallback path /Webclient/procdta...', 'debug');
				response = await fetch(`http://${ip}/Webclient/procdta`).catch(() => null);
				isLive = false;
			}

			if (!response || !response.ok) {
				throw new Error(`HTTP Error - File not found on heat pump webserver.`);
			}

			arrayBuffer = await response.arrayBuffer();
		}

		const buffer = Buffer.from(arrayBuffer);
		const basePath = config.autoBackupPath
			? String(config.autoBackupPath)
					.replace(/^\/+|\/+$/g, '')
					.trim()
			: '';

		// 5. Dateinamen mit aktuellem Zeitstempel generieren
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);

		// Name spiegelt wider, ob es ein Live-Abzug oder das letzte zyklische Backup ist
		const filePrefix = isLive ? 'dta_live' : 'dta_history';
		const fileName = `${filePrefix}_${timestamp}.dta`;

		const fullPath = basePath !== '' ? `${basePath}/${fileName}` : fileName;

		await adapter.writeFileAsync(adapter.namespace, fullPath, buffer);
		writeLog(`DTA Backup successfully saved as ${fullPath} in ioBroker files.`, 'info');
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Failed to execute automated DTA backup: ${msg}`, 'error');
	}
}

/**
 * Stoppt den laufenden Cronjob (wichtig für den Adapter-Neustart).
 */
export function stopAutoBackup(): void {
	if (backupJob) {
		backupJob.cancel();
		backupJob = null;
		writeLog('Automated DTA backup schedule stopped.', 'debug');
	}
}

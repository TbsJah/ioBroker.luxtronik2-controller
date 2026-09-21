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
		// --- SCHRITT 0: DER FIX FÜR BESTEHENDE INSTANZEN ---
		// Zwingt ioBroker dazu, den "meta"-Speicherordner anzulegen, falls
		// er (wie bei deiner .0 Instanz) noch fehlt.
		await adapter.setObjectNotExistsAsync('backups', {
			type: 'meta',
			common: {
				name: 'Luxtronik DTA Backups',
				type: 'meta.user',
			},
			native: {},
		} as any);

		writeLog('Fetching live DTA file (/NewProc)...', 'debug');

		let isLive = true;
		let arrayBuffer: ArrayBuffer | null = null;

		// 1. NewProc liefert den DTA-Speicher als direkten Datei-Stream
		let response = await fetch(`http://${ip}/NewProc`).catch(() => null);
		if (response && response.ok) {
			arrayBuffer = await response.arrayBuffer();
		}

		// 2. Fallbacks, falls NewProc leer ist oder fehlt
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('/NewProc did not return a valid file. Trying /procdta...', 'debug');
			response = await fetch(`http://${ip}/procdta`).catch(() => null);
			if (response && response.ok) {
				arrayBuffer = await response.arrayBuffer();
			}
		}

		// 3. Fallback für ältere Luxtronik-Anlagen (proclog statt procdta)
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('/procdta not found. Falling back to /proclog...', 'debug');
			response = await fetch(`http://${ip}/proclog`).catch(() => null);
			isLive = false;
			if (response && response.ok) {
				arrayBuffer = await response.arrayBuffer();
			}
		}

		// 4. Wenn immer noch nichts da ist: Abbruch
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			throw new Error(`HTTP Error - No valid DTA file found on heat pump webserver.`);
		}

		// 5. Speicher-Logik
		const buffer = Buffer.from(arrayBuffer);
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const filePrefix = isLive ? 'dta_live' : 'dta_history';

		// Das Ziel ist nun unser garantiert existierender meta-Ordner
		const targetId = `${adapter.namespace}.backups`;
		const fileName = `${filePrefix}_${timestamp}.dta`;

		// Speichern im ioBroker-Dateisystem
		await adapter.writeFileAsync(targetId, fileName, buffer);

		adapter.log.info(`DTA Backup successfully saved as ${fileName} in folder ${targetId}.`);
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

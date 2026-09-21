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
		writeLog('Fetching live DTA file (/NewProc)...', 'debug');

		let isLive = true;
		let arrayBuffer: ArrayBuffer | null = null;

		// 1. NewProc abrufen (liefert den Live-Dump direkt als Datei-Stream)
		let response = await fetch(`http://${ip}/NewProc`).catch(() => null);
		if (response && response.ok) {
			arrayBuffer = await response.arrayBuffer();
		}

		// 2. Fallback: Falls NewProc nicht existiert oder nur eine winzige (leere) Fehler-Seite liefert
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('/NewProc did not return a valid file. Trying /procdta...', 'debug');
			response = await fetch(`http://${ip}/procdta`).catch(() => null);
			if (response && response.ok) {
				arrayBuffer = await response.arrayBuffer();
			}
		}

		// 3. Fallback: Lade das letzte reguläre Log herunter (ältere Luxtronik Versionen)
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('/procdta not found. Falling back to existing log (/proclog)...', 'debug');
			response = await fetch(`http://${ip}/proclog`).catch(() => null);
			isLive = false;
			if (response && response.ok) {
				arrayBuffer = await response.arrayBuffer();
			}
		}

		// 4. Letzter Fallback für uralte Webclient-Strukturen
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('/proclog not found, trying fallback path /Webclient/procdta...', 'debug');
			response = await fetch(`http://${ip}/Webclient/procdta`).catch(() => null);
			isLive = false;
			if (response && response.ok) {
				arrayBuffer = await response.arrayBuffer();
			}
		}

		// Wenn wir nach allen Versuchen keinen gültigen Puffer haben -> Abbruch
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			throw new Error(`HTTP Error - No valid DTA file found on heat pump webserver.`);
		}

		// --- Speicher-Logik ---

		// 5. Den gewünschten Unterordner-Namen auslesen
		let basePath = config.autoBackupPath || 'backup';
		basePath = basePath.replace(/[\x2F\\ ]/g, '_').trim();
		if (basePath === '') {
			basePath = 'backup';
		}

		// 6. Konvertiere in Node.js Buffer
		const buffer = Buffer.from(arrayBuffer);

		// 7. Dateiname generieren
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const filePrefix = isLive ? 'dta_live' : 'dta_history';

		// Gespeichert wird kugelsicher in 0_userdata.0
		const targetId = '0_userdata.0';
		const fileName = `luxtronik_backups/${basePath}/${filePrefix}_${timestamp}.dta`;

		// 8. Im ioBroker-Dateisystem speichern
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

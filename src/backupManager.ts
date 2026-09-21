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
			await new Promise<void>(resolve => {
				adapter.setTimeout(() => resolve(), 3000);
			});

			writeLog('Downloading generated live DTA file (/procdta)...', 'debug');

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

		// 3. Speicherpfad aus Config holen (als Unterordner innerhalb des Adapter-Meta-Speichers)
		let basePath = config.autoBackupPath || 'backup';
		basePath = basePath.replace(/[\x2F\\ ]/g, '_').trim();
		if (basePath === '') {
			basePath = 'backup';
		}

		// 4. Konvertiere das Ergebnis in einen Node.js Buffer
		const buffer = Buffer.from(arrayBuffer);

		// 5. Dateinamen generieren inkl. dem relativen Pfad (z.B. "backup/dta_live_....dta")
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const filePrefix = isLive ? 'dta_live' : 'dta_history';
		const fileName = `${basePath}/${filePrefix}_${timestamp}.dta`;

		// 6. Im ioBroker-Dateisystem speichern
		// WICHTIG: adapter.name ist "luxtronik2-controller" (das existiert zwingend als Meta-Objekt).
		// adapter.namespace ("luxtronik2-controller.0") würde wieder den Fehler werfen!
		await adapter.writeFileAsync(adapter.name, fileName, buffer);

		adapter.log.info(`DTA Backup successfully saved as ${fileName} in ioBroker files under ${adapter.name}.`);
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

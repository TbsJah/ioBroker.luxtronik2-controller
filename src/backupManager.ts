import type { AdapterInstance } from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import { writeLog } from './logger';

// Speichert den aktuellen Cronjob, um ihn beim Beenden sauber abzuräumen
let backupJob: schedule.Job | null = null;

/**
 * Initialisiert den automatischen Backup-Zeitplan basierend auf der ioBroker-Konfiguration.
 *
 * @param adapter Die ioBroker Adapter-Instanz
 */
export function initAutoBackup(adapter: AdapterInstance): void {
	const config = adapter.config as any;

	// Alten Job abbrechen, falls die Funktion neu aufgerufen wird
	stopAutoBackup();

	if (config.autoBackupActive && config.autoBackupCron) {
		writeLog(`Initializing automated DTA backup with cron schedule: ${config.autoBackupCron}`, 'info');

		// Neuen Cronjob anlegen
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
		writeLog('Triggering live DTA flush and fetching file (/NewProc)...', 'debug');

		// 1. Neuer Firmware-Weg (Aktuelle Daten / V3.8x+): /NewProc generiert UND liefert die Datei
		let response = await fetch(`http://${ip}/NewProc`).catch(() => null);
		let arrayBuffer = response && response.ok ? await response.arrayBuffer() : null;

		// Wenn die Antwort sehr klein ist (< 1000 Bytes), ist es eine ältere Firmware.
		if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
			writeLog('Older firmware detected. Fetching historical DTA via /proclog...', 'debug');

			// 2. Offizieller Weg für ältere WP / 48h Historie: /proclog
			response = await fetch(`http://${ip}/proclog`).catch(() => null);

			// 3. Fallback-Download für Zwischenversionen: /procdta
			if (!response || !response.ok) {
				writeLog('/proclog not found, trying fallback path /procdta...', 'debug');
				response = await fetch(`http://${ip}/procdta`).catch(() => null);
			}

			// 4. Fallback-Download: Alter Webclient-Ordner für ganz alte V1/V2 Anlagen
			if (!response || !response.ok) {
				writeLog('/procdta not found, trying fallback path /Webclient/procdta...', 'debug');
				response = await fetch(`http://${ip}/Webclient/procdta`).catch(() => null);
			}

			if (!response || !response.ok) {
				throw new Error(`HTTP Error - File not found on heat pump webserver.`);
			}

			// Puffer der Fallback-Datei einlesen
			arrayBuffer = await response.arrayBuffer();
		}

		const buffer = Buffer.from(arrayBuffer);

		// 5. Speicherpfad aus Config holen und formatieren
		const basePath = config.autoBackupPath
			? String(config.autoBackupPath)
					.replace(/^\/+|\/+$/g, '')
					.trim()
			: '';

		// 6. Dateinamen mit aktuellem Zeitstempel generieren (z.B. dta_live_2026-09-20T07-30-00.dta)
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const fileName = `dta_live_${timestamp}.dta`;

		const fullPath = basePath !== '' ? `${basePath}/${fileName}` : fileName;

		// 7. Im ioBroker-Dateisystem speichern (Sichtbar im Tab "Dateien")
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

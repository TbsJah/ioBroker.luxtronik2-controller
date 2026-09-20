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
		writeLog('Triggering live DTA flush on heat pump (/NewProc)...', 'debug');

		// 1. Zwingt die Luxtronik, den aktuellen Arbeitsspeicher in die Datei zu schreiben
		// Fehler werden hier ignoriert, da manche Firmwares keinen direkten Content zurückliefern
		await fetch(`http://${ip}/NewProc`).catch(() => {});

		// Der Anlage kurz Zeit geben, die Datei auf den internen Speicher zu schreiben
		await new Promise(resolve => setTimeout(resolve, 3000));

		writeLog('Downloading latest DTA file...', 'debug');

		// 2. Die frisch geschriebene Datei herunterladen
		const response = await fetch(`http://${ip}/Webclient/procdta`);

		if (!response.ok) {
			throw new Error(`HTTP Error ${response.status} - ${response.statusText}`);
		}

		// Daten als Binärpuffer einlesen
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// 3. Dateinamen mit aktuellem Zeitstempel generieren (z.B. dta_live_2026-09-20T07-30-00.dta)
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const fileName = `backup/dta_live_${timestamp}.dta`;

		// 4. Im ioBroker-Dateisystem speichern (Sichtbar im Tab "Dateien" unter luxtronik2-controller.0)
		await adapter.writeFileAsync(adapter.namespace, fileName, buffer);

		writeLog(`DTA Backup successfully saved as ${fileName} in ioBroker files.`, 'info');
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

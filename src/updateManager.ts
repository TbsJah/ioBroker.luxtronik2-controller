import * as https from 'node:https';
import { writeLog } from './logger';
import { sendTelegramNotification } from './notificationManager';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';

const DOWNLOAD_PORTAL_URL = 'https://www.heatpump24.com/software/fetchSoftware.php?softwareID=';
const CHANGELOG_URL = 'https://www.heatpump24.com/software/fetchSoftware.php?changeLog=';

// Agent um unvollständige Zertifikatsketten des AIT-Portals zu ignorieren
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Ermittelt die Download-ID für das Portal anhand der aktuellen Firmware.
 *
 * @param installedVersion Die aktuell auf der Wärmepumpe installierte Firmware-Version (z. B. "V2.88.1").
 * @returns Die ID für das Download-Portal oder null, falls das Format unbekannt ist.
 */
function getFirmwareDownloadId(installedVersion: string): number | null {
	if (!installedVersion) {
		return null;
	}
	if (installedVersion.startsWith('V1.')) {
		return 0;
	}
	if (installedVersion.startsWith('V2.')) {
		return 1;
	}
	if (installedVersion.startsWith('V3.')) {
		return 2;
	}
	if (installedVersion.startsWith('V4.')) {
		return 3;
	}
	if (installedVersion.startsWith('F1.')) {
		return 4;
	}
	if (installedVersion.startsWith('WWB1.')) {
		return 5;
	}
	if (installedVersion.startsWith('smo')) {
		return 6;
	}
	return null;
}

/**
 * Vergleicht zwei Versions-Strings (z. B. "V2.88.1" und "V2.88.2").
 *
 * @param availableVersion Die verfügbare Version aus dem Download-Portal.
 * @param currentVersion Die aktuell installierte Version der Wärmepumpe.
 * @returns True, wenn die availableVersion neuer ist als die currentVersion.
 */
function isVersionNewer(availableVersion: string, currentVersion: string): boolean {
	const normalize = (v: string): string => v.replace(/^[^\d]+/, ''); // "V2.88.1" -> "2.88.1"
	const v1Parts = normalize(availableVersion).split('.').map(Number);
	const v2Parts = normalize(currentVersion).split('.').map(Number);

	for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
		const part1 = v1Parts[i] || 0;
		const part2 = v2Parts[i] || 0;
		if (part1 > part2) {
			return true;
		}
		if (part1 < part2) {
			return false;
		}
	}
	return false;
}

/**
 * Ruft eine URL per HTTP GET ab (ignoriert SSL-Fehler des AIT-Portals).
 *
 * @param url Die aufzurufende URL.
 * @param abortAfterHeaders Ob die Verbindung nach Empfang der Header direkt abgebrochen werden soll.
 * @returns Ein Promise mit den Headern und dem Body der Antwort.
 */
function fetchUrl(url: string, abortAfterHeaders = false): Promise<{ headers: any; data: string }> {
	return new Promise((resolve, reject) => {
		const options = {
			method: 'GET',
			agent: httpsAgent,
			timeout: 120000, // Auf 120 Sekunden erhöht wegen langsamem AIT-Server
			headers: {
				'User-Agent': 'ioBroker.luxtronik2-controller',
				Accept: '*/*',
			},
		};

		const req = https.request(url, options, res => {
			if (abortAfterHeaders) {
				resolve({ headers: res.headers, data: '' });
				req.destroy();
				return;
			}

			let body = '';
			res.on('data', chunk => (body += chunk));
			res.on('end', () => resolve({ headers: res.headers, data: body }));
		});
		req.on('error', err => {
			if (err.message !== 'socket hang up') {
				reject(err);
			}
		});
		req.on('timeout', () => req.destroy(new Error('Timeout')));
		req.end();
	});
}

/**
 * Führt die Firmware-Update-Prüfung durch.
 *
 * @param adapter Die aktuelle Instanz des ioBroker Adapters.
 * @returns Ein Promise, das nach Abschluss der Prüfung aufgelöst wird.
 */
export async function checkFirmwareUpdate(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config as Record<string, any>;

	if (config.update_check_active !== true) {
		return;
	}

	try {
		const firmwareState = await adapter.getStateAsync(getDpPath('firmware'));
		const currentFirmware = firmwareState && typeof firmwareState.val === 'string' ? firmwareState.val : null;

		if (!currentFirmware) {
			writeLog('Update-Prüfung abgebrochen: Aktuelle Firmware-Version ist noch nicht bekannt.', 'debug');
			return;
		}

		const downloadId = getFirmwareDownloadId(currentFirmware);
		if (downloadId === null) {
			writeLog(`Update-Prüfung abgebrochen: Unbekannter Firmware-Typ (${currentFirmware}).`, 'debug');
			return;
		}

		// 1. Dateinamen aus den Headern der Download-URL abfragen
		const response = await fetchUrl(`${DOWNLOAD_PORTAL_URL}${downloadId}`, true);
		const contentDisposition = response.headers['content-disposition'] || '';

		const filenameMatch = contentDisposition.match(/filename=(.+)/);
		if (!filenameMatch) {
			writeLog('Update-Prüfung: Konnte keinen Dateinamen im Download-Portal finden.', 'debug');
			return;
		}

		const filename = filenameMatch[1].replace(/"/g, '');
		const versionMatch = filename.match(/[BV]\d+\.\d+\.\d+(?:-\d+)?/);
		const availableVersion = versionMatch ? versionMatch[0].split('-')[0] : null;

		if (!availableVersion) {
			return;
		}

		await adapter.setState(getDpPath('firmware_available'), { val: availableVersion, ack: true });

		const isNewer = isVersionNewer(availableVersion, currentFirmware);
		const updateStateDp = getDpPath('firmware_update_available');
		const oldUpdateState = await adapter.getStateAsync(updateStateDp);
		const wasAlreadyNotified = oldUpdateState?.val === true;

		await adapter.setState(updateStateDp, { val: isNewer, ack: true });

		if (isNewer) {
			// 2. Changelog abfragen
			const clResponse = await fetchUrl(`${CHANGELOG_URL}${downloadId}`, false);
			if (clResponse.data) {
				await adapter.setState(getDpPath('firmware_changelog'), { val: clResponse.data, ack: true });
			}

			writeLog(`Neues Firmware-Update verfügbar: ${availableVersion} (Aktuell: ${currentFirmware})`, 'info');

			if (config.update_check_telegram === true) {
				if (!wasAlreadyNotified) {
					writeLog('Sende Telegram-Benachrichtigung über neues Firmware-Update...', 'info');
					sendTelegramNotification(
						adapter,
						`Achtung: Für die Wärmepumpe steht ein neues Firmware-Update bereit!\n\nAktuell: ${currentFirmware}\nNeu: ${availableVersion}\n\nBitte das Changelog prüfen und das Update manuell über den USB-Stick installieren.`,
					);
				} else {
					writeLog('Telegram-Benachrichtigung übersprungen (für diese Version bereits erfolgt).', 'debug');
				}
			} else {
				writeLog('Telegram-Benachrichtigung in der Konfiguration deaktiviert.', 'debug');
			}
		} else {
			writeLog(`Firmware ist auf dem neuesten Stand (${currentFirmware}).`, 'debug');
		}
	} catch (err: any) {
		writeLog(`Fehler bei der Firmware-Update-Prüfung: ${err.message}`, 'error');
	}
}

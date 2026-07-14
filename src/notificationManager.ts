import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';

// =========================================================
// INTERFACES & TYPEN
// =========================================================

/**
 * Struktur eines Fehlerspeichereintrags der Luxtronik Wärmepumpe.
 */
export interface ErrorHistoryEntry {
	/** Der Fehlercode der Wärmepumpe (z.B. 704) */
	code: number;
	/** Die Klartextbeschreibung des Fehlers */
	beschreibung: string;
	/** Das formatierte Datum (de-DE) */
	datum: string;
	/** Der rohe UNIX-Timestamp des Fehlers */
	timestamp?: number;
}

/**
 * Erweiterte Schnittstelle für den ioBroker-Adapter zur Typsicherheit interner Attribute.
 */
export interface ExtendedAdapter extends AdapterInstance {
	/** Die Adapter-Konfiguration aus der io-package.json kombiniert mit dynamischen Werten */
	config: ioBroker.AdapterConfig & Record<string, any>;
	/** Speichert den Timestamp des zuletzt gemeldeten Fehlers, um doppelte Alarme zu vermeiden */
	lastKnownErrorTimestamp?: number | null;
}

// =========================================================
// HILFSFUNKTIONEN
// =========================================================

/**
 * Parst einen JSON-String typsicher und fängt Fehler lautlos ab.
 *
 * @param value Der zu parsende JSON-String.
 * @returns Das geparste Objekt im angegebenen Typ T oder null, falls das Parsen fehlschlägt.
 */
function safeParse<T>(value: string): T | null {
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

/**
 * Zentrale Funktion zum Versenden von Benachrichtigungen über alle konfigurierten Kanäle (Telegram & ioBroker-Glocke).
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param message Die zu versendende Nachricht als Markdown-formatierter String.
 * @returns Ein Array mit den Namen der erfolgreich genutzten Kommunikationskanäle.
 */
async function sendNotification(adapter: ExtendedAdapter, message: string): Promise<string[]> {
	const config = adapter.config;
	const successMessages: string[] = [];

	// 1. ioBroker-Glocke (Notification Manager)
	if (config.notification_bell === true) {
		if (typeof adapter.registerNotification === 'function') {
			await adapter.registerNotification('luxtronik2-controller', 'lwpError', message);
			writeLog('Benachrichtigung an ioBroker-Glocke gesendet.', 'info');
			successMessages.push('Glocke');
		} else {
			writeLog(`🚨 ioBroker-Glocke nicht verfügbar. Nachricht: ${message}`, 'warn');
		}
	}

	// 2. Telegram
	const telegramInstance = config.telegram_instance; // Wert sicher zwischenspeichern
	const isTelegramActive =
		config.telegram_enabled === true &&
		typeof telegramInstance === 'string' && // TypeScript Typen-Prüfung!
		telegramInstance !== 'none';

	if (isTelegramActive) {
		const sendObj: Record<string, any> = { text: message };
		const receiver = config.telegram_receiver?.trim();

		if (receiver) {
			if (/^-?\d+$/.test(receiver)) {
				sendObj.chatId = Number(receiver);
			} else {
				sendObj.user = receiver;
			}
		}

		// Jetzt weiß TS absolut sicher, dass telegramInstance ein String ist!
		adapter.sendTo(telegramInstance, 'send', sendObj);
		writeLog(`Telegram-Nachricht gesendet an ${telegramInstance}`, 'info');
		successMessages.push('Telegram');
	}

	return successMessages;
}

/**
 * Rückwärtskompatibler Wrapper, falls die main.ts direkt Telegram-Nachrichten verschickt.
 * Leitet die Anfrage an die neue, universelle Benachrichtigungsfunktion weiter.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param message Die zu versendende Nachricht.
 */
export function sendTelegramNotification(adapter: ExtendedAdapter, message: string): void {
	// void signalisiert dem Linter, dass wir das Promise absichtlich nicht abwarten
	void sendNotification(adapter, message);
}

// =========================================================
// TEST-BUTTON AUS DER OBERFLÄCHE BEHANDELN
// =========================================================

/**
 * Behandelt eingehende Test-Nachrichten aus der ioBroker-Admin Oberfläche (Test-Button).
 * Sammelt die Fehlerhistorie und versendet einen Test-Alarm.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param obj Das empfangene ioBroker-Nachrichtenobjekt inkl. Callback.
 */
export async function handleTestMessage(adapter: ExtendedAdapter, obj: ioBroker.Message): Promise<void> {
	try {
		writeLog('Test-Button empfangen!', 'info');
		const config = adapter.config;

		const isTelegramActive =
			config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== 'none';
		const isIoBrokerNotifyActive = config.notification_bell === true;

		// Abbruch, wenn kein Kanal konfiguriert ist
		if (!isTelegramActive && !isIoBrokerNotifyActive) {
			if (obj.callback) {
				adapter.sendTo(
					obj.from,
					obj.command,
					{
						error: 'Fehler: Weder Telegram noch Glocke sind aktiv gespeichert! Bitte erst SPEICHERN klicken.',
					},
					obj.callback,
				);
			}
			return;
		}

		const errorPath = getDpPath('Fehlerspeicher');
		const lastErrorState = errorPath ? await adapter.getStateAsync(errorPath) : null;
		let msg = '';

		// Historie auslesen und formatieren
		if (lastErrorState && typeof lastErrorState.val === 'string') {
			const errorList = safeParse<ErrorHistoryEntry[]>(lastErrorState.val);

			if (errorList && errorList.length > 0) {
				const newestError = errorList[0];
				msg = `🚨 *Test-Alarm: Fehlerspeicher*\n\nAktuellster Fehler:\nCode: ${newestError.code}\nFehler: ${newestError.beschreibung}\nDatum: ${newestError.datum}\n\n`;

				if (errorList.length > 1) {
					const history = errorList
						.slice(1)
						.map(e => `Datum: ${e.datum}\nCode: ${e.code}\nFehler: ${e.beschreibung}`)
						.join('\n\n');
					msg += `Historie:\n${history}`;
				}
			}
		}

		// Fallback, falls der Fehlerspeicher komplett leer ist
		if (msg === '') {
			msg =
				'✅ *Erfolgreicher Test*\n\nDies ist eine generierte Test-Nachricht. Die Kommunikation zu Telegram und ioBroker funktioniert einwandfrei! (Es liegen aktuell keine echten Heizungsfehler vor).';
		}

		// Zentrale Benachrichtigung auslösen
		const successMessages = await sendNotification(adapter, msg);

		// Ergebnis an die UI zurückmelden
		if (obj.callback) {
			adapter.sendTo(
				obj.from,
				obj.command,
				{ result: `Erfolgreich ausgelöst: ${successMessages.join(' & ')}` },
				obj.callback,
			);
		}
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Test-Button: ${errorMessage}`, 'error');
		if (obj.callback) {
			adapter.sendTo(obj.from, obj.command, { error: `Skriptfehler: ${errorMessage}` }, obj.callback);
		}
	}
}

// =========================================================
// INTELLIGENTER FEHLER-FILTER UND ALARM
// =========================================================

/**
 * Überprüft Änderungen im Fehlerspeicher, filtert bekannte Fehler heraus und
 * löst bei neu aufgetretenen, echten Wärmepumpen-Fehlern einen Alarm aus.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param oldFehlerVal Der vorherige Zustand des Fehlerspeichers als JSON-String.
 * @param newFehlerVal Der neue Zustand des Fehlerspeichers als JSON-String.
 */
export async function checkAndSendErrorNotifications(
	adapter: ExtendedAdapter,
	oldFehlerVal: string | undefined,
	newFehlerVal: string | undefined,
): Promise<void> {
	// Guard Clause: Wenn sich nichts geändert hat oder der Wert leer ist, direkt abbrechen
	if (!newFehlerVal || newFehlerVal === oldFehlerVal) {
		return;
	}

	const newList = safeParse<ErrorHistoryEntry[]>(newFehlerVal);
	if (!newList || newList.length === 0) {
		return;
	}

	const newestError = newList[0];
	const currentErrorTimestamp = newestError.timestamp;
	const currentErrorCode = newestError.code;

	// Guard Clause: Ungültiger Timestamp oder Dummy-Fehlercode (0)
	if (currentErrorTimestamp === undefined || currentErrorCode === 0) {
		return;
	}

	// DER FIX: Stille Initialisierung beim Adapter-Neustart!
	// Wenn der Adapter gerade frisch gebootet hat, merken wir uns den letzten Fehler stumm und brechen ab.
	if (adapter.lastKnownErrorTimestamp === undefined || adapter.lastKnownErrorTimestamp === null) {
		adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
		writeLog('Fehler-Überwachung initialisiert. Letzter bekannter Fehler-Timestamp stumm gesetzt.', 'debug');
		return;
	}

	// Guard Clause: Fehler ist älter oder gleich dem zuletzt gemeldeten (Schutz vor Endlosschleifen)
	if (currentErrorTimestamp <= adapter.lastKnownErrorTimestamp) {
		return;
	}

	// Timestamp aktualisieren, um mehrfache Benachrichtigungen für denselben Fehler zu verhindern
	adapter.lastKnownErrorTimestamp = currentErrorTimestamp;

	const msg = `🚨 *Störung Wärmepumpe!*\nEin Fehler an der Wärmepumpe wurde registriert:\n\n*Code:* ${currentErrorCode}\n*Fehler:* ${newestError.beschreibung}\n*Datum:* ${newestError.datum}`;

	await sendNotification(adapter, msg);
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';

// =========================================================
// TYPES & INTERFACES
// =========================================================

/**
 * Structure of an entry in the error or outage history.
 */
export interface ErrorHistoryEntry {
	/** The code of the registered error or outage */
	code: number;
	/** The clear text description of the code */
	beschreibung: string;
	/** The formatted date of occurrence */
	datum: string;
	/** The raw Unix timestamp */
	timestamp?: number;
}

/**
 * Extended adapter interface to provide type safety for dynamic properties and methods.
 */
export interface ExtendedAdapter extends AdapterInstance {
	/** The adapter configuration from io-package.json combined with dynamic values */
	config: ioBroker.AdapterConfig & Record<string, any>;
	/** Stores the timestamp of the last reported error to prevent duplicate alerts */
	lastKnownErrorTimestamp?: number | null;
	/** Stores the timestamp of the last reported outage to prevent duplicate alerts */
	lastKnownOutageTimestamp?: number | null;
	/** Timestamp of the last sent flow warning (Spam protection cooldown) */
	lastFlowNotificationTime?: number;
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Parses a JSON string in a type-safe manner and silently handles parsing errors.
 *
 * @param value - The JSON string to parse.
 * @returns The parsed object of type T, or null if parsing fails.
 */
function safeParse<T>(value: string): T | null {
	try {
		return JSON.parse(value) as T;
	} catch {
		void 0;
		return null;
	}
}

/**
 * Sends a notification message via the configured channels (ioBroker Notification Center & Telegram).
 *
 * @param adapter - The extended adapter instance.
 * @param message - The message text to send.
 * @returns A promise resolving to an array of successful delivery channel names.
 */
async function sendNotification(adapter: ExtendedAdapter, message: string): Promise<string[]> {
	const config = adapter.config;
	const successMessages: string[] = [];

	if (config.notification_bell === true) {
		if (typeof adapter.registerNotification === 'function') {
			await adapter.registerNotification('luxtronik2-controller', 'lwpError', message);
			writeLog('Notification sent to ioBroker notification center.', 'info');
			successMessages.push('Notification Center');
		} else {
			writeLog(`🚨 ioBroker notification center unavailable. Message: ${message}`, 'warn');
		}
	}

	const telegramInstance = config.telegram_instance;
	const isTelegramActive =
		config.telegram_enabled === true && typeof telegramInstance === 'string' && telegramInstance !== 'none';

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

		adapter.sendTo(telegramInstance, 'send', sendObj);
		writeLog(`Telegram message sent to ${telegramInstance}`, 'info');
		successMessages.push('Telegram');
	}

	return successMessages;
}

// =========================================================
// MAIN EXPORTS
// =========================================================

/**
 * Backwards-compatible wrapper to send Telegram notifications explicitly.
 * Forwards the request to the universal notification function.
 *
 * @param adapter - The extended adapter instance.
 * @param message - The message text to send.
 */
export function sendTelegramNotification(adapter: ExtendedAdapter, message: string): void {
	void sendNotification(adapter, message);
}

/**
 * Handles the 'testTelegram' message from the ioBroker Admin UI.
 *
 * @param adapter - The extended adapter instance.
 * @param obj - The standardized ioBroker message structure.
 * @returns A promise resolving when the test message has been processed.
 */
export async function handleTestMessage(adapter: ExtendedAdapter, obj: ioBroker.Message): Promise<void> {
	try {
		writeLog('Test button triggered!', 'info');
		const config = adapter.config;

		const isTelegramActive =
			config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== 'none';
		const isIoBrokerNotifyActive = config.notification_bell === true;

		if (!isTelegramActive && !isIoBrokerNotifyActive) {
			if (obj.callback) {
				adapter.sendTo(
					obj.from,
					obj.command,
					{
						error: 'Error: Neither Telegram nor Notification Center are active! Please save settings first.',
					},
					obj.callback,
				);
			}
			return;
		}

		const errorPath = getDpPath('Fehlerspeicher');
		const lastErrorState = errorPath ? await adapter.getStateAsync(errorPath) : null;
		let msg = '';

		if (lastErrorState && typeof lastErrorState.val === 'string') {
			const errorList = safeParse<ErrorHistoryEntry[]>(lastErrorState.val);

			if (errorList && errorList.length > 0) {
				const newestError = errorList[0];
				msg = `🚨 *Test Alarm: Error Log*\n\nMost recent error:\nCode: ${newestError.code}\nError: ${newestError.beschreibung}\nDate: ${newestError.datum}\n\n`;

				if (errorList.length > 1) {
					const history = errorList
						.slice(1)
						.map(e => `Date: ${e.datum}\nCode: ${e.code}\nError: ${e.beschreibung}`)
						.join('\n\n');
					msg += `History:\n${history}`;
				}
			}
		}

		if (msg === '') {
			msg =
				'✅ *Successful Test*\n\nThis is a generated test message. Communication via Telegram and ioBroker works perfectly! (There are currently no real heat pump errors).';
		}

		const successMessages = await sendNotification(adapter, msg);

		if (obj.callback) {
			adapter.sendTo(
				obj.from,
				obj.command,
				{ result: `Successfully triggered: ${successMessages.join(' & ')}` },
				obj.callback,
			);
		}
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		writeLog(`Error processing test button: ${errorMessage}`, 'error');
		if (obj.callback) {
			adapter.sendTo(obj.from, obj.command, { error: `Script error: ${errorMessage}` }, obj.callback);
		}
	}
}

/**
 * Checks for changes in the error log, filters out known errors,
 * and triggers an alarm for new, genuine heat pump errors.
 *
 * @param adapter - The extended adapter instance.
 * @param oldFehlerVal - The previous state of the error memory as a JSON string.
 * @param newFehlerVal - The new state of the error memory as a JSON string.
 * @returns A promise resolving when the check finishes.
 */
export async function checkAndSendErrorNotifications(
	adapter: ExtendedAdapter,
	oldFehlerVal: string | undefined,
	newFehlerVal: string | undefined,
): Promise<void> {
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

	if (currentErrorTimestamp === undefined || currentErrorCode === 0) {
		return;
	}

	if (adapter.lastKnownErrorTimestamp === undefined || adapter.lastKnownErrorTimestamp === null) {
		adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
		writeLog('Error monitoring initialized. Last known error timestamp set silently.', 'debug');
		return;
	}

	if (currentErrorTimestamp <= adapter.lastKnownErrorTimestamp) {
		return;
	}

	adapter.lastKnownErrorTimestamp = currentErrorTimestamp;

	const msg = `🚨 *Heat Pump Malfunction!*\nAn error was registered on the heat pump:\n\n*Code:* ${currentErrorCode}\n*Error:* ${newestError.beschreibung}\n*Date:* ${newestError.datum}`;

	await sendNotification(adapter, msg);
}

/**
 * Überwacht den Abschalt-Speicher gezielt auf kritische Durchfluss-Probleme,
 * die von der Wärmepumpe nicht sofort als "Fehler" gewertet werden.
 *
 * @param adapter - Die erweiterte Adapter-Instanz.
 * @param oldOutageVal - Der vorherige State der Abschaltungen (JSON).
 * @param newOutageVal - Der neue State der Abschaltungen (JSON).
 */
export async function checkAndSendOutageNotifications(
	adapter: ExtendedAdapter,
	oldOutageVal: string | undefined,
	newOutageVal: string | undefined,
): Promise<void> {
	if (!newOutageVal || newOutageVal === oldOutageVal) {
		return;
	}

	const newList = safeParse<ErrorHistoryEntry[]>(newOutageVal);
	if (!newList || newList.length === 0) {
		return;
	}

	const newestOutage = newList[0];
	const currentOutageTimestamp = newestOutage.timestamp;
	const currentOutageCode = newestOutage.code;

	if (currentOutageTimestamp === undefined || currentOutageCode === 0) {
		return;
	}

	// Wir filtern gezielt nach Durchfluss / Flow Problemen
	const descLower = newestOutage.beschreibung.toLowerCase();
	const isFlowIssue = descLower.includes('durchfluss') || descLower.includes('flow');

	if (!isFlowIssue) {
		return;
	}

	if (adapter.lastKnownOutageTimestamp === undefined || adapter.lastKnownOutageTimestamp === null) {
		adapter.lastKnownOutageTimestamp = currentOutageTimestamp;
		writeLog('Outage monitoring initialized. Last known outage timestamp set silently.', 'debug');
		return;
	}

	if (currentOutageTimestamp <= adapter.lastKnownOutageTimestamp) {
		return; // Kein neuer Eintrag
	}

	// Spam-Schutz: Max 1 Nachricht pro Stunde für denselben Abschalt-Typ
	const now = Date.now();
	if (adapter.lastFlowNotificationTime && now - adapter.lastFlowNotificationTime < 60 * 60 * 1000) {
		adapter.lastKnownOutageTimestamp = currentOutageTimestamp; // Zeitstempel trotzdem merken
		writeLog('Flow outage registered, but notification skipped due to 60-minute cooldown spam protection.', 'info');
		return;
	}

	adapter.lastKnownOutageTimestamp = currentOutageTimestamp;
	adapter.lastFlowNotificationTime = now;

	const msg = `⚠️ *Warnung: Durchfluss-Problem!*\nDie Wärmepumpe hat sich wegen geringem Durchfluss abgeschaltet:\n\n*Code:* ${currentOutageCode}\n*Grund:* ${newestOutage.beschreibung}\n*Datum:* ${newestOutage.datum}\n\n_Hinweis: Die Anlage versucht meist einen Neustart. Bitte Heizkreis-Druck und Stellventile prüfen._`;

	await sendNotification(adapter, msg);
}

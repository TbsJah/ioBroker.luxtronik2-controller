import type { AdapterInstance } from '@iobroker/adapter-core';

// Speichert die Adapter-Instanz global für diese Laufzeit
let adapter: AdapterInstance | null = null;
// Speichert den Status der Debug-Checkbox aus ioBroker
let customDebugActive = false;

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'silly';

/**
 * Initialisiert den Logger einmalig beim Start des Adapters.
 *
 * @param adapterInstance Die Adapter-Instanz, die für das Logging verwendet wird.
 */
export function initLogger(adapterInstance: AdapterInstance): void {
	adapter = adapterInstance;
}

/**
 * Aktiviert oder deaktiviert die benutzerdefinierten Debug-Logs via Datenpunkt.
 *
 * @param active Gibt an, ob benutzerdefinierte Debug-Logs aktiviert werden sollen.
 */
export function setCustomDebug(active: boolean): void {
	customDebugActive = active;
}

/**
 * Globale Funktion zum Schreiben von Logs.
 * Aus jedem TS-File aufrufbar!
 *
 * @param text Der Log-Text
 * @param level Das Loglevel (Standard: "info")
 */
export function writeLog(text: string, level: LogLevel = 'info'): void {
	if (!adapter) {
		// Fallback, falls der Logger (noch) nicht initialisiert wurde
		console.log(`[${level.toUpperCase()}] ${text}`);
		return;
	}

	// Wenn es ein Debug-Log ist, aber der manuelle Schalter aus ist, ignorieren wir es
	if (level === 'debug' && !customDebugActive) {
		return;
	}

	// Ruft dynamisch die passende ioBroker-Log-Funktion auf
	if (adapter.log && typeof adapter.log[level] === 'function') {
		adapter.log[level](text);
	} else {
		adapter.log.info(`[${level.toUpperCase()}] ${text}`);
	}
}

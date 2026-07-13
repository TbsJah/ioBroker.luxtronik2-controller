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
		console.log(`[${level.toUpperCase()}] ${text}`);
		return;
	}

	// Wenn es ein Debug-Log ist, aber der manuelle Schalter aus ist -> ignorieren
	if (level === 'debug' && !customDebugActive) {
		return;
	}

	// DER TRICK: Wenn der Schalter aktiv ist, machen wir aus 'debug' ein 'info',
	// damit es im ioBroker für dich sofort lesbar in normaler Schrift auftaucht!
	const targetLevel = level === 'debug' && customDebugActive ? 'info' : level;

	if (adapter.log && typeof adapter.log[targetLevel] === 'function') {
		adapter.log[targetLevel](text);
	}
}

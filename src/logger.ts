import type { AdapterInstance } from '@iobroker/adapter-core';

// =========================================================
// TYPEN & INTERNER ZUSTAND
// =========================================================

/**
 * Leitet die verfügbaren Log-Level automatisch aus der ioBroker Adapter-API ab.
 * (Enthält info, warn, error, debug, silly)
 */
export type LogLevel = keyof AdapterInstance['log'];

/** Die globale ioBroker Adapter-Instanz für das Logging */
let adapter: AdapterInstance | null = null;
/** Bestimmt, ob detaillierte Debug-Ausgaben erzwungen werden sollen */
let customDebugActive = false;

// =========================================================
// INITIALISIERUNG
// =========================================================

/**
 * Initialisiert den Logger mit der aktuellen ioBroker Adapter-Instanz.
 * MUSS beim Start des Adapters zwingend aufgerufen werden.
 *
 * @param adapterInstance Die Instanz des ioBroker-Adapters
 */
export function initLogger(adapterInstance: AdapterInstance): void {
	adapter = adapterInstance;
}

/**
 * Aktiviert oder deaktiviert den benutzerdefinierten Debug-Modus.
 *
 * @param active True, wenn Debug-Meldungen im ioBroker Log angezeigt werden sollen
 */
export function setCustomDebug(active: boolean): void {
	customDebugActive = active;
}

// =========================================================
// LOG-FUNKTION
// =========================================================

/**
 * Schreibt eine formatierte Log-Nachricht in das ioBroker Log.
 *
 * @param text Der zu protokollierende Nachrichtentext
 * @param level Das ioBroker Log-Level (Standard: 'info')
 */
export function writeLog(text: string, level: LogLevel = 'info'): void {
	// Abbruch, falls der Logger (noch) nicht initialisiert wurde
	if (!adapter) {
		return;
	}

	// Wenn es eine Debug-Meldung ist, der Modus aber aus ist, lautlos abbrechen
	if (level === 'debug' && !customDebugActive) {
		return;
	}

	// Debug-Meldungen werden bei aktivierter Option als "info"
	// ausgegeben, damit sie im Standard-Log des Nutzers direkt sichtbar sind.
	const targetLevel: LogLevel = level === 'debug' ? 'info' : level;

	// Moderner TypeScript Aufruf: Führt die Log-Funktion nur aus, wenn sie existiert
	(adapter.log[targetLevel] as (msg: string) => void)?.(text);
}

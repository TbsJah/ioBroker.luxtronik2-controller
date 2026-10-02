import type { AdapterInstance } from '@iobroker/adapter-core';
import type { Job } from 'node-schedule';

/**
 * Zentrales Interface für den Luxtronik2 ioBroker Adapter.
 * Vereint die Standard-Adapter-Eigenschaften mit allen spezifischen
 * Caches, Flags und Methoden, die über die Sub-Module geteilt werden.
 */
export interface LuxtronikAdapter extends AdapterInstance {
	/** Adapter-Konfiguration aus der Benutzeroberfläche kombiniert mit dynamischen Werten */
	config: ioBroker.AdapterConfig & Record<string, any>;

	/** Set aller während der Laufzeit erstellten oder verifizierten Datenpunkt-IDs */
	createdStates: Set<string>;

	/** ioBroker Timeout für die Zirkulationspumpe */
	zipTimer?: ioBroker.Timeout;

	/** Cron-Job für das DTA-Backup */
	backupJob?: Job | null;

	/** Zwischengespeicherte Original-Einstellungen der Zirkulationspumpe */
	originalZipConfig?: Record<string, any> | null;

	/** Cache für die Sichtbarkeiten (Visibilities, CMD 3005) */
	currentVisibilities?: number[];

	/** Cache der aktuellen Roh-Parameter (CMD 3003) */
	currentRawParams?: number[];

	/** Firmware-Version der Wärmepumpe */
	systemFirmware?: string;

	/** Zeitstempel des zuletzt bekannten Fehlers (Spam-Schutz) */
	lastKnownErrorTimestamp?: number | null;

	/** Zeitstempel der zuletzt bekannten Abschaltung (Spam-Schutz) */
	lastKnownOutageTimestamp?: number | null;

	/** Zeitstempel der letzten Durchfluss-Warnung */
	lastFlowNotificationTime?: number;

	/** Gibt an, ob das erweiterte Debug-Logging aktiv ist */
	isDebugLogActive?: boolean;

	/** Sperr-Flag: Zeigt an, dass aktuell ein Lesezyklus läuft */
	updateRunning: boolean;

	/** Sperr-Flag: Zeigt an, dass aktuell Schreibbefehle gesendet werden */
	isWriting: boolean;

	/** Warteschlange für auszuführende Schreibbefehle */
	writeQueue: (() => Promise<void>)[];

	/** Anzahl der Flash-Schreibvorgänge am heutigen Tag */
	writeCyclesToday: number;

	/** Gesamte Anzahl der Flash-Schreibvorgänge seit Zähler-Start */
	writeCyclesTotal: number;

	/**
	 * Synchronisiert einen Konfigurationswert sicher mit der Luxtronik.
	 *
	 * @param key Der Schlüssel aus dem State-Mapping
	 * @param value Der zu schreibende Wert
	 */
	syncConfigValue: (key: string, value: any) => Promise<void>;

	/**
	 * Aktualisiert einen ioBroker-Datenpunkt nur, wenn sich der Wert geändert hat.
	 *
	 * @param dpPath Der vollständige ioBroker-Pfad
	 * @param value Der neue Wert
	 * @param ack Bestätigungs-Flag (Standard: false)
	 */
	setOwnStateIfDifferent: (dpPath: string, value: any, ack?: boolean) => Promise<void>;
}

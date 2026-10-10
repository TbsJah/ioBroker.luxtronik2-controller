import { ACTIONS_MAPPING } from './mapping/actions';
import { INFO_MAPPING } from './mapping/info';
import { SETTINGS_MAPPING } from './mapping/settings';
import { TABLESINFO_MAPPING } from './mapping/tablesInfo';
import { TABLESSETTINGS_MAPPING } from './mapping/tablesSettings';

/**
 * Definiert die Struktur für einen ioBroker-Datenpunkt.
 * Wird genutzt, um die Luxtronik-Werte dynamisch anzulegen.
 */
export interface StateDefinition {
	/** Name des Datenpunkts */
	name: string | { en: string; de?: string };
	/** ioBroker-Rolle des Datenpunkts */
	role: string;
	/** Datentyp des Datenpunkts */
	type: 'number' | 'string' | 'boolean' | 'json';
	/** Einheit des Wertes (optional) */
	unit?: string;
	/** Schreibzugriff erlaubt (optional) */
	write?: boolean;
	/** Verzeichnis */
	folder: string;
	/** Die ID, die luxtronik2 zum Schreiben/Lesen erwartet */
	luxWriteId?: string;
	/** Kennzeichnung für rein virtuelle/berechnete Datenpunkte */
	isVirtual?: boolean;
	/** Zeigt an, dass dieses Objekt vom System benötigt wird und nicht in der UI abwählbar ist */
	required?: boolean;
	/** Steuert die interne Formatierung von rohen Sekunden zu HH:MM:SS */
	isDurationFormat?: boolean;
	/** Optionaler Standardwert für den Datenpunkt */
	def?: any;
	/** Optionaler Minimalwert */
	min?: number;
	/** Optionaler Maximalwert */
	max?: number;
	/** Optionaler Umrechnungsfaktor */
	factor?: number;
	/** Optionales Mapping für numerische Werte zu Texten (unterstützt nun en/de i18n) */
	states?: Record<string, Record<number, string>> | Record<number, string>;
	/** Bestimmt explizit die exakte Datenquelle an der Luxtronik */
	dataSource?: 'raw_value' | 'raw_parameter' | 'value' | 'parameter' | 'additional';
	/** Optionaler Index aus Befehl 3005 (Visibilities), der steuert, ob dieser Datenpunkt sichtbar ist */
	visiIndex?: number;
}

/**
 * Mapping-Katalog für die Luxtronik-Werte.
 */
export const STATE_MAPPING: Record<string, StateDefinition> = {
	...INFO_MAPPING,
	...SETTINGS_MAPPING,
	...TABLESINFO_MAPPING,
	...TABLESSETTINGS_MAPPING,
	...ACTIONS_MAPPING,
};

// Runtime Injection für fehlende IDs
for (const key of Object.keys(STATE_MAPPING)) {
	if (!STATE_MAPPING[key].luxWriteId) {
		STATE_MAPPING[key].luxWriteId = key;
	}
}

/**
 * Hilfsfunktion: Generiert den vollständigen ioBroker-Pfad für einen Datenpunkt-Schlüssel.
 *
 * @param key Der Schlüssel des Datenpunkts im Mapping.
 * @returns Der generierte Pfad-String.
 */
export function getDpPath(key: keyof typeof STATE_MAPPING): string {
	const def = STATE_MAPPING[key];
	if (!def) {
		throw new Error(`Kritischer Fehler: Datenpunkt-Schlüssel '${key}' existiert nicht im Mapping!`);
	}
	return `${def.folder}.${key}`;
}

/**
 * Sucht die luxId basierend auf dem Namen/Key im Mapping.
 *
 * @param key Der Schlüssel des Datenpunkts im Mapping.
 * @returns Die luxWriteId als Zahl, oder -1 wenn nicht gefunden.
 */
export function getLuxIdByKey(key: string): number {
	const entry = STATE_MAPPING[key];
	if (entry && entry.luxWriteId) {
		return parseInt(entry.luxWriteId, 10);
	}
	return -1; // Nicht gefunden
}

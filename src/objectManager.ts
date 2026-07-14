import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { STATE_MAPPING } from './stateMapping';

// =========================================================
// INTERFACES & TYPEN (Ersetzt die unsauberen 'any' Typen)
// =========================================================

/**
 * Definition eines Standard-Datenpunkts im Adapter-Mapping.
 */
export interface StateDefinition {
	/** Der Anzeigename des Datenpunkts */
	name: string;
	/** Der Datentyp (number, string, boolean etc.) */
	type: ioBroker.CommonType | 'json';
	/** Die Rolle des Datenpunkts im ioBroker */
	role: string;
	/** Die Maßeinheit (z.B. °C, % oder s) */
	unit?: string;
	/** Ob der Datenpunkt lesbar ist */
	read?: boolean;
	/** Ob der Datenpunkt beschreibbar ist (Schaltfunktion) */
	write?: boolean;
	/** Der Minimalwert (nur bei Zahlen) */
	min?: number;
	/** Der Maximalwert (nur bei Zahlen) */
	max?: number;
	/** Der Standard-Startwert */
	def?: any;
	/** Werteliste/Übersetzungs-Map (z.B. {0: "Aus", 1: "An"}) */
	states?: Record<string, string>;
	/** Der Zielordner (z.B. "Informationen.00_Temperaturen") */
	folder: string;
	/** Die Register-ID für Schreibvorgänge */
	luxWriteId?: string | number;
	/** Ob dieser Datenpunkt immer angelegt werden muss (nicht abwählbar) */
	required?: boolean;
}

/**
 * Konfiguration eines benutzerdefinierten Datenpunkts aus den Admin-Einstellungen.
 */
export interface CustomStateConfig {
	/** Ob der Datenpunkt aktiv ist */
	active: boolean;
	/** Die Luxtronik Register-ID */
	luxId?: number;
	/** Der Name des Datenpunkts */
	name: string;
	/** Die Datenquelle ('parameter' oder 'value') */
	source: 'parameter' | 'value';
	/** Der Ziel-Datentyp */
	type: 'number' | 'boolean' | 'datetime' | 'string';
	/** Ein optionaler Multiplikations-Faktor */
	factor?: number | null;
	/** Eine optionale Maßeinheit */
	unit?: string;
}

/**
 * Erweiterte Schnittstelle für den ioBroker-Adapter zur Typsicherheit interner Attribute.
 */
export interface ExtendedAdapter extends AdapterInstance {
	/** Die Adapter-Konfiguration aus der io-package.json kombiniert mit dynamischen Werten */
	config: ioBroker.AdapterConfig & Record<string, any>;
	/** Set aller im aktuellen Durchlauf verarbeiteten States */
	createdStates: Set<string>;
}

// =========================================================
// ZENTRALE FILTER-LOGIK (Datengetrieben statt IF-Wüste)
// =========================================================

/**
 * Mapping-Tabelle zur Zuordnung von Datenpunkt-Präfixen zu Konfigurationsschlüsseln.
 */
const PREFIX_MAPPING: [string, string][] = [
	['HZ_MoSo_', 'sync_heatingOperationTimerTableWeek'],
	['HZ_MoFr_', 'sync_heatingOperationTimerTable52MonFri'],
	['HZ_SaSo_', 'sync_heatingOperationTimerTable52MonFri'],
	['HZ_Montag_', 'sync_heatingOperationTimerTableDayMonday'],
	['HZ_Dienstag_', 'sync_heatingOperationTimerTableDayTuesday'],
	['HZ_Mittwoch_', 'sync_heatingOperationTimerTableDayWednesday'],
	['HZ_Donnerstag_', 'sync_heatingOperationTimerTableDayThursday'],
	['HZ_Freitag_', 'sync_heatingOperationTimerTableDayFriday'],
	['HZ_Samstag_', 'sync_heatingOperationTimerTableDaySaturday'],
	['HZ_Sonntag_', 'sync_heatingOperationTimerTableDaySunday'],
	['WW_MoSo_', 'sync_hotWaterTableWeek'],
	['WW_MoFr_', 'sync_hotWaterTable52MonFri'],
	['WW_SaSo_', 'sync_hotWaterTable52MonFri'],
	['WW_Montag_', 'sync_hotWaterTableDayMonday'],
	['WW_Dienstag_', 'sync_hotWaterTableDayTuesday'],
	['WW_Mittwoch_', 'sync_hotWaterTableDayWednesday'],
	['WW_Donnerstag_', 'sync_hotWaterTableDayThursday'],
	['WW_Freitag_', 'sync_hotWaterTableDayFriday'],
	['WW_Samstag_', 'sync_hotWaterTableDaySaturday'],
	['WW_Sonntag_', 'sync_hotWaterTableDaySunday'],
	['Zirkulation_MoSo_', 'sync_hotWaterCircPumpTimerTableWeek'],
	['Zirkulation_MoFr_', 'sync_hotWaterCircPumpTimerTable52MonFri'],
	['Zirkulation_SaSo_', 'sync_hotWaterCircPumpTimerTable52MonFri'],
	['Zirkulation_Montag_', 'sync_hotWaterCircPumpTimerTableDayMonday'],
	['Zirkulation_Dienstag_', 'sync_hotWaterCircPumpTimerTableDayTuesday'],
	['Zirkulation_Mittwoch_', 'sync_hotWaterCircPumpTimerTableDayWednesday'],
	['Zirkulation_Donnerstag_', 'sync_hotWaterCircPumpTimerTableDayThursday'],
	['Zirkulation_Freitag_', 'sync_hotWaterCircPumpTimerTableDayFriday'],
	['Zirkulation_Samstag_', 'sync_hotWaterCircPumpTimerTableDaySaturday'],
	['Zirkulation_Sonntag_', 'sync_hotWaterCircPumpTimerTableDaySunday'],
];

/**
 * Prüft, ob ein bestimmter Datenpunkt basierend auf der Adapter-Konfiguration aktiv ist.
 *
 * @param key Der eindeutige Schlüssel des Datenpunkts.
 * @param definition Die strukturelle Definition des Datenpunkts.
 * @param config Die aktuellen Konfigurationseinstellungen des Adapters.
 * @returns True, wenn der Datenpunkt erstellt und synchronisiert werden soll, andernfalls false.
 */
export function isStateEnabled(key: string, definition: StateDefinition, config: Record<string, any>): boolean {
	if (definition.required) {
		return true;
	}

	const configKey = `sync_${key}`;
	if (config[configKey] === false || String(config[configKey]) === 'false') {
		return false;
	}

	for (const [prefix, mapKey] of PREFIX_MAPPING) {
		if (key.startsWith(prefix)) {
			return config[mapKey] !== false;
		}
	}

	return true;
}

/**
 * Übersetzungstabelle für Umlaute und Sonderzeichen bei der ID-Generierung.
 */
const CHAR_MAP: Record<string, string> = {
	ä: 'ae',
	ö: 'oe',
	ü: 'ue',
	Ä: 'Ae',
	Ö: 'Oe',
	Ü: 'Ue',
	ß: 'ss',
};

/**
 * Bereinigt einen Namen, um eine gültige, linter-konforme ioBroker-Datenpunkt-ID zu erzeugen.
 * Ersetzt Umlaute und Sonderzeichen durch sichere Alternativen.
 *
 * @param name Der zu bereinigende Originalname.
 * @returns Der bereinigte Name, der als ID verwendet werden kann.
 */
export function sanitizeName(name: string): string {
	return name
		.replace(/[äöüÄÖÜß]/g, match => CHAR_MAP[match])
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');
}

// =========================================================
// MÜLLABFUHR (Mit Promise.all & O(1) Lookups)
// =========================================================

/**
 * Entfernt alle Standard-Datenpunkte aus dem ioBroker, die in den Einstellungen abgewählt wurden.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Promise, das nach Abschluss der Löschvorgänge aufgelöst wird.
 */
export async function cleanupStates(adapter: ExtendedAdapter): Promise<void> {
	const config = adapter.config;
	const activeStateIds = new Set<string>();

	for (const [key, def] of Object.entries(STATE_MAPPING)) {
		const definition = def as StateDefinition;
		if (isStateEnabled(key, definition, config)) {
			activeStateIds.add(`${definition.folder}.${key}`);
		}
	}

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		let deletedCount = 0;
		const deletions: Promise<void>[] = [];

		for (const fullId in objects) {
			const obj = objects[fullId];
			if (obj && obj.type === 'state') {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				if (localId.startsWith('Benutzer.')) {
					continue;
				}
				if (!activeStateIds.has(localId)) {
					deletions.push(adapter.delStateAsync(localId).catch(() => {}));
					deletions.push(adapter.delObjectAsync(localId).catch(() => {}));
					adapter.createdStates.delete(localId);
					writeLog(`Datenpunkt '${localId}' rigoros entfernt.`, 'debug');
					deletedCount++;
				}
			}
		}

		if (deletions.length > 0) {
			await Promise.all(deletions);
		}
		if (deletedCount > 0) {
			writeLog(`${deletedCount} alte Datenpunkte aufgeräumt.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aufräumen von alten Datenpunkten: ${msg}`, 'error');
	}
}

/**
 * Durchsucht den Objektbaum des Adapters und entfernt alle leeren Channels, Ordner und Devices.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Promise, das nach dem Aufräumen aufgelöst wird.
 */
export async function cleanupEmptyFolders(adapter: ExtendedAdapter): Promise<void> {
	try {
		const objects = await adapter.getAdapterObjectsAsync();
		const allIds = Object.keys(objects);

		const folderIds = allIds.filter(id => {
			const type = objects[id]?.type;
			return type === 'channel' || type === 'folder' || type === 'device';
		});

		folderIds.sort((a, b) => b.length - a.length);

		const existingParents = new Set<string>();
		for (const id of allIds) {
			let parent = id;
			while (parent.includes('.')) {
				parent = parent.substring(0, parent.lastIndexOf('.'));
				existingParents.add(parent);
			}
		}

		let deletedCount = 0;
		const deletions: Promise<void>[] = [];

		for (const fullId of folderIds) {
			if (fullId === adapter.namespace) {
				continue;
			}

			if (!existingParents.has(fullId)) {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				deletions.push(adapter.delObjectAsync(localId).catch(() => {}));
				writeLog(`Leerer Ordner '${localId}' aufgeräumt.`, 'debug');
				deletedCount++;
			}
		}

		if (deletions.length > 0) {
			await Promise.all(deletions);
		}
		if (deletedCount > 0) {
			writeLog(`${deletedCount} leere Ordner aus dem Objektbaum entfernt.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aufräumen leerer Ordner: ${msg}`, 'error');
	}
}

/**
 * Entfernt alle benutzerdefinierten Datenpunkte (unter Benutzer.*), die in den Admin-Einstellungen deaktiviert oder gelöscht wurden.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Promise, das nach Abschluss der Löschvorgänge aufgelöst wird.
 */
export async function cleanupCustomStates(adapter: ExtendedAdapter): Promise<void> {
	const config = adapter.config;
	const customStates = (config.custom_states as CustomStateConfig[]) || [];

	const activeIds = new Set(
		customStates
			.filter(c => c.active && c.luxId !== undefined && c.name)
			.map(c => `Benutzer.${sanitizeName(c.name)}`),
	);

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		let deletedCount = 0;
		const deletions: Promise<void>[] = [];

		for (const id in objects) {
			if (id.startsWith(`${adapter.namespace}.Benutzer.`)) {
				const shortId = id.replace(`${adapter.namespace}.`, '');
				if (shortId === 'Benutzer') {
					continue;
				}

				if (!activeIds.has(shortId)) {
					deletions.push(adapter.delStateAsync(shortId).catch(() => {}));
					deletions.push(adapter.delObjectAsync(shortId).catch(() => {}));
					adapter.createdStates.delete(shortId);
					writeLog(`Benutzerdefinierter Datenpunkt '${shortId}' entfernt.`, 'debug');
					deletedCount++;
				}
			}
		}

		if (deletions.length > 0) {
			await Promise.all(deletions);
		}
		if (deletedCount > 0) {
			writeLog(`${deletedCount} benutzerdefinierte Werte aufgeräumt.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Aufräumen benutzerdefinierter Werte: ${msg}`, 'error');
	}
}

// =========================================================
// OBJEKTE ANLEGEN
// =========================================================

/**
 * Überprüft und erstellt alle standardmäßig konfigurierten Datenpunkte und Ordnerstrukturen im ioBroker.
 * Repariert automatisch fehlerhafte oder geänderte Eigenschaften existierender Objekte.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Promise, das nach der Erstellung/Prüfung aller Objekte aufgelöst wird.
 */
export async function ensureAllObjectsExist(adapter: ExtendedAdapter): Promise<void> {
	const config = adapter.config;
	try {
		const existingObjects = await adapter.getAdapterObjectsAsync();

		for (const [key, def] of Object.entries(STATE_MAPPING)) {
			const definition = def as StateDefinition;
			if (!isStateEnabled(key, definition, config)) {
				continue;
			}

			const stateId = `${definition.folder}.${key}`;
			const fullId = `${adapter.namespace}.${stateId}`;

			let targetType: ioBroker.CommonType = definition.type === 'json' ? 'string' : definition.type;
			if (definition.unit === 's' && definition.type === 'number') {
				targetType = 'string';
			}
			if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
				targetType = 'string';
			}

			const commonDef: ioBroker.StateCommon = {
				name: definition.name,
				type: targetType,
				role: definition.role,
				unit: definition.unit || '',
				read: true,
				write: definition.write || false,
				min: definition.min,
				max: definition.max,
				states: definition.states,
			};

			const existingObj = existingObjects[fullId];

			if (!existingObj) {
				const folderParts = definition.folder.split('.');
				let currentFolder = '';
				for (const part of folderParts) {
					currentFolder = currentFolder === '' ? part : `${currentFolder}.${part}`;
					await adapter.setObjectNotExistsAsync(currentFolder, {
						type: currentFolder.includes('.') ? 'channel' : 'folder',
						common: { name: part },
						native: {},
					});
				}
				await adapter.setObjectNotExistsAsync(stateId, { type: 'state', common: commonDef, native: {} });
			} else {
				let needsUpdate = false;
				const existingCommon = existingObj.common as Record<string, any>;

				if (
					existingCommon.type !== targetType ||
					existingCommon.role !== definition.role ||
					(existingCommon.unit || '') !== (definition.unit || '') ||
					existingCommon.name !== definition.name ||
					existingCommon.read !== true ||
					existingCommon.write !== (definition.write || false) ||
					existingCommon.min !== definition.min ||
					existingCommon.max !== definition.max ||
					JSON.stringify(existingCommon.states) !== JSON.stringify(definition.states)
				) {
					needsUpdate = true;
				}

				if (needsUpdate) {
					await adapter.extendObjectAsync(stateId, { type: 'state', common: commonDef });
					writeLog(`Eigenschaften von '${stateId}' synchronisiert (Reparatur).`, 'debug');
				}
			}

			if (definition.write) {
				adapter.subscribeStates(stateId);
			}

			adapter.createdStates.add(stateId);

			if (definition.folder === 'Aktionen') {
				const currentState = await adapter.getStateAsync(stateId);
				if (!currentState) {
					await adapter.setStateAsync(stateId, {
						val: definition.def !== undefined ? definition.def : false,
						ack: true,
					});
				} else if (currentState.ack === false) {
					const valToSet = definition.role === 'button' ? false : currentState.val;
					await adapter.setStateAsync(stateId, { val: valToSet, ack: true });
				}
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler bei der Objektüberprüfung: ${msg}`, 'error');
	}
}

/**
 * Erstellt alle in den Adapter-Optionen vom Benutzer konfigurierten eigenen Datenpunkte (unter Benutzer.*)
 * und abboniert Schreib-Ereignisse, falls die Datenpunkte beschreibbar sind (Parameter-Modus).
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Promise, das nach Erstellung aller benutzerdefinierten Objekte aufgelöst wird.
 */
export async function ensureCustomObjectsExist(adapter: ExtendedAdapter): Promise<void> {
	const config = adapter.config;
	const customStates = (config.custom_states as CustomStateConfig[]) || [];

	if (customStates.some(c => c.active)) {
		await adapter.setObjectNotExistsAsync('Benutzer', {
			type: 'channel',
			common: { name: 'Benutzerdefinierte Werte' },
			native: {},
		});
	}

	for (const custom of customStates) {
		if (!custom.active || custom.luxId === undefined || !custom.name) {
			continue;
		}

		const stateId = `Benutzer.${sanitizeName(custom.name)}`;
		let role = 'state';
		const targetType: ioBroker.CommonType = custom.type === 'datetime' ? 'string' : custom.type;

		if (custom.type === 'number') {
			role = 'value';
		} else if (custom.type === 'string') {
			role = 'text';
		} else if (custom.type === 'boolean') {
			role = 'indicator';
		} else if (custom.type === 'datetime') {
			role = 'value.datetime';
		}

		const isWritable = custom.source === 'parameter';
		const objDef = {
			type: 'state' as const,
			common: {
				name: custom.name,
				type: targetType,
				role: role,
				unit: custom.unit || '',
				read: true,
				write: isWritable,
			},
			native: {
				luxId: custom.luxId,
				source: custom.source,
				factor: custom.factor || null,
				customType: custom.type,
			},
		};

		if (!adapter.createdStates.has(stateId)) {
			await adapter.setObjectNotExistsAsync(stateId, objDef);
			adapter.createdStates.add(stateId);
		}
		await adapter.extendObjectAsync(stateId, { common: objDef.common, native: objDef.native });

		if (isWritable) {
			adapter.subscribeStates(stateId);
		}
	}
}

import { writeLog } from './logger';
import { STATE_MAPPING, type StateDefinition } from './stateMapping';
import type { LuxtronikAdapter } from './types';

/**
 * Konfiguration eines benutzerdefinierten Datenpunktes aus den Adapter-Einstellungen.
 */
export interface CustomStateConfig {
	/** Gibt an, ob der benutzerdefinierte Datenpunkt aktiv ist */
	active: boolean;
	/** Die Luxtronik-ID des abzufragenden Parameters oder Wertes */
	luxId?: number;
	/** Der vom Benutzer vergebene Klartext-Name */
	name: string;
	/** Die Quelle der Daten ('parameter' oder 'value') */
	source: 'parameter' | 'value';
	/** Der gewünschte Zieldatentyp im ioBroker */
	type: 'number' | 'boolean' | 'datetime' | 'string';
	/** Optionaler Multiplikator zur Umrechnung (z. B. 0.1 für Temperaturen) */
	factor?: number | null;
	/** Optionale physikalische Einheit */
	unit?: string;
}

/**
 * Zuweisung von Datenpunkt-Präfixen zu den jeweiligen Konfigurations-Checkboxen.
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
 * Prüft anhand der Adapter-Konfiguration, ob ein bestimmter Datenpunkt angelegt werden soll.
 *
 * @param key Der Schlüssel des Datenpunkts aus dem Mapping.
 * @param definition Die Struktur-Definition des Datenpunkts.
 * @param config Die aktuelle Adapter-Konfiguration.
 * @param visibilities Array der Sichtbarkeiten (Visibilities) via CMD 3005.
 * @returns True, wenn der Datenpunkt aktiviert ist und angelegt werden soll.
 */
export function isStateEnabled(
	key: string,
	definition: StateDefinition,
	config: Record<string, any>,
	visibilities: number[] = [],
): boolean {
	if (definition.required) {
		return true;
	}

	// 1. MASTER-KATEGORIE PRÜFEN (Dynamisch!)
	const parts = definition.folder.split('.');
	const mainCategory = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
	const catId = mainCategory.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

	const masterKey = `sync_category_${catId}`;
	if (
		Object.prototype.hasOwnProperty.call(config, masterKey) &&
		(config[masterKey] === false || String(config[masterKey]) === 'false')
	) {
		return false;
	}

	// 2. INDIVIDUELLEN DATENPUNKT PRÜFEN
	const configKey = `sync_${key}`;
	if (
		Object.prototype.hasOwnProperty.call(config, configKey) &&
		(config[configKey] === false || String(config[configKey]) === 'false')
	) {
		return false;
	}

	for (const [prefix, mapKey] of PREFIX_MAPPING) {
		if (key.startsWith(prefix)) {
			if (Object.prototype.hasOwnProperty.call(config, mapKey) && config[mapKey] === false) {
				return false;
			}
		}
	}

	// =========================================================
	// DYNAMISCHE SICHTBARKEITSPRÜFUNG (BENPRU 3005 MAPPING)
	// =========================================================
	if (config.filter_visibility !== false && visibilities.length > 0) {
		if (definition.visiIndex !== undefined) {
			if (visibilities[definition.visiIndex] === 0) {
				return false;
			}
		}

		if (definition.folder && definition.folder.includes('Cooling') && visibilities[5] === 0) {
			return false;
		}
	}

	// Fallback Check
	if (
		Object.prototype.hasOwnProperty.call(config, key) &&
		(config[key] === false || config[`sync_${key}`] === false)
	) {
		return false;
	}

	return true;
}

/**
 * Zeichen-Mapping zum Ersetzen von Umlauten und Sonderzeichen in IDs.
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
 * Bereinigt Klartext-Namen so, dass sie als gültige ioBroker-IDs verwendet werden können.
 *
 * @param name Der zu bereinigende Ursprungsname.
 * @returns Der bereinigte, ID-sichere Name.
 */
export function sanitizeName(name: string): string {
	return name
		.replace(/[äöüÄÖÜß]/g, match => CHAR_MAP[match])
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');
}

/**
 * Sucht und löscht Datenpunkte aus dem ioBroker-Baum, die in den Adapter-Einstellungen deaktiviert wurden.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss der Bereinigung aufgelöst wird.
 */
export async function cleanupStates(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;
	const activeStateIds = new Set<string>();

	for (const [key, definition] of Object.entries(STATE_MAPPING)) {
		if (isStateEnabled(key, definition, config, adapter.currentVisibilities || [])) {
			activeStateIds.add(`${definition.folder}.${key}`);
		}
	}

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		let deletedCount = 0;

		for (const fullId in objects) {
			const obj = objects[fullId];
			if (obj && obj.type === 'state') {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				// 'hidden.' Ordner vom Löschen ausschließen (schützt unsere COP-Datenbank)
				if (localId.startsWith('Custom.') || localId.startsWith('hidden.')) {
					continue;
				}
				if (!activeStateIds.has(localId)) {
					// SEQUENZIELLES LÖSCHEN (Schützt die ioBroker Datenbank vor Overload)
					try {
						await adapter.delStateAsync(localId);
					} catch {
						// Ignorieren, falls State bereits nicht mehr existiert
					}
					try {
						await adapter.delObjectAsync(localId);
					} catch {
						// Ignorieren, falls Objekt bereits nicht mehr existiert
					}

					adapter.createdStates.delete(localId);
					writeLog(`Datapoint '${localId}' rigorously removed.`, 'debug');
					deletedCount++;
				}
			}
		}

		if (deletedCount > 0) {
			writeLog(`${deletedCount} old datapoints cleaned up.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error cleaning up old datapoints: ${msg}`, 'error');
	}
}

/**
 * Sucht und löscht leere Ordner und Kanäle aus dem ioBroker-Baum, die keine Datenpunkte mehr enthalten.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss der Bereinigung aufgelöst wird.
 */
export async function cleanupEmptyFolders(adapter: LuxtronikAdapter): Promise<void> {
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

		for (const fullId of folderIds) {
			if (fullId === adapter.namespace) {
				continue;
			}

			if (!existingParents.has(fullId)) {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				try {
					await adapter.delObjectAsync(localId);
				} catch {
					// ignore
				}
				writeLog(`Empty folder '${localId}' cleaned up.`, 'debug');
				deletedCount++;
			}
		}

		if (deletedCount > 0) {
			writeLog(`${deletedCount} empty folders removed from object tree.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error cleaning up empty folders: ${msg}`, 'error');
	}
}

/**
 * Bereinigt benutzerdefinierte Datenpunkte aus dem Custom-Ordner, die in den Einstellungen entfernt wurden.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss der Bereinigung aufgelöst wird.
 */
export async function cleanupCustomStates(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;
	const customStates = (config.custom_states as CustomStateConfig[]) || [];

	const activeIds = new Set(
		customStates
			.filter(c => c.active && c.luxId !== undefined && c.name)
			.map(c => `Custom.${sanitizeName(c.name)}`),
	);

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		let deletedCount = 0;

		for (const id in objects) {
			if (id.startsWith(`${adapter.namespace}.Custom.`)) {
				const shortId = id.replace(`${adapter.namespace}.`, '');
				if (shortId === 'Custom') {
					continue;
				}

				if (!activeIds.has(shortId)) {
					try {
						await adapter.delStateAsync(shortId);
					} catch {
						// ignore
					}
					try {
						await adapter.delObjectAsync(shortId);
					} catch {
						// ignore
					}
					adapter.createdStates.delete(shortId);
					writeLog(`Custom datapoint '${shortId}' removed.`, 'debug');
					deletedCount++;
				}
			}
		}

		if (deletedCount > 0) {
			writeLog(`${deletedCount} custom values cleaned up.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error cleaning up custom values: ${msg}`, 'error');
	}
}

/**
 * Prüft und erzeugt alle im Mapping konfigurierten Standard-Datenpunkte im ioBroker-Baum.
 * Aktualisiert zudem fehlerhafte oder geänderte Eigenschaften existierender Objekte.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss der Erstellung aufgelöst wird.
 */
export async function ensureAllObjectsExist(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;

	// Sprachauswahl aus den Settings (Fallback auf 'en')
	const lang = config.language === 'de' ? 'de' : 'en';

	try {
		const existingObjects = await adapter.getAdapterObjectsAsync();

		for (const [key, definition] of Object.entries(STATE_MAPPING)) {
			if (!isStateEnabled(key, definition, config, adapter.currentVisibilities || [])) {
				continue;
			}

			const stateId = `${definition.folder}.${key}`;
			const fullId = `${adapter.namespace}.${stateId}`;

			let targetType: ioBroker.CommonType = definition.type === 'json' ? 'string' : definition.type;

			if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
				targetType = 'string';
			}

			// SPRACHWEICHE FÜR DIE VALUES / DROPDOWNS
			let resolvedStates: Record<string, string> | undefined = undefined;
			if (definition.states) {
				if ('en' in definition.states || 'de' in definition.states) {
					resolvedStates = (definition.states as any)[lang] || (definition.states as any).en;
				} else {
					resolvedStates = definition.states as Record<string, string>;
				}
			}

			// =========================================================
			// MODBUS NAMENS-ZUSATZ & SCHREIBFREIGABE
			// =========================================================
			let finalName = definition.name;
			const isModbusEnabled = Boolean(
				config.modbus_active && definition.modbus && config[definition.modbus.configKey] === true,
			);

			// Ist Modbus aktiv, der Datenpunkt Modbus-fähig und in der GUI angekreuzt?
			if (isModbusEnabled) {
				if (typeof finalName === 'string') {
					finalName = `${finalName} (Modbus)`;
				} else {
					finalName = {
						en: `${finalName.en} (Modbus)`,
						de: finalName.de ? `${finalName.de} (Modbus)` : `${finalName.en} (Modbus)`,
					};
				}
			}

			const isWritableState = Boolean(definition.write || isModbusEnabled);

			const commonDef: ioBroker.StateCommon = {
				name: finalName,
				type: targetType,
				role: definition.role,
				unit: definition.unit || '',
				read: definition.role === 'button' ? false : true,
				write: isWritableState,
				min: definition.min,
				max: definition.max,
				states: resolvedStates,
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
					JSON.stringify(existingCommon.name) !== JSON.stringify(commonDef.name) ||
					existingCommon.read !== commonDef.read ||
					existingCommon.write !== isWritableState ||
					existingCommon.min !== definition.min ||
					existingCommon.max !== definition.max ||
					JSON.stringify(existingCommon.states) !== JSON.stringify(resolvedStates)
				) {
					needsUpdate = true;
				}

				if (needsUpdate) {
					await adapter.extendObject(stateId, { type: 'state', common: commonDef });
					writeLog(`Properties of '${stateId}' synchronized (Repair).`, 'debug');
				}
			}

			if (isWritableState) {
				adapter.subscribeStates(stateId);
			}

			adapter.createdStates.add(stateId);

			// Standardwerte (def) beim ersten Anlegen initialisieren
			if (definition.def !== undefined || definition.folder === 'Actions') {
				const currentState = await adapter.getStateAsync(stateId);

				if (!currentState || currentState.val === null) {
					// Zustand existiert noch gar nicht oder ist (null) -> Standardwert setzen
					await adapter.setState(stateId, {
						val: definition.def !== undefined ? definition.def : false,
						ack: true,
					});
				} else if (definition.folder === 'Actions' && currentState.ack === false) {
					// Spezielle Logik nur für Buttons im Actions-Ordner
					const valToSet = definition.role === 'button' ? false : currentState.val;
					await adapter.setState(stateId, { val: valToSet, ack: true });
				}
			}
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error during object validation: ${msg}`, 'error');
	}
}

/**
 * Erzeugt die vom Benutzer in der Konfiguration definierten Custom-Datenpunkte.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss der Erstellung aufgelöst wird.
 */
export async function ensureCustomObjectsExist(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;
	const customStates = (config.custom_states as CustomStateConfig[]) || [];

	if (customStates.some(c => c.active)) {
		await adapter.setObjectNotExistsAsync('Custom', {
			type: 'channel',
			common: { name: 'Custom values' },
			native: {},
		});
	}

	for (const custom of customStates) {
		if (!custom.active || custom.luxId === undefined || !custom.name) {
			continue;
		}

		const stateId = `Custom.${sanitizeName(custom.name)}`;
		let role = 'state';
		const targetType: ioBroker.CommonType = custom.type === 'datetime' ? 'string' : custom.type;
		const isWritable = custom.source === 'parameter';

		if (custom.type === 'number') {
			role = 'value';
		} else if (custom.type === 'string') {
			role = 'text';
		} else if (custom.type === 'boolean') {
			role = isWritable ? 'switch' : 'sensor.switch';
		} else if (custom.type === 'datetime') {
			role = 'value.time';
		}

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
		await adapter.extendObject(stateId, { common: objDef.common, native: objDef.native });

		if (isWritable) {
			adapter.subscribeStates(stateId);
		}
	}
}

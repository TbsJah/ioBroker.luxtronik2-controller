import * as fs from 'node:fs';
import { ACTIONS_MAPPING } from '../mapping/actions';
import { INFO_MAPPING } from '../mapping/info';
import { SETTINGS_MAPPING } from '../mapping/settings';
import { TABLESINFO_MAPPING } from '../mapping/tablesInfo';
import { TABLESSETTINGS_MAPPING } from '../mapping/tablesSettings';

const allMappings = {
	...INFO_MAPPING,
	...SETTINGS_MAPPING,
	...ACTIONS_MAPPING,
	...TABLESINFO_MAPPING,
	...TABLESSETTINGS_MAPPING,
};

const panels: Record<string, any> = {};

// Hilfsfunktion: Macht aus "Information.01_Temperatures" -> "information_01_temperatures"
function getCategoryId(folder: string): string {
	return folder.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

for (const [key, def] of Object.entries(allMappings)) {
	// Gruppierung nach Hauptkategorien (z.B. "Settings.02_Heating")
	const parts = def.folder.split('.');
	const mainCategory = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
	const catId = getCategoryId(mainCategory);
	const panelKey = `panel_${catId}`;

	if (!panels[panelKey]) {
		panels[panelKey] = {
			type: 'panel',
			label: { en: mainCategory.replace(/_/g, ' '), de: mainCategory.replace(/_/g, ' ') },
			collapsable: true,
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
			items: {},
		};

		// Master-Schalter für die Kategorie
		panels[panelKey].items[`sync_category_${catId}`] = {
			type: 'checkbox',
			label: {
				en: `🌟 Enable entire category: ${mainCategory.replace(/_/g, ' ')}`,
				de: `🌟 Komplette Kategorie aktivieren: ${mainCategory.replace(/_/g, ' ')}`,
			},
			default: true,
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		};

		// Trennstrich
		panels[panelKey].items[`divider_${catId}`] = {
			type: 'divider',
			color: 'primary',
			style: { marginBottom: '15px', marginTop: '5px' },
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		};
	}

	let nameEn = typeof def.name === 'string' ? def.name : def.name.en;
	let nameDe = typeof def.name === 'string' ? def.name : def.name.de || def.name.en;

	if (def.required) {
		nameEn += ' (System critical)';
		nameDe += ' (Systemrelevant)';
	}

	// Einzelne Checkbox für den Datenpunkt generieren
	panels[panelKey].items[`sync_${key}`] = {
		type: 'checkbox',
		label: { en: nameEn, de: nameDe },
		default: true,
		// Wenn required, ist es ausgegraut. Ansonsten ist es abhängig vom Master-Schalter!
		disabled: def.required ? true : `!data.sync_category_${catId}`,
		xs: 12, // Smartphone: 1 untereinander (12/12)
		sm: 6, // Tablet/kleine Fenster: 2 nebeneinander (6/12)
		md: 3, // Desktop: 4 nebeneinander (3/12)
		lg: 3, // Großer Monitor: 4 nebeneinander
		xl: 3, // Ultrawide: 4 nebeneinander
	};
}

const objectsSettings = {
	type: 'panel',
	label: { en: 'Datapoints / Objects', de: 'Datenpunkte / Objekte' },
	icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z'/%3E%3C/svg%3E",
	items: {
		info_text: {
			type: 'staticText',
			text: {
				en: 'Select which datapoints should be created and updated...',
				de: 'Wähle hier aus, welche Datenpunkte in ioBroker erzeugt und aktualisiert werden sollen. Systemkritische Datenpunkte (ausgegraut) werden automatisch immer erzeugt.',
			},
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		filter_visibility: {
			type: 'checkbox',
			label: {
				en: 'Automatically hide unsupported hardware parameters',
				de: 'Nicht unterstützte Hardware-Parameter automatisch ausblenden',
			},
			default: true,
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		...panels, // Fügt alle generierten Panels ein
	},
};

// ... (oberer Teil mit den Schleifen für objectsSettings bleibt wie er ist) ...

const copTab = {
	type: 'panel',
	label: { en: 'Efficiency / COP', de: 'Effizienz / COP' },
	// Dein gewünschtes Icon:
	icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMzIgMzIiPgoJPHBhdGggZD0iTTAgMGgzMnYzMkgweiIgZmlsbD0ibm9uZSIgLz4KCTxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTI4IDI4VjE1aC0ydjEzaC00VjE3aC0ydjExaC00di05aC0ydjloLTR2LTdIOHY3SDRWMkgydjI2YzAgMS4xLjkgMiAyIDJoMjZ2LTJ6bTAtMjR2N2gtMlY3LjQybC04LjI5IDguMjljLS4yLjE5LS40NS4yOS0uNzEuMjlzLS41MS0uMS0uNzEtLjI5TDEyIDExLjQxbC00LjI5IDQuM2wtMS40Mi0xLjQybDUtNWMuMzktLjM5IDEuMDMtLjM5IDEuNDIgMGw0LjI5IDQuM0wyNC41OCA2SDIxVjR6IiAvPgo8L3N2Zz4K',
	items: {
		infoCop: {
			type: 'staticText',
			text: {
				en: 'Calculate the Coefficient of Performance (COP / JAZ) of your heat pump over various timeframes (24h, 7d, 1m, 1y). You can use the internal heat pump meters or link accurate external smart meters (e.g. Shelly 3EM).',
				de: 'Berechne die Arbeitszahl (COP / JAZ) deiner Wärmepumpe über verschiedene Zeiträume (Heute, 7 Tage, Monat, Jahr). Du kannst dafür die internen Schätzwerte der Anlage nutzen oder hochpräzise externe Zähler (z.B. Shelly 3EM) verlinken.',
			},
			style: { marginBottom: '20px', fontSize: '14px' },
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		cop_calculation_active: {
			type: 'checkbox',
			label: { en: 'Enable COP / Efficiency calculation', de: 'COP / Effizienz-Berechnung aktivieren' },
			default: false,
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		divider_cop1: {
			type: 'divider',
			color: 'primary',
			style: { marginBottom: '15px', marginTop: '15px' },
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		headerPower: {
			type: 'header',
			text: { en: '1. Electrical Energy (Power Consumption)', de: '1. Elektrische Energie (Stromverbrauch)' },
			size: 4,
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		cop_source_power: {
			type: 'select',
			label: { en: 'Data source for power consumption', de: 'Datenquelle für Stromverbrauch' },
			disabled: '!data.cop_calculation_active',
			options: [
				{
					label: { en: 'Internal (Luxtronik estimates)', de: 'Intern (Luxtronik Schätzwerte)' },
					value: 'internal',
				},
				{
					label: { en: 'External Object ID (e.g. Shelly)', de: 'Externe Objekt-ID (z.B. Shelly)' },
					value: 'external',
				},
			],
			xs: 12,
			sm: 12,
			md: 6,
			lg: 6,
			xl: 6,
		},
		cop_oid_power_total: {
			type: 'objectId',
			label: { en: 'Select External Meter OID (Total kWh)', de: 'Externen Zähler OID wählen (Gesamt kWh)' },
			hidden: "data.cop_source_power !== 'external'",
			disabled: '!data.cop_calculation_active',
			xs: 12,
			sm: 12,
			md: 6,
			lg: 6,
			xl: 6,
		},
		headerThermal: {
			type: 'header',
			text: { en: '2. Thermal Energy (Heat Generation)', de: '2. Thermische Energie (Wärmeerzeugung)' },
			size: 4,
			style: { marginTop: '20px' },
			xs: 12,
			sm: 12,
			md: 12,
			lg: 12,
			xl: 12,
		},
		cop_source_thermal: {
			type: 'select',
			label: { en: 'Data source for thermal generation', de: 'Datenquelle für Wärmeerzeugung' },
			disabled: '!data.cop_calculation_active',
			options: [
				{ label: { en: 'Internal (Luxtronik meters)', de: 'Intern (Luxtronik Zähler)' }, value: 'internal' },
				{
					label: { en: 'External Object ID (e.g. M-Bus meter)', de: 'Externe Objekt-ID (z.B. M-Bus Zähler)' },
					value: 'external',
				},
			],
			xs: 12,
			sm: 12,
			md: 6,
			lg: 6,
			xl: 6,
		},
		cop_oid_thermal_total: {
			type: 'objectId',
			label: { en: 'Select External Heat Meter OID (Total kWh)', de: 'Externen WMZ OID wählen (Gesamt kWh)' },
			hidden: "data.cop_source_thermal !== 'external'",
			disabled: '!data.cop_calculation_active',
			xs: 12,
			sm: 12,
			md: 6,
			lg: 6,
			xl: 6,
		},
	},
};

import * as path from 'node:path';
const configPath = path.resolve(process.cwd(), 'admin/jsonConfig.json');

try {
	const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

	// Wir bauen ein komplett neues Objekt für die Tabs, um die Reihenfolge zu kontrollieren
	const newItems: Record<string, any> = {};

	for (const key of Object.keys(currentConfig.items)) {
		// Sobald wir beim 3. Tab (Takt-Optimierung) ankommen, mogeln wir unseren COP-Tab davor!
		if (key === 'cycleOptimizationTab') {
			newItems.copTab = copTab;
		}

		if (key === 'objectsSettings') {
			newItems[key] = objectsSettings; // Generierte Datenpunkte patchen
		} else if (key !== 'copTab') {
			// Alte Tabs rüberkopieren (verhindert Duplikate, falls copTab vorher am Ende stand)
			newItems[key] = currentConfig.items[key];
		}
	}

	// Falls 'cycleOptimizationTab' warum auch immer nicht existiert, hängen wir es sicherheitshalber an
	if (!newItems.copTab) {
		newItems.copTab = copTab;
	}

	currentConfig.items = newItems;

	fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, '\t'));
	console.log('✅ admin/jsonConfig.json wurde erfolgreich automatisch gepatcht und sortiert!');
} catch (err) {
	console.error('❌ Fehler beim Patchen der jsonConfig.json:', err);
}

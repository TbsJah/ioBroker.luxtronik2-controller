import * as fs from 'fs';
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
		xs: 12,
		sm: 12,
		md: 6,
		lg: 6,
		xl: 6,
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

fs.writeFileSync('objectsSettings_OUTPUT.json', JSON.stringify(objectsSettings, null, '\t'));
console.log('✅ objectsSettings_OUTPUT.json erfolgreich generiert!');

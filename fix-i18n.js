const fs = require('fs');
const path = require('path');

// 1. Pfade konfigurieren (Skript im Hauptverzeichnis des Adapters ausführen)
const jsonConfigPath = path.join(__dirname, 'admin', 'jsonConfig.json');
const i18nDir = path.join(__dirname, 'admin', 'i18n');

if (!fs.existsSync(jsonConfigPath)) {
	console.error(`❌ Fehler: jsonConfig.json nicht gefunden unter ${jsonConfigPath}`);
	process.exit(1);
}

let jsonConfig = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf8'));
let extractedTranslations = {}; // { lang: { "English Key": "Translated Text" } }

// Offizielle ioBroker-Sprachen
const langs = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

// 2. Rekursive Such- und Ersetzungsfunktion
function traverseAndReplace(obj) {
	if (typeof obj === 'object' && obj !== null) {
		const keys = Object.keys(obj);

		// Prüfen, ob es sich um ein reines Übersetzungs-Objekt handelt
		// (Alle Keys müssen Sprachkürzel sein und 'en' muss existieren)
		const isI18nObject = keys.length > 0 && keys.every(k => langs.includes(k)) && typeof obj.en === 'string';

		if (isI18nObject) {
			const baseKey = obj.en; // Der englische Text wird unser neuer ioBroker Basis-Key

			// Gefundene Übersetzungen extrahieren und für die json-Dateien sammeln
			for (const lang of keys) {
				if (!extractedTranslations[lang]) {
					extractedTranslations[lang] = {};
				}
				extractedTranslations[lang][baseKey] = obj[lang];
			}

			// Das Objekt durch den Basis-Key (String) ersetzen, den der Repository Checker fordert
			return baseKey;
		}

		// Arrays und Unter-Objekte weiter traversieren
		if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				obj[i] = traverseAndReplace(obj[i]);
			}
		} else {
			for (const key in obj) {
				obj[key] = traverseAndReplace(obj[key]);
			}
		}
	}
	return obj;
}

console.log('🔍 Verarbeite jsonConfig.json...');
jsonConfig = traverseAndReplace(jsonConfig);

// 3. Bereinigte jsonConfig.json speichern
fs.writeFileSync(jsonConfigPath, JSON.stringify(jsonConfig, null, 4));
console.log('✅ jsonConfig.json erfolgreich bereinigt!');

// 4. Sprachdateien (i18n) aktualisieren
if (fs.existsSync(i18nDir)) {
	langs.forEach(lang => {
		if (!extractedTranslations[lang]) {
			return;
		} // Nichts zu tun für diese Sprache

		// ioBroker unterstützt sowohl flache (de.json) als auch verschachtelte (de/translations.json) Strukturen
		const flatPath = path.join(i18nDir, `${lang}.json`);
		const nestedPath = path.join(i18nDir, lang, 'translations.json');

		let targetPath = flatPath;
		if (fs.existsSync(nestedPath)) {
			targetPath = nestedPath;
		}

		let existingTranslations = {};
		if (fs.existsSync(targetPath)) {
			existingTranslations = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
		}

		// Neue Keys mergen (extrahierte Werte überschreiben bestehende Keys)
		existingTranslations = { ...existingTranslations, ...extractedTranslations[lang] };

		// Keys alphabetisch sortieren für ein sauberes GitHub-Diff
		const sortedTranslations = Object.keys(existingTranslations)
			.sort()
			.reduce((acc, key) => {
				acc[key] = existingTranslations[key];
				return acc;
			}, {});

		// Falls die Datei noch nicht existiert, den Ordner anlegen (nur bei nested)
		if (targetPath === nestedPath && !fs.existsSync(path.dirname(nestedPath))) {
			fs.mkdirSync(path.dirname(nestedPath), { recursive: true });
		}

		fs.writeFileSync(targetPath, JSON.stringify(sortedTranslations, null, 4));
		console.log(`🌍 Sprachdatei ${path.basename(targetPath)} (${lang}) aktualisiert.`);
	});
} else {
	console.log('⚠️ i18n Ordner nicht gefunden, überspringe Sprachdateien.');
}

console.log('🎉 Migration komplett abgeschlossen!');

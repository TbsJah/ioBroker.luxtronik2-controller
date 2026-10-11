"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var fs = __toESM(require("fs"));
var import_actions = require("../mapping/actions");
var import_info = require("../mapping/info");
var import_settings = require("../mapping/settings");
var import_tablesInfo = require("../mapping/tablesInfo");
var import_tablesSettings = require("../mapping/tablesSettings");
const allMappings = {
  ...import_info.INFO_MAPPING,
  ...import_settings.SETTINGS_MAPPING,
  ...import_actions.ACTIONS_MAPPING,
  ...import_tablesInfo.TABLESINFO_MAPPING,
  ...import_tablesSettings.TABLESSETTINGS_MAPPING
};
const panels = {};
function getCategoryId(folder) {
  return folder.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}
for (const [key, def] of Object.entries(allMappings)) {
  const parts = def.folder.split(".");
  const mainCategory = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  const catId = getCategoryId(mainCategory);
  const panelKey = `panel_${catId}`;
  if (!panels[panelKey]) {
    panels[panelKey] = {
      type: "panel",
      label: { en: mainCategory.replace(/_/g, " "), de: mainCategory.replace(/_/g, " ") },
      collapsable: true,
      xs: 12,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 12,
      items: {}
    };
    panels[panelKey].items[`sync_category_${catId}`] = {
      type: "checkbox",
      label: {
        en: `\u{1F31F} Enable entire category: ${mainCategory.replace(/_/g, " ")}`,
        de: `\u{1F31F} Komplette Kategorie aktivieren: ${mainCategory.replace(/_/g, " ")}`
      },
      default: true,
      xs: 12,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 12
    };
    panels[panelKey].items[`divider_${catId}`] = {
      type: "divider",
      color: "primary",
      style: { marginBottom: "15px", marginTop: "5px" },
      xs: 12,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 12
    };
  }
  let nameEn = typeof def.name === "string" ? def.name : def.name.en;
  let nameDe = typeof def.name === "string" ? def.name : def.name.de || def.name.en;
  if (def.required) {
    nameEn += " (System critical)";
    nameDe += " (Systemrelevant)";
  }
  panels[panelKey].items[`sync_${key}`] = {
    type: "checkbox",
    label: { en: nameEn, de: nameDe },
    default: true,
    // Wenn required, ist es ausgegraut. Ansonsten ist es abhängig vom Master-Schalter!
    disabled: def.required ? true : `!data.sync_category_${catId}`,
    xs: 12,
    sm: 12,
    md: 6,
    lg: 6,
    xl: 6
  };
}
const objectsSettings = {
  type: "panel",
  label: { en: "Datapoints / Objects", de: "Datenpunkte / Objekte" },
  icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z'/%3E%3C/svg%3E",
  items: {
    info_text: {
      type: "staticText",
      text: {
        en: "Select which datapoints should be created and updated...",
        de: "W\xE4hle hier aus, welche Datenpunkte in ioBroker erzeugt und aktualisiert werden sollen. Systemkritische Datenpunkte (ausgegraut) werden automatisch immer erzeugt."
      },
      xs: 12,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 12
    },
    filter_visibility: {
      type: "checkbox",
      label: {
        en: "Automatically hide unsupported hardware parameters",
        de: "Nicht unterst\xFCtzte Hardware-Parameter automatisch ausblenden"
      },
      default: true,
      xs: 12,
      sm: 12,
      md: 12,
      lg: 12,
      xl: 12
    },
    ...panels
    // Fügt alle generierten Panels ein
  }
};
fs.writeFileSync("objectsSettings_OUTPUT.json", JSON.stringify(objectsSettings, null, "	"));
console.log("\u2705 objectsSettings_OUTPUT.json erfolgreich generiert!");
//# sourceMappingURL=generateConfig.js.map

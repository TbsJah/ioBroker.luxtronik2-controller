"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stateMapping_exports = {};
__export(stateMapping_exports, {
  STATE_MAPPING: () => STATE_MAPPING,
  getDpPath: () => getDpPath,
  getLuxIdByKey: () => getLuxIdByKey
});
module.exports = __toCommonJS(stateMapping_exports);
var import_info = require("./mapping/info");
var import_settings = require("./mapping/settings");
var import_tablesInfo = require("./mapping/tablesInfo");
var import_tablesSettings = require("./mapping/tablesSettings");
const STATE_MAPPING = {
  ...import_info.INFO_MAPPING,
  ...import_settings.SETTINGS_MAPPING,
  ...import_tablesInfo.TABLESINFO_MAPPING,
  ...import_tablesSettings.TABLESSETTINGS_MAPPING
};
for (const key of Object.keys(STATE_MAPPING)) {
  if (!STATE_MAPPING[key].luxWriteId) {
    STATE_MAPPING[key].luxWriteId = key;
  }
}
function getDpPath(key) {
  const def = STATE_MAPPING[key];
  if (!def) {
    throw new Error(`Kritischer Fehler: Datenpunkt-Schl\xFCssel '${key}' existiert nicht im Mapping!`);
  }
  return `${def.folder}.${key}`;
}
function getLuxIdByKey(key) {
  const entry = STATE_MAPPING[key];
  if (entry && entry.luxWriteId) {
    return parseInt(entry.luxWriteId, 10);
  }
  return -1;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STATE_MAPPING,
  getDpPath,
  getLuxIdByKey
});
//# sourceMappingURL=stateMapping.js.map

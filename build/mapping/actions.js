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
var actions_exports = {};
__export(actions_exports, {
  ACTIONS_MAPPING: () => ACTIONS_MAPPING
});
module.exports = __toCommonJS(actions_exports);
const ACTIONS_MAPPING = {
  // ==========================================
  // Actions & VIRTUAL
  // ==========================================
  Dump_Raw_To_Log: {
    folder: "Actions",
    name: "Write raw data to log",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Regelung_Aktiv: {
    folder: "Actions",
    name: "Toggle automatic system control",
    role: "switch",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: true,
    required: true
  },
  Schreibe_Debug_Log: {
    folder: "Actions",
    name: "Toggle extended debug logging",
    role: "switch",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Setze_Vorgabewerte: {
    folder: "Actions",
    name: "Set default values manually (e.g. idle)",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Zwangsheizen: {
    folder: "Actions",
    name: "Force heating (even without demand)",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Zwangswarmwasser: {
    folder: "Actions",
    name: "Force hot water",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Activate_Zip: {
    folder: "Actions",
    name: { en: "Activate Circulation Pump (ZIP)", de: "Zirkulationspumpe (ZIP) aktivieren" },
    role: "switch",
    type: "boolean",
    write: true,
    luxWriteId: "Activate_Zip",
    isVirtual: true,
    required: true,
    visiIndex: 59
  },
  connection: {
    folder: "info",
    name: "Connection status",
    role: "indicator.connected",
    type: "boolean",
    isVirtual: true,
    write: false,
    def: false,
    required: true
  },
  lastUpdate: {
    folder: "info",
    name: { en: "Last update", de: "Letzter Abruf" },
    role: "date",
    type: "number",
    // ioBroker erwartet für 'date' meist einen Unix-Timestamp in Millisekunden
    isVirtual: true,
    write: false,
    def: 0,
    required: true
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS_MAPPING
});
//# sourceMappingURL=actions.js.map

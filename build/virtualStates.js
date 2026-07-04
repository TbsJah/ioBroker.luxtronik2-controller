"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var virtualStates_exports = {};
__export(virtualStates_exports, {
  calculateTemperatureSpread: () => calculateTemperatureSpread,
  calculateTotalEnergy: () => calculateTotalEnergy,
  calculateTotalThermalEnergy: () => calculateTotalThermalEnergy,
  initializeVirtualStates: () => initializeVirtualStates,
  updateErrorHistory: () => updateErrorHistory,
  updateOutageHistory: () => updateOutageHistory
});
module.exports = __toCommonJS(virtualStates_exports);
var import_stateMapping = require("./stateMapping");
var luxtronikTypes = __toESM(require("luxtronik2/types"));
var import_logger = require("./logger");
async function initializeVirtualStates(adapter) {
  for (const [key, definition] of Object.entries(import_stateMapping.STATE_MAPPING)) {
    if (definition.isVirtual) {
      const folderId = definition.folder;
      const stateId = `${folderId}.${key}`;
      await adapter.setObjectNotExistsAsync(folderId, {
        type: "channel",
        common: { name: folderId.split(".").pop() || folderId },
        native: {}
      });
      await adapter.setObjectNotExistsAsync(stateId, {
        type: "state",
        common: {
          name: definition.name,
          type: definition.type,
          role: definition.role,
          unit: definition.unit,
          read: true,
          write: definition.write || false,
          def: definition.def
          // <--- 1. ioBroker das Default mitteilen
        },
        native: {}
      });
      if (definition.def !== void 0) {
        const checkState = await adapter.getStateAsync(stateId);
        if (!checkState || checkState.val === null) {
          (0, import_logger.writeLog)(`Initiale Erstellung: Setze Default-Wert [${definition.def}] f\xFCr ${stateId}`, "info");
          await adapter.setStateAsync(stateId, { val: definition.def, ack: true });
        }
      }
      if (definition.write) {
        adapter.subscribeStates(stateId);
      }
    }
  }
}
async function calculateSum(adapter, sourceId1, sourceId2, targetId, logName) {
  try {
    const [state1, state2] = await Promise.all([
      adapter.getStateAsync(sourceId1),
      adapter.getStateAsync(sourceId2)
    ]);
    const val1 = state1 && typeof state1.val === "number" ? state1.val : 0;
    const val2 = state2 && typeof state2.val === "number" ? state2.val : 0;
    await adapter.setStateChangedAsync(targetId, val1 + val2, true);
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Berechnung der ${logName}: ${err.message}`, "error");
  }
}
async function calculateTotalThermalEnergy(adapter) {
  await calculateSum(
    adapter,
    "Informationen.09_W\xE4rmemenge.thermalenergy_heating",
    "Informationen.09_W\xE4rmemenge.thermalenergy_warmwater",
    "Informationen.09_W\xE4rmemenge.thermalenergy_total",
    "Gesamt-W\xE4rmemenge"
  );
}
async function calculateTotalEnergy(adapter) {
  await calculateSum(
    adapter,
    "Informationen.10_Energie.energy_heating",
    "Informationen.10_Energie.energy_warmwater",
    "Informationen.10_Energie.energy_total",
    "Gesamt-Energie"
  );
}
async function updateHistory(adapter, rawValues, startIdxTime, startIdxCode, targetId, dictKeys, fallbackPrefix) {
  try {
    const requiredLength = Math.max(startIdxTime, startIdxCode) + 5;
    if (!rawValues || rawValues.length < requiredLength) {
      adapter.log.debug(`[Virtual DP] Historie f\xFCr ${targetId} \xFCbersprungen: Unvollst\xE4ndiges Raw-Array.`);
      return;
    }
    const logList = [];
    const typesAny = luxtronikTypes;
    for (let i = 0; i < 5; i++) {
      const timestamp = rawValues[startIdxTime + i];
      const code = rawValues[startIdxCode + i];
      if (code !== 0) {
        const dateObject = new Date(timestamp * 1e3);
        const readableDate = timestamp > 0 ? dateObject.toLocaleString("de-DE") : "Unbekannt";
        let beschreibung = `${fallbackPrefix} (${code})`;
        for (const dictKey of dictKeys) {
          if (typesAny[dictKey] && typesAny[dictKey][code]) {
            beschreibung = typesAny[dictKey][code];
            break;
          } else if (typesAny[code]) {
            beschreibung = typesAny[code];
            break;
          }
        }
        logList.push({
          index: i + 1,
          code,
          beschreibung,
          datum: readableDate,
          timestamp
        });
      }
    }
    const jsonString = JSON.stringify(logList);
    await adapter.setStateChangedAsync(targetId, jsonString, true);
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Generierung der JSON-Historie f\xFCr ${targetId}: ${err.message}`, "error");
  }
}
async function updateErrorHistory(adapter, rawValues) {
  await updateHistory(
    adapter,
    rawValues,
    95,
    // Start-Index für Zeitstempel
    100,
    // Start-Index für Codes
    "Informationen.06_Fehlerspeicher.Fehlerspeicher",
    ["errorCodes", "codes"],
    "Unbekannter Fehler"
  );
}
async function updateOutageHistory(adapter, rawValues) {
  await updateHistory(
    adapter,
    rawValues,
    111,
    // Start-Index für Zeitstempel
    106,
    // Start-Index für Codes
    "Informationen.07_Abschaltungen.Abschaltungen",
    ["outageCodes", "outages", "switchOffCodes"],
    "Unbekannter Abschaltgrund"
  );
}
async function calculateTemperatureSpread(adapter) {
  try {
    const [vorlaufState, ruecklaufState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_supply")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return"))
    ]);
    if (vorlaufState && ruecklaufState && vorlaufState.val !== null && ruecklaufState.val !== null) {
      const spreizung = parseFloat((Number(vorlaufState.val) - Number(ruecklaufState.val)).toFixed(2));
      await adapter.setStateChangedAsync((0, import_stateMapping.getDpPath)("spreizung_vorlauf_ruecklauf"), spreizung, true);
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Berechnung der Temperatur-Spreizung: ${err.message}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateTemperatureSpread,
  calculateTotalEnergy,
  calculateTotalThermalEnergy,
  initializeVirtualStates,
  updateErrorHistory,
  updateOutageHistory
});
//# sourceMappingURL=virtualStates.js.map

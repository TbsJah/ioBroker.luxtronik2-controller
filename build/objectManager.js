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
var objectManager_exports = {};
__export(objectManager_exports, {
  cleanupCustomStates: () => cleanupCustomStates,
  cleanupEmptyFolders: () => cleanupEmptyFolders,
  cleanupStates: () => cleanupStates,
  ensureAllObjectsExist: () => ensureAllObjectsExist,
  ensureCustomObjectsExist: () => ensureCustomObjectsExist,
  isStateEnabled: () => isStateEnabled,
  sanitizeName: () => sanitizeName
});
module.exports = __toCommonJS(objectManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
const PREFIX_MAPPING = [
  ["HZ_MoSo_", "sync_heatingOperationTimerTableWeek"],
  ["HZ_MoFr_", "sync_heatingOperationTimerTable52MonFri"],
  ["HZ_SaSo_", "sync_heatingOperationTimerTable52MonFri"],
  ["HZ_Montag_", "sync_heatingOperationTimerTableDayMonday"],
  ["HZ_Dienstag_", "sync_heatingOperationTimerTableDayTuesday"],
  ["HZ_Mittwoch_", "sync_heatingOperationTimerTableDayWednesday"],
  ["HZ_Donnerstag_", "sync_heatingOperationTimerTableDayThursday"],
  ["HZ_Freitag_", "sync_heatingOperationTimerTableDayFriday"],
  ["HZ_Samstag_", "sync_heatingOperationTimerTableDaySaturday"],
  ["HZ_Sonntag_", "sync_heatingOperationTimerTableDaySunday"],
  ["WW_MoSo_", "sync_hotWaterTableWeek"],
  ["WW_MoFr_", "sync_hotWaterTable52MonFri"],
  ["WW_SaSo_", "sync_hotWaterTable52MonFri"],
  ["WW_Montag_", "sync_hotWaterTableDayMonday"],
  ["WW_Dienstag_", "sync_hotWaterTableDayTuesday"],
  ["WW_Mittwoch_", "sync_hotWaterTableDayWednesday"],
  ["WW_Donnerstag_", "sync_hotWaterTableDayThursday"],
  ["WW_Freitag_", "sync_hotWaterTableDayFriday"],
  ["WW_Samstag_", "sync_hotWaterTableDaySaturday"],
  ["WW_Sonntag_", "sync_hotWaterTableDaySunday"],
  ["Zirkulation_MoSo_", "sync_hotWaterCircPumpTimerTableWeek"],
  ["Zirkulation_MoFr_", "sync_hotWaterCircPumpTimerTable52MonFri"],
  ["Zirkulation_SaSo_", "sync_hotWaterCircPumpTimerTable52MonFri"],
  ["Zirkulation_Montag_", "sync_hotWaterCircPumpTimerTableDayMonday"],
  ["Zirkulation_Dienstag_", "sync_hotWaterCircPumpTimerTableDayTuesday"],
  ["Zirkulation_Mittwoch_", "sync_hotWaterCircPumpTimerTableDayWednesday"],
  ["Zirkulation_Donnerstag_", "sync_hotWaterCircPumpTimerTableDayThursday"],
  ["Zirkulation_Freitag_", "sync_hotWaterCircPumpTimerTableDayFriday"],
  ["Zirkulation_Samstag_", "sync_hotWaterCircPumpTimerTableDaySaturday"],
  ["Zirkulation_Sonntag_", "sync_hotWaterCircPumpTimerTableDaySunday"]
];
function isStateEnabled(key, definition, config) {
  if (definition.required) {
    return true;
  }
  const configKey = `sync_${key}`;
  if (config[configKey] === false || String(config[configKey]) === "false") {
    return false;
  }
  for (const [prefix, mapKey] of PREFIX_MAPPING) {
    if (key.startsWith(prefix)) {
      return config[mapKey] !== false;
    }
  }
  return true;
}
const CHAR_MAP = {
  \u00E4: "ae",
  \u00F6: "oe",
  \u00FC: "ue",
  \u00C4: "Ae",
  \u00D6: "Oe",
  \u00DC: "Ue",
  \u00DF: "ss"
};
function sanitizeName(name) {
  return name.replace(/[äöüÄÖÜß]/g, (match) => CHAR_MAP[match]).replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}
async function cleanupStates(adapter) {
  const config = adapter.config;
  const activeStateIds = /* @__PURE__ */ new Set();
  for (const [key, def] of Object.entries(import_stateMapping.STATE_MAPPING)) {
    const definition = def;
    if (isStateEnabled(key, definition, config)) {
      activeStateIds.add(`${definition.folder}.${key}`);
    }
  }
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    let deletedCount = 0;
    const deletions = [];
    for (const fullId in objects) {
      const obj = objects[fullId];
      if (obj && obj.type === "state") {
        const localId = fullId.replace(`${adapter.namespace}.`, "");
        if (localId.startsWith("Custom.")) {
          continue;
        }
        if (!activeStateIds.has(localId)) {
          deletions.push(
            adapter.delStateAsync(localId).catch(() => {
            })
          );
          deletions.push(
            adapter.delObjectAsync(localId).catch(() => {
            })
          );
          adapter.createdStates.delete(localId);
          (0, import_logger.writeLog)(`Datapoint '${localId}' rigorously removed.`, "debug");
          deletedCount++;
        }
      }
    }
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }
    if (deletedCount > 0) {
      (0, import_logger.writeLog)(`${deletedCount} old datapoints cleaned up.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error cleaning up old datapoints: ${msg}`, "error");
  }
}
async function cleanupEmptyFolders(adapter) {
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    const allIds = Object.keys(objects);
    const folderIds = allIds.filter((id) => {
      var _a;
      const type = (_a = objects[id]) == null ? void 0 : _a.type;
      return type === "channel" || type === "folder" || type === "device";
    });
    folderIds.sort((a, b) => b.length - a.length);
    const existingParents = /* @__PURE__ */ new Set();
    for (const id of allIds) {
      let parent = id;
      while (parent.includes(".")) {
        parent = parent.substring(0, parent.lastIndexOf("."));
        existingParents.add(parent);
      }
    }
    let deletedCount = 0;
    const deletions = [];
    for (const fullId of folderIds) {
      if (fullId === adapter.namespace) {
        continue;
      }
      if (!existingParents.has(fullId)) {
        const localId = fullId.replace(`${adapter.namespace}.`, "");
        deletions.push(
          adapter.delObjectAsync(localId).catch(() => {
          })
        );
        (0, import_logger.writeLog)(`Empty folder '${localId}' cleaned up.`, "debug");
        deletedCount++;
      }
    }
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }
    if (deletedCount > 0) {
      (0, import_logger.writeLog)(`${deletedCount} empty folders removed from object tree.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error cleaning up empty folders: ${msg}`, "error");
  }
}
async function cleanupCustomStates(adapter) {
  const config = adapter.config;
  const customStates = config.custom_states || [];
  const activeIds = new Set(
    customStates.filter((c) => c.active && c.luxId !== void 0 && c.name).map((c) => `Custom.${sanitizeName(c.name)}`)
  );
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    let deletedCount = 0;
    const deletions = [];
    for (const id in objects) {
      if (id.startsWith(`${adapter.namespace}.Custom.`)) {
        const shortId = id.replace(`${adapter.namespace}.`, "");
        if (shortId === "Custom") {
          continue;
        }
        if (!activeIds.has(shortId)) {
          deletions.push(
            adapter.delStateAsync(shortId).catch(() => {
            })
          );
          deletions.push(
            adapter.delObjectAsync(shortId).catch(() => {
            })
          );
          adapter.createdStates.delete(shortId);
          (0, import_logger.writeLog)(`Custom datapoint '${shortId}' removed.`, "debug");
          deletedCount++;
        }
      }
    }
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }
    if (deletedCount > 0) {
      (0, import_logger.writeLog)(`${deletedCount} custom values cleaned up.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error cleaning up custom values: ${msg}`, "error");
  }
}
async function ensureAllObjectsExist(adapter) {
  const config = adapter.config;
  const lang = config.language === "de" ? "de" : "en";
  try {
    const existingObjects = await adapter.getAdapterObjectsAsync();
    for (const [key, def] of Object.entries(import_stateMapping.STATE_MAPPING)) {
      const definition = def;
      if (!isStateEnabled(key, definition, config)) {
        continue;
      }
      const stateId = `${definition.folder}.${key}`;
      const fullId = `${adapter.namespace}.${stateId}`;
      let targetType = definition.type === "json" ? "string" : definition.type;
      if (definition.role && ["value.datetime", "value.time", "date"].includes(definition.role)) {
        targetType = "string";
      }
      let resolvedStates = void 0;
      if (definition.states) {
        if ("en" in definition.states || "de" in definition.states) {
          resolvedStates = definition.states[lang] || definition.states.en;
        } else {
          resolvedStates = definition.states;
        }
      }
      const commonDef = {
        name: definition.name,
        type: targetType,
        role: definition.role,
        unit: definition.unit || "",
        read: definition.role === "button" ? false : true,
        write: definition.write || false,
        min: definition.min,
        max: definition.max,
        states: resolvedStates
      };
      const existingObj = existingObjects[fullId];
      if (!existingObj) {
        const folderParts = definition.folder.split(".");
        let currentFolder = "";
        for (const part of folderParts) {
          currentFolder = currentFolder === "" ? part : `${currentFolder}.${part}`;
          await adapter.setObjectNotExistsAsync(currentFolder, {
            type: currentFolder.includes(".") ? "channel" : "folder",
            common: { name: part },
            native: {}
          });
        }
        await adapter.setObjectNotExistsAsync(stateId, { type: "state", common: commonDef, native: {} });
      } else {
        let needsUpdate = false;
        const existingCommon = existingObj.common;
        if (existingCommon.type !== targetType || existingCommon.role !== definition.role || (existingCommon.unit || "") !== (definition.unit || "") || JSON.stringify(existingCommon.name) !== JSON.stringify(definition.name) || existingCommon.read !== commonDef.read || existingCommon.write !== (definition.write || false) || existingCommon.min !== definition.min || existingCommon.max !== definition.max || JSON.stringify(existingCommon.states) !== JSON.stringify(resolvedStates)) {
          needsUpdate = true;
        }
        if (needsUpdate) {
          await adapter.extendObject(stateId, { type: "state", common: commonDef });
          (0, import_logger.writeLog)(`Properties of '${stateId}' synchronized (Repair).`, "debug");
        }
      }
      if (definition.write) {
        adapter.subscribeStates(stateId);
      }
      adapter.createdStates.add(stateId);
      if (definition.folder === "Actions") {
        const currentState = await adapter.getStateAsync(stateId);
        if (!currentState) {
          await adapter.setStateAsync(stateId, {
            val: definition.def !== void 0 ? definition.def : false,
            ack: true
          });
        } else if (currentState.ack === false) {
          const valToSet = definition.role === "button" ? false : currentState.val;
          await adapter.setStateAsync(stateId, { val: valToSet, ack: true });
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error during object validation: ${msg}`, "error");
  }
}
async function ensureCustomObjectsExist(adapter) {
  const config = adapter.config;
  const customStates = config.custom_states || [];
  if (customStates.some((c) => c.active)) {
    await adapter.setObjectNotExistsAsync("Custom", {
      type: "channel",
      common: { name: "Custom values" },
      native: {}
    });
  }
  for (const custom of customStates) {
    if (!custom.active || custom.luxId === void 0 || !custom.name) {
      continue;
    }
    const stateId = `Custom.${sanitizeName(custom.name)}`;
    let role = "state";
    const targetType = custom.type === "datetime" ? "string" : custom.type;
    const isWritable = custom.source === "parameter";
    if (custom.type === "number") {
      role = "value";
    } else if (custom.type === "string") {
      role = "text";
    } else if (custom.type === "boolean") {
      role = isWritable ? "switch" : "sensor.switch";
    } else if (custom.type === "datetime") {
      role = "value.time";
    }
    const objDef = {
      type: "state",
      common: {
        name: custom.name,
        type: targetType,
        role,
        unit: custom.unit || "",
        read: true,
        write: isWritable
      },
      native: {
        luxId: custom.luxId,
        source: custom.source,
        factor: custom.factor || null,
        customType: custom.type
      }
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cleanupCustomStates,
  cleanupEmptyFolders,
  cleanupStates,
  ensureAllObjectsExist,
  ensureCustomObjectsExist,
  isStateEnabled,
  sanitizeName
});
//# sourceMappingURL=objectManager.js.map

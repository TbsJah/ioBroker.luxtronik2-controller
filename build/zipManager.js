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
var zipManager_exports = {};
__export(zipManager_exports, {
  handleActivateZip: () => handleActivateZip,
  restoreOriginalZipConfig: () => restoreOriginalZipConfig,
  stopZipAndDeaeration: () => stopZipAndDeaeration
});
module.exports = __toCommonJS(zipManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
async function restoreOriginalZipConfig(adapter) {
  if (!adapter.originalZipConfig) {
    return;
  }
  try {
    for (const [key, val] of Object.entries(adapter.originalZipConfig)) {
      if (val === null || val === void 0) {
        continue;
      }
      const def = import_stateMapping.STATE_MAPPING[key];
      let rawVal = val;
      if (def.role === "value.datetime" && typeof val === "string") {
        const timeMatch = val.match(/^(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
          rawVal = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
        } else {
          rawVal = 0;
        }
      }
      await adapter.setState((0, import_stateMapping.getDpPath)(key), { val, ack: true });
      const luxId = parseInt(def.luxWriteId, 10);
      await adapter.queueWrite(luxId, rawVal);
      await new Promise((resolve) => adapter.setTimeout(resolve, 100));
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Wiederherstellung der ZIP Konfiguration: ${err.message}`, "error");
  } finally {
    adapter.originalZipConfig = null;
  }
}
async function stopZipAndDeaeration(adapter) {
  try {
    const activateZipState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Activate_Zip"));
    const runDeaerateState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("runDeaerate"));
    const isZipActive = (activateZipState == null ? void 0 : activateZipState.val) === true || adapter.zipTimer || adapter.originalZipConfig !== null;
    const isDeaerateActive = (runDeaerateState == null ? void 0 : runDeaerateState.val) === 1 || (runDeaerateState == null ? void 0 : runDeaerateState.val) === true;
    if (isZipActive || isDeaerateActive) {
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)("Bedingungen erf\xFCllt: Stoppe aktives ZIP Makro und Entl\xFCftungsprogramm...", "info");
      }
      if (adapter.zipTimer) {
        clearTimeout(adapter.zipTimer);
        adapter.zipTimer = void 0;
      }
      await restoreOriginalZipConfig(adapter);
      await adapter.queueWrite(158, 0);
      await new Promise((resolve) => adapter.setTimeout(resolve, 100));
      await adapter.queueWrite(684, 0);
      await new Promise((resolve) => adapter.setTimeout(resolve, 100));
      await adapter.syncConfigValue("runDeaerate", 0);
      await adapter.syncConfigValue("hotWaterCircPumpDeaerate", 0);
      await adapter.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("Activate_Zip"), false, true);
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Stoppen von ZIP/Entl\xFCftung: ${err.message}`, "error");
  }
}
async function handleActivateZip(adapter, id, durationSeconds) {
  await adapter.setForeignStateAsync(id, { val: true, ack: true });
  if (durationSeconds <= 0) {
    await adapter.setForeignStateAsync(id, { val: false, ack: true });
    return;
  }
  const bzState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt"));
  const bzVal = bzState ? Number(bzState.val) : 5;
  const [wwIstS, wwSollS, wwHystS, rLState, rSollState, hzHystState] = await Promise.all([
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("hotWaterTemperatureHysteresis")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
  ]);
  const useDeaeration = bzVal === 5 && Number(wwIstS == null ? void 0 : wwIstS.val) > Number(wwSollS == null ? void 0 : wwSollS.val) - Number(wwHystS == null ? void 0 : wwHystS.val) && Number(rLState == null ? void 0 : rLState.val) > Number(rSollState == null ? void 0 : rSollState.val) - Number(hzHystState == null ? void 0 : hzHystState.val);
  if (adapter.zipTimer) {
    clearTimeout(adapter.zipTimer);
    adapter.zipTimer = void 0;
  }
  if (useDeaeration) {
    await adapter.queueWrite(158, 1);
    await new Promise((r) => adapter.setTimeout(r, 100));
    await adapter.queueWrite(684, 1);
    await adapter.syncConfigValue("runDeaerate", 1);
    await adapter.syncConfigValue("hotWaterCircPumpDeaerate", 1);
  } else {
    const onTimeMinutes = Math.ceil(durationSeconds / 60);
    if (!adapter.originalZipConfig) {
      const keysToSave = [
        "hotWaterCircPumpTimerTableSelected",
        "WW_MoSo_Start1",
        "WW_MoSo_End1",
        "WW_MoSo_Start2",
        "WW_MoSo_End2",
        "WW_MoSo_Start3",
        "WW_MoSo_End3",
        "WW_MoSo_Start4",
        "WW_MoSo_End4",
        "WW_MoSo_Start5",
        "WW_MoSo_End5",
        "hotWaterCircPumpOnTime",
        "hotWaterCircPumpOffTime"
      ];
      adapter.originalZipConfig = {};
      for (const k of keysToSave) {
        const s = await adapter.getStateAsync((0, import_stateMapping.getDpPath)(k));
        adapter.originalZipConfig[k] = s ? s.val : null;
      }
    }
    const updates = [
      { key: "hotWaterCircPumpTimerTableSelected", raw: 0 },
      { key: "WW_MoSo_Start1", raw: 0 },
      { key: "WW_MoSo_End1", raw: 86340 },
      { key: "WW_MoSo_Start2", raw: 0 },
      { key: "WW_MoSo_End2", raw: 0 },
      { key: "hotWaterCircPumpOnTime", raw: onTimeMinutes },
      { key: "hotWaterCircPumpOffTime", raw: 60 }
    ];
    for (const u of updates) {
      await adapter.queueWrite(parseInt(import_stateMapping.STATE_MAPPING[u.key].luxWriteId, 10), u.raw);
      await new Promise((r) => adapter.setTimeout(r, 100));
    }
  }
  adapter.zipTimer = adapter.setTimeout(async () => {
    await stopZipAndDeaeration(adapter);
  }, durationSeconds * 1e3);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleActivateZip,
  restoreOriginalZipConfig,
  stopZipAndDeaeration
});
//# sourceMappingURL=zipManager.js.map

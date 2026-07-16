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
const CONSTANTS = {
  /** Command ID for the deaeration program */
  CMD_DEAERATE: 158,
  /** Command ID for the circulation pump (ZIP) */
  CMD_ZIP: 684,
  /** Seconds representing the end of a day (23:59:00) */
  END_OF_DAY: 86340,
  /** Delay in milliseconds between consecutive hardware write operations */
  WRITE_DELAY: 100
};
function clearZipTimer(adapter) {
  if (!adapter.zipTimer) {
    return;
  }
  adapter.clearTimeout(adapter.zipTimer);
  adapter.zipTimer = void 0;
}
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
      if (!def || !def.luxWriteId) {
        continue;
      }
      let rawVal = val;
      if (def.role === "value.datetime" && typeof val === "string") {
        const timeMatch = val.match(/^(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
          rawVal = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
        } else {
          rawVal = 0;
        }
      }
      const targetPath = (0, import_stateMapping.getDpPath)(key);
      if (targetPath) {
        await adapter.setState(targetPath, { val, ack: true });
      }
      const luxId = Number(def.luxWriteId);
      if (!isNaN(luxId)) {
        await adapter.queueWrite(luxId, Number(rawVal));
        await new Promise((resolve) => {
          adapter.setTimeout(() => {
            resolve();
          }, CONSTANTS.WRITE_DELAY);
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error restoring ZIP configuration: ${msg}`, "error");
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
        (0, import_logger.writeLog)("Conditions met: Stopping active ZIP macro and deaeration program...", "info");
      }
      clearZipTimer(adapter);
      await restoreOriginalZipConfig(adapter);
      await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 0);
      await new Promise((resolve) => {
        adapter.setTimeout(() => {
          resolve();
        }, CONSTANTS.WRITE_DELAY);
      });
      await adapter.queueWrite(CONSTANTS.CMD_ZIP, 0);
      await new Promise((resolve) => {
        adapter.setTimeout(() => {
          resolve();
        }, CONSTANTS.WRITE_DELAY);
      });
      await adapter.syncConfigValue("runDeaerate", false);
      await adapter.syncConfigValue("hotWaterCircPumpDeaerate", false);
      const dpZip = (0, import_stateMapping.getDpPath)("Activate_Zip");
      if (dpZip) {
        await adapter.setOwnStateIfDifferent(dpZip, false, true);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error stopping ZIP/Deaeration: ${msg}`, "error");
  }
}
async function handleActivateZip(adapter, id, durationSeconds) {
  const localId = id.replace(`${adapter.namespace}.`, "");
  await adapter.setStateAsync(localId, { val: true, ack: true });
  if (durationSeconds <= 0) {
    await adapter.setStateAsync(localId, { val: false, ack: true });
    return;
  }
  const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);
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
  clearZipTimer(adapter);
  if (useDeaeration) {
    await adapter.queueWrite(CONSTANTS.CMD_DEAERATE, 1);
    await new Promise((resolve) => {
      adapter.setTimeout(() => {
        resolve();
      }, CONSTANTS.WRITE_DELAY);
    });
    await adapter.queueWrite(CONSTANTS.CMD_ZIP, 1);
    await adapter.syncConfigValue("runDeaerate", true);
    await adapter.syncConfigValue("hotWaterCircPumpDeaerate", true);
  } else {
    const onTimeMinutes = Math.ceil(safeDurationSeconds / 60);
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
      const states = await Promise.all(keysToSave.map((key) => adapter.getStateAsync((0, import_stateMapping.getDpPath)(key))));
      adapter.originalZipConfig = {};
      keysToSave.forEach((key, index) => {
        if (adapter.originalZipConfig) {
          adapter.originalZipConfig[key] = states[index] ? states[index].val : null;
        }
      });
    }
    const updates = [
      { key: "hotWaterCircPumpTimerTableSelected", raw: 0 },
      { key: "WW_MoSo_Start1", raw: 0 },
      { key: "WW_MoSo_End1", raw: CONSTANTS.END_OF_DAY },
      { key: "WW_MoSo_Start2", raw: 0 },
      { key: "WW_MoSo_End2", raw: 0 },
      { key: "hotWaterCircPumpOnTime", raw: onTimeMinutes },
      { key: "hotWaterCircPumpOffTime", raw: 60 }
    ];
    for (const u of updates) {
      const def = import_stateMapping.STATE_MAPPING[u.key];
      if (def && def.luxWriteId) {
        await adapter.queueWrite(parseInt(def.luxWriteId, 10), u.raw);
        await new Promise((resolve) => {
          adapter.setTimeout(() => {
            resolve();
          }, CONSTANTS.WRITE_DELAY);
        });
      }
    }
  }
  adapter.zipTimer = adapter.setTimeout(async () => {
    await stopZipAndDeaeration(adapter);
  }, safeDurationSeconds * 1e3);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleActivateZip,
  restoreOriginalZipConfig,
  stopZipAndDeaeration
});
//# sourceMappingURL=zipManager.js.map

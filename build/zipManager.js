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
  checkAndHandleMotionSensor: () => checkAndHandleMotionSensor,
  disableHardwareZipTimer: () => disableHardwareZipTimer,
  handleActivateZip: () => handleActivateZip,
  restoreOriginalZipConfig: () => restoreOriginalZipConfig,
  stopZipAndDeaeration: () => stopZipAndDeaeration,
  subscribeMotionSensors: () => subscribeMotionSensors
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
async function safeRawWrite(adapter, key, luxId, rawValue) {
  const dpPath = (0, import_stateMapping.getDpPath)(key);
  if (!dpPath) {
    return;
  }
  const state = await adapter.getStateAsync(dpPath);
  if (state && state.val !== null) {
    let currentRaw = null;
    if (typeof state.val === "boolean") {
      currentRaw = state.val ? 1 : 0;
    } else if (typeof state.val === "number") {
      currentRaw = state.val;
    } else if (typeof state.val === "string") {
      const timeMatch = state.val.match(/^(\d{1,2}):(\d{1,2})/);
      if (timeMatch) {
        currentRaw = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
      }
    }
    if (currentRaw === rawValue) {
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(
          `[SafeWrite] Wert f\xFCr '${key}' ist bereits auf Zielwert (${rawValue}). Schreibvorgang blockiert!`,
          "debug"
        );
      }
      return;
    }
  }
  if (adapter.isDebugLogActive) {
    (0, import_logger.writeLog)(`[SafeWrite] \xC4nderung erkannt. Schreibe ${rawValue} in Register ${luxId} (${key})...`, "debug");
  }
  await adapter.queueWrite(luxId, rawValue);
  await new Promise((resolve) => {
    adapter.setTimeout(resolve, CONSTANTS.WRITE_DELAY);
  });
}
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
  const actors = adapter.config.actors || [];
  const validActors = actors.filter((a) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== "");
  if (validActors.length > 0) {
    try {
      for (const actor of validActors) {
        await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
      }
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(`[ZIP] Not-Aus f\xFCr externe Relais gesendet.`, "debug");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`[ZIP] Fehler beim Ausschalten der externen Relais: ${msg}`, "error");
    }
  }
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
      await safeRawWrite(adapter, "runDeaerate", CONSTANTS.CMD_DEAERATE, 0);
      await safeRawWrite(adapter, "hotWaterCircPumpDeaerate", CONSTANTS.CMD_ZIP, 0);
      const dpDeaerate = (0, import_stateMapping.getDpPath)("runDeaerate");
      const dpCircDeaerate = (0, import_stateMapping.getDpPath)("hotWaterCircPumpDeaerate");
      if (dpDeaerate) {
        await adapter.setOwnStateIfDifferent(dpDeaerate, false, true);
      }
      if (dpCircDeaerate) {
        await adapter.setOwnStateIfDifferent(dpCircDeaerate, false, true);
      }
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
  const actors = adapter.config.actors || [];
  const validActors = actors.filter((a) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== "");
  let isZipAlreadyRunning = false;
  if (validActors.length > 0) {
    for (const actor of validActors) {
      try {
        const foreignState = await adapter.getForeignStateAsync(actor.zip_external_relay_id);
        if (foreignState && foreignState.val === true) {
          isZipAlreadyRunning = true;
          break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(
            `[ZIP] Konnte Status des externen Relais ${actor.zip_external_relay_id} nicht lesen: ${msg}`,
            "debug"
          );
        }
      }
    }
  } else {
    try {
      const internalZip = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("ZIPout"));
      if (internalZip && (internalZip.val === 1 || internalZip.val === true)) {
        isZipAlreadyRunning = true;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(`[ZIP] ${msg}`, "debug");
      }
    }
  }
  const localId = id.replace(`${adapter.namespace}.`, "");
  await adapter.setState(localId, { val: true, ack: true });
  if (durationSeconds <= 0) {
    await adapter.setState(localId, { val: false, ack: true });
    return;
  }
  const safeDurationSeconds = Math.max(1, isNaN(durationSeconds) ? 60 : durationSeconds);
  if (isZipAlreadyRunning) {
    if (adapter.isDebugLogActive) {
      (0, import_logger.writeLog)(
        "[ZIP] Zirkulationspumpe l\xE4uft bereits. Verl\xE4ngere Timer, \xFCberspringe erneuten Start-Befehl.",
        "debug"
      );
    }
    if (adapter.zipTimer) {
      adapter.clearTimeout(adapter.zipTimer);
    }
    adapter.zipTimer = adapter.setTimeout(async () => {
      if (validActors.length > 0) {
        for (const actor of validActors) {
          try {
            await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            (0, import_logger.writeLog)(`[ZIP] Fehler beim Ausschalten des Relais: ${msg}`, "error");
          }
        }
        if (adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(`[ZIP] Zeit abgelaufen. Externe Relais ausgeschaltet.`, "debug");
        }
      } else {
        await stopZipAndDeaeration(adapter);
      }
    }, safeDurationSeconds * 1e3);
    return;
  }
  if (validActors.length > 0) {
    if (adapter.isDebugLogActive) {
      (0, import_logger.writeLog)(`[ZIP] Externer Relais-Modus aktiv. Schalte ${validActors.length} Aktor(en) auf TRUE`, "debug");
    }
    for (const actor of validActors) {
      try {
        await adapter.setForeignStateAsync(actor.zip_external_relay_id, true, false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, import_logger.writeLog)(`[ZIP] Fehler beim Einschalten von ${actor.zip_external_relay_id}: ${msg}`, "error");
      }
    }
    if (adapter.zipTimer) {
      adapter.clearTimeout(adapter.zipTimer);
    }
    adapter.zipTimer = adapter.setTimeout(async () => {
      for (const actor of validActors) {
        try {
          await adapter.setForeignStateAsync(actor.zip_external_relay_id, false, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          (0, import_logger.writeLog)(`[ZIP] Fehler beim Ausschalten von ${actor.zip_external_relay_id}: ${msg}`, "error");
        }
      }
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(`[ZIP] Zeit abgelaufen. Externe Relais ausgeschaltet.`, "debug");
      }
    }, safeDurationSeconds * 1e3);
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
  clearZipTimer(adapter);
  if (useDeaeration) {
    await safeRawWrite(adapter, "runDeaerate", CONSTANTS.CMD_DEAERATE, 1);
    await safeRawWrite(adapter, "hotWaterCircPumpDeaerate", CONSTANTS.CMD_ZIP, 1);
    const dpDeaerate = (0, import_stateMapping.getDpPath)("runDeaerate");
    const dpCircDeaerate = (0, import_stateMapping.getDpPath)("hotWaterCircPumpDeaerate");
    if (dpDeaerate) {
      await adapter.setOwnStateIfDifferent(dpDeaerate, true, true);
    }
    if (dpCircDeaerate) {
      await adapter.setOwnStateIfDifferent(dpCircDeaerate, true, true);
    }
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
        await safeRawWrite(adapter, u.key, parseInt(def.luxWriteId, 10), u.raw);
      }
    }
  }
  adapter.zipTimer = adapter.setTimeout(async () => {
    await stopZipAndDeaeration(adapter);
  }, safeDurationSeconds * 1e3);
}
function subscribeMotionSensors(adapter) {
  const config = adapter.config;
  if (config.motion_sensors_aktiv && Array.isArray(config.motionSensors)) {
    for (const sensor of config.motionSensors) {
      if (sensor.oid && typeof sensor.oid === "string" && sensor.oid.trim() !== "") {
        adapter.subscribeForeignStates(sensor.oid.trim());
        if (adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(`Motion sensor subscribed: ${sensor.name} (${sensor.oid})`, "info");
        }
      }
    }
  }
}
async function checkAndHandleMotionSensor(adapter, id, state) {
  const config = adapter.config;
  if (!config.motion_sensors_aktiv || !config.motionSensors || !Array.isArray(config.motionSensors)) {
    return false;
  }
  const matchedSensor = config.motionSensors.find((s) => s.oid && s.oid.trim() === id);
  if (!matchedSensor) {
    return false;
  }
  if (state.val === true) {
    const zipOutState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("ZIPout"));
    if (zipOutState && zipOutState.val === 1) {
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(
          `Motion registered at sensor '${matchedSensor.name}' but circulation pump ZIP is already running. Action ignored.`,
          "debug"
        );
      }
      return true;
    }
    const now = Date.now();
    const lastZipChange = (zipOutState == null ? void 0 : zipOutState.lc) || 0;
    if (now - lastZipChange > (config.zip_last_run_min || 600) * 1e3) {
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(
          `Motion registered at sensor '${matchedSensor.name || id}'. Launching circulation pump ZIP macro sequence.`,
          "debug"
        );
      }
      await adapter.setState((0, import_stateMapping.getDpPath)("Activate_Zip"), {
        val: true,
        ack: false
      });
    } else {
      if (adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(
          `Motion registered at sensor '${matchedSensor.name || id}' but circulation pump execution suppressed due to anti-cycling protective interval timer.`,
          "debug"
        );
      }
    }
  }
  return true;
}
async function disableHardwareZipTimer(adapter) {
  const config = adapter.config;
  if (config.zip_hardware_timer_disable === true) {
    if (adapter.isDebugLogActive) {
      (0, import_logger.writeLog)("Applying safe hardware defaults for ZIP timers (disabling standard schedule)...", "info");
    }
    try {
      await safeRawWrite(adapter, "hotWaterCircPumpTimerTableSelected", 506, 0);
      await adapter.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("hotWaterCircPumpTimerTableSelected"), 0, true);
      await safeRawWrite(adapter, "hotWaterCircPumpOnTime", 697, 0);
      await adapter.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("hotWaterCircPumpOnTime"), 0, true);
      await safeRawWrite(adapter, "hotWaterCircPumpOffTime", 698, 60);
      await adapter.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("hotWaterCircPumpOffTime"), 60, true);
      const timeIds = [
        { key: "Zirkulation_MoSo_Start1", id: 507 },
        { key: "Zirkulation_MoSo_End1", id: 508 },
        { key: "Zirkulation_MoSo_Start2", id: 509 },
        { key: "Zirkulation_MoSo_End2", id: 510 },
        { key: "Zirkulation_MoSo_Start3", id: 511 },
        { key: "Zirkulation_MoSo_End3", id: 512 },
        { key: "Zirkulation_MoSo_Start4", id: 513 },
        { key: "Zirkulation_MoSo_End4", id: 514 },
        { key: "Zirkulation_MoSo_Start5", id: 515 },
        { key: "Zirkulation_MoSo_End5", id: 516 }
      ];
      for (const t of timeIds) {
        await safeRawWrite(adapter, t.key, t.id, 0);
        await adapter.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)(t.key), "00:00", true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`Error applying safe ZIP defaults: ${msg}`, "error");
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAndHandleMotionSensor,
  disableHardwareZipTimer,
  handleActivateZip,
  restoreOriginalZipConfig,
  stopZipAndDeaeration,
  subscribeMotionSensors
});
//# sourceMappingURL=zipManager.js.map

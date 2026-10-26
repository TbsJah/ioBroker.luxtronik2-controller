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
var pvManager_exports = {};
__export(pvManager_exports, {
  forceResetPvBoost: () => forceResetPvBoost,
  handlePvCycleCheck: () => handlePvCycleCheck,
  handlePvFeedInChange: () => handlePvFeedInChange,
  initPvManagement: () => initPvManagement,
  pvIsBoostActive: () => pvIsBoostActive,
  pvWaitingForCycleEnd: () => pvWaitingForCycleEnd
});
module.exports = __toCommonJS(pvManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
let pvStartTimer;
let pvStopTimer;
let pvIsBoostActive = false;
let pvWaitingForCycleEnd = false;
let activeBoostWwApplied = false;
let activeBoostHzApplied = false;
let currentGridSurplusW = 0;
let currentBatteryChargeW = 0;
let originalWw = null;
let originalHz = null;
async function initPvManagement(adapter) {
  const config = adapter.config;
  if (!config.pv_active || !config.pv_feed_in_dp || config.pv_feed_in_dp.trim() === "") {
    (0, import_logger.writeLog)("[PV] PV surplus management is disabled or no valid datapoint provided.", "debug");
    return;
  }
  try {
    currentGridSurplusW = 0;
    currentBatteryChargeW = 0;
    pvIsBoostActive = false;
    pvWaitingForCycleEnd = false;
    activeBoostWwApplied = false;
    activeBoostHzApplied = false;
    const gridDp = config.pv_feed_in_dp.trim();
    await adapter.subscribeForeignStatesAsync(gridDp);
    (0, import_logger.writeLog)(`[PV] Initialized PV management. Subscribed to grid feed-in: ${gridDp}`, "info");
    try {
      const initialGridState = await adapter.getForeignStateAsync(gridDp);
      if (initialGridState) {
        handlePvFeedInChange(adapter, gridDp, initialGridState);
      }
    } catch {
    }
    if (config.pv_battery_active && config.pv_battery_dp && config.pv_battery_dp.trim() !== "") {
      const batDp = config.pv_battery_dp.trim();
      await adapter.subscribeForeignStatesAsync(batDp);
      (0, import_logger.writeLog)(`[PV] Battery prioritization active. Subscribed to battery datapoint: ${batDp}`, "info");
      try {
        const initialBatState = await adapter.getForeignStateAsync(batDp);
        if (initialBatState) {
          handlePvFeedInChange(adapter, batDp, initialBatState);
        }
      } catch {
      }
    }
    const dpActive = (0, import_stateMapping.getDpPath)("pv_boost_active");
    const dpSince = (0, import_stateMapping.getDpPath)("pv_boost_active_since");
    if (dpActive) {
      await adapter.setState(dpActive, { val: false, ack: true });
    }
    if (dpSince) {
      await adapter.setState(dpSince, { val: "", ack: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error initializing PV management: ${msg}`, "error");
  }
}
function handlePvFeedInChange(adapter, id, state) {
  var _a, _b;
  const config = adapter.config;
  if (!config.pv_active || !state || typeof state.val !== "number") {
    return;
  }
  const isGridDp = id === ((_a = config.pv_feed_in_dp) == null ? void 0 : _a.trim());
  const isBatteryDp = config.pv_battery_active && id === ((_b = config.pv_battery_dp) == null ? void 0 : _b.trim());
  if (!isGridDp && !isBatteryDp) {
    return;
  }
  let rawValue = state.val;
  if (isGridDp) {
    if (config.pv_feed_in_unit === "kW") {
      rawValue *= 1e3;
    }
    if (config.pv_feed_in_sign === "negative") {
      currentGridSurplusW = rawValue < 0 ? Math.abs(rawValue) : 0;
    } else {
      currentGridSurplusW = rawValue > 0 ? rawValue : 0;
    }
  }
  if (isBatteryDp) {
    if (config.pv_battery_unit === "kW") {
      rawValue *= 1e3;
    }
    if (config.pv_battery_sign === "negative") {
      currentBatteryChargeW = rawValue < 0 ? Math.abs(rawValue) : 0;
    } else {
      currentBatteryChargeW = rawValue > 0 ? rawValue : 0;
    }
  }
  const totalSurplus = currentGridSurplusW + currentBatteryChargeW;
  const thresholdStart = config.pv_threshold_start || 2e3;
  const thresholdStop = config.pv_threshold_stop !== void 0 ? Number(config.pv_threshold_stop) : 0;
  const delayStartMs = (config.pv_delay_start || 5) * 6e4;
  const delayStopMs = (config.pv_delay_stop || 10) * 6e4;
  if (totalSurplus >= thresholdStart) {
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
      (0, import_logger.writeLog)(
        `[PV] Surplus restored (${totalSurplus} W >= ${thresholdStart} W). Stop timer cancelled.`,
        "debug"
      );
    }
    if (!pvIsBoostActive && !pvStartTimer) {
      (0, import_logger.writeLog)(
        `[PV] Surplus of ${totalSurplus} W exceeds start threshold (${thresholdStart} W). Starting ${config.pv_delay_start} min activation timer.`,
        "info"
      );
      pvStartTimer = adapter.setTimeout(() => activateBoost(adapter), delayStartMs);
    } else if (pvIsBoostActive) {
      void evaluatePvBoost(adapter);
    }
  } else if (totalSurplus <= thresholdStop) {
    if (pvStartTimer) {
      adapter.clearTimeout(pvStartTimer);
      pvStartTimer = void 0;
      (0, import_logger.writeLog)(
        `[PV] Surplus dropped to ${totalSurplus} W (<= ${thresholdStop} W). Start timer cancelled.`,
        "debug"
      );
    }
    if (pvIsBoostActive && !pvStopTimer && !pvWaitingForCycleEnd) {
      (0, import_logger.writeLog)(
        `[PV] Surplus dropped to ${totalSurplus} W (<= stop threshold ${thresholdStop} W). Starting ${config.pv_delay_stop} min deactivation timer.`,
        "info"
      );
      pvStopTimer = adapter.setTimeout(() => initiateDeactivation(adapter), delayStopMs);
    }
  } else {
    if (pvStartTimer) {
      adapter.clearTimeout(pvStartTimer);
      pvStartTimer = void 0;
      (0, import_logger.writeLog)(`[PV] Surplus ${totalSurplus} W is below start threshold. Start timer cancelled.`, "debug");
    }
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
      (0, import_logger.writeLog)(`[PV] Surplus ${totalSurplus} W is above stop threshold. Stop timer cancelled.`, "debug");
    }
    if (pvIsBoostActive) {
      void evaluatePvBoost(adapter);
    }
  }
}
async function activateBoost(adapter) {
  pvStartTimer = void 0;
  if (pvIsBoostActive) {
    return;
  }
  const config = adapter.config;
  try {
    const wwPath = (0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll");
    const hzPath = (0, import_stateMapping.getDpPath)("heating_temperature");
    const currentWwState = wwPath ? await adapter.getStateAsync(wwPath) : null;
    const currentHzState = hzPath ? await adapter.getStateAsync(hzPath) : null;
    let baseWw = currentWwState && typeof currentWwState.val === "number" ? currentWwState.val : null;
    let baseHz = currentHzState && typeof currentHzState.val === "number" ? currentHzState.val : null;
    if (config.idle_defaults_aktiv) {
      if (config.sync_warmwater_target_temperature) {
        baseWw = Number(config.sync_warmwater_target_temperature);
      }
      if (config.fusspunkt) {
        baseHz = Number(config.fusspunkt);
      }
    }
    originalWw = baseWw;
    originalHz = baseHz;
    pvIsBoostActive = true;
    pvWaitingForCycleEnd = false;
    activeBoostWwApplied = false;
    activeBoostHzApplied = false;
    (0, import_logger.writeLog)("[PV] Timer finished. Activating boost logic...", "info");
    await evaluatePvBoost(adapter);
    const nowStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    const dpActive = (0, import_stateMapping.getDpPath)("pv_boost_active");
    const dpSince = (0, import_stateMapping.getDpPath)("pv_boost_active_since");
    const dpLast = (0, import_stateMapping.getDpPath)("pv_boost_last_activation");
    if (dpActive) {
      await adapter.setState(dpActive, { val: true, ack: true });
    }
    if (dpSince) {
      await adapter.setState(dpSince, { val: nowStr, ack: true });
    }
    if (dpLast) {
      await adapter.setState(dpLast, { val: nowStr, ack: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error activating boost: ${msg}`, "error");
  }
}
async function evaluatePvBoost(adapter) {
  if (!pvIsBoostActive) {
    return;
  }
  try {
    const config = adapter.config;
    const priority = config.pv_priority || "both";
    const boostWwAmount = Number(config.pv_boost_ww) || 0;
    const boostHzAmount = Number(config.pv_boost_hz) || 0;
    const wwPath = (0, import_stateMapping.getDpPath)("temperature_hot_water_target");
    const hzPath = (0, import_stateMapping.getDpPath)("heating_temperature");
    const wwIstState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist"));
    const hzIstState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return"));
    const wwIst = wwIstState && typeof wwIstState.val === "number" ? wwIstState.val : 0;
    const hzIst = hzIstState && typeof hzIstState.val === "number" ? hzIstState.val : 0;
    const isWwFull = originalWw !== null && wwIst >= originalWw + boostWwAmount - 0.5;
    const isHzFull = originalHz !== null && hzIst >= originalHz + boostHzAmount - 0.5;
    let shouldBoostWw = false;
    let shouldBoostHz = false;
    if (priority === "ww") {
      if (!isWwFull) {
        shouldBoostWw = true;
      } else {
        shouldBoostHz = true;
      }
    } else if (priority === "hz") {
      if (!isHzFull) {
        shouldBoostHz = true;
      } else {
        shouldBoostWw = true;
      }
    } else {
      shouldBoostWw = !isWwFull;
      shouldBoostHz = !isHzFull;
    }
    if (shouldBoostWw && !activeBoostWwApplied && originalWw !== null && boostWwAmount > 0 && wwPath) {
      await adapter.setState(wwPath, { val: originalWw + boostWwAmount, ack: false });
      activeBoostWwApplied = true;
      (0, import_logger.writeLog)(`[PV] Priority logic: Applying Hot Water boost (+${boostWwAmount}K).`, "info");
    } else if (!shouldBoostWw && activeBoostWwApplied && originalWw !== null && wwPath) {
      await adapter.setState(wwPath, { val: originalWw, ack: false });
      activeBoostWwApplied = false;
      (0, import_logger.writeLog)(`[PV] Priority logic: Target reached. Revoking Hot Water boost.`, "info");
    }
    if (shouldBoostHz && !activeBoostHzApplied && originalHz !== null && boostHzAmount > 0 && hzPath) {
      await adapter.setState(hzPath, { val: originalHz + boostHzAmount, ack: false });
      activeBoostHzApplied = true;
      (0, import_logger.writeLog)(`[PV] Priority logic: Applying Heating boost (+${boostHzAmount}K).`, "info");
    } else if (!shouldBoostHz && activeBoostHzApplied && originalHz !== null && hzPath) {
      await adapter.setState(hzPath, { val: originalHz, ack: false });
      activeBoostHzApplied = false;
      (0, import_logger.writeLog)(`[PV] Priority logic: Target reached. Revoking Heating boost.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error evaluating boost priority: ${msg}`, "error");
  }
}
async function initiateDeactivation(adapter) {
  pvStopTimer = void 0;
  if (!pvIsBoostActive) {
    return;
  }
  const config = adapter.config;
  (0, import_logger.writeLog)("[PV] Deactivation timer finished.", "info");
  if (config.pv_finish_cycle) {
    try {
      const bzPath = (0, import_stateMapping.getDpPath)("WP_BZ_akt");
      const bzState = bzPath ? await adapter.getStateAsync(bzPath) : null;
      const bzVal = bzState ? Number(bzState.val) : 5;
      if (bzVal !== 5) {
        (0, import_logger.writeLog)(
          `[PV] Compressor is active (Status: ${bzVal}). Waiting for cycle to finish before resetting values.`,
          "info"
        );
        pvWaitingForCycleEnd = true;
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`[PV] Error checking compressor status: ${msg}`, "error");
    }
  }
  await deactivateBoost(adapter);
}
async function deactivateBoost(adapter) {
  try {
    (0, import_logger.writeLog)("[PV] Reverting values to original base targets.", "info");
    const wwPath = (0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll");
    const hzPath = (0, import_stateMapping.getDpPath)("heating_temperature");
    if (originalWw !== null && wwPath) {
      await adapter.setState(wwPath, { val: originalWw, ack: false });
    }
    if (originalHz !== null && hzPath) {
      await adapter.setState(hzPath, { val: originalHz, ack: false });
    }
    pvIsBoostActive = false;
    pvWaitingForCycleEnd = false;
    activeBoostWwApplied = false;
    activeBoostHzApplied = false;
    originalWw = null;
    originalHz = null;
    const dpActive = (0, import_stateMapping.getDpPath)("pv_boost_active");
    const dpSince = (0, import_stateMapping.getDpPath)("pv_boost_active_since");
    if (dpActive) {
      await adapter.setState(dpActive, { val: false, ack: true });
    }
    if (dpSince) {
      await adapter.setState(dpSince, { val: "", ack: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error deactivating boost: ${msg}`, "error");
  }
}
async function handlePvCycleCheck(adapter, newBzVal) {
  if (pvWaitingForCycleEnd && newBzVal === 5) {
    (0, import_logger.writeLog)("[PV] Compressor finished cycle (Status: 5). Resetting PV boost targets now.", "info");
    await deactivateBoost(adapter);
  }
}
async function forceResetPvBoost(adapter) {
  if (pvIsBoostActive) {
    (0, import_logger.writeLog)("[PV] Manual override triggered. Cancelling active PV boost...", "info");
    if (pvStartTimer) {
      adapter.clearTimeout(pvStartTimer);
      pvStartTimer = void 0;
    }
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
    }
    await deactivateBoost(adapter);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  forceResetPvBoost,
  handlePvCycleCheck,
  handlePvFeedInChange,
  initPvManagement,
  pvIsBoostActive,
  pvWaitingForCycleEnd
});
//# sourceMappingURL=pvManager.js.map

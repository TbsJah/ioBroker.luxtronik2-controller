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
  evaluatePvBoost: () => evaluatePvBoost,
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
function parseConfigFloat(val, fallback = 0) {
  if (typeof val === "number" && !isNaN(val)) {
    return val;
  }
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = parseFloat(val.replace(",", "."));
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}
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
    const dpActive = (0, import_stateMapping.getDpPath)("pv_boost_active");
    const dpSince = (0, import_stateMapping.getDpPath)("pv_boost_active_since");
    const prevActiveState = dpActive ? await adapter.getStateAsync(dpActive) : null;
    if ((prevActiveState == null ? void 0 : prevActiveState.val) === true || config.idle_defaults_aktiv) {
      const defaultWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
      (0, import_logger.writeLog)(`[PV] Ensuring clean baseline on startup (WW: ${defaultWw}\xB0C, Heating Offset: 0K).`, "info");
      await adapter.syncConfigValue("temperature_hot_water_target", defaultWw);
      await adapter.syncConfigValue("heating_temperature", 0);
    }
    if (dpActive) {
      await adapter.setState(dpActive, { val: false, ack: true });
    }
    if (dpSince) {
      await adapter.setState(dpSince, { val: "", ack: true });
    }
    const gridDp = config.pv_feed_in_dp.trim();
    await adapter.subscribeForeignStatesAsync(gridDp);
    (0, import_logger.writeLog)(`[PV] Initialized PV management. Subscribed to grid feed-in: ${gridDp}`, "info");
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
    try {
      const initialGridState = await adapter.getForeignStateAsync(gridDp);
      if (initialGridState) {
        handlePvFeedInChange(adapter, gridDp, initialGridState);
      }
    } catch {
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error initializing PV management: ${msg}`, "error");
  }
}
function handlePvFeedInChange(adapter, id, state) {
  var _a, _b;
  const config = adapter.config;
  if (!config.pv_active || !state || state.val === null || state.val === void 0) {
    return;
  }
  const isGridDp = id === ((_a = config.pv_feed_in_dp) == null ? void 0 : _a.trim());
  const isBatteryDp = config.pv_battery_active && id === ((_b = config.pv_battery_dp) == null ? void 0 : _b.trim());
  if (!isGridDp && !isBatteryDp) {
    return;
  }
  let rawValue = parseConfigFloat(state.val, NaN);
  if (isNaN(rawValue)) {
    return;
  }
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
  const totalSurplus = Math.round(currentGridSurplusW + currentBatteryChargeW);
  const thresholdStart = parseConfigFloat(config.pv_threshold_start, 2e3);
  const thresholdStop = parseConfigFloat(config.pv_threshold_stop, 0);
  const delayStartMs = parseConfigFloat(config.pv_delay_start, 5) * 6e4;
  const delayStopMs = parseConfigFloat(config.pv_delay_stop, 10) * 6e4;
  if (totalSurplus >= thresholdStart) {
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
      (0, import_logger.writeLog)(`[PV] Surplus restored (${totalSurplus} W >= ${thresholdStart} W). Stop timer cancelled.`, "info");
    }
    pvWaitingForCycleEnd = false;
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
  const thresholdStart = parseConfigFloat(config.pv_threshold_start, 2e3);
  const totalSurplus = currentGridSurplusW + currentBatteryChargeW;
  if (totalSurplus < thresholdStart) {
    (0, import_logger.writeLog)(
      `[PV] Activation aborted: Current surplus (${totalSurplus} W) is below start threshold (${thresholdStart} W).`,
      "info"
    );
    return;
  }
  try {
    originalWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
    originalHz = parseConfigFloat(config.sync_heating_temperature, 0);
    pvIsBoostActive = true;
    pvWaitingForCycleEnd = false;
    activeBoostWwApplied = false;
    activeBoostHzApplied = false;
    (0, import_logger.writeLog)(
      `[PV] Timer finished. Activating boost logic with clean config base (WW: ${originalWw}\xB0C, Hz: ${originalHz}K)...`,
      "info"
    );
    await evaluatePvBoost(adapter, true);
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
async function evaluatePvBoost(adapter, forceReapply = false) {
  if (!pvIsBoostActive || pvWaitingForCycleEnd) {
    return;
  }
  try {
    const config = adapter.config;
    const priority = config.pv_priority || "both";
    const boostWwAmount = parseConfigFloat(config.pv_boost_ww, 0);
    const boostHzAmount = parseConfigFloat(config.pv_boost_hz, 0);
    const wwDone = activeBoostWwApplied || boostWwAmount <= 0;
    const hzDone = activeBoostHzApplied || boostHzAmount <= 0;
    if (!forceReapply && wwDone && hzDone) {
      return;
    }
    const [wwIstState, rlIstState, rlSollState, hzHystState, hzLimitState, mittelTempState, threshLimitState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("heatingLimit")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Mitteltemperatur")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("thresholdHeatingLimit"))
    ]);
    const wwIst = wwIstState && typeof wwIstState.val === "number" ? wwIstState.val : 0;
    const rlIst = rlIstState && typeof rlIstState.val === "number" ? rlIstState.val : 0;
    const rlSoll = rlSollState && typeof rlSollState.val === "number" ? rlSollState.val : 0;
    const hzHyst = hzHystState && typeof hzHystState.val === "number" ? hzHystState.val : 1.5;
    const heatingBlockedByLimit = Number(hzLimitState == null ? void 0 : hzLimitState.val) === 1 && Number(mittelTempState == null ? void 0 : mittelTempState.val) >= Number(threshLimitState == null ? void 0 : threshLimitState.val);
    const isWwFull = boostWwAmount <= 0 || originalWw !== null && wwIst >= originalWw + boostWwAmount;
    const isHzFull = boostHzAmount <= 0 || heatingBlockedByLimit || rlSoll > 0 && rlIst >= rlSoll + hzHyst;
    let shouldBoostWw = false;
    let shouldBoostHz = false;
    if (priority === "ww") {
      shouldBoostWw = true;
      if (isWwFull || activeBoostHzApplied) {
        shouldBoostHz = true;
      }
    } else if (priority === "hz") {
      shouldBoostHz = true;
      if (isHzFull || activeBoostWwApplied) {
        shouldBoostWw = true;
      }
    } else {
      shouldBoostWw = true;
      shouldBoostHz = true;
    }
    if (shouldBoostWw && (!activeBoostWwApplied || forceReapply) && originalWw !== null && boostWwAmount > 0) {
      await adapter.syncConfigValue("temperature_hot_water_target", originalWw + boostWwAmount);
      activeBoostWwApplied = true;
      (0, import_logger.writeLog)(
        `[PV] Priority logic: Applying Hot Water boost (+${boostWwAmount}K -> ${originalWw + boostWwAmount}\xB0C).`,
        "info"
      );
    } else if (!shouldBoostWw && activeBoostWwApplied && originalWw !== null) {
      await adapter.syncConfigValue("temperature_hot_water_target", originalWw);
      activeBoostWwApplied = false;
      (0, import_logger.writeLog)(`[PV] Priority logic: Target reached. Revoking Hot Water boost.`, "info");
    }
    if (shouldBoostHz && (!activeBoostHzApplied || forceReapply) && originalHz !== null && boostHzAmount > 0) {
      await adapter.syncConfigValue("heating_temperature", originalHz + boostHzAmount);
      activeBoostHzApplied = true;
      (0, import_logger.writeLog)(
        `[PV] Priority logic: Applying Heating boost (+${boostHzAmount}K -> ${originalHz + boostHzAmount}K).`,
        "info"
      );
    } else if (!shouldBoostHz && activeBoostHzApplied && originalHz !== null) {
      await adapter.syncConfigValue("heating_temperature", originalHz);
      activeBoostHzApplied = false;
      (0, import_logger.writeLog)(`[PV] Priority logic: Target reached. Revoking Heating boost.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error evaluating boost priority: ${msg}`, "error");
  }
}
async function deactivateBoost(adapter) {
  try {
    const config = adapter.config;
    const targetWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
    const targetHz = parseConfigFloat(config.sync_heating_temperature, 0);
    (0, import_logger.writeLog)(`[PV] Reverting values to original base targets (WW: ${targetWw}\xB0C, Hz: ${targetHz}K).`, "info");
    await adapter.syncConfigValue("temperature_hot_water_target", targetWw);
    await adapter.syncConfigValue("heating_temperature", targetHz);
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
async function initiateDeactivation(adapter) {
  pvStopTimer = void 0;
  if (!pvIsBoostActive) {
    return;
  }
  const config = adapter.config;
  const targetWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
  const targetHz = parseConfigFloat(config.sync_heating_temperature, 0);
  (0, import_logger.writeLog)("[PV] Deactivation timer finished.", "info");
  if (config.pv_finish_cycle) {
    try {
      const bzPath = (0, import_stateMapping.getDpPath)("WP_BZ_akt");
      const bzState = bzPath ? await adapter.getStateAsync(bzPath) : null;
      const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : 5;
      const runningMinutes = (bzState == null ? void 0 : bzState.lc) ? (Date.now() - bzState.lc) / 6e4 : 999;
      if (bzVal === 0 || bzVal === 4) {
        await adapter.syncConfigValue("temperature_hot_water_target", targetWw);
        activeBoostWwApplied = false;
      } else if (bzVal === 1) {
        await adapter.syncConfigValue("heating_temperature", targetHz);
        activeBoostHzApplied = false;
      }
      if (bzVal !== 5 && runningMinutes < 10) {
        const remainingMs = Math.max(1e4, Math.ceil((10 - runningMinutes) * 6e4));
        (0, import_logger.writeLog)(
          `[PV] Compressor running for ${Math.round(runningMinutes)} min (< 10 min minimum runtime). Delaying final reset by ${Math.ceil(remainingMs / 6e4)} min.`,
          "info"
        );
        pvWaitingForCycleEnd = true;
        pvStopTimer = adapter.setTimeout(() => {
          pvStopTimer = void 0;
          void deactivateBoost(adapter);
        }, remainingMs);
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`[PV] Error checking compressor status: ${msg}`, "error");
    }
  }
  await deactivateBoost(adapter);
}
async function handlePvCycleCheck(adapter, newBzVal) {
  if (pvWaitingForCycleEnd && newBzVal === 5) {
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
    }
    (0, import_logger.writeLog)("[PV] Compressor finished cycle (Status: 5). Resetting PV boost targets now.", "info");
    await deactivateBoost(adapter);
  }
}
async function forceResetPvBoost(adapter) {
  if (pvIsBoostActive || pvStartTimer || pvStopTimer) {
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
  evaluatePvBoost,
  forceResetPvBoost,
  handlePvCycleCheck,
  handlePvFeedInChange,
  initPvManagement,
  pvIsBoostActive,
  pvWaitingForCycleEnd
});
//# sourceMappingURL=pvManager.js.map

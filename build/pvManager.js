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
let originalWw = null;
let originalHz = null;
async function initPvManagement(adapter) {
  const config = adapter.config;
  if (!config.pv_active || !config.pv_feed_in_dp || config.pv_feed_in_dp.trim() === "") {
    (0, import_logger.writeLog)("[PV] PV surplus management is disabled or no valid datapoint provided.", "debug");
    return;
  }
  try {
    await adapter.subscribeForeignStatesAsync(config.pv_feed_in_dp.trim());
    (0, import_logger.writeLog)(
      `[PV] Initialized PV management. Subscribed to grid feed-in datapoint: ${config.pv_feed_in_dp}`,
      "info"
    );
    pvIsBoostActive = false;
    pvWaitingForCycleEnd = false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error initializing PV management: ${msg}`, "error");
  }
}
function handlePvFeedInChange(adapter, id, state) {
  const config = adapter.config;
  if (!config.pv_active || !config.pv_feed_in_dp || id !== config.pv_feed_in_dp.trim() || !state || typeof state.val !== "number") {
    return;
  }
  let surplus = 0;
  if (config.pv_feed_in_sign === "negative") {
    surplus = state.val < 0 ? Math.abs(state.val) : 0;
  } else {
    surplus = state.val > 0 ? state.val : 0;
  }
  const threshold = config.pv_threshold_start || 2e3;
  const delayStartMs = (config.pv_delay_start || 5) * 6e4;
  const delayStopMs = (config.pv_delay_stop || 10) * 6e4;
  if (surplus >= threshold) {
    if (pvStopTimer) {
      adapter.clearTimeout(pvStopTimer);
      pvStopTimer = void 0;
      (0, import_logger.writeLog)(`[PV] Surplus restored (${surplus} W). Stop timer cancelled.`, "debug");
    }
    if (!pvIsBoostActive && !pvStartTimer) {
      (0, import_logger.writeLog)(
        `[PV] Surplus of ${surplus} W exceeds threshold (${threshold} W). Starting ${config.pv_delay_start} min activation timer.`,
        "info"
      );
      pvStartTimer = adapter.setTimeout(() => activateBoost(adapter), delayStartMs);
    }
  } else {
    if (pvStartTimer) {
      adapter.clearTimeout(pvStartTimer);
      pvStartTimer = void 0;
      (0, import_logger.writeLog)(`[PV] Surplus dropped to ${surplus} W. Start timer cancelled.`, "debug");
    }
    if (pvIsBoostActive && !pvStopTimer && !pvWaitingForCycleEnd) {
      (0, import_logger.writeLog)(
        `[PV] Surplus dropped to ${surplus} W (below ${threshold} W). Starting ${config.pv_delay_stop} min deactivation timer.`,
        "info"
      );
      pvStopTimer = adapter.setTimeout(() => initiateDeactivation(adapter), delayStopMs);
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
    originalWw = currentWwState && typeof currentWwState.val === "number" ? currentWwState.val : null;
    originalHz = currentHzState && typeof currentHzState.val === "number" ? currentHzState.val : null;
    const boostWw = config.pv_boost_ww || 0;
    const boostHz = config.pv_boost_hz || 0;
    (0, import_logger.writeLog)(`[PV] Timer finished. Activating boost! WW: +${boostWw}K, HZ: +${boostHz}K`, "info");
    if (originalWw !== null && boostWw > 0 && wwPath) {
      await adapter.setState(wwPath, { val: originalWw + boostWw, ack: false });
    }
    if (originalHz !== null && boostHz > 0 && hzPath) {
      await adapter.setState(hzPath, { val: originalHz + boostHz, ack: false });
    }
    pvIsBoostActive = true;
    pvWaitingForCycleEnd = false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`[PV] Error activating boost: ${msg}`, "error");
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
    originalWw = null;
    originalHz = null;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handlePvCycleCheck,
  handlePvFeedInChange,
  initPvManagement,
  pvIsBoostActive,
  pvWaitingForCycleEnd
});
//# sourceMappingURL=pvManager.js.map

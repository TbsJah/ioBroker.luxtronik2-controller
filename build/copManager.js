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
var copManager_exports = {};
__export(copManager_exports, {
  processCopData: () => processCopData
});
module.exports = __toCommonJS(copManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
let lastPowerTotal = 0;
let lastThermalTotal = 0;
async function processCopData(adapter, bzVal) {
  const config = adapter.config;
  if (!config.cop_calculation_active) {
    return;
  }
  try {
    let currentPower = 0;
    if (config.cop_source_power === "external" && config.cop_oid_power_total) {
      const state = await adapter.getForeignStateAsync(config.cop_oid_power_total);
      if (state && typeof state.val === "number") {
        currentPower = state.val;
      }
    } else {
      const state = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("energy_total"));
      if (state && typeof state.val === "number") {
        currentPower = state.val;
      }
    }
    let currentThermal = 0;
    if (config.cop_source_thermal === "external" && config.cop_oid_thermal_total) {
      const state = await adapter.getForeignStateAsync(config.cop_oid_thermal_total);
      if (state && typeof state.val === "number") {
        currentThermal = state.val;
      }
    } else {
      const state = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("thermalenergy_total"));
      if (state && typeof state.val === "number") {
        currentThermal = state.val;
      }
    }
    if (lastPowerTotal === 0 || lastThermalTotal === 0) {
      lastPowerTotal = currentPower;
      lastThermalTotal = currentThermal;
      return;
    }
    const deltaPower = currentPower - lastPowerTotal;
    const deltaThermal = currentThermal - lastThermalTotal;
    lastPowerTotal = currentPower;
    lastThermalTotal = currentThermal;
    if (deltaPower <= 0 && deltaThermal <= 0) {
      return;
    }
    await addDeltaToBucket(adapter, "Total", deltaPower, deltaThermal);
    if (bzVal === "0") {
      await addDeltaToBucket(adapter, "Heating", deltaPower, deltaThermal);
    } else if (bzVal === "1") {
      await addDeltaToBucket(adapter, "HotWater", deltaPower, deltaThermal);
    }
    await calculateAndWriteCop(adapter, "Total", "cop_total_today");
    await calculateAndWriteCop(adapter, "Heating", "cop_heating_today");
    await calculateAndWriteCop(adapter, "HotWater", "cop_water_today");
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der COP-Berechnung: ${err.message}`, "error");
  }
}
async function addDeltaToBucket(adapter, category, deltaPower, deltaThermal) {
  const powerId = `hidden.cop_buckets.${category}_power_today`;
  const thermalId = `hidden.cop_buckets.${category}_thermal_today`;
  await adapter.setObjectNotExistsAsync(powerId, {
    type: "state",
    common: { name: `${category} Power Today`, type: "number", role: "value", read: true, write: false },
    native: {}
  });
  await adapter.setObjectNotExistsAsync(thermalId, {
    type: "state",
    common: { name: `${category} Thermal Today`, type: "number", role: "value", read: true, write: false },
    native: {}
  });
  const powerState = await adapter.getStateAsync(powerId);
  const thermalState = await adapter.getStateAsync(thermalId);
  const currentBucketPower = powerState && typeof powerState.val === "number" ? powerState.val : 0;
  const currentBucketThermal = thermalState && typeof thermalState.val === "number" ? thermalState.val : 0;
  await adapter.setStateAsync(powerId, { val: currentBucketPower + deltaPower, ack: true });
  await adapter.setStateAsync(thermalId, { val: currentBucketThermal + deltaThermal, ack: true });
}
async function calculateAndWriteCop(adapter, category, dpKey) {
  const powerId = `hidden.cop_buckets.${category}_power_today`;
  const thermalId = `hidden.cop_buckets.${category}_thermal_today`;
  const powerState = await adapter.getStateAsync(powerId);
  const thermalState = await adapter.getStateAsync(thermalId);
  const power = powerState && typeof powerState.val === "number" ? powerState.val : 0;
  const thermal = thermalState && typeof thermalState.val === "number" ? thermalState.val : 0;
  if (power > 0) {
    const cop = Math.round(thermal / power * 100) / 100;
    const targetId = (0, import_stateMapping.getDpPath)(dpKey);
    if (targetId) {
      await adapter.setStateAsync(targetId, { val: cop, ack: true });
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  processCopData
});
//# sourceMappingURL=copManager.js.map

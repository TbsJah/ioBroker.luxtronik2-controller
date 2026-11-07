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
let isInitialized = false;
const ensuredObjects = /* @__PURE__ */ new Set();
async function ensureCopObject(adapter, id, obj) {
  if (ensuredObjects.has(id)) {
    return;
  }
  await adapter.setObjectNotExistsAsync(id, obj);
  ensuredObjects.add(id);
}
async function processCopData(adapter, bzVal) {
  const config = adapter.config;
  if (!config.cop_calculation_active) {
    return;
  }
  try {
    (0, import_logger.writeLog)(`COP Manager gestartet. Modus: ${bzVal}`, "debug");
    const isExternalPower = config.cop_source_power === "external" && Boolean(config.cop_oid_power_total);
    const isExternalThermal = config.cop_source_thermal === "external" && Boolean(config.cop_oid_thermal_total);
    let currentPowerTotal = 0;
    let currentPowerHeating = 0;
    let currentPowerWater = 0;
    if (isExternalPower) {
      const state = await adapter.getForeignStateAsync(config.cop_oid_power_total);
      if (state && typeof state.val === "number") {
        currentPowerTotal = state.val;
      }
    } else {
      const [sTotal, sHeat, sWater] = await Promise.all([
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("energy_total")),
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("energy_heating")),
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("energy_warmwater"))
      ]);
      if (sTotal && typeof sTotal.val === "number") {
        currentPowerTotal = sTotal.val;
      }
      if (sHeat && typeof sHeat.val === "number") {
        currentPowerHeating = sHeat.val;
      }
      if (sWater && typeof sWater.val === "number") {
        currentPowerWater = sWater.val;
      }
    }
    let currentThermalTotal = 0;
    let currentThermalHeating = 0;
    let currentThermalWater = 0;
    if (isExternalThermal) {
      const state = await adapter.getForeignStateAsync(config.cop_oid_thermal_total);
      if (state && typeof state.val === "number") {
        currentThermalTotal = state.val;
      }
    } else {
      const [sTotal, sHeat, sWater] = await Promise.all([
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("thermalenergy_total")),
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("thermalenergy_heating")),
        adapter.getStateAsync((0, import_stateMapping.getDpPath)("thermalenergy_warmwater"))
      ]);
      if (sTotal && typeof sTotal.val === "number") {
        currentThermalTotal = sTotal.val;
      }
      if (sHeat && typeof sHeat.val === "number") {
        currentThermalHeating = sHeat.val;
      }
      if (sWater && typeof sWater.val === "number") {
        currentThermalWater = sWater.val;
      }
    }
    const rawPowerTotalId = "hidden.cop_buckets.last_raw_power";
    const rawPowerHeatId = "hidden.cop_buckets.last_raw_power_heating";
    const rawPowerWaterId = "hidden.cop_buckets.last_raw_power_water";
    const rawThermalTotalId = "hidden.cop_buckets.last_raw_thermal";
    const rawThermalHeatId = "hidden.cop_buckets.last_raw_thermal_heating";
    const rawThermalWaterId = "hidden.cop_buckets.last_raw_thermal_water";
    const rawTrackers = [
      { id: rawPowerTotalId, name: "Last Raw Power Total", current: currentPowerTotal },
      { id: rawPowerHeatId, name: "Last Raw Power Heating", current: currentPowerHeating },
      { id: rawPowerWaterId, name: "Last Raw Power Water", current: currentPowerWater },
      { id: rawThermalTotalId, name: "Last Raw Thermal Total", current: currentThermalTotal },
      { id: rawThermalHeatId, name: "Last Raw Thermal Heating", current: currentThermalHeating },
      { id: rawThermalWaterId, name: "Last Raw Thermal Water", current: currentThermalWater }
    ];
    if (!isInitialized) {
      for (const tracker of rawTrackers) {
        await ensureCopObject(adapter, tracker.id, {
          type: "state",
          common: { name: tracker.name, type: "number", role: "value", read: true, write: false },
          native: {}
        });
        const stateInit = await adapter.getStateAsync(tracker.id);
        if (!stateInit || stateInit.val === null) {
          await adapter.setState(tracker.id, { val: tracker.current, ack: true });
        }
      }
      isInitialized = true;
      await handleTimeRollover(adapter);
      return;
    }
    const readAndCalcDelta = async (id, currentVal) => {
      const lastState = await adapter.getStateAsync(id);
      const lastVal = lastState && typeof lastState.val === "number" ? lastState.val : currentVal;
      const delta = Math.max(0, currentVal - lastVal);
      if (currentVal !== lastVal) {
        await adapter.setState(id, { val: currentVal, ack: true });
      }
      return delta;
    };
    const deltaPowerTotal = await readAndCalcDelta(rawPowerTotalId, currentPowerTotal);
    const deltaPowerHeating = await readAndCalcDelta(rawPowerHeatId, currentPowerHeating);
    const deltaPowerWater = await readAndCalcDelta(rawPowerWaterId, currentPowerWater);
    const deltaThermalTotal = await readAndCalcDelta(rawThermalTotalId, currentThermalTotal);
    const deltaThermalHeating = await readAndCalcDelta(rawThermalHeatId, currentThermalHeating);
    const deltaThermalWater = await readAndCalcDelta(rawThermalWaterId, currentThermalWater);
    await handleTimeRollover(adapter);
    let modeDeltaPower = 0;
    let modeDeltaThermal = 0;
    if (bzVal === "0" || bzVal === "4") {
      modeDeltaPower = isExternalPower ? deltaPowerTotal : deltaPowerHeating > 0 ? deltaPowerHeating : deltaPowerTotal;
      modeDeltaThermal = isExternalThermal ? deltaThermalTotal : deltaThermalHeating > 0 ? deltaThermalHeating : deltaThermalTotal;
      if (modeDeltaPower > 0 || modeDeltaThermal > 0) {
        await addDeltaToBucket(adapter, "Heating", modeDeltaPower, modeDeltaThermal);
      }
    } else if (bzVal === "1") {
      modeDeltaPower = isExternalPower ? deltaPowerTotal : deltaPowerWater > 0 ? deltaPowerWater : deltaPowerTotal;
      modeDeltaThermal = isExternalThermal ? deltaThermalTotal : deltaThermalWater > 0 ? deltaThermalWater : deltaThermalTotal;
      if (!isExternalPower && deltaPowerWater === 0 && deltaPowerTotal > 0) {
        (0, import_logger.writeLog)(
          `[COP] WW-Stromz\xE4hler meldet 0 Delta. Nutze Delta von energy_total (${deltaPowerTotal} kWh) als Fallback.`,
          "debug"
        );
      }
      if (!isExternalThermal && deltaThermalWater === 0 && deltaThermalTotal > 0) {
        (0, import_logger.writeLog)(
          `[COP] WW-W\xE4rmez\xE4hler meldet 0 Delta. Nutze Delta von thermalenergy_total (${deltaThermalTotal} kWh) als Fallback.`,
          "debug"
        );
      }
      if (modeDeltaPower > 0 || modeDeltaThermal > 0) {
        await addDeltaToBucket(adapter, "HotWater", modeDeltaPower, modeDeltaThermal);
      }
    }
    const totalBucketPower = deltaPowerTotal > 0 ? deltaPowerTotal : modeDeltaPower;
    const totalBucketThermal = deltaThermalTotal > 0 ? deltaThermalTotal : modeDeltaThermal;
    if (totalBucketPower > 0 || totalBucketThermal > 0) {
      await addDeltaToBucket(adapter, "Total", totalBucketPower, totalBucketThermal);
    }
    await calculateAndWriteCop(adapter, "Total");
    await calculateAndWriteCop(adapter, "Heating");
    await calculateAndWriteCop(adapter, "HotWater");
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der COP-Berechnung: ${err.message}`, "error");
  }
}
async function handleTimeRollover(adapter) {
  (0, import_logger.writeLog)(`Pr\xFCfe Tageswechsel und lege Ordner an...`, "debug");
  const dateStateId = "hidden.cop_buckets.last_date";
  await ensureCopObject(adapter, "hidden", {
    type: "folder",
    common: { name: "Hidden System Data" },
    native: {}
  });
  await ensureCopObject(adapter, "hidden.cop_buckets", {
    type: "folder",
    common: { name: "COP Data Buckets" },
    native: {}
  });
  await ensureCopObject(adapter, dateStateId, {
    type: "state",
    common: { name: "Last calculation date", type: "string", role: "date", read: true, write: false },
    native: {}
  });
  const state = await adapter.getStateAsync(dateStateId);
  const lastDate = state && typeof state.val === "string" ? state.val : "";
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const currentDate = `${y}-${m}-${d}`;
  const currentMonth = `${y}-${m}`;
  const currentYear = `${y}`;
  if (lastDate !== currentDate) {
    const lastMonth = lastDate ? lastDate.substring(0, 7) : "";
    const lastYear = lastDate ? lastDate.substring(0, 4) : "";
    const categories = ["Total", "Heating", "HotWater"];
    for (const cat of categories) {
      const powerAbs = await getAbsoluteValue(adapter, cat, "power");
      const thermalAbs = await getAbsoluteValue(adapter, cat, "thermal");
      await setSnapshot(adapter, cat, "today", powerAbs, thermalAbs);
      await update7DaysHistory(adapter, cat, powerAbs, thermalAbs);
      if (lastMonth !== currentMonth) {
        await setSnapshot(adapter, cat, "month", powerAbs, thermalAbs);
      }
      if (lastYear !== currentYear) {
        await setSnapshot(adapter, cat, "year", powerAbs, thermalAbs);
      }
    }
    await adapter.setState(dateStateId, { val: currentDate, ack: true });
    (0, import_logger.writeLog)(`Tageswechsel erkannt. COP-Snapshots f\xFCr ${currentDate} wurden gesichert.`, "info");
  }
}
async function getAbsoluteValue(adapter, category, type) {
  const id = `hidden.cop_buckets.${category}_${type}_absolute`;
  await ensureCopObject(adapter, id, {
    type: "state",
    common: { name: `${category} ${type} Absolute`, type: "number", role: "value", read: true, write: false },
    native: {}
  });
  const state = await adapter.getStateAsync(id);
  return state && typeof state.val === "number" ? state.val : 0;
}
async function setSnapshot(adapter, category, timeframe, power, thermal) {
  const powerId = `hidden.cop_buckets.${category}_power_start_${timeframe}`;
  const thermalId = `hidden.cop_buckets.${category}_thermal_start_${timeframe}`;
  await ensureCopObject(adapter, powerId, {
    type: "state",
    common: {
      name: `${category} Power Start ${timeframe}`,
      type: "number",
      role: "value",
      read: true,
      write: false
    },
    native: {}
  });
  await ensureCopObject(adapter, thermalId, {
    type: "state",
    common: {
      name: `${category} Thermal Start ${timeframe}`,
      type: "number",
      role: "value",
      read: true,
      write: false
    },
    native: {}
  });
  await adapter.setState(powerId, { val: power, ack: true });
  await adapter.setState(thermalId, { val: thermal, ack: true });
}
async function update7DaysHistory(adapter, category, currentPower, currentThermal) {
  const historyId = `hidden.cop_buckets.${category}_history_7d`;
  await ensureCopObject(adapter, historyId, {
    type: "state",
    common: { name: `${category} 7 Days History`, type: "string", role: "json", read: true, write: false },
    native: {}
  });
  const state = await adapter.getStateAsync(historyId);
  let history = [];
  if (state && typeof state.val === "string" && state.val !== "") {
    try {
      history = JSON.parse(state.val);
    } catch {
    }
  }
  history.push({ power: currentPower, thermal: currentThermal });
  if (history.length > 7) {
    history.shift();
  }
  await adapter.setState(historyId, { val: JSON.stringify(history), ack: true });
}
async function addDeltaToBucket(adapter, category, deltaPower, deltaThermal) {
  const powerId = `hidden.cop_buckets.${category}_power_absolute`;
  const thermalId = `hidden.cop_buckets.${category}_thermal_absolute`;
  const currentPower = await getAbsoluteValue(adapter, category, "power");
  const currentThermal = await getAbsoluteValue(adapter, category, "thermal");
  await adapter.setState(powerId, { val: currentPower + deltaPower, ack: true });
  await adapter.setState(thermalId, { val: currentThermal + deltaThermal, ack: true });
}
async function calculateAndWriteCop(adapter, category) {
  const currentPower = await getAbsoluteValue(adapter, category, "power");
  const currentThermal = await getAbsoluteValue(adapter, category, "thermal");
  const dpMap = {
    Total: { today: "cop_total_today", "7d": "cop_total_7d", month: "cop_total_month", year: "cop_total_year" },
    Heating: {
      today: "cop_heating_today",
      "7d": "cop_heating_7d",
      month: "cop_heating_month",
      year: "cop_heating_year"
    },
    HotWater: { today: "cop_water_today", "7d": "cop_water_7d", month: "cop_water_month", year: "cop_water_year" }
  };
  const timeframes = ["today", "month", "year"];
  for (const tf of timeframes) {
    const powerStartId = `hidden.cop_buckets.${category}_power_start_${tf}`;
    const thermalStartId = `hidden.cop_buckets.${category}_thermal_start_${tf}`;
    const pState = await adapter.getStateAsync(powerStartId);
    const tState = await adapter.getStateAsync(thermalStartId);
    const pStart = pState && typeof pState.val === "number" ? pState.val : currentPower;
    const tStart = tState && typeof tState.val === "number" ? tState.val : currentThermal;
    const pUsed = currentPower - pStart;
    const tGen = currentThermal - tStart;
    if (pUsed > 0) {
      const cop = Math.round(tGen / pUsed * 100) / 100;
      const targetId = (0, import_stateMapping.getDpPath)(dpMap[category][tf]);
      if (targetId) {
        await adapter.setState(targetId, { val: cop, ack: true });
      }
    }
  }
  const historyId = `hidden.cop_buckets.${category}_history_7d`;
  const hState = await adapter.getStateAsync(historyId);
  if (hState && typeof hState.val === "string" && hState.val !== "") {
    try {
      const history = JSON.parse(hState.val);
      if (history.length > 0) {
        const oldest = history[0];
        const pUsed = currentPower - oldest.power;
        const tGen = currentThermal - oldest.thermal;
        if (pUsed > 0) {
          const cop = Math.round(tGen / pUsed * 100) / 100;
          const targetId = (0, import_stateMapping.getDpPath)(dpMap[category]["7d"]);
          if (targetId) {
            await adapter.setState(targetId, { val: cop, ack: true });
          }
        }
      }
    } catch {
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  processCopData
});
//# sourceMappingURL=copManager.js.map

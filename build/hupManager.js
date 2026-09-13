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
var hupManager_exports = {};
__export(hupManager_exports, {
  handleHupOptimization: () => handleHupOptimization
});
module.exports = __toCommonJS(hupManager_exports);
var import_logger = require("./logger");
async function handleHupOptimization(adapter, istHeizen, spreizung, hupAktiv, lastPumpOptimization) {
  var _a, _b, _c, _d, _e, _f;
  const config = adapter.config;
  if (!istHeizen || config.hup_optimierung_aktiv !== true) {
    return lastPumpOptimization;
  }
  const now = Date.now();
  const checkIntervalMs = ((_a = config.hup_interval_min) != null ? _a : 10) * 6e4;
  if (now - lastPumpOptimization > checkIntervalMs) {
    const minSpreizung = (_b = config.hup_spreizung_min) != null ? _b : 6.5;
    const maxSpreizung = (_c = config.hup_spreizung_max) != null ? _c : 7.5;
    const step = (_d = config.hup_voltage_step) != null ? _d : 0.25;
    const minVolt = (_e = config.hup_voltage_limit_min) != null ? _e : 3;
    const maxVolt = (_f = config.hup_voltage_limit_max) != null ? _f : 10;
    if (spreizung < minSpreizung && hupAktiv > minVolt) {
      const newVolt = Math.max(minVolt, Math.round((hupAktiv - step) * 100) / 100);
      await adapter.syncConfigValue("heating_system_circ_pump_voltage_nominal", newVolt);
      (0, import_logger.writeLog)(
        `HUP: Temperature spread too low (${spreizung}K < ${minSpreizung}K). Scaling nominal voltage down to ${newVolt}V.`,
        "info"
      );
      return now;
    } else if (spreizung > maxSpreizung && hupAktiv < maxVolt) {
      const newVolt = Math.min(maxVolt, Math.round((hupAktiv + step) * 100) / 100);
      await adapter.syncConfigValue("heating_system_circ_pump_voltage_nominal", newVolt);
      (0, import_logger.writeLog)(
        `HUP: Temperature spread too high (${spreizung}K > ${maxSpreizung}K). Scaling nominal voltage up to ${newVolt}V.`,
        "info"
      );
      return now;
    }
  }
  return lastPumpOptimization;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleHupOptimization
});
//# sourceMappingURL=hupManager.js.map

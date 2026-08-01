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
var virtualStates_exports = {};
__export(virtualStates_exports, {
  calculateTemperatureSpread: () => calculateTemperatureSpread,
  calculateTotalEnergy: () => calculateTotalEnergy,
  calculateTotalThermalEnergy: () => calculateTotalThermalEnergy,
  updateCustomStates: () => updateCustomStates,
  updateErrorHistory: () => updateErrorHistory,
  updateOutageHistory: () => updateOutageHistory,
  updateStatusStrings: () => updateStatusStrings,
  updateSystemInfos: () => updateSystemInfos,
  updateTimerTables: () => updateTimerTables
});
module.exports = __toCommonJS(virtualStates_exports);
var import_codes = require("./codes");
var import_logger = require("./logger");
var import_objectManager = require("./objectManager");
var import_stateMapping = require("./stateMapping");
async function calculateSum(adapter, sourceId1, sourceId2, targetId, logName) {
  try {
    const [state1, state2] = await Promise.all([
      adapter.getStateAsync(sourceId1),
      adapter.getStateAsync(sourceId2)
    ]);
    const val1 = state1 && typeof state1.val === "number" ? state1.val : 0;
    const val2 = state2 && typeof state2.val === "number" ? state2.val : 0;
    await adapter.setStateChangedAsync(targetId, val1 + val2, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error calculating ${logName}: ${msg}`, "error");
  }
}
async function calculateTotalThermalEnergy(adapter) {
  await calculateSum(
    adapter,
    (0, import_stateMapping.getDpPath)("thermalenergy_heating"),
    (0, import_stateMapping.getDpPath)("thermalenergy_warmwater"),
    (0, import_stateMapping.getDpPath)("thermalenergy_total"),
    "Total Thermal Energy"
  );
}
async function calculateTotalEnergy(adapter) {
  await calculateSum(
    adapter,
    (0, import_stateMapping.getDpPath)("energy_heating"),
    (0, import_stateMapping.getDpPath)("energy_warmwater"),
    (0, import_stateMapping.getDpPath)("energy_total"),
    "Total Energy"
  );
}
async function updateHistory(adapter, rawValues, timeStartIndex, codeStartIndex, targetStateId, fallbackPrefix, codeMap) {
  try {
    const historyList = [];
    for (let i = 0; i < 5; i++) {
      const code = rawValues[codeStartIndex + i];
      const timestamp = rawValues[timeStartIndex + i];
      if (timestamp !== void 0 && timestamp > 0) {
        const date = new Date(timestamp * 1e3);
        const formattedDate = date.toISOString().replace("T", " ").substring(0, 19);
        let beschreibung = `${fallbackPrefix} (${code})`;
        if (codeMap[code] !== void 0) {
          beschreibung = codeMap[code];
        }
        historyList.push({
          code,
          beschreibung,
          datum: formattedDate,
          timestamp
        });
      }
    }
    historyList.sort((a, b) => b.timestamp - a.timestamp);
    const cleanList = historyList.map((entry, idx) => ({
      index: idx + 1,
      code: entry.code,
      beschreibung: entry.beschreibung,
      datum: entry.datum,
      timestamp: entry.timestamp
    }));
    const jsonStr = JSON.stringify(cleanList);
    const result = await adapter.setStateChangedAsync(targetStateId, { val: jsonStr, ack: true });
    if (result && result.numChanges > 0) {
      (0, import_logger.writeLog)(`History for ${targetStateId} updated from raw data.`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error updating history: ${msg}`, "error");
  }
}
async function updateErrorHistory(adapter, rawValues) {
  const dpPath = (0, import_stateMapping.getDpPath)("Fehlerspeicher");
  if (dpPath) {
    await updateHistory(adapter, rawValues, 95, 100, dpPath, "Unknown error", import_codes.ERROR_CODES);
  }
}
async function updateOutageHistory(adapter, rawValues) {
  const dpPath = (0, import_stateMapping.getDpPath)("Abschaltungen");
  if (dpPath) {
    await updateHistory(adapter, rawValues, 111, 106, dpPath, "Unknown outage cause", import_codes.OUTAGE_CODES);
  }
}
async function calculateTemperatureSpread(adapter) {
  try {
    const vorlaufPath = (0, import_stateMapping.getDpPath)("temperature_supply");
    const ruecklaufPath = (0, import_stateMapping.getDpPath)("temperature_return");
    if (!vorlaufPath || !ruecklaufPath) {
      return;
    }
    const [vorlaufState, ruecklaufState] = await Promise.all([
      adapter.getStateAsync(vorlaufPath),
      adapter.getStateAsync(ruecklaufPath)
    ]);
    if (vorlaufState && ruecklaufState && vorlaufState.val !== null && ruecklaufState.val !== null) {
      const spreizung = parseFloat((Number(vorlaufState.val) - Number(ruecklaufState.val)).toFixed(2));
      const targetSpreadPath = (0, import_stateMapping.getDpPath)("spreizung_vorlauf_ruecklauf");
      if (targetSpreadPath) {
        await adapter.setStateChangedAsync(targetSpreadPath, spreizung, true);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error calculating temperature spread: ${msg}`, "error");
  }
}
async function updateStatusStrings(adapter, rawValues, rawParams) {
  var _a;
  try {
    const config = adapter.config;
    const lang = config.language === "de" ? "de" : "en";
    let zeitSec = rawValues[120];
    const codeZ1 = rawValues[117];
    const codeZ3 = rawValues[119];
    const isModernFirmware = (codeZ1 === void 0 || codeZ1 === 0) && (codeZ3 === void 0 || codeZ3 === 0);
    if (isModernFirmware && (zeitSec === void 0 || zeitSec === 0)) {
      const bzState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt"));
      if (bzState && bzState.lc) {
        zeitSec = Math.floor((Date.now() - bzState.lc) / 1e3);
      } else {
        zeitSec = 0;
      }
    }
    const h = Math.floor((zeitSec || 0) / 3600);
    const m = Math.floor((zeitSec || 0) % 3600 / 60);
    const s = (zeitSec || 0) % 60;
    const zeitStringDuration = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    const hText = lang === "de" ? h === 1 ? "Stunde" : "Stunden" : h === 1 ? "hour" : "hours";
    const mText = lang === "de" ? m === 1 ? "Minute" : "Minuten" : m === 1 ? "minute" : "minutes";
    const sText = lang === "de" ? s === 1 ? "Sekunde" : "Sekunden" : s === 1 ? "second" : "seconds";
    const zeitStringText = `${h} ${hText} ${m} ${mText} ${s} ${sText}`;
    const line1Map = import_codes.STATE_LINE_1[lang] || import_codes.STATE_LINE_1.en;
    const line2Map = import_codes.STATE_LINE_2[lang] || import_codes.STATE_LINE_2.en;
    const line3Map = import_codes.STATE_LINE_3[lang] || import_codes.STATE_LINE_3.en;
    const stateHeatingMap = import_codes.STATE_HEATING[lang] || import_codes.STATE_HEATING.en;
    const Absenkung = (rawParams[(0, import_stateMapping.getLuxIdByKey)("deltaHeatingReduction")] || 0) / 10;
    const AbsenkungMax = (rawParams[(0, import_stateMapping.getLuxIdByKey)("thresholdTemperatureSetBack")] || 0) / 10;
    const R\u00FCcklaufSollMin = (rawParams[(0, import_stateMapping.getLuxIdByKey)("returnTemperatureTargetMin")] || 15) / 10;
    const BetriebsartHeizung = rawParams[(0, import_stateMapping.getLuxIdByKey)("heating_operation_mode")] || 0;
    const Au\u00DFentemperatur = (rawValues[(0, import_stateMapping.getLuxIdByKey)("temperature_outside")] || 0) / 10;
    const HeatingLimit = rawParams[(0, import_stateMapping.getLuxIdByKey)("heatingLimit")] || 0;
    const opStateHeatingVal = (_a = rawValues[(0, import_stateMapping.getLuxIdByKey)("opStateHeating")]) != null ? _a : 3;
    const Mitteltemperatur = (rawValues[(0, import_stateMapping.getLuxIdByKey)("Mitteltemperatur")] || 15) / 10;
    const thresholdHeatingLimit = (rawParams[(0, import_stateMapping.getLuxIdByKey)("thresholdHeatingLimit")] || 15) / 10;
    const temperature_target_return = (rawValues[(0, import_stateMapping.getLuxIdByKey)("temperature_target_return")] || 15) / 10;
    let heatingStr = stateHeatingMap[opStateHeatingVal] || `Unknown (${opStateHeatingVal})`;
    if (opStateHeatingVal === 2) {
      heatingStr += ` (Target ${R\u00FCcklaufSollMin} \xB0C)`;
    } else if (opStateHeatingVal === 4) {
      heatingStr += ` (Target 20 \xB0C)`;
    } else if (opStateHeatingVal === 0 || opStateHeatingVal === 1) {
      if (HeatingLimit === 1 && Mitteltemperatur > thresholdHeatingLimit && Au\u00DFentemperatur < 10) {
        const textFrost = lang === "de" ? "Frostschutz" : "Frost Protection";
        heatingStr = `${textFrost} ${temperature_target_return} \xB0C`;
      } else if (HeatingLimit === 1 && Mitteltemperatur > thresholdHeatingLimit && Au\u00DFentemperatur > 10) {
        const text = lang === "de" ? "Heizgrenze" : "Heating limit";
        heatingStr = `${text} ${temperature_target_return} \xB0C`;
      } else if (BetriebsartHeizung === 0) {
        const textNormal = lang === "de" ? "Normal da" : "Normal as";
        if (AbsenkungMax <= Au\u00DFentemperatur) {
          heatingStr += ` ${Absenkung} \xB0C`;
        } else {
          heatingStr = `${textNormal} < ${AbsenkungMax} \xB0C`;
        }
      }
    }
    const dpHeating = (0, import_stateMapping.getDpPath)("opStateHeatingString");
    if (dpHeating) {
      await adapter.setStateChangedAsync(dpHeating, heatingStr, true);
    }
    let stateStr = "Unknown";
    let extStateStr = "Unknown";
    if (!isModernFirmware) {
      const codeZ2 = rawValues[118];
      stateStr = line3Map[codeZ3] || "Unknown";
      if (line1Map[codeZ1]) {
        const textZ2 = line2Map[codeZ2] || "";
        extStateStr = `${line1Map[codeZ1]} ${textZ2} ${zeitStringDuration}`.trim();
      }
    } else {
      const bzMapEn = {
        0: "Heating operation",
        1: "Hot water",
        2: "Swimming pool / Photovoltaics",
        3: "Lock time",
        4: "Defrosting",
        5: "No demand",
        6: "Ext. heat source",
        7: "Cooling"
      };
      const bzMapDe = {
        0: "Heizbetrieb",
        1: "Warmwasser",
        2: "Schwimmbad / PV",
        3: "EVU-Sperre",
        4: "Abtauen",
        5: "Kein Bedarf",
        6: "Zweiter Erzeuger",
        7: "K\xFChlbetrieb"
      };
      const bzMap = lang === "de" ? bzMapDe : bzMapEn;
      const currentStateCode2 = rawValues[(0, import_stateMapping.getLuxIdByKey)("WP_BZ_akt")] || 5;
      stateStr = bzMap[currentStateCode2] || `Status ${currentStateCode2}`;
      const isRunning = [0, 1, 2, 4, 6, 7].includes(currentStateCode2);
      const line1Text = isRunning ? line1Map[0] || "Heat pump running" : line1Map[1] || "Heat pump idle";
      const line2Text = line2Map[0] || "since";
      extStateStr = `${line1Text} ${line2Text} ${zeitStringText}`;
      const dpDuration = (0, import_stateMapping.getDpPath)("heatpump_duration");
      if (dpDuration) {
        await adapter.setStateChangedAsync(dpDuration, zeitStringDuration, true);
      }
    }
    const dpExtState = (0, import_stateMapping.getDpPath)("heatpump_extendet_state_string");
    if (dpExtState) {
      await adapter.setStateChangedAsync(dpExtState, stateStr, true);
    }
    const dpState = (0, import_stateMapping.getDpPath)("heatpump_state_string");
    if (dpState) {
      await adapter.setStateChangedAsync(dpState, extStateStr, true);
    }
    const hotWaterBoilerValve = rawValues[(0, import_stateMapping.getLuxIdByKey)("hotWaterBoilerValve")] || 0;
    const opStateHotWaterOriginal = rawValues[124];
    let hotWaterStr = "Unknown";
    if (opStateHotWaterOriginal === 0) {
      hotWaterStr = lang === "de" ? "Sperrzeit" : "Lock time";
    } else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 1) {
      hotWaterStr = lang === "de" ? "Aufheizen" : "Heating up";
    } else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 0) {
      hotWaterStr = "Temp. OK";
    } else if (opStateHotWaterOriginal === 3) {
      hotWaterStr = lang === "de" ? "Aus" : "Off";
    } else {
      hotWaterStr = `Unknown [${opStateHotWaterOriginal}/${hotWaterBoilerValve}]`;
    }
    const dpHotWater = (0, import_stateMapping.getDpPath)("opStateHotWaterString");
    if (dpHotWater) {
      await adapter.setStateChangedAsync(dpHotWater, hotWaterStr, true);
    }
    const coolingOpMode = rawParams[(0, import_stateMapping.getLuxIdByKey)("cooling_operation_mode")];
    const coolingReleaseTemp = (rawParams[(0, import_stateMapping.getLuxIdByKey)("cooling_release_temp")] || 0) / 10;
    const rawFreigabe = rawValues[(0, import_stateMapping.getLuxIdByKey)("cooling_release")];
    const isReleased = rawFreigabe === 1 || String(rawFreigabe).toLowerCase() === "true";
    const currentStateCode = rawValues[(0, import_stateMapping.getLuxIdByKey)("WP_BZ_akt")];
    let coolingStr = lang === "de" ? "Unbekannt" : "Unknown";
    if (coolingOpMode === 0) {
      coolingStr = lang === "de" ? "Aus" : "Off";
    } else if (coolingOpMode === 1) {
      if (currentStateCode === 7) {
        coolingStr = lang === "de" ? `K\xFChlen seit ${zeitStringText}` : `Cooling since ${zeitStringText}`;
      } else if (coolingReleaseTemp > Au\u00DFentemperatur) {
        const textKuehlgrenze = lang === "de" ? "K\xFChlgrenze" : "Cooling limit";
        coolingStr = `${textKuehlgrenze} (${coolingReleaseTemp.toFixed(1)} \xB0C)`;
      } else if (!isReleased) {
        coolingStr = lang === "de" ? "Wartet auf Timer-Freigabe" : "Waiting for timer release";
      } else {
        coolingStr = lang === "de" ? "Keine Anforderung / Bereit" : "No demand / Ready";
      }
    }
    const dpCooling = (0, import_stateMapping.getDpPath)("opStateCoolingString");
    if (dpCooling) {
      await adapter.setStateChangedAsync(dpCooling, coolingStr, true);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error updating status strings: ${msg}`, "error");
  }
}
async function updateTimerTables(adapter) {
  try {
    const timeCache = /* @__PURE__ */ new Map();
    const getTime = async (key) => {
      if (timeCache.has(key)) {
        return timeCache.get(key) || "00:00";
      }
      try {
        const dpPath = (0, import_stateMapping.getDpPath)(key);
        if (!dpPath) {
          return "00:00";
        }
        const state = await adapter.getStateAsync(dpPath);
        if (state && typeof state.val === "string") {
          const match = state.val.match(/^(\d{1,2}):(\d{1,2})/);
          if (match) {
            const formatted = `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
            timeCache.set(key, formatted);
            return formatted;
          }
        }
        return "00:00";
      } catch {
        return "00:00";
      }
    };
    const processTable = async (targetKey, prefix, endStr, slots) => {
      try {
        const table = [];
        for (let i = 1; i <= slots; i++) {
          const [onTime, offTime] = await Promise.all([
            getTime(`${prefix}Start${i}`),
            getTime(`${prefix}${endStr}${i}`)
          ]);
          table.push({ on: onTime, off: offTime });
        }
        const targetPath = (0, import_stateMapping.getDpPath)(targetKey);
        if (targetPath) {
          const jsonStr = JSON.stringify(table, null, 2);
          await adapter.setStateChangedAsync(targetPath, jsonStr, true);
        }
      } catch {
      }
    };
    const configs = [
      { target: "heatingOperationTimerTableWeek", prefix: "HZ_MoSo_", end: "End1", slots: 3 },
      { target: "heatingOperationTimerTable52MonFri", prefix: "HZ_MoFr_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTable52SatSun", prefix: "HZ_SaSo_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayMonday", prefix: "HZ_Montag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayTuesday", prefix: "HZ_Dienstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayWednesday", prefix: "HZ_Mittwoch_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayThursday", prefix: "HZ_Donnerstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayFriday", prefix: "HZ_Freitag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDaySaturday", prefix: "HZ_Samstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDaySunday", prefix: "HZ_Sonntag_", end: "Ende", slots: 3 },
      { target: "hotWaterTableWeek", prefix: "WW_MoSo_", end: "End", slots: 5 },
      { target: "hotWaterTable52MonFri", prefix: "WW_MoFr_", end: "Ende", slots: 5 },
      { target: "hotWaterTable52SatSun", prefix: "WW_SaSo_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDayMonday", prefix: "WW_Montag_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDayTuesday", prefix: "WW_Dienstag_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDayWednesday", prefix: "WW_Mittwoch_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDayThursday", prefix: "WW_Donnerstag_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDayFriday", prefix: "WW_Freitag_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDaySaturday", prefix: "WW_Samstag_", end: "Ende", slots: 5 },
      { target: "hotWaterTableDaySunday", prefix: "WW_Sonntag_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTableWeek", prefix: "Zirkulation_MoSo_", end: "End", slots: 5 },
      { target: "hotWaterCircPumpTimerTable52MonFri", prefix: "Zirkulation_MoFr_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTable52SatSun", prefix: "Zirkulation_SaSo_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTableDayMonday", prefix: "Zirkulation_Montag_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTableDayTuesday", prefix: "Zirkulation_Dienstag_", end: "Ende", slots: 5 },
      {
        target: "hotWaterCircPumpTimerTableDayWednesday",
        prefix: "Zirkulation_Mittwoch_",
        end: "Ende",
        slots: 5
      },
      {
        target: "hotWaterCircPumpTimerTableDayThursday",
        prefix: "Zirkulation_Donnerstag_",
        end: "Ende",
        slots: 5
      },
      { target: "hotWaterCircPumpTimerTableDayFriday", prefix: "Zirkulation_Freitag_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTableDaySaturday", prefix: "Zirkulation_Samstag_", end: "Ende", slots: 5 },
      { target: "hotWaterCircPumpTimerTableDaySunday", prefix: "Zirkulation_Sonntag_", end: "Ende", slots: 5 }
    ];
    await Promise.all(configs.map((cfg) => processTable(cfg.target, cfg.prefix, cfg.end, cfg.slots)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error generating JSON timer tables: ${msg}`, "error");
  }
}
async function updateCustomStates(adapter, rawValues, rawParams) {
  try {
    const customStates = adapter.config.custom_states || [];
    for (const custom of customStates) {
      if (!custom.active || custom.luxId === void 0 || !custom.name) {
        continue;
      }
      const rawArray = custom.source === "parameter" ? rawParams : rawValues;
      const rawVal = rawArray[custom.luxId];
      if (rawVal === void 0) {
        continue;
      }
      let finalVal;
      if (custom.type === "number") {
        finalVal = Number(rawVal);
        if (custom.factor !== void 0 && custom.factor !== null) {
          finalVal = finalVal * custom.factor;
          finalVal = Math.round(finalVal * 1e4) / 1e4;
        }
      } else if (custom.type === "boolean") {
        finalVal = rawVal === 1 || String(rawVal).toLowerCase() === "true";
      } else if (custom.type === "datetime") {
        const ts = Number(rawVal);
        if (!isNaN(ts) && ts > 0) {
          finalVal = new Date(ts * 1e3).toISOString().replace("T", " ").substring(0, 19);
        } else {
          finalVal = "Invalid";
        }
      } else {
        finalVal = String(rawVal);
      }
      const cleanId = (0, import_objectManager.sanitizeName)(custom.name);
      const stateId = `${adapter.namespace}.Custom.${cleanId}`;
      await adapter.setForeignStateChangedAsync(stateId, finalVal, true);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error updating custom values: ${msg}`, "error");
  }
}
async function setChangedSystemState(adapter, key, value) {
  const dp = (0, import_stateMapping.getDpPath)(key);
  if (dp) {
    await adapter.setStateChangedAsync(dp, value, true);
  }
}
async function updateSystemInfos(adapter, rawValues) {
  try {
    const firmwareBuf = rawValues.slice(81, 91);
    const firmwareString = createFirmwareString(firmwareBuf);
    await setChangedSystemState(adapter, "firmware", firmwareString);
    const ipAddress = int2ipAddress(rawValues[91]);
    await setChangedSystemState(adapter, "ip_address", ipAddress);
    const subnet = int2ipAddress(rawValues[92]);
    await setChangedSystemState(adapter, "subnet", subnet);
    const broadcastAddress = int2ipAddress(rawValues[93]);
    await setChangedSystemState(adapter, "broadcast_address", broadcastAddress);
    const gateway = int2ipAddress(rawValues[94]);
    await setChangedSystemState(adapter, "standard_gateway", gateway);
    const hpTypeIndex = rawValues[78];
    const hpTypeString = createHeatPumpTypeString(hpTypeIndex);
    await setChangedSystemState(adapter, "heatpump_type", hpTypeString);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error updating system information: ${msg}`, "error");
  }
}
function createFirmwareString(buf) {
  if (!buf || !Array.isArray(buf)) {
    return "Unknown";
  }
  return buf.filter((v) => v !== 0).map((v) => String.fromCharCode(v)).join("").trim();
}
function int2ipAddress(value) {
  if (value === void 0 || value === null || isNaN(value)) {
    return "0.0.0.0";
  }
  const part1 = value & 255;
  const part2 = value >>> 8 & 255;
  const part3 = value >>> 16 & 255;
  const part4 = value >>> 24 & 255;
  return `${part4}.${part3}.${part2}.${part1}`;
}
function createHeatPumpTypeString(value) {
  return import_codes.HP_TYPES[value] || import_codes.HP_TYPES[-1];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateTemperatureSpread,
  calculateTotalEnergy,
  calculateTotalThermalEnergy,
  updateCustomStates,
  updateErrorHistory,
  updateOutageHistory,
  updateStatusStrings,
  updateSystemInfos,
  updateTimerTables
});
//# sourceMappingURL=virtualStates.js.map

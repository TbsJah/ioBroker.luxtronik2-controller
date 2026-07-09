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
    (0, import_logger.writeLog)(`Fehler bei der Berechnung der ${logName}: ${err.message}`, "error");
  }
}
async function calculateTotalThermalEnergy(adapter) {
  await calculateSum(
    adapter,
    "Informationen.09_W\xE4rmemenge.thermalenergy_heating",
    "Informationen.09_W\xE4rmemenge.thermalenergy_warmwater",
    "Informationen.09_W\xE4rmemenge.thermalenergy_total",
    "Gesamt-W\xE4rmemenge"
  );
}
async function calculateTotalEnergy(adapter) {
  await calculateSum(
    adapter,
    "Informationen.10_Energie.energy_heating",
    "Informationen.10_Energie.energy_warmwater",
    "Informationen.10_Energie.energy_total",
    "Gesamt-Energie"
  );
}
async function updateHistory(adapter, rawValues, timeStartIndex, codeStartIndex, targetStateId, _keys, fallbackPrefix, codeMap) {
  try {
    const historyList = [];
    for (let i = 0; i < 5; i++) {
      const code = rawValues[codeStartIndex + i];
      const timestamp = rawValues[timeStartIndex + i];
      if (timestamp !== void 0 && timestamp > 0) {
        const date = new Date(timestamp * 1e3);
        const formattedDate = date.toLocaleString("de-DE");
        let beschreibung = `${fallbackPrefix} (${code})`;
        if (codeMap[code] !== void 0) {
          beschreibung = codeMap[code];
        }
        historyList.push({
          code,
          beschreibung,
          datum: formattedDate
          //timestamp: timestamp,
        });
      }
    }
    historyList.sort((a, b) => b.timestamp - a.timestamp);
    const cleanList = historyList.map((entry, idx) => {
      return {
        index: idx + 1,
        code: entry.code,
        beschreibung: entry.beschreibung,
        datum: entry.datum,
        timestamp: entry.timestamp
      };
    });
    const jsonStr = JSON.stringify(cleanList);
    const currentState = await adapter.getStateAsync(targetStateId);
    if (!currentState || currentState.val !== jsonStr) {
      await adapter.setStateAsync(targetStateId, { val: jsonStr, ack: true });
      (0, import_logger.writeLog)(`Historie f\xFCr ${targetStateId} aus Rohdaten aktualisiert.`, "info");
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aktualisieren der Historie: ${err.message}`, "error");
  }
}
async function updateErrorHistory(adapter, rawValues) {
  await updateHistory(
    adapter,
    rawValues,
    95,
    // Start-Index für Zeitstempel
    100,
    // Start-Index für Codes
    "Informationen.06_Fehlerspeicher.Fehlerspeicher",
    [],
    "Unbekannter Fehler",
    import_codes.ERROR_CODES
    // <--- Gibt das Fehler-Wörterbuch mit
  );
}
async function updateOutageHistory(adapter, rawValues) {
  await updateHistory(
    adapter,
    rawValues,
    111,
    // Start-Index für Zeitstempel
    106,
    // Start-Index für Codes
    "Informationen.07_Abschaltungen.Abschaltungen",
    [],
    "Unbekannter Abschaltgrund",
    import_codes.OUTAGE_CODES
    // <--- Gibt das Abschalt-Wörterbuch mit
  );
}
async function calculateTemperatureSpread(adapter) {
  try {
    const [vorlaufState, ruecklaufState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_supply")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return"))
    ]);
    if (vorlaufState && ruecklaufState && vorlaufState.val !== null && ruecklaufState.val !== null) {
      const spreizung = parseFloat((Number(vorlaufState.val) - Number(ruecklaufState.val)).toFixed(2));
      await adapter.setStateChangedAsync((0, import_stateMapping.getDpPath)("spreizung_vorlauf_ruecklauf"), spreizung, true);
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Berechnung der Temperatur-Spreizung: ${err.message}`, "error");
  }
}
async function updateStatusStrings(adapter, rawValues, rawParams) {
  try {
    const Heizgrenze = (rawParams[(0, import_stateMapping.getLuxIdByKey)("thresholdHeatingLimit")] || 0) / 10;
    const Absenkung = (rawParams[(0, import_stateMapping.getLuxIdByKey)("deltaHeatingReduction")] || 0) / 10;
    const AbsenkungMax = (rawParams[(0, import_stateMapping.getLuxIdByKey)("thresholdTemperatureSetBack")] || 0) / 10;
    const R\u00FCcklaufSollMin = (rawParams[(0, import_stateMapping.getLuxIdByKey)("returnTemperatureTargetMin")] || 15) / 10;
    const R\u00FCcklaufSoll = (rawValues[(0, import_stateMapping.getLuxIdByKey)("temperature_target_return")] || 15) / 10;
    const BetriebsartHeizung = rawParams[(0, import_stateMapping.getLuxIdByKey)("heating_operation_mode")] || 0;
    const Au\u00DFentemperatur = (rawValues[(0, import_stateMapping.getLuxIdByKey)("temperature_outside")] || 0) / 10;
    const Mitteltemperatur = (rawValues[(0, import_stateMapping.getLuxIdByKey)("Mitteltemperatur")] || 0) / 10;
    let heatingStr = "Unbekannt";
    if (BetriebsartHeizung === 0 && Mitteltemperatur >= Heizgrenze && (R\u00FCcklaufSoll === R\u00FCcklaufSollMin || R\u00FCcklaufSoll === 20 && Au\u00DFentemperatur < 10)) {
      heatingStr = Au\u00DFentemperatur >= 10 ? `Heizgrenze (Soll ${R\u00FCcklaufSollMin} \xB0C)` : "Frostschutz (Soll 20 \xB0C)";
    } else {
      heatingStr = import_codes.STATE_HEATING[BetriebsartHeizung] || `unbekannt (${BetriebsartHeizung})`;
      if (BetriebsartHeizung === 0) {
        heatingStr = AbsenkungMax <= Au\u00DFentemperatur ? `${heatingStr} ${Absenkung} \xB0C` : `Normal da < ${AbsenkungMax} \xB0C`;
      }
    }
    const dpHeating = (0, import_stateMapping.getDpPath)("opStateHeatingString");
    if (dpHeating) {
      await adapter.setStateAsync(dpHeating, { val: heatingStr, ack: true });
    }
    const codeZ1 = rawValues[117];
    const codeZ2 = rawValues[118];
    const codeZ3 = rawValues[119];
    const zeitSec = rawValues[120];
    const hotWaterBoilerValve = rawValues[(0, import_stateMapping.getLuxIdByKey)("hotWaterBoilerValve")] || 0;
    const opStateHotWaterOriginal = rawValues[124];
    const h = Math.floor((zeitSec || 0) / 3600);
    const m = Math.floor((zeitSec || 0) % 3600 / 60);
    const s = (zeitSec || 0) % 60;
    const zeitString = `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    const stateStr = import_codes.STATE_ZEILE_3[codeZ3] || "Unbekannt";
    const dpExtState = (0, import_stateMapping.getDpPath)("heatpump_extendet_state_string");
    if (dpExtState) {
      await adapter.setStateAsync(dpExtState, { val: stateStr, ack: true });
    }
    let extStateStr = "Unbekannt";
    if (import_codes.STATE_ZEILE_1[codeZ1]) {
      const textZ2 = import_codes.STATE_ZEILE_2[codeZ2] || "";
      extStateStr = `${import_codes.STATE_ZEILE_1[codeZ1]} ${textZ2} ${zeitString}`.trim();
    }
    const dpState = (0, import_stateMapping.getDpPath)("heatpump_state_string");
    if (dpState) {
      await adapter.setStateAsync(dpState, { val: extStateStr, ack: true });
    }
    let hotWaterStr = "Unbekannt";
    if (opStateHotWaterOriginal === 0) {
      hotWaterStr = "Sperrzeit";
    } else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 1) {
      hotWaterStr = "Aufheizen";
    } else if (opStateHotWaterOriginal === 1 && hotWaterBoilerValve === 0) {
      hotWaterStr = "Temp. OK";
    } else if (opStateHotWaterOriginal === 3) {
      hotWaterStr = "Aus";
    } else {
      hotWaterStr = `Unknown [${opStateHotWaterOriginal}/${hotWaterBoilerValve}]`;
    }
    const dpHotWater = (0, import_stateMapping.getDpPath)("opStateHotWaterString");
    if (dpHotWater) {
      await adapter.setStateAsync(dpHotWater, { val: hotWaterStr, ack: true });
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aktualisieren der Status-Strings: ${err.message}`, "error");
  }
}
async function updateTimerTables(adapter) {
  try {
    const getTime = async (key) => {
      try {
        const dpPath = (0, import_stateMapping.getDpPath)(key);
        if (!dpPath) {
          return "00:00";
        }
        const state = await adapter.getStateAsync(dpPath);
        if (state && typeof state.val === "string") {
          const match = state.val.match(/^(\d{1,2}):(\d{1,2})/);
          if (match) {
            return `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
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
          const current = await adapter.getStateAsync(targetPath);
          if (!current || current.val !== jsonStr) {
            await adapter.setStateAsync(targetPath, { val: jsonStr, ack: true });
          }
        }
      } catch {
      }
    };
    const configs = [
      // === HEIZEN (3 Slots) ===
      { target: "heatingOperationTimerTableWeek", prefix: "HZ_MoSo_", end: "End", slots: 3 },
      { target: "heatingOperationTimerTable52MonFri", prefix: "HZ_MoFr_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTable52SatSun", prefix: "HZ_SaSo_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayMonday", prefix: "HZ_Montag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayTuesday", prefix: "HZ_Dienstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayWednesday", prefix: "HZ_Mittwoch_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayThursday", prefix: "HZ_Donnerstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDayFriday", prefix: "HZ_Freitag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDaySaturday", prefix: "HZ_Samstag_", end: "Ende", slots: 3 },
      { target: "heatingOperationTimerTableDaySunday", prefix: "HZ_Sonntag_", end: "Ende", slots: 3 },
      // === WARMWASSER (5 Slots) ===
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
      // === ZIRKULATION (5 Slots) ===
      // Hypothetische Ziel-Keys (Sobald du diese ins Mapping einträgst, läuft es automatisch mit)
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
    for (const cfg of configs) {
      await processTable(cfg.target, cfg.prefix, cfg.end, cfg.slots);
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Erstellen der JSON-Timer-Tabellen: ${err.message}`, "error");
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
      let finalVal = rawVal;
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
          finalVal = new Date(ts * 1e3).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          });
        } else {
          finalVal = "Ung\xFCltig";
        }
      } else {
        finalVal = String(rawVal);
      }
      const cleanId = (0, import_objectManager.sanitizeName)(custom.name);
      const stateId = `${adapter.namespace}.Benutzer.${cleanId}`;
      const current = await adapter.getForeignStateAsync(stateId);
      if (!current || current.val !== finalVal) {
        await adapter.setForeignStateAsync(stateId, { val: finalVal, ack: true });
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aktualisieren der benutzerdefinierten Werte: ${err.message}`, "error");
  }
}
async function updateSystemInfos(adapter, rawValues) {
  try {
    const firmwareBuf = rawValues.slice(81, 91);
    const firmwareString = createFirmwareString(firmwareBuf);
    const dpFirmware = (0, import_stateMapping.getDpPath)("firmware");
    if (dpFirmware) {
      const currentFw = await adapter.getStateAsync(dpFirmware);
      if (!currentFw || currentFw.val !== firmwareString) {
        await adapter.setStateAsync(dpFirmware, { val: firmwareString, ack: true });
      }
    }
    const ipAddress = int2ipAddress(rawValues[91]);
    const dpIp = (0, import_stateMapping.getDpPath)("ip_address");
    if (dpIp) {
      const currentIp = await adapter.getStateAsync(dpIp);
      if (!currentIp || currentIp.val !== ipAddress) {
        await adapter.setStateAsync(dpIp, { val: ipAddress, ack: true });
      }
    }
    const subnet = int2ipAddress(rawValues[92]);
    const dpSubnet = (0, import_stateMapping.getDpPath)("subnet");
    if (dpSubnet) {
      const currentSubnet = await adapter.getStateAsync(dpSubnet);
      if (!currentSubnet || currentSubnet.val !== subnet) {
        await adapter.setStateAsync(dpSubnet, { val: subnet, ack: true });
      }
    }
    const broadcastAddress = int2ipAddress(rawValues[93]);
    const dpBroadcast = (0, import_stateMapping.getDpPath)("broadcast_address");
    if (dpBroadcast) {
      const currentBroadcast = await adapter.getStateAsync(dpBroadcast);
      if (!currentBroadcast || currentBroadcast.val !== broadcastAddress) {
        await adapter.setStateAsync(dpBroadcast, { val: broadcastAddress, ack: true });
      }
    }
    const gateway = int2ipAddress(rawValues[94]);
    const dpGateway = (0, import_stateMapping.getDpPath)("standard_gateway");
    if (dpGateway) {
      const currentGateway = await adapter.getStateAsync(dpGateway);
      if (!currentGateway || currentGateway.val !== gateway) {
        await adapter.setStateAsync(dpGateway, { val: gateway, ack: true });
      }
    }
    const hpTypeIndex = rawValues[78];
    const hpTypeString = createHeatPumpTypeString(hpTypeIndex);
    const dpHpType = (0, import_stateMapping.getDpPath)("heatpump_type");
    if (dpHpType) {
      const currentHpType = await adapter.getStateAsync(dpHpType);
      if (!currentHpType || currentHpType.val !== hpTypeString) {
        await adapter.setStateAsync(dpHpType, { val: hpTypeString, ack: true });
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aktualisieren der System-Infos: ${err.message}`, "error");
  }
}
function createFirmwareString(buf) {
  if (!buf || !Array.isArray(buf)) {
    return "Unbekannt";
  }
  let firmware = "";
  for (const val of buf) {
    if (val !== 0) {
      firmware += String.fromCharCode(val);
    }
  }
  return firmware.trim();
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

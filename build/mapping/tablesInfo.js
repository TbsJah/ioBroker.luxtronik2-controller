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
var tablesInfo_exports = {};
__export(tablesInfo_exports, {
  TABLESINFO_MAPPING: () => TABLESINFO_MAPPING
});
module.exports = __toCommonJS(tablesInfo_exports);
const TABLESINFO_MAPPING = {
  // 11_Tables
  heatingOperationTimerTable52MonFri: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Mo-Fr (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTable52SatSun: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Sa-Su (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayFriday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Fr",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayMonday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Mo",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDaySaturday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Sa",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDaySunday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Su",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayThursday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Th",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayTuesday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Tu",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayWednesday: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table We",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableWeek: {
    folder: "Information.11_Tables.Heating",
    name: "Heating timer table Week (Mo-Su)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTable52MonFri: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Mo-Fr (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTable52SatSun: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Sa-Su (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayFriday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Fr",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayMonday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Mo",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDaySaturday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Sa",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDaySunday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Su",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayThursday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Th",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayTuesday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Tu",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayWednesday: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table We",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableWeek: {
    folder: "Information.11_Tables.HotWater",
    name: "Hot water timer table Week (Mo-Su)",
    role: "json",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTable52MonFri: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Mo-Fr (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
    // Zirkulations-Tabelle an Zirkulations-Visi binden
  },
  hotWaterCircPumpTimerTable52SatSun: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Sa-Su (5+2)",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDayFriday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Fr",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDayMonday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Mo",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDaySaturday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Sa",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDaySunday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Su",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDayThursday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Th",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDayTuesday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Tu",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableDayWednesday: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table We",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  },
  hotWaterCircPumpTimerTableWeek: {
    folder: "Information.11_Tables.Circulation",
    name: "Circulation timer table Week (Mo-Su)",
    role: "json",
    type: "json",
    dataSource: "parameter",
    visiIndex: 59
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TABLESINFO_MAPPING
});
//# sourceMappingURL=tablesInfo.js.map

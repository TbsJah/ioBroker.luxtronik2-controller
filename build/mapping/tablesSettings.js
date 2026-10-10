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
var tablesSettings_exports = {};
__export(tablesSettings_exports, {
  TABLESSETTINGS_MAPPING: () => TABLESSETTINGS_MAPPING
});
module.exports = __toCommonJS(tablesSettings_exports);
const TABLESSETTINGS_MAPPING = {
  // Timer Tables Selection
  heatingOperationTimerTableSelected: {
    folder: "Settings.07_Tables",
    name: "Currently selected heating timer table",
    role: "level",
    type: "number",
    write: true,
    luxWriteId: "222",
    dataSource: "raw_parameter",
    states: {
      en: { 0: "Week (Mo-Su)", 1: "5+2 (Mo-Fr, Sa-Su)", 2: "Days (Mo, Tu, ...)" },
      de: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" }
    }
  },
  hotWaterCircPumpTimerTableSelected: {
    folder: "Settings.07_Tables",
    name: "Currently selected circulation timer table",
    role: "level",
    type: "number",
    write: true,
    luxWriteId: "506",
    dataSource: "raw_parameter",
    states: {
      en: { 0: "Week (Mo-Su)", 1: "5+2 (Mo-Fr, Sa-Su)", 2: "Days (Mo, Tu, ...)" },
      de: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" }
    },
    required: true,
    visiIndex: 59
  },
  hotWaterOperationTimerTableSelected: {
    folder: "Settings.07_Tables",
    name: "Currently selected hot water timer table",
    role: "level",
    type: "number",
    write: true,
    luxWriteId: "405",
    dataSource: "raw_parameter",
    states: {
      en: { 0: "Week (Mo-Su)", 1: "5+2 (Mo-Fr, Sa-Su)", 2: "Days (Mo, Tu, ...)" },
      de: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" }
    },
    required: true
  },
  // =========================================================
  // HEATING TIMER: WEEK (MO-SU)
  // =========================================================
  HZ_MoSo_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer start 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "223",
    write: true
  },
  HZ_MoSo_End1: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer end 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "224",
    write: true
  },
  HZ_MoSo_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer start 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "225",
    write: true
  },
  HZ_MoSo_End2: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer end 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "226",
    write: true
  },
  HZ_MoSo_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer start 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "227",
    write: true
  },
  HZ_MoSo_End3: {
    folder: "Settings.07_Tables.Heating.Parameter.Mo-Su",
    name: "Heating timer end 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "228",
    write: true
  },
  // =========================================================
  // HEATING TIMER: 5+2 (MO-FR & SA-SU)
  // =========================================================
  HZ_MoFr_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "229",
    write: true
  },
  HZ_MoFr_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "230",
    write: true
  },
  HZ_MoFr_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "231",
    write: true
  },
  HZ_MoFr_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "232",
    write: true
  },
  HZ_MoFr_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "233",
    write: true
  },
  HZ_MoFr_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "234",
    write: true
  },
  HZ_SaSo_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "235",
    write: true
  },
  HZ_SaSo_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "236",
    write: true
  },
  HZ_SaSo_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "237",
    write: true
  },
  HZ_SaSo_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "238",
    write: true
  },
  HZ_SaSo_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer start 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "239",
    write: true
  },
  HZ_SaSo_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.52_MoFr_SaSu",
    name: "Heating timer end 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "240",
    write: true
  },
  // =========================================================
  // HEATING TIMER: SINGLE DAYS
  // =========================================================
  HZ_Sonntag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer start 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "241",
    write: true
  },
  HZ_Sonntag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer end 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "242",
    write: true
  },
  HZ_Sonntag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer start 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "243",
    write: true
  },
  HZ_Sonntag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer end 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "244",
    write: true
  },
  HZ_Sonntag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer start 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "245",
    write: true
  },
  HZ_Sonntag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Sunday",
    name: "Heating timer end 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "246",
    write: true
  },
  HZ_Montag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer start 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "247",
    write: true
  },
  HZ_Montag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer end 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "248",
    write: true
  },
  HZ_Montag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer start 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "249",
    write: true
  },
  HZ_Montag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer end 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "250",
    write: true
  },
  HZ_Montag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer start 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "251",
    write: true
  },
  HZ_Montag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Monday",
    name: "Heating timer end 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "252",
    write: true
  },
  HZ_Dienstag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer start 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "253",
    write: true
  },
  HZ_Dienstag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer end 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "254",
    write: true
  },
  HZ_Dienstag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer start 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "255",
    write: true
  },
  HZ_Dienstag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer end 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "256",
    write: true
  },
  HZ_Dienstag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer start 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "257",
    write: true
  },
  HZ_Dienstag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Tuesday",
    name: "Heating timer end 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "258",
    write: true
  },
  HZ_Mittwoch_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer start 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "259",
    write: true
  },
  HZ_Mittwoch_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer end 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "260",
    write: true
  },
  HZ_Mittwoch_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer start 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "261",
    write: true
  },
  HZ_Mittwoch_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer end 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "262",
    write: true
  },
  HZ_Mittwoch_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer start 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "263",
    write: true
  },
  HZ_Mittwoch_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Wednesday",
    name: "Heating timer end 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "264",
    write: true
  },
  HZ_Donnerstag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer start 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "265",
    write: true
  },
  HZ_Donnerstag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer end 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "266",
    write: true
  },
  HZ_Donnerstag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer start 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "267",
    write: true
  },
  HZ_Donnerstag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer end 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "268",
    write: true
  },
  HZ_Donnerstag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer start 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "269",
    write: true
  },
  HZ_Donnerstag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Thursday",
    name: "Heating timer end 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "270",
    write: true
  },
  HZ_Freitag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer start 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "271",
    write: true
  },
  HZ_Freitag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer end 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "272",
    write: true
  },
  HZ_Freitag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer start 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "273",
    write: true
  },
  HZ_Freitag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer end 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "274",
    write: true
  },
  HZ_Freitag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer start 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "275",
    write: true
  },
  HZ_Freitag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Friday",
    name: "Heating timer end 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "276",
    write: true
  },
  HZ_Samstag_Start1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer start 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "277",
    write: true
  },
  HZ_Samstag_Ende1: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer end 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "278",
    write: true
  },
  HZ_Samstag_Start2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer start 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "279",
    write: true
  },
  HZ_Samstag_Ende2: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer end 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "280",
    write: true
  },
  HZ_Samstag_Start3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer start 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "281",
    write: true
  },
  HZ_Samstag_Ende3: {
    folder: "Settings.07_Tables.Heating.Parameter.Days.Saturday",
    name: "Heating timer end 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "282",
    write: true
  },
  // =========================================================
  // HOT WATER TIMER: WEEK (MO-SU)
  // =========================================================
  WW_MoSo_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer start 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "406",
    write: true,
    required: true
  },
  WW_MoSo_End1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer end 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "407",
    write: true,
    required: true
  },
  WW_MoSo_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer start 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "408",
    write: true,
    required: true
  },
  WW_MoSo_End2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer end 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "409",
    write: true,
    required: true
  },
  WW_MoSo_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer start 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "410",
    write: true,
    required: true
  },
  WW_MoSo_End3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer end 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "411",
    write: true,
    required: true
  },
  WW_MoSo_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer start 4 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "412",
    write: true,
    required: true
  },
  WW_MoSo_End4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer end 4 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "413",
    write: true,
    required: true
  },
  WW_MoSo_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer start 5 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "414",
    write: true,
    required: true
  },
  WW_MoSo_End5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Mo-Su",
    name: "Hot water timer end 5 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "415",
    write: true,
    required: true
  },
  // =========================================================
  // HOT WATER TIMER: 5+2 (MO-FR & SA-SU)
  // =========================================================
  WW_MoFr_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "416",
    write: true
  },
  WW_MoFr_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "417",
    write: true
  },
  WW_MoFr_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "418",
    write: true
  },
  WW_MoFr_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "419",
    write: true
  },
  WW_MoFr_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "420",
    write: true
  },
  WW_MoFr_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "421",
    write: true
  },
  WW_MoFr_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 4 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "422",
    write: true
  },
  WW_MoFr_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 4 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "423",
    write: true
  },
  WW_MoFr_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 5 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "424",
    write: true
  },
  WW_MoFr_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 5 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "425",
    write: true
  },
  WW_SaSo_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "426",
    write: true
  },
  WW_SaSo_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "427",
    write: true
  },
  WW_SaSo_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "428",
    write: true
  },
  WW_SaSo_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "429",
    write: true
  },
  WW_SaSo_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "430",
    write: true
  },
  WW_SaSo_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "431",
    write: true
  },
  WW_SaSo_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 4 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "432",
    write: true
  },
  WW_SaSo_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 4 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "433",
    write: true
  },
  WW_SaSo_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer start 5 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "434",
    write: true
  },
  WW_SaSo_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.52_MoFr_SaSu",
    name: "Hot water timer end 5 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "435",
    write: true
  },
  // =========================================================
  // HOT WATER TIMER: SINGLE DAYS
  // =========================================================
  WW_Sonntag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer start 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "436",
    write: true
  },
  WW_Sonntag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer end 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "437",
    write: true
  },
  WW_Sonntag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer start 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "438",
    write: true
  },
  WW_Sonntag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer end 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "439",
    write: true
  },
  WW_Sonntag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer start 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "440",
    write: true
  },
  WW_Sonntag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer end 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "441",
    write: true
  },
  WW_Sonntag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer start 4 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "442",
    write: true
  },
  WW_Sonntag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer end 4 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "443",
    write: true
  },
  WW_Sonntag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer start 5 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "444",
    write: true
  },
  WW_Sonntag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Sunday",
    name: "Hot water timer end 5 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "445",
    write: true
  },
  WW_Montag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer start 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "446",
    write: true
  },
  WW_Montag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer end 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "447",
    write: true
  },
  WW_Montag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer start 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "448",
    write: true
  },
  WW_Montag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer end 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "449",
    write: true
  },
  WW_Montag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer start 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "450",
    write: true
  },
  WW_Montag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer end 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "451",
    write: true
  },
  WW_Montag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer start 4 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "452",
    write: true
  },
  WW_Montag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer end 4 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "453",
    write: true
  },
  WW_Montag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer start 5 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "454",
    write: true
  },
  WW_Montag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Monday",
    name: "Hot water timer end 5 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "455",
    write: true
  },
  WW_Dienstag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer start 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "456",
    write: true
  },
  WW_Dienstag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer end 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "457",
    write: true
  },
  WW_Dienstag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer start 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "458",
    write: true
  },
  WW_Dienstag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer end 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "459",
    write: true
  },
  WW_Dienstag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer start 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "460",
    write: true
  },
  WW_Dienstag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer end 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "461",
    write: true
  },
  WW_Dienstag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer start 4 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "462",
    write: true
  },
  WW_Dienstag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer end 4 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "463",
    write: true
  },
  WW_Dienstag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer start 5 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "464",
    write: true
  },
  WW_Dienstag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Tuesday",
    name: "Hot water timer end 5 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "465",
    write: true
  },
  WW_Mittwoch_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer start 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "466",
    write: true
  },
  WW_Mittwoch_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer end 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "467",
    write: true
  },
  WW_Mittwoch_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer start 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "468",
    write: true
  },
  WW_Mittwoch_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer end 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "469",
    write: true
  },
  WW_Mittwoch_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer start 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "470",
    write: true
  },
  WW_Mittwoch_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer end 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "471",
    write: true
  },
  WW_Mittwoch_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer start 4 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "472",
    write: true
  },
  WW_Mittwoch_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer end 4 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "473",
    write: true
  },
  WW_Mittwoch_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer start 5 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "474",
    write: true
  },
  WW_Mittwoch_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Wednesday",
    name: "Hot water timer end 5 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "475",
    write: true
  },
  WW_Donnerstag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer start 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "476",
    write: true
  },
  WW_Donnerstag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer end 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "477",
    write: true
  },
  WW_Donnerstag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer start 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "478",
    write: true
  },
  WW_Donnerstag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer end 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "479",
    write: true
  },
  WW_Donnerstag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer start 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "480",
    write: true
  },
  WW_Donnerstag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer end 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "481",
    write: true
  },
  WW_Donnerstag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer start 4 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "482",
    write: true
  },
  WW_Donnerstag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer end 4 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "483",
    write: true
  },
  WW_Donnerstag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer start 5 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "484",
    write: true
  },
  WW_Donnerstag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Thursday",
    name: "Hot water timer end 5 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "485",
    write: true
  },
  WW_Freitag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer start 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "486",
    write: true
  },
  WW_Freitag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer end 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "487",
    write: true
  },
  WW_Freitag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer start 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "488",
    write: true
  },
  WW_Freitag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer end 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "489",
    write: true
  },
  WW_Freitag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer start 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "490",
    write: true
  },
  WW_Freitag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer end 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "491",
    write: true
  },
  WW_Freitag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer start 4 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "492",
    write: true
  },
  WW_Freitag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer end 4 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "493",
    write: true
  },
  WW_Freitag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer start 5 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "494",
    write: true
  },
  WW_Freitag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Friday",
    name: "Hot water timer end 5 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "495",
    write: true
  },
  WW_Samstag_Start1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer start 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "496",
    write: true
  },
  WW_Samstag_Ende1: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer end 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "497",
    write: true
  },
  WW_Samstag_Start2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer start 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "498",
    write: true
  },
  WW_Samstag_Ende2: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer end 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "499",
    write: true
  },
  WW_Samstag_Start3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer start 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "500",
    write: true
  },
  WW_Samstag_Ende3: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer end 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "501",
    write: true
  },
  WW_Samstag_Start4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer start 4 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "502",
    write: true
  },
  WW_Samstag_Ende4: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer end 4 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "503",
    write: true
  },
  WW_Samstag_Start5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer start 5 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "504",
    write: true
  },
  WW_Samstag_Ende5: {
    folder: "Settings.07_Tables.HotWater.Parameter.Days.Saturday",
    name: "Hot water timer end 5 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "505",
    write: true
  },
  // =========================================================
  // CIRCULATION TIMER: WEEK (MO-SU)
  // =========================================================
  Zirkulation_MoSo_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer start 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "507",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_End1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer end 1 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "508",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer start 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "509",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_End2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer end 2 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "510",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer start 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "511",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_End3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer end 3 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "512",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer start 4 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "513",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_End4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer end 4 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "514",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer start 5 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "515",
    write: true,
    required: true,
    visiIndex: 59
  },
  Zirkulation_MoSo_End5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Mo-Su",
    name: "Circulation timer end 5 (Mo-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "516",
    write: true,
    required: true,
    visiIndex: 59
  },
  // =========================================================
  // CIRCULATION TIMER: 5+2 (MO-FR & SA-SU)
  // =========================================================
  Zirkulation_MoFr_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "517",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 1 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "518",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "519",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 2 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "520",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "521",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 3 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "522",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 4 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "523",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 4 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "524",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 5 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "525",
    write: true,
    visiIndex: 59
  },
  Zirkulation_MoFr_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 5 (Mo-Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "526",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "527",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 1 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "528",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "529",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 2 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "530",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "531",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 3 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "532",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 4 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "533",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 4 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "534",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer start 5 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "535",
    write: true,
    visiIndex: 59
  },
  Zirkulation_SaSo_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.52_MoFr_SaSu",
    name: "Circulation timer end 5 (Sa-Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "536",
    write: true,
    visiIndex: 59
  },
  // =========================================================
  // CIRCULATION TIMER: SINGLE DAYS
  // =========================================================
  Zirkulation_Sonntag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer start 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "537",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer end 1 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "538",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer start 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "539",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer end 2 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "540",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer start 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "541",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer end 3 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "542",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer start 4 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "543",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer end 4 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "544",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer start 5 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "545",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Sonntag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Sunday",
    name: "Circulation timer end 5 (Su)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "546",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer start 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "547",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer end 1 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "548",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer start 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "549",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer end 2 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "550",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer start 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "551",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer end 3 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "552",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer start 4 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "553",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer end 4 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "554",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer start 5 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "555",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Montag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Monday",
    name: "Circulation timer end 5 (Mo)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "556",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer start 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "557",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer end 1 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "558",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer start 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "559",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer end 2 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "560",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer start 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "561",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer end 3 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "562",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer start 4 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "563",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer end 4 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "564",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer start 5 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "565",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Dienstag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Tuesday",
    name: "Circulation timer end 5 (Tu)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "566",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer start 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "567",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer end 1 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "568",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer start 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "569",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer end 2 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "570",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer start 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "571",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer end 3 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "572",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer start 4 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "573",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer end 4 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "574",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer start 5 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "575",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Mittwoch_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Wednesday",
    name: "Circulation timer end 5 (We)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "576",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer start 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "577",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer end 1 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "578",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer start 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "579",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer end 2 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "580",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer start 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "581",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer end 3 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "582",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer start 4 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "583",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer end 4 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "584",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer start 5 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "585",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Donnerstag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Thursday",
    name: "Circulation timer end 5 (Th)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "586",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer start 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "587",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer end 1 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "588",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer start 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "589",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer end 2 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "590",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer start 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "591",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer end 3 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "592",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer start 4 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "593",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer end 4 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "594",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer start 5 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "595",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Freitag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Friday",
    name: "Circulation timer end 5 (Fr)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "596",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Start1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer start 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "597",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Ende1: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer end 1 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "598",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Start2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer start 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "599",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Ende2: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer end 2 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "600",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Start3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer start 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "601",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Ende3: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer end 3 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "602",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Start4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer start 4 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "603",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Ende4: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer end 4 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "604",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Start5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer start 5 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "605",
    write: true,
    visiIndex: 59
  },
  Zirkulation_Samstag_Ende5: {
    folder: "Settings.07_Tables.Circulation.Parameter.Days.Saturday",
    name: "Circulation timer end 5 (Sa)",
    role: "text",
    type: "string",
    isDurationFormat: true,
    dataSource: "raw_parameter",
    luxWriteId: "606",
    write: true,
    visiIndex: 59
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TABLESSETTINGS_MAPPING
});
//# sourceMappingURL=tablesSettings.js.map

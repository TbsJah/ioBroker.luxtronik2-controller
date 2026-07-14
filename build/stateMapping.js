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
var stateMapping_exports = {};
__export(stateMapping_exports, {
  STATE_MAPPING: () => STATE_MAPPING,
  getDpPath: () => getDpPath,
  getLuxIdByKey: () => getLuxIdByKey
});
module.exports = __toCommonJS(stateMapping_exports);
const STATE_MAPPING = {
  // ==========================================
  // Informationen & Values (Lesbar)
  // ==========================================
  // Temperaturen
  temperature_supply: {
    folder: "Informationen.01_Temperaturen",
    name: "Vorlauftemperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "10",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_return: {
    folder: "Informationen.01_Temperaturen",
    name: "R\xFCcklauftemperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "11",
    factor: 10,
    dataSource: "raw_value",
    required: true
  },
  spreizung_vorlauf_ruecklauf: {
    folder: "Informationen.01_Temperaturen",
    name: "Spreizung Vorlauf - R\xFCcklauf",
    role: "value.temperature",
    type: "number",
    unit: "K",
    isVirtual: true,
    required: true
  },
  temperature_target_return: {
    folder: "Informationen.01_Temperaturen",
    name: "R\xFCckl.-Soll-Temperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "12",
    factor: 10,
    dataSource: "raw_value",
    required: true
  },
  temperature_hot_gas: {
    folder: "Informationen.01_Temperaturen",
    name: "Heissgas-Temperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "14",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_outside: {
    folder: "Informationen.01_Temperaturen",
    name: "Au\xDFentemperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "15",
    factor: 10,
    dataSource: "raw_value",
    required: true
  },
  Mitteltemperatur: {
    folder: "Informationen.01_Temperaturen",
    name: "Value 16 (ID_WEB_Mitteltemperatur)",
    role: "value",
    type: "number",
    write: false,
    luxWriteId: "16",
    unit: "\xB0C",
    factor: 10,
    dataSource: "raw_value"
  },
  Wamwassertemperatur_Ist: {
    folder: "Informationen.01_Temperaturen",
    name: "Value 17 (ID_WEB_Temperatur_TBW)",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: false,
    luxWriteId: "17",
    factor: 10,
    dataSource: "raw_value",
    required: true
  },
  Wamwassertemperatur_Soll: {
    folder: "Informationen.01_Temperaturen",
    name: "Value 18 (ID_WEB_Einst_BWS_akt)",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: false,
    luxWriteId: "18",
    factor: 10,
    dataSource: "raw_value",
    required: true
  },
  temperature_heat_source_in: {
    folder: "Informationen.01_Temperaturen",
    name: "W\xE4rmequelle Eintritt",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "19",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_overheating_target: {
    folder: "Informationen.01_Temperaturen",
    name: "\xDCberhitzung Soll",
    role: "value.temperature",
    type: "number",
    unit: "K",
    luxWriteId: "179",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_compressor1_heating: {
    folder: "Informationen.01_Temperaturen",
    name: "Hei\xDFgas Kompressor 1",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "177",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_overheating: {
    folder: "Informationen.01_Temperaturen",
    name: "\xDCberhitzung Ist",
    role: "value.temperature",
    type: "number",
    unit: "K",
    luxWriteId: "178",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_intake_compressor1: {
    folder: "Informationen.01_Temperaturen",
    name: "Saugstatus Kompressor 1 Temperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "176",
    factor: 10,
    dataSource: "raw_value"
  },
  temperature_intake_evaporation: {
    folder: "Informationen.01_Temperaturen",
    name: "Saugstatus Verdampfer Temperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "175",
    factor: 10,
    dataSource: "raw_value"
  },
  // Eingänge
  ASDin: {
    folder: "Informationen.02_Eingaenge",
    name: "Abtau-Endeschalter ASD",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "29",
    dataSource: "raw_value"
  },
  EVUin: {
    folder: "Informationen.02_Eingaenge",
    name: "EVU-Sperre",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "31",
    dataSource: "raw_value"
  },
  HDin: {
    folder: "Informationen.02_Eingaenge",
    name: "Hochdruckw\xE4chter HD",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "32",
    dataSource: "raw_value"
  },
  MOTin: {
    folder: "Informationen.02_Eingaenge",
    name: "Motorschutz MOT",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "33",
    dataSource: "raw_value"
  },
  NDin: {
    folder: "Informationen.02_Eingaenge",
    name: "Niederdruckw\xE4chter ND",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "34",
    dataSource: "raw_value"
  },
  AnalogIn: {
    folder: "Informationen.02_Eingaenge",
    name: "Analoger Eingang 1",
    role: "value",
    type: "number",
    unit: "V",
    luxWriteId: "147",
    dataSource: "raw_value",
    factor: 100
  },
  NDin_pressure: {
    folder: "Informationen.02_Eingaenge",
    name: "Niederdruck-Sensorwert",
    role: "value.pressure",
    type: "number",
    unit: "bar",
    luxWriteId: "181",
    factor: 100,
    dataSource: "raw_value"
  },
  HDin_pressure: {
    folder: "Informationen.02_Eingaenge",
    name: "Hochdruck-Sensorwert",
    role: "value.pressure",
    type: "number",
    unit: "bar",
    luxWriteId: "180",
    factor: 100,
    dataSource: "raw_value"
  },
  BWTin: {
    folder: "Informationen.02_Eingaenge",
    name: "Brauchwasserthermostat BWT",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "30",
    dataSource: "raw_value"
  },
  // Ausgänge
  AVout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Abtauventil AV",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "37",
    dataSource: "raw_value"
  },
  BUPout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Warmwasser-Umw\xE4lzpumpe BUP",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "38",
    dataSource: "raw_value"
  },
  HUPout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Heizungsumw\xE4lzpumpe HUP",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "39",
    dataSource: "raw_value",
    required: true
  },
  VENout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Ventilator VEN",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "42",
    dataSource: "raw_value"
  },
  VD1out: {
    folder: "Informationen.03_Ausgaenge",
    name: "Verdichter 1 VD1",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "44",
    dataSource: "raw_value",
    required: true
  },
  ZIPout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Zirkulationspumpe ZIP",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "46",
    dataSource: "raw_value",
    required: true
  },
  ZUPout: {
    folder: "Informationen.03_Ausgaenge",
    name: "Zusatzumw\xE4lzpumpe ZUP",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "47",
    dataSource: "raw_value"
  },
  ZW1out: {
    folder: "Informationen.03_Ausgaenge",
    name: "Zweiter W\xE4rmeerzeuger 1 ZW1",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "48",
    dataSource: "raw_value"
  },
  analogOut1: {
    folder: "Informationen.03_Ausgaenge",
    name: "Analoger Ausgang 1",
    role: "value",
    type: "number",
    unit: "V",
    luxWriteId: "156",
    dataSource: "raw_value",
    factor: 100
  },
  analogOut2: {
    folder: "Informationen.03_Ausgaenge",
    name: "Analoger Ausgang 2",
    role: "value",
    type: "number",
    unit: "V",
    luxWriteId: "157",
    dataSource: "raw_value",
    factor: 100
  },
  defrostValve: {
    folder: "Informationen.03_Ausgaenge",
    name: "Status Abtauventil",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "37",
    dataSource: "raw_value"
  },
  hotWaterBoilerValve: {
    folder: "Informationen.03_Ausgaenge",
    name: "Status Umschaltventil Warmwasser",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "38",
    dataSource: "raw_value"
  },
  heatingSystemCircPump: {
    folder: "Informationen.03_Ausgaenge",
    name: "Heizungsumw\xE4lzpumpe",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "39",
    dataSource: "raw_value"
  },
  heatSourceMotor: {
    folder: "Informationen.03_Ausgaenge",
    name: "Motor W\xE4rmequelle",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "43",
    dataSource: "raw_value"
  },
  compressor1: {
    folder: "Informationen.03_Ausgaenge",
    name: "Status Kompressor 1 Laufr\xFCckmeldung",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "44",
    dataSource: "raw_value"
  },
  hotWaterCircPumpExtern: {
    folder: "Informationen.03_Ausgaenge",
    name: "Warmwasser Zirkulationspumpe Extern",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "46",
    dataSource: "raw_value"
  },
  // Zeiten
  Time_WPein_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Einschaltzeit W\xE4rmepumpe",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "67",
    dataSource: "raw_value"
  },
  Time_ZWE1_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Laufzeit ZWE1",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "68",
    dataSource: "raw_value"
  },
  Timer_EinschVerz: {
    folder: "Informationen.04_Timer",
    name: "Einschaltverz\xF6gerung Restzeit",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "70",
    dataSource: "raw_value"
  },
  Time_SSPAUS_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Sperrzeit AUS",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "71",
    dataSource: "raw_value"
  },
  Time_SSPEIN_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Sperrzeit EIN",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "72",
    dataSource: "raw_value"
  },
  Time_VDStd_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Standzeit Verdichter",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "73",
    dataSource: "raw_value"
  },
  Time_HRM_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Zeit HRM",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "74",
    dataSource: "raw_value"
  },
  Time_HRW_akt: {
    folder: "Informationen.04_Timer",
    name: "Aktuelle Zeit HRW",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "75",
    dataSource: "raw_value"
  },
  Time_Heissgas: {
    folder: "Informationen.04_Timer",
    name: "Zeit Hei\xDFgas\xFCberwachung",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "158",
    dataSource: "raw_value"
  },
  ahp_Zeit: {
    folder: "Informationen.04_Timer",
    name: "Zeit ahp-Stufe",
    role: "value.time",
    type: "string",
    unit: "s",
    luxWriteId: "123",
    dataSource: "raw_value"
  },
  // Betriebsstunden
  hours_compressor1: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Betriebsstunden Kompressor 1",
    role: "value",
    type: "number",
    unit: "h",
    luxWriteId: "56",
    factor: 3600,
    dataSource: "raw_value"
  },
  starts_compressor1: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Schaltspiele Kompressor 1",
    role: "value",
    type: "number",
    luxWriteId: "57",
    dataSource: "raw_value"
  },
  hours_2nd_heat_source1: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Betriebsstunden Zweiter W\xE4rmeerzeuger 1 (Heizstab)",
    role: "value",
    type: "number",
    unit: "h",
    luxWriteId: "60",
    factor: 3600,
    dataSource: "raw_value"
  },
  hours_heatpump: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Betriebsstunden W\xE4rmepumpe Gesamt",
    role: "value",
    type: "number",
    unit: "h",
    luxWriteId: "63",
    factor: 3600,
    dataSource: "raw_value"
  },
  hours_heating: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Betriebsstunden Heizbetrieb",
    role: "value",
    type: "number",
    unit: "h",
    luxWriteId: "64",
    factor: 3600,
    dataSource: "raw_value"
  },
  hours_warmwater: {
    folder: "Informationen.05_Betriebsstunden",
    name: "Betriebsstunden Warmwassererzeugung",
    role: "value",
    type: "number",
    unit: "h",
    luxWriteId: "65",
    factor: 3600,
    dataSource: "raw_value"
  },
  // Fehlerspeicher & Abschaltungen (SYSTEMRELEVANT)
  Fehlerspeicher: {
    folder: "Informationen.06_Fehlerspeicher",
    name: "Fehlerhistorie (Die letzten 5 Fehler)",
    role: "string",
    type: "json",
    isVirtual: true,
    required: true
  },
  Abschaltungen: {
    folder: "Informationen.07_Abschaltungen",
    name: "Abschalthistorie (Die letzten 5 Abschaltungen)",
    role: "string",
    type: "json",
    isVirtual: true,
    required: true
  },
  // Betriebszustand
  WP_BZ_akt: {
    folder: "Informationen.08_Betriebszustand",
    name: "Aktueller Betriebszustand Code",
    role: "value",
    type: "number",
    states: {
      0: "Heizbetrieb",
      1: "Trinkwarmwasser",
      2: "Schwimmbad",
      3: "EVU-Sperre",
      4: "Abtauen",
      5: "Leerlauf",
      6: "Externe Energiequelle",
      7: "K\xFChlung"
    },
    luxWriteId: "80",
    dataSource: "raw_value",
    required: true
  },
  heatpump_extendet_state_string: {
    folder: "Informationen.08_Betriebszustand",
    name: "Erweiterter Status Text",
    role: "text",
    type: "string",
    dataSource: "value"
  },
  opStateHeating: {
    folder: "Informationen.08_Betriebszustand",
    name: "Betriebszustand Heizung",
    role: "value",
    type: "number",
    states: { 0: "Abgesenkt", 1: "Normal", 2: "Heizgrenze", 3: "Aus", 4: "Frostschutz" },
    luxWriteId: "125",
    dataSource: "raw_value"
  },
  opStateHeatingString: {
    folder: "Informationen.08_Betriebszustand",
    name: "Betriebszustand Heizung",
    role: "text",
    type: "string",
    dataSource: "value",
    required: true
  },
  opStateHotWaterString: {
    folder: "Informationen.08_Betriebszustand",
    name: "Betriebszustand Warmwasser",
    role: "text",
    type: "string",
    dataSource: "value"
  },
  bivalentLevel: {
    folder: "Informationen.08_Betriebszustand",
    name: "Bivalenzstufe",
    role: "value",
    type: "number",
    states: {
      1: "Ein Verdichter darf laufen",
      2: "Zwei Verdichter d\xFCrfen laufen",
      3: "Zus\xE4tzlicher W\xE4rmeerzeuger darf mitlaufen"
    },
    luxWriteId: "79",
    dataSource: "raw_value"
  },
  heatpump_duration: {
    folder: "Informationen.08_Betriebszustand",
    name: "Dauer aktueller Zustand",
    role: "value",
    type: "string",
    unit: "s",
    luxWriteId: "120",
    dataSource: "raw_value"
  },
  heatpump_state_string: {
    folder: "Informationen.08_Betriebszustand",
    name: "W\xE4rmepumpen Status Text",
    role: "text",
    type: "string",
    dataSource: "value"
  },
  Heizen_nach_Wasser: {
    folder: "Einstellungen.02_Heizung",
    name: "Heizen nach Wasser aktiv",
    role: "switch",
    type: "boolean",
    isVirtual: true,
    required: true
  },
  // Wärmemenge
  thermalenergy_heating: {
    folder: "Informationen.09_W\xE4rmemenge",
    name: "W\xE4rmemenge Heizung Erzeugt",
    role: "value.power.consumption",
    type: "number",
    unit: "kWh",
    luxWriteId: "151",
    factor: 10,
    dataSource: "raw_value"
  },
  thermalenergy_warmwater: {
    folder: "Informationen.09_W\xE4rmemenge",
    name: "W\xE4rmemenge Warmwasser Erzeugt",
    role: "value.power.consumption",
    type: "number",
    unit: "kWh",
    luxWriteId: "152",
    factor: 10,
    dataSource: "raw_value"
  },
  thermalenergy_ZWE1: {
    folder: "Informationen.09_W\xE4rmemenge",
    name: "W\xE4rmemenge Heizstab Erzeugt",
    role: "value.power.consumption",
    type: "number",
    luxWriteId: "1059",
    unit: "kWh",
    dataSource: "raw_parameter",
    factor: 100
  },
  thermalenergy_total: {
    folder: "Informationen.09_W\xE4rmemenge",
    name: "W\xE4rmemenge Gesamt Erzeugt",
    role: "value.power.consumption",
    type: "number",
    unit: "kWh",
    isVirtual: true
  },
  // Energie
  energy_heating: {
    folder: "Informationen.10_Energie",
    name: "Energie Heizung Erzeugt",
    role: "value.power.consumption",
    luxWriteId: "1136",
    type: "number",
    unit: "kWh",
    dataSource: "raw_parameter",
    factor: 100
  },
  energy_warmwater: {
    folder: "Informationen.10_Energie",
    name: "Energie Warmwasser Erzeugt",
    role: "value.power.consumption",
    type: "number",
    luxWriteId: "1137",
    unit: "kWh",
    dataSource: "raw_parameter",
    factor: 100
  },
  energy_ZWE1: {
    folder: "Informationen.10_Energie",
    name: "Energie Heizstab Erzeugt",
    role: "value.power.consumption",
    type: "number",
    luxWriteId: "1059",
    unit: "kWh",
    dataSource: "raw_parameter",
    factor: 100
  },
  energy_total: {
    folder: "Informationen.10_Energie",
    name: "Energie Gesamt Erzeugt",
    role: "value.power.consumption",
    type: "number",
    unit: "kWh",
    isVirtual: true
  },
  // 11_Tabellen
  heatingOperationTimerTable52MonFri: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Mo-Fr (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTable52SatSun: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Sa-So (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayFriday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Fr (Day Friday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayMonday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Mo (Day Monday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDaySaturday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Sa (Day Saturday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDaySunday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle So (Day Sunday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayThursday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Do (Day Thursday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayTuesday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Di (Day Tuesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableDayWednesday: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Mi (Day Wednesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  heatingOperationTimerTableWeek: {
    folder: "Informationen.11_Tabellen.Heizen",
    name: "Heizbetrieb Timer Tabelle Wo (Day Week)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTable52MonFri: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Mo-Fr (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTable52SatSun: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Sa-So (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayFriday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Fr (Day Friday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayMonday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Mo (Day Monday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDaySaturday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Sa (Day Saturday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDaySunday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle So (Day Sunday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayThursday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Do (Day Thursday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayTuesday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Di (Day Tuesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableDayWednesday: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Mi (Day Wednesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterTableWeek: {
    folder: "Informationen.11_Tabellen.Warmwasser",
    name: "Warmwasserbetrieb Timer Tabelle Wo (Day Week)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTable52MonFri: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Mo-Fr (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTable52SatSun: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Sa-So (5+2)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDayFriday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Fr (Day Friday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDayMonday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Mo (Day Monday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDaySaturday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Sa (Day Saturday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDaySunday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle So (Day Sunday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDayThursday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Do (Day Thursday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDayTuesday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Di (Day Tuesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableDayWednesday: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Mi (Day Wednesday)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  hotWaterCircPumpTimerTableWeek: {
    folder: "Informationen.11_Tabellen.Zirkulation",
    name: "Zirkulationsbetrieb Timer Tabelle Wo (Day Week)",
    role: "string",
    type: "json",
    dataSource: "parameter"
  },
  // 12_Systeminfo
  heatpump_type: {
    folder: "Informationen.12_Systeminfo",
    name: "W\xE4rmepumpen-Typ",
    role: "text",
    type: "string",
    dataSource: "raw_value"
  },
  firmware: {
    folder: "Informationen.12_Systeminfo",
    name: "Firmware-Version",
    role: "text",
    type: "string",
    dataSource: "raw_value"
  },
  ip_address: {
    folder: "Informationen.12_Systeminfo",
    name: "Aktuelle IP-Adresse",
    role: "info.ip",
    type: "string",
    dataSource: "raw_value"
  },
  subnet: {
    folder: "Informationen.12_Systeminfo",
    name: "Subnetzmaske",
    role: "info.ip",
    type: "string",
    dataSource: "raw_value"
  },
  broadcast_address: {
    folder: "Informationen.12_Systeminfo",
    name: "Broadcast-Adresse",
    role: "info.ip",
    type: "string",
    dataSource: "raw_value"
  },
  standard_gateway: {
    folder: "Informationen.12_Systeminfo",
    name: "Standard-Gateway",
    role: "info.ip",
    type: "string",
    dataSource: "raw_value"
  },
  LIN_exists: {
    folder: "Informationen.12_Systeminfo",
    name: "LIN-Bus vorhanden",
    role: "indicator",
    type: "boolean",
    luxWriteId: "174",
    dataSource: "raw_value"
  },
  Ger\u00E4tezeit: {
    folder: "Informationen.12_Systeminfo",
    name: "Ger\xE4tezeit",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_value",
    luxWriteId: "134"
  },
  // ==========================================
  // KÜHLUNG (COOLING)
  // ==========================================
  cooling_operation_mode: {
    folder: "Informationen.13_Kuehlung",
    name: "Betriebsart K\xFChlung",
    role: "value",
    type: "number",
    write: true,
    luxWriteId: "108",
    states: { 0: "Aus", 1: "Automatik" },
    dataSource: "raw_parameter"
  },
  cooling_release_temp: {
    folder: "Informationen.13_Kuehlung",
    name: "K\xFChlfreigabe Temperatur",
    role: "level.temperature",
    type: "number",
    unit: "\xB0C",
    write: true,
    luxWriteId: "110",
    factor: 10,
    dataSource: "raw_parameter"
  },
  cooling_inlet_temp: {
    folder: "Informationen.13_Kuehlung",
    name: "K\xFChlmitteleinlasstemperatur",
    role: "level.temperature",
    type: "number",
    unit: "\xB0C",
    write: false,
    luxWriteId: "132",
    factor: 10,
    dataSource: "raw_parameter"
  },
  cooling_start_after_hours: {
    folder: "Informationen.13_Kuehlung",
    name: "cooling_start_after_hours",
    role: "level.temperature",
    type: "number",
    unit: "h",
    write: true,
    luxWriteId: "850",
    dataSource: "raw_parameter"
  },
  cooling_end_after_hours: {
    folder: "Informationen.13_Kuehlung",
    name: "cooling_end_after_hours",
    role: "level.temperature",
    type: "number",
    unit: "h",
    write: true,
    luxWriteId: "851",
    dataSource: "raw_parameter"
  },
  hours_cooling: {
    folder: "Informationen.13_Kuehlung",
    name: "hours_cooling",
    role: "level.temperature",
    type: "number",
    unit: "h",
    write: false,
    luxWriteId: "66",
    factor: 3600,
    dataSource: "raw_parameter"
  },
  // ==========================================
  // EINSTELLUNGEN & PARAMETER (Beschreibbar)
  // ==========================================
  // Betriebsmodus
  heating_operation_mode: {
    folder: "Einstellungen.01_Betriebsmodus",
    name: "Betriebsart Heizung",
    role: "level.mode",
    type: "number",
    write: true,
    states: { 0: "Automatik", 1: "Zweites WEZ", 2: "Party", 3: "Ferien", 4: "Aus" },
    luxWriteId: "3",
    dataSource: "raw_parameter"
  },
  warmwater_operation_mode: {
    folder: "Einstellungen.01_Betriebsmodus",
    name: "Betriebsart Warmwasser",
    role: "level.mode",
    type: "number",
    write: true,
    states: { 0: "Automatik", 1: "Zweites WEZ", 2: "Party", 3: "Ferien", 4: "Aus" },
    luxWriteId: "4",
    dataSource: "raw_parameter"
  },
  // Heizung
  heating_curve_end_point: {
    folder: "Einstellungen.02_Heizung",
    name: "Heizkurve Endpunkt (R\xFCcklauf)",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: true,
    min: 20,
    max: 45,
    luxWriteId: "11",
    factor: 10,
    dataSource: "raw_parameter",
    required: true
  },
  heating_curve_parallel_offset: {
    folder: "Einstellungen.02_Heizung",
    name: "Heizkurve Fusspunkt",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: true,
    min: 20,
    max: 45,
    luxWriteId: "12",
    factor: 10,
    dataSource: "raw_parameter",
    required: true
  },
  deltaHeatingReduction: {
    folder: "Einstellungen.02_Heizung",
    name: "Heizung Nachtabsenkung (Delta)",
    role: "value.temperature",
    type: "number",
    unit: "K",
    write: true,
    factor: 10,
    min: -10,
    max: 10,
    luxWriteId: "13",
    dataSource: "raw_parameter"
  },
  heating_temperature: {
    folder: "Einstellungen.02_Heizung",
    name: "Heizung Verschiebng Soll-Temperatur (Wunschwert)",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: true,
    luxWriteId: "1",
    factor: 10,
    min: -5,
    max: 5,
    dataSource: "raw_parameter"
  },
  returnTemperatureHysteresis: {
    folder: "Einstellungen.02_Heizung",
    name: "R\xFCcklauftemperatur Hysterese",
    role: "value.temperature",
    type: "number",
    unit: "K",
    write: true,
    factor: 10,
    min: 1,
    max: 5,
    luxWriteId: "88",
    dataSource: "raw_parameter",
    required: true
  },
  thresholdHeatingLimit: {
    folder: "Einstellungen.02_Heizung",
    name: "Parameter 700 (ID_Einst_Heizgrenze_Temp)",
    role: "value",
    type: "number",
    write: true,
    luxWriteId: "700",
    unit: "\xB0C",
    factor: 10,
    dataSource: "raw_parameter"
  },
  heatingLimit: {
    folder: "Einstellungen.02_Heizung",
    name: "Parameter 699 (ID_Einst_Heizgrenze)",
    write: true,
    role: "value",
    type: "number",
    luxWriteId: "699",
    states: { 0: "Aus", 1: "Ein" },
    dataSource: "raw_parameter"
  },
  // Warmwasser
  warmwater_temperature: {
    folder: "Einstellungen.03_Warmwasser",
    name: "Warmwasser Soll-Temperatur",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    write: true,
    luxWriteId: "2",
    factor: 10,
    min: 30,
    max: 75,
    dataSource: "raw_parameter",
    required: true
  },
  // temperature_hot_water_target: {
  // 	folder: 'Einstellungen.03_Warmwasser',
  // 	name: 'Warmwasser Soll-Temperatur',
  // 	role: 'value.temperature',
  // 	type: 'number',
  // 	unit: '°C',
  // 	write: true,
  // 	luxWriteId: '105',
  // 	factor: 10,
  // 	min: 30,
  // 	max: 75,
  // 	dataSource: 'raw_parameter',
  // 	required: true,
  // },
  hotWaterTemperatureHysteresis: {
    folder: "Einstellungen.03_Warmwasser",
    name: "Warmwasser Hysterese",
    role: "value.temperature",
    type: "number",
    unit: "K",
    write: true,
    factor: 10,
    min: 1,
    max: 15,
    luxWriteId: "74",
    dataSource: "raw_parameter",
    required: true
  },
  // Pumpe (HUP)
  heating_system_circ_pump_voltage_nominal: {
    folder: "Einstellungen.04_HUP",
    name: "Heizungsumw\xE4lzpumpe Nennspannung",
    role: "value.voltage",
    type: "number",
    unit: "V",
    write: true,
    factor: 100,
    min: 3,
    max: 10,
    luxWriteId: "867",
    dataSource: "raw_parameter",
    required: true
  },
  heating_system_circ_pump_voltage_minimal: {
    folder: "Einstellungen.04_HUP",
    name: "Heizungsumw\xE4lzpumpe Minimalspannung",
    role: "value.voltage",
    type: "number",
    unit: "V",
    write: true,
    factor: 100,
    min: 3,
    max: 10,
    luxWriteId: "868",
    dataSource: "raw_parameter",
    required: true
  },
  // Zip
  runDeaerate: {
    folder: "Einstellungen.05_ZIP",
    name: "Entl\xFCftungsprogramm starten",
    role: "value",
    type: "number",
    write: true,
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "158",
    dataSource: "raw_parameter",
    required: true
  },
  hotWaterCircPumpDeaerate: {
    folder: "Einstellungen.05_ZIP",
    name: "Zirkulationspumpe entl\xFCften",
    role: "value",
    type: "number",
    states: { 0: "Aus", 1: "Ein" },
    write: true,
    luxWriteId: "684",
    dataSource: "raw_parameter",
    required: true
  },
  Activate_Zip: {
    folder: "Einstellungen.05_ZIP",
    name: "Makro: ZIP starten",
    role: "switch",
    type: "boolean",
    write: true,
    states: { 0: "Aus", 1: "Ein" },
    luxWriteId: "Activate_Zip",
    isVirtual: true,
    required: true
  },
  hotWaterCircPumpOnTime: {
    folder: "Einstellungen.05_ZIP",
    name: "Laufzeit ZIP aktiv",
    role: "value",
    type: "number",
    write: true,
    unit: "min",
    factor: 1,
    luxWriteId: "697",
    dataSource: "raw_parameter",
    required: true
  },
  hotWaterCircPumpOffTime: {
    folder: "Einstellungen.05_ZIP",
    name: "Laufzeit ZIP inaktiv",
    role: "value",
    type: "number",
    write: true,
    unit: "min",
    factor: 1,
    luxWriteId: "698",
    dataSource: "raw_parameter",
    required: true
  },
  zip_aktiv: {
    folder: "Einstellungen.05_ZIP",
    name: "ZIP Dauer (Normal)",
    role: "value",
    type: "number",
    unit: "s",
    isVirtual: true,
    write: true,
    def: 120,
    required: true
  },
  // Systemeinstellungen
  Pumpenoptimierung: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Parameter 49 (ID_Einst_Popt_akt)",
    role: "value",
    type: "number",
    write: true,
    luxWriteId: "49",
    dataSource: "raw_parameter",
    states: { 0: "Aus", 1: "Ein" }
  },
  Pumpen_Nachlauf: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Parameter 864 (ID_Einst_Popt_Nachlauf_akt)",
    role: "value",
    type: "number",
    write: true,
    luxWriteId: "864",
    dataSource: "raw_parameter",
    unit: "min",
    factor: 1
  },
  temperature_supply_limit: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Vorlauftemperatur Maximum",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "149",
    factor: 10,
    dataSource: "raw_parameter",
    required: true,
    write: true
  },
  temperature_return_limit: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "R\xFCcklauftemperatur Soll Minimum",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "87",
    factor: 10,
    dataSource: "raw_parameter",
    required: true,
    max: 75,
    min: 35,
    write: true
  },
  temperature_outdoor_max: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "TAussen max",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "91",
    factor: 10,
    dataSource: "raw_parameter",
    required: true,
    max: 45,
    min: 20,
    write: true
  },
  temperature_outdoor_min: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "TAussen min",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "92",
    factor: 10,
    dataSource: "raw_parameter",
    required: true,
    max: 10,
    min: -20,
    write: true
  },
  temperature_ZWE_possible: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Freig. ZWE",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "90",
    factor: 10,
    dataSource: "raw_parameter",
    write: true,
    min: -20,
    max: 20
  },
  temperature_hot_water_limit: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Max.Warmwassertemp.",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "47",
    factor: 10,
    dataSource: "raw_parameter",
    write: true,
    min: 30,
    max: 65
  },
  thresholdTemperatureSetBack: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Absenk. bis",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "111",
    factor: 10,
    dataSource: "raw_parameter",
    write: true,
    min: -20,
    max: 10
  },
  returnTemperatureTargetMin: {
    folder: "Einstellungen.06_System-Einstellung",
    name: "Min. R\xFCckl.Solltemp.",
    role: "value.temperature",
    type: "number",
    unit: "\xB0C",
    luxWriteId: "979",
    factor: 10,
    dataSource: "raw_parameter",
    write: true,
    min: 15,
    max: 30
  },
  // Timer Tables Selection
  heatingOperationTimerTableSelected: {
    folder: "Einstellungen.07_Tabellen",
    name: "Aktuell ausgew\xE4hlte Tabelle Heizbetrieb Timer",
    role: "value",
    type: "number",
    luxWriteId: "222",
    dataSource: "raw_parameter",
    states: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" }
  },
  hotWaterCircPumpTimerTableSelected: {
    folder: "Einstellungen.07_Tabellen",
    name: "Aktuell ausgew\xE4hlte Tabelle Zirkulationsbetrieb Timer",
    role: "value",
    type: "number",
    luxWriteId: "506",
    dataSource: "raw_parameter",
    states: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" },
    required: true
  },
  hotWaterOperationTimerTableSelected: {
    folder: "Einstellungen.07_Tabellen",
    name: "Aktuell ausgew\xE4hlte Tabelle Warmwasserbetrieb Timer",
    role: "value",
    type: "number",
    luxWriteId: "405",
    dataSource: "raw_parameter",
    states: { 0: "Woche (Mo-So)", 1: "5+2 (Mo-Fr, Sa-So)", 2: "Tage (Mo, Di, ...)" },
    required: true
  },
  // =========================================================
  // HEIZEN TIMER: WOCHE (MO-SO)
  // =========================================================
  HZ_MoSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Start 1 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "223",
    write: true
  },
  HZ_MoSo_End1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Ende 1 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "224",
    write: true
  },
  HZ_MoSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Start 2 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "225",
    write: true
  },
  HZ_MoSo_End2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Ende 2 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "226",
    write: true
  },
  HZ_MoSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Start 3 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "227",
    write: true
  },
  HZ_MoSo_End3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Mo-So",
    name: "Heizen Timer Tabelle Ende 3 Woche (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "228",
    write: true
  },
  // =========================================================
  // HEIZEN TIMER: 5+2 (MO-FR & SA-SO)
  // =========================================================
  HZ_MoFr_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "229",
    write: true
  },
  HZ_MoFr_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "230",
    write: true
  },
  HZ_MoFr_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "231",
    write: true
  },
  HZ_MoFr_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "232",
    write: true
  },
  HZ_MoFr_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "233",
    write: true
  },
  HZ_MoFr_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "234",
    write: true
  },
  HZ_SaSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "235",
    write: true
  },
  HZ_SaSo_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "236",
    write: true
  },
  HZ_SaSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "237",
    write: true
  },
  HZ_SaSo_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "238",
    write: true
  },
  HZ_SaSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Start 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "239",
    write: true
  },
  HZ_SaSo_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.52_MoFr_SaSo",
    name: "Heizen Timer Tabelle Ende 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "240",
    write: true
  },
  // =========================================================
  // HEIZEN TIMER: EINZELTAGE
  // =========================================================
  HZ_Sonntag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Start 1 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "241",
    write: true
  },
  HZ_Sonntag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Ende 1 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "242",
    write: true
  },
  HZ_Sonntag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Start 2 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "243",
    write: true
  },
  HZ_Sonntag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Ende 2 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "244",
    write: true
  },
  HZ_Sonntag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Start 3 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "245",
    write: true
  },
  HZ_Sonntag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Sonntag",
    name: "Heizen Timer Tabelle Ende 3 Sonntag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "246",
    write: true
  },
  HZ_Montag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Start 1 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "247",
    write: true
  },
  HZ_Montag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Ende 1 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "248",
    write: true
  },
  HZ_Montag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Start 2 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "249",
    write: true
  },
  HZ_Montag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Ende 2 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "250",
    write: true
  },
  HZ_Montag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Start 3 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "251",
    write: true
  },
  HZ_Montag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Montag",
    name: "Heizen Timer Tabelle Ende 3 Montag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "252",
    write: true
  },
  HZ_Dienstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Start 1 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "253",
    write: true
  },
  HZ_Dienstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Ende 1 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "254",
    write: true
  },
  HZ_Dienstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Start 2 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "255",
    write: true
  },
  HZ_Dienstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Ende 2 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "256",
    write: true
  },
  HZ_Dienstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Start 3 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "257",
    write: true
  },
  HZ_Dienstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Dienstag",
    name: "Heizen Timer Tabelle Ende 3 Dienstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "258",
    write: true
  },
  HZ_Mittwoch_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Start 1 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "259",
    write: true
  },
  HZ_Mittwoch_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Ende 1 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "260",
    write: true
  },
  HZ_Mittwoch_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Start 2 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "261",
    write: true
  },
  HZ_Mittwoch_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Ende 2 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "262",
    write: true
  },
  HZ_Mittwoch_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Start 3 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "263",
    write: true
  },
  HZ_Mittwoch_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Mittwoch",
    name: "Heizen Timer Tabelle Ende 3 Mittwoch",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "264",
    write: true
  },
  HZ_Donnerstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Start 1 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "265",
    write: true
  },
  HZ_Donnerstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Ende 1 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "266",
    write: true
  },
  HZ_Donnerstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Start 2 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "267",
    write: true
  },
  HZ_Donnerstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Ende 2 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "268",
    write: true
  },
  HZ_Donnerstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Start 3 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "269",
    write: true
  },
  HZ_Donnerstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Donnerstag",
    name: "Heizen Timer Tabelle Ende 3 Donnerstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "270",
    write: true
  },
  HZ_Freitag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Start 1 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "271",
    write: true
  },
  HZ_Freitag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Ende 1 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "272",
    write: true
  },
  HZ_Freitag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Start 2 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "273",
    write: true
  },
  HZ_Freitag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Ende 2 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "274",
    write: true
  },
  HZ_Freitag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Start 3 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "275",
    write: true
  },
  HZ_Freitag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Freitag",
    name: "Heizen Timer Tabelle Ende 3 Freitag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "276",
    write: true
  },
  HZ_Samstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Start 1 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "277",
    write: true
  },
  HZ_Samstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Ende 1 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "278",
    write: true
  },
  HZ_Samstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Start 2 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "279",
    write: true
  },
  HZ_Samstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Ende 2 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "280",
    write: true
  },
  HZ_Samstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Start 3 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "281",
    write: true
  },
  HZ_Samstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Heizen.Parameter.Days.Samstag",
    name: "Heizen Timer Tabelle Ende 3 Samstag",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "282",
    write: true
  },
  // =========================================================
  // WARMWASSER TIMER: WOCHE (MO-SO)
  // =========================================================
  WW_MoSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Start 1 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "507",
    write: true,
    required: true
  },
  WW_MoSo_End1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Ende 1 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "508",
    write: true,
    required: true
  },
  WW_MoSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Start 2 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "509",
    write: true,
    required: true
  },
  WW_MoSo_End2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Ende 2 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "510",
    write: true,
    required: true
  },
  WW_MoSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Start 3 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "511",
    write: true,
    required: true
  },
  WW_MoSo_End3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Ende 3 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "512",
    write: true,
    required: true
  },
  WW_MoSo_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Start 4 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "513",
    write: true,
    required: true
  },
  WW_MoSo_End4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Ende 4 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "514",
    write: true,
    required: true
  },
  WW_MoSo_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Start 5 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "515",
    write: true,
    required: true
  },
  WW_MoSo_End5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Mo-So",
    name: "Warmwasser Timer Ende 5 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "516",
    write: true,
    required: true
  },
  // =========================================================
  // WARMWASSER TIMER: 5+2 (MO-FR & SA-SO)
  // =========================================================
  WW_MoFr_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "416",
    write: true
  },
  WW_MoFr_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "417",
    write: true
  },
  WW_MoFr_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "418",
    write: true
  },
  WW_MoFr_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "419",
    write: true
  },
  WW_MoFr_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "420",
    write: true
  },
  WW_MoFr_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "421",
    write: true
  },
  WW_MoFr_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 4 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "422",
    write: true
  },
  WW_MoFr_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 4 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "423",
    write: true
  },
  WW_MoFr_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 5 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "424",
    write: true
  },
  WW_MoFr_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 5 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "425",
    write: true
  },
  WW_SaSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "426",
    write: true
  },
  WW_SaSo_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "427",
    write: true
  },
  WW_SaSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "428",
    write: true
  },
  WW_SaSo_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "429",
    write: true
  },
  WW_SaSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "430",
    write: true
  },
  WW_SaSo_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "431",
    write: true
  },
  WW_SaSo_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 4 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "432",
    write: true
  },
  WW_SaSo_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 4 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "433",
    write: true
  },
  WW_SaSo_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Start 5 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "434",
    write: true
  },
  WW_SaSo_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.52_MoFr_SaSo",
    name: "Warmwasser Timer Ende 5 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "435",
    write: true
  },
  // =========================================================
  // WARMWASSER TIMER: EINZELTAGE
  // =========================================================
  WW_Sonntag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Start 1 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "436",
    write: true
  },
  WW_Sonntag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Ende 1 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "437",
    write: true
  },
  WW_Sonntag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Start 2 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "438",
    write: true
  },
  WW_Sonntag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Ende 2 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "439",
    write: true
  },
  WW_Sonntag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Start 3 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "440",
    write: true
  },
  WW_Sonntag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Ende 3 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "441",
    write: true
  },
  WW_Sonntag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Start 4 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "442",
    write: true
  },
  WW_Sonntag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Ende 4 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "443",
    write: true
  },
  WW_Sonntag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Start 5 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "444",
    write: true
  },
  WW_Sonntag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Sonntag",
    name: "Warmwasser Timer Ende 5 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "445",
    write: true
  },
  WW_Montag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Start 1 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "446",
    write: true
  },
  WW_Montag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Ende 1 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "447",
    write: true
  },
  WW_Montag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Start 2 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "448",
    write: true
  },
  WW_Montag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Ende 2 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "449",
    write: true
  },
  WW_Montag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Start 3 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "450",
    write: true
  },
  WW_Montag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Ende 3 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "451",
    write: true
  },
  WW_Montag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Start 4 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "452",
    write: true
  },
  WW_Montag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Ende 4 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "453",
    write: true
  },
  WW_Montag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Start 5 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "454",
    write: true
  },
  WW_Montag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Montag",
    name: "Warmwasser Timer Ende 5 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "455",
    write: true
  },
  WW_Dienstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Start 1 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "456",
    write: true
  },
  WW_Dienstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Ende 1 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "457",
    write: true
  },
  WW_Dienstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Start 2 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "458",
    write: true
  },
  WW_Dienstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Ende 2 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "459",
    write: true
  },
  WW_Dienstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Start 3 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "460",
    write: true
  },
  WW_Dienstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Ende 3 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "461",
    write: true
  },
  WW_Dienstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Start 4 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "462",
    write: true
  },
  WW_Dienstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Ende 4 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "463",
    write: true
  },
  WW_Dienstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Start 5 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "464",
    write: true
  },
  WW_Dienstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Dienstag",
    name: "Warmwasser Timer Ende 5 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "465",
    write: true
  },
  WW_Mittwoch_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Start 1 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "466",
    write: true
  },
  WW_Mittwoch_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Ende 1 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "467",
    write: true
  },
  WW_Mittwoch_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Start 2 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "468",
    write: true
  },
  WW_Mittwoch_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Ende 2 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "469",
    write: true
  },
  WW_Mittwoch_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Start 3 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "470",
    write: true
  },
  WW_Mittwoch_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Ende 3 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "471",
    write: true
  },
  WW_Mittwoch_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Start 4 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "472",
    write: true
  },
  WW_Mittwoch_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Ende 4 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "473",
    write: true
  },
  WW_Mittwoch_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Start 5 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "474",
    write: true
  },
  WW_Mittwoch_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Mittwoch",
    name: "Warmwasser Timer Ende 5 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "475",
    write: true
  },
  WW_Donnerstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Start 1 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "476",
    write: true
  },
  WW_Donnerstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Ende 1 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "477",
    write: true
  },
  WW_Donnerstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Start 2 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "478",
    write: true
  },
  WW_Donnerstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Ende 2 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "479",
    write: true
  },
  WW_Donnerstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Start 3 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "480",
    write: true
  },
  WW_Donnerstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Ende 3 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "481",
    write: true
  },
  WW_Donnerstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Start 4 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "482",
    write: true
  },
  WW_Donnerstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Ende 4 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "483",
    write: true
  },
  WW_Donnerstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Start 5 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "484",
    write: true
  },
  WW_Donnerstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Donnerstag",
    name: "Warmwasser Timer Ende 5 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "485",
    write: true
  },
  WW_Freitag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Start 1 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "486",
    write: true
  },
  WW_Freitag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Ende 1 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "487",
    write: true
  },
  WW_Freitag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Start 2 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "488",
    write: true
  },
  WW_Freitag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Ende 2 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "489",
    write: true
  },
  WW_Freitag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Start 3 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "490",
    write: true
  },
  WW_Freitag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Ende 3 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "491",
    write: true
  },
  WW_Freitag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Start 4 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "492",
    write: true
  },
  WW_Freitag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Ende 4 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "493",
    write: true
  },
  WW_Freitag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Start 5 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "494",
    write: true
  },
  WW_Freitag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Freitag",
    name: "Warmwasser Timer Ende 5 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "495",
    write: true
  },
  WW_Samstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Start 1 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "496",
    write: true
  },
  WW_Samstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Ende 1 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "497",
    write: true
  },
  WW_Samstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Start 2 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "498",
    write: true
  },
  WW_Samstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Ende 2 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "499",
    write: true
  },
  WW_Samstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Start 3 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "500",
    write: true
  },
  WW_Samstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Ende 3 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "501",
    write: true
  },
  WW_Samstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Start 4 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "502",
    write: true
  },
  WW_Samstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Ende 4 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "503",
    write: true
  },
  WW_Samstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Start 5 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "504",
    write: true
  },
  WW_Samstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Warmwasser.Parameter.Days.Samstag",
    name: "Warmwasser Timer Ende 5 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "505",
    write: true
  },
  // =========================================================
  // Zirkulation TIMER: WOCHE (MO-SO)
  // =========================================================
  Zirkulation_MoSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Start 1 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "507",
    write: true,
    required: true
  },
  Zirkulation_MoSo_End1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Ende 1 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "508",
    write: true,
    required: true
  },
  Zirkulation_MoSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Start 2 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "509",
    write: true,
    required: true
  },
  Zirkulation_MoSo_End2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Ende 2 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "510",
    write: true,
    required: true
  },
  Zirkulation_MoSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Start 3 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "511",
    write: true,
    required: true
  },
  Zirkulation_MoSo_End3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Ende 3 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "512",
    write: true,
    required: true
  },
  Zirkulation_MoSo_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Start 4 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "513",
    write: true,
    required: true
  },
  Zirkulation_MoSo_End4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Ende 4 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "514",
    write: true,
    required: true
  },
  Zirkulation_MoSo_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Start 5 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "515",
    write: true,
    required: true
  },
  Zirkulation_MoSo_End5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Mo-So",
    name: "Zirkulation Timer Ende 5 (Mo-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "516",
    write: true,
    required: true
  },
  // =========================================================
  // Zirkulation TIMER: 5+2 (MO-FR & SA-SO)
  // =========================================================
  Zirkulation_MoFr_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "517",
    write: true
  },
  Zirkulation_MoFr_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 1 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "518",
    write: true
  },
  Zirkulation_MoFr_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "519",
    write: true
  },
  Zirkulation_MoFr_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 2 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "520",
    write: true
  },
  Zirkulation_MoFr_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "521",
    write: true
  },
  Zirkulation_MoFr_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 3 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "522",
    write: true
  },
  Zirkulation_MoFr_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 4 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "523",
    write: true
  },
  Zirkulation_MoFr_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 4 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "524",
    write: true
  },
  Zirkulation_MoFr_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 5 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "525",
    write: true
  },
  Zirkulation_MoFr_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 5 (Mo-Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "526",
    write: true
  },
  Zirkulation_SaSo_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "527",
    write: true
  },
  Zirkulation_SaSo_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 1 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "528",
    write: true
  },
  Zirkulation_SaSo_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "529",
    write: true
  },
  Zirkulation_SaSo_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 2 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "530",
    write: true
  },
  Zirkulation_SaSo_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "531",
    write: true
  },
  Zirkulation_SaSo_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 3 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "532",
    write: true
  },
  Zirkulation_SaSo_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 4 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "533",
    write: true
  },
  Zirkulation_SaSo_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 4 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "534",
    write: true
  },
  Zirkulation_SaSo_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Start 5 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "535",
    write: true
  },
  Zirkulation_SaSo_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.52_MoFr_SaSo",
    name: "Zirkulation Timer Ende 5 (Sa-So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "536",
    write: true
  },
  // =========================================================
  // Zirkulation TIMER: EINZELTAGE
  // =========================================================
  Zirkulation_Sonntag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Start 1 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "537",
    write: true
  },
  Zirkulation_Sonntag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Ende 1 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "538",
    write: true
  },
  Zirkulation_Sonntag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Start 2 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "539",
    write: true
  },
  Zirkulation_Sonntag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Ende 2 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "540",
    write: true
  },
  Zirkulation_Sonntag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Start 3 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "541",
    write: true
  },
  Zirkulation_Sonntag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Ende 3 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "542",
    write: true
  },
  Zirkulation_Sonntag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Start 4 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "543",
    write: true
  },
  Zirkulation_Sonntag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Ende 4 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "544",
    write: true
  },
  Zirkulation_Sonntag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Start 5 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "545",
    write: true
  },
  Zirkulation_Sonntag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Sonntag",
    name: "Zirkulation Timer Ende 5 (So)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "546",
    write: true
  },
  Zirkulation_Montag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Start 1 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "547",
    write: true
  },
  Zirkulation_Montag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Ende 1 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "548",
    write: true
  },
  Zirkulation_Montag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Start 2 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "549",
    write: true
  },
  Zirkulation_Montag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Ende 2 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "550",
    write: true
  },
  Zirkulation_Montag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Start 3 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "551",
    write: true
  },
  Zirkulation_Montag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Ende 3 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "552",
    write: true
  },
  Zirkulation_Montag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Start 4 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "553",
    write: true
  },
  Zirkulation_Montag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Ende 4 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "554",
    write: true
  },
  Zirkulation_Montag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Start 5 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "555",
    write: true
  },
  Zirkulation_Montag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Montag",
    name: "Zirkulation Timer Ende 5 (Mo)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "556",
    write: true
  },
  Zirkulation_Dienstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Start 1 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "557",
    write: true
  },
  Zirkulation_Dienstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Ende 1 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "558",
    write: true
  },
  Zirkulation_Dienstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Start 2 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "559",
    write: true
  },
  Zirkulation_Dienstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Ende 2 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "560",
    write: true
  },
  Zirkulation_Dienstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Start 3 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "561",
    write: true
  },
  Zirkulation_Dienstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Ende 3 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "562",
    write: true
  },
  Zirkulation_Dienstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Start 4 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "563",
    write: true
  },
  Zirkulation_Dienstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Ende 4 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "564",
    write: true
  },
  Zirkulation_Dienstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Start 5 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "565",
    write: true
  },
  Zirkulation_Dienstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Dienstag",
    name: "Zirkulation Timer Ende 5 (Di)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "566",
    write: true
  },
  Zirkulation_Mittwoch_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Start 1 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "567",
    write: true
  },
  Zirkulation_Mittwoch_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Ende 1 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "568",
    write: true
  },
  Zirkulation_Mittwoch_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Start 2 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "569",
    write: true
  },
  Zirkulation_Mittwoch_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Ende 2 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "570",
    write: true
  },
  Zirkulation_Mittwoch_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Start 3 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "571",
    write: true
  },
  Zirkulation_Mittwoch_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Ende 3 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "572",
    write: true
  },
  Zirkulation_Mittwoch_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Start 4 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "573",
    write: true
  },
  Zirkulation_Mittwoch_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Ende 4 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "574",
    write: true
  },
  Zirkulation_Mittwoch_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Start 5 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "575",
    write: true
  },
  Zirkulation_Mittwoch_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Mittwoch",
    name: "Zirkulation Timer Ende 5 (Mi)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "576",
    write: true
  },
  Zirkulation_Donnerstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Start 1 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "577",
    write: true
  },
  Zirkulation_Donnerstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Ende 1 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "578",
    write: true
  },
  Zirkulation_Donnerstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Start 2 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "579",
    write: true
  },
  Zirkulation_Donnerstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Ende 2 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "580",
    write: true
  },
  Zirkulation_Donnerstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Start 3 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "581",
    write: true
  },
  Zirkulation_Donnerstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Ende 3 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "582",
    write: true
  },
  Zirkulation_Donnerstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Start 4 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "583",
    write: true
  },
  Zirkulation_Donnerstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Ende 4 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "584",
    write: true
  },
  Zirkulation_Donnerstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Start 5 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "585",
    write: true
  },
  Zirkulation_Donnerstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Donnerstag",
    name: "Zirkulation Timer Ende 5 (Do)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "586",
    write: true
  },
  Zirkulation_Freitag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Start 1 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "587",
    write: true
  },
  Zirkulation_Freitag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Ende 1 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "588",
    write: true
  },
  Zirkulation_Freitag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Start 2 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "589",
    write: true
  },
  Zirkulation_Freitag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Ende 2 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "590",
    write: true
  },
  Zirkulation_Freitag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Start 3 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "591",
    write: true
  },
  Zirkulation_Freitag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Ende 3 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "592",
    write: true
  },
  Zirkulation_Freitag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Start 4 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "593",
    write: true
  },
  Zirkulation_Freitag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Ende 4 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "594",
    write: true
  },
  Zirkulation_Freitag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Start 5 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "595",
    write: true
  },
  Zirkulation_Freitag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Freitag",
    name: "Zirkulation Timer Ende 5 (Fr)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "596",
    write: true
  },
  Zirkulation_Samstag_Start1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Start 1 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "597",
    write: true
  },
  Zirkulation_Samstag_Ende1: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Ende 1 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "598",
    write: true
  },
  Zirkulation_Samstag_Start2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Start 2 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "599",
    write: true
  },
  Zirkulation_Samstag_Ende2: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Ende 2 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "600",
    write: true
  },
  Zirkulation_Samstag_Start3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Start 3 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "601",
    write: true
  },
  Zirkulation_Samstag_Ende3: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Ende 3 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "602",
    write: true
  },
  Zirkulation_Samstag_Start4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Start 4 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "603",
    write: true
  },
  Zirkulation_Samstag_Ende4: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Ende 4 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "604",
    write: true
  },
  Zirkulation_Samstag_Start5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Start 5 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "605",
    write: true
  },
  Zirkulation_Samstag_Ende5: {
    folder: "Einstellungen.07_Tabellen.Zirkulation.Parameter.Days.Samstag",
    name: "Zirkulation Timer Ende 5 (Sa)",
    role: "value.datetime",
    type: "string",
    dataSource: "raw_parameter",
    luxWriteId: "606",
    write: true
  },
  // ==========================================
  // AKTIONEN & VIRTUELL
  // ==========================================
  Dump_Raw_To_Log: {
    folder: "Aktionen",
    name: "Raw Data in Log schreiben",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Regelung_Aktiv: {
    folder: "Aktionen",
    name: "Automatische Anlagenregelung ein-/ausschalten",
    role: "switch",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: true,
    required: true
  },
  Schreibe_Debug_Log: {
    folder: "Aktionen",
    name: "Erweiterte Logging-Ausgaben ein-/ausschalten",
    role: "switch",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Setze_Vorgabewerte: {
    folder: "Aktionen",
    name: "Vorgabewerte (wie Leerlauf) manuell setzen",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Zwangsheizen: {
    folder: "Aktionen",
    name: "Heizen starten auch wenn kein Bedarf besteht (Zwangsheizen)",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  Zwangswarmwasser: {
    folder: "Aktionen",
    name: "Warmwasser erzwingen",
    role: "button",
    type: "boolean",
    isVirtual: true,
    write: true,
    def: false,
    required: true
  },
  connection: {
    folder: "info",
    name: "Verbindungsstatus",
    role: "indicator.connected",
    type: "boolean",
    isVirtual: true,
    write: false,
    def: false,
    required: true
  }
};
for (const key of Object.keys(STATE_MAPPING)) {
  if (!STATE_MAPPING[key].luxWriteId) {
    STATE_MAPPING[key].luxWriteId = key;
  }
}
function getDpPath(key) {
  const def = STATE_MAPPING[key];
  if (!def) {
    throw new Error(`Kritischer Fehler: Datenpunkt-Schl\xFCssel '${key}' existiert nicht im Mapping!`);
  }
  return `${def.folder}.${key}`;
}
function getLuxIdByKey(key) {
  const entry = STATE_MAPPING[key];
  if (entry && entry.luxWriteId) {
    return parseInt(entry.luxWriteId, 10);
  }
  return -1;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STATE_MAPPING,
  getDpPath,
  getLuxIdByKey
});
//# sourceMappingURL=stateMapping.js.map

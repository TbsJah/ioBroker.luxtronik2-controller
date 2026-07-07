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
var codes_exports = {};
__export(codes_exports, {
  ERROR_CODES: () => ERROR_CODES,
  OUTAGE_CODES: () => OUTAGE_CODES,
  STATE_HEATING: () => STATE_HEATING,
  STATE_ZEILE_1: () => STATE_ZEILE_1,
  STATE_ZEILE_2: () => STATE_ZEILE_2,
  STATE_ZEILE_3: () => STATE_ZEILE_3
});
module.exports = __toCommonJS(codes_exports);
const ERROR_CODES = {
  701: "Niederdruckstoerung - Bitte Inst. rufen",
  702: "Niederdrucksperre - RESET automatisch",
  703: "Frostschutz - Bitte Inst. rufen",
  704: "Heissgasstoerung - Reset in hh:mm",
  705: "Motorschutz VEN - Bitte Inst. rufen",
  706: "Motorschutz BSUP - Bitte Inst. rufen",
  707: "Codierung WP - Bitte Inst. rufen",
  708: "Fuehler Ruecklauf - Bitte Inst. rufen",
  709: "Fuehler Vorlauf - Bitte Inst. rufen",
  710: "Fuehler Heissgas - Bitte Inst. rufen",
  711: "Fuehler Aussentemp. - Bitte Inst. rufen",
  712: "Fuehler Warmwasser - Bitte Inst. rufen",
  713: "Fuehler WQ-Ein - Bitte Inst. rufen",
  714: "Heissgas WW - Reset in hh:mm",
  715: "Hochdruck-Abschalt. - RESET automatisch",
  716: "Hochdruckstoerung - Bitte Inst rufen",
  717: "Durchfluss-WQ - Bitte Inst. rufen",
  718: "Max. Aussentemp. - RESET automatisch",
  719: "Min. Aussentemp. - RESET automatisch",
  720: "WQ-Temperatur - RESET automatisch in hh:mm",
  721: "Niederdruckabschaltung - RESET automatisch",
  722: "Tempdiff Heizwasser - Bitte Inst. rufen",
  723: "Tempdiff Warmwasser - Bitte Inst. rufen",
  724: "Tempdiff Abtauen - Bitte Inst. rufen",
  725: "Anlagefehler WW - Bitte Inst. rufen",
  726: "Fuehler Mischkreis 1 - Bitte Inst. rufen",
  727: "Soledruck - Bitte Inst. rufen",
  728: "Fuehler WQ-Aus - Bitte Inst. rufen",
  729: "Drehfeldfehler - Bitte Inst. rufen",
  730: "Leistung Ausheizen - Bitte Inst. rufen",
  732: "Stoerung Kuehlung - Bitte Inst. rufen",
  733: "Stoerung Anode - Bitte Inst. rufen",
  734: "Stoerung Anode - Bitte Inst. rufen",
  735: "Fuehler Ext. Energiequelle - Bitte Inst. rufen",
  736: "Fuehler Solarkollektor - Bitte Inst. rufen",
  737: "Fuehler Solarspeicher - Bitte Inst. rufen",
  738: "Fuehler Mischkreis2 - Bitte Inst. rufen",
  750: "Fuehler Ruecklauf extern - Bitte Inst. rufen",
  751: "Phasenueberwachungsfehler",
  752: "Phasenueberwachungs / Durchflussfehler",
  755: "Verbindung zu Slave verloren - Bitte Inst. rufen",
  756: "Verbindung zu Master verloren - Bitte Inst. rufen",
  757: "ND-Stoerung bei WW-Geraet",
  758: "Stoerung Abtauung",
  759: "Meldung TDI",
  760: "Stoerung Abtauung",
  761: "LIN-Verbindung unterbrochen",
  762: "Fuehler Ansaug-Verdichter",
  763: "Fuehler Ansaug-Verdampfer",
  764: "Fuehler Verdichterheizung",
  765: "Ueberhitzung",
  766: "Einsatzgrenzen-VD",
  767: "STB E-Stab",
  770: "Niedrige Ueberhitzung",
  771: "Hohe Ueberhitzung",
  776: "Einsatzgrenzen-VD",
  777: "Expansionsventil",
  778: "Fuehler Niederdruck",
  779: "Fuehler Hochdruck",
  780: "Fuehler EVI",
  781: "Fuehler Fluessig, vor Ex-Ventil",
  782: "Fuehler EVI Sauggas",
  783: "Kommunikation SEC-Inverter",
  784: "VSS gesperrt",
  785: "SEC-Board defekt",
  786: "Kommunikation SEC-Inverter",
  787: "VD Alarm",
  788: "Schwerw. Inverter Fehler",
  789: "LIN/Kodierung nicht vorhanden",
  790: "Schwerw. Inverter Fehler",
  791: "ModBus Verbindung verloren",
  792: "LIN-Verbindung unterbrochen",
  793: "Schwerw. Inverter Fehler",
  "-1": "Unbekannter Fehler"
};
const OUTAGE_CODES = {
  "-1": "Unbekannte Abschaltung",
  0: "W\xE4rmepumpe St\xF6rung",
  1: "Anlagen St\xF6rung",
  2: "Betriebsart Zweiter W\xE4rmeerzeuger",
  3: "EVU-Sperre",
  4: "Reset",
  5: "Lauftabtau (nur LW-Ger\xE4te)",
  6: "Temperatur Einsatzgrenze maximal",
  7: "Temperatur Einsatzgrenze minimal",
  8: "Untere Einsatzgrenze",
  9: "Keine Anforderung"
};
const STATE_ZEILE_1 = {
  0: "W\xE4rmepumpe l\xE4uft",
  1: "W\xE4rmepumpe steht",
  2: "W\xE4rmepumpe kommt",
  3: "Fehlercode",
  4: "Abtauen",
  5: "Warte auf LIN-Verbindung",
  7: "Verdichter heizt auf",
  8: "Pumpenvorlauf"
};
const STATE_ZEILE_2 = {
  0: "seit",
  1: "in"
};
const STATE_ZEILE_3 = {
  0: "Heizbetrieb",
  1: "Keine Anforderung",
  2: "Netz-Einschaltverz\xF6gerung",
  3: "Schaltspielsperre",
  4: "Sperrzeit",
  5: "Warmwasser",
  6: "Info Ausheizprogramm",
  7: "Abtauen",
  8: "Pumpenvorlauf",
  9: "Thermische Desinfektion",
  10: "K\xFChlbetrieb",
  12: "Schwimmbad / Photovoltaik",
  13: "Heizen ext. Energiequelle",
  14: "Warmwasser ext. Energiequelle",
  16: "Durchfluss\xFCberwachung",
  17: "Zweiter W\xE4rmeerzeuger 1 Betrieb"
};
const STATE_HEATING = {
  0: "Abgesenkt",
  1: "Normal",
  3: "Aus"
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ERROR_CODES,
  OUTAGE_CODES,
  STATE_HEATING,
  STATE_ZEILE_1,
  STATE_ZEILE_2,
  STATE_ZEILE_3
});
//# sourceMappingURL=codes.js.map

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
var actionHandlers_exports = {};
__export(actionHandlers_exports, {
  handleZwangsheizen: () => handleZwangsheizen,
  handleZwangswarmwasser: () => handleZwangswarmwasser
});
module.exports = __toCommonJS(actionHandlers_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
const CONSTANTS = {
  /** Status-Code für den Ruhezustand der Anlage */
  STATE_IDLE: 5,
  /** Befehlswert für den Fußpunkt beim Zwangsheizen */
  FORCE_HEATING_OFFSET: 35,
  /** Temporäre Hysterese für die Zwangswarmwasserbereitung */
  FORCE_WW_HYSTERESIS: 1
};
function getNumber(state, fallback = 0) {
  return typeof (state == null ? void 0 : state.val) === "number" ? state.val : fallback;
}
async function handleZwangswarmwasser(adapter, id) {
  try {
    await adapter.setForeignStateAsync(id, { val: false, ack: true });
    const [wwIstState, wwSollState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll"))
    ]);
    const wwIst = getNumber(wwIstState);
    const wwSoll = getNumber(wwSollState);
    if (wwIst >= wwSoll - 1) {
      (0, import_logger.writeLog)(
        `Zwangswarmwasser: Ignoriert \u2013 Ist (${wwIst}\xB0C) ist bereits ausreichend (Soll: ${wwSoll}\xB0C).`,
        "info"
      );
      return;
    }
    await adapter.syncConfigValue("hotWaterTemperatureHysteresis", CONSTANTS.FORCE_WW_HYSTERESIS);
    (0, import_logger.writeLog)(
      `Zwangswarmwasser: Ausgel\xF6st \u2013 Ist (${wwIst}\xB0C) < Soll-1 (${wwSoll - 1}\xB0C). Hysterese tempor\xE4r auf ${CONSTANTS.FORCE_WW_HYSTERESIS}K gesetzt.`,
      "info"
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Zwangswarmwasser: Fehler bei der Ausf\xFChrung - ${msg}`, "error");
  }
}
async function handleZwangsheizen(adapter, id) {
  try {
    await adapter.setForeignStateAsync(id, { val: false, ack: true });
    const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
    ]);
    const bzVal = getNumber(bzState, -1);
    const ruecklauf = getNumber(ruecklaufState);
    const ruecklaufSoll = getNumber(ruecklaufSollState);
    const hysterese = getNumber(hystereseState);
    if (bzVal !== CONSTANTS.STATE_IDLE) {
      (0, import_logger.writeLog)(`Zwangsheizen: Ignoriert \u2013 Anlage ist nicht im Leerlauf (Status: ${bzVal}).`, "info");
      return;
    }
    if (ruecklauf >= ruecklaufSoll + hysterese) {
      (0, import_logger.writeLog)(
        `Zwangsheizen: Ignoriert \u2013 R\xFCcklauf hoch genug (${ruecklauf}\xB0C >= ${ruecklaufSoll + hysterese}\xB0C).`,
        "info"
      );
      return;
    }
    await adapter.syncConfigValue("heating_curve_parallel_offset", CONSTANTS.FORCE_HEATING_OFFSET);
    (0, import_logger.writeLog)(
      `Zwangsheizen: Ausgel\xF6st \u2013 Fusspunkt tempor\xE4r auf ${CONSTANTS.FORCE_HEATING_OFFSET}\xB0C gesetzt.`,
      "info"
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Zwangsheizen: Fehler bei der Ausf\xFChrung - ${msg}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleZwangsheizen,
  handleZwangswarmwasser
});
//# sourceMappingURL=actionHandlers.js.map

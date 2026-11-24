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
var import_pvManager = require("./pvManager");
var import_stateMapping = require("./stateMapping");
var import_utils = require("./utils");
const CONSTANTS = {
  /** Status-Code für den Ruhezustand der Anlage */
  STATE_IDLE: 5
};
async function handleZwangswarmwasser(adapter, id) {
  var _a;
  try {
    const localId = id.replace(`${adapter.namespace}.`, "");
    await adapter.setState(localId, { val: false, ack: true });
    const [wwIstState, wwSollState, wwHystereseState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("hotWaterTemperatureHysteresis"))
    ]);
    const wwIst = (0, import_utils.getNumber)(wwIstState);
    const wwSoll = (0, import_utils.getNumber)(wwSollState);
    const wwHysterese = (0, import_utils.getNumber)(wwHystereseState, 2);
    if (wwIst >= wwSoll - 1) {
      (0, import_logger.writeLog)(
        `Forced hot water: Ignored - Actual (${wwIst}\xB0C) is already sufficient (Target: ${wwSoll}\xB0C).`,
        "info"
      );
      return;
    }
    let forceSoll = wwIst + wwHysterese + 1.5;
    const MAX_WW_TEMP = 70;
    if (forceSoll > MAX_WW_TEMP) {
      forceSoll = MAX_WW_TEMP;
    }
    forceSoll = Math.round(forceSoll * 10) / 10;
    if (adapter.forcedWwOriginalTarget === null || adapter.forcedWwOriginalTarget === void 0) {
      const fallbackWw = parseFloat(String((_a = adapter.config.sync_warmwater_target_temperature) != null ? _a : 54).replace(",", ".")) || 54;
      adapter.forcedWwOriginalTarget = adapter.config.idle_defaults_aktiv === true || import_pvManager.pvIsBoostActive ? fallbackWw : wwSoll;
    }
    await adapter.syncConfigValue("temperature_hot_water_target", forceSoll);
    (0, import_logger.writeLog)(
      `Forced hot water: Triggered - Actual (${wwIst}\xB0C) < Target-1 (${wwSoll - 1}\xB0C). Target temperature temporarily set to ${forceSoll}\xB0C.`,
      "info"
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Forced hot water: Error during execution - ${msg}`, "error");
  }
}
async function handleZwangsheizen(adapter, id) {
  try {
    const localId = id.replace(`${adapter.namespace}.`, "");
    await adapter.setState(localId, { val: false, ack: true });
    const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
      adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
    ]);
    const bzVal = (0, import_utils.getNumber)(bzState, -1);
    const ruecklauf = (0, import_utils.getNumber)(ruecklaufState);
    const ruecklaufSoll = (0, import_utils.getNumber)(ruecklaufSollState);
    const hysterese = (0, import_utils.getNumber)(hystereseState, 1.5);
    if (bzVal !== CONSTANTS.STATE_IDLE) {
      (0, import_logger.writeLog)(`Forced heating: Ignored - System is not idle (Status: ${bzVal}).`, "info");
      return;
    }
    if (ruecklauf >= ruecklaufSoll + hysterese) {
      (0, import_logger.writeLog)(
        `Forced heating: Ignored - Return temperature high enough (${ruecklauf}\xB0C >= ${ruecklaufSoll + hysterese}\xB0C).`,
        "info"
      );
      return;
    }
    const neededDeltaK = Math.max(
      hysterese + 0.5,
      Math.ceil((ruecklauf - ruecklaufSoll + hysterese + 0.5) * 10) / 10
    );
    await adapter.activateForcedHeatingBoost("ForcedHeating", neededDeltaK);
    (0, import_logger.writeLog)(
      `Forced heating: Triggered - Dynamic heating offset temporarily raised by +${neededDeltaK} K.`,
      "info"
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Forced heating: Error during execution - ${msg}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleZwangsheizen,
  handleZwangswarmwasser
});
//# sourceMappingURL=actionHandlers.js.map

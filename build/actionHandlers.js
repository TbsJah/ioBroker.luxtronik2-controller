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
async function handleZwangswarmwasser(adapter, id) {
  await adapter.setForeignStateAsync(id, { val: false, ack: true });
  const wwIstState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist"));
  const wwSollState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll"));
  const wwIst = typeof (wwIstState == null ? void 0 : wwIstState.val) === "number" ? wwIstState.val : 0;
  const wwSoll = typeof (wwSollState == null ? void 0 : wwSollState.val) === "number" ? wwSollState.val : 0;
  if (wwIst < wwSoll - 1) {
    await adapter.syncConfigValue("hotWaterTemperatureHysteresis", 1);
    (0, import_logger.writeLog)(
      `Zwangswarmwasser ausgel\xF6st: Ist (${wwIst}\xB0C) < Soll-1 (${wwSoll - 1}\xB0C). Hysterese auf 1K gesetzt.`,
      "info"
    );
  } else {
    (0, import_logger.writeLog)(`Zwangswarmwasser ignoriert: Ist (${wwIst}\xB0C) ist bereits ausreichend (Soll: ${wwSoll}\xB0C).`, "info");
  }
}
async function handleZwangsheizen(adapter, id) {
  await adapter.setForeignStateAsync(id, { val: false, ack: true });
  const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
  ]);
  const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : -1;
  const ruecklauf = typeof (ruecklaufState == null ? void 0 : ruecklaufState.val) === "number" ? ruecklaufState.val : 0;
  const ruecklaufSoll = typeof (ruecklaufSollState == null ? void 0 : ruecklaufSollState.val) === "number" ? ruecklaufSollState.val : 0;
  const hysterese = typeof (hystereseState == null ? void 0 : hystereseState.val) === "number" ? hystereseState.val : 0;
  if (bzVal === 5) {
    if (ruecklauf < ruecklaufSoll + hysterese) {
      await adapter.syncConfigValue("heating_curve_parallel_offset", 35);
      (0, import_logger.writeLog)(`Zwangsheizen ausgel\xF6st. Fusspunkt tempor\xE4r auf 35\xB0C gesetzt.`, "info");
    } else {
      (0, import_logger.writeLog)(`Zwangsheizen ignoriert: R\xFCcklauf hoch genug.`, "info");
    }
  } else {
    (0, import_logger.writeLog)(`Zwangsheizen ignoriert: Anlage ist nicht im Leerlauf.`, "info");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleZwangsheizen,
  handleZwangswarmwasser
});
//# sourceMappingURL=actionHandlers.js.map

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
var logger_exports = {};
__export(logger_exports, {
  initLogger: () => initLogger,
  setCustomDebug: () => setCustomDebug,
  writeLog: () => writeLog
});
module.exports = __toCommonJS(logger_exports);
let adapter = null;
let customDebugActive = false;
function initLogger(adapterInstance) {
  adapter = adapterInstance;
}
function setCustomDebug(active) {
  customDebugActive = active;
}
function writeLog(text, level = "info") {
  if (!adapter) {
    console.log(`[${level.toUpperCase()}] ${text}`);
    return;
  }
  if (level === "debug" && !customDebugActive) {
    return;
  }
  if (adapter.log && typeof adapter.log[level] === "function") {
    adapter.log[level](text);
  } else {
    adapter.log.info(`[${level.toUpperCase()}] ${text}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  initLogger,
  setCustomDebug,
  writeLog
});
//# sourceMappingURL=logger.js.map

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
var convert_exports = {};
__export(convert_exports, {
  formatTimerSecondsToTime: () => formatTimerSecondsToTime,
  timeStringToSeconds: () => timeStringToSeconds
});
module.exports = __toCommonJS(convert_exports);
function timeStringToSeconds(timeStr) {
  if (typeof timeStr !== "string") {
    return 0;
  }
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10) || 0;
    const m = parseInt(timeMatch[2], 10) || 0;
    const s = parseInt(timeMatch[3], 10) || 0;
    return h * 3600 + m * 60 + s;
  }
  return 0;
}
function formatTimerSecondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatTimerSecondsToTime,
  timeStringToSeconds
});
//# sourceMappingURL=convert.js.map

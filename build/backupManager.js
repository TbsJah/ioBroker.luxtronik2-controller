"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var backupManager_exports = {};
__export(backupManager_exports, {
  executeDtaBackup: () => executeDtaBackup,
  initAutoBackup: () => initAutoBackup,
  stopAutoBackup: () => stopAutoBackup
});
module.exports = __toCommonJS(backupManager_exports);
var schedule = __toESM(require("node-schedule"));
var import_logger = require("./logger");
let backupJob = null;
function initAutoBackup(adapter) {
  const config = adapter.config;
  stopAutoBackup();
  if (config.autoBackupActive && config.autoBackupCron) {
    (0, import_logger.writeLog)(`Initializing automated DTA backup with cron schedule: ${config.autoBackupCron}`, "info");
    backupJob = schedule.scheduleJob(config.autoBackupCron, async () => {
      await executeDtaBackup(adapter);
    });
  }
}
async function executeDtaBackup(adapter) {
  const config = adapter.config;
  const ip = config.host;
  if (!ip) {
    (0, import_logger.writeLog)("Backup aborted: No IP address configured.", "warn");
    return;
  }
  try {
    (0, import_logger.writeLog)("Triggering live DTA flush on heat pump (/NewProc)...", "debug");
    await fetch(`http://${ip}/NewProc`).catch(() => {
    });
    await new Promise((resolve) => setTimeout(resolve, 3e3));
    (0, import_logger.writeLog)("Downloading latest DTA file...", "debug");
    let response = await fetch(`http://${ip}/procdta`).catch(() => null);
    if (!response || !response.ok) {
      (0, import_logger.writeLog)("/procdta not found, trying fallback path /Webclient/procdta...", "debug");
      response = await fetch(`http://${ip}/Webclient/procdta`).catch(() => null);
    }
    if (!response || !response.ok) {
      throw new Error(`HTTP Error - File not found on heat pump webserver.`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const basePath = config.autoBackupPath ? String(config.autoBackupPath).replace(/^\/+|\/+$/g, "").trim() : "";
    const now = /* @__PURE__ */ new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const fileName = `dta_live_${timestamp}.dta`;
    const fullPath = basePath !== "" ? `${basePath}/${fileName}` : fileName;
    await adapter.writeFileAsync(adapter.namespace, fullPath, buffer);
    (0, import_logger.writeLog)(`DTA Backup successfully saved as ${fullPath} in ioBroker files.`, "info");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Failed to execute automated DTA backup: ${msg}`, "error");
  }
}
function stopAutoBackup() {
  if (backupJob) {
    backupJob.cancel();
    backupJob = null;
    (0, import_logger.writeLog)("Automated DTA backup schedule stopped.", "debug");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeDtaBackup,
  initAutoBackup,
  stopAutoBackup
});
//# sourceMappingURL=backupManager.js.map

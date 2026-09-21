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
    (0, import_logger.writeLog)("Fetching live DTA file (/NewProc)...", "debug");
    const isLive = true;
    let arrayBuffer = null;
    let response = await fetch(`http://${ip}/NewProc`).catch(() => null);
    if (response && response.ok) {
      arrayBuffer = await response.arrayBuffer();
    }
    if (!arrayBuffer || arrayBuffer.byteLength < 1e3) {
      (0, import_logger.writeLog)("/NewProc did not return a valid file. Trying /procdta...", "debug");
      response = await fetch(`http://${ip}/procdta`).catch(() => null);
      if (response && response.ok) {
        arrayBuffer = await response.arrayBuffer();
      }
    }
    if (!arrayBuffer || arrayBuffer.byteLength < 1e3) {
      throw new Error(`HTTP Error - No valid DTA file found on heat pump webserver.`);
    }
    const buffer = Buffer.from(arrayBuffer);
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${y}-${m}-${d}T${h}-${min}-${s}`;
    const filePrefix = isLive ? "dta_live" : "dta_history";
    const targetId = "0_userdata.0";
    const fileName = `luxtronik_backups/${filePrefix}_${timestamp}.dta`;
    await adapter.writeFileAsync(targetId, fileName, buffer);
    adapter.log.info(`DTA Backup successfully saved as ${fileName} in folder ${targetId}.`);
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

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
var updateManager_exports = {};
__export(updateManager_exports, {
  checkFirmwareUpdate: () => checkFirmwareUpdate
});
module.exports = __toCommonJS(updateManager_exports);
var https = __toESM(require("node:https"));
var import_logger = require("./logger");
var import_notificationManager = require("./notificationManager");
var import_stateMapping = require("./stateMapping");
const DOWNLOAD_PORTAL_URL = "https://www.heatpump24.com/software/fetchSoftware.php?softwareID=";
const CHANGELOG_URL = "https://www.heatpump24.com/software/fetchSoftware.php?changeLog=";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
function getFirmwareDownloadId(installedVersion) {
  if (!installedVersion) {
    return null;
  }
  if (installedVersion.startsWith("V1.")) {
    return 0;
  }
  if (installedVersion.startsWith("V2.")) {
    return 1;
  }
  if (installedVersion.startsWith("V3.")) {
    return 2;
  }
  if (installedVersion.startsWith("V4.")) {
    return 3;
  }
  if (installedVersion.startsWith("F1.")) {
    return 4;
  }
  if (installedVersion.startsWith("WWB1.")) {
    return 5;
  }
  if (installedVersion.startsWith("smo")) {
    return 6;
  }
  return null;
}
function isVersionNewer(availableVersion, currentVersion) {
  const normalize = (v) => v.replace(/^[^\d]+/, "");
  const v1Parts = normalize(availableVersion).split(".").map(Number);
  const v2Parts = normalize(currentVersion).split(".").map(Number);
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;
    if (part1 > part2) {
      return true;
    }
    if (part1 < part2) {
      return false;
    }
  }
  return false;
}
function fetchUrl(url, abortAfterHeaders = false, timeoutMs = 12e4) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      agent: httpsAgent,
      timeout: timeoutMs,
      // Dynamischer Timeout statt hart codiert
      headers: {
        "User-Agent": "ioBroker.luxtronik2-controller",
        Accept: "*/*"
      }
    };
    let wasAborted = false;
    const req = https.request(url, options, (res) => {
      if (abortAfterHeaders) {
        wasAborted = true;
        resolve({ headers: res.headers, data: "" });
        req.destroy();
        return;
      }
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => resolve({ headers: res.headers, data: body }));
    });
    req.on("error", (err) => {
      if (!wasAborted) {
        reject(err);
      }
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.end();
  });
}
async function checkFirmwareUpdate(adapter) {
  const config = adapter.config;
  if (config.update_check_active !== true) {
    return;
  }
  const timeoutSeconds = config.update_check_timeout ? Number(config.update_check_timeout) : 120;
  const timeoutMs = timeoutSeconds * 1e3;
  try {
    const firmwareState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("firmware"));
    const currentFirmware = firmwareState && typeof firmwareState.val === "string" ? firmwareState.val : null;
    if (!currentFirmware) {
      (0, import_logger.writeLog)("Update-Pr\xFCfung abgebrochen: Aktuelle Firmware-Version ist noch nicht bekannt.", "debug");
      return;
    }
    const downloadId = getFirmwareDownloadId(currentFirmware);
    if (downloadId === null) {
      (0, import_logger.writeLog)(`Update-Pr\xFCfung abgebrochen: Unbekannter Firmware-Typ (${currentFirmware}).`, "debug");
      return;
    }
    const response = await fetchUrl(`${DOWNLOAD_PORTAL_URL}${downloadId}`, true, timeoutMs);
    const contentDisposition = response.headers["content-disposition"] || "";
    const filenameMatch = contentDisposition.match(/filename=(.+)/);
    if (!filenameMatch) {
      (0, import_logger.writeLog)("Update-Pr\xFCfung: Konnte keinen Dateinamen im Download-Portal finden.", "debug");
      return;
    }
    const filename = filenameMatch[1].replace(/"/g, "");
    const versionMatch = filename.match(/[BV]\d+\.\d+\.\d+(?:-\d+)?/);
    const availableVersion = versionMatch ? versionMatch[0].split("-")[0] : null;
    if (!availableVersion) {
      return;
    }
    await adapter.setState((0, import_stateMapping.getDpPath)("firmware_available"), { val: availableVersion, ack: true });
    const isNewer = isVersionNewer(availableVersion, currentFirmware);
    const updateStateDp = (0, import_stateMapping.getDpPath)("firmware_update_available");
    const oldUpdateState = await adapter.getStateAsync(updateStateDp);
    const wasAlreadyNotified = (oldUpdateState == null ? void 0 : oldUpdateState.val) === true;
    await adapter.setState(updateStateDp, { val: isNewer, ack: true });
    if (isNewer) {
      const clResponse = await fetchUrl(`${CHANGELOG_URL}${downloadId}`, false, timeoutMs);
      let cleanChangelog = "Kein Changelog verf\xFCgbar.";
      if (clResponse.data) {
        await adapter.setState((0, import_stateMapping.getDpPath)("firmware_changelog"), { val: clResponse.data, ack: true });
        cleanChangelog = clResponse.data.replace(/<br\s*\/?>/gi, "\n").trim();
      }
      (0, import_logger.writeLog)(`Neues Firmware-Update verf\xFCgbar: ${availableVersion} (Aktuell: ${currentFirmware})`, "info");
      if (!wasAlreadyNotified) {
        (0, import_logger.writeLog)("Sende Benachrichtigungen \xFCber neues Firmware-Update...", "info");
        await (0, import_notificationManager.sendUpdateNotification)(
          adapter,
          `Achtung: F\xFCr die W\xE4rmepumpe steht ein neues Firmware-Update bereit!

Aktuell: ${currentFirmware}
Neu: ${availableVersion}

Changelog:
${cleanChangelog}

Bitte das Update manuell \xFCber den USB-Stick installieren.`
        );
      } else {
        (0, import_logger.writeLog)("Benachrichtigung \xFCbersprungen (f\xFCr diese Version bereits erfolgt).", "debug");
      }
    } else {
      (0, import_logger.writeLog)(`Firmware ist auf dem neuesten Stand (${currentFirmware}).`, "debug");
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Firmware-Update-Pr\xFCfung: ${err.message}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkFirmwareUpdate
});
//# sourceMappingURL=updateManager.js.map

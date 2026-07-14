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
var notificationManager_exports = {};
__export(notificationManager_exports, {
  checkAndSendErrorNotifications: () => checkAndSendErrorNotifications,
  handleTestMessage: () => handleTestMessage,
  sendTelegramNotification: () => sendTelegramNotification
});
module.exports = __toCommonJS(notificationManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
async function sendNotification(adapter, message) {
  var _a;
  const config = adapter.config;
  const successMessages = [];
  if (config.notification_bell === true) {
    if (typeof adapter.registerNotification === "function") {
      await adapter.registerNotification("luxtronik2-controller", "lwpError", message);
      (0, import_logger.writeLog)("Benachrichtigung an ioBroker-Glocke gesendet.", "info");
      successMessages.push("Glocke");
    } else {
      (0, import_logger.writeLog)(`\u{1F6A8} ioBroker-Glocke nicht verf\xFCgbar. Nachricht: ${message}`, "warn");
    }
  }
  const telegramInstance = config.telegram_instance;
  const isTelegramActive = config.telegram_enabled === true && typeof telegramInstance === "string" && // TypeScript Typen-Prüfung!
  telegramInstance !== "none";
  if (isTelegramActive) {
    const sendObj = { text: message };
    const receiver = (_a = config.telegram_receiver) == null ? void 0 : _a.trim();
    if (receiver) {
      if (/^-?\d+$/.test(receiver)) {
        sendObj.chatId = Number(receiver);
      } else {
        sendObj.user = receiver;
      }
    }
    adapter.sendTo(telegramInstance, "send", sendObj);
    (0, import_logger.writeLog)(`Telegram-Nachricht gesendet an ${telegramInstance}`, "info");
    successMessages.push("Telegram");
  }
  return successMessages;
}
function sendTelegramNotification(adapter, message) {
  void sendNotification(adapter, message);
}
async function handleTestMessage(adapter, obj) {
  try {
    (0, import_logger.writeLog)("Test-Button empfangen!", "info");
    const config = adapter.config;
    const isTelegramActive = config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== "none";
    const isIoBrokerNotifyActive = config.notification_bell === true;
    if (!isTelegramActive && !isIoBrokerNotifyActive) {
      if (obj.callback) {
        adapter.sendTo(
          obj.from,
          obj.command,
          {
            error: "Fehler: Weder Telegram noch Glocke sind aktiv gespeichert! Bitte erst SPEICHERN klicken."
          },
          obj.callback
        );
      }
      return;
    }
    const errorPath = (0, import_stateMapping.getDpPath)("Fehlerspeicher");
    const lastErrorState = errorPath ? await adapter.getStateAsync(errorPath) : null;
    let msg = "";
    if (lastErrorState && typeof lastErrorState.val === "string") {
      const errorList = safeParse(lastErrorState.val);
      if (errorList && errorList.length > 0) {
        const newestError = errorList[0];
        msg = `\u{1F6A8} *Test-Alarm: Fehlerspeicher*

Aktuellster Fehler:
Code: ${newestError.code}
Fehler: ${newestError.beschreibung}
Datum: ${newestError.datum}

`;
        if (errorList.length > 1) {
          const history = errorList.slice(1).map((e) => `Datum: ${e.datum}
Code: ${e.code}
Fehler: ${e.beschreibung}`).join("\n\n");
          msg += `Historie:
${history}`;
        }
      }
    }
    if (msg === "") {
      msg = "\u2705 *Erfolgreicher Test*\n\nDies ist eine generierte Test-Nachricht. Die Kommunikation zu Telegram und ioBroker funktioniert einwandfrei! (Es liegen aktuell keine echten Heizungsfehler vor).";
    }
    const successMessages = await sendNotification(adapter, msg);
    if (obj.callback) {
      adapter.sendTo(
        obj.from,
        obj.command,
        { result: `Erfolgreich ausgel\xF6st: ${successMessages.join(" & ")}` },
        obj.callback
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Fehler beim Test-Button: ${errorMessage}`, "error");
    if (obj.callback) {
      adapter.sendTo(obj.from, obj.command, { error: `Skriptfehler: ${errorMessage}` }, obj.callback);
    }
  }
}
async function checkAndSendErrorNotifications(adapter, oldFehlerVal, newFehlerVal) {
  if (!newFehlerVal || newFehlerVal === oldFehlerVal) {
    return;
  }
  const newList = safeParse(newFehlerVal);
  if (!newList || newList.length === 0) {
    return;
  }
  const newestError = newList[0];
  const currentErrorTimestamp = newestError.timestamp;
  const currentErrorCode = newestError.code;
  if (currentErrorTimestamp === void 0 || currentErrorCode === 0) {
    return;
  }
  const oldList = oldFehlerVal ? safeParse(oldFehlerVal) : [];
  const oldNewestError = oldList && oldList.length > 0 ? oldList[0] : null;
  if (oldNewestError && currentErrorTimestamp === oldNewestError.timestamp) {
    return;
  }
  if (adapter.lastKnownErrorTimestamp !== null && adapter.lastKnownErrorTimestamp !== void 0 && currentErrorTimestamp <= adapter.lastKnownErrorTimestamp) {
    return;
  }
  adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
  const msg = `\u{1F6A8} *St\xF6rung W\xE4rmepumpe!*
Ein Fehler an der W\xE4rmepumpe wurde registriert:

*Code:* ${currentErrorCode}
*Fehler:* ${newestError.beschreibung}
*Datum:* ${newestError.datum}`;
  await sendNotification(adapter, msg);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAndSendErrorNotifications,
  handleTestMessage,
  sendTelegramNotification
});
//# sourceMappingURL=notificationManager.js.map

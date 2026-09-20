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
  checkAndSendOutageNotifications: () => checkAndSendOutageNotifications,
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
      (0, import_logger.writeLog)("Notification sent to ioBroker notification center.", "info");
      successMessages.push("Notification Center");
    } else {
      (0, import_logger.writeLog)(`\u{1F6A8} ioBroker notification center unavailable. Message: ${message}`, "warn");
    }
  }
  const telegramInstance = config.telegram_instance;
  const isTelegramActive = config.telegram_enabled === true && typeof telegramInstance === "string" && telegramInstance !== "none";
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
    (0, import_logger.writeLog)(`Telegram message sent to ${telegramInstance}`, "info");
    successMessages.push("Telegram");
  }
  return successMessages;
}
function sendTelegramNotification(adapter, message) {
  void sendNotification(adapter, message);
}
async function handleTestMessage(adapter, obj) {
  try {
    (0, import_logger.writeLog)("Test button triggered!", "info");
    const config = adapter.config;
    const isTelegramActive = config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== "none";
    const isIoBrokerNotifyActive = config.notification_bell === true;
    if (!isTelegramActive && !isIoBrokerNotifyActive) {
      if (obj.callback) {
        adapter.sendTo(
          obj.from,
          obj.command,
          {
            error: "Error: Neither Telegram nor Notification Center are active! Please save settings first."
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
        msg = `\u{1F6A8} *Test Alarm: Error Log*

Most recent error:
Code: ${newestError.code}
Error: ${newestError.beschreibung}
Date: ${newestError.datum}

`;
        if (errorList.length > 1) {
          const history = errorList.slice(1).map((e) => `Date: ${e.datum}
Code: ${e.code}
Error: ${e.beschreibung}`).join("\n\n");
          msg += `History:
${history}`;
        }
      }
    }
    if (msg === "") {
      msg = "\u2705 *Successful Test*\n\nThis is a generated test message. Communication via Telegram and ioBroker works perfectly! (There are currently no real heat pump errors).";
    }
    const successMessages = await sendNotification(adapter, msg);
    if (obj.callback) {
      adapter.sendTo(
        obj.from,
        obj.command,
        { result: `Successfully triggered: ${successMessages.join(" & ")}` },
        obj.callback
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error processing test button: ${errorMessage}`, "error");
    if (obj.callback) {
      adapter.sendTo(obj.from, obj.command, { error: `Script error: ${errorMessage}` }, obj.callback);
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
  if (adapter.lastKnownErrorTimestamp === void 0 || adapter.lastKnownErrorTimestamp === null) {
    adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
    (0, import_logger.writeLog)("Error monitoring initialized. Last known error timestamp set silently.", "debug");
    return;
  }
  if (currentErrorTimestamp <= adapter.lastKnownErrorTimestamp) {
    return;
  }
  adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
  const msg = `\u{1F6A8} *Heat Pump Malfunction!*
An error was registered on the heat pump:

*Code:* ${currentErrorCode}
*Error:* ${newestError.beschreibung}
*Date:* ${newestError.datum}`;
  await sendNotification(adapter, msg);
}
async function checkAndSendOutageNotifications(adapter, oldOutageVal, newOutageVal) {
  if (!newOutageVal || newOutageVal === oldOutageVal) {
    return;
  }
  const newList = safeParse(newOutageVal);
  if (!newList || newList.length === 0) {
    return;
  }
  const newestOutage = newList[0];
  const currentOutageTimestamp = newestOutage.timestamp;
  const currentOutageCode = newestOutage.code;
  if (currentOutageTimestamp === void 0 || currentOutageCode === 0) {
    return;
  }
  const descLower = newestOutage.beschreibung.toLowerCase();
  const isFlowIssue = descLower.includes("durchfluss") || descLower.includes("flow");
  if (!isFlowIssue) {
    return;
  }
  if (adapter.lastKnownOutageTimestamp === void 0 || adapter.lastKnownOutageTimestamp === null) {
    adapter.lastKnownOutageTimestamp = currentOutageTimestamp;
    (0, import_logger.writeLog)("Outage monitoring initialized. Last known outage timestamp set silently.", "debug");
    return;
  }
  if (currentOutageTimestamp <= adapter.lastKnownOutageTimestamp) {
    return;
  }
  const now = Date.now();
  if (adapter.lastFlowNotificationTime && now - adapter.lastFlowNotificationTime < 60 * 60 * 1e3) {
    adapter.lastKnownOutageTimestamp = currentOutageTimestamp;
    (0, import_logger.writeLog)("Flow outage registered, but notification skipped due to 60-minute cooldown spam protection.", "info");
    return;
  }
  adapter.lastKnownOutageTimestamp = currentOutageTimestamp;
  adapter.lastFlowNotificationTime = now;
  const msg = `\u26A0\uFE0F *Warnung: Durchfluss-Problem!*
Die W\xE4rmepumpe hat sich wegen geringem Durchfluss abgeschaltet:

*Code:* ${currentOutageCode}
*Grund:* ${newestOutage.beschreibung}
*Datum:* ${newestOutage.datum}

_Hinweis: Die Anlage versucht meist einen Neustart. Bitte Heizkreis-Druck und Stellventile pr\xFCfen._`;
  await sendNotification(adapter, msg);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAndSendErrorNotifications,
  checkAndSendOutageNotifications,
  handleTestMessage,
  sendTelegramNotification
});
//# sourceMappingURL=notificationManager.js.map

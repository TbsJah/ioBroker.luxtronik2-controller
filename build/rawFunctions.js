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
var rawFunctions_exports = {};
__export(rawFunctions_exports, {
  dumpAllRawToLog: () => dumpAllRawToLog,
  readAllRaw: () => readAllRaw,
  writeRawParameter: () => writeRawParameter
});
module.exports = __toCommonJS(rawFunctions_exports);
var net = __toESM(require("node:net"));
var import_ws = require("ws");
var import_logger = require("./logger");
const CONSTANTS = {
  CMD_WRITE: 3002,
  CMD_READ_PARAM: 3003,
  CMD_READ_VALUE: 3004,
  PORT_TCP: 8889,
  PORT_WS: 8214,
  TIMEOUT_READ: 8e3,
  TIMEOUT_WRITE: 5e3,
  DELAY_RECONNECT: 1e3
};
function shouldUseWs(adapter) {
  const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
  return port !== 8888 && port !== CONSTANTS.PORT_TCP;
}
function parseRawResponse(responseData, command) {
  const is3004 = command === CONSTANTS.CMD_READ_VALUE;
  const headerSize = is3004 ? 12 : 8;
  const lengthOffset = is3004 ? 8 : 4;
  if (responseData.length < headerSize) {
    return null;
  }
  const responseCommand = responseData.readInt32BE(0);
  if (responseCommand !== command) {
    throw new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`);
  }
  const totalItems = responseData.readInt32BE(lengthOffset);
  if (totalItems < 0 || totalItems > 1e4) {
    throw new Error(`Ung\xFCltige Elementanzahl (${totalItems}) in Antwort ${command}`);
  }
  const totalRequiredLength = headerSize + totalItems * 4;
  if (responseData.length < totalRequiredLength) {
    return null;
  }
  const allValues = [];
  for (let i = 0; i < totalItems; i++) {
    const valueOffset = headerSize + i * 4;
    allValues.push(responseData.readInt32BE(valueOffset));
  }
  return allValues;
}
function readAllRaw(adapter, command) {
  if (shouldUseWs(adapter)) {
    return readAllRawWs(adapter, command);
  }
  return readAllRawTcp(adapter, command);
}
function readAllRawWs(adapter, command) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let timeout = void 0;
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
    const ws = new import_ws.WebSocket(`ws://${host}:${port}`, "luxnet");
    ws.binaryType = "nodebuffer";
    let responseData = Buffer.alloc(0);
    const finish = (err, data) => {
      if (finished) {
        return;
      }
      finished = true;
      if (timeout) {
        adapter.clearTimeout(timeout);
      }
      const isWsActive = ws.readyState === import_ws.WebSocket.OPEN || ws.readyState === import_ws.WebSocket.CONNECTING;
      if (err) {
        if (isWsActive) {
          ws.close();
        }
        reject(err);
      } else if (data) {
        if (isWsActive) {
          ws.once("close", () => resolve(data));
          ws.close();
        } else {
          resolve(data);
        }
      }
    };
    timeout = adapter.setTimeout(
      () => finish(new Error(`WebSocket Timeout beim Auslesen der Liste ${command}.`)),
      CONSTANTS.TIMEOUT_READ
    );
    ws.on("open", () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32BE(command, 0);
      buffer.writeInt32BE(0, 4);
      ws.send(buffer, { binary: true });
    });
    ws.on("message", (data) => {
      let chunk;
      if (Buffer.isBuffer(data)) {
        chunk = data;
      } else if (Array.isArray(data)) {
        chunk = Buffer.concat(data);
      } else {
        chunk = Buffer.from(data);
      }
      responseData = Buffer.concat([responseData, chunk]);
      try {
        const values = parseRawResponse(responseData, command);
        if (values !== null) {
          finish(void 0, values);
        }
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });
    ws.on("error", (err) => finish(err));
  });
}
function readAllRawTcp(adapter, command) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const client = new net.Socket();
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
    let responseData = Buffer.alloc(0);
    const finish = (err, data) => {
      if (finished) {
        return;
      }
      finished = true;
      client.setTimeout(0);
      client.destroy();
      if (err) {
        reject(err);
      } else if (data) {
        resolve(data);
      }
    };
    client.connect(port, host, () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32BE(command, 0);
      buffer.writeInt32BE(0, 4);
      client.write(buffer);
    });
    client.on("data", (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
      try {
        const values = parseRawResponse(responseData, command);
        if (values !== null) {
          finish(void 0, values);
        }
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });
    client.on("error", (err) => finish(err));
    client.setTimeout(CONSTANTS.TIMEOUT_READ);
    client.on("timeout", () => finish(new Error(`Timeout beim Auslesen der TCP Liste ${command}.`)));
  });
}
function writeRawParameter(adapter, paramId, value) {
  if (shouldUseWs(adapter)) {
    return writeRawParameterWs(adapter, paramId, value);
  }
  return writeRawParameterTcp(adapter, paramId, value);
}
function writeRawParameterWs(adapter, paramId, value) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let timeout = void 0;
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
    const ws = new import_ws.WebSocket(`ws://${host}:${port}`, "luxnet");
    ws.binaryType = "nodebuffer";
    const finish = (err) => {
      if (finished) {
        return;
      }
      finished = true;
      if (timeout) {
        adapter.clearTimeout(timeout);
      }
      const isWsActive = ws.readyState === import_ws.WebSocket.OPEN || ws.readyState === import_ws.WebSocket.CONNECTING;
      if (err) {
        if (isWsActive) {
          ws.close();
        }
        reject(err);
      } else {
        if (isWsActive) {
          ws.once("close", () => resolve(void 0));
          ws.close();
        } else {
          resolve(void 0);
        }
      }
    };
    timeout = adapter.setTimeout(
      () => finish(new Error(`WebSocket Timeout beim Schreiben von Parameter ${paramId}.`)),
      CONSTANTS.TIMEOUT_WRITE
    );
    ws.on("open", () => {
      const buffer = Buffer.alloc(12);
      buffer.writeInt32BE(CONSTANTS.CMD_WRITE, 0);
      buffer.writeInt32BE(paramId, 4);
      buffer.writeInt32BE(value, 8);
      ws.send(buffer, { binary: true });
    });
    ws.on("message", () => finish());
    ws.on("error", (err) => finish(err));
  });
}
function writeRawParameterTcp(adapter, paramId, value) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const client = new net.Socket();
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
    const finish = (err) => {
      if (finished) {
        return;
      }
      finished = true;
      client.setTimeout(0);
      client.destroy();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };
    client.connect(port, host, () => {
      const buffer = Buffer.alloc(12);
      buffer.writeInt32BE(CONSTANTS.CMD_WRITE, 0);
      buffer.writeInt32BE(paramId, 4);
      buffer.writeInt32BE(value, 8);
      client.write(buffer);
    });
    client.on("data", (chunk) => {
      if (chunk.length >= 4) {
        if (chunk.readInt32BE(0) === CONSTANTS.CMD_WRITE) {
          finish();
        }
      }
    });
    client.on("error", (err) => finish(err));
    client.setTimeout(CONSTANTS.TIMEOUT_WRITE);
    client.on("timeout", () => finish(new Error(`Timeout beim Schreiben von Parameter TCP ${paramId}.`)));
  });
}
async function dumpAllRawToLog(adapter) {
  const delay = (ms) => new Promise((resolve) => adapter.setTimeout(resolve, ms));
  const useWs = shouldUseWs(adapter);
  try {
    const dumpList = async (command, title) => {
      await delay(CONSTANTS.DELAY_RECONNECT);
      (0, import_logger.writeLog)("=======================================================", "info");
      (0, import_logger.writeLog)(`START COMPACT RAW DUMP: LISTE ${command} (${title}) via ${useWs ? "WebSocket" : "TCP"}`, "info");
      (0, import_logger.writeLog)("=======================================================", "info");
      const data = await readAllRaw(adapter, command);
      for (let i = 0; i < data.length; i++) {
        (0, import_logger.writeLog)(`[RAW ${command}] Index ${i.toString().padStart(3, " ")} = ${data[i]}`, "info");
      }
      (0, import_logger.writeLog)(`--- ENDE LISTE ${command} (Insgesamt ${data.length} Indizes geloggt) ---`, "info");
      (0, import_logger.writeLog)("=======================================================", "info");
    };
    await delay(CONSTANTS.DELAY_RECONNECT);
    await dumpList(CONSTANTS.CMD_READ_PARAM, "PARAMETER");
    await dumpList(CONSTANTS.CMD_READ_VALUE, "MESSWERTE");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Fehler beim Ausf\xFChren des Raw-Dumps: ${msg}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dumpAllRawToLog,
  readAllRaw,
  writeRawParameter
});
//# sourceMappingURL=rawFunctions.js.map

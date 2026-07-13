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
var net = __toESM(require("net"));
var import_ws = __toESM(require("ws"));
var import_logger = require("./logger");
function shouldUseWs(adapter) {
  const port = adapter.config.port ? Number(adapter.config.port) : 8889;
  return port !== 8888 && port !== 8889;
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
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : 8214;
    const url = `ws://${host}:${port}/`;
    const ws = new import_ws.default(url, "Lux_WS");
    let responseData = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        ws.terminate();
        reject(new Error(`WebSocket Timeout beim Auslesen der Liste ${command}.`));
      }
    }, 8e3);
    ws.on("open", () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32BE(command, 0);
      buffer.writeInt32BE(0, 4);
      ws.send(buffer, { binary: true });
    });
    ws.on("message", (data) => {
      const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
      responseData = Buffer.concat([responseData, chunk]);
      const is3004 = command === 3004;
      const headerSize = is3004 ? 12 : 8;
      const lengthOffset = is3004 ? 8 : 4;
      if (responseData.length < headerSize) {
        return;
      }
      const responseCommand = responseData.readInt32BE(0);
      if (responseCommand !== command) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          ws.terminate();
          reject(new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`));
        }
        return;
      }
      const totalItems = responseData.readInt32BE(lengthOffset);
      if (totalItems < 0 || totalItems > 1e4) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          ws.terminate();
          reject(new Error(`Ung\xFCltige Elementanzahl (${totalItems}) in WS Antwort ${command}`));
        }
        return;
      }
      const totalRequiredLength = headerSize + totalItems * 4;
      if (responseData.length < totalRequiredLength) {
        return;
      }
      const allValues = [];
      for (let i = 0; i < totalItems; i++) {
        const valueOffset = headerSize + i * 4;
        allValues.push(responseData.readInt32BE(valueOffset));
      }
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        ws.terminate();
        resolve(allValues);
      }
    });
    ws.on("error", (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        ws.terminate();
        reject(err);
      }
    });
  });
}
function readAllRawTcp(adapter, command) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const client = new net.Socket();
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : 8889;
    let responseData = Buffer.alloc(0);
    client.connect(port, host, () => {
      const buffer = Buffer.alloc(8);
      buffer.writeInt32BE(command, 0);
      buffer.writeInt32BE(0, 4);
      client.write(buffer);
    });
    client.on("data", (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
      const is3004 = command === 3004;
      const headerSize = is3004 ? 12 : 8;
      const lengthOffset = is3004 ? 8 : 4;
      if (responseData.length < headerSize) {
        return;
      }
      const responseCommand = responseData.readInt32BE(0);
      if (responseCommand !== command) {
        client.destroy();
        if (!finished) {
          finished = true;
          reject(new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`));
        }
        return;
      }
      const totalItems = responseData.readInt32BE(lengthOffset);
      if (totalItems < 0 || totalItems > 1e4) {
        client.destroy();
        if (!finished) {
          finished = true;
          reject(new Error(`Ung\xFCltige Elementanzahl (${totalItems}) in TCP Antwort ${command}`));
        }
        return;
      }
      const totalRequiredLength = headerSize + totalItems * 4;
      if (responseData.length < totalRequiredLength) {
        return;
      }
      const allValues = [];
      for (let i = 0; i < totalItems; i++) {
        const valueOffset = headerSize + i * 4;
        allValues.push(responseData.readInt32BE(valueOffset));
      }
      client.destroy();
      if (!finished) {
        finished = true;
        resolve(allValues);
      }
    });
    client.on("error", (err) => {
      client.destroy();
      if (!finished) {
        finished = true;
        reject(err);
      }
    });
    client.setTimeout(8e3);
    client.on("timeout", () => {
      client.destroy();
      if (!finished) {
        finished = true;
        reject(new Error(`Timeout beim Auslesen der TCP Liste ${command}.`));
      }
    });
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
    const host = adapter.config.host;
    const port = adapter.config.port ? Number(adapter.config.port) : 8214;
    const url = `ws://${host}:${port}/`;
    const ws = new import_ws.default(url, "Lux_WS");
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        ws.terminate();
        reject(new Error(`WebSocket Timeout beim Schreiben von Parameter ${paramId}.`));
      }
    }, 5e3);
    ws.on("open", () => {
      const buffer = Buffer.alloc(12);
      buffer.writeInt32BE(3002, 0);
      buffer.writeInt32BE(paramId, 4);
      buffer.writeInt32BE(value, 8);
      ws.send(buffer, { binary: true });
    });
    ws.on("message", () => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        ws.terminate();
        resolve();
      }
    });
    ws.on("error", (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        ws.terminate();
        reject(err);
      }
    });
  });
}
function writeRawParameterTcp(adapter, paramId, value) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const client = new net.Socket();
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : 8889;
    client.connect(port, host, () => {
      const buffer = Buffer.alloc(12);
      buffer.writeInt32BE(3002, 0);
      buffer.writeInt32BE(paramId, 4);
      buffer.writeInt32BE(value, 8);
      client.write(buffer);
    });
    client.on("data", (chunk) => {
      if (chunk.length >= 4) {
        const responseCommand = chunk.readInt32BE(0);
        if (responseCommand === 3002) {
          client.destroy();
          if (!finished) {
            finished = true;
            resolve();
          }
        }
      }
    });
    client.on("error", (err) => {
      client.destroy();
      if (!finished) {
        finished = true;
        reject(err);
      }
    });
    client.setTimeout(5e3);
    client.on("timeout", () => {
      client.destroy();
      if (!finished) {
        finished = true;
        reject(new Error(`Timeout beim Schreiben von Parameter TCP ${paramId}.`));
      }
    });
  });
}
async function dumpAllRawToLog(adapter) {
  try {
    const dumpList = async (command, title) => {
      (0, import_logger.writeLog)("=======================================================", "info");
      (0, import_logger.writeLog)(
        `START COMPACT RAW DUMP: LISTE ${command} (${title}) via ${shouldUseWs(adapter) ? "WebSocket" : "TCP"}`,
        "info"
      );
      (0, import_logger.writeLog)("=======================================================", "info");
      const data = await readAllRaw(adapter, command);
      for (let i = 0; i < data.length; i++) {
        (0, import_logger.writeLog)(`[RAW ${command}] Index ${i.toString().padStart(3, " ")} = ${data[i]}`, "info");
      }
      (0, import_logger.writeLog)(`--- ENDE LISTE ${command} (Insgesamt ${data.length} Indizes geloggt) ---`, "info");
      (0, import_logger.writeLog)("=======================================================", "info");
    };
    await dumpList(3003, "PARAMETER");
    await dumpList(3004, "MESSWERTE");
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Ausf\xFChren des Raw-Dumps: ${err.message}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dumpAllRawToLog,
  readAllRaw,
  writeRawParameter
});
//# sourceMappingURL=rawFunctions.js.map

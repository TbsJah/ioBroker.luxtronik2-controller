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
  delay: () => delay,
  dumpAllRawToLog: () => dumpAllRawToLog,
  readAllRaw: () => readAllRaw,
  writePumpSafe: () => writePumpSafe,
  writeRawParameter: () => writeRawParameter
});
module.exports = __toCommonJS(rawFunctions_exports);
var net = __toESM(require("node:net"));
var import_ws = require("ws");
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
const CONSTANTS = {
  /** Schreib-Befehl für einen Parameter */
  CMD_WRITE: 3002,
  /** Lese-Befehl für die Parameterliste */
  CMD_READ_PARAM: 3003,
  /** Lese-Befehl für die Messwerteliste */
  CMD_READ_VALUE: 3004,
  /** Standard-TCP-Port der Luxtronik */
  PORT_TCP: 8889,
  /** Standard-WebSocket-Port neuerer Firmwares */
  PORT_WS: 8214,
  /** Maximales Timeout für Lese-Vorgänge in ms */
  TIMEOUT_READ: 8e3,
  /** Maximales Timeout für Schreib-Vorgänge in ms */
  TIMEOUT_WRITE: 5e3,
  /** Wartezeit in ms zwischen Neuverbindungen (z.B. beim Raw-Dump) */
  DELAY_RECONNECT: 1e3
};
const TCP_PORTS = /* @__PURE__ */ new Set([8888, 8889]);
async function writePumpSafe(adapter, cmd, val) {
  const paramId = typeof cmd === "string" ? parseInt(cmd, 10) : cmd;
  let value = typeof val === "string" ? parseInt(val, 10) : val;
  if (typeof value === "boolean") {
    value = value ? 1 : 0;
  }
  if (adapter.currentRawParams && adapter.currentRawParams[paramId] === value) {
    if (adapter.isDebugLogActive) {
      (0, import_logger.writeLog)(
        `[Global SafeWrite] Register ${paramId} steht bereits auf ${value}. Netzwerk-Schreibbefehl blockiert!`,
        "debug"
      );
    }
    return;
  }
  if (adapter.isDebugLogActive) {
    (0, import_logger.writeLog)(`writePumpSafe: Sende an Luxtronik -> Register ${paramId}, Wert: ${value}`, "debug");
  }
  await writeRawParameter(adapter, paramId, value);
  if (adapter.currentRawParams) {
    adapter.currentRawParams[paramId] = value;
  }
  if (typeof adapter.writeCyclesToday === "number") {
    adapter.writeCyclesToday++;
    adapter.writeCyclesTotal++;
    const dpToday = (0, import_stateMapping.getDpPath)("write_cycles_today");
    const dpTotal = (0, import_stateMapping.getDpPath)("write_cycles_total");
    if (dpToday) {
      void adapter.setState(dpToday, { val: adapter.writeCyclesToday, ack: true });
    }
    if (dpTotal) {
      void adapter.setState(dpTotal, { val: adapter.writeCyclesTotal, ack: true });
    }
  }
}
function delay(adapter, ms) {
  return new Promise((resolve) => adapter.setTimeout(resolve, ms));
}
function shouldUseWs(adapter) {
  const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
  return !TCP_PORTS.has(port);
}
function createCommandBuffer(...values) {
  const buffer = Buffer.alloc(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    buffer.writeInt32BE(values[i], i * 4);
  }
  return buffer;
}
function parseRawResponse(responseData, command) {
  const headerSize = command === CONSTANTS.CMD_READ_VALUE ? 12 : 8;
  const lengthOffset = command === CONSTANTS.CMD_READ_VALUE ? 8 : 4;
  if (responseData.length < headerSize) {
    return null;
  }
  const responseCommand = responseData.readInt32BE(0);
  if (responseCommand !== command) {
    throw new Error(`Unexpected response. Expected: ${command}, received: ${responseCommand}`);
  }
  const totalItems = responseData.readInt32BE(lengthOffset);
  if (totalItems < 0 || totalItems > 1e4) {
    throw new Error(`Invalid element count (${totalItems}) in response ${command}`);
  }
  const totalRequiredLength = headerSize + totalItems * 4;
  if (responseData.length < totalRequiredLength) {
    return null;
  }
  const allValues = new Array(totalItems);
  for (let i = 0; i < totalItems; i++) {
    allValues[i] = responseData.readInt32BE(headerSize + i * 4);
  }
  return allValues;
}
function createFinisher(ctx) {
  let finished = false;
  return (err, data) => {
    if (finished) {
      return;
    }
    finished = true;
    if (ctx.timeout) {
      ctx.adapter.clearTimeout(ctx.timeout);
    }
    if ("destroy" in ctx.socket) {
      ctx.socket.setTimeout(0);
      ctx.socket.destroy();
      if (err) {
        ctx.reject(err);
      } else {
        ctx.resolve(data);
      }
    } else {
      const ws = ctx.socket;
      const isWsActive = ws.readyState === import_ws.WebSocket.OPEN || ws.readyState === import_ws.WebSocket.CONNECTING;
      if (err) {
        if (isWsActive) {
          ws.close();
        }
        ctx.reject(err);
      } else {
        if (isWsActive) {
          ws.once("close", () => ctx.resolve(data));
          ws.close();
        } else {
          ctx.resolve(data);
        }
      }
    }
  };
}
function readAllRaw(adapter, command) {
  if (shouldUseWs(adapter)) {
    return readAllRawWs(adapter, command);
  }
  return readAllRawTcp(adapter, command);
}
function readAllRawWs(adapter, command) {
  return new Promise((resolve, reject) => {
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
    const ws = new import_ws.WebSocket(`ws://${host}:${port}`, "luxnet");
    ws.binaryType = "nodebuffer";
    const ctx = { adapter, socket: ws, resolve, reject };
    const finish = createFinisher(ctx);
    ctx.timeout = adapter.setTimeout(
      () => finish(new Error(`WebSocket Timeout reading list ${command}.`)),
      CONSTANTS.TIMEOUT_READ
    );
    const chunks = [];
    let totalLength = 0;
    ws.on("open", () => {
      ws.send(createCommandBuffer(command, 0), { binary: true });
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
      chunks.push(chunk);
      totalLength += chunk.length;
      try {
        const values = parseRawResponse(Buffer.concat(chunks, totalLength), command);
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
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
    const client = new net.Socket();
    const ctx = { adapter, socket: client, resolve, reject };
    const finish = createFinisher(ctx);
    ctx.timeout = adapter.setTimeout(
      () => finish(new Error(`Timeout reading TCP list ${command}.`)),
      CONSTANTS.TIMEOUT_READ
    );
    const chunks = [];
    let totalLength = 0;
    client.connect(port, host, () => {
      client.write(createCommandBuffer(command, 0));
    });
    client.on("data", (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;
      try {
        const values = parseRawResponse(Buffer.concat(chunks, totalLength), command);
        if (values !== null) {
          finish(void 0, values);
        }
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });
    client.on("error", (err) => finish(err));
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
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
    const ws = new import_ws.WebSocket(`ws://${host}:${port}`, "luxnet");
    ws.binaryType = "nodebuffer";
    const ctx = { adapter, socket: ws, resolve, reject };
    const finish = createFinisher(ctx);
    ctx.timeout = adapter.setTimeout(
      () => finish(new Error(`WebSocket Timeout writing parameter ${paramId}.`)),
      CONSTANTS.TIMEOUT_WRITE
    );
    ws.on("open", () => {
      ws.send(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value), { binary: true });
    });
    ws.on("message", () => finish());
    ws.on("error", (err) => finish(err));
  });
}
function writeRawParameterTcp(adapter, paramId, value) {
  return new Promise((resolve, reject) => {
    const host = adapter.config.host || "127.0.0.1";
    const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
    const client = new net.Socket();
    const ctx = { adapter, socket: client, resolve, reject };
    const finish = createFinisher(ctx);
    ctx.timeout = adapter.setTimeout(
      () => finish(new Error(`Timeout writing TCP parameter ${paramId}.`)),
      CONSTANTS.TIMEOUT_WRITE
    );
    client.connect(port, host, () => {
      client.write(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value));
    });
    client.on("data", (chunk) => {
      if (chunk.length >= 4 && chunk.readInt32BE(0) === CONSTANTS.CMD_WRITE) {
        finish();
      }
    });
    client.on("error", (err) => finish(err));
  });
}
async function dumpAllRawToLog(adapter) {
  const useWs = shouldUseWs(adapter);
  try {
    const dumpList = async (command, title) => {
      await delay(adapter, CONSTANTS.DELAY_RECONNECT);
      (0, import_logger.writeLog)("=======================================================", "info");
      (0, import_logger.writeLog)(`START COMPACT RAW DUMP: LIST ${command} (${title}) via ${useWs ? "WebSocket" : "TCP"}`, "info");
      (0, import_logger.writeLog)("=======================================================", "info");
      const data = await readAllRaw(adapter, command);
      for (let i = 0; i < data.length; i++) {
        (0, import_logger.writeLog)(`[RAW ${command}] Index ${i.toString().padStart(3, " ")} = ${data[i]}`, "info");
      }
      (0, import_logger.writeLog)(`--- END OF LIST ${command} (Total ${data.length} indices logged) ---`, "info");
      (0, import_logger.writeLog)("=======================================================", "info");
    };
    await delay(adapter, CONSTANTS.DELAY_RECONNECT);
    await dumpList(CONSTANTS.CMD_READ_PARAM, "PARAMETERS");
    await dumpList(CONSTANTS.CMD_READ_VALUE, "VALUES");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (0, import_logger.writeLog)(`Error executing raw dump: ${msg}`, "error");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  delay,
  dumpAllRawToLog,
  readAllRaw,
  writePumpSafe,
  writeRawParameter
});
//# sourceMappingURL=rawFunctions.js.map

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
var modbusManager_exports = {};
__export(modbusManager_exports, {
  ModbusManager: () => ModbusManager
});
module.exports = __toCommonJS(modbusManager_exports);
var import_modbus_serial = __toESM(require("modbus-serial"));
var import_logger = require("./logger");
class ModbusManager {
  client;
  /** Indicates whether the Modbus interface on the heat pump is reachable */
  isAvailable = false;
  adapter;
  host;
  port;
  /**
   * Initializes the Modbus manager with the adapter configuration.
   *
   * @param adapter - The ioBroker adapter instance.
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.client = new import_modbus_serial.default();
    this.host = adapter.config.host || "192.168.178.81";
    this.port = adapter.config.modbus_port ? Number(adapter.config.modbus_port) : 502;
  }
  /**
   * Checks if the Modbus TCP service is reachable on the heat pump.
   * Disables hybrid writing if the connection fails.
   *
   * @returns A promise resolving to true if available, false otherwise.
   */
  async checkAvailability() {
    if (!this.adapter.config.modbus_active) {
      return false;
    }
    try {
      this.client.setTimeout(2e3);
      await this.client.connectTCP(this.host, { port: this.port });
      this.client.setID(1);
      await this.client.readHoldingRegisters(1, 1);
      (0, import_logger.writeLog)(`[Modbus] Pre-Check erfolgreich! Modbus TCP ist auf Port ${this.port} erreichbar.`, "info");
      this.isAvailable = true;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`[Modbus] Pre-Check fehlgeschlagen: ${msg}. Hybrid-Schreibfunktionen werden deaktiviert.`, "warn");
      this.isAvailable = false;
      return false;
    } finally {
      if (this.client.isOpen) {
        this.client.close();
      }
    }
  }
  /**
   * Liest alle relevanten Holding-Register (0..23) und Coils (0..13) in einem schnellen Batch-Durchgang aus.
   *
   * @returns Ein Objekt mit den aktuellen Holdings und Coils oder null bei Fehlern.
   */
  async readAllRegisters() {
    if (!this.isAvailable || !this.adapter.config.modbus_active) {
      return null;
    }
    try {
      this.client.setTimeout(2500);
      await this.client.connectTCP(this.host, { port: this.port });
      this.client.setID(1);
      const holdingRes = await this.client.readHoldingRegisters(0, 24);
      const holdings = holdingRes.data.map((val) => val > 32767 ? val - 65536 : val);
      const coilRes = await this.client.readCoils(0, 14);
      const coils = coilRes.data;
      return { holdings, coils };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.adapter.isDebugLogActive) {
        (0, import_logger.writeLog)(`[Modbus] Lese-Zyklus fehlgeschlagen: ${msg}`, "debug");
      }
      return null;
    } finally {
      if (this.client.isOpen) {
        this.client.close();
      }
    }
  }
  /**
   * Writes a volatile value to the heat pump's RAM via Modbus TCP.
   *
   * @param register - The Modbus register number (e.g., 1 for target return temperature).
   * @param value - The value to write (ensure correct scaling factor, e.g., 23.5°C = 235).
   * @param isCoil - Set to true if the target is a boolean Coil (default is false for Holding registers).
   * @returns A promise that resolves when the write operation is completed.
   */
  async writeRegister(register, value, isCoil = false) {
    if (!this.isAvailable) {
      (0, import_logger.writeLog)(`[Modbus] Abbruch: Modbus nicht erreichbar. Kann Register ${register} nicht schreiben.`, "warn");
      return;
    }
    try {
      this.client.setTimeout(3e3);
      await this.client.connectTCP(this.host, { port: this.port });
      this.client.setID(1);
      if (isCoil) {
        const coilVal = value === 1 || Boolean(value);
        await this.client.writeCoil(register, coilVal);
        if (this.adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(`[Modbus] Coil ${register} erfolgreich auf ${coilVal} gesetzt.`, "debug");
        }
      } else {
        const rounded = Math.round(Number(value));
        const wireValue = rounded < 0 ? 65536 + rounded : rounded;
        await this.client.writeRegister(register, wireValue);
        if (this.adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(`[Modbus] Holding-Register ${register} erfolgreich auf ${rounded} gesetzt.`, "debug");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (0, import_logger.writeLog)(`[Modbus] Schreibfehler auf Register ${register}: ${msg}`, "error");
    } finally {
      if (this.client.isOpen) {
        this.client.close();
      }
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ModbusManager
});
//# sourceMappingURL=modbusManager.js.map

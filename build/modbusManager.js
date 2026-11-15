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
  /** Indicates whether the Modbus interface on the heat pump is reachable */
  isAvailable = false;
  adapter;
  host;
  port;
  /** Promise-Queue zur Vermeidung gleichzeitiger Socket-Zugriffe auf Port 502 */
  operationQueue = Promise.resolve();
  /**
   * Initializes the Modbus manager with the adapter configuration.
   *
   * @param adapter - The ioBroker adapter instance.
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.host = adapter.config.host || "192.168.178.81";
    this.port = adapter.config.modbus_port ? Number(adapter.config.modbus_port) : 502;
  }
  /**
   * Reiht eine Modbus-Operation in die serielle Warteschlange ein, um Socket-Kollisionen zu verhindern.
   *
   * @param task - Die auszuführende asynchrone Funktion.
   * @returns Das Ergebnis der ausgeführten Funktion.
   */
  enqueue(task) {
    const next = this.operationQueue.then(task, task);
    this.operationQueue = next.then(
      () => void 0,
      () => void 0
    );
    return next;
  }
  /**
   * Schließt den Modbus-Client sicher und wartet kurz, damit die Hardware den Port freigibt.
   *
   * @param client - Die geöffnete ModbusRTU-Instanz.
   */
  async safeClose(client) {
    const wasOpen = client.isOpen;
    try {
      client.close(() => {
      });
    } catch {
    }
    if (wasOpen) {
      await new Promise((resolve) => {
        this.adapter.setTimeout(resolve, 50);
      });
    }
  }
  /** Erkannte Modbus-Generation ('legacy' = 0..23, 'shi' = 10000+ ab V3.90) */
  protocolVersion = "legacy";
  /**
   * Prüft beim Start automatisch, ob das neue V3.9x SHI (10000+) oder das klassische Modbus (0..23) aktiv ist.
   */
  async checkAvailability() {
    if (!this.adapter.config.modbus_active) {
      return false;
    }
    return this.enqueue(async () => {
      const client = new import_modbus_serial.default();
      try {
        client.setTimeout(2e3);
        await client.connectTCP(this.host, { port: this.port });
        client.setID(1);
        try {
          await client.readHoldingRegisters(1e4, 1);
          this.isAvailable = true;
          this.protocolVersion = "shi";
          let fwInfo = "";
          try {
            const fwRes = await client.readInputRegisters(10400, 3);
            fwInfo = ` (SHI Firmware V${fwRes.data[0]}.${fwRes.data[1]}.${fwRes.data[2]})`;
          } catch {
          }
          (0, import_logger.writeLog)(
            `[Modbus] Pre-Check erfolgreich auf Port ${this.port}! Modernes V3.9x Smart Home Interface (Register 10000+) erkannt${fwInfo}.`,
            "info"
          );
          return true;
        } catch {
        }
        const legacyProbes = [1, 0, 2, 5, 7, 8, 15, 16, 23];
        for (const reg of legacyProbes) {
          try {
            await client.readHoldingRegisters(reg, 1);
            this.isAvailable = true;
            this.protocolVersion = "legacy";
            (0, import_logger.writeLog)(
              `[Modbus] Pre-Check erfolgreich auf Port ${this.port}! Klassisches Register-Mapping (0..23) erkannt.`,
              "info"
            );
            return true;
          } catch {
          }
        }
        this.isAvailable = false;
        (0, import_logger.writeLog)(
          `[Modbus] Port ${this.port} ist erreichbar, aber weder SHI (10000+) noch klassische Register (0..23) antworten. Bitte 'Dump_Raw_To_Log' ausf\xFChren!`,
          "warn"
        );
        return false;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, import_logger.writeLog)(
          `[Modbus] Pre-Check fehlgeschlagen (${msg}). Hybrid-Schreibfunktionen werden deaktiviert.`,
          "warn"
        );
        this.isAvailable = false;
        return false;
      } finally {
        await this.safeClose(client);
      }
    });
  }
  /**
   * Liest die aktivierten Register passend zur Protokoll-Version ('legacy' oder 'shi') aus
   * und legt sie auf die erwarteten Array-Indizes (holdings[reg] / coils[reg]), damit main.ts nahtlos weiterläuft.
   */
  async readAllRegisters() {
    if (!this.isAvailable || !this.adapter.config.modbus_active) {
      return null;
    }
    return this.enqueue(async () => {
      const client = new import_modbus_serial.default();
      try {
        client.setTimeout(2500);
        await client.connectTCP(this.host, { port: this.port });
        client.setID(1);
        const config = this.adapter.config;
        const holdings = new Array(24).fill(void 0);
        const coils = new Array(14).fill(void 0);
        if (this.protocolVersion === "shi") {
          const shiHoldingMap = [
            { legacyIdx: 0, shiReg: 10108, fc: "input" },
            // Außentemperatur (Temperatur_TA)
            { legacyIdx: 1, shiReg: 10001, fc: "holding" },
            // Rücklauf Soll (Heating: return setpoint)
            { legacyIdx: 2, shiReg: 10001, fc: "holding" },
            // Feste Rücklaufsolltemperatur
            { legacyIdx: 5, shiReg: 10006, fc: "holding" },
            // Warmwasser Soll (DHW: setpoint)
            { legacyIdx: 23, shiReg: 10002, fc: "holding" }
            // Parallelverschiebung (Heating: return offset)
          ];
          for (const item of shiHoldingMap) {
            if (config[`sync_modbus_holding_${item.legacyIdx}`] === true) {
              try {
                const res = item.fc === "input" ? await client.readInputRegisters(item.shiReg, 1) : await client.readHoldingRegisters(item.shiReg, 1);
                const raw = res.data[0];
                if (raw !== 32767) {
                  holdings[item.legacyIdx] = raw > 32767 ? raw - 65536 : raw;
                }
              } catch (regErr) {
                if (this.adapter.isDebugLogActive) {
                  const msg = regErr instanceof Error ? regErr.message : String(regErr);
                  (0, import_logger.writeLog)(`[Modbus SHI] Register ${item.shiReg} nicht lesbar: ${msg}`, "debug");
                }
              }
            }
          }
          const shiCoilMap = [
            { legacyCoil: 2, shiReg: 10354, fc: "input" },
            // HUPout
            { legacyCoil: 5, shiReg: 10355, fc: "input" },
            // BUPout
            { legacyCoil: 6, shiReg: 10350, fc: "input" },
            // VBOout / BOSUP
            { legacyCoil: 7, shiReg: 10070, fc: "holding" },
            // ZIP (schreibbar über 10070!)
            { legacyCoil: 8, shiReg: 10351, fc: "input" },
            // FP1out
            { legacyCoil: 9, shiReg: 10353, fc: "input" }
            // FP3out
          ];
          for (const item of shiCoilMap) {
            if (config[`sync_modbus_coil_${item.legacyCoil}`] === true) {
              try {
                const res = item.fc === "input" ? await client.readInputRegisters(item.shiReg, 1) : await client.readHoldingRegisters(item.shiReg, 1);
                const raw = res.data[0];
                if (raw !== 32767) {
                  coils[item.legacyCoil] = raw === 1;
                }
              } catch {
              }
            }
          }
          return { holdings, coils };
        }
        const holdingRegs = [0, 1, 2, 5, 7, 8, 15, 16, 23];
        for (const reg of holdingRegs) {
          if (config[`sync_modbus_holding_${reg}`] === true) {
            try {
              const res = await client.readHoldingRegisters(reg, 1);
              const val = res.data[0];
              holdings[reg] = val > 32767 ? val - 65536 : val;
            } catch (regErr) {
              if (this.adapter.isDebugLogActive) {
                const msg = regErr instanceof Error ? regErr.message : String(regErr);
                (0, import_logger.writeLog)(`[Modbus] Holding ${reg} konnte nicht gelesen werden: ${msg}`, "debug");
              }
            }
          }
        }
        const coilRegs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        for (const reg of coilRegs) {
          if (config[`sync_modbus_coil_${reg}`] === true) {
            try {
              const res = await client.readCoils(reg, 1);
              coils[reg] = Boolean(res.data[0]);
            } catch (coilErr) {
              if (this.adapter.isDebugLogActive) {
                const msg = coilErr instanceof Error ? coilErr.message : String(coilErr);
                (0, import_logger.writeLog)(`[Modbus] Coil ${reg} konnte nicht gelesen werden: ${msg}`, "debug");
              }
            }
          }
        }
        return { holdings, coils };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (this.adapter.isDebugLogActive) {
          (0, import_logger.writeLog)(`[Modbus] Lese-Zyklus fehlgeschlagen: ${msg}`, "debug");
        }
        return null;
      } finally {
        await this.safeClose(client);
      }
    });
  }
  /**
   * Schreibt einen flüchtigen Wert per Modbus TCP.
   * Übersetzt im SHI-Modus (V3.9x) automatisch die klassischen Register-Nummern auf 10000+
   * und setzt das erforderliche SHI-Mode-Register (10000 / 10005).
   *
   * @param register - Die klassische Modbus-Register- oder Coil-Adresse (z.B. 1, 5, 23 oder Coil 7).
   * @param value - Der zu schreibende Rohwert (inkl. passendem Skalierungsfaktor, z.B. 235 für 23,5 °C).
   * @param isCoil - Gibt an, ob es sich um einen booleschen Coil (true) oder ein Holding-Register (false) handelt.
   * @returns Ein Promise, das aufgelöst wird, sobald der Schreibvorgang abgeschlossen ist.
   */
  async writeRegister(register, value, isCoil = false) {
    if (!this.isAvailable) {
      (0, import_logger.writeLog)(`[Modbus] Abbruch: Modbus nicht erreichbar. Kann Register ${register} nicht schreiben.`, "warn");
      return;
    }
    return this.enqueue(async () => {
      const client = new import_modbus_serial.default();
      try {
        client.setTimeout(3e3);
        await client.connectTCP(this.host, { port: this.port });
        client.setID(1);
        if (this.protocolVersion === "shi") {
          if (isCoil) {
            if (register === 7) {
              const zipVal = value === 1 || Boolean(value) ? 1 : 0;
              await client.writeRegister(10070, zipVal);
              if (this.adapter.isDebugLogActive) {
                (0, import_logger.writeLog)(
                  `[Modbus SHI] ZIP (Holding 10070) erfolgreich auf ${zipVal} gesetzt.`,
                  "debug"
                );
              }
            } else {
              (0, import_logger.writeLog)(
                `[Modbus SHI] Coil ${register} wird im V3.9x SHI-Protokoll nicht schreibend unterst\xFCtzt.`,
                "warn"
              );
            }
            return;
          }
          const rounded = Math.round(Number(value));
          const wireValue = rounded < 0 ? 65536 + rounded : rounded;
          if (register === 1 || register === 2) {
            await client.writeRegister(10065, 0);
            await client.writeRegister(1e4, 1);
            await client.writeRegister(10001, wireValue);
            if (this.adapter.isDebugLogActive) {
              (0, import_logger.writeLog)(
                `[Modbus SHI] R\xFCcklauf-Soll (10001) auf ${rounded} gesetzt (Mode 10000=1).`,
                "debug"
              );
            }
          } else if (register === 23) {
            await client.writeRegister(10065, 0);
            if (rounded === 0) {
              await client.writeRegister(10002, 0);
              await client.writeRegister(1e4, 0);
            } else {
              await client.writeRegister(1e4, 2);
              await client.writeRegister(10002, wireValue);
            }
            if (this.adapter.isDebugLogActive) {
              (0, import_logger.writeLog)(
                `[Modbus SHI] Parallelverschiebung (10002) auf ${rounded} gesetzt (Mode 10000=${rounded === 0 ? 0 : 2}).`,
                "debug"
              );
            }
          } else if (register === 5) {
            await client.writeRegister(10005, 1);
            await client.writeRegister(10006, wireValue);
            if (this.adapter.isDebugLogActive) {
              (0, import_logger.writeLog)(`[Modbus SHI] WW-Soll (10006) auf ${rounded} gesetzt (Mode 10005=1).`, "debug");
            }
          } else if (register >= 1e4) {
            await client.writeRegister(register, wireValue);
          } else {
            (0, import_logger.writeLog)(
              `[Modbus SHI] Klassisches Holding-Register ${register} hat kein direktes Gegenst\xFCck im V3.9x SHI-Protokoll.`,
              "warn"
            );
          }
          return;
        }
        if (isCoil) {
          const coilVal = value === 1 || Boolean(value);
          await client.writeCoil(register, coilVal);
          if (this.adapter.isDebugLogActive) {
            (0, import_logger.writeLog)(`[Modbus] Coil ${register} erfolgreich auf ${coilVal} gesetzt.`, "debug");
          }
        } else {
          const rounded = Math.round(Number(value));
          const wireValue = rounded < 0 ? 65536 + rounded : rounded;
          await client.writeRegister(register, wireValue);
          if (this.adapter.isDebugLogActive) {
            (0, import_logger.writeLog)(`[Modbus] Holding-Register ${register} erfolgreich auf ${rounded} gesetzt.`, "debug");
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, import_logger.writeLog)(`[Modbus] Schreibfehler auf Register ${register}: ${msg}`, "error");
      } finally {
        await this.safeClose(client);
      }
    });
  }
  /**
   * Führt einen vollständigen Register-Scan für 'Dump_Raw_To_Log' durch (Legacy + V3.92.3 SHI).
   */
  async runDiagnosticDump() {
    const lines = [];
    const config = this.adapter.config;
    lines.push(
      `Modbus Config Status     : modbus_active=${Boolean(config.modbus_active)} | operation_mode=${config.operation_mode || "unknown"}`
    );
    lines.push(`Modbus Target Endpoint   : ${this.host}:${this.port}`);
    lines.push(`Modbus Runtime Available : ${this.isAvailable} (Protocol: ${this.protocolVersion})`);
    return this.enqueue(async () => {
      const client = new import_modbus_serial.default();
      try {
        client.setTimeout(1500);
        await client.connectTCP(this.host, { port: this.port });
        client.setID(1);
        lines.push(`TCP Socket Connection    : SUCCESS (Port ${this.port} reachable)`);
        const holdingCandidates = [
          0,
          1,
          2,
          5,
          7,
          8,
          15,
          16,
          23,
          1e4,
          10001,
          10002,
          10003,
          10005,
          10006,
          10007,
          10008,
          10010,
          10011,
          10012,
          10020,
          10021,
          10022,
          10040,
          10041,
          10050,
          10051,
          10052,
          10053,
          10060,
          10065,
          10066,
          10067,
          10070,
          10071
        ];
        for (const reg of holdingCandidates) {
          try {
            const res = await client.readHoldingRegisters(reg, 1);
            const raw = res.data[0];
            const signed = raw > 32767 ? raw - 65536 : raw;
            lines.push(`[MODBUS HOLDING ${reg.toString().padStart(5, " ")}] = ${signed} (raw: ${raw})`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            lines.push(`[MODBUS HOLDING ${reg.toString().padStart(5, " ")}] = UNSUPPORTED (${msg})`);
          }
        }
        const inputCandidates = [
          1e4,
          10002,
          10003,
          10004,
          10006,
          10100,
          10101,
          10102,
          10103,
          10104,
          10105,
          10106,
          10107,
          10108,
          10109,
          10110,
          10111,
          10120,
          10121,
          10123,
          10124,
          10140,
          10141,
          10201,
          10300,
          10301,
          10350,
          10354,
          10355,
          10356,
          10360,
          10361,
          10400,
          10401,
          10402,
          10500,
          10501,
          10502
        ];
        for (const reg of inputCandidates) {
          try {
            const res = await client.readInputRegisters(reg, 1);
            const raw = res.data[0];
            const signed = raw > 32767 ? raw - 65536 : raw;
            lines.push(`[MODBUS INPUT   ${reg.toString().padStart(5, " ")}] = ${signed} (raw: ${raw})`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            lines.push(`[MODBUS INPUT   ${reg.toString().padStart(5, " ")}] = UNSUPPORTED (${msg})`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        lines.push(`TCP Socket Connection    : FAILED (${msg})`);
      } finally {
        await this.safeClose(client);
      }
      return lines;
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ModbusManager
});
//# sourceMappingURL=modbusManager.js.map

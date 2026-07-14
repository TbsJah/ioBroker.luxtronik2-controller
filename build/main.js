"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_actionHandlers = require("./actionHandlers");
var import_logger = require("./logger");
var import_notificationManager = require("./notificationManager");
var import_objectManager = require("./objectManager");
var import_rawFunctions = require("./rawFunctions");
var import_stateMapping = require("./stateMapping");
var import_virtualStates = require("./virtualStates");
var import_zipManager = require("./zipManager");
class Luxtronik2Controller extends utils.Adapter {
  createdStates = /* @__PURE__ */ new Set();
  zipTimer;
  originalZipConfig = null;
  lastKnownErrorTimestamp = null;
  isDebugLogActive = false;
  pollingInterval;
  lastBzVal = "";
  updateRunning = false;
  lastPumpOptimization = 0;
  writeQueue = [];
  isWriting = false;
  errorCount = 0;
  MAX_ERRORS = 3;
  constructor(options = {}) {
    super({
      ...options,
      name: "luxtronik2-controller"
    });
    (0, import_logger.initLogger)(this);
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on("message", this.onMessage.bind(this));
  }
  async onMessage(obj) {
    if (obj.command === "testTelegram") {
      await (0, import_notificationManager.handleTestMessage)(this, obj);
    }
  }
  async onReady() {
    const config = this.config;
    const ip = config.host;
    const port = config.port || 8889;
    await this.setState("info.connection", { val: false, ack: true });
    (0, import_logger.writeLog)(`Verbinde mit W\xE4rmepumpe auf ${ip}:${port}...`, "info");
    await (0, import_objectManager.cleanupStates)(this);
    await (0, import_objectManager.cleanupCustomStates)(this);
    await (0, import_objectManager.cleanupEmptyFolders)(this);
    await (0, import_objectManager.ensureAllObjectsExist)(this);
    await (0, import_objectManager.ensureCustomObjectsExist)(this);
    await this.setState((0, import_stateMapping.getDpPath)("Regelung_Aktiv"), { val: config.regelung_aktiv !== false, ack: true });
    const debugState = await this.getStateAsync((0, import_stateMapping.getDpPath)("Schreibe_Debug_Log"));
    this.isDebugLogActive = (debugState == null ? void 0 : debugState.val) === true;
    (0, import_logger.setCustomDebug)(this.isDebugLogActive);
    if (this.isDebugLogActive) {
      (0, import_logger.writeLog)("Synchronisiere Konfigurationswerte mit der W\xE4rmepumpe...", "info");
    }
    await this.setIdleDefaults();
    if (config.motion_sensors_aktiv && Array.isArray(config.motionSensors)) {
      for (const sensor of config.motionSensors) {
        if (sensor.oid && typeof sensor.oid === "string" && sensor.oid.trim() !== "") {
          this.subscribeForeignStates(sensor.oid.trim());
          if (this.isDebugLogActive) {
            (0, import_logger.writeLog)(`Bewegungssensor abonniert: ${sensor.name} (${sensor.oid})`, "info");
          }
        }
      }
    }
    this.subscribeStates("*");
    try {
      await this.updateData();
    } catch (error) {
      this.log.error(`Fehler bei der initialen Datenabfrage (Pumpe offline?): ${error.message}`);
    }
    let intervalSeconds = this.config.interval ? Number(this.config.interval) : 45;
    if (intervalSeconds < 10) {
      intervalSeconds = 10;
      (0, import_logger.writeLog)("Eingestelltes Intervall war zu kurz. Wurde zum Schutz auf 10 Sekunden korrigiert.", "warn");
    }
    this.pollingInterval = this.setInterval(async () => {
      try {
        await this.updateData();
      } catch (error) {
        this.log.error(`Fehler w\xE4hrend des zyklischen Datenabrufs: ${error.message}`);
      }
    }, intervalSeconds * 1e3);
    await this.setState("info.connection", true, true);
  }
  async syncConfigValue(mappingKey, val) {
    if (val === void 0 || val === null) {
      return;
    }
    const id = (0, import_stateMapping.getDpPath)(mappingKey);
    const state = await this.getStateAsync(id);
    if (!state || state.val !== val) {
      const definition = import_stateMapping.STATE_MAPPING[mappingKey];
      if (!definition) {
        return;
      }
      await this.setState(id, { val, ack: true });
      if (this.isDebugLogActive) {
        (0, import_logger.writeLog)(`Schreibe Wert direkt in W\xE4rmepumpe: ${mappingKey} = ${val}`, "info");
      }
      if (definition.write === true && !definition.isVirtual && definition.luxWriteId) {
        let valueToWrite = val;
        if (definition.factor && typeof val === "number") {
          valueToWrite = val * definition.factor;
        }
        const isRawWrite = definition.dataSource === "raw_parameter" || definition.dataSource === "raw_value" || !definition.dataSource && /^\d+$/.test(definition.luxWriteId || "");
        if (isRawWrite && definition.unit === "\xB0C" && typeof val === "number" && !definition.factor) {
          valueToWrite = val * 10;
        }
        try {
          const targetWriteId = definition.luxWriteId;
          const writeId = isRawWrite ? parseInt(targetWriteId, 10) : targetWriteId;
          await this.queueWrite(writeId, valueToWrite);
          await new Promise((r) => global.setTimeout(r, 200));
        } catch (err) {
          (0, import_logger.writeLog)(`Fehler beim Schreiben von ${mappingKey} an die Pumpe: ${err.message}`, "error");
        }
      }
    }
  }
  async setOwnStateIfDifferent(id, val, ack = false) {
    try {
      if (val === void 0) {
        return;
      }
      const state = await this.getStateAsync(id);
      if (!state || state.val !== val) {
        await this.setState(id, { val, ack });
        if (this.isDebugLogActive) {
          (0, import_logger.writeLog)(`Setze Werte f\xFCr ${id}: ${val}`, "debug");
        }
      }
    } catch (err) {
      (0, import_logger.writeLog)(`Fehler in setOwnStateIfDifferent f\xFCr ${id}: ${err.message}`, "error");
    }
  }
  async setIdleDefaults() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    try {
      const config = this.config;
      await this.syncConfigValue("heating_curve_end_point", (_a = config.endpunkt) != null ? _a : 23);
      await this.syncConfigValue("heating_curve_parallel_offset", (_b = config.fusspunkt) != null ? _b : 21.7);
      await this.syncConfigValue(
        "heating_system_circ_pump_voltage_minimal",
        (_c = config.sync_heating_system_circ_pump_voltage_minimal_heating) != null ? _c : 3
      );
      await this.syncConfigValue(
        "heating_system_circ_pump_voltage_nominal",
        (_d = config.sync_heating_system_circ_pump_voltage_nominal_heating) != null ? _d : 7
      );
      await this.syncConfigValue("warmwater_temperature", (_e = config.sync_warmwater_target_temperature) != null ? _e : 54);
      await this.syncConfigValue(
        "hotWaterTemperatureHysteresis",
        (_f = config.sync_hotwater_temperature_hysteresis) != null ? _f : 10
      );
      await this.syncConfigValue("returnTemperatureHysteresis", (_g = config.sync_return_temperature_hysteresis) != null ? _g : 1.5);
      await this.syncConfigValue("zip_aktiv", (_h = config.zip_aktiv) != null ? _h : 0);
      await this.syncConfigValue("Heizen_nach_Wasser", (_i = config.Heating_after_warmwater) != null ? _i : false);
    } catch (err) {
      (0, import_logger.writeLog)(`Fehler beim Setzen der Leerlauf-Vorgabewerte: ${err.message}`, "error");
    }
  }
  async istBetriebszustandAelterAls10Min() {
    var _a;
    try {
      const state = await this.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt"));
      const lastChange = (_a = state == null ? void 0 : state.lc) != null ? _a : 0;
      return (Date.now() - lastChange) / 6e4 >= 10;
    } catch {
      return false;
    }
  }
  async runOptimizationSchedule() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    try {
      const config = this.config;
      const bzState = await this.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt"));
      const bzVal = bzState && bzState.val !== null ? String(bzState.val).trim() : "";
      const istHeizen = bzVal === "0";
      const istWarmwasser = bzVal === "1";
      const istAbtauen = bzVal === "4";
      const istLeerlauf = bzVal === "5";
      if (!istHeizen && !istWarmwasser && !istLeerlauf && !istAbtauen) {
        return;
      }
      if (bzVal !== this.lastBzVal) {
        if (istLeerlauf) {
          if (config.idle_defaults_aktiv !== false) {
            await this.setIdleDefaults();
          }
        } else if (istHeizen) {
          if (config.zip_optimierung_aktiv !== false) {
            await this.syncConfigValue("zip_aktiv", (_a = config.zip_aktiv) != null ? _a : 0);
            await this.syncConfigValue(
              "heating_system_circ_pump_voltage_minimal",
              (_b = config.sync_heating_system_circ_pump_voltage_minimal_heating) != null ? _b : 3
            );
            await this.syncConfigValue(
              "heating_system_circ_pump_voltage_nominal",
              (_c = config.sync_heating_system_circ_pump_voltage_nominal_heating) != null ? _c : 7
            );
          }
          if (config.regelung_aktiv !== false) {
            await this.syncConfigValue("Heizen_nach_Wasser", (_d = config.Heating_after_warmwater) != null ? _d : false);
          }
        } else if (istWarmwasser) {
          if (config.zip_optimierung_aktiv !== false) {
            await this.syncConfigValue(
              "hotWaterTemperatureHysteresis",
              (_e = config.sync_hotwater_temperature_hysteresis) != null ? _e : 2
            );
            await this.syncConfigValue("zip_aktiv", (_f = config.zip_aktiv_ww) != null ? _f : 0);
            await this.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("Activate_Zip"), true, false);
            await this.syncConfigValue(
              "heating_system_circ_pump_voltage_minimal",
              (_g = config.sync_heating_system_circ_pump_voltage_minimal_water) != null ? _g : 3
            );
            await this.syncConfigValue(
              "heating_system_circ_pump_voltage_nominal",
              (_h = config.sync_heating_system_circ_pump_voltage_nominal_water) != null ? _h : 10
            );
          }
        } else if (istAbtauen) {
          if (config.zip_optimierung_aktiv !== false) {
            await this.syncConfigValue("heating_system_circ_pump_voltage_nominal", 10);
          }
        }
        this.lastBzVal = bzVal;
      }
      const [
        wwSollState,
        wwIstState,
        ruecklaufState,
        spreizungState,
        heatingStateStrState,
        vd1State,
        wwHystereseState,
        ruecklaufSollState,
        hupAktivState,
        heizenHystereseState,
        nachWasserState,
        aelterAls10
      ] = await Promise.all([
        this.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("spreizung_vorlauf_ruecklauf")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("opStateHeatingString")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("VD1out")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("hotWaterTemperatureHysteresis")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("HUPout")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("Heizen_nach_Wasser")),
        this.istBetriebszustandAelterAls10Min()
      ]);
      const wwSoll = (_i = wwSollState == null ? void 0 : wwSollState.val) != null ? _i : 0;
      const wwIst = (_j = wwIstState == null ? void 0 : wwIstState.val) != null ? _j : 0;
      const ruecklauf = (_k = ruecklaufState == null ? void 0 : ruecklaufState.val) != null ? _k : 0;
      const spreizung = (_l = spreizungState == null ? void 0 : spreizungState.val) != null ? _l : 0;
      const heatingStateStr = String((heatingStateStrState == null ? void 0 : heatingStateStrState.val) || "").trim();
      const vd1 = (vd1State == null ? void 0 : vd1State.val) === 1;
      const wwHysterese = (_m = wwHystereseState == null ? void 0 : wwHystereseState.val) != null ? _m : 0;
      const ruecklaufSoll = (_n = ruecklaufSollState == null ? void 0 : ruecklaufSollState.val) != null ? _n : 0;
      const hupAktiv = (_o = hupAktivState == null ? void 0 : hupAktivState.val) != null ? _o : 0;
      const heizenHysterese = (_p = heizenHystereseState == null ? void 0 : heizenHystereseState.val) != null ? _p : 0;
      const nachWasser = nachWasserState == null ? void 0 : nachWasserState.val;
      const betriebsart = (_q = bzState == null ? void 0 : bzState.val) != null ? _q : 0;
      if (istHeizen) {
        if (config.regelung_aktiv !== false && aelterAls10 && vd1) {
          const fusspunkt = (_r = await this.getStateAsync((0, import_stateMapping.getDpPath)("heating_curve_parallel_offset"))) == null ? void 0 : _r.val;
          if (fusspunkt === 35) {
            const fallbackFusspunkt = (_s = config.fusspunkt) != null ? _s : 21.7;
            await this.syncConfigValue("heating_curve_parallel_offset", fallbackFusspunkt);
          }
        }
        if (config.zip_optimierung_aktiv !== false) {
          const now = Date.now();
          if (now - this.lastPumpOptimization > 3e5) {
            if (spreizung < 6.5 && hupAktiv > 5.5) {
              await this.syncConfigValue("heating_system_circ_pump_voltage_nominal", hupAktiv - 0.25);
              this.lastPumpOptimization = now;
              (0, import_logger.writeLog)(
                `Spreizung zu gering (${spreizung}K). HUP-Spannung auf ${hupAktiv - 0.25}V gesenkt.`,
                "info"
              );
            } else if (spreizung > 7.5 && hupAktiv < 10) {
              await this.syncConfigValue("heating_system_circ_pump_voltage_nominal", hupAktiv + 0.25);
              this.lastPumpOptimization = now;
              (0, import_logger.writeLog)(
                `Spreizung zu hoch (${spreizung}K). HUP-Spannung auf ${hupAktiv + 0.25}V erh\xF6ht.`,
                "info"
              );
            }
          }
        }
        if (config.regelung_aktiv !== false) {
          if (ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
            if (aelterAls10) {
              await this.syncConfigValue("Heizen_nach_Wasser", false);
            }
          } else if (!nachWasser && config.Heating_after_warmwater === true) {
            await this.syncConfigValue("Heizen_nach_Wasser", true);
          }
          if (wwSoll - wwIst > 2 && ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
            const fallbackHyst = (_t = config.sync_hotwater_temperature_hysteresis) != null ? _t : 2;
            await this.syncConfigValue("hotWaterTemperatureHysteresis", fallbackHyst);
          }
        }
      }
      if (istWarmwasser && nachWasser) {
        if (config.regelung_aktiv !== false) {
          await this.syncConfigValue("heating_curve_parallel_offset", 35);
        }
      }
      if (istLeerlauf) {
        if (config.zip_optimierung_aktiv !== false) {
          if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
            await (0, import_zipManager.stopZipAndDeaeration)(this);
          }
        }
        if (config.regelung_aktiv !== false) {
          if (wwSoll - wwIst >= wwHysterese - 1.5 && ruecklauf <= ruecklaufSoll && betriebsart !== 4 && heatingStateStr !== "Heizgrenze") {
            await this.syncConfigValue("heating_curve_parallel_offset", 35);
          }
        }
      }
    } catch (err) {
      (0, import_logger.writeLog)(`Fehler im runOptimizationSchedule-Ablauf: ${err.message}`, "error");
    }
  }
  async writePumpAsync(cmd, val) {
    if (this.isDebugLogActive) {
      (0, import_logger.writeLog)(`writePumpAsync Raw-Befehl: ID ${cmd}, val: ${val}`, "debug");
    }
    const paramId = typeof cmd === "string" ? parseInt(cmd, 10) : cmd;
    let value = typeof val === "string" ? parseInt(val, 10) : val;
    if (typeof value === "boolean") {
      value = value ? 1 : 0;
    }
    await (0, import_rawFunctions.writeRawParameter)(this, paramId, value);
  }
  async queueWrite(cmd, val) {
    return new Promise((resolve, reject) => {
      this.writeQueue.push(async () => {
        try {
          await this.writePumpAsync(cmd, val);
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      void this.processQueue();
    });
  }
  async processQueue() {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }
    this.isWriting = true;
    try {
      while (this.writeQueue.length > 0) {
        const task = this.writeQueue.shift();
        if (task) {
          try {
            await task();
            await new Promise((resolve) => global.setTimeout(resolve, 300));
          } catch (taskError) {
            (0, import_logger.writeLog)(
              `Fehler beim Ausf\xFChren eines Schreibbefehls in der Queue: ${taskError.message}`,
              "error"
            );
          }
        }
      }
    } finally {
      this.isWriting = false;
    }
  }
  formatSecondsToHMS(totalSeconds) {
    if (totalSeconds < 0 || isNaN(totalSeconds)) {
      return "00:00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  async updateData() {
    if (this.updateRunning) {
      return;
    }
    this.updateRunning = true;
    try {
      let rawParams = [];
      let rawValues = [];
      try {
        rawParams = await (0, import_rawFunctions.readAllRaw)(this, 3003);
      } catch (err) {
        (0, import_logger.writeLog)(`Raw 3003 Fehler: ${err.message}`, "debug");
      }
      await new Promise((r) => global.setTimeout(r, 3500));
      try {
        rawValues = await (0, import_rawFunctions.readAllRaw)(this, 3004);
      } catch (err) {
        (0, import_logger.writeLog)(`Raw 3004 Fehler: ${err.message}`, "debug");
      }
      await new Promise((r) => global.setTimeout(r, 3500));
      this.errorCount = 0;
      await this.setState("info.connection", { val: true, ack: true });
      const statePromises = [];
      const config = this.config;
      for (const [key, definition] of Object.entries(import_stateMapping.STATE_MAPPING)) {
        if (definition.isVirtual) {
          continue;
        }
        if (!(0, import_objectManager.isStateEnabled)(key, definition, config)) {
          continue;
        }
        const luxId = definition.luxWriteId || key;
        let value = void 0;
        if (definition.dataSource) {
          switch (definition.dataSource) {
            case "raw_parameter":
              value = rawParams == null ? void 0 : rawParams[parseInt(luxId, 10)];
              if (value !== void 0 && definition.factor) {
                value /= definition.factor;
              }
              break;
            case "raw_value":
              value = rawValues == null ? void 0 : rawValues[parseInt(luxId, 10)];
              if (value !== void 0 && definition.factor) {
                value /= definition.factor;
              }
              break;
            case "parameter":
            case "value":
            case "additional":
              value = void 0;
              break;
          }
        } else {
          if (/^\d+$/.test(luxId)) {
            const idx = parseInt(luxId, 10);
            value = definition.folder.startsWith("Einstellungen") ? rawParams == null ? void 0 : rawParams[idx] : rawValues == null ? void 0 : rawValues[idx];
            if (value !== void 0 && definition.factor) {
              value /= definition.factor;
            }
          } else {
            value = void 0;
          }
        }
        if (value !== void 0) {
          if (definition.type === "number" && typeof value === "string") {
            value = value.toLowerCase() === "ein" ? 1 : value.toLowerCase() === "aus" ? 0 : parseFloat(value);
          } else if (definition.type === "boolean") {
            value = value === true || value === 1 || String(value).toLowerCase() === "ein" || String(value).toLowerCase() === "true";
          } else if (definition.type === "json" && typeof value === "object") {
            value = JSON.stringify(value);
          }
          if (definition.unit === "s" && typeof value === "number") {
            value = this.formatSecondsToHMS(value);
          } else if (definition.role && ["value.datetime", "value.time", "date"].includes(definition.role)) {
            const totalSeconds = typeof value === "number" ? value : parseInt(value, 10);
            if (!isNaN(totalSeconds) && totalSeconds >= 0) {
              if (totalSeconds < 86400) {
                const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
                const m = Math.floor(totalSeconds % 3600 / 60).toString().padStart(2, "0");
                value = `${h}:${m}`;
              } else {
                value = new Date(totalSeconds * 1e3).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false
                });
              }
            }
          }
          let targetIoBrokerType = definition.type === "json" ? "string" : definition.type;
          if (definition.unit === "s" && definition.type === "number") {
            targetIoBrokerType = "string";
          }
          if (definition.role && ["value.datetime", "value.time", "date"].includes(definition.role)) {
            targetIoBrokerType = "string";
          }
          if (targetIoBrokerType === "string" && typeof value !== "string") {
            value = String(value);
          } else if (targetIoBrokerType === "number" && typeof value !== "number") {
            value = Number(value);
          } else if (targetIoBrokerType === "boolean" && typeof value !== "boolean") {
            value = Boolean(value);
          }
          const stateId = `${definition.folder}.${key}`;
          statePromises.push(this.setState(stateId, { val: value, ack: true }));
        }
      }
      await Promise.all(statePromises);
      await (0, import_virtualStates.calculateTotalThermalEnergy)(this);
      await (0, import_virtualStates.calculateTotalEnergy)(this);
      const fehlerDp = (0, import_stateMapping.getDpPath)("Fehlerspeicher");
      const oldFehlerState = await this.getStateAsync(fehlerDp);
      const oldFehlerVal = oldFehlerState == null ? void 0 : oldFehlerState.val;
      await (0, import_virtualStates.updateErrorHistory)(this, rawValues);
      const newFehlerState = await this.getStateAsync(fehlerDp);
      const newFehlerVal = newFehlerState == null ? void 0 : newFehlerState.val;
      await (0, import_notificationManager.checkAndSendErrorNotifications)(this, oldFehlerVal, newFehlerVal);
      await (0, import_virtualStates.updateOutageHistory)(this, rawValues);
      await (0, import_virtualStates.calculateTemperatureSpread)(this);
      await (0, import_virtualStates.updateStatusStrings)(this, rawValues, rawParams);
      await (0, import_virtualStates.updateCustomStates)(this, rawValues, rawParams);
      await (0, import_virtualStates.updateTimerTables)(this);
      await (0, import_virtualStates.updateSystemInfos)(this, rawValues);
      await this.runOptimizationSchedule();
    } catch (err) {
      this.errorCount++;
      (0, import_logger.writeLog)(`Abfragefehler (${this.errorCount}/${this.MAX_ERRORS}): ${err.message}`, "error");
      if (this.errorCount >= this.MAX_ERRORS) {
        await this.setState("info.connection", { val: false, ack: true });
        (0, import_logger.writeLog)("W\xE4rmepumpe nicht erreichbar. Verbindung wurde als unterbrochen markiert.", "warn");
        (0, import_notificationManager.sendTelegramNotification)(
          this,
          "W\xE4rmepumpe nicht erreichbar. Verbindung wurde als unterbrochen markiert."
        );
      }
    } finally {
      this.updateRunning = false;
    }
  }
  onUnload(callback) {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      if (this.zipTimer) {
        clearTimeout(this.zipTimer);
      }
      void this.setState("info.connection", { val: false, ack: true });
      (0, import_logger.writeLog)("Adapter wird beendet. Alle Timer und Verbindungen sauber gestoppt.", "info");
      callback();
    } catch {
      callback();
    }
  }
  async onStateChange(id, state) {
    if (!state) {
      return;
    }
    const config = this.config;
    if (config.motion_sensors_aktiv && config.motionSensors && Array.isArray(config.motionSensors)) {
      const matchedSensor = config.motionSensors.find((s) => s.oid && s.oid.trim() === id);
      if (matchedSensor && state.val === true) {
        const zipOutState = await this.getStateAsync((0, import_stateMapping.getDpPath)("ZIPout"));
        if (zipOutState && zipOutState.val === 1) {
          if (this.isDebugLogActive) {
            (0, import_logger.writeLog)(`Bewegung an '${matchedSensor.name}' ignoriert, da ZIP bereits l\xE4uft.`, "debug");
          }
          return;
        }
        const now = Date.now();
        const lastZipChange = (zipOutState == null ? void 0 : zipOutState.lc) || 0;
        if (now - lastZipChange > (config.zip_last_run_min || 600) * 1e3) {
          if (this.isDebugLogActive) {
            (0, import_logger.writeLog)(`Bewegung an '${matchedSensor.name || id}' erkannt. Triggere ZIP Makro.`, "debug");
          }
          await this.setForeignStateAsync(`${this.namespace}.${(0, import_stateMapping.getDpPath)("Activate_Zip")}`, {
            val: true,
            ack: false
          });
        } else {
          if (this.isDebugLogActive) {
            (0, import_logger.writeLog)(
              `Bewegung an '${matchedSensor.name || id}' erkannt, aber ZIP hat k\xFCrzlich gearbeitet.`,
              "debug"
            );
          }
        }
        return;
      }
    }
    if (state.ack) {
      return;
    }
    if (id.startsWith(`${this.namespace}.Benutzer.`)) {
      try {
        const obj = await this.getObjectAsync(id);
        if (obj && obj.native && obj.native.source === "parameter") {
          await this.setForeignStateAsync(id, { val: state.val, ack: true });
          let valueToWrite = state.val;
          if (obj.native.customType === "boolean") {
            valueToWrite = state.val ? 1 : 0;
          } else if (obj.native.customType === "number" && typeof state.val === "number") {
            if (obj.native.factor) {
              valueToWrite = Math.round(state.val / obj.native.factor);
            } else {
              valueToWrite = Math.round(state.val);
            }
          }
          const targetWriteId = parseInt(obj.native.luxId, 10);
          if (!isNaN(targetWriteId)) {
            if (this.isDebugLogActive) {
              (0, import_logger.writeLog)(
                `Schreibe benutzerdefinierten Parameter ${targetWriteId} mit Wert ${valueToWrite}`,
                "info"
              );
            }
            await this.queueWrite(targetWriteId, valueToWrite);
          }
        }
      } catch (err) {
        (0, import_logger.writeLog)(`Fehler beim Schreiben eines eigenen Parameters: ${err.message}`, "error");
      }
      return;
    }
    const mappingKey = id.split(".").pop();
    if (!mappingKey) {
      return;
    }
    const definition = import_stateMapping.STATE_MAPPING[mappingKey];
    if (!definition) {
      return;
    }
    try {
      if (mappingKey === "Schreibe_Debug_Log") {
        await this.setForeignStateAsync(id, { val: state.val, ack: true });
        this.isDebugLogActive = state.val === true;
        (0, import_logger.setCustomDebug)(this.isDebugLogActive);
        (0, import_logger.writeLog)(`Erweitertes Logging ist nun ${this.isDebugLogActive ? "aktiviert" : "deaktiviert"}`, "info");
        return;
      }
      if (mappingKey === "Regelung_Aktiv" || mappingKey === "zip_aktiv") {
        await this.setForeignStateAsync(id, { val: state.val, ack: true });
        return;
      }
      if (mappingKey === "Setze_Vorgabewerte" && state.val === true) {
        await this.setForeignStateAsync(id, { val: false, ack: true });
        await this.setIdleDefaults();
        return;
      }
      if (mappingKey === "Dump_Raw_To_Log" && state.val === true) {
        await this.setForeignStateAsync(id, { val: false, ack: true });
        await (0, import_rawFunctions.dumpAllRawToLog)(this);
        return;
      }
      if (mappingKey === "Zwangswarmwasser") {
        if (state.val === true) {
          await (0, import_actionHandlers.handleZwangswarmwasser)(this, id);
        }
        return;
      }
      if (mappingKey === "Zwangsheizen") {
        if (state.val === true) {
          await (0, import_actionHandlers.handleZwangsheizen)(this, id);
        }
        return;
      }
      if (mappingKey === "Activate_Zip") {
        if (state.val === true) {
          const durationState = await this.getStateAsync((0, import_stateMapping.getDpPath)("zip_aktiv"));
          const durationSeconds = durationState && typeof durationState.val === "number" ? durationState.val : 120;
          await (0, import_zipManager.handleActivateZip)(this, id, durationSeconds);
        } else {
          await this.setForeignStateAsync(id, { val: false, ack: true });
          await (0, import_zipManager.stopZipAndDeaeration)(this);
        }
        return;
      }
      if (!definition.luxWriteId || definition.write !== true) {
        return;
      }
      await this.setForeignStateAsync(id, { val: state.val, ack: true });
      let valueToWrite = state.val;
      if (definition.role === "value.datetime") {
        const valStr = String(state.val).trim();
        const timeMatch = valStr.match(/^(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
          valueToWrite = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
        }
      } else if (definition.factor && typeof state.val === "number") {
        valueToWrite = state.val * definition.factor;
      }
      if (definition.unit === "\xB0C" && typeof state.val === "number" && !definition.factor) {
        valueToWrite = state.val * 10;
      }
      const targetWriteId = definition.luxWriteId;
      await this.queueWrite(parseInt(targetWriteId, 10), valueToWrite);
    } catch (err) {
      (0, import_logger.writeLog)(`Fehler bei Befehlsausf\xFChrung: ${err.message}`, "error");
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Luxtronik2Controller(options);
} else {
  (() => new Luxtronik2Controller())();
}
//# sourceMappingURL=main.js.map

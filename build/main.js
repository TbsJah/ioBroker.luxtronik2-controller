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
var import_convert = require("./convert");
var import_logger = require("./logger");
var import_notificationManager = require("./notificationManager");
var import_objectManager = require("./objectManager");
var import_rawFunctions = require("./rawFunctions");
var import_stateMapping = require("./stateMapping");
var import_virtualStates = require("./virtualStates");
var import_zipManager = require("./zipManager");
class Luxtronik2Controller extends utils.Adapter {
  /** Set of all active namespaced state IDs created or managed by the adapter */
  createdStates = /* @__PURE__ */ new Set();
  /** ioBroker timeout handle for the hot water circulation pump macro */
  zipTimer;
  /** Cached copy of the original circulation pump settings before macro activation */
  originalZipConfig = null;
  /** Unix timestamp of the last error dispatched to prevent duplicate notification triggers */
  lastKnownErrorTimestamp = null;
  /** Determines whether verbose debugging output is enabled */
  isDebugLogActive = false;
  // Cache für den globalen Schreibschutz
  currentRawParams = [];
  /** ioBroker interval handle for the main data polling loop */
  pollingInterval;
  /** Cache for the last evaluated heat pump operating state code */
  lastBzVal = "";
  /** Lock flag preventing concurrent execution of the polling updates */
  updateRunning = false;
  /** Timestamp tracking the last dynamic pump voltage optimization execution */
  lastPumpOptimization = 0;
  /** Internal array storing pending serial hardware write tasks */
  writeQueue = [];
  /** Lock flag indicating that the write queue is currently being processed */
  isWriting = false;
  /** Counter tracking sequential communication timeouts/failures */
  errorCount = 0;
  /** Maximum allowed sequential request failures before connection is flagged as interrupted */
  MAX_ERRORS = 3;
  writeCyclesToday = 0;
  writeCyclesTotal = 0;
  midnightTimer;
  /**
   * Initializes a new instance of the Luxtronik2Controller class.
   *
   * @param options - Optional core configuration overrides passed by the ioBroker host.
   */
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
  /**
   * Processes incoming inter-adapter messages or commands dispatched from the Admin UI.
   *
   * @param obj - The standardized ioBroker message structure containing parameters and optional callbacks.
   * @returns A promise that resolves once the message has been processed.
   */
  async onMessage(obj) {
    if (obj.command === "testTelegram") {
      await (0, import_notificationManager.handleTestMessage)(this, obj);
    }
  }
  /**
   * Callback executed once the ioBroker host framework completely initializes the adapter subsystem.
   * Sets up database objects, applies configurations, subscribes to states, and triggers the polling loop.
   *
   * @returns A promise that resolves when initialization completes.
   */
  async onReady() {
    const config = this.config;
    const ip = config.host;
    const port = config.port || 8889;
    await this.setState("info.connection", { val: false, ack: true });
    (0, import_logger.writeLog)(`Connecting to heat pump at ${ip}:${port}...`, "info");
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
      (0, import_logger.writeLog)("Synchronizing configuration values with the heat pump...", "info");
    }
    await this.setIdleDefaults();
    if (this.isDebugLogActive) {
      (0, import_logger.writeLog)("Synchronizing configuration values with the heat pump...", "info");
    }
    await this.setIdleDefaults();
    await (0, import_zipManager.disableHardwareZipTimer)(this);
    const cycleTodayState = await this.getStateAsync((0, import_stateMapping.getDpPath)("write_cycles_today"));
    this.writeCyclesToday = cycleTodayState && typeof cycleTodayState.val === "number" ? cycleTodayState.val : 0;
    const cycleTotalState = await this.getStateAsync((0, import_stateMapping.getDpPath)("write_cycles_total"));
    this.writeCyclesTotal = cycleTotalState && typeof cycleTotalState.val === "number" ? cycleTotalState.val : 0;
    this.scheduleMidnightReset();
    (0, import_zipManager.subscribeMotionSensors)(this);
    this.subscribeStates("*");
    try {
      await this.updateData();
    } catch (error) {
      this.log.error(`Initial data retrieval failed (device offline?): ${error.message}`);
    }
    let intervalSeconds = this.config.interval ? Number(this.config.interval) : 45;
    if (intervalSeconds < 10) {
      intervalSeconds = 10;
      (0, import_logger.writeLog)(
        "Configured polling interval was too short. Forced to minimum threshold of 10 seconds for protection.",
        "warn"
      );
    }
    if (intervalSeconds > 3600) {
      intervalSeconds = 3600;
      (0, import_logger.writeLog)(
        "Configured polling interval exceeded maximum boundary. Restricted to 3600 seconds to prevent overflow issues.",
        "warn"
      );
    }
    this.pollingInterval = this.setInterval(async () => {
      try {
        await this.updateData();
      } catch (error) {
        this.log.error(`Error during cyclic data retrieval loop: ${error.message}`);
      }
    }, intervalSeconds * 1e3);
    await this.setState("info.connection", true, true);
  }
  /**
   * Berechnet die Zeit bis Mitternacht und setzt NUR den heutigen Schreibzähler auf 0 zurück.
   */
  scheduleMidnightReset() {
    const now = /* @__PURE__ */ new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msToMidnight = night.getTime() - now.getTime();
    this.midnightTimer = this.setTimeout(() => {
      this.writeCyclesToday = 0;
      void this.setState((0, import_stateMapping.getDpPath)("write_cycles_today"), { val: 0, ack: true });
      this.scheduleMidnightReset();
    }, msToMidnight);
  }
  /**
   * Synchronizes a single state configuration parameter with the Luxtronik physical controller.
   *
   * @param mappingKey - The unique key identifier within the STATE_MAPPING structure.
   * @param val - The raw or parsed value to apply.
   * @returns A promise that resolves when the synchronization task finishes.
   */
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
        (0, import_logger.writeLog)(`Writing value directly into heat pump controller: ${mappingKey} = ${val}`, "info");
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
          await (0, import_rawFunctions.queueWrite)(this, writeId, valueToWrite);
          await new Promise((r) => global.setTimeout(r, 200));
        } catch (err) {
          (0, import_logger.writeLog)(
            `Failed to transmit ${mappingKey} to the heat pump hardware interface: ${err.message}`,
            "error"
          );
        }
      }
    }
  }
  /**
   * Safely updates an internal database state value only if the newly supplied value differs from the existing entry.
   *
   * @param id - The relative state path ID.
   * @param val - The updated value to process.
   * @param ack - Explicit acknowledgment flag status to set.
   * @returns A promise that resolves when the verification and write operation completes.
   */
  async setOwnStateIfDifferent(id, val, ack = false) {
    try {
      if (val === void 0) {
        return;
      }
      const state = await this.getStateAsync(id);
      if (!state || state.val !== val) {
        await this.setState(id, { val, ack });
        if (this.isDebugLogActive) {
          (0, import_logger.writeLog)(`Applying specific update for local state ${id}: ${val}`, "debug");
        }
      }
    } catch (err) {
      (0, import_logger.writeLog)(`Error occurred during setOwnStateIfDifferent operation for state ${id}: ${err.message}`, "error");
    }
  }
  /**
   * Configures fallback factory parameter baselines for the heat pump when in an idle state.
   *
   * @returns A promise that resolves when all default configuration tasks resolve.
   */
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
      (0, import_logger.writeLog)(`Failed to apply the baseline idle configuration defaults: ${err.message}`, "error");
    }
  }
  /**
   * Evaluates whether the current active operating state timestamp is older than ten minutes.
   *
   * @returns A promise that resolves to true if the state has remained unaltered for at least 10 minutes.
   */
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
  /**
   * Primary intelligent engine analyzing live telemetry values to execute continuous performance optimizations.
   * Manages dynamic heating curves, anti-cycling protective delays, and voltage scaling algorithms.
   *
   * @returns A promise that resolves when the execution cycle finishes.
   */
  async runOptimizationSchedule() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
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
            const actors = config.actors || [];
            const validActors = actors.filter(
              (a) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== ""
            );
            if (validActors.length > 0) {
              if (this.isDebugLogActive) {
                this.log.debug(
                  "[ZIP] Externe Aktoren gefunden. Starte Zirkulation synchron zur Warmwasserbereitung."
                );
              }
              await this.syncConfigValue("zip_aktiv", (_f = config.zip_aktiv_ww) != null ? _f : 120);
              await this.setOwnStateIfDifferent((0, import_stateMapping.getDpPath)("Activate_Zip"), true, false);
            }
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
        mitteltempState,
        thresholdHeatingLimitstate,
        heatingLimitState,
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
        this.getStateAsync((0, import_stateMapping.getDpPath)("Mitteltemperatur")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("thresholdHeatingLimit")),
        this.getStateAsync((0, import_stateMapping.getDpPath)("heatingLimit")),
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
      const mitteltemperatur = (_q = mitteltempState == null ? void 0 : mitteltempState.val) != null ? _q : 0;
      const thresholdHeatingLimit = (_r = thresholdHeatingLimitstate == null ? void 0 : thresholdHeatingLimitstate.val) != null ? _r : 0;
      const heatingLimit = (_s = heatingLimitState == null ? void 0 : heatingLimitState.val) != null ? _s : 0;
      const nachWasser = nachWasserState == null ? void 0 : nachWasserState.val;
      if (istHeizen) {
        if (config.regelung_aktiv !== false && aelterAls10 && vd1) {
          const fusspunkt = (_t = await this.getStateAsync((0, import_stateMapping.getDpPath)("heating_curve_parallel_offset"))) == null ? void 0 : _t.val;
          if (fusspunkt === 35) {
            const fallbackFusspunkt = (_u = config.fusspunkt) != null ? _u : 21.7;
            await this.syncConfigValue("heating_curve_parallel_offset", fallbackFusspunkt);
          }
        }
        if (config.zip_optimierung_aktiv !== false) {
          const now = Date.now();
          if (now - this.lastPumpOptimization > 6e5) {
            if (spreizung < 6.5 && hupAktiv > 5.5) {
              await this.syncConfigValue("heating_system_circ_pump_voltage_nominal", hupAktiv - 0.25);
              this.lastPumpOptimization = now;
              (0, import_logger.writeLog)(
                `Temperature spread too low (${spreizung}K). Scaling down HUP nominal target to ${hupAktiv - 0.25}V.`,
                "info"
              );
            } else if (spreizung > 7.5 && hupAktiv < 10) {
              await this.syncConfigValue("heating_system_circ_pump_voltage_nominal", hupAktiv + 0.25);
              this.lastPumpOptimization = now;
              (0, import_logger.writeLog)(
                `Temperature spread too high (${spreizung}K). Scaling up HUP nominal target to ${hupAktiv + 0.25}V.`,
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
            const fallbackHyst = (_v = config.sync_hotwater_temperature_hysteresis) != null ? _v : 2;
            await this.syncConfigValue("hotWaterTemperatureHysteresis", fallbackHyst);
          }
        }
      }
      if (istWarmwasser && nachWasser) {
        if (config.regelung_aktiv !== false) {
          if (heatingLimit === 1 && mitteltemperatur < thresholdHeatingLimit || heatingLimit === 0) {
            await this.syncConfigValue("heating_curve_parallel_offset", 35);
          }
        }
      }
      if (istLeerlauf) {
        if (config.zip_optimierung_aktiv !== false) {
          if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
            await (0, import_zipManager.stopZipAndDeaeration)(this);
          }
        }
        if (config.regelung_aktiv !== false) {
          if (wwSoll - wwIst >= wwHysterese - 1.5 && ruecklauf <= ruecklaufSoll && heatingStateStr !== "Heating limit") {
            await this.syncConfigValue("heating_curve_parallel_offset", 35);
          }
        }
      }
    } catch (err) {
      (0, import_logger.writeLog)(`Error occurred during runOptimizationSchedule loop execution: ${err.message}`, "error");
    }
  }
  /**
   * Fetches, parses, converts types, and populates live data registries over the configured TCP socket.
   * Dispatches calculation and history logging subroutines accordingly.
   *
   * @returns A promise that resolves when the internal update registers conclude.
   */
  async updateData() {
    if (this.updateRunning) {
      return;
    }
    this.updateRunning = true;
    try {
      const delayHelper = (ms) => new Promise((resolve) => this.setTimeout(resolve, ms));
      let rawParams = [];
      let rawValues = [];
      try {
        rawParams = await (0, import_rawFunctions.readAllRaw)(this, 3003);
        this.currentRawParams = rawParams;
      } catch (err) {
        this.log.debug(
          `Raw parameter acquisition response error (Command 3003): ${err instanceof Error ? err.message : String(err)}`
        );
      }
      await delayHelper(200);
      try {
        rawValues = await (0, import_rawFunctions.readAllRaw)(this, 3004);
      } catch (err) {
        this.log.debug(
          `Raw telemetry value acquisition response error (Command 3004): ${err instanceof Error ? err.message : String(err)}`
        );
      }
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
            value = definition.folder.startsWith("Settings") ? rawParams == null ? void 0 : rawParams[idx] : rawValues == null ? void 0 : rawValues[idx];
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
          let finalSeconds = Number(value);
          if (definition.isDurationFormat && key === "Time_WPein_akt" && finalSeconds === 1) {
            finalSeconds = 0;
          }
          if (definition.isDurationFormat) {
            value = (0, import_convert.formatTimerSecondsToTime)(finalSeconds);
          } else if (definition.role && ["value.datetime", "value.time", "date"].includes(definition.role)) {
            const totalSeconds = typeof value === "number" ? value : parseInt(value, 10);
            if (!isNaN(totalSeconds) && totalSeconds >= 0) {
              if (totalSeconds < 86400) {
                const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
                const m = Math.floor(totalSeconds % 3600 / 60).toString().padStart(2, "0");
                value = `${h}:${m}`;
              } else {
                value = new Date(totalSeconds * 1e3).toISOString().replace("T", " ").substring(0, 19);
              }
            }
          }
          let targetIoBrokerType = definition.type === "json" ? "string" : definition.type;
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
      (0, import_logger.writeLog)(
        `Communication error encountered (${this.errorCount}/${this.MAX_ERRORS}): ${err.message}`,
        "error"
      );
      if (this.errorCount >= this.MAX_ERRORS) {
        await this.setState("info.connection", { val: false, ack: true });
        (0, import_logger.writeLog)("Heat pump controller unreachable. Flagging connection status as disconnected.", "warn");
        (0, import_notificationManager.sendTelegramNotification)(
          this,
          "Heat pump controller unreachable. Flagging connection status as disconnected."
        );
      }
    } finally {
      this.updateRunning = false;
    }
  }
  /**
   * Callback issued by the ioBroker framework during adapter shutdown sequences.
   *
   * @param callback - Termination completion trigger function.
   */
  onUnload(callback) {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      if (this.zipTimer) {
        clearTimeout(this.zipTimer);
      }
      if (this.midnightTimer) {
        this.clearTimeout(this.midnightTimer);
      }
      void this.setState("info.connection", { val: false, ack: true });
      (0, import_logger.writeLog)(
        "Adapter is shutting down. Cleared all active intervals and terminated open socket configurations cleanly.",
        "info"
      );
      callback();
    } catch {
      callback();
    }
  }
  /**
   * Central observer callback executed whenever a subscribed state receives an update.
   *
   * @param id - The explicit full namespaced state identifier path.
   * @param state - The newly applied state context or null context if dropped.
   * @returns A promise that resolves when operations complete.
   */
  async onStateChange(id, state) {
    if (!state) {
      return;
    }
    const isMotionSensor = await (0, import_zipManager.checkAndHandleMotionSensor)(this, id, state);
    if (isMotionSensor) {
      return;
    }
    if (state.ack) {
      return;
    }
    if (id.startsWith(`${this.namespace}.Custom.`)) {
      try {
        const obj = await this.getObjectAsync(id);
        if (obj && obj.native && obj.native.source === "parameter") {
          const relativeId = id.replace(`${this.namespace}.`, "");
          await this.setState(relativeId, { val: state.val, ack: true });
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
                `Transmitting modified custom configuration parameter ${targetWriteId} to hardware layer with payload value ${valueToWrite}`,
                "info"
              );
            }
            await (0, import_rawFunctions.queueWrite)(this, targetWriteId, valueToWrite);
          }
        }
      } catch (err) {
        (0, import_logger.writeLog)(`Failed to compile custom value parameter adjustment payload write: ${err.message}`, "error");
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
      const relativeId = id.replace(`${this.namespace}.`, "");
      if (mappingKey === "Schreibe_Debug_Log") {
        await this.setState(relativeId, { val: state.val, ack: true });
        this.isDebugLogActive = state.val === true;
        (0, import_logger.setCustomDebug)(this.isDebugLogActive);
        (0, import_logger.writeLog)(
          `Extended debugging telemetry logging mode has been ${this.isDebugLogActive ? "enabled" : "disabled"}.`,
          "info"
        );
        return;
      }
      if (mappingKey === "Regelung_Aktiv" || mappingKey === "zip_aktiv") {
        await this.setState(relativeId, { val: state.val, ack: true });
        return;
      }
      if (mappingKey === "Setze_Vorgabewerte" && state.val === true) {
        await this.setState(relativeId, { val: false, ack: true });
        await this.setIdleDefaults();
        return;
      }
      if (mappingKey === "Dump_Raw_To_Log" && state.val === true) {
        await this.setState(relativeId, { val: false, ack: true });
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
          await this.setState(relativeId, { val: false, ack: true });
          await (0, import_zipManager.stopZipAndDeaeration)(this);
        }
        return;
      }
      if (!definition.luxWriteId || definition.write !== true) {
        return;
      }
      await this.setState(relativeId, { val: state.val, ack: true });
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
      await (0, import_rawFunctions.queueWrite)(this, parseInt(targetWriteId, 10), valueToWrite);
    } catch (err) {
      (0, import_logger.writeLog)(
        `Failed to finalize downstream state change command event pipeline execution loop: ${err.message}`,
        "error"
      );
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Luxtronik2Controller(options);
} else {
  (() => new Luxtronik2Controller())();
}
//# sourceMappingURL=main.js.map

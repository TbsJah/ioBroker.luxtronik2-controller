/*
 * Created with @iobroker/create-adapter v3.1.5
 */
import * as utils from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import { handleZwangsheizen, handleZwangswarmwasser } from './actionHandlers';
import { initAutoBackup, stopAutoBackup } from './backupManager';
import { formatTimerSecondsToTime, timeStringToSeconds } from './convert';
import { processCopData } from './copManager';
import { handleHupOptimization } from './hupManager';
import { initLogger, setCustomDebug, writeLog } from './logger';
import { ModbusManager } from './modbusManager';
import {
	checkAndSendErrorNotifications,
	checkAndSendOutageNotifications,
	handleTestMessage,
	sendTelegramNotification,
} from './notificationManager';
import {
	cleanupCustomStates,
	cleanupEmptyFolders,
	cleanupStates,
	ensureAllObjectsExist,
	ensureCustomObjectsExist,
	isStateEnabled,
} from './objectManager';
import {
	evaluatePvBoost,
	forceResetPvBoost,
	handlePvCycleCheck,
	handlePvFeedInChange,
	initPvManagement,
	pvIsBoostActive,
	pvWaitingForCycleEnd,
} from './pvManager';

import { dumpAllRawToLog, queueWrite, readAllRaw } from './rawFunctions';
import { STATE_MAPPING, getDpPath } from './stateMapping';
import { generateHeatCurveSVG } from './svgGenerator';
import type { LuxtronikAdapter } from './types';
import { checkFirmwareUpdate } from './updateManager';
import {
	calculateTemperatureSpread,
	calculateTotalEnergy,
	calculateTotalThermalEnergy,
	updateCustomStates,
	updateErrorHistory,
	updateOutageHistory,
	updateStatusStrings,
	updateSystemInfos,
	updateTimerTables,
} from './virtualStates';
import {
	checkAndHandleMotionSensor,
	disableHardwareZipTimer,
	handleActivateZip,
	stopZipAndDeaeration,
	subscribeMotionSensors,
} from './zipManager';

/**
 * Main class for the Luxtronik2 Controller ioBroker Adapter.
 */
class Luxtronik2Controller extends utils.Adapter implements LuxtronikAdapter {
	/** Set of all active namespaced state IDs created or managed by the adapter */
	public createdStates: Set<string> = new Set<string>();
	/** ioBroker timeout handle for the hot water circulation pump macro */
	public zipTimer?: ioBroker.Timeout;
	/** Cached copy of the original circulation pump settings before macro activation */
	public originalZipConfig: Record<string, any> | null = null;
	/** Unix timestamp of the last error dispatched to prevent duplicate notification triggers */
	public lastKnownErrorTimestamp: number | null = null;
	/** Determines whether verbose debugging output is enabled */
	public isDebugLogActive: boolean = false;
	//* Known Visibilities */
	public currentVisibilities: number[] = [];
	// Cache für den globalen Schreibschutz
	public currentRawParams: number[] = [];
	/** ioBroker interval handle for the main data polling loop */
	private pollingInterval: ioBroker.Interval | undefined;
	/** Cache for the last evaluated heat pump operating state code */
	private lastBzVal: string = '';
	/** Lock flag preventing concurrent execution of the polling updates */
	public updateRunning: boolean = false;
	/** Timestamp tracking the last dynamic pump voltage optimization execution */
	private lastPumpOptimization: number = 0;
	/** Merkt sich, ob Takt-Optimierung oder Zwangsheizen aktuell einen temporären Heiz-Offset hält */
	public forcedHeatingBoostActive: boolean = false;
	/** Internal array storing pending serial hardware write tasks */
	public writeQueue: (() => Promise<void>)[] = [];
	/** Lock flag indicating that the write queue is currently being processed */
	public isWriting: boolean = false;
	/** Counter tracking sequential communication timeouts/failures */
	private errorCount: number = 0;
	/** Maximum allowed sequential request failures before connection is flagged as interrupted */
	private readonly MAX_ERRORS: number = 3;
	public writeCyclesToday: number = 0;
	public writeCyclesTotal: number = 0;
	private midnightTimer?: ioBroker.Timeout;
	/** Modbus Manager für hybride Schreib- und Lesevorgänge (SmartGrid / Vorlauf / ZIP) */
	public modbusManager!: ModbusManager;
	/** ioBroker interval handle for the ZIP remaining time countdown */
	public zipCountdownInterval?: ioBroker.Interval;
	/** Target timestamp when the current ZIP run finishes */
	public zipEndTime?: number;
	/** Cron-Job Handle für die Firmware-Update-Prüfung */
	public updateCronJob?: schedule.Job;
	/** Merker für Heizgrund */
	private forcedHeatingReason: string = '';
	/** Merkt sich den ursprünglichen WW-Sollwert, falls forceSoll temporär erhöht hat */
	public forcedWwOriginalTarget: number | null = null;

	/**
	 * Initializes a new instance of the Luxtronik2Controller class.
	 *
	 * @param options - Optional core configuration overrides passed by the ioBroker host.
	 */
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'luxtronik2-controller',
		});
		initLogger(this);

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('unload', this.onUnload.bind(this));
		this.on('message', this.onMessage.bind(this));
	}

	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (obj.command === 'testTelegram') {
			await handleTestMessage(this, obj);
		} else if (obj.command === 'getHeatCurve') {
			try {
				let fp = 21.7;
				let ep = 23.0;

				if (obj.message && typeof obj.message === 'object') {
					const msg = obj.message as Record<string, any>;
					if (msg.fusspunkt !== undefined) {
						fp = parseFloat(msg.fusspunkt);
					}
					if (msg.endpunkt !== undefined) {
						ep = parseFloat(msg.endpunkt);
					}
				}

				if (isNaN(fp)) {
					fp = 21.7;
				}
				if (isNaN(ep)) {
					ep = 23.0;
				}

				const svg = generateHeatCurveSVG(fp, ep);
				const base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

				if (obj.callback) {
					this.sendTo(obj.from, obj.command, base64, obj.callback);
				}
			} catch (err: any) {
				this.log.error(`Error generating heat curve: ${err.message}`);
			}
		}
	}

	/**
	 * Callback executed once the ioBroker host framework completely initializes the adapter subsystem.
	 * Sets up database objects, applies configurations, subscribes to states, and triggers the polling loop.
	 *
	 * @returns A promise that resolves when initialization completes.
	 */
	private async onReady(): Promise<void> {
		const config = this.config as Record<string, any>;

		// =========================================================
		// MIGRATION: ZIP Control Mode & Operation Mode (Bestandsnutzer)
		// =========================================================
		let configUpdated = false;
		if (config.zip_control_mode === undefined) {
			let migratedMode = 'controller';

			const actors = config.actors || [];
			const validActors = actors.filter(
				(a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '',
			);

			if (validActors.length > 0) {
				migratedMode = 'actor';
			} else if (config.modbus_active && config.sync_modbus_coil_7) {
				migratedMode = 'modbus';
			}

			config.zip_control_mode = migratedMode;
			configUpdated = true;
			writeLog(`[Migration] Updated zip_control_mode to '${migratedMode}' based on legacy settings.`, 'info');
		}

		if (config.operation_mode === undefined) {
			if (config.modbus_active === true) {
				config.operation_mode = 'modbus';
			} else if (
				config.idle_defaults_aktiv === true ||
				config.regelung_aktiv === true ||
				config.hup_optimierung_aktiv === true ||
				config.pv_active === true ||
				config.zip_optimierung_aktiv === true
			) {
				config.operation_mode = 'native';
			} else {
				config.operation_mode = 'readonly';
			}
			configUpdated = true;
			writeLog(`[Migration] Set operation_mode to '${config.operation_mode}' based on legacy settings.`, 'info');
		}

		const shouldModbusBeActive = config.operation_mode === 'modbus';
		if (config.modbus_active !== shouldModbusBeActive) {
			config.modbus_active = shouldModbusBeActive;
			configUpdated = true;
		}

		if (configUpdated) {
			try {
				const obj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
				if (obj && obj.native) {
					obj.native.zip_control_mode = config.zip_control_mode;
					obj.native.operation_mode = config.operation_mode;
					obj.native.modbus_active = config.modbus_active;
					await this.setForeignObject(`system.adapter.${this.namespace}`, obj);
				}
			} catch (err: any) {
				writeLog(`[Migration] Failed to save updated config: ${err.message}`, 'error');
			}
		}
		// =========================================================

		const ip = config.host;
		const port = config.port || 8889;

		await this.setState('info.connection', { val: false, ack: true });
		writeLog(`Connecting to heat pump at ${ip}:${port}...`, 'info');

		if (config.filter_visibility !== false) {
			try {
				this.currentVisibilities = await readAllRaw(this, 3005);
				if (this.isDebugLogActive) {
					writeLog(
						`Successfully loaded ${this.currentVisibilities.length} visibility flags from heat pump.`,
						'debug',
					);
				}
			} catch (err: any) {
				writeLog(
					`Could not load visibility flags (Command 3005). Assuming all parameters are visible. Error: ${err.message}`,
					'warn',
				);
				this.currentVisibilities = [];
			}
		} else {
			this.currentVisibilities = [];
		}

		await cleanupStates(this);
		await cleanupCustomStates(this);
		await cleanupEmptyFolders(this);
		await ensureAllObjectsExist(this);
		await ensureCustomObjectsExist(this);
		initAutoBackup(this);
		await this.subscribeStatesAsync('Information.12_SystemInfo.check_firmware');

		const isReadOnly = config.operation_mode === 'readonly';

		if (isReadOnly) {
			writeLog(
				'🔒 Operating Mode: READ-ONLY. All hardware write operations and optimizations are disabled.',
				'info',
			);
			await this.setState(getDpPath('Regelung_Aktiv'), { val: false, ack: true });
		} else if (config.operation_mode === 'modbus') {
			writeLog('⚡ Operating Mode: READ/WRITE WITH MODBUS TCP (Hybrid).', 'info');
			await this.setState(getDpPath('Regelung_Aktiv'), { val: config.regelung_aktiv === true, ack: true });
		} else {
			writeLog('✍️ Operating Mode: READ/WRITE WITHOUT MODBUS (Native TCP Port 8889).', 'info');
			await this.setState(getDpPath('Regelung_Aktiv'), { val: config.regelung_aktiv === true, ack: true });
		}

		const debugState = await this.getStateAsync(getDpPath('Schreibe_Debug_Log'));
		this.isDebugLogActive = debugState?.val === true;
		setCustomDebug(this.isDebugLogActive);

		const cycleTodayState = await this.getStateAsync(getDpPath('write_cycles_today'));
		this.writeCyclesToday = cycleTodayState && typeof cycleTodayState.val === 'number' ? cycleTodayState.val : 0;

		const cycleTotalState = await this.getStateAsync(getDpPath('write_cycles_total'));
		this.writeCyclesTotal = cycleTotalState && typeof cycleTotalState.val === 'number' ? cycleTotalState.val : 0;

		this.scheduleMidnightReset();

		// --- MODBUS HYBRID INITIALISIERUNG (Vor ZIP-Init, PV-Init und updateData!) ---
		this.modbusManager = new ModbusManager(this);
		if (!isReadOnly && config.modbus_active) {
			writeLog('Checking Modbus TCP availability for hybrid operations...', 'info');
			await this.modbusManager.checkAvailability();
		}

		if (!isReadOnly) {
			subscribeMotionSensors(this);
			await initPvManagement(this);
		}

		this.subscribeStates('*');

		try {
			await this.updateData();
			if (!isReadOnly) {
				await disableHardwareZipTimer(this);
			}
		} catch (error: any) {
			this.log.error(`Initial data retrieval failed (device offline?): ${error.message}`);
		}

		const dpActivateZip = getDpPath('Activate_Zip');
		if (dpActivateZip) {
			await this.setState(dpActivateZip, { val: false, ack: true });
		}

		const dpVirtualZipStatus = getDpPath('Virtual_ZIP_Status');
		if (dpVirtualZipStatus) {
			await this.setState(dpVirtualZipStatus, { val: false, ack: true });
		}

		const dpVirtualZipRemaining = getDpPath('Virtual_ZIP_Remaining_Time');
		if (dpVirtualZipRemaining) {
			await this.setState(dpVirtualZipRemaining, { val: 0, ack: true });
		}

		let intervalSeconds = this.config.interval ? Number(this.config.interval) : 45;
		if (intervalSeconds < 10) {
			intervalSeconds = 10;
			writeLog(
				'Configured polling interval was too short. Forced to minimum threshold of 10 seconds for protection.',
				'warn',
			);
		}
		if (intervalSeconds > 3600) {
			intervalSeconds = 3600;
			writeLog(
				'Configured polling interval exceeded maximum boundary. Restricted to 3600 seconds to prevent overflow issues.',
				'warn',
			);
		}

		if (config.update_check_active === true) {
			this.setTimeout(() => {
				void checkFirmwareUpdate(this);
			}, 15000);

			const cronString = config.update_check_cron || '0 12 * * *';
			try {
				this.updateCronJob = schedule.scheduleJob(cronString, () => {
					this.log.info('Führe geplante Firmware-Update-Prüfung aus (Cron)...');
					void checkFirmwareUpdate(this);
				});
			} catch (err: any) {
				this.log.error(`Fehler beim Einrichten des Firmware-Update-Crons (${cronString}): ${err.message}`);
			}
		}

		this.pollingInterval = this.setInterval(async () => {
			try {
				await this.updateData();
			} catch (error: any) {
				this.log.error(`Error during cyclic data retrieval loop: ${error.message}`);
			}
		}, intervalSeconds * 1000);
	}

	/**
	 * Berechnet die Zeit bis Mitternacht und setzt NUR den heutigen Schreibzähler auf 0 zurück.
	 */
	private scheduleMidnightReset(): void {
		const now = new Date();
		const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
		const msToMidnight = night.getTime() - now.getTime();

		this.midnightTimer = this.setTimeout(() => {
			this.writeCyclesToday = 0;
			void this.setState(getDpPath('write_cycles_today'), { val: 0, ack: true });
			this.scheduleMidnightReset();
		}, msToMidnight);
	}

	/**
	 * Synchronizes a single state configuration parameter with the Luxtronik physical controller.
	 * Automatically routes via Modbus TCP if hybrid mode is enabled for the target datapoint.
	 *
	 * @param mappingKey - The unique key identifier within the STATE_MAPPING structure.
	 * @param val - The raw or parsed value to apply.
	 * @returns A promise that resolves when the synchronization task finishes.
	 */
	public async syncConfigValue(mappingKey: keyof typeof STATE_MAPPING, val: any): Promise<void> {
		const config = this.config as Record<string, any>;
		if (config.operation_mode === 'readonly') {
			return;
		}
		if (val === undefined || val === null) {
			return;
		}
		const definition = STATE_MAPPING[mappingKey];
		if (!definition) {
			return;
		}

		const id = getDpPath(mappingKey);
		const state = await this.getStateAsync(id);

		let appliedFactor = definition.factor;
		if (
			mappingKey === 'heating_system_circ_pump_voltage_nominal' ||
			mappingKey === 'heating_system_circ_pump_voltage_minimal'
		) {
			appliedFactor = config.hup_voltage_factor !== undefined ? Number(config.hup_voltage_factor) : 100;
		}

		let valueToWrite: any = val;
		if (typeof valueToWrite === 'boolean') {
			valueToWrite = valueToWrite ? 1 : 0;
		} else if (appliedFactor && typeof val === 'number') {
			valueToWrite = val * appliedFactor;
		}

		const isRawWrite =
			definition.dataSource === 'raw_parameter' ||
			definition.dataSource === 'raw_value' ||
			(!definition.dataSource && /^\d+$/.test(definition.luxWriteId || ''));
		if (isRawWrite && definition.unit === '°C' && typeof val === 'number' && !appliedFactor) {
			valueToWrite = val * 10;
		}

		const isModbusEnabled = Boolean(
			this.modbusManager &&
			this.modbusManager.isAvailable &&
			config.modbus_active &&
			definition.modbus &&
			config[definition.modbus.configKey] === true,
		);

		const writeId = definition.luxWriteId ? parseInt(definition.luxWriteId, 10) : NaN;
		// FIX: hardwareOutOfSync NUR prüfen, wenn der Wert NICHT über Modbus (flüchtiges RAM) läuft!
		const hardwareOutOfSync =
			!isModbusEnabled &&
			!definition.isVirtual &&
			!isNaN(writeId) &&
			writeId < 9990 &&
			this.currentRawParams.length > writeId &&
			this.currentRawParams[writeId] !== Math.round(Number(valueToWrite));

		if (!state || state.val !== val || hardwareOutOfSync) {
			await this.setState(id, { val: val, ack: true });

			if (this.isDebugLogActive) {
				writeLog(`Writing value directly into heat pump controller: ${mappingKey} = ${val}`, 'info');
			}

			if ((definition.write === true || isModbusEnabled) && !definition.isVirtual && definition.luxWriteId) {
				try {
					if (isModbusEnabled && definition.modbus) {
						const isCoil = definition.modbus.type === 'coil';
						await this.modbusManager.writeRegister(
							definition.modbus.register,
							Number(valueToWrite),
							isCoil,
						);
					} else if (!isNaN(writeId) && writeId < 9990) {
						await queueWrite(this, writeId, valueToWrite);
					}
					await new Promise(r => global.setTimeout(r, 200));
				} catch (err: any) {
					writeLog(
						`Failed to transmit ${mappingKey} to the heat pump hardware interface: ${err.message}`,
						'error',
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
	public async setOwnStateIfDifferent(id: string, val: any, ack = false): Promise<void> {
		try {
			if (val === undefined) {
				return;
			}
			const state = await this.getStateAsync(id);
			if (!state || state.val !== val) {
				await this.setState(id, { val: val, ack: ack });
				if (this.isDebugLogActive) {
					writeLog(`Applying specific update for local state ${id}: ${val}`, 'debug');
				}
			}
		} catch (err: any) {
			writeLog(`Error occurred during setOwnStateIfDifferent operation for state ${id}: ${err.message}`, 'error');
		}
	}

	/**
	 * Prüft, ob das moderne V3.9x Smart Home Interface (SHI) per Modbus TCP aktiv und erreichbar ist.
	 */
	private isShiModbusActive(): boolean {
		const config = this.config as Record<string, any>;
		return Boolean(
			config.operation_mode !== 'readonly' &&
			config.modbus_active &&
			this.modbusManager &&
			this.modbusManager.isAvailable &&
			this.modbusManager.protocolVersion === 'shi' &&
			config.sync_modbus_holding_23 === true,
		);
	}

	/**
	 * Configures fallback factory parameter baselines for the heat pump when in an idle state.
	 *
	 * @returns A promise that resolves when all default configuration tasks resolve.
	 */
	private async setIdleDefaults(): Promise<void> {
		try {
			this.forcedWwOriginalTarget = null;
			const config = this.config as Record<string, any>;
			const isPvControlling = pvIsBoostActive && !pvWaitingForCycleEnd;

			// Im SHI-Modus verändert der Adapter Endpunkt & Fußpunkt nicht;
			// beide Parameter haben kein flüchtiges SHI-Register -> unnötige EEPROM-Writes vermeiden.
			if (!this.isShiModbusActive()) {
				await this.syncConfigValue('heating_curve_end_point', config.endpunkt ?? 23);
				await this.syncConfigValue('heating_curve_parallel_offset', config.fusspunkt ?? 21.7);
			}

			if (config.hup_optimierung_aktiv === true) {
				await this.syncConfigValue(
					'heating_system_circ_pump_voltage_minimal',
					config.sync_heating_system_circ_pump_voltage_minimal_heating ?? 3,
				);
				await this.syncConfigValue(
					'heating_system_circ_pump_voltage_nominal',
					config.sync_heating_system_circ_pump_voltage_nominal_heating ?? 7,
				);
			}

			await this.syncConfigValue('returnTemperatureHysteresis', config.sync_return_temperature_hysteresis ?? 1.5);
			await this.syncConfigValue('zip_aktiv', config.zip_aktiv ?? 0);
			await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);

			if (isPvControlling) {
				// Kein Umweg über Basiswert -> evaluatePvBoost setzt direkt PV- bzw. Basiswerte ohne Flip-Flop
				this.forcedHeatingBoostActive = false;
				this.forcedHeatingReason = '';
				await evaluatePvBoost(this, true);
			} else {
				const baseOffset = parseFloat(String(config.sync_heating_temperature ?? 0).replace(',', '.')) || 0;
				const baseWw =
					parseFloat(String(config.sync_warmwater_target_temperature ?? 54).replace(',', '.')) || 54;
				await this.resetForcedHeatingBoost(false);
				await this.syncConfigValue('heating_temperature', baseOffset);
				await this.syncConfigValue('temperature_hot_water_target', baseWw);
			}
		} catch (err: any) {
			writeLog(`Failed to apply the baseline idle configuration defaults: ${err.message}`, 'error');
		}
	}

	/**
	 * Prüft, ob die Heizung aktuell generell heizen darf (nicht Aus/Urlaub, nicht Heizgrenze/Frostschutz).
	 *
	 * @param rawValues - Aktuelle Rohwerte (CMD 3004).
	 * @param rawParams - Aktuelle Rohparameter (CMD 3003).
	 * @param isHeatingAllowedByLimit - Ergebnis der konfigurierten Heizgrenzen-Prüfung.
	 * @returns true, wenn Heizen erlaubt ist.
	 */
	private isHeatingAllowed(rawValues: number[], rawParams: number[], isHeatingAllowedByLimit: boolean): boolean {
		if (!isHeatingAllowedByLimit) {
			return false;
		}
		// P0003: 3 = Urlaub, 4 = Aus
		const heatingOpMode = rawParams[3];
		if (heatingOpMode === 3 || heatingOpMode === 4) {
			return false;
		}
		// C0125 (opStateHeating): 0 = Abgesenkt, 1 = Normal, 2 = Heizgrenze, 3 = Aus, 4 = Frostschutz
		const opStateHeating = rawValues[125];
		if (opStateHeating === 2 || opStateHeating === 3 || opStateHeating === 4) {
			return false;
		}
		return true;
	}

	/**
	 * Prüft anhand der Luxtronik-WW-Zeitschaltuhr (P405..P505 = Sperrzeiten),
	 * ob Warmwasser zum angegebenen Zeitpunkt gesperrt ist (inkl. Mitternachts-Übergang).
	 *
	 * @param rawParams - Aktuelle Rohparameter (CMD 3003).
	 * @param targetDate - Zu prüfender Zeitpunkt.
	 * @returns true, wenn zu diesem Zeitpunkt eine WW-Sperrzeit aktiv ist.
	 */
	private isHotWaterLockedAt(rawParams: number[], targetDate: Date): boolean {
		if (!rawParams || rawParams.length <= 505) {
			return false;
		}

		const tableMode = rawParams[405] ?? 0; // 0 = Woche, 1 = 5+2, 2 = Tage (So..Sa)
		const dayOfWeek = targetDate.getDay(); // 0 = Sonntag .. 6 = Samstag
		const prevDayOfWeek = (dayOfWeek + 6) % 7;
		const secOfDay = targetDate.getHours() * 3600 + targetDate.getMinutes() * 60 + targetDate.getSeconds();

		const getBaseIndex = (day: number): number => {
			if (tableMode === 1) {
				return day >= 1 && day <= 5 ? 416 : 426;
			}
			if (tableMode === 2) {
				return 436 + day * 10;
			}
			return 406;
		};

		// 1. Slots des aktuellen Tages prüfen
		const todayBase = getBaseIndex(dayOfWeek);
		for (let i = 0; i < 5; i++) {
			const start = rawParams[todayBase + i * 2];
			const end = rawParams[todayBase + i * 2 + 1];
			if (start === undefined || end === undefined || start === end) {
				continue;
			}
			if (start < end) {
				if (secOfDay >= start && secOfDay < end) {
					return true;
				}
			} else {
				// Sperrzeit über Mitternacht (z.B. 22:00 - 06:00)
				if (secOfDay >= start) {
					return true;
				}
			}
		}

		// 2. Überhängende Mitternachts-Slots des Vortages prüfen
		const prevBase = getBaseIndex(prevDayOfWeek);
		for (let i = 0; i < 5; i++) {
			const start = rawParams[prevBase + i * 2];
			const end = rawParams[prevBase + i * 2 + 1];
			if (start === undefined || end === undefined || start <= end) {
				continue;
			}
			if (secOfDay < end) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Prüft, ob Warmwasser aktuell (leadMinutes = 0) oder in X Minuten freigegeben ist.
	 *
	 * @param rawValues - Aktuelle Rohwerte (CMD 3004).
	 * @param rawParams - Aktuelle Rohparameter (CMD 3003).
	 * @param leadMinutes - Vorschau in Minuten (0 = jetzt sofort, z.B. 25 = Vorheiz-Check).
	 * @returns true, wenn Warmwasser erlaubt ist.
	 */
	private isHotWaterAllowed(rawValues: number[], rawParams: number[], leadMinutes = 0): boolean {
		// P0004: 2 = Party (ignoriert Sperrzeiten), 3 = Urlaub, 4 = Aus
		const wwOpMode = rawParams[4];
		if (wwOpMode === 3 || wwOpMode === 4) {
			return false;
		}
		if (wwOpMode === 2) {
			return true;
		}

		// Sofort-Prüfung: Live-Reglerstatus aus C0124 nutzen (0 = Sperrzeit, 1 = Frei, 3 = Aus)
		if (leadMinutes <= 0) {
			const opStateWw = rawValues[124];
			if (opStateWw !== undefined) {
				return opStateWw !== 0 && opStateWw !== 3;
			}
		}

		const targetDate = new Date(Date.now() + leadMinutes * 60000);
		return !this.isHotWaterLockedAt(rawParams, targetDate);
	}

	/**
	 * Aktiviert eine temporäre Heizungsanhebung (Takt-Optimierung, Vorheizen oder Zwangsheizen)
	 * über die Parallelverschiebung (`heating_temperature`) mit automatischem, relativem Offset.
	 *
	 * @param reason - Optionaler Kontext für das Debug-Log.
	 * @param deltaK - Relative Anhebung in Kelvin über dem Basis-Offset (z.B. Hysterese + 0.5 K).
	 */
	public async activateForcedHeatingBoost(reason = 'CycleOpt', deltaK = 2.0): Promise<void> {
		this.forcedHeatingReason = reason;
		const config = this.config as Record<string, any>;
		const baseOffset = parseFloat(String(config.sync_heating_temperature ?? 0).replace(',', '.')) || 0;
		const maxAllowedOffset = this.isShiModbusActive() ? 10.0 : 5.0;

		let targetOffset = Math.round((baseOffset + Math.max(0.5, deltaK)) * 10) / 10;
		targetOffset = Math.min(targetOffset, maxAllowedOffset);

		// Aktiven höheren PV-Boost nicht nach unten überschreiben
		if (pvIsBoostActive) {
			const currentState = await this.getStateAsync(getDpPath('heating_temperature'));
			if (typeof currentState?.val === 'number' && currentState.val > targetOffset) {
				targetOffset = currentState.val;
			}
		}

		const currentHeatingState = await this.getStateAsync(getDpPath('heating_temperature'));
		if (this.forcedHeatingBoostActive && currentHeatingState?.val === targetOffset) {
			return;
		}

		this.forcedHeatingBoostActive = true;
		await this.syncConfigValue('heating_temperature', targetOffset);

		if (this.isDebugLogActive) {
			writeLog(
				`[${reason}] Setting dynamic heating offset to +${targetOffset} K (base: ${baseOffset} K, delta: +${deltaK} K, SHI: ${this.isShiModbusActive()}).`,
				'info',
			);
		}
	}

	/**
	 * Setzt eine aktive temporäre Heizungsanhebung sauber auf den Basis-Offset zurück
	 * und stellt einen eventuell aktiven PV-Boost wieder her.
	 *
	 * @param reapplyPv - Stellt bei aktivem PV-Boost dessen Sollwert im Anschluss sofort wieder her.
	 */
	public async resetForcedHeatingBoost(reapplyPv = true): Promise<void> {
		if (!this.forcedHeatingBoostActive) {
			return;
		}
		this.forcedHeatingBoostActive = false;
		this.forcedHeatingReason = '';

		if (reapplyPv && pvIsBoostActive && !pvWaitingForCycleEnd) {
			await evaluatePvBoost(this, true);
			return;
		}

		const config = this.config as Record<string, any>;
		const baseOffset = parseFloat(String(config.sync_heating_temperature ?? 0).replace(',', '.')) || 0;

		await this.syncConfigValue('heating_temperature', baseOffset);
		if (this.isDebugLogActive) {
			writeLog(`[CycleOpt] Resetting temporary heating offset back to ${baseOffset} K.`, 'info');
		}
	}

	/**
	 * Setzt eine temporäre WW-Anhebung (z.B. durch forceSoll) nach dem WW-Takt zurück,
	 * ohne einen aktiven PV-Boost unnötig umzuschalten.
	 */
	private async restoreForcedWwTarget(): Promise<void> {
		const config = this.config as Record<string, any>;
		const fallbackWw = parseFloat(String(config.sync_warmwater_target_temperature ?? 54).replace(',', '.')) || 54;
		const targetWw = this.forcedWwOriginalTarget ?? fallbackWw;
		this.forcedWwOriginalTarget = null;

		if (pvIsBoostActive && !pvWaitingForCycleEnd) {
			await evaluatePvBoost(this, true);
			return;
		}

		await this.syncConfigValue('temperature_hot_water_target', targetWw);
	}

	/**
	 * Prüft, ob der aktuelle Betriebszustand (WP_BZ_akt) mindestens `minutes` Minuten anliegt.
	 *
	 * @param minutes - Mindestdauer in Minuten.
	 * @param rawValues - Optionale Rohwerte (CMD 3004) zur Auswertung der Verweildauer (Index 120).
	 * @returns true, wenn die letzte Änderung mindestens `minutes` Minuten zurückliegt.
	 */
	private async istBetriebszustandAelterAls(minutes: number, rawValues: number[] = []): Promise<boolean> {
		try {
			const controllerSec = rawValues[120];
			if (typeof controllerSec === 'number' && controllerSec > 0 && controllerSec / 60 >= minutes) {
				return true;
			}
			const state = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const lastChange = state?.lc ?? 0;
			return (Date.now() - lastChange) / 60000 >= minutes;
		} catch {
			return false;
		}
	}

	/**
	 * Primary intelligent engine analyzing live telemetry values to execute continuous performance optimizations.
	 * Manages dynamic heating curves, anti-cycling protective delays, and voltage scaling algorithms.
	 *
	 * @param rawValues - Optional raw telemetry values array from command 3004 as fallback.
	 * @param rawParams - Optional raw parameters array from command 3003 as fallback.
	 * @returns A promise that resolves when the execution cycle finishes.
	 */
	private async runOptimizationSchedule(rawValues: number[] = [], rawParams: number[] = []): Promise<void> {
		try {
			const config = this.config as Record<string, any>;
			if (config.operation_mode === 'readonly') {
				return;
			}

			const effectiveParams = rawParams.length > 0 ? rawParams : this.currentRawParams;
			const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const bzVal =
				bzState && bzState.val !== null
					? String(bzState.val).trim()
					: rawValues[80] !== undefined
						? String(rawValues[80])
						: '';

			const regelungAktivState = await this.getStateAsync(getDpPath('Regelung_Aktiv'));
			const isRegelungAktiv = regelungAktivState?.val === true;

			const istHeizen = bzVal === '0';
			const istWarmwasser = bzVal === '1';
			const istAbtauen = bzVal === '4';
			const istLeerlauf = bzVal === '5';

			if (!istHeizen && !istWarmwasser && !istLeerlauf && !istAbtauen) {
				return;
			}

			if (bzVal !== this.lastBzVal) {
				if (istLeerlauf) {
					if (config.idle_defaults_aktiv === true) {
						await this.setIdleDefaults();
					} else {
						if (this.forcedHeatingBoostActive) {
							await this.resetForcedHeatingBoost();
						}
						if (this.forcedWwOriginalTarget !== null) {
							await this.restoreForcedWwTarget();
						}
					}
				} else if (istHeizen) {
					if (
						this.lastBzVal === '1' &&
						(config.idle_defaults_aktiv === true || this.forcedWwOriginalTarget !== null)
					) {
						await this.restoreForcedWwTarget();
					}

					if (config.zip_optimierung_aktiv === true) {
						await this.syncConfigValue('zip_aktiv', config.zip_aktiv ?? 0);
					}
					if (config.hup_optimierung_aktiv === true) {
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_minimal',
							config.sync_heating_system_circ_pump_voltage_minimal_heating ?? 3,
						);
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_nominal',
							config.sync_heating_system_circ_pump_voltage_nominal_heating ?? 7,
						);
					}
					if (isRegelungAktiv) {
						await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);
					}
				} else if (istWarmwasser) {
					const nachWasserTransition = await this.getStateAsync(getDpPath('Heizen_nach_Wasser'));
					if (!nachWasserTransition?.val && this.forcedHeatingBoostActive) {
						await this.resetForcedHeatingBoost();
					}
					if (config.zip_optimierung_aktiv === true) {
						const mode = config.zip_control_mode || 'controller';
						const actors = config.actors || [];
						const validActors = actors.filter(
							(a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '',
						);

						const canRunWearFree =
							(mode === 'actor' && validActors.length > 0) ||
							(mode === 'modbus' && this.modbusManager?.isAvailable);

						if (canRunWearFree) {
							if (this.isDebugLogActive) {
								this.log.debug(
									`[ZIP] Wear-free mode (${mode}) active. Starting circulation synchronous to hot water generation.`,
								);
							}
							await this.syncConfigValue('zip_aktiv', config.zip_aktiv_ww ?? 120);
							await this.setOwnStateIfDifferent(getDpPath('Activate_Zip'), true, false);
						}
					}

					if (config.hup_optimierung_aktiv === true) {
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_minimal',
							config.sync_heating_system_circ_pump_voltage_minimal_water ?? 3,
						);
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_nominal',
							config.sync_heating_system_circ_pump_voltage_nominal_water ?? 10,
						);
					}
				}
				this.lastBzVal = bzVal;
			}

			const [
				wwSollState,
				wwTargetParamState,
				wwIstState,
				ruecklaufState,
				spreizungState,
				vd1State,
				wwHystereseState,
				ruecklaufSollState,
				currentHupVoltState,
				heizenHystereseState,
				nachWasserState,
				mitteltempState,
				thresholdHeatingLimitState,
				heatingLimitState,
				aelterAls10,
				aelterAls3,
			] = await Promise.all([
				this.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
				this.getStateAsync(getDpPath('temperature_hot_water_target')),
				this.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
				this.getStateAsync(getDpPath('temperature_return')),
				this.getStateAsync(getDpPath('spreizung_vorlauf_ruecklauf')),
				this.getStateAsync(getDpPath('VD1out')),
				this.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
				this.getStateAsync(getDpPath('temperature_target_return')),
				this.getStateAsync(getDpPath('heating_system_circ_pump_voltage_nominal')),
				this.getStateAsync(getDpPath('returnTemperatureHysteresis')),
				this.getStateAsync(getDpPath('Heizen_nach_Wasser')),
				this.getStateAsync(getDpPath('Mitteltemperatur')),
				this.getStateAsync(getDpPath('thresholdHeatingLimit')),
				this.getStateAsync(getDpPath('heatingLimit')),
				this.istBetriebszustandAelterAls(10, rawValues),
				this.istBetriebszustandAelterAls(3, rawValues),
			]);

			const wwSoll =
				typeof wwSollState?.val === 'number'
					? wwSollState.val
					: typeof wwTargetParamState?.val === 'number'
						? wwTargetParamState.val
						: rawValues[18] !== undefined
							? rawValues[18] / 10
							: effectiveParams[105] !== undefined
								? effectiveParams[105] / 10
								: 54;
			const wwIst =
				typeof wwIstState?.val === 'number'
					? wwIstState.val
					: rawValues[17] !== undefined
						? rawValues[17] / 10
						: 0;
			const ruecklauf =
				typeof ruecklaufState?.val === 'number'
					? ruecklaufState.val
					: rawValues[11] !== undefined
						? rawValues[11] / 10
						: 0;
			const ruecklaufSoll =
				typeof ruecklaufSollState?.val === 'number'
					? ruecklaufSollState.val
					: rawValues[12] !== undefined
						? rawValues[12] / 10
						: 0;
			const spreizung =
				typeof spreizungState?.val === 'number'
					? spreizungState.val
					: rawValues[10] !== undefined && rawValues[11] !== undefined
						? (rawValues[10] - rawValues[11]) / 10
						: 0;

			const vd1 =
				vd1State?.val !== undefined && vd1State?.val !== null
					? vd1State.val === 1 || vd1State.val === true || String(vd1State.val).toLowerCase() === 'true'
					: rawValues[44] === 1;

			const wwHysterese =
				typeof wwHystereseState?.val === 'number'
					? wwHystereseState.val
					: effectiveParams[74] !== undefined
						? effectiveParams[74] / 10
						: 2.0;
			const currentHupVolt = (currentHupVoltState?.val as number) ?? 7.0;
			const heizenHysterese =
				typeof heizenHystereseState?.val === 'number'
					? heizenHystereseState.val
					: effectiveParams[88] !== undefined
						? effectiveParams[88] / 10
						: 1.5;
			const mitteltemperatur =
				typeof mitteltempState?.val === 'number'
					? mitteltempState.val
					: rawValues[16] !== undefined
						? rawValues[16] / 10
						: 0;
			const thresholdHeatingLimit =
				typeof thresholdHeatingLimitState?.val === 'number'
					? thresholdHeatingLimitState.val
					: effectiveParams[700] !== undefined
						? effectiveParams[700] / 10
						: 15;

			const isHeatingLimitEnabled =
				heatingLimitState?.val !== undefined && heatingLimitState?.val !== null
					? heatingLimitState.val === 1 ||
						heatingLimitState.val === true ||
						String(heatingLimitState.val) === '1' ||
						String(heatingLimitState.val).toLowerCase() === 'true'
					: effectiveParams[699] === 1;

			const nachWasser = Boolean(nachWasserState?.val);

			const isHeatingAllowedByLimit = !isHeatingLimitEnabled || mitteltemperatur < thresholdHeatingLimit;
			const heatingAllowed = this.isHeatingAllowed(rawValues, effectiveParams, isHeatingAllowedByLimit);
			const wwAllowedNow = this.isHotWaterAllowed(rawValues, effectiveParams, 0);
			const wwAllowedSoon = this.isHotWaterAllowed(rawValues, effectiveParams, 25);
			const dynamicDeltaK = Math.round((heizenHysterese + 0.5) * 10) / 10;

			if (istHeizen) {
				if (aelterAls10 && vd1) {
					await this.resetForcedHeatingBoost();
					this.lastPumpOptimization = await handleHupOptimization(
						this,
						istHeizen,
						spreizung,
						currentHupVolt,
						this.lastPumpOptimization,
					);
				}

				if (isRegelungAktiv) {
					const rlZielErreicht = ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1;

					if (rlZielErreicht) {
						// Nach 3 Min. (Umschalt-Spike nach WW vorbei): Heizziel erreicht -> nicht nachheizen!
						if (aelterAls3) {
							await this.syncConfigValue('Heizen_nach_Wasser', false);
						}

						if (aelterAls3 && wwAllowedNow && wwSoll - wwIst > 2) {
							if (this.forcedWwOriginalTarget === null) {
								const fallbackWw =
									parseFloat(
										String(config.sync_warmwater_target_temperature ?? 54).replace(',', '.'),
									) || 54;
								this.forcedWwOriginalTarget = config.idle_defaults_aktiv === true ? fallbackWw : wwSoll;
							}

							let forceSoll = wwIst + wwHysterese + 1.5;

							if (pvIsBoostActive) {
								const baseWw =
									parseFloat(
										String(config.sync_warmwater_target_temperature ?? 54).replace(',', '.'),
									) || 54;
								const boostWw = parseFloat(String(config.pv_boost_ww ?? 0).replace(',', '.')) || 0;
								const pvTarget = baseWw + boostWw;
								forceSoll = Math.max(forceSoll, pvTarget);
							}

							if (forceSoll > 70) {
								forceSoll = 70;
							}
							forceSoll = Math.round(forceSoll * 10) / 10;
							await this.syncConfigValue('temperature_hot_water_target', forceSoll);
						}
					} else if (!nachWasser && config.Heating_after_warmwater === true) {
						await this.syncConfigValue('Heizen_nach_Wasser', true);
					}
				}
			}

			if (istWarmwasser) {
				// Sobald WW mit aktivem Verdichter läuft, ist die Hysterese-Schwelle überwunden ->
				// Start-Impuls (z.B. 68,1 °C) sofort auf das echte Ziel zurücksetzen (auch bei 5-Min.-Polling sicher).
				if (vd1 && this.forcedWwOriginalTarget !== null) {
					await this.restoreForcedWwTarget();
				}

				if (nachWasser && isRegelungAktiv && heatingAllowed) {
					await this.activateForcedHeatingBoost('CycleOpt-AfterWW', dynamicDeltaK);
				}
			}

			if (istLeerlauf) {
				if (config.zip_optimierung_aktiv === true) {
					if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
						await stopZipAndDeaeration(this);
					}
				}

				if (isRegelungAktiv) {
					if (
						wwAllowedSoon &&
						heatingAllowed &&
						wwSoll - wwIst >= wwHysterese - 1.5 &&
						ruecklauf <= ruecklaufSoll
					) {
						if (this.isDebugLogActive) {
							writeLog(
								`[CycleOpt] Pre-starting heating before WW (WW: ${wwIst}/${wwSoll}°C, Hyst: ${wwHysterese}K, RL: ${ruecklauf}/${ruecklaufSoll}°C, Offset: +${dynamicDeltaK}K).`,
								'info',
							);
						}
						await this.activateForcedHeatingBoost('CycleOpt-PreHeat', dynamicDeltaK);
					} else if (this.forcedHeatingBoostActive && this.forcedHeatingReason === 'CycleOpt-PreHeat') {
						await this.resetForcedHeatingBoost();
					}
				}
			}
		} catch (err: any) {
			writeLog(`Error occurred during runOptimizationSchedule loop execution: ${err.message}`, 'error');
		}
	}

	/**
	 * Fetches, parses, converts types, and populates live data registries over the configured TCP socket.
	 * Dispatches calculation and history logging subroutines accordingly.
	 *
	 * @returns A promise that resolves when the internal update registers conclude.
	 */
	private async updateData(): Promise<void> {
		if (this.updateRunning) {
			return;
		}

		if (this.isWriting) {
			if (this.isDebugLogActive) {
				this.log.debug('Skipping read cycle because a write operation is currently in progress.');
			}
			return;
		}

		this.updateRunning = true;
		try {
			const delayHelper = (ms: number): Promise<void> => new Promise(resolve => this.setTimeout(resolve, ms));

			let rawParams: number[] = [];
			let rawValues: number[] = [];
			let lastReadError = '';

			try {
				rawParams = await readAllRaw(this, 3003);
				if (rawParams.length > 0) {
					this.currentRawParams = rawParams;
				}
			} catch (err: unknown) {
				lastReadError = err instanceof Error ? err.message : String(err);
				this.log.debug(`Raw parameter acquisition response error (Command 3003): ${lastReadError}`);
			}

			await delayHelper(200);

			try {
				rawValues = await readAllRaw(this, 3004);
			} catch (err: unknown) {
				lastReadError = err instanceof Error ? err.message : String(err);
				this.log.debug(`Raw telemetry value acquisition response error (Command 3004): ${lastReadError}`);
			}

			if (rawParams.length === 0 && rawValues.length === 0) {
				throw new Error(
					`No telemetry or parameter data received from heat pump (${lastReadError || 'empty response'}).`,
				);
			}

			const config = this.config as Record<string, any>;

			const modbusData =
				config.modbus_active && this.modbusManager?.isAvailable
					? await this.modbusManager.readAllRegisters()
					: null;

			this.errorCount = 0;
			await this.setState('info.connection', { val: true, ack: true });
			await this.setState('info.lastUpdate', { val: new Date().toISOString(), ack: true });

			const statePromises: Promise<any>[] = [];

			for (const [key, definition] of Object.entries(STATE_MAPPING)) {
				if (definition.isVirtual) {
					continue;
				}

				if (!isStateEnabled(key, definition, config, this.currentVisibilities)) {
					continue;
				}

				const luxId = definition.luxWriteId || key;
				let value: any = undefined;

				let appliedFactor = definition.factor;
				if (
					key === 'heating_system_circ_pump_voltage_nominal' ||
					key === 'heating_system_circ_pump_voltage_minimal'
				) {
					appliedFactor = config.hup_voltage_factor !== undefined ? Number(config.hup_voltage_factor) : 100;
				}

				if (definition.dataSource) {
					switch (definition.dataSource) {
						case 'raw_parameter':
							value = rawParams?.[parseInt(luxId, 10)];
							if (value !== undefined) {
								if (appliedFactor) {
									value /= appliedFactor;
								} else if (definition.unit === '°C') {
									value /= 10;
								}
							}
							break;
						case 'raw_value':
							value = rawValues?.[parseInt(luxId, 10)];
							if (value !== undefined) {
								if (appliedFactor) {
									value /= appliedFactor;
								} else if (definition.unit === '°C') {
									value /= 10;
								}
							}
							break;
						case 'parameter':
						case 'value':
						case 'additional':
							value = undefined;
							break;
					}
				} else {
					if (/^\d+$/.test(luxId)) {
						const idx = parseInt(luxId, 10);
						value = definition.folder.startsWith('Settings') ? rawParams?.[idx] : rawValues?.[idx];
						if (value !== undefined) {
							if (appliedFactor) {
								value /= appliedFactor;
							} else if (definition.unit === '°C') {
								value /= 10;
							}
						}
					} else {
						value = undefined;
					}
				}

				// =========================================================
				// MODBUS LIVE-SYNC (Aktualisiert alle aktivierten Modbus-Werte)
				// =========================================================
				if (
					modbusData &&
					config.modbus_active &&
					definition.modbus &&
					config[definition.modbus.configKey] === true
				) {
					const reg = definition.modbus.register;
					if (definition.modbus.type === 'holding' && modbusData.holdings[reg] !== undefined) {
						value = modbusData.holdings[reg];
						if (appliedFactor) {
							value /= appliedFactor;
						} else if (definition.unit === '°C') {
							value /= 10;
						}
					} else if (definition.modbus.type === 'coil' && modbusData.coils[reg] !== undefined) {
						value = modbusData.coils[reg] ? 1 : 0;
					}
				}
				// =========================================================

				if (value !== undefined && typeof value === 'number' && (appliedFactor || definition.unit === '°C')) {
					value = Math.round(value * 100) / 100;
				}
				if (value !== undefined) {
					if (definition.type === 'number' && typeof value === 'string') {
						value =
							value.toLowerCase() === 'ein' ? 1 : value.toLowerCase() === 'aus' ? 0 : parseFloat(value);
					} else if (definition.type === 'boolean') {
						value =
							value === true ||
							value === 1 ||
							String(value).toLowerCase() === 'ein' ||
							String(value).toLowerCase() === 'true';
					} else if (definition.type === 'json' && typeof value === 'object') {
						value = JSON.stringify(value);
					}

					let finalSeconds = Number(value);
					if (definition.isDurationFormat && key === 'Time_WPein_akt' && finalSeconds === 1) {
						finalSeconds = 0;
					}

					if (definition.isDurationFormat) {
						value = formatTimerSecondsToTime(finalSeconds);
					} else if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
						const totalSeconds = typeof value === 'number' ? value : parseInt(value as string, 10);
						if (!isNaN(totalSeconds) && totalSeconds >= 0) {
							if (totalSeconds < 86400) {
								const h = Math.floor(totalSeconds / 3600)
									.toString()
									.padStart(2, '0');
								const m = Math.floor((totalSeconds % 3600) / 60)
									.toString()
									.padStart(2, '0');
								value = `${h}:${m}`;
							} else {
								value = new Date(totalSeconds * 1000).toISOString().replace('T', ' ').substring(0, 19);
							}
						}
					}

					let targetIoBrokerType = definition.type === 'json' ? 'string' : definition.type;

					if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
						targetIoBrokerType = 'string';
					}

					if (targetIoBrokerType === 'string' && typeof value !== 'string') {
						value = String(value);
					} else if (targetIoBrokerType === 'number' && typeof value !== 'number') {
						value = Number(value);
					} else if (targetIoBrokerType === 'boolean' && typeof value !== 'boolean') {
						value = Boolean(value);
					}

					const stateId = `${definition.folder}.${key}`;

					if (
						typeof value === 'number' &&
						(key.toLowerCase().includes('energy') ||
							key.toLowerCase().includes('wärme') ||
							key.toLowerCase().includes('power'))
					) {
						statePromises.push(
							(async () => {
								const oldState = await this.getStateAsync(stateId);
								if (oldState && typeof oldState.val === 'number' && value < oldState.val) {
									return;
								}
								await this.setState(stateId, { val: value, ack: true });
							})(),
						);
					} else {
						statePromises.push(this.setState(stateId, { val: value, ack: true }));
					}
				}
			}

			await Promise.all(statePromises);
			await calculateTotalThermalEnergy(this, rawValues);
			await calculateTotalEnergy(this, rawParams);

			const fehlerDp = getDpPath('Fehlerspeicher');
			const oldFehlerState = fehlerDp ? await this.getStateAsync(fehlerDp) : null;
			const oldFehlerVal = oldFehlerState?.val as string | undefined;

			await updateErrorHistory(this, rawValues);

			const newFehlerState = fehlerDp ? await this.getStateAsync(fehlerDp) : null;
			const newFehlerVal = newFehlerState?.val as string | undefined;

			await checkAndSendErrorNotifications(this, oldFehlerVal, newFehlerVal);

			const abschaltungDp = getDpPath('Abschaltungen');
			const oldAbschaltungState = abschaltungDp ? await this.getStateAsync(abschaltungDp) : null;
			const oldAbschaltungVal = oldAbschaltungState?.val as string | undefined;

			await updateOutageHistory(this, rawValues);

			const newAbschaltungState = abschaltungDp ? await this.getStateAsync(abschaltungDp) : null;
			const newAbschaltungVal = newAbschaltungState?.val as string | undefined;

			await checkAndSendOutageNotifications(this, oldAbschaltungVal, newAbschaltungVal);

			await calculateTemperatureSpread(this);
			await updateStatusStrings(this, rawValues, rawParams);
			await updateCustomStates(this, rawValues, rawParams);
			await updateTimerTables(this);
			await updateSystemInfos(this, rawValues);

			const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const currentBzVal = bzState && bzState.val !== null ? String(bzState.val).trim() : '';

			writeLog(`=> Rufe jetzt den COP Manager auf. BZ ist: ${currentBzVal}`, 'debug');
			await processCopData(this, currentBzVal);

			await this.runOptimizationSchedule(rawValues, rawParams);
		} catch (err: any) {
			this.errorCount++;
			writeLog(
				`Communication error encountered (${this.errorCount}/${this.MAX_ERRORS}): ${err.message}`,
				'error',
			);

			if (this.errorCount >= this.MAX_ERRORS) {
				await this.setState('info.connection', { val: false, ack: true });
				writeLog('Heat pump controller unreachable. Flagging connection status as disconnected.', 'warn');
				sendTelegramNotification(
					this,
					'Heat pump controller unreachable. Flagging connection status as disconnected.',
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
	private onUnload(callback: () => void): void {
		try {
			if (this.pollingInterval) {
				clearInterval(this.pollingInterval);
			}
			if (this.zipTimer) {
				this.clearTimeout(this.zipTimer);
			}
			if (this.zipCountdownInterval) {
				this.clearInterval(this.zipCountdownInterval);
			}

			if (this.updateCronJob) {
				this.updateCronJob.cancel();
			}

			stopAutoBackup(this);

			if (this.midnightTimer) {
				this.clearTimeout(this.midnightTimer);
			}

			void this.setState('info.connection', { val: false, ack: true });

			writeLog(
				'Adapter is shutting down. Cleared all active intervals and terminated open socket configurations cleanly.',
				'info',
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
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (!state) {
			return;
		}

		const config = this.config as Record<string, any>;
		const isReadOnly = config.operation_mode === 'readonly';

		if (!id.startsWith(`${this.namespace}.`)) {
			if (isReadOnly) {
				return;
			}
			handlePvFeedInChange(this, id, state);
		}

		if (!isReadOnly) {
			const isMotionSensor = await checkAndHandleMotionSensor(this, id, state);
			if (isMotionSensor) {
				return;
			}
		}

		if (!id.startsWith(`${this.namespace}.`)) {
			return;
		}

		if (state.ack) {
			if (!isReadOnly && id.endsWith('WP_BZ_akt')) {
				await handlePvCycleCheck(this, Number(state.val));
			}
			return;
		}

		if (id.endsWith('check_firmware') && state.val === true) {
			this.log.info('Manuelle Firmware-Update-Prüfung durch Benutzer gestartet...');
			void this.setState(id, false, true);
			void checkFirmwareUpdate(this);
			return;
		}

		const mappingKey = id.split('.').pop();
		const relativeId = id.replace(`${this.namespace}.`, '');

		if (mappingKey === 'Schreibe_Debug_Log') {
			await this.setState(relativeId, { val: state.val, ack: true });

			this.isDebugLogActive = state.val === true;
			setCustomDebug(this.isDebugLogActive);
			writeLog(
				`Extended debugging telemetry logging mode has been ${this.isDebugLogActive ? 'enabled' : 'disabled'}.`,
				'info',
			);
			return;
		}

		if (mappingKey === 'Dump_Raw_To_Log' && state.val === true) {
			await this.setState(relativeId, { val: false, ack: true });
			await dumpAllRawToLog(this);
			return;
		}

		if (isReadOnly) {
			writeLog(
				`[Read-Only] Write attempt to '${id}' blocked! Change Operating Mode in adapter settings to enable hardware writes.`,
				'warn',
			);
			return;
		}

		if (id.startsWith(`${this.namespace}.Custom.`)) {
			try {
				const obj = await this.getObjectAsync(id);

				if (obj && obj.native && obj.native.source === 'parameter') {
					await this.setState(relativeId, { val: state.val, ack: true });

					let valueToWrite: any = state.val;

					if (obj.native.customType === 'boolean') {
						valueToWrite = state.val ? 1 : 0;
					} else if (obj.native.customType === 'number' && typeof state.val === 'number') {
						if (obj.native.factor) {
							valueToWrite = Math.round(state.val / obj.native.factor);
						} else {
							valueToWrite = Math.round(state.val);
						}
					}

					const targetWriteId = parseInt(obj.native.luxId, 10);
					if (!isNaN(targetWriteId)) {
						if (this.isDebugLogActive) {
							writeLog(
								`Transmitting modified custom configuration parameter ${targetWriteId} to hardware layer with payload value ${valueToWrite}`,
								'info',
							);
						}
						await queueWrite(this, targetWriteId, valueToWrite);
					}
				}
			} catch (err: any) {
				writeLog(`Failed to compile custom value parameter adjustment payload write: ${err.message}`, 'error');
			}
			return;
		}

		if (!mappingKey) {
			return;
		}
		const definition = STATE_MAPPING[mappingKey];
		if (!definition) {
			return;
		}

		try {
			if (mappingKey === 'Regelung_Aktiv' || mappingKey === 'zip_aktiv') {
				await this.setState(relativeId, { val: state.val, ack: true });
				return;
			}
			if (mappingKey === 'Setze_Vorgabewerte' && state.val === true) {
				await this.setState(relativeId, { val: false, ack: true });
				await forceResetPvBoost(this);
				await this.setIdleDefaults();
				return;
			}

			if (mappingKey === 'Zwangswarmwasser') {
				if (state.val === true) {
					await handleZwangswarmwasser(this, id);
				}
				return;
			}

			if (mappingKey === 'Zwangsheizen') {
				if (state.val === true) {
					await handleZwangsheizen(this, id);
				}
				return;
			}

			if (mappingKey === 'Activate_Zip') {
				if (state.val === true) {
					const durationState = await this.getStateAsync(getDpPath('zip_aktiv'));
					const durationSeconds =
						durationState && typeof durationState.val === 'number' ? durationState.val : 120;
					await handleActivateZip(this, id, durationSeconds);
				} else {
					await this.setState(relativeId, { val: false, ack: true });
					await stopZipAndDeaeration(this);
				}
				return;
			}

			const isModbusEnabled = Boolean(
				this.modbusManager &&
				this.modbusManager.isAvailable &&
				config.modbus_active &&
				definition.modbus &&
				config[definition.modbus.configKey] === true,
			);

			if (!definition.luxWriteId || (definition.write !== true && !isModbusEnabled)) {
				return;
			}

			await this.setState(relativeId, { val: state.val, ack: true });

			let appliedFactor = definition.factor;
			if (
				mappingKey === 'heating_system_circ_pump_voltage_nominal' ||
				mappingKey === 'heating_system_circ_pump_voltage_minimal'
			) {
				appliedFactor = config.hup_voltage_factor !== undefined ? Number(config.hup_voltage_factor) : 100;
			}

			let valueToWrite: any = state.val;

			if (typeof valueToWrite === 'boolean') {
				valueToWrite = valueToWrite ? 1 : 0;
			} else if (
				definition.isDurationFormat ||
				definition.role === 'value.datetime' ||
				definition.role === 'value.time'
			) {
				valueToWrite = timeStringToSeconds(state.val);
			} else if (appliedFactor && typeof state.val === 'number') {
				valueToWrite = state.val * appliedFactor;
			}

			if (definition.unit === '°C' && typeof state.val === 'number' && !appliedFactor) {
				valueToWrite = state.val * 10;
			}

			if (isModbusEnabled && definition.modbus) {
				const isCoil = definition.modbus.type === 'coil';
				const register = definition.modbus.register;

				await this.modbusManager.writeRegister(register, Number(valueToWrite), isCoil);
				return;
			}

			const targetWriteId = parseInt(definition.luxWriteId, 10);
			if (isNaN(targetWriteId) || targetWriteId >= 9990) {
				return;
			}
			await queueWrite(this, targetWriteId, valueToWrite);
		} catch (err: any) {
			writeLog(
				`Failed to finalize downstream state change command event pipeline execution loop: ${err.message}`,
				'error',
			);
		}
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Luxtronik2Controller(options);
} else {
	(() => new Luxtronik2Controller())();
}

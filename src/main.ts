/*
 * Created with @iobroker/create-adapter v3.1.5
 */
import * as utils from '@iobroker/adapter-core';
import { handleZwangsheizen, handleZwangswarmwasser } from './actionHandlers';
import { formatTimerSecondsToTime } from './convert';
import { initLogger, setCustomDebug, writeLog } from './logger';
import { checkAndSendErrorNotifications, handleTestMessage, sendTelegramNotification } from './notificationManager';
import {
	cleanupCustomStates,
	cleanupEmptyFolders,
	cleanupStates,
	ensureAllObjectsExist,
	ensureCustomObjectsExist,
	isStateEnabled,
} from './objectManager';
import { dumpAllRawToLog, queueWrite, readAllRaw } from './rawFunctions';
import { STATE_MAPPING, getDpPath } from './stateMapping';
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
class Luxtronik2Controller extends utils.Adapter {
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
	// Cache für den globalen Schreibschutz
	public currentRawParams: number[] = [];
	/** ioBroker interval handle for the main data polling loop */
	private pollingInterval: ioBroker.Interval | undefined;
	/** Cache for the last evaluated heat pump operating state code */
	private lastBzVal: string = '';
	/** Lock flag preventing concurrent execution of the polling updates */
	private updateRunning: boolean = false;
	/** Timestamp tracking the last dynamic pump voltage optimization execution */
	private lastPumpOptimization: number = 0;

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

	/**
	 * Processes incoming inter-adapter messages or commands dispatched from the Admin UI.
	 *
	 * @param obj - The standardized ioBroker message structure containing parameters and optional callbacks.
	 * @returns A promise that resolves once the message has been processed.
	 */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (obj.command === 'testTelegram') {
			await handleTestMessage(this, obj);
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
		const ip = config.host;
		const port = config.port || 8889;

		await this.setState('info.connection', { val: false, ack: true });
		writeLog(`Connecting to heat pump at ${ip}:${port}...`, 'info');

		await cleanupStates(this);
		await cleanupCustomStates(this);
		await cleanupEmptyFolders(this);
		await ensureAllObjectsExist(this);
		await ensureCustomObjectsExist(this);

		await this.setState(getDpPath('Regelung_Aktiv'), { val: config.regelung_aktiv !== false, ack: true });

		const debugState = await this.getStateAsync(getDpPath('Schreibe_Debug_Log'));
		this.isDebugLogActive = debugState?.val === true;
		setCustomDebug(this.isDebugLogActive);

		if (this.isDebugLogActive) {
			writeLog('Synchronizing configuration values with the heat pump...', 'info');
		}
		await this.setIdleDefaults();
		if (this.isDebugLogActive) {
			writeLog('Synchronizing configuration values with the heat pump...', 'info');
		}
		await this.setIdleDefaults();
		await disableHardwareZipTimer(this);
		// Schreib-Zähler aus ioBroker laden (sichert den Stand bei einem Adapter-Neustart)
		const cycleTodayState = await this.getStateAsync(getDpPath('write_cycles_today'));
		this.writeCyclesToday = cycleTodayState && typeof cycleTodayState.val === 'number' ? cycleTodayState.val : 0;

		const cycleTotalState = await this.getStateAsync(getDpPath('write_cycles_total'));
		this.writeCyclesTotal = cycleTotalState && typeof cycleTotalState.val === 'number' ? cycleTotalState.val : 0;

		this.scheduleMidnightReset(); // Startet den 00:00 Uhr Timer (nur für den Tageszähler!)
		subscribeMotionSensors(this);

		this.subscribeStates('*');

		try {
			await this.updateData();
		} catch (error: any) {
			this.log.error(`Initial data retrieval failed (device offline?): ${error.message}`);
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

		this.pollingInterval = this.setInterval(async () => {
			try {
				await this.updateData();
			} catch (error: any) {
				this.log.error(`Error during cyclic data retrieval loop: ${error.message}`);
			}
		}, intervalSeconds * 1000);

		await this.setState('info.connection', true, true);
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

			// Timer für den nächsten Tag neu aufziehen
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
	public async syncConfigValue(mappingKey: keyof typeof STATE_MAPPING, val: any): Promise<void> {
		if (val === undefined || val === null) {
			return;
		}
		const id = getDpPath(mappingKey);
		const state = await this.getStateAsync(id);

		if (!state || state.val !== val) {
			const definition = STATE_MAPPING[mappingKey];
			if (!definition) {
				return;
			}

			await this.setState(id, { val: val, ack: true });

			if (this.isDebugLogActive) {
				writeLog(`Writing value directly into heat pump controller: ${mappingKey} = ${val}`, 'info');
			}

			if (definition.write === true && !definition.isVirtual && definition.luxWriteId) {
				let valueToWrite: any = val;
				if (definition.factor && typeof val === 'number') {
					valueToWrite = val * definition.factor;
				}

				const isRawWrite =
					definition.dataSource === 'raw_parameter' ||
					definition.dataSource === 'raw_value' ||
					(!definition.dataSource && /^\d+$/.test(definition.luxWriteId || ''));
				if (isRawWrite && definition.unit === '°C' && typeof val === 'number' && !definition.factor) {
					valueToWrite = val * 10;
				}

				try {
					const targetWriteId = definition.luxWriteId;
					const writeId = isRawWrite ? parseInt(targetWriteId, 10) : targetWriteId;
					await queueWrite(this, writeId, valueToWrite);
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
	 * Configures fallback factory parameter baselines for the heat pump when in an idle state.
	 *
	 * @returns A promise that resolves when all default configuration tasks resolve.
	 */
	private async setIdleDefaults(): Promise<void> {
		try {
			const config = this.config as Record<string, any>;
			await this.syncConfigValue('heating_curve_end_point', config.endpunkt ?? 23);
			await this.syncConfigValue('heating_curve_parallel_offset', config.fusspunkt ?? 21.7);
			await this.syncConfigValue(
				'heating_system_circ_pump_voltage_minimal',
				config.sync_heating_system_circ_pump_voltage_minimal_heating ?? 3,
			);
			await this.syncConfigValue(
				'heating_system_circ_pump_voltage_nominal',
				config.sync_heating_system_circ_pump_voltage_nominal_heating ?? 7,
			);
			await this.syncConfigValue('warmwater_temperature', config.sync_warmwater_target_temperature ?? 54);
			await this.syncConfigValue(
				'hotWaterTemperatureHysteresis',
				config.sync_hotwater_temperature_hysteresis ?? 10,
			);
			await this.syncConfigValue('returnTemperatureHysteresis', config.sync_return_temperature_hysteresis ?? 1.5);
			await this.syncConfigValue('zip_aktiv', config.zip_aktiv ?? 0);
			await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);
		} catch (err: any) {
			writeLog(`Failed to apply the baseline idle configuration defaults: ${err.message}`, 'error');
		}
	}

	/**
	 * Evaluates whether the current active operating state timestamp is older than ten minutes.
	 *
	 * @returns A promise that resolves to true if the state has remained unaltered for at least 10 minutes.
	 */
	private async istBetriebszustandAelterAls10Min(): Promise<boolean> {
		try {
			const state = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const lastChange = state?.lc ?? 0;
			return (Date.now() - lastChange) / 60000 >= 10;
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
	private async runOptimizationSchedule(): Promise<void> {
		try {
			const config = this.config as Record<string, any>;
			const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const bzVal = bzState && bzState.val !== null ? String(bzState.val).trim() : '';

			const istHeizen = bzVal === '0';
			const istWarmwasser = bzVal === '1';
			const istAbtauen = bzVal === '4';
			const istLeerlauf = bzVal === '5';

			if (!istHeizen && !istWarmwasser && !istLeerlauf && !istAbtauen) {
				return;
			}

			// =========================================================
			// 1. DYNAMIC PARAMETER ADJUSTMENT UPON STATE SWITCH
			// =========================================================
			if (bzVal !== this.lastBzVal) {
				if (istLeerlauf) {
					if (config.idle_defaults_aktiv !== false) {
						await this.setIdleDefaults();
					}
				} else if (istHeizen) {
					if (config.zip_optimierung_aktiv !== false) {
						await this.syncConfigValue('zip_aktiv', config.zip_aktiv ?? 0);
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_minimal',
							config.sync_heating_system_circ_pump_voltage_minimal_heating ?? 3,
						);
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_nominal',
							config.sync_heating_system_circ_pump_voltage_nominal_heating ?? 7,
						);
					}
					if (config.regelung_aktiv !== false) {
						await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);
					}
				} else if (istWarmwasser) {
					if (config.zip_optimierung_aktiv !== false) {
						await this.syncConfigValue(
							'hotWaterTemperatureHysteresis',
							config.sync_hotwater_temperature_hysteresis ?? 2,
						);

						// Prüfen, ob externe Aktoren konfiguriert sind
						const actors = config.actors || [];
						const validActors = actors.filter(
							(a: any) => a.zip_external_relay_id && a.zip_external_relay_id.trim() !== '',
						);

						// Wenn Aktoren da sind, können wir die Zirkulation bedenkenlos starten (0 Flash-Schreibvorgänge!)
						if (validActors.length > 0) {
							if (this.isDebugLogActive) {
								this.log.debug(
									'[ZIP] Externe Aktoren gefunden. Starte Zirkulation synchron zur Warmwasserbereitung.',
								);
							}
							// Dauer aus der Config holen (mit einem sinnvollen Fallback von z.B. 120 Sekunden)
							await this.syncConfigValue('zip_aktiv', config.zip_aktiv_ww ?? 120);
							// Makro über den Trigger-Datenpunkt auslösen
							await this.setOwnStateIfDifferent(getDpPath('Activate_Zip'), true, false);
						}

						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_minimal',
							config.sync_heating_system_circ_pump_voltage_minimal_water ?? 3,
						);
						await this.syncConfigValue(
							'heating_system_circ_pump_voltage_nominal',
							config.sync_heating_system_circ_pump_voltage_nominal_water ?? 10,
						);
					}
				} else if (istAbtauen) {
					// if (config.zip_optimierung_aktiv !== false) {
					// 	await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', 10);
					// }
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
				aelterAls10,
			] = await Promise.all([
				this.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
				this.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
				this.getStateAsync(getDpPath('temperature_return')),
				this.getStateAsync(getDpPath('spreizung_vorlauf_ruecklauf')),
				this.getStateAsync(getDpPath('opStateHeatingString')),
				this.getStateAsync(getDpPath('VD1out')),
				this.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
				this.getStateAsync(getDpPath('temperature_target_return')),
				this.getStateAsync(getDpPath('HUPout')),
				this.getStateAsync(getDpPath('returnTemperatureHysteresis')),
				this.getStateAsync(getDpPath('Heizen_nach_Wasser')),
				this.getStateAsync(getDpPath('Mitteltemperatur')),
				this.getStateAsync(getDpPath('thresholdHeatingLimit')),
				this.getStateAsync(getDpPath('heatingLimit')),
				this.istBetriebszustandAelterAls10Min(),
			]);

			const wwSoll = (wwSollState?.val as number) ?? 0;
			const wwIst = (wwIstState?.val as number) ?? 0;
			const ruecklauf = (ruecklaufState?.val as number) ?? 0;
			const spreizung = (spreizungState?.val as number) ?? 0;
			const heatingStateStr = String(heatingStateStrState?.val || '').trim();
			const vd1 = vd1State?.val === 1;
			const wwHysterese = (wwHystereseState?.val as number) ?? 0;
			const ruecklaufSoll = (ruecklaufSollState?.val as number) ?? 0;
			const hupAktiv = (hupAktivState?.val as number) ?? 0;
			const heizenHysterese = (heizenHystereseState?.val as number) ?? 0;
			const mitteltemperatur = (mitteltempState?.val as number) ?? 0;
			const thresholdHeatingLimit = (thresholdHeatingLimitstate?.val as number) ?? 0;
			const heatingLimit = (heatingLimitState?.val as number) ?? 0;
			const nachWasser = nachWasserState?.val;

			// =========================================================
			// 2. CONTINUOUS IN-SERVICE TELEMETRY EVALUATION
			// =========================================================
			if (istHeizen) {
				if (config.regelung_aktiv !== false && aelterAls10 && vd1) {
					const fusspunkt = (await this.getStateAsync(getDpPath('heating_curve_parallel_offset')))?.val;
					if (fusspunkt === 35) {
						const fallbackFusspunkt = config.fusspunkt ?? 21.7;
						await this.syncConfigValue('heating_curve_parallel_offset', fallbackFusspunkt);
					}
				}

				if (config.zip_optimierung_aktiv !== false) {
					const now = Date.now();
					if (now - this.lastPumpOptimization > 600000) {
						if (spreizung < 6.5 && hupAktiv > 5.5) {
							await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv - 0.25);
							this.lastPumpOptimization = now;
							writeLog(
								`Temperature spread too low (${spreizung}K). Scaling down HUP nominal target to ${hupAktiv - 0.25}V.`,
								'info',
							);
						} else if (spreizung > 7.5 && hupAktiv < 10) {
							await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv + 0.25);
							this.lastPumpOptimization = now;
							writeLog(
								`Temperature spread too high (${spreizung}K). Scaling up HUP nominal target to ${hupAktiv + 0.25}V.`,
								'info',
							);
						}
					}
				}

				if (config.regelung_aktiv !== false) {
					if (ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
						if (aelterAls10) {
							await this.syncConfigValue('Heizen_nach_Wasser', false);
						}
					} else if (!nachWasser && config.Heating_after_warmwater === true) {
						await this.syncConfigValue('Heizen_nach_Wasser', true);
					}

					if (wwSoll - wwIst > 2 && ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
						const fallbackHyst = config.sync_hotwater_temperature_hysteresis ?? 2;
						await this.syncConfigValue('hotWaterTemperatureHysteresis', fallbackHyst);
					}
				}
			}

			if (istWarmwasser && nachWasser) {
				if (config.regelung_aktiv !== false) {
					if ((heatingLimit === 1 && mitteltemperatur < thresholdHeatingLimit) || heatingLimit === 0) {
						await this.syncConfigValue('heating_curve_parallel_offset', 35);
					}
				}
			}

			if (istLeerlauf) {
				if (config.zip_optimierung_aktiv !== false) {
					if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
						await stopZipAndDeaeration(this);
					}
				}

				if (config.regelung_aktiv !== false) {
					if (
						wwSoll - wwIst >= wwHysterese - 1.5 &&
						ruecklauf <= ruecklaufSoll &&
						heatingStateStr !== 'Heating limit'
					) {
						await this.syncConfigValue('heating_curve_parallel_offset', 35);
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
		this.updateRunning = true;
		try {
			const delayHelper = (ms: number): Promise<void> => new Promise(resolve => this.setTimeout(resolve, ms));

			let rawParams: number[] = [];
			let rawValues: number[] = [];

			try {
				rawParams = await readAllRaw(this, 3003);
				this.currentRawParams = rawParams; //Cache für Schreibschutz aktuell halten
			} catch (err: unknown) {
				this.log.debug(
					`Raw parameter acquisition response error (Command 3003): ${err instanceof Error ? err.message : String(err)}`,
				);
			}

			await delayHelper(200);

			try {
				rawValues = await readAllRaw(this, 3004);
			} catch (err: unknown) {
				this.log.debug(
					`Raw telemetry value acquisition response error (Command 3004): ${err instanceof Error ? err.message : String(err)}`,
				);
			}

			this.errorCount = 0;
			await this.setState('info.connection', { val: true, ack: true });

			const statePromises: Promise<any>[] = [];
			const config = this.config as Record<string, any>;

			for (const [key, definition] of Object.entries(STATE_MAPPING)) {
				if (definition.isVirtual) {
					continue;
				}

				if (!isStateEnabled(key, definition, config)) {
					continue;
				}

				const luxId = definition.luxWriteId || key;
				let value: any = undefined;

				if (definition.dataSource) {
					switch (definition.dataSource) {
						case 'raw_parameter':
							value = rawParams?.[parseInt(luxId, 10)];
							if (value !== undefined && definition.factor) {
								value /= definition.factor;
							}
							break;
						case 'raw_value':
							value = rawValues?.[parseInt(luxId, 10)];
							if (value !== undefined && definition.factor) {
								value /= definition.factor;
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
						if (value !== undefined && definition.factor) {
							value /= definition.factor;
						}
					} else {
						value = undefined;
					}
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

					// INTERNER HACK FÜR DEN LUXTRONIK ANZEIGEFEHLER (1 Sekunde -> 0 Sekunden)
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
					statePromises.push(this.setState(stateId, { val: value, ack: true }));
				}
			}

			await Promise.all(statePromises);
			await calculateTotalThermalEnergy(this);
			await calculateTotalEnergy(this);

			const fehlerDp = getDpPath('Fehlerspeicher');
			const oldFehlerState = await this.getStateAsync(fehlerDp);
			const oldFehlerVal = oldFehlerState?.val as string | undefined;

			await updateErrorHistory(this, rawValues);

			const newFehlerState = await this.getStateAsync(fehlerDp);
			const newFehlerVal = newFehlerState?.val as string | undefined;

			await checkAndSendErrorNotifications(this, oldFehlerVal, newFehlerVal);

			await updateOutageHistory(this, rawValues);
			await calculateTemperatureSpread(this);
			await updateStatusStrings(this, rawValues, rawParams);
			await updateCustomStates(this, rawValues, rawParams);
			await updateTimerTables(this);
			await updateSystemInfos(this, rawValues);
			await this.runOptimizationSchedule();
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
				clearTimeout(this.zipTimer);
			}

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

		// Bewegungsmelder an den Manager auslagern
		const isMotionSensor = await checkAndHandleMotionSensor(this, id, state);
		if (isMotionSensor) {
			return; // Der zipManager hat das Event verarbeitet, wir sind hier fertig
		}

		if (state.ack) {
			return;
		}

		if (id.startsWith(`${this.namespace}.Custom.`)) {
			try {
				const obj = await this.getObjectAsync(id);

				if (obj && obj.native && obj.native.source === 'parameter') {
					const relativeId = id.replace(`${this.namespace}.`, '');
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

		const mappingKey = id.split('.').pop();
		if (!mappingKey) {
			return;
		}
		const definition = STATE_MAPPING[mappingKey];
		if (!definition) {
			return;
		}

		try {
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
			if (mappingKey === 'Regelung_Aktiv' || mappingKey === 'zip_aktiv') {
				await this.setState(relativeId, { val: state.val, ack: true });
				return;
			}
			if (mappingKey === 'Setze_Vorgabewerte' && state.val === true) {
				await this.setState(relativeId, { val: false, ack: true });
				await this.setIdleDefaults();
				return;
			}
			if (mappingKey === 'Dump_Raw_To_Log' && state.val === true) {
				await this.setState(relativeId, { val: false, ack: true });
				await dumpAllRawToLog(this);
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

			if (!definition.luxWriteId || definition.write !== true) {
				return;
			}

			await this.setState(relativeId, { val: state.val, ack: true });

			let valueToWrite: any = state.val;

			if (definition.role === 'value.datetime') {
				const valStr = String(state.val).trim();
				const timeMatch = valStr.match(/^(\d{1,2}):(\d{1,2})/);
				if (timeMatch) {
					valueToWrite = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
				}
			} else if (definition.factor && typeof state.val === 'number') {
				valueToWrite = state.val * definition.factor;
			}

			if (definition.unit === '°C' && typeof state.val === 'number' && !definition.factor) {
				valueToWrite = state.val * 10;
			}

			const targetWriteId = definition.luxWriteId;
			await queueWrite(this, parseInt(targetWriteId, 10), valueToWrite);
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

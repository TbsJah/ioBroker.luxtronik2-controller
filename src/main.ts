/*
 * Created with @iobroker/create-adapter v3.1.5
 */
import * as utils from '@iobroker/adapter-core';
import * as luxtronik from 'luxtronik2';
import { initLogger, setCustomDebug, writeLog } from './logger';
import { dumpAllRawToLog, readAllRaw } from './rawFunctions';
import { STATE_MAPPING, getDpPath } from './stateMapping';
import {
	calculateTemperatureSpread,
	calculateTotalEnergy,
	calculateTotalThermalEnergy,
	initializeVirtualStates,
	updateErrorHistory,
	updateOutageHistory,
} from './virtualStates';

class Luxtronik2Controller extends utils.Adapter {
	private pollingInterval?: NodeJS.Timeout;
	private pump: any;
	private createdStates = new Set<string>();
	private lastBzVal = '';
	private zipTimer?: NodeJS.Timeout;
	private isDebugLogActive = false;
	private updateRunning = false;
	private originalZipConfig: Record<string, any> | null = null;

	private writeQueue: (() => Promise<void>)[] = [];
	private isWriting = false;
	private errorCount = 0;
	private readonly MAX_ERRORS = 3;

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

	// private resubscribeMotionSensors(): void {
	// 	const config = this.config as Record<string, any>;
	// 	if (config.motion_sensors_aktiv && Array.isArray(config.motionSensors)) {
	// 		for (const sensor of config.motionSensors) {
	// 			if (sensor.oid && typeof sensor.oid === 'string') {
	// 				this.subscribeForeignStates(sensor.oid.trim());
	// 				writeLog(`Sensor-Abo erneuert nach MQTT-Reconnect: ${sensor.oid}`, 'info');
	// 			}
	// 		}
	// 	}
	// }

	private sendTelegramNotification(message: string): void {
		const config = this.config as Record<string, any>;
		if (config.telegram_enabled && config.telegram_instance) {
			const sendObj: Record<string, any> = { text: message };
			if (config.telegram_receiver && config.telegram_receiver.trim() !== '') {
				const receiver = config.telegram_receiver.trim();
				if (/^-?\d+$/.test(receiver)) {
					sendObj.chatId = parseInt(receiver, 10);
				} else {
					sendObj.user = receiver;
				}
			}
			void this.sendTo(config.telegram_instance, 'send', sendObj);
			writeLog(`Telegram-Nachricht gesendet an ${config.telegram_instance}`, 'debug');
		}
	}

	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (obj.command === 'testTelegram') {
			try {
				writeLog('Test-Button empfangen!', 'info');
				const config = this.config as Record<string, any>;

				// Saubere Abfrage der gespeicherten Werte
				const isTelegramActive =
					config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== 'none';
				const isIoBrokerNotifyActive = config.notification_bell === true;

				if (!isTelegramActive && !isIoBrokerNotifyActive) {
					if (obj.callback) {
						void this.sendTo(
							obj.from,
							obj.command,
							{
								error: 'Fehler: Weder Telegram noch Glocke sind aktiv gespeichert! Bitte erst SPEICHERN klicken.',
							},
							obj.callback,
						);
					}
					return;
				}

				const lastErrorState = await this.getStateAsync(getDpPath('Fehlerspeicher'));
				let msg = '';

				if (lastErrorState && typeof lastErrorState.val === 'string') {
					try {
						const errorList = JSON.parse(lastErrorState.val);
						if (Array.isArray(errorList) && errorList.length > 0) {
							const newestError = errorList[0];
							msg = '🚨 *Test-Alarm: Fehlerspeicher*\n\n';
							msg += `Aktuellster Fehler:\nCode: ${newestError.code}\nFehler: ${newestError.beschreibung}\nDatum: ${newestError.datum}\n\n`;

							// Historie anhängen
							if (errorList.length > 1) {
								msg += `Historie:\n`;
								for (let i = 1; i < errorList.length; i++) {
									msg += `Datum: ${errorList[i].datum} \nCode: ${errorList[i].code}\nFehler: ${errorList[i].beschreibung}\n\n`;
								}
							}
						}
					} catch (parseErr: any) {
						writeLog(`JSON Parse-Fehler beim Test-Button: ${parseErr.message}`, 'debug');
					}
				}

				// Wenn kein echter Fehler da ist, senden wir eine positive Testnachricht
				if (msg === '') {
					msg =
						'✅ *Erfolgreicher Test*\n\nDies ist eine generierte Test-Nachricht. Die Kommunikation zu Telegram und ioBroker funktioniert einwandfrei! (Es liegen aktuell keine echten Heizungsfehler vor).';
				}

				const successMessages: string[] = [];

				if (isIoBrokerNotifyActive) {
					if (typeof this.registerNotification === 'function') {
						await this.registerNotification('luxtronik2-controller', 'lwpError', msg);
						writeLog('Test-Benachrichtigung an ioBroker-Glocke gesendet.', 'info');
						successMessages.push('Glocke');
					}
				}

				if (isTelegramActive) {
					// Wir nutzen deine eigene, perfekte Hilfsfunktion!
					this.sendTelegramNotification(msg);
					writeLog(`Test-Fehlermeldung via Telegram versendet an ${config.telegram_instance}.`, 'info');
					successMessages.push('Telegram');
				}

				if (obj.callback) {
					void this.sendTo(
						obj.from,
						obj.command,
						{ result: `Erfolgreich ausgelöst: ${successMessages.join(' & ')}` },
						obj.callback,
					);
				}
			} catch (err: any) {
				writeLog(`Fehler beim Test-Button: ${err.message}`, 'error');
				if (obj.callback) {
					void this.sendTo(obj.from, obj.command, { error: `Skriptfehler: ${err.message}` }, obj.callback);
				}
			}
		}
	}

	// =========================================================
	// AUFRÄUM-FUNKTION FÜR ABGEWÄHLTE DATENPUNKTE
	// =========================================================
	private async cleanupStates(): Promise<void> {
		const config = this.config as Record<string, any>;

		for (const [key, definition] of Object.entries(STATE_MAPPING)) {
			if (definition.required) {
				continue;
			}

			let isEnabled = config[`sync_${key}`] !== false;

			if (key.startsWith('HZ_MoSo_') || key.startsWith('HZ_MoSo_End')) {
				isEnabled = config.sync_HZ_MoSo_Start1 !== false;
			}
			if (key.startsWith('HZ_MoFr_') || key.startsWith('HZ_SaSo_')) {
				isEnabled = config.sync_HZ_MoFr_Start1 !== false;
			}
			if (
				key.startsWith('HZ_Sonntag_') ||
				key.startsWith('HZ_Montag_') ||
				key.startsWith('HZ_Dienstag_') ||
				key.startsWith('HZ_Mittwoch_') ||
				key.startsWith('HZ_Donnerstag_') ||
				key.startsWith('HZ_Freitag_') ||
				key.startsWith('HZ_Samstag_')
			) {
				isEnabled = config.sync_HZ_Montag_Start1 !== false;
			}

			if (key.startsWith('WW_MoSo_') || key.startsWith('WW_MoSo_End')) {
				isEnabled = config.sync_WW_MoSo_Start1 !== false;
			}
			if (key.startsWith('WW_MoFr_') || key.startsWith('WW_SaSo_')) {
				isEnabled = config.sync_WW_MoFr_Start1 !== false;
			}
			if (
				key.startsWith('WW_Sonntag_') ||
				key.startsWith('WW_Montag_') ||
				key.startsWith('WW_Dienstag_') ||
				key.startsWith('WW_Mittwoch_') ||
				key.startsWith('WW_Donnerstag_') ||
				key.startsWith('WW_Freitag_') ||
				key.startsWith('WW_Samstag_')
			) {
				isEnabled = config.sync_WW_Montag_Start1 !== false;
			}

			if (!isEnabled) {
				const stateId = `${this.namespace}.${definition.folder}.${key}`;
				try {
					const obj = await this.getForeignObjectAsync(stateId);
					if (obj) {
						await this.delForeignObjectAsync(stateId);
						writeLog(`Datenpunkt ${stateId} wurde deaktiviert und entfernt.`, 'info');
					}
				} catch {
					// Ignorieren, wenn es bereits nicht mehr existiert
				}
			}
		}
	}

	private async onReady(): Promise<void> {
		const config = this.config as Record<string, any>;
		const ip = config.host;
		const port = config.port || 8889;
		await this.setState('info.connection', false, true);
		writeLog(`Verbinde mit Wärmepumpe auf ${ip}:${port}...`, 'info');
		this.pump = luxtronik.createConnection(ip, port, { retryCount: 3, retryDelay: 2000 });

		await this.cleanupStates();
		await this.ensureAllObjectsExist();
		await initializeVirtualStates(this);

		const debugState = await this.getStateAsync(getDpPath('Schreibe_Debug_Log'));
		this.isDebugLogActive = debugState?.val === true;
		setCustomDebug(this.isDebugLogActive);

		if (this.isDebugLogActive) {
			writeLog('Synchronisiere Konfigurationswerte mit der Wärmepumpe...', 'info');
		}
		await this.setIdleDefaults();

		if (config.motion_sensors_aktiv && Array.isArray(config.motionSensors)) {
			for (const sensor of config.motionSensors) {
				if (sensor.oid && typeof sensor.oid === 'string' && sensor.oid.trim() !== '') {
					this.subscribeForeignStates(sensor.oid.trim());
					if (this.isDebugLogActive) {
						writeLog(`Bewegungssensor abonniert: ${sensor.name} (${sensor.oid})`, 'info');
					}
				}
			}
		}

		this.subscribeStates('*');

		await this.updateData();

		let intervalSeconds = config.interval || 30;
		if (intervalSeconds < 10) {
			intervalSeconds = 10;
			writeLog('Eingestelltes Intervall war zu kurz. Wurde zum Schutz auf 10 Sekunden korrigiert.', 'warn');
		}

		writeLog(`Starte Polling-Intervall. Lese Daten und optimiere alle ${intervalSeconds} Sekunden.`, 'info');
		await this.setState('info.connection', true, true);
		this.pollingInterval = setInterval(() => {
			void this.updateData();
		}, intervalSeconds * 1000);
	}

	private async ensureAllObjectsExist(): Promise<void> {
		const config = this.config as Record<string, any>;

		try {
			for (const [key, definition] of Object.entries(STATE_MAPPING)) {
				if (!definition.required) {
					let isEnabled = config[`sync_${key}`] !== false;

					if (key.startsWith('HZ_MoSo_') || key.startsWith('HZ_MoSo_End')) {
						isEnabled = config.sync_HZ_MoSo_Start1 !== false;
					}
					if (key.startsWith('HZ_MoFr_') || key.startsWith('HZ_SaSo_')) {
						isEnabled = config.sync_HZ_MoFr_Start1 !== false;
					}
					if (
						key.startsWith('HZ_Sonntag_') ||
						key.startsWith('HZ_Montag_') ||
						key.startsWith('HZ_Dienstag_') ||
						key.startsWith('HZ_Mittwoch_') ||
						key.startsWith('HZ_Donnerstag_') ||
						key.startsWith('HZ_Freitag_') ||
						key.startsWith('HZ_Samstag_')
					) {
						isEnabled = config.sync_HZ_Montag_Start1 !== false;
					}
					if (key.startsWith('WW_MoSo_') || key.startsWith('WW_MoSo_End')) {
						isEnabled = config.sync_WW_MoSo_Start1 !== false;
					}
					if (key.startsWith('WW_MoFr_') || key.startsWith('WW_SaSo_')) {
						isEnabled = config.sync_WW_MoFr_Start1 !== false;
					}
					if (
						key.startsWith('WW_Sonntag_') ||
						key.startsWith('WW_Montag_') ||
						key.startsWith('WW_Dienstag_') ||
						key.startsWith('WW_Mittwoch_') ||
						key.startsWith('WW_Donnerstag_') ||
						key.startsWith('WW_Freitag_') ||
						key.startsWith('WW_Samstag_')
					) {
						isEnabled = config.sync_WW_Montag_Start1 !== false;
					}

					if (!isEnabled) {
						continue;
					}
				}

				if (definition.isVirtual) {
					continue;
				}

				const stateId = `${definition.folder}.${key}`;

				if (!this.createdStates.has(stateId)) {
					await this.setObjectNotExistsAsync(definition.folder, {
						type: 'channel',
						common: { name: definition.folder.split('.').pop() || definition.folder },
						native: {},
					});

					let targetType: ioBroker.CommonType = definition.type === 'json' ? 'string' : definition.type;
					if (definition.unit === 's' && definition.type === 'number') {
						targetType = 'string';
					}

					await this.setObjectNotExistsAsync(stateId, {
						type: 'state',
						common: {
							name: definition.name,
							type: targetType,
							role: definition.role,
							unit: definition.unit,
							read: true,
							write: definition.write || false,
							min: definition.min,
							max: definition.max,
							states: definition.states,
						},
						native: {},
					});

					if (definition.write) {
						this.subscribeStates(stateId);
					}
					this.createdStates.add(stateId);
				}
			}
		} catch (err: any) {
			writeLog(`Fehler bei der Vorab-Objekterzeugung: ${err.message}`, 'error');
		}
	}

	private async syncConfigValue(mappingKey: keyof typeof STATE_MAPPING, val: any): Promise<void> {
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
				writeLog(`Schreibe Wert direkt in Wärmepumpe: ${mappingKey} = ${val}`, 'info');
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
					await this.queueWrite(writeId, valueToWrite, isRawWrite);
					await new Promise(r => setTimeout(r, 200));
				} catch (err: any) {
					writeLog(`Fehler beim Schreiben von ${mappingKey} an die Pumpe: ${err.message}`, 'error');
				}
			}
		}
	}

	private async setOwnStateIfDifferent(id: string, val: any, ack = false): Promise<void> {
		try {
			if (val === undefined) {
				return;
			}
			const state = await this.getStateAsync(id);
			if (!state || state.val !== val) {
				await this.setState(id, { val: val, ack: ack });
				if (this.isDebugLogActive) {
					writeLog(`Setze Werte für ${id}: ${val}`, 'debug');
				}
			}
		} catch (err: any) {
			writeLog(`Fehler in setOwnStateIfDifferent für ${id}: ${err.message}`, 'error');
		}
	}

	private async setIdleDefaults(): Promise<void> {
		try {
			const config = this.config as Record<string, any>;
			await this.syncConfigValue('heating_curve_end_point', config.endpunkt);
			await this.syncConfigValue('heating_curve_parallel_offset', config.fusspunkt);
			await this.syncConfigValue(
				'heating_system_circ_pump_voltage_minimal',
				config.sync_heating_system_circ_pump_voltage_minimal_heating,
			);
			await this.syncConfigValue(
				'heating_system_circ_pump_voltage_nominal',
				config.sync_heating_system_circ_pump_voltage_nominal_heating,
			);
			await this.syncConfigValue('warmwater_temperature', config.sync_warmwater_target_temperature);
			await this.syncConfigValue('hotWaterTemperatureHysteresis', config.sync_hotwater_temperature_hysteresis);
			await this.syncConfigValue('returnTemperatureHysteresis', config.sync_return_temperature_hysteresis);
			await this.syncConfigValue('zip_aktiv', config.zip_aktiv);
			await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);
		} catch (err: any) {
			writeLog(`Fehler beim Setzen der Leerlauf-Vorgabewerte: ${err.message}`, 'error');
		}
	}

	private async restoreOriginalZipConfig(): Promise<void> {
		if (!this.originalZipConfig) {
			return;
		}

		try {
			for (const [key, val] of Object.entries(this.originalZipConfig)) {
				if (val === null || val === undefined) {
					continue;
				}

				const def = STATE_MAPPING[key];
				let rawVal = val;

				if (def.role === 'value.datetime' && typeof val === 'string') {
					const timeMatch = val.match(/^(\d{1,2}):(\d{1,2})/);
					if (timeMatch) {
						rawVal = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60;
					} else {
						rawVal = 0;
					}
				}

				await this.setState(getDpPath(key as any), { val: val, ack: true });

				const luxId = parseInt(def.luxWriteId as string, 10);
				await this.queueWrite(luxId, rawVal, true);
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		} catch (err: any) {
			writeLog(`Fehler bei der Wiederherstellung der ZIP Konfiguration: ${err.message}`, 'error');
		} finally {
			this.originalZipConfig = null;
		}
	}

	private async stopZipAndDeaeration(): Promise<void> {
		try {
			const activateZipState = await this.getStateAsync(getDpPath('Activate_Zip'));
			const runDeaerateState = await this.getStateAsync(getDpPath('runDeaerate'));

			const isZipActive = activateZipState?.val === true || this.zipTimer || this.originalZipConfig !== null;
			const isDeaerateActive = runDeaerateState?.val === 1 || runDeaerateState?.val === true;

			if (isZipActive || isDeaerateActive) {
				if (this.isDebugLogActive) {
					writeLog('Bedingungen erfüllt: Stoppe aktives ZIP Makro und Entlüftungsprogramm...', 'info');
				}

				if (this.zipTimer) {
					clearTimeout(this.zipTimer);
					this.zipTimer = undefined;
				}

				await this.restoreOriginalZipConfig();

				await this.queueWrite(158, 0, true);
				await new Promise(resolve => setTimeout(resolve, 100));
				await this.queueWrite(684, 0, true);
				await new Promise(resolve => setTimeout(resolve, 100));

				await this.syncConfigValue('runDeaerate', 0);
				await this.syncConfigValue('hotWaterCircPumpDeaerate', 0);
				await this.setOwnStateIfDifferent(getDpPath('Activate_Zip'), false, true);
			}
		} catch (err: any) {
			writeLog(`Fehler beim Stoppen von ZIP/Entlüftung: ${err.message}`, 'error');
		}
	}

	private async istBetriebszustandAelterAls10Min(): Promise<boolean> {
		try {
			const state = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const lastChange = state?.lc ?? 0;
			return (Date.now() - lastChange) / 60000 >= 10;
		} catch {
			return false;
		}
	}

	private async runOptimizationSchedule(): Promise<void> {
		try {
			const regelungAktiv = await this.getStateAsync(getDpPath('Regelung_Aktiv'));
			if (regelungAktiv?.val === false) {
				return;
			}

			const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const bzVal = bzState && bzState.val !== null ? String(bzState.val).trim() : '';

			const istHeizen = bzVal === '0';
			const istWarmwasser = bzVal === '1';
			const istAbtauen = bzVal === '4';
			const istLeerlauf = bzVal === '5';

			if (!istHeizen && !istWarmwasser && !istLeerlauf && !istAbtauen) {
				return;
			}

			const config = this.config as Record<string, any>;

			if (bzVal !== this.lastBzVal) {
				if (istLeerlauf) {
					await this.setIdleDefaults();
				} else if (istHeizen) {
					await this.syncConfigValue('zip_aktiv', config.zip_aktiv);
					await this.syncConfigValue(
						'heating_system_circ_pump_voltage_minimal',
						config.sync_heating_system_circ_pump_voltage_minimal_heating,
					);
					await this.syncConfigValue(
						'heating_system_circ_pump_voltage_nominal',
						config.sync_heating_system_circ_pump_voltage_nominal_heating,
					);
					await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater === true);
				} else if (istWarmwasser) {
					await this.syncConfigValue(
						'hotWaterTemperatureHysteresis',
						config.sync_hotwater_temperature_hysteresis,
					);
					await this.syncConfigValue('zip_aktiv', config.zip_aktiv_ww);
					await this.syncConfigValue(
						'heating_system_circ_pump_voltage_minimal',
						config.sync_heating_system_circ_pump_voltage_minimal_water,
					);
					await this.syncConfigValue(
						'heating_system_circ_pump_voltage_nominal',
						config.sync_heating_system_circ_pump_voltage_nominal_water,
					);
					await this.setOwnStateIfDifferent(getDpPath('Activate_Zip'), true, false);
				} else if (istAbtauen) {
					await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', 10);
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
			const nachWasser = nachWasserState?.val;
			const betriebsart = (bzState?.val as number) ?? 0;

			if (istHeizen) {
				if (aelterAls10 && vd1) {
					const fusspunkt = (await this.getStateAsync(getDpPath('heating_curve_parallel_offset')))?.val;
					if (fusspunkt === 35) {
						await this.syncConfigValue('heating_curve_parallel_offset', config.fusspunkt);
					}
				}
				if (spreizung < 6.5 && hupAktiv > 5.5) {
					await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv - 0.25);
				} else if (spreizung > 7.5) {
					await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv + 0.25);
				}

				if (ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
					if (aelterAls10) {
						await this.syncConfigValue('Heizen_nach_Wasser', false);
					}
				} else if (!nachWasser && config.Heating_after_warmwater === true) {
					await this.syncConfigValue('Heizen_nach_Wasser', true);
				}

				if (wwSoll - wwIst > 2 && ruecklauf >= ruecklaufSoll + heizenHysterese - 0.1) {
					await this.syncConfigValue('hotWaterTemperatureHysteresis', 2);
				}
			}

			if (istWarmwasser && nachWasser) {
				await this.syncConfigValue('heating_curve_parallel_offset', 35);
			}

			if (istLeerlauf) {
				if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
					await this.stopZipAndDeaeration();
				}
				if (
					wwSoll - wwIst >= wwHysterese - 1.5 &&
					ruecklauf <= ruecklaufSoll &&
					betriebsart !== 4 &&
					heatingStateStr !== 'Heizgrenze'
				) {
					await this.syncConfigValue('heating_curve_parallel_offset', 35);
				}
			}
		} catch (err: any) {
			writeLog(`Fehler im runOptimizationSchedule-Ablauf: ${err.message}`, 'error');
		}
	}

	private readPumpAsync(): Promise<any> {
		if (this.isDebugLogActive) {
			writeLog(`readPumpAsync Comand`, 'debug');
		}
		return new Promise((resolve, reject) => {
			let isFinished = false;
			const timeout = setTimeout(() => {
				if (isFinished) {
					return;
				}
				isFinished = true;
				reject(new Error('Timeout (35s): Luxtronik hat keine Antwort geliefert.'));
			}, 35000);

			this.pump.read((err: any, data: any): void => {
				if (isFinished) {
					return;
				}
				isFinished = true;
				clearTimeout(timeout);
				if (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				} else {
					resolve(data);
				}
			});
		});
	}

	private writePumpAsync(cmd: string | number, val: any, isRaw = false): Promise<void> {
		if (this.isDebugLogActive) {
			writeLog(`writePumpAsync Comand: ${cmd}, val: ${val}`, 'debug');
		}
		return new Promise((resolve, reject) => {
			let isFinished = false;
			const timeout = setTimeout(() => {
				if (isFinished) {
					return;
				}
				isFinished = true;
				reject(new Error(`Timeout (35s) beim Schreiben von [${cmd}].`));
			}, 35000);

			const cb = (err: any): void => {
				if (isFinished) {
					return;
				}
				isFinished = true;
				clearTimeout(timeout);
				if (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				} else {
					resolve();
				}
			};

			if (isRaw) {
				this.pump.writeRaw(cmd, val, cb);
			} else {
				this.pump.write(cmd, val, cb);
			}
		});
	}

	private async queueWrite(cmd: string | number, val: any, isRaw: boolean): Promise<void> {
		return new Promise((resolve, reject) => {
			this.writeQueue.push(async () => {
				try {
					await this.writePumpAsync(cmd, val, isRaw);
					resolve();
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			});
			void this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.isWriting || this.writeQueue.length === 0) {
			return;
		}
		this.isWriting = true;
		const task = this.writeQueue.shift();
		if (task) {
			await task();
		}
		this.isWriting = false;
		void this.processQueue();
	}

	private formatSecondsToHMS(totalSeconds: number): string {
		if (totalSeconds < 0 || isNaN(totalSeconds)) {
			return '00:00:00';
		}
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = Math.floor(totalSeconds % 60);
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	private async updateData(): Promise<void> {
		if (this.updateRunning) {
			return;
		}
		this.updateRunning = true;
		try {
			let rawParams: number[] = [];
			let rawValues: number[] = [];
			let coolchipData: any = null;

			try {
				rawParams = await readAllRaw(this, 3003);
			} catch (err: any) {
				writeLog(`Raw 3003 Fehler: ${err.message}`, 'debug');
			}
			await new Promise(r => setTimeout(r, 3500));

			try {
				rawValues = await readAllRaw(this, 3004);
			} catch (err: any) {
				writeLog(`Raw 3004 Fehler: ${err.message}`, 'debug');
			}
			await new Promise(r => setTimeout(r, 3500));

			try {
				coolchipData = await this.readPumpAsync();
			} catch (err: any) {
				if (err.message.includes('Timeout')) {
					writeLog('Wärmepumpe ausgelastet (Timeout). Der Abfrage-Zyklus wird übersprungen.', 'debug');
				} else {
					writeLog(`Verbindungsfehler zur Wärmepumpe: ${err.message}`, 'error');
				}
			}

			if (!coolchipData) {
				return;
			}

			this.errorCount = 0;
			await this.setState('info.connection', { val: true, ack: true });

			const statePromises: Promise<any>[] = [];
			const config = this.config as Record<string, any>;

			for (const [key, definition] of Object.entries(STATE_MAPPING)) {
				if (definition.isVirtual) {
					continue;
				}

				if (!definition.required) {
					let isEnabled = config[`sync_${key}`] !== false;
					if (key.startsWith('HZ_MoSo_') || key.startsWith('HZ_MoSo_End')) {
						isEnabled = config.sync_HZ_MoSo_Start1 !== false;
					}
					if (key.startsWith('HZ_MoFr_') || key.startsWith('HZ_SaSo_')) {
						isEnabled = config.sync_HZ_MoFr_Start1 !== false;
					}
					if (
						key.startsWith('HZ_Sonntag_') ||
						key.startsWith('HZ_Montag_') ||
						key.startsWith('HZ_Dienstag_') ||
						key.startsWith('HZ_Mittwoch_') ||
						key.startsWith('HZ_Donnerstag_') ||
						key.startsWith('HZ_Freitag_') ||
						key.startsWith('HZ_Samstag_')
					) {
						isEnabled = config.sync_HZ_Montag_Start1 !== false;
					}
					if (key.startsWith('WW_MoSo_') || key.startsWith('WW_MoSo_End')) {
						isEnabled = config.sync_WW_MoSo_Start1 !== false;
					}
					if (key.startsWith('WW_MoFr_') || key.startsWith('WW_SaSo_')) {
						isEnabled = config.sync_WW_MoFr_Start1 !== false;
					}
					if (
						key.startsWith('WW_Sonntag_') ||
						key.startsWith('WW_Montag_') ||
						key.startsWith('WW_Dienstag_') ||
						key.startsWith('WW_Mittwoch_') ||
						key.startsWith('WW_Donnerstag_') ||
						key.startsWith('WW_Freitag_') ||
						key.startsWith('WW_Samstag_')
					) {
						isEnabled = config.sync_WW_Montag_Start1 !== false;
					}

					if (!isEnabled) {
						continue;
					}
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
							value = coolchipData?.parameters?.[luxId];
							break;
						case 'value':
							value = coolchipData?.values?.[luxId];
							break;
						case 'additional':
							value = coolchipData?.additional?.[luxId];
							break;
					}
				} else {
					if (/^\d+$/.test(luxId)) {
						const idx = parseInt(luxId, 10);
						value = definition.folder.startsWith('Einstellungen') ? rawParams?.[idx] : rawValues?.[idx];
						if (value !== undefined && definition.factor) {
							value /= definition.factor;
						}
					} else {
						value =
							coolchipData?.values?.[luxId] ??
							coolchipData?.parameters?.[luxId] ??
							coolchipData?.additional?.[luxId];
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

					if (definition.unit === 's' && typeof value === 'number') {
						value = this.formatSecondsToHMS(value);
					} else if (definition.role === 'value.datetime') {
						const totalSeconds = typeof value === 'number' ? value : parseInt(value, 10);
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
								value = new Date(totalSeconds * 1000).toLocaleString('de-DE');
							}
						}
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

			if (newFehlerVal && newFehlerVal !== oldFehlerVal) {
				try {
					const oldList = oldFehlerVal ? JSON.parse(oldFehlerVal) : [];
					const newList = JSON.parse(newFehlerVal);

					if (newList.length > 0) {
						const newestError = newList[0];
						const oldNewestError = oldList.length > 0 ? oldList[0] : null;

						if (!oldNewestError || newestError.timestamp !== oldNewestError.timestamp) {
							const msg = `🚨 *Störung Wärmepumpe!*\nEin Fehler an der Wärmepumpe wurde registriert:\n\n*Code:* ${newestError.code}\n*Fehler:* ${newestError.beschreibung}\n*Datum:* ${newestError.datum}`;
							this.sendTelegramNotification(msg);

							if (config.notification_bell) {
								if (typeof this.registerNotification === 'function') {
									await this.registerNotification('luxtronik2-controller', 'lwpError', msg);
								} else {
									writeLog(
										`🚨 Wärmepumpen-Fehler: Code ${newestError.code} - ${newestError.beschreibung}`,
										'warn',
									);
								}
							}
						}
					}
				} catch {
					writeLog('Konnte Fehlerhistorie für Benachrichtigungen nicht parsen.', 'debug');
				}
			}

			await updateOutageHistory(this, rawValues);
			await calculateTemperatureSpread(this);
			await this.runOptimizationSchedule();
		} catch (err: any) {
			this.errorCount++;
			writeLog(`Abfragefehler (${this.errorCount}/${this.MAX_ERRORS}): ${err.message}`, 'error');

			if (this.errorCount >= this.MAX_ERRORS) {
				await this.setState('info.connection', { val: false, ack: true });
				writeLog('Wärmepumpe nicht erreichbar. Verbindung wurde als unterbrochen markiert.', 'warn');
				this.sendTelegramNotification(
					'Wärmepumpe nicht erreichbar. Verbindung wurde als unterbrochen markiert.',
				);
			}
		} finally {
			this.updateRunning = false;
		}
	}

	private onUnload(callback: () => void): void {
		try {
			if (this.pollingInterval) {
				clearInterval(this.pollingInterval);
			}
			if (this.pump && typeof this.pump.disconnect === 'function') {
				this.pump.disconnect();
			}
			if (this.zipTimer) {
				clearTimeout(this.zipTimer);
			}
			writeLog('Adapter gestoppt.', 'info');
			callback();
		} catch {
			callback();
		}
	}

	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (!state) {
			return;
		}

		// 1. Bewegungssensoren Logik
		const config = this.config as Record<string, any>;
		if (config.motion_sensors_aktiv && config.motionSensors && Array.isArray(config.motionSensors)) {
			const matchedSensor = config.motionSensors.find((s: any) => s.oid && s.oid.trim() === id);

			if (matchedSensor && state.val === true) {
				const now = Date.now();
				const zipOutState = await this.getStateAsync(getDpPath('ZIPout'));
				const lastZipChange = zipOutState?.lc || 0;

				if (now - lastZipChange > (config.zip_last_run_min || 600) * 1000) {
					if (this.isDebugLogActive) {
						writeLog(`Bewegung an '${matchedSensor.name || id}' erkannt. Triggere ZIP Makro.`, 'debug');
					}
					await this.setState(getDpPath('Activate_Zip'), { val: true, ack: false });
				} else {
					if (this.isDebugLogActive) {
						writeLog(
							`Bewegung an '${matchedSensor.name || id}' erkannt, aber ZIP hat kürzlich gearbeitet.`,
							'debug',
						);
					}
				}
				return;
			}
		}

		// 2. Eigene Datenpunkte
		if (state.ack) {
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
			if (mappingKey === 'Schreibe_Debug_Log') {
				await this.setState(id, { val: state.val, ack: true });

				this.isDebugLogActive = state.val === true;
				setCustomDebug(this.isDebugLogActive);
				writeLog(`Erweitertes Logging ist nun ${this.isDebugLogActive ? 'aktiviert' : 'deaktiviert'}`, 'info');
				return;
			}
			if (mappingKey === 'Regelung_Aktiv' || mappingKey === 'zip_aktiv') {
				await this.setState(id, { val: state.val, ack: true });
				return;
			}
			if (mappingKey === 'Setze_Vorgabewerte' && state.val === true) {
				await this.setState(id, { val: false, ack: true });
				await this.setIdleDefaults();
				return;
			}
			if (mappingKey === 'Dump_Raw_To_Log' && state.val === true) {
				await this.setState(id, { val: false, ack: true });
				await dumpAllRawToLog(this);
				return;
			}

			// ==========================================
			// Zwangswarmwasser
			// ==========================================
			if (mappingKey === 'Zwangswarmwasser') {
				if (state.val === true) {
					// OPTIMISTIC UPDATE: Taster sofort wieder auf false setzen
					await this.setState(id, { val: false, ack: true });

					// Werte für Ist und Soll abrufen
					const wwIstState = await this.getStateAsync(getDpPath('Wamwassertemperatur_Ist'));
					const wwSollState = await this.getStateAsync(getDpPath('Wamwassertemperatur_Soll'));

					const wwIst = typeof wwIstState?.val === 'number' ? wwIstState.val : 0;
					const wwSoll = typeof wwSollState?.val === 'number' ? wwSollState.val : 0;

					// Prüfung: Zwangswarmwasser nur, wenn Ist < Soll - 1K
					if (wwIst < wwSoll - 1) {
						await this.syncConfigValue('hotWaterTemperatureHysteresis', 1);
						writeLog(
							`Zwangswarmwasser ausgelöst: Ist (${wwIst}°C) ist kleiner als Soll-1 (${wwSoll - 1}°C). Hysterese auf 1K gesetzt.`,
							'info',
						);
					} else {
						writeLog(
							`Zwangswarmwasser ignoriert: Ist (${wwIst}°C) ist bereits ausreichend hoch (Soll: ${wwSoll}°C).`,
							'info',
						);
					}
				}
				return;
			}

			// ==========================================
			// Zwangsheizen
			// ==========================================
			if (mappingKey === 'Zwangsheizen') {
				if (state.val === true) {
					// OPTIMISTIC UPDATE: Taster sofort wieder auf false setzen
					await this.setState(id, { val: false, ack: true });

					// Alle benötigten Werte parallel abrufen
					const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
						this.getStateAsync(getDpPath('WP_BZ_akt')),
						this.getStateAsync(getDpPath('temperature_return')),
						this.getStateAsync(getDpPath('temperature_target_return')),
						this.getStateAsync(getDpPath('returnTemperatureHysteresis')),
					]);

					const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : -1;
					const ruecklauf = typeof ruecklaufState?.val === 'number' ? ruecklaufState.val : 0;
					const ruecklaufSoll = typeof ruecklaufSollState?.val === 'number' ? ruecklaufSollState.val : 0;
					const hysterese = typeof hystereseState?.val === 'number' ? hystereseState.val : 0;

					// Bedingung 1: Anlage muss im Leerlauf (5) sein
					if (bzVal === 5) {
						// Bedingung 2: Rücklauf < Rücklauf Soll + Hysterese
						if (ruecklauf < ruecklaufSoll + hysterese) {
							await this.syncConfigValue('heating_curve_parallel_offset', 35);
							writeLog(
								`Zwangsheizen ausgelöst: Anlage im Leerlauf und Rücklauf (${ruecklauf}°C) < Soll+Hysterese (${ruecklaufSoll + hysterese}°C). Fusspunkt temporär auf 35°C gesetzt.`,
								'info',
							);
						} else {
							writeLog(
								`Zwangsheizen ignoriert: Rücklauf (${ruecklauf}°C) ist nicht größer als Soll+Hysterese (${ruecklaufSoll + hysterese}°C).`,
								'info',
							);
						}
					} else {
						writeLog(
							`Zwangsheizen ignoriert: Anlage ist nicht im Leerlauf (Aktueller Betriebsstatus: ${bzVal}).`,
							'info',
						);
					}
				}
				return;
			}

			if (mappingKey === 'Activate_Zip') {
				if (state.val === true) {
					await this.setState(id, { val: true, ack: true });

					const durationState = await this.getStateAsync(getDpPath('zip_aktiv'));
					const durationSeconds =
						durationState && typeof durationState.val === 'number' ? durationState.val : 120;

					if (durationSeconds <= 0) {
						await this.setState(id, { val: false, ack: true });
						return;
					}

					const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
					const bzVal = bzState ? Number(bzState.val) : 5;

					const [wwIstS, wwSollS, wwHystS, rLState, rSollState, hzHystState] = await Promise.all([
						this.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
						this.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
						this.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
						this.getStateAsync(getDpPath('temperature_return')),
						this.getStateAsync(getDpPath('temperature_target_return')),
						this.getStateAsync(getDpPath('returnTemperatureHysteresis')),
					]);

					const useDeaeration =
						bzVal === 5 &&
						Number(wwIstS?.val) > Number(wwSollS?.val) - Number(wwHystS?.val) &&
						Number(rLState?.val) > Number(rSollState?.val) - Number(hzHystState?.val);

					if (this.zipTimer) {
						clearTimeout(this.zipTimer);
						this.zipTimer = undefined;
					}

					if (useDeaeration) {
						await this.queueWrite(158, 1, true);
						await new Promise(r => setTimeout(r, 100));
						await this.queueWrite(684, 1, true);
						await this.syncConfigValue('runDeaerate', 1);
						await this.syncConfigValue('hotWaterCircPumpDeaerate', 1);
					} else {
						const onTimeMinutes = Math.ceil(durationSeconds / 60);
						if (!this.originalZipConfig) {
							const keysToSave = [
								'hotWaterCircPumpTimerTableSelected',
								'WW_MoSo_Start1',
								'WW_MoSo_End1',
								'WW_MoSo_Start2',
								'WW_MoSo_End2',
								'WW_MoSo_Start3',
								'WW_MoSo_End3',
								'WW_MoSo_Start4',
								'WW_MoSo_End4',
								'WW_MoSo_Start5',
								'WW_MoSo_End5',
								'hotWaterCircPumpOnTime',
								'hotWaterCircPumpOffTime',
							] as const;
							this.originalZipConfig = {};
							for (const k of keysToSave) {
								const s = await this.getStateAsync(getDpPath(k));
								this.originalZipConfig[k] = s ? s.val : null;
							}
						}

						const updates = [
							{ key: 'hotWaterCircPumpTimerTableSelected', raw: 0 },
							{ key: 'WW_MoSo_Start1', raw: 0 },
							{ key: 'WW_MoSo_End1', raw: 86340 },
							{ key: 'WW_MoSo_Start2', raw: 0 },
							{ key: 'WW_MoSo_End2', raw: 0 },
							{ key: 'hotWaterCircPumpOnTime', raw: onTimeMinutes },
							{ key: 'hotWaterCircPumpOffTime', raw: 60 },
						];

						for (const u of updates) {
							await this.queueWrite(parseInt(STATE_MAPPING[u.key].luxWriteId as string, 10), u.raw, true);
							await new Promise(r => setTimeout(r, 100));
						}
					}

					this.zipTimer = setTimeout(async () => {
						await this.stopZipAndDeaeration();
					}, durationSeconds * 1000);
				} else {
					await this.setState(id, { val: false, ack: true });
					await this.stopZipAndDeaeration();
				}
				return;
			}

			if (!definition.luxWriteId || definition.write !== true) {
				return;
			}

			await this.setState(id, { val: state.val, ack: true });

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

			const isRawWrite =
				definition.dataSource === 'raw_parameter' ||
				definition.dataSource === 'raw_value' ||
				(!definition.dataSource && /^\d+$/.test(definition.luxWriteId || ''));
			if (isRawWrite && definition.unit === '°C' && typeof state.val === 'number' && !definition.factor) {
				valueToWrite = state.val * 10;
			}

			const targetWriteId = definition.luxWriteId;
			await this.queueWrite(isRawWrite ? parseInt(targetWriteId, 10) : targetWriteId, valueToWrite, isRawWrite);
		} catch (err: any) {
			writeLog(`Fehler bei Befehlsausführung: ${err.message}`, 'error');
		}
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Luxtronik2Controller(options);
} else {
	(() => new Luxtronik2Controller())();
}

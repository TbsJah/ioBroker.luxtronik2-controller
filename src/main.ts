/*
 * Created with @iobroker/create-adapter v3.1.5
 */
import * as utils from '@iobroker/adapter-core';
import { handleZwangsheizen, handleZwangswarmwasser } from './actionHandlers';
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
import { dumpAllRawToLog, readAllRaw, writeRawParameter } from './rawFunctions';
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
import { handleActivateZip, stopZipAndDeaeration } from './zipManager';

class Luxtronik2Controller extends utils.Adapter {
	public createdStates = new Set<string>();
	public zipTimer?: NodeJS.Timeout;
	public originalZipConfig: Record<string, any> | null = null;
	public lastKnownErrorTimestamp: number | null = null;
	public isDebugLogActive = false;
	private pollingInterval: ioBroker.Interval | undefined;
	private lastBzVal = '';
	private updateRunning = false;
	private lastPumpOptimization: number = 0;

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

	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (obj.command === 'testTelegram') {
			await handleTestMessage(this, obj);
		}
	}

	private async onReady(): Promise<void> {
		const config = this.config as Record<string, any>;
		const ip = config.host;
		const port = config.port || 8889;
		await this.setState('info.connection', { val: false, ack: true });
		writeLog(`Verbinde mit Wärmepumpe auf ${ip}:${port}...`, 'info');

		await cleanupStates(this);
		await cleanupCustomStates(this);
		await cleanupEmptyFolders(this);
		await ensureAllObjectsExist(this);
		await ensureCustomObjectsExist(this);
		// Synchronisiere das virtuelle Objekt mit der neuen Konfigurations-Checkbox
		await this.setState(getDpPath('Regelung_Aktiv'), { val: config.regelung_aktiv !== false, ack: true });

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

		try {
			// Wir versuchen die Anlage einmalig beim Start auszulesen
			await this.updateData();
		} catch (error: any) {
			// Wenn die Pumpe beim Start offline ist, stürzt der Adapter nicht mehr ab!
			this.log.error(`Fehler bei der initialen Datenabfrage (Pumpe offline?): ${error.message}`);
		}

		let intervalSeconds = this.config.interval ? Number(this.config.interval) : 45;
		if (intervalSeconds < 10) {
			intervalSeconds = 10;
			writeLog('Eingestelltes Intervall war zu kurz. Wurde zum Schutz auf 10 Sekunden korrigiert.', 'warn');
		}

		this.pollingInterval = this.setInterval(async () => {
			// Auch im Intervall selbst fangen wir Fehler ab, damit ein Timeout den ioBroker nicht crasht
			try {
				await this.updateData();
			} catch (error: any) {
				this.log.error(`Fehler während des zyklischen Datenabrufs: ${error.message}`);
			}
		}, intervalSeconds * 1000);

		await this.setState('info.connection', true, true);
	}

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
					await this.queueWrite(writeId, valueToWrite);
					await new Promise(r => setTimeout(r, 200));
				} catch (err: any) {
					writeLog(`Fehler beim Schreiben von ${mappingKey} an die Pumpe: ${err.message}`, 'error');
				}
			}
		}
	}

	public async setOwnStateIfDifferent(id: string, val: any, ack = false): Promise<void> {
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
			// Überall mit ?? (Nullish Coalescing) den sicheren Werks-Standard hinterlegen!
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
			writeLog(`Fehler beim Setzen der Leerlauf-Vorgabewerte: ${err.message}`, 'error');
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
			const config = this.config as Record<string, any>;
			const bzState = await this.getStateAsync(getDpPath('WP_BZ_akt'));
			const bzVal = bzState && bzState.val !== null ? String(bzState.val).trim() : '';

			const istHeizen = bzVal === '0';
			const istWarmwasser = bzVal === '1';
			const istAbtauen = bzVal === '4';
			const istLeerlauf = bzVal === '5';

			// Wenn kein relevanter Status aktiv ist, abbrechen
			if (!istHeizen && !istWarmwasser && !istLeerlauf && !istAbtauen) {
				return;
			}

			// =========================================================
			// 1. DYNAMISCHE PARAMETER-ANPASSUNG BEI STATUSWECHSEL
			// =========================================================
			if (bzVal !== this.lastBzVal) {
				if (istLeerlauf) {
					// Checkbox: Standardwerte im Leerlauf erzwingen
					if (config.idle_defaults_aktiv !== false) {
						await this.setIdleDefaults();
					}
				} else if (istHeizen) {
					// Checkbox: ZIP- & HUP-Spannungsoptimierung
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
					// Checkbox: Takt-Optimierung (Heizen nach Wasser zurücksetzen)
					if (config.regelung_aktiv !== false) {
						await this.syncConfigValue('Heizen_nach_Wasser', config.Heating_after_warmwater ?? false);
					}
				} else if (istWarmwasser) {
					// Checkbox: ZIP- & HUP-Spannungsoptimierung
					if (config.zip_optimierung_aktiv !== false) {
						await this.syncConfigValue(
							'hotWaterTemperatureHysteresis',
							config.sync_hotwater_temperature_hysteresis ?? 2,
						);
						await this.syncConfigValue('zip_aktiv', config.zip_aktiv_ww ?? 0);
						await this.setOwnStateIfDifferent(getDpPath('Activate_Zip'), true, false);

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
					// Checkbox: ZIP- & HUP-Spannungsoptimierung
					if (config.zip_optimierung_aktiv !== false) {
						await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', 10);
					}
				}
				this.lastBzVal = bzVal;
			}

			// Paralleler Abruf aller Telemetriedaten für die laufende Zyklus-Überwachung
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

			// =========================================================
			// 2. KONTINUIERLICHE ÜBERWACHUNG WÄHREND DES BETRIEBS
			// =========================================================
			if (istHeizen) {
				// Takt-Optimierung: Anhebung des Fußpunkts nach 10 min stabilisieren
				if (config.regelung_aktiv !== false && aelterAls10 && vd1) {
					const fusspunkt = (await this.getStateAsync(getDpPath('heating_curve_parallel_offset')))?.val;
					if (fusspunkt === 35) {
						const fallbackFusspunkt = config.fusspunkt ?? 21.7;
						await this.syncConfigValue('heating_curve_parallel_offset', fallbackFusspunkt);
					}
				}

				// ZIP- & HUP-Spannungsoptimierung: Dynamische Spreizungsregelung der HUP
				if (config.zip_optimierung_aktiv !== false) {
					const now = Date.now();
					if (now - this.lastPumpOptimization > 300000) {
						if (spreizung < 6.5 && hupAktiv > 5.5) {
							await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv - 0.25);
							this.lastPumpOptimization = now;
							writeLog(
								`Spreizung zu gering (${spreizung}K). HUP-Spannung auf ${hupAktiv - 0.25}V gesenkt.`,
								'info',
							);
						} else if (spreizung > 7.5 && hupAktiv < 10) {
							await this.syncConfigValue('heating_system_circ_pump_voltage_nominal', hupAktiv + 0.25);
							this.lastPumpOptimization = now;
							writeLog(
								`Spreizung zu hoch (${spreizung}K). HUP-Spannung auf ${hupAktiv + 0.25}V erhöht.`,
								'info',
							);
						}
					}
				}

				// Takt-Optimierung: "Heizen nach Wasser" und Hysteresen-Management
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
				// Takt-Optimierung: Fußpunkt anheben bei Heizen nach Wasser
				if (config.regelung_aktiv !== false) {
					await this.syncConfigValue('heating_curve_parallel_offset', 35);
				}
			}

			if (istLeerlauf) {
				// ZIP- & HUP-Spannungsoptimierung: ZIP bei erreichten Sollwerten beenden
				if (config.zip_optimierung_aktiv !== false) {
					if (wwIst <= wwSoll - wwHysterese || ruecklauf <= ruecklaufSoll - heizenHysterese) {
						await stopZipAndDeaeration(this);
					}
				}

				// Takt-Optimierung: Heiztakt vor einer nahenden Warmwasserladung vorziehen
				if (config.regelung_aktiv !== false) {
					if (
						wwSoll - wwIst >= wwHysterese - 1.5 &&
						ruecklauf <= ruecklaufSoll &&
						betriebsart !== 4 &&
						heatingStateStr !== 'Heizgrenze'
					) {
						await this.syncConfigValue('heating_curve_parallel_offset', 35);
					}
				}
			}
		} catch (err: any) {
			writeLog(`Fehler im runOptimizationSchedule-Ablauf: ${err.message}`, 'error');
		}
	}

	private async writePumpAsync(cmd: string | number, val: any): Promise<void> {
		if (this.isDebugLogActive) {
			writeLog(`writePumpAsync Raw-Befehl: ID ${cmd}, val: ${val}`, 'debug');
		}
		const paramId = typeof cmd === 'string' ? parseInt(cmd, 10) : cmd;
		let value = typeof val === 'string' ? parseInt(val, 10) : val;

		// Boolean-Werte in 1/0 umwandeln
		if (typeof value === 'boolean') {
			value = value ? 1 : 0;
		}

		await writeRawParameter(this, paramId, value);
	}

	public async queueWrite(cmd: string | number, val: any): Promise<void> {
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

	private async processQueue(): Promise<void> {
		// Wenn die Queue bereits abgearbeitet wird oder leer ist, brechen wir ab
		if (this.isWriting || this.writeQueue.length === 0) {
			return;
		}

		// Warteschlange wird jetzt blockiert, damit keine parallelen Schreibzugriffe stattfinden
		this.isWriting = true;

		try {
			// Solange noch Aufträge in der Liste sind, arbeiten wir sie der Reihe nach ab
			while (this.writeQueue.length > 0) {
				const task = this.writeQueue.shift(); // Nimmt den ältesten Auftrag aus der Liste

				if (task) {
					try {
						// Versuche, den Schreibbefehl an die Luxtronik zu senden
						await task();

						// Hardware-Schutz: Zwingende Pause (z.B. 300ms) nach jedem Schreibbefehl,
						// damit sich der Controller der Wärmepumpe nicht verschluckt.
						await new Promise(resolve => setTimeout(resolve, 300));
					} catch (taskError: any) {
						// Wenn ein einzelner Schreibbefehl fehlschlägt, fangen wir das HIER ab.
						// Dadurch stürzt die Schleife nicht ab, sondern macht einfach mit dem
						// nächsten Befehl in der Warteschlange weiter!
						writeLog(
							`Fehler beim Ausführen eines Schreibbefehls in der Queue: ${taskError.message}`,
							'error',
						);
					}
				}
			}
		} finally {
			// oder mit einem schweren Fehler (Exception) abgebrochen ist.
			// So ist garantiert, dass die Warteschlange immer wieder für neue Befehle freigegeben wird!
			this.isWriting = false;
		}
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
							// Die alte coolchip-Bibliothek ist entfernt.
							// Diese alten Text-Werte (z. B. Firmware) werden ignoriert.
							value = undefined;
							break;
					}
				} else {
					if (/^\d+$/.test(luxId)) {
						const idx = parseInt(luxId, 10);
						// Logik: Einstellungen sind meist Parameter (3003), Infos sind Messwerte (3004)
						value = definition.folder.startsWith('Einstellungen') ? rawParams?.[idx] : rawValues?.[idx];
						if (value !== undefined && definition.factor) {
							value /= definition.factor;
						}
					} else {
						// Fallback für alte Text-IDs (z.B. "firmware" statt einer Nummer)
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

					if (definition.unit === 's' && typeof value === 'number') {
						value = this.formatSecondsToHMS(value);
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
								// NEU: Zwingt die Anzeige überall auf zweistellige Werte mit führender Null
								value = new Date(totalSeconds * 1000).toLocaleString('de-DE', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
									second: '2-digit',
									hour12: false,
								});
							}
						}
					}

					// Wir ermitteln, welchen Typ das ioBroker-Objekt zwingend erwartet
					let targetIoBrokerType = definition.type === 'json' ? 'string' : definition.type;
					if (definition.unit === 's' && definition.type === 'number') {
						targetIoBrokerType = 'string';
					}

					// Auch hier: Alle Zeitrollen als String absichern
					if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
						targetIoBrokerType = 'string';
					}

					// Und zwingen den Rohwert gnadenlos in diesen Typ!
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

			// ---> NEUER AUFRUF DES EXTERNEN MANAGERS <---
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
			writeLog(`Abfragefehler (${this.errorCount}/${this.MAX_ERRORS}): ${err.message}`, 'error');

			if (this.errorCount >= this.MAX_ERRORS) {
				await this.setState('info.connection', { val: false, ack: true });
				writeLog('Wärmepumpe nicht erreichbar. Verbindung wurde als unterbrochen markiert.', 'warn');
				sendTelegramNotification(
					this,
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
			if (this.zipTimer) {
				clearTimeout(this.zipTimer);
			}

			void this.setState('info.connection', { val: false, ack: true });

			writeLog('Adapter wird beendet. Alle Timer und Verbindungen sauber gestoppt.', 'info');
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
				// Wenn die Zirkulationspumpe physisch bereits läuft, tun wir gar nichts.
				const zipOutState = await this.getStateAsync(getDpPath('ZIPout'));
				if (zipOutState && zipOutState.val === 1) {
					if (this.isDebugLogActive) {
						writeLog(`Bewegung an '${matchedSensor.name}' ignoriert, da ZIP bereits läuft.`, 'debug');
					}
					return;
				}

				const now = Date.now();
				const lastZipChange = zipOutState?.lc || 0;

				if (now - lastZipChange > (config.zip_last_run_min || 600) * 1000) {
					if (this.isDebugLogActive) {
						writeLog(`Bewegung an '${matchedSensor.name || id}' erkannt. Triggere ZIP Makro.`, 'debug');
					}
					// FIX: Volle ID mit Namespace und setForeignStateAsync für den internen Trigger nutzen
					await this.setForeignStateAsync(`${this.namespace}.${getDpPath('Activate_Zip')}`, {
						val: true,
						ack: false,
					});
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

		// =================================================================
		// BENUTZERDEFINIERTE WERTE SCHREIBEN
		// =================================================================
		if (id.startsWith(`${this.namespace}.Benutzer.`)) {
			try {
				const obj = await this.getObjectAsync(id);

				// Nur weitermachen, wenn es wirklich ein Parameter ist
				if (obj && obj.native && obj.native.source === 'parameter') {
					// FIX: setForeignStateAsync für die volle ID nutzen
					await this.setForeignStateAsync(id, { val: state.val, ack: true });

					let valueToWrite: any = state.val;

					// Konvertierung rückgängig machen (ioBroker -> Luxtronik)
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
								`Schreibe benutzerdefinierten Parameter ${targetWriteId} mit Wert ${valueToWrite}`,
								'info',
							);
						}
						// Ab in die sichere Warteschlange zur Wärmepumpe!
						await this.queueWrite(targetWriteId, valueToWrite);
					}
				}
			} catch (err: any) {
				writeLog(`Fehler beim Schreiben eines eigenen Parameters: ${err.message}`, 'error');
			}
			return;
		}
		// =================================================================

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
				// FIX: setForeignStateAsync nutzen
				await this.setForeignStateAsync(id, { val: state.val, ack: true });

				this.isDebugLogActive = state.val === true;
				setCustomDebug(this.isDebugLogActive);
				writeLog(`Erweitertes Logging ist nun ${this.isDebugLogActive ? 'aktiviert' : 'deaktiviert'}`, 'info');
				return;
			}
			if (mappingKey === 'Regelung_Aktiv' || mappingKey === 'zip_aktiv') {
				// FIX: setForeignStateAsync nutzen
				await this.setForeignStateAsync(id, { val: state.val, ack: true });
				return;
			}
			if (mappingKey === 'Setze_Vorgabewerte' && state.val === true) {
				// FIX: setForeignStateAsync nutzen
				await this.setForeignStateAsync(id, { val: false, ack: true });
				await this.setIdleDefaults();
				return;
			}
			if (mappingKey === 'Dump_Raw_To_Log' && state.val === true) {
				// FIX: setForeignStateAsync nutzen
				await this.setForeignStateAsync(id, { val: false, ack: true });
				await dumpAllRawToLog(this);
				return;
			}

			// ==========================================
			// Zwangswarmwasser
			// ==========================================
			if (mappingKey === 'Zwangswarmwasser') {
				if (state.val === true) {
					await handleZwangswarmwasser(this, id);
				}
				return;
			}

			// ==========================================
			// Zwangsheizen
			// ==========================================
			if (mappingKey === 'Zwangsheizen') {
				if (state.val === true) {
					await handleZwangsheizen(this, id);
				}
				return;
			}

			// ==========================================
			// Activate_Zip
			// ==========================================
			if (mappingKey === 'Activate_Zip') {
				if (state.val === true) {
					const durationState = await this.getStateAsync(getDpPath('zip_aktiv'));
					const durationSeconds =
						durationState && typeof durationState.val === 'number' ? durationState.val : 120;
					await handleActivateZip(this, id, durationSeconds);
				} else {
					await this.setForeignStateAsync(id, { val: false, ack: true });
					await stopZipAndDeaeration(this);
				}
				return;
			}

			if (!definition.luxWriteId || definition.write !== true) {
				return;
			}

			// FIX: setForeignStateAsync für alle normalen Parameter am Ende nutzen
			await this.setForeignStateAsync(id, { val: state.val, ack: true });

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

			// Temperaturwerte für die Roh-Schnittstelle aufbereiten (z.B. 21.5 °C -> 215)
			if (definition.unit === '°C' && typeof state.val === 'number' && !definition.factor) {
				valueToWrite = state.val * 10;
			}

			const targetWriteId = definition.luxWriteId;
			await this.queueWrite(parseInt(targetWriteId, 10), valueToWrite);
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

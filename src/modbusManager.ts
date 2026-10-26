import ModbusRTU from 'modbus-serial';
import { writeLog } from './logger';
import type { LuxtronikAdapter } from './types';

/**
 * Ergebnisstruktur eines vollständigen Modbus-Lesezyklus.
 */
export interface ModbusReadResult {
	/** Ausgelesene Holding-Register (Index 0..23) als vorzeichenbehaftete Zahlen */
	holdings: number[];
	/** Ausgelesene Coils (Index 0..13) als Boolean-Werte */
	coils: boolean[];
}

/**
 * Manager class to handle volatile Modbus TCP read and write operations.
 */
export class ModbusManager {
	/** Indicates whether the Modbus interface on the heat pump is reachable */
	public isAvailable: boolean = false;
	private adapter: LuxtronikAdapter;
	private host: string;
	private port: number;

	/**
	 * Initializes the Modbus manager with the adapter configuration.
	 *
	 * @param adapter - The ioBroker adapter instance.
	 */
	constructor(adapter: LuxtronikAdapter) {
		this.adapter = adapter;
		this.host = adapter.config.host || '192.168.178.81';
		this.port = adapter.config.modbus_port ? Number(adapter.config.modbus_port) : 502;
	}

	/**
	 * Checks if the Modbus TCP service is reachable on the heat pump.
	 * Disables hybrid writing if the connection fails.
	 *
	 * @returns A promise resolving to true if available, false otherwise.
	 */
	public async checkAvailability(): Promise<boolean> {
		if (!this.adapter.config.modbus_active) {
			return false;
		}

		const client = new ModbusRTU();
		try {
			client.setTimeout(2000);
			await client.connectTCP(this.host, { port: this.port });
			client.setID(1);

			// Testverbindung: Wir lesen Holding 1 (Rücklauf-Soll) aus
			await client.readHoldingRegisters(1, 1);

			writeLog(`[Modbus] Pre-Check erfolgreich! Modbus TCP ist auf Port ${this.port} erreichbar.`, 'info');
			this.isAvailable = true;
			return true;
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[Modbus] Pre-Check fehlgeschlagen: ${msg}. Hybrid-Schreibfunktionen werden deaktiviert.`, 'warn');
			this.isAvailable = false;
			return false;
		} finally {
			if (client.isOpen) {
				client.close();
			}
		}
	}

	/**
	 * Liest alle relevanten Holding-Register (0..23) und Coils (0..13) in einem schnellen Batch-Durchgang aus.
	 *
	 * @returns Ein Objekt mit den aktuellen Holdings und Coils oder null bei Fehlern.
	 */
	public async readAllRegisters(): Promise<ModbusReadResult | null> {
		if (!this.isAvailable || !this.adapter.config.modbus_active) {
			return null;
		}

		const client = new ModbusRTU();
		try {
			client.setTimeout(2500);
			await client.connectTCP(this.host, { port: this.port });
			client.setID(1);

			// 1. Holding-Register 0 bis 23 in einem Request lesen
			const holdingRes = await client.readHoldingRegisters(0, 24);
			// 16-Bit Signed Integer Umrechnung (für negative Außentemperaturen / Offsets)
			const holdings = holdingRes.data.map(val => (val > 32767 ? val - 65536 : val));

			// 2. Coils 0 bis 13 in einem Request lesen
			const coilRes = await client.readCoils(0, 14);
			const coils = coilRes.data;

			return { holdings, coils };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (this.adapter.isDebugLogActive) {
				writeLog(`[Modbus] Lese-Zyklus fehlgeschlagen: ${msg}`, 'debug');
			}
			return null;
		} finally {
			if (client.isOpen) {
				client.close();
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
	public async writeRegister(register: number, value: number, isCoil: boolean = false): Promise<void> {
		if (!this.isAvailable) {
			writeLog(`[Modbus] Abbruch: Modbus nicht erreichbar. Kann Register ${register} nicht schreiben.`, 'warn');
			return;
		}

		const client = new ModbusRTU();
		try {
			client.setTimeout(3000);
			await client.connectTCP(this.host, { port: this.port });
			client.setID(1);

			if (isCoil) {
				const coilVal = value === 1 || Boolean(value);
				await client.writeCoil(register, coilVal);
				if (this.adapter.isDebugLogActive) {
					writeLog(`[Modbus] Coil ${register} erfolgreich auf ${coilVal} gesetzt.`, 'debug');
				}
			} else {
				const rounded = Math.round(Number(value));
				const wireValue = rounded < 0 ? 65536 + rounded : rounded;
				await client.writeRegister(register, wireValue);
				if (this.adapter.isDebugLogActive) {
					writeLog(`[Modbus] Holding-Register ${register} erfolgreich auf ${rounded} gesetzt.`, 'debug');
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[Modbus] Schreibfehler auf Register ${register}: ${msg}`, 'error');
		} finally {
			if (client.isOpen) {
				client.close();
			}
		}
	}
}

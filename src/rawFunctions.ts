import type { AdapterInstance } from '@iobroker/adapter-core';
import * as net from 'node:net';
import { WebSocket, type RawData } from 'ws';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
// =========================================================
// KONSTANTEN
// =========================================================

/**
 * Enthält alle festen Befehlsnummern, Ports und Timeouts für die Kommunikation.
 */
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
	TIMEOUT_READ: 8000,
	/** Maximales Timeout für Schreib-Vorgänge in ms */
	TIMEOUT_WRITE: 5000,
	/** Wartezeit in ms zwischen Neuverbindungen (z.B. beim Raw-Dump) */
	DELAY_RECONNECT: 1000,
};

/**
 * Liste der bekannten klassischen TCP-Ports der Luxtronik-Steuerung.
 */
const TCP_PORTS = new Set([8888, 8889]);

// =========================================================
// INTELLIGENTE SCHREIB-FUNKTION (READ-BEFORE-WRITE)
// =========================================================

/**
 * Erweitertes Adapter-Interface für den Zugriff auf den Rohwert-Cache
 */
export interface RawAdapter extends AdapterInstance {
	/** Konfigurationsobjekt des Adapters */
	config: any;
	/** Array der aktuellen Rohwert-Parameter aus dem Cache */
	currentRawParams?: number[];
	/** Gibt an, ob das Debug-Logging aktiviert ist. */
	isDebugLogActive?: boolean;
}

/**
 * Schreibt einen Wert nur dann über das Netzwerk, wenn er vom Ist-Zustand abweicht.
 *
 * @param adapter Die erweiterte ioBroker Adapter-Instanz
 * @param cmd Die Parameter-ID (Register)
 * @param val Der zu schreibende Wert
 */
export async function writePumpSafe(adapter: RawAdapter, cmd: string | number, val: any): Promise<void> {
	const paramId = typeof cmd === 'string' ? parseInt(cmd, 10) : cmd;
	let value = typeof val === 'string' ? parseInt(val, 10) : val;

	if (typeof value === 'boolean') {
		value = value ? 1 : 0;
	}

	// 1. GLOBAL READ-BEFORE-WRITE PRÜFUNG
	if (adapter.currentRawParams && adapter.currentRawParams[paramId] === value) {
		if (adapter.isDebugLogActive) {
			writeLog(
				`[Global SafeWrite] Register ${paramId} steht bereits auf ${value}. Netzwerk-Schreibbefehl blockiert!`,
				'debug',
			);
		}
		return;
	}

	if (adapter.isDebugLogActive) {
		writeLog(`writePumpSafe: Sende an Luxtronik -> Register ${paramId}, Wert: ${value}`, 'debug');
	}

	// 2. ECHTER NETZWERK-BEFEHL
	await writeRawParameter(adapter, paramId, value);

	// 3. OPTIMISTISCHES CACHE-UPDATE
	if (adapter.currentRawParams) {
		adapter.currentRawParams[paramId] = value;
	}

	// 4. BEIDE ZÄHLER HOCHZÄHLEN UND SPEICHERN
	if (typeof adapter.writeCyclesToday === 'number') {
		adapter.writeCyclesToday++;
		adapter.writeCyclesTotal++;

		const dpToday = getDpPath('write_cycles_today');
		const dpTotal = getDpPath('write_cycles_total');

		if (dpToday) {
			// Fire-and-Forget: Klassisches setState ohne Promise-Zwang
			void adapter.setState(dpToday, { val: adapter.writeCyclesToday, ack: true });
		}
		if (dpTotal) {
			void adapter.setState(dpTotal, { val: adapter.writeCyclesTotal, ack: true });
		}
	}
}

// =========================================================
// HILFSFUNKTIONEN
// =========================================================

/**
 * Erzeugt eine asynchrone Pause (Delay) unter Berücksichtigung des ioBroker Timeouts.
 * Verhindert das Blockieren der Node.js Event-Loop.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param ms Die Wartezeit in Millisekunden.
 * @returns Ein Promise, das nach Ablauf der Zeit aufgelöst wird.
 */
export function delay(adapter: AdapterInstance, ms: number): Promise<void> {
	return new Promise(resolve => adapter.setTimeout(resolve, ms));
}

/**
 * Ermittelt anhand des konfigurierten Ports, ob die WebSocket- oder TCP-Verbindung genutzt werden soll.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns True, wenn WebSocket genutzt werden soll (Port ungleich 8888/8889).
 */
function shouldUseWs(adapter: AdapterInstance): boolean {
	const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
	return !TCP_PORTS.has(port);
}

/**
 * Baut einen Buffer für den Versand von Befehlen an die Luxtronik effizient zusammen.
 *
 * @param values Eine variable Anzahl an 32-Bit Integer-Werten, die in den Buffer geschrieben werden sollen.
 * @returns Der fertige, sendebereite Buffer.
 */
function createCommandBuffer(...values: number[]): Buffer {
	const buffer = Buffer.alloc(values.length * 4);
	for (let i = 0; i < values.length; i++) {
		buffer.writeInt32BE(values[i], i * 4);
	}
	return buffer;
}

/**
 * Gemeinsame Logik zum Parsen der rohen Binärdaten der Wärmepumpe.
 * Überprüft Header, Befehls-ID und Elementanzahl auf Gültigkeit.
 *
 * @param responseData Der vollständige Buffer mit den empfangenen Daten.
 * @param command Der erwartete Befehlscode (z.B. 3003 oder 3004).
 * @returns Ein Array mit den ausgelesenen Zahlenwerten oder null, falls noch Datenpakete (Chunks) fehlen.
 */
function parseRawResponse(responseData: Buffer, command: number): number[] | null {
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
	if (totalItems < 0 || totalItems > 10000) {
		throw new Error(`Invalid element count (${totalItems}) in response ${command}`);
	}

	const totalRequiredLength = headerSize + totalItems * 4;
	if (responseData.length < totalRequiredLength) {
		return null;
	}

	const allValues = new Array<number>(totalItems);
	for (let i = 0; i < totalItems; i++) {
		allValues[i] = responseData.readInt32BE(headerSize + i * 4);
	}
	return allValues;
}

// =========================================================
// ZENTRALER VERBINDUNGS-HANDLER (DRY-Prinzip)
// =========================================================

interface ConnectionContext<T> {
	adapter: AdapterInstance;
	socket: net.Socket | WebSocket;
	timeout?: ioBroker.Timeout;
	resolve: (val: T | PromiseLike<T>) => void;
	reject: (err: Error) => void;
}

function createFinisher<T>(ctx: ConnectionContext<T>): (err?: Error, data?: T) => void {
	let finished = false;
	return (err?: Error, data?: T): void => {
		if (finished) {
			return;
		}
		finished = true;

		if (ctx.timeout) {
			ctx.adapter.clearTimeout(ctx.timeout);
		}

		if ('destroy' in ctx.socket) {
			ctx.socket.setTimeout(0);
			ctx.socket.destroy();
			if (err) {
				ctx.reject(err);
			} else {
				ctx.resolve(data as T);
			}
		} else {
			const ws = ctx.socket;
			const isWsActive = ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING;
			if (err) {
				if (isWsActive) {
					ws.close();
				}
				ctx.reject(err);
			} else {
				if (isWsActive) {
					ws.once('close', () => ctx.resolve(data as T));
					ws.close();
				} else {
					ctx.resolve(data as T);
				}
			}
		}
	};
}

// =========================================================
// LESE-FUNKTIONEN
// =========================================================

/**
 * Reads all raw data for the given command.
 *
 * @param adapter The adapter instance
 * @param command The command number
 * @returns Promise with the raw data as number array
 */
export function readAllRaw(adapter: AdapterInstance, command: number): Promise<number[]> {
	if (shouldUseWs(adapter)) {
		return readAllRawWs(adapter, command);
	}
	return readAllRawTcp(adapter, command);
}

function readAllRawWs(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		const ctx: ConnectionContext<number[]> = { adapter, socket: ws, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout reading list ${command}.`)),
			CONSTANTS.TIMEOUT_READ,
		);

		const chunks: Buffer[] = [];
		let totalLength = 0;

		ws.on('open', () => {
			ws.send(createCommandBuffer(command, 0), { binary: true });
		});

		ws.on('message', (data: RawData) => {
			let chunk: Buffer;
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
					finish(undefined, values);
				}
			} catch (err: unknown) {
				finish(err instanceof Error ? err : new Error(String(err)));
			}
		});

		ws.on('error', (err: Error) => finish(err));
	});
}

function readAllRawTcp(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		const ctx: ConnectionContext<number[]> = { adapter, socket: client, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`Timeout reading TCP list ${command}.`)),
			CONSTANTS.TIMEOUT_READ,
		);

		const chunks: Buffer[] = [];
		let totalLength = 0;

		client.connect(port, host, () => {
			client.write(createCommandBuffer(command, 0));
		});

		client.on('data', (chunk: Buffer) => {
			chunks.push(chunk);
			totalLength += chunk.length;

			try {
				const values = parseRawResponse(Buffer.concat(chunks, totalLength), command);
				if (values !== null) {
					finish(undefined, values);
				}
			} catch (err: unknown) {
				finish(err instanceof Error ? err : new Error(String(err)));
			}
		});

		client.on('error', (err: Error) => finish(err));
	});
}

// =========================================================
// SCHREIB-FUNKTIONEN
// =========================================================

/**
 * Write a raw parameter to the Luxtronik device.
 *
 * @param adapter - The adapter instance
 * @param paramId - Parameter ID to write
 * @param value - Value to write
 * @returns Promise that resolves when write completes
 */
export function writeRawParameter(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	if (shouldUseWs(adapter)) {
		return writeRawParameterWs(adapter, paramId, value);
	}
	return writeRawParameterTcp(adapter, paramId, value);
}

function writeRawParameterWs(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		const ctx: ConnectionContext<void> = { adapter, socket: ws, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout writing parameter ${paramId}.`)),
			CONSTANTS.TIMEOUT_WRITE,
		);

		ws.on('open', () => {
			ws.send(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value), { binary: true });
		});

		ws.on('message', () => finish());
		ws.on('error', (err: Error) => finish(err));
	});
}

function writeRawParameterTcp(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		const ctx: ConnectionContext<void> = { adapter, socket: client, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`Timeout writing TCP parameter ${paramId}.`)),
			CONSTANTS.TIMEOUT_WRITE,
		);

		client.connect(port, host, () => {
			client.write(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value));
		});

		client.on('data', (chunk: Buffer) => {
			if (chunk.length >= 4 && chunk.readInt32BE(0) === CONSTANTS.CMD_WRITE) {
				finish();
			}
		});

		client.on('error', (err: Error) => finish(err));
	});
}

// =========================================================
// LOGGING-FUNKTION (DUMP)
// =========================================================

/**
 * Dump all raw parameters and values to the adapter log.
 *
 * @param adapter - The ioBroker adapter instance used for logging and timing.
 */
export async function dumpAllRawToLog(adapter: AdapterInstance): Promise<void> {
	const useWs = shouldUseWs(adapter);

	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			await delay(adapter, CONSTANTS.DELAY_RECONNECT);

			writeLog('=======================================================', 'info');
			writeLog(`START COMPACT RAW DUMP: LIST ${command} (${title}) via ${useWs ? 'WebSocket' : 'TCP'}`, 'info');
			writeLog('=======================================================', 'info');

			const data = await readAllRaw(adapter, command);
			for (let i = 0; i < data.length; i++) {
				writeLog(`[RAW ${command}] Index ${i.toString().padStart(3, ' ')} = ${data[i]}`, 'info');
			}
			writeLog(`--- END OF LIST ${command} (Total ${data.length} indices logged) ---`, 'info');
			writeLog('=======================================================', 'info');
		};

		await delay(adapter, CONSTANTS.DELAY_RECONNECT);
		await dumpList(CONSTANTS.CMD_READ_PARAM, 'PARAMETERS');
		await dumpList(CONSTANTS.CMD_READ_VALUE, 'VALUES');
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error executing raw dump: ${msg}`, 'error');
	}
}

/**
 * Erweitertes ioBroker Adapter-Interface für den Rohdaten-Zugriff.
 * Stellt sicher, dass die in der Hauptklasse definierten Caches und
 * Zähler in den ausgelagerten Netzwerk-Funktionen typsicher zur Verfügung stehen.
 */
export interface RawAdapter extends AdapterInstance {
	/**
	 * Die Adapter-Konfiguration aus der Benutzeroberfläche (io-package.json)
	 * kombiniert mit dynamischen Werten.
	 */
	config: any;

	/**
	 * Globaler Cache der aktuellen Roh-Parameter (Befehl 3003) von der Wärmepumpe.
	 * Wird als Referenz für die "Read-Before-Write" Logik verwendet, um
	 * redundante Schreibvorgänge (Flash-Wear) zu blockieren.
	 */
	currentRawParams?: number[];

	/**
	 * Gibt an, ob das erweiterte Debug-Logging durch den Nutzer oder das System
	 * aktuell aktiviert ist.
	 */
	isDebugLogActive?: boolean;

	/**
	 * Zähler für die physischen Schreibvorgänge auf den Flash-Speicher
	 * am aktuellen Kalendertag. Wird jede Nacht um 00:00 Uhr auf 0 zurückgesetzt.
	 */
	writeCyclesToday: number;

	/**
	 * Fortlaufender Zähler für alle physischen Schreibvorgänge auf den Flash-Speicher
	 * über die gesamte Lebensdauer des Adapters (seit dem letzten kompletten Reset).
	 */
	writeCyclesTotal: number;
}

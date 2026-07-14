import type { AdapterInstance } from '@iobroker/adapter-core';
import * as net from 'node:net';
import { WebSocket, type RawData } from 'ws';
import { writeLog } from './logger';

// =========================================================
// KONSTANTEN (Magic Numbers eliminiert)
// =========================================================
const CONSTANTS = {
	CMD_WRITE: 3002,
	CMD_READ_PARAM: 3003,
	CMD_READ_VALUE: 3004,
	PORT_TCP: 8889,
	PORT_WS: 8214,
	TIMEOUT_READ: 8000,
	TIMEOUT_WRITE: 5000,
	DELAY_RECONNECT: 1000,
};

// =========================================================
// HILFSFUNKTIONEN
// =========================================================

function shouldUseWs(adapter: AdapterInstance): boolean {
	const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
	return port !== 8888 && port !== CONSTANTS.PORT_TCP;
}

/**
 * Gemeinsame Logik zum Parsen der rohen Binärdaten der Wärmepumpe (Vermeidet doppelten Code).
 * Gibt das Array zurück, wenn vollständig gelesen, null wenn noch Daten fehlen, oder wirft einen Fehler.
 *
 * @param responseData - The raw response buffer from the heat pump
 * @param command - The command that was executed
 */
function parseRawResponse(responseData: Buffer, command: number): number[] | null {
	const is3004 = command === CONSTANTS.CMD_READ_VALUE;
	const headerSize = is3004 ? 12 : 8;
	const lengthOffset = is3004 ? 8 : 4;

	if (responseData.length < headerSize) {
		return null;
	}

	const responseCommand = responseData.readInt32BE(0);
	if (responseCommand !== command) {
		throw new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`);
	}

	const totalItems = responseData.readInt32BE(lengthOffset);
	if (totalItems < 0 || totalItems > 10000) {
		throw new Error(`Ungültige Elementanzahl (${totalItems}) in Antwort ${command}`);
	}

	const totalRequiredLength = headerSize + totalItems * 4;
	if (responseData.length < totalRequiredLength) {
		return null;
	}

	const allValues: number[] = [];
	for (let i = 0; i < totalItems; i++) {
		const valueOffset = headerSize + i * 4;
		allValues.push(responseData.readInt32BE(valueOffset));
	}
	return allValues;
}

// =========================================================
// LESE-FUNKTIONEN
// =========================================================

/**
 * Reads all raw values from the device
 *
 * @param adapter - The adapter instance
 * @param command - The command to execute
 * @returns Promise with array of values
 */
export function readAllRaw(adapter: AdapterInstance, command: number): Promise<number[]> {
	if (shouldUseWs(adapter)) {
		return readAllRawWs(adapter, command);
	}
	return readAllRawTcp(adapter, command);
}

function readAllRawWs(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		let finished = false;
		let timeout: ioBroker.Timeout | undefined = undefined;

		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		let responseData = Buffer.alloc(0);

		const finish = (err?: Error, data?: number[]): void => {
			if (finished) {
				return;
			}
			finished = true;
			if (timeout) {
				adapter.clearTimeout(timeout);
			}

			const isWsActive = ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING;

			if (err) {
				if (isWsActive) {
					ws.close();
				}
				reject(err);
			} else if (data) {
				if (isWsActive) {
					ws.once('close', () => resolve(data));
					ws.close();
				} else {
					resolve(data);
				}
			}
		};

		timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout beim Auslesen der Liste ${command}.`)),
			CONSTANTS.TIMEOUT_READ,
		);

		ws.on('open', () => {
			const buffer = Buffer.alloc(8);
			buffer.writeInt32BE(command, 0);
			buffer.writeInt32BE(0, 4);
			ws.send(buffer, { binary: true });
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

			// Nur den neuen Chunk anhängen
			responseData = Buffer.concat([responseData, chunk]);

			try {
				const values = parseRawResponse(responseData, command);
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
		let finished = false;
		const client = new net.Socket();
		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;

		let responseData = Buffer.alloc(0);

		const finish = (err?: Error, data?: number[]): void => {
			if (finished) {
				return;
			}
			finished = true;
			client.setTimeout(0);
			client.destroy();

			if (err) {
				reject(err);
			} else if (data) {
				resolve(data);
			}
		};

		client.connect(port, host, () => {
			const buffer = Buffer.alloc(8);
			buffer.writeInt32BE(command, 0);
			buffer.writeInt32BE(0, 4);
			client.write(buffer);
		});

		client.on('data', (chunk: Buffer) => {
			// Bei TCP kommt immer direkt ein Buffer an, hier reicht das simple Concat
			responseData = Buffer.concat([responseData, chunk]);

			try {
				const values = parseRawResponse(responseData, command);
				if (values !== null) {
					finish(undefined, values);
				}
			} catch (err: unknown) {
				finish(err instanceof Error ? err : new Error(String(err)));
			}
		});

		client.on('error', (err: Error) => finish(err));

		client.setTimeout(CONSTANTS.TIMEOUT_READ);
		client.on('timeout', () => finish(new Error(`Timeout beim Auslesen der TCP Liste ${command}.`)));
	});
}

// =========================================================
// SCHREIB-FUNKTIONEN (3002)
// =========================================================

/**
 * Writes a raw parameter to the device.
 *
 * @param adapter - The adapter instance
 * @param paramId - The parameter ID to write
 * @param value - The value to set for the parameter
 * @returns Promise that resolves when write is complete
 */
export function writeRawParameter(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	if (shouldUseWs(adapter)) {
		return writeRawParameterWs(adapter, paramId, value);
	}
	return writeRawParameterTcp(adapter, paramId, value);
}

function writeRawParameterWs(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let finished = false;
		let timeout: ioBroker.Timeout | undefined = undefined;

		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		const finish = (err?: Error): void => {
			if (finished) {
				return;
			}
			finished = true;
			if (timeout) {
				adapter.clearTimeout(timeout);
			}

			const isWsActive = ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING;

			if (err) {
				if (isWsActive) {
					ws.close();
				}
				reject(err);
			} else {
				if (isWsActive) {
					ws.once('close', () => resolve(undefined));
					ws.close();
				} else {
					resolve(undefined);
				}
			}
		};

		timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout beim Schreiben von Parameter ${paramId}.`)),
			CONSTANTS.TIMEOUT_WRITE,
		);

		ws.on('open', () => {
			const buffer = Buffer.alloc(12);
			buffer.writeInt32BE(CONSTANTS.CMD_WRITE, 0);
			buffer.writeInt32BE(paramId, 4);
			buffer.writeInt32BE(value, 8);
			ws.send(buffer, { binary: true });
		});

		ws.on('message', () => finish());
		ws.on('error', (err: Error) => finish(err));
	});
}

function writeRawParameterTcp(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let finished = false;
		const client = new net.Socket();
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;

		const finish = (err?: Error): void => {
			if (finished) {
				return;
			}
			finished = true;
			client.setTimeout(0);
			client.destroy();

			if (err) {
				reject(err);
			} else {
				resolve();
			}
		};

		client.connect(port, host, () => {
			const buffer = Buffer.alloc(12);
			buffer.writeInt32BE(CONSTANTS.CMD_WRITE, 0);
			buffer.writeInt32BE(paramId, 4);
			buffer.writeInt32BE(value, 8);
			client.write(buffer);
		});

		client.on('data', (chunk: Buffer) => {
			if (chunk.length >= 4) {
				if (chunk.readInt32BE(0) === CONSTANTS.CMD_WRITE) {
					finish();
				}
			}
		});

		client.on('error', (err: Error) => finish(err));

		client.setTimeout(CONSTANTS.TIMEOUT_WRITE);
		client.on('timeout', () => finish(new Error(`Timeout beim Schreiben von Parameter TCP ${paramId}.`)));
	});
}

// =========================================================
// LOGGING-FUNKTION (DUMP)
// =========================================================

/**
 * Dumps all raw data to log
 *
 * @param adapter The adapter instance
 */
export async function dumpAllRawToLog(adapter: AdapterInstance): Promise<void> {
	const delay = (ms: number): Promise<void> => new Promise(resolve => adapter.setTimeout(resolve, ms));
	const useWs = shouldUseWs(adapter);

	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			await delay(CONSTANTS.DELAY_RECONNECT);

			writeLog('=======================================================', 'info');
			writeLog(`START COMPACT RAW DUMP: LISTE ${command} (${title}) via ${useWs ? 'WebSocket' : 'TCP'}`, 'info');
			writeLog('=======================================================', 'info');

			const data = await readAllRaw(adapter, command);
			for (let i = 0; i < data.length; i++) {
				writeLog(`[RAW ${command}] Index ${i.toString().padStart(3, ' ')} = ${data[i]}`, 'info');
			}
			writeLog(`--- ENDE LISTE ${command} (Insgesamt ${data.length} Indizes geloggt) ---`, 'info');
			writeLog('=======================================================', 'info');
		};

		await delay(CONSTANTS.DELAY_RECONNECT);
		await dumpList(CONSTANTS.CMD_READ_PARAM, 'PARAMETER');
		await dumpList(CONSTANTS.CMD_READ_VALUE, 'MESSWERTE');
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Ausführen des Raw-Dumps: ${msg}`, 'error');
	}
}

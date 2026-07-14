import type { AdapterInstance } from '@iobroker/adapter-core';
import * as net from 'node:net';
import { WebSocket } from 'ws';
import { writeLog } from './logger';

/**
 * Hilfsfunktion: Prüft anhand des konfigurierten Ports, ob WebSockets genutzt werden sollen.
 * Die klassischen TCP-Ports der Luxtronik sind 8888 und 8889.
 * Jeder andere Port (Standard bei neuen FW: 8214) triggert automatisch die WebSocket-Verbindung.
 *
 * @param adapter The adapter instance
 */
function shouldUseWs(adapter: AdapterInstance): boolean {
	// Wenn das Feld leer ist, gehen wir vom alten TCP Standard 8889 aus
	const port = adapter.config.port ? Number(adapter.config.port) : 8889;
	return port !== 8888 && port !== 8889;
}

// =========================================================
// LESE-FUNKTIONEN (3003 / 3004)
// =========================================================

/**
 * Reads all raw data from the Luxtronik device.
 *
 * @param adapter The adapter instance
 * @param command The command number to read
 * @returns Promise resolving to an array of numbers
 */
export function readAllRaw(adapter: AdapterInstance, command: number): Promise<number[]> {
	if (shouldUseWs(adapter)) {
		return readAllRawWs(adapter, command);
	}
	return readAllRawTcp(adapter, command);
}

function readAllRawWs(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : 8214;
		// Ein expliziter Slash am Ende der URL hilft bei einigen Firmware-Versionen
		const url = `ws://${host}:${port}/`;

		const ws = new WebSocket(url, 'Lux_WS');
		let responseData = Buffer.alloc(0);

		const timeout = setTimeout(() => {
			if (!finished) {
				finished = true;
				ws.terminate();
				reject(new Error(`WebSocket Timeout beim Auslesen der Liste ${command}.`));
			}
		}, 8000);

		ws.on('open', () => {
			const buffer = Buffer.alloc(8);
			buffer.writeInt32BE(command, 0);
			buffer.writeInt32BE(0, 4);
			// ZWINGEND ALS BINÄRDATEN SENDEN:
			ws.send(buffer, { binary: true });
		});

		ws.on('message', (data: any) => {
			// Sicherstellen, dass die empfangenen Daten immer als Buffer behandelt werden
			const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
			responseData = Buffer.concat([responseData, chunk]);

			const is3004 = command === 3004;
			const headerSize = is3004 ? 12 : 8;
			const lengthOffset = is3004 ? 8 : 4;

			if (responseData.length < headerSize) {
				return;
			}

			const responseCommand = responseData.readInt32BE(0);

			if (responseCommand !== command) {
				if (!finished) {
					finished = true;
					clearTimeout(timeout);
					ws.terminate();
					reject(new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`));
				}
				return;
			}

			const totalItems = responseData.readInt32BE(lengthOffset);

			if (totalItems < 0 || totalItems > 10000) {
				if (!finished) {
					finished = true;
					clearTimeout(timeout);
					ws.terminate();
					reject(new Error(`Ungültige Elementanzahl (${totalItems}) in WS Antwort ${command}`));
				}
				return;
			}

			const totalRequiredLength = headerSize + totalItems * 4;
			if (responseData.length < totalRequiredLength) {
				return;
			}

			const allValues: number[] = [];
			for (let i = 0; i < totalItems; i++) {
				const valueOffset = headerSize + i * 4;
				allValues.push(responseData.readInt32BE(valueOffset));
			}

			if (!finished) {
				finished = true;
				clearTimeout(timeout);
				ws.terminate();
				resolve(allValues);
			}
		});

		ws.on('error', (err: Error) => {
			if (!finished) {
				finished = true;
				clearTimeout(timeout);
				ws.terminate();
				reject(err);
			}
		});
	});
}

function readAllRawTcp(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const client = new net.Socket();
		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : 8889;

		let responseData = Buffer.alloc(0);

		client.connect(port, host, () => {
			const buffer = Buffer.alloc(8);
			buffer.writeInt32BE(command, 0);
			buffer.writeInt32BE(0, 4);
			client.write(buffer);
		});

		client.on('data', (chunk: Buffer) => {
			responseData = Buffer.concat([responseData, chunk]);

			const is3004 = command === 3004;
			const headerSize = is3004 ? 12 : 8;
			const lengthOffset = is3004 ? 8 : 4;

			if (responseData.length < headerSize) {
				return;
			}

			const responseCommand = responseData.readInt32BE(0);

			if (responseCommand !== command) {
				client.destroy();
				if (!finished) {
					finished = true;
					reject(new Error(`Unerwartete Antwort. Erwartet: ${command}, erhalten: ${responseCommand}`));
				}
				return;
			}

			const totalItems = responseData.readInt32BE(lengthOffset);

			if (totalItems < 0 || totalItems > 10000) {
				client.destroy();
				if (!finished) {
					finished = true;
					reject(new Error(`Ungültige Elementanzahl (${totalItems}) in TCP Antwort ${command}`));
				}
				return;
			}

			const totalRequiredLength = headerSize + totalItems * 4;
			if (responseData.length < totalRequiredLength) {
				return;
			}

			const allValues: number[] = [];
			for (let i = 0; i < totalItems; i++) {
				const valueOffset = headerSize + i * 4;
				allValues.push(responseData.readInt32BE(valueOffset));
			}

			client.destroy();
			if (!finished) {
				finished = true;
				resolve(allValues);
			}
		});

		client.on('error', (err: Error) => {
			client.destroy();
			if (!finished) {
				finished = true;
				reject(err);
			}
		});

		client.setTimeout(8000);
		client.on('timeout', () => {
			client.destroy();
			if (!finished) {
				finished = true;
				reject(new Error(`Timeout beim Auslesen der TCP Liste ${command}.`));
			}
		});
	});
}

// =========================================================
// SCHREIB-FUNKTIONEN (3002)
// =========================================================

/**
 * Write a raw parameter to the Luxtronik controller.
 * Uses WebSocket or TCP depending on adapter configuration.
 *
 * @param adapter - The adapter instance
 * @param paramId - The parameter id to write
 * @param value - The value to write
 * @returns Promise that resolves when the write is complete
 */
export function writeRawParameter(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	if (shouldUseWs(adapter)) {
		return writeRawParameterWs(adapter, paramId, value);
	}
	return writeRawParameterTcp(adapter, paramId, value);
}

function writeRawParameterWs(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const host = adapter.config.host;
		const port = adapter.config.port ? Number(adapter.config.port) : 8214;
		// Ein expliziter Slash am Ende der URL hilft bei einigen Firmware-Versionen
		const url = `ws://${host}:${port}/`;

		const ws = new WebSocket(url, 'Lux_WS');

		const timeout = setTimeout(() => {
			if (!finished) {
				finished = true;
				ws.terminate();
				reject(new Error(`WebSocket Timeout beim Schreiben von Parameter ${paramId}.`));
			}
		}, 5000);

		ws.on('open', () => {
			const buffer = Buffer.alloc(12);
			buffer.writeInt32BE(3002, 0); // Befehl 3002 = Parameter schreiben
			buffer.writeInt32BE(paramId, 4);
			buffer.writeInt32BE(value, 8);

			// ZWINGEND ALS BINÄRDATEN SENDEN:
			ws.send(buffer, { binary: true });
		});

		ws.on('message', () => {
			// Optimierung: Jede Antwort der Luxtronik gilt als erfolgreicher Schreib-Empfang
			if (!finished) {
				finished = true;
				clearTimeout(timeout);
				ws.terminate();
				resolve();
			}
		});

		ws.on('error', (err: Error) => {
			if (!finished) {
				finished = true;
				clearTimeout(timeout);
				ws.terminate();
				reject(err);
			}
		});
	});
}

function writeRawParameterTcp(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const client = new net.Socket();
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : 8889;

		client.connect(port, host, () => {
			const buffer = Buffer.alloc(12);
			buffer.writeInt32BE(3002, 0);
			buffer.writeInt32BE(paramId, 4);
			buffer.writeInt32BE(value, 8);
			client.write(buffer);
		});

		client.on('data', (chunk: Buffer) => {
			if (chunk.length >= 4) {
				const responseCommand = chunk.readInt32BE(0);
				if (responseCommand === 3002) {
					client.destroy();
					if (!finished) {
						finished = true;
						resolve();
					}
				}
			}
		});

		client.on('error', (err: Error) => {
			client.destroy();
			if (!finished) {
				finished = true;
				reject(err);
			}
		});

		client.setTimeout(5000);
		client.on('timeout', () => {
			client.destroy();
			if (!finished) {
				finished = true;
				reject(new Error(`Timeout beim Schreiben von Parameter TCP ${paramId}.`));
			}
		});
	});
}

// =========================================================
// LOGGING-FUNKTION (DUMP)
// =========================================================
/**
 * Führt einen kompakten Raw-Dump aller relevanten Listen durch und schreibt die Ergebnisse ins Log.
 *
 * @param adapter - Die Adapter-Instanz
 */
export async function dumpAllRawToLog(adapter: AdapterInstance): Promise<void> {
	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			writeLog('=======================================================', 'info');
			writeLog(
				`START COMPACT RAW DUMP: LISTE ${command} (${title}) via ${shouldUseWs(adapter) ? 'WebSocket' : 'TCP'}`,
				'info',
			);
			writeLog('=======================================================', 'info');
			const data = await readAllRaw(adapter, command);
			for (let i = 0; i < data.length; i++) {
				writeLog(`[RAW ${command}] Index ${i.toString().padStart(3, ' ')} = ${data[i]}`, 'info');
			}
			writeLog(`--- ENDE LISTE ${command} (Insgesamt ${data.length} Indizes geloggt) ---`, 'info');
			writeLog('=======================================================', 'info');
		};

		await dumpList(3003, 'PARAMETER');
		await dumpList(3004, 'MESSWERTE');
	} catch (err: any) {
		writeLog(`Fehler beim Ausführen des Raw-Dumps: ${err.message}`, 'error');
	}
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import * as net from 'net';
import { writeLog } from './logger';

/**
 * Liest die kompletten Rohdaten (3003 oder 3004) direkt über einen TCP-Socket aus der Wärmepumpe.
 *
 * @param adapter Der ioBroker-Adapter, der für die Verbindung verwendet wird.
 * @param command Der Befehl (3003 oder 3004) zum Auslesen der Rohdaten.
 */
export function readAllRaw(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise((resolve, reject) => {
		// WICHTIG: Die Variable muss IN das Promise, damit sie bei jedem Aufruf neu auf 'false' steht!
		let finished = false;

		const client = new net.Socket();
		const host = adapter.config.host;
		const port = 8888;

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

			// Sofortiger Abbruch bei ungültiger Antwort
			if (responseCommand !== command) {
				client.destroy();
				if (finished) {
					return;
				}
				finished = true;
				reject(
					new Error(`Unerwartete Antwort der Wärmepumpe. Erwartet: ${command}, erhalten: ${responseCommand}`),
				);

				return;
			}

			const totalItems = responseData.readInt32BE(lengthOffset);

			// Plausibilitätsprüfung
			if (totalItems < 0 || totalItems > 10000) {
				client.destroy();
				if (finished) {
					return;
				}
				finished = true;
				reject(new Error(`Ungültige Elementanzahl (${totalItems}) in Antwort ${command}`));

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
			if (finished) {
				return;
			}
			finished = true;
			resolve(allValues);
		});

		client.on('error', (err: Error) => {
			client.destroy();
			if (finished) {
				return;
			}
			finished = true;
			reject(err);
		});

		client.setTimeout(8000);
		client.on('timeout', () => {
			client.destroy();
			if (finished) {
				return;
			}
			finished = true;
			reject(new Error(`Timeout beim Auslesen der kompletten Liste ${command}.`));
		});
	});
}

/**
 * Schreibt einen kompakten Rohdaten-Dump von Liste 3003 (Parameter) und 3004 (Messwerte) ins ioBroker-Log.
 *
 * @param adapter Der ioBroker-Adapter, der für das Logging verwendet wird.
 */
export async function dumpAllRawToLog(adapter: AdapterInstance): Promise<void> {
	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			writeLog('=======================================================', 'info');
			writeLog(`START COMPACT RAW DUMP: LISTE ${command} (${title})`, 'info');
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

/**
 * Schreibt einen Parameter direkt über einen TCP-Socket in die Wärmepumpe.
 *
 * @param adapter Der ioBroker-Adapter.
 * @param paramId Die ID des Parameters (luxWriteId).
 * @param value Der zu setzende Wert.
 */
export function writeRawParameter(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const client = new net.Socket();
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : 8889;

		client.connect(port, host, () => {
			const buffer = Buffer.alloc(12);
			buffer.writeInt32BE(3002, 0); // Befehl 3002 = Parameter schreiben
			buffer.writeInt32BE(paramId, 4); // Die ID des Parameters (z.B. 1 für Wunschtemperatur)
			buffer.writeInt32BE(value, 8); // Der neue Wert
			client.write(buffer);
		});

		client.on('data', (chunk: Buffer) => {
			// Die Pumpe antwortet zur Bestätigung mit dem gesendeten Befehl (3002)
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
				reject(new Error(`Timeout beim Schreiben von Parameter ${paramId}.`));
			}
		});
	});
}

import * as net from 'node:net';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';
import { delay } from './utils';

// =========================================================
// KONSTANTEN
// =========================================================

const CONSTANTS = {
	CMD_WRITE: 3002,
	CMD_READ_PARAM: 3003,
	CMD_READ_VALUE: 3004,
	CMD_READ_VISIBILITY: 3005,
	PORT_TCP: 8889,
	TIMEOUT_READ: 8000,
	TIMEOUT_WRITE: 5000,
	DELAY_RECONNECT: 1000,
};

// =========================================================
// INTELLIGENTE SCHREIB-FUNKTION (READ-BEFORE-WRITE)
// =========================================================
/**
 * Schreibt einen Wert nur dann über das Netzwerk, wenn er vom Ist-Zustand abweicht (Read-before-Write).
 * Erhöht außerdem die internen Schreibzähler.
 *
 * @param adapter Die ioBroker Adapter-Instanz
 * @param cmd Die Parameter-ID (Register)
 * @param val Der zu schreibende Wert (wird bei Bedarf gerundet)
 * @returns Ein Promise, das nach Abschluss des Schreibvorgangs aufgelöst wird
 */
export async function writePumpSafe(adapter: LuxtronikAdapter, cmd: string | number, val: any): Promise<void> {
	const paramId = typeof cmd === 'string' ? parseInt(cmd, 10) : cmd;
	// Zwingendes Runden: Luxtronik V1.x stürzt bei Fließkommazahlen ab.
	let value = typeof val === 'string' ? Math.round(Number(val)) : typeof val === 'number' ? Math.round(val) : val;

	if (typeof value === 'boolean') {
		value = value ? 1 : 0;
	}

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

	await writeRawParameter(adapter, paramId, value);

	if (adapter.currentRawParams) {
		adapter.currentRawParams[paramId] = value;
	}

	if (typeof adapter.writeCyclesToday === 'number') {
		adapter.writeCyclesToday++;
		adapter.writeCyclesTotal++;

		const dpToday = getDpPath('write_cycles_today');
		const dpTotal = getDpPath('write_cycles_total');

		if (dpToday) {
			void adapter.setState(dpToday, { val: adapter.writeCyclesToday, ack: true });
		}
		if (dpTotal) {
			void adapter.setState(dpTotal, { val: adapter.writeCyclesTotal, ack: true });
		}
	}
}

function createCommandBuffer(...values: number[]): Buffer {
	const buffer = Buffer.alloc(values.length * 4);
	for (let i = 0; i < values.length; i++) {
		buffer.writeInt32BE(values[i], i * 4);
	}
	return buffer;
}

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

	const isVisibility = command === CONSTANTS.CMD_READ_VISIBILITY;
	const bytesPerItem = isVisibility ? 1 : 4;
	const totalRequiredLength = headerSize + totalItems * bytesPerItem;

	if (responseData.length < totalRequiredLength) {
		return null;
	}

	const allValues = new Array<number>(totalItems);
	for (let i = 0; i < totalItems; i++) {
		if (isVisibility) {
			allValues[i] = responseData.readInt8(headerSize + i);
		} else {
			allValues[i] = responseData.readInt32BE(headerSize + i * 4);
		}
	}

	return allValues;
}

// =========================================================
// LESE- & SCHREIB-FUNKTIONEN (REIN TCP)
// =========================================================

/**
 * Reads all raw data for the given command via TCP.
 *
 * @param adapter The adapter instance
 * @param command The command number (e.g., 3003, 3004)
 * @returns Promise with the raw data as number array
 */
export function readAllRaw(adapter: LuxtronikAdapter, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		let finished = false;

		const timeout = adapter.setTimeout(() => {
			if (finished) {
				return;
			}
			finished = true;
			client.setTimeout(0);
			client.destroy();
			reject(new Error(`Timeout reading TCP list ${command}.`));
		}, CONSTANTS.TIMEOUT_READ);

		const finish = (err?: Error, data?: number[]): void => {
			if (finished) {
				return;
			}
			finished = true;
			adapter.clearTimeout(timeout);
			client.setTimeout(0);
			client.destroy();
			if (err) {
				reject(err);
			} else {
				resolve(data as number[]);
			}
		};

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
		client.on('close', () => finish(new Error('TCP connection closed unexpectedly before response completed.')));
	});
}

/**
 * Write a raw parameter to the Luxtronik device via TCP.
 *
 * @param adapter The adapter instance
 * @param paramId Parameter ID to write
 * @param value Value to write
 * @returns Promise that resolves when write completes
 */
export function writeRawParameter(adapter: LuxtronikAdapter, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		let finished = false;

		const timeout = adapter.setTimeout(() => {
			if (finished) {
				return;
			}
			finished = true;
			client.setTimeout(0);
			client.destroy();
			reject(new Error(`Timeout writing TCP parameter ${paramId}.`));
		}, CONSTANTS.TIMEOUT_WRITE);

		const finish = (err?: Error): void => {
			if (finished) {
				return;
			}
			finished = true;
			adapter.clearTimeout(timeout);
			client.setTimeout(0);
			client.destroy();
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		};

		client.connect(port, host, () => {
			client.write(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value));
		});

		client.on('data', (chunk: Buffer) => {
			if (chunk.length >= 4 && chunk.readInt32BE(0) === CONSTANTS.CMD_WRITE) {
				finish();
			}
		});

		client.on('error', (err: Error) => finish(err));
		client.on('close', () => finish(new Error('TCP connection closed unexpectedly before response completed.')));
	});
}

// =========================================================
// LOGGING-FUNKTION (DUMP)
// =========================================================

/**
 * Dump all raw parameters, values, visibilities, and Modbus diagnostic results to the adapter log.
 *
 * @param adapter The ioBroker adapter instance used for logging and timing.
 */
export async function dumpAllRawToLog(adapter: LuxtronikAdapter): Promise<void> {
	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			await delay(adapter, CONSTANTS.DELAY_RECONNECT);

			writeLog('=======================================================', 'info');
			writeLog(`START COMPACT RAW DUMP: LIST ${command} (${title}) via TCP`, 'info');
			writeLog('=======================================================', 'info');

			try {
				const data = await readAllRaw(adapter, command);
				for (let i = 0; i < data.length; i++) {
					writeLog(`[RAW ${command}] Index ${i.toString().padStart(3, ' ')} = ${data[i]}`, 'info');
				}
				writeLog(`--- END OF LIST ${command} (Total ${data.length} indices logged) ---`, 'info');
			} catch (listErr: unknown) {
				const msg = listErr instanceof Error ? listErr.message : String(listErr);
				writeLog(`--- LIST ${command} FAILED: ${msg} ---`, 'warn');
			}
			writeLog('=======================================================', 'info');
		};

		await delay(adapter, CONSTANTS.DELAY_RECONNECT);
		await dumpList(CONSTANTS.CMD_READ_PARAM, 'PARAMETERS');
		await dumpList(CONSTANTS.CMD_READ_VALUE, 'VALUES');
		await dumpList(CONSTANTS.CMD_READ_VISIBILITY, 'VISIBILITIES');

		if (adapter.modbusManager) {
			await delay(adapter, CONSTANTS.DELAY_RECONNECT);
			writeLog('=======================================================', 'info');
			writeLog('START MODBUS TCP DIAGNOSTIC DUMP (PORT 502)', 'info');
			writeLog('=======================================================', 'info');
			const modbusLines = await adapter.modbusManager.runDiagnosticDump();
			for (const line of modbusLines) {
				writeLog(line, 'info');
			}
			writeLog('--- END OF MODBUS DIAGNOSTIC DUMP ---', 'info');
			writeLog('=======================================================', 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Error executing raw dump: ${msg}`, 'error');
	}
}

/**
 * Pushes a hardware write task into a single-threaded execution queue to guarantee transmission safety.
 *
 * @param adapter The adapter instance.
 * @param cmd Target parameter register ID.
 * @param val The value payload to map.
 * @returns A promise that completes once the queue executes this task.
 */
export async function queueWrite(adapter: LuxtronikAdapter, cmd: string | number, val: any): Promise<void> {
	let fw = adapter.systemFirmware || '';
	if (!fw) {
		const fwState = await adapter.getStateAsync('Information.12_SystemInfo.firmware');
		fw = typeof fwState?.val === 'string' ? fwState.val : '';
	}
	if (fw.includes('1.90') || fw.includes('2.90')) {
		adapter.log.warn(
			`[PROTECTION] Write command to register ${cmd} blocked! Firmware ${fw} has a known manufacturer bug causing hardware crashes. Please downgrade to <= V X.89. | Schreibbefehl blockiert! Firmware ${fw} verursacht Systemabstürze. Bitte auf <= V X.89 downgraden.`,
		);
		return;
	}

	return new Promise((resolve, reject) => {
		adapter.writeQueue.push(async () => {
			try {
				await writePumpSafe(adapter, cmd, val);
				resolve();
			} catch (err) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		});
		void processQueue(adapter);
	});
}

async function processQueue(adapter: LuxtronikAdapter): Promise<void> {
	if (adapter.isWriting || adapter.writeQueue.length === 0) {
		return;
	}

	adapter.isWriting = true;

	const isOldFirmware =
		adapter.systemFirmware && (adapter.systemFirmware.startsWith('1.') || adapter.systemFirmware.startsWith('V1.'));

	const delayBetweenWrites = isOldFirmware ? 500 : 100;

	try {
		while (adapter.writeQueue.length > 0) {
			if (isOldFirmware) {
				let waitCounter = 0;
				while (adapter.updateRunning && waitCounter < 20) {
					await new Promise<void>(resolve => adapter.setTimeout(resolve, 250));
					waitCounter++;
				}
				if (waitCounter >= 20 && adapter.isDebugLogActive) {
					writeLog('Queue wait timeout reached! Forcing write operation despite active read lock.', 'warn');
				}
			}

			const task = adapter.writeQueue.shift();

			if (task) {
				try {
					await task();
					await new Promise<void>(resolve => adapter.setTimeout(resolve, delayBetweenWrites));
				} catch (taskError: any) {
					writeLog(
						`Error processing specific serial write task sequence in queue: ${taskError.message}`,
						'error',
					);
				}
			}
		}
	} finally {
		adapter.isWriting = false;
	}
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import * as net from 'node:net';
import { WebSocket, type RawData } from 'ws';
import { writeLog } from './logger';

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

	// Warten, bis zumindest der Header vollständig übertragen wurde
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
	// Warten, bis alle angekündigten Datenpakete angekommen sind
	if (responseData.length < totalRequiredLength) {
		return null;
	}

	// O(1) Speicherallokation: Array in exakt der benötigten Größe erstellen
	const allValues = new Array<number>(totalItems);
	for (let i = 0; i < totalItems; i++) {
		allValues[i] = responseData.readInt32BE(headerSize + i * 4);
	}
	return allValues;
}

// =========================================================
// ZENTRALER VERBINDUNGS-HANDLER (DRY-Prinzip)
// =========================================================

/**
 * Kontext-Objekt zur Verwaltung einer aktiven Verbindung (TCP oder WebSocket).
 *
 * @template T Der Datentyp, der beim erfolgreichen Auflösen des Promises erwartet wird (z.B. number[] oder void).
 */
interface ConnectionContext<T> {
	/** Die Instanz des ioBroker-Adapters */
	adapter: AdapterInstance;
	/** Das aktive Socket-Objekt (Node TCP oder ws) */
	socket: net.Socket | WebSocket;
	/** Ein optionaler Timeout-Timer des Adapters */
	timeout?: ioBroker.Timeout;
	/** Die Resolve-Funktion des Promises */
	resolve: (val: T | PromiseLike<T>) => void;
	/** Die Reject-Funktion des Promises für Fehlerfälle */
	reject: (err: Error) => void;
}

/**
 * Erstellt eine standardisierte Finish-Funktion, die eine Verbindung sauber trennt,
 * Timeouts löscht und das Promise (Resolve oder Reject) bedient.
 *
 * @template T Der Rückgabetyp der Resolve-Funktion.
 * @param ctx Das Kontext-Objekt der aktuellen Verbindung.
 * @returns Eine Callback-Funktion, die bei Erfolg oder Fehler aufgerufen wird.
 */
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
			// net.Socket (TCP) Logik
			ctx.socket.setTimeout(0);
			ctx.socket.destroy();
			if (err) {
				ctx.reject(err);
			} else {
				ctx.resolve(data as T);
			}
		} else {
			// WebSocket Logik (Warten auf bestätigtes close-Event)
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
 * Liest eine komplette Datenliste (Parameter oder Messwerte) aus der Luxtronik aus.
 * Entscheidet automatisch, ob TCP oder WebSocket genutzt wird.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param command Der Lese-Befehl (z.B. 3003 oder 3004).
 * @returns Ein Promise, das ein Array mit den ausgelesenen Werten zurückgibt.
 */
export function readAllRaw(adapter: AdapterInstance, command: number): Promise<number[]> {
	if (shouldUseWs(adapter)) {
		return readAllRawWs(adapter, command);
	}
	return readAllRawTcp(adapter, command);
}

/**
 * Interne Funktion: Liest Daten über eine WebSocket-Verbindung.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param command Der Lese-Befehl (3003/3004).
 * @returns Ein Promise mit den ausgelesenen Werten.
 */
function readAllRawWs(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		const ctx: ConnectionContext<number[]> = { adapter, socket: ws, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout beim Auslesen der Liste ${command}.`)),
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

/**
 * Interne Funktion: Liest Daten über eine klassische TCP-Verbindung.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param command Der Lese-Befehl (3003/3004).
 * @returns Ein Promise mit den ausgelesenen Werten.
 */
function readAllRawTcp(adapter: AdapterInstance, command: number): Promise<number[]> {
	return new Promise<number[]>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		const ctx: ConnectionContext<number[]> = { adapter, socket: client, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`Timeout beim Auslesen der TCP Liste ${command}.`)),
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
 * Schreibt einen einzelnen Parameter (Befehl 3002) in die Luxtronik-Steuerung.
 * Wählt automatisch zwischen TCP und WebSocket.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param paramId Die ID/Index des zu schreibenden Parameters.
 * @param value Der zu setzende numerische Wert.
 * @returns Ein Promise, das nach erfolgreichem Schreibvorgang aufgelöst wird.
 */
export function writeRawParameter(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	if (shouldUseWs(adapter)) {
		return writeRawParameterWs(adapter, paramId, value);
	}
	return writeRawParameterTcp(adapter, paramId, value);
}

/**
 * Interne Funktion: Schreibt einen Parameter via WebSocket.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param paramId Die Parameter-ID.
 * @param value Der Wert.
 * @returns Promise (Void).
 */
function writeRawParameterWs(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_WS;
		const ws = new WebSocket(`ws://${host}:${port}`, 'luxnet');
		ws.binaryType = 'nodebuffer';

		const ctx: ConnectionContext<void> = { adapter, socket: ws, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`WebSocket Timeout beim Schreiben von Parameter ${paramId}.`)),
			CONSTANTS.TIMEOUT_WRITE,
		);

		ws.on('open', () => {
			ws.send(createCommandBuffer(CONSTANTS.CMD_WRITE, paramId, value), { binary: true });
		});

		ws.on('message', () => finish());
		ws.on('error', (err: Error) => finish(err));
	});
}

/**
 * Interne Funktion: Schreibt einen Parameter via TCP.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param paramId Die Parameter-ID.
 * @param value Der Wert.
 * @returns Promise (Void).
 */
function writeRawParameterTcp(adapter: AdapterInstance, paramId: number, value: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const host = adapter.config.host || '127.0.0.1';
		const port = adapter.config.port ? Number(adapter.config.port) : CONSTANTS.PORT_TCP;
		const client = new net.Socket();

		const ctx: ConnectionContext<void> = { adapter, socket: client, resolve, reject };
		const finish = createFinisher(ctx);

		ctx.timeout = adapter.setTimeout(
			() => finish(new Error(`Timeout beim Schreiben von Parameter TCP ${paramId}.`)),
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
 * Liest die kompletten Parameter- und Messwert-Listen aus und schreibt diese für Debug-Zwecke formatiert ins ioBroker Log.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @returns Ein Promise, das nach Abschluss des Log-Vorgangs aufgelöst wird.
 */
export async function dumpAllRawToLog(adapter: AdapterInstance): Promise<void> {
	const useWs = shouldUseWs(adapter);

	try {
		const dumpList = async (command: number, title: string): Promise<void> => {
			await delay(adapter, CONSTANTS.DELAY_RECONNECT);

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

		await delay(adapter, CONSTANTS.DELAY_RECONNECT);
		await dumpList(CONSTANTS.CMD_READ_PARAM, 'PARAMETER');
		await dumpList(CONSTANTS.CMD_READ_VALUE, 'MESSWERTE');
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Fehler beim Ausführen des Raw-Dumps: ${msg}`, 'error');
	}
}

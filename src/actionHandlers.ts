import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import { getNumber } from './utils';

// =========================================================
// TYPEN & KONSTANTEN
// =========================================================

/**
 * Erweitert die ioBroker Adapter-Instanz um die spezifischen Methoden für Aktionen.
 */
export interface ActionAdapter extends AdapterInstance {
	/** Synchronisiert einen Wert mit der Wärmepumpe */
	syncConfigValue: (key: string, value: any) => Promise<void>;
}

const CONSTANTS = {
	/** Status-Code für den Ruhezustand der Anlage */
	STATE_IDLE: 5,
	/** Befehlswert für den Fußpunkt beim Zwangsheizen */
	FORCE_HEATING_OFFSET: 35,
};

// =========================================================
// AKTIONEN
// =========================================================

/**
 * Erzwingt die Warmwasserbereitung durch temporäre Erhöhung des Sollwerts.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die ID des auslösenden Datenpunkts.
 */
export async function handleZwangswarmwasser(adapter: ActionAdapter, id: string): Promise<void> {
	try {
		const localId = id.replace(`${adapter.namespace}.`, '');
		await adapter.setState(localId, { val: false, ack: true });

		// Hysterese zusätzlich auslesen, um den perfekten Zielwert zu berechnen
		const [wwIstState, wwSollState, wwHystereseState] = await Promise.all([
			adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
			adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
			adapter.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
		]);

		const wwIst = getNumber(wwIstState);
		const wwSoll = getNumber(wwSollState);
		const wwHysterese = getNumber(wwHystereseState, 2); // Fallback auf 2K, falls nicht gefunden

		if (wwIst >= wwSoll - 1) {
			writeLog(
				`Forced hot water: Ignored - Actual (${wwIst}°C) is already sufficient (Target: ${wwSoll}°C).`,
				'info',
			);
			return;
		}

		// Neuen Sollwert berechnen: Ist-Wert + aktuelle Hysterese + 1.5K Puffer
		let forceSoll = wwIst + wwHysterese + 1.5;

		// Sicherheitsprüfung: Maximaltemperatur kappen, um Regler-Fehler zu vermeiden
		const MAX_WW_TEMP = 70;
		if (forceSoll > MAX_WW_TEMP) {
			forceSoll = MAX_WW_TEMP;
		}

		// Auf eine Nachkommastelle runden für saubere Übergabe
		forceSoll = Math.round(forceSoll * 10) / 10;

		// Statt der Hysterese wird nun der Warmwasser-Sollwert überschrieben
		await adapter.syncConfigValue('warmwater_temperature', forceSoll);

		writeLog(
			`Forced hot water: Triggered - Actual (${wwIst}°C) < Target-1 (${wwSoll - 1}°C). Target temperature temporarily set to ${forceSoll}°C.`,
			'info',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Forced hot water: Error during execution - ${msg}`, 'error');
	}
}

/**
 * Erzwingt den Heizbetrieb durch temporäre Erhöhung des Fußpunktes.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die ID des auslösenden Datenpunkts.
 */
export async function handleZwangsheizen(adapter: ActionAdapter, id: string): Promise<void> {
	try {
		const localId = id.replace(`${adapter.namespace}.`, '');
		await adapter.setState(localId, { val: false, ack: true });

		const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
			adapter.getStateAsync(getDpPath('WP_BZ_akt')),
			adapter.getStateAsync(getDpPath('temperature_return')),
			adapter.getStateAsync(getDpPath('temperature_target_return')),
			adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
		]);

		const bzVal = getNumber(bzState, -1);
		const ruecklauf = getNumber(ruecklaufState);
		const ruecklaufSoll = getNumber(ruecklaufSollState);
		const hysterese = getNumber(hystereseState);

		if (bzVal !== CONSTANTS.STATE_IDLE) {
			writeLog(`Forced heating: Ignored - System is not idle (Status: ${bzVal}).`, 'info');
			return;
		}

		if (ruecklauf >= ruecklaufSoll + hysterese) {
			writeLog(
				`Forced heating: Ignored - Return temperature high enough (${ruecklauf}°C >= ${ruecklaufSoll + hysterese}°C).`,
				'info',
			);
			return;
		}

		await adapter.syncConfigValue('heating_curve_parallel_offset', CONSTANTS.FORCE_HEATING_OFFSET);
		writeLog(
			`Forced heating: Triggered - Base point temporarily set to ${CONSTANTS.FORCE_HEATING_OFFSET}°C.`,
			'info',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Forced heating: Error during execution - ${msg}`, 'error');
	}
}

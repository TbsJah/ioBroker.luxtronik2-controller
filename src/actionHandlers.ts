import { writeLog } from './logger';
import { pvIsBoostActive } from './pvManager';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';
import { getNumber } from './utils';
// =========================================================
// TYPEN & KONSTANTEN
// =========================================================

const CONSTANTS = {
	/** Status-Code für den Ruhezustand der Anlage */
	STATE_IDLE: 5,
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
export async function handleZwangswarmwasser(adapter: LuxtronikAdapter, id: string): Promise<void> {
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

		if (adapter.forcedWwOriginalTarget === null || adapter.forcedWwOriginalTarget === undefined) {
			const fallbackWw =
				parseFloat(String(adapter.config.sync_warmwater_target_temperature ?? 54).replace(',', '.')) || 54;
			adapter.forcedWwOriginalTarget =
				adapter.config.idle_defaults_aktiv === true || pvIsBoostActive ? fallbackWw : wwSoll;
		}

		// Statt der Hysterese wird nun der Warmwasser-Sollwert überschrieben
		await adapter.syncConfigValue('temperature_hot_water_target', forceSoll);

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
 * Erzwingt den Heizbetrieb durch temporäre Erhöhung der Parallelverschiebung.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die ID des auslösenden Datenpunkts.
 */
export async function handleZwangsheizen(adapter: LuxtronikAdapter, id: string): Promise<void> {
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
		const hysterese = getNumber(hystereseState, 1.5);

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

		const neededDeltaK = Math.max(
			hysterese + 0.5,
			Math.ceil((ruecklauf - ruecklaufSoll + hysterese + 0.5) * 10) / 10,
		);

		await adapter.activateForcedHeatingBoost('ForcedHeating', neededDeltaK);
		writeLog(
			`Forced heating: Triggered - Dynamic heating offset temporarily raised by +${neededDeltaK} K.`,
			'info',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Forced heating: Error during execution - ${msg}`, 'error');
	}
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';
import { getDpPath } from './stateMapping';

// =========================================================
// TYPEN & KONSTANTEN
// =========================================================

/**
 * Erweitert die ioBroker Adapter-Instanz um die spezifischen Methoden für Aktionen.
 */
export interface ActionAdapter extends AdapterInstance {
	/** Synchronisiert einen Wert mit der Wärmepumpe */
	syncConfigValue: (key: string, value: number) => Promise<void>;
}

const CONSTANTS = {
	/** Status-Code für den Ruhezustand der Anlage */
	STATE_IDLE: 5,
	/** Befehlswert für den Fußpunkt beim Zwangsheizen */
	FORCE_HEATING_OFFSET: 35,
	/** Temporäre Hysterese für die Zwangswarmwasserbereitung */
	FORCE_WW_HYSTERESIS: 1,
};

// =========================================================
// HILFSFUNKTIONEN
// =========================================================

/**
 * Extrahiert typsicher einen numerischen Wert aus einem ioBroker-State.
 *
 * @param state Der abgerufene ioBroker-State.
 * @param fallback Der Fallback-Wert, falls der State ungültig oder keine Zahl ist (Standard: 0).
 * @returns Die ausgelesene Zahl oder der Fallback-Wert.
 */
function getNumber(state: ioBroker.State | null | undefined, fallback = 0): number {
	return typeof state?.val === 'number' ? state.val : fallback;
}

// =========================================================
// AKTIONEN (HANDLERS)
// =========================================================

/**
 * Behandelt die manuelle Auslösung der Zwangswarmwasserbereitung.
 * Setzt die Hysterese temporär auf 1K, sofern das Wasser nicht ohnehin warm genug ist.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die State-ID des auslösenden Buttons (wird zurückgesetzt).
 * @returns Promise, das nach Abschluss der Aktion aufgelöst wird.
 */
export async function handleZwangswarmwasser(adapter: ActionAdapter, id: string): Promise<void> {
	try {
		// Button sofort im ioBroker zurücksetzen (Taster-Verhalten)
		await adapter.setForeignStateAsync(id, { val: false, ack: true });

		// States parallel abrufen
		const [wwIstState, wwSollState] = await Promise.all([
			adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
			adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
		]);

		const wwIst = getNumber(wwIstState);
		const wwSoll = getNumber(wwSollState);

		// Early Return: Abbruchbedingung prüfen
		if (wwIst >= wwSoll - 1) {
			writeLog(
				`Zwangswarmwasser: Ignoriert – Ist (${wwIst}°C) ist bereits ausreichend (Soll: ${wwSoll}°C).`,
				'info',
			);
			return;
		}

		// Aktion ausführen
		await adapter.syncConfigValue('hotWaterTemperatureHysteresis', CONSTANTS.FORCE_WW_HYSTERESIS);
		writeLog(
			`Zwangswarmwasser: Ausgelöst – Ist (${wwIst}°C) < Soll-1 (${wwSoll - 1}°C). Hysterese temporär auf ${CONSTANTS.FORCE_WW_HYSTERESIS}K gesetzt.`,
			'info',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Zwangswarmwasser: Fehler bei der Ausführung - ${msg}`, 'error');
	}
}

/**
 * Behandelt die manuelle Auslösung des Zwangsheizens.
 * Setzt den Fußpunkt der Heizkurve hoch, sofern die Anlage im Leerlauf ist und Bedarf besteht.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param id Die State-ID des auslösenden Buttons (wird zurückgesetzt).
 * @returns Promise, das nach Abschluss der Aktion aufgelöst wird.
 */
export async function handleZwangsheizen(adapter: ActionAdapter, id: string): Promise<void> {
	try {
		// Button sofort im ioBroker zurücksetzen (Taster-Verhalten)
		await adapter.setForeignStateAsync(id, { val: false, ack: true });

		// Alle benötigten States parallel abrufen
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

		// Early Returns: Abbruchbedingungen prüfen
		if (bzVal !== CONSTANTS.STATE_IDLE) {
			writeLog(`Zwangsheizen: Ignoriert – Anlage ist nicht im Leerlauf (Status: ${bzVal}).`, 'info');
			return;
		}

		if (ruecklauf >= ruecklaufSoll + hysterese) {
			writeLog(
				`Zwangsheizen: Ignoriert – Rücklauf hoch genug (${ruecklauf}°C >= ${ruecklaufSoll + hysterese}°C).`,
				'info',
			);
			return;
		}

		// Aktion ausführen
		await adapter.syncConfigValue('heating_curve_parallel_offset', CONSTANTS.FORCE_HEATING_OFFSET);
		writeLog(
			`Zwangsheizen: Ausgelöst – Fusspunkt temporär auf ${CONSTANTS.FORCE_HEATING_OFFSET}°C gesetzt.`,
			'info',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`Zwangsheizen: Fehler bei der Ausführung - ${msg}`, 'error');
	}
}

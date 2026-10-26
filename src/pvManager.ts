import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';

// =========================================================
// STATE VARIABLES
// =========================================================

let pvStartTimer: ioBroker.Timeout | undefined;
let pvStopTimer: ioBroker.Timeout | undefined;
export let pvIsBoostActive = false;
export let pvWaitingForCycleEnd = false;

// Cache für die ursprünglichen Werte vor dem Boost
let originalWw: number | null = null;
let originalHz: number | null = null;

// =========================================================
// MAIN LOGIC
// =========================================================

/**
 * Initialisiert die PV-Überwachung, abonniert den Fremd-Datenpunkt.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
export async function initPvManagement(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;
	if (!config.pv_active || !config.pv_feed_in_dp || config.pv_feed_in_dp.trim() === '') {
		writeLog('[PV] PV surplus management is disabled or no valid datapoint provided.', 'debug');
		return;
	}

	try {
		// Abonniere den Fremd-Datenpunkt (z.B. vom SMA oder Shelly Adapter)
		await adapter.subscribeForeignStatesAsync(config.pv_feed_in_dp.trim());
		writeLog(
			`[PV] Initialized PV management. Subscribed to grid feed-in datapoint: ${config.pv_feed_in_dp}`,
			'info',
		);

		pvIsBoostActive = false;
		pvWaitingForCycleEnd = false;

		// --- NEUE DATENPUNKTE INITIALISIEREN ---
		const dpActive = getDpPath('pv_boost_active');
		const dpSince = getDpPath('pv_boost_active_since');

		if (dpActive) {
			await adapter.setState(dpActive, { val: false, ack: true });
		}
		if (dpSince) {
			await adapter.setState(dpSince, { val: '', ack: true });
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error initializing PV management: ${msg}`, 'error');
	}
}

/**
 * Wird bei jeder Änderung eines Foreign-States aufgerufen. Prüft den Überschusswert.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param id Die geänderte OID.
 * @param state Der neue State.
 */
export function handlePvFeedInChange(adapter: LuxtronikAdapter, id: string, state: ioBroker.State): void {
	const config = adapter.config;
	if (
		!config.pv_active ||
		!config.pv_feed_in_dp ||
		id !== config.pv_feed_in_dp.trim() ||
		!state ||
		typeof state.val !== 'number'
	) {
		return;
	}

	// 1. Wert erfassen und ggf. von kW in Watt umrechnen
	let rawValue = state.val;
	if (config.pv_feed_in_unit === 'kW') {
		rawValue = rawValue * 1000;
	}

	// 2. Einspeise-Wert in absoluten Überschuss (positiver Watt-Wert) umrechnen
	let surplus = 0;
	if (config.pv_feed_in_sign === 'negative') {
		surplus = rawValue < 0 ? Math.abs(rawValue) : 0;
	} else {
		surplus = rawValue > 0 ? rawValue : 0;
	}

	const thresholdStart = config.pv_threshold_start || 2000;
	// Neue Ausschalt-Schwelle (Standard = 0 Watt)
	const thresholdStop = config.pv_threshold_stop !== undefined ? Number(config.pv_threshold_stop) : 0;
	const delayStartMs = (config.pv_delay_start || 5) * 60000;
	const delayStopMs = (config.pv_delay_stop || 10) * 60000;

	// 3. Status-Entscheidung (Hysterese-Logik)
	if (surplus >= thresholdStart) {
		// Überschuss hoch genug -> Starten / am Leben halten
		if (pvStopTimer) {
			adapter.clearTimeout(pvStopTimer);
			pvStopTimer = undefined;
			writeLog(`[PV] Surplus restored (${surplus} W >= ${thresholdStart} W). Stop timer cancelled.`, 'debug');
		}

		if (!pvIsBoostActive && !pvStartTimer) {
			writeLog(
				`[PV] Surplus of ${surplus} W exceeds start threshold (${thresholdStart} W). Starting ${config.pv_delay_start} min activation timer.`,
				'info',
			);
			pvStartTimer = adapter.setTimeout(() => activateBoost(adapter), delayStartMs);
		}
	} else if (surplus <= thresholdStop) {
		// Überschuss kritisch niedrig (Netzbezug) -> Beenden
		if (pvStartTimer) {
			adapter.clearTimeout(pvStartTimer);
			pvStartTimer = undefined;
			writeLog(`[PV] Surplus dropped to ${surplus} W (<= ${thresholdStop} W). Start timer cancelled.`, 'debug');
		}

		if (pvIsBoostActive && !pvStopTimer && !pvWaitingForCycleEnd) {
			writeLog(
				`[PV] Surplus dropped to ${surplus} W (<= stop threshold ${thresholdStop} W). Starting ${config.pv_delay_stop} min deactivation timer.`,
				'info',
			);
			pvStopTimer = adapter.setTimeout(() => initiateDeactivation(adapter), delayStopMs);
		}
	} else {
		// GRAUZONE: Der Wert liegt zwischen Start- und Stop-Schwelle (z.B. 600 W).
		// - Reicht nicht zum neuen Einschalten (Start-Timer abbrechen).
		// - Reicht aber, um einen bereits laufenden Boost am Leben zu erhalten (Stop-Timer abbrechen).
		if (pvStartTimer) {
			adapter.clearTimeout(pvStartTimer);
			pvStartTimer = undefined;
			writeLog(`[PV] Surplus ${surplus} W is below start threshold. Start timer cancelled.`, 'debug');
		}
		if (pvStopTimer) {
			adapter.clearTimeout(pvStopTimer);
			pvStopTimer = undefined;
			writeLog(`[PV] Surplus ${surplus} W is above stop threshold. Stop timer cancelled.`, 'debug');
		}
	}
}

/**
 * Aktiviert den Boost und hebt die konfigurierten Sollwerte an.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
async function activateBoost(adapter: LuxtronikAdapter): Promise<void> {
	pvStartTimer = undefined;
	if (pvIsBoostActive) {
		return;
	}

	const config = adapter.config;
	try {
		// Aktuelle Ist-Werte auslesen, um sie später wiederherstellen zu können
		const wwPath = getDpPath('Wamwassertemperatur_Soll');
		const hzPath = getDpPath('heating_temperature');

		const currentWwState = wwPath ? await adapter.getStateAsync(wwPath) : null;
		const currentHzState = hzPath ? await adapter.getStateAsync(hzPath) : null;

		let baseWw = currentWwState && typeof currentWwState.val === 'number' ? currentWwState.val : null;
		let baseHz = currentHzState && typeof currentHzState.val === 'number' ? currentHzState.val : null;

		// FIX: Bevorzuge die sicheren Config-Standardwerte als Basis, falls die Hardware-Schutz-Vorgaben aktiv sind.
		// Das verhindert, dass künstliche Werte der Takt-Optimierung als "normal" eingestuft und weiter gepusht werden.
		if (config.idle_defaults_aktiv) {
			if (config.sync_warmwater_target_temperature) {
				baseWw = Number(config.sync_warmwater_target_temperature);
			}
			if (config.fusspunkt) {
				baseHz = Number(config.fusspunkt);
			}
		}

		originalWw = baseWw;
		originalHz = baseHz;

		const boostWw = config.pv_boost_ww || 0;
		const boostHz = config.pv_boost_hz || 0;

		writeLog(`[PV] Timer finished. Activating boost! WW: +${boostWw}K, HZ: +${boostHz}K`, 'info');

		// Werte über die Standard-Adapter-Funktion schreiben (schickt es direkt via Modbus an die Luxtronik)
		if (originalWw !== null && boostWw > 0 && wwPath) {
			await adapter.setState(wwPath, { val: originalWw + boostWw, ack: false });
		}
		if (originalHz !== null && boostHz > 0 && hzPath) {
			await adapter.setState(hzPath, { val: originalHz + boostHz, ack: false });
		}

		pvIsBoostActive = true;
		pvWaitingForCycleEnd = false;

		// --- NEUE DATENPUNKTE AKTUALISIEREN ---
		const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
		const dpActive = getDpPath('pv_boost_active');
		const dpSince = getDpPath('pv_boost_active_since');
		const dpLast = getDpPath('pv_boost_last_activation');

		if (dpActive) {
			await adapter.setState(dpActive, { val: true, ack: true });
		}
		if (dpSince) {
			await adapter.setState(dpSince, { val: nowStr, ack: true });
		}
		if (dpLast) {
			await adapter.setState(dpLast, { val: nowStr, ack: true });
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error activating boost: ${msg}`, 'error');
	}
}

/**
 * Startet den Abbruch. Prüft, ob der Verdichter-Takt noch beendet werden soll.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
async function initiateDeactivation(adapter: LuxtronikAdapter): Promise<void> {
	pvStopTimer = undefined;
	if (!pvIsBoostActive) {
		return;
	}

	const config = adapter.config;
	writeLog('[PV] Deactivation timer finished.', 'info');

	if (config.pv_finish_cycle) {
		try {
			const bzPath = getDpPath('WP_BZ_akt');
			const bzState = bzPath ? await adapter.getStateAsync(bzPath) : null;
			const bzVal = bzState ? Number(bzState.val) : 5;

			// Luxtronik Status 5 = 'Keine Anforderung' (Standby)
			if (bzVal !== 5) {
				writeLog(
					`[PV] Compressor is active (Status: ${bzVal}). Waiting for cycle to finish before resetting values.`,
					'info',
				);
				pvWaitingForCycleEnd = true;
				return; // Abbruch hier! Rest passiert automatisch über handlePvCycleCheck()
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			writeLog(`[PV] Error checking compressor status: ${msg}`, 'error');
		}
	}

	await deactivateBoost(adapter);
}

/**
 * Setzt die Werte hart auf den Ursprung zurück.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
async function deactivateBoost(adapter: LuxtronikAdapter): Promise<void> {
	try {
		writeLog('[PV] Reverting values to original base targets.', 'info');
		const wwPath = getDpPath('Wamwassertemperatur_Soll');
		const hzPath = getDpPath('heating_temperature');

		if (originalWw !== null && wwPath) {
			await adapter.setState(wwPath, { val: originalWw, ack: false });
		}
		if (originalHz !== null && hzPath) {
			await adapter.setState(hzPath, { val: originalHz, ack: false });
		}

		pvIsBoostActive = false;
		pvWaitingForCycleEnd = false;
		originalWw = null;
		originalHz = null;

		// --- NEUE DATENPUNKTE AKTUALISIEREN ---
		const dpActive = getDpPath('pv_boost_active');
		const dpSince = getDpPath('pv_boost_active_since');

		if (dpActive) {
			await adapter.setState(dpActive, { val: false, ack: true });
		}
		if (dpSince) {
			await adapter.setState(dpSince, { val: '', ack: true });
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error deactivating boost: ${msg}`, 'error');
	}
}

/**
 * Überwacht den Betriebszustand (WP_BZ_akt). Wird aus der main.ts aufgerufen.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 * @param newBzVal Der neue Wert von WP_BZ_akt.
 */
export async function handlePvCycleCheck(adapter: LuxtronikAdapter, newBzVal: number): Promise<void> {
	if (pvWaitingForCycleEnd && newBzVal === 5) {
		writeLog('[PV] Compressor finished cycle (Status: 5). Resetting PV boost targets now.', 'info');
		await deactivateBoost(adapter);
	}
}

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

// Flags für die dynamische Prioritätssteuerung
let activeBoostWwApplied = false;
let activeBoostHzApplied = false;

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
		await adapter.subscribeForeignStatesAsync(config.pv_feed_in_dp.trim());
		writeLog(
			`[PV] Initialized PV management. Subscribed to grid feed-in datapoint: ${config.pv_feed_in_dp}`,
			'info',
		);

		pvIsBoostActive = false;
		pvWaitingForCycleEnd = false;
		activeBoostWwApplied = false;
		activeBoostHzApplied = false;

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

	let rawValue = state.val;
	if (config.pv_feed_in_unit === 'kW') {
		rawValue = rawValue * 1000;
	}

	let surplus = 0;
	if (config.pv_feed_in_sign === 'negative') {
		surplus = rawValue < 0 ? Math.abs(rawValue) : 0;
	} else {
		surplus = rawValue > 0 ? rawValue : 0;
	}

	const thresholdStart = config.pv_threshold_start || 2000;
	const thresholdStop = config.pv_threshold_stop !== undefined ? Number(config.pv_threshold_stop) : 0;
	const delayStartMs = (config.pv_delay_start || 5) * 60000;
	const delayStopMs = (config.pv_delay_stop || 10) * 60000;

	if (surplus >= thresholdStart) {
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
		} else if (pvIsBoostActive) {
			// Periodische Überprüfung der Prioritäten bei laufendem PV-Boost
			void evaluatePvBoost(adapter);
		}
	} else if (surplus <= thresholdStop) {
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
		// Grauzone (Hysterese)
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
		if (pvIsBoostActive) {
			// Auch in der Grauzone die Prioritäten weiter dynamisch evaluieren
			void evaluatePvBoost(adapter);
		}
	}
}

/**
 * Legt die Originalwerte ab und startet den dynamischen Boost.
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
		const wwPath = getDpPath('Wamwassertemperatur_Soll');
		const hzPath = getDpPath('heating_temperature');

		const currentWwState = wwPath ? await adapter.getStateAsync(wwPath) : null;
		const currentHzState = hzPath ? await adapter.getStateAsync(hzPath) : null;

		let baseWw = currentWwState && typeof currentWwState.val === 'number' ? currentWwState.val : null;
		let baseHz = currentHzState && typeof currentHzState.val === 'number' ? currentHzState.val : null;

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
		pvIsBoostActive = true;
		pvWaitingForCycleEnd = false;
		activeBoostWwApplied = false;
		activeBoostHzApplied = false;

		writeLog('[PV] Timer finished. Activating boost logic...', 'info');
		await evaluatePvBoost(adapter);

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
 * Evaluiert fortlaufend die Prioritäten und schreibt die Sollwerte dynamisch in die Anlage.
 *
 * @param adapter Die aktuelle Adapter-Instanz.
 */
async function evaluatePvBoost(adapter: LuxtronikAdapter): Promise<void> {
	if (!pvIsBoostActive) {
		return;
	}

	try {
		const config = adapter.config;
		const priority = config.pv_priority || 'both';

		// Sicherheits-Parsing: Zwingt Eingaben aus dem Config-UI garantiert zu Nummern
		const boostWwAmount = Number(config.pv_boost_ww) || 0;
		const boostHzAmount = Number(config.pv_boost_hz) || 0;

		const wwPath = getDpPath('Wamwassertemperatur_Soll');
		const hzPath = getDpPath('heating_temperature');

		const wwIstState = await adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist'));
		const hzIstState = await adapter.getStateAsync(getDpPath('temperature_return'));

		const wwIst = wwIstState && typeof wwIstState.val === 'number' ? wwIstState.val : 0;
		const hzIst = hzIstState && typeof hzIstState.val === 'number' ? hzIstState.val : 0;

		// 0.5K Toleranz gegen Flapping, falls die Temperatur genau auf der Kante steht
		const isWwFull = originalWw !== null && wwIst >= originalWw + boostWwAmount - 0.5;
		const isHzFull = originalHz !== null && hzIst >= originalHz + boostHzAmount - 0.5;

		let shouldBoostWw = false;
		let shouldBoostHz = false;

		if (priority === 'ww') {
			if (!isWwFull) {
				shouldBoostWw = true;
			} else {
				shouldBoostHz = true; // Warmwasser voll -> Überschuss in die Heizung umleiten
			}
		} else if (priority === 'hz') {
			if (!isHzFull) {
				shouldBoostHz = true;
			} else {
				shouldBoostWw = true; // Heizung voll -> Überschuss in Warmwasser umleiten
			}
		} else {
			// "both" - Hebe nur an, was noch NICHT voll ist
			shouldBoostWw = !isWwFull;
			shouldBoostHz = !isHzFull;
		}

		// WW-Boost anwenden oder zurückziehen
		if (shouldBoostWw && !activeBoostWwApplied && originalWw !== null && boostWwAmount > 0 && wwPath) {
			await adapter.setState(wwPath, { val: originalWw + boostWwAmount, ack: false });
			activeBoostWwApplied = true;
			writeLog(`[PV] Priority logic: Applying Hot Water boost (+${boostWwAmount}K).`, 'info');
		} else if (!shouldBoostWw && activeBoostWwApplied && originalWw !== null && wwPath) {
			await adapter.setState(wwPath, { val: originalWw, ack: false });
			activeBoostWwApplied = false;
			writeLog(`[PV] Priority logic: Target reached. Revoking Hot Water boost.`, 'info');
		}

		// HZ-Boost anwenden oder zurückziehen
		if (shouldBoostHz && !activeBoostHzApplied && originalHz !== null && boostHzAmount > 0 && hzPath) {
			await adapter.setState(hzPath, { val: originalHz + boostHzAmount, ack: false });
			activeBoostHzApplied = true;
			writeLog(`[PV] Priority logic: Applying Heating boost (+${boostHzAmount}K).`, 'info');
		} else if (!shouldBoostHz && activeBoostHzApplied && originalHz !== null && hzPath) {
			await adapter.setState(hzPath, { val: originalHz, ack: false });
			activeBoostHzApplied = false;
			writeLog(`[PV] Priority logic: Target reached. Revoking Heating boost.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error evaluating boost priority: ${msg}`, 'error');
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

			if (bzVal !== 5) {
				writeLog(
					`[PV] Compressor is active (Status: ${bzVal}). Waiting for cycle to finish before resetting values.`,
					'info',
				);
				pvWaitingForCycleEnd = true;
				return;
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
		activeBoostWwApplied = false;
		activeBoostHzApplied = false;
		originalWw = null;
		originalHz = null;

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

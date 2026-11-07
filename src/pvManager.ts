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

// Live-Werte für die Berechnung des Gesamt-Überschusses
let currentGridSurplusW = 0;
let currentBatteryChargeW = 0;

// Cache für die ursprünglichen Werte vor dem Boost
let originalWw: number | null = null;
let originalHz: number | null = null;

/**
 * Hilfsfunktion zum sicheren Parsen von Zahlen (fängt deutsche Kommas wie "1,5" ab).
 *
 * @param val - Der zu parsende Konfigurationswert.
 * @param fallback - Fallback-Wert bei ungültiger Eingabe.
 * @returns Die geparste Zahl.
 */
function parseConfigFloat(val: unknown, fallback = 0): number {
	if (typeof val === 'number' && !isNaN(val)) {
		return val;
	}
	if (typeof val === 'string' && val.trim() !== '') {
		const parsed = parseFloat(val.replace(',', '.'));
		return isNaN(parsed) ? fallback : parsed;
	}
	return fallback;
}

// =========================================================
// MAIN LOGIC
// =========================================================

/**
 * Initialisiert die PV-Überwachung, abonniert Fremd-Datenpunkte und lädt Initialwerte.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 */
export async function initPvManagement(adapter: LuxtronikAdapter): Promise<void> {
	const config = adapter.config;
	if (!config.pv_active || !config.pv_feed_in_dp || config.pv_feed_in_dp.trim() === '') {
		writeLog('[PV] PV surplus management is disabled or no valid datapoint provided.', 'debug');
		return;
	}

	try {
		currentGridSurplusW = 0;
		currentBatteryChargeW = 0;
		pvIsBoostActive = false;
		pvWaitingForCycleEnd = false;
		activeBoostWwApplied = false;
		activeBoostHzApplied = false;

		const dpActive = getDpPath('pv_boost_active');
		const dpSince = getDpPath('pv_boost_active_since');

		// RECOVERY NACH ADAPTER-NEUSTART:
		// Falls vor einem Adapter-Neustart noch ein Boost aktiv war, setzen wir die Sollwerte
		// sauber auf die Normalwerte zurück, damit keine 60°C als Geisterwert hängen bleiben.
		const prevActiveState = dpActive ? await adapter.getStateAsync(dpActive) : null;
		if (prevActiveState?.val === true || config.idle_defaults_aktiv) {
			const defaultWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
			writeLog(`[PV] Ensuring clean baseline on startup (WW: ${defaultWw}°C, Heating Offset: 0K).`, 'info');
			await adapter.syncConfigValue('temperature_hot_water_target', defaultWw);
			await adapter.syncConfigValue('heating_temperature', 0);
		}

		if (dpActive) {
			await adapter.setState(dpActive, { val: false, ack: true });
		}
		if (dpSince) {
			await adapter.setState(dpSince, { val: '', ack: true });
		}

		// 1. Netz-Datenpunkt abonnieren
		const gridDp = config.pv_feed_in_dp.trim();
		await adapter.subscribeForeignStatesAsync(gridDp);
		writeLog(`[PV] Initialized PV management. Subscribed to grid feed-in: ${gridDp}`, 'info');

		// 2. Batterie-Datenpunkt abonnieren & Initialwert holen (falls aktiv)
		if (config.pv_battery_active && config.pv_battery_dp && config.pv_battery_dp.trim() !== '') {
			const batDp = config.pv_battery_dp.trim();
			await adapter.subscribeForeignStatesAsync(batDp);
			writeLog(`[PV] Battery prioritization active. Subscribed to battery datapoint: ${batDp}`, 'info');

			try {
				const initialBatState = await adapter.getForeignStateAsync(batDp);
				if (initialBatState) {
					handlePvFeedInChange(adapter, batDp, initialBatState);
				}
			} catch {
				/* ignore initial fetch error */
			}
		}

		try {
			const initialGridState = await adapter.getForeignStateAsync(gridDp);
			if (initialGridState) {
				handlePvFeedInChange(adapter, gridDp, initialGridState);
			}
		} catch {
			/* ignore initial fetch error */
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error initializing PV management: ${msg}`, 'error');
	}
}

/**
 * Wird bei jeder Änderung eines Foreign-States aufgerufen. Berechnet die Summe aus Netz + Batterie.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 * @param id - Die ID (OID) des geänderten Datenpunkts.
 * @param state - Das neue ioBroker State-Objekt.
 */
export function handlePvFeedInChange(adapter: LuxtronikAdapter, id: string, state: ioBroker.State): void {
	const config = adapter.config;
	if (!config.pv_active || !state || state.val === null || state.val === undefined) {
		return;
	}

	const isGridDp = id === config.pv_feed_in_dp?.trim();
	const isBatteryDp = config.pv_battery_active && id === config.pv_battery_dp?.trim();

	if (!isGridDp && !isBatteryDp) {
		return;
	}

	let rawValue = parseConfigFloat(state.val, NaN);
	if (isNaN(rawValue)) {
		return;
	}

	// Update Netz-Überschuss
	if (isGridDp) {
		if (config.pv_feed_in_unit === 'kW') {
			rawValue *= 1000;
		}
		if (config.pv_feed_in_sign === 'negative') {
			currentGridSurplusW = rawValue < 0 ? Math.abs(rawValue) : 0;
		} else {
			currentGridSurplusW = rawValue > 0 ? rawValue : 0;
		}
	}

	// Update Batterie-Ladeleistung
	if (isBatteryDp) {
		if (config.pv_battery_unit === 'kW') {
			rawValue *= 1000;
		}
		if (config.pv_battery_sign === 'negative') {
			currentBatteryChargeW = rawValue < 0 ? Math.abs(rawValue) : 0;
		} else {
			currentBatteryChargeW = rawValue > 0 ? rawValue : 0;
		}
	}

	// Effektiver Gesamtüberschuss = Reale Einspeisung + Strom, der aktuell in die Batterie fließt
	const totalSurplus = Math.round(currentGridSurplusW + currentBatteryChargeW);

	const thresholdStart = parseConfigFloat(config.pv_threshold_start, 2000);
	const thresholdStop = parseConfigFloat(config.pv_threshold_stop, 0);
	const delayStartMs = parseConfigFloat(config.pv_delay_start, 5) * 60000;
	const delayStopMs = parseConfigFloat(config.pv_delay_stop, 10) * 60000;

	if (totalSurplus >= thresholdStart) {
		if (pvStopTimer) {
			adapter.clearTimeout(pvStopTimer);
			pvStopTimer = undefined;
			writeLog(`[PV] Surplus restored (${totalSurplus} W >= ${thresholdStart} W). Stop timer cancelled.`, 'info');
		}
		pvWaitingForCycleEnd = false;

		if (!pvIsBoostActive && !pvStartTimer) {
			writeLog(
				`[PV] Surplus of ${totalSurplus} W exceeds start threshold (${thresholdStart} W). Starting ${config.pv_delay_start} min activation timer.`,
				'info',
			);
			pvStartTimer = adapter.setTimeout(() => activateBoost(adapter), delayStartMs);
		} else if (pvIsBoostActive) {
			void evaluatePvBoost(adapter);
		}
	} else if (totalSurplus <= thresholdStop) {
		if (pvStartTimer) {
			adapter.clearTimeout(pvStartTimer);
			pvStartTimer = undefined;
			writeLog(
				`[PV] Surplus dropped to ${totalSurplus} W (<= ${thresholdStop} W). Start timer cancelled.`,
				'debug',
			);
		}

		if (pvIsBoostActive && !pvStopTimer && !pvWaitingForCycleEnd) {
			writeLog(
				`[PV] Surplus dropped to ${totalSurplus} W (<= stop threshold ${thresholdStop} W). Starting ${config.pv_delay_stop} min deactivation timer.`,
				'info',
			);
			pvStopTimer = adapter.setTimeout(() => initiateDeactivation(adapter), delayStopMs);
		}
	} else {
		// Grauzone (zwischen thresholdStop und thresholdStart, z.B. 1 W bis 1499 W):
		// Nur den Start-Timer abbrechen! Den pvStopTimer NICHT abbrechen, damit kurzes
		// Ausregeln des Wechselrichters (z.B. 10 W) nicht das Abschalten verhindert.
		if (pvStartTimer) {
			adapter.clearTimeout(pvStartTimer);
			pvStartTimer = undefined;
			writeLog(`[PV] Surplus ${totalSurplus} W is below start threshold. Start timer cancelled.`, 'debug');
		}
		if (pvIsBoostActive) {
			void evaluatePvBoost(adapter);
		}
	}
}

/**
 * Startet den dynamischen PV-Boost basierend auf den strikten Konfigurationswerten.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 */
async function activateBoost(adapter: LuxtronikAdapter): Promise<void> {
	pvStartTimer = undefined;
	if (pvIsBoostActive) {
		return;
	}

	const config = adapter.config;

	// SICHERHEITS-CHECK: Prüfen, ob jetzt im Moment überhaupt noch genügend Überschuss da ist!
	const thresholdStart = parseConfigFloat(config.pv_threshold_start, 2000);
	const totalSurplus = currentGridSurplusW + currentBatteryChargeW;
	if (totalSurplus < thresholdStart) {
		writeLog(
			`[PV] Activation aborted: Current surplus (${totalSurplus} W) is below start threshold (${thresholdStart} W).`,
			'info',
		);
		return;
	}

	try {
		// GENIAL EINFACH & SICHER: Wir nehmen den Vorgabewert aus der Konfiguration
		originalWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
		originalHz = parseConfigFloat(config.sync_heating_temperature, 0);

		pvIsBoostActive = true;
		pvWaitingForCycleEnd = false;
		activeBoostWwApplied = false;
		activeBoostHzApplied = false;

		writeLog(
			`[PV] Timer finished. Activating boost logic with clean config base (WW: ${originalWw}°C, Hz: ${originalHz}K)...`,
			'info',
		);
		await evaluatePvBoost(adapter, true);

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
 * Evaluiert fortlaufend die Prioritäten und gibt das sekundäre Ziel frei, sobald das primäre Ziel erreicht ist.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 * @param forceReapply - Erzwingt das erneute Schreiben der PV-Sollwerte (z.B. nach einem Leerlauf-Reset).
 */
export async function evaluatePvBoost(adapter: LuxtronikAdapter, forceReapply = false): Promise<void> {
	if (!pvIsBoostActive || pvWaitingForCycleEnd) {
		return;
	}

	try {
		const config = adapter.config;
		const priority = config.pv_priority || 'both';

		const boostWwAmount = parseConfigFloat(config.pv_boost_ww, 0);
		const boostHzAmount = parseConfigFloat(config.pv_boost_hz, 0);

		const wwDone = activeBoostWwApplied || boostWwAmount <= 0;
		const hzDone = activeBoostHzApplied || boostHzAmount <= 0;
		if (!forceReapply && wwDone && hzDone) {
			return;
		}

		const [wwIstState, rlIstState, rlSollState, hzHystState, hzLimitState, mittelTempState, threshLimitState] =
			await Promise.all([
				adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
				adapter.getStateAsync(getDpPath('temperature_return')),
				adapter.getStateAsync(getDpPath('temperature_target_return')),
				adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
				adapter.getStateAsync(getDpPath('heatingLimit')),
				adapter.getStateAsync(getDpPath('Mitteltemperatur')),
				adapter.getStateAsync(getDpPath('thresholdHeatingLimit')),
			]);

		const wwIst = wwIstState && typeof wwIstState.val === 'number' ? wwIstState.val : 0;
		const rlIst = rlIstState && typeof rlIstState.val === 'number' ? rlIstState.val : 0;
		const rlSoll = rlSollState && typeof rlSollState.val === 'number' ? rlSollState.val : 0;
		const hzHyst = hzHystState && typeof hzHystState.val === 'number' ? hzHystState.val : 1.5;

		const heatingBlockedByLimit =
			Number(hzLimitState?.val) === 1 && Number(mittelTempState?.val) >= Number(threshLimitState?.val);

		const isWwFull = boostWwAmount <= 0 || (originalWw !== null && wwIst >= originalWw + boostWwAmount);
		const isHzFull = boostHzAmount <= 0 || heatingBlockedByLimit || (rlSoll > 0 && rlIst >= rlSoll + hzHyst);

		let shouldBoostWw = false;
		let shouldBoostHz = false;

		if (priority === 'ww') {
			shouldBoostWw = true;
			if (isWwFull || activeBoostHzApplied) {
				shouldBoostHz = true;
			}
		} else if (priority === 'hz') {
			shouldBoostHz = true;
			if (isHzFull || activeBoostWwApplied) {
				shouldBoostWw = true;
			}
		} else {
			shouldBoostWw = true;
			shouldBoostHz = true;
		}

		if (shouldBoostWw && (!activeBoostWwApplied || forceReapply) && originalWw !== null && boostWwAmount > 0) {
			await adapter.syncConfigValue('temperature_hot_water_target', originalWw + boostWwAmount);
			activeBoostWwApplied = true;
			writeLog(
				`[PV] Priority logic: Applying Hot Water boost (+${boostWwAmount}K -> ${originalWw + boostWwAmount}°C).`,
				'info',
			);
		} else if (!shouldBoostWw && activeBoostWwApplied && originalWw !== null) {
			await adapter.syncConfigValue('temperature_hot_water_target', originalWw);
			activeBoostWwApplied = false;
			writeLog(`[PV] Priority logic: Target reached. Revoking Hot Water boost.`, 'info');
		}

		if (shouldBoostHz && (!activeBoostHzApplied || forceReapply) && originalHz !== null && boostHzAmount > 0) {
			await adapter.syncConfigValue('heating_temperature', originalHz + boostHzAmount);
			activeBoostHzApplied = true;
			writeLog(
				`[PV] Priority logic: Applying Heating boost (+${boostHzAmount}K -> ${originalHz + boostHzAmount}K).`,
				'info',
			);
		} else if (!shouldBoostHz && activeBoostHzApplied && originalHz !== null) {
			await adapter.syncConfigValue('heating_temperature', originalHz);
			activeBoostHzApplied = false;
			writeLog(`[PV] Priority logic: Target reached. Revoking Heating boost.`, 'info');
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		writeLog(`[PV] Error evaluating boost priority: ${msg}`, 'error');
	}
}

/**
 * Setzt die Werte hart auf die Konfigurations-Standards zurück.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 */
async function deactivateBoost(adapter: LuxtronikAdapter): Promise<void> {
	try {
		const config = adapter.config;

		// Rückfallwerte IMMER aus der Konfiguration nehmen
		const targetWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
		const targetHz = parseConfigFloat(config.sync_heating_temperature, 0);

		writeLog(`[PV] Reverting values to original base targets (WW: ${targetWw}°C, Hz: ${targetHz}K).`, 'info');

		await adapter.syncConfigValue('temperature_hot_water_target', targetWw);
		await adapter.syncConfigValue('heating_temperature', targetHz);

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
 * Startet den Abbruch nach Ablauf der Ausschaltverzögerung.
 * Setzt die Sollwerte auf Normalwerte zurück, damit ein laufender Takt nur noch bis zum Normalwert
 * zu Ende gefahren wird (inkl. 10-Minuten-Mindestlaufzeitschutz gegen Kurztakte).
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 */
async function initiateDeactivation(adapter: LuxtronikAdapter): Promise<void> {
	pvStopTimer = undefined;
	if (!pvIsBoostActive) {
		return;
	}

	const config = adapter.config;
	// Rückfallwerte IMMER aus der Konfiguration nehmen
	const targetWw = parseConfigFloat(config.sync_warmwater_target_temperature, 54);
	const targetHz = parseConfigFloat(config.sync_heating_temperature, 0);

	writeLog('[PV] Deactivation timer finished.', 'info');

	if (config.pv_finish_cycle) {
		try {
			const bzPath = getDpPath('WP_BZ_akt');
			const bzState = bzPath ? await adapter.getStateAsync(bzPath) : null;
			const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : 5;
			const runningMinutes = bzState?.lc ? (Date.now() - bzState.lc) / 60000 : 999;

			// 1. Inaktive Betriebsart IMMER sofort auf Normalwert zurücksetzen!
			if (bzVal === 0 || bzVal === 4) {
				await adapter.syncConfigValue('temperature_hot_water_target', targetWw);
				activeBoostWwApplied = false;
			} else if (bzVal === 1) {
				await adapter.syncConfigValue('heating_temperature', targetHz);
				activeBoostHzApplied = false;
			}

			// 2. Falls der Verdichter gerade erst angelaufen ist (< 10 Min), warten wir exakt
			// die restliche Zeit bis zur 10-Minuten-Mindestlaufzeit ab, bevor wir die aktive
			// Betriebsart auf Normalwert zurücksetzen (verhindert Kurztakte).
			if (bzVal !== 5 && runningMinutes < 10) {
				const remainingMs = Math.max(10000, Math.ceil((10 - runningMinutes) * 60000));
				writeLog(
					`[PV] Compressor running for ${Math.round(runningMinutes)} min (< 10 min minimum runtime). Delaying final reset by ${Math.ceil(remainingMs / 60000)} min.`,
					'info',
				);
				pvWaitingForCycleEnd = true;
				pvStopTimer = adapter.setTimeout(() => {
					pvStopTimer = undefined;
					void deactivateBoost(adapter);
				}, remainingMs);
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
 * Überwacht den Betriebszustand (WP_BZ_akt). Wird aus der main.ts aufgerufen.
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 * @param newBzVal - Der neue Wert von WP_BZ_akt.
 */
export async function handlePvCycleCheck(adapter: LuxtronikAdapter, newBzVal: number): Promise<void> {
	if (pvWaitingForCycleEnd && newBzVal === 5) {
		if (pvStopTimer) {
			adapter.clearTimeout(pvStopTimer);
			pvStopTimer = undefined;
		}
		writeLog('[PV] Compressor finished cycle (Status: 5). Resetting PV boost targets now.', 'info');
		await deactivateBoost(adapter);
	}
}

/**
 * Bricht den PV-Boost manuell ab (z.B. wenn der Benutzer den Reset-Button drückt).
 *
 * @param adapter - Die aktuelle Adapter-Instanz.
 */
export async function forceResetPvBoost(adapter: LuxtronikAdapter): Promise<void> {
	if (pvIsBoostActive || pvStartTimer || pvStopTimer) {
		writeLog('[PV] Manual override triggered. Cancelling active PV boost...', 'info');

		if (pvStartTimer) {
			adapter.clearTimeout(pvStartTimer);
			pvStartTimer = undefined;
		}
		if (pvStopTimer) {
			adapter.clearTimeout(pvStopTimer);
			pvStopTimer = undefined;
		}

		await deactivateBoost(adapter);
	}
}

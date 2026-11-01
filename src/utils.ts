import type { AdapterInstance } from '@iobroker/adapter-core';

/**
 * Extrahiert typsicher einen numerischen Wert aus einem ioBroker-State.
 *
 * @param state Der abgerufene ioBroker-State.
 * @param fallback Der Fallback-Wert, falls der State ungültig oder keine Zahl ist (Standard: 0).
 * @returns Die ausgelesene Zahl oder der Fallback-Wert.
 */
export function getNumber(state: ioBroker.State | null | undefined, fallback = 0): number {
	if (typeof state?.val === 'number' && !isNaN(state.val)) {
		return state.val;
	}
	if (typeof state?.val === 'string' && state.val.trim() !== '') {
		const parsed = Number(state.val);
		return isNaN(parsed) ? fallback : parsed;
	}
	return fallback;
}

/**
 * Erzeugt eine asynchrone Pause (Delay) unter Berücksichtigung des ioBroker Timeouts.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param ms Die Wartezeit in Millisekunden.
 * @returns Ein Promise, das nach Ablauf der Zeit aufgelöst wird.
 */
export function delay(adapter: AdapterInstance, ms: number): Promise<void> {
	return new Promise(resolve => adapter.setTimeout(resolve, ms));
}

import { writeLog } from './logger';
import { getDpPath } from './stateMapping';
import type { LuxtronikAdapter } from './types';

// Lokaler Cache für den Zählerstand des letzten Pollings
let lastPowerTotal = 0;
let lastThermalTotal = 0;

/**
 * Verarbeitet die COP-Daten und berechnet Live-Werte.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param bzVal Der aktuelle Betriebszustand der Wärmepumpe als String.
 * @returns Ein Promise, das nach Abschluss der Berechnung aufgelöst wird.
 */
export async function processCopData(adapter: LuxtronikAdapter, bzVal: string): Promise<void> {
	const config = adapter.config as any;
	if (!config.cop_calculation_active) {
		return;
	}

	try {
		// 1. STROMVERBRAUCH ABRUFEN
		let currentPower = 0;
		if (config.cop_source_power === 'external' && config.cop_oid_power_total) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_power_total);
			if (state && typeof state.val === 'number') {
				currentPower = state.val;
			}
		} else {
			const state = await adapter.getStateAsync(getDpPath('energy_total'));
			if (state && typeof state.val === 'number') {
				currentPower = state.val;
			}
		}

		// 2. WÄRMEMENGE ABRUFEN
		let currentThermal = 0;
		if (config.cop_source_thermal === 'external' && config.cop_oid_thermal_total) {
			const state = await adapter.getForeignStateAsync(config.cop_oid_thermal_total);
			if (state && typeof state.val === 'number') {
				currentThermal = state.val;
			}
		} else {
			const state = await adapter.getStateAsync(getDpPath('thermalenergy_total'));
			if (state && typeof state.val === 'number') {
				currentThermal = state.val;
			}
		}

		// Initialisierung beim ersten Durchlauf nach Adapter-Start
		if (lastPowerTotal === 0 || lastThermalTotal === 0) {
			lastPowerTotal = currentPower;
			lastThermalTotal = currentThermal;
			return;
		}

		// 3. DELTA BERECHNEN (Zuwachs seit letztem Polling in kWh)
		const deltaPower = currentPower - lastPowerTotal;
		const deltaThermal = currentThermal - lastThermalTotal;

		lastPowerTotal = currentPower;
		lastThermalTotal = currentThermal;

		// Wenn sich die Zähler nicht bewegt haben (z.B. Leerlauf), nichts tun
		if (deltaPower <= 0 && deltaThermal <= 0) {
			return;
		}

		// 4. WERTE VERTEILEN (Total, Heizen, Warmwasser)
		await addDeltaToBucket(adapter, 'Total', deltaPower, deltaThermal);

		if (bzVal === '0') {
			// Anlage heizt gerade
			await addDeltaToBucket(adapter, 'Heating', deltaPower, deltaThermal);
		} else if (bzVal === '1') {
			// Anlage macht Warmwasser
			await addDeltaToBucket(adapter, 'HotWater', deltaPower, deltaThermal);
		}

		// 5. LIVE COP BERECHNEN UND SCHREIBEN
		await calculateAndWriteCop(adapter, 'Total', 'cop_total_today');
		await calculateAndWriteCop(adapter, 'Heating', 'cop_heating_today');
		await calculateAndWriteCop(adapter, 'HotWater', 'cop_water_today');
	} catch (err: any) {
		writeLog(`Fehler bei der COP-Berechnung: ${err.message}`, 'error');
	}
}

/**
 * Addiert die neuen kWh-Deltas auf die internen, versteckten Zähler des Adapters.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die zu aktualisierende Kategorie (z.B. Total, Heating, HotWater).
 * @param deltaPower Die verbrauchte elektrische Energie im aktuellen Zyklus.
 * @param deltaThermal Die erzeugte thermische Energie im aktuellen Zyklus.
 * @returns Ein Promise, das nach dem Speichern aufgelöst wird.
 */
async function addDeltaToBucket(
	adapter: LuxtronikAdapter,
	category: string,
	deltaPower: number,
	deltaThermal: number,
): Promise<void> {
	// Stelle sicher, dass die übergeordneten Ordner existieren
	await adapter.setObjectNotExistsAsync('hidden', {
		type: 'folder',
		common: { name: 'Hidden System Data' },
		native: {},
	});
	await adapter.setObjectNotExistsAsync('hidden.cop_buckets', {
		type: 'folder',
		common: { name: 'COP Data Buckets' },
		native: {},
	});

	// Wir speichern die Werte in versteckten States, damit sie einen Adapter-Neustart überleben
	const powerId = `hidden.cop_buckets.${category}_power_today`;
	const thermalId = `hidden.cop_buckets.${category}_thermal_today`;

	// States ggf. anlegen (mit sauberen Typen und read/write Attributen für ioBroker)
	await adapter.setObjectNotExistsAsync(powerId, {
		type: 'state',
		common: { name: `${category} Power Today`, type: 'number', role: 'value', read: true, write: false },
		native: {},
	});
	await adapter.setObjectNotExistsAsync(thermalId, {
		type: 'state',
		common: { name: `${category} Thermal Today`, type: 'number', role: 'value', read: true, write: false },
		native: {},
	});

	const powerState = await adapter.getStateAsync(powerId);
	const thermalState = await adapter.getStateAsync(thermalId);

	const currentBucketPower = powerState && typeof powerState.val === 'number' ? powerState.val : 0;
	const currentBucketThermal = thermalState && typeof thermalState.val === 'number' ? thermalState.val : 0;

	await adapter.setState(powerId, { val: currentBucketPower + deltaPower, ack: true });
	await adapter.setState(thermalId, { val: currentBucketThermal + deltaThermal, ack: true });
}

/**
 * Liest die Eimer aus, teilt Wärmemenge durch Strom und schreibt das Ergebnis in den Objektbaum.
 *
 * @param adapter Die Instanz des ioBroker-Adapters.
 * @param category Die auszulesende Kategorie (Total, Heating, HotWater).
 * @param dpKey Der Ziel-Datenpunkt im ioBroker-Baum.
 * @returns Ein Promise, das nach dem Berechnen und Schreiben aufgelöst wird.
 */
async function calculateAndWriteCop(adapter: LuxtronikAdapter, category: string, dpKey: string): Promise<void> {
	const powerId = `hidden.cop_buckets.${category}_power_today`;
	const thermalId = `hidden.cop_buckets.${category}_thermal_today`;

	const powerState = await adapter.getStateAsync(powerId);
	const thermalState = await adapter.getStateAsync(thermalId);

	const power = powerState && typeof powerState.val === 'number' ? powerState.val : 0;
	const thermal = thermalState && typeof thermalState.val === 'number' ? thermalState.val : 0;

	if (power > 0) {
		const cop = Math.round((thermal / power) * 100) / 100;
		const targetId = getDpPath(dpKey);
		if (targetId) {
			await adapter.setStateAsync(targetId, { val: cop, ack: true });
		}
	}
}

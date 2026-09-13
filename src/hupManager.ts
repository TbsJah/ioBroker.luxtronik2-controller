import type { AdapterInstance } from '@iobroker/adapter-core';
import { writeLog } from './logger';

export interface HupAdapter extends AdapterInstance {
	config: ioBroker.AdapterConfig & Record<string, any>;
	syncConfigValue: (key: string, value: any) => Promise<void>;
	isDebugLogActive?: boolean;
}

/**
 * Übernimmt die dynamische Regelung der Heizungsumwälzpumpe (HUP) anhand der Spreizung.
 *
 * @param adapter - Die erweiterte Adapter-Instanz
 * @param istHeizen - Boolean, ob sich die Anlage aktuell im Heizbetrieb befindet
 * @param spreizung - Die aktuell berechnete Temperaturspreizung (Vorlauf - Rücklauf)
 * @param hupAktiv - Die aktuell anliegende Nominalspannung der HUP
 * @param lastPumpOptimization - Timestamp der letzten Anpassung (für Intervall-Sperre)
 * @returns Den aktualisierten Timestamp der letzten Anpassung
 */
export async function handleHupOptimization(
	adapter: HupAdapter,
	istHeizen: boolean,
	spreizung: number,
	hupAktiv: number,
	lastPumpOptimization: number,
): Promise<number> {
	const config = adapter.config;

	// Abbruch, wenn nicht geheizt wird oder das Feature deaktiviert ist
	if (!istHeizen || config.hup_optimierung_aktiv !== true) {
		return lastPumpOptimization;
	}

	const now = Date.now();
	const checkIntervalMs = (config.hup_interval_min ?? 10) * 60000;

	// Prüfen, ob das Schutz-Intervall abgelaufen ist
	if (now - lastPumpOptimization > checkIntervalMs) {
		const minSpreizung = config.hup_spreizung_min ?? 6.5;
		const maxSpreizung = config.hup_spreizung_max ?? 7.5;
		const step = config.hup_voltage_step ?? 0.25;
		const minVolt = config.hup_voltage_limit_min ?? 3.0;
		const maxVolt = config.hup_voltage_limit_max ?? 10.0;

		if (spreizung < minSpreizung && hupAktiv > minVolt) {
			const newVolt = Math.max(minVolt, Math.round((hupAktiv - step) * 100) / 100);
			await adapter.syncConfigValue('heating_system_circ_pump_voltage_nominal', newVolt);
			writeLog(
				`HUP: Temperature spread too low (${spreizung}K < ${minSpreizung}K). Scaling nominal voltage down to ${newVolt}V.`,
				'info',
			);
			return now;
		} else if (spreizung > maxSpreizung && hupAktiv < maxVolt) {
			const newVolt = Math.min(maxVolt, Math.round((hupAktiv + step) * 100) / 100);
			await adapter.syncConfigValue('heating_system_circ_pump_voltage_nominal', newVolt);
			writeLog(
				`HUP: Temperature spread too high (${spreizung}K > ${maxSpreizung}K). Scaling nominal voltage up to ${newVolt}V.`,
				'info',
			);
			return now;
		}
	}

	return lastPumpOptimization;
}

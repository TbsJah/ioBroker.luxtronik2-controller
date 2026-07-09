import { writeLog } from './logger';
import { getDpPath } from './stateMapping';

/**
 * Handles the forced hot-water action for the heat pump.
 *
 * @param adapter - The adapter instance used to access state and configuration APIs.
 * @param id - The state ID that should be acknowledged and reset.
 * @returns A promise that resolves once the forced hot-water action has been processed.
 */
export async function handleZwangswarmwasser(adapter: any, id: string): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: false, ack: true });

	const wwIstState = await adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist'));
	const wwSollState = await adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll'));

	const wwIst = typeof wwIstState?.val === 'number' ? wwIstState.val : 0;
	const wwSoll = typeof wwSollState?.val === 'number' ? wwSollState.val : 0;

	if (wwIst < wwSoll - 1) {
		await adapter.syncConfigValue('hotWaterTemperatureHysteresis', 1);
		writeLog(
			`Zwangswarmwasser ausgelöst: Ist (${wwIst}°C) < Soll-1 (${wwSoll - 1}°C). Hysterese auf 1K gesetzt.`,
			'info',
		);
	} else {
		writeLog(`Zwangswarmwasser ignoriert: Ist (${wwIst}°C) ist bereits ausreichend (Soll: ${wwSoll}°C).`, 'info');
	}
}

/**
 * Handles the forced heating action for the heat pump.
 *
 * @param adapter - The adapter instance used to access state and configuration APIs.
 * @param id - The state ID that should be acknowledged and reset.
 * @returns A promise that resolves once the forced-heating action has been processed.
 */
export async function handleZwangsheizen(adapter: any, id: string): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: false, ack: true });

	const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
		adapter.getStateAsync(getDpPath('WP_BZ_akt')),
		adapter.getStateAsync(getDpPath('temperature_return')),
		adapter.getStateAsync(getDpPath('temperature_target_return')),
		adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
	]);

	const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : -1;
	const ruecklauf = typeof ruecklaufState?.val === 'number' ? ruecklaufState.val : 0;
	const ruecklaufSoll = typeof ruecklaufSollState?.val === 'number' ? ruecklaufSollState.val : 0;
	const hysterese = typeof hystereseState?.val === 'number' ? hystereseState.val : 0;

	if (bzVal === 5) {
		if (ruecklauf < ruecklaufSoll + hysterese) {
			await adapter.syncConfigValue('heating_curve_parallel_offset', 35);
			writeLog(`Zwangsheizen ausgelöst. Fusspunkt temporär auf 35°C gesetzt.`, 'info');
		} else {
			writeLog(`Zwangsheizen ignoriert: Rücklauf hoch genug.`, 'info');
		}
	} else {
		writeLog(`Zwangsheizen ignoriert: Anlage ist nicht im Leerlauf.`, 'info');
	}
}

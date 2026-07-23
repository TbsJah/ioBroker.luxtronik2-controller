/**
 * Konvertiert einen ioBroker Zeit-String (HH:MM oder HH:MM:SS) in reine Luxtronik-Sekunden.
 *
 * @param timeStr Der Zeitstring aus dem ioBroker State
 * @returns Die Zeit in Sekunden seit Mitternacht
 */
export function timeStringToSeconds(timeStr: unknown): number {
	if (typeof timeStr !== 'string') {
		return 0;
	}
	const timeMatch = timeStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
	if (timeMatch) {
		const h = parseInt(timeMatch[1], 10) || 0;
		const m = parseInt(timeMatch[2], 10) || 0;
		const s = parseInt(timeMatch[3], 10) || 0;
		return h * 3600 + m * 60 + s;
	}
	return 0;
}

/**
 * Verwandelt Luxtronik-Rohsekunden (z.B. 60) in einen HH:MM:SS String (z.B. "00:01:00").
 * Nützlich, falls du Rohwerte manuell formatieren musst.
 *
 * @param totalSeconds Die Sekunden seit Mitternacht
 * @returns Ein formattierter String im Format HH:MM:SS
 */
export function formatTimerSecondsToTime(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

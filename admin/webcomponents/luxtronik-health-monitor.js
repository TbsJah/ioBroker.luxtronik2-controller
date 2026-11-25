/**
 * <luxtronik-health-monitor>
 * Verdichter-Takt-Tacho, aktive Sperrzeit-Balken und EEPROM-Write-Counter
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const ARC_LEN = Math.PI * 66; // Halbkreis Radius 66

const TIMER_DEFS = [
	{ key: 'timerDelay', label: 'Einschaltverzögerung', color: '#3b82f6' },
	{ key: 'timerVdStand', label: 'VD-Stillstandszeit', color: '#f59e0b' },
	{ key: 'timerLockOff', label: 'Sperrzeit AUS', color: '#ef4444' },
	{ key: 'timerLockOn', label: 'Sperrzeit EIN', color: '#f97316' },
	{ key: 'timerDhwBlock', label: 'WW-Sperr-Timer', color: '#a855f7' },
	{ key: 'timerDefrost', label: 'Abtau-Timer', color: '#06b6d4' },
];

class LuxtronikHealthMonitor extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			hoursVd1: 'Information.05_OperatingHours.hours_compressor1',
			startsVd1: 'Information.05_OperatingHours.starts_compressor1',
			hoursHeating: 'Information.05_OperatingHours.hours_heating',
			hoursWw: 'Information.05_OperatingHours.hours_warmwater',
			hoursZwe1: 'Information.05_OperatingHours.hours_2nd_heat_source1',
			vd1: 'Information.03_Outputs.VD1out',
			timeWpOn: 'Information.04_Timers.Time_WPein_akt',
			timerDelay: 'Information.04_Timers.Timer_EinschVerz',
			timerVdStand: 'Information.04_Timers.Time_VDStd_akt',
			timerLockOff: 'Information.04_Timers.Time_SSPAUS_akt',
			timerLockOn: 'Information.04_Timers.Time_SSPEIN_akt',
			timerDhwBlock: 'Information.04_Timers.Time_SBW_akt',
			timerDefrost: 'Information.04_Timers.Time_AbtIn',
			writesToday: 'Information.12_SystemInfo.write_cycles_today',
			writesTotal: 'Information.12_SystemInfo.write_cycles_total',
		};
	}

	_parseDurationSec(val) {
		if (val === null || val === undefined || val === '') {
			return 0;
		}
		if (typeof val === 'number' && !isNaN(val)) {
			return Math.max(0, val);
		}
		const s = String(val).trim();
		const parts = s.split(':').map(p => parseInt(p, 10));
		if (parts.some(isNaN)) {
			return 0;
		}
		if (parts.length === 3) {
			return parts[0] * 3600 + parts[1] * 60 + parts[2];
		}
		if (parts.length === 2) {
			return parts[0] * 60 + parts[1];
		}
		return 0;
	}

	_renderBase() {
		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
					--lux-ok: #22c55e;
					--lux-warn: #f59e0b;
					--lux-bad: #ef4444;
					--lux-info: #3b82f6;
					display: block;
					width: 100%;
					height: 100%;
					box-sizing: border-box;
					font-family: inherit;
					color: inherit;
				}

				.card {
					width: 100%;
					height: 100%;
					box-sizing: border-box;
					display: flex;
					flex-direction: column;
					gap: 10px;
					padding: 12px;
					overflow: auto;
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.title { font-size: 0.98rem; font-weight: 600; }
				.subtitle { font-size: 0.74rem; opacity: 0.72; }
				.badges { display: flex; gap: 6px; align-items: center; }

				.pill {
					padding: 2px 8px;
					border-radius: 999px;
					font-size: 0.72rem;
					font-weight: 600;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
				}

				.pill.ok { color: var(--lux-ok); border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.14); }
				.pill.warn { color: var(--lux-warn); border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.14); }
				.pill.bad { color: var(--lux-bad); border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.14); }
				.pill.running { color: var(--lux-info); border-color: rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.14); }

				.top-grid {
					display: grid;
					grid-template-columns: minmax(150px, 175px) 1fr;
					gap: 10px;
					align-items: center;
				}

				.gauge-box {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 8px 8px 4px;
					display: flex;
					flex-direction: column;
					align-items: center;
				}

				.gauge-svg {
					width: 156px;
					height: 98px;
					display: block;
				}

				.arc-bg {
					fill: none;
					stroke: rgba(127, 127, 127, 0.22);
					stroke-width: 11;
					stroke-linecap: round;
				}

				.arc-fg {
					fill: none;
					stroke: var(--lux-ok);
					stroke-width: 11;
					stroke-linecap: round;
					stroke-dasharray: ${ARC_LEN.toFixed(2)};
					stroke-dashoffset: ${ARC_LEN.toFixed(2)};
					transition: stroke-dashoffset 0.45s ease, stroke 0.3s ease;
				}

				.stats-box {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 9px 11px;
					display: flex;
					flex-direction: column;
					gap: 5px;
				}

				.row {
					display: flex;
					justify-content: space-between;
					font-size: 0.78rem;
					font-variant-numeric: tabular-nums;
				}

				.row .lbl { opacity: 0.72; }
				.row .val { font-weight: 600; }

				.timers-wrap {
					display: flex;
					flex-direction: column;
					gap: 5px;
				}

				.timers-empty {
					font-size: 0.74rem;
					opacity: 0.65;
					padding: 5px 8px;
					border-radius: 8px;
					background: var(--lux-surface);
					border: 1px dashed var(--lux-border);
					text-align: center;
				}

				.timer-chip {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
					padding: 5px 9px;
					border-radius: 8px;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-left-width: 3px;
					font-size: 0.76rem;
					font-variant-numeric: tabular-nums;
				}

				.timer-chip .t-val { font-weight: 700; }

				.footer {
					margin-top: auto;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
					gap: 8px;
					padding-top: 6px;
					border-top: 1px solid var(--lux-border);
					font-size: 0.74rem;
					font-variant-numeric: tabular-nums;
				}

				.wear-ok { color: var(--lux-ok); font-weight: 700; }
				.wear-warn { color: var(--lux-warn); font-weight: 700; }
				.wear-bad { color: var(--lux-bad); font-weight: 700; }
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Verdichter & Takte</div>
						<div class="subtitle" data-ref="subtitle">Ø Laufzeit & Sperrzeiten</div>
					</div>
					<div class="badges">
						<span class="pill" data-ref="vdBadge">VD1 Aus</span>
						<span class="pill" data-ref="healthBadge">–</span>
					</div>
				</div>

				<div class="top-grid">
					<div class="gauge-box">
						<svg class="gauge-svg" viewBox="0 0 164 102">
							<path class="arc-bg" d="M 16 84 A 66 66 0 0 1 148 84" />
							<path class="arc-fg" data-ref="gaugeArc" d="M 16 84 A 66 66 0 0 1 148 84" />
							<text x="82" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor" data-ref="avgMinVal">–</text>
							<text x="82" y="81" text-anchor="middle" font-size="9.5" font-weight="600" fill="currentColor" opacity="0.68">Ø MIN / TAKT</text>
							<text x="16" y="98" text-anchor="middle" font-size="8.5" fill="currentColor" opacity="0.55">0</text>
							<text x="148" y="98" text-anchor="middle" font-size="8.5" fill="currentColor" opacity="0.55" data-ref="gaugeMaxLbl">60</text>
						</svg>
					</div>

					<div class="stats-box">
						<div class="row"><span class="lbl">Starts / Stunden</span><span class="val" data-ref="startsHours">–</span></div>
						<div class="row"><span class="lbl">Heizen / WW</span><span class="val" data-ref="splitHours">–</span></div>
						<div class="row"><span class="lbl">Heizstab (ZWE1)</span><span class="val" data-ref="zweHours">–</span></div>
						<div class="row"><span class="lbl">Aktueller Takt</span><span class="val" data-ref="currentRun">–</span></div>
					</div>
				</div>

				<div class="timers-wrap" data-ref="timersWrap"></div>

				<div class="footer">
					<span>EEPROM Heute: <span data-ref="writesToday">–</span></span>
					<span>EEPROM Gesamt: <strong data-ref="writesTotal">–</strong></span>
				</div>
			</div>
		`;
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
	}

	_updateView() {
		const r = this._refs;
		if (!r.title) {
			return;
		}

		const v = this._values;
		const hours = this._toNum(v.hoursVd1);
		const starts = this._toNum(v.startsVd1);
		const vd1 = this._toBool(v.vd1);
		const maxMin = Math.max(30, this._toNum(this._settings?.targetMinutes) ?? 60);

		r.title.textContent = this._settings?.title || 'Verdichter & Takte';
		r.gaugeMaxLbl.textContent = String(Math.round(maxMin));

		r.vdBadge.textContent = vd1 ? 'VD1 Läuft' : 'VD1 Aus';
		r.vdBadge.className = `pill ${vd1 ? 'running' : ''}`;

		// Ø Minuten pro Takt berechnen
		if (hours !== null && starts !== null && starts > 0) {
			const avgMin = (hours * 60) / starts;
			const ratio = Math.max(0, Math.min(1, avgMin / maxMin));
			r.avgMinVal.textContent = avgMin.toFixed(1);
			r.gaugeArc.style.strokeDashoffset = (ARC_LEN * (1 - ratio)).toFixed(2);

			if (avgMin < 20) {
				r.gaugeArc.style.stroke = 'var(--lux-bad)';
				r.healthBadge.textContent = 'Kurztakte';
				r.healthBadge.className = 'pill bad';
			} else if (avgMin < 40) {
				r.gaugeArc.style.stroke = 'var(--lux-warn)';
				r.healthBadge.textContent = 'Mittel';
				r.healthBadge.className = 'pill warn';
			} else {
				r.gaugeArc.style.stroke = 'var(--lux-ok)';
				r.healthBadge.textContent = 'Gesund';
				r.healthBadge.className = 'pill ok';
			}
		} else {
			r.avgMinVal.textContent = '–';
			r.gaugeArc.style.strokeDashoffset = ARC_LEN.toFixed(2);
			r.healthBadge.textContent = '–';
			r.healthBadge.className = 'pill';
		}

		const startsStr = starts !== null ? Math.round(starts).toLocaleString('de-DE') : '–';
		const hoursStr = hours !== null ? `${Math.round(hours).toLocaleString('de-DE')} h` : '–';
		r.startsHours.textContent = `${startsStr} / ${hoursStr}`;

		const hHz = this._toNum(v.hoursHeating);
		const hWw = this._toNum(v.hoursWw);
		r.splitHours.textContent = `${hHz !== null ? Math.round(hHz) : '–'} h / ${hWw !== null ? Math.round(hWw) : '–'} h`;

		const hZwe = this._toNum(v.hoursZwe1);
		r.zweHours.textContent = hZwe !== null ? `${hZwe.toFixed(1)} h` : '–';
		r.currentRun.textContent = vd1 && v.timeWpOn ? String(v.timeWpOn) : 'Inaktiv';

		// Aktive Sperr- & Stillstands-Timer rendern
		const wrap = r.timersWrap;
		while (wrap.firstChild) {
			wrap.removeChild(wrap.firstChild);
		}

		let activeCount = 0;
		for (const def of TIMER_DEFS) {
			const raw = v[def.key];
			const sec = this._parseDurationSec(raw);
			if (sec > 0) {
				activeCount++;
				const chip = document.createElement('div');
				chip.className = 'timer-chip';
				chip.style.borderLeftColor = def.color;

				const lblEl = document.createElement('span');
				lblEl.textContent = def.label;
				const valEl = document.createElement('span');
				valEl.className = 't-val';
				valEl.textContent = String(raw);

				chip.appendChild(lblEl);
				chip.appendChild(valEl);
				wrap.appendChild(chip);
			}
		}

		if (activeCount === 0) {
			const empty = document.createElement('div');
			empty.className = 'timers-empty';
			empty.textContent = 'Keine aktiven Sperr- oder Verzögerungstimer';
			wrap.appendChild(empty);
		}

		// Flash-Wear Anzeige
		const wt = this._toNum(v.writesToday);
		const wtot = this._toNum(v.writesTotal);
		if (wt !== null) {
			r.writesToday.textContent = `${Math.round(wt)} Zyklen`;
			r.writesToday.className = wt === 0 ? 'wear-ok' : wt <= 15 ? 'wear-warn' : 'wear-bad';
		} else {
			r.writesToday.textContent = '–';
			r.writesToday.className = '';
		}
		r.writesTotal.textContent = wtot !== null ? Math.round(wtot).toLocaleString('de-DE') : '–';
	}
}

if (!customElements.get('luxtronik-health-monitor')) {
	customElements.define('luxtronik-health-monitor', LuxtronikHealthMonitor);
}

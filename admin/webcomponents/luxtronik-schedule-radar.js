/**
 * <luxtronik-schedule-radar>
 * 24-Stunden-Zeitbalken für Heizung (Absenkung), Warmwasser (Sperrzeit) und Zirkulation (Freigabe)
 * mit wanderndem Jetzt-Marker für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const TABLE_MODE_LABELS = { 0: 'Woche', 1: '5+2', 2: 'Tage' };

const TRACKS = [
	{
		id: 'hz',
		label: 'Heizung',
		kindLabel: 'Absenkung',
		inBlockText: 'Abgesenkt',
		outBlockText: 'Normal',
		color: '#f59e0b',
		inBlockCls: 'warn',
		outBlockCls: 'ok',
	},
	{
		id: 'ww',
		label: 'Warmwasser',
		kindLabel: 'Sperrzeit',
		inBlockText: 'Gesperrt',
		outBlockText: 'Freigegeben',
		color: '#ef4444',
		inBlockCls: 'bad',
		outBlockCls: 'ok',
	},
	{
		id: 'zip',
		label: 'Zirkulation',
		kindLabel: 'Freigabe',
		inBlockText: 'Freigegeben',
		outBlockText: 'Pausiert',
		color: '#3b82f6',
		inBlockCls: 'info',
		outBlockCls: 'muted',
	},
];

class LuxtronikScheduleRadar extends LuxtronikBaseCard {
	static get stateMap() {
		const map = {
			hz_sel: 'Settings.07_Tables.heatingOperationTimerTableSelected',
			ww_sel: 'Settings.07_Tables.hotWaterOperationTimerTableSelected',
			zip_sel: 'Settings.07_Tables.hotWaterCircPumpTimerTableSelected',
			hz_week: 'Information.11_Tables.Heating.heatingOperationTimerTableWeek',
			hz_monfri: 'Information.11_Tables.Heating.heatingOperationTimerTable52MonFri',
			hz_satsun: 'Information.11_Tables.Heating.heatingOperationTimerTable52SatSun',
			ww_week: 'Information.11_Tables.HotWater.hotWaterTableWeek',
			ww_monfri: 'Information.11_Tables.HotWater.hotWaterTable52MonFri',
			ww_satsun: 'Information.11_Tables.HotWater.hotWaterTable52SatSun',
			zip_week: 'Information.11_Tables.Circulation.hotWaterCircPumpTimerTableWeek',
			zip_monfri: 'Information.11_Tables.Circulation.hotWaterCircPumpTimerTable52MonFri',
			zip_satsun: 'Information.11_Tables.Circulation.hotWaterCircPumpTimerTable52SatSun',
		};
		for (const day of DAYS_EN) {
			map[`hz_${day}`] = `Information.11_Tables.Heating.heatingOperationTimerTableDay${day}`;
			map[`ww_${day}`] = `Information.11_Tables.HotWater.hotWaterTableDay${day}`;
			map[`zip_${day}`] = `Information.11_Tables.Circulation.hotWaterCircPumpTimerTableDay${day}`;
		}
		return map;
	}

	constructor() {
		super();
		this._clockTimer = null;
	}

	connectedCallback() {
		super.connectedCallback();
		if (!this._clockTimer) {
			this._clockTimer = window.setInterval(() => {
				if (this._rendered) {
					this._updateView();
				}
			}, 60000);
		}
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		if (this._clockTimer) {
			window.clearInterval(this._clockTimer);
			this._clockTimer = null;
		}
	}

	_toMinutes(val) {
		if (val === null || val === undefined || val === '') {
			return null;
		}
		if (typeof val === 'number' && !isNaN(val)) {
			// Sekunde (0..86400) oder Minute (0..1440) erkennen
			if (val > 1440) {
				return Math.round(val / 60);
			}
			return Math.round(val);
		}
		const s = String(val).trim();
		const m = s.match(/^(\d{1,2}):(\d{2})/);
		if (m) {
			return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
		}
		const n = parseFloat(s);
		if (!isNaN(n)) {
			return n > 1440 ? Math.round(n / 60) : Math.round(n);
		}
		return null;
	}

	_fmtMin(min) {
		const m = Math.max(0, Math.min(1440, Math.round(min)));
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	}

	_parseIntervals(raw) {
		if (!raw) {
			return [];
		}
		let data = raw;
		if (typeof raw === 'string') {
			const trimmed = raw.trim();
			if (!trimmed) {
				return [];
			}
			try {
				data = JSON.parse(trimmed);
			} catch {
				// Fallback für reine Textlisten wie "06:00-22:00, 23:00-05:00"
				const pairs = [];
				const re = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g;
				let match;
				while ((match = re.exec(trimmed)) !== null) {
					const s = this._toMinutes(match[1]);
					const e = this._toMinutes(match[2]);
					if (s !== null && e !== null && s !== e) {
						pairs.push([s, e]);
					}
				}
				return pairs;
			}
		}

		const rawPairs = [];
		const addPair = (a, b) => {
			const s = this._toMinutes(a);
			const e = this._toMinutes(b);
			if (s !== null && e !== null && s !== e) {
				rawPairs.push([s, e]);
			}
		};

		if (Array.isArray(data)) {
			if (data.length > 0 && data.every(x => typeof x === 'number')) {
				for (let i = 0; i + 1 < data.length; i += 2) {
					addPair(data[i], data[i + 1]);
				}
			} else {
				for (const entry of data) {
					if (Array.isArray(entry) && entry.length >= 2) {
						addPair(entry[0], entry[1]);
					} else if (typeof entry === 'string') {
						const m = entry.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
						if (m) {
							addPair(m[1], m[2]);
						}
					} else if (entry && typeof entry === 'object') {
						const s = entry.on ?? entry.start ?? entry.from ?? entry.von ?? entry.Start;
						const e = entry.off ?? entry.end ?? entry.to ?? entry.bis ?? entry.End ?? entry.Ende;
						addPair(s, e);
					}
				}
			}
		} else if (data && typeof data === 'object') {
			// z.B. { start1: ..., end1: ... }
			const keys = Object.keys(data);
			for (let i = 1; i <= 5; i++) {
				const sKey = keys.find(k => new RegExp(`(start|on|von).*${i}$`, 'i').test(k));
				const eKey = keys.find(k => new RegExp(`(end|ende|off|bis).*${i}$`, 'i').test(k));
				if (sKey && eKey) {
					addPair(data[sKey], data[eKey]);
				}
			}
		}

		return rawPairs;
	}

	_splitWrapped(pairs) {
		const segments = [];
		for (const [s, e] of pairs) {
			if (s < e) {
				segments.push([s, e]);
			} else if (s > e) {
				// Mitternachts-Überlauf (z.B. 22:00 - 05:30)
				segments.push([s, 1440]);
				if (e > 0) {
					segments.push([0, e]);
				}
			}
		}
		return segments;
	}

	_selectTableValue(prefix, now) {
		const mode = this._toNum(this._values[`${prefix}_sel`]) ?? 0;
		const dayIdx = now.getDay();
		const isWeekend = dayIdx === 0 || dayIdx === 6;

		let raw = null;
		if (mode === 1) {
			raw = this._values[isWeekend ? `${prefix}_satsun` : `${prefix}_monfri`];
		} else if (mode === 2) {
			raw = this._values[`${prefix}_${DAYS_EN[dayIdx]}`];
		} else {
			raw = this._values[`${prefix}_week`];
		}
		return { mode, raw };
	}

	_renderBase() {
		const tracksHtml = TRACKS.map(
			t => `
				<div class="track-card">
					<div class="track-head">
						<div class="track-left">
							<span class="dot" style="background:${t.color}"></span>
							<span class="track-name">${t.label}</span>
							<span class="track-meta" data-ref="meta_${t.id}">–</span>
						</div>
						<span class="pill" data-ref="state_${t.id}">–</span>
					</div>
					<div class="bar-wrap">
						<div class="bar-blocks" data-ref="blocks_${t.id}"></div>
						<div class="now-line" data-ref="now_${t.id}"></div>
					</div>
					<div class="slots-text" data-ref="slots_${t.id}">Keine Zeitfenster hinterlegt</div>
				</div>
			`,
		).join('');

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
					gap: 8px;
					padding: 12px;
					overflow: auto;
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
				}

				.title { font-size: 0.98rem; font-weight: 600; }
				.clock { font-size: 0.78rem; font-weight: 600; opacity: 0.78; font-variant-numeric: tabular-nums; }

				.tracks {
					display: flex;
					flex-direction: column;
					gap: 8px;
					flex: 1;
				}

				.track-card {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 8px 10px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.track-head {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
				}

				.track-left { display: flex; align-items: center; gap: 6px; }
				.dot { width: 8px; height: 8px; border-radius: 50%; }
				.track-name { font-size: 0.82rem; font-weight: 600; }
				.track-meta { font-size: 0.72rem; opacity: 0.65; }

				.pill {
					padding: 1px 7px;
					border-radius: 999px;
					font-size: 0.7rem;
					font-weight: 600;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
				}

				.pill.ok { color: var(--lux-ok); border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.14); }
				.pill.warn { color: var(--lux-warn); border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.14); }
				.pill.bad { color: var(--lux-bad); border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.14); }
				.pill.info { color: var(--lux-info); border-color: rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.14); }
				.pill.muted { opacity: 0.72; }

				.bar-wrap {
					position: relative;
					height: 14px;
					border-radius: 6px;
					background: rgba(127, 127, 127, 0.2);
					overflow: hidden;
				}

				.bar-blocks {
					position: absolute;
					inset: 0;
				}

				.block {
					position: absolute;
					top: 0;
					bottom: 0;
					border-radius: 3px;
					opacity: 0.82;
				}

				.now-line {
					position: absolute;
					top: -2px;
					bottom: -2px;
					width: 2px;
					background: #ffffff;
					box-shadow: 0 0 6px rgba(255, 255, 255, 0.9);
					z-index: 2;
				}

				.slots-text {
					font-size: 0.71rem;
					opacity: 0.72;
					font-variant-numeric: tabular-nums;
				}

				.axis {
					display: flex;
					justify-content: space-between;
					padding: 0 10px;
					font-size: 0.68rem;
					opacity: 0.6;
					font-variant-numeric: tabular-nums;
				}
			</style>

			<div class="card">
				<div class="header">
					<div class="title" data-ref="title">Zeitschaltprogramme (Heute)</div>
					<div class="clock" data-ref="clock">–</div>
				</div>

				<div class="tracks">${tracksHtml}</div>

				<div class="axis">
					<span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
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

		const now = new Date();
		const nowMin = now.getHours() * 60 + now.getMinutes();
		const nowPct = (nowMin / 1440) * 100;

		r.title.textContent = this._settings?.title || 'Zeitschaltprogramme (Heute)';
		r.clock.textContent = `${DAYS_DE[now.getDay()]} · ${this._fmtMin(nowMin)}`;

		for (const t of TRACKS) {
			const { mode, raw } = this._selectTableValue(t.id, now);
			const modeName = TABLE_MODE_LABELS[mode] || 'Woche';
			r[`meta_${t.id}`].textContent = `(${t.kindLabel} · ${modeName})`;

			const pairs = this._parseIntervals(raw);
			const segments = this._splitWrapped(pairs);
			const isInBlock = segments.some(([s, e]) => nowMin >= s && nowMin < e);

			const badge = r[`state_${t.id}`];
			badge.textContent = isInBlock ? t.inBlockText : t.outBlockText;
			badge.className = `pill ${isInBlock ? t.inBlockCls : t.outBlockCls}`;

			r[`now_${t.id}`].style.left = `${nowPct.toFixed(2)}%`;

			const container = r[`blocks_${t.id}`];
			while (container.firstChild) {
				container.removeChild(container.firstChild);
			}

			for (const [s, e] of segments) {
				const el = document.createElement('div');
				el.className = 'block';
				el.style.left = `${((s / 1440) * 100).toFixed(2)}%`;
				el.style.width = `${(((e - s) / 1440) * 100).toFixed(2)}%`;
				el.style.backgroundColor = t.color;
				el.title = `${t.kindLabel}: ${this._fmtMin(s)} – ${this._fmtMin(e)}`;
				container.appendChild(el);
			}

			r[`slots_${t.id}`].textContent =
				pairs.length > 0
					? `${t.kindLabel}: ${pairs.map(([s, e]) => `${this._fmtMin(s)}–${this._fmtMin(e)}`).join(' · ')}`
					: `Keine ${t.kindLabel} aktiv`;
		}
	}
}

if (!customElements.get('luxtronik-schedule-radar')) {
	customElements.define('luxtronik-schedule-radar', LuxtronikScheduleRadar);
}

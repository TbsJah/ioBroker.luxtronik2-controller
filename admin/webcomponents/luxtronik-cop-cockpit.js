/**
 * <luxtronik-cop-cockpit>
 * Moderne COP- & JAZ-Übersicht mit Hero-KPIs, Zeilen-Karten und realistischer WW-Farbskala
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const MATRIX_ROWS = [
	{ key: 'total', label: 'Gesamt', icon: '⚡', color: '#22c55e', isWater: false },
	{ key: 'heating', label: 'Heizen', icon: '🔥', color: '#f97316', isWater: false },
	{ key: 'water', label: 'Warmwasser', icon: '💧', color: '#3b82f6', isWater: true },
];

const MATRIX_COLS = [
	{ key: 'today', label: 'Heute' },
	{ key: '7d', label: '7 Tage' },
	{ key: 'month', label: 'Monat' },
	{ key: 'year', label: 'Jahr' },
];

class LuxtronikCopCockpit extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			total_today: 'Information.16_Efficiency.Total.cop_total_today',
			total_7d: 'Information.16_Efficiency.Total.cop_total_7d',
			total_month: 'Information.16_Efficiency.Total.cop_total_month',
			total_year: 'Information.16_Efficiency.Total.cop_total_year',
			heating_today: 'Information.16_Efficiency.Heating.cop_heating_today',
			heating_7d: 'Information.16_Efficiency.Heating.cop_heating_7d',
			heating_month: 'Information.16_Efficiency.Heating.cop_heating_month',
			heating_year: 'Information.16_Efficiency.Heating.cop_heating_year',
			water_today: 'Information.16_Efficiency.HotWater.cop_water_today',
			water_7d: 'Information.16_Efficiency.HotWater.cop_water_7d',
			water_month: 'Information.16_Efficiency.HotWater.cop_water_month',
			water_year: 'Information.16_Efficiency.HotWater.cop_water_year',
			heatPower: 'Information.12_SystemInfo.current_heat_output',
			elecPower: 'Information.12_SystemInfo.current_power_consumption',
			thermalTotal: 'Information.09_ThermalEnergy.thermalenergy_total',
			energyTotal: 'Information.10_Energy.energy_total',
			vd1: 'Information.03_Outputs.VD1out',
			pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
		};
	}

	_copColor(val, isWater) {
		if (val === null || val <= 0) {
			return 'rgba(148, 163, 184, 0.35)';
		}
		if (isWater) {
			if (val < 2.0) {
				return '#ef4444';
			}
			if (val < 2.6) {
				return '#f59e0b';
			}
			if (val < 3.3) {
				return '#22c55e';
			}
			return '#06b6d4';
		}
		if (val < 2.5) {
			return '#ef4444';
		}
		if (val < 3.4) {
			return '#f59e0b';
		}
		if (val < 4.3) {
			return '#22c55e';
		}
		return '#06b6d4';
	}

	_renderBase() {
		const headerCols = MATRIX_COLS.map(c => `<div class="col-head">${c.label}</div>`).join('');
		const rowCards = MATRIX_ROWS.map(row => {
			const cells = MATRIX_COLS.map(col => {
				const id = `${row.key}_${col.key}`;
				return `
					<div class="cell">
						<div class="cell-val" data-ref="val_${id}">–</div>
						<div class="bar-track"><div class="bar-fill" data-ref="bar_${id}"></div></div>
					</div>
				`;
			}).join('');
			return `
				<div class="row-card" style="--row-accent:${row.color}">
					<div class="row-label">
						<span class="row-icon">${row.icon}</span>
						<span>${row.label}</span>
					</div>
					${cells}
				</div>
			`;
		}).join('');

		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-surface-soft: rgba(127, 127, 127, 0.07);
					--lux-border: rgba(127, 127, 127, 0.22);
					--lux-pv: #eab308;
					--lux-ok: #22c55e;
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
					padding: 3px 9px;
					border-radius: 999px;
					font-size: 0.73rem;
					font-weight: 700;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					font-variant-numeric: tabular-nums;
				}

				.pill.live { color: var(--lux-ok); border-color: rgba(34, 197, 94, 0.45); background: rgba(34, 197, 94, 0.14); }
				.pill.pv { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }
				.hidden { display: none !important; }

				.hero-grid {
					display: grid;
					grid-template-columns: repeat(3, minmax(0, 1fr));
					gap: 8px;
				}

				.kpi {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 8px 10px;
					display: flex;
					flex-direction: column;
					gap: 2px;
				}

				.kpi.highlight {
					border-color: rgba(34, 197, 94, 0.4);
					background: rgba(34, 197, 94, 0.1);
				}

				.kpi-lbl {
					font-size: 0.68rem;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.04em;
					opacity: 0.7;
				}

				.kpi-val {
					font-size: 1.05rem;
					font-weight: 700;
					font-variant-numeric: tabular-nums;
				}

				.kpi.highlight .kpi-val { color: var(--lux-ok); }

				.col-heads {
					display: grid;
					grid-template-columns: minmax(104px, 1.25fr) repeat(4, minmax(52px, 1fr));
					gap: 6px;
					padding: 0 10px;
				}

				.col-head {
					font-size: 0.68rem;
					font-weight: 700;
					opacity: 0.65;
					text-transform: uppercase;
					text-align: center;
					letter-spacing: 0.04em;
				}

				.rows-wrap {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}

				.row-card {
					display: grid;
					grid-template-columns: minmax(104px, 1.25fr) repeat(4, minmax(52px, 1fr));
					gap: 6px;
					align-items: center;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-left: 3px solid var(--row-accent);
					border-radius: 10px;
					padding: 8px 10px;
				}

				.row-label {
					display: flex;
					align-items: center;
					gap: 6px;
					font-size: 0.82rem;
					font-weight: 600;
				}

				.row-icon { font-size: 0.88rem; }

				.cell {
					background: var(--lux-surface-soft);
					border-radius: 8px;
					padding: 6px 6px 5px;
					display: flex;
					flex-direction: column;
					gap: 4px;
					align-items: center;
				}

				.cell-val {
					font-size: 0.94rem;
					font-weight: 700;
					font-variant-numeric: tabular-nums;
				}

				.bar-track {
					width: 100%;
					height: 4px;
					border-radius: 999px;
					background: rgba(127, 127, 127, 0.22);
					overflow: hidden;
				}

				.bar-fill {
					height: 100%;
					width: 0%;
					border-radius: 999px;
					transition: width 0.35s ease, background-color 0.35s ease;
				}
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Effizienz / COP</div>
						<div class="subtitle" data-ref="subtitle">Arbeitszahlen nach Zeitraum</div>
					</div>
					<div class="badges">
						<span class="pill pv hidden" data-ref="pvBadge">PV-Boost</span>
						<span class="pill" data-ref="liveCopBadge">Standby</span>
					</div>
				</div>

				<div class="hero-grid">
					<div class="kpi highlight">
						<span class="kpi-lbl">Gesamt-JAZ</span>
						<span class="kpi-val" data-ref="lifetimeJaz">–</span>
					</div>
					<div class="kpi">
						<span class="kpi-lbl">Wärme ges.</span>
						<span class="kpi-val" data-ref="thermalTotal">–</span>
					</div>
					<div class="kpi">
						<span class="kpi-lbl">Strom ges.</span>
						<span class="kpi-val" data-ref="energyTotal">–</span>
					</div>
				</div>

				<div class="col-heads">
					<div></div>
					${headerCols}
				</div>

				<div class="rows-wrap">${rowCards}</div>
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
		const maxScale = Math.max(3, this._toNum(this._settings?.maxScale) ?? 5.5);

		r.title.textContent = this._settings?.title || 'Effizienz / COP';
		r.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));

		const heatW = this._toNum(v.heatPower);
		const elecW = this._toNum(v.elecPower);
		const vd1 = this._toBool(v.vd1);

		if (vd1 && heatW !== null && heatW > 0 && elecW !== null && elecW > 50) {
			const liveCop = heatW / elecW;
			r.liveCopBadge.textContent = `Live COP ${liveCop.toFixed(2)}`;
			r.liveCopBadge.className = 'pill live';
			r.subtitle.textContent = `${(heatW / 1000).toFixed(2)} kW th. / ${(elecW / 1000).toFixed(2)} kW el.`;
		} else {
			r.liveCopBadge.textContent = vd1 ? 'Verdichter aktiv' : 'Standby';
			r.liveCopBadge.className = 'pill';
			r.subtitle.textContent = 'Arbeitszahlen nach Zeitraum';
		}

		for (const row of MATRIX_ROWS) {
			for (const col of MATRIX_COLS) {
				const id = `${row.key}_${col.key}`;
				const num = this._toNum(v[id]);
				const valEl = r[`val_${id}`];
				const barEl = r[`bar_${id}`];

				if (num !== null && num > 0) {
					valEl.textContent = num.toFixed(2);
					const scale = row.isWater ? Math.min(maxScale, 4.2) : maxScale;
					const pct = Math.max(5, Math.min(100, (num / scale) * 100));
					barEl.style.width = `${pct.toFixed(0)}%`;
					barEl.style.backgroundColor = this._copColor(num, row.isWater);
				} else {
					valEl.textContent = '–';
					barEl.style.width = '0%';
					barEl.style.backgroundColor = 'transparent';
				}
			}
		}

		const th = this._toNum(v.thermalTotal);
		const el = this._toNum(v.energyTotal);
		r.thermalTotal.textContent = th !== null ? `${Math.round(th).toLocaleString('de-DE')} kWh` : '–';
		r.energyTotal.textContent = el !== null ? `${Math.round(el).toLocaleString('de-DE')} kWh` : '–';
		r.lifetimeJaz.textContent = th !== null && el !== null && el > 0 ? (th / el).toFixed(2) : '–';
	}
}

if (!customElements.get('luxtronik-cop-cockpit')) {
	customElements.define('luxtronik-cop-cockpit', LuxtronikCopCockpit);
}

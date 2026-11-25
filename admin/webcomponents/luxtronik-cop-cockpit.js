/**
 * <luxtronik-cop-cockpit>
 * COP- & JAZ-Vergleichsmatrix (Gesamt / Heizen / Warmwasser) inkl. Live-COP
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const MATRIX_ROWS = [
	{ key: 'total', label: 'Gesamt', color: '#22c55e' },
	{ key: 'heating', label: 'Heizen', color: '#f97316' },
	{ key: 'water', label: 'Warmwasser', color: '#3b82f6' },
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

	_copColor(val) {
		if (val === null || val <= 0) {
			return 'rgba(148, 163, 184, 0.45)';
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
		const bodyRows = MATRIX_ROWS.map(row => {
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
				<div class="row-label">
					<span class="dot" style="background:${row.color}"></span>
					<span>${row.label}</span>
				</div>
				${cells}
			`;
		}).join('');

		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
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
					font-size: 0.74rem;
					font-weight: 700;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					font-variant-numeric: tabular-nums;
				}

				.pill.live { color: var(--lux-ok); border-color: rgba(34, 197, 94, 0.45); background: rgba(34, 197, 94, 0.14); }
				.pill.pv { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }
				.hidden { display: none !important; }

				.matrix {
					display: grid;
					grid-template-columns: minmax(90px, 1.15fr) repeat(4, minmax(56px, 1fr));
					gap: 7px;
					align-items: center;
					flex: 1;
				}

				.col-head {
					font-size: 0.7rem;
					font-weight: 600;
					opacity: 0.68;
					text-transform: uppercase;
					text-align: center;
					letter-spacing: 0.03em;
				}

				.row-label {
					display: flex;
					align-items: center;
					gap: 6px;
					font-size: 0.8rem;
					font-weight: 600;
				}

				.row-label .dot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					flex-shrink: 0;
				}

				.cell {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 8px;
					padding: 6px 6px 5px;
					display: flex;
					flex-direction: column;
					gap: 4px;
					align-items: center;
				}

				.cell-val {
					font-size: 0.92rem;
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

				.footer {
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
					gap: 8px;
					padding-top: 6px;
					border-top: 1px solid var(--lux-border);
					font-size: 0.74rem;
					opacity: 0.82;
					font-variant-numeric: tabular-nums;
				}

				.footer strong { font-weight: 600; }
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Effizienz / COP</div>
						<div class="subtitle" data-ref="subtitle">Arbeitszahlen nach Zeitraum</div>
					</div>
					<div class="badges">
						<span class="pill pv hidden" data-ref="pvBadge">PV-Boost</span>
						<span class="pill" data-ref="liveCopBadge">Live: –</span>
					</div>
				</div>

				<div class="matrix">
					<div></div>
					${headerCols}
					${bodyRows}
				</div>

				<div class="footer">
					<span>Wärme ges.: <strong data-ref="thermalTotal">–</strong></span>
					<span>Strom ges.: <strong data-ref="energyTotal">–</strong></span>
					<span>Gesamt-JAZ: <strong data-ref="lifetimeJaz">–</strong></span>
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
		const maxScale = Math.max(3, this._toNum(this._settings?.maxScale) ?? 5.5);

		r.title.textContent = this._settings?.title || 'Effizienz / COP';
		r.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));

		// Live-COP berechnen (falls Verdichter läuft und Leistungswerte vorhanden)
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

		// Matrix-Zellen aktualisieren
		for (const row of MATRIX_ROWS) {
			for (const col of MATRIX_COLS) {
				const id = `${row.key}_${col.key}`;
				const num = this._toNum(v[id]);
				const valEl = r[`val_${id}`];
				const barEl = r[`bar_${id}`];

				if (num !== null && num > 0) {
					valEl.textContent = num.toFixed(2);
					const pct = Math.max(4, Math.min(100, (num / maxScale) * 100));
					barEl.style.width = `${pct.toFixed(0)}%`;
					barEl.style.backgroundColor = this._copColor(num);
				} else {
					valEl.textContent = '–';
					barEl.style.width = '0%';
					barEl.style.backgroundColor = 'transparent';
				}
			}
		}

		// Gesamtzähler & Lebenszeit-JAZ
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

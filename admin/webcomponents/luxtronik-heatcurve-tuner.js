/**
 * <luxtronik-heatcurve-tuner>
 * Interaktive Live-Heizkurve mit Hysterese-Band, Heizgrenze und Parallelverschiebungs-Slider
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const CHART = {
	left: 40,
	right: 446,
	top: 16,
	bottom: 168,
	tOutMin: -20,
	tOutMax: 20,
};

class LuxtronikHeatcurveTuner extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			basePoint: 'Settings.02_Heating.heating_curve_parallel_offset',
			endPoint: 'Settings.02_Heating.heating_curve_end_point',
			offset: 'Settings.02_Heating.heating_temperature',
			hysteresis: 'Settings.02_Heating.returnTemperatureHysteresis',
			heatingLimitActive: 'Settings.02_Heating.heatingLimit',
			heatingLimitTemp: 'Settings.02_Heating.thresholdHeatingLimit',
			outsideTemp: 'Information.01_Temperatures.temperature_outside',
			avgOutsideTemp: 'Information.01_Temperatures.Mitteltemperatur',
			returnTemp: 'Information.01_Temperatures.temperature_return',
			returnTarget: 'Information.01_Temperatures.temperature_target_return',
			heatingStatus: 'Information.08_OperatingState.opStateHeatingString',
			pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
		};
	}

	constructor() {
		super();
		this._pendingOffset = null;
	}

	_renderBase() {
		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
					--lux-heating: #f97316;
					--lux-target: #3b82f6;
					--lux-limit: #06b6d4;
					--lux-ok: #22c55e;
					--lux-pv: #eab308;
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
					flex-wrap: wrap;
				}

				.title { font-size: 0.98rem; font-weight: 600; }
				.subtitle { font-size: 0.74rem; opacity: 0.74; font-variant-numeric: tabular-nums; }
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
				.pill.pv { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }
				.hidden { display: none !important; }

				.chart-wrap {
					flex: 1;
					min-height: 150px;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 6px;
					box-sizing: border-box;
				}

				svg {
					width: 100%;
					height: 100%;
					display: block;
				}

				.grid-line { stroke: currentColor; stroke-opacity: 0.14; stroke-width: 1; }
				.axis-lbl { font-size: 9.5px; fill: currentColor; opacity: 0.68; font-variant-numeric: tabular-nums; }
				.hyst-band { fill: var(--lux-heating); fill-opacity: 0.16; }
				.curve-main { fill: none; stroke: var(--lux-heating); stroke-width: 2.4; stroke-linecap: round; }
				.curve-preview { fill: none; stroke: var(--lux-pv); stroke-width: 2.2; stroke-dasharray: 5 4; stroke-linecap: round; }
				.limit-line { stroke: var(--lux-limit); stroke-width: 1.4; stroke-dasharray: 4 3; }
				.limit-lbl { font-size: 9px; font-weight: 600; fill: var(--lux-limit); }

				.live-pulse {
					fill: var(--lux-ok);
					fill-opacity: 0.25;
					transform-box: fill-box;
					transform-origin: center;
					animation: pulse 2s ease-out infinite;
				}

				@keyframes pulse {
					0% { transform: scale(1); opacity: 0.65; }
					100% { transform: scale(2.1); opacity: 0; }
				}

				.legend {
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
					gap: 8px;
					font-size: 0.72rem;
					opacity: 0.82;
					font-variant-numeric: tabular-nums;
				}

				.legend-items { display: flex; gap: 10px; flex-wrap: wrap; }
				.leg { display: inline-flex; align-items: center; gap: 4px; }
				.swatch { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

				.tuner {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 8px 10px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.tuner-head {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 0.78rem;
					font-variant-numeric: tabular-nums;
				}

				.tuner-val { font-weight: 700; color: var(--lux-heating); }
				.tuner-val.dirty { color: var(--lux-pv); }

				.slider-row {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				input[type="range"] {
					flex: 1;
					accent-color: var(--lux-heating);
					cursor: pointer;
				}

				.btn {
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 7px;
					padding: 5px 9px;
					font-size: 0.74rem;
					font-weight: 600;
					cursor: pointer;
				}

				.btn.primary {
					border-color: rgba(234, 179, 8, 0.55);
					background: rgba(234, 179, 8, 0.18);
					color: var(--lux-pv);
				}

				.btn:disabled {
					opacity: 0.4;
					cursor: default;
				}
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Heizkurve</div>
						<div class="subtitle" data-ref="subtitle">Fußpunkt – · Endpunkt –</div>
					</div>
					<div class="badges">
						<span class="pill pv hidden" data-ref="pvBadge">PV-Boost</span>
						<span class="pill ok" data-ref="statusBadge">–</span>
					</div>
				</div>

				<div class="chart-wrap">
					<svg viewBox="0 0 460 194" preserveAspectRatio="xMidYMid meet">
						<g data-ref="gridLayer"></g>
						<!-- Hysterese-Korridor -->
						<polygon class="hyst-band" data-ref="hystPoly" points="" />
						<!-- Heizgrenze -->
						<line class="limit-line hidden" data-ref="limitLine" x1="0" x2="0" y1="${CHART.top}" y2="${CHART.bottom}" />
						<text class="limit-lbl hidden" data-ref="limitLabel" x="0" y="${CHART.top + 10}" text-anchor="start">Heizgrenze</text>
						<!-- Aktive Heizkurve -->
						<line class="curve-main" data-ref="curveLine" x1="0" y1="0" x2="0" y2="0" />
						<!-- Gestrichelte Vorschau-Kurve bei Slider-Änderung -->
						<line class="curve-preview hidden" data-ref="previewLine" x1="0" y1="0" x2="0" y2="0" />
						<!-- Regler Rücklauf-Soll Punkt -->
						<circle class="hidden" data-ref="targetDot" r="4.2" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2" />
						<!-- Live-Arbeitspunkt (Außen / Rücklauf-Ist) -->
						<g class="hidden" data-ref="liveGroup">
							<circle class="live-pulse" data-ref="livePulse" r="6" />
							<circle data-ref="liveDot" r="4.8" fill="#22c55e" stroke="#ffffff" stroke-width="1.4" />
						</g>
					</svg>
				</div>

				<div class="legend">
					<div class="legend-items">
						<span class="leg"><span class="swatch" style="background:#22c55e"></span>Ist: <strong data-ref="legIst">–</strong></span>
						<span class="leg"><span class="swatch" style="background:#3b82f6"></span>Soll: <strong data-ref="legSoll">–</strong></span>
						<span class="leg"><span class="swatch" style="background:#f97316"></span>Hyst: <strong data-ref="legHyst">–</strong></span>
					</div>
					<span data-ref="legOut">Außen: –</span>
				</div>

				<div class="tuner" data-ref="tunerBar">
					<div class="tuner-head">
						<span>Parallelverschiebung (Offset)</span>
						<span class="tuner-val" data-ref="offsetLabel">0.0 K</span>
					</div>
					<div class="slider-row">
						<button class="btn" type="button" data-ref="btnMinus">−</button>
						<input type="range" min="-5" max="5" step="0.5" value="0" data-ref="offsetSlider" />
						<button class="btn" type="button" data-ref="btnPlus">+</button>
						<button class="btn primary" type="button" data-ref="btnApply" disabled>Übernehmen</button>
						<button class="btn hidden" type="button" data-ref="btnCancel">✕</button>
					</div>
				</div>
			</div>
		`;
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
	}

	_collectRefs() {
		super._collectRefs();
		const r = this._refs;
		if (!r.offsetSlider) {
			return;
		}

		r.offsetSlider.addEventListener('input', () => {
			this._pendingOffset = parseFloat(r.offsetSlider.value);
			this._updateView();
		});

		r.btnMinus.addEventListener('click', () => {
			const cur = this._pendingOffset ?? this._toNum(this._values.offset) ?? 0;
			const minVal = parseFloat(r.offsetSlider.min);
			this._pendingOffset = Math.max(minVal, Math.round((cur - 0.5) * 10) / 10);
			this._updateView();
		});

		r.btnPlus.addEventListener('click', () => {
			const cur = this._pendingOffset ?? this._toNum(this._values.offset) ?? 0;
			const maxVal = parseFloat(r.offsetSlider.max);
			this._pendingOffset = Math.min(maxVal, Math.round((cur + 0.5) * 10) / 10);
			this._updateView();
		});

		r.btnApply.addEventListener('click', () => {
			if (this._pendingOffset === null) {
				return;
			}
			const val = Math.round(this._pendingOffset * 10) / 10;
			this._writeState('Settings.02_Heating.heating_temperature', val);
			this._pendingOffset = null;
			this._updateView();
		});

		r.btnCancel.addEventListener('click', () => {
			this._pendingOffset = null;
			this._updateView();
		});
	}

	_curveTemp(tOut, fp, ep, offset) {
		return fp + ((ep - fp) * (20 - tOut)) / 40 + offset;
	}

	_xForOutside(tOut) {
		// +20 °C links, -20 °C rechts (klassische Heizkurven-Ausrichtung)
		const ratio = (CHART.tOutMax - tOut) / (CHART.tOutMax - CHART.tOutMin);
		return CHART.left + Math.max(0, Math.min(1, ratio)) * (CHART.right - CHART.left);
	}

	_yForTemp(temp, yMin, yMax) {
		const ratio = (temp - yMin) / Math.max(1, yMax - yMin);
		return CHART.bottom - Math.max(0, Math.min(1, ratio)) * (CHART.bottom - CHART.top);
	}

	_drawGrid(yMin, yMax) {
		const svgNs = 'http://www.w3.org/2000/svg';
		const layer = this._refs.gridLayer;
		while (layer.firstChild) {
			layer.removeChild(layer.firstChild);
		}

		// Vertikale Gitterlinien (+20, +10, 0, -10, -20 °C)
		const xTicks = [20, 10, 0, -10, -20];
		for (const t of xTicks) {
			const x = this._xForOutside(t);
			const line = document.createElementNS(svgNs, 'line');
			line.setAttribute('class', 'grid-line');
			line.setAttribute('x1', x.toFixed(1));
			line.setAttribute('x2', x.toFixed(1));
			line.setAttribute('y1', String(CHART.top));
			line.setAttribute('y2', String(CHART.bottom));
			layer.appendChild(line);

			const lbl = document.createElementNS(svgNs, 'text');
			lbl.setAttribute('class', 'axis-lbl');
			lbl.setAttribute('x', x.toFixed(1));
			lbl.setAttribute('y', String(CHART.bottom + 14));
			lbl.setAttribute('text-anchor', 'middle');
			lbl.textContent = `${t}°`;
			layer.appendChild(lbl);
		}

		// Horizontale Gitterlinien (4 gleichmäßige Schritte)
		const steps = 4;
		for (let i = 0; i <= steps; i++) {
			const val = yMin + ((yMax - yMin) * i) / steps;
			const y = this._yForTemp(val, yMin, yMax);
			const line = document.createElementNS(svgNs, 'line');
			line.setAttribute('class', 'grid-line');
			line.setAttribute('x1', String(CHART.left));
			line.setAttribute('x2', String(CHART.right));
			line.setAttribute('y1', y.toFixed(1));
			line.setAttribute('y2', y.toFixed(1));
			layer.appendChild(line);

			const lbl = document.createElementNS(svgNs, 'text');
			lbl.setAttribute('class', 'axis-lbl');
			lbl.setAttribute('x', String(CHART.left - 6));
			lbl.setAttribute('y', (y + 3).toFixed(1));
			lbl.setAttribute('text-anchor', 'end');
			lbl.textContent = `${val.toFixed(0)}°`;
			layer.appendChild(lbl);
		}
	}

	_updateView() {
		const r = this._refs;
		if (!r.title) {
			return;
		}

		const v = this._values;
		const fp = this._toNum(v.basePoint);
		const ep = this._toNum(v.endPoint);
		const liveOffset = this._toNum(v.offset) ?? 0;
		const hyst = this._toNum(v.hysteresis) ?? 1.5;
		const tOut = this._toNum(v.outsideTemp);
		const tAvg = this._toNum(v.avgOutsideTemp);
		const rlIst = this._toNum(v.returnTemp);
		const rlSoll = this._toNum(v.returnTarget);
		const limitOn = this._toBool(v.heatingLimitActive);
		const limitTemp = this._toNum(v.heatingLimitTemp);

		r.title.textContent = this._settings?.title || 'Heizkurve';
		r.subtitle.textContent = `Fußpunkt ${this._fmtTemp(fp)} · Endpunkt ${this._fmtTemp(ep)} · Offset ${liveOffset >= 0 ? '+' : ''}${liveOffset.toFixed(1)} K`;
		r.statusBadge.textContent = v.heatingStatus || '–';
		r.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));
		r.tunerBar.classList.toggle('hidden', this._settings?.allowEdit === false);

		r.legIst.textContent = this._fmtTemp(rlIst);
		r.legSoll.textContent = this._fmtTemp(rlSoll);
		r.legHyst.textContent = `±${hyst.toFixed(1)} K`;
		r.legOut.textContent = `Außen: ${this._fmtTemp(tOut)}${tAvg !== null ? ` (Ø ${tAvg.toFixed(1)}°)` : ''}`;

		// Slider & Dirty-Zustand
		const sliderMin = Math.min(-5, Math.floor(liveOffset - 2));
		const sliderMax = Math.max(5, Math.ceil(liveOffset + 2));
		r.offsetSlider.min = String(sliderMin);
		r.offsetSlider.max = String(sliderMax);

		const shownOffset = this._pendingOffset !== null ? this._pendingOffset : liveOffset;
		const isDirty = this._pendingOffset !== null && Math.abs(this._pendingOffset - liveOffset) >= 0.05;
		r.offsetSlider.value = String(shownOffset);
		r.offsetLabel.textContent = `${shownOffset >= 0 ? '+' : ''}${shownOffset.toFixed(1)} K${isDirty ? ' (Vorschau)' : ''}`;
		r.offsetLabel.classList.toggle('dirty', isDirty);
		r.btnApply.disabled = !isDirty || this._editMode;
		r.btnCancel.classList.toggle('hidden', !isDirty);

		if (fp === null || ep === null) {
			return;
		}

		// Dynamische Y-Skalierung
		const cLeft = this._curveTemp(20, fp, ep, liveOffset);
		const cRight = this._curveTemp(-20, fp, ep, liveOffset);
		const pLeft = this._curveTemp(20, fp, ep, shownOffset);
		const pRight = this._curveTemp(-20, fp, ep, shownOffset);

		const sampleVals = [cLeft - hyst, cLeft + hyst, cRight - hyst, cRight + hyst, pLeft, pRight];
		if (rlIst !== null) {
			sampleVals.push(rlIst);
		}
		if (rlSoll !== null) {
			sampleVals.push(rlSoll);
		}

		const rawMin = Math.min(...sampleVals);
		const rawMax = Math.max(...sampleVals);
		const yMin = Math.floor((rawMin - 2) / 2) * 2;
		const yMax = Math.max(yMin + 10, Math.ceil((rawMax + 2) / 2) * 2);

		this._drawGrid(yMin, yMax);

		const xL = CHART.left;
		const xR = CHART.right;

		// Aktive Kurve
		const yL = this._yForTemp(cLeft, yMin, yMax);
		const yR = this._yForTemp(cRight, yMin, yMax);
		r.curveLine.setAttribute('x1', xL.toFixed(1));
		r.curveLine.setAttribute('y1', yL.toFixed(1));
		r.curveLine.setAttribute('x2', xR.toFixed(1));
		r.curveLine.setAttribute('y2', yR.toFixed(1));

		// Hysterese-Band
		const yLHigh = this._yForTemp(cLeft + hyst, yMin, yMax);
		const yLLow = this._yForTemp(cLeft - hyst, yMin, yMax);
		const yRHigh = this._yForTemp(cRight + hyst, yMin, yMax);
		const yRLow = this._yForTemp(cRight - hyst, yMin, yMax);
		r.hystPoly.setAttribute(
			'points',
			`${xL.toFixed(1)},${yLHigh.toFixed(1)} ${xR.toFixed(1)},${yRHigh.toFixed(1)} ${xR.toFixed(1)},${yRLow.toFixed(1)} ${xL.toFixed(1)},${yLLow.toFixed(1)}`,
		);

		// Vorschau-Kurve
		if (isDirty) {
			r.previewLine.classList.remove('hidden');
			r.previewLine.setAttribute('x1', xL.toFixed(1));
			r.previewLine.setAttribute('y1', this._yForTemp(pLeft, yMin, yMax).toFixed(1));
			r.previewLine.setAttribute('x2', xR.toFixed(1));
			r.previewLine.setAttribute('y2', this._yForTemp(pRight, yMin, yMax).toFixed(1));
		} else {
			r.previewLine.classList.add('hidden');
		}

		// Heizgrenze
		if (limitOn && limitTemp !== null && limitTemp >= CHART.tOutMin && limitTemp <= CHART.tOutMax) {
			const xLim = this._xForOutside(limitTemp);
			r.limitLine.classList.remove('hidden');
			r.limitLine.setAttribute('x1', xLim.toFixed(1));
			r.limitLine.setAttribute('x2', xLim.toFixed(1));
			r.limitLabel.classList.remove('hidden');
			r.limitLabel.setAttribute('x', (xLim + 4).toFixed(1));
			r.limitLabel.textContent = `HG ${limitTemp.toFixed(1)}°`;
		} else {
			r.limitLine.classList.add('hidden');
			r.limitLabel.classList.add('hidden');
		}

		// Regler-Sollpunkt
		if (tOut !== null && rlSoll !== null) {
			const xOut = this._xForOutside(tOut);
			const ySoll = this._yForTemp(rlSoll, yMin, yMax);
			r.targetDot.classList.remove('hidden');
			r.targetDot.setAttribute('cx', xOut.toFixed(1));
			r.targetDot.setAttribute('cy', ySoll.toFixed(1));
		} else {
			r.targetDot.classList.add('hidden');
		}

		// Live-Arbeitspunkt
		if (tOut !== null && rlIst !== null) {
			const xOut = this._xForOutside(tOut);
			const yIst = this._yForTemp(rlIst, yMin, yMax);
			r.liveGroup.classList.remove('hidden');
			r.liveDot.setAttribute('cx', xOut.toFixed(1));
			r.liveDot.setAttribute('cy', yIst.toFixed(1));
			r.livePulse.setAttribute('cx', xOut.toFixed(1));
			r.livePulse.setAttribute('cy', yIst.toFixed(1));
		} else {
			r.liveGroup.classList.add('hidden');
		}
	}
}

if (!customElements.get('luxtronik-heatcurve-tuner')) {
	customElements.define('luxtronik-heatcurve-tuner', LuxtronikHeatcurveTuner);
}

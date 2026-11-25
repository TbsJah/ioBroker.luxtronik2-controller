/**
 * <luxtronik-hydraulics-flow>
 * Animiertes Hydraulik- und Energiefluss-Schema für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const MODE_META = {
	0: { text: 'Heizbetrieb', cls: 'mode-heating' },
	1: { text: 'Warmwasser', cls: 'mode-ww' },
	2: { text: 'Schwimmbad / PV', cls: 'mode-ww' },
	3: { text: 'EVU-Sperre', cls: 'mode-idle' },
	4: { text: 'Abtauen', cls: 'mode-defrost' },
	5: { text: 'Kein Bedarf', cls: 'mode-idle' },
	6: { text: '2. Erzeuger', cls: 'mode-zwe' },
	7: { text: 'Kühlbetrieb', cls: 'mode-defrost' },
};

class LuxtronikHydraulicsFlow extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			modeCode: 'Information.08_OperatingState.WP_BZ_akt',
			duration: 'Information.08_OperatingState.heatpump_duration',
			supplyTemp: 'Information.01_Temperatures.temperature_supply',
			returnTemp: 'Information.01_Temperatures.temperature_return',
			returnTarget: 'Information.01_Temperatures.temperature_target_return',
			outsideTemp: 'Information.01_Temperatures.temperature_outside',
			sourceIn: 'Information.01_Temperatures.temperature_heat_source_in',
			sourceOut: 'Information.01_Temperatures.temperature_heat_source_out',
			wwTemp: 'Information.01_Temperatures.Wamwassertemperatur_Ist',
			wwTarget: 'Information.01_Temperatures.Wamwassertemperatur_Soll',
			vd1: 'Information.03_Outputs.VD1out',
			hup: 'Information.03_Outputs.HUPout',
			bup: 'Information.03_Outputs.BUPout',
			av: 'Information.03_Outputs.AVout',
			zw1: 'Information.03_Outputs.ZW1out',
			zipActive: 'Information.03_Outputs.Virtual_ZIP_Status',
			freq: 'Information.12_SystemInfo.pump_frequency',
			heatPower: 'Information.12_SystemInfo.current_heat_output',
			elecPower: 'Information.12_SystemInfo.current_power_consumption',
			hupVoltage: 'Settings.04_HUP.heating_system_circ_pump_voltage_nominal',
			pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
		};
	}

	_renderBase() {
		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
					--lux-pipe-idle: rgba(148, 163, 184, 0.28);
					--lux-heating: #f97316;
					--lux-ww: #3b82f6;
					--lux-defrost: #06b6d4;
					--lux-source: #10b981;
					--lux-zwe: #ef4444;
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
					overflow: hidden;
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.title { font-size: 0.98rem; font-weight: 600; }
				.subtitle { font-size: 0.75rem; opacity: 0.72; }
				.badges { display: flex; gap: 6px; align-items: center; }

				.pill {
					display: inline-flex;
					align-items: center;
					gap: 5px;
					padding: 3px 9px;
					border-radius: 999px;
					font-size: 0.74rem;
					font-weight: 600;
					border: 1px solid var(--lux-border);
					background: var(--lux-surface);
				}

				.pill .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
				.pill.mode-heating { color: var(--lux-heating); border-color: rgba(249, 115, 22, 0.45); background: rgba(249, 115, 22, 0.14); }
				.pill.mode-ww { color: var(--lux-ww); border-color: rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.14); }
				.pill.mode-defrost { color: var(--lux-defrost); border-color: rgba(6, 182, 212, 0.45); background: rgba(6, 182, 212, 0.14); }
				.pill.mode-zwe { color: var(--lux-zwe); border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.14); }
				.pill.pv-active { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }
				.hidden { display: none !important; }

				.svg-wrap {
					flex: 1;
					min-height: 0;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				svg {
					width: 100%;
					height: 100%;
					max-height: 100%;
					display: block;
				}

				.node-box {
					fill: var(--lux-surface);
					stroke: var(--lux-border);
					stroke-width: 1.4;
					rx: 12;
					transition: stroke 0.3s ease;
				}

				.node-box.active-heating { stroke: var(--lux-heating); }
				.node-box.active-ww { stroke: var(--lux-ww); }
				.node-box.active-defrost { stroke: var(--lux-defrost); }
				.node-box.active-source { stroke: var(--lux-source); }
				.node-box.active-zwe { stroke: var(--lux-zwe); }

				.lbl { font-size: 9.5px; font-weight: 600; fill: currentColor; opacity: 0.68; text-transform: uppercase; letter-spacing: 0.04em; }
				.val-lg { font-size: 15px; font-weight: 700; fill: currentColor; font-variant-numeric: tabular-nums; }
				.val-sm { font-size: 10.5px; font-weight: 500; fill: currentColor; opacity: 0.85; font-variant-numeric: tabular-nums; }
				.pipe-lbl { font-size: 9.5px; font-weight: 600; fill: currentColor; opacity: 0.8; }

				.pipe-bg {
					fill: none;
					stroke: var(--lux-pipe-idle);
					stroke-width: 5;
					stroke-linecap: round;
					stroke-linejoin: round;
				}

				.pipe-flow {
					fill: none;
					stroke: transparent;
					stroke-width: 4;
					stroke-linecap: round;
					stroke-linejoin: round;
					stroke-dasharray: 8 10;
					opacity: 0;
					transition: opacity 0.3s ease, stroke 0.3s ease;
				}

				.pipe-flow.flowing {
					opacity: 1;
					animation: flowForward var(--lux-flow-speed, 1.1s) linear infinite;
				}

				.pipe-flow.flowing-reverse {
					opacity: 1;
					animation: flowReverse var(--lux-flow-speed, 1.1s) linear infinite;
				}

				@keyframes flowForward {
					from { stroke-dashoffset: 36; }
					to { stroke-dashoffset: 0; }
				}

				@keyframes flowReverse {
					from { stroke-dashoffset: 0; }
					to { stroke-dashoffset: 36; }
				}

				.rotor {
					transform-box: fill-box;
					transform-origin: center;
				}

				.rotor.spinning {
					animation: spin var(--lux-rotor-speed, 1.8s) linear infinite;
				}

				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}

				.valve-circle {
					fill: var(--lux-surface);
					stroke: var(--lux-border);
					stroke-width: 1.6;
				}

				.valve-arrow {
					fill: currentColor;
					transform-box: fill-box;
					transform-origin: center;
					transition: transform 0.35s ease, fill 0.3s ease;
				}

				.zwe-tag {
					fill: var(--lux-zwe);
					font-size: 9px;
					font-weight: 700;
				}
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Hydraulik & Energiefluss</div>
						<div class="subtitle" data-ref="subtitle">Bitte Instanz auswählen</div>
					</div>
					<div class="badges">
						<span class="pill pv-active hidden" data-ref="pvBadge">PV-Boost</span>
						<span class="pill mode-idle" data-ref="modePill">
							<span class="dot"></span>
							<span data-ref="modeText">–</span>
						</span>
					</div>
				</div>

				<div class="svg-wrap">
					<svg viewBox="0 0 480 210" preserveAspectRatio="xMidYMid meet">
						<!-- Rohrleitungen Hintergrund -->
						<!-- Quelle <-> WP -->
						<path class="pipe-bg" d="M 106 88 L 154 88" />
						<path class="pipe-bg" d="M 154 126 L 106 126" />
						<!-- WP <-> 3-Wege-Ventil -->
						<path class="pipe-bg" d="M 274 107 L 314 107" />
						<!-- Ventil -> Heizkreis (oben) -->
						<path class="pipe-bg" d="M 328 93 L 328 56 L 358 56" />
						<!-- Ventil -> Warmwasser (unten) -->
						<path class="pipe-bg" d="M 328 121 L 328 158 L 358 158" />

						<!-- Animierte Flusslinien -->
						<path class="pipe-flow" data-ref="pipeSourceIn" d="M 106 88 L 154 88" />
						<path class="pipe-flow" data-ref="pipeSourceOut" d="M 154 126 L 106 126" />
						<path class="pipe-flow" data-ref="pipeMain" d="M 274 107 L 314 107" />
						<path class="pipe-flow" data-ref="pipeHeating" d="M 328 93 L 328 56 L 358 56" />
						<path class="pipe-flow" data-ref="pipeWw" d="M 328 121 L 328 158 L 358 158" />

						<!-- Beschriftung Vorlauf / Rücklauf -->
						<text class="pipe-lbl" x="294" y="96" text-anchor="middle" data-ref="vlLabel">VL –</text>
						<text class="pipe-lbl" x="294" y="124" text-anchor="middle" data-ref="rlLabel">RL –</text>

						<!-- 1. Wärmequelle / Außen -->
						<rect class="node-box" data-ref="boxSource" x="8" y="48" width="98" height="118" />
						<text class="lbl" x="57" y="68" text-anchor="middle">Quelle / Außen</text>
						<text class="val-lg" x="57" y="94" text-anchor="middle" data-ref="outsideTemp">–</text>
						<text class="val-sm" x="57" y="122" text-anchor="middle" data-ref="sourceIn">TWE: –</text>
						<text class="val-sm" x="57" y="140" text-anchor="middle" data-ref="sourceOut">TWA: –</text>

						<!-- 2. Wärmepumpe / Verdichter -->
						<rect class="node-box" data-ref="boxHp" x="154" y="34" width="120" height="146" />
						<text class="lbl" x="214" y="54" text-anchor="middle">Wärmepumpe</text>

						<!-- Verdichter-Rotor Icon -->
						<g transform="translate(214, 92)">
							<circle r="21" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="2" />
							<g class="rotor" data-ref="rotor">
								<path d="M 0 -14 C 6 -12, 8 -4, 0 0 C -6 -2, -8 -10, 0 -14 Z" fill="currentColor" opacity="0.8" />
								<path d="M 12 7 C 7 11, -1 9, 0 0 C 5 -4, 13 -1, 12 7 Z" fill="currentColor" opacity="0.8" />
								<path d="M -12 7 C -13 -1, -5 -4, 0 0 C 1 9, -7 11, -12 7 Z" fill="currentColor" opacity="0.8" />
							</g>
							<circle r="4" fill="currentColor" />
						</g>

						<text class="val-sm" x="214" y="132" text-anchor="middle" data-ref="vdInfo">VD1: Aus</text>
						<text class="val-sm" x="214" y="149" text-anchor="middle" data-ref="hupInfo">HUP: –</text>
						<text class="val-sm" x="214" y="165" text-anchor="middle" data-ref="powerInfo">–</text>
						<text class="zwe-tag hidden" x="214" y="25" text-anchor="middle" data-ref="zweTag">⚡ ZWE1 AKTIV</text>

						<!-- 3. 3-Wege-Umschaltventil -->
						<g transform="translate(328, 107)">
							<circle class="valve-circle" r="14" data-ref="valveCircle" />
							<polygon class="valve-arrow" data-ref="valveArrow" points="0,-8 6,5 -6,5" />
						</g>

						<!-- 4. Heizkreis -->
						<rect class="node-box" data-ref="boxHeating" x="358" y="14" width="114" height="84" />
						<text class="lbl" x="415" y="33" text-anchor="middle">Heizkreis</text>
						<text class="val-lg" x="415" y="57" text-anchor="middle" data-ref="returnTemp">–</text>
						<text class="val-sm" x="415" y="75" text-anchor="middle" data-ref="returnTarget">Soll: –</text>
						<text class="val-sm" x="415" y="90" text-anchor="middle" data-ref="spreadInfo">ΔT: –</text>

						<!-- 5. Warmwasser -->
						<rect class="node-box" data-ref="boxWw" x="358" y="114" width="114" height="84" />
						<text class="lbl" x="415" y="133" text-anchor="middle">Warmwasser</text>
						<text class="val-lg" x="415" y="157" text-anchor="middle" data-ref="wwTemp">–</text>
						<text class="val-sm" x="415" y="175" text-anchor="middle" data-ref="wwTarget">Soll: –</text>
						<text class="val-sm" x="415" y="190" text-anchor="middle" data-ref="zipInfo">ZIP: Aus</text>
					</svg>
				</div>
			</div>
		`;
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
	}

	_setPipe(el, color, direction) {
		if (!el) {
			return;
		}
		el.classList.remove('flowing', 'flowing-reverse');
		if (direction === 'forward') {
			el.style.stroke = color;
			el.classList.add('flowing');
		} else if (direction === 'reverse') {
			el.style.stroke = color;
			el.classList.add('flowing-reverse');
		} else {
			el.style.stroke = 'transparent';
		}
	}

	_updateView() {
		const r = this._refs;
		if (!r.title) {
			return;
		}

		const prefix = this._getInstancePrefix();
		const v = this._values;
		const modeCode = this._toNum(v.modeCode);
		const modeInfo =
			modeCode !== null && MODE_META[modeCode] ? MODE_META[modeCode] : { text: '–', cls: 'mode-idle' };

		r.title.textContent = this._settings?.title || 'Hydraulik & Energiefluss';
		r.subtitle.textContent = !prefix
			? 'Bitte Instanz in den Einstellungen wählen'
			: v.duration
				? `Seit ${v.duration}`
				: prefix;
		r.modeText.textContent = modeInfo.text;
		r.modePill.className = `pill ${modeInfo.cls}`;
		r.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));

		const vd1 = this._toBool(v.vd1);
		const hup = this._toBool(v.hup);
		const bup = this._toBool(v.bup);
		const av = this._toBool(v.av);
		const zw1 = this._toBool(v.zw1);
		const zip = this._toBool(v.zipActive);

		const isDefrost = modeCode === 4 || av;
		const isWw = !isDefrost && (modeCode === 1 || (bup && vd1));
		const isHeating = !isDefrost && !isWw && (modeCode === 0 || (vd1 && hup));
		const isZwe = zw1 || modeCode === 6;

		// Animationsgeschwindigkeit dynamisch an Inverter-Frequenz anpassen
		const freq = this._toNum(v.freq);
		if (freq && freq > 10) {
			const factor = Math.max(0.55, Math.min(1.8, 60 / freq));
			this.style.setProperty('--lux-flow-speed', `${(1.1 * factor).toFixed(2)}s`);
			this.style.setProperty('--lux-rotor-speed', `${(1.6 * factor).toFixed(2)}s`);
		} else {
			this.style.setProperty('--lux-flow-speed', '1.15s');
			this.style.setProperty('--lux-rotor-speed', '1.8s');
		}

		// Rotor & Box-Highlights
		r.rotor.classList.toggle('spinning', vd1);
		r.zweTag.classList.toggle('hidden', !isZwe);

		r.boxSource.setAttribute('class', `node-box ${vd1 ? (isDefrost ? 'active-defrost' : 'active-source') : ''}`);
		r.boxHp.setAttribute(
			'class',
			`node-box ${isZwe ? 'active-zwe' : isDefrost ? 'active-defrost' : isWw ? 'active-ww' : isHeating ? 'active-heating' : ''}`,
		);
		r.boxHeating.setAttribute(
			'class',
			`node-box ${isHeating ? 'active-heating' : isDefrost ? 'active-defrost' : ''}`,
		);
		r.boxWw.setAttribute('class', `node-box ${isWw ? 'active-ww' : ''}`);

		// 3-Wege-Ventil Pfeil ausrichten (oben = Heizkreis, unten = WW)
		if (isWw) {
			r.valveArrow.style.transform = 'rotate(180deg)';
			r.valveArrow.style.fill = 'var(--lux-ww)';
		} else if (isDefrost) {
			r.valveArrow.style.transform = 'rotate(0deg)';
			r.valveArrow.style.fill = 'var(--lux-defrost)';
		} else if (isHeating || hup) {
			r.valveArrow.style.transform = 'rotate(0deg)';
			r.valveArrow.style.fill = 'var(--lux-heating)';
		} else {
			r.valveArrow.style.transform = 'rotate(90deg)';
			r.valveArrow.style.fill = 'currentColor';
		}

		// Animierte Rohre
		if (isDefrost) {
			this._setPipe(r.pipeSourceIn, 'var(--lux-defrost)', 'reverse');
			this._setPipe(r.pipeSourceOut, 'var(--lux-defrost)', 'reverse');
			this._setPipe(r.pipeMain, 'var(--lux-defrost)', 'reverse');
			this._setPipe(r.pipeHeating, 'var(--lux-defrost)', 'reverse');
			this._setPipe(r.pipeWw, '', 'off');
		} else if (isWw) {
			this._setPipe(r.pipeSourceIn, 'var(--lux-source)', vd1 ? 'forward' : 'off');
			this._setPipe(r.pipeSourceOut, 'var(--lux-source)', vd1 ? 'forward' : 'off');
			this._setPipe(r.pipeMain, 'var(--lux-ww)', 'forward');
			this._setPipe(r.pipeHeating, '', 'off');
			this._setPipe(r.pipeWw, 'var(--lux-ww)', 'forward');
		} else if (isHeating || (hup && !vd1)) {
			const c = isZwe ? 'var(--lux-zwe)' : 'var(--lux-heating)';
			this._setPipe(r.pipeSourceIn, 'var(--lux-source)', vd1 ? 'forward' : 'off');
			this._setPipe(r.pipeSourceOut, 'var(--lux-source)', vd1 ? 'forward' : 'off');
			this._setPipe(r.pipeMain, c, 'forward');
			this._setPipe(r.pipeHeating, c, 'forward');
			this._setPipe(r.pipeWw, '', 'off');
		} else {
			this._setPipe(r.pipeSourceIn, '', 'off');
			this._setPipe(r.pipeSourceOut, '', 'off');
			this._setPipe(r.pipeMain, '', 'off');
			this._setPipe(r.pipeHeating, '', 'off');
			this._setPipe(r.pipeWw, '', 'off');
		}

		// Messwerte
		const vl = this._toNum(v.supplyTemp);
		const rl = this._toNum(v.returnTemp);
		const spread = vl !== null && rl !== null ? vl - rl : null;

		r.vlLabel.textContent = `VL ${this._fmtTemp(vl)}`;
		r.rlLabel.textContent = `RL ${this._fmtTemp(rl)}`;
		r.outsideTemp.textContent = this._fmtTemp(v.outsideTemp);
		r.sourceIn.textContent = `TWE: ${this._fmtTemp(v.sourceIn)}`;
		r.sourceOut.textContent = `TWA: ${this._fmtTemp(v.sourceOut)}`;

		r.vdInfo.textContent = vd1 ? (freq && freq > 0 ? `VD1: ${freq.toFixed(0)} Hz` : 'VD1: Ein') : 'VD1: Aus';
		r.hupInfo.textContent = `HUP: ${this._fmtNum(v.hupVoltage, 'V', 1)}${hup ? ' ●' : ''}`;

		const heatW = this._toNum(v.heatPower);
		const elecW = this._toNum(v.elecPower);
		if (heatW !== null && heatW > 0 && elecW !== null && elecW > 0) {
			r.powerInfo.textContent = `${(heatW / 1000).toFixed(1)} kW / ${(elecW / 1000).toFixed(2)} kW`;
		} else if (heatW !== null && heatW > 0) {
			r.powerInfo.textContent = `${(heatW / 1000).toFixed(1)} kW th.`;
		} else {
			r.powerInfo.textContent = vd1 ? 'Aktiv' : 'Standby';
		}

		r.returnTemp.textContent = this._fmtTemp(rl);
		r.returnTarget.textContent = `Soll: ${this._fmtTemp(v.returnTarget)}`;
		r.spreadInfo.textContent = `ΔT: ${spread === null ? '–' : `${spread.toFixed(1)} K`}`;

		r.wwTemp.textContent = this._fmtTemp(v.wwTemp);
		r.wwTarget.textContent = `Soll: ${this._fmtTemp(v.wwTarget)}`;
		r.zipInfo.textContent = `ZIP: ${zip ? 'Aktiv' : 'Aus'}`;
	}
}

if (!customElements.get('luxtronik-hydraulics-flow')) {
	customElements.define('luxtronik-hydraulics-flow', LuxtronikHydraulicsFlow);
}

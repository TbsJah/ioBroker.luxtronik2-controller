/**
 * <luxtronik-hydraulics-flow>
 * Animiertes Hydraulik- und Energiefluss-Schema mit integriertem Warmwasser-Speicher
 * und optionaler ZIP-/Warmwasser-Steuerleiste für `@iobroker/web-components`.
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
			wwHyst: 'Settings.03_HotWater.hotWaterTemperatureHysteresis',
			vd1: 'Information.03_Outputs.VD1out',
			hup: 'Information.03_Outputs.HUPout',
			bup: 'Information.03_Outputs.BUPout',
			av: 'Information.03_Outputs.AVout',
			zw1: 'Information.03_Outputs.ZW1out',
			zipActive: 'Information.03_Outputs.Virtual_ZIP_Status',
			zipRemaining: 'Information.03_Outputs.Virtual_ZIP_Remaining_Time',
			freq: 'Information.12_SystemInfo.pump_frequency',
			heatPower: 'Information.12_SystemInfo.current_heat_output',
			elecPower: 'Information.12_SystemInfo.current_power_consumption',
			hupVoltage: 'Settings.04_HUP.heating_system_circ_pump_voltage_nominal',
			pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
		};
	}

	static get actionMap() {
		return {
			'activate-zip': 'Actions.Activate_Zip',
			'force-ww': 'Actions.Zwangswarmwasser',
		};
	}

	_renderBase() {
		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
					--lux-pipe-idle: rgba(148, 163, 184, 0.24);
					--lux-heating: #f97316;
					--lux-ww: #3b82f6;
					--lux-defrost: #06b6d4;
					--lux-source: #10b981;
					--lux-zwe: #ef4444;
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
				.subtitle { font-size: 0.74rem; opacity: 0.72; font-variant-numeric: tabular-nums; }
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
					stroke-width: 1.5;
					rx: 12;
					transition: stroke 0.3s ease;
				}

				.node-box.active-heating { stroke: var(--lux-heating); }
				.node-box.active-ww { stroke: var(--lux-ww); }
				.node-box.active-defrost { stroke: var(--lux-defrost); }
				.node-box.active-source { stroke: var(--lux-source); }
				.node-box.active-zwe { stroke: var(--lux-zwe); }

				.lbl { font-size: 9px; font-weight: 700; fill: currentColor; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.05em; }
				.val-lg { font-size: 15.5px; font-weight: 700; fill: currentColor; font-variant-numeric: tabular-nums; }
				.val-sm { font-size: 10.5px; font-weight: 500; fill: currentColor; opacity: 0.85; font-variant-numeric: tabular-nums; }

				.badge-bg {
					fill: rgba(15, 23, 42, 0.72);
					stroke: var(--lux-border);
					stroke-width: 1;
					rx: 7;
				}

				.badge-txt {
					font-size: 9.5px;
					font-weight: 600;
					fill: currentColor;
					font-variant-numeric: tabular-nums;
				}

				.pipe-bg {
					fill: none;
					stroke: var(--lux-pipe-idle);
					stroke-width: 5.5;
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
					filter: drop-shadow(0 0 3px currentColor);
					animation: flowForward var(--lux-flow-speed, 1.1s) linear infinite;
				}

				.pipe-flow.flowing-reverse {
					opacity: 1;
					filter: drop-shadow(0 0 3px currentColor);
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
					font-size: 9.5px;
					font-weight: 700;
				}

				.controls {
					display: flex;
					gap: 8px;
					align-items: center;
					padding-top: 6px;
					border-top: 1px solid var(--lux-border);
				}

				.ctrl-btn {
					flex: 1;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 6px;
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 8px;
					padding: 6px 10px;
					font-size: 0.76rem;
					font-weight: 600;
					cursor: pointer;
					font-variant-numeric: tabular-nums;
					transition: border-color 0.2s ease, background-color 0.2s ease;
				}

				.ctrl-btn:hover {
					border-color: var(--lux-ww);
					background: rgba(59, 130, 246, 0.14);
				}

				.ctrl-btn.zip-running {
					border-color: rgba(34, 197, 94, 0.55);
					background: rgba(34, 197, 94, 0.16);
					color: var(--lux-ok);
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
					<svg viewBox="0 0 560 228" preserveAspectRatio="xMidYMid meet">
						<defs>
							<linearGradient id="miniTankGrad" x1="0" y1="1" x2="0" y2="0">
								<stop offset="0%" stop-color="#2563eb" />
								<stop offset="55%" stop-color="#f97316" />
								<stop offset="100%" stop-color="#ef4444" />
							</linearGradient>
							<clipPath id="miniTankClip">
								<rect x="421" y="130" width="44" height="78" rx="12" />
							</clipPath>
						</defs>

						<!-- Rohrleitungen Hintergrund -->
						<path class="pipe-bg" d="M 110 92 L 154 92" />
						<path class="pipe-bg" d="M 154 134 L 110 134" />
						<path class="pipe-bg" d="M 278 113 L 364 113" />
						<path class="pipe-bg" d="M 378 99 L 378 56 L 412 56" />
						<path class="pipe-bg" d="M 378 127 L 378 168 L 412 168" />

						<!-- Animierte Flusslinien -->
						<path class="pipe-flow" data-ref="pipeSourceIn" d="M 110 92 L 154 92" />
						<path class="pipe-flow" data-ref="pipeSourceOut" d="M 154 134 L 110 134" />
						<path class="pipe-flow" data-ref="pipeMain" d="M 278 113 L 364 113" />
						<path class="pipe-flow" data-ref="pipeHeating" d="M 378 99 L 378 56 L 412 56" />
						<path class="pipe-flow" data-ref="pipeWw" d="M 378 127 L 378 168 L 412 168" />

						<!-- Saubere VL / RL Pill-Badges ohne Überlappung -->
						<g transform="translate(287, 82)">
							<rect class="badge-bg" width="68" height="20" />
							<text class="badge-txt" x="34" y="13.5" text-anchor="middle" data-ref="vlLabel">VL –</text>
						</g>
						<g transform="translate(287, 124)">
							<rect class="badge-bg" width="68" height="20" />
							<text class="badge-txt" x="34" y="13.5" text-anchor="middle" data-ref="rlLabel">RL –</text>
						</g>

						<!-- 1. Wärmequelle / Außen -->
						<rect class="node-box" data-ref="boxSource" x="8" y="48" width="102" height="130" />
						<text class="lbl" x="59" y="68" text-anchor="middle">Quelle / Außen</text>
						<text class="val-lg" x="59" y="96" text-anchor="middle" data-ref="outsideTemp">–</text>
						<text class="val-sm" x="59" y="130" text-anchor="middle" data-ref="sourceIn">TWE: –</text>
						<text class="val-sm" x="59" y="150" text-anchor="middle" data-ref="sourceOut">TWA: –</text>

						<!-- 2. Wärmepumpe / Verdichter -->
						<rect class="node-box" data-ref="boxHp" x="154" y="34" width="124" height="158" />
						<text class="lbl" x="216" y="54" text-anchor="middle">Wärmepumpe</text>

						<!-- Verdichter-Rotor -->
						<g transform="translate(216, 95)">
							<circle r="22" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="2" />
							<g class="rotor" data-ref="rotor">
								<path d="M 0 -15 C 6 -13, 8 -4, 0 0 C -6 -2, -8 -10, 0 -15 Z" fill="currentColor" opacity="0.82" />
								<path d="M 13 7.5 C 7.5 11.5, -1 9.5, 0 0 C 5 -4, 13.5 -1, 13 7.5 Z" fill="currentColor" opacity="0.82" />
								<path d="M -13 7.5 C -13.5 -1, -5 -4, 0 0 C 1 9.5, -7.5 11.5, -13 7.5 Z" fill="currentColor" opacity="0.82" />
							</g>
							<circle r="4" fill="currentColor" />
						</g>

						<text class="val-sm" x="216" y="138" text-anchor="middle" data-ref="vdInfo">VD1: Aus</text>
						<text class="val-sm" x="216" y="156" text-anchor="middle" data-ref="hupInfo">HUP: –</text>
						<text class="val-sm" x="216" y="174" text-anchor="middle" data-ref="powerInfo">–</text>
						<text class="zwe-tag hidden" x="216" y="24" text-anchor="middle" data-ref="zweTag">⚡ ZWE1 AKTIV</text>

						<!-- 3. 3-Wege-Umschaltventil -->
						<g transform="translate(378, 113)">
							<circle class="valve-circle" r="14" />
							<polygon class="valve-arrow" data-ref="valveArrow" points="0,-8 6,5 -6,5" />
						</g>

						<!-- 4. Heizkreis -->
						<rect class="node-box" data-ref="boxHeating" x="412" y="12" width="140" height="92" />
						<text class="lbl" x="482" y="31" text-anchor="middle">Heizkreis</text>
						<text class="val-lg" x="482" y="56" text-anchor="middle" data-ref="returnTemp">–</text>
						<text class="val-sm" x="482" y="75" text-anchor="middle" data-ref="returnTarget">Soll: –</text>
						<text class="val-sm" x="482" y="92" text-anchor="middle" data-ref="spreadInfo">ΔT: –</text>

						<!-- 5. Integrierter Warmwasser-Speicher -->
						<rect class="node-box" data-ref="boxWw" x="412" y="116" width="140" height="102" />
						<!-- Mini-Speicher-Zylinder links -->
						<rect x="421" y="130" width="44" height="78" rx="12" fill="rgba(127,127,127,0.16)" />
						<g clip-path="url(#miniTankClip)">
							<rect x="421" y="208" width="44" height="0" fill="url(#miniTankGrad)" opacity="0.88" data-ref="tankFill" />
						</g>
						<line x1="419" x2="467" y1="184" y2="184" stroke="#93c5fd" stroke-width="1.4" stroke-dasharray="3 2" data-ref="hystLine" />
						<line x1="419" x2="467" y1="146" y2="146" stroke="#ffffff" stroke-width="1.5" opacity="0.85" data-ref="targetLine" />
						<rect x="421" y="130" width="44" height="78" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.34" stroke-width="1.5" />
						<text x="443" y="173" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff" style="text-shadow:0 1px 3px rgba(0,0,0,0.65)" data-ref="tankPct">–</text>

						<!-- Speicher-Kennwerte rechts -->
						<text class="lbl" x="508" y="135" text-anchor="middle">Warmwasser</text>
						<text class="val-lg" x="508" y="159" text-anchor="middle" data-ref="wwTemp">–</text>
						<text class="val-sm" x="508" y="178" text-anchor="middle" data-ref="wwTarget">Soll: –</text>
						<text class="val-sm" x="508" y="195" text-anchor="middle" data-ref="wwReserve">Res: –</text>
						<text class="val-sm" x="508" y="210" text-anchor="middle" data-ref="zipInfo">ZIP: Aus</text>
					</svg>
				</div>

				<div class="controls" data-ref="controlsBar">
					<button class="ctrl-btn" type="button" data-action="activate-zip" data-ref="zipBtn">ZIP starten</button>
					<button class="ctrl-btn" type="button" data-action="force-ww" data-ref="forceWwBtn">WW 1× Aufheizen</button>
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
			el.style.color = color;
			el.classList.add('flowing');
		} else if (direction === 'reverse') {
			el.style.stroke = color;
			el.style.color = color;
			el.classList.add('flowing-reverse');
		} else {
			el.style.stroke = 'transparent';
		}
	}

	_tempToTankY(temp) {
		// Mini-Speicher: y=134 (65 °C oben) bis y=204 (20 °C unten)
		const clamped = Math.max(20, Math.min(65, temp));
		const ratio = (clamped - 20) / (65 - 20);
		return 204 - ratio * 70;
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
		r.controlsBar.classList.toggle('hidden', this._settings?.showControls === false);

		const vd1 = this._toBool(v.vd1);
		const hup = this._toBool(v.hup);
		const bup = this._toBool(v.bup);
		const av = this._toBool(v.av);
		const zw1 = this._toBool(v.zw1);
		const zip = this._toBool(v.zipActive);
		const zipRem = this._toNum(v.zipRemaining) ?? 0;

		const isDefrost = modeCode === 4 || av;
		const isWw = !isDefrost && (modeCode === 1 || (bup && vd1));
		const isHeating = !isDefrost && !isWw && (modeCode === 0 || (vd1 && hup));
		const isZwe = zw1 || modeCode === 6;

		// Animationsgeschwindigkeit
		const freq = this._toNum(v.freq);
		if (freq && freq > 10) {
			const factor = Math.max(0.55, Math.min(1.8, 60 / freq));
			this.style.setProperty('--lux-flow-speed', `${(1.1 * factor).toFixed(2)}s`);
			this.style.setProperty('--lux-rotor-speed', `${(1.6 * factor).toFixed(2)}s`);
		} else {
			this.style.setProperty('--lux-flow-speed', '1.15s');
			this.style.setProperty('--lux-rotor-speed', '1.8s');
		}

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

		r.vlLabel.textContent = vl === null ? 'VL –' : `VL ${vl.toFixed(1)}°`;
		r.rlLabel.textContent = rl === null ? 'RL –' : `RL ${rl.toFixed(1)}°`;
		r.outsideTemp.textContent = this._fmtTemp(v.outsideTemp);
		r.sourceIn.textContent = `TWE: ${this._fmtTemp(v.sourceIn)}`;
		r.sourceOut.textContent = `TWA: ${this._fmtTemp(v.sourceOut)}`;

		r.vdInfo.textContent = vd1 ? (freq && freq > 0 ? `VD1: ${freq.toFixed(0)} Hz` : 'VD1: Ein') : 'VD1: Aus';
		r.hupInfo.textContent = `HUP: ${this._fmtNum(v.hupVoltage, 'V', 1)}${hup ? ' ●' : ''}`;

		const heatW = this._toNum(v.heatPower);
		const elecW = this._toNum(v.elecPower);
		if (heatW !== null && heatW > 0 && elecW !== null && elecW > 0) {
			r.powerInfo.textContent = `${(heatW / 1000).toFixed(1)} / ${(elecW / 1000).toFixed(2)} kW`;
		} else if (heatW !== null && heatW > 0) {
			r.powerInfo.textContent = `${(heatW / 1000).toFixed(1)} kW th.`;
		} else {
			r.powerInfo.textContent = vd1 ? 'Aktiv' : 'Standby';
		}

		r.returnTemp.textContent = this._fmtTemp(rl);
		r.returnTarget.textContent = `Soll: ${this._fmtTemp(v.returnTarget)}`;
		r.spreadInfo.textContent = `ΔT: ${spread === null ? '–' : `${spread.toFixed(1)} K`}`;

		// Integrierter WW-Speicher
		const wwIst = this._toNum(v.wwTemp);
		const wwTarget = this._toNum(v.wwTarget);
		const wwHyst = this._toNum(v.wwHyst);
		const recharge = wwTarget !== null && wwHyst !== null ? wwTarget - wwHyst : null;

		r.wwTemp.textContent = this._fmtTemp(wwIst);
		r.wwTarget.textContent = `Soll: ${this._fmtTemp(wwTarget)}`;

		if (wwIst !== null) {
			const yFill = this._tempToTankY(wwIst);
			r.tankFill.setAttribute('y', yFill.toFixed(1));
			r.tankFill.setAttribute('height', Math.max(0, 208 - yFill).toFixed(1));
		} else {
			r.tankFill.setAttribute('y', '208');
			r.tankFill.setAttribute('height', '0');
		}

		if (wwTarget !== null) {
			const yT = this._tempToTankY(wwTarget);
			r.targetLine.setAttribute('y1', yT.toFixed(1));
			r.targetLine.setAttribute('y2', yT.toFixed(1));
			r.targetLine.style.opacity = '0.85';
		} else {
			r.targetLine.style.opacity = '0';
		}

		if (recharge !== null) {
			const yH = this._tempToTankY(recharge);
			r.hystLine.setAttribute('y1', yH.toFixed(1));
			r.hystLine.setAttribute('y2', yH.toFixed(1));
			r.hystLine.style.opacity = '0.85';
		} else {
			r.hystLine.style.opacity = '0';
		}

		if (wwIst !== null && wwTarget !== null && recharge !== null && wwTarget > recharge) {
			const pct = Math.max(0, Math.min(100, ((wwIst - recharge) / (wwTarget - recharge)) * 100));
			const diff = wwIst - recharge;
			r.tankPct.textContent = `${pct.toFixed(0)}%`;
			r.wwReserve.textContent = `Res: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} K`;
		} else {
			r.tankPct.textContent = '';
			r.wwReserve.textContent = 'Res: –';
		}

		r.zipInfo.textContent = zip && zipRem > 0 ? `ZIP: ${this._fmtSec(zipRem)}` : `ZIP: ${zip ? 'Aktiv' : 'Aus'}`;
		r.zipBtn.classList.toggle('zip-running', zip);
		r.zipBtn.textContent = zip && zipRem > 0 ? `ZIP läuft (${this._fmtSec(zipRem)})` : 'ZIP starten';
	}
}

if (!customElements.get('luxtronik-hydraulics-flow')) {
	customElements.define('luxtronik-hydraulics-flow', LuxtronikHydraulicsFlow);
}

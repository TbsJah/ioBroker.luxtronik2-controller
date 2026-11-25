/**
 * <luxtronik-dhw-tank>
 * Warmwasser-Speicher mit Nachlade-Linie und animiertem ZIP-Countdown-Ring
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 38;

class LuxtronikDhwTank extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			wwTemp: 'Information.01_Temperatures.Wamwassertemperatur_Ist',
			wwTarget: 'Information.01_Temperatures.Wamwassertemperatur_Soll',
			wwHyst: 'Settings.03_HotWater.hotWaterTemperatureHysteresis',
			wwStatus: 'Information.08_OperatingState.opStateHotWaterString',
			modeCode: 'Information.08_OperatingState.WP_BZ_akt',
			vd1: 'Information.03_Outputs.VD1out',
			zipActive: 'Information.03_Outputs.Virtual_ZIP_Status',
			zipRemaining: 'Information.03_Outputs.Virtual_ZIP_Remaining_Time',
			zipDurationNormal: 'Settings.05_ZIP.zip_aktiv',
			pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
		};
	}

	static get actionMap() {
		return {
			'activate-zip': 'Actions.Activate_Zip',
			'force-ww': 'Actions.Zwangswarmwasser',
		};
	}

	constructor() {
		super();
		this._zipPeakSec = 0;
		this._pendingTarget = null;
	}

	_renderBase() {
		const tpl = document.createElement('template');
		tpl.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.11);
					--lux-border: rgba(127, 127, 127, 0.24);
					--lux-ww: #3b82f6;
					--lux-hot: #ef4444;
					--lux-warm: #f97316;
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
					gap: 10px;
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
				.badges { display: flex; gap: 6px; align-items: center; }

				.pill {
					padding: 2px 8px;
					border-radius: 999px;
					font-size: 0.72rem;
					font-weight: 600;
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
				}

				.pill.charging { color: var(--lux-ww); border-color: rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.16); }
				.pill.ok { color: var(--lux-ok); border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.14); }
				.pill.pv { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }
				.hidden { display: none !important; }

				.body {
					flex: 1;
					display: grid;
					grid-template-columns: 118px 1fr;
					gap: 12px;
					align-items: center;
					min-height: 0;
				}

				.tank-wrap {
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100%;
				}

				.tank-svg {
					width: 112px;
					height: 168px;
				}

				.side {
					display: flex;
					flex-direction: column;
					gap: 10px;
					align-items: stretch;
				}

				.metrics {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 8px 10px;
					display: flex;
					flex-direction: column;
					gap: 4px;
				}

				.row {
					display: flex;
					justify-content: space-between;
					font-size: 0.78rem;
					font-variant-numeric: tabular-nums;
				}

				.row .lbl { opacity: 0.72; }
				.row .val { font-weight: 600; }

				.zip-area {
					display: flex;
					align-items: center;
					gap: 10px;
				}

				.zip-btn {
					position: relative;
					width: 88px;
					height: 88px;
					flex-shrink: 0;
					border: none;
					background: transparent;
					padding: 0;
					cursor: pointer;
					color: inherit;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.zip-btn:active { transform: scale(0.96); }

				.zip-ring {
					position: absolute;
					inset: 0;
					width: 88px;
					height: 88px;
					transform: rotate(-90deg);
				}

				.ring-bg {
					fill: var(--lux-surface);
					stroke: var(--lux-border);
					stroke-width: 5;
				}

				.ring-fg {
					fill: none;
					stroke: var(--lux-ww);
					stroke-width: 5;
					stroke-linecap: round;
					stroke-dasharray: ${RING_CIRCUMFERENCE.toFixed(2)};
					stroke-dashoffset: ${RING_CIRCUMFERENCE.toFixed(2)};
					transition: stroke-dashoffset 0.45s linear, stroke 0.25s ease;
				}

				.zip-btn.active .ring-fg { stroke: var(--lux-ok); }

				.zip-center {
					position: relative;
					z-index: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					line-height: 1.15;
				}

				.zip-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; }
				.zip-sub { font-size: 0.78rem; font-weight: 600; opacity: 0.85; font-variant-numeric: tabular-nums; }

				.side-actions {
					display: flex;
					flex-direction: column;
					gap: 6px;
					flex: 1;
				}

				.force-btn {
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 8px;
					padding: 8px 10px;
					font-size: 0.76rem;
					font-weight: 600;
					cursor: pointer;
				}

				.force-btn:hover {
					border-color: var(--lux-ww);
					background: rgba(59, 130, 246, 0.16);
				}

				.hint {
					font-size: 0.72rem;
					opacity: 0.7;
					line-height: 1.25;
				}
					.temp-ctrl {
					display: flex;
					align-items: center;
					gap: 4px;
				}

				.step-btn {
					width: 28px;
					height: 28px;
					border-radius: 7px;
					border: 1px solid var(--lux-border);
					background: var(--lux-surface);
					color: inherit;
					font-weight: 700;
					cursor: pointer;
				}

				.temp-input {
					flex: 1;
					min-width: 0;
					height: 28px;
					box-sizing: border-box;
					text-align: center;
					border-radius: 7px;
					border: 1px solid var(--lux-border);
					background: var(--lux-surface);
					color: inherit;
					font-size: 0.78rem;
					font-weight: 700;
					font-variant-numeric: tabular-nums;
				}
			</style>

			<div class="card">
				<div class="header">
					<div class="title" data-ref="title">Warmwasser</div>
					<div class="badges">
						<span class="pill pv hidden" data-ref="pvBadge">PV</span>
						<span class="pill ok" data-ref="statusBadge">–</span>
					</div>
				</div>

				<div class="body">
					<!-- Grafischer Speicher-Zylinder -->
					<div class="tank-wrap">
						<svg class="tank-svg" viewBox="0 0 116 174">
							<defs>
								<linearGradient id="tankGrad" x1="0" y1="1" x2="0" y2="0">
									<stop offset="0%" stop-color="#2563eb" />
									<stop offset="55%" stop-color="#f97316" />
									<stop offset="100%" stop-color="#ef4444" />
								</linearGradient>
								<clipPath id="tankClip">
									<rect x="14" y="14" width="84" height="146" rx="22" />
								</clipPath>
							</defs>

							<!-- Speicherhülle Hintergrund -->
							<rect x="14" y="14" width="84" height="146" rx="22" fill="rgba(127,127,127,0.14)" />

							<!-- Dynamischer Füllstand -->
							<g clip-path="url(#tankClip)">
								<rect x="14" y="160" width="84" height="0" fill="url(#tankGrad)" opacity="0.82" data-ref="tankFill" />
							</g>

							<!-- Nachlade-Linie (Soll - Hysterese) -->
							<line x1="12" x2="100" y1="110" y2="110" stroke="#93c5fd" stroke-width="1.6" stroke-dasharray="4 3" data-ref="hystLine" />
							<!-- Soll-Linie -->
							<line x1="12" x2="100" y1="44" y2="44" stroke="#ffffff" stroke-width="1.8" opacity="0.85" data-ref="targetLine" />

							<!-- Speicher-Kontur -->
							<rect x="14" y="14" width="84" height="146" rx="22" fill="none" stroke="currentColor" stroke-opacity="0.32" stroke-width="2" />

							<!-- Große Ist-Temperatur im Speicher -->
							<text x="56" y="88" text-anchor="middle" font-size="20" font-weight="700" fill="#ffffff" style="text-shadow:0 1px 4px rgba(0,0,0,0.55)" data-ref="wwTemp">–</text>
							<text x="56" y="106" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff" opacity="0.9" data-ref="reservePct">–</text>
						</svg>
					</div>

					<!-- Rechte Seite: Kennwerte + ZIP-Countdown-Button -->
					<div class="side">
						<div class="metrics">
							<div class="row"><span class="lbl">Sollwert</span><span class="val" data-ref="wwTarget">–</span></div>
							<div class="row"><span class="lbl">Nachladen ab</span><span class="val" data-ref="rechargeAt">–</span></div>
							<div class="row"><span class="lbl">Reserve</span><span class="val" data-ref="reserveK">–</span></div>
						</div>

						<div class="zip-area">
							<button class="zip-btn" type="button" data-action="activate-zip" data-ref="zipBtn" title="Zirkulationspumpe starten">
								<svg class="zip-ring" viewBox="0 0 88 88">
									<circle class="ring-bg" cx="44" cy="44" r="38" />
									<circle class="ring-fg" cx="44" cy="44" r="38" data-ref="zipRing" />
								</svg>
								<div class="zip-center">
									<span class="zip-title" data-ref="zipTitle">ZIP</span>
									<span class="zip-sub" data-ref="zipTimer">Start</span>
								</div>
							</button>

							<div class="side-actions">
								<div class="temp-ctrl" data-ref="tempCtrl">
									<button class="step-btn" type="button" data-ref="btnTempMinus">−</button>
									<input class="temp-input" type="number" min="35" max="65" step="0.5" data-ref="tempInput" />
									<button class="step-btn" type="button" data-ref="btnTempPlus">+</button>
								</div>
								<button class="force-btn" type="button" data-ref="forceBtn">1× Aufheizen</button>
								<div class="hint" data-ref="hintText">Zirkulation bereit</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
	}

	_tempToY(temp) {
		// Skala 20 °C (unten y=154) bis 65 °C (oben y=20)
		const clamped = Math.max(20, Math.min(65, temp));
		const ratio = (clamped - 20) / (65 - 20);
		return 154 - ratio * 134;
	}
	_collectRefs() {
		super._collectRefs();
		const r = this._refs;
		if (!r.tempInput) {
			return;
		}

		const clamp = val => Math.max(35, Math.min(65, Math.round(val * 2) / 2));

		r.btnTempMinus.addEventListener('click', () => {
			const cur = this._pendingTarget ?? this._toNum(this._values.wwTarget) ?? 54;
			this._pendingTarget = clamp(cur - 1);
			this._updateView();
		});

		r.btnTempPlus.addEventListener('click', () => {
			const cur = this._pendingTarget ?? this._toNum(this._values.wwTarget) ?? 54;
			this._pendingTarget = clamp(cur + 1);
			this._updateView();
		});

		r.tempInput.addEventListener('change', () => {
			const val = this._toNum(r.tempInput.value);
			this._pendingTarget = val !== null ? clamp(val) : null;
			this._updateView();
		});

		r.forceBtn.addEventListener('click', () => {
			const liveTarget = this._toNum(this._values.wwTarget);
			if (
				this._pendingTarget !== null &&
				(liveTarget === null || Math.abs(this._pendingTarget - liveTarget) >= 0.1)
			) {
				this._writeState('Settings.03_HotWater.temperature_hot_water_target', this._pendingTarget);
				this._pendingTarget = null;
				this._updateView();
			} else {
				this._triggerAction('force-ww');
			}
		});
	}

	_updateView() {
		const r = this._refs;
		if (!r.title) {
			return;
		}

		const v = this._values;
		const wwIst = this._toNum(v.wwTemp);
		const wwTarget = this._toNum(v.wwTarget);
		const wwHyst = this._toNum(v.wwHyst);
		const rechargeTemp = wwTarget !== null && wwHyst !== null ? wwTarget - wwHyst : null;

		const isCharging = this._toNum(v.modeCode) === 1 && this._toBool(v.vd1);
		const zipActive = this._toBool(v.zipActive);
		const zipRem = this._toNum(v.zipRemaining) ?? 0;
		const zipBaseDur = this._toNum(v.zipDurationNormal) ?? 120;

		r.title.textContent = this._settings?.title || 'Warmwasser';
		r.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));
		r.forceBtn.classList.toggle('hidden', this._settings?.showForceButton === false);

		const showForce = this._settings?.showForceButton !== false;
		r.tempCtrl.classList.toggle('hidden', !showForce);

		const shownTarget = this._pendingTarget ?? wwTarget;
		const isTargetDirty =
			this._pendingTarget !== null && (wwTarget === null || Math.abs(this._pendingTarget - wwTarget) >= 0.1);
		if (document.activeElement !== r.tempInput && shownTarget !== null) {
			r.tempInput.value = shownTarget.toFixed(1);
		}
		r.forceBtn.textContent = isTargetDirty ? `Aufheizen (${shownTarget.toFixed(1)}°)` : '1× Aufheizen';
		if (isCharging) {
			r.statusBadge.textContent = 'Lädt aktiv';
			r.statusBadge.className = 'pill charging';
		} else {
			r.statusBadge.textContent = v.wwStatus || 'Bereit';
			r.statusBadge.className = 'pill ok';
		}

		r.wwTemp.textContent = wwIst === null ? '–' : `${wwIst.toFixed(1)}°`;
		r.wwTarget.textContent = this._fmtTemp(wwTarget);
		r.rechargeAt.textContent = this._fmtTemp(rechargeTemp);

		if (wwIst !== null && rechargeTemp !== null) {
			const diff = wwIst - rechargeTemp;
			r.reserveK.textContent = diff >= 0 ? `+${diff.toFixed(1)} K` : `${diff.toFixed(1)} K`;
		} else {
			r.reserveK.textContent = '–';
		}

		// Speicher-Füllstand & Linien im SVG
		if (wwIst !== null) {
			const yFill = this._tempToY(wwIst);
			r.tankFill.setAttribute('y', yFill.toFixed(1));
			r.tankFill.setAttribute('height', Math.max(0, 160 - yFill).toFixed(1));
		} else {
			r.tankFill.setAttribute('y', '160');
			r.tankFill.setAttribute('height', '0');
		}

		if (wwTarget !== null) {
			const yTarget = this._tempToY(wwTarget);
			r.targetLine.setAttribute('y1', yTarget.toFixed(1));
			r.targetLine.setAttribute('y2', yTarget.toFixed(1));
			r.targetLine.style.opacity = '0.85';
		} else {
			r.targetLine.style.opacity = '0';
		}

		if (rechargeTemp !== null) {
			const yHyst = this._tempToY(rechargeTemp);
			r.hystLine.setAttribute('y1', yHyst.toFixed(1));
			r.hystLine.setAttribute('y2', yHyst.toFixed(1));
			r.hystLine.style.opacity = '0.85';
		} else {
			r.hystLine.style.opacity = '0';
		}

		if (wwIst !== null && wwTarget !== null && rechargeTemp !== null && wwTarget > rechargeTemp) {
			const pct = Math.max(0, Math.min(100, ((wwIst - rechargeTemp) / (wwTarget - rechargeTemp)) * 100));
			r.reservePct.textContent = `${pct.toFixed(0)}% Reserve`;
		} else {
			r.reservePct.textContent = '';
		}

		// ZIP-Countdown-Ring
		if (zipActive && zipRem > 0) {
			if (zipRem > this._zipPeakSec) {
				this._zipPeakSec = zipRem;
			}
			const maxSec = Math.max(this._zipPeakSec, zipBaseDur, 1);
			const frac = Math.max(0, Math.min(1, zipRem / maxSec));
			r.zipRing.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - frac)).toFixed(2);
			r.zipBtn.classList.add('active');
			r.zipTitle.textContent = 'ZIP LÄUFT';
			r.zipTimer.textContent = this._fmtSec(zipRem);
			r.hintText.textContent = 'Warmes Wasser liegt gleich an';
		} else {
			this._zipPeakSec = 0;
			r.zipRing.style.strokeDashoffset = RING_CIRCUMFERENCE.toFixed(2);
			r.zipBtn.classList.remove('active');
			r.zipTitle.textContent = 'ZIP';
			r.zipTimer.textContent = 'Start';
			r.hintText.textContent = isCharging ? 'Speicher wird gerade aufgeheizt' : 'Zirkulation bereit';
		}
	}
}

if (!customElements.get('luxtronik-dhw-tank')) {
	customElements.define('luxtronik-dhw-tank', LuxtronikDhwTank);
}

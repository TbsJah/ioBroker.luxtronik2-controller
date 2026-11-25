/**
 * <luxtronik-status-card>
 * `@iobroker/web-components` ES-Modul für ioBroker Aura, VIS-2 und WebUI.
 */
const STATE_MAP = {
	modeCode: 'Information.08_OperatingState.WP_BZ_akt',
	duration: 'Information.08_OperatingState.heatpump_duration',
	heatingStatus: 'Information.08_OperatingState.opStateHeatingString',
	wwStatus: 'Information.08_OperatingState.opStateHotWaterString',
	supplyTemp: 'Information.01_Temperatures.temperature_supply',
	returnTemp: 'Information.01_Temperatures.temperature_return',
	returnTarget: 'Information.01_Temperatures.temperature_target_return',
	spread: 'Information.01_Temperatures.spreizung_vorlauf_ruecklauf',
	outsideTemp: 'Information.01_Temperatures.temperature_outside',
	wwTemp: 'Information.01_Temperatures.Wamwassertemperatur_Ist',
	wwTarget: 'Information.01_Temperatures.Wamwassertemperatur_Soll',
	compressor: 'Information.03_Outputs.VD1out',
	zipActive: 'Information.03_Outputs.Virtual_ZIP_Status',
	hupVoltage: 'Settings.04_HUP.heating_system_circ_pump_voltage_nominal',
	copToday: 'Information.16_Efficiency.Total.cop_total_today',
	jazYear: 'Information.16_Efficiency.Total.cop_total_year',
	pvBoost: 'Information.17_PV_Surplus.pv_boost_active',
};

const ACTION_MAP = {
	'force-ww': 'Actions.Zwangswarmwasser',
	'force-heating': 'Actions.Zwangsheizen',
	'activate-zip': 'Actions.Activate_Zip',
};

const MODE_META = {
	0: { text: 'Heizbetrieb', cls: 'mode-heating' },
	1: { text: 'Warmwasser', cls: 'mode-ww' },
	2: { text: 'Schwimmbad / PV', cls: 'mode-ww' },
	3: { text: 'EVU-Sperre', cls: 'mode-idle' },
	4: { text: 'Abtauen', cls: 'mode-defrost' },
	5: { text: 'Kein Bedarf', cls: 'mode-idle' },
	6: { text: '2. Erzeuger', cls: 'mode-heating' },
	7: { text: 'Kühlbetrieb', cls: 'mode-defrost' },
};

class LuxtronikStatusCard extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._socket = null;
		this._settings = {};
		this._theme = '';
		this._editMode = false;
		this._values = {};
		this._subscriptions = [];
		this._rendered = false;
		this._connected = false;
	}

	set socket(value) {
		if (this._socket === value) {
			return;
		}
		this._unsubscribeAll();
		this._socket = value;
		if (this._connected) {
			this._resubscribe();
		}
	}

	get socket() {
		return this._socket;
	}

	set settings(value) {
		const prevInstance = this._getInstancePrefix();
		this._settings = value && typeof value === 'object' ? value : {};
		const nextInstance = this._getInstancePrefix();

		if (this._connected && prevInstance !== nextInstance) {
			this._resubscribe();
		}
		if (this._rendered) {
			this._updateView();
		}
	}

	get settings() {
		return this._settings;
	}

	set theme(value) {
		this._theme = value || '';
		if (this._theme === 'light' || this._theme === 'dark') {
			this.setAttribute('theme', this._theme);
		} else {
			this.removeAttribute('theme');
		}
	}

	get theme() {
		return this._theme;
	}

	set editMode(value) {
		this._editMode = Boolean(value);
	}

	get editMode() {
		return this._editMode;
	}

	connectedCallback() {
		this._connected = true;
		if (!this._rendered) {
			this._renderBase();
			this._rendered = true;
		}
		this._resubscribe();
		this._updateView();
	}

	disconnectedCallback() {
		this._connected = false;
		this._unsubscribeAll();
	}

	_getInstancePrefix() {
		const raw = this._settings?.instance;
		if (!raw || typeof raw !== 'string') {
			return '';
		}
		return raw.trim().replace(/^system\.adapter\./, '');
	}

	_unsubscribeAll() {
		if (this._socket && typeof this._socket.unsubscribeState === 'function') {
			for (const { oid, handler } of this._subscriptions) {
				try {
					this._socket.unsubscribeState(oid, handler);
				} catch {
					/* ignore */
				}
			}
		}
		this._subscriptions = [];
	}

	_resubscribe() {
		this._unsubscribeAll();
		this._values = {};

		const prefix = this._getInstancePrefix();
		if (!this._socket || !prefix) {
			if (this._rendered) {
				this._updateView();
			}
			return;
		}

		for (const [key, relPath] of Object.entries(STATE_MAP)) {
			const oid = `${prefix}.${relPath}`;
			const handler = (_id, state) => {
				this._values[key] = state ? state.val : null;
				if (this._rendered) {
					this._updateView();
				}
			};
			this._subscriptions.push({ oid, handler });

			if (typeof this._socket.subscribeState === 'function') {
				try {
					this._socket.subscribeState(oid, handler);
				} catch {
					/* ignore */
				}
			}
			if (typeof this._socket.getState === 'function') {
				Promise.resolve(this._socket.getState(oid))
					.then(state => {
						if (state) {
							this._values[key] = state.val;
							if (this._rendered) {
								this._updateView();
							}
						}
					})
					.catch(() => {});
			}
		}
	}

	_triggerAction(actionKey) {
		if (this._editMode) {
			return;
		}
		const prefix = this._getInstancePrefix();
		const relPath = ACTION_MAP[actionKey];
		if (this._socket && prefix && relPath && typeof this._socket.setState === 'function') {
			Promise.resolve(this._socket.setState(`${prefix}.${relPath}`, true, false)).catch(() => {});
		}
	}

	_toNum(val) {
		if (val === null || val === undefined || val === '') {
			return null;
		}
		const n = parseFloat(String(val).replace(',', '.'));
		return isNaN(n) ? null : n;
	}

	_toBool(val) {
		if (typeof val === 'boolean') {
			return val;
		}
		if (typeof val === 'number') {
			return val === 1;
		}
		const s = String(val || '')
			.trim()
			.toLowerCase();
		return s === 'true' || s === '1' || s === 'ein' || s === 'on';
	}

	_fmtTemp(val, digits = 1) {
		const n = this._toNum(val);
		return n === null ? '–' : `${n.toFixed(digits)} °C`;
	}

	_fmtNum(val, unit = '', digits = 1) {
		const n = this._toNum(val);
		if (n === null) {
			return '–';
		}
		return unit ? `${n.toFixed(digits)} ${unit}` : n.toFixed(digits);
	}

	_renderBase() {
		const template = document.createElement('template');
		template.innerHTML = `
			<style>
				:host {
					--lux-surface: rgba(127, 127, 127, 0.12);
					--lux-border: rgba(127, 127, 127, 0.22);
					--lux-muted: rgba(127, 127, 127, 0.85);
					--lux-heating: #f97316;
					--lux-ww: #3b82f6;
					--lux-defrost: #06b6d4;
					--lux-ok: #22c55e;
					--lux-pv: #eab308;
					display: block;
					width: 100%;
					height: 100%;
					box-sizing: border-box;
					font-family: inherit;
					color: inherit;
					container-type: inline-size;
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

				.title { font-size: 1rem; font-weight: 600; }
				.subtitle { font-size: 0.78rem; opacity: 0.72; }

				.badges { display: flex; gap: 6px; flex-wrap: wrap; }

				.pill {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					padding: 3px 9px;
					border-radius: 999px;
					font-size: 0.76rem;
					font-weight: 600;
					border: 1px solid var(--lux-border);
					background: var(--lux-surface);
				}

				.pill .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
				.pill.mode-heating { color: var(--lux-heating); border-color: rgba(249, 115, 22, 0.4); background: rgba(249, 115, 22, 0.14); }
				.pill.mode-ww { color: var(--lux-ww); border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.14); }
				.pill.mode-defrost { color: var(--lux-defrost); border-color: rgba(6, 182, 212, 0.4); background: rgba(6, 182, 212, 0.14); }
				.pill.pv-active { color: var(--lux-pv); border-color: rgba(234, 179, 8, 0.45); background: rgba(234, 179, 8, 0.14); }

				.hidden { display: none !important; }

				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
					gap: 8px;
					flex: 1;
				}

				.section {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-radius: 10px;
					padding: 10px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.section-head {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 0.72rem;
					font-weight: 600;
					opacity: 0.75;
					text-transform: uppercase;
				}

				.status-tag {
					text-transform: none;
					padding: 1px 6px;
					border-radius: 6px;
					background: rgba(34, 197, 94, 0.16);
					color: var(--lux-ok);
					opacity: 1;
				}

				.primary-metric {
					display: flex;
					align-items: baseline;
					justify-content: space-between;
					gap: 6px;
				}

				.big-val { font-size: 1.3rem; font-weight: 700; font-variant-numeric: tabular-nums; }
				.target-val { font-size: 0.78rem; opacity: 0.72; font-variant-numeric: tabular-nums; }

				.rows {
					display: flex;
					flex-direction: column;
					gap: 3px;
					border-top: 1px solid var(--lux-border);
					padding-top: 6px;
					margin-top: auto;
				}

				.row { display: flex; justify-content: space-between; font-size: 0.78rem; font-variant-numeric: tabular-nums; }
				.row .label { opacity: 0.72; }
				.row .val { font-weight: 500; }

				.bar-track { height: 5px; border-radius: 999px; background: var(--lux-border); overflow: hidden; }
				.bar-fill { height: 100%; width: 0%; background: var(--lux-ww); transition: width 0.3s ease; }

				.actions { display: flex; gap: 6px; flex-wrap: wrap; }
				.btn {
					flex: 1 1 95px;
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 8px;
					padding: 6px 8px;
					font-size: 0.76rem;
					font-weight: 600;
					cursor: pointer;
				}
				.btn:hover { border-color: var(--lux-ww); background: rgba(59, 130, 246, 0.15); }
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title" data-ref="title">Wärmepumpe</div>
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

				<div class="grid">
					<div class="section">
						<div class="section-head"><span>Heizkreis</span><span class="status-tag" data-ref="heatingStatus">–</span></div>
						<div class="primary-metric">
							<span class="big-val" data-ref="returnTemp">–</span>
							<span class="target-val">Soll <span data-ref="returnTarget">–</span></span>
						</div>
						<div class="rows">
							<div class="row"><span class="label">Vorlauf</span><span class="val" data-ref="supplyTemp">–</span></div>
							<div class="row"><span class="label">Spreizung</span><span class="val" data-ref="spread">–</span></div>
							<div class="row"><span class="label">HUP / VD1</span><span class="val" data-ref="hupVd1">–</span></div>
						</div>
					</div>

					<div class="section">
						<div class="section-head"><span>Warmwasser</span><span class="status-tag" data-ref="wwStatus">–</span></div>
						<div class="primary-metric">
							<span class="big-val" data-ref="wwTemp">–</span>
							<span class="target-val">Soll <span data-ref="wwTarget">–</span></span>
						</div>
						<div class="bar-track"><div class="bar-fill" data-ref="wwBar"></div></div>
						<div class="rows">
							<div class="row"><span class="label">Zirkulation</span><span class="val" data-ref="zipState">Aus</span></div>
						</div>
					</div>

					<div class="section">
						<div class="section-head"><span>Umgebung &amp; COP</span></div>
						<div class="primary-metric">
							<span class="big-val" data-ref="outsideTemp">–</span>
							<span class="target-val">Außen</span>
						</div>
						<div class="rows">
							<div class="row"><span class="label">COP Heute</span><span class="val" data-ref="copToday">–</span></div>
							<div class="row"><span class="label">JAZ Jahr</span><span class="val" data-ref="jazYear">–</span></div>
						</div>
					</div>
				</div>

				<div class="actions hidden" data-ref="actionsBar">
					<button class="btn" type="button" data-action="force-ww">Zwangswarmwasser</button>
					<button class="btn" type="button" data-action="force-heating">Zwangsheizen</button>
					<button class="btn" type="button" data-action="activate-zip">ZIP starten</button>
				</div>
			</div>
		`;

		this.shadowRoot.appendChild(template.content.cloneNode(true));
		this._refs = {};
		this.shadowRoot.querySelectorAll('[data-ref]').forEach(el => {
			this._refs[el.getAttribute('data-ref')] = el;
		});
		this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
			btn.addEventListener('click', () => this._triggerAction(btn.getAttribute('data-action')));
		});
	}

	_updateView() {
		if (!this._refs) {
			return;
		}
		const prefix = this._getInstancePrefix();
		const v = this._values;
		const modeCode = this._toNum(v.modeCode);
		const modeInfo =
			modeCode !== null && MODE_META[modeCode] ? MODE_META[modeCode] : { text: '–', cls: 'mode-idle' };

		this._refs.title.textContent = this._settings?.title || 'Wärmepumpe';
		this._refs.subtitle.textContent = !prefix
			? 'Bitte Instanz in den Einstellungen wählen'
			: v.duration
				? `Seit ${v.duration}`
				: prefix;

		this._refs.modeText.textContent = modeInfo.text;
		this._refs.modePill.className = `pill ${modeInfo.cls}`;
		this._refs.pvBadge.classList.toggle('hidden', !this._toBool(v.pvBoost));

		const supplyNum = this._toNum(v.supplyTemp);
		const returnNum = this._toNum(v.returnTemp);
		const spreadNum =
			this._toNum(v.spread) ?? (supplyNum !== null && returnNum !== null ? supplyNum - returnNum : null);

		this._refs.heatingStatus.textContent = v.heatingStatus || '–';
		this._refs.returnTemp.textContent = this._fmtTemp(returnNum);
		this._refs.returnTarget.textContent = this._fmtTemp(v.returnTarget);
		this._refs.supplyTemp.textContent = this._fmtTemp(supplyNum);
		this._refs.spread.textContent = spreadNum === null ? '–' : `${spreadNum.toFixed(1)} K`;
		this._refs.hupVd1.textContent = `${this._fmtNum(v.hupVoltage, 'V', 1)} / ${this._toBool(v.compressor) ? 'Ein' : 'Aus'}`;

		const wwNum = this._toNum(v.wwTemp);
		const wwTargetNum = this._toNum(v.wwTarget);
		this._refs.wwStatus.textContent = v.wwStatus || '–';
		this._refs.wwTemp.textContent = this._fmtTemp(wwNum);
		this._refs.wwTarget.textContent = this._fmtTemp(wwTargetNum);
		this._refs.zipState.textContent = this._toBool(v.zipActive) ? 'Aktiv' : 'Aus';

		if (wwNum !== null && wwTargetNum !== null && wwTargetNum > 20) {
			const pct = Math.max(0, Math.min(100, ((wwNum - 20) / (wwTargetNum - 20)) * 100));
			this._refs.wwBar.style.width = `${pct.toFixed(0)}%`;
		} else {
			this._refs.wwBar.style.width = '0%';
		}

		this._refs.outsideTemp.textContent = this._fmtTemp(v.outsideTemp);
		this._refs.copToday.textContent = this._fmtNum(v.copToday, '', 2);
		this._refs.jazYear.textContent = this._fmtNum(v.jazYear, '', 2);
		this._refs.actionsBar.classList.toggle('hidden', this._settings?.showActions === false);
	}
}

if (!customElements.get('luxtronik-status-card')) {
	customElements.define('luxtronik-status-card', LuxtronikStatusCard);
}

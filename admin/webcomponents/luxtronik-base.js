/**
 * Gemeinsame Basisklasse für alle Luxtronik `@iobroker/web-components`.
 * Kapselt Socket-Handling, State-Abos, Edit-Mode-Schutz und Formatierungs-Helfer.
 */
export class LuxtronikBaseCard extends HTMLElement {
	static get stateMap() {
		return {};
	}

	static get actionMap() {
		return {};
	}

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
		this._refs = {};
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
			this._collectRefs();
			this._rendered = true;
		}
		this._resubscribe();
		this._updateView();
	}

	disconnectedCallback() {
		this._connected = false;
		this._unsubscribeAll();
	}

	_collectRefs() {
		this._refs = {};
		this.shadowRoot.querySelectorAll('[data-ref]').forEach(el => {
			this._refs[el.getAttribute('data-ref')] = el;
		});
		this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
			btn.addEventListener('click', () => this._triggerAction(btn.getAttribute('data-action')));
		});
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

		const map = this.constructor.stateMap || {};
		for (const [key, relPath] of Object.entries(map)) {
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

	_writeState(relPath, val) {
		if (this._editMode) {
			return;
		}
		const prefix = this._getInstancePrefix();
		if (this._socket && prefix && relPath && typeof this._socket.setState === 'function') {
			Promise.resolve(this._socket.setState(`${prefix}.${relPath}`, val, false)).catch(() => {});
		}
	}

	_triggerAction(actionKey) {
		const map = this.constructor.actionMap || {};
		if (map[actionKey]) {
			this._writeState(map[actionKey], true);
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

	_fmtSec(sec) {
		const n = this._toNum(sec);
		if (n === null || n <= 0) {
			return '0:00';
		}
		const total = Math.round(n);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	_renderBase() {
		// In Unterklassen überschreiben
	}

	_updateView() {
		// In Unterklassen überschreiben
	}
}

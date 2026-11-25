/**
 * <luxtronik-diagnostics-feed>
 * Event-Timeline für Fehlerspeicher, Abschaltungen und Firmware-Update-Benachrichtigungen
 * für `@iobroker/web-components`.
 */
import { LuxtronikBaseCard } from './luxtronik-base.js';

class LuxtronikDiagnosticsFeed extends LuxtronikBaseCard {
	static get stateMap() {
		return {
			errors: 'Information.06_ErrorLog.Fehlerspeicher',
			outages: 'Information.07_Outages.Abschaltungen',
			hpType: 'Information.12_SystemInfo.heatpump_type',
			firmware: 'Information.12_SystemInfo.firmware',
			fwAvailable: 'Information.12_SystemInfo.firmware_available',
			fwUpdate: 'Information.12_SystemInfo.firmware_update_available',
			fwChangelog: 'Information.12_SystemInfo.firmware_changelog',
			connected: 'info.connection',
			lastUpdate: 'info.lastUpdate',
		};
	}

	static get actionMap() {
		return {
			'check-fw': 'Information.12_SystemInfo.check_firmware',
			'reset-error': 'Actions.error_reset',
		};
	}

	constructor() {
		super();
		this._activeTab = 'errors';
	}

	_parseList(raw) {
		if (!raw) {
			return [];
		}
		let parsed = raw;
		if (typeof raw === 'string') {
			try {
				parsed = JSON.parse(raw);
			} catch {
				return raw.trim() ? [{ time: '', code: '', text: raw.trim() }] : [];
			}
		}
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed
			.map(item => {
				if (typeof item === 'string') {
					return { time: '', code: '', text: item };
				}
				if (!item || typeof item !== 'object') {
					return null;
				}
				const time =
					item.date ??
					item.time ??
					item.timestamp ??
					item.datum ??
					item.zeit ??
					item.Zeit ??
					item.Datum ??
					'';
				const code = item.code ?? item.id ?? item.Code ?? item.nr ?? '';
				const text =
					item.message ??
					item.text ??
					item.reason ??
					item.description ??
					item.error ??
					item.meldung ??
					item.grund ??
					item.Grund ??
					item.Fehler ??
					'';

				const textStr = String(text || '').trim();
				const codeStr = code !== '' && code !== null && code !== undefined ? String(code) : '';
				const timeStr =
					typeof time === 'number' && time > 1000000000
						? new Date(time > 1e12 ? time : time * 1000).toLocaleString('de-DE')
						: String(time || '').trim();

				if (!textStr && !codeStr && !timeStr) {
					return null;
				}
				return { time: timeStr, code: codeStr, text: textStr || 'Eintrag ohne Text' };
			})
			.filter(Boolean);
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
					gap: 8px;
					padding: 12px;
					overflow: hidden;
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					gap: 8px;
					flex-wrap: wrap;
				}

				.title-row { display: flex; align-items: center; gap: 7px; }
				.conn-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--lux-bad); flex-shrink: 0; }
				.conn-dot.online { background: var(--lux-ok); }
				.title { font-size: 0.98rem; font-weight: 600; }
				.subtitle { font-size: 0.73rem; opacity: 0.72; margin-top: 2px; }

				.head-actions { display: flex; gap: 6px; }

				.btn {
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 7px;
					padding: 4px 8px;
					font-size: 0.72rem;
					font-weight: 600;
					cursor: pointer;
				}

				.btn:hover { border-color: var(--lux-info); background: rgba(59, 130, 246, 0.15); }
				.btn.danger:hover { border-color: var(--lux-bad); background: rgba(239, 68, 68, 0.15); }
				.hidden { display: none !important; }

				.fw-banner {
					background: rgba(59, 130, 246, 0.14);
					border: 1px solid rgba(59, 130, 246, 0.42);
					border-radius: 9px;
					padding: 7px 10px;
					font-size: 0.76rem;
				}

				.fw-banner summary {
					cursor: pointer;
					font-weight: 600;
					color: #60a5fa;
				}

				.fw-changelog {
					margin-top: 6px;
					white-space: pre-wrap;
					font-size: 0.72rem;
					opacity: 0.88;
					max-height: 70px;
					overflow: auto;
				}

				.tabs {
					display: flex;
					gap: 6px;
				}

				.tab {
					flex: 1;
					background: var(--lux-surface);
					color: inherit;
					border: 1px solid var(--lux-border);
					border-radius: 8px;
					padding: 5px 8px;
					font-size: 0.76rem;
					font-weight: 600;
					cursor: pointer;
					opacity: 0.75;
				}

				.tab.active {
					opacity: 1;
					border-color: var(--lux-info);
					background: rgba(59, 130, 246, 0.15);
				}

				.feed {
					flex: 1;
					min-height: 0;
					overflow: auto;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.item {
					background: var(--lux-surface);
					border: 1px solid var(--lux-border);
					border-left-width: 3px;
					border-radius: 8px;
					padding: 7px 9px;
					display: flex;
					flex-direction: column;
					gap: 2px;
				}

				.item.type-error { border-left-color: var(--lux-bad); }
				.item.type-outage { border-left-color: var(--lux-warn); }

				.item-top {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
					font-size: 0.71rem;
					opacity: 0.72;
					font-variant-numeric: tabular-nums;
				}

				.item-code {
					font-weight: 700;
					padding: 1px 5px;
					border-radius: 4px;
					background: rgba(127, 127, 127, 0.22);
				}

				.item-text {
					font-size: 0.8rem;
					font-weight: 500;
				}

				.empty {
					flex: 1;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.8rem;
					opacity: 0.65;
					background: var(--lux-surface);
					border: 1px dashed var(--lux-border);
					border-radius: 9px;
					padding: 16px;
				}

				.footer {
					display: flex;
					justify-content: space-between;
					font-size: 0.71rem;
					opacity: 0.68;
					padding-top: 4px;
					border-top: 1px solid var(--lux-border);
					font-variant-numeric: tabular-nums;
				}
			</style>

			<div class="card">
				<div class="header">
					<div>
						<div class="title-row">
							<span class="conn-dot" data-ref="connDot"></span>
							<span class="title" data-ref="title">Diagnose & Meldungen</span>
						</div>
						<div class="subtitle" data-ref="sysInfo">–</div>
					</div>
					<div class="head-actions">
						<button class="btn" type="button" data-action="check-fw" title="Nach Firmware-Update suchen">FW prüfen</button>
						<button class="btn danger hidden" type="button" data-action="reset-error" data-ref="resetBtn">Fehler-Reset</button>
					</div>
				</div>

				<details class="fw-banner hidden" data-ref="fwBanner">
					<summary data-ref="fwSummary">Firmware-Update verfügbar</summary>
					<div class="fw-changelog" data-ref="fwChangelog"></div>
				</details>

				<div class="tabs">
					<button class="tab active" type="button" data-ref="tabErrors">Fehlerspeicher (0)</button>
					<button class="tab" type="button" data-ref="tabOutages">Abschaltungen (0)</button>
				</div>

				<div class="feed" data-ref="feed"></div>

				<div class="footer">
					<span data-ref="connText">Getrennt</span>
					<span data-ref="lastUpdateText">Letzter Abruf: –</span>
				</div>
			</div>
		`;
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
	}

	_collectRefs() {
		super._collectRefs();
		const r = this._refs;
		if (!r.tabErrors) {
			return;
		}
		r.tabErrors.addEventListener('click', () => {
			this._activeTab = 'errors';
			this._updateView();
		});
		r.tabOutages.addEventListener('click', () => {
			this._activeTab = 'outages';
			this._updateView();
		});
	}

	_updateView() {
		const r = this._refs;
		if (!r.title) {
			return;
		}

		const v = this._values;
		const online = this._toBool(v.connected);
		const errorList = this._parseList(v.errors);
		const outageList = this._parseList(v.outages);

		r.title.textContent = this._settings?.title || 'Diagnose & Meldungen';
		r.connDot.classList.toggle('online', online);
		r.connText.textContent = online ? 'Verbunden' : 'Keine Verbindung';

		const typeStr = v.hpType ? String(v.hpType) : 'Wärmepumpe';
		const fwStr = v.firmware ? `FW ${v.firmware}` : 'FW –';
		r.sysInfo.textContent = `${typeStr} · ${fwStr}`;
		r.resetBtn.classList.toggle('hidden', this._settings?.showResetButton !== true);

		// Firmware-Update-Banner
		const hasUpdate = this._toBool(v.fwUpdate);
		r.fwBanner.classList.toggle('hidden', !hasUpdate);
		if (hasUpdate) {
			r.fwSummary.textContent = `Neues Firmware-Update verfügbar: ${v.fwAvailable || 'neu'}`;
			r.fwChangelog.textContent = v.fwChangelog ? String(v.fwChangelog) : 'Kein Changelog hinterlegt.';
		}

		// Tabs aktualisieren
		r.tabErrors.textContent = `Fehlerspeicher (${errorList.length})`;
		r.tabOutages.textContent = `Abschaltungen (${outageList.length})`;
		r.tabErrors.classList.toggle('active', this._activeTab === 'errors');
		r.tabOutages.classList.toggle('active', this._activeTab === 'outages');

		// Feed-Einträge sicher über DOM-Nodes aufbauen
		const feed = r.feed;
		while (feed.firstChild) {
			feed.removeChild(feed.firstChild);
		}

		const activeList = this._activeTab === 'errors' ? errorList : outageList;
		const itemCls = this._activeTab === 'errors' ? 'type-error' : 'type-outage';

		if (activeList.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'empty';
			empty.textContent =
				this._activeTab === 'errors' ? 'Keine Fehler im Speicher' : 'Keine Abschaltungen gespeichert';
			feed.appendChild(empty);
		} else {
			for (const entry of activeList) {
				const row = document.createElement('div');
				row.className = `item ${itemCls}`;

				const top = document.createElement('div');
				top.className = 'item-top';

				const timeEl = document.createElement('span');
				timeEl.textContent = entry.time || '–';
				top.appendChild(timeEl);

				if (entry.code) {
					const codeEl = document.createElement('span');
					codeEl.className = 'item-code';
					codeEl.textContent = `#${entry.code}`;
					top.appendChild(codeEl);
				}

				const textEl = document.createElement('div');
				textEl.className = 'item-text';
				textEl.textContent = entry.text;

				row.appendChild(top);
				row.appendChild(textEl);
				feed.appendChild(row);
			}
		}

		// Letzter Abruf
		const ts = this._toNum(v.lastUpdate);
		r.lastUpdateText.textContent =
			ts && ts > 0 ? `Abruf: ${new Date(ts).toLocaleTimeString('de-DE')}` : 'Letzter Abruf: –';
	}
}

if (!customElements.get('luxtronik-diagnostics-feed')) {
	customElements.define('luxtronik-diagnostics-feed', LuxtronikDiagnosticsFeed);
}

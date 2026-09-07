# Older changes

### 0.1.5 (2026-07-09)

- Update Zip

### 0.1.4 (2026-07-09)

- Custom states

### 0.1.3 (2026-07-09)

- Zip process outsourced

### 0.1.2 (2026-07-09)

- NPM release

### 0.1.1 (2026-07-09)

- Readme

### 0.1.0 (2026-07-09)

- initial release
## 0.6.4 (2026-07-23)

- Refactoring

## 0.6.3 (2026-07-23)

**Features & Enhancements**

- **External Actor Support for ZIP (100% Flash Safe):** Added the ultimate hardware protection feature. Users can now configure a list of external actors (e.g., Shelly or Zigbee relays) via their object IDs in the Admin UI. When motion is detected, the adapter switches these relays directly, completely bypassing the heat pump and reducing Luxtronik EEPROM write cycles to absolute zero.
- **External Actor Schedule Compliance:** External ZIP actors now dynamically respect the Luxtronik ZIP time tables (Week, 5+2, or Individual days). Motion triggers will be cleanly ignored if they occur outside the permitted time windows, unless the user explicitly checks the "Disable Hardware ZIP Timers" option in the configuration.
- **Hot Water Sync for External Actors:** The adapter now automatically activates external circulation pump relays when the heat pump begins a hot water generation cycle, maximizing comfort at the tap with zero impact on flash memory wear.
- **Global EEPROM Flash Protection (Read-Before-Write):** Implemented a global interceptor for all hardware write commands (`writePumpSafe`). The adapter now caches the current heat pump parameters in real-time and strictly blocks any duplicate or redundant write requests before they are sent over the network.
- **Automated Hardware-Safe ZIP Defaults:** The adapter can now automatically enforce hardware-safe circulation pump schedules upon startup. Accounts for Luxtronik firmware behavior by intelligently setting the first start block to `00:01:00` (60 seconds) to prevent invalid zero-run rejections, while keeping ON-time at `0 min` and OFF-time at `60 min`.
- **Admin UI - Flash Wear Statistics & Guidance:** Expanded the ZIP configuration page with detailed educational information. Added hard data explaining that internal ZIP control causes between 4 and 14 physical write operations per activation, highly recommending the new external actor setup.
- **Write Cycle Monitoring:** Introduced two new virtual data points under System Info (`write_cycles_today` and `write_cycles_total`) to transparently track physical write operations sent to the heat pump. The daily counter automatically resets every night at midnight.
- **Cooling Extension & Intelligent Status:** Comprehensive integration of new cooling data points (e.g., `cooling_status`, `cooling_configured`, `opStateCooling`). Added the dynamically calculated `opStateCoolingString`.
- **Admin UI - Notification Testing:** Added a dedicated "Send Test Message" button to the configuration interface to easily verify Telegram and ioBroker Notification Center setups directly from the UI.
- **Hardened ZIP Macro Execution:** Reaffirmed and secured the ZIP demand-driven macro to exclusively use the deaeration program (Entlüftungsprogramm).
- **New Flow Rate Datapoints:** Added flow rate tracking for the heat source (`flow_rate_heat_source`, ID 173) and cooling (`flow_rate_cooling`, ID 254) to the state mapping.
- **Extended Admin UI:** All newly added cooling data points and the heat source flow rate can now be individually enabled or disabled via new checkboxes in the adapter configuration (`jsonConfig.json`).
- **New Hardware Supported:** Officially added the MSW2-9S heat pump to the model recognition (`HP_TYPES`).

**Bugfixes**

- **Motion Sensor Cooldown Logic:** Fixed an issue where the 10-minute anti-cycling cooldown for motion sensors was perpetually stuck when using external relays. The logic now correctly monitors the virtual `Activate_Zip` state's timestamp instead of the bypassed internal `ZIPout` state.
- **Virtual State Reset:** Fixed a bug where the `Activate_Zip` button/state remained `true` after an external relay timer expired, which broke subsequent cooldown calculations. It now cleanly resets to `false` when the run cycle finishes.
- **External Actor State Detection:** Fixed a logic flaw where the adapter incorrectly checked the internal heat pump state (`ZIPout`) instead of the external relay state to determine if the circulation pump was already running. It now dynamically checks `getForeignStateAsync` for configured actors, cleanly preventing redundant switch commands and allowing silent timer extensions if motion is re-detected.
- **Timer Formatting in Objects:** Fixed a bug where timer schedules (Heating, Hot Water, Circulation) were incorrectly displayed as raw seconds (e.g., `60` or `0`). Applied the internal duration formatter (`isDurationFormat: true`) globally so all time tables natively and persistently display as `HH:MM:SS` (e.g., `00:01:00`) in the ioBroker object tree.
- **Admin UI i18n Compliance:** Fixed missing language definitions (E5611) in the `jsonConfig.json` dropdown menus to strictly comply with the latest ioBroker repository checks.
- **TypeScript/Linter Strictness:** Fixed strictly typed linter errors (e.g., `@typescript-eslint/no-floating-promises`, `no-redundant-type-constituents`, and template literal typings) by correctly handling asynchronous database calls, replacing `any` with `unknown`, and strictly casting types.
- **Missing Imports:** Resolved compilation errors regarding missing helper functions (e.g., `getDpPath`) during module refactoring.
- **Cooling Operating Hours:** Fixed the `hours_cooling` datapoint. The value is now correctly read from real-time telemetry data (`raw_value`), resolving an issue where the timestamp "Jan 1, 1970" was incorrectly shown.
- **Config Cleanup:** Fixed an incorrect identifier in the admin UI (changed `sync_Gerätezeit` to `sync_deviceTime`) and removed unused/dead checkboxes.

**Technical Changes (Under the Hood)**

- **Separation of Concerns (zipManager):** Completely refactored the motion sensor and circulation pump logic. Extracted the event handling and startup initialization out of `main.ts` into `zipManager.ts`. It now also dynamically handles iterations over arrays of external actors.
- **Network Queue Isolation:** Extracted the core transmission queue (`queueWrite`, `processQueue`) from the main adapter class into `rawFunctions.ts`, achieving 100% isolation of TCP/WebSocket network logic from ioBroker state management.
- **Comprehensive Code Refactoring (DRY):** Created dedicated `convert.ts` and `utils.ts` modules to centralize time string formatting (`timeStringToSeconds`, `formatTimerSecondsToTime`) and generic helper functions (`getNumber`, `delay`).
- **Global Time Refactoring:** Centralized the duration and time calculation for status texts in the `updateStatusStrings` function.
- **i18n Support for State Names:** Updated the internal state definition (`name: string | { en: string; de?: string }`) to fully support translation objects, allowing natively translated datapoint names in the ioBroker object tree.

## 0.6.2 (2026-07-17)

**Added**

- Bilingual support (i18n): Full support for English and German (adapter settings, state names, dropdown menus, and dynamic status texts).
- Language selection: Added a new dropdown menu in the adapter settings to freely choose the preferred output language for the ioBroker object tree.
- Firmware 3.x compatibility: Implemented an intelligent fallback system that dynamically calculates the status texts (heatpump_state_string) and runtime (heatpump_duration) from the main operating state. This is required because modern Luxtronik controllers no longer transmit the old LCD text lines.

**Fixed**

- Incorrect heating state (Frost protection): Fixed an issue where a switched-off heating system was incorrectly displayed as "Frost protection". The code now evaluates the correct index for the heating operating state (opStateHeating / 125) instead of incorrectly calculating it via the parameter.
- Timer display: Restored the clean HH:MM:SS formatting in the ioBroker UI without the annoying "s" (seconds) by introducing an internal isDurationFormat flag.
- Timer glitch fixed: When the compressor is idle, 00:00:01 (1 second) was often incorrectly displayed. This is now cleanly filtered to 00:00:00.
- ioBroker Repo-Checker warnings: Added the missing write: true property to the timer table selection states (role: "level") to fix the E1011 error.

**Technical**

- Fixed ESLint warnings (dot-notation) for object properties.

## 0.6.1 (2026-07-17)

- Implemented fallback mechanism: Index 80 lc is used if 117-120 are empty.

## 0.6.0 (2026-07-16)

- Added option to select the display language for state values (English/German)

## 0.5.3 (2026-07-16)

- Resolve issues which are reported by repository checker
- Updates Timers Format
- Time_WPein_akt 00:00:01 --> 00:00:00 if VD1 is false
- Fallback if Firmware > 3 for extStateStr & StateStr

## 0.5.2 (2026-07-15)

- Resolve issues which are reported by repository checker

## 0.5.1 (2026-07-14)

- Fix issue notify last error after instance restart

## 0.5.0 (2026-07-14)

- Code-Refactoring

## 0.4.0 (2026-07-14)

- prepare add latest repo

## 0.3.8 (2026-07-14)

- Fix issues reported by RepositoryChecker

## 0.3.7 (2026-07-14)

- E5507 missing size attributes
- E6001 No README.md found

## 0.3.6 (2026-07-14)

- Update StateMapping Items
- Fixed Websocket write error
- Fix the issues reported by RepositoryChecker

## 0.3.5 (2026-07-14)

- Config Checkbox issue resolved Temperature
- Fix the issues reported by RepositoryChecker

## 0.3.4 (2026-07-14)

- Update StateMapping Items

## 0.3.3 (2026-07-14)

- Package update

## 0.3.2 (2026-07-14)

- Fixed Websocket write error
- Extend stateMappings

## 0.3.1 (2026-07-14)

- Fixed WebSocket retrieval error

## 0.3.0 (2026-07-14)

- Websocket port added for firmware >3.8
- NPM package ws added

## 0.2.0 (2026-07-09)

- Readme - German

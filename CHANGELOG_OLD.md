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
## 0.17.1 (2026-10-11)

#### 🛠 Bugfixes & Enhancements

- **Code Quality & CI/CD:** Fixed ESLint `no-prototype-builtins` pipeline failures in `objectManager.ts` by replacing direct `.hasOwnProperty()` calls with safe `Object.prototype.hasOwnProperty.call()` methods.

## 0.17.0 (2026-10-11)

#### 🚀 Features

- **COP & Efficiency Calculator:** Introduced a comprehensive COP (Coefficient of Performance) calculation engine to track heat pump efficiency.
- **External Smart Meter Support:** Users can now choose to use internal Luxtronik estimates or link high-precision external sensors (e.g., Shelly 3EM or M-Bus heat meters) via ioBroker Object IDs for power consumption and thermal energy generation.
- **Granular Live Metrics:** The adapter now dynamically analyzes the active operating state to split and calculate live daily COP values for "Total", "Heating", and "Hot Water" independently.
- **Persistent Time Rollovers:** Implemented a robust "snapshot" system with absolute virtual counters. The adapter automatically detects day, month, and year rollovers to persist data and guarantee accurate long-term calculations, even across adapter restarts or ioBroker reboots.
- **Dedicated Efficiency UI:** Added a new "Efficiency / COP" configuration tab to easily manage energy data sources and toggle the calculation engine.
- **Connection & Polling Status:** Added a new system datapoint `info.lastUpdate`. This state continuously tracks the exact timestamp of the last successful data retrieval, making it easy to monitor the adapter's health and polling activity in visualisations like VIS or Lovelace.

#### 🛠 Bugfixes & Enhancements

- **Object Tree Creation:** Fixed an issue where hidden data buckets for the COP calculation were not created because parent directories were missing.
- **Timestamp Formatting:** Resolved a strict type mismatch error in the ioBroker log by correctly formatting `info.lastUpdate` as an ISO string instead of a numeric timestamp.
- **State Properties & Code Quality:** Resolved strict TypeScript and ESLint warnings (missing JSDoc annotations, missing read/write object definitions) in the new COP manager.
- **Modernized ioBroker API:** Replaced deprecated `setStateAsync` method calls with the modern, promise-based `setState` standard across the COP calculation engine.
- **Config UI Sorting:** Ensured the newly generated configuration tabs maintain a logical and consistent order across rebuilds.
- **Internal Mapping:** Restructured the `info` folder mapping to cleanly accommodate adapter-level metadata alongside hardware telemetry.

## 0.16.1 (2026-10-11)

#### 🚀 Features

- **Enhanced UI Layout:** Improved the "Datapoints" settings tab layout to display up to 4 items side-by-side on larger screens for a better overview and improved usability.

#### 🛠 Bugfixes & Enhancements

- **State Cleanup Logic Fixed:** Resolved an issue where unchecked datapoints (e.g., Room Thermostats) were not removed from the ioBroker object tree. The `isStateEnabled` logic now correctly handles `undefined` config states for dynamically generated checkboxes.

## 0.16.0 (2026-10-11)

#### 🚀 Features

- **Dynamic Admin UI Generation:** The "Datapoints / Objects" configuration tab in the adapter settings is now fully auto-generated during the build process (`prebuild`). This ensures the UI is always 100% in sync with the underlying TypeScript state mappings.
- **Category Master Switches:** Added master toggle switches to the adapter settings. Users can now enable or disable entire hardware categories (e.g., Solar, Cooling, Ventilation) with a single click. This keeps the ioBroker object tree clean and significantly reduces unnecessary polling for unused features.
- **Dynamic Protection for Critical States:** System-critical datapoints are now protected dynamically via a `required: true` flag in the codebase. They are permanently locked (grayed out) in the UI and cannot be accidentally deleted or disabled by the user or the visibility filter.

#### 🛠 Bugfixes & Enhancements

- **Cycle Optimization Logic (Hot Water):** Fixed a logic flaw where the adapter erroneously applied an artificial hot water target temperature increase while the heat pump was already actively running a hot water cycle. The trigger is now strictly limited to the end of regular heating cycles.
- **Build Process Optimized:** Integrated the UI generation script (`generateConfig.ts`) seamlessly into the NPM `prebuild` lifecycle, automatically patching the `jsonConfig.json` before typescript compilation.

## 0.15.1 (2026-10-10)

#### 🛠 Bugfixes & Enhancements

- **Admin UI (ZIP Control):** Completely revised the explanatory text for the Circulation Pump (ZIP) settings in `jsonConfig.json`. Clarified the exact behavior of the "Disable base ZIP values" (`zip_lWP_aktiv`) option to prevent unintentional power cuts to external Wi-Fi relays (like Shelly) while maintaining EEPROM hardware protection.
- **Testing Framework:** Updated `@iobroker/testing` to version 6.3.0 to meet current repository standards.
- **Changelog Formatting:** Fixed Markdown header formatting to comply with ioBroker "Test and Release" requirements.

## 0.15.0 (2026-10-10)

####🚀 Features

- **Modularized State Mapping:** Restructured the massive `stateMapping.ts` into smaller, logically separated files (e.g., `info.ts`, `settings.ts`, `actions.ts`) to significantly improve code maintainability, readability, and scalability.
- **Improved Admin UI (ZIP Control):** Added comprehensive, scenario-based documentation to the Circulation Pump (ZIP) settings in the Admin interface (`jsonConfig.json`). It now clearly differentiates between continuous power setups (Scenario A) and heat-pump-powered setups (Scenario B). This prevents users from accidentally cutting power to external Wi-Fi relays (like Shelly) when using the EEPROM hardware protection feature.
- **New Telemetry Data added:** The adapter now automatically reads and creates crucial system values based on the BenPru standard: Compressor frequency (Index 231), Current heat output (Index 257), and Current power consumption (Index 268).
- **Extended Shutdown Codes (Outage History):** The internal database for heat pump shutdowns has been massively expanded. The adapter now recognizes and translates all 32 official Luxtronik shutdown reasons (e.g., _Inverter pause_, _Hot gas pause_, _Limit power consumption_) into detailed clear text (English & German). This ensures much more precise troubleshooting in the object tree and highly informative Telegram alerts.

####🛠 Bugfixes & Enhancements

- **Critical Startup Crashes Fixed:** Resolved multiple `UNCAUGHT_EXCEPTION` errors and communication aborts where the adapter crashed directly during initialization (`onReady`) or the polling loop. This was caused by missing hardcoded virtual data points (e.g., `Regelung_Aktiv`, `thermalenergy_total`, `energy_total`, `opStateCoolingString`) that were dropped during the state mapping modularization.
- **ZIP Optimization Defaults:** Fixed an issue where the circulation pump (ZIP) was unintentionally shut down (Hardware timers forced to 0 ON / 60 OFF) directly after installation. The logic and default values for `zip_lWP_aktiv` have been clarified to ensure users relying on the Luxtronik's internal power supply do not experience unexpected offline states of their smart relays.
- **Visibility Filter (Command 3005) fixed:** Resolved a major logic flaw in the `cleanupStates` function. Previously, the adapter ignored unsupported hardware components (like missing cooling or solar modules) but failed to delete their remnants from the ioBroker object tree. Obsolete datapoints and empty folders are now rigorously removed upon startup.
- **Precise Visibility Mapping implemented:** The hide-logic (Command 3005) no longer relies on broad folder names. Instead, it now uses the exact, manufacturer-specific visibility index (`visiIndex`) for every individual module to accurately show or hide features.
- **HUP Optimization (Temperature Spread Control):** Dynamic voltage adjustment of the heating circulation pump during heating operation now only triggers after the state has been active for at least 10 minutes and compressor 1 (`VD1`) is actively running. This prevents premature voltage shifts during startup phases before the thermal spread has stabilized.
- **Outage & Malfunction Monitoring:** Fixed tracking logic in `checkAndSendOutageNotifications`: Luxtronik outage code `0` (_Heat pump malfunction / WP-Störung_) is no longer erroneously skipped. Both low flow issues and direct heat pump shutdowns now reliably dispatch alarms via Telegram and the ioBroker Notification Center.

## 0.14.1 (2026-10-06)

- remove log entry for chunk reporting

## 0.14.0 (2026-10-06)

####🚨 BREAKING CHANGE / IMPORTANT HARDWARE NOTICE 🚨

**Critical Firmware Bug in Alpha Innotec / Novelan Controllers (V1.90.x & V2.90.x)**
The manufacturer has introduced a massive bug in the local Luxtronik protocol (Port 8889) with the firmware releases **V1.90.0** and **V2.90.0**. Whenever a smart home system (ioBroker, Home Assistant, etc.) attempts to write a parameter value to the heat pump, the controller freezes and forces a **hard reboot** of the system after about 10 seconds. Read operations are not affected.

👉 **Adapter Protective Measure:** To protect your hardware from continuous reboots and potential damage, a **protective shield (firewall)** has been implemented into the adapter.
As soon as the adapter detects firmware V1.90.x or V2.90.x, **all write commands are strictly blocked**. Instead, a corresponding warning is printed to the ioBroker log.

👉 **Solution for Affected Users:** Please contact the manufacturer's support or your installer to request an over-the-air (remote) downgrade to the previous stable version (**V1.89** or **V2.89**). If you still have the old firmware file saved locally, you can flash it via USB stick directly at the display. Once the system is running on V.89 again, the adapter will automatically release the write commands!

**✨ New Features & Improvements**

- **Hardware Protection Shield implemented:** Dynamic firmware verification before every write operation to protect against the reboot bug present in firmware versions 1.90.x and 2.90.x.
- **Visibilities completely overhauled:** The internal logic for command 3005 has been rewritten (dynamic detection of 1-byte and 4-byte arrays). The adapter now reads the visibility flags flawlessly across **all** firmware versions. Hiding non-existent hardware in the object tree now works perfectly for V1.x and V2.x systems without causing crashes or timeouts!

####🛠 Bugfixes & Refactoring

- **Adapter Configuration (UI):** Removed outdated warning labels regarding the "Hide unsupported parameters" checkbox, as this feature is now completely stable across all controller generations.
- **Network / WebSocket:** The experimental password transmission for port 8214 has been completely removed, as the communication issue was proven to be caused by the manufacturer's firmware bug. The WebSocket connection for genuine V3.x firmwares operates cleanly again using the proven standard handshake.

## 0.13.1 (2026-10-02)

- **Fix (Circulation/ZIP):** Fixed a bug where the `Virtual_ZIP_Status` datapoint would remain stuck on `true` when using external relays (e.g., Shelly), even though the hardware relay was correctly turned off. The state reset logic has been decoupled and is now guaranteed to execute, ensuring the ioBroker interface stays perfectly synchronized with the actual hardware state.

## 0.13.0 (2026-10-02)

- **Bugfixes:**
    - **Critical DHW Target Fix:** Fixed an issue where the hot water target temperature was incorrectly written to parameter 2 instead of 105. This resolves unexpected temperature jumps (e.g., to 65°C) and socket timeouts on various heat pump models.
    - **Write Queue Timeout:** Added a maximum wait timeout to the write queue lock for legacy V1.x firmware to prevent potential infinite loops during read-write collisions.
    - **Backup Manager Multi-Instance Fix:** The automated DTA backup cron job is now safely scoped to the specific adapter instance, preventing conflicts when running multiple heat pumps on the same ioBroker host.
- **Under the Hood / Refactoring:**
    - **Centralized Typings:** Completely refactored the TypeScript architecture by introducing a centralized `LuxtronikAdapter` interface (`types.ts`). Replaced all fragmented, local interfaces across sub-modules to ensure strict, project-wide type safety and better maintainability.

## 0.12.1 (2026-09-30)

- **Bugfixes:**
    - **Fixed Null-Values on Startup:** Virtual states for the circulation pump logic (`Actions.Activate_Zip` and `03_Outputs.Virtual_ZIP_Status`) are now explicitly initialized to `false` during adapter startup. This prevents undefined `null` values in the object tree, ensuring immediate compatibility with visualizations and logic scripts (like Blockly) right from the first second.

## 0.12.0 (2026-09-30)

- **⚠️ BREAKING CHANGE:**
    - The datapoint to manually trigger the circulation pump macro (`Activate_Zip`) has been moved from the `Settings` folder to the `Actions` folder for better UX. If you use this state in your scripts or visualizations, please update the datapoint path!

- **Features & Improvements:**
    - **Virtual Circulation Pump (ZIP) Status:** Added a new read-only indicator datapoint (`Virtual_ZIP_Status`) in the `03_Outputs` folder. This datapoint mirrors the true state of the adapter's intelligent circulation pump macro in real-time. This is highly beneficial for users controlling the ZIP via external smart relays (e.g., Shelly) to avoid controller flash-wear, as it provides an accurate status even when the heat pump's internal display is bypassed.

## 0.11.2 (2026-09-30)

- **Features & Improvements:**
    - **Smart Parameter Filtering:** Added full support for the Luxtronik visibility registry (Network Command 3005). The adapter now automatically hides parameters in the ioBroker object tree that are physically not supported by your specific heat pump model (e.g., hiding defrost valves on brine-to-water pumps). This dramatically declutters the system.
    - Added an "Expert Mode" toggle in the adapter configuration to optionally disable the visibility filter and force-show all parameters.
    - Extended the "Dump Raw to Log" feature to include the visibility matrix (Command 3005).
    - **Legacy Write-Mode (V1.x):** Added a new connection setting for older heat pumps (Firmware V1.x). This "Fire-and-Forget" mode prevents `Timeout writing TCP parameter` errors on controllers that do not send network acknowledgments after receiving a write command.
    - **Dynamic Hardware Protection:** The adapter now automatically detects your firmware version and adjusts network write delays dynamically (500ms for V1.x vs. 100ms for modern firmwares) to ensure maximum responsiveness without sacrificing stability.
    - **Safe Payload Rounding:** Enforced strict integer rounding (`Math.round`) for all numeric write payloads to prevent memory faults and crashes on older Luxtronik controllers.
    - **Visibility Filter UX:** Added a warning to the visibility filter configuration (Command 3005) to clarify that this feature requires Firmware V3.x and should be disabled on older systems to avoid startup timeouts.

- **Bugfixes:**
    - **Fixed Heat Pump Crashes / Reboots:** Implemented a global mutex lock between the polling cycle (`updateData`) and the write queue. This guarantees that read and write operations never overlap, preventing fatal network socket collisions that caused V1.x controllers to freeze and reboot.
    - **Fixed Object Cleanup:** Changed the mass deletion of orphaned objects and empty folders during adapter startup from parallel to sequential execution. This prevents the ioBroker database from being overloaded and silently dropping delete commands.

## 0.11.1 (2026-09-22)

- Resolve issues which are reported by repository checker

## 0.11.0 (2026-09-21)

- **Improvements:**
    - Added global rounding to 2 decimal places for all calculated telemetry values (e.g., converting operating seconds to hours). This provides a cleaner ioBroker state tree and prevents excessively long floating-point numbers from cluttering history databases (like InfluxDB).

## 0.10.4 (2026-09-21)

- Update Readme

## 0.10.3 (2026-09-21)

- **Features & Improvements:**
    - Optimized the automated DTA backup process by directly utilizing the `/NewProc` file stream, eliminating unnecessary artificial delays and stabilizing the heat pump controller.
    - Streamlined the backup configuration: Removed the custom file path input to prevent file system conflicts. Backups are now securely stored in the universally accessible global `0_userdata.0/luxtronik_backups/` directory.
    - Added a clear information box in the adapter configuration, explaining where to find the generated backup files within the ioBroker UI.

- **Fixes:**
    - Fixed the persistent `not an object of type "meta"` crash during DTA backups. The storage architecture was migrated away from isolated adapter namespaces to the robust, native `0_userdata.0` global storage, completely resolving folder creation permission issues on existing instances.
    - Corrected the dynamic file naming logic (`dta_live_...` vs. `dta_history_...`) to accurately reflect whether a live memory dump or a fallback history log was downloaded.

## 0.10.2 (2026-09-21)

- **🚀 Features:**
    - Implemented automated DTA file backup management with customizable cron schedules and automatic meta-directory creation in the ioBroker file system.

- **🛠 Chores / Under the Hood**
    - Enhanced TypeScript type checking, resolved strict ESLint warnings, and upgraded Node.js type definitions to support Node.js version 22.
    - Optimized image scaling and layout rendering in `jsonConfig.json` for cleaner adapter settings presentation.

## 0.10.1 (2026-09-20)

**🚀 Features & Improvements**

- **(Feature) Heating State String:** Added the configured heating curve parallel offset to the status string (e.g., "Offset +3 °C") for better transparency.

**🐛 Bugfixes**

- **(Fixed) Heating State String:** Corrected a logic issue where the status incorrectly displayed "Reduced 0 °C" during a scheduled reduction window, even if the actual reduction delta was set to 0 K. It now correctly displays "Normal (Timer)".

## 0.10.0 (2026-09-20)

**🚀 Features & Improvements**

- **(Added) Low Flow Outage Alerts:** Implemented active monitoring for "low flow" (Durchfluss) shutdowns in the outage history. The adapter now proactively sends a notification when the heat pump stops due to flow issues, as the controller usually treats these as soft outages rather than hard errors. Includes a 60-minute cooldown to prevent notification spam.
- **(Improved) Admin UI:** Integrated a direct recommendation link for the OpenDTA analysis tool into the description text of the Backup & Diagnostics tab.

**🛠 Chores / Under the Hood**

- **(Fixed) ESLint Validation:** Added missing JSDoc comments in the backup manager to resolve code validation warnings during development.

## 0.9.2 (2026-09-20)

**🛠 Refactoring & Under the Hood**

- **DTA Backup Logic & UI:** Restructured the "Backup & Diagnostics" settings tab. Removed obsolete text log buttons (`procerr`, `procparam`) which are blocked on newer firmwares. Reclassified the DTA manual download buttons into "Live DTA" (forces a new memory flush via `/NewProc`) and "Existing DTA" (fetches the last auto-saved historical log via `/proclog` which might be 2-3 hours old).
- **Automated Backup Naming:** The automated background backup job now dynamically prefixes the downloaded file as either `dta_live_[...]` or `dta_history_[...]` depending on which endpoint was successfully queried, clearly indicating the recency of the data.

## 0.9.1 (2026-09-20)

**🚀 Features & Improvements**

- **(Added) Backup & Diagnostics Tab:** Introduced a new tab in the adapter settings for easy access to heat pump data. Added a recommendation and link for the OpenDTA project to help users analyze their downloaded .dta files.
- **Automated DTA Backup:** Integrated a time-based background cron job to fully automate the retrieval and storage of DTA log files directly into the ioBroker file system.
- **Admin UI Diagnostics:** Added a dedicated "Backup & Diagnostics" tab in the adapter settings featuring manual download buttons for DTA files and system logs, along with a recommendation link for the OpenDTA analysis tool.
- **Intelligent Firmware Fallback:** Improved the DTA download logic to automatically detect the heat pump's firmware version. It seamlessly supports newer models (via `/NewProc`) while automatically falling back to legacy endpoints (`/proclog`, `/procdta`, or `/Webclient/procdta`) for older heat pumps.

## 0.9.0 (2026-09-20)

**🐛 Bugfixes**
🔴 **IMPORTANT:**

- **(Fixed) HUP Dynamic Voltage Control:** Fixed an issue where the digital relay state (`HUPout`) was queried instead of the actual nominal voltage (`heating_system_circ_pump_voltage_nominal`). This previously caused the calculation logic to produce target voltages below the hardware limit (e.g. 1.25V), triggering "less than min 3" validation warnings in the log.
- **(Fixed) Admin UI Backup Links:** Fixed multiple issues with the manual download links in the Backup tab. The IP address placeholder was corrected (from `{host}` to `${data.host}`) to resolve correctly. Additionally, `404 Not Found` errors on newer firmware versions were fixed by routing links to the root web directory (`/procdta`, `/procparam`, `/procerr`) instead of the legacy `/Webclient/` directory.

**🚀 Features & Improvements**

- **(Added) German Translations for Error & Outage Codes:** Added full German translations for all entries in `ERROR_CODES` and `OUTAGE_CODES`.
- **(Improved) Multi-Language History Logs:** The error log (`Fehlerspeicher`) and outage history (`Abschaltungen`) now dynamically output descriptions and fallbacks in the configured adapter language (`de` / `en`).
- **(Added) Backup & Diagnostics Tab:** Introduced a new tab in the adapter settings for easy access to heat pump data.
- **(Added) Manual Downloads:** Added direct buttons to manually download the parameter backup (`procparam`) and error log (`procerr`) via the heat pump's web server. The manual DTA download was split into two distinct steps ("1. Trigger DTA generation" and "2. Download DTA Log") to better reflect the hardware behavior.
- **(Added) Automated DTA Backup & Custom Storage:** Implemented a new scheduling feature (cron) to automatically trigger and download live DTA logs, saving them directly to the ioBroker file system. The default storage location is the root directory of the adapter's file system, but users can specify a custom subfolder (e.g., `backup`) which is automatically created and sanitized.
- **(Improved) Firmware Agnostic Backup Downloads:** The automated DTA backup manager now features an intelligent fallback mechanism. It attempts to download logs from both the root directory (`/procdta`) and the legacy subfolder (`/Webclient/procdta`), ensuring compatibility across all Luxtronik firmware versions (V1, V2, V3).

**🛠 Refactoring & Under the Hood**

- **(Development) TypeScript Definitions:** Added missing `@types/node-schedule` to the dev dependencies to resolve ESLint type-checking errors during the build process.

## 0.8.1 (2026-09-19)

- Resolve issues which are reported by repository checker

## 0.8.0 (2026-09-14)

**🚀 Features & Enhancements**

- **[Admin UI]** Completely redesigned the adapter configuration interface (`jsonConfig.json`). Settings are now cleanly organized into logical tabs (Connection, Cycle Optimization, Idle Defaults, HUP, Circulation pump, etc.).
- **[HUP Control]** Added a new dynamic hardware voltage scale factor for the heating circulating pump (HUP). Users can now toggle between factor 100 (for Firmware V2.x) and factor 10 (for Firmware V3.x) to ensure full compatibility across different hardware generations.
- **[Safety]** Added a confirmation warning dialog to the Admin UI that alerts users to the importance of entering correct values when enabling "Force default values during idle".

**🐛 Bugfixes**

- **[HUP Control]** Fixed an incorrect conversion factor for registers 867 and 868 (nominal and minimal HUP voltage). This previously caused newer setups (like the Alpha Innotec LWCV series with FW V3.x) to calculate 1.0V instead of 10.0V, resulting in continuous "less than min" boundary warnings in the ioBroker log.

**🛠 Refactoring & Under the Hood**

- **[Architecture]** Extracted the heating circulating pump (HUP) logic from `main.ts` into a dedicated, isolated `hupManager.ts` file to improve code modularity and maintainability.
- **[CI/CD]** Added Node.js 26 to the GitHub Actions test matrix (`test-and-release.yml`) to ensure future compatibility.
- **[TypeScript]** Added the `"rootDir": "./src"` compiler option to `tsconfig.json` to resolve TS5011 build errors with newer TypeScript versions.

## 0.7.3 (2026-09-07)

**Bugfixes**
-(Fixed) Timer Table Register Conflict: Resolved conflicting Luxtronik register IDs for Domestic Hot Water (DHW) Monday–Sunday schedules (WW_MoSo_Start1 to End5). These were previously mapped to registers 507–516 (colliding with Circulation timer registers) and have now been corrected to registers 406–415.

-(Fixed) Time-String Conversion on State Change: Fixed a parsing bug where manual updates to time strings (HH:MM / HH:MM:SS) on states marked with isDurationFormat or time-related roles were passed directly as strings instead of converting to seconds since midnight, preventing user-entered schedule values from persisting in the controller.

## 0.7.2 (2026-09-07)

**Bugfixes**

- (Fixed) Unintended Configuration Overwrites: Fixed a critical architectural flaw where the adapter blindly forced default values (e.g., hot water target temperature, heating curve) to the heat pump on every startup. The adapter is now 100% passive (read-only) upon installation until features are explicitly enabled.

- (Fixed) Strict Opt-In Logic: All internal condition checks for background automations (cycle optimization, ZIP optimization, idle resets) were refactored to strict opt-in logic (=== true), preventing unintended actions when settings have never been saved.

- (Fixed) Live Toggle for Cycle Optimization: Fixed an issue where the ioBroker switch Actions.Regelung_Aktiv was ignored during runtime. The optimization loop now evaluates this switch dynamically, allowing users to toggle the feature live via their dashboard.

- (Fixed) Hardware ZIP Timer Disable: Fixed a bug where a mismatched configuration key (zip_hardware_timer_disable instead of zip_lWP_aktiv) prevented the adapter from correctly disabling the hardware circulation pump timer for flash memory protection.

- (Fixed) "Heating after hot water" Reset: Restored missing logic that properly resets the "Heating after water" status back to false at the end of a cycle, preventing the system from getting stuck in this mode.

**Features & Change**

- (Changed) Forced DHW Safety Limit: Reduced the internal safety limit for temporary hot water target adjustments during forced DHW runs from 75°C to 70°C to better protect the system's high-pressure switch.

## 0.7.1 (2026-09-07)

**Bugfixes**

- (Fixed) Status Display: Fixed a logical evaluation bug where the operating state "Heating" (Code 0) was incorrectly overwritten and displayed as "No demand" (Code 5). Thanks to @michiproep for reporting!

- (Fixed) Temperature Values: Fixed a related issue where temperature readings of exactly 0 °C (e.g., average temperature, return target temperature, cooling release) were incorrectly replaced by internal fallback values (e.g., 1.5 °C).

## 0.7.0 (2026-09-04)

**Features & Changes**

- **(Changed) Cycle Optimization & Forced Hot Water**: To force a hot water cycle, the adapter now temporarily increases the hot water target temperature instead of modifying the hysteresis. This crucial safety improvement allows users to manually revert changes directly on the heat pump display without needing an installer password.
- **(Changed) Disable default**: Disabled reset to default values in idle mode by default on initial start
- **(Removed) Hysteresis Protection**: Removed all dynamic manipulations of the hot water hysteresis (e.g., during idle or active DHW cycles) to ensure installer-level settings remain untouched.
- **(UI/Docs)**: Added detailed explanations and trigger rules for "Intelligent Cycle Optimization" and "Heating after hot water" directly to the admin configuration page.

**Bugfixes**

- Fixed adapter checker warning [W0066] by downgrading `@types/node` dependency to v22

## 0.6.6 (2026-08-31)

- review / fix findings reported by claude based checker.
- Extended minimum limit for `temperature_outdoor_min` from -20°C to -25°C
- Lowered minimum allowed value for `heating_curve_parallel_offset` (base point) from 20°C to 15°C
- Disabled dynamic cycle optimization / regulation by default on initial start

## 0.6.5 (2026-08-07)

- review / fix findings reported by claude based checker.

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

<img src="admin/luxtronik2-controller.png" alt="Projekt Logo" width="20%">

# ioBroker.luxtronik2-controller

[![NPM version](https://img.shields.io/npm/v/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)

[![NPM](https://nodei.co/npm/iobroker.luxtronik2-controller.png?downloads=true)](https://nodei.co/npm/iobroker.luxtronik2-controller/)

**Tests:** ![Test and Release](https://github.com/TbsJah/ioBroker.luxtronik2-controller/workflows/Test%20and%20Release/badge.svg)

## luxtronik2-controller adapter for ioBroker

This ioBroker adapter enables the local control and monitoring of heat pumps with [Luxtronik 2.x controllers](https://www.alpha-innotec.com/en/products/accessories/control/luxtronik) (e.g., Alpha Innotec, Novelan). The adapter is written entirely in TypeScript.

## Acknowledgements & History

This project builds upon the preliminary work of existing open-source projects. Special thanks go to:

[Bouni](https://github.com/bouni/luxtronik-2) Whose pioneering work and code developments form the essential foundation for communication with Luxtronik controllers.

[Coolchip:](https://github.com/coolchip/luxtronik2) For the fundamental reverse engineering of the Luxtronik network protocol.

[UncleSamSwiss:](https://github.com/UncleSamSwiss/ioBroker.luxtronik2) For the original ioBroker adapter.

Innovations in this version: The luxtronik2-controller natively integrates TCP communication (Port 8888 / 8889) and does not rely on external libraries. Additionally, controlling macros, a logic for compressor protection, and automated datapoint management were implemented.

### Features

- **Native TCP Communication:** Direct connection to the heat pump without any additional overhead.
- **Compressor Protection (Cycle Optimization):** Intelligent merging of heating and domestic hot water (DHW) cycles to significantly reduce compressor starts.
- **Dynamic HUP Control:** Automatic voltage adjustment of the heating circulation pump (HUP) based on the flow and return temperature spread for maximum efficiency.
- **Integrated Actions (Macros):** Pre-defined control logic for forced heating, DHW requests, and the circulation pump (ZIP) – including an automatic fallback to safe default values.
- **Demand-Driven Circulation (ZIP):** Control your circulation pump via existing ioBroker motion sensors or directly via external actuators (e.g., Shelly) – entirely without hardware modifications to the heat pump.
- **Custom Datapoints:** Measured values (Index 3004) and parameters (Index 3003) can be flexibly added via the adapter configuration. Unix timestamps are automatically parsed into human-readable formats.
- **Extended Status Texts & Calculations:** Live calculation of temperature spread, thermal energy, and detailed text outputs of current system states (including offsets, frost protection, and cooling status).
- **Intelligent Notification System:** Send error codes and critical shutdowns (like flow rate issues) directly to Telegram or the ioBroker notification system – complete with cooldown spam protection.
- **Automated DTA Backup:** Scheduled downloads of DTA diagnostic logs directly from the heat pump to your ioBroker storage for easy analysis (e.g., in OpenDTA).
- **Automatic Object Management:** Deselected or deleted datapoints, as well as empty folder structures, are automatically and cleanly removed from ioBroker upon an adapter restart.
- **Broad Compatibility:** Full support for older (V2.x) and newer (V3.x) firmware generations (e.g., Alpha Innotec, Novelan) utilizing dynamic scaling factors.

## ⚠️ Warning

Some settings provided by this integration can affect the performance of your heat pump. Misconfigurations can cause the controller to enter a fault state, which requires a manual on-site reset.

This project aims to protect your heat pump by restricting the configuration options to safe values. However, no guarantees can be made. Please be careful, consult your Luxtronik manual, and do not change any settings that you do not fully understand.

## 🔧 Compatibility

The integration allows you to monitor and control heat pumps with a Luxtronik2 controller. It works locally without internet access.
It was and is being tested with an LWD50A (LD5) from Alpha Innotec.
It is used by manufacturers such as:

- Alpha Innotec,
- Siemens,
- Novelan,
- Roth,
- Elco,
- Buderus,
- Nibe,
- Wolf Heiztechnik.

## ⚠️ Disclaimer ⚠️

_This project is not affiliated with Alpha Innotec, Novelan, ait-deutschland GmbH, or any other company. It is a personal project that is maintained in spare time. Use at your own risk._

## Reporting Bugs & Contributing

Bug reports, compatibility notes for specific firmware versions, or feature requests can be submitted via the issue tracker in the [GitHub-Repository](https://github.com/TbsJah/ioBroker.luxtronik2-controller/issues).

## Information

[Info Deutsch](documentation/readme_de.md)

[Info English](documentation/readme_en.md)

<img src="documentation/Bilder/Haupteinstellung.png" alt="Haupteinstellung" width="100%">
<img src="documentation/Bilder/Objekte.png" alt="Objekte" width="100%">
<img src="documentation/Bilder/Datenpunkte.png" alt="Datenpunkte" width="100%">
<img src="documentation/Bilder/Benachrichtigung.png" alt="Benachrichtigung" width="100%">
<img src="documentation/Bilder/EigeneWerte.png" alt="EigeneWerte" width="100%">
<img src="documentation/Bilder/Fehlermeldung.png" alt="Fehlermeldung" width="100%">
<img src="documentation/Bilder/Bewegungssensoren.png" alt="Bewegungssensoren" width="100%">

## Changelog

// ### **WORK IN PROGRESS**

### **WORK IN PROGRESS**

#### 🛠 Bugfixes & Enhancements

- **Code Quality & CI/CD:** Fixed ESLint `no-prototype-builtins` pipeline failures in `objectManager.ts` by replacing direct `.hasOwnProperty()` calls with safe `Object.prototype.hasOwnProperty.call()` methods.

### 0.17.0 (2026-10-11)

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

### 0.16.1 (2026-10-11)

#### 🚀 Features

- **Enhanced UI Layout:** Improved the "Datapoints" settings tab layout to display up to 4 items side-by-side on larger screens for a better overview and improved usability.

#### 🛠 Bugfixes & Enhancements

- **State Cleanup Logic Fixed:** Resolved an issue where unchecked datapoints (e.g., Room Thermostats) were not removed from the ioBroker object tree. The `isStateEnabled` logic now correctly handles `undefined` config states for dynamically generated checkboxes.

### 0.16.0 (2026-10-11)

#### 🚀 Features

- **Dynamic Admin UI Generation:** The "Datapoints / Objects" configuration tab in the adapter settings is now fully auto-generated during the build process (`prebuild`). This ensures the UI is always 100% in sync with the underlying TypeScript state mappings.
- **Category Master Switches:** Added master toggle switches to the adapter settings. Users can now enable or disable entire hardware categories (e.g., Solar, Cooling, Ventilation) with a single click. This keeps the ioBroker object tree clean and significantly reduces unnecessary polling for unused features.
- **Dynamic Protection for Critical States:** System-critical datapoints are now protected dynamically via a `required: true` flag in the codebase. They are permanently locked (grayed out) in the UI and cannot be accidentally deleted or disabled by the user or the visibility filter.

#### 🛠 Bugfixes & Enhancements

- **Cycle Optimization Logic (Hot Water):** Fixed a logic flaw where the adapter erroneously applied an artificial hot water target temperature increase while the heat pump was already actively running a hot water cycle. The trigger is now strictly limited to the end of regular heating cycles.
- **Build Process Optimized:** Integrated the UI generation script (`generateConfig.ts`) seamlessly into the NPM `prebuild` lifecycle, automatically patching the `jsonConfig.json` before typescript compilation.

### 0.15.1 (2026-10-10)

#### 🛠 Bugfixes & Enhancements

- **Admin UI (ZIP Control):** Completely revised the explanatory text for the Circulation Pump (ZIP) settings in `jsonConfig.json`. Clarified the exact behavior of the "Disable base ZIP values" (`zip_lWP_aktiv`) option to prevent unintentional power cuts to external Wi-Fi relays (like Shelly) while maintaining EEPROM hardware protection.
- **Testing Framework:** Updated `@iobroker/testing` to version 6.3.0 to meet current repository standards.
- **Changelog Formatting:** Fixed Markdown header formatting to comply with ioBroker "Test and Release" requirements.

### 0.15.0 (2026-10-10)

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

## License

MIT License

Copyright (c) 2026 TbsJah <github.tbsjah@googlemail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[Older changelogs can be found there](CHANGELOG_OLD.md)

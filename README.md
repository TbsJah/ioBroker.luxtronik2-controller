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

- **⚠️ BREAKING CHANGE:**
    - The datapoint to manually trigger the circulation pump macro (`Activate_Zip`) has been moved from the `Settings` folder to the `Actions` folder for better UX. If you use this state in your scripts or visualizations, please update the datapoint path!

- **Features & Improvements:**
    - **Virtual Circulation Pump (ZIP) Status:** Added a new read-only indicator datapoint (`Virtual_ZIP_Status`) in the `03_Outputs` folder. This datapoint mirrors the true state of the adapter's intelligent circulation pump macro in real-time. This is highly beneficial for users controlling the ZIP via external smart relays (e.g., Shelly) to avoid controller flash-wear, as it provides an accurate status even when the heat pump's internal display is bypassed.

### 0.11.2 (2026-09-30)

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

### 0.11.1 (2026-09-22)

- Resolve issues which are reported by repository checker

### 0.11.0 (2026-09-21)

- **Improvements:**
    - Added global rounding to 2 decimal places for all calculated telemetry values (e.g., converting operating seconds to hours). This provides a cleaner ioBroker state tree and prevents excessively long floating-point numbers from cluttering history databases (like InfluxDB).

### 0.10.4 (2026-09-21)

- Update Readme

### 0.10.3 (2026-09-21)

- **Features & Improvements:**
    - Optimized the automated DTA backup process by directly utilizing the `/NewProc` file stream, eliminating unnecessary artificial delays and stabilizing the heat pump controller.
    - Streamlined the backup configuration: Removed the custom file path input to prevent file system conflicts. Backups are now securely stored in the universally accessible global `0_userdata.0/luxtronik_backups/` directory.
    - Added a clear information box in the adapter configuration, explaining where to find the generated backup files within the ioBroker UI.

- **Fixes:**
    - Fixed the persistent `not an object of type "meta"` crash during DTA backups. The storage architecture was migrated away from isolated adapter namespaces to the robust, native `0_userdata.0` global storage, completely resolving folder creation permission issues on existing instances.
    - Corrected the dynamic file naming logic (`dta_live_...` vs. `dta_history_...`) to accurately reflect whether a live memory dump or a fallback history log was downloaded.

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

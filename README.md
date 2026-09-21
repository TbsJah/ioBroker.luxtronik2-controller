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

- Update Readme

### 0.10.3 (2026-09-21)

- **Features & Improvements:**
    - Optimized the automated DTA backup process by directly utilizing the `/NewProc` file stream, eliminating unnecessary artificial delays and stabilizing the heat pump controller.
    - Streamlined the backup configuration: Removed the custom file path input to prevent file system conflicts. Backups are now securely stored in the universally accessible global `0_userdata.0/luxtronik_backups/` directory.
    - Added a clear information box in the adapter configuration, explaining where to find the generated backup files within the ioBroker UI.

- **Fixes:**
    - Fixed the persistent `not an object of type "meta"` crash during DTA backups. The storage architecture was migrated away from isolated adapter namespaces to the robust, native `0_userdata.0` global storage, completely resolving folder creation permission issues on existing instances.
    - Corrected the dynamic file naming logic (`dta_live_...` vs. `dta_history_...`) to accurately reflect whether a live memory dump or a fallback history log was downloaded.

### 0.10.2 (2026-09-21)

- **🚀 Features:**
    - Implemented automated DTA file backup management with customizable cron schedules and automatic meta-directory creation in the ioBroker file system.

- **🛠 Chores / Under the Hood**
    - Enhanced TypeScript type checking, resolved strict ESLint warnings, and upgraded Node.js type definitions to support Node.js version 22.
    - Optimized image scaling and layout rendering in `jsonConfig.json` for cleaner adapter settings presentation.

### 0.10.1 (2026-09-20)

**🚀 Features & Improvements**

- **(Feature) Heating State String:** Added the configured heating curve parallel offset to the status string (e.g., "Offset +3 °C") for better transparency.

**🐛 Bugfixes**

- **(Fixed) Heating State String:** Corrected a logic issue where the status incorrectly displayed "Reduced 0 °C" during a scheduled reduction window, even if the actual reduction delta was set to 0 K. It now correctly displays "Normal (Timer)".

### 0.10.0 (2026-09-20)

**🚀 Features & Improvements**

- **(Added) Low Flow Outage Alerts:** Implemented active monitoring for "low flow" (Durchfluss) shutdowns in the outage history. The adapter now proactively sends a notification when the heat pump stops due to flow issues, as the controller usually treats these as soft outages rather than hard errors. Includes a 60-minute cooldown to prevent notification spam.
- **(Improved) Admin UI:** Integrated a direct recommendation link for the OpenDTA analysis tool into the description text of the Backup & Diagnostics tab.

**🛠 Chores / Under the Hood**

- **(Fixed) ESLint Validation:** Added missing JSDoc comments in the backup manager to resolve code validation warnings during development.

### 0.9.2 (2026-09-20)

**🛠 Refactoring & Under the Hood**

- **DTA Backup Logic & UI:** Restructured the "Backup & Diagnostics" settings tab. Removed obsolete text log buttons (`procerr`, `procparam`) which are blocked on newer firmwares. Reclassified the DTA manual download buttons into "Live DTA" (forces a new memory flush via `/NewProc`) and "Existing DTA" (fetches the last auto-saved historical log via `/proclog` which might be 2-3 hours old).
- **Automated Backup Naming:** The automated background backup job now dynamically prefixes the downloaded file as either `dta_live_[...]` or `dta_history_[...]` depending on which endpoint was successfully queried, clearly indicating the recency of the data.

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

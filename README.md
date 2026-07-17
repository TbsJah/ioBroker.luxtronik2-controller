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

## Features

- Native TCP communication: Direct connection to the heat pump without additional overhead.

- Compressor protection (Cycle optimization): Combining heating and domestic hot water cycles to reduce compressor starts.

- Integrated actions (Macros): Predefined control logics for forced heating, hot water requests, and the circulation pump (ZIP) incl. automatic fallback to default values.

- Custom datapoints: Measured values (Index 3004) and parameters (Index 3003) can be added via the adapter configuration. Unix timestamps are formatted automatically.

- Automatic object management: Deselected or deleted datapoints and empty folder structures are automatically removed from ioBroker upon an adapter restart.

- Notification system: Heat pump error codes can be sent directly to Telegram or the ioBroker notification system.

- Motion detector coupling: Option for demand-driven activation of the circulation pump via existing ioBroker motion sensors.

## ⚠️ Warning

Some settings provided by this integration can affect the performance of your heat pump. Misconfigurations can cause the controller to enter a fault state, which requires a manual on-site reset.

This project aims to protect your heat pump by restricting the configuration options to safe values. However, no guarantees can be made. Please be careful, consult your Luxtronik manual, and do not change any settings that you do not fully understand.

## 🔧 Compatibility

The integration allows you to monitor and control heat pumps with a Luxtronik2 controller. It works locally without internet access.
It was and is being tested with an LWD50A (LD5) from Alpha Innotec.

## ⚠️ Disclaimer / Haftungsausschluss ⚠️

Dieses Projekt steht in keinerlei Verbindung zu Alpha Innotec, Novelan, ait-deutschland GmbH oder anderen Herstellern. Es handelt sich um ein privates Open-Source-Projekt, das in der Freizeit entwickelt und gepflegt wird. Die Nutzung des Adapters geschieht auf eigene Gefahr.

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

Added

- Bilingual support (i18n): Full support for English and German (adapter settings, state names, dropdown menus, and dynamic status texts).
- Language selection: Added a new dropdown menu in the adapter settings to freely choose the preferred output language for the ioBroker object tree.
- Firmware 3.x compatibility: Implemented an intelligent fallback system that dynamically calculates the status texts (heatpump_state_string) and runtime (heatpump_duration) from the main operating state. This is required because modern Luxtronik controllers no longer transmit the old LCD text lines.

Fixed

- Incorrect heating state (Frost protection): Fixed an issue where a switched-off heating system was incorrectly displayed as "Frost protection".
  The code now evaluates the correct index for the heating operating state (opStateHeating / 125) instead of incorrectly calculating it via the parameter.
- Timer display: Restored the clean HH:MM:SS formatting in the ioBroker UI without the annoying "s" (seconds) by introducing an internal isDurationFormat flag.
- Timer glitch fixed: When the compressor is idle, 00:00:01 (1 second) was often incorrectly displayed. This is now cleanly filtered to 00:00:00.
- ioBroker Repo-Checker warnings: Added the missing write: true property to the timer table selection states (role: "level") to fix the E1011 error.

Technical

- Fixed ESLint warnings (dot-notation) for object properties.

### 0.6.1 (2026-07-17)

- Implemented fallback mechanism: Index 80 lc is used if 117-120 are empty.

### 0.6.0 (2026-07-16)

- Added option to select the display language for state values (English/German)

### 0.5.3 (2026-07-16)

- Resolve issues which are reported by repository checker
- Updates Timers Format
- Time_WPein_akt 00:00:01 --> 00:00:00 if VD1 is false
- Fallback if Firmware > 3 for extStateStr & StateStr

### 0.5.2 (2026-07-15)

- Resolve issues which are reported by repository checker

### 0.5.1 (2026-07-14)

- Fix issue notify last error after instance restart

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

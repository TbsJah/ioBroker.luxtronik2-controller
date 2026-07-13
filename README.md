<img src="admin/luxtronik2-controller.png" alt="Projekt Logo" width="20%">

# ioBroker.luxtronik2-controller

[![NPM version](https://img.shields.io/npm/v/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)

[![NPM](https://nodei.co/npm/iobroker.luxtronik2-controller.png?downloads=true)](https://nodei.co/npm/iobroker.luxtronik2-controller/)

**Tests:** ![Test and Release](https://github.com/TbsJah/ioBroker.luxtronik2-controller/workflows/Test%20and%20Release/badge.svg)

## luxtronik2-controller adapter for ioBroker

Dieser ioBroker-Adapter ermöglicht die lokale Steuerung und Überwachung von Wärmepumpen mit Luxtronik 2.x Steuerung (z. B. Alpha Innotec, Novelan). Der Adapter ist vollständig in TypeScript geschrieben.

## Danksagung & Historie

Dieses Projekt baut auf den Vorarbeiten bestehender Open-Source-Projekte auf. Ein besonderer Dank geht an:

[Bouni](https://github.com/bouni/luxtronik-2) Dessen Pionierarbeit und Code-Entwicklungen die wesentliche Grundlage für die Kommunikation mit Luxtronik-Steuerungen darstellen.

[Coolchip:](https://github.com/coolchip/luxtronik2) Für das grundlegende Reverse-Engineering des Luxtronik-Netzwerkprotokolls.

[UncleSamSwiss:](https://github.com/UncleSamSwiss/ioBroker.luxtronik2) Für den ursprünglichen ioBroker-Adapter.

Neuerungen in dieser Version: Der luxtronik2-controller integriert die TCP-Kommunikation (Port 8888 / 8889) nativ und verzichtet auf externe Bibliotheken. Zusätzlich wurden steuernde Makros, eine Logik zur Verdichterschonung sowie ein automatisiertes Datenpunkt-Management implementiert.

## Features

- Native TCP-Kommunikation: Direkte Verbindung zur Wärmepumpe ohne zusätzlichen Overhead.

- Verdichter-Schonung (Takt-Optimierung): Zusammenlegung von Heiz- und Warmwasserzyklen zur Reduzierung der Verdichterstarts.

- Integrierte Aktionen (Makros): Vordefinierte Steuerungslogiken für Zwangsheizen, Warmwasseranforderung und die Zirkulationspumpe (ZIP) inkl. automatischem Rückfall auf Standardwerte.

- Benutzerdefinierte Datenpunkte: Messwerte (Index 3004) und Parameter (Index 3003) können über die Adapter-Konfiguration hinzugefügt werden. Unix-Zeitstempel werden automatisch formatiert.

- Automatisches Objekt-Management: Abgewählte oder gelöschte Datenpunkte und leere Ordnerstrukturen werden bei einem Adapter-Neustart automatisch aus ioBroker entfernt.

- Benachrichtigungssystem: Fehlercodes der Wärmepumpe können direkt an Telegram oder das ioBroker-Benachrichtigungssystem gesendet werden.

- Bewegungsmelder-Kopplung: Möglichkeit zur bedarfsgesteuerten Aktivierung der Zirkulationspumpe über vorhandene ioBroker-Bewegungssensoren.

## ⚠️ Warnung

Einige Einstellungen, die durch diese Integration bereitgestellt werden, können die Leistung deiner Wärmepumpe beeinträchtigen. Fehlkonfigurationen können dazu führen, dass der Regler in einen Fehlerzustand wechselt, was einen manuellen Reset vor Ort erfordert.

Dieses Projekt zielt darauf ab, deine Wärmepumpe zu schützen, indem die Konfigurationsmöglichkeiten auf sichere Werte beschränkt werden. Es können jedoch keine Garantien übernommen werden. Bitte sei vorsichtig, ziehe dein Luxtronik-Handbuch zurate und ändere keine Einstellungen, die du nicht vollständig verstehst.

## 🔧 Kompatibilität

Die Integration ermöglicht es dir, Wärmepumpen mit einem Luxtronik2-Regler zu überwachen und zu steuern. Sie funktioniert **lokal ohne Internetzugang**.
Getestet wurde und wird mit einer LWD50A (LD5) von Alpha Innotec.

## ⚠️ Disclaimer / Haftungsausschluss ⚠️

Dieses Projekt steht in keinerlei Verbindung zu Alpha Innotec, Novelan, ait-deutschland GmbH oder anderen Herstellern. Es handelt sich um ein privates Open-Source-Projekt, das in der Freizeit entwickelt und gepflegt wird. Die Nutzung des Adapters geschieht auf eigene Gefahr.

_This project is not affiliated with Alpha Innotec, Novelan, ait-deutschland GmbH, or any other company. It is a personal project that is maintained in spare time. Use at your own risk._

## Fehler melden & Mitwirken

Fehlerberichte, Kompatibilitätshinweise zu speziellen Firmware-Versionen oder Feature-Anfragen können über den Issue-Tracker im [GitHub-Repository](https://github.com/TbsJah/ioBroker.luxtronik2-controller/issues) eingereicht werden.

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

// ### **WORK IN PROGRESS**

### **WORK IN PROGRESS**

- Websocketport hinzugefügt für Firmware >3.8
- NPM Packet ws hinzugefügt

### 0.2.0 (2026-07-09)

- Readme - deutsch

### 0.1.5 (2026-07-09)

- Update Zip

### 0.1.4 (2026-07-09)

- Eigene States

### 0.1.3 (2026-07-09)

- Zip Prozess ausgelagert

### 0.1.2 (2026-07-09)

- NPM Freigabe

### 0.1.1 (2026-07-09)

- Readme

### 0.1.0 (2026-07-09)

- initial release

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

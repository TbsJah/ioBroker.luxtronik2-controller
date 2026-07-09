<img src="admin/luxtronik2-controller.png" alt="Projekt Logo" width="20%">

# ioBroker.luxtronik2-controller

[![NPM version](https://img.shields.io/npm/v/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)
![Number of Installations](https://iobroker.live/badges/luxtronik2-controller-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/luxtronik2-controller-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.luxtronik2-controller.png?downloads=true)](https://nodei.co/npm/iobroker.luxtronik2-controller/)

**Tests:** ![Test and Release](https://github.com/TbsJah/ioBroker.luxtronik2-controller/workflows/Test%20and%20Release/badge.svg)

## luxtronik2-controller adapter for ioBroker

Dieser ioBroker-Adapter ermöglicht die lokale Steuerung und Überwachung von Wärmepumpen mit Luxtronik 2.x Steuerung (z. B. Alpha Innotec, Novelan). Der Adapter ist vollständig in TypeScript geschrieben.

## Danksagung & Historie

Dieses Projekt baut auf den Vorarbeiten bestehender Open-Source-Projekte auf. Ein besonderer Dank geht an:

[Coolchip:](https://github.com/coolchip/luxtronik2) Für das grundlegende Reverse-Engineering des Luxtronik-Netzwerkprotokolls.
[UncleSamSwiss:](https://github.com/UncleSamSwiss/ioBroker.luxtronik2) Für den ursprünglichen ioBroker-Adapter.

Neuerungen in dieser Version: Der luxtronik2-controller integriert die TCP-Kommunikation (Port 8888 / 8889) nativ und verzichtet auf externe Bibliotheken. Zusätzlich wurden steuernde Makros, eine Logik zur Verdichterschonung sowie ein automatisiertes Datenpunkt-Management implementiert.

## ⚠️ Disclaimer / Haftungsausschluss ⚠️

Dieses Projekt steht in keinerlei Verbindung zu Alpha Innotec, Novelan, ait-deutschland GmbH oder anderen Herstellern. Es handelt sich um ein privates Open-Source-Projekt, das in der Freizeit entwickelt und gepflegt wird. Die Nutzung des Adapters geschieht auf eigene Gefahr.

_This project is not affiliated with Alpha Innotec, Novelan, ait-deutschland GmbH, or any other company. It is a personal project that is maintained in spare time. Use at your own risk._

## Developer manual

Readme - deutsch
Readme - english

### 0.1.4 (2026-07-09)

- NPM

### 0.1.3 (2026-07-09)

- Zip Prozess ausgelagert

### 0.1.2 (2026-07-09)

NPM Freigabe

### 0.1.1 (2026-07-09)

- Readme

### 0.1.0 (2026-07-09)

- (TbsJah) initial release

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

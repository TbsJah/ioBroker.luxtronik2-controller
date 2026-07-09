Erläuterung der Readings
Allgemeine Wärmepumpenwerte
ambientTemperature - Temperatur des Außensensors in °C
averageAmbientTemperature - Gemittelte Außentemperatur in °C (für Heizgrenze im Sommer, siehe Frostschutz und Heizgrenze)
bivalentLevel - Bivalenzstufe, siehe Bivalenter Betrieb
COP - Coefficient Of Performance, Wirkungsgrad der Wärmepumpe (Leistungszahl ε). Eine Leistungszahl von z.B. 4,2 bedeutet, dass von der eingesetzten elektrischen Leistung des Kompressors das 4,2- fache an Wärmeleistung bereitgestellt wird. Anders formuliert, kann mit dieser Wärmepumpe aus einem Kilowatt elektrischer Leistung 4,2 kW Wärmeleistung zur Verfügung gestellt werden. Bei der Berechnung des COPs wird die elektrische Leistung aus dem Attribut "heatPumpElectricalPowerWatt" benutzt.
delayDeviceTimeCalc - Abweichung Gerätesystemzeit zur FHEM-Zeit. Dieser kann bis zu 2 s in der Vergangenheit liegen. Höhere Werte weisen auf eine ungenaue Systemzeit in der Steuerung hin.
deviceTimeCalc - Beim Abrufen der Gerätewerte wird von der Luxtronik-Steuerung auch der Zeitpunkt der internen Ermittlung übergeben.
durationFetchReadings - Dauer (in s) des Abrufes der Gerätewerte von der Steuerung
flowRate - Durchfluss in l/h
flowTemperature - Vorlauftemperatur in °C, normalerweise direkt hinter der Heizungsumwälzpumpe gemessen und vor einer eventuell installierten Heizpatrone
heatSourceIN - Wärmequelle Eingangstemperatur in °C
heatSourceOUT - Wärmequelle Ausgangstemperatur in °C (sitzt bei Luft-Wasser-WPs aber im Verdampfer)
hotGasTemperature - Heißgastemperatur in °C, Temperatur, die hinter dem Kompressor der Wärmepumpe anfällt
opStateHeatPump1...3
returnTemperature - Rücklauftemperatur in °C, normalerweise vor dem Eingang zum Wärmetauscher des Verdichterkreislaufes gemessen
thermalPower - aktuelle Heizleistung der WP in kW, berechnet aus Durchfluss und Differenz von Vor- und Rücklauftemperatur, also ohne Heizpatrone etc.
Luft-Wasser-Wärmepumpen
heatSourceDefrostAirEnd - Luft-Ausgangstemperatur in °C bei der die Luftabtauung des Verdampfers beendet wird
heatSourceDefrostAirThreshold - Luft-Eingangstemperatur in °C oberhalb der der Verdampfer (energiesparend) mit Luft abgetaut wird
heatSourceDefrostLast - Dauer sowie Umgebungs- und Luft-Eingangs-Temperaturen zum Beginn und am Ende der letzten Abtauung
heatSourceDefrostLastTimeout - Umgebungs- und Wärmequellen-Temperaturen bei denen die Luftabtauung die maximale Dauer überschritten hat.
heatSourceDefrostTimer - Ablaufzeit in Sekunden bis zur nächsten Abtauung des Verdampfers
Heizung
heatingCurveEndPoint - Endpunkt der Heizkurve in °C bei -20°C Außentemperatur
heatingCurveOffset - Parallelversatz der Heizkurve
heatingSystemCircPumpDeaerate - Entlüftungsmodus der Heizkreisumwälzpumpe (wird zum gezielten Einschalten der Pumpe durch FHEM genutzt)
heatingLimit - Heizgrenze wird ausgewertet (on, off)
mixer1FlowTemperature - Vorlauftemperatur am Mischkreis 1 in °C
mixer1TargetTemperature - Sollwert Vorlauftemperatur am Mischkreis 1 in °C
mixer2FlowTemperature - Vorlauftemperatur am Mischkreis 2 in °C
mixer2TargetTemperature - Sollwert Vorlauftemperatur am Mischkreis 2 in °C
mixer3FlowTemperature - Vorlauftemperatur am Mischkreis 3 in °C
mixer3TargetTemperature - Sollwert Vorlauftemperatur am Mischkreis 3 in °C
opModeHeating - Betriebsmodus der Heizung (Aus, Automatik, Zusatzheizung, Party, Ferien)
opStateHeating - Status der Heizung (Aus, Normal, Abgesenkt, Heizgrenze, Frostschutz)
returnTemperatureHeating - aktuelle oder letzte valide Rücklauftemperatur des Heizungskreislaufes in °C. Durch die Speicherung kann auch bei stehender Zirkulationspumpe oder während der Warmwasserbereitung auf die letzte valide Rücklauf-Temperatur des Heizkreislaufes zurückgegriffen werden.
returnTemperatureHyst - Regel-Hysterese in K der Rücklauf-Solltemperatur
returnTemperatureSetBack - Schnellverstellung in K der Rücklauf-Solltemperatur
returnTemperatureTarget - Sollwert Rücklauftemperatur in °C (wird durch Heizkurve und Außensensor bestimmt, kann über in der Steuerung eingegebene Zeiten und auch manuell gezielt abgesenkt)
thresholdHeatingLimit - Heizgrenze in °C, überschreitet die gemittelte Außentemperatur diesen Wert, wird nicht mehr geheizt
thresholdTemperatureSetBack - unterschreitet die Außentemperatur diesen Wert (°C), wird die Rücklauf-Solltemperatur nicht mehr (zeitgesteuert) abgesenkt
Warmwasserbereitung
hotWaterCircPumpDeaerate - Entlüftungsmodus der Zirkulationspumpe (zum gezielten Einschalten der Zirkulationspumpe durch FHEM)
hotWaterTemperature - aktuelle Warmwasser-Boiler-Temperatur in °C (Achtung, die Temperatur im Boiler ist sehr unterschiedliche, es wird also nur die Temperatur am Sensor angezeigt. Typischerweise sackt die Temperaturkurve beim Aufheizen des Boilers etwas ab, weil es durch den Wärmeeintrag zu Strömungen kommt.)
hotWaterTemperatureTarget - obere Solltemperatur des Boilers in °C
opModeHotWater - Betriebsmodus der Warmwasserbereitung (Aus, Automatik, Zusatzheizung, Party, Ferien)
opStateHotWater - Status der Warmwasserbereitung (Aus, Aufheizen, Temp. OK, Sperrzeit)
Solarthermie
solarBufferTemperature - in °C
solarCollectorTemperature - in °C
Lüftung
opModeVentilation - Betriebsmodus der Lüftung (Aus, Automatik, Party, Feuchteschutz)
ventSupplyAirTemperature - Zulufttemperatur in °C
ventExhaustAirTemperature - Ablufttemperatur in °C
Zähler
counterHeatQHeating - von der Wärmepumpe produzierte Wärmemenge (kWh) zur Heizung
(nur bei vorhandenem Wärmemengenzähler und ohne Wärmeeintrag durch zweite Wärmequelle wie z.B. Heizstäbe)
counterHeatQHotWater - von der Wärmepumpe produzierte Wärmemenge (kWh) zur Warmwasserbereitung
(nur bei vorhandenem Wärmemengenzähler und ohne Wärmeeintrag durch zweite Wärmequelle wie z.B. Heizstäbe)
counterHeatQTotal - von der Wärmepumpe produzierte Wärmemenge (kWh) insgesam
(nur bei vorhandenem Wärmemengenzähler und ohne Wärmeeintrag durch zweite Wärmequelle wie z.B. Heizstäbe)
counterHours2ndHeatSource1 - Betriebsstunden der zweite Wärmequelle (normalerweise elektrische Heizstäbe)
counterHoursHeatPump - Betriebsstunden des Wärmepumpenkompressors
counterHoursHeating - Betriebsstunden des Wärmepumpenkompressors die zur Heizung benutzt wurden
counterHoursHotWater - Betriebsstunden des Wärmepumpenkompressors die zur Warmwasserbereitung benutzt wurden
Ein- und Ausgänge
compressor1...2
heatingSystemCircPump - Heizungs-Umlaufpumpe in der Wärmepumpe (normaler Weise für das Heizungssystem) (HUP)
heatingSystemCircPumpVoltage - Regelspannung an der Heizungs-Umlaufpumpe in der Wärmepumpe (zur Steuerung der Pumpen-Drehzahl)
heatSourceMotor - Motor des Ventilators, der Brunnen- oder der Solepumpe (je nach WP-Typ) (Ventil-BOSUP)
hotWaterCircPumpExtern - Zirkulationspumpe im Warmwasserstrang des Hauses (wenn genutzt) (ZIP)
hotWaterSwitchingValve - Ventil zur Umschaltung auf die Heizspirale im Boiler (BUP)
2ndHeatSource1...3
solarPump - Pumpe der Solarthermie (SLP)
userHeatpumpValues
RAW Daten
Die Seite der Java-Schnittstelle enthält auch eine Liste der Betriebsdaten (sog. berechnete Werte) die man mit get <device> rawdate anzeigen und mit dem Attribut userHeatpumpValues zum Gerät hinzufügen kann. Die RAW Daten werden mit get <device> rawdata ausgelesen. Jeder Wert hat hierbei eine Nummer, die mit dem Attribut userHeatpumpValues zusätzlich als reading bereitgestellt werden kann.

userHeatpumpValues Syntax
Die bei den Raw Daten ausgewählte Nummer und der frei gewählte reading Name wird dann wie folgt eingetragen.

get <device> rawdata
attr <device> userHeatpumpValues [rawdata_Nummer] [Wunschnamen],[rawdata_Nummer] [Wunschnamen],[rawdata_Nummer] [Wunschnamen]
Sonstiges
Firmware
typeSerial - Baujahr/Monat-Lfd.Hexadezimalnummer
typeHeatpump - Modell der Wärmepumpe
ERC
HMD 2
KLW
KSW
L1A
L1A407
L1AREV
L1H
L1I
L1I407
L1S
L2A
L2A407
L2AREV
L2G
L2G404
L2G407
L2H
L2I
L2I407
LD2AG
LD5
LD5 (230V)
LD5 REV
LD5 REV 230V
LD7
LD7 (230 V)
LD7 REV
LD7 REV 230V
LD9
LD9 REV 230V
LW SEC
LWC
LWC407 - Kompakte Luft/Wasser-Wärmepumpe zur Innenaufstellung
LWDV90 Duale Luft/Wasser-Wärmepumpe invertergeführt zur Außenaufstellung
LWDV91-1/3 Duale Luft/Wasser-Wärmepumpe invertergeführt zur Außenaufstellung
MSW 10
MSW 10S
MSW 12
MSW 13S
MSW 14
MSW 16S
MSW 17
MSW 19
MSW 23
MSW 26
MSW 30
MSW 4
MSW 4S
MSW 6 - Sole/Wasser-Wärmepumpe
MSW 6S
MSW 8
MSW 8S
MSW2-6S
MSW3-12
MSW3-12S
MSW4-1676
SW 291
SW 29_56
SW 37_45
SW 58_69
SW1 - ?? Sole/Wasser-Wärmepumpe
SW2
SWC - ?? kompakte Sole/Wasser-Wärmepumpe
WW1 - ?? Wasser/Wasser-Wärmepumpe
WW2
WWB_20 - ?? Wasser/Wasser-Booster zur dezentralen Trinkwassererwärmung
WWC1 - ?? kompakte Wasser/Wasser-Wärmepumpe
WWC2
WZS - ??? Sole/Wasser Wärmezentrale
WZW
WZWD
Tipps zum ökonomischen Betrieb
Grundlage eines ökonomischen Betriebs einer Wärmepumpe ist in erster Linie ein guter hydraulischer Abgleich der Heizwasserverteilung und eine genaue Einstellung der Heizkurve. Beides ist sowohl von den Bedürfnissen und dem Nutzungsverhalten der Bewohner als auch von der Dämmung des Hauses abhängig.

Insbesondere für Wärmepumpen, die nicht über einen leistungsgeregelten Verdichter verfügen, gibt es den interessanten Ansatz, die Einzelraumregler (ERR) und das Überströmventil der Wärmepumpe komplett ausser Betrieb zu nehmen und damit alle Heizkreise als ein "Heizkörper" zu betrachten. Diverse Foreneinträge (z.B. [1]) erzählen von bedeutenden Einsparungen durch Absenken der Solltemperatur und Wärmepumpen-freundlichen Betriebszyklen (lange Taktzeiten) und gehen auch detailiert auf durch die Luxtronik2 betriebene Wärmepumpen ein.

Ein detailierte Anleitung zum energiesparenden Betrieb einer Wärmepumpe findet man auf der folgenden Wiki-Seite:
Effizienter Betrieb einer Fußbodenheizung mit Luft-Wasser-Wärmepumpe (Fallbeispiel)

Sperrzeiten
Die Luxtronik 2.0 erlaubt es, sich mit Hilfe von Sperrzeiten an zeitabhängige Strompreise anzupassen. Die Uhr der Steuerung geht jedoch sehr ungenau. Durch Setzen des Attributes "autoSynchClock" wird die Uhr der Steuerung regelmäßig mit der FHEM-Zeit abgeglichen. Die Funktion muss über das Attribut "allowSetParameter" freigegeben werden.

attr <device> allowSetParameter 1
attr <device> autoSynchClock 10
Dies funktioniert nicht bei der Steuerungen Luxtronik 2.1 und bei der Firmware 2.xx, 3.xx oder 4.xx.

Abschätzung des elektrischen Verbrauches
Über die Attribute "heatPumpElectricalPowerWatt", "heatPumpElectricalPowerFactor" und "heatRodElectricalPowerWatt" wird der elektrische Verbrauch während der Wärmeerzeugungen (Kompressormotor, Motor(en) der Wärmequelle) und der Heizstäbe festgelegt. Ist zudem das Attribute "doStatistics" auf 1 und der Werte "activeTariff" auf einen Wert zwischen 1 und 9 gesetzt, so berechnet das Modul anhand der Betriebsstunden automatisch den elektrischen Verbrauch innerhalb des angegebenen Stromtarifes.

Normalerweise wird eine Wärmepumpe mit einem zeitabhängigen Stromtarif betrieben (Doppeltarifzähler). Hierbei muss der Werte "activeTariff" zum jeweiligen Zeitpunkt über ein FHEM-Script gesetzt werden. Beispiel:

define Strom_HT_W at *06:00 { if ( $wday != 0 ) {fhem( "set Heizung activeTariff 1" );;} }
define Strom_NT_W at *22:00 set Heizung activeTariff 2
define Strom_NT_Sa at \*13:00 { if ( $wday == 6 ) {fhem( "set Heizung activeTariff 2" );;} }
Verhalten der Steuerung Luxtronik 2.0
Leider ist die Beschreibung des Steuerungsverhaltens in den Bedienungsanleitungen meist sehr oberflächlich gehalten. Die folgenden Erläuterungen benutzen die Abkürzungen (fett) der Webapplikation der Steuerung.
Das notwendige Verständnis der Prozesstechnik einer Wärmepumpe erhält man z.B. auf den folgenden Seiten: www.energie-experten.org/heizung/waermepumpe/technik/

Abtauung des Verdampfers (Luftwärmetauschers) bei Luft-Wasser-Wärmepumpen
Wird die Luft im Verdampfer unter den Taupunkt abgekühlt, so kommt es zur Ansammlung von Feuchtigkeit an den Bauteilen des Verdampfer. Liegt dabei die Temperatur an den Lamellen unter 0 °C (bzw. die Ausströmtemperatur der Luft knapp darüber) so vereist der Verdampfer. Diese Eisschicht wächst kontinuierlich und verschlechtert extrem die Wärmeübertragung aus der Luft in den Verdichterkreislauf.

Aus diesem Grund wird bei einer Außentemperatur unter 15°C der Verdampfer zyklisch abgetaut. Das Abtauen startet nach dem Ende der Ablaufzeit Abtauen (heatSourceDefrostTimer) des Verdichters. Der Startwert der Ablaufzeit Abtauen liegt im Bereich Abtzyk min und Abtzyk max und wird bei Kreisumkehr (s.u.) nach jedem Abtauvorgang anhand der dafür benötigten Zeit neu bestimmt.

Bei Außentemperaturen zwischen 10°C und 15°C muss der Verdichter außerdem kontinuierlich 40 Minuten gelaufen sein. Während des Stillstandes des Verdichters wird bei Wärmequelle-Ein (heatSourceIN) oberhalb T-Luftabt. (heatSourceDefrostAirThreshold) die Ablaufzeit Abtauen (heatSourceDefrostTimer) wieder kontinuierlich (1s pro min) bis zum Wert Abtzyk min erhöht.

Temperaturverlauf bei Luftabtauung
(roter Pfeil)
Es gibt zwei Möglichkeiten des Abtauens:

Luftabtauung: nur oberhalb des Gefrierpunktes, etwas langsamer aber energiesparend
Die Luftabtauung wird nur gestartet, wenn zu Beginn des Abtauens die Temperatur Wärmequelle-Ein (heatSourceIN) oberhalb der Temperatur T-Luftabt. (heatSourceDefrostAirThreshold) liegt. Dann wird der Verdichter abgeschaltet und nur noch der Ventilator (heatSourceMotor) betrieben, um die Eisschicht mit der durchströmenden Luft abzutauen. Dabei steigt die Austrittstemperatur Wärmequelle-Aus (heatSourceOUT) bis auf ca. 0°C und das geschmolzene Eis beginnt abzulaufen. Ist der größte Teil des Eises geschmolzen, so steigt die Austrittstemperatur wieder. Die Luftabtauung wird beendet, wenn die Schaltspielsperre nach Verdichterstop (5 min) abgelaufen ist und die Temperatur Wärmequelle-Aus (heatSourceOUT) den Wert T-LABT-Ende (heatSourceDefrostAirEnd) erreicht hat oder wenn die Zeitbegrenzung Luft-Abt. max überschritten wird. Bei Überschreitung der Zeitbegrenzung wird per Kreisumkehr weiter abgetaut. Nach dem Ende der Luftabtauung wird die Ablaufzeit Abtauen (heatSourceDefrostTimer) auf den Wert Abtzyk min gesetzt.
Kreisumkehr: schnell und energieintensiv
Bei der Kreisumkehr wird der Ventilator (heatSourceMotor) abgeschaltet und der Verdichter weiter betrieben. Über ein Vierwegeventil (Ausgang AV-Abtauventil) wird der Verdichterkreislauf so umgekehrt, dass dem Heizwasserkreislauf Wärme entzogen und der Verdampfer aufgeheizt wird. Nach 10 Minuten oder beim Ansprechen des Abtauendepressostaten (Eingang ASD) wird der Abtauvorgang beendet.
Vor dem Start des Abtauens erfolgt eine s. g. Durchflussüberwachung. Dabei wird geheizt und die Steuerung prüft, ob der Heizkreislauf genügend Durchfluss hat, um die nötige Wärmemenge für den Abtauvorgang zu Verfügung zu stellen. Die Durchflussüberwachung dauert 8 Minuten. In dieser Zeitspanne ist das erwärmte Wasser zumeist auch durch den Heizungskreislauf gewandert, steht wieder am Vorlauf an und wird dann durch den Abtauvergang wieder abgekühlt. Bei einer Außentemperatur über 5 °C oder einer Rücklauftemperatur über 40 °C wird die Durchflussüberwachung auf zwei Minuten gekürzt.
Kommt die Wärmepumpe vor dem Start der Luftabtauung zum Stehen, so taut der Verdampfer durch die Plusgrade der Umgebung auch von ganz allein ab, diese ist an der Temperatur Wärmequelle-Aus zu erkennen, wird von der Luxtronik aber leider nicht berücksichtigt.

Der Sensor Wärmequelle-Ein sitzt im Zuluftkanal in der Nähe des Verdampfers. Der Sensor Wärmequelle-Aus sitzt direkt im Verdampfer, misst also nicht die tatsächliche Lufttemperatur.

Bivalenter Betrieb
Bivalenz Stufe
Damit wird über die HRM- und HRW-Zeit das Zuschalten weiterer Wärmequellen gesteuert:
Stufe 1 = ein Verdichter darf laufen (Bei zwei Verdichtern werden diese in Abhängigkeit der Impulse Verdichter 1/2 abwechselnd verwendet.)
Stufe 2 = zwei Verdichter dürfen laufen, sofern die Außentemperatur den Wert Freig. 2.VD unterschritten hat. Statt dem 2. Verdichter kann auch eine parallel betriebene Wärmepumpe freigegeben werden.
Stufe 3 = zusätzlicher Wärmeerzeuger 1 (ZWE 1, z.B. Heizstäbe oder Kessel) darf mitlaufen, sofern die Außentemperatur den Wert Freig. ZWE unterschritten hat
Stufe 4 = zusätzlicher Wärmeerzeuger 2 (ZWE 2, z.B. Heizstäbe) darf mitlaufen, sofern die Außentemperatur den Wert Freig. ZWE unterschritten hat
Wenn die Rücklauftemperatur die Rücklauf-Solltemperatur und die maximale Rücklauferhöhung TR Erh max überschreitet, werden sofort alle Wärmeerzeuger abgeschaltet und die Bivalenzstufe 1 gesetzt.
Wenn in der Heizung die maximale Vorlauftemperatur Vorlauf max. überschritten wird, dann wird sofort ein Kompressor ausgeschalten und die Bivalenzstufe um den Wert 1 reduziert.
Bei der Warmwassererzeugung wird der zusätzliche Wärmeerzeuger erst nach der Zeit WW+WP max freigegeben.
HRM-Zeit - Heizungsregler Mehr-Zeit
Die Zeit beginnt zu zählen, wenn die Wärmepumpe heizt und sich die Rücklauftemperatur unterhalb des Einschaltkriteriums (Rückl.Soll - Hyterese HR) befindet.
Überschreitet diese Zeit einen bestimmten Wert, so wird in die nächst höhere Bivalenzstufe geschaltet, um zusätzliche Wärmeerzeuger zu aktiviert.
Die Bivalenzstufe 2 (zwei Verdichter) wird nach der HR Zeit (Standard 25 min) erreicht.
Die Bivalenzstufe 3 (ZWE 1) wird nach der Zeit Freig. ZWE (Standard 60 min) erreicht.
Die Bivalenzstufe 4 (ZWE 2) wird nach 120 min erreicht.
HRW-Zeit - Heizungsregler Weniger-Zeit
Die Zeit beginnt zu zählen, wenn die Wärmepumpe heizt und sich die Rücklauftemperatur oberhalb des Ausschaltkriteriums (Rückl.Soll + Hyterese HR) befindet.
Überschreitet diese Zeit einen bestimmten Wert (jeweils 15 min), so wird in die nächst niedrigere Bivalenzstufe geschaltet, um zusätzliche Wärmeerzeuger wieder zu deaktivieren.
Automatische Sperren
SSP-Zeit - Ablaufzeit der Schaltspielsperre (SSP)
Es gibt zwei SSP-Ablaufzeit. Sie verzögern das erneute Starten des Verdichters für:
20 min ab letztem Einschaltzeitpunkt des Verdichters, um die Belastung des Stromnetzes durch den erhöhten Anlaufstrom zu reduzieren.
5 min ab letztem Ausschaltzeitpunkt des Verdichters, um den Verdichterkreislauf zu schonen.
Das heisst, der Verdichter startet frühestens 20 min nach dem letzten Start, resp. 5 min nach dem letzten Stop. Es gibt also maximal 3 Anläufe pro Stunde.
Heizkurve
Die Heizkurve lässt sich über zwei Parameter einstellen

Eine Veränderung des Heizkurven-Endpunktes (HKE) verändert die Steigung der Kurve indem es die Rücklauf-Solltemperatur rlSoll bei tiefen Temperaturen festlegt.
Die Parallelverschiebung (PVS) des Heizkurven-Fusspunktes hebt oder senkt die komplette Kurve und verändert dabei auch die Steigung geringfügig.
Bei einer "neutralen" Parallelverschiebung von 20°C wird bei -20°C Außentemperatur der Heizkurvenendpunkt als rlSoll eingestellt.
Bei 20°C Außentemperatur liegt rlSoll auf dem Heizkurven-Fusspunkt von 20°C.
Eine Erhöhung des Fusspunktes um 1°C erhöht auch rlSoll bei -20°C um 1°C.
Die Rücklauf-Solltemperatur rlSoll wird von der Steuerung in Abhängigkeit von der Außentemperatur wie folgt berechnet:

rlSoll (Aussentemp) = PVS + (HKE - 20) \* (PVS - Aussentemp) / (20 - (Aussentemp - PVS) / 2)
Beispiel
Bei einer "neutralen" Parallelverschiebung von 20°C und einem Heizkurvenendpunkt von 30°C lautet der vereinfacht Term:

rlSoll (Aussentemp) = 20 + 20 \* (Aussentemp - 20) / (Aussentemp - 60)
D.h. rlSoll (20°C) = 20°C und rlSoll (-20°C) = 30°C

Frostschutz und Heizgrenze
Ist die Heizgrenze eingeschaltet, so schaltet die Steuerung in den Frostschutz-Modus (=Sommermodus), sobald die Mitteltemperatur (averageAmbientTemperature) die Heizgrenze (thresholdHeatingLimit) um 0,2 K überschreitet. Dabei wird die Rücklaufsolltemperatur (returnTemperatureTarget) auf die Min.Rückl.Solltemp. (z.B. 15°C) absenkt. Bei Luft-Wasser-Wärmepumpen wird die Rücklaufsolltemperatur auf 20°C angehoben, sobald die Außentemperatur (ambientTemperature) 10°C unterschreitet.
Die Mitteltemperatur ist laut Handbuch der Durchschnitt der Außentemperatur der letzten 24 Stunden. Tatsächlich wird sie aber einmal pro Stunde aus einem reduzierten Mittelwert der letzten 11 Stunden gebildet.

Beim Unterschreiten der Solltemperatur startet der Heizvorgang (Frostschutz).

Empfehlung für die Heizgrenze:

Altbau: 15°C
Neubau: 12°C
Passivhaus: 10°C
Pumpenoptimierung
Der Stromverbrauch einer durchgängig laufenden normalen Heizungsumwälzpumpe beträgt mehrere kWh pro Tag. Damit kann er in der Übergangszeit sogar im Bereich des Stromverbrauches des Verdichters liegen (z.B. 5 kWh/Tag). Durch den Einsatz engergiesparender Pumpen kann man ihn reduzieren. Die Funktion Pumpenoptimierung ist eine zusätzliche Möglichkeit, um durch bedarfsgesteuertes Abschalten der Heizungsumwälzpumpe Strom zu sparen.

Es gibt verschiedene Stufen:

Liegt die Rücklauftemperatur 30 Minuten nach Ende des Heizvorganges noch über dem Sollwert (ohne Hysterese), so wird die Heizungspumpe für 30 min abgeschaltet.
Liegt die Rücklauftemperatur nach Ende des Heizvorganges für die Dauer der Pumpenoptim.Zeit oberhalb des Sollwertes, so wird die Heizungspumpe abgeschaltet. Danach wird alle 30 Minuten wieder für 5 Minuten eingeschaltet, um die aktuelle Rücklauftemperatur des Heizungskreislaufes zu ermitteln. Liegt die Rücklauftemperatur nach den 5 Minuten unterhalb des Sollwertes so läuft die Heizungspumpe wieder dauerhaft.
Sobald die Außentemperatur über der Rücklauf-Solltemperatur liegt, wird die Heizungspumpe dauerhaft abgeschaltet. Um ein Festsitzen der Pumpe zu vermeiden, wird sie alle 150 Stunden für eine Minute wieder eingeschaltet.
Die Pumpenoptimierung läuft nicht bei Außentemperaturen unter +1,0°C, um das Einfrieren von außen-aufgestellten Anlagen zu verhindern. Während der EVU-Sperre steht auch die Heizungsumwälzpumpe. Nach deren Ende läuft die Heizungsumwälzpumpe erst 5 Minuten ehe die Rücklauftemperatur ausgewertet wird.

Die Pumpenoptimierungszeit sollte möglichst klein gewählt werden, wenn eine Fussbodenheizung ohne Einzelraumregler betrieben wird und Räume unterschiedliche Temperaturen haben sollen, da sonst nach Abschalten der Wärmepumpe die wärmeren Räume schneller abkühlen und dabei die kälteren aufheizen.

Firmware
Firmware Bugs und Eigentümlichkeiten

- bitte mit eigenen Beobachtungen ergänzen -

Lfd-Nr. 1
Die Warmwassererwärmung führt zu einer starken Erhöhung der Temperatur im Heizkreislauf-Wärmetauscher der Wärmepumpe. Nach dem Zurückschalten auf den Heizungsbetrieb, speist der Puffer bis zur Abkühlung erstmal mit einer sehr hohen Temperatur in den Heizungskreislauf ein und verfälscht dadurch die Rücklauftemperatur stark. Die Heizungspumpe läuft zwar 2 Minuten nach aber in dieser Zeit wird die überhöhte Wärmetauschertemperatur nicht abgebaut. Bei eingeschalteter Pumpenoptimierung führt dies zu zu einer Zwangspause von entweder 30 Minuten oder bis der Temperaturfühler an der Rücklaufleitung durch den normalen Wärmeverlust unterhalb der Solltemperatur abgekühlt ist.

Lfd-Nr. 2
Über das Webinterface kann man teilweise keine Ferienzeit von wenigen Tagen auswählen. Wurde in den aktuelleren Firmwareversionen behoben.

Lfd-Nr. 3
Mittlere Außentemperatur wird nicht über die letzten 24 h bestimmt.

Lfd-Nr. 4 (Luft-Wasser-Wärmepumpen)
Die Berücksichtigung der Natur-Luftabtauung (ohne Ventilator) von 1s/1min ist viel zu gering. Das müßte höher sein.

Lfd-Nr. 5 (Luft-Wasser-Wärmepumpen)
Nach dem Heizungstakt könnte problemlos ein Luftabtauen erfolgen, damit für den nächsten Heizungstakt wieder an abgetauter Verdampfer zu Verfügung steht.

Lfd-Nr. 6 (Luft-Wasser-Wärmepumpen)
Nach einer Luftabtauung wird der Heiztakt nicht zu Ende geführt, sondern erst wieder beim Unterschreiten der unteren Hysterese gestartet. Dadurch bleibt die Rücklauftemperatur eventuell dauerhaft unterhalb der Solltemperatur und die Raumtemperatur sinkt mit der Zeit ab.

Lfd-Nr. 7 (Luft-Wasser-Wärmepumpen)
Fällt das Kreisumlaufabtauen auf das Ende des Heizzykluses so startet die Wärmepumpe nicht erneut. Der auf über 30°C erhitzte Wärmetauscher erwärmt nun die Luft in der Wärmepumpe. Bei Erreichen wird der Luftabtaugrenze wird der Ablauftimer auf den Mindestwert gesetzt und verliert die beim Kreisumkehr-Abtauen automatisch bestimmte höhere Ablaufzeit (meist in der Nähe der Maximalzeit).

Lfd-Nr. 8 (Luft-Wasser-Wärmepumpen)
Fällt das Kreisumlaufabtauen auf das Ende des Heizzykluses so startet die Wärmepumpe erstmal nicht erneut. Durch die Kreisumkehr wurde jedoch ein Schub kalten Wassers im Heizungskreislauf gefangen. Dieser führt dann sehr schnell zu einem Absinken der Rücklauftemperatur und zu einem Neustart der Wärmepumpe.

Lfd-Nr. 9 (Luft-Wasser-Wärmepumpen)
Das "natürliche" Abtauen wird nicht erkannt. Kommte die Wärmepumpe vor dem Ende der Abtauablaufzeit zum Stehen, so taut der Verdampfer bei positiven Umgebungstemperaturen von ganz alleine ab. Dies kann man Problemlos an der Temperatur Wärmequelle Aus erkennen, da diese durch die Schmelzenthalphie solange bei 0°C bleibt bis der Verdamper abtaut ist. Dann steigt sie auf die Höhe der Außentemperatur.

Lfd-Nr. 10 (Luft-Wasser-Wärmepumpen)
Während des Abtauens durch Kreisumlauf wird dem Heizungskreislauf Wärme entzogen. Der Wärmemengen-Zähler zählt jedoch nicht rückwärts. Deshalb ist die von der Wärmepumpe ins Heizsystem eingebrachte Wärmemenge nicht korrekt. Tatsächlich wird ca. 5 % weniger Energie eingebracht und die Arbeitszahl ist ebenfalls ca. 5 % niedriger.

Nützliche Links
aktuelle Firmware
Die aktuelle Firmware gibt es hier

Status Codes
Hier gibt es eine Seite mit einer ausführlichen Liste von Status Codes

Java-Schnittstelle
Eine Beschreibung der Java-Schnittstelle gibt es hier.

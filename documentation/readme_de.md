## Konfiguration der Adapter-Instanz

Nach der Installation des Adapters öffnet sich die Konfigurationsoberfläche. Diese ist in verschiedene Reiter (Tabs) unterteilt, um die Einrichtung so übersichtlich wie möglich zu gestalten.

### 1. Reiter: Verbindung

Auf dieser Seite werden die grundlegenden Netzwerkeinstellungen für die Kommunikation mit der Luxtronik-Steuerung vorgenommen sowie die Anzeigesprache des Adapters festgelegt.

#### Verbindungseinstellungen

- **IP-Adresse (Host):** Trage hier die lokale IP-Adresse deiner Wärmepumpe in deinem Netzwerk ein (z. B. `192.168.178.12`).
- **Wärmepumpen Port:** Der Kommunikationsport der Steuerung.
    - `8889` = Standard-Port für die klassische TCP-Kommunikation (oft bei Firmware V2.x).
    - `8214` = WebSocket-Port (wird in der Regel für neuere Anlagen ab Firmware V3.81x benötigt).
- **Abfrageintervall (Sekunden):** Gibt an, in welchem zeitlichen Abstand der Adapter neue Messwerte und Parameter von der Wärmepumpe abruft (Standard: 45 Sekunden).

> 💡 **WICHTIGER TIPP ZUM ABFRAGEINTERVALL:**
> Wähle diesen Wert **nicht zu gering**! Ein zu schnelles Polling (z. B. alle 10 Sekunden) flutet den internen Prozessor der Luxtronik-Steuerung permanent mit Anfragen. Dies führt dazu, dass die CPU der Wärmepumpe stark ausgelastet wird und die Steuerung (sowohl am Touch-Display als auch im Netzwerk) extrem träge reagiert. Empfohlen sind Werte zwischen 45 und 60 Sekunden.

---

#### Optionen

- **Sprache für Texte und Werte:** Diese Einstellung legt fest, in welcher Sprache die textbasierten Zustände und Betriebsmodi in die ioBroker-Datenpunkte geschrieben werden. Der Adapter übersetzt die Zahlencodes der Anlage dann automatisch in lesbaren Text.

_Beispiel: Wenn die Wärmepumpe Wasser aufheizt, schreibt der Adapter je nach Auswahl entweder `Warmwasser` (Deutsch) oder `Hot water` (Englisch) in den Objektbaum._

![Beispiel für übersetzte Werte im ioBroker Objektbaum](./admin/img/Objekte.png)

### 2. Reiter: Takt-Optimierung

Standardmäßig behandelt die Luxtronik-Steuerung Heiz- und Warmwassertakte strikt getrennt. Dies führt oft dazu, dass der Verdichter nach der Warmwasserbereitung stoppt, nur um kurz darauf für einen Heiztakt wieder anzulaufen (erhöhter Verschleiß). Dieser Adapter koppelt die Vorgänge intelligent, sodass der Verdichter nahtlos und effizient in einem einzigen Takt durchläuft.

- **Intelligente Takt-Optimierung aktivieren:** Schaltet die übergreifende Logik zur Vermeidung von unnötigen Verdichter-Stopps ein.
    - **Auslöser-Regel (Vorzündung):** Wenn das Warmwasser abkühlt `(WW Soll - WW Ist ≥ WW Hysterese - 1,5 K)` **UND** gleichzeitig Heizbedarf besteht `(Rücklauf Ist ≤ Rücklauf Soll)` sowie die Sommer-Heizgrenze nicht aktiv ist, greift der Adapter ein.
    - **Aktion:** Der Adapter startet direkt den Heizbetrieb und setzt den Rücklauf-Sollwert temporär auf 35°C, um das sofortige Anlaufen des Verdichters zu erzwingen. Wenn die Anlage kurz darauf auf Warmwasser umschaltet, läuft der Verdichter einfach weiter.
- **Heizen nach Warmwasser erzwingen:** Wenn aktiv, prüft der Adapter das System auch _nach_ einem Warmwassertakt. Der Rücklauf-Sollwert bleibt auf 35°C angehoben, damit der Verdichter nach der Warmwasserbereitung nicht abschaltet, sondern sofort den Heiztakt fortsetzt.

> **⚠️ Wichtiger Hinweis:**
> Wenn du diese Takt-Optimierung nutzt, wird **dringend empfohlen**, im Reiter _"Leerlauf"_ die Option _"Standardwerte im Leerlauf erzwingen"_ zu aktivieren. Nur so ist garantiert, dass der temporär manipulierte 35°C-Sollwert am Ende des Taktes wieder sauber auf deine normalen Heizungs-Werte zurückgesetzt wird!

![Beispiel für die Taktoptimierung](./admin/img/Takt_Optimierung_de.svg)

### 3. Reiter: Leerlauf (Hardware-Schutz)

Die Luxtronik-Steuerung speichert geänderte Parameter in einem internen Flash-Speicher, der nur eine begrenzte Anzahl an Schreibzyklen verträgt (EEPROM Flash Wear). Um diesen Speicher zu schonen, greift der Adapter schreibend nur dann ein, wenn die Anlage aktiv läuft (Heizen oder Warmwasser).

Sobald die Wärmepumpe in den **Leerlauf (Standby)** wechselt, ist die Optimierung beendet. Um zu verhindern, dass die Anlage mit temporären (veränderten) Parametern aus der Optimierung weiterläuft, zwingt der Adapter die Steuerung zurück in einen sicheren Ausgangszustand.

> **💡 Dringende Empfehlung:**
> Wenn du die **intelligente Takt-Optimierung** (Kopplung von Warmwasser und Heizung) und/oder die **dynamische HUP-Steuerung** nutzt, solltest du das Setzen der Standardwerte im Leerlauf unbedingt aktivieren! Nur so ist garantiert, dass die Anlage nach einem Eingriff des Adapters wieder exakt mit deinen originalen Wunschwerten weiterarbeitet.

- **Vorgabewerte:** Trage hier zwingend die exakten Original-Vorgabewerte deiner Heizung ein (z. B. Standard-Hysterese für Heizen/Warmwasser, Fußpunkt, Endpunkt und Pumpenspannungen).
- **Visuelle Heizkurve:** Zur besseren Orientierung generiert der Adapter live eine grafische Vorschau deiner Heizkurve (Rücklauf-Soll), sobald du Fuß- und Endpunkt einträgst. _(Ein großes Dankeschön an [mnemotron.de](https://www.mnemotron.de/lux/heatcurve.html) für die Inspiration zu dieser Darstellung!)_

### 4. Reiter: Heizumwälzpumpe (HUP)

Die Heizumwälzpumpe (HUP) befördert das warme Wasser von der Wärmepumpe in deinen Heizkreis. Eine feste Pumpenleistung ist jedoch ineffizient: Ist sie zu hoch, rauscht das Wasser zu schnell durch die Rohre und kann die Wärme nicht optimal an den Raum abgeben. Ist sie zu niedrig, kühlt das Wasser zu stark ab und die Wärmepumpe verliert an Effizienz.

Dieser Adapter löst das Problem über eine **dynamische Steuerung anhand der Temperaturspreizung** (Differenz zwischen Vorlauf und Rücklauf). Die Steuerspannung der Pumpe wird während eines Heiztaktes in regelmäßigen Abständen in winzigen Schritten erhöht oder verringert, um immer genau im perfekten Zielbereich zu bleiben.

> **⚠️ Wichtige Voraussetzungen (Bitte vor Aktivierung prüfen!)**
>
> 1. **Hardware-Kompatibilität:** Nutze diese Funktion nur, wenn deine Umwälzpumpe wirklich über ein Steuerkabel (0-10V oder PWM) an die Luxtronik-Platine angeschlossen ist! Besitzt du eine Pumpe, die den Volumenstrom eigenständig regelt (z. B. eine _Grundfos ALPHA2 AutoAdapt_ auf Stellung "Auto"), darfst du die Funktion **nicht** aktivieren. Andernfalls würden der Adapter und die Pumpe permanent gegeneinander regeln.
> 2. **Spannungsfaktor (Firmware):** Ältere V2.x-Firmwares erwarten die Steuerspannung in einem anderen Datenformat als neuere V3.x-Firmwares (z. B. bei der LWCV 82). Wähle in der Konfiguration zwingend den richtigen Hardware-Faktor für deine Anlage aus (`100` für V2.x vs. `10` für V3.x).
> 3. **Sicherheits-Reset (Leerlauf):** Aktiviere unbedingt die Funktion _"Standardwerte im Leerlauf erzwingen"_ im Reiter "Leerlauf". Dadurch fällt die Pumpe nach Ende des Heiztaktes wieder auf ihre feste Standardspannung zurück, anstatt auf dem manipulierten Wert stehen zu bleiben.

#### Konfiguration deiner Anlage

Die optimale Temperaturspreizung ist für jedes Haus extrem individuell und hängt vom Heizsystem ab:

- **Fußbodenheizung (FBH):** Arbeitet mit viel Wasser und niedrigen Temperaturen. Hier sind **3 bis 5 Kelvin** Spreizung oft optimal.
- **Heizkörper (Radiatoren):** Benötigen höhere Vorlauftemperaturen und kühlen im Raum stärker ab. Hier rechnet man meist mit **7 bis 10 Kelvin** Spreizung.

Trage unter _Minimum/Maximum Spreizung_ die für dein System passenden Grenzwerte ein. Der Adapter wird dann alle _X Minuten_ (Einstellintervall) prüfen, ob die Spreizung noch im Zielkorridor liegt. Ist die Spreizung zu gering (Wasser fließt zu schnell), wird die Pumpenspannung um die eingestellte _Schrittgröße_ (z. B. 0,25 V) verringert. Ist die Spreizung zu hoch, wird sie sanft erhöht.

![Beispiel für die HUP-Optimierung](./admin/img/HUP_Optimierung_de.svg)

## Aktionen & Automatisierungen (folder: Aktionen)

Der Adapter stellt im ioBroker-Objektbaum steuerbare Datenpunkte zur Verfügung:

1. Intelligente Takt-Optimierung (Regelung_Aktiv)
   Bei aktiver Regelung reduziert der Adapter die Anzahl der Starts durch Kombination von Zyklen:

- **Kombinierter Takt**: Steht die Warmwasserbereitung zeitnah an und es besteht Heizbedarf, wird der Heizzyklus vorgezogen.

- **Heizen nach Warmwasser**: Nach einer Speicherladung wird die Funktion Heizen nach Warmwasser temporär aktiviert. Die Heizung läuft weiter, bis die gewünschte Rücklauftemperatur zuzüglich Hysterese erreicht ist.

- Nach Abschluss des kombinierten Taktes (Wechsel in den Leerlauf) setzt der Adapter alle veränderten Parameter auf die definierten Vorgabewerte zurück.

2. **Aktion** Zwangsheizen (Zwangsheizen)
   Prüft, ob sich die Anlage im Leerlauf befindet. Ist die aktuelle Rücklauftemperatur geringer als der Sollwert plus Hysterese, wird der Fußpunkt der Heizkurve temporär auf 35 °C angehoben, um einen Heiztakt auszulösen.

3. **Aktion** Zwangswarmwasser (Zwangswarmwasser)
   Prüft, ob die Warmwasser-Ist-Temperatur mindestens 1 K unter dem Sollwert liegt. Ist dies der Fall, wird die Warmwasser-Hysterese auf 1 K reduziert, um die Aufheizung zu starten.

4. **Aktion** Zirkulation triggern (Activate_Zip)
   Startet die Zirkulationspumpe für die in der Konfiguration festgelegte Dauer (zip_aktiv). Befindet sich die Warmwassertemperatur bereits über dem Sollwert, nutzt der Adapter hilfsweise das interne Entlüftungsprogramm der Wärmepumpe, um die Zirkulation auszulösen, ohne bestehende Zeitprogramme zu überschreiben.
   Befindet sich die LWP nicht im Leerlauf wird die aktive Tablle für die Zirkulation angepasst und nach Ablauf wieder auf die vorherigen Werte zurückgesetzt.

## Erweiterte Integrationen & Überwachung

1. Bewegungsmelder-Kopplung (Smart-ZIP)
   Der Adapter bietet die Möglichkeit, ioBroker-Bewegungssensoren (z. B. im Badezimmer) direkt über die Konfigurationsoberfläche zu verknüpfen, um die Zirkulationspumpe bedarfsgerecht zu steuern.

- **Funktionsweise**: Registriert der Adapter eine Bewegung an einem abonnierten Sensor, wird geprüft, ob die Zirkulationspumpe bereits physisch läuft.

- **Sperrzeit-Logik**: Um ein permanentes Takten der Pumpe bei kontinuierlicher Bewegung zu verhindern, wird die in der Konfiguration hinterlegte Sperrzeit (Standard: 10 Minuten) abgeglichen. Ist diese seit dem letzten Lauf verstrichen, wird das Makro Activate_Zip automatisch ausgelöst.

2. Fehler-Benachrichtigungen (Alarm-Management)
   Der Adapter überwacht kontinuierlich den Fehlerspeicher der Luxtronik-Steuerung und vergleicht die Zeitstempel der hinterlegten Codes. Tritt eine neue Störung auf, stellt das System zwei Alarmierungswege zur Verfügung:

- **ioBroker Benachrichtigungszentrale**: Der Fehler wird nativ an das ioBroker-System übergeben und in der Kategorie lwpError (System-Glocke) hinterlegt.

- **Telegram-Integration**: Sofern konfiguriert, sendet der Adapter eine formatierte Nachricht (inkl. Fehlercode, Klartextbeschreibung und Zeitstempel) direkt an die angegebene Telegram-Instanz.

- **Test-Funktion**: Über den Button in den Adapter-Einstellungen kann jederzeit ein Test-Alarm ausgelöst werden. Dieser liest den historischen Fehlerspeicher aus und simuliert den reibungslosen Versand über die konfigurierten Kanäle.

## Eigene Werte anlegen (Custom States)

Zusätzliche Datenpunkte der Luxtronik-Steuerung können manuell eingebunden werden:

1. Öffne die Adapter-Einstellungen und wechsle zu **Benutzerdefinierte Datenpunkte**.

2. Füge einen neuen Eintrag hinzu.

3. Trage die entsprechende **Luxtronik ID (Index)** ein.

4. Wähle die Datenquelle:
    - Messwert (rawValues): Lesezugriff für Sensordaten (Index 3004).

    - Parameter (rawParams): Lese- und Schreibzugriff für Einstellungen (Index 3003).

5. Definiere den Namen und den gewünschten Datentyp (Zahl, Text, Boolean, oder Datum/Uhrzeit).

6. Nach dem Speichern wird der Datenpunkt im Verzeichnis Benutzer angelegt.

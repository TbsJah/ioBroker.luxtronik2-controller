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

![Beispiel für übersetzte Werte im ioBroker Objektbaum](./admin/img/language_example.png)
_(Ersetze diesen Platzhalter-Pfad mit dem echten Pfad zu deinem Screenshotbild in deinem Repository)_

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

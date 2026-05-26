# Distill Voice – Projektregeln

## Pflichtregeln bei jeder Änderung

Bei JEDER Änderung an einer Datei (egal wie klein) IMMER folgendes tun:

1. **Versionsnummer erhöhen** – Badge im Header (`index.html`) hochzählen: v3.x → v3.x+1
2. **Changelog-Eintrag** – In `index.html` einen neuen `cl-entry` Block VOR dem letzten Eintrag einfügen
3. **Systemarchitektur** – Bei strukturellen Änderungen (neue Dateien, neue APIs) `renderArchView()` in `ui.js` aktualisieren

## Aktuelle Version
v3.3 (Stand: 26.05.2026)

## Projektübersicht
- **App-Name:** Distill Voice
- **GitHub:** dndesi/Transkriptions-Dashboard-Cloud
- **Stack:** Vanilla JS, HTML, CSS – kein Build-Tool, kein Framework
- **Hosting:** GitHub Pages
- **KI-Modell:** claude-sonnet-4-6
- **Externe Dienste:** AssemblyAI, Google Drive, Google Calendar, Gmail

## Dateistruktur
- `js/config.js` – State, API-Keys, OAuth-Scopes, Preise
- `js/app.js` – Init, Theme, Schritte
- `js/ui.js` – Browser, Systemarchitektur, Kostenübersicht
- `js/claude.js` – KI-Analyse, callClaudeAPI, extractJSON
- `js/assemblyai.js` – Transkription, Bereinigung
- `js/drive.js` – Google Drive OAuth + Speicherung
- `js/features.js` – 360°, Ask Your Recording, Mind Map, Vorlagen
- `js/search.js` – Globale Suche
- `js/calendar.js` – Google Calendar + Gmail
- `js/persons.js` – Personen-Profile, Kostenübersicht
- `js/recorder.js` – Audio-Aufnahme

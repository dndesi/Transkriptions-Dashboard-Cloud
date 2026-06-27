# Distill Voice – CLAUDE.md
> Pflichtlektüre vor jeder Coding-Session. Bei jeder Versionsänderung aktualisieren.

## Aktuelle Version
**v5.89** (Stand: 27.06.2026)

## Pflichtregeln bei jeder Änderung (IMMER, keine Ausnahme)
1. Versionsnummer in `index.html` erhöhen (Header-Badge + alle `?v=X.XX` Script-Tags)
2. Changelog-Eintrag in `index.html` einfügen (vor dem vorherigen Eintrag)
3. `renderArchView()` in `ui.js` aktualisieren – Versionsnummer + neue Features/Module
4. Diese `CLAUDE.md` aktualisieren – Version + Architektur-Änderungen
5. Git-Befehl am Ende automatisch anzeigen
6. Erst Plan erklären, dann auf Daniels Go warten – NIEMALS direkt loslegen

## Projektübersicht
- **App-Name:** Distill Voice (ehemals Transkriptions-Dashboard-Cloud)
- **GitHub:** dndesi/Transkriptions-Dashboard-Cloud
- **Hosting:** GitHub Pages · `dndesi.github.io/Transkriptions-Dashboard-Cloud/`
- **Stack:** Vanilla JS (ES2022), HTML5, CSS Custom Properties – kein Framework, kein Build-Step
- **KI-Modell:** claude-sonnet-4-6 (Browser-Fetch, direkt)
- **Speicher:** IndexedDB (Sessions + Projekte via `storage.js`), localStorage (API-Keys, Prompts, Theme)

## JS-Module (23 Dateien)
| Datei | Aufgabe |
|---|---|
| `app.js` | Initialisierung, Theme, Drag & Drop |
| `config.js` | Globaler State: API-Keys, Sessions[], Drive-Token, Preise |
| `storage.js` | IndexedDB: initStorage(), saveSessions(), saveProjects(), Auto-Migration |
| `auth.js` | Google OAuth 2.0 (GIS), progressive Auth, Werbeblocker-Fallback |
| `claude.js` | KI-Analyse, _buildFollowUpContext(), askFollowUp(), Präsentation, Anonymisierung |
| `assemblyai.js` | Transkription, Speaker Diarization, EU-Endpunkt |
| `recorder.js` | MediaRecorder API, Mikrofon, WebM |
| `drive.js` | Google Drive API v3, Session-JSON speichern/laden/löschen |
| `sessions.js` | Session-Verwaltung, Analyse-Felder editieren/speichern |
| `features.js` | Gesprächs-Chat, 360°, Mind Map (D3.js v7), Rollen-Logik, populatePersonaSelects() |
| `projects.js` | Projektarbeit, Projekt-Assistent, _buildProjectAnalysisContext() |
| `prompts.js` | Prompt-Bibliothek: System/Standard/Feature/Eigene/Rollen, assemblePromptText() |
| `ui.js` | Rendering, Sidenav, Systemarchitektur-Seite, renderArchView() |
| `search.js` | Globale Suche (Text + Claude-Semantiksuche) |
| `calendar.js` | Google Calendar API v3, Gmail API v1 |
| `persons.js` | Personen-Profile, Beziehungskontext, Kosten |
| `contacts.js` | Kontakte-Ebene über Projekten |
| `audio.js` | Audio-Player, Sync zu Utterances, Zeitstrahl |
| `tags.js` | Tag-System, Chips-UI, Filter |
| `notes.js` | Notizen pro Sitzung, Auto-Save |
| `import.js` | Samsung-Transcript, Plain Text, PDF.js – Multi-File |
| `photos.js` | Foto-Upload, Komprimierung, Claude-Bildanalyse |
| `icons.js` | Inline Lucide SVG via icon(), kein CDN |

## Kontext-Aufbau der drei Assistenten
Alle drei nutzen dieselben Rollen via `populatePersonaSelects()` (features.js).
Der Unterschied liegt AUSSCHLIESSLICH im Kontext, der an Claude übergeben wird.

| Assistent | Datei | Kontext-Funktion | Was wird mitgegeben? |
|---|---|---|---|
| Gesprächs-Chat | `features.js` | direkt | Rohes Transkript der aktuellen Sitzung |
| Analyse-Chat (Folgegespräch) | `claude.js` | `_buildFollowUpContext(session)` | Alle Analyse-Felder + eigene Prompt-Ergebnisse (session.customResults) – KEIN Rohtranskript |
| Projekt-Assistent | `projects.js` | `_buildProjectAnalysisContext(projectId, question)` | v5.87: Session-Name erkannt → nur diese, kein Limit · Fallback: alle Sitzungen, max 100k Zeichen, neueste zuerst |

## Rollen-System
- Rollen = Prompts mit `category === 'rolle'` in der Prompt-Bibliothek
- Aufbau via `_buildRoleSystemPrompt(promptId)` in `features.js`
- Felder: Rolle, Tonalität, Grenzen, Kontext/Prompt-Text
- Built-in Rollen in `EDITABLE_PROMPT_DEFAULTS`, Custom-Rollen in localStorage

## Datenschutz (DSGVO)
- Vor jedem Claude-API-Call: `anonymizeText()` → API → `deanonymizeText()`
- API-Keys verlassen den Browser nie (localStorage only)
- Session-Daten in persönlicher Google Drive des Nutzers

## Externe Dienste
- **AssemblyAI** – Transkription (EU-Endpunkt, REST API v2)
- **Claude Sonnet** – `claude-sonnet-4-6` via Browser-Fetch
- **Google Drive API v3** – Session-Archiv als JSON
- **Google Calendar API v3** – Termine eintragen
- **Gmail API v1** – E-Mail-Entwürfe (Base64url)
- **Cloudflare Worker** – CORS-Proxy für DELETE-Requests (optional)

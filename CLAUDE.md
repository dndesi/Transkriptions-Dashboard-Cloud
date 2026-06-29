# Distill Voice – CLAUDE.md
> Pflichtlektüre vor jeder Coding-Session. Bei jeder Versionsänderung aktualisieren.

## Aktuelle Version
**v6.15** (Stand: 29.06.2026)

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

## UI-Struktur & Views
Die App hat eine **linke Sidenav** + einen **Hauptbereich** + optionale Panels.

### Sidenav-Navigation
| Nav-Button | ID | Öffnet |
|---|---|---|
| + Neue Sitzung | — | Upload-Panel (openUploadPanel) |
| Kontakte | navKontakte | contactsView |
| Projekte | navProjects | projectsView (fixed, z-index:10) |
| Sitzungen | navGrid | browserView (Timeline/Grid) |
| Kosten | navCosts | costsView |
| Prompts | navPrompts | promptsView |
| Hilfe | — | help.html (neues Tab) |
| API-Keys | — | openApiModal() |
| Architektur | navArch | archView |
| Theme | themeToggleBtn | toggleTheme() |

### Haupt-Views (im Main-Bereich)
- `heroView` — Startseite mit Hero-Banner, 4 Cards, News-Slider
- `browserView` — Session-Browser (Timeline / Grid)
- `timelineView` — Zeitstrahl nach Monat
- `costsView` — Token-Kosten-Übersicht
- `personsView` — Personen-Profile
- `contactsView` — Kontakte-Verwaltung
- `archView` — Systemarchitektur (renderArchView in ui.js)
- `promptsView` — Prompt-Bibliothek
- `projectsView` — Projektarbeit (fixed overlay)

### Session-Detail (Einzelsitzung)
Öffnet via `showTranscript()` als Overlay mit Tabs:
- Transkript / Analysen / Mindmap / Design / Notizen / Tags
- Analysen-Sub-Tabs: Gespräch / Arbeit / Stimmung / Kapitel / Themen / 360°
- **Assistent-Sidebar** (sdc-flap, `sdcFlap`): einklappbare Sidebar mit zwei Tabs:
  - **Analyse-Chat** (`followUpMessages`) — `_buildFollowUpContext()`, `followupPersonaSelect`
  - **Gesprächs-Chat** (`askChatHistory`) — Rohtranskript, `askPersonaSelect`

### Projekt-Assistent
- Fähnchen: `projAssistFlap` (sichtbar wenn Projekt-Detail geöffnet)
- Panel: `projAssistPanel` (slide-in von rechts)
- `projAssistPersonaSelect` — Rollen-Auswahl
- `projAssistHelpBox` — Info-Box zur Sitzungserkennung (v5.88)
- `projAssistContextInfo` — zeigt aktiven Modus (Gezielt / Alle)

### Upload-Panel
Slide-in Panel mit zwei Tabs:
- **Audio-Tab**: 4 Schritte (API-Key → Sitzungsname → Drive → Datei/Aufnahme)
- **Import-Tab**: Samsung/Plain Text/PDF Import, Multi-File, Sprecher benennen

### Hero News-Slider
Kacheln mit aktuellen Features, verlinken auf news.html Anker.
Aktuelle Kacheln: Rollen (v5.89), Foto-Analyse, Lesezeichen, Kontakte/Themen, Ausgabe-Felder, Design-Versionen

## Changelog-Highlights (letzte Versionen)
| Version | Datum | Feature/Fix |
|---|---|---|
| v6.15 | 29.06.2026 | Bugfix: Sitzungs-Assistent Rollen-Persistenz wiederhergestellt — per-Sitzungs-Hooks aus claude.js entfernt, globale Persistenz wieder aktiv |
| v6.14 | 29.06.2026 | Feature: Pro-Chat Rollen-Persistenz — Projekt-Assistent merkt eigene Rollen per localStorage-Key mit Projekt-ID |
| v6.13 | 29.06.2026 | Bugfix: Root-Cause-Fix Rolle im Projekt-Assistenten — Rollen-Intro aus Nutzernachricht entfernt wenn Rolle aktiv (nur kontext-Teil wird gesendet) |
| v6.12 | 29.06.2026 | Bugfix: Einzelne Rolle kennt sich selbst (Meta-Hint in System-Prompt, claude.js + projects.js) + @-Direktansprache im Projekt-Assistenten (Autocomplete-Dropdown, sendProjectChatMessage) |
| v6.11 | 29.06.2026 | Bugfix: Rollen-Persistenz im Projekt-Assistenten — save on close, double restore on open, save on send |
| v6.10 | 29.06.2026 | Bugfix: Edit-Icon (edit-2), Print pro Karte, Markdown-Parser im Print-Fenster (Tabellen korrekt) |
| v6.9 | 29.06.2026 | Feature: Chat-Gedanken bearbeiten (Stift-Icon) + Drucken/PDF-Export (sessions.js + projects.js) |
| v6.8 | 28.06.2026 | Feature: Pause/Resume Direktaufnahme + Bugfix: Button-SVG pointer-events, touch-action, Textarea z-index |
| v6.7 | 28.06.2026 | UX: Design-Links — Vorschau/Paste-Zone links, Link rechts |
| v6.6 | 28.06.2026 | Feature: Screenshot-Paste für Design-Links — Clipboard → Paste-Zone → Cmd+V → gespeichert |
| v6.5 | 28.06.2026 | Feature: Design-Inhalts-Vorschau aus version.data über gespeicherten Links |
| v6.4 | 28.06.2026 | Feature: @Rollen-Direktansprache im Analyse-Chat — Autocomplete + Single-Call |
| v6.3 | 28.06.2026 | Bugfix: 360°-Analyse als eigener Tab — render360Block() ruft _refreshAnalysenSubtabs() auf |
| v6.2 | 27.06.2026 | News: 3 Blogartikel (Chat-Gedanken, Experten-Runde, Session-Erkennung) + 3 Hero-Kacheln |
| v6.1 | 27.06.2026 | UX: Chat-Gedanken — farbige Chips, Stichpunkte, ganze Karte klickbar |
| v6.0 | 27.06.2026 | Feature: Chat-Gedanken im Projekt-Assistenten — Merken-Button + Header-Button + Karten-View |
| v5.99 | 27.06.2026 | UX: Chat-Gedanken — kein Teaser, nur Headline + Quelle als Label |
| v5.97 | 27.06.2026 | UX: Chat-Gedanken — Teaser klickbar, Details inline aufklappbar (toggleChatGedanke) |
| v5.96 | 27.06.2026 | UX: Chat-Gedanken Teaser-Liste — Frage + 120-Zeichen-Vorschau statt vollständige Antwort |
| v5.95 | 27.06.2026 | Feature: Chat-Gedanken — Merken-Button in Analyse/Gesprächs-Chat, neuer Tab, session.chatGedanken[] |
| v5.94 | 27.06.2026 | Feature: Rollen-Persistenz via localStorage (distill_analyse_rollen, distill_proj_rollen) |
| v5.93 | 27.06.2026 | Markdown-Renderer, Emoji-Verbot, Fähnchen „Sitzungs-/Projekt-Assistent", Sichtbarkeits-Fix |
| v5.92 | 27.06.2026 | Fix: Farbige Rollen-Badges im Projekt-Assistenten (m.roles + Renderer) |
| v5.91 | 27.06.2026 | Fix: Farbige Rollen-Badges in Roundtable-Antworten (_renderRoundtableAnswer) |
| v5.90 | 27.06.2026 | Experten-Runde: 3 Rollen im Analyse-Chat + Projekt-Assistent, Roundtable-Modus |
| v5.89 | 26.06.2026 | Hero News-Kachel "Rollen" eingefügt |
| v5.88 | 25.06.2026 | ? Hilfe-Icon beim Projekt-Assistenten (toggleProjAssistHelp) |
| v5.87 | 25.06.2026 | Smarte Session-Erkennung + 100k Zeichenlimit im Projekt-Assistenten |
| v5.86 | 25.06.2026 | Bugfix: Neue Prompts verschwinden nicht mehr (Merge-Strategie) |
| v5.85 | 24.06.2026 | Bugfix: Debounce-Flush vor Drive-Sync |
| v5.84 | 24.06.2026 | Bugfix: Drive-Fetch-Timeout (15s), Lade-Overlay-Timeout 20s |
| v5.83 | 23.06.2026 | Bugfix: customResults Feldnamen-Fix (entry.text, entry.promptName) |
| v5.82 | 23.06.2026 | Bugfix: Projekt-Assistent-Fähnchen nach Sitzungswechsel |
| v5.81 | 23.06.2026 | Bugfix: Projekt-Assistent schließt beim Sitzungswechsel |
| v5.80 | 23.06.2026 | Feature: Mehrere Claude Design Links pro Design-Version |

## Externe Dienste
- **AssemblyAI** – Transkription (EU-Endpunkt, REST API v2)
- **Claude Sonnet** – `claude-sonnet-4-6` via Browser-Fetch
- **Google Drive API v3** – Session-Archiv als JSON
- **Google Calendar API v3** – Termine eintragen
- **Gmail API v1** – E-Mail-Entwürfe (Base64url)
- **Cloudflare Worker** – CORS-Proxy für DELETE-Requests (optional)

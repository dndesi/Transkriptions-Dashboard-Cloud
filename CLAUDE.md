# Distill Voice – CLAUDE.md
> Pflichtlektüre vor jeder Coding-Session. Bei jeder Versionsänderung aktualisieren.

## Aktuelle Version
**v6.46** (Stand: 08.08.2026)
- Fix: Scan-Sitzungen zeigen korrekte Metadaten. Chronik + Grid zeigen "Dokument · X Seiten" statt "Ich & B · 3 min 15 s". Datenmodell: `duration: null` (kein echtes Audio), `pageCount: N` als neues Feld. Upload-Zone: "Foto(s) oder PDF auswählen". Betroffen: audio.js (renderTimeline), ui.js (renderBrowser), scan.js (startScanImport).

## v6.45 (Stand: 08.08.2026)
- Feature: PDF-Upload im Scan-Import. Scan-Tab akzeptiert jetzt auch PDFs (`accept="image/*,application/pdf"`). Neue Funktion `_pdfToImageFiles()` (scan.js) rendert jede Seite per PDF.js auf Canvas (scale 2.0 ≈ 144 dpi) und erzeugt ein JPEG — identisch zur Bildverarbeitung danach. `handleScanFileSelect()` ist jetzt async und erkennt PDFs automatisch. Rest der Pipeline (PaddleOCR/Claude Vision, Reflow, Session) bleibt unverändert. PDF.js war bereits geladen.

## v6.44 (Stand: 08.08.2026)
- Feature: Scan-Text wird zu echtem Fließtext zusammengezogen. OCR erkennt Buchseiten zeilenweise wie gedruckt – jede Druckzeile landete bisher als eigene Zeile im Text, auch mitten im Satz. Neue Funktion `_reflowOcrText()` (scan.js) zieht Zeilen zusammen, inkl. korrekter Silbentrennungs-Auflösung (Zeile endet auf "-" → Bindestrich weg, direkt anhängen statt Leerzeichen). Nummerierte Listenpunkte bleiben bewusst eigene Zeilen (sonst würden Aufzählungen verschmelzen, siehe v6.38-Test). Läuft komplett lokal, keine API. Betrifft nur neue Scans.

## v6.43 (Stand: 08.08.2026)
- Fix: Regression durch Small-Modell zurückgerollt. Lokaler Vergleichstest (gleiches Foto, außerhalb der App nachgestellt) bestätigte: Small-Modell liest bei diesem Dokument an mehreren Stellen schlechter als Tiny (z.B. "Einigkeit"→"Einigkit"), Medium-Modell (auch getestet) sogar noch schlechter und 3x langsamer. Die abgesenkte Erkennungsschwelle (0.4) war dabei NICHT die Hauptursache. Zurückgerollt auf Tiny-Modell + Standard-Schwelle 0.5. models/paddleocr/ enthält jetzt Tiny- statt Small-Dateien. Zusätzliche Einstell-Tests (Detection-Fläche, Auflösung, Padding) brachten keine Verbesserung für die eine hartnäckig fehlende Zeile – per Diagnose (isolierter Crop erneut erkannt) bestätigt: Erkennungssicherheit liegt für diese Zeile knapp an der Schwelle (~0.55), Text bleibt auch bei niedrigerer Schwelle unleserlich/falsch statt korrekt – ein Modell-Grenzfall, keine Einstellungssache. Empfehlung: Restfehler bei schwierigen Zeilen manuell im Text-Editor korrigieren.

## v6.42 (Stand: 08.08.2026)
- PaddleOCR-Modell-Dateien (Detection, Recognition, Wörterbuch) fest ins Repo vendort (models/paddleocr/, von Daniel heruntergeladen und Format-verifiziert). _getPaddleOcrService() (scan.js) lädt sie jetzt von dort statt von der externen GitHub-Quelle (PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models) – Distill Voice ist damit unabhängig von deren Fortbestand. Nur die Bibliothek selbst (Code) bleibt CDN-geladen.

## v6.41 (Stand: 08.08.2026)
- PaddleOCR: Modell-Stufe "Small" statt "Tiny" (volles Wörterbuch, robuster bei Fotos/schlechtem Licht laut PaddleOCR-eigener Empfehlung), Erkennungs-Schwelle (minimumConfidence) von 0.5 auf 0.4 gesenkt – Ursache für den bei v6.40 beobachteten komplett fehlenden Einleitungsabsatz (Seite-40-Test) war vermutlich ein unter der Schwelle verworfener Textblock. Neuer Ordner `models/paddleocr/` mit README + Download-Links angelegt (Vorbereitung fürs Modell-Vendoring, siehe Memory project_scan_import) – Daniel lädt die 3 Dateien selbst herunter, danach Umstellung von CDN auf lokale Pfade in _getPaddleOcrService() (scan.js).

## v6.40 (Stand: 08.08.2026)
- PaddleOCR jetzt Standard-Engine im Scan-Tab, Tesseract komplett entfernt (scan.js: _ocrImageTesseract() gelöscht, index.html: Tesseract.js-CDN-Script-Tag entfernt, Dropdown-Option entfernt). Grund: Test mit echtem Buchfoto (Spalten-/Label-Layout, Seite 40) zeigte PaddleOCR liest die Reihenfolge korrekt (Label + zugehörige Frage zusammen), Tesseract hat das durcheinandergebracht. Claude Vision bleibt als Alternative für Handschrift. Offen: Modell-Vendoring ins eigene Repo weiterhin nicht umgesetzt – PaddleOCR lädt sein Modell aktuell noch von externer GitHub-Quelle.

## v6.39 (Stand: 08.08.2026)
- Feature: PaddleOCR als dritte, experimentelle Scan-Engine neben Claude Vision und Tesseract (scan.js: _ocrImagePaddleOCR(), Bibliothek "ppu-paddle-ocr" + KI-Modell per CDN geladen, quelloffen/Apache-2.0, komplett lokal im Browser). Grund: Tesseract liest Spalten-/Label-Layouts oft in falscher Reihenfolge (Text als durchgehender Strom); PaddleOCR erkennt Textblöcke einzeln (Detection-Modell zuerst), sollte dadurch robuster sein. Konnte im Entwicklungs-Sandbox nicht vorab getestet werden (Netzwerk-Einschränkung dort, siehe Memory feedback_sandbox_network_limits) – als "experimentell" markiert bis Daniel es live testet. Modell-Vendoring ins eigene Repo (Daniels Wunsch wegen Abhängigkeit von externer Quelle) noch nicht umgesetzt, siehe Memory project_scan_import.

## v6.38 (Stand: 08.08.2026)
- Fix: startScanImport() (scan.js) hat den OCR-Text aller Fotos zusammengeklebt und an parsePlainText() übergeben – diese Funktion splittet an jeder Leerzeile, wodurch eine einzelne fotografierte Seite mit mehreren Absätzen/Listenpunkten fälschlich als mehrere "Seiten" angezeigt wurde. Fix: pro Foto (bzw. Bildhälfte bei Doppelseite) wird jetzt direkt genau eine Utterance/"Seite" gebaut, kein Re-Splitting mehr. css/styles.css: .utterance-text hat jetzt white-space:pre-line, damit Absätze innerhalb einer Seite weiterhin als eigene Zeilen lesbar bleiben.

## v6.37 (Stand: 08.08.2026)
- Fix: "Aufnahme"-Sektion (Audioplayer, "Audiodatei nicht verknüpft"-Warnung) und "Sprecher"-Sektion (Sprecher-A/B-Felder, "Tauschen"-Button) im Text-Tab jetzt für source==='scan_import' komplett ausgeblendet (index.html: #transkriptAufnahmeBlock/#transkriptSprecherBlock, Logik in showTranscript() claude.js). Zusätzliches Sektions-Label über der Textliste zeigt ebenfalls "Text" statt "Transkript" bei Scan-Sessions (sdcSectionTranskriptLabel).

## v6.36 (Stand: 08.08.2026)
- Fix: renderUtterances() (claude.js) zeigte im Text-Tab bei Scan-Sessions vor jedem Absatz "Ich" als Sprecher-Label inkl. Tausch-Icon und fiktivem Zeitstempel/Play-Button – irreführend ohne Dialog/Audio. Für source==='scan_import' jetzt kein Sprecher-Label mehr pro Absatz, stattdessen "Seite N"-Markierung (gleiches Muster wie MD-Export seit v6.32). Bearbeiten-Funktion bleibt unverändert (indiziert über .utterance-text, unabhängig vom Sprecher-Markup).

## v6.35 (Stand: 08.08.2026)
- Bugfix: Tesseract-Texterkennung erzeugte Wortsalat bei Fotos mit EXIF-Rotation (z.B. Handyfotos "liegend" gespeichert). _ocrImage() (Claude Vision) normalisiert das schon über _resizePhoto() (Canvas respektiert EXIF-Ausrichtung), _ocrImageTesseract() bekam das Foto bisher ungefiltert – jetzt läuft auch der Tesseract-Pfad zuerst durch _resizePhoto() (2000px statt 1600px, Tesseract profitiert stärker von Bildschärfe als ein Vision-Modell).

## v6.34 (Stand: 08.08.2026)
- Feature: Scan-Import Foto-Vorschau-Liste mit manuellem Umsortieren (▲▼-Buttons, _scanMoveFile()), Foto entfernen (×, _scanRemoveFile()) und "Zurücksetzen" (_scanResetFiles()). openScanTab() rendert die Liste jetzt beim erneuten Öffnen neu. Batch-Sortierung bei neuer Auswahl betrifft nur die neuen Dateien, nicht mehr die gesamte Liste (verhindert Überschreiben einer manuellen Umsortierung).
- Feature: Checkbox "Doppelseite" – teilt jedes Foto vor der OCR per Canvas exakt vertikal in linke/rechte Hälfte (_splitImageHalves() in scan.js), beide Hälften werden als zwei separate Seiten behandelt. Funktioniert engine-unabhängig (reine Bildvorverarbeitung).

## v6.33 (Stand: 08.08.2026)
- Fix: Scan-Import sortiert Fotos jetzt automatisch nach file.lastModified (Aufnahmezeitpunkt), bevor die Texterkennung startet – bei Mehrfachauswahl lieferte der Browser vorher oft alphabetische statt chronologische Reihenfolge. handleScanFileSelect() in scan.js sortiert _scanFiles[], neue Vorschau-Liste #scanFileList (_renderScanFileList()) zeigt die Reihenfolge vor dem Start zur Kontrolle an.

## v6.32 (Stand: 08.08.2026)
- Fix: Scan-Import MD-Export war kaputt bei mehreren Fotos – exportTranscriptMd() verschmolz alle Seiten zu einem "Ich:"-Block (Sprecher-Zusammenfassungslogik griff, da Scan-Sessions nur einen Sprecher haben). Jetzt für source==='scan_import': jede Seite eigener Absatz mit "Seite N"-Markierung statt Sprecher-Label, typ:"notiz" statt "transkript" im Frontmatter (_buildMdFrontmatter), keine Teilnehmer-Liste, Dateiname aus Sitzungsname statt "ich" (_mdFilename).
- Feature: Zweite OCR-Engine Tesseract.js (js/scan.js: _ocrImageTesseract(), CDN cdn.jsdelivr.net/npm/tesseract.js, quelloffen, läuft im Browser, kein API-Key) wählbar im Scan-Tab neben Claude Vision. Grund: Claude Vision verweigert bei umfangreicher Wiedergabe aus veröffentlichten Büchern die wortwörtliche Transkription (Copyright), Tesseract als reine Zeichenerkennung hat diese Einschränkung nicht (dafür schwächer bei Handschrift).

## v6.31 (Stand: 08.08.2026)
- Feature: Neuer Sitzungstyp "Wissen" neben Privat/Arbeit/Gedanken. Option in allen drei Upload-Tabs (sessionType/importType/scanType) + 4. Button im Session-Header-Typ-Pill (changeSessionType('wissen'), brain-Icon). Verhält sich funktional wie Privat/Arbeit (zwei Sprecher, volles Gesprächsanalyse-Schema builtin_private) – keine Logik-Änderung nötig, da checkSpeakersNamed()/analysePrivate() nur explizit auf 'gedanken' verzweigen. Icon (brain) + Farbe (Teal, sc-type-wissen) ergänzt in ui.js, audio.js, persons.js (2×), projects.js, search.js, css/styles.css.

## v6.30 (Stand: 08.08.2026)
- Vorlagen-Datenbank Korrekturen: (1) Kategorien werden über TEMPLATE_CATEGORY_LABELS_DE/_catLabelDe() (templateLibrary.js) auf Deutsch angezeigt – Chips, Karten, Sortierung; interner Schlüssel bleibt Englisch für Filter/data-cat. (2) "Als Prompt erstellen" öffnet zuerst den bestehenden Kategorie-Picker (openPromptCategoryPickerModal('library') → selectPromptCategory() → _startGeneratorFromTemplate()), damit der Nutzer die Ziel-Sektion (Analyse/Design/Foto-Analyse/Standard/Rolle) wählt, bevor der KI-Generator befüllt wird. (3) Vorlagen sind jetzt bearbeitbar (openTemplateEditModal/saveTemplateEdit, Override in localStorage distill_template_overrides) und löschbar (deleteTemplateFromLibrary, Soft-Delete in localStorage distill_hidden_templates, Confirm-Dialog nach bestehendem Muster). _effectiveTemplates() führt Basis + Overrides zusammen und blendet Gelöschtes aus – wird jetzt überall statt der rohen TEMPLATE_LIBRARY verwendet.

## v6.29 (Stand: 08.08.2026)
- Feature: Vorlagen-Datenbank in der Prompt-Bibliothek. js/templateLibrary.js (neu): TEMPLATE_LIBRARY[] – 220 eigene, umformulierte Prompt-Vorlagen-Zusammenfassungen in 15 Kategorien (General, Meeting, Speech, Call, Interview, Medical, Sales, Consulting, Education, Construction, IT & Engineering, Legal, Real Estate, Financial, Functional). prompts.js: neuer Tab "Vorlagen-Datenbank" neben "Meine Prompts" (_switchPromptsSubView, _renderTemplateLibrary, _renderLibraryResults) – filterbar nach Kategorie + Volltextsuche, sortierbar A-Z/Kategorie, Favoriten (localStorage distill_template_favorites), aufklappbare Gliederung pro Karte, "bereits verwendet"-Badge mit Link zum Prompt (abgeleitet aus sourceTemplateId, keine harte Sperre). useTemplateAsPrompt() befüllt den bestehenden KI-Modus des Prompt-Generators – Rolle/Ton/Grenzen/Kontext werden frisch generiert, nicht 1:1 übernommen.

## v6.28 (Stand: 08.08.2026)
- Feature: Scan-Import – neuer dritter Tab "Scan" im Upload-Panel. Fotos/Kamera-Aufnahmen von handschriftlichen Notizen/Dokumenten werden per Claude Vision (scan.js: _ocrImage(), OCR-Prompt für Notiz statt Dialog) zu Text erkannt, mit parsePlainText() zu einer Session zusammengefasst (mehrere Fotos = mehrseitige Notiz). session.source = 'scan_import', ein Sprecher, kein Dialog. claude.js: checkSpeakersNamed() behandelt scan_import wie Typ "gedanken". Session-Detail-Tab zeigt "Text" statt "Transkript" bei Scan-Sitzungen (sdcTabTranskriptLabel-Span, gesetzt in showTranscript()).

## v6.27 (Stand: 07.08.2026)
- Icon-Feld eigener Prompts nutzt volles Lucide-Set (~1600 Icons) statt fester 62-Icon-Liste: iconLucide() in icons.js rendert über <i data-lucide> + lucide.createIcons() (CDN bereits geladen), icon() bleibt für feste UI-Icons bestehen

## v6.26 (Stand: 06.08.2026)
- max_tokens 8192 → 32000 (claude.js) – lange Analysen wurden vorher abgeschnitten
- Freitext-Ergebnisse eigener Prompts: echtes Markdown-Rendering (_parseMarkdown) + Anker-Links ([Text](#thema-N) → _jumpToAnchor())
- Eigene Prompts duplizierbar (duplicatePromptById() in prompts.js)

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

## JS-Module (26 Dateien)
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
| `templateLibrary.js` | Vorlagen-Datenbank: TEMPLATE_LIBRARY[] – 220 Prompt-Vorlagen-Zusammenfassungen, 15 Kategorien |
| `ui.js` | Rendering, Sidenav, Systemarchitektur-Seite, renderArchView() |
| `search.js` | Globale Suche (Text + Claude-Semantiksuche + lokale Vektorsuche) |
| `embeddings.js` | Lokale Semantiksuche: Transformers.js, IDB-Cache, embSearch() |
| `calendar.js` | Google Calendar API v3, Gmail API v1 |
| `persons.js` | Personen-Profile, Beziehungskontext, Kosten |
| `contacts.js` | Kontakte-Ebene über Projekten |
| `audio.js` | Audio-Player, Sync zu Utterances, Zeitstrahl |
| `tags.js` | Tag-System, Chips-UI, Filter |
| `notes.js` | Notizen pro Sitzung, Auto-Save |
| `import.js` | Samsung-Transcript, Plain Text, PDF.js – Multi-File |
| `scan.js` | Scan-Import: Foto/Kamera → Claude Vision OCR → Session (kein Dialog, ein Sprecher) |
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
| v6.46 | 08.08.2026 | Fix: Scan-Sitzungen zeigen "Dokument · X Seiten" statt Teilnehmer/Dauer, pageCount im Datenmodell |
| v6.45 | 08.08.2026 | Feature: PDF-Upload im Scan-Import – automatische Seitenkonvertierung via PDF.js |
| v6.44 | 08.08.2026 | Feature: Scan-Text wird zu Fließtext zusammengezogen (Silbentrennung korrekt aufgelöst) |
| v6.43 | 08.08.2026 | Fix: Regression durch Small/Medium-Modell zurückgerollt, zurück auf Tiny (nachweislich bestes Ergebnis) |
| v6.42 | 08.08.2026 | PaddleOCR-Modell fest im Repo vendort (models/paddleocr/) – unabhängig von externer Quelle |
| v6.41 | 08.08.2026 | PaddleOCR: Modell "Small" statt "Tiny" + Erkennungsschwelle gesenkt, models/paddleocr/-Ordner für Vendoring vorbereitet |
| v6.40 | 08.08.2026 | PaddleOCR jetzt Standard-Engine, Tesseract entfernt (bewährt bei Spalten-/Label-Layouts) |
| v6.39 | 08.08.2026 | Feature: PaddleOCR als dritte, experimentelle Scan-Engine (Spalten/Layout-robuster als Tesseract) |
| v6.38 | 08.08.2026 | Fix: Scan-Import zählte Absätze statt Fotos als "Seiten" – jetzt 1 Foto = 1 Seite |
| v6.37 | 08.08.2026 | Fix: Scan-Notizen im Text-Tab ohne "Aufnahme"- und "Sprecher"-Bereich (kein Audio, kein zweiter Sprecher) |
| v6.36 | 08.08.2026 | Fix: Scan-Notizen im Text-Tab ohne wiederholtes "Ich"-Sprecher-Label, stattdessen "Seite N" |
| v6.35 | 08.08.2026 | Bugfix: Tesseract-Wortsalat bei EXIF-rotierten Fotos – jetzt auch über _resizePhoto() normalisiert |
| v6.34 | 08.08.2026 | Feature: Scan-Import manuelles Umsortieren/Entfernen/Zurücksetzen + Doppelseiten-Split |
| v6.33 | 08.08.2026 | Fix: Scan-Import sortiert Fotos automatisch nach Aufnahmezeitpunkt + Kontroll-Liste |
| v6.32 | 08.08.2026 | Fix: Scan-Import MD-Export (Seiten-Markierung statt "Ich"-Verschmelzung) + Tesseract.js als zweite OCR-Engine |
| v6.31 | 08.08.2026 | Feature: Neuer Sitzungstyp "Wissen" neben Privat/Arbeit/Gedanken — verhält sich wie Privat/Arbeit |
| v6.30 | 08.08.2026 | Vorlagen-Datenbank: deutsche Kategorien, Kategorie-Picker vor Prompt-Erstellung, Vorlagen bearbeiten/löschen |
| v6.29 | 08.08.2026 | Feature: Vorlagen-Datenbank — 220 Prompt-Vorlagen, filterbar (templateLibrary.js, prompts.js) |
| v6.28 | 08.08.2026 | Feature: Scan-Import — Foto/Kamera → Claude Vision OCR → Session, kein Dialog (scan.js, neuer Upload-Tab) |
| v6.25 | 03.08.2026 | Feature: Lokale Semantiksuche — Transformers.js, embeddings.js, Vektoren in IDB, kein API-Call |
| v6.24 | 01.08.2026 | Fix: MD-Überschrift — Perspektive bereinigt via _translitUmlaute() (kein & oder Sonderzeichen) |
| v6.23 | 01.08.2026 | Fix: MD-Dateiname — Teilnehmer durch Bindestrich getrennt (speakerA-speakerB statt session.label) |
| v6.22 | 01.08.2026 | Fix: MD-Export Teilnehmer — &lt;unbekannt&gt; statt ? für nicht identifizierbare Sprecher |
| v6.21 | 01.08.2026 | Fix: MD-Export SeBr-Qualität II — Perspektive sauber (nur a-z+Bindestriche), Teilnehmer unbekannt, Vorspann 1 Satz/25 Wörter, kein Duplikat |
| v6.20 | 01.08.2026 | Fix: MD-Export SeBr-Qualität — Tags (SeBr-Regeln), CodeFences, Perspektive bereinigt, Datum-Präfix im Dateinamen |
| v6.19 | 01.08.2026 | Feature: MD-Export — Transkript & Analysen als Markdown-Datei (YAML-Frontmatter, kernbefund, Second Brain) |
| v6.18 | 28.07.2026 | UX: Tooltip im Analyse-Dropdown — Kurzbeschreibung bei Mouseover (title-Attribut auf option-Element) |
| v6.17 | 26.07.2026 | Bugfix: Custom Prompt Ausgabe-Felder — extractJSON() statt regex, robust gegen ```json Wrapper und Präambel |
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

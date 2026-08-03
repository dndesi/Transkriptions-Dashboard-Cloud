# Obsidian-Leitfaden für Distill Voice

> Lebendes Dokument – wird laufend erweitert. Stand: 02.08.2026 (v1)
> Zweck: Planungsgrundlage für den Export von DiVo-Daten nach Obsidian und den Aufbau einer sinnvollen Datenstruktur/KI-Anbindung.

---

## 1. Ausgangslage – was DiVo heute schon kann

- MD-Export existiert bereits seit v6.19 (Fixes bis v6.24).
- `exportTranscriptMd()` – exportiert reines Transkript, mit YAML-Frontmatter + Kernaussage.
- `exportAnalysisMd(type)` – ein eigener MD-Button pro Analyse-Karte (Gesprächsanalyse, Arbeitsanalyse, Stimmung, Kapitel, Themen, 360°, Custom-Prompts). Jede erzeugt eine **eigene** Datei.
- Frontmatter enthält bereits: `datum`, `projekte`, `teilnehmer`, `tags`, `typ`, `perspektive`.
- Auto-Tag-Generierung beim Export, falls Sitzung noch keine Tags hat.
- Custom-Prompts unterstützen bereits GFM-Syntax: Listen, Checklisten (`- [ ]`), Tabellen (`| a | b |`).
- Dateiname-Konvention: `{datum}-{teilnehmer}-{suffix}.md` (z.B. `2026-08-02-Anna-Ben-transkript.md`).
- **Wichtig:** Namen sind beim Export bereits entanonymisiert (Klartext) – anders als bei den API-Calls innerhalb der App, die vor dem Versand anonymisiert werden.

## 2. Was aktuell fehlt (offene Bausteine für spätere Umsetzung)

- [ ] Kein „Alles auf einmal"-Export – Transkript + alle vorhandenen Analysen einer Sitzung in einer Aktion.
- [ ] Keine automatischen `[[Wikilinks]]` zu Personen/Projekten – aktuell nur Klartext.
- [ ] Keine stabile `session_id` im Frontmatter (session.id existiert im Code, wird aber nicht mitexportiert) – wichtig für robuste Zuordnung/Dataview, auch nach Umbenennung.
- [ ] Aufgaben aus der Arbeitsanalyse sind aktuell einfache Bullet-Listen, keine Checkbox-Syntax – Tasks-Plugin erkennt sie deshalb nicht.
- [ ] Keine automatische Rückverlinkung zwischen Transkript-Notiz und ihren Analyse-Notizen.

## 3. Obsidian-Grundprinzipien (Basiswissen)

- `[[Doppelte Klammern]]` = Wikilink, echte Verknüpfung zu einer Notiz (Backlinks, Graph-View).
- `[Einfache Klammern]` = YAML-Listensyntax im Frontmatter (z.B. `tags: [website, kickoff]`) – **kein** Link, nur eine Liste von Werten.
- Obsidian rendert Standard-Markdown nativ, ohne Umwandlung: Bullet-Listen, Checkboxen (`- [ ]` / `- [x]`, anklickbar), Tabellen (`| Spalte | Spalte |` mit `| --- | --- |`).
- Ordner lassen sich jederzeit nachträglich anlegen/umbenennen/verschieben. Wird das **innerhalb** Obsidian gemacht (Drag & Drop), aktualisiert Obsidian automatisch alle `[[Links]]`. Bei Verschiebung außerhalb Obsidian (z.B. Finder) können Links brechen.

## 4. Wie Transkript und Analysen miteinander verknüpft werden sollten

Aktuell erkennt Obsidian **nicht automatisch**, dass eine Analyse zu einem Transkript gehört – nur zufällige Namensähnlichkeit (gleicher Datum/Teilnehmer-Präfix im Dateinamen).

**Empfehlung:**
1. Transkript-Notiz bekommt automatisch einen Abschnitt `## Analysen` mit Links zu allen zugehörigen Auswertungen.
2. Jede Analyse-Notiz bekommt einen Link zurück zum Transkript (Frontmatter oder Kopfzeile).
3. Zusätzlich ins Frontmatter aller Dateien: `session_id: <interne session.id>` – macht die Zuordnung robust, auch bei Umbenennung/Retitel.

Nur explizite `[[Links]]` befüllen Graph-View und Backlinks-Panel – Ordnerstruktur oder ähnliche Dateinamen reichen dafür nicht aus.

## 5. Ordnerstruktur & Ablage

**Empfehlung: flach statt tief verschachtelt.**

- Kein eigener Ordner pro Sitzung (Skalierungsproblem bei 100+ Sitzungen – gleiche Lektion wie in der App selbst: Projekte sind bewusst nicht als Einzeleinträge in der Sidenav, sondern über eine Browser-Ansicht mit Filter gelöst).
- Ein Ordner pro Firma/Kontext ist sinnvoll, auch ohne Projekt-Unterordner – die Projektzugehörigkeit steckt bereits im Frontmatter-Feld `projekte` und geht dadurch nicht verloren.
- Zusätzlich empfehlenswert: hierarchische Tags wie `#projekt/website-relaunch` – Obsidian zeigt sie im Tag-Panel als aufklappbaren Baum, quasi eine "virtuelle Ordnerstruktur" ohne physische Aufteilung.

### Entscheidung: zwei getrennte Vaults statt Top-Level-Ordner (02.08.2026)

Ursprünglich war eine Top-Level-Trennung innerhalb eines Vaults angedacht (`Firma XY/` vs. `Privat/`). Entschieden wurde stattdessen: **zwei komplett getrennte Obsidian-Vaults** – eines für die Firma, eines privat.

**Gründe:**
- KI-Anfragen bleiben strukturell sauber getrennt – "ganzes Vault als Kontext laden" (z.B. Claude Projects) kann nicht versehentlich private Notizen in einen Firmen-Kontext mischen, weil physisch nur ein Vault offen ist.
- Sync/Backup lässt sich pro Vault komplett unterschiedlich konfigurieren (z.B. Firma ohne Sync oder nur über freigegebenen Dienst, Privat frei wählbar) – bei einem gemeinsamen Vault nur über Zusatzkonfiguration möglich (z.B. Obsidian Syncs "Selective Sync").
- Saubere Exit-Strategie: Firmen-Vault kann bei Jobwechsel oder Löschanfrage eines Kollegen komplett gelöscht/übergeben werden, ohne Firmendateien einzeln aus einem gemeinsamen Vault heraussuchen zu müssen.
- Suche, Quick-Switcher und Graph-View durchsuchen immer das ganze offene Vault – bei getrennten Vaults tauchen private Notizen nie in einer Firmen-Suche auf und umgekehrt.

**Nachteile, bewusst in Kauf genommen:**
- Doppelte Einrichtung (Plugins, Themes, KI-Provider-Konfiguration).
- Kein Cross-Linking zwischen privaten und Firmennotizen (hier gewollt).
- Vault-Wechsel nötig – Obsidian kann aber mehrere Vaults gleichzeitig in getrennten Fenstern offen halten, kein echtes Entweder-oder im Alltag.

Beispielstruktur (jetzt pro Vault):
```
Vault "Firma XY"/
  Distill Voice/
    2026-08-02-Anna-Ben-transkript.md
    2026-08-02-Anna-Ben-Psychologische-Analyse.md
    2026-08-02-Anna-Ben-Livecoach-Analyse.md
    2026-07-20-Anna-Ben-transkript.md
    ...

Vault "Privat"/
  Distill Voice/
    ...
```

## 6. Dataview-Plugin (Community-Plugin, nicht eingebaut)

- Installation: Einstellungen → Community-Plugins → Durchsuchen → "Dataview" → installieren → aktivieren.
- Liest Frontmatter aller Notizen im Vault und rendert daraus live Tabellen/Listen in jeder beliebigen Notiz.

Beispiel – Projekt-Übersicht:
````
```dataview
TABLE datum, teilnehmer, typ
FROM "Distill Voice"
WHERE contains(projekte, "Website Relaunch")
SORT datum DESC
```
````

Beispiel – offene Aufgaben vaultweit (setzt Checkbox-Syntax im Export voraus):
````
```dataview
TASK
FROM "Distill Voice"
WHERE !completed
```
````

Abfragen nach Tag/Frontmatter-Wert sind robuster als Abfragen nach festem Ordnerpfad (`FROM "Ordner"`), weil sie auch nach dem Verschieben von Dateien noch funktionieren.

## 7. Datenschutz (DSGVO) – zentrale Punkte

*Kein Rechtsberatung-Ersatz – bei Zweifeln fachlich prüfen lassen.*

- MD-Export enthält **echte Klarnamen** (bereits entanonymisiert) – anders als die In-App-Analyse, die vor dem API-Call anonymisiert.
- **Größtes Risiko: Firmenkontext.** Kollegendaten (v.a. mit psychologischer Analyse) außerhalb firmeneigener Systeme in einem privaten Tool zu verarbeiten, ist eine Frage von Schatten-IT und Arbeitsrecht – vor produktivem Einsatz mit Datenschutzbeauftragtem/Vorgesetztem klären.
- **Speicherort des Vaults ist der größte Hebel:**
  - Rein lokal, kein Sync → sauberste Variante, kein zusätzlicher Auftragsverarbeiter.
  - Obsidian Sync / Dropbox / iCloud / Google Drive als Sync → neuer Auftragsverarbeiter, AVV/Serverstandort prüfen.
- Exportierte Klartext-Dateien haben keine Zugriffskontrolle/Löschfunktion wie z.B. Google Drive über den DiVo-Account.

## 8. KI-Anbindung an Obsidian

### Claude
- **API** (eigener Key, wie DiVo es nutzt): kein Training mit Ein-/Ausgaben, Logs löschen sich standardmäßig nach 7 Tagen, AVV (DPA inkl. EU-SCCs) seit Januar 2026 selbstständig im Anthropic-Dashboard abschließbar.
- **Claude.ai/Claude Desktop (Consumer)**: Opt-out-Trainingsmodell (standardmäßig darf trainiert werden, außer man schaltet es in den Privatsphäre-Einstellungen ab). Bei Opt-in bis zu 5 Jahre Aufbewahrung, bei Opt-out 30 Tage. Sicherheits-markierte Unterhaltungen können unabhängig vom Opt-out fürs Training verwendet werden.
- Anbindungswege an Obsidian:
  - Community-Plugins mit eigenem API-Key (z.B. **Claudian**, **Claude Chat**/abinggo) – nutzt API-Bedingungen, nicht Consumer-Bedingungen.
  - Obsidian "Local REST API"-Plugin + MCP-Server (z.B. `mcp-obsidian`) – meist über Claude Desktop/Claude Code, läuft eher über Consumer-Konto.
  - Direkter Dateizugriff über eigenes Skript oder Claude Code (Vault = einfach ein Ordner mit .md-Dateien, kein Plugin zwingend nötig).

### Mistral (Alternative, EU-Perspektive)
- EU-ansässiges Unternehmen (Frankreich) – Datenverarbeitung standardmäßig auf EU-Infrastruktur, außerhalb der Reichweite des US CLOUD Act.
- API: kein Training mit Kundendaten, Aufbewahrung 30 Tage rollierend (nur Missbrauchserkennung).
- Obsidian-Anbindung z.B. über das generische **"AI Providers"**-Plugin (reines Konfigurations-Hub für Zugangsdaten, macht selbst keine KI-Verarbeitung – andere Plugins nutzen die hinterlegten Provider).

### Organisation/Verlinkung bleibt providerunabhängig
- Egal ob Claude oder Mistral: Weder KI hat automatisch "Anteil" an Ordnerstruktur, Links oder Frontmatter – das bleibt reine, anbieterunabhängige Textsyntax, die durch dich bzw. den Export-Code entsteht.
- Kein technischer Konflikt beim Wechsel zwischen zwei KIs im selben Vault. Das AI-Providers-Plugin schaltet nur um, an wen eine Anfrage geschickt wird.

### CLAUDE.md vs. AGENTS.md – Klarstellung
- `CLAUDE.md` ist **keine generelle Verhaltensrichtlinie**, sondern eine projektspezifische Instruktionsdatei für Coding-Agenten (Beispiel: die CLAUDE.md von DiVo selbst). Wird nur von Tools gelesen, die aktiv mit Projekt-/Vault-Dateien arbeiten (Agenten), nicht von einfachen Chat-Plugins.
- `AGENTS.md` ist der offene, anbieterübergreifende Standard (Linux Foundation), von 30+ Tools gelesen, inklusive Claude Code (per Import). Bessere Wahl, falls mehrere KI-Tools dieselbe Instruktionsdatei nutzen sollen.

## 9. Offene Entscheidungen / nächste Schritte

- [ ] Sammel-Export-Button bauen (Transkript + alle Analysen einer Sitzung, ein Klick).
- [ ] Export um automatische `[[Links]]` für Personen/Projekte erweitern.
- [ ] `session_id` ins Frontmatter aufnehmen.
- [ ] Aufgaben-Export auf Checkbox-Syntax (`- [ ]`) umstellen, für Tasks-Plugin-Kompatibilität.
- [x] Ordner-/Vault-Konvention festgelegt: zwei getrennte Vaults (Firma / Privat) statt Top-Level-Ordner – siehe Abschnitt 5. Projekt-Tags innerhalb jedes Vaults noch offen.
- [ ] Entscheidung: welches KI-Produkt für Obsidian-Abfragen (API-Key-Plugin vs. Consumer-App), evtl. Mistral wegen EU-Datenresidenz für Firmenkontext.
- [ ] Vor Firmendaten-Einsatz: Rücksprache mit Datenschutzbeauftragtem/Vorgesetztem.
- [ ] Entscheiden, ob PDF-Volltextsuche gebraucht wird (→ Omnisearch + Text Extractor installieren) – siehe Abschnitt 10.

## 10. Andere Dateitypen im Vault (Bilder, Audio, PDF)

Ein Vault ist einfach ein Ordner auf der Festplatte – nicht auf .md beschränkt. Bilder, Audio, PDF, Video lassen sich genauso reinlegen und einbinden ("Attachments").

**Einbettung – gleiche Syntax für alle Typen** (Ausrufezeichen vor dem Link):
```
![[foto.png]]
![[aufnahme.mp3]]
![[dokument.pdf]]
```
- Bilder werden inline angezeigt.
- Audio (mp3, wav, m4a, webm – deckt die Formate von `recorder.js` ab) bekommt einen eingebetteten Player mit Play/Pause direkt in der Notiz.
- PDFs werden als eingebetteter Viewer angezeigt, sogar seitengenau verlinkbar: `![[dokument.pdf#page=3]]`.

**Für DiVo konkret:** Original-Audioaufnahme, während der Sitzung hochgeladene Fotos (`photos.js`) und importierte PDFs (`import.js`) könnten direkt in die Transkript-Notiz eingebettet werden – alles an einem Ort sicht-/abspielbar.

**Graph-Vorteil:** Einbettungen sind echte Links – Audio-/PDF-/Bilddateien tauchen dadurch als eigene Knoten im Graph-View und Backlinks-Panel auf, genau wie Notiz-zu-Notiz-Links.

**Ablageort:** Einstellungen → Dateien & Links → "Standard-Speicherort für neue Anhänge". Optionen: Vault-Wurzel, fester Ordner, gleicher Ordner wie die Notiz, oder Unterordner der aktuellen Notiz. Empfehlung: "gleicher Ordner" oder ein `anhänge/`-Unterordner – bleibt nah an der zugehörigen Sitzung, kein separater Mega-Medienordner nötig.

**Wichtige Einschränkung:** Obsidians eingebaute Suche durchsucht nur .md-Dateien + Metadaten – PDF-Textinhalt oder Bild-OCR wird **nicht** automatisch mitdurchsucht. Für PDF-Volltextsuche: Plugin **Omnisearch + Text Extractor** nötig (zeigt Treffer seitengenau innerhalb der PDF).

## 11. Über mehrere Sitzungen hinweg fragen (semantische Suche / RAG)

Ziel-Beispiel: "Welche Probleme hat Thomas in den letzten Gesprächen genannt?" – eine Frage, die klassische Stichwortsuche nicht sinnvoll beantworten kann, weil sie Bedeutung statt exakter Wörter braucht.

**Fachbegriff:** Semantische Suche / RAG (Retrieval-Augmented Generation). Statt exaktem Wortabgleich versteht das System die Bedeutung der Frage, findet passende Textstellen auch bei anderer Formulierung (z.B. "Herausforderung" statt "Problem"), und eine KI fasst die Treffer zu einer Antwort mit Quellenangabe zusammen.

**Zwei führende Plugins (2026):**
- **Smart Connections** – reine semantische Suche mit lokalen Embeddings (läuft komplett auf dem eigenen Rechner, keine Cloud nötig), schnelle Quellenangaben pro Treffer.
- **Copilot for Obsidian** – "Vault QA"-Modus: echter Chat mit dem ganzen Vault, durchsucht semantisch alle relevanten Notizen und lässt eine KI die Antwort zusammenfassen, mit Links zurück zu den Quell-Notizen.

**Empfehlung:** Beide Plugins zusammen, verbunden mit einem lokalen Ollama-Modell – deckt die meisten "mit meinem Wissen chatten"-Fälle ab, ohne dass Vault-Inhalte in die Cloud gehen. Relevant wegen des Firmenkontexts (Abschnitt 7/DSGVO). Alternativ: Claude oder Mistral per eigenem API-Key als Backend einhängen statt lokalem Modell (bessere Qualität möglich, Daten verlassen dann aber das Gerät).

**Praxis-Tipp:** Die Trefferqualität hängt von der Datenqualität ab. Wenn Personen konsequent im Frontmatter (`teilnehmer`) stehen und Felder wie `risks`/`openQuestions` aus der Arbeitsanalyse mitexportiert werden, findet die semantische Suche entsprechende Inhalte zuverlässiger. Ergänzt Abschnitt 2: Personen als `[[Links]]` würden zusätzlich eine rein Obsidian-native Lösung ganz ohne KI ermöglichen (alle Notizen zu einer Person über das Backlinks-Panel).

## 12. Google Kalender & Gmail – Anbindung an Obsidian

**Google Kalender – ja, sinnvoll:**
- Plugins: "Google Calendar and Tasks Sync" (bidirektional, Google bleibt Quelle der Wahrheit), "Sync Google Calendar" (braucht Dataview), "Google Calendar" Plugin (Termine anzeigen/anlegen/bearbeiten, auto-Notiz pro Termin – aber laut Quellen aktuell unmaintained/"stale").
- Nutzen für DiVo: schließt die Gegenrichtung zum bestehenden `calendar.js` (das heute nur Termine AUS einer Analyse heraus anlegt). Offizieller Termin-Titel, vollständige Einladungsliste, Ort/Serientermin würden automatisch in Obsidian landen, ohne Handarbeit.

**Gmail – technisch möglich, aber schwach:**
- Kein offizielles Plugin mit echter Gmail-API-Integration.
- "Gmail Mailbox" (eine Notiz pro E-Mail, YAML-Frontmatter mit Absender/Empfänger/Datum/Label), "Gmail2Obsidian" (Browser-Erweiterung, manuell), oder Automatisierung über Zapier/Make/n8n (mehr Aufwand, meist kostenpflichtig).
- Einschätzung: Aufwand/Nutzen schwächer als beim Kalender, zumal DiVo den E-Mail-Entwurf-Teil (Gmail API v1) schon selbst abdeckt. Nicht priorisieren.
- Wie immer: Kalender-Einladungen und E-Mails enthalten Daten Dritter – DSGVO-Überlegung aus Abschnitt 7 gilt auch hier.

## 13. Automatisierung (n8n) & eigene Obsidian-Plugins

**Ist Obsidian offen für n8n & ähnliche Systeme?** Ja:
- Community-Plugin **"Local REST API"** öffnet eine lokale HTTP-Schnittstelle zum Vault (Notizen lesen/schreiben/verwalten). Nutzt standardmäßig ein selbstsigniertes Zertifikat (ignorieren oder in System-Vertrauensspeicher importieren).
- Fertige n8n-Community-Nodes sprechen direkt mit dieser Schnittstelle (z.B. "n8n-nodes-obsidian").
- Umgekehrte Richtung: Plugin **"obsidian-post-webhook"** schickt bei Ereignissen in Obsidian einen Webhook an n8n/Make.com/Zapier.
- Da ein Vault nur ein Ordner ist: selbst gehostetes n8n auf demselben Rechner kann notfalls auch direkt per Dateisystem arbeiten, ganz ohne Plugin.
- Konkrete Idee für DiVo: n8n erkennt neue MD-Datei im Vault-Ordner → erledigt automatisch offene Punkte aus Abschnitt 9 (Links ergänzen, session_id nachtragen), ohne das im DiVo-Export-Code selbst zu lösen.

**Kann Claude eigene Obsidian-Plugins programmieren?** Ja:
- Ein Obsidian-Plugin ist technisch ein JS/TS-Projekt (`main.js` + `manifest.json`, optional `styles.css`) über die offizielle Plugin-API – gleiche Art Arbeit wie an DiVo selbst.
- Ablauf: Vorgaben klären → Code schreiben/bauen → Ordner in `<Vault>/.obsidian/plugins/<name>/` kopieren → in Obsidian unter Community-Plugins aktivieren (Restricted Mode einmalig ausschalten).
- Keine Veröffentlichung im offiziellen Verzeichnis nötig – rein lokale Nutzung reicht, kein Freigabeprozess.
- Einschränkung: kein direkter Live-Zugriff auf die laufende Obsidian-App von hier aus – nur Code schreiben/bauen, Installation macht Daniel selbst (oder Dateien landen direkt im verbundenen Ordner, falls der Vault dort liegt).

**Wie weit lässt sich der Graph anpassen?** Drei Stufen:
1. Bordmittel ohne Plugin: Filter, Gruppen/Farben nach Suchanfrage/Tag, Node-Größe nach Linkanzahl, Kräfte (Abstoßung/Link-Stärke).
2. Fertige Plugins: **Extended Graph** (eigene Node-Formen/Bilder als Icons, Größenskalierung nach Metadaten, Filter nach Tags/Eigenschaften), **New 3D Graph** (3D-Darstellung, Färberegeln nach Pfad/Tag/Dateiname/Inhalt), **Graph Styler** (Ein-Klick-Presets, automatische Farbzuordnung).
3. Komplett eigenes Plugin: unbegrenzt – eigene Ansicht mit z.B. D3.js (wie DiVos eigenes Mind-Map-Feature), eigene Formen/Farblogik nach DiVo-spezifischen Feldern (Projekt, Perspektive), eigene Interaktionen.

## 14. Widersprüchliche Aussagen über mehrere Notizen hinweg

Beispiel: Eine Notiz sagt "Firmenfeiern am besten im Januar", eine DiVo-Auswertung sagt "Firmenfeiern immer im Sommer". Wie geht das System damit um?

**Grundtatsache: Kein System erkennt das automatisch.**
- Obsidian-Kernfunktionen und Dataview haben kein Verständnis von Bedeutung – sie speichern/listen Text, ohne Inhalte gegeneinander abzugleichen. Zwei widersprüchliche Notizen liegen einfach nebeneinander.
- Nur die KI-Ebene (semantische Suche/RAG, Abschnitt 11) kann einen Widerspruch bemerken – aber nur wenn beide Notizen zufällig zusammen in den KI-Kontext geladen werden, und nur so zuverlässig, wie sie explizit danach gefragt/angewiesen wird. Keine Garantie ohne explizite Regel.

**Regel in AGENTS.md/System-Prompt festlegen – möglich, mit Einschränkung:**
- Text wie "Bei widersprüchlichen Aussagen aus verschiedenen Notizen: beide mit Quelle/Datum anzeigen, Nutzer nach der gültigen Aussage fragen, bevor eine Antwort gegeben wird" lässt sich einfach in AGENTS.md schreiben.
- Wirkt aber nur, wenn das genutzte Tool AGENTS.md tatsächlich liest. Fertige Plugins (Smart Connections, Copilot for Obsidian) lesen diese Datei nicht automatisch – die Regel müsste zusätzlich in deren eigenes System-Prompt-Feld in den Plugin-Einstellungen eingetragen werden. Nur ein eigens gebautes Plugin (Abschnitt 13) könnte explizit so programmiert werden, dass es AGENTS.md automatisch einliest und befolgt.

**Damit die Entscheidung dauerhaft gespeichert wird – braucht mehr als eine Text-Regel:**
Konkreter Workflow-Vorschlag (als künftiges Feature/eigenes Plugin):
1. Frontmatter-Feld `status: aktuell` bzw. `status: veraltet` in jeder Notiz einführen.
2. Bei erkanntem Widerspruch: KI zeigt beide Aussagen mit Datum, Nutzer entscheidet.
3. Entscheidung wird zurückgeschrieben – veraltete Notiz bekommt `status: veraltet` + `superseded_by: [[neue Notiz]]`, gültige Notiz bekommt `status: aktuell`.
4. Vorteil des Frontmatter-Status: Auch ohne KI sofort per Dataview-Abfrage alle "veraltet" markierten Notizen samt aktueller Version auffindbar – funktioniert als Fallback, selbst wenn eine KI die Regel mal nicht befolgt.

Einordnung: Punkt 1–4 ist kein reines Konfigurationsthema, sondern ein kleiner eigener Baustein/Plugin-Feature (vgl. Abschnitt 13, "offene Entscheidungen" in Abschnitt 9).

## 15. Bewertete GitHub-Projekte (fertige Second-Brain-Umsetzungen)

Bevor etwas selbst gebaut wird: es gibt bereits fertige, klonbare Umsetzungen von Karpathys Muster (Abschnitt 11-Erweiterung). Bewertung nach Reife/Verbreitung, nicht nur Idee:

- **sturlese/hippocampus** – schlanke Umsetzung, bewusst ohne Vektor-Suche (nur `hot.md` → `index.md` → 3-5 passende Seiten + Grep-Fallback). Widerspruchs-Mechanismus deckt sich mit unserem Abschnitt 14. Sehr jung/unerprobt (0 Sterne, 8 Commits) – eher Experiment als etabliertes Tool. **Vorerst nicht weiterverfolgt** (auf Wunsch zurückgestellt).

- **kepano/obsidian-skills** (40,9k Sterne, 2,9k Forks) – von Steph Ango, dem CEO von Obsidian. Kein Wiki-System, sondern die Grundlagen-Ebene: bringt einer KI korrektes Obsidian-Markdown, Bases-Dateien, JSON-Canvas und die Obsidian-CLI bei. Offiziell, riesige Verbreitung, unabhängig von der Wiki-Frage sinnvoll als Basis.

- **AgriciDaniel/claude-obsidian** (~10k Sterne) – die laut Community "vollständigste" Umsetzung von Karpathys Muster. Deutlich ausgebauter als Hippocampus: Quellen-/Behauptungs-Register mit Vertrauens-/Aktualitäts-Bewertung pro Aussage, visuelle Wissenskarten über Obsidian Canvas, parallel-sicher (mehrere KI-Arbeiter liefern nur Entwürfe, ein Kontrolleur prüft und wendet einzeln an), installierbar als Claude-Code-Plugin über Marketplace-Befehl.

- **eugeniughelbur/obsidian-second-brain** (~3,8k Sterne) – Gegenpol zu Hippocampus: nutzt bewusst hybride semantische Suche (nicht nur Katalog+Grep), plus sich selbst überarbeitende Notizen und geplante Hintergrund-Agenten, die den Vault warten.

**Einordnung:** Diese drei (kepano, AgriciDaniel, eugeniughelbur) sind ernstzunehmender als Hippocampus – echte Community, laufende Weiterentwicklung. Falls das Thema später angegangen wird: `obsidian-skills` ohnehin als Basis installieren, unabhängig davon ob die schlanke (Hippocampus-Stil) oder ausgebaute (claude-obsidian) Variante gewählt wird.

---

*Änderungen an diesem Leitfaden bei Bedarf einfach ergänzen – neue Erkenntnisse oben in die passende Sektion, neue Themen als neue Sektion anhängen.*

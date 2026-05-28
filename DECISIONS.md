# Distill Voice – Vereinbarte Entscheidungen & Anforderungen

Dieses Dokument enthält alle technischen Entscheidungen, Regeln und geplanten Features,
die Daniel und ich besprochen und abgesegnet haben.

**Pflicht:** Dieses Dokument VOR jeder Coding-Session lesen. Beim Umsetzen gegen jeden
Punkt prüfen. Bei Widerspruch zum bestehenden Code → Code anpassen, nicht ignorieren.

---

## 1. Pflichtregeln bei JEDER Änderung

- [ ] Versionsnummer im Header-Badge erhöhen (v4.x → v4.x+1)
- [ ] Changelog-Eintrag in `index.html` VOR dem vorherigen Eintrag einfügen
- [ ] Am Ende der Session: fertigen Terminal-Block für GitHub bereitstellen

```bash
cd ~/Documents/Cloude/Plaude\ Clone/Plaude\ Clone/Transkriptions-Dashboard-Cloud
git add -A
git commit -m "feat/fix/chore: Kurzbeschreibung vX.Y"
git push origin HEAD:refs/heads/update/vX.Y
```

- Kein direkter Push auf `main` — immer Feature-Branch + PR auf GitHub

---

## 2. DSGVO – Nicht verhandelbar

### AssemblyAI (Transkription)
- **EU-Server immer als Standard** → `https://api.eu.assemblyai.com`
- In `config.js`: `assemblyBase()` gibt EU-URL zurück, umschaltbar in Settings
- **Transkripte nach Verarbeitung sofort löschen** → `deleteFromAssemblyAI()` wird nach jedem Job aufgerufen
- AssemblyAI ist DSGVO-konform (EU-Server), daher dürfen echte Namen dorthin

### Claude / Anthropic API (Analyse)
- **Claude API ist NICHT DSGVO-konform** → echte Namen dürfen nie rein
- **Anonymisierung ist immer aktiv – kein Opt-in, keine Ausnahmen**
- Pflicht-Pattern bei JEDEM Claude-API-Call:
  ```javascript
  const { forward, reverse } = buildAnonMap(session);
  const prompt = anonymizeText(rawPrompt, forward);
  const { text } = await callClaudeAPI(prompt);
  const result = deanonymizeObject(text, reverse);
  ```
- Wenn dieser Pattern in einer Funktion fehlt → Fehler, sofort korrigieren

---

## 3. Technische Parameter

| Parameter | Wert | Begründung |
|---|---|---|
| Transkript-Limit (Input) | **300.000 Zeichen** | Entspricht ~5h Gespräch; Claude Sonnet hat 200k Token Kontext (~800k Zeichen) |
| Claude Output-Limit | **8.192 Tokens** | Verhindert abgeschnittene JSON-Antworten bei vielen Kapiteln |
| Claude-Modell | **claude-sonnet-4-6** (neueste) | In `config.js` definiert |
| Icons | **Lucide Icons** | Keine Emojis im Code – werden nicht konsistent dargestellt |
| AssemblyAI Sprache | `de` (Deutsch) | Kann pro Session überschrieben werden |

> **Achtung:** `trimTranscript(transcript, X)` — X muss immer **300.000** sein.
> `max_tokens` in `callClaudeAPI` muss immer **8.192** sein.
> Niemals auf niedrigere Werte zurücksetzen.

---

## 4. Architektur-Grundsätze

- **Single-page App** — eine `index.html`, kein Build-System, kein Framework
- **Keine externen Abhängigkeiten** außer: Lucide Icons (CDN), AssemblyAI API, Claude API, Google APIs
- **Datenspeicherung ausschließlich in Google Drive** (JSON-Dateien pro Session + Audiodatei)
- **Lokaler State** nur in `localStorage` (API-Keys, Settings, Session-Cache)
- **GitHub Pages** als Hosting — alle Dateien müssen statisch lauffähig sein

---

## 5. UX / Workflow-Regeln

### Pflichtpfad vor der Analyse
1. Sprecher A benennen (Pflicht)
2. Sprecher B benennen — außer bei Typ „Gedanken" (Monolog)
3. Erst dann öffnet sich das Analyse-Modal
→ Implementiert in `openAnalyseModal()` mit `checkSpeakersNamed()`

### Mobile-First
- App muss auf dem Smartphone vollständig nutzbar sein
- Sidebar: `overflow-y: scroll`, volle Breite auf Mobile (`width: 100vw`)
- Kein Inhalt darf auf Mobile abgeschnitten oder nicht erreichbar sein
- Modale: keine `position:fixed` Hacks die Modale zerstören

### Icons
- Ausschließlich Lucide Icons (`data-lucide="..."` oder `icon()` Hilfsfunktion)
- Keine Emojis im Code — weder in HTML noch in JS-Strings

---

## 6. Kapitel-Workflow (vollständig umgesetzt ab v4.5)

Der vollständige Workflow in dieser Reihenfolge:
1. **Kapitel-Erkennung** → Claude teilt Transkript in Abschnitte (Titel, Zusammenfassung, Timestamp)
2. **Kapitel-Auswahl** → User kann Kapitel per Checkbox ab- oder auswählen, einzelne löschen
3. **Tiefenanalyse** → Pro ausgewähltem Kapitel ein eigener Claude-Call mit Kontext-Brücke (jede Analyse kennt die vorherigen Ergebnisse)
4. **Synthese** → Abschließender Claude-Call fasst alle Kapitel zu einem Gesamtbild zusammen

> Wenn an Kapitel-Logik gearbeitet wird: alle 4 Stufen prüfen, nicht nur eine.

---

## 7. Geplante Features (noch nicht umgesetzt)

### Prompt-Bibliothek (#44 + #45)
- Neue Seite/Bereich im Dashboard für eigene Analyse-Prompts
- Eigene Prompts erscheinen im Analyse-Modal als wählbare Optionen
- Prompts werden in Google Drive / localStorage gespeichert

### Personenprofile
- Pro Gesprächspartner ein Profil aufbauen über mehrere Sessions hinweg
- Psychologische Auswertungen: Kommunikationsmuster, Beziehungsqualität, Wünsche, Probleme, offene TODOs
- Wird aus mehreren Transkripten mit demselben Sprecher B aggregiert
- **Status:** Diskutiert und gewünscht — noch nicht begonnen

### Aktionen ableiten (teilweise umgesetzt)
- Aus Gesprächen automatisch Kalender-Einträge und Mails ableiten
- Google Calendar + Gmail Integration existiert bereits in `calendar.js`
- **Status:** Grundlage vorhanden — Qualität und Vollständigkeit noch prüfen

### Wissensarchiv-Export
- Export von Zusammenfassungen nach Notion oder Obsidian
- Entsteht über Zeit ein durchsuchbares persönliches Gedächtnis
- **Status:** Diskutiert — Entscheidung ob und welches Tool noch offen

### Plaud.ai-Funktionen
- Beim Projektstart wurde plaud.ai als Referenz genannt
- Noch nicht systematisch verglichen welche Features fehlen
- **Status:** Offen — bei Gelegenheit Funktionsvergleich machen

---

## 8. Was wir explizit NICHT machen

- ❌ Kein Opt-in für Anonymisierung — immer aktiv
- ❌ Kein direkter Push auf `main`
- ❌ Keine Emojis im Code
- ❌ Kein `trimTranscript` unter 100.000 Zeichen
- ❌ Keinen US-Server bei AssemblyAI als Standard
- ❌ Keine `overflow: hidden` auf der Mobile-Sidebar

---

## 9. Bekannte Probleme (behoben, zur Erinnerung)

| Problem | Ursache | Fix |
|---|---|---|
| Kapitel-Erkennung brach bei Minute 9 ab | `trimTranscript` auf 7.000 Zeichen | → 100.000 Zeichen (v4.6) |
| AssemblyAI US-Server | Kein EU-Server eingestellt | → `assemblyBase()` + EU default (v4.4) |
| Sidebar auf Mobile nicht scrollbar | `overflow: hidden` + fehlendes inneres Scroll-Element | → `overflow-y: scroll` direkt auf `aside` (v4.2) |
| Anonymisierung war Opt-in | `shouldAnonymize()` prüfte Setting | → immer aktiv, kein Check mehr |

---

*Zuletzt aktualisiert: 27.05.2026 — v4.6*

// ═══════════════════════════════════════════════════
// TEMPLATE-LIBRARY.JS – Vorlagen-Datenbank (v6.29)
// 220 eigene, umformulierte Zusammenfassungen gaengiger
// Aufnahme-Analyse-Vorlagen, nach Kategorie sortiert.
// Nutzung: Prompts.js -> "Vorlagen-Datenbank" (_renderTemplateLibrary)
// Aus einer Vorlage wird per KI-Generator ein eigener,
// vollstaendig editierbarer Prompt erstellt (kein 1:1-Uebernehmen).
// ═══════════════════════════════════════════════════

const TEMPLATE_LIBRARY = [
  {
    "id": "general__adaptive_zusammenfassung",
    "category": "General",
    "name": "Adaptive Zusammenfassung",
    "description": "Ideal für Meetings, Interviews und Vorlesungen. Liefert eine klare Zusammenfassung, die sich an den Inhalt anpasst.",
    "gliederung": [
      "Adaptive Struktur: Wählt die am besten geeignete Zusammenfassungsstruktur basierend auf dem Inhalt.",
      "Anpassung an alle Szenarien: geeignet für Meetings, Interviews, Vorlesungen usw.",
      "Tipp: Für spezielle Szenarien (z. B. medizinisch, SOAP-Vorlage) wird ein spezialisiertes Template empfohlen."
    ]
  },
  {
    "id": "general__zusammenfassung_der_argumentation_reasoning_summary",
    "category": "General",
    "name": "Zusammenfassung der Argumentation (Reasoning Summary)",
    "description": "Für transkribierte Notizen gedacht. Text einfügen, um eine schnelle, klare, inhaltlich angepasste Zusammenfassung zu erhalten.",
    "gliederung": [
      "Nutzt gängige Inferenzmodelle, um automatisch passende Zusammenfassungsstrukturen aus transkribiertem Inhalt abzuleiten.",
      "Intelligente Inferenz: wählt automatisch das optimale Inferenzschema je nach Aufgabenmerkmalen.",
      "Dynamische Optimierung: passt Inferenzpfade in Echtzeit an, um Effizienz und Genauigkeit auszubalancieren.",
      "Tipp: Für spezielle Szenarien wird ein spezialisiertes Template empfohlen."
    ]
  },
  {
    "id": "general__besprechungsnotiz",
    "category": "General",
    "name": "Besprechungsnotiz",
    "description": "Für Teams. Meeting-Infos und Themen eingeben, um strukturierte Notizen, Schlussfolgerungen und Maßnahmen zu erhalten.",
    "gliederung": [
      "Erfasst Meeting-Informationen (Datum/Uhrzeit, Ort, Teilnehmer).",
      "Gliedert Notizen nach Thema und Unterthema mit zusammenfassender Beschreibung.",
      "Listet Schlussfolgerungen je Unterthema auf.",
      "Enthält einen Abschnitt „Nächste Schritte“ mit konkreten Aufgaben."
    ]
  },
  {
    "id": "general__anrufnotiz",
    "category": "General",
    "name": "Anrufnotiz",
    "description": "Für Verkaufs- oder Support-Anrufe. Details eingeben, um eine strukturierte Zusammenfassung und nächste Schritte zu erhalten.",
    "gliederung": [
      "Erfasst Anrufinformationen (Datum/Uhrzeit, Ort, Teilnehmer).",
      "Zusammenfassung der wichtigsten Informationen des Gesprächs je Thema, mit ausführlicher Beschreibung.",
      "Abschnitt „Nächste Schritte“ mit Aufgaben."
    ]
  },
  {
    "id": "general__vortrag",
    "category": "General",
    "name": "Vortrag",
    "description": "Für Studierende und Vortragende. Grunddaten, Kernpunkte, Fragen und Aufgaben in klare Notizen überführen.",
    "gliederung": [
      "Erfasst Basisinformationen (Datum/Uhrzeit, Ort, Vortragende Person).",
      "Zusammenfassung des gesamten Vortrags.",
      "Wissenspunkte mit Unterthemen und spezifischer Beschreibung.",
      "Abschnitt für offene Fragen.",
      "Abschnitt für Aufgaben/Hausaufgaben."
    ]
  },
  {
    "id": "general__interviewnotizen",
    "category": "General",
    "name": "Interviewnotizen",
    "description": "Für Interviews. Datum, Personen, Standpunkte erfassen, dann Zusammenfassung und nächste Schritte erhalten.",
    "gliederung": [
      "Erfasst Interviewinformationen (Datum/Uhrzeit, Ort, Interviewer, interviewte Person).",
      "Standpunkte mit Unterthemen und spezifischer Beschreibung.",
      "Abschließende Schlussfolgerung des gesamten Interviews.",
      "Abschnitt „Nächste Schritte“ mit Aufgaben."
    ]
  },
  {
    "id": "general__sprachnotiz",
    "category": "General",
    "name": "Sprachnotiz",
    "description": "Für vielbeschäftigte Menschen. Notizen einsprechen und eine klare Zusammenfassung mit Aufgaben, Plänen und Ideen erhalten. Unterstützt die tägliche Reflexion.",
    "gliederung": [
      "Erfasst Datum, Uhrzeit und Thema.",
      "Erstellt aus der gesprochenen Notiz eine Zusammenfassung mit Rückblick, Plan für morgen und Inspiration des Tages.",
      "Ergänzt KI-Vorschläge/Empfehlungen zum Inhalt."
    ]
  },
  {
    "id": "general__wichtigste_punkte",
    "category": "General",
    "name": "Wichtigste Punkte",
    "description": "Für Notizen, Artikel oder Meetings. Text eingeben, um prägnante Kernpunkte je Thema für einen schnellen Überblick zu erhalten.",
    "gliederung": [
      "Gliederung nach Thema 1, Thema 2 usw.",
      "Je Thema werden die wichtigsten Punkte stichpunktartig aufgelistet."
    ]
  },
  {
    "id": "general__vollstandiges_transkript_fur_externe_verwendung",
    "category": "General",
    "name": "Vollständiges Transkript (für externe Verwendung)",
    "description": "Originalgetreue und vollständige Audio-Transkription.",
    "gliederung": [
      "Transkribiert alles Gesagte originalgetreu und vollständig, ohne Zusammenfassung, Interpretation oder Veränderung des Inhalts.",
      "Behält die exakte chronologische Reihenfolge bei und kennzeichnet nach Möglichkeit Sprecherwechsel (z. B. „Arzt:\", „Patient:\").",
      "Fügt keine Kommentare, Titel, Erklärungen, Zusammenfassungen oder Schlussfolgerungen hinzu.",
      "Muss eine vollständige, wörtliche Transkription sein, nutzbar für externe Analyse oder Archivierung.",
      "Klare, übersichtliche Formatierung, ggf. mit Zeilenumbrüchen zwischen den Wortmeldungen."
    ]
  },
  {
    "id": "general__klar_sauber_und_au_erst_detailliert",
    "category": "General",
    "name": "Klar, sauber und äußerst detailliert",
    "description": "Wandelt Anrufaufzeichnungen in Zusammenfassungen um. Extrahiert Aufgaben und Kontakte mit Tags zur leichteren Durchsicht.",
    "gliederung": [
      "Das Gespräch wird zur Aufgabenüberprüfung aufgezeichnet und erfordert eine präzise Transkription und Zusammenfassung umsetzbarer Erkenntnisse und Folgebedarfe.",
      "Ziel ist es, Aufgaben, Zusagen, Namen, Kontaktdaten, Adressen, Terminierungen oder Serviceanfragen zu identifizieren und wichtige Schlagwörter zu markieren.",
      "Schlagwörter werden mit festen Tags versehen: „ASAP\"/„dringend\" → [URGENT], „Angebot\" → [QUOTE], „nachfassen\" → [FOLLOW-UP], „zurückrufen\" → [CALLBACK], „terminieren\" → [SCHEDULING], „erledigt\" → [COMPLETED], „Problem\" → [ISSUE].",
      "Der Gesprächszusammenfassungsabschnitt bietet einen einabsätzigen Überblick über den Zweck des Anrufs.",
      "Aufgaben/Maßnahmen werden mit Beschreibung und ggf. Tag aufgelistet.",
      "Erforderliche Nachfassaktionen enthalten, mit wem und bis wann nachgefasst werden muss, inkl. [FOLLOW-UP]-Tag.",
      "Extrahierte Kerndetails kategorisieren Namen, Telefonnummern, Wohnungsnummern und Adressen."
    ]
  },
  {
    "id": "general__zusammenfassung_des_strategischen_meetings_sprecherprofil_protokollversion",
    "category": "General",
    "name": "Zusammenfassung des strategischen Meetings & Sprecherprofil (Protokollversion)",
    "description": "Wandelt Transkripte in Zusammenfassungen und Aufgaben um. Profiliert Sprecher, um Interaktionsstile hervorzuheben.",
    "gliederung": [
      "Analysiert Meeting-Transkripte, um strukturierte, protokollreife Zusammenfassungen, Sprecherprofile und KI-gestützte Empfehlungen zu erstellen.",
      "Institutioneller, klarer, neutraler Ton, geeignet für Protokolle, internes Reporting und strategische Planung – strikt auf Basis der Transkriptdaten.",
      "Struktur: Titel, Meeting-Kontext (Datum, Zeit, Format, Teilnehmer, Kurzbeschreibung), einleitender Austausch (optional), Zweck des Meetings, Hauptthemen, getroffene Entscheidungen, Folgeaktionen, offene Fragen, Sprecheranalyse, abschließende Beobachtungen zur Gruppendynamik, KI-Vorschläge für ungelöste Punkte.",
      "Formatierung: fett gedruckte Titel und Sprechernamen, Aufzählungspunkte, institutioneller Ton.",
      "Sprecheranalyse: Profilerstellung anhand von Sprache, Interaktionsstil und Kontexthinweisen (Sprechstil, Ton, wahrscheinliche Rolle, geschätztes Alter/Seniorität, Beitragsqualität, Einfluss auf die Gruppenrichtung).",
      "KI-Vorschläge identifizieren ungeklärte Themen, Aufgaben ohne klare Verantwortung sowie strategische Lücken/Risiken mit konkreten Vorschlägen.",
      "Abschnitt „Weitere Details für das Protokoll\" listet zusätzliche nützliche Punkte auf."
    ]
  },
  {
    "id": "general__uberarbeitung_einfach_klar_und_pragnant",
    "category": "General",
    "name": "Überarbeitung – einfach, klar und prägnant",
    "description": "Poliert Entwürfe zu prägnantem Text, indem Füllwörter entfernt und der Lesefluss verbessert werden – bei gleichbleibender Kernaussage.",
    "gliederung": [
      "Ziel: polierter, prägnanter und ansprechender Text, der die ursprüngliche Botschaft wirkungsvoll vermittelt.",
      "Wesentliche Informationen, Kernaussagen und Absicht bleiben erhalten.",
      "Redundanzen, unnötige Informationen und Wiederholungen werden entfernt.",
      "Sprache wird vereinfacht: Aktivformulierungen, positive Rahmung, Auflösung komplexer Sätze.",
      "Verbindungen zwischen Ideen und Absätzen werden für logischen Lesefluss gestärkt.",
      "Umständliche Formulierungen werden gekürzt, ohne die Bedeutung zu verlieren.",
      "Lesbarkeit wird durch korrekte Grammatik und prägnante Syntax optimiert.",
      "Überflüssige Elemente (Füllwörter, Nebensächliches) werden weggelassen."
    ]
  },
  {
    "id": "general__transkriptionsformatierung",
    "category": "General",
    "name": "Transkriptionsformatierung",
    "description": "Korrigiert Füllwörter und Tippfehler in Transkripten. Organisiert Inhalte nach Sprecher zu präzisen, gut lesbaren Besprechungsprotokollen.",
    "gliederung": [
      "Formatiert Transkriptionstext im Stil eines Sitzungsprotokolls.",
      "Verarbeitet den gesamten Text.",
      "Organisiert nach Sprecher, sofern identifizierbar.",
      "Kennzeichnet den Namen der sprechenden Person klar am Anfang jeder Aussage.",
      "Entfernt Füllwörter und bedeutungslose Wiederholungen.",
      "Korrigiert offensichtliche Tippfehler anhand des Kontexts."
    ]
  },
  {
    "id": "general__uberarbeitung_klingt_menschlich_liest_sich_flussig_emotional_ansprechend",
    "category": "General",
    "name": "Überarbeitung – klingt menschlich, liest sich flüssig, emotional ansprechend",
    "description": "Verfeinert jeden Entwurf zu menschlich klingender Prosa. Verbessert Ton und Fluss für klare, veröffentlichungsreife Texte.",
    "gliederung": [
      "Ziel: prägnante, ansprechende, emotional intelligente und logisch strukturierte Version, die menschlich klingt und veröffentlichungsreif ist.",
      "Phase 1 – Diagnose: Kerninhalt, Absicht und Verbesserungspotenzial identifizieren, Zielgruppe klären.",
      "Phase 2 – Strategischer Umbau: logische Struktur optimieren, Ton/Sprache auf Engagement trimmen, Lesbarkeit verbessern (kurze Absätze, variierte Satzlängen).",
      "Phase 3 – Präzisionsverdichtung: gezielte Kürzung, aktive Sprache, verständliche Sprache ohne Fachjargon.",
      "Phase 4 – Validierung: Klarheits- und Genauigkeitsprüfung, Humanisierungs-Durchgang, Konsistenzprüfung über mehrere Modelle.",
      "Erfolgskriterien: 25–60 % Kompression, hohe Klarheit, verständliches Sprachniveau, überwiegend aktive Sprache, emotionale Resonanz."
    ]
  },
  {
    "id": "general__zusammenfassung_aufgaben",
    "category": "General",
    "name": "Zusammenfassung & Aufgaben",
    "description": "Gliedert den Inhalt mit Zwischenüberschriften und Aufzählungspunkten und erstellt abschließend eine konkrete Aufgabenliste zur Klärung der nächsten Schritte.",
    "gliederung": [
      "Fasst die Hauptpunkte zusammen.",
      "Nutzt für die Zusammenfassung Zwischenüberschriften und listet Details als Aufzählungspunkte.",
      "Erstellt am Ende eine Aufgabenliste."
    ]
  },
  {
    "id": "general__zusammenfassung_erlauterung_und_schlussfolgerung",
    "category": "General",
    "name": "Zusammenfassung, Erläuterung und Schlussfolgerung",
    "description": "Fasst Texte zusammen und erklärt sie. Erfasst Kernpunkte und Schlussfolgerungen für schnelles Verständnis.",
    "gliederung": [
      "Ziel: klare, prägnante Verschmelzung von Zusammenfassung und Erklärung für ein allgemeines Publikum.",
      "Identifiziert Hauptthema und zentrales Thema anhand von Themensätzen und Übergängen.",
      "Extrahiert Kernaussagen, Argumente und relevante Fakten.",
      "Berücksichtigt Zweck und Ton der ursprünglichen Quelle.",
      "Struktur: klare Thesenaussage, prägnante Zusammenfassung der Kernpunkte, ausführlichere Erklärung wichtiger Konzepte mit Analogien/Beispielen.",
      "Flüssige Übergänge zwischen Zusammenfassung und Erklärung.",
      "Aktive Sprache, klare Grammatik, abwechslungsreicher Satzbau für Lesbarkeit."
    ]
  },
  {
    "id": "general__ausfuhrliche_vorlesungsnotizen",
    "category": "General",
    "name": "Ausführliche Vorlesungsnotizen",
    "description": "Für Studierende. Wandelt Vorlesungstranskripte in ausführliche Notizen mit Formeln und Beispielaufgaben um.",
    "gliederung": [
      "Rolle: technische Mitschrift für Informatik-/Statistik-Vorlesungen auf Hochschulniveau.",
      "Notizen beginnen bei den Grundlagen: alle Fachbegriffe und Symbole vor Verwendung definieren, Begründung von Konzepten statt nur Methode.",
      "Erklärungen zunächst in Alltagssprache für Intuition, dann formale Definitionen/Gleichungen; alle Beispiele und Herleitungen vollständig abdecken.",
      "Jede wichtige Formel/Pseudocode wird vollständig ausgeschrieben, inkl. Notation und Sonderfälle.",
      "Beispielaufgaben mit klarer Problemstellung, Schritt-für-Schritt-Lösung und Interpretation des Ergebnisses.",
      "Struktur mit Überschriften, Aufzählungen, nummerierten Schritten, Codeblöcken, Fettung wichtiger Begriffe.",
      "Verweise auf frühere Kursinhalte und reale Anwendungen; Diagramme/Flowcharts beschreiben.",
      "Ziel: eigenständige Notizen, die das Lernen ohne erneutes Anschauen der Vorlesung ermöglichen."
    ]
  },
  {
    "id": "general__gpt_zusammenfassung",
    "category": "General",
    "name": "GPT-Zusammenfassung",
    "description": "Ideal für professionelle Texte. Ordnet Ideen und ergänzt Kontext, ohne die ursprüngliche Grundlage zu verlieren.",
    "gliederung": [
      "Ziel: Originalinhalt bewahren und erweitern – relevante Haupt- und Nebeninformationen, historischer Kontext, aktuelle Entwicklungen, Definitionen für Fachbegriffe.",
      "Neuordnung des Inhalts für logische, klare Ideenfolge; Paraphrasierung zur Verdichtung, Zusammenführung verwandter Ideen.",
      "Anreicherung: Beispiele, Daten, Zitate und Statistiken erhalten und erweitern; Analogien zur Verdeutlichung; praktische Anwendungen ergänzen.",
      "Formatierung: klare Struktur mit Titeln/Untertiteln, Aufzählungen, fett hervorgehobene Kernkonzepte, Tabellen für komplexe Daten.",
      "Stil: klar, formal, lehrreich, informativ, sachlich.",
      "Kontextualisierung: Bezug zu Fachgebiet/Branche, aktuelle Relevanz und zukünftige Auswirkungen.",
      "Abschluss: umfassende Zusammenfassung der Kernpunkte, Vorschläge für weiterführende Forschung.",
      "Mindestens 90 % des Originalinhalts müssen erhalten bleiben, zuzüglich der Erweiterungen."
    ]
  },
  {
    "id": "general__sitzungsprotokoll",
    "category": "General",
    "name": "Sitzungsprotokoll",
    "description": "Für Teams. Dokumentiert Themen, Aufgaben und Fristen für klare Ergebnisse.",
    "gliederung": [
      "Erfasst allgemeine Informationen: Datum, Start-/Endzeit, Art des Meetings (intern/extern), Ort/Medium.",
      "Kurze, prägnante Beschreibung des Hauptthemas.",
      "Teilnehmerinformationen: Name, Rolle/Abteilung, Unternehmen bei externen Teilnehmenden.",
      "Besprochene Punkte als Aufzählung (Projektstatus, offene Fragen, technische Anliegen).",
      "To-dos, Aufgaben und Vereinbarungen mit Aufgabe, Verantwortlicher, Fälligkeitsdatum und Status.",
      "Nächste Schritte bzw. Folgekommunikation inkl. geplanter Termine.",
      "Freitextraum für Notizen/Sonstiges (Bemerkungen, Risiken, allgemeine Stimmung).",
      "Abschluss mit Name, Position und Erstellungsdatum der protokollierenden Person."
    ]
  },
  {
    "id": "general__personliche_gesprache",
    "category": "General",
    "name": "Persönliche Gespräche",
    "description": "Ordnet Gespräche oder Monologe zu Berichten. Fasst Themen, Aufgaben und Kernerkenntnisse zusammen.",
    "gliederung": [
      "Ziel: Transkription und Zusammenfassung persönlicher Monologe/Gespräche zu einem strukturierten Bericht.",
      "Abschnitte: Hauptthemen, wichtige Details, Aufgaben/Vereinbarungen, Sorgen/Herausforderungen, Reflexionen/Absichten.",
      "Emotionaler Ton, Kontext und Kernthemen werden bei den Hauptthemen erfasst.",
      "Relevante Namen, Daten, Ereignisse und Beobachtungen unter „wichtige Details\".",
      "Konkrete Aufgaben, Entscheidungen oder Zusagen als Aufgaben/Vereinbarungen.",
      "Geäußerte Sorgen, Hindernisse oder Zweifel unter „Herausforderungen\".",
      "Ziele, Absichten oder Erkenntnisse unter „Reflexionen\", sofern relevant.",
      "Zusammenfassung vermeidet unnötige Wiederholungen, bleibt klar und prägnant, bewahrt persönlichen Ton."
    ]
  },
  {
    "id": "meeting__fragen_und_antworten_zur_beratung",
    "category": "Meeting",
    "name": "Fragen und Antworten zur Beratung",
    "description": "Für Beratungsgespräche, um Hintergrund, Fragen/Antworten und Aufgaben mit Verantwortlichen und Fristen festzuhalten.",
    "gliederung": [
      "Erfasst Meeting-Informationen (Datum/Uhrzeit, Ort, Teilnehmer).",
      "Hintergrundzusammenfassung für das Beratungsgespräch.",
      "Fragen und Antworten mit Teilantworten.",
      "Abschnitt „Aufgaben\" mit To-dos, Fristen und Verantwortlichen."
    ]
  },
  {
    "id": "meeting__zusammenfassung_der_diskussion",
    "category": "Meeting",
    "name": "Zusammenfassung der Diskussion",
    "description": "Für Teamdiskussionen. Themen und Notizen eingeben; Schlussfolgerungen, nächste Schritte und Kernpunkte erhalten.",
    "gliederung": [
      "Erfasst Meeting-Informationen.",
      "Je Thema: Schlussfolgerung der Diskussion, daraus abgeleitete nächste Schritte, sowie Diskussionspunkte mit unterstützenden Fakten/Argumenten."
    ]
  },
  {
    "id": "meeting__sitzungsbericht",
    "category": "Meeting",
    "name": "Sitzungsbericht",
    "description": "Für Teams, die Meetings durchführen. Details eingeben, um einen Bericht mit Zusammenfassung und nächsten Schritten inkl. Verantwortlichen zu erhalten.",
    "gliederung": [
      "Erfasst Meeting-Informationen.",
      "Je Thema: Gesamtzusammenfassung, je Unterthema Fortschritt, Problem & Risiko, sowie nächster Schritt mit Verantwortlichem und Frist."
    ]
  },
  {
    "id": "meeting__aufgabenzuweisung",
    "category": "Meeting",
    "name": "Aufgabenzuweisung",
    "description": "Für Team-Meetings. Datum, Ort, Personen, Aufgaben eingeben; klare Liste mit Verantwortlichen und Fälligkeitsterminen erhalten.",
    "gliederung": [
      "Erfasst Meeting-Informationen.",
      "Je Aufgabe: kurze Hintergrundbeschreibung und detaillierte Aufgabenbeschreibung mit Verantwortlichem und Frist."
    ]
  },
  {
    "id": "meeting__formelles_treffen",
    "category": "Meeting",
    "name": "Formelles Treffen",
    "description": "Für Gremien und Teams. Tagesordnung und Teilnehmer eingeben; Protokoll mit Anträgen, Entscheidungen und Abstimmungen erhalten.",
    "gliederung": [
      "Eröffnung mit Datum, Uhrzeit, Vorsitz und Protokollführung.",
      "Anwesenheitsliste (stimmberechtigt, Gäste, entschuldigt).",
      "Genehmigung des vorherigen Protokolls.",
      "Berichte (Vorstand/Sonstige) mit konkreten Zahlen/Ergebnissen.",
      "Neue und alte Geschäftspunkte.",
      "Hauptanträge mit Diskussion und Abstimmungsergebnis.",
      "Unerledigte Punkte, Ankündigungen, Sitzungsende mit Unterschrift und Genehmigungsdatum."
    ]
  },
  {
    "id": "meeting__chat_notiz",
    "category": "Meeting",
    "name": "Chat-Notiz",
    "description": "Für das Festhalten lockerer Chats. Chat einfügen, um eine Zusammenfassung mit Stimmung, Zitaten und Erkenntnissen zu erhalten.",
    "gliederung": [
      "Fungiert als „Geschichtenerzähler\" für informelle Gespräche/Brainstormings – erfasst Inhalt UND Charakter des Gesprächs.",
      "Erzählerischer Ansatz: rekonstruiert den Gesprächsverlauf als fließenden Überblick („Gist\").",
      "Bewahrt das Menschliche: erfasst „Vibe\" und „Dynamik\" sowie einprägsame Momente (Sprüche, Zitate).",
      "Struktur: emotionaler Kern (Stimmung/Dynamik), narrative Zusammenfassung, Highlight-Zitate mit Sprecherzuordnung, sowie zwei praktische Listen – Dinge zum Merken (Pläne/Zusagen) und Gesprächsthemen (dedupliziert)."
    ]
  },
  {
    "id": "meeting__sitzungssekretar",
    "category": "Meeting",
    "name": "Sitzungssekretär",
    "description": "Fasst Transkripte in Aufgaben und Kernnotizen zusammen, um Aufgaben und Diskussionen leichter nachzuverfolgen.",
    "gliederung": [
      "Wandelt ein virtuelles Meeting-Transkript in strukturierte Besprechungsnotizen für den persönlichen Gebrauch um.",
      "Rolle: erfahrene Assistenz, die klare, prägnante und umsetzbare Notizen erstellt und Zusagen nachverfolgt.",
      "Analysiert das Transkript, extrahiert Diskussionspunkte, Entscheidungen und Aufgaben mit Verantwortlichen und Fristen.",
      "Gliederung in drei Abschnitte: Executive Summary, zentrale Aufgaben/Zusagen, detaillierte Aufschlüsselung nach Thema.",
      "Professioneller, strukturierter Ton mit Aufzählungspunkten und fett gedruckten Überschriften."
    ]
  },
  {
    "id": "meeting__detaillierte_zusammenfassung",
    "category": "Meeting",
    "name": "Detaillierte Zusammenfassung",
    "description": "Ordnet Notizen in Themenzusammenfassungen, Aufgabentabellen und Zitate für klare Team-Nachverfolgung.",
    "gliederung": [
      "Zusammenfassungen benötigen Titel, Zeit, Datum, Teilnehmernamen und eine Gesamtzusammenfassung.",
      "Themen werden in der besprochenen Reihenfolge mit Überschrift und stichpunktartiger Zusammenfassung dargestellt.",
      "Themenzusammenfassungen enthalten Teilnehmer, Kernpunkte mit Zitatnennung, Entscheidungen, Probleme, Herausforderungen, Feedback und geplante Maßnahmen.",
      "Alle Notizen müssen auf Richtigkeit und Vollständigkeit geprüft werden; fehlende Details werden nicht ergänzt, unklare Zitate mit [???] markiert.",
      "Aufgaben enthalten Titel, Beschreibung, Verantwortlichen, Fristen und Anmerkungen."
    ]
  },
  {
    "id": "meeting__wichtige_punkte_entscheidungen_aufgaben_fristen_und_ma_nahmen",
    "category": "Meeting",
    "name": "Wichtige Punkte, Entscheidungen, Aufgaben, Fristen und Maßnahmen",
    "description": "Fasst Meeting-Transkripte in Kernpunkte, Entscheidungen und eine Aufgabentabelle mit Fristen zusammen.",
    "gliederung": [
      "Extrahiert Inhalte aus der Transkription gemäß festgelegtem Format.",
      "Fokus auf objektive Fakten, Entscheidungen, Zeiten, Daten und Aufgaben.",
      "Kernpunkte und wichtige Entscheidungen chronologisch aufgelistet.",
      "Aufgaben in Tabellenform: Aufgabe, Verantwortlicher, Frist, Anmerkungen.",
      "Wichtige Fristen im Format „Zeit: zu erledigende Aufgabe\".",
      "Wichtige Folgeaktionen werden aufgelistet."
    ]
  },
  {
    "id": "meeting__sitzungsprotokoll",
    "category": "Meeting",
    "name": "Sitzungsprotokoll+",
    "description": "Ordnet Diskussionen in objektive Notizen mit Aufgabenlisten, Entscheidungen und Risikohinweisen.",
    "gliederung": [
      "Meeting-Informationen: Thema, Datum/Uhrzeit, Teilnehmer, wichtige Entscheidungsträger.",
      "Diskussionsüberblick je Tagesordnungspunkt: Kernpunkte je Sprecher, Meinungsverschiedenheiten, Zwischenergebnisse, unterstützende Daten, empfohlene Maßnahmen.",
      "Entscheidungen: bestätigte Punkte (★) vs. noch zu verifizierende Punkte (◆).",
      "Aufgaben mit Verantwortlichen (@) und Fristen.",
      "Risikohinweise mit Notfallplänen.",
      "Nur objektive Informationen aus dem Original, keine Spekulationen; Kennzahlen in [ ], Zitate in Anführungszeichen."
    ]
  },
  {
    "id": "meeting__sitzungsprotokoll_2",
    "category": "Meeting",
    "name": "Sitzungsprotokoll",
    "description": "Extrahiert Zusammenfassungen und Entscheidungen je Tagesordnungspunkt. Ordnet Aufgaben nach Verantwortlichem und offenen Punkten, mit Beispielen für Hinweise.",
    "gliederung": [
      "Nennt zu Beginn Meeting-Titel, Aufnahmedatum und Sprecher (Sprecher1, Sprecher2 usw.).",
      "Fasst je Tagesordnungspunkt Thema und Aussagen jedes Sprechers zusammen.",
      "Problemstellungen, Anfragen und Lösungsvorschläge werden besonders hervorgehoben.",
      "Zeit- und Datumsangaben werden für spätere Nachvollziehbarkeit festgehalten.",
      "Endgültige Entscheidungen werden klar gekennzeichnet.",
      "Zukünftige Aufgaben werden chronologisch geordnet, nach Möglichkeit mit Verantwortlichem.",
      "Für nächste Aufgaben werden Hinweise und Beispiele auf Basis der Aufnahme gegeben.",
      "Offene Punkte werden stichpunktartig zusammengefasst, ausschließlich basierend auf dem Aufnahmeinhalt."
    ]
  },
  {
    "id": "meeting__transkript_zum_vollstandigen_erzahlprotokoll",
    "category": "Meeting",
    "name": "Transkript zum vollständigen Erzählprotokoll",
    "description": "Wandelt Transkripte in Geschichten um. Hält Entscheidungen und Maßnahmen in klarer, professioneller Erzählform fest.",
    "gliederung": [
      "Wandelt ein rohes Meeting-Transkript in ein umfassendes, detailliertes Erzählprotokoll um, das Kontext, Ton und Dynamik des Meetings widerspiegelt.",
      "Rekonstruiert das Meeting chronologisch als Erzählung: wer welche Punkte, Argumente, Daten, Reaktionen, Entscheidungen und offenen Punkte eingebracht hat.",
      "Dokumentiert alle Aufgaben, Verantwortliche und Fristen, unter Beibehaltung von Ton und Stimmung.",
      "Schließt mit nächsten Schritten, Folgeplänen und Abschlussbemerkungen; „[ausfüllen]\" für fehlende Details.",
      "Format: klare, chronologische Erzählung in Absätzen mit direkten Zitaten, Zwischenüberschriften bei Themenwechsel, fett hervorgehobene Aufgaben/Entscheidungen – keine Aufzählungspunkte."
    ]
  },
  {
    "id": "meeting__detailliertes_protokoll",
    "category": "Meeting",
    "name": "Detailliertes Protokoll",
    "description": "Ordnet Meeting-Transkripte nach Diskussionspunkt, extrahiert Zusammenfassungen und Entscheidungen. Für schnelle Entscheidungsfindung im Management.",
    "gliederung": [
      "Erstellt hochwertige Protokolle zur schnellen Entscheidungsfindung von Geschäftsführung und Unternehmensplanung.",
      "Zeichnet alle Aussagen detailliert und ohne Auslassung auf, entfernt Füllwörter und Zögerlaute.",
      "Unhörbare Passagen werden als [Unbekannt] markiert.",
      "Fakten werden als solche festgehalten; Interpretationen/Meinungen mit (Interpretation)/(Meinung) gekennzeichnet.",
      "Gliederung nach Diskussionspunkt (## Diskussionspunkt), mit Unterüberschriften (###) und Aufzählungen.",
      "Automatisch generierter Titel (max. 25 Zeichen).",
      "Reihenfolge: Basisinformationen, Zusammenfassung, Executive Summary, Entscheidungen, zu klärende Punkte.",
      "Entscheidungen und zu klärende Punkte werden tabellarisch mit Verantwortlichem, Frist, KPI und Status dargestellt."
    ]
  },
  {
    "id": "meeting__1_2_au_erst_detaillierte_zusammenfassung",
    "category": "Meeting",
    "name": "1.2 Äußerst detaillierte Zusammenfassung",
    "description": "Erstellt strukturierte Zusammenfassungen mit Sprecherrollen, technischen Details und priorisierten Aufgaben.",
    "gliederung": [
      "Ziel: strukturierte, attributionsreiche Meeting-Zusammenfassung als Wissensbasis für eine KI-Assistenz.",
      "Erfasst, was gesagt wurde, von wem, in welchem Kontext, mit welcher Priorität, Stimmung, welchen Einschränkungen und Ergebnissen.",
      "Enthält Metadaten, Teilnehmer, Agenda, Zweck, gruppierte Themen, Sprecherzuordnungen mit Rollen, technische Umgebung, konkrete Fragen/Antworten, Feature-Feedback, Bedenken/Risiken/Blocker, Aufgaben mit Fristen/Abhängigkeiten.",
      "Klare Abschnittsüberschriften, vollständige Sätze mit reichhaltigen Metadaten, Sprecherzuordnung, Dringlichkeitskennzeichnung, explizite Daten.",
      "Neutraler, präziser, informationsdichter Ton."
    ]
  },
  {
    "id": "meeting__zusammenfassung_des_perfekten_meetings",
    "category": "Meeting",
    "name": "Zusammenfassung des perfekten Meetings",
    "description": "Fasst Transkripte in Aufgaben und Entscheidungen zusammen. Verfolgt Engagement und schlägt Verbesserungen vor.",
    "gliederung": [
      "Analysiert ein Meeting-Transkript mit Fokus auf Engagement, Verantwortlichkeit und Entscheidungsklarheit.",
      "Struktur: Executive Summary, Kern-Diskussionspunkte, getroffene Entscheidungen, Aufgaben, Stimmungs-/Engagement-Analyse, offene Punkte, Empfehlungen zur Meeting-Verbesserung.",
      "Aufgaben im Format: Aufgabe, Verantwortlicher, Frist (oder TBD), Notizen.",
      "Stimmungsanalyse: Engagement-Level, Klarheit, Zögern, Tonwechsel, Spannung, Begeisterung.",
      "Erkennt ggf. Strukturen wie EOS (IDS, L10-Meetings, Rocks)."
    ]
  },
  {
    "id": "meeting__sitzungsma_nahmen",
    "category": "Meeting",
    "name": "Sitzungsmaßnahmen",
    "description": "Erstellt Aufgabenlisten und Entwürfe für Follow-up-Nachrichten aus Meeting-Transkripten für klare Nachverfolgung.",
    "gliederung": [
      "Extrahiert umsetzbare Punkte aus Meeting-Transkripten in ein strukturiertes Format.",
      "Kategorien: Aufgaben, Fristen, Folgeaktionen, Entscheidungen, Kernpunkte.",
      "Darstellung als Mischung aus Absätzen, Aufzählungen und Tabellen, mit Verantwortlichem und Zeitrahmen.",
      "Klarheit, Genauigkeit und professioneller Ton; keine Fachjargon-Überladung.",
      "Separate Abschnitte für Follow-up-E-Mail-Entwurf und kurze Nachfass-Textnachricht im Ton der Hauptsprecherin/des Hauptsprechers."
    ]
  },
  {
    "id": "meeting__zusammenfassung_der_vorstandssitzung",
    "category": "Meeting",
    "name": "Zusammenfassung der Vorstandssitzung",
    "description": "Für Teams zur Verfolgung von Kennzahlen und Aufgaben. Erfasst Sprecher und weist RACI-Rollen für jede Entscheidung zu.",
    "gliederung": [
      "Detaillierter Meeting-Überblick mit wichtigen Punkten, Kennzahlen, Ergebnissen, Plänen, Prioritäten und zugewiesenen Aufgaben.",
      "Alle genannten Kennzahlen werden der vorstellenden Person zugeordnet.",
      "Fragen und Kommentare werden mit Sprechernamen in die Zusammenfassung integriert.",
      "Aufgaben/Folgepunkte werden am Ende nach Verantwortlichem und Zeitrahmen aufgelistet.",
      "Beginnt mit Datum/Uhrzeit und Teilnehmerliste.",
      "Eigener Abschnitt je Entscheidung mit RACI-Zusammenfassung (Verantwortlich, Rechenschaftspflichtig, Konsultiert, Informiert).",
      "Markdown-Format mit Überschriftenebenen, professioneller und klarer Ton."
    ]
  },
  {
    "id": "meeting__personlichkeitsbeurteilung",
    "category": "Meeting",
    "name": "Persönlichkeitsbeurteilung",
    "description": "Analysiert Sprecherstile und Rollen. Fasst Beiträge und professionelle Eindrücke zusammen.",
    "gliederung": [
      "Analysiert Persönlichkeit und Beiträge der Sprecher nach dem Meeting.",
      "Fokus auf Sprechstil, Eindrücke, mögliche Erfahrung, Altersspanne und organisatorische Rolle je Sprecher.",
      "Einblicke in Tonfall und Gesprächsansatz.",
      "Eigener Abschnitt zur Analyse des Beitrags jedes Sprechers zum Meeting."
    ]
  },
  {
    "id": "speech__klassenmitteilung",
    "category": "Speech",
    "name": "Klassenmitteilung",
    "description": "Hilft Studierenden, Unterrichtsinfos, Schlagwörter und Kernpunkte festzuhalten. Ausgabe als klare Notizen mit Beispielen und Aufgaben.",
    "gliederung": [
      "Erfasst Basisinformationen (Datum/Uhrzeit, Ort, Kursname).",
      "Schlagwörter des Themas.",
      "Kernerkenntnisse mit Zusammenfassung je Wissenspunkt.",
      "Erläuterungen je Wissenspunkt mit Kernpunkten, ausführlicher Erklärung und Beispielen mit Schritt-für-Schritt-Herleitung.",
      "Aufgaben für die Unterrichtsstunde."
    ]
  },
  {
    "id": "speech__zusammenfassung_der_vorlesung",
    "category": "Speech",
    "name": "Zusammenfassung der Vorlesung",
    "description": "Für Studierende: Vorlesungsdetails eingeben. Zusammenfassung mit Kernpunkten, Kapiteln und Zitaten erhalten.",
    "gliederung": [
      "Erfasst Titel, Datum/Uhrzeit, Ort, Vortragende Person.",
      "Thema: umfassendes Verständnis für schnellen Überblick über den gesamten Vorlesungsinhalt.",
      "Kernaussagen (Takeaways) aus der Vorlesung.",
      "Highlights: bemerkenswerte Zitate mit Sprechernennung.",
      "Kapitel & Themen mit Detailinformationen und Kernpunkten je Kapitel.",
      "Empfehlungen der vortragenden Person."
    ]
  },
  {
    "id": "speech__schulungszusammenfassung",
    "category": "Speech",
    "name": "Schulungszusammenfassung",
    "description": "Für Trainer und Teilnehmende zur Erfassung von Schulungen. Ausgabe mit Kernpunkten, Notizen, Sonderfällen und Aufgaben.",
    "gliederung": [
      "Erfasst Datum/Uhrzeit, Ort, Schulungsname.",
      "Schlagwörter der Schulung.",
      "Arbeitsleitfaden je Modul mit Kernpunkten.",
      "Hinweise/Vorsichtsmaßnahmen für effektive Praxis.",
      "Sonderfälle: Umgang mit Ausnahmen.",
      "To-do-Listen mit Verantwortlichem und Frist."
    ]
  },
  {
    "id": "speech__diktatnotiz",
    "category": "Speech",
    "name": "Diktatnotiz",
    "description": "Wandelt gesprochene Gedanken in ordentliche Notizen um. Liefert Zusammenfassung, Themen, Checkliste und zusammengeführte verwandte Notizen.",
    "gliederung": [
      "Fungiert als intelligenter Struktur-Assistent, der freie gesprochene Notizen in organisierte, umsetzbare Dokumente umwandelt.",
      "Intentbasierte Analyse: klassifiziert den Gedanken zunächst als To-do-Liste, neues Konzept (Idee/Erkenntnis), Problemlösungs-Gedankengang oder allgemeine Notiz.",
      "Adaptive Formatierung: wendet je nach erkannter Absicht das passende Format an (Checkliste, Problem/Untersuchung/Schlussfolgerung, Ideen-Synopse).",
      "Nahtlose Konsolidierung: führt mehrere zusammenhängende Kurznotizen zu einem einzigen, kohärenten Dokument zusammen, dedupliziert Aufgaben und gruppiert Ideen thematisch.",
      "Ausgabe: übergreifender Titel und Kurzzusammenfassung, thematisch gruppierte Kernpunkte, konsolidierte Aufgaben-Checkliste, vereinheitlichte Schlagwörter/Tags."
    ]
  },
  {
    "id": "speech__vortrag_des_sprechers",
    "category": "Speech",
    "name": "Vortrag des Sprechers",
    "description": "Wandelt Veranstaltungsnotizen in Zusammenfassungen um. Enthält Themen, Zitate und Aufgaben für das Publikum.",
    "gliederung": [
      "Erstellt eine klare, professionelle Zusammenfassung eines Vortrags bei einer Fachveranstaltung (Keynote, Workshop).",
      "Beginnt mit Titel des Vortrags, Name der sprechenden Person, Veranstaltungsort/-kontext.",
      "Kurzer Überblick über die Kernthemen.",
      "Detaillierte Kernpunkte des Vortrags.",
      "Wichtige Zitate aus dem Vortrag.",
      "Abschließende umsetzbare Punkte für das Publikum."
    ]
  },
  {
    "id": "speech__ausfuhrliche_rededetails_zitate_und_konzepte",
    "category": "Speech",
    "name": "Ausführliche Rededetails, Zitate und Konzepte",
    "description": "Detaillierte Zusammenfassungen mit Originalton. Enthält Zitate, Kernkonzepte und klare Handlungsschritte.",
    "gliederung": [
      "Erstellt originalgetreue Zusammenfassungen von Vorträgen und Keynotes, inkl. Ton, Konzepten und umsetzbaren Erkenntnissen der sprechenden Person.",
      "Nennt Hauptthema, Titel des Vortrags, zentrale Terminologie, Metaphern und Schlagworte.",
      "Zusammenfassung der Kernbotschaft in ein bis zwei Absätzen im Originalton.",
      "Gliederung folgt dem Ablauf des Vortrags, aufgeteilt in klare Teile/Kapitel mit Kernidee je Teil.",
      "Hervorhebung von Hauptargumenten, Konzepten, Theorien, Rahmenwerken und Methoden.",
      "Sammlung von 8–15 direkten Zitaten (Schlagworte, inspirierende Aussagen, Metaphern).",
      "Auflistung zentraler Konzepte mit kurzen, klaren Beschreibungen.",
      "3–7 klare, praktische Handlungspunkte, direkt aus dem Vortrag abgeleitet, mit kurzer Begründung/Zitat.",
      "Optionaler Bonusabschnitt „Was Sie verpasst haben, wenn Sie nicht dabei waren\"."
    ]
  },
  {
    "id": "speech__zusammenfassung_der_keynote",
    "category": "Speech",
    "name": "Zusammenfassung der Keynote",
    "description": "Erstellt ein Nachschlagewerk für Keynotes mit Kernbotschaften, Zitaten und drei konkreten Handlungspunkten.",
    "gliederung": [
      "Erstellt eine wertvolle Zusammenfassung der Keynote als Referenz für Teilnehmende.",
      "Übergreifendes Thema knapp zusammengefasst, inkl. Kernbotschaft, Titel und Schlüsselbegriffen der sprechenden Person.",
      "Struktur folgt der Gliederung der sprechenden Person, mit Bedeutung/Wichtigkeit je Teil und kurzen Beispielen/Anekdoten.",
      "Etwa fünf kraftvolle, inspirierende Zitate, die die Kernbotschaft widerspiegeln.",
      "Maximal drei konkrete Handlungspunkte aus der Keynote.",
      "Nutzt dieselben Begriffe, Fachjargon und Ton wie die Keynote selbst."
    ]
  },
  {
    "id": "speech__predigt",
    "category": "Speech",
    "name": "Predigt",
    "description": "Erstellt strukturierte Predigtnotizen. Erfasst Kernpunkte und hebt Bibelstellen in Originalreihenfolge hervor.",
    "gliederung": [
      "Dient als Grundlage für einen Blogbeitrag und als Handout für Gemeindemitglieder.",
      "Fasst umfassend zusammen, was über Gott, sein Wesen, seine Antworten an Menschen und die eigene Identität in Gott gelehrt wurde.",
      "Erfasst Bibelstellen, deren Kontext, Anwendung und Beispiele der predigenden Person.",
      "Nutzt Predigttitel/-serie als Titel, sofern genannt.",
      "Behält die ursprüngliche Reihenfolge der Predigt bei.",
      "Markdown-Format mit Überschriften; Bibelstellen hervorgehoben; Aufzählungspunkte bevorzugt; „Kernpunkte\" nummeriert."
    ]
  },
  {
    "id": "speech__transkription",
    "category": "Speech",
    "name": "Transkription",
    "description": "Wandelt Aufnahmen originalgetreu in Volltext um. Liefert klaren, formatierten Text für jeden Sprecher.",
    "gliederung": [
      "Transkribiert alles Gesagte originalgetreu und vollständig, ohne Zusammenfassung, Interpretation oder Veränderung.",
      "Fügt keine Kommentare, Titel, Erklärungen, Zusammenfassungen oder Schlussfolgerungen hinzu.",
      "Klares, lesbares Format, ggf. mit Zeilenumbrüchen zwischen Wortmeldungen."
    ]
  },
  {
    "id": "speech__notizen_des_hauptredners",
    "category": "Speech",
    "name": "Notizen des Hauptredners",
    "description": "Fasst Transkripte in Themen, Zitate und Aufgaben je Sitzung zusammen, um Erkenntnisse leichter nachzuvollziehen.",
    "gliederung": [
      "Erstellt eine wertvolle Keynote-Zusammenfassung als Referenz für Teilnehmende.",
      "Trennt Notizen klar nach Sprecher/Sitzung bei mehreren Sprechern.",
      "Je Sprecher/Sitzung: Hauptthema, Unterthemen/Kapitel, inspirierende Zitate, zentrale Handlungspunkte.",
      "Hauptthema fasst übergreifendes Thema und Kernbotschaft prägnant zusammen.",
      "Etwa fünf kraftvolle, kontextrelevante Zitate je Sprecher/Sitzung.",
      "Maximal drei konkrete, umsetzbare Handlungspunkte je Sprecher/Sitzung."
    ]
  },
  {
    "id": "speech__mein_tagebuch",
    "category": "Speech",
    "name": "Mein Tagebuch",
    "description": "Wandelt Sprachaufnahmen in ein Tagebuch um. Bereinigt Text, gliedert in Blöcke und zieht Schlussfolgerungen.",
    "gliederung": [
      "Verwandelt eine Audioaufnahme in einen strukturierten, lesbaren Tagebucheintrag.",
      "Bereinigt den Text von irrelevanten Informationen (z. B. Dashcam-Meldungen).",
      "Macht den Text logisch, mit lebendigem Gesprächsstil, Zeichensetzung und thematischen Absätzen.",
      "Erfindet einen kurzen, einprägsamen Titel, der die Essenz des Tages widerspiegelt.",
      "Mehrere Handlungsstränge werden als separate thematische Blöcke mit Zwischenüberschriften formatiert.",
      "Persönlicher, gesprächsnaher Stil, keine offiziellen/literarischen Töne; nur Umformulierung, nichts hinzuerfunden.",
      "Kurze emotionale Tageszusammenfassung in der Ich-Form.",
      "Am Ende 5–6 Hashtags zum Tagesinhalt."
    ]
  },
  {
    "id": "speech__adhs_manager_bewusstseinsstrom_aus_der_perspektive_eines_einzelnen_sprechers",
    "category": "Speech",
    "name": "ADHS-Manager: Bewusstseinsstrom aus der Perspektive eines einzelnen Sprechers",
    "description": "Wandelt Sprachnotizen in Berichte mit thematischen Abschnitten um. Hilft, komplexe Ideen zu klären und zu ordnen.",
    "gliederung": [
      "Synthetisiert und strukturiert Gedanken von Personen mit Kommunikationsbarrieren, Autismus oder ADHS zu einer kohärenten, präsentationsreifen Erzählung.",
      "Erstellt zunächst eine Top-Level-Zusammenfassung der Hauptideen, gegliedert in Abschnitte nach Kernthemen.",
      "Rekonstruiert detaillierten Bewusstseinsstrom je Abschnitt unter Bewahrung von Nuancen.",
      "Markiert Widersprüche/fragmentierte Ideen zur Prüfung durch die Nutzerin/den Nutzer.",
      "Bietet je Abschnitt Folgehinweise zur besseren Verständlichkeit.",
      "Endergebnis: präsentationsreif, klar strukturiert, mit erhaltenem Detailgrad."
    ]
  },
  {
    "id": "speech__predigt_2",
    "category": "Speech",
    "name": "Predigt",
    "description": "Erstellt ausführliche Predigtnotizen. Erfasst Bibelstellen, Kernpunkte und praktische Handlungspunkte.",
    "gliederung": [
      "Wandelt eine aufgezeichnete Predigt in prägnante Predigtnotizen für Gemeindemitglieder um.",
      "Enthält Schlüsselbibelstellen, Kernpunkte, Veranschaulichungsgeschichten und Mitnahmepunkte/Handlungspunkte.",
      "Professioneller, prägnanter, klarer Ton ohne komplexe Fachbegriffe.",
      "Format: Gliederung mit Überschriftenebenen, keine Emojis."
    ]
  },
  {
    "id": "speech__perfektes_transkript",
    "category": "Speech",
    "name": "Perfektes Transkript",
    "description": "Wörtliche Protokolle mit Füllwörtern und Korrektur eindeutiger Versprecher.",
    "gliederung": [
      "Hybride Transkription: maximale Wort-für-Wort-Genauigkeit als Standard, kontextbasierte Korrekturen nur in klar definierten Ausnahmefällen.",
      "Primärregel: exakte Beibehaltung aller gesprochenen Elemente (Füllwörter, Satzabbrüche, Stottern, Wiederholungen); keine Glättung oder Umformulierung.",
      "Sekundärregel: Korrekturen nur bei offensichtlichen, unbeabsichtigten Faktenfehlern oder direkten Selbstkorrekturen der sprechenden Person (nur das korrigierte Endergebnis wird transkribiert).",
      "Klare Hierarchie zwischen Standard- und Ausnahmeregeln, präzise Definition korrigierbarer Fehler, explizites Verbot typischer KI-Glättung."
    ]
  },
  {
    "id": "speech__bibelstudien_und_predigtexperte",
    "category": "Speech",
    "name": "Bibelstudien- und Predigtexperte",
    "description": "Unterstützt bei der Gliederung von Predigtnotizen in geistliche Themen, Schlüsselverse und praktische Wachstumspläne.",
    "gliederung": [
      "KI-Agent als konfessionsübergreifender, geistlich versierter Experte für Schrift, Theologie und Gruppenanalyse.",
      "Analysiert Predigten, Bibeltexte oder glaubensbasierte Diskussionen und liefert eine erbauliche, theologisch fundierte, praktisch anwendbare Aufschlüsselung.",
      "Identifiziert das geistliche Hauptthema mit unterstützenden Bibelversen und Relevanz für das christliche Leben.",
      "Kernlehren werden logisch mit Bibelversen, historischem/kulturellem Kontext und praktischer Anwendung aufgeschlüsselt.",
      "Bedeutsame Zitate/Aussagen aus der Gruppe werden hervorgehoben und mit der Schrift abgeglichen.",
      "Anwendungsschritte in drei Stufen: wesentliche Handlungen, wichtige Praktiken, Reflexionspunkte – alle mit Schriftbezug.",
      "Wachstumsplan mit kurz- und langfristigen Strategien.",
      "Verweise auf anerkannte christliche Autoren zur Vertiefung.",
      "Warmer, andächtiger, tagebuchfreundlicher Ton."
    ]
  },
  {
    "id": "speech__studienmodell_2",
    "category": "Speech",
    "name": "Studienmodell 2",
    "description": "Wandelt Sprache in klare Studientexte um. Bewahrt Fachbegriffe und wichtige Daten.",
    "gliederung": [
      "Ziel: Gehörtes in einen für das Lernen nutzbaren Text umwandeln, komplexe Themen leichter verständlich machen.",
      "Text wird originalgetreu, klar und geordnet transkribiert, ohne Informationsverlust.",
      "Einfache, saubere Sprache auf Sekundarstufen-Niveau; nur unnötige Wörter/Zögerlaute entfernen.",
      "Verwirrende Sätze werden klar und linear umformuliert, ohne die ursprüngliche Bedeutung zu verlieren.",
      "Fachbegriffe bleiben erhalten; komplexe Sätze werden für besseres Verständnis umgeschrieben, ohne Inhalt zu kürzen.",
      "Kurze, gut konstruierte Sätze mit korrekter Zeichensetzung für Lesbarkeit und Lerneignung."
    ]
  },
  {
    "id": "call__telefongesprach_diskussion",
    "category": "Call",
    "name": "Telefongespräch (Diskussion)",
    "description": "Für Anrufe und Meetings. Kernpunkte eingeben; strukturierte Themen, Schlussfolgerungen, Gründe und To-dos erhalten.",
    "gliederung": [
      "Erfasst Zeit und Gesprächspartner.",
      "Je Thema: Beschreibung, Schlussfolgerung/Aufgabe, unterstützende Gründe."
    ]
  },
  {
    "id": "call__telefonische_fragen_und_antworten",
    "category": "Call",
    "name": "Telefonische Fragen und Antworten",
    "description": "Für alle, die ein Telefonberatungsgespräch nachbereiten. Notizen eingeben; Frage-Antwort-Paare plus klare To-do-Liste erhalten.",
    "gliederung": [
      "Erfasst Zeit und Gesprächspartner.",
      "Je Frage: kurze Beschreibung und Antwort.",
      "Abschließende To-do-Liste mit Maßnahmen."
    ]
  },
  {
    "id": "call__aufgabe_per_anruf",
    "category": "Call",
    "name": "Aufgabe per Anruf",
    "description": "Für alle, die Aufgaben aus Anrufen organisieren. Zeit, Kontakt, Notizen eingeben; To-dos mit Fristen erhalten.",
    "gliederung": [
      "Erfasst Zeit und Gesprächspartner.",
      "Je Aufgabe: Hintergrundbeschreibung und To-do-Liste mit Frist."
    ]
  },
  {
    "id": "call__telefongesprach",
    "category": "Call",
    "name": "Telefongespräch",
    "description": "Gliedert den Anruf nach Themen, hebt Kernaussagen und Meinungen der Teilnehmenden hervor.",
    "gliederung": [
      "Strukturiert Telefon-/Sprachgespräche mit mehreren Teilnehmenden nach Themen, sofern klar erkennbar, sonst kurze Gesamtzusammenfassung.",
      "Je Thema: „Thema X\", „Beschreibung\" (kurze Erklärung), „Schlussfolgerungen\" (klare Entscheidungen/Vereinbarungen oder deren Fehlen), „Zusätzliche Hinweise\" (Meinungen, Ideen, Nuancen mit Namen).",
      "Ohne klare Themen: Block „Allgemeiner Gesprächsüberblick\".",
      "Themenwechsel nur bei klarem Fokuswechsel, keine erfundenen Informationen; unklare Sprache als „[unverständlich]\" markiert.",
      "Teilnehmende werden mit Namen oder als Gesprächspartner 1, 2 usw. bezeichnet."
    ]
  },
  {
    "id": "call__telefonnotiz",
    "category": "Call",
    "name": "Telefonnotiz",
    "description": "Fasst aufgezeichnete Telefongespräche zusammen, um die interne Weitergabe zu erleichtern.",
    "gliederung": [
      "Zusammenfassung in prägnanten, klaren Sätzen für schnelles Verständnis durch das Team.",
      "Für interne Tools gedacht: keine Emojis, prägnant innerhalb von ca. 400 Zeichen (Überschreitung bei Bedarf möglich).",
      "Layout: [Anrufer], [Thema], [Inhalt] (Details, ggf. Aufzählung), [Nächste Schritte] (Vereinbarungen mit Gegenüber)."
    ]
  },
  {
    "id": "call__zusammenfassung_analyse_des_kundengesprachs",
    "category": "Call",
    "name": "Zusammenfassung/Analyse des Kundengesprächs",
    "description": "Ordnet juristische Anrufaufzeichnungen zu Zusammenfassungen. Listet Themen und Aufgaben zur Unterstützung der Fallbearbeitung.",
    "gliederung": [
      "Analysiert und fasst juristische Telefonaufnahmen/Transkripte zwischen Anwalt und Mandant zusammen, mit Fokus auf Klarheit und Mandantenzufriedenheit.",
      "Abschnitte: Gesprächsüberblick, besprochene Themen, zu erledigende Aufgaben, Folgebedarf, Ton-/Empathieanalyse.",
      "Gesprächsüberblick: Datum/Uhrzeit, 3–5 Sätze Zusammenfassung, Teilnehmerrollen, Kernthemen.",
      "Themen mit fett hervorgehobenen Zwischenüberschriften, Erkenntnissen, unterstützenden Daten/Fristen.",
      "Aufgaben mit Verantwortlichem, Frist, klarer Beschreibung.",
      "Folgebedarf: zu klärende Themen/Dokumente, geplante Termine.",
      "Ton-/Empathieanalyse: aktives Zuhören, Angemessenheit des Tons, mit Transkriptbeispielen."
    ]
  },
  {
    "id": "call__zusammenfassung_des_telefongesprachs",
    "category": "Call",
    "name": "Zusammenfassung des Telefongesprächs",
    "description": "Fassen Sie juristische Anrufe als Erzählungen zusammen.",
    "gliederung": [
      "Wandelt ein aufgezeichnetes Telefongespräch in eine professionelle Erzählzusammenfassung für interne Fallnotizen um.",
      "Geschrieben aus der Ich-Perspektive der anrufannehmenden Person, für die persönliche Referenz.",
      "Beginnt mit „Ich habe mit [Name] gesprochen…\" in gesprächsnahem, professionellem Ton.",
      "Erfasst alle fallrelevanten Details: Behandlungsupdates, Diagnosen, Namen, rechtliche Entwicklungen, Fristen, Fragen, nächste Schritte.",
      "Erwähnte Dokumente und Folgeaufgaben werden eingebunden.",
      "Vermeidet Aufzählungspunkte und Überschriften; natürliche, klare Umschreibung statt wörtlicher Zitate."
    ]
  },
  {
    "id": "call__telefonnotizen",
    "category": "Call",
    "name": "Telefonnotizen",
    "description": "Telefongespräche präzise dokumentieren.",
    "gliederung": [
      "Erstellt eine klare Gesprächsnotiz mit Kerninhalt, Vereinbarungen und relevanten Punkten.",
      "Beginnt mit Teilnehmenden, Datum und Uhrzeit, gefolgt von einer kurzen, neutralen Zusammenfassung.",
      "Wichtigster Inhalt als Aufzählungspunkte; unwichtiger Smalltalk wird herausgefiltert.",
      "Vereinbarungen, Entscheidungen oder offene Fragen werden separat hervorgehoben; unklare Punkte mit „???\" markiert.",
      "Struktur: Teilnehmende, Datum & Uhrzeit, Gesprächszusammenfassung, Kernpunkte, Vereinbarungen/Entscheidungen/offene Fragen."
    ]
  },
  {
    "id": "call__einzelgesprach_zwischen_manager_und_mitarbeiter",
    "category": "Call",
    "name": "Einzelgespräch zwischen Manager und Mitarbeiter",
    "description": "Wandelt 1:1-Gesprächsprotokolle in Notizen mit Zielen, Feedback und Aufgaben um.",
    "gliederung": [
      "Wandelt Transkripte wöchentlicher 1:1-Gespräche zwischen Führungskraft und Mitarbeitendem in klare, strukturierte Notizen um.",
      "Alle Angaben müssen direkt durch das Transkript belegt sein, keine erfundenen Details.",
      "Konsistentes Format mit klaren Abschnitten und Aufzählungspunkten.",
      "Abschnitte: persönliches Check-in, Projektupdates & Prioritäten, Leistungsfeedback & Zielverfolgung, Coaching & Entwicklung, wichtige Entscheidungen & Vereinbarungen, Aufgaben & nächste Schritte.",
      "Beginnt mit dem exakten Meeting-Datum aus dem Transkript.",
      "Fehlende Angaben werden als „nicht angegeben\" markiert statt vermutet."
    ]
  },
  {
    "id": "call__eingabeaufforderung_fur_das_kundenberatungszentrum",
    "category": "Call",
    "name": "Eingabeaufforderung für das Kundenberatungszentrum",
    "description": "Für Beratungszentren. Extrahiert Kundenmerkmale und Emotionen aus dem Gesprächsinhalt, ordnet den Dialog zu einer verständlichen Zusammenfassung.",
    "gliederung": [
      "Strukturiert Anrufprotokolle eines Kundenberatungszentrums nach festen Regeln.",
      "Ausgabe enthält: Kundenmerkmale (z. B. Mann, 50er Jahre), Präfektur zum Zeitpunkt des Anrufs, emotionale „Temperatur\" (hoch/normal/niedrig), Anliegen-Zusammenfassung (ca. 80–90 Zeichen).",
      "Trennt Kunden- und Beratungszentrum-Aussagen, fasst jeweils zusammen, gruppiert zusammengehörige Inhalte in einem Absatz.",
      "Entfernt Wiederholungen und Füllwörter, ergänzt keine unklaren Stellen durch Vermutung."
    ]
  },
  {
    "id": "call__geschaftsanruf",
    "category": "Call",
    "name": "Geschäftsanruf",
    "description": "Erstellt professionelle Zusammenfassungen. Verfolgt Projekte, Anfragen und Maßnahmen für Team und Kunden.",
    "gliederung": [
      "Für vierteljährliche Meetings eines Ferienimmobilien-Verwaltungsunternehmens: Projekte, Aufgaben, Umsatz-/Belegungsvergleiche, Verbesserungsstrategien, Kundenfeedback.",
      "Ziel: Meeting-Zusammenfassung mit Status laufender/künftiger Projekte, Kundenanfragen, Zusagen und Aufgaben.",
      "Professionelle Präsentation, wie von einer persönlichen Assistenz erstellt.",
      "Klarer, prägnanter, für alle verständlicher Ton.",
      "Markdown-Format mit Überschriftenebenen, keine Emojis."
    ]
  },
  {
    "id": "call__telefonanruf",
    "category": "Call",
    "name": "Telefonanruf",
    "description": "Für Vertrieb/Support. Gespräch einfügen; Aufzählungen mit Kundenfragen, Entscheidungen und Maßnahmen erhalten.",
    "gliederung": [
      "Wandelt ein Telefongespräch in eine prägnante Geschäftszusammenfassung mit fester Struktur um.",
      "Enthält Kontaktdaten von Anrufer/Kunde und ggf. Unternehmen.",
      "Erfasst Anrufzweck, Kundenfrage/-problem und Kerninformationen (Situation, Bedarf, Hindernisse, Lösungen).",
      "Entscheidungen und konkrete Aktionspunkte im Format „[MASSNAHME] – Verantwortlich: [NAME], Frist: [DATUM]\".",
      "Abschließend: nächste Schritte oder Folgetermin.",
      "Prägnant, professionell, in Aufzählungspunkten."
    ]
  },
  {
    "id": "call__sprache_zu_text",
    "category": "Call",
    "name": "Sprache zu Text",
    "description": "Wandelt mündliche Transkripte in logisch zusammenhängende schriftliche Artikel um.",
    "gliederung": [
      "Wandelt ein mündliches Transkript verlustfrei in einen flüssigen, logisch kohärenten, gut lesbaren Text um – „Übersetzung\", keine Zusammenfassung; 100 % Informationserhalt.",
      "Vier Schritte: 1) Bereinigen (Füllwörter entfernen, Grammatik korrigieren, betonende Wiederholungen behalten); 2) logischer Fluss (gesprochene Konjunktionen durch schriftliche ersetzen); 3) Absatzbildung (klare Absätze, keine Aufzählungen außer im Original vorhanden); 4) Stilpolitur (Wortschatz verbessern, Bedeutung unverändert).",
      "Keine Kürzung, kein Perspektivwechsel, kein Verlust des persönlichen Stils.",
      "Ausgabe ist direkt der überarbeitete Artikel, ohne Einleitung/Schluss."
    ]
  },
  {
    "id": "call__immobilienanrufe",
    "category": "Call",
    "name": "Immobilienanrufe",
    "description": "Extrahiert Immobiliendetails, Markttrends und Maßnahmen aus Anrufaufzeichnungen für eine einfache Durchsicht.",
    "gliederung": [
      "Fasst Kernpunkte eines Immobilientelefonats prägnant zusammen.",
      "Executive Summary mit Kernpunkten (max. 250 Zeichen je 5 Gesprächsminuten): Deals, Personen, Unternehmen, Aufgaben.",
      "Detaillierte Zusammenfassung: besprochene Immobilien mit Fakten/Kennzahlen (Probleme, Mieten, Belegung, Eigentum, Kaufinteressenten, frühere Angebote).",
      "Personen/Unternehmen mit Deal-Details, Verkaufsabsichten, Kaufregionen, Refinanzierungsplänen.",
      "Marktdaten für bestimmte Regionen (z. B. Renditen, Käuferaktivität).",
      "Kurz und prägnant, kein vollständiges Transkript, max. 2000 Zeichen je 10 Gesprächsminuten."
    ]
  },
  {
    "id": "call__familien_update_anruf",
    "category": "Call",
    "name": "Familien-Update-Anruf",
    "description": "Fasst Familienanrufe schnell zusammen. Erfasst wichtige Daten, um Entscheidungen und nächste Schritte nachzuverfolgen.",
    "gliederung": [
      "Extraktive Zusammenfassung der im Update-Anruf besprochenen Punkte.",
      "Kurz und klar halten.",
      "Visuelle Struktur (Aufzählungen/Abschnitte) für bessere Lesbarkeit.",
      "Relevante Daten und Termine zur Unterstützung von Analysen, Entscheidungen und nächsten Schritten einbeziehen."
    ]
  },
  {
    "id": "interview__forschungsinterview",
    "category": "Interview",
    "name": "Forschungsinterview",
    "description": "Für Forschungsinterviews entwickelt. Kontext und Fragen/Antworten eingeben; Kernpunkte und ein strukturiertes Protokoll erhalten.",
    "gliederung": [
      "Erfasst Zeit, Ort, interviewte Person.",
      "Einleitung: Überblick über Kontext und Hintergrund.",
      "Essenz: 2–3 zentrale Kernaussagen.",
      "Interviewverlauf: Fragen der interviewenden Person mit jeweiliger Antwort."
    ]
  },
  {
    "id": "interview__vorstellungsgesprach",
    "category": "Interview",
    "name": "Vorstellungsgespräch",
    "description": "Für Personalverantwortliche. Zeichnet Interviews als Stärken, Bedenken, Fragen/Antworten und Aufgaben auf.",
    "gliederung": [
      "Erfasst Zeit, Position, interviewte Person.",
      "Kandidatenübersicht: Werdegang, Beweggründe für Jobwechsel, Erwartungen, Verfügbarkeit, Gehaltsvorstellung.",
      "Mögliche Stärken: Beobachtung der interviewenden Person, Aussage der Kandidatin/des Kandidaten, KI-Einschätzung.",
      "Mögliche Bedenken: Beobachtung, Nachteile, KI-Risikoeinschätzung.",
      "Vertiefung wichtiger Erfahrungen mit Fragen/Antworten.",
      "Fragen & Antworten (beidseitig).",
      "To-do-Liste mit umsetzbaren Punkten."
    ]
  },
  {
    "id": "interview__podiumsdiskussion",
    "category": "Interview",
    "name": "Podiumsdiskussion",
    "description": "Für Interviewende und Teams: Panel-Details eingeben; TL;DR, Kernaussagen, Sprecher-Einblicke und Fragen/Antworten erhalten.",
    "gliederung": [
      "Erfasst Zeit, Ort, teilnehmende Personen.",
      "TL;DR: prägnante Zusammenfassung der Kernpunkte.",
      "Einleitung: kurze Vorstellung und Expertise je Person.",
      "Kernaussagen (primär/sekundär).",
      "Einblicke je Person mit geteilten Erkenntnissen.",
      "Kapitel mit Fragen an das Panel und Antworten je Person."
    ]
  },
  {
    "id": "interview__interview_transkript",
    "category": "Interview",
    "name": "Interview-Transkript",
    "description": "Verfeinert Interviewtext durch Korrektur von Fehlern und Entfernen von Füllwörtern. Identifiziert drei Kerndienstleistungen.",
    "gliederung": [
      "Transkribiert eine Interviewaufnahme, korrigiert Fehler und verbessert die Lesbarkeit unter Beibehaltung von Originaldialog und -ton.",
      "Korrigiert Grammatik, Rechtschreibung, Zeichensetzung; entfernt Füllwörter wie „äh\", „ähm\"; gliedert in Absätze.",
      "Behält wörtlichen Dialog so weit wie möglich bei, keine eigenen Gedanken oder Wortänderungen.",
      "Ausgabe als Absätze (keine Aufzählungen), entsprechend dem Gesprächscharakter.",
      "Im Anschluss: die drei wichtigsten vom Unternehmen für die interviewte Person erbrachten Leistungen identifizieren."
    ]
  },
  {
    "id": "interview__zusammenfassung",
    "category": "Interview",
    "name": "Zusammenfassung",
    "description": "Erstellt Team-Protokolle. Fasst den gesamten Inhalt klar mit Schlussfolgerung zusammen.",
    "gliederung": [
      "Erstellt eine detaillierte, klare Zusammenfassung eines Gesprächs für tägliche Meetings.",
      "Muss auch für nicht anwesende Personen verständlich sein, ohne besprochene Punkte auszulassen oder zu kürzen.",
      "Verständlicher, aber geschäftlicher Schreibstil.",
      "Am Ende: die wichtigsten Punkte als Aufzählung."
    ]
  },
  {
    "id": "interview__transkript_des_interviews_vollstandige_fragen_und_antworten",
    "category": "Interview",
    "name": "Transkript des Interviews – vollständige Fragen und Antworten",
    "description": "Wandelt Aufnahmen in wörtliche Frage-Antwort-Paare um. Korrigiert Fehler und entfernt Füllwörter für sauberen Fließtext.",
    "gliederung": [
      "Transkribiert eine Interviewaufnahme im Frage-Antwort-Format.",
      "Korrigiert Rechtschreib- und Zeichensetzungsfehler.",
      "Fragen und zugehörige Antworten ohne Zusammenfassung.",
      "Originalton und konkreter Dialog bleiben erhalten.",
      "Füllwörter werden entfernt; Text in Absätze gegliedert, die dem Gesprächsfluss entsprechen.",
      "Keine eigenen Gedanken oder Wortänderungen; Ausgabe ist ausschließlich die korrigierte Transkription in Absätzen."
    ]
  },
  {
    "id": "interview__interview",
    "category": "Interview",
    "name": "Interview",
    "description": "Für Personalverantwortliche. Extrahiert Signale und Sprechstatistiken aus Interviewaufnahmen.",
    "gliederung": [
      "Analysiert eine Interviewaufnahme, identifiziert interviewende und interviewte Person.",
      "Extrahiert Fragen der interviewenden Person und die damit beabsichtigten Signale.",
      "Erfasst Antworten der interviewten Person, ob die beabsichtigten Signale geliefert wurden und ob die Frage beantwortet wurde.",
      "Statistiken: Gesamtdauer, individuelle Sprechzeit je Person, Füllwörter mit Häufigkeit.",
      "Überblick über Stärken/Schwächen des Interviews und Einschätzung, ob die nächste Runde empfohlen wird."
    ]
  },
  {
    "id": "interview__interview_6_tage",
    "category": "Interview",
    "name": "Interview+6 Tage",
    "description": "Bewertet Kandidaten in sechs Dimensionen zur Unterstützung von Einstellungsentscheidungen und Feedback.",
    "gliederung": [
      "Erstellt einen Interviewbericht für Unternehmensverantwortliche nach festgelegtem Format.",
      "Abschnitte: Basisinformationen, Fachkompetenz, Erfahrung, Soft Skills, kulturelle Passung, Entwicklungspotenzial, Gesamteinschätzung, Abschlussempfehlung.",
      "Basisinformationen: Name, Position, Datum, interviewende Person, Interviewrunde, Gehaltsvorstellung, Verfügbarkeit.",
      "Fachkompetenz: Fragen/Antworten, Bewertung von Wissen und Problemlösung, Kommentare zu Stärken/Schwächen.",
      "Erfahrung: Bewertung der Passung zur Stelle, Beispiele ähnlicher Herausforderungen.",
      "Soft Skills: Kommunikation, Teamarbeit, Lernfähigkeit, Anpassungsfähigkeit, Konfliktlösung.",
      "Kulturelle Passung: Werte, Interesse am Unternehmen.",
      "Entwicklungspotenzial: Aufstiegschancen, Bewertung.",
      "Gesamteinschätzung mit Stärken, Risiken, Gesamteindruck.",
      "Abschlussempfehlung: Einstellungsempfehlung, nächste Runde, zu beobachtende Bereiche."
    ]
  },
  {
    "id": "interview__protokoll_der_zeugenbefragung",
    "category": "Interview",
    "name": "Protokoll der Zeugenbefragung",
    "description": "Formatiert Zeugenbefragungen in formelle Protokolle. Enthält Deckblätter, Erzählungen und Indizes.",
    "gliederung": [
      "Erstellt ein präzises Interviewprotokoll für Zeugenbefragungen zur Prozessvorbereitung.",
      "Professioneller, stenografischer Stil; exakte Wiedergabe des Ablaufs.",
      "Professioneller, prägnanter, grammatikalisch korrekter Ton.",
      "Chronologische Fließtext-Erzählung mit vollständigen Namen der sprechenden Personen.",
      "Verpflichtendes Deckblatt mit allen Beteiligten.",
      "Inhaltsverzeichnis der Hauptthemen.",
      "Index wichtiger Themen/Begriffe mit Seitenzahlen."
    ]
  },
  {
    "id": "interview__einzelinterview",
    "category": "Interview",
    "name": "Einzelinterview",
    "description": "Erstellt einen strukturierten Bericht mit Feedback, Kernpunkten und Aufgaben mit Fristen.",
    "gliederung": [
      "Führt ein Einzelgespräch zwischen Führungskraft und Mitarbeitendem durch (dokumentiert).",
      "Identifiziert die anwesenden Personen.",
      "Strukturierte Zusammenfassung des Gesprächs.",
      "Selbsteinschätzung: positive Punkte, Schwierigkeiten, Gefühle.",
      "Feedback der Führungskraft: Bewertung, Verbesserungsvorschläge, Empfehlungen.",
      "Einigungspunkte oder gemeinsam getroffene Entscheidungen.",
      "5–7 Kernpunkte aus dem Gespräch.",
      "Liste konkreter, umsetzbarer Maßnahmen mit Verantwortlichem und Frist.",
      "Optionaler Abschnitt „Sonstige Anmerkungen\"."
    ]
  },
  {
    "id": "interview__interviewanalyse",
    "category": "Interview",
    "name": "Interviewanalyse",
    "description": "Wandelt Transkripte in Zusammenfassungen mit Fragen/Antworten, Warnsignalen und Einstellungsempfehlungen um.",
    "gliederung": [
      "Strukturierte Vorlage zur Analyse und Zusammenfassung eines Vorstellungsgesprächs.",
      "Basisdaten: Name der Kandidatin/des Kandidaten, Position, Datum, interviewende Person.",
      "Frage-Antwort-Zusammenfassung je Interviewfrage.",
      "Eigene Fragen der Kandidatin/des Kandidaten mit Bewertung von Qualität/Absicht.",
      "Abschnitt „Warnsignale\" mit Gesamtbewertung des Risikoniveaus.",
      "Abschnitt „Positive Highlights\": Stärken, relevante Erfahrung, kulturelle Passung.",
      "„Nächste Schritte & zu klärende Punkte\": Empfehlung (weiter/absagen/zurückstellen) und Themen für weitere Gespräche.",
      "Gesamteindruck: kurze Einschätzung der Eignung."
    ]
  },
  {
    "id": "interview__ermittlerinterview",
    "category": "Interview",
    "name": "Ermittlerinterview",
    "description": "Fasst Interviews in professionelle Ich-Perspektive-Berichte für rechtliche und gerichtliche Zwecke zusammen.",
    "gliederung": [
      "Erstellt einen Ermittlungsbericht, der Erfahrungen, Beweise und Vorfalldetails in Ich-Form festhält.",
      "Der Bericht ist eine Zusammenfassung des Interviews, verfasst in Ich-Form, verständlich für das gesamte Team.",
      "Zielgruppe: Strafverfolgung, Staatsanwaltschaft, Verteidigung, Geschworene, Gericht.",
      "Beginnt mit Rolle der ermittelnden Person und Zuständigkeit.",
      "Enthält Vorlage für Namen, Datum, Ort des Interviews sowie anwesende weitere Beamte.",
      "Erwähnt, dass die Aussage aufgezeichnet und eine Kopie beigefügt wurde.",
      "Enthält eine Zusammenfassung der von der interviewten Person gegebenen Informationen.",
      "Endet mit Dauer der Aufnahme und Endzeit."
    ]
  },
  {
    "id": "interview__transkription_des_interviews",
    "category": "Interview",
    "name": "Transkription des Interviews",
    "description": "Ordnet den Aufnahmeinhalt nach Sprecher. Entfernt unnötige Ausdrücke und erstellt präzise Transkripte, ideal zum Teilen.",
    "gliederung": [
      "Regeln zur präzisen Transkription von Interviewaufnahmen für teilbare Notizen.",
      "Unterscheidet Sprecher als Interviewer „――\" und Befragte(r) \" \"; passt gesprochene Sprache in natürliche Sätze an.",
      "Gibt die Reihenfolge der Aussagen genau wieder; korrigiert Versprecher/Wiederholungen ohne Bedeutungsänderung; gliedert lange Aussagen in Absätze.",
      "Format: Name/Titel der sprechenden Person, sofern bekannt; Emotionen/Tonfall in Klammern.",
      "Mit Vermutung ergänzte Teile werden als „[Vermutet]\" markiert; unklare Wörter als „[Unklar]\"."
    ]
  },
  {
    "id": "interview__presseartikel",
    "category": "Interview",
    "name": "Presseartikel",
    "description": "Strukturiert Interviews zu neutralen Artikeln mit Titel, Analyse und klarer Zusammenfassung.",
    "gliederung": [
      "Erstellt informative, präzise und ansprechende Artikel für journalistische Interviews.",
      "Gründliche Recherche aus verlässlichen, vielfältigen Quellen; Prüfung der Glaubwürdigkeit.",
      "Kritische Analyse zur Identifikation relevanter Fakten, unterschiedlicher Sichtweisen und Implikationen.",
      "Struktur: einprägsamer Titel, Einleitung mit Thema und Kernfragen, ausgearbeiteter Hauptteil mit Zwischenüberschriften, Fazit mit Zusammenfassung und Ausblick.",
      "Neutraler, objektiver Stil, zugänglich und ansprechend formuliert.",
      "Überarbeitung und Faktenprüfung erforderlich.",
      "Einhaltung journalistischer Ethik (Unparteilichkeit, Wahrhaftigkeit, soziale Verantwortung)."
    ]
  },
  {
    "id": "interview__1on1_kpt",
    "category": "Interview",
    "name": "1on1【KPT】",
    "description": "Ordnet Erfolge und Herausforderungen aus Transkripten zur Klärung der nächsten Schritte. Bietet Dialogbewertung und Verbesserungsmethoden.",
    "gliederung": [
      "Extrahiert und ordnet den Inhalt eines 1:1-Gesprächs nach dem KPT-Rahmenwerk (Keep, Problem, Try).",
      "Keep: erreichte Ziele, wirksame Ansätze, gezeigte Stärken.",
      "Problem: dringende Probleme, Grundursachen, Ressourcenmangel.",
      "Try: Verantwortliche, konkrete Aufgaben, Fristen, Verbesserungsmaßnahmen, benötigte Unterstützung.",
      "Folgepunkte: beim nächsten Mal zu prüfende Punkte, wichtige Fristen/Kennzahlen.",
      "Lockerer Gesprächsteil: kurz notierte persönliche Themen/Gemeinsamkeiten.",
      "Expertenbewertung: Qualität des Dialogs, Problemlösungsgrad, Wachstumsförderung, Vertrauensaufbau, Klarheit der Maßnahmen (5er-Skala mit Begründung).",
      "Verbesserungsvorschläge: drei konkrete Vorschläge mit aktueller Situation und Umsetzung."
    ]
  },
  {
    "id": "medical__soap",
    "category": "Medical",
    "name": "SOAP",
    "description": "Für Behandelnde zur Dokumentation von Terminen. Anamnese, Symptome und Untersuchungen eingeben – klare SOAP-Notiz mit Plan.",
    "gliederung": [
      "Diagnostische Vorgeschichte: relevante frühere Diagnosen und Medikamentenhistorie.",
      "Subjektiv: berichtete Symptome/Beschwerden.",
      "Objektiv: körperliche Untersuchungsbefunde, Testergebnisse, diagnostische Beobachtungen.",
      "Assessment: aktuelle Diagnose auf Basis der Befunde, Differentialdiagnose.",
      "Plan: Verordnung, nächste Schritte/Untersuchungen, weiterer Behandlungsplan."
    ]
  },
  {
    "id": "medical__psychotherapie_notiz",
    "category": "Medical",
    "name": "Psychotherapie-Notiz",
    "description": "Für die Dokumentation von Therapiesitzungen. Erfasst Anliegen, Vorgeschichte und Plan in einer strukturierten Notiz.",
    "gliederung": [
      "Hauptanliegen: primäres psychologisches/emotionales Thema.",
      "Anamnese der aktuellen Beschwerden: Beginn, Verlauf, begleitende Symptome.",
      "Behandlungshistorie: Art und Ergebnis früherer Behandlungen.",
      "Psychischer Befund: Erscheinung, Verhalten, Stimmung.",
      "Therapeutische Interventionen: eingesetzte Techniken (z. B. KVT, Achtsamkeit, Psychoedukation).",
      "Plan: Empfehlungen für die weitere Behandlung, nächster Termin, Unterschrift."
    ]
  },
  {
    "id": "medical__gesundheitsberatung",
    "category": "Medical",
    "name": "Gesundheitsberatung",
    "description": "Für Sozialarbeitende entwickelt. Patientenkontext und Bedarf eingeben; strukturierte Konsultationsnotiz erhalten.",
    "gliederung": [
      "Hauptanliegen: primärer Beratungsgrund.",
      "Patienteninfos: soziale Vorgeschichte, Familiendynamik, psychosoziale Einschätzung, Unterstützungssystem, Bewältigungsstrategien, psychische Vorgeschichte, Substanzgebrauch, Wohn-/Finanzsituation, Patientenschulung.",
      "Beratungsleistung: Bedarfseinschätzung, Krisenintervention, Beratung/Unterstützung, Vermittlung an Gemeinschaftsressourcen, Behandlungsplanung, Prognose, Nachsorgeplan.",
      "Empfehlungen: Beratungs- und Überweisungsempfehlungen."
    ]
  },
  {
    "id": "medical__arztliche_beratung",
    "category": "Medical",
    "name": "Ärztliche Beratung",
    "description": "Erstellt medizinische Konsultationsberichte aus Arzt-Patienten-Gesprächen.",
    "gliederung": [
      "Extrahiert und strukturiert relevante medizinische Informationen aus der Konsultationsaufnahme zu einem vollständigen Krankenblatt.",
      "Erfasst vollständige Anamnese, Anzeichen/Symptome, Testergebnisse, körperliche Untersuchung, Diagnosehypothesen, Vorgehen, Anleitung, Medikamente/Allergien.",
      "Unterscheidet objektive und subjektive Informationen; schließt informelle Gespräche aus.",
      "Struktur: Anamnese, Anzeichen/Symptome, Verlauf der aktuellen Erkrankung, Vorerkrankungen, Untersuchungen, körperliche Untersuchung, Diagnosehypothesen, Vorgehen/Anleitung, Medikamente/Allergien.",
      "Klarer, objektiver, prägnanter, formaler und professioneller Stil.",
      "Zusammenfassung der Schlussfolgerungen/Empfehlungen, Medikamentenliste mit Dosierung."
    ]
  },
  {
    "id": "medical__soap_version_2",
    "category": "Medical",
    "name": "SOAP (Version 2)",
    "description": "Strukturiert Beschwerden, Untersuchungen und Maßnahmen in klinischen Notizen zur besseren Nachverfolgung.",
    "gliederung": [
      "S – Subjektiv: Bericht der Patientin/des Patienten über Beschwerden, Symptome, Empfindungen.",
      "O – Objektiv: beobachtbare, messbare Daten (körperliche Untersuchung, Laborergebnisse).",
      "A – Assessment: klinische Interpretation, Diagnosehypothesen, Verlauf.",
      "P – Plan: Maßnahmen und Anleitung (Verordnungen, Überweisungen).",
      "Strukturiert klinisches Denken, Kommunikation zwischen Fachpersonen und Patientennachverfolgung."
    ]
  },
  {
    "id": "medical__therapiesitzung",
    "category": "Medical",
    "name": "Therapiesitzung",
    "description": "Wandelt Therapienotizen in strukturierte Berichte um, um Emotionen, Themen und Muster zu verfolgen.",
    "gliederung": [
      "Transkribiert und fasst therapeutische Gespräche/Monologe strukturiert zusammen, mit Fokus auf emotionale Prozesse, wiederkehrende Muster, relevante Themen.",
      "Sitzungskontext & Zweck: Art der Sitzung, Grund/Anliegen, formuliertes Ziel der Klientin/des Klienten.",
      "Kernthemen & emotionaler Ton: Hauptthemen, geäußerte/beobachtete Emotionen, Momente von Spannung/Durchbruch.",
      "Persönlicher Inhalt & bedeutsame Ereignisse: geteilte Geschichten, bedeutsame Phrasen/Metaphern, Kernthemen wie Bindung/Trauma/Identität.",
      "Muster, Überzeugungen & Bewältigungsmechanismen: wiederkehrende Verhaltens-/Denkmuster, typische Bewältigungsstrategien.",
      "Erkenntnisse & Durchbrüche: neue Einsichten, Momente der Selbstwahrnehmung.",
      "Therapeutische Interventionen & Ansatz: eingesetzte Techniken, Reaktion der Klientin/des Klienten.",
      "Anliegen, Herausforderungen & Bedürfnisse: geteilte Sorgen, innere Konflikte, geäußerte Bedürfnisse.",
      "Vereinbarungen, Übungen & nächste Schritte: vereinbarte Folgeaufgaben, Ziele, Zeitplan.",
      "Klare, prägnante, neutrale und professionelle Sprache; persönlicher Ton bleibt erhalten, wo therapeutisch relevant."
    ]
  },
  {
    "id": "medical__soap_tiermedizin",
    "category": "Medical",
    "name": "SOAP+ (Tiermedizin)",
    "description": "Unterstützt Tierärzt:innen bei der Erfassung von Untersuchungsbefunden. Liefert strukturierte SOAP-Notizen und eine E-Mail an die Tierhalter:innen.",
    "gliederung": [
      "Strukturiertes Format für tierärztliche Konsultationen (SOAP) zur Nachverfolgung und Bewertung.",
      "Diagnostische Vorgeschichte: frühere Diagnosen, Medikamentenhistorie.",
      "Subjektiv: berichtete Symptome/Beschwerden.",
      "Objektiv: körperliche Untersuchungsbefunde (Verhalten, Gewicht, Vitalwerte, Herz/Lunge/Puls, Bauchpalpation, Haut, Bewegungsapparat, neurologisch usw.), konkrete Auffälligkeiten.",
      "Assessment: aktuelle Diagnose, mögliche Differentialdiagnosen.",
      "Plan: diagnostische Beobachtungen/Testergebnisse, verordnete Medikamente/Behandlungen, empfohlene Nachuntersuchungen, langfristige Behandlungsstrategie, abgelehnte Leistungen.",
      "Abschließend: E-Mail-Zusammenfassung für die Tierhalter:innen."
    ]
  },
  {
    "id": "medical__krankengeschichte",
    "category": "Medical",
    "name": "Krankengeschichte",
    "description": "Fasst Konsultationen in Krankengeschichten zusammen. Ordnet Hintergrund und Pläne für die medizinische Nachverfolgung.",
    "gliederung": [
      "Zusammenfassung im Format „Krankengeschichte\" mit klaren, prägnanten Abschnitten.",
      "Patientenidentifikation: vollständiger Name, Alter, Geschlecht, Konsultationsdatum, Aktennummer.",
      "Konsultationsgrund: Hauptgrund für die ärztliche Behandlung.",
      "Persönliche Vorgeschichte: chronische Erkrankungen, Allergien, frühere Operationen, relevante Krankenhausaufenthalte.",
      "Familienanamnese: relevante familiäre Erkrankungen.",
      "Nicht-pathologische Vorgeschichte: Rauchen, Alkohol, Ernährung, körperliche Aktivität.",
      "Aktuelle Erkrankung: Verlauf von Anzeichen/Symptomen, Beginn, Charakteristika.",
      "Körperliche Untersuchung: Vitalwerte und relevante Befunde.",
      "Labor-/Untersuchungsergebnisse: kurze Darstellung relevanter Befunde.",
      "Diagnostische Einschätzung: wahrscheinliche Diagnosen.",
      "Behandlungsplan: medikamentöse Therapie, nicht-medikamentöse Maßnahmen, weiterführende Untersuchungen, Überweisungen.",
      "Prognose: gut, vorsichtig oder schlecht.",
      "Empfehlungen und Nachsorge: Anweisungen und Termin der nächsten Konsultation."
    ]
  },
  {
    "id": "medical__fortschritte_bei_der_unterstutzung_der_hauslichen_pflege",
    "category": "Medical",
    "name": "Fortschritte bei der Unterstützung der häuslichen Pflege",
    "description": "Fasst den Inhalt von Hausbesuchen zusammen und dokumentiert den Fortschritt der Unterstützung.",
    "gliederung": [
      "Fasst Situation und Gespräch während eines Hausbesuchs in ca. 250 Zeichen zusammen.",
      "Enthält einen Hinweis zur Vorlage/Genehmigung des Leistungsnachweises.",
      "Besuchszeit im Format „HH:MM–HH:MM\".",
      "Für die Genehmigung des Leistungsnachweises wird der Folgemonat des Eintragsdatums verwendet."
    ]
  },
  {
    "id": "medical__fortschrittsbericht",
    "category": "Medical",
    "name": "Fortschrittsbericht",
    "description": "Sitzungen sollten in Fortschrittsberichten zusammengefasst werden.",
    "gliederung": [
      "Erstellt einen Fortschrittsbericht durch Zusammenfassung eines Transkripts und therapeutischer Beobachtungen.",
      "Prägnante Aufzählungspunkte, vorsichtige Formulierung klinischer Annahmen, klientenzentrierte Planung.",
      "Bei Transkriptionsfehlern: gemeinter Sinn wird erschlossen, unsichere Stellen mit Zeitangabe markiert.",
      "„Subjektiv\": Zusammenfassung der Erzählung der Klientin/des Klienten.",
      "„Beobachtung\": wahrgenommenes Verhalten, Reaktionen, Vergleich zu vorherigen Sitzungen.",
      "„Einschätzung & Maßnahme\": Verständnis des Anliegens, ergriffene Maßnahmen, Interventionen, Hypothesen mit Belegen.",
      "„Planung\": Plan für die nächste Sitzung, Behandlungsziele, nächster Termin."
    ]
  },
  {
    "id": "medical__uberwachungsbogen_fur_pflegemanager_anhang_zum_unterstutzungsfortschritt",
    "category": "Medical",
    "name": "Überwachungsbogen für Pflegemanager, Anhang zum Unterstützungsfortschritt",
    "description": "Organisiert Überwachungstabellen und unterstützt den Fortschritt anhand von Audioaufnahmen von Besuchen.",
    "gliederung": [
      "Regeln zur Erstellung von Aufzeichnungen aus Audiodaten von Überwachungsbesuchen, in zwei Formaten: Zusammenfassung für den Überwachungsbogen und detaillierte Aufzeichnung für den Unterstützungsfortschritt.",
      "Dokumentation statt Bericht: kein Hintergrund/Eindrücke, sachliche, deklarative Aussagen ohne Wiederholung.",
      "Für den Überwachungsbogen: prägnante Zusammenfassung (max. 180 Zeichen, Fazit zuerst) unter „Gesamtbewertung, neue Anliegen, Vorgehen\".",
      "Für den Unterstützungsfortschritt: ca. 300 Zeichen mit festgelegten Punkten wie „Hausbesuch/Überwachung\"."
    ]
  },
  {
    "id": "medical__psychologische_sitzung",
    "category": "Medical",
    "name": "Psychologische Sitzung",
    "description": "Fasst Sitzungen zusammen, indem Zyklen und Ressourcen identifiziert werden, zur Unterstützung von Analyse und Nachverfolgung.",
    "gliederung": [
      "Verarbeitet eine klinische Aufnahme einer psychologischen Sitzung zur Strukturierung, Hypothesenbildung und Planung der nächsten Sitzung.",
      "Strukturierte Zusammenfassung: Konsultationsgrund, emotionaler Zustand, relevante Fakten, wiederkehrende Ideen, bedeutsame Beziehungen, nonverbale Sprache, wirksame Interventionen.",
      "Hauptideen und kritische Knoten: 3–5 Kernpunkte zu inneren Dilemmata, Grundüberzeugungen, Konflikten.",
      "Individueller Zyklus (Gedanke – Emotion – Verhalten): dysfunktionaler oder funktionaler Zyklus zum aktuellen Problem.",
      "Beziehungsmuster: wie die Person sich mit wichtigen Bezugspersonen verbindet oder abgrenzt.",
      "Lösungsversuche: Verhaltensweisen zur Bewältigung/Vermeidung von Unbehagen.",
      "Konzeptkarte des Falls als Textschema.",
      "Ressourcen der Person: vorhandene oder zu stärkende Fähigkeiten.",
      "Vorschläge für die nächste Sitzung: 2–4 mögliche therapeutische Schwerpunkte."
    ]
  },
  {
    "id": "medical__begegnung_mit_einem_notarzt",
    "category": "Medical",
    "name": "Begegnung mit einem Notarzt",
    "description": "Organisiert Gespräche in der Notaufnahme in medizinischen Dokumentationen.",
    "gliederung": [
      "Füllt eine Vorlage für Notaufnahme-Begegnungen anhand eines transkribierten Gesprächs aus.",
      "Anamnese (HPI) muss rein subjektiv sein, ohne objektive Befunde/Testergebnisse.",
      "Enthält rechtlich relevante vermutete positive/negative Befunde aus dem Gesprächskontext.",
      "Medizinische Entscheidungsfindung (MDM): Eindruck, geprüfte Diagnosen, Labor-/Bildgebungsbefunde, Behandlungsplan, Verschreibungen, Diagnose, weiteres Vorgehen, Entlassungsanweisungen.",
      "Keine Hervorhebung außer bei Abschnittsüberschriften; Vermeidung problematischer Sonderzeichen.",
      "Körperliche Untersuchung nach vorgegebener Vorlage anpassen.",
      "Differentialdiagnose in Fließtext."
    ]
  },
  {
    "id": "medical__leitfaden_zur_arzneimittelabgabe_in_apotheken_soap",
    "category": "Medical",
    "name": "Leitfaden zur Arzneimittelabgabe in Apotheken (SOAP)",
    "description": "Erstellt eine SOAP-Medikamentenleitlinie aus Audioaufnahmen.",
    "gliederung": [
      "Regeln zur Zusammenfassung von Medikationsberatungen (Apotheke) je Patient im SOAP-Format.",
      "Ziel: präzise und prägnante Dokumentation zur Unterstützung der Arzneimitteltherapie und Lebensqualität.",
      "Betrifft Eins-zu-eins-Gespräche zwischen Apotheker:in und Patient:in.",
      "Wandelt gesprochene Sprache in natürliche Schriftsprache um, prägnant, faktenbasiert, ohne finanzielle Angaben.",
      "S (Subjektiv): Selbstbericht der Patientin/des Patienten in Umgangssprache.",
      "O (Objektiv): vom Apotheker/von der Apothekerin bestätigte Fakten (Verordnungsdetails, Restmedikation).",
      "A (Assessment): pharmazeutische Einschätzung.",
      "P (Plan): unterteilt in EP (Beratungsinhalt), CP (Betreuungsplan), OP (Beobachtungsplan)."
    ]
  },
  {
    "id": "medical__psychiatrische_begutachtung",
    "category": "Medical",
    "name": "Psychiatrische Begutachtung",
    "description": "Strukturiert Vorgeschichte, psychischen Befund und Risikofaktoren zu klaren Begutachtungsnotizen.",
    "gliederung": [
      "Psychiatrische Begutachtung für Fachpersonal.",
      "Subjektiv: Grund des Besuchs, Verlauf der aktuellen Erkrankung, medizinische/psychiatrische Vorgeschichte, Familienanamnese, soziale Vorgeschichte, Substanzgebrauch.",
      "Psychiatrisches Systemreview: Depression, Angst, Schlaf, Appetit, Suizidalität/Fremdgefährdung, Halluzinationen, Wahn, Manie, ADHS und weitere Zustände.",
      "Objektiv: Befunde des psychischen Status (Erscheinung, Verhalten, motorische Aktivität, Sprache, Stimmung, Affekt, Denkprozesse, Kognition, Risikoeinschätzung).",
      "Assessment: Diagnose, Ausschlussdiagnosen, Schutz-/Risikofaktoren, Risikoeinschätzung.",
      "Eindruck/Formulierung: Zusammenfassung des aktuellen Status und Ansprechens auf Behandlung."
    ]
  },
  {
    "id": "sales__bant",
    "category": "Sales",
    "name": "BANT",
    "description": "Für Vertriebsmitarbeitende. Budget, Entscheidungsbefugnis, Bedarf und Zeitrahmen aus Meetings erfassen, um eine klare BANT-Zusammenfassung zu erhalten.",
    "gliederung": [
      "Erfasst Datum/Uhrzeit, Ort, Teilnehmende.",
      "Budget: finanzielle Mittel der Kundschaft.",
      "Entscheidungsbefugnis: Einflussfaktoren, Beteiligte am Entscheidungsprozess.",
      "Bedarf: detaillierte Beschreibung des Kundenbedarfs.",
      "Zeitrahmen: detaillierter Zeitplan mit wichtigen Terminen und Meilensteinen."
    ]
  },
  {
    "id": "sales__verkaufsgesprach_kundenaufnahme",
    "category": "Sales",
    "name": "Verkaufsgespräch / Kundenaufnahme",
    "description": "Erstellt Verkaufsnotizen aus Kundengesprächen.",
    "gliederung": [
      "Erstellt eine Vertriebsnotiz mit Kundenbedarf, möglicher Lösung, besprochenen Produkten und Folgeaktionen.",
      "Titel: „Kundengespräch – [Firmenname] – [Datum]\".",
      "Enthält den Kundenbedarf, besprochene Produkte/Dienstleistungen, technische Anforderungen, Einwände/Punkte zur Beachtung sowie vereinbarte Folgeaktionen."
    ]
  },
  {
    "id": "sales__geschaftstreffen",
    "category": "Sales",
    "name": "Geschäftstreffen",
    "description": "Verwandelt Kundenmeetings in Berichte mit Themen, Teilnehmenden und offenen Aktionen.",
    "gliederung": [
      "Erstellt einen professionellen, prägnanten, strukturierten Geschäftsbericht aus Daten eines Kundenbesuchs.",
      "Felder: Titel, Kunde, Opportunity, Datum, Besuchsart.",
      "Weitere Felder: Besuchszweck, Kundenteilnehmende, besprochene Themen, offene Aktionen.",
      "Abschließende Bemerkungen werden ebenfalls aufgenommen."
    ]
  },
  {
    "id": "sales__kundengesprach_client_meeting",
    "category": "Sales",
    "name": "Kundengespräch (client meeting)",
    "description": "Erstellt strukturierte Verkaufsprotokolle.",
    "gliederung": [
      "Erstellt einen professionellen, strukturierten, direkt umsetzbaren Bericht aus einer Audioaufnahme eines Kundengesprächs.",
      "Analysiert die Aufnahme für eine vollständige, klare Zusammenfassung.",
      "Teilnehmerliste mit Details (Vorname, Nachname, Rolle, Unternehmen).",
      "Objektive, flüssige, prägnante Zusammenfassung des Austauschs inkl. Gesprächsdynamik.",
      "Kundenbedarf (Bereiche, Herausforderungen, Erwartungen, Einschränkungen) und vorgeschlagene Lösungen.",
      "Entscheidungen und Folgeaktionen mit Verantwortlichem und Frist.",
      "Professioneller, neutraler, sachlicher Ton; fehlende/unklare Informationen werden klar gekennzeichnet."
    ]
  },
  {
    "id": "sales__verkaufsgesprach_discovery_call",
    "category": "Sales",
    "name": "Verkaufsgespräch (Discovery Call)",
    "description": "Extrahiert Kontaktdaten, fasst Bedarf zusammen und recherchiert Unternehmensdaten zur Bewertung von Chancen.",
    "gliederung": [
      "Erstellt detaillierte Notizen aus Sprachaufnahmen von Vertriebsanrufen für ein Vertriebsteam.",
      "Kontaktinformationen oben: Namen (korrigierte Schreibweise), Telefon, E-Mail, Website, Adresse, Datum, Uhrzeit.",
      "Zusammenfassung: kurzer Überblick über den Anruf, Unternehmensdetails, identifizierter Bedarf, Aufgabenliste mit Verantwortlichen und Fristen.",
      "Vorab-Recherche: Profil der Kontaktperson (Name, Unternehmen, Social-Media-Profile), hilfreiche Online-Informationen.",
      "Unternehmensrecherche: Standorte, Zentrale, Geschäftsberichte, Umsatz, Bonität.",
      "Chancenbewertung: passende Angebote je nach Bedarf, eingestuft als Ausgezeichnet/Gut/Mittel/Schlecht.",
      "Stark strukturiert mit Kategorien/Unterkategorien und Aufzählungspunkten."
    ]
  },
  {
    "id": "sales__kundengesprach_zusammenfassung_ma_nahmen",
    "category": "Sales",
    "name": "Kundengespräch – Zusammenfassung & Maßnahmen",
    "description": "Hilft Fachleuten, Kundengespräche in Kernentscheidungen und strukturierte Aufgaben zu ordnen.",
    "gliederung": [
      "Kundenname und Teilnehmende (Namen/Rollen).",
      "Zusammenfassung des Meetings: 5–8 prägnante, kritische Entscheidungen/Diskussionspunkte.",
      "Aufgaben: Tabelle mit Aufgabe, Verantwortlichem, Frist, Status.",
      "Vollständige Notizen/Transkript-Highlights: Detailpunkte zur Referenz, nicht essenziell für schnelle Durchsicht."
    ]
  },
  {
    "id": "sales__neu_formulieren_menschen_inspirieren_uberzeugen_und_zum_handeln_bewegen_uvp_cta",
    "category": "Sales",
    "name": "Neu formulieren – Menschen inspirieren, überzeugen und zum Handeln bewegen (UVP, CTA)",
    "description": "Wandelt Text in überzeugenden Werbetext um. Verfeinert Ton und Struktur für mehr Engagement und Conversions.",
    "gliederung": [
      "Wandelt Text in eine zielgruppengerechte, überzeugende Version um, die alle wesentlichen Informationen erhält.",
      "Prägnanz: Redundanzen entfernen, Passivsätze vermeiden, Wortzahl um 20–80 % reduzieren.",
      "Klarheit & Fluss: logische Struktur (Problem-Lösung/Storytelling), gute Lesbarkeit.",
      "Engagement & Überzeugung: Anpassung des Tons, Ich-/Du-Perspektive, Analogien, psychologische Trigger (Dringlichkeit, Knappheit, soziale Bewährtheit), starke Handlungsaufforderungen.",
      "Struktur: Einleitung mit Hook, Hauptteil nach Priorität mit Belegen, Fazit mit einprägsamem CTA.",
      "Storytelling nach dem SUCCESs-Modell (einfach, unerwartet, konkret, glaubwürdig, emotional, Geschichten).",
      "Erfolgsmessung: Kompressionsrate, Klarheitswert, Lesbarkeitsniveau, aktive Sprache, Conversion-Wirkung."
    ]
  },
  {
    "id": "sales__absicht_intent",
    "category": "Sales",
    "name": "Absicht (Intent)",
    "description": "Analysiert Transkripte, um die Absicht zu erkennen. Liefert Reaktionsstrategien basierend auf Gesprächshinweisen.",
    "gliederung": [
      "Analysiert Verkaufsgespräch-Transkripte, um die zugrunde liegende Absicht jenseits wörtlicher Aussagen zu erkennen.",
      "Vier diagnostische Linsen: emotionale Kadenz (Intensitätswechsel), Bedeutung von Pausen, Gewicht der Worte (Unsicherheit/Vermeidung), Kontextbewusstsein (kulturelle/situative Einflüsse).",
      "Ausgabe als „Intelligence Brief\" mit drei Abschnitten: Hauptvermutung zur Absicht mit Konfidenzniveau, diagnostische Belege mit konkreten Textstellen, strategische Reaktionsempfehlung."
    ]
  },
  {
    "id": "sales__coaching_fur_verkaufsgesprache",
    "category": "Sales",
    "name": "Coaching für Verkaufsgespräche",
    "description": "Bewertet ausgehende Anrufe in fünf Vertriebsphasen. Identifiziert Stärken und Entwicklungsbereiche.",
    "gliederung": [
      "Fokus auf Outbound-Vertriebstraining, Gliederung in fünf Phasen.",
      "Einführungsphase: Erstkontakt.",
      "Qualifizierende Fragen zum Aufbau von Beziehung und Bedarfsverständnis.",
      "Präsentationsphase: Bewertung der Informationsvermittlung.",
      "Bewertung: Verkaufstaktiken, Einwandbehandlung, Abschlusstechniken.",
      "Coaching hebt sowohl erfolgreiche Aspekte als auch Verbesserungsbereiche hervor."
    ]
  },
  {
    "id": "sales__au_endienst",
    "category": "Sales",
    "name": "Außendienst",
    "description": "Protokolliert Meeting-Zusammenfassungen und Aufgaben. Hilft Vertriebsteams, Kundenbesuche zu organisieren und nachzuverfolgen.",
    "gliederung": [
      "Erfasst Außendienst-Interaktionen: wer getroffen wurde und Hauptthemen.",
      "Erfasst das Datum der Interaktion.",
      "Kurze Beschreibung der getroffenen Personen und Hauptthemen.",
      "Umsetzbare Punkte und Folgeaufgaben als nächste Schritte."
    ]
  },
  {
    "id": "sales__geschaftstreffen_business_meeting",
    "category": "Sales",
    "name": "Geschäftstreffen (Business Meeting)",
    "description": "Wandelt Transkripte in Protokolle um. Organisiert Ziele und Maßnahmen in klaren Tabellen für die Teamsteuerung.",
    "gliederung": [
      "Erstellt ein Verkaufsprotokoll aus einem Transkript mit festen Themen.",
      "Datum, Uhrzeit, Teilnehmende, besprochene Agenda.",
      "Zusammenfassung mit positiven Punkten, Schwierigkeiten, Vorschlägen.",
      "Wochenziele in Tabellenform.",
      "Definierte Maßnahmen und Verantwortliche in Tabellenform.",
      "Abschlusskommentare und Datum des nächsten Meetings."
    ]
  },
  {
    "id": "sales__kreative_ideen_und_brainstormings",
    "category": "Sales",
    "name": "Kreative Ideen und Brainstormings",
    "description": "Ordnet Ideen in Maßnahmen. Trennt Entwürfe und extrahiert Formulierungen für Pitches und Kampagnen.",
    "gliederung": [
      "Identifiziert Kernideen, ihre Zusammenhänge und mögliche Maßnahmen.",
      "Trennt Entwürfe und extrahiert Auszüge für Pitches, Posts oder Kampagnen."
    ]
  },
  {
    "id": "sales__verkaufsgesprach_sales_conversation",
    "category": "Sales",
    "name": "Verkaufsgespräch (Sales Conversation)",
    "description": "Extrahiert Fragen und Antworten aus Geschäftsverhandlungen. Schließt Smalltalk aus und dokumentiert Hintergrund, konkrete Antworten und Meinungsaustausch strukturiert.",
    "gliederung": [
      "Geeignet für einseitige Frage-Antwort-Szenarien.",
      "Begrüßungen, Smalltalk und Themenabweichungen werden nicht aufgenommen.",
      "Nur geschäftsrelevante Fragen, Antworten, Erklärungen und Meinungsaustausch werden erfasst.",
      "Hintergrundinformationen aus dem Beratungsgespräch werden zusammengefasst.",
      "Fragen und zugehörige Antworten werden festgehalten."
    ]
  },
  {
    "id": "consulting__kundenbedurfnisse",
    "category": "Consulting",
    "name": "Kundenbedürfnisse",
    "description": "Bei Kundengesprächen Kontext und Ziele erfassen. Notizen hinzufügen; ein Briefing mit Aufgaben und Vorschlägen erhalten.",
    "gliederung": [
      "Erfasst Datum/Uhrzeit, Ort, Auftraggeber:in.",
      "Überblick über die Kundensituation.",
      "Hintergrund des Unternehmens/Kunden.",
      "Schwachstellen/Probleme.",
      "Erwartungen der Kundschaft.",
      "Zusätzliche Informationen.",
      "To-dos mit konkreten Maßnahmen.",
      "KI-Vorschläge mit Lösungsansätzen."
    ]
  },
  {
    "id": "consulting__anwaltsmodell",
    "category": "Consulting",
    "name": "Anwaltsmodell",
    "description": "Für Rechtsteams. Erstellt Protokolle mit Aufgaben, Fristen und Verantwortlichkeiten in klarer, strukturierter Form.",
    "gliederung": [
      "Erstellt eine umfassende Zusammenfassung juristischer Besprechungen mit Themen, Folgemaßnahmen, Fristen, Verantwortlichen und Kernpunkten.",
      "Von professioneller Rechtsassistenz verfasst, logisch aufgebaut, klar, mit präziser Fachterminologie.",
      "Formaler, direkter, objektiver Ton, angemessene Fachsprache ohne übermäßiges „Juristendeutsch\".",
      "Zielgruppe: Partner und Mitglieder des Rechtsteams zur internen Dokumentation.",
      "Markdown-Format mit Überschriftenebenen (## und ###), Folgepunkte als Listen mit Datum und Verantwortlichem.",
      "Themen nummeriert oder als Aufzählung, mit Datum und Verantwortlichem wo möglich."
    ]
  },
  {
    "id": "consulting__gesprach_mit_experten",
    "category": "Consulting",
    "name": "Gespräch mit Experten",
    "description": "Wandelt Transkripte in strukturierte Notizen um. Erfasst wörtliche Zitate, Entscheidungen und Aufgaben.",
    "gliederung": [
      "Verarbeitet Expertentreffen und extrahiert einzigartige Formulierungen und Erkenntnisse der Teilnehmenden.",
      "Rolle: Experten-Interviewerin/Berater:in, die charakteristische Sprache und Ideen herausarbeitet.",
      "Professioneller, neutraler Ton; längere Notizen bevorzugt für Genauigkeit.",
      "Entwickelt detaillierte, professionell strukturierte Meeting-Notizen, die den gesamten Gesprächsverlauf abbilden.",
      "Wörtliche Zitate werden erfasst und hervorgehoben, besonders bei prägnanten Formulierungen.",
      "Struktur folgt dem zeitlichen Ablauf: Vorstellungen, Projekt-Updates, Kerndiskussionen, Entscheidungen, Aufgaben, Expertenbeiträge, nächste Schritte.",
      "Alle genannten Namen/Organisationen werden mit Kontext erfasst.",
      "Entscheidungen mit Verantwortlichen und Begründung werden hervorgehoben.",
      "Aufgaben mit Verantwortlichen, Fristen und Kontext werden extrahiert.",
      "Wichtige Fragen und gegebene Antworten werden dokumentiert."
    ]
  },
  {
    "id": "consulting__psychoanalytiker",
    "category": "Consulting",
    "name": "Psychoanalytiker",
    "description": "Erforscht psychische Beweggründe in Sprachaufzeichnungen zur Unterstützung von Ordnung und Verständnis innerer Dynamiken.",
    "gliederung": [
      "Führt eine schrittweise psychoanalytische Untersuchung der Psyche einer sprechenden Person basierend auf einer Sprachtranskription durch.",
      "Ziel: Beziehungsmuster, Kernkonflikte und unbewusste Dynamiken der inneren Welt beleuchten.",
      "Rolle basiert auf klassischem und zeitgenössischem psychoanalytischem Denken (Freud, Klein, Jung, Lacan).",
      "Untersucht unbewusste Motive und Konflikte, Abwehrstrukturen, Entwicklungsgeschichte und Beziehungsmuster, symbolische Bedeutung der Kommunikation.",
      "Methodisch: Interpretationen werden mit Belegen aus dem Transkript untermauert, Beobachtungen von Schlussfolgerungen getrennt, Interpretationen als Arbeitshypothesen behandelt."
    ]
  },
  {
    "id": "consulting__experte_fur_managementberatung",
    "category": "Consulting",
    "name": "Experte für Managementberatung",
    "description": "Wandelt Meeting-Transkripte in strukturierte Berichte mit Kernentscheidungen und strategischen Maßnahmen um.",
    "gliederung": [
      "Fasst ein Meeting-Transkript aus Sicht einer Top-Managementberatung zusammen, mit Fokus auf umsetzbare Erkenntnisse für die Geschäftsführung.",
      "Klares, prägnantes Format mit Aufzählungspunkten und eigenen Abschnittsüberschriften.",
      "Hervorhebung: wichtige Maßnahmen mit Verantwortlichem und Frist, zentrale strategische Themen/Entscheidungen, Risiken/offene Punkte, Verbesserungs-/Wettbewerbschancen, zukunftsgerichtete Empfehlungen.",
      "Fokus auf wirkungsvolle Handlungen und Erkenntnisse, keine allgemeinen Aussagen."
    ]
  },
  {
    "id": "consulting__zusammenfassung_des_treffens",
    "category": "Consulting",
    "name": "Zusammenfassung des Treffens",
    "description": "Erstellt Protokolle mit Kundenanfragen, Angeboten, Fristen und nächsten Schritten.",
    "gliederung": [
      "Fasst Meeting- oder Verkaufsgesprächstranskripte zusammen, insbesondere für Vertriebstraining/-coaching.",
      "Detailliert Kundenbedarf, zu erfüllende Anforderungen und zu beachtende Punkte.",
      "Wörtliche Zitate aus dem Gespräch, besonders als Beispiele für Fortschrittskontrolle, werden unverändert wiedergegeben.",
      "Nächste Schritte werden aus dem Gespräch abgeleitet.",
      "Vereinbarte Konditionen, Fristen und Dateiformate unter „Rahmenbedingungen\".",
      "Professioneller Stil aus Vertriebsperspektive.",
      "Abschließend: noch ungeklärte oder zu klärende Punkte."
    ]
  },
  {
    "id": "consulting__verhaltensanalytiker",
    "category": "Consulting",
    "name": "Verhaltensanalytiker",
    "description": "Analysiert Meeting-Transkripte, um Bedürfnisse der Sprechenden und umsetzbare Einflussstrategien zu identifizieren.",
    "gliederung": [
      "Erstellt Verhaltensprofile nach dem Sechs-Bedürfnisse-Rahmenwerk (6MX-System).",
      "Analysiert Zoom-Meeting-Transkripte zur Erstellung verhaltensbasierter Sprecherprofile.",
      "Fokus ausschließlich auf beobachtbares Verhalten, Sprache und Interaktionsstil – keine Persönlichkeitstypologien.",
      "Sechs Kernbedürfnisse: Bedeutsamkeit, Akzeptanz, Anerkennung, Intelligenz, Mitleid, Stärke – mit zugehörigen Sprachsignalen.",
      "Je Hauptsprecher: 1–2 primäre Bedürfnisse mit Belegen, wahrscheinlicher emotionaler Treiber, konkrete Verhaltensindikatoren, wirksame Einflussstrategie.",
      "Bei begrenztem Material: Fokus auf Sprachstil, Wortwahl, Tonmarker.",
      "Praktisch nutzbar für Beeinflussung, Verhörvorbereitung, Rekrutierung oder Entscheidungsfindung."
    ]
  },
  {
    "id": "consulting__beratung_consulting",
    "category": "Consulting",
    "name": "Beratung (Consulting)",
    "description": "Analysiert Beratungssitzungen, um Herausforderungen zu diagnostizieren und praktische, klare Aktionspläne vorzuschlagen.",
    "gliederung": [
      "Analysiert Beratungssitzungs-Transkripte zur Identifikation von Problemen, Herausforderungen und Chancen.",
      "Rolle: analytisch, tiefgehend, lösungsorientiert, strategisch, praktisch, konstruktiv-provokant.",
      "Erste Analyse: zentrales Thema, Gesprächspartner, erkennbares Ziel der Sitzung.",
      "Tiefendiagnose: explizite Probleme, Ursachen, geschäftliche Auswirkungen, implizite/unterschwellige Herausforderungen.",
      "Chancen und Lösungen: Prozessoptimierung, Automatisierung/KI, weitere strategische Lösungen.",
      "Prozessoptimierung: Engpässe identifizieren, Workflow-Neugestaltung vorschlagen.",
      "Automatisierung/KI: repetitive Aufgaben für Automatisierung/KI-Einsatz identifizieren.",
      "Strategische Lösungen: Schulung, Umstrukturierung, neue Tools, Kulturwandel.",
      "Struktur: verfeinerte Diagnose, Handlungswege (Prozessoptimierung, KI-Potenzial, strategische Lösungen), nächste Schritte."
    ]
  },
  {
    "id": "consulting__coaching_evaluation",
    "category": "Consulting",
    "name": "Coaching-Evaluation",
    "description": "Erstellt Protokolle und Kundenberichte mit Aufgaben aus Coaching-Transkripten.",
    "gliederung": [
      "Analyse von Coaching-Gesprächstranskripten für Coaching-Termine.",
      "Basisinformationen: Titel, Ort, Datum, Uhrzeit, Teilnehmende.",
      "Interne Analyse für Coach: Themenüberblick nach Gesprächsverlauf (Smalltalk, Rückblick, Hauptthema, nächste Schritte).",
      "Größte Erkenntnis der Klientin/des Klienten wird festgehalten.",
      "Vollständige Liste wörtlicher Zitate sowie vereinbarter To-dos/Hausaufgaben.",
      "Auffällige/emotionale Reaktionen werden notiert.",
      "Externe Kundenversion: wertschätzende, motivierende Reflexion in „Du\"-Form.",
      "Klare Zusammenfassung des heutigen Inhalts für die Kundenversion.",
      "Größte Erkenntnis als hervorgehobenes Zitat.",
      "Klare Aufgabenliste bis zur nächsten Sitzung.",
      "Interne Version: prägnant, effizient, sachlich. Kundenversion: inspirierend, klar verständlich."
    ]
  },
  {
    "id": "consulting__vollstandige_protokollierung_und_aktionsubersicht_des_meetings_auditbereit",
    "category": "Consulting",
    "name": "Vollständige Protokollierung und Aktionsübersicht des Meetings – Auditbereit",
    "description": "Professionelle Zusammenfassungen aus Transkripten. Enthält Kernerkenntnisse, Entscheidungen und klare Aufgaben.",
    "gliederung": [
      "Erstellt eine geschäftsformale, auditfähige Zusammenfassung für interne Teams, Führungskräfte und Stakeholder.",
      "Struktur: Titel, Überblick/Kontext, detaillierte Notizen (logisch geordnet), Kernpunkte & Erkenntnisse, Entscheidungen, Aufgaben, offene Fragen/Diskussionspunkte, weitere zu recherchierende Themen, Folgeplan/nächstes Meeting.",
      "Relevantes Material wird aufgenommen, Smalltalk/Begrüßungen/Wiederholungen ausgelassen; Sprechernamen und Zeitstempel bei wichtigen Aussagen.",
      "Zur besseren Lesbarkeit umformuliert unter Beibehaltung der ursprünglichen Bedeutung; vollständig formatiert zum Einfügen in ein Google Doc."
    ]
  },
  {
    "id": "consulting__therapie",
    "category": "Consulting",
    "name": "Therapie",
    "description": "Strukturiert Themen, Ratschläge und Erkenntnisse nach der Sitzung zur Fortschrittsverfolgung.",
    "gliederung": [
      "Sitzungskontext: Gedanken/Zustand vor der Sitzung, Hauptgrund/Auslöser, vorherrschende Gefühle zu Beginn.",
      "Hauptthemen: meistbesprochene Inhalte, geäußerte Ängste/Zweifel, innere Konflikte, Einfluss des äußeren Kontexts.",
      "Therapiefokus: Schwerpunkte der Therapeutin/des Therapeuten, erkennbare Überzeugungen/Muster, eingesetzte Techniken.",
      "Erkenntnisse & Entdeckungen: Selbsterkenntnisse, beobachtete Zusammenhänge zwischen Gedanken und Gefühlen.",
      "Ratschläge/Empfehlungen: konkrete Empfehlungen, „Hausaufgaben\"/Übungen.",
      "Zustand am Ende der Sitzung: Veränderungen, Ruhe/Klarheit/Zuversicht, mitgenommene Gefühle/Gedanken."
    ]
  },
  {
    "id": "consulting__besuchsbericht_fur_steuerberaterburos_medizinische_mandanten",
    "category": "Consulting",
    "name": "Besuchsbericht (Für Steuerberaterbüros / medizinische Mandanten)",
    "description": "Steuerberatungsbüros dokumentieren Treffen mit medizinischen Führungskräften. Organisiert Gesprächsverlauf, Schlussfolgerungen, Smalltalk und Hausaufgaben in einem Bericht.",
    "gliederung": [
      "Optimiert für Mitarbeitende von Steuerberatungsbüros, die medizinische Mandanten betreuen.",
      "Heutige Agenda wird prägnant aufgelistet.",
      "Schlussfolgerungen zur heutigen Agenda und der Weg dorthin werden detailliert beschrieben.",
      "Auch nicht arbeitsbezogene Themen werden zur Wiedergabe der Gesprächsatmosphäre aufgenommen.",
      "Aufgaben werden zusammengefasst.",
      "Datum und Uhrzeit künftiger Besuche werden festgehalten."
    ]
  },
  {
    "id": "consulting__prozessabbildung",
    "category": "Consulting",
    "name": "Prozessabbildung",
    "description": "Ideal für Prüfer:innen. Ordnet Abläufe, Risiken und Kontrollen basierend auf Meetings und Interviews.",
    "gliederung": [
      "Transkribiert besprochene Geschäftsprozesse mit Fokus auf Kontrollen, Prüfung und Prozessmodellierung.",
      "Extrahierte Informationen: Arbeitsabläufe, Verantwortliche, Kernaktivitäten, Risiken, zugehörige interne Kontrollen.",
      "Grundlage für interne/externe Audits und künftige Prozessmodellierung.",
      "Kontrolllücken, Prozessineffizienzen und Verbesserungspotenziale werden klar benannt.",
      "Technisch-analytischer Stil, formale Sprache, fachspezifische Terminologie.",
      "Struktur je Prozess: Titel, Kurzbeschreibung, Beteiligte, detaillierte Schritt-/Kontrollbeschreibung, Hauptrisiken, analytische Beobachtungen/Empfehlungen.",
      "Detaillierte Schrittbeschreibung: Schritt, Verantwortlicher, Input, Output, Risiken, interne Kontrollen, Entscheidungspunkte.",
      "Textliches Flussdiagramm zur Visualisierung der Schrittfolge.",
      "Relevante Ausschnitte mit Zeitstempel (HH:MM:SS) referenziert."
    ]
  },
  {
    "id": "education__unterrichtshinweis",
    "category": "Education",
    "name": "Unterrichtshinweis",
    "description": "Für Lehrkräfte zur Protokollierung des Unterrichts: Überblick, noch nicht behandelte Themen, Fragen und Antworten. Klare Notizen für die nächste Stunde.",
    "gliederung": [
      "Erfasst Datum, Ort, Fach.",
      "Überblick über die behandelten Inhalte der Sitzung.",
      "Noch nicht abgeschlossene Inhalte.",
      "Abgedeckte Inhalte je Modul mit Kernkonzepten.",
      "KI-Empfehlungen zur Vertiefung.",
      "Fragen der Studierenden mit Antworten."
    ]
  },
  {
    "id": "education__universitatsvorlesungen",
    "category": "Education",
    "name": "Universitätsvorlesungen",
    "description": "Fügen Sie Transkripte ein. Erhalten Sie einen flüssigen Text mit Titeln, Schlüsselkonzepten und einer abschließenden Zusammenfassung.",
    "gliederung": [
      "Wandelt ein Vorlesungstranskript in einen vollständigen, klaren, strukturierten Text um, ähnlich einem Lehrbuch.",
      "Gliederung in Haupt- und Unterabschnitte mit aussagekräftigen Titeln; Listen/Tabellen nur wenn nötig.",
      "Fachterminologie, Definitionen und Konzepte werden originalgetreu beibehalten; Transkriptionsfehler nur bei hoher Sicherheit korrigiert.",
      "Ergänzung kurzer, relevanter „Erläuterungen\" oder Kennzeichnung unklarer Passagen mit „Hinweis\"; wichtigste Konzepte fett hervorgehoben.",
      "Am Ende: Zusammenfassung mit Kernkonzepten und Schlüsselwörtern.",
      "Strenger, vollständiger, klarer Stil mit wissenschaftlicher Korrektheit und Treue zur Originalvorlesung."
    ]
  },
  {
    "id": "education__vorlage_fur_die_transkription_und_organisation_von_universitatsvorlesungsaufzeichnungen",
    "category": "Education",
    "name": "Vorlage für die Transkription und Organisation von Universitätsvorlesungsaufzeichnungen",
    "description": "Die Vorlesungen werden in logische Kapitel unterteilt, wobei jedes Beispiel und Detail für ein umfassendes Studium erhalten bleibt.",
    "gliederung": [
      "Vollständige Transkription der Vorlesung unter Beibehaltung aller Details und der Wortmenge, neu strukturiert in logischer Form.",
      "Keine Details, Beispiele, Daten oder wichtigen Erklärungen werden ausgelassen, auch bei Verbesserung der Lesbarkeit.",
      "Genauigkeit: keine Auslassung spezifischer Beispiele, Daten oder Zitate.",
      "Logische Struktur: Kapitel/Unterkapitel entsprechend der Themenreihenfolge, mit klaren, beschreibenden Titeln.",
      "Klarheit: gut strukturierte Absätze, Aufzählungen/Nummerierungen für Kernpunkte.",
      "Flüssige Übergänge zwischen den Abschnitten.",
      "Einleitung und Schluss geben Kontext bzw. fassen die Hauptpunkte zusammen.",
      "Detailgrad: jedes Detail bleibt erhalten, auch scheinbar Nebensächliches."
    ]
  },
  {
    "id": "education__seminar_vorlesung_ausfuhrliche_zusammenfassung_und_transkript",
    "category": "Education",
    "name": "Seminar, Vorlesung: Ausführliche Zusammenfassung und Transkript",
    "description": "Ordnet Vorlesungen logisch. Erfasst alle Details und Beispiele ohne Ergänzungen.",
    "gliederung": [
      "Vollständige, wörtliche Transkription eines Vortrags/Seminars unter Beibehaltung aller Details, Beispiele, Daten und Erklärungen.",
      "Keine persönlichen Ergänzungen, Interpretationen oder Bewertungen.",
      "Struktur nach Vollständigkeit, Genauigkeit, logischem Aufbau, Klarheit und Lesbarkeit sowie Einleitung/Schluss.",
      "Alle Details, auch scheinbar geringfügige, bleiben erhalten.",
      "Keine Informationen hinzufügen, die im Original nicht vorkamen.",
      "Text wird in Kapitel/Unterkapitel unterteilt, gemäß der ursprünglichen Struktur.",
      "Unverständliche Passagen werden entsprechend markiert, z. B. mit „[unverständlich]\"."
    ]
  },
  {
    "id": "education__studien_und_schulungsmaterial",
    "category": "Education",
    "name": "Studien- und Schulungsmaterial",
    "description": "Wandelt Audio in professionelle Handbücher um. Ordnet Lektionen und Beispiele in leicht nachschlagbare Leitfäden.",
    "gliederung": [
      "Wandelt technische Audiotranskripte in organisiertes, didaktisches Schulungsmaterial um.",
      "Material soll dicht, didaktisch und strukturiert sein, um Lernen und praktische Anwendung zu erleichtern.",
      "Titel mit dem zentralen Thema; prägnante, didaktische technische Zusammenfassung.",
      "Inhaltsentwicklung folgt chronologischer/logischer Reihenfolge: Grundkonzepte, Hauptprobleme, Fehlerursachen, Lösungen, Best Practices.",
      "Praktische Beispiele werden überarbeitet, didaktisch klar dargestellt und als Aufzählungspunkte präsentiert.",
      "Fazit fasst Kernpunkte zusammen und schlägt nächste Schritte/verwandte Themen vor.",
      "Wichtige Konzepte werden mit visuellen Markierungen (fett/kursiv) hervorgehoben.",
      "Zusätzliche Ressourcen: Glossar wichtiger Begriffe, Wiederholungsfragen, ergänzende Lektüreempfehlungen."
    ]
  },
  {
    "id": "education__vorlesungsmitschriften_college_class_notes",
    "category": "Education",
    "name": "Vorlesungsmitschriften (College Class Notes)",
    "description": "Ordnet Vorlesungen in Konzepte und Beispiele. Erfasst Prüfungstipps und Übungsfragen zur Wiederholung.",
    "gliederung": [
      "Struktur für Hochschul-Mitschriften mit Kursname, Dozent:in, Datum, Thema.",
      "Abschnitt „Kernkonzepte & Definitionen\" (bis zu 6 Begriffe).",
      "Abschnitt „Hauptpunkte der Vorlesung\" (bis zu 6 Punkte mit Erklärung).",
      "Abschnitt „Beispiele/Fallstudien\" (bis zu 6 Beispiele).",
      "Abschnitt „Betonung durch die Lehrperson\" (prüfungsrelevante Punkte).",
      "Abschnitt „Gestellte Fragen & gegebene Antworten\".",
      "Abschnitt „Persönliche Reflexionen/Verbindungen\".",
      "Abschnitt „Zu wiederholen/nachzuverfolgen\".",
      "Abschnitt „Lerntipps/Merkhilfen\".",
      "Abschnitt „Mögliche Prüfungsfragen\"."
    ]
  },
  {
    "id": "education__interaktiver_unterricht",
    "category": "Education",
    "name": "Interaktiver Unterricht",
    "description": "Ideal für Studierende. Ordnet Unterrichtsinhalte in Skripte mit Glossar und Fragen für effektive Wiederholung.",
    "gliederung": [
      "Ziel: prägnantes, organisiertes Lernmaterial mit Fokus auf den Kerninhalt der Unterrichtsstunde.",
      "Extrahiert den Kerninhalt, ignoriert irrelevante Unterbrechungen (Anekdoten, Nebendiskussionen).",
      "Zusätzliche Informationen nur, wenn sie das Hauptthema direkt ergänzen.",
      "Gliederung in nummerierte/stichpunktartige Themen in chronologischer Reihenfolge.",
      "Definitionen wichtiger Begriffe, Formeln, prägnante Beispiele.",
      "Klare, prägnante, sachliche Sprache; kurze Sätze, aktive Sprache.",
      "Kernkonzepte visuell hervorgehoben (fett/kursiv).",
      "Glossar wichtiger Begriffe und Wiederholungsfragen am Ende."
    ]
  },
  {
    "id": "education__vorlesungsmitschriften_class_notes",
    "category": "Education",
    "name": "Vorlesungsmitschriften (Class Notes)",
    "description": "Erstellt Notizen mit Prüfungsthemen und Beispielen. Enthält Glossar und Zusammenfassung zur Lernerleichterung.",
    "gliederung": [
      "Analysiert die Transkription einer Vorlesung zur Erstellung einer professionellen, vollständigen, organisierten Lernnotiz.",
      "Gliederung in hierarchische Titel/Untertitel mit allen Erklärungen und Beispielen der Lehrperson.",
      "Von der Lehrperson als prüfungsrelevant markierte Abschnitte werden explizit mit „⚡️ WICHTIG: Für die Prüfung hervorgehoben\" gekennzeichnet.",
      "Formaler, akademischer Ton.",
      "Ideen werden zusammengefasst, ohne erfunden oder verändert zu werden.",
      "Während der Stunde aufgekommene Fragen werden am Ende jedes Themas hervorgehoben.",
      "Schwierige/technische Konzepte werden mit kurzer Erklärung versehen.",
      "Am Ende: Executive Summary (3–5 Zeilen) und Glossar relevanter Begriffe."
    ]
  },
  {
    "id": "education__wortlaut_fur_das_transkript",
    "category": "Education",
    "name": "Wortlaut für das Transkript",
    "description": "Ordnet transkribierte Vorlesungen, indem Fehler und LaTeX-Formeln korrigiert werden, ohne den gesprochenen Ton zu verändern.",
    "gliederung": [
      "Regeln für die wortgetreue Transkription einer Unterrichtsstunde unter Beibehaltung des gesprochenen Tons.",
      "Wörter werden nicht entfernt außer bei Wiederholungen; nur Zeichensetzung, Rechtschreibung und Transkriptionsfehler werden korrigiert.",
      "Keine Tabellen erlaubt, aber mathematische Formeln können klar und kopierbar in LaTeX umgeschrieben werden.",
      "Text wird in Absätze gegliedert, Schlüsselwörter fett hervorgehoben, Formatierung für einfaches Kopieren angepasst."
    ]
  },
  {
    "id": "education__schulungsleitfaden",
    "category": "Education",
    "name": "Schulungsleitfaden",
    "description": "Wandelt Transkripte in strukturierte Leitfäden um. Enthält Zusammenfassungen, Kernkonzepte und Übungsfragen.",
    "gliederung": [
      "Wandelt Schulungstranskripte in strukturierte, leicht verständliche Lernleitfäden mit Übungsfragen um.",
      "Abschnitte: Titel, Sprecher:innen, Zusammenfassung, Kernthemen, ausführliche Themenerklärungen (mit Kernkonzepten), zentrale Erkenntnisse, bemerkenswerte Zitate, Prüfungsfragen & Antworten, Vorschläge zur Vertiefung.",
      "Erklärungen umfassend und zugänglich, mit Beispielen/Analogien zur Vertiefung.",
      "Kernkonzepte je Thema als Aufzählung mit kurzer, klarer Erklärung.",
      "Akademischer, klarer, strukturierter Stil mit Aufzählungen und fett hervorgehobenen Überschriften.",
      "Unterstützender, kompetenter, ermutigender Ton."
    ]
  },
  {
    "id": "education__medizin_nicole",
    "category": "Education",
    "name": "Medizin – Nicole",
    "description": "Ordnet Vorlesungen in Kapitel mit Glossar und Prüfungsnotizen. Ideal für ausführliche Wiederholungen.",
    "gliederung": [
      "Erstellt klare, vollständige, organisierte Zusammenfassungen medizinischer Vorlesungen ohne Detailverlust.",
      "Gliederung in nummerierte/stichpunktartige Themen in chronologischer Reihenfolge, mit Definitionen, Formeln und prägnanten Beispielen.",
      "Vollständige Transkription vor Umstrukturierung und Zusammenfassung für die Prüfungsvorbereitung.",
      "Genauigkeit ist entscheidend – keine Auslassung spezifischer Beispiele, Daten oder Zitate.",
      "Logische Struktur: Kapitel/Unterkapitel entsprechend Vorlesungsreihenfolge mit klaren Titeln.",
      "Von der Lehrperson als „SEHR WICHTIG – PRÜFUNGSRELEVANT\" gekennzeichnete Konzepte werden hervorgehoben.",
      "Tipps und praktische Ratschläge der Lehrperson werden aufgenommen.",
      "Logische Abläufe werden mit dem Symbol „→\" dargestellt.",
      "Glossar wichtiger Begriffe wird erstellt."
    ]
  },
  {
    "id": "education__interaktives_klassenzimmer",
    "category": "Education",
    "name": "Interaktives Klassenzimmer",
    "description": "Erstellt Unterrichtszusammenfassungen mit Glossar und Wiederholungsfragen zur Organisation von Lernmaterial.",
    "gliederung": [
      "Ziel: prägnantes, organisiertes Lernmaterial mit Fokus auf den Kerninhalt der Stunde.",
      "Extrahiert den Kerninhalt, ignoriert irrelevante Unterbrechungen, ergänzt nur direkt relevante Zusatzinformationen.",
      "Gliederung in nummerierte/stichpunktartige Themen in chronologischer Reihenfolge mit Definitionen, Formeln, Beispielen.",
      "Klare, prägnante, sachliche Sprache ohne übermäßigen Fachjargon; Kernkonzepte visuell hervorgehoben.",
      "Glossar wichtiger Begriffe und Wiederholungsfragen am Ende."
    ]
  },
  {
    "id": "education__vorlesung_zum_handbuch",
    "category": "Education",
    "name": "Vorlesung zum Handbuch",
    "description": "Wandelt Aufnahmen in formale Lehrbuchkapitel um. Strukturiert Inhalte für die gezielte Prüfungsvorbereitung.",
    "gliederung": [
      "Wandelt eine hochgeladene Audio-Lektion in ein umfassendes, akademisch fundiertes Textkapitel im Stil eines Universitätslehrbuchs um.",
      "Identifiziert und formuliert alle Konzepte, Definitionen, Beispiele und logischen Zusammenhänge neu, ohne Informationsverlust.",
      "Formale, unpersönliche, akademische Prosa; kein Bezug auf sprechende Person oder Vorlesungskontext.",
      "Ergebnis: langes, detailliertes, eigenständiges Kapitel, das ohne das Original-Audio zum Lernen genutzt werden kann.",
      "Natürlicher didaktischer Aufbau: Einleitung, Entwicklung der Kernkonzepte mit Beispielen, abschließende Synthese.",
      "Formaler, akademischer Ton, klare und präzise Darstellung komplexer Konzepte.",
      "Unklare/unverständliche Audiosegmente werden in eckigen Klammern markiert, z. B. [unverständlich].",
      "Ergebnis: umfassendes, geordnetes, lineares Kapitel für die Prüfungsvorbereitung."
    ]
  },
  {
    "id": "construction__mangelliste",
    "category": "Construction",
    "name": "Mängelliste",
    "description": "Für Inspektoren und Bauleiter. Notizen zur Aufgabenverteilung an Verantwortliche und Fälligkeitstermine eingeben. Hebt Lücken hervor.",
    "gliederung": [
      "Erfasst Datum, Ort, Prüfer:in.",
      "Überblick über bei der Abnahmeprüfung festgestellte Punkte.",
      "Mängelliste nach Bereichen (Allgemeine Anforderungen, Baustellenarbeiten, Beton usw.).",
      "Je Aufgabe: Aufgabenname, Verantwortlicher, Priorität, Beschreibung, Kommentare, Fälligkeitsdatum – in Tabellenform.",
      "KI-Vorschlag: Hinweis auf mögliche zusätzlich zu prüfende Bereiche."
    ]
  },
  {
    "id": "construction__projektbesprechung",
    "category": "Construction",
    "name": "Projektbesprechung",
    "description": "Erstellt Fachprotokolle aus Notizen. Ideal für Bauleiter und Verwaltungen.",
    "gliederung": [
      "Erstellt aus dem Transkript eines Treffens zwischen Projektleitung, Hausverwaltung und Sachverständigen ein strukturiertes Protokoll.",
      "Protokoll trägt die Überschrift „Sitzungsprotokoll\" mit Ort, Datum, Objektbezeichnung.",
      "Alle Teilnehmenden mit vollständigem Namen und Funktion.",
      "Besprochene Punkte und Maßnahmen klar nach Gebäude, Etage und Wohnung gegliedert, einheitlich formatiert.",
      "Gemeinschaftsbereiche (Keller, Treppenhaus) werden ebenfalls aufgeführt, sofern besprochen.",
      "Zusätzliche Vereinbarungen (z. B. Angebotsfristen) werden separat dokumentiert.",
      "Abschlusssatz zur Dokumentation des Termins als Grundlage für die weitere Bearbeitung.",
      "Neutrale, sachliche, professionelle Formulierung mit korrekten Fachbegriffen; Maße im Format „X,XXm × Y,YYm = Z,ZZm²\"; keine Spekulationen, nur Fakten aus der Transkription."
    ]
  },
  {
    "id": "construction__erstellung_eines_detaillierten_sitzungsprotokolls",
    "category": "Construction",
    "name": "Erstellung eines detaillierten Sitzungsprotokolls",
    "description": "Fasst Entscheidungen und Aufgaben aus Besprechungsprotokollen nach Tagesordnungspunkt zusammen. Erstellt eine Aufgabenliste mit Verantwortlichen und Fristen.",
    "gliederung": [
      "Analysiert das Meeting-Transkript und erstellt ein professionelles, systematisches Protokoll mit Kernpunkten, Hauptentscheidungen und konkreten Aufgaben.",
      "Basisinformationen: Meeting-Name, Datum/Uhrzeit, Ort, Teilnehmende, Protokollführung, Agenda.",
      "Zunächst top-down: Ziele/Zweck des Meetings, Kernentscheidungen, Zusammenfassung der Hauptdiskussionspunkte.",
      "Je Tagesordnungspunkt: Hauptpräsentationen, wichtige Fragen/Antworten, Meinungen, Belege/Daten, Entscheidungen, Aufgaben (Inhalt, Verantwortlicher, Frist).",
      "Alle Aufgaben werden zusätzlich in einer Gesamttabelle mit Nummer, Aufgabe, Verantwortlichem, Frist, Fortschrittsstatus zusammengeführt.",
      "Informationen zum nächsten Meeting und Anhängen am Ende.",
      "Objektiv, prägnant, in klar lesbarem Markdown-Format."
    ]
  },
  {
    "id": "construction__gelandebegehung_site_walk",
    "category": "Construction",
    "name": "Geländebegehung (Site Walk)",
    "description": "Dokumentieren Sie die Begehungen vor Ort und die zu erledigenden Aufgaben.",
    "gliederung": [
      "Erfasst Beobachtungen und Aufgaben aus Geländebegehungen für ein gewerbliches Bauunternehmen.",
      "Wichtig für Terminüberwachung, Priorisierung, Sicherheitsrisiken und Qualitätskontrolle.",
      "Ziel: detaillierte Zusammenfassung laufender Terminaktivitäten, Sicherheitsbeobachtungen und Qualitätsbewertungen mit klaren Aufgaben (Ergebnis, Verantwortlicher, Fälligkeitsdatum).",
      "Professionelle, prägnante, klare Darstellung mit Begründung der Prioritäten.",
      "Kurzer narrativer Überblick über die Begehung, 3–5 Hauptthemen, gefolgt von einer Checkliste mit Aufgaben, Verantwortlichen und Fristen."
    ]
  },
  {
    "id": "construction__aufgabenliste_to_do_list",
    "category": "Construction",
    "name": "Aufgabenliste (TO DO LIST)",
    "description": "Erstellt nummerierte Aufgabentabellen mit Fristen zur Projektorganisation.",
    "gliederung": [
      "Aufgabenliste wird nummeriert, jede Aufgabe erhält eine eigene Nummer.",
      "Aufgabenliste wird in Tabellenform dargestellt."
    ]
  },
  {
    "id": "construction__baubesprechung",
    "category": "Construction",
    "name": "Baubesprechung",
    "description": "Fasst Baubesprechungen zusammen, verfolgt Entscheidungen und weist Aufgaben zu, um den Projektfortschritt sicherzustellen.",
    "gliederung": [
      "Baubesprechungsprotokolle müssen wesentliche Informationen, Entscheidungen und Aufgaben dokumentieren.",
      "Wesentliche Informationen: Name des Meetings, Datum, Namen aller Anwesenden und Sprechenden.",
      "Zusammenfassung des Inhalts: zugewiesene Aufgaben, getroffene Entscheidungen, nächste Schritte des Projekts."
    ]
  },
  {
    "id": "construction__designbesprechung",
    "category": "Construction",
    "name": "Designbesprechung",
    "description": "Für Wohnbau-Designer:innen. Ordnet Namenskonventionen, Vorlagentexte und empfohlene Einstellungen zur Unterstützung von Aufnahme und Informationsmanagement.",
    "gliederung": [
      "Format des Aufnahmetitels: „[Kundenname/Projektname] Meeting Nr. ◯ (JJJJ/MM/TT)\".",
      "Tag-Klassifizierungen wie #Grundrissbesprechung, #Verkabelung/Beleuchtung, #Spezifikationsentscheidung je nach Zweck.",
      "Standard-Eröffnungskommentar und Standard-Abschlusskommentar für die Aufnahme.",
      "App-Einstellungen: hohe Audioqualität, Transkription AN, automatisches Backup AN, Freigabe nur intern, Benachrichtigungen AN.",
      "Diese Einstellungen werden auf einer druckbaren Word-/PDF-Seite zusammengefasst."
    ]
  },
  {
    "id": "construction__zitat_quote",
    "category": "Construction",
    "name": "Zitat (Quote)",
    "description": "Für Auftragnehmer:innen, um Kundennotizen in kategorisierte Angebote und detaillierte Leistungsverzeichnisse umzuwandeln.",
    "gliederung": [
      "Für Bau-/Renovierungsangebote wird ein System zur Erstellung detaillierter Angebote benötigt.",
      "Angebote müssen eine vollständige Positionsliste aller Kundengespräche enthalten.",
      "Detaillierte Informationen und ein detailliertes Leistungsverzeichnis sind erforderlich.",
      "Informationen werden in die richtigen Kategorien einsortiert, auch wenn sie außer der Reihe genannt wurden.",
      "Informationen zu einem bestimmten Bereich (z. B. Hauptbad) werden korrekt zugeordnet, auch wenn sie erst später erwähnt werden."
    ]
  },
  {
    "id": "construction__co_star_autopilot",
    "category": "Construction",
    "name": "Co-Star-Autopilot",
    "description": "Verwandelt Sprachmemos in Feldberichte für die professionelle Teamweitergabe.",
    "gliederung": [
      "Transkribiert und fasst Sprachmemos von Bauprojektleitenden in strukturierte, nach Projekt gegliederte Feldberichte um.",
      "Stil einer professionellen Berichtsassistenz: sauber, organisiert, detailfokussiert.",
      "Klarer, professioneller, prägnanter Ton ohne unnötigen Fachjargon.",
      "Zielgruppe: internes Personal, Vorgesetzte, Subunternehmer, Generalunternehmer.",
      "Markdown-Format mit fetten Überschriften und Aufzählungen, gegliedert nach Projektname.",
      "Abschnitte je Projekt: Baustellen-Updates, Team-Aktivität, Material & Lieferungen, Mängelliste/Probleme, Aufgaben & Follow-up."
    ]
  },
  {
    "id": "construction__anmerkungen_im_inspektionsbericht",
    "category": "Construction",
    "name": "Anmerkungen im Inspektionsbericht",
    "description": "Entwurf der TREC-7-6-Hausinspektionsnotizen mit Mängeln, Reparaturvorschlägen und Bauvorschriften-Zitaten.",
    "gliederung": [
      "Rolle: professionelle Hausinspektion nach dem TREC-7-6-Standardformular (Texas).",
      "Identifiziert Zustand der Immobilie, Mängel, empfiehlt Korrekturmaßnahmen, verweist auf Bauvorschriften (IRC, NEC, UPC), verknüpft Fotobelege.",
      "Klare, prägnante, strukturierte Berichtseinträge mit beobachtetem Zustand, Mangel, Empfehlung, Vorschriftenverweis.",
      "Professioneller, neutraler, prägnanter Ton.",
      "Zielgruppe: Käufer:innen, Eigentümer:innen, Makler:innen, Handwerksbetriebe.",
      "Formatiert zum Einfügen in einen TREC-7-6-Bericht, strukturierte Markdown-Gliederung."
    ]
  },
  {
    "id": "construction__sitzungsprotokoll_tn_006",
    "category": "Construction",
    "name": "Sitzungsprotokoll_TN-006",
    "description": "Formatiert Sitzungsprotokolle basierend auf Transkription. Ordnet und gibt Zusammenfassung, Entscheidungen, Aufgaben und Vorschlag für die nächste Agenda aus.",
    "gliederung": [
      "Erstellt strukturierte Meeting-Notizen aus Echtzeit-Audio-/Videoaufnahmen für effiziente Nachverfolgung.",
      "Rolle: erfahrene Projektassistenz mit Fokus auf Kernthemen, komplexe Diskussionen und Aufgaben.",
      "Analysiert das gesamte Protokoll, identifiziert Kernpunkte/Entscheidungen, erkennt alle Aufgaben/Zusagen.",
      "Sechs Abschnitte: „Agenda\", „Thema & Zusammenfassung\", „Entscheidungen\", „Aufgaben\", „Diskussionsthema\", „Entwurf nächste Agenda\".",
      "Format: Meeting-Titel, Datum, Sprechende, Teilnehmende, gefolgt von den sechs Abschnitten."
    ]
  },
  {
    "id": "construction__projektmanager_bauaktualisierung",
    "category": "Construction",
    "name": "Projektmanager – Bauaktualisierung",
    "description": "Protokolliert Baustellen-Updates je Gebäude. Verfolgt Gewerke-Fortschritt, Inspektionen und zuweisbare Aufgaben.",
    "gliederung": [
      "Wöchentliches Bau-Update mit Generalunternehmer, Projektingenieur:in, Bauleitung und Gewerken.",
      "Geleitet vom Generalunternehmer, geordnet nach Gebäude und allgemeinen Standortarbeiten.",
      "Bei Gebäuderundgängen werden alle Innen- und Außengewerke geprüft.",
      "Notizen im Gliederungsformat mit Start-/Enddatum bzw. Dauer je Gewerk.",
      "Verfolgung von Inspektionen je Gewerk und Voraussetzungen für deren Abschluss.",
      "Am Ende jedes Gebäudeabschnitts: Aufgaben je Gewerk sowie identifizierte Hindernisse.",
      "Organisiert nach Gebäude (primär), innen/außen (sekundär), Gewerk (tertiär)."
    ]
  },
  {
    "id": "construction__regelma_iges_treffen",
    "category": "Construction",
    "name": "Regelmäßiges Treffen",
    "description": "Organisiert Baufortschritt und Anliegen von Beteiligten. Fasst den Status je Gewerk und getroffene Entscheidungen zur Protokollerstellung zusammen.",
    "gliederung": [
      "Regelmäßiges Treffen zur Bestätigung von Baufortschritt, Fragen, Problemen und Entscheidungen.",
      "Erfasst Projektname, Datum, Ort, Protokollführung, Teilnehmerinformationen.",
      "Rückblick auf das vorherige Treffen.",
      "Fortschrittsberichte basierend auf Wochenplänen für Hoch-, Elektro- und Haustechnikbau.",
      "Diskussionen und Anfragen von Auftraggeber:in, Bauleitung und Gewerken werden bestätigt.",
      "Termin für das nächste Treffen wird bestätigt; Unterausschüsse werden erwähnt."
    ]
  },
  {
    "id": "it_engineering__projektteamsitzungen_mit_mehreren_teilnehmern",
    "category": "IT & Engineering",
    "name": "Projektteamsitzungen mit mehreren Teilnehmern",
    "description": "Wandelt Teamprotokolle in professionelle Notizen mit Aktionstabellen, Entscheidungen und Stimmungsanalysen um.",
    "gliederung": [
      "Wandelt transkribierte Meeting-Audioaufnahmen in strukturierte, professionelle Zusammenfassungen für den geschäftlichen Gebrauch um.",
      "Ziel: strukturierte Besprechungszusammenfassungen mit Teilnehmenden, wichtigen Diskussionspunkten, Entscheidungen, nächsten Schritten und Aufgaben.",
      "Ausgabeformat: Besprechungsnotizen, Datum, Teilnehmende, wichtigste Diskussionspunkte/Entscheidungen, nächste Schritte/Zeitplan, Aufgaben/Verantwortliche in Tabellenform, Schlussfolgerung, Teamstimmung.",
      "Verarbeitung: Metadaten erkennen, Sprecher extrahieren, Diskussionen segmentieren, Entscheidungen hervorheben, zukunftsgerichtete Punkte extrahieren, Aufgaben in Tabelle umwandeln.",
      "Einschränkungen: keine Halluzinationen bei Namen/Daten/Aufgaben, Prägnanz und Professionalität, Unsicherheiten mit „[unklar]\"/„TBD\" kennzeichnen."
    ]
  },
  {
    "id": "it_engineering__it_meeting",
    "category": "IT & Engineering",
    "name": "IT-Meeting",
    "description": "Für Teams. Wandelt Transkripte in strukturierte Notizen mit Aktionstabellen und Risikoverfolgung um.",
    "gliederung": [
      "Universelle Vorlage für verschiedene Meeting-Arten, erstellt Zusammenfassungen und extrahiert umsetzbare Maßnahmen.",
      "Detaillierungsgrad passt sich dem Meeting-Typ an (täglich: Pläne/Fortschritt/Hindernisse; wöchentlich: umfassender Überblick).",
      "Nicht passende Abschnitte können weggelassen werden; passende Emojis bei Überschriften.",
      "„Wichtigste Punkte & Status\": je nach Meeting-Typ strukturiert.",
      "„Wichtige Zitate\": direkte Zitate mit Quellenangabe, sofern vorhanden.",
      "„Zeitpläne & Meilensteine\": wichtige Projekttermine ohne Einzelaufgaben-Fristen.",
      "„Aktionspunkte\": Tabelle mit Aufgabe, Verantwortlicher, Frist, Notizen.",
      "„Getroffene Entscheidungen\", „Folgeaktionen\", „Offene Punkte & Risiken\" (Risiken, unerledigte Diskussionen, ergebnislose Diskussionen).",
      "Klarer, prägnanter, professioneller Stil ohne Fachjargon-Überladung."
    ]
  },
  {
    "id": "it_engineering__software_anforderungserhebung",
    "category": "IT & Engineering",
    "name": "Software-Anforderungserhebung",
    "description": "Ordnet Kundengesprächsnotizen in strukturierte Listen von Systemzielen, Bedarf und potenziellen Risiken.",
    "gliederung": [
      "Erfasst Projektziele, Umfang, Stakeholder und konkrete Softwareanforderungen (funktional/nicht-funktional, Annahmen, Einschränkungen).",
      "Stakeholder-Abschnitt: Kunde/Behörde und Teilnehmende mit Rollen.",
      "Anforderungen: funktionale Anforderungen, nicht-funktionale Anforderungen (Leistung, Sicherheit, Usability, Skalierbarkeit), Datenanforderungen, UI-Anforderungen, Leistungsziele, Sicherheitsmaßnahmen, regulatorische Anforderungen.",
      "Annahmen und Einschränkungen werden dokumentiert.",
      "Definitionen: mehrdeutige Begriffe werden definiert oder als klärungsbedürftig markiert.",
      "Lücken-Abschnitt: fehlende Elemente/Probleme im aktuellen System.",
      "Professioneller Ton mit Fokus auf Entscheidungen, Aufgaben und Lücken; Vorschläge zu Risiken/Unklarheiten."
    ]
  },
  {
    "id": "it_engineering__it_wissenstransfer_sitzung",
    "category": "IT & Engineering",
    "name": "IT-Wissenstransfer-Sitzung",
    "description": "Wandelt IT-Transkripte in strukturierte Zusammenfassungen, Aufgaben und Dokumentationsinhalte um.",
    "gliederung": [
      "Fasst und ordnet Transkripte von IT-Wissenstransfer-Sitzungen.",
      "Sitzungstypen: Interview-Stil, Präsentations-Stil, Prozessorientiert, Fachwissen-Weitergabe, Playback-Sitzung (oder Kombination).",
      "Format richtet sich nach erkanntem Sitzungstyp (Fragen/Antworten, Hauptthemen, Schritt-für-Schritt-Anleitung, Konzepte/Definitionen, Abgleich Verständnis/Feedback).",
      "Ausgabe: Sitzungsüberblick, Kernerkenntnisse, Fragen/Klärungsbedarf, Aufgaben & nächste Schritte, Vorschläge für Dokumentationsinhalte."
    ]
  },
  {
    "id": "it_engineering__it_themen",
    "category": "IT & Engineering",
    "name": "IT-Themen",
    "description": "Wandelt technische IT-Meetings in klare, strukturierte Zusammenfassungen für nicht-technische Kunden um.",
    "gliederung": [
      "Analysiert Meetings mit IT-Themen.",
      "Rolle: Senior-Sicherheitsberatung für Rechtsanwaltskanzleien.",
      "Bei Lieferanten: präzise Fachterminologie; bei Kundenzusammenfassungen: möglichst wenig IT-Jargon.",
      "Kernprinzip: Kundenorientierung an erster Stelle.",
      "Bevorzugter Schreibstil: präzise, klare Struktur, für Nicht-Techniker:innen verständlich.",
      "Zielgruppe: sowohl technische Lieferanten als auch Kunden mit einfachen, klaren Sätzen.",
      "Bevorzugte Ausgabesprache: Deutsch, unabhängig von der Originalsprache des Meetings."
    ]
  },
  {
    "id": "it_engineering__vorlage_fur_sitzungsprotokolle_fur_sier",
    "category": "IT & Engineering",
    "name": "Vorlage für Sitzungsprotokolle (für SIer)",
    "description": "Enthält Kernpunkte, Entscheidungen und ToDos je Tagesordnungspunkt. Klärt Verantwortliche und Fristen für die gesamte Sitzung.",
    "gliederung": [
      "Generiert automatisch Protokolle basierend auf den erkannten Kernpunkten, gegliedert nach Agenda, Entscheidungen, ToDos, Protokollführung, nächstem Termin und Gesamtpunkten.",
      "Enthält Meeting-Name, Datum/Uhrzeit, Ort, Teilnehmende, Agenda-Liste.",
      "Je Tagesordnungspunkt: Kernpunkte (3–4), Entscheidungen (wer, was, bis wann), ToDos (Aufgabe, Verantwortlicher, Frist).",
      "Für die gesamte Sitzung: Protokollführung, Abgabefrist, nächster Termin, übergreifende ToDo-Liste.",
      "Ergänzende Hinweise: Zusammenführung doppelter Agenda-Inhalte, klare Verantwortlichkeiten, automatische Korrektur von Formatierungs-/Tippfehlern."
    ]
  },
  {
    "id": "it_engineering__tiefgehende_technische_zusammenfassung",
    "category": "IT & Engineering",
    "name": "Tiefgehende technische Zusammenfassung",
    "description": "Extrahiert Systemdesigns und Code aus Meeting-Protokollen zu detaillierten Berichten und visuellen Mindmaps.",
    "gliederung": [
      "Analysiert ein Meeting-Transkript und erstellt eine detaillierte technische Zusammenfassung für Ingenieurwesen, Entwicklung und Architektur ohne Vereinfachung.",
      "Dokumentiert Systemdesigns, Debugging, APIs, Code, Infrastruktur und Sicherheitsprotokolle, inkl. KI-Perspektive auf ungelöste Punkte.",
      "Erstellt Themenindex mit Unterthemen, extrahiert allen Code/Befehle/Logs/Konfigurationen.",
      "Enthält eine horizontale, radiale Mindmap mit zentralem Knoten „Meeting\", Themen als erste Ebene, Unterthemen als zweite Ebene.",
      "Zielgruppe: technisches Team, sowohl Anwesende als auch Abwesende."
    ]
  },
  {
    "id": "it_engineering__technik_meeting_autogen_radial_mindmap",
    "category": "IT & Engineering",
    "name": "Technik-Meeting – AutoGen Radial Mindmap",
    "description": "Ordnet technische Designs und Code in detaillierte Zusammenfassungen und visuelle Mindmaps für die Teamdurchsicht.",
    "gliederung": [
      "Analysiert ein Meeting-Transkript und erstellt eine detaillierte technische Zusammenfassung (Systemdesign, Debugging, API, Code, Infrastruktur, Sicherheit) mit KI-Empfehlungen für ungelöste Punkte.",
      "Themenindex mit Unterthemen, jeweils technisch detailliert zusammengefasst.",
      "Radiale Mindmap mit zentralem Knoten „Meeting\", ersten Ebenen für Hauptthemen, zweiten Ebenen für Unterthemen.",
      "Ausgabe als Markdown-Bilddarstellung des finalen radialen Diagramms.",
      "Zielgruppe: technisches Team, als Referenz für Anwesende und Abwesende."
    ]
  },
  {
    "id": "it_engineering__schritt_fur_schritt_anleitungsersteller",
    "category": "IT & Engineering",
    "name": "Schritt-für-Schritt-Anleitungsersteller",
    "description": "Erstellt Leitfäden aus Workshops, inklusive Troubleshooting-Tipps.",
    "gliederung": [
      "Erstellt eine detaillierte Schritt-für-Schritt-Anleitung aus einem aufgezeichneten Workshop zur Dokumentation.",
      "Rolle: technische Dokumentationsexpertise, die komplexe Informationen in klare, nutzbare Anweisungen umwandelt.",
      "Zielgruppe: Personen/Teams, die die im Workshop behandelten Aufgaben umsetzen.",
      "Analysiert Workshop-Inhalt, extrahiert Anweisungen in chronologischer Reihenfolge, ignoriert nicht-technische Details, erstellt bei Bedarf einen separaten Abschnitt „Warnungen/Troubleshooting\".",
      "Ausgabe: strukturiertes Dokument mit nummerierten Schritten, fett hervorgehobenen UI-Elementen, hervorgehobenen Werten, logischen Abschnitten."
    ]
  },
  {
    "id": "it_engineering__vorlage_fur_it_projektbesprechungen",
    "category": "IT & Engineering",
    "name": "Vorlage für IT-Projektbesprechungen",
    "description": "Erfasst Ziele, Entscheidungen und Aufgaben von IT-Meetings. Verfolgt Verantwortliche und Fristen zur Fortschrittssicherung.",
    "gliederung": [
      "Strukturiertes Format zur Dokumentation von Zweck, Diskussionen, Entscheidungen und Folgeaktionen.",
      "Kopfbereich mit Meeting-Titel, Datum, Uhrzeit, Teilnehmerliste.",
      "Zusammenfassung mit Zweck und Hauptergebnis.",
      "Abschnitte für besprochene Themen, getroffene Entscheidungen, Status-Updates.",
      "Aufgaben mit Verantwortlichem, Beschreibung und Fälligkeitsdatum.",
      "Eigene Abschnitte für Risiken/Probleme.",
      "Abschließender Abschnitt mit nächsten Schritten."
    ]
  },
  {
    "id": "it_engineering__technischer_account_manager",
    "category": "IT & Engineering",
    "name": "Technischer Account Manager",
    "description": "Erfasst Kundenbedürfnisse und Folgemaßnahmen für Support-Teams. Verfolgt Anforderungen und Lösungen mit klaren Aufgaben.",
    "gliederung": [
      "Rolle: Post-Sales-Support, damit Kund:innen die Software erfolgreich nutzen.",
      "Fokus auf Kundenbedarf, Anforderungen und vorgeschlagene Lösungen/Folgeaktionen („Due-outs\").",
      "Kundenbeschwerden/-anliegen werden hervorgehoben und dokumentiert.",
      "Struktur: „Bottom Line Up Front\"-Zusammenfassung, Teilnehmerliste, Due-outs-Abschnitt, detaillierte Zusammenfassung nach Kundenbedarf."
    ]
  },
  {
    "id": "it_engineering__zusammenfassung_der_serviceablaufe",
    "category": "IT & Engineering",
    "name": "Zusammenfassung der Serviceabläufe",
    "description": "Wandelt Meeting-Transkripte in Berichte mit Zeitplänen, Aufgaben und Kennzahlen für Teams um.",
    "gliederung": [
      "Strukturierte Zusammenfassung von Service-Operations-Meetings für Führungskräfte (Incidents, SRE, NOC, Fraud, Plattformzustand).",
      "Eingabe: Rohtranskript eines Meetings, Vorfall-Kriseneinsatzes, RCA-Diskussion, Engineering-Sync o. Ä.",
      "Ausgabe: druckfertiges Dokument für Engineering, Produkt und Service Operations.",
      "Umsetzbar, technisch korrekt, mit klaren Überschriften, Aufzählungen und Tabellen.",
      "Wichtige Systeme fett, Finanzinstitute kursiv; fehlende Daten als „nicht im Transkript vorhanden\" markiert.",
      "Reihenfolge: Executive Summary, Vorfallübersicht, Kernthemen, Aufgaben, betriebliche Kennzahlen/Beobachtungen, Kundenauswirkung/Kommunikation, Zitate, Glossar."
    ]
  },
  {
    "id": "legal__gerichtsreporter_court_reporter",
    "category": "Legal",
    "name": "Gerichtsreporter (Court Reporter)",
    "description": "Für präzise Protokolle. Erfasst exakte Wortlaute und Zeitstempel zur Unterstützung der Notizenorganisation.",
    "gliederung": [
      "Rolle: Gerichtsreporter:in, die alle gesprochenen Worte im Gerichtssaal exakt und vollständig festhält, ohne Zusammenfassung.",
      "Extrahiert Aufnahmedatum, -uhrzeit und -dauer.",
      "Transkript im Stil eines Gerichtsprotokolls: exakte Aussage je sprechender Person mit Name, Minute, Datum, Uhrzeit.",
      "Aufeinanderfolgende Aussagen derselben Person werden als ein Absatz dargestellt.",
      "Korrekte Einrückung, Rechtschreibung und Syntax je Beitrag.",
      "Sprecherkennzeichnung im Format: [Name]."
    ]
  },
  {
    "id": "legal__anwaltsmodell_lawyer_model",
    "category": "Legal",
    "name": "Anwaltsmodell (Lawyer Model)",
    "description": "Wandelt Meetings in formelle Protokolle mit Fristen, Aufgaben und Maßnahmen für das Team um.",
    "gliederung": [
      "Umfassende Zusammenfassung juristischer Meetings mit Themen, Maßnahmen, Fristen, Verantwortlichen, wichtigen Punkten.",
      "Kontext: Verfahrensstrategien, Fallfortschritt, Vertragsdefinitionen, Risikoanalyse, Rechtsberatung, interne Verwaltung, Rechtsprechung, Beratungsprojekte.",
      "Von professioneller Rechtsassistenz verfasst, logisch, klar, präzise Fachterminologie.",
      "Formal, direkt, objektiv, mit angemessener Fachsprache ohne übermäßigen Jargon.",
      "Zielgruppe: Partner und Mitglieder des Rechtsteams zur internen Aufzeichnung.",
      "Markdown-Format mit Überschriftenebenen (## und ###); Maßnahmen als Listen mit Datum und Verantwortlichem."
    ]
  },
  {
    "id": "legal__kundenberatung_client_consultation",
    "category": "Legal",
    "name": "Kundenberatung (Client Consultation)",
    "description": "Dokumentiert Fallfakten und plant Rechtsstrategien während Mandantengesprächen für eine gründliche Vorbereitung.",
    "gliederung": [
      "Zweck des Meetings: detaillierte Fakten zum Fall sammeln, um rechtliche Lösungsstrategien für die Mandantschaft zu entwickeln."
    ]
  },
  {
    "id": "legal__sitzungssekretar_rechtsabteilung",
    "category": "Legal",
    "name": "Sitzungssekretär (Rechtsabteilung)",
    "description": "Unterstützt Anwält:innen, indem Transkripte in Notizen mit Aufgaben und Fallzusammenfassungen organisiert werden.",
    "gliederung": [
      "Wandelt Transkripte von Anwalt-Mandanten-Gesprächen in strukturierte, rechtlich orientierte Notizen für den internen Gebrauch um.",
      "Rolle: erfahrene Paralegal-Assistenz mit über 20 Jahren Erfahrung, kombiniert Klarheit mit juristischem Fachwissen.",
      "Analysiert Transkripte zum rechtlichen Kontext, extrahiert Kernpunkte und Folgeaufgaben mit Verantwortlichen.",
      "Vier Abschnitte: Executive Summary, zentrale Aufgaben/Zusagen, detaillierte Aufschlüsselung nach Thema.",
      "Professioneller, juristisch versierter Ton, mit Aufzählungen und fett gedruckten Überschriften.",
      "Platzhalter für Mandantenname/Falltyp, Datum, Teilnehmerliste."
    ]
  },
  {
    "id": "legal__zusammenfassung_des_anwalt_mandanten_gesprachs_und_des_telefonats",
    "category": "Legal",
    "name": "Zusammenfassung des Anwalt-Mandanten-Gesprächs und des Telefonats",
    "description": "Erstellt strukturierte Zusammenfassungen für Rechtsakten. Erfasst wichtige Entscheidungen, nächste Schritte und Falldetails.",
    "gliederung": [
      "Fasst Anwalt-Mandanten-Interaktionen (persönlich oder telefonisch) zu aktenreifen Zusammenfassungen mit klaren Abschnitten und Aufgaben zusammen.",
      "Genaue, umfassende, professionelle Zusammenfassung ohne Spekulation, in klarer, professionell-juristischer Sprache.",
      "Enthält: Datum/Uhrzeit/Teilnehmende, Zweck des Meetings, Fallinformationen, Diskussionszusammenfassung, Beweise/Dokumente, Entscheidungen, nächste Schritte, Risiken/Bedenken, Abschlussbemerkungen.",
      "Markdown-Format mit Überschriften, fett gedruckten Namen/Titeln, Aufzählungen; fehlende Angaben als „Nicht angegeben\" markiert."
    ]
  },
  {
    "id": "legal__gerichtsschreiberin_mit_min_markern",
    "category": "Legal",
    "name": "Gerichtsschreiberin mit Min-Markern",
    "description": "Erfasst exakte Worte mit Zeitstempeln. Ordnet Sprecher und Themen in professionellem juristischem Format.",
    "gliederung": [
      "Rolle: Gerichtsreporter:in, die vollständige Aussagen jeder sprechenden Person ohne Zusammenfassung festhält.",
      "Transkribiert Meeting-Aufnahmen im Stil eines exakten Gerichtsprotokolls.",
      "Identifiziert Meeting-Name, Teilnehmende, Themen; jede Sprecherzeile fett mit Zeitmarkierung (HH:MM:SS) in Klammern.",
      "Aufeinanderfolgende Aussagen derselben Person werden zusammengeführt (nur erste Zeitmarke).",
      "Keine Zusammenfassung – jede Aussage wird mit vollem Kontext dokumentiert.",
      "Sprecherkennzeichnung in Kursiv und Fett; Themen mit Zeitmarke."
    ]
  },
  {
    "id": "legal__smart_transcript_reasoner",
    "category": "Legal",
    "name": "Smart Transcript Reasoner",
    "description": "Ordnet Logik und Aufgaben aus Transkripten. Organisiert Aufgaben in Zusammenfassungen zur leichteren Planung.",
    "gliederung": [
      "Intelligente Analyse-Engine, die Struktur, Ton und Zweck des Transkripts analysiert, um die Gesprächsart abzuleiten (strategisch, operativ, technisch, locker) und ein passendes Zusammenfassungsmodell zu wählen.",
      "Dynamische Logikabbildung: strukturiert Aussagen nach Ursache-Wirkung, Problem-Lösung oder Aufgabendelegation.",
      "Priorisiert Kernentscheidungen, Begründungen, Zeitbezüge und Verantwortlichkeiten.",
      "Ausgabe: strukturierte Zusammenfassung mit Überschriften, nummerierten Schritten oder Tabellen."
    ]
  },
  {
    "id": "legal__vollstandige_transkription_transkription_und_archivierung",
    "category": "Legal",
    "name": "Vollständige Transkription – Transkription und Archivierung",
    "description": "Erzeugt aus einer Audioaufnahme ein kanadisch-französisches wörtliches Protokoll. Kennzeichnet Sprecher und unhörbare Passagen.",
    "gliederung": [
      "Erstellt eine vollständige, wortgetreue Texttranskription für rechtliche, Compliance-, Forschungs- oder Archivierungszwecke.",
      "Erfasst alles wie gesprochen, ohne Zusammenfassung, Interpretation oder Korrektur (inkl. Füllwörter, Pausen, Wiederholungen, Fehler).",
      "Sprecherwechsel klar gekennzeichnet (erwachsen/Kind, Name/Titel oder „[Unbekannte sprechende Person]\").",
      "Chronologische Reihenfolge wird eingehalten; keine Kommentare/Titel/Erklärungen hinzugefügt.",
      "Unklare/unhörbare Passagen als [unhörbar]/[unklar] markiert."
    ]
  },
  {
    "id": "legal__ermittlerinterview_detective_interview",
    "category": "Legal",
    "name": "Ermittlerinterview (Detective Interview)",
    "description": "Formatiert Interviews in formelle Berichte. Nutzt neutrale Sprache. Ideal für Ermittler:innen.",
    "gliederung": [
      "Rolle: Durchführung von Befragungen/Verhören bei Gewaltverbrechen und kritischen Vorfällen.",
      "Transkription unpersönlich, detailliert, organisiert, im Frage-Antwort-Format.",
      "Alle Aussagedetails werden erhalten, außer Stottern oder Smalltalk.",
      "Muster: gestellte Frage und Antwort der befragten Person.",
      "Antworten unpersönlich formuliert mit Verben wie „gab an\", „stellte klar\", „erklärte\", „bestritt\".",
      "Wörtliche Zitate in Anführungszeichen; Aussagen originalgetreu inkl. relevanter Umgangssprache übernommen.",
      "Format als Standardtext-Bericht ohne Zeitstempel/Untertitel."
    ]
  },
  {
    "id": "legal__zusammenfassung_des_gerichtstermins",
    "category": "Legal",
    "name": "Zusammenfassung des Gerichtstermins",
    "description": "Für Anwält:innen zur Organisation von Verhandlungsnotizen. Erfasst Kernfakten, Streitpunkte und Fristen in Berichten.",
    "gliederung": [
      "Erstellt detaillierte Zusammenfassungen von Gerichtsterminen für die Anwaltschaft.",
      "Erfasst umfassend den Status laufender Themen, Kernpunkte der Sitzung und zugewiesene Aufgaben mit Fristen.",
      "Von beiden Parteien genannte Kernfakten werden ebenfalls aufgenommen.",
      "Professioneller, prägnanter, klarer Ton mit branchenüblicher Terminologie.",
      "Zielgruppe: alle Teammitglieder, ob anwesend oder nicht."
    ]
  },
  {
    "id": "legal__bericht_des_stellvertretenden_sheriffs",
    "category": "Legal",
    "name": "Bericht des stellvertretenden Sheriffs",
    "description": "Wandelt Audio in einen formellen, chronologischen Bericht um. Ordnet Aussagen, Rollen und Beweisnotizen.",
    "gliederung": [
      "Transkribiert eine Audioaufnahme in eine professionelle Ich-Perspektive-Erzählung für einen offiziellen Polizeibericht ohne Auslassungen.",
      "Chronologische Darstellung, auch wenn das Original zwischen Zeitebenen springt.",
      "Ich-Form-Aussagen werden in Formulierungen wie „Laut [Vollständiger Name] ging er/sie/sie hinein…\" umgewandelt.",
      "Neutrale, objektive Sprache, geeignet für polizeiliche Dokumentation.",
      "Alle Personen werden bei erster Erwähnung mit vollständigem Namen und Rolle (Opfer, Verdächtige/r, Zeuge/Zeugin) benannt.",
      "Beginnt mit „Am [Datum] befragte ich [Vollständiger Name], der/die Folgendes angab:\".",
      "Abschließender Hinweis, dass alle Video-/Fotobeweise hochgeladen wurden."
    ]
  },
  {
    "id": "legal__fallbesprechung_strafverteidigung",
    "category": "Legal",
    "name": "Fallbesprechung (Strafverteidigung)",
    "description": "Organisiert Verteidigungsgespräche. Erfasst Fallfakten, Aufgaben und Fahrpläne zur Unterstützung der Falldurchführung.",
    "gliederung": [
      "Für Strafverteidiger:innen, die KI-Meeting-Zusammenfassungstools nutzen, um Diskussionspunkte, Aufgaben, nächste Schritte und einen Verfahrensfahrplan festzuhalten.",
      "Meeting-Details: Datum/Uhrzeit, Teilnehmende, Meeting-Art (Mandant/Zeuge/Sonstiges), Ort/Format.",
      "Fallinformationen: Mandantenname, Fallnummer/Gericht, Anklagepunkte, Kautionsstatus, nächste Gerichtstermine.",
      "Kerndiskussionspunkte: geprüfte Sachverhalte, Aktualisierungen zu Aussagen, Beweismittelübersicht, Vergleichs-/Strafverhandlungen, emotionaler Zustand der Mandantschaft.",
      "Aufgaben & Folgeaufgaben: Aufzählung konkreter Aufgaben (Transkripte anfordern, Interviews planen, Zeugenvorladungen usw.).",
      "Vorgeschlagene nächste Schritte und ein Verfahrensfahrplan (Vorverhandlung, Prozesstermine, Urteilsverkündung).",
      "Optionaler Abschnitt „Notizen/Strategieüberlegungen\" für vertrauliche Einschätzungen."
    ]
  },
  {
    "id": "real_estate__sitzungsprotokoll_meeting_record",
    "category": "Real Estate",
    "name": "Sitzungsprotokoll (Meeting Record)",
    "description": "Unterstützt Verantwortliche dabei, fragmentierte Diskussionen in strukturierte Protokolle mit Entscheidungen und Aktionsplänen umzuwandeln, unter strikter Wahrung der Informationsgenauigkeit.",
    "gliederung": [
      "Rolle: professionelle Assistenz der Geschäftsführung, fokussiert auf hochwertige Protokollerstellung mit klaren Zielen und Aktionsplänen.",
      "Organisiert Informationen nach festem Rahmen: Meeting-Thema, Datum/Uhrzeit, Teilnehmende, Kernpunkte, Hauptdiskussionen, Entscheidungen/Aktionspläne, nächste Schritte.",
      "Genauigkeit hat Priorität – keine Erweiterung der Nutzerangaben, nur kleinere Grammatikkorrekturen.",
      "Klare Struktur und vollständige Beschreibung."
    ]
  },
  {
    "id": "real_estate__sitzungsprotokoll_meeting_minutes",
    "category": "Real Estate",
    "name": "Sitzungsprotokoll (Meeting Minutes)",
    "description": "Protokoll mit Themen, Aufgaben und Fristen zur technischen Überwachung und Projektorganisation.",
    "gliederung": [
      "Erstellt chronologische Protokolle für technische Koordination in Bauprojekten mit Teilnehmenden, Themen, offenen Punkten, Schlussfolgerungen.",
      "Beginnt mit Namen, Positionen, Unternehmen der Anwesenden, gefolgt von einer Begrüßung.",
      "Themen werden nach Punkten gruppiert, in chronologischer Reihenfolge.",
      "Details je Hauptüberschrift werden ausgeführt.",
      "Am Ende: offene Punkte als Checkliste sowie Schlussfolgerungen/nächste Schritte mit Fristen und Verantwortlichen."
    ]
  },
  {
    "id": "real_estate__generalversammlung_der_wohnungseigentumergemeinschaft",
    "category": "Real Estate",
    "name": "Generalversammlung der Wohnungseigentümergemeinschaft",
    "description": "Fasst Abstimmungen und Budgets zusammen. Informiert Miteigentümer:innen klar über Entscheidungen und Arbeiten.",
    "gliederung": [
      "Erstellt einen prägnanten, strukturierten Bericht der Eigentümerversammlung mit Entscheidungen, Themen, Abstimmungen, Arbeiten, Finanzinformationen, Folgeaktionen.",
      "Von professioneller Sitzungsassistenz (Protokollführung) klar und übersichtlich verfasst.",
      "Professioneller, prägnanter, zugänglicher Ton ohne unnötigen Rechts-/Fachjargon.",
      "Zielgruppe: alle Eigentümer:innen, ob anwesend oder nicht.",
      "Markdown-Format mit Überschriftenebenen 2/3, Aufzählungen, keine Emojis."
    ]
  },
  {
    "id": "real_estate__vorlage_fur_geschaftstreffen_immobilienprojekte",
    "category": "Real Estate",
    "name": "Vorlage für Geschäftstreffen / Immobilienprojekte",
    "description": "Ordnet Immobilienmeetings in Zusammenfassungen mit Entscheidungen, Aufgaben und strategischen Kernpunkten.",
    "gliederung": [
      "Fasst besprochene Themen, Entscheidungen, offene mit Namen versehene Punkte und strategische Erkenntnisse zusammen.",
      "Hebt kritische Punkte, Einwände und praktische Vorschläge hervor.",
      "Aufzählungspunkte mit klarer, prägnanter (Executive-)Sprache."
    ]
  },
  {
    "id": "real_estate__beratungstermine_fur_kaufer_oder_verkaufer_von_immobilien",
    "category": "Real Estate",
    "name": "Beratungstermine für Käufer oder Verkäufer von Immobilien",
    "description": "Fasst Immobilienkundengespräche in Nachfass-E-Mails zusammen, inkl. Kundenzielen, Aufgaben und Zeitplänen.",
    "gliederung": [
      "Unterstützt Makler:innen bei der Erstellung von Zusammenfassungen für Käufer-/Verkäuferberatungsgespräche.",
      "Klare, prägnante Meeting-Gliederung mit Aufgaben/Folgepunkten für Makler:in und Kundschaft.",
      "Professioneller, freundlicher Ton, geeignet als Nachfass-E-Mail.",
      "Kernelemente: Dank an die Kundschaft, Zielzusammenfassung, nächste Schritte, Vorbereitungs-/Vermarktungszeitplan, Besichtigungsorganisation, Zuversicht zum weiteren Ablauf.",
      "Zielgruppe: Makler:in, Assistenz und Kundschaft."
    ]
  },
  {
    "id": "real_estate__real_estate_agent_private_showing_mit_aktionspunkten_sprechzeit_und_drittperspektiven_bewertung",
    "category": "Real Estate",
    "name": "Real Estate Agent Private Showing mit Aktionspunkten, Sprechzeit und Drittperspektiven-Bewertung",
    "description": "Extrahiert Vorlieben und Bedürfnisse der Kundschaft aus Besichtigungen. Enthält Sprechzeit und Folgeaktionen für Makler:innen.",
    "gliederung": [
      "Kontext: Live-Aufnahme einer Hausbesichtigung mit Kaufinteressent:in.",
      "Analysiert das Gespräch und extrahiert Adresse, Vorlieben/Abneigungen, besondere Merkmale, Fragen/Kommentare, emotionalen Ton, Änderungen der Suchkriterien.",
      "Sauberer, erkenntnisorientierter Stil; warmer, neutraler, beobachtender Ton.",
      "Zielgruppe: Makler:in zur besseren Erinnerung und persönlichen Bindung.",
      "Klare Abschnittsüberschriften und Aufzählungen inkl. Sprechzeitanteil je sprechender Person."
    ]
  },
  {
    "id": "real_estate__immobilienerwerb",
    "category": "Real Estate",
    "name": "Immobilienerwerb",
    "description": "Fasst Quadratmeter, Zimmer und Ausstattung in klaren Übersichten zusammen, um die Immobilienverwaltung zu erleichtern.",
    "gliederung": [
      "Fasst Kernmerkmale erworbener Immobilien zusammen, um deren Präsentation durch andere Makler:innen zu erleichtern.",
      "Erfasst Grundstücks-/Baufläche, Garagen, Schlafzimmer (mit/ohne Suite), Bäder, Möblierung, Küchengeräte, Grillbereich, Gemeinschaftsflächen, Pool, Serviceräume.",
      "Angabe, ob ein- oder zweistöckig, Teil einer Wohnanlage, Fläche und Stadt.",
      "Professionelle, prägnante, klare Präsentation für das gesamte Immobilienteam."
    ]
  },
  {
    "id": "real_estate__gelandebegehung_site_inspection",
    "category": "Real Estate",
    "name": "Geländebegehung (Site Inspection)",
    "description": "Erfasst Baukonstruktionsmethoden und Details. Dient als Grundlage für Bewertungsberichte.",
    "gliederung": [
      "Erstellt eine Zusammenfassung einer Vor-Ort-Inspektion für die Immobilienbewertung mit Baudetails und Besonderheiten.",
      "Erfasst Baukonstruktionsdetails (z. B. Fenstertyp/-zustand) als Liste.",
      "Dokumentiert Baumängel, regulatorische Probleme oder sonstige relevante Beobachtungen.",
      "Mündlich mitgeteilte Informationen anderer Anwesender werden entsprechend gekennzeichnet.",
      "Sachliche, professionelle Zusammenfassung in Aufzählungen/kurzen Textblöcken.",
      "Dient als Gedächtnisstütze und Grundlage für den späteren Bewertungsbericht."
    ]
  },
  {
    "id": "real_estate__protokoll_der_vorstandssitzung",
    "category": "Real Estate",
    "name": "Protokoll der Vorstandssitzung",
    "description": "Für den Vorstand der Eigentümergemeinschaft. Fasst den Inhalt der Aussagen zum Verlauf, Ergebnissen, Fragen und offenen Punkten in einem neutralen, offiziellen Dokument zusammen.",
    "gliederung": [
      "Erstellt formelle, neutrale, höfliche Vorstandsprotokolle im formalen Sprachstil.",
      "Grundstruktur: jeder Tagesordnungspunkt als eigener Punkt, Ablauf „Erklärung → Beratung → Schlussfolgerung\", Fragen/Aufgaben als Aufzählung.",
      "Enthält: Datum/Uhrzeit/Ort, Anwesende/Abwesende, detaillierte Beratungsinhalte und Schlussfolgerungen je Tagesordnungspunkt, Fragen/Antworten, finanzielle Informationen, Anfragen an die Verwaltung.",
      "Beispielausgabe mit vollständiger Struktur.",
      "Neutraler, objektiver, klarer Ton, verständlich auch ohne Fachwissen."
    ]
  },
  {
    "id": "real_estate__beratungsgesprach_zum_listing_interne_notizen_zusammenfassung_fur_den_kunden",
    "category": "Real Estate",
    "name": "Beratungsgespräch zum Listing – Interne Notizen + Zusammenfassung für den Kunden",
    "description": "Erstellt strukturierte CRM-Zusammenfassungen, Vermarktungszeitpläne und professionelle Zusammenfassungs-E-Mails für Kund:innen.",
    "gliederung": [
      "Erzeugt zwei Ausgaben aus einem aufgezeichneten Listing-Beratungsgespräch: interne CRM-Zusammenfassung und kundengerichtete Zusammenfassungs-E-Mail.",
      "Interne Zusammenfassung: Kundendaten, Immobiliendetails, Kundensituation (Verkaufsgrund, finanzielle Lage, Zeitziele), Besichtigungspräferenzen, Vermarktungszeitplan (Tabelle), To-do-Liste für Kundschaft und Team.",
      "Kunden-E-Mail: professionell und freundlich, mit Dank, Zusammenfassung, nächsten Schritten, Zeitplan, Besichtigungsübersicht und Zuversicht.",
      "E-Mail endet mit spezifischer Signatur."
    ]
  },
  {
    "id": "real_estate__beschreibender_inventarbericht",
    "category": "Real Estate",
    "name": "Beschreibender Inventarbericht",
    "description": "Besichtigungs-Transkription: strukturierter, beschreibender Inventarbericht. Detailliert, ohne Zusammenfassung.",
    "gliederung": [
      "Erstellt einen strukturierten, detaillierten Immobilien-Inventarbericht aus einer Besichtigungs-Transkription, ohne Zusammenfassung oder Kommentare.",
      "Extrahiert je Raum: Beschreibung von Wänden, Decken, Boden, fester Ausstattung, Materialien, Marken, Gerätezustand.",
      "Format: Titel „Beschreibung:\", jeder Raum als fett/großgeschriebene Überschrift, allgemeine Beschreibung zu Beginn.",
      "Aufzählungslisten für komplexe Elemente (z. B. Schränke, Küche).",
      "Objektiver, beschreibender, formaler, professioneller Ton mit Fachvokabular."
    ]
  },
  {
    "id": "real_estate__buyer_seller_real_estate_consultations",
    "category": "Real Estate",
    "name": "Buyer/Seller Real Estate Consultations",
    "description": "Wandelt Immobilienberatungsgespräche in strukturierte Zusammenfassungen und professionelle Nachfass-E-Mails für Kund:innen um.",
    "gliederung": [
      "Unterstützt Makler:innen bei wöchentlichen/täglichen Beratungsgesprächen mit Käufer:innen, Verkäufer:innen und Investor:innen.",
      "Fokus auf Immobilienziele und aktuelle Kauf-/Verkaufsstrategien.",
      "Klare, prägnante Meeting-Zusammenfassung mit Status, To-dos und Folgeaktionen für Makler:in und Kundschaft.",
      "Professioneller Stil einer Assistenz; ermöglicht einfache Erstellung von Nachfass-E-Mails.",
      "Kundenversion anpassbar für Verkaufs- und Kaufberatung.",
      "Professionelle, freundliche E-Mail mit Dank, Zielzusammenfassung, nächsten Schritten, Zeitplan, Besichtigungsübersicht, Zuversicht."
    ]
  },
  {
    "id": "financial__kundenrezension_client_review",
    "category": "Financial",
    "name": "Kundenrezension (Client Review)",
    "description": "Erstellt professionelle Fallnotizen zu Kundenmeetings. Ordnet Kernpunkte und Aufgaben für Team und Aktenführung.",
    "gliederung": [
      "Erstellt Fallnotizen zu einem Kundenüberprüfungsgespräch mit Diskussionspunkten, Kernerkenntnissen und Aufgaben.",
      "Enthält Sprechernamen (Nachnamen) und Meeting-Datum.",
      "Für das Compliance-Team relevante Inhalte werden aufgenommen.",
      "Vollständiger Kundenname im Titel, sofern angegeben.",
      "Professionelle, sekretariatsartige Darstellung mit Empfehlungen als Aufzählung.",
      "Ton ähnelt diktierten Notizen der Beraterin/des Beraters nach dem Meeting.",
      "Zielgruppe: gesamtes Praxispersonal für schnellen Überblick."
    ]
  },
  {
    "id": "financial__anlageberatung_investment_advisory",
    "category": "Financial",
    "name": "Anlageberatung (Investment Advisory)",
    "description": "Für Berater:innen. Fasst Besprechungen in strukturierten Notizen mit Zielen und Maßnahmen für das gesamte Team zusammen.",
    "gliederung": [
      "Erstellt eine Zusammenfassung von Kunden-/Interessentengesprächen im Bereich Finanzplanung mit besprochenen Punkten, Erkenntnissen, Anlageprofil und Maßnahmen.",
      "Enthält Teilnehmernamen, Meeting-Datum, neue finanzielle Ziele und Anlagestrategien, mit Fokus auf für das Compliance-Team relevante Informationen.",
      "Professionelles Zusammenfassungsformat mit klaren, sachlichen Absätzen; Empfehlungen/Anpassungen als Liste hervorgehoben.",
      "Ton einer direkten Nachbesprechung, sodass das gesamte Beratungsteam den Fortschritt des Finanzplans nachvollziehen kann."
    ]
  },
  {
    "id": "financial__treffen_mit_dem_finanzberater_financial_advisor_meeting",
    "category": "Financial",
    "name": "Treffen mit dem Finanzberater (Financial Advisor Meeting)",
    "description": "Wandelt Transkripte in strukturierte Notizen um. Ordnet Kundenziele, Updates und Aufgaben.",
    "gliederung": [
      "Meeting-Agenda & Ziele: Themen und Hauptziele der Kundschaft.",
      "Kunden-Updates: Lebensveränderungen (Familie, Job, Gesundheit), neue finanzielle Prioritäten.",
      "Finanzüberblick: Einkommen, Ausgaben, Vermögenswerte, Verbindlichkeiten, aktuelle Kontoauszüge.",
      "Diskussionspunkte: kurz-/langfristige Ziele, Anlagestrategie, Risikobereitschaft, Steuer-/Versicherungs-/Nachlass-/Ruhestandsplanung.",
      "Aufgaben: Aufgaben für Berater:in und Kundschaft mit Fristen.",
      "Nächste Schritte & Follow-up: nächster Termin, benötigte Unterlagen.",
      "Beratungsnotizen & Beobachtungen: Kernerkenntnisse, Bedenken, Empfehlungen."
    ]
  },
  {
    "id": "financial__vorlage_fur_eine_zusammenfassung_des_finanzkundengesprachs",
    "category": "Financial",
    "name": "Vorlage für eine Zusammenfassung des Finanzkundengesprächs",
    "description": "Ordnet Notizen zu Finanzgesprächen in Berichte zu Zielen, Risiken und vereinbarten Maßnahmen.",
    "gliederung": [
      "Name und Datum/Uhrzeit des Meetings.",
      "Bestandsaufnahme (inkl. Anlageerfahrung und Vulnerabilitäten der Kundschaft).",
      "Hauptdiskussion: Kernthemen und wichtiger Austausch.",
      "Zukunftspläne (in eigenen Worten der Kundschaft): Ziele und Hoffnungen.",
      "Vereinbarte Maßnahmen (inkl. Datum des nächsten Meetings).",
      "Vereinbartes Risikoprofil (inkl. Verlusttoleranz und Anlagehorizont)."
    ]
  },
  {
    "id": "financial__101_vc_pe_investorenmodell_protokolle_fur_venture_capital_private_equity_meetings_startup_pitch_m_a",
    "category": "Financial",
    "name": "101 VC-PE-Investorenmodell (Protokolle für Venture-Capital-/Private-Equity-Meetings, Startup-Pitch & M&A)",
    "description": "Wandelt Pitch-, M&A- und Portfolio-Gespräche in IC-taugliche Protokolle mit Maßnahmen, Verantwortlichen und Terminen um.",
    "gliederung": [
      "Wandelt Aufnahmen von Startup-Pitches, M&A-Gesprächen oder Portfolio-Reviews in formelle, investitionsausschussreife Protokolle um.",
      "Professionell, logisch, klar, mit präziser VC/PE-Terminologie, formalem, direktem, objektivem Ton.",
      "Markdown-Titelformat „[JJJJ-MM-TT] + [Firmenname] + Kurztitel\", mit Überschriftenebenen und Aufgabenlisten.",
      "Themen in strikter Dreispalten-Tabelle (Punkt | Zusammenfassung | Schlagwörter); Details im Anhang mit Aufzählungen.",
      "Executive Summary mit Vereinbarungen, Meinungsverschiedenheiten, Analysen, nächsten Aufgaben mit Verantwortlichem/Frist.",
      "Abschnitte: Unternehmensvision, Problem/Pain Point, Produktlösung & Kundenakzeptanz, Marktgröße, Team, Wettbewerb/Positionierung, Cashposition/Burnrate/Runway, Finanzkennzahlen, Exit-Strategie."
    ]
  },
  {
    "id": "financial__borsendiskussion",
    "category": "Financial",
    "name": "Börsendiskussion",
    "description": "Verfolgt Markttrends und Aktienkurse.",
    "gliederung": [
      "Erfasst und strukturiert Finanzmarktdiskussionen mit Fokus auf Markttrends, Aktien, Kursniveaus und Handelsstrategien.",
      "Empfehlungen für die Aufnahme: ruhige Umgebung, klare Nennung von Trends/Kursniveaus/Strategien, Dauer 5–30 Minuten.",
      "Empfohlene Transkriptionseinstellungen: Sprache angeben, Sprechererkennung, hohe Rauschunterdrückung, Zeitstempel aktivieren.",
      "Analyse extrahiert fünf Bereiche: Marktstimmung/-trends, besprochene Aktien mit Ausblick, kritische Handelsniveaus (Support/Widerstand), umsetzbare Strategien/Risikomanagement, wirkungsvolle Zitate.",
      "Ausgabe mit klaren Überschriften, fett hervorgehobenen Kürzeln/Preisen, exportierbar als PDF/Text."
    ]
  },
  {
    "id": "financial__besprechungsassistent_meeting_assistant",
    "category": "Financial",
    "name": "Besprechungsassistent (Meeting Assistant)",
    "description": "Ordnet Meeting-Transkripte in Investment-Zusammenfassungen und extrahiert die Kernlogik.",
    "gliederung": [
      "Rolle: Senior-Research-Assistenz im Buy-Side-Bereich, erstellt ein logisch stringentes, datengenaues Investment-Memo (keine chronologische Wiedergabe).",
      "Klassifiziert das Meeting-Szenario als „Tiefenrecherche\", „öffentliche Präsentation\" oder „Roadshow-Kommunikation\".",
      "Filtert Meinungen/Annahmen der investierenden Person heraus – Kernpunkte stammen zu 100 % von der Gastperson.",
      "Inhalte werden nicht chronologisch, sondern nach Kernthemen (z. B. Wettbewerbslandschaft, Lieferkettenkosten) neu gruppiert.",
      "Zahlen werden exakt wie im Original übernommen; relative Zeitangaben in absolute Formate umgewandelt.",
      "Fragen/Antworten werden nach Relevanz gefiltert und ggf. in Kernthemen integriert.",
      "Ausgabe als Markdown-Codeblock mit Szenarioklassifikation, Metadaten, Kernpunkten, ausgewählten Fragen/Antworten."
    ]
  },
  {
    "id": "financial__ki_transkriptionsvorlage_fur_die_versicherungsbranche",
    "category": "Financial",
    "name": "KI-Transkriptionsvorlage für die Versicherungsbranche",
    "description": "Geeignet für Schulung und Vertrieb. Wandelt Meeting-Audio in strukturierte Berichte um, bewahrt Vorschriften und Terminologie akkurat, erzeugt praxisnahe Skripte und standardisierte Abläufe.",
    "gliederung": [
      "Speziell für die Versicherungsbranche: Schulung, Rekrutierung, Marketing, Management, Produktinformation, regulatorische Briefings, Finanzplanung, Kundenservice.",
      "Breite Anwendbarkeit über verschiedenste Versicherungsarten (Lebens-, Kranken-, Sach-, Kfz-, Haftpflichtversicherung usw.).",
      "Deckt Produktklauseln, Tarife, Underwriting, Schadensfälle, Ausschlüsse, Policenvergleich sowie -optimierung ab.",
      "Unterstützt Vertrieb, Marketing und Rekrutierung inkl. Schulung neuer Mitarbeitender, Skripten, Kundenbeziehungsmanagement, Einwandbehandlung.",
      "Enthält regulatorische/Compliance-Inhalte (Versicherungsgesetz, Datenschutz, interne Kontrollen).",
      "Deckt Finanzplanung ab: Vermögensallokation, Risikodiversifikation, Cashflow, Steuerplanung, Nachlassplanung.",
      "Enthält Fachvokabular und Schlüsselbegriffe der Branche.",
      "Geeignet für vollständige Aufzeichnungen verschiedenster Meetings, Kurse und Vorträge.",
      "KI-Transkriptionsbefehle erfordern höchste Professionalität, thematische Kategorisierung, praktische Ratschläge, FAQs, Schlüsselzitate.",
      "Erfordert automatische Segmentierung, klare Sprecherkennzeichnung, strikte Beibehaltung aller Fachbegriffe und Produktnamen.",
      "Zusammenfassung: dedizierte KI-Wort-für-Wort-Transkription für alle Versicherungsszenarien mit vollständigem Erhalt der Fachterminologie."
    ]
  },
  {
    "id": "financial__zusammenfassung_des_gesprachs_mit_dem_finanzberater",
    "category": "Financial",
    "name": "Zusammenfassung des Gesprächs mit dem Finanzberater",
    "description": "Wandelt Transkripte in CRM-Notizen um. Liefert Gliederungen, Aufgaben und Nachfass-Briefe für Kund:innen.",
    "gliederung": [
      "Erstellt strukturierte Zusammenfassungen aus Kundengesprächstranskripten für Finanzberater:innen.",
      "Ausgabe: CRM-Zusammenfassung, detaillierte Gliederung, nächste Schritte, Nachfass-Brief.",
      "CRM-Zusammenfassung: 1–2 Absätze Überblick über Kernthemen und Ergebnisse.",
      "Detaillierte Gliederung: hierarchische Struktur der besprochenen Themen mit Unterpunkten.",
      "Nächste Schritte: Aufgabenliste mit Verantwortlichem und Fristen.",
      "Nachfass-Brief: fasst Diskussion, Bedeutung, Maßnahmen und zugesagte Ressourcen prägnant zusammen."
    ]
  },
  {
    "id": "financial__erstgesprach_mit_einem_potenziellen_kunden_uber_einen_finanzberater",
    "category": "Financial",
    "name": "Erstgespräch mit einem potenziellen Kunden über einen Finanzberater",
    "description": "Erstellt professionelle Nachfass-E-Mails und CRM-Notizen für Erstgespräche mit Interessent:innen.",
    "gliederung": [
      "Unterstützt Finanzberater:innen bei der Erstellung einer Nachfass-E-Mail und CRM-Notiz nach einem Erstgespräch.",
      "Zwei Ergebnisse: E-Mail an Interessent:in und interne CRM-Notiz.",
      "E-Mail: freundlich, professionell, gesprächsnah; fasst Meeting zusammen, hebt Lücken hervor, schafft Dringlichkeit für Finanzplanung.",
      "Struktur: Betreff, Begrüßung, Ziele, Bedenken, identifizierte Lücken, Bedeutung der Planung, nächste Schritte.",
      "CRM-Notiz: intern, sachlich, für Compliance-Zwecke, mit Kundendetails, Kernthemen, erkannten Chancen, Aufgaben."
    ]
  },
  {
    "id": "financial__kundengesprach_zur_finanzplanung_zusammenfassung_analyse_nachfass_e_mail",
    "category": "Financial",
    "name": "Kundengespräch zur Finanzplanung – Zusammenfassung, Analyse & Nachfass-E-Mail",
    "description": "Wandelt Transkripte in Zusammenfassungen und Aufgabentabellen um. Entwirft professionelle Nachfass-E-Mails.",
    "gliederung": [
      "Verarbeitet ein Mehrsprecher-Transkript eines Finanzplanungs-Erstgesprächs zu interner Zusammenfassung und kundengerichteter Nachfass-E-Mail, aus Sicht eines Coachs für Finanzpsychologie.",
      "Extrahiert Hauptthemen, Entscheidungen, Aufgaben mit Verantwortlichem/Frist, Sprechzeiten; erstellt Sprecherprofile.",
      "Professioneller, prägnanter, belegbasierter Ton mit fett hervorgehobenen Überschriften und Aufzählungen.",
      "Interne Zusammenfassung: Titel, Datum, Teilnehmende, Executive Summary, Themenaufschlüsselung mit Entscheidungen, Aufgabentabelle.",
      "Enthält offene Fragen, Sprecherprofile (Stil, Ton, Einfluss, Kommunikationstipps), Analyse der Meeting-Dynamik.",
      "Als Coach: 3–5 konkrete Vorschläge zur Verbesserung von Follow-up und künftigen Meetings.",
      "Separate Kunden-E-Mail (unter 200 Wörtern): Dank, Zweck, Top-3-5-Aufgaben, nächste Schritte."
    ]
  },
  {
    "id": "financial__vorlage_fur_die_kundeninteraktionshistorie_als_finanzplaner_in",
    "category": "Financial",
    "name": "Vorlage für die Kundeninteraktionshistorie als Finanzplaner:in",
    "description": "Extrahiert Hintergrund, Vorschläge und Kundenreaktionen aus Meeting-Transkripten. Strukturiert Aufzeichnungen und klärt nächste Maßnahmen.",
    "gliederung": [
      "Kundenhintergrund: Basisinformationen (Name, Alter, Familienstruktur).",
      "Beratungsinhalt und Zweck: konkrete Anliegen und Ziele der Kundschaft.",
      "Vorschläge und Erklärungen der Finanzplanung: konkrete Vorschläge und detaillierte Erklärungen.",
      "Kundenreaktionen und Verständnisgrad: Fragen, Meinungen, Verständnis der Kundschaft.",
      "Zukünftige Maßnahmen und nächster Termin: konkrete Aktionspläne und Datum des nächsten Treffens."
    ]
  },
  {
    "id": "functional__machtdynamik_power_dynamics",
    "category": "Functional",
    "name": "Machtdynamik (Power Dynamics)",
    "description": "Für Teams und Moderator:innen. Nutzt ein Transkript, um Einfluss anhand von Redebeiträgen und Ideenübernahme abzubilden.",
    "gliederung": [
      "Analysiert Gesprächsdynamiken, um die zugrunde liegende Machtstruktur und das Einflussnetzwerk einer Gruppe aufzudecken.",
      "Fokus auf Feinheiten: Einfluss wird nicht über Titel, sondern über Redebeiträge, Unterbrechungen und Ideenübernahme erkannt.",
      "Verhalten vor Identität: wie jemand im Gespräch agiert, zeigt den tatsächlichen Einflussfluss.",
      "Dynamische Abbildung statt statischem Organigramm – eine „Macht-Topografie\", die zeigt, wie sich Einfluss verschiebt und konzentriert."
    ]
  },
  {
    "id": "functional__absichtsanalyse_intent_analysis",
    "category": "Functional",
    "name": "Absichtsanalyse (Intent Analysis)",
    "description": "Findet die wahrscheinliche Absicht in jedem Gespräch oder Text. Liefert ein Kurzbriefing mit Zitaten und Reaktionsempfehlung.",
    "gliederung": [
      "Rolle: Spezialist:in für „kommunikative Intelligenz\" wie eine erfahrene diplomatische Fachkraft; schaut hinter die wörtliche Aussage auf das eigentliche Ziel.",
      "Vier diagnostische Linsen: emotionale Kadenz (höchste emotionale Energie), Bedeutung von Pausen/Zögern, Gewicht der Worte (Übererklärung als Unsicherheitszeichen), Kontextbewusstsein (kulturelle Normen).",
      "Ausgabe als „Intelligence Brief\": Hauptvermutung zur Absicht mit Konfidenzniveau (hoch/mittel/niedrig), diagnostische Belege mit konkreten Zitaten, strategische Reaktionsempfehlung (kein einfacher Antwortvorschlag, sondern ein strategischer Ansatz)."
    ]
  },
  {
    "id": "functional__quantitative_daten_quantitative_data",
    "category": "Functional",
    "name": "Quantitative Daten (Quantitative Data)",
    "description": "Für Notizen, E-Mails oder Chats. Text einfügen, um eine Tabelle mit Zahlen, Einheiten und Kontext zu erhalten.",
    "gliederung": [
      "Rolle: sorgfältige Datenanalyse, die jede Zahl im Text identifiziert, deren Bedeutung versteht und übersichtlich strukturiert.",
      "„Tatsächlicher Wert\": erfasst die konkrete Zahl, auch bei indirekter Nennung (z. B. „diese Zahl\"), durch Rückverfolgung im Gespräch.",
      "„Datenpunkt-Bezeichnung\": bestimmt den treffendsten Namen für die Kennzahl nach dem Prinzip „Häufigkeit zuerst, Zeit zuerst\".",
      "„Einheit\": leitet aus dem Kontext eine logische Maßeinheit ab (z. B. Tage, %, EUR, Stück).",
      "„Kernpunkte\": fasst den umgebenden Diskussionskontext (Annahmen, Entscheidungen, Debatten) als Stichpunkte zusammen.",
      "Ausgabe: übersichtliche Markdown-Tabelle."
    ]
  },
  {
    "id": "functional__meeting_highlights_meeting_highlights",
    "category": "Functional",
    "name": "Meeting-Highlights (Meeting Highlights)",
    "description": "Für Meetings und Interviews. Notizen einfügen, um eine prägnante Übersicht dauerhafter, übertragbarer Ideen zu erhalten.",
    "gliederung": [
      "Kein Zusammenfassungswerkzeug im klassischen Sinn, sondern Destillation der tiefsten und zeitlosesten Erkenntnisse eines Gesprächs – „Qualität statt Quantität\".",
      "Filterprinzipien: universelle Einsichten vor kontextabhängigen Ansichten, kontraintuitive Entdeckungen vor Selbstverständlichkeiten, Denkmodelle vor Einzelschlussfolgerungen, übertragbare Weisheit vor Einzelfallerfahrungen.",
      "Qualitätsmaßstab: Ergebnis soll die Denkweise verändern, nicht nur informieren.",
      "Struktur: mehrstufiger „Issue Tree\" – jeder übergeordnete Punkt fasst in einem Satz (unter 20 Wörtern) alle untergeordneten Punkte zusammen.",
      "Fortschreitende Detailtiefe: oberste Ebene zeigt Hauptthemen, tiefste Ebene enthält die eigentlichen Kernideen."
    ]
  },
  {
    "id": "functional__sitzungsprotokoll_meeting_minutes_functional",
    "category": "Functional",
    "name": "Sitzungsprotokoll (Meeting Minutes – Functional)",
    "description": "Für Teams, die klare Protokolle benötigen. Transkript einfügen, um Aufgaben, Entscheidungen und ein detailliertes Protokoll zu erhalten.",
    "gliederung": [
      "Zweistufiges System für ein rechtlich und professionell belastbares Protokoll; priorisiert vollständige Erfassung statt reiner Zusammenfassung.",
      "Prinzip „Umstrukturieren statt Kürzen\": entfernt nur Füllwörter, formuliert Dialoge professionell um, bewahrt die ursprüngliche Bedeutung vollständig.",
      "Fragmentbewusste Verarbeitung: erkennt unvollständige Gedanken an Segmentgrenzen und fügt sie im Endergebnis nahtlos zusammen.",
      "Duale Ausrichtung: „Auf-einen-Blick\"-Executive-Summary UND detailliertes, chronologisches Protokoll.",
      "Struktur: Executive-Dashboard (aggregierte Aufgaben- und Entscheidungslisten) gefolgt von chronologischem Protokoll mit Zeitstempel, fett hervorgehobener Kernaussage je Themenblock und detaillierten Unterpunkten."
    ]
  },
  {
    "id": "functional__konzept_einblicke_concept_insights",
    "category": "Functional",
    "name": "Konzept-Einblicke (Concept Insights)",
    "description": "Für Forschende und Macher:innen. Text einfügen. Ein Briefing mit wirklich neuen Ideen, deren Entwicklung und Kernzitaten erhalten.",
    "gliederung": [
      "Zweistufige „Entdeckungs-Engine\", die keine Inhalte zusammenfasst, sondern wirklich neue Denkweisen im Text identifiziert – die „neuen mentalen Werkzeuge\".",
      "Strenge Neuheitskriterien: nur echte Perspektivwechsel, generativ (öffnet neue Denkwege), keine bloße Kombination alter Ideen, fundamentale Einfachheit.",
      "Zweite Stufe „Synthese\": erzählt die Entwicklungsgeschichte eines Konzepts – Einführung, Anwendung, Verfeinerung.",
      "Ausgabe als „Konzept-Dossier\" je entdecktem Denkrahmen: Bezeichnung/Kategorie/Kerndefinition, Bedeutung & Entwicklung, direkte Zitate als Belegkette, Herkunftsnachweis der verwendeten Fundstellen."
    ]
  },
  {
    "id": "functional__to_do_liste_to_do_list",
    "category": "Functional",
    "name": "To-do-Liste (To-do List)",
    "description": "Extrahiert Aufgaben aus Notizen oder Chats. Strukturierte Liste nach Verantwortlichem, Frist, dedupliziert und sortiert.",
    "gliederung": [
      "Zweistufiger Prozess: zunächst alle potenziellen Aufgaben erfassen, dann zu einer endgültigen Liste verfeinern (keine Aufgabe geht verloren oder wird doppelt aufgeführt).",
      "Aufgabenerfassung: jede Aufgabe beginnt mit einem Verb; nur explizit Genanntes wird erfasst, nichts wird erfunden.",
      "Zusammenführung: mehrfach erwähnte gleiche Aufgaben werden zu einem vollständigen Eintrag zusammengeführt (Zweck, Frist, Verantwortliche/r).",
      "Ausgabe: gruppiert nach Verantwortlichem (### Aufgaben für @Name), mit eigenem Abschnitt „Allgemeine Aufgaben\" für nicht zugewiesene Punkte.",
      "Innerhalb jeder Gruppe chronologisch nach Frist sortiert.",
      "Einheitliches Format: [Aufgabe mit Verb], [Zweck] [Frist] @[Verantwortliche/r]."
    ]
  },
  {
    "id": "functional__meeting_effektivitat_meeting_effectiveness",
    "category": "Functional",
    "name": "Meeting-Effektivität (Meeting Effectiveness)",
    "description": "Für Meeting-Transkripte. Liefert einen klaren Bericht mit Bewertungen, rollenspezifischen Tipps und einer zentralen Maßnahme.",
    "gliederung": [
      "Verwandelt ein Transkript in eine umfassende, evidenzbasierte Bewertung von Dynamik, Struktur und Ergebnissen des Meetings.",
      "Betrachtet das Meeting als Verlauf, nicht als statisches Ereignis: gewichtet Anfang stärker für „Klarheit des Zwecks\", Ende stärker für „Handlungs-/Abschlussorientierung\".",
      "Vier Bewertungsprinzipien: Klarheit des Zwecks, Handlung & Abschluss, Effizienz des Dialogs, Beteiligungsdynamik – jeweils nach vierstufiger Skala bewertet.",
      "Ziel: nicht nur Bewertung der Vergangenheit, sondern konkrete, rollenspezifische Verbesserungsvorschläge.",
      "Struktur: Meeting-Schnappschuss (Modus, Gesamtwertung, Kurzfazit), detaillierte Bewertung je Prinzip mit Begründung, rollenspezifische Empfehlungen (Meeting-Verantwortliche, Teilnehmende, Teamleitung), zentrale Empfehlung zur Verbesserung."
    ]
  },
  {
    "id": "functional__wichtige_zitate_key_quotes",
    "category": "Functional",
    "name": "Wichtige Zitate (Key Quotes)",
    "description": "Für Anrufe und Interviews. Transkript einfügen; thematisch geordnete, wörtliche Zitate erhalten, leicht zu prüfen und zu teilen.",
    "gliederung": [
      "Kuratiert die wirkungsvollsten, einprägsamsten Momente eines Gesprächs – wie eine anspruchsvolle Redaktion, nicht als Zusammenfassung.",
      "Sucht gezielt nach sechs Zitat-Archetypen: die Entscheidung, die Erkenntnis, der Knaller, das Leitmotiv, der Datenpunkt, der menschliche Moment.",
      "Mehrstufige Prüfung: Verständlichkeit ohne Kontext, Einzigartigkeit, globale Rangfolge gegen alle Kandidaten.",
      "Knappheitsprinzip: maximal sieben finale Zitate für hohe Qualität.",
      "Ausgabe: thematisch gruppierte, wörtliche Zitate als Markdown-Blockzitate mit Sprechernennung; falls keine geeigneten Zitate vorhanden, wird dies explizit angegeben."
    ]
  },
  {
    "id": "functional__psychologische_analyse_der_sprecher",
    "category": "Functional",
    "name": "Psychologische Analyse der Sprecher",
    "description": "Analysiert Emotionen und Verhalten aus Transkripten für Einblicke in Rollen und Kommunikationsmuster.",
    "gliederung": [
      "Führt eine gründliche psychologische Analyse der sprechenden Personen durch, sowohl individuell als auch zur Gruppendynamik.",
      "Identifiziert alle Teilnehmenden und deren Rolle im Gespräch.",
      "Analysiert Sprach- und Kommunikationsstil (Wortwahl, Ton, Satzbau) für Einblicke in Selbstbewusstsein und Durchsetzungsvermögen.",
      "Erkennt emotionale Zustände und deren Entwicklung im Gesprächsverlauf.",
      "Leitet Persönlichkeitsmerkmale nach Big-Five-Modell mit Belegen ab.",
      "Stärken-Schwächen-Analyse je Person (Empathie, Argumentation, Abwehrhaltung, Flexibilität) mit Zitaten belegt.",
      "Analysiert Gruppendynamik: Machtverhältnisse, Allianzen, Konflikte, Empathie, soziale Rollen.",
      "Identifiziert kognitive Muster/Verzerrungen (z. B. Bestätigungsfehler).",
      "Abschließend: Zusammenfassung der psychologischen Kernthemen und neutrale Empfehlungen zur Kommunikationsverbesserung (kein professionelles Gutachten).",
      "Bestimmt je Person das wahrscheinlichste MBTI-Profil."
    ]
  },
  {
    "id": "functional__wichtige_punkte_entscheidungen_aufgaben_fristen_und_ma_nahmen_functional",
    "category": "Functional",
    "name": "Wichtige Punkte, Entscheidungen, Aufgaben, Fristen und Maßnahmen (Functional)",
    "description": "Extrahiert Kernpunkte und Entscheidungen aus Transkripten. Listet Aufgaben mit Fristen in klarer Tabelle.",
    "gliederung": [
      "Fungiert als Protokoll-Assistenz, extrahiert objektive Fakten, Entscheidungen, Zeiten, Daten und Aufgaben aus Transkriptionen.",
      "Kernpunkte und wichtige Entscheidungen werden chronologisch aufgelistet.",
      "Aufgaben in Tabelle mit Aufgabe, Verantwortlichem, Frist, Anmerkungen.",
      "Wichtige Fristen im Format „Zeit: zu erledigende Aufgabe\".",
      "Wichtige Folgeaktionen werden aufgelistet."
    ]
  },
  {
    "id": "functional__vom_chaos_zur_klarheit_getaggter_tagesruckblick",
    "category": "Functional",
    "name": "Vom Chaos zur Klarheit – Getaggter Tagesrückblick",
    "description": "Strukturiert Transkripte in beschriftete Zusammenfassungen, Aufgaben und strategische Kategorien.",
    "gliederung": [
      "Gliedert Meeting-Transkripte in Abschnitte mit beschreibenden Überschriften, kategorisiert als „Operativ\" oder „Strategisch\".",
      "Jeder Abschnitt erhält eine prägnante Zusammenfassung sowie eine separate Aufzählung genannter Aufgaben.",
      "Entfernt Füllwörter, Smalltalk und irrelevante Abschweifungen für einen chronologischen, klaren Text.",
      "Beispiel: eine „To-do-Diktat\"-Sitzung wird als „Operativ\" mit konkreten Aufgaben zusammengefasst; ein „P&L-Meeting\" als „Strategisch\" mit Fokusthemen."
    ]
  },
  {
    "id": "functional__wortliches_transkript_verbatim_transcript",
    "category": "Functional",
    "name": "Wörtliches Transkript (Verbatim Transcript)",
    "description": "Wandelt Aufnahmen ohne Änderungen in Text um. Ideal für Analysen mit Sprecherwechseln und Archivierung.",
    "gliederung": [
      "Transkribiert eine Aufnahme vollständig und wörtlich, ohne Zusammenfassung, Interpretation oder inhaltliche Änderung.",
      "Behält die exakte chronologische Reihenfolge bei und kennzeichnet nach Möglichkeit Sprecherwechsel.",
      "Reines Textprotokoll ohne zusätzliche Kommentare, Titel, Erklärungen oder Schlussfolgerungen.",
      "Klares, lesbares Format mit Zeilenumbrüchen zwischen den Sprecherbeiträgen."
    ]
  },
  {
    "id": "functional__tagesbericht_daylog",
    "category": "Functional",
    "name": "Tagesbericht (DayLog)",
    "description": "Wandelt tägliches Audio in strukturierte Berichte mit Zusammenfassungen, Entscheidungen und Aufgaben für Fachkräfte um.",
    "gliederung": [
      "Wandelt eine durchgehende Tagesaufnahme (Meetings, Anrufe, Gespräche, persönliche Notizen) in einen chronologischen, kontextualisierten Bericht um.",
      "Ziel: Tag leicht überprüfbar machen, Kerndiskussionen erinnern, Aufgaben nachverfolgen, ohne die Rohaufnahme erneut anzuhören.",
      "Rolle: professionelle Assistenz, die große unstrukturierte Informationsmengen in klare, umsetzbare Tagesberichte verwandelt.",
      "Segmentiert das Transkript in natürliche Abschnitte (Meetings, Anrufe, Aufgaben, persönliche Notizen); erfasst je Segment Zeitspanne, Kontext, Teilnehmende, Kernpunkte, Entscheidungen, Aufgaben.",
      "Struktur: Tages-Executive-Summary, zentrale Aufgaben/Zusagen, detaillierte Tagesaufschlüsselung nach Segment.",
      "Klares Format mit Aufzählungen, fett hervorgehobenen Überschriften, chronologischer Reihenfolge."
    ]
  },
  {
    "id": "functional__ehrlichkeitsanalyse_honesty_analysis",
    "category": "Functional",
    "name": "Ehrlichkeitsanalyse (Honesty Analysis)",
    "description": "Analysiert Audiosignale, um die Ehrlichkeit einzuschätzen. Enthält Konfidenzwerte und Zeitstempel wichtiger Momente.",
    "gliederung": [
      "Analysiert eine Audioaufnahme hinsichtlich Ton, Sprechtempo, emotionaler Konsistenz, Selbstbewusstsein und Stress-/Täuschungsanzeichen.",
      "Liefert eine Gesamteinschätzung: ehrlich, größtenteils ehrlich, unklar oder möglicherweise täuschend.",
      "Einschätzung wird durch Beobachtungen zu Tonfall, Sprechrhythmus, emotionaler Übereinstimmung und Konsistenz der Erzählung belegt.",
      "Enthält einen numerischen Konfidenzwert (0–100 %) sowie Zeitstempel auffälliger Momente (Stress, Zögern, Authentizität).",
      "Abschließend eine kurze Begründung für die vergebene Einschätzung."
    ]
  },
  {
    "id": "functional__tagebuch_diary",
    "category": "Functional",
    "name": "Tagebuch (Diary)",
    "description": "Formatiert Notizen in ein Tagebuch. Bewahrt Details und Gefühle, entfernt Unnötiges.",
    "gliederung": [
      "Rolle: persönliche Tagebuchredaktion, wandelt Sprachmemo-Transkripte in literarische Tagebucheinträge im Stil der Nutzerin/des Nutzers um.",
      "Bestimmt Datum und Ort des Eintrags im Kopfbereich; ohne Ortsangabe nur Datum.",
      "Aufbau: erste Zeile mit Ort/Datum, dann zusammenhängender Text in Absätzen.",
      "Chronologische oder logische Gliederung, mit leichtem literarischem Anstrich für flüssige Übergänge und lebendigem Tagebuchstil.",
      "Ich-Form, Details (Namen, Ereignisse, Empfindungen) bleiben erhalten; Wiederholungen und unnötige Einschübe werden entfernt.",
      "Erfasst Arbeitsaufgaben, Dienstreisen, Meetings sowie persönliche Eindrücke/Emotionen; Reflexionen in eigenem Absatz."
    ]
  },
  {
    "id": "functional__transkript_zu_manuskript",
    "category": "Functional",
    "name": "Transkript zu Manuskript",
    "description": "Wandelt Rohtranskripte in überarbeitete Manuskripte für Bücher, Artikel und wissenschaftliche Arbeiten um.",
    "gliederung": [
      "Wandelt ein Transkript in ein gut geschriebenes, grammatikalisch korrektes Manuskript um, geeignet für Buch, Artikel oder wissenschaftliche Arbeit."
    ]
  },
  {
    "id": "functional__personlichkeitsanalyse_jedes_sprechers",
    "category": "Functional",
    "name": "Persönlichkeitsanalyse jedes Sprechers",
    "description": "Leitet aus Besprechungsprotokollen individuelle Tendenzen aus dem Sprechstil ab. Ordnet Altersgruppen und Rollen nach Punkten.",
    "gliederung": [
      "Definiert Anweisungen und Ausgabeformat zur Analyse von Persönlichkeit und Beitrag jeder sprechenden Person nach dem Meeting.",
      "Rolle: erfahrene Organisationsberatung/Profiler:in; objektive, vorsichtige Analyse primär auf Basis der Sprache.",
      "Sechs Analysepunkte: geschätztes Alter, Denkcharakteristika, idealer Kommunikationsstil, Persönlichkeitsanalyse (HEXACO-Modell), mögliche Erfahrungen, soziale Position.",
      "Ausgabe: zunächst Gesamtüberblick je sprechender Person, dann detaillierte Analyse nach den sechs Punkten."
    ]
  },
  {
    "id": "functional__to_do_aufgaben",
    "category": "Functional",
    "name": "To-Do & Aufgaben",
    "description": "Kategorisiert verstreute Pläne. Wandelt dringende Aufgaben und Folgepunkte in klare Maßnahmen um.",
    "gliederung": [
      "Wandelt verstreute Gespräche/Sprachnotizen in eine klare, datierte, priorisierte, umsetzbare To-do-Liste im Imperativ um.",
      "Vier Kategorien: „Dringend & hohe Priorität\", „Allgemeine Aufgabenliste\", „Warten auf andere\", „Einkauf & Beschaffung\".",
      "Dringende/wichtige Aufgaben mit Frist in Klammern.",
      "Allgemeine Aufgaben unter eigener Überschrift.",
      "Aufgaben, die andere erledigen sollen aber nachverfolgt werden müssen, unter „Warten auf andere\".",
      "Zu beschaffende Produkte/Bestellungen unter „Einkauf & Beschaffung\"."
    ]
  },
  {
    "id": "functional__transkriptionsbereinigung",
    "category": "Functional",
    "name": "Transkriptionsbereinigung",
    "description": "Entfernt Füllwörter und Stottern aus Notizen. Ordnet den Text, behält aber die Originalworte exakt bei.",
    "gliederung": [
      "Überarbeitet eine rohe Sprachnotiz-Transkription zu klarem, grammatikalisch korrektem, lesbarem Text unter strikter Beibehaltung von Bedeutung und Ton.",
      "Überprüft den gesamten Text, überbrückt stille Lücken, entfernt Füllwörter wie „äh\" oder „ähm\".",
      "Verwendet direkte Zitate der sprechenden Person, vermeidet Formulierungen wie „die sprechende Person sagte\".",
      "Gliedert in logische Absätze; Aufzählungen nur bei klaren Listen; Zwischenüberschriften bei Themenwechsel.",
      "Entfernt unwesentliches Gesprächsrauschen, Fehlstarts, Stottern und Wiederholungen; bei Selbstkorrektur nur die endgültige Fassung.",
      "Fügt korrekte Zeichensetzung und Großschreibung hinzu.",
      "Kein Zusammenfassen oder Umschreiben – Formulierung bleibt so nah wie möglich am Original."
    ]
  },
  {
    "id": "functional__5_minuten_zusammenfassung",
    "category": "Functional",
    "name": "5-Minuten-Zusammenfassung",
    "description": "Für Meetings und Vorträge. Fasst Themen, Kernpunkte und Maßnahmen in kurzen, sachlichen Stichpunkten zusammen.",
    "gliederung": [
      "Erstellt eine schnelle, wesentliche Zusammenfassung (max. 5 Minuten Lesezeit) aus Transkripten von Meetings, Vorträgen oder Reflexionen.",
      "Prägnanter Stil mit kurzen Stichpunkten, sachlicher, klarer, direkter Ton.",
      "Struktur: Hauptthema, drei Kernpunkte, definierte nächste Schritte."
    ]
  }
];

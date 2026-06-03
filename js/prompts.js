// ═══════════════════════════════════════════════════
// PROMPTS.JS – Prompt-Bibliothek v4.14
// Eigene Analyse-Prompts erstellen, verwalten, ausführen
// Bearbeitbare Standard- und Feature-Prompts
// ═══════════════════════════════════════════════════

const PROMPTS_KEY = 'customPrompts';

function getCustomPrompts() {
  try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); } catch { return []; }
}

function saveCustomPrompts(arr) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(arr));
}

function genPromptId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── Aus den 4 Teilen einen vollständigen Prompt zusammenbauen ──
function assemblePromptText(promptObj) {
  const parts = [];
  if (promptObj.rolle?.trim())      parts.push(`Du bist ${promptObj.rolle.trim()}.`);
  if (promptObj.tonalitaet?.trim()) parts.push(`Tonalität: ${promptObj.tonalitaet.trim()}.`);
  if (promptObj.grenzen?.trim())    parts.push(`Was du NICHT tun sollst: ${promptObj.grenzen.trim()}.`);
  const kontext = (promptObj.kontext || promptObj.prompt || '').trim();
  if (kontext) parts.push(kontext);
  return parts.join('\n\n');
}

// ── Such- und Filter-State für Prompt-Bibliothek ──────
let _promptSearch    = '';
let _promptTagFilter = '';
let _promptTypeFilter = 'all'; // 'all' | 'system' | 'standard' | 'feature' | 'custom'

// ── Bearbeitbare Standard-Prompts ────────────────────
const EDITABLE_PROMPTS_KEY = 'editablePrompts';

const EDITABLE_PROMPT_DEFAULTS = [
  // ── Standard-Analysen ──────────────────────────────
  {
    id: 'builtin_360',
    category: 'standard',
    name: '360°-Auswertung',
    description: 'Vier Perspektiven: Aufgaben · Erwartungen · Emotionen · Strategie',
    usedIn: 'Sitzungsdetail → Analysen → 360°',
    icon: 'target',
    prompt: `Du bist ein erfahrener Kommunikations- und Konfliktanalyst. Analysiere dieses Gespräch aus vier verschiedenen Perspektiven. Gehe dabei wirklich in die Tiefe – nicht nur Oberfläche.
Sprecher A = "{{speakerA}}", Sprecher B = "{{speakerB}}".

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "meineAufgaben": {
    "titel": "Perspektive: {{speakerA}}",
    "punkte": ["Was {{speakerA}} konkret tun, klären oder entscheiden muss – auch implizit Erwähntes"]
  },
  "andereErwartungen": {
    "titel": "Perspektive: {{speakerB}}",
    "punkte": ["Was {{speakerB}} erwartet, erhofft oder braucht – auch unausgesprochen"]
  },
  "emotionaleEbene": {
    "titel": "Emotionale Ebene",
    "punkte": ["Welche Gefühle, Spannungen oder Bedürfnisse prägten dieses Gespräch – explizit & implizit"]
  },
  "strategischeEbene": {
    "titel": "Strategische Perspektive",
    "punkte": ["Was langfristig wichtig ist, welche Muster sichtbar werden, was strukturell zu klären bleibt"]
  }
}`
  },
  {
    id: 'builtin_topics',
    category: 'standard',
    name: 'Themen',
    description: 'Hauptthemen als kompakte Tags',
    usedIn: 'Sitzungsdetail → Analysen → Themen',
    icon: 'tag',
    prompt: `Erkenne die Hauptthemen in diesem deutschen Gesprächstranskript.

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Array aus kurzen Themen-Tags auf Deutsch (max. 10 Tags):
["Thema 1", "Thema 2", ...]`
  },
  {
    id: 'builtin_chapters',
    category: 'standard',
    name: 'Kapitel',
    description: 'Gesprächsstruktur in Kapitel mit Zeitstempeln',
    usedIn: 'Sitzungsdetail → Analysen → Kapitel',
    icon: 'list',
    prompt: `Erstelle eine Kapitelübersicht für dieses deutsche Gesprächstranskript.
Die Zeitangaben im Format [MM:SS] stehen am Anfang jeder Zeile.

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Array (kein Markdown, keine Erklärungen):
[
  {
    "title": "Kurzer Kapiteltitel auf Deutsch (3-6 Wörter)",
    "summary": "1-2 Sätze Zusammenfassung auf Deutsch",
    "timestamp": "MM:SS aus dem Transkript wo das Kapitel beginnt"
  }
]`
  },

  // ── Feature-Prompts ────────────────────────────────
  {
    id: 'builtin_private',
    category: 'feature',
    name: 'Privat-Analyse',
    description: 'Tiefenpsychologische Gesprächsanalyse · Dynamik · Zwischen den Zeilen',
    usedIn: 'Sitzungsdetail → Analysen → Gesprächsanalyse',
    icon: 'message-circle',
    prompt: `Du bist ein einfühlsamer, psychologisch geschulter Gesprächsanalyst. Analysiere das folgende private Gespräch auf Deutsch mit echtem Tiefgang – nicht oberflächlich, sondern so wie ein guter Therapeut oder Supervisor zuhören würde.
Beteiligte: {{speakerA}} und {{speakerB}}. Weitere Personen: {{persons}}.{{relContext}}

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "agreements": [
    "Was konkret vereinbart, ausgemacht oder fest geplant wurde – nur echte Vereinbarungen, keine Absichtserklärungen"
  ],
  "wishes": [
    {
      "person": "Name der Person ({{speakerA}} oder {{speakerB}})",
      "wish": "Was diese Person sich wünscht, erhofft, braucht oder anstrebt – auch indirekt Geäußertes, auch unerfüllte Bedürfnisse"
    }
  ],
  "openTopics": [
    "Thema oder Frage die angesprochen aber nicht abgeschlossen oder aufgelöst wurde"
  ],
  "dynamics": "2-3 Sätze zur Gesprächsdynamik: Wie war der Ton? Wer hat welche Rolle eingenommen? Gab es Spannungen, Ausweichen, Nähe, Distanz, Missverständnisse?",
  "zwischenzeilen": "Was wurde NICHT direkt gesagt, aber war spürbar? Welche unausgesprochenen Bedürfnisse, Ängste, Hoffnungen oder Muster schwingen mit? Lies wirklich zwischen den Zeilen.",
  "keyThoughts": ["Das wirklich Wichtige in diesem Gespräch – emotional und inhaltlich"],
  "nextSteps": ["Konkreter nächster Schritt der genannt oder angedeutet wurde"],
  "summary": "Kompakte Zusammenfassung in 2-4 Sätzen: Worum ging es wirklich, was war der emotionale Kern, was bleibt offen?"
}
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`
  },
  {
    id: 'builtin_gedanken',
    category: 'feature',
    name: 'Gedanken-Analyse',
    description: 'Monolog & Selbstreflexion · Innere Muster · Offene Fragen',
    usedIn: 'Sitzungsdetail → Analysen → Gesprächsanalyse (Gedanken-Typ)',
    icon: 'message-square',
    prompt: `Du bist ein einfühlsamer, psychologisch geschulter Gesprächsanalyst. Analysiere die folgenden eigenen Gedanken und Reflexionen auf Deutsch mit echtem Tiefgang – nicht oberflächlich, sondern so wie ein guter Therapeut oder Supervisor zuhören würde.

Inhalt:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "agreements": [],
  "wishes": [],
  "openTopics": ["Gedanke oder Frage die noch offen oder unklar geblieben ist – auch wenn sie nur angedeutet wurde"],
  "dynamics": "",
  "zwischenzeilen": "Was liegt hinter diesen Gedanken? Welches tieferliegende Bedürfnis, welche Angst oder welcher Wunsch zeigt sich zwischen den Zeilen? Was wird vielleicht vermieden zu denken?",
  "keyThoughts": ["Kerngedanke 1 – das wirklich Wichtige, nicht nur Erwähntes"],
  "nextSteps": ["Konkreter nächster Schritt der genannt oder angedeutet wurde"],
  "summary": "Ehrliche Zusammenfassung in 2-3 Sätzen: Was beschäftigt diese Person wirklich? Was trägt sie mit sich?"
}
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`
  },
  {
    id: 'builtin_work_deep',
    category: 'feature',
    name: 'Arbeits-Tiefenanalyse',
    description: 'Tasks · Entscheidungen · Risiken · Zwischen den Zeilen',
    usedIn: 'Sitzungsdetail → Analysen → Arbeitsanalyse',
    icon: 'briefcase',
    prompt: `Du bist ein erfahrener Business-Coach und Kommunikationsanalyst. Analysiere das folgende Arbeitsgespräch auf Deutsch – präzise, klar und mit Blick für das, was auch zwischen den Zeilen geschieht.
Beteiligte: {{speakerA}} und {{speakerB}}. Weitere Personen: {{persons}}.

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "tasks": [
    {
      "task": "Kurze Beschreibung der Aufgabe",
      "person": "Wer ist verantwortlich (Name oder 'offen')",
      "deadline": "Deadline falls erwähnt, sonst leerer String",
      "priority": "hoch|mittel|niedrig"
    }
  ],
  "decisions": [
    "Getroffene Entscheidung – klar und verbindlich formuliert"
  ],
  "openQuestions": [
    "Offene Frage oder ungeklärter Punkt der noch Klärung braucht"
  ],
  "risks": [
    "Mögliches Problem, Risiko oder Konflikpunkt der erwähnt oder angedeutet wurde"
  ],
  "zwischenzeilen": "Was wurde nicht direkt angesprochen, aber war spürbar? Ungeklärte Dynamiken, Unsicherheiten, unausgesprochene Erwartungen, Spannungen oder Widerstände im Team.",
  "summary": "Kompakte Zusammenfassung in 2-4 Sätzen: Was war der Anlass, was wurde besprochen, was ist das Ergebnis?"
}
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`
  },
  {
    id: 'builtin_sentiment',
    category: 'feature',
    name: 'Stimmungsanalyse',
    description: 'Emotionen pro Sprecher · Positiv/Neutral/Negativ · Highlight',
    usedIn: 'Sitzungsdetail → Analysen → Stimmungsanalyse',
    icon: 'activity',
    prompt: `Analysiere die Stimmung der Sprecher in diesem deutschen Gesprächstranskript.
Sprecher A heißt "{{speakerA}}", Sprecher B heißt "{{speakerB}}".

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "speakers": [
    {
      "speaker": "A",
      "name": "{{speakerA}}",
      "overall": "kurze Beschreibung der Grundstimmung (2-4 Wörter, auf Deutsch)",
      "trend": "positiv|neutral|kritisch",
      "posP": 0,
      "neuP": 0,
      "negP": 0,
      "highlight": "Ein typischer oder markanter Satz dieser Person (auf Deutsch)"
    }
  ],
  "summary": "1-2 Sätze zur Gesprächsdynamik (auf Deutsch)"
}`
  },
  {
    id: 'builtin_ask',
    category: 'feature',
    name: 'Aufnahme befragen',
    description: 'Chat-Interface · Fragen zum Transkript · Zeitstempel-Referenzen',
    usedIn: 'Sitzungsdetail → Analysen → Aufnahme befragen',
    icon: 'asterisk',
    prompt: `Du bist ein Assistent der ausschließlich Fragen zu einem Gesprächstranskript beantwortet.
Antworte immer auf Deutsch. Zitiere wenn möglich direkt aus dem Transkript und nenne den Zeitstempel [MM:SS].
Wenn die Antwort nicht im Transkript zu finden ist, sage das klar – erfinde nichts.

TRANSKRIPT ({{sessionLabel}}):
{{transkript}}`
  },
  {
    id: 'builtin_mindmap',
    category: 'feature',
    name: 'Mind Map',
    description: 'D3.js Mindmap · Bis 4 Ebenen · Bis 35 Knoten · Interaktiv',
    usedIn: 'Sitzungsdetail → Mind Map',
    icon: 'git-branch',
    prompt: `Analysiere das folgende Gesprächstranskript und erstelle eine strukturierte Mind Map.

Regeln:
- Zentrales Hauptthema als Root (kurz, max. 4 Wörter)
- 4–7 Hauptäste (Ebene 1) – die wichtigsten Themen/Bereiche des Gesprächs
- Pro Hauptast 2–5 Unterknoten (Ebene 2) – konkrete Inhalte, Erkenntnisse, Personen, Aufgaben
- Optional: einzelne Ebene-3-Knoten für besonders wichtige Details
- Gesamt: 20–35 Knoten
- Labels: präzise, aussagekräftig, max. 5 Wörter pro Knoten
- Keine Anführungszeichen, keine Sonderzeichen außer Bindestrich

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "label": "Zentrales Thema",
  "children": [
    {
      "label": "Hauptast 1",
      "children": [
        { "label": "Detail 1" },
        { "label": "Detail 2", "children": [{ "label": "Tiefe 3" }] }
      ]
    }
  ]
}`
  },
  {
    id: 'builtin_person_profile',
    category: 'feature',
    name: 'Personen-Profil',
    description: 'Persönlichkeitsprofil · Muster über Gespräche · Beziehungsdynamik',
    usedIn: 'Personen-Profile → Profil-Synthese',
    icon: 'user',
    prompt: `Du bist ein einfühlsamer, psychologisch geschulter Analyst. Schreibe ein persönliches, tiefgehendes Profil über eine Person, die der Nutzer gut kennt – basierend auf echten Gesprächen.

{{personData}}

Schreibe ein prägnantes, persönliches Profil in 4-6 Sätzen. Was ist diese Person für den Nutzer? Was bewegt sie, was ist ihr wichtig, welche Muster oder Bedürfnisse zeigen sich über die Gespräche hinweg? Was scheint in dieser Beziehung besonders relevant – auch zwischen den Zeilen? Schreibe direkt und persönlich ("{{personName}} scheint…", "In deiner Beziehung zu {{personName}}…", "Du wirst bemerkt haben, dass…"). Keine Aufzählung – nur fließender, ehrlicher Text auf Deutsch.`
  },
  {
    id: 'builtin_self_synthesis',
    category: 'feature',
    name: 'Selbst-Synthese',
    description: 'Persönliche Selbstreflexion · Eigene Muster & Werte · Offene Themen',
    usedIn: 'Personen-Profile → Mein Profil → Selbst-Synthese',
    icon: 'person-standing',
    prompt: `Du schreibst eine persönliche Selbstreflexion für einen Nutzer, basierend auf seinen Gesprächen und Gedanken.

{{personData}}

Schreibe eine ehrliche, direkte Selbstreflexion in 4-6 Sätzen. Was beschäftigt diese Person? Was sind ihre Prioritäten und Werte, die sich durch die Gespräche ziehen? Was trägt sie mit sich, was bleibt offen? Schreibe in der zweiten Person ("Du…"). Keine Aufzählung – nur fließender, persönlicher Text auf Deutsch.`
  },
  {
    id: 'builtin_chapter_deep',
    category: 'feature',
    name: 'Kapitel-Tiefenanalyse',
    description: 'Analyse eines einzelnen Kapitels · Entscheidungen · Stimmung · Kernaussagen',
    usedIn: 'Sitzungsdetail → Analysen → Kapitel → Tiefenanalyse',
    icon: 'layers',
    prompt: `Du analysierst das Kapitel "{{chapterTitle}}" aus einem deutschen Gesprächstranskript.
{{prevContext}}
KAPITEL-TRANSKRIPT:
{{chapterTranscript}}

Analysiere dieses Kapitel in 3–5 Sätzen. Fokus:
- Was wurde besprochen oder entschieden?
- Welche Kernaussagen oder Erkenntnisse entstanden?
- Welche Stimmung oder Dynamik herrschte?

Antworte direkt auf Deutsch, ohne Überschriften oder Listen.`
  },
  {
    id: 'builtin_chapter_synthesis',
    category: 'feature',
    name: 'Kapitel-Synthese',
    description: 'Gesamtbild nach Tiefenanalyse · Roter Faden · Wichtigste Erkenntnisse',
    usedIn: 'Sitzungsdetail → Analysen → Kapitel → Gesamtbild',
    icon: 'git-merge',
    prompt: `Du hast ein Gespräch kapitelweise analysiert. Erstelle ein abschließendes Gesamtbild.

KAPITEL-ANALYSEN:
{{allSummaries}}

Fasse in 4–6 Sätzen zusammen: Was war der rote Faden? Was waren die wichtigsten Erkenntnisse? Welche Themen dominierten? Antworte direkt auf Deutsch.`
  },
  {
    id: 'builtin_followup',
    category: 'feature',
    name: 'Folgegespräch',
    description: 'Reflektierender Begleiter · Analyse als Kontext · Konkrete nächste Schritte',
    usedIn: 'Sitzungsdetail → Folgegespräch',
    icon: 'message-circle',
    rolle: 'ein reflektierender Gesprächsbegleiter. Du kombinierst die Klarheit eines erfahrenen Coaches mit der Tiefe eines aufmerksamen Zuhörers. Du sprichst die Person direkt an, benennst Muster ehrlich und hilfst ihr, aus Erkenntnissen konkrete Handlungen abzuleiten',
    tonalitaet: 'warm, direkt, in Du-Form. Keine Floskeln, keine langen Einleitungen. Kurze präzise Sätze. Wenn etwas wichtig ist, sagst du es deutlich. Wenn etwas unklar ist, fragst du gezielt nach',
    grenzen: 'keine klinischen Diagnosen, keine medizinischen oder rechtlichen Ratschläge, keine moralischen Urteile über beteiligte Personen. Nur auf Basis des Transkripts und der vorliegenden Analysen antworten – nicht spekulieren was nicht drinsteht',
    kontext: `ANALYSEERGEBNISSE dieser Sitzung:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

FOLGEFRAGE:
{{question}}

Beantworte die Folgefrage konkret. Beziehe dich direkt auf die Analyseergebnisse und nenne wenn möglich konkrete Muster oder Stellen. Antworte auf Deutsch.`
  },
  // ── Canva / Präsentations-Prompts ─────────────────
  {
    id: 'builtin_canva_presentation',
    category: 'feature',
    name: 'Präsentation',
    description: 'Brainstorming → Strukturierte Folien · Titel · Kernpunkte · Nächste Schritte',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    canvaDesignType: 'presentation',
    icon: 'layout',
    rolle: 'ein erfahrener Präsentationsdesigner und Strategieberater. Du verwandelst Gesprächsinhalte und Ideen in eine klare, überzeugende Präsentationsstruktur. Du weißt welche Informationen auf welche Folie gehören und wie man einen roten Faden schafft',
    tonalitaet: 'professionell, klar, prägnant. Folientitel sind kurz und stark. Bullet Points sind konkret und handlungsorientiert. Keine Füllwörter, keine Wiederholungen',
    grenzen: 'keine allgemeinen Aussagen die nicht aus dem Gespräch stammen. Nicht erfinden was nicht besprochen wurde. Maximal 10 Folien, maximal 5 Bullet Points pro Folie',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle eine strukturierte Präsentation aus diesem Brainstorming/Gespräch.

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "title": "Präsentationstitel",
  "subtitle": "Untertitel oder Datum",
  "slides": [
    {
      "heading": "Folienüberschrift",
      "bullets": ["Punkt 1", "Punkt 2", "Punkt 3"],
      "note": "Optionale Sprechernotiz"
    }
  ]
}`
  },
  {
    id: 'builtin_canva_summary',
    category: 'feature',
    name: '1-Pager Zusammenfassung',
    description: 'Kompakte Übersicht · Kernaussagen · Ergebnisse · Offene Punkte',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    canvaDesignType: 'doc',
    icon: 'file-text',
    rolle: 'ein präziser Redakteur der komplexe Gesprächsinhalte auf das Wesentliche verdichtet. Du erstellst kompakte Zusammenfassungen die alles Wichtige enthalten aber nichts Überflüssiges',
    tonalitaet: 'sachlich, knapp, strukturiert. Keine Einleitungen. Direkt mit dem Inhalt beginnen',
    grenzen: 'nur Informationen aus dem Gespräch verwenden. Maximal 5 Folien für den 1-Pager',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle einen kompakten 1-Pager mit den wichtigsten Inhalten dieses Gesprächs.

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Titel",
  "subtitle": "Datum / Kontext",
  "slides": [
    {
      "heading": "Überschrift",
      "bullets": ["Kernpunkt 1", "Kernpunkt 2"],
      "note": ""
    }
  ]
}`
  },
  {
    id: 'builtin_canva_action',
    category: 'feature',
    name: 'Aktionsplan',
    description: 'Nächste Schritte · Verantwortlichkeiten · Deadlines · Offene Fragen',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    canvaDesignType: 'report',
    icon: 'check-square',
    rolle: 'ein strukturierter Projektmanager der aus Gesprächen klare Aktionspläne ableitet. Du erkennst wer was bis wann erledigen muss und welche Fragen noch offen sind',
    tonalitaet: 'direkt, handlungsorientiert, klar zugeordnet. Jeder Punkt hat einen Verantwortlichen wo erkennbar',
    grenzen: 'nur Aufgaben und Schritte aufführen die wirklich im Gespräch besprochen wurden. Keine Aufgaben erfinden',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle einen Aktionsplan aus diesem Gespräch.

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Aktionsplan",
  "subtitle": "Erstellt aus Sitzung vom {{date}}",
  "slides": [
    {
      "heading": "Nächste Schritte",
      "bullets": ["Person: Aufgabe (Deadline)", "Person: Aufgabe"],
      "note": ""
    },
    {
      "heading": "Offene Fragen",
      "bullets": ["Frage 1", "Frage 2"],
      "note": ""
    }
  ]
}`
  },
  {
    id: 'builtin_canva_flyer',
    category: 'feature',
    name: 'Flyer',
    description: 'Kernbotschaft · Highlights · Call to Action · Kompakt & visuell',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    icon: 'file',
    canvaDesignType: 'flyer',
    rolle: 'ein erfahrener Grafik-Texter der komplexe Inhalte auf das Wesentliche für einen Flyer verdichtet. Du weißt: ein Flyer hat eine starke Überschrift, 3–5 Kernpunkte und einen klaren Call to Action',
    tonalitaet: 'knapp, überzeugend, werbewirksam. Kurze Sätze. Starke Verben. Jedes Wort zählt',
    grenzen: 'maximal 5 Bullet Points, maximal 1 Call-to-Action. Nur Inhalte aus dem Gespräch',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle einen Flyer-Inhalt aus diesem Gespräch.

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Starke Überschrift (max. 6 Wörter)",
  "subtitle": "Kurzer Untertitel",
  "slides": [
    {
      "heading": "Warum das wichtig ist",
      "bullets": ["Kernpunkt 1", "Kernpunkt 2", "Kernpunkt 3"],
      "note": "Call to Action: ..."
    }
  ]
}`
  },
  {
    id: 'builtin_canva_poster',
    category: 'feature',
    name: 'Poster',
    description: 'Visuelles Statement · Hauptaussage · Kernpunkte auf einen Blick',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    icon: 'image',
    canvaDesignType: 'poster',
    rolle: 'ein Poster-Designer der eine starke zentrale Botschaft aus einem Gespräch destilliert. Poster kommunizieren eine einzige Kernaussage sehr klar',
    tonalitaet: 'stark, direkt, einprägsam. Hauptaussage in maximal 8 Wörtern',
    grenzen: 'eine Hauptaussage, maximal 4 Unterpunkte. Keine langen Erklärungen',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle Poster-Inhalt aus diesem Gespräch.

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Hauptaussage (max. 8 Wörter)",
  "subtitle": "Ergänzender Satz",
  "slides": [
    {
      "heading": "Kernpunkte",
      "bullets": ["Punkt 1", "Punkt 2", "Punkt 3"],
      "note": ""
    }
  ]
}`
  },
  {
    id: 'builtin_canva_social',
    category: 'feature',
    name: 'Social Media Post',
    description: 'Instagram · TikTok · LinkedIn · Kernbotschaft für Social Media',
    usedIn: 'Sitzungsdetail → Präsentation erstellen',
    icon: 'share-2',
    canvaDesignType: 'instagram_post',
    rolle: 'ein Social Media Experte der Gesprächsinhalte in ansprechende Posts verwandelt. Du kennst die Regeln: Hook in der ersten Zeile, klare Botschaft, starker Abschluss',
    tonalitaet: 'authentisch, direkt, gesprächig. Keine Unternehmenssprache. So wie man wirklich spricht',
    grenzen: 'maximal 5 Bullet Points, eine klare Kernaussage pro Post. Kein Fachjargon',
    kontext: `ANALYSEERGEBNISSE:
{{analyseContext}}

TRANSKRIPT-AUSZUG:
{{transcript}}

Erstelle Social Media Post-Inhalt aus diesem Gespräch.

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Hook-Zeile (packt sofort)",
  "subtitle": "Plattform-Vorschlag: Instagram / LinkedIn / TikTok",
  "slides": [
    {
      "heading": "Kernbotschaft",
      "bullets": ["Punkt 1", "Punkt 2", "Punkt 3"],
      "note": "Caption-Vorschlag: ..."
    }
  ]
}`
  },
  {
    id: 'builtin_search',
    category: 'feature',
    name: 'Semantische Suche',
    description: 'Suche über alle Aufnahmen · Claude versteht den Kontext',
    usedIn: 'Suche → Claude-Suche',
    icon: 'search',
    prompt: `Du bist ein Assistent der in persönlichen Gesprächs-Aufzeichnungen sucht.
Der Nutzer stellt eine Frage oder sucht nach etwas Bestimmtem.

ALLE AUFNAHMEN ({{sessionCount}} Stück):
{{digest}}

SUCHANFRAGE: {{query}}

Antworte auf Deutsch. Nenne konkret welche Aufnahmen relevant sind (Nummer und Name).
Fasse kurz zusammen was in den relevanten Aufnahmen dazu steht.
Falls nichts passt, sage das direkt.`
  },
  // ── Projekt-Prompts ────────────────────────────────
  {
    id: 'builtin_project_analysis',
    category: 'feature',
    name: 'Projekt-Analyse',
    description: 'Übergreifende Analyse aller Sitzungen eines Projekts',
    usedIn: 'Projekt-Dashboard → Analyse',
    icon: 'layers',
    prompt: `Du bist ein erfahrener Strategie- und Kommunikationsanalyst.
Du erhältst die Analyse-Zusammenfassungen aller Sitzungen eines Projekts – nicht die Rohtexte.

PROJEKT: {{projektName}}
ZIEL: {{projektZiel}}
ANZAHL SITZUNGEN: {{sitzungsAnzahl}}

SITZUNGS-ANALYSEN:
{{sitzungsAnalysen}}

Erstelle eine übergreifende Projekt-Analyse auf Deutsch. Antworte NUR mit einem JSON-Objekt:
{
  "gesamtbild": "2-3 Sätze: Was ist der Kernkonflik oder der rote Faden des Projekts?",
  "fortschritt": ["Was wurde erreicht oder geklärt?"],
  "offenePunkte": ["Was ist noch ungeklärt oder blockiert?"],
  "muster": ["Wiederkehrende Themen, Dynamiken oder Verhaltensweisen"],
  "empfehlungen": ["Konkrete nächste Schritte oder strategische Hinweise"]
}`
  },
  {
    id: 'builtin_project_status',
    category: 'feature',
    name: 'Projekt-Status',
    description: 'Kurze Statusübersicht: Was läuft, was stockt, was fehlt',
    usedIn: 'Projekt-Dashboard → Status',
    icon: 'activity',
    prompt: `Du bist ein präziser Projektassistent.
Gib einen knappen Projektstatus auf Basis der Sitzungs-Analysen.

PROJEKT: {{projektName}}
ZIEL: {{projektZiel}}

SITZUNGS-ANALYSEN (neueste zuerst):
{{sitzungsAnalysen}}

Antworte NUR mit einem JSON-Objekt:
{
  "status": "on-track" | "at-risk" | "blocked",
  "zusammenfassung": "1 Satz: Aktueller Stand in einfachen Worten",
  "letzteAktivitaet": "Was war das letzte konkrete Ergebnis oder Ereignis?",
  "naechsterSchritt": "Was ist der dringlichste nächste Schritt?",
  "risiken": ["Mögliche Probleme oder Verzögerungen – nur wenn relevant"]
}`
  }
];

function getEditablePrompts() {
  try { return JSON.parse(localStorage.getItem(EDITABLE_PROMPTS_KEY) || '{}'); } catch { return {}; }
}

function getEditablePromptText(id) {
  const saved = getEditablePrompts();
  if (saved[id]) return saved[id];
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (!def) return null;
  // Wenn strukturierte Felder vorhanden → assemblePromptText nutzen
  if (def.rolle || def.tonalitaet || def.grenzen || def.kontext) {
    return assemblePromptText(def);
  }
  return def.prompt;
}

function isEditablePromptModified(id) {
  return !!getEditablePrompts()[id];
}

function saveEditablePromptText(id, text) {
  const saved = getEditablePrompts();
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (def && text.trim() === def.prompt.trim()) {
    delete saved[id];
  } else {
    saved[id] = text;
  }
  localStorage.setItem(EDITABLE_PROMPTS_KEY, JSON.stringify(saved));
}

function resetEditablePrompt(id) {
  const saved = getEditablePrompts();
  delete saved[id];
  localStorage.setItem(EDITABLE_PROMPTS_KEY, JSON.stringify(saved));
}

// ── System-Prompts (read-only) ────────────────────
const SYSTEM_PROMPTS = [
  {
    id: 'sys_private',
    name: 'Gesprächs-Analyse',
    description: 'Vereinbarungen · Wünsche · Offene Themen · Dynamik · Zwischen den Zeilen',
    usedIn: 'Sitzungsdetail → Analysen (Basis-Prompt)',
    icon: 'message-circle',
    prompt: `Analysiere das folgende Gesprächstranskript und antworte ausschließlich mit einem JSON-Objekt.

Felder:
- summary: Kurze Gesamtzusammenfassung (2-4 Sätze)
- dynamics: Beschreibung der Gesprächsdynamik (Ton, Machtverhältnis, Energie)
- zwischenzeilen: Was wurde nicht ausgesprochen, aber deutlich spürbar? (implizite Botschaften, Subtext)
- agreements: Array von Vereinbarungen/Beschlüssen (Strings)
- wishes: Array von Wünschen/Bedürfnissen (Objekte mit "person" und "wish")
- openTopics: Array offener/ungelöster Themen (Strings)
- keyThoughts: Array von Kerngedanken/wichtigen Aussagen (Strings)
- nextSteps: Array konkreter nächster Schritte (Strings)

Antworte NUR mit dem JSON, kein Text davor oder danach.

Transkript:
{{transkript}}`
  },
  {
    id: 'sys_work',
    name: 'Arbeits-Analyse',
    description: 'Aufgaben · Entscheidungen · Offene Fragen · Risiken · Zusammenfassung',
    usedIn: 'Sitzungsdetail → Analysen (Basis-Prompt)',
    icon: 'briefcase',
    prompt: `Analysiere das folgende Arbeitsgespräch-Transkript und antworte ausschließlich mit einem JSON-Objekt.

Felder:
- summary: Kurze Zusammenfassung des Gesprächs (2-4 Sätze)
- tasks: Array von Aufgaben (Objekte mit "text", "assignee", "priority" [hoch/mittel/niedrig], "due")
- decisions: Array von Entscheidungen (Strings)
- openQuestions: Array offener Fragen/ungeklärter Punkte (Strings)
- risks: Array von Risiken oder Problemen (Strings)

Antworte NUR mit dem JSON, kein Text davor oder danach.

Transkript:
{{transkript}}`
  }
];

// ── View Toggle ──────────────────────────────────
function togglePromptsView() {
  const el = document.getElementById('promptsView');
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('headerPromptsBtn', false);
    setView(currentView === 'prompts' ? 'grid' : currentView);
  } else {
    _showOverlay('promptsView', 'headerPromptsBtn', renderPromptsView);
  }
}

// ── Filter-Funktionen ────────────────────────────
function filterPromptsView() {
  const searchEl = document.getElementById('promptSearchInput');
  if (searchEl) _promptSearch = searchEl.value.toLowerCase();
  _renderPromptsResults();
}

function setPromptTypeFilter(val) {
  _promptTypeFilter = val;
  _renderPromptsResults();
}

function setPromptTagFilter(tag) {
  _promptTagFilter = (_promptTagFilter === tag) ? '' : tag;
  _renderPromptsResults();
}

function _getAllPromptTags() {
  const tags = new Set();
  getCustomPrompts().forEach(p => (p.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

// ── Haupt-Render-Funktion (Toolbar nur einmal erstellen) ──
function renderPromptsView() {
  const el = document.getElementById('promptsView');
  if (!el) return;

  // Toolbar nur beim ersten Aufruf erstellen – verhindert Fokus-Verlust beim Tippen
  if (!el.querySelector('#promptsToolbar')) {
    el.innerHTML = `
    <div style="max-width:960px; margin:0 auto; padding:8px 0 48px">
      <div id="promptsToolbar" style="display:flex; align-items:center; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
        <div class="search-box" style="flex:1; min-width:180px;">
          ${icon('search',14,'color:var(--muted);flex-shrink:0')}
          <input type="text" id="promptSearchInput" placeholder="Prompts durchsuchen…"
            oninput="filterPromptsView()"
            style="background:none; border:none; outline:none; color:var(--text); font-size:0.88rem; width:100%;" />
        </div>
        <select id="promptTypeSelect" onchange="setPromptTypeFilter(this.value)"
          style="padding:7px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); color:var(--text); font-size:0.83rem; cursor:pointer; outline:none;">
          <option value="all">Alle Typen</option>
          <option value="system">System</option>
          <option value="standard">Standard</option>
          <option value="feature">Feature</option>
          <option value="custom">Eigene</option>
        </select>
        <button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;flex-shrink:0">
          ${icon('plus',14)} Neuer Prompt
        </button>
        <button class="btn btn-ghost" onclick="exportPrompts()" style="gap:6px;flex-shrink:0" title="Alle eigenen Prompts exportieren">
          ${icon('download',14)} Export
        </button>
        <label class="btn btn-ghost" style="gap:6px;flex-shrink:0;cursor:pointer" title="Prompts importieren">
          ${icon('upload',14)} Import
          <input type="file" accept=".json" onchange="importPrompts(event)" style="display:none" />
        </label>
      </div>
      <div id="promptsResults"></div>
    </div>`;
    if (window.lucide) lucide.createIcons({ nodes: [el] });
  }

  _renderPromptsResults();
}

// ── Nur Ergebnisse neu rendern (Toolbar bleibt stabil) ──
function _renderPromptsResults() {
  const container = document.getElementById('promptsResults');
  if (!container) return;

  const typeFilter = _promptTypeFilter;
  const q          = _promptSearch;
  const tagF       = _promptTagFilter;

  const matchesSearch = (texts) => !q || texts.some(t => (t||'').toLowerCase().includes(q));

  // System-Prompts filtern
  const systemVisible = typeFilter === 'all' || typeFilter === 'system';
  const filteredSystem = systemVisible
    ? SYSTEM_PROMPTS.filter(p => matchesSearch([p.name, p.description, p.prompt]))
    : [];

  // Standard-Prompts filtern
  const standardVisible = typeFilter === 'all' || typeFilter === 'standard';
  const filteredStandard = standardVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => p.category === 'standard')
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];

  // Feature-Prompts filtern
  const featureVisible = typeFilter === 'all' || typeFilter === 'feature';
  const filteredFeature = featureVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => p.category === 'feature')
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];

  // Eigene Prompts filtern
  const customVisible = typeFilter === 'all' || typeFilter === 'custom';
  let filteredCustom = customVisible ? getCustomPrompts() : [];
  if (q) filteredCustom = filteredCustom.filter(p =>
    matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])])
  );
  if (tagF) filteredCustom = filteredCustom.filter(p => (p.tags||[]).includes(tagF));

  const allTags    = _getAllPromptTags();
  const hasResults = filteredSystem.length || filteredStandard.length || filteredFeature.length || filteredCustom.length;

  const sectionHead = (label, extra = '') => `
    <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:12px; display:flex; align-items:center; gap:6px">
      ${label} ${extra}
    </div>`;

  const _usedInChip = (usedIn) => usedIn
    ? `<div style="margin-top:6px;display:flex;align-items:center;gap:4px">
        <span style="font-size:0.68rem;color:var(--muted);display:inline-flex;align-items:center;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:2px 8px;white-space:nowrap">
          ${icon('map-pin',10,'color:var(--accent);flex-shrink:0')} ${escHtml(usedIn)}
        </span>
      </div>` : '';

  const _cardSystem = (p) => `
    <div class="prompt-card">
      <div class="prompt-card-header">
        <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 18, 'color:var(--muted)')}</div>
        <div class="prompt-card-name" style="color:var(--text)">${escHtml(p.name)}</div>
        <div class="prompt-card-actions">
          <button class="btn btn-ghost" onclick="openSystemPromptView('${p.id}')" style="padding:4px 10px;font-size:0.76rem;gap:4px;white-space:nowrap">
            ${icon('eye',12)} Ansehen
          </button>
        </div>
      </div>
      ${p.description ? `<div class="prompt-card-desc" style="color:var(--muted)">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip(p.usedIn)}
      <div class="prompt-card-preview">${escHtml(p.prompt.slice(0, 120))}…</div>
    </div>`;

  const _cardEditable = (p) => {
    const modified    = isEditablePromptModified(p.id);
    const currentText = getEditablePromptText(p.id) || '';
    return `
    <div class="prompt-card">
      <div class="prompt-card-header">
        <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 18, 'color:var(--accent)')}</div>
        <div class="prompt-card-name">
          ${escHtml(p.name)}
          ${modified ? `<span style="font-size:0.62rem;background:rgba(108,99,255,0.15);color:var(--accent);padding:1px 5px;border-radius:8px;font-weight:600;margin-left:4px">angepasst</span>` : ''}
        </div>
        <div class="prompt-card-actions">
          <button class="btn btn-ghost" onclick="openEditablePromptEditor('${p.id}')" style="padding:4px 10px;font-size:0.76rem;gap:4px;white-space:nowrap">
            ${icon('edit-2',12)} Bearbeiten
          </button>
          ${modified ? `<button class="btn" onclick="resetEditablePromptAndRefresh('${p.id}')" style="padding:4px 10px;font-size:0.76rem;gap:4px;white-space:nowrap;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--red)">
            ${icon('refresh-cw',12)} Reset
          </button>` : ''}
        </div>
      </div>
      ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip(p.usedIn)}
      <div class="prompt-card-preview">${escHtml(currentText.slice(0, 120))}${currentText.length > 120 ? '…' : ''}</div>
    </div>`;
  };

  const _cardCustom = (p) => {
    const preview = assemblePromptText(p);
    const tags    = p.tags || [];
    return `
    <div class="prompt-card">
      <div class="prompt-card-header">
        <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 18, 'color:var(--accent)')}</div>
        <div class="prompt-card-name">${escHtml(p.name)}</div>
        <div class="prompt-card-actions">
          <button class="btn btn-ghost" onclick="openPromptEditorModal('${p.id}')" style="padding:4px 10px;font-size:0.76rem;gap:4px;white-space:nowrap">
            ${icon('edit-2',12)} Bearbeiten
          </button>
          <button class="btn" onclick="deletePromptById('${p.id}')" style="padding:4px 10px;font-size:0.76rem;gap:4px;white-space:nowrap;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--red)">
            ${icon('trash-2',12)} Löschen
          </button>
        </div>
      </div>
      ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip('Sitzungsdetail → Analysen → Eigene Prompts')}
      ${tags.length ? `<div class="prompt-card-tags">${tags.map(t=>`<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="prompt-card-preview">${escHtml(preview.slice(0, 120))}${preview.length > 120 ? '…' : ''}</div>
    </div>`;
  };

  let html = '';

  // Tag-Filter-Chips (nur für eigene Prompts)
  if (allTags.length && (typeFilter === 'all' || typeFilter === 'custom')) {
    html += `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:18px;">
      ${allTags.map(t => `
        <button onclick="setPromptTagFilter('${escHtml(t)}')"
          style="padding:3px 10px; font-size:0.75rem; border-radius:12px;
          border:1px solid ${tagF===t ? 'var(--accent)' : 'var(--border)'};
          background:${tagF===t ? 'var(--accent)' : 'var(--surface2)'};
          color:${tagF===t ? '#fff' : 'var(--text)'}; cursor:pointer; font-weight:${tagF===t ? '700' : '400'}">
          ${escHtml(t)}
        </button>`).join('')}
    </div>`;
  }

  if (!hasResults) {
    html += `<div style="text-align:center; padding:48px 24px; color:var(--muted); border:1px dashed var(--border); border-radius:14px">
      <div style="margin-bottom:10px; opacity:0.3">${icon('search',28)}</div>
      <div style="font-size:0.88rem; font-weight:500">Keine Prompts gefunden</div>
    </div>`;
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  if (filteredSystem.length) {
    html += `<div style="margin-bottom:24px">
      ${sectionHead('System-Prompts', icon('lock',11,'color:var(--muted);margin-left:2px'))}
      <div class="prompts-grid">${filteredSystem.map(_cardSystem).join('')}</div>
    </div>`;
  }

  if (filteredStandard.length) {
    html += `<div style="margin-bottom:24px">
      ${sectionHead('Standard-Analysen', `${icon('edit-2',11,'color:var(--muted);margin-left:2px')} <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— anpassbar</span>`)}
      <div class="prompts-grid">${filteredStandard.map(_cardEditable).join('')}</div>
    </div>`;
  }

  if (filteredFeature.length) {
    html += `<div style="margin-bottom:24px">
      ${sectionHead('Feature-Prompts', `${icon('zap',11,'color:var(--muted);margin-left:2px')} <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— anpassbar</span>`)}
      <div class="prompts-grid">${filteredFeature.map(_cardEditable).join('')}</div>
    </div>`;
  }

  // Eigene Prompts
  html += `<div>
    ${sectionHead('Eigene Prompts')}
    ${filteredCustom.length === 0 ? `
      <div style="text-align:center; padding:40px 24px; color:var(--muted); border:1px dashed var(--border); border-radius:14px">
        <div style="margin-bottom:10px; opacity:0.3">${icon('sparkles',28)}</div>
        <div style="font-size:0.88rem; margin-bottom:6px; font-weight:500">${q || tagF ? 'Keine Treffer' : 'Noch keine eigenen Prompts'}</div>
        ${!q && !tagF ? `<button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;margin-top:8px">${icon('plus',14)} Ersten Prompt erstellen</button>` : ''}
      </div>
    ` : `<div class="prompts-grid">${filteredCustom.map(_cardCustom).join('')}</div>`}
  </div>`;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

// ── Prompt-Editor Modal ──────────────────────────
function openSystemPromptView(id) {
  const p = SYSTEM_PROMPTS.find(sp => sp.id === id);
  if (!p) return;
  document.getElementById('promptEditorTitle').textContent = p.name + ' (System)';
  document.getElementById('promptEditorId').value   = '';
  document.getElementById('promptEditorName').value = p.name;
  document.getElementById('promptEditorDesc').value = p.description;
  document.getElementById('promptEditorIcon').value = p.icon;
  document.getElementById('promptEditorText').value = p.prompt;
  document.getElementById('promptEditorError').style.display = 'none';
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorText'].forEach(fid => {
    const el2 = document.getElementById(fid);
    if (el2) { el2.readOnly = true; el2.style.opacity = '0.6'; }
  });
  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) saveBtn.style.display = 'none';
  const modal = document.getElementById('promptEditorModal');
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function openPromptEditorModal(id) {
  const prompts  = getCustomPrompts();
  const existing = id ? prompts.find(p => p.id === id) : null;

  document.getElementById('promptEditorTitle').textContent = existing ? 'Prompt bearbeiten' : 'Neuer Prompt';
  document.getElementById('promptEditorId').value          = existing?.id          || '';
  document.getElementById('promptEditorName').value        = existing?.name        || '';
  document.getElementById('promptEditorDesc').value        = existing?.description || '';
  document.getElementById('promptEditorIcon').value        = existing?.icon        || 'sparkles';
  document.getElementById('promptEditorRolle').value       = existing?.rolle       || '';
  document.getElementById('promptEditorTonalitaet').value  = existing?.tonalitaet  || '';
  document.getElementById('promptEditorGrenzen').value     = existing?.grenzen     || '';
  document.getElementById('promptEditorText').value        = existing?.kontext || existing?.prompt || '';
  document.getElementById('promptEditorTags').value        = (existing?.tags || []).join(', ');
  document.getElementById('promptEditorError').style.display = 'none';

  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorRolle',
   'promptEditorTonalitaet','promptEditorGrenzen','promptEditorText','promptEditorTags'].forEach(fid => {
    const el2 = document.getElementById(fid);
    if (el2) { el2.readOnly = false; el2.style.opacity = ''; }
  });
  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) { saveBtn.style.display = ''; saveBtn.onclick = savePromptFromEditor; }
  const resetBtn = document.getElementById('promptEditorResetBtn');
  if (resetBtn) resetBtn.style.display = 'none';

  const modal = document.getElementById('promptEditorModal');
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function closePromptEditorModal() {
  document.getElementById('promptEditorModal').style.display = 'none';
}

function savePromptFromEditor() {
  const id         = document.getElementById('promptEditorId').value;
  const name       = document.getElementById('promptEditorName').value.trim();
  const desc       = document.getElementById('promptEditorDesc').value.trim();
  const iconName   = document.getElementById('promptEditorIcon').value.trim() || 'sparkles';
  const rolle      = document.getElementById('promptEditorRolle').value.trim();
  const tonalitaet = document.getElementById('promptEditorTonalitaet').value.trim();
  const grenzen    = document.getElementById('promptEditorGrenzen').value.trim();
  const kontext    = document.getElementById('promptEditorText').value.trim();
  const tagsRaw    = document.getElementById('promptEditorTags').value.trim();
  const tags       = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const errEl      = document.getElementById('promptEditorError');

  if (!name)    { errEl.textContent = 'Bitte einen Namen eingeben.';   errEl.style.display = 'block'; return; }
  if (!kontext) { errEl.textContent = 'Bitte einen Kontext eingeben.'; errEl.style.display = 'block'; return; }

  const obj = { name, description: desc, icon: iconName, rolle, tonalitaet, grenzen, kontext, tags };
  const prompts = getCustomPrompts();
  if (id) {
    const idx = prompts.findIndex(p => p.id === id);
    if (idx >= 0) prompts[idx] = { ...prompts[idx], ...obj };
  } else {
    prompts.push({ id: genPromptId(), ...obj });
  }
  saveCustomPrompts(prompts);
  closePromptEditorModal();
  _renderPromptsResults();
  showToast(id ? 'Prompt aktualisiert' : 'Prompt gespeichert', 'ok');
}

function deletePromptById(id) {
  saveCustomPrompts(getCustomPrompts().filter(p => p.id !== id));
  _renderPromptsResults();
  showToast('Prompt gelöscht', 'ok');
}

// ── Custom Prompt ausführen ──────────────────────
async function runCustomPrompt(session, promptObj, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || ownerName || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';

  let promptText = assemblePromptText(promptObj)
    .replace(/\{\{transkript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{transcript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{sprecher_a\}\}/gi,  speakerA)
    .replace(/\{\{sprecher_b\}\}/gi,  speakerB)
    .replace(/\{\{speakerA\}\}/gi,    speakerA)
    .replace(/\{\{speakerB\}\}/gi,    speakerB);

  if (!/\{\{transkript\}\}|\{\{transcript\}\}/i.test(promptObj.prompt || promptObj.kontext || '')) {
    promptText += `\n\nTranskript:\n${trimTranscript(transcript, 300000)}`;
  }

  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(promptText, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const result = deanonymizeText(text, reverse);

  if (!session.customResults) session.customResults = {};
  session.customResults[promptObj.id] = {
    text:       result,
    promptName: promptObj.name,
    icon:       promptObj.icon || 'sparkles',
    createdAt:  new Date().toISOString()
  };
}

// ── Editable-Prompt Editor öffnen ───────────────
function openEditablePromptEditor(id) {
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (!def) return;
  const currentText = getEditablePromptText(id) || def.prompt;

  document.getElementById('promptEditorTitle').textContent = def.name + ' bearbeiten';
  document.getElementById('promptEditorId').value   = id;
  document.getElementById('promptEditorName').value = def.name;
  document.getElementById('promptEditorDesc').value = def.description;
  document.getElementById('promptEditorIcon').value = def.icon;
  document.getElementById('promptEditorText').value = currentText;
  document.getElementById('promptEditorError').style.display = 'none';

  ['promptEditorName','promptEditorDesc','promptEditorIcon'].forEach(fid => {
    const el2 = document.getElementById(fid);
    el2.readOnly = true; el2.style.opacity = '0.5';
  });
  document.getElementById('promptEditorText').readOnly = false;
  document.getElementById('promptEditorText').style.opacity = '';

  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) { saveBtn.style.display = ''; saveBtn.onclick = () => saveEditablePromptFromEditor(id); }

  const resetBtn = document.getElementById('promptEditorResetBtn');
  if (resetBtn) {
    resetBtn.style.display = isEditablePromptModified(id) ? '' : 'none';
    resetBtn.onclick = () => {
      resetEditablePrompt(id);
      document.getElementById('promptEditorText').value = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id).prompt;
      resetBtn.style.display = 'none';
      showToast('Prompt zurückgesetzt', 'ok');
    };
  }

  const modal = document.getElementById('promptEditorModal');
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function saveEditablePromptFromEditor(id) {
  const text  = document.getElementById('promptEditorText').value.trim();
  const errEl = document.getElementById('promptEditorError');
  if (!text) { errEl.textContent = 'Bitte einen Prompt-Text eingeben.'; errEl.style.display = 'block'; return; }
  saveEditablePromptText(id, text);
  closePromptEditorModal();
  _renderPromptsResults();
  showToast('Prompt gespeichert', 'ok');
}

function resetEditablePromptAndRefresh(id) {
  resetEditablePrompt(id);
  _renderPromptsResults();
  showToast('Prompt zurückgesetzt', 'ok');
}

// ── Checkboxen im Analyse-Modal befüllen ─────────
function renderCustomPromptCheckboxes() {
  const container = document.getElementById('customPromptChecks');
  if (!container) return;
  const prompts = getCustomPrompts();
  if (!prompts.length) { container.innerHTML = ''; container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML = `
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px">Eigene Prompts</div>
      ${prompts.map(p => `
        <label class="analyse-check-row" style="margin-bottom:8px">
          <input type="checkbox" id="chkCustom_${p.id}" />
          <span style="display:inline-flex;align-items:center">${icon(p.icon || 'sparkles', 17, 'stroke:var(--muted);stroke-width:2;fill:none')}</span>
          <span>
            <div style="font-size:0.88rem; font-weight:600">${escHtml(p.name)}</div>
            ${p.description ? `<div style="font-size:0.75rem; color:var(--muted)">${escHtml(p.description)}</div>` : ''}
          </span>
        </label>
      `).join('')}
    </div>`;
  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

// ═══════════════════════════════════════════════════
// PROMPT EXPORT / IMPORT
// ═══════════════════════════════════════════════════

function exportPrompts() {
  const customPrompts   = getCustomPrompts();
  const editedDefaults  = getEditablePrompts(); // nur bearbeitete Werte

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: ownerName || 'Distill Voice',
    customPrompts,
    editedDefaults,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `distill-voice-prompts_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${customPrompts.length} Prompts exportiert`, 'success');
}

function importPrompts(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // Validierung
      if (!data.version || (!data.customPrompts && !data.editedDefaults)) {
        showToast('Ungültige Prompt-Datei.', 'error'); return;
      }

      let added = 0;

      // Custom Prompts importieren (keine Duplikate per Name)
      if (Array.isArray(data.customPrompts)) {
        const existing = getCustomPrompts();
        const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));
        const newPrompts = data.customPrompts.filter(p => !existingNames.has(p.name?.toLowerCase()));
        // Neue ID vergeben
        newPrompts.forEach(p => { p.id = genPromptId(); });
        saveCustomPrompts([...existing, ...newPrompts]);
        added += newPrompts.length;
      }

      // Bearbeitete Standard-Prompts zusammenführen
      if (data.editedDefaults && typeof data.editedDefaults === 'object') {
        const current = getEditablePrompts();
        const merged  = { ...data.editedDefaults, ...current }; // lokale Änderungen haben Vorrang
        localStorage.setItem(EDITABLE_PROMPTS_KEY, JSON.stringify(merged));
      }

      showToast(`${added} neue Prompt(s) importiert`, 'success');
      renderPromptsView();
    } catch {
      showToast('Datei konnte nicht gelesen werden.', 'error');
    }
  };
  reader.readAsText(file);
  // Input zurücksetzen damit dieselbe Datei nochmal importiert werden kann
  event.target.value = '';
}

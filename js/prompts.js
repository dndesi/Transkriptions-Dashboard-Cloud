// ═══════════════════════════════════════════════════
// PROMPTS.JS – Prompt-Bibliothek v4.14
// Eigene Analyse-Prompts erstellen, verwalten, ausführen
// Bearbeitbare Standard- und Feature-Prompts
// ═══════════════════════════════════════════════════

const PROMPTS_KEY = 'customPrompts';           // Legacy-Schlüssel (bleibt für Migration)
const USER_PROMPTS_KEY = 'userPrompts';          // v5.22: Unified Storage

// ── Unified Storage: getUserPrompts / saveUserPrompts ─────────────────────────
// Einheitliche Datenhaltung: { custom: [...], editableOverrides: {...} }
function getUserPrompts() {
  try {
    const raw = localStorage.getItem(USER_PROMPTS_KEY);
    if (!raw) return { custom: [], editableOverrides: {} };
    const parsed = JSON.parse(raw);
    return {
      custom:           Array.isArray(parsed.custom) ? parsed.custom : [],
      editableOverrides: (parsed.editableOverrides && typeof parsed.editableOverrides === 'object') ? parsed.editableOverrides : {}
    };
  } catch { return { custom: [], editableOverrides: {} }; }
}

function saveUserPrompts(obj) {
  localStorage.setItem(USER_PROMPTS_KEY, JSON.stringify(obj));
  if (typeof queueSettingsSave === 'function') queueSettingsSave();
}

// ── Einmalige Migration von alten Schlüsseln (v5.22) ─────────────────────────
// Läuft beim ersten Seitenaufruf nach Update. Alte Keys bleiben als Backup erhalten.
function migrateToUserPrompts() {
  if (localStorage.getItem(USER_PROMPTS_KEY)) return; // bereits migriert
  const custom = (() => { try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); } catch { return []; } })();
  const editableOverrides = (() => { try { return JSON.parse(localStorage.getItem('editablePrompts') || '{}'); } catch { return {}; } })();
  localStorage.setItem(USER_PROMPTS_KEY, JSON.stringify({ custom, editableOverrides }));
  console.log('[prompts] Migration zu userPrompts ✓ – Custom:', custom.length, '| EditableOverrides:', Object.keys(editableOverrides).length);
}

// ── Backwards-Compatible Aliases ──────────────────────────────────────────────
function getCustomPrompts() {
  return getUserPrompts().custom;
}

function saveCustomPrompts(arr) {
  const up = getUserPrompts();
  up.custom = arr;
  saveUserPrompts(up);
}

function genPromptId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── Aus den 4 Teilen einen vollständigen Prompt zusammenbauen ──
function assemblePromptText(promptObj) {
  const parts = [];
  // v5.27: Strip "Du bist" Prefix (falls KI es trotzdem schreibt) + trailing periods
  if (promptObj.rolle?.trim()) {
    const rolle = promptObj.rolle.trim().replace(/^Du bist\s+/i, '').replace(/\.+$/, '');
    parts.push(`Du bist ${rolle}.`);
  }
  if (promptObj.tonalitaet?.trim()) {
    parts.push(`Tonalität: ${promptObj.tonalitaet.trim().replace(/\.+$/, '')}.`);
  }
  if (promptObj.grenzen?.trim()) {
    parts.push(`Was du NICHT tun sollst: ${promptObj.grenzen.trim().replace(/\.+$/, '')}.`);
  }
  const kontext = (promptObj.kontext || promptObj.prompt || '').trim();
  if (kontext) parts.push(kontext);
  return parts.join('\n\n');
}

// ── Such- und Filter-State für Prompt-Bibliothek ──────
let _promptSearch      = '';
let _activeTagFilters  = []; // v5.19: Multi-Tag-Filter (Array)
let _promptTypeFilter  = 'all'; // 'all' | 'system' | 'standard' | 'design' | 'custom'

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
  },

  // ── Foto-Analyse-Prompts (v5.58) ──────────────────
  // category:'foto' → nur im Fotos-Tab sichtbar, nicht bei Textanalysen
  {
    id: 'builtin_foto_whiteboard',
    category: 'foto',
    name: 'Whiteboard-Inhalt extrahieren',
    description: 'Alle sichtbaren Texte, Diagramme und Strukturen eines Whiteboards erfassen',
    usedIn: 'Sitzungsdetail → Fotos → Prompt-Auswahl',
    icon: 'layout-dashboard',
    prompt: `Analysiere dieses Foto eines Whiteboards oder einer Tafel aus einem Meeting.
Extrahiere ALLE sichtbaren Inhalte: Text, Zahlen, Diagramme, Pfeile, Strukturen.
Formatiere die Ergebnisse übersichtlich mit Markdown-Überschriften und Listen.
Wenn ein Transkript verfügbar ist, verknüpfe die Whiteboard-Inhalte mit den besprochenen Themen.`
  },
  {
    id: 'builtin_foto_sketch',
    category: 'foto',
    name: 'Skizze / Diagramm beschreiben',
    description: 'Handgezeichnete Diagramme und Skizzen strukturiert beschreiben',
    usedIn: 'Sitzungsdetail → Fotos → Prompt-Auswahl',
    icon: 'pen-tool',
    prompt: `Beschreibe diese Skizze oder dieses handgezeichnete Diagramm detailliert.
Was wird dargestellt? Welche Elemente, Verbindungen, Pfeile und Strukturen sind erkennbar?
Benenne alle beschrifteten Bereiche und erkläre ihre Beziehung zueinander.
Wenn ein Transkript verfügbar ist, erkläre den Zusammenhang zum Gespräch.`
  },
  {
    id: 'builtin_foto_handwriting',
    category: 'foto',
    name: 'Handschrift lesen & transkribieren',
    description: 'Handgeschriebene Notizen oder Texte abtippen und strukturieren',
    usedIn: 'Sitzungsdetail → Fotos → Prompt-Auswahl',
    icon: 'file-text',
    prompt: `Lese und transkribiere alle handgeschriebenen Texte in diesem Foto so genau wie möglich.
Markiere unleserliche Stellen mit [?].
Strukturiere den Text so, wie er im Original angeordnet ist (Aufzählungen, Unterpunkte, Abschnitte).
Wenn Abkürzungen erkennbar sind, löse sie wenn möglich auf.`
  },
  {
    id: 'builtin_foto_combined',
    category: 'foto',
    name: 'Foto + Transkript kombiniert analysieren',
    description: 'Foto und Gesprächsprotokoll zusammen auswerten und verknüpfen',
    usedIn: 'Sitzungsdetail → Fotos → Prompt-Auswahl',
    icon: 'layers',
    prompt: `Du erhältst ein oder mehrere Fotos aus einem Meeting sowie das zugehörige Gesprächstranskript.
Analysiere beides zusammen: Was zeigen die Fotos? Welche konkreten Bezüge gibt es zum Gespräch?
Welche Erkenntnisse ergeben sich aus der Kombination beider Quellen, die aus dem Transkript allein nicht erkennbar wären?
Fasse die wichtigsten Punkte kompakt zusammen und trenne klar, was aus dem Foto vs. dem Gespräch stammt.`
  },
  {
    id: 'builtin_foto_tasks',
    category: 'foto',
    name: 'Aufgaben aus Foto ableiten',
    description: 'To-Dos, Aktionspunkte und nächste Schritte aus Fotos extrahieren',
    usedIn: 'Sitzungsdetail → Fotos → Prompt-Auswahl',
    icon: 'check-square',
    prompt: `Analysiere dieses Foto und leite daraus konkrete Aufgaben und Handlungsschritte (To-Dos) ab.
Prüfe auch das Transkript auf ergänzende Aktionspunkte.
Formatiere die Aufgaben als Checkliste (- [ ] Aufgabe) mit:
- Kurzbeschreibung der Aufgabe
- Priorität wenn erkennbar (Hoch / Mittel / Niedrig)
- Verantwortliche Person wenn erkennbar
- Deadline wenn erkennbar`
  },

  // ── Rollen-Prompts (v5.71) – werden als System-Prompt im Folge-Gespräch gesendet ──
  {
    id: 'builtin_rolle_coach',
    category: 'rolle',
    name: 'Life Coach',
    description: 'Empathisch · Zielorientiert · Lösungsfokussiert',
    usedIn: 'Sitzungsdetail → Folge-Gespräch',
    icon: 'heart',
    prompt: `Du bist ein erfahrener Life Coach. Dein Stil ist empathisch, warm und lösungsorientiert. Du hilfst dabei, Erkenntnisse aus Gesprächen in konkrete nächste Schritte umzuwandeln, Hindernisse zu identifizieren und nachhaltige Veränderungen anzustoßen. Stelle gezielte Reflexionsfragen und formuliere konstruktives, mutmachendes Feedback. Antworte auf Deutsch.`
  },
  {
    id: 'builtin_rolle_manager',
    category: 'rolle',
    name: 'Erfahrene Führungskraft',
    description: 'Strategisch · Direkt · Ergebnisorientiert',
    usedIn: 'Sitzungsdetail → Folge-Gespräch',
    icon: 'briefcase',
    prompt: `Du bist eine erfahrene Führungskraft mit umfangreichem Erfahrungsschatz in Unternehmensführung und strategischer Planung. Dein Stil ist direkt, strukturiert und ergebnisorientiert. Du analysierst Situationen aus Managementperspektive, gibst klares Feedback zu Führungsentscheidungen und hilfst dabei, operative und strategische Herausforderungen konkret zu lösen. Antworte auf Deutsch.`
  },
  {
    id: 'builtin_rolle_sparring',
    category: 'rolle',
    name: 'Sparringspartner',
    description: 'Kritisch · Herausfordernd · Auf Augenhöhe',
    usedIn: 'Sitzungsdetail → Folge-Gespräch',
    icon: 'zap',
    prompt: `Du bist ein herausfordernder Sparringspartner auf Augenhöhe. Du hinterfragst Annahmen kritisch, spielst devil's advocate und stellst unbequeme Fragen, um Denkmuster aufzudecken. Dein Ziel ist es, durch konstruktive Konfrontation zu schärferen Erkenntnissen zu führen – nicht Bestätigung zu geben, sondern Denken anzuregen und blinde Flecken sichtbar zu machen. Antworte auf Deutsch.`
  },
  {
    id: 'builtin_rolle_psychologe',
    category: 'rolle',
    name: 'Psychologischer Berater',
    description: 'Einfühlsam · Reflektierend · Tiefenorientiert',
    usedIn: 'Sitzungsdetail → Folge-Gespräch',
    icon: 'user',
    prompt: `Du bist ein erfahrener psychologischer Berater. Dein Ansatz ist nicht-wertend, einfühlsam und auf Tiefenreflexion ausgerichtet. Du hilfst dabei, emotionale Muster, Denkschemata und innere Konflikte zu erkennen und zu verstehen. Du gibst keine direkten Ratschläge, sondern begleitest durch gezielte Fragen und Spiegelung zur Selbsterkenntnis. Keine klinischen Diagnosen. Antworte auf Deutsch.`
  },
  {
    id: 'builtin_rolle_moderator',
    category: 'rolle',
    name: 'Moderator',
    description: 'Neutral · Strukturierend · Zusammenfassend',
    usedIn: 'Sitzungsdetail → Folge-Gespräch',
    icon: 'git-branch',
    prompt: `Du bist ein erfahrener Moderator. Du bringst Struktur in komplexe Themen, fasst Aussagen präzise und neutral zusammen und hilfst dabei, den roten Faden zu behalten. Dein Stil ist sachlich und ausgewogen – du bewertest nicht, sondern strukturierst, klärt und machst nächste Schritte sichtbar. Antworte auf Deutsch.`
  }
];

function getEditablePrompts() {
  return getUserPrompts().editableOverrides;
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
  const up  = getUserPrompts();
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (def && text.trim() === def.prompt.trim()) {
    delete up.editableOverrides[id];
  } else {
    up.editableOverrides[id] = text;
  }
  saveUserPrompts(up); // inkl. Drive-Sync
}

function resetEditablePrompt(id) {
  const up = getUserPrompts();
  delete up.editableOverrides[id];
  saveUserPrompts(up); // inkl. Drive-Sync
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
    if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17
    _showOverlay('promptsView', 'headerPromptsBtn', renderPromptsView);
    // Prompts aus Drive aktualisieren (v5.0) – silent im Hintergrund
    if (typeof loadSettingsFromDrive === 'function') {
      loadSettingsFromDrive().catch(() => {});
    }
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
  const idx = _activeTagFilters.indexOf(tag);
  if (idx >= 0) {
    _activeTagFilters.splice(idx, 1);
  } else {
    _activeTagFilters.push(tag);
  }
  _renderPromptsResults();
}

function clearPromptTagFilters() {
  _activeTagFilters = [];
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
      <div style="display:flex; align-items:center; margin-bottom:16px">
        <h2 style="font-size:1.1rem; font-weight:700; display:flex; align-items:center; gap:7px">
          ${icon('sparkles',16)} Analyse-Prompts
          <button class="help-icon" data-help="Verwalte und erstelle eigene KI-Analyse-Vorlagen. Standard-Prompts (Zusammenfassung, Arbeit, Gesprächsanalyse…) sind immer verfügbar. Eigene Prompts können strukturierte Felder (Schema) haben – das Ergebnis erscheint dann formatiert im Analysen-Tab." onclick="showHelpTooltip(this)">?</button>
        </h2>
      </div>
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
          <option value="design">Design</option>
          <option value="foto">Foto-Analyse</option>
          <option value="rolle">Rollen</option>
          <option value="custom">Eigene</option>
        </select>
        <button class="btn btn-ghost" onclick="openPromptCategoryPickerModal('generator')" style="gap:6px;flex-shrink:0" title="Prompt per Wizard oder KI erstellen">
          ${icon('wand-2',14)} Generator
        </button>
        <button class="btn btn-primary" onclick="openPromptCategoryPickerModal('editor')" style="gap:6px;flex-shrink:0">
          ${icon('plus',14)} Neuer Prompt
        </button>
        <label class="btn btn-ghost" style="gap:6px;flex-shrink:0;cursor:pointer" title="Prompt importieren">
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

  const typeFilter  = _promptTypeFilter;
  const q           = _promptSearch;
  const activeTags  = _activeTagFilters; // Array (multi-select)
  // Wenn Tags aktiv → nur Eigene Prompts zeigen (Tags gelten nur für eigene)
  const tagFilterActive = activeTags.length > 0;

  const matchesSearch = (texts) => !q || texts.some(t => (t||'').toLowerCase().includes(q));

  // System-Prompts filtern (nicht wenn Tag-Filter aktiv)
  const systemVisible = !tagFilterActive && (typeFilter === 'all' || typeFilter === 'system');
  const filteredSystem = systemVisible
    ? SYSTEM_PROMPTS.filter(p => matchesSearch([p.name, p.description, p.prompt]))
    : [];

  // Standard-Prompts filtern: Standard-Analysen + Feature-Prompts (ohne Design, ohne Foto, ohne Rollen) (v5.24/v5.71)
  const standardVisible = !tagFilterActive && (typeFilter === 'all' || typeFilter === 'standard');
  const _hiddenStandardIds = getHiddenStandardPromptIds();
  const filteredStandard = standardVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => !p.canvaDesignType && p.category !== 'foto' && p.category !== 'rolle' && !_hiddenStandardIds.includes(p.id))
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];

  // Foto-Analyse-Prompts filtern (v5.58/v5.60) – nur bei Typ-Filter 'all' oder 'foto'
  const fotoVisible = !tagFilterActive && (typeFilter === 'all' || typeFilter === 'foto');
  const _hiddenFotoIds = getHiddenFotoPromptIds();
  const filteredFotoBuiltin = fotoVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => p.category === 'foto' && !_hiddenFotoIds.includes(p.id))
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];
  const filteredFotoCustom = fotoVisible
    ? getCustomPrompts().filter(p => p.category === 'foto')
        .filter(p => matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])]))
    : [];
  const filteredFoto = [...filteredFotoBuiltin, ...filteredFotoCustom];

  // Design-Prompts filtern: eingebaute (canvaDesignType) + eigene mit category:'design' (v5.24/v5.62/v5.65)
  const _hiddenDesignIds = getHiddenDesignPromptIds();
  const designVisible = !tagFilterActive && (typeFilter === 'all' || typeFilter === 'design');
  const filteredDesign = designVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => !!p.canvaDesignType && !_hiddenDesignIds.includes(p.id))
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];
  const filteredDesignCustom = designVisible
    ? getCustomPrompts().filter(p => p.category === 'design')
        .filter(p => matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])]))
    : [];
  // v5.67: Eigene Standard-Prompts (category === 'standard')
  const filteredStandardCustom = standardVisible
    ? getCustomPrompts().filter(p => p.category === 'standard')
        .filter(p => matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])]))
    : [];

  // v5.71: Rollen-Prompts filtern – built-in + eigene mit category === 'rolle'
  const rolleVisible = !tagFilterActive && (typeFilter === 'all' || typeFilter === 'rolle');
  const filteredRolleBuiltin = rolleVisible
    ? EDITABLE_PROMPT_DEFAULTS.filter(p => p.category === 'rolle')
        .filter(p => matchesSearch([p.name, p.description, getEditablePromptText(p.id)]))
    : [];
  const filteredRolleCustom = rolleVisible
    ? getCustomPrompts().filter(p => p.category === 'rolle')
        .filter(p => matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])]))
    : [];

  // Eigene Prompts filtern – Kategorie-spezifische Prompts ausblenden,
  // da sie bereits in ihren eigenen Sektionen erscheinen (v5.67: standard; v5.71: rolle ergänzt)
  const _CATEGORY_SECTIONS = new Set(['design', 'foto', 'standard', 'rolle']);
  const customVisible = typeFilter === 'all' || typeFilter === 'custom';
  let filteredCustom = customVisible ? getCustomPrompts().filter(p => !_CATEGORY_SECTIONS.has(p.category)) : [];
  if (q) filteredCustom = filteredCustom.filter(p =>
    matchesSearch([p.name, p.description, assemblePromptText(p), ...(p.tags||[])])
  );
  // Multi-Tag-Filter: alle aktiven Tags müssen vorhanden sein (AND-Verknüpfung)
  if (tagFilterActive) {
    filteredCustom = filteredCustom.filter(p =>
      activeTags.every(t => (p.tags||[]).includes(t))
    );
  }

  const allTags    = _getAllPromptTags();
  const hasResults = filteredSystem.length || filteredStandard.length || filteredStandardCustom.length || filteredDesign.length || filteredDesignCustom.length || filteredFoto.length || filteredRolleBuiltin.length || filteredRolleCustom.length || filteredCustom.length;

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
      </div>
      ${p.description ? `<div class="prompt-card-desc" style="color:var(--muted)">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip(p.usedIn)}
      <div class="prompt-card-preview">${escHtml(p.prompt.slice(0, 120))}…</div>
      <div class="prompt-card-actions">
        <button class="btn btn-ghost" onclick="openSystemPromptView('${p.id}')" style="padding:5px 7px" title="Ansehen">
          ${icon('eye',13)}
        </button>
      </div>
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
      </div>
      ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip(p.usedIn)}
      <div class="prompt-card-preview">${escHtml(currentText.slice(0, 120))}${currentText.length > 120 ? '…' : ''}</div>
      <div class="prompt-card-actions">
        <button class="btn btn-ghost" onclick="openEditablePromptEditor('${p.id}')" style="padding:5px 7px" title="Bearbeiten">
          ${icon('edit-2',13)}
        </button>
        <button class="btn btn-ghost" onclick="exportSingleEditablePrompt('${p.id}')" style="padding:5px 7px" title="Exportieren">
          ${icon('download',13)}
        </button>
        ${modified ? `<button class="btn btn-ghost" onclick="resetEditablePromptAndRefresh('${p.id}')" style="padding:5px 7px;color:var(--red)" title="Zurücksetzen">
          ${icon('refresh-cw',13)}
        </button>` : ''}
        <button class="btn btn-ghost" onclick="hideStandardBuiltinPrompt('${p.id}')" style="padding:5px 7px;color:var(--red)" title="Entfernen">
          ${icon('trash-2',13)}
        </button>
      </div>
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
      </div>
      ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
      ${_usedInChip('Sitzungsdetail → Analysen → Eigene Prompts')}
      ${tags.length ? `<div class="prompt-card-tags">${tags.map(t=>{const isAct=activeTags.includes(t);return`<span class="tag-chip" style="cursor:pointer;${isAct?'background:var(--accent);color:#fff;border-color:var(--accent)':''}" title="Nach '${escHtml(t)}' filtern" onclick="setPromptTagFilter('${escHtml(t)}')">${escHtml(t)}</span>`;}).join('')}</div>` : ''}
      <div class="prompt-card-preview">${escHtml(preview.slice(0, 120))}${preview.length > 120 ? '…' : ''}</div>
      <div class="prompt-card-actions">
        <button class="btn btn-ghost" onclick="openPromptEditorModal('${p.id}')" style="padding:5px 7px" title="Bearbeiten">
          ${icon('edit-2',13)}
        </button>
        <button class="btn btn-ghost" onclick="exportSinglePrompt('${p.id}')" style="padding:5px 7px" title="Exportieren">
          ${icon('download',13)}
        </button>
        <button class="btn btn-ghost" onclick="deletePromptById('${p.id}')" style="padding:5px 7px;color:var(--red)" title="Löschen">
          ${icon('trash-2',13)}
        </button>
      </div>
    </div>`;
  };

  let html = '';

  // Tag-Filter-Chips (nur für eigene Prompts)
  if (allTags.length && (typeFilter === 'all' || typeFilter === 'custom')) {
    html += `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:18px; align-items:center;">
      <span style="font-size:0.7rem; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-right:2px">Tags:</span>
      ${allTags.map(t => {
        const isActive = activeTags.includes(t);
        return `<button onclick="setPromptTagFilter('${escHtml(t)}')"
          style="padding:3px 10px; font-size:0.75rem; border-radius:12px;
          border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
          background:${isActive ? 'var(--accent)' : 'var(--surface2)'};
          color:${isActive ? '#fff' : 'var(--text)'}; cursor:pointer; font-weight:${isActive ? '700' : '400'}">
          ${escHtml(t)}
        </button>`;
      }).join('')}
      ${tagFilterActive ? `<button onclick="clearPromptTagFilters()"
        style="padding:3px 10px; font-size:0.72rem; border-radius:12px;
        border:1px solid var(--border); background:transparent;
        color:var(--muted); cursor:pointer; margin-left:4px">
        ✕ Alle
      </button>` : ''}
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

  if (filteredStandard.length || filteredStandardCustom.length) {
    html += `<div style="margin-bottom:24px">
      ${sectionHead('Standard-Prompts', `${icon('edit-2',11,'color:var(--muted);margin-left:2px')} <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— anpassbar</span>`)}
      ${filteredStandard.length ? `<div class="prompts-grid" style="margin-bottom:${filteredStandardCustom.length ? '16px' : '0'}">${filteredStandard.map(_cardEditable).join('')}</div>` : ''}
      ${filteredStandardCustom.length ? `<div class="prompts-grid">${filteredStandardCustom.map(_cardCustom).join('')}</div>` : ''}
    </div>`;
  }

  // v5.62/v5.65: Design-Prompts mit Löschen-Button + eigene Design-Prompts
  if (filteredDesign.length || filteredDesignCustom.length || designVisible) {
    const _cardDesign = (p) => {
      const modified    = isEditablePromptModified(p.id);
      const currentText = getEditablePromptText(p.id) || '';
      return '<div class="prompt-card">'
        + '<div class="prompt-card-header">'
        + '<div class="prompt-card-icon">' + icon(p.icon || 'layout', 18, 'color:var(--accent)') + '</div>'
        + '<div class="prompt-card-name">' + escHtml(p.name)
        + (modified ? ' <span style="font-size:0.62rem;background:rgba(108,99,255,0.15);color:var(--accent);padding:1px 5px;border-radius:8px;font-weight:600;margin-left:4px">angepasst</span>' : '')
        + '</div>'
        + '</div>'
        + (p.description ? '<div class="prompt-card-desc">' + escHtml(p.description) + '</div>' : '')
        + '<div class="prompt-card-preview">' + escHtml(currentText.slice(0, 120)) + (currentText.length > 120 ? '…' : '') + '</div>'
        + '<div class="prompt-card-actions">'
        + '<button class="btn btn-ghost" onclick="openEditablePromptEditor(\'' + p.id + '\')" style="padding:5px 7px" title="Bearbeiten">' + icon('edit-2',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="exportSingleEditablePrompt(\'' + p.id + '\')" style="padding:5px 7px" title="Exportieren">' + icon('download',13) + '</button>'
        + (modified ? '<button class="btn btn-ghost" onclick="resetEditablePromptAndRefresh(\'' + p.id + '\')" style="padding:5px 7px;color:var(--red)" title="Zurücksetzen">' + icon('refresh-cw',13) + '</button>' : '')
        + '<button class="btn btn-ghost" onclick="hideDesignBuiltinPrompt(\'' + p.id + '\')" style="padding:5px 7px;color:var(--red)" title="Entfernen">' + icon('trash-2',13) + '</button>'
        + '</div>'
        + '</div>';
    };
    html += '<div style="margin-bottom:24px">'
      + sectionHead('Design-Prompts', icon('layout',11,'color:var(--muted);margin-left:2px') + ' <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— anpassbar</span>')
      + (filteredDesign.length
        ? '<div class="prompts-grid" style="margin-bottom:' + (filteredDesignCustom.length ? '16px' : '0') + '">' + filteredDesign.map(_cardDesign).join('') + '</div>'
        : '')
      + (filteredDesignCustom.length
        ? '<div class="prompts-grid">' + filteredDesignCustom.map(_cardCustom).join('') + '</div>'
        : '')
      + (!filteredDesign.length && !filteredDesignCustom.length
        ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.85rem">Alle Design-Prompts wurden entfernt.</div>'
        : '')
      + '</div>';
  }

  // Foto-Analyse-Prompts (v5.58/v5.60/v5.62) – nur im Fotos-Tab abrufbar
  if (filteredFoto.length || fotoVisible) {
    // Card für built-in Foto-Prompts (mit Bearbeiten + Download + Löschen)
    const _cardFotoBuiltin = (p) => {
      const txt = getEditablePromptText(p.id) || p.prompt || '';
      return '<div class="prompt-card">'
        + '<div class="prompt-card-header">'
        + '<div class="prompt-card-icon">' + icon(p.icon || 'camera', 18, 'color:var(--muted)') + '</div>'
        + '<div class="prompt-card-name" style="color:var(--text)">' + escHtml(p.name) + '</div>'
        + '</div>'
        + (p.description ? '<div class="prompt-card-desc" style="color:var(--muted)">' + escHtml(p.description) + '</div>' : '')
        + '<div class="prompt-card-preview">' + escHtml(txt.slice(0, 120)) + (txt.length > 120 ? '…' : '') + '</div>'
        + '<div class="prompt-card-actions">'
        + '<button class="btn btn-ghost" onclick="openEditablePromptEditor(\'' + p.id + '\')" style="padding:5px 7px" title="Anpassen">' + icon('edit-2',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="exportSingleEditablePrompt(\'' + p.id + '\')" style="padding:5px 7px" title="Herunterladen">' + icon('download',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="hideFotoBuiltinPrompt(\'' + p.id + '\')" style="padding:5px 7px;color:var(--red)" title="Entfernen">' + icon('trash-2',13) + '</button>'
        + '</div>'
        + '</div>';
    };
    // Card für eigene Foto-Prompts (mit Bearbeiten + Download + Löschen)
    const _cardFotoCustom = (p) => {
      const preview = assemblePromptText(p);
      return '<div class="prompt-card">'
        + '<div class="prompt-card-header">'
        + '<div class="prompt-card-icon">' + icon(p.icon || 'camera', 18, 'color:var(--accent)') + '</div>'
        + '<div class="prompt-card-name">' + escHtml(p.name) + '</div>'
        + '</div>'
        + (p.description ? '<div class="prompt-card-desc">' + escHtml(p.description) + '</div>' : '')
        + '<div class="prompt-card-preview">' + escHtml(preview.slice(0, 120)) + (preview.length > 120 ? '…' : '') + '</div>'
        + '<div class="prompt-card-actions">'
        + '<button class="btn btn-ghost" onclick="openPromptEditorModal(\'' + p.id + '\')" style="padding:5px 7px" title="Bearbeiten">' + icon('edit-2',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="exportSinglePrompt(\'' + p.id + '\')" style="padding:5px 7px" title="Herunterladen">' + icon('download',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="deletePromptById(\'' + p.id + '\')" style="padding:5px 7px;color:var(--red)" title="Löschen">' + icon('trash-2',13) + '</button>'
        + '</div>'
        + '</div>';
    };
    html += '<div style="margin-bottom:24px">'
      + sectionHead('Foto-Analyse-Prompts', icon('camera',11,'color:var(--muted);margin-left:2px') + ' <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— nur im Fotos-Tab verfügbar</span>')
      + (filteredFotoBuiltin.length ? '<div class="prompts-grid" style="margin-bottom:' + (filteredFotoCustom.length ? '16px' : '0') + '">' + filteredFotoBuiltin.map(_cardFotoBuiltin).join('') + '</div>' : '')
      + (filteredFotoCustom.length ? '<div class="prompts-grid">' + filteredFotoCustom.map(_cardFotoCustom).join('') + '</div>' : '')
      + (filteredFoto.length === 0 ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.85rem">Alle eingebauten Foto-Prompts wurden entfernt. Eigene erstellen über die Buttons oben.</div>' : '')
      + '</div>';
  }

  // v5.71: Rollen-Prompts – nur im Folge-Gespräch als System-Prompt nutzbar
  if (filteredRolleBuiltin.length || filteredRolleCustom.length || rolleVisible) {
    const _cardRolleBuiltin = (p) => {
      const txt = getEditablePromptText(p.id) || p.prompt || '';
      return '<div class="prompt-card">'
        + '<div class="prompt-card-header">'
        + '<div class="prompt-card-icon">' + icon(p.icon || 'user', 18, 'color:var(--muted)') + '</div>'
        + '<div class="prompt-card-name" style="color:var(--text)">' + escHtml(p.name) + '</div>'
        + '</div>'
        + (p.description ? '<div class="prompt-card-desc" style="color:var(--muted)">' + escHtml(p.description) + '</div>' : '')
        + '<div class="prompt-card-preview">' + escHtml(txt.slice(0, 120)) + (txt.length > 120 ? '…' : '') + '</div>'
        + '<div class="prompt-card-actions">'
        + '<button class="btn btn-ghost" onclick="openEditablePromptEditor(\'' + p.id + '\')" style="padding:5px 7px" title="Anpassen">' + icon('edit-2',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="exportSingleEditablePrompt(\'' + p.id + '\')" style="padding:5px 7px" title="Herunterladen">' + icon('download',13) + '</button>'
        + '</div>'
        + '</div>';
    };
    const _cardRolleCustom = (p) => {
      const preview = assemblePromptText(p);
      return '<div class="prompt-card">'
        + '<div class="prompt-card-header">'
        + '<div class="prompt-card-icon">' + icon(p.icon || 'user', 18, 'color:var(--accent)') + '</div>'
        + '<div class="prompt-card-name">' + escHtml(p.name) + '</div>'
        + '</div>'
        + (p.description ? '<div class="prompt-card-desc">' + escHtml(p.description) + '</div>' : '')
        + '<div class="prompt-card-preview">' + escHtml(preview.slice(0, 120)) + (preview.length > 120 ? '…' : '') + '</div>'
        + '<div class="prompt-card-actions">'
        + '<button class="btn btn-ghost" onclick="openPromptEditorModal(\'' + p.id + '\')" style="padding:5px 7px" title="Bearbeiten">' + icon('edit-2',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="exportSinglePrompt(\'' + p.id + '\')" style="padding:5px 7px" title="Herunterladen">' + icon('download',13) + '</button>'
        + '<button class="btn btn-ghost" onclick="deletePromptById(\'' + p.id + '\')" style="padding:5px 7px;color:var(--red)" title="Löschen">' + icon('trash-2',13) + '</button>'
        + '</div>'
        + '</div>';
    };
    html += '<div style="margin-bottom:24px">'
      + sectionHead('Rollen-Prompts', icon('user',11,'color:var(--muted);margin-left:2px') + ' <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— nur im Folge-Gespräch als Systemprompt</span>')
      + (filteredRolleBuiltin.length ? '<div class="prompts-grid" style="margin-bottom:' + (filteredRolleCustom.length ? '16px' : '0') + '">' + filteredRolleBuiltin.map(_cardRolleBuiltin).join('') + '</div>' : '')
      + (filteredRolleCustom.length ? '<div class="prompts-grid">' + filteredRolleCustom.map(_cardRolleCustom).join('') + '</div>' : '')
      + ((filteredRolleBuiltin.length + filteredRolleCustom.length === 0) ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.85rem">Keine Rollen gefunden.</div>' : '')
      + '</div>';
  }

  // Eigene Prompts
  html += `<div>
    ${sectionHead('Eigene Prompts')}
    ${filteredCustom.length === 0 ? `
      <div style="text-align:center; padding:40px 24px; color:var(--muted); border:1px dashed var(--border); border-radius:14px">
        <div style="margin-bottom:10px; opacity:0.3">${icon('sparkles',28)}</div>
        <div style="font-size:0.88rem; margin-bottom:6px; font-weight:500">${q || tagFilterActive ? 'Keine Treffer' : 'Noch keine eigenen Prompts'}</div>
        ${!q && !tagFilterActive ? `<button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;margin-top:8px">${icon('plus',14)} Ersten Prompt erstellen</button>` : ''}
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
  document.getElementById('promptEditorId').value          = '';
  document.getElementById('promptEditorName').value        = p.name;
  document.getElementById('promptEditorDesc').value        = p.description;
  document.getElementById('promptEditorIcon').value        = p.icon;
  document.getElementById('promptEditorText').value        = p.prompt;
  document.getElementById('promptEditorError').style.display = 'none';

  // v5.20: Alle Felder explizit zurücksetzen (verhindert Kontamination durch vorherige eigene Prompts)
  document.getElementById('promptEditorRolle').value       = '';
  document.getElementById('promptEditorTonalitaet').value  = '';
  document.getElementById('promptEditorGrenzen').value     = '';
  document.getElementById('promptEditorTags').value        = '';

  // Felder sichtbar lassen, aber alle als ReadOnly markieren
  const structEl = document.getElementById('promptEditorStructuredFields');
  const tagsEl   = document.getElementById('promptEditorTagsSection');
  if (structEl) structEl.style.display = '';
  if (tagsEl)   tagsEl.style.display   = '';
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorRolle',
   'promptEditorTonalitaet','promptEditorGrenzen','promptEditorText','promptEditorTags'].forEach(fid => {
    const el2 = document.getElementById(fid);
    if (el2) { el2.readOnly = true; el2.style.opacity = '0.6'; }
  });

  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) saveBtn.style.display = 'none';
  const modal = document.getElementById('promptEditorModal');
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

// ── Editor-Schema-Builder (v5.33) ─────────────────────────────────────────────
let _editorSchema = [];

function _renderEditorSchema() {
  const listEl    = document.getElementById('promptEditorSchemaList');
  const previewEl = document.getElementById('promptEditorSchemaJsonPreview');
  if (!listEl) return;

  if (_editorSchema.length === 0) {
    listEl.innerHTML = '';
    if (previewEl) previewEl.style.display = 'none';
    return;
  }

  listEl.innerHTML = _editorSchema.map(f => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <input id="pefl_${f.id}" type="text" placeholder="Feldname (z.B. Kernpunkte)" value="${escHtml(f.label)}"
        oninput="_editorSyncSchema()" onchange="_editorSyncSchema()"
        style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.83rem;outline:none">
      <select id="peft_${f.id}" onchange="_editorSyncSchema()"
        style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.83rem;outline:none;max-width:160px">
        ${genFieldTypeDropdown(f.type)}
      </select>
      <button onclick="_editorRemoveField('${f.id}')"
        style="background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;flex-shrink:0" title="Entfernen">
        ${icon('x', 14)}
      </button>
    </div>`).join('');

  // JSON-Vorschau aktualisieren
  const valid = _editorSchema.filter(f => f.label);
  if (previewEl) {
    if (valid.length > 0) {
      previewEl.style.display = '';
      previewEl.innerHTML = `<details>
        <summary style="font-size:0.75rem;color:var(--muted);cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px;list-style:none;outline:none">
          ${icon('chevron-right', 12)} JSON-Vorschau – wird beim Ausführen automatisch ergänzt
        </summary>
        <pre style="margin:6px 0 0;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:0.78rem;color:var(--muted);overflow-x:auto;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escHtml(_buildJsonPreview(valid.map(f => ({
          label: f.label, type: f.type,
          field: f.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'field'
        }))))}</pre>
      </details>`;
    } else {
      previewEl.style.display = 'none';
    }
  }

  if (window.lucide) lucide.createIcons({ nodes: [listEl, previewEl].filter(Boolean) });
}

function _editorSyncSchema() {
  // Werte aus DOM zurück in _editorSchema schreiben (für Live-Preview)
  _editorSchema.forEach(f => {
    const lblEl  = document.getElementById('pefl_' + f.id);
    const typEl  = document.getElementById('peft_' + f.id);
    if (lblEl) f.label = lblEl.value;
    if (typEl) f.type  = typEl.value;
  });
  // JSON-Vorschau neu rendern ohne Feldliste neu zu bauen (verhindert Cursor-Verlust)
  const previewEl = document.getElementById('promptEditorSchemaJsonPreview');
  const valid = _editorSchema.filter(f => f.label);
  if (previewEl) {
    if (valid.length > 0) {
      previewEl.style.display = '';
      previewEl.innerHTML = `<details>
        <summary style="font-size:0.75rem;color:var(--muted);cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px;list-style:none;outline:none">
          ${icon('chevron-right', 12)} JSON-Vorschau – wird beim Ausführen automatisch ergänzt
        </summary>
        <pre style="margin:6px 0 0;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:0.78rem;color:var(--muted);overflow-x:auto;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escHtml(_buildJsonPreview(valid.map(f => ({
          label: f.label, type: f.type,
          field: f.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'field'
        }))))}</pre>
      </details>`;
      if (window.lucide) lucide.createIcons({ nodes: [previewEl] });
    } else {
      previewEl.style.display = 'none';
    }
  }
}

function _editorAddField() {
  _editorSchema.push({ id: 'pe' + Date.now(), label: '', type: 'list' });
  _renderEditorSchema();
  // Fokus auf neues Feld setzen
  const last = _editorSchema[_editorSchema.length - 1];
  setTimeout(() => document.getElementById('pefl_' + last.id)?.focus(), 50);
}

function _editorRemoveField(id) {
  _editorSchema = _editorSchema.filter(f => f.id !== id);
  _renderEditorSchema();
}

function openPromptEditorModal(id, category) {
  const prompts  = getCustomPrompts();
  const existing = id ? prompts.find(p => p.id === id) : null;
  // v5.60: Kategorie setzen (explizit übergeben oder von vorhandenem Prompt erben)
  _pendingPromptCategory = category || existing?.category || null;

  const _categoryTitles = {
    foto:     existing ? 'Foto-Prompt bearbeiten'     : 'Neuer Foto-Prompt',
    design:   existing ? 'Design-Prompt bearbeiten'   : 'Neuer Design-Prompt',
    standard: existing ? 'Standard-Prompt bearbeiten' : 'Neuer Standard-Prompt', // v5.67
    rolle:    existing ? 'Rollen-Prompt bearbeiten'   : 'Neuer Rollen-Prompt',   // v5.71
  };
  const titleLabel = _categoryTitles[_pendingPromptCategory] || (existing ? 'Eigener Prompt' : 'Neuer Prompt');
  document.getElementById('promptEditorTitle').textContent = titleLabel;
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

  // v5.18: custom-only Sektionen einblenden + alle Felder editierbar
  const structEl = document.getElementById('promptEditorStructuredFields');
  const tagsEl   = document.getElementById('promptEditorTagsSection');
  if (structEl) structEl.style.display = '';
  if (tagsEl)   tagsEl.style.display   = '';
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorRolle',
   'promptEditorTonalitaet','promptEditorGrenzen','promptEditorText','promptEditorTags'].forEach(fid => {
    const el2 = document.getElementById(fid);
    if (el2) { el2.readOnly = false; el2.style.opacity = ''; }
  });
  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) { saveBtn.style.display = ''; saveBtn.onclick = savePromptFromEditor; }
  const resetBtn = document.getElementById('promptEditorResetBtn');
  if (resetBtn) resetBtn.style.display = 'none';

  // v5.33: Schema-Builder mit vorhandenen Feldern befüllen
  const existingSchema = existing?.outputSchema;
  _editorSchema = Array.isArray(existingSchema) && existingSchema.length > 0
    ? existingSchema.map((f, i) => ({ id: 'pe' + i, label: f.label || '', type: f.type || 'list' }))
    : [];
  _renderEditorSchema();

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

  // v5.33: Schema aus Builder lesen (aktuelle DOM-Werte holen)
  _editorSchema.forEach(f => {
    const lblEl = document.getElementById('pefl_' + f.id);
    const typEl = document.getElementById('peft_' + f.id);
    if (lblEl) f.label = lblEl.value.trim();
    if (typEl) f.type  = typEl.value;
  });
  const schema = _editorSchema
    .filter(f => f.label)
    .map((f, i) => ({
      label: f.label,
      type:  f.type,
      field: f.label.toLowerCase()
              .normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '') || 'field_' + i
    }));

  const obj = { name, description: desc, icon: iconName, rolle, tonalitaet, grenzen, kontext, tags };
  // v5.60: Kategorie übernehmen wenn gesetzt
  if (_pendingPromptCategory) obj.category = _pendingPromptCategory;
  // outputSchema explizit setzen oder entfernen (nicht vom alten Objekt erben)
  if (schema.length > 0) obj.outputSchema = schema;

  const prompts = getCustomPrompts();
  if (id) {
    const idx = prompts.findIndex(p => p.id === id);
    if (idx >= 0) {
      const old = { ...prompts[idx] };
      delete old.outputSchema; // altes Schema immer entfernen, neues wird ggf. in obj gesetzt
      prompts[idx] = { ...old, ...obj };
    }
  } else {
    prompts.push({ id: genPromptId(), ...obj });
  }
  _pendingPromptCategory = null;
  saveCustomPrompts(prompts);
  closePromptEditorModal();
  _renderPromptsResults();
  showToast(id ? 'Prompt aktualisiert' : 'Prompt gespeichert', 'success');
}

function deletePromptById(id) {
  saveCustomPrompts(getCustomPrompts().filter(p => p.id !== id));
  _renderPromptsResults();
  showToast('Prompt gelöscht', 'success');
}

// v5.60: Built-in Foto-Prompts soft-löschen
function getHiddenFotoPromptIds() {
  try { return JSON.parse(localStorage.getItem('hiddenFotoPrompts') || '[]'); } catch { return []; }
}
function hideFotoBuiltinPrompt(id) {
  if (!confirm('Diesen eingebauten Foto-Prompt verstecken?\n(Kann über Browser-Einstellungen → localStorage zurückgesetzt werden)')) return;
  const hidden = getHiddenFotoPromptIds();
  if (!hidden.includes(id)) { hidden.push(id); localStorage.setItem('hiddenFotoPrompts', JSON.stringify(hidden)); }
  _renderPromptsResults();
  showToast('Foto-Prompt entfernt', 'success');
}

// v5.62: Design-Prompts soft-löschen
function getHiddenDesignPromptIds() {
  try { return JSON.parse(localStorage.getItem('hiddenDesignPrompts') || '[]'); } catch { return []; }
}
function hideDesignBuiltinPrompt(id) {
  if (!confirm('Diesen eingebauten Design-Prompt verstecken?\n(Kann über Browser-Einstellungen → localStorage zurückgesetzt werden)')) return;
  const hidden = getHiddenDesignPromptIds();
  if (!hidden.includes(id)) { hidden.push(id); localStorage.setItem('hiddenDesignPrompts', JSON.stringify(hidden)); }
  _renderPromptsResults();
  showToast('Design-Prompt entfernt', 'success');
}

// v5.65: Standard-Prompts soft-löschen
function getHiddenStandardPromptIds() {
  try { return JSON.parse(localStorage.getItem('hiddenStandardPrompts') || '[]'); } catch { return []; }
}
function hideStandardBuiltinPrompt(id) {
  if (!confirm('Diesen eingebauten Standard-Prompt verstecken?\n(Kann über Browser-Einstellungen → localStorage zurückgesetzt werden)')) return;
  const hidden = getHiddenStandardPromptIds();
  if (!hidden.includes(id)) { hidden.push(id); localStorage.setItem('hiddenStandardPrompts', JSON.stringify(hidden)); }
  _renderPromptsResults();
  showToast('Prompt entfernt', 'success');
}

// v5.65: Kategorie-Picker Modal (globale Buttons → Kategorie wählen → Editor/Generator)
let _pendingCategoryPickerAction = null; // 'editor' | 'generator'

function openPromptCategoryPickerModal(action) {
  _pendingCategoryPickerAction = action;
  let modal = document.getElementById('promptCategoryPickerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'promptCategoryPickerModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 28px 22px;min-width:300px;max-width:380px;box-shadow:0 8px 40px rgba(0,0,0,0.4)">
        <div style="font-size:1rem;font-weight:700;margin-bottom:4px;color:var(--text)">Kategorie wählen</div>
        <p style="font-size:0.82rem;color:var(--muted);margin-bottom:20px">In welcher Sektion soll der Prompt erscheinen?</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
          <button onclick="selectPromptCategory(null)" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;text-align:left;font-size:0.88rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:1.2rem">📊</span>
            <span><strong style="display:block">Analyse</strong><span style="font-size:0.75rem;color:var(--muted)">Eigene Prompts → Analysen-Tab</span></span>
          </button>
          <button onclick="selectPromptCategory('design')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;text-align:left;font-size:0.88rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:1.2rem">🎨</span>
            <span><strong style="display:block">Design</strong><span style="font-size:0.75rem;color:var(--muted)">Design-Prompts → Design-Tab</span></span>
          </button>
          <button onclick="selectPromptCategory('foto')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;text-align:left;font-size:0.88rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:1.2rem">📸</span>
            <span><strong style="display:block">Foto-Analyse</strong><span style="font-size:0.75rem;color:var(--muted)">Foto-Prompts → Fotos-Tab</span></span>
          </button>
          <button onclick="selectPromptCategory('standard')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;text-align:left;font-size:0.88rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:1.2rem">⭐</span>
            <span><strong style="display:block">Standard</strong><span style="font-size:0.75rem;color:var(--muted)">Standard-Sektion → Analysen-Tab</span></span>
          </button>
          <button onclick="selectPromptCategory('rolle')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;text-align:left;font-size:0.88rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:1.2rem">🎭</span>
            <span><strong style="display:block">Rolle</strong><span style="font-size:0.75rem;color:var(--muted)">System-Prompt → Folge-Gespräch</span></span>
          </button>
        </div>
        <button onclick="closePromptCategoryPickerModal()" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:0.83rem">Abbrechen</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closePromptCategoryPickerModal();
    });
  }
  modal.style.display = 'flex';
}

function selectPromptCategory(category) {
  closePromptCategoryPickerModal();
  if (_pendingCategoryPickerAction === 'editor') {
    openPromptEditorModal(null, category);
  } else {
    openPromptGeneratorModal(category);
  }
  _pendingCategoryPickerAction = null;
}

function closePromptCategoryPickerModal() {
  const m = document.getElementById('promptCategoryPickerModal');
  if (m) m.style.display = 'none';
}

// ── Custom Prompt ausführen ──────────────────────
async function runCustomPrompt(session, promptObj, transcript, extraPhotos = []) { // v5.67: optionale Fotos
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

  // ── Strukturiertes Ausgabe-Schema (v5.30: aus FIELD_TYPE_CONFIG) ──────────
  const schema = promptObj.outputSchema;
  if (Array.isArray(schema) && schema.length > 0) {
    const jsonTemplate = {};
    const hints = [];
    schema.forEach(s => {
      const cfg = FIELD_TYPE_CONFIG[s.type];
      jsonTemplate[s.field] = cfg ? cfg.jsonExample(s.columns) : 'Text...';
      if (cfg?.claudeHint) hints.push(`"${s.field}": ${cfg.claudeHint}`);
    });
    const hintBlock = hints.length > 0 ? `\nFeld-Hinweise:\n${hints.map(h => `- ${h}`).join('\n')}` : '';
    promptText += `\n\nAntworte ausschließlich mit validem JSON, ohne Erklärungen, ohne Markdown-Blöcke.${hintBlock}\nExaktes Format:\n${JSON.stringify(jsonTemplate, null, 2)}`;
  }

  // v5.67: Multimodal-Support – wenn Fotos übergeben, Vision-API verwenden
  let apiResult;
  if (extraPhotos && extraPhotos.length > 0) {
    showToast(extraPhotos.length + ' Foto(s) werden geladen…', 'info');
    const content = [];
    for (const photo of extraPhotos) {
      const b64 = await _loadPhotoAsBase64(photo.driveFileId);
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
    }
    content.push({ type: 'text', text: anonymizeText(promptText, forward) });
    apiResult = await callClaudeAPIVision(content);
  } else {
    apiResult = await callClaudeAPI(anonymizeText(promptText, forward));
  }
  const { text, inputTokens, outputTokens } = apiResult;
  addTokensToSession(session, inputTokens, outputTokens);
  const result = deanonymizeText(text, reverse);

  if (!session.customResults) session.customResults = {};

  // Strukturiertes Ergebnis parsen wenn Schema vorhanden
  if (Array.isArray(schema) && schema.length > 0) {
    let structured = null;
    try {
      const jsonStr = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      structured = JSON.parse(jsonStr);
    } catch(e) {
      console.warn('[customPrompt] JSON-Parse fehlgeschlagen, Fallback auf Freitext:', e.message);
    }
    // v4.96: structured nur behalten wenn mindestens ein Schema-Feld Daten enthält
    if (structured && Array.isArray(schema)) {
      const hasData = schema.some(s => {
        const v = structured[s.field];
        return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
      });
      if (!hasData) {
        console.warn('[customPrompt] Strukturiertes JSON ohne Daten → Fallback auf Freitext');
        structured = null;
      }
    }
    session.customResults[promptObj.id] = {
      text:       result,       // Fallback Freitext
      structured: structured,   // null wenn Parse-Fehler ODER leeres Ergebnis
      schema:     schema,
      promptName: promptObj.name,
      icon:       promptObj.icon || 'sparkles',
      createdAt:  new Date().toISOString()
    };
  } else {
    session.customResults[promptObj.id] = {
      text:       result,
      promptName: promptObj.name,
      icon:       promptObj.icon || 'sparkles',
      createdAt:  new Date().toISOString()
    };
  }
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

  // v5.20: Strukturierte Felder leeren (verhindert Kontamination durch eigene Prompts)
  document.getElementById('promptEditorRolle').value      = '';
  document.getElementById('promptEditorTonalitaet').value = '';
  document.getElementById('promptEditorGrenzen').value    = '';
  document.getElementById('promptEditorTags').value       = '';

  // Strukturierte Sektionen sichtbar lassen, aber gesperrt
  const structEl = document.getElementById('promptEditorStructuredFields');
  const tagsEl   = document.getElementById('promptEditorTagsSection');
  if (structEl) structEl.style.display = '';
  if (tagsEl)   tagsEl.style.display   = '';

  // Name/Desc/Icon/Rolle/Tonalität/Grenzen/Tags gesperrt, nur Text editierbar
  ['promptEditorName','promptEditorDesc','promptEditorIcon',
   'promptEditorRolle','promptEditorTonalitaet','promptEditorGrenzen','promptEditorTags'].forEach(fid => {
    const el2 = document.getElementById(fid);
    if (el2) { el2.readOnly = true; el2.style.opacity = '0.5'; }
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
      showToast('Prompt zurückgesetzt', 'success');
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
  showToast('Prompt gespeichert', 'success');
}

function resetEditablePromptAndRefresh(id) {
  resetEditablePrompt(id);
  _renderPromptsResults();
  showToast('Prompt zurückgesetzt', 'success');
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

function _downloadPromptJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Einzelnen eigenen Prompt exportieren
function exportSinglePrompt(id) {
  const prompt = getCustomPrompts().find(p => p.id === id);
  if (!prompt) return;
  _downloadPromptJson({
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: ownerName || 'Distill Voice',
    customPrompts: [prompt],
  }, `prompt_${prompt.name.replace(/[^a-z0-9äöü]/gi,'_').slice(0,40)}.json`);
  showToast(`"${prompt.name}" exportiert`, 'success');
}

// Einzelnen Standard/Feature-Prompt exportieren
function exportSingleEditablePrompt(id) {
  const def  = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (!def) return;
  const text = getEditablePromptText(id);
  _downloadPromptJson({
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: ownerName || 'Distill Voice',
    editedDefaults: { [id]: text },
    // Metadaten damit der Empfänger weiß was das ist
    meta: { id, name: def.name, category: def.category, description: def.description },
  }, `prompt_${def.name.replace(/[^a-z0-9äöü]/gi,'_').slice(0,40)}.json`);
  showToast(`"${def.name}" exportiert`, 'success');
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
        const up = getUserPrompts();
        up.editableOverrides = { ...data.editedDefaults, ...up.editableOverrides }; // lokale haben Vorrang
        saveUserPrompts(up);
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

// ═══════════════════════════════════════════════════
// PROMPT-GENERATOR WIZARD (v5.23)
// Wizard-Modus: 5 Schritte | KI-Modus: Beschreiben → Claude baut
// ═══════════════════════════════════════════════════

let _genState = null;
let _pendingPromptCategory = null; // v5.60: gesetzt wenn Prompt in bestimmter Kategorie gespeichert werden soll

// ── Zentrale Ausgabe-Feld-Konfiguration (v5.30) ──────────────────────────────
// Einzige Quelle der Wahrheit für alle Typen: Dropdown, JSON-Vorschau,
// Claude-Anweisung und Renderer lesen alle aus dieser Config.
// Neuen Typ hinzufügen = eine neue Zeile hier.
const FIELD_TYPE_CONFIG = {
  // ── Einfach ───────────────────────────────────────────────────────────────
  text: {
    label: 'Freitext', icon: 'align-left', group: 'einfach',
    jsonExample: ()  => 'Text...',
    claudeHint:  'Fließtext ohne Aufzählungen',
  },
  boolean: {
    label: 'Ja / Nein', icon: 'toggle-right', group: 'einfach',
    jsonExample: ()  => true,
    claudeHint:  'Genau true oder false (ohne Anführungszeichen)',
  },
  rating: {
    label: 'Bewertung (1–5)', icon: 'star', group: 'einfach',
    jsonExample: ()  => ({ wert: 4, begruendung: 'Kurze Begründung...' }),
    claudeHint:  'Objekt mit "wert" (ganze Zahl 1–5) und "begruendung" (ein Satz)',
  },
  // ── Listen ────────────────────────────────────────────────────────────────
  list: {
    label: 'Aufzählung', icon: 'list', group: 'listen',
    jsonExample: ()  => ['Eintrag 1', 'Eintrag 2'],
    claudeHint:  'Array von Strings, ein Punkt pro Eintrag',
  },
  checklist: {
    label: 'Checkliste', icon: 'check-square', group: 'listen',
    jsonExample: ()  => ['Schritt 1', 'Schritt 2'],
    claudeHint:  'Array von Strings, jeder Eintrag ist ein abhakbarer Punkt',
  },
  tag_list: {
    label: 'Tags / Labels', icon: 'tag', group: 'listen',
    jsonExample: ()  => ['Tag 1', 'Tag 2', 'Tag 3'],
    claudeHint:  'Array von kurzen Strings (1–3 Wörter) zur Kategorisierung',
  },
  // ── Strukturiert ──────────────────────────────────────────────────────────
  list_with_person: {
    label: 'Aufgaben (Person + Text)', icon: 'user-check', group: 'strukturiert',
    jsonExample: ()  => [{ person: 'Name', text: 'Aufgabe...' }],
    claudeHint:  'Array von Objekten mit "person" (Name) und "text" (Aufgabe). Nur wenn Person eindeutig erkennbar.',
  },
  list_with_date: {
    label: 'Termin (Datum + Text)', icon: 'calendar-event', group: 'strukturiert',
    jsonExample: ()  => [{ datum: 'TT.MM.JJJJ', text: 'Beschreibung...' }],
    claudeHint:  'Array von Objekten mit "datum" (Format TT.MM.JJJJ) und "text" (Beschreibung)',
  },
  quote: {
    label: 'Zitat', icon: 'quote', group: 'strukturiert',
    jsonExample: ()  => [{ text: 'Wörtliche Aussage...', person: 'Name' }],
    claudeHint:  'Array von Objekten mit "text" (wörtliches Zitat) und "person" (Sprecher, falls erkennbar)',
  },
  key_value: {
    label: 'Schlüssel-Wert', icon: 'layout-list', group: 'strukturiert',
    jsonExample: ()  => [{ key: 'Begriff', value: 'Wert' }],
    claudeHint:  'Array von Objekten mit "key" (Bezeichnung) und "value" (Inhalt)',
  },
  // ── Komplex ───────────────────────────────────────────────────────────────
  table: {
    label: 'Tabelle', icon: 'table', group: 'komplex',
    jsonExample: (cols) => [(cols || ['Spalte 1', 'Spalte 2']).map(() => '...')],
    claudeHint:  'Array von Arrays (Zeilen), jede Zeile hat so viele Werte wie Spalten definiert',
  },
};

// Gruppen-Reihenfolge für das Dropdown
const FIELD_TYPE_GROUPS = [
  { key: 'einfach',      label: 'Einfach' },
  { key: 'listen',       label: 'Listen' },
  { key: 'strukturiert', label: 'Strukturiert' },
  { key: 'komplex',      label: 'Komplex' },
];

// Dropdown-HTML mit optgroup (aus Config abgeleitet)
function genFieldTypeDropdown(selectedValue) {
  return FIELD_TYPE_GROUPS.map(g => {
    const types = Object.entries(FIELD_TYPE_CONFIG).filter(([, c]) => c.group === g.key);
    if (!types.length) return '';
    return `<optgroup label="${g.label}">${
      types.map(([v, c]) => `<option value="${v}"${selectedValue === v ? ' selected' : ''}>${c.label}</option>`).join('')
    }</optgroup>`;
  }).join('');
}

// Abwärtskompatibles Array für alle Stellen die noch .find() nutzen
const GEN_FIELD_TYPES = Object.entries(FIELD_TYPE_CONFIG).map(([value, c]) => ({
  value, label: c.label, icon: c.icon, group: c.group,
}));

function openPromptGeneratorModal(category) {
  // v5.60: Kategorie setzen wenn übergeben
  _pendingPromptCategory = category || null;
  _genState = {
    mode: null, step: 1,
    name: '', icon: 'sparkles', description: '',
    rolle: '', tonalitaet: '', grenzen: '',
    kontext: '', schema: [], tags: [], aiDesc: '', finalText: ''
  };
  _renderGenModal();
  document.getElementById('promptGeneratorModal').style.display = 'flex';
}

function closePromptGeneratorModal() {
  document.getElementById('promptGeneratorModal').style.display = 'none';
  _genState = null;
}

function _genSetMode(mode) {
  _genState.mode = mode;
  _genState.step = 2;
  _renderGenModal();
}

// ── DOM → State lesen beim Navigieren ────────────────────────────────────────
function _genSaveStep() {
  if (!_genState) return;
  const s   = _genState;
  const val = (id) => (document.getElementById(id)?.value || '');

  if (s.mode === 'wizard') {
    if (s.step === 2) {
      s.name        = val('genName').trim();
      s.icon        = val('genIcon').trim() || 'sparkles';
      s.description = val('genDesc').trim();
    }
    if (s.step === 3) {
      s.rolle      = val('genRolle').trim();
      s.tonalitaet = val('genTon').trim();
      s.grenzen    = val('genGrenzen').trim();
    }
    if (s.step === 4) { s.kontext = val('genKontext').trim(); }
    if (s.step === 5) {
      s.schema.forEach(f => {
        f.label = (document.getElementById('gfl_' + f.id)?.value || '').trim();
        f.type  =  document.getElementById('gft_' + f.id)?.value || 'list';
      });
    }
    if (s.step === 6) {
      s.tags       = val('genTags').split(',').map(t => t.trim()).filter(Boolean);
      s.rolle      = val('gen6Rolle').trim();
      s.tonalitaet = val('gen6Ton').trim();
      s.grenzen    = val('gen6Grenzen').trim();
      s.kontext    = val('gen6Kontext').trim();
    }
  } else {
    if (s.step === 2) { s.aiDesc = val('genAiDesc').trim(); }
    if (s.step === 6) {
      s.tags       = val('genTags').split(',').map(t => t.trim()).filter(Boolean);
      s.rolle      = val('gen6Rolle').trim();
      s.tonalitaet = val('gen6Ton').trim();
      s.grenzen    = val('gen6Grenzen').trim();
      s.kontext    = val('gen6Kontext').trim();
    }
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function _genNext() {
  _genSaveStep();
  const s = _genState;

  if (s.mode === 'wizard') {
    if (s.step === 2 && !s.name)   { showToast('Bitte einen Namen eingeben.', 'warning'); return; }
    if (s.step === 4 && !s.kontext){ showToast('Bitte einen Kontext eingeben.', 'warning'); return; }
    if (s.step === 6) { _genSave(); return; }
    s.step++;
  } else {
    if (s.step === 2 && !s.aiDesc) { showToast('Bitte beschreibe was der Prompt tun soll.', 'warning'); return; }
    if (s.step === 2) { _genGenerateWithAI(); return; }
    if (s.step === 6) { _genSave(); return; }
    s.step++;
  }
  _renderGenModal();
}

function _genBack() {
  _genSaveStep();
  const s = _genState;
  if (s.mode === 'ai' && s.step === 6) { s.step = 2; }
  else if (s.step === 2)               { s.step = 1; s.mode = null; }
  else if (s.step > 1)                 { s.step--; }
  _renderGenModal();
}

// ── Schema-Builder ────────────────────────────────────────────────────────────
function _genAddField() {
  _genSaveStep();
  _genState.schema.push({ id: 'f' + Date.now(), label: '', type: 'list' });
  _renderGenModal();
}

function _genRemoveField(id) {
  _genSaveStep();
  _genState.schema = _genState.schema.filter(f => f.id !== id);
  _renderGenModal();
}

// ── KI-Generierung ────────────────────────────────────────────────────────────
async function _genGenerateWithAI() {
  const s = _genState;
  document.getElementById('genStepContent').innerHTML = `
    <div style="text-align:center; padding:48px 24px">
      <div style="margin-bottom:14px">${icon('loader-2', 32, 'color:var(--accent)')}</div>
      <div style="font-size:0.88rem; color:var(--muted)">Claude erstellt deinen Prompt…</div>
    </div>`;
  document.getElementById('genNavigation').innerHTML = '';
  if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('promptGeneratorModal')] });

  const promptText = `Du bist ein Prompt-Engineer für "Distill Voice", eine App die Gespräche transkribiert und mit KI analysiert.

Der Nutzer möchte folgenden Analyse-Prompt: ${s.aiDesc}

Erstelle einen vollständigen, professionellen Prompt. Antworte NUR mit einem JSON-Objekt, kein Markdown:
{
  "name": "Prompt-Name auf Deutsch (3-5 Wörter)",
  "icon": "lucide-icon-name (Englisch, z.B. target, briefcase, heart)",
  "description": "Kurze Beschreibung (max. 8 Wörter)",
  "rolle": "Rollen-Beschreibung OHNE 'Du bist' Prefix und OHNE abschließenden Punkt (z.B. 'ein erfahrener Coach') – leer lassen wenn nicht sinnvoll",
  "tonalitaet": "Tonalität OHNE abschließenden Punkt (optional)",
  "grenzen": "Was der Prompt NICHT tun soll, OHNE abschließenden Punkt (optional)",
  "kontext": "Der Prompt-Text. Nutze {{transkript}} als Platzhalter. Enthält die eigentliche Analyse-Anweisung. KEINE JSON-Format-Anweisungen einfügen – werden automatisch ergänzt.",
  "schema": [
    {"id": "f0", "label": "Feldname auf Deutsch", "type": "text|list|checklist|list_with_person"}
  ],
  "tags": ["tag1"]
}`;

  try {
    const { text } = await callClaudeAPI(promptText);
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const data    = JSON.parse(jsonStr);

    s.name        = data.name        || '';
    s.icon        = data.icon        || 'sparkles';
    s.description = data.description || '';
    s.rolle       = data.rolle       || '';
    s.tonalitaet  = data.tonalitaet  || '';
    s.grenzen     = data.grenzen     || '';
    s.kontext     = data.kontext     || '';
    s.schema      = (data.schema || []).map((f, i) => ({
      id: 'f' + i, label: f.label || '', type: f.type || 'list'
    }));
    s.tags        = data.tags || [];
    s.step        = 6;
    _renderGenModal();
  } catch(e) {
    showToast('KI-Generierung fehlgeschlagen: ' + e.message, 'error');
    s.step = 2;
    _renderGenModal();
  }
}

// ── Speichern ─────────────────────────────────────────────────────────────────
function _genSave() {
  _genSaveStep();
  const s = _genState;
  if (!s.name) { showToast('Name fehlt.', 'warning'); return; }
  if (!s.kontext?.trim()) { showToast('Kein Prompt-Inhalt vorhanden.', 'warning'); return; }

  // Schema bereinigen: nur Felder mit Label behalten, field-Key ableiten
  const schema = s.schema
    .filter(f => f.label && f.type)
    .map((f, i) => ({
      label: f.label,
      type:  f.type,
      field: f.label.toLowerCase()
              .normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '') || 'field_' + i
    }));

  const obj = {
    id:          genPromptId(),
    name:        s.name,
    icon:        s.icon || 'sparkles',
    description: s.description,
    rolle:       s.rolle      || '',
    tonalitaet:  s.tonalitaet || '',
    grenzen:     s.grenzen    || '',
    kontext:     s.kontext,
    tags:        s.tags,
    ...(schema.length > 0 ? { outputSchema: schema } : {}),
    // v5.60: Kategorie übernehmen wenn gesetzt
    ...(_pendingPromptCategory ? { category: _pendingPromptCategory } : {})
  };

  const prompts = getCustomPrompts();
  prompts.push(obj);
  _pendingPromptCategory = null;
  saveCustomPrompts(prompts);
  closePromptGeneratorModal();
  _renderPromptsResults();
  showToast(`"${s.name}" wurde erstellt ✓`, 'success');
}

// ── Feldtypen-Hilfe (v5.34) ───────────────────────────────────────────────────
const FIELD_TYPE_EXAMPLES = {
  text: {
    title: 'Zusammenfassung eines Gesprächs',
    problem: 'Du willst nach dem Meeting schnell wissen worum es ging.',
    promptGoal: '„Fasse das Meeting in 3–4 Sätzen zusammen. Kein Bulletpoint, fließender Text."',
    outputHtml: '<p style="font-size:0.78rem;line-height:1.5;margin:0;color:var(--text)">Das Meeting drehte sich um die Q3-Planung. Das Team einigte sich auf drei Prioritäten…</p>'
  },
  boolean: {
    title: 'Entscheidung getroffen?',
    problem: 'Du willst wissen ob im Meeting eine klare Entscheidung gefallen ist.',
    promptGoal: '„War eine eindeutige Entscheidung erkennbar? Antworte nur mit true oder false."',
    outputHtml: '<span style="display:inline-block;padding:3px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;background:rgba(52,211,153,0.15);color:#10b981">Ja</span>'
  },
  rating: {
    title: 'Stimmung im Meeting',
    problem: 'Du willst die Gesprächsqualität auf einen Blick erfassen.',
    promptGoal: '„Bewerte die Gesprächsatmosphäre auf einer Skala von 1–5 mit kurzer Begründung."',
    outputHtml: '<div style="font-size:1rem;color:var(--accent2,#f59e0b);letter-spacing:2px">★★★★☆ <span style="font-size:0.78rem;color:var(--muted);vertical-align:middle">4/5</span></div><div style="font-size:0.76rem;color:var(--muted);margin-top:3px">Konstruktive Diskussion, klare Ergebnisse.</div>'
  },
  list: {
    title: 'Besprochene Themen',
    problem: 'Du willst die Kernthemen auf einen Blick sehen.',
    promptGoal: '„Liste alle besprochenen Themen auf. Maximal 6, kurze Stichpunkte."',
    outputHtml: '<ul style="margin:0;padding-left:16px;font-size:0.78rem;line-height:1.9;color:var(--text)"><li>Q3-Budget freigabe</li><li>Neue Kundenpräsentation</li><li>Teamstruktur ab Juli</li></ul>'
  },
  checklist: {
    title: 'Vorbereitung für nächstes Meeting',
    problem: 'Du willst Punkte abhaken können – direkt in der App.',
    promptGoal: '„Erstelle eine Checkliste mit allem was vor dem nächsten Meeting erledigt sein muss."',
    outputHtml: '<div style="font-size:0.78rem;line-height:2;color:var(--text)"><div>☐ Angebot bis Do. einreichen</div><div style="color:var(--muted);text-decoration:line-through">☑ Präsentation aktualisieren</div><div>☐ Protokoll versenden</div></div>'
  },
  tag_list: {
    title: 'Themen-Tags',
    problem: 'Du willst das Gespräch schnell kategorisieren.',
    promptGoal: '„Vergib 3–6 kurze Tags die das Gespräch beschreiben."',
    outputHtml: '<div style="display:flex;flex-wrap:wrap;gap:5px"><span style="background:rgba(108,99,255,0.12);color:var(--accent);border-radius:20px;padding:2px 10px;font-size:0.76rem">Strategie</span><span style="background:rgba(108,99,255,0.12);color:var(--accent);border-radius:20px;padding:2px 10px;font-size:0.76rem">Q3</span><span style="background:rgba(108,99,255,0.12);color:var(--accent);border-radius:20px;padding:2px 10px;font-size:0.76rem">Planung</span></div>'
  },
  list_with_person: {
    title: 'Todos mit Verantwortlichkeit',
    problem: 'Wer macht was? Nicht mehr nach dem Meeting fragen müssen.',
    promptGoal: '„Weise jede Aufgabe einer Person zu. Nur wenn eindeutig genannt."',
    outputHtml: '<div style="font-size:0.78rem;line-height:2;color:var(--text)"><div style="display:flex;align-items:center;gap:6px"><span style="background:rgba(108,99,255,0.15);color:var(--accent);border-radius:4px;padding:1px 7px;font-size:0.72rem;font-weight:600">Anna</span>Angebot finalisieren bis Fr.</div><div style="display:flex;align-items:center;gap:6px"><span style="background:rgba(108,99,255,0.15);color:var(--accent);border-radius:4px;padding:1px 7px;font-size:0.72rem;font-weight:600">Max</span>Design-Review einplanen</div></div>'
  },
  list_with_date: {
    title: 'Termine & Deadlines',
    problem: 'Du willst alle genannten Termine im Überblick haben.',
    promptGoal: '„Extrahiere alle Termine mit Datum und Beschreibung."',
    outputHtml: '<div style="font-size:0.78rem;line-height:2;color:var(--text)"><div style="display:flex;align-items:center;gap:6px"><span style="background:rgba(250,174,52,0.15);color:var(--accent2,#f59e0b);border-radius:4px;padding:1px 6px;font-size:0.7rem">15.07.2026</span>Angebot einreichen</div><div style="display:flex;align-items:center;gap:6px"><span style="background:rgba(250,174,52,0.15);color:var(--accent2,#f59e0b);border-radius:4px;padding:1px 6px;font-size:0.7rem">01.08.2026</span>Projektstart</div></div>'
  },
  quote: {
    title: 'Wichtige Aussagen',
    problem: 'Du willst wörtliche Zitate aus dem Gespräch festhalten.',
    promptGoal: '„Extrahiere die wichtigsten wörtlichen Aussagen mit Sprecher."',
    outputHtml: '<div style="border-left:2px solid var(--accent);padding-left:8px;font-size:0.78rem;color:var(--text)"><div style="font-style:italic">„Das Budget steht, wir müssen jetzt liefern."</div><div style="font-size:0.7rem;color:var(--muted);margin-top:2px">— Anna</div></div>'
  },
  key_value: {
    title: 'Kennzahlen & Fakten',
    problem: 'Du willst strukturierte Fakten auf einen Blick.',
    promptGoal: '„Liste alle genannten Zahlen und Fakten als Begriff-Wert-Paare."',
    outputHtml: '<div style="font-size:0.78rem;line-height:2;color:var(--text)"><div style="display:flex;gap:10px"><span style="font-weight:600;color:var(--muted);min-width:65px">Budget</span><span>€ 50.000</span></div><div style="display:flex;gap:10px"><span style="font-weight:600;color:var(--muted);min-width:65px">Deadline</span><span>15. Juli</span></div></div>'
  },
  table: {
    title: 'Vergleich von Optionen',
    problem: 'Im Meeting wurden Anbieter verglichen. Du willst die Daten strukturiert sehen.',
    promptGoal: '„Erstelle eine Tabelle mit Anbieter, Preis und Stärken."',
    outputHtml: '<table style="font-size:0.74rem;border-collapse:collapse;width:100%;color:var(--text)"><tr style="color:var(--muted);font-weight:700"><td style="padding:2px 8px 4px 0">Anbieter</td><td style="padding:2px 8px 4px">Preis</td><td style="padding:2px 8px 4px">Stärke</td></tr><tr><td style="padding:2px 8px 2px 0">Firma A</td><td style="padding:2px 8px">€ 500</td><td style="padding:2px 8px">Support</td></tr><tr style="color:var(--muted)"><td style="padding:2px 8px 2px 0">Firma B</td><td style="padding:2px 8px">€ 320</td><td style="padding:2px 8px">Preis</td></tr></table>'
  },
};

function showFieldTypeHelp() {
  let overlay = document.getElementById('fieldTypeHelpOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fieldTypeHelpOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.45);display:flex;align-items:flex-start;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
  }

  const cardsHtml = FIELD_TYPE_GROUPS.map(g => {
    const types = Object.entries(FIELD_TYPE_CONFIG).filter(([, c]) => c.group === g.key);
    if (!types.length) return '';
    return `
      <div style="margin-bottom:6px">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${g.label}</div>
        ${types.map(([key, cfg]) => {
          const ex = FIELD_TYPE_EXAMPLES[key] || {};
          return `
          <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:10px">
            <div style="padding:12px 14px;background:var(--surface2)">
              <div style="display:inline-flex;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:600;color:var(--accent);margin-bottom:7px">
                ${icon(cfg.icon, 12, 'color:var(--accent)')} ${cfg.label}
              </div>
              <div style="font-weight:700;font-size:0.88rem;margin-bottom:3px;color:var(--text)">${ex.title || cfg.label}</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.4">${ex.problem ? 'Problem: ' + ex.problem : cfg.claudeHint}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border)">
              <div style="padding:10px 12px;border-right:1px solid var(--border)">
                <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:7px;display:flex;align-items:center;gap:4px">${icon('target', 11)} Prompt-Ziel</div>
                <div style="font-size:0.76rem;color:var(--muted);line-height:1.5;font-style:italic">${ex.promptGoal || '–'}</div>
              </div>
              <div style="padding:10px 12px">
                <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:7px;display:flex;align-items:center;gap:4px">${icon('eye', 11)} Ausgabe</div>
                ${ex.outputHtml || '<span style="font-size:0.76rem;color:var(--muted)">–</span>'}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }).join('');

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:640px;width:100%;padding:20px 20px 16px;box-sizing:border-box;margin:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h3 style="margin:0;font-size:0.95rem;font-weight:700;display:flex;align-items:center;gap:8px">
          ${icon('help-circle', 16, 'color:var(--accent)')} Ausgabe-Feld-Typen
        </h3>
        <button onclick="document.getElementById('fieldTypeHelpOverlay').style.display='none'"
          style="background:none;border:none;color:var(--muted);font-size:1.3rem;cursor:pointer;line-height:1;padding:0 4px">×</button>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin:0 0 4px;line-height:1.5">
        Wähle den Typ passend zur gewünschten Ausgabestruktur.
      </p>
      ${cardsHtml}
    </div>`;

  overlay.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [overlay] });
}

// ── Step-6-Formular (v5.31) ───────────────────────────────────────────────────
// Gemeinsam für Wizard- und KI-Modus – zeigt 4 Felder statt einer Textarea
function _buildGen6Form(s, validSchema) {
  const fieldStyle = 'width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;outline:none;box-sizing:border-box';
  const labelStyle = 'font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:5px';

  return `
    <div style="margin-bottom:14px">
      <label style="${labelStyle}">Tags (kommagetrennt)</label>
      <input id="genTags" type="text" placeholder="feedback, team, wöchentlich" value="${escHtml((s.tags || []).join(', '))}" style="${fieldStyle}">
    </div>
    <div style="margin-bottom:12px">
      <label style="${labelStyle}">Rolle <span style="font-weight:400;text-transform:none;color:var(--muted);font-size:0.72rem">(optional – z.B. „ein erfahrener Coach")</span></label>
      <input id="gen6Rolle" type="text" placeholder="z.B. ein erfahrener Coach" value="${escHtml(s.rolle || '')}" style="${fieldStyle}">
    </div>
    <div style="margin-bottom:12px">
      <label style="${labelStyle}">Tonalität <span style="font-weight:400;text-transform:none;color:var(--muted);font-size:0.72rem">(optional)</span></label>
      <input id="gen6Ton" type="text" placeholder="z.B. sachlich und präzise" value="${escHtml(s.tonalitaet || '')}" style="${fieldStyle}">
    </div>
    <div style="margin-bottom:12px">
      <label style="${labelStyle}">Grenzen <span style="font-weight:400;text-transform:none;color:var(--muted);font-size:0.72rem">(optional – was der Prompt NICHT tun soll)</span></label>
      <input id="gen6Grenzen" type="text" placeholder="z.B. keine persönlichen Empfehlungen geben" value="${escHtml(s.grenzen || '')}" style="${fieldStyle}">
    </div>
    <div style="margin-bottom:12px">
      <label style="${labelStyle}">Kontext / Prompt-Text</label>
      <textarea id="gen6Kontext" rows="8" placeholder="Analysiere das folgende Transkript: {{transkript}}"
        style="${fieldStyle};resize:vertical;line-height:1.5;font-family:inherit">${escHtml(s.kontext || '')}</textarea>
    </div>
    ${validSchema.length > 0 ? `
    <details style="margin-bottom:8px">
      <summary style="font-size:0.75rem;color:var(--muted);cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px;list-style:none;outline:none">
        ${icon('chevron-right', 12, 'transition:transform 0.15s')} JSON-Format – wird beim Ausführen automatisch ergänzt
      </summary>
      <pre style="margin:6px 0 0;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:0.78rem;color:var(--muted);overflow-x:auto;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escHtml(_buildJsonPreview(validSchema))}</pre>
    </details>` : ''}`;
}

// ── JSON-Vorschau für Step 6 ──────────────────────────────────────────────────
// Baut exakt dasselbe JSON-Template wie runCustomPrompt() zur Laufzeit
function _buildJsonPreview(validSchema) {
  const tpl = {};
  validSchema.forEach((f, i) => {
    const field = f.field || (f.label || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'field_' + i;
    const cfg = FIELD_TYPE_CONFIG[f.type];
    tpl[field] = cfg ? cfg.jsonExample(f.columns) : 'Text...';
  });
  return JSON.stringify(tpl, null, 2);
}

// ── Modal rendern ─────────────────────────────────────────────────────────────
function _renderGenModal() {
  const s = _genState;
  if (!s) return;
  const titleEl    = document.getElementById('genModalTitle');
  const progressEl = document.getElementById('genProgressBar');
  const contentEl  = document.getElementById('genStepContent');
  const navEl      = document.getElementById('genNavigation');
  if (!contentEl || !navEl) return;

  // Fortschritts-Leiste
  if (s.mode && progressEl) {
    const steps  = s.mode === 'wizard'
      ? ['Grundlagen', 'Charakter', 'Kontext', 'Ausgabe', 'Fertig']
      : ['Beschreiben', 'Ergebnis'];
    const curIdx = s.mode === 'wizard' ? (s.step - 2) : (s.step === 2 ? 0 : 1);
    progressEl.innerHTML = `<div style="display:flex;align-items:center;gap:4px;justify-content:center;flex-wrap:wrap">
      ${steps.map((label, i) => `
        <div style="display:flex;align-items:center;gap:4px">
          <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;flex-shrink:0;
            background:${i <= curIdx ? 'var(--accent)' : 'var(--surface2)'};
            color:${i <= curIdx ? '#fff' : 'var(--muted)'};
            border:${i > curIdx ? '1px solid var(--border)' : 'none'}">
            ${i < curIdx ? '✓' : i + 1}
          </div>
          <span style="font-size:0.64rem;color:${i === curIdx ? 'var(--accent)' : 'var(--muted)'};white-space:nowrap">${label}</span>
          ${i < steps.length - 1 ? `<div style="width:20px;height:1px;background:var(--border)"></div>` : ''}
        </div>`).join('')}
    </div>`;
  } else if (progressEl) {
    progressEl.innerHTML = '';
  }

  let html = '';

  // ── Schritt 1: Modus wählen ────────────────────────────────────────────────
  if (s.step === 1) {
    if (titleEl) titleEl.querySelector('span') && (titleEl.lastChild.textContent = 'Prompt generieren');
    html = `
      <p style="font-size:0.85rem;color:var(--muted);margin:0 0 16px">Wie möchtest du vorgehen?</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button onclick="_genSetMode('wizard')" style="text-align:left;padding:16px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${icon('list-ordered', 20, 'color:var(--accent)')}
            <span style="font-weight:700;font-size:0.9rem;color:var(--text)">Wizard</span>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);line-height:1.5">Schritt für Schritt: Rolle, Tonalität, Kontext und Ausgabe-Format selbst definieren.</div>
        </button>
        <button onclick="_genSetMode('ai')" style="text-align:left;padding:16px;border-radius:12px;border:1px solid rgba(108,99,255,0.3);background:rgba(108,99,255,0.05);cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${icon('sparkles', 20, 'color:var(--accent)')}
            <span style="font-weight:700;font-size:0.9rem;color:var(--text)">KI-Assistent</span>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);line-height:1.5">Beschreibe kurz was der Prompt tun soll – Claude baut ihn vollständig für dich.</div>
        </button>
      </div>`;
    navEl.innerHTML = '';
  }

  // ── Wizard-Schritte ────────────────────────────────────────────────────────
  else if (s.mode === 'wizard') {

    if (s.step === 2) {
      html = `
        <div style="margin-bottom:14px">
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:5px">Name *</label>
          <input id="genName" type="text" placeholder="z.B. Team-Feedback-Analyse" value="${escHtml(s.name)}"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;outline:none;box-sizing:border-box">
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:5px">Kurzbeschreibung</label>
          <input id="genDesc" type="text" placeholder="Was macht dieser Prompt?" value="${escHtml(s.description)}"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:5px">Icon (Lucide-Name)</label>
          <input id="genIcon" type="text" placeholder="sparkles" value="${escHtml(s.icon)}"
            style="width:160px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;outline:none">
        </div>`;
    }

    else if (s.step === 3) {
      html = `
        <p style="font-size:0.78rem;color:var(--muted);margin:0 0 14px">Alle Felder optional – leer lassen wenn nicht nötig.</p>
        <div style="margin-bottom:12px">
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:4px">Rolle</label>
          <textarea id="genRolle" rows="2" placeholder="Du bist ein erfahrener Kommunikationscoach…"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.85rem;resize:vertical;box-sizing:border-box;font-family:inherit">${escHtml(s.rolle)}</textarea>
          <p style="font-size:0.68rem;color:var(--muted);margin:3px 0 0">→ Wird zu: „Du bist [Rolle]."</p>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:4px">Tonalität</label>
          <input id="genTon" type="text" placeholder="sachlich, direkt, in Du-Form…" value="${escHtml(s.tonalitaet)}"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.85rem;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);display:block;margin-bottom:4px">Grenzen</label>
          <textarea id="genGrenzen" rows="2" placeholder="Keine medizinischen Diagnosen. Nur aus dem Transkript ableiten."
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.85rem;resize:vertical;box-sizing:border-box;font-family:inherit">${escHtml(s.grenzen)}</textarea>
        </div>`;
    }

    else if (s.step === 4) {
      html = `
        <p style="font-size:0.78rem;color:var(--muted);margin:0 0 10px">Was soll dieser Prompt analysieren oder tun? Nutze <code style="background:var(--surface2);padding:1px 5px;border-radius:4px">{{transkript}}</code> als Platzhalter.</p>
        <textarea id="genKontext" rows="10" placeholder="Analysiere das folgende Transkript auf offene Fragen und ungelöste Konflikte.\n\n{{transkript}}\n\nAntworte NUR mit einem JSON-Objekt…"
          style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.84rem;resize:vertical;box-sizing:border-box;font-family:monospace;line-height:1.5">${escHtml(s.kontext)}</textarea>`;
    }

    else if (s.step === 5) {
      html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:8px">
          <p style="font-size:0.78rem;color:var(--muted);margin:0">Optional: Definiere strukturierte Ausgabe-Felder. Ohne Felder → Claude antwortet als Freitext.</p>
          <button onclick="showFieldTypeHelp()" style="background:none;border:1px solid var(--border);border-radius:20px;color:var(--muted);cursor:pointer;padding:3px 10px;font-size:0.75rem;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:4px" title="Alle Feldtypen anzeigen">
            ${icon('help-circle', 12)} Feldtypen
          </button>
        </div>
        <div id="genSchemaList">
          ${s.schema.map(f => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <input id="gfl_${f.id}" type="text" placeholder="Feldname (z.B. Kernpunkte)" value="${escHtml(f.label)}"
                style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.83rem;outline:none">
              <select id="gft_${f.id}" style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.83rem;outline:none">
                ${genFieldTypeDropdown(f.type)}
              </select>
              <button onclick="_genRemoveField('${f.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;flex-shrink:0" title="Entfernen">
                ${icon('x', 14)}
              </button>
            </div>`).join('')}
        </div>
        <button onclick="_genAddField()" class="btn btn-ghost" style="gap:6px;margin-top:4px">
          ${icon('plus', 13)} Feld hinzufügen
        </button>`;
    }

    else if (s.step === 6) {
      const validSchema = s.schema.filter(f => f.label);
      html = _buildGen6Form(s, validSchema);
    }
  }

  // ── KI-Modus ──────────────────────────────────────────────────────────────
  else if (s.mode === 'ai') {

    if (s.step === 2) {
      html = `
        <p style="font-size:0.85rem;color:var(--muted);margin:0 0 12px">Beschreibe kurz was dein Prompt analysieren oder tun soll. Claude erstellt den vollständigen Prompt für dich.</p>
        <textarea id="genAiDesc" rows="6" placeholder="Ich brauche einen Prompt der aus einem Gespräch alle offenen Fragen extrahiert und als Checkliste auflistet, damit ich nach dem Meeting sofort weiß was noch zu klären ist…"
          style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;resize:vertical;box-sizing:border-box;line-height:1.5">${escHtml(s.aiDesc)}</textarea>`;
    }

    else if (s.step === 6) {
      const validSchema = s.schema.filter(f => f.label);
      html = `
        <div style="padding:10px 12px;background:rgba(108,99,255,0.06);border-radius:8px;border:1px solid rgba(108,99,255,0.2);margin-bottom:14px;display:flex;align-items:center;gap:8px">
          ${icon('check-circle', 16, 'color:var(--accent)')}
          <span style="font-size:0.83rem;color:var(--accent);font-weight:600">Claude hat „${escHtml(s.name)}" erstellt – prüfe und passe an</span>
        </div>
        ${_buildGen6Form(s, validSchema)}`;
    }
  }

  contentEl.innerHTML = html;

  // Navigation
  const isFirst = s.step === 1;
  const isLast  = s.step === 6;
  const isAiGen = s.mode === 'ai' && s.step === 2;

  let navHtml = '';
  navHtml += isFirst
    ? '<div></div>'
    : `<button class="btn btn-ghost" onclick="_genBack()" style="gap:6px">${icon('arrow-left', 13)} Zurück</button>`;

  if (!isFirst) {
    const label = isLast  ? `${icon('check', 13)} Speichern`
                : isAiGen ? `${icon('sparkles', 13)} Generieren`
                :           `Weiter ${icon('arrow-right', 13)}`;
    navHtml += `<button class="btn btn-primary" onclick="_genNext()" style="gap:6px">${label}</button>`;
  }
  navEl.innerHTML = navHtml;

  if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('promptGeneratorModal')] });
}

// ── Migration beim Seitenstart ausführen (v5.22) ─────────────────────────────
// Nur einmalig – wenn userPrompts noch nicht existiert, werden alte Schlüssel übernommen
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', migrateToUserPrompts);
} else {
  migrateToUserPrompts();
}

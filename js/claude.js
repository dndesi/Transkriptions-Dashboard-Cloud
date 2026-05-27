// CLAUDE ANALYSE
// ═══════════════════════════════════════════════════

async function callClaudeAPI(prompt) {
  if (!anthropicKey) throw new Error('Kein Anthropic API-Key gesetzt. Bitte unter 🔑 API-Keys eintragen.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || JSON.stringify(err) || `HTTP ${res.status}`;
    console.error('Anthropic API Fehler:', res.status, msg);
    throw new Error(`Anthropic HTTP ${res.status}: ${msg}`);
  }
  const data = await res.json();
  // Token-Nutzung zurückgeben für Kostentracking
  return {
    text: data.content[0].text.trim(),
    inputTokens:  data.usage?.input_tokens  || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

// Hilfsfunktion: Token-Nutzung zur Session addieren
// Jeder API-Call bekommt einen eigenen Eintrag mit Zeitstempel im claudeCostLog.
// So können Kosten, die an verschiedenen Tagen entstehen, korrekt dem jeweiligen Monat zugeordnet werden.
function addTokensToSession(session, inputTokens, outputTokens) {
  // Neues Format: Log-Array (ein Eintrag pro API-Call)
  if (!session.claudeCostLog) session.claudeCostLog = [];
  session.claudeCostLog.push({
    date:   new Date().toISOString(),
    input:  inputTokens,
    output: outputTokens,
  });
  // Legacy-Felder beibehalten (Abwärtskompatibilität mit bestehenden Sitzungen)
  if (!session.claudeTokens) session.claudeTokens = { input: 0, output: 0 };
  session.claudeTokens.input  += inputTokens;
  session.claudeTokens.output += outputTokens;
  session.claudeLastCallAt = new Date().toISOString();
}

// ── Beziehungskontext ──────────────────────────────────────────────────────
function loadRelationships() {
  try { return JSON.parse(localStorage.getItem('personRelationships') || '{}'); } catch { return {}; }
}
function saveRelationship(name, context) {
  const rels = loadRelationships();
  const trimmed = context.trim();
  if (trimmed) rels[name] = trimmed; else delete rels[name];
  localStorage.setItem('personRelationships', JSON.stringify(rels));
  showToast(`Beziehung gespeichert`, 'ok');
}
function getRelationship(name) {
  return loadRelationships()[name] || '';
}

// ── Anonymisierung (immer aktiv – kein Opt-in) ────────────────────────────
// Baut bidirektionale Name↔Label Maps: Person_A = speakerA, Person_B = speakerB, …
const _ANON_DEFAULTS = new Set(['ich', 'sprecher a', 'sprecher b', 'gesprächspartner', 'unbekannt', '']);

function buildAnonMap(session) {
  const forward = {};  // realName → Person_X
  const reverse = {};  // Person_X → realName
  let idx = 0;
  const add = (name) => {
    if (!name || !name.trim()) return;
    const t = name.trim();
    if (_ANON_DEFAULTS.has(t.toLowerCase())) return;
    if (forward[t]) return;
    const label = `Person_${String.fromCharCode(65 + idx++)}`;
    forward[t] = label;
    reverse[label] = t;
  };
  // Reihenfolge: speakerA → A, speakerB → B, dann weitere Personen
  add(session.speakerA);
  add(session.speakerB);
  (session.persons || []).forEach(p => add(p));
  return { forward, reverse };
}

function anonymizeText(text, forwardMap) {
  if (!text || typeof text !== 'string' || !Object.keys(forwardMap).length) return text;
  // Längste Namen zuerst → verhindert Teilersetzung
  const sorted = Object.keys(forwardMap).sort((a, b) => b.length - a.length);
  let r = text;
  sorted.forEach(name => {
    r = r.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), forwardMap[name]);
  });
  return r;
}

function deanonymizeText(text, reverseMap) {
  if (!text || typeof text !== 'string' || !Object.keys(reverseMap).length) return text;
  let r = text;
  Object.entries(reverseMap).forEach(([label, real]) => {
    r = r.replace(new RegExp(label, 'g'), real);
  });
  return r;
}

function deanonymizeObject(obj, reverseMap) {
  if (!reverseMap || !Object.keys(reverseMap).length) return obj;
  if (typeof obj === 'string') return deanonymizeText(obj, reverseMap);
  if (Array.isArray(obj)) return obj.map(item => deanonymizeObject(item, reverseMap));
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = deanonymizeObject(v, reverseMap);
    return out;
  }
  return obj;
}

// Legacy-Wrapper für verbleibende externe Aufrufe
function anonymizeForClaude(text, session) {
  const { forward } = buildAnonMap(session);
  return anonymizeText(text, forward);
}

function buildTranscriptText(session) {
  if (!session.utterances?.length) return '';
  return session.utterances.map(u => {
    const name = getSpeakerName(u.speaker, session);
    return `[${formatMs(u.start)}] ${name}: ${u.text}`;
  }).join('\n');
}

function openAnalyseModal() {
  document.getElementById('analyseModalError').style.display = 'none';
  document.getElementById('analyseChecks').style.display = 'block';
  document.getElementById('analyseLoadingArea').style.display = 'none';
  document.getElementById('analyseCancelBtn').disabled = false;
  document.getElementById('analyseStartBtn').style.display = '';

  // Kontextbasierte Checkboxen ein-/ausblenden
  const s = getSession();
  const isWork = s?.type === 'arbeit';
  const workChecks    = document.getElementById('workChecks');
  const privateChecks = document.getElementById('privateChecks');
  if (workChecks)    workChecks.style.display    = isWork ? 'block' : 'none';
  if (privateChecks) privateChecks.style.display = isWork ? 'none'  : 'block';

  document.getElementById('analyseModal').classList.add('open');
}
function closeAnalyseModal() {
  document.getElementById('analyseModal').classList.remove('open');
}

function showAnalyseError(msg) {
  const el = document.getElementById('analyseModalError');
  if (el) { el.innerHTML = icon('alert-triangle',13,'color:var(--red);margin-right:5px;vertical-align:middle') + ' ' + escHtml(msg); el.style.display = 'block'; }
}

async function runAnalysisFromModal() {
  const types = [];
  if (document.getElementById('chkWork')?.checked)      types.push('work');
  if (document.getElementById('chkPrivate')?.checked)   types.push('private');
  if (document.getElementById('chkSentiment')?.checked) types.push('sentiment');
  if (document.getElementById('chkChapters')?.checked)  types.push('chapters');
  if (document.getElementById('chkTopics')?.checked)    types.push('topics');
  if (document.getElementById('chk360')?.checked)       types.push('360');

  if (!types.length) { showAnalyseError('Bitte mindestens eine Option wählen.'); return; }
  if (!anthropicKey) { showAnalyseError('Kein Anthropic API-Key gesetzt — bitte unter 🔑 eintragen.'); return; }
  const s = getSession();
  if (!s) { showAnalyseError('Kein Transkript aktiv — bitte erst ein Gespräch öffnen.'); return; }
  if (!s.utterances?.length) { showAnalyseError('Keine Sprecherabschnitte vorhanden.'); return; }

  // ── Lade-Zustand einschalten ──────────────────────
  document.getElementById('analyseChecks').style.display = 'none';
  document.getElementById('analyseModalError').style.display = 'none';
  document.getElementById('analyseLoadingArea').style.display = 'block';
  document.getElementById('analyseCancelBtn').disabled = true;
  document.getElementById('analyseStartBtn').style.display = 'none';

  const loadingText  = document.getElementById('analyseLoadingText');
  const loadingSteps = document.getElementById('analyseLoadingSteps');
  const stepLabels   = { work: icon('briefcase',12)+' Arbeits-Analyse', private: icon('message-circle',12)+' Gesprächs-Analyse', sentiment: icon('smile',12)+' Stimmungsanalyse', chapters: icon('book-open',12)+' Kapitel', topics: icon('tag',12)+' Themen', '360': icon('refresh-cw',12)+' 360°-Analyse' };
  const stepsDone    = [];

  function setStep(type) {
    loadingText.innerHTML = stepLabels[type] + ' wird analysiert…';
    loadingSteps.innerHTML  = types.map(t =>
      stepsDone.includes(t) ? `<span style="color:var(--green);display:flex;align-items:center;gap:5px">${icon('check',12)} ${stepLabels[t]}</span>` :
      t === type             ? `<span style="color:var(--accent);display:flex;align-items:center;gap:5px">${icon('loader',12)} ${stepLabels[t]}</span>` :
                               `<span style="opacity:0.4;display:flex;align-items:center;gap:5px">${icon('chevron-right',12)} ${stepLabels[t]}</span>`
    ).join('');
  }

  try {
    const transcript = buildTranscriptText(s);
    for (const type of types) {
      setStep(type);
      if (type === 'work')      await analyseWork(s, transcript);
      if (type === 'private')   await analysePrivate(s, transcript);
      if (type === 'sentiment') await analyseSentiment(s, transcript);
      if (type === 'chapters')  await analyseChapters(s, transcript);
      if (type === 'topics')    await analyseTopics(s, transcript);
      if (type === '360')       await analyse360(s, transcript);
      stepsDone.push(type);
    }
    saveSessions();
    await saveToArchive(s);
    renderInsights(s);
    if (typeof render360Block === 'function') render360Block(s);
    closeAnalyseModal();
    showToast('Analyse abgeschlossen', 'success');
  } catch (e) {
    console.error('Analyse-Fehler:', e);
    // Zurück in den Auswahl-Zustand, Fehler anzeigen
    document.getElementById('analyseChecks').style.display = 'block';
    document.getElementById('analyseLoadingArea').style.display = 'none';
    document.getElementById('analyseCancelBtn').disabled = false;
    document.getElementById('analyseStartBtn').style.display = '';
    showAnalyseError(e.message || 'Unbekannter Fehler bei der Analyse.');
  }
}

function runAnalysisFromChecks() {
  const errEl = document.getElementById('analyseModalError');
  if (errEl) errEl.style.display = 'none';

  const types = [];
  if (document.getElementById('chkWork')?.checked)      types.push('work');
  if (document.getElementById('chkPrivate')?.checked)   types.push('private');
  if (document.getElementById('chkSentiment')?.checked) types.push('sentiment');
  if (document.getElementById('chkChapters')?.checked)  types.push('chapters');
  if (document.getElementById('chkTopics')?.checked)    types.push('topics');
  if (document.getElementById('chk360')?.checked)       types.push('360');

  console.log('[Analyse] Gewählte Typen:', types, '| anthropicKey gesetzt:', !!anthropicKey, '| Session:', currentSessionId);

  if (!types.length) { showAnalyseError('Bitte mindestens eine Option anhaken.'); return; }
  if (!anthropicKey) { showAnalyseError('Kein Anthropic API-Key gesetzt — bitte oben rechts unter 🔑 eintragen.'); return; }
  const s = getSession();
  if (!s) { showAnalyseError('Kein Transkript aktiv — bitte erst ein Gespräch öffnen.'); return; }
  if (!s.utterances?.length) { showAnalyseError('Keine Sprecherabschnitte vorhanden.'); return; }

  runAnalysis(types);
}

async function runAnalysis(types) {
  if (!Array.isArray(types)) types = [types];
  console.log('[runAnalysis] Start, types:', types);
  const s = getSession();
  console.log('[runAnalysis] Session:', s?.id, 'utterances:', s?.utterances?.length);
  if (!s) { showToast('Fehler: Kein Transkript gefunden', 'error'); return; }
  if (!s.utterances?.length) { showToast('Fehler: Keine Sprecherabschnitte', 'error'); return; }

  const btn = document.getElementById('analyseBtn');
  const origHTML = btn.innerHTML;
  btn.innerHTML = icon('loader',12,'margin-right:5px') + ' Analysiere…';
  btn.disabled = true;

  try {
    const transcript = buildTranscriptText(s);
    if (types.includes('work'))      await analyseWork(s, transcript);
    if (types.includes('private'))   await analysePrivate(s, transcript);
    if (types.includes('sentiment')) await analyseSentiment(s, transcript);
    if (types.includes('chapters'))  await analyseChapters(s, transcript);
    if (types.includes('topics'))    await analyseTopics(s, transcript);
    if (types.includes('360'))       await analyse360(s, transcript);
    saveSessions();
    await saveToArchive(s);
    renderInsights(s);
    if (typeof render360Block === 'function') render360Block(s);
    showToast('Analyse abgeschlossen', 'success');
  } catch (e) {
    console.error('Analyse-Fehler:', e);
    showToast((e.message || 'Unbekannter Fehler'), 'error');
  } finally {
    btn.innerHTML = origHTML;
    btn.disabled = false;
  }
}

async function analysePrivate(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const isThoughts = session.type === 'gedanken';
  const speakerA   = session.speakerA || 'Ich';
  const speakerB   = session.speakerB || 'Gesprächspartner';
  const persons    = (session.persons || []).join(', ') || 'nicht angegeben';
  const relContext = speakerB && speakerB !== 'Gesprächspartner' ? getRelationship(speakerB) : '';
  const trimmed    = trimTranscript(transcript, 9000);

  let prompt;
  if (isThoughts) {
    prompt = `Du bist ein einfühlsamer, psychologisch geschulter Gesprächsanalyst. Analysiere die folgenden eigenen Gedanken und Reflexionen auf Deutsch mit echtem Tiefgang – nicht oberflächlich, sondern so wie ein guter Therapeut oder Supervisor zuhören würde.

Inhalt:
${trimmed}

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
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`;
  } else {
    const relLine = relContext ? `\nBeziehungskontext: ${speakerB} ist ${relContext}.` : '';
    prompt = `Du bist ein einfühlsamer, psychologisch geschulter Gesprächsanalyst. Analysiere das folgende private Gespräch auf Deutsch mit echtem Tiefgang – nicht oberflächlich, sondern so wie ein guter Therapeut oder Supervisor zuhören würde.
Beteiligte: ${speakerA} und ${speakerB}. Weitere Personen: ${persons}.${relLine}

Transkript:
${trimmed}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "agreements": [
    "Was konkret vereinbart, ausgemacht oder fest geplant wurde – nur echte Vereinbarungen, keine Absichtserklärungen"
  ],
  "wishes": [
    {
      "person": "Name der Person (${speakerA} oder ${speakerB})",
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
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`;
  }

  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const json = deanonymizeObject(JSON.parse(extractJSON(text, '{')), reverse);
  session.privateAnalysis = {
    agreements:    Array.isArray(json.agreements)  ? json.agreements  : [],
    wishes:        Array.isArray(json.wishes)       ? json.wishes      : [],
    openTopics:    Array.isArray(json.openTopics)   ? json.openTopics  : [],
    dynamics:      json.dynamics      || '',
    zwischenzeilen:json.zwischenzeilen|| '',
    keyThoughts:   Array.isArray(json.keyThoughts)  ? json.keyThoughts : [],
    nextSteps:     Array.isArray(json.nextSteps)    ? json.nextSteps   : [],
    summary:       json.summary       || '',
  };
}

async function analyseWork(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const persons  = (session.persons || []).join(', ') || 'nicht angegeben';
  const speakerA = session.speakerA || 'Sprecher A';
  const speakerB = session.speakerB || 'Sprecher B';

  const prompt = `Du bist ein erfahrener Business-Coach und Kommunikationsanalyst. Analysiere das folgende Arbeitsgespräch auf Deutsch – präzise, klar und mit Blick für das, was auch zwischen den Zeilen geschieht.
Beteiligte: ${speakerA} und ${speakerB}. Weitere Personen: ${persons}.

Transkript:
${trimTranscript(transcript, 9000)}

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
Wenn es keine Einträge für eine Kategorie gibt, gib ein leeres Array [] zurück.`;

  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const json = deanonymizeObject(JSON.parse(extractJSON(text, '{')), reverse);
  session.workAnalysis = {
    tasks:          Array.isArray(json.tasks)         ? json.tasks         : [],
    decisions:      Array.isArray(json.decisions)     ? json.decisions     : [],
    openQuestions:  Array.isArray(json.openQuestions) ? json.openQuestions : [],
    risks:          Array.isArray(json.risks)         ? json.risks         : [],
    zwischenzeilen: json.zwischenzeilen || '',
    summary:        json.summary || '',
  };
}

async function analyseSentiment(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || 'Sprecher A';
  const speakerB = session.speakerB || 'Sprecher B';
  const prompt = `Analysiere die Stimmung der Sprecher in diesem deutschen Gesprächstranskript.
Sprecher A heißt "${speakerA}", Sprecher B heißt "${speakerB}".

Transkript:
${trimTranscript(transcript, 9000)}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "speakers": [
    {
      "speaker": "A",
      "name": "${speakerA}",
      "overall": "kurze Beschreibung der Grundstimmung (2-4 Wörter, auf Deutsch)",
      "trend": "positiv|neutral|kritisch",
      "posP": 0-100,
      "neuP": 0-100,
      "negP": 0-100,
      "highlight": "Ein typischer oder markanter Satz dieser Person (auf Deutsch)"
    }
  ],
  "summary": "1-2 Sätze zur Gesprächsdynamik (auf Deutsch)"
}`;
  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const json = deanonymizeObject(JSON.parse(extractJSON(text, '{')), reverse);
  session.claudeSentiment = json;
}

async function analyseChapters(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const prompt = `Erstelle eine Kapitelübersicht für dieses deutsche Gesprächstranskript.
Die Zeitangaben im Format [MM:SS] stehen am Anfang jeder Zeile.

Transkript:
${trimTranscript(transcript, 7000)}

Antworte NUR mit einem JSON-Array (kein Markdown, keine Erklärungen):
[
  {
    "title": "Kurzer Kapiteltitel auf Deutsch (3-6 Wörter)",
    "summary": "1-2 Sätze Zusammenfassung auf Deutsch",
    "timestamp": "MM:SS aus dem Transkript wo das Kapitel beginnt"
  }
]`;
  const { text: chapText, inputTokens: chapIn, outputTokens: chapOut } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, chapIn, chapOut);
  const json = deanonymizeObject(JSON.parse(extractJSON(chapText, '[')), reverse);
  session.claudeChapters = json;
}

async function analyseTopics(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const trimmed = trimTranscript(transcript, 7000);
  const prompt = `Erkenne die Hauptthemen in diesem deutschen Gesprächstranskript.

Transkript:
${trimmed}

Antworte NUR mit einem JSON-Array aus kurzen Themen-Tags auf Deutsch (max. 10 Tags):
["Thema 1", "Thema 2", ...]`;
  const { text: topText, inputTokens: topIn, outputTokens: topOut } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, topIn, topOut);
  const json = JSON.parse(extractJSON(topText, '['));
  session.claudeTopics = Array.isArray(json)
    ? json.map(t => ({ text: String(t), status: 'default' }))
    : [];
}

// Hilfsfunktion: extrahiert den ersten vollständigen JSON-Block aus einer Claude-Antwort
function extractJSON(text, startChar) {
  const endChar = startChar === '[' ? ']' : '}';
  const start = text.indexOf(startChar);
  if (start === -1) throw new Error('Kein JSON in der Antwort gefunden.');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    // Tiefe für alle öffnenden Klammern erhöhen
    if (c === '[' || c === '{') depth++;
    // Tiefe für alle schließenden Klammern verringern
    if (c === ']' || c === '}') {
      depth--;
      // Wenn wir wieder auf 0 sind und der erwartete End-Char passt: fertig
      if (depth === 0 && c === endChar) return text.slice(start, i + 1);
    }
  }
  // Falls nicht vollständig abgeschlossen: gib alles vom Start zurück und lass JSON.parse den Fehler werfen
  return text.slice(start);
}

// Hilfsfunktion: kürzt Transkript auf maxChars Zeichen, bricht an Zeilengrenzen
function trimTranscript(transcript, maxChars) {
  if (transcript.length <= maxChars) return transcript;
  const cut = transcript.lastIndexOf('\n', maxChars);
  const pos = cut > 0 ? cut : maxChars;
  return transcript.slice(0, pos) + '\n[… Transkript gekürzt]';
}

// ═══════════════════════════════════════════════════
// INSIGHTS: Stimmung / Kapitel / Themen
// ═══════════════════════════════════════════════════
function toggleInsightsBlock(blockId) {
  const block = document.getElementById(blockId);
  if (block) block.classList.toggle('collapsed');
}

function renderInsights(session) {
  const section = document.getElementById('insightsSection');
  let anyVisible = false;

  // ── Private-Analyse ──────────────────────────────
  const privateBlock   = document.getElementById('privateBlock');
  const privateContent = document.getElementById('privateContent');
  const pa = session.privateAnalysis;

  if (pa && (pa.summary || pa.agreements?.length || pa.wishes?.length || pa.openTopics?.length || pa.dynamics || pa.keyThoughts?.length || pa.nextSteps?.length)) {
    let html = '';

    if (pa.summary) {
      html += `<div class="work-section">
        <div class="work-section-title">Zusammenfassung</div>
        <div class="work-summary">${escHtml(pa.summary)}</div>
      </div>`;
    }

    if (pa.dynamics) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('message-circle',13,'margin-right:5px')} Gesprächsdynamik</div>
        <div class="private-dynamics">${escHtml(pa.dynamics)}</div>
      </div>`;
    }

    if (pa.zwischenzeilen) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('search',13,'margin-right:5px')} Zwischen den Zeilen</div>
        <div class="private-dynamics" style="border-left:3px solid var(--accent2); padding-left:12px; font-style:italic">${escHtml(pa.zwischenzeilen)}</div>
      </div>`;
    }

    const sid = session.id;
    const delBtn = (aKey, field, i) =>
      `<button class="work-item-del" title="Eintrag löschen"
        onclick="deleteAnalysisItem('${sid}','${aKey}','${field}',${i})">${icon('trash-2',12)}</button>`;

    if (pa.agreements?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Vereinbarungen</div>`;
      pa.agreements.forEach((a, i) => {
        html += `<div class="work-item"><span>${icon('check',11,'color:var(--green)')}</span><div class="work-item-content">${escHtml(a)}</div>${delBtn('privateAnalysis','agreements',i)}</div>`;
      });
      html += `</div>`;
    }

    if (pa.wishes?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('target',13,'margin-right:5px')} Wünsche & Bedürfnisse</div>`;
      pa.wishes.forEach((w, i) => {
        const pName = typeof w === 'object' ? w.person : '';
        const wish  = typeof w === 'object' ? w.wish   : w;
        html += `<div class="work-item">
          <span>${icon('message-square',11)}</span>
          <div class="work-item-content">
            ${pName ? `<div style="font-size:0.72rem; color:var(--muted); font-weight:700; margin-bottom:2px">${escHtml(pName)}</div>` : ''}
            <div>${escHtml(wish)}</div>
          </div>
          ${delBtn('privateAnalysis','wishes',i)}
        </div>`;
      });
      html += `</div>`;
    }

    if (pa.openTopics?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('clock',13,'margin-right:5px')} Offene Themen</div>`;
      pa.openTopics.forEach((t, i) => {
        html += `<div class="work-item"><span>○</span><div class="work-item-content">${escHtml(t)}</div>${delBtn('privateAnalysis','openTopics',i)}</div>`;
      });
      html += `</div>`;
    }

    if (pa.keyThoughts?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('lightbulb',13,'margin-right:5px')} Kerngedanken</div>`;
      pa.keyThoughts.forEach((t, i) => {
        html += `<div class="work-item"><span>→</span><div class="work-item-content">${escHtml(t)}</div>${delBtn('privateAnalysis','keyThoughts',i)}</div>`;
      });
      html += `</div>`;
    }

    if (pa.nextSteps?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('arrow-right',13,'margin-right:5px')} Nächste Schritte</div>`;
      pa.nextSteps.forEach((t, i) => {
        html += `<div class="work-item"><span>${icon('square',11,'opacity:0.5')}</span><div class="work-item-content">${escHtml(t)}</div>${delBtn('privateAnalysis','nextSteps',i)}</div>`;
      });
      html += `</div>`;
    }

    privateContent.innerHTML = html;
    privateBlock.style.display = 'block';
    anyVisible = true;
  } else {
    privateBlock.style.display = 'none';
  }

  // ── Arbeits-Analyse ───────────────────────────────
  const workBlock   = document.getElementById('workBlock');
  const workContent = document.getElementById('workContent');
  const wa = session.workAnalysis;

  if (wa && (wa.tasks?.length || wa.decisions?.length || wa.openQuestions?.length || wa.risks?.length || wa.summary)) {
    let html = '';

    if (wa.summary) {
      html += `<div class="work-section">
        <div class="work-section-title">Zusammenfassung</div>
        <div class="work-summary">${escHtml(wa.summary)}</div>
      </div>`;
    }

    const wSid = session.id;
    const wDel = (field, i) =>
      `<button class="work-item-del" title="Eintrag löschen"
        onclick="deleteAnalysisItem('${wSid}','workAnalysis','${field}',${i})">${icon('trash-2',12)}</button>`;

    if (wa.tasks?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Aufgaben (${wa.tasks.length})</div>`;
      wa.tasks.forEach((t, i) => {
        const prioClass = t.priority === 'hoch' ? 'work-prio-hoch' : t.priority === 'niedrig' ? 'work-prio-niedrig' : 'work-prio-mittel';
        html += `<div class="work-item">
          <span>${icon('square',11,'opacity:0.5')}</span>
          <div class="work-item-content">
            <div>${escHtml(t.task)}</div>
            <div class="work-item-meta">
              ${t.person ? `${icon('user',11,'margin-right:3px')}${escHtml(t.person)}` : ''}
              ${t.deadline ? ` · ${icon('calendar',11,'margin-right:3px')}${escHtml(t.deadline)}` : ''}
              ${t.priority ? ` · <span class="${prioClass}">${escHtml(t.priority)}</span>` : ''}
            </div>
          </div>
          ${wDel('tasks',i)}
        </div>`;
      });
      html += `</div>`;
    }

    if (wa.decisions?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('clipboard',13,'margin-right:5px')} Entscheidungen</div>`;
      wa.decisions.forEach((d, i) => {
        html += `<div class="work-item"><span>${icon('check',11,'color:var(--green)')}</span><div class="work-item-content">${escHtml(d)}</div>${wDel('decisions',i)}</div>`;
      });
      html += `</div>`;
    }

    if (wa.openQuestions?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-circle',13,'margin-right:5px')} Offene Fragen</div>`;
      wa.openQuestions.forEach((q, i) => {
        html += `<div class="work-item"><span>?</span><div class="work-item-content">${escHtml(q)}</div>${wDel('openQuestions',i)}</div>`;
      });
      html += `</div>`;
    }

    if (wa.risks?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-triangle',13,'margin-right:5px')} Risiken</div>`;
      wa.risks.forEach((r, i) => {
        html += `<div class="work-item"><span>${icon('alert-triangle',11,'color:var(--yellow)')}</span><div class="work-item-content">${escHtml(r)}</div>${wDel('risks',i)}</div>`;
      });
      html += `</div>`;
    }

    if (wa.zwischenzeilen) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('search',13,'margin-right:5px')} Zwischen den Zeilen</div>
        <div class="private-dynamics" style="border-left:3px solid var(--accent2); padding-left:12px; font-style:italic">${escHtml(wa.zwischenzeilen)}</div>
      </div>`;
    }

    workContent.innerHTML = html;
    workBlock.style.display = 'block';
    anyVisible = true;
  } else {
    workBlock.style.display = 'none';
  }

  // ── Stimmungsanalyse (Claude) ─────────────────────
  const sentBlock = document.getElementById('sentimentBlock');
  const sentContent = document.getElementById('sentimentContent');
  const cs = session.claudeSentiment;

  if (cs?.speakers?.length) {
    let html = '';
    cs.speakers.forEach(sp => {
      const color = getSpeakerColor(sp.speaker);
      const posP = Math.max(0, Math.min(100, sp.posP || 0));
      const negP = Math.max(0, Math.min(100, sp.negP || 0));
      const neuP = Math.max(0, Math.min(100, 100 - posP - negP));
      const trendIcon = sp.trend === 'positiv' ? icon('smile',12,'color:var(--green)') : sp.trend === 'kritisch' ? icon('alert-circle',12,'color:var(--red)') : icon('check',12,'opacity:0.5');
      html += `
        <div class="sentiment-speaker-row">
          <span class="sentiment-speaker-name" style="color:${color}">${escHtml(sp.name || sp.speaker)}</span>
          <div class="sentiment-bar-wrap" title="${posP}% positiv · ${neuP}% neutral · ${negP}% kritisch">
            <div class="sentiment-bar-pos" style="width:${posP}%"></div>
            <div class="sentiment-bar-neu" style="width:${neuP}%"></div>
            <div class="sentiment-bar-neg" style="width:${negP}%"></div>
          </div>
          <span class="sentiment-label">${trendIcon} ${escHtml(sp.overall || '')}</span>
        </div>
        ${sp.highlight ? `<div style="font-size:0.75rem; color:var(--muted); margin:-2px 0 8px 120px; font-style:italic;">"${escHtml(sp.highlight)}"</div>` : ''}`;
    });
    if (cs.summary) html += `<div style="font-size:0.8rem; color:var(--muted); margin-top:8px; line-height:1.4; border-top:1px solid var(--border); padding-top:8px">${escHtml(cs.summary)}</div>`;
    html += `<div class="sentiment-legend">${icon('check-circle',11,'color:var(--green);margin-right:3px')} positiv &nbsp;${icon('check',11,'opacity:0.5;margin-right:3px')} neutral &nbsp;${icon('alert-circle',11,'color:var(--red);margin-right:3px')} kritisch</div>`;
    sentContent.innerHTML = html;
    sentBlock.style.display = 'block';
    anyVisible = true;
  } else {
    sentBlock.style.display = 'none';
  }

  // ── Kapitel (Claude) ──────────────────────────────
  const chapBlock = document.getElementById('chaptersBlock');
  const chapContent = document.getElementById('chaptersContent');
  const chapters = session.claudeChapters || [];

  if (chapters.length > 0) {
    chapContent.innerHTML = chapters.map(ch => {
      const tsMs = ch.timestamp ? (() => {
        const parts = ch.timestamp.split(':').map(Number);
        return parts.length === 2 ? (parts[0]*60 + parts[1]) * 1000
             : parts.length === 3 ? (parts[0]*3600 + parts[1]*60 + parts[2]) * 1000 : 0;
      })() : 0;
      return `
        <div class="chapter-item" onclick="seekAudio(${tsMs})">
          <div class="chapter-headline">${escHtml(ch.title || '')}</div>
          <div class="chapter-summary">${escHtml(ch.summary || '')}</div>
          ${ch.timestamp ? `<div class="chapter-time">▶ ${escHtml(ch.timestamp)}</div>` : ''}
        </div>`;
    }).join('');
    chapBlock.style.display = 'block';
    anyVisible = true;
  } else {
    chapBlock.style.display = 'none';
  }

  // ── Themen (Claude) ───────────────────────────────
  const topicsBlock = document.getElementById('topicsBlock');
  const topicsContent = document.getElementById('topicsContent');

  // Normalisierung: alte string[] → {text,status}[]
  if (session.claudeTopics?.length && typeof session.claudeTopics[0] === 'string') {
    session.claudeTopics = session.claudeTopics.map(t => ({ text: t, status: 'default' }));
    saveSessions();
  }
  const topics = session.claudeTopics || [];

  if (topics.length > 0) {
    const tSid = session.id;
    topicsContent.innerHTML = `<div>${topics.map((t, i) => {
      const txt = typeof t === 'object' ? t.text : t;
      return `<span class="topic-chip">
        ${escHtml(txt)}
        <button class="topic-chip-btn" title="Thema löschen"
          onclick="deleteTopic('${tSid}',${i})" style="color:var(--red)">${icon('trash-2',10)}</button>
      </span>`;
    }).join('')}</div>`;
    topicsBlock.style.display = 'block';
    anyVisible = true;
  } else {
    topicsBlock.style.display = 'none';
  }

  section.style.display = anyVisible ? 'block' : 'none';
}

function showTranscript(session) {
  document.getElementById('browserView').classList.remove('visible');
  const card = document.getElementById('transcriptCard');
  card.classList.add('visible');

  document.getElementById('transcriptTitle').textContent = session.label;
  const dur = session.duration ? ` · ${formatDuration(session.duration)}` : '';
  document.getElementById('transcriptMeta').textContent =
    `${session.filename}${dur} · ${new Date(session.date).toLocaleString('de-DE')}`;

  // Namensfelder befüllen
  document.getElementById('editSpeakerA').value = session.speakerA || 'Sprecher A';
  document.getElementById('editSpeakerB').value = session.speakerB || 'Sprecher B';

  // Tags & Notizen
  renderTagChips(session);
  const notesEl = document.getElementById('notesArea');
  if (notesEl) notesEl.value = session.notes || '';

  renderInsights(session);
  loadAudioForSession(session);
  renderUtterances(session);
}

function renderUtterances(session) {
  const container = document.getElementById('utterancesContainer');
  container.innerHTML = '';

  if (!session.utterances || session.utterances.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); font-size:0.85rem">Keine Sprecherabschnitte gefunden.</p>';
    return;
  }

  session.utterances.forEach((u, idx) => {
    const isA = u.speaker === 'A';
    const name  = getSpeakerName(u.speaker, session);
    const color = getSpeakerColor(u.speaker);
    const otherSpeaker = isA ? 'B' : 'A';
    const otherName = getSpeakerName(otherSpeaker, session);

    const div = document.createElement('div');
    div.className = 'utterance';
    div.dataset.start = u.start;
    div.dataset.end = u.end;
    div.innerHTML = `
      <div class="utterance-speaker" title="Klicken um zu &quot;${escHtml(otherName)}&quot; zu wechseln"
           style="cursor:pointer; user-select:none;"
           onclick="toggleUtteranceSpeaker(${idx})">
        <span class="utterance-speaker-dot" style="background:${color}"></span>
        <span style="color:${color}">${escHtml(name)}</span>
        <span style="font-size:0.65rem; color:var(--muted); margin-left:2px">⇄</span>
      </div>
      <div class="utterance-body">
        <div class="utterance-text">${escHtml(u.text)}</div>
        <div class="utterance-time" title="Zur Stelle springen" onclick="seekAudio(${u.start})">${formatMs(u.start)} – ${formatMs(u.end)} ▶</div>
      </div>
    `;
    container.appendChild(div);
  });

  currentSessionId = session.id;
}

// ═══════════════════════════════════════════════════

// SPRECHER KORREKTUR
// ═══════════════════════════════════════════════════
function renameSpeaker(speaker, newName) {
  const s = getSession();
  if (!s || !newName.trim()) return;
  if (speaker === 'A') s.speakerA = newName.trim();
  else s.speakerB = newName.trim();
  saveSessions();
  saveToArchive(s);
  // Nur Utterances neu rendern, nicht die Inputs (die hat der User gerade editiert)
  renderUtterances(s);
  showToast(`Sprecher ${speaker} → „${newName.trim()}" ✓`, 'success');
}

function swapAllSpeakers() {
  const s = getSession();
  if (!s || !s.utterances) return;
  // Nur Namen tauschen – die Farb-/Label-Zuordnung bleibt gleich,
  // aber der Name der pink markierten Person wechselt zur blauen und umgekehrt.
  const tmp = s.speakerA; s.speakerA = s.speakerB; s.speakerB = tmp;
  saveSessions();
  saveToArchive(s);
  // Namensfelder oben aktualisieren
  const elA = document.getElementById('editSpeakerA');
  const elB = document.getElementById('editSpeakerB');
  if (elA) elA.value = s.speakerA || 'Sprecher A';
  if (elB) elB.value = s.speakerB || 'Sprecher B';
  // Transkript neu rendern (Namen haben sich geändert)
  renderUtterances(s);
  showToast('Sprecher A ↔ B getauscht', 'success');
}

function toggleUtteranceSpeaker(idx) {
  const s = getSession();
  if (!s || !s.utterances[idx]) return;
  s.utterances[idx].speaker = s.utterances[idx].speaker === 'A' ? 'B' : 'A';
  saveSessions();
  saveToArchive(s); // Archiv aktualisieren
  showTranscript(s);
}

// ═══════════════════════════════════════════════════
// CLAUDE EXPORT
// ═══════════════════════════════════════════════════
function getSession() {
  return sessions.find(s => s.id === currentSessionId);
}

function buildTranscriptText(session) {
  if (!session || !session.utterances) return '';
  const lines = session.utterances.map(u => {
    const name = getSpeakerName(u.speaker, session);
    return `[${formatMs(u.start)}] ${name}: ${u.text}`;
  });
  return lines.join('\n');
}

function openClaudeModal() {
  const s = getSession();
  if (!s) return;
  const text = `TRANSKRIPT: ${s.label}
Datum: ${new Date(s.date).toLocaleString('de-DE')}
Datei: ${s.filename}
Sprecher A = ${s.speakerA} | Sprecher B = ${s.speakerB}

---

${buildTranscriptText(s)}`;
  document.getElementById('claudePromptText').textContent = text;
  document.getElementById('claudeModal').classList.add('open');
}
function closeClaudeModal() { document.getElementById('claudeModal').classList.remove('open'); }
function copyClaudeText() {
  const text = document.getElementById('claudePromptText').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Transkript kopiert! ✓', 'success'));
}

function openAnalysisModal() {
  const s = getSession();
  if (!s) return;
  const prompt = `Du bist ein einfühlsamer Gesprächsanalyst mit Expertise in Kommunikationspsychologie und Paardynamiken. Analysiere das folgende Gesprächstranskript zwischen ${s.speakerA} und ${s.speakerB}.

TRANSKRIPT: ${s.label}
Datum: ${new Date(s.date).toLocaleString('de-DE')}
---

${buildTranscriptText(s)}

---

Bitte analysiere dieses Gespräch anhand folgender Punkte:

1. **Kommunikationsmuster** – Wie kommunizieren die beiden? Gibt es Muster wie Unterbrechungen, aktives Zuhören, Abwehr?

2. **Emotionale Dynamik** – Welche Emotionen werden sichtbar? Gibt es Eskalationen oder de-eskalierende Momente?

3. **Bedürfnisse & Wünsche** – Was möchte jede Person wirklich ausdrücken? Was wird explizit vs. implizit gesagt?

4. **Stärken im Gespräch** – Welche positiven Aspekte zeigen sich in der Kommunikation?

5. **Wachstumsbereiche** – Wo gibt es Verbesserungspotenzial für beide?

6. **Gesamtbewertung** – Kurzes Fazit zur Qualität dieses Gesprächs und dem emotionalen Klima.

Bitte antworte einfühlsam, wertfrei und konstruktiv.`;

  document.getElementById('analysisPromptText').textContent = prompt;
  document.getElementById('analysisModal').classList.add('open');
}
function closeAnalysisModal() { document.getElementById('analysisModal').classList.remove('open'); }
function copyAnalysisText() {
  const text = document.getElementById('analysisPromptText').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Analyse-Prompt kopiert! ✓', 'success'));
}

// ═══════════════════════════════════════════════════

// CLAUDE INTEGRATION – DIREKT SENDEN
// ═══════════════════════════════════════════════════
const TEMPLATES = {
  free: () => '',
  communication: () => `\n\nBitte analysiere die Kommunikationsmuster:\n- Wer spricht mehr, wer hört zu?\n- Gibt es Unterbrechungen oder Themenwechsel?\n- Wie direkt/indirekt kommunizieren die Personen?\n- Was fällt positiv oder negativ auf?`,
  emotions: () => `\n\nBitte analysiere die emotionale Dynamik:\n- Welche Emotionen sind spürbar (explizit & implizit)?\n- Gibt es Eskalations- oder Deeskalationsmomente?\n- Was sind die unausgesprochenen Bedürfnisse jeder Person?\n- Wie ist das emotionale Klima insgesamt?`,
  progress: (list) => `\n\nDies ${list.length > 1 ? `sind ${list.length} Gespräche in chronologischer Reihenfolge` : 'ist ein Gespräch'}. Bitte analysiere:\n- Welche Themen wiederholen sich?\n- Ist eine Entwicklung erkennbar?\n- Was hat sich verbessert, was bleibt schwierig?\n- Welche Empfehlungen gibt es für künftige Gespräche?`
};

function buildClaudeContent(sessionList, template) {
  const parts = sessionList.map((s, i) => {
    const header = sessionList.length > 1
      ? `${'═'.repeat(50)}\nGESPRÄCH ${i+1}: ${s.label}\nDatum: ${new Date(s.date).toLocaleString('de-DE')}\n${s.speakerA} & ${s.speakerB}${s.notes?'\nNotizen: '+s.notes:''}${(s.tags||[]).length?'\nTags: '+s.tags.join(', '):''}\n${'─'.repeat(50)}`
      : `TRANSKRIPT: ${s.label}\nDatum: ${new Date(s.date).toLocaleString('de-DE')}\nSprecher A = ${s.speakerA} | Sprecher B = ${s.speakerB}${s.notes?'\nNotizen: '+s.notes:''}${(s.tags||[]).length?'\nTags: '+s.tags.join(', '):''}\n${'─'.repeat(50)}`;
    const text = (s.utterances||[]).map(u => `[${formatMs(u.start)}] ${getSpeakerName(u.speaker, s)}: ${u.text}`).join('\n');
    return header + '\n' + text;
  });
  const suffix = (TEMPLATES[template] || TEMPLATES.free)(sessionList);
  return parts.join('\n\n') + suffix;
}

async function sendToClaude(template) {
  document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  const s = getSession();
  if (!s) return;
  await doSend([s], template);
}

async function sendToClaudeMulti(template) {
  document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));

  // Alle ausgewählten Sessions mit Transkript-Inhalt (status 'done' ODER utterances vorhanden)
  const list = sessions
    .filter(s => selectedIds.has(s.id) && (s.status === 'done' || (s.utterances && s.utterances.length > 0)))
    .sort((a,b) => new Date(a.date)-new Date(b.date));

  if (list.length === 0) {
    showToast('Keine auswertbaren Sitzungen ausgewählt (Transkript muss fertig sein)', 'error');
    return;
  }
  await doSend(list, template);
}

async function doSend(sessionList, template) {
  let text;
  try {
    text = buildClaudeContent(sessionList, template);
  } catch(e) {
    showToast('Fehler beim Erstellen des Textes: ' + e.message, 'error');
    console.error('buildClaudeContent Fehler:', e);
    return;
  }
  if (!text || text.trim().length < 10) {
    showToast('Kein Transkript-Inhalt gefunden – Sitzungen möglicherweise leer', 'error');
    return;
  }
  const subtitle = sessionList.length === 1
    ? `„${sessionList[0].label}" wurde kopiert.`
    : `${sessionList.length} Gespräche wurden kopiert.`;

  // Clipboard kopieren – mit Fallback
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch(e) {
    // Fallback: execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      copied = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch(e2) { copied = false; }
  }

  // Overlay anzeigen
  const overlayText = document.getElementById('sendOverlayText');
  const fallbackEl  = document.getElementById('sendOverlayFallback');
  const pasteHint   = document.getElementById('sendOverlayPasteHint');
  const ta2         = document.getElementById('sendOverlayText2');

  if (copied) {
    overlayText.textContent = subtitle;
    if (fallbackEl) fallbackEl.style.display = 'none';
    if (pasteHint)  pasteHint.style.display  = '';
  } else {
    overlayText.innerHTML = icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)') + ' Zwischenablage nicht verfügbar – bitte manuell kopieren.';
    if (fallbackEl) { fallbackEl.style.display = ''; ta2.value = text; }
    if (pasteHint)  pasteHint.style.display = 'none';
  }

  document.getElementById('sendOverlay').classList.add('open');
}

function manualCopy() {
  const ta = document.getElementById('sendOverlayText2');
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Kopiert ✓', 'success');
  } catch(e) { showToast('Bitte manuell markieren & kopieren', 'error'); }
}

function closeSendOverlay() {
  document.getElementById('sendOverlay').classList.remove('open');
}

// Legacy-Stubs (werden nicht mehr verwendet, aber sicher halten)
function openClaudeModal() { toggleTemplatePopover('claudeBtnWrap'); }
function openClaudeModalMulti() { toggleTemplatePopover('multiBtnWrap'); }
function closeClaudeModal() {}
function copyClaudeText() {}
function selectAllText(el) { window.getSelection().selectAllChildren(el); }


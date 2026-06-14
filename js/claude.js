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
      max_tokens: 8192,
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
  if (typeof queueSettingsSave === 'function') queueSettingsSave(); // Drive-Sync (v4.92)
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

// ── Pflichtpfad-Helfer ──────────────────────────────
function checkSpeakersNamed() {
  const s = getSession();
  if (!s || !s.utterances?.length) return true;
  const isGedanken = s.type === 'gedanken';
  if (!s.speakerA) return false;
  if (!isGedanken && !s.speakerB) return false;
  return true;
}

function updateSpeakerStatus() {
  const hint = document.getElementById('speakerHint');
  if (!hint) return;
  const s = getSession();
  if (!s || !s.utterances?.length) { hint.style.display = 'none'; return; }
  const named = checkSpeakersNamed();
  hint.style.display = named ? 'none' : 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [hint] });
}
// ────────────────────────────────────────────────────

// ── Dropdown-Helfer ──────────────────────────────────
function updateAnalyseStartBtn() {
  const sel = document.getElementById('analyseTypeSelect');
  const btn = document.getElementById('analyseDropdownStartBtn');
  if (btn) btn.disabled = !sel?.value;
}

function updateAnalyseDropdown() {
  const s = document.getElementById('analyseTypeSelect');
  if (!s) return;
  // Beide Analyse-Optionen immer sichtbar – unabhängig vom Gesprächstyp
  const optPrivate = document.getElementById('analyseOptPrivate');
  const optWork    = document.getElementById('analyseOptWork');
  if (optPrivate) optPrivate.style.display = '';
  if (optWork)    optWork.style.display    = '';

  // Custom Prompts
  const grp = document.getElementById('customPromptsOptgroup');
  if (!grp) return;
  if (typeof getCustomPrompts === 'function') {
    const prompts = getCustomPrompts();
    grp.innerHTML = '';
    if (prompts.length) {
      grp.style.display = '';
      prompts.forEach(p => {
        const o = document.createElement('option');
        o.value = 'custom:' + p.id;
        o.textContent = p.name;
        grp.appendChild(o);
      });
    } else {
      grp.style.display = 'none';
    }
  }
}

async function startSelectedAnalysis() {
  const type = document.getElementById('analyseTypeSelect')?.value;
  if (!type) return;
  await runSingleAnalysis(type);
}

async function runSingleAnalysis(type) {
  const s = getSession();
  if (!s) { showToast('Kein Transkript aktiv.', 'warning'); return; }

  // Pflichtpfad-Guard
  if (s?.utterances?.length && !checkSpeakersNamed()) {
    const isGedanken = s.type === 'gedanken';
    const elA = document.getElementById('editSpeakerA');
    const elB = document.getElementById('editSpeakerB');
    if (!s.speakerA && elA) { elA.classList.add('input-required'); setTimeout(() => elA.scrollIntoView({ behavior:'smooth', block:'center' }), 50); }
    if (!isGedanken && !s.speakerB && elB) elB.classList.add('input-required');
    showToast('Bitte erst die Sprecher benennen.', 'warning');
    return;
  }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }
  if (!s.utterances?.length) { showToast('Keine Sprecherabschnitte vorhanden.', 'warning'); return; }

  // Analyse-Modal im Lade-Zustand öffnen
  document.getElementById('analyseModalError').style.display = 'none';
  document.getElementById('analyseLoadingArea').style.display = 'block';
  document.getElementById('analyseCancelBtn').disabled = true;
  document.getElementById('analyseModal').classList.add('open');

  const typeNames = {
    work: 'Arbeits-Analyse', private: 'Gesprächs-Analyse',
    sentiment: 'Stimmungsanalyse', chapters: 'Kapitel',
    topics: 'Themen', '360': '360°-Auswertung'
  };
  let label = typeNames[type];
  if (!label && type.startsWith('custom:') && typeof getCustomPrompts === 'function') {
    label = getCustomPrompts().find(p => p.id === type.slice(7))?.name || 'Eigener Prompt';
  }
  document.getElementById('analyseLoadingText').textContent = (label || type) + ' wird analysiert…';
  document.getElementById('analyseLoadingSteps').innerHTML = '';

  try {
    const transcript = buildTranscriptText(s);
    if (type === 'work')           await analyseWork(s, transcript);
    if (type === 'private')        await analysePrivate(s, transcript);
    if (type === 'sentiment')      await analyseSentiment(s, transcript);
    if (type === 'chapters')       await analyseChapters(s, transcript);
    if (type === 'topics')         await analyseTopics(s, transcript);
    if (type === '360')            await analyse360(s, transcript);
    if (type.startsWith('custom:') && typeof runCustomPrompt === 'function') {
      const promptObj = getCustomPrompts().find(p => p.id === type.slice(7));
      if (promptObj) await runCustomPrompt(s, promptObj, transcript);
    }
    saveSessions();
    await saveToArchive(s);
    renderInsights(s);
    if (typeof render360Block === 'function') render360Block(s);
    closeAnalyseModal();
    showToast('Analyse abgeschlossen', 'success');
  } catch (e) {
    console.error('Analyse-Fehler:', e);
    document.getElementById('analyseLoadingArea').style.display = 'none';
    document.getElementById('analyseCancelBtn').disabled = false;
    showAnalyseError(e.message || 'Unbekannter Fehler bei der Analyse.');
  }
}
// ────────────────────────────────────────────────────

function openAnalyseModal() {
  const s = getSession();

  // ── Pflichtpfad-Guard: Sprecher müssen benannt sein ──
  if (s?.utterances?.length && !checkSpeakersNamed()) {
    const isGedanken = s.type === 'gedanken';
    const elA = document.getElementById('editSpeakerA');
    const elB = document.getElementById('editSpeakerB');
    if (!s.speakerA && elA) {
      elA.classList.add('input-required');
      setTimeout(() => elA.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
    if (!isGedanken && !s.speakerB && elB) {
      elB.classList.add('input-required');
    }
    showToast('Bitte erst die Sprecher benennen.', 'warning');
    return;
  }

  document.getElementById('analyseModalError').style.display = 'none';
  document.getElementById('analyseChecks').style.display = 'block';
  document.getElementById('analyseLoadingArea').style.display = 'none';
  document.getElementById('analyseCancelBtn').disabled = false;
  document.getElementById('analyseStartBtn').style.display = '';

  // Kontextbasierte Checkboxen ein-/ausblenden
  const isWork = s?.type === 'arbeit';
  const workChecks    = document.getElementById('workChecks');
  const privateChecks = document.getElementById('privateChecks');
  if (workChecks)    workChecks.style.display    = isWork ? 'block' : 'none';
  if (privateChecks) privateChecks.style.display = isWork ? 'none'  : 'block';

  // Eigene Prompts in Checkboxen laden
  if (typeof renderCustomPromptCheckboxes === 'function') renderCustomPromptCheckboxes();

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

  // Eigene Prompts einsammeln
  if (typeof getCustomPrompts === 'function') {
    getCustomPrompts().forEach(p => {
      if (document.getElementById('chkCustom_' + p.id)?.checked) types.push('custom:' + p.id);
    });
  }

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
  // Custom Prompt Labels dynamisch hinzufügen
  if (typeof getCustomPrompts === 'function') {
    getCustomPrompts().forEach(p => { stepLabels['custom:'+p.id] = icon(p.icon||'sparkles',12)+' '+p.name; });
  }
  const stepsDone    = [];

  function setStep(type) {
    const label = stepLabels[type] || type;
    loadingText.innerHTML = label + ' wird analysiert…';
    loadingSteps.innerHTML  = types.map(t =>
      stepsDone.includes(t) ? `<span style="color:var(--green);display:flex;align-items:center;gap:5px">${icon('check',12)} ${stepLabels[t]||t}</span>` :
      t === type             ? `<span style="color:var(--accent);display:flex;align-items:center;gap:5px">${icon('loader',12)} ${stepLabels[t]||t}</span>` :
                               `<span style="opacity:0.4;display:flex;align-items:center;gap:5px">${icon('chevron-right',12)} ${stepLabels[t]||t}</span>`
    ).join('');
  }

  try {
    const transcript = buildTranscriptText(s);
    for (const type of types) {
      setStep(type);
      if (type === 'work')           await analyseWork(s, transcript);
      if (type === 'private')        await analysePrivate(s, transcript);
      if (type === 'sentiment')      await analyseSentiment(s, transcript);
      if (type === 'chapters')       await analyseChapters(s, transcript);
      if (type === 'topics')         await analyseTopics(s, transcript);
      if (type === '360')            await analyse360(s, transcript);
      if (type.startsWith('custom:') && typeof runCustomPrompt === 'function') {
        const pid = type.slice(7);
        const promptObj = getCustomPrompts().find(p => p.id === pid);
        if (promptObj) await runCustomPrompt(s, promptObj, transcript);
      }
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
  const speakerA   = session.speakerA || ownerName || 'Ich';
  const speakerB   = session.speakerB || 'Gesprächspartner';
  const persons    = (session.persons || []).join(', ') || 'nicht angegeben';
  const relContext = speakerB && speakerB !== 'Gesprächspartner' ? getRelationship(speakerB) : '';
  const trimmed    = trimTranscript(transcript, 300000);

  let prompt;
  if (isThoughts) {
    prompt = getEditablePromptText('builtin_gedanken')
      .replace(/\{\{transkript\}\}/g, trimmed);
  } else {
    const relLine = relContext ? `\nBeziehungskontext: ${speakerB} ist ${relContext}.` : '';
    prompt = getEditablePromptText('builtin_private')
      .replace(/\{\{speakerA\}\}/g, speakerA)
      .replace(/\{\{speakerB\}\}/g, speakerB)
      .replace(/\{\{persons\}\}/g, persons)
      .replace(/\{\{relContext\}\}/g, relLine)
      .replace(/\{\{transkript\}\}/g, trimmed);
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

  const prompt = getEditablePromptText('builtin_work_deep')
    .replace(/\{\{speakerA\}\}/g, speakerA)
    .replace(/\{\{speakerB\}\}/g, speakerB)
    .replace(/\{\{persons\}\}/g, persons)
    .replace(/\{\{transkript\}\}/g, trimTranscript(transcript, 300000));

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
  const prompt = getEditablePromptText('builtin_sentiment')
    .replace(/\{\{speakerA\}\}/g, speakerA)
    .replace(/\{\{speakerB\}\}/g, speakerB)
    .replace(/\{\{transkript\}\}/g, trimTranscript(transcript, 300000));
  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const json = deanonymizeObject(JSON.parse(extractJSON(text, '{')), reverse);
  session.claudeSentiment = json;
}

async function analyseChapters(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || ownerName || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';

  // Editierbaren Prompt aus Bibliothek holen (oder Default)
  let promptText = (typeof getEditablePromptText === 'function' && getEditablePromptText('builtin_chapters'))
    || `Erstelle eine Kapitelübersicht für dieses deutsche Gesprächstranskript.
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
]`;

  promptText = promptText
    .replace(/\{\{transkript\}\}/gi, trimTranscript(transcript, 300000))
    .replace(/\{\{transcript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{sprecher_a\}\}/gi,  speakerA)
    .replace(/\{\{sprecher_b\}\}/gi,  speakerB)
    .replace(/\{\{speakerA\}\}/gi,    speakerA)
    .replace(/\{\{speakerB\}\}/gi,    speakerB);
  if (!/\{\{transkript\}\}|\{\{transcript\}\}/i.test(promptText) && !promptText.includes(trimTranscript(transcript, 300000).slice(0, 20))) {
    promptText += `\n\nTranskript:\n${trimTranscript(transcript, 300000)}`;
  }

  const { text: chapText, inputTokens: chapIn, outputTokens: chapOut } = await callClaudeAPI(anonymizeText(promptText, forward));
  addTokensToSession(session, chapIn, chapOut);
  const json = deanonymizeObject(JSON.parse(extractJSON(chapText, '[')), reverse);
  session.claudeChapters = json;
}

// ── Kapitel-Auswahl & Tiefenanalyse ─────────────────
function toggleChapterExclusion(sessionId, idx, checked) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.claudeChapters?.[idx]) return;
  s.claudeChapters[idx].excluded = !checked;
  saveSessions();
  renderInsights(s);
}

function deleteChapter(sessionId, idx) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.claudeChapters) return;
  s.claudeChapters.splice(idx, 1);
  saveSessions();
  renderInsights(s);
}

function tsToMs(ts) {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  return parts.length === 2 ? (parts[0]*60+parts[1])*1000
       : parts.length === 3 ? (parts[0]*3600+parts[1]*60+parts[2])*1000 : 0;
}

function extractChapterUtterances(session, idx) {
  const chapters = session.claudeChapters || [];
  const ch = chapters[idx];
  if (!ch || !session.utterances?.length) return [];
  const startMs = tsToMs(ch.timestamp);
  const nextCh  = chapters[idx + 1];
  const endMs   = nextCh ? tsToMs(nextCh.timestamp) : Infinity;
  return session.utterances.filter(u => u.start >= startMs && u.start < endMs);
}

async function startChaptersDeepAnalysis(sessionId) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.claudeChapters?.length) return;
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'error'); return; }

  const btn = document.getElementById(`chapDeepBtn-${sessionId}`);
  if (btn) { btn.disabled = true; btn.innerHTML = icon('loader',12,'margin-right:5px') + ' Analysiere…'; }

  const { forward, reverse } = buildAnonMap(s);
  const selected = s.claudeChapters.map((ch, i) => ({ ch, i })).filter(({ ch }) => !ch.excluded);

  try {
    let prevSummaries = '';

    for (const { ch, i } of selected) {
      // Utterances für dieses Kapitel extrahieren
      const utterances = extractChapterUtterances(s, i);
      const chTranscript = utterances.length
        ? utterances.map(u => `[${formatMs(u.start)}] ${getSpeakerName(u.speaker, s)}: ${u.text}`).join('\n')
        : ch.summary; // Fallback wenn keine passenden Utterances

      const prevContext = prevSummaries ? `\nKONTEXT – vorherige Kapitel:\n${prevSummaries}\n` : '';
      const prompt = getEditablePromptText('builtin_chapter_deep')
        .replace(/\{\{chapterTitle\}\}/g, ch.title)
        .replace(/\{\{prevContext\}\}/g, prevContext)
        .replace(/\{\{chapterTranscript\}\}/g, chTranscript);

      const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
      addTokensToSession(s, inputTokens, outputTokens);
      ch.deepAnalysis = deanonymizeObject(text, reverse);
      prevSummaries += `[${ch.title}]: ${ch.deepAnalysis}\n`;
      saveSessions();
      renderInsights(s);
    }

    // Synthese-Call
    if (selected.length > 1) {
      const allSummaries = selected
        .map(({ ch }) => `[${ch.title}]:\n${ch.deepAnalysis}`)
        .join('\n\n');

      const synthPrompt = getEditablePromptText('builtin_chapter_synthesis')
        .replace(/\{\{allSummaries\}\}/g, allSummaries);

      const { text: synthText, inputTokens: sIn, outputTokens: sOut } = await callClaudeAPI(anonymizeText(synthPrompt, forward));
      addTokensToSession(s, sIn, sOut);
      s.claudeChapterSynthesis = deanonymizeObject(synthText, reverse);
      saveSessions();
      renderInsights(s);
    }

    showToast('Kapitel-Tiefenanalyse abgeschlossen ✓', 'success');
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = icon('search',12,'margin-right:5px') + ' Tiefenanalyse'; }
  }
}
// ────────────────────────────────────────────────────

async function analyseTopics(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || ownerName || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';

  // Editierbaren Prompt aus Bibliothek holen (oder Default)
  let promptText = (typeof getEditablePromptText === 'function' && getEditablePromptText('builtin_topics'))
    || `Erkenne die Hauptthemen in diesem deutschen Gesprächstranskript.

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Array aus kurzen Themen-Tags auf Deutsch (max. 10 Tags):
["Thema 1", "Thema 2", ...]`;

  promptText = promptText
    .replace(/\{\{transkript\}\}/gi, trimTranscript(transcript, 300000))
    .replace(/\{\{transcript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{speakerA\}\}/gi,    speakerA)
    .replace(/\{\{speakerB\}\}/gi,    speakerB);
  if (!/\{\{transkript\}\}|\{\{transcript\}\}/i.test(promptText) && !promptText.includes(trimTranscript(transcript, 300000).slice(0, 20))) {
    promptText += `\n\nTranskript:\n${trimTranscript(transcript, 300000)}`;
  }

  const { text: topText, inputTokens: topIn, outputTokens: topOut } = await callClaudeAPI(anonymizeText(promptText, forward));
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

// Akkordeon-Panels in der Sitzungsdetailansicht öffnen/schließen
function toggleAccPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.classList.toggle('open');
  _saveAccState();
}

function _saveAccState() {
  if (!currentSessionId) return;
  const panels = ['accAudio','accNamen','accTranskript','accTags','accNotizen','accAnalysen','accMindmap','accFolgegespraech','accCanva'];
  const open = panels.filter(id => {
    const el = document.getElementById(id);
    return el && el.classList.contains('open');
  });
  localStorage.setItem('accState_' + currentSessionId, JSON.stringify(open));
}

function _restoreAccState(sessionId) {
  const panels = ['accAudio','accNamen','accTranskript','accTags','accNotizen','accAnalysen','accMindmap','accFolgegespraech','accCanva'];
  // Alle schließen
  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  const stored = localStorage.getItem('accState_' + sessionId);
  if (stored) {
    try {
      JSON.parse(stored).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('open');
      });
    } catch(e) {}
  }
}

// Block einblenden – beim ersten Mal zugeklappt, danach aktuellen Zustand behalten
function showInsightsBlock(block) {
  if (!block) return;
  const wasHidden = block.style.display === 'none' || block.style.display === '';
  block.style.display = 'block';
  if (wasHidden) block.classList.add('collapsed');
}

function renderInsights(session) {
  const section = document.getElementById('insightsSection');
  let anyVisible = false;

  // ── Private-Analyse ──────────────────────────────
  const privateBlock   = document.getElementById('privateBlock');
  const privateContent = document.getElementById('privateContent');
  const pa = session.privateAnalysis;

  if (pa) {
    let html = '';
    const sid = session.id;

    const editFieldBtn = (aKey, field) =>
      `<button class="work-item-del" title="Bearbeiten" style="margin-left:6px;opacity:0.6"
        onclick="editAnalysisField('${sid}','${aKey}','${field}')">${icon('pencil',11)}</button>`;

    if (pa.summary) {
      html += `<div class="work-section">
        <div class="work-section-title">Zusammenfassung ${editFieldBtn('privateAnalysis','summary')}</div>
        <div class="work-summary" data-textfield="privateAnalysis-summary">${escHtml(pa.summary)}</div>
      </div>`;
    }

    if (pa.dynamics) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('message-circle',13,'margin-right:5px')} Gesprächsdynamik ${editFieldBtn('privateAnalysis','dynamics')}</div>
        <div class="private-dynamics" data-textfield="privateAnalysis-dynamics">${escHtml(pa.dynamics)}</div>
      </div>`;
    }

    if (pa.zwischenzeilen) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('search',13,'margin-right:5px')} Zwischen den Zeilen ${editFieldBtn('privateAnalysis','zwischenzeilen')}</div>
        <div class="private-dynamics" style="border-left:3px solid var(--accent2); padding-left:12px; font-style:italic" data-textfield="privateAnalysis-zwischenzeilen">${escHtml(pa.zwischenzeilen)}</div>
      </div>`;
    }

    const delBtn = (aKey, field, i) =>
      `<button class="work-item-del" title="Eintrag löschen"
        onclick="deleteAnalysisItem('${sid}','${aKey}','${field}',${i})">${icon('trash-2',12)}</button>`;

    const addBtn = (aKey, field) =>
      `<button class="work-item-del" title="Hinzufügen" style="margin-left:6px;opacity:0.6;font-size:0.75rem"
        onclick="addAnalysisItem('${sid}','${aKey}','${field}')">${icon('plus',11)} Hinzufügen</button>`;
    const editItemBtn = (aKey, field, i) =>
      `<button class="work-item-del" title="Bearbeiten" style="opacity:0.5"
        onclick="editAnalysisItem('${sid}','${aKey}','${field}',${i})">${icon('pencil',11)}</button>`;

    if (pa.agreements?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Vereinbarungen ${addBtn('privateAnalysis','agreements')}</div><div data-section="privateAnalysis-agreements">`;
      pa.agreements.forEach((a, i) => {
        html += `<div class="work-item"><span>${icon('check',11,'color:var(--green)')}</span><div class="work-item-content" data-edit-key="privateAnalysis" data-edit-field="agreements" data-edit-idx="${i}">${escHtml(a)}</div>${editItemBtn('privateAnalysis','agreements',i)}${delBtn('privateAnalysis','agreements',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Vereinbarungen ${addBtn('privateAnalysis','agreements')}</div><div data-section="privateAnalysis-agreements"></div></div>`;
    }

    if (pa.wishes?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('target',13,'margin-right:5px')} Wünsche & Bedürfnisse ${addBtn('privateAnalysis','wishes')}</div><div data-section="privateAnalysis-wishes">`;
      pa.wishes.forEach((w, i) => {
        const pName = typeof w === 'object' ? w.person : '';
        const wish  = typeof w === 'object' ? w.wish   : w;
        html += `<div class="work-item">
          <span>${icon('message-square',11)}</span>
          <div class="work-item-content" data-edit-key="privateAnalysis" data-edit-field="wishes" data-edit-idx="${i}">
            ${pName ? `<div style="font-size:0.72rem; color:var(--muted); font-weight:700; margin-bottom:2px">${escHtml(pName)}</div>` : ''}
            <div>${escHtml(wish)}</div>
          </div>
          ${editItemBtn('privateAnalysis','wishes',i)}${delBtn('privateAnalysis','wishes',i)}
        </div>`;
      });
      html += `</div></div>`;
    }

    if (pa.openTopics?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('clock',13,'margin-right:5px')} Offene Themen ${addBtn('privateAnalysis','openTopics')}</div><div data-section="privateAnalysis-openTopics">`;
      pa.openTopics.forEach((t, i) => {
        html += `<div class="work-item"><span>○</span><div class="work-item-content" data-edit-key="privateAnalysis" data-edit-field="openTopics" data-edit-idx="${i}">${escHtml(t)}</div>${editItemBtn('privateAnalysis','openTopics',i)}${delBtn('privateAnalysis','openTopics',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('clock',13,'margin-right:5px')} Offene Themen ${addBtn('privateAnalysis','openTopics')}</div><div data-section="privateAnalysis-openTopics"></div></div>`;
    }

    if (pa.keyThoughts?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('lightbulb',13,'margin-right:5px')} Kerngedanken ${addBtn('privateAnalysis','keyThoughts')}</div><div data-section="privateAnalysis-keyThoughts">`;
      pa.keyThoughts.forEach((t, i) => {
        html += `<div class="work-item"><span>→</span><div class="work-item-content" data-edit-key="privateAnalysis" data-edit-field="keyThoughts" data-edit-idx="${i}">${escHtml(t)}</div>${editItemBtn('privateAnalysis','keyThoughts',i)}${delBtn('privateAnalysis','keyThoughts',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('lightbulb',13,'margin-right:5px')} Kerngedanken ${addBtn('privateAnalysis','keyThoughts')}</div><div data-section="privateAnalysis-keyThoughts"></div></div>`;
    }

    if (pa.nextSteps?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('arrow-right',13,'margin-right:5px')} Nächste Schritte ${addBtn('privateAnalysis','nextSteps')}</div><div data-section="privateAnalysis-nextSteps">`;
      pa.nextSteps.forEach((t, i) => {
        html += `<div class="work-item"><span>${icon('square',11,'opacity:0.5')}</span><div class="work-item-content" data-edit-key="privateAnalysis" data-edit-field="nextSteps" data-edit-idx="${i}">${escHtml(t)}</div>${editItemBtn('privateAnalysis','nextSteps',i)}${delBtn('privateAnalysis','nextSteps',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('arrow-right',13,'margin-right:5px')} Nächste Schritte ${addBtn('privateAnalysis','nextSteps')}</div><div data-section="privateAnalysis-nextSteps"></div></div>`;
    }

    privateContent.innerHTML = html;
    showInsightsBlock(privateBlock);
    anyVisible = true;
  } else {
    privateBlock.style.display = 'none';
  }

  // ── Arbeits-Analyse ───────────────────────────────
  const workBlock   = document.getElementById('workBlock');
  const workContent = document.getElementById('workContent');
  const wa = session.workAnalysis;

  if (wa) {
    let html = '';

    const wSid = session.id;
    const wDel = (field, i) =>
      `<button class="work-item-del" title="Eintrag löschen"
        onclick="deleteAnalysisItem('${wSid}','workAnalysis','${field}',${i})">${icon('trash-2',12)}</button>`;
    const wEdit = (field, i) =>
      `<button class="work-item-del" title="Bearbeiten" style="opacity:0.5"
        onclick="editAnalysisItem('${wSid}','workAnalysis','${field}',${i})">${icon('pencil',11)}</button>`;
    const wAdd = (field) =>
      `<button class="work-item-del" title="Hinzufügen" style="margin-left:6px;opacity:0.6;font-size:0.75rem"
        onclick="addAnalysisItem('${wSid}','workAnalysis','${field}')">${icon('plus',11)} Hinzufügen</button>`;
    const wEditField = (field) =>
      `<button class="work-item-del" title="Bearbeiten" style="margin-left:6px;opacity:0.6"
        onclick="editAnalysisField('${wSid}','workAnalysis','${field}')">${icon('pencil',11)}</button>`;

    if (wa.summary) {
      html += `<div class="work-section">
        <div class="work-section-title">Zusammenfassung ${wEditField('summary')}</div>
        <div class="work-summary" data-textfield="workAnalysis-summary">${escHtml(wa.summary)}</div>
      </div>`;
    }

    if (wa.tasks?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Aufgaben (${wa.tasks.length}) ${wAdd('tasks')}</div><div data-section="workAnalysis-tasks">`;
      wa.tasks.forEach((t, i) => {
        const prioClass = t.priority === 'hoch' ? 'work-prio-hoch' : t.priority === 'niedrig' ? 'work-prio-niedrig' : 'work-prio-mittel';
        html += `<div class="work-item">
          <span>${icon('square',11,'opacity:0.5')}</span>
          <div class="work-item-content" data-edit-key="workAnalysis" data-edit-field="tasks" data-edit-idx="${i}">
            <div>${escHtml(t.task)}</div>
            <div class="work-item-meta">
              ${t.person ? `${icon('user',11,'margin-right:3px')}${escHtml(t.person)}` : ''}
              ${t.deadline ? ` · ${icon('calendar',11,'margin-right:3px')}${escHtml(t.deadline)}` : ''}
              ${t.priority ? ` · <span class="${prioClass}">${escHtml(t.priority)}</span>` : ''}
            </div>
          </div>
          ${wEdit('tasks',i)}${wDel('tasks',i)}
        </div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('check-circle',13,'margin-right:5px')} Aufgaben ${wAdd('tasks')}</div><div data-section="workAnalysis-tasks"></div></div>`;
    }

    if (wa.decisions?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('clipboard',13,'margin-right:5px')} Entscheidungen ${wAdd('decisions')}</div><div data-section="workAnalysis-decisions">`;
      wa.decisions.forEach((d, i) => {
        html += `<div class="work-item"><span>${icon('check',11,'color:var(--green)')}</span><div class="work-item-content" data-edit-key="workAnalysis" data-edit-field="decisions" data-edit-idx="${i}">${escHtml(d)}</div>${wEdit('decisions',i)}${wDel('decisions',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('clipboard',13,'margin-right:5px')} Entscheidungen ${wAdd('decisions')}</div><div data-section="workAnalysis-decisions"></div></div>`;
    }

    if (wa.openQuestions?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-circle',13,'margin-right:5px')} Offene Fragen ${wAdd('openQuestions')}</div><div data-section="workAnalysis-openQuestions">`;
      wa.openQuestions.forEach((q, i) => {
        html += `<div class="work-item"><span>?</span><div class="work-item-content" data-edit-key="workAnalysis" data-edit-field="openQuestions" data-edit-idx="${i}">${escHtml(q)}</div>${wEdit('openQuestions',i)}${wDel('openQuestions',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-circle',13,'margin-right:5px')} Offene Fragen ${wAdd('openQuestions')}</div><div data-section="workAnalysis-openQuestions"></div></div>`;
    }

    if (wa.risks?.length) {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-triangle',13,'margin-right:5px')} Risiken ${wAdd('risks')}</div><div data-section="workAnalysis-risks">`;
      wa.risks.forEach((r, i) => {
        html += `<div class="work-item"><span>${icon('alert-triangle',11,'color:var(--yellow)')}</span><div class="work-item-content" data-edit-key="workAnalysis" data-edit-field="risks" data-edit-idx="${i}">${escHtml(r)}</div>${wEdit('risks',i)}${wDel('risks',i)}</div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="work-section"><div class="work-section-title">${icon('alert-triangle',13,'margin-right:5px')} Risiken ${wAdd('risks')}</div><div data-section="workAnalysis-risks"></div></div>`;
    }

    if (wa.zwischenzeilen) {
      html += `<div class="work-section">
        <div class="work-section-title">${icon('search',13,'margin-right:5px')} Zwischen den Zeilen ${wEditField('zwischenzeilen')}</div>
        <div class="private-dynamics" style="border-left:3px solid var(--accent2); padding-left:12px; font-style:italic" data-textfield="workAnalysis-zwischenzeilen">${escHtml(wa.zwischenzeilen)}</div>
      </div>`;
    }

    workContent.innerHTML = html;
    showInsightsBlock(workBlock);
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
    showInsightsBlock(sentBlock);
    anyVisible = true;
  } else {
    sentBlock.style.display = 'none';
  }

  // ── Kapitel (Claude) ──────────────────────────────
  const chapBlock = document.getElementById('chaptersBlock');
  const chapContent = document.getElementById('chaptersContent');
  const chapters = session.claudeChapters || [];

  if (chapters.length > 0) {
    const sid = session.id;
    chapContent.innerHTML = chapters.map((ch, i) => {
      const tsMs = ch.timestamp ? (() => {
        const parts = ch.timestamp.split(':').map(Number);
        return parts.length === 2 ? (parts[0]*60 + parts[1]) * 1000
             : parts.length === 3 ? (parts[0]*3600 + parts[1]*60 + parts[2]) * 1000 : 0;
      })() : 0;
      const excluded = !!ch.excluded;
      return `
        <div class="chapter-item ${excluded ? 'chapter-excluded' : ''}" id="chap-${sid}-${i}">
          <div class="chapter-header-row">
            <input type="checkbox" class="chapter-check" ${excluded ? '' : 'checked'}
              onchange="toggleChapterExclusion('${sid}',${i},this.checked)" title="Für Tiefenanalyse auswählen">
            <div class="chapter-main" onclick="seekAudio(${tsMs})">
              <div class="chapter-headline">${escHtml(ch.title || '')}</div>
              <div class="chapter-summary">${escHtml(ch.summary || '')}</div>
              ${ch.timestamp ? `<div class="chapter-time">${icon('play',10,'margin-right:3px')} ${escHtml(ch.timestamp)}</div>` : ''}
            </div>
            <button class="chapter-delete-btn" onclick="deleteChapter('${sid}',${i})" title="Kapitel entfernen">${icon('x',12)}</button>
          </div>
          ${ch.deepAnalysis ? `<div class="chapter-deep-result">${ch.deepAnalysis.replace(/\n/g,'<br>')}</div>` : ''}
        </div>`;
    }).join('');

    // Aktions-Leiste
    const active = chapters.filter(c => !c.excluded).length;
    const hasSynthesis = !!session.claudeChapterSynthesis;
    chapContent.innerHTML += `
      <div class="chapter-actions">
        <span style="font-size:0.74rem; color:var(--muted)">${active} von ${chapters.length} ausgewählt</span>
        <button class="btn" style="padding:5px 12px; font-size:0.78rem; display:inline-flex; align-items:center; gap:5px"
          onclick="startChaptersDeepAnalysis('${sid}')" ${active === 0 ? 'disabled' : ''} id="chapDeepBtn-${sid}">
          ${icon('search',12)} Tiefenanalyse
        </button>
      </div>
      ${hasSynthesis ? `<div class="chapter-synthesis-box"><strong style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--muted)">Gesamtbild</strong><br><br>${session.claudeChapterSynthesis.replace(/\n/g,'<br>')}</div>` : ''}`;

    showInsightsBlock(chapBlock);
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
    showInsightsBlock(topicsBlock);
    anyVisible = true;
  } else {
    topicsBlock.style.display = 'none';
  }

  // ── Custom Prompt Ergebnisse ──────────────────────
  const customContainer = document.getElementById('customResultsContainer');
  if (customContainer) {
    const customResults = session.customResults || {};
    const keys = Object.keys(customResults);
    if (keys.length > 0) {
      customContainer.innerHTML = keys.map(pid => {
        const res  = customResults[pid];
        const bid  = 'customBlock_' + pid;
        const icoName = (typeof getCustomPrompts === 'function'
          ? (getCustomPrompts().find(p => p.id === pid)?.icon || 'sparkles')
          : 'sparkles');
        const bodyHtml = (res.structured && res.schema)
          ? renderCustomSchemaResult(session, pid, res.structured, res.schema)
          : `<div class="custom-result-text" style="white-space:pre-wrap">${escHtml(res.text || '')}</div>`;
        return `
          <div class="insights-block" id="${bid}">
            <div class="insights-block-title" onclick="toggleInsightsBlock('${bid}')">
              <span style="display:inline-flex;align-items:center;gap:6px">
                ${icon(icoName,14,'stroke:currentColor;stroke-width:2;fill:none;flex-shrink:0')}
                ${escHtml(res.promptName || 'Eigener Prompt')}
              </span>
              <span class="insights-block-chevron">▾</span>
            </div>
            <div class="insights-block-body">${bodyHtml}</div>
          </div>`;
      }).join('');
      showInsightsBlock(customContainer.querySelector('.insights-block'));
      anyVisible = true;
    } else {
      customContainer.innerHTML = '';
    }
  }

  section.style.display = anyVisible ? 'block' : 'none';

  // v4.81: Subtabs immer nach renderInsights aktualisieren (nicht nur beim Tab-Klick)
  if (typeof _refreshAnalysenSubtabs === 'function') _refreshAnalysenSubtabs();
}

function showTranscript(session) {
  document.getElementById('browserView').classList.remove('visible');
  const card = document.getElementById('transcriptCard');
  card.classList.add('visible');

  document.getElementById('transcriptTitle').textContent = session.label;
  const dur = session.duration ? ` · ${formatDuration(session.duration)}` : '';
  document.getElementById('transcriptMeta').textContent =
    `${session.filename}${dur} · ${new Date(session.date).toLocaleString('de-DE')}`;

  // Typ-Buttons aktualisieren
  _updateTypeButtons(session.type || 'privat');

  // Projekt-Dropdown befüllen
  if (typeof updateSessionProjectDropdown === 'function') updateSessionProjectDropdown(session);

  // Namensfelder befüllen
  document.getElementById('editSpeakerA').value = session.speakerA || 'Sprecher A';
  document.getElementById('editSpeakerB').value = session.speakerB || 'Sprecher B';
  renderExtraSpeakerFields(session);
  updateSpeakerStatus();
  updateAnalyseDropdown();

  // Tags & Notizen
  renderTagChips(session);
  const notesEl = document.getElementById('notesArea');
  if (notesEl) notesEl.value = session.notes || '';

  renderInsights(session);
  loadAudioForSession(session);
  renderUtterances(session);
  // Mindmap-Panel befüllen falls bereits generiert
  if (session.claudeMindmap && typeof renderMindmapPanel === 'function') {
    renderMindmapPanel(session.claudeMindmap);
  } else {
    const mp = document.getElementById('mindmapPanelRender');
    if (mp) mp.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">Noch keine Mind Map generiert – klicke oben auf „Mind Map" oder „Neu generieren".</span>';
  }
  // Folgegespräch-Panel befüllen
  renderFollowUpMessages(session);
  // Präsentations-Vorschau laden falls vorhanden
  const preview = document.getElementById('canvaPreview');
  const exportBtn = document.getElementById('canvaExportBtn');
  if (preview) {
    const transferBtn = document.getElementById('canvaTransferBtn');
    if (session.claudePresentation?.data) {
      _renderPresentationPreview(session.claudePresentation.data, preview);
      if (exportBtn)   exportBtn.style.display   = 'inline-flex';
      if (transferBtn) transferBtn.style.display  = 'inline-flex';
      const sel = document.getElementById('canvaPromptSelect');
      if (sel && session.claudePresentation.promptId) sel.value = session.claudePresentation.promptId;
    } else {
      preview.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">Wähle einen Typ und klicke auf „Generieren" – Claude strukturiert den Inhalt aus deinen Analysen.</span>';
      if (exportBtn)   exportBtn.style.display   = 'none';
      if (transferBtn) transferBtn.style.display  = 'none';
    }
    renderDesignLinks(session);
  }
  _restoreAccState(session.id);
  // v4.76: Faehnchen einblenden, Sidebar-Modus zuruecksetzen
  const flap = document.getElementById('sdcFlap');
  if (flap) flap.classList.remove('hidden');
  if (typeof closeSessionSidebar === 'function') closeSessionSidebar();
}


// ═══════════════════════════════════════════════════
// CUSTOM SCHEMA RENDERER
// Rendert strukturierte Custom-Prompt-Ergebnisse anhand des outputSchema
// ═══════════════════════════════════════════════════
function renderCustomSchemaResult(session, promptId, data, schema) {
  const sid = session.id;
  let html = '';

  schema.forEach(schemaDef => {
    const { field, type, label, columns } = schemaDef;
    const value = data[field];
    if (value === undefined || value === null) return;

    const sectionId = `custom-section-${promptId}-${field}`;

    // ── Hilfsfunktionen ──────────────────────────────
    const editFieldBtn = () =>
      `<button class="work-item-del" title="Bearbeiten" style="margin-left:6px;opacity:0.6"
        onclick="editCustomResultField('${sid}','${promptId}','${field}')">${icon('pencil',11)}</button>`;
    const addBtn = () =>
      `<button class="work-item-del" title="Hinzufügen" style="margin-left:6px;opacity:0.6;font-size:0.75rem"
        onclick="addCustomResultItem('${sid}','${promptId}','${field}')">${icon('plus',11)} Hinzufügen</button>`;
    const editItemBtn = (i) =>
      `<button class="work-item-del" title="Bearbeiten" style="opacity:0.5"
        onclick="editCustomResultItem('${sid}','${promptId}','${field}',${i})">${icon('pencil',11)}</button>`;
    const delItemBtn = (i) =>
      `<button class="work-item-del" title="Löschen"
        onclick="deleteCustomResultItem('${sid}','${promptId}','${field}',${i})">${icon('trash-2',12)}</button>`;

    // ── Typen rendern ────────────────────────────────

    if (type === 'text') {
      html += `<div class="work-section">
        <div class="work-section-title">${escHtml(label)} ${editFieldBtn()}</div>
        <div class="work-summary" data-custom-textfield="${promptId}-${field}">${escHtml(String(value))}</div>
      </div>`;

    } else if (type === 'list') {
      const items = Array.isArray(value) ? value : [];
      html += `<div class="work-section">
        <div class="work-section-title">${escHtml(label)} ${addBtn()}</div>
        <div id="${sectionId}" data-custom-section="${promptId}-${field}">`;
      items.forEach((item, i) => {
        html += `<div class="work-item">
          <span>•</span>
          <div class="work-item-content" data-custom-item="${promptId}-${field}-${i}">${escHtml(String(item))}</div>
          ${editItemBtn(i)}${delItemBtn(i)}
        </div>`;
      });
      html += `</div></div>`;

    } else if (type === 'checklist') {
      const items = Array.isArray(value) ? value : [];
      html += `<div class="work-section">
        <div class="work-section-title">${escHtml(label)} ${addBtn()}</div>
        <div id="${sectionId}" data-custom-section="${promptId}-${field}">`;
      items.forEach((item, i) => {
        const checked = typeof item === 'object' && item.done;
        const text    = typeof item === 'object' ? item.text : String(item);
        html += `<div class="work-item">
          <input type="checkbox" ${checked ? 'checked' : ''}
            onchange="toggleCustomCheckItem('${sid}','${promptId}','${field}',${i},this.checked)"
            style="margin-right:4px;cursor:pointer;accent-color:var(--accent)">
          <div class="work-item-content" data-custom-item="${promptId}-${field}-${i}"
            style="${checked ? 'opacity:0.5;text-decoration:line-through' : ''}">${escHtml(text)}</div>
          ${editItemBtn(i)}${delItemBtn(i)}
        </div>`;
      });
      html += `</div></div>`;

    } else if (type === 'list_with_person') {
      const items = Array.isArray(value) ? value : [];
      html += `<div class="work-section">
        <div class="work-section-title">${escHtml(label)} ${addBtn()}</div>
        <div id="${sectionId}" data-custom-section="${promptId}-${field}">`;
      items.forEach((item, i) => {
        const person = typeof item === 'object' ? (item.person || '') : '';
        const text   = typeof item === 'object' ? (item.text || String(item)) : String(item);
        html += `<div class="work-item">
          <span>${icon('user',11)}</span>
          <div class="work-item-content" data-custom-item="${promptId}-${field}-${i}">
            ${person ? `<div style="font-size:0.72rem;color:var(--muted);font-weight:700;margin-bottom:2px">${escHtml(person)}</div>` : ''}
            <div>${escHtml(text)}</div>
          </div>
          ${editItemBtn(i)}${delItemBtn(i)}
        </div>`;
      });
      html += `</div></div>`;

    } else if (type === 'table') {
      const rows = Array.isArray(value) ? value : [];
      const cols = columns || (rows[0] ? Array.from({length: rows[0].length}, (_,i) => `Spalte ${i+1}`) : []);
      html += `<div class="work-section">
        <div class="work-section-title">${escHtml(label)}</div>
        <div style="overflow-x:auto;margin-top:6px">
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
            <thead>
              <tr>${cols.map(c => `<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);color:var(--muted);font-weight:600">${escHtml(c)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map((row, ri) => {
                const cells = Array.isArray(row) ? row : [row];
                return `<tr style="${ri % 2 === 0 ? '' : 'background:rgba(255,255,255,0.03)'}">
                  ${cells.map(cell => `<td style="padding:6px 10px;border-bottom:1px solid var(--border);vertical-align:top">${escHtml(String(cell ?? ''))}</td>`).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }
  });

  return html || '<div style="color:var(--muted);font-size:0.85rem">Keine strukturierten Daten vorhanden.</div>';
}

// Baut reinen Text für einen Analysebereich
function _buildSectionText(type, session) {
  const lines = [];
  const header = (t) => lines.push(t, '─'.repeat(t.length), '');
  const item   = (t) => lines.push('• ' + t);

  const meta = `${session.label}  |  ${new Date(session.date).toLocaleString('de-DE')}  |  ${session.speakerA || 'A'} & ${session.speakerB || 'B'}`;

  if (type === 'private') {
    const pa = session.privateAnalysis;
    if (!pa) return null;
    header('GESPRÄCHSANALYSE');
    lines.push(meta, '');
    if (pa.summary)              { lines.push('Zusammenfassung', pa.summary, ''); }
    if (pa.dynamics)             { lines.push('Gesprächsdynamik', pa.dynamics, ''); }
    if (pa.zwischenzeilen)       { lines.push('Zwischen den Zeilen', pa.zwischenzeilen, ''); }
    if (pa.agreements?.length)   { lines.push('Vereinbarungen'); pa.agreements.forEach(item); lines.push(''); }
    if (pa.wishes?.length)       { lines.push('Wünsche & Bedürfnisse'); pa.wishes.forEach(w => item(typeof w === 'object' ? (w.person ? w.person + ': ' + w.wish : w.wish) : w)); lines.push(''); }
    if (pa.openTopics?.length)   { lines.push('Offene Themen'); pa.openTopics.forEach(item); lines.push(''); }
    if (pa.keyThoughts?.length)  { lines.push('Kerngedanken'); pa.keyThoughts.forEach(item); lines.push(''); }
    if (pa.nextSteps?.length)    { lines.push('Nächste Schritte'); pa.nextSteps.forEach(item); lines.push(''); }

  } else if (type === 'work') {
    const wa = session.workAnalysis;
    if (!wa) return null;
    header('ARBEITSANALYSE');
    lines.push(meta, '');
    if (wa.summary)              { lines.push('Zusammenfassung', wa.summary, ''); }
    if (wa.zwischenzeilen)       { lines.push('Zwischen den Zeilen', wa.zwischenzeilen, ''); }
    if (wa.tasks?.length)        { lines.push('Aufgaben'); wa.tasks.forEach(t => item(t.task + (t.person ? ' [' + t.person + ']' : '') + (t.deadline ? ' bis ' + t.deadline : '') + (t.priority ? ' (' + t.priority + ')' : ''))); lines.push(''); }
    if (wa.decisions?.length)    { lines.push('Entscheidungen'); wa.decisions.forEach(item); lines.push(''); }
    if (wa.openQuestions?.length){ lines.push('Offene Fragen'); wa.openQuestions.forEach(item); lines.push(''); }
    if (wa.risks?.length)        { lines.push('Risiken'); wa.risks.forEach(item); lines.push(''); }

  } else if (type === 'sentiment') {
    const cs = session.claudeSentiment;
    if (!cs) return null;
    header('STIMMUNGSANALYSE');
    lines.push(meta, '');
    if (cs.overall)  lines.push('Gesamt: ' + cs.overall, '');
    if (cs.speakerA) lines.push(`${session.speakerA || 'A'}: ` + cs.speakerA);
    if (cs.speakerB) lines.push(`${session.speakerB || 'B'}: ` + cs.speakerB);

  } else if (type === 'chapters') {
    const ch = session.claudeChapters;
    if (!ch?.length) return null;
    header('KAPITEL');
    lines.push(meta, '');
    ch.forEach(c => lines.push(`${formatMs(c.start)}  ${c.title}`));

  } else if (type === 'topics') {
    const tp = session.claudeTopics;
    if (!tp?.length) return null;
    header('THEMEN');
    lines.push(meta, '');
    tp.forEach(t => item(typeof t === 'string' ? t : t.text));

  } else if (type === '360') {
    if (!session.claude360) return null;
    header('360°-AUSWERTUNG');
    lines.push(meta, '');
    lines.push(typeof session.claude360 === 'string' ? session.claude360 : JSON.stringify(session.claude360, null, 2));

  } else if (type.startsWith('custom:')) {
    const promptId = type.slice(7);
    const res = session.customResults?.[promptId];
    if (!res) return null;
    header(res.promptName?.toUpperCase() || 'EIGENER PROMPT');
    lines.push(meta, '');
    if (res.structured && res.schema) {
      res.schema.forEach(s => {
        const val = res.structured[s.field];
        if (val === undefined || val === null) return;
        lines.push(s.label);
        if (s.type === 'text') {
          lines.push(String(val), '');
        } else if (s.type === 'list' || s.type === 'list_with_person') {
          const arr = Array.isArray(val) ? val : [];
          arr.forEach(item => {
            if (typeof item === 'object') lines.push('• ' + (item.person ? item.person + ': ' : '') + (item.text || JSON.stringify(item)));
            else lines.push('• ' + String(item));
          });
          lines.push('');
        } else if (s.type === 'checklist') {
          const arr = Array.isArray(val) ? val : [];
          arr.forEach(item => {
            const text = typeof item === 'object' ? item.text : String(item);
            const done = typeof item === 'object' && item.done;
            lines.push((done ? '☑ ' : '☐ ') + text);
          });
          lines.push('');
        } else if (s.type === 'table') {
          const rows = Array.isArray(val) ? val : [];
          if (s.columns) lines.push(s.columns.join(' | '));
          rows.forEach(row => {
            const cells = Array.isArray(row) ? row : [row];
            lines.push(cells.map(c => String(c ?? '')).join(' | '));
          });
          lines.push('');
        }
      });
    } else {
      lines.push(res.text || '');
    }
  }

  return lines.join('\n');
}

function exportSection(type, format) {
  const session = getSession(currentSessionId);
  if (!session) return;
  const text = _buildSectionText(type, session);
  if (!text) { showToast('Keine Daten für diesen Bereich vorhanden.', 'error'); return; }

  const slug   = (session.label || 'analyse').replace(/[^a-z0-9äöü\s]/gi,'').trim().replace(/\s+/g,'-');
  const labels = { private:'gespraech', work:'arbeit', sentiment:'stimmung', chapters:'kapitel', topics:'themen', '360':'360grad' };
  const fname  = `${slug}-${labels[type] || type}`;

  if (format === 'txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: fname + '.txt' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } else if (format === 'pdf') {
    // Print-basierter PDF-Export
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) { showToast('Popup blockiert – bitte Popup-Blocker deaktivieren.', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${fname}</title>
      <style>
        body { font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.7;
               max-width: 700px; margin: 40px auto; padding: 0 24px; color: #111; }
        pre  { white-space: pre-wrap; word-break: break-word; font-family: inherit; }
        @media print { body { margin: 20px; } }
      </style></head>
      <body><pre>${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
      <script>setTimeout(()=>{ window.print(); window.close(); }, 300);<\/script>
      </body></html>`);
    win.document.close();
  }
}

function _updateTypeButtons(activeType) {
  const wrap = document.getElementById('sessionTypeSelect');
  if (!wrap) return;
  wrap.querySelectorAll('button[data-type]').forEach(btn => {
    const isActive = btn.dataset.type === activeType;
    btn.style.background = isActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)';
    btn.style.color       = isActive ? '#fff'                   : 'rgba(255,255,255,0.65)';
    btn.style.fontWeight  = isActive ? '600'                    : '400';
  });
}

function changeSessionType(newType) {
  const session = getSession(currentSessionId);
  if (!session) return;
  session.type = newType;
  saveSessions();
  saveToArchive(session);
  _updateTypeButtons(newType);
  updateAnalyseDropdown();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Folgegespräch (Analyse als Kontext) ───────────────────────────────────

// Baut alle vorhandenen Analyse-Ergebnisse als lesbaren Text zusammen
function _buildFollowUpContext(session) {
  const lines = [];

  if (session.privateAnalysis) {
    const p = session.privateAnalysis;
    lines.push('=== GESPRÄCHSANALYSE ===');
    if (p.summary)        lines.push('Zusammenfassung: ' + p.summary);
    if (p.dynamics)       lines.push('Dynamik: ' + p.dynamics);
    if (p.zwischenzeilen) lines.push('Zwischen den Zeilen: ' + p.zwischenzeilen);
    if (p.agreements?.length)  lines.push('Vereinbarungen:\n' + p.agreements.map(x => '- ' + x).join('\n'));
    if (p.wishes?.length)      lines.push('Wünsche/Bedürfnisse:\n' + p.wishes.map(x => '- ' + x).join('\n'));
    if (p.openTopics?.length)  lines.push('Offene Themen:\n' + p.openTopics.map(x => '- ' + x).join('\n'));
    if (p.keyThoughts?.length) lines.push('Kerngedanken:\n' + p.keyThoughts.map(x => '- ' + x).join('\n'));
    if (p.nextSteps?.length)   lines.push('Nächste Schritte:\n' + p.nextSteps.map(x => '- ' + x).join('\n'));
    lines.push('');
  }

  if (session.workAnalysis) {
    const w = session.workAnalysis;
    lines.push('=== ARBEITSANALYSE ===');
    if (w.summary)        lines.push('Zusammenfassung: ' + w.summary);
    if (w.zwischenzeilen) lines.push('Zwischen den Zeilen: ' + w.zwischenzeilen);
    if (w.tasks?.length)         lines.push('Aufgaben:\n' + w.tasks.map(x => '- ' + (x.text || x)).join('\n'));
    if (w.decisions?.length)     lines.push('Entscheidungen:\n' + w.decisions.map(x => '- ' + (x.text || x)).join('\n'));
    if (w.openQuestions?.length) lines.push('Offene Fragen:\n' + w.openQuestions.map(x => '- ' + (x.text || x)).join('\n'));
    if (w.risks?.length)         lines.push('Risiken:\n' + w.risks.map(x => '- ' + (x.text || x)).join('\n'));
    lines.push('');
  }

  if (session.claudeSentiment) {
    const s = session.claudeSentiment;
    lines.push('=== STIMMUNGSANALYSE ===');
    if (s.overall)  lines.push('Gesamt: ' + s.overall);
    if (s.speakerA) lines.push((session.speakerA || 'A') + ': ' + s.speakerA);
    if (s.speakerB) lines.push((session.speakerB || 'B') + ': ' + s.speakerB);
    lines.push('');
  }

  if (session.claudeTopics?.length) {
    lines.push('=== THEMEN ===');
    session.claudeTopics.forEach(t => lines.push('- ' + (typeof t === 'string' ? t : t.text)));
    lines.push('');
  }

  if (session.claudeChapters?.length) {
    lines.push('=== KAPITEL ===');
    session.claudeChapters.forEach(c => lines.push(`${formatMs(c.start)}  ${c.title}`));
    if (session.claudeChapterSynthesis) lines.push('\nGesamtbild:\n' + session.claudeChapterSynthesis);
    lines.push('');
  }

  if (session.claude360) {
    lines.push('=== 360°-AUSWERTUNG ===');
    lines.push(typeof session.claude360 === 'string' ? session.claude360 : JSON.stringify(session.claude360, null, 2));
    lines.push('');
  }

  if (session.customResults) {
    Object.entries(session.customResults).forEach(([id, entry]) => {
      lines.push(`=== ${entry.name || id} ===`);
      lines.push(entry.result || '');
      lines.push('');
    });
  }

  return lines.join('\n').trim();
}

// Rendert alle gespeicherten Follow-Up-Nachrichten ins Panel
function renderFollowUpMessages(session) {
  const container = document.getElementById('followUpMessages');
  if (!container) return;
  const msgs = session?.claudeFollowUp || [];
  if (!msgs.length) {
    container.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">Noch keine Fragen gestellt – tippe unten eine Folgefrage ein.</span>';
    return;
  }
  container.innerHTML = msgs.map(m => `
    <div style="margin-bottom:16px">
      <div style="font-size:0.78rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Deine Frage</div>
      <div style="background:var(--surface2);border-radius:8px;padding:10px 14px;font-size:0.9rem">${escHtml(m.question)}</div>
    </div>
    <div style="margin-bottom:24px">
      <div style="font-size:0.78rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Claude</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:0.9rem;white-space:pre-wrap;line-height:1.6">${escHtml(m.answer)}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

async function askFollowUp() {
  const session = getSession(currentSessionId);
  if (!session) { showToast('Keine aktive Sitzung.', 'warning'); return; }

  const input = document.getElementById('followUpInput');
  const btn   = document.getElementById('askSendBtn'); // v4.77: war followUpSendBtn (altes Modal)
  const question = input?.value?.trim();
  if (!question) { showToast('Bitte erst eine Frage eingeben.', 'warning'); return; }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const analysisContext = _buildFollowUpContext(session);
  if (!analysisContext) { showToast('Noch keine Analysen vorhanden – bitte erst Analysen durchführen.', 'warning'); return; }

  // UI: Lade-Zustand
  btn.disabled = true;
  btn.innerHTML = icon('loader', 13, 'margin-right:5px') + ' Analysiere…';

  const { forward, reverse } = buildAnonMap(session);
  const transcript = buildTranscriptText(session);

  const personaId = document.getElementById('followupPersonaSelect')?.value || '';
  const personaPrefix = typeof _buildPersonaPrefix === 'function' ? _buildPersonaPrefix(personaId) : '';
  const prompt = personaPrefix + getEditablePromptText('builtin_followup')
    .replace(/\{\{analyseContext\}\}/g, analysisContext)
    .replace(/\{\{transcript\}\}/g, trimTranscript(transcript, 100000))
    .replace(/\{\{question\}\}/g, question);

  try {
    const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
    addTokensToSession(session, inputTokens, outputTokens);
    const answer = deanonymizeObject(text, reverse);

    if (!session.claudeFollowUp) session.claudeFollowUp = [];
    session.claudeFollowUp.push({ question, answer, ts: new Date().toISOString() });

    saveSessions();
    await saveToArchive(session);
    renderFollowUpMessages(session);
    if (input) input.value = '';
  } catch (e) {
    showToast('Fehler: ' + (e.message || 'Unbekannt'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon('send', 13, 'margin-right:5px') + ' Senden';
  }
}

function exportToClaudeDesign() {
  const session = getSession(currentSessionId);
  if (!session?.claudePresentation?.data) {
    showToast('Erst Design generieren.', 'warning');
    return;
  }

  const json      = session.claudePresentation.data;
  const promptId  = session.claudePresentation.promptId || 'builtin_canva_presentation';
  const promptDef = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === promptId);
  const typeLabel = {
    builtin_canva_presentation: 'Präsentation',
    builtin_canva_summary:      'OnePager',
    builtin_canva_action:       'Aktionsplan',
    builtin_canva_flyer:        'Flyer',
    builtin_canva_poster:       'Poster',
    builtin_canva_social:       'Social Media Post'
  }[promptId] || 'Design';

  // Prompt für Claude Design aufbauen
  const lines = [];
  lines.push(`Erstelle eine ${typeLabel} mit folgendem Inhalt. Verwende mein Brand Kit / CI für Farben, Schriften und Logo.`);
  lines.push('');
  lines.push(`Titel: ${json.title || ''}`);
  if (json.subtitle) lines.push(`Untertitel: ${json.subtitle}`);
  lines.push('');
  (json.slides || []).forEach((s, i) => {
    lines.push(`## ${s.heading || 'Abschnitt ' + (i + 1)}`);
    (s.bullets || []).forEach(b => lines.push(`- ${b}`));
    if (s.note) lines.push(`*(Notiz: ${s.note})*`);
    lines.push('');
  });

  const prompt = lines.join('\n');

  navigator.clipboard.writeText(prompt).then(() => {
    // claude.ai/design in neuem Tab öffnen
    window.open('https://claude.ai/design', '_blank');

    showToast('Prompt kopiert — in Claude Design einfügen (⌘V)', 'success');

    // Hinweis-Box aktualisieren
    const preview = document.getElementById('canvaPreview');
    if (preview) {
      const old = preview.querySelector('.design-hint');
      if (old) old.remove();
      const hint = document.createElement('div');
      hint.className = 'design-hint';
      hint.style.cssText = 'margin-top:14px;padding:14px 16px;background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.3);border-radius:10px;font-size:0.83rem;line-height:1.8';
      hint.innerHTML = `<strong style="color:var(--accent)">✓ claude.ai/design wurde geöffnet</strong><br>
        Füge den kopierten Prompt ein <strong>(⌘V / Strg+V)</strong>.<br>
        Nach der Erstellung: Share-Link kopieren und unten einfügen ↓`;
      preview.appendChild(hint);
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [hint] });
    }
  }).catch(() => {
    window.open('https://claude.ai/design', '_blank');
    showToast('Clipboard-Zugriff verweigert — Prompt manuell kopieren.', 'warning');
  });
}

// Share-Link vom Nutzer speichern
function saveDesignLink() {
  const session = getSession(currentSessionId);
  if (!session) return;
  const input = document.getElementById('designLinkInput');
  const url   = input?.value?.trim();
  if (!url) { showToast('Bitte Link eingeben.', 'warning'); return; }
  if (!url.startsWith('http')) { showToast('Kein gültiger Link.', 'warning'); return; }

  if (!session.claudeDesignLinks) session.claudeDesignLinks = [];
  const label = session.claudePresentation?.data?.title || new Date().toLocaleDateString('de-DE');
  session.claudeDesignLinks.unshift({ url, label, ts: new Date().toISOString() });
  saveSessions();
  saveToArchive(session);
  if (input) input.value = '';
  renderDesignLinks(session);
  showToast('Design-Link gespeichert ✓', 'success');
}

// Gespeicherte Links rendern
function renderDesignLinks(session) {
  const container = document.getElementById('designLinksContainer');
  if (!container) return;
  const links = session?.claudeDesignLinks || [];
  if (!links.length) {
    container.innerHTML = '<span style="color:var(--muted);font-size:0.8rem">Noch kein Design-Link gespeichert.</span>';
    return;
  }
  container.innerHTML = links.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <a href="${escHtml(l.url)}" target="_blank" rel="noopener"
         style="flex:1;font-size:0.83rem;color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:6px;
                background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
        ${icon('external-link',12,'flex-shrink:0')} ${escHtml(l.label)}
        <span style="color:var(--muted);font-size:0.72rem;margin-left:auto;flex-shrink:0">${new Date(l.ts).toLocaleDateString('de-DE')}</span>
      </a>
      <button onclick="removeDesignLink(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;flex-shrink:0" title="Entfernen">
        ${icon('x',13)}
      </button>
    </div>`).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

function removeDesignLink(idx) {
  const session = getSession(currentSessionId);
  if (!session?.claudeDesignLinks) return;
  session.claudeDesignLinks.splice(idx, 1);
  saveSessions();
  saveToArchive(session);
  renderDesignLinks(session);
}

function clearFollowUp() {
  const session = getSession(currentSessionId);
  if (!session) return;
  if (!session.claudeFollowUp?.length) return;
  session.claudeFollowUp = [];
  saveSessions();
  saveToArchive(session);
  renderFollowUpMessages(session);
  showToast('Folgegespräch gelöscht', 'ok');
}

// ── Präsentation erstellen (Canva / pptx) ─────────────────────────────────

async function generatePresentation() {
  const session = getSession(currentSessionId);
  if (!session) { showToast('Keine aktive Sitzung.', 'warning'); return; }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const promptId = document.getElementById('canvaPromptSelect')?.value || 'builtin_canva_presentation';
  const btn      = document.getElementById('canvaGenerateBtn');
  const preview  = document.getElementById('canvaPreview');
  const exportBtn = document.getElementById('canvaExportBtn');

  const analysisContext = _buildFollowUpContext(session);
  if (!analysisContext) {
    showToast('Noch keine Analysen vorhanden – bitte erst Analysen durchführen.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = icon('loader', 13, 'margin-right:5px') + ' Generiere…';
  preview.innerHTML = `<div style="color:var(--muted);font-size:0.85rem;padding:8px 0">Claude strukturiert die Inhalte…</div>`;
  if (exportBtn) exportBtn.style.display = 'none';

  const { forward, reverse } = buildAnonMap(session);
  const transcript = buildTranscriptText(session);
  const dateStr = session.date ? new Date(session.date).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE');

  const prompt = getEditablePromptText(promptId)
    .replace(/\{\{analyseContext\}\}/g, analysisContext)
    .replace(/\{\{transcript\}\}/g, trimTranscript(transcript, 80000))
    .replace(/\{\{date\}\}/g, dateStr);

  try {
    const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
    addTokensToSession(session, inputTokens, outputTokens);
    const raw = deanonymizeObject(text, reverse);
    const json = JSON.parse(extractJSON(raw, '{'));

    session.claudePresentation = { promptId, data: json, ts: new Date().toISOString() };
    saveSessions();
    await saveToArchive(session);

    _renderPresentationPreview(json, preview);
    if (exportBtn) exportBtn.style.display = 'inline-flex';
    const transferBtn2 = document.getElementById('canvaTransferBtn');
    if (transferBtn2) transferBtn2.style.display = 'inline-flex';
    renderDesignLinks(session);
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [preview] });
    showToast('Präsentation erstellt', 'success');
  } catch (e) {
    preview.innerHTML = `<div style="color:var(--red);font-size:0.85rem">${escHtml(e.message || 'Fehler')}</div>`;
    showToast('Fehler: ' + (e.message || 'Unbekannt'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon('sparkles', 13, 'margin-right:5px') + ' Generieren';
  }
}

function _renderPresentationPreview(json, container) {
  if (!json?.slides?.length) { container.innerHTML = '<div style="color:var(--muted)">Keine Folien generiert.</div>'; return; }
  const slides = json.slides.map((s, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="font-size:0.7rem;color:var(--muted);margin-bottom:4px">Folie ${i + 1}</div>
      <div style="font-size:0.9rem;font-weight:700;color:var(--accent);margin-bottom:8px">${escHtml(s.heading || '')}</div>
      ${(s.bullets||[]).map(b => `<div style="font-size:0.83rem;color:var(--text);padding:2px 0;display:flex;gap:7px"><span style="color:var(--muted);flex-shrink:0">·</span>${escHtml(b)}</div>`).join('')}
      ${s.note ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:8px;font-style:italic">📝 ${escHtml(s.note)}</div>` : ''}
    </div>`).join('');
  container.innerHTML = `
    <div style="padding:4px 0 8px">
      <div style="font-size:1rem;font-weight:700;margin-bottom:2px">${escHtml(json.title || '')}</div>
      ${json.subtitle ? `<div style="font-size:0.8rem;color:var(--muted);margin-bottom:14px">${escHtml(json.subtitle)}</div>` : '<div style="margin-bottom:14px"></div>'}
      ${slides}
    </div>`;
}

async function exportPresentationPptx() {
  const session = getSession(currentSessionId);
  if (!session?.claudePresentation?.data) { showToast('Erst Präsentation generieren.', 'warning'); return; }
  if (typeof PptxGenJS === 'undefined') { showToast('PptxGenJS wird noch geladen…', 'warning'); return; }

  const json  = session.claudePresentation.data;
  const pptx  = new PptxGenJS();

  // Basis-Layout
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title  = json.title || 'Präsentation';

  // Titelfolie
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F0E17' };
  titleSlide.addText(json.title || '', {
    x: 0.8, y: 1.8, w: '85%', h: 1.2,
    fontSize: 36, bold: true, color: '6C63FF', fontFace: 'Calibri'
  });
  if (json.subtitle) {
    titleSlide.addText(json.subtitle, {
      x: 0.8, y: 3.2, w: '85%', h: 0.5,
      fontSize: 16, color: '94A3B8', fontFace: 'Calibri'
    });
  }

  // Inhaltsfolien
  const accentColors = ['6C63FF', 'A78BFA', '34D399', 'F59E0B', 'F472B6', '60A5FA', 'FB923C'];
  (json.slides || []).forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: '0F0E17' };
    const col = accentColors[i % accentColors.length];

    // Überschrift
    slide.addText(s.heading || '', {
      x: 0.6, y: 0.4, w: '90%', h: 0.7,
      fontSize: 24, bold: true, color: col, fontFace: 'Calibri'
    });
    // Trennlinie
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6, y: 1.15, w: 8.8, h: 0,
      line: { color: col, width: 1.5, transparency: 60 }
    });
    // Bullet Points
    const bullets = (s.bullets || []).map(b => ({ text: b, options: { bullet: { code: '2022' }, color: 'E2E8F0', fontSize: 14 } }));
    if (bullets.length) {
      slide.addText(bullets, {
        x: 0.6, y: 1.35, w: '90%', h: 4.5,
        fontFace: 'Calibri', lineSpacingMultiple: 1.4
      });
    }
    // Sprechernotiz
    if (s.note) slide.addNotes(s.note);
  });

  const slug = (session.label || 'praesentation').replace(/[^a-z0-9äöüß\s]/gi, '').trim().replace(/\s+/g, '-');
  await pptx.writeFile({ fileName: `${slug}.pptx` });
  showToast('.pptx heruntergeladen', 'success');
}

function renderUtterances(session) {
  const container = document.getElementById('utterancesContainer');
  const tBlock = document.getElementById('transcriptBlock');
  container.innerHTML = '';

  if (!session.utterances || session.utterances.length === 0) {
    if (tBlock) tBlock.style.display = 'none';
    container.innerHTML = '<p style="color:var(--muted); font-size:0.85rem">Keine Sprecherabschnitte gefunden.</p>';
    return;
  }
  // Transkript-Block einblenden (beim ersten Mal zugeklappt)
  if (tBlock) {
    if (tBlock.style.display === 'none' || tBlock.style.display === '') {
      tBlock.classList.add('collapsed');
    }
    tBlock.style.display = 'block';
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
      <div class="utterance-speaker-wrap">
        <div class="utterance-speaker" title="Nur diese Passage tauschen"
             style="cursor:pointer; user-select:none;"
             onclick="toggleUtteranceSpeaker(${idx})">
          <span class="utterance-speaker-dot" style="background:${color}"></span>
          <span style="color:${color}">${escHtml(name)}</span>
          <span style="font-size:0.65rem; color:var(--muted); margin-left:2px">⇄</span>
        </div>
        <button class="utt-swap-from-btn" title="Ab hier alle folgenden tauschen"
          onclick="swapSpeakersFromIndex(${idx})"
          style="display:none;background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);font-size:0.68rem;padding:1px 6px;cursor:pointer;margin-left:4px;white-space:nowrap">
          ↓ ab hier
        </button>
      </div>
      <div class="utterance-body">
        <div class="utterance-text">${escHtml(u.text)}</div>
        <div class="utterance-time" title="Zur Stelle springen" onclick="seekAudio(${u.start})">${formatMs(u.start)} – ${formatMs(u.end)} ▶</div>
      </div>
    `;
    container.appendChild(div);
  });

  currentSessionId = session.id;
  // Suchfeld leeren wenn neue Sitzung geladen
  const searchInput = document.getElementById('transcriptSearch');
  if (searchInput) searchInput.value = '';
}

function filterTranscript(query) {
  const container = document.getElementById('utterancesContainer');
  if (!container) return;
  const q = query.trim().toLowerCase();
  let firstMatch = null;
  container.querySelectorAll('.utterance').forEach(div => {
    const textEl = div.querySelector('.utterance-text');
    if (!textEl) return;
    const raw = textEl.dataset.rawText || textEl.textContent;
    if (!textEl.dataset.rawText) textEl.dataset.rawText = raw; // Cache original
    if (!q) {
      textEl.innerHTML = escHtml(raw);
      div.style.display = '';
      return;
    }
    const idx = raw.toLowerCase().indexOf(q);
    if (idx === -1) {
      div.style.display = 'none';
    } else {
      div.style.display = '';
      // Highlight
      const before = escHtml(raw.slice(0, idx));
      const match  = escHtml(raw.slice(idx, idx + q.length));
      const after  = escHtml(raw.slice(idx + q.length));
      textEl.innerHTML = `${before}<mark style="background:var(--accent); color:#fff; border-radius:3px; padding:0 2px">${match}</mark>${after}`;
      if (!firstMatch) firstMatch = div;
    }
  });
  if (firstMatch) firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ═══════════════════════════════════════════════════

// SPRECHER KORREKTUR
// ═══════════════════════════════════════════════════
function renameSpeaker(speaker, newName) {
  const s = getSession();
  if (!s || !newName.trim()) return;
  // Multi-Sprecher (Samsung Import): speakers-Array aktualisieren
  if (s.speakers && s.speakers.length > 0) {
    const sp = s.speakers.find(p => p.id === speaker);
    if (sp) sp.name = newName.trim();
  }
  // Immer auch speakerA/speakerB für Kompatibilität pflegen
  if (speaker === 'A') s.speakerA = newName.trim();
  else if (speaker === 'B') s.speakerB = newName.trim();
  saveSessions();
  saveToArchive(s);
  // Pflichtpfad: Required-Highlight entfernen, Status aktualisieren
  const el = document.getElementById(speaker === 'A' ? 'editSpeakerA' : 'editSpeakerB');
  if (el) el.classList.remove('input-required');
  updateSpeakerStatus();
  // Nur Utterances neu rendern, nicht die Inputs (die hat der User gerade editiert)
  renderUtterances(s);
  showToast(`Sprecher ${speaker} → „${newName.trim()}" ✓`, 'success');
}

// Zeigt Umbenennung für Sprecher C, D, … (Samsung Multi-Speaker)
function renderExtraSpeakerFields(session) {
  const container = document.getElementById('extraSpeakerFields');
  if (!container) return;

  const extra = (session.speakers || []).filter(sp => sp.id !== 'A' && sp.id !== 'B');
  if (extra.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const colors = { C: 'var(--speaker-c)', D: 'var(--speaker-d)' };
  container.innerHTML = extra.map(sp => `
    <div class="speaker-name-field" style="margin-bottom:8px">
      <span class="speaker-name-dot" style="background:${colors[sp.id] || 'var(--speaker-extra)'}"></span>
      <input
        class="speaker-name-input"
        placeholder="Sprecher ${sp.id}"
        value="${(sp.name || sp.label || '').replace(/"/g, '&quot;')}"
        onchange="renameSpeaker('${sp.id}', this.value)"
        onkeydown="if(event.key==='Enter') this.blur()"
        style="border-color:${colors[sp.id] || 'var(--speaker-extra)'}22"
      />
    </div>
  `).join('');
  container.style.display = '';
}

function swapAllSpeakers() {
  const s = getSession();
  if (!s || !s.utterances) return;
  if (!confirm(
    `Sprecher A und B vollständig tauschen?\n\n` +
    `A: "${s.speakerA || 'Sprecher A'}" → wird B\n` +
    `B: "${s.speakerB || 'Sprecher B'}" → wird A\n\n` +
    `Alle Utterances werden umgekehrt. Dies wird gespeichert.`
  )) return;

  // 1. Namen tauschen
  const tmp = s.speakerA; s.speakerA = s.speakerB; s.speakerB = tmp;

  // 2. Alle utterances tauschen – das ist der entscheidende Teil
  s.utterances.forEach(u => {
    if (u.speaker === 'A') u.speaker = 'B';
    else if (u.speaker === 'B') u.speaker = 'A';
  });

  // 3. Speichern (lokal + Drive)
  saveSessions();
  saveToArchive(s);

  // 4. UI aktualisieren
  const elA = document.getElementById('editSpeakerA');
  const elB = document.getElementById('editSpeakerB');
  if (elA) elA.value = s.speakerA || 'Sprecher A';
  if (elB) elB.value = s.speakerB || 'Sprecher B';
  renderUtterances(s);
  showToast('Sprecher A ↔ B vollständig getauscht ✓', 'success');
}

function swapSpeakersFromIndex(idx) {
  const s = getSession();
  if (!s || !s.utterances) return;
  const count = s.utterances.length - idx;
  if (!confirm(`Ab dieser Passage alle ${count} folgenden Abschnitte tauschen?\n\nA ↔ B von hier bis zum Ende.`)) return;
  for (let i = idx; i < s.utterances.length; i++) {
    s.utterances[i].speaker = s.utterances[i].speaker === 'A' ? 'B' : 'A';
  }
  saveSessions();
  saveToArchive(s);
  renderUtterances(s);
  showToast(`${count} Abschnitte ab hier getauscht ✓`, 'success');
}

function toggleUtteranceSpeaker(idx) {
  const s = getSession();
  if (!s || !s.utterances[idx]) return;
  s.utterances[idx].speaker = s.utterances[idx].speaker === 'A' ? 'B' : 'A';
  saveSessions();
  saveToArchive(s);
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


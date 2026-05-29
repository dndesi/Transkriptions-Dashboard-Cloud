// ═══════════════════════════════════════════════════
// FEATURES.JS – Neue Funktionen v3.0
// 360°-Analyse · Ask Your Recording · Mind Map · Eigene Vorlagen
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// 360°-AUSWERTUNG
// ═══════════════════════════════════════════════════

async function analyse360(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';

  // Editierbaren Prompt aus Bibliothek holen (oder Default)
  const defaultPrompt = `Du bist ein erfahrener Kommunikations- und Konfliktanalyst. Analysiere dieses Gespräch aus vier verschiedenen Perspektiven. Gehe dabei wirklich in die Tiefe – nicht nur Oberfläche.
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
}`;

  let prompt = (typeof getEditablePromptText === 'function' && getEditablePromptText('builtin_360')) || defaultPrompt;

  prompt = prompt
    .replace(/\{\{transkript\}\}/gi, trimTranscript(transcript, 300000))
    .replace(/\{\{transcript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{speakerA\}\}/gi,    speakerA)
    .replace(/\{\{speakerB\}\}/gi,    speakerB);
  if (!/\{\{transkript\}\}|\{\{transcript\}\}/i.test(prompt) && !prompt.includes(trimTranscript(transcript, 300000).slice(0, 20))) {
    prompt += `\n\nTranskript:\n${trimTranscript(transcript, 300000)}`;
  }

  const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
  addTokensToSession(session, inputTokens, outputTokens);
  const json = deanonymizeObject(JSON.parse(extractJSON(text, '{')), reverse);
  session.claude360 = {
    meineAufgaben:       json.meineAufgaben       || { titel: `Perspektive: ${speakerA}`, punkte: [] },
    andereErwartungen:   json.andereErwartungen   || { titel: `Perspektive: ${speakerB}`, punkte: [] },
    emotionaleEbene:     json.emotionaleEbene     || { titel: 'Emotionale Ebene',          punkte: [] },
    strategischeEbene:   json.strategischeEbene   || { titel: 'Strategische Perspektive',  punkte: [] }
  };
}

function render360Block(session) {
  const block   = document.getElementById('block360');
  const content = document.getElementById('content360');
  if (!block || !content) return;

  const d = session.claude360;
  if (!d) { block.style.display = 'none'; return; }

  const perspIcons = {
    meineAufgaben:     icon('target',14,'margin-right:5px'),
    andereErwartungen: icon('user',14,'margin-right:5px'),
    emotionaleEbene:   icon('heart',14,'margin-right:5px'),
    strategischeEbene: icon('layers',14,'margin-right:5px'),
  };
  const perspectives = [
    { key: 'meineAufgaben',     color: 'var(--accent)' },
    { key: 'andereErwartungen', color: 'var(--speaker-b)' },
    { key: 'emotionaleEbene',   color: '#818cf8' },
    { key: 'strategischeEbene', color: 'var(--green)' }
  ];

  let html = '<div class="perspectives-grid">';
  perspectives.forEach(p => {
    const data = d[p.key];
    if (!data) return;
    html += `<div class="perspective-card" style="border-top:3px solid ${p.color}">
      <div class="perspective-title">${perspIcons[p.key]} ${escHtml(data.titel)}</div>
      <ul class="perspective-list">
        ${(data.punkte || []).map(pt => `<li>${escHtml(pt)}</li>`).join('')}
      </ul>
    </div>`;
  });
  html += '</div>';

  content.innerHTML = html;
  if (typeof showInsightsBlock === 'function') {
    showInsightsBlock(block);
  } else {
    block.style.display = 'block';
  }

  // in renderInsights() sichtbar machen
  const section = document.getElementById('insightsSection');
  if (section) section.style.display = 'block';
}


// ═══════════════════════════════════════════════════
// ASK YOUR RECORDING
// ═══════════════════════════════════════════════════

let askHistory = [];

function openAskModal() {
  const s = getSession();
  if (!s || !s.utterances?.length) {
    showToast('Kein Transkript verfügbar – bitte erst transkribieren', 'error');
    return;
  }
  askHistory = [];
  renderAskHistory();
  const inp = document.getElementById('askInput');
  if (inp) inp.value = '';
  document.getElementById('askModal').classList.add('open');
  setTimeout(() => { if (inp) inp.focus(); }, 100);
}

function closeAskModal() {
  document.getElementById('askModal').classList.remove('open');
}

async function sendAskQuestion() {
  const input  = document.getElementById('askInput');
  const sendBtn = document.getElementById('askSendBtn');
  const question = input.value.trim();
  if (!question) return;

  const s = getSession();
  if (!s) return;

  input.value = '';
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  askHistory.push({ role: 'user', text: question });
  renderAskHistory();

  try {
    const { forward, reverse } = buildAnonMap(s);
    const transcript = buildTranscriptText(s);
    const historyText = askHistory.slice(0, -1)
      .map(h => `${h.role === 'user' ? 'Frage' : 'Antwort'}: ${h.text}`)
      .join('\n');

    const basePrompt = getEditablePromptText('builtin_ask')
      .replace(/\{\{sessionLabel\}\}/g, s.label)
      .replace(/\{\{transkript\}\}/g, trimTranscript(transcript, 300000));
    const prompt = basePrompt +
      (historyText ? `\nBISHERIGE FRAGEN:\n${historyText}\n` : '') +
      `\nFRAGE: ${question}`;

    const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
    addTokensToSession(s, inputTokens, outputTokens);
    saveSessions();

    askHistory.push({ role: 'assistant', text: deanonymizeText(text, reverse) });
  } catch(e) {
    askHistory.push({ role: 'error', text: e.message });
  } finally {
    renderAskHistory();
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function renderAskHistory() {
  const container = document.getElementById('askChatHistory');
  if (!container) return;

  if (!askHistory.length) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted); padding:32px 16px; font-size:0.85rem">
      Stelle eine Frage zu diesem Gespräch.<br>
      <span style="font-size:0.78rem; opacity:0.7">z.B. „Was hat Max über das Budget gesagt?"</span>
    </div>`;
    return;
  }

  container.innerHTML = askHistory.map(h => {
    if (h.role === 'user') {
      return `<div class="ask-bubble ask-user"><div class="ask-bubble-label">Du</div><div>${escHtml(h.text)}</div></div>`;
    } else if (h.role === 'assistant') {
      // Zeitstempel klickbar machen [MM:SS]
      const withLinks = escHtml(h.text).replace(/\[(\d{1,2}:\d{2})\]/g, (match, ts) => {
        const parts = ts.split(':').map(Number);
        const ms = (parts[0] * 60 + parts[1]) * 1000;
        return `<a href="#" onclick="event.preventDefault(); seekAudio(${ms}); closeAskModal();" style="color:var(--accent); font-weight:600; text-decoration:none;">[${ts} ▶]</a>`;
      });
      return `<div class="ask-bubble ask-claude"><div class="ask-bubble-label">Claude</div><div style="line-height:1.6">${withLinks}</div></div>`;
    } else {
      return `<div class="ask-bubble ask-error">${icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)')} ${escHtml(h.text)}</div>`;
    }
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function askInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAskQuestion();
  }
}


// ═══════════════════════════════════════════════════
// MIND MAP (Mermaid.js)
// ═══════════════════════════════════════════════════

// Haupt-Einstiegspunkt: Cache prüfen, sonst neu generieren
async function generateAndShowMindMap() {
  const s = getSession();
  if (!s || !s.utterances?.length) {
    showToast('Kein Transkript verfügbar', 'error');
    return;
  }
  // Cache: bereits vorhanden → direkt anzeigen
  if (s.claudeMindmap) {
    renderMindmapPanel(s.claudeMindmap);
    // Akkordeon öffnen
    const panel = document.getElementById('accMindmap');
    if (panel && !panel.classList.contains('open')) toggleAccPanel('accMindmap');
    showToast('Mind Map geladen (gecacht)', 'info');
    return;
  }
  await _fetchAndStoreMindmap(s);
}

// Neu generieren (aus dem Akkordeon-Panel heraus)
async function regenerateMindmap() {
  const s = getSession();
  if (!s || !s.utterances?.length) { showToast('Kein Transkript verfügbar', 'error'); return; }
  await _fetchAndStoreMindmap(s);
}

async function _fetchAndStoreMindmap(s) {
  const btn    = document.getElementById('mindmapBtn');
  const reBtn  = document.getElementById('mindmapRegenBtn');
  const setBusy = (busy) => {
    if (btn)   { btn.disabled   = busy; btn.innerHTML   = busy ? icon('loader',12,'margin-right:5px') + ' Generiere…' : icon('git-branch',12,'margin-right:5px') + ' Mind Map'; }
    if (reBtn) { reBtn.disabled = busy; reBtn.innerHTML = busy ? icon('loader',12,'margin-right:5px') + ' …' : icon('refresh-cw',13,'margin-right:4px') + ' Neu generieren'; }
  };
  setBusy(true);
  try {
    const { forward, reverse } = buildAnonMap(s);
    const transcript = buildTranscriptText(s);
    const prompt = getEditablePromptText('builtin_mindmap')
      .replace(/\{\{transkript\}\}/g, trimTranscript(transcript, 300000));
    const { text: rawText, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward));
    const text = deanonymizeText(rawText, reverse);
    addTokensToSession(s, inputTokens, outputTokens);
    let mermaidCode = text.trim().replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim();
    s.claudeMindmap = mermaidCode;
    saveSessions();
    renderMindmapPanel(mermaidCode);
    // Akkordeon öffnen
    const panel = document.getElementById('accMindmap');
    if (panel && !panel.classList.contains('open')) toggleAccPanel('accMindmap');
    showToast('Mind Map erstellt', 'success');
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
  } finally {
    setBusy(false);
  }
}

// Rendert den Mermaid-Code ins Akkordeon-Panel
function renderMindmapPanel(code) {
  const container = document.getElementById('mindmapPanelRender');
  if (!container) return;
  container.innerHTML = `<pre class="mermaid">${escHtml(code)}</pre>`;
  if (window.mermaid) {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark'
      });
      mermaid.run({ nodes: container.querySelectorAll('.mermaid') });
    } catch(e) {
      container.innerHTML = `<pre style="color:var(--red);font-size:0.78rem;white-space:pre-wrap">${escHtml(e.message)}\n\n${escHtml(code)}</pre>`;
    }
  }
}

// Export SVG
function exportMindmapSvg() {
  const container = document.getElementById('mindmapPanelRender');
  const svgEl = container?.querySelector('svg');
  if (!svgEl) { showToast('Erst Mind Map generieren', 'error'); return; }
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const s = getSession();
  a.href = url; a.download = (s?.label || 'mindmap') + '.svg';
  a.click(); URL.revokeObjectURL(url);
}

// Export PDF (via Print-Dialog mit SVG-only-Seite)
function exportMindmapPdf() {
  const container = document.getElementById('mindmapPanelRender');
  const svgEl = container?.querySelector('svg');
  if (!svgEl) { showToast('Erst Mind Map generieren', 'error'); return; }
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const s = getSession();
  const title = escHtml(s?.label || 'Mind Map');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{margin:20px;font-family:sans-serif} h1{font-size:16px;margin-bottom:12px} svg{max-width:100%;height:auto} @media print{@page{size:A4 landscape;margin:15mm}}</style>
    </head><body><h1>${title} – Mind Map</h1>${svgStr}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) { showToast('Pop-up blockiert – bitte erlauben', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

// Modal (Legacy – bleibt für Rückwärtskompatibilität)
function openMindMapModal(code, label) {
  const titleEl  = document.getElementById('mindmapTitle');
  const codeEl   = document.getElementById('mindmapCode');
  const renderEl = document.getElementById('mindmapRender');
  if (titleEl)  titleEl.textContent = label || 'Mind Map';
  if (codeEl)   codeEl.textContent  = code;
  if (renderEl) {
    renderEl.innerHTML = `<pre class="mermaid">${escHtml(code)}</pre>`;
    if (window.mermaid) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark' });
        mermaid.run({ nodes: renderEl.querySelectorAll('.mermaid') });
      } catch(e) {
        renderEl.innerHTML = `<pre style="color:var(--red);font-size:0.78rem;white-space:pre-wrap">${escHtml(e.message)}\n\n${escHtml(code)}</pre>`;
      }
    }
  }
  document.getElementById('mindmapModal')?.classList.add('open');
}
function closeMindMapModal() { document.getElementById('mindmapModal')?.classList.remove('open'); }
function copyMindMapCode() {
  const code = document.getElementById('mindmapCode')?.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => showToast('Mermaid-Code kopiert', 'success'));
}
function showExistingMindMap() {
  const s = getSession();
  if (!s?.claudeMindmap) return;
  renderMindmapPanel(s.claudeMindmap);
}


// ═══════════════════════════════════════════════════
// EIGENE VORLAGEN (Custom Templates)
// ═══════════════════════════════════════════════════

function loadCustomTemplates() {
  try { return JSON.parse(localStorage.getItem('customTemplates') || '[]'); } catch { return []; }
}

function saveCustomTemplatesData(templates) {
  localStorage.setItem('customTemplates', JSON.stringify(templates));
}

function openTemplatesModal() {
  renderTemplatesList();
  const nameEl   = document.getElementById('newTemplateName');
  const promptEl = document.getElementById('newTemplatePrompt');
  if (nameEl)   nameEl.value   = '';
  if (promptEl) promptEl.value = '';
  document.getElementById('templatesModal').classList.add('open');
}

function closeTemplatesModal() {
  document.getElementById('templatesModal').classList.remove('open');
}

function addCustomTemplate() {
  const name   = document.getElementById('newTemplateName')?.value.trim();
  const prompt = document.getElementById('newTemplatePrompt')?.value.trim();
  if (!name || !prompt) {
    showToast('Name und Anweisung sind erforderlich', 'error');
    return;
  }
  const templates = loadCustomTemplates();
  templates.push({ id: Date.now().toString(), name, prompt });
  saveCustomTemplatesData(templates);
  renderTemplatesList();
  document.getElementById('newTemplateName').value   = '';
  document.getElementById('newTemplatePrompt').value = '';
  showToast('Vorlage gespeichert', 'success');
  updateCustomTemplatePopovers();
}

function deleteCustomTemplate(id) {
  const templates = loadCustomTemplates().filter(t => t.id !== id);
  saveCustomTemplatesData(templates);
  renderTemplatesList();
  updateCustomTemplatePopovers();
  showToast('Vorlage gelöscht', 'ok');
}

function renderTemplatesList() {
  const container = document.getElementById('customTemplatesList');
  if (!container) return;
  const templates = loadCustomTemplates();
  if (!templates.length) {
    container.innerHTML = '<p style="color:var(--muted); font-size:0.82rem; text-align:center; padding:16px 0">Noch keine eigenen Vorlagen angelegt.</p>';
    return;
  }
  container.innerHTML = templates.map(t => `
    <div class="template-item">
      <div>
        <div class="template-item-name">${icon('clipboard',13,'margin-right:5px')} ${escHtml(t.name)}</div>
        <div class="template-item-prompt">${escHtml(t.prompt.slice(0, 100))}${t.prompt.length > 100 ? '…' : ''}</div>
      </div>
      <button class="template-item-del" onclick="deleteCustomTemplate('${t.id}')">${icon('trash-2',13)}</button>
    </div>
  `).join('');
}

function updateCustomTemplatePopovers() {
  const templates  = loadCustomTemplates();
  const containers = document.querySelectorAll('.custom-tpl-slot');
  containers.forEach(container => {
    if (!templates.length) { container.innerHTML = ''; return; }
    container.innerHTML = `<div class="popover-divider" style="margin:6px 0; border-top:1px solid var(--border)"></div>
      <div style="font-size:0.7rem; color:var(--muted); padding:4px 12px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em">Eigene Vorlagen</div>` +
      templates.map(t => `
        <button class="tpl-row" onclick="sendToClaudeCustom('${t.id}')">
          <span class="tpl-icon">${icon('clipboard',13)}</span>
          <span class="tpl-text">
            <div class="tpl-name">${escHtml(t.name)}</div>
            <div class="tpl-desc">Eigene Vorlage</div>
          </span>
        </button>
      `).join('');
  });
}

async function sendToClaudeCustom(templateId) {
  document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  const templates = loadCustomTemplates();
  const tpl = templates.find(t => t.id === templateId);
  if (!tpl) return;

  const s = getSession();
  if (!s) return;

  const transcript = buildTranscriptText(s);
  const content = `TRANSKRIPT: ${s.label}\nDatum: ${new Date(s.date).toLocaleString('de-DE')}\nSprecher A = ${s.speakerA} | Sprecher B = ${s.speakerB}\n${'─'.repeat(50)}\n${transcript}\n\n${tpl.prompt}`;

  try {
    await navigator.clipboard.writeText(content);
    showToast(`„${tpl.name}" kopiert – in Claude einfügen ✓`, 'success');
  } catch {
    showToast('Kopieren fehlgeschlagen', 'error');
  }
}

// Beim App-Start: Popovers mit gespeicherten Vorlagen befüllen
function initFeatures() {
  updateCustomTemplatePopovers();
}

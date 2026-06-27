// ═══════════════════════════════════════════════════
// FEATURES.JS – Neue Funktionen v3.0
// 360°-Analyse · Ask Your Recording · Mind Map · Eigene Vorlagen
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// 360°-AUSWERTUNG
// ═══════════════════════════════════════════════════

async function analyse360(session, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || ownerName || 'Ich';
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
  if (!d) { block.style.display = 'none'; block.dataset.hasContent = '0'; return; }

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

  // Tab-Leiste aktualisieren, damit 360°-Tab erscheint
  if (typeof _refreshAnalysenSubtabs === 'function') _refreshAnalysenSubtabs();
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
  // v4.74: Sidebar statt Modal
  if (typeof setSidebarMode === 'function') setSidebarMode('gespraechschat');
}

function closeAskModal() {
  // v4.74: Sidebar schließen statt Modal
  if (typeof closeSessionSidebar === 'function') closeSessionSidebar();
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

    const personaId = document.getElementById('askPersonaSelect')?.value || '';
    // v5.73: Rolle als System-Prompt (gleich wie Analyse-Chat)
    const systemPrompt = typeof _buildRoleSystemPrompt === 'function' ? _buildRoleSystemPrompt(personaId) : null;
    const basePrompt = getEditablePromptText('builtin_ask')
      .replace(/\{\{sessionLabel\}\}/g, s.label)
      .replace(/\{\{transkript\}\}/g, trimTranscript(transcript, 300000));
    const prompt = basePrompt +
      (historyText ? `\nBISHERIGE FRAGEN:\n${historyText}\n` : '') +
      `\nFRAGE: ${question}`;

    const { text, inputTokens, outputTokens } = await callClaudeAPI(anonymizeText(prompt, forward), systemPrompt);
    addTokensToSession(s, inputTokens, outputTokens);
    saveSessions();
    saveToArchive(s).catch(() => {}); // Token-Kosten auf Drive speichern

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

  container.innerHTML = askHistory.map((h, i) => {
    if (h.role === 'user') {
      return `<div class="ask-bubble ask-user"><div class="ask-bubble-label">Du</div><div>${escHtml(h.text)}</div></div>`;
    } else if (h.role === 'assistant') {
      // Zeitstempel klickbar machen [MM:SS]
      const withLinks = escHtml(h.text).replace(/\[(\d{1,2}:\d{2})\]/g, (match, ts) => {
        const parts = ts.split(':').map(Number);
        const ms = (parts[0] * 60 + parts[1]) * 1000;
        return `<a href="#" onclick="event.preventDefault(); seekAudio(${ms}); closeAskModal();" style="color:var(--accent); font-weight:600; text-decoration:none;">[${ts} ▶]</a>`;
      });
      return `<div class="ask-bubble ask-claude">
        <div class="ask-bubble-label" style="display:flex;align-items:center;justify-content:space-between">
          <span>Claude</span>
          <button onclick="merkenAskAnswer(${i})"
            style="background:none;border:1px solid var(--border);border-radius:5px;padding:1px 7px;font-size:0.7rem;color:var(--accent);cursor:pointer;font-weight:400;display:inline-flex;align-items:center;gap:3px"
            title="Als Chat-Gedanke speichern">
            ${icon('bookmark',10,'pointer-events:none')} Merken
          </button>
        </div>
        <div style="line-height:1.6">${withLinks}</div>
      </div>`;
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

// v5.95: Merken im Gesprächs-Chat — sucht vorherige user-Nachricht als Frage
function merkenAskAnswer(idx) {
  const answer = askHistory[idx]?.text;
  if (!answer) return;
  // Vorherige user-Nachricht als Frage suchen
  let question = '';
  for (let i = idx - 1; i >= 0; i--) {
    if (askHistory[i].role === 'user') { question = askHistory[i].text; break; }
  }
  const sid = (typeof currentSessionId !== 'undefined') ? currentSessionId : null;
  if (!sid) return;
  _saveChatGedanke(sid, question, answer, 'gespräch', []);
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
    saveToArchive(s).catch(() => {}); // Mind Map auf Drive speichern
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

// Rendert die Mindmap als interaktiven D3 radial tree
function renderMindmapPanel(code) {
  const container = document.getElementById('mindmapPanelRender');
  if (!container) return;

  // JSON parsen (neues Format)
  let treeData = null;
  try {
    const json = JSON.parse(extractJSON(code, '{'));
    if (json && json.label) treeData = json;
  } catch (_) {}

  if (!treeData) {
    // Fallback: altes Mermaid-Format
    container.innerHTML = `<pre class="mermaid">${escHtml(code)}</pre>`;
    if (window.mermaid) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark' });
        mermaid.run({ nodes: container.querySelectorAll('.mermaid') });
      } catch(e) {
        container.innerHTML = `<pre style="color:var(--red);font-size:0.78rem;white-space:pre-wrap">${escHtml(e.message)}\n\n${escHtml(code)}</pre>`;
      }
    }
    return;
  }

  if (!window.d3) {
    container.innerHTML = `<div style="color:var(--muted);padding:16px;font-size:0.85rem">D3.js wird geladen…</div>`;
    setTimeout(() => renderMindmapPanel(code), 800);
    return;
  }

  _renderD3Mindmap(container, treeData);
}

function _renderD3Mindmap(container, data) {
  container.innerHTML = '';

  const style    = getComputedStyle(document.documentElement);
  const isDark   = document.documentElement.dataset.theme !== 'light';
  const clrText    = style.getPropertyValue('--text').trim()    || (isDark ? '#e2e8f0' : '#1a1a2e');
  const clrMuted   = style.getPropertyValue('--muted').trim()   || (isDark ? '#94a3b8' : '#64748b');
  const clrAccent  = style.getPropertyValue('--accent').trim()  || '#6c63ff';
  const clrAccent2 = style.getPropertyValue('--accent2').trim() || '#a78bfa';
  const clrBorder  = style.getPropertyValue('--border').trim()  || (isDark ? '#2d3148' : '#e2e8f0');

  const branchColors = [clrAccent, clrAccent2, '#34d399', '#f59e0b', '#f472b6', '#60a5fa', '#fb923c'];

  // Hilfsfunktion: Textbreite schätzen (großzügiger für deutsche Umlaute & lange Wörter)
  const textW = (label) => Math.max(label.length * 8 + 36, 80);

  const root = d3.hierarchy(data);

  // Branch-Farbe vererben
  root._color = clrAccent;
  root.children?.forEach((c, i) => {
    c._color = branchColors[i % branchColors.length];
    c.descendants().forEach(d => { if (!d._color) d._color = c._color; });
  });

  // Spaltenabstand dynamisch: breiteste Ebene-1-Pill + Puffer
  const maxPillW = root.children
    ? Math.max(...root.children.map(c => textW(c.data.label)))
    : 140;
  const rowGap  = 32;
  const colGap  = Math.max(maxPillW + 60, 260);

  d3.tree().nodeSize([rowGap, colGap])(root);

  // Bounding Box berechnen
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  root.each(d => {
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  });

  const padH = 48, padV = 32;
  const svgW = Math.max(container.clientWidth || 800, (maxY - minY) + 360);
  const svgH = Math.max((maxX - minX) + padV * 2, 460);

  // Offset: Root linksbündig, Baum vertikal zentriert
  const offX = padH - minY + 30;
  const offY = padV - minX;

  const svg = d3.select(container).append('svg')
    .attr('width', '100%').attr('height', svgH)
    .style('display', 'block').style('font-family', 'inherit');

  const g = svg.append('g').attr('transform', `translate(${offX},${offY})`);

  // Zoom & Pan
  svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => {
    g.attr('transform', `translate(${e.transform.x + offX},${e.transform.y + offY}) scale(${e.transform.k})`);
  }));

  // Verbindungslinien (horizontal)
  g.append('g').attr('fill', 'none')
    .selectAll('path').data(root.links()).join('path')
    .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x))
    .attr('stroke', d => d.target._color || clrBorder)
    .attr('stroke-width', d => d.target.depth === 1 ? 2.2 : 1.4)
    .attr('stroke-opacity', d => d.target.depth === 1 ? 0.6 : 0.38)
    .attr('stroke-linecap', 'round');

  // Knoten (x = vertikal, y = horizontal im horizontalen Baum)
  const node = g.append('g')
    .selectAll('g').data(root.descendants()).join('g')
    .attr('transform', d => `translate(${d.y},${d.x})`);

  // Root-Knoten: Kreis mit Label
  node.filter(d => d.depth === 0).call(sel => {
    sel.append('circle').attr('r', 28)
      .attr('fill', clrAccent).attr('fill-opacity', 0.14)
      .attr('stroke', clrAccent).attr('stroke-width', 2);
    sel.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', '12px').attr('font-weight', '700')
      .attr('fill', clrAccent)
      .text(d => d.data.label);
  });

  // Ebene 1: Pill mit Label innen
  node.filter(d => d.depth === 1).each(function(d) {
    const el  = d3.select(this);
    const lbl = d.data.label;
    const w   = textW(lbl);
    const h   = 27;
    const rx  = 9;
    // Pill startet 8px rechts vom Verbindungspunkt
    el.append('rect')
      .attr('x', 8).attr('y', -h / 2)
      .attr('width', w).attr('height', h).attr('rx', rx)
      .attr('fill', d._color).attr('fill-opacity', 0.14)
      .attr('stroke', d._color).attr('stroke-width', 1.8);
    el.append('text')
      .attr('x', 8 + w / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('font-weight', '700')
      .attr('fill', d._color)
      .attr('clip-path', null)
      .text(lbl);

  });

  // Ebene 2: Punkt + Label rechts
  node.filter(d => d.depth === 2).call(sel => {
    sel.append('circle').attr('r', 5)
      .attr('fill', d => d._color).attr('fill-opacity', 0.8);
    sel.append('text')
      .attr('x', 12).attr('dy', '0.35em')
      .attr('font-size', '10.5px').attr('font-weight', '400')
      .attr('fill', clrText).attr('fill-opacity', 0.9)
      .text(d => d.data.label);
  });

  // Ebene 3+: Mini-Punkt + Label rechts
  node.filter(d => d.depth >= 3).call(sel => {
    sel.append('circle').attr('r', 3)
      .attr('fill', clrMuted).attr('fill-opacity', 0.6);
    sel.append('text')
      .attr('x', 9).attr('dy', '0.35em')
      .attr('font-size', '9.5px').attr('fill', clrText).attr('fill-opacity', 0.78)
      .text(d => d.data.label);
  });
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

// ── Persona / Rollen-Auswahl (v4.90 / v5.71) ────────────────────────────────

// Baut den Persona-Prefix für askPersonaSelect (alle Custom Prompts, Transkript-Chat)
function _buildPersonaPrefix(promptId) {
  if (!promptId) return '';
  const prompts = typeof getCustomPrompts === 'function' ? getCustomPrompts() : [];
  const p = prompts.find(x => x.id === promptId);
  if (!p) return '';
  const parts = [];
  if (p.rolle)      parts.push(`Rolle: ${p.rolle}`);
  if (p.tonalitaet) parts.push(`Tonalität: ${p.tonalitaet}`);
  if (p.grenzen)    parts.push(`Grenzen: ${p.grenzen}`);
  if (p.kontext)    parts.push(`Kontext: ${p.kontext}`);
  return parts.length
    ? `[Persona / Systemrolle]\n${parts.join('\n')}\n\n`
    : '';
}

// v5.71: Baut den System-Prompt für followupPersonaSelect (Rollen-Kategorie)
// Liest zuerst built-in Rollen aus EDITABLE_PROMPT_DEFAULTS, dann eigene Custom-Rollen
function _buildRoleSystemPrompt(promptId) {
  if (!promptId) return null;
  // v5.93: Ausgabe-Formatierung für alle Assistenten
  const _FORMAT_RULES = '\n\nAusgabe-Format: Verwende keine Emojis und keine Sonderzeichen-Icons (★, ✓, →, ◆, • als Icon etc.).';
  // Built-in Rollen (EDITABLE_PROMPT_DEFAULTS mit category === 'rolle')
  const builtins = typeof EDITABLE_PROMPT_DEFAULTS !== 'undefined' ? EDITABLE_PROMPT_DEFAULTS : [];
  const builtin = builtins.find(p => p.id === promptId && p.category === 'rolle');
  if (builtin) {
    const t = typeof getEditablePromptText === 'function' ? getEditablePromptText(promptId) : builtin.prompt;
    return t ? t + _FORMAT_RULES : null;
  }
  // Eigene Custom-Rollen (category === 'rolle')
  const customs = typeof getCustomPrompts === 'function' ? getCustomPrompts() : [];
  const custom = customs.find(p => p.id === promptId && p.category === 'rolle');
  if (custom) {
    const t = typeof assemblePromptText === 'function' ? assemblePromptText(custom) : (custom.prompt || '');
    return t ? t + _FORMAT_RULES : null;
  }
  return null;
}

// Befüllt Persona-Dropdowns:
// v5.73: Beide Dropdowns zeigen nur Rollen-Kategorie (built-in + custom)
// v5.90: Experten-Runde — je 3 Dropdowns für Analyse-Chat + Projekt-Assistent
function populatePersonaSelects() {
  const allCustom = typeof getCustomPrompts === 'function' ? getCustomPrompts() : [];

  const builtinRollen = (typeof EDITABLE_PROMPT_DEFAULTS !== 'undefined' ? EDITABLE_PROMPT_DEFAULTS : [])
    .filter(p => p.category === 'rolle');
  const customRollen = allCustom.filter(p => p.category === 'rolle');

  const noRollenHint = builtinRollen.length === 0 && customRollen.length === 0
    ? '<option value="" disabled style="color:var(--muted)">Noch keine Rollen – in Prompt-Bibliothek anlegen</option>'
    : '';

  const rolleOpts = '<option value="">Kein Systemprompt</option>' +
    noRollenHint +
    builtinRollen.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('') +
    customRollen.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');

  const rolleOptsOptional = '<option value="">– optional –</option>' +
    builtinRollen.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('') +
    customRollen.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');

  // Gesprächs-Chat (einzeln, unverändert)
  const askEl = document.getElementById('askPersonaSelect');
  if (askEl) askEl.innerHTML = rolleOpts;

  // Analyse-Chat: 3 Rollen
  const followupEl = document.getElementById('followupPersonaSelect');
  if (followupEl) followupEl.innerHTML = rolleOpts;
  const followupEl2 = document.getElementById('followupPersonaSelect2');
  if (followupEl2) followupEl2.innerHTML = rolleOptsOptional;
  const followupEl3 = document.getElementById('followupPersonaSelect3');
  if (followupEl3) followupEl3.innerHTML = rolleOptsOptional;

  // Projekt-Assistent: 3 Rollen
  const projEl = document.getElementById('projAssistPersonaSelect');
  if (projEl) projEl.innerHTML = rolleOpts;
  const projEl2 = document.getElementById('projAssistPersonaSelect2');
  if (projEl2) projEl2.innerHTML = rolleOptsOptional;
  const projEl3 = document.getElementById('projAssistPersonaSelect3');
  if (projEl3) projEl3.innerHTML = rolleOptsOptional;

  // v5.94: Gespeicherte Rollen wiederherstellen
  _restoreRollenAuswahl();
}

// v5.94: Rollen-Auswahl in localStorage speichern
function _saveRollenAuswahl(mode) {
  if (mode === 'analyse') {
    const ids = [
      document.getElementById('followupPersonaSelect')?.value  || '',
      document.getElementById('followupPersonaSelect2')?.value || '',
      document.getElementById('followupPersonaSelect3')?.value || ''
    ];
    localStorage.setItem('distill_analyse_rollen', JSON.stringify(ids));
  } else if (mode === 'proj') {
    const ids = [
      document.getElementById('projAssistPersonaSelect')?.value  || '',
      document.getElementById('projAssistPersonaSelect2')?.value || '',
      document.getElementById('projAssistPersonaSelect3')?.value || ''
    ];
    localStorage.setItem('distill_proj_rollen', JSON.stringify(ids));
  }
}

// v5.94: Gespeicherte Rollen-Auswahl wiederherstellen (nach populatePersonaSelects)
function _restoreRollenAuswahl() {
  try {
    const analyseIds = JSON.parse(localStorage.getItem('distill_analyse_rollen') || '[]');
    const ids = ['followupPersonaSelect','followupPersonaSelect2','followupPersonaSelect3'];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && analyseIds[i]) el.value = analyseIds[i];
    });
  } catch(e) {}
  try {
    const projIds = JSON.parse(localStorage.getItem('distill_proj_rollen') || '[]');
    const ids = ['projAssistPersonaSelect','projAssistPersonaSelect2','projAssistPersonaSelect3'];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && projIds[i]) el.value = projIds[i];
    });
  } catch(e) {}
  // Badges aktualisieren nach Restore
  updateRundenBadge('analyse');
  updateRundenBadge('proj');
}

// v5.90: Badge + Hint aktualisieren wenn Rollen-Auswahl sich ändert
// v5.94: Speichert Auswahl zusätzlich in localStorage
function updateRundenBadge(mode) {
  if (mode === 'analyse') {
    const r2 = document.getElementById('followupPersonaSelect2')?.value || '';
    const r3 = document.getElementById('followupPersonaSelect3')?.value || '';
    const badge = document.getElementById('analyseRundenBadge');
    if (badge) badge.classList.toggle('visible', !!(r2 || r3));
    const hint = document.getElementById('analyseRundenHint');
    if (hint) {
      const session = typeof getSession === 'function' ? getSession(currentSessionId) : null;
      hint.classList.toggle('visible', !!(session?.claudeFollowUp?.length));
    }
    _saveRollenAuswahl('analyse');
  } else if (mode === 'proj') {
    const r2 = document.getElementById('projAssistPersonaSelect2')?.value || '';
    const r3 = document.getElementById('projAssistPersonaSelect3')?.value || '';
    const badge = document.getElementById('projRundenBadge');
    if (badge) badge.classList.toggle('visible', !!(r2 || r3));
    _saveRollenAuswahl('proj');
  }
}

// v5.90: Moderations-System-Prompt aus mehreren Rollen bauen
function _buildRoundtableSystemPrompt(roleIds) {
  const prompts = roleIds
    .filter(id => !!id)
    .map(id => {
      const text = typeof _buildRoleSystemPrompt === 'function' ? _buildRoleSystemPrompt(id) : null;
      if (!text) return null;
      const builtins = typeof EDITABLE_PROMPT_DEFAULTS !== 'undefined' ? EDITABLE_PROMPT_DEFAULTS : [];
      const customs = typeof getCustomPrompts === 'function' ? getCustomPrompts() : [];
      const found = [...builtins, ...customs].find(p => p.id === id);
      return { name: found?.name || id, text };
    })
    .filter(Boolean);

  if (prompts.length < 2) return null;

  const rollenBeschreibung = prompts.map((p, i) =>
    `### Experte ${i + 1}: ${p.name}\n${p.text}`
  ).join('\n\n');

  const formatLines = prompts.map(p => `**${p.name}:**\n[Antwort vollständig gemäß diesem Rollen-Prompt — Tonalität, Tiefe und Grenzen wie definiert]`).join('\n\n');

  return `Du moderierst eine Experten-Runde. Beantworte jede Frage aus den folgenden Perspektiven — jede Rolle antwortet vollständig nach ihren eigenen Vorgaben (Tonalität, Grenzen, Kontext):\n\n${rollenBeschreibung}\n\n` +
    `Verwende immer exakt dieses Format — nutze die Namen unverändert:\n\n` +
    `${formatLines}\n\n` +
    `**Synthese:**\n[Kurze Zusammenführung der Perspektiven]\n\n` +
    `Behalte die Eigenheit jeder Rolle bei. Vermeide Wiederholungen zwischen den Perspektiven.\n\nAusgabe-Format: Verwende keine Emojis und keine Sonderzeichen-Icons (★, ✓, →, ◆ etc.).`;
}

// v5.78: Design-Tab Dropdown dynamisch befüllen (Built-ins + eigene category:'design')
function populateCanvaPromptSelect() {
  const sel = document.getElementById('canvaPromptSelect');
  if (!sel) return;

  const builtinHtml = `
    <optgroup label="Dokumente">
      <option value="builtin_canva_presentation">Präsentation (Folien)</option>
      <option value="builtin_canva_summary">1-Pager / OnePager</option>
      <option value="builtin_canva_action">Aktionsplan / Report</option>
    </optgroup>
    <optgroup label="Marketing &amp; Design">
      <option value="builtin_canva_flyer">Flyer</option>
      <option value="builtin_canva_poster">Poster</option>
      <option value="builtin_canva_social">Social Media Post</option>
    </optgroup>`;

  const customDesign = typeof getCustomPrompts === 'function'
    ? getCustomPrompts().filter(p => p.category === 'design')
    : [];

  const customHtml = customDesign.length
    ? `<optgroup label="Eigene Design-Prompts">
        ${customDesign.map(p => `<option value="custom_${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('')}
       </optgroup>`
    : '';

  const prev = sel.value;
  sel.innerHTML = builtinHtml + customHtml;
  // Vorherige Auswahl wiederherstellen falls noch vorhanden
  if (prev && sel.querySelector(`option[value="${CSS.escape(prev)}"]`)) sel.value = prev;
}

// Beim App-Start: Popovers mit gespeicherten Vorlagen befüllen
function initFeatures() {
  updateCustomTemplatePopovers();
  populatePersonaSelects();
  populateCanvaPromptSelect(); // v5.78
}

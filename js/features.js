// ═══════════════════════════════════════════════════
// FEATURES.JS – Neue Funktionen v3.0
// 360°-Analyse · Ask Your Recording · Mind Map · Eigene Vorlagen
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// 360°-AUSWERTUNG
// ═══════════════════════════════════════════════════

async function analyse360(session, transcript) {
  const speakerA = session.speakerA || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';
  const anonText = anonymizeForClaude(trimTranscript(transcript, 9000), session);

  const prompt = `Du bist ein erfahrener Kommunikations- und Konfliktanalyst. Analysiere dieses Gespräch aus vier verschiedenen Perspektiven. Gehe dabei wirklich in die Tiefe – nicht nur Oberfläche.
Sprecher A = "${speakerA}", Sprecher B = "${speakerB}".

Transkript:
${anonText}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "meineAufgaben": {
    "titel": "Perspektive: ${speakerA}",
    "punkte": ["Was ${speakerA} konkret tun, klären oder entscheiden muss – auch implizit Erwähntes"]
  },
  "andereErwartungen": {
    "titel": "Perspektive: ${speakerB}",
    "punkte": ["Was ${speakerB} erwartet, erhofft oder braucht – auch unausgesprochen"]
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

  const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);
  addTokensToSession(session, inputTokens, outputTokens);
  const json = JSON.parse(extractJSON(text, '{'));
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
  block.style.display = 'block';

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
    const transcript = buildTranscriptText(s);
    const historyText = askHistory.slice(0, -1)
      .map(h => `${h.role === 'user' ? 'Frage' : 'Antwort'}: ${h.text}`)
      .join('\n');

    const prompt = `Du bist ein Assistent der ausschließlich Fragen zu einem Gesprächstranskript beantwortet.
Antworte immer auf Deutsch. Zitiere wenn möglich direkt aus dem Transkript und nenne den Zeitstempel [MM:SS].
Wenn die Antwort nicht im Transkript zu finden ist, sage das klar – erfinde nichts.

TRANSKRIPT (${s.label}):
${trimTranscript(transcript, 8000)}
${historyText ? `\nBISHERIGE FRAGEN:\n${historyText}\n` : ''}
FRAGE: ${question}`;

    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);
    addTokensToSession(s, inputTokens, outputTokens);
    saveSessions();

    askHistory.push({ role: 'assistant', text });
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
// MIND MAP EXPORT (Mermaid.js)
// ═══════════════════════════════════════════════════

async function generateAndShowMindMap() {
  const s = getSession();
  if (!s || !s.utterances?.length) {
    showToast('Kein Transkript verfügbar', 'error');
    return;
  }

  const btn = document.getElementById('mindmapBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = icon('loader',12,'margin-right:5px') + ' Generiere…'; }

  try {
    const transcript = buildTranscriptText(s);
    const prompt = `Erstelle eine Mind Map für dieses deutsche Gesprächstranskript im Mermaid.js Format.
Verwende exakt "mindmap" als ersten Bezeichner. Max. 3 Ebenen, max. 20 Knoten.
Verwende nur einfache Texte ohne runde Klammern außer für den Root-Knoten. Keine Sonderzeichen in den Knoten.

Transkript:
${trimTranscript(transcript, 6000)}

Antworte NUR mit dem rohen Mermaid-Code, ohne Markdown-Blöcke:
mindmap
  root((Hauptthema))
    Thema 1
      Detail 1a
    Thema 2`;

    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);
    addTokensToSession(s, inputTokens, outputTokens);

    let mermaidCode = text.trim();
    // Markdown-Fence entfernen falls vorhanden
    mermaidCode = mermaidCode.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim();

    s.claudeMindmap = mermaidCode;
    saveSessions();

    openMindMapModal(mermaidCode, s.label);
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = icon('map',12,'margin-right:5px') + ' Mind Map'; }
  }
}

function openMindMapModal(code, label) {
  const titleEl  = document.getElementById('mindmapTitle');
  const codeEl   = document.getElementById('mindmapCode');
  const renderEl = document.getElementById('mindmapRender');

  if (titleEl)  titleEl.textContent  = label || 'Mind Map';
  if (codeEl)   codeEl.textContent   = code;

  if (renderEl) {
    renderEl.innerHTML = `<pre class="mermaid">${code}</pre>`;
    if (window.mermaid) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark'
        });
        mermaid.run({ nodes: renderEl.querySelectorAll('.mermaid') });
      } catch(e) {
        renderEl.innerHTML = `<pre style="color:var(--red); font-size:0.78rem; white-space:pre-wrap">${escHtml(e.message)}\n\n${escHtml(code)}</pre>`;
      }
    } else {
      renderEl.innerHTML = `<pre style="font-size:0.78rem; color:var(--muted); white-space:pre-wrap">${escHtml(code)}</pre>`;
    }
  }

  document.getElementById('mindmapModal').classList.add('open');
}

function closeMindMapModal() {
  document.getElementById('mindmapModal').classList.remove('open');
}

function copyMindMapCode() {
  const code = document.getElementById('mindmapCode')?.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => showToast('Mermaid-Code kopiert', 'success'));
}

// Gespeicherte Mind Map einer Session anzeigen
function showExistingMindMap() {
  const s = getSession();
  if (!s?.claudeMindmap) return;
  openMindMapModal(s.claudeMindmap, s.label);
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

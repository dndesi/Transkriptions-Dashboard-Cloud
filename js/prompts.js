// ═══════════════════════════════════════════════════
// PROMPTS.JS – Prompt-Bibliothek v4.11
// Eigene Analyse-Prompts erstellen, verwalten, ausführen
// Bearbeitbare Standard-Prompts (360°, Themen, Kapitel)
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
let _promptSearch   = '';
let _promptTagFilter = '';

// ── Bearbeitbare Standard-Prompts ────────────────────
// Prompts für 360°, Themen, Kapitel – editierbar, mit Reset auf Default
const EDITABLE_PROMPTS_KEY = 'editablePrompts';

const EDITABLE_PROMPT_DEFAULTS = [
  {
    id: 'builtin_360',
    name: '360°-Auswertung',
    description: 'Vier Perspektiven: Aufgaben · Erwartungen · Emotionen · Strategie',
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
    name: 'Themen',
    description: 'Hauptthemen als kompakte Tags',
    icon: 'tag',
    prompt: `Erkenne die Hauptthemen in diesem deutschen Gesprächstranskript.

Transkript:
{{transkript}}

Antworte NUR mit einem JSON-Array aus kurzen Themen-Tags auf Deutsch (max. 10 Tags):
["Thema 1", "Thema 2", ...]`
  },
  {
    id: 'builtin_chapters',
    name: 'Kapitel',
    description: 'Gesprächsstruktur in Kapitel mit Zeitstempeln',
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
  }
];

function getEditablePrompts() {
  try { return JSON.parse(localStorage.getItem(EDITABLE_PROMPTS_KEY) || '{}'); } catch { return {}; }
}

// Gibt den (ggf. angepassten) Prompt-Text zurück
function getEditablePromptText(id) {
  const saved = getEditablePrompts();
  if (saved[id]) return saved[id];
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  return def ? def.prompt : null;
}

function isEditablePromptModified(id) {
  const saved = getEditablePrompts();
  return !!saved[id];
}

function saveEditablePromptText(id, text) {
  const saved = getEditablePrompts();
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  // Wenn identisch mit Default → nicht speichern (=nicht modifiziert)
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

// ── System-Prompts (read-only, nicht bearbeitbar) ────
const SYSTEM_PROMPTS = [
  {
    id: 'sys_private',
    name: 'Gesprächs-Analyse',
    description: 'Vereinbarungen · Wünsche · Offene Themen · Dynamik · Zwischen den Zeilen',
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

// ── View Toggle (analog zu toggleArchView) ───────────
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

// ── Prompt-Liste rendern ─────────────────────────────
function filterPromptsView() {
  const searchEl = document.getElementById('promptSearchInput');
  const q = searchEl ? searchEl.value.toLowerCase() : '';
  _promptSearch = q;
  renderPromptsView();
}

function setPromptTagFilter(tag) {
  _promptTagFilter = (_promptTagFilter === tag) ? '' : tag;
  renderPromptsView();
}

function _getAllPromptTags() {
  const tags = new Set();
  getCustomPrompts().forEach(p => (p.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

function renderPromptsView() {
  const el = document.getElementById('promptsView');
  if (!el) return;

  let prompts = getCustomPrompts();

  // Filtern nach Suche + Tag
  if (_promptSearch) {
    const q = _promptSearch;
    prompts = prompts.filter(p =>
      (p.name        || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (assemblePromptText(p)).toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  if (_promptTagFilter) {
    prompts = prompts.filter(p => (p.tags || []).includes(_promptTagFilter));
  }

  const allTags = _getAllPromptTags();

  el.innerHTML = `
  <div style="max-width:800px; margin:0 auto; padding:8px 0 40px">

    <!-- Toolbar: Suche + Tag-Filter + Neuer Prompt -->
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
      <div class="search-box" style="flex:1; min-width:160px;">
        ${icon('search',14,'color:var(--muted);flex-shrink:0')}
        <input type="text" id="promptSearchInput" placeholder="Prompts durchsuchen…"
          value="${escHtml(_promptSearch)}"
          oninput="filterPromptsView()"
          style="background:none; border:none; outline:none; color:var(--text); font-size:0.88rem; width:100%;" />
      </div>
      <button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;flex-shrink:0">
        ${icon('plus',14)} Neuer Prompt
      </button>
    </div>

    <!-- Tag-Filter-Chips -->
    ${allTags.length ? `
    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px;">
      ${allTags.map(t => `
        <button onclick="setPromptTagFilter('${escHtml(t)}')"
          style="padding:3px 10px; font-size:0.75rem; border-radius:12px; border:1px solid ${_promptTagFilter===t ? 'var(--accent)' : 'var(--border)'}; background:${_promptTagFilter===t ? 'var(--accent)' : 'var(--surface2)'}; color:${_promptTagFilter===t ? '#fff' : 'var(--text)'}; cursor:pointer; font-weight:${_promptTagFilter===t ? '700' : '400'}">
          ${escHtml(t)}
        </button>`).join('')}
    </div>` : ''}


    <!-- System-Prompts (immer sichtbar, read-only) -->
    <div style="margin-bottom:20px">
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px">
        System-Prompts ${icon('lock',11,'color:var(--muted);margin-left:4px')}
      </div>
      <div class="prompts-grid">
        ${SYSTEM_PROMPTS.map(p => `
          <div class="prompt-card" style="opacity:0.85">
            <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 20, 'color:var(--muted)')}</div>
            <div class="prompt-card-body">
              <div class="prompt-card-name">${escHtml(p.name)}</div>
              ${p.description ? `<div class="prompt-card-desc" style="color:var(--muted)">${escHtml(p.description)}</div>` : ''}
              <div class="prompt-card-preview">${escHtml(p.prompt.slice(0, 160))}…</div>
            </div>
            <div class="prompt-card-actions">
              <button class="btn btn-ghost" onclick="openSystemPromptView('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px">
                ${icon('eye',13)} Ansehen
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Bearbeitbare Standard-Prompts (360°, Themen, Kapitel) -->
    <div style="margin-bottom:20px">
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px; display:flex; align-items:center; gap:6px">
        Standard-Analysen ${icon('edit-2',11,'color:var(--muted)')}
        <span style="font-size:0.68rem; font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted)">— anpassbar</span>
      </div>
      <div class="prompts-grid">
        ${EDITABLE_PROMPT_DEFAULTS.map(p => {
          const modified = isEditablePromptModified(p.id);
          const currentText = getEditablePromptText(p.id) || '';
          return `
          <div class="prompt-card">
            <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 20, 'color:var(--accent)')}</div>
            <div class="prompt-card-body">
              <div class="prompt-card-name" style="display:flex;align-items:center;gap:6px">
                ${escHtml(p.name)}
                ${modified ? `<span style="font-size:0.65rem;background:rgba(108,99,255,0.15);color:var(--accent);padding:1px 6px;border-radius:8px;font-weight:600">angepasst</span>` : ''}
              </div>
              ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
              <div class="prompt-card-preview">${escHtml(currentText.slice(0, 140))}${currentText.length > 140 ? '…' : ''}</div>
            </div>
            <div class="prompt-card-actions">
              <button class="btn btn-ghost" onclick="openEditablePromptEditor('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px">
                ${icon('edit-2',13)} Bearbeiten
              </button>
              ${modified ? `<button class="btn" onclick="resetEditablePromptAndRefresh('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--red)">
                ${icon('refresh-cw',13)} Reset
              </button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Eigene Prompts -->
    <div>
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px">Eigene Prompts</div>
      ${prompts.length === 0 ? `
        <div style="text-align:center; padding:40px 24px; color:var(--muted); border:1px dashed var(--border); border-radius:14px">
          <div style="margin-bottom:10px; opacity:0.3">${icon('sparkles',28)}</div>
          <div style="font-size:0.88rem; margin-bottom:6px; font-weight:500">${_promptSearch || _promptTagFilter ? 'Keine Treffer' : 'Noch keine eigenen Prompts'}</div>
          ${!_promptSearch && !_promptTagFilter ? `<button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;margin-top:8px">${icon('plus',14)} Ersten Prompt erstellen</button>` : ''}
        </div>
      ` : `
        <div class="prompts-grid">
          ${prompts.map(p => {
            const preview = assemblePromptText(p);
            const tags = p.tags || [];
            return `
            <div class="prompt-card">
              <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 20, 'color:var(--accent)')}</div>
              <div class="prompt-card-body">
                <div class="prompt-card-name">${escHtml(p.name)}</div>
                ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
                ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;margin-bottom:4px">${tags.map(t=>`<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
                <div class="prompt-card-preview">${escHtml(preview.slice(0, 140))}${preview.length > 140 ? '…' : ''}</div>
              </div>
              <div class="prompt-card-actions">
                <button class="btn btn-ghost" onclick="openPromptEditorModal('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px">
                  ${icon('edit-2',13)} Bearbeiten
                </button>
                <button class="btn" onclick="deletePromptById('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--red)">
                  ${icon('trash-2',13)} Löschen
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>
      `}
    </div>
  </div>`;
  if (window.lucide) lucide.createIcons({ nodes: [el] });
}

// ── Prompt-Editor Modal ──────────────────────────────
// System-Prompt als read-only im Editor anzeigen
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
  // Alle Felder read-only
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorText'].forEach(id => {
    document.getElementById(id).readOnly = true;
    document.getElementById(id).style.opacity = '0.6';
  });
  // Speichern-Button ausblenden
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
  document.getElementById('promptEditorId').value   = existing?.id          || '';
  document.getElementById('promptEditorName').value = existing?.name        || '';
  document.getElementById('promptEditorDesc').value = existing?.description || '';
  document.getElementById('promptEditorIcon').value = existing?.icon        || 'sparkles';
  // Neue Felder
  document.getElementById('promptEditorRolle').value      = existing?.rolle      || '';
  document.getElementById('promptEditorTonalitaet').value = existing?.tonalitaet || '';
  document.getElementById('promptEditorGrenzen').value    = existing?.grenzen    || '';
  document.getElementById('promptEditorText').value       = existing?.kontext || existing?.prompt || '';
  document.getElementById('promptEditorTags').value       = (existing?.tags || []).join(', ');
  document.getElementById('promptEditorError').style.display = 'none';

  // Alle Felder editierbar
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorRolle',
   'promptEditorTonalitaet','promptEditorGrenzen','promptEditorText','promptEditorTags'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) { el.readOnly = false; el.style.opacity = ''; }
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
  renderPromptsView();
  showToast(id ? 'Prompt aktualisiert' : 'Prompt gespeichert', 'ok');
}

function deletePromptById(id) {
  const updated = getCustomPrompts().filter(p => p.id !== id);
  saveCustomPrompts(updated);
  renderPromptsView();
  showToast('Prompt gelöscht', 'ok');
}

// ── Custom Prompt ausführen ──────────────────────────
// Wird von runAnalysisFromModal() aufgerufen
async function runCustomPrompt(session, promptObj, transcript) {
  const { forward, reverse } = buildAnonMap(session);
  const speakerA = session.speakerA || 'Ich';
  const speakerB = session.speakerB || 'Gesprächspartner';

  // Prompt aus Teilen zusammenbauen, dann Platzhalter ersetzen
  let promptText = assemblePromptText(promptObj)
    .replace(/\{\{transkript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{transcript\}\}/gi,  trimTranscript(transcript, 300000))
    .replace(/\{\{sprecher_a\}\}/gi,  speakerA)
    .replace(/\{\{sprecher_b\}\}/gi,  speakerB)
    .replace(/\{\{speakerA\}\}/gi,    speakerA)
    .replace(/\{\{speakerB\}\}/gi,    speakerB);

  // Kein {{transkript}} im Prompt → Transkript automatisch anhängen
  if (!/\{\{transkript\}\}|\{\{transcript\}\}/i.test(promptObj.prompt)) {
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

// ── Editable-Prompt Editor öffnen ───────────────────
function openEditablePromptEditor(id) {
  const def = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
  if (!def) return;
  const currentText = getEditablePromptText(id) || def.prompt;

  document.getElementById('promptEditorTitle').textContent = def.name + ' bearbeiten';
  document.getElementById('promptEditorId').value   = id;  // Wir recyclen das Feld als editable-ID-Marker
  document.getElementById('promptEditorName').value = def.name;
  document.getElementById('promptEditorDesc').value = def.description;
  document.getElementById('promptEditorIcon').value = def.icon;
  document.getElementById('promptEditorText').value = currentText;
  document.getElementById('promptEditorError').style.display = 'none';

  // Name/Desc/Icon read-only (nur Prompt-Text editierbar)
  ['promptEditorName','promptEditorDesc','promptEditorIcon'].forEach(fid => {
    const el = document.getElementById(fid);
    el.readOnly = true;
    el.style.opacity = '0.5';
  });
  document.getElementById('promptEditorText').readOnly = false;
  document.getElementById('promptEditorText').style.opacity = '';

  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.onclick = () => saveEditablePromptFromEditor(id);
  }

  // Reset-Button einblenden wenn modifiziert
  const resetBtn = document.getElementById('promptEditorResetBtn');
  if (resetBtn) {
    resetBtn.style.display = isEditablePromptModified(id) ? '' : 'none';
    resetBtn.onclick = () => {
      resetEditablePrompt(id);
      const def2 = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === id);
      document.getElementById('promptEditorText').value = def2.prompt;
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
  renderPromptsView();
  showToast('Prompt gespeichert', 'ok');
}

function resetEditablePromptAndRefresh(id) {
  resetEditablePrompt(id);
  renderPromptsView();
  showToast('Prompt zurückgesetzt', 'ok');
}

// ── Checkboxen im Analyse-Modal befüllen ─────────────
function renderCustomPromptCheckboxes() {
  const container = document.getElementById('customPromptChecks');
  if (!container) return;
  const prompts = getCustomPrompts();
  if (!prompts.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = `
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px">Eigene Prompts</div>
      ${prompts.map(p => `
        <label class="analyse-check-row" style="margin-bottom:8px">
          <input type="checkbox" id="chkCustom_${p.id}" />
          <span style="display:inline-flex;align-items:center">
            ${icon(p.icon || 'sparkles', 17, 'stroke:var(--muted);stroke-width:2;fill:none')}
          </span>
          <span>
            <div style="font-size:0.88rem; font-weight:600">${escHtml(p.name)}</div>
            ${p.description ? `<div style="font-size:0.75rem; color:var(--muted)">${escHtml(p.description)}</div>` : ''}
          </span>
        </label>
      `).join('')}
    </div>
  `;
  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

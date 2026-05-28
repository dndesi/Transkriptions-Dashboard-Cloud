// ═══════════════════════════════════════════════════
// PROMPTS.JS – Prompt-Bibliothek v4.9
// Eigene Analyse-Prompts erstellen, verwalten, ausführen
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
function renderPromptsView() {
  const el = document.getElementById('promptsView');
  if (!el) return;
  const prompts = getCustomPrompts();
  el.innerHTML = `
  <div style="max-width:800px; margin:0 auto; padding:8px 0 40px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px">
      <div>
        <h2 style="font-size:1.3rem; font-weight:700; margin-bottom:4px; display:flex;align-items:center;gap:8px">
          ${icon('sparkles',18)} Prompt-Bibliothek
        </h2>
        <p style="font-size:0.82rem; color:var(--muted); margin:0">
          Eigene Analyse-Prompts erstellen und im Analyse-Modal verwenden.
          Nutze <code style="background:var(--surface2);border-radius:4px;padding:1px 5px;font-size:0.78rem">{{transkript}}</code>
          als Platzhalter – wird durch das Transkript ersetzt.
        </p>
      </div>
      <button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px;flex-shrink:0">
        ${icon('plus',14)} Neuer Prompt
      </button>
    </div>

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

    <!-- Eigene Prompts -->
    <div>
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:10px">Eigene Prompts</div>
      ${prompts.length === 0 ? `
        <div style="text-align:center; padding:40px 24px; color:var(--muted); border:1px dashed var(--border); border-radius:14px">
          <div style="margin-bottom:10px; opacity:0.3">${icon('sparkles',28)}</div>
          <div style="font-size:0.88rem; margin-bottom:6px; font-weight:500">Noch keine eigenen Prompts</div>
          <div style="font-size:0.78rem; margin-bottom:16px">Erstelle deinen ersten Prompt. Nutze <code style="background:var(--surface2);border-radius:3px;padding:1px 4px">{{transkript}}</code> als Platzhalter.</div>
          <button class="btn btn-primary" onclick="openPromptEditorModal(null)" style="gap:6px">${icon('plus',14)} Ersten Prompt erstellen</button>
        </div>
      ` : `
        <div class="prompts-grid">
          ${prompts.map(p => `
            <div class="prompt-card">
              <div class="prompt-card-icon">${icon(p.icon || 'sparkles', 20, 'color:var(--accent)')}</div>
              <div class="prompt-card-body">
                <div class="prompt-card-name">${escHtml(p.name)}</div>
                ${p.description ? `<div class="prompt-card-desc">${escHtml(p.description)}</div>` : ''}
                <div class="prompt-card-preview">${escHtml(p.prompt.slice(0, 140))}${p.prompt.length > 140 ? '…' : ''}</div>
              </div>
              <div class="prompt-card-actions">
                <button class="btn btn-ghost" onclick="openPromptEditorModal('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px">
                  ${icon('edit-2',13)} Bearbeiten
                </button>
                <button class="btn" onclick="deletePromptById('${p.id}')" style="padding:5px 10px;font-size:0.78rem;gap:4px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--red)">
                  ${icon('trash-2',13)} Löschen
                </button>
              </div>
            </div>
          `).join('')}
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
  document.getElementById('promptEditorId').value          = existing?.id          || '';
  document.getElementById('promptEditorName').value        = existing?.name        || '';
  document.getElementById('promptEditorDesc').value        = existing?.description || '';
  document.getElementById('promptEditorIcon').value        = existing?.icon        || 'sparkles';
  document.getElementById('promptEditorText').value        = existing?.prompt      || '';
  document.getElementById('promptEditorError').style.display = 'none';
  // Felder wieder editierbar machen (falls vorher System-Prompt angezeigt)
  ['promptEditorName','promptEditorDesc','promptEditorIcon','promptEditorText'].forEach(fid => {
    const el = document.getElementById(fid);
    el.readOnly = false;
    el.style.opacity = '';
  });
  const saveBtn = document.getElementById('promptEditorSaveBtn');
  if (saveBtn) saveBtn.style.display = '';

  const modal = document.getElementById('promptEditorModal');
  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function closePromptEditorModal() {
  document.getElementById('promptEditorModal').style.display = 'none';
}

function savePromptFromEditor() {
  const id       = document.getElementById('promptEditorId').value;
  const name     = document.getElementById('promptEditorName').value.trim();
  const desc     = document.getElementById('promptEditorDesc').value.trim();
  const iconName = document.getElementById('promptEditorIcon').value.trim() || 'sparkles';
  const prompt   = document.getElementById('promptEditorText').value.trim();
  const errEl    = document.getElementById('promptEditorError');

  if (!name)   { errEl.textContent = 'Bitte einen Namen eingeben.';        errEl.style.display = 'block'; return; }
  if (!prompt) { errEl.textContent = 'Bitte einen Prompt-Text eingeben.';  errEl.style.display = 'block'; return; }

  const prompts = getCustomPrompts();
  if (id) {
    const idx = prompts.findIndex(p => p.id === id);
    if (idx >= 0) prompts[idx] = { id, name, description: desc, icon: iconName, prompt };
  } else {
    prompts.push({ id: genPromptId(), name, description: desc, icon: iconName, prompt });
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

  // Platzhalter ersetzen
  let promptText = promptObj.prompt
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

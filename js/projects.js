// ═══════════════════════════════════════════════════
// PROJECTS.JS – Projekt-Browser + Detailansicht v4.40
// Paket 2: Projekt-Browser (Kacheln, Anlegen, Bearbeiten, Archivieren)
// Paket 4: Projekt-Detailansicht (gefilterte Session-Liste, Suche, Sort)
// ═══════════════════════════════════════════════════

const PROJECT_COLORS = [
  '#6b7280','#3b82f6','#8b5cf6','#ec4899',
  '#f59e0b','#10b981','#ef4444','#06b6d4',
  '#f97316','#84cc16'
];

let _projectModalMode = 'create'; // 'create' | 'edit'
let _projectModalEditId = null;
let _currentProjectDetailId = null;

// ── Sidenav-Badge aktualisieren ──────────────────────────────────────────
function updateProjectBadge() {
  const badge = document.getElementById('sidenavProjectBadge');
  if (!badge) return;
  // Zeigt das erste aktive Nicht-Builtin-Projekt, oder "Allgemeines Projekt"
  const active = projects.find(p => p.status === 'active' && !p.builtin)
              || projects.find(p => p.id === BUILTIN_PROJECT_ID);
  if (!active) { badge.style.display = 'none'; return; }
  badge.style.display = 'flex';
  badge.querySelector('.spb-dot').style.background = active.color || '#6b7280';
  badge.querySelector('.spb-name').textContent = active.name;
}

// ── Projekt-Browser ein-/ausblenden ─────────────────────────────────────
function toggleProjectsView() {
  const el = document.getElementById('projectsView');
  if (!el) return;
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('navProjects', false);
    setView('grid');
  } else {
    _showOverlay('projectsView', 'navProjects', renderProjectBrowser);
  }
}

// ── Projekt-Browser rendern ──────────────────────────────────────────────
function renderProjectBrowser() {
  const el = document.getElementById('projectsView');
  if (!el) return;
  _currentProjectDetailId = null;

  const active   = projects.filter(p => p.status === 'active');
  const paused   = projects.filter(p => p.status === 'paused');
  const archived = projects.filter(p => p.status === 'archived');

  function renderGroup(list, groupLabel) {
    if (!list.length) return '';
    return `
      <div style="margin-bottom:28px">
        <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">${groupLabel}</div>
        <div class="projects-grid">
          ${list.map(p => renderProjectCard(p)).join('')}
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div class="projects-browser">
      <div class="projects-browser-header">
        <h2>${icon('layers',18)} Projekte</h2>
        <button class="btn btn-primary" onclick="openCreateProjectModal()" style="margin-left:auto">
          ${icon('plus',14)} Neues Projekt
        </button>
      </div>
      ${renderGroup(active, 'Aktiv')}
      ${renderGroup(paused, 'Pausiert')}
      ${renderGroup(archived, 'Archiviert')}
      ${!projects.length ? '<div class="browser-empty">Noch keine Projekte vorhanden.</div>' : ''}
    </div>
  `;
}

function renderProjectCard(p) {
  const count = sessions.filter(s => s.projectId === p.id).length;
  const statusLabel = { active: 'Aktiv', paused: 'Pausiert', archived: 'Archiviert' }[p.status] || p.status;
  const canDelete = !p.builtin;
  return `
    <div class="project-card" onclick="showProjectDetail('${p.id}')">
      <div class="project-card-top">
        <div class="project-card-color" style="background:${p.color}"></div>
        <div class="project-card-name">${escHtml(p.name)}</div>
        <span class="project-card-status ${p.status}">${statusLabel}</span>
      </div>
      ${p.goalDescription ? `<div class="project-card-goal">${escHtml(p.goalDescription)}</div>` : ''}
      <div class="project-card-meta">
        ${icon('file-text',12)} ${count} Sitzung${count !== 1 ? 'en' : ''}
        · ${new Date(p.createdAt).toLocaleDateString('de-DE')}
      </div>
      <div class="project-card-actions" onclick="event.stopPropagation()">
        <button onclick="openEditProjectModal('${p.id}')">✎ Bearbeiten</button>
        ${p.status !== 'archived'
          ? `<button onclick="confirmArchiveProject('${p.id}')">⊘ Archivieren</button>`
          : `<button onclick="confirmUnarchiveProject('${p.id}')">↩ Aktivieren</button>`
        }
        ${canDelete ? `<button class="danger" onclick="confirmDeleteProject('${p.id}')">✕ Löschen</button>` : ''}
      </div>
    </div>`;
}

// ── Projekt-Detailansicht (Paket 4) ─────────────────────────────────────
function showProjectDetail(id) {
  const proj = getProjectById(id);
  const el = document.getElementById('projectsView');
  if (!proj || !el) return;
  _currentProjectDetailId = id;
  renderProjectDetail(id);
}

function renderProjectDetail(id, searchVal = '', sortVal = 'date-desc') {
  const proj = getProjectById(id);
  const el = document.getElementById('projectsView');
  if (!proj || !el) return;

  let list = sessions.filter(s =>
    s.projectId === id &&
    (s.status === 'done' || s.status === 'error' || (s.utterances?.length > 0))
  );

  if (searchVal.trim()) {
    const q = searchVal.toLowerCase();
    list = list.filter(s =>
      (s.label||'').toLowerCase().includes(q) ||
      (s.persons||[]).some(p => p.toLowerCase().includes(q)) ||
      (s.speakerA||'').toLowerCase().includes(q) ||
      (s.speakerB||'').toLowerCase().includes(q)
    );
  }

  if (sortVal === 'date-desc') list.sort((a,b) => new Date(b.date)-new Date(a.date));
  else if (sortVal === 'date-asc') list.sort((a,b) => new Date(a.date)-new Date(b.date));
  else if (sortVal === 'name') list.sort((a,b) => (a.label||'').localeCompare(b.label||'','de'));

  const statusLabel = { active: 'Aktiv', paused: 'Pausiert', archived: 'Archiviert' }[proj.status] || proj.status;

  el.innerHTML = `
    <div class="project-detail">
      <div class="project-detail-header">
        <button class="project-detail-back" onclick="renderProjectBrowser()">
          ${icon('arrow-left',13)} Projekte
        </button>
        <div class="project-detail-title">
          <span style="width:14px;height:14px;border-radius:50%;background:${proj.color};display:inline-block;flex-shrink:0"></span>
          ${escHtml(proj.name)}
          <span class="project-card-status ${proj.status}" style="font-size:0.72rem">${statusLabel}</span>
        </div>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button class="btn btn-ghost" style="font-size:0.82rem" onclick="showProjectDashboard('${proj.id}')">
            ${icon('bar-chart-2',13)} Dashboard
          </button>
          <button class="btn btn-ghost" style="font-size:0.82rem" onclick="openEditProjectModal('${proj.id}')">
            ${icon('edit-2',13)} Bearbeiten
          </button>
        </div>
      </div>

      ${proj.goalDescription ? `
        <div class="project-detail-info">
          <span>${icon('target',13,'margin-right:5px')} <strong>Ziel:</strong> ${escHtml(proj.goalDescription)}</span>
          <span>${icon('file-text',13,'margin-right:5px')} ${list.length} Sitzung${list.length !== 1 ? 'en' : ''}</span>
          <span>${icon('calendar',13,'margin-right:5px')} Erstellt ${new Date(proj.createdAt).toLocaleDateString('de-DE')}</span>
        </div>
      ` : ''}

      <div class="project-detail-toolbar">
        <div class="search-box" style="flex:1;min-width:150px">
          ${icon('search',14,'stroke:var(--muted)')}
          <input type="text" placeholder="Sitzungen suchen…" value="${escHtml(searchVal)}"
            oninput="renderProjectDetail('${proj.id}', this.value, document.getElementById('projDetailSort').value)" />
        </div>
        <select id="projDetailSort" onchange="renderProjectDetail('${proj.id}', document.querySelector('#projectsView .search-box input').value, this.value)">
          <option value="date-desc"${sortVal==='date-desc'?' selected':''}>Neueste zuerst</option>
          <option value="date-asc"${sortVal==='date-asc'?' selected':''}>Älteste zuerst</option>
          <option value="name"${sortVal==='name'?' selected':''}>Name A–Z</option>
        </select>
      </div>

      ${list.length === 0
        ? `<div class="browser-empty">${searchVal ? 'Keine Treffer.' : 'Keine Sitzungen in diesem Projekt.'}</div>`
        : `<div class="session-grid">${list.map(s => renderProjectSessionCard(s)).join('')}</div>`
      }
    </div>
  `;
}

function renderProjectSessionCard(s) {
  const dur = s.duration ? formatDuration(s.duration) : '?';
  const typeIconMap = { arbeit:'briefcase', privat:'message-circle', gedanken:'message-square' };
  const typeLabel   = { arbeit:'Arbeit', privat:'Privat', gedanken:'Gedanken' };
  const typeCls     = { arbeit:'sc-type-arbeit', privat:'sc-type-privat', gedanken:'sc-type-gedanken' };
  const t = s.type || 'privat';
  const statusClass = s.status === 'done' ? 'done' : 'error';
  const statusLabel = s.status === 'done'
    ? `${icon('check-circle',11,'margin-right:3px;color:var(--green)')} Transkribiert`
    : `${icon('x-circle',11,'margin-right:3px;color:var(--red)')} Fehler`;
  const tagsHtml = (s.tags||[]).map(t => `<span class="sc-tag">${escHtml(t)}</span>`).join('');
  return `
    <div class="session-card card-${t}" onclick="showTranscript(sessions.find(x=>x.id==='${s.id}'))">
      <div class="sc-icon">${icon(typeIconMap[t]||'message-circle',17)}</div>
      <div class="sc-body">
        <span class="sc-type ${typeCls[t]||'sc-type-privat'}">${icon(typeIconMap[t]||'message-circle',11)} ${typeLabel[t]||'Privat'}</span>
        <div class="sc-name">${escHtml(s.label)}</div>
        ${s.persons?.length ? `<div class="sc-persons">${icon('users',12,'margin-right:3px')} ${s.persons.map(p=>escHtml(p)).join(' · ')}</div>` : ''}
        <div class="sc-meta">
          ${new Date(s.date).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}<br>
          ${escHtml(s.filename||'')} · ${dur}
        </div>
        ${tagsHtml ? `<div class="sc-tags">${tagsHtml}</div>` : ''}
        <span class="sc-status ${statusClass}">${statusLabel}</span>
      </div>
    </div>`;
}

// ── Projekt-Modal (Anlegen / Bearbeiten) ─────────────────────────────────
function openCreateProjectModal() {
  _projectModalMode  = 'create';
  _projectModalEditId = null;
  _openProjectModal({ name:'', color: PROJECT_COLORS[1], goalDescription:'', status:'active' });
}

function openEditProjectModal(id) {
  const proj = getProjectById(id);
  if (!proj) return;
  _projectModalMode  = 'edit';
  _projectModalEditId = id;
  _openProjectModal(proj);
}

function _openProjectModal(data) {
  const overlay = document.getElementById('projectModalOverlay');
  if (!overlay) return;
  overlay.querySelector('#pmTitle').textContent =
    _projectModalMode === 'create' ? 'Neues Projekt' : 'Projekt bearbeiten';
  overlay.querySelector('#pmName').value = data.name || '';
  overlay.querySelector('#pmGoal').value = data.goalDescription || '';
  overlay.querySelector('#pmStatus').value = data.status || 'active';

  // Farb-Picker rendern
  const colorPicker = overlay.querySelector('#pmColors');
  colorPicker.innerHTML = PROJECT_COLORS.map(c =>
    `<span style="background:${c}" data-color="${c}" class="${c === data.color ? 'selected' : ''}"
      onclick="_selectProjectColor('${c}')"></span>`
  ).join('');

  overlay.classList.add('open');
  overlay.querySelector('#pmName').focus();
}

function _selectProjectColor(color) {
  document.querySelectorAll('#pmColors span').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });
}

function closeProjectModal() {
  document.getElementById('projectModalOverlay')?.classList.remove('open');
}

function saveProjectFromModal() {
  const name = document.getElementById('pmName')?.value.trim();
  if (!name) { showToast('Bitte einen Namen eingeben.', 'error'); return; }
  const color = document.querySelector('#pmColors span.selected')?.dataset.color || PROJECT_COLORS[0];
  const goalDescription = document.getElementById('pmGoal')?.value.trim() || '';
  const status = document.getElementById('pmStatus')?.value || 'active';

  if (_projectModalMode === 'create') {
    createProject({ name, color, goalDescription });
  } else {
    updateProject(_projectModalEditId, { name, color, goalDescription, status });
  }

  closeProjectModal();
  updateProjectBadge();

  // Zurück zum richtigen View
  if (_currentProjectDetailId) {
    renderProjectDetail(_currentProjectDetailId);
  } else {
    renderProjectBrowser();
  }
  showToast(_projectModalMode === 'create' ? `Projekt „${name}" angelegt` : `Projekt aktualisiert`, 'success');
}

// ── Archivieren / Aktivieren / Löschen ──────────────────────────────────
function confirmArchiveProject(id) {
  const proj = getProjectById(id);
  if (!proj) return;
  if (!confirm(`Projekt „${proj.name}" archivieren?\n\nDie Sitzungen bleiben erhalten.`)) return;
  archiveProject(id);
  updateProjectBadge();
  renderProjectBrowser();
  showToast(`Projekt archiviert`, 'success');
}

function confirmUnarchiveProject(id) {
  updateProject(id, { status: 'active' });
  updateProjectBadge();
  renderProjectBrowser();
  showToast('Projekt wieder aktiviert', 'success');
}

function confirmDeleteProject(id) {
  const proj = getProjectById(id);
  if (!proj) return;
  const count = sessions.filter(s => s.projectId === id).length;
  if (!confirm(`Projekt „${proj.name}" löschen?\n\n${count > 0 ? `${count} Sitzung(en) werden ins Allgemeine Projekt verschoben.` : 'Keine Sitzungen betroffen.'}`)) return;
  deleteProject(id);
  updateProjectBadge();
  renderProjectBrowser();
  showToast('Projekt gelöscht', 'success');
}

// ═══════════════════════════════════════════════════
// PAKET 5 + 6 – Projekt-Dashboard + Aufgaben-Tracking
// ═══════════════════════════════════════════════════

// ── Dashboard-Tab öffnen (von Detailansicht aus) ─────────────────────────
function showProjectDashboard(id) {
  const proj = getProjectById(id);
  const el = document.getElementById('projectsView');
  if (!proj || !el) return;
  _currentProjectDetailId = id;

  const projSessions = sessions.filter(s =>
    s.projectId === id &&
    (s.status === 'done' || (s.utterances?.length > 0))
  );

  // ── Statistiken ──────────────────────────────────
  const totalDuration = projSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const allPersons    = [...new Set(projSessions.flatMap(s => s.persons || []).map(p => p.trim()).filter(Boolean))];
  const allTopics     = projSessions.flatMap(s => (s.claudeTopics || []).map(t => typeof t === 'string' ? t : t.text)).filter(Boolean);
  const topicCounts   = {};
  allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  const topTopics     = Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,12);

  // ── Aufgaben aggregieren (Paket 6) ───────────────
  const taskStatus = proj.taskStatus || {};
  const allTasks = projSessions.flatMap(s =>
    (s.workAnalysis?.tasks || []).map((text, idx) => ({
      key: s.id + ':' + idx,
      text,
      sessionLabel: s.label,
      sessionId: s.id,
      done: !!(taskStatus[s.id + ':' + idx]),
    }))
  );
  const openTasks = allTasks.filter(t => !t.done);
  const doneTasks = allTasks.filter(t =>  t.done);

  el.innerHTML = `
    <div class="project-detail">

      <!-- Header -->
      <div class="project-detail-header">
        <button class="project-detail-back" onclick="renderProjectBrowser()">
          ${icon('arrow-left',13)} Projekte
        </button>
        <div class="project-detail-title">
          <span style="width:14px;height:14px;border-radius:50%;background:${proj.color};display:inline-block;flex-shrink:0"></span>
          ${escHtml(proj.name)}
        </div>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button class="btn btn-ghost" style="font-size:0.82rem" onclick="showProjectDetail('${id}')">
            ${icon('list',13)} Sitzungen
          </button>
          <button class="btn btn-ghost" style="font-size:0.82rem" onclick="openEditProjectModal('${id}')">
            ${icon('edit-2',13)} Bearbeiten
          </button>
        </div>
      </div>

      <!-- Statistik-Zeile -->
      <div class="project-detail-info" style="gap:20px">
        <span>${icon('file-text',13,'margin-right:5px')}<strong>${projSessions.length}</strong> Sitzungen</span>
        <span>${icon('clock',13,'margin-right:5px')}<strong>${formatDuration(totalDuration)}</strong> Gesamtdauer</span>
        <span>${icon('users',13,'margin-right:5px')}<strong>${allPersons.length}</strong> beteiligte Personen</span>
        <span>${icon('check-square',13,'margin-right:5px')}<strong>${doneTasks.length}/${allTasks.length}</strong> Aufgaben erledigt</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">

        <!-- Aufgaben (Paket 6) -->
        <div>
          <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
            ${icon('check-square',13,'margin-right:5px')} Aufgaben
          </div>
          ${allTasks.length === 0
            ? `<div style="font-size:0.82rem;color:var(--muted)">Keine Aufgaben in diesem Projekt.<br>Führe eine Arbeits-Analyse in einer Sitzung durch.</div>`
            : `
              ${openTasks.length > 0 ? `
                <div style="margin-bottom:12px">
                  <div style="font-size:0.72rem;color:var(--muted);margin-bottom:6px">Offen (${openTasks.length})</div>
                  ${openTasks.map(t => renderTaskItem(t, id)).join('')}
                </div>` : ''}
              ${doneTasks.length > 0 ? `
                <details style="margin-top:8px">
                  <summary style="font-size:0.72rem;color:var(--muted);cursor:pointer;margin-bottom:6px">Erledigt (${doneTasks.length})</summary>
                  ${doneTasks.map(t => renderTaskItem(t, id)).join('')}
                </details>` : ''}
            `
          }
        </div>

        <!-- Personen -->
        <div>
          <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
            ${icon('users',13,'margin-right:5px')} Beteiligte Personen
          </div>
          ${allPersons.length === 0
            ? `<div style="font-size:0.82rem;color:var(--muted)">Keine Personen erfasst.</div>`
            : `<div style="display:flex;flex-wrap:wrap;gap:6px">
                ${allPersons.map(p =>
                  `<button style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:0.8rem;cursor:pointer;color:var(--text)"
                    onclick="openPersonProfile('${escHtml(p).replace(/'/g,"\\'")}')">
                    ${icon('user',12,'margin-right:4px')}${escHtml(p)}
                  </button>`
                ).join('')}
              </div>`
          }

          <!-- Themen -->
          <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 10px">
            ${icon('tag',13,'margin-right:5px')} Häufige Themen
          </div>
          ${topTopics.length === 0
            ? `<div style="font-size:0.82rem;color:var(--muted)">Keine Themen analysiert.</div>`
            : `<div style="display:flex;flex-wrap:wrap;gap:6px">
                ${topTopics.map(([text, count]) =>
                  `<span style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:0.78rem;color:var(--text)">
                    ${escHtml(text)}${count > 1 ? ` <span style="color:var(--muted);font-size:0.7rem">×${count}</span>` : ''}
                  </span>`
                ).join('')}
              </div>`
          }
        </div>
      </div>

      <!-- Projekt-Analyse (Paket 7) -->
      <div style="margin-top:28px">
        <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
          ${icon('cpu',13,'margin-right:5px')} Projekt-Analyse (Claude)
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn btn-primary" style="font-size:0.82rem" onclick="runProjectAnalysis('${id}','analysis')">
            ${icon('layers',13)} Tiefenanalyse
          </button>
          <button class="btn btn-ghost" style="font-size:0.82rem" onclick="runProjectAnalysis('${id}','status')">
            ${icon('activity',13)} Projekt-Status
          </button>
        </div>
        <div id="projectAnalysisResult" style="display:none;background:var(--surface2);border-radius:var(--radius);padding:16px;font-size:0.85rem;line-height:1.6"></div>
      </div>

    </div>
  `;
}

function renderTaskItem(task, projId) {
  return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" ${task.done ? 'checked' : ''}
        onchange="toggleProjectTask('${projId}','${task.key}',this.checked)"
        style="margin-top:3px;flex-shrink:0;cursor:pointer" />
      <div style="flex:1;min-width:0">
        <div style="font-size:0.83rem;color:var(--text);${task.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${escHtml(task.text)}</div>
        <div style="font-size:0.72rem;color:var(--muted);margin-top:2px">${icon('file-text',10,'margin-right:3px')}${escHtml(task.sessionLabel)}</div>
      </div>
    </div>`;
}

// ── Aufgabe abhaken / aufheben ────────────────────────────────────────────
function toggleProjectTask(projId, taskKey, done) {
  const proj = getProjectById(projId);
  if (!proj) return;
  if (!proj.taskStatus) proj.taskStatus = {};
  if (done) proj.taskStatus[taskKey] = true;
  else delete proj.taskStatus[taskKey];
  saveProjects();
  // Dashboard neu rendern ohne vollständigen Reload (Checkbox-State bleibt stabil durch erneutes Rendern)
  showProjectDashboard(projId);
}

// ═══════════════════════════════════════════════════
// PAKET 7 – Projekt-Analyse via Claude
// ═══════════════════════════════════════════════════

async function runProjectAnalysis(projId, mode = 'analysis') {
  const proj = getProjectById(projId);
  if (!proj) return;

  const resultEl = document.getElementById('projectAnalysisResult');
  if (!resultEl) return;

  const projSessions = sessions.filter(s =>
    s.projectId === projId &&
    (s.status === 'done' || (s.utterances?.length > 0))
  );

  if (projSessions.length === 0) {
    resultEl.style.display = '';
    resultEl.innerHTML = `<span style="color:var(--muted)">Keine analysierten Sitzungen in diesem Projekt.</span>`;
    return;
  }

  // ── Analyse-Kontext aus Sitzungen sammeln (kein Rohtext → Token-Limit) ──
  const sitzungsAnalysen = projSessions.map((s, i) => {
    const parts = [`[${i+1}] ${s.label} (${new Date(s.date).toLocaleDateString('de-DE')})`];
    if (s.workAnalysis?.summary)    parts.push(`Zusammenfassung: ${s.workAnalysis.summary}`);
    if (s.workAnalysis?.tasks?.length)     parts.push(`Aufgaben: ${s.workAnalysis.tasks.join(' | ')}`);
    if (s.workAnalysis?.decisions?.length) parts.push(`Entscheidungen: ${s.workAnalysis.decisions.join(' | ')}`);
    if (s.workAnalysis?.openQuestions?.length) parts.push(`Offene Fragen: ${s.workAnalysis.openQuestions.join(' | ')}`);
    if (s.privateAnalysis?.openTopics?.length) parts.push(`Offene Themen: ${s.privateAnalysis.openTopics.join(' | ')}`);
    if (s.claudeTopics?.length) {
      const topicTexts = s.claudeTopics.map(t => typeof t === 'string' ? t : t.text).slice(0, 8);
      parts.push(`Themen: ${topicTexts.join(', ')}`);
    }
    return parts.join('\n');
  }).join('\n\n---\n\n');

  // ── Prompt auswählen ──────────────────────────────
  const promptId = mode === 'status' ? 'builtin_project_status' : 'builtin_project_analysis';
  const promptDef = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === promptId);
  if (!promptDef) { showToast('Prompt nicht gefunden', 'error'); return; }

  const prompt = promptDef.prompt
    .replace('{{projektName}}',    proj.name)
    .replace('{{projektZiel}}',    proj.goalDescription || '(kein Ziel definiert)')
    .replace('{{sitzungsAnzahl}}', projSessions.length)
    .replace('{{sitzungsAnalysen}}', sitzungsAnalysen);

  // ── Laden-Zustand zeigen ─────────────────────────
  resultEl.style.display = '';
  resultEl.innerHTML = `<span style="color:var(--muted)">${icon('cpu',14,'margin-right:6px')} Claude analysiert${mode === 'status' ? ' Projektstatus' : ' das Projekt'}…</span>`;

  try {
    const { text } = await callClaudeAPI(prompt);
    const json = JSON.parse(extractJSON(text, '{'));
    resultEl.innerHTML = renderAnalysisResult(json, mode);
    showToast('Analyse abgeschlossen', 'success');
  } catch(e) {
    resultEl.innerHTML = `<span style="color:var(--red)">${icon('alert-circle',14,'margin-right:6px')} Fehler: ${escHtml(e.message)}</span>`;
    showToast('Analyse fehlgeschlagen: ' + e.message, 'error');
  }
}

function renderAnalysisResult(json, mode) {
  if (mode === 'status') {
    const statusColors = { 'on-track': 'var(--green)', 'at-risk': '#f59e0b', 'blocked': 'var(--red)' };
    const statusLabels = { 'on-track': '✓ On Track', 'at-risk': '⚠ At Risk', 'blocked': '✕ Blockiert' };
    const col = statusColors[json.status] || 'var(--muted)';
    const lbl = statusLabels[json.status] || json.status;
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-weight:700;font-size:1rem;color:${col}">${lbl}</span>
      </div>
      ${json.zusammenfassung ? `<p style="margin:0 0 10px"><strong>Status:</strong> ${escHtml(json.zusammenfassung)}</p>` : ''}
      ${json.letzteAktivitaet ? `<p style="margin:0 0 10px"><strong>Letzte Aktivität:</strong> ${escHtml(json.letzteAktivitaet)}</p>` : ''}
      ${json.naechsterSchritt ? `<p style="margin:0 0 10px"><strong>Nächster Schritt:</strong> ${escHtml(json.naechsterSchritt)}</p>` : ''}
      ${json.risiken?.length ? `
        <div style="margin-top:8px"><strong>Risiken:</strong>
          <ul style="margin:6px 0 0 16px;padding:0">${json.risiken.map(r=>`<li>${escHtml(r)}</li>`).join('')}</ul>
        </div>` : ''}`;
  }

  // Tiefenanalyse
  const sections = [
    { key: 'gesamtbild',     label: 'Gesamtbild',       single: true },
    { key: 'fortschritt',    label: 'Fortschritt',       single: false },
    { key: 'offenePunkte',   label: 'Offene Punkte',     single: false },
    { key: 'muster',         label: 'Muster',            single: false },
    { key: 'empfehlungen',   label: 'Empfehlungen',      single: false },
  ];
  return sections.map(({ key, label, single }) => {
    const val = json[key];
    if (!val || (Array.isArray(val) && !val.length)) return '';
    if (single) return `<p style="margin:0 0 12px"><strong>${label}:</strong> ${escHtml(val)}</p>`;
    return `
      <div style="margin-bottom:12px">
        <strong>${label}:</strong>
        <ul style="margin:6px 0 0 16px;padding:0">${val.map(v=>`<li style="margin-bottom:3px">${escHtml(v)}</li>`).join('')}</ul>
      </div>`;
  }).join('');
}


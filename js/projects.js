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

let _projectsViewMode = localStorage.getItem('distillProjectsView') || 'list';
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

// ── Sitzung aus Projekt-View öffnen (v4.99) ──────────────────────────────
// Schließt das projectsView-Overlay zuerst, dann öffnet die Session.
// Ohne diesen Schritt bleibt der fixe Overlay oben und verdeckt das transcriptCard.
function _openSessionFromProject(id) {
  const pv = document.getElementById('projectsView');
  if (pv) pv.style.display = 'none';
  const s = (typeof sessions !== 'undefined') ? sessions.find(x => x.id === id) : null;
  if (!s) return;
  if (typeof currentSessionId !== 'undefined') currentSessionId = id;
  if (typeof showTranscript === 'function') showTranscript(s);
}

// ── Projekt-Browser ein-/ausblenden ─────────────────────────────────────
function toggleProjectsView() {
  const el = document.getElementById('projectsView');
  if (!el) return;
  if (el.style.display === 'block') {
    // Schließen
    el.style.display = 'none';
    _setHeaderBtn('navProjects', false);
    const bt = document.getElementById('browserToolbar');
    if (bt) bt.style.display = '';
    closeProjectAssistant(); // v5.74
    _currentProjectDetailId = null;
    _updateProjectAssistFab();
  } else {
    // Öffnen
    if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17: Chat-Sidebar schließen
    _showOverlay('projectsView', 'navProjects', renderProjectBrowser);
    // Projekte aus Drive aktualisieren (v4.99) – silent im Hintergrund
    if (typeof loadSettingsFromDrive === 'function') {
      loadSettingsFromDrive().catch(() => {});
    }
  }
}

// ── Projekt-Browser rendern ──────────────────────────────────────────────
function _setProjectsViewMode(mode) {
  _projectsViewMode = mode;
  localStorage.setItem('distillProjectsView', mode);
  renderProjectBrowser();
}

function renderProjectBrowser() {
  const el = document.getElementById('projectsView');
  if (!el) return;
  _currentProjectDetailId = null;
  closeProjectAssistant(); // v5.74: Panel schließen wenn zurück zur Übersicht
  _updateProjectAssistFab();

  const active   = projects.filter(p => p.status === 'active');
  const paused   = projects.filter(p => p.status === 'paused');
  const archived = projects.filter(p => p.status === 'archived');

  function renderGroup(list, groupLabel) {
    if (!list.length) return '';
    const content = _projectsViewMode === 'list'
      ? list.map(p => _renderProjectListRow(p)).join('')
      : `<div class="projects-grid">${list.map(p => renderProjectCard(p)).join('')}</div>`;
    return `
      <div style="margin-bottom:28px">
        <div style="font-size:0.75rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">${groupLabel}</div>
        ${content}
      </div>`;
  }

  el.innerHTML = `
    <div class="projects-browser">
      <div class="projects-browser-header">
        <h2>${icon('layers',18)} Projekte <button class="help-icon" data-help="Gruppiere Sitzungen nach Themen oder Beziehungen. Jedes Projekt hat eine Sitzungsliste und ein Dashboard mit aggregierten Aufgaben, Themen und Analysen." onclick="showHelpTooltip(this)">?</button></h2>
        <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
          <div class="view-toggle">
            <button class="view-btn ${_projectsViewMode==='list'?'active':''}" onclick="_setProjectsViewMode('list')" title="Listenansicht">☰</button>
            <button class="view-btn ${_projectsViewMode==='grid'?'active':''}" onclick="_setProjectsViewMode('grid')" title="Kachelansicht">⊞</button>
          </div>
          <button class="btn btn-primary" onclick="openCreateProjectModal()">
            ${icon('plus',14)} Neues Projekt
          </button>
        </div>
      </div>
      ${renderGroup(active, 'Aktiv')}
      ${renderGroup(paused, 'Pausiert')}
      ${renderGroup(archived, 'Archiviert')}
      ${!projects.length ? '<div class="browser-empty">Noch keine Projekte vorhanden.</div>' : ''}
    </div>
  `;
}

function _renderProjectListRow(p) {
  const count = sessions.filter(s => s.projectId === p.id).length;
  const statusLabel = { active: 'Aktiv', paused: 'Pausiert', archived: 'Archiviert' }[p.status] || p.status;
  const canDelete = !p.builtin;
  return `
    <div class="pj-list-row" onclick="showProjectDetail('${p.id}')">
      <span class="pj-lr-dot" style="background:${p.color}"></span>
      <span class="pj-lr-name">${escHtml(p.name)}</span>
      <span class="project-card-status ${p.status} pj-lr-status">${statusLabel}</span>
      <span class="pj-lr-count">${count} Sitzung${count!==1?'en':''}</span>
      <span class="pj-lr-date">${new Date(p.createdAt).toLocaleDateString('de-DE')}</span>
      <div class="pj-lr-actions" onclick="event.stopPropagation()">
        <button class="pj-lr-btn" onclick="openEditProjectModal('${p.id}')" title="Bearbeiten">✎</button>
        ${p.status !== 'archived'
          ? `<button class="pj-lr-btn hide-mobile" onclick="confirmArchiveProject('${p.id}')" title="Archivieren">⊘</button>`
          : `<button class="pj-lr-btn hide-mobile" onclick="confirmUnarchiveProject('${p.id}')" title="Aktivieren">↩</button>`}
        ${canDelete ? `<button class="pj-lr-btn danger hide-mobile" onclick="confirmDeleteProject('${p.id}')" title="Löschen">✕</button>` : ''}
      </div>
    </div>`;
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
  _updateProjectAssistFab(); // v5.74: FAB einblenden
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
            ${icon('bar-chart-2',13)} Dashboard <button class="help-icon" data-help="Überblick über alle Sitzungen dieses Projekts: Aufgaben-Tracking, beteiligte Personen, häufige Themen und KI-Analyse über alle Sitzungen hinweg." onclick="showHelpTooltip(this)">?</button>
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
    <div class="session-card card-${t}" onclick="_openSessionFromProject('${s.id}')">
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

  // Prompt-Dropdown befüllen
  const pmPrompt = overlay.querySelector('#pmPrompt');
  if (pmPrompt) {
    pmPrompt.innerHTML = '<option value="">Kein Standard (manuell wählen)</option>' +
      (EDITABLE_PROMPT_DEFAULTS || []).map(p =>
        `<option value="${p.id}"${p.id === data.promptTemplateId ? ' selected' : ''}>${escHtml(p.name)}</option>`
      ).join('');
  }

  // Kontakt-Dropdown befüllen (v5.42)
  const pmKontakt = overlay.querySelector('#pmKontakt');
  if (pmKontakt) {
    pmKontakt.innerHTML = '<option value="">Kein Kontakt</option>' +
      (typeof contacts !== 'undefined' ? contacts : [])
        .slice().sort((a,b) => a.name.localeCompare(b.name, 'de'))
        .map(c => `<option value="${c.id}"${c.id === data.kontaktId ? ' selected' : ''}>${escHtml(c.name)}</option>`)
        .join('');
  }

  // Löschen-Button: nur beim Bearbeiten + nicht bei Builtin-Projekten
  const deleteBtn = overlay.querySelector('#pmDeleteBtn');
  if (deleteBtn) {
    deleteBtn.style.display = (_projectModalMode === 'edit' && !data.builtin) ? 'inline-flex' : 'none';
  }

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
  const promptTemplateId = document.getElementById('pmPrompt')?.value || null;
  const kontaktId = document.getElementById('pmKontakt')?.value || null;

  if (_projectModalMode === 'create') {
    const proj = createProject({ name, color, goalDescription, promptTemplateId });
    if (proj && kontaktId) updateProject(proj.id, { kontaktId });
  } else {
    updateProject(_projectModalEditId, { name, color, goalDescription, status, promptTemplateId, kontaktId });
  }

  closeProjectModal();
  _refreshAllViews();

  // Zurück zum richtigen View
  if (_currentProjectDetailId) {
    renderProjectDetail(_currentProjectDetailId);
  } else {
    renderProjectBrowser();
  }
  showToast(_projectModalMode === 'create' ? `Projekt „${name}" angelegt` : `Projekt aktualisiert`, 'success');
}

// ── Archivieren / Aktivieren / Löschen ──────────────────────────────────
function _refreshAllViews() {
  // Nach jeder Projekt-Änderung alle betroffenen UI-Teile aktualisieren
  updateProjectBadge();
  updateProjectFilterDropdown(); // Archiv-Dropdown
  renderBrowser();               // Session-Kacheln + Filter
}

function confirmArchiveProject(id) {
  const proj = getProjectById(id);
  if (!proj) return;
  if (!confirm(`Projekt „${proj.name}" archivieren?\n\nDie Sitzungen bleiben erhalten.`)) return;
  archiveProject(id);
  _refreshAllViews();
  renderProjectBrowser();
  showToast(`Projekt archiviert`, 'success');
}

function confirmUnarchiveProject(id) {
  updateProject(id, { status: 'active' });
  _refreshAllViews();
  renderProjectBrowser();
  showToast('Projekt wieder aktiviert', 'success');
}

function confirmDeleteProject(id) {
  const proj = getProjectById(id);
  if (!proj) return;
  const count = sessions.filter(s => s.projectId === id).length;
  if (!confirm(`Projekt „${proj.name}" löschen?\n\n${count > 0 ? `${count} Sitzung(en) werden ins Allgemeine Projekt verschoben.` : 'Keine Sitzungen betroffen.'}`)) return;
  deleteProject(id);
  _refreshAllViews();
  renderProjectBrowser();
  showToast('Projekt gelöscht', 'success');
}

// ═══════════════════════════════════════════════════
// PAKET 5 + 6 – Projekt-Dashboard + Aufgaben-Tracking
// ═══════════════════════════════════════════════════

// ── Dashboard-Tab öffnen (von Detailansicht aus) ─────────────────────────
function showProjectDashboard(id) {
  try {
  const proj = getProjectById(id);
  const el = document.getElementById('projectsView');
  if (!proj || !el) { showToast('Projekt nicht gefunden (id: ' + id + ')', 'error'); return; }
  _currentProjectDetailId = id;

  // Sofort Ladeindikator zeigen – beweist dass die Funktion aufgerufen wird
  el.innerHTML = '<div style="padding:24px;color:var(--muted)">Dashboard wird geladen…</div>';

  // Alle Sessions des Projekts – kein Status-Filter damit nichts verloren geht
  const projSessions = sessions.filter(s => s.projectId === id);

  // ── Statistiken ──────────────────────────────────
  const totalDuration = projSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Personen: ownerName immer als Erster + s.persons der Projekt-Sessions
  const myName = ownerName || 'Ich';
  const personSet = new Set();
  projSessions.forEach(s => {
    const raw = s.persons;
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? raw.split(',')
        : [];
    list.forEach(p => { const n = p.trim(); if (n) personSet.add(n); });
  });
  // Owner immer zuerst, dann alle anderen alphabetisch
  const allPersons = [myName, ...[...personSet].filter(p => p !== myName).sort((a,b) => a.localeCompare(b,'de'))];

  const allTopics = projSessions.flatMap(s => (s.claudeTopics || []).map(t => typeof t === 'string' ? t : t.text)).filter(Boolean);
  const topicCounts = {};
  allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  const topTopics = Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,12);

  // ── Aufgaben aggregieren (Paket 6) ───────────────
  const taskStatus  = proj.taskStatus  || {};
  const taskPersons = proj.taskPersons || {}; // Personen-Zuweisung pro Task
  const allTasks = projSessions.flatMap(s =>
    (s.workAnalysis?.tasks || []).map((text, idx) => {
      const key = s.id + ':' + idx;
      const resolved = _resolveTaskText(text);
      // Projekt-Überschreibung hat Vorrang
      const assignedPerson = taskPersons[key] !== undefined ? taskPersons[key] : resolved.person;
      return {
        key,
        text,
        resolvedText: resolved.text,
        resolvedDeadline: resolved.deadline,
        resolvedPriority: resolved.priority,
        assignedPerson,
        sessionLabel: s.label,
        done: !!(taskStatus[key]),
      };
    })
  );

  // ── Nach Person gruppieren ────────────────────────
  // Aufgelöste Person: Task-Person auf canonical allPersons mappen
  const _resolvePersonKey = rawPerson => {
    if (!rawPerson || rawPerson.trim() === '') return 'offen';
    const firstWord = rawPerson.trim().toLowerCase().split(/[\s(,]/)[0];
    // Suche in allPersons nach übereinstimmendem Erstwort
    const match = allPersons.find(p => p.toLowerCase().split(/[\s(,]/)[0] === firstWord);
    return match || rawPerson.trim();
  };

  const taskGroups = {};  // canonicalPerson → [tasks]
  allTasks.forEach(t => {
    const p = _resolvePersonKey(t.assignedPerson);
    if (!taskGroups[p]) taskGroups[p] = [];
    taskGroups[p].push(t);
  });
  // Sortierung: benannte Personen alphabetisch, "offen" immer zuletzt
  const sortedPersonGroups = Object.keys(taskGroups)
    .filter(p => p !== 'offen')
    .sort((a,b) => a.localeCompare(b, 'de'))
    .concat(taskGroups['offen'] ? ['offen'] : []);

  const doneTasks = allTasks.filter(t => t.done);

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
              ${sortedPersonGroups.map(person => {
                  const tasks = taskGroups[person] || [];
                  const open = tasks.filter(t => !t.done);
                  const done = tasks.filter(t =>  t.done);
                  const isOffen = person === 'offen';
                  return `
                    <div style="margin-bottom:18px">
                      <div style="font-size:0.78rem;font-weight:600;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:6px">
                        ${isOffen ? icon('help-circle',13,'color:var(--muted)') : icon('user',13)}
                        ${isOffen ? '<span style="color:var(--muted)">Nicht zugewiesen</span>' : escHtml(person)}
                        <span style="font-weight:400;color:var(--muted);font-size:0.72rem">(${open.length} offen${done.length ? ', '+done.length+' erledigt' : ''})</span>
                      </div>
                      ${open.map(t => renderTaskItem(t, id, allPersons)).join('')}
                      ${done.length > 0 ? `
                        <details style="margin-top:4px">
                          <summary style="font-size:0.72rem;color:var(--muted);cursor:pointer">Erledigt (${done.length})</summary>
                          ${done.map(t => renderTaskItem(t, id, allPersons)).join('')}
                        </details>` : ''}
                    </div>`;
                }).join('')}
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
                    onclick="togglePersonsView();setTimeout(()=>renderPersonProfile('${escHtml(p).replace(/'/g,"\\'")}'),50)">
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
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
          <select id="projAnalysisPromptSelect" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 12px;font-size:0.82rem;outline:none;cursor:pointer;flex:1;min-width:200px">
            <option value="">Prompt wählen…</option>
            ${(EDITABLE_PROMPT_DEFAULTS||[]).map(p =>
              `<option value="${p.id}"${p.id === proj.promptTemplateId ? ' selected' : ''}>${escHtml(p.name)}</option>`
            ).join('')}
          </select>
          <button class="btn btn-primary" style="font-size:0.82rem" onclick="runProjectAnalysis('${id}')">
            ${icon('play',13)} Analysieren
          </button>
        </div>
        <!-- Akkordeon: gespeicherte Analyse-Ergebnisse -->
        <div id="projAnalysisAccordion" class="session-accordion">
          ${_renderProjectAnalysisAccordion(proj)}
        </div>
      </div>

    </div>
  `;
  } catch(err) {
    const el2 = document.getElementById('projectsView');
    if (el2) el2.innerHTML = `<div style="padding:24px;color:var(--red)">Dashboard-Fehler: ${escHtml(err.message)}<br><pre style="font-size:0.75rem;margin-top:8px">${escHtml(err.stack||'')}</pre></div>`;
    console.error('showProjectDashboard Fehler:', err);
  }
}

function _resolveTaskText(raw) {
  // Tasks können Strings ODER Objekte sein {task, person, deadline, priority}
  if (typeof raw === 'string') return { text: raw, person: '', deadline: '', priority: '' };
  if (raw && typeof raw === 'object') {
    return {
      text:     String(raw.task || raw.text || raw.description || JSON.stringify(raw)),
      person:   String(raw.person   || raw.assignee || ''),
      deadline: String(raw.deadline || raw.due      || ''),
      priority: String(raw.priority || ''),
    };
  }
  return { text: String(raw || ''), person: '', deadline: '', priority: '' };
}

function renderTaskItem(task, projId, knownPersons = []) {
  const meta = [
    task.resolvedDeadline ? `📅 ${escHtml(task.resolvedDeadline)}` : '',
    task.resolvedPriority ? `${task.resolvedPriority === 'hoch' ? '🔴' : task.resolvedPriority === 'mittel' ? '🟡' : '🟢'} ${escHtml(task.resolvedPriority)}` : '',
    `${icon('file-text',10,'margin-right:3px')}${escHtml(String(task.sessionLabel || ''))}`,
  ].filter(Boolean).join(' · ');

  // Person-Dropdown: alle bekannten Personen + "offen"
  const personOptions = ['offen', ...knownPersons]
    .map(p => `<option value="${escHtml(p)}"${p === (task.assignedPerson||'offen') ? ' selected' : ''}>${escHtml(p)}</option>`)
    .join('');

  return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" ${task.done ? 'checked' : ''}
        onchange="toggleProjectTask('${projId}','${task.key}',this.checked)"
        style="margin-top:3px;flex-shrink:0;cursor:pointer" />
      <div style="flex:1;min-width:0">
        <div style="font-size:0.83rem;color:var(--text);${task.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${escHtml(task.resolvedText)}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">
          <select onchange="assignTaskPerson('${projId}','${task.key}',this.value)"
            style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:2px 6px;font-size:0.72rem;outline:none;cursor:pointer">
            ${personOptions}
          </select>
          <span style="font-size:0.72rem;color:var(--muted)">${meta}</span>
        </div>
      </div>
    </div>`;
}

// ── Person einer Aufgabe zuweisen ─────────────────────────────────────────
function assignTaskPerson(projId, taskKey, person) {
  const proj = getProjectById(projId);
  if (!proj) return;
  if (!proj.taskPersons) proj.taskPersons = {};
  if (!person || person === 'offen') delete proj.taskPersons[taskKey];
  else proj.taskPersons[taskKey] = person;
  saveProjects();
  showProjectDashboard(projId);
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
// PAKET 7 – Projekt-Analyse via Claude (Bibliotheks-Prompts + Akkordeon)
// ═══════════════════════════════════════════════════

function _buildSitzungsAnalysen(projSessions) {
  return projSessions.map((s, i) => {
    const parts = [`[${i+1}] ${s.label} (${new Date(s.date).toLocaleDateString('de-DE')})`];
    if (s.workAnalysis?.summary)           parts.push(`Zusammenfassung: ${s.workAnalysis.summary}`);
    if (s.workAnalysis?.tasks?.length)     parts.push(`Aufgaben: ${s.workAnalysis.tasks.map(t => _resolveTaskText(t).text).join(' | ')}`);
    if (s.workAnalysis?.decisions?.length) parts.push(`Entscheidungen: ${s.workAnalysis.decisions.join(' | ')}`);
    if (s.workAnalysis?.openQuestions?.length) parts.push(`Offene Fragen: ${s.workAnalysis.openQuestions.join(' | ')}`);
    if (s.privateAnalysis?.openTopics?.length) parts.push(`Offene Themen: ${s.privateAnalysis.openTopics.join(' | ')}`);
    if (s.claudeTopics?.length) {
      const topicTexts = s.claudeTopics.map(t => typeof t === 'string' ? t : t.text).slice(0, 8);
      parts.push(`Themen: ${topicTexts.join(', ')}`);
    }
    return parts.join('\n');
  }).join('\n\n---\n\n');
}

async function runProjectAnalysis(projId) {
  const proj = getProjectById(projId);
  if (!proj) return;

  const promptId = document.getElementById('projAnalysisPromptSelect')?.value;
  if (!promptId) { showToast('Bitte zuerst einen Prompt auswählen.', 'error'); return; }

  const promptDef = EDITABLE_PROMPT_DEFAULTS.find(p => p.id === promptId);
  if (!promptDef) { showToast('Prompt nicht gefunden.', 'error'); return; }

  const projSessions = sessions.filter(s =>
    s.projectId === projId &&
    (s.status === 'done' || (s.utterances?.length > 0))
  );

  if (projSessions.length === 0) {
    showToast('Keine analysierten Sitzungen in diesem Projekt.', 'error'); return;
  }

  const sitzungsAnalysen = _buildSitzungsAnalysen(projSessions);

  // Prompt-Variablen ersetzen (Projekt-spezifisch + allgemein)
  const getPromptText = typeof getEditablePromptText === 'function'
    ? getEditablePromptText(promptId)
    : promptDef.prompt;

  const prompt = (getPromptText || promptDef.prompt)
    .replace(/\{\{projektName\}\}/g,      proj.name)
    .replace(/\{\{projektZiel\}\}/g,      proj.goalDescription || '(kein Ziel definiert)')
    .replace(/\{\{sitzungsAnzahl\}\}/g,   String(projSessions.length))
    .replace(/\{\{sitzungsAnalysen\}\}/g, sitzungsAnalysen)
    .replace(/\{\{transkript\}\}/g,       sitzungsAnalysen)   // Fallback für nicht-Projekt-Prompts
    .replace(/\{\{speakerA\}\}/g,         'Sprecher A')
    .replace(/\{\{speakerB\}\}/g,         'Sprecher B');

  // Lade-Spinner im Akkordeon
  const accordion = document.getElementById('projAnalysisAccordion');
  if (accordion) {
    const loadingPanel = document.createElement('div');
    loadingPanel.className = 'acc-panel open';
    loadingPanel.id = 'projAnalysisLoading';
    loadingPanel.innerHTML = `
      <div class="acc-panel-header" style="cursor:default">
        ${icon('cpu',14,'margin-right:6px')} ${escHtml(promptDef.name)} – wird analysiert…
      </div>
      <div class="acc-panel-body" style="color:var(--muted);font-size:0.83rem">Claude analysiert…</div>`;
    accordion.prepend(loadingPanel);
  }

  try {
    const { text } = await callClaudeAPI(prompt);

    // Ergebnis parsen: JSON versuchen, sonst Plaintext
    let resultHtml;
    let isMindMap = false;
    let mindMapData = null;
    try {
      const json = JSON.parse(extractJSON(text, '{'));
      // Mind-Map erkennen: hat label + children auf Root-Ebene
      if (json && json.label && Array.isArray(json.children)) {
        isMindMap = true;
        mindMapData = json;
        const mmId = 'projMindmap_' + Date.now();
        resultHtml = `<div id="${mmId}" style="width:100%;height:420px;overflow:hidden;border-radius:var(--radius)"></div>`;
      } else {
        resultHtml = _renderProjectJsonResult(json);
      }
    } catch {
      resultHtml = `<div style="white-space:pre-wrap;font-size:0.85rem;line-height:1.6">${escHtml(text.trim())}</div>`;
    }

    // Ergebnis im Projekt-Objekt speichern
    if (!proj.analysisResults) proj.analysisResults = [];
    proj.analysisResults.unshift({
      promptId,
      promptName: promptDef.name,
      resultHtml,
      mindMapData: isMindMap ? mindMapData : null,
      timestamp: new Date().toISOString(),
    });
    saveProjects();

    // Akkordeon neu rendern
    document.getElementById('projAnalysisLoading')?.remove();
    if (accordion) accordion.innerHTML = _renderProjectAnalysisAccordion(proj);

    // Mind Map D3 rendern falls erkannt
    if (isMindMap && mindMapData) {
      const mmContainer = accordion.querySelector('[id^="projMindmap_"]');
      if (mmContainer && typeof _renderD3Mindmap === 'function') {
        setTimeout(() => _renderD3Mindmap(mmContainer, mindMapData), 50);
      }
    }
    showToast('Analyse abgeschlossen', 'success');
  } catch(e) {
    document.getElementById('projAnalysisLoading')?.remove();
    if (accordion) {
      const errPanel = document.createElement('div');
      errPanel.className = 'acc-panel open';
      errPanel.innerHTML = `
        <div class="acc-panel-header" style="color:var(--red);cursor:default">${icon('alert-circle',14,'margin-right:6px')} Fehler</div>
        <div class="acc-panel-body" style="color:var(--red);font-size:0.83rem">${escHtml(e.message)}</div>`;
      accordion.prepend(errPanel);
    }
    showToast('Analyse fehlgeschlagen: ' + e.message, 'error');
  }
}

// ── Akkordeon-Renderer ────────────────────────────────────────────────────
function _renderProjectAnalysisAccordion(proj) {
  const results = proj.analysisResults || [];
  if (!results.length) {
    return `<div style="font-size:0.82rem;color:var(--muted);padding:8px 0">Noch keine Analysen. Prompt auswählen und „Analysieren" klicken.</div>`;
  }
  const html = results.map((r, i) => `
    <div class="acc-panel${i === 0 ? ' open' : ''}" data-result-idx="${i}">
      <div class="acc-panel-header" onclick="this.parentElement.classList.toggle('open');_initProjMindmapInPanel(this.parentElement,'${proj.id}',${i})">
        ${icon('cpu',13,'margin-right:6px')} ${escHtml(r.promptName)}
        <span style="margin-left:auto;font-size:0.72rem;color:var(--muted);font-weight:400">
          ${new Date(r.timestamp).toLocaleDateString('de-DE', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
        </span>
        <span class="acc-chevron">${icon('chevron-down',14,'margin-left:8px')}</span>
        <button onclick="event.stopPropagation();_deleteProjectAnalysis('${proj.id}',${i})"
          style="background:none;border:none;color:var(--muted);cursor:pointer;padding:0 0 0 8px;font-size:0.75rem"
          title="Löschen">✕</button>
      </div>
      <div class="acc-panel-body">${r.resultHtml}</div>
    </div>`
  ).join('');

  // Mind Maps der offenen Panels nach kurzem Delay rendern
  setTimeout(() => {
    results.forEach((r, i) => {
      if (r.mindMapData && i === 0) {
        const panel = document.querySelector(`[data-result-idx="${i}"]`);
        if (panel) _initProjMindmapInPanel(panel, proj.id, i);
      }
    });
  }, 80);

  return html;
}

function _initProjMindmapInPanel(panel, projId, idx) {
  const proj = getProjectById(projId);
  const r = proj?.analysisResults?.[idx];
  if (!r?.mindMapData) return;
  const container = panel.querySelector('[id^="projMindmap_"]');
  if (container && container.children.length === 0 && typeof _renderD3Mindmap === 'function') {
    _renderD3Mindmap(container, r.mindMapData);
  }
}

function _renderProjectJsonResult(json) {
  return Object.entries(json).map(([key, val]) => {
    if (val === null || val === undefined || val === '') return '';
    if (Array.isArray(val) && !val.length) return '';
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    if (typeof val === 'string') {
      if (key === 'status') {
        const col = { 'on-track':'var(--green)', 'at-risk':'#f59e0b', 'blocked':'var(--red)' }[val] || 'var(--text)';
        const lbl = { 'on-track':'✓ On Track', 'at-risk':'⚠ At Risk', 'blocked':'✕ Blockiert' }[val] || val;
        return `<p style="margin:0 0 10px"><strong>${label}:</strong> <span style="color:${col};font-weight:600">${lbl}</span></p>`;
      }
      return `<p style="margin:0 0 10px"><strong>${label}:</strong> ${escHtml(val)}</p>`;
    }

    if (Array.isArray(val)) {
      const items = val.map(v => `<li style="margin-bottom:4px">${_renderJsonValue(v)}</li>`).join('');
      return `<div style="margin-bottom:12px"><strong>${label}:</strong>
        <ul style="margin:6px 0 0 16px;padding:0">${items}</ul>
      </div>`;
    }

    if (typeof val === 'object') {
      // Verschachteltes Objekt – z.B. Mind Map root
      return `<div style="margin-bottom:12px"><strong>${label}:</strong>
        <div style="margin-top:6px;padding-left:12px;border-left:2px solid var(--border)">
          ${_renderProjectJsonResult(val)}
        </div>
      </div>`;
    }
    return '';
  }).join('');
}

// Einzelnen Wert aus einem Array rendern (String, Objekt, verschachtelt)
function _renderJsonValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return escHtml(v);
  if (typeof v === 'number' || typeof v === 'boolean') return escHtml(String(v));
  if (typeof v === 'object') {
    // Häufige Felder priorisieren: text, label, task, wish, title, name, content
    const text = v.text || v.label || v.task || v.wish || v.title || v.name || v.content || v.description;
    if (text && typeof text === 'string') {
      // Gibt es Kinder? (z.B. Mind Map)
      const children = v.children || v.items || v.subtopics;
      if (Array.isArray(children) && children.length) {
        return `${escHtml(text)}<ul style="margin:4px 0 0 16px;padding:0">
          ${children.map(c => `<li style="margin-bottom:2px">${_renderJsonValue(c)}</li>`).join('')}
        </ul>`;
      }
      return escHtml(text);
    }
    // Fallback: alle String-Felder ausgeben
    const parts = Object.entries(v)
      .filter(([,val]) => typeof val === 'string' && val)
      .map(([k,val]) => `<span style="color:var(--muted);font-size:0.78rem">${k}:</span> ${escHtml(val)}`);
    return parts.join(' · ') || JSON.stringify(v);
  }
  return escHtml(String(v));
}

function _deleteProjectAnalysis(projId, idx) {
  const proj = getProjectById(projId);
  if (!proj?.analysisResults) return;
  proj.analysisResults.splice(idx, 1);
  saveProjects();
  const accordion = document.getElementById('projAnalysisAccordion');
  if (accordion) accordion.innerHTML = _renderProjectAnalysisAccordion(proj);
}

// ══════════════════════════════════════════════════════
// PROJEKT-ASSISTENT (v5.74)
// Chat-Sidebar mit Analysen aller Projekt-Sitzungen
// ══════════════════════════════════════════════════════

// ── FAB ein-/ausblenden wenn Projektdetail aktiv ────
function _updateProjectAssistFab() {
  // v5.76: Fähnchen statt FAB
  const flap = document.getElementById('projAssistFlap');
  if (!flap) return;
  const show = !!_currentProjectDetailId;
  flap.classList.toggle('hidden', !show);
  // Lucide-Icons rendern falls neu sichtbar
  if (show && window.lucide) lucide.createIcons({ nodes: [flap] });
}

function toggleProjectAssistant() {
  const panel = document.getElementById('projAssistPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    closeProjectAssistant();
  } else {
    openProjectAssistant();
  }
}

function openProjectAssistant() {
  if (!_currentProjectDetailId) return;
  const proj = getProjectById(_currentProjectDetailId);
  if (!proj) return;

  // Panel öffnen
  const panel   = document.getElementById('projAssistPanel');
  const overlay = document.getElementById('projAssistOverlay');
  const title   = document.getElementById('projAssistTitle');
  if (!panel) return;

  panel.classList.add('open');
  if (overlay) overlay.classList.add('active');
  if (title) title.textContent = proj.name;
  // v5.76: Fähnchen als "offen" markieren
  document.getElementById('projAssistFlap')?.classList.add('proj-assist-flap-open');

  // Kontext-Info
  const sessionsInProj = (typeof sessions !== 'undefined')
    ? sessions.filter(s => s.projectId === proj.id && (s.status === 'done' || s.utterances?.length > 0))
    : [];
  const withAnalyses = sessionsInProj.filter(s =>
    s.privateAnalysis || s.workAnalysis || s.claudeSentiment || s.claudeChapters || s.claudeTopics || Object.keys(s.customResults || {}).length
  );
  const infoEl = document.getElementById('projAssistContextInfo');
  if (infoEl) {
    infoEl.innerHTML = `${sessionsInProj.length} Sitzung${sessionsInProj.length !== 1 ? 'en' : ''} · ${withAnalyses.length} mit Analysen`;
  }

  // Rollen-Dropdown befüllen
  if (typeof populatePersonaSelects === 'function') populatePersonaSelects();

  // Nachrichten rendern
  _renderProjectChatMessages(proj);

  // Lucide neu zeichnen
  if (window.lucide) lucide.createIcons({ nodes: [panel] });

  // Fokus
  setTimeout(() => document.getElementById('projAssistInput')?.focus(), 300);
}

function closeProjectAssistant() {
  document.getElementById('projAssistPanel')?.classList.remove('open');
  document.getElementById('projAssistOverlay')?.classList.remove('active');
  // v5.76: Fähnchen-State zurücksetzen
  document.getElementById('projAssistFlap')?.classList.remove('proj-assist-flap-open');
}

// ── Nachrichten rendern ─────────────────────────────
function _renderProjectChatMessages(proj) {
  const container = document.getElementById('projAssistMessages');
  if (!container) return;
  const chat = proj?.claudeChat || [];
  if (!chat.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:24px 12px;font-size:0.85rem">
      Stelle eine Frage zu diesem Projekt.<br>
      <span style="font-size:0.78rem;opacity:0.7">z.B. „Welche offenen Aufgaben gibt es?"</span>
    </div>`;
    return;
  }
  container.innerHTML = chat.map((m, i) => `
    <div style="margin-bottom:16px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px">Du</div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:0.88rem">${escHtml(m.question)}</div>
    </div>
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">Assistent</span>
        <button onclick="_copyProjAssistAnswer(${i})"
          style="background:none;border:1px solid var(--border);border-radius:5px;padding:1px 7px;font-size:0.7rem;color:var(--muted);cursor:pointer">
          Kopieren
        </button>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:0.9rem;white-space:pre-wrap;line-height:1.6">${escHtml(m.answer)}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

function _copyProjAssistAnswer(idx) {
  const proj = getProjectById(_currentProjectDetailId);
  const text = proj?.claudeChat?.[idx]?.answer;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Kopiert ✓', 'success'));
}

function clearProjectChat() {
  const proj = getProjectById(_currentProjectDetailId);
  if (!proj) return;
  proj.claudeChat = [];
  saveProjects();
  _renderProjectChatMessages(proj);
}

// ── Analyse-Kontext aufbauen (max 50.000 Zeichen, strukturiert) ──────────
function _buildProjectAnalysisContext(projectId) {
  const projSessions = (typeof sessions !== 'undefined')
    ? sessions.filter(s => s.projectId === projectId && (s.status === 'done' || s.utterances?.length > 0))
    : [];

  if (!projSessions.length) return '';

  const MAX_CHARS = 50000;
  let context = '';
  const sorted = [...projSessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const s of sorted) {
    const dateStr = new Date(s.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    let block = `\n## Sitzung: „${s.label}" | ${dateStr}\n`;

    // Gesprächsanalyse
    if (s.privateAnalysis) {
      const pa = s.privateAnalysis;
      if (pa.summary)    block += `Zusammenfassung: ${pa.summary}\n`;
      if (pa.dynamics)   block += `Gesprächsdynamik: ${pa.dynamics}\n`;
      if (pa.agreements?.length)  block += `Vereinbarungen: ${pa.agreements.join('; ')}\n`;
      if (pa.nextSteps?.length)   block += `Nächste Schritte: ${pa.nextSteps.join('; ')}\n`;
      if (pa.openTopics?.length)  block += `Offene Themen: ${pa.openTopics.join('; ')}\n`;
    }

    // Arbeitsanalyse
    if (s.workAnalysis) {
      const wa = s.workAnalysis;
      if (wa.summary)    block += `Arbeits-Zusammenfassung: ${wa.summary}\n`;
      if (wa.tasks?.length)       block += `Aufgaben: ${wa.tasks.map(t => typeof t === 'object' ? t.task : t).join('; ')}\n`;
      if (wa.decisions?.length)   block += `Entscheidungen: ${wa.decisions.join('; ')}\n`;
      if (wa.openQuestions?.length) block += `Offene Fragen: ${wa.openQuestions.join('; ')}\n`;
      if (wa.risks?.length)       block += `Risiken: ${wa.risks.join('; ')}\n`;
    }

    // Themen
    if (s.claudeTopics?.length) {
      const topics = s.claudeTopics.map(t => typeof t === 'object' ? t.text : t);
      block += `Themen: ${topics.join(', ')}\n`;
    }

    // Eigene Prompt-Ergebnisse
    const customResults = s.customResults || {};
    Object.values(customResults).forEach(r => {
      // v5.83: slice(0,300) entfernt – MAX_CHARS-Limit greift auf Block-Ebene
      if (r.text) block += `${r.promptName || 'Eigene Analyse'}:\n${r.text}\n`;
    });

    // Zeichenlimit prüfen
    if (context.length + block.length > MAX_CHARS) {
      context += '\n[… weitere Sitzungen wurden wegen Zeichenlimit gekürzt]';
      break;
    }
    context += block;
  }

  return context.trim();
}

// ── Nachricht senden ────────────────────────────────
async function sendProjectChatMessage() {
  const proj = getProjectById(_currentProjectDetailId);
  if (!proj) { showToast('Kein Projekt aktiv.', 'warning'); return; }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const input  = document.getElementById('projAssistInput');
  const sendBtn = document.getElementById('projAssistSendBtn');
  const question = input?.value?.trim();
  if (!question) return;

  const analysisContext = _buildProjectAnalysisContext(proj.id);
  if (!analysisContext) {
    showToast('Noch keine Analysen in diesem Projekt – bitte erst Sitzungen analysieren.', 'warning');
    return;
  }

  // UI: Lade-Zustand
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }
  if (input) input.disabled = true;

  // Rollen-System-Prompt
  const personaId = document.getElementById('projAssistPersonaSelect')?.value || '';
  const systemPrompt = typeof _buildRoleSystemPrompt === 'function' ? _buildRoleSystemPrompt(personaId) : null;

  // Multi-Turn: letzte 5 Runden
  const prevRounds = (proj.claudeChat || []).slice(-5);
  const chatHistory = prevRounds.length
    ? prevRounds.map((h, i) => `[Runde ${i + 1}]\nFrage: ${h.question}\nAntwort: ${h.answer.slice(0, 500)}${h.answer.length > 500 ? '…' : ''}`).join('\n\n')
    : 'Keine bisherigen Nachrichten.';

  const prompt = getEditablePromptText('builtin_projekt_followup')
    .replace(/\{\{projektName\}\}/g, proj.name)
    .replace(/\{\{projektAnalysen\}\}/g, analysisContext)
    .replace(/\{\{chatHistory\}\}/g, chatHistory)
    .replace(/\{\{question\}\}/g, question);

  try {
    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt, systemPrompt);

    // Kosten auf erste Sitzung des Projekts buchen (Proxy-Lösung)
    const firstSession = (typeof sessions !== 'undefined')
      ? sessions.find(s => s.projectId === proj.id)
      : null;
    if (firstSession && typeof addTokensToSession === 'function') {
      addTokensToSession(firstSession, inputTokens, outputTokens);
      if (typeof saveSessions === 'function') saveSessions();
    }

    if (!proj.claudeChat) proj.claudeChat = [];
    proj.claudeChat.push({ question, answer: text, ts: new Date().toISOString() });
    saveProjects();
    _renderProjectChatMessages(proj);
    if (input) { input.value = ''; input.disabled = false; input.focus(); }
  } catch (e) {
    showToast('Fehler: ' + (e.message || 'Unbekannt'), 'error');
    if (input) input.disabled = false;
  } finally {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Senden'; }
  }
}


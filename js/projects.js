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
        <button class="btn btn-ghost" style="margin-left:auto;font-size:0.82rem" onclick="openEditProjectModal('${proj.id}')">
          ${icon('edit-2',13)} Bearbeiten
        </button>
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

// ── Upload-Panel (Neue Aufnahme – Grid-Column) ────────────────────────────
function openUploadPanel() {
  document.getElementById('uploadPanel')?.classList.add('open');
  document.getElementById('uploadOverlay')?.classList.add('open');
  closeSidenav();
  if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17: Chat-Sidebar zuerst schließen (z-index 200 > 150)
  // Ordner-Selects sofort aus Cache befüllen, dann frisch aus Drive nachladen
  if (typeof renderSubfolderList === 'function') renderSubfolderList(rememberedFolders || []);
  if (typeof loadDriveSubfolders === 'function' && driveToken && driveFolderId) loadDriveSubfolders();
}
function _openUploadPanel_unused() {
  document.querySelector('.layout')?.classList.add('panel-open');
  closeSidenav();
}
function closeUploadPanel() {
  document.getElementById('uploadPanel')?.classList.remove('open');
  document.getElementById('uploadOverlay')?.classList.remove('open');
}
function _closeUploadPanel_unused() {
  document.querySelector('.layout')?.classList.remove('panel-open');
}

// ── Sidenav Mobile Toggle ──────────────────────────────────────────────────
function toggleSidenav() {
  const nav = document.getElementById('sidenav');
  const overlay = document.getElementById('sidenavOverlay');
  if (!nav) return;
  const isOpen = nav.classList.contains('mobile-open');
  if (isOpen) {
    nav.classList.remove('mobile-open');
    if (overlay) overlay.style.display = 'none';
  } else {
    nav.classList.add('mobile-open');
    if (overlay) overlay.style.display = 'block';
  }
}
function closeSidenav() {
  document.getElementById('sidenav')?.classList.remove('mobile-open');
  const overlay = document.getElementById('sidenavOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Aktiven Nav-Link setzen ────────────────────────────────────────────────
function setSidenavActive(el) {
  document.querySelectorAll('.sidenav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  // Auf Mobile Sidenav schließen nach Klick
  if (window.innerWidth <= 768) closeSidenav();
}

// TRANSCRIPT RENDERING
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// SESSION BROWSER
// ═══════════════════════════════════════════════════
// v4.83: Hero-Startseite ein-/ausblenden
function showHero() {
  const hero = document.getElementById('heroView');
  const browser = document.getElementById('browserView');
  const transcript = document.getElementById('transcriptCard');
  if (hero) hero.classList.remove('hidden');
  if (browser) browser.classList.remove('visible');
  if (transcript) transcript.classList.remove('visible');
  // Alle Overlays schließen
  ['costsView','personsView','archView','promptsView','projectsView'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  // Fähnchen + Sidebar verstecken
  const flap = document.getElementById('sdcFlap');
  if (flap) flap.classList.add('hidden');
  if (typeof closeSessionSidebar === 'function') closeSessionSidebar();
  // Sidenav-Aktiv zurücksetzen
  document.querySelectorAll('.sidenav-item.active').forEach(el => el.classList.remove('active'));
}
function hideHero() {
  const hero = document.getElementById('heroView');
  if (hero) hero.classList.add('hidden');
}

function showBrowser() {
  hideHero(); // v4.83: Hero verstecken
  document.getElementById('browserView').classList.add('visible');
  document.getElementById('transcriptCard').classList.remove('visible');
  // Alle Overlay-Views schliessen
  ['costsView','personsView','archView','promptsView','projectsView'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  // v4.76: Fahnchen ausblenden + Sidebar zuklappen
  const flap = document.getElementById('sdcFlap');
  if (flap) flap.classList.add('hidden');
  if (typeof closeSessionSidebar === 'function') closeSessionSidebar();
  currentSessionId = null;
  renderBrowser();
}

function renderBrowser(filter = '') {
  const folderFilter   = document.getElementById('folderFilter')?.value || '';
  const tagFilter      = document.getElementById('tagFilter')?.value || '';
  const projectFilter  = document.getElementById('projectFilter')?.value || '';
  const searchVal = filter || document.getElementById('sidebarSearchMain')?.value || '';
  const grid = document.getElementById('sessionGrid');
  if (!grid) return;

  // Ordner-Dropdown aktualisieren
  updateFolderDropdown();
  updateProjectFilterDropdown();

  // Sessions anzeigen: 'done'/'error' ODER wenn utterances vorhanden (aus Drive geladen)
  let list = sessions.filter(s =>
    s.status === 'done' || s.status === 'error' ||
    (s.utterances && s.utterances.length > 0)
  );

  if (folderFilter)  list = list.filter(s => s.archiveFolder === folderFilter);
  if (tagFilter)     list = list.filter(s => (s.tags || []).includes(tagFilter));
  if (projectFilter) list = list.filter(s => s.projectId === projectFilter);

  if (searchVal.trim()) {
    const q = searchVal.toLowerCase();
    list = list.filter(s =>
      (s.label||'').toLowerCase().includes(q) ||
      (s.filename||'').toLowerCase().includes(q) ||
      (s.speakerA||'').toLowerCase().includes(q) ||
      (s.speakerB||'').toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    grid.innerHTML = `<div class="browser-empty">${searchVal || folderFilter ? 'Keine Treffer für diese Suche.' : 'Noch keine Sitzungen vorhanden.<br>Lade eine Aufnahme hoch, um zu starten.'}</div>`;
    return;
  }

  grid.innerHTML = '';
  list.forEach(s => {
    const card = document.createElement('div');
    const _typeClass = { arbeit: 'card-arbeit', privat: 'card-privat', gedanken: 'card-gedanken' }[s.type || 'privat'] || 'card-privat';
    card.className = 'session-card ' + _typeClass + (selectedIds.has(s.id) ? ' selected' : '');
    card.dataset.id = s.id;
    card.onclick = () => {
      if (selectMode) toggleCardSelect({ stopPropagation: ()=>{} }, s.id);
      else showTranscript(s);
    };
    const dur = s.duration ? formatDuration(s.duration) : '?';
    const statusClass = s.status === 'done' ? 'done' : 'error';
    const statusLabel = s.status === 'done'
      ? `${icon('check-circle',11,'margin-right:3px;color:var(--green)')} Transkribiert`
      : `${icon('x-circle',11,'margin-right:3px;color:var(--red)')} Fehler`;
    const tagsHtml = (s.tags||[]).map(t => `<span class="sc-tag">${escHtml(t)}</span>`).join('');
    const typeIconMap  = { arbeit: 'briefcase', privat: 'message-circle', gedanken: 'message-square' };
    const typeLabel    = { arbeit: 'Arbeit', privat: 'Privat', gedanken: 'Gedanken' };
    const typeCls      = { arbeit: 'sc-type-arbeit', privat: 'sc-type-privat', gedanken: 'sc-type-gedanken' };
    const t = s.type || 'privat';
    card.innerHTML = `
      <div class="card-checkbox">${selectedIds.has(s.id) ? icon('check',11) : ''}</div>
      <div class="sc-actions" onclick="event.stopPropagation()">
        <button class="sc-btn del" onclick="deleteSession(event,'${s.id}')" style="display:inline-flex;align-items:center;justify-content:center">${icon('trash-2',13)}</button>
      </div>
      <div class="sc-icon">${icon(typeIconMap[t]||'message-circle', 17)}</div>
      <div class="sc-body">
        <span class="sc-type ${typeCls[t]||'sc-type-privat'}">${icon(typeIconMap[t]||'message-circle',11)} ${typeLabel[t]||'Privat'}</span>
        ${(()=>{ const proj = getProjectById(s.projectId); return proj ? `<span class="sc-project-badge" style="background:${proj.color}">${icon('layers',10,'margin-right:3px')}${escHtml(proj.name)}</span>` : ''; })()}
        <div class="sc-name">${escHtml(s.label)}</div>
        ${s.persons?.length ? `<div class="sc-persons" style="display:flex;align-items:center;gap:5px">${icon('users',12,'margin-right:3px')} ${s.persons.map(p=>escHtml(p)).join(' · ')}</div>` : ''}
        <div class="sc-meta">
          ${new Date(s.date).toLocaleDateString('de-DE', {day:'numeric',month:'long',year:'numeric'})}<br>
          ${escHtml(s.filename || '')} · ${dur}
        </div>
        <div class="sc-speakers">
          ${(()=>{
            const knownSpeakers = [...new Set((s.utterances||[]).map(u=>u.speaker))].sort();
            if (knownSpeakers.length === 0) knownSpeakers.push('A','B');
            return knownSpeakers.map(sp => {
              const nm = getSpeakerName(sp, s);
              const co = getSpeakerColor(sp);
              return `<span class="sc-speaker-tag"><span class="sc-dot" style="background:${co}"></span>${escHtml(nm)}</span>`;
            }).join('');
          })()}
        </div>
        ${s.archiveFolder ? `<div class="sc-folder">${icon('folder',12)} ${escHtml(s.archiveFolder)}</div>` : ''}
        ${tagsHtml ? `<div class="sc-tags">${tagsHtml}</div>` : ''}
        <span class="sc-status ${statusClass}">${statusLabel}</span>
      </div>
    `;
    if (selectMode) card.classList.add('select-mode');
    grid.appendChild(card);
  });
  if (selectMode) grid.classList.add('select-mode');
}

function filterBrowser() {
  const q = document.getElementById('sidebarSearchMain')?.value || '';
  renderBrowser(q);
  if (currentView === 'timeline') renderTimeline(q);
}

function updateFolderDropdown() {
  const sel = document.getElementById('folderFilter');
  if (!sel) return;
  const fromSessions = sessions.filter(s => s.archiveFolder).map(s => s.archiveFolder);
  const fromMemory = (rememberedFolders || []).map(f => f.name);
  const folders = [...new Set([...fromSessions, ...fromMemory])].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle Ordner</option>';
  folders.forEach(f => {
    const opt = document.createElement('option');
    const count = sessions.filter(s => s.archiveFolder === f).length;
    opt.value = f;
    opt.textContent = f + (count > 0 ? ` (${count})` : ' – leer');
    if (f === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function updateProjectFilterDropdown() {
  const sel = document.getElementById('projectFilter');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle Projekte</option>';
  (projects || []).filter(p => p.status !== 'archived').forEach(p => {
    const count = sessions.filter(s => s.projectId === p.id).length;
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + (count > 0 ? ` (${count})` : '');
    if (p.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════

// EXPORT TXT
// ═══════════════════════════════════════════════════
function exportTxt() {
  const s = getSession();
  if (!s) return;
  const text = buildTranscriptText(s);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${s.label.replace(/[^a-z0-9äöü ]/gi,'_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function formatMs(ms) {
  if (ms == null) return '?';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${pad(m%60)}:${pad(s%60)}`;
  return `${pad(m)}:${pad(s%60)}`;
}
function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════
// ERROR CARD
// ═══════════════════════════════════════════════════
function showErrorCard(message, sessionLabel) {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('transcriptCard').classList.remove('visible');
  const card = document.getElementById('progressCard');
  card.classList.add('visible');
  document.getElementById('progressTitle').innerHTML = `${icon('x-circle',15,'color:var(--red);margin-right:5px')} Fehler bei: ` + escHtml(sessionLabel);
  document.getElementById('progressStep').textContent = '';
  document.getElementById('progressBar').style.width = '100%';
  document.getElementById('progressBar').style.background = 'var(--red)';
  document.getElementById('progressLog').innerHTML =
    `<span style="color:var(--red); white-space:pre-wrap;">${escHtml(message)}</span>\n\n` +
    `<span style="color:var(--muted)">Mögliche Lösungen:\n` +
    `• API-Key überprüfen (oben rechts)\n` +
    `• Internetverbindung prüfen\n` +
    `• Dateiformat prüfen (MP3, WAV, M4A)\n` +
    `• Browser-Konsole öffnen (F12) für Details</span>`;
}

// ═══════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const iconName  = type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-circle' : 'x-circle';
  const iconColor = type === 'success' ? 'var(--green)'  : type === 'warning' ? '#f59e0b'       : 'var(--red)';
  t.innerHTML = icon(iconName, 14, `margin-right:6px;color:${iconColor}`) + escHtml(msg);
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════════════════
// CLOSE MODALS ON BACKDROP CLICK
// ═══════════════════════════════════════════════════
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// ═══════════════════════════════════════════════════

// MULTI-SELEKTION
// ═══════════════════════════════════════════════════
let selectMode = false;
let selectedIds = new Set();

function toggleSelectMode() {
  selectMode = !selectMode;
  selectedIds.clear();
  const btn = document.getElementById('selectModeBtn');
  const grid = document.getElementById('sessionGrid');
  btn.classList.toggle('active', selectMode);
  btn.innerHTML = selectMode
    ? icon('x',12,'margin-right:4px') + ' Abbrechen'
    : icon('check-circle',12,'margin-right:4px') + ' Auswählen';
  grid?.classList.toggle('select-mode', selectMode);
  updateSelectionBar();
  renderBrowser();
}

function toggleCardSelect(e, id) {
  e.stopPropagation();
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  updateSelectionBar();
  // Karte visuell aktualisieren
  document.querySelectorAll('.session-card').forEach(card => {
    const cid = card.dataset.id;
    card.classList.toggle('selected', selectedIds.has(cid));
    const cb = card.querySelector('.card-checkbox');
    if (cb) cb.innerHTML = selectedIds.has(cid) ? icon('check',11) : '';
  });
}

function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  const count = document.getElementById('selectionCount');
  if (selectMode && selectedIds.size > 0) {
    bar.classList.add('visible');
    count.textContent = `${selectedIds.size} Sitzung${selectedIds.size > 1 ? 'en' : ''} ausgewählt`;
  } else {
    bar.classList.remove('visible');
  }
}

function clearSelection() {
  selectedIds.clear();
  selectMode = false;
  document.getElementById('selectModeBtn').classList.remove('active');
  document.getElementById('selectModeBtn').innerHTML = icon('check-circle',12,'margin-right:4px') + ' Auswählen';
  document.getElementById('sessionGrid')?.classList.remove('select-mode');
  updateSelectionBar();
  renderBrowser();
}

// ═══════════════════════════════════════════════════
// ANSICHT UMSCHALTEN
// ═══════════════════════════════════════════════════
let currentView = 'timeline';
function setView(v) {
  hideHero(); // v4.83: Hero verstecken beim View-Wechsel
  currentView = v;
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewTimeline').classList.toggle('active', v === 'timeline');
  document.getElementById('sessionGrid').style.display = v === 'grid' ? '' : 'none';
  document.getElementById('timelineView').classList.toggle('visible', v === 'timeline');
  // Alle Overlay-Views verstecken
  ['costsView','personsView','archView','promptsView','projectsView'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  // Browser-Toolbar wieder einblenden (war ggf. für Prompt-Bibliothek ausgeblendet)
  const bt = document.getElementById('browserToolbar'); if (bt) bt.style.display = '';
  // Alle Overlay-Buttons zurücksetzen inkl. navProjects
  ['headerCostsBtn','headerPersonsBtn','headerArchBtn','headerPromptsBtn','navProjects'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.classList.remove('active'); btn.style.borderColor='var(--border)'; btn.style.color='var(--muted)'; btn.style.background='none'; }
  });
  if (v === 'timeline') renderTimeline();
}

function _setHeaderBtn(id, active) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.toggle('active', active);
  // Farben werden jetzt per CSS .hdr-btn.active gesteuert
  btn.style.borderColor = '';
  btn.style.color       = '';
  btn.style.background  = '';
}

function _showOverlay(viewId, btnId, renderFn) {
  hideHero(); // v4.92: Hero beim Öffnen jeder Overlay-View verstecken
  const isProjects = viewId === 'projectsView';

  // Andere Overlay-Views (innerhalb browserView) schließen
  ['costsView','personsView','archView','promptsView'].forEach(id => {
    const el = document.getElementById(id);
    if (el && id !== viewId) el.style.display = 'none';
  });
  // projectsView ist ein eigenes Fixed-Panel – immer schließen wenn nicht aktiv
  if (!isProjects) {
    const pv = document.getElementById('projectsView');
    if (pv) pv.style.display = 'none';
  }
  ['headerCostsBtn','headerPersonsBtn','headerArchBtn','headerPromptsBtn','navProjects'].forEach(id => {
    if (id !== btnId) _setHeaderBtn(id, false);
  });

  if (isProjects) {
    // projectsView: fixed panel – browserView bleibt unberührt
    document.getElementById('projectsView').style.display = 'block';
  } else {
    document.getElementById('browserView').classList.add('visible');
    document.getElementById('transcriptCard').classList.remove('visible');
    document.getElementById('sessionGrid').style.display = 'none';
    document.getElementById('timelineView').classList.remove('visible');
    document.getElementById(viewId).style.display = '';
  }

  _setHeaderBtn(btnId, true);
  currentView = viewId.replace('View','');
  // Browser-Toolbar tauschen
  const bt = document.getElementById('browserToolbar');
  if (bt) bt.style.display = (viewId === 'promptsView' || isProjects) ? 'none' : '';
  if (renderFn) renderFn();
}

function togglePersonsView() {
  const el = document.getElementById('personsView');
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('headerPersonsBtn', false);
    setView(currentView === 'persons' ? 'grid' : currentView);
  } else {
    if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17
    _showOverlay('personsView', 'headerPersonsBtn', renderPersonsView);
  }
}

function toggleCostsView() {
  const el = document.getElementById('costsView');
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('headerCostsBtn', false);
    setView(currentView === 'costs' ? 'grid' : currentView);
  } else {
    if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17
    _showOverlay('costsView', 'headerCostsBtn', renderCostsView);
  }
}

function toggleArchView() {
  const el = document.getElementById('archView');
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('headerArchBtn', false);
    setView(currentView === 'arch' ? 'grid' : currentView);
  } else {
    if (typeof closeSessionSidebar === 'function') closeSessionSidebar(); // v5.17
    _showOverlay('archView', 'headerArchBtn', renderArchView);
  }
}

function exportArchPdf() {
  const el = document.getElementById('archView');
  if (!el) return;
  const title = 'Distill Voice – Systemarchitektur v5.17';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 20px; color: #1a1a2e; background: #fff; }
    h2 { font-size: 1.2rem; margin-bottom: 4px; }
    @media print { @page { size: A4; margin: 15mm; } }
  </style></head><body>
  <h2>${title}</h2>
  ${el.innerHTML}
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) { showToast('Pop-up blockiert – bitte erlauben', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function renderArchView() {
  const el = document.getElementById('archView');
  el.innerHTML = `
  <div style="max-width:960px; margin:0 auto; padding:8px 0 40px">

    <!-- Header + PDF-Export -->
    <div style="margin-bottom:24px; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px">
      <div>
        <h2 style="font-size:1.3rem; font-weight:700; margin-bottom:4px; display:flex;align-items:center;gap:8px">${icon('layers',18)} Systemarchitektur</h2>
        <p style="font-size:0.82rem; color:var(--muted); line-height:1.6; margin:0">
          Alle Komponenten laufen vollständig im Browser – kein Backend-Server. API-Keys bleiben lokal.
          <span style="color:var(--accent); font-weight:600">Version 5.34</span>
        </p>
      </div>
      <button onclick="exportArchPdf()" class="btn btn-ghost" style="font-size:0.8rem;padding:6px 14px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0">
        ${icon('download',13)} PDF exportieren
      </button>
    </div>

    <!-- Haupt-Diagramm -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:24px 20px; margin-bottom:24px">

      <!-- Externe Dienste -->
      <div style="text-align:center; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:12px">Externe Dienste</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:16px">
        ${archBox(icon('mic',18,'color:#fbbf24'), 'AssemblyAI', 'Transkription + Speaker Diarization', '#fbbf24', 'REST API v2 (EU)')}
        ${archBox(icon('cpu',18,'color:#a78bfa'), 'Claude Sonnet', 'KI-Analyse · 360° · Mind Map · Chat', '#a78bfa', 'claude-sonnet-4-6')}
        ${archBox(icon('cloud',18,'color:#34d399'), 'Google Drive', 'Sitzungs-Archiv als JSON-Dateien', '#34d399', 'Drive API v3')}
        ${archBox(icon('calendar',18,'color:#60a5fa'), 'Google Calendar', 'Termine direkt eingetragen', '#60a5fa', 'Calendar API v3')}
        ${archBox(icon('mail',18,'color:#f472b6'), 'Gmail', 'E-Mail-Entwürfe gespeichert', '#f472b6', 'Gmail API v1')}
      </div>

      <!-- Pfeile -->
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:12px; text-align:center">
        ${archArrow('#fbbf24')}${archArrow('#a78bfa')}${archArrow('#34d399')}${archArrow('#60a5fa')}${archArrow('#f472b6')}
      </div>

      <!-- Browser App -->
      <div style="background:linear-gradient(135deg, rgba(108,99,255,0.12), rgba(167,139,250,0.06)); border:2px solid var(--accent); border-radius:12px; padding:18px; margin-bottom:16px; text-align:center">
        <div style="margin-bottom:8px; display:flex;justify-content:center">${icon('globe',28,'color:var(--accent)')}</div>
        <div style="font-weight:700; font-size:1rem; margin-bottom:6px">Distill Voice – Browser-App (GitHub Pages)</div>
        <div style="font-size:0.78rem; color:var(--muted); line-height:1.9">
          <span style="opacity:0.7">app.js · config.js · storage.js · ui.js · claude.js · drive.js</span><br>
          <span style="opacity:0.7">assemblyai.js · recorder.js · sessions.js · auth.js</span><br>
          <span style="color:var(--accent2); font-weight:500">features.js · search.js · calendar.js · persons.js</span><br>
          <span style="color:var(--accent); font-weight:500">prompts.js · audio.js · tags.js · notes.js · import.js</span><br>
          <span style="color:var(--accent); font-size:0.72rem">dndesi.github.io/Transkriptions-Dashboard-Cloud</span>
        </div>
      </div>

      <!-- Lokaler Speicher + Proxy + Auth -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px">
        ${archBox(icon('lock',18,'color:#60a5fa'), 'localStorage', 'API-Keys · Theme · Einstellungen · distill_has_sessions-Flag', '#60a5fa', 'Nur lokal – nie in der Cloud')}
        ${archBox(icon('database',18,'color:#a78bfa'), 'IndexedDB', 'Sessions + Projekte (js/storage.js) · kein Größenlimit · automatische Migration aus localStorage', '#a78bfa', 'distill_voice_db')}
        ${archBox(icon('key',18,'color:#34d399'), 'Google OAuth 2.0', 'GIS Client · Drive + Calendar + Gmail · Token-Refresh', '#34d399', 'accounts.google.com/gsi')}
        ${archBox(icon('zap',18,'color:#f472b6'), 'Cloudflare Worker', 'CORS-Proxy für DELETE-Requests', '#f472b6', 'Optional – workers.dev')}
      </div>
    </div>

    <!-- JS-Module -->
    <div style="margin-bottom:14px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted)">JavaScript-Module</div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:10px; margin-bottom:24px">
      ${flowCard('config.js', 'Globaler State', 'API-Keys, Sessions[], Drive-Token, OAuth-Scopes, Preise, Wechselkurs', '#60a5fa')}
      ${flowCard('storage.js', 'IndexedDB-Speicher', 'initStorage(), saveSessions(), saveProjects() – Sessions + Projekte in IndexedDB, automatische Migration aus localStorage', '#a78bfa')}
      ${flowCard('assemblyai.js', 'Transkription', 'AssemblyAI Upload → Polling → Utterances mit Speaker-Labels und Timestamps', '#fbbf24')}
      ${flowCard('claude.js', 'KI-Analyse', 'Privat/Arbeit/Gedanken-Analyse, Kapitel, Themen, Stimmung, Anonymisierung, Token-Tracking · v4.81: renderInsights() ruft _refreshAnalysenSubtabs() am Ende – Subtabs aktualisieren sich nach jeder Analyse', '#a78bfa')}
      ${flowCard('drive.js', 'Cloud Storage', 'Google Drive OAuth, Ordner anlegen, Sessions als JSON speichern/laden/löschen', '#34d399')}
      ${flowCard('features.js', 'Erweiterte Features', '360°-Analyse, Aufnahme befragen (Chat), Mind Map (D3.js v7, JSON-Format, horizontal LTR, Zoom/Pan, SVG/PDF-Export)', '#f59e0b')}
      ${flowCard('claude.js (Follow-Up)', 'Folgegespräch', 'Analyse-Kontext aufbauen (_buildFollowUpContext), Folgefragen stellen (askFollowUp), Verlauf in session.claudeFollowUp[] speichern', '#06b6d4')}
      ${flowCard('ui.js (Navigation)', 'Sidenav', 'openUploadPanel/closeUploadPanel, toggleSidenav/closeSidenav, setSidenavActive – neue linke Navigation ersetzt 340px Upload-Sidebar', '#8b5cf6')}
      ${flowCard('claude.js (Präsentation)', 'Präsentation erstellen', 'generatePresentation(), _renderPresentationPreview(), exportPresentationPptx() via PptxGenJS. 3 Prompt-Typen wählbar. session.claudePresentation[] speichert Ergebnis', '#f43f5e')}
      ${flowCard('prompts.js', 'Prompt-Bibliothek', 'System/Standard/Feature-Prompts, editierbare Overrides in localStorage, eigene Prompts', '#a78bfa')}
      ${flowCard('search.js', 'Globale Suche', 'Instant-Textsuche über alle Felder + Claude-Semantiksuche', '#6ee7b7')}
      ${flowCard('calendar.js', 'Kalender & Mail', 'Termine via Claude extrahieren → Google Calendar API · E-Mail-Entwürfe → Gmail API', '#f472b6')}
      ${flowCard('persons.js', 'Personen-Profile', 'Profil-Synthese, Selbst-Synthese, Beziehungskontext, Kosten-Übersicht, Ausblenden/Einblenden (toggleHiddenPersons/unhidePerson)', '#f472b6')}
      ${flowCard('ui.js', 'UI-Rendering', 'Session-Browser, Zeitstrahl, Personen, Kosten, Systemarchitektur · v4.74: switchSessionTab(), toggleSessionSidebar(), setSidebarMode() · v4.82: switchAnalysenSubtab(), _analysenVisibleBlocks[] – echtes Tab-Verhalten in Analysen · v4.80: sdc-flap als Desktop-Stil auch auf Mobile (kein FAB)', '#c084fc')}
      ${flowCard('audio.js', 'Audio & Zeitstrahl', 'Audio-Player, Sync zu Utterances, Zeitstrahl-Ansicht nach Monat gruppiert', '#34d399')}
      ${flowCard('recorder.js', 'Audio-Aufnahme', 'MediaRecorder API, Mikrofon-Zugriff, WebM-Aufnahme direkt im Browser', '#34d399')}
      ${flowCard('sessions.js', 'Session-Verwaltung', 'Session speichern, Google Drive Archiv, Sitzungstypen (privat/arbeit/gedanken) · editAnalysisItem/Field, addAnalysisItem, saveAnalysisItem/Field', '#60a5fa')}
      ${flowCard('tags.js', 'Tags', 'Tag-System für Sitzungen, Chips-UI, Filter', '#f59e0b')}
      ${flowCard('import.js', 'Datei-Import', 'parseSamsungTranscript() (UTF-16 BOM), parsePlainText(), extractPdfText() (PDF.js). Multi-File: _importParsedDataList[], handleImportFileSelect() iteriert alle Dateien, startSamsungImport() erstellt eine Session pro Datei. Transkript-Editor: toggleTranscriptEdit(), saveTranscriptEdits() in claude.js', '#34d399')}
      ${flowCard('notes.js', 'Notizen', 'Persönliche Notizen pro Sitzung, Auto-Save', '#94a3b8')}
      ${flowCard('projects.js', 'Projektarbeit', 'Projekt-Browser (Kacheln, Anlegen/Bearbeiten/Archivieren), Detailansicht, Dashboard mit Statistiken, Aufgaben-Tracking (checklistItem), Projekt-Analyse via Claude (builtin_project_analysis) · BUILTIN_PROJECT_ID = Allgemeines Projekt', '#f59e0b')}
      ${flowCard('app.js', 'Initialisierung', 'async init() → await initStorage() → IndexedDB laden vor UI-Start · Theme-Toggle · Upload-Schrittvalidierung · Drag & Drop', '#c084fc')}
    </div>

    <!-- Datenflüsse -->
    <div style="margin-bottom:14px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted)">Wichtige Datenflüsse</div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:10px; margin-bottom:24px">
      ${flowCard('Mic / Datei → AssemblyAI', 'Transkription', 'Audio → Upload → Polling → Utterances mit Speaker-Labels (A/B/C…)', '#fbbf24')}
      ${flowCard('Browser → Claude Sonnet', 'KI-Analyse', 'Transkript (opt. anonymisiert) → Analyse: Gesprächs/Arbeit/Gedanken, 360°, Kapitel, Mindmap', '#a78bfa')}
      ${flowCard('Browser → Google Drive', 'Cloud-Speicherung', 'Sitzung als JSON + Audio-Datei → Drive-Ordner → geladen beim nächsten Login', '#34d399')}
      ${flowCard('Browser → Google Calendar', 'Termine eintragen', 'Claude erkennt Termine im Transkript → RFC3339 Event → Calendar API v3 (POST)', '#60a5fa')}
      ${flowCard('Browser → Gmail', 'Entwürfe erstellen', 'Claude generiert E-Mails → Base64url → Gmail Drafts API → User sendet selbst ab', '#f472b6')}
      ${flowCard('Worker → AssemblyAI', 'Transkript löschen', 'DELETE via Cloudflare Worker (CORS-Bypass) → AssemblyAI entfernt Transkript', '#94a3b8')}
    </div>

    <!-- Tech-Stack -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px; margin-bottom:14px">
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:14px; display:flex;align-items:center;gap:6px">${icon('wrench',14)} Technologie-Stack</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:8px">
        ${techRow('Frontend', 'HTML5 · Vanilla JS (ES2022) · CSS Custom Properties')}
        ${techRow('Hosting', 'GitHub Pages (kostenlos, statisch)')}
        ${techRow('Transkription', 'AssemblyAI REST API v2 · EU-Endpunkt · Speaker Diarization')}
        ${techRow('KI-Modell', 'claude-sonnet-4-6 via Browser-Fetch (direct access)')}
        ${techRow('Cloud-Storage', 'Google Drive API v3 · OAuth 2.0 (GIS Client)')}
        ${techRow('Kalender', 'Google Calendar API v3 · Europe/Berlin Zeitzone')}
        ${techRow('E-Mail', 'Gmail API v1 · RFC 2822 · Base64url · Entwurfsmodus')}
        ${techRow('Mind Map', 'D3.js v7 (CDN) · horizontales LTR-Layout · JSON-Baumformat · gecacht in session.claudeMindmap · Zoom/Pan · SVG/PDF-Export · Mermaid-Fallback für Altdaten')}
        ${techRow('Folgegespräch', 'builtin_followup in Prompt-Bibliothek · Platzhalter: analyseContext/transcript/question · session.claudeFollowUp[] · DSGVO-Anonymisierung aktiv')}
        ${techRow('Präsentation', 'PptxGenJS v3.12 (CDN) · 6 Prompt-Typen (builtin_canva_*) · .pptx-Export · Claude Design Integration (claude.ai/design) · session.claudePresentation + session.claudeDesignLinks[]')}
        ${techRow('Prompt-System', 'Editierbare Prompts in localStorage · System/Standard/Feature/Eigene · usedIn-Badge zeigt Verwendungsort · assemblePromptText() aus Rolle/Tonalität/Grenzen/Kontext')}
        ${techRow('Session-Layout', 'Tab-Leiste (Transkript/Analysen/Mindmap/Design/Notizen/Tags) + einklappbare Assistent-Sidebar · Analysen: echte Sub-Tabs (Gespräch/Arbeit/Stimmung/Kapitel/Themen/360°) via switchAnalysenSubtab() · sdc-flap als vertikaler Streifen (Desktop + Mobile)')}
        ${techRow('OAuth Scopes', 'drive.file · userinfo.profile · calendar.events · gmail.compose')}
        ${techRow('Lokaler Speicher', 'IndexedDB (distill_voice_db, js/storage.js): Sessions + Projekte · kein Größenlimit · Auto-Migration · localStorage: API-Keys, Theme, Prompts, Akkordeon-State, Beziehungen, distill_has_sessions-Flag')}
        ${techRow('CORS-Proxy', 'Cloudflare Worker (optional, ~5 Min Setup)')}
        ${techRow('Wechselkurs', 'Frankfurter API (api.frankfurter.app) – USD → EUR')}
        ${techRow('Datenschutz', 'DSGVO: Anonymisierungs-Funktion vor API-Calls, Echtname bleibt lokal')}
        ${techRow('Icons', 'Lucide Icons v0.383 (CDN) · createIcons() nach DOM-Render')}
      </div>
    </div>

    <!-- Datenschutz -->
    <div style="padding:12px 16px; background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.25); border-radius:10px; font-size:0.8rem; color:var(--muted); line-height:1.6">
      ${icon('lock',13,'margin-right:5px;color:var(--green)')} <strong style="color:var(--text)">Datenschutz-Architektur (DSGVO):</strong>
      API-Keys verlassen deinen Browser nie. Gespräche liegen in deiner persönlichen Google Drive.
      Vor jedem Claude-API-Call werden Klarnamen durch neutrale Labels ersetzt (buildAnonMap → anonymizeText → deanonymizeText).
      Kalender und Mail-Zugriff erfordert explizite Google-Zustimmung beim Login.
    </div>
  </div>`;
}

function archBox(icon, title, desc, color, sub) {
  return `<div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:14px 12px; text-align:center; border-top:3px solid ${color}">
    <div style="font-size:1.4rem; margin-bottom:6px">${icon}</div>
    <div style="font-weight:700; font-size:0.85rem; margin-bottom:3px">${title}</div>
    <div style="font-size:0.72rem; color:var(--muted); line-height:1.4; margin-bottom:5px">${desc}</div>
    <div style="font-size:0.65rem; color:${color}; font-family:monospace; background:rgba(0,0,0,0.06); border-radius:4px; padding:2px 6px; display:inline-block">${sub}</div>
  </div>`;
}

function archArrow(color) {
  return `<div style="color:${color}; font-size:1.2rem; line-height:1">↕</div>`;
}

function flowCard(label, title, desc, color) {
  return `<div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:14px; border-left:3px solid ${color}">
    <div style="font-size:0.7rem; color:${color}; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px">${label}</div>
    <div style="font-weight:700; font-size:0.85rem; margin-bottom:5px">${title}</div>
    <div style="font-size:0.77rem; color:var(--muted); line-height:1.5">${desc}</div>
  </div>`;
}

function techRow(label, value) {
  return `<div style="padding:7px 10px; background:var(--surface2); border-radius:6px; font-size:0.8rem; display:flex; gap:10px; align-items:baseline">
    <span style="color:var(--muted); white-space:nowrap; min-width:110px; font-size:0.73rem">${label}</span>
    <span style="color:var(--text)">${value}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════

// ─── RESPONSIVE: Hamburger-Menü & Mobile Sidebar ───
function toggleMobileMenu() {
  const nav  = document.getElementById('hdrNav');
  const btn  = document.getElementById('hamburgerBtn');
  const icon = document.getElementById('hamburgerIcon');
  const open = nav.classList.toggle('mobile-open');
  btn.setAttribute('aria-expanded', open);
  // Icon: menu ↔ x
  if (icon) {
    icon.setAttribute('data-lucide', open ? 'x' : 'menu');
    if (window.lucide) lucide.createIcons();
  }
  // Sidebar schließen wenn Menü öffnet
  if (open) closeSidebar();
}

function toggleSidebar() {
  const aside   = document.querySelector('aside');
  const overlay = document.getElementById('sidebarOverlay');
  if (!aside) return;
  const open = aside.classList.toggle('sidebar-open');
  overlay.classList.toggle('sidebar-open', open);
  // Hamburger-Menü schließen
  document.getElementById('hdrNav')?.classList.remove('mobile-open');
  const btn  = document.getElementById('hamburgerBtn');
  const icon = document.getElementById('hamburgerIcon');
  if (btn)  btn.setAttribute('aria-expanded', 'false');
  if (icon) { icon.setAttribute('data-lucide', 'menu'); if (window.lucide) lucide.createIcons(); }
}

function closeSidebar() {
  document.querySelector('aside')?.classList.remove('sidebar-open');
  document.getElementById('sidebarOverlay')?.classList.remove('sidebar-open');
}

// Bei Resize auf Desktop: Dropdown und Sidebar schließen
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.getElementById('hdrNav')?.classList.remove('mobile-open');
    closeSidebar();
  }
});


// ═══════════════════════════════════════════════════
// v4.74 – SESSION DETAIL: TABS + SIDEBAR
// ═══════════════════════════════════════════════════

let _currentSessionTab = 'transkript';
let _sidebarOpen = false;
let _currentSidebarMode = 'fragen';

function switchSessionTab(name) {
  _currentSessionTab = name;

  // Tab-Buttons
  document.querySelectorAll('.sdc-tab').forEach(btn => {
    btn.classList.toggle('sdc-tab-active', btn.id === 'sdcTab-' + name);
  });

  // Tab-Panels
  document.querySelectorAll('.sdc-panel[id^="sdc-panel-"]').forEach(panel => {
    panel.classList.toggle('sdc-panel-active', panel.id === 'sdc-panel-' + name);
  });

  // Bei Analysen-Tab: Sub-Tabs aktualisieren
  if (name === 'analysen') _refreshAnalysenSubtabs();
}

// v4.82: Welche Analyse-Blöcke aktuell Inhalt haben (für switchAnalysenSubtab)
let _analysenVisibleBlocks = [];

function _refreshAnalysenSubtabs() {
  const container = document.getElementById('analysenSubtabs');
  if (!container) return;
  const blockMap = [
    { id: 'privateBlock',  label: 'Gespräch' },
    { id: 'workBlock',     label: 'Arbeit' },
    { id: 'sentimentBlock',label: 'Stimmung' },
    { id: 'chaptersBlock', label: 'Kapitel' },
    { id: 'topicsBlock',   label: 'Themen' },
    { id: 'block360',      label: '360°' },
  ];
  const visible = blockMap.filter(b => {
    const el = document.getElementById(b.id);
    return el && el.style.display !== 'none';
  });
  _analysenVisibleBlocks = visible.map(b => b.id);

  if (!visible.length) { container.innerHTML = ''; return; }

  // v4.82: echte Tabs statt Anker – erster Tab direkt aktiv
  container.innerHTML = visible.map((b, i) =>
    `<button class="sdc-subtab${i === 0 ? ' sdc-subtab-active' : ''}" data-block="${b.id}" onclick="switchAnalysenSubtab('${b.id}')">${b.label}</button>`
  ).join('');

  switchAnalysenSubtab(visible[0].id);
}

// v4.82: Zeigt nur den gewählten Analyse-Block, blendet alle anderen aus
function switchAnalysenSubtab(id) {
  _analysenVisibleBlocks.forEach(bid => {
    const el = document.getElementById(bid);
    if (el) el.style.display = bid === id ? 'block' : 'none';
  });
  document.querySelectorAll('#analysenSubtabs .sdc-subtab').forEach(btn => {
    btn.classList.toggle('sdc-subtab-active', btn.dataset.block === id);
  });
}

function toggleSessionSidebar() {
  const isMobile = window.innerWidth <= 768;
  const sidebar = document.getElementById('sdcSidebar');
  const overlay = document.getElementById('sdcOverlay');
  const toggle  = document.getElementById('sdcSidebarToggle');
  const flap    = document.getElementById('sdcFlap');

  _sidebarOpen = !_sidebarOpen;

  if (isMobile) {
    sidebar?.classList.toggle('sdc-sidebar-open', _sidebarOpen);
    sidebar?.classList.toggle('sdc-sidebar-collapsed', !_sidebarOpen);
    if (overlay) overlay.classList.toggle('active', _sidebarOpen);
  } else {
    sidebar?.classList.toggle('sdc-sidebar-collapsed', !_sidebarOpen);
    const handle = document.getElementById('sdcResizeHandle');
    const mainContent = document.getElementById('mainContent');
    if (sidebar) {
      if (_sidebarOpen) {
        // Gespeicherte Breite wiederherstellen (v4.90)
        const savedW = parseInt(localStorage.getItem('sidebarWidth'), 10);
        const sidebarW = (savedW >= 280) ? savedW : 300;
        const GAP = 12; // Abstand zwischen Content und Sidebar
        sidebar.style.width = sidebarW + 'px';
        if (handle) { handle.style.right = sidebarW + 'px'; handle.style.display = 'block'; }
        if (mainContent) mainContent.style.paddingRight = (sidebarW + GAP) + 'px';
      } else {
        sidebar.style.width = '';
        if (handle) { handle.style.display = 'none'; handle.style.right = ''; }
        if (mainContent) mainContent.style.paddingRight = '';
      }
    }
    if (overlay) overlay.classList.remove('active');
  }
  if (toggle) toggle.classList.toggle('active', _sidebarOpen);
  // v4.76: Fahnchen als einziger Toggle – Icon und Text wechseln statt verstecken
  if (flap) {
    flap.classList.toggle('sdc-flap-open', _sidebarOpen);
    const iconEl = flap.querySelector('[data-lucide]');
    if (iconEl) iconEl.setAttribute('data-lucide', _sidebarOpen ? 'panel-right-close' : 'panel-right-open');
    const spanEl = flap.querySelector('span');
    if (spanEl) spanEl.textContent = _sidebarOpen ? 'Schliessen' : 'Assistent';
  }

  // Lucide neu rendern nach Übergang
  setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 250);
}

function openSessionSidebar() {
  if (!_sidebarOpen) toggleSessionSidebar();
}

function closeSessionSidebar() {
  if (_sidebarOpen) toggleSessionSidebar();
}

function setSidebarMode(mode) {
  _currentSidebarMode = mode;

  // Sidebar öffnen falls geschlossen
  openSessionSidebar();

  // Mode-Buttons
  document.querySelectorAll('.sdc-mode-btn').forEach(btn => {
    btn.classList.toggle('sdc-mode-active', btn.id === 'sdcMode-' + mode);
  });

  // Sidebar-Panels
  document.querySelectorAll('.sdc-sidebar-panel').forEach(panel => {
    panel.classList.toggle('sdc-panel-active', panel.id === 'sdc-sb-' + mode);
  });

  // Chat-Input: bei Fragen/Folgefragen anzeigen, sonst verstecken
  const inputWrap  = document.getElementById('sdcSidebarInput');
  const askInput   = document.getElementById('askInput');
  const followInput = document.getElementById('followUpInput');
  const sendBtn    = document.getElementById('askSendBtn');

  if (inputWrap) {
    const showInput = mode === 'fragen' || mode === 'folgefragen';
    inputWrap.classList.toggle('hidden', !showInput);

    if (askInput)    askInput.style.display    = (mode === 'fragen')      ? 'block' : 'none';
    if (followInput) followInput.style.display = (mode === 'folgefragen') ? 'block' : 'none';

    if (sendBtn) {
      sendBtn.onclick = mode === 'folgefragen'
        ? () => askFollowUp()
        : () => sendAskQuestion();
    }
  }

  // v4.76: Modus-spezifische Initialisierung
  if (mode === 'folgefragen') {
    // Bestehende Folgefragen aus der Session rendern
    const s = typeof getSession === 'function' ? getSession() : null;
    if (s && typeof renderFollowUpMessages === 'function') {
      renderFollowUpMessages(s);
    }
  }

  // Fokus auf aktives Input
  setTimeout(() => {
    if (mode === 'fragen' && askInput) askInput.focus();
    else if (mode === 'folgefragen' && followInput) followInput.focus();
  }, 300);

  // Persona-Dropdown aktuell halten (v4.90)
  if (typeof populatePersonaSelects === 'function') populatePersonaSelects();
}

// ── Sidebar Resize (v4.90, Desktop only) ──────────────────────────────────────
function initSidebarResize() {
  const sidebar = document.getElementById('sdcSidebar');
  const handle  = document.getElementById('sdcResizeHandle');
  if (!sidebar || !handle) return;

  const SIDEBAR_WIDTH_KEY = 'sidebarWidth';
  const MIN_W = 280;
  const MAX_W = () => Math.floor(window.innerWidth * 0.6);

  // Gespeicherte Breite wiederherstellen
  const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
  if (saved >= MIN_W) sidebar.style.setProperty('--sidebar-custom-width', saved + 'px');

  let dragging = false;
  let startX   = 0;
  let startW   = 0;

  handle.addEventListener('mousedown', e => {
    if (window.innerWidth <= 768) return;   // Mobile: kein Resize
    dragging = true;
    startX   = e.clientX;
    startW   = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = startX - e.clientX;   // nach links ziehen → breiter
    const newW  = Math.min(MAX_W(), Math.max(MIN_W, startW + delta));
    sidebar.style.width = newW + 'px';
    handle.style.right = newW + 'px';
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.paddingRight = (newW + 12) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
    const currentW = sidebar.offsetWidth;
    if (currentW >= MIN_W) localStorage.setItem(SIDEBAR_WIDTH_KEY, currentW);
  });
}

// Resize beim Laden initialisieren
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarResize);
  } else {
    initSidebarResize();
  }
})();

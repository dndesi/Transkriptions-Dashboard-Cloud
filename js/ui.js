// TRANSCRIPT RENDERING
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// SESSION BROWSER
// ═══════════════════════════════════════════════════
function showBrowser() {
  document.getElementById('browserView').classList.add('visible');
  document.getElementById('transcriptCard').classList.remove('visible');
  currentSessionId = null;
  renderBrowser();
}

function renderBrowser(filter = '') {
  const folderFilter = document.getElementById('folderFilter')?.value || '';
  const searchVal = filter || document.getElementById('sidebarSearchMain')?.value || '';
  const grid = document.getElementById('sessionGrid');
  if (!grid) return;

  // Ordner-Dropdown aktualisieren
  updateFolderDropdown();

  // Sessions anzeigen: 'done'/'error' ODER wenn utterances vorhanden (aus Drive geladen)
  let list = sessions.filter(s =>
    s.status === 'done' || s.status === 'error' ||
    (s.utterances && s.utterances.length > 0)
  );

  if (folderFilter) list = list.filter(s => s.archiveFolder === folderFilter);

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
    const statusLabel = s.status === 'done' ? '✓ Transkribiert' : '✗ Fehler';
    const tagsHtml = (s.tags||[]).map(t => `<span class="sc-tag">${escHtml(t)}</span>`).join('');
    card.innerHTML = `
      <div class="card-checkbox">${selectedIds.has(s.id)?'✓':''}</div>
      <div class="sc-actions" onclick="event.stopPropagation()">
        <button class="sc-btn del" onclick="deleteSession(event,'${s.id}')">🗑</button>
      </div>
      ${(()=>{
        const typeLabel = { arbeit: '💼 Arbeit', privat: '💬 Privat', gedanken: '💭 Gedanken' };
        const typeCls   = { arbeit: 'sc-type-arbeit', privat: 'sc-type-privat', gedanken: 'sc-type-gedanken' };
        const t = s.type || 'privat';
        return `<span class="sc-type ${typeCls[t]||'sc-type-privat'}">${typeLabel[t]||'💬 Privat'}</span>`;
      })()}
      <div class="sc-name">${escHtml(s.label)}</div>
      ${s.persons?.length ? `<div class="sc-persons">👥 ${s.persons.map(p=>escHtml(p)).join(' · ')}</div>` : ''}
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
      ${s.archiveFolder ? `<div class="sc-folder">📁 ${escHtml(s.archiveFolder)}</div>` : ''}
      ${tagsHtml ? `<div class="sc-tags">${tagsHtml}</div>` : ''}
      <span class="sc-status ${statusClass}">${statusLabel}</span>
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
  // Ordner aus Sitzungen + Drive-Unterordner zusammenführen
  const fromSessions = sessions.filter(s => s.archiveFolder).map(s => s.archiveFolder);
  const fromMemory = (rememberedFolders || []).map(f => f.name);
  const folders = [...new Set([...fromSessions, ...fromMemory])].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle Ordner</option>';
  folders.forEach(f => {
    const opt = document.createElement('option');
    const count = sessions.filter(s => s.archiveFolder === f).length;
    opt.value = f;
    opt.textContent = '📁 ' + f + (count > 0 ? ` (${count})` : ' – leer');
    if (f === current) opt.selected = true;
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
  document.getElementById('progressTitle').innerHTML = '❌ Fehler bei: ' + escHtml(sessionLabel);
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
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
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
  btn.textContent = selectMode ? '✕ Abbrechen' : '☑ Auswählen';
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
    if (cb) cb.textContent = selectedIds.has(cid) ? '✓' : '';
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
  document.getElementById('selectModeBtn').textContent = '☑ Auswählen';
  document.getElementById('sessionGrid')?.classList.remove('select-mode');
  updateSelectionBar();
  renderBrowser();
}

// ═══════════════════════════════════════════════════
// ANSICHT UMSCHALTEN
// ═══════════════════════════════════════════════════
let currentView = 'grid';
function setView(v) {
  currentView = v;
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewTimeline').classList.toggle('active', v === 'timeline');
  document.getElementById('sessionGrid').style.display = v === 'grid' ? '' : 'none';
  document.getElementById('timelineView').classList.toggle('visible', v === 'timeline');
  document.getElementById('costsView').style.display = 'none';
  document.getElementById('personsView').style.display = 'none';
  document.getElementById('archView').style.display = 'none';
  // Overlay-Buttons zurücksetzen
  ['headerCostsBtn', 'headerPersonsBtn', 'headerArchBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.classList.remove('active'); btn.style.borderColor='var(--border)'; btn.style.color='var(--muted)'; btn.style.background='none'; }
  });
  if (v === 'timeline') renderTimeline();
}

function _setHeaderBtn(id, active) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.toggle('active', active);
  btn.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
  btn.style.color       = active ? 'var(--accent)' : 'var(--muted)';
  btn.style.background  = active ? 'rgba(108,99,255,0.08)' : 'none';
}

function _showOverlay(viewId, btnId, renderFn) {
  // Alle anderen Overlay-Views schließen
  ['costsView','personsView','archView'].forEach(id => {
    if (id !== viewId) document.getElementById(id).style.display = 'none';
  });
  ['headerCostsBtn','headerPersonsBtn','headerArchBtn'].forEach(id => {
    if (id !== btnId) _setHeaderBtn(id, false);
  });
  document.getElementById('browserView').classList.add('visible');
  document.getElementById('transcriptCard').classList.remove('visible');
  document.getElementById('sessionGrid').style.display = 'none';
  document.getElementById('timelineView').classList.remove('visible');
  document.getElementById(viewId).style.display = '';
  _setHeaderBtn(btnId, true);
  currentView = viewId.replace('View','');
  if (renderFn) renderFn();
}

function togglePersonsView() {
  const el = document.getElementById('personsView');
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    _setHeaderBtn('headerPersonsBtn', false);
    setView(currentView === 'persons' ? 'grid' : currentView);
  } else {
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
    _showOverlay('archView', 'headerArchBtn', renderArchView);
  }
}

function renderArchView() {
  const el = document.getElementById('archView');
  el.innerHTML = `
  <div style="max-width:900px; margin:0 auto; padding:8px 0 40px">
    <div style="margin-bottom:28px">
      <h2 style="font-size:1.3rem; font-weight:700; margin-bottom:6px">📐 Systemarchitektur</h2>
      <p style="font-size:0.85rem; color:var(--muted); line-height:1.6">
        Alle Komponenten laufen vollständig im Browser. API-Keys werden ausschließlich lokal gespeichert.
        Es gibt keinen eigenen Backend-Server.
      </p>
    </div>

    <!-- Haupt-Diagramm -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:28px 24px; margin-bottom:24px">

      <!-- Zeile 1: Externe APIs -->
      <div style="text-align:center; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:12px">Externe Dienste</div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px">
        ${archBox('🎙️', 'AssemblyAI', 'Transkription + Speaker Diarization', '#fbbf24', 'REST API v2')}
        ${archBox('🤖', 'Anthropic Claude', 'Haiku 4.5 – KI-Analyse', '#a78bfa', 'claude-haiku-4-5-20251001')}
        ${archBox('☁️', 'Google Drive', 'Sitzungs-Archiv als JSON-Dateien', '#34d399', 'Drive API v3')}
      </div>

      <!-- Pfeile nach unten -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:4px; text-align:center">
        ${archArrow('#fbbf24')}${archArrow('#a78bfa')}${archArrow('#34d399')}
      </div>

      <!-- Zeile 2: Browser App -->
      <div style="background:linear-gradient(135deg, rgba(108,99,255,0.1), rgba(167,139,250,0.06)); border:2px solid var(--accent); border-radius:12px; padding:20px; margin-bottom:16px; text-align:center">
        <div style="font-size:1.6rem; margin-bottom:6px">🌐</div>
        <div style="font-weight:700; font-size:1rem; margin-bottom:4px">Browser-App (GitHub Pages)</div>
        <div style="font-size:0.78rem; color:var(--muted); line-height:1.6">
          Statisches HTML · Vanilla JS · CSS Custom Properties<br>
          <span style="color:var(--accent)">dndesi.github.io/Transkriptions-Dashboard-Cloud</span>
        </div>
      </div>

      <!-- Zeile 3: Lokaler Speicher + Proxy -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        ${archBox('🔒', 'localStorage', 'API-Keys · Theme · Beziehungen · Einstellungen', '#60a5fa', 'Nur lokal – nie in der Cloud')}
        ${archBox('⚡', 'Cloudflare Worker', 'CORS-Proxy für DELETE-Requests', '#f472b6', 'Optional – workers.dev')}
      </div>
    </div>

    <!-- Datenfluss-Karten -->
    <div style="margin-bottom:18px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted)">Datenflüsse</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px">
      ${flowCard('🎙️ → 🌐', 'Aufnahme / Upload', 'Audio-Datei wird an AssemblyAI gesendet → Transkript mit Speaker-Labels (A, B, C…) wird zurückgegeben', '#fbbf24')}
      ${flowCard('🌐 → 🤖', 'KI-Analyse', 'Transkript (optional anonymisiert) wird an Claude Haiku gesendet → JSON-Analyse mit Vereinbarungen, Wünschen, "Zwischen den Zeilen" etc.', '#a78bfa')}
      ${flowCard('🌐 → ☁️', 'Cloud-Speicherung', 'Fertige Sitzung wird als JSON-Datei in Google Drive gespeichert → beim nächsten Login automatisch geladen', '#34d399')}
      ${flowCard('🌐 → ⚡ → 🗑️', 'Transkript löschen', 'DELETE-Request läuft über Cloudflare Worker (CORS-Bypass) → AssemblyAI entfernt das Transkript von seinen Servern', '#f472b6')}
    </div>

    <!-- Tech-Stack -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px">
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:14px">🔧 Technologie-Stack</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        ${techRow('Frontend', 'HTML5 · Vanilla JS (ES2022) · CSS Custom Properties')}
        ${techRow('Hosting', 'GitHub Pages (kostenlos, statisch)')}
        ${techRow('Transkription', 'AssemblyAI REST API v2 · Speaker Diarization')}
        ${techRow('KI-Analyse', 'Anthropic Claude Haiku 4.5 via Browser-Fetch')}
        ${techRow('Cloud-Storage', 'Google Drive API v3 · OAuth 2.0 (GIS)')}
        ${techRow('Daten lokal', 'localStorage: Keys, Theme, Beziehungen, Einstellungen')}
        ${techRow('CORS-Proxy', 'Cloudflare Worker (optional, ~5 Min Setup)')}
        ${techRow('Wechselkurs', 'Frankfurter API (api.frankfurter.app) – USD → EUR')}
        ${techRow('Datenschutz', 'Anonymisierungs-Funktion vor API-Calls aktivierbar')}
      </div>
    </div>

    <!-- Sicherheitshinweis -->
    <div style="margin-top:14px; padding:12px 16px; background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.25); border-radius:10px; font-size:0.8rem; color:var(--muted); line-height:1.6">
      🔐 <strong style="color:var(--text)">Datenschutz-Architektur:</strong>
      API-Keys verlassen deinen Browser nie – kein eigener Server empfängt oder loggt sie.
      Gespräche liegen in deiner persönlichen Google Drive. Der optionale Anonymisierungs-Modus ersetzt echte Namen vor der KI-Analyse durch neutrale Labels.
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

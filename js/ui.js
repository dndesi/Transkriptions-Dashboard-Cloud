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
    const statusLabel = s.status === 'done'
      ? `${icon('check-circle',11,'margin-right:3px;color:var(--green)')} Transkribiert`
      : `${icon('x-circle',11,'margin-right:3px;color:var(--red)')} Fehler`;
    const tagsHtml = (s.tags||[]).map(t => `<span class="sc-tag">${escHtml(t)}</span>`).join('');
    card.innerHTML = `
      <div class="card-checkbox">${selectedIds.has(s.id) ? icon('check',11) : ''}</div>
      <div class="sc-actions" onclick="event.stopPropagation()">
        <button class="sc-btn del" onclick="deleteSession(event,'${s.id}')" style="display:inline-flex;align-items:center;justify-content:center">${icon('trash-2',13)}</button>
      </div>
      ${(()=>{
        const typeIcon  = { arbeit: icon('briefcase',12), privat: icon('message-circle',12), gedanken: icon('message-square',12) };
        const typeLabel = { arbeit: 'Arbeit', privat: 'Privat', gedanken: 'Gedanken' };
        const typeCls   = { arbeit: 'sc-type-arbeit', privat: 'sc-type-privat', gedanken: 'sc-type-gedanken' };
        const t = s.type || 'privat';
        return `<span class="sc-type ${typeCls[t]||'sc-type-privat'}" style="display:inline-flex;align-items:center;gap:4px">${typeIcon[t]||icon('message-circle',12)} ${typeLabel[t]||'Privat'}</span>`;
      })()}
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
      ${s.archiveFolder ? `<div class="sc-folder" style="display:flex;align-items:center;gap:4px">${icon('folder',12)} ${escHtml(s.archiveFolder)}</div>` : ''}
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
    opt.textContent = f + (count > 0 ? ` (${count})` : ' – leer');
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
  currentView = v;
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewTimeline').classList.toggle('active', v === 'timeline');
  document.getElementById('sessionGrid').style.display = v === 'grid' ? '' : 'none';
  document.getElementById('timelineView').classList.toggle('visible', v === 'timeline');
  document.getElementById('costsView').style.display = 'none';
  document.getElementById('personsView').style.display = 'none';
  document.getElementById('archView').style.display = 'none';
  const _pv = document.getElementById('promptsView'); if (_pv) _pv.style.display = 'none';
  // Overlay-Buttons zurücksetzen
  ['headerCostsBtn', 'headerPersonsBtn', 'headerArchBtn', 'headerPromptsBtn'].forEach(id => {
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
  // Alle anderen Overlay-Views schließen
  ['costsView','personsView','archView','promptsView'].forEach(id => {
    const el = document.getElementById(id);
    if (el && id !== viewId) el.style.display = 'none';
  });
  ['headerCostsBtn','headerPersonsBtn','headerArchBtn','headerPromptsBtn'].forEach(id => {
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
  <div style="max-width:960px; margin:0 auto; padding:8px 0 40px">
    <div style="margin-bottom:28px">
      <h2 style="font-size:1.3rem; font-weight:700; margin-bottom:4px; display:flex;align-items:center;gap:8px">${icon('layers',18)} Systemarchitektur</h2>
      <p style="font-size:0.82rem; color:var(--muted); line-height:1.6; margin:0">
        Alle Komponenten laufen vollständig im Browser – kein Backend-Server. API-Keys bleiben lokal.
        <span style="color:var(--accent); font-weight:600">Version 3.2</span>
      </p>
    </div>

    <!-- Haupt-Diagramm -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:28px 24px; margin-bottom:24px">

      <!-- Zeile 1: Externe APIs (5 Dienste) -->
      <div style="text-align:center; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:12px">Externe Dienste</div>
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:20px">
        ${archBox(icon('mic',18,'color:#fbbf24'), 'AssemblyAI', 'Transkription + Speaker Diarization', '#fbbf24', 'REST API v2')}
        ${archBox(icon('cpu',18,'color:#a78bfa'), 'Claude Sonnet', 'KI-Analyse · 360° · Suche · Chat', '#a78bfa', 'claude-sonnet-4-6')}
        ${archBox(icon('cloud',18,'color:#34d399'), 'Google Drive', 'Sitzungs-Archiv als JSON-Dateien', '#34d399', 'Drive API v3')}
        ${archBox(icon('calendar',18,'color:#60a5fa'), 'Google Calendar', 'Termine direkt eingetragen', '#60a5fa', 'Calendar API v3')}
        ${archBox(icon('mail',18,'color:#f472b6'), 'Gmail', 'E-Mail-Entwürfe gespeichert', '#f472b6', 'Gmail API v1')}
      </div>

      <!-- Pfeile -->
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:4px; text-align:center">
        ${archArrow('#fbbf24')}${archArrow('#a78bfa')}${archArrow('#34d399')}${archArrow('#60a5fa')}${archArrow('#f472b6')}
      </div>

      <!-- Zeile 2: Browser App -->
      <div style="background:linear-gradient(135deg, rgba(108,99,255,0.12), rgba(167,139,250,0.06)); border:2px solid var(--accent); border-radius:12px; padding:20px; margin-bottom:16px; text-align:center">
        <div style="margin-bottom:8px; display:flex;justify-content:center">${icon('globe',28,'color:var(--accent)')}</div>
        <div style="font-weight:700; font-size:1rem; margin-bottom:4px">Browser-App (GitHub Pages)</div>
        <div style="font-size:0.78rem; color:var(--muted); line-height:1.8">
          Statisches HTML · Vanilla JS (ES2022) · CSS Custom Properties<br>
          <span style="opacity:0.7">app.js · ui.js · claude.js · drive.js · transcribe.js · recorder.js</span><br>
          <span style="color:var(--accent2); font-weight:500">features.js · search.js · calendar.js</span><br>
          <span style="color:var(--accent); font-size:0.72rem">dndesi.github.io/Transkriptions-Dashboard-Cloud</span>
        </div>
      </div>

      <!-- Zeile 3: Lokaler Speicher + Proxy + Auth -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px">
        ${archBox(icon('lock',18,'color:#60a5fa'), 'localStorage', 'API-Keys · Theme · Beziehungen · Vorlagen · Einstellungen', '#60a5fa', 'Nur lokal – nie in der Cloud')}
        ${archBox(icon('key',18,'color:#34d399'), 'Google OAuth 2.0', 'GIS Client · Drive + Calendar + Gmail · Token-Refresh', '#34d399', 'accounts.google.com/gsi')}
        ${archBox(icon('zap',18,'color:#f472b6'), 'Cloudflare Worker', 'CORS-Proxy für DELETE-Requests', '#f472b6', 'Optional – workers.dev')}
      </div>
    </div>

    <!-- JS-Module -->
    <div style="margin-bottom:18px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted)">JavaScript-Module</div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:24px">
      ${flowCard('config.js', 'Globaler State', 'API-Keys, Sessions, Drive-Token, OAuth-Scopes (Drive + Calendar + Gmail), Preise, Wechselkurs', '#60a5fa')}
      ${flowCard('transcribe.js', 'Transkription', 'AssemblyAI Upload → Polling → Utterances mit Speaker-Labels und Timestamps', '#fbbf24')}
      ${flowCard('claude.js', 'KI-Analyse', 'Privat/Arbeit-Analyse, 360°-Perspektiven, Anonymisierung, Token-Tracking', '#a78bfa')}
      ${flowCard('drive.js', 'Cloud Storage', 'Google Drive OAuth, Ordner anlegen, Sessions als JSON speichern/laden/löschen', '#34d399')}
      ${flowCard('features.js', 'Erweiterte Features', '360°-Analyse, Aufnahme befragen (Chat), Mind Map (Mermaid.js), Eigene Vorlagen', '#f59e0b')}
      ${flowCard('search.js', 'Globale Suche', 'Instant-Textsuche über alle Felder + Claude-Semantiksuche, ⌘K Shortcut', '#6ee7b7')}
      ${flowCard('calendar.js', 'Kalender & Mail', 'Termine via Claude extrahieren → Google Calendar API · E-Mail-Entwürfe → Gmail API', '#f472b6')}
      ${flowCard('ui.js', 'UI-Rendering', 'Session-Browser, Kosten, Personen-Profile, Systemarchitektur, Changelog', '#c084fc')}
      ${flowCard('recorder.js', 'Audio-Aufnahme', 'MediaRecorder API, Mikrofon-Zugriff, WebM-Aufnahme direkt im Browser', '#34d399')}
    </div>

    <!-- Datenflüsse -->
    <div style="margin-bottom:18px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted)">Wichtige Datenflüsse</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px">
      ${flowCard('Mic → AssemblyAI', 'Transkription', 'Audio → Upload → Polling → Utterances mit Speaker-Labels (A/B/C…)', '#fbbf24')}
      ${flowCard('Browser → Claude Sonnet', 'KI-Analyse', 'Transkript (opt. anonymisiert) → JSON: Zusammenfassung, Aufgaben, Psychologie, 360°', '#a78bfa')}
      ${flowCard('Browser → Google Drive', 'Cloud-Speicherung', 'Sitzung als JSON → Drive-Ordner → automatisch geladen beim nächsten Login', '#34d399')}
      ${flowCard('Browser → Google Calendar', 'Termine eintragen', 'Claude erkennt Termine im Transkript → RFC3339 Event → Calendar API v3 (POST)', '#60a5fa')}
      ${flowCard('Browser → Gmail', 'Entwürfe erstellen', 'Claude generiert E-Mails → Base64url → Gmail Drafts API → User sendet selbst ab', '#f472b6')}
      ${flowCard('Worker → AssemblyAI', 'Transkript löschen', 'DELETE via Cloudflare Worker (CORS-Bypass) → AssemblyAI entfernt Transkript', '#94a3b8')}
    </div>

    <!-- Tech-Stack -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px; margin-bottom:14px">
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:14px; display:flex;align-items:center;gap:6px">${icon('wrench',14)} Technologie-Stack</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        ${techRow('Frontend', 'HTML5 · Vanilla JS (ES2022) · CSS Custom Properties')}
        ${techRow('Hosting', 'GitHub Pages (kostenlos, statisch)')}
        ${techRow('Transkription', 'AssemblyAI REST API v2 · Speaker Diarization · Deutsch')}
        ${techRow('KI-Modell', 'claude-sonnet-4-6 via Browser-Fetch (direct access)')}
        ${techRow('Cloud-Storage', 'Google Drive API v3 · OAuth 2.0 (GIS Client)')}
        ${techRow('Kalender', 'Google Calendar API v3 · Europe/Berlin Zeitzone')}
        ${techRow('E-Mail', 'Gmail API v1 · RFC 2822 · Base64url · Entwurfsmodus')}
        ${techRow('Mind Map', 'Mermaid.js v10 (CDN) · mermaid.run()')}
        ${techRow('OAuth Scopes', 'drive.file · userinfo.profile · calendar.events · gmail.compose')}
        ${techRow('Daten lokal', 'localStorage: Keys, Theme, Beziehungen, Vorlagen')}
        ${techRow('CORS-Proxy', 'Cloudflare Worker (optional, ~5 Min Setup)')}
        ${techRow('Wechselkurs', 'Frankfurter API (api.frankfurter.app) – USD → EUR')}
        ${techRow('Datenschutz', 'Anonymisierungs-Funktion vor API-Calls aktivierbar')}
      </div>
    </div>

    <!-- Sicherheitshinweis -->
    <div style="padding:12px 16px; background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.25); border-radius:10px; font-size:0.8rem; color:var(--muted); line-height:1.6">
      ${icon('lock',13,'margin-right:5px;color:var(--green)')} <strong style="color:var(--text)">Datenschutz-Architektur:</strong>
      API-Keys verlassen deinen Browser nie. Gespräche liegen in deiner persönlichen Google Drive.
      Kalender und Mail-Zugriff erfordert explizite Google-Zustimmung beim Login.
      Der optionale Anonymisierungs-Modus ersetzt Namen vor der KI-Analyse durch neutrale Labels.
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

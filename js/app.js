// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
async function init() {
  await initStorage();               // IndexedDB laden (sessions + projects)
  migrateSessionsToDefaultProject(); // Paket 1: bestehende Sessions → Allgemeines Projekt
  updateProjectBadge();              // Paket 2: Sidenav-Badge aktualisieren
  _applyOwnerName();                 // Owner-Name in UI einsetzen
  // Unterbrochene Transkriptionen nach kurzem Delay fortsetzen (APIs müssen bereit sein)
  setTimeout(() => resumePendingTranscriptions(), 3000);
  updateApiIndicator();
  updateDriveStatus();
  updateTagFilter();
  renderBrowser();
  setupAudioSync();
  setDateInputToNow();
  // Startansicht: Hero-Seite (v4.87) – kein setView('timeline') mehr beim Init

  // Drag & Drop
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { applyFileDate(file); processFile(file); }
  });

  // Lucide Icons rendern
  if (window.lucide) lucide.createIcons();

  // Neue Features initialisieren (eigene Vorlagen in Popovers laden)
  if (typeof initFeatures === 'function') initFeatures();

  // Service Worker registrieren (v5.2 – Web Share Target)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/Transkriptions-Dashboard-Cloud/sw.js')
      .catch(e => console.warn('[SW] Registrierung fehlgeschlagen:', e));
  }

  // Geteilte Dateien prüfen (wenn App über Share-Intent geöffnet wurde)
  if (location.search.includes('shared=1')) {
    history.replaceState({}, '', location.pathname);
    setTimeout(() => checkPendingShares(), 500); // kurze Pause damit UI aufgebaut ist
  }
}


// ═══════════════════════════════════════════════════
// WEB SHARE TARGET – Dateiempfang (v5.2)
// ═══════════════════════════════════════════════════
const _SHARE_DB    = 'distill_share_db';
const _SHARE_STORE = 'pendingShares';

function _openShareDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_SHARE_DB, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(_SHARE_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _loadPendingShares() {
  try {
    const db = await _openShareDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(_SHARE_STORE, 'readonly');
      const store = tx.objectStore(_SHARE_STORE);
      const req   = store.getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror   = () => { db.close(); reject(req.error); };
    });
  } catch(e) { return []; }
}

async function _clearPendingShares() {
  try {
    const db = await _openShareDB();
    return new Promise((resolve) => {
      const tx = db.transaction(_SHARE_STORE, 'readwrite');
      tx.objectStore(_SHARE_STORE).clear();
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  } catch(e) { /* silent */ }
}

async function checkPendingShares() {
  const shares = await _loadPendingShares();
  if (!shares || shares.length === 0) return;
  await _clearPendingShares();
  openShareOverlay(shares);
}

function openShareOverlay(shares) {
  // Dateitypen klassifizieren
  const txtFiles   = shares.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
  const audioFiles = shares.filter(f =>
    f.type.startsWith('audio/') || f.name.match(/\.(mp3|m4a|wav|ogg)$/i));

  // Modus bestimmen
  let modus = 'audio';
  if (txtFiles.length > 0 && audioFiles.length > 0) modus = 'komplett';
  if (txtFiles.length > 0 && audioFiles.length === 0) modus = 'text';

  const modusLabel = {
    komplett: '📄+🎵 TXT+Audio empfangen – Transkript wird direkt übernommen',
    text:     '📄 TXT empfangen – wird als Transkript importiert',
    audio:    '🎵 Audiodatei empfangen – wird transkribiert (AssemblyAI)',
  }[modus];

  const overlay = document.getElementById('shareOverlay');
  if (!overlay) return;

  document.getElementById('shareModusInfo').textContent = modusLabel;

  // Dateinamen anzeigen
  document.getElementById('shareFilenames').innerHTML = shares.map(f =>
    `<span style="display:block;font-size:0.8rem;color:var(--muted)">${f.name} (${(f.size/1024).toFixed(0)} KB)</span>`
  ).join('');

  // Sitzungsname vorbelegen
  const baseName = (shares[0]?.name || '').replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  document.getElementById('shareSessionLabel').value = baseName;

  // Drive-Ordner-Selector befüllen
  const folderSel = document.getElementById('shareFolderSelect');
  if (folderSel) {
    folderSel.innerHTML = '<option value="">– Hauptordner –</option>';
    (rememberedFolders || []).forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      folderSel.appendChild(opt);
    });
    // Aktuell gesetzten Ordner vorauswählen
    if (driveSubfolderId) folderSel.value = driveSubfolderId;
  }

  // Modus + Blobs merken
  overlay.dataset.modus = modus;
  window._pendingShareBlobs = {};
  shares.forEach(s => {
    window._pendingShareBlobs[s.name] = new Blob([s.data], { type: s.type });
  });

  overlay.style.display = 'flex';
}

async function processShareOverlay() {
  const overlay   = document.getElementById('shareOverlay');
  const label     = document.getElementById('shareSessionLabel').value.trim() || 'Geteilte Sitzung';
  const modus     = overlay.dataset.modus;

  // Drive-Ordner aus Overlay-Auswahl setzen
  const folderSel = document.getElementById('shareFolderSelect');
  if (folderSel) {
    driveSubfolderId   = folderSel.value || '';
    driveSubfolderName = folderSel.value
      ? folderSel.options[folderSel.selectedIndex]?.text || ''
      : '';
  }

  const blobs     = window._pendingShareBlobs || {};
  const txtEntry  = Object.entries(blobs).find(([n]) => n.endsWith('.txt'));
  const audioEntry= Object.entries(blobs).find(([n]) => n.match(/\.(mp3|m4a|wav|ogg)$/i));
  const txtBlob   = txtEntry?.[1];
  const audioBlob = audioEntry?.[1];
  const audioName = audioEntry?.[0] || 'aufnahme.mp3';

  overlay.style.display = 'none';

  if (modus === 'text' || modus === 'komplett') {
    const text = await txtBlob.text();
    document.getElementById('sessionLabel').value = label;
    if (typeof processImportedText === 'function') {
      processImportedText(text, label, modus === 'komplett' ? audioBlob : null, audioName);
    } else {
      setView('new');
      document.getElementById('sessionLabel').value = label;
      showToast('Transkript empfangen – bitte manuell speichern', 'info');
    }
  } else if (modus === 'audio') {
    setView('new');
    document.getElementById('sessionLabel').value = label;
    if (audioBlob && typeof processFile === 'function') {
      const audioFile = new File([audioBlob], audioName, { type: audioBlob.type });
      processFile(audioFile);
    }
  }

  window._pendingShareBlobs = {};
}

// Verarbeitet einen per Share-Target empfangenen Text (mit optionalem Audio-Blob)
async function processImportedText(text, label, audioBlob = null, audioName = 'aufnahme.mp3') {
  // 1. Text parsen – Samsung-Format bevorzugen, Fallback auf Plaintext
  let parsed = null;
  try {
    if (typeof parseSamsungTranscript === 'function') {
      const sp = parseSamsungTranscript(text);
      if (sp && sp.utterances.length > 0) parsed = sp;
    }
    if (!parsed && typeof parsePlainText === 'function') {
      parsed = parsePlainText(text);
    }
  } catch (e) {
    console.warn('[share] Textparsing fehlgeschlagen:', e);
  }

  if (!parsed || !parsed.utterances.length) {
    showToast('Inhalt konnte nicht gelesen werden.', 'warning');
    return;
  }

  // 2. Session-Objekt erstellen
  const speakers = (parsed.speakers || []).map(sp => ({
    id:    sp.id,
    label: sp.label,
    name:  sp.name || sp.label,
  }));
  const spA    = speakers.find(s => s.id === 'A');
  const spB    = speakers.find(s => s.id === 'B');
  const isPlain = speakers.length <= 1;
  const source  = isPlain ? 'txt_import' : 'samsung_import';

  const session = {
    id:           Date.now().toString(),
    label:        label || 'Geteilte Aufnahme',
    filename:     audioName || label || 'share',
    speakerA:     spA?.name || 'Sprecher A',
    speakerB:     spB?.name || 'Sprecher B',
    speakers,
    type:         'privat',
    persons:      [],
    date:         new Date().toISOString(),
    status:       'done',
    source,
    utterances:   parsed.utterances,
    transcriptId: null,
    duration:     parsed.duration || 0,
    processedAt:  new Date().toISOString(),
  };

  sessions.unshift(session);
  await saveSessions();

  // 3. In Drive archivieren (TXT allein reicht für Metadaten; Audio wenn vorhanden)
  if (audioBlob) {
    const audioFile = new File([audioBlob], audioName, { type: audioBlob.type || 'audio/mpeg' });
    saveToArchive(session, audioFile).catch(() => {});
  } else {
    saveToArchive(session).catch(() => {});
  }

  // 4. UI: Sitzungsliste neu rendern + direkt in neue Sitzung springen
  renderSessionsList();
  currentSessionId = session.id;
  showSession(session.id);
  showToast(`„${session.label}" importiert ✓`, 'success');
}

async function createShareDriveFolder() {
  const name = prompt('Name für den neuen Unterordner:');
  if (!name || !name.trim()) return;
  try {
    const f = await drivePost('/files', {
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [driveFolderId]
    });
    // Ordner setzen + Selects aktualisieren
    driveSubfolderId   = f.id;
    driveSubfolderName = name.trim();
    await loadDriveSubfolders(); // befüllt alle Selects inkl. shareFolderSelect
    const folderSel = document.getElementById('shareFolderSelect');
    if (folderSel) folderSel.value = f.id;
    showToast(`Ordner „${name.trim()}" angelegt und ausgewählt`, 'success');
  } catch(e) {
    showToast('Anlegen fehlgeschlagen: ' + e.message, 'error');
  }
}

function closeShareOverlay() {
  document.getElementById('shareOverlay').style.display = 'none';
  window._pendingShareBlobs = {};
}


// RESET FÜR NEUE SITZUNG
// ═══════════════════════════════════════════════════
function onSessionTypeChange() {
  updateSpeakerSummary();
}

function updateSpeakerSummary() {
  const type    = document.getElementById('sessionType')?.value || 'privat';
  const persons = (document.getElementById('sessionPersons')?.value || '')
                    .split(',').map(p => p.trim()).filter(Boolean);
  const summary = document.getElementById('speakerSummary');
  const preview = document.getElementById('speakerBPreview');
  if (!summary) return;
  const myName = ownerName || 'Ich';

  if (type === 'gedanken') {
    summary.innerHTML = `<span><span style="color:var(--speaker-a)">●</span> <strong style="color:var(--text)">${escHtml(myName)}</strong></span>
      <span style="color:var(--border); margin:0 4px">·</span>
      <span style="color:var(--muted); font-style:italic">Nur eigene Gedanken – kein zweiter Sprecher</span>`;
  } else {
    const bName = persons[0] || (type === 'arbeit' ? 'Kollege/Kollegin' : 'Gesprächspartner/in');
    const extras = persons.slice(1);
    let html = `<span><span style="color:var(--speaker-a)">●</span> <strong style="color:var(--text)">${escHtml(myName)}</strong></span>
      <span style="color:var(--border); margin:0 4px">·</span>
      <span><span style="color:var(--speaker-b)">●</span> <strong style="color:var(--text)">${escHtml(bName)}</strong></span>`;
    extras.forEach((name, i) => {
      const col = ['var(--speaker-c)','var(--speaker-d)','var(--speaker-extra)'][i] || 'var(--speaker-extra)';
      html += `<span style="color:var(--border); margin:0 4px">·</span>
        <span><span style="color:${col}">●</span> <strong style="color:var(--text)">${escHtml(name)}</strong></span>`;
    });
    summary.innerHTML = html;
  }
}

function resetForNewSession() {
  document.getElementById('sessionLabel').value = '';
  setDateInputToNow();
  if (document.getElementById('sessionType'))   document.getElementById('sessionType').value = 'privat';
  if (document.getElementById('sessionPersons')) document.getElementById('sessionPersons').value = '';
  onSessionTypeChange();
  checkUploadReady();
}

function _applyOwnerName() {
  if (!ownerName) return;
  // Upload-Panel: Sprecher-A-Vorschau auf ownerName setzen
  const previewEl = document.getElementById('speakerAPreview');
  if (previewEl) previewEl.textContent = ownerName;
}

function setDateInputToNow() {
  const el = document.getElementById('sessionDate');
  if (!el) return;
  const now = new Date();
  // Format: YYYY-MM-DDTHH:MM (wie datetime-local erwartet)
  const pad = n => String(n).padStart(2, '0');
  el.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ═══════════════════════════════════════════════════
// SCHRITT-VALIDIERUNG
// ═══════════════════════════════════════════════════
// ── Theme-Toggle ─────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'light' ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons({ nodes: [icon.parentElement || icon] });
  }
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'light' ? 'Hell' : 'Dunkel';
  localStorage.setItem('dashboardTheme', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
// Theme beim Laden anwenden
(function() {
  const saved = localStorage.getItem('dashboardTheme') || 'dark';
  applyTheme(saved);
})();

function checkUploadReady() {
  const hasKey     = !!apiKey;
  const hasLabel   = !!(document.getElementById('sessionLabel')?.value.trim());
  const hasFolder  = !!(driveToken && driveFolderId && driveSubfolderId);

  // Schritt 1
  const s1 = document.getElementById('step1');
  const s1check = document.getElementById('step1Check');
  const s1body = document.getElementById('step1Body');
  if (hasKey) {
    s1.className = 'step-block done';
    s1check.innerHTML = icon('check-circle',16,'color:var(--green)');
    s1body.style.display = 'none';
  } else {
    s1.className = 'step-block active';
    s1check.textContent = '';
    s1body.style.display = 'block';
  }

  // Schritt 2 (gesperrt bis Key da)
  const s2 = document.getElementById('step2');
  const s2check = document.getElementById('step2Check');
  if (!hasKey) {
    s2.className = 'step-block locked';
    s2check.textContent = '';
  } else if (hasLabel) {
    s2.className = 'step-block done';
    s2check.innerHTML = icon('check-circle',16,'color:var(--green)');
  } else {
    s2.className = 'step-block active';
    s2check.textContent = '';
  }

  // Schritt 3 (gesperrt bis Key + Label da)
  const s3 = document.getElementById('step3');
  const s3check = document.getElementById('step3Check');
  if (!hasKey || !hasLabel) {
    s3.className = 'step-block locked';
    s3check.textContent = '';
  } else if (hasFolder) {
    s3.className = 'step-block done';
    s3check.innerHTML = icon('check-circle',16,'color:var(--green)');
  } else {
    s3.className = 'step-block active';
    s3check.textContent = '';
  }

  // Schritt 4 (gesperrt bis alle 3 da)
  const s4 = document.getElementById('step4');
  const zone = document.getElementById('uploadZone');
  const hint = document.getElementById('uploadHint');
  const allReady = hasKey && hasLabel && hasFolder;

  if (allReady) {
    s4.className = 'step-block active';
    zone.classList.remove('disabled');
    hint.classList.remove('visible');
    const rb = document.getElementById('recordBtn');
    if (rb) { rb.style.pointerEvents=''; rb.style.opacity='1'; }
  } else {
    s4.className = 'step-block locked';
    zone.classList.add('disabled');
    const missing = [];
    if (!hasKey)    missing.push('API-Key (Schritt 1)');
    if (!hasLabel)  missing.push('Sitzungsname (Schritt 2)');
    if (!hasFolder) missing.push('Unterordner in Drive (Schritt 3)');
    hint.innerHTML = icon('alert-triangle',12,'margin-right:5px;color:var(--yellow)') + ' Noch ausstehend: ' + escHtml(missing.join(', '));
    hint.classList.add('visible');
  }
}

function openApiModal() {
  const ownerEl = document.getElementById('ownerNameInput');
  if (ownerEl) ownerEl.value = ownerName;
  document.getElementById('apiKeyInput').value = apiKey;
  document.getElementById('anthropicKeyInput').value = anthropicKey;
  document.getElementById('proxyUrlInput').value = proxyUrl;
  const regionEl = document.getElementById('assemblyRegionSelect');
  if (regionEl) regionEl.value = assemblyRegion;
  const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}');
  document.getElementById('anonymizeToggle').checked = !!settings.anonymize;
  const whisperEl = document.getElementById('whisperUrlInput');
  if (whisperEl) whisperEl.value = localStorage.getItem('whisperUrl') || '';
  const retEl = document.getElementById('audioRetentionSelect');
  if (retEl) retEl.value = localStorage.getItem('audioRetentionDays') ?? '14';
  document.getElementById('apiModal').classList.add('open');
}
function closeApiModal() { document.getElementById('apiModal').classList.remove('open'); }
function saveApiKey() {
  // Owner-Name speichern
  const nameVal = document.getElementById('ownerNameInput')?.value.trim() || '';
  ownerName = nameVal;
  if (nameVal) localStorage.setItem('ownerName', nameVal);
  else localStorage.removeItem('ownerName');

  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) { showToast('Bitte AssemblyAI Key eingeben.', 'error'); return; }
  apiKey = val;
  localStorage.setItem('assemblyai_key', apiKey);
  const antVal = document.getElementById('anthropicKeyInput').value.trim();
  anthropicKey = antVal;
  if (antVal) localStorage.setItem('anthropic_key', antVal);
  else localStorage.removeItem('anthropic_key');
  const pxVal = document.getElementById('proxyUrlInput').value.trim();
  proxyUrl = pxVal;
  if (pxVal) localStorage.setItem('proxy_url', pxVal);
  else localStorage.removeItem('proxy_url');
  const regionVal = document.getElementById('assemblyRegionSelect')?.value || 'eu';
  assemblyRegion = regionVal;
  localStorage.setItem('assembly_region', assemblyRegion);
  updateApiIndicator();
  closeApiModal();
  showToast('Einstellungen gespeichert', 'success');
}

function copyWorkerCode() {
  const code = document.getElementById('workerCodePre').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Worker-Code kopiert', 'success'));
}

async function testApiKeys() {
  const resultEl = document.getElementById('apiTestResult');
  const asmKey = document.getElementById('apiKeyInput').value.trim();
  const antKey = document.getElementById('anthropicKeyInput').value.trim();
  resultEl.style.display = 'block';
  resultEl.style.background = 'rgba(107,114,128,0.15)';
  resultEl.style.border = '1px solid var(--border)';
  resultEl.style.color = 'var(--muted)';
  resultEl.innerHTML = icon('loader',13,'margin-right:5px') + ' Teste Verbindungen…';

  // status: 'ok' | 'error' | 'warn' | 'none'
  const entries = [];

  // AssemblyAI testen
  if (asmKey) {
    try {
      const res = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'GET',
        headers: { authorization: asmKey }
      });
      entries.push(res.status === 200 || res.status === 400 || res.status === 404
        ? { status:'ok',   text:'AssemblyAI: Verbunden' }
        : res.status === 401
          ? { status:'error', text:'AssemblyAI: Key ungültig (401)' }
          : { status:'warn',  text:`AssemblyAI: HTTP ${res.status}` });
    } catch (e) { entries.push({ status:'error', text:'AssemblyAI: Netzwerkfehler' }); }
  } else {
    entries.push({ status:'none', text:'AssemblyAI: Kein Key eingegeben' });
  }

  // Anthropic testen
  if (antKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': antKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Antworte nur: ok' }]
        })
      });
      entries.push(res.ok
        ? { status:'ok',    text:'Anthropic: Verbunden' }
        : res.status === 401 ? { status:'error', text:'Anthropic: Key ungültig (401)' }
        : res.status === 403 ? { status:'error', text:'Anthropic: Zugriff verweigert (403)' }
        : { status:'warn', text:`Anthropic: HTTP ${res.status}` });
    } catch (e) { entries.push({ status:'error', text:'Anthropic: Netzwerkfehler — ' + e.message }); }
  } else {
    entries.push({ status:'none', text:'Anthropic: Kein Key eingegeben' });
  }

  const allOk    = entries.every(e => e.status === 'ok');
  const hasError = entries.some(e => e.status === 'error');
  resultEl.style.background = allOk ? 'rgba(52,211,153,0.1)' : hasError ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)';
  resultEl.style.border = `1px solid ${allOk ? 'rgba(52,211,153,0.4)' : hasError ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.4)'}`;
  resultEl.style.color = allOk ? 'var(--green)' : hasError ? 'var(--red)' : 'var(--yellow)';
  resultEl.innerHTML = entries.map(e => {
    const ico = e.status === 'ok' ? icon('check-circle',13,'margin-right:5px;color:var(--green)')
              : e.status === 'error' ? icon('x-circle',13,'margin-right:5px;color:var(--red)')
              : e.status === 'warn'  ? icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)')
              : icon('check',13,'margin-right:5px;opacity:0.4');
    return `<div style="display:flex;align-items:center;gap:3px">${ico}${escHtml(e.text)}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════

// START
init();

// ═══════════════════════════════════════════════════
// HILFE-TOOLTIP (v4.98)
// ═══════════════════════════════════════════════════
(function () {
  let _activeHelp = null;

  function _createTooltip() {
    const el = document.createElement('div');
    el.id = 'helpTooltip';
    el.innerHTML = '<button class="help-tooltip-close" onclick="document.getElementById(\'helpTooltip\').classList.remove(\'visible\')">✕</button><span id="helpTooltipText"></span>';
    document.body.appendChild(el);
    return el;
  }

  window.showHelpTooltip = function (btn) {
    // Klick nicht an Parent-Elemente weitergeben
    if (event) event.stopPropagation();

    const tip = document.getElementById('helpTooltip') || _createTooltip();
    const text = btn.getAttribute('data-help') || '';

    // Gleichen Button zweimal → schließen
    if (_activeHelp === btn && tip.classList.contains('visible')) {
      tip.classList.remove('visible');
      _activeHelp = null;
      return;
    }
    _activeHelp = btn;
    document.getElementById('helpTooltipText').textContent = text;

    // Positionierung: unter dem Button, viewport-bewusst
    tip.classList.remove('visible');
    requestAnimationFrame(() => {
      const rect  = btn.getBoundingClientRect();
      const tw    = tip.offsetWidth  || 270;
      const th    = tip.offsetHeight || 80;
      const vw    = window.innerWidth;
      const vh    = window.innerHeight;
      let left = rect.left;
      let top  = rect.bottom + 6;
      if (left + tw > vw - 8)  left = vw - tw - 8;
      if (left < 8)            left = 8;
      if (top + th > vh - 8)   top  = rect.top - th - 6;
      tip.style.left = left + 'px';
      tip.style.top  = top  + 'px';
      tip.classList.add('visible');
    });
  };

  // Klick außerhalb schließt Tooltip
  document.addEventListener('click', () => {
    const tip = document.getElementById('helpTooltip');
    if (tip) tip.classList.remove('visible');
    _activeHelp = null;
  }, true);

  // Escape schließt Tooltip
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const tip = document.getElementById('helpTooltip');
      if (tip) tip.classList.remove('visible');
      _activeHelp = null;
    }
  });
})();

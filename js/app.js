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
  // Startansicht: chronologische Liste
  setView('timeline');

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

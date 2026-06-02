// ASSEMBLYAI: TRANSKRIPT LÖSCHEN
// ═══════════════════════════════════════════════════
async function deleteFromAssemblyAI(transcriptId) {
  if (!transcriptId) return { ok: false, error: 'Keine ID' };
  const deleteUrl = proxyUrl
    ? proxyUrl.replace(/\/$/, '') + '/' + transcriptId
    : `${assemblyBase()}/v2/transcript/${transcriptId}`;
  console.log('[AssemblyAI DELETE] URL:', deleteUrl);
  try {
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'authorization': apiKey },
    });
    const bodyText = await res.text().catch(() => '');
    console.log(`[AssemblyAI DELETE] Status: ${res.status}`, bodyText);
    if (res.ok || res.status === 404) return { ok: true }; // 404 = schon gelöscht, auch ok
    return { ok: false, error: `HTTP ${res.status}: ${bodyText.slice(0, 120)}` };
  } catch(e) {
    console.warn('[AssemblyAI DELETE] Netzwerkfehler:', e.message);
    return { ok: false, error: 'Netzwerkfehler: ' + e.message };
  }
}

// ═══════════════════════════════════════════════════
// ASSEMBLYAI BEREINIGUNG (Massenlöschung)
// ═══════════════════════════════════════════════════
function openSettingsFromCleanup() {
  closeCleanupModal();
  // Einstellungen-Bereich einblenden / scrollen
  const settingsSection = document.getElementById('settingsSection');
  if (settingsSection) {
    settingsSection.scrollIntoView({ behavior: 'smooth' });
    const proxyInput = document.getElementById('proxyUrlInput');
    if (proxyInput) setTimeout(() => proxyInput.focus(), 400);
  }
}

async function openCleanupModal() {
  if (!apiKey) {
    showToast('AssemblyAI API-Key fehlt – bitte erst eingeben', 'error');
    return;
  }
  document.getElementById('cleanupModal').classList.add('open');
  document.getElementById('cleanupDeleteAllBtn').style.display = 'none';
  document.getElementById('cleanupStatus').innerHTML = icon('loader',13,'margin-right:5px') + ' Lade Transkripte von AssemblyAI…';
  document.getElementById('cleanupList').innerHTML =
    '<div style="padding:20px; text-align:center; color:var(--muted); font-size:0.85rem">Wird geladen…</div>';

  // Proxy-Hinweis anzeigen
  const hint = document.getElementById('cleanupProxyHint');
  const proxyBtn = document.getElementById('cleanupProxyBtn');
  if (proxyUrl) {
    hint.style.display = 'block';
    hint.style.background = 'rgba(52,211,153,0.1)';
    hint.style.border = '1px solid rgba(52,211,153,0.3)';
    hint.style.color = 'var(--green)';
    hint.innerHTML = icon('check-circle',13,'margin-right:5px') + ' Proxy aktiv – Löschen funktioniert direkt.';
    if (proxyBtn) proxyBtn.style.display = 'none';
  } else {
    hint.style.display = 'block';
    hint.style.background = 'rgba(251,191,36,0.1)';
    hint.style.border = '1px solid rgba(251,191,36,0.3)';
    hint.style.color = 'var(--yellow)';
    hint.innerHTML = icon('alert-triangle',13,'margin-right:5px') + ' <strong>Kein Proxy eingerichtet.</strong> GitHub Pages blockiert das Löschen direkt bei AssemblyAI (CORS). '
      + 'Richte einen kostenlosen Cloudflare Worker ein, um das Löschen zu aktivieren. '
      + '<a href="https://developers.cloudflare.com/workers/get-started/guide/" target="_blank" style="color:var(--accent2)">Anleitung →</a>';
    if (proxyBtn) proxyBtn.style.display = '';
  }

  await fetchAndRenderCleanupList();
}

// Lädt alle Transkripte direkt von AssemblyAI und rendert die Liste
async function fetchAndRenderCleanupList() {
  const list   = document.getElementById('cleanupList');
  const status = document.getElementById('cleanupStatus');
  const allBtn = document.getElementById('cleanupDeleteAllBtn');

  try {
    // Alle Transkripte von AssemblyAI holen (max. 200)
    let transcripts = [];
    let url = `${assemblyBase()}/v2/transcript?limit=50`;
    while (url && transcripts.length < 200) {
      const res = await fetch(url, { headers: { authorization: apiKey } });
      if (!res.ok) throw new Error('AssemblyAI API ' + res.status);
      const data = await res.json();
      transcripts = transcripts.concat(data.transcripts || []);
      url = data.page_details?.next_url || null;
      if (data.transcripts?.length < 50) break;
    }

    // Bereits gelöschte Transkripte ausfiltern
    // AssemblyAI markiert gelöschte Einträge mit: status:'deleted', is_deleted:true, oder audio_url:'http://deleted_by_user'
    transcripts = transcripts.filter(t =>
      !t.is_deleted &&
      t.status !== 'deleted' &&
      t.audio_url !== 'http://deleted_by_user'
    );

    if (transcripts.length === 0) {
      list.innerHTML = `<div style="padding:16px; text-align:center; color:var(--green); font-size:0.9rem">${icon('check-circle',14,'margin-right:5px')} Alles sauber – keine Transkripte auf AssemblyAI.</div>`;
      status.textContent = '';
      return;
    }

    status.textContent = `${transcripts.length} Transkript${transcripts.length !== 1 ? 'e' : ''} gefunden`;
    allBtn.style.display = '';
    allBtn.dataset.ids = JSON.stringify(transcripts.map(t => t.id));

    list.innerHTML = '';
    transcripts.forEach(t => {
      // Lokale Session suchen für den Namen
      const local = sessions.find(s => s.transcriptId === t.id);
      const name  = local ? local.label : '—';
      const dateObj = t.created ? new Date(t.created * 1000) : null;
      const dateStr = dateObj && !isNaN(dateObj)
        ? dateObj.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '—';
      const statusColor = t.status === 'completed' ? 'var(--green)' : t.status === 'error' ? 'var(--red)' : 'var(--yellow)';
      const statusLabel = t.status === 'completed' ? icon('check',12,'color:var(--green);margin-right:3px')+'fertig' : t.status === 'error' ? icon('x-circle',12,'color:var(--red);margin-right:3px')+'Fehler' : icon('loader',12,'margin-right:3px')+t.status;

      const row = document.createElement('div');
      row.id = `crow-${t.id}`;
      row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid var(--border); font-size:0.83rem;';
      row.innerHTML = `
        <div style="flex:1; min-width:0; overflow:hidden">
          <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${escHtml(name)}</div>
          <div style="color:var(--muted); font-size:0.73rem; margin-top:2px">ID: ${t.id} · ${dateStr}</div>
        </div>
        <span style="flex-shrink:0; font-size:0.75rem; color:${statusColor}">${statusLabel}</span>
        <button id="cbtn-${t.id}" onclick="deleteSingleTranscript('${t.id}')"
          style="flex-shrink:0; background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.4);
                 color:var(--red); border-radius:6px; padding:5px 12px; font-size:0.78rem; cursor:pointer; white-space:nowrap">
          ${icon('trash-2',12,'margin-right:4px')} Löschen
        </button>
      `;
      list.appendChild(row);
    });

  } catch(e) {
    list.innerHTML = `<div style="padding:16px; color:var(--red); font-size:0.85rem">${icon('x-circle',13,'margin-right:5px')} Fehler: ${escHtml(e.message)}</div>`;
    status.textContent = '';
  }
}

// Einzelnes Transkript löschen
async function deleteSingleTranscript(transcriptId) {
  const btn = document.getElementById(`cbtn-${transcriptId}`);
  if (btn) { btn.disabled = true; btn.innerHTML = icon('loader',12); }

  const result = await deleteFromAssemblyAI(transcriptId);

  if (result.ok) {
    const row = document.getElementById(`crow-${transcriptId}`);
    if (row) {
      row.innerHTML = `<div style="padding:8px 12px; color:var(--green); font-size:0.83rem">${icon('check-circle',13,'margin-right:4px')} Gelöscht</div>`;
    }
    const local = sessions.find(s => s.transcriptId === transcriptId);
    if (local) {
      local.transcriptId = null;
      saveSessions();
      saveToArchive(local).catch(() => {});
    }
    const remaining = document.querySelectorAll('[id^="cbtn-"]:not(:disabled)').length;
    if (remaining === 0) {
      document.getElementById('cleanupStatus').innerHTML = icon('check-circle',13,'margin-right:5px;color:var(--green)') + ' Alle Transkripte gelöscht';
      document.getElementById('cleanupDeleteAllBtn').style.display = 'none';
    }
  } else {
    if (btn) { btn.disabled = false; btn.innerHTML = icon('trash-2',12,'margin-right:4px') + ' Löschen'; }
    // Fehler direkt in der Zeile anzeigen
    const row = document.getElementById(`crow-${transcriptId}`);
    if (row) {
      const errDiv = row.querySelector('.delete-error') || document.createElement('div');
      errDiv.className = 'delete-error';
      errDiv.style.cssText = 'color:var(--red); font-size:0.72rem; margin-top:4px; padding:0 12px';
      errDiv.innerHTML = icon('x-circle',12,'margin-right:3px') + ' ' + escHtml(result.error || 'Unbekannter Fehler');
      row.appendChild(errDiv);
    }
    showToast('Fehler: ' + (result.error || 'Löschen fehlgeschlagen'), 'error');
  }
}

function openChangelogModal()  { document.getElementById('changelogModal').classList.add('open'); }
function closeChangelogModal() { document.getElementById('changelogModal').classList.remove('open'); }

function closeCleanupModal() {
  document.getElementById('cleanupModal').classList.remove('open');
}

// Alle auf einmal löschen
async function runCleanup() {
  const btn = document.getElementById('cleanupDeleteAllBtn');
  const ids = JSON.parse(btn.dataset.ids || '[]');
  if (ids.length === 0) return;
  btn.disabled = true;
  btn.innerHTML = icon('loader',12,'margin-right:5px') + ' Lösche alle…';
  let ok = 0, fail = 0;
  for (const id of ids) {
    const rowBtn = document.getElementById(`cbtn-${id}`);
    if (rowBtn && rowBtn.disabled) continue; // schon gelöscht
    const result = await deleteFromAssemblyAI(id);
    if (result.ok) {
      ok++;
      const row = document.getElementById(`crow-${id}`);
      if (row) row.innerHTML = `<div style="padding:8px 12px; color:var(--green); font-size:0.83rem">${icon('check-circle',13,'margin-right:4px')} Gelöscht</div>`;
      const local = sessions.find(s => s.transcriptId === id);
      if (local) { local.transcriptId = null; saveToArchive(local).catch(() => {}); }
    } else { fail++; }
  }
  saveSessions();
  document.getElementById('cleanupStatus').innerHTML =
    fail === 0 ? icon('check-circle',13,'margin-right:5px;color:var(--green)') + ` Alle ${ok} Transkripte gelöscht` : icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)') + ` ${ok} gelöscht, ${fail} fehlgeschlagen`;
  btn.style.display = 'none';
  showToast(`AssemblyAI: ${ok} gelöscht${fail ? ', ' + fail + ' fehlgeschlagen' : ''}.`, fail ? 'error' : 'success');
  if (fail === 0) setTimeout(() => closeCleanupModal(), 1800);
}
// ═══════════════════════════════════════════════════

// FILE HANDLING
// ═══════════════════════════════════════════════════
function applyFileDate(file) {
  // Dateidatum (lastModified) ins Datumsfeld übernehmen
  if (!file || !file.lastModified) return;
  const d = new Date(file.lastModified);
  const pad = n => String(n).padStart(2, '0');
  const el = document.getElementById('sessionDate');
  if (el) el.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) { applyFileDate(file); processFile(file); }
  event.target.value = '';
}

async function processFile(file) {
  if (!apiKey) {
    openApiModal();
    showToast('Bitte zuerst API-Key eingeben!', 'error');
    return;
  }

  const label = document.getElementById('sessionLabel').value.trim()
    || `Gespräch ${new Date().toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' })}`;
  const speakerA = ownerName || 'Ich';
  const _persons  = (document.getElementById('sessionPersons')?.value || '')
                      .split(',').map(p => p.trim()).filter(Boolean);
  const _type     = document.getElementById('sessionType')?.value || 'privat';
  const speakerB  = _persons[0] || (_type === 'arbeit' ? 'Kollege/Kollegin' : _type === 'gedanken' ? '' : 'Gesprächspartner/in');
  const dateInputVal = document.getElementById('sessionDate').value;
  const sessionDate = dateInputVal ? new Date(dateInputVal).toISOString() : new Date().toISOString();
  const sessionType    = document.getElementById('sessionType')?.value    || 'privat';
  const personsRaw     = document.getElementById('sessionPersons')?.value || '';
  const sessionPersons = personsRaw.split(',').map(p => p.trim()).filter(Boolean);

  const session = {
    id: Date.now().toString(),
    label,
    filename: file.name,
    speakerA,
    speakerB,
    type: sessionType,
    persons: sessionPersons,
    date: sessionDate,
    status: 'processing',
    utterances: [],
    transcriptId: null,
    duration: null,
  };
  sessions.unshift(session);
  saveSessions();
  currentSessionId = session.id;
  renderSessionsList();
  showProgress();

  try {
    // Schritt 1: Upload
    setProgress(15, 'Audiodatei wird hochgeladen…', icon('cloud',12,'margin-right:5px') + ' Upload zu AssemblyAI…');
    const uploadUrl = await uploadAudio(file);
    setProgress(35, 'Upload abgeschlossen', icon('check-circle',12,'margin-right:5px;color:var(--green)') + ' Upload erfolgreich\n' + icon('refresh-cw',12,'margin-right:5px') + ' Starte Transkription…');

    // Schritt 2: Transkription anfordern
    const transcriptId = await requestTranscription(uploadUrl);
    session.transcriptId = transcriptId;
    saveSessions();
    setProgress(50, 'Transkription läuft…', icon('check-circle',12,'margin-right:5px;color:var(--green)') + ` Job gestartet (ID: ${transcriptId})\n` + icon('loader',12,'margin-right:5px') + ' Warte auf Ergebnis…');

    // Schritt 3: Polling
    const result = await pollTranscription(transcriptId);
    setProgress(90, 'Verarbeitung abgeschlossen', icon('check-circle',12,'margin-right:5px;color:var(--green)') + ' Transkription fertig\n' + icon('file-text',12,'margin-right:5px') + ' Ergebnis wird geladen…');

    // Schritt 4: Ergebnis speichern
    session.utterances = result.utterances || [];
    session.status = 'done';
    session.duration = result.audio_duration;
    session.processedAt = new Date().toISOString(); // Zeitpunkt der Transkription
    // Tageskurs für den Aufnahmetag abrufen und speichern
    const rateDay = new Date(sessionDate).toISOString().slice(0, 10);
    const { rate: eurRate, date: eurRateDate } = await fetchExchangeRate(rateDay);
    session.usdToEur = eurRate;
    session.usdToEurDate = eurRateDate;
    saveSessions();
    setProgress(92, 'Archiviere…', icon('check-circle',12,'margin-right:5px;color:var(--green)') + ' Transkription fertig\n' + icon('save',12,'margin-right:5px') + ' Speichere ins Archiv…');

    // Schritt 5: Lokal archivieren (inkl. Audiodatei)
    const saved = await saveToArchive(session, file);
    setProgress(96, 'Lösche bei AssemblyAI…', saved
      ? icon('check-circle',12,'margin-right:5px;color:var(--green)') + ' Im Archiv-Ordner gespeichert\n' + icon('trash-2',12,'margin-right:5px') + ' Lösche bei AssemblyAI…'
      : icon('download',12,'margin-right:5px') + ' Als Download gespeichert\n' + icon('trash-2',12,'margin-right:5px') + ' Lösche bei AssemblyAI…');

    // Schritt 6: Bei AssemblyAI löschen
    const delResult = await deleteFromAssemblyAI(session.transcriptId);
    setProgress(100, 'Fertig!',
      icon('check-circle',12,'margin-right:5px;color:var(--green)') + ' Transkription abgeschlossen\n' +
      (saved ? icon('folder',12,'margin-right:5px') + ' In Google Drive gespeichert' : icon('download',12,'margin-right:5px') + ' Als Datei heruntergeladen') + '\n' +
      (delResult.ok ? icon('trash-2',12,'margin-right:5px') + ' Bei AssemblyAI gelöscht' : icon('alert-triangle',12,'margin-right:5px;color:var(--yellow)') + ' AssemblyAI-Löschung fehlgeschlagen (manuell löschen)')
    );

    setTimeout(() => {
      hideProgress();
      renderBrowser();
      showTranscript(session);
      resetForNewSession();
    }, 1500);

  } catch (err) {
    session.status = 'error';
    session.error = err.message;
    saveSessions();
    renderSessionsList();
    hideProgress();
    showErrorCard(err.message, session.label);
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════
// ASSEMBLYAI API
// ═══════════════════════════════════════════════════
async function uploadAudio(file) {
  let res;
  try {
    res = await fetch(`${assemblyBase()}/v2/upload`, {
      method: 'POST',
      headers: { 'authorization': apiKey, 'transfer-encoding': 'chunked' },
      body: file,
    });
  } catch (networkErr) {
    throw new Error(`Netzwerkfehler beim Upload – mögliche Ursache: CORS oder keine Internetverbindung. Details: ${networkErr.message}`);
  }
  if (res.status === 401) throw new Error('API-Key ungültig (401). Bitte überprüfe deinen AssemblyAI-Key.');
  if (res.status === 400) throw new Error('Ungültige Anfrage (400). Dateiformat möglicherweise nicht unterstützt.');
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch(e) {}
    throw new Error(`Upload fehlgeschlagen: HTTP ${res.status}. ${body}`);
  }
  const data = await res.json();
  return data.upload_url;
}

async function requestTranscription(audioUrl) {
  const body = {
    audio_url: audioUrl,
    speaker_labels: true,
    language_code: 'de',
    speech_models: ['universal-2'],
  };

  let res;
  try {
    res = await fetch(`${assemblyBase()}/v2/transcript`, {
      method: 'POST',
      headers: { 'authorization': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(`Netzwerkfehler beim Transkriptions-Start: ${networkErr.message}`);
  }

  // Immer Body lesen für detaillierte Fehlermeldung
  let responseData;
  try { responseData = await res.json(); } catch(e) { responseData = {}; }

  if (res.status === 401) throw new Error('API-Key ungültig (401). Bitte überprüfe deinen AssemblyAI-Key.');
  if (!res.ok) {
    const detail = responseData?.error || responseData?.message || JSON.stringify(responseData);
    throw new Error(`Transkription-Start fehlgeschlagen (HTTP ${res.status}): ${detail}`);
  }

  return responseData.id;
}

async function pollTranscription(transcriptId) {
  const url = `${assemblyBase()}/v2/transcript/${transcriptId}`;
  const headers = { 'authorization': apiKey };
  let attempts = 0;

  while (attempts < 120) {
    await sleep(5000);
    const res = await fetch(url, { headers });
    const data = await res.json();

    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error(data.error || 'Transkription fehlgeschlagen');

    attempts++;
    const progress = 50 + Math.min(35, attempts * 0.5);
    setProgress(progress, `Warte… (${attempts * 5}s)`, icon('loader',12,'margin-right:5px') + ` Status: ${data.status}\n` + icon('clock',12,'margin-right:5px') + ` Bisher ${attempts * 5} Sekunden gewartet…`);
  }
  throw new Error('Timeout – Transkription dauert zu lange');
}

// ═══════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════
function showProgress() {
  document.getElementById('progressCard').classList.add('visible');
  document.getElementById('transcriptCard').classList.remove('visible');
  document.getElementById('emptyState').style.display = 'none';
}
function hideProgress() {
  document.getElementById('progressCard').classList.remove('visible');
}

function setProgress(pct, step, log) {
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressStep').textContent = step;
  const logEl = document.getElementById('progressLog');
  logEl.innerHTML = log.replace(/\n/g, '<br>');
}

// ═══════════════════════════════════════════════════

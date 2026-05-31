// DRIVE SESSION MANAGEMENT
// ═══════════════════════════════════════════════════
async function saveToArchive(session, audioFile = null) {
  if (!driveToken || !driveFolderId) {
    showToast('Drive nicht verbunden – bitte anmelden', 'error'); return false;
  }
  const targetFolder = driveSubfolderId || driveFolderId;
  session.archiveFolder = driveSubfolderName || FOLDER_NAME;
  try {
    // Audio hochladen falls neu
    if (audioFile && !session._audioId) {
      setProgress(92, 'Audio wird zu Drive hochgeladen…', icon('cloud',12,'margin-right:5px') + ' Audiodatei wird hochgeladen…');
      const nameParts = (audioFile.name || 'aufnahme.webm').split('.');
      const ext = nameParts.length > 1 ? nameParts.pop() : 'webm';
      const audioName = safeFilename(session.label) + '_' + session.id + '.' + ext;
      session.audioFilename = audioName;
      const audioId = await driveUploadAudioResumable(audioName, audioFile,
        pct => setProgress(92 + Math.round(pct * 0.04), 'Audio hochladen…', icon('cloud',12,'margin-right:5px') + ` ${pct}% hochgeladen…`),
        targetFolder);
      session._audioId = audioId;
    }
    // JSON speichern / aktualisieren
    const filename = 'session_' + session.id + '.json';
    const result = await driveUploadJSON(filename, session, session._fileId || null, targetFolder);
    session._fileId = result.id || session._fileId;
    // Lokalen Cache aktualisieren
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.unshift(session);
    saveSessions();
    return true;
  } catch(e) {
    showToast('Speichern fehlgeschlagen: ' + e.message, 'error');
    return false;
  }
}

async function loadFromDrive() {
  if (!driveToken || !driveFolderId) return;
  try {
    // 1. Unterordner laden → ID→Name Mapping aufbauen
    const subfoldersRes = await driveGet('/files', {
      q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      spaces: 'drive',
    });
    const subfolders = subfoldersRes.files || [];
    // Mapping: Ordner-ID → Ordnername
    const folderIdToName = {};
    subfolders.forEach(f => { folderIdToName[f.id] = f.name; });
    folderIdToName[driveFolderId] = FOLDER_NAME; // Root-Ordner
    // rememberedFolders aktualisieren (für Unterordner-Auswahl)
    rememberedFolders = subfolders.map(f => ({ name: f.name, id: f.id }));
    renderSubfolderList(subfolders);

    // 2. Session-JSONs laden
    const res = await driveGet('/files', {
      q: `name contains 'session_' and name contains '.json' and trashed=false`,
      fields: 'files(id,name,modifiedTime,parents)',
      orderBy: 'modifiedTime desc',
      pageSize: '200',
      spaces: 'drive',
    });
    const files = res.files || [];
    const loaded = [];
    for (let i = 0; i < files.length; i += 5) {
      const batch = files.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(f => driveDownloadJSON(f.id).then(d => {
          // Echten Ordnernamen aus Drive-Parent ableiten (überschreibt JSON-Wert)
          const parentId = (f.parents || [])[0];
          const realFolder = folderIdToName[parentId] || d.archiveFolder || FOLDER_NAME;
          return { ...d, _fileId: f.id, archiveFolder: realFolder };
        }))
      );
      results.forEach(r => { if (r.status === 'fulfilled') loaded.push(r.value); });
    }

    // 3. Merge mit lokalem Cache
    loaded.forEach(driveSession => {
      const idx = sessions.findIndex(s => s.id === driveSession.id);
      if (idx >= 0) sessions[idx] = { ...sessions[idx], ...driveSession };
      else sessions.push(driveSession);
    });
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveSessions();
    updateFolderDropdown();
    renderBrowser();
    if (loaded.length > 0) showToast(`${loaded.length} Sitzung(en) aus Drive geladen`, 'success');
  } catch(e) {
    showToast('Drive laden fehlgeschlagen: ' + e.message, 'error');
  }
}

async function deleteSessionFromDrive(session) {
  if (!driveToken) return;
  try {
    if (session._fileId) await driveDeleteFile(session._fileId).catch(() => {});
    if (session._audioId) await driveDeleteFile(session._audioId).catch(() => {});
  } catch(e) { console.warn('Drive-Löschung fehlgeschlagen:', e); }
}

function autoDownloadSession(session) {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(session.label) + '_' + session.id + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Als Datei heruntergeladen.', 'success');
}

function buildArchiveTxt(session) {
  const lines = [
    `TRANSKRIPT: ${session.label}`,
    `Datum: ${new Date(session.date).toLocaleString('de-DE')}`,
    `Datei: ${session.filename}`,
    `Sprecher A = ${session.speakerA}  |  Sprecher B = ${session.speakerB}`,
    session.duration ? `Dauer: ${formatDuration(session.duration)}` : '',
    '',
    '─'.repeat(60),
    '',
    ...( session.utterances || []).map(u => {
      const name = getSpeakerName(u.speaker, session);
      return `[${formatMs(u.start)}]  ${name}:\n${u.text}\n`;
    })
  ];
  return lines.filter(l => l !== undefined).join('\n');
}

function safeFilename(str) {
  return str.replace(/[^a-z0-9äöüÄÖÜ\s\-]/gi, '').replace(/\s+/g, '_').substring(0, 60);
}

// ── Analyse-Item löschen ─────────────────────────────────────────────────
function deleteAnalysisItem(sessionId, analysisKey, field, idx) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.[analysisKey]?.[field]) return;
  s[analysisKey][field].splice(idx, 1);
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// ── Topic-Kuration (vereinfacht: nur noch löschen) ────────────────────────
function deleteTopic(sessionId, idx) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.claudeTopics) return;
  s.claudeTopics.splice(idx, 1);
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// ── Personen-Autocomplete ─────────────────────────────────────────────────
function getAllKnownPersonNames() {
  const names = new Set();
  sessions.forEach(s => (s.persons || []).forEach(p => { if (p.trim()) names.add(p.trim()); }));
  return [...names].sort((a, b) => a.localeCompare(b, 'de'));
}
function showPersonsAutocomplete(input) {
  const ac = document.getElementById('personsAutocomplete');
  if (!ac) return;
  const val = input.value;
  const lastComma = val.lastIndexOf(',');
  const token = (lastComma >= 0 ? val.slice(lastComma + 1) : val).trim().toLowerCase();
  if (!token) { ac.style.display = 'none'; return; }
  const known = getAllKnownPersonNames();
  const matches = known.filter(n => n.toLowerCase().startsWith(token) && !val.split(',').map(p=>p.trim().toLowerCase()).includes(n.toLowerCase()));
  if (matches.length === 0) { ac.style.display = 'none'; return; }
  ac.innerHTML = matches.map(n =>
    `<div class="persons-autocomplete-item" onmousedown="selectPersonSuggestion('${escHtml(n).replace(/'/g,"\\'")}')">
      ${escHtml(n)}</div>`).join('');
  ac.style.display = 'block';
}
function selectPersonSuggestion(name) {
  const input = document.getElementById('sessionPersons');
  if (!input) return;
  const val = input.value;
  const lastComma = val.lastIndexOf(',');
  input.value = (lastComma >= 0 ? val.slice(0, lastComma + 1) + ' ' : '') + name;
  hidePersonsAutocomplete();
  updateSpeakerSummary();
  input.focus();
}
function hidePersonsAutocomplete() {
  const ac = document.getElementById('personsAutocomplete');
  if (ac) ac.style.display = 'none';
}
function handlePersonsKey(e) {
  const ac = document.getElementById('personsAutocomplete');
  if (!ac || ac.style.display === 'none') return;
  if (e.key === 'Escape') { hidePersonsAutocomplete(); e.preventDefault(); }
}

// ── Personen löschen / verstecken ────────────────────────────────────────
function getHiddenPersons() {
  try { return JSON.parse(localStorage.getItem('hiddenPersons') || '[]'); } catch { return []; }
}
function deletePerson(name) {
  if (!confirm(`"${name}" ausblenden?\n\nDie Gesprächsdaten bleiben erhalten. Du kannst die Person durch Löschen aus dem localStorage wiederherstellen.`)) return;
  const hidden = getHiddenPersons();
  if (!hidden.includes(name)) { hidden.push(name); localStorage.setItem('hiddenPersons', JSON.stringify(hidden)); }
  renderPersonsView();
}
function deletePersonPermanently(name) {
  const affected = sessions.filter(s => (s.persons||[]).some(p => p.toLowerCase().trim() === name.toLowerCase().trim()));
  if (!confirm(`"${name}" endgültig löschen?\n\n${affected.length} Sitzung(en) sind betroffen. Der Name wird aus allen Sitzungsdaten entfernt.\n\nDies kann NICHT rückgängig gemacht werden.`)) return;
  sessions.forEach(s => {
    if (s.persons?.some(p => p.toLowerCase().trim() === name.toLowerCase().trim())) {
      s.persons = s.persons.filter(p => p.toLowerCase().trim() !== name.toLowerCase().trim());
      saveToArchive(s).catch(() => {});
    }
  });
  saveSessions();
  renderPersonsView();
}

// ── Speaker-Helfer: unterstützt A, B und beliebig viele weitere Sprecher ──
function getSpeakerName(speaker, session) {
  if (speaker === 'A') return session.speakerA || 'Sprecher A';
  if (speaker === 'B') return session.speakerB || 'Sprecher B';
  return `Sprecher ${speaker}`;
}
function getSpeakerColor(speaker) {
  const map = { A: 'var(--speaker-a)', B: 'var(--speaker-b)', C: 'var(--speaker-c)', D: 'var(--speaker-d)' };
  return map[speaker] || 'var(--speaker-extra)';
}

// ═══════════════════════════════════════════════════

// SITZUNG UMBENENNEN
// ═══════════════════════════════════════════════════
function startRename() {
  const s = getSession();
  if (!s) return;
  document.getElementById('titleDisplay').style.display = 'none';
  document.getElementById('titleEdit').style.display = 'block';
  const input = document.getElementById('titleInput');
  input.value = s.label;
  input.focus();
  input.select();
}
function cancelRename() {
  document.getElementById('titleDisplay').style.display = '';
  document.getElementById('titleEdit').style.display = 'none';
}
async function commitRename() {
  const s = getSession();
  if (!s) return;
  const newName = document.getElementById('titleInput').value.trim();
  if (!newName) return;
  s.label = newName;
  saveSessions();
  await saveToArchive(s);
  document.getElementById('transcriptTitle').textContent = newName;
  cancelRename();
  showToast(`Umbenannt zu „${newName}" ✓`, 'success');
}

// ═══════════════════════════════════════════════════
// DATUM BEARBEITEN
// ═══════════════════════════════════════════════════
function openDateEdit() {
  const s = getSession();
  if (!s) return;
  const row = document.getElementById('dateEditRow');
  const input = document.getElementById('sessionDateEdit');
  const pad = n => String(n).padStart(2, '0');
  const d = new Date(s.date);
  input.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  input.focus();
}
function closeDateEdit() {
  document.getElementById('dateEditRow').style.display = 'none';
}
async function commitDateEdit() {
  const s = getSession();
  if (!s) return;
  const val = document.getElementById('sessionDateEdit').value;
  if (!val) return;
  s.date = new Date(val).toISOString();
  saveSessions();
  await saveToArchive(s);
  // Meta-Zeile aktualisieren
  const dur = s.duration ? ` · ${formatDuration(s.duration)}` : '';
  document.getElementById('transcriptMeta').textContent =
    `${s.filename}${dur} · ${new Date(s.date).toLocaleString('de-DE')}`;
  closeDateEdit();
  renderBrowser();
  showToast('Datum aktualisiert', 'success');
}

// ═══════════════════════════════════════════════════

// SESSIONS LIST
// ═══════════════════════════════════════════════════
function renderSessionsList() {
  // Leitet jetzt auf den Browser um
  renderBrowser();
}

let pendingDeleteId = null;

function deleteSession(e, id) {
  e.stopPropagation();
  openDeleteModal(id);
}

function openDeleteModal(id) {
  const s = sessions.find(s => s.id === id);
  if (!s) return;
  pendingDeleteId = id;
  document.getElementById('deleteModalText').innerHTML =
    `<strong style="color:var(--text)">${escHtml(s.label)}</strong><br><br>` +
    `Diese Sitzung wird aus dem Dashboard entfernt. Die Archivdatei auf deiner Festplatte bleibt erhalten.`;
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
  pendingDeleteId = null;
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  const session = sessions.find(s => s.id === id);
  sessions = sessions.filter(s => s.id !== id);
  saveSessions();
  // Drive-Datei ebenfalls löschen – sonst taucht die Session beim nächsten Drive-Sync wieder auf
  if (session) deleteSessionFromDrive(session);
  if (currentSessionId === id) {
    currentSessionId = null;
    showBrowser();
  } else {
    renderBrowser();
  }
  showToast('Sitzung gelöscht', 'success');
}

// ═══════════════════════════════════════════════════
// PROJEKT-VERWALTUNG
// ═══════════════════════════════════════════════════

function genProjectId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function createProject({ name, color = '#6b7280', goalDescription = '', promptTemplateId = null } = {}) {
  if (!name?.trim()) return null;
  const proj = {
    id: genProjectId(),
    name: name.trim(),
    color,
    status: 'active',
    goalDescription,
    promptTemplateId,
    createdAt: new Date().toISOString(),
    builtin: false,
  };
  projects.unshift(proj);
  saveProjects();
  return proj;
}

function updateProject(id, changes = {}) {
  const proj = projects.find(p => p.id === id);
  if (!proj) return;
  const allowed = ['name', 'color', 'status', 'goalDescription', 'promptTemplateId'];
  allowed.forEach(k => { if (k in changes) proj[k] = changes[k]; });
  saveProjects();
  return proj;
}

function archiveProject(id) {
  return updateProject(id, { status: 'archived' });
}

function deleteProject(id) {
  const proj = projects.find(p => p.id === id);
  if (!proj || proj.builtin) { showToast('Dieses Projekt kann nicht gelöscht werden.', 'error'); return; }
  // Alle zugehörigen Sessions ins Allgemeine Projekt verschieben
  sessions.forEach(s => {
    if (s.projectId === id) { s.projectId = BUILTIN_PROJECT_ID; }
  });
  saveSessions();
  projects = projects.filter(p => p.id !== id);
  saveProjects();
}

function getProjectById(id) {
  return projects.find(p => p.id === id) || null;
}

// ── Projekt-Dropdown im Sitzungsdetail befüllen ───────────────────────────
function updateSessionProjectDropdown(session) {
  const sel = document.getElementById('sessionProjectSelect');
  if (!sel) return;
  sel.innerHTML = (projects || [])
    .filter(p => p.status !== 'archived')
    .map(p => `<option value="${p.id}"${p.id === (session.projectId || BUILTIN_PROJECT_ID) ? ' selected' : ''}>${escHtml(p.name)}</option>`)
    .join('');
}

// ── Projekt einer Sitzung ändern ──────────────────────────────────────────
async function changeSessionProject(projectId) {
  const s = sessions.find(x => x.id === currentSessionId);
  if (!s) return;
  s.projectId = projectId || BUILTIN_PROJECT_ID;
  saveSessions();
  await saveToArchive(s);
  renderBrowser();
  showToast('Projekt zugewiesen', 'success');
}

// ── Migration: bestehende Sessions ohne projectId → Allgemeines Projekt ──
function migrateSessionsToDefaultProject() {
  let changed = false;
  sessions.forEach(s => {
    if (!s.projectId) {
      s.projectId = BUILTIN_PROJECT_ID;
      changed = true;
    }
  });
  if (changed) saveSessions();
}

// ═══════════════════════════════════════════════════

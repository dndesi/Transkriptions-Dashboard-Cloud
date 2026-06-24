// ═══════════════════════════════════════════════════
// GOOGLE DRIVE API
// ═══════════════════════════════════════════════════

// v5.84: fetch mit AbortController-Timeout – verhindert ewig hängende Drive-Requests
function _fetchWithTimeout(url, options, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function driveGet(path, params = {}) {
  const url = new URL(DRIVE_API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // v5.84: 15s Timeout
  const r = await _fetchWithTimeout(url, { headers: { Authorization: 'Bearer ' + driveToken } });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Drive GET ' + r.status); }
  return r.json();
}

async function drivePost(path, body) {
  const r = await fetch(DRIVE_API + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + driveToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Drive POST ' + r.status); }
  return r.json();
}

async function driveDeleteFile(fileId) {
  const r = await fetch(DRIVE_API + '/files/' + fileId, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + driveToken }
  });
  if (!r.ok && r.status !== 204) throw new Error('Delete failed: ' + r.status);
}

async function ensureDriveFolder() {
  const cached = localStorage.getItem('drive_folder_id');
  if (cached) {
    try {
      const f = await driveGet('/files/' + cached, { fields: 'id,trashed' });
      if (!f.trashed) { driveFolderId = cached; return; }
    } catch(_) {}
    localStorage.removeItem('drive_folder_id');
  }
  const res = await driveGet('/files', {
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)', spaces: 'drive',
  });
  if (res.files?.length) {
    driveFolderId = res.files[0].id;
  } else {
    const f = await drivePost('/files', { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' });
    driveFolderId = f.id;
  }
  localStorage.setItem('drive_folder_id', driveFolderId);
}

async function driveUploadJSON(filename, data, existingId = null, parentId = null) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  if (existingId) {
    const r = await fetch(DRIVE_UPLOAD + '/files/' + existingId + '?uploadType=media', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + driveToken, 'Content-Type': 'application/json' },
      body: blob
    });
    if (!r.ok) throw new Error('JSON update failed: ' + r.status);
    return r.json();
  }
  return driveUploadMultipart(filename, blob, 'application/json', parentId);
}

async function driveUploadMultipart(name, blob, mime, parentId = null) {
  const boundary = 'dash__' + Date.now();
  const meta = JSON.stringify({ name, parents: [parentId || driveFolderId] });
  const head = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`]);
  const tail = new Blob([`\r\n--${boundary}--`]);
  const full = new Blob([head, blob, tail]);
  const r = await fetch(DRIVE_UPLOAD + '/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + driveToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: full
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Multipart failed: ' + r.status); }
  return r.json();
}

async function driveUploadAudioResumable(name, blob, onProgress, parentId = null) {
  const initR = await fetch(DRIVE_UPLOAD + '/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + driveToken,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': blob.type || 'audio/webm',
      'X-Upload-Content-Length': blob.size
    },
    body: JSON.stringify({ name, parents: [parentId || driveFolderId] })
  });
  if (!initR.ok) throw new Error('Resumable init failed: ' + initR.status);
  const uploadUrl = initR.headers.get('Location');

  const CHUNK = 5 * 1024 * 1024;
  let offset = 0, fileId = null;
  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK, blob.size);
    const chunk = blob.slice(offset, end);
    const r = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${offset}-${end-1}/${blob.size}`, 'Content-Type': blob.type || 'audio/webm' },
      body: chunk
    });
    if (r.status === 200 || r.status === 201) { fileId = (await r.json()).id; }
    else if (r.status !== 308) throw new Error('Chunk upload failed: ' + r.status);
    offset = end;
    if (onProgress) onProgress(Math.round(offset / blob.size * 100));
  }
  return fileId;
}

async function driveDownloadJSON(fileId) {
  // v5.84: 15s Timeout
  const r = await _fetchWithTimeout(DRIVE_API + '/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + driveToken }
  });
  if (!r.ok) throw new Error('JSON download failed: ' + r.status);
  return r.json();
}

async function driveDownloadBlob(fileId) {
  const r = await fetch(DRIVE_API + '/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + driveToken }
  });
  if (!r.ok) throw new Error('Blob download failed: ' + r.status);
  return r.blob();
}

function updateDriveStatus() {
  const dot  = document.getElementById('driveStatusDot');
  const text = document.getElementById('driveStatusText');
  const sec  = document.getElementById('driveSubfolderSection');
  // Import-Tab Status-Indikatoren
  const impDot  = document.getElementById('importDriveStatusDot');
  const impText = document.getElementById('importDriveStatusText');
  const impSec  = document.getElementById('importFolderSection');
  if (!dot) return;
  if (driveToken && driveFolderId) {
    dot.style.background = 'var(--green)';
    text.textContent = 'Verbunden – „' + FOLDER_NAME + '"';
    if (sec) sec.style.display = 'block';
    if (impDot)  impDot.style.background  = 'var(--green)';
    if (impText) impText.textContent = 'Verbunden – „' + FOLDER_NAME + '"';
    if (impSec)  impSec.style.display = 'block';
  } else {
    dot.style.background = 'var(--red)';
    text.textContent = driveToken ? 'Ordner wird vorbereitet…' : 'Nicht angemeldet';
    if (sec) sec.style.display = 'none';
    if (impDot)  impDot.style.background  = 'var(--red)';
    if (impText) impText.textContent = driveToken ? 'Ordner wird vorbereitet…' : 'Nicht angemeldet';
    if (impSec)  impSec.style.display = 'none';
  }
}


// ═══════════════════════════════════════════════════
// DRIVE UNTERORDNER
// ═══════════════════════════════════════════════════
async function loadDriveSubfolders() {
  if (!driveToken || !driveFolderId) return;
  try {
    const res = await driveGet('/files', {
      q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      orderBy: 'name',
      spaces: 'drive',
    });
    const folders = res.files || [];
    // rememberedFolders für Dropdown-Kompatibilität
    rememberedFolders = folders.map(f => ({ name: f.name, id: f.id }));
    renderSubfolderList(folders);
  } catch(e) {
    console.warn('Unterordner laden fehlgeschlagen:', e);
    if (typeof showToast === 'function') showToast('Unterordner konnten nicht geladen werden: ' + e.message, 'warning');
  }
}

function renderSubfolderList(folders) {
  _populateFolderSelect('driveSubfolderSelect', folders);
  _populateFolderSelect('importFolderSelect', folders);
  _populateFolderSelect('shareFolderSelect', folders);
}

// Befüllt ein <select>-Element mit Unterordnern
function _populateFolderSelect(selectId, folders) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">– Hauptordner –</option>';
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    if (f.id === driveSubfolderId) opt.selected = true;
    sel.appendChild(opt);
  });
  // Vorherige Auswahl erhalten falls noch vorhanden
  if (!driveSubfolderId && prev) sel.value = prev;
}

function onSubfolderSelectChange(sel) {
  const id   = sel.value;
  const name = id ? sel.options[sel.selectedIndex].text : '';
  driveSubfolderId   = id;
  driveSubfolderName = name;
  // Sync anderen Select
  const other = document.getElementById(sel.id === 'driveSubfolderSelect' ? 'importFolderSelect' : 'driveSubfolderSelect');
  if (other) other.value = id;
  updateFolderDropdown();
  checkUploadReady();
  if (name) showToast(`Ordner „${name}" ausgewählt`, 'success');
}

function onImportFolderSelectChange(sel) {
  onSubfolderSelectChange(sel);
}

function selectDriveSubfolder(id, name) {
  driveSubfolderId = id;
  driveSubfolderName = name;
  // Beide Selects synchronisieren
  const selA = document.getElementById('driveSubfolderSelect');
  const selB = document.getElementById('importFolderSelect');
  const selC = document.getElementById('shareFolderSelect');
  if (selA) selA.value = id;
  if (selB) selB.value = id;
  if (selC) selC.value = id;
  updateFolderDropdown();
  checkUploadReady();
  showToast(`Ordner „${name}" ausgewählt`, 'success');
}

async function createDriveSubfolder() {
  const name = prompt('Name für den neuen Unterordner:');
  if (!name || !name.trim()) return;
  try {
    const f = await drivePost('/files', {
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [driveFolderId]
    });
    selectDriveSubfolder(f.id, name.trim());
    await loadDriveSubfolders();
    showToast(`Ordner „${name.trim()}" angelegt`, 'success');
  } catch(e) {
    showToast('Anlegen fehlgeschlagen: ' + e.message, 'error');
  }
}

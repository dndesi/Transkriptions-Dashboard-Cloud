// ═══════════════════════════════════════════════════
// LADE-OVERLAY (v5.18)
// ═══════════════════════════════════════════════════
let _loadingTimeout = null;

function updateLoadingScreen(pct, msg) {
  const bar    = document.getElementById('loadingBar');
  const status = document.getElementById('loadingStatus');
  if (bar)    bar.style.width = pct + '%';
  if (status) status.textContent = msg;
}

function hideLoadingScreen() {
  clearTimeout(_loadingTimeout);
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 420);
}

function initLoadingScreen() {
  updateLoadingScreen(5, 'Verbindung zu Drive wird aufgebaut…');
  // v5.84: Timeout auf 20s erhöht (viele Sessions brauchen länger als 8s)
  _loadingTimeout = setTimeout(() => {
    updateLoadingScreen(100, 'Zeitüberschreitung – lokale Daten werden verwendet');
    setTimeout(() => hideLoadingScreen(), 1200);
  }, 20000);
}

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
      session.audioUploadedAt = Date.now();
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

    updateLoadingScreen(20, 'Sitzungen werden geladen…');
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
    const validProjectIds = new Set((projects || []).map(p => p.id));
    loaded.forEach(driveSession => {
      // Ungültige projectId aus Drive nicht übernehmen
      if (driveSession.projectId && !validProjectIds.has(driveSession.projectId)) {
        driveSession.projectId = BUILTIN_PROJECT_ID;
      }
      const idx = sessions.findIndex(s => s.id === driveSession.id);
      if (idx >= 0) sessions[idx] = { ...sessions[idx], ...driveSession };
      else sessions.push(driveSession);
    });
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveSessions();
    updateFolderDropdown();
    renderBrowser();
    updateLoadingScreen(55, `${loaded.length} Sitzung(en) geladen ✓ – Einstellungen werden geladen…`);
    if (loaded.length > 0) showToast(`${loaded.length} Sitzung(en) aus Drive geladen`, 'success');

    // Settings laden (Projekte, Prompts, Beziehungskontext) – v4.92
    await loadSettingsFromDrive();
    // Audio Auto-Delete prüfen – v5.1
    checkAndDeleteExpiredAudio().catch(() => {});
  } catch(e) {
    showToast('Drive laden fehlgeschlagen: ' + e.message, 'error');
    // v5.84: Settings (Prompts, Projekte) trotzdem laden – auch wenn Sessions fehlschlugen
    await loadSettingsFromDrive().catch(err => console.warn('[settings fallback]', err.message));
  }
}

// ── Audio Auto-Delete (v5.1) ─────────────────────────────────────────────────
async function checkAndDeleteExpiredAudio() {
  const days = parseInt(localStorage.getItem('audioRetentionDays') ?? '14');
  if (days === 0) return; // 0 = niemals löschen
  if (!driveToken) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const expired = sessions.filter(s => s._audioId && s.audioUploadedAt && s.audioUploadedAt < cutoff);
  if (expired.length === 0) return;
  let deleted = 0;
  for (const s of expired) {
    try {
      await driveDeleteFile(s._audioId).catch(() => {});
      s._audioId = null;
      s.audioFilename = null;
      s.audioUploadedAt = null;
      // Session-JSON in Drive aktualisieren
      if (s._fileId) {
        const fname = 'session_' + s.id + '.json';
        await driveUploadJSON(fname, s, s._fileId, driveFolderId).catch(() => {});
      }
      deleted++;
    } catch(e) { /* silent */ }
  }
  if (deleted > 0) {
    saveSessions();
    showToast(`${deleted} Audio-Datei${deleted > 1 ? 'en' : ''} automatisch gelöscht (${days}-Tage-Aufbewahrung)`, 'info');
  }
}

// ── Settings-Sync via Drive (v4.92) ──────────────────────────────────────────
// Eine einzige Datei „distill_settings.json" speichert:
// Projekte, eigene Prompts, bearbeitete Systemprompts, Beziehungskontext

let _settingsFileId = null; // Drive-File-ID für distill_settings.json
let _settingsSaveTimer = null;

// Verzögertes Speichern (2 s Debounce) — verhindert zu viele Drive-Requests
function queueSettingsSave() {
  clearTimeout(_settingsSaveTimer);
  _settingsSaveTimer = setTimeout(() => saveSettingsToDrive(), 2000);
}

async function saveSettingsToDrive() {
  if (!driveToken || !driveFolderId) return;
  try {
    // v5.18: Race-Condition fix – _settingsFileId erst per Search ermitteln wenn noch unbekannt
    if (!_settingsFileId) {
      const searchRes = await driveGet('/files', {
        q: `name='distill_settings.json' and '${driveFolderId}' in parents and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
      });
      const found = (searchRes.files || []);
      if (found.length > 0) _settingsFileId = found[0].id;
    }
    const data = {
      version: 2,  // v5.22: userPrompts statt customPrompts+editablePrompts
      savedAt: new Date().toISOString(),
      projects: (typeof projects !== 'undefined') ? projects : [],
      // v5.22: Unified Storage (neues Format)
      userPrompts: (typeof getUserPrompts === 'function') ? getUserPrompts() : { custom: [], editableOverrides: {} },
      // Legacy-Felder für ältere Versionen (Fallback beim Laden)
      customPrompts: (typeof getCustomPrompts === 'function') ? getCustomPrompts() : [],
      editablePrompts: (typeof getEditablePrompts === 'function') ? getEditablePrompts() : {},
      personRelationships: (() => {
        try { return JSON.parse(localStorage.getItem('personRelationships') || '{}'); } catch { return {}; }
      })(),
      contacts: (typeof contacts !== 'undefined') ? contacts : [],
    };
    const result = await driveUploadJSON(
      'distill_settings.json', data, _settingsFileId || null, driveFolderId
    );
    _settingsFileId = result?.id || _settingsFileId;
  } catch(e) {
    console.warn('[settings] Drive-Sync fehlgeschlagen:', e.message);
  }
}

async function loadSettingsFromDrive() {
  if (!driveToken || !driveFolderId) return;
  // v5.85: Ausstehenden Debounce-Save sofort flushen – verhindert dass frisch erstellte
  // Prompts/Projekte von alten Drive-Daten überschrieben werden (Race Condition)
  if (_settingsSaveTimer) {
    clearTimeout(_settingsSaveTimer);
    _settingsSaveTimer = null;
    await saveSettingsToDrive().catch(() => {});
  }
  try {
    // Datei suchen
    const res = await driveGet('/files', {
      q: `name='distill_settings.json' and '${driveFolderId}' in parents and trashed=false`,
      fields: 'files(id,modifiedTime)',
      spaces: 'drive',
    });
    const files = res.files || [];

    if (!files.length) {
      // Noch keine Settings-Datei → aktuellen lokalen Stand hochladen
      await saveSettingsToDrive();
      return;
    }

    _settingsFileId = files[0].id;
    const data = await driveDownloadJSON(_settingsFileId);
    if (!data || typeof data !== 'object') return;

    // ── Projekte: Drive ist autoritativ (v4.95 – gelöschte Projekte bleiben gelöscht) ──
    // Lokal-only Projekte werden NICHT mehr hinzugefügt – Drive gewinnt.
    // saveProjects() lädt sofort hoch, daher sollten neue Projekte schon in Drive sein.
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      projects = data.projects.map(dp => {
        const local = (projects || []).find(p => p.id === dp.id);
        return local ? { ...dp, builtin: local.builtin ?? dp.builtin } : dp;
      });
      // Builtin-Projekt immer vorne sicherstellen
      if (typeof BUILTIN_PROJECT_ID !== 'undefined') {
        if (!projects.find(p => p.id === BUILTIN_PROJECT_ID)) {
          projects.unshift(_defaultProjects()[0]);
        } else {
          const bi = projects.find(p => p.id === BUILTIN_PROJECT_ID);
          projects = [bi, ...projects.filter(p => p.id !== BUILTIN_PROJECT_ID)];
        }
      }
      // skipDriveSync=true: kein Re-Upload direkt nach Download (v4.94)
      await saveProjects({ skipDriveSync: true });
      if (typeof renderBrowser === 'function') renderBrowser();
      if (typeof updateProjectBadge === 'function') updateProjectBadge();
      // Projekt-Browser aktualisieren falls er gerade geöffnet ist (v4.99)
      const pvEl = document.getElementById('projectsView');
      if (pvEl && pvEl.style.display !== 'none' && typeof renderProjectBrowser === 'function') {
        renderProjectBrowser();
      }
      const newCount = projects.length - 1; // minus Builtin
      updateLoadingScreen(75, `${newCount} Projekt(e) geladen ✓ – Prompts werden geladen…`);
      if (newCount > 0) showToast(`${projects.length} Projekte aus Drive geladen ✓`, 'success');
    }

    // ── Prompts: v5.22 userPrompts (unified) oder Legacy-Fallback ──────────────
    // v5.86: Merge-Strategie – Drive + lokale Prompts werden vereint (nicht überschrieben)
    const _refreshPromptsUI = (count) => {
      updateLoadingScreen(90, `${count} Prompt(s) geladen ✓`);
      if (typeof populatePersonaSelects === 'function') populatePersonaSelects();
      const pvpEl = document.getElementById('promptsView');
      if (pvpEl && pvpEl.style.display !== 'none' && typeof renderPromptsView === 'function') {
        renderPromptsView();
      }
    };

    if (data.userPrompts && typeof data.userPrompts === 'object') {
      // v5.86: Merge statt Überschreiben – lokale Prompts die Drive nicht kennt bleiben erhalten
      // Vorher: Drive gewinnt komplett → frisch erstellte Prompts wurden gelöscht (Race Condition)
      if (typeof getUserPrompts === 'function' && typeof saveUserPrompts === 'function') {
        const driveUp  = data.userPrompts;
        const localUp  = getUserPrompts();
        // custom: Drive-Prompts + alle lokalen Prompts deren ID Drive nicht kennt
        const driveIds = new Set((driveUp.custom || []).map(p => p.id));
        const localOnly = (localUp.custom || []).filter(p => p.id && !driveIds.has(p.id));
        const merged = {
          custom: [...(driveUp.custom || []), ...localOnly],
          // editableOverrides: lokal hat Priorität (User hat aktiv bearbeitet)
          editableOverrides: { ...(driveUp.editableOverrides || {}), ...(localUp.editableOverrides || {}) },
        };
        saveUserPrompts(merged);
        _refreshPromptsUI(merged.custom.length);
      }

    } else {
      // Legacy-Fallback: alte customPrompts + editablePrompts Felder lesen
      if (Array.isArray(data.customPrompts) && typeof getUserPrompts === 'function') {
        const up = getUserPrompts();
        // v5.86: auch hier Merge – lokale Prompts behalten
        const driveIds = new Set(data.customPrompts.map(p => p.id));
        const localOnly = (up.custom || []).filter(p => p.id && !driveIds.has(p.id));
        up.custom = [...data.customPrompts, ...localOnly];
        // editablePrompts zusammenführen: Drive + lokal (lokal hat Priorität)
        if (data.editablePrompts && typeof data.editablePrompts === 'object') {
          up.editableOverrides = { ...data.editablePrompts, ...up.editableOverrides };
        }
        if (typeof saveUserPrompts === 'function') saveUserPrompts(up);
        _refreshPromptsUI(data.customPrompts.length);
      }
    }

    // ── Beziehungskontext: zusammenführen (lokal hat Priorität) ──
    if (data.personRelationships && typeof data.personRelationships === 'object') {
      const local = (() => {
        try { return JSON.parse(localStorage.getItem('personRelationships') || '{}'); } catch { return {}; }
      })();
      const merged = { ...data.personRelationships, ...local };
      localStorage.setItem('personRelationships', JSON.stringify(merged));
    }

    // ── Contacts (v5.42) ──────────────────────────────────────────────────────
    if (Array.isArray(data.contacts) && data.contacts.length > 0) {
      if (typeof contacts !== 'undefined') {
        contacts = data.contacts;
        if (typeof saveContacts === 'function') saveContacts();
        const cvEl = document.getElementById('contactsView');
        if (cvEl && cvEl.style.display !== 'none' && typeof renderContactsView === 'function') {
          renderContactsView();
        }
      }
    }

    updateLoadingScreen(100, 'Alles geladen ✓');
    console.log('[settings] Von Drive geladen ✓');
    setTimeout(() => hideLoadingScreen(), 600);
  } catch(e) {
    console.warn('[settings] Laden von Drive fehlgeschlagen:', e.message);
    hideLoadingScreen(); // auch bei Fehler freigeben
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
// ── Analyse-Items bearbeiten ──────────────────────────────────────────────

// Listeneintrag bearbeiten (inline textarea statt Text)
function editAnalysisItem(sessionId, analysisKey, field, idx) {
  const itemEl = document.querySelector(
    `[data-edit-key="${analysisKey}"][data-edit-field="${field}"][data-edit-idx="${idx}"]`
  );
  if (!itemEl) return;
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.[analysisKey]?.[field]) return;
  const raw = s[analysisKey][field][idx];
  const current = typeof raw === 'object' ? (raw.wish || raw.task || JSON.stringify(raw)) : raw;
  itemEl.innerHTML = `
    <textarea style="width:100%;min-height:52px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:6px 8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveAnalysisItem('${sessionId}','${analysisKey}','${field}',${idx},this.value)}"
      >${current.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="saveAnalysisItem('${sessionId}','${analysisKey}','${field}',${idx},this.closest('[data-edit-key]').querySelector('textarea').value)">✓ Speichern</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="renderInsights(sessions.find(x=>x.id==='${sessionId}'))">✕</button>
    </div>`;
}

function saveAnalysisItem(sessionId, analysisKey, field, idx, value) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.[analysisKey]?.[field]) return;
  const val = value.trim();
  if (!val) return;
  const raw = s[analysisKey][field][idx];
  if (typeof raw === 'object') {
    // z.B. wishes { person, wish } oder tasks { task, ... }
    if ('wish'  in raw) raw.wish  = val;
    else if ('task' in raw) raw.task = val;
    else s[analysisKey][field][idx] = val;
  } else {
    s[analysisKey][field][idx] = val;
  }
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// Textfeld bearbeiten (summary, dynamics, zwischenzeilen)
function editAnalysisField(sessionId, analysisKey, field) {
  const el = document.querySelector(`[data-textfield="${analysisKey}-${field}"]`);
  if (!el) return;
  const s = sessions.find(x => x.id === sessionId);
  const current = s?.[analysisKey]?.[field] || '';
  el.innerHTML = `
    <textarea style="width:100%;min-height:72px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&event.ctrlKey){saveAnalysisField('${sessionId}','${analysisKey}','${field}',this.value)}"
      >${current.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="saveAnalysisField('${sessionId}','${analysisKey}','${field}',this.closest('[data-textfield]').querySelector('textarea').value)">✓ Speichern</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="renderInsights(sessions.find(x=>x.id==='${sessionId}'))">✕</button>
    </div>`;
}

function saveAnalysisField(sessionId, analysisKey, field, value) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s) return;
  if (!s[analysisKey]) s[analysisKey] = {};
  s[analysisKey][field] = value.trim();
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// Neuen Listeneintrag hinzufügen
function addAnalysisItem(sessionId, analysisKey, field) {
  const containerId = `add-input-${analysisKey}-${field}`;
  const existing = document.getElementById(containerId);
  if (existing) { existing.querySelector('textarea')?.focus(); return; }
  const sectionEl = document.querySelector(`[data-section="${analysisKey}-${field}"]`);
  if (!sectionEl) return;
  const div = document.createElement('div');
  div.id = containerId;
  div.style.cssText = 'margin-top:6px;';
  div.innerHTML = `
    <textarea placeholder="Neuer Eintrag …" style="width:100%;min-height:52px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:6px 8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();confirmAddAnalysisItem('${sessionId}','${analysisKey}','${field}',this.value)}"></textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="confirmAddAnalysisItem('${sessionId}','${analysisKey}','${field}',this.closest('#${containerId}').querySelector('textarea').value)">✓ Hinzufügen</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="document.getElementById('${containerId}').remove()">✕</button>
    </div>`;
  sectionEl.appendChild(div);
  div.querySelector('textarea').focus();
}

function confirmAddAnalysisItem(sessionId, analysisKey, field, value) {
  const val = value.trim();
  if (!val) return;
  const s = sessions.find(x => x.id === sessionId);
  if (!s) return;
  if (!s[analysisKey]) s[analysisKey] = {};
  if (!Array.isArray(s[analysisKey][field])) s[analysisKey][field] = [];
  s[analysisKey][field].push(val);
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// ── Custom Result Items bearbeiten ───────────────────────────────────────

function _getCustomResult(sessionId, promptId) {
  const s = sessions.find(x => x.id === sessionId);
  return s?.customResults?.[promptId] || null;
}

function _saveCustomResult(sessionId) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s) return;
  saveSessions();
  saveToArchive(s).catch(() => {});
  renderInsights(s);
}

// Textfeld (type: text) inline bearbeiten
function editCustomResultField(sessionId, promptId, field) {
  const el = document.querySelector(`[data-custom-textfield="${promptId}-${field}"]`);
  if (!el) return;
  const res = _getCustomResult(sessionId, promptId);
  const current = res?.structured?.[field] || '';
  el.innerHTML = `
    <textarea style="width:100%;min-height:72px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&event.ctrlKey){saveCustomResultField('${sessionId}','${promptId}','${field}',this.value)}"
      >${escHtml ? escHtml(String(current)) : current.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="saveCustomResultField('${sessionId}','${promptId}','${field}',this.closest('[data-custom-textfield]').querySelector('textarea').value)">✓ Speichern</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="renderInsights(sessions.find(x=>x.id==='${sessionId}'))">✕</button>
    </div>`;
}

function saveCustomResultField(sessionId, promptId, field, value) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.customResults?.[promptId]?.structured) return;
  s.customResults[promptId].structured[field] = value.trim();
  _saveCustomResult(sessionId);
}

// Listeneintrag bearbeiten
function editCustomResultItem(sessionId, promptId, field, idx) {
  const el = document.querySelector(`[data-custom-item="${promptId}-${field}-${idx}"]`);
  if (!el) return;
  const res = _getCustomResult(sessionId, promptId);
  const raw = res?.structured?.[field]?.[idx];
  const current = typeof raw === 'object' ? (raw.text || raw.wish || JSON.stringify(raw)) : String(raw || '');
  el.innerHTML = `
    <textarea style="width:100%;min-height:48px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:6px 8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveCustomResultItem('${sessionId}','${promptId}','${field}',${idx},this.value)}"
      >${current.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="saveCustomResultItem('${sessionId}','${promptId}','${field}',${idx},this.closest('[data-custom-item]').querySelector('textarea').value)">✓</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="renderInsights(sessions.find(x=>x.id==='${sessionId}'))">✕</button>
    </div>`;
}

function saveCustomResultItem(sessionId, promptId, field, idx, value) {
  const s = sessions.find(x => x.id === sessionId);
  const arr = s?.customResults?.[promptId]?.structured?.[field];
  if (!Array.isArray(arr)) return;
  const val = value.trim();
  if (!val) return;
  const raw = arr[idx];
  if (typeof raw === 'object' && raw !== null) {
    if ('text' in raw) raw.text = val;
    else arr[idx] = val;
  } else {
    arr[idx] = val;
  }
  _saveCustomResult(sessionId);
}

// Listeneintrag löschen
function deleteCustomResultItem(sessionId, promptId, field, idx) {
  const s = sessions.find(x => x.id === sessionId);
  const arr = s?.customResults?.[promptId]?.structured?.[field];
  if (!Array.isArray(arr)) return;
  arr.splice(idx, 1);
  _saveCustomResult(sessionId);
}

// Checkbox-Eintrag abhaken
function toggleCustomCheckItem(sessionId, promptId, field, idx, checked) {
  const s = sessions.find(x => x.id === sessionId);
  const arr = s?.customResults?.[promptId]?.structured?.[field];
  if (!Array.isArray(arr)) return;
  const raw = arr[idx];
  if (typeof raw === 'object' && raw !== null) {
    raw.done = checked;
  } else {
    arr[idx] = { text: String(raw), done: checked };
  }
  saveSessions();
  saveToArchive(s).catch(() => {});
  // Nur Styling updaten ohne neu zu rendern
  const el = document.querySelector(`[data-custom-item="${promptId}-${field}-${idx}"]`);
  if (el) el.style.cssText = checked ? 'opacity:0.5;text-decoration:line-through' : '';
}

// Neuen Listeneintrag hinzufügen
function addCustomResultItem(sessionId, promptId, field) {
  const containerId = `add-custom-${promptId}-${field}`;
  const existing = document.getElementById(containerId);
  if (existing) { existing.querySelector('textarea')?.focus(); return; }
  const sectionEl = document.querySelector(`[data-custom-section="${promptId}-${field}"]`);
  if (!sectionEl) return;
  const div = document.createElement('div');
  div.id = containerId;
  div.style.cssText = 'margin-top:6px;';
  div.innerHTML = `
    <textarea placeholder="Neuer Eintrag …" style="width:100%;min-height:48px;background:var(--bg2);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:6px 8px;font-size:0.85rem;resize:vertical;box-sizing:border-box"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();confirmAddCustomResultItem('${sessionId}','${promptId}','${field}',this.value)}"></textarea>
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="work-item-del" style="padding:2px 10px;border-radius:5px;background:var(--accent);color:#fff;font-size:0.78rem"
        onclick="confirmAddCustomResultItem('${sessionId}','${promptId}','${field}',this.closest('#${containerId}').querySelector('textarea').value)">✓ Hinzufügen</button>
      <button class="work-item-del" style="padding:2px 8px;border-radius:5px;font-size:0.78rem"
        onclick="document.getElementById('${containerId}').remove()">✕</button>
    </div>`;
  sectionEl.appendChild(div);
  div.querySelector('textarea').focus();
}

function confirmAddCustomResultItem(sessionId, promptId, field, value) {
  const val = value.trim();
  if (!val) return;
  const s = sessions.find(x => x.id === sessionId);
  if (!s?.customResults?.[promptId]?.structured) return;
  const arr = s.customResults[promptId].structured[field];
  if (Array.isArray(arr)) arr.push(val);
  else s.customResults[promptId].structured[field] = [val];
  _saveCustomResult(sessionId);
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
  // Multi-Sprecher (Samsung Import): speakers-Array hat Vorrang
  if (session && session.speakers && session.speakers.length > 0) {
    const sp = session.speakers.find(s => s.id === speaker);
    if (sp) return sp.name || sp.label || `Sprecher ${speaker}`;
  }
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
    kontaktId: null,
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
  const allowed = ['name', 'color', 'status', 'goalDescription', 'promptTemplateId', 'kontaktId'];
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
  // Alle zugehörigen Sessions ins Allgemeine Projekt verschieben + auf Drive speichern
  const affected = [];
  sessions.forEach(s => {
    if (s.projectId === id) {
      s.projectId = BUILTIN_PROJECT_ID;
      affected.push(s);
    }
  });
  saveSessions();
  // Drive-Sync für betroffene Sessions (async, nicht blockierend)
  affected.forEach(s => saveToArchive(s).catch(() => {}));
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

  // Defensiv: wenn projectId auf nicht-existierendes Projekt zeigt → korrigieren
  const validIds = new Set((projects || []).map(p => p.id));
  if (session.projectId && !validIds.has(session.projectId)) {
    session.projectId = BUILTIN_PROJECT_ID;
    saveSessions();
    saveToArchive(session).catch(() => {});
  }

  const currentId = session.projectId || BUILTIN_PROJECT_ID;
  sel.innerHTML = (projects || [])
    .filter(p => p.status !== 'archived')
    .map(p => `<option value="${p.id}"${p.id === currentId ? ' selected' : ''}>${escHtml(p.name)}</option>`)
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
  const affected = [];
  sessions.forEach(s => {
    if (!s.projectId) {
      s.projectId = BUILTIN_PROJECT_ID;
      affected.push(s);
    }
  });
  if (affected.length) {
    saveSessions();
    // Drive-Sync: betroffene Sessions aktualisieren damit projectId nicht beim nächsten Sync verloren geht
    affected.forEach(s => saveToArchive(s).catch(() => {}));
  }
}

// ═══════════════════════════════════════════════════
// CHAT-GEDANKEN (v5.97)
// ═══════════════════════════════════════════════════

let _chatGedankenExpanded = new Set();

function toggleChatGedanke(idx) {
  if (_chatGedankenExpanded.has(idx)) {
    _chatGedankenExpanded.delete(idx);
  } else {
    _chatGedankenExpanded.add(idx);
  }
  const session = (typeof getSession === 'function') ? getSession() : null;
  if (session) renderChatGedanken(session);
}

function renderChatGedanken(session) {
  const container = document.getElementById('sdc-panel-chatgedanken');
  if (!container) return;
  const items = session?.chatGedanken || [];
  if (!items.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px 16px;font-size:0.85rem">
      Noch keine Chat-Gedanken gespeichert.<br>
      <span style="font-size:0.78rem;opacity:0.7">Klicke „Merken" in einem Chat um eine Antwort hier zu speichern.</span>
    </div>`;
    return;
  }
  container.innerHTML = items.map((item, i) => {
    const isAnalyse = item.source === 'analyse';
    const badgeColor = isAnalyse ? 'var(--accent)' : '#10b981';
    const badgeBg   = isAnalyse ? 'rgba(108,99,255,0.12)' : 'rgba(16,185,129,0.12)';
    const badgeLabel = isAnalyse ? 'Analyse-Chat' : 'Gesprächs-Chat';
    const date = item.ts ? new Date(item.ts).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
    const expanded = _chatGedankenExpanded.has(i);

    // Teaser: erste 120 Zeichen, Markdown-Syntax entfernen
    const rawAnswer = (item.answer || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^#{2,3}\s+/gm, '');
    const teaser = rawAnswer.length > 120 ? rawAnswer.slice(0, 120).trimEnd() + ' …' : rawAnswer;

    // Vollständige Antwort mit Markdown-Rendering
    const isRoundtable = Array.isArray(item.roles) && item.roles.length >= 2;
    const fullAnswerHtml = (typeof _renderRoundtableAnswer === 'function' && isRoundtable)
      ? _renderRoundtableAnswer(item.answer, item.roles)
      : (typeof _parseMarkdown === 'function' ? _parseMarkdown(item.answer) : escHtml(item.answer || ''));

    const chevron = expanded ? 'chevron-up' : 'chevron-down';

    return `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:0.68rem;font-weight:600;padding:2px 8px;border-radius:99px;color:${badgeColor};background:${badgeBg}">${badgeLabel}</span>
          <span style="font-size:0.68rem;color:var(--muted)">${date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <button onclick="deleteChatGedanke('${session.id}', ${i})"
            style="background:none;border:none;cursor:pointer;color:var(--muted);padding:2px 4px;display:inline-flex;align-items:center"
            title="Löschen">
            ${icon('trash-2', 13, 'pointer-events:none')}
          </button>
        </div>
      </div>
      <div onclick="toggleChatGedanke(${i})" style="cursor:pointer">
        ${item.question ? `<div style="font-size:0.8rem;font-weight:600;color:var(--text);margin-bottom:5px;line-height:1.4">${escHtml(item.question)}</div>` : ''}
        ${expanded
          ? `<div style="font-size:0.88rem;line-height:1.6;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">${fullAnswerHtml}</div>`
          : `<div style="font-size:0.8rem;color:var(--muted);line-height:1.5;display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
               <span>${escHtml(teaser)}</span>
               <span style="flex-shrink:0;color:var(--accent);display:inline-flex">${icon(chevron, 13, 'pointer-events:none')}</span>
             </div>`
        }
      </div>
    </div>`;
  }).join('');
}

function deleteChatGedanke(sessionId, idx) {
  const session = getSession(sessionId);
  if (!session?.chatGedanken) return;
  session.chatGedanken.splice(idx, 1);
  saveSessions();
  renderChatGedanken(session);
  showToast('Chat-Gedanke gelöscht', 'info');
}

// ═══════════════════════════════════════════════════

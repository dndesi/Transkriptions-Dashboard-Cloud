// ═══════════════════════════════════════════════════
// FOTOS – Upload, Drive-Sync, Analyse  (v5.60)
// ═══════════════════════════════════════════════════

// ── Foto-Prompts aus Promptdatenbank ─────────────
// v5.60: Built-in (gefiltert nach hiddenFotoPrompts) + eigene (category:'foto')
function getPhotoPrompts() {
  var hidden = [];
  try { hidden = JSON.parse(localStorage.getItem('hiddenFotoPrompts') || '[]'); } catch(e) {}

  var builtIn = [];
  if (typeof EDITABLE_PROMPT_DEFAULTS !== 'undefined') {
    builtIn = EDITABLE_PROMPT_DEFAULTS
      .filter(function(p) { return p.category === 'foto' && hidden.indexOf(p.id) === -1; })
      .map(function(p) {
        return {
          id:     p.id,
          label:  p.name,
          prompt: (typeof getEditablePromptText === 'function')
            ? (getEditablePromptText(p.id) || p.prompt)
            : p.prompt
        };
      });
  }

  var custom = [];
  if (typeof getCustomPrompts === 'function') {
    custom = getCustomPrompts()
      .filter(function(p) { return p.category === 'foto'; })
      .map(function(p) {
        return {
          id:     p.id,
          label:  p.name,
          prompt: (typeof assemblePromptText === 'function')
            ? assemblePromptText(p)
            : (p.kontext || p.prompt || '')
        };
      });
  }

  return builtIn.concat(custom);
}

// ── Bild komprimieren: max 1200px, JPEG 0.75 ─────
function _resizePhoto(file, maxPx, quality) {
  maxPx   = maxPx   || 1200;
  quality = quality || 0.75;
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var w = img.width;
      var h = img.height;
      if (w > maxPx || h > maxPx) {
        var ratio = Math.min(maxPx / w, maxPx / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        if (!blob) { reject(new Error('Canvas toBlob fehlgeschlagen')); return; }
        resolve({ blob: blob, width: w, height: h });
      }, 'image/jpeg', quality);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht geladen werden'));
    };
    img.src = url;
  });
}

// ── Drive-Unterordner für Fotos einer Sitzung ────
async function _ensurePhotoFolder(sessionId) {
  var cacheKey = 'photo_folder_' + sessionId;
  var cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      var f = await driveGet('/files/' + cached, { fields: 'id,trashed' });
      if (!f.trashed) return cached;
    } catch(e) { /* weiter */ }
    localStorage.removeItem(cacheKey);
  }
  var folderName = 'photos_' + sessionId;
  var res = await driveGet('/files', {
    q: "name='" + folderName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false and '" + driveFolderId + "' in parents",
    fields: 'files(id)',
    spaces: 'drive'
  });
  var folderId;
  if (res.files && res.files.length) {
    folderId = res.files[0].id;
  } else {
    var newF = await drivePost('/files', {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [driveFolderId]
    });
    folderId = newF.id;
  }
  localStorage.setItem(cacheKey, folderId);
  return folderId;
}

// ── Foto hochladen ────────────────────────────────
async function uploadPhoto(session, file) {
  if (!driveToken)     { showToast('Nicht mit Drive verbunden.', 'warning'); return; }
  if (!driveFolderId)  { showToast('Drive-Ordner nicht initialisiert.', 'warning'); return; }
  if (!session)        { showToast('Keine Sitzung geöffnet.', 'warning'); return; }

  showToast('Foto wird komprimiert…', 'info');
  try {
    var resized = await _resizePhoto(file);
    var photoFolderId = await _ensurePhotoFolder(session.id);
    var photoId  = 'ph_' + Date.now();
    var filename = photoId + '.jpg';
    var uploaded = await driveUploadMultipart(filename, resized.blob, 'image/jpeg', photoFolderId);

    var entry = {
      id:          photoId,
      driveFileId: uploaded.id,
      name:        file.name || filename,
      size:        resized.blob.size,
      width:       resized.width,
      height:      resized.height,
      uploadedAt:  new Date().toISOString()
    };

    if (!session.photos) session.photos = [];
    session.photos.unshift(entry);
    saveSessions();

    // Drive-Sync: andere Geräte sehen die neuen Foto-IDs
    if (typeof saveToArchive === 'function') {
      saveToArchive(session).catch(function(e) { console.warn('[Photo] Drive-Sync:', e); });
    }

    showToast('Foto gespeichert ✓', 'success');
    renderPhotoTab(session);
  } catch (err) {
    console.error('[Photo] Upload-Fehler:', err);
    showToast('Upload fehlgeschlagen: ' + err.message, 'error');
  }
}

// ── Foto löschen ──────────────────────────────────
async function deletePhoto(session, photoId) {
  if (!session) return;
  var photo = (session.photos || []).find(function(p) { return p.id === photoId; });
  if (!photo) return;

  try { await driveDeleteFile(photo.driveFileId); }
  catch(e) { console.warn('[Photo] Drive-Delete:', e); }

  session.photos = (session.photos || []).filter(function(p) { return p.id !== photoId; });
  saveSessions();

  if (typeof saveToArchive === 'function') {
    saveToArchive(session).catch(function(e) { console.warn('[Photo] Drive-Sync nach Delete:', e); });
  }

  renderPhotoTab(session);
  showToast('Foto gelöscht', 'info');
}

// ── Foto als base64 laden ────────────────────────
function _loadPhotoAsBase64(driveFileId) {
  return driveDownloadBlob(driveFileId).then(function(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var b64 = reader.result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  });
}

// ── Thumbnail nachladen ───────────────────────────
var _thumbCache = {};
async function _loadThumb(imgEl, driveFileId) {
  try {
    if (_thumbCache[driveFileId]) { imgEl.src = _thumbCache[driveFileId]; return; }
    var blob = await driveDownloadBlob(driveFileId);
    var url  = URL.createObjectURL(blob);
    _thumbCache[driveFileId] = url;
    imgEl.src = url;
  } catch(e) { console.warn('[Photo] Thumbnail:', e); }
}

// ── Drag & Drop initialisieren ────────────────────
function _initPhotoDrop(zone) {
  if (!zone) return;
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.classList.add('photo-drop-active');
  });
  zone.addEventListener('dragleave', function() {
    zone.classList.remove('photo-drop-active');
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('photo-drop-active');
    var files = Array.from(e.dataTransfer.files).filter(function(f) {
      return f.type.startsWith('image/');
    });
    if (!files.length) { showToast('Nur Bilddateien erlaubt.', 'warning'); return; }
    var s = (typeof getSession === 'function') ? getSession() : null;
    if (!s) { showToast('Keine Sitzung geöffnet.', 'warning'); return; }
    _uploadQueue(s, files);
  });
}

async function _uploadQueue(session, files) {
  for (var i = 0; i < files.length; i++) {
    await uploadPhoto(session, files[i]);
  }
}

// ── File-Input Handler ────────────────────────────
async function handlePhotoFileSelect(event) {
  var files = Array.from(event.target.files).filter(function(f) {
    return f.type.startsWith('image/');
  });
  event.target.value = '';
  if (!files.length) return;
  var s = (typeof getSession === 'function') ? getSession() : null;
  if (!s) { showToast('Keine Sitzung geöffnet.', 'warning'); return; }
  await _uploadQueue(s, files);
}

// ── Custom-Prompt-Textarea ein-/ausblenden ────────
function toggleCustomPromptInput() {
  var panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;
  var sel = panel.querySelector('#photoPromptSelect');
  var ta  = panel.querySelector('#photoCustomPrompt');
  if (ta) ta.style.display = (sel && sel.value === 'custom') ? 'block' : 'none';
}

// ── Lösch-Bestätigung ─────────────────────────────
function confirmDeletePhoto(photoId) {
  var s = (typeof getSession === 'function') ? getSession() : null;
  if (!s) return;
  if (confirm('Foto wirklich löschen?')) deletePhoto(s, photoId);
}

// ── Analyse starten ───────────────────────────────
async function runPhotoAnalysis(session) {
  if (!session) { showToast('Keine Sitzung geöffnet.', 'warning'); return; }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  var panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;

  // Ausgewählte Fotos
  var checked = Array.from(panel.querySelectorAll('.photo-checkbox:checked'));
  if (!checked.length) { showToast('Bitte mindestens ein Foto auswählen.', 'warning'); return; }

  // Prompt
  var promptSelect   = panel.querySelector('#photoPromptSelect');
  var customInput    = panel.querySelector('#photoCustomPrompt');
  var selectedId     = promptSelect ? promptSelect.value : '';
  var photoPrompts   = getPhotoPrompts();
  var selectedPrompt = photoPrompts.find(function(p) { return p.id === selectedId; });
  var promptText     = selectedPrompt ? selectedPrompt.prompt : '';

  if (selectedId === 'custom') {
    promptText = customInput ? customInput.value.trim() : '';
    if (!promptText) { showToast('Bitte Frage/Anweisung eingeben.', 'warning'); return; }
  }
  if (!promptText) { showToast('Kein Prompt ausgewählt.', 'warning'); return; }

  var analyseBtn = panel.querySelector('#photoAnalyseBtn');
  if (analyseBtn) { analyseBtn.disabled = true; analyseBtn.textContent = '⏳ Analyse läuft…'; }

  try {
    // Transkript aufbauen (utterances oder transcript)
    var utterances = session.utterances || session.transcript || [];
    var transcriptText = utterances.map(function(u) {
      return (u.speaker || 'Sprecher') + ': ' + (u.text || '');
    }).join('\n');

    // Fotos laden
    var selectedIds = checked.map(function(cb) { return cb.dataset.photoId; });
    var photos = (session.photos || []).filter(function(p) {
      return selectedIds.indexOf(p.id) !== -1;
    });

    showToast(photos.length + ' Foto(s) werden geladen…', 'info');

    var imageBlocks = [];
    for (var i = 0; i < photos.length; i++) {
      var b64 = await _loadPhotoAsBase64(photos[i].driveFileId);
      imageBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 }
      });
    }

    // Message-Array: optionaler Transkript-Kontext + Bilder + Prompt
    var messageContent = [];
    if (transcriptText) {
      messageContent.push({
        type: 'text',
        text: 'Hier ist das Transkript der Sitzung zur Orientierung:\n\n' + transcriptText
      });
    }
    for (var j = 0; j < imageBlocks.length; j++) {
      messageContent.push(imageBlocks[j]);
    }
    messageContent.push({ type: 'text', text: promptText });

    var result = await callClaudeAPIVision(messageContent);

    // Ergebnis-Block
    var photoLabel  = photos.length === 1 ? photos[0].name : photos.length + ' Fotos';
    var promptLabel = selectedPrompt ? selectedPrompt.label : 'Foto-Analyse';
    var resultTitle = promptLabel + ' – ' + photoLabel;
    var resultId    = 'pr_' + Date.now();

    // v5.64: Bildnamen automatisch als Kopfzeile voranstellen
    var photoNameHeader = '📸 ' + photos.map(function(p) { return p.name; }).join(' · ') + '\n\n';
    result.text = photoNameHeader + result.text;

    // v5.61: Ergebnis in Session speichern → Drive-Sync → andere Geräte sehen es
    if (!session.photoResults) session.photoResults = [];
    session.photoResults.unshift({ id: resultId, title: resultTitle, text: result.text, createdAt: new Date().toISOString() });
    saveSessions();
    if (typeof saveToArchive === 'function') {
      saveToArchive(session).catch(function(e) { console.warn('[Photo] Ergebnis Drive-Sync:', e); });
    }

    _insertPhotoResultBlock(resultId, resultTitle, result.text);

    showToast('Foto-Analyse abgeschlossen ✓', 'success');
  } catch (err) {
    console.error('[Photo] Analyse-Fehler:', err);
    showToast('Analyse fehlgeschlagen: ' + err.message, 'error');
  } finally {
    if (analyseBtn) {
      analyseBtn.disabled = false;
      analyseBtn.innerHTML =
        '<i data-lucide="sparkles" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:5px"></i>Fotos analysieren';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [analyseBtn] });
    }
  }
}

// ── Ergebnis-Block in Analysen-Tab einfügen ───────
// resultId: gespeicherte ID in session.photoResults (für Delete-Sync)
function _insertPhotoResultBlock(resultId, title, text) {
  switchSessionTab('analysen');

  var blockId   = 'photoBlock_' + resultId;
  var safeTitle = (typeof escHtml === 'function') ? escHtml(title) : title;
  var safeText  = (typeof escHtml === 'function') ? escHtml(text)  : text;

  // Doppelten Block verhindern (z.B. wenn renderPhotoResults + direktes Einfügen)
  if (document.getElementById(blockId)) return;

  var html =
    '<div class="insights-block photo-result-block" id="' + blockId + '" ' +
        'data-hl-source="' + safeTitle + '" data-has-content="1">' +
      '<div class="insights-block-title" onclick="toggleInsightsBlock(\'' + blockId + '\')">' +
        '<span style="display:inline-flex;align-items:center;gap:6px">' +
          '<i data-lucide="camera" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;flex-shrink:0"></i>' +
          safeTitle +
        '</span>' +
        '<span style="display:inline-flex;align-items:center;gap:4px;margin-left:auto">' +
          '<button class="insights-export-btn" title="Block löschen" style="color:var(--muted)" ' +
            'onclick="event.stopPropagation();deletePhotoResult(\'' + resultId + '\')">' +
            '<i data-lucide="trash-2" style="width:11px;height:11px;stroke:currentColor;stroke-width:2;fill:none;pointer-events:none"></i>' +
          '</button>' +
          '<span class="insights-block-chevron">&#9662;</span>' +
        '</span>' +
      '</div>' +
      '<div class="insights-block-body">' +
        '<div class="custom-result-text" style="white-space:pre-wrap">' + safeText + '</div>' +
      '</div>' +
    '</div>';

  // Einfügen in dedizierten Container (v5.61)
  var container = document.getElementById('photoResultsContainer');
  if (container) {
    container.insertAdjacentHTML('afterbegin', html);
  } else {
    var analysenPanel = document.getElementById('sdc-panel-analysen');
    if (analysenPanel) analysenPanel.insertAdjacentHTML('afterbegin', html);
  }

  var block = document.getElementById(blockId);
  if (block) {
    block.style.display = 'block';
    block.classList.remove('collapsed');
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (typeof _refreshAnalysenSubtabs === 'function') _refreshAnalysenSubtabs();
}

// ── Foto-Ergebnis löschen (DOM + Session + Drive) ──
function deletePhotoResult(resultId) {
  // DOM entfernen
  var blockId = 'photoBlock_' + resultId;
  var block = document.getElementById(blockId);
  if (block) block.remove();

  // Aus Session entfernen + Drive-Sync
  var s = (typeof getSession === 'function') ? getSession() : null;
  if (s && s.photoResults) {
    s.photoResults = s.photoResults.filter(function(r) { return r.id !== resultId; });
    if (typeof saveSessions === 'function') saveSessions();
    if (typeof saveToArchive === 'function') {
      saveToArchive(s).catch(function(e) { console.warn('[Photo] Delete Drive-Sync:', e); });
    }
  }

  if (typeof _refreshAnalysenSubtabs === 'function') _refreshAnalysenSubtabs();
}

// ── Gespeicherte Foto-Ergebnisse rendern (v5.61) ──
// Wird von renderInsights() aufgerufen – idempotent dank Container-Clear
function renderPhotoResults(session) {
  var container = document.getElementById('photoResultsContainer');
  if (!container) return;
  container.innerHTML = '';

  var results = (session && session.photoResults) ? session.photoResults : [];
  if (!results.length) return;

  results.forEach(function(r) {
    var blockId   = 'photoBlock_' + r.id;
    var safeTitle = (typeof escHtml === 'function') ? escHtml(r.title) : r.title;
    var safeText  = (typeof escHtml === 'function') ? escHtml(r.text)  : r.text;

    var html =
      '<div class="insights-block photo-result-block" id="' + blockId + '" ' +
          'data-hl-source="' + safeTitle + '" data-has-content="1">' +
        '<div class="insights-block-title" onclick="toggleInsightsBlock(\'' + blockId + '\')">' +
          '<span style="display:inline-flex;align-items:center;gap:6px">' +
            '<i data-lucide="camera" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;flex-shrink:0"></i>' +
            safeTitle +
          '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:4px;margin-left:auto">' +
            '<button class="insights-export-btn" title="Block löschen" style="color:var(--muted)" ' +
              'onclick="event.stopPropagation();deletePhotoResult(\'' + r.id + '\')">' +
              '<i data-lucide="trash-2" style="width:11px;height:11px;stroke:currentColor;stroke-width:2;fill:none;pointer-events:none"></i>' +
            '</button>' +
            '<span class="insights-block-chevron">&#9662;</span>' +
          '</span>' +
        '</div>' +
        '<div class="insights-block-body">' +
          '<div class="custom-result-text" style="white-space:pre-wrap">' + safeText + '</div>' +
        '</div>' +
      '</div>';

    container.insertAdjacentHTML('beforeend', html);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

// ── Hilfsfunktion: Dateigröße ─────────────────────
function _formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1048576)     return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Tab-UI rendern ────────────────────────────────
function renderPhotoTab(session) {
  var panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;

  var photos   = (session && session.photos) ? session.photos : [];
  var hasPhotos = photos.length > 0;

  // Prompt-Optionen aus Datenbank
  var photoPrompts = getPhotoPrompts();
  var promptHtml = photoPrompts.map(function(p) {
    return '<option value="' + p.id + '">' + p.label + '</option>';
  }).join('');
  promptHtml += '<option value="custom">✏️ Eigene Frage eingeben…</option>';

  // Foto-Karten
  var cardsHtml = '';
  if (hasPhotos) {
    cardsHtml = photos.map(function(p) {
      return '<div class="photo-card" id="photoCard_' + p.id + '">' +
        '<div class="photo-thumb-wrap">' +
          '<img class="photo-thumb" data-drive-id="' + p.driveFileId + '" src="" alt="">' +
          '<div class="photo-check-overlay">' +
            '<input type="checkbox" class="photo-checkbox" data-photo-id="' + p.id + '" id="photoCb_' + p.id + '">' +
            '<label for="photoCb_' + p.id + '" class="photo-check-label"></label>' +
          '</div>' +
        '</div>' +
        '<div class="photo-card-info">' +
          '<span class="photo-name" title="' + p.name + '">' + p.name + '</span>' +
          '<span class="photo-size">' + _formatBytes(p.size) + '</span>' +
          '<button class="photo-delete-btn" title="Foto löschen" onclick="confirmDeletePhoto(\'' + p.id + '\')">' +
            '<i data-lucide="trash-2" style="width:12px;height:12px;stroke:currentColor;stroke-width:2;fill:none"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  panel.innerHTML =
    '<div class="photo-tab-wrap">' +

      // Upload-Bereich
      '<div class="photo-upload-area" id="photoDropZone">' +
        '<input type="file" id="photoFileInput" accept="image/*" multiple style="display:none" onchange="handlePhotoFileSelect(event)">' +
        '<input type="file" id="photoCameraInput" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoFileSelect(event)">' +
        '<label for="photoFileInput" class="photo-upload-btn">' +
          '<i data-lucide="image-plus" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:6px"></i>' +
          'Foto(s) hochladen' +
        '</label>' +
        '<label for="photoCameraInput" class="photo-upload-btn" style="background:var(--surface2);border:1px solid var(--border);color:var(--text)">' +
          '<i data-lucide="camera" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:6px"></i>' +
          'Kamera' +
        '</label>' +
        '<span class="photo-upload-hint">oder Bild hierher ziehen</span>' +
      '</div>' +

      // Leer-Zustand
      (!hasPhotos ?
        '<div class="photo-empty">' +
          '<i data-lucide="camera-off" style="width:32px;height:32px;stroke:currentColor;stroke-width:1.5;fill:none;opacity:0.3"></i>' +
          '<p>Noch keine Fotos – lade Whiteboards, Skizzen oder Notizen hoch.</p>' +
        '</div>'
      :
        // Foto-Grid
        '<div class="photo-grid" id="photoGrid">' + cardsHtml + '</div>' +

        // Analyse-Panel
        '<div class="photo-analyse-panel">' +
          '<div class="photo-analyse-row">' +
            '<label class="photo-analyse-label">Prompt:</label>' +
            '<select id="photoPromptSelect" class="photo-prompt-select" onchange="toggleCustomPromptInput()">' +
              promptHtml +
            '</select>' +
          '</div>' +
          '<textarea id="photoCustomPrompt" class="photo-custom-prompt" rows="3" ' +
            'placeholder="Eigene Frage oder Anweisung an die KI…" style="display:none"></textarea>' +
          '<div class="photo-analyse-row" style="justify-content:flex-end;margin-top:8px">' +
            '<span class="photo-select-hint">Fotos zum Analysieren auswählen (Checkbox)</span>' +
            '<button id="photoAnalyseBtn" class="photo-analyse-btn" onclick="runPhotoAnalysis(getSession())">' +
              '<i data-lucide="sparkles" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:5px"></i>' +
              'Fotos analysieren' +
            '</button>' +
          '</div>' +
        '</div>'
      ) +

    '</div>';

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Thumbnails nachladen
  var thumbs = panel.querySelectorAll('.photo-thumb[data-drive-id]');
  for (var i = 0; i < thumbs.length; i++) {
    _loadThumb(thumbs[i], thumbs[i].dataset.driveId);
  }

  // Drag & Drop
  _initPhotoDrop(document.getElementById('photoDropZone'));
}

// ── Init ──────────────────────────────────────────
function initPhotoTab() { /* wird bei Bedarf aufgerufen */ }

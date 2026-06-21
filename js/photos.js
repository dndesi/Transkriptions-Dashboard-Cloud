// ═══════════════════════════════════════════════════
// FOTOS – Upload, Drive-Sync, Analyse  (v5.57)
// ═══════════════════════════════════════════════════

// ── Bild-spezifische Prompts ─────────────────────
const PHOTO_PROMPTS = [
  {
    id: 'whiteboard',
    label: 'Whiteboard-Inhalt extrahieren',
    prompt: `Analysiere dieses Foto eines Whiteboards oder einer Tafel aus einem Meeting.
Extrahiere ALLE sichtbaren Inhalte: Text, Zahlen, Diagramme, Pfeile, Strukturen.
Formatiere die Ergebnisse übersichtlich mit Markdown.
Wenn das Transkript verfügbar ist, verknüpfe die Whiteboard-Inhalte mit den besprochenen Themen.`
  },
  {
    id: 'sketch',
    label: 'Skizze / Diagramm beschreiben',
    prompt: `Beschreibe diese Skizze oder dieses handgezeichnete Diagramm detailliert.
Was wird dargestellt? Welche Elemente, Verbindungen und Strukturen sind erkennbar?
Wenn das Transkript verfügbar ist, erkläre den Zusammenhang zum Gespräch.`
  },
  {
    id: 'handwriting',
    label: 'Handschrift lesen & transkribieren',
    prompt: `Lese und transkribiere die handgeschriebenen Texte in diesem Foto so genau wie möglich.
Markiere unleserliche Stellen mit [?].
Strukturiere den Text so, wie er im Original angeordnet ist.`
  },
  {
    id: 'combined',
    label: 'Foto + Transkript kombiniert analysieren',
    prompt: `Du erhältst ein Foto aus einem Meeting sowie das zugehörige Gesprächstranskript.
Analysiere beides zusammen: Was zeigt das Foto? Welche Bezüge gibt es zum Gespräch?
Welche Erkenntnisse ergeben sich aus der Kombination beider Quellen?
Fasse die wichtigsten Punkte kompakt zusammen.`
  },
  {
    id: 'tasks',
    label: 'Aufgaben aus Foto ableiten',
    prompt: `Analysiere dieses Foto und leite daraus konkrete Aufgaben (To-Dos) ab.
Prüfe auch das Transkript auf ergänzende Handlungsschritte.
Formatiere die Aufgaben als Checkliste mit Priorität und – wenn erkennbar – Verantwortlichkeit.`
  },
  {
    id: 'custom',
    label: '✏️ Eigene Frage eingeben…',
    prompt: ''
  }
];

// ── Resize: max 1200px, JPEG 0.75 ────────────────
function _resizePhoto(file, maxPx = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob fehlgeschlagen')); return; }
        resolve({ blob, width, height });
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = url;
  });
}

// ── Drive-Unterordner für Fotos einer Sitzung ────
async function _ensurePhotoFolder(sessionId) {
  const cacheKey = 'photo_folder_' + sessionId;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const f = await driveGet('/files/' + cached, { fields: 'id,trashed' });
      if (!f.trashed) return cached;
    } catch(_) {}
    localStorage.removeItem(cacheKey);
  }
  const folderName = 'photos_' + sessionId;
  const res = await driveGet('/files', {
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${driveFolderId}' in parents`,
    fields: 'files(id)', spaces: 'drive',
  });
  let folderId;
  if (res.files?.length) {
    folderId = res.files[0].id;
  } else {
    const f = await drivePost('/files', {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [driveFolderId]
    });
    folderId = f.id;
  }
  localStorage.setItem(cacheKey, folderId);
  return folderId;
}

// ── Foto hochladen ────────────────────────────────
async function uploadPhoto(session, file) {
  if (!driveToken) { showToast('Nicht mit Drive verbunden.', 'warning'); return; }
  if (!driveFolderId) { showToast('Drive-Ordner nicht initialisiert.', 'warning'); return; }

  const id = 'ph_' + Date.now();
  showToast('Foto wird komprimiert…', 'info');

  try {
    const { blob, width, height } = await _resizePhoto(file);
    const photoFolderId = await _ensurePhotoFolder(session.id || session._id || currentSessionId);
    const filename = id + '.jpg';
    const uploaded = await driveUploadMultipart(filename, blob, 'image/jpeg', photoFolderId);

    const entry = {
      id,
      driveFileId: uploaded.id,
      name: file.name || filename,
      size: blob.size,
      width,
      height,
      uploadedAt: new Date().toISOString()
    };

    if (!session.photos) session.photos = [];
    session.photos.unshift(entry);
    saveSessions();
    showToast('Foto gespeichert ✓', 'success');
    renderPhotoTab(session);
  } catch (err) {
    console.error('[Photo] Upload-Fehler:', err);
    showToast('Upload fehlgeschlagen: ' + err.message, 'error');
  }
}

// ── Foto löschen ──────────────────────────────────
async function deletePhoto(session, photoId) {
  const photo = (session.photos || []).find(p => p.id === photoId);
  if (!photo) return;
  try {
    await driveDeleteFile(photo.driveFileId);
  } catch(e) {
    console.warn('[Photo] Drive-Delete fehlgeschlagen:', e);
  }
  session.photos = (session.photos || []).filter(p => p.id !== photoId);
  saveSessions();
  renderPhotoTab(session);
  showToast('Foto gelöscht', 'info');
}

// ── Fotos als base64 laden ────────────────────────
async function _loadPhotoAsBase64(driveFileId) {
  const blob = await driveDownloadBlob(driveFileId);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Ergebnis: "data:image/jpeg;base64,XXXX" → nur den Base64-Teil
      const b64 = reader.result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Analyse starten ───────────────────────────────
async function runPhotoAnalysis(session) {
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;

  // Ausgewählte Fotos ermitteln
  const checked = [...panel.querySelectorAll('.photo-checkbox:checked')];
  if (!checked.length) { showToast('Bitte mindestens ein Foto auswählen.', 'warning'); return; }

  // Prompt ermitteln
  const promptSelect = panel.querySelector('#photoPromptSelect');
  const customInput  = panel.querySelector('#photoCustomPrompt');
  const selectedId   = promptSelect?.value;
  let promptTemplate = PHOTO_PROMPTS.find(p => p.id === selectedId)?.prompt || '';

  if (selectedId === 'custom') {
    promptTemplate = customInput?.value?.trim() || '';
    if (!promptTemplate) { showToast('Bitte Frage/Anweisung eingeben.', 'warning'); return; }
  }

  // Analyse-Button deaktivieren + Spinner
  const analyseBtn = panel.querySelector('#photoAnalyseBtn');
  if (analyseBtn) { analyseBtn.disabled = true; analyseBtn.textContent = '⏳ Analyse läuft…'; }

  try {
    // Transkript-Kontext aufbauen
    const transcript = (session.transcript || [])
      .map(b => `${b.speaker || 'Sprecher'}: ${b.text || ''}`)
      .join('\n');
    const transcriptSection = transcript
      ? `\n\n=== GESPRÄCHSTRANSKRIPT ===\n${transcript}`
      : '';

    // Fotos laden
    const selectedPhotoIds = checked.map(cb => cb.dataset.photoId);
    const photos = (session.photos || []).filter(p => selectedPhotoIds.includes(p.id));

    showToast(`${photos.length} Foto(s) werden geladen…`, 'info');

    const imageBlocks = [];
    for (const photo of photos) {
      const b64 = await _loadPhotoAsBase64(photo.driveFileId);
      imageBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 }
      });
    }

    // Message-Array aufbauen: Text → Bilder → Prompt
    const messageContent = [
      ...(transcriptSection ? [{ type: 'text', text: 'Hier ist das Transkript der Sitzung zur Orientierung:' + transcriptSection }] : []),
      ...imageBlocks,
      { type: 'text', text: promptTemplate }
    ];

    const result = await callClaudeAPIVision(messageContent);

    // Ergebnis als Insights-Block rendern (analog zu Custom-Prompts)
    const photoLabel = photos.length === 1 ? photos[0].name : `${photos.length} Fotos`;
    const promptLabel = PHOTO_PROMPTS.find(p => p.id === selectedId)?.label || 'Foto-Analyse';
    const blockTitle = `📸 ${promptLabel} – ${photoLabel}`;

    _insertPhotoResultBlock(session, blockTitle, result.text, selectedPhotoIds);

    showToast('Foto-Analyse abgeschlossen ✓', 'success');
  } catch (err) {
    console.error('[Photo] Analyse-Fehler:', err);
    showToast('Analyse fehlgeschlagen: ' + err.message, 'error');
  } finally {
    if (analyseBtn) { analyseBtn.disabled = false; analyseBtn.textContent = 'Fotos analysieren'; }
  }
}

// ── Analyse-Ergebnis als Block in Analysen-Tab ────
function _insertPhotoResultBlock(session, title, markdownText, photoIds) {
  // Zum Analysen-Tab wechseln
  switchSessionTab('analysen');

  // Container
  const analysenPanel = document.getElementById('sdc-panel-analysen');
  if (!analysenPanel) return;

  const blockId = 'photoBlock_' + Date.now();
  const html = `
<div class="insights-block photo-result-block" id="${blockId}" data-hl-source="${blockId}">
  <div class="insights-block-title">
    <span>${title}</span>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="sdc-icon-btn" title="Block löschen"
        onclick="document.getElementById('${blockId}').remove()"
        style="opacity:0.6;font-size:11px;padding:2px 7px">✕</button>
    </div>
  </div>
  <div class="insights-block-content" id="${blockId}-content">
    ${_mdToHtml(markdownText)}
  </div>
</div>`;

  // Am Anfang des Analysen-Panels einfügen
  analysenPanel.insertAdjacentHTML('afterbegin', html);

  // Lucide-Icons rendern falls nötig
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Einfaches Markdown → HTML (nur für Analyse-Output) ──
function _mdToHtml(md) {
  if (!md) return '';
  // Nutzt dieselbe Logik wie andere insights-Blöcke im Projekt
  // (rudimentär – echtes md wird über renderInsightsMarkdown gehandhabt falls verfügbar)
  if (typeof renderInsightsMarkdown === 'function') return renderInsightsMarkdown(md);
  // Fallback: simple Konvertierung
  return md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g,'<br><br>')
    .replace(/\n/g,'<br>');
}

// ── Tab-UI rendern ────────────────────────────────
function renderPhotoTab(session) {
  const panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;

  const photos = session?.photos || [];
  const noPhotos = photos.length === 0;

  const promptOptions = PHOTO_PROMPTS.map(p =>
    `<option value="${p.id}">${p.label}</option>`
  ).join('');

  panel.innerHTML = `
    <div class="photo-tab-wrap">

      <!-- Upload-Bereich -->
      <div class="photo-upload-area" id="photoDropZone">
        <input type="file" id="photoFileInput" accept="image/*" multiple style="display:none"
          onchange="handlePhotoFileSelect(event)">
        <label for="photoFileInput" class="photo-upload-btn">
          <i data-lucide="image-plus" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:6px"></i>
          Foto(s) hinzufügen
        </label>
        <span class="photo-upload-hint">oder Bild hierher ziehen</span>
      </div>

      ${noPhotos ? `
        <div class="photo-empty">
          <i data-lucide="camera-off" style="width:32px;height:32px;stroke:currentColor;stroke-width:1.5;fill:none;opacity:0.3"></i>
          <p>Noch keine Fotos – lade Whiteboards, Skizzen oder Notizen hoch.</p>
        </div>
      ` : `
        <!-- Foto-Grid -->
        <div class="photo-grid" id="photoGrid">
          ${photos.map(p => `
            <div class="photo-card" id="photoCard_${p.id}">
              <div class="photo-thumb-wrap">
                <img class="photo-thumb" data-drive-id="${p.driveFileId}" src="" alt="${p.name}"
                  onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23334155%22/><text x=%2230%22 y=%2235%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2212%22>📷</text></svg>'">
                <div class="photo-check-overlay">
                  <input type="checkbox" class="photo-checkbox" data-photo-id="${p.id}" id="photoCb_${p.id}">
                  <label for="photoCb_${p.id}" class="photo-check-label"></label>
                </div>
              </div>
              <div class="photo-card-info">
                <span class="photo-name" title="${p.name}">${p.name}</span>
                <span class="photo-size">${_formatBytes(p.size)}</span>
                <button class="photo-delete-btn" title="Foto löschen"
                  onclick="confirmDeletePhoto('${p.id}')">
                  <i data-lucide="trash-2" style="width:12px;height:12px;stroke:currentColor;stroke-width:2;fill:none"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Analyse-Panel -->
        <div class="photo-analyse-panel">
          <div class="photo-analyse-row">
            <label class="photo-analyse-label">Prompt:</label>
            <select id="photoPromptSelect" class="photo-prompt-select" onchange="toggleCustomPromptInput()">
              ${promptOptions}
            </select>
          </div>
          <textarea id="photoCustomPrompt" class="photo-custom-prompt" rows="3"
            placeholder="Eigene Frage oder Anweisung an die KI…" style="display:none"></textarea>
          <div class="photo-analyse-row" style="justify-content:flex-end;margin-top:8px">
            <span class="photo-select-hint">Fotos zum Analysieren auswählen (Checkbox)</span>
            <button id="photoAnalyseBtn" class="photo-analyse-btn" onclick="runPhotoAnalysis(getSession())">
              <i data-lucide="sparkles" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;vertical-align:middle;margin-right:5px"></i>
              Fotos analysieren
            </button>
          </div>
        </div>
      `}

    </div>`;

  // Lucide-Icons rendern
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Thumbnails aus Drive nachladen
  panel.querySelectorAll('.photo-thumb[data-drive-id]').forEach(img => {
    _loadThumb(img, img.dataset.driveId);
  });

  // Drag & Drop initialisieren
  _initPhotoDrop(document.getElementById('photoDropZone'));
}

// ── Thumbnail laden (als Blob-URL) ───────────────
const _thumbCache = {};
async function _loadThumb(imgEl, driveFileId) {
  try {
    if (_thumbCache[driveFileId]) {
      imgEl.src = _thumbCache[driveFileId];
      return;
    }
    const blob = await driveDownloadBlob(driveFileId);
    const url  = URL.createObjectURL(blob);
    _thumbCache[driveFileId] = url;
    imgEl.src = url;
  } catch(e) {
    console.warn('[Photo] Thumbnail-Ladefehler:', e);
  }
}

// ── Drag & Drop ───────────────────────────────────
function _initPhotoDrop(zone) {
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('photo-drop-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('photo-drop-active'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('photo-drop-active');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (!files.length) { showToast('Nur Bilddateien erlaubt.', 'warning'); return; }
    const s = getSession();
    if (!s) return;
    _uploadMultiplePhotos(s, files);
  });
}

async function _uploadMultiplePhotos(session, files) {
  for (const file of files) {
    await uploadPhoto(session, file);
  }
}

// ── File-Input Handler ────────────────────────────
async function handlePhotoFileSelect(event) {
  const files = [...event.target.files].filter(f => f.type.startsWith('image/'));
  event.target.value = '';  // Reset so dasselbe Bild nochmal gewählt werden kann
  if (!files.length) return;
  const s = getSession();
  if (!s) return;
  await _uploadMultiplePhotos(s, files);
}

// ── Custom-Prompt-Textarea ein-/ausblenden ────────
function toggleCustomPromptInput() {
  const panel = document.getElementById('sdc-panel-fotos');
  if (!panel) return;
  const val = panel.querySelector('#photoPromptSelect')?.value;
  const ta  = panel.querySelector('#photoCustomPrompt');
  if (ta) ta.style.display = val === 'custom' ? 'block' : 'none';
}

// ── Löschbestätigung ──────────────────────────────
function confirmDeletePhoto(photoId) {
  const s = getSession();
  if (!s) return;
  if (confirm('Foto wirklich löschen?')) deletePhoto(s, photoId);
}

// ── Hilfsfunktion: Dateigröße formatieren ────────
function _formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Init (wird von app.js oder index.html aufgerufen) ──
function initPhotoTab() {
  // Aktuell nichts nötig – renderPhotoTab() wird beim Tab-Wechsel aufgerufen
}

// ═══════════════════════════════════════════════════
// SCAN-IMPORT  (v6.28, v6.32: zweite OCR-Engine Tesseract)
// Fotos von handschriftlichen Notizen/Dokumenten → OCR (Claude Vision
// oder Tesseract.js) → Session (kein Dialog, ein Sprecher). Mehrere
// Fotos = eine Notiz.
// ═══════════════════════════════════════════════════

let _scanFiles = []; // File[]

// ── Tab-Umschalter ──────────────────────────────────
function openScanTab() {
  document.getElementById('scanTabBtn').classList.add('upload-tab-active');
  document.getElementById('audioTabBtn').classList.remove('upload-tab-active');
  document.getElementById('importTabBtn').classList.remove('upload-tab-active');
  document.getElementById('scanTabContent').style.display = '';
  document.getElementById('audioTabContent').style.display = 'none';
  document.getElementById('importTabContent').style.display = 'none';
  document.querySelector('.upload-panel-head h3').innerHTML =
    `<i data-lucide="scan-line" style="width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none"></i> Scan`;
  if (window.lucide) lucide.createIcons();
  _renderScanFileList(); // v6.34: Zustand beim erneuten Öffnen wieder anzeigen
}

// ── Foto(s) ausgewählt (mehrfach möglich, additiv) ───
function handleScanFileSelect(event) {
  const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
  event.target.value = '';
  if (!files.length) return;

  // v6.33: neue Fotos untereinander nach Aufnahme-/Änderungszeitpunkt sortieren.
  // v6.34: nur den neuen Batch sortieren, nicht die gesamte Liste neu mischen –
  // sonst würde ein manuelles Umsortieren durch eine weitere Auswahl überschrieben
  files.sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));
  _scanFiles = _scanFiles.concat(files);

  const statusEl = document.getElementById('scanStatus');
  statusEl.style.color = 'var(--green)';
  statusEl.textContent = `✓ ${_scanFiles.length} Foto${_scanFiles.length > 1 ? 's' : ''} ausgewählt`;
  _renderScanFileList();

  const startBtn = document.getElementById('scanStartBtn');
  startBtn.removeAttribute('disabled');
  startBtn.style.opacity = '1';
  startBtn.style.pointerEvents = '';
}

// ── Reihenfolge zur Kontrolle anzeigen + manuell anpassen (v6.33/v6.34) ──
function _renderScanFileList() {
  const el = document.getElementById('scanFileList');
  if (!el) return;
  if (!_scanFiles.length) { el.innerHTML = ''; return; }
  const rows = _scanFiles.map((f, i) => `
    <li style="display:flex;align-items:center;gap:4px;padding:2px 0">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(f.name)}</span>
      <button type="button" title="Nach oben" onclick="_scanMoveFile(${i},-1)" ${i === 0 ? 'disabled style="opacity:0.3"' : ''}
        style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 5px;font-size:0.75rem">▲</button>
      <button type="button" title="Nach unten" onclick="_scanMoveFile(${i},1)" ${i === _scanFiles.length - 1 ? 'disabled style="opacity:0.3"' : ''}
        style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 5px;font-size:0.75rem">▼</button>
      <button type="button" title="Foto entfernen" onclick="_scanRemoveFile(${i})"
        style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px 5px;font-size:0.85rem">×</button>
    </li>`).join('');
  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:0.72rem;color:var(--muted)">Reihenfolge (nach Aufnahmezeitpunkt, bei Bedarf mit ▲▼ anpassen):</span>' +
      '<button type="button" onclick="_scanResetFiles()" style="background:none;border:none;color:var(--muted);font-size:0.72rem;cursor:pointer;text-decoration:underline;white-space:nowrap;margin-left:8px">Zurücksetzen</button>' +
    '</div>' +
    '<ol style="margin:0;padding-left:16px;font-size:0.78rem;color:var(--text);line-height:1.5">' +
    rows +
    '</ol>';
}

// ── Foto in der Liste verschieben ────────────────────
function _scanMoveFile(index, dir) {
  const j = index + dir;
  if (j < 0 || j >= _scanFiles.length) return;
  [_scanFiles[index], _scanFiles[j]] = [_scanFiles[j], _scanFiles[index]];
  _renderScanFileList();
}

// ── Einzelnes Foto entfernen ──────────────────────────
function _scanRemoveFile(index) {
  _scanFiles.splice(index, 1);
  _renderScanFileList();
  const statusEl = document.getElementById('scanStatus');
  const startBtn = document.getElementById('scanStartBtn');
  if (!_scanFiles.length) {
    statusEl.textContent = '';
    startBtn.setAttribute('disabled', '');
    startBtn.style.opacity = '0.4';
    startBtn.style.pointerEvents = 'none';
  } else {
    statusEl.textContent = `✓ ${_scanFiles.length} Foto${_scanFiles.length > 1 ? 's' : ''} ausgewählt`;
  }
}

// ── Foto-Warteschlange komplett zurücksetzen ─────────
function _scanResetFiles() {
  _scanFiles = [];
  document.getElementById('scanFileInput').value = '';
  document.getElementById('scanStatus').textContent = '';
  _renderScanFileList();
  const startBtn = document.getElementById('scanStartBtn');
  startBtn.setAttribute('disabled', '');
  startBtn.style.opacity = '0.4';
  startBtn.style.pointerEvents = 'none';
}

// ── Foto exakt vertikal in linke/rechte Hälfte teilen (Doppelseite) ──
function _splitImageHalves(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.width, h = img.height;
      const halfW = Math.floor(w / 2);
      const makeHalf = (sx, sw) => new Promise(res => {
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, sx, 0, sw, h, 0, 0, sw, h);
        canvas.toBlob(blob => res(blob), 'image/jpeg', 0.92);
      });
      Promise.all([makeHalf(0, halfW), makeHalf(halfW, w - halfW)]).then(resolve);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = url;
  });
}

// ── OCR-Prompt: Notiz einer Person, kein Dialog ──────
const SCAN_OCR_PROMPT =
  'Erkenne den vollständigen Text in diesem Bild und gib ihn wortgetreu wieder. ' +
  'Es handelt sich um eine handschriftliche Notiz oder ein Dokument einer einzelnen Person, ' +
  'kein Dialog zwischen mehreren Sprechern. Gib ausschließlich den erkannten Text zurück, ' +
  'ohne Einleitung, ohne Kommentar, ohne Formatierungshinweise.';

// ── Ein Foto per Claude Vision zu Text ───────────────
async function _ocrImage(file) {
  const resized = await _resizePhoto(file, 1600, 0.85);
  const b64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(resized.blob);
  });
  const messageContent = [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
    { type: 'text', text: SCAN_OCR_PROMPT }
  ];
  const result = await callClaudeAPIVision(messageContent);
  return result.text.trim();
}

// ── Ein Foto per Tesseract.js (lokal, kein API-Key) zu Text ──
async function _ocrImageTesseract(file, onProgress) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js konnte nicht geladen werden.');
  const { data } = await Tesseract.recognize(file, 'deu', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    }
  });
  return (data.text || '').trim();
}

// ── Scan verarbeiten: alle Fotos → ein Text → eine Session ──
async function startScanImport() {
  if (!_scanFiles.length) return;
  const engine = document.getElementById('scanEngine')?.value || 'claude';
  if (engine === 'claude' && !anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const startBtn = document.getElementById('scanStartBtn');
  const statusEl = document.getElementById('scanStatus');
  startBtn.setAttribute('disabled', '');
  startBtn.style.opacity = '0.4';
  startBtn.style.pointerEvents = 'none';

  try {
    // v6.34: Doppelseite – jedes Foto vorab in linke+rechte Hälfte teilen,
    // beide Hälften werden danach wie zwei eigene Seiten behandelt
    const doublePage = document.getElementById('scanDoublePage')?.checked;
    let ocrUnits = _scanFiles;
    if (doublePage) {
      statusEl.style.color = 'var(--muted)';
      statusEl.textContent = '⏳ Doppelseiten werden geteilt…';
      ocrUnits = [];
      for (const f of _scanFiles) {
        const halves = await _splitImageHalves(f);
        ocrUnits.push(...halves);
      }
    }

    const pageTexts = [];
    for (let i = 0; i < ocrUnits.length; i++) {
      statusEl.style.color = 'var(--muted)';
      statusEl.textContent = `⏳ Text wird erkannt (${i + 1}/${ocrUnits.length})…`;
      const text = engine === 'tesseract'
        ? await _ocrImageTesseract(ocrUnits[i], pct => { statusEl.textContent = `⏳ Text wird erkannt (${i + 1}/${ocrUnits.length}) – ${pct}%…`; })
        : await _ocrImage(ocrUnits[i]);
      if (text) pageTexts.push(text);
    }

    if (!pageTexts.length) {
      showToast('Kein Text erkannt.', 'warning');
      return;
    }

    const fullText = pageTexts.join('\n\n');
    const parsed   = parsePlainText(fullText);

    const customLabel  = document.getElementById('scanLabel').value.trim();
    const dateInputVal = document.getElementById('scanDate').value;
    const sessionDate  = dateInputVal ? new Date(dateInputVal).toISOString() : new Date().toISOString();
    const sessionType  = document.getElementById('scanType')?.value || 'gedanken';
    const label = customLabel || ('Notiz ' + new Date(sessionDate).toLocaleDateString('de-DE'));

    const session = {
      id:           Date.now().toString(),
      label,
      filename:     _scanFiles[0].name,
      speakerA:     'Ich',
      speakerB:     '',
      speakers:     [{ id: 'A', label: 'Sprecher 1', name: 'Ich' }],
      type:         sessionType,
      persons:      [],
      date:         sessionDate,
      status:       'done',
      source:       'scan_import',
      utterances:   parsed.utterances,
      transcriptId: null,
      duration:     parsed.duration,
      processedAt:  new Date().toISOString(),
    };

    sessions.unshift(session);
    await saveSessions();

    // Zurücksetzen
    _scanFiles = [];
    document.getElementById('scanFileInput').value = '';
    document.getElementById('scanLabel').value = '';
    statusEl.textContent = '';
    _renderScanFileList();
    startBtn.setAttribute('disabled', '');
    startBtn.style.opacity = '0.4';
    startBtn.style.pointerEvents = 'none';

    closeUploadPanel();
    renderSessionsList();
    currentSessionId = session.id;
    showTranscript(session);
    showToast(`„${label}" erstellt ✓`, 'success');

  } catch (err) {
    console.error('[Scan] Fehler:', err);
    showToast('Scan fehlgeschlagen: ' + err.message, 'error');
    startBtn.removeAttribute('disabled');
    startBtn.style.opacity = '1';
    startBtn.style.pointerEvents = '';
  }
}

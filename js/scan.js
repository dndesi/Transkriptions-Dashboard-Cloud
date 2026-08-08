// ═══════════════════════════════════════════════════
// SCAN-IMPORT  (v6.28)
// Fotos von handschriftlichen Notizen/Dokumenten → Claude Vision OCR
// → Session (kein Dialog, ein Sprecher). Mehrere Fotos = eine Notiz.
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
}

// ── Foto(s) ausgewählt (mehrfach möglich, additiv) ───
function handleScanFileSelect(event) {
  const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
  event.target.value = '';
  if (!files.length) return;

  _scanFiles = _scanFiles.concat(files);

  const statusEl = document.getElementById('scanStatus');
  statusEl.style.color = 'var(--green)';
  statusEl.textContent = `✓ ${_scanFiles.length} Foto${_scanFiles.length > 1 ? 's' : ''} ausgewählt`;

  const startBtn = document.getElementById('scanStartBtn');
  startBtn.removeAttribute('disabled');
  startBtn.style.opacity = '1';
  startBtn.style.pointerEvents = '';
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

// ── Scan verarbeiten: alle Fotos → ein Text → eine Session ──
async function startScanImport() {
  if (!_scanFiles.length) return;
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt.', 'warning'); return; }

  const startBtn = document.getElementById('scanStartBtn');
  const statusEl = document.getElementById('scanStatus');
  startBtn.setAttribute('disabled', '');
  startBtn.style.opacity = '0.4';
  startBtn.style.pointerEvents = 'none';

  try {
    const pageTexts = [];
    for (let i = 0; i < _scanFiles.length; i++) {
      statusEl.style.color = 'var(--muted)';
      statusEl.textContent = `⏳ Text wird erkannt (${i + 1}/${_scanFiles.length})…`;
      const text = await _ocrImage(_scanFiles[i]);
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

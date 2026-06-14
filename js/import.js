// ═══════════════════════════════════════════════════
// SAMSUNG TRANSKRIPT IMPORT  (v4.71)
// Parst Samsung Voice Recorder TXT (UTF-16 LE)
// und erstellt eine fertige Session ohne AssemblyAI.
// ═══════════════════════════════════════════════════

let _importParsedData = null; // { speakers, utterances, duration }
let _importAudioFile  = null;

// ── Tab-Umschalter ──────────────────────────────────
function openAudioTab() {
  document.getElementById('audioTabBtn').classList.add('upload-tab-active');
  document.getElementById('importTabBtn').classList.remove('upload-tab-active');
  document.getElementById('audioTabContent').style.display = '';
  document.getElementById('importTabContent').style.display = 'none';
  document.querySelector('.upload-panel-head h3').innerHTML =
    `<i data-lucide="mic" style="width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none"></i> Transkribieren`;
  if (window.lucide) lucide.createIcons();
}

function openImportTab() {
  document.getElementById('importTabBtn').classList.add('upload-tab-active');
  document.getElementById('audioTabBtn').classList.remove('upload-tab-active');
  document.getElementById('importTabContent').style.display = '';
  document.getElementById('audioTabContent').style.display = 'none';
  document.querySelector('.upload-panel-head h3').innerHTML =
    `<i data-lucide="file-text" style="width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none"></i> Importieren`;
  if (window.lucide) lucide.createIcons();
}

// ── Datei ausgewählt (TXT oder PDF) ─────────────────
async function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('importTxtStatus');
  statusEl.style.color = 'var(--muted)';
  statusEl.textContent = '⏳ Wird geladen…';

  try {
    let parsed;

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      // ── PDF ──────────────────────────────────────────
      const text = await extractPdfText(file);
      parsed = parsePlainText(text);
      if (!parsed || parsed.utterances.length === 0) {
        showToast('PDF konnte nicht gelesen werden oder ist leer.', 'warning');
        statusEl.textContent = '';
        return;
      }
    } else {
      // ── TXT (Samsung oder Fließtext) ─────────────────
      const buffer = await file.arrayBuffer();
      const bytes  = new Uint8Array(buffer);
      let text;
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        text = new TextDecoder('utf-16le').decode(buffer);
      } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        text = new TextDecoder('utf-16be').decode(buffer);
      } else {
        text = new TextDecoder('utf-8').decode(buffer);
      }

      // Autoerkennung: Samsung-Format oder Fließtext
      const samsungParsed = parseSamsungTranscript(text);
      if (samsungParsed && samsungParsed.utterances.length > 0) {
        parsed = samsungParsed;
      } else {
        parsed = parsePlainText(text);
      }

      if (!parsed || parsed.utterances.length === 0) {
        showToast('Datei ist leer oder konnte nicht gelesen werden.', 'warning');
        statusEl.textContent = '';
        return;
      }
    }

    _importParsedData = parsed;
    const speakerInfo = parsed.speakers.length > 1
      ? `${parsed.speakers.length} Sprecher`
      : '1 Sprecher';
    statusEl.style.color = 'var(--green)';
    statusEl.textContent = `✓ ${file.name} · ${parsed.utterances.length} Absätze · ${speakerInfo}`;
    renderImportSpeakerFields(parsed.speakers);
    document.getElementById('importStartBtn').removeAttribute('disabled');
    document.getElementById('importStartBtn').style.opacity = '1';
    document.getElementById('importStartBtn').style.pointerEvents = '';
  } catch (err) {
    showToast('Fehler beim Lesen der Datei: ' + err.message, 'error');
    statusEl.textContent = '';
  }
}

// ── PDF-Text extrahieren (PDF.js) ───────────────────
async function extractPdfText(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js nicht geladen.');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageStr = content.items.map(item => item.str).join(' ');
    pageTexts.push(pageStr);
  }
  return pageTexts.join('\n\n');
}

// ── Fließtext parsen (ein Sprecher, Absätze = Utterances) ──
function parsePlainText(text) {
  text = text.replace(/^﻿/, '').trim(); // BOM entfernen

  // Absätze: durch Leerzeilen getrennt; fallback: alle 500 Zeichen splitten
  let paragraphs = text.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p.length > 0);

  // Wenn nur ein langer Block (keine Leerzeilen) → nach Satzenden splitten
  if (paragraphs.length === 1 && paragraphs[0].length > 800) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];
    // Sätze zu ~300-Zeichen-Chunks zusammenfassen
    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      if (buf.length + s.length > 300 && buf.length > 0) { chunks.push(buf.trim()); buf = ''; }
      buf += ' ' + s;
    }
    if (buf.trim()) chunks.push(buf.trim());
    paragraphs = chunks;
  }

  const INTERVAL_MS = 5000; // 5 Sekunden pro Absatz (fiktiv, kein Audio)
  const utterances = paragraphs.map((p, i) => ({
    speaker: 'A',
    text:    p,
    start:   i * INTERVAL_MS,
    end:     (i + 1) * INTERVAL_MS,
  }));

  const speakers = [{ id: 'A', label: 'Sprecher 1', name: '' }];
  const duration = utterances.length * INTERVAL_MS / 1000;

  return { speakers, utterances, duration };
}

// ── Parser ──────────────────────────────────────────
function parseSamsungTranscript(text) {
  text = text.replace(/^﻿/, ''); // BOM entfernen

  const lines    = text.split(/\r?\n/);
  const letters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const speakerMap = new Map(); // "Sprecher 1" → "A"

  // Erkennt "Sprecher 1  (00:06)" oder "Sprecher 2  (01:17:05)"
  const headerRe = /^(.+?)\s{2,}\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*$/;

  const utterances = [];
  let cur = null; // { speaker, start, lines[] }

  const flush = () => {
    if (cur && cur.lines.length > 0) {
      utterances.push({
        speaker: cur.speaker,
        text:    cur.lines.join(' ').trim(),
        start:   cur.start,
        end:     cur.start + 5000,
      });
    }
    cur = null;
  };

  const toMs = (str) => {
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }

    const m = t.match(headerRe);
    if (m) {
      flush();
      const label = m[1].trim();
      if (!speakerMap.has(label)) {
        speakerMap.set(label, letters[speakerMap.size] || `X${speakerMap.size}`);
      }
      cur = { speaker: speakerMap.get(label), start: toMs(m[2]), lines: [] };
    } else if (cur) {
      cur.lines.push(t);
    }
  }
  flush();

  // end-Zeiten korrigieren: jede Utterance endet beim Start der nächsten
  for (let i = 0; i < utterances.length - 1; i++) {
    utterances[i].end = utterances[i + 1].start;
  }

  const speakers = Array.from(speakerMap.entries()).map(([label, id]) => ({
    id, label, name: '',
  }));

  const last    = utterances[utterances.length - 1];
  const duration = last ? Math.ceil(last.end / 1000) : 0;

  return { speakers, utterances, duration };
}

// ── Sprecher-Felder dynamisch rendern ───────────────
function renderImportSpeakerFields(speakers) {
  const container = document.getElementById('importSpeakerFields');
  if (!container) return;

  const colors = {
    A: 'var(--speaker-a)',
    B: 'var(--speaker-b)',
    C: 'var(--speaker-c)',
    D: 'var(--speaker-d)',
  };

  container.innerHTML = `
    <div style="margin-bottom:6px;font-size:0.75rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.06em">
      Sprecher benennen
    </div>
    ${speakers.map(sp => `
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
        <span style="width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${colors[sp.id] || 'var(--speaker-extra)'}"></span>
        <span style="font-size:0.8rem;color:var(--muted);flex-shrink:0;width:70px">${sp.label}</span>
        <input
          type="text"
          placeholder="Name…"
          data-sid="${sp.id}"
          oninput="updateImportSpeakerName('${sp.id}', this.value)"
          style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:7px 10px;font-size:0.85rem;outline:none"
        />
      </div>
    `).join('')}
  `;
  container.style.display = '';
}

function updateImportSpeakerName(id, name) {
  if (!_importParsedData) return;
  const sp = _importParsedData.speakers.find(s => s.id === id);
  if (sp) sp.name = name.trim();
}

// ── Optionale M4A-Datei ─────────────────────────────
function handleImportAudioSelect(event) {
  _importAudioFile = event.target.files[0] || null;
  if (_importAudioFile) {
    document.getElementById('importAudioStatus').textContent = `🎵 ${_importAudioFile.name}`;
  }
}

// ── Session erstellen + speichern ───────────────────
async function startSamsungImport() {
  if (!_importParsedData || _importParsedData.utterances.length === 0) return;

  const label = document.getElementById('importLabel').value.trim()
    || `Gespräch ${new Date().toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' })}`;
  const dateInputVal  = document.getElementById('importDate').value;
  const sessionDate   = dateInputVal ? new Date(dateInputVal).toISOString() : new Date().toISOString();
  const sessionType   = document.getElementById('importType')?.value || 'privat';
  const personsRaw    = document.getElementById('importPersons')?.value || '';
  const sessionPersons = personsRaw.split(',').map(p => p.trim()).filter(Boolean);

  // Sprecher mit finalem Namen
  const speakers = _importParsedData.speakers.map(sp => ({
    id:    sp.id,
    label: sp.label,
    name:  sp.name || sp.label,
  }));

  const spA = speakers.find(s => s.id === 'A');
  const spB = speakers.find(s => s.id === 'B');

  const srcFile = document.getElementById('importTxtInput').files[0];
  const isPdf   = srcFile?.name?.toLowerCase().endsWith('.pdf');
  const isPlain = srcFile && !isPdf && _importParsedData?.speakers?.length === 1;
  const source  = isPdf ? 'pdf_import' : isPlain ? 'txt_import' : 'samsung_import';

  const session = {
    id:           Date.now().toString(),
    label,
    filename:     _importAudioFile ? _importAudioFile.name : (srcFile?.name || 'import.txt'),
    speakerA:     spA?.name || 'Sprecher A',
    speakerB:     spB?.name || 'Sprecher B',
    speakers,                          // multi-speaker Array
    type:         sessionType,
    persons:      sessionPersons,
    date:         sessionDate,
    status:       'done',
    source,                            // samsung_import | txt_import | pdf_import
    utterances:   _importParsedData.utterances,
    transcriptId: null,
    duration:     _importParsedData.duration,
    processedAt:  new Date().toISOString(),
  };

  sessions.unshift(session);
  saveSessions();

  // Audio optional in Drive archivieren
  if (_importAudioFile) {
    saveToArchive(session, _importAudioFile).catch(() => {});
  }

  // Zurücksetzen
  _importParsedData = null;
  _importAudioFile  = null;
  document.getElementById('importTxtInput').value = '';
  document.getElementById('importTxtStatus').textContent = '';
  document.getElementById('importSpeakerFields').innerHTML = '';
  document.getElementById('importSpeakerFields').style.display = 'none';
  document.getElementById('importStartBtn').setAttribute('disabled', '');
  document.getElementById('importStartBtn').style.opacity = '0.4';
  document.getElementById('importStartBtn').style.pointerEvents = 'none';

  currentSessionId = session.id;
  closeUploadPanel();
  renderSessionsList();
  showSession(session.id);
  showToast(`„${label}" importiert ✓`, 'success');
}

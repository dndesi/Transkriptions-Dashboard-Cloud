// ═══════════════════════════════════════════════════
// SAMSUNG TRANSKRIPT IMPORT  (v4.71)
// Parst Samsung Voice Recorder TXT (UTF-16 LE)
// und erstellt eine fertige Session ohne AssemblyAI.
// ═══════════════════════════════════════════════════

let _importParsedDataList = []; // [{ filename, parsed }]  (v4.93: multi-file)
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

// ── Datei(en) ausgewählt (TXT oder PDF, mehrere möglich) ─────────────────
async function handleImportFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const statusEl = document.getElementById('importTxtStatus');
  statusEl.style.color = 'var(--muted)';
  statusEl.textContent = `⏳ ${files.length > 1 ? files.length + ' Dateien werden' : '1 Datei wird'} geladen…`;

  _importParsedDataList = [];
  let totalUtterances = 0;
  let errors = 0;

  for (const file of files) {
    try {
      let parsed;
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const text = await extractPdfText(file);
        parsed = parsePlainText(text);
      } else {
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
        const samsungParsed = parseSamsungTranscript(text);
        parsed = (samsungParsed && samsungParsed.utterances.length > 0)
          ? samsungParsed
          : parsePlainText(text);
      }

      if (!parsed || parsed.utterances.length === 0) {
        errors++;
        continue;
      }
      _importParsedDataList.push({ filename: file.name, parsed });
      totalUtterances += parsed.utterances.length;
    } catch (e) {
      errors++;
      console.warn('[import] Fehler bei Datei', file.name, e.message);
    }
  }

  if (_importParsedDataList.length === 0) {
    showToast('Keine Datei konnte gelesen werden.', 'warning');
    statusEl.textContent = '';
    return;
  }

  const count = _importParsedDataList.length;
  const errNote = errors > 0 ? ` (${errors} fehlerhaft)` : '';
  statusEl.style.color = 'var(--green)';
  if (count === 1) {
    const { filename, parsed } = _importParsedDataList[0];
    const spInfo = parsed.speakers.length > 1 ? `${parsed.speakers.length} Sprecher` : '1 Sprecher';
    statusEl.textContent = `✓ ${filename} · ${parsed.utterances.length} Absätze · ${spInfo}${errNote}`;
  } else {
    statusEl.textContent = `✓ ${count} Dateien · ${totalUtterances} Absätze gesamt${errNote}`;
  }

  // Sprecher-Felder aus der ersten Datei zeigen (v4.97: im gleichen Step wie Upload)
  const spSection = document.getElementById('importSpeakerSection');
  if (spSection) spSection.style.display = '';
  renderImportSpeakerFields(_importParsedDataList[0].parsed.speakers);
  document.getElementById('importStartBtn').removeAttribute('disabled');
  document.getElementById('importStartBtn').style.opacity = '1';
  document.getElementById('importStartBtn').style.pointerEvents = '';
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
  // Sprecher-Umbenennung für alle geladenen Dateien übernehmen (v4.93)
  for (const entry of _importParsedDataList) {
    const sp = entry.parsed.speakers.find(s => s.id === id);
    if (sp) sp.name = name.trim();
  }
}

// ── Optionale M4A-Datei ─────────────────────────────
function handleImportAudioSelect(event) {
  _importAudioFile = event.target.files[0] || null;
  if (_importAudioFile) {
    document.getElementById('importAudioStatus').textContent = `🎵 ${_importAudioFile.name}`;
  }
}

// ── Session(s) erstellen + speichern (v4.93: multi-file) ────────────────
async function startSamsungImport() {
  if (!_importParsedDataList.length) return;

  const customLabel = document.getElementById('importLabel').value.trim();
  const dateInputVal   = document.getElementById('importDate').value;
  const sessionDate    = dateInputVal ? new Date(dateInputVal).toISOString() : new Date().toISOString();
  const sessionType    = document.getElementById('importType')?.value || 'privat';
  const personsRaw     = document.getElementById('importPersons')?.value || '';
  const sessionPersons = personsRaw.split(',').map(p => p.trim()).filter(Boolean);

  const createdSessions = [];
  const baseTimestamp   = Date.now();

  for (let i = 0; i < _importParsedDataList.length; i++) {
    const { filename, parsed } = _importParsedDataList[i];

    // Label: Freitextfeld nur bei Einzeldatei; sonst Dateiname ohne Extension
    const label = (_importParsedDataList.length === 1 && customLabel)
      ? customLabel
      : filename.replace(/\.[^.]+$/, '');

    const speakers = parsed.speakers.map(sp => ({
      id:    sp.id,
      label: sp.label,
      name:  sp.name || sp.label,
    }));

    const spA = speakers.find(s => s.id === 'A');
    const spB = speakers.find(s => s.id === 'B');

    const isPdf   = filename.toLowerCase().endsWith('.pdf');
    const isPlain = !isPdf && parsed.speakers.length === 1;
    const source  = isPdf ? 'pdf_import' : isPlain ? 'txt_import' : 'samsung_import';

    const session = {
      id:           (baseTimestamp + i).toString(),
      label,
      filename,
      speakerA:     spA?.name || 'Sprecher A',
      speakerB:     spB?.name || 'Sprecher B',
      speakers,
      type:         sessionType,
      persons:      sessionPersons,
      date:         sessionDate,
      status:       'done',
      source,
      utterances:   parsed.utterances,
      transcriptId: null,
      duration:     parsed.duration,
      processedAt:  new Date().toISOString(),
    };

    sessions.unshift(session);
    createdSessions.push(session);
  }

  await saveSessions();

  // Audio (nur bei Einzeldatei) in Drive archivieren
  if (_importAudioFile && createdSessions.length === 1) {
    saveToArchive(createdSessions[0], _importAudioFile).catch(() => {});
  }

  // Zurücksetzen
  _importParsedDataList = [];
  _importAudioFile  = null;
  document.getElementById('importTxtInput').value = '';
  document.getElementById('importTxtStatus').textContent = '';
  document.getElementById('importSpeakerFields').innerHTML = '';
  const spSec = document.getElementById('importSpeakerSection');
  if (spSec) spSec.style.display = 'none';
  document.getElementById('importStartBtn').setAttribute('disabled', '');
  document.getElementById('importStartBtn').style.opacity = '0.4';
  document.getElementById('importStartBtn').style.pointerEvents = 'none';

  closeUploadPanel();
  renderSessionsList();

  const lastSession = createdSessions[0]; // neueste (unshifted zuerst)
  currentSessionId = lastSession.id;
  showSession(lastSession.id);

  if (createdSessions.length === 1) {
    showToast(`„${lastSession.label}" importiert ✓`, 'success');
  } else {
    showToast(`${createdSessions.length} Sitzungen importiert ✓`, 'success');
  }
}

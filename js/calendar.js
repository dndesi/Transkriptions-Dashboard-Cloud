// ═══════════════════════════════════════════════════
// CALENDAR.JS – Google Calendar + Gmail Integration v3.2
// Termine aus Transkript extrahieren & in Kalender/Gmail speichern
// ═══════════════════════════════════════════════════

// ── State ────────────────────────────────────────────
let calendarEvents   = [];   // Extrahierte Termine der aktuellen Session
let gmailDrafts      = [];   // Extrahierte E-Mail-Entwürfe der aktuellen Session
let calendarSession  = null; // Session für die gerade analysiert wird

// ═══════════════════════════════════════════════════
// GOOGLE CALENDAR
// ═══════════════════════════════════════════════════

// ── Termine aus Transkript extrahieren (via Claude) ──
async function extractCalendarEvents(session) {
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt', 'error'); return; }

  const transcript = (session.utterances || [])
    .map(u => `[${u.speaker}] ${u.text}`).join('\n');
  if (!transcript.trim()) { showToast('Kein Transkript vorhanden', 'error'); return; }

  calendarSession = session;
  const btn = document.getElementById('calExtractBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Extrahiere…'; }

  const dateStr = session.date
    ? new Date(session.date).toLocaleDateString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : new Date().toLocaleDateString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const prompt = `Du analysierst ein Gesprächstranskript und extrahierst ALLE erwähnten Termine, Meetings, Deadlines und zeitgebundenen Aufgaben.

AUFNAHMEDATUM: ${dateStr}
TRANSKRIPT:
${transcript.slice(0, 8000)}

Antworte NUR mit gültigem JSON (kein Markdown, keine Erklärungen):
{
  "events": [
    {
      "title": "Kurzer Titel des Termins",
      "description": "Details aus dem Gespräch (wer, warum, Kontext)",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "duration": 60,
      "location": "Ort oder 'Online' oder ''",
      "attendees": ["Name1", "Name2"],
      "priority": "hoch|mittel|niedrig"
    }
  ],
  "summary": "Kurze Zusammenfassung was gefunden wurde"
}

Regeln:
- Nur konkret erwähnte Termine (keine vagen "irgendwann mal")
- Falls kein Datum genannt: schätze realistisch basierend auf Kontext ("nächste Woche" = +7 Tage vom Aufnahmedatum)
- Falls keine Uhrzeit: setze sinnvolle Arbeitszeit (09:00, 10:00, 14:00 etc.)
- duration in Minuten (Standard: 60)
- Falls keine Termine: events = []`;

  try {
    const { text } = await callClaudeAPI(prompt);
    const data = extractJSON(text);
    calendarEvents = data.events || [];

    renderCalendarEvents(calendarEvents);
    if (data.summary) {
      const sumEl = document.getElementById('calSummary');
      if (sumEl) sumEl.textContent = data.summary;
    }

    if (calendarEvents.length === 0) {
      showToast('Keine Termine im Transkript gefunden', 'info');
    } else {
      showToast(`${calendarEvents.length} Termin${calendarEvents.length !== 1 ? 'e' : ''} gefunden`, 'success');
    }
  } catch(e) {
    showToast('Fehler beim Extrahieren: ' + e.message, 'error');
    console.error('[Calendar] Extract error:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Termine extrahieren'; }
  }
}

// ── Termine rendern ───────────────────────────────────
function renderCalendarEvents(events) {
  const container = document.getElementById('calEventsList');
  if (!container) return;

  if (!events.length) {
    container.innerHTML = '<div class="cal-empty">Keine Termine gefunden.<br><span style="opacity:0.6;font-size:0.8rem">Klicke auf „Termine extrahieren" um das Transkript zu analysieren.</span></div>';
    return;
  }

  container.innerHTML = events.map((ev, i) => {
    const priorityColor = ev.priority === 'hoch' ? 'var(--red)' : ev.priority === 'mittel' ? 'var(--yellow)' : 'var(--green)';
    const attendeesHtml = (ev.attendees || []).length
      ? `<div class="cal-ev-attendees">👥 ${ev.attendees.map(a => escHtml(a)).join(', ')}</div>`
      : '';
    const locationHtml = ev.location
      ? `<div class="cal-ev-location">📍 ${escHtml(ev.location)}</div>`
      : '';
    const dateTime = ev.date && ev.time
      ? `${ev.date} um ${ev.time} Uhr (${ev.duration || 60} Min.)`
      : ev.date ? ev.date : 'Kein Datum';

    return `<div class="cal-event-card" id="cal-ev-${i}">
      <div class="cal-ev-header">
        <div class="cal-ev-title">${escHtml(ev.title)}</div>
        <span class="cal-ev-priority" style="color:${priorityColor}">●</span>
      </div>
      <div class="cal-ev-datetime">📅 ${escHtml(dateTime)}</div>
      ${locationHtml}
      ${attendeesHtml}
      ${ev.description ? `<div class="cal-ev-desc">${escHtml(ev.description)}</div>` : ''}
      <div class="cal-ev-actions">
        <button class="btn-small btn-primary" onclick="createCalendarEvent(${i})">
          📆 In Kalender
        </button>
        <button class="btn-small btn-ghost" onclick="editCalendarEvent(${i})">
          ✏️ Bearbeiten
        </button>
      </div>
    </div>`;
  }).join('');
}

// ── Termin in Google Calendar erstellen ──────────────
async function createCalendarEvent(index) {
  if (!driveToken) { showToast('Bitte zuerst Google verbinden', 'error'); return; }

  const ev = calendarEvents[index];
  if (!ev) return;

  const btn = document.querySelector(`#cal-ev-${index} .btn-primary`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }

  try {
    // RFC3339 Datum/Zeit bauen
    const startDt = buildRFC3339(ev.date, ev.time);
    const endDt   = buildRFC3339(ev.date, ev.time, ev.duration || 60);

    const body = {
      summary:     ev.title,
      description: ev.description || '',
      location:    ev.location || '',
      start: { dateTime: startDt, timeZone: 'Europe/Berlin' },
      end:   { dateTime: endDt,   timeZone: 'Europe/Berlin' },
      attendees: (ev.attendees || []).map(name => ({ displayName: name })),
    };

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + driveToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const created = await res.json();
    showToast(`✅ Termin erstellt: ${ev.title}`, 'success');

    // Card als "erstellt" markieren
    const card = document.getElementById(`cal-ev-${index}`);
    if (card) {
      card.classList.add('cal-ev-done');
      if (btn) { btn.textContent = '✅ Erstellt'; btn.disabled = true; }
      // Link zum Event anzeigen
      if (created.htmlLink) {
        const link = document.createElement('a');
        link.href    = created.htmlLink;
        link.target  = '_blank';
        link.textContent = '🔗 Im Kalender öffnen';
        link.className = 'cal-ev-link';
        card.appendChild(link);
      }
    }
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
    console.error('[Calendar] Create error:', e);
    if (btn) { btn.disabled = false; btn.textContent = '📆 In Kalender'; }
  }
}

// ── Termin bearbeiten (inline Edit) ──────────────────
function editCalendarEvent(index) {
  const ev = calendarEvents[index];
  if (!ev) return;
  const card = document.getElementById(`cal-ev-${index}`);
  if (!card) return;

  card.innerHTML = `
    <div class="cal-ev-edit">
      <input class="cal-edit-input" id="cal-edit-title-${index}" value="${escHtml(ev.title)}" placeholder="Titel">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <input class="cal-edit-input" id="cal-edit-date-${index}" type="date" value="${ev.date || ''}">
        <input class="cal-edit-input" id="cal-edit-time-${index}" type="time" value="${ev.time || '09:00'}">
      </div>
      <input class="cal-edit-input" id="cal-edit-location-${index}" value="${escHtml(ev.location || '')}" placeholder="Ort (optional)">
      <textarea class="cal-edit-input" id="cal-edit-desc-${index}" rows="2" placeholder="Beschreibung">${escHtml(ev.description || '')}</textarea>
      <div class="cal-ev-actions">
        <button class="btn-small btn-primary" onclick="saveCalendarEdit(${index})">✅ Speichern & in Kalender</button>
        <button class="btn-small btn-ghost" onclick="cancelCalendarEdit(${index})">✕ Abbrechen</button>
      </div>
    </div>`;
}

function saveCalendarEdit(index) {
  const ev = calendarEvents[index];
  if (!ev) return;
  ev.title       = document.getElementById(`cal-edit-title-${index}`)?.value || ev.title;
  ev.date        = document.getElementById(`cal-edit-date-${index}`)?.value || ev.date;
  ev.time        = document.getElementById(`cal-edit-time-${index}`)?.value || ev.time;
  ev.location    = document.getElementById(`cal-edit-location-${index}`)?.value || '';
  ev.description = document.getElementById(`cal-edit-desc-${index}`)?.value || '';
  renderCalendarEvents(calendarEvents);
  createCalendarEvent(index);
}

function cancelCalendarEdit(index) {
  renderCalendarEvents(calendarEvents);
}

// ── RFC3339 Hilfsfunktion ────────────────────────────
function buildRFC3339(dateStr, timeStr, addMinutes = 0) {
  // dateStr = 'YYYY-MM-DD', timeStr = 'HH:MM'
  const [year, month, day] = (dateStr || new Date().toISOString().slice(0,10)).split('-').map(Number);
  const [hour, min]        = (timeStr || '09:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, min + addMinutes);
  // Manuell auf Europe/Berlin (CET +1 / CEST +2) formatieren – wir übergeben timeZone separat
  const pad = n => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// ── Kalender-Modal öffnen/schließen ─────────────────
function openCalendarModal(session) {
  calendarSession = session || (sessions || []).find(s => s.id === currentSessionId);
  if (!calendarSession) { showToast('Keine Sitzung ausgewählt', 'error'); return; }

  // Reset
  calendarEvents = [];
  document.getElementById('calEventsList').innerHTML =
    '<div class="cal-empty">Klicke auf „Termine extrahieren" um das Transkript zu analysieren.</div>';
  document.getElementById('calSummary').textContent = '';
  document.getElementById('calSessionName').textContent = calendarSession.label || 'Unbenannt';
  document.getElementById('calModal').classList.add('open');
}

function closeCalendarModal() {
  document.getElementById('calModal').classList.remove('open');
}

// Direkt extrahieren & öffnen
function openCalendarModalAndExtract(session) {
  openCalendarModal(session);
  setTimeout(() => extractCalendarEvents(calendarSession), 200);
}

// ═══════════════════════════════════════════════════
// GMAIL
// ═══════════════════════════════════════════════════

// ── E-Mail-Entwürfe aus Transkript extrahieren ───────
async function extractEmailDrafts(session) {
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt', 'error'); return; }

  const transcript = (session.utterances || [])
    .map(u => `[${u.speaker}] ${u.text}`).join('\n');
  if (!transcript.trim()) { showToast('Kein Transkript vorhanden', 'error'); return; }

  const btn = document.getElementById('mailExtractBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analysiere…'; }

  const prompt = `Du analysierst ein Gesprächstranskript und erstellst professionelle E-Mail-Entwürfe für alle erwähnten Kommunikationsaufgaben.

TRANSKRIPT:
${transcript.slice(0, 8000)}

Antworte NUR mit gültigem JSON (kein Markdown, keine Erklärungen):
{
  "drafts": [
    {
      "subject": "Betreff der E-Mail",
      "to": "Empfänger Name oder E-Mail (falls genannt)",
      "body": "Vollständiger E-Mail-Text auf Deutsch, professionell formuliert",
      "context": "Kurze Erklärung warum diese Mail nötig ist",
      "priority": "hoch|mittel|niedrig"
    }
  ],
  "summary": "Kurze Zusammenfassung was gefunden wurde"
}

Regeln:
- Nur wenn konkret eine E-Mail, Nachricht oder Kontaktaufnahme erwähnt wurde
- Professioneller, höflicher Ton auf Deutsch
- Vollständige E-Mail (Anrede, Text, Grußformel)
- Falls keine E-Mails nötig: drafts = []`;

  try {
    const { text } = await callClaudeAPI(prompt);
    const data = extractJSON(text);
    gmailDrafts = data.drafts || [];

    renderGmailDrafts(gmailDrafts);
    if (data.summary) {
      const sumEl = document.getElementById('mailSummary');
      if (sumEl) sumEl.textContent = data.summary;
    }

    if (gmailDrafts.length === 0) {
      showToast('Keine E-Mails im Transkript identifiziert', 'info');
    } else {
      showToast(`${gmailDrafts.length} E-Mail-Entwurf${gmailDrafts.length !== 1 ? 'e' : ''} erstellt`, 'success');
    }
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
    console.error('[Gmail] Extract error:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📝 E-Mails ableiten'; }
  }
}

// ── Entwürfe rendern ──────────────────────────────────
function renderGmailDrafts(drafts) {
  const container = document.getElementById('mailDraftsList');
  if (!container) return;

  if (!drafts.length) {
    container.innerHTML = '<div class="cal-empty">Keine E-Mail-Aufgaben gefunden.<br><span style="opacity:0.6;font-size:0.8rem">Klicke auf „E-Mails ableiten" um das Transkript zu analysieren.</span></div>';
    return;
  }

  container.innerHTML = drafts.map((d, i) => {
    const priorityColor = d.priority === 'hoch' ? 'var(--red)' : d.priority === 'mittel' ? 'var(--yellow)' : 'var(--green)';
    return `<div class="mail-draft-card" id="mail-draft-${i}">
      <div class="cal-ev-header">
        <div class="cal-ev-title">✉️ ${escHtml(d.subject)}</div>
        <span class="cal-ev-priority" style="color:${priorityColor}">●</span>
      </div>
      ${d.to ? `<div class="mail-to">An: <strong>${escHtml(d.to)}</strong></div>` : ''}
      ${d.context ? `<div class="mail-context">💡 ${escHtml(d.context)}</div>` : ''}
      <div class="mail-body-preview">${escHtml(d.body.slice(0, 150))}${d.body.length > 150 ? '…' : ''}</div>
      <div class="cal-ev-actions">
        <button class="btn-small btn-primary" onclick="createGmailDraft(${i})">📬 Als Entwurf speichern</button>
        <button class="btn-small btn-ghost" onclick="editGmailDraft(${i})">✏️ Bearbeiten</button>
        <button class="btn-small btn-ghost" onclick="toggleMailBodyFull(${i})">👁 Volltext</button>
      </div>
      <div class="mail-body-full" id="mail-body-full-${i}" style="display:none">
        <pre class="mail-body-text">${escHtml(d.body)}</pre>
      </div>
    </div>`;
  }).join('');
}

function toggleMailBodyFull(index) {
  const el = document.getElementById(`mail-body-full-${index}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── E-Mail-Entwurf bearbeiten ─────────────────────────
function editGmailDraft(index) {
  const d = gmailDrafts[index];
  if (!d) return;
  const card = document.getElementById(`mail-draft-${index}`);
  if (!card) return;

  card.innerHTML = `
    <div class="cal-ev-edit">
      <input class="cal-edit-input" id="mail-edit-to-${index}" value="${escHtml(d.to || '')}" placeholder="An (E-Mail-Adresse)">
      <input class="cal-edit-input" id="mail-edit-subj-${index}" value="${escHtml(d.subject)}" placeholder="Betreff">
      <textarea class="cal-edit-input" id="mail-edit-body-${index}" rows="8" placeholder="E-Mail-Text">${escHtml(d.body)}</textarea>
      <div class="cal-ev-actions">
        <button class="btn-small btn-primary" onclick="saveMailEdit(${index})">✅ Speichern & als Entwurf</button>
        <button class="btn-small btn-ghost" onclick="cancelMailEdit(${index})">✕ Abbrechen</button>
      </div>
    </div>`;
}

function saveMailEdit(index) {
  const d = gmailDrafts[index];
  if (!d) return;
  d.to      = document.getElementById(`mail-edit-to-${index}`)?.value || d.to;
  d.subject = document.getElementById(`mail-edit-subj-${index}`)?.value || d.subject;
  d.body    = document.getElementById(`mail-edit-body-${index}`)?.value || d.body;
  renderGmailDrafts(gmailDrafts);
  createGmailDraft(index);
}

function cancelMailEdit(index) {
  renderGmailDrafts(gmailDrafts);
}

// ── Entwurf in Gmail speichern ────────────────────────
async function createGmailDraft(index) {
  if (!driveToken) { showToast('Bitte zuerst Google verbinden', 'error'); return; }

  const d = gmailDrafts[index];
  if (!d) return;

  const btn = document.querySelector(`#mail-draft-${index} .btn-primary`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }

  try {
    // RFC 2822 E-Mail aufbauen (Base64url encoded)
    const toHeader = d.to ? `To: ${d.to}\r\n` : '';
    const rawEmail = [
      toHeader,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(d.subject)))}?=\r\n`,
      'MIME-Version: 1.0\r\n',
      'Content-Type: text/plain; charset=UTF-8\r\n',
      'Content-Transfer-Encoding: base64\r\n',
      '\r\n',
      btoa(unescape(encodeURIComponent(d.body)))
    ].join('');

    // Base64url encoden
    const encoded = btoa(rawEmail)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch(`${GMAIL_API}/users/me/drafts`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + driveToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw: encoded } }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    showToast(`✅ Entwurf gespeichert: ${d.subject}`, 'success');
    const card = document.getElementById(`mail-draft-${index}`);
    if (card) {
      card.classList.add('cal-ev-done');
      if (btn) { btn.textContent = '✅ In Gmail'; btn.disabled = true; }
      // Link zu Gmail Entwürfen
      const link = document.createElement('a');
      link.href    = 'https://mail.google.com/mail/#drafts';
      link.target  = '_blank';
      link.textContent = '📬 Entwürfe in Gmail öffnen';
      link.className = 'cal-ev-link';
      card.appendChild(link);
    }
  } catch(e) {
    showToast('Fehler: ' + e.message, 'error');
    console.error('[Gmail] Draft error:', e);
    if (btn) { btn.disabled = false; btn.textContent = '📬 Als Entwurf speichern'; }
  }
}

// ── Gmail-Modal öffnen/schließen ─────────────────────
function openGmailModal(session) {
  const s = session || (sessions || []).find(s => s.id === currentSessionId);
  if (!s) { showToast('Keine Sitzung ausgewählt', 'error'); return; }

  // Reset
  gmailDrafts = [];
  document.getElementById('mailDraftsList').innerHTML =
    '<div class="cal-empty">Klicke auf „E-Mails ableiten" um das Transkript zu analysieren.</div>';
  document.getElementById('mailSummary').textContent = '';
  document.getElementById('mailSessionName').textContent = s.label || 'Unbenannt';
  document.getElementById('mailModal').classList.add('open');

  // Session für Extraktion merken
  calendarSession = s;
}

function closeGmailModal() {
  document.getElementById('mailModal').classList.remove('open');
}

function openGmailModalAndExtract(session) {
  openGmailModal(session);
  setTimeout(() => extractEmailDrafts(calendarSession), 200);
}

// ═══════════════════════════════════════════════════
// CONTACTS.JS – Kontakte-Modul v5.42
// Manuelle Kontaktebene über Projekten: Kontakt → Projekt → Sitzung
// Parallel zu Personen-System (das bleibt unverändert)
// ═══════════════════════════════════════════════════

let contacts = [];
let _contactsViewMode = localStorage.getItem('distillContactsView') || 'list';

const CONTACT_COLORS = [
  '#6b7280','#3b82f6','#8b5cf6','#ec4899',
  '#f59e0b','#10b981','#ef4444','#06b6d4',
  '#f97316','#84cc16'
];

// ── CRUD ─────────────────────────────────────────────────────────────────────

function getContacts() { return contacts; }

function createContact({ name, beziehung = '', notes = '', color = '' }) {
  if (!name?.trim()) return null;
  const c = {
    id:         'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name:       name.trim(),
    beziehung:  beziehung.trim(),
    notes:      notes.trim(),
    color:      color || CONTACT_COLORS[contacts.length % CONTACT_COLORS.length],
    createdAt:  new Date().toISOString(),
  };
  contacts.push(c);
  saveContacts();
  return c;
}

function updateContact(id, fields) {
  const idx = contacts.findIndex(c => c.id === id);
  if (idx < 0) return;
  contacts[idx] = { ...contacts[idx], ...fields };
  saveContacts();
}

function deleteContact(id) {
  contacts = contacts.filter(c => c.id !== id);
  // Projekte: kontaktId entfernen
  if (typeof projects !== 'undefined') {
    projects.forEach(p => { if (p.kontaktId === id) delete p.kontaktId; });
    if (typeof saveProjects === 'function') saveProjects({ skipDriveSync: false });
  }
  saveContacts();
}

async function saveContacts() {
  try {
    if (typeof _idbSet === 'function') await _idbSet('contacts', contacts);
    if (typeof queueSettingsSave === 'function') queueSettingsSave();
  } catch(e) {
    console.error('[contacts] saveContacts Fehler:', e);
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function getContactById(id) {
  return contacts.find(c => c.id === id) || null;
}

function getProjectsForContact(contactId) {
  if (typeof projects === 'undefined') return [];
  return projects.filter(p => p.kontaktId === contactId && !p.builtin);
}

function getSessionsForContact(contactId) {
  const cProjects = getProjectsForContact(contactId);
  if (!cProjects.length || typeof sessions === 'undefined') return [];
  const ids = new Set(cProjects.map(p => p.id));
  return sessions
    .filter(s => ids.has(s.projectId) && (s.status === 'done' || s.utterances?.length > 0))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ── Hauptansicht ─────────────────────────────────────────────────────────────

function _setContactsViewMode(mode) {
  _contactsViewMode = mode;
  localStorage.setItem('distillContactsView', mode);
  renderContactsView();
}

function renderContactsView() {
  const el = document.getElementById('contactsView');
  if (!el) return;

  const list = contacts.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));

  el.innerHTML = `
    <div style="max-width:900px; margin:0 auto; padding:4px 0 32px">

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px">
        <h2 style="font-size:1.1rem; font-weight:700; display:flex; align-items:center; gap:7px">
          ${icon('users',16)} Kontakte
          <button class="help-icon"
            data-help="Manuell angelegte Kontakte (Kunden, Kollegen, Freunde). Einem Kontakt können Projekte zugeordnet werden – so entsteht die Kette Kontakt → Projekt → Sitzung."
            onclick="showHelpTooltip(this)">?</button>
        </h2>
        <div style="display:flex; align-items:center; gap:8px">
          <div class="view-toggle">
            <button class="view-btn ${_contactsViewMode==='list'?'active':''}" onclick="_setContactsViewMode('list')" title="Listenansicht">☰</button>
            <button class="view-btn ${_contactsViewMode==='grid'?'active':''}" onclick="_setContactsViewMode('grid')" title="Kachelansicht">⊞</button>
          </div>
          <button class="btn btn-primary" onclick="openContactModal()" style="display:inline-flex;align-items:center;gap:6px">
            ${icon('plus',13,'pointer-events:none')} Neuer Kontakt
          </button>
        </div>
      </div>

      ${list.length === 0 ? `
        <div style="text-align:center; padding:48px 0; color:var(--muted); font-size:0.85rem">
          <div style="margin-bottom:12px; opacity:0.4">${icon('users',32)}</div>
          Noch keine Kontakte. Lege deinen ersten Kontakt an.
        </div>` :
        _contactsViewMode === 'list' ? _renderContactsList(list) : `
        <div class="projects-grid">
          ${list.map(c => _renderContactCard(c)).join('')}
        </div>`}
    </div>

    ${_contactModalHtml()}`;

  if (window.lucide) lucide.createIcons({ nodes: [el] });
}

function _renderContactsList(list) {
  return `
    <div style="display:flex; flex-direction:column; gap:4px">
      ${list.map(c => {
        const projs  = getProjectsForContact(c.id);
        const sess   = getSessionsForContact(c.id);
        const lastS  = sess[0];
        const lastDate = lastS
          ? new Date(lastS.date).toLocaleDateString('de-DE', { day:'numeric', month:'short', year:'numeric' })
          : '–';
        return `
          <div onclick="renderContactDetail('${c.id}')"
            style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:background 0.15s"
            onmouseover="this.style.background='rgba(108,99,255,0.07)'" onmouseout="this.style.background='var(--surface2)'">
            <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></span>
            <span style="font-weight:600;font-size:0.9rem;min-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(c.name)}</span>
            <span style="font-size:0.78rem;color:var(--accent2);min-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.beziehung ? escHtml(c.beziehung) : ''}</span>
            <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap">${projs.length} Projekt${projs.length!==1?'e':''}</span>
            <span style="font-size:0.75rem;color:var(--muted);margin-left:auto;white-space:nowrap">${lastDate !== '–' ? 'zuletzt ' + lastDate : '–'}</span>
          </div>`;
      }).join('')}
    </div>`;
}

function _renderContactCard(c) {
  const projs  = getProjectsForContact(c.id);
  const sess   = getSessionsForContact(c.id);
  const lastS  = sess[0];
  const lastDate = lastS
    ? new Date(lastS.date).toLocaleDateString('de-DE', { day:'numeric', month:'short', year:'numeric' })
    : null;

  return `
    <div class="project-card" onclick="renderContactDetail('${c.id}')"
      style="cursor:pointer; border-left:3px solid ${c.color}">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:6px">
        <div style="font-weight:700; font-size:0.95rem; color:var(--text)">${escHtml(c.name)}</div>
        <span style="font-size:0.68rem; color:var(--muted); white-space:nowrap; margin-top:2px">${projs.length} Projekt${projs.length!==1?'e':''}</span>
      </div>
      ${c.beziehung ? `<div style="font-size:0.75rem; color:var(--accent2); margin-bottom:6px">${escHtml(c.beziehung)}</div>` : ''}
      <div style="font-size:0.72rem; color:var(--muted)">
        ${sess.length} Sitzung${sess.length!==1?'en':''}
        ${lastDate ? ` · zuletzt ${lastDate}` : ''}
      </div>
    </div>`;
}

// ── Detailansicht ─────────────────────────────────────────────────────────────

function renderContactDetail(id) {
  const el = document.getElementById('contactsView');
  if (!el) return;
  const c = getContactById(id);
  if (!c) { renderContactsView(); return; }

  const projs = getProjectsForContact(id);
  const sess  = getSessionsForContact(id);

  el.innerHTML = `
    <div style="max-width:820px; margin:0 auto; padding:4px 0 32px">

      <button class="profile-back" onclick="renderContactsView()">← Alle Kontakte</button>

      <div class="profile-header">
        <div style="flex:1; min-width:0">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px">
            <span style="width:14px; height:14px; border-radius:50%; background:${c.color}; flex-shrink:0; display:inline-block"></span>
            <div class="profile-name" contenteditable="true" id="contactNameEdit"
              style="outline:none; border-bottom:1px dashed transparent"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='transparent'; _saveContactField('${c.id}','name',this.textContent)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
              >${escHtml(c.name)}</div>
          </div>
          <div style="margin-top:6px; display:flex; align-items:center; gap:8px">
            <span style="font-size:0.76rem; color:var(--muted); white-space:nowrap; display:inline-flex; align-items:center; gap:4px">
              ${icon('link',11)} Beziehung:
            </span>
            <input id="contactBeziehungEdit" type="text"
              value="${escHtml(c.beziehung)}"
              placeholder="z.B. Kunde · Freund · Kollege"
              style="flex:1; background:var(--surface2); border:1px solid var(--border); border-radius:6px; padding:5px 10px; color:var(--text); font-size:0.81rem; outline:none; transition:border-color 0.2s"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border)'; _saveContactField('${c.id}','beziehung',this.value)"
              onkeydown="if(event.key==='Enter') this.blur()" />
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:flex-start; flex-wrap:wrap">
          <button class="btn btn-ghost"
            style="color:var(--red); border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:5px"
            onclick="_deleteContactConfirm('${c.id}')">
            ${icon('trash-2',12)} Löschen
          </button>
        </div>
      </div>

      <!-- Notizen -->
      <div class="work-section" style="margin-top:20px">
        <div class="work-section-title">${icon('file-text',13,'margin-right:5px')} Notizen</div>
        <textarea id="contactNotesEdit"
          placeholder="Freie Notizen zu diesem Kontakt…"
          style="width:100%; min-height:80px; background:var(--surface2); border:1px solid var(--border);
                 border-radius:6px; color:var(--text); padding:10px; font-size:0.82rem;
                 line-height:1.6; resize:vertical; box-sizing:border-box; transition:border-color 0.2s"
          onfocus="this.style.borderColor='var(--accent)'"
          onblur="this.style.borderColor='var(--border)'; _saveContactField('${c.id}','notes',this.value)"
        >${escHtml(c.notes || '')}</textarea>
      </div>

      <!-- Projekte -->
      <div class="work-section">
        <div class="work-section-title" style="display:flex; align-items:center; justify-content:space-between">
          <span>${icon('layers',13,'margin-right:5px')} Zugeordnete Projekte (${projs.length})</span>
          <button class="btn btn-ghost" style="font-size:0.75rem; padding:3px 10px"
            onclick="_openAssignProjectModal('${c.id}')">
            ${icon('plus',11,'pointer-events:none')} Projekt zuordnen
          </button>
        </div>
        ${projs.length === 0
          ? `<div style="font-size:0.8rem; color:var(--muted)">Noch keine Projekte zugeordnet.</div>`
          : projs.map(p => `
              <div class="profile-session-row" style="cursor:default">
                <span style="width:10px; height:10px; border-radius:50%; background:${p.color || '#6b7280'}; flex-shrink:0; display:inline-block"></span>
                <span style="font-weight:600">${escHtml(p.name)}</span>
                <span style="color:var(--muted); font-size:0.75rem; margin-left:auto">
                  ${sessions.filter(s => s.projectId === p.id).length} Sitzung${sessions.filter(s => s.projectId === p.id).length!==1?'en':''}
                </span>
                <button onclick="_unassignProjectFromContact('${c.id}','${p.id}')"
                  style="background:none; border:none; color:var(--muted); cursor:pointer; padding:2px 5px; font-size:0.75rem"
                  title="Zuweisung aufheben">✕</button>
              </div>`).join('')}
      </div>

      <!-- Sitzungen -->
      <div class="work-section">
        <div class="work-section-title">${icon('calendar',13,'margin-right:5px')} Sitzungen (${sess.length})</div>
        ${sess.length === 0
          ? `<div style="font-size:0.8rem; color:var(--muted)">Noch keine Sitzungen in zugeordneten Projekten.</div>`
          : sess.map(s => {
              const d = new Date(s.date).toLocaleDateString('de-DE', { day:'numeric', month:'short', year:'numeric' });
              const proj = (typeof projects !== 'undefined') ? projects.find(p => p.id === s.projectId) : null;
              return `
                <div class="profile-session-row" onclick="_openSessionFromContact('${s.id}')" style="cursor:pointer">
                  <span class="profile-session-date">${d}</span>
                  <span>${escHtml(s.label)}</span>
                  ${proj && !proj.builtin ? `<span style="font-size:0.7rem; color:var(--muted); margin-left:auto; white-space:nowrap">${escHtml(proj.name)}</span>` : ''}
                </div>`;
            }).join('')}
      </div>

    </div>

    ${_assignProjectModalHtml(c.id)}`;

  if (window.lucide) lucide.createIcons({ nodes: [el] });
}

// ── Inline-Speichern ──────────────────────────────────────────────────────────

function _saveContactField(id, field, value) {
  const trimmed = (value || '').trim();
  if (!trimmed && field === 'name') return; // Name darf nicht leer sein
  updateContact(id, { [field]: trimmed });
}

function _deleteContactConfirm(id) {
  const c = getContactById(id);
  if (!c) return;
  const projs = getProjectsForContact(id);
  const msg = projs.length > 0
    ? `„${c.name}" löschen?\n\nDie ${projs.length} zugeordneten Projekte bleiben erhalten, verlieren aber die Kontaktzuweisung.`
    : `„${c.name}" löschen?`;
  if (!confirm(msg)) return;
  deleteContact(id);
  renderContactsView();
  showToast(`„${c.name}" gelöscht`, 'success');
}

function _openSessionFromContact(sessionId) {
  const cv = document.getElementById('contactsView');
  if (cv) cv.style.display = 'none';
  const s = (typeof sessions !== 'undefined') ? sessions.find(x => x.id === sessionId) : null;
  if (s && typeof showTranscript === 'function') showTranscript(s);
}

// ── Projekt zuordnen ──────────────────────────────────────────────────────────

function _assignProjectModalHtml(contactId) {
  const assigned = new Set(getProjectsForContact(contactId).map(p => p.id));
  const available = (typeof projects !== 'undefined')
    ? projects.filter(p => !p.builtin && !assigned.has(p.id))
    : [];

  return `
    <div id="assignProjectModal" style="display:none; position:fixed; inset:0; z-index:900;
      background:rgba(0,0,0,0.5); align-items:center; justify-content:center">
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px;
        padding:24px; max-width:420px; width:90%; max-height:80vh; overflow-y:auto">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px">
          <h3 style="font-size:0.95rem; font-weight:700">Projekt zuordnen</h3>
          <button onclick="document.getElementById('assignProjectModal').style.display='none'"
            style="background:none; border:none; color:var(--muted); font-size:1.2rem; cursor:pointer">×</button>
        </div>
        ${available.length === 0
          ? `<div style="color:var(--muted); font-size:0.85rem">Alle Projekte sind bereits zugeordnet oder es gibt keine weiteren Projekte.</div>`
          : available.map(p => `
              <div onclick="_assignProjectToContact('${contactId}','${p.id}')"
                style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px;
                       cursor:pointer; border:1px solid var(--border); margin-bottom:8px;
                       transition:background 0.15s"
                onmouseover="this.style.background='rgba(108,99,255,0.08)'"
                onmouseout="this.style.background=''">
                <span style="width:10px; height:10px; border-radius:50%; background:${p.color || '#6b7280'}; flex-shrink:0"></span>
                <span style="font-weight:600; font-size:0.88rem">${escHtml(p.name)}</span>
              </div>`).join('')}
      </div>
    </div>`;
}

function _openAssignProjectModal(contactId) {
  const modal = document.getElementById('assignProjectModal');
  if (modal) modal.style.display = 'flex';
}

function _assignProjectToContact(contactId, projectId) {
  if (typeof projects === 'undefined') return;
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx < 0) return;
  projects[idx].kontaktId = contactId;
  if (typeof saveProjects === 'function') saveProjects({ skipDriveSync: false });
  showToast('Projekt zugeordnet ✓', 'success');
  renderContactDetail(contactId);
}

function _unassignProjectFromContact(contactId, projectId) {
  if (typeof projects === 'undefined') return;
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx < 0) return;
  delete projects[idx].kontaktId;
  if (typeof saveProjects === 'function') saveProjects({ skipDriveSync: false });
  showToast('Zuweisung aufgehoben', 'success');
  renderContactDetail(contactId);
}

// ── Neuer-Kontakt-Modal ───────────────────────────────────────────────────────

function _contactModalHtml() {
  return `
    <div id="contactModal" style="display:none; position:fixed; inset:0; z-index:900;
      background:rgba(0,0,0,0.5); align-items:center; justify-content:center">
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px;
        padding:24px; max-width:400px; width:90%">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px">
          <h3 style="font-size:0.95rem; font-weight:700">Neuer Kontakt</h3>
          <button onclick="closeContactModal()"
            style="background:none; border:none; color:var(--muted); font-size:1.2rem; cursor:pointer">×</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px">
          <div>
            <label style="font-size:0.78rem; color:var(--muted); display:block; margin-bottom:4px">Name *</label>
            <input id="contactModalName" type="text" placeholder="z.B. Firma XY · Thomas Müller"
              style="width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:8px;
                     padding:9px 12px; color:var(--text); font-size:0.88rem; outline:none; box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border)'"
              onkeydown="if(event.key==='Enter') document.getElementById('contactModalBeziehung').focus()" />
          </div>
          <div>
            <label style="font-size:0.78rem; color:var(--muted); display:block; margin-bottom:4px">Beziehung</label>
            <input id="contactModalBeziehung" type="text" placeholder="z.B. Kunde · Freund · Kollege"
              style="width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:8px;
                     padding:9px 12px; color:var(--text); font-size:0.88rem; outline:none; box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border)'"
              onkeydown="if(event.key==='Enter') _submitContactModal()" />
          </div>
          <div style="display:flex; gap:8px; margin-top:4px">
            <button class="btn btn-primary" onclick="_submitContactModal()" style="flex:1">Anlegen</button>
            <button class="btn btn-ghost" onclick="closeContactModal()">Abbrechen</button>
          </div>
        </div>
      </div>
    </div>`;
}

function openContactModal() {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('contactModalName')?.focus(), 50);
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.style.display = 'none';
  const n = document.getElementById('contactModalName');
  const b = document.getElementById('contactModalBeziehung');
  if (n) n.value = '';
  if (b) b.value = '';
}

function _submitContactModal() {
  const name = document.getElementById('contactModalName')?.value?.trim();
  const bez  = document.getElementById('contactModalBeziehung')?.value?.trim();
  if (!name) { showToast('Name ist erforderlich', 'error'); return; }
  const c = createContact({ name, beziehung: bez });
  closeContactModal();
  renderContactsView();
  showToast(`„${c.name}" angelegt ✓`, 'success');
}

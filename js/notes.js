// NOTIZEN
// ═══════════════════════════════════════════════════
let notesTimer = null;
function saveNotes() {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    const s = getSession();
    if (!s) return;
    s.notes = document.getElementById('notesArea').value;
    saveSessions();
    saveToArchive(s);
  }, 800);
}

// ═══════════════════════════════════════════════════

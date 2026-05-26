// DIREKTAUFNAHME
// ═══════════════════════════════════════════════════
let mediaRecorder = null;
let recordedChunks = [];
let recordTimer = null;
let recordSeconds = 0;

async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const file = new File([blob], `Aufnahme_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`, { type: 'audio/webm' });
      processFile(file);
      resetRecordBtn();
    };
    mediaRecorder.start();
    recordSeconds = 0;
    const btn = document.getElementById('recordBtn');
    const dot = document.getElementById('recordDot');
    btn.classList.add('recording');
    dot.classList.add('pulse');
    recordTimer = setInterval(() => {
      recordSeconds++;
      document.getElementById('recordBtnLabel').textContent = `⏹ Stopp (${formatMs(recordSeconds*1000)})`;
    }, 1000);
    document.getElementById('recordBtnLabel').textContent = '⏹ Aufnahme läuft…';
  } catch(e) {
    showToast('Mikrofon-Zugriff verweigert: ' + e.message, 'error');
  }
}

function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
  clearInterval(recordTimer);
}

function resetRecordBtn() {
  clearInterval(recordTimer);
  const btn = document.getElementById('recordBtn');
  const dot = document.getElementById('recordDot');
  if (btn) btn.classList.remove('recording');
  if (dot) dot.classList.remove('pulse');
  const lbl = document.getElementById('recordBtnLabel');
  if (lbl) lbl.textContent = '🎙️ Direkt aufnehmen';
}

// ═══════════════════════════════════════════════════
// VORLAGEN-POPOVER
// ═══════════════════════════════════════════════════
function toggleTemplatePopover(wrapId) {
  const popover = document.querySelector(`#${wrapId} .template-popover`);
  if (!popover) return;
  const isOpen = popover.classList.contains('open');
  // Alle schließen
  document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  if (!isOpen) popover.classList.add('open');
}

// Schließt Popover bei Klick außerhalb
document.addEventListener('click', e => {
  if (!e.target.closest('.claude-btn-wrap')) {
    document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  }
});

// ═══════════════════════════════════════════════════

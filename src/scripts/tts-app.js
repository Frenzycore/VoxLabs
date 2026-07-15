const textInput = document.getElementById('text-input');
const charCount = document.getElementById('char-count');
const voiceInfoName = document.getElementById('voice-info-name');
const voiceDescription = document.getElementById('voice-info-description');
const voiceLanguages = document.getElementById('voice-info-languages');
const previewBtn = document.getElementById('preview-btn');
const previewIconPlay = document.getElementById('preview-icon-play');
const previewIconPause = document.getElementById('preview-icon-pause');
const previewAudio = document.getElementById('preview-audio');
const reverbToggle = document.getElementById('reverb-toggle');
const reverbTrack = document.getElementById('reverb-track');
const customKeyToggle = document.getElementById('custom-key-toggle');
const customKeyPanel = document.getElementById('custom-key-panel');
const customKeyInput = document.getElementById('custom-key-input');
const generateBtn = document.getElementById('generate-btn');
const btnLabel = document.getElementById('btn-label');
const errorBox = document.getElementById('error-box');
const resultBox = document.getElementById('result-box');
const audioPlayer = document.getElementById('audio-player');
const downloadLink = document.getElementById('download-link');
const shareBtn = document.getElementById('share-btn');
const quotaStatus = document.getElementById('quota-status');

let voiceDetails = [];
let lastAudioBlob = null;
let lastAudioUrl = null;
let turnstileRequired = false;
let turnstileToken = null;
let quotaUnlimited = false;
let remainingQuota = null;

function updateCharCount() {
  const length = textInput.value.length;
  const overLimit = !quotaUnlimited && remainingQuota !== null && length > remainingQuota;

  charCount.textContent = `${length.toLocaleString()} characters`;
  charCount.classList.toggle('char-count-warning', overLimit);
  quotaStatus.classList.toggle('char-count-warning', overLimit);
}

async function refreshQuotaStatus() {
  try {
    const headers = {};
    const customKey = customKeyInput.value.trim();
    if (customKey) headers['x-custom-key'] = customKey;

    const res = await fetch('/api/quota', { headers });
    const data = await res.json();

    quotaUnlimited = Boolean(data.unlimited);
    remainingQuota = quotaUnlimited ? null : data.remaining;

    quotaStatus.textContent = quotaUnlimited
      ? 'Unlimited (custom key)'
      : `${data.remaining.toLocaleString()} characters left today`;
  } catch {
    quotaUnlimited = false;
    remainingQuota = null;
    quotaStatus.textContent = '';
  }
  updateCharCount();
}

updateCharCount();

try {
  const savedKey = localStorage.getItem('vox-labs-api-key');
  if (savedKey) {
    customKeyInput.value = savedKey;
    customKeyPanel.classList.remove('hidden');
  }
} catch {}

customKeyToggle.addEventListener('click', () => {
  customKeyPanel.classList.toggle('hidden');
});

customKeyInput.addEventListener('input', () => {
  const val = customKeyInput.value.trim();
  try {
    if (val) localStorage.setItem('vox-labs-api-key', val);
    else localStorage.removeItem('vox-labs-api-key');
  } catch {}
  refreshQuotaStatus();
});

const allDropdownWrappers = [];

function closeAllDropdowns() {
  allDropdownWrappers.forEach((wrapper) => wrapper.classList.remove('open'));
  document.querySelectorAll('.dropdown-trigger').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
}

document.addEventListener('click', closeAllDropdowns);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllDropdowns();
});

function createDropdown({ wrapperId, btnId, labelId, panelId, onSelect }) {
  const wrapper = document.getElementById(wrapperId);
  const btn = document.getElementById(btnId);
  const label = document.getElementById(labelId);
  const panel = document.getElementById(panelId);
  let selectedId = null;

  allDropdownWrappers.push(wrapper);

  function close() {
    wrapper.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !wrapper.classList.contains('open');
    closeAllDropdowns();
    if (willOpen) {
      wrapper.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  function applySelection(id, name) {
    selectedId = id;
    label.textContent = name;
    panel.querySelectorAll('.dropdown-option').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === String(id));
    });
  }

  function setOptions(items) {
    panel.innerHTML = '';
    items.forEach((item, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'dropdown-option';
      option.textContent = item.name;
      option.dataset.id = String(item.id);
      option.addEventListener('click', () => {
        applySelection(item.id, item.name);
        close();
        onSelect?.(item.id);
      });
      panel.appendChild(option);
      if (index === 0) applySelection(item.id, item.name);
    });
  }

  return { close, setOptions, getValue: () => selectedId };
}

const voiceDropdown = createDropdown({
  wrapperId: 'voice-dropdown-wrapper',
  btnId: 'voice-dropdown-btn',
  labelId: 'voice-dropdown-label',
  panelId: 'voice-dropdown-panel',
  onSelect: () => updateVoiceInfo(),
});

const langDropdown = createDropdown({
  wrapperId: 'lang-dropdown-wrapper',
  btnId: 'lang-dropdown-btn',
  labelId: 'lang-dropdown-label',
  panelId: 'lang-dropdown-panel',
});

function setLoading(isLoading) {
  generateBtn.disabled = isLoading || (turnstileRequired && !turnstileToken);
  btnLabel.textContent = isLoading ? 'Generating…' : 'Generate Speech';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

function stopPreview() {
  previewAudio.pause();
  previewIconPlay.classList.remove('hidden');
  previewIconPause.classList.add('hidden');
  previewBtn.setAttribute('aria-label', 'Play voice preview');
}

function getSelectedDetail() {
  const id = voiceDropdown.getValue();
  return voiceDetails.find((detail) => detail.id === id) ?? null;
}

function updateVoiceInfo() {
  stopPreview();
  const detail = getSelectedDetail();

  if (!detail) {
    voiceInfoName.textContent = '—';
    voiceDescription.textContent = 'Select a voice to see its description.';
    voiceLanguages.textContent = '';
    previewBtn.disabled = true;
    return;
  }

  voiceInfoName.textContent = detail.voice;
  voiceDescription.textContent = detail.description || 'No description available.';
  voiceLanguages.textContent = detail.supportedLanguages ? `Supports: ${detail.supportedLanguages}` : '';
  previewBtn.disabled = !detail.audio;
}

textInput.addEventListener('input', updateCharCount);

reverbToggle.addEventListener('change', () => {
  reverbTrack.classList.toggle('bg-accent', reverbToggle.checked);
  reverbTrack.classList.toggle('bg-border', !reverbToggle.checked);
});

previewBtn.addEventListener('click', () => {
  const detail = getSelectedDetail();
  if (!detail?.audio) return;

  if (!previewAudio.paused && previewAudio.src === detail.audio) {
    stopPreview();
    return;
  }

  audioPlayer.pause();
  if (previewAudio.src !== detail.audio) previewAudio.src = detail.audio;
  previewAudio.play();
  previewIconPlay.classList.add('hidden');
  previewIconPause.classList.remove('hidden');
  previewBtn.setAttribute('aria-label', 'Stop preview');
});

previewAudio.addEventListener('ended', stopPreview);

async function loadVoices() {
  try {
    const res = await fetch('/api/voices');
    if (!res.ok) throw new Error();
    const data = await res.json();
    voiceDetails = data.details ?? [];

    voiceDropdown.setOptions([...data.voices].sort((a, b) => a.name.localeCompare(b.name)));
    langDropdown.setOptions(data.languages);

    updateVoiceInfo();
  } catch {
    document.getElementById('voice-dropdown-label').textContent = 'Failed to load';
    document.getElementById('lang-dropdown-label').textContent = 'Failed to load';
    showError("Couldn't load the voice list from the API. Please refresh the page.");
  }
}

async function generateSpeech() {
  const text = textInput.value.trim();
  if (!text) {
    showError('Please enter some text first.');
    return;
  }

  hideError();
  stopPreview();
  resultBox.classList.add('hidden');
  setLoading(true);

  try {
    const headers = { 'Content-Type': 'application/json' };
    const customKey = customKeyInput.value.trim();
    if (customKey) headers['x-custom-key'] = customKey;

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        voice: voiceDropdown.getValue(),
        lang: langDropdown.getValue(),
        reverb: reverbToggle.checked,
        turnstileToken,
      }),
    });

    if (!res.ok) {
      let message = 'Failed to generate audio. Please try again.';
      try {
        const errData = await res.json();
        if (errData?.error) message = errData.error;
      } catch {}
      throw new Error(message);
    }

    lastAudioBlob = await res.blob();
    if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
    lastAudioUrl = URL.createObjectURL(lastAudioBlob);

    audioPlayer.src = lastAudioUrl;
    downloadLink.dataset.url = lastAudioUrl;
    downloadLink.dataset.filename = `vox-labs-${Date.now()}.mp3`;
    resultBox.classList.remove('hidden');
    audioPlayer.play().catch(() => {});
    refreshQuotaStatus();
    window.turnstile?.reset();
    turnstileToken = null;
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to generate audio.');
  } finally {
    setLoading(false);
  }
}

downloadLink.addEventListener('click', () => {
  const url = downloadLink.dataset.url;
  const filename = downloadLink.dataset.filename || 'vox-labs.mp3';
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

shareBtn.addEventListener('click', async () => {
  if (!lastAudioBlob) return;

  const filename = downloadLink.dataset.filename || 'vox-labs.mp3';
  const file = new File([lastAudioBlob], filename, {
    type: lastAudioBlob.type || 'audio/mpeg',
  });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Vox Labs' });
    } catch {}
  } else {
    downloadLink.click();
  }
});

async function initTurnstile() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (!config.turnstileSiteKey) return;

    turnstileRequired = true;
    generateBtn.disabled = true;
    document.getElementById('turnstile-section').classList.remove('hidden');

    const container = document.getElementById('turnstile-container');
    container.setAttribute('data-sitekey', config.turnstileSiteKey);
    container.setAttribute('data-callback', 'onTurnstileVerified');
    container.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } catch {}
}

window.onTurnstileVerified = (token) => {
  turnstileToken = token;
  generateBtn.disabled = false;
};

generateBtn.addEventListener('click', generateSpeech);
loadVoices();
refreshQuotaStatus();
initTurnstile();

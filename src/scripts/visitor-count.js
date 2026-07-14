const API_ENDPOINT = '/api/visitors';
const FALLBACK_TEXT = '—';

const visitorEl = document.getElementById('visitor-count');

function formatCount(value) {
  return typeof value === 'number' ? value.toLocaleString() : FALLBACK_TEXT;
}

async function loadVisitorCount() {
  if (!visitorEl) return;

  try {
    const res = await fetch(API_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    visitorEl.textContent = formatCount(data.visitors);
  } catch {
    visitorEl.textContent = FALLBACK_TEXT;
  }
}

loadVisitorCount();
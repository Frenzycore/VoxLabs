const el = document.getElementById('visitor-count');

try {
  const res = await fetch('/api/visitors');
  const data = await res.json();
  el.textContent = typeof data.visitors === 'number' ? data.visitors.toLocaleString() : '—';
} catch {
  el.textContent = '—';
}

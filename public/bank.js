import { bankItems, filterItems, bankGrid, itemDetail } from './bank-view.js';
const grid = document.querySelector('#bank-grid'), query = document.querySelector('#bank-query'), sort = document.querySelector('#bank-sort');
let items = [], recent = [], tab = 'all', selection;
function render() {
  const visible = filterItems(items, query.value, tab, sort.value, recent);
  grid.innerHTML = bankGrid(visible);
  document.querySelector('#bank-results').textContent = visible.length ? `${visible.length} of ${items.length} finds` : tab === 'recent' && !recent.length ? 'No notable finds recorded since the initial sync.' : 'No finds match. Try another name or tab.';
  grid.querySelector(`[data-item="${selection}"]`)?.setAttribute('aria-current', 'true');
}
function select(id) {
  selection = id;
  document.querySelector('#bank-inspector').innerHTML = itemDetail(items.find(i => i.id === id));
  for (const slot of grid.querySelectorAll('[data-item]')) {
    if (Number(slot.dataset.item) === id) slot.setAttribute('aria-current', 'true');
    else slot.removeAttribute('aria-current');
  }
}
grid.addEventListener('click', e => {
  const slot = e.target.closest('[data-item]');
  if (!slot || !items.length || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault(); select(Number(slot.dataset.item));
});
query.addEventListener('input', render); sort.addEventListener('change', render);
for (const button of document.querySelectorAll('[data-bank-tab]')) button.addEventListener('click', () => {
  tab = button.dataset.bankTab;
  for (const b of document.querySelectorAll('[data-bank-tab]')) b.setAttribute('aria-pressed', String(b === button));
  render();
});
let loading = false;
async function refresh() {
  if (document.hidden || loading) return;
  loading = true;
  try {
    const [content, activity] = await Promise.all(['content', 'activity'].map(async name => {
      const response = await fetch(new URL(`./data/${name}.json`, import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error();
      return response.json();
    }));
    const log = content.integrations.wiseOldMan === false ? {} : activity.collectionLog;
    items = bankItems(log, content.game); recent = log?.notable || [];
    if (!items.some(i => i.id === selection)) selection = items.find(i => i.id === 23760)?.id || items[0]?.id;
    document.querySelector('.bank-toolbar').hidden = false;
    document.querySelector('#bank-total').textContent = `${items.length} finds`;
    render(); select(selection);
  } catch { /* The built collection remains visible when a refresh is unavailable. */ }
  finally { loading = false; }
}
refresh(); setInterval(refresh, 60000); document.addEventListener('visibilitychange', refresh);

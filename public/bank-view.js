import { esc } from './view.js';
export const keepsakes = new Set([23760, 11920, 6737, 23956, 25582, 22994, 6570, 12954, 26813, 24288]);
export function bankItems(log = {}, name) {
  if (log.username !== name || log.availability !== 'synced') return [];
  return (log.items || []).filter(i => Number.isInteger(i.id) && i.id > 0 && Number.isFinite(i.count) && i.count > 0);
}
export function filterItems(items, query = '', tab = 'all', sort = 'collection', recent = []) {
  const ids = new Set(recent.map(i => i.id));
  const found = items.filter(i => i.name.toLowerCase().includes(query.trim().toLowerCase()) && (tab === 'all' || tab === 'keepsakes' && keepsakes.has(i.id) || tab === 'recent' && ids.has(i.id)));
  if (sort === 'name') found.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'quantity') found.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return found;
}
export const wikiURL = id => `https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${id}`;
export const itemImage = id => `https://static.runelite.net/cache/item/icon/${id}.png`;
export function bankGrid(items) {
  return items.length ? items.map(i => `<a class="bank-slot" data-item="${i.id}" href="${wikiURL(i.id)}" target="_blank" rel="noopener noreferrer" title="${esc(i.name)} · ${i.count.toLocaleString('en-US')} logged" aria-label="${esc(i.name)}, ${i.count.toLocaleString('en-US')} logged"><span class="bank-quantity">${i.count.toLocaleString('en-US')}</span><img src="${itemImage(i.id)}" width="36" height="32" alt="" loading="lazy"><span class="bank-slot-name">${esc(i.name)}</span></a>`).join('') : '<p class="bank-empty">Nothing in this tab yet.</p>';
}
export function itemDetail(item) {
  return item ? `<img src="${itemImage(item.id)}" width="72" height="64" alt=""><div><h2>${esc(item.name)}</h2><p>${item.count.toLocaleString('en-US')} recorded in the collection log</p><a href="${wikiURL(item.id)}" target="_blank" rel="noopener noreferrer">look it up on the wiki ↗</a></div>` : '<p>Select a find to take a closer look.</p>';
}

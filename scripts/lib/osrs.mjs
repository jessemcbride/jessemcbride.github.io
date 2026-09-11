import { requestJSON, FeedError } from './feeds.mjs';
const headers = { 'User-Agent': 'jesse.garden/1.0 (personal OSRS profile)', Accept: 'application/json', 'Content-Type': 'application/json' };
const normalize = name => String(name).trim().toLowerCase().replaceAll('_', ' ');
const count = value => Number.isFinite(value) && value >= 0 ? value : null;
export function playerSnapshot(player, username) {
  const snapshot = player?.latestSnapshot;
  if (normalize(player?.username) !== normalize(username) || !snapshot?.data?.skills?.overall || !Number.isFinite(Date.parse(snapshot.createdAt))) throw new FeedError('invalid player response');
  const metrics = (data, valueKey) => Object.entries(data || {}).filter(([key]) => /^[a-z0-9_]+$/.test(key)).map(([key, value]) => ({ key, value: count(value[valueKey]), rank: count(value.rank), ...(valueKey === 'level' ? { xp: count(value.experience) } : {}) }));
  return { username, playerId: player.id, type: player.type, combat: count(player.combatLevel), snapshotAt: snapshot.createdAt,
    skills: metrics(snapshot.data.skills, 'level'), bosses: metrics(snapshot.data.bosses, 'kills').filter(b => b.value > 0), activities: metrics(snapshot.data.activities, 'score').filter(a => a.value !== null) };
}
export async function wiseOldManFeed(username, fetcher = fetch) {
  // POST updates hiscores first; GET alone can return a previous name holder.
  const player = await requestJSON(`https://api.wiseoldman.net/v2/players/${encodeURIComponent(normalize(username))}`, { method: 'POST', headers }, fetcher);
  return playerSnapshot(player, username);
}
export function collectionSnapshot(response, username) {
  if (response?.error) {
    if (Number(response.error.Code) === 402) return { username, availability: 'not-synced', items: [] };
    throw new FeedError('collection log unavailable');
  }
  const data = response?.data;
  if (!data || normalize(data.player) !== normalize(username) || count(data.total_collections_finished) === null) throw new FeedError('invalid collection response');
  const items = Object.values(data.items || {}).filter(i => Number.isInteger(Number(i.id)) && Number(i.id) > 0 && Number(i.count) > 0).map(i => ({ id: Number(i.id), name: String(i.name || `Item ${i.id}`), count: Number(i.count) }));
  return { username, availability: 'synced', obtained: data.total_collections_finished, available: count(data.total_collections_available), syncedAt: data.last_checked || null, items };
}
export async function collectionLogFeed(username, fetcher = fetch) {
  const query = new URLSearchParams({ player: username, categories: 'all', includenames: '1', onlyitems: '1' });
  const log = collectionSnapshot(await requestJSON(`https://templeosrs.com/api/collection-log/player_collection_log.php?${query}`, { headers }, fetcher), username);
  if (log.availability !== 'synced') return log;
  // Recent drops fail independently from the complete collection snapshot.
  try {
    const response = await requestJSON(`https://templeosrs.com/api/collection-log/player_recent_items.php?${new URLSearchParams({ player: username, count: '8', onlynotable: '1' })}`, { headers }, fetcher);
    if (!response?.data || response.error) throw new Error();
    log.notable = Object.values(response.data).filter(i => Number.isInteger(Number(i.id)) && i.name && (i.notable_item === true || Number(i.notable_item) === 1)).map(i => ({ id: Number(i.id), name: String(i.name), date: Number.isFinite(Number(i.date_unix)) ? new Date(Number(i.date_unix) * 1000).toISOString() : null }));
  } catch { log.notableUnavailable = true; }
  return log;
}

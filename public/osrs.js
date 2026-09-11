import { esc, link, ago } from './view.js';
const skills = ['attack', 'hitpoints', 'mining', 'strength', 'agility', 'smithing', 'defence', 'herblore', 'fishing', 'ranged', 'thieving', 'cooking', 'prayer', 'crafting', 'firemaking', 'magic', 'fletching', 'woodcutting', 'runecrafting', 'slayer', 'farming', 'construction', 'hunter', 'sailing'];
const title = key => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const num = n => Number.isFinite(n) && n >= 0 ? n.toLocaleString('en-US') : '—';
const icon = key => `<img src="./assets/osrs/${key}.png" width="24" height="24" alt="" loading="lazy">`;
const knownBosses = new Set(['amoxliatl','barrows_chests','brutus','calvarion','crazy_archaeologist','dagannoth_rex','giant_mole','hespori','lunar_chests','mad_angel','obor','scurrius','tempoross','the_gauntlet','the_corrupted_gauntlet','tztok_jad','wintertodt','zalcano']);
const item = i => link(`https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${i.id}`, `<img src="https://static.runelite.net/cache/item/icon/${i.id}.png" width="36" height="32" alt="" loading="lazy"><span>${esc(i.name)}</span>`, 'osrs-item');
export function osrs(feed = {}, log = {}, name = 'Nonduality', note = '', now = Date.now()) {
  const valid = feed.username === name && Array.isArray(feed.skills);
  const synced = log.username === name && log.availability === 'synced';
  const stats = new Map((valid ? feed.skills : []).map(s => [s.key, s]));
  const overall = stats.get('overall');
  const clogs = valid ? feed.activities?.find(a => a.key === 'collections_logged')?.value : null;
  const clues = valid ? feed.activities?.find(a => a.key === 'clue_scrolls_all')?.value : null;
  const bosses = valid ? [...feed.bosses].sort((a, b) => b.value - a.value) : [];
  const collection = synced ? log.items || [] : [];
  const byId = new Map(collection.map(i => [i.id, i]));
  // A small cabinet of verified finds, never inferred from kill counts.
  const featured = [...new Set([23760, ...(log.notable || []).map(i => i.id), 11920, 6737, 23956, 25582, 22994, ...collection.map(i => i.id)])].map(id => byId.get(id)).filter(Boolean).slice(0, 6);
  return `<div class="osrs-heading"><span class="osrs-caption">little treasures from Gielinor</span><h2>${icon('ironman')}${esc(name)}</h2><p>Ironman${name === 'Nonduality' ? ' · formerly I am a bot' : ''}</p></div>
    <div class="osrs-collection">${synced ? `<p class="osrs-note">${num(log.obtained)} collection slots. A few things I brought home.</p><div class="osrs-items osrs-treasures">${featured.map(item).join('')}</div>${collection.length ? `<details class="osrs-details"><summary>look through all ${num(log.obtained)} finds</summary><div class="osrs-items">${collection.map(item).join('')}</div></details>` : ''}${log.notable?.length ? `<details class="osrs-details"><summary>recent notable finds</summary><div class="osrs-items">${log.notable.map(item).join('')}</div></details>` : ''}${log.status === 'stale' ? '<p class="fine-print">Showing the last synced collection.</p>' : ''}` : `<p class="osrs-note">${clogs != null ? `${num(clogs)} collection slots. ` : ''}The individual treasures aren’t synced here yet.</p><p class="fine-print">Item art appears after a ${link('https://templeosrs.com/faq.php', 'TempleOSRS collection sync')}.</p>`}</div>
    <details class="osrs-details osrs-account-details"><summary>levels, bosses & account notes</summary>
    ${valid ? `<p class="osrs-summary">${num(overall?.value)} total · combat ${num(feed.combat)}${clues != null ? ` · ${num(clues)} clues` : ''}</p>` : `<p class="fine-print">${feed.status === 'disabled' ? 'Account updates are paused.' : 'Levels are waiting for a successful Wise Old Man check.'}</p>`}
    <div class="osrs-skills" aria-label="OSRS skill levels">${skills.map(key => { const s = stats.get(key); return `<div class="osrs-skill" title="${esc(title(key))}: ${num(s?.xp)} XP"><span class="osrs-skill-name">${icon(key)}<span>${title(key)}</span></span><strong>${num(s?.value)}</strong></div>`; }).join('')}</div>
    <p class="osrs-note">${esc(note)}</p>
    ${bosses.length ? `<ul class="osrs-bosses">${bosses.map(b => `<li>${knownBosses.has(b.key) ? icon(b.key) : ''}<span>${esc(title(b.key))}</span><strong>${num(b.value)}</strong></li>`).join('')}</ul><p class="fine-print">Ranked kills and completions from the hiscores. Unranked bosses are omitted.</p>` : ''}
    <p class="osrs-source">${link(`https://wiseoldman.net/players/${encodeURIComponent(name)}`, 'Wise Old Man ↗')}${valid ? ` · hiscores ${esc(ago(feed.snapshotAt, now))}${feed.status === 'stale' ? ' · update delayed' : ''}` : ''}</p></details>
    <p class="osrs-source">${link(`https://templeosrs.com/collection-log/view-collections.php?player=${encodeURIComponent(name)}`, 'collection log ↗')} · <a href="./assets/osrs/CREDITS.txt">icon credits</a></p>`;
}

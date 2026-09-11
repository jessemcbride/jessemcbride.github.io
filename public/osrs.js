import { esc, link, ago } from './view.js';
const skills = ['attack', 'hitpoints', 'mining', 'strength', 'agility', 'smithing', 'defence', 'herblore', 'fishing', 'ranged', 'thieving', 'cooking', 'prayer', 'crafting', 'firemaking', 'magic', 'fletching', 'woodcutting', 'runecrafting', 'slayer', 'farming', 'construction', 'hunter', 'sailing'];
const title = key => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const num = n => Number.isFinite(n) && n >= 0 ? n.toLocaleString('en-US') : '—';
const icon = key => `<img src="./assets/osrs/${key}.png" width="24" height="24" alt="" loading="lazy">`;
const knownBosses = new Set(['amoxliatl','barrows_chests','brutus','calvarion','crazy_archaeologist','dagannoth_rex','giant_mole','hespori','lunar_chests','mad_angel','obor','scurrius','tempoross','the_gauntlet','the_corrupted_gauntlet','tztok_jad','wintertodt','zalcano']);

export function accountNotes(feed = {}, log = {}, name = 'Nonduality', note = '', now = Date.now()) {
  const valid = feed.username === name && Array.isArray(feed.skills);
  const synced = log.username === name && log.availability === 'synced';
  const stats = new Map((valid ? feed.skills : []).map(s => [s.key, s]));
  const overall = stats.get('overall');
  const clogs = valid ? feed.activities?.find(a => a.key === 'collections_logged')?.value : null;
  const clues = valid ? feed.activities?.find(a => a.key === 'clue_scrolls_all')?.value : null;
  const bosses = valid ? [...feed.bosses].sort((a, b) => b.value - a.value) : [];
  return `    <details class="osrs-details osrs-account-details"><summary>levels, bosses & account notes</summary>
    ${valid ? `<p class="osrs-summary">${num(overall?.value)} total · combat ${num(feed.combat)}${clues != null ? ` · ${num(clues)} clues` : ''}</p>` : `<p class="fine-print">${feed.status === 'disabled' ? 'Account updates are paused.' : 'Levels are waiting for a successful Wise Old Man check.'}</p>`}
    <div class="osrs-skills" aria-label="OSRS skill levels">${skills.map(key => { const s = stats.get(key); return `<div class="osrs-skill" title="${esc(title(key))}: ${num(s?.xp)} XP"><span class="osrs-skill-name">${icon(key)}<span>${title(key)}</span></span><strong>${num(s?.value)}</strong></div>`; }).join('')}</div>
    <p class="osrs-note">${esc(note)}</p>
    ${bosses.length ? `<ul class="osrs-bosses">${bosses.map(b => `<li>${knownBosses.has(b.key) ? icon(b.key) : ''}<span>${esc(title(b.key))}</span><strong>${num(b.value)}</strong></li>`).join('')}</ul><p class="fine-print">Ranked kills and completions from the hiscores. Unranked bosses are omitted.</p>` : ''}
    <p class="osrs-source">${link(`https://wiseoldman.net/players/${encodeURIComponent(name)}`, 'Wise Old Man ↗')}${valid ? ` · hiscores ${esc(ago(feed.snapshotAt, now))}${feed.status === 'stale' ? ' · update delayed' : ''}` : ''}</p></details>
    `;
}
export function osrs(feed = {}, log = {}, name = 'Nonduality') {
  const count = log.username === name && log.availability === 'synced' ? log.obtained : feed.username === name ? feed.activities?.find(a => a.key === 'collections_logged')?.value : null;
  return `<div class="osrs-heading"><span class="osrs-caption">somewhere in Gielinor</span><h2>${icon('ironman')}${esc(name)}</h2><p>Ironman${name === 'Nonduality' ? ' · formerly I am a bot' : ''}</p></div><a class="bank-door" href="./bank.html"><img src="./assets/osrs/collections_logged.png" width="28" height="28" alt=""><span>take a peek in my bank<small>${count != null ? `${num(count)} collection slots · ` : ''}a little cabinet of finds</small></span><span aria-hidden="true">↗</span></a>`;
}

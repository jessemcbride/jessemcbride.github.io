export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function url(value, local = false) {
  if (local && /^\.\/assets\/[\w./-]+$/.test(value) && !value.includes('..')) return value;
  try { return ['https:', 'mailto:'].includes(new URL(value).protocol) ? value : '#'; } catch { return '#'; }
}
export const link = (href, label, cls = '') => `<a class="${esc(cls)}" href="${esc(url(href))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
export function ago(date, now = Date.now()) {
  const ms = now - Date.parse(date);
  if (!Number.isFinite(ms)) return 'not yet checked';
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
export function status(feed = {}, now = Date.now()) {
  if (feed.status === 'disabled') return 'Updates paused';
  if (feed.status === 'unconfigured') return 'Handpicked favorites';
  if (!feed.updatedAt) return 'First update pending';
  const stale = feed.status !== 'ok' || now - Date.parse(feed.updatedAt) > 36 * 60 * 60000;
  return `${stale ? 'Last successful check' : 'Checked'} ${ago(feed.updatedAt, now)}`;
}
export function record(t) {
  return link(t.url, `<div class="record-cover"><img src="${esc(url(t.image, true))}" width="480" height="480" alt="${esc(t.album || t.title)} — ${esc(t.artist)} album artwork" loading="lazy"></div><h3>${esc(t.artist)}</h3><p>${esc(t.title)}</p>`, 'record');
}
export function music(feed = {}, favorites = [], now = Date.now(), history = null) {
  // Artwork is the section; statistics are liner notes beneath it.
  const observedTracks = new Map();
  for (const month of feed.observed?.months || []) for (const t of month.tracks) {
    observedTracks.set(t.id, { ...t, plays: t.plays + (observedTracks.get(t.id)?.plays || 0) });
  }
  const rotation = [...observedTracks.values()].sort((a, b) => b.plays - a.plays);
  const seen = new Set();
  const shelf = [...rotation, ...(feed.recent || []), ...favorites].filter(t => {
    const key = t.image && t.image !== './assets/record.svg' ? t.image : `${t.artist}/${t.album || t.title}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 7);
  const notes = feed.observed?.months?.length ? observedListening(feed, now) : history?.years?.length ? listeningHistory(history) : '';
  const current = feed.current;
  const playing = current ? `<p class="shelf-caption">${feed.isPlaying ? 'Playing at last check' : 'Last player session'}: ${link(current.url, `${esc(current.title)} — ${esc(current.artist)}`)}</p>` : '';
  return `<div class="record-grid">${shelf.map(record).join('')}</div>${playing}${notes ? `<details class="shelf-notes"><summary>liner notes · the listening over time</summary>${notes}</details>` : ''}<details class="feed-note"><summary>about the shelf</summary><p>${rotation.length ? 'A few records I keep returning to, drawn from captured Spotify plays.' : feed.recent?.length ? 'Records from recent Spotify plays.' : 'Handpicked tracks from my record shelf.'} Select a cover to listen on Spotify. Artwork belongs to its respective owners. ${esc(status(feed, now))}.</p></details>`;
}
export function github(feed = {}, name = '', now = Date.now()) {
  const events = feed.events || [];
  return `<div class="section-meta"><span>Out in the open</span><span>${esc(status(feed, now))}</span></div>${events.length ? `<ol class="activity-list">${events.map(e => `<li><span class="activity-dot" aria-hidden="true">✧</span><div><p>${esc(e.action)} ${link(e.url, esc(e.repo))}</p><time datetime="${esc(e.date)}">${esc(ago(e.date, now))}</time></div></li>`).join('')}</ol>` : `<p class="empty-note">No recent public activity to show. You can still find my work ${link(`https://github.com/${name}`, 'on GitHub ↗')}.</p>`}<p class="fine-print">Public activity only. GitHub’s activity feed can lag behind new commits.</p>`;
}
export function listeningHistory(history) {
  const years = history.years;
  const number = n => Math.round(n).toLocaleString('en-US');
  const total = years.reduce((sum, y) => sum + y.hours, 0);
  const max = Math.max(1, ...years.map(y => y.hours));
  const monthMax = Math.max(1, ...years.flatMap(y => y.months));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const byYear = new Map(years.map(y => [y.year, y]));
  const timeline = [];
  for (let year = years[0].year; year <= years.at(-1).year; year++) {
    const y = byYear.get(year);
    timeline.push(y ? `<div class="history-row"><strong>${esc(year)}</strong><div class="history-bar-track"><span class="history-bar" style="width:${Math.max(.5, y.hours / max * 100)}%"></span></div><span>${number(y.hours)} h</span></div>` : `<div class="history-row history-gap"><strong>${esc(year)}</strong><span>No recorded plays</span></div>`);
  }
  return `<p class="history-intro">Some years have a soundtrack. Here’s how mine changed.</p>
    <div class="history-totals"><div><strong>${number(total)}</strong><span>hours of music</span></div><div><strong>${number(years.reduce((s, y) => s + y.plays, 0))}</strong><span>recorded plays</span></div><div><strong>${years.length}</strong><span>years with music</span></div></div>
    <figure class="history-overview"><figcaption>Listening hours / year</figcaption>${timeline.join('')}</figure>
    <div class="history-years">${years.map(y => `<details class="history-year"${y === years.at(-1) ? ' open' : ''}><summary><span class="history-year-number">${esc(y.year)}</span><span class="history-year-artist">${esc(y.topArtists[0]?.name || 'A year in music')}</span><span class="history-year-hours">${number(y.hours)} h <span aria-hidden="true">↗</span></span></summary><div class="history-year-body"><p class="fine-print">${number(y.plays)} plays · ${number(y.artists)} artists · ${number(y.tracks)} different songs</p><figure class="month-chart"><figcaption>Hours by month · same scale across every year</figcaption><div class="month-bars">${y.months.map((hours, i) => `<div class="month-column"><span class="month-value">${number(hours)}</span><div class="month-track"><span style="height:${hours ? Math.max(1, hours / monthMax * 100) : 0}%"></span></div><span>${months[i]}</span></div>`).join('')}</div></figure><p class="eyebrow">The artists that defined ${esc(y.year)}</p><ol class="history-artists">${y.topArtists.map(a => `<li><span>${esc(a.name)}</span><span>${number(a.hours)} h</span></li>`).join('')}</ol></div></details>`).join('')}</div>
    <p class="fine-print">${esc(history.source)} · ${esc(history.from)} – ${esc(history.through)}.<br>Music plays of at least 30 seconds; hours reflect time actually listened. Rankings are by listening time. Dates use UTC. Years and months may have partial coverage; no recorded plays does not necessarily mean no listening.</p>`;
}

export function observedListening(feed, now = Date.now()) {
  const history = feed.observed;
  const merge = field => {
    const values = new Map();
    for (const month of history.months) for (const value of month[field]) {
      const old = values.get(value.id);
      values.set(value.id, { ...value, plays: value.plays + (old?.plays || 0) });
    }
    return [...values.values()].sort((a, b) => b.plays - a.plays || a.id.localeCompare(b.id));
  };
  const artists = merge('artists'), tracks = merge('tracks');
  const plays = history.months.reduce((sum, m) => sum + m.plays, 0);
  const repeats = tracks.reduce((sum, t) => sum + Math.max(0, t.plays - 1), 0);
  const fmt = n => n.toLocaleString('en-US');
  const date = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const monthName = value => new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const months = new Map(history.months.map(m => [m.month, m]));
  const timeline = [];
  const cursor = new Date(`${history.months[0].month}-01T00:00:00Z`);
  const lastMonth = history.months.at(-1).month;
  const max = Math.max(...history.months.map(m => m.plays), 1);
  while (cursor.toISOString().slice(0, 7) <= lastMonth) {
    const key = cursor.toISOString().slice(0, 7), m = months.get(key);
    timeline.push(`<div class="history-row observed-row"><strong>${esc(monthName(key))}</strong>${m ? `<div class="history-bar-track"><span class="history-bar" style="width:${Math.max(.5, m.plays / max * 100)}%"></span></div><span>${fmt(m.plays)} plays</span>` : '<span class="history-no-data">No observations</span>'}</div>`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const top = artists[0];
  return `<p class="history-intro">${top ? `${esc(top.name)} leads the rotation` : 'The rotation so far'}${tracks[0]?.plays > 1 ? `; ${esc(tracks[0].title)} keeps coming back.` : '.'}</p>
    <div class="section-meta"><span>${esc(date(history.from))} – ${esc(date(history.through))}</span><span>${esc(status(feed, now))}</span></div>
    <p class="fine-print">${fmt(plays)} captured plays, ${fmt(artists.length)} artists. ${Math.round(repeats / plays * 100)}% of the plays were songs I came back to.</p>
    <div class="listening-rankings"><section><h3>Who’s in the rotation</h3><ol class="history-artists">${artists.slice(0, 5).map(a => `<li><span>${a.url ? link(a.url, esc(a.name)) : esc(a.name)}</span><span>${fmt(a.plays)} plays</span></li>`).join('')}</ol></section><section><h3>Coming back to</h3><ol class="history-artists">${tracks.slice(0, 5).map(t => `<li><span>${link(t.url, `${esc(t.title)}<small>${esc(t.artist)}</small>`)}</span><span>${fmt(t.plays)} ${t.plays === 1 ? 'play' : 'plays'}</span></li>`).join('')}</ol></section></div>
    <figure class="history-overview"><figcaption>Captured plays / month</figcaption>${timeline.join('')}</figure>
    ${history.months.length > 1 ? `<details class="monthly-rotation"><summary>How the rotation changed</summary><ol class="rotation-months">${history.months.map(m => { const leaders = [...m.artists].sort((a, b) => b.plays - a.plays).slice(0, 3); return `<li><strong>${esc(monthName(m.month))}</strong><span>${leaders.map(a => esc(a.name)).join(' · ') || 'No artist metadata'}</span></li>`; }).join('')}</ol></details>` : ''}
    <p class="fine-print">Based on plays captured from Spotify’s recent-history feed, which returns up to 50 plays per check. Checks run daily, so this is a sample, not a complete listening history. Repeat plays are plays beyond the first captured play of each song. Artist counts credit each artist on a track. The monthly timeline grows with future checks; dates use UTC.</p>
    `;
}

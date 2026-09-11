// Aggregate the plays returned by Spotify. A timestamp watermark prevents
// overlapping refreshes from counting a play twice without retaining raw logs.
export function observeListening(previous, items) {
  const result = structuredClone(previous || { months: [], lastPlayedAt: null, lastKeys: [] });
  const oldTime = Date.parse(result.lastPlayedAt) || 0;
  const known = new Set(result.lastKeys);
  const incoming = new Set();
  let newest = oldTime;
  let newestKeys = new Set(result.lastKeys);
  for (const item of items) {
    const t = item.track;
    const time = Date.parse(item.played_at);
    if (!Number.isFinite(time) || time < oldTime || !t?.id || !t.name || t.is_local || t.type === 'episode' || !t.external_urls?.spotify) continue;
    const key = JSON.stringify([time, t.id]);
    if ((time === oldTime && known.has(key)) || incoming.has(key)) continue;
    incoming.add(key);
    const date = new Date(time).toISOString();
    if (time > newest) { newest = time; newestKeys = new Set(); }
    if (time === newest) newestKeys.add(key);
    result.from = !result.from || date < result.from ? date : result.from;
    result.through = !result.through || date > result.through ? date : result.through;
    const month = date.slice(0, 7);
    let bucket = result.months.find(m => m.month === month);
    if (!bucket) { bucket = { month, plays: 0, artists: [], tracks: [] }; result.months.push(bucket); }
    bucket.plays++;
    const artistIds = new Set();
    for (const a of t.artists || []) {
      const id = a.id || a.name;
      if (!id || !a.name || artistIds.has(id)) continue;
      artistIds.add(id);
      let artist = bucket.artists.find(a => a.id === id);
      if (!artist) { artist = { id, name: a.name, url: a.external_urls?.spotify || '', plays: 0 }; bucket.artists.push(artist); }
      artist.plays++;
    }
    let song = bucket.tracks.find(song => song.id === t.id);
    if (!song) {
      song = { id: t.id, title: t.name, artist: (t.artists || []).map(a => a.name).join(', '), url: t.external_urls.spotify, image: t.album?.images?.[0]?.url || './assets/record.svg', plays: 0 };
      bucket.tracks.push(song);
    }
    song.plays++;
  }
  result.months.sort((a, b) => a.month.localeCompare(b.month));
  result.lastPlayedAt = newest ? new Date(newest).toISOString() : null;
  result.lastKeys = [...newestKeys];
  return result;
}

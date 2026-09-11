// Only aggregate music statistics leave the importer; no device, IP or raw play log.
export function summarizeHistory(rows) {
  const years = new Map(), seen = new Set();
  let first, last;
  for (const row of rows) {
    const { ts, ms_played: ms, master_metadata_album_artist_name: artist, master_metadata_track_name: track } = row;
    const time = Date.parse(ts);
    if (!Number.isFinite(time) || typeof ms !== 'number' || !Number.isFinite(ms) || ms < 30000 || typeof artist !== 'string' || !artist || typeof track !== 'string' || !track) continue;
    const date = new Date(time).toISOString();
    const key = JSON.stringify([date, row.spotify_track_uri || [artist, track], ms]);
    if (seen.has(key)) continue;
    seen.add(key);
    first = !first || date < first ? date : first;
    last = !last || date > last ? date : last;
    const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)) - 1;
    if (!years.has(year)) years.set(year, { year, plays: 0, ms: 0, months: Array(12).fill(0), artists: new Map(), tracks: new Set() });
    const bucket = years.get(year);
    bucket.plays++; bucket.ms += ms; bucket.months[month] += ms;
    bucket.tracks.add(JSON.stringify([artist, track]));
    bucket.artists.set(artist, (bucket.artists.get(artist) || 0) + ms);
  }
  if (!seen.size) throw new Error('No music plays of at least 30 seconds found. Use Spotify Extended Streaming History audio JSON files.');
  return {
    version: 1, source: 'Spotify Extended Streaming History', from: first.slice(0, 10), through: last.slice(0, 10),
    years: [...years.values()].sort((a, b) => a.year - b.year).map(y => ({
      year: y.year, plays: y.plays, hours: y.ms / 3600000, artists: y.artists.size, tracks: y.tracks.size,
      months: y.months.map(ms => ms / 3600000),
      topArtists: [...y.artists].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([name, ms]) => ({ name, hours: ms / 3600000 }))
    }))
  };
}

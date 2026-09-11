import { observeListening } from './observed-listening.mjs';
export class FeedError extends Error {
  constructor(status, retryAt) { super(`Upstream request failed (${status})`); this.status = status; this.retryAt = retryAt; }
}
export async function requestJSON(url, options = {}, fetcher = fetch) {
  // Do not log response bodies, headers, or URLs: OAuth responses contain secrets.
  const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (response.status === 204) return null;
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 0;
    const retryAt = seconds ? new Date(Date.now() + seconds * 1000).toISOString() : (retry && Number.isFinite(Date.parse(retry)) ? new Date(retry).toISOString() : null);
    throw new FeedError(response.status, retryAt);
  }
  return response.json();
}
export function track(item) {
  if (!item || item.is_local || item.type === 'episode' || !item.name || !item.external_urls?.spotify) return null;
  return { id: item.id, title: item.name, artist: (item.artists || []).map(a => a.name).join(', '), album: item.album?.name || '', image: item.album?.images?.[0]?.url || './assets/record.svg', url: item.external_urls.spotify, durationMs: item.duration_ms || 0 };
}
export function recentTracks(items) {
  const seen = new Set();
  return items.flatMap(item => {
    const t = track(item.track);
    if (!t || seen.has(t.id)) return [];
    seen.add(t.id);
    return [{ ...t, playedAt: item.played_at }];
  }).slice(0, 8);
}
export async function spotifyFeed(env = process.env, fetcher = fetch, previous = {}) {
  const token = await requestJSON('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }).toString()
  }, fetcher);
  if (!token.access_token) throw new FeedError('invalid token response');
  if (token.refresh_token && token.refresh_token !== env.SPOTIFY_REFRESH_TOKEN) {
    console.warn('Spotify issued a replacement refresh token. Re-run npm run spotify:connect and upload the updated secret.');
  }
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const [current, recent] = await Promise.all([
    requestJSON('https://api.spotify.com/v1/me/player/currently-playing', { headers }, fetcher),
    requestJSON('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers }, fetcher)
  ]);
  if (!Array.isArray(recent?.items)) throw new FeedError('invalid recent tracks response');
  return { current: track(current?.item), isPlaying: Boolean(current?.is_playing), recent: recentTracks(recent.items), observed: observeListening(previous.observed, recent.items) };
}
const ghHeaders = env => ({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) });
export async function githubFeed(username, env = process.env, fetcher = fetch) {
  const events = await requestJSON(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`, { headers: ghHeaders(env) }, fetcher);
  if (!Array.isArray(events)) throw new FeedError('invalid events response');
  const verbs = { PushEvent: 'Pushed code to', PullRequestEvent: 'Worked on a pull request in', IssuesEvent: 'Worked on an issue in', CreateEvent: 'Created in', ReleaseEvent: 'Published a release in', WatchEvent: 'Starred', ForkEvent: 'Forked' };
  return { events: events.filter(e => e.public === true && verbs[e.type] && e.repo?.name).slice(0, 6).map(e => ({ id: e.id, action: verbs[e.type], repo: e.repo.name, url: `https://github.com/${e.repo.name}`, date: e.created_at })) };
}
export async function canvasFeed(env = process.env, fetcher = fetch) {
  const repo = await requestJSON('https://api.github.com/repos/ucfopen/canvasapi', { headers: ghHeaders(env) }, fetcher);
  if (!Number.isFinite(repo.stargazers_count) || !Number.isFinite(repo.forks_count)) throw new FeedError('invalid repository response');
  return { stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.pushed_at, url: 'https://github.com/ucfopen/canvasapi' };
}
export async function updateFeed(previous = {}, enabled, configured, run, now = new Date().toISOString()) {
  if (!enabled) return { status: 'disabled' };
  if (!configured) return { status: 'unconfigured' };
  if (previous.retryAt && Date.parse(previous.retryAt) > Date.parse(now)) return previous;
  try { return { ...await run(), status: 'ok', checkedAt: now, updatedAt: now }; }
  catch (error) {
    const code = error.status || 'network';
    return { ...previous, status: previous.updatedAt ? 'stale' : 'error', checkedAt: now, error: String(code), retryAt: error.retryAt || null };
  }
}

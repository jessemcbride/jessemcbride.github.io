import test from 'node:test';
import assert from 'node:assert/strict';
import { spotifyFeed, githubFeed, updateFeed, recentTracks, requestJSON, FeedError } from '../scripts/lib/feeds.mjs';
import { music, status } from '../public/view.js';

const track = (id = 'a') => ({ id, name: `Track ${id}`, type: 'track', artists: [{ name: 'Artist' }], album: { name: 'Album', images: [{ url: 'https://image.example/a.jpg' }] }, external_urls: { spotify: `https://open.spotify.com/track/${id}` }, duration_ms: 120000 });
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
test('Spotify transforms data without publishing credentials or private context', async () => {
  const called = [];
  const fetcher = async (url, options) => {
    called.push([url, options]);
    if (url.includes('/api/token')) return json({ access_token: 'private-access', refresh_token: 'private-refresh' });
    if (url.includes('currently-playing')) return json({ is_playing: true, item: track(), device: { name: 'private device' } });
    return json({ items: [{ track: track(), played_at: '2026-09-05T00:00:00Z', context: { private: true } }] });
  };
  const result = await spotifyFeed({ SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'private-refresh' }, fetcher);
  assert.equal(result.current.title, 'Track a');
  assert.equal(result.isPlaying, true);
  assert.equal(result.recent.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /private|secret|token|device|context/);
  assert.equal(called[1][1].headers.Authorization, 'Bearer private-access');
});
test('Spotify handles no active player and empty listening history', async () => {
  const result = await spotifyFeed({}, async url => url.includes('/api/token') ? json({ access_token: 'access' }) : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [] }));
  assert.equal(result.current, null); assert.equal(result.isPlaying, false); assert.deepEqual(result.recent, []); assert.deepEqual(result.observed.months, []);
});
test('Recent tracks deduplicate and omit unavailable, local and podcast entries', () => {
  const result = recentTracks([{ track: track() }, { track: track() }, { track: null }, { track: { ...track('b'), is_local: true } }, { track: { ...track('c'), type: 'episode' } }, { track: track('d') }]);
  assert.deepEqual(result.map(t => t.id), ['a', 'd']);
});
test('Failure preserves last-good data and its original timestamp', async () => {
  const previous = { status: 'ok', updatedAt: '2026-09-01T00:00:00Z', recent: [{ title: 'Kept' }] };
  const result = await updateFeed(previous, true, true, async () => { throw new FeedError(503); }, '2026-09-05T00:00:00Z');
  assert.equal(result.status, 'stale');
  assert.equal(result.updatedAt, previous.updatedAt);
  assert.equal(result.recent[0].title, 'Kept');
  assert.equal(result.checkedAt, '2026-09-05T00:00:00Z');
});
test('Disabling or disconnecting an integration removes retained public data', async () => {
  const previous = { status: 'ok', recent: [{ title: 'Old' }] };
  const run = () => { throw new Error('Must not run'); };
  assert.deepEqual(await updateFeed(previous, false, true, run), { status: 'disabled' });
  assert.deepEqual(await updateFeed(previous, true, false, run), { status: 'unconfigured' });
});
test('Rate limits honor Retry-After across scheduled runs', async () => {
  let caught;
  try { await requestJSON('https://example.com', {}, async () => new Response('', { status: 429, headers: { 'Retry-After': '3600' } })); } catch (e) { caught = e; }
  assert.equal(caught.status, 429);
  assert.ok(Date.parse(caught.retryAt) > Date.now() + 3500000);
  const previous = { status: 'stale', retryAt: caught.retryAt };
  const result = await updateFeed(previous, true, true, () => assert.fail('Should not call rate-limited upstream'));
  assert.equal(result, previous);
});
test('Success recovers from stale state and removes the previous error', async () => {
  const result = await updateFeed({ status: 'stale', error: '401' }, true, true, async () => ({ recent: [] }), '2026-09-05T00:00:00Z');
  assert.equal(result.status, 'ok'); assert.equal(result.error, undefined);
});
test('GitHub emits only explicitly public events', async () => {
  const events = [{ id: '1', public: true, type: 'PushEvent', repo: { name: 'user/project' }, created_at: '2026-09-05T00:00:00Z' }, { id: '2', public: false, type: 'PushEvent', repo: { name: 'private/repo' } }];
  const result = await githubFeed('user', {}, async () => json(events));
  assert.equal(result.events.length, 1); assert.doesNotMatch(JSON.stringify(result), /private/);
});
test('Old snapshots are labeled stale even without another successful deployment', () => {
  const now = Date.parse('2026-09-05T12:00:00Z');
  assert.equal(status({ status: 'ok', updatedAt: '2026-09-05T10:00:00Z' }, now), 'Checked 2h ago');
  assert.equal(status({ status: 'ok', updatedAt: '2026-09-04T10:00:00Z' }, now), 'Checked 1d ago');
  assert.equal(status({ status: 'ok', updatedAt: '2026-09-03T10:00:00Z' }, now), 'Last successful check 2d ago');
  assert.equal(status({ status: 'stale', updatedAt: '2026-09-05T10:00:00Z' }, now), 'Last successful check 2h ago');
  assert.match(music({ current: { title: 'Song', url: 'https://open.spotify.com/track/a' }, isPlaying: true }, []), /Playing at last check/);
});
test('API text and malicious URLs cannot inject HTML into the music shelf', () => {
  const html = music({ recent: [{ title: '<script>bad()</script>', artist: '" onclick="bad()', image: 'javascript:bad()', url: 'javascript:bad()' }] });
  assert.doesNotMatch(html, /<script>|src="javascript:|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});

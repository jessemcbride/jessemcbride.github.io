import test from 'node:test';
import assert from 'node:assert/strict';
import { observeListening } from '../scripts/lib/observed-listening.mjs';
import { music } from '../public/view.js';
const play = (date, id = 'one') => ({ played_at: date, context: { secret: true }, track: { id, name: `Song ${id}`, type: 'track', external_urls: { spotify: `https://open.spotify.com/track/${id}` }, artists: [{ id: 'artist', name: '<Artist>', external_urls: { spotify: 'https://open.spotify.com/artist/artist' } }] } });
test('Overlapping refreshes count each observed play once and preserve earlier months', () => {
  const jan = play('2026-01-31T23:59:00Z');
  const feb = play('2026-02-01T00:01:00Z');
  const initial = observeListening(null, [feb, jan, jan]);
  const next = observeListening(initial, [play('2026-02-02T00:01:00Z'), feb]);
  assert.deepEqual(initial.months.map(m => m.plays), [1, 1]);
  assert.deepEqual(next.months.map(m => m.plays), [1, 2]);
  assert.deepEqual(observeListening(next, [feb, jan]), next);
  assert.doesNotMatch(JSON.stringify(next), /context|secret/);
  const html = music({ observed: next });
  assert.match(html, /67%/);
  assert.match(html, /Jan 2026/);
  assert.match(html, /&lt;Artist&gt;/);
  assert.doesNotMatch(html, /<Artist>/);
});
test('Timestamp ties, invalid plays and missing months are handled without invented counts', () => {
  const date = '2026-01-01T00:00:00Z';
  const first = observeListening(null, [play(date)]);
  const next = observeListening(first, [play(date), play(date, 'two'), play('bad'), { played_at: date, track: null }]);
  assert.equal(next.months[0].plays, 2);
  assert.deepEqual(observeListening(next, [play(date), play(date, 'two')]), next);
  const later = observeListening(next, [play('2026-03-01T00:00:00Z')]);
  assert.match(music({ observed: later }), /Feb 2026.*No observations/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistory } from '../scripts/lib/listening-history.mjs';
import { music } from '../public/view.js';
const play = (ts, artist = 'Artist', ms = 3600000) => ({ ts, ms_played: ms, master_metadata_album_artist_name: artist, master_metadata_track_name: 'Song', ip_addr: 'private', platform: 'private' });
test('History aggregates years, deduplicates overlapping exports, excludes skips and private fields', () => {
  const a = play('2020-12-31T23:00:00Z');
  const summary = summarizeHistory([a, a, play('2022-01-01T00:00:00Z', 'Other', 7200000), play('2022-01-01T01:00:00Z', 'Skip', 1000), play('invalid')]);
  assert.equal(summary.years.length, 2);
  assert.equal(summary.years[0].months[11], 1);
  assert.equal(summary.years[1].hours, 2);
  assert.equal(summary.years[1].topArtists[0].name, 'Other');
  assert.equal(summary.years[0].plays, 1);
  assert.doesNotMatch(JSON.stringify(summary), /private|ip_addr|platform/);
  const html = music({}, [], Date.now(), summary);
  assert.match(html, /2021.*No recorded plays/);
  assert.match(html, /Hours by month/);
  assert.doesNotMatch(html, /Recently listened/);
});
test('History uses UTC, preserves repeat plays and safely renders artist names', () => {
  const summary = summarizeHistory([play('2020-12-31T23:30:00-05:00', '<script>'), play('2021-02-02T01:00:00Z', '<script>')]);
  assert.equal(summary.years[0].year, 2021);
  assert.equal(summary.years[0].plays, 2);
  assert.equal(summary.years[0].artists, 1);
  assert.equal(summary.years[0].tracks, 1);
  assert.match(music({}, [], Date.now(), summary), /&lt;script&gt;/);
  assert.doesNotMatch(music({}, [], Date.now(), summary), /<script>/);
  assert.throws(() => summarizeHistory([]), /No music plays/);
});

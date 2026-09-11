import test from 'node:test';
import assert from 'node:assert/strict';
import { playerSnapshot, wiseOldManFeed, collectionSnapshot, collectionLogFeed } from '../scripts/lib/osrs.mjs';
import { osrs } from '../public/osrs.js';
const player = { id: 1, username: 'nonduality', type: 'ironman', combatLevel: 98, latestSnapshot: { createdAt: '2026-09-11T00:00:00Z', data: { skills: { overall: { level: 1761, experience: 32813930 }, attack: { level: 75, experience: 1300000 }, sailing: { level: 1, experience: 0 } }, bosses: { wintertodt: { kills: 354 }, zulrah: { kills: -1 } }, activities: { collections_logged: { score: 186 } } } } };
test('WOM refreshes the current username and safely projects the snapshot', async () => {
  let method;
  const feed = await wiseOldManFeed('Nonduality', async (url, options) => { assert.match(url, /players\/nonduality$/); method = options.method; return new Response(JSON.stringify(player)); });
  assert.equal(method, 'POST');
  assert.equal(feed.combat, 98); assert.equal(feed.bosses.length, 1);
  const html = osrs(feed, {}, 'Nonduality');
  assert.match(html, /formerly I am a bot/); assert.match(html, /186 collection slots/);
  assert.match(html, /osrs\/sailing.png/); assert.doesNotMatch(html, />-1</);
  assert.throws(() => playerSnapshot({ ...player, username: 'someone else' }, 'Nonduality'));
  assert.doesNotMatch(osrs(feed, {}, 'Different'), /1,761 total/);
});
test('Missing collection sync is distinct from an empty collection or network failure', async () => {
  const log = collectionSnapshot({ error: { Code: 402 } }, 'Nonduality');
  assert.equal(log.availability, 'not-synced'); assert.equal(log.obtained, undefined);
  assert.throws(() => collectionSnapshot({ error: { Code: 500 } }, 'Nonduality'));
  const synced = collectionSnapshot({ data: { player: 'nonduality', total_collections_finished: 0, total_collections_available: 1700, items: [] } }, 'Nonduality');
  assert.equal(synced.obtained, 0); assert.equal(synced.availability, 'synced');
});
test('Collection items are escaped and notable endpoint failure preserves the log', async () => {
  const data = { data: { player: 'nonduality', total_collections_finished: 1, items: [{ id: 24495, name: '<Smolcano>', count: 1 }, { id: 'bad', count: 2 }] } };
  const log = await collectionLogFeed('Nonduality', async url => { if (url.includes('recent_items')) throw new Error(); return new Response(JSON.stringify(data)); });
  assert.equal(log.items.length, 1); assert.equal(log.notableUnavailable, true);
  const html = osrs(playerSnapshot(player, 'Nonduality'), log, 'Nonduality');
  assert.match(html, /&lt;Smolcano&gt;/); assert.doesNotMatch(html, /<Smolcano>/);
  assert.match(html, /cache\/item\/icon\/24495.png/);
});

test('Initial collection sync deduplicates shared category items and has no recent drops', async () => {
  const response = { data: { player: 'nonduality', total_collections_finished: 1, items: [{ id: 23760, name: 'Smolcano', count: 1 }, { id: 23760, name: 'Smolcano', count: 1 }] } };
  const log = await collectionLogFeed('Nonduality', async url => new Response(JSON.stringify(url.includes('recent_items') ? { error: { Code: 403, Message: 'Player has not received any new items after their initial sync.' } } : response)));
  assert.equal(log.items.length, 1); assert.equal(log.items[0].count, 1);
  assert.deepEqual(log.notable, []); assert.equal(log.notableUnavailable, undefined);
});

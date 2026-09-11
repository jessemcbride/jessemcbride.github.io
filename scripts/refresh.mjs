import { wiseOldManFeed, collectionLogFeed } from './lib/osrs.mjs';
import { readJSON, readActivity, writeJSON, validateSite } from './lib/content.mjs';
import { updateFeed, spotifyFeed, githubFeed, canvasFeed } from './lib/feeds.mjs';

const site = validateSite(await readJSON('content/site.json'));
const previous = await readActivity();
const now = new Date().toISOString();
const configured = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'].every(k => Boolean(process.env[k]));
const [spotify, github, canvasapi, wiseOldMan, collectionLog] = await Promise.all([
  updateFeed(previous.spotify, site.integrations.spotify, configured, () => spotifyFeed(process.env, fetch, previous.spotify), now),
  updateFeed(previous.github, site.integrations.github, true, () => githubFeed(site.github), now),
  updateFeed(previous.canvasapi, site.integrations.canvasapi, true, () => canvasFeed(), now),
  updateFeed(previous.wiseOldMan?.username === site.now.game ? previous.wiseOldMan : {}, site.integrations.wiseOldMan !== false, true, () => wiseOldManFeed(site.now.game), now),
  updateFeed(previous.collectionLog?.username === site.now.game ? previous.collectionLog : {}, site.integrations.wiseOldMan !== false, true, () => collectionLogFeed(site.now.game), now)
]);
await writeJSON('data/activity.json', { version: 1, generatedAt: now, spotify, github, canvasapi, wiseOldMan, collectionLog });
for (const [name, feed] of Object.entries({ spotify, github, canvasapi, wiseOldMan, collectionLog })) {
  console.log(`${name}: ${feed.status}${feed.error ? ` (${feed.error})` : ''}`);
  if (['stale', 'error'].includes(feed.status) && process.env.GITHUB_ACTIONS) console.log(`::warning title=${name} update failed::${feed.error}; last successful data retained when available.`);
}

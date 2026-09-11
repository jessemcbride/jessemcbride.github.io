import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readJSON, readActivity, validateSite, validateMusic } from './lib/content.mjs';
import { page } from '../src/page.mjs';

export async function build() {
  const site = validateSite(await readJSON('content/site.json'));
  const favorites = validateMusic(await readJSON('content/music.json'));
  const activity = await readActivity();
  let history = null;
  try { history = await readJSON('content/listening-history.json'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (!site.integrations.spotify) history = null;
  if (!site.integrations.spotify) activity.spotify = { status: 'disabled' };
  if (!site.integrations.github) activity.github = { status: 'disabled' };
  if (!site.integrations.canvasapi) activity.canvasapi = { status: 'disabled' };
  // Explicit allowlist: source archives, editor, credentials and scripts are never published.
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist/data', { recursive: true });
  await cp('public', 'dist', { recursive: true });
  await writeFile('dist/index.html', page(site, favorites, activity, history));
  await writeFile('dist/data/activity.json', JSON.stringify(activity));
  await writeFile('dist/data/content.json', JSON.stringify({ github: site.github, favorites, history, integrations: site.integrations }));
  await writeFile('dist/.nojekyll', '');
  await writeFile('dist/404.html', '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found</title><body style="background:#0d0b10;color:#ddd6dc;font:20px Georgia;padding:10vw"><h1>This corner is empty.</h1><p>The page you requested does not exist. Use your browser’s back button to return.</p></body></html>');
  if (site.domain) await writeFile('dist/CNAME', site.domain + '\n');
  else await rm('dist/CNAME', { force: true });
  console.log('Built dist/ — static HTML, local assets, public feed data.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await build();

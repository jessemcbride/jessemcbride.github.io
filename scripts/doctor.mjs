import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { readJSON, validateSite, validateMusic } from './lib/content.mjs';

let failures = 0;
function report(name, ok, help = '') { console.log(`${ok ? '✓' : '○'} ${name}${!ok && help ? ` — ${help}` : ''}`); }
report('Node 24+', Number(process.versions.node.split('.')[0]) >= 24, 'Install Node 24');
for (const [path, validator] of [['content/site.json', validateSite], ['content/music.json', validateMusic]]) {
  try { validator(await readJSON(path)); report(path, true); } catch (e) { report(path, false, e.message); failures++; }
}
for (const key of ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN']) report(key, Boolean(process.env[key]), 'Not configured in .env');
try { execFileSync('git', ['remote', 'get-url', 'origin'], { stdio: 'pipe' }); report('Git remote', true); } catch { report('Git remote', false, 'See first deployment in README.md'); }
try { await access('dist/index.html'); report('Production build', true); } catch { report('Production build', false, 'npm run build'); }
console.log('Secrets are never printed. Missing Spotify credentials do not prevent local preview or deployment.');
process.exitCode = failures ? 1 : 0;

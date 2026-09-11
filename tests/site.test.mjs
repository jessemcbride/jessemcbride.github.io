import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { build } from '../scripts/build.mjs';
import { createDevServer } from '../scripts/dev.mjs';
import { readJSON, validateSite, validateMusic } from '../scripts/lib/content.mjs';

const root = process.cwd();
let temporary, server, origin, content;
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'jesse-site-test-'));
  for (const directory of ['content', 'public', 'src']) await cp(join(root, directory), join(temporary, directory), { recursive: true });
  process.chdir(temporary);
  await writeFile('.env', 'SECRET=never-publish-this');
  await build();
  server = createDevServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  content = { site: await readJSON('content/site.json'), music: await readJSON('content/music.json') };
});
after(async () => { if (server) { server.close(); await once(server, 'close'); } process.chdir(root); });

test('Build is useful without JavaScript and omits the removed CanvasAPI section', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /Tomato Knight/); assert.match(html, /Momma/); assert.match(html, /staff software engineer at Apple/);
  assert.doesNotMatch(html, /built with CanvasAPI|id="canvasapi"|repo-search/); assert.doesNotMatch(html, /jesse-house\.jwmcbride\.chatgpt\.site/);
});
test('Every local HTML asset exists and resolves under a GitHub Pages project path', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m => m[1]);
  assert.ok(assets.length >= 10);
  for (const asset of assets) {
    await access(join('dist', asset));
    const parsed = new URL(asset, 'https://user.github.io/jesse.garden/');
    assert.ok(parsed.pathname.startsWith('/jesse.garden/'));
  }
});
test('Public build excludes editor, environment, original inputs and server scripts', async () => {
  const names = await readdir('dist', { recursive: true });
  for (const path of names) assert.doesNotMatch(path, /manage|\.env|js\.mhtml|^old|^scripts|^src/);
  assert.doesNotMatch(await readFile('dist/index.html', 'utf8'), /never-publish-this|EDITOR_TOKEN/);
});
test('Custom domains produce CNAME and removing the domain removes it', async () => {
  const next = structuredClone(content.site); next.domain = 'jesse.garden';
  await writeFile('content/site.json', JSON.stringify(next)); await build();
  assert.equal(await readFile('dist/CNAME', 'utf8'), 'jesse.garden\n');
  await writeFile('content/site.json', JSON.stringify({ ...content.site, domain: '' })); await build();
  await assert.rejects(access('dist/CNAME'));
  await writeFile('content/site.json', JSON.stringify(content.site)); await build();
});
test('Disabling a feed removes it from the public snapshot and GitHub UI', async () => {
  const next = structuredClone(content.site); next.integrations.github = false;
  await writeFile('content/site.json', JSON.stringify(next)); await build();
  assert.doesNotMatch(await readFile('dist/index.html', 'utf8'), /id="activity"/);
  assert.deepEqual((await readJSON('dist/data/activity.json')).github, { status: 'disabled' });
  await writeFile('content/site.json', JSON.stringify(content.site)); await build();
});
test('Content validation rejects broken shapes, script URLs and invalid domains', () => {
  assert.throws(() => validateSite({ ...content.site, github: '../bad' }));
  assert.throws(() => validateSite({ ...content.site, domain: 'https://example.com/' }));
  assert.throws(() => validateSite({ ...content.site, projects: [{ title: 'x' }] }));
  assert.throws(() => validateMusic([{ title: 'x', artist: 'y', url: 'javascript:bad()', image: './assets/record.svg' }]));
});
test('Development server serves site and local editor but never repository secrets', async () => {
  assert.equal((await fetch(origin)).status, 200);
  assert.equal((await fetch(origin + '/manage')).status, 200);
  for (const path of ['/.env', '/scripts/refresh.mjs', '/old/data', '/js.mhtml', '/%2e%2e%2f.env']) assert.equal((await fetch(origin + path)).status, 404, path);
});
test('Editor rejects cross-origin writes and requests without its token', async () => {
  const response = await fetch(origin + '/__content', { method: 'POST', headers: { Origin: 'https://attacker.example' }, body: JSON.stringify(content) });
  assert.equal(response.status, 403);
  const noToken = await fetch(origin + '/__content', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify(content) });
  assert.equal(noToken.status, 403);
});
test('Authorized editor save validates and rebuilds actual site content', async () => {
  const html = await (await fetch(origin + '/manage')).text();
  const token = html.match(/const token='([a-f0-9]+)'/)[1];
  const edited = structuredClone(content); edited.site.now.note = 'A saved garden note.';
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'X-Editor-Token': token };
  const response = await fetch(origin + '/__content', { method: 'POST', headers, body: JSON.stringify(edited) });
  assert.equal(response.status, 200);
  assert.match(await readFile('dist/index.html', 'utf8'), /A saved garden note/);
  assert.equal((await readJSON('content/site.json')).now.note, 'A saved garden note.');
  const invalid = await fetch(origin + '/__content', { method: 'POST', headers, body: '{oops' });
  assert.equal(invalid.status, 400);
  assert.equal((await readJSON('content/site.json')).now.note, 'A saved garden note.');
});
test('Production preview exposes no management endpoints', async () => {
  const preview = createDevServer({ preview: true }); preview.listen(0, '127.0.0.1'); await once(preview, 'listening');
  try { for (const path of ['/manage', '/__content', '/__revision']) assert.equal((await fetch(`http://127.0.0.1:${preview.address().port}${path}`)).status, 404); }
  finally { preview.close(); await once(preview, 'close'); }
});

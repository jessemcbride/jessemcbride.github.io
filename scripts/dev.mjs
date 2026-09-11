import { createServer } from 'node:http';
import { readFile, watch, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { build } from './build.mjs';
import { readJSON, writeJSON, validateSite, validateMusic } from './lib/content.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain' };
export function createDevServer({ preview = false } = {}) {
  const nonce = randomBytes(32).toString('hex');
  let revision = Date.now(), busy = false;
  const server = createServer(async (req, res) => {
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!allowedHosts.includes(req.headers.host)) { res.writeHead(403).end('Host rejected'); return; }
    const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      const pathname = decodeURIComponent(new URL(req.url, origin).pathname);
      if (!preview && pathname.startsWith('/__')) {
        const supplied = Buffer.from(req.headers['x-editor-token'] || '');
        const validToken = supplied.length === nonce.length && timingSafeEqual(supplied, Buffer.from(nonce));
        const validOrigin = [`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin);
        if (req.method !== 'GET' && (!validToken || !validOrigin)) { send(403, { error: 'Reload the local editor and try again.' }); return; }
        if (pathname === '/__revision' && req.method === 'GET') { send(200, { revision }); return; }
        if (pathname === '/__content' && req.method === 'GET') { send(200, { site: await readJSON('content/site.json'), music: await readJSON('content/music.json') }); return; }
        if (pathname === '/__content' && req.method === 'POST') {
          if (busy) { send(409, { error: 'An update is already running. Try again shortly.' }); return; }
          let body = '';
          for await (const chunk of req) { body += chunk; if (body.length > 200000) { send(413, { error: 'Content is too large.' }); return; } }
          const content = JSON.parse(body);
          validateSite(content.site); validateMusic(content.music);
          busy = true;
          try { await writeJSON('content/site.json', content.site); await writeJSON('content/music.json', content.music); await build(); revision = Date.now(); send(200, { saved: true }); }
          finally { busy = false; }
          return;
        }
        if (pathname === '/__refresh' && req.method === 'POST') {
          if (busy) { send(409, { error: 'An update is already running. Try again shortly.' }); return; }
          busy = true;
          const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'scripts/refresh.mjs'], { stdio: 'inherit' });
          child.on('error', () => { busy = false; send(500, { error: 'Unable to start the refresh.' }); });
          child.on('exit', async code => {
            try { if (code !== 0) throw new Error(); await build(); revision = Date.now(); send(200, { refreshed: true, activity: await readJSON('data/activity.json') }); }
            catch { send(500, { error: 'Refresh failed. Check the terminal.' }); }
            finally { busy = false; }
          });
          return;
        }
        send(404, { error: 'Not found' }); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      if (!preview && pathname === '/manage') {
        const html = (await readFile('src/manage.html', 'utf8')).replaceAll('__EDITOR_TOKEN__', nonce);
        res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' }).end(req.method === 'HEAD' ? '' : html); return;
      }
      const file = resolve('dist', '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(resolve('dist') + '/') || pathname.split('/').some(p => p.startsWith('.') && p !== '.nojekyll')) { res.writeHead(404).end('Not found'); return; }
      let data = await readFile(file);
      if (!preview && extname(file) === '.html') data = Buffer.from(data.toString().replace('</body>', `<script>let rev;setInterval(async()=>{try{const r=await(await fetch('/__revision')).json();if(rev&&rev!==r.revision)location.reload();rev=r.revision}catch{}},1500)</script></body>`));
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(req.method === 'HEAD' ? '' : data);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') { res.writeHead(404).end('Not found'); }
      else send(400, { error: error instanceof SyntaxError ? 'Invalid JSON. Check commas and quotes.' : error.message });
    }
  });
  server.rebuild = async () => { if (busy) return; busy = true; try { await build(); revision = Date.now(); } finally { busy = false; } };
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const preview = process.argv.includes('--preview');
  await mkdir('data', { recursive: true });
  await build();
  const server = createDevServer({ preview });
  const port = Number(process.env.PORT || 4321);
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Site: http://127.0.0.1:${port}/${preview ? '' : `\nEditor: http://127.0.0.1:${port}/manage`}`));
  if (!preview) {
    let timer;
    for (const directory of ['content', 'public', 'data']) {
      (async () => { for await (const event of watch(directory, { recursive: true })) { if (event.filename?.endsWith('.tmp')) continue; clearTimeout(timer); timer = setTimeout(() => server.rebuild().catch(e => console.error(e.message)), 150); } })().catch(e => console.error(`Watch failed: ${e.message}`));
    }
  }
}

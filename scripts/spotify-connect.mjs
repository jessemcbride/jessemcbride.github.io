import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { requestJSON } from './lib/feeds.mjs';

const { SPOTIFY_CLIENT_ID: client, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!client || !secret) { console.error('Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env first. See README.md.'); process.exit(1); }
const redirect = 'http://127.0.0.1:8888/callback';
const state = randomBytes(32).toString('hex');
const authorize = new URL('https://accounts.spotify.com/authorize');
authorize.search = new URLSearchParams({ client_id: client, response_type: 'code', redirect_uri: redirect, state, scope: 'user-read-currently-playing user-read-recently-played' }).toString();
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.headers.host !== '127.0.0.1:8888') { res.writeHead(403).end('Invalid host'); return; }
  const url = new URL(req.url, redirect);
  if (url.pathname !== '/callback') { res.writeHead(404).end('Not found'); return; }
  const received = Buffer.from(url.searchParams.get('state') || '');
  if (received.length !== state.length || !timingSafeEqual(received, Buffer.from(state))) { res.writeHead(403).end('Invalid authorization state. Retry the link from your terminal.'); return; }
  if (!url.searchParams.get('code') || url.searchParams.has('error')) { res.writeHead(400).end('Authorization was not granted. Run npm run spotify:connect to try again.'); server.close(); clearTimeout(timeout); return; }
  try {
    const token = await requestJSON('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${client}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirect }).toString()
    });
    if (typeof token.refresh_token !== 'string' || !token.refresh_token || /[\r\n"\\]/.test(token.refresh_token)) throw new Error('No valid refresh token returned');
    let env = await readFile('.env', 'utf8').catch(e => { if (e.code !== 'ENOENT') throw e; return ''; });
    env = env.replace(/^SPOTIFY_REFRESH_TOKEN=.*\r?\n?/gm, '').trimEnd() + `\nSPOTIFY_REFRESH_TOKEN="${token.refresh_token}"\n`;
    await writeFile('.env', env, { mode: 0o600 }); await chmod('.env', 0o600);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Spotify connected. You can close this tab and return to the terminal.');
    console.log('Refresh token saved to .env (not printed). Run npm run refresh, then npm run dev. Upload the three Spotify secrets to GitHub for scheduled updates.');
  } catch { res.writeHead(500).end('Connection failed. Check your Spotify app credentials and redirect URI, then try again.'); console.error('Spotify connection failed; no tokens were logged.'); process.exitCode = 1; }
  finally { server.close(); clearTimeout(timeout); }
});
const timeout = setTimeout(() => { console.error('Authorization timed out after 10 minutes. Run the command again to retry.'); server.close(); process.exitCode = 1; }, 600000);
server.on('error', e => { clearTimeout(timeout); console.error(e.message); process.exitCode = 1; });
server.listen(8888, '127.0.0.1', () => console.log(`Open this URL to connect Spotify:\n${authorize}\n\nRegistered redirect URI must be exactly ${redirect}`));

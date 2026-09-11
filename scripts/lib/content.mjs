import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
export async function writeJSON(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n');
  await rename(temp, path);
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function safeURL(value, { local = false } = {}) {
  if (local && /^\.\/assets\/[\w./-]+$/.test(value) && !value.includes('..')) return value;
  try { const u = new URL(value); return ['https:', 'mailto:'].includes(u.protocol) ? value : '#'; } catch { return '#'; }
}
export function validateSite(site) {
  for (const key of ['title', 'name', 'firstName', 'lastName', 'role', 'location', 'description', 'github', 'email']) {
    if (typeof site[key] !== 'string' || !site[key].trim() || site[key].length > 1000) throw new Error(`site.${key} must be a non-empty string (max 1000 characters)`);
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(site.github)) throw new Error('Invalid GitHub username');
  if (site.domain && !/^(?=.{1,253}$)([a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(site.domain)) throw new Error('domain must be a hostname without https:// or a path');
  if (!Array.isArray(site.about) || site.about.some(x => typeof x !== 'string')) throw new Error('about must be an array of paragraphs');
  if (!site.now || ['note', 'game', 'gameNote'].some(k => typeof site.now[k] !== 'string')) throw new Error('now must contain note, game and gameNote strings');
  if (!site.integrations || ['spotify', 'github', 'canvasapi'].some(k => typeof site.integrations[k] !== 'boolean')) throw new Error('integrations must contain spotify, github and canvasapi booleans');
  if (site.integrations.wiseOldMan !== undefined && typeof site.integrations.wiseOldMan !== 'boolean') throw new Error('wiseOldMan must be a boolean');
  if (!Array.isArray(site.projects) || site.projects.some(p => !p.title || !p.summary || !Array.isArray(p.body) || p.body.some(x => typeof x !== 'string') || (p.url && safeURL(p.url) === '#'))) throw new Error('Each project needs title, summary, body paragraphs, and an optional HTTPS URL');
  return site;
}
export function validateMusic(music) {
  if (!Array.isArray(music) || music.some(t => !t.title || !t.artist || safeURL(t.url) === '#' || safeURL(t.image, { local: true }) === '#')) throw new Error('Each record needs title, artist, HTTPS URL and an HTTPS or ./assets/ image');
  return music;
}
export async function readActivity() {
  try { return await readJSON('data/activity.json'); } catch (e) { if (e.code !== 'ENOENT') throw e; return { version: 1, spotify: { status: 'unconfigured' }, github: { status: 'pending' }, canvasapi: { status: 'pending' } }; }
}

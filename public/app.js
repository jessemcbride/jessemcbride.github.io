import { esc, link, music, github, canvasStats } from './view.js';

const getJSON = async path => {
  const response = await fetch(new URL(path, import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
  return response.json();
};
let content, activity;
function renderFeeds() {
  if (!content || !activity) return;
  document.querySelector('#music-content').innerHTML = music(content.integrations.spotify ? activity.spotify : { status: 'disabled' }, content.favorites, Date.now(), content.history);
  const gh = document.querySelector('#github-content');
  if (gh) gh.innerHTML = github(activity.github, content.github);
  document.querySelector('#canvas-stats').innerHTML = canvasStats(content.integrations.canvasapi ? activity.canvasapi : {});
}
let refreshing = false;
async function refresh() {
  if (document.hidden || refreshing) return;
  refreshing = true;
  try {
    content ||= await getJSON('./data/content.json');
    activity = await getJSON('./data/activity.json');
    renderFeeds();
  } catch { /* Server-rendered content remains usable offline; existing timestamps keep aging. */ renderFeeds(); }
  finally { refreshing = false; }
}
refresh();
setInterval(refresh, 60000);
document.addEventListener('visibilitychange', refresh);
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#loop-back').addEventListener('click', () => {
  document.querySelector('#intro-title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
const nav = [...document.querySelectorAll('.nav a')];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (!visible) return;
  for (const a of nav) {
    const selected = a.hash === `#${visible.target.id}`;
    a.classList.toggle('active', selected);
    if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  }
}, { rootMargin: '-5% 0px -55% 0px', threshold: 0 });
document.querySelectorAll('main > section, #home').forEach(s => observer.observe(s));
let repositories = [], limit = 12;
const search = document.querySelector('#repo-search'), sort = document.querySelector('#repo-sort'), more = document.querySelector('#load-more');
function renderRepos() {
  const query = search.value.toLowerCase().trim();
  const matches = repositories.filter(r => `${r.owner}/${r.name}`.toLowerCase().includes(query)).sort(sort.value === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.stars - a.stars);
  document.querySelector('#repo-results').innerHTML = matches.slice(0, limit).map(r => `<article class="archive-repo">${link(`https://github.com/${r.owner}/${r.name}`, `<strong>${esc(r.name)}</strong><span>${esc(r.owner)}</span>`)}<span class="repo-stars">☆ ${esc(r.stars)}</span></article>`).join('');
  document.querySelector('#repo-count').textContent = matches.length ? `Showing ${Math.min(limit, matches.length)} of ${matches.length} projects` : 'No projects match. Try another name or owner.';
  more.hidden = matches.length <= limit;
}
search.addEventListener('input', () => { limit = 12; renderRepos(); });
sort.addEventListener('change', () => { limit = 12; renderRepos(); });
more.addEventListener('click', () => { limit += 12; renderRepos(); });
getJSON('./data/canvasapi.json').then(data => { repositories = data.repositories; renderRepos(); }).catch(() => { document.querySelector('#repo-count').textContent = 'The archive could not load. Please try refreshing the page.'; });

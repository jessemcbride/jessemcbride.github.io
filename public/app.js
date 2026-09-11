import { osrs } from './osrs.js';
import { music, github } from './view.js';

const getJSON = async path => {
  const response = await fetch(new URL(path, import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
  return response.json();
};
let content, activity;
function renderFeeds() {
  if (!content || !activity) return;
  document.querySelector('#music-content').innerHTML = music(content.integrations.spotify ? activity.spotify : { status: 'disabled' }, content.favorites, Date.now(), content.history);
  const account = document.querySelector('#osrs-content');
  const accountState = JSON.stringify([activity.wiseOldMan, activity.collectionLog, content.game, content.gameNote, content.integrations.wiseOldMan]);
  if (account && accountState !== account.dataset.snapshot) {
    account.dataset.snapshot = accountState;
    account.innerHTML = osrs(content.integrations.wiseOldMan === false ? { status: 'disabled' } : activity.wiseOldMan, content.integrations.wiseOldMan === false ? {} : activity.collectionLog, content.game, content.gameNote);
  }
  const gh = document.querySelector('#github-content');
  if (gh) gh.innerHTML = github(activity.github, content.github);
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

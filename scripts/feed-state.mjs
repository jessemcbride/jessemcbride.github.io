import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

// A tiny dedicated branch keeps last-good snapshots between runners without
// committing generated data to main or relying on expiring Actions caches.
const git = (args, options = {}) => execFileSync('git', args, { encoding: 'utf8', ...options }).trim();
const branch = 'refs/heads/site-data';
const mode = process.argv[2];
if (!['restore', 'save'].includes(mode)) throw new Error('Usage: node scripts/feed-state.mjs restore|save');
const exists = git(['ls-remote', '--heads', 'origin', branch]);
let parent;
if (exists) {
  git(['fetch', '--no-tags', 'origin', branch]);
  parent = git(['rev-parse', 'FETCH_HEAD']);
}
if (mode === 'restore') {
  if (parent) { const data = git(['show', `${parent}:activity.json`]); JSON.parse(data); await mkdir('data', { recursive: true }); await writeFile('data/activity.json', data + '\n'); }
  else console.log('First run: no previous feed snapshot.');
} else {
  const data = await readFile('data/activity.json', 'utf8');
  JSON.parse(data);
  const blob = git(['hash-object', '-w', '--stdin'], { input: data });
  const tree = git(['mktree'], { input: `100644 blob ${blob}\tactivity.json\n` });
  if (parent && git(['rev-parse', `${parent}^{tree}`]) === tree) { console.log('Feed snapshot unchanged.'); process.exit(0); }
  const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', 'Update public activity snapshot'], { env: { ...process.env, GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com', GIT_COMMITTER_NAME: 'github-actions[bot]', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' } });
  git(['push', 'origin', `${commit}:${branch}`]);
  console.log('Saved last-good feed data to site-data.');
}

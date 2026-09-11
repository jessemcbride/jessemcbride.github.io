import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const paths = ['content', 'public', 'src', 'scripts', 'tests', '.github', 'docs', 'README.md', 'Makefile', 'package.json', 'package-lock.json', '.gitignore', '.env.example', '.nvmrc'];
try {
  const branch = git(['branch', '--show-current']);
  if (!branch) throw new Error('Check out a branch before deploying.');
  const remote = git(['remote', 'get-url', 'origin']);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (staged.some(file => !paths.some(path => file === path || file.startsWith(path + '/')))) throw new Error('Unrelated files are already staged. Commit or unstage them before using this site-only deployment helper.');
  console.log(`Destination: ${remote}\nBranch: ${branch}`);
  execFileSync('npm', ['run', 'check'], { stdio: 'inherit' });
  console.log(git(['status', '--short']) || 'No local changes.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Commit site files and push this branch? [y/N] '); rl.close();
  if (answer.toLowerCase() !== 'y') process.exit(0);
  // Explicit list excludes the original archives and local credentials.
  git(['add', '--', ...paths]);
  if (git(['diff', '--cached', '--name-only'])) git(['commit', '-m', 'Update Jesse’s space']);
  execFileSync('git', ['push', '-u', 'origin', branch], { stdio: 'inherit' });
  console.log('Pushed. GitHub Pages deploys pushes to the repository’s default branch.');
} catch (error) {
  console.error(error.message);
  console.error('For first-time setup, follow README.md: initialize Git, add your GitHub remote, and enable Pages → GitHub Actions.');
  process.exitCode = 1;
}

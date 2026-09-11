import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { summarizeHistory } from './lib/listening-history.mjs';
import { writeJSON } from './lib/content.mjs';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: npm run music:import -- /path/to/unzipped/Spotify-history');
const files = (await readdir(directory)).filter(name => /^(Streaming_History_Audio|endsong).*\.json$/i.test(name)).sort();
if (!files.length) throw new Error('No Extended Streaming History audio JSON files found in that folder.');
const rows = [];
for (const file of files) {
  const data = JSON.parse(await readFile(join(directory, file), 'utf8'));
  if (!Array.isArray(data)) throw new Error(`Expected an array in ${file}`);
  for (const row of data) if (row && typeof row === 'object') rows.push(row);
}
const summary = summarizeHistory(rows);
await writeJSON('content/listening-history.json', summary);
console.log(`Imported ${summary.from} through ${summary.through}: ${summary.years.length} years. Only aggregate statistics saved to content/listening-history.json. Run npm run build to preview.`);

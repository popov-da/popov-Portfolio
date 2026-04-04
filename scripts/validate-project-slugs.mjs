// Ensure assets/i18n/projects.json keys match projects/* folders (each has index + art).
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectsJson = JSON.parse(
  readFileSync(join(root, 'assets/i18n/projects.json'), 'utf8')
);
const dirs = readdirSync(join(root, 'projects'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const jsonSlugs = Object.keys(projectsJson);
const missingDirs = jsonSlugs.filter((s) => !dirs.includes(s));
const extraDirs = dirs.filter((d) => !jsonSlugs.includes(d));
const missingFiles = [];
const missingDesc = [];

for (const slug of jsonSlugs) {
  if (!dirs.includes(slug)) continue;
  const base = join(root, 'projects', slug);
  if (!existsSync(join(base, 'index.html'))) missingFiles.push(`${slug}/index.html`);
  if (!existsSync(join(base, 'art.html'))) missingFiles.push(`${slug}/art.html`);
  const row = projectsJson[slug];
  const d = row && row.description;
  if (!d || !String(d.ru || '').trim() || !String(d.en || '').trim()) {
    missingDesc.push(slug);
  }
}

let failed = false;
if (missingDirs.length) {
  console.error('projects.json slugs without folder:', missingDirs.join(', '));
  failed = true;
}
if (extraDirs.length) {
  console.error('projects/* folders not in projects.json:', extraDirs.join(', '));
  failed = true;
}
if (missingFiles.length) {
  console.error('Missing files:', missingFiles.join(', '));
  failed = true;
}
if (missingDesc.length) {
  console.error('projects.json missing description.ru/en:', missingDesc.join(', '));
  failed = true;
}

if (failed) process.exit(1);
console.log('Project slugs OK:', jsonSlugs.length);

// Fill projects/*/index.html meta description + Open Graph from assets/i18n/projects.json (RU defaults).
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://popov-da.ru';

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

const projects = JSON.parse(
  readFileSync(join(root, 'assets/i18n/projects.json'), 'utf8')
);

for (const slug of Object.keys(projects)) {
  const p = projects[slug];
  const pathIdx = join(root, 'projects', slug, 'index.html');
  let html = readFileSync(pathIdx, 'utf8');

  const descRu = escAttr(p.description?.ru || '');
  const titleRu = escAttr(`${p.title?.ru || slug} — Дмитрий Попов`);
  const titlePlain = `${p.title?.ru || slug} — Дмитрий Попов`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
  const img = escAttr(p.cdn || `${SITE}/preview.jpg`);
  const url = `${SITE}/projects/${slug}/`;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${titlePlain}</title>`);

  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${descRu}">`
  );

  const ogBlock = `    <meta property="og:type" content="article">
    <meta property="og:url" content="${escAttr(url)}">
    <meta property="og:title" content="${titleRu}">
    <meta property="og:description" content="${descRu}">
    <meta property="og:image" content="${img}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${titleRu}">
    <meta name="twitter:description" content="${descRu}">
    <meta name="twitter:image" content="${img}">
`;

  if (!html.includes('property="og:title"')) {
    html = html.replace(
      /(<meta name="description" content="[^"]*"\s*>)/,
      `$1\n${ogBlock}`
    );
  }

  writeFileSync(pathIdx, html, 'utf8');
  console.log('META', slug);
}

console.log('Done.');

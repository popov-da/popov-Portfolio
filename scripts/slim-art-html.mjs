// Rebuild each projects/<slug>/art.html with shared head + assets/art-embed-shell.js
// Run from repo root: node scripts/slim-art-html.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function escapeHtmlText(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const projectDirs = readdirSync(join(root, 'projects'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(root, 'projects', d.name, 'art.html'))
  .filter((p) => existsSync(p));

for (const artPath of projectDirs) {
  const html = readFileSync(artPath, 'utf8');

  const titleM = html.match(/<title>([^<]*)<\/title>/);
  const title = titleM ? titleM[1].trim() : 'Project - Dmitrii Popov';

  const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  let desc = '';
  if (descM) {
    desc = descM[1]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  const bodyM = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyM) {
    console.warn('Skip (no body):', artPath);
    continue;
  }
  const bodyInner = bodyM[1].trim();

  const titleText = escapeHtmlText(title);
  const descAttr = escapeHtmlAttr(desc);

  const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleText}</title>
<meta name="description" content="${descAttr}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css?family=Inter:400,400i,700,900|Inter:400,700,900|PT+Mono" rel="stylesheet">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/assets/website-26325af48fcf4085dc968ace4e7c8c3ac5dfac87066c2008a18f3777550573ed.css">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/assets/website/basic-90847845f7b4faaa9614c1d3f04d276f086c656cf87697a89f5d52cda153645c.css">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/asset/css/custom-user-1285983-1744121240-theme-basic-0feb40d314fc3d0cfb312a8e399f3c9c.css">
<link rel="icon" href="../../assets/artstation-static/favicon-artstation.png" type="image/x-icon">
<script src="../../assets/artstation-static/assets/layout/common_head_js.bundle.09b80bee0637a01bcfe6.js"></script>
<script src="../../assets/art-embed-shell.js"></script>
</head>
<body class="theme-basic project">
${bodyInner}
</body>
</html>
`;

  writeFileSync(artPath, out, 'utf8');
  console.log('SLIM', artPath.replace(/\\/g, '/').split('/projects/').pop());
}

console.log('Done.');

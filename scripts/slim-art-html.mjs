// Rebuild each projects/<slug>/art.html with shared head + assets/art-embed-shell.js
// Run from repo root: node scripts/slim-art-html.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SITE_ORIGIN = 'https://popov-da.ru';

function escapeHtmlText(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function decodeBasicEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function shortTitleFromPageTitle(t) {
  const x = t.replace(/^Dmitriy Popov\s*-\s*/i, '').trim();
  return x || t;
}

/** Remove duplicate h1 (parent project page already has the heading). */
function stripEmbedDuplicateH1(body) {
  return body.replace(
    /^<div class="project-page"><div class="project-section"><div class="container-sm"><h1 class="text-center">[^<]*<\/h1>/,
    '<div class="project-page"><div class="project-section"><div class="container-sm">'
  );
}

/** Use caption text for images that still have alt="". */
function fillAltsFromCaptions(body) {
  return body.replace(
    /<div class="block-image text-center">(<a[\s\S]*?<\/a>)<div class="container-sm project-asset-caption"><div class="asset-caption"><p>([\s\S]*?)<\/p><\/div><\/div><\/div><\/div>/g,
    (full, linkPart, captionText) => {
      const plain = decodeBasicEntities(String(captionText).replace(/<[^>]+>/g, '')).trim();
      if (!plain || !linkPart.includes('alt=""')) return full;
      const esc = escapeHtmlAttr(plain);
      const newLink = linkPart.replace(/\balt=""/, `alt="${esc}"`);
      return full.replace(linkPart, newLink);
    }
  );
}

function fillRemainingEmptyAlts(body, fallbackAlt) {
  const esc = escapeHtmlAttr(fallbackAlt);
  return body.replace(/\balt=""/g, `alt="${esc}"`);
}

function addLazyLoadingToImages(body) {
  return body.replace(/<img\b((?![^>]*\bloading=)[^>]*)>/gi, '<img loading="lazy" decoding="async"$1>');
}

function addLazyLoadingToVideoIframes(body) {
  return body.replace(
    /<iframe\b((?![^>]*\bloading=)[^>]*src="https:\/\/(?:www\.youtube-nocookie\.com|player\.vimeo\.com)[^>]*)>/gi,
    '<iframe loading="lazy"$1>'
  );
}

function firstArtCdnPath(body) {
  const m = body.match(
    /(?:href|src)="(art-cdn\/[^"]+\.(?:jpg|jpeg|png|gif|webp))"/i
  );
  return m ? m[1] : null;
}

function formatProjectPageBody(body) {
  let s = body;
  s = s.replace(
    /<\/div><div class="project-section">/g,
    '</div>\n<div class="project-section">'
  );
  s = s.replace(
    /<div class="project-page">/,
    '<div class="project-page">\n'
  );
  s = s.replace(/<\/div><\/div><script/g, '</div></div>\n<script');
  return s;
}

const projectsData = JSON.parse(
  readFileSync(join(root, 'assets/i18n/projects.json'), 'utf8')
);

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

  const slugMatch = artPath.replace(/\\/g, '/').match(/projects\/([^/]+)\/art\.html$/);
  const slug = slugMatch ? slugMatch[1] : '';
  const projectCanonical = `${SITE_ORIGIN}/projects/${slug}/`;

  let bodyInner = bodyM[1].trim();
  bodyInner = stripEmbedDuplicateH1(bodyInner);
  bodyInner = fillAltsFromCaptions(bodyInner);
  bodyInner = fillRemainingEmptyAlts(bodyInner, shortTitleFromPageTitle(title));
  bodyInner = addLazyLoadingToImages(bodyInner);
  bodyInner = addLazyLoadingToVideoIframes(bodyInner);
  bodyInner = formatProjectPageBody(bodyInner);

  const artCdn = firstArtCdnPath(bodyInner);
  const projectRow = projectsData[slug];
  const cdnFallback = projectRow && projectRow.cdn ? projectRow.cdn : '';
  const ogImage = artCdn
    ? `${SITE_ORIGIN}/projects/${slug}/${artCdn}`
    : cdnFallback || `${SITE_ORIGIN}/preview.jpg`;
  const ogImageEsc = escapeHtmlAttr(ogImage);
  const projectCanonicalEsc = escapeHtmlAttr(projectCanonical);
  const titleText = escapeHtmlText(title);
  const titleAttr = escapeHtmlAttr(title);
  const descAttr = escapeHtmlAttr(desc);

  const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleText}</title>
<meta name="description" content="${descAttr}">
<link rel="canonical" href="${projectCanonicalEsc}">
<meta property="og:url" content="${projectCanonicalEsc}">
<meta property="og:title" content="${titleAttr}">
<meta property="og:description" content="${descAttr}">
<meta property="og:image" content="${ogImageEsc}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titleAttr}">
<meta name="twitter:description" content="${descAttr}">
<meta name="twitter:image" content="${ogImageEsc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css?family=Inter:400,400i,700,900|Inter:400,700,900|PT+Mono" rel="stylesheet">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/assets/website-26325af48fcf4085dc968ace4e7c8c3ac5dfac87066c2008a18f3777550573ed.css">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/assets/website/basic-90847845f7b4faaa9614c1d3f04d276f086c656cf87697a89f5d52cda153645c.css">
<link rel="stylesheet" media="screen" href="../../assets/artstation-static/asset/css/custom-user-1285983-1744121240-theme-basic-0feb40d314fc3d0cfb312a8e399f3c9c.css">
<link rel="stylesheet" media="screen" href="../../assets/art-embed-overrides.css">
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

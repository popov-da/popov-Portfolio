# Downloads ArtStation static bundles + per-project CDN images, rewrites art.html for local paths.
# Run from repo root with VPN if needed:  pwsh -File scripts/download-artstation-assets.ps1

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $PSScriptRoot

function Download-Url {
    param([string]$Url, [string]$Path, [int]$Retries = 4)
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $attempt = 0
    while ($true) {
        $attempt++
        try {
            Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing -TimeoutSec 120
            return
        }
        catch {
            if ($attempt -ge $Retries) { throw }
            Start-Sleep -Seconds (2 * $attempt)
        }
    }
}

# Removes ArtStation site chrome from exported project body (safe: only after </head>).
function Strip-ArtStationEmbedChrome([string]$Html) {
    $headEnd = $Html.ToLowerInvariant().IndexOf('</head>')
    if ($headEnd -lt 0) { return $Html }
    $cut = $headEnd + 7
    $head = $Html.Substring(0, $cut)
    $tail = $Html.Substring($cut)

    $t = $tail
    $t = [regex]::Replace($t, '(?s)<div class="report-section">\s*<div class="dropdown">.*?</div>\s*</div>', '')
    $t = [regex]::Replace($t, '(?s)(<body[^>]*>)\s*<div id="top"></div>\s*<div class="site-wrapper">.*?<div class="project-page">', '$1<div class="project-page">', 1)
    $t = [regex]::Replace($t, '(?s)<div class="s-icons">\s*<div class="s-icons-inner">.*?</div>\s*</div>', '')

    $beforeFooter = $t
    $t = [regex]::Replace($t, '(?s)<footer class="site-footer">.*?</footer>\s*', '', 1)
    $removedFooter = $beforeFooter -ne $t

    if ($removedFooter) {
        $needle = 'website-125cef6ca1a904170895d570b23035af2704e1cc2e504707bb64d449aaf16804.js'
        $pos = $t.IndexOf($needle, [System.StringComparison]::Ordinal)
        if ($pos -ge 0) {
            $scriptStart = $t.LastIndexOf('<script', $pos)
            if ($scriptStart -ge 0) {
                $before = $t.Substring(0, $scriptStart).TrimEnd()
                if ($before.EndsWith('</div>')) {
                    $before = $before.Substring(0, $before.Length - 6).TrimEnd()
                }
                $t = $before + $t.Substring($scriptStart)
            }
        }
    }

    return $head + $t
}

# --- Shared static files (same across your art.html exports) ---
$staticBase = 'https://www.artstation.com'
$staticRoot = Join-Path $root 'assets\artstation-static'
$staticFiles = @(
    '/assets/website-26325af48fcf4085dc968ace4e7c8c3ac5dfac87066c2008a18f3777550573ed.css',
    '/assets/website/basic-90847845f7b4faaa9614c1d3f04d276f086c656cf87697a89f5d52cda153645c.css',
    '/asset/css/custom-user-1285983-1744121240-theme-basic-0feb40d314fc3d0cfb312a8e399f3c9c.css',
    '/assets/layout/common_head_js.bundle.09b80bee0637a01bcfe6.js',
    '/assets/website-125cef6ca1a904170895d570b23035af2704e1cc2e504707bb64d449aaf16804.js',
    '/asset/js/slides.js',
    '/asset/js/fldGrd.min.js',
    '/asset/js/app.js?v=user-1285983-1744121240-theme-basic-0feb40d314fc3d0cfb312a8e399f3c9c'
)

Write-Host '=== Static bundles from www.artstation.com ===' -ForegroundColor Cyan
foreach ($rel in $staticFiles) {
    $url = $staticBase + $rel
    $pathPart = $rel -replace '\?.*$', ''
    $dest = Join-Path $staticRoot ($pathPart.TrimStart('/').Replace('/', '\'))
    try {
        Download-Url -Url $url -Path $dest
        Write-Host "OK $pathPart"
    }
    catch {
        Write-Warning "FAIL $rel : $_"
    }
}

# Ponyfill (protocol-relative in HTML)
$ponyUrl = 'https://unpkg.com/css-vars-ponyfill@1/dist/css-vars-ponyfill.min.js'
$ponyDest = Join-Path $staticRoot 'vendor\css-vars-ponyfill.min.js'
try {
    Download-Url -Url $ponyUrl -Path $ponyDest
    Write-Host 'OK unpkg css-vars-ponyfill'
}
catch {
    Write-Warning "FAIL ponyfill: $_"
}

$favUrl = 'https://cdn.artstation.com/static_media/placeholders/user/portfolio_favicon/default.png'
$favDest = Join-Path $staticRoot 'favicon-artstation.png'
try {
    Download-Url -Url $favUrl -Path $favDest
    Write-Host 'OK favicon'
}
catch { Write-Warning "FAIL favicon: $_" }

# --- Per-project CDN images + rewrite art.html ---
Write-Host "`n=== Per-project art.html CDN images ===" -ForegroundColor Cyan
$artFiles = Get-ChildItem -Path (Join-Path $root 'projects') -Filter 'art.html' -Recurse -File
$sha = [System.Security.Cryptography.SHA256]::Create()

foreach ($artFile in $artFiles) {
    $projDir = $artFile.DirectoryName
    $cdnDir = Join-Path $projDir 'art-cdn'
    $html = [System.IO.File]::ReadAllText($artFile.FullName)
    $matches = [regex]::Matches($html, 'https://cdn[ab]\.artstation\.com[^"''\s<>]+')
    $urls = $matches | ForEach-Object { $_.Value } | Select-Object -Unique
    if ($urls.Count -eq 0) {
        Write-Host "SKIP $($artFile.Directory.Name) (no cdn urls)"
        continue
    }
    New-Item -ItemType Directory -Path $cdnDir -Force | Out-Null
    $map = @{}
    foreach ($u in $urls) {
        $norm = $u -replace '&amp;', '&'
        $ext = 'jpg'
        if ($norm -match '\.(jpg|jpeg|png|gif|webp)(\?|$)') { $ext = $matches[1] }
        $hash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($norm))).Replace('-', '').Substring(0, 20).ToLowerInvariant()
        $fn = "$hash.$ext"
        $dest = Join-Path $cdnDir $fn
        if (-not (Test-Path $dest)) {
            try {
                Download-Url -Url $norm -Path $dest
                Write-Host "  OK $fn"
            }
            catch {
                Write-Warning "  FAIL $norm : $_"
                continue
            }
        }
        $map[$u] = 'art-cdn/' + $fn
        $amp = $u -replace '&', '&amp;'
        if ($amp -ne $u) { $map[$amp] = 'art-cdn/' + $fn }
    }

    $newHtml = $html
    foreach ($kv in $map.GetEnumerator()) {
        $newHtml = $newHtml.Replace($kv.Key, $kv.Value)
    }

    # Root-relative ArtStation assets -> repo mirror
    $newHtml = $newHtml.Replace('href="/assets/', 'href="../../assets/artstation-static/assets/')
    $newHtml = $newHtml.Replace('src="/assets/', 'src="../../assets/artstation-static/assets/')
    $newHtml = $newHtml.Replace('href="/asset/', 'href="../../assets/artstation-static/asset/')
    $newHtml = $newHtml.Replace('src="/asset/', 'src="../../assets/artstation-static/asset/')

    # unpkg script
    $newHtml = $newHtml.Replace('src="//unpkg.com/css-vars-ponyfill@1"', 'src="../../assets/artstation-static/vendor/css-vars-ponyfill.min.js"')

    # Favicon
    $newHtml = $newHtml.Replace('href="https://cdn.artstation.com/static_media/placeholders/user/portfolio_favicon/default.png"', 'href="../../assets/artstation-static/favicon-artstation.png"')

    # Drop trackers / captcha / talon (offline)
    $newHtml = $newHtml -replace '<script src="https://tracking\.epicgames\.com/tracking\.js"[^>]*></script>', ''
    $newHtml = $newHtml -replace '<script src="https://js\.hcaptcha\.com[^"]*"[^>]*></script>', ''
    $newHtml = $newHtml -replace '<script src="https://talon-website-prod\.ecosec\.on\.epicgames\.com/talon_sdk\.js"></script>', ''

    # Local static server: no ?query on app.js filename
    $newHtml = $newHtml.Replace('src="../../assets/artstation-static/asset/js/app.js?v=user-1285983-1744121240-theme-basic-0feb40d314fc3d0cfb312a8e399f3c9c"', 'src="../../assets/artstation-static/asset/js/app.js"')

    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($artFile.FullName, $newHtml, $utf8)
    Write-Host "REWRITE $($artFile.Directory.Name)\art.html"
}

# Hygiene on every art.html (also files that had no CDN URLs to mirror)
foreach ($artFile in $artFiles) {
    $html = [System.IO.File]::ReadAllText($artFile.FullName)
    $san = Strip-ArtStationEmbedChrome $html
    $san = $san.Replace('<source media="(min-width: 0)" srcset="">', '')
    $san = $san -replace 'window\.user_email\s*=\s*"[^"]*";', 'window.user_email = "";'
    $san = $san.Replace('<!-- tracking removed -->', '').Replace('<!-- hcaptcha removed -->', '').Replace('<!-- talon removed -->', '')
    if ($san -ne $html) {
        $utf8 = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($artFile.FullName, $san, $utf8)
        Write-Host "SANITIZE $($artFile.Directory.Name)\art.html"
    }
}

$slimMjs = Join-Path $PSScriptRoot 'slim-art-html.mjs'
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "`n=== Slim art.html (shared head + art-embed-shell.js) ===" -ForegroundColor Cyan
    Push-Location $root
    try {
        & node $slimMjs
        if ($LASTEXITCODE -ne 0) { Write-Warning "slim-art-html.mjs exited $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Warning 'Node.js not found; run later: node scripts/slim-art-html.mjs'
}

Write-Host "`nDone." -ForegroundColor Green

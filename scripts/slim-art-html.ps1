# Wrapper: slim ArtStation exports (requires Node.js). Run from repo root.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path -Parent $here
Push-Location $root
try {
    node (Join-Path $here 'slim-art-html.mjs')
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}

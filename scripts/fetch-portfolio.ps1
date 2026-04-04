# Downloads ArtStation thumbnail URLs into assets/portfolio/ (for card images on the home page).
# Run from repo root: pwsh -File scripts/fetch-portfolio.ps1

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'assets\portfolio'
New-Item -ItemType Directory -Path $dir -Force | Out-Null

$pairs = @(
    @{ id = 'ygqyow'; url = 'https://cdnb.artstation.com/p/assets/images/images/085/681/895/smaller_square/dmitriy-popov-1.jpg?1741367143' },
    @{ id = 'qkgrj4'; url = 'https://cdnb.artstation.com/p/assets/images/images/084/430/901/20250131093547/smaller_square/dmitriy-popov-2025-01-31-183000.jpg?1738337747' },
    @{ id = 'l4g3gk'; url = 'https://cdna.artstation.com/p/assets/images/images/084/429/712/20250131090832/smaller_square/dmitriy-popov-01.jpg?1738336112' },
    @{ id = '4np8l1'; url = 'https://cdna.artstation.com/p/assets/covers/images/084/429/134/smaller_square/dmitriy-popov-dmitriy-popov-logo.jpg?1738334728' },
    @{ id = '3eexjg'; url = 'https://cdnb.artstation.com/p/assets/videos/images/091/742/737/smaller_square/dmitriy-popov-2058088340-37801a68bd661cae874070a600f10f9089a7e11c546334c5301c0e3654d1396e-d-295x166.jpg?1757655821' },
    @{ id = 'zedrqw'; url = 'https://cdna.artstation.com/p/assets/videos/images/045/758/322/smaller_square/dmitriy-popov-maxresdefault.jpg?1643464166' },
    @{ id = 'rnql3r'; url = 'https://cdna.artstation.com/p/assets/videos/images/045/007/020/smaller_square/dmitriy-popov-maxresdefault.jpg?1641705249' },
    @{ id = 'raebee'; url = 'https://cdna.artstation.com/p/assets/videos/images/033/249/098/smaller_square/dmitriy-popov-hqdefault.jpg?1608913403' },
    @{ id = 'rajpml'; url = 'https://cdnb.artstation.com/p/assets/images/images/028/905/405/smaller_square/dmitriy-popov-1001-000-000-12321.jpg?1595875910' },
    @{ id = 'lvpzqv'; url = 'https://cdna.artstation.com/p/assets/videos/images/023/488/970/smaller_square/dmitriy-popov-maxresdefault.jpg?1579369481' },
    @{ id = 'xz22lr'; url = 'https://cdnb.artstation.com/p/assets/images/images/018/063/201/smaller_square/dmitriy-popov-3.jpg?1558292766' },
    @{ id = '4bdlzy'; url = 'https://cdna.artstation.com/p/assets/images/images/018/004/334/20190517160342/smaller_square/dmitriy-popov-o9ymki9ijhm.jpg?1558127022' },
    @{ id = 'ryn5na'; url = 'https://cdna.artstation.com/p/assets/videos/images/018/625/972/smaller_square/dmitriy-popov-hqdefault.jpg?1560104678' },
    @{ id = 'kavy4g'; url = 'https://cdna.artstation.com/p/assets/images/images/018/003/566/20190517153130/smaller_square/dmitriy-popov-fusion-360.jpg?1558125090' },
    @{ id = 'babjmv'; url = 'https://cdnb.artstation.com/p/assets/images/images/018/003/407/smaller_square/dmitriy-popov-.jpg?1558124472' }
)

foreach ($p in $pairs) {
    $out = Join-Path $dir ($p.id + '.jpg')
    $attempt = 0
    while ($attempt -lt 3) {
        $attempt++
        try {
            Invoke-WebRequest -Uri $p.url -OutFile $out -UseBasicParsing -TimeoutSec 90
            Write-Host "OK $($p.id)"
            break
        }
        catch {
            Write-Warning "$($p.id) attempt $attempt : $_"
            Start-Sleep -Seconds 3
        }
    }
}

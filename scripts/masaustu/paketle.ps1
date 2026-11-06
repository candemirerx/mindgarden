# Not Bahcesi - tasinabilir Windows paketi
#
#   powershell -ExecutionPolicy Bypass -File scripts\masaustu\paketle.ps1          # paketi hazirla
#   powershell -ExecutionPolicy Bypass -File scripts\masaustu\paketle.ps1 -Kur     # + bu bilgisayara kur
#   powershell -ExecutionPolicy Bypass -File scripts\masaustu\paketle.ps1 -Derle   # once statik derleme (out/) al
#
# Yonetici izni gerekmez. Kurulum %LOCALAPPDATA%\Programs\Not Bahcesi klasorune
# kopyalar ve masaustune kisayol koyar. "veri" klasorune (notlar) dokunulmaz.

param([switch]$Kur, [switch]$Derle)
$ErrorActionPreference = 'Stop'

$projeKok = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$paketKok = Join-Path $projeKok 'masaustu-paketi'
$paketDizin = Join-Path $paketKok 'Not Bahcesi'
$geciciDizin = Join-Path $paketKok 'gecici'
$exeAdi = 'Not Bahcesi.exe'

if ($Derle) {
    Push-Location $projeKok
    try {
        $env:CAPACITOR_BUILD = '1'
        & npx next build
        if ($LASTEXITCODE -ne 0) { throw 'next build basarisiz' }
    } finally {
        Remove-Item Env:CAPACITOR_BUILD -ErrorAction SilentlyContinue
        Pop-Location
    }
}

$outDizin = Join-Path $projeKok 'out'
if (-not (Test-Path (Join-Path $outDizin 'index.html'))) {
    throw "Statik derleme yok: $outDizin. -Derle ile calistirin."
}

New-Item -ItemType Directory -Force -Path $paketDizin, $geciciDizin | Out-Null

# --- Simge: assets\icon.png -> PNG gomulu cok boyutlu .ico ----------------
Add-Type -AssemblyName System.Drawing
$simge = Join-Path $geciciDizin 'not-bahcesi.ico'
$kaynak = [System.Drawing.Image]::FromFile((Join-Path $projeKok 'assets\icon.png'))
try {
    $boyutlar = 256, 64, 48, 32, 24, 16
    $resimler = @()
    foreach ($b in $boyutlar) {
        $bmp = New-Object System.Drawing.Bitmap $b, $b
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($kaynak, 0, 0, $b, $b)
        $g.Dispose()
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $resimler += , $ms.ToArray()
    }
} finally { $kaynak.Dispose() }

$fs = [System.IO.File]::Create($simge)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$boyutlar.Count)
$konum = 6 + 16 * $boyutlar.Count
for ($i = 0; $i -lt $boyutlar.Count; $i++) {
    $b = $boyutlar[$i]
    $kenar = if ($b -ge 256) { 0 } else { $b }
    $bw.Write([byte]$kenar); $bw.Write([byte]$kenar); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([UInt16]1); $bw.Write([UInt16]32)
    $bw.Write([UInt32]$resimler[$i].Length); $bw.Write([UInt32]$konum)
    $konum += $resimler[$i].Length
}
foreach ($r in $resimler) { $bw.Write($r) }
$bw.Close()

# --- Baslaticiyi derle (.NET Framework 4 csc, Windows ile gelir) ----------
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
$exeYolu = Join-Path $paketDizin $exeAdi
$cscArg = @('/nologo', '/target:winexe', '/optimize+', '/codepage:65001', "/win32icon:$simge", "/out:$exeYolu",
    '/r:System.Windows.Forms.dll', (Join-Path $PSScriptRoot 'NotBahcesiMasaustu.cs'))
& $csc @cscArg
if ($LASTEXITCODE -ne 0) { throw 'Baslatici derlenemedi' }
Copy-Item $simge (Join-Path $paketDizin 'not-bahcesi.ico') -Force

# --- Uygulama dosyalari -----------------------------------------------------
$uygulamaDizin = Join-Path $paketDizin 'uygulama'
& robocopy $outDizin $uygulamaDizin /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'Uygulama dosyalari kopyalanamadi' }

$okubeni = @"
Not Bahcesi - Windows (tasinabilir)

Calistirmak icin "Not Bahcesi.exe" dosyasini acin. Kurulum ve yonetici izni gerekmez.

- Notlar ve ayarlar bu klasordeki "veri" klasorunde saklanir. Klasoru USB bellege
  ya da baska bir bilgisayara tasidiginizda notlariniz da gelir.
- Uygulama Microsoft Edge (yoksa Google Chrome) uygulama penceresinde, yalnizca bu
  bilgisayardan erisilebilen yerel bir adreste (http://localhost:47321) calisir.
- Pencereyi kapatinca arka plandaki yerel sunucu da birkac saniye icinde kapanir.
- Yedek almak icin uygulama icinde Ayarlar > Veri yonetimi > Disa aktar kullanin.
"@
Set-Content -Path (Join-Path $paketDizin 'OKUBENI.txt') -Value $okubeni -Encoding UTF8

# --- Zip ----------------------------------------------------------------------
$zip = Join-Path $paketKok 'not-bahcesi-windows-tasinabilir.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
$zipKaynak = Join-Path $geciciDizin 'zip'
if (Test-Path $zipKaynak) { Remove-Item -LiteralPath $zipKaynak -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $zipKaynak 'Not Bahcesi') | Out-Null
Copy-Item (Join-Path $paketDizin $exeAdi), (Join-Path $paketDizin 'not-bahcesi.ico'), (Join-Path $paketDizin 'OKUBENI.txt') (Join-Path $zipKaynak 'Not Bahcesi')
Copy-Item $uygulamaDizin (Join-Path $zipKaynak 'Not Bahcesi\uygulama') -Recurse
Compress-Archive -Path (Join-Path $zipKaynak 'Not Bahcesi') -DestinationPath $zip
Remove-Item -LiteralPath $zipKaynak -Recurse -Force

Write-Host "Paket hazir: $paketDizin"
Write-Host "Zip: $zip"

# --- Bu bilgisayara kur -------------------------------------------------------
if ($Kur) {
    $kurulumDizin = Join-Path $env:LOCALAPPDATA 'Programs\Not Bahcesi'
    New-Item -ItemType Directory -Force -Path $kurulumDizin | Out-Null
    $acik = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $kurulumDizin $exeAdi) }
    if ($acik) { throw 'Not Bahcesi su an acik. Pencereyi kapatip tekrar deneyin.' }

    Copy-Item (Join-Path $paketDizin $exeAdi), (Join-Path $paketDizin 'not-bahcesi.ico'), (Join-Path $paketDizin 'OKUBENI.txt') $kurulumDizin -Force
    & robocopy $uygulamaDizin (Join-Path $kurulumDizin 'uygulama') /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw 'Kurulum kopyalamasi basarisiz' }

    $kabuk = New-Object -ComObject WScript.Shell
    $kisayollar = @(
        (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Not Bahcesi.lnk'),
        (Join-Path ([Environment]::GetFolderPath('Programs')) 'Not Bahcesi.lnk')
    )
    foreach ($k in $kisayollar) {
        $lnk = $kabuk.CreateShortcut($k)
        $lnk.TargetPath = Join-Path $kurulumDizin $exeAdi
        $lnk.WorkingDirectory = $kurulumDizin
        $lnk.IconLocation = (Join-Path $kurulumDizin 'not-bahcesi.ico') + ',0'
        $lnk.Description = 'Not Bahcesi - zihin haritasi notlari'
        $lnk.Save()
    }
    Write-Host "Kuruldu: $kurulumDizin"
    Write-Host 'Masaustu ve Baslat menusu kisayollari olusturuldu.'
}


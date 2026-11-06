param([string]$ZipPath = (Join-Path $PSScriptRoot '..\public\indir\not-bahcesi-pc-yardimcisi.zip'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($ZipPath))
try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($required in @('BASLAT.cmd', 'WIFI.cmd', 'OKUBENI.txt', 'TELEFON-USB-OTOMATIK-KUR.cmd',
        'scripts/pc_clipboard_helper.ps1', 'Ortak-USB/usb_baglanti.ps1',
        'Ortak-USB/usb_baglanti_otomatik.ps1', 'Ortak-USB/pc_clipboard_helper.ps1',
        'Ortak-USB/PairApproval.cs', 'Ortak-USB/RemoteInput.cs',
        'Ortak-USB/vendor/gnirehtet/adb.exe', 'Ortak-USB/vendor/gnirehtet/AdbWinApi.dll',
        'Ortak-USB/vendor/gnirehtet/AdbWinUsbApi.dll')) {
        if ($names -notcontains $required) { throw "Paket dosyasi eksik: $required" }
    }
    if ($names | Where-Object { $_ -match '(^|/)(\.[^/]+|logs|tip-onbellek)(/|$)|\.(keystore|jks|pem|bak)$' }) {
        throw 'Paket kisisel anahtar, gunluk veya yerel dosya iceriyor.'
    }
    # Indirilen paket hem uygulama kaynaklarini hem ortak USB surumunu aynen tasimali.
    $sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $sharedRoot = Join-Path $sourceRoot '..\kablosuzbellek\tools\cep-kopru-paket-2.7.0\CepKopru-Yardimcisi\Ortak'
    $verified = 0
    foreach ($entry in $archive.Entries | Where-Object { $_.Length -gt 0 }) {
        $name = $entry.FullName.Replace('\', '/')
        $original = if ($name.StartsWith('Ortak-USB/')) { Join-Path $sharedRoot $name.Substring(10) }
            elseif ($name.StartsWith('scripts/')) { Join-Path $sourceRoot $name }
            else { $null }
        if ($original) {
            if (-not (Test-Path -LiteralPath $original)) { throw "Paket kaynagi eksik: $name" }
            $sha = [Security.Cryptography.SHA256]::Create()
            $stream = $entry.Open()
            try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
            finally { $stream.Dispose(); $sha.Dispose() }
            if ($hash -ne (Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash) { throw "Paket kaynaktan farkli: $name" }
            $verified++
        }
    }
    Write-Output "PASS: $verified paket dosyasi kaynak SHA-256 ozetleriyle ayni."
    $scriptCount = 0
    foreach ($entry in $archive.Entries | Where-Object { $_.Name.EndsWith('.ps1') }) {
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $source = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $tokens = $null; $errors = $null
        [void][Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
        if ($errors.Count) { throw "PowerShell sozdizimi hatasi: $($entry.FullName): $errors" }
        $scriptCount++
    }
    $helper = $archive.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq 'Ortak-USB/pc_clipboard_helper.ps1' }
    $reader = [IO.StreamReader]::new($helper.Open())
    try { $source = $reader.ReadToEnd() } finally { $reader.Dispose() }
    if ($source -notmatch "helperVersion = '2\.7\.0'" -or $source -notmatch '\[switch\]\$NoCard' -or $source -notmatch '\[switch\]\$NoBluetooth') {
        throw 'Ortak USB yardimcisi surumu veya baslatma parametreleri uyumsuz.'
    }
    Write-Output "PASS: USB kurulumu, ortak yardimci 2.7.0, ADB, eski baslaticilar, kisisel veri filtresi ve $scriptCount PowerShell sozdizimi kontrolu. Kurulum calistirilmadi."
} finally { $archive.Dispose() }

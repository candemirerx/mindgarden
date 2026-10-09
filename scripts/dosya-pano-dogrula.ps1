param([switch]$Canli)
$ErrorActionPreference = 'Stop'
$kaynak = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'))
$tokens = $null; $hatalar = $null
[void][Management.Automation.Language.Parser]::ParseInput($kaynak, [ref]$tokens, [ref]$hatalar)
if ($hatalar.Count) { throw ($hatalar | Out-String) }
$bas = $kaynak.IndexOf('$script:parcalar = @{}')
$son = $kaynak.IndexOf('function Same-Token', $bas)
Invoke-Expression $kaynak.Substring($bas, $son - $bas)
$klasor = Join-Path ([IO.Path]::GetTempPath()) ('nb-dosya-test-' + [guid]::NewGuid())
$adlar = @('rapor.pdf', 'arsiv.zip', 'CON.txt', '../belge.txt', 'bos.bin', 'rapor.pdf')
$ids = @(); $icerikler = @()
for ($i = 0; $i -lt $adlar.Count; $i++) {
    $id = 'test-dosya-' + $i; $ids += $id
    [byte[]]$baytlar = @()
    if ($i -ne 4) { $baytlar = [byte[]](0..255 + 0..255) }
    $icerikler += ,$baytlar
    Add-Parca $id 0 ([Convert]::ToBase64String($baytlar))
}
$yollar = Save-Gorseller $ids $adlar $klasor $true
for ($i = 0; $i -lt $yollar.Count; $i++) {
    $alinan = [IO.File]::ReadAllBytes($yollar[$i])
    if ([Convert]::ToBase64String($alinan) -ne [Convert]::ToBase64String($icerikler[$i])) { throw 'Dosya baytlari degisti.' }
    if ([IO.Path]::GetDirectoryName($yollar[$i]) -ne $klasor) { throw 'Hedef klasor disina cikildi.' }
}
if ([IO.Path]::GetFileName($yollar[0]) -ne 'rapor.pdf' -or [IO.Path]::GetFileName($yollar[1]) -ne 'arsiv.zip' -or [IO.Path]::GetFileName($yollar[2]) -ne '_CON.txt' -or [IO.Path]::GetFileName($yollar[5]) -ne 'rapor (2).pdf') { throw 'Dosya adi veya cakisma hatasi.' }
if ($script:parcaToplam -ne 0 -or $script:parcalar.Count -ne 0) { throw 'Aktarim bellegi birakilmadi.' }
Add-Type -AssemblyName System.Windows.Forms
$onceki = [Windows.Forms.Clipboard]::GetDataObject()
try {
    Set-ClipboardDosyalar $yollar
    $pano = [Windows.Forms.Clipboard]::GetFileDropList()
    if ($pano.Count -ne $yollar.Count) { throw ('Pano dosya listesi eksik: {0}/{1}; formats: {2}' -f $pano.Count, $yollar.Count, ([Windows.Forms.Clipboard]::GetDataObject().GetFormats() -join ',')) }
    $yapistirma = Join-Path $klasor 'yapistirma'
    [void][IO.Directory]::CreateDirectory($yapistirma)
    foreach ($yol in $pano) { [IO.File]::Copy($yol, (Join-Path $yapistirma ([IO.Path]::GetFileName($yol)))) }
    if (@(Get-ChildItem -LiteralPath $yapistirma -File).Count -ne $yollar.Count) { throw 'Panodan dosya kopyalanamadi.' }
    if ($Canli) {
        $tokenPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Not Bahcesi PC Yardimcisi/scripts/.pc_clipboard_token'
        $headers = @{ Authorization = 'Bearer ' + [IO.File]::ReadAllText($tokenPath).Trim() }
        $canliIds = @(('live-pdf-' + [guid]::NewGuid()), ('live-zip-' + [guid]::NewGuid()))
        for ($i = 0; $i -lt 2; $i++) {
            $body = @{ action='parca'; id=$canliIds[$i]; sira=0; veri=[Convert]::ToBase64String($icerikler[$i]) } | ConvertTo-Json -Compress
            $reply = Invoke-RestMethod -Uri http://127.0.0.1:8765/input -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 10
            if (-not $reply.ok) { throw 'Canli parca reddedildi.' }
        }
        $body = @{ action='dosyalar'; ids=$canliIds; adlar=@('canli-rapor.pdf','canli-arsiv.zip'); boyutlar=@(512,512); hedef='pano' } | ConvertTo-Json -Compress
        $reply = Invoke-RestMethod -Uri http://127.0.0.1:8765/input -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 10
        if (-not $reply.ok) { throw 'Canli dosya aktarimi reddedildi.' }
        $canliPano = [Windows.Forms.Clipboard]::GetFileDropList()
        if ($canliPano.Count -ne 2) { throw 'Canli HTTP aktarimi panoya ulasmadi.' }
        for ($i = 0; $i -lt 2; $i++) {
            if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($canliPano[$i])) -ne [Convert]::ToBase64String($icerikler[$i])) { throw 'Canli dosya baytlari degisti.' }
        }
        Write-Output 'PASS: running desktop helper HTTP chunks, new file action and real Windows clipboard'
    }
} finally {
    if ($onceki) { [Windows.Forms.Clipboard]::SetDataObject($onceki, $true) } else { [Windows.Forms.Clipboard]::Clear() }
}
Write-Output 'PASS: helper syntax, PDF/ZIP bytes, empty file, safe names, collision, Windows FileDropList and folder paste'

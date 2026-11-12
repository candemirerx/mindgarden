param([switch]$Wifi, [switch]$Denetle)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Not Bahcesi PC Yardimcisi' -ForegroundColor Cyan
Write-Host 'Normal kullanici olarak calisir; yonetici penceresi acmaz.'
if($Denetle){
    $taskIdentity=[System.Security.Principal.WindowsIdentity]::GetCurrent()
    $taskAdmin=([System.Security.Principal.WindowsPrincipal]::new($taskIdentity)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
    Write-Host "Yonetici oturumu: $taskAdmin"
}
if(-not $Wifi){
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'pc_tailscale_izin.ps1')
    if($LASTEXITCODE -ne 0){Write-Host 'Kart USB ve Bluetooth yine kullanilabilir. Yerel ag icin pc_yardimcisi_wifi.cmd dosyasini acin.'}
} else {
    Write-Host 'Wi-Fi modu: Windows gelen baglantiyi engelliyorsa mevcut bir guvenlik duvari izni gerekir.' -ForegroundColor Yellow
}
if($Denetle){exit 0}
# Both packages serve both default ports. Reuse the existing receiver instead
# of competing for the same Bluetooth service and card USB port.
foreach ($taskPort in @(8765,8775)) {
    try { $taskHello=Invoke-RestMethod "http://127.0.0.1:$taskPort/hello" -TimeoutSec 2 } catch { continue }
    if ($taskHello.app -notin @('not-bahcesi-clipboard','cep-kopru-pc')) { continue }
    if (-not $taskHello.pairApproval -or @($taskHello.ports) -notcontains 8765 -or @($taskHello.ports) -notcontains 8775) {
        Write-Host 'Eski yardimci acik. Penceresini kapatin ve guncel paketi yeniden baslatin.' -ForegroundColor Yellow
        exit 1
    }
    if ($taskHello.clipboardReadBlocked -or ($Wifi -and -not $taskHello.lanAccess)) {
        Write-Host 'Acik yardimci farkli ag veya pano modunda. Once penceresini kapatin, sonra istediginiz modu baslatin.' -ForegroundColor Yellow
        exit 1
    }
    Write-Host ('Uyumlu PC yardimcisi zaten acik. Surum: ' + $taskHello.helperVersion) -ForegroundColor Green
    Write-Host 'Cep Kopru ve Not Bahcesi bu yardimciyi birlikte kullanabilir.'
    exit 0
}
$taskUsbBridge=Join-Path $PSScriptRoot 'usb_baglanti.ps1'
if (Test-Path -LiteralPath $taskUsbBridge) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$taskUsbBridge+'"'),'-NoHelperStart')
}
$taskArguments=@('-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'))
if(-not $Wifi){$taskArguments+='-LoopbackOnly'}
& powershell.exe @taskArguments
exit $LASTEXITCODE

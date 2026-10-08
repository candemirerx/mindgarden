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
$taskArguments=@('-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'))
if(-not $Wifi){$taskArguments+='-LoopbackOnly'}
& powershell.exe @taskArguments
exit $LASTEXITCODE

# Not Bahcesi PC yardimcisi icin Windows guvenlik duvari izni.
#
# Yardimci program TCP 8765 portunda dinler. Windows gelen baglantilari
# varsayilan olarak engelledigi icin telefon ayni Wi-Fi aginda olsa bile bu
# porta baglanamaz: "PC panosuna gonder", fare, kısayol ve dikte sessizce
# calismaz. Bu betik izin kuralini bir kez ekler ve ag profili Ozel degilse
# kullaniciyi acikca uyarir. Yonetici hakki gerektirir.
#
# -Denetle: yalniz bakar (yonetici gerekmez). Izin hazirsa 0, eklenmesi
# gerekiyorsa 1 doner; baslatici yonetici iznini yalniz o zaman bir kez ister.
param([switch]$Denetle)
$ErrorActionPreference = 'Stop'
$kuralAdi = 'Not Bahcesi PC yardimcisi (TCP 8765)'
$port = 8765

if ($Denetle) {
    try {
        $hazir = @(Get-NetFirewallRule -DisplayName $kuralAdi -ErrorAction SilentlyContinue |
            Where-Object { $_.Enabled -eq 'True' -and $_.Action -eq 'Allow' }).Count -gt 0
        $psYolu = Join-Path $PSHOME 'powershell.exe'
        $engel = @(Get-NetFirewallApplicationFilter -Program $psYolu -ErrorAction SilentlyContinue |
            Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' -and $_.Name -like 'TCP Query User*' -and ([int]$_.Profile -band 2) -ne 0 }).Count -gt 0
        if ($hazir -and -not $engel) { exit 0 }
    } catch { }
    exit 1
}

$kimlik = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$yonetici = (New-Object System.Security.Principal.WindowsPrincipal($kimlik)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $yonetici) {
    Write-Host 'Guvenlik duvari izni icin yonetici hakki gerekir.' -ForegroundColor Yellow
    exit 1
}

# Windows'un onceki izin penceresinde "Iptal" secilmesi PowerShell icin
# tum portlari engelleyen kurallar olusturur. Acik engel, port izninden ustundur.
# Yalniz TCP 8765 istisnasini ac: Ortak ag engeli ve diger portlar korunur.
$taskPowerShellPath = Join-Path $PSHOME 'powershell.exe'
$taskPrivateBlocks = @(Get-NetFirewallApplicationFilter -Program $taskPowerShellPath -ErrorAction SilentlyContinue |
    Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' -and $_.Name -like 'TCP Query User*' -and ([int]$_.Profile -band 2) -ne 0 })
if ($taskPrivateBlocks.Count -gt 0) {
    $taskOtherPortsName = 'Not Bahcesi PowerShell diger TCP portlari'
    if (-not (Get-NetFirewallRule -DisplayName $taskOtherPortsName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $taskOtherPortsName -Direction Inbound -Action Block -Program $taskPowerShellPath -Protocol TCP -LocalPort @('1-8764','8766-65535') -Profile Private | Out-Null
    }
    foreach ($taskBlock in $taskPrivateBlocks) {
        $taskRemainingProfiles = [int]$taskBlock.Profile -band (-bnot 2)
        if ($taskRemainingProfiles -eq 0) { $taskBlock | Disable-NetFirewallRule | Out-Null }
        else { $taskBlock | Set-NetFirewallRule -Profile $taskRemainingProfiles | Out-Null }
    }
    Write-Host 'Onceki PowerShell engelinde yalniz yerel TCP 8765 baglantisi icin istisna hazirlandi.' -ForegroundColor Green
}

$kural = $null
try { $kural = Get-NetFirewallRule -DisplayName $kuralAdi -ErrorAction SilentlyContinue } catch { $kural = $null }

if ($kural) {
    $kural | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Private
    $kural | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
    Write-Host ('Guvenlik duvari izni zaten var: ' + $kuralAdi) -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName $kuralAdi -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private -RemoteAddress LocalSubnet -Description 'Not Bahcesi telefon-PC bagi (yalniz yerel ag)' | Out-Null
        Write-Host ('Guvenlik duvari izni eklendi: TCP ' + $port + ' (yalniz Ozel ag profili).') -ForegroundColor Green
    } catch {
        Write-Host ('Guvenlik duvari izni eklenemedi: ' + $_.Exception.Message) -ForegroundColor Red
        exit 2
    }
}

# Kural yalniz Ozel profilde gecerlidir; ag Ortak (Public) profildeyse
# telefon yine baglanamaz, bu yuzden acik uyari verilir.
$acik = @(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.NetworkCategory -ne 'Private' -and $_.IPv4Connectivity -ne 'Disconnected' })
if ($acik.Count -gt 0) {
    Write-Host 'UYARI: Su aglar Ozel profilde degil; izin kurali bu aglarda islemez:' -ForegroundColor Yellow
    foreach ($ag in $acik) { Write-Host ('  - ' + $ag.Name + ' (' + $ag.NetworkCategory + ')') -ForegroundColor Yellow }
    Write-Host 'Windows Ayarlari > Ag ve Internet > Wi-Fi > ag adi > Ag profili: Ozel secin.' -ForegroundColor Yellow
}
exit 0

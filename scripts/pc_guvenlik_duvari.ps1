# Not Bahcesi PC yardimcisi icin Windows guvenlik duvari izni.
#
# Yardimci program TCP 8765 portunda dinler. Windows gelen baglantilari
# varsayilan olarak engelledigi icin telefon ayni Wi-Fi aginda olsa bile bu
# porta baglanamaz: "PC panosuna gonder", fare, kısayol ve dikte sessizce
# calismaz. Bu betik izin kuralini bir kez ekler ve ag profili Ozel degilse
# kullaniciyi acikca uyarir. Yonetici hakki gerektirir.
$ErrorActionPreference = 'Stop'
$kuralAdi = 'Not Bahcesi PC yardimcisi (TCP 8765)'
$port = 8765

$kimlik = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$yonetici = (New-Object System.Security.Principal.WindowsPrincipal($kimlik)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $yonetici) {
    Write-Host 'Guvenlik duvari izni icin yonetici hakki gerekir.' -ForegroundColor Yellow
    exit 1
}

$kural = $null
try { $kural = Get-NetFirewallRule -DisplayName $kuralAdi -ErrorAction SilentlyContinue } catch { $kural = $null }

if ($kural) {
    Write-Host ('Guvenlik duvari izni zaten var: ' + $kuralAdi) -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName $kuralAdi -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private -Description 'Not Bahcesi telefon-PC bagi (yalniz yerel ag)' | Out-Null
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

@echo off
rem Not Bahcesi PC yardimcisi: tek tikla baslatma. Yonetici olarak
rem calistirmaniz GEREKMEZ.
rem 1) Wi-Fi icin guvenlik duvari izni (TCP 8765) yoksa yalniz onu eklemek
rem    icin BIR KEZ Windows izin penceresi cikar. "Hayir" derseniz program yine
rem    acilir: Bluetooth ile pano calisir, yalniz Wi-Fi baglantisi engellenebilir.
rem 2) Pencerede 6 haneli tek kullanimlik ESLESTIRME KODU gosterir (yalniz
rem    Wi-Fi ile eslesmede gerekir).
setlocal
cd /d "%~dp0.."

echo.
echo Not Bahcesi PC yardimcisi hazirlaniyor...
rem Indirilen dosyalardaki "internetten geldi" isaretini kaldirir: Windows'un
rem "Yayimci dogrulanamadi" uyarisi bir daha cikmaz, Bluetooth kutuphanesi yuklenir.
powershell.exe -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0..' -Recurse -File | Unblock-File -ErrorAction SilentlyContinue"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_guvenlik_duvari.ps1" -Denetle
if errorlevel 1 (
    echo Wi-Fi icin guvenlik duvari izni bir kez eklenecek.
    echo Windows izin penceresinde "Evet" deyin; yalniz bu izin icin sorulur.
    powershell.exe -NoProfile -Command "try { $p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0pc_guvenlik_duvari.ps1'; exit $p.ExitCode } catch { exit 5 }"
    if errorlevel 1 (
        echo Izin eklenmedi. Bluetooth ile pano calisir; Wi-Fi baglantisi engellenebilir.
        echo Sonra eklemek icin bu dosyayi yeniden calistirin.
    )
)
echo.
echo Bu pencere acik kalsin (kapatmak icin Ctrl+C).
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_clipboard_helper.ps1"
pause

@echo off
rem Not Bahcesi PC yardimcisi: tek tikla kurulum ve baslatma.
rem 1) Yonetici izni ister ve guvenlik duvarina TCP 8765 iznini ekler
rem    (telefon PC'ye baglanamiyorsa sebebi budur).
rem 2) Pencerede 6 haneli tek kullanimlik ESLESTIRME KODU gosterir.
rem 3) Telefonda: Ayarlar > Bilgisayar baglantisi > Bilgisayar - Wi-Fi (veya
rem    Bluetooth) > "Agda bilgisayar ara" > kodu yazin. Yazma, fare ve pano
rem    bu tek programla calisir.
setlocal
cd /d "%~dp0.."

net session >nul 2>&1
if errorlevel 1 (
    echo Yonetici izni isteniyor: Windows izin penceresinde "Evet" deyin.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo Not Bahcesi PC yardimcisi hazirlaniyor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_guvenlik_duvari.ps1"
echo.
echo Bu pencere acik kalsin (kapatmak icin Ctrl+C).
echo Telefon: Ayarlar - Bilgisayar baglantisi - Bilgisayar Wi-Fi - asagidaki
echo ESLESTIRME KODUNU yazin. Kod bir kez gerekir.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_clipboard_helper.ps1"
pause

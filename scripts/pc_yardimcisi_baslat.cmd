@echo off
rem Not Bahcesi PC yardimcisi: tek tikla kurulum ve baslatma.
rem 1) Yonetici izni ister ve guvenlik duvarina TCP 8765 iznini ekler
rem    (telefon PC'ye baglanamiyorsa sebebi budur).
rem 2) Adres ve erisim anahtarini panoya kopyalar.
rem 3) Telefonda: Ayarlar > Bilgisayar baglantisi > "Tek satir baglanti bilgisi"
rem    alanina yapistirip "Yapistir ve uygula" dugmesine dokunun.
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
echo Telefon: Ayarlar - Bilgisayar baglantisi - "Tek satir baglanti bilgisi"
echo alanina yapistirip "Yapistir ve uygula" dugmesine dokunun.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_clipboard_helper.ps1"
pause

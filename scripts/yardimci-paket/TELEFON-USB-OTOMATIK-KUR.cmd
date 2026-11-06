@echo off
echo Not Bahcesi ve Cep Kopru - ortak telefon USB koprusu
echo Bu islem kullanicinin Windows baslangicina USB koprusu ekler.
echo Yonetici, Wi-Fi veya Tailscale gerekmez.
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Ortak-USB\usb_baglanti_otomatik.ps1"
if errorlevel 1 (
  echo USB kurulumu tamamlanamadi. Yukaridaki hata iletisini kontrol edin.
  pause
  exit /b 1
)
echo Telefonda Bilgisayar - USB yolunu secin ve baglanti istegi gonderin.
pause

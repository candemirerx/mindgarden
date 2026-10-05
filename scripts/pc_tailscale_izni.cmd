@echo off
rem Not Bahcesi PC yardimcisi: Tailscale uzerinden baglanti icin guvenlik duvari izni.
rem BIR KEZ calistirin; Windows yonetici izni sorar. Izin yalniz Tailscale hesabinizdaki
rem cihazlardan (100.64.0.0/10) gelen baglantilari, 8765 portunda ve yalniz yardimci icin acar.
rem Geri almak icin: pc_guvenlik_duvari.ps1 -TailscaleKaldir
setlocal
echo.
echo Tailscale ile uzaktan baglanti icin guvenlik duvari izni eklenecek.
echo Windows izin penceresinde "Evet" deyin.
powershell.exe -NoProfile -Command "try { $p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0pc_guvenlik_duvari.ps1','-Tailscale'; exit $p.ExitCode } catch { exit 5 }"
if errorlevel 1 (
    echo Izin eklenmedi. Tailscale ile baglanti icin bu dosyayi yeniden calistirip izin penceresine Evet deyin.
) else (
    echo Tamam: Tailscale izni verildi. Telefonda Tailscale baglantisini deneyebilirsiniz.
)
echo.
pause

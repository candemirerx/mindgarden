@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_tailscale_izin.ps1"
echo.
echo Bu adresi telefondaki uygulamada Tailscale adresi olarak girin.
pause

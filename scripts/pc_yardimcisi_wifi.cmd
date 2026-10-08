@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pc_yardimcisi_baslat.ps1" -Wifi
if errorlevel 1 pause

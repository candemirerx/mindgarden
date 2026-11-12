param([switch]$Once, [switch]$NoHelperStart, [switch]$Background, [string]$AdbPath = '')
$ErrorActionPreference = 'Stop'
# This bridge does not enable Wi-Fi, modify the firewall, start a VPN, or kill adb.
function Sync-TelefonUsbReverse([string]$AdbPath, [string]$Serial) {
    $taskMappings = @(& $AdbPath -s $Serial reverse --list 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'USB eslemeleri okunamadi.' }
    # adb uses a single space on Samsung/UsbFfs and may use tabs on other hosts.
    if ($taskMappings -match '(^|\s)tcp:18775\s+tcp:8775\s*$') { return }
    if ($taskMappings -match '(^|\s)tcp:18775\s+') {
        throw 'USB kontrol portu baska bir esleme tarafindan kullaniliyor; mevcut esleme korunuyor.'
    }
    & $AdbPath -s $Serial reverse --no-rebind tcp:18775 tcp:8775 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'USB kontrol koprusu kurulamadi; mevcut eslemeler korunuyor.' }
}

$taskLease = [Threading.Mutex]::new($false, 'Local\CepKopruTelefonUsbBridge')
$taskHeld = $false
try { $taskHeld = $taskLease.WaitOne(0) } catch [Threading.AbandonedMutexException] { $taskHeld = $true }
if (-not $taskHeld) { Write-Host 'Telefon USB koprusu zaten calisiyor. Telefonda Bilgisayar / USB secip baglanti istegi gonderin.'; exit 0 }
try {
    if (-not $AdbPath) {
        $taskCandidates = @((Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'), (Join-Path $PSScriptRoot 'vendor\gnirehtet\adb.exe'))
        $AdbPath = $taskCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (-not $AdbPath -or -not (Test-Path -LiteralPath $AdbPath)) { throw 'ADB bulunamadi. Android platform-tools veya yardimci paketini kontrol edin.' }
    $taskChild = $null
    $taskLastError = ''
    $taskRetryAt = [DateTime]::MinValue
    Write-Host 'Cep Kopru / Telefon USB baglantisi' -ForegroundColor Cyan
    Write-Host 'Telefonda Bilgisayar / USB secin ve baglanti istegi gonderin.'
    Write-Host 'Eslesme onayi bilgisayarda ayri bir pencerede gorunur. Bu pencereyi kapatmayin.'
    do {
        try {
            if (-not $NoHelperStart -and [DateTime]::UtcNow -ge $taskRetryAt) {
                $taskHealthy = $false
                try { $taskHello = Invoke-RestMethod 'http://127.0.0.1:8775/hello' -TimeoutSec 2; $taskHealthy = $taskHello.app -in @('cep-kopru-pc','not-bahcesi-clipboard') } catch { }
                if (-not $taskHealthy -and (-not $taskChild -or $taskChild.HasExited)) {
                    $taskHelper = Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'
                    $taskStyle = if ($Background) { 'Hidden' } else { 'Normal' }
                    $taskChild = Start-Process powershell.exe -WindowStyle $taskStyle -PassThru -ArgumentList @('-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',('"'+$taskHelper+'"'),'-Port','8775','-LoopbackOnly','-NoCard','-NoBluetooth')
                }
                $taskRetryAt = [DateTime]::UtcNow.AddSeconds(15)
            }
            $taskDevices = @(& $AdbPath devices -l 2>$null | ForEach-Object {
                if ($_ -match '^(\S+)\s+device\s' -and $Matches[1] -notmatch ':|^emulator-') { $Matches[1] }
            })
            $taskPhoneErrors = @()
            foreach ($taskSerial in $taskDevices) {
                try { Sync-TelefonUsbReverse -AdbPath $AdbPath -Serial $taskSerial }
                catch { $taskPhoneErrors += ($taskSerial + ': ' + $_.Exception.Message) }
            }
            # A single file share is supported. Never silently point an old share at another phone.
            $taskForwards = @(& $AdbPath forward --list 2>$null)
            $taskFileForward = @($taskForwards | Where-Object { $_ -match '(^|\s)tcp:18776\s+' })
            if ($taskDevices.Count -eq 1 -and -not $taskFileForward) {
                & $AdbPath -s $taskDevices[0] forward --no-rebind tcp:18776 tcp:18776 2>$null | Out-Null
            }
            if ($taskPhoneErrors.Count) { throw ($taskPhoneErrors -join '; ') }
            if ($Once) { Write-Output ('USB bridge checked: authorized phones=' + $taskDevices.Count) }
            $taskLastError = ''
        } catch {
            if ($Once) { throw }
            if ($taskLastError -ne $_.Exception.Message) {
                $taskLastError = $_.Exception.Message
                Write-Warning ('USB koprusu: ' + $taskLastError)
            }
        }
        if (-not $Once) { Start-Sleep -Seconds 3 }
    } while (-not $Once)
} finally { if ($taskHeld) { $taskLease.ReleaseMutex() }; $taskLease.Dispose() }

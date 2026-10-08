param([ValidateRange(1024,65535)][int]$Port=8765, [switch]$Kaldir)
$ErrorActionPreference='Stop'
# Forward only this helper port; preserve other Serve routes and firewall rules.
$taskCommand=Get-Command tailscale.exe -ErrorAction SilentlyContinue
$taskExe=if($taskCommand){$taskCommand.Source}else{Join-Path $env:ProgramFiles 'Tailscale/tailscale.exe'}
if(-not (Test-Path -LiteralPath $taskExe)) {
    Write-Host 'Tailscale bulunamadi. Kart USB ve Bluetooth kullanilabilir.'
    exit 2
}
try {
    $taskState=(& $taskExe status --json | ConvertFrom-Json)
    if($LASTEXITCODE -ne 0 -or $taskState.BackendState -ne 'Running'){throw 'Tailscale oturumu acik degil.'}
    $taskServe=(& $taskExe serve status --json | ConvertFrom-Json)
    if($LASTEXITCODE -ne 0){throw 'Tailscale yonlendirmesi okunamadi.'}
    $taskExisting=$taskServe.TCP."$Port"
    $taskTarget="127.0.0.1:$Port"
    if($taskExisting -and $taskExisting.TCPForward -ne $taskTarget){throw "Port $Port baska bir yayinda kullaniliyor. Mevcut yayin degistirilmedi."}
    if($Kaldir){
        if($taskExisting){
            & $taskExe serve --tcp=$Port off
            if($LASTEXITCODE -ne 0){throw 'Yonlendirme kaldirilamadi.'}
        }
        exit 0
    }
    if(-not $taskExisting){
        & $taskExe serve --bg --tcp=$Port "tcp://$taskTarget"
        if($LASTEXITCODE -ne 0){throw 'Tailscale yonlendirmesine sistem politikasi izin vermedi.'}
    }
    $taskState.TailscaleIPs | Where-Object {$_ -like '100.*'} | ForEach-Object {
        Write-Host "Telefondaki bilgisayar adresi: http://${_}:$Port" -ForegroundColor Green
    }
    exit 0
} catch { Write-Warning $_.Exception.Message; exit 1 }

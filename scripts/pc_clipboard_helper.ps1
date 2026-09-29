param(
    [ValidateRange(1024, 65535)][int]$Port = 8765,
    [switch]$TestMode,
    [string]$BluetoothPort = 'auto',
    [switch]$SerialOnly
)

# Windows PowerShell 5.1 ve .NET ile çalışır; Python veya ek paket gerekmez.
# Yalnız güvenilen Özel ağlarda kullanın. Telefonun Ayarlar bölümüne aşağıda
# gösterilen IPv4 adresini ve anahtarı girin. Ctrl+C ile kapatın.
$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'RemoteInput.cs')
$tokenPath = Join-Path $PSScriptRoot '.pc_clipboard_token'
if (-not (Test-Path -LiteralPath $tokenPath)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $fresh = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    [System.IO.File]::WriteAllText($tokenPath, $fresh, [System.Text.Encoding]::ASCII)
    # Anahtar yalnız bu kullanıcı için okunabilsin (NTFS üzerinde).
    try {
        $acl = Get-Acl -LiteralPath $tokenPath
        $acl.SetAccessRuleProtection($true, $false)
        $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($user, 'FullControl', 'Allow')
        $acl.AddAccessRule($rule)
        Set-Acl -LiteralPath $tokenPath -AclObject $acl
    } catch { Write-Warning 'Anahtar dosyasının NTFS izni ayarlanamadı; dosyayı başkalarıyla paylaşmayın.' }
}
$secret = [System.IO.File]::ReadAllText($tokenPath, [System.Text.Encoding]::ASCII).Trim()
if ($secret.Length -lt 32) { throw 'Anahtar dosyası geçersiz. Yardımcı programı başlatmadan önce kontrol edin.' }

if ($SerialOnly) {
    $serial = New-Object -TypeName System.IO.Ports.SerialPort -ArgumentList $BluetoothPort, 115200
    $serial.Encoding = [System.Text.UTF8Encoding]::new($false)
    $serial.NewLine = "`n"
    $serial.ReadTimeout = 1000
    $serial.WriteTimeout = 3000
    $serial.Open()
    try {
        while ($true) {
            try { $line = $serial.ReadLine() }
            catch [System.TimeoutException] { continue }
            try {
                if ($line.Length -gt 32768) { throw 'İstek çok uzun.' }
                $command = $line | ConvertFrom-Json
                if ($command.token -isnot [string]) { throw 'Anahtar gerekli.' }
                $inputBody = $command | Select-Object -Property * -ExcludeProperty token | ConvertTo-Json -Compress -Depth 4
                $headers = @{ Authorization = "Bearer $($command.token)" }
                $reply = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/input" -Headers $headers -ContentType 'text/plain; charset=utf-8' -Body $inputBody -TimeoutSec 8
                $serial.WriteLine((@{ ok = ($reply.ok -eq $true) } | ConvertTo-Json -Compress))
            } catch { try { $serial.WriteLine('{"ok":false}') } catch { } }
        }
    } finally { $serial.Close(); $serial.Dispose() }
}

function Same-Token([string]$candidate, [string]$expected) {
    if ($candidate.Length -ne $expected.Length) { return $false }
    $difference = 0
    for ($i = 0; $i -lt $candidate.Length; $i++) {
        $difference = $difference -bor ([int][char]$candidate[$i] -bxor [int][char]$expected[$i])
    }
    return $difference -eq 0
}

function Send-Response($stream, [int]$status, [string]$json) {
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    $reason = switch ($status) { 200 { 'OK' } 400 { 'Bad Request' } 401 { 'Unauthorized' } 404 { 'Not Found' } 413 { 'Payload Too Large' } default { 'Error' } }
    $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status $reason`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
    $stream.Write($header, 0, $header.Length)
    $stream.Write($body, 0, $body.Length)
}

function Read-Headers($stream) {
    $memory = New-Object System.IO.MemoryStream
    $tail = 0
    while ($memory.Length -lt 16384) {
        $next = $stream.ReadByte()
        if ($next -lt 0) { throw 'HTTP başlığı tamamlanmadı.' }
        $memory.WriteByte([byte]$next)
        $tail = (($tail -shl 8) -bor $next) -band 0xFFFFFFFFL
        if ($tail -eq 0x0D0A0D0A) { return [System.Text.Encoding]::ASCII.GetString($memory.ToArray()) }
    }
    throw 'HTTP başlığı çok uzun.'
}

function Handle-Client($client, [string]$expectedToken, [bool]$dryRun) {
    $client.ReceiveTimeout = 5000
    $client.SendTimeout = 5000
    $stream = $client.GetStream()
    try {
        $header = Read-Headers $stream
        $lines = $header.Split([string[]]@("`r`n"), [StringSplitOptions]::None)
        $parts = $lines[0].Split(' ')
        if ($parts.Length -lt 3) { Send-Response $stream 400 '{"ok":false}'; return }
        $authorization = ''
        $length = -1
        foreach ($line in $lines[1..($lines.Length - 1)]) {
            if ($line -match '^Authorization:\s*(.+)$') { $authorization = $Matches[1].Trim() }
            if ($line -match '^Content-Length:\s*(\d+)\s*$') { $length = [int]$Matches[1] }
        }
        if (-not (Same-Token $authorization "Bearer $expectedToken")) { Send-Response $stream 401 '{"ok":false,"error":"Anahtar yanlış"}'; return }
        if ($parts[0] -eq 'GET' -and $parts[1] -eq '/health') { Send-Response $stream 200 '{"ok":true,"app":"not-bahcesi-clipboard"}'; return }
        if ($parts[0] -ne 'POST' -or @('/clipboard', '/input') -notcontains $parts[1]) { Send-Response $stream 404 '{"ok":false}'; return }
        if ($length -lt 1 -or $length -gt 1048576) { Send-Response $stream 413 '{"ok":false,"error":"Metin 1 MB sınırını aşıyor"}'; return }
        $payload = New-Object byte[] $length
        $readTotal = 0
        while ($readTotal -lt $length) {
            $count = $stream.Read($payload, $readTotal, $length - $readTotal)
            if ($count -le 0) { throw 'HTTP gövdesi eksik.' }
            $readTotal += $count
        }
        $utf8 = New-Object System.Text.UTF8Encoding($false, $true)
        $content = $utf8.GetString($payload)
        if ($parts[1] -eq '/clipboard') {
            if (-not $dryRun) { Set-Clipboard -Value $content }
        } else {
            if ($length -gt 32768) { Send-Response $stream 413 '{"ok":false}'; return }
            $inputAction = $content | ConvertFrom-Json
            if ($null -eq $inputAction -or $null -eq $inputAction.action) { throw 'Eylem gerekli.' }
            switch ([string]$inputAction.action) {
                'ping' { }
                'clipboard' {
                    if ($inputAction.text -isnot [string] -or $inputAction.text.Length -gt 32000) { throw 'Pano metni geçersiz.' }
                    if (-not $dryRun) { Set-Clipboard -Value $inputAction.text }
                }
                'text' {
                    if ($inputAction.text -isnot [string] -or $inputAction.text.Length -gt 32000) { throw 'Metin geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::TypeText($inputAction.text) }
                }
                'move' {
                    $dx = [int]$inputAction.dx; $dy = [int]$inputAction.dy
                    if ([math]::Abs($dx) -gt 127 -or [math]::Abs($dy) -gt 127) { throw 'Hareket sınırı aşıldı.' }
                    if (-not $dryRun) { [RemoteInput]::Move($dx, $dy) }
                }
                'click' {
                    $button = [int]$inputAction.button
                    if ($button -notin @(1,2)) { throw 'Tık türü geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Click($button) }
                }
                'scroll' {
                    $steps = [int]$inputAction.steps
                    if ([math]::Abs($steps) -gt 20) { throw 'Kaydırma sınırı aşıldı.' }
                    if (-not $dryRun) { [RemoteInput]::Scroll($steps) }
                }
                'absolute' {
                    $x = [int]$inputAction.x; $y = [int]$inputAction.y
                    if ($x -lt 0 -or $x -gt 32767 -or $y -lt 0 -or $y -gt 32767 -or $inputAction.click -isnot [bool]) { throw 'Konum geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Absolute($x, $y, $inputAction.click) }
                }
                'shortcut' {
                    if ($inputAction.keys -isnot [string] -or $inputAction.keys -notmatch '^[A-Za-z0-9+_ -]{1,60}$') { throw 'Kısayol geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Shortcut($inputAction.keys) }
                }
                default { throw 'Bilinmeyen eylem.' }
            }
        }
        Send-Response $stream 200 '{"ok":true}'
    } catch {
        try { Send-Response $stream 400 '{"ok":false,"error":"Geçersiz istek veya pano meşgul"}' } catch { }
    } finally { $client.Close() }
}

$serialJob = $null
if (-not $TestMode) {
    if ($BluetoothPort -eq 'auto') {
        $incoming = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match 'Bluetooth' -and $_.PNPDeviceID -match 'LOCALMFG' } | Select-Object -First 1
        if ($incoming) { $BluetoothPort = $incoming.DeviceID }
    }
    if ($BluetoothPort -ne 'auto' -and $BluetoothPort -ne 'off') {
        $scriptPath = $PSCommandPath
        $serialJob = Start-Job -ScriptBlock {
            param($path, $port, $com)
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Port $port -BluetoothPort $com -SerialOnly
        } -ArgumentList $scriptPath, $Port, $BluetoothPort
    }
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()
try {
    Write-Host "Not Bahçesi PC kontrol yardımcısı — Wi‑Fi port $Port" -ForegroundColor Green
    $adresler = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
    $adresler | ForEach-Object { Write-Host "Adres: http://$($_.IPAddress):$Port" }
    Write-Host "Erişim anahtarı: $secret"
    # Telefonda iki alanı elle doldurmak yerine adres ve anahtar tek satırda
    # panoya konur; uygulamadaki "tek satır bağlantı bilgisi" alanına yapıştırılır.
    $ilkAdres = $adresler | Select-Object -First 1
    if ($ilkAdres) {
        $baglantiSatiri = "http://$($ilkAdres.IPAddress):$Port|$secret"
        try {
            Set-Clipboard -Value $baglantiSatiri
            Write-Host 'Bağlantı satırı panoya kopyalandı: Not Bahçesi → Ayarlar → Bilgisayar bağlantısı → "Tek satır bağlantı bilgisi" alanına yapıştırın.' -ForegroundColor Cyan
        } catch {
            Write-Host "Bağlantı satırı (elle kopyalayın): $baglantiSatiri"
        }
    }
    if ($serialJob) { Write-Host "Klasik Bluetooth: gelen $BluetoothPort portu (Windows ile önce eşleştirin)." }
    else { Write-Host 'Klasik Bluetooth: gelen seri port bulunamadı; yalnız Wi‑Fi etkin.' }
    if ($TestMode) { Write-Warning 'TestMode: gelen metin gerçek panoya yazılmaz.' }
    Write-Host 'Yalnız güvenilen Özel ağda kullanın. Kapatmak için Ctrl+C.'
    while ($true) {
        $client = $listener.AcceptTcpClient()
        Handle-Client $client $secret ([bool]$TestMode)
    }
} finally {
    $listener.Stop()
    if ($serialJob) { Stop-Job $serialJob -ErrorAction SilentlyContinue; Remove-Job $serialJob -Force -ErrorAction SilentlyContinue }
}

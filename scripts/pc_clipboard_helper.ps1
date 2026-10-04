param(
    [ValidateRange(1024, 65535)][int]$Port = 8765,
    [switch]$TestMode,
    [string]$BluetoothPort = 'auto',
    [switch]$SerialOnly,
    [switch]$RfcommOnly,
    # Eski "adres|anahtar" satırını pencerede göster (eşleştirme kodu olmadan kurulum için).
    [switch]$ElleSatir
)

# Windows PowerShell 5.1 ve .NET ile çalışır; Python veya ek paket gerekmez.
# Yalnız güvenilen Özel ağlarda kullanın. Telefonun Ayarlar bölümüne aşağıda
# gösterilen IPv4 adresini ve anahtarı girin. Ctrl+C ile kapatın.
$ErrorActionPreference = 'Stop'
# İnternetten indirilen zip'ten çıkan dosyalar "internetten geldi" işareti taşır;
# .NET işaretli DLL'i yüklemez (0x80131515) ve Bluetooth dinleyicisi açılmaz.
# Yardımcı kendi klasöründeki işaretleri kaldırır (yönetici izni gerekmez).
Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
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

if ($RfcommOnly) {
    try { Add-Type -Path (Join-Path $PSScriptRoot 'vendor/InTheHand.Net.Personal.dll') }
    catch { Write-Output ('BluetoothError:' + $_.Exception.Message); exit 3 }
    # Bluetooth radyosu uyuyup uyandığında veya Windows yığını sıfırlandığında
    # dinleyici hata verir. Önceden döngü bitiyor ve Bluetooth yardımcı yeniden
    # açılana kadar çalışmıyordu; artık dinleyici kısa beklemeyle yeniden kurulur.
    $hazirYazildi = $false
    $hataYazildi = $false
    while ($true) {
    $bluetooth = $null
    try {
        $bluetooth = [InTheHand.Net.Sockets.BluetoothListener]::new([Guid]'93c7b30b-d973-4873-bf10-148491968b2c')
        $bluetooth.ServiceName = 'Not Bahcesi PC'
        $bluetooth.Authenticate = $true
        $bluetooth.Start()
        if (-not $hazirYazildi) { Write-Output 'BluetoothReady:RFCOMM'; $hazirYazildi = $true }
        while ($true) {
            $client = $bluetooth.AcceptBluetoothClient()
            $reader = $null; $writer = $null
            try {
                $stream = $client.GetStream()
                # Habersiz kopan telefon tek dinleyiciyi kilitlemesin; telefon boşta
                # kalan bağlantıyı kendisi sınayıp gerekirse yeniden kurar.
                $stream.ReadTimeout = 120000
                $reader = [System.IO.StreamReader]::new($stream, [System.Text.UTF8Encoding]::new($false, $true), $false, 4096, $true)
                $writer = [System.IO.StreamWriter]::new($stream, [System.Text.UTF8Encoding]::new($false), 4096, $true)
                $writer.NewLine = "`n"; $writer.AutoFlush = $true
                while ($null -ne ($line = $reader.ReadLine())) {
                    try {
                        if ([System.Text.Encoding]::UTF8.GetByteCount($line) -gt 32768) { throw 'İstek çok uzun.' }
                        $command = $line | ConvertFrom-Json
                        if ($command.action -eq 'pair' -and [string]::IsNullOrEmpty([string]$command.pin)) {
                            # Bluetooth'ta kod gerekmez: dinleyici Authenticate=true ile yalnız Windows'la
                            # önceden eşleşmiş ve doğrulanmış cihazları kabul eder; eşleşme zaten güvendir.
                            $writer.WriteLine((@{ ok = $true; token = $secret; name = $env:COMPUTERNAME } | ConvertTo-Json -Compress))
                            continue
                        }
                        if ($command.action -eq 'pair') {
                            # Kodla eşleştirme (eski uygulama sürümleri): kod, Wi‑Fi yardımcısının /pair ucunda denetlenir.
                            try {
                                $eslesme = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/pair" -ContentType 'application/json' -Body (@{ pin = [string]$command.pin } | ConvertTo-Json -Compress) -TimeoutSec 8
                                $writer.WriteLine(($eslesme | ConvertTo-Json -Compress))
                            } catch { $writer.WriteLine('{"ok":false,"error":"Eşleştirme kodu yanlış."}') }
                            continue
                        }
                        if ($command.token -isnot [string]) { throw 'Anahtar gerekli.' }
                        $inputBody = $command | Select-Object -Property * -ExcludeProperty token | ConvertTo-Json -Compress -Depth 4
                        $reply = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/input" -Headers @{ Authorization = "Bearer $($command.token)" } -ContentType 'text/plain; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($inputBody)) -TimeoutSec 8
                        $writer.WriteLine((@{ ok = ($reply.ok -eq $true) } | ConvertTo-Json -Compress))
                    } catch { $writer.WriteLine('{"ok":false,"error":"Komut reddedildi; erişim anahtarını kontrol edin."}') }
                }
            } catch { } finally {
                if ($reader) { $reader.Dispose() }
                if ($writer) { try { $writer.Dispose() } catch { } }
                $client.Close()
            }
        }
    } catch {
        # Sebep ana pencereye bir kez bildirilir (Bluetooth yok/kapalı vb.); dinleyici denemeyi sürdürür.
        if (-not $hataYazildi) { Write-Output ('BluetoothError:' + $_.Exception.Message); $hataYazildi = $true }
        Start-Sleep -Seconds 2
    } finally { if ($bluetooth) { try { $bluetooth.Stop() } catch { } } }
    }
}

if ($SerialOnly) {
    # Telefon bağlantıyı kesince gelen COM portu G/Ç hatası verir; port kapatılıp
    # yeniden açılır, yoksa sonraki bağlantılar hiç yanıt almıyordu.
    $hazirYazildi = $false
    while ($true) {
    $serial = $null
    try {
        $serial = New-Object -TypeName System.IO.Ports.SerialPort -ArgumentList $BluetoothPort, 115200
        $serial.Encoding = [System.Text.UTF8Encoding]::new($false)
        $serial.NewLine = "`n"
        $serial.ReadTimeout = 1000
        $serial.WriteTimeout = 3000
        $serial.Open()
        if (-not $hazirYazildi) { Write-Output "BluetoothReady:$BluetoothPort"; $hazirYazildi = $true }
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
    } catch {
        Start-Sleep -Seconds 2
    } finally { if ($serial) { try { $serial.Close(); $serial.Dispose() } catch { } } }
    }
}

# Windows panosunu aynı anda yalnız bir program açabilir; pano geçmişi, bulut
# panosu ve pano yöneticileri her yazmanın ardından kısa süre kilitli tutar.
# Arka arkaya gelen gönderimlerde Set-Clipboard bu yüzden ExternalException
# veriyordu; kısa aralıklarla yeniden denenir.
function Set-ClipboardRetry([string]$text) {
    for ($deneme = 1; ; $deneme++) {
        try { Set-Clipboard -Value $text -ErrorAction Stop; return }
        catch {
            if ($deneme -ge 15) { throw }
            Start-Sleep -Milliseconds (40 * $deneme)
        }
    }
}

function Same-Token([string]$candidate, [string]$expected) {
    if ($candidate.Length -ne $expected.Length) { return $false }
    $difference = 0
    for ($i = 0; $i -lt $candidate.Length; $i++) {
        $difference = $difference -bor ([int][char]$candidate[$i] -bxor [int][char]$expected[$i])
    }
    return $difference -eq 0
}

# ---- Eşleştirme kodu ----------------------------------------------------
# Uzun erişim anahtarını telefona elle taşımak yerine pencerede 6 haneli bir
# kod gösterilir; telefon bilgisayarı ağda (veya Bluetooth ile) bulup kodu
# gönderir, doğruysa anahtarı alır. Her yanlış denemede 1 sn beklenir, 5
# yanlışta kod yenilenir, toplam 20 yanlışta eşleştirme bu oturumda kapanır.
function New-PairPin {
    $bytes = New-Object byte[] 4
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToUInt32($bytes, 0) % 1000000).ToString('000000')
}
$script:pairPin = New-PairPin
$script:pairFails = 0
$script:pairTotalFails = 0
function Show-PairPin {
    Write-Host ''
    Write-Host ('   ╔══════════════════════════════╗') -ForegroundColor Yellow
    Write-Host ('   ║  EŞLEŞTİRME KODU:  {0} {1}  ║' -f $script:pairPin.Substring(0, 3), $script:pairPin.Substring(3)) -ForegroundColor Yellow
    Write-Host ('   ╚══════════════════════════════╝') -ForegroundColor Yellow
    Write-Host '   Telefonda: Ayarlar → Bilgisayar bağlantısı → Bilgisayar · Wi‑Fi (veya Bluetooth) → kodu yazın.'
    Write-Host '   Kod tek kullanımlıktır; bir kez eşleşen telefon bir daha kod sormadan bağlanır.'
    Write-Host ''
}
function Test-PairPin([string]$pin, [string]$secret) {
    if ($script:pairTotalFails -ge 20) { return '{"ok":false,"error":"Çok fazla yanlış kod. Yardımcıyı yeniden açın."}' }
    $temiz = ($pin -replace '\D', '')
    if ($temiz.Length -eq 6 -and (Same-Token $temiz $script:pairPin)) {
        $script:pairFails = 0
        # Kod tek kullanımlık: kullanılan kod geçersizleşir, başka telefon için yenisi gösterilir.
        $script:pairPin = New-PairPin
        Write-Host ('Telefon eşleştirildi ({0}). Yazma ve pano artık kodsuz çalışır.' -f (Get-Date -Format 'HH:mm')) -ForegroundColor Green
        Write-Host 'Başka bir telefon eşleştirmek isterseniz yeni kod:' -ForegroundColor DarkGray
        Show-PairPin
        return (@{ ok = $true; token = $secret; name = $env:COMPUTERNAME } | ConvertTo-Json -Compress)
    }
    $script:pairFails++; $script:pairTotalFails++
    Start-Sleep -Seconds 1
    if ($script:pairFails -ge 5) {
        $script:pairPin = New-PairPin; $script:pairFails = 0
        Write-Host 'Çok sayıda yanlış eşleştirme kodu denendi; yeni kod üretildi.' -ForegroundColor Yellow
        Show-PairPin
    }
    return '{"ok":false,"error":"Eşleştirme kodu yanlış."}'
}

function Send-Response($stream, [int]$status, [string]$json) {
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    $reason = switch ($status) { 200 { 'OK' } 400 { 'Bad Request' } 401 { 'Unauthorized' } 403 { 'Forbidden' } 404 { 'Not Found' } 413 { 'Payload Too Large' } default { 'Error' } }
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
    # Sunucu istemcileri sırayla işler: yarıda kalan tek bir bağlantı (ör. Wi‑Fi'si
    # istek ortasında kopan telefon) sonraki tüm komutları bu süre kadar bekletir.
    # Telefon isteğin tamamını hemen gönderdiği için kısa süre yeterli.
    $client.ReceiveTimeout = 1500
    $client.SendTimeout = 3000
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
        # Anahtarsız iki uç: telefonun ağda yardımcıyı bulması ve kodla eşleşmesi.
        if ($parts[0] -eq 'GET' -and $parts[1] -eq '/hello') {
            Send-Response $stream 200 (@{ ok = $true; app = 'not-bahcesi-clipboard'; name = $env:COMPUTERNAME; pair = $true } | ConvertTo-Json -Compress); return
        }
        if ($parts[0] -eq 'POST' -and $parts[1] -eq '/pair') {
            if ($length -lt 1 -or $length -gt 256) { Send-Response $stream 400 '{"ok":false}'; return }
            $pairBody = New-Object byte[] $length
            $okunan = 0
            while ($okunan -lt $length) { $n = $stream.Read($pairBody, $okunan, $length - $okunan); if ($n -le 0) { throw 'HTTP gövdesi eksik.' }; $okunan += $n }
            $pin = [string](([System.Text.Encoding]::UTF8.GetString($pairBody) | ConvertFrom-Json).pin)
            $cevap = Test-PairPin $pin $expectedToken
            Send-Response $stream ($(if ($cevap -like '{"ok":true*' -or $cevap -like '*"ok":true*') { 200 } else { 403 })) $cevap; return
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
            if (-not $dryRun) { Set-ClipboardRetry $content }
        } else {
            if ($length -gt 32768) { Send-Response $stream 413 '{"ok":false}'; return }
            $inputAction = $content | ConvertFrom-Json
            if ($null -eq $inputAction -or $null -eq $inputAction.action) { throw 'Eylem gerekli.' }
            switch ([string]$inputAction.action) {
                'ping' { }
                'clipboard' {
                    if ($inputAction.text -isnot [string] -or $inputAction.text.Length -gt 32000) { throw 'Pano metni geçersiz.' }
                    if (-not $dryRun) { Set-ClipboardRetry $inputAction.text }
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

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try { $listener.Start() }
catch {
    Write-Host "PC bağlantı noktası $Port zaten kullanılıyor. Açık Not Bahçesi yardımcısının penceresini kullanın; başka bir yardımcı açmadan önce mevcut olanı kapatın." -ForegroundColor Yellow
    exit 3
}
# Port zaten kullaniliyorsa ikinci bir Bluetooth alicisi baslatma.
$serialJob = $null
$directBluetooth = $false
if (-not $TestMode) {
    if ($BluetoothPort -eq 'auto' -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'vendor/InTheHand.Net.Personal.dll'))) {
        $directBluetooth = $true
        $scriptPath = $PSCommandPath
        $serialJob = Start-Job -ScriptBlock {
            param($path, $port)
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Port $port -RfcommOnly
        } -ArgumentList $scriptPath, $Port
    } elseif ($BluetoothPort -eq 'auto') {
        $incoming = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue |
            Where-Object { $_.PNPDeviceID -match 'LOCALMFG' -and $_.PNPDeviceID -match '00001101' } | Select-Object -First 1
        if ($incoming) { $BluetoothPort = $incoming.DeviceID }
    }
    if (-not $directBluetooth -and $BluetoothPort -ne 'auto' -and $BluetoothPort -ne 'off') {
        $scriptPath = $PSCommandPath
        $serialJob = Start-Job -ScriptBlock {
            param($path, $port, $com)
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Port $port -BluetoothPort $com -SerialOnly
        } -ArgumentList $scriptPath, $Port, $BluetoothPort
    }
}
try {
    Write-Host "Not Bahçesi PC Yardımcısı (Wi‑Fi port $Port)" -ForegroundColor Green
    Write-Host 'Tek program: telefondan bilgisayara yazma, fare, kısayollar ve PANO bununla çalışır.'
    Write-Host '  · Bilgisayara yaz / klavye / makro: metni Not Defteri''ne elle yazar gibi tuş tuş yazar.'
    Write-Host '  · Panoya gönder: metni bilgisayar panosuna koyar; Ctrl+V ile yapıştırırsınız.'
    # Bağlantısız hotspot/VPN adresi yerine etkin fiziksel ağ kartını öncele.
    $physical = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up' | Select-Object -ExpandProperty ifIndex)
    $active = @(Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object ConnectionState -eq 'Connected' | Select-Object -ExpandProperty InterfaceIndex)
    $adresler = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $active -contains $_.InterfaceIndex } |
        Sort-Object @{ Expression = { if ($physical -contains $_.InterfaceIndex) { 0 } else { 1 } } }, InterfaceIndex)
    $adresler | ForEach-Object { Write-Host "Adres: http://$($_.IPAddress):$Port" -ForegroundColor DarkGray }
    Show-PairPin
    # Panoya artık otomatik bir şey kopyalanmaz (kullanıcının panosunu ezmesin);
    # eşleştirme kodu yeterli. Elle kurulum satırı istenirse -ElleSatir ile gösterilir.
    $ilkAdres = $adresler | Select-Object -First 1
    if ($ilkAdres -and $ElleSatir) {
        Write-Host ("Elle kurulum satırı (Gelişmiş): http://{0}:{1}|{2}" -f $ilkAdres.IPAddress, $Port, $secret) -ForegroundColor DarkGray
    }
    $serialReady = $false
    if ($serialJob) {
        # Yavaş bilgisayarda alt süreç C# bileşenini derleyip kütüphaneyi yüklerken 8 sn yetmiyordu.
        Write-Host 'Bluetooth hazırlanıyor…' -ForegroundColor DarkGray
        $deadline = [DateTime]::UtcNow.AddSeconds(25)
        do {
            $jobOutput = @(Receive-Job $serialJob -Keep -ErrorAction SilentlyContinue)
            $readyMarker = if ($directBluetooth) { 'BluetoothReady:RFCOMM' } else { "BluetoothReady:$BluetoothPort" }
            $serialReady = @($jobOutput | Where-Object { "$_" -eq $readyMarker }).Count -gt 0
            $btHata = @($jobOutput | Where-Object { "$_" -like 'BluetoothError:*' } | Select-Object -First 1)
            if (-not $serialReady -and -not $btHata) { Start-Sleep -Milliseconds 200 }
        } while (-not $serialReady -and -not $btHata -and $serialJob.State -eq 'Running' -and [DateTime]::UtcNow -lt $deadline)
    }
    if ($serialReady -and $directBluetooth) { Write-Host 'Klasik Bluetooth: doğrudan alıcı hazır; COM portu gerekmez. Windows ve telefonu eşleştirin.' }
    elseif ($serialReady) { Write-Host "Klasik Bluetooth: gelen $BluetoothPort portu hazır (Windows ile önce eşleştirin)." }
    elseif ($serialJob) {
        $sebep = if ($btHata) { ("$($btHata[0])" -replace '^BluetoothError:', '').Trim() } else { '' }
        $radyo = @(Get-PnpDevice -Class Bluetooth -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Adapter|Radio|Bağdaştırıcı|Wireless Bluetooth|Generic Bluetooth' -or $_.InstanceId -like 'USB*' })
        if (-not $radyo) {
            Write-Warning 'Bu bilgisayarda Bluetooth bulunamadı (ya da sürücüsü yok). Wi‑Fi ile bağlanabilirsiniz; Bluetooth için bir Bluetooth adaptörü gerekir.'
        } elseif ($sebep -match 'No supported Bluetooth protocol stack|radio|radyo|not available|kullanılamıyor|10050|10051') {
            Write-Warning 'Bluetooth KAPALI. Windows > Ayarlar > Bluetooth ve cihazlar > Bluetooth''u açın, sonra bu pencereyi kapatıp yardımcıyı yeniden başlatın. Wi‑Fi bu arada çalışır.'
        } elseif ($sebep) {
            Write-Warning "Bluetooth alıcısı açılamadı: $sebep"
            Write-Host 'Wi‑Fi çalışır. Bluetooth için: Bluetooth açık mı, başka bir Not Bahçesi yardımcısı penceresi açık mı? Kapatıp bunu yeniden başlatın.' -ForegroundColor Yellow
        } else {
            Write-Warning 'Bluetooth alıcısı zamanında hazır olmadı. Wi‑Fi çalışır; Bluetooth için yardımcıyı kapatıp yeniden açın.'
        }
    }
    else { Write-Host 'Bluetooth için Windows > Diğer Bluetooth ayarları > COM Bağlantı Noktaları > Ekle > Gelen seçin; ardından yardımcıyı yeniden açın.' }
    if ($TestMode) { Write-Warning 'TestMode: gelen metin gerçek panoya yazılmaz.' }
    Write-Host 'Yalnız güvenilen Özel ağda kullanın. Kapatmak için Ctrl+C.'
    while ($true) {
        try { $client = $listener.AcceptTcpClient() }
        catch { Start-Sleep -Milliseconds 200; continue }
        try { Handle-Client $client $secret ([bool]$TestMode) } catch { try { $client.Close() } catch { } }
    }
} finally {
    $listener.Stop()
    if ($serialJob) { Stop-Job $serialJob -ErrorAction SilentlyContinue; Remove-Job $serialJob -Force -ErrorAction SilentlyContinue }
}

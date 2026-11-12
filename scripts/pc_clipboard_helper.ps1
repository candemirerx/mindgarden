param(
    [ValidateRange(1024, 65535)][int]$Port = 8765,
    [ValidateRange(0, 65535)][int]$CompatibilityPort = 0,
    [switch]$LoopbackOnly,
    [switch]$TestMode,
    [switch]$NoClipboardRead,
    [string]$BluetoothPort = 'auto',
    [switch]$SerialOnly,
    [switch]$RfcommOnly,
    [switch]$CardOnly,
    [switch]$NoCard,
    [switch]$NoBluetooth,
    [ValidatePattern('^(COM[0-9]+)?$')][string]$CardPort = '',
    [switch]$CardTrace,
    # Eski "adres|anahtar" satırını pencerede göster (eşleştirme kodu olmadan kurulum için).
    [switch]$ElleSatir
)

function ConvertTo-ClipboardBluetoothReply([string]$action, $reply) {
    if ($action -in @('clipboard-open','clipboard-chunk','clipboard-close')) {
        $json=$reply | ConvertTo-Json -Compress -Depth 4
        if ([Text.Encoding]::UTF8.GetByteCount($json) -gt 6000) { throw 'Bluetooth clipboard reply too large' }
        return $json
    }
    return (@{ ok=($reply.ok -eq $true) } | ConvertTo-Json -Compress)
}

# Windows PowerShell 5.1 ve .NET ile çalışır; Python veya ek paket gerekmez.
# Yalnız güvenilen Özel ağlarda kullanın. Telefonun Ayarlar bölümüne aşağıda
# gösterilen IPv4 adresini ve anahtarı girin. Ctrl+C ile kapatın.
$ErrorActionPreference = 'Stop'
$script:helperVersion = '2.7.4'
$script:helperApp = 'not-bahcesi-clipboard'
# İnternetten indirilen zip'ten çıkan dosyalar "internetten geldi" işareti taşır;
# .NET işaretli DLL'i yüklemez (0x80131515) ve Bluetooth dinleyicisi açılmaz.
# Yardımcı kendi klasöründeki işaretleri kaldırır (yönetici izni gerekmez).
$script:workerMode = [bool]($CardOnly -or $RfcommOnly -or $SerialOnly)
if (-not $script:workerMode) { Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue }
# Kart USB, Bluetooth ve loopback çağrıları: .NET'in "Expect: 100-continue" beklemesi
# (her istekte ~350 ms) ve vekil sunucu (WPAD) araması kapatılır. Kartın pano köprüsü
# büyük fotoğrafı yüzlerce parçada gönderdiği için bu bekleme dakikalar ediyordu.
[System.Net.ServicePointManager]::Expect100Continue = $false
[System.Net.ServicePointManager]::UseNagleAlgorithm = $false
try { [System.Net.WebRequest]::DefaultWebProxy = $null } catch { }
# Derlenmiş C# bileşenleri kullanıcı klasöründe önbelleğe alınır. Her açılışta ve her
# alt süreçte (kart, Bluetooth) csc ile yeniden derlemek açılışı saniyelerce uzatıyordu.
# Kaynak değişince özet değişir ve bileşen yeniden derlenir. Hata olursa eski yol kullanılır.
function Import-CepType([string]$Name, [string[]]$References = @()) {
    $source = Join-Path $PSScriptRoot $Name
    try {
        $cache = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'CepKopru\tip-onbellek'
        New-Item -ItemType Directory -Path $cache -Force | Out-Null
        $files = @($References | Where-Object { [System.IO.Path]::IsPathRooted($_) })
        $buffer = New-Object System.IO.MemoryStream
        foreach ($path in @($source) + $files) { $bytes = [System.IO.File]::ReadAllBytes($path); $buffer.Write($bytes, 0, $bytes.Length) }
        $extra = [System.Text.Encoding]::UTF8.GetBytes((($References | ForEach-Object { [System.IO.Path]::GetFileName($_) }) -join '|') + '|' + [Environment]::Version + '|' + [IntPtr]::Size)
        $buffer.Write($extra, 0, $extra.Length)
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try { $hash = -join ($sha.ComputeHash($buffer.ToArray())[0..7] | ForEach-Object { $_.ToString('x2') }) } finally { $sha.Dispose() }
        $dll = Join-Path $cache ('{0}-{1}.dll' -f [System.IO.Path]::GetFileNameWithoutExtension($Name), $hash)
        foreach ($path in $files) {
            $copy = Join-Path $cache ([System.IO.Path]::GetFileName($path))
            if (-not (Test-Path -LiteralPath $copy)) { Copy-Item -LiteralPath $path -Destination $copy -ErrorAction SilentlyContinue }
        }
        if (-not (Test-Path -LiteralPath $dll)) {
            $temp = Join-Path $cache ('{0}.{1}.tmp.dll' -f [System.IO.Path]::GetFileNameWithoutExtension($dll), $PID)
            $compile = @{ Path = $source; OutputAssembly = $temp; OutputType = 'Library' }
            if ($References.Count -gt 0) { $compile.ReferencedAssemblies = $References }
            Add-Type @compile
            try { Move-Item -LiteralPath $temp -Destination $dll -ErrorAction Stop } catch { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
        }
        Add-Type -Path $dll
    } catch {
        $direct = @{ Path = $source }
        if ($References.Count -gt 0) { $direct.ReferencedAssemblies = $References }
        Add-Type @direct
    }
}
$script:mouseCaptureReady = $false
$script:pcKeyboardReady = $false
$script:pcAudioReady = $false
$script:pcMicReady = $false
if (-not $script:workerMode) {
    Import-CepType 'HttpIngress.cs'
    Import-CepType 'RemoteInput.cs'
    try { Import-CepType 'MousePositionCapture.cs' @('System.dll','System.Core.dll','System.Windows.Forms.dll','System.Web.Extensions.dll'); $script:mouseCaptureReady = $true } catch { }
    try { Import-CepType 'PcKeyboard.cs' @('System.dll','System.Core.dll','System.Windows.Forms.dll','System.Web.Extensions.dll'); $script:pcKeyboardReady = $true } catch { }
    # Bilgisayar sesini telefona aktarma (WASAPI). Derlenemezse diğer özellikler çalışmaya devam eder.
    try { Import-CepType 'PcAudio.cs'; $script:pcAudioReady = $true } catch { }
    try { Import-CepType 'PcMic.cs'; $script:pcMicReady = $true } catch { }
}
$tokenFile = if ($script:helperApp -eq 'not-bahcesi-clipboard') { '.pc_clipboard_token' } else { '.cep_kopru_token' }
$tokenPath = Join-Path $PSScriptRoot $tokenFile
# Kalıcı anahtar kullanıcı profilinde durur: paket yeniden açılınca ya da başka klasöre
# kopyalanınca anahtar değişmez, telefonun eşleşmesi bozulmaz.
$tokenProfile = if ($script:helperApp -eq 'not-bahcesi-clipboard') { 'NotBahcesi' } else { 'CepKopru' }
$stableTokenDir = Join-Path $env:APPDATA $tokenProfile
$stableTokenPath = Join-Path $stableTokenDir 'token'
try {
    $stableToken = if (Test-Path -LiteralPath $stableTokenPath) { [System.IO.File]::ReadAllText($stableTokenPath, [System.Text.Encoding]::ASCII).Trim() } else { '' }
    if ($stableToken.Length -ge 32) {
        $localToken = if (Test-Path -LiteralPath $tokenPath) { [System.IO.File]::ReadAllText($tokenPath, [System.Text.Encoding]::ASCII).Trim() } else { '' }
        if ($localToken -ne $stableToken) { [System.IO.File]::WriteAllText($tokenPath, $stableToken, [System.Text.Encoding]::ASCII) }
    } elseif (Test-Path -LiteralPath $tokenPath) {
        [void][System.IO.Directory]::CreateDirectory($stableTokenDir)
        Copy-Item -LiteralPath $tokenPath -Destination $stableTokenPath -Force
    }
} catch { Write-Warning ('Kalıcı anahtar kullanılamadı: ' + $_.Exception.Message) }
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
if (-not (Test-Path -LiteralPath $stableTokenPath)) {
    try { [void][System.IO.Directory]::CreateDirectory($stableTokenDir); [System.IO.File]::WriteAllText($stableTokenPath, $secret, [System.Text.Encoding]::ASCII) } catch { }
}

if ($CardOnly) {
    Import-CepType 'UsbInternetRelay.cs' @('System.dll','System.Core.dll','System.Web.Extensions.dll')
    # One listener per verified card: a connected first card must not prevent
    # the LCD/second card from reaching the PC clipboard and window actions.
    if (-not $CardPort) {
        $supervisorLease=[System.Threading.Mutex]::new($false,'Local\CepKopruUsbSupervisor')
        $supervisorHeld=$false
        try { $supervisorHeld=$supervisorLease.WaitOne(0) }
        catch [System.Threading.AbandonedMutexException] { $supervisorHeld=$true }
        if(-not $supervisorHeld) { $supervisorLease.Dispose(); Write-Output 'USB supervisor already running'; return }
        $cardWorkers=@{}
        $cardAbsentSince=@{}
        try {
            while ($true) {
                $devices=@([UsbInternetRelay]::CardPorts())
                foreach($known in @($cardWorkers.Keys)) {
                    if($devices -contains $known) { $cardAbsentSince.Remove($known); continue }
                    if(-not $cardAbsentSince.ContainsKey($known)) { $cardAbsentSince[$known]=[DateTime]::UtcNow; continue }
                    if(([DateTime]::UtcNow-$cardAbsentSince[$known]).TotalSeconds -lt 10) { continue }
                    $worker=$cardWorkers[$known]
                    if(-not $worker.HasExited) { $worker.Kill();$worker.WaitForExit() }
                    $worker.Dispose();$cardWorkers.Remove($known);$cardAbsentSince.Remove($known)
                }
                foreach($name in $devices) {
                    if($cardWorkers.ContainsKey($name) -and -not $cardWorkers[$name].HasExited) { continue }
                    if($cardWorkers.ContainsKey($name)) { $cardWorkers[$name].Dispose();$cardWorkers.Remove($name) }
                    $probeLease=[System.Threading.Mutex]::new($false,('Local\CepKopruUsb_'+$name))
                    $portFree=$false
                    try { $portFree=$probeLease.WaitOne(0) }
                    catch [System.Threading.AbandonedMutexException] { $portFree=$true }
                    if($portFree) { $probeLease.ReleaseMutex() }
                    $probeLease.Dispose()
                    if(-not $portFree) { continue }
                    $arguments=@('-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',('"'+$PSCommandPath+'"'),'-Port',[string]$Port,'-CardOnly','-CardPort',$name)
                    if($CardTrace) { $arguments+='-CardTrace' }
                    $usbLogDir=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'KablosuzBellekUsbInternet/logs'
                    New-Item -ItemType Directory -Path $usbLogDir -Force | Out-Null
                    $cardWorkers[$name]=Start-Process powershell.exe -WindowStyle Hidden -PassThru -ArgumentList $arguments -RedirectStandardOutput (Join-Path $usbLogDir ($name+'-out.log')) -RedirectStandardError (Join-Path $usbLogDir ($name+'-err.log'))
                }
                Start-Sleep -Seconds 2
            }
        } finally {
            foreach($worker in $cardWorkers.Values) { if(-not $worker.HasExited) { $worker.Kill();$worker.WaitForExit() };$worker.Dispose() }
            $supervisorLease.ReleaseMutex();$supervisorLease.Dispose()
        }
    }
    # Retain ownership across USB re-enumeration. A second tray/manual worker
    # waits instead of taking this port during a firmware restart.
    $cardLease = [System.Threading.Mutex]::new($false, ('Local\CepKopruUsb_' + $CardPort))
    $cardHeld=$false
    try { $cardHeld=$cardLease.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $cardHeld=$true }
    if(-not $cardHeld) { $cardLease.Dispose();Write-Output ('USB worker already running: '+$CardPort);return }
    try {
    # Only this application's USB CDC identity; never open unrelated serial devices.
    while ($true) {
        $ports = @([UsbInternetRelay]::CardPorts() | Where-Object { $_ -eq $CardPort })
        foreach ($cardDevicePort in $ports) {
            $serial = $null
            $internetRelay = [UsbInternetRelay]::new()
            try {
                $serial = [System.IO.Ports.SerialPort]::new($cardDevicePort,115200)
                $serial.Encoding = [System.Text.UTF8Encoding]::new($false,$true)
                $serial.NewLine = "`n"; $serial.ReadTimeout=1000; $serial.WriteTimeout=3000
                $serial.ReadBufferSize=65536; $serial.WriteBufferSize=65536
                $serial.DtrEnable=$true; $serial.RtsEnable=$true; $serial.Open()
                # Refresh CDC line state after a firmware restart/re-enumeration.
                $serial.DtrEnable=$false; Start-Sleep -Milliseconds 50; $serial.DtrEnable=$true
                Write-Output ('CardReady:'+$cardDevicePort)
                while ($true) {
                    # NBI3/NBI4 binary batches are read, relayed and answered
                    # entirely in compiled code. Text/clipboard frames retain
                    # their existing PowerShell route, including older cards.
                    try { $line=$internetRelay.ReadFrame($serial) } catch [System.TimeoutException] { continue }
                    if ($line.StartsWith('NBI1:')) {
                        try {
                            $internetReply=$internetRelay.HandleWireFrame($line)
                            if ($null -ne $internetReply) { $serial.WriteLine($internetReply) }
                        } catch { }
                        continue
                    }
                    if($CardTrace -and $line.Contains('NBPANO')) { Write-Output ('CardFrame:length='+$line.Length+' null='+($line.IndexOf([char]0) -ge 0)+' clean='+$line.StartsWith('NBPANO')) }
                    $frameMatch=[regex]::Match($line,'^NBPANO([12]):([0-9]{1,10}):([A-Za-z0-9+/=]+)$')
                    if (-not $frameMatch.Success) { continue }
                    $version=$frameMatch.Groups[1].Value; $id=$frameMatch.Groups[2].Value; $encoded=$frameMatch.Groups[3].Value
                    if($CardTrace) { Write-Output ('CardParse:version='+$version+' encodedLength='+$encoded.Length) }
                    try {
                        $utf8=[System.Text.UTF8Encoding]::new($false,$true)
                        if($encoded.Length -gt 1400000) { throw 'Payload too large' }
                        $bytes=[Convert]::FromBase64String($encoded)
                        $headers=@{ Authorization='Bearer '+$secret }
                        if($version -eq '1') {
                            $reply=Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/clipboard" -Headers $headers -ContentType 'text/plain; charset=utf-8' -Body $bytes -TimeoutSec 3
                        } else {
                            if($bytes.Length -gt 24000) { throw 'Payload too large' }
                            $command=$utf8.GetString($bytes) | ConvertFrom-Json
                            if($CardTrace) { Write-Output ('CardRequest:'+[string]$command.action+':'+$bytes.Length) }
                            if([string]$command.action -notin @('ping','parca','gorseller','dosyalar','clipboard','panometni','window','keyboard-config','keyboard-poll','keyboard-stop','pc-token','clipboard-open','clipboard-chunk','clipboard-close')) { throw 'Unsupported card action' }
                            if($command.action -in @('gorseller','dosyalar') -and $command.hedef -notin @('pano','indirilenler','yazdir')) { throw 'Unsupported destination' }
                            if([string]$command.action -eq 'pc-token') {
                                # Kart USB ile bu bilgisayara takılı ve telefon karta Bluetooth ile bağlı:
                                # USB/Wi-Fi/Tailscale (ses dahil) için anahtar kod girmeden telefona verilir.
                                $ips=@([System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
                                    Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
                                    ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
                                    Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } |
                                    ForEach-Object { $_.Address.ToString() } |
                                    Where-Object { $_ -notlike '127.*' -and $_ -notlike '169.254.*' } | Select-Object -First 8)
                                $tokenReply=@{ ok=$true; token=$secret; name=$env:COMPUTERNAME; port=$Port; addresses=$ips } | ConvertTo-Json -Compress
                                $serial.WriteLine('NBPANODATA:'+$id+':'+[Convert]::ToBase64String($utf8.GetBytes($tokenReply)))
                                continue
                            }
                            if([string]$command.action -in @('keyboard-poll','clipboard-open','clipboard-chunk','clipboard-close')) {
                                # Bilgisayar klavyesi atamaları (kart 2.64.0+): yalnız atanmış tuşların
                                # olayları karta "NBPANODATA:<kimlik>:<base64 JSON>" satırıyla döner.
                                $raw=Invoke-WebRequest -UseBasicParsing -Method Post -Uri "http://127.0.0.1:$Port/input" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec $(if($command.action -eq 'keyboard-poll'){2}else{8})
                                $content=[string]$raw.Content
                                # Carry policy errors back as JSON too, without any clipboard content.
                                if($command.action -eq 'keyboard-poll' -and ($content | ConvertFrom-Json).ok -ne $true) { throw 'Rejected' }
                                $data=[Convert]::ToBase64String($utf8.GetBytes($content))
                                if($data.Length -gt 6000) { throw 'Reply too large' }
                                $serial.WriteLine('NBPANODATA:'+$id+':'+$data)
                                continue
                            }
                            $reply=Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/input" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec $(if([string]$command.action -in @('gorseller','dosyalar','window')){18}else{8})
                        }
                        if($reply.ok -ne $true) { throw 'Rejected' }
                        if($CardTrace) { Write-Output ('CardAccepted:'+$id) }
                        $serial.WriteLine('NBPANOOK:'+$id)
                    } catch { Write-Output ('CardError:'+ $_.Exception.GetType().Name);$serial.WriteLine('NBPANOERR:'+$id) }
                }
            } catch { $innerEx=$_.Exception; while($innerEx.InnerException){$innerEx=$innerEx.InnerException}; Write-Output ('CardReconnect:'+$cardDevicePort+':'+$_.Exception.GetType().Name+':'+$innerEx.GetType().Name+':'+$innerEx.Message) } finally { $internetRelay.Dispose(); if($serial) { $serial.Dispose() } }
        }
        Start-Sleep -Seconds 2
    }
    } finally { $cardLease.ReleaseMutex(); $cardLease.Dispose() }
}

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
        $bluetooth.ServiceName = 'Cep Kopru PC'
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
                        $writer.WriteLine((ConvertTo-ClipboardBluetoothReply ([string]$command.action) $reply))
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
                $serial.WriteLine((ConvertTo-ClipboardBluetoothReply ([string]$command.action) $reply))
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

# Authenticated PC -> phone snapshots. Never read or return file-drop paths.
# Revisions include a per-process epoch, so a restarted helper cannot look unchanged.
$script:clipboardEpoch = [Guid]::NewGuid().ToString('N')
$script:clipboardSnapshots = @{}
function Invoke-ClipboardReadCommand($command, [bool]$dryRun) {
    # Fail closed before capture AND before serving cached chunks, including direct /input requests.
    if ($NoClipboardRead) { return @{ ok=$false; blocked=$true; msg='Isyeri Polnet modunda PC panosu okuma ve esitleme kapali.' } }
    foreach ($key in @($script:clipboardSnapshots.Keys)) {
        if ($script:clipboardSnapshots[$key].expires -lt [DateTime]::UtcNow) { $script:clipboardSnapshots.Remove($key) }
    }
    switch ([string]$command.action) {
        'clipboard-open' {
            $snapshot = if ($dryRun) { @{ ok=$true; revision='test'; kind='unsupported' } }
                else { Get-PhoneClipboardSnapshot ([string]$command.after) }
            if ($snapshot.unchanged -or $snapshot.kind -eq 'unsupported') { return $snapshot }
            $bytes = if ($snapshot.kind -eq 'text') { [Text.Encoding]::UTF8.GetBytes($snapshot.text) }
                else { [Convert]::FromBase64String($snapshot.data) }
            while ($script:clipboardSnapshots.Count -ge 2) {
                $oldest = @($script:clipboardSnapshots.Keys | Sort-Object { $script:clipboardSnapshots[$_].expires })[0]
                $script:clipboardSnapshots.Remove($oldest)
            }
            $id = [Guid]::NewGuid().ToString('N')
            $hash = [Security.Cryptography.SHA256]::Create()
            try { $digest = [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-','').ToLowerInvariant() }
            finally { $hash.Dispose() }
            $script:clipboardSnapshots[$id] = @{ bytes=$bytes; expires=[DateTime]::UtcNow.AddMinutes(2) }
            return @{ ok=$true; revision=$snapshot.revision; kind=$snapshot.kind; id=$id; size=$bytes.Length; sha256=$digest }
        }
        'clipboard-chunk' {
            $id = [string]$command.id
            if ($id -notmatch '^[a-f0-9]{32}$' -or -not $script:clipboardSnapshots.ContainsKey($id)) { throw 'Snapshot expired' }
            $bytes = $script:clipboardSnapshots[$id].bytes
            if ($command.offset -isnot [int] -and $command.offset -isnot [long]) { throw 'Invalid clipboard offset' }
            $offset = [long]$command.offset
            if ($offset -lt 0 -or $offset -ge $bytes.Length -or $offset % 2048 -ne 0) { throw 'Invalid clipboard offset' }
            $count = [Math]::Min(2048, $bytes.Length - $offset)
            $script:clipboardSnapshots[$id].expires = [DateTime]::UtcNow.AddMinutes(2)
            return @{ ok=$true; id=$id; offset=$offset; data=[Convert]::ToBase64String($bytes, [int]$offset, [int]$count) }
        }
        'clipboard-close' { $script:clipboardSnapshots.Remove([string]$command.id); return @{ ok=$true } }
        'clipboard-read' {
            if ($dryRun) { return @{ ok=$true; revision='test'; kind='unsupported' } }
            return Get-PhoneClipboardSnapshot ([string]$command.after)
        }
        default { throw 'Invalid clipboard read command' }
    }
}
function Get-PhoneClipboardSnapshot([string]$after) {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $sequence = [RemoteInput]::GetClipboardSequenceNumber()
    $revision = $script:clipboardEpoch + ':' + $sequence
    if ($after -eq $revision) { return @{ ok=$true; revision=$revision; unchanged=$true } }
    $result = @{ ok=$true; revision=$revision; kind='unsupported' }
    if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
        $image = [System.Windows.Forms.Clipboard]::GetImage()
        $memory = [IO.MemoryStream]::new()
        try {
            if ($null -eq $image -or ([long]$image.Width * $image.Height) -gt 24000000) { throw 'Clipboard image too large' }
            $image.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
            if ($memory.Length -gt 8MB) { throw 'Clipboard image too large' }
            $result.kind='image'; $result.data=[Convert]::ToBase64String($memory.ToArray())
        } finally { $memory.Dispose(); if ($image) { $image.Dispose() } }
    } elseif ([System.Windows.Forms.Clipboard]::ContainsText()) {
        $text = [System.Windows.Forms.Clipboard]::GetText()
        if ([Text.Encoding]::UTF8.GetByteCount($text) -gt 1MB) { throw 'Clipboard text too large' }
        if ($text.Length -gt 0) { $result.kind='text'; $result.text=$text }
    }
    # Clipboard changed during capture: retry on the next request, never label stale data as current.
    if ([RemoteInput]::GetClipboardSequenceNumber() -ne $sequence) { throw 'Clipboard changed during read' }
    return $result
}

# ---- Görsel aktarımı ---------------------------------------------------
# Telefon mini galerisinden gelen görseller (ve metin kartları) parça parça
# gelir: Bluetooth satırı 32 KB ile sınırlı, Wi‑Fi'de de tek istek kısa tutulur.
# Parçalar kimliğe göre birleştirilir; "gorseller" eylemi bunları ya Resimler ›
# Cep Köprü klasörüne kaydeder ya da panoya koyar (tek görselde resim olarak
# da, Ctrl+V her yerde çalışsın; birden çoksa dosya listesi olarak).
$script:parcalar = @{}
$script:parcaZamani = @{}
$script:parcaToplam = 0
function Add-Parca([string]$id, [int]$sira, [string]$veri) {
    if ($id -notmatch '^[A-Za-z0-9-]{8,48}$') { throw 'Parça kimliği geçersiz.' }
    # Yarım kalmış eski aktarımlar 5 dakika sonra atılır.
    foreach ($eski in @($script:parcaZamani.Keys)) {
        if (((Get-Date) - $script:parcaZamani[$eski]).TotalMinutes -gt 5) {
            $script:parcaToplam -= $script:parcalar[$eski].Length
            $script:parcalar[$eski].Dispose(); $script:parcalar.Remove($eski); $script:parcaZamani.Remove($eski)
        }
    }
    $bytes = [Convert]::FromBase64String($veri)
    if ($sira -eq 0) {
        if ($script:parcalar.ContainsKey($id)) { $script:parcaToplam -= $script:parcalar[$id].Length; $script:parcalar[$id].Dispose() }
        if ($script:parcalar.Count -ge 60) { throw 'Çok fazla bekleyen görsel.' }
        $script:parcalar[$id] = New-Object System.IO.MemoryStream
    } elseif (-not $script:parcalar.ContainsKey($id)) { throw 'Parça sırası bozuk.' }
    if ($script:parcaToplam + $bytes.Length -gt 200MB -or $script:parcalar[$id].Length + $bytes.Length -gt 40MB) { throw 'Görsel çok büyük.' }
    $script:parcalar[$id].Write($bytes, 0, $bytes.Length)
    $script:parcaToplam += $bytes.Length
    $script:parcaZamani[$id] = Get-Date
}
function Get-GuvenliAd([string]$ad, [string]$varsayilan, [bool]$dosya = $false) {
    $temiz = ($ad -replace '[\\/:*?"<>|\x00-\x1f]', '_').Trim(' .')
    if ($temiz.Length -gt 80) { $temiz = $temiz.Substring($temiz.Length - 80) }
    if ((-not $dosya -and $temiz -notmatch '\.(jpe?g|png|webp|gif|txt)$') -or
        -not $temiz -or $temiz -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') { $temiz = $varsayilan }
    return $temiz
}
function Save-Gorseller($ids, $adlar, [string]$klasor, [bool]$dosya = $false) {
    if (-not (Test-Path -LiteralPath $klasor)) { New-Item -ItemType Directory -Path $klasor -Force | Out-Null }
    $yollar = @()
    for ($i = 0; $i -lt $ids.Count; $i++) {
        $id = [string]$ids[$i]
        if (-not $script:parcalar.ContainsKey($id)) { throw 'Görsel eksik geldi.' }
        $ad = Get-GuvenliAd ([string]$adlar[$i]) ('cep-kopru-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + ($i + 1) + $(if($dosya){'.bin'}else{'.jpg'})) $dosya
        $yol = Join-Path $klasor $ad
        $taban = [System.IO.Path]::GetFileNameWithoutExtension($ad); $uzanti = [System.IO.Path]::GetExtension($ad)
        for ($n = 2; Test-Path -LiteralPath $yol; $n++) { $yol = Join-Path $klasor ('{0} ({1}){2}' -f $taban, $n, $uzanti) }
        [System.IO.File]::WriteAllBytes($yol, $script:parcalar[$id].ToArray())
        $yollar += $yol
    }
    foreach ($id in $ids) {
        $id = [string]$id
        if ($script:parcalar.ContainsKey($id)) { $script:parcaToplam -= $script:parcalar[$id].Length; $script:parcalar[$id].Dispose(); $script:parcalar.Remove($id); $script:parcaZamani.Remove($id) }
    }
    return ,$yollar
}
function Get-YazdirmaKlasoru {
    $klasor = Join-Path $env:TEMP 'CepKopru-yazdir'
    # Yazdirilan dosyalar is bitince silinir; yarida kalanlar bir gun sonra temizlenir.
    if (Test-Path -LiteralPath $klasor) { Get-ChildItem -LiteralPath $klasor -File | Where-Object { $_.Name -ne 'sonuc.log' -and $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | Remove-Item -Force -ErrorAction SilentlyContinue }
    return $klasor
}
# Yazdirma ayri, gizli bir PowerShell surecinde calisir: Office yavas acilsa da telefonun istegi beklemez.
function Start-Yazdirma([string[]]$yollar, [int]$kopya, [bool]$ciftYuz) {
    $betik = Join-Path $PSScriptRoot 'yazdir.ps1'
    if (-not (Test-Path -LiteralPath $betik)) { throw 'Yazdırma bileşeni (yazdir.ps1) bulunamadı; PC yardımcısını güncelleyin.' }
    $is = Join-Path (Get-YazdirmaKlasoru) ('is-' + [guid]::NewGuid().ToString('N') + '.json')
    (@{ files = @($yollar); copies = $kopya; duplex = $ciftYuz; delete = $true } | ConvertTo-Json -Compress) | Set-Content -LiteralPath $is -Encoding UTF8
    Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $betik + '"'), '-JobFile', ('"' + $is + '"')) | Out-Null
    Write-Host ('{0} dosya yazıcıya gönderiliyor ({1} kopya{2}).' -f $yollar.Count, $kopya, $(if ($ciftYuz) { ', çift yüz' } else { '' })) -ForegroundColor Green
}
function Get-IndirilenlerKlasoru {
    $key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'
    $value=(Get-ItemProperty -LiteralPath $key -Name '{374DE290-123F-4565-9164-39C4925E467B}' -ErrorAction SilentlyContinue).'{374DE290-123F-4565-9164-39C4925E467B}'
    if($value) {return [Environment]::ExpandEnvironmentVariables([string]$value)}
    return Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'
}
function Set-ClipboardDosyalar([string[]]$yollar) {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $liste = New-Object System.Collections.Specialized.StringCollection
    foreach ($y in $yollar) { [void]$liste.Add($y) }
    $veri = New-Object System.Windows.Forms.DataObject
    $veri.SetFileDropList($liste)
    $resim = $null
    $gorseller = @($yollar | Where-Object { $_ -match '\.(jpe?g|png|webp|gif)$' })
    if ($yollar.Count -eq 1 -and $gorseller.Count -eq 1) {
        # Tek görsel: Word, WhatsApp, Paint gibi uygulamalar resim olarak yapıştırsın.
        try {
            $ham = [System.IO.File]::ReadAllBytes($gorseller[0])
            $resim = [System.Drawing.Image]::FromStream((New-Object System.IO.MemoryStream(,$ham)))
            $veri.SetImage($resim)
            # PNG kaynağı olduğu gibi eklenir. JPEG fotoğrafı yeniden PNG'ye kodlamak
            # 12 MP'de saniyeler sürüyor ve kartın onay süresini aşıyordu.
            if ($gorseller[0] -match '\.png$') { $veri.SetData('PNG', (New-Object System.IO.MemoryStream(,$ham))) }
        } catch { }
    }
    try {
        for ($deneme = 1; ; $deneme++) {
            try { [System.Windows.Forms.Clipboard]::SetDataObject($veri, $true); return }
            catch { if ($deneme -ge 15) { throw }; Start-Sleep -Milliseconds (40 * $deneme) }
        }
    } finally { if ($resim) { $resim.Dispose() } }
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
$script:pairApprovalReady = $false
try {
    Import-CepType 'PairApproval.cs' @('System.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll')
    $script:pairApprovalReady = $true
} catch { Write-Warning 'Telefon onay penceresi yüklenemedi; kodla eşleştirme kullanılabilir.' }
$script:pairFails = 0
$script:pairTotalFails = 0
function Show-PairPin {
    Write-Host ''
    Write-Host ('   ╔══════════════════════════════╗') -ForegroundColor Yellow
    Write-Host ('   ║  EŞLEŞTİRME KODU:  {0} {1}  ║' -f $script:pairPin.Substring(0, 3), $script:pairPin.Substring(3)) -ForegroundColor Yellow
    Write-Host ('   ╚══════════════════════════════╝') -ForegroundColor Yellow
    Write-Host '   Telefonda Bağlantı isteği gönder seçin; bilgisayarda İzin ver düğmesine basın.'
    Write-Host '   Yukarıdaki kod eski uygulamalar için alternatif olarak kullanılabilir.'
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

function Skip-RejectedBody($stream, [int]$length) {
    # Ingress has already staged at most 1 MiB. Consume rejected payloads so
    # closing the Windows socket does not reset TCP and discard the response.
    if ($length -lt 1 -or $length -gt 1048576) { return }
    $buffer = New-Object byte[] 4096
    while ($length -gt 0) {
        $count = $stream.Read($buffer, 0, [Math]::Min($buffer.Length, $length))
        if ($count -le 0) { return }
        $length -= $count
    }
}

function Handle-Client($client, [string]$expectedToken, [bool]$dryRun) {
    # HttpIngress hands off complete requests only; a slow/incomplete client
    # waits outside the command executor and cannot stall mouse input.
    $client.ReceiveTimeout = 1500
    $client.SendTimeout = 3000
    $stream = $client.GetStream()
    $handedOff = $false
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
            Send-Response $stream 200 (@{ ok = $true; app = $script:helperApp; compatibleApps = @('cep-kopru-pc','not-bahcesi-clipboard'); ports = @($script:listenPorts); name = $env:COMPUTERNAME; helperVersion = $script:helperVersion; clipboardReadBlocked = [bool]$NoClipboardRead; pair = $true; pairApproval = $script:pairApprovalReady; pairUi = $(if ($script:pairApprovalReady) { [PairApproval]::UiState } else { 'unavailable' }); pairUiError = $(if ($script:pairApprovalReady) { [PairApproval]::UiError } else { '' }); lanAccess = (-not [bool]$LoopbackOnly) } | ConvertTo-Json -Compress); return
        }
        if ($parts[0] -eq 'POST' -and @('/pair-request', '/pair-status') -contains $parts[1]) {
            if (-not $script:pairApprovalReady) { Send-Response $stream 503 '{"ok":false,"error":"Onay penceresi kullanılamıyor; kodla eşleştirin."}'; return }
            if ($length -lt 1 -or $length -gt 512) { Skip-RejectedBody $stream $length; Send-Response $stream 400 '{"ok":false}'; return }
            $body = New-Object byte[] $length
            $offset = 0
            while ($offset -lt $length) { $n = $stream.Read($body, $offset, $length - $offset); if ($n -le 0) { throw 'Eksik istek.' }; $offset += $n }
            $request = [Text.Encoding]::UTF8.GetString($body) | ConvertFrom-Json
            if ($parts[1] -eq '/pair-request') {
                $id = [PairApproval]::Begin([string]$request.device, [string]$client.Client.RemoteEndPoint.Address)
                if (-not $id) { Send-Response $stream 200 '{"ok":false,"error":"Başka bir istek bekliyor veya çok sık denendi. Biraz sonra tekrar deneyin."}'; return }
                Send-Response $stream 200 (@{ ok = $true; requestId = $id } | ConvertTo-Json -Compress)
            } else {
                $state = [PairApproval]::Poll([string]$request.requestId)
                $reply = @{ ok = $true; state = $state }
                if ($state -eq 'approved') { $reply.token = $expectedToken; $reply.name = $env:COMPUTERNAME }
                Send-Response $stream 200 ($reply | ConvertTo-Json -Compress)
            }
            return
        }
        if ($parts[0] -eq 'POST' -and $parts[1] -eq '/pair') {
            if ($length -lt 1 -or $length -gt 256) { Skip-RejectedBody $stream $length; Send-Response $stream 400 '{"ok":false}'; return }
            $pairBody = New-Object byte[] $length
            $okunan = 0
            while ($okunan -lt $length) { $n = $stream.Read($pairBody, $okunan, $length - $okunan); if ($n -le 0) { throw 'HTTP gövdesi eksik.' }; $okunan += $n }
            $pin = [string](([System.Text.Encoding]::UTF8.GetString($pairBody) | ConvertFrom-Json).pin)
            $cevap = Test-PairPin $pin $expectedToken
            Send-Response $stream ($(if ($cevap -like '{"ok":true*' -or $cevap -like '*"ok":true*') { 200 } else { 403 })) $cevap; return
        }
        if (-not (Same-Token $authorization "Bearer $expectedToken")) { Send-Response $stream 401 '{"ok":false,"error":"Anahtar yanlış"}'; return }
        if ($parts[0] -eq 'GET' -and $parts[1] -eq '/health') { Send-Response $stream 200 (@{ ok = $true; app = $script:helperApp; compatibleApps = @('cep-kopru-pc','not-bahcesi-clipboard'); ports = @($script:listenPorts); surum = 9; helperVersion = $script:helperVersion; fileTransfer = $true; clipboardRead = (-not [bool]$NoClipboardRead); clipboardReadBlocked = [bool]$NoClipboardRead; clipboardChunks = (-not [bool]$NoClipboardRead); clipboardFiles = $true; clipboardDownloads = $true; usbInternet = $true; phoneStorage = $script:phoneDriveReady; pcAudio = $script:pcAudioReady; phoneMic = $script:pcMicReady; phoneMicStreaming = $(if ($script:pcMicReady) { [PcMic]::Streaming } else { $false }); phoneMicDevice = $(if ($script:pcMicReady) { [PcMic]::Device } else { '' }); cardClipboard = $true; windowActions = $true; printing = (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'yazdir.ps1')); screenWidth = [RemoteInput]::DesktopWidth; screenHeight = [RemoteInput]::DesktopHeight } | ConvertTo-Json -Compress); return }
        # Ses akışı uzun sürer: bağlantı ayrı bir iş parçacığına devredilir, sunucu beklemez.
        if ($parts[0] -eq 'GET' -and $parts[1] -eq '/audio') {
            if (-not $script:pcAudioReady) { Send-Response $stream 503 '{"ok":false,"error":"PC ses bileşeni açılamadı."}'; return }
            [PcAudio]::Serve($client); $handedOff = $true; return
        }
        # Telefon mikrofonu: uzun suren akis, baglanti ayri is parcacigina devredilir.
        if ($parts[0] -eq 'POST' -and ($parts[1] -eq '/mic' -or $parts[1] -like '/mic?device=*')) {
            if (-not $script:pcMicReady) { Send-Response $stream 503 '{"ok":false,"error":"Telefon mikrofonu bileseni acilamadi."}'; return }
            $micDevice = ''
            if ($parts[1] -match '[?&]device=([^&]+)$') { $micDevice = [Uri]::UnescapeDataString($Matches[1].Replace('+', ' ')) }
            $micChunked = $header -match '(?im)^Transfer-Encoding:\s*chunked\s*$'
            [PcMic]::Serve($client, $micDevice, $micChunked); $handedOff = $true; return
        }
        if ($parts[0] -eq 'POST' -and $parts[1] -eq '/mic-stop') {
            if ($script:pcMicReady) { [PcMic]::StopAll() }
            Send-Response $stream 200 '{"ok":true}'; return
        }
        if ($parts[0] -eq 'POST' -and $parts[1] -eq '/audio-stop') {
            if ($script:pcAudioReady) { [PcAudio]::StopAll() }
            Send-Response $stream 200 '{"ok":true}'; return
        }
        if ($parts[0] -eq 'POST' -and $parts[1] -eq '/phone-storage') {
            if (-not $script:phoneDriveReady) { Send-Response $stream 503 '{"ok":false,"error":"PC dosya paylaşım bileşeni açılamadı."}'; return }
            if ($length -lt 1 -or $length -gt 8192) { Send-Response $stream 413 '{"ok":false}'; return }
            $body = New-Object byte[] $length
            $offset = 0
            while ($offset -lt $length) { $n = $stream.Read($body, $offset, $length - $offset); if ($n -le 0) { throw 'Eksik dosya bağlantısı isteği.' }; $offset += $n }
            try {
                $config = [Text.Encoding]::UTF8.GetString($body) | ConvertFrom-Json
                switch ([string]$config.action) {
                    'connect' { $reply = [PhoneDrive]::Register([string]$config.url, [string]$config.token, [string]$config.client, [string]$config.name) }
                    'disconnect' { $reply = [PhoneDrive]::Disconnect([string]$config.client) }
                    'status' { $reply = [PhoneDrive]::Status() }
                    default { throw 'Dosya bağlantısı eylemi geçersiz.' }
                }
                Send-Response $stream 200 $reply
            } catch { Send-Response $stream 400 (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress) }
            return
        }
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
            $inputAction = $content | ConvertFrom-Json
            if ($null -eq $inputAction -or $null -eq $inputAction.action) { throw 'Eylem gerekli.' }
            # Yalnız görsel parçaları büyük olabilir; diğer komutlar kısa kalır.
            if ($length -gt 32768 -and [string]$inputAction.action -ne 'parca') { Send-Response $stream 413 '{"ok":false}'; return }
            switch ([string]$inputAction.action) {
                { $_ -in @('clipboard-read','clipboard-open','clipboard-chunk','clipboard-close') } {
                    Send-Response $stream 200 ((Invoke-ClipboardReadCommand $inputAction $dryRun) | ConvertTo-Json -Compress); return
                }
                'position-start' {
                    if (-not $script:mouseCaptureReady -or $dryRun) { throw 'Position capture unavailable; update helper.' }
                    [MousePositionCapture]::Start([string]$inputAction.session)
                }
                'position-poll' {
                    if (-not $script:mouseCaptureReady -or $dryRun) { throw 'Position capture unavailable.' }
                    Send-Response $stream 200 ([MousePositionCapture]::Poll([string]$inputAction.session)); return
                }
                'position-stop' {
                    if ($script:mouseCaptureReady) { [MousePositionCapture]::Stop([string]$inputAction.session) }
                }
                'keyboard-config' {
                    if (-not $script:pcKeyboardReady -or $dryRun) { throw 'Keyboard helper unavailable' }
                    $keyboardKeys=[int[]]@($inputAction.keys)
                    # mods: Ctrl=1 Shift=2 Alt=4 Win=8 per key (2.6.0); capture: report the next key pressed.
                    $keyboardMods=if($null -ne $inputAction.mods) { [int[]]@($inputAction.mods) } else { [int[]]::new($keyboardKeys.Length) }
                    [PcKeyboard]::Configure([string]$inputAction.session,$keyboardKeys,$keyboardMods,[bool[]]@($inputAction.longs),[bool[]]@($inputAction.instant),[int]$inputAction.threshold,[bool]$inputAction.capture)
                }
                'keyboard-poll' {
                    if (-not $script:pcKeyboardReady -or $dryRun) { throw 'Keyboard helper unavailable' }
                    Send-Response $stream 200 ([PcKeyboard]::Poll([string]$inputAction.session,[long]$inputAction.after)); return
                }
                'keyboard-stop' {
                    if ($script:pcKeyboardReady) { [PcKeyboard]::Stop([string]$inputAction.session) }
                }
                'ping' { }
                'parca' {
                    if ($inputAction.veri -isnot [string]) { throw 'Parça geçersiz.' }
                    Add-Parca ([string]$inputAction.id) ([int]$inputAction.sira) $inputAction.veri
                }
                { $_ -in @('gorseller','dosyalar') } {
                    $ids = @($inputAction.ids); $adlar = @($inputAction.adlar)
                    if ($ids.Count -lt 1 -or $ids.Count -gt 50 -or $adlar.Count -ne $ids.Count) { throw 'Görsel listesi geçersiz.' }
                    $hedef = [string]$inputAction.hedef
                    if ($hedef -notin @('dosya', 'pano', 'indirilenler', 'yazdir')) { throw 'Hedef geçersiz.' }
                    $dosya = $inputAction.action -eq 'dosyalar'
                    if ($dosya -and $hedef -notin @('pano','indirilenler','yazdir')) { throw 'Dosya aktarımı için pano, indirilenler veya yazdır hedefini kullanın.' }
                    if ($hedef -eq 'yazdir' -and -not $dosya) { throw 'Yazdırma yalnız dosya aktarımıyla yapılır.' }
                    if (-not $dryRun) {
                        if ($hedef -eq 'yazdir') {
                            $kopya = [int]$inputAction.kopya; if ($kopya -lt 1) { $kopya = 1 }
                            if ($kopya -gt 20) { throw 'Kopya sayısı 1-20 olmalı.' }
                            $yollar = Save-Gorseller $ids $adlar (Get-YazdirmaKlasoru) $dosya
                            Start-Yazdirma $yollar $kopya ([bool]$inputAction.ciftYuz)
                        } elseif ($hedef -eq 'indirilenler') {
                            $yollar = Save-Gorseller $ids $adlar (Get-IndirilenlerKlasoru) $dosya
                            Write-Host ('{0} dosya İndirilenler klasörüne kaydedildi.' -f $yollar.Count) -ForegroundColor Green
                        } elseif ($hedef -eq 'dosya') {
                            $klasor = Join-Path ([Environment]::GetFolderPath('MyPictures')) 'Cep Köprü'
                            $yollar = Save-Gorseller $ids $adlar $klasor $dosya
                            Write-Host ('{0} dosya kaydedildi: {1}' -f $yollar.Count, $klasor) -ForegroundColor Green
                            # Kaydedilenler Gezgin'de seçili açılır.
                            try { Start-Process explorer.exe -ArgumentList ('/select,"' + $yollar[0] + '"') } catch { }
                        } else {
                            $klasor = Join-Path $env:TEMP 'NotBahcesi-pano'
                            # Önceki pano dosyaları bir günden eskiyse temizlenir.
                            if (Test-Path -LiteralPath $klasor) { Get-ChildItem -LiteralPath $klasor -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | Remove-Item -Force -ErrorAction SilentlyContinue }
                            $yollar = Save-Gorseller $ids $adlar $klasor $dosya
                            Set-ClipboardDosyalar $yollar
                        }
                    }
                }
                'clipboard' {
                    if ($inputAction.text -isnot [string] -or $inputAction.text.Length -gt 32000) { throw 'Pano metni geçersiz.' }
                    if (-not $dryRun) { Set-ClipboardRetry $inputAction.text }
                }
                'panometni' {
                    $id=[string]$inputAction.id
                    if($id -notmatch '^[A-Za-z0-9-]{8,48}$' -or -not $script:parcalar.ContainsKey($id)) { throw 'Metin eksik geldi.' }
                    $bytes=$script:parcalar[$id].ToArray()
                    if($bytes.Length -lt 1 -or $bytes.Length -gt 1MB) { throw 'Metin boyutu geçersiz.' }
                    $text=[System.Text.UTF8Encoding]::new($false,$true).GetString($bytes)
                    if(-not $dryRun) { Set-ClipboardRetry $text }
                    $script:parcaToplam-=$script:parcalar[$id].Length
                    $script:parcalar[$id].Dispose();$script:parcalar.Remove($id);$script:parcaZamani.Remove($id)
                }
                'text' {
                    if ($inputAction.text -isnot [string] -or $inputAction.text.Length -gt 32000) { throw 'Metin geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::TypeText($inputAction.text) }
                }
                'move' {
                    $dx = [int]$inputAction.dx; $dy = [int]$inputAction.dy
                    # Tek istekte tam hareket (sürüm 9). Eskiden ±127 ile sınırlıydı ve telefon
                    # hızlı hareketi 12 ayrı isteğe bölüyordu; bu da takılmaya yol açıyordu.
                    if ([math]::Abs($dx) -gt 16384 -or [math]::Abs($dy) -gt 16384) { throw 'Hareket sınırı aşıldı.' }
                    if (-not $dryRun) { [RemoteInput]::Move($dx, $dy) }
                }
                'click' {
                    $button = [int]$inputAction.button
                    if ($button -notin @(1,2)) { throw 'Tık türü geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Click($button) }
                }
                'mic-devices' {
                    if (-not $script:pcMicReady) { throw 'Telefon mikrofonu bileseni yok.' }
                    Send-Response $stream 200 (@{ ok = $true; devices = @([PcMic]::Outputs());
                        suggested = [PcMic]::GuessVirtualOutput(); current = [PcMic]::Device;
                        streaming = [PcMic]::Streaming; inputs = @([PcMic]::Inputs()); mics = [PcMic]::MicPairs();
                        lastError = [PcMic]::LastError } | ConvertTo-Json -Compress); return
                }
                'mic-config' {
                    if (-not $script:pcMicReady) { throw 'Telefon mikrofonu bileseni yok.' }
                    [PcMic]::Configure([string]$inputAction.device)
                    Send-Response $stream 200 (@{ ok = $true; current = [PcMic]::Device } | ConvertTo-Json -Compress); return
                }
                'scroll-side' {
                    $sideSteps = [int]$inputAction.steps
                    if ([math]::Abs($sideSteps) -gt 40) { throw 'Yatay kaydirma siniri asildi.' }
                    if (-not $dryRun -and $sideSteps -ne 0) { [RemoteInput]::ScrollSide($sideSteps) }
                }
                'button' {
                    # Tik kilidi: ayni dugme ikinci komutla birakilir.
                    $latchButton = [int]$inputAction.button
                    if ($latchButton -notin @(1,2,4)) { throw 'Tik turu gecersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Button($latchButton, [bool]$inputAction.down) }
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
                'window' {
                    if ($inputAction.operation -notin @('minimize','maximize','restore','close')) { throw 'Pencere işlevi geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::WindowAction([string]$inputAction.operation,[long]$inputAction.expectedWindow) }
                }
                'shortcut' {
                    # -cnotmatch: büyük/küçük harf duyarsız eşleşme Türkçe Windows'ta 'I' harfini
                    # 'ı' sayar ve SHIFT, WIN gibi tuşları içeren kısayolları reddederdi.
                    if ($inputAction.keys -isnot [string] -or $inputAction.keys -cnotmatch '^[A-Za-z0-9+_ -]{1,60}$') { throw 'Kısayol geçersiz.' }
                    if (-not $dryRun) { [RemoteInput]::Shortcut($inputAction.keys) }
                }
                default { throw 'Bilinmeyen eylem.' }
            }
        }
        Send-Response $stream 200 '{"ok":true}'
    } catch {
        try { Send-Response $stream 400 '{"ok":false,"error":"Geçersiz istek veya pano meşgul"}' } catch { }
    } finally { if (-not $handedOff) { $client.Close() } }
}

$taskBindAddress = if($LoopbackOnly) { [System.Net.IPAddress]::Loopback } else { [System.Net.IPAddress]::Any }
$listener = [System.Net.Sockets.TcpListener]::new($taskBindAddress, $Port)
$listener.Server.ExclusiveAddressUse = $true
try { $listener.Start() }
catch {
    Write-Host "PC bağlantı noktası $Port zaten kullanılıyor. Açık Cep Köprü yardımcısının penceresini kullanın; başka bir yardımcı açmadan önce mevcut olanı kapatın." -ForegroundColor Yellow
    exit 3
}
# .NET Framework soketleri varsayılan olarak alt süreçlere miras kalır. Start-Job ile
# açılan Bluetooth/kart süreçleri dinleme soketini devralırsa, ana pencere kapandığında
# port açık kalır ama kimse yanıt vermez; telefon "yardımcıya ulaşılamadı" der ve yeni
# yardımcı aynı portu açamaz. Dinleyicilerin miras bayrağı kaldırılır.
try {
    Add-Type -Namespace CepKopru -Name NoInherit -MemberDefinition '[System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetHandleInformation(System.IntPtr h, int mask, int flags);' -ErrorAction Stop
    [void][CepKopru.NoInherit]::SetHandleInformation($listener.Server.Handle, 1, 0)
} catch { Write-Warning ('Dinleme soketi korumasi ayarlanamadi: ' + $_.Exception.Message) }
$taskListeners = @($listener)
$script:listenPorts = @($Port)
# Both released apps keep their existing default port. A single executor, PIN,
# approval window and token serve both, without a second Bluetooth/card worker.
if ($CompatibilityPort -gt 0 -or $Port -in @(8765,8775)) {
    $taskCompatPort = if ($CompatibilityPort -gt 0) { $CompatibilityPort } elseif ($Port -eq 8775) { 8765 } else { 8775 }
    $taskCompatListener = [System.Net.Sockets.TcpListener]::new($taskBindAddress, $taskCompatPort)
    try {
        $taskCompatListener.Server.ExclusiveAddressUse = $true
        $taskCompatListener.Start()
        [void][CepKopru.NoInherit]::SetHandleInformation($taskCompatListener.Server.Handle, 1, 0)
        $taskListeners += $taskCompatListener
        $script:listenPorts += $taskCompatPort
    } catch {
        $taskCompatListener.Stop()
        Write-Warning "Diger uygulamanin $taskCompatPort portu acilamadi. Acik eski yardimciyi kapatip yeniden baslatin. Ana port $Port kullanilabilir."
    }
}
# Port zaten kullaniliyorsa ikinci bir Bluetooth alicisi baslatma.
$script:phoneDriveReady = $false
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'vendor/InTheHand.Net.Personal.dll')
    Import-CepType 'PhoneDrive.cs' @('System.dll', 'System.Core.dll', 'System.Web.Extensions.dll', 'System.ServiceProcess.dll', (Join-Path $PSScriptRoot 'vendor\InTheHand.Net.Personal.dll'))
    [PhoneDrive]::Start(8797, (-not [bool]$TestMode))
    $script:phoneDriveReady = $true
    try {
        $phoneProxy = [PhoneDrive].GetField('proxy', [System.Reflection.BindingFlags]'NonPublic,Static').GetValue($null)
        if ($phoneProxy) { [void][CepKopru.NoInherit]::SetHandleInformation($phoneProxy.Server.Handle, 1, 0) }
    } catch { }
} catch { Write-Warning ('Telefon belleği bileşeni açılamadı: ' + $_.Exception.Message) }
$serialJob = $null
$cardJob = $null
$directBluetooth = $false
if (-not $TestMode) {
    if (-not $NoCard) { $cardJob=Start-Job -ScriptBlock {
        param($path,$port)
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Port $port -CardOnly
    } -ArgumentList $PSCommandPath,$Port }
    if ($NoBluetooth) { $BluetoothPort = 'off' }
    elseif ($BluetoothPort -eq 'auto' -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'vendor/InTheHand.Net.Personal.dll'))) {
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
$ingress = [HttpIngress]::new([System.Net.Sockets.TcpListener[]]$taskListeners)
try {
    Write-Host "Cep Köprü PC Yardımcısı (Wi‑Fi port $Port)" -ForegroundColor Green
    Write-Host 'Tek program: telefondan bilgisayara yazma, fare, kısayollar ve PANO bununla çalışır.'
    Write-Host '  · Bilgisayara yaz / klavye / makro: metni Not Defteri''ne elle yazar gibi tuş tuş yazar.'
    Write-Host '  · Panoya gönder: metni bilgisayar panosuna koyar; Ctrl+V ile yapıştırırsınız.'
    Write-Host '  · Kart USB ile takılıysa metin/görsel panosu kart üzerinden aktarılır; telefonun bilgisayarla ayrıca eşleşmesi gerekmez.'
    # Bağlantısız hotspot/VPN adresi yerine etkin fiziksel ağ kartını öncele.
    # .NET ağ arayüzü listesi anında döner; Get-NetAdapter/Get-NetIPAddress (CIM)
    # ilk çağrıda 5-6 sn sürüyor ve yardımcının açılmasını geciktiriyordu.
    $physicalTypes = @('Ethernet', 'Wireless80211', 'GigabitEthernet', 'FastEthernetT', 'FastEthernetFx', 'Ethernet3Megabit')
    $adresler = @([System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
        ForEach-Object {
            $nic = $_
            $nic.GetIPProperties().UnicastAddresses | Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } | ForEach-Object {
                [pscustomobject]@{ IPAddress = $_.Address.ToString(); Physical = ($physicalTypes -contains [string]$nic.NetworkInterfaceType) -and ($nic.Description -notmatch 'Virtual|Hyper-V|VMware|VirtualBox|TAP|Tailscale|WireGuard') }
            }
        } |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Sort-Object @{ Expression = { if ($_.Physical) { 0 } else { 1 } } })
    if($LoopbackOnly) { $adresler=@($adresler | Where-Object { $_.IPAddress -like '100.*' }) }
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
            Write-Host 'Wi‑Fi çalışır. Bluetooth için: Bluetooth açık mı, başka bir Cep Köprü yardımcısı penceresi açık mı? Kapatıp bunu yeniden başlatın.' -ForegroundColor Yellow
        } else {
            Write-Warning 'Bluetooth alıcısı zamanında hazır olmadı. Wi‑Fi çalışır; Bluetooth için yardımcıyı kapatıp yeniden açın.'
        }
    }
    else { Write-Host 'Bluetooth için Windows > Diğer Bluetooth ayarları > COM Bağlantı Noktaları > Ekle > Gelen seçin; ardından yardımcıyı yeniden açın.' }
    if ($TestMode) { Write-Warning 'TestMode: gelen metin gerçek panoya yazılmaz.' }
    Write-Host 'Kapatmak için Ctrl+C. Tailscale modunda yalnız kendi özel ağınızdan erişilir.'
    while ($true) {
        try { $client = $ingress.Next() }
        catch { Start-Sleep -Milliseconds 200; continue }
        try { Handle-Client $client $secret ([bool]$TestMode) } catch { try { $client.Close() } catch { } }
    }
} finally {
    $ingress.Dispose()
    $listener.Stop()
    foreach ($taskListener in $taskListeners) { $taskListener.Stop() }
    if ($script:phoneDriveReady) { [PhoneDrive]::Stop() }
    if ($serialJob) { Stop-Job $serialJob -ErrorAction SilentlyContinue; Remove-Job $serialJob -Force -ErrorAction SilentlyContinue }
    if ($cardJob) { Stop-Job $cardJob -ErrorAction SilentlyContinue; Remove-Job $cardJob -Force -ErrorAction SilentlyContinue }
}

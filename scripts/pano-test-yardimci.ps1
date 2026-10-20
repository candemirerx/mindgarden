param(
    [Parameter(Mandatory)][int]$Port,
    [string]$Token = '',
    # Bluetooth (RFCOMM) alıcısının satır protokolünü Port+1'de dinler ve Port'taki yardımcıya iletir.
    [switch]$Kopru
)
# Pano testi için PC yardımcısının parçalarını kaynağından alıp yalnız
# 127.0.0.1'de çalıştırır. Gerçek yardımcının yan süreçleri (kart, Bluetooth,
# telefon belleği) açılmaz; panoya gerçekten yazılır.
#
# Yardımcı modu: Handle-Client ve pano işlevleri (HTTP).
# Köprü modu: gelen her JSON satırı, yardımcıdaki RFCOMM dönüşümüyle (token
# ayıklanır, gövde yeniden yazılır) /input'a iletilir; gerçekte de ayrı süreçtir.
$ErrorActionPreference = 'Stop'
$kaynak = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'))

if ($Kopru) {
    $govdeSatiri = [regex]::Match($kaynak, '(?m)^\s*\$inputBody = \$command \|.*$').Value.Trim()
    if (-not $govdeSatiri) { throw 'Bluetooth gövde dönüşümü bulunamadı.' }
    $satir = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port + 1)
    $satir.Start()
    Write-Output 'HAZIR'
    while ($true) {
        $client = $satir.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [IO.StreamReader]::new($stream, [Text.UTF8Encoding]::new($false, $true))
            $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false)); $writer.NewLine = "`n"; $writer.AutoFlush = $true
            $line = $reader.ReadLine()
            try {
                $command = $line | ConvertFrom-Json
                Invoke-Expression $govdeSatiri
                $reply = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/input" -Headers @{ Authorization = "Bearer $($command.token)" } -ContentType 'text/plain; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($inputBody)) -TimeoutSec 8
                $writer.WriteLine((@{ ok = ($reply.ok -eq $true) } | ConvertTo-Json -Compress))
            } catch { $writer.WriteLine('{"ok":false,"error":"Komut reddedildi"}') }
        } finally { $client.Close() }
    }
}

Add-Type -Path (Join-Path $PSScriptRoot 'RemoteInput.cs')
$bas = $kaynak.IndexOf('function Set-ClipboardRetry')
$son = $kaynak.IndexOf('$taskBindAddress =')
if ($bas -lt 0 -or $son -lt $bas) { throw 'Yardımcı kaynağında işleyici bölümü bulunamadı.' }
. ([scriptblock]::Create($kaynak.Substring($bas, $son - $bas)))
$script:phoneDriveReady = $false
$http = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$http.Start()
Write-Output 'HAZIR'
while ($true) {
    $client = $http.AcceptTcpClient()
    try { Handle-Client $client $Token $false } catch { try { $client.Close() } catch { } }
}

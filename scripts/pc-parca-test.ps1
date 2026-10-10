$ErrorActionPreference='Stop'
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'pc_clipboard_helper.ps1'),[ref]$null,[ref]$null)
$function=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Add-Parca'},$true)
Invoke-Expression $function.Extent.Text
$script:parcalar=@{}; $script:parcaZamani=@{}; $script:parcaSirasi=@{}; $script:parcaOzet=@{}; $script:parcaToplam=0
$id='nbaudit-unit001'
Add-Parca $id 0 'AQID'
Add-Parca $id 0 'AQID'
if($script:parcalar[$id].Length -ne 3 -or $script:parcaToplam -ne 3){throw 'Duplicate appended'}
Add-Parca $id 1 'BAUG'
$okuma=New-Object System.IO.MemoryStream; $script:parcalar[$id].Flush(); $script:parcalar[$id].Position=0; $script:parcalar[$id].CopyTo($okuma)
if([Convert]::ToBase64String($okuma.ToArray()) -cne 'AQIDBAUG'){throw 'Wrong order or data'}
$rejected=$false;try {Add-Parca $id 3 'BwgJ'}catch {$rejected=$true}
if(-not $rejected){throw 'Out-of-order chunk accepted'}
$rejected=$false;try {Add-Parca $id 1 'BwgJ'}catch {$rejected=$true}
if(-not $rejected){throw 'Different retry accepted'}
Add-Parca 'nbaudit-empty001' 0 ''
Add-Parca 'nbaudit-empty001' 0 ''
if($script:parcalar['nbaudit-empty001'].Length -ne 0){throw 'Empty file changed'}
$script:parcaZamani[$id]=(Get-Date).AddMinutes(-6)
Add-Parca 'nbaudit-clean001' 0 'AA=='
if($script:parcalar.ContainsKey($id) -or $script:parcaSirasi.ContainsKey($id) -or $script:parcaOzet.ContainsKey($id)){throw 'Stale metadata retained'}
foreach($stream in $script:parcalar.Values){$stream.Dispose()}
$script:parcalar=@{}; $script:parcaZamani=@{}; $script:parcaSirasi=@{}; $script:parcaOzet=@{}; $script:parcaToplam=0
$buyuk='nbaudit-big0001'; $mb=[Convert]::ToBase64String((New-Object byte[] (1024*1024)))
for($i=0;$i -lt 100;$i++){Add-Parca $buyuk $i $mb}
if($script:parcalar[$buyuk].Length -ne 100MB){throw 'Big file length wrong'}
$yol=$script:parcalar[$buyuk].Name
$rejected=$false;try {Add-Parca $buyuk 100 'AA=='}catch {$rejected=$true}
if(-not $rejected){throw 'Over 100 MB accepted'}
$script:parcalar[$buyuk].Dispose()
if(Test-Path -LiteralPath $yol){throw 'Temp file not deleted'}
Write-Output 'PASS: duplicate ACK, order, conflicting retry, empty file, stale cleanup, 100 MB on disk, 100 MB limit, temp cleanup'

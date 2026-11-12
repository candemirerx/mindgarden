# Cep Kopru - sessiz yazdirma (yonetici izni gerekmez).
# Telefondan gelen dosyayi pencere acmadan yaziciya gonderir.
#   PDF, XPS, EPUB ve resimler : vendor\sumatra\SumatraPDF.exe (tasinabilir, kurulumsuz)
#   Word / Excel / PowerPoint  : bilgisayardaki Office (COM, gorunmez)
#   TXT / LOG / INI / MD        : Not Defteri (/pt)
#   digerleri                   : Windows "Yazdir" fiili (pencere acabilir)
# Cikti: son satir "YAZDIR OK ..." ya da "YAZDIR HATA ..."; cikis kodu 0 / 1.
param(
    [string]$Path,
    [string]$Printer,
    [ValidateRange(1, 99)][int]$Copies = 1,
    [switch]$Duplex,
    [switch]$ListPrinters,
    [switch]$DryRun,
    [string]$ToFile,           # yalniz deneme: Office ciktisini dosyaya yazar (Print to PDF ile pencere acmadan)
    [int]$TimeoutSec = 180,
    [string]$JobFile           # PC yardimcisinin biraktigi is: {files, copies, duplex, delete}
)
$ErrorActionPreference = 'Stop'
# Uctan uca deneme icin: ortam degiskeni 1 ise hicbir sey basilmaz (yardimcidan miras alinir).
if ($env:CEPKOPRU_YAZDIR_DENEME -eq '1') { $DryRun = [switch]::Present }

function if2($c, $a, $b) { if ($c) { $a } else { $b } }

function Out-Result([bool]$ok, [string]$text) {
    if ($ok) { Write-Output ("YAZDIR OK " + $text); exit 0 }
    Write-Output ("YAZDIR HATA " + $text); exit 1
}

function Get-DefaultPrinterName {
    $p = Get-CimInstance -ClassName Win32_Printer -Filter "Default=TRUE" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($p) { return [string]$p.Name }
    return $null
}

function Get-PrinterNames {
    @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | ForEach-Object { [string]$_.Name })
}

# Is dosyasi: her dosya ayri surecte (Office temiz kapansin diye) sirayla basilir.
if ($JobFile) {
    $logDir = Split-Path -Parent $JobFile
    $log = Join-Path $logDir 'sonuc.log'
    $job = Get-Content -LiteralPath $JobFile -Raw -Encoding UTF8 | ConvertFrom-Json
    Remove-Item -LiteralPath $JobFile -Force -ErrorAction SilentlyContinue
    $mutex = New-Object System.Threading.Mutex($false, 'Local\CepKopruYazdirma')
    try { [void]$mutex.WaitOne() } catch [System.Threading.AbandonedMutexException] { }
    $hatalar = @()
    try {
        foreach ($f in @($job.files)) {
            $a = @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-Path', [string]$f, '-Copies', [int]$job.copies)
            if ($job.duplex) { $a += '-Duplex' }
            if ($job.printer) { $a += @('-Printer', [string]$job.printer) }
            if ($job.dryRun) { $a += '-DryRun' }
            $out = (& powershell.exe @a 2>&1 | Out-String).Trim()
            $line = ($out -split "`r?`n" | Where-Object { $_ -like 'YAZDIR *' } | Select-Object -Last 1)
            if (-not $line) { $line = 'YAZDIR HATA ' + $out }
            Add-Content -LiteralPath $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $line) -Encoding UTF8
            if ($line -notlike 'YAZDIR OK*') { $hatalar += ([IO.Path]::GetFileName([string]$f) + ': ' + $line.Substring([Math]::Min(12, $line.Length))) }
            if ($job.delete) { Remove-Item -LiteralPath ([string]$f) -Force -ErrorAction SilentlyContinue }
        }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
    if ($hatalar.Count -gt 0) {
        Add-Type -AssemblyName System.Windows.Forms
        [void][System.Windows.Forms.MessageBox]::Show(('Telefondan gelen yazdirma tamamlanamadi:' + [Environment]::NewLine + [Environment]::NewLine + ($hatalar -join [Environment]::NewLine)), 'Cep Kopru - Yazdirma', 'OK', 'Warning')
        exit 1
    }
    exit 0
}

if ($ListPrinters) {
    $def = Get-DefaultPrinterName
    foreach ($n in Get-PrinterNames) { Write-Output ((if2 ($n -eq $def) '* ' '  ') + $n) }
    exit 0
}


if ([string]::IsNullOrWhiteSpace($Path)) { Out-Result $false 'dosya verilmedi' }
if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Out-Result $false ("dosya bulunamadi: " + $Path) }
$Path = (Resolve-Path -LiteralPath $Path).ProviderPath
$ext = [IO.Path]::GetExtension($Path).TrimStart('.').ToLowerInvariant()

$defaultPrinter = Get-DefaultPrinterName
if ([string]::IsNullOrWhiteSpace($Printer)) {
    if (-not $defaultPrinter) { Out-Result $false 'varsayilan yazici yok; -Printer ile ad verin' }
    $Printer = $defaultPrinter
} elseif (-not ((Get-PrinterNames) -contains $Printer)) {
    Out-Result $false ("yazici bulunamadi: " + $Printer)
}

$sumatraExt = 'pdf','xps','oxps','epub','cbz','cbr','djvu','jpg','jpeg','png','gif','bmp','tif','tiff','webp','jfif'
$wordExt    = 'doc','docx','docm','dot','dotx','rtf','odt'
$excelExt   = 'xls','xlsx','xlsm','xlsb','csv','ods'
$pptExt     = 'ppt','pptx','pptm','pps','ppsx','odp'
$textExt    = 'txt','log','ini','md','json','xml'

$method = if ($sumatraExt -contains $ext) { 'sumatra' }
    elseif ($wordExt -contains $ext) { 'word' }
    elseif ($excelExt -contains $ext) { 'excel' }
    elseif ($pptExt -contains $ext) { 'powerpoint' }
    elseif ($textExt -contains $ext) { 'notepad' }
    else { 'verb' }

$sumatra = Join-Path $PSScriptRoot 'vendor\sumatra\SumatraPDF.exe'
$summary = "yontem=$method yazici=`"$Printer`" kopya=$Copies" + (if2 $Duplex ' cift-yuz' '') + " dosya=`"$([IO.Path]::GetFileName($Path))`""
if ($DryRun) { Out-Result $true ("(deneme, basilmadi) " + $summary) }

# Office, Not Defteri ve Windows fiili yalniz varsayilan yaziciya basar:
# baska yazici istenirse varsayilan gecici olarak degistirilir ve sonra geri alinir.
$net = $null; $switched = $false
function Use-Printer {
    if ($Printer -ne $defaultPrinter) {
        $script:net = New-Object -ComObject WScript.Network
        $script:net.SetDefaultPrinter($Printer); $script:switched = $true
    }
}
function Restore-Printer {
    if ($script:switched -and $defaultPrinter) { try { $script:net.SetDefaultPrinter($defaultPrinter) } catch {} }
}
function Release-Com($o) { if ($o) { try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($o) } catch {} } }

# Office yeni acilirken bir sure "mesgul" donebilir: kisa aralarla (en fazla ~30 sn) yeniden dener.
function Invoke-Office([scriptblock]$Do) {
    for ($i = 0; ; $i++) {
        try { return (& $Do) }
        catch {
            # 0x80010001 RPC_E_CALL_REJECTED, 0x8001010A RPC_E_SERVERCALL_RETRYLATER, 0x800AC472 Excel mesgul
            $busy = $false; $e = $_.Exception
            while ($e) {
                if (@(-2147418111, -2147417846, -2146777998) -contains $e.HResult -or $e.Message -match '0x80010001|0x8001010A|0x800AC472') { $busy = $true }
                $e = $e.InnerException
            }
            if ($i -ge 120 -or -not $busy) { throw }
            Start-Sleep -Milliseconds 250
        }
    }
}
$missing = [Type]::Missing
try {
    switch ($method) {
        'sumatra' {
            if (-not (Test-Path -LiteralPath $sumatra)) { Out-Result $false 'SumatraPDF.exe bulunamadi (vendor\sumatra)' }
            $settings = "${Copies}x," + (if2 $Duplex 'duplexlong' 'simplex')
            if (@('jpg','jpeg','png','gif','bmp','tif','tiff','webp','jfif') -contains $ext) { $settings += ',fit' }
            $sargs = @('-print-to', "`"$Printer`"", '-print-settings', "`"$settings`"", '-silent', "`"$Path`"")
            $p = Start-Process -FilePath $sumatra -ArgumentList $sargs -PassThru -WindowStyle Hidden
            if (-not $p.WaitForExit($TimeoutSec * 1000)) { try { $p.Kill() } catch {}; Out-Result $false ("zaman asimi " + $summary) }
            if ($p.ExitCode -ne 0) { Out-Result $false ("SumatraPDF cikis kodu " + $p.ExitCode + " " + $summary) }
        }
        'word' {
            Use-Printer
            $app = New-Object -ComObject Word.Application
            try {
                Invoke-Office { $app.Visible = $false; $app.DisplayAlerts = 0 }
                # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
                $doc = Invoke-Office { $app.Documents.Open($Path, $false, $true, $false) }
                # PrintOut(Background, Append, Range, OutputFileName, From, To, Item, Copies, Pages, PageType, PrintToFile)
                if ($ToFile) { Invoke-Office { $doc.PrintOut($false, $false, 0, $ToFile, $missing, $missing, 0, $Copies, $missing, 0, $true) } }
                else { Invoke-Office { $doc.PrintOut($false, $false, 0, $missing, $missing, $missing, 0, $Copies) } }
                Invoke-Office { $doc.Close(0) }; Release-Com $doc
            } finally { try { Invoke-Office { $app.Quit([ref]0) } } catch {}; Release-Com $app }
        }
        'excel' {
            Use-Printer
            $app = New-Object -ComObject Excel.Application
            try {
                # Otomasyonla acilan Excel zaten gorunmez; acilista ayar degistirmek onu uzun sure "mesgul" tutuyor.
                # Open(FileName, UpdateLinks, ReadOnly)
                $wb = Invoke-Office { $app.Workbooks.Open($Path, 0, $true) }
                try { $app.DisplayAlerts = $false } catch {}
                # PrintOut(From, To, Copies, Preview, ActivePrinter, PrintToFile, Collate, PrToFileName)
                if ($ToFile) { Invoke-Office { $wb.PrintOut($missing, $missing, $Copies, $false, $missing, $true, $true, $ToFile) } }
                else { Invoke-Office { $wb.PrintOut($missing, $missing, $Copies, $false) } }
                Invoke-Office { $wb.Close($false) }; Release-Com $wb
            } finally { try { Invoke-Office { $app.Quit() } } catch {}; Release-Com $app }
        }
        'powerpoint' {
            Use-Printer
            $app = New-Object -ComObject PowerPoint.Application
            try {
                # Open(FileName, ReadOnly, Untitled, WithWindow) - msoTrue=-1, msoFalse=0
                $pres = Invoke-Office { $app.Presentations.Open($Path, -1, 0, 0) }
                Invoke-Office { $pres.PrintOptions.NumberOfCopies = $Copies; $pres.PrintOptions.PrintInBackground = 0 }
                if ($ToFile) { Invoke-Office { $pres.PrintOut(-1, -1, $ToFile, $Copies) } } else { Invoke-Office { $pres.PrintOut() } }
                Invoke-Office { $pres.Close() }; Release-Com $pres
            } finally { try { Invoke-Office { $app.Quit() } } catch {}; Release-Com $app }
        }
        'notepad' {
            for ($i = 0; $i -lt $Copies; $i++) {
                $p = Start-Process -FilePath "$env:WINDIR\System32\notepad.exe" -ArgumentList @('/pt', "`"$Path`"", "`"$Printer`"") -PassThru -WindowStyle Hidden
                if (-not $p.WaitForExit($TimeoutSec * 1000)) { try { $p.Kill() } catch {}; Out-Result $false ("zaman asimi " + $summary) }
            }
        }
        default {
            Use-Printer
            for ($i = 0; $i -lt $Copies; $i++) {
                $p = Start-Process -FilePath $Path -Verb Print -PassThru -WindowStyle Hidden
                if ($p) { [void]$p.WaitForExit($TimeoutSec * 1000) } else { Start-Sleep -Seconds 8 }
            }
        }
    }
} catch {
    Restore-Printer
    $msg = $_.Exception.Message -replace '\s+', ' '
    if ($msg -match '80040154|REGDB_E_CLASSNOTREG|Sinif kayitli degil|Class not registered') { $msg = 'bu dosya turu icin Office kurulu degil' }
    Out-Result $false ($msg + " " + $summary)
}
Restore-Printer
Out-Result $true $summary

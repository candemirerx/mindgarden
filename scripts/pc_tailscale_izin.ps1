# Tailscale yolunda yalniz ozel VPN arayuzu ve tailnet adreslerine izin ver.
$ErrorActionPreference='Stop'
$taskIdentity=[System.Security.Principal.WindowsIdentity]::GetCurrent()
$taskAdmin=(New-Object System.Security.Principal.WindowsPrincipal($taskIdentity)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $taskAdmin) { Write-Output 'Tailscale port iznini eklemek icin bu dosyayi yonetici olarak calistirin.';exit 1 }
$taskAdapter=Get-NetAdapter -IncludeHidden | Where-Object { $_.InterfaceDescription -like '*Tailscale*' } | Select-Object -First 1
if(-not $taskAdapter) { Write-Output 'Tailscale ag arayuzu bulunamadi; once Tailscale acin.';exit 2 }
$taskName='Cep Kopru Tailscale TCP 8765'
if(Get-NetFirewallRule -DisplayName $taskName -ErrorAction SilentlyContinue) { Remove-NetFirewallRule -DisplayName $taskName }
New-NetFirewallRule -DisplayName $taskName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8765 -Profile Any -InterfaceAlias $taskAdapter.Name -RemoteAddress '100.64.0.0/10' -Description 'Yalniz Tailscale ozel aginda kimlik dogrulamali Cep Kopru yardimcisi' | Out-Null
Write-Output 'Tailscale bilgisayar baglantisi icin TCP 8765 izni eklendi.'

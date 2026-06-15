$ErrorActionPreference = "Stop"
try {
  $port = 8000
  $root = $PSScriptRoot
  $localUrl = "http://localhost:$port"

  # Best-effort LAN address for playing on other devices (never fatal).
  $lanUrl = $localUrl
  try {
    $cfg = Get-NetIPConfiguration |
      Where-Object { $_.NetAdapter.Status -eq "Up" -and $_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -notlike "169.254.*" } |
      Select-Object -First 1
    if ($cfg.IPv4Address.IPAddress) { $lanUrl = "http://$($cfg.IPv4Address.IPAddress):$port" }
  } catch {}
  $stableNetworkUrl = "http://$([System.Net.Dns]::GetHostName()):$port"
  $launchUrl = "$localUrl/?build=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"

  # Free the port: stop any stray local http.server; only refuse if a *different* app holds it.
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($l in $listeners) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($l.OwningProcess)" -ErrorAction SilentlyContinue
    if ($proc.CommandLine -like "*http.server*") {
      Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue
    } elseif ($proc) {
      throw "Port $port is already in use by another program ($($proc.Name)). Close it, then try again."
    }
  }
  if ($listeners) { Start-Sleep -Milliseconds 500 }

  if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python was not found on this PC. Install it from https://python.org (tick 'Add python.exe to PATH'), then run again."
  }

  Write-Host ""
  Write-Host "Emberfall is starting." -ForegroundColor Green
  Write-Host "This computer:      $localUrl" -ForegroundColor Green
  Write-Host "Other devices:      $stableNetworkUrl" -ForegroundColor Cyan
  Write-Host "Other devices (IP): $lanUrl"
  Write-Host ""
  Write-Host "Keep this window open while you play. Close it to stop the game." -ForegroundColor Yellow
  Write-Host ""

  Start-Process $launchUrl
  python -m http.server $port --bind 0.0.0.0 --directory $root
}
catch {
  Write-Host ""
  Write-Host "Could not start Emberfall:" -ForegroundColor Red
  Write-Host ("  " + $_.Exception.Message) -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close this window"
}

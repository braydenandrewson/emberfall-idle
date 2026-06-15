$ErrorActionPreference = "Stop"

$port = 8000
$localUrl = "http://localhost:$port"
$activeConfig = Get-NetIPConfiguration |
  Where-Object {
    $_.NetAdapter.Status -eq "Up" -and
    $_.IPv4DefaultGateway -and
    $_.IPv4Address.IPAddress -notlike "169.254.*"
  } |
  Select-Object -First 1
$lanAddress = $activeConfig.IPv4Address.IPAddress
$lanUrl = if ($lanAddress) { "http://${lanAddress}:$port" } else { $localUrl }
$networkName = if ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { "localhost" }
$stableNetworkUrl = "http://${networkName}:$port"
$launchUrl = "$localUrl/?build=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"

$existingServer = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($existingServer) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($existingServer.OwningProcess)" -ErrorAction SilentlyContinue
  if ($process.CommandLine -like "*http.server $port*" -and $process.CommandLine -like "*emberfall-idle*") {
    Stop-Process -Id $existingServer.OwningProcess -Force
    Start-Sleep -Milliseconds 400
  } else {
    throw "Port $port is already being used by another application."
  }
}

Write-Host ""
Write-Host "Emberfall is starting." -ForegroundColor Green
Write-Host "This computer: $localUrl" -ForegroundColor Green
Write-Host "Other devices (stable): $stableNetworkUrl" -ForegroundColor Cyan
Write-Host "Other devices (IP fallback): $lanUrl"
Write-Host "Keep this window open while playing." -ForegroundColor Yellow
Write-Host "Devices must be connected to the same local network."
Write-Host "Press Ctrl+C or close this window to stop the local server."
Write-Host ""

Start-Process $launchUrl
python -m http.server $port --bind 0.0.0.0 --directory $PSScriptRoot

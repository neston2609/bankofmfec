$ErrorActionPreference = 'Continue'

$root = 'C:\DemoHub24'
$source = Join-Path $root 'MockBank'
$logDirectory = Join-Path $root 'logs'
$logPath = Join-Path $logDirectory 'watchdog.log'
$nginxRoot = 'C:\Users\ton_s\Documents\Codex\nginx\nginx-1.30.4'
$nginx = Join-Path $nginxRoot 'nginx.exe'

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-WatchdogLog([string]$message) {
  $line = '{0:u} {1}' -f (Get-Date), $message
  Add-Content -LiteralPath $logPath -Value $line
}

function Test-ListeningPort([int]$port) {
  return [bool](Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Start-HiddenPowerShell([string]$scriptPath) {
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-WindowStyle', 'Hidden',
    '-ExecutionPolicy', 'Bypass',
    '-File', $scriptPath
  ) -WindowStyle Hidden
}

Write-WatchdogLog 'DemoHub24 watchdog started.'

while ($true) {
  try {
    if (!(Test-ListeningPort 5432)) {
      Write-WatchdogLog 'PostgreSQL was unavailable; starting it.'
      Start-HiddenPowerShell (Join-Path $source 'scripts\Start-Postgres.ps1')
    }

    if (!(Test-ListeningPort 8080)) {
      Write-WatchdogLog 'Nginx was unavailable; starting it.'
      Start-Process -FilePath $nginx -ArgumentList @('-p', "$nginxRoot\") -WorkingDirectory $nginxRoot -WindowStyle Hidden
    }

    if (!(Test-ListeningPort 4100)) {
      Write-WatchdogLog 'Banking API was unavailable; starting it.'
      Start-HiddenPowerShell (Join-Path $source 'scripts\Start-Api.ps1')
    }
  } catch {
    Write-WatchdogLog "Health check error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 20
}

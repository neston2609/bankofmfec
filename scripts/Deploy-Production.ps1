[CmdletBinding(SupportsShouldProcess)]
param([switch]$SkipMigration, [switch]$SkipServiceRestart)
$ErrorActionPreference = 'Stop'
$source = 'C:\DemoHub24\MockBank'
$webRoot = 'C:\DemoHub24\www'
$config = 'C:\DemoHub24\config\mockbank.env'
$node = 'C:\Program Files\nodejs\node.exe'
$npm = 'C:\Program Files\nodejs\npm.cmd'
foreach ($path in $source,$config,$node,$npm) { if (!(Test-Path -LiteralPath $path)) { throw "Required path missing: $path" } }
Push-Location $source
try {
  if (Get-Service 'DemoHub24MockBankAPI' -ErrorAction SilentlyContinue) { & "$source\scripts\Backup-Database.ps1" }
  & $npm ci
  & $npm run db:generate
  if (!$SkipMigration) { & $npm run db:migrate }
  & $npm run build
  $applications = 'portal','cif','core','card','loan','collection','mobile','payment','wealth','fraud','kyc','campaign','notify','admin'
  foreach ($application in $applications) {
    $target = Join-Path $webRoot $application
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    robocopy "$source\apps\web\dist" $target /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "Static deployment failed for $application" }
  }
  if (!$SkipServiceRestart) { Restart-Service 'DemoHub24MockBankAPI' }
  $health = Invoke-RestMethod 'http://127.0.0.1:4100/health' -TimeoutSec 15
  if ($health.status -ne 'ok') { throw 'API health check failed' }
  & "$source\scripts\Test-Production.ps1" -LocalOrigin
} finally { Pop-Location }

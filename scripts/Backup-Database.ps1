[CmdletBinding()]
param([int]$RetentionDays = 30)
$ErrorActionPreference = 'Stop'
$configPath = 'C:\DemoHub24\config\mockbank.env'
$backupRoot = 'C:\DemoHub24\backups\postgresql'
if (!(Test-Path -LiteralPath $configPath)) { throw "Missing $configPath" }
$databaseUrl = (Get-Content -LiteralPath $configPath | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1).Substring(13)
if (!$databaseUrl) { throw 'DATABASE_URL is missing' }
$pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' | Sort-Object FullName -Descending | Select-Object -First 1
if (!$pgDump) { throw 'pg_dump.exe was not found' }
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$target = Join-Path $backupRoot ("demohub24_bank_{0}.dump" -f (Get-Date -Format 'yyyyMMddTHHmmss'))
& $pgDump.FullName --format=custom --file=$target $databaseUrl
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Get-ChildItem -LiteralPath $backupRoot -Filter '*.dump' | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) | Remove-Item -Force
Write-Output $target

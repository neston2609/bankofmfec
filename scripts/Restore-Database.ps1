[CmdletBinding()]
param([Parameter(Mandatory)][string]$BackupFile)
$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $BackupFile).Path
if ([IO.Path]::GetExtension($resolved) -ne '.dump') { throw 'Only PostgreSQL .dump files are accepted' }
$answer = Read-Host 'Type RESTORE DEMOHUB24 to continue'
if ($answer -cne 'RESTORE DEMOHUB24') { throw 'Confirmation did not match; database was not changed' }
$configPath = 'C:\DemoHub24\config\mockbank.env'
$databaseUrl = (Get-Content -LiteralPath $configPath | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1).Substring(13)
$pgRestore = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' | Sort-Object FullName -Descending | Select-Object -First 1
if (!$pgRestore) { throw 'pg_restore.exe was not found' }
& $pgRestore.FullName --clean --if-exists --no-owner --dbname=$databaseUrl $resolved
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }

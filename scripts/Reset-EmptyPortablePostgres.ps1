$ErrorActionPreference = 'Stop'
$pgRoot = 'C:\DemoHub24\postgresql-runtime\node_modules\@embedded-postgres\windows-x64\native'
$target = (Resolve-Path -LiteralPath 'C:\DemoHub24\postgresql-data').Path
if ($target -ne 'C:\DemoHub24\postgresql-data') { throw "Unexpected target: $target" }
& "$pgRoot\bin\pg_ctl.exe" -D $target -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the empty PostgreSQL cluster' }
Remove-Item -LiteralPath $target -Recurse -Force
if (Test-Path -LiteralPath $target) { throw 'Empty data directory was not removed' }
& 'C:\DemoHub24\MockBank\scripts\Initialize-PortablePostgres.ps1'

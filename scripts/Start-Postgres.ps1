$pgRoot = 'C:\DemoHub24\postgresql-runtime\node_modules\@embedded-postgres\windows-x64\native'
$data = 'C:\DemoHub24\postgresql-data'
$log = 'C:\DemoHub24\logs\postgresql.log'
& "$pgRoot\bin\pg_ctl.exe" -D $data -l $log -w start
exit $LASTEXITCODE

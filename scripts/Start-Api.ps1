$ErrorActionPreference = 'Stop'
$databaseReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  $client = [Net.Sockets.TcpClient]::new()
  try { $client.Connect('127.0.0.1',5432); $databaseReady = $true; break } catch { Start-Sleep -Seconds 1 } finally { $client.Dispose() }
}
if (!$databaseReady) { throw 'PostgreSQL did not become ready' }
Get-Content -LiteralPath 'C:\DemoHub24\config\mockbank.env' | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process') }
}
Set-Location 'C:\DemoHub24\MockBank\apps\api'
& 'C:\Program Files\nodejs\node.exe' 'dist\main.js'
exit $LASTEXITCODE

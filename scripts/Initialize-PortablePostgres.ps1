$ErrorActionPreference = 'Stop'
$pgRoot = 'C:\DemoHub24\postgresql-runtime\node_modules\@embedded-postgres\windows-x64\native'
$data = 'C:\DemoHub24\postgresql-data'
$configDir = 'C:\DemoHub24\config'
$logs = 'C:\DemoHub24\logs'
function New-DemoHubSecret {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return (([Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]','X').Substring(0,36) + 'aA9!')
}
if (Test-Path -LiteralPath $data) { throw "Data directory already exists: $data" }
$superPassword = New-DemoHubSecret
$applicationPassword = New-DemoHubSecret
New-Item -ItemType Directory -Force -Path $data,$configDir,$logs | Out-Null
$passwordFile = Join-Path $env:TEMP ('demohub24-pg-' + [guid]::NewGuid().ToString('N') + '.txt')
try {
  [IO.File]::WriteAllText($passwordFile,$superPassword,[Text.UTF8Encoding]::new($false))
  & "$pgRoot\bin\initdb.exe" -D $data -U postgres --encoding=UTF8 --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile=$passwordFile
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
} finally {
  if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile -Force }
}
Add-Content -LiteralPath "$data\postgresql.conf" -Value "`nlisten_addresses = '127.0.0.1'`nport = 5432`npassword_encryption = 'scram-sha-256'`nlog_timezone = 'Asia/Bangkok'`ntimezone = 'Asia/Bangkok'"
$env:PGPASSWORD = $superPassword
& "$pgRoot\bin\pg_ctl.exe" -D $data -l "$logs\postgresql.log" -w start
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL start failed' }
$env:DEMOHUB_PG_SUPER_PASSWORD = $superPassword
$env:DEMOHUB_PG_APPLICATION_PASSWORD = $applicationPassword
& 'C:\Program Files\nodejs\node.exe' 'C:\DemoHub24\MockBank\scripts\Initialize-Database.mjs'
if ($LASTEXITCODE -ne 0) { throw 'Database and role creation failed' }
Remove-Item Env:DEMOHUB_PG_SUPER_PASSWORD
Remove-Item Env:DEMOHUB_PG_APPLICATION_PASSWORD
$environment = @(
  'NODE_ENV=production', 'PORT=4100',
  "DATABASE_URL=postgresql://demohub24_app:$applicationPassword@127.0.0.1:5432/demohub24_bank",
  'BASE_DOMAIN=demohub24.com', 'API_BASE_URL=https://backend.demohub24.com',
  'LAB_NAME=DemoHub24 Banking Lab', 'LAB_ENVIRONMENT=PRODUCTION',
  'SEED_VERSION=DEMOHUB24-BANK-2026-V1',
  ('JWT_SECRET=' + (New-DemoHubSecret)),
  ('ADMIN_INITIAL_PASSWORD=' + (New-DemoHubSecret)),
  ('API_KEY_GENESYS=' + (New-DemoHubSecret)),
  ('API_KEY_SERVICENOW=' + (New-DemoHubSecret)),
  ('API_KEY_GOOGLE_AI=' + (New-DemoHubSecret)),
  ('API_KEY_UIPATH=' + (New-DemoHubSecret))
)
[IO.File]::WriteAllLines('C:\DemoHub24\config\mockbank.env',$environment,[Text.UTF8Encoding]::new($false))
icacls 'C:\DemoHub24\config\mockbank.env' /inheritance:r /grant:r "$env:USERNAME`:(R,W)" 'SYSTEM:(F)' 'Administrators:(F)' | Out-Null
Remove-Item Env:PGPASSWORD
Write-Output 'Portable PostgreSQL initialized on 127.0.0.1:5432; secrets written to protected production configuration.'

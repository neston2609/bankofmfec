[CmdletBinding()]
param([switch]$LocalOrigin)
$routes = @(
  @{ Application='website'; Host='mfecbank.demohub24.com'; Path='/' },
  @{ Application='internet-banking'; Host='ibank.demohub24.com'; Path='/login' },
  @{ Application='backend'; Host='backend.demohub24.com'; Path='/login' },
  @{ Application='loan'; Host='backend.demohub24.com'; Path='/loan' },
  @{ Application='api-docs'; Host='backend.demohub24.com'; Path='/openapi.json' }
)
$results = foreach ($route in $routes) {
  $hostName = $route.Host
  $uri = if ($LocalOrigin) { "http://127.0.0.1:8080$($route.Path)" } else { "https://$hostName$($route.Path)" }
  try {
    $dns = if ($LocalOrigin) { 'LOCAL' } else { (Resolve-DnsName $hostName -ErrorAction Stop | Select-Object -First 1 -ExpandProperty IPAddress) }
    $headers = if ($LocalOrigin) { @{ Host = $hostName; 'X-Forwarded-Proto' = 'https' } } else { @{} }
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers $headers -TimeoutSec 15
    [pscustomobject]@{ Application=$route.Application; Host=$hostName; Path=$route.Path; DNS=$dns; Status=$response.StatusCode; Result='PASS' }
  } catch { [pscustomobject]@{ Application=$route.Application; Host=$hostName; Path=$route.Path; DNS='-'; Status='-'; Result="FAIL: $($_.Exception.Message)" } }
}
$results | Format-Table -AutoSize
if ($results.Result -like 'FAIL*') { exit 1 }

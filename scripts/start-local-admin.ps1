$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$tempRoot = Join-Path $env:TEMP 'jb-creations-admin-local'

$excludeDirs = @(
    (Join-Path $projectRoot 'node_modules'),
    (Join-Path $projectRoot '.git'),
    (Join-Path $projectRoot '.netlify\functions-serve'),
    (Join-Path $projectRoot 'netlify\functions\node_modules'),
    (Join-Path $projectRoot 'order-backend\node_modules')
)

if (-not (Test-Path $tempRoot)) {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null
}

$robocopyArgs = @(
    $projectRoot,
    $tempRoot,
    '/MIR',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NP',
    '/XD'
) + $excludeDirs

Write-Host "Mirroring project to $tempRoot..."
& robocopy @robocopyArgs | Out-Host

if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
}

Push-Location $tempRoot

try {
    $firebaseAdminPath = Join-Path $tempRoot 'node_modules\firebase-admin'
    if (-not (Test-Path $firebaseAdminPath)) {
        Write-Host 'Installing root dependencies in temp mirror...'
        npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
    }

    Write-Host 'Starting Netlify Dev from temp mirror...'
    npx netlify dev --port 8888
    if ($LASTEXITCODE -ne 0) {
        throw "netlify dev failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
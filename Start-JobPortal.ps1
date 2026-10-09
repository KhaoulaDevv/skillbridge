param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$toolsDir = Join-Path (Split-Path $projectDir -Parent) 'tmp\job-portal-tools'
$jdkDir = Get-ChildItem $toolsDir -Directory -Filter 'jdk-*' | Select-Object -First 1
$javaExe = Join-Path $jdkDir.FullName 'bin\java.exe'
$mysqlExe = 'C:\wamp64\bin\mysql\mysql8.4.7\bin\mysqld.exe'
$nodeExe = (Get-Command node.exe).Source
New-Item -ItemType Directory (Join-Path $projectDir 'logs') -Force | Out-Null
foreach ($line in Get-Content (Join-Path $projectDir '.env')) {
    if ($line -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
if (-not (Get-NetTCPConnection -LocalPort 3308 -State Listen -ErrorAction SilentlyContinue)) {
    $dataDir = (Join-Path $projectDir 'tmp\mysql-data').Replace('\', '/')
    Start-Process $mysqlExe -ArgumentList "--no-defaults --basedir=C:/wamp64/bin/mysql/mysql8.4.7 --datadir=$dataDir --port=3308 --bind-address=127.0.0.1 --mysqlx=OFF" -WindowStyle Hidden
}
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (Get-NetTCPConnection -LocalPort 3308 -State Listen -ErrorAction SilentlyContinue) { break }
    Start-Sleep -Milliseconds 500
}
if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process $javaExe -ArgumentList '-jar job-portal-backend/target/jobportal-0.0.1-SNAPSHOT.jar' -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput "$projectDir\logs\backend.log" -RedirectStandardError "$projectDir\logs\backend-error.log"
}
if (-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process $nodeExe -ArgumentList 'node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort' -WorkingDirectory "$projectDir\job-portal-frontend" -WindowStyle Hidden -RedirectStandardOutput "$projectDir\logs\frontend.log" -RedirectStandardError "$projectDir\logs\frontend-error.log"
}
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
        try {
            $apiStatus = (Invoke-WebRequest 'http://127.0.0.1:8080/api/jobs' -UseBasicParsing -TimeoutSec 2).StatusCode
        } catch {
            if ($null -eq $_.Exception.Response) { throw }
            $apiStatus = [int]$_.Exception.Response.StatusCode
        }
        $ui = Invoke-WebRequest 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2
        if ($apiStatus -in @(200, 401) -and $ui.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) { throw "Startup did not complete. Check the logs folder: $projectDir\logs" }
Write-Host 'Job Portal is running: http://localhost:5173'
if (-not $NoBrowser) { Start-Process 'http://localhost:5173' }

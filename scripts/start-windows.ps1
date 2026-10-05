$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
$taskDockerCandidates = @(
    "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
)
$taskDocker = $taskDockerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $taskDocker) {
    $taskDockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
    if ($taskDockerCommand) { $taskDocker = $taskDockerCommand.Source }
}
if (-not $taskDocker) { throw 'Docker Desktop was not found. Install it and start its WSL 2 engine.' }
$env:Path = (Split-Path $taskDocker -Parent) + ';' + $env:Path
$taskNodeCandidates = @("$env:ProgramFiles\nodejs\node.exe", (Join-Path $taskRoot '.tools\node_modules\node\bin\node.exe'))
$taskNode = $taskNodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $taskNode) { throw 'Node 24 was not found. Run install-windows-prerequisites.ps1.' }
$taskVersion = & $taskNode --version
if ($taskVersion -notmatch '^v24\.') { throw "Expected Node 24; found $taskVersion. Run install-windows-prerequisites.ps1." }
& $taskNode (Join-Path $taskRoot 'scripts\setup.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Environment setup failed.' }
& $taskDocker info
if ($LASTEXITCODE -ne 0) { throw 'Docker engine is unavailable. Complete WSL setup, restart Windows, and open Docker Desktop.' }
& $taskDocker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose startup failed. See the error above.' }
$taskReady = $false
for ($taskAttempt = 0; $taskAttempt -lt 60; $taskAttempt++) {
    try {
        $taskResponse = Invoke-WebRequest 'http://localhost:4200/api/v1/health/ready' -UseBasicParsing -TimeoutSec 3
        if ($taskResponse.StatusCode -eq 200) { $taskReady = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $taskReady) { throw 'API did not become ready. Run docker compose logs api.' }
Write-Host 'App: http://localhost:4200'
Write-Host 'OTP inbox: http://localhost:8025'
Write-Host 'API docs: http://localhost:4200/api/docs'

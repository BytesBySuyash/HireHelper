param([switch]$DownloadOnly)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskDownloads = Join-Path $taskRoot '.tools'
New-Item -ItemType Directory -Path $taskDownloads -Force | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-SignedInstaller($Url, $Path, $Publisher) {
    if (-not (Test-Path -LiteralPath $Path) -or (Get-AuthenticodeSignature -LiteralPath $Path).Status -ne 'Valid') {
        & curl.exe --fail --location --retry 3 --connect-timeout 30 --max-time 1800 --output $Path $Url
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
    }
    $taskSignature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($taskSignature.Status -ne 'Valid' -or $taskSignature.SignerCertificate.Subject -notmatch $Publisher) {
        throw "Installer signature or publisher check failed: $Path"
    }
    Write-Host "Verified: $Path"
}

$taskNodeRelease = Invoke-RestMethod 'https://nodejs.org/dist/index.json' |
    Where-Object { $_.version -match '^v24\.' -and $_.lts } | Select-Object -First 1
if (-not $taskNodeRelease) { throw 'No Node 24 LTS release found.' }
$taskNodeVersion = $taskNodeRelease.version
$taskNodeMsi = Join-Path $taskDownloads "node-$taskNodeVersion-x64.msi"
Get-SignedInstaller "https://nodejs.org/dist/$taskNodeVersion/node-$taskNodeVersion-x64.msi" $taskNodeMsi 'OpenJS|Node.js'

$taskWslRelease = Invoke-RestMethod 'https://api.github.com/repos/microsoft/WSL/releases/latest'
$taskWslAsset = $taskWslRelease.assets | Where-Object { $_.name -match '^wsl\..*\.x64\.msi$' } | Select-Object -First 1
if (-not $taskWslAsset) { throw 'No official WSL x64 installer found.' }
$taskWslMsi = Join-Path $taskDownloads $taskWslAsset.name
Get-SignedInstaller $taskWslAsset.browser_download_url $taskWslMsi 'Microsoft Corporation'
if ($DownloadOnly) { Write-Host 'Downloads complete. Run this script as administrator to install.'; return }

$taskPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $taskPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Installation requires Windows administrator rights. Open PowerShell as administrator and run this script again.'
}
$taskRestartRequired = $false
foreach ($taskInstaller in @($taskNodeMsi, $taskWslMsi)) {
    $taskInstall = Start-Process msiexec.exe -ArgumentList '/i',('"' + $taskInstaller + '"'),'/qn','/norestart' -WindowStyle Hidden -Wait -PassThru
    if ($taskInstall.ExitCode -notin @(0, 3010)) { throw "Installer failed with exit code $($taskInstall.ExitCode): $taskInstaller" }
    if ($taskInstall.ExitCode -eq 3010) { $taskRestartRequired = $true }
}
foreach ($taskFeature in @('VirtualMachinePlatform', 'Microsoft-Windows-Subsystem-Linux')) {
    $taskResult = Enable-WindowsOptionalFeature -Online -FeatureName $taskFeature -All -NoRestart
    if ($taskResult.RestartNeeded) { $taskRestartRequired = $true }
}
Write-Host "Installation complete. Restart required: $taskRestartRequired"
Write-Host 'Restart Windows before starting Docker Desktop. No restart was performed automatically.'
Write-Host 'Then open a fresh PowerShell and run scripts/start-windows.ps1 from this project.'

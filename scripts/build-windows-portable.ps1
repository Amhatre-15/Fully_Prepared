param(
  [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'dist\fully-prepared-windows-portable')
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
if (-not $resolvedOutput.StartsWith($distRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Build output must be a new directory inside $distRoot"
}
if (Test-Path -LiteralPath $resolvedOutput) { throw "Build output already exists; choose another empty path: $resolvedOutput" }

$electronDist = Join-Path $projectRoot 'node_modules\electron\dist'
$electronExe = Join-Path $electronDist 'electron.exe'
$whisperRelease = Join-Path $projectRoot 'vendor\whisper\Release'
foreach ($required in @($electronExe, (Join-Path $whisperRelease 'whisper-server.exe'), (Join-Path $whisperRelease 'ggml-base.bin'))) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required offline build asset is missing: $required" }
}

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
try {
  Get-ChildItem -LiteralPath $electronDist -Force | Copy-Item -Destination $resolvedOutput -Recurse
  Rename-Item -LiteralPath (Join-Path $resolvedOutput 'electron.exe') -NewName 'Fully Prepared.exe'

  $appRoot = Join-Path $resolvedOutput 'resources\app'
  $appNodeModules = Join-Path $appRoot 'node_modules'
  $speechResources = Join-Path $resolvedOutput 'resources\whisper'
  New-Item -ItemType Directory -Path $appNodeModules,$speechResources -Force | Out-Null
  foreach ($file in @('package.json','main.cjs','preload.cjs','README.md','tracker.md')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $appRoot
  }
  foreach ($directory in @('src','docs')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $appRoot -Recurse
  }
  $noticeRoot = Join-Path $appRoot 'THIRD_PARTY_NOTICES'
  New-Item -ItemType Directory -Path $noticeRoot -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $electronDist 'LICENSE') -Destination $noticeRoot
  Copy-Item -LiteralPath (Join-Path $electronDist 'LICENSES.chromium.html') -Destination $noticeRoot
  Get-ChildItem -LiteralPath $projectRoot\node_modules -Force |
    Where-Object { $_.Name -notin @('electron','.bin') } |
    Copy-Item -Destination $appNodeModules -Recurse
  Get-ChildItem -LiteralPath $whisperRelease -Force | Copy-Item -Destination $speechResources -Recurse
  foreach ($script in @('install.ps1','uninstall.ps1')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $script) -Destination $resolvedOutput
  }
  Set-Content -LiteralPath (Join-Path $resolvedOutput 'BUILD-INFO.txt') -Encoding UTF8 -Value @(
    'Fully Prepared Windows portable build',
    "App version: $((Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version)",
    "Electron version: $((Get-Item $electronExe).VersionInfo.ProductVersion)",
    "Built: $([DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss UTC'))",
    'Speech recognition assets and notices are in resources\whisper.',
    'Electron and Chromium notices are in resources\app\THIRD_PARTY_NOTICES.',
    'See resources\app\docs\THIRD_PARTY_NOTICES.md before redistribution.'
  )
  Write-Output "Portable build created at $resolvedOutput"
} catch {
  Write-Error "Build failed. The incomplete output is preserved at $resolvedOutput for inspection. $($_.Exception.Message)"
  throw
}

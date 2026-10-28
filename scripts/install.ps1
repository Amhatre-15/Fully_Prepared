$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path $PSScriptRoot).Path
$executable = Join-Path $packageRoot 'Fully Prepared.exe'
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw 'Run install.ps1 from the extracted Fully Prepared portable package.' }

$installRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Programs\Fully Prepared'))
if (Test-Path -LiteralPath $installRoot) { throw "Fully Prepared is already installed at $installRoot. Uninstall it first; user data will be preserved." }
New-Item -ItemType Directory -Path (Split-Path -Parent $installRoot) -Force | Out-Null
New-Item -ItemType Directory -Path $installRoot | Out-Null
Get-ChildItem -LiteralPath $packageRoot -Force | Copy-Item -Destination $installRoot -Recurse

$shortcutPath = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Fully Prepared.lnk'
New-Item -ItemType Directory -Path (Split-Path -Parent $shortcutPath) -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $installRoot 'Fully Prepared.exe'
$shortcut.WorkingDirectory = $installRoot
$shortcut.Description = 'Fully Prepared interview preparation'
$shortcut.Save()
Write-Output "Installed for this Windows user at $installRoot"
Write-Output "Start Menu shortcut: $shortcutPath"
Write-Output 'Your Electron profile and saved app data are kept separately from the installed program.'

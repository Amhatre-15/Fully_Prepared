$ErrorActionPreference = 'Stop'
$installRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Programs\Fully Prepared'))
$scriptRoot = (Resolve-Path $PSScriptRoot).Path
if (-not $scriptRoot.Equals($installRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Safety check failed: this uninstaller must run from $installRoot; no files were removed."
}
if (Get-Process -Name 'Fully Prepared' -ErrorAction SilentlyContinue) {
  throw 'Close Fully Prepared before uninstalling. No files were removed.'
}
$confirmation = Read-Host "Remove the installed app from $installRoot? Saved app data will be preserved. Type REMOVE to continue"
if ($confirmation -cne 'REMOVE') { Write-Output 'Uninstall canceled; no files were removed.'; exit 0 }
$shortcutPath = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Fully Prepared.lnk'
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
Remove-Item -LiteralPath $installRoot -Recurse -Force
Write-Output 'Fully Prepared was uninstalled. User data was preserved.'

param(
  [Parameter(Mandatory = $true)]
  [string]$PackagePath,
  [Parameter(Mandatory = $true)]
  [string]$CertificateThumbprint
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PackagePath).Path
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist'))
if (-not $packageRoot.StartsWith($distRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Signing target must be an existing package below $distRoot"
}

$thumbprint = ($CertificateThumbprint -replace '\s', '').ToUpperInvariant()
if ($thumbprint -notmatch '^[A-F0-9]{40}$') { throw 'Provide the 40-character thumbprint of your trusted code-signing certificate.' }
$certificate = Get-Item -LiteralPath "Cert:\CurrentUser\My\$thumbprint" -ErrorAction SilentlyContinue
if (-not $certificate -or -not $certificate.HasPrivateKey) { throw 'The signing certificate is not installed in the current user certificate store with its private key.' }
$codeSigningOid = '1.3.6.1.5.5.7.3.3'
if (-not ($certificate.EnhancedKeyUsageList | Where-Object { $_.ObjectId.Value -eq $codeSigningOid })) {
  throw 'The selected certificate does not include the code-signing extended key usage.'
}
$signTool = Get-Command 'signtool.exe' -ErrorAction SilentlyContinue
if (-not $signTool) { throw 'signtool.exe was not found. Install the Windows SDK signing tools and try again.' }

$targets = @(
  (Join-Path $packageRoot 'Fully Prepared.exe'),
  (Join-Path $packageRoot 'resources\whisper\whisper-server.exe')
)
foreach ($target in $targets) {
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Expected release executable is missing: $target" }
  & $signTool.Source sign /sha1 $thumbprint /fd SHA256 /td SHA256 /tr 'http://timestamp.digicert.com' $target
  if ($LASTEXITCODE -ne 0) { throw "signtool failed while signing $target (exit $LASTEXITCODE)" }
  & $signTool.Source verify /pa /all $target
  if ($LASTEXITCODE -ne 0) { throw "Signature verification failed for $target (exit $LASTEXITCODE)" }
}
Write-Output "Signed and verified $($targets.Count) Fully Prepared runtime executables."

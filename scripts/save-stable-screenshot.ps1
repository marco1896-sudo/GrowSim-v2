param(
  [Parameter(Mandatory = $true)]
  [string]$SourceImage,

  [string]$Label = "stable",
  [string]$TargetDir = "stable-change-screenshots",
  [int]$Keep = 3
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SourceImage)) {
  throw "Source image not found: $SourceImage"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$targetPath = Join-Path $repoRoot $TargetDir
if (-not (Test-Path $targetPath)) {
  New-Item -ItemType Directory -Path $targetPath | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeLabel = ($Label -replace '[^a-zA-Z0-9_-]', '_')
$destFile = Join-Path $targetPath ("{0}_{1}.png" -f $timestamp, $safeLabel)

Copy-Item -Path $SourceImage -Destination $destFile -Force

$files = Get-ChildItem -Path $targetPath -File | Sort-Object LastWriteTime -Descending
if ($files.Count -gt $Keep) {
  $files | Select-Object -Skip $Keep | Remove-Item -Force
}

Write-Output "Saved: $destFile"

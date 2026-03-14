$ErrorActionPreference = "Stop"

$imageGen = "C:\\Users\\Marco\\.codex\\skills\\imagegen\\scripts\\image_gen.py"
if (!(Test-Path $imageGen)) {
  throw "image_gen.py not found at $imageGen"
}

if (-not $env:OPENAI_API_KEY) {
  $userKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
  if (-not $userKey) {
    $userKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine")
  }
  if ($userKey) {
    $env:OPENAI_API_KEY = $userKey
  }
}

if (-not $env:OPENAI_API_KEY) {
  throw "OPENAI_API_KEY is missing in Process/User/Machine scope. Set it first, then rerun."
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  Write-Host $Label
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw ("Step failed with exit code {0}: {1}" -f $LASTEXITCODE, $Label)
  }
}

python -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('openai') else 1)"
if ($LASTEXITCODE -ne 0) {
  throw "Python package 'openai' is not installed. Run: python -m pip install openai pillow"
}

Write-Host "== Phase A-C mandatory generation =="
Invoke-Step "Generate mandatory assets" {
  python $imageGen generate-batch `
    --input dev/asset_pack/jobs/mandatory.jsonl `
    --out-dir . `
    --quality high `
    --background transparent `
    --output-format png `
    --model gpt-image-1.5 `
    --concurrency 2 `
    --max-attempts 4 `
    --force
}

Invoke-Step "Distribute generated files" { python dev/asset_pack/distribute_generated.py --strict }

Write-Host "== Split boards =="
Invoke-Step "Split icon boards" { python dev/asset_pack/split_boards.py --config dev/asset_pack/config/board_slices.json }
Invoke-Step "Sync pests subset" { python dev/asset_pack/sync_pests.py }

Write-Host "== Optional pack (enable if budget allows) =="
# Uncomment to run optional expansion:
# python $imageGen generate-batch --input dev/asset_pack/jobs/optional.jsonl --out-dir . --quality high --background transparent --output-format png --model gpt-image-1.5 --concurrency 1 --max-attempts 4 --force
# python dev/asset_pack/distribute_generated.py
# python dev/asset_pack/split_boards.py --config dev/asset_pack/config/board_slices.json --include-optional

Write-Host "== QC + sprite sheet =="
Invoke-Step "Run icon QC" { python dev/asset_pack/qc_icons.py }
Invoke-Step "Build sprite sheet" { python dev/asset_pack/build_sprite_sheet.py }

Write-Host "Pipeline complete."

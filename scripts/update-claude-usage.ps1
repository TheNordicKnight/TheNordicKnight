# Regenerates claude-usage/card.svg from local ccusage data and pushes the change
# to origin/main if it differs from what's already committed.
#
# Intended to be wired into Windows Task Scheduler (see README-SETUP.md).

$ErrorActionPreference = "Stop"

# Run from the repo root regardless of where Task Scheduler invoked us.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "[claude-usage] repo: $repoRoot"

# 1. Grab daily usage as JSON. `ccusage daily --json` emits the shape our
#    renderer expects. Using `npx ccusage@latest` avoids needing a global install.
Write-Host "[claude-usage] running ccusage..."
$usageJson = & npx --yes ccusage@latest daily --json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $usageJson) {
    Write-Error "ccusage failed (exit $LASTEXITCODE). Is Node installed and ~/.claude populated?"
    exit 1
}

# 2. Pipe the JSON into the SVG renderer.
Write-Host "[claude-usage] rendering SVG..."
$usageJson | node scripts/render-usage-card.mjs claude-usage/card.svg
if ($LASTEXITCODE -ne 0) {
    Write-Error "render-usage-card.mjs failed (exit $LASTEXITCODE)"
    exit 1
}

# 3. Commit and push only if the SVG actually changed.
$status = git status --porcelain claude-usage/card.svg
if (-not $status) {
    Write-Host "[claude-usage] no changes, nothing to commit."
    exit 0
}

Write-Host "[claude-usage] committing and pushing..."
git add claude-usage/card.svg
git commit -m "chore: update claude usage card"
git push origin main
Write-Host "[claude-usage] done."

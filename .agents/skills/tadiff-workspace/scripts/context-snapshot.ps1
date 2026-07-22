param(
    [string]$Repository = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $Repository

Write-Output "# TaDiff context snapshot"
Write-Output ""
Write-Output "## Git"
git status --short --branch

Write-Output ""
Write-Output "## Recent commits"
git log -5 --oneline

Write-Output ""
Write-Output "## Latest migrations"
Get-ChildItem -LiteralPath "sql" -Filter "*.sql" |
    Where-Object { $_.Name -match "^\d+_" } |
    Sort-Object Name |
    Select-Object -Last 10 -ExpandProperty Name

Write-Output ""
Write-Output "## Coordination files"
foreach ($path in @("AGENTS.md", "docs/ai/PROJECT_STATE.md", "docs/ai/HANDOFF.md")) {
    $state = if (Test-Path -LiteralPath $path) { "present" } else { "missing" }
    Write-Output "$path : $state"
}

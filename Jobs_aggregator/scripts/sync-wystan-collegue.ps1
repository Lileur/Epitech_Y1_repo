# Sync wystan apres merge resolu — conserve le travail local puis fusionne.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/sync-wystan-collegue.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== 1. Sauvegarde de ton travail actuel ===" -ForegroundColor Cyan
if (Test-Path .git/MERGE_HEAD) {
    git merge --abort
    Write-Host "Merge en cours annule."
}

$hasChanges = git status --porcelain
if ($hasChanges) {
    git add -A
    git commit -m "WIP: sauvegarde locale avant sync wystan" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Rien de nouveau a committer ou commit deja fait."
    }
}

$backupName = "sauvegarde-local-$(Get-Date -Format 'yyyyMMdd-HHmm')"
git branch $backupName 2>$null
Write-Host "Branche de secours creee: $backupName"

Write-Host "`n=== 2. Recuperation wystan propre (sans conflits) ===" -ForegroundColor Cyan
git fetch origin
git checkout wystan
git reset --hard origin/wystan

Write-Host "`n=== 3. Reintegration de ta sauvegarde ===" -ForegroundColor Cyan
git merge $backupName --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nConflits detectes: garde la logique metier (Incoming) mais en import + MySQL (db.execute avec ?)." -ForegroundColor Yellow
    Write-Host "Puis: git add . ; git commit -m 'merge: mon travail sur wystan a jour'"
    exit 1
}

Write-Host "`n=== 4. Backend ===" -ForegroundColor Cyan
Push-Location backend
npm install
npm run migrate
Pop-Location

Write-Host "`n=== Termine. Redemarre VS Code. ===" -ForegroundColor Green
Write-Host "Branches de secours sur GitHub: sauvegarde-mon-travail, sauvegarde-wystan-avant-merge"

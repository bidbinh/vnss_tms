# Run Alembic migrations locally
# Usage: .\run_migration.ps1 [upgrade|downgrade|history|current]

param(
    [string]$Command = "upgrade"
)

$env:DATABASE_URL = "postgresql+psycopg://postgres:!Tnt01087@localhost:5432/tms"

Set-Location $PSScriptRoot

switch ($Command.ToLower()) {
    "upgrade" {
        Write-Host "Upgrading database to latest..." -ForegroundColor Yellow
        alembic upgrade head
    }
    "downgrade" {
        Write-Host "Downgrading database by 1 revision..." -ForegroundColor Yellow
        alembic downgrade -1
    }
    "history" {
        Write-Host "Migration history:" -ForegroundColor Yellow
        alembic history --verbose
    }
    "current" {
        Write-Host "Current revision:" -ForegroundColor Yellow
        alembic current
    }
    default {
        Write-Host "Usage: .\run_migration.ps1 [upgrade|downgrade|history|current]" -ForegroundColor Red
    }
}

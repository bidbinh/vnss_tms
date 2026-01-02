# Create new Alembic migration
# Usage: .\create_migration.ps1 "description of changes"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$env:DATABASE_URL = "postgresql+psycopg://postgres:!Tnt01087@localhost:5432/tms"

Write-Host "Creating migration: $Message" -ForegroundColor Yellow
Set-Location $PSScriptRoot

# Run alembic revision
alembic revision --autogenerate -m "$Message"

Write-Host ""
Write-Host "Migration created! Check alembic/versions/ for the new file." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the migration file" -ForegroundColor White
Write-Host "  2. Test locally: alembic upgrade head" -ForegroundColor White
Write-Host "  3. Deploy: .\ops\scripts\deploy.ps1 backend" -ForegroundColor White

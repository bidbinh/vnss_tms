# Run TMS Automation Migrations
# This script runs the database migrations for TMS automation fields

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TMS Automation - Run Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "alembic.ini")) {
    Write-Host "Error: alembic.ini not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Try to find Python
$python = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $python = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $python = "py"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $python = "python3"
} else {
    Write-Host "Error: Python not found. Please install Python or activate your virtual environment." -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $python" -ForegroundColor Green
Write-Host ""

# Check current migration
Write-Host "Checking current migration status..." -ForegroundColor Yellow
& $python -m alembic current
Write-Host ""

# Show pending migrations
Write-Host "Pending migrations:" -ForegroundColor Yellow
& $python -m alembic heads
Write-Host ""

# Ask for confirmation
$confirm = Read-Host "Do you want to run migrations? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

# Run migrations
Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Yellow
& $python -m alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your backend server" -ForegroundColor White
    Write-Host "2. Test the Orders page" -ForegroundColor White
    Write-Host "3. (Optional) Run populate_coordinates.py to populate location coordinates" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}

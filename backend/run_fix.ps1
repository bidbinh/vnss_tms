# Auto-fix missing columns
# This script will find Python and run the fix script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX MISSING COLUMNS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try to find Python
$python = $null
$pythonPaths = @(
    "python",
    "py",
    "python3",
    "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe",
    "$env:PROGRAMFILES\Python*\python.exe",
    "C:\Python*\python.exe"
)

foreach ($path in $pythonPaths) {
    if ($path -like "*\*") {
        # Wildcard path
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $python = $found.FullName
            break
        }
    } else {
        # Direct command
        $cmd = Get-Command $path -ErrorAction SilentlyContinue
        if ($cmd) {
            $python = $cmd.Name
            break
        }
    }
}

if (-not $python) {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python or activate your virtual environment first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run SQL directly in PostgreSQL:" -ForegroundColor Yellow
    Write-Host "ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';" -ForegroundColor White
    Write-Host "CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);" -ForegroundColor White
    exit 1
}

Write-Host "Found Python: $python" -ForegroundColor Green
Write-Host ""

# Change to backend directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Run fix script
Write-Host "Running fix script..." -ForegroundColor Yellow
Write-Host ""

& $python fix_all_columns.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ FIX COMPLETED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please restart your backend server now!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ FIX FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error above or run SQL directly." -ForegroundColor Yellow
}

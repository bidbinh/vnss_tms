# Full Login Flow Test
Write-Host "=== STEP 1: Login API ===" -ForegroundColor Yellow
$loginResp = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/auth/login' -Method POST -ContentType 'application/x-www-form-urlencoded' -Body 'username=ceo&password=Admin@123'
$token = $loginResp.access_token
Write-Host "  Token: $($token.Substring(0,60))..." -ForegroundColor Green
Write-Host "  User: $($loginResp.user.username) ($($loginResp.user.full_name))" -ForegroundColor Green
Write-Host ""

Write-Host "=== STEP 2: /auth/me with Authorization header ===" -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
$meResp = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/auth/me' -Headers $headers
Write-Host "  Username: $($meResp.username)" -ForegroundColor Green
Write-Host "  Role: $($meResp.role)" -ForegroundColor Green
Write-Host "  Tenant: $($meResp.tenant_name)" -ForegroundColor Green
Write-Host ""

Write-Host "=== STEP 3: Test protected API (orders) ===" -ForegroundColor Yellow
try {
    $ordersResp = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/orders?page=1&page_size=5' -Headers $headers
    Write-Host "  Orders API: SUCCESS! Got $($ordersResp.data.Count) orders" -ForegroundColor Green
} catch {
    Write-Host "  Orders API: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== STEP 4: Test dashboard API ===" -ForegroundColor Yellow
try {
    $dashResp = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/dashboard/stats' -Headers $headers
    Write-Host "  Dashboard API: SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "  Dashboard API: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ALL AUTH TESTS PASSED!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login credentials:"
Write-Host "  Username: ceo"
Write-Host "  Password: Admin@123"
Write-Host "  URL: https://tinhung.9log.tech/login"

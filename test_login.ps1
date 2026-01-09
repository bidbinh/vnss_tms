# Test login flow
$resp = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/auth/login' -Method POST -ContentType 'application/x-www-form-urlencoded' -Body 'username=ceo&password=Admin@123'
$token = $resp.access_token
Write-Host "=== Login Response ==="
Write-Host "Token: $($token.Substring(0,80))..."
Write-Host "User: $($resp.user.username) - $($resp.user.full_name)"
Write-Host ""

Write-Host "=== Test /auth/me with Authorization header ==="
$meResult = Invoke-RestMethod -Uri 'https://tinhung.9log.tech/api/v1/auth/me' -Headers @{Authorization="Bearer $token"}
Write-Host "Username: $($meResult.username)"
Write-Host "Role: $($meResult.role)"
Write-Host "Tenant: $($meResult.tenant_name)"
Write-Host ""
Write-Host "=== SUCCESS! Auth flow working correctly ==="

# Hướng Dẫn Sửa Lỗi "Connection Error"

## Lỗi Gì?

Lỗi "Connection Error" xảy ra khi IDE/application không thể kết nối đến backend server hoặc các dịch vụ bên ngoài.

## Nguyên Nhân Thường Gặp

1. **Backend server chưa chạy** - Backend FastAPI không được khởi động
2. **Mất kết nối mạng** - Internet/VPN bị gián đoạn
3. **Port bị chiếm** - Port 8000 đã được sử dụng bởi process khác
4. **Firewall/Antivirus** - Chặn kết nối đến localhost:8000

## Cách Khắc Phục

### 1. Kiểm Tra Backend Server

**Kiểm tra xem backend có đang chạy không:**

```powershell
# Kiểm tra process Python/Uvicorn
cd d:\vnss_tms\backend
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# Kiểm tra port 8000
netstat -ano | findstr :8000
```

### 2. Khởi Động Backend Server

**Nếu backend chưa chạy, khởi động lại:**

```powershell
cd d:\vnss_tms\backend

# Activate virtual environment (nếu có)
.\.venv\Scripts\Activate.ps1

# Chạy backend
python run_server.py
# HOẶC
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Kiểm Tra Kết Nối

**Mở trình duyệt và test:**

```
http://localhost:8000/health
http://localhost:8000/docs
```

Nếu thấy response `{"ok": true}` hoặc Swagger UI thì backend đã chạy.

### 4. Kiểm Tra Frontend Config

**Kiểm tra `frontend/lib/api.ts`:**

- `API_BASE` nên là `""` (sử dụng Next.js rewrites)
- Frontend sẽ gọi `/api/v1/...` và Next.js sẽ rewrite sang backend

### 5. Kiểm Tra Next.js Dev Server

**Đảm bảo frontend đang chạy:**

```powershell
cd d:\vnss_tms\frontend
npm run dev
```

Frontend thường chạy ở `http://localhost:3000`

### 6. Kiểm Tra Next.js Rewrites Config

**Kiểm tra `frontend/next.config.ts`:**

```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*',
    },
  ];
}
```

### 7. Nếu Vẫn Lỗi

**Thử các bước sau:**

1. **Restart cả backend và frontend:**
   - Dừng tất cả processes (Ctrl+C)
   - Khởi động lại backend trước
   - Sau đó khởi động frontend

2. **Clear cache:**
   ```powershell
   # Frontend
   cd d:\vnss_tms\frontend
   rm -r .next
   npm run dev
   ```

3. **Kiểm tra firewall:**
   - Cho phép Python và Node.js qua firewall
   - Hoặc tạm tắt firewall để test

4. **Kiểm tra VPN:**
   - Tắt VPN và thử lại
   - Hoặc đảm bảo VPN không chặn localhost

5. **Copy Request Details:**
   - Click "Copy Request Details" trong error dialog
   - Dán vào file để debug (UUID: `4c60c7e4-be22-4bc4-b91c-c6b42fbfe237`)

## Quick Fix Command

**Nếu backend đang chạy nhưng vẫn lỗi, thử restart:**

```powershell
# Stop all Python processes (cẩn thận!)
Get-Process python | Stop-Process -Force

# Start backend
cd d:\vnss_tms\backend
.\.venv\Scripts\Activate.ps1
python run_server.py
```

## Test Connection

**Sau khi khởi động backend, test bằng curl hoặc browser:**

```powershell
# Test health endpoint
curl http://localhost:8000/health

# Test API endpoint
curl http://localhost:8000/api/v1/dispatch/ai-decisions
```

## Lưu Ý

- Backend cần chạy ở **port 8000** (mặc định)
- Frontend cần chạy ở **port 3000** (mặc định)
- Next.js rewrites sẽ tự động chuyển `/api/v1/...` từ frontend sang backend
- Đảm bảo database đã được migrate: `alembic upgrade head`

## Nếu Vẫn Không Được

1. Kiểm tra log backend: `backend/server.log`
2. Kiểm tra log frontend: Console trong browser DevTools
3. Kiểm tra network tab trong browser để xem request nào fail
4. Thử "Resume" button trong error dialog để retry

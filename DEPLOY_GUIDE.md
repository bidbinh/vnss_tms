# 🚀 Hướng Dẫn Deploy VNSS TMS

## Tổng Quan Thay Đổi Mới Nhất

### Backend Changes:
- ✅ **Driver Payroll Model** - Workflow đơn giản hóa
- ✅ **Migration** - Thêm bảng `driver_payroll` với adjustments
- ✅ **API Endpoints** - HRM và Mobile endpoints
- ✅ **Distance Locking** - Khóa distance_km sau khi xác nhận

### Frontend Changes:
- ✅ **Driver Payroll Page** - `/hrm/driver-payroll`
- ✅ **Navigation** - Thêm vào HRM sidebar
- ✅ **Translations** - Vietnamese + English

---

## 📋 Yêu Cầu Deploy

1. **SSH Access** đến server `9log.tech`
2. **Quyền sudo** để restart services
3. **Git** đã được cấu hình trên server

---

## 🔧 Deploy Backend

### Bước 1: SSH vào server
```bash
ssh root@9log.tech
# hoặc
ssh your-user@9log.tech
```

### Bước 2: Pull code mới nhất
```bash
cd ~/apps/vnss_tms
git pull origin main
```

### Bước 3: Cài đặt dependencies và chạy migration
```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Running upgrade ... -> 20260115_0000, Add driver_payroll table
```

### Bước 4: Restart backend service
```bash
# Restart service
sudo systemctl restart vnss-tms-backend

# Check status
sudo systemctl status vnss-tms-backend

# View logs (optional)
sudo journalctl -u vnss-tms-backend -f --lines=50
```

### Bước 5: Verify backend
```bash
# Test health endpoint
curl https://api.9log.tech/health

# Test driver payroll endpoint (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.9log.tech/api/v1/hrm/driver-payroll
```

---

## 🎨 Deploy Frontend

### Bước 1: Install dependencies và build
```bash
cd ~/apps/vnss_tms/frontend

# Install dependencies
npm install

# Build production
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Static pages generated
```

### Bước 2: Restart frontend service
```bash
# Restart PM2 process
pm2 restart vnss-tms-frontend

# Check status
pm2 status

# View logs (optional)
pm2 logs vnss-tms-frontend --lines 50
```

### Bước 3: Verify frontend
```bash
# Test homepage
curl -I https://9log.tech

# Test driver payroll page (should return 200)
curl -I https://9log.tech/hrm/driver-payroll
```

---

## ✅ Verification Checklist

### Backend:
- [ ] Git pull thành công
- [ ] Migration chạy thành công (không có lỗi)
- [ ] Backend service restart thành công
- [ ] Health check trả về status OK
- [ ] API `/hrm/driver-payroll` accessible

### Frontend:
- [ ] npm build thành công (không có TypeScript errors)
- [ ] PM2 restart thành công
- [ ] Truy cập `https://9log.tech` OK
- [ ] Trang `/hrm/driver-payroll` hiển thị đúng
- [ ] Navigation sidebar có link "Bảng lương tài xế"

---

## 🐛 Troubleshooting

### Issue 1: Migration Failed - Table Already Exists
**Error:**
```
sqlalchemy.exc.ProgrammingError: relation "driver_payroll" already exists
```

**Solution:**
```bash
cd ~/apps/vnss_tms/backend
source venv/bin/activate

# Check if table exists
psql -U postgres -d vnss_tms -c "\dt driver_payroll"

# If exists, mark migration as already applied
alembic stamp 20260115_0000
```

### Issue 2: Migration Failed - Column Already Exists
**Error:**
```
column "adjustments" of relation "driver_payroll" already exists
```

**Solution:**
Bảng đã có column mới. Migration đã chạy rồi:
```bash
alembic stamp head
```

### Issue 3: Backend Won't Start
**Check logs:**
```bash
sudo journalctl -u vnss-tms-backend -n 100 --no-pager
```

**Common issues:**
- Import errors → Chạy lại `pip install -r requirements.txt`
- Database connection → Kiểm tra PostgreSQL running
- Port conflicts → Kiểm tra port 8000 có bị chiếm

### Issue 4: Frontend Build Errors
**Error:**
```
Type error: Property 'total_trip_salary' does not exist on type 'DriverPayroll'
```

**Solution:**
Schema mismatch. Đảm bảo backend đã deploy trước:
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Issue 5: 404 on Driver Payroll Page
**Check:**
1. Frontend đã build với code mới chưa
2. PM2 đã restart chưa
3. Browser cache → Hard refresh (Ctrl+Shift+R)

---

## 🔍 Testing Guide

### 1. Test Backend API

#### Get Driver Payroll List:
```bash
curl -X GET "https://api.9log.tech/api/v1/hrm/driver-payroll" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Create Driver Payroll:
```bash
curl -X POST "https://api.9log.tech/api/v1/hrm/driver-payroll/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRIVER_UUID",
    "year": 2025,
    "month": 1,
    "notes": "Test payroll"
  }'
```

### 2. Test Frontend

1. **Login** với tài khoản DISPATCHER/ADMIN
2. **Navigate**: HRM > Payroll > Bảng lương tài xế
3. **Test Create**:
   - Click "Tạo Bảng Lương"
   - Chọn tài xế, tháng, năm
   - Submit
   - Kiểm tra có tạo thành công
4. **Test Filters**:
   - Filter by year
   - Filter by month
   - Filter by driver
   - Filter by status
5. **Test View Details**:
   - Click "Xem" trên một bảng lương
   - Kiểm tra hiển thị trip details

---

## 📊 Database Schema Changes

### New Table: `driver_payroll`

```sql
CREATE TABLE driver_payroll (
    id VARCHAR PRIMARY KEY,
    tenant_id VARCHAR NOT NULL,
    driver_id VARCHAR NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    workflow_instance_id VARCHAR,

    -- Snapshots
    trip_snapshot JSON,
    adjustments JSON,

    -- Totals
    total_trips INTEGER DEFAULT 0,
    total_distance_km INTEGER DEFAULT 0,
    total_trip_salary INTEGER DEFAULT 0,
    total_adjustments INTEGER DEFAULT 0,
    total_bonuses INTEGER DEFAULT 0,
    total_deductions INTEGER DEFAULT 0,
    net_salary INTEGER DEFAULT 0,

    -- Workflow
    created_by_id VARCHAR NOT NULL,
    submitted_at TIMESTAMP,
    confirmed_by_driver_at TIMESTAMP,
    confirmed_by_hr_at TIMESTAMP,
    paid_at TIMESTAMP,

    -- Notes
    notes VARCHAR(2000),
    driver_notes VARCHAR(2000),
    hr_notes VARCHAR(2000),

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    UNIQUE(tenant_id, driver_id, year, month)
);
```

---

## 🎯 Quick Deploy Script

Nếu muốn deploy nhanh, tạo file `~/deploy.sh` trên server:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying VNSS TMS..."

cd ~/apps/vnss_tms

# Pull latest code
echo "📥 Pulling code..."
git pull origin main

# Backend
echo "📦 Deploying backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head
sudo systemctl restart vnss-tms-backend
echo "✅ Backend deployed"

# Frontend
echo "🎨 Deploying frontend..."
cd ../frontend
npm install
npm run build
pm2 restart vnss-tms-frontend
echo "✅ Frontend deployed"

echo "🎉 Deploy completed!"
```

Chạy:
```bash
chmod +x ~/deploy.sh
~/deploy.sh
```

---

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `sudo journalctl -u vnss-tms-backend -f`
2. Check PM2 logs: `pm2 logs vnss-tms-frontend`
3. Check database: `psql -U postgres -d vnss_tms`

---

## ✨ Summary

**Deployed:**
- ✅ Driver Payroll Management System
- ✅ Distance Locking Mechanism
- ✅ HRM + Mobile APIs
- ✅ Frontend UI với filters và modals
- ✅ Translations (vi + en)

**URLs:**
- Backend API: https://api.9log.tech
- Frontend: https://9log.tech
- Driver Payroll Page: https://9log.tech/hrm/driver-payroll

# 🔴 Fix Error Ngay: column orders.priority does not exist

## ⚡ Cách Fix Nhanh Nhất

### Option 1: Chạy Python Script (Khuyến nghị)

```powershell
cd backend
python scripts\fix_priority_column.py
```

Hoặc nếu dùng `py`:
```powershell
cd backend
py scripts\fix_priority_column.py
```

Script này sẽ:
- ✅ Tự động check và add tất cả missing columns
- ✅ Add priority column (fix lỗi hiện tại)
- ✅ Add tất cả columns khác cho automation
- ✅ Verify sau khi fix

---

### Option 2: Chạy SQL Trực Tiếp

Mở PostgreSQL client (pgAdmin, DBeaver, hoặc psql) và chạy:

```sql
-- FIX LỖI HIỆN TẠI (Priority column)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);

-- Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'priority';
```

Nếu muốn fix tất cả columns một lúc, chạy file:
```sql
-- File: backend/scripts/fix_missing_columns.sql
```

---

### Option 3: Chạy Migration (Nếu có Python/Alembic)

```powershell
cd backend
# Activate venv nếu có
.\venv\Scripts\activate

# Run migration
alembic upgrade head
```

---

## ✅ Sau Khi Fix

1. **Restart backend server** (QUAN TRỌNG!)
2. **Refresh Orders page** trong browser
3. **Kiểm tra** - Lỗi sẽ biến mất

---

## 🔍 Nếu Vẫn Lỗi

Kiểm tra xem backend có đang chạy không:
```powershell
# Check backend process
Get-Process python | Where-Object {$_.Path -like "*vnss_tms*"}
```

Nếu backend đang chạy, **phải restart** sau khi add columns!

---

*Fix Guide - 2026-01-18*

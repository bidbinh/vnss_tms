# 🔧 Quick Fix: Column orders.priority does not exist

## ⚡ Giải Pháp Nhanh

Lỗi này xảy ra vì **migration chưa được chạy**. Model đã có field `priority` nhưng database chưa có column.

---

## ✅ Cách 1: Chạy Migration (Khuyến nghị)

### Windows PowerShell:
```powershell
cd backend
.\run_migration.ps1
```

### Hoặc thủ công:
```bash
cd backend
# Activate venv nếu có
.\venv\Scripts\activate

# Run migration
alembic upgrade head
# hoặc
python -m alembic upgrade head
```

---

## ✅ Cách 2: Chạy SQL Trực Tiếp (Nếu migration không chạy được)

1. **Mở PostgreSQL client** (pgAdmin, DBeaver, hoặc psql)

2. **Chạy SQL script:**
   ```sql
   -- File: backend/scripts/fix_missing_columns.sql
   ```
   
   Hoặc chạy trực tiếp:
   ```sql
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
   CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);
   ```

3. **Kiểm tra:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'orders' AND column_name = 'priority';
   ```

---

## ✅ Cách 3: Chạy Tất Cả Columns (Full Fix)

Chạy file SQL: `backend/scripts/fix_missing_columns.sql`

Script này sẽ:
- ✅ Add `priority` column (fix lỗi hiện tại)
- ✅ Add tất cả columns khác cho automation
- ✅ Set default values
- ✅ Create indexes

---

## 🔍 Kiểm Tra Sau Khi Fix

```sql
-- Check priority column
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'priority';
```

Kết quả mong đợi:
```
column_name | data_type | column_default
------------|-----------|----------------
priority    | character varying(20) | 'NORMAL'::character varying
```

---

## 🚀 Sau Khi Fix

1. **Restart backend server**
2. **Refresh Orders page** - Lỗi sẽ biến mất ✅
3. **Test automation** (optional)

---

## 📝 Lưu Ý

- Migration script đã được tạo sẵn trong `backend/alembic/versions/`
- Nếu migration không chạy được, dùng SQL script
- Sau khi fix, có thể populate coordinates: `python -m scripts.populate_coordinates`

---

*Quick Fix Guide - 2026-01-18*

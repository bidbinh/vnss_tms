# ⚡ FIX NHANH NHẤT - Column orders.priority does not exist

## 🔥 Cách Nhanh Nhất (30 giây)

### Chạy SQL Trực Tiếp trong PostgreSQL

Mở **pgAdmin** hoặc **DBeaver** hoặc **psql** và chạy:

```sql
-- Fix lỗi priority column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);
```

**Xong!** Sau đó **restart backend** và refresh page.

---

## 📁 Hoặc Chạy File SQL

File: `backend/QUICK_FIX.sql`

1. Mở PostgreSQL client
2. Connect vào database
3. Mở file `backend/QUICK_FIX.sql`
4. Run toàn bộ file
5. Restart backend

---

## ✅ Sau Khi Fix

**BẮT BUỘC:** Restart backend server!

1. Dừng backend (Ctrl+C)
2. Start lại backend  
3. Refresh Orders page
4. Lỗi sẽ hết

---

## 🔍 Verify

Chạy SQL này để kiểm tra:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'priority';
```

Nếu thấy kết quả có `priority` → **ĐÃ FIX XONG!**

---

*Quick Fix Guide - 2026-01-18*

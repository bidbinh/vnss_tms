# VNSS TMS - Hướng dẫn Deploy lên VPS

## Yêu cầu VPS

- **OS**: Ubuntu 22.04 LTS (khuyến nghị)
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **Storage**: Tối thiểu 20GB SSD
- **Port**: Mở port 80, 443

## Bước 1: Chuẩn bị VPS

SSH vào VPS và cài đặt Docker:

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose
sudo apt install docker-compose-plugin -y

# Thêm user vào docker group (không cần sudo)
sudo usermod -aG docker $USER

# Logout và login lại để apply
exit
```

## Bước 2: Trỏ Domain về VPS

Vào quản lý DNS của domain và tạo record:

```
Type: A
Name: @ (hoặc tên miền gốc)
Value: [IP_VPS_CỦA_BẠN]
TTL: 300

Type: A
Name: www
Value: [IP_VPS_CỦA_BẠN]
TTL: 300
```

**Lưu ý**: Đợi 5-15 phút để DNS propagate

## Bước 3: Upload code lên VPS

### Cách 1: Dùng Git (khuyến nghị)

```bash
# Trên VPS
cd /home/$USER
git clone https://github.com/your-repo/vnss_tms.git
cd vnss_tms/ops
```

### Cách 2: Dùng SCP/SFTP

```bash
# Trên máy local (Windows PowerShell)
scp -r D:\vnss_tms user@your-vps-ip:/home/user/
```

## Bước 4: Cấu hình Environment

```bash
cd /home/$USER/vnss_tms/ops

# Copy file env mẫu
cp .env.production.example .env.production

# Chỉnh sửa file env
nano .env.production
```

**Điền các giá trị sau:**

```env
# Domain của bạn
DOMAIN=your-domain.com

# Database password (đặt password mạnh)
DB_PASSWORD=MySecurePassword123!

# Secret key (tạo random string dài)
SECRET_KEY=your-very-long-random-string-at-least-32-characters

# MinIO password
MINIO_PASSWORD=MinioSecure123!

# Claude API key (nếu dùng AI features)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Tạo SECRET_KEY ngẫu nhiên:**
```bash
openssl rand -hex 32
```

## Bước 5: Cập nhật Nginx config

```bash
# Thay YOUR_DOMAIN.com bằng domain thật
sed -i 's/YOUR_DOMAIN.com/your-domain.com/g' nginx/nginx.conf
```

## Bước 6: Deploy

### Cách nhanh (dùng script):

```bash
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

### Cách thủ công (từng bước):

```bash
# 1. Tạo thư mục cần thiết
mkdir -p certbot/conf certbot/www

# 2. Dùng nginx config không SSL trước
cp nginx/nginx.init.conf nginx/nginx.conf

# 3. Start database trước
docker compose -f docker-compose.prod.yml --env-file .env.production up -d db redis minio

# Đợi database ready (khoảng 30s)
sleep 30

# 4. Start backend và frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend frontend nginx

# 5. Kiểm tra services đang chạy
docker compose -f docker-compose.prod.yml ps

# 6. Lấy SSL certificate từ Let's Encrypt
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    --email admin@your-domain.com \
    --agree-tos \
    --no-eff-email \
    -d your-domain.com

# 7. Bật SSL trong nginx
# Copy lại nginx.conf gốc (có SSL)
# Chỉnh sửa domain rồi reload
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Bước 7: Kiểm tra

```bash
# Kiểm tra tất cả containers đang chạy
docker compose -f docker-compose.prod.yml ps

# Xem logs nếu có lỗi
docker compose -f docker-compose.prod.yml logs -f

# Xem logs của service cụ thể
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

Truy cập:
- **Web App**: https://your-domain.com
- **API Docs**: https://your-domain.com/api/docs

## Các lệnh hữu ích

```bash
# Khởi động lại tất cả services
docker compose -f docker-compose.prod.yml restart

# Dừng tất cả
docker compose -f docker-compose.prod.yml down

# Rebuild và deploy lại (sau khi update code)
docker compose -f docker-compose.prod.yml up -d --build

# Xem log realtime
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Vào shell của container
docker compose -f docker-compose.prod.yml exec backend bash
docker compose -f docker-compose.prod.yml exec db psql -U tms
```

## Backup Database

```bash
# Tạo backup
docker compose -f docker-compose.prod.yml exec db \
    pg_dump -U tms tms > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U tms
```

## Troubleshooting

### 1. Không truy cập được web
```bash
# Kiểm tra nginx đang chạy
docker compose -f docker-compose.prod.yml ps nginx

# Kiểm tra port 80/443
sudo netstat -tlnp | grep -E ':80|:443'

# Kiểm tra firewall
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### 2. Lỗi SSL certificate
```bash
# Thử lấy cert lại (dry-run)
docker compose -f docker-compose.prod.yml run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    --dry-run \
    -d your-domain.com
```

### 3. Backend không connect được database
```bash
# Kiểm tra database đang chạy
docker compose -f docker-compose.prod.yml logs db

# Kiểm tra connection
docker compose -f docker-compose.prod.yml exec backend \
    python -c "from app.db.session import engine; print('OK')"
```

### 4. Upload ảnh không được
```bash
# Kiểm tra MinIO
docker compose -f docker-compose.prod.yml logs minio

# Tạo bucket nếu chưa có
docker compose -f docker-compose.prod.yml exec minio \
    mc alias set local http://localhost:9000 minio miniostorage
docker compose -f docker-compose.prod.yml exec minio \
    mc mb local/tms --ignore-existing
```

## Cập nhật ứng dụng

Khi có code mới:

```bash
cd /home/$USER/vnss_tms

# Pull code mới
git pull origin main

# Rebuild và restart
cd ops
docker compose -f docker-compose.prod.yml up -d --build

# Hoặc chỉ rebuild service cụ thể
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml up -d --build frontend
```

## Tự động renew SSL

SSL của Let's Encrypt hết hạn sau 90 ngày. Certbot service trong docker-compose sẽ tự động renew. Kiểm tra:

```bash
# Test renew
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

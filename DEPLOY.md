# Hướng dẫn Deploy vnss_tms

## Deploy nhanh (1 lệnh duy nhất)

```cmd
.\push-deploy.bat
```

Hoặc trong terminal:
```cmd
git add . && git commit -m "Update" && git push && ssh root@130.176.20.95 "cd /home/tms && ./deploy.sh"
```

---

## Chi tiết từng bước (nếu cần debug)

### Bước 1: Push code từ Local
```cmd
git add .
git commit -m "Mô tả thay đổi"
git push origin main
```

### Bước 2: SSH vào Server
```cmd
ssh root@130.176.20.95
```

### Bước 3: Pull code và restart
```bash
cd /home/tms
./deploy.sh
```

---

## Kiểm tra sau deploy

### Check backend
```bash
docker compose logs -f backend --tail=50
```

### Check frontend
```bash
pm2 logs frontend --lines 50
```

### Check services đang chạy
```bash
docker compose ps
pm2 status
```

---

## Troubleshooting

### Backend không start
```bash
cd /home/tms
docker compose down backend
docker compose up -d backend
docker compose logs -f backend
```

### Frontend không start
```bash
cd /home/tms/frontend
pm2 delete frontend
npm run build
pm2 start "npm run start" --name frontend
```

### Database migration
```bash
cd /home/tms/backend
alembic upgrade head
```

---

## URLs

- **Frontend**: https://9log.vn hoặc http://130.176.20.95:3000
- **Backend API**: https://api.9log.vn hoặc http://130.176.20.95:8000
- **API Docs**: https://api.9log.vn/docs

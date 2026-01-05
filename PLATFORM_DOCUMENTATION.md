# VNSS TMS Platform Documentation

## Tài liệu tổng quan về hệ thống 9LOG - Multi-tenant SaaS ERP for Logistics

---

## 1. THÔNG TIN ĐĂNG NHẬP TEST

### Admin Account
- **Username**: `admin`
- **Password**: `Tnt01087`

### Driver Account (để test mobile app)
- Sử dụng số điện thoại của driver trong hệ thống
- Password mặc định: `Tnt01087` (hoặc liên hệ admin để tạo account)

### URL
- **Production**: https://9log.tech
- **API**: https://api.9log.tech (hoặc tenant-specific: https://abc.9log.tech)
- **Dev**: http://localhost:3000 (frontend), http://localhost:8001 (backend)

---

## 2. TỔNG QUAN HỆ THỐNG

### Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                      9LOG SUPER APP ECOSYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js 16)  │  BACKEND (FastAPI)  │  MOBILE (React Native)│
│  Web Dashboard          │  RESTful API v1     │  Multi-role Super App │
│  TMS/CRM/HRM/WMS/ACC    │  PostgreSQL DB      │  Driver/Dispatcher/Mgr│
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | FastAPI, Python 3.11, SQLModel, Alembic |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **Mobile** | React Native 0.83, React Navigation v7 |
| **AI** | Anthropic Claude API |
| **Deploy** | Docker Compose, PM2 |

---

## 3. CẤU TRÚC THƯ MỤC

```
vnss_tms/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/routes/     # API endpoints (~50+ modules)
│   │   ├── models/            # SQLModel database models
│   │   ├── core/              # Config, security, middleware
│   │   ├── services/          # Business logic services
│   │   └── main.py            # FastAPI entry point
│   ├── alembic/               # Database migrations
│   └── requirements.txt
│
├── frontend/                   # Next.js Frontend
│   ├── app/
│   │   ├── (protected)/       # Authenticated routes
│   │   │   ├── tms/           # Transportation module
│   │   │   ├── hrm/           # HR module
│   │   │   ├── crm/           # CRM module
│   │   │   └── admin/         # Admin module
│   │   └── login/             # Public login page
│   ├── components/            # React components
│   ├── lib/                   # Utilities, API client
│   └── contexts/              # React contexts
│
├── mobile/                     # React Native Mobile App
│   ├── src/
│   │   ├── screens/           # Screen components
│   │   │   ├── driver/        # Driver-specific screens
│   │   │   ├── dispatcher/    # Dispatcher screens
│   │   │   ├── manager/       # Manager screens
│   │   │   └── sales/         # Sales screens
│   │   ├── navigation/        # React Navigation setup
│   │   ├── services/          # API services
│   │   └── contexts/          # Auth, Tenant contexts
│   ├── android/               # Android native
│   └── ios/                   # iOS native
│
└── ops/                        # DevOps configuration
    ├── docker-compose.yml
    └── docker-compose.prod.yml
```

---

## 4. CÁC MODULE CHÍNH

### 4.1 TMS - Transportation Management System

**Chức năng:**
- Quản lý đơn hàng (Orders)
- Lập kế hoạch chuyến (Trips)
- Quản lý tài xế (Drivers)
- Quản lý đội xe (Vehicles, Tractors, Trailers)
- Theo dõi nhiên liệu (Fuel Logs)
- Bảo trì xe (Maintenance)
- Tính lương tài xế (Driver Salary)
- Quản lý trả rỗng (Empty Returns)
- Quản lý bảng giá cước (Rates)

**Order Status Flow:**
```
NEW → ACCEPTED → ASSIGNED → IN_TRANSIT → DELIVERED → EMPTY_RETURN → COMPLETED
  ↓
REJECTED
```

**API Endpoints:** `/api/v1/orders`, `/api/v1/trips`, `/api/v1/drivers`, `/api/v1/vehicles`

### 4.2 HRM - Human Resource Management

**Chức năng:**
- Quản lý nhân viên (Employees)
- Cơ cấu tổ chức (Departments, Branches, Positions)
- Chấm công (Attendance)
- Quản lý nghỉ phép (Leaves)
- Tính lương (Payroll)
- Hợp đồng lao động (Contracts)
- Tuyển dụng (Recruitment)

**API Endpoints:** `/api/v1/hrm/employees`, `/api/v1/hrm/attendance`, `/api/v1/hrm/leaves`

### 4.3 CRM - Customer Relationship Management

**Chức năng:**
- Quản lý khách hàng (Accounts)
- Quản lý liên hệ (Contacts)
- Pipeline bán hàng (Leads, Opportunities)
- Báo giá (Quotes)
- Hợp đồng (Contracts)

**Lead Status Flow:**
```
NEW → CONTACTED → QUALIFIED → CONVERTED
                      ↓
                    LOST
```

**API Endpoints:** `/api/v1/crm/accounts`, `/api/v1/crm/leads`, `/api/v1/crm/opportunities`

### 4.4 WMS - Warehouse Management System

**Chức năng:**
- Quản lý kho (Warehouses)
- Quản lý sản phẩm (Products)
- Nhập kho (Goods Receipt)
- Xuất kho (Delivery Orders)
- Chuyển kho (Stock Transfers)
- Kiểm kê (Inventory)

**API Endpoints:** `/api/v1/wms/warehouses`, `/api/v1/wms/products`, `/api/v1/wms/stock`

### 4.5 Accounting - Kế toán

**Chức năng:**
- Hệ thống tài khoản (Chart of Accounts)
- Bút toán (Journal Entries)
- Tài khoản ngân hàng (Bank Accounts)
- Tài sản cố định (Fixed Assets)
- Thuế (Tax Management)

**API Endpoints:** `/api/v1/accounting/chart-of-accounts`, `/api/v1/accounting/journal-entries`

---

## 5. MULTI-TENANT ARCHITECTURE

### Tenant Types
- **CARRIER**: Công ty vận tải
- **SHIPPER**: Chủ hàng
- **FORWARDER**: Công ty giao nhận
- **PORT/ICD/DEPOT**: Port operations
- **EXPRESS**: Chuyển phát nhanh
- **WAREHOUSE**: 3PL provider
- **MIXED**: Multi-industry

### Subscription Plans
- **FREE**: Basic features
- **STARTER**: Growing businesses
- **PRO**: Established companies
- **ENTERPRISE**: Large corporations

### Tenant Isolation
1. **Database level**: `tenant_id` field trong mọi bảng
2. **Middleware**: `TenantMiddleware` detect từ subdomain
3. **Query filtering**: Tự động filter theo `tenant_id`

**URL Pattern**: `https://{tenant_code}.9log.tech`

---

## 6. AUTHENTICATION & AUTHORIZATION

### JWT Authentication
```json
{
  "sub": "user_id",
  "name": "full_name",
  "username": "username",
  "role": "ADMIN|DISPATCHER|ACCOUNTANT|HR|DRIVER",
  "system_role": "SUPER_ADMIN|TENANT_ADMIN|MODULE_ADMIN|USER",
  "tenant_id": "tenant_uuid",
  "tenant_code": "abc"
}
```

### System Roles (hierarchy)
1. **SUPER_ADMIN**: Platform admin (all tenants)
2. **TENANT_ADMIN**: Full access within tenant
3. **MODULE_ADMIN**: Admin of specific module
4. **USER**: Regular user

### Legacy Roles (TMS-focused)
- **ADMIN**: Full platform access
- **DISPATCHER**: Order/trip management
- **ACCOUNTANT**: Finance operations
- **HR**: Human resources
- **DRIVER**: Mobile driver access

### RBAC Model
```
Role → Permission → Module + Resource + Action
Example: "Dispatcher" can VIEW and EDIT orders, trips
```

---

## 7. MOBILE APP ARCHITECTURE

### Super App với Role-Based UI

App tự động hiển thị UI khác nhau dựa trên role của user:

#### Driver Mode (Tài xế)
- Xem chuyến được giao
- Ghi nhận nhiên liệu
- Xem lương
- Check-in/out, nghỉ phép

#### Dispatcher Mode (Điều phối)
- Dashboard real-time
- Quản lý đơn hàng
- Giao xe/tài xế
- Theo dõi GPS

#### Manager Mode (Quản lý)
- Dashboard KPIs
- Báo cáo tổng hợp
- Phê duyệt workflow
- Quản lý team

#### Sales Mode (Bán hàng)
- CRM pipeline
- Quản lý khách hàng
- Tạo báo giá
- Tạo đơn hàng

### Mobile Config
```typescript
// DEV mode: localhost
// PROD mode: 9log.tech
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:8001' : 'https://9log.tech',
  TIMEOUT: 30000,
  VERSION: 'v1',
};
```

**Test trên emulator:**
```bash
adb reverse tcp:8001 tcp:8001  # Forward port cho localhost
```

---

## 8. DATABASE MODELS

### Core Models

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────▶│    User     │────▶│    Role     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Permission  │
                    └─────────────┘
```

### TMS Models

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────▶│   Order     │────▶│    Trip     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Driver    │◀────│  Vehicle    │
                    └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  FuelLog    │
                    └─────────────┘
```

### HRM Models

```
┌─────────────┐     ┌─────────────┐
│ Department  │────▶│  Employee   │
└─────────────┘     └─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Attendance  │     │   Leave     │     │   Payroll   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 9. API STRUCTURE

### Base URL
```
Production: https://api.9log.tech/api/v1
Development: http://localhost:8001/api/v1
```

### Authentication
```bash
# Login
POST /auth/login?username={phone}&password={pass}

# Get current user
GET /auth/me
```

### Response Format
```json
// List response
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 50,
  "pages": 2
}

// Single item
{
  "id": "uuid",
  "field1": "value",
  ...
}
```

### Main API Routes

| Module | Endpoints |
|--------|-----------|
| Auth | `/auth/login`, `/auth/me`, `/auth/logout` |
| Users | `/users`, `/users/{id}` |
| Orders | `/orders`, `/orders/{id}`, `/orders/{id}/status` |
| Trips | `/trips`, `/trips/{id}` |
| Drivers | `/drivers`, `/drivers/{id}` |
| Vehicles | `/vehicles`, `/vehicles/{id}` |
| Customers | `/customers`, `/customers/{id}` |
| Fuel Logs | `/fuel-logs`, `/fuel-logs/{id}` |
| HRM | `/hrm/employees`, `/hrm/attendance`, `/hrm/leaves` |
| CRM | `/crm/accounts`, `/crm/leads`, `/crm/opportunities` |

---

## 10. DEVELOPMENT SETUP

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx react-native start

# Android
npx react-native run-android
# hoặc
cd android && ./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Docker
```bash
cd ops
docker-compose up -d
```

---

## 11. DEPLOYMENT

### Production Deploy
```bash
./deploy.sh
```

Script thực hiện:
1. `git pull origin main`
2. `docker-compose restart backend`
3. `npm install && npm run build` (frontend)
4. `pm2 restart frontend`

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/tms
REDIS_URL=redis://host:6379
JWT_SECRET=your_secret
COOKIE_DOMAIN=.9log.tech
```

**Frontend**
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## 12. KEY FEATURES

| Feature | Status | Module |
|---------|--------|--------|
| Multi-tenant SaaS | ✅ | Platform |
| Role-based access | ✅ | Platform |
| Order management | ✅ | TMS |
| Trip planning | ✅ | TMS |
| Fleet management | ✅ | TMS |
| Driver salary | ✅ | TMS/HRM |
| Employee management | ✅ | HRM |
| Leave workflow | ✅ | HRM |
| CRM pipeline | ✅ | CRM |
| Warehouse management | ✅ | WMS |
| Accounting | ✅ | Accounting |
| Workflow approvals | ✅ | Workflow |
| AI assistant | ✅ | Platform |
| Activity logging | ✅ | Platform |
| Mobile app (multi-role) | ✅ | Mobile |
| Push notifications | 🔲 TODO | Mobile |
| Offline mode | 🔲 TODO | Mobile |

---

## 13. USEFUL COMMANDS

### Database
```bash
# Run migrations
alembic upgrade head

# Create migration
alembic revision -m "description"

# Rollback
alembic downgrade -1
```

### Mobile
```bash
# Clean build
cd android && ./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Install on device/emulator
adb install app/build/outputs/apk/debug/app-debug.apk

# Uninstall
adb uninstall com.driverapp

# Port forward for local dev
adb reverse tcp:8001 tcp:8001
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend
```

---

## 14. CONTACTS & SUPPORT

- **Domain**: 9log.tech
- **App Name**: 9log (formerly DriverApp)
- **Package ID**: com.driverapp (Android)
- **Version**: 0.2.1

---

*Document được tạo tự động bởi Claude Code - 2026-01-05*

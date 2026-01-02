# Order Workflow Implementation Summary

## Overview
Implemented a complete role-based Order management system for VNSS TMS with backend-driven workflow and frontend UI integrated with real-time order operations.

## Architecture

### Backend (FastAPI + SQLModel)

#### 1. **Order Model** (`backend/app/models/order.py`)
Extended with complete workflow support:
- **Status enum**: NEW → REJECTED/ACCEPTED → ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED/CANCELLED
- **New fields**:
  - `created_by_user_id`: Customer who created order
  - `dispatcher_id`: Dispatcher assigned to review
  - `driver_id`: Driver assigned for delivery
  - `pickup_text`, `delivery_text`: Text-based location references (not location IDs)
  - `equipment`: Container type (20', 40', etc)
  - `qty`: Quantity of containers
  - `container_code`: Container tracking code
  - `cargo_note`: Goods description
  - `empty_return_note`: Notes for empty container return
  - `eta_pickup_at`, `eta_delivery_at`: Estimated times
  - `reject_reason`: Why order was rejected
  - `status`: Current workflow state

#### 2. **Order Schemas** (`backend/app/schemas/order.py`)
- **OrderCreate**: Customer creates order with text-based input
  - `customer_id`, `pickup_text`, `delivery_text`, `equipment`, `qty`, `cargo_note`
- **OrderAccept**: Dispatcher accepts and assigns driver
  - `driver_id`, `eta_pickup_at`, `eta_delivery_at`
- **OrderReject**: Dispatcher rejects order
  - `reject_reason`
- **OrderRead**: Full serialization of all Order fields

#### 3. **Order API Endpoints** (`backend/app/api/v1/routes/orders.py`)

**POST /api/v1/orders**
- Create new order from text input
- Sets `status = "NEW"`
- Generates auto-incremented `order_code`
- Only CUSTOMER or ADMIN can create

**GET /api/v1/orders**
- List orders with role-based filtering:
  - DRIVER: Sees only assigned orders
  - CUSTOMER: Sees own orders
  - DISPATCHER/ADMIN: Sees all orders
- Query parameters: `skip`, `limit`, `status` filter

**POST /api/v1/orders/{id}/accept**
- Dispatcher/Admin accepts and assigns driver
- Sets `status = "ACCEPTED"`
- Updates `driver_id`, `eta_pickup_at`, `eta_delivery_at`
- Returns updated Order

**POST /api/v1/orders/{id}/reject**
- Dispatcher/Admin rejects order
- Sets `status = "REJECTED"`
- Stores `reject_reason`
- Only valid for NEW orders

**PATCH /api/v1/orders/{id}**
- Update container_code, cargo_note, empty_return_note
- For dispatcher/admin adjustments

### Frontend (Next.js 16 + React 19)

#### 1. **Orders Page** (`frontend/app/(protected)/orders/page.tsx`)

**Features**:
- Role detection from localStorage JWT
- Search/filter orders by code, customer, status
- Order table with status badges

**User Actions by Role**:
- **CUSTOMER**: Create orders, view own orders
- **DISPATCHER/ADMIN**: 
  - View all orders
  - Accept NEW orders with driver assignment
  - Reject NEW orders with reason
  - See ETA fields
- **DRIVER**: View-only access to assigned orders

**Modals**:
1. **Create Order Modal**
   - Paste format: `02x20 CARGO; PICKUP - DELIVERY`
   - Auto-parse quantity and equipment
   - Bulk create multiple orders from single paste
   - Example: `02x20 HIPS-KR 476L; GREEN PORT - LIVABIN` creates 2 orders

2. **Order Detail Modal**
   - View order info: pickup, delivery, cargo, equipment
   - For DISPATCHER/ADMIN on NEW orders:
     - Input driver ID
     - Select ETA pickup datetime
     - Select ETA delivery datetime
     - Accept or Reject buttons
   - For DRIVER/CUSTOMER: Read-only details

**UI Components**:
- Status badges with color coding:
  - NEW: Yellow
  - ACCEPTED: Blue
  - ASSIGNED: Purple
  - REJECTED: Red
  - COMPLETED: Green
- Role-based button visibility
- Form validation before API calls
- Error handling with user-friendly messages

## Data Flow

```
Customer Creates Order
  ↓
Pastes text: "02x20 CARGO; PICKUP - DELIVERY"
  ↓
Frontend parses and creates N orders (qty=2 creates 2 orders)
  ↓
POST /api/v1/orders with OrderCreate payload
  ↓
Backend generates order_code and sets status=NEW
  ↓
Order stored in database

Dispatcher Reviews Orders
  ↓
GET /api/v1/orders (shows all orders)
  ↓
Dispatcher clicks "View" on NEW order
  ↓
Enters driver_id and ETAs
  ↓
POST /api/v1/orders/{id}/accept
  ↓
Backend updates status=ACCEPTED, assigns driver
  ↓
Order transitions to active dispatch

Alternative: Dispatcher Rejects
  ↓
POST /api/v1/orders/{id}/reject with reason
  ↓
Status becomes REJECTED
  ↓
Reason stored for customer reference
```

## Security & Permissions

- **Role-based access control** at API endpoint level
- User role from JWT token stored in User.role field
- Endpoint checks `current_user.role` before allowing operations
- Frontend enforces UI visibility (buttons only show for authorized roles)

## Testing Workflow

1. **Setup**:
   - Backend: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
   - Frontend: `npm run dev` (runs on port 3000)

2. **Create Order**:
   - Login as CUSTOMER or ADMIN
   - Click "New Order"
   - Paste: `02x20 HIPS-KR 476L; GREEN PORT - LIVABIN`
   - Click "Create"
   - Verify order appears in table with status=NEW

3. **Accept Order**:
   - Login as DISPATCHER or ADMIN
   - Click "View" on a NEW order
   - Enter driver ID (e.g., "drv-001")
   - Select pickup and delivery ETAs
   - Click "Accept"
   - Verify order status changes to ACCEPTED

4. **Reject Order**:
   - Login as DISPATCHER
   - Click "View" on a NEW order
   - Click "Reject"
   - Enter reason (e.g., "Driver unavailable")
   - Click "Confirm Rejection"
   - Verify status changes to REJECTED

## API Response Examples

**Create Order Request**:
```json
POST /api/v1/orders
{
  "customer_id": "cust-123",
  "pickup_text": "GREEN PORT",
  "delivery_text": "LIVABIN",
  "equipment": "20",
  "qty": 1,
  "cargo_note": "HIPS-KR 476L"
}
```

**Accept Order Request**:
```json
POST /api/v1/orders/ord-001/accept
{
  "driver_id": "drv-001",
  "eta_pickup_at": "2024-01-15T09:00:00",
  "eta_delivery_at": "2024-01-15T17:00:00"
}
```

**Reject Order Request**:
```json
POST /api/v1/orders/ord-001/reject
{
  "reject_reason": "Driver not available for this route"
}
```

## Next Steps (Optional Enhancements)

1. **Driver Mobile Integration**: Driver app views assigned orders, confirms pickup/delivery
2. **Real-time Updates**: WebSocket for live order status changes
3. **Trip Creation**: Batch assign orders to create trips
4. **Location Resolution**: Map text locations to location_id via fuzzy matching
5. **Cost Calculation**: Integrate with cost_norms for freight pricing
6. **Document Upload**: Attachment support for BOL, invoice, etc
7. **Notifications**: Email/SMS alerts when order status changes
8. **Audit Trail**: Track all status changes with timestamps and user

## Files Modified/Created

**Backend**:
- `app/models/order.py` - Extended Order model
- `app/schemas/order.py` - New OrderCreate, OrderAccept, OrderReject schemas
- `app/api/v1/routes/orders.py` - 5 new endpoints with role filtering

**Frontend**:
- `app/(protected)/orders/page.tsx` - Complete workflow UI with modals and role detection

**Dependencies**:
- Python: fastapi, sqlmodel, sqlalchemy, python-jose, passlib
- Node: next, react, typescript, tailwind-css (already present)

## Configuration

**Backend**:
- CORS: Allows localhost:3000 for frontend
- Database: PostgreSQL (or SQLite in dev)
- Auth: JWT tokens from app/core/security.py

**Frontend**:
- API_BASE: http://127.0.0.1:8000 (from .env.local)
- Ports: 3000 (frontend), 8000 (backend)
- Auth: JWT stored in localStorage key "user"

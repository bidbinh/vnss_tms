# Order Workflow System - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Browser (http://localhost:3000)                                │
│  ├─ Login Page (/login)                                         │
│  ├─ Protected Orders Page (/(protected)/orders)                 │
│  │  ├─ Order List Table                                         │
│  │  ├─ Search & Filter                                          │
│  │  ├─ Create Order Modal                                       │
│  │  └─ Order Detail Modal (Accept/Reject)                       │
│  └─ localStorage: { user, token }                               │
└─────────────────────────────────────────────────────────────────┘
           │
           │ HTTP/HTTPS (CORS enabled)
           │
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI (http://localhost:8000)                                │
│  ├─ CORS Middleware (localhost:3000)                            │
│  ├─ JWT Authentication                                          │
│  └─ Request/Response Validation                                 │
└─────────────────────────────────────────────────────────────────┘
           │
           │ Routes
           │
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  POST   /api/v1/orders               (Create Order)             │
│  GET    /api/v1/orders               (List Orders + RBAC)       │
│  POST   /api/v1/orders/{id}/accept   (Accept + Assign Driver)   │
│  POST   /api/v1/orders/{id}/reject   (Reject with Reason)       │
│  PATCH  /api/v1/orders/{id}          (Update Details)           │
│                                                                  │
│  All endpoints:                                                 │
│  ├─ Require JWT token                                           │
│  ├─ Check User.role for permissions                             │
│  ├─ Validate request schema                                     │
│  └─ Return response schema                                      │
└─────────────────────────────────────────────────────────────────┘
           │
           │ Query/Update
           │
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Order Service                                                  │
│  ├─ Create Order (generate order_code, set status=NEW)          │
│  ├─ List Orders (filter by role)                                │
│  ├─ Accept Order (update driver, ETAs, status=ASSIGNED)         │
│  ├─ Reject Order (set reject_reason, status=REJECTED)           │
│  └─ Update Order (modify optional fields)                       │
│                                                                  │
│  Validation                                                     │
│  ├─ Status transitions                                          │
│  ├─ Role permissions                                            │
│  ├─ Required fields                                             │
│  └─ Data consistency                                            │
└─────────────────────────────────────────────────────────────────┘
           │
           │ SQLAlchemy ORM
           │
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL / SQLite (dev)                                      │
│  └─ order table                                                 │
│     ├─ id (UUID, PK)                                            │
│     ├─ order_code (str, unique)                                 │
│     ├─ customer_id, dispatcher_id, driver_id, created_by_id     │
│     ├─ status (enum)                                            │
│     ├─ pickup_text, delivery_text                               │
│     ├─ equipment, qty, cargo_note, container_code               │
│     ├─ eta_pickup_at, eta_delivery_at, reject_reason            │
│     ├─ created_at, updated_at                                   │
│     └─ legacy fields (pickup_location_id, delivery_location_id) │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Create Order Flow

```
User (CUSTOMER)                Frontend                    Backend                 Database
     │                             │                         │                         │
     ├─ Click "+ New Order" ──────→│                         │                         │
     │                             │                         │                         │
     ├─ Paste text                 │                         │                         │
     │ "02x20 CARGO; A - B" ──────→│                         │                         │
     │                             │                         │                         │
     ├─ Click "Create" ───────────→│                         │                         │
     │                             │                         │                         │
     │                             ├─ Parse text            │                         │
     │                             ├─ Extract fields        │                         │
     │                             │                         │                         │
     │                             ├─ POST /orders ────────→│                         │
     │                             │  (OrderCreate schema)   │                         │
     │                             │                         ├─ Validate input       │
     │                             │                         ├─ Generate order_code  │
     │                             │                         ├─ Set status=NEW       │
     │                             │                         │                       │
     │                             │                         ├─ INSERT order ───────→│
     │                             │                         │                       │
     │                             │←─ Order response ───────│←─ Return order ──────│
     │                             │                         │                       │
     │←─ Display in table ─────────│                         │                       │
     │                             │                         │                         │
     ├─ See order with NEW status  │                         │                         │
```

### Accept Order Flow

```
Dispatcher                      Frontend                    Backend                 Database
     │                             │                         │                         │
     ├─ Login as DISPATCHER ──────→│                         │                         │
     │                             │                         │                         │
     ├─ View Orders page ────────→│                         │                         │
     │                             ├─ GET /orders ────────→│                         │
     │                             │ (with role=DISPATCHER) │                         │
     │                             │                         ├─ Query NEW orders    │
     │                             │←─ Return orders ──────│←─ SELECT * ──────────│
     │                             │                         │                       │
     ├─ Click "View" button ──────→│                         │                         │
     │                             ├─ Open Detail Modal     │                         │
     │                             │                         │                         │
     ├─ Enter driver: drv-001 ────→│                         │                         │
     ├─ Enter pickup ETA ────────→│                         │                         │
     ├─ Enter delivery ETA ──────→│                         │                         │
     │                             │                         │                         │
     ├─ Click "Accept" ──────────→│                         │                         │
     │                             ├─ POST /orders/{id}/accept │                     │
     │                             │  (OrderAccept schema)   │                         │
     │                             │  - driver_id            │                         │
     │                             │  - eta_pickup_at        │                         │
     │                             │  - eta_delivery_at      │                         │
     │                             │                         ├─ Validate status    │
     │                             │                         ├─ Update driver      │
     │                             │                         ├─ Update ETAs        │
     │                             │                         ├─ Set status=ASSIGNED│
     │                             │                         │                       │
     │                             │                         ├─ UPDATE order ───────→│
     │                             │                         │                       │
     │                             │←─ Updated order ──────│←─ Return order ──────│
     │                             │                         │                       │
     │←─ Show success alert ──────│                         │                       │
     │                             │                         │                         │
     ├─ See order with ASSIGNED ──→│                         │                         │
```

### Reject Order Flow

```
Dispatcher                      Frontend                    Backend                 Database
     │                             │                         │                         │
     ├─ View NEW order ──────────→│                         │                         │
     │                             ├─ Open Detail Modal     │                         │
     │                             │                         │                         │
     ├─ Click "Reject" ──────────→│                         │                         │
     │                             ├─ Show Reject Form     │                         │
     │                             │                         │                         │
     ├─ Enter reason:             │                         │                         │
     │  "Driver unavailable" ─────→│                         │                         │
     │                             │                         │                         │
     ├─ Click "Confirm" ────────→│                         │                         │
     │                             │                         │                         │
     │                             ├─ POST /orders/{id}/reject │                     │
     │                             │  (OrderReject schema)   │                         │
     │                             │  - reject_reason        │                         │
     │                             │                         ├─ Validate status    │
     │                             │                         ├─ Store reason       │
     │                             │                         ├─ Set status=REJECTED│
     │                             │                         │                       │
     │                             │                         ├─ UPDATE order ───────→│
     │                             │                         │                       │
     │                             │←─ Updated order ──────│←─ Return order ──────│
     │                             │                         │                       │
     │←─ Show success alert ──────│                         │                       │
     │                             │                         │                         │
     ├─ See order with REJECTED ──→│                         │                         │
```

---

## Role-Based Access Control

```
                    ┌─────────────────────────────┐
                    │   User.role from JWT        │
                    └──────────┬──────────────────┘
                               │
                ┌──────────────┼──────────────┬────────────┐
                │              │              │            │
                ↓              ↓              ↓            ↓
            CUSTOMER      DISPATCHER       DRIVER        ADMIN
                │              │              │            │
                │              │              │            │
   ┌────────────┴───┐  ┌────────┴──────┐  ┌──┴─────┐  ┌────┴─────┐
   │ Can Create     │  │ Can Accept    │  │Can View │  │ All      │
   │ Own Orders    │  │ Any NEW Order │  │Assigned│  │Permitted │
   │               │  │               │  │Orders  │  │          │
   │ Can View      │  │ Can Reject    │  │Only    │  │          │
   │ Own Orders    │  │ Any NEW Order │  │        │  │          │
   │               │  │               │  │        │  │          │
   │ Cannot Accept │  │ Can View All  │  │Cannot  │  │          │
   │ Cannot Reject │  │ Orders        │  │Accept  │  │          │
   └───────────────┘  │               │  │Cannot  │  └──────────┘
                      │ Can Update    │  │Reject  │
                      │ Order Details │  │        │
                      └───────────────┘  └────────┘

                GET /orders Filter:
            
   CUSTOMER             DISPATCHER           DRIVER            ADMIN
   ├─ Show own          ├─ Show all         ├─ Show own        ├─ Show all
   │  orders            │  orders           │  assigned         │  orders
   └─ Only status       └─ All statuses     │  orders           └─ All
      not REJECTED                          └─ ASSIGNED+         statuses
                                               statuses
```

---

## Order Status State Machine

```
                        [NEW]
                          │
                  ┌───────┴───────┐
                  │               │
                  ↓               ↓
           [ACCEPTED]        [REJECTED]
                  │               │
                  │               └─ Final State
                  │
                  ↓
           [ASSIGNED]
                  │
                  ↓
           [IN_TRANSIT]
                  │
                  ↓
           [DELIVERED]
                  │
                  ↓
           [COMPLETED]  ← Final State


Transitions:
NEW          → ACCEPTED (POST /accept with driver + ETAs)
NEW          → REJECTED (POST /reject with reason)
NEW          → CANCELLED (PATCH with status=CANCELLED)
ACCEPTED     → ASSIGNED (Driver confirmation)
ASSIGNED     → IN_TRANSIT (Pickup scan)
IN_TRANSIT   → DELIVERED (Delivery scan)
DELIVERED    → COMPLETED (Manual confirmation)
REJECTED     → (No transitions - final state)
CANCELLED    → (No transitions - final state)
```

---

## Component Hierarchy (Frontend)

```
OrdersPage
├─ Header
│  ├─ Title
│  └─ "New Order" Button (CUSTOMER/ADMIN only)
│
├─ Search Box
│  └─ Input field (order_code, customer_id, status)
│
├─ Orders Table
│  ├─ Header Row
│  │  ├─ Order Code
│  │  ├─ Customer
│  │  ├─ Pickup → Delivery
│  │  ├─ Equipment
│  │  ├─ Status (with badge)
│  │  └─ Actions
│  │
│  └─ Body Rows (map orders)
│     ├─ Order details
│     ├─ Status badge (color coded)
│     └─ "View" button
│
├─ CreateOrderModal
│  ├─ Title
│  ├─ Textarea (order text)
│  └─ Buttons [Cancel] [Create]
│
└─ OrderDetailModal
   ├─ Order header
   ├─ Display fields
   │  ├─ Status
   │  ├─ Pickup/Delivery
   │  ├─ Cargo
   │  └─ Equipment
   │
   ├─ Accept Section (DISPATCHER on NEW orders)
   │  ├─ Driver ID input
   │  ├─ ETA Pickup input
   │  ├─ ETA Delivery input
   │  └─ Buttons [Accept] [Reject]
   │
   ├─ Reject Section (slides in when Reject clicked)
   │  ├─ Reason textarea
   │  └─ Buttons [Confirm] [Cancel]
   │
   └─ Footer buttons
      ├─ [Close]
      └─ [Update] (if in edit mode)
```

---

## API Request/Response Flow

```
REQUEST:
┌─────────────────────────────────┐
│ POST /api/v1/orders             │
│ Authorization: Bearer <JWT>     │
│ Content-Type: application/json  │
├─────────────────────────────────┤
│ {                               │
│   "customer_id": "cust-001",   │
│   "pickup_text": "GREEN PORT",  │
│   "delivery_text": "LIVABIN",   │
│   "equipment": "20",            │
│   "qty": 2,                     │
│   "cargo_note": "HIPS-KR 476L"  │
│ }                               │
└─────────────────────────────────┘
           ↓
    [FastAPI processes]
           ↓
RESPONSE (200 OK):
┌─────────────────────────────────┐
│ Content-Type: application/json  │
├─────────────────────────────────┤
│ {                               │
│   "id": "uuid-xxx",             │
│   "order_code": "ORD-2024-001",  │
│   "customer_id": "cust-001",    │
│   "status": "NEW",              │
│   "pickup_text": "GREEN PORT",  │
│   "delivery_text": "LIVABIN",   │
│   "equipment": "20",            │
│   "qty": 2,                     │
│   "cargo_note": "HIPS-KR 476L"  │
│   "created_at": "2024-12-15T..." │
│   "updated_at": "2024-12-15T..." │
│   ... (other fields)             │
│ }                               │
└─────────────────────────────────┘
```

---

## Technology Stack

```
Frontend Layer                Backend Layer              Database Layer
┌──────────────┐            ┌──────────────┐           ┌─────────────┐
│ Next.js 16   │            │ FastAPI      │           │ PostgreSQL  │
│ React 19     │────────→   │ (Uvicorn)    │──────────→│ (or SQLite) │
│ TypeScript   │            │ SQLModel ORM │           │             │
│ Tailwind CSS │            │ Python 3.11  │           └─────────────┘
└──────────────┘            └──────────────┘
      ↓                           ↓
   Browser                   App Server
Port 3000                   Port 8000
                            API_BASE = http://127.0.0.1:8000
```

---

## File Organization

```
d:\vnss_tms\
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── order.py ········· Order model with 20+ fields
│   │   │   ├── user.py
│   │   │   └── ...
│   │   ├── schemas/
│   │   │   ├── order.py ········· OrderCreate, OrderAccept, OrderReject, OrderRead
│   │   │   └── ...
│   │   ├── api/v1/routes/
│   │   │   ├── orders.py ······· 5 endpoints with RBAC
│   │   │   └── ...
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   └── config.py
│   │   └── main.py ············ FastAPI app initialization
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/
│   ├── app/
│   │   ├── (protected)/
│   │   │   └── orders/
│   │   │       └── page.tsx ··· Complete Order UI (450 lines)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── api.ts ············· apiFetch utility
│   ├── package.json
│   └── next.config.ts
│
├── IMPLEMENTATION_SUMMARY.md ·· Technical overview
├── TESTING_GUIDE.md ········· Step-by-step tests
├── DATABASE_SCHEMA.md ········ Data model
├── IMPLEMENTATION_CHECKLIST.md  Completion status
├── README_ORDER_WORKFLOW.md ·· Main documentation
└── GET_STARTED.md ·········· Quick start guide
```

---

**This diagram shows the complete architecture and data flow of the Order Workflow System.**

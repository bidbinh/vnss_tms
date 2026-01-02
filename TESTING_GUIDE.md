# Quick Testing Guide

## Starting the Application

### 1. Backend
```bash
cd d:\vnss_tms\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
✓ Server starts on http://localhost:8000

### 2. Frontend  
```bash
cd d:\vnss_tms\frontend
npm run dev
```
✓ Server starts on http://localhost:3000

---

## Test Scenario: Complete Order Workflow

### Step 1: Login as Customer
1. Open http://localhost:3000/login
2. Create account or use test credentials
3. Navigate to Orders page

### Step 2: Create Order
1. Click "+ New Order" button
2. Paste sample text:
   ```
   02x20 HIPS-KR 476L GR21; GREEN PORT - LIVABIN
   ```
   (This creates 2 orders, each 20ft container)
3. Click "Create"
4. ✓ Two orders appear in table with status "NEW"

### Step 3: Login as Dispatcher
1. Logout from customer account
2. Login with DISPATCHER role
3. Navigate to Orders page
4. ✓ See all orders (including NEW ones from step 2)

### Step 4: Accept Order
1. Click "View" on any NEW order
2. Enter driver ID: `drv-001`
3. Set ETA Pickup: `2024-12-15 09:00`
4. Set ETA Delivery: `2024-12-15 17:00`
5. Click "Accept"
6. ✓ Order status changes to "ASSIGNED"
7. ✓ Driver ID and ETAs are saved

### Step 5: Reject Order  
1. Click "View" on another NEW order
2. Click "Reject" button
3. Enter reason: `Route not available`
4. Click "Confirm Rejection"
5. ✓ Order status changes to "REJECTED"
6. ✓ Reason is displayed in order details

---

## API Testing with curl

### Create Order
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customer_id": "cust-001",
    "pickup_text": "GREEN PORT",
    "delivery_text": "LIVABIN",
    "equipment": "20",
    "qty": 2,
    "cargo_note": "HIPS-KR 476L"
  }'
```

### List Orders
```bash
curl -X GET "http://localhost:8000/api/v1/orders?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Accept Order
```bash
curl -X POST http://localhost:8000/api/v1/orders/ORDER_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "driver_id": "drv-001",
    "eta_pickup_at": "2024-12-15T09:00:00",
    "eta_delivery_at": "2024-12-15T17:00:00"
  }'
```

### Reject Order
```bash
curl -X POST http://localhost:8000/api/v1/orders/ORDER_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reject_reason": "Driver not available"
  }'
```

---

## Order Text Format

### Syntax
```
QTYxSIZE CARGO; PICKUP - DELIVERY
```

### Examples
```
02x20 HIPS-KR 476L; GREEN PORT - LIVABIN
01x40 PLASTIC ROLLS; BANGKOK PORT - CHIANG MAI
03x20 WOOD PALLETS; INDUSTRIAL ZONE - DISTRIBUTION CENTER
```

### Rules
- `QTY`: Number of containers (creates N orders with qty=1 each)
- `SIZE`: Container size (20, 40, etc - stored as string in equipment field)
- `CARGO`: Goods description (optional, stored in cargo_note)
- `PICKUP`: Source location name (stored as pickup_text)
- `DELIVERY`: Destination location name (stored as delivery_text)
- Separator: semicolon `;` before locations, dash `-` between them

---

## Order Status Flow

```
NEW
  ↓
  ├→ ACCEPTED (dispatcher accepts + assigns driver + ETAs)
  │   ↓
  │   └→ ASSIGNED (ready for pickup)
  │       ↓
  │       └→ IN_TRANSIT → DELIVERED → COMPLETED
  │
  └→ REJECTED (dispatcher rejects with reason)
```

---

## User Roles & Permissions

| Role | Can Create | Can List All | Can Accept | Can Reject | Can View |
|------|-----------|-------------|-----------|-----------|---------|
| CUSTOMER | ✓ Own | ✗ Own only | ✗ | ✗ | ✓ |
| DISPATCHER | ✓ | ✓ | ✓ | ✓ | ✓ |
| DRIVER | ✗ | ✗ Assigned only | ✗ | ✗ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Troubleshooting

### Backend won't start
- Check Python is 3.9+: `python --version`
- Install deps: `pip install -r requirements.txt`
- Check port 8000 is free: `netstat -ano | findstr :8000`

### Frontend won't start  
- Clear cache: `rmdir /s /q .next`
- Install deps: `npm install`
- Check port 3000 is free: `netstat -ano | findstr :3000`

### Orders not appearing
- Check backend logs for errors
- Verify user is logged in
- Check JWT token is stored in localStorage

### Accept/Reject not working
- Verify user has DISPATCHER or ADMIN role
- Check order is in NEW status
- Check all required fields are filled (driver_id, ETAs)

---

## Database Reset (Dev Only)

Delete database file to reset:
```bash
# SQLite
del d:\vnss_tms\backend\dev.db

# Then restart backend - database will be recreated
```

---

## Performance Tips

- Keep .env.local configured with API_BASE
- Use LIMIT parameter when fetching many orders
- Filter by status to reduce result set
- Monitor backend logs for slow queries

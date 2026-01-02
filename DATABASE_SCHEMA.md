# Order Workflow Database Schema

## Order Table Fields

### Identity & Relationships
- `id` (UUID): Primary key
- `tenant_id` (UUID): Multi-tenant support
- `customer_id` (str): Customer who created order (FK to User)
- `created_by_user_id` (str): User ID who created (FK to User)
- `dispatcher_id` (str): Dispatcher reviewing order (FK to User)
- `driver_id` (str): Driver assigned to order (FK to User)

### Order Information
- `order_code` (str, unique): Auto-generated order code (e.g., "ORD-2024-001")
- `status` (Enum): NEW | REJECTED | ACCEPTED | ASSIGNED | IN_TRANSIT | DELIVERED | COMPLETED | CANCELLED
- `pickup_text` (str): Source location name (text-based, not location_id)
- `delivery_text` (str): Destination location name (text-based)
- `cargo_note` (str, optional): Description of goods
- `equipment` (str, optional): Container type (20, 40, etc)
- `qty` (int): Number of containers
- `container_code` (str, optional): Container tracking code

### Delivery Instructions
- `eta_pickup_at` (datetime, optional): Estimated pickup time
- `eta_delivery_at` (datetime, optional): Estimated delivery time
- `empty_return_note` (str, optional): Instructions for empty container return
- `reject_reason` (str, optional): Why order was rejected

### Timestamps
- `created_at` (datetime): When order was created
- `updated_at` (datetime): Last modification time

### Legacy Fields (Preserved for Compatibility)
- `branch_id` (UUID, optional): Branch information
- `sales_user_id` (str, optional): Sales person
- `service_type` (str, optional): Type of service
- `incoterm` (str, optional): Incoterm (e.g., FOB, CIF)
- `notes` (str, optional): Additional notes
- `pickup_location_id` (UUID, optional): Legacy location reference
- `delivery_location_id` (UUID, optional): Legacy location reference

---

## OrderStatus Enum

```python
class OrderStatus(str, Enum):
    NEW = "NEW"                    # Newly created, awaiting dispatcher review
    REJECTED = "REJECTED"          # Dispatcher rejected (final state)
    ACCEPTED = "ACCEPTED"          # Dispatcher accepted (driver assigned)
    ASSIGNED = "ASSIGNED"          # Ready for pickup (driver has acceptance)
    IN_TRANSIT = "IN_TRANSIT"      # Driver picked up cargo
    DELIVERED = "DELIVERED"        # Cargo delivered
    COMPLETED = "COMPLETED"        # Order completion confirmed
    CANCELLED = "CANCELLED"        # Order cancelled (final state)
```

### Status Transition Rules
```
NEW → ACCEPTED (via accept endpoint) ✓
NEW → REJECTED (via reject endpoint) ✓
NEW → CANCELLED (via update endpoint) ✓
ACCEPTED → ASSIGNED (driver confirmation)
ASSIGNED → IN_TRANSIT (pickup scan)
IN_TRANSIT → DELIVERED (delivery scan)
DELIVERED → COMPLETED (confirmation)
REJECTED → (no transitions - final)
CANCELLED → (no transitions - final)
```

---

## Database Relationships

### Order → User (Relationships)
```
Order.created_by_user_id → User.id  (creator)
Order.dispatcher_id → User.id       (reviewer)
Order.driver_id → User.id           (executor)
Order.customer_id → User.id         (customer account)
```

### Order → Tenant (Multi-tenant)
```
Order.tenant_id → Tenant.id
```

### Legacy Order → Location (Preserved)
```
Order.pickup_location_id → Location.id (optional)
Order.delivery_location_id → Location.id (optional)
```

---

## Sample Data Queries

### Get NEW orders for dispatcher review
```sql
SELECT * FROM order 
WHERE status = 'NEW' 
  AND tenant_id = 'current_tenant'
ORDER BY created_at DESC;
```

### Get orders assigned to specific driver
```sql
SELECT * FROM order 
WHERE driver_id = 'drv-001' 
  AND status IN ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED')
ORDER BY eta_pickup_at ASC;
```

### Get orders from specific customer
```sql
SELECT * FROM order 
WHERE customer_id = 'cust-123' 
  AND tenant_id = 'current_tenant'
ORDER BY created_at DESC;
```

### Get completed orders for billing
```sql
SELECT * FROM order 
WHERE status IN ('COMPLETED', 'DELIVERED') 
  AND created_at >= '2024-01-01'
ORDER BY updated_at DESC;
```

### Get rejected orders with reasons
```sql
SELECT order_code, pickup_text, delivery_text, reject_reason, created_at
FROM order 
WHERE status = 'REJECTED'
  AND created_at >= NOW() - INTERVAL 7 DAY
ORDER BY updated_at DESC;
```

---

## Database Indexes (Recommended)

```sql
-- For filtering by status
CREATE INDEX idx_order_status ON order(status);

-- For customer lookups
CREATE INDEX idx_order_customer_id ON order(customer_id);

-- For driver assignments
CREATE INDEX idx_order_driver_id ON order(driver_id);

-- For dispatcher review queue
CREATE INDEX idx_order_dispatcher_status 
  ON order(dispatcher_id, status);

-- For created_at sorting
CREATE INDEX idx_order_created_at ON order(created_at DESC);

-- For tenant filtering
CREATE INDEX idx_order_tenant_status 
  ON order(tenant_id, status);
```

---

## ORM Model Definition (SQLModel)

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class OrderStatus(str, Enum):
    NEW = "NEW"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Order(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    tenant_id: str
    order_code: str = Field(unique=True, index=True)
    customer_id: str
    created_by_user_id: str
    dispatcher_id: Optional[str] = None
    driver_id: Optional[str] = None
    
    status: OrderStatus = Field(default=OrderStatus.NEW, index=True)
    pickup_text: str
    delivery_text: str
    cargo_note: Optional[str] = None
    equipment: Optional[str] = None
    qty: int = 1
    container_code: Optional[str] = None
    
    eta_pickup_at: Optional[datetime] = None
    eta_delivery_at: Optional[datetime] = None
    empty_return_note: Optional[str] = None
    reject_reason: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Legacy fields
    branch_id: Optional[str] = None
    sales_user_id: Optional[str] = None
    service_type: Optional[str] = None
    incoterm: Optional[str] = None
    notes: Optional[str] = None
    pickup_location_id: Optional[str] = None
    delivery_location_id: Optional[str] = None
```

---

## Migration Path (If Using Alembic)

### Create migration for new Order fields
```bash
cd backend
alembic revision --autogenerate -m "Add order workflow fields"
```

### Apply migration
```bash
alembic upgrade head
```

### Rollback (if needed)
```bash
alembic downgrade -1
```

---

## Data Validation

### Required Fields
- `customer_id`: Must exist in User table
- `pickup_text`: Non-empty string
- `delivery_text`: Non-empty string
- `qty`: Integer ≥ 1
- `order_code`: Auto-generated, unique

### Optional Fields with Constraints
- `eta_pickup_at`: Must be before `eta_delivery_at` if both present
- `reject_reason`: Only valid when status = REJECTED
- `driver_id`: Must be valid User when status ≥ ACCEPTED
- `equipment`: Recommended for freight calculations

### Status Validation Rules
- Cannot change from final states (REJECTED, CANCELLED, COMPLETED)
- DRIVER can only see ASSIGNED+ orders
- CUSTOMER can only see their own orders
- DISPATCHER can see all non-CANCELLED orders

---

## Performance Considerations

### Query Optimization
1. Filter by status first (most selective)
2. Filter by tenant_id second (multi-tenant)
3. Order by created_at DESC for latest first
4. Use LIMIT for pagination

### Indexing Strategy
- Composite index on (tenant_id, status) for quick filtering
- Single index on (created_at DESC) for sorting
- Index on driver_id for driver assignment queries

### Caching Opportunities
- Cache NEW order count (refreshed every minute)
- Cache status distribution per tenant
- Cache assigned orders per driver (short TTL)

---

## Backup & Recovery

### Export orders for backup
```sql
SELECT * FROM order 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
INTO OUTFILE '/backup/orders.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

### Restore from backup
```sql
LOAD DATA INFILE '/backup/orders.csv'
INTO TABLE order
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

---

## Audit Trail (Optional Enhancement)

Consider adding for compliance:
- `created_by`: Who created the order
- `last_modified_by`: Who last modified
- `modification_history`: JSON array of changes
- `status_history`: Timestamps of all status changes

This would help with:
- Compliance and regulatory requirements
- Dispute resolution
- Performance metrics (time in each status)
- User accountability

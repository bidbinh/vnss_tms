# Order Management System (OMS) - Thiết Kế Chi Tiết

## Tổng Quan

Hệ thống OMS (Order Management System) cho công ty thương mại hạt nhựa, tích hợp với:
- **TMS** (Transport Management System): Quản lý vận chuyển
- **CRM** (Customer Relationship Management): Quản lý khách hàng
- **WMS** (Warehouse Management System): Quản lý tồn kho
- **Accounting**: Kế toán và thanh toán

---

## 1. Business Requirements

### 1.1 Đặc Điểm Nghiệp Vụ
- **Sản phẩm**: 200 mã hàng hạt nhựa
- **Kho hàng**: Nhiều kho, cảng, hàng đang về
- **Workflow**: Sale tạo RQ → Admin duyệt giá & phân bổ → Xác nhận đơn → Vận chuyển
- **Giá bán**: Giá CS (có VAT) + cước vận chuyển, Sale điều chỉnh theo đơn
- **Vận chuyển**: 1 đơn có thể tách nhiều lần vận chuyển

### 1.2 Quy Trình Đơn Hàng

```
[Sale] Tạo RQ chào hàng (DRAFT)
   ↓
[Sale] Xin giá nếu cần (PENDING_PRICE_APPROVAL)
   ↓
[Manager] Duyệt giá nếu giá dưới giá CS (PRICE_APPROVED / PRICE_REJECTED)
   ↓
[Admin] Duyệt & phân bổ hàng hóa (PENDING_ALLOCATION)
   ↓
[Admin] Phân bổ kho lấy hàng (ALLOCATION_CONFIRMED)
   ↓
[Dispatcher] Tạo yêu cầu vận chuyển (READY_TO_SHIP)
   ↓
[TMS] Xử lý vận chuyển (IN_TRANSIT)
   ↓
[TMS] Giao hàng thành công (DELIVERED)
   ↓
[System] Hoàn thành đơn hàng (COMPLETED)
```

### 1.3 Vai Trò & Quyền Hạn

| Vai Trò | Quyền Hạn |
|---------|-----------|
| **Sales** | Tạo RQ chào hàng, Xin giá, Xem đơn của mình, Sửa DRAFT |
| **Sales Manager** | Duyệt giá, Xem tất cả đơn, Báo cáo doanh số |
| **Admin (Quản lý kho)** | Phân bổ kho lấy hàng, Duyệt đơn, Quản lý tồn kho |
| **Dispatcher (Kho vận)** | Tạo yêu cầu vận chuyển, Theo dõi giao hàng, Cập nhật trạng thái |

---

## 2. Database Schema

### 2.1 Core Tables

#### 2.1.1 `oms_orders` - Đơn Hàng Chính

```sql
CREATE TABLE oms_orders (
    -- Primary & Tenant
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,

    -- Identifiers
    order_number VARCHAR(50) UNIQUE NOT NULL,  -- Format: ORD-YYYYMMDD-XXXX
    external_reference VARCHAR(100),            -- Mã đơn của khách (nếu có)

    -- Status & Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    workflow_instance_id VARCHAR(36),
    previous_status VARCHAR(50),

    -- Customer (from CRM)
    customer_id VARCHAR(36) NOT NULL,          -- Foreign key to CRM
    customer_name VARCHAR(255),                 -- Cached for display
    delivery_address_id VARCHAR(36),            -- Address from CRM
    delivery_address_text TEXT,                 -- Cached full address
    delivery_contact_name VARCHAR(255),
    delivery_contact_phone VARCHAR(50),

    -- Dates
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    required_delivery_date TIMESTAMP,
    confirmed_date TIMESTAMP,
    completed_date TIMESTAMP,

    -- Pricing
    base_price_type VARCHAR(50),                -- 'CS_PRICE' (giá công ty)
    total_product_amount DECIMAL(15,2) DEFAULT 0,
    total_shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_tax DECIMAL(15,2) DEFAULT 0,
    total_discount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',

    -- Notes
    sales_notes TEXT,                           -- Ghi chú của Sale
    internal_notes TEXT,                        -- Ghi chú nội bộ
    customer_notes TEXT,                        -- Yêu cầu của khách
    rejection_reason TEXT,                      -- Lý do từ chối (nếu có)

    -- Audit
    created_by_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_by_id VARCHAR(36),
    confirmed_at TIMESTAMP,

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_number (order_number),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_required_delivery_date (required_delivery_date),

    -- Constraints
    UNIQUE KEY uq_tenant_order_number (tenant_id, order_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

**Status Values**:
- `DRAFT`: Đơn nháp, chưa submit
- `PENDING_PRICE_APPROVAL`: Chờ Manager duyệt giá
- `PRICE_APPROVED`: Giá đã được duyệt
- `PRICE_REJECTED`: Giá bị từ chối
- `PENDING_ALLOCATION`: Chờ Admin phân bổ kho
- `ALLOCATION_CONFIRMED`: Đã phân bổ kho
- `READY_TO_SHIP`: Sẵn sàng vận chuyển
- `IN_TRANSIT`: Đang vận chuyển
- `DELIVERED`: Đã giao hàng
- `COMPLETED`: Hoàn thành
- `CANCELLED`: Đã hủy

#### 2.1.2 `oms_order_items` - Chi Tiết Sản Phẩm

```sql
CREATE TABLE oms_order_items (
    -- Primary & Relations
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,

    -- Product (from WMS/Product Catalog)
    product_id VARCHAR(36) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_unit VARCHAR(20) NOT NULL,        -- 'KG', 'TAN', etc.

    -- Quantity
    quantity DECIMAL(15,3) NOT NULL,
    quantity_allocated DECIMAL(15,3) DEFAULT 0,
    quantity_shipped DECIMAL(15,3) DEFAULT 0,
    quantity_delivered DECIMAL(15,3) DEFAULT 0,

    -- Pricing (VND/kg or VND/unit)
    cs_unit_price DECIMAL(15,2) NOT NULL,     -- Giá công ty tại thời điểm tạo
    quoted_unit_price DECIMAL(15,2) NOT NULL, -- Giá chào của Sale
    approved_unit_price DECIMAL(15,2),        -- Giá được duyệt
    shipping_unit_cost DECIMAL(15,2) DEFAULT 0, -- Cước VC / đơn vị

    -- Calculated
    line_total DECIMAL(15,2),                 -- (approved_unit_price + shipping_unit_cost) * quantity
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2),

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),

    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (order_id) REFERENCES oms_orders(id) ON DELETE CASCADE
);
```

#### 2.1.3 `oms_allocations` - Phân Bổ Kho

```sql
CREATE TABLE oms_allocations (
    -- Primary & Relations
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    order_item_id VARCHAR(36) NOT NULL,

    -- Source (from WMS)
    source_type VARCHAR(50) NOT NULL,         -- 'WAREHOUSE', 'PORT', 'IN_TRANSIT'
    source_id VARCHAR(36) NOT NULL,           -- ID of warehouse/port/shipment
    source_name VARCHAR(255) NOT NULL,        -- Cached name
    source_location TEXT,                     -- Địa chỉ kho/cảng

    -- Allocation
    allocated_quantity DECIMAL(15,3) NOT NULL,
    allocated_date TIMESTAMP NOT NULL DEFAULT NOW(),
    allocated_by_id VARCHAR(36) NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'ALLOCATED',  -- ALLOCATED, RESERVED, PICKED, SHIPPED

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_id (order_id),
    INDEX idx_order_item_id (order_item_id),
    INDEX idx_source (source_type, source_id),

    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (order_id) REFERENCES oms_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES oms_order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by_id) REFERENCES users(id)
);
```

#### 2.1.4 `oms_shipments` - Vận Chuyển

```sql
CREATE TABLE oms_shipments (
    -- Primary & Relations
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,

    -- Identifiers
    shipment_number VARCHAR(50) UNIQUE NOT NULL,  -- Format: SHP-YYYYMMDD-XXXX
    tms_order_id VARCHAR(36),                      -- Link to TMS Order (if internal)

    -- Type
    shipment_type VARCHAR(50) NOT NULL,            -- 'INTERNAL' (via TMS), 'EXTERNAL' (xe ngoài), 'OTHER'

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED

    -- Delivery
    pickup_location_id VARCHAR(36),                -- From allocation source
    pickup_location_name VARCHAR(255),
    pickup_address TEXT,
    pickup_date TIMESTAMP,

    delivery_address_id VARCHAR(36),               -- From order
    delivery_address TEXT,
    delivery_contact_name VARCHAR(255),
    delivery_contact_phone VARCHAR(50),
    planned_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,

    -- Carrier (for EXTERNAL shipments)
    carrier_name VARCHAR(255),
    carrier_contact VARCHAR(100),
    tracking_number VARCHAR(100),

    -- Notes
    notes TEXT,

    -- Audit
    created_by_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_id (order_id),
    INDEX idx_shipment_number (shipment_number),
    INDEX idx_tms_order_id (tms_order_id),
    INDEX idx_status (status),

    -- Constraints
    UNIQUE KEY uq_tenant_shipment_number (tenant_id, shipment_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (order_id) REFERENCES oms_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

#### 2.1.5 `oms_shipment_items` - Chi Tiết Vận Chuyển

```sql
CREATE TABLE oms_shipment_items (
    -- Primary & Relations
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    shipment_id VARCHAR(36) NOT NULL,
    order_item_id VARCHAR(36) NOT NULL,
    allocation_id VARCHAR(36),                    -- Link to specific allocation

    -- Quantity
    quantity DECIMAL(15,3) NOT NULL,
    delivered_quantity DECIMAL(15,3) DEFAULT 0,

    -- Product (cached)
    product_id VARCHAR(36) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_unit VARCHAR(20) NOT NULL,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shipment_id (shipment_id),
    INDEX idx_order_item_id (order_item_id),
    INDEX idx_allocation_id (allocation_id),

    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (shipment_id) REFERENCES oms_shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES oms_order_items(id)
);
```

#### 2.1.6 `oms_status_logs` - Lịch Sử Trạng Thái

```sql
CREATE TABLE oms_status_logs (
    -- Primary
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,

    -- Entity
    entity_type VARCHAR(50) NOT NULL,             -- 'ORDER', 'SHIPMENT'
    entity_id VARCHAR(36) NOT NULL,

    -- Status Change
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    change_reason TEXT,

    -- Metadata
    changed_by_id VARCHAR(36),
    changed_by_role VARCHAR(50),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Additional data (JSON)
    metadata JSON,

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_changed_at (changed_at),

    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### 2.1.7 `oms_price_approvals` - Duyệt Giá

```sql
CREATE TABLE oms_price_approvals (
    -- Primary & Relations
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,

    -- Approval Request
    requested_by_id VARCHAR(36) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    request_notes TEXT,

    -- Price Comparison (JSON for each item)
    price_comparison JSON,
    /* Format:
    [
      {
        "order_item_id": "xxx",
        "product_code": "PP-001",
        "cs_unit_price": 25000,
        "quoted_unit_price": 23500,
        "difference": -1500,
        "difference_percent": -6.0,
        "reason": "Khách hàng VIP"
      }
    ]
    */

    -- Approval
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
    reviewed_by_id VARCHAR(36),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),

    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (order_id) REFERENCES oms_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by_id) REFERENCES users(id)
);
```

---

## 3. Backend API Structure

### 3.1 Models

**Location**: `backend/app/models/oms/`

```
oms/
├── __init__.py           # Export all models
├── order.py              # OMSOrder, OMSOrderStatus enum
├── order_item.py         # OMSOrderItem
├── allocation.py         # OMSAllocation
├── shipment.py           # OMSShipment, OMSShipmentItem
├── status_log.py         # OMSStatusLog
└── price_approval.py     # OMSPriceApproval
```

### 3.2 Schemas

**Location**: `backend/app/schemas/oms/`

```
oms/
├── __init__.py
├── order.py              # OrderCreate, OrderUpdate, OrderRead, OrderDetail
├── order_item.py         # OrderItemCreate, OrderItemUpdate, OrderItemRead
├── allocation.py         # AllocationCreate, AllocationRead
├── shipment.py           # ShipmentCreate, ShipmentUpdate, ShipmentRead
└── price_approval.py     # PriceApprovalCreate, PriceApprovalReview
```

### 3.3 API Routes

**Location**: `backend/app/api/v1/routes/oms/`

```
oms/
├── __init__.py           # OMS router aggregation
├── orders.py             # Order CRUD + workflow transitions
├── allocations.py        # Allocation management
├── shipments.py          # Shipment CRUD + TMS integration
├── price_approvals.py    # Price approval workflow
└── reports.py            # Sales reports, statistics
```

#### 3.3.1 Orders Endpoints

```python
# backend/app/api/v1/routes/oms/orders.py

router = APIRouter(prefix="/oms/orders", tags=["OMS - Orders"])

# List & Search
@router.get("", response_model=OrderListResponse)
def list_orders(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
)

# Create
@router.post("", response_model=OrderRead)
def create_order(
    payload: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
)

# Get Detail
@router.get("/{order_id}", response_model=OrderDetail)
def get_order(order_id: str, ...)

# Update
@router.put("/{order_id}", response_model=OrderRead)
def update_order(order_id: str, payload: OrderUpdate, ...)

# Delete
@router.delete("/{order_id}")
def delete_order(order_id: str, ...)

# --- Workflow Transitions ---

# Submit for price approval
@router.post("/{order_id}/submit-for-price-approval")
def submit_for_price_approval(order_id: str, ...)

# Approve/Reject price
@router.post("/{order_id}/approve-price")
def approve_price(order_id: str, payload: PriceApprovalReview, ...)

# Submit for allocation
@router.post("/{order_id}/submit-for-allocation")
def submit_for_allocation(order_id: str, ...)

# Confirm allocation
@router.post("/{order_id}/confirm-allocation")
def confirm_allocation(order_id: str, ...)

# Cancel order
@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, payload: CancelRequest, ...)

# --- Reports ---

# Get status history
@router.get("/{order_id}/status-history", response_model=List[StatusLogRead])
def get_status_history(order_id: str, ...)

# Get shipments
@router.get("/{order_id}/shipments", response_model=List[ShipmentRead])
def get_order_shipments(order_id: str, ...)

# Get allocations
@router.get("/{order_id}/allocations", response_model=List[AllocationRead])
def get_order_allocations(order_id: str, ...)
```

#### 3.3.2 Allocations Endpoints

```python
# backend/app/api/v1/routes/oms/allocations.py

router = APIRouter(prefix="/oms/allocations", tags=["OMS - Allocations"])

# Allocate stock to order item
@router.post("")
def create_allocation(payload: AllocationCreate, ...)

# Update allocation
@router.put("/{allocation_id}")
def update_allocation(allocation_id: str, payload: AllocationUpdate, ...)

# Delete allocation
@router.delete("/{allocation_id}")
def delete_allocation(allocation_id: str, ...)

# Get available stock for product
@router.get("/available-stock/{product_id}")
def get_available_stock(product_id: str, ...)
# This calls WMS API to get real-time stock
```

#### 3.3.3 Shipments Endpoints

```python
# backend/app/api/v1/routes/oms/shipments.py

router = APIRouter(prefix="/oms/shipments", tags=["OMS - Shipments"])

# Create shipment (and optionally create TMS order)
@router.post("")
def create_shipment(payload: ShipmentCreate, ...)

# List shipments
@router.get("")
def list_shipments(...)

# Get shipment detail
@router.get("/{shipment_id}")
def get_shipment(shipment_id: str, ...)

# Update shipment
@router.put("/{shipment_id}")
def update_shipment(shipment_id: str, payload: ShipmentUpdate, ...)

# Sync status from TMS
@router.post("/{shipment_id}/sync-status")
def sync_shipment_status(shipment_id: str, ...)

# TMS webhook callback
@router.post("/tms-webhook")
def tms_status_webhook(payload: TMSWebhookPayload, ...)
```

### 3.4 Services

**Location**: `backend/app/services/oms/`

```
oms/
├── __init__.py
├── order_calculator.py       # Calculate totals, taxes
├── price_validator.py        # Validate pricing rules
├── allocation_service.py     # Check stock, reserve inventory
├── tms_integration.py        # Create TMS orders, sync status
├── crm_integration.py        # Get customer data, addresses
├── wms_integration.py        # Get stock availability
└── workflow_service.py       # Handle approval workflows
```

#### 3.4.1 Order Calculator Service

```python
# backend/app/services/oms/order_calculator.py

def calculate_order_totals(order: OMSOrder, items: List[OMSOrderItem]) -> Dict:
    """
    Calculate order totals based on items

    Returns:
        {
            "total_product_amount": Decimal,
            "total_shipping_cost": Decimal,
            "total_tax": Decimal,
            "total_discount": Decimal,
            "grand_total": Decimal
        }
    """
    total_product = Decimal(0)
    total_shipping = Decimal(0)
    total_tax = Decimal(0)

    for item in items:
        # Calculate line total
        unit_price = item.approved_unit_price or item.quoted_unit_price
        shipping_cost = item.shipping_unit_cost or Decimal(0)

        line_total = (unit_price + shipping_cost) * item.quantity
        item.line_total = line_total

        # Calculate tax (VAT 10%)
        tax = line_total * Decimal("0.1")
        item.tax_amount = tax

        # Sum
        total_product += unit_price * item.quantity
        total_shipping += shipping_cost * item.quantity
        total_tax += tax

    grand_total = total_product + total_shipping + total_tax - order.total_discount

    return {
        "total_product_amount": total_product,
        "total_shipping_cost": total_shipping,
        "total_tax": total_tax,
        "grand_total": grand_total
    }

def compare_with_cs_price(
    quoted_price: Decimal,
    cs_price: Decimal
) -> Dict:
    """
    Compare quoted price with CS price

    Returns:
        {
            "difference": Decimal,
            "difference_percent": float,
            "requires_approval": bool
        }
    """
    difference = quoted_price - cs_price
    difference_percent = float((difference / cs_price) * 100) if cs_price > 0 else 0

    # Require approval if price is lower than CS price
    requires_approval = difference < 0

    return {
        "difference": difference,
        "difference_percent": difference_percent,
        "requires_approval": requires_approval
    }
```

#### 3.4.2 TMS Integration Service

```python
# backend/app/services/oms/tms_integration.py

async def create_tms_order_from_shipment(
    session: Session,
    shipment: OMSShipment,
    tenant_id: str
) -> str:
    """
    Create TMS order from OMS shipment

    Returns: TMS order_id
    """
    # Prepare TMS order data
    tms_payload = {
        "external_order_id": shipment.order_id,
        "external_reference": shipment.shipment_number,
        "pickup_location": {
            "name": shipment.pickup_location_name,
            "address": shipment.pickup_address,
        },
        "delivery_location": {
            "address": shipment.delivery_address,
            "contact_name": shipment.delivery_contact_name,
            "contact_phone": shipment.delivery_contact_phone,
        },
        "items": [],
        "required_delivery_date": shipment.planned_delivery_date.isoformat() if shipment.planned_delivery_date else None,
    }

    # Add items
    shipment_items = session.exec(
        select(OMSShipmentItem).where(OMSShipmentItem.shipment_id == shipment.id)
    ).all()

    for item in shipment_items:
        tms_payload["items"].append({
            "product_code": item.product_code,
            "product_name": item.product_name,
            "quantity": float(item.quantity),
            "unit": item.product_unit,
        })

    # Call TMS API
    tms_api_url = settings.TMS_API_URL + "/api/v1/orders"
    headers = {
        "Authorization": f"Bearer {settings.TMS_API_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(tms_api_url, json=tms_payload, headers=headers)
        response.raise_for_status()

        tms_order = response.json()
        return tms_order["id"]

def handle_tms_status_update(
    session: Session,
    shipment_id: str,
    tms_status: str,
    tenant_id: str
) -> None:
    """
    Handle TMS status webhook callback

    Maps TMS status to OMS shipment status:
    - TMS ASSIGNED → OMS ASSIGNED
    - TMS IN_TRANSIT → OMS IN_TRANSIT
    - TMS DELIVERED → OMS DELIVERED
    """
    shipment = session.get(OMSShipment, shipment_id)
    if not shipment or str(shipment.tenant_id) != tenant_id:
        raise ValueError("Shipment not found")

    # Map TMS status to OMS status
    status_mapping = {
        "ASSIGNED": "ASSIGNED",
        "IN_TRANSIT": "IN_TRANSIT",
        "DELIVERED": "DELIVERED",
        "CANCELLED": "CANCELLED",
    }

    new_status = status_mapping.get(tms_status)
    if not new_status:
        return

    # Update shipment status
    old_status = shipment.status
    shipment.status = new_status
    shipment.updated_at = datetime.utcnow()

    # If delivered, update delivered quantities
    if new_status == "DELIVERED":
        shipment.actual_delivery_date = datetime.utcnow()
        update_delivered_quantities(session, shipment)

    # Log status change
    log_status_change(
        session, "SHIPMENT", shipment.id, old_status, new_status,
        "Updated from TMS", tenant_id
    )

    # Check if order is fully delivered
    check_and_complete_order(session, shipment.order_id)

    session.commit()
```

#### 3.4.3 CRM Integration Service

```python
# backend/app/services/oms/crm_integration.py

async def get_customer_info(customer_id: str, tenant_id: str) -> Dict:
    """
    Get customer information from CRM

    Returns customer data including name, phone, addresses, etc.
    """
    crm_api_url = f"{settings.CRM_API_URL}/api/v1/customers/{customer_id}"
    headers = {
        "Authorization": f"Bearer {settings.CRM_API_TOKEN}",
        "X-Tenant-ID": tenant_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(crm_api_url, headers=headers)
        response.raise_for_status()
        return response.json()

async def get_customer_addresses(customer_id: str, tenant_id: str) -> List[Dict]:
    """
    Get all addresses for a customer from CRM
    """
    crm_api_url = f"{settings.CRM_API_URL}/api/v1/customers/{customer_id}/addresses"
    headers = {
        "Authorization": f"Bearer {settings.CRM_API_TOKEN}",
        "X-Tenant-ID": tenant_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(crm_api_url, headers=headers)
        response.raise_for_status()
        return response.json()

async def get_customer_pricing_tier(customer_id: str, tenant_id: str) -> Optional[str]:
    """
    Get customer pricing tier from CRM (if applicable)
    Could be used for automatic pricing rules
    """
    customer = await get_customer_info(customer_id, tenant_id)
    return customer.get("pricing_tier")
```

#### 3.4.4 WMS Integration Service

```python
# backend/app/services/oms/wms_integration.py

async def get_product_stock(
    product_id: str,
    tenant_id: str
) -> Dict:
    """
    Get product stock availability from WMS

    Returns:
        {
            "product_id": str,
            "product_code": str,
            "product_name": str,
            "warehouses": [
                {
                    "source_id": str,
                    "source_type": "WAREHOUSE",
                    "source_name": str,
                    "location": str,
                    "available_quantity": Decimal
                },
                ...
            ],
            "ports": [...],
            "in_transit": [...],
            "total_available": Decimal
        }
    """
    wms_api_url = f"{settings.WMS_API_URL}/api/v1/inventory/{product_id}/availability"
    headers = {
        "Authorization": f"Bearer {settings.WMS_API_TOKEN}",
        "X-Tenant-ID": tenant_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(wms_api_url, headers=headers)
        response.raise_for_status()
        return response.json()

async def reserve_inventory(
    product_id: str,
    source_id: str,
    source_type: str,
    quantity: Decimal,
    reference_id: str,  # allocation_id
    tenant_id: str
) -> bool:
    """
    Reserve inventory in WMS for an allocation

    Returns: True if successful
    """
    wms_api_url = f"{settings.WMS_API_URL}/api/v1/inventory/reserve"
    headers = {
        "Authorization": f"Bearer {settings.WMS_API_TOKEN}",
        "X-Tenant-ID": tenant_id,
        "Content-Type": "application/json",
    }

    payload = {
        "product_id": product_id,
        "source_id": source_id,
        "source_type": source_type,
        "quantity": float(quantity),
        "reference_type": "OMS_ALLOCATION",
        "reference_id": reference_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(wms_api_url, json=payload, headers=headers)
        response.raise_for_status()
        return True

async def release_inventory(
    reference_id: str,  # allocation_id
    tenant_id: str
) -> bool:
    """
    Release inventory reservation in WMS
    """
    wms_api_url = f"{settings.WMS_API_URL}/api/v1/inventory/release"
    headers = {
        "Authorization": f"Bearer {settings.WMS_API_TOKEN}",
        "X-Tenant-ID": tenant_id,
        "Content-Type": "application/json",
    }

    payload = {
        "reference_type": "OMS_ALLOCATION",
        "reference_id": reference_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(wms_api_url, json=payload, headers=headers)
        response.raise_for_status()
        return True
```

---

## 4. Frontend Structure

### 4.1 Pages

**Location**: `frontend/app/(protected)/oms/`

```
oms/
├── page.tsx                      # OMS Dashboard
├── orders/
│   ├── page.tsx                  # Orders list
│   ├── new/
│   │   └── page.tsx              # Create new order
│   └── [id]/
│       └── page.tsx              # Order detail & edit
├── allocations/
│   └── page.tsx                  # Allocations management
├── shipments/
│   └── page.tsx                  # Shipments tracking
├── price-approvals/
│   └── page.tsx                  # Price approval queue (for Managers)
└── reports/
    └── page.tsx                  # Sales reports
```

### 4.2 Components

**Location**: `frontend/components/oms/`

```
oms/
├── OrderForm.tsx                 # Order create/edit form
├── OrderStatusBadge.tsx          # Status display badge
├── OrderItemsTable.tsx           # Order items table
├── AllocationPanel.tsx           # Stock allocation UI
├── ShipmentCard.tsx              # Shipment display card
├── PriceComparisonTable.tsx      # Compare quoted vs CS price
├── StatusTimeline.tsx            # Order status history timeline
└── CustomerSelector.tsx          # Customer search & select (from CRM)
```

### 4.3 Key Pages Implementation

#### 4.3.1 Orders List Page

```typescript
// frontend/app/(protected)/oms/orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface OMSOrder {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  grand_total: number;
  required_delivery_date?: string;
  created_at: string;
}

export default function OMSOrdersPage() {
  const t = useTranslations();
  const [orders, setOrders] = useState<OMSOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    from_date: "",
    to_date: "",
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.skip]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: pagination.skip.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });

      const response = await apiFetch<{
        data: OMSOrder[];
        total: number;
      }>(`/oms/orders?${params}`);

      setOrders(response.data);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("oms.orders")}</h1>
        <Link
          href="/oms/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t("oms.createOrder")}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("common.status")}
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">{t("common.all")}</option>
              <option value="DRAFT">{t("oms.status.draft")}</option>
              <option value="PENDING_PRICE_APPROVAL">{t("oms.status.pendingPriceApproval")}</option>
              <option value="PENDING_ALLOCATION">{t("oms.status.pendingAllocation")}</option>
              <option value="READY_TO_SHIP">{t("oms.status.readyToShip")}</option>
              <option value="IN_TRANSIT">{t("oms.status.inTransit")}</option>
              <option value="DELIVERED">{t("oms.status.delivered")}</option>
              <option value="COMPLETED">{t("oms.status.completed")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("common.search")}
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder={t("oms.searchOrders")}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("common.fromDate")}
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("common.toDate")}
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t("oms.orderNumber")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t("oms.customer")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t("common.status")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {t("oms.total")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t("oms.deliveryDate")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  {t("common.loading")}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {t("oms.noOrders")}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/oms/orders/${order.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{order.customer_name}</td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(order.grand_total)}
                  </td>
                  <td className="px-6 py-4">
                    {order.required_delivery_date
                      ? new Date(order.required_delivery_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/oms/orders/${order.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {t("common.view")}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {t("common.showing")} {pagination.skip + 1} -{" "}
          {Math.min(pagination.skip + pagination.limit, pagination.total)} {t("common.of")}{" "}
          {pagination.total}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={pagination.skip === 0}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                skip: Math.max(0, prev.skip - prev.limit),
              }))
            }
          >
            {t("common.previous")}
          </button>
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={pagination.skip + pagination.limit >= pagination.total}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                skip: prev.skip + prev.limit,
              }))
            }
          >
            {t("common.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 4.3.2 Order Detail Page

This page would show:
- Order header information
- Customer details
- Order items table with pricing
- Allocation panel (for Admin)
- Shipments list
- Status timeline
- Action buttons based on current status and user role

---

## 5. Integration Points

### 5.1 TMS Integration

**Direction**: OMS → TMS (Real-time API)

**When**: When creating shipment

**Flow**:
1. Dispatcher creates shipment in OMS
2. OMS calls TMS API to create order
3. TMS returns `order_id`
4. OMS stores `tms_order_id` in shipment

**Status Sync**: TMS → OMS (Webhook)

**Flow**:
1. TMS order status changes
2. TMS sends webhook to OMS: `POST /api/v1/oms/shipments/tms-webhook`
3. OMS updates shipment status
4. OMS checks if all shipments delivered → complete order

### 5.2 CRM Integration

**Direction**: OMS ← CRM (API calls)

**When**:
- Creating order (get customer info)
- Selecting delivery address

**Endpoints Used**:
- `GET /api/v1/customers/{id}` - Get customer details
- `GET /api/v1/customers/{id}/addresses` - Get customer addresses

### 5.3 WMS Integration

**Direction**: OMS ← WMS (API calls)

**When**:
- Checking stock availability
- Allocating inventory
- Reserving stock

**Endpoints Used**:
- `GET /api/v1/inventory/{product_id}/availability` - Get stock
- `POST /api/v1/inventory/reserve` - Reserve stock
- `POST /api/v1/inventory/release` - Release reservation

### 5.4 Accounting Integration

**Direction**: OMS → Accounting (Events/API)

**When**: Order completed

**Data Sent**:
- Order details
- Customer info
- Amounts (product, shipping, tax, total)
- Payment terms

---

## 6. Workflow & State Machine

### 6.1 Order Status State Machine

```
                    [DRAFT]
                       ↓
       (Sale submits for price approval)
                       ↓
          [PENDING_PRICE_APPROVAL]
                  ↙        ↘
       (Rejected)          (Approved)
          ↓                   ↓
    [PRICE_REJECTED]    [PRICE_APPROVED]
          ↓                   ↓
       [DRAFT]         (Auto-submit to Admin)
                              ↓
                   [PENDING_ALLOCATION]
                              ↓
                  (Admin allocates stock)
                              ↓
                  [ALLOCATION_CONFIRMED]
                              ↓
              (Dispatcher creates shipment)
                              ↓
                     [READY_TO_SHIP]
                              ↓
                     (TMS picks up)
                              ↓
                      [IN_TRANSIT]
                              ↓
                    (TMS delivers)
                              ↓
                       [DELIVERED]
                              ↓
          (All shipments delivered + accounting synced)
                              ↓
                       [COMPLETED]

    (Can cancel from any status before IN_TRANSIT)
                              ↓
                       [CANCELLED]
```

### 6.2 Shipment Status State Machine

```
          [PENDING]
              ↓
  (Assigned to driver in TMS)
              ↓
          [ASSIGNED]
              ↓
    (Driver picks up)
              ↓
        [IN_TRANSIT]
              ↓
    (Driver delivers)
              ↓
         [DELIVERED]
```

---

## 7. Implementation Phases

### Phase 1: Core OMS (Week 1-2)
- Database schema & migrations
- Backend models & schemas
- Basic CRUD APIs for orders
- Frontend pages: Orders list, Create order, Order detail
- Customer selector (CRM integration)

### Phase 2: Pricing & Approval (Week 3)
- Price approval workflow
- Price comparison logic
- Manager approval UI
- Status transition APIs

### Phase 3: Allocation & Inventory (Week 4)
- WMS integration
- Stock allocation UI
- Allocation management
- Reserve/release inventory

### Phase 4: Shipment & TMS Integration (Week 5)
- Shipment creation
- TMS API integration
- TMS webhook handler
- Shipment tracking UI

### Phase 5: Reports & Analytics (Week 6)
- Sales reports
- Order analytics
- Status dashboards
- Export functions

---

## 8. API Permissions Matrix

| Endpoint | Sales | Sales Manager | Admin | Dispatcher |
|----------|-------|---------------|-------|------------|
| List orders | Own only | All | All | All |
| Create order | ✓ | ✓ | ✓ | ✗ |
| Update order (DRAFT) | Own only | Own only | All | ✗ |
| Delete order | Own only | Own only | All | ✗ |
| Submit for price approval | ✓ | ✓ | ✗ | ✗ |
| Approve/Reject price | ✗ | ✓ | ✗ | ✗ |
| Allocate stock | ✗ | ✗ | ✓ | ✗ |
| Create shipment | ✗ | ✗ | ✗ | ✓ |
| Update shipment status | ✗ | ✗ | ✗ | ✓ |
| View reports | Own only | All | All | All |

---

## 9. Next Steps

1. **Review & Approve** this design document
2. **Set up database** - Run migrations
3. **Implement Phase 1** - Core OMS functionality
4. **Test CRM integration** - Ensure customer data flows correctly
5. **Implement Phase 2** - Pricing workflow
6. **Test WMS integration** - Ensure inventory allocation works
7. **Implement Phase 3** - Allocation system
8. **Test TMS integration** - Ensure shipment creation & status sync works
9. **Implement Phase 4** - Shipment management
10. **Implement Phase 5** - Reports & analytics
11. **UAT (User Acceptance Testing)** with actual users
12. **Production deployment**

---

## 10. Technical Considerations

### 10.1 Performance
- Index on `tenant_id`, `status`, `customer_id`, `created_at`
- Use pagination for large result sets
- Cache customer data from CRM (with TTL)
- Use database views for complex reports

### 10.2 Security
- Always filter by `tenant_id`
- Role-based access control on all endpoints
- Validate all foreign keys belong to same tenant
- Audit log for price approvals and status changes

### 10.3 Scalability
- Stateless API design
- Async processing for webhooks
- Queue system for heavy operations (reports, exports)
- Database connection pooling

### 10.4 Error Handling
- Graceful degradation if WMS/CRM/TMS unavailable
- Retry logic for API calls
- Clear error messages to users
- Alert system for integration failures

---

## Appendix A: Sample Data Flow

### Creating an Order (Happy Path)

1. **Sales creates order**
   ```
   POST /api/v1/oms/orders
   {
     "customer_id": "cust-123",
     "delivery_address_id": "addr-456",
     "required_delivery_date": "2026-01-20",
     "items": [
       {
         "product_id": "prod-789",
         "quantity": 1000,
         "quoted_unit_price": 23500,
         "shipping_unit_cost": 200
       }
     ]
   }
   ```

   **System**:
   - Fetches customer info from CRM
   - Fetches current CS price from product catalog
   - Compares quoted vs CS price
   - Creates order with status DRAFT
   - Creates order items

   **Response**:
   ```json
   {
     "id": "ord-001",
     "order_number": "ORD-20260115-0001",
     "status": "DRAFT",
     "customer_name": "Công ty ABC",
     "grand_total": 23700000,
     "items": [...]
   }
   ```

2. **Sales submits for price approval** (if quoted < CS)
   ```
   POST /api/v1/oms/orders/ord-001/submit-for-price-approval
   {
     "notes": "Khách hàng VIP, đặt số lượng lớn"
   }
   ```

   **System**:
   - Changes status to PENDING_PRICE_APPROVAL
   - Creates price approval record
   - Sends notification to Manager

3. **Manager approves price**
   ```
   POST /api/v1/oms/orders/ord-001/approve-price
   {
     "approved": true,
     "notes": "OK cho khách VIP"
   }
   ```

   **System**:
   - Updates price approval record
   - Sets approved_unit_price on order items
   - Changes status to PRICE_APPROVED
   - Auto-submits to Admin for allocation

4. **Admin allocates stock**
   ```
   POST /api/v1/oms/allocations
   {
     "order_id": "ord-001",
     "order_item_id": "item-001",
     "source_type": "WAREHOUSE",
     "source_id": "wh-hanoi",
     "allocated_quantity": 600
   }

   POST /api/v1/oms/allocations
   {
     "order_id": "ord-001",
     "order_item_id": "item-001",
     "source_type": "PORT",
     "source_id": "port-haiphong",
     "allocated_quantity": 400
   }
   ```

   **System**:
   - Checks available stock in WMS
   - Creates allocation records
   - Reserves inventory in WMS
   - Updates order_item.quantity_allocated

   ```
   POST /api/v1/oms/orders/ord-001/confirm-allocation
   ```

   **System**:
   - Validates all items fully allocated
   - Changes status to ALLOCATION_CONFIRMED

5. **Dispatcher creates shipments**
   ```
   POST /api/v1/oms/shipments
   {
     "order_id": "ord-001",
     "shipment_type": "INTERNAL",
     "items": [
       {
         "order_item_id": "item-001",
         "allocation_id": "alloc-001",
         "quantity": 600
       }
     ]
   }
   ```

   **System**:
   - Creates shipment record
   - Calls TMS API to create order
   - Stores tms_order_id
   - Changes order status to READY_TO_SHIP

6. **TMS updates status** (via webhook)
   ```
   POST /api/v1/oms/shipments/tms-webhook
   {
     "tms_order_id": "tms-789",
     "status": "IN_TRANSIT"
   }
   ```

   **System**:
   - Finds shipment by tms_order_id
   - Updates shipment status
   - Updates order status to IN_TRANSIT

7. **TMS delivers** (via webhook)
   ```
   POST /api/v1/oms/shipments/tms-webhook
   {
     "tms_order_id": "tms-789",
     "status": "DELIVERED"
   }
   ```

   **System**:
   - Updates shipment status to DELIVERED
   - Sets actual_delivery_date
   - Updates order_item.quantity_delivered
   - Checks if all shipments delivered
   - If yes, changes order status to DELIVERED
   - Triggers accounting sync
   - Changes order status to COMPLETED

---

## Appendix B: Environment Configuration

```bash
# .env.local (backend)

# TMS Integration
TMS_API_URL=http://localhost:8000
TMS_API_TOKEN=your-tms-api-token

# CRM Integration
CRM_API_URL=http://localhost:8001
CRM_API_TOKEN=your-crm-api-token

# WMS Integration
WMS_API_URL=http://localhost:8002
WMS_API_TOKEN=your-wms-api-token

# Accounting Integration
ACCOUNTING_API_URL=http://localhost:8003
ACCOUNTING_API_TOKEN=your-accounting-api-token
```

---

## Document End

This document provides a comprehensive design for the OMS module. Please review and provide feedback before implementation begins.

# VNSS ERP System Architecture

> **Mục đích**: Tài liệu này mô tả toàn bộ kiến trúc hệ thống ERP. Claude AI sẽ đọc file này để hiểu cấu trúc và đảm bảo tính nhất quán khi phát triển.

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SQLModel |
| Database | PostgreSQL 15 |
| Auth | JWT (access_token in localStorage) |

### 1.2 Cấu trúc thư mục

```
D:\vnss_tms\
├── backend\
│   ├── app\
│   │   ├── api\v1\routes\      # API endpoints
│   │   ├── models\             # SQLModel database models
│   │   ├── services\           # Business logic
│   │   ├── core\               # Security, config
│   │   └── db\                 # Database session
│   └── alembic\                # Database migrations
├── frontend\
│   ├── app\(protected)\        # Protected pages (require auth)
│   ├── components\             # Shared React components
│   └── lib\                    # Utilities (api.ts)
└── ARCHITECTURE.md             # This file
```

### 1.3 Các Module ERP

| Module | Mô tả | Status |
|--------|-------|--------|
| **TMS** | Transport Management System | ✅ Active |
| **CRM** | Customer Relationship Management | ✅ Active |
| **HRM** | Human Resource Management | ✅ Active |
| **WMS** | Warehouse Management System | ✅ Active |
| **Accounting** | Kế toán tài chính | ✅ Active |
| **Project** | Quản lý dự án | ✅ Active |
| **Document** | Quản lý tài liệu | ✅ Active |
| **Workflow** | Workflow Engine | ✅ Active |

---

## 2. DATABASE MODELS

### 2.1 Multi-tenancy

Tất cả models đều có field `tenant_id` để hỗ trợ multi-tenant:

```python
class BaseModel(SQLModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
```

### 2.2 CRM Models

**Location**: `backend/app/models/crm/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Lead** | crm_leads | code, full_name, email, phone, source, status | → Account (khi convert) |
| **Account** | crm_accounts | code, name, tax_code, credit_limit, tms_customer_id | → Contacts, Opportunities, Quotes |
| **Contact** | crm_contacts | full_name, email, phone, is_primary | → Account |
| **Opportunity** | crm_opportunities | code, name, stage, probability, amount | → Account, Quotes |
| **Quote** | crm_quotes | quote_number, status, total_amount | → Account, Opportunity, QuoteItems |
| **Contract** | crm_contracts | code, contract_type, total_value | → Account |
| **SalesOrder** | crm_sales_orders | code, status, total_amount | → Account |
| **Activity** | crm_activities | activity_type, subject, status | → Account, Contact, Lead |

**Status Enums**:
- Lead: NEW, CONTACTED, QUALIFIED, CONVERTED, LOST
- Opportunity: PROSPECTING, QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
- Quote: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED

### 2.3 HRM Models

**Location**: `backend/app/models/hrm/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Employee** | hrm_employees | employee_code, full_name, email, status, driver_id | → Department, Position, Driver |
| **Department** | hrm_departments | code, name, manager_id | → Branch, Employees |
| **Branch** | hrm_branches | code, name, address | → Departments |
| **Position** | hrm_positions | code, name, level, salary range | → Employees |
| **LeaveRequest** | hrm_leave_requests | from_date, to_date, status | → Employee |
| **PayrollRecord** | hrm_payroll_records | basic_salary, net_salary | → Employee, PayrollPeriod |
| **Contract** | hrm_contracts | contract_type, start_date, end_date | → Employee |
| **AttendanceRecord** | hrm_attendance | check_in, check_out, status | → Employee |

**Status Enums**:
- Employee: ACTIVE, INACTIVE, PROBATION, TERMINATED
- LeaveRequest: PENDING, APPROVED, REJECTED, CANCELLED
- Contract: DRAFT, ACTIVE, EXPIRED, TERMINATED

### 2.4 TMS Models

**Location**: `backend/app/models/` (root)

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Customer** | tms_customers | code, name, tax_code | → Orders |
| **Order** | tms_orders | order_number, status, pickup_date | → Customer, Trip, Driver |
| **Trip** | tms_trips | trip_number, status, start_date | → Vehicle, Driver, Orders |
| **Vehicle** | tms_vehicles | plate_number, type, status | → Trips |
| **Driver** | tms_drivers | driver_code, name, license_number | → Employee, Trips |
| **FuelLog** | tms_fuel_logs | liters, cost, odometer | → Vehicle, Driver |
| **MaintenanceRecord** | tms_maintenance_records | service_type, cost | → Vehicle |

**Status Enums**:
- Order: DRAFT, PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED
- Trip: PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
- Vehicle: ACTIVE, INACTIVE, MAINTENANCE

### 2.5 WMS Models

**Location**: `backend/app/models/wms/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Warehouse** | wms_warehouses | code, name, capacity | → Zones, Locations |
| **Product** | wms_products | code, name, sku, weight | → Category, StockLevels |
| **StockLevel** | wms_stock_levels | quantity_on_hand, reserved | → Product, Warehouse, Location |
| **GoodsReceipt** | wms_goods_receipts | receipt_number, status | → Supplier, ReceiptLines |
| **DeliveryOrder** | wms_delivery_orders | delivery_number, status | → Customer, OrderLines |
| **StockTransfer** | wms_stock_transfers | transfer_number, status | → Source/Dest Warehouse |

### 2.6 Accounting Models

**Location**: `backend/app/models/accounting/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **ChartOfAccounts** | acc_chart_of_accounts | account_code, name, classification | → Parent Account |
| **FiscalYear** | acc_fiscal_years | year, start_date, end_date | → FiscalPeriods |
| **JournalEntry** | acc_journal_entries | entry_number, status | → JournalEntryLines |
| **JournalEntryLine** | acc_journal_entry_lines | debit, credit | → Account, JournalEntry |
| **CostCenter** | acc_cost_centers | code, name | → JournalEntryLines |

**Classification Enums**: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, CONTRA

### 2.7 Project Models

**Location**: `backend/app/models/project/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Project** | prj_projects | code, name, status, budget | → Tasks, Milestones, Members |
| **Task** | prj_tasks | task_number, title, status | → Project, Assignee |
| **Milestone** | prj_milestones | name, due_date | → Project, Tasks |
| **ProjectMember** | prj_project_members | role | → Project, User |

### 2.8 Workflow Models

**Location**: `backend/app/models/workflow/`

| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **WorkflowDefinition** | wf_definitions | code, name, entity_type, status | → Steps, Transitions |
| **WorkflowStep** | wf_steps | code, name, step_type, assignee_type | → Definition |
| **WorkflowInstance** | wf_instances | instance_number, status | → Definition, StepInstances |
| **WorkflowStepInstance** | wf_step_instances | status, action_taken | → Instance, Step |
| **WorkflowTask** | wf_tasks | task_number, status | → Instance |
| **WorkflowHistory** | wf_history | event_type, action | → Instance |

---

## 3. API ENDPOINTS

### 3.1 Base URL & Authentication

```
Base URL: http://localhost:8001/api/v1
Auth Header: Authorization: Bearer {access_token}
```

### 3.2 CRM APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/crm/leads` | GET, POST | List/Create leads |
| `/crm/leads/{id}` | GET, PUT, DELETE | CRUD single lead |
| `/crm/leads/{id}/convert` | POST | Convert lead → Account + Contact |
| `/crm/accounts` | GET, POST | List/Create accounts |
| `/crm/accounts/{id}/sync-to-tms` | POST | Sync to TMS Customer |
| `/crm/contacts` | GET, POST | List/Create contacts |
| `/crm/opportunities` | GET, POST | List/Create opportunities |
| `/crm/opportunities/{id}/close-won` | POST | Mark as won |
| `/crm/opportunities/{id}/close-lost` | POST | Mark as lost |
| `/crm/quotes` | GET, POST | List/Create quotes |
| `/crm/quotes/{id}/send` | POST | Mark as sent |
| `/crm/quotes/{id}/accept` | POST | Accept quote |
| `/crm/quotes/{id}/reject` | POST | Reject quote |

### 3.3 HRM APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hrm/employees` | GET, POST | List/Create employees |
| `/hrm/employees/{id}` | GET, PATCH, DELETE | CRUD single employee |
| `/hrm/departments` | GET, POST | Department management |
| `/hrm/branches` | GET, POST | Branch management |
| `/hrm/positions` | GET, POST | Position management |
| `/hrm/leaves` | GET, POST | Leave requests |
| `/hrm/leaves/{id}/approve` | POST | Approve leave |
| `/hrm/leaves/{id}/reject` | POST | Reject leave |
| `/hrm/payroll/periods` | GET, POST | Payroll periods |
| `/hrm/payroll/calculate` | POST | Calculate payroll |
| `/hrm/attendance` | GET, POST | Attendance records |
| `/hrm/attendance/checkin` | POST | Employee check-in |
| `/hrm/attendance/checkout` | POST | Employee check-out |

### 3.4 TMS APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orders` | GET, POST | Order management |
| `/orders/{id}/pickup` | POST | Start pickup |
| `/orders/{id}/delivered` | POST | Mark delivered |
| `/orders/{id}/complete` | POST | Complete order |
| `/trips` | GET, POST | Trip management |
| `/vehicles` | GET, POST | Vehicle fleet |
| `/drivers` | GET, POST | Driver management |
| `/fuel-logs` | GET, POST | Fuel consumption |
| `/maintenance-records` | GET, POST | Maintenance tracking |
| `/customers` | GET, POST | TMS customers |
| `/rates` | GET, POST | Shipping rates |

### 3.5 WMS APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/wms/warehouses` | GET, POST | Warehouse management |
| `/wms/products` | GET, POST | Product catalog |
| `/wms/stock` | GET | Stock levels |
| `/wms/goods-receipts` | GET, POST | Inbound receipts |
| `/wms/delivery-orders` | GET, POST | Outbound orders |
| `/wms/transfers` | GET, POST | Internal transfers |

### 3.6 Accounting APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/accounting/chart-of-accounts` | GET, POST | Account management |
| `/accounting/fiscal-years` | GET, POST | Fiscal year setup |
| `/accounting/fiscal-years/{id}/generate-periods` | POST | Generate 12 periods |
| `/accounting/journal-entries` | GET, POST | Journal entries |
| `/accounting/journal-entries/{id}/post` | POST | Post entry to GL |
| `/accounting/journal-entries/{id}/reverse` | POST | Reverse entry |
| `/accounting/cost-centers` | GET, POST | Cost centers |

### 3.7 Project APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/project/projects` | GET, POST | Project management |
| `/project/projects/{id}/start` | POST | Start project |
| `/project/projects/{id}/complete` | POST | Complete project |
| `/project/tasks` | GET, POST | Task management |
| `/project/tasks/{id}/status` | PATCH | Update task status |
| `/project/milestones` | GET, POST | Milestone tracking |

### 3.8 Workflow APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflow/workflow-definitions` | GET, POST | Definition management |
| `/workflow/workflow-definitions/{id}/activate` | POST | Activate workflow |
| `/workflow/workflow-definitions/{id}/deactivate` | POST | Deactivate workflow |
| `/workflow/workflow-steps` | GET, POST | Step management |
| `/workflow/workflow-instances` | GET, POST | Start workflow |
| `/workflow/workflow-instances/{id}` | GET | Get instance with steps & history |
| `/workflow/workflow-instances/{id}/action` | POST | Take action (APPROVE/REJECT) |
| `/workflow/workflow-instances/{id}/cancel` | POST | Cancel workflow |
| `/workflow/workflow-tasks` | GET, POST | Task management |
| `/workflow/workflow-tasks/{id}/claim` | PATCH | Claim task |
| `/workflow/workflow-tasks/{id}/complete` | PATCH | Complete task |
| `/workflow/my-pending-tasks` | GET | Tasks assigned to current user |

---

## 4. FRONTEND PAGES

### 4.1 Main Dashboard
- `/` - Platform dashboard with all modules

### 4.2 TMS Module (`/tms`)
- `/tms` - TMS Dashboard
- `/tms/orders` - Order management
- `/tms/shipments` - Shipment tracking
- `/trips` - Trip management
- `/tms/vehicles` - Vehicle fleet
- `/tms/drivers` - Driver management
- `/tms/customers` - Customer master
- `/tms/rates` - Rate management
- `/tms/fuel-logs` - Fuel tracking
- `/tms/maintenance/*` - Maintenance management
- `/tms/*-reports` - Various reports

### 4.3 CRM Module (`/crm`)
- `/crm` - CRM Dashboard
- `/crm/leads` - Lead management (+ /new, /[id])
- `/crm/accounts` - Account management (+ /new, /[id])
- `/crm/contacts` - Contact management (+ /new, /[id])
- `/crm/opportunities` - Opportunity pipeline (+ /new, /[id])
- `/crm/quotes` - Quote management (+ /new, /[id])
- `/crm/contracts` - Contract management
- `/crm/activities` - Activity tracking
- `/crm/reports/*` - Sales reports

### 4.4 HRM Module (`/hrm`)
- `/hrm` - HRM Dashboard
- `/hrm/employees` - Employee management (+ /new, /[id]/edit)
- `/hrm/departments` - Department structure
- `/hrm/branches` - Branch offices
- `/hrm/positions` - Job positions
- `/hrm/leaves` - Leave management
- `/hrm/attendance` - Attendance tracking
- `/hrm/payroll` - Payroll processing
- `/hrm/contracts` - Employment contracts
- `/hrm/recruitment` - Hiring process
- `/hrm/training` - Training programs
- `/hrm/reports/*` - HR reports

### 4.5 WMS Module (`/wms`)
- `/wms` - WMS Dashboard
- `/wms/warehouses` - Warehouse setup
- `/wms/products` - Product catalog
- `/wms/stock` - Stock levels
- `/wms/inbound` - Goods receipt
- `/wms/outbound` - Delivery orders
- `/wms/transfers` - Stock transfers
- `/wms/inventory` - Inventory counts

### 4.6 Accounting Module (`/accounting`)
- `/accounting` - Accounting Dashboard
- `/accounting/chart-of-accounts` - Chart of Accounts
- `/accounting/journal-entries` - Journal entries
- `/accounting/banking` - Bank accounts
- `/accounting/tax` - Tax management
- `/accounting/reports/*` - Financial reports

### 4.7 Project Module (`/project`)
- `/project` - Project Dashboard
- `/project/projects` - Project list (CRUD)
- `/project/tasks` - Task management (CRUD)
- `/project/milestones` - Milestones
- `/project/resources` - Resource allocation

### 4.8 Workflow Module (`/workflow`)
- `/workflow` - Workflow Dashboard
- `/workflow/definitions` - Workflow definitions (CRUD, Clone, Activate/Deactivate)
- `/workflow/steps` - Step configuration
- `/workflow/instances` - Running instances
- `/workflow/tasks` - Workflow tasks
- `/workflow/notifications` - Pending approvals
- `/workflow/my-requests` - User's requests
- `/workflow/delegation` - Delegation management
- `/workflow/history` - Completed workflows

---

## 5. INTEGRATION POINTS

### 5.1 CRM ↔ TMS

```
CRM Account --sync--> TMS Customer
├── Trigger: Manual via /accounts/{id}/sync-to-tms
├── Or: Auto when Quote is accepted
└── Fields synced: code, name, tax_code, address, contacts
```

**Implementation**: `backend/app/api/v1/routes/crm/accounts.py`

### 5.2 HRM ↔ TMS

```
HRM Employee (type=DRIVER) --auto-create--> TMS Driver
├── Trigger: When creating employee with employee_type='DRIVER'
└── Fields synced: name, phone, license_number
```

**Implementation**: `backend/app/api/v1/routes/hrm/employees.py`

### 5.3 Workflow Integration (IMPLEMENTED)

**Implementation Files**:
- Service: `backend/app/services/workflow_integration.py`
- Seed Data: `backend/app/services/workflow_seed.py`

```
Any Module Entity --> WorkflowIntegrationService.submit_for_approval()
├── Checks workflow_code from WORKFLOW_MAPPINGS
├── Checks trigger conditions (e.g., amount > threshold)
├── Creates WorkflowInstance
├── Creates WorkflowStepInstances
└── Updates entity.workflow_instance_id

Workflow Action (APPROVE/REJECT) --> WorkflowIntegrationService.on_workflow_complete()
├── Updates entity status field (approved_status or rejected_status)
└── Entity continues its process
```

**Workflow Mappings** (`workflow_integration.py`):

| Module | Entity | Workflow Code | Trigger Condition | Status Field |
|--------|--------|---------------|-------------------|--------------|
| TMS | Order | WF-ORDER-APPROVAL | total_amount > 100M VND | approval_status |
| TMS | Trip | WF-TRIP-APPROVAL | Always | status |
| HRM | LeaveRequest | WF-LEAVE-APPROVAL | requires_approval=True | status |
| HRM | Expense | WF-EXPENSE-APPROVAL | Always | status |
| HRM | Advance | WF-ADVANCE-APPROVAL | Always | status |
| CRM | Quote | WF-QUOTE-APPROVAL | total_amount > 50M VND | status |
| CRM | Contract | WF-CONTRACT-APPROVAL | total_value > 100M VND | status |
| WMS | StockAdjustment | WF-STOCK-ADJ-APPROVAL | total_value > 10M VND | status |
| WMS | GoodsReceipt | WF-GR-APPROVAL | Always | status |
| ACCOUNTING | JournalEntry | WF-JOURNAL-APPROVAL | total > 100M VND | status |
| ACCOUNTING | Payment | WF-PAYMENT-APPROVAL | amount > 50M VND | status |
| PROJECT | Project | WF-PROJECT-APPROVAL | budget > 500M VND | status |

**Seed Workflow Definitions** (Admin runs POST `/workflow/workflow-definitions/seed`):

| Code | Name | Module | Steps |
|------|------|--------|-------|
| WF-LEAVE-APPROVAL | Phê duyệt nghỉ phép | HRM | Manager → HR |
| WF-EXPENSE-APPROVAL | Phê duyệt chi phí | HRM | Manager → Accountant |
| WF-ADVANCE-APPROVAL | Phê duyệt tạm ứng | HRM | Manager |
| WF-ORDER-APPROVAL | Phê duyệt đơn hàng | TMS | Sales Manager → Operations |
| WF-TRIP-APPROVAL | Phê duyệt chuyến xe | TMS | Dispatcher |
| WF-QUOTE-APPROVAL | Phê duyệt báo giá | CRM | Sales Manager → Director |
| WF-CONTRACT-APPROVAL | Phê duyệt hợp đồng | CRM | Legal → Director |
| WF-STOCK-ADJ-APPROVAL | Phê duyệt điều chỉnh tồn kho | WMS | Warehouse Manager → Accountant |
| WF-GR-APPROVAL | Phê duyệt nhập kho | WMS | Warehouse Staff |
| WF-JOURNAL-APPROVAL | Phê duyệt bút toán | ACCOUNTING | Chief Accountant → CFO |
| WF-PAYMENT-APPROVAL | Phê duyệt thanh toán | ACCOUNTING | Accountant → CFO |
| WF-PROJECT-APPROVAL | Phê duyệt dự án | PROJECT | PMO → Sponsor |

**Integration Example** (HRM Leave Request):

```python
# In backend/app/api/v1/routes/hrm/leaves.py

# After creating leave request:
if leave_type.requires_approval:
    workflow_service = WorkflowIntegrationService(session)
    instance = workflow_service.submit_for_approval(
        tenant_id=tenant_id,
        user_id=user_id,
        user_name=user_name,
        module="HRM",
        entity_type="LeaveRequest",
        entity_id=str(request.id),
        entity_reference=f"LEAVE-{request.id[:8].upper()}",
        title=f"Đơn xin nghỉ phép - {employee.full_name}",
        ...
    )
    if instance:
        request.workflow_instance_id = str(instance.id)
```

---

## 6. CONVENTIONS & PATTERNS

### 6.1 API Response Format

```python
# List response
{
    "items": [...],
    "total": 100,
    "page": 1,
    "size": 50,
    "pages": 2
}

# Single item response
{
    "id": "uuid",
    "field1": "value",
    ...
}

# Action response
{
    "success": True,
    "message": "...",
    "data": {...}
}
```

### 6.2 Status Transitions

```python
# Generic status flow
DRAFT → PENDING → APPROVED/REJECTED → COMPLETED/CANCELLED

# Order status flow
DRAFT → PENDING → ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED

# Workflow instance status
PENDING → RUNNING → COMPLETED/REJECTED/CANCELLED
```

### 6.3 Code Naming Conventions

```python
# Model codes (auto-generated)
Lead: "LEAD-001"
Account: "ACC-001"
Order: "ORD-2025-00001"
Trip: "TRIP-2025-00001"
Employee: "EMP-001"
Workflow Instance: "WF-2025-00001"

# Table prefixes
CRM: crm_*
HRM: hrm_*
TMS: tms_*
WMS: wms_*
Accounting: acc_*
Project: prj_*
Workflow: wf_*
```

### 6.4 Frontend API Calls

```typescript
// Always use apiFetch from lib/api.ts
import { apiFetch } from "@/lib/api";

// GET list
const data = await apiFetch<ApiResponse<T>>("/module/entities");

// GET single
const item = await apiFetch<T>(`/module/entities/${id}`);

// POST create
await apiFetch("/module/entities", {
    method: "POST",
    body: JSON.stringify(payload),
});

// PUT/PATCH update
await apiFetch(`/module/entities/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
});

// DELETE
await apiFetch(`/module/entities/${id}`, {
    method: "DELETE",
});
```

---

## 7. PENDING IMPLEMENTATIONS

### 7.1 Completed

| Feature | Status | Files |
|---------|--------|-------|
| Workflow Integration Service | ✅ DONE | `workflow_integration.py`, `workflow_seed.py` |
| HRM Leave → Workflow | ✅ DONE | `leaves.py` modified |
| Workflow Callbacks | ✅ DONE | `instances.py` modified |

### 7.2 Missing Features

| Module | Feature | Priority |
|--------|---------|----------|
| Workflow | Email notifications | MEDIUM |
| Workflow | SLA alerts & escalation | MEDIUM |
| Workflow | Delegation API (backend) | MEDIUM |
| CRM | Campaign management | LOW |
| WMS | Barcode scanning | MEDIUM |
| Accounting | Bank reconciliation | HIGH |
| All | Audit log viewing | MEDIUM |
| All | Export to Excel/PDF | MEDIUM |

### 7.3 Workflow Integration TODO

Các module cần thêm tích hợp workflow (tương tự HRM leaves.py):

| Module | Entity | File to Modify | Priority |
|--------|--------|----------------|----------|
| HRM | Expense | `hrm/expenses.py` | HIGH |
| HRM | Advance | `hrm/advances.py` | HIGH |
| TMS | Order | `orders.py` | HIGH |
| CRM | Quote | `crm/quotes.py` | MEDIUM |
| CRM | Contract | `crm/contracts.py` | MEDIUM |
| WMS | StockAdjustment | `wms/stock.py` | MEDIUM |
| Accounting | JournalEntry | `accounting/journal.py` | MEDIUM |
| Accounting | Payment | `accounting/payments.py` | MEDIUM |
| Project | Project | `project/projects.py` | LOW |

---

## 8. QUICK REFERENCE

### 8.1 Common Status Values

```python
# Approval statuses
DRAFT, PENDING, APPROVED, REJECTED, CANCELLED

# Process statuses
ACTIVE, INACTIVE, COMPLETED, SUSPENDED

# Document statuses
DRAFT, SENT, ACCEPTED, EXPIRED
```

### 8.2 Common Field Patterns

```python
# All entities have
id: str (UUID)
tenant_id: str
created_at: datetime
updated_at: datetime
created_by: Optional[str]
updated_by: Optional[str]

# Entities with codes have
code: str (unique per tenant, indexed)

# Entities with status have
status: str (enum value)

# Entities with amounts have
amount: Decimal
currency: str = "VND"
```

### 8.3 API Authentication

```python
# Get current user in route
current_user: User = Depends(get_current_user)

# Get tenant_id
tenant_id = str(current_user.tenant_id)

# Get user_id
user_id = str(current_user.id)
```

---

*Last updated: 2025-12-28*
*Maintained by: Claude AI for development consistency*

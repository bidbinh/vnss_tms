"""
Worker Tenant API

API endpoints for workers to access tenant resources based on their permissions.
Workers access these endpoints from their workspace (e.g., binhtran2.9log.tech)
to view/manage data from companies they work with.

All endpoints require:
1. Worker authentication (cookie-based)
2. tenant_id parameter
3. Appropriate permissions in WorkerTenantAccess
"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, and_, or_
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Order, Driver, Vehicle, Site, Location, Customer
from app.models.worker import Worker, WorkerTenantAccess
from app.api.v1.routes.worker_auth import get_current_worker
from app.core.worker_permissions import (
    get_worker_permissions,
    require_worker_permission,
    require_worker_module,
    check_worker_permission,
)

router = APIRouter(prefix="/worker-tenant", tags=["Worker Tenant API"])


# ==================== AGGREGATED DATA (ALL TENANTS) ====================

@router.get("/aggregated/orders")
def get_aggregated_orders(
    status: Optional[str] = Query(None),
    tenant_ids: Optional[str] = Query(None, description="Comma-separated tenant IDs to filter"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Get orders from ALL tenants the worker has access to.
    This aggregates orders across multiple companies into a single view.
    """
    from app.models import Tenant

    try:
        # Get all tenant accesses for this worker with orders:view permission
        accesses = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.is_active == True,
                )
            )
        ).all()

        if not accesses:
            return {"orders": [], "total": 0, "tenants": []}

        # Filter to only tenants with orders:view permission
        valid_tenant_ids = []
        tenant_info = {}

        for access in accesses:
            perms = get_worker_permissions(access)
            order_perms = perms.get("permissions", {}).get("orders", [])
            if "view" in order_perms or "assign" in order_perms:
                valid_tenant_ids.append(access.tenant_id)
                # Get tenant info
                tenant = session.get(Tenant, access.tenant_id)
                if tenant:
                    tenant_info[access.tenant_id] = {
                        "id": access.tenant_id,
                        "name": tenant.name,
                        "code": getattr(tenant, 'code', None) or tenant.name[:3].upper(),
                    }

        if not valid_tenant_ids:
            return {"orders": [], "total": 0, "tenants": []}

        # Apply tenant filter if provided
        if tenant_ids:
            filter_ids = [t.strip() for t in tenant_ids.split(",")]
            valid_tenant_ids = [t for t in valid_tenant_ids if t in filter_ids]

        if not valid_tenant_ids:
            return {"orders": [], "total": 0, "tenants": list(tenant_info.values())}

        # Build query for orders from all valid tenants
        query = select(Order).where(Order.tenant_id.in_(valid_tenant_ids))

        if status:
            if status == "PROCESSING":
                query = query.where(Order.status.in_(["NEW", "ASSIGNED", "IN_TRANSIT"]))
            else:
                query = query.where(Order.status == status)

        if date_from:
            query = query.where(Order.order_date >= date_from)
        if date_to:
            query = query.where(Order.order_date <= date_to)

        # Count total
        total = len(session.exec(query).all())

        # Apply pagination
        query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        orders = session.exec(query).all()

        # Build response with tenant info, driver names, customer names
        result_orders = []
        for o in orders:
            driver_name = None
            if o.driver_id:
                driver = session.get(Driver, o.driver_id)
                if driver:
                    driver_name = driver.name

            customer_name = None
            if o.customer_id:
                customer = session.get(Customer, o.customer_id)
                if customer:
                    customer_name = customer.name

            tenant_data = tenant_info.get(o.tenant_id, {"id": o.tenant_id, "name": "Unknown", "code": "UNK"})

            result_orders.append({
                "id": str(o.id),
                "order_code": o.order_code,
                "order_date": serialize_date(o.order_date),
                "status": o.status,
                "tenant_id": o.tenant_id,
                "tenant_name": tenant_data["name"],
                "tenant_code": tenant_data["code"],
                "customer_id": str(o.customer_id) if o.customer_id else None,
                "customer_name": customer_name,
                "driver_id": str(o.driver_id) if o.driver_id else None,
                "driver_name": driver_name,
                "vehicle_id": str(getattr(o, 'vehicle_id', None)) if getattr(o, 'vehicle_id', None) else None,
                "pickup_site_id": str(o.pickup_site_id) if o.pickup_site_id else None,
                "delivery_site_id": str(o.delivery_site_id) if o.delivery_site_id else None,
                "pickup_text": getattr(o, 'pickup_text', None),
                "delivery_text": getattr(o, 'delivery_text', None),
                "equipment": getattr(o, 'equipment', None),
                "qty": getattr(o, 'qty', 1),
                "container_code": getattr(o, 'container_code', None),
                "cargo_note": getattr(o, 'cargo_note', None),
                "eta_pickup_at": serialize_date(getattr(o, 'eta_pickup_at', None)),
                "eta_delivery_at": serialize_date(getattr(o, 'eta_delivery_at', None)),
                "customer_requested_date": serialize_date(getattr(o, 'customer_requested_date', None)),
                "created_at": serialize_date(o.created_at),
            })

        return {
            "orders": result_orders,
            "total": total,
            "limit": limit,
            "offset": offset,
            "tenants": list(tenant_info.values()),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Lỗi khi tải đơn hàng: {str(e)}")


@router.get("/aggregated/drivers")
def get_aggregated_drivers(
    tenant_ids: Optional[str] = Query(None, description="Comma-separated tenant IDs to filter"),
    status: Optional[str] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Get drivers from ALL tenants the worker has access to.
    """
    from app.models import Tenant

    try:
        # Get all tenant accesses for this worker with drivers:view permission
        accesses = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.is_active == True,
                )
            )
        ).all()

        if not accesses:
            return {"drivers": [], "tenants": []}

        valid_tenant_ids = []
        tenant_info = {}

        for access in accesses:
            perms = get_worker_permissions(access)
            driver_perms = perms.get("permissions", {}).get("drivers", [])
            order_perms = perms.get("permissions", {}).get("orders", [])
            # Allow if has drivers:view OR orders:assign (dispatchers need driver list)
            if "view" in driver_perms or "assign" in order_perms:
                valid_tenant_ids.append(access.tenant_id)
                tenant = session.get(Tenant, access.tenant_id)
                if tenant:
                    tenant_info[access.tenant_id] = {
                        "id": access.tenant_id,
                        "name": tenant.name,
                        "code": getattr(tenant, 'code', None) or tenant.name[:3].upper(),
                    }

        if not valid_tenant_ids:
            return {"drivers": [], "tenants": []}

        # Apply tenant filter if provided
        if tenant_ids:
            filter_ids = [t.strip() for t in tenant_ids.split(",")]
            valid_tenant_ids = [t for t in valid_tenant_ids if t in filter_ids]

        if not valid_tenant_ids:
            return {"drivers": [], "tenants": list(tenant_info.values())}

        query = select(Driver).where(Driver.tenant_id.in_(valid_tenant_ids))
        if status:
            query = query.where(Driver.status == status)

        drivers = session.exec(query).all()

        return {
            "drivers": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "short_name": d.short_name,
                    "phone": d.phone,
                    "status": d.status,
                    "source": d.source,
                    "tenant_id": d.tenant_id,
                    "tenant_name": tenant_info.get(d.tenant_id, {}).get("name", "Unknown"),
                    "tenant_code": tenant_info.get(d.tenant_id, {}).get("code", "UNK"),
                    "vehicle_id": str(d.vehicle_id) if d.vehicle_id else None,
                    "tractor_id": str(d.tractor_id) if d.tractor_id else None,
                }
                for d in drivers
            ],
            "tenants": list(tenant_info.values()),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải tài xế: {str(e)}")


@router.get("/aggregated/vehicles")
def get_aggregated_vehicles(
    tenant_ids: Optional[str] = Query(None, description="Comma-separated tenant IDs to filter"),
    status: Optional[str] = Query(None),
    vehicle_type: Optional[str] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Get vehicles from ALL tenants the worker has access to.
    """
    from app.models import Tenant

    try:
        accesses = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.is_active == True,
                )
            )
        ).all()

        if not accesses:
            return {"vehicles": [], "tenants": []}

        valid_tenant_ids = []
        tenant_info = {}

        for access in accesses:
            perms = get_worker_permissions(access)
            vehicle_perms = perms.get("permissions", {}).get("vehicles", [])
            order_perms = perms.get("permissions", {}).get("orders", [])
            if "view" in vehicle_perms or "assign" in order_perms:
                valid_tenant_ids.append(access.tenant_id)
                tenant = session.get(Tenant, access.tenant_id)
                if tenant:
                    tenant_info[access.tenant_id] = {
                        "id": access.tenant_id,
                        "name": tenant.name,
                        "code": getattr(tenant, 'code', None) or tenant.name[:3].upper(),
                    }

        if not valid_tenant_ids:
            return {"vehicles": [], "tenants": []}

        if tenant_ids:
            filter_ids = [t.strip() for t in tenant_ids.split(",")]
            valid_tenant_ids = [t for t in valid_tenant_ids if t in filter_ids]

        if not valid_tenant_ids:
            return {"vehicles": [], "tenants": list(tenant_info.values())}

        query = select(Vehicle).where(Vehicle.tenant_id.in_(valid_tenant_ids))
        if status:
            query = query.where(Vehicle.status == status)
        if vehicle_type:
            query = query.where(Vehicle.vehicle_type == vehicle_type)

        vehicles = session.exec(query).all()

        return {
            "vehicles": [
                {
                    "id": str(v.id),
                    "plate_number": v.plate_number,
                    "vehicle_type": v.vehicle_type,
                    "status": v.status,
                    "brand": getattr(v, 'brand', None),
                    "model": getattr(v, 'model', None),
                    "tenant_id": v.tenant_id,
                    "tenant_name": tenant_info.get(v.tenant_id, {}).get("name", "Unknown"),
                    "tenant_code": tenant_info.get(v.tenant_id, {}).get("code", "UNK"),
                }
                for v in vehicles
            ],
            "tenants": list(tenant_info.values()),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải xe: {str(e)}")


# ==================== PERMISSIONS ====================

@router.get("/permissions")
def get_my_permissions(
    tenant_id: str = Query(..., description="Tenant ID to check permissions for"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Get worker's permissions for a specific tenant"""
    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == worker.id,
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        raise HTTPException(403, "Bạn không có quyền truy cập tenant này")

    return {
        "tenant_id": tenant_id,
        "role": access.role,
        "permissions": get_worker_permissions(access),
    }


# ==================== ORDERS ====================

def serialize_date(d):
    """Safely serialize date/datetime to string"""
    if d is None:
        return None
    if hasattr(d, 'isoformat'):
        return d.isoformat()
    return str(d)


@router.get("/orders")
def list_orders(
    tenant_id: str = Query(...),
    status: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List orders - requires 'orders:view' permission"""
    try:
        access = require_worker_permission(session, worker, tenant_id, "orders", "view")

        query = select(Order).where(Order.tenant_id == tenant_id)

        # If worker only has view_assigned permission, filter to their orders only
        perms = get_worker_permissions(access)
        if "view" not in perms.get("permissions", {}).get("orders", []):
            # Find driver linked to this worker
            driver = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == tenant_id,
                        Driver.external_worker_id == worker.id,
                    )
                )
            ).first()
            if driver:
                query = query.where(Order.driver_id == driver.id)
            else:
                return {"orders": [], "total": 0}

        if status:
            query = query.where(Order.status == status)
        if driver_id:
            query = query.where(Order.driver_id == driver_id)
        if date_from:
            query = query.where(Order.order_date >= date_from)
        if date_to:
            query = query.where(Order.order_date <= date_to)

        # Count total
        total = len(session.exec(query).all())

        # Apply pagination
        query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        orders = session.exec(query).all()

        # Build response with driver names
        result_orders = []
        for o in orders:
            driver_name = None
            if o.driver_id:
                driver = session.get(Driver, o.driver_id)
                if driver:
                    driver_name = driver.name

            customer_name = None
            if o.customer_id:
                customer = session.get(Customer, o.customer_id)
                if customer:
                    customer_name = customer.name

            result_orders.append({
                "id": str(o.id),
                "order_code": o.order_code,
                "order_date": serialize_date(o.order_date),
                "status": o.status,
                "customer_id": str(o.customer_id) if o.customer_id else None,
                "customer_name": customer_name,
                "driver_id": str(o.driver_id) if o.driver_id else None,
                "driver_name": driver_name,
                "vehicle_id": str(getattr(o, 'vehicle_id', None)) if getattr(o, 'vehicle_id', None) else None,
                "pickup_site_id": str(o.pickup_site_id) if o.pickup_site_id else None,
                "delivery_site_id": str(o.delivery_site_id) if o.delivery_site_id else None,
                "pickup_text": getattr(o, 'pickup_text', None),
                "delivery_text": getattr(o, 'delivery_text', None),
                "equipment": getattr(o, 'equipment', None),
                "qty": getattr(o, 'qty', 1),
                "container_code": getattr(o, 'container_code', None),
                "cargo_note": getattr(o, 'cargo_note', None),
                "eta_pickup_at": serialize_date(getattr(o, 'eta_pickup_at', None)),
                "eta_delivery_at": serialize_date(getattr(o, 'eta_delivery_at', None)),
                "customer_requested_date": serialize_date(getattr(o, 'customer_requested_date', None)),
                "created_at": serialize_date(o.created_at),
            })

        return {
            "orders": result_orders,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải đơn hàng: {str(e)}")


@router.get("/orders/{order_id}")
def get_order(
    order_id: str,
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Get single order details"""
    try:
        require_worker_permission(session, worker, tenant_id, "orders", "view")

        order = session.get(Order, order_id)
        if not order or order.tenant_id != tenant_id:
            raise HTTPException(404, "Không tìm thấy đơn hàng")

        # Get related data
        driver = session.get(Driver, order.driver_id) if order.driver_id else None
        vehicle = session.get(Vehicle, getattr(order, 'vehicle_id', None)) if getattr(order, 'vehicle_id', None) else None
        pickup_site = session.get(Site, order.pickup_site_id) if order.pickup_site_id else None
        delivery_site = session.get(Site, order.delivery_site_id) if order.delivery_site_id else None
        customer = session.get(Customer, order.customer_id) if order.customer_id else None

        return {
            "id": str(order.id),
            "order_code": order.order_code,
            "order_date": serialize_date(order.order_date),
            "status": order.status,
            "customer": {"id": str(customer.id), "name": customer.name} if customer else None,
            "driver": {"id": str(driver.id), "name": driver.name} if driver else None,
            "vehicle": {"id": str(vehicle.id), "plate_number": vehicle.plate_number} if vehicle else None,
            "pickup_site": {"id": str(pickup_site.id), "company_name": pickup_site.company_name, "address": pickup_site.detailed_address} if pickup_site else None,
            "delivery_site": {"id": str(delivery_site.id), "company_name": delivery_site.company_name, "address": delivery_site.detailed_address} if delivery_site else None,
            "container_no": getattr(order, 'container_code', None),
            "seal_no": getattr(order, 'seal_no', None),
            "note": getattr(order, 'cargo_note', None),
            "created_at": serialize_date(order.created_at),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải đơn hàng: {str(e)}")


class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Update order status - requires 'orders:update_status' permission"""
    access = require_worker_permission(session, worker, tenant_id, "orders", "update_status")

    order = session.get(Order, order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    # If only update_status permission (not full update), verify worker owns this order
    perms = get_worker_permissions(access)
    if "update" not in perms.get("permissions", {}).get("orders", []):
        driver = session.exec(
            select(Driver).where(
                and_(
                    Driver.tenant_id == tenant_id,
                    Driver.external_worker_id == worker.id,
                )
            )
        ).first()
        if not driver or order.driver_id != driver.id:
            raise HTTPException(403, "Bạn chỉ có thể cập nhật đơn hàng được giao cho mình")

    old_status = order.status
    order.status = data.status
    if data.note:
        order.note = (order.note or "") + f"\n[{datetime.now().strftime('%d/%m %H:%M')}] {data.note}"

    session.add(order)
    session.commit()

    return {
        "message": f"Đã cập nhật trạng thái từ {old_status} sang {data.status}",
        "order_id": order_id,
        "status": order.status,
    }


class OrderAssignDriver(BaseModel):
    driver_id: str
    vehicle_id: Optional[str] = None


@router.patch("/orders/{order_id}/assign")
def assign_driver_to_order(
    order_id: str,
    data: OrderAssignDriver,
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Assign a driver to an order - requires 'orders:assign' permission"""
    try:
        require_worker_permission(session, worker, tenant_id, "orders", "assign")

        order = session.get(Order, order_id)
        if not order or order.tenant_id != tenant_id:
            raise HTTPException(404, "Không tìm thấy đơn hàng")

        # Verify driver exists and belongs to this tenant
        driver = session.get(Driver, data.driver_id)
        if not driver or driver.tenant_id != tenant_id:
            raise HTTPException(404, "Không tìm thấy tài xế")

        old_driver_id = order.driver_id
        order.driver_id = driver.id

        # Optionally assign vehicle
        if data.vehicle_id:
            vehicle = session.get(Vehicle, data.vehicle_id)
            if vehicle and vehicle.tenant_id == tenant_id:
                order.vehicle_id = vehicle.id

        # Update status to ASSIGNED if currently NEW or ACCEPTED
        if order.status in ["NEW", "ACCEPTED", "PENDING"]:
            order.status = "ASSIGNED"

        session.add(order)
        session.commit()

        return {
            "message": f"Đã giao đơn hàng cho tài xế {driver.name}",
            "order_id": str(order.id),
            "driver_id": str(driver.id),
            "driver_name": driver.name,
            "status": order.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi giao đơn hàng: {str(e)}")


class OrderCreate(BaseModel):
    customer_id: str
    order_date: Optional[str] = None
    pickup_site_id: Optional[str] = None
    delivery_site_id: Optional[str] = None
    pickup_text: Optional[str] = None
    delivery_text: Optional[str] = None
    driver_id: Optional[str] = None
    equipment: Optional[str] = None  # "20", "40", "45"
    container_code: Optional[str] = None
    cargo_note: Optional[str] = None
    freight_charge: Optional[int] = None


@router.post("/orders")
def create_order(
    data: OrderCreate,
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Create a new order - requires 'orders:create' permission"""
    try:
        require_worker_permission(session, worker, tenant_id, "orders", "create")

        # Verify customer exists and belongs to this tenant
        customer = session.get(Customer, data.customer_id)
        if not customer or customer.tenant_id != tenant_id:
            raise HTTPException(404, "Không tìm thấy khách hàng")

        # Generate order code (simple incremental for now)
        from sqlmodel import func
        last_order = session.exec(
            select(Order)
            .where(Order.tenant_id == tenant_id)
            .order_by(Order.created_at.desc())
        ).first()

        if last_order and last_order.order_code:
            # Try to extract number from order code
            import re
            match = re.search(r'(\d+)$', last_order.order_code)
            if match:
                next_num = int(match.group(1)) + 1
            else:
                next_num = 1
        else:
            next_num = 1

        order_code = f"ORD-{next_num:06d}"

        # Parse order_date if provided
        order_date = datetime.utcnow()
        if data.order_date:
            try:
                order_date = datetime.fromisoformat(data.order_date.replace('Z', '+00:00'))
            except:
                pass

        # Create order
        order = Order(
            tenant_id=tenant_id,
            order_code=order_code,
            customer_id=data.customer_id,
            order_date=order_date,
            status="NEW",
            pickup_site_id=data.pickup_site_id,
            delivery_site_id=data.delivery_site_id,
            pickup_text=data.pickup_text,
            delivery_text=data.delivery_text,
            driver_id=data.driver_id,
            equipment=data.equipment,
            container_code=data.container_code,
            cargo_note=data.cargo_note,
            freight_charge=data.freight_charge,
        )

        # If driver is assigned, set status to ASSIGNED
        if data.driver_id:
            driver = session.get(Driver, data.driver_id)
            if driver and driver.tenant_id == tenant_id:
                order.status = "ASSIGNED"
            else:
                order.driver_id = None

        session.add(order)
        session.commit()
        session.refresh(order)

        return {
            "message": f"Đã tạo đơn hàng {order_code}",
            "order": {
                "id": str(order.id),
                "order_code": order.order_code,
                "status": order.status,
                "customer_id": str(order.customer_id),
                "driver_id": str(order.driver_id) if order.driver_id else None,
                "order_date": serialize_date(order.order_date),
                "created_at": serialize_date(order.created_at),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tạo đơn hàng: {str(e)}")


# ==================== DRIVERS ====================

@router.get("/drivers")
def list_drivers(
    tenant_id: str = Query(...),
    status: Optional[str] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List drivers - requires 'drivers:view' permission"""
    try:
        require_worker_permission(session, worker, tenant_id, "drivers", "view")

        query = select(Driver).where(Driver.tenant_id == tenant_id)
        if status:
            query = query.where(Driver.status == status)

        drivers = session.exec(query).all()

        return {
            "drivers": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "short_name": d.short_name,
                    "phone": d.phone,
                    "status": d.status,
                    "source": d.source,
                    "vehicle_id": str(d.vehicle_id) if d.vehicle_id else None,
                    "tractor_id": str(d.tractor_id) if d.tractor_id else None,
                }
                for d in drivers
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải tài xế: {str(e)}")


# ==================== VEHICLES ====================

@router.get("/vehicles")
def list_vehicles(
    tenant_id: str = Query(...),
    status: Optional[str] = Query(None),
    vehicle_type: Optional[str] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List vehicles - requires 'vehicles:view' permission"""
    try:
        # Check if worker has access to tenant - vehicles permission is optional
        access = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.tenant_id == tenant_id,
                    WorkerTenantAccess.is_active == True,
                )
            )
        ).first()

        if not access:
            raise HTTPException(403, "Bạn không có quyền truy cập tenant này")

        # Check if has vehicles:view permission, if not check for orders:assign (dispatchers need vehicle list)
        perms = get_worker_permissions(access)
        vehicle_perms = perms.get("permissions", {}).get("vehicles", [])
        order_perms = perms.get("permissions", {}).get("orders", [])

        if "view" not in vehicle_perms and "assign" not in order_perms:
            raise HTTPException(403, "Bạn không có quyền xem danh sách xe")

        query = select(Vehicle).where(Vehicle.tenant_id == tenant_id)
        if status:
            query = query.where(Vehicle.status == status)
        if vehicle_type:
            query = query.where(Vehicle.vehicle_type == vehicle_type)

        vehicles = session.exec(query).all()

        return {
            "vehicles": [
                {
                    "id": str(v.id),
                    "plate_number": v.plate_number,
                    "vehicle_type": v.vehicle_type,
                    "status": v.status,
                    "brand": getattr(v, 'brand', None),
                    "model": getattr(v, 'model', None),
                }
                for v in vehicles
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tải xe: {str(e)}")


# ==================== SITES ====================

@router.get("/sites")
def list_sites(
    tenant_id: str = Query(...),
    site_type: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List sites - requires 'sites:view' permission"""
    require_worker_permission(session, worker, tenant_id, "sites", "view")

    query = select(Site).where(Site.tenant_id == tenant_id)
    if site_type:
        query = query.where(Site.site_type == site_type)
    if location_id:
        query = query.where(Site.location_id == location_id)

    sites = session.exec(query).all()

    return {
        "sites": [
            {
                "id": s.id,
                "company_name": s.company_name,
                "code": s.code,
                "site_type": s.site_type,
                "detailed_address": s.detailed_address,
                "location_id": s.location_id,
                "contact_name": s.contact_name,
                "contact_phone": s.contact_phone,
                "status": s.status,
            }
            for s in sites
        ]
    }


# ==================== LOCATIONS ====================

@router.get("/locations")
def list_locations(
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List locations - requires 'locations:view' permission"""
    require_worker_permission(session, worker, tenant_id, "locations", "view")

    locations = session.exec(
        select(Location).where(Location.tenant_id == tenant_id)
    ).all()

    return {
        "locations": [
            {
                "id": loc.id,
                "name": loc.name,
                "code": loc.code,
                "province": getattr(loc, 'province', None),
                "district": getattr(loc, 'district', None),
            }
            for loc in locations
        ]
    }


# ==================== CUSTOMERS ====================

@router.get("/customers")
def list_customers(
    tenant_id: str = Query(...),
    is_active: Optional[bool] = Query(None),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """List customers - requires 'customers:view' permission"""
    require_worker_permission(session, worker, tenant_id, "customers", "view")

    query = select(Customer).where(Customer.tenant_id == tenant_id)
    if is_active is not None:
        query = query.where(Customer.is_active == is_active)

    customers = session.exec(query).all()

    return {
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "code": getattr(c, 'code', None),
                "phone": getattr(c, 'phone', None),
                "email": getattr(c, 'email', None),
                "address": getattr(c, 'address', None),
                "is_active": c.is_active,
            }
            for c in customers
        ]
    }


# ==================== DISPATCH DASHBOARD ====================

@router.get("/dispatch/dashboard")
def get_dispatch_dashboard(
    tenant_id: str = Query(...),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Get dispatch dashboard data - requires 'orders:assign' or 'orders:view' permission"""
    try:
        # Check permission - either assign or view
        access = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.tenant_id == tenant_id,
                    WorkerTenantAccess.is_active == True,
                )
            )
        ).first()

        if not access:
            raise HTTPException(403, "Bạn không có quyền truy cập tenant này")

        perms = get_worker_permissions(access)
        order_perms = perms.get("permissions", {}).get("orders", [])
        if "assign" not in order_perms and "view" not in order_perms:
            raise HTTPException(403, "Bạn không có quyền xem dispatch dashboard")

        from datetime import date
        today = date.today()

        # Get counts
        total_vehicles = session.exec(
            select(Vehicle).where(Vehicle.tenant_id == tenant_id)
        ).all()

        active_vehicles = [v for v in total_vehicles if v.status == "ACTIVE"]

        total_drivers = session.exec(
            select(Driver).where(Driver.tenant_id == tenant_id)
        ).all()

        active_drivers = [d for d in total_drivers if d.status == "ACTIVE"]

        # Order counts
        all_orders = session.exec(
            select(Order).where(Order.tenant_id == tenant_id)
        ).all()

        pending_orders = [o for o in all_orders if o.status in ["NEW", "PENDING", "ACCEPTED"]]
        in_transit_orders = [o for o in all_orders if o.status in ["IN_TRANSIT", "ASSIGNED"]]

        # Delivered today (approximate - check if order_date is today and status is DELIVERED/COMPLETED)
        delivered_today = [
            o for o in all_orders
            if o.status in ["DELIVERED", "COMPLETED"]
            and o.order_date
            and (o.order_date.date() if hasattr(o.order_date, 'date') else o.order_date) == today
        ]

        # Unassigned orders (no driver)
        unassigned = [o for o in all_orders if o.status in ["NEW", "PENDING"] and not o.driver_id]

        # Build vehicle dispatch info
        vehicles_info = []
        for v in total_vehicles:
            # Find driver assigned to this vehicle
            driver = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == tenant_id,
                        or_(
                            Driver.vehicle_id == v.id,
                            Driver.tractor_id == v.id,
                        )
                    )
                )
            ).first()

            # Determine work status
            work_status = "off_duty"
            if v.status == "ACTIVE":
                # Check if vehicle has active order
                active_order = session.exec(
                    select(Order).where(
                        and_(
                            Order.tenant_id == tenant_id,
                            or_(
                                getattr(Order, 'vehicle_id', None) == v.id,
                                Order.driver_id == driver.id if driver else None,
                            ),
                            Order.status.in_(["IN_TRANSIT", "ASSIGNED"])
                        )
                    )
                ).first() if driver else None

                if active_order:
                    work_status = "on_trip"
                else:
                    work_status = "available"
            elif v.status == "MAINTENANCE":
                work_status = "maintenance"

            vehicles_info.append({
                "id": str(v.id),
                "plate_number": v.plate_number,
                "vehicle_type": v.vehicle_type or "TRUCK",
                "status": v.status,
                "work_status": work_status,
                "driver_id": str(driver.id) if driver else None,
                "driver_name": driver.name if driver else None,
                "driver_phone": driver.phone if driver else None,
                "latitude": None,  # GPS data not available yet
                "longitude": None,
                "speed": None,
                "address": None,
                "gps_timestamp": None,
                "current_trip_id": None,
                "current_order_id": None,
                "destination": None,
                "eta": None,
                "remaining_km": None,
            })

        # Build unassigned orders list
        unassigned_orders = [
            {
                "id": str(o.id),
                "order_code": o.order_code,
                "status": o.status,
                "pickup_text": o.pickup_text,
                "delivery_text": o.delivery_text,
                "equipment": o.equipment,
                "customer_requested_date": serialize_date(o.customer_requested_date) if hasattr(o, 'customer_requested_date') else None,
                "order_date": serialize_date(o.order_date),
            }
            for o in unassigned[:20]  # Limit to 20
        ]

        # Calculate stats
        total_v = len(total_vehicles)
        active_v = len(active_vehicles)
        on_trip_v = len([vi for vi in vehicles_info if vi["work_status"] == "on_trip"])
        available_v = len([vi for vi in vehicles_info if vi["work_status"] == "available"])

        return {
            "stats": {
                "total_vehicles": total_v,
                "active_vehicles": active_v,
                "available_vehicles": available_v,
                "on_trip_vehicles": on_trip_v,
                "total_drivers": len(total_drivers),
                "active_drivers": len(active_drivers),
                "pending_orders": len(pending_orders),
                "in_transit_orders": len(in_transit_orders),
                "delivered_today": len(delivered_today),
                "active_alerts": 0,  # No alerts system yet
                "pending_ai_decisions": 0,  # No AI system yet
                "ai_auto_rate": 87.5,  # Mock value
            },
            "vehicles": vehicles_info,
            "alerts": [],  # No alerts system yet
            "ai_decisions": [],  # No AI system yet
            "recent_activity": [],  # No activity log yet
            "unassigned_orders": unassigned_orders,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Lỗi khi tải dispatch dashboard: {str(e)}")

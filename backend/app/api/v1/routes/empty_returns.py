from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import EmptyReturn, Order, Driver, Site, User
from app.core.security import get_current_user
from datetime import date as date_type
from typing import Optional

router = APIRouter(prefix="/empty-returns", tags=["empty-returns"])


@router.get("")
def list_empty_returns(
    order_id: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all empty returns with filters"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(EmptyReturn).where(EmptyReturn.tenant_id == tenant_id)

    if order_id:
        stmt = stmt.where(EmptyReturn.order_id == order_id)
    if start_date:
        stmt = stmt.where(EmptyReturn.return_date >= start_date)
    if end_date:
        stmt = stmt.where(EmptyReturn.return_date <= end_date)
    if status:
        stmt = stmt.where(EmptyReturn.status == status)

    returns = session.exec(stmt.order_by(EmptyReturn.return_date.desc())).all()

    # Enrich with order info
    order_ids = {r.order_id for r in returns}
    if order_ids:
        orders = session.exec(select(Order).where(Order.id.in_(order_ids))).all()
        order_map = {o.id: o for o in orders}
    else:
        order_map = {}

    # Get driver info
    driver_ids = {o.driver_id for o in order_map.values() if o.driver_id}
    if driver_ids:
        drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()
        driver_map = {d.id: d for d in drivers}
    else:
        driver_map = {}

    # Get port site info
    port_site_ids = {r.port_site_id for r in returns}
    if port_site_ids:
        port_sites = session.exec(select(Site).where(Site.id.in_(port_site_ids))).all()
        port_site_map = {s.id: s for s in port_sites}
    else:
        port_site_map = {}

    result = []
    for ret in returns:
        order = order_map.get(ret.order_id)
        port_site = port_site_map.get(ret.port_site_id)
        ret_dict = ret.model_dump()
        ret_dict["port_site_name"] = port_site.company_name if port_site else None
        if order:
            ret_dict["order_code"] = order.order_code
            ret_dict["container_code"] = order.container_code
            driver = driver_map.get(order.driver_id) if order.driver_id else None
            ret_dict["driver_name"] = driver.name if driver else None
        result.append(ret_dict)

    return result


@router.get("/port-orders")
def list_port_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all orders from PORT sites (for creating empty returns)"""
    tenant_id = str(current_user.tenant_id)

    # Get all PORT sites (directly by site_type)
    port_sites = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.site_type == "PORT"
        )
    ).all()
    port_site_ids = {site.id for site in port_sites}

    # If no PORT sites, return empty list
    if not port_site_ids:
        return []

    # Get orders with pickup from PORT sites
    stmt = select(Order).where(
        Order.tenant_id == tenant_id,
        Order.pickup_site_id.in_(port_site_ids)
    )
    orders = session.exec(stmt.order_by(Order.order_date.desc())).all()

    # Get driver info
    driver_ids = {o.driver_id for o in orders if o.driver_id}
    if driver_ids:
        drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()
        driver_map = {d.id: d for d in drivers}
    else:
        driver_map = {}

    # Get pickup site info
    pickup_site_ids = {o.pickup_site_id for o in orders if o.pickup_site_id}
    if pickup_site_ids:
        pickup_sites = session.exec(select(Site).where(Site.id.in_(pickup_site_ids))).all()
        pickup_site_map = {s.id: s for s in pickup_sites}
    else:
        pickup_site_map = {}

    # Get port site info (for pre-filled port)
    port_site_ids = {o.port_site_id for o in orders if o.port_site_id}
    if port_site_ids:
        port_sites = session.exec(select(Site).where(Site.id.in_(port_site_ids))).all()
        port_site_map = {s.id: s for s in port_sites}
    else:
        port_site_map = {}

    # Check which orders already have empty returns
    order_ids = {o.id for o in orders}
    if order_ids:
        existing_returns = session.exec(
            select(EmptyReturn).where(EmptyReturn.order_id.in_(order_ids))
        ).all()
        existing_order_ids = {r.order_id for r in existing_returns}
    else:
        existing_order_ids = set()

    result = []
    for order in orders:
        driver = driver_map.get(order.driver_id) if order.driver_id else None
        pickup_site = pickup_site_map.get(order.pickup_site_id) if order.pickup_site_id else None
        port_site = port_site_map.get(order.port_site_id) if order.port_site_id else None

        order_dict = {
            "id": order.id,
            "order_code": order.order_code,
            "container_code": order.container_code,
            "driver_id": order.driver_id,
            "driver_name": driver.name if driver else None,
            "pickup_site_id": order.pickup_site_id,
            "pickup_site_name": pickup_site.company_name if pickup_site else None,
            "port_site_id": order.port_site_id,
            "port_site_name": port_site.company_name if port_site else None,
            "order_date": order.order_date,
            "has_empty_return": order.id in existing_order_ids
        }
        result.append(order_dict)

    return result


@router.get("/port-sites/list")
def list_port_sites(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all PORT sites (for port selection dropdown)"""
    tenant_id = str(current_user.tenant_id)

    # Get all PORT sites directly by site_type
    port_sites = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.site_type == "PORT",
            Site.status == "ACTIVE"
        )
    ).all()

    return [{"id": site.id, "company_name": site.company_name, "detailed_address": site.detailed_address} for site in port_sites]


@router.get("/{return_id}")
def get_empty_return(
    return_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get single empty return"""
    tenant_id = str(current_user.tenant_id)

    ret = session.get(EmptyReturn, return_id)
    if not ret:
        raise HTTPException(404, "Empty return not found")
    if str(ret.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Get order and driver info
    order = session.get(Order, ret.order_id)
    ret_dict = ret.model_dump()
    if order:
        ret_dict["order_code"] = order.order_code
        ret_dict["container_code"] = order.container_code
        if order.driver_id:
            driver = session.get(Driver, order.driver_id)
            ret_dict["driver_name"] = driver.name if driver else None

    return ret_dict


@router.post("")
def create_empty_return(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new empty return"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create empty returns")

    tenant_id = str(current_user.tenant_id)

    # Validate order
    order = session.get(Order, payload["order_id"])
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    # Verify order is from PORT site
    if order.pickup_site_id:
        site = session.get(Site, order.pickup_site_id)
        if not site:
            raise HTTPException(400, "Không tìm thấy địa điểm pickup")
        if site.site_type != "PORT":
            raise HTTPException(400, "Chỉ tạo hạ rỗng cho đơn hàng từ Cảng (Site phân loại PORT)")
    else:
        raise HTTPException(400, "Đơn hàng phải có địa điểm pickup")

    # Validate port_site_id
    if "port_site_id" in payload:
        port_site = session.get(Site, payload["port_site_id"])
        if not port_site or str(port_site.tenant_id) != tenant_id:
            raise HTTPException(404, "Port site not found")

    # Check for existing empty return
    existing = session.exec(
        select(EmptyReturn).where(
            EmptyReturn.tenant_id == tenant_id,
            EmptyReturn.order_id == payload["order_id"]
        )
    ).first()

    if existing:
        raise HTTPException(400, "Empty return already exists for this order")

    # Create empty return
    empty_return = EmptyReturn(**payload, tenant_id=tenant_id)
    session.add(empty_return)
    session.commit()
    session.refresh(empty_return)

    return empty_return.model_dump()


@router.put("/{return_id}")
def update_empty_return(
    return_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update empty return"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update empty returns")

    tenant_id = str(current_user.tenant_id)

    ret = session.get(EmptyReturn, return_id)
    if not ret:
        raise HTTPException(404, "Empty return not found")
    if str(ret.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update fields
    for key, value in payload.items():
        if hasattr(ret, key) and key not in ["id", "tenant_id", "order_id", "created_at"]:
            setattr(ret, key, value)

    session.add(ret)
    session.commit()
    session.refresh(ret)

    return ret.model_dump()


@router.delete("/{return_id}")
def delete_empty_return(
    return_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete empty return"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete empty returns")

    tenant_id = str(current_user.tenant_id)

    ret = session.get(EmptyReturn, return_id)
    if not ret:
        raise HTTPException(404, "Empty return not found")
    if str(ret.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(ret)
    session.commit()

    return {"message": "Empty return deleted successfully"}

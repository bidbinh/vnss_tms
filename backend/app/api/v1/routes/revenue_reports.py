from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models import Order, Driver, Customer, Site, User, OrderStatusLog
from app.models.order import OrderStatus
from app.core.security import get_current_user
from app.services.order_status_logger import get_delivered_date
from datetime import datetime, date as date_type
from typing import Optional, List, Dict
import calendar

router = APIRouter(prefix="/revenue-reports", tags=["revenue-reports"])


@router.get("/summary")
def get_revenue_summary(
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    customer_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get revenue summary report for delivered orders in a given month
    Grouped by: month, customer, driver, route
    """
    tenant_id = str(current_user.tenant_id)

    # Try to get delivered order IDs from status logs
    try:
        delivered_orders_subquery = (
            select(OrderStatusLog.order_id)
            .where(
                OrderStatusLog.tenant_id == tenant_id,
                OrderStatusLog.to_status == OrderStatus.DELIVERED,
                func.extract('year', OrderStatusLog.changed_at) == year,
                func.extract('month', OrderStatusLog.changed_at) == month
            )
            .distinct()
        )
        delivered_order_ids = session.exec(delivered_orders_subquery).all()
    except Exception:
        # Fallback: use order_date if order_status_log doesn't exist
        delivered_order_ids = []

    # Build query for delivered orders
    if delivered_order_ids:
        query = select(Order).where(
            Order.tenant_id == tenant_id,
            Order.id.in_(delivered_order_ids),
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        )
    else:
        # Fallback: use order_date
        query = select(Order).where(
            Order.tenant_id == tenant_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            func.extract('year', Order.order_date) == year,
            func.extract('month', Order.order_date) == month
        )

    if customer_id:
        query = query.where(Order.customer_id == customer_id)

    if driver_id:
        query = query.where(Order.driver_id == driver_id)

    orders = session.exec(query).all()

    # Get all customers, drivers, sites for enrichment
    customer_ids = {o.customer_id for o in orders}
    driver_ids = {o.driver_id for o in orders if o.driver_id}
    site_ids = {o.pickup_site_id for o in orders if o.pickup_site_id} | {o.delivery_site_id for o in orders if o.delivery_site_id}

    customers_map = {}
    if customer_ids:
        customers = session.exec(select(Customer).where(Customer.id.in_(customer_ids))).all()
        customers_map = {c.id: c for c in customers}

    drivers_map = {}
    if driver_ids:
        drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()
        drivers_map = {d.id: d for d in drivers}

    sites_map = {}
    if site_ids:
        sites = session.exec(select(Site).where(Site.id.in_(site_ids))).all()
        sites_map = {s.id: s for s in sites}

    # Calculate overall summary
    total_revenue = sum(o.freight_charge or 0 for o in orders)
    total_orders = len(orders)
    total_distance_km = sum(o.distance_km or 0 for o in orders)
    average_revenue_per_order = total_revenue / total_orders if total_orders > 0 else 0

    # Group by customer
    customer_revenue: Dict[str, Dict] = {}
    for order in orders:
        if order.customer_id not in customer_revenue:
            customer = customers_map.get(order.customer_id)
            customer_revenue[order.customer_id] = {
                "customer_id": order.customer_id,
                "customer_name": customer.name if customer else "Unknown",
                "total_revenue": 0,
                "order_count": 0,
                "total_distance_km": 0
            }

        customer_revenue[order.customer_id]["total_revenue"] += order.freight_charge or 0
        customer_revenue[order.customer_id]["order_count"] += 1
        customer_revenue[order.customer_id]["total_distance_km"] += order.distance_km or 0

    # Sort by revenue descending
    by_customer = sorted(customer_revenue.values(), key=lambda x: x["total_revenue"], reverse=True)

    # Group by driver
    driver_revenue: Dict[str, Dict] = {}
    for order in orders:
        if not order.driver_id:
            continue

        if order.driver_id not in driver_revenue:
            driver = drivers_map.get(order.driver_id)
            driver_revenue[order.driver_id] = {
                "driver_id": order.driver_id,
                "driver_name": driver.name if driver else "Unknown",
                "total_revenue": 0,
                "order_count": 0,
                "total_distance_km": 0
            }

        driver_revenue[order.driver_id]["total_revenue"] += order.freight_charge or 0
        driver_revenue[order.driver_id]["order_count"] += 1
        driver_revenue[order.driver_id]["total_distance_km"] += order.distance_km or 0

    # Sort by revenue descending
    by_driver = sorted(driver_revenue.values(), key=lambda x: x["total_revenue"], reverse=True)

    # Group by route (pickup -> delivery)
    route_revenue: Dict[str, Dict] = {}
    for order in orders:
        pickup_site = sites_map.get(order.pickup_site_id) if order.pickup_site_id else None
        delivery_site = sites_map.get(order.delivery_site_id) if order.delivery_site_id else None

        pickup_name = pickup_site.company_name if pickup_site else (order.pickup_text or "Unknown")
        delivery_name = delivery_site.company_name if delivery_site else (order.delivery_text or "Unknown")

        route_key = f"{pickup_name} → {delivery_name}"

        if route_key not in route_revenue:
            route_revenue[route_key] = {
                "route": route_key,
                "pickup": pickup_name,
                "delivery": delivery_name,
                "total_revenue": 0,
                "order_count": 0,
                "total_distance_km": 0
            }

        route_revenue[route_key]["total_revenue"] += order.freight_charge or 0
        route_revenue[route_key]["order_count"] += 1
        route_revenue[route_key]["total_distance_km"] += order.distance_km or 0

    # Sort by revenue descending
    by_route = sorted(route_revenue.values(), key=lambda x: x["total_revenue"], reverse=True)

    return {
        "year": year,
        "month": month,
        "summary": {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "average_revenue_per_order": int(average_revenue_per_order),
            "total_distance_km": total_distance_km
        },
        "by_customer": by_customer,
        "by_driver": by_driver,
        "by_route": by_route
    }


@router.get("/monthly-trend")
def get_monthly_trend(
    year: int = Query(..., description="Year (e.g., 2025)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get monthly revenue trend for the entire year
    Returns revenue for each month (1-12)
    """
    tenant_id = str(current_user.tenant_id)

    monthly_data = []

    for month in range(1, 13):
        # Try to get delivered order IDs from status logs
        try:
            delivered_orders_subquery = (
                select(OrderStatusLog.order_id)
                .where(
                    OrderStatusLog.tenant_id == tenant_id,
                    OrderStatusLog.to_status == OrderStatus.DELIVERED,
                    func.extract('year', OrderStatusLog.changed_at) == year,
                    func.extract('month', OrderStatusLog.changed_at) == month
                )
                .distinct()
            )
            delivered_order_ids = session.exec(delivered_orders_subquery).all()
        except Exception:
            delivered_order_ids = []

        # Get orders
        if delivered_order_ids:
            orders = session.exec(
                select(Order).where(
                    Order.tenant_id == tenant_id,
                    Order.id.in_(delivered_order_ids),
                    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
                )
            ).all()
        else:
            # Fallback: use order_date
            orders = session.exec(
                select(Order).where(
                    Order.tenant_id == tenant_id,
                    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
                    func.extract('year', Order.order_date) == year,
                    func.extract('month', Order.order_date) == month
                )
            ).all()

        if not orders:
            monthly_data.append({
                "month": month,
                "total_revenue": 0,
                "order_count": 0,
                "average_revenue": 0
            })
            continue

        total_revenue = sum(o.freight_charge or 0 for o in orders)
        order_count = len(orders)
        average_revenue = total_revenue / order_count if order_count > 0 else 0

        monthly_data.append({
            "month": month,
            "total_revenue": total_revenue,
            "order_count": order_count,
            "average_revenue": int(average_revenue)
        })

    return {
        "year": year,
        "monthly_data": monthly_data,
        "total_year_revenue": sum(m["total_revenue"] for m in monthly_data),
        "total_year_orders": sum(m["order_count"] for m in monthly_data)
    }

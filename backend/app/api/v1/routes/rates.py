from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Rate, RateCustomer, User, Location, Customer
from app.core.security import get_current_user
from datetime import date

router = APIRouter(prefix="/rates", tags=["rates"])


@router.get("")
def list_rates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all rates for current tenant with location name enrichment"""
    tenant_id = str(current_user.tenant_id)

    rates = session.exec(
        select(Rate).where(Rate.tenant_id == tenant_id).order_by(Rate.effective_date.desc())
    ).all()

    # Get all unique location IDs
    location_ids = set()
    for rate in rates:
        location_ids.add(rate.pickup_location_id)
        location_ids.add(rate.delivery_location_id)

    # Fetch all locations at once
    locations = session.exec(
        select(Location).where(Location.id.in_(location_ids))
    ).all()
    location_map = {loc.id: loc for loc in locations}

    # Enrich with customer assignments and location names
    result = []
    for rate in rates:
        # Get assigned customers for this rate
        rate_customers = session.exec(
            select(RateCustomer).where(RateCustomer.rate_id == rate.id)
        ).all()

        if rate_customers:
            customer_ids = [rc.customer_id for rc in rate_customers]
            customers = session.exec(
                select(Customer).where(Customer.id.in_(customer_ids))
            ).all()
            customer_names = [f"{c.code} - {c.name}" for c in customers]
            customer_codes = [c.code for c in customers]
            customer_display = ", ".join(customer_names)
            customer_codes_display = ", ".join(customer_codes)
        else:
            customer_display = "Tất cả khách hàng"
            customer_codes_display = "Tất cả KH"
            customer_ids = []

        # Get location names
        pickup_loc = location_map.get(rate.pickup_location_id)
        delivery_loc = location_map.get(rate.delivery_location_id)

        result.append({
            "id": rate.id,
            "pickup_location_id": rate.pickup_location_id,
            "pickup_location_name": pickup_loc.name if pickup_loc else "N/A",
            "pickup_location_code": pickup_loc.code if pickup_loc else "",
            "delivery_location_id": rate.delivery_location_id,
            "delivery_location_name": delivery_loc.name if delivery_loc else "N/A",
            "delivery_location_code": delivery_loc.code if delivery_loc else "",
            "distance_km": rate.distance_km,
            "toll_stations": rate.toll_stations,
            "pricing_type": rate.pricing_type,
            "price_cont_20": rate.price_cont_20,
            "price_cont_40": rate.price_cont_40,
            "price_per_trip": rate.price_per_trip,
            "customer_ids": customer_ids,
            "customer_names": customer_display,
            "customer_codes": customer_codes_display,
            "effective_date": rate.effective_date.isoformat() if rate.effective_date else None,
            "end_date": rate.end_date.isoformat() if rate.end_date else None,
            "status": rate.status,
            "created_at": rate.created_at.isoformat() if rate.created_at else None,
        })

    return result


@router.post("")
def create_rate(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new rate (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create rates")

    tenant_id = str(current_user.tenant_id)

    # Validate locations
    pickup_loc = session.get(Location, payload["pickup_location_id"])
    if not pickup_loc or str(pickup_loc.tenant_id) != tenant_id:
        raise HTTPException(404, "Pickup location not found")

    delivery_loc = session.get(Location, payload["delivery_location_id"])
    if not delivery_loc or str(delivery_loc.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery location not found")

    # Validate customers if provided
    customer_ids = payload.get("customer_ids", [])
    if customer_ids:
        for cust_id in customer_ids:
            customer = session.get(Customer, cust_id)
            if not customer or str(customer.tenant_id) != tenant_id:
                raise HTTPException(404, f"Customer {cust_id} not found")

    # Create rate
    rate = Rate(
        tenant_id=tenant_id,
        pickup_location_id=payload["pickup_location_id"],
        delivery_location_id=payload["delivery_location_id"],
        distance_km=payload.get("distance_km"),
        toll_stations=payload.get("toll_stations"),
        pricing_type=payload.get("pricing_type", "CONTAINER"),
        price_cont_20=payload.get("price_cont_20"),
        price_cont_40=payload.get("price_cont_40"),
        price_per_trip=payload.get("price_per_trip"),
        effective_date=payload["effective_date"],
        end_date=payload.get("end_date"),
        status=payload.get("status", "ACTIVE"),
    )
    session.add(rate)
    session.commit()
    session.refresh(rate)

    # Create customer assignments if any
    if customer_ids:
        for cust_id in customer_ids:
            rate_customer = RateCustomer(
                tenant_id=tenant_id,
                rate_id=rate.id,
                customer_id=cust_id,
            )
            session.add(rate_customer)
        session.commit()

    return rate


@router.put("/{rate_id}")
def update_rate(
    rate_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update rate (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update rates")

    tenant_id = str(current_user.tenant_id)
    rate = session.get(Rate, rate_id)
    if not rate:
        raise HTTPException(404, "Rate not found")
    if str(rate.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Validate locations if changed
    if "pickup_location_id" in payload:
        pickup_loc = session.get(Location, payload["pickup_location_id"])
        if not pickup_loc or str(pickup_loc.tenant_id) != tenant_id:
            raise HTTPException(404, "Pickup location not found")
        rate.pickup_location_id = payload["pickup_location_id"]

    if "delivery_location_id" in payload:
        delivery_loc = session.get(Location, payload["delivery_location_id"])
        if not delivery_loc or str(delivery_loc.tenant_id) != tenant_id:
            raise HTTPException(404, "Delivery location not found")
        rate.delivery_location_id = payload["delivery_location_id"]

    # Update customer assignments if changed
    if "customer_ids" in payload:
        customer_ids = payload["customer_ids"]

        # Validate all customers
        if customer_ids:
            for cust_id in customer_ids:
                customer = session.get(Customer, cust_id)
                if not customer or str(customer.tenant_id) != tenant_id:
                    raise HTTPException(404, f"Customer {cust_id} not found")

        # Delete existing assignments
        existing = session.exec(
            select(RateCustomer).where(RateCustomer.rate_id == rate_id)
        ).all()
        for rc in existing:
            session.delete(rc)

        # Flush to commit deletions before inserting new ones
        session.flush()

        # Create new assignments
        if customer_ids:
            for cust_id in customer_ids:
                rate_customer = RateCustomer(
                    tenant_id=tenant_id,
                    rate_id=rate_id,
                    customer_id=cust_id,
                )
                session.add(rate_customer)

    # Update rate fields
    if "distance_km" in payload:
        rate.distance_km = payload["distance_km"]
    if "toll_stations" in payload:
        rate.toll_stations = payload["toll_stations"]
    if "pricing_type" in payload:
        rate.pricing_type = payload["pricing_type"]
    if "price_cont_20" in payload:
        rate.price_cont_20 = payload["price_cont_20"]
    if "price_cont_40" in payload:
        rate.price_cont_40 = payload["price_cont_40"]
    if "price_per_trip" in payload:
        rate.price_per_trip = payload["price_per_trip"]
    if "effective_date" in payload:
        rate.effective_date = payload["effective_date"]
    if "end_date" in payload:
        rate.end_date = payload["end_date"]
    if "status" in payload:
        rate.status = payload["status"]

    session.add(rate)
    session.commit()
    session.refresh(rate)
    return rate


@router.delete("/{rate_id}")
def delete_rate(
    rate_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete rate (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete rates")

    tenant_id = str(current_user.tenant_id)
    rate = session.get(Rate, rate_id)
    if not rate:
        raise HTTPException(404, "Rate not found")
    if str(rate.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(rate)
    session.commit()
    return {"ok": True}


@router.get("/lookup")
def lookup_rate(
    pickup_location_id: str,
    delivery_location_id: str,
    customer_id: str = None,
    container_type: str = None,  # "20" or "40" for container-based
    effective_date: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Lookup applicable rate for a route and customer

    Matching logic:
    1. Match rates by exact location_id
    2. Priority: customer-specific rate > default rate
    3. Return appropriate price based on pricing_type and container_type
    """
    tenant_id = str(current_user.tenant_id)
    lookup_date = date.fromisoformat(effective_date) if effective_date else date.today()

    # Find all rates that match this route by location_id
    stmt = (
        select(Rate)
        .where(Rate.tenant_id == tenant_id)
        .where(Rate.pickup_location_id == pickup_location_id)
        .where(Rate.delivery_location_id == delivery_location_id)
        .where(Rate.status == "ACTIVE")
        .where(Rate.effective_date <= lookup_date)
        .where((Rate.end_date == None) | (Rate.end_date >= lookup_date))
        .order_by(Rate.effective_date.desc())
    )

    candidate_rates = session.exec(stmt).all()

    if not candidate_rates:
        raise HTTPException(404, "No applicable rate found for this route")

    # Priority: customer-specific > default
    selected_rate = None
    if customer_id:
        for rate in candidate_rates:
            rate_customer = session.exec(
                select(RateCustomer)
                .where(RateCustomer.rate_id == rate.id)
                .where(RateCustomer.customer_id == customer_id)
            ).first()
            if rate_customer:
                selected_rate = rate
                break

    # Fall back to default rate (no customer assignments)
    if not selected_rate:
        for rate in candidate_rates:
            has_customers = session.exec(
                select(RateCustomer).where(RateCustomer.rate_id == rate.id)
            ).first()
            if not has_customers:
                selected_rate = rate
                break

    if not selected_rate:
        raise HTTPException(404, "No applicable rate found for this customer and route")

    # Determine price based on pricing_type
    price = None
    price_type = None

    if selected_rate.pricing_type == "CONTAINER":
        if container_type == "20":
            price = selected_rate.price_cont_20
            price_type = "cont_20"
        elif container_type == "40":
            price = selected_rate.price_cont_40
            price_type = "cont_40"
        else:
            # Return both if not specified
            return {
                "rate": selected_rate,
                "pricing_type": "CONTAINER",
                "price_cont_20": selected_rate.price_cont_20,
                "price_cont_40": selected_rate.price_cont_40,
            }
    else:  # TRIP
        price = selected_rate.price_per_trip
        price_type = "per_trip"

    return {
        "rate": selected_rate,
        "pricing_type": selected_rate.pricing_type,
        "price": price,
        "price_type": price_type,
    }

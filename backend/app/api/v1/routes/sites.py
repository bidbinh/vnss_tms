from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Site, Location, User
from app.core.security import get_current_user

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("")
def list_sites(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all sites for current tenant with location name enrichment"""
    tenant_id = str(current_user.tenant_id)

    sites = session.exec(
        select(Site).where(Site.tenant_id == tenant_id).order_by(Site.created_at.desc())
    ).all()

    # Enrich with location names
    location_ids = {site.location_id for site in sites}
    locations = session.exec(
        select(Location).where(Location.id.in_(location_ids))
    ).all()
    location_map = {loc.id: loc for loc in locations}

    result = []
    for site in sites:
        site_dict = site.model_dump()
        location = location_map.get(site.location_id)
        site_dict["location_name"] = location.name if location else None
        site_dict["location_code"] = location.code if location else None
        result.append(site_dict)

    return result


@router.post("")
def create_site(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new site (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create sites")

    tenant_id = str(current_user.tenant_id)

    # Validate location exists and belongs to tenant
    location = session.get(Location, payload["location_id"])
    if not location:
        raise HTTPException(404, "Location not found")
    if str(location.tenant_id) != tenant_id:
        raise HTTPException(403, "Location access denied")

    site = Site(
        tenant_id=tenant_id,
        location_id=payload["location_id"],
        company_name=payload["company_name"].strip(),
        code=payload.get("code", "").strip().upper() if payload.get("code") else None,
        detailed_address=payload["detailed_address"].strip(),
        contact_name=payload.get("contact_name", "").strip() if payload.get("contact_name") else None,
        contact_phone=payload.get("contact_phone", "").strip() if payload.get("contact_phone") else None,
        note=payload.get("note"),
        status=payload.get("status", "ACTIVE"),
    )
    session.add(site)
    session.commit()
    session.refresh(site)
    return site


@router.put("/{site_id}")
def update_site(
    site_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update site (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update sites")

    tenant_id = str(current_user.tenant_id)
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    if str(site.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Validate location if changed
    if "location_id" in payload:
        location = session.get(Location, payload["location_id"])
        if not location:
            raise HTTPException(404, "Location not found")
        if str(location.tenant_id) != tenant_id:
            raise HTTPException(403, "Location access denied")
        site.location_id = payload["location_id"]

    # Update fields
    if "company_name" in payload:
        site.company_name = payload["company_name"].strip()
    if "code" in payload:
        site.code = payload["code"].strip().upper() if payload["code"] else None
    if "site_type" in payload:
        site.site_type = payload["site_type"]
    if "detailed_address" in payload:
        site.detailed_address = payload["detailed_address"].strip()
    if "contact_name" in payload:
        site.contact_name = payload["contact_name"].strip() if payload["contact_name"] else None
    if "contact_phone" in payload:
        site.contact_phone = payload["contact_phone"].strip() if payload["contact_phone"] else None
    if "note" in payload:
        site.note = payload["note"]
    if "status" in payload:
        site.status = payload["status"]

    session.add(site)
    session.commit()
    session.refresh(site)
    return site


@router.delete("/{site_id}")
def delete_site(
    site_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete site (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete sites")

    tenant_id = str(current_user.tenant_id)
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    if str(site.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(site)
    session.commit()
    return {"success": True}


@router.post("/check")
def check_sites_exist(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Check if sites exist by search text (without auto-creating).
    Used to warn user before creating orders from text.

    payload:
      - sites: list of {"search_text": "...", "type": "pickup" | "delivery"}

    Returns: list of results with found status and suggestions
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can use this")

    tenant_id = str(current_user.tenant_id)
    sites_to_check = payload.get("sites", [])

    # Load all sites and locations once for efficiency
    all_sites = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.status == "ACTIVE"
        )
    ).all()

    all_locations = session.exec(
        select(Location).where(
            Location.tenant_id == tenant_id,
            Location.is_active == True
        )
    ).all()

    location_map = {loc.id: loc for loc in all_locations}

    results = []
    for item in sites_to_check:
        search_text = item.get("search_text", "").strip()
        site_type = item.get("type", "pickup")

        if not search_text:
            results.append({
                "search_text": search_text,
                "type": site_type,
                "found": False,
                "site": None,
                "suggestions": []
            })
            continue

        search_upper = search_text.upper()
        search_lower = search_text.lower()

        # Try to find matching site
        found_site = None
        suggestions = []

        for site in all_sites:
            # Exact code match
            if site.code == search_upper:
                found_site = site
                break
            # Partial match - add to suggestions
            if (search_lower in site.company_name.lower() or
                site.company_name.lower() in search_lower or
                (site.code and search_upper in site.code)):
                if found_site is None:
                    found_site = site
                else:
                    suggestions.append({
                        "id": site.id,
                        "code": site.code,
                        "company_name": site.company_name
                    })

        # Also check by location
        if not found_site:
            for loc in all_locations:
                if (search_upper == loc.code or
                    search_lower in loc.name.lower() or
                    loc.name.lower() in search_lower):
                    # Find site with this location
                    for site in all_sites:
                        if site.location_id == loc.id:
                            found_site = site
                            break
                    break

        if found_site:
            location = location_map.get(found_site.location_id)
            results.append({
                "search_text": search_text,
                "type": site_type,
                "found": True,
                "site": {
                    "id": found_site.id,
                    "code": found_site.code,
                    "company_name": found_site.company_name,
                    "location_name": location.name if location else None,
                },
                "suggestions": suggestions[:3]  # Max 3 suggestions
            })
        else:
            # Not found - collect similar suggestions
            for site in all_sites[:5]:
                suggestions.append({
                    "id": site.id,
                    "code": site.code,
                    "company_name": site.company_name
                })
            results.append({
                "search_text": search_text,
                "type": site_type,
                "found": False,
                "site": None,
                "suggestions": suggestions
            })

    return {"results": results}


@router.post("/find-or-create")
def find_or_create_site(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Find existing site by code/name or create new one.
    Used for quick order creation from text.

    payload:
      - search_text: text to search (e.g., "CHÙA VẼ" or "An Tảo, Hưng Yên")
      - site_type: "PICKUP" or "DELIVERY" (for auto-creating)

    Returns: site dict with id, code, company_name, location info
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can use this")

    tenant_id = str(current_user.tenant_id)
    search_text = payload.get("search_text", "").strip()
    site_type = payload.get("site_type", "CUSTOMER")

    if not search_text:
        return {"site": None, "created": False}

    search_upper = search_text.upper()
    search_lower = search_text.lower()

    # 1. Try to find existing site by code (exact match)
    existing_site = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.code == search_upper,
            Site.status == "ACTIVE"
        )
    ).first()

    if existing_site:
        location = session.get(Location, existing_site.location_id)
        return {
            "site": {
                "id": existing_site.id,
                "code": existing_site.code,
                "company_name": existing_site.company_name,
                "location_name": location.name if location else None,
                "location_code": location.code if location else None,
            },
            "created": False
        }

    # 2. Try to find by company_name (partial match)
    sites = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.status == "ACTIVE"
        )
    ).all()

    for site in sites:
        # Match by company_name containing search text or vice versa
        if (search_lower in site.company_name.lower() or
            site.company_name.lower() in search_lower or
            (site.code and search_upper in site.code)):
            location = session.get(Location, site.location_id)
            return {
                "site": {
                    "id": site.id,
                    "code": site.code,
                    "company_name": site.company_name,
                    "location_name": location.name if location else None,
                    "location_code": location.code if location else None,
                },
                "created": False
            }

    # 3. Try to find by location code or name
    locations = session.exec(
        select(Location).where(
            Location.tenant_id == tenant_id,
            Location.is_active == True
        )
    ).all()

    matched_location = None
    for loc in locations:
        if (search_upper == loc.code or
            search_lower in loc.name.lower() or
            loc.name.lower() in search_lower):
            matched_location = loc
            break

    # 4. If found location but no site, check if there's a site with this location
    if matched_location:
        site_with_loc = session.exec(
            select(Site).where(
                Site.tenant_id == tenant_id,
                Site.location_id == matched_location.id,
                Site.status == "ACTIVE"
            )
        ).first()

        if site_with_loc:
            return {
                "site": {
                    "id": site_with_loc.id,
                    "code": site_with_loc.code,
                    "company_name": site_with_loc.company_name,
                    "location_name": matched_location.name,
                    "location_code": matched_location.code,
                },
                "created": False
            }

        # Create new site with this location
        new_code = search_upper.replace(" ", "_").replace(",", "")[:20]
        new_site = Site(
            tenant_id=tenant_id,
            location_id=matched_location.id,
            company_name=search_text,
            code=new_code,
            detailed_address=search_text,
            site_type=site_type,
            status="ACTIVE",
        )
        session.add(new_site)
        session.commit()
        session.refresh(new_site)

        return {
            "site": {
                "id": new_site.id,
                "code": new_site.code,
                "company_name": new_site.company_name,
                "location_name": matched_location.name,
                "location_code": matched_location.code,
            },
            "created": True
        }

    # 5. Create new location and site if nothing found
    # Generate location code from search text
    loc_code = search_upper.replace(" ", "").replace(",", "").replace(".", "")[:30]

    # Check if location code already exists
    existing_loc = session.exec(
        select(Location).where(
            Location.tenant_id == tenant_id,
            Location.code == loc_code
        )
    ).first()

    if existing_loc:
        # Use existing location
        new_location = existing_loc
    else:
        # Create new location
        new_location = Location(
            tenant_id=tenant_id,
            code=loc_code,
            name=search_text,
            type="CUSTOMER",  # Default type
            is_active=True,
        )
        session.add(new_location)
        session.commit()
        session.refresh(new_location)

    # Create new site
    site_code = loc_code[:20]
    new_site = Site(
        tenant_id=tenant_id,
        location_id=new_location.id,
        company_name=search_text,
        code=site_code,
        detailed_address=search_text,
        site_type=site_type,
        status="ACTIVE",
    )
    session.add(new_site)
    session.commit()
    session.refresh(new_site)

    return {
        "site": {
            "id": new_site.id,
            "code": new_site.code,
            "company_name": new_site.company_name,
            "location_name": new_location.name,
            "location_code": new_location.code,
        },
        "created": True
    }

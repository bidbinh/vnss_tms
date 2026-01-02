"""
FMS - Seed Data API Routes
Generate sample FMS data for testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timedelta, date
import random

from app.db.session import get_session
from app.models import User
from app.models.fms import (
    ForwardingAgent, AgentType,
    FreightRate, RateType,
    FMSQuotation, QuotationItem, QuotationStatus, ChargeType,
    FMSShipment, ShipmentType, ShipmentMode, ShipmentStatus, IncotermsType,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/seed", tags=["FMS - Seed"])


# ===================
# Sample Data
# ===================

# Overseas Agents - use columns that match current DB schema
OVERSEAS_AGENTS = [
    {
        "agent_code": "AGT-CN-001",
        "agent_name": "Shanghai Global Logistics Co., Ltd",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "China",
        "city": "Shanghai",
        "address": "No. 888, Pudong New Area, Shanghai",
        "email": "info@sgl-logistics.cn",
        "phone": "+86-21-88889999",
        "contact_person": "Li Wei",
        "services": "SEA,AIR,TRUCKING,CUSTOMS",
    },
    {
        "agent_code": "AGT-SG-001",
        "agent_name": "Singapore Freight Solutions Pte Ltd",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "Singapore",
        "city": "Singapore",
        "address": "10 Changi South Street 2, #05-01",
        "email": "contact@sfs.sg",
        "phone": "+65-6789-0123",
        "contact_person": "David Tan",
        "services": "SEA,AIR,CUSTOMS",
    },
    {
        "agent_code": "AGT-JP-001",
        "agent_name": "Tokyo Forwarding Corporation",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "Japan",
        "city": "Tokyo",
        "address": "1-2-3 Shibaura, Minato-ku, Tokyo",
        "email": "info@tfc-japan.jp",
        "phone": "+81-3-1234-5678",
        "contact_person": "Yamamoto Kenji",
        "services": "SEA,AIR,CUSTOMS",
    },
    {
        "agent_code": "AGT-KR-001",
        "agent_name": "Korea Logistics Network Co., Ltd",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "South Korea",
        "city": "Busan",
        "address": "123 Gamman-dong, Sasang-gu, Busan",
        "email": "info@kln-logistics.kr",
        "phone": "+82-51-789-0123",
        "contact_person": "Kim Min-jun",
        "services": "SEA,AIR",
    },
    {
        "agent_code": "AGT-TH-001",
        "agent_name": "Bangkok Thai Shipping Co., Ltd",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "Thailand",
        "city": "Bangkok",
        "address": "555 Sukhumvit Road, Klongtoey, Bangkok",
        "email": "contact@bts-shipping.th",
        "phone": "+66-2-123-4567",
        "contact_person": "Somchai Prasert",
        "services": "SEA,TRUCKING,CUSTOMS",
    },
    {
        "agent_code": "AGT-US-001",
        "agent_name": "American Global Freight Inc",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "United States",
        "city": "Los Angeles",
        "address": "2000 Pacific Coast Highway, Long Beach, CA",
        "email": "info@agf-usa.com",
        "phone": "+1-310-555-0123",
        "contact_person": "John Smith",
        "services": "SEA,AIR,TRUCKING,CUSTOMS",
    },
    {
        "agent_code": "AGT-DE-001",
        "agent_name": "Hamburg Spedition GmbH",
        "agent_type": AgentType.OVERSEAS_AGENT.value,
        "country": "Germany",
        "city": "Hamburg",
        "address": "Hafenstraße 123, 20457 Hamburg",
        "email": "kontakt@hsg-spedition.de",
        "phone": "+49-40-123456",
        "contact_person": "Hans Mueller",
        "services": "SEA,AIR,TRUCKING",
    },
]

# Local Agents
LOCAL_AGENTS = [
    {
        "agent_code": "AGT-VN-HCM-001",
        "agent_name": "Công ty TNHH Giao nhận Sao Mai",
        "agent_type": AgentType.LOCAL_AGENT.value,
        "country": "Vietnam",
        "city": "TP. Hồ Chí Minh",
        "address": "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
        "email": "info@saomailogistics.vn",
        "phone": "028-38779988",
        "contact_person": "Nguyễn Văn A",
        "services": "TRUCKING,CUSTOMS,WAREHOUSE",
    },
    {
        "agent_code": "AGT-VN-HP-001",
        "agent_name": "Công ty CP Vận tải Hải Phòng",
        "agent_type": AgentType.LOCAL_AGENT.value,
        "country": "Vietnam",
        "city": "Hải Phòng",
        "address": "456 Lê Hồng Phong, Quận Ngô Quyền, Hải Phòng",
        "email": "info@vantaihaiphong.vn",
        "phone": "0225-3746789",
        "contact_person": "Trần Văn B",
        "services": "TRUCKING,CUSTOMS",
    },
]

# Shipping Lines
SHIPPING_LINES = [
    {"agent_code": "LINE-MSC", "agent_name": "Mediterranean Shipping Company", "agent_short_name": "MSC"},
    {"agent_code": "LINE-MAERSK", "agent_name": "Maersk Line", "agent_short_name": "MAERSK"},
    {"agent_code": "LINE-COSCO", "agent_name": "COSCO Shipping Lines", "agent_short_name": "COSCO"},
    {"agent_code": "LINE-CMA", "agent_name": "CMA CGM", "agent_short_name": "CMA"},
    {"agent_code": "LINE-EVERGREEN", "agent_name": "Evergreen Marine", "agent_short_name": "EVERGREEN"},
    {"agent_code": "LINE-OOCL", "agent_name": "OOCL", "agent_short_name": "OOCL"},
    {"agent_code": "LINE-ONE", "agent_name": "Ocean Network Express", "agent_short_name": "ONE"},
]

# Port codes
PORTS = [
    ("VNCLI", "Cát Lái, TP.HCM", "VN"),
    ("VNHPH", "Hải Phòng", "VN"),
    ("VNSGN", "TP. Hồ Chí Minh", "VN"),
    ("CNSHA", "Shanghai", "CN"),
    ("CNNBO", "Ningbo", "CN"),
    ("CNSZX", "Shenzhen", "CN"),
    ("SGSIN", "Singapore", "SG"),
    ("HKHKG", "Hong Kong", "HK"),
    ("KRPUS", "Busan", "KR"),
    ("JPTYO", "Tokyo", "JP"),
    ("JPYOK", "Yokohama", "JP"),
    ("THLCH", "Laem Chabang", "TH"),
    ("USLA", "Los Angeles", "US"),
    ("USLGB", "Long Beach", "US"),
    ("DEHAM", "Hamburg", "DE"),
]


@router.post("")
def seed_fms_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate sample FMS data for testing"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    today = date.today()

    created = {
        "agents": 0,
        "shipping_lines": 0,
        "freight_rates": 0,
        "quotations": 0,
        "shipments": 0,
    }

    # ===================
    # 1. AGENTS
    # ===================
    agents = []

    # Overseas agents
    for data in OVERSEAS_AGENTS:
        existing = session.exec(
            select(ForwardingAgent).where(
                ForwardingAgent.tenant_id == tenant_id,
                ForwardingAgent.agent_code == data["agent_code"]
            )
        ).first()

        if not existing:
            agent = ForwardingAgent(
                tenant_id=tenant_id,
                created_by=user_id,
                is_active=True,
                **data
            )
            session.add(agent)
            agents.append(agent)
            created["agents"] += 1
        else:
            agents.append(existing)

    # Local agents
    for data in LOCAL_AGENTS:
        existing = session.exec(
            select(ForwardingAgent).where(
                ForwardingAgent.tenant_id == tenant_id,
                ForwardingAgent.agent_code == data["agent_code"]
            )
        ).first()

        if not existing:
            agent = ForwardingAgent(
                tenant_id=tenant_id,
                created_by=user_id,
                is_active=True,
                **data
            )
            session.add(agent)
            agents.append(agent)
            created["agents"] += 1
        else:
            agents.append(existing)

    # Shipping lines
    for data in SHIPPING_LINES:
        existing = session.exec(
            select(ForwardingAgent).where(
                ForwardingAgent.tenant_id == tenant_id,
                ForwardingAgent.agent_code == data["agent_code"]
            )
        ).first()

        if not existing:
            agent = ForwardingAgent(
                tenant_id=tenant_id,
                created_by=user_id,
                is_active=True,
                agent_type=AgentType.SHIPPING_LINE.value,
                services_sea=True,
                **data
            )
            session.add(agent)
            created["shipping_lines"] += 1

    session.commit()

    # ===================
    # 2. FREIGHT RATES
    # ===================

    # Sea FCL Rates - China routes
    fcl_routes = [
        ("CNSHA", "Shanghai", "VNCLI", "Cát Lái", "MSC", 200, 350, 400),
        ("CNSHA", "Shanghai", "VNHPH", "Hải Phòng", "MAERSK", 220, 380, 420),
        ("CNNBO", "Ningbo", "VNCLI", "Cát Lái", "COSCO", 180, 320, 360),
        ("CNSZX", "Shenzhen", "VNCLI", "Cát Lái", "CMA", 150, 280, 320),
        ("HKHKG", "Hong Kong", "VNCLI", "Cát Lái", "OOCL", 180, 320, 360),
        ("SGSIN", "Singapore", "VNCLI", "Cát Lái", "ONE", 100, 180, 200),
        ("KRPUS", "Busan", "VNCLI", "Cát Lái", "EVERGREEN", 250, 420, 480),
        ("JPTYO", "Tokyo", "VNCLI", "Cát Lái", "ONE", 350, 580, 650),
        ("THLCH", "Laem Chabang", "VNCLI", "Cát Lái", "MSC", 120, 220, 250),
    ]

    for origin, origin_name, dest, dest_name, carrier, rate_20, rate_40, rate_40hc in fcl_routes:
        rate_code = f"RATE-FCL-{origin}-{dest}"

        existing = session.exec(
            select(FreightRate).where(
                FreightRate.tenant_id == tenant_id,
                FreightRate.rate_code == rate_code
            )
        ).first()

        if not existing:
            rate = FreightRate(
                tenant_id=tenant_id,
                rate_code=rate_code,
                rate_name=f"FCL {origin_name} - {dest_name}",
                rate_type=RateType.SEA_FCL.value,
                is_active=True,
                effective_date=today - timedelta(days=30),
                expiry_date=today + timedelta(days=60),
                carrier_name=carrier,
                origin_port=origin,
                origin_port_name=origin_name,
                destination_port=dest,
                destination_port_name=dest_name,
                transit_time_min=5 if "SG" in origin or "TH" in origin else 10,
                transit_time_max=10 if "SG" in origin or "TH" in origin else 18,
                currency_code="USD",
                rate_20gp=rate_20,
                rate_40gp=rate_40,
                rate_40hc=rate_40hc,
                free_detention_days=7,
                free_demurrage_days=7,
                created_by=user_id,
            )
            session.add(rate)
            created["freight_rates"] += 1

    # Sea LCL Rates
    lcl_routes = [
        ("CNSHA", "Shanghai", "VNCLI", "Cát Lái", 25, 25, 50),
        ("CNNBO", "Ningbo", "VNCLI", "Cát Lái", 23, 23, 50),
        ("SGSIN", "Singapore", "VNCLI", "Cát Lái", 18, 18, 40),
        ("HKHKG", "Hong Kong", "VNCLI", "Cát Lái", 20, 20, 45),
    ]

    for origin, origin_name, dest, dest_name, rate_cbm, rate_ton, min_charge in lcl_routes:
        rate_code = f"RATE-LCL-{origin}-{dest}"

        existing = session.exec(
            select(FreightRate).where(
                FreightRate.tenant_id == tenant_id,
                FreightRate.rate_code == rate_code
            )
        ).first()

        if not existing:
            rate = FreightRate(
                tenant_id=tenant_id,
                rate_code=rate_code,
                rate_name=f"LCL {origin_name} - {dest_name}",
                rate_type=RateType.SEA_LCL.value,
                is_active=True,
                effective_date=today - timedelta(days=30),
                expiry_date=today + timedelta(days=60),
                origin_port=origin,
                origin_port_name=origin_name,
                destination_port=dest,
                destination_port_name=dest_name,
                transit_time_min=10,
                transit_time_max=18,
                currency_code="USD",
                rate_per_cbm=rate_cbm,
                rate_per_ton=rate_ton,
                min_charge=min_charge,
                created_by=user_id,
            )
            session.add(rate)
            created["freight_rates"] += 1

    # Air Rates
    air_routes = [
        ("CNSHA", "Shanghai PVG", "VNSGN", "Tân Sơn Nhất", 3.5, 3.2, 2.8, 2.5, 2.2, 2.0),
        ("SGSIN", "Changi", "VNSGN", "Tân Sơn Nhất", 3.0, 2.8, 2.5, 2.2, 2.0, 1.8),
        ("HKHKG", "Hong Kong", "VNSGN", "Tân Sơn Nhất", 3.2, 3.0, 2.6, 2.3, 2.1, 1.9),
        ("KRPUS", "Incheon", "VNSGN", "Tân Sơn Nhất", 4.0, 3.5, 3.2, 2.8, 2.5, 2.2),
        ("JPTYO", "Narita", "VNSGN", "Tân Sơn Nhất", 4.5, 4.0, 3.5, 3.0, 2.8, 2.5),
    ]

    for origin, origin_name, dest, dest_name, rate_min, rate_45, rate_100, rate_300, rate_500, rate_1000 in air_routes:
        rate_code = f"RATE-AIR-{origin}-{dest}"

        existing = session.exec(
            select(FreightRate).where(
                FreightRate.tenant_id == tenant_id,
                FreightRate.rate_code == rate_code
            )
        ).first()

        if not existing:
            rate = FreightRate(
                tenant_id=tenant_id,
                rate_code=rate_code,
                rate_name=f"AIR {origin_name} - {dest_name}",
                rate_type=RateType.AIR.value,
                is_active=True,
                effective_date=today - timedelta(days=30),
                expiry_date=today + timedelta(days=60),
                origin_port=origin,
                origin_port_name=origin_name,
                destination_port=dest,
                destination_port_name=dest_name,
                transit_time_min=1,
                transit_time_max=3,
                currency_code="USD",
                rate_min=rate_min,
                rate_45kg=rate_45,
                rate_100kg=rate_100,
                rate_300kg=rate_300,
                rate_500kg=rate_500,
                rate_1000kg=rate_1000,
                created_by=user_id,
            )
            session.add(rate)
            created["freight_rates"] += 1

    session.commit()

    # ===================
    # 3. QUOTATIONS (Sample)
    # ===================
    quotations_data = [
        {
            "quote_no": f"QT-FMS-{today.strftime('%Y%m')}-0001",
            "shipment_type": ShipmentType.FCL_IMPORT.value,
            "origin": "CNSHA",
            "destination": "VNCLI",
            "cargo_description": "Linh kiện điện tử",
            "total_amount": 2500,
        },
        {
            "quote_no": f"QT-FMS-{today.strftime('%Y%m')}-0002",
            "shipment_type": ShipmentType.LCL_IMPORT.value,
            "origin": "SGSIN",
            "destination": "VNCLI",
            "cargo_description": "Phụ tùng máy móc",
            "total_amount": 850,
        },
        {
            "quote_no": f"QT-FMS-{today.strftime('%Y%m')}-0003",
            "shipment_type": ShipmentType.AIR_IMPORT.value,
            "origin": "JPTYO",
            "destination": "VNSGN",
            "cargo_description": "Thiết bị y tế",
            "total_amount": 3200,
        },
    ]

    for data in quotations_data:
        existing = session.exec(
            select(FMSQuotation).where(
                FMSQuotation.tenant_id == tenant_id,
                FMSQuotation.quote_no == data["quote_no"]
            )
        ).first()

        if not existing:
            quote = FMSQuotation(
                tenant_id=tenant_id,
                quote_no=data["quote_no"],
                status=QuotationStatus.SENT.value,
                shipment_type=data["shipment_type"],
                origin_port=data["origin"],
                destination_port=data["destination"],
                cargo_description=data["cargo_description"],
                incoterms=IncotermsType.CIF.value,
                currency_code="USD",
                total_amount=data["total_amount"],
                valid_from=today,
                valid_until=today + timedelta(days=30),
                created_by=user_id,
            )
            session.add(quote)
            created["quotations"] += 1

    session.commit()

    # ===================
    # 4. SHIPMENTS (Sample)
    # ===================
    shipments_data = [
        {
            "shipment_no": f"SHP-{today.strftime('%Y%m')}-0001",
            "shipment_type": ShipmentType.FCL_IMPORT.value,
            "shipment_mode": ShipmentMode.SEA.value,
            "status": ShipmentStatus.IN_TRANSIT.value,
            "origin": "CNSHA",
            "origin_name": "Shanghai",
            "destination": "VNCLI",
            "destination_name": "Cát Lái, TP.HCM",
            "vessel_name": "MSC ISABELLA",
            "voyage_no": "VY2412E",
            "etd": today - timedelta(days=5),
            "eta": today + timedelta(days=10),
        },
        {
            "shipment_no": f"SHP-{today.strftime('%Y%m')}-0002",
            "shipment_type": ShipmentType.LCL_IMPORT.value,
            "shipment_mode": ShipmentMode.SEA.value,
            "status": ShipmentStatus.BOOKED.value,
            "origin": "SGSIN",
            "origin_name": "Singapore",
            "destination": "VNCLI",
            "destination_name": "Cát Lái, TP.HCM",
            "vessel_name": "COSCO HARMONY",
            "voyage_no": "COS2412",
            "etd": today + timedelta(days=3),
            "eta": today + timedelta(days=8),
        },
        {
            "shipment_no": f"SHP-{today.strftime('%Y%m')}-0003",
            "shipment_type": ShipmentType.AIR_IMPORT.value,
            "shipment_mode": ShipmentMode.AIR.value,
            "status": ShipmentStatus.DELIVERED.value,
            "origin": "JPTYO",
            "origin_name": "Tokyo",
            "destination": "VNSGN",
            "destination_name": "Tân Sơn Nhất",
            "flight_no": "VN310",
            "etd": today - timedelta(days=3),
            "eta": today - timedelta(days=2),
        },
    ]

    for data in shipments_data:
        existing = session.exec(
            select(FMSShipment).where(
                FMSShipment.tenant_id == tenant_id,
                FMSShipment.shipment_no == data["shipment_no"]
            )
        ).first()

        if not existing:
            shipment = FMSShipment(
                tenant_id=tenant_id,
                shipment_no=data["shipment_no"],
                shipment_type=data["shipment_type"],
                shipment_mode=data["shipment_mode"],
                status=data["status"],
                origin_port=data["origin"],
                origin_port_name=data["origin_name"],
                destination_port=data["destination"],
                destination_port_name=data["destination_name"],
                vessel_name=data.get("vessel_name"),
                voyage_no=data.get("voyage_no"),
                flight_no=data.get("flight_no"),
                etd=data["etd"],
                eta=data["eta"],
                incoterms=IncotermsType.CIF.value,
                cargo_description="Hàng mẫu test",
                created_by=user_id,
            )
            session.add(shipment)
            created["shipments"] += 1

    session.commit()

    return {
        "success": True,
        "message": "FMS sample data created successfully",
        "created": created,
    }


@router.delete("")
def delete_fms_seed_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all FMS seed data for the tenant"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "shipments": 0,
        "quotations": 0,
        "freight_rates": 0,
        "agents": 0,
    }

    # Delete shipments
    shipments = session.exec(select(FMSShipment).where(FMSShipment.tenant_id == tenant_id)).all()
    for item in shipments:
        session.delete(item)
        deleted["shipments"] += 1

    # Delete quotations
    quotations = session.exec(select(FMSQuotation).where(FMSQuotation.tenant_id == tenant_id)).all()
    for item in quotations:
        session.delete(item)
        deleted["quotations"] += 1

    # Delete rates
    rates = session.exec(select(FreightRate).where(FreightRate.tenant_id == tenant_id)).all()
    for item in rates:
        session.delete(item)
        deleted["freight_rates"] += 1

    # Delete agents
    agents = session.exec(select(ForwardingAgent).where(ForwardingAgent.tenant_id == tenant_id)).all()
    for item in agents:
        session.delete(item)
        deleted["agents"] += 1

    session.commit()

    return {
        "success": True,
        "message": "FMS seed data deleted successfully",
        "deleted": deleted,
    }

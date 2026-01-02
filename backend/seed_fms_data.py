"""
Direct SQL seed script for FMS data
Bypasses SQLModel ORM issues with schema mismatch
"""
from sqlalchemy import create_engine, text
from datetime import date, timedelta
import uuid

engine = create_engine("postgresql+psycopg://postgres:!Tnt01087@localhost:5432/tms")

TENANT_ID = "TENANT_DEMO"
USER_ID = "599c08ca-67e4-4c6d-930a-e1dd1edc6eb5"

def seed_agents(conn):
    """Seed forwarding agents"""
    agents = [
        ("AGT-CN-001", "Shanghai Global Logistics Co., Ltd", "OVERSEAS_AGENT", "China", "Shanghai", "No. 888, Pudong New Area", "info@sgl-logistics.cn", "+86-21-88889999", "Li Wei", "SEA,AIR,TRUCKING,CUSTOMS"),
        ("AGT-SG-001", "Singapore Freight Solutions Pte Ltd", "OVERSEAS_AGENT", "Singapore", "Singapore", "10 Changi South Street 2", "contact@sfs.sg", "+65-6789-0123", "David Tan", "SEA,AIR,CUSTOMS"),
        ("AGT-JP-001", "Tokyo Forwarding Corporation", "OVERSEAS_AGENT", "Japan", "Tokyo", "1-2-3 Shibaura, Minato-ku", "info@tfc-japan.jp", "+81-3-1234-5678", "Yamamoto Kenji", "SEA,AIR,CUSTOMS"),
        ("AGT-KR-001", "Korea Logistics Network Co., Ltd", "OVERSEAS_AGENT", "South Korea", "Busan", "123 Gamman-dong, Sasang-gu", "info@kln-logistics.kr", "+82-51-789-0123", "Kim Min-jun", "SEA,AIR"),
        ("AGT-TH-001", "Bangkok Thai Shipping Co., Ltd", "OVERSEAS_AGENT", "Thailand", "Bangkok", "555 Sukhumvit Road", "contact@bts-shipping.th", "+66-2-123-4567", "Somchai Prasert", "SEA,TRUCKING,CUSTOMS"),
        ("AGT-US-001", "American Global Freight Inc", "OVERSEAS_AGENT", "United States", "Los Angeles", "2000 Pacific Coast Highway", "info@agf-usa.com", "+1-310-555-0123", "John Smith", "SEA,AIR,TRUCKING,CUSTOMS"),
        ("AGT-DE-001", "Hamburg Spedition GmbH", "OVERSEAS_AGENT", "Germany", "Hamburg", "Hafenstraße 123", "kontakt@hsg-spedition.de", "+49-40-123456", "Hans Mueller", "SEA,AIR,TRUCKING"),
        ("AGT-VN-HCM-001", "Công ty TNHH Giao nhận Sao Mai", "LOCAL_AGENT", "Vietnam", "TP. Hồ Chí Minh", "123 Nguyễn Văn Linh, Quận 7", "info@saomailogistics.vn", "028-38779988", "Nguyễn Văn A", "TRUCKING,CUSTOMS,WAREHOUSE"),
        ("AGT-VN-HP-001", "Công ty CP Vận tải Hải Phòng", "LOCAL_AGENT", "Vietnam", "Hải Phòng", "456 Lê Hồng Phong", "info@vantaihaiphong.vn", "0225-3746789", "Trần Văn B", "TRUCKING,CUSTOMS"),
        ("LINE-MSC", "Mediterranean Shipping Company", "SHIPPING_LINE", "Switzerland", "Geneva", "", "", "", "", "SEA"),
        ("LINE-MAERSK", "Maersk Line", "SHIPPING_LINE", "Denmark", "Copenhagen", "", "", "", "", "SEA"),
        ("LINE-COSCO", "COSCO Shipping Lines", "SHIPPING_LINE", "China", "Shanghai", "", "", "", "", "SEA"),
        ("LINE-CMA", "CMA CGM", "SHIPPING_LINE", "France", "Marseille", "", "", "", "", "SEA"),
        ("LINE-EVERGREEN", "Evergreen Marine", "SHIPPING_LINE", "Taiwan", "Taipei", "", "", "", "", "SEA"),
    ]

    count = 0
    for code, name, agent_type, country, city, address, email, phone, contact, services in agents:
        # Check if exists
        result = conn.execute(text(
            "SELECT id FROM fms_agents WHERE tenant_id = :tenant_id AND agent_code = :code"
        ), {"tenant_id": TENANT_ID, "code": code})
        if result.fetchone():
            continue

        conn.execute(text("""
            INSERT INTO fms_agents (id, tenant_id, agent_code, agent_name, agent_type, country, city, address, email, phone, contact_person, services, is_active, created_by, created_at)
            VALUES (:id, :tenant_id, :code, :name, :agent_type, :country, :city, :address, :email, :phone, :contact, :services, true, :user_id, NOW())
        """), {
            "id": str(uuid.uuid4()),
            "tenant_id": TENANT_ID,
            "code": code,
            "name": name,
            "agent_type": agent_type,
            "country": country,
            "city": city,
            "address": address,
            "email": email,
            "phone": phone,
            "contact": contact,
            "services": services,
            "user_id": USER_ID,
        })
        count += 1

    return count

def seed_freight_rates(conn):
    """Seed freight rates"""
    today = date.today()

    # FCL rates
    fcl_routes = [
        ("CNSHA", "Shanghai", "VNCLI", "Cát Lái", "MSC", 200, 350, 400, 12),
        ("CNSHA", "Shanghai", "VNHPH", "Hải Phòng", "MAERSK", 220, 380, 420, 14),
        ("CNNBO", "Ningbo", "VNCLI", "Cát Lái", "COSCO", 180, 320, 360, 10),
        ("CNSZX", "Shenzhen", "VNCLI", "Cát Lái", "CMA", 150, 280, 320, 8),
        ("HKHKG", "Hong Kong", "VNCLI", "Cát Lái", "OOCL", 180, 320, 360, 7),
        ("SGSIN", "Singapore", "VNCLI", "Cát Lái", "ONE", 100, 180, 200, 5),
        ("KRPUS", "Busan", "VNCLI", "Cát Lái", "EVERGREEN", 250, 420, 480, 12),
        ("JPTYO", "Tokyo", "VNCLI", "Cát Lái", "ONE", 350, 580, 650, 15),
    ]

    count = 0
    for origin, origin_name, dest, dest_name, carrier, rate_20, rate_40, rate_40hc, transit in fcl_routes:
        rate_code = f"RATE-FCL-{origin}-{dest}"

        result = conn.execute(text(
            "SELECT id FROM fms_freight_rates WHERE tenant_id = :tenant_id AND rate_code = :code"
        ), {"tenant_id": TENANT_ID, "code": rate_code})
        if result.fetchone():
            continue

        conn.execute(text("""
            INSERT INTO fms_freight_rates (id, tenant_id, rate_code, rate_name, rate_type, carrier_name, origin_port, origin_port_name, destination_port, destination_port_name, transit_time_min, transit_time_max, currency_code, rate_20gp, rate_40gp, rate_40hc, effective_date, expiry_date, is_active, created_by, created_at)
            VALUES (:id, :tenant_id, :code, :name, 'SEA_FCL', :carrier, :origin, :origin_name, :dest, :dest_name, :transit_min, :transit_max, 'USD', :rate_20, :rate_40, :rate_40hc, :eff_date, :exp_date, true, :user_id, NOW())
        """), {
            "id": str(uuid.uuid4()),
            "tenant_id": TENANT_ID,
            "code": rate_code,
            "name": f"FCL {origin_name} - {dest_name}",
            "carrier": carrier,
            "origin": origin,
            "origin_name": origin_name,
            "dest": dest,
            "dest_name": dest_name,
            "transit_min": transit - 2,
            "transit_max": transit + 3,
            "rate_20": rate_20,
            "rate_40": rate_40,
            "rate_40hc": rate_40hc,
            "eff_date": today - timedelta(days=30),
            "exp_date": today + timedelta(days=60),
            "user_id": USER_ID,
        })
        count += 1

    # LCL rates
    lcl_routes = [
        ("CNSHA", "Shanghai", "VNCLI", "Cát Lái", 25, 25, 50),
        ("CNNBO", "Ningbo", "VNCLI", "Cát Lái", 23, 23, 50),
        ("SGSIN", "Singapore", "VNCLI", "Cát Lái", 18, 18, 40),
        ("HKHKG", "Hong Kong", "VNCLI", "Cát Lái", 20, 20, 45),
    ]

    for origin, origin_name, dest, dest_name, rate_cbm, rate_ton, min_charge in lcl_routes:
        rate_code = f"RATE-LCL-{origin}-{dest}"

        result = conn.execute(text(
            "SELECT id FROM fms_freight_rates WHERE tenant_id = :tenant_id AND rate_code = :code"
        ), {"tenant_id": TENANT_ID, "code": rate_code})
        if result.fetchone():
            continue

        conn.execute(text("""
            INSERT INTO fms_freight_rates (id, tenant_id, rate_code, rate_name, rate_type, origin_port, origin_port_name, destination_port, destination_port_name, transit_time_min, transit_time_max, currency_code, rate_per_cbm, rate_per_ton, min_charge, effective_date, expiry_date, is_active, created_by, created_at)
            VALUES (:id, :tenant_id, :code, :name, 'SEA_LCL', :origin, :origin_name, :dest, :dest_name, 10, 18, 'USD', :rate_cbm, :rate_ton, :min_charge, :eff_date, :exp_date, true, :user_id, NOW())
        """), {
            "id": str(uuid.uuid4()),
            "tenant_id": TENANT_ID,
            "code": rate_code,
            "name": f"LCL {origin_name} - {dest_name}",
            "origin": origin,
            "origin_name": origin_name,
            "dest": dest,
            "dest_name": dest_name,
            "rate_cbm": rate_cbm,
            "rate_ton": rate_ton,
            "min_charge": min_charge,
            "eff_date": today - timedelta(days=30),
            "exp_date": today + timedelta(days=60),
            "user_id": USER_ID,
        })
        count += 1

    # Air rates
    air_routes = [
        ("CNSHA", "Shanghai PVG", "VNSGN", "Tân Sơn Nhất", 3.5, 3.2, 2.8, 2.5, 2.2, 2.0),
        ("SGSIN", "Changi", "VNSGN", "Tân Sơn Nhất", 3.0, 2.8, 2.5, 2.2, 2.0, 1.8),
        ("HKHKG", "Hong Kong", "VNSGN", "Tân Sơn Nhất", 3.2, 3.0, 2.6, 2.3, 2.1, 1.9),
    ]

    for origin, origin_name, dest, dest_name, rate_min, rate_45, rate_100, rate_300, rate_500, rate_1000 in air_routes:
        rate_code = f"RATE-AIR-{origin}-{dest}"

        result = conn.execute(text(
            "SELECT id FROM fms_freight_rates WHERE tenant_id = :tenant_id AND rate_code = :code"
        ), {"tenant_id": TENANT_ID, "code": rate_code})
        if result.fetchone():
            continue

        conn.execute(text("""
            INSERT INTO fms_freight_rates (id, tenant_id, rate_code, rate_name, rate_type, origin_port, origin_port_name, destination_port, destination_port_name, transit_time_min, transit_time_max, currency_code, rate_min, rate_45kg, rate_100kg, rate_300kg, rate_500kg, rate_1000kg, effective_date, expiry_date, is_active, created_by, created_at)
            VALUES (:id, :tenant_id, :code, :name, 'AIR', :origin, :origin_name, :dest, :dest_name, 1, 3, 'USD', :rate_min, :rate_45, :rate_100, :rate_300, :rate_500, :rate_1000, :eff_date, :exp_date, true, :user_id, NOW())
        """), {
            "id": str(uuid.uuid4()),
            "tenant_id": TENANT_ID,
            "code": rate_code,
            "name": f"AIR {origin_name} - {dest_name}",
            "origin": origin,
            "origin_name": origin_name,
            "dest": dest,
            "dest_name": dest_name,
            "rate_min": rate_min,
            "rate_45": rate_45,
            "rate_100": rate_100,
            "rate_300": rate_300,
            "rate_500": rate_500,
            "rate_1000": rate_1000,
            "eff_date": today - timedelta(days=30),
            "exp_date": today + timedelta(days=60),
            "user_id": USER_ID,
        })
        count += 1

    return count

def main():
    with engine.connect() as conn:
        agents = seed_agents(conn)
        print(f"Created {agents} agents")

        rates = seed_freight_rates(conn)
        print(f"Created {rates} freight rates")

        conn.commit()
        print("Seed data completed!")

if __name__ == "__main__":
    main()

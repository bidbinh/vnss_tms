"""
Load Test cho TMS - Stress test 100,000+ đơn với 300+ users

Cài đặt: pip install locust

Chạy load test cơ bản:
  locust -f tests/load_test.py --host=http://localhost:8000

Chạy stress test (300 users, 3 phút):
  locust -f tests/load_test.py --host=http://localhost:8000 --headless -u 300 -r 30 -t 180s

Extreme stress test (500 users, 5 phút):
  locust -f tests/load_test.py --host=http://localhost:8000 --headless -u 500 -r 50 -t 300s

Mở browser: http://localhost:8089
- Users: 200-500 (số user đồng thời)
- Spawn rate: 30-50 (user/giây)
"""

from locust import HttpUser, task, between, events
import random
import string
import json
from datetime import datetime, timedelta

# Test data
EQUIPMENT_TYPES = ["20DC", "40DC", "40HC", "45HC", "20RF", "40RF"]
STATUSES = ["NEW", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "COMPLETED"]
LOCATIONS = [
    "Cảng Cát Lái", "Cảng VICT", "Cảng Tân Cảng", "Cảng Hiệp Phước",
    "ICD Phước Long", "ICD Tây Nam", "ICD Sóng Thần", "ICD Biên Hòa",
    "KCN Tân Bình", "KCN VSIP", "KCN Amata", "KCN Long Hậu",
]


def random_container_code():
    """Generate random container code like MSCU1234567"""
    prefix = random.choice(["MSCU", "CMAU", "HLCU", "OOLU", "EISU", "TCNU"])
    numbers = ''.join(random.choices(string.digits, k=7))
    return f"{prefix}{numbers}"


class TMSUser(HttpUser):
    """Simulates a dispatcher/operator user"""

    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks

    def on_start(self):
        """Login when user starts"""
        # Use test users created by seed script (100 tenants x 10 users = 1000 users)
        users = [
            f"load{t:02d}_user{u}"
            for t in range(1, 101)
            for u in range(1, 11)
        ]
        username = random.choice(users)

        # Auth endpoint uses form data, not JSON
        response = self.client.post("/api/v1/auth/login", data={
            "username": username,
            "password": "123456"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.tenant_id = data.get("tenant_id")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.logged_in = True
        else:
            self.token = None
            self.headers = {}
            self.logged_in = False

    # ============== READ OPERATIONS (70% of traffic) ==============

    @task(10)
    def list_orders(self):
        """Get list of orders - most common operation"""
        if not self.logged_in:
            return
        self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"limit": 50, "offset": 0}
        )

    @task(5)
    def list_orders_by_status(self):
        """Filter orders by status"""
        status = random.choice(STATUSES)
        self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"status": status, "limit": 50}
        )

    @task(3)
    def list_orders_by_date(self):
        """Filter orders by date range"""
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={
                "date_from": week_ago.isoformat(),
                "date_to": today.isoformat(),
                "limit": 100
            }
        )

    @task(5)
    def get_order_detail(self):
        """Get single order details"""
        if not self.logged_in:
            return
        # First get list to find an order ID
        response = self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"limit": 10}
        )
        if response.status_code == 200:
            data = response.json()
            # Handle both list and dict with "items" key
            orders = data.get("items", data) if isinstance(data, dict) else data
            if orders and isinstance(orders, list):
                order_id = random.choice(orders)["id"]
                self.client.get(
                    f"/api/v1/orders/{order_id}",
                    headers=self.headers
                )

    @task(3)
    def list_drivers(self):
        """Get list of drivers"""
        self.client.get(
            "/api/v1/drivers",
            headers=self.headers,
            params={"status": "ACTIVE"}
        )

    @task(3)
    def list_vehicles(self):
        """Get list of vehicles"""
        self.client.get(
            "/api/v1/vehicles",
            headers=self.headers,
            params={"status": "ACTIVE"}
        )

    @task(2)
    def list_customers(self):
        """Get list of customers"""
        self.client.get(
            "/api/v1/customers",
            headers=self.headers,
            params={"limit": 50}
        )

    @task(2)
    def list_sites(self):
        """Get list of sites/locations"""
        self.client.get(
            "/api/v1/sites",
            headers=self.headers
        )

    # ============== WRITE OPERATIONS (30% of traffic) ==============

    @task(3)
    def create_order(self):
        """Create new order - simulates 1000 orders/day"""
        order_data = {
            "order_code": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
            "customer_requested_date": datetime.now().date().isoformat(),
            "equipment": random.choice(EQUIPMENT_TYPES),
            "container_code": random_container_code(),
            "pickup_text": random.choice(LOCATIONS),
            "delivery_text": random.choice(LOCATIONS),
            "cargo_note": f"Test cargo {random.randint(1, 100)}",
            "qty": 1,
        }
        self.client.post(
            "/api/v1/orders",
            headers=self.headers,
            json=order_data
        )

    @task(2)
    def update_order_status(self):
        """Update order status"""
        if not self.logged_in:
            return
        # Get an order first
        response = self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"status": "NEW", "limit": 5}
        )
        if response.status_code == 200:
            data = response.json()
            orders = data.get("items", data) if isinstance(data, dict) else data
            if orders and isinstance(orders, list):
                order = random.choice(orders)
                new_status = "ASSIGNED"
                self.client.patch(
                    f"/api/v1/orders/{order['id']}",
                    headers=self.headers,
                    json={"status": new_status}
                )

    @task(2)
    def assign_driver(self):
        """Assign driver to order"""
        if not self.logged_in:
            return
        # Get orders and drivers
        orders_resp = self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"status": "NEW", "limit": 5}
        )
        drivers_resp = self.client.get(
            "/api/v1/drivers",
            headers=self.headers,
            params={"status": "ACTIVE", "limit": 10}
        )

        if orders_resp.status_code == 200 and drivers_resp.status_code == 200:
            orders_data = orders_resp.json()
            drivers_data = drivers_resp.json()
            orders = orders_data.get("items", orders_data) if isinstance(orders_data, dict) else orders_data
            drivers = drivers_data.get("items", drivers_data) if isinstance(drivers_data, dict) else drivers_data

            if orders and isinstance(orders, list) and drivers and isinstance(drivers, list):
                order = random.choice(orders)
                driver = random.choice(drivers)
                self.client.patch(
                    f"/api/v1/orders/{order['id']}",
                    headers=self.headers,
                    json={
                        "driver_id": driver["id"],
                        "status": "ASSIGNED"
                    }
                )


class WorkerUser(HttpUser):
    """Simulates a worker accessing workspace"""

    wait_time = between(2, 5)

    def on_start(self):
        """Login as worker"""
        response = self.client.post("/api/v1/worker/login", json={
            "login": "binhtran",
            "password": "123456"
        })
        if response.status_code == 200:
            self.logged_in = True
        else:
            self.logged_in = False

    @task(5)
    def get_aggregated_orders(self):
        """Worker gets orders from all tenants"""
        if not self.logged_in:
            return
        self.client.get("/api/v1/worker-tenant/aggregated/orders", params={"limit": 100})

    @task(3)
    def get_aggregated_drivers(self):
        """Worker gets drivers from all tenants"""
        if not self.logged_in:
            return
        self.client.get("/api/v1/worker-tenant/aggregated/drivers")

    @task(2)
    def get_my_connections(self):
        """Worker checks their network"""
        if not self.logged_in:
            return
        self.client.get("/api/v1/worker-connections/my-drivers")

    @task(2)
    def get_connection_stats(self):
        """Worker checks stats"""
        if not self.logged_in:
            return
        self.client.get("/api/v1/worker-connections/stats")


# Event hooks for logging
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        print(f"Request failed: {name} - {exception}")


if __name__ == "__main__":
    import os
    os.system("locust -f tests/load_test.py --host=http://localhost:8000")

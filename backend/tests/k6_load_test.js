/**
 * K6 Load Test cho TMS
 *
 * Cài đặt k6: https://k6.io/docs/getting-started/installation/
 *
 * Chạy test:
 *   k6 run tests/k6_load_test.js
 *
 * Với output đẹp:
 *   k6 run --out json=results.json tests/k6_load_test.js
 *
 * Scenarios:
 * - normal_load: 50 users, 5 phút (mô phỏng ngày bình thường)
 * - peak_load: 100 users, 2 phút (mô phỏng giờ cao điểm)
 * - stress_test: ramp up to 200 users (tìm giới hạn)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const orderCreated = new Counter('orders_created');
const ordersFetched = new Counter('orders_fetched');
const errorRate = new Rate('errors');
const orderListDuration = new Trend('order_list_duration');

// Config
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/v1`;

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Normal daily load
    normal_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '0s',
      tags: { scenario: 'normal' },
    },
    // Scenario 2: Peak hours (10 AM, 2 PM)
    peak_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      startTime: '5m',
      tags: { scenario: 'peak' },
    },
    // Scenario 3: Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '7m',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% requests < 500ms
    errors: ['rate<0.1'], // Error rate < 10%
    order_list_duration: ['p(95)<300'], // Order list should be fast
  },
};

// Test data generators
const EQUIPMENT_TYPES = ['20DC', '40DC', '40HC', '45HC', '20RF', '40RF'];
const STATUSES = ['NEW', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
const LOCATIONS = [
  'Cảng Cát Lái', 'Cảng VICT', 'Cảng Tân Cảng', 'Cảng Hiệp Phước',
  'ICD Phước Long', 'ICD Tây Nam', 'ICD Sóng Thần', 'ICD Biên Hòa',
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomContainerCode() {
  const prefixes = ['MSCU', 'CMAU', 'HLCU', 'OOLU', 'EISU'];
  const prefix = randomElement(prefixes);
  const numbers = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${numbers}`;
}

// Setup - login and get token
export function setup() {
  // Try admin login first
  let res = http.post(`${API_URL}/auth/login`, JSON.stringify({
    username: 'admin',
    password: 'admin123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (res.status === 200) {
    const data = res.json();
    return { token: data.access_token, type: 'admin' };
  }

  // Try worker login
  res = http.post(`${API_URL}/worker/login`, JSON.stringify({
    login: 'binhtran',
    password: '123456'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (res.status === 200) {
    const data = res.json();
    return { token: data.access_token, type: 'worker' };
  }

  return { token: null, type: null };
}

// Main test function
export default function (data) {
  const headers = data.token
    ? { 'Authorization': `Bearer ${data.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // Weighted random selection of actions
  const action = Math.random();

  if (action < 0.4) {
    // 40%: List orders (most common)
    listOrders(headers);
  } else if (action < 0.6) {
    // 20%: Get order details
    getOrderDetail(headers);
  } else if (action < 0.75) {
    // 15%: List drivers/vehicles
    listResources(headers);
  } else if (action < 0.9) {
    // 15%: Create order
    createOrder(headers);
  } else {
    // 10%: Update order
    updateOrder(headers);
  }

  sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
}

function listOrders(headers) {
  group('List Orders', function () {
    const start = Date.now();

    // Random filter
    const filters = [
      { limit: 50 },
      { limit: 50, status: randomElement(STATUSES) },
      { limit: 100, date_from: '2026-01-01' },
    ];
    const params = randomElement(filters);

    const res = http.get(`${API_URL}/orders`, { headers, params });

    orderListDuration.add(Date.now() - start);

    const success = check(res, {
      'list orders status 200': (r) => r.status === 200,
      'list orders has items': (r) => r.json().items !== undefined,
    });

    if (success) {
      ordersFetched.add(1);
    }
    errorRate.add(!success);
  });
}

function getOrderDetail(headers) {
  group('Get Order Detail', function () {
    // First get list
    const listRes = http.get(`${API_URL}/orders`, { headers, params: { limit: 10 } });

    if (listRes.status === 200) {
      const orders = listRes.json().items || [];
      if (orders.length > 0) {
        const orderId = randomElement(orders).id;
        const res = http.get(`${API_URL}/orders/${orderId}`, { headers });

        const success = check(res, {
          'get order status 200': (r) => r.status === 200,
        });
        errorRate.add(!success);
      }
    }
  });
}

function listResources(headers) {
  group('List Resources', function () {
    const resources = ['drivers', 'vehicles', 'customers', 'sites'];
    const resource = randomElement(resources);

    const res = http.get(`${API_URL}/${resource}`, { headers });

    const success = check(res, {
      [`list ${resource} status 200`]: (r) => r.status === 200,
    });
    errorRate.add(!success);
  });
}

function createOrder(headers) {
  group('Create Order', function () {
    const orderData = {
      order_code: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      customer_requested_date: new Date().toISOString().split('T')[0],
      equipment: randomElement(EQUIPMENT_TYPES),
      container_code: randomContainerCode(),
      pickup_text: randomElement(LOCATIONS),
      delivery_text: randomElement(LOCATIONS),
      cargo_note: `Test cargo ${Math.floor(Math.random() * 100)}`,
      qty: 1,
    };

    const res = http.post(`${API_URL}/orders`, JSON.stringify(orderData), { headers });

    const success = check(res, {
      'create order status 200/201': (r) => r.status === 200 || r.status === 201,
    });

    if (success) {
      orderCreated.add(1);
    }
    errorRate.add(!success);
  });
}

function updateOrder(headers) {
  group('Update Order', function () {
    // Get an order to update
    const listRes = http.get(`${API_URL}/orders`, {
      headers,
      params: { status: 'NEW', limit: 5 }
    });

    if (listRes.status === 200) {
      const orders = listRes.json().items || [];
      if (orders.length > 0) {
        const order = randomElement(orders);

        const res = http.patch(
          `${API_URL}/orders/${order.id}`,
          JSON.stringify({ status: 'ASSIGNED' }),
          { headers }
        );

        const success = check(res, {
          'update order status 200': (r) => r.status === 200,
        });
        errorRate.add(!success);
      }
    }
  });
}

// Summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;

  let summary = `
╔══════════════════════════════════════════════════════════════╗
║                    TMS LOAD TEST SUMMARY                      ║
╠══════════════════════════════════════════════════════════════╣
║ Total Requests:     ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:    ${metrics.http_req_failed?.values?.passes || 0}
║
║ Response Times:
║   - Average:        ${Math.round(metrics.http_req_duration?.values?.avg || 0)}ms
║   - P95:            ${Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0)}ms
║   - P99:            ${Math.round(metrics.http_req_duration?.values?.['p(99)'] || 0)}ms
║
║ Custom Metrics:
║   - Orders Created: ${metrics.orders_created?.values?.count || 0}
║   - Orders Fetched: ${metrics.orders_fetched?.values?.count || 0}
║   - Error Rate:     ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
║
║ Throughput:         ${Math.round(metrics.http_reqs?.values?.rate || 0)} req/s
╚══════════════════════════════════════════════════════════════╝
`;

  return summary;
}

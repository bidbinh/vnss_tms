/**
 * Unified Orders API Client
 *
 * Provides functions to interact with the Unified Orders API
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

// ============================================
// TYPES
// ============================================

export type OrderSourceType = "TENANT" | "DISPATCHER" | "MARKETPLACE";
export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "ON_HOLD";
export type PaymentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "REFUNDED";

export interface UnifiedOrder {
  id: string;
  source_type: OrderSourceType;
  owner_actor_id: string;
  order_code: string;
  external_code?: string;
  status: OrderStatus;

  // Customer
  customer_actor_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_company?: string;
  customer_email?: string;

  // Pickup
  pickup_location_id?: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_district?: string;
  pickup_contact?: string;
  pickup_phone?: string;
  pickup_time?: string;
  pickup_notes?: string;

  // Delivery
  delivery_location_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_district?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  delivery_time?: string;
  delivery_notes?: string;

  // Cargo
  equipment_type?: string;
  container_code?: string;
  seal_number?: string;
  cargo_description?: string;
  weight_kg?: number;
  cbm?: number;
  package_count?: number;
  commodity_type?: string;
  is_hazardous: boolean;
  temperature_required?: string;

  // Financials
  currency: string;
  freight_charge?: number;
  additional_charges?: number;
  total_charge?: number;
  driver_payment?: number;
  payment_status: PaymentStatus;
  driver_payment_status: PaymentStatus;
  amount_paid: number;

  // Assignment
  primary_driver_actor_id?: string;
  primary_vehicle_id?: string;

  // Timeline
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  accepted_at?: string;
  started_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;

  // Notes
  internal_notes?: string;
  driver_notes?: string;
  customer_notes?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface OrderCreate {
  source_type?: OrderSourceType;
  order_code?: string;
  external_code?: string;

  // Customer
  customer_actor_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_company?: string;
  customer_email?: string;

  // Pickup
  pickup_location_id?: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_district?: string;
  pickup_contact?: string;
  pickup_phone?: string;
  pickup_time?: string;
  pickup_notes?: string;

  // Delivery
  delivery_location_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_district?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  delivery_time?: string;
  delivery_notes?: string;

  // Cargo
  equipment_type?: string;
  container_code?: string;
  seal_number?: string;
  cargo_description?: string;
  weight_kg?: number;
  cbm?: number;
  package_count?: number;
  commodity_type?: string;
  is_hazardous?: boolean;
  temperature_required?: string;

  // Financials
  currency?: string;
  freight_charge?: number;
  additional_charges?: number;
  driver_payment?: number;

  // Notes
  internal_notes?: string;
  customer_notes?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface OrderUpdate extends Partial<OrderCreate> {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  driver_payment_status?: PaymentStatus;
  driver_notes?: string;
  primary_driver_actor_id?: string;
  primary_vehicle_id?: string;
}

export interface OrderAssignRequest {
  driver_actor_id: string;
  vehicle_id?: string;
  payment_amount?: number;
  segment_number?: number;
  segment_type?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  changed_by_actor_id?: string;
  changed_at: string;
  notes?: string;
}

// ============================================
// ORDER API FUNCTIONS
// ============================================

export async function listOrders(
  ownerActorId: string,
  params?: {
    source_type?: OrderSourceType;
    status?: string;
    driver_actor_id?: string;
    customer_name?: string;
    container_code?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<UnifiedOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.append("owner_actor_id", ownerActorId);
  if (params?.source_type)
    searchParams.append("source_type", params.source_type);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.driver_actor_id)
    searchParams.append("driver_actor_id", params.driver_actor_id);
  if (params?.customer_name)
    searchParams.append("customer_name", params.customer_name);
  if (params?.container_code)
    searchParams.append("container_code", params.container_code);
  if (params?.date_from) searchParams.append("date_from", params.date_from);
  if (params?.date_to) searchParams.append("date_to", params.date_to);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders?${searchParams}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function listOrdersAssignedToMe(
  driverActorId: string,
  status?: string
): Promise<UnifiedOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.append("driver_actor_id", driverActorId);
  if (status) searchParams.append("status", status);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/assigned-to-me?${searchParams}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch assigned orders");
  return res.json();
}

export async function getOrder(orderId: string): Promise<UnifiedOrder> {
  const res = await fetch(`${API_BASE}/api/v1/unified-orders/${orderId}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Order not found");
  return res.json();
}

export async function createOrder(
  ownerActorId: string,
  data: OrderCreate
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  searchParams.append("owner_actor_id", ownerActorId);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create order");
  }
  return res.json();
}

export async function updateOrder(
  orderId: string,
  data: OrderUpdate
): Promise<UnifiedOrder> {
  const res = await fetch(`${API_BASE}/api/v1/unified-orders/${orderId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update order");
  }
  return res.json();
}

export async function deleteOrder(orderId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/unified-orders/${orderId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to delete order");
}

// ============================================
// ASSIGNMENT FUNCTIONS
// ============================================

export async function assignOrder(
  orderId: string,
  data: OrderAssignRequest
): Promise<UnifiedOrder> {
  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/assign`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to assign order");
  }
  return res.json();
}

export async function unassignOrder(orderId: string): Promise<UnifiedOrder> {
  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/unassign`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to unassign order");
  }
  return res.json();
}

// ============================================
// STATUS WORKFLOW FUNCTIONS
// ============================================

export async function acceptOrder(
  orderId: string,
  driverActorId: string
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  searchParams.append("driver_actor_id", driverActorId);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/accept?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to accept order");
  }
  return res.json();
}

export async function startOrder(
  orderId: string,
  driverActorId: string
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  searchParams.append("driver_actor_id", driverActorId);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/start?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to start order");
  }
  return res.json();
}

export async function pickupOrder(
  orderId: string,
  driverActorId: string
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  searchParams.append("driver_actor_id", driverActorId);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/pickup?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark pickup");
  }
  return res.json();
}

export async function deliverOrder(
  orderId: string,
  driverActorId: string
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  searchParams.append("driver_actor_id", driverActorId);

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/deliver?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark delivery");
  }
  return res.json();
}

export async function completeOrder(orderId: string): Promise<UnifiedOrder> {
  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/complete`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to complete order");
  }
  return res.json();
}

// ============================================
// PAYMENT FUNCTIONS
// ============================================

export async function markDriverPaid(orderId: string): Promise<UnifiedOrder> {
  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/mark-paid`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark as paid");
  }
  return res.json();
}

export async function markCustomerPaid(
  orderId: string,
  amount?: number
): Promise<UnifiedOrder> {
  const searchParams = new URLSearchParams();
  if (amount) searchParams.append("amount", amount.toString());

  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/mark-customer-paid?${searchParams}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark customer as paid");
  }
  return res.json();
}

// ============================================
// HISTORY FUNCTIONS
// ============================================

export async function getOrderHistory(
  orderId: string
): Promise<OrderStatusHistory[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/unified-orders/${orderId}/history`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch order history");
  return res.json();
}

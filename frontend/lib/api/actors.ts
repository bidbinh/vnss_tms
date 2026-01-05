/**
 * Actor API Client
 *
 * Provides functions to interact with the Actor-Based API
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

// ============================================
// TYPES
// ============================================

export interface Actor {
  id: string;
  type: "PERSON" | "ORGANIZATION";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  code?: string;
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  country: string;
  tax_code?: string;
  business_type?: string;
  id_number?: string;
  date_of_birth?: string;
  gender?: string;
  created_at: string;
  updated_at: string;
}

export interface ActorCreate {
  type?: "PERSON" | "ORGANIZATION";
  name: string;
  code?: string;
  slug?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  tax_code?: string;
  business_type?: string;
  id_number?: string;
  date_of_birth?: string;
  gender?: string;
  metadata?: Record<string, unknown>;
}

export interface ActorUpdate extends Partial<ActorCreate> {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface ActorRelationship {
  id: string;
  actor_id: string;
  related_actor_id: string;
  type: string;
  role?: string;
  status: string;
  message?: string;
  total_orders_completed: number;
  total_amount_paid: number;
  total_amount_pending: number;
  rating?: number;
  created_at: string;
  updated_at: string;
  related_actor?: Actor;
}

export interface RelationshipCreate {
  related_actor_id: string;
  type: string;
  role?: string;
  message?: string;
  permissions?: Record<string, unknown>;
  payment_terms?: Record<string, unknown>;
}

export interface RelationshipUpdate {
  status?: string;
  role?: string;
  message?: string;
  permissions?: Record<string, unknown>;
  payment_terms?: Record<string, unknown>;
  decline_reason?: string;
}

// ============================================
// ACTOR API FUNCTIONS
// ============================================

export async function listActors(params?: {
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Actor[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append("type", params.type);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const res = await fetch(`${API_BASE}/api/v1/actors?${searchParams}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch actors");
  return res.json();
}

export async function getActor(actorId: string): Promise<Actor> {
  const res = await fetch(`${API_BASE}/api/v1/actors/${actorId}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Actor not found");
  return res.json();
}

export async function createActor(data: ActorCreate): Promise<Actor> {
  const res = await fetch(`${API_BASE}/api/v1/actors`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create actor");
  }
  return res.json();
}

export async function updateActor(
  actorId: string,
  data: ActorUpdate
): Promise<Actor> {
  const res = await fetch(`${API_BASE}/api/v1/actors/${actorId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update actor");
  }
  return res.json();
}

export async function deleteActor(actorId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/actors/${actorId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to delete actor");
}

// ============================================
// RELATIONSHIP API FUNCTIONS
// ============================================

export async function listActorRelationships(
  actorId: string,
  params?: {
    type?: string;
    role?: string;
    status?: string;
    direction?: "outgoing" | "incoming" | "both";
  }
): Promise<ActorRelationship[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append("type", params.type);
  if (params?.role) searchParams.append("role", params.role);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.direction) searchParams.append("direction", params.direction);

  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/relationships?${searchParams}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch relationships");
  return res.json();
}

export async function createRelationship(
  actorId: string,
  data: RelationshipCreate
): Promise<ActorRelationship> {
  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/relationships`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create relationship");
  }
  return res.json();
}

export async function updateRelationship(
  actorId: string,
  relationshipId: string,
  data: RelationshipUpdate
): Promise<ActorRelationship> {
  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/relationships/${relationshipId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update relationship");
  }
  return res.json();
}

export async function deleteRelationship(
  actorId: string,
  relationshipId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/relationships/${relationshipId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) throw new Error("Failed to delete relationship");
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function listEmployees(
  actorId: string,
  role?: string
): Promise<ActorRelationship[]> {
  const searchParams = new URLSearchParams();
  if (role) searchParams.append("role", role);

  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/employees?${searchParams}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
}

export async function listEmployers(
  actorId: string
): Promise<ActorRelationship[]> {
  const res = await fetch(`${API_BASE}/api/v1/actors/${actorId}/employers`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch employers");
  return res.json();
}

export async function listConnections(
  actorId: string,
  role?: string
): Promise<ActorRelationship[]> {
  const searchParams = new URLSearchParams();
  if (role) searchParams.append("role", role);

  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/connections?${searchParams}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch connections");
  return res.json();
}

export async function listPendingRequests(
  actorId: string
): Promise<ActorRelationship[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/actors/${actorId}/pending-requests`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch pending requests");
  return res.json();
}

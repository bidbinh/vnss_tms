"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Order = {
  id: string;
  order_code: string;
  customer_id: string;
  status: string;
  pickup_text: string | null;
  delivery_text: string | null;
  cargo_note: string | null;
  equipment: string | null;
  qty: number;
  container_code: string | null;
  driver_id: string | null;
  dispatcher_id: string | null;
  eta_pickup_at: string | null;
  eta_delivery_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
};

type User = {
  id: string;
  role: string;
  username: string;
};

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [user, setUser] = useState<User | null>(null);
  
  // Modal states
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Create form
  const [createRawText, setCreateRawText] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  
  // Detail form (for dispatcher/admin edits)
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDriver, setDetailDriver] = useState("");
  const [detailPickupEta, setDetailPickupEta] = useState("");
  const [detailDeliveryEta, setDetailDeliveryEta] = useState("");
  const [detailRejectReason, setDetailRejectReason] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Order[]>("/api/v1/orders");
      setOrders(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return orders;
    return orders.filter(o => 
      o.order_code.toLowerCase().includes(s) ||
      o.customer_id.toLowerCase().includes(s) ||
      o.status.toLowerCase().includes(s)
    );
  }, [orders, q]);

  async function handleCreateOrder() {
    if (!createRawText.trim()) {
      alert("Please paste order text");
      return;
    }

    // Simple parse: "02x20 CARGO; PICKUP - DELIVERY"
    const lines = createRawText.trim().split("\n");
    const ordersToCreate: any[] = [];

    for (const line of lines) {
      try {
        // Extract qty x size
        const qtyMatch = line.match(/(\d+)x(\d+)/);
        if (!qtyMatch) continue;

        const qty = parseInt(qtyMatch[1], 10);
        const equipment = qtyMatch[2];

        // Extract PICKUP - DELIVERY
        const locMatch = line.match(/(.+?)\s+-\s+(.+?)$/);
        if (!locMatch) continue;

        const pickup_text = locMatch[1].trim();
        const delivery_text = locMatch[2].trim();

        // Cargo note = everything before pickup
        const cargoMatch = line.substring(0, line.indexOf(locMatch[1])).trim();
        const cargo_note = cargoMatch || "";

        // Create N orders for quantity
        for (let i = 0; i < qty; i++) {
          ordersToCreate.push({
            customer_id: user?.id || "",
            pickup_text,
            delivery_text,
            equipment,
            qty: 1,
            cargo_note,
          });
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    }

    if (ordersToCreate.length === 0) {
      alert("Could not parse any orders");
      return;
    }

    setCreateSaving(true);
    try {
      let created = 0;
      for (const order of ordersToCreate) {
        try {
          await apiFetch("/api/v1/orders", {
            method: "POST",
            body: JSON.stringify(order),
          });
          created++;
        } catch (e) {
          console.error("Failed to create order:", e);
        }
      }
      alert(`Created ${created}/${ordersToCreate.length} orders`);
      setOpenCreateModal(false);
      setCreateRawText("");
      loadOrders();
    } catch (e: any) {
      alert("Create failed: " + (e?.message || "Unknown error"));
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleAcceptOrder() {
    if (!selectedOrder || !detailDriver || !detailPickupEta || !detailDeliveryEta) {
      alert("Please fill all required fields");
      return;
    }

    setDetailSaving(true);
    try {
      await apiFetch(`/api/v1/orders/${selectedOrder.id}/accept`, {
        method: "POST",
        body: JSON.stringify({
          driver_id: detailDriver,
          eta_pickup_at: detailPickupEta,
          eta_delivery_at: detailDeliveryEta,
        }),
      });
      alert("Order accepted and assigned");
      setOpenDetailModal(false);
      loadOrders();
    } catch (e: any) {
      alert("Accept failed: " + (e?.message || "Unknown error"));
    } finally {
      setDetailSaving(false);
    }
  }

  async function handleRejectOrder() {
    if (!selectedOrder || !detailRejectReason) {
      alert("Please provide rejection reason");
      return;
    }

    setDetailSaving(true);
    try {
      await apiFetch(`/api/v1/orders/${selectedOrder.id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          reject_reason: detailRejectReason,
        }),
      });
      alert("Order rejected");
      setOpenDetailModal(false);
      loadOrders();
    } catch (e: any) {
      alert("Reject failed: " + (e?.message || "Unknown error"));
    } finally {
      setDetailSaving(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-yellow-100 text-yellow-900",
      ACCEPTED: "bg-blue-100 text-blue-900",
      ASSIGNED: "bg-purple-100 text-purple-900",
      REJECTED: "bg-red-100 text-red-900",
      COMPLETED: "bg-green-100 text-green-900",
    };
    return colors[status] || "bg-gray-100";
  };

  const canCreateOrder = user?.role === "CUSTOMER" || user?.role === "ADMIN";
  const canDispatch = user?.role === "DISPATCHER" || user?.role === "ADMIN";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        {canCreateOrder && (
          <button
            onClick={() => setOpenCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Order
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-900 rounded">{error}</div>}

      <input
        type="text"
        placeholder="Search..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full mb-4 px-3 py-2 border rounded"
      />

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Order Code</th>
                <th className="border p-2 text-left">Customer</th>
                <th className="border p-2 text-left">Pickup → Delivery</th>
                <th className="border p-2 text-left">Equipment</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-semibold">{order.order_code}</td>
                  <td className="border p-2">{order.customer_id}</td>
                  <td className="border p-2 text-sm">
                    {order.pickup_text} → {order.delivery_text}
                  </td>
                  <td className="border p-2">{order.equipment ? `${order.equipment}'` : "-"}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailDriver(order.driver_id || "");
                        setDetailPickupEta(order.eta_pickup_at || "");
                        setDetailDeliveryEta(order.eta_delivery_at || "");
                        setDetailRejectReason("");
                        setOpenDetailModal(true);
                      }}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {openCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">New Order</h2>
            <textarea
              value={createRawText}
              onChange={(e) => setCreateRawText(e.target.value)}
              placeholder="Example: 02x20 CARGO; GREEN PORT - LIVABIN"
              className="w-full px-3 py-2 border rounded h-24 font-mono text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOpenCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={createSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createSaving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {openDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{selectedOrder.order_code}</h2>
            
            <div className="space-y-3 mb-4 text-sm">
              <div><strong>Status:</strong> <span className={`px-2 py-1 rounded ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span></div>
              <div><strong>Pickup:</strong> {selectedOrder.pickup_text}</div>
              <div><strong>Delivery:</strong> {selectedOrder.delivery_text}</div>
              <div><strong>Cargo:</strong> {selectedOrder.cargo_note || "-"}</div>
              <div><strong>Equipment:</strong> {selectedOrder.equipment ? `${selectedOrder.equipment}'` : "-"}</div>
            </div>

            {selectedOrder.status === "NEW" && canDispatch && (
              <>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Driver ID"
                    value={detailDriver}
                    onChange={(e) => setDetailDriver(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                  <input
                    type="datetime-local"
                    placeholder="ETA Pickup"
                    value={detailPickupEta}
                    onChange={(e) => setDetailPickupEta(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                  <input
                    type="datetime-local"
                    placeholder="ETA Delivery"
                    value={detailDeliveryEta}
                    onChange={(e) => setDetailDeliveryEta(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleAcceptOrder}
                    disabled={detailSaving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {detailSaving ? "..." : "Accept"}
                  </button>
                  <button
                    onClick={() => setDetailRejectReason("Reason...")}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}

            {detailRejectReason && (
              <div className="space-y-3 mb-4">
                <textarea
                  value={detailRejectReason}
                  onChange={(e) => setDetailRejectReason(e.target.value)}
                  placeholder="Reason for rejection"
                  className="w-full px-3 py-2 border rounded text-sm h-20"
                />
                <button
                  onClick={handleRejectOrder}
                  disabled={detailSaving}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {detailSaving ? "..." : "Confirm Rejection"}
                </button>
              </div>
            )}

            <button
              onClick={() => setOpenDetailModal(false)}
              className="w-full px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { apiFetch, getToken } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_id?: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Order {
  id: string;
  order_code: string;
  customer_id: string;
  status: string;
  pickup_text?: string;
  delivery_text?: string;
  pickup_location_id?: string;
  delivery_location_id?: string;
  equipment?: string;
  qty: number;
  cargo_note?: string;
  container_code?: string;
  driver_id?: string;
  eta_pickup_at?: string;
  eta_delivery_at?: string;
  created_at: string;
}

export default function OrdersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = getToken();
    const user = localStorage.getItem("user");
    setToken(t);
    if (user) {
      const userData = JSON.parse(user);
      setRole(userData.role);
    }
  }, []);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [formData, setFormData] = useState({
    customer_id: "",
    pickup_location_id: "",
    delivery_location_id: "",
    equipment: "20",
    qty: 1,
    cargo_note: "",
    container_code: "",
  });

  const [assignData, setAssignData] = useState({
    driver_id: "",
    eta_pickup_date: "",
    eta_pickup_shift: "morning",
    eta_delivery_date: "",
    eta_delivery_shift: "morning",
  });

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchCustomers();
      fetchDrivers();
      fetchLocations();
    }
  }, [token]);

  const fetchOrders = async () => {
    try {
      const data = await apiFetch<Order[]>("/orders");
      setOrders(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiFetch<Customer[]>("/customers");
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await apiFetch<Location[]>("/locations");
      setLocations(data);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setShowCreateModal(false);
      setFormData({
        customer_id: "",
        pickup_location_id: "",
        delivery_location_id: "",
        equipment: "20",
        qty: 1,
        cargo_note: "",
        container_code: "",
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Convert date + shift to datetime
    const shiftTimes: Record<string, string> = {
      morning: "08:00:00",
      afternoon: "13:00:00",
      evening: "18:00:00",
    };

    const payload = {
      driver_id: assignData.driver_id,
      eta_pickup_at: assignData.eta_pickup_date
        ? `${assignData.eta_pickup_date}T${shiftTimes[assignData.eta_pickup_shift]}`
        : undefined,
      eta_delivery_at: assignData.eta_delivery_date
        ? `${assignData.eta_delivery_date}T${shiftTimes[assignData.eta_delivery_shift]}`
        : undefined,
    };

    try {
      await apiFetch(`/orders/${selectedOrder.id}/accept`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowAssignModal(false);
      setSelectedOrder(null);
      setAssignData({
        driver_id: "",
        eta_pickup_date: "",
        eta_pickup_shift: "morning",
        eta_delivery_date: "",
        eta_delivery_shift: "morning",
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleCancelOrder = async (order: Order) => {
    const reason = prompt("Lý do huỷ order:");
    if (!reason) return;

    try {
      await apiFetch(`/orders/${order.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleWorkflowAction = async (orderId: string, action: string) => {
    try {
      await apiFetch(`/orders/${orderId}/${action}`, {
        method: "POST",
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "—";
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "—";
  };

  const getLocationCode = (locationId?: string) => {
    if (!locationId) return "—";
    const location = locations.find((l) => l.id === locationId);
    return location?.code || "—";
  };

  const formatETA = (eta?: string) => {
    if (!eta) return "—";
    const date = new Date(eta);
    const day = date.toLocaleDateString("vi-VN");
    const hour = date.getHours();
    let shift = "Sáng";
    if (hour >= 13 && hour < 18) shift = "Chiều";
    else if (hour >= 18) shift = "Tối";
    return `${day} ${shift}`;
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-xs text-gray-500">Role: {role || "loading..."}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Order
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Driver
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pickup → Delivery
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Container Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ETA Pickup
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ETA Delivery
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{order.order_code}</td>
                  <td className="px-4 py-3 text-sm">
                    {getDriverName(order.driver_id)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getLocationCode(order.pickup_location_id)} → {getLocationCode(order.delivery_location_id)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.qty}x{order.equipment || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatETA(order.eta_pickup_at)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatETA(order.eta_delivery_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        order.status === "NEW"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "ASSIGNED"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.status === "NEW" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAssignModal(order)}
                          className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {order.status === "ASSIGNED" && (
                      <button
                        onClick={() => handleWorkflowAction(order.id, "pickup")}
                        className="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Đang nhận hàng
                      </button>
                    )}
                    {order.status === "IN_TRANSIT" && (
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => handleWorkflowAction(order.id, "delivering")}
                          className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Đang giao
                        </button>
                        <button
                          onClick={() => handleWorkflowAction(order.id, "delivered")}
                          className="text-sm px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          Đã giao/Chưa trả vỏ
                        </button>
                      </div>
                    )}
                    {order.status === "DELIVERED" && (
                      <button
                        onClick={() => handleWorkflowAction(order.id, "complete")}
                        className="text-sm px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Hoàn thành
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create New Order</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Customer *
                  </label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_id: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pickup Location *
                    </label>
                    <select
                      required
                      value={formData.pickup_location_id}
                      onChange={(e) =>
                        setFormData({ ...formData, pickup_location_id: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} - {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Delivery Location *
                    </label>
                    <select
                      required
                      value={formData.delivery_location_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          delivery_location_id: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} - {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Container Type *
                    </label>
                    <select
                      required
                      value={formData.equipment}
                      onChange={(e) =>
                        setFormData({ ...formData, equipment: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="20">20ft</option>
                      <option value="40">40ft</option>
                      <option value="45">45ft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantity *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.qty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qty: parseInt(e.target.value),
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Container Code
                  </label>
                  <input
                    type="text"
                    value={formData.container_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        container_code: e.target.value,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., TCLU1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cargo Note
                  </label>
                  <textarea
                    value={formData.cargo_note}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo_note: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="e.g., Hàng dễ vỡ, xếp cẩn thận"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Assign Driver</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Order: <strong>{selectedOrder.order_code}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Route: {selectedOrder.pickup_text} → {selectedOrder.delivery_text}
                </p>
              </div>

              <form onSubmit={handleAssignDriver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Driver *
                  </label>
                  <select
                    required
                    value={assignData.driver_id}
                    onChange={(e) =>
                      setAssignData({ ...assignData, driver_id: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    ETA Pickup
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_pickup_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_date: e.target.value,
                        })
                      }
                      className="border rounded px-3 py-2"
                    />
                    <select
                      value={assignData.eta_pickup_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_shift: e.target.value,
                        })
                      }
                      className="border rounded px-3 py-2"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    ETA Delivery
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_delivery_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_date: e.target.value,
                        })
                      }
                      className="border rounded px-3 py-2"
                    />
                    <select
                      value={assignData.eta_delivery_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_shift: e.target.value,
                        })
                      }
                      className="border rounded px-3 py-2"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Assign Driver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

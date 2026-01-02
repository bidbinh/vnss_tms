"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Container = {
  id: string;
  container_no: string;
  size: string;
  type: string;
  seal_no?: string | null;
  status: string;
};

type Stop = {
  id: string;
  location_id?: string | null;
  stop_type: string;
  planned_time?: string | null;
  actual_time?: string | null;
  status: string;
};

type ShipmentDetail = {
  id: string;
  tenant_id: string;
  order_id: string;
  booking_no?: string | null;
  bl_no?: string | null;
  vessel?: string | null;
  from_port: boolean;
  requires_empty_return: boolean;
  free_time_days?: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  containers?: Container[];
  stops?: Stop[];
};

type Shipment = {
  id: string;
  tenant_id: string;
  order_id: string;
  booking_no?: string | null;
  bl_no?: string | null;
  vessel?: string | null;
  from_port: boolean;
  requires_empty_return: boolean;
  free_time_days?: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

type Order = {
  id: string;
  order_code: string;
};

export default function ShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // create modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDetail | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function loadOrders() {
    try {
      const data = await apiFetch<Order[]>("/api/v1/ops/orders");
      setOrders(data);
    } catch (e: any) {
      console.error("Failed to load orders:", e);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Shipment[]>("/api/v1/ops/shipments");
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const s = debouncedQ.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const id = (r.id || "").toLowerCase();
      const order = (r.order_id || "").toLowerCase();
      const booking = (r.booking_no || "").toLowerCase();
      const bl = (r.bl_no || "").toLowerCase();
      return id.includes(s) || order.includes(s) || booking.includes(s) || bl.includes(s);
    });
  }, [rows, debouncedQ]);

  async function openDetail(shipmentId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ShipmentDetail>(`/api/v1/ops/shipments/${shipmentId}`);
      setSelectedShipment(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load shipment details");
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreate() {
    setRawText("");
    setOpen(true);
  }

  async function handleCreate() {
    if (!rawText.trim()) {
      alert("Please enter shipment data");
      return;
    }

    // Parse: ORDER_CODE BOOKING_NO BL_NO VESSEL [from_port] [requires_empty_return] [free_time_days]
    const parts = rawText.trim().split(/\s+/);
    if (parts.length < 2) {
      alert("Format: ORDER_CODE BOOKING_NO [BL_NO] [VESSEL] [from_port] [requires_empty_return] [free_time]");
      return;
    }

    const orderCode = parts[0];
    const bookingNo = parts[1];
    const blNo = parts[2] || "";
    const vessel = parts[3] || "";
    const fromPort = (parts[4] || "false").toLowerCase() === "true";
    const requiresEmptyReturn = (parts[5] || "false").toLowerCase() === "true";
    const freeTimeDays = parts[6] ? parseInt(parts[6], 10) : 0;

    // Find order by code
    const order = orders.find(o => o.order_code === orderCode);
    if (!order) {
      alert(`Order code "${orderCode}" not found`);
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/v1/ops/shipments", {
        method: "POST",
        body: JSON.stringify({
          order_id: order.id,
          booking_no: bookingNo,
          bl_no: blNo || null,
          vessel: vessel || null,
          from_port: fromPort,
          requires_empty_return: requiresEmptyReturn,
          free_time_days: freeTimeDays || null,
        }),
      });
      setRows([...rows]);
      setOpen(false);
      alert("Shipment created successfully");
      load();
    } catch (e: any) {
      alert("Create failed: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  const colors: { [key: string]: string } = {
    draft: "bg-gray-100 text-gray-900",
    booked: "bg-blue-100 text-blue-900",
    shipped: "bg-green-100 text-green-900",
    delivered: "bg-emerald-100 text-emerald-900",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Shipments</h1>
          <p className="text-sm text-gray-500">Quản lý shipments, containers & stops</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium"
        >
          + New Shipment
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by booking/BL/order..."
          className="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
        />
        <div className="text-sm text-gray-500">
          {loading ? "Loading..." : `${filteredRows.length} rows`}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {String(error)}
        </div>
      ) : null}

      <div className="overflow-auto max-h-[calc(100vh-220px)] rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3">Booking No</th>
              <th className="text-left px-4 py-3">BL No</th>
              <th className="text-left px-4 py-3">Vessel</th>
              <th className="text-left px-4 py-3">From Port</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={6}>
                  No data
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{row.booking_no || "-"}</td>
                  <td className="px-4 py-3">{row.bl_no || "-"}</td>
                  <td className="px-4 py-3">{row.vessel || "-"}</td>
                  <td className="px-4 py-3">{row.from_port ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        colors[row.status.toLowerCase()] || "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDetail(row.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {open ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">New Shipment</div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Shipment Data *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Format: ORDER_CODE BOOKING_NO [BL_NO] [VESSEL] [from_port] [requires_empty_return] [free_time]
                </p>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="TH-ADG-2512-001 BK123456 BL987654 MAERSK true false 14"
                  className="w-full min-h-20 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200 font-mono text-sm"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail Modal */}
      {detailOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-sm border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <div className="font-semibold">
                Shipment: {selectedShipment?.booking_no || "Loading..."}
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">Loading details...</div>
            ) : selectedShipment ? (
              <div className="p-5 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-600">Booking No</label>
                    <div className="font-medium">{selectedShipment.booking_no || "-"}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">BL No</label>
                    <div className="font-medium">{selectedShipment.bl_no || "-"}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Vessel</label>
                    <div className="font-medium">{selectedShipment.vessel || "-"}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Status</label>
                    <div>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          colors[selectedShipment.status.toLowerCase()] ||
                          "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {selectedShipment.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">From Port</label>
                    <div className="font-medium">{selectedShipment.from_port ? "Yes" : "No"}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Requires Empty Return</label>
                    <div className="font-medium">
                      {selectedShipment.requires_empty_return ? "Yes" : "No"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Free Time (days)</label>
                    <div className="font-medium">{selectedShipment.free_time_days || "-"}</div>
                  </div>
                </div>

                {/* Containers */}
                <div>
                  <h3 className="font-semibold mb-2">Containers</h3>
                  {selectedShipment.containers && selectedShipment.containers.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-bold">
                          <tr>
                            <th className="text-left px-3 py-2">Container No</th>
                            <th className="text-left px-3 py-2">Size</th>
                            <th className="text-left px-3 py-2">Type</th>
                            <th className="text-left px-3 py-2">Seal No</th>
                            <th className="text-left px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedShipment.containers.map((c) => (
                            <tr key={c.id} className="border-t">
                              <td className="px-3 py-2 font-medium">{c.container_no}</td>
                              <td className="px-3 py-2">{c.size}</td>
                              <td className="px-3 py-2">{c.type}</td>
                              <td className="px-3 py-2">{c.seal_no || "-"}</td>
                              <td className="px-3 py-2">{c.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-3 border rounded-xl">
                      No containers
                    </div>
                  )}
                </div>

                {/* Stops */}
                <div>
                  <h3 className="font-semibold mb-2">Stops</h3>
                  {selectedShipment.stops && selectedShipment.stops.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-bold">
                          <tr>
                            <th className="text-left px-3 py-2">Type</th>
                            <th className="text-left px-3 py-2">Location ID</th>
                            <th className="text-left px-3 py-2">Planned Time</th>
                            <th className="text-left px-3 py-2">Actual Time</th>
                            <th className="text-left px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedShipment.stops.map((s) => (
                            <tr key={s.id} className="border-t">
                              <td className="px-3 py-2 font-medium">{s.stop_type}</td>
                              <td className="px-3 py-2">{s.location_id || "-"}</td>
                              <td className="px-3 py-2">
                                {s.planned_time
                                  ? new Date(s.planned_time).toLocaleString("vi-VN")
                                  : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {s.actual_time
                                  ? new Date(s.actual_time).toLocaleString("vi-VN")
                                  : "-"}
                              </td>
                              <td className="px-3 py-2">{s.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-3 border rounded-xl">
                      No stops
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-red-500">Failed to load shipment details</div>
            )}

            <div className="px-5 py-4 border-t flex items-center justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => setDetailOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

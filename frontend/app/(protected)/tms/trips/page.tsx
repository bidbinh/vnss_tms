"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Vehicle = {
  id: string;
  plate_no: string;
  type: string;
  status: string;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  status: string;
};

type Trip = {
  id: string;
  tenant_id: string;

  shipment_id: string;

  vehicle_id?: string | null;
  driver_id?: string | null;
  trailer_id?: string | null;

  trip_type: string; // IMPORT/EXPORT/ROUNDTRIP
  status: string; // DRAFT/DISPATCHED/...

  dispatched_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;

  route_code?: string | null;
  distance_km?: number | null;

  created_at?: string;
  updated_at?: string;
};

type TripForm = {
  shipment_id: string;
  trip_type: string;
  route_code?: string;
  distance_km?: string; // input text
};

type TripAssignForm = {
  vehicle_id: string;
  driver_id: string;
  trailer_id?: string;
};

export default function TripsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // modal create
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TripForm>({
    shipment_id: "",
    trip_type: "IMPORT",
    route_code: "",
    distance_km: "",
  });

  // modal assign vehicle/driver
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignForm, setAssignForm] = useState<TripAssignForm>({
    vehicle_id: "",
    driver_id: "",
    trailer_id: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Trip[]>("/api/v1/trips");
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadVehiclesAndDrivers() {
    try {
      const [vehiclesData, driversData] = await Promise.all([
        apiFetch<Vehicle[]>("/api/v1/vehicles"),
        apiFetch<Driver[]>("/api/v1/drivers"),
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (e: any) {
      console.error("Failed to load vehicles/drivers:", e);
    }
  }

  useEffect(() => {
    load();
    loadVehiclesAndDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const s = debouncedQ.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const id = (r.id || "").toLowerCase();
      const shipment = (r.shipment_id || "").toLowerCase();
      const type = (r.trip_type || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      const route = (r.route_code || "").toLowerCase();
      return (
        id.includes(s) ||
        shipment.includes(s) ||
        type.includes(s) ||
        status.includes(s) ||
        route.includes(s)
      );
    });
  }, [rows, debouncedQ]);

  const filteredCount = useMemo(() => filteredRows.length, [filteredRows]);

  function openCreate() {
    setError(null);
    setForm({
      shipment_id: "",
      trip_type: "IMPORT",
      route_code: "",
      distance_km: "",
    });
    setOpen(true);
  }

  async function onCreate() {
    setSaving(true);
    setError(null);
    try {
      if (!form.shipment_id.trim()) throw new Error("shipment_id là bắt buộc.");

      const km = form.distance_km?.trim() ? Number(form.distance_km.trim()) : null;
      if (km != null && Number.isNaN(km)) throw new Error("distance_km không hợp lệ");

      const payload: any = {
        shipment_id: form.shipment_id.trim(),
        trip_type: (form.trip_type || "IMPORT").trim(),
        route_code: form.route_code?.trim() ? form.route_code.trim() : null,
        distance_km: km,
      };

      await apiFetch<Trip>("/api/v1/trips", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  function openAssign(trip: Trip) {
    setSelectedTrip(trip);
    setAssignForm({
      vehicle_id: trip.vehicle_id || "",
      driver_id: trip.driver_id || "",
      trailer_id: trip.trailer_id || "",
    });
    setAssignOpen(true);
  }

  async function onAssign() {
    if (!selectedTrip) return;
    setAssignSaving(true);
    setError(null);

    try {
      const payload: any = {
        vehicle_id: assignForm.vehicle_id.trim() || null,
        driver_id: assignForm.driver_id.trim() || null,
        trailer_id: assignForm.trailer_id?.trim() || null,
      };

      await apiFetch(`/api/v1/trips/${selectedTrip.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setAssignOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Assign failed");
    } finally {
      setAssignSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trips</h1>
          <p className="text-sm text-gray-500">Danh sách chuyến (assign stops, xe/tài)</p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium"
        >
          + New Trip
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by trip/shipment/type/status/route..."
          className="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
        />
        <div className="text-sm text-gray-500">
          {loading ? "Loading..." : `${filteredCount} rows`}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {String(error)}
        </div>
      ) : null}

      <div className="overflow-auto max-h-[calc(100vh-220px)] rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Trip</th>
              <th className="text-left px-4 py-3 font-bold">Shipment</th>
              <th className="text-left px-4 py-3 font-bold">Type</th>
              <th className="text-left px-4 py-3 font-bold">Vehicle/Driver</th>
              <th className="text-left px-4 py-3 font-bold">Status</th>
              <th className="text-right px-4 py-3 font-bold">Actions</th>
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
              filteredRows.map((r) => {
                const vehicle = vehicles.find((v) => v.id === r.vehicle_id);
                const driver = drivers.find((d) => d.id === r.driver_id);

                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      <span title={r.id}>{r.id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">
                      <span title={r.shipment_id}>{r.shipment_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">{r.trip_type}</td>
                    <td className="px-4 py-3 text-sm">
                      {vehicle || driver ? (
                        <>
                          {vehicle ? <div>{vehicle.plate_no}</div> : null}
                          {driver ? <div className="text-gray-600">{driver.name}</div> : null}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAssign(r)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                        >
                          Assign V/D
                        </button>
                        <Link
                          href={`/trips/${r.id}/assign`}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 inline-block"
                        >
                          Shipments
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {open ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">New Trip</div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-600">Shipment ID *</label>
                <input
                  value={form.shipment_id}
                  onChange={(e) => setForm((s) => ({ ...s, shipment_id: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="paste shipment_id..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Trip type</label>
                  <select
                    value={form.trip_type}
                    onChange={(e) => setForm((s) => ({ ...s, trip_type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="IMPORT">IMPORT</option>
                    <option value="EXPORT">EXPORT</option>
                    <option value="ROUNDTRIP">ROUNDTRIP</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-600">Route code</label>
                  <input
                    value={form.route_code}
                    onChange={(e) => setForm((s) => ({ ...s, route_code: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="HP-HY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600">Distance (km)</label>
                <input
                  value={form.distance_km}
                  onChange={(e) => setForm((s) => ({ ...s, distance_km: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="120"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {String(error)}
                </div>
              ) : null}
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={saving}
                className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Assign Vehicle/Driver Modal */}
      {assignOpen && selectedTrip ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">Assign Vehicle & Driver</div>
              <button
                onClick={() => setAssignOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-600">
                Trip: <span className="font-mono">{selectedTrip.id.slice(0, 16)}...</span>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Vehicle</label>
                <select
                  value={assignForm.vehicle_id}
                  onChange={(e) =>
                    setAssignForm((s) => ({ ...s, vehicle_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="">-- Select vehicle --</option>
                  {vehicles
                    .filter((v) => v.status === "ACTIVE")
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_no} ({v.type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Driver</label>
                <select
                  value={assignForm.driver_id}
                  onChange={(e) =>
                    setAssignForm((s) => ({ ...s, driver_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="">-- Select driver --</option>
                  {drivers
                    .filter((d) => d.status === "ACTIVE")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Trailer (optional)</label>
                <input
                  value={assignForm.trailer_id}
                  onChange={(e) =>
                    setAssignForm((s) => ({ ...s, trailer_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Trailer ID or plate"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {String(error)}
                </div>
              ) : null}
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => setAssignOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onAssign}
                disabled={assignSaving}
                className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {assignSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

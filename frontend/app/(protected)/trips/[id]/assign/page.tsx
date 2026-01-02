"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Shipment = {
  id: string;
  tenant_id: string;
  code?: string | null;
  customer_id?: string | null;
  status?: string | null;
  pickup_location_id?: string | null;
  delivery_location_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TripShipment = {
  id: string;
  tenant_id: string;
  trip_id: string;
  shipment_id: string;
  seq: number;
  created_at?: string;
  updated_at?: string;
};

type SetTripShipmentsPayload = {
  items: { shipment_id: string; seq: number }[];
};

function safeUuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export default function TripAssignShipmentsPage() {
  const params = useParams<{ id: string }>();
  const tripId = params?.id ? String(params.id) : "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [assigned, setAssigned] = useState<TripShipment[]>([]);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const assignedIds = useMemo(() => new Set(assigned.map((x) => x.shipment_id)), [assigned]);

  const shipmentById = useMemo(() => {
    const m = new Map<string, Shipment>();
    for (const s of allShipments) m.set(s.id, s);
    return m;
  }, [allShipments]);

  const filteredShipments = useMemo(() => {
    const s = debouncedQ.toLowerCase();
    if (!s) return allShipments;
    return allShipments.filter((x) => {
      const code = (x.code || "").toLowerCase();
      const id = (x.id || "").toLowerCase();
      const status = (x.status || "").toLowerCase();
      return code.includes(s) || id.includes(s) || status.includes(s);
    });
  }, [allShipments, debouncedQ]);

  function normalizeSeq(items: TripShipment[]) {
    const sorted = [...items].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    return sorted.map((x, i) => ({ ...x, seq: i + 1 }));
  }

  function nextSeq(current: TripShipment[]) {
    if (current.length === 0) return 1;
    return Math.max(...current.map((x) => x.seq || 0)) + 1;
  }

  async function load() {
    if (!tripId) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ apiFetch tự gắn /api/v1 rồi => chỉ truyền "/shipments", "/trips/..."
      const [shipments, tripShipments] = await Promise.all([
        apiFetch<Shipment[]>("/shipments"),
        apiFetch<TripShipment[]>(`/trips/${tripId}/shipments`),
      ]);

      const sorted = [...tripShipments].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

      setAllShipments(shipments);
      setAssigned(sorted);

      const assignedSet = new Set(sorted.map((x) => x.shipment_id));
      const firstUnassigned = shipments.find((s) => !assignedSet.has(s.id));
      setSelectedShipmentId(firstUnassigned?.id || "");
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  function addSelected() {
    setError(null);

    const id = selectedShipmentId;
    if (!id) return;

    if (assignedIds.has(id)) {
      setError("Shipment này đã được gán trong trip.");
      return;
    }

    setAssigned((prev) => {
      const seq = nextSeq(prev);
      return [
        ...prev,
        {
          id: `tmp-${safeUuid()}`,
          tenant_id: "",
          trip_id: tripId,
          shipment_id: id,
          seq,
        },
      ];
    });
  }

  function removeShipment(shipmentId: string) {
    setAssigned((prev) => prev.filter((x) => x.shipment_id !== shipmentId));
  }

  function moveUp(index: number) {
    setAssigned((prev) => {
      const a = normalizeSeq(prev);
      if (index <= 0) return a;

      const cur = { ...a[index] };
      const above = { ...a[index - 1] };

      a[index] = { ...cur, seq: above.seq };
      a[index - 1] = { ...above, seq: cur.seq };

      return normalizeSeq(a);
    });
  }

  function moveDown(index: number) {
    setAssigned((prev) => {
      const a = normalizeSeq(prev);
      if (index >= a.length - 1) return a;

      const cur = { ...a[index] };
      const below = { ...a[index + 1] };

      a[index] = { ...cur, seq: below.seq };
      a[index + 1] = { ...below, seq: cur.seq };

      return normalizeSeq(a);
    });
  }

  async function onSave() {
    if (!tripId) return;

    setSaving(true);
    setError(null);

    try {
      const normalized = normalizeSeq(assigned);

      const payload: SetTripShipmentsPayload = {
        items: normalized.map((x) => ({ shipment_id: x.shipment_id, seq: x.seq })),
      };

      // ✅ apiFetch tự gắn /api/v1 rồi
      await apiFetch(`/trips/${tripId}/shipments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Assign Shipments</h1>
          <p className="text-sm text-gray-500">
            Trip: <span className="font-mono">{tripId || "-"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/trips")}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
          >
            Back
          </button>

          <button
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {String(error)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">All Shipments</div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading..." : `${filteredShipments.length} rows`}
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shipments by code/id/status..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
          />

          <div className="flex items-center gap-2">
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">-- Select shipment --</option>
              {filteredShipments.map((s) => {
                const label = `${s.code || s.id.slice(0, 8)}…${s.status ? ` • ${s.status}` : ""}`;
                const isAssigned = assignedIds.has(s.id);

                return (
                  <option key={s.id} value={s.id} disabled={isAssigned}>
                    {isAssigned ? `✅ ${label}` : label}
                  </option>
                );
              })}
            </select>

            <button
              onClick={addSelected}
              disabled={!selectedShipmentId || assignedIds.has(selectedShipmentId)}
              className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Add
            </button>
          </div>

          <div className="text-xs text-gray-500">Tip: shipment đã gán sẽ có dấu ✅ trong dropdown.</div>
        </div>

        {/* Right */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Assigned to this Trip</div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading..." : `${assigned.length} items`}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">Seq</th>
                  <th className="text-left px-3 py-2">Shipment</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {assigned.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={3}>
                      No assigned shipments
                    </td>
                  </tr>
                ) : (
                  normalizeSeq(assigned).map((x, idx) => {
                    const s = shipmentById.get(x.shipment_id);
                    const shipmentLabel = s
                      ? `${s.code || s.id.slice(0, 8)}…${s.status ? ` • ${s.status}` : ""}`
                      : x.shipment_id;

                    return (
                      <tr key={x.shipment_id} className="border-t">
                        <td className="px-3 py-2 font-medium w-16">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{shipmentLabel}</div>
                          <div className="text-xs text-gray-500 font-mono">{x.shipment_id}</div>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => moveUp(idx)}
                              disabled={idx === 0}
                              className="rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                              title="Move up"
                            >
                              ↑
                            </button>

                            <button
                              onClick={() => moveDown(idx)}
                              disabled={idx === assigned.length - 1}
                              className="rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                              title="Move down"
                            >
                              ↓
                            </button>

                            <button
                              onClick={() => removeShipment(x.shipment_id)}
                              className="rounded-lg border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                              title="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500">
            Reorder bằng ↑ ↓. Bấm <span className="font-semibold">Save</span> để ghi xuống backend.
          </div>
        </div>
      </div>
    </div>
  );
}

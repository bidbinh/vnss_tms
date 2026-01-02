'use client';
import { useEffect, useState } from 'react';

type Trip = { id: string; status: string };

export default function Dispatch() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [id, setId] = useState('');
  const [status, setStatus] = useState<'ASSIGNED' | 'IN_PROGRESS' | 'DONE'>('ASSIGNED');

  const API = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000') + '/api/v1';

  const load = async () => {
    const res = await fetch(API + '/trips', { cache: 'no-store' });
    const data = await res.json();
    setTrips(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const rid = id.trim();
    if (!rid) return;
    await fetch(API + '/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rid, status }),
    });
    setId(''); setStatus('ASSIGNED'); load();
  };

  // ---- NEW: log event helper
  const logEvent = async (tripId: string, eventType: string) => {
    const note = window.prompt(`Note cho ${eventType} (có thể bỏ trống):`) || undefined;
    await fetch(`${API}/trips/${encodeURIComponent(tripId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, note }),
    }).then(async r => {
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert('Gửi event lỗi: ' + (j.detail || r.statusText));
        return;
      }
      alert(`Đã log ${eventType} cho ${tripId}`);
    }).catch(err => alert('Network error: ' + err));
  };

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dispatch Board</h1>

      {/* Form tạo trip */}
      <div className="border p-4 rounded-md w-full max-w-2xl">
        <h2 className="font-semibold mb-2">Create Trip</h2>
        <div className="flex gap-2">
          <input
            className="border p-2 flex-1"
            placeholder="Trip ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <select
            className="border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
          <button onClick={create} className="bg-blue-500 text-white px-4 py-2 rounded">
            Add
          </button>
        </div>
      </div>

      {/* Bảng danh sách */}
      <table className="border-collapse border border-gray-400 min-w-full">
        <thead>
          <tr>
            <th className="border border-gray-400 px-4 py-2 text-left">Trip ID</th>
            <th className="border border-gray-400 px-4 py-2 text-left">Status</th>
            <th className="border border-gray-400 px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((t) => (
            <tr key={t.id}>
              <td className="border border-gray-400 px-4 py-2">{t.id}</td>
              <td className="border border-gray-400 px-4 py-2">{t.status}</td>
              <td className="border border-gray-400 px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="border px-2 py-1 rounded"
                    onClick={() => logEvent(t.id, 'CHECKIN_PICKUP')}
                  >
                    Check-in pickup
                  </button>
                  <button
                    className="border px-2 py-1 rounded"
                    onClick={() => logEvent(t.id, 'DEPART_PICKUP')}
                  >
                    Depart pickup
                  </button>
                  <button
                    className="border px-2 py-1 rounded"
                    onClick={() => logEvent(t.id, 'ARRIVE_DROPOFF')}
                  >
                    Arrive dropoff
                  </button>
                  <button
                    className="border px-2 py-1 rounded"
                    onClick={() => logEvent(t.id, 'POD')}
                  >
                    POD (delivered)
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

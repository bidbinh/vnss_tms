"use client";

import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface SalarySetting {
  id: string;
  // Validity dates
  effective_start_date?: string;
  effective_end_date?: string;
  // Distance brackets (12 thresholds)
  distance_bracket_1: number;
  distance_bracket_2: number;
  distance_bracket_3: number;
  distance_bracket_4: number;
  distance_bracket_5: number;
  distance_bracket_6: number;
  distance_bracket_7: number;
  distance_bracket_8: number;
  distance_bracket_9: number;
  distance_bracket_10: number;
  distance_bracket_11: number;
  distance_bracket_12: number;
  // Port distance salaries (13 levels)
  port_bracket_1: number;
  port_bracket_2: number;
  port_bracket_3: number;
  port_bracket_4: number;
  port_bracket_5: number;
  port_bracket_6: number;
  port_bracket_7: number;
  port_bracket_8: number;
  port_bracket_9: number;
  port_bracket_10: number;
  port_bracket_11: number;
  port_bracket_12: number;
  port_bracket_13: number;
  // Warehouse distance salaries (13 levels)
  warehouse_bracket_1: number;
  warehouse_bracket_2: number;
  warehouse_bracket_3: number;
  warehouse_bracket_4: number;
  warehouse_bracket_5: number;
  warehouse_bracket_6: number;
  warehouse_bracket_7: number;
  warehouse_bracket_8: number;
  warehouse_bracket_9: number;
  warehouse_bracket_10: number;
  warehouse_bracket_11: number;
  warehouse_bracket_12: number;
  warehouse_bracket_13: number;
  // Additional fees
  port_gate_fee: number;
  flatbed_tarp_fee: number;
  warehouse_to_customer_bonus: number;
  // Daily trip bonuses
  second_trip_bonus: number;
  third_trip_bonus: number;
  // Monthly trip bonuses
  bonus_45_50_trips: number;
  bonus_51_54_trips: number;
  bonus_55_plus_trips: number;
  // Holiday
  holiday_multiplier: number;
  status: string;
  note?: string;
}

// Helper function to format number with thousand separators
function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
}

// Helper function to parse formatted number string
function parseFormattedNumber(value: string): number {
  return parseInt(value.replace(/\./g, '').replace(/,/g, '')) || 0;
}

export default function DriverSalarySettingsPage() {
  const [settings, setSettings] = useState<SalarySetting[]>([]);
  const [activeSetting, setActiveSetting] = useState<SalarySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<SalarySetting>>({
    effective_start_date: "",
    effective_end_date: "",
    distance_bracket_1: 10,
    distance_bracket_2: 20,
    distance_bracket_3: 30,
    distance_bracket_4: 40,
    distance_bracket_5: 50,
    distance_bracket_6: 60,
    distance_bracket_7: 80,
    distance_bracket_8: 100,
    distance_bracket_9: 120,
    distance_bracket_10: 150,
    distance_bracket_11: 200,
    distance_bracket_12: 250,
    port_bracket_1: 0,
    port_bracket_2: 0,
    port_bracket_3: 0,
    port_bracket_4: 0,
    port_bracket_5: 0,
    port_bracket_6: 0,
    port_bracket_7: 0,
    port_bracket_8: 0,
    port_bracket_9: 0,
    port_bracket_10: 0,
    port_bracket_11: 0,
    port_bracket_12: 0,
    port_bracket_13: 0,
    warehouse_bracket_1: 0,
    warehouse_bracket_2: 0,
    warehouse_bracket_3: 0,
    warehouse_bracket_4: 0,
    warehouse_bracket_5: 0,
    warehouse_bracket_6: 0,
    warehouse_bracket_7: 0,
    warehouse_bracket_8: 0,
    warehouse_bracket_9: 0,
    warehouse_bracket_10: 0,
    warehouse_bracket_11: 0,
    warehouse_bracket_12: 0,
    warehouse_bracket_13: 0,
    port_gate_fee: 50000,
    flatbed_tarp_fee: 0,
    warehouse_to_customer_bonus: 0,
    second_trip_bonus: 500000,
    third_trip_bonus: 700000,
    bonus_45_50_trips: 1000000,
    bonus_51_54_trips: 1500000,
    bonus_55_plus_trips: 2000000,
    holiday_multiplier: 2.0,
    status: "ACTIVE",
    note: "",
  });

  useEffect(() => {
    fetchSettings();
    fetchActiveSetting();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchActiveSetting() {
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-settings/active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSetting(data);
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const url = editing && activeSetting
        ? `${API_BASE_URL}/driver-salary-settings/${activeSetting.id}`
        : `${API_BASE_URL}/driver-salary-settings`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to save");
      }

      await fetchSettings();
      await fetchActiveSetting();
      setShowForm(false);
      setEditing(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function handleEdit(setting: SalarySetting) {
    setFormData(setting);
    setEditing(true);
    setShowForm(true);
  }

  function handleNew() {
    setFormData({
      effective_start_date: "",
      effective_end_date: "",
      distance_bracket_1: 10,
      distance_bracket_2: 20,
      distance_bracket_3: 30,
      distance_bracket_4: 40,
      distance_bracket_5: 50,
      distance_bracket_6: 60,
      distance_bracket_7: 80,
      distance_bracket_8: 100,
      distance_bracket_9: 120,
      distance_bracket_10: 150,
      distance_bracket_11: 200,
      distance_bracket_12: 250,
      port_bracket_1: 0,
      port_bracket_2: 0,
      port_bracket_3: 0,
      port_bracket_4: 0,
      port_bracket_5: 0,
      port_bracket_6: 0,
      port_bracket_7: 0,
      port_bracket_8: 0,
      port_bracket_9: 0,
      port_bracket_10: 0,
      port_bracket_11: 0,
      port_bracket_12: 0,
      port_bracket_13: 0,
      warehouse_bracket_1: 0,
      warehouse_bracket_2: 0,
      warehouse_bracket_3: 0,
      warehouse_bracket_4: 0,
      warehouse_bracket_5: 0,
      warehouse_bracket_6: 0,
      warehouse_bracket_7: 0,
      warehouse_bracket_8: 0,
      warehouse_bracket_9: 0,
      warehouse_bracket_10: 0,
      warehouse_bracket_11: 0,
      warehouse_bracket_12: 0,
      warehouse_bracket_13: 0,
      port_gate_fee: 50000,
      flatbed_tarp_fee: 0,
      warehouse_to_customer_bonus: 0,
      second_trip_bonus: 500000,
      third_trip_bonus: 700000,
      bonus_45_50_trips: 1000000,
      bonus_51_54_trips: 1500000,
      bonus_55_plus_trips: 2000000,
      holiday_multiplier: 2.0,
      status: "ACTIVE",
      note: "",
    });
    setEditing(false);
    setShowForm(true);
  }

  const distanceBrackets = [
    { key: 'distance_bracket_1', label: 'Mốc 1' },
    { key: 'distance_bracket_2', label: 'Mốc 2' },
    { key: 'distance_bracket_3', label: 'Mốc 3' },
    { key: 'distance_bracket_4', label: 'Mốc 4' },
    { key: 'distance_bracket_5', label: 'Mốc 5' },
    { key: 'distance_bracket_6', label: 'Mốc 6' },
    { key: 'distance_bracket_7', label: 'Mốc 7' },
    { key: 'distance_bracket_8', label: 'Mốc 8' },
    { key: 'distance_bracket_9', label: 'Mốc 9' },
    { key: 'distance_bracket_10', label: 'Mốc 10' },
    { key: 'distance_bracket_11', label: 'Mốc 11' },
    { key: 'distance_bracket_12', label: 'Mốc 12' },
  ];

  const portBrackets = [
    { key: 'port_bracket_1', idx: 1 },
    { key: 'port_bracket_2', idx: 2 },
    { key: 'port_bracket_3', idx: 3 },
    { key: 'port_bracket_4', idx: 4 },
    { key: 'port_bracket_5', idx: 5 },
    { key: 'port_bracket_6', idx: 6 },
    { key: 'port_bracket_7', idx: 7 },
    { key: 'port_bracket_8', idx: 8 },
    { key: 'port_bracket_9', idx: 9 },
    { key: 'port_bracket_10', idx: 10 },
    { key: 'port_bracket_11', idx: 11 },
    { key: 'port_bracket_12', idx: 12 },
    { key: 'port_bracket_13', idx: 13 },
  ];

  const warehouseBrackets = [
    { key: 'warehouse_bracket_1', idx: 1 },
    { key: 'warehouse_bracket_2', idx: 2 },
    { key: 'warehouse_bracket_3', idx: 3 },
    { key: 'warehouse_bracket_4', idx: 4 },
    { key: 'warehouse_bracket_5', idx: 5 },
    { key: 'warehouse_bracket_6', idx: 6 },
    { key: 'warehouse_bracket_7', idx: 7 },
    { key: 'warehouse_bracket_8', idx: 8 },
    { key: 'warehouse_bracket_9', idx: 9 },
    { key: 'warehouse_bracket_10', idx: 10 },
    { key: 'warehouse_bracket_11', idx: 11 },
    { key: 'warehouse_bracket_12', idx: 12 },
    { key: 'warehouse_bracket_13', idx: 13 },
  ];

  function getBracketRange(idx: number): string {
    if (idx === 1) {
      return `0-${formData.distance_bracket_1}`;
    } else if (idx === 13) {
      return `${(formData.distance_bracket_12 || 0) + 1}+`;
    } else {
      const prevBracket = formData[`distance_bracket_${idx - 1}` as keyof typeof formData] as number || 0;
      const currBracket = formData[`distance_bracket_${idx}` as keyof typeof formData] as number || 0;
      return `${prevBracket + 1}-${currBracket}`;
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cài đặt lương tài xế</h1>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Tạo cài đặt mới
        </button>
      </div>

      {/* Active Setting Display */}
      {activeSetting && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-green-800">Cài đặt đang áp dụng</h2>
            <button
              onClick={() => handleEdit(activeSetting)}
              className="text-blue-600 hover:underline text-sm"
            >
              Chỉnh sửa
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <strong>Vé cổng (Cảng):</strong> {activeSetting.port_gate_fee.toLocaleString()} VNĐ
            </div>
            <div>
              <strong>Thưởng chuyến 2:</strong> {activeSetting.second_trip_bonus.toLocaleString()} VNĐ
            </div>
            <div>
              <strong>Thưởng chuyến 3:</strong> {activeSetting.third_trip_bonus.toLocaleString()} VNĐ
            </div>
            <div>
              <strong>Hệ số ngày lễ:</strong> {activeSetting.holiday_multiplier}x
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">
                {editing ? "Chỉnh sửa cài đặt lương" : "Tạo cài đặt lương mới"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {/* Validity Period */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-purple-800">Thời hạn hiệu lực</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={formData.effective_start_date || ""}
                      onChange={(e) => setFormData({ ...formData, effective_start_date: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={formData.effective_end_date || ""}
                      onChange={(e) => setFormData({ ...formData, effective_end_date: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Distance Brackets */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-orange-800">Mốc km (có thể thay đổi)</h3>
                <div className="grid grid-cols-6 gap-3">
                  {distanceBrackets.map((bracket, idx) => (
                    <div key={bracket.key}>
                      <label className="block text-xs mb-1">{bracket.label} (km)</label>
                      <input
                        type="number"
                        value={formData[bracket.key as keyof typeof formData] as number}
                        onChange={(e) => setFormData({ ...formData, [bracket.key]: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs border rounded px-2 py-1"
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">{getBracketRange(idx + 1)} km</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distance-based salary - PORT */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-blue-800">Lương theo km (Từ Cảng)</h3>
                <div className="grid grid-cols-7 gap-3">
                  {portBrackets.map((bracket) => (
                    <div key={bracket.key}>
                      <label className="block text-xs mb-1">{getBracketRange(bracket.idx)} km</label>
                      <input
                        type="text"
                        value={formatNumber(formData[bracket.key as keyof typeof formData] as number || 0)}
                        onChange={(e) => setFormData({ ...formData, [bracket.key]: parseFormattedNumber(e.target.value) })}
                        className="w-full text-xs border rounded px-2 py-1"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Distance-based salary - WAREHOUSE */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-green-800">Lương theo km (Từ Kho/Giao Khách)</h3>
                <div className="grid grid-cols-7 gap-3">
                  {warehouseBrackets.map((bracket) => (
                    <div key={bracket.key}>
                      <label className="block text-xs mb-1">{getBracketRange(bracket.idx)} km</label>
                      <input
                        type="text"
                        value={formatNumber(formData[bracket.key as keyof typeof formData] as number || 0)}
                        onChange={(e) => setFormData({ ...formData, [bracket.key]: parseFormattedNumber(e.target.value) })}
                        className="w-full text-xs border rounded px-2 py-1"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Fees */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Các khoản phụ trội</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Vé cổng (Hàng từ Cảng)</label>
                    <input
                      type="text"
                      value={formatNumber(formData.port_gate_fee || 0)}
                      onChange={(e) => setFormData({ ...formData, port_gate_fee: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="50.000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Bái bạt (Xe Mooc sàn)</label>
                    <input
                      type="text"
                      value={formatNumber(formData.flatbed_tarp_fee || 0)}
                      onChange={(e) => setFormData({ ...formData, flatbed_tarp_fee: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Kho NB → Khách (Ghi chú "Hàng xá")</label>
                    <input
                      type="text"
                      value={formatNumber(formData.warehouse_to_customer_bonus || 0)}
                      onChange={(e) => setFormData({ ...formData, warehouse_to_customer_bonus: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Daily Trip Bonuses */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Thưởng chuyến trong ngày</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Thưởng chuyến thứ 2</label>
                    <input
                      type="text"
                      value={formatNumber(formData.second_trip_bonus || 0)}
                      onChange={(e) => setFormData({ ...formData, second_trip_bonus: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="500.000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Thưởng chuyến thứ 3+</label>
                    <input
                      type="text"
                      value={formatNumber(formData.third_trip_bonus || 0)}
                      onChange={(e) => setFormData({ ...formData, third_trip_bonus: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="700.000"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Bonuses */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Thưởng số lượng chuyến tháng</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs mb-1">45-50 chuyến</label>
                    <input
                      type="text"
                      value={formatNumber(formData.bonus_45_50_trips || 0)}
                      onChange={(e) => setFormData({ ...formData, bonus_45_50_trips: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="1.000.000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">51-54 chuyến</label>
                    <input
                      type="text"
                      value={formatNumber(formData.bonus_51_54_trips || 0)}
                      onChange={(e) => setFormData({ ...formData, bonus_51_54_trips: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="1.500.000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">55+ chuyến</label>
                    <input
                      type="text"
                      value={formatNumber(formData.bonus_55_plus_trips || 0)}
                      onChange={(e) => setFormData({ ...formData, bonus_55_plus_trips: parseFormattedNumber(e.target.value) })}
                      className="w-full text-xs border rounded px-2 py-1"
                      placeholder="2.000.000"
                    />
                  </div>
                </div>
              </div>

              {/* Holiday Multiplier */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Ngày lễ</h3>
                <div className="w-1/3">
                  <label className="block text-xs mb-1">Hệ số nhân (VD: 2.0 = 200%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.holiday_multiplier}
                    onChange={(e) => setFormData({ ...formData, holiday_multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full text-xs border rounded px-2 py-1"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                  className="w-full text-sm border rounded px-3 py-2"
                  placeholder="Ghi chú thêm..."
                />
              </div>

              {/* Status */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-64 text-sm border rounded px-3 py-2"
                >
                  <option value="ACTIVE">Đang áp dụng</option>
                  <option value="INACTIVE">Không áp dụng</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(false);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

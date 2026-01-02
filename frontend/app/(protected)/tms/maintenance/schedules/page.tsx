"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, AlertCircle, Calendar } from "lucide-react";
import Pagination, { PageSizeSelector } from "@/components/Pagination";

interface Vehicle {
  id: string;
  plate_no: string;
  model: string;
}

interface MaintenanceSchedule {
  id: string;
  vehicle_id: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  maintenance_type: string;
  interval_type: string;
  interval_km?: number;
  interval_days?: number;
  last_service_date?: string;
  last_service_mileage?: number;
  next_due_date?: string;
  next_due_mileage?: number;
  alert_before_days: number;
  alert_before_km: number;
  description?: string;
  status: string;
  alert_status?: string;
}

const maintenanceTypes = [
  { value: "OIL_CHANGE", label: "Thay dầu" },
  { value: "PERIODIC", label: "Bảo dưỡng định kỳ" },
  { value: "TIRE_REPLACEMENT", label: "Thay lốp" },
  { value: "BRAKE_SERVICE", label: "Kiểm tra phanh" },
  { value: "BATTERY_CHECK", label: "Kiểm tra ắc quy" },
  { value: "AIR_FILTER", label: "Thay lọc gió" },
  { value: "INSPECTION", label: "Kiểm định" },
  { value: "OTHER", label: "Khác" },
];

const intervalTypes = [
  { value: "MILEAGE", label: "Theo km" },
  { value: "TIME", label: "Theo thời gian" },
  { value: "BOTH", label: "Cả hai" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Tạm dừng" },
];

export default function MaintenanceSchedulesPage() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    maintenance_type: "OIL_CHANGE",
    interval_type: "BOTH",
    interval_km: "",
    interval_days: "",
    last_service_date: "",
    last_service_mileage: "",
    alert_before_days: "7",
    alert_before_km: "500",
    description: "",
    status: "ACTIVE",
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  useEffect(() => {
    fetchSchedules();
    fetchVehicles();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/maintenance/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const payload: any = {
        vehicle_id: formData.vehicle_id,
        maintenance_type: formData.maintenance_type,
        interval_type: formData.interval_type,
        alert_before_days: parseInt(formData.alert_before_days),
        alert_before_km: parseInt(formData.alert_before_km),
        description: formData.description || null,
        status: formData.status,
      };

      if (formData.interval_type === "MILEAGE" || formData.interval_type === "BOTH") {
        payload.interval_km = formData.interval_km ? parseInt(formData.interval_km) : null;
      }

      if (formData.interval_type === "TIME" || formData.interval_type === "BOTH") {
        payload.interval_days = formData.interval_days ? parseInt(formData.interval_days) : null;
      }

      if (formData.last_service_date) {
        payload.last_service_date = formData.last_service_date;
      }

      if (formData.last_service_mileage) {
        payload.last_service_mileage = parseInt(formData.last_service_mileage);
      }

      const url = editingSchedule
        ? `${API_BASE}/maintenance/schedules/${editingSchedule.id}`
        : `${API_BASE}/maintenance/schedules`;

      const method = editingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to save schedule");
      }

      await fetchSchedules();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert(error instanceof Error ? error.message : "Lỗi khi lưu lịch bảo trì");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch bảo trì này?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/maintenance/schedules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      await fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Lỗi khi xóa lịch bảo trì");
    }
  };

  const handleEdit = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      vehicle_id: schedule.vehicle_id,
      maintenance_type: schedule.maintenance_type,
      interval_type: schedule.interval_type,
      interval_km: schedule.interval_km?.toString() || "",
      interval_days: schedule.interval_days?.toString() || "",
      last_service_date: schedule.last_service_date || "",
      last_service_mileage: schedule.last_service_mileage?.toString() || "",
      alert_before_days: schedule.alert_before_days?.toString() || "7",
      alert_before_km: schedule.alert_before_km?.toString() || "500",
      description: schedule.description || "",
      status: schedule.status,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    setFormData({
      vehicle_id: "",
      maintenance_type: "OIL_CHANGE",
      interval_type: "BOTH",
      interval_km: "",
      interval_days: "",
      last_service_date: "",
      last_service_mileage: "",
      alert_before_days: "7",
      alert_before_km: "500",
      description: "",
      status: "ACTIVE",
    });
  };

  const getMaintenanceTypeLabel = (type: string) => {
    return maintenanceTypes.find((t) => t.value === type)?.label || type;
  };

  const getAlertBadge = (alertStatus?: string) => {
    if (!alertStatus || alertStatus === "OK") {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Bình thường</span>;
    }
    if (alertStatus === "DUE_SOON") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Sắp đến hạn
        </span>
      );
    }
    if (alertStatus === "OVERDUE") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Quá hạn
        </span>
      );
    }
    return null;
  };

  // Pagination
  const paginatedSchedules = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return schedules.slice(startIndex, startIndex + pageSize);
  }, [schedules, currentPage, pageSize]);

  const totalPages = Math.ceil(schedules.length / pageSize);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch bảo trì định kỳ</h1>
          <p className="text-gray-600 text-sm mt-1">Quản lý lịch bảo trì theo km và thời gian</p>
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm lịch bảo trì
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Xe</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Loại bảo trì</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Chu kỳ</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Lần cuối</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Lần sau</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedSchedules.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{schedule.vehicle_plate}</div>
                  <div className="text-sm text-gray-500">{schedule.vehicle_model}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{getMaintenanceTypeLabel(schedule.maintenance_type)}</div>
                  {schedule.description && <div className="text-sm text-gray-500">{schedule.description}</div>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {schedule.interval_km && <div>{schedule.interval_km.toLocaleString()} km</div>}
                  {schedule.interval_days && <div>{schedule.interval_days} ngày</div>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {schedule.last_service_date && <div>{schedule.last_service_date}</div>}
                  {schedule.last_service_mileage && <div>{schedule.last_service_mileage.toLocaleString()} km</div>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {schedule.next_due_date && <div>{schedule.next_due_date}</div>}
                  {schedule.next_due_mileage && <div>{schedule.next_due_mileage.toLocaleString()} km</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {getAlertBadge(schedule.alert_status)}
                    <span className={`px-2 py-1 text-xs rounded ${schedule.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {schedule.status === "ACTIVE" ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules.length === 0 && (
          <div className="text-center py-8 text-gray-500">Chưa có lịch bảo trì nào</div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={schedules.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="schedules"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingSchedule ? "Cập nhật lịch bảo trì" : "Thêm lịch bảo trì mới"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Xe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">-- Chọn xe --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_no}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Loại bảo trì <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.maintenance_type}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    {maintenanceTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chu kỳ theo <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {intervalTypes.map((t) => (
                      <label key={t.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          value={t.value}
                          checked={formData.interval_type === t.value}
                          onChange={(e) => setFormData({ ...formData, interval_type: e.target.value })}
                          className="w-4 h-4"
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(formData.interval_type === "MILEAGE" || formData.interval_type === "BOTH") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Chu kỳ (km) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.interval_km}
                        onChange={(e) => setFormData({ ...formData, interval_km: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="VD: 5000"
                        required={formData.interval_type === "MILEAGE" || formData.interval_type === "BOTH"}
                      />
                    </div>
                  )}

                  {(formData.interval_type === "TIME" || formData.interval_type === "BOTH") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Chu kỳ (ngày) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.interval_days}
                        onChange={(e) => setFormData({ ...formData, interval_days: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="VD: 90"
                        required={formData.interval_type === "TIME" || formData.interval_type === "BOTH"}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ngày bảo trì lần cuối</label>
                    <input
                      type="date"
                      value={formData.last_service_date}
                      onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Km lần cuối</label>
                    <input
                      type="number"
                      value={formData.last_service_mileage}
                      onChange={(e) => setFormData({ ...formData, last_service_mileage: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="VD: 15000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cảnh báo trước (ngày)</label>
                    <input
                      type="number"
                      value={formData.alert_before_days}
                      onChange={(e) => setFormData({ ...formData, alert_before_days: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="VD: 7"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Cảnh báo trước (km)</label>
                    <input
                      type="number"
                      value={formData.alert_before_km}
                      onChange={(e) => setFormData({ ...formData, alert_before_km: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="VD: 500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="Ghi chú thêm..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Đang lưu..." : editingSchedule ? "Cập nhật" : "Tạo mới"}
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

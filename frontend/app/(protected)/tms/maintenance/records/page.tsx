"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, FileText, Search, ChevronUp, ChevronDown } from "lucide-react";
import Pagination, { PageSizeSelector } from "@/components/Pagination";

const COLUMN_WIDTHS_KEY = 'maintenance-records-column-widths';
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  date: 100,
  vehicle: 140,
  type: 150,
  mileage: 80,
  garage: 150,
  cost: 120,
  status: 100,
  actions: 100,
};

type SortField = 'service_date' | 'vehicle_plate' | 'maintenance_type' | 'mileage' | 'garage_name' | 'total_cost' | 'status';
type SortDirection = 'asc' | 'desc';

const SortIndicator = ({ field, sortField, sortDirection }: { field: SortField; sortField: SortField | null; sortDirection: SortDirection }) => {
  if (sortField !== field) {
    return <span className="text-gray-300 ml-1">⇅</span>;
  }
  return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
};

interface Vehicle {
  id: string;
  plate_no: string;
  model: string;
}

interface MaintenanceSchedule {
  id: string;
  maintenance_type: string;
  vehicle_id: string;
}

interface MaintenanceItem {
  id?: string;
  item_type: string;
  item_name: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  supplier?: string;
  part_number?: string;
  warranty_months?: number;
  note?: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  schedule_id?: string;
  maintenance_type: string;
  service_date: string;
  mileage?: number;
  description: string;
  garage_name?: string;
  mechanic_name?: string;
  garage_address?: string;
  garage_phone?: string;
  total_cost?: number;
  attachments?: string;
  note?: string;
  status: string;
  items?: MaintenanceItem[];
  items_count?: number;
}

const maintenanceTypes = [
  { value: "OIL_CHANGE", label: "Thay dầu" },
  { value: "PERIODIC", label: "Bảo dưỡng định kỳ" },
  { value: "TIRE_REPLACEMENT", label: "Thay lốp" },
  { value: "BRAKE_SERVICE", label: "Kiểm tra phanh" },
  { value: "BATTERY_CHECK", label: "Kiểm tra ắc quy" },
  { value: "AIR_FILTER", label: "Thay lọc gió" },
  { value: "INSPECTION", label: "Kiểm định" },
  { value: "EMERGENCY_REPAIR", label: "Sửa chữa khẩn cấp" },
  { value: "OTHER", label: "Khác" },
];

const itemTypes = [
  { value: "PARTS", label: "Phụ tùng" },
  { value: "LABOR", label: "Công lao động" },
  { value: "MATERIAL", label: "Vật tư" },
  { value: "OTHER", label: "Khác" },
];

const statusOptions = [
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
];

export default function MaintenanceRecordsPage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null);

  // Search, Sort, Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column resize
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Load column widths from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (saved) {
      try {
        setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to parse column widths:', e);
      }
    }
  }, []);

  // Save column widths to localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
  }, []);

  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    resizingColumn.current = column;
    startX.current = e.clientX;
    startWidth.current = columnWidths[column];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);
    setColumnWidths(prev => {
      const updated = { ...prev, [resizingColumn.current!]: newWidth };
      return updated;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (resizingColumn.current) {
      saveColumnWidths(columnWidths);
    }
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [columnWidths, saveColumnWidths, handleMouseMove]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  const [formData, setFormData] = useState({
    vehicle_id: "",
    schedule_id: "",
    maintenance_type: "OIL_CHANGE",
    service_date: new Date().toISOString().split("T")[0],
    mileage: "",
    description: "",
    garage_name: "",
    mechanic_name: "",
    garage_address: "",
    garage_phone: "",
    driver_name: "",
    note: "",
    status: "COMPLETED",
  });
  const [items, setItems] = useState<MaintenanceItem[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  useEffect(() => {
    fetchRecords();
    fetchVehicles();
    fetchSchedules();
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/maintenance/records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching records:", error);
      setRecords([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");

      // Calculate total cost from items
      const totalCost = items.reduce((sum, item) => sum + item.total_price, 0);

      const payload: any = {
        vehicle_id: formData.vehicle_id,
        schedule_id: formData.schedule_id || null,
        maintenance_type: formData.maintenance_type,
        service_date: formData.service_date,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        description: formData.description,
        garage_name: formData.garage_name || null,
        mechanic_name: formData.mechanic_name || null,
        garage_address: formData.garage_address || null,
        garage_phone: formData.garage_phone || null,
        driver_name: formData.driver_name || null,
        total_cost: totalCost,
        note: formData.note || null,
        status: formData.status,
        items: items,
      };

      const url = editingRecord
        ? `${API_BASE}/maintenance/records/${editingRecord.id}`
        : `${API_BASE}/maintenance/records`;

      const method = editingRecord ? "PUT" : "POST";

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
        throw new Error(errorData.detail || "Failed to save record");
      }

      await fetchRecords();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving record:", error);
      alert(error instanceof Error ? error.message : "Lỗi khi lưu phiếu bảo trì");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa phiếu bảo trì này?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/maintenance/records/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      await fetchRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Lỗi khi xóa phiếu bảo trì");
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      vehicle_id: record.vehicle_id,
      schedule_id: record.schedule_id || "",
      maintenance_type: record.maintenance_type,
      service_date: record.service_date,
      mileage: record.mileage?.toString() || "",
      description: record.description,
      garage_name: record.garage_name || "",
      mechanic_name: record.mechanic_name || "",
      garage_address: record.garage_address || "",
      garage_phone: record.garage_phone || "",
      driver_name: (record as any).driver_name || "",
      note: record.note || "",
      status: record.status,
    });
    setItems(record.items || []);
    setShowModal(true);
  };

  const handleView = async (record: MaintenanceRecord) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/maintenance/records/${record.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setViewingRecord(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error fetching record details:", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setFormData({
      vehicle_id: "",
      schedule_id: "",
      maintenance_type: "OIL_CHANGE",
      service_date: new Date().toISOString().split("T")[0],
      mileage: "",
      description: "",
      garage_name: "",
      mechanic_name: "",
      garage_address: "",
      garage_phone: "",
      driver_name: "",
      note: "",
      status: "COMPLETED",
    });
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item_type: "PARTS",
        item_name: "",
        quantity: 1,
        unit: "",
        unit_price: 0,
        total_price: 0,
        supplier: "",
        part_number: "",
        warranty_months: 0,
        note: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total_price
    if (field === "quantity" || field === "unit_price") {
      const quantity = field === "quantity" ? parseFloat(value) || 0 : newItems[index].quantity;
      const unitPrice = field === "unit_price" ? parseFloat(value) || 0 : newItems[index].unit_price;
      newItems[index].total_price = quantity * unitPrice;
    }

    setItems(newItems);
  };

  const getMaintenanceTypeLabel = (type: string) => {
    return maintenanceTypes.find((t) => t.value === type)?.label || type;
  };

  const getItemTypeLabel = (type: string) => {
    return itemTypes.find((t) => t.value === type)?.label || type;
  };

  const totalCost = items.reduce((sum, item) => sum + item.total_price, 0);

  const filteredSchedules = schedules.filter(s => s.vehicle_id === formData.vehicle_id);

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(record =>
      (record.vehicle_plate?.toLowerCase() || '').includes(term) ||
      (record.vehicle_model?.toLowerCase() || '').includes(term) ||
      (record.garage_name?.toLowerCase() || '').includes(term) ||
      (record.mechanic_name?.toLowerCase() || '').includes(term) ||
      (record.description?.toLowerCase() || '').includes(term) ||
      (getMaintenanceTypeLabel(record.maintenance_type)?.toLowerCase() || '').includes(term)
    );
  }, [records, searchTerm]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'service_date':
          aValue = a.service_date || '';
          bValue = b.service_date || '';
          break;
        case 'vehicle_plate':
          aValue = a.vehicle_plate || '';
          bValue = b.vehicle_plate || '';
          break;
        case 'maintenance_type':
          aValue = getMaintenanceTypeLabel(a.maintenance_type);
          bValue = getMaintenanceTypeLabel(b.maintenance_type);
          break;
        case 'mileage':
          aValue = a.mileage || 0;
          bValue = b.mileage || 0;
          break;
        case 'garage_name':
          aValue = a.garage_name || '';
          bValue = b.garage_name || '';
          break;
        case 'total_cost':
          aValue = a.total_cost || 0;
          bValue = b.total_cost || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue), 'vi');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRecords.slice(startIndex, startIndex + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize);

  // Reset to page 1 when page size or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchTerm]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Lịch sử bảo trì</h1>
          <p className="text-gray-600 text-sm mt-1">Quản lý các phiếu bảo trì đã thực hiện</p>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm biển số, garage, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 flex justify-end items-center gap-3">
          <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm phiếu bảo trì
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th
                style={{ width: columnWidths.date }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('service_date')}
              >
                Ngày
                <SortIndicator field="service_date" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('date', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.vehicle }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('vehicle_plate')}
              >
                Xe
                <SortIndicator field="vehicle_plate" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('vehicle', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.type }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('maintenance_type')}
              >
                Loại bảo trì
                <SortIndicator field="maintenance_type" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('type', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.mileage }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('mileage')}
              >
                Km
                <SortIndicator field="mileage" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('mileage', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.garage }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('garage_name')}
              >
                Garage
                <SortIndicator field="garage_name" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('garage', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.cost }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('total_cost')}
              >
                Chi phí
                <SortIndicator field="total_cost" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('cost', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.status }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 relative select-none"
                onClick={() => handleSort('status')}
              >
                Trạng thái
                <SortIndicator field="status" sortField={sortField} sortDirection={sortDirection} />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('status', e); }}
                />
              </th>
              <th
                style={{ width: columnWidths.actions }}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase relative"
              >
                Thao tác
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('actions', e); }}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td style={{ width: columnWidths.date }} className="px-4 py-3 text-sm truncate">{record.service_date}</td>
                <td style={{ width: columnWidths.vehicle }} className="px-4 py-3">
                  <div className="font-medium text-sm truncate">{record.vehicle_plate}</div>
                  <div className="text-xs text-gray-500 truncate">{record.vehicle_model}</div>
                </td>
                <td style={{ width: columnWidths.type }} className="px-4 py-3">
                  <div className="font-medium text-sm truncate">{getMaintenanceTypeLabel(record.maintenance_type)}</div>
                  {record.items_count && record.items_count > 0 && (
                    <div className="text-xs text-gray-500">{record.items_count} hạng mục</div>
                  )}
                </td>
                <td style={{ width: columnWidths.mileage }} className="px-4 py-3 text-sm truncate">
                  {record.mileage ? record.mileage.toLocaleString() : "-"}
                </td>
                <td style={{ width: columnWidths.garage }} className="px-4 py-3 text-sm">
                  {record.garage_name ? (
                    <div>
                      <div className="font-medium truncate">{record.garage_name}</div>
                      {record.mechanic_name && (
                        <div className="text-xs text-gray-500 truncate">Thợ: {record.mechanic_name}</div>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={{ width: columnWidths.cost }} className="px-4 py-3 text-sm font-medium truncate">
                  {record.total_cost ? record.total_cost.toLocaleString() + " đ" : "-"}
                </td>
                <td style={{ width: columnWidths.status }} className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      record.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : record.status === "IN_PROGRESS"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {statusOptions.find((s) => s.value === record.status)?.label || record.status}
                  </span>
                </td>
                <td style={{ width: columnWidths.actions }} className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(record)}
                      className="text-green-600 hover:text-green-800"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
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
        {sortedRecords.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "Không tìm thấy phiếu bảo trì phù hợp" : "Chưa có phiếu bảo trì nào"}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedRecords.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="phiếu"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingRecord ? "Cập nhật phiếu bảo trì" : "Thêm phiếu bảo trì mới"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Xe <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value, schedule_id: "" })}
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
                    <label className="block text-sm font-medium mb-1">Liên kết lịch bảo trì</label>
                    <select
                      value={formData.schedule_id}
                      onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      disabled={!formData.vehicle_id}
                    >
                      <option value="">-- Không liên kết --</option>
                      {filteredSchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {getMaintenanceTypeLabel(s.maintenance_type)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium mb-1">
                      Ngày thực hiện <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.service_date}
                      onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Số km hiện tại</label>
                    <input
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="VD: 15000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mô tả công việc <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="Mô tả chi tiết công việc đã thực hiện..."
                    required
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Thông tin garage</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên garage</label>
                      <input
                        type="text"
                        value={formData.garage_name}
                        onChange={(e) => setFormData({ ...formData, garage_name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Tên cơ sở sửa chữa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tên thợ</label>
                      <input
                        type="text"
                        value={formData.mechanic_name}
                        onChange={(e) => setFormData({ ...formData, mechanic_name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Tên người thực hiện"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tên tài xế</label>
                      <input
                        type="text"
                        value={formData.driver_name}
                        onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Tài xế thực hiện"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        value={formData.garage_address}
                        onChange={(e) => setFormData({ ...formData, garage_address: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Địa chỉ garage"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        value={formData.garage_phone}
                        onChange={(e) => setFormData({ ...formData, garage_phone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Số điện thoại liên hệ"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Chi tiết chi phí</h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm hạng mục
                    </button>
                  </div>

                  {items.length > 0 && (
                    <div className="space-y-3 mb-3">
                      <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-600">
                        <div className="col-span-2">Loại</div>
                        <div className="col-span-3">Tên hạng mục</div>
                        <div className="col-span-1">SL</div>
                        <div className="col-span-1">ĐVT</div>
                        <div className="col-span-2">Đơn giá</div>
                        <div className="col-span-2">Thành tiền</div>
                        <div className="col-span-1"></div>
                      </div>
                      {items.map((item, index) => (
                        <div key={index} className="border rounded p-3 bg-gray-50">
                          <div className="grid grid-cols-12 gap-2 mb-2">
                            <div className="col-span-2">
                              <select
                                value={item.item_type}
                                onChange={(e) => handleItemChange(index, "item_type", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                              >
                                {itemTypes.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={item.item_name}
                                onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="Tên hạng mục"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="SL"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="text"
                                value={item.unit || ""}
                                onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="ĐVT"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="Đơn giá"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                value={item.total_price}
                                readOnly
                                className="w-full border rounded px-2 py-1 text-sm bg-gray-100"
                                placeholder="Thành tiền"
                              />
                            </div>
                            <div className="col-span-1 flex items-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={item.supplier || ""}
                              onChange={(e) => handleItemChange(index, "supplier", e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                              placeholder="Nhà cung cấp"
                            />
                            <input
                              type="text"
                              value={item.part_number || ""}
                              onChange={(e) => handleItemChange(index, "part_number", e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                              placeholder="Mã phụ tùng"
                            />
                            <input
                              type="number"
                              value={item.warranty_months || ""}
                              onChange={(e) => handleItemChange(index, "warranty_months", e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                              placeholder="Bảo hành (tháng)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <div className="text-lg font-bold">
                      Tổng chi phí: {totalCost.toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú</label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
                    {loading ? "Đang lưu..." : editingRecord ? "Cập nhật" : "Tạo mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && viewingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chi tiết phiếu bảo trì</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Xe</div>
                    <div className="font-medium">
                      {viewingRecord.vehicle_plate} - {viewingRecord.vehicle_model}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Ngày thực hiện</div>
                    <div className="font-medium">{viewingRecord.service_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Loại bảo trì</div>
                    <div className="font-medium">{getMaintenanceTypeLabel(viewingRecord.maintenance_type)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Số km</div>
                    <div className="font-medium">
                      {viewingRecord.mileage ? viewingRecord.mileage.toLocaleString() : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Mô tả công việc</div>
                  <div className="font-medium">{viewingRecord.description}</div>
                </div>

                {viewingRecord.garage_name && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Thông tin garage</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Garage</div>
                        <div>{viewingRecord.garage_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Thợ</div>
                        <div>{viewingRecord.mechanic_name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Địa chỉ</div>
                        <div>{viewingRecord.garage_address || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">SĐT</div>
                        <div>{viewingRecord.garage_phone || "-"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {viewingRecord.items && viewingRecord.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Chi tiết chi phí</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left">Loại</th>
                          <th className="px-2 py-1 text-left">Tên hạng mục</th>
                          <th className="px-2 py-1 text-right">SL</th>
                          <th className="px-2 py-1 text-right">Đơn giá</th>
                          <th className="px-2 py-1 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingRecord.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-2 py-1">{getItemTypeLabel(item.item_type)}</td>
                            <td className="px-2 py-1">
                              {item.item_name}
                              {item.part_number && (
                                <div className="text-xs text-gray-500">Mã: {item.part_number}</div>
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {item.quantity} {item.unit || ""}
                            </td>
                            <td className="px-2 py-1 text-right">{item.unit_price.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right font-medium">
                              {item.total_price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan={4} className="px-2 py-2 text-right">
                            Tổng cộng:
                          </td>
                          <td className="px-2 py-2 text-right">
                            {viewingRecord.total_cost?.toLocaleString()} đ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {viewingRecord.note && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-gray-500">Ghi chú</div>
                    <div>{viewingRecord.note}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t mt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

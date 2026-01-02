"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Pagination, { PageSizeSelector } from "@/components/Pagination";
import { Camera, Upload, X } from "lucide-react";

// Helper functions for number formatting
function formatNumber(value: string | number): string {
  if (!value && value !== 0) return "";
  const num = typeof value === "string" ? value.replace(/,/g, "") : value.toString();
  const parts = num.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function parseFormattedNumber(value: string): string {
  return value.replace(/,/g, "");
}

// Helper function to get display name for driver (use short_name if available, otherwise last word of full name)
function getDriverDisplayName(driver: { name: string; short_name?: string } | null | undefined): string {
  if (!driver) return "";
  if (driver.short_name) return driver.short_name;
  // Fallback: get last word of full name
  const parts = driver.name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

// Color palette for drivers - distinct background colors
const DRIVER_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-green-100", text: "text-green-800" },
  { bg: "bg-yellow-100", text: "text-yellow-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-pink-100", text: "text-pink-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
  { bg: "bg-red-100", text: "text-red-800" },
  { bg: "bg-orange-100", text: "text-orange-800" },
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-cyan-100", text: "text-cyan-800" },
];

// Get consistent color for a driver based on their index
function getDriverColor(index: number) {
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

interface FuelLog {
  id: string;
  date: string;
  vehicle_id: string;
  vehicle_plate?: string;
  driver_id: string;
  driver_name?: string;
  odometer_km: number;
  actual_liters: number;
  gps_liters?: number;
  difference_liters?: number;
  unit_price: number;
  discount_price?: number;
  total_amount: number;
  note?: string;
  payment_status: string;
  station_name?: string;
  station_location?: string;
  pump_image?: string;
  plate_image?: string;
  odometer_image?: string;
}

interface Vehicle {
  id: string;
  plate_no: string;
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
}

export default function FuelLogsPage() {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [importing, setImporting] = useState(false);

  // Image upload modal state
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Image upload form data
  const [imageFormData, setImageFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicle_id: "",
    driver_id: "",
    odometer_km: "",
    actual_liters: "",
    unit_price: "",
    total_amount: "",
    station_name: "",
    station_location: "",
    note: "",
  });

  // Filters
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const [sortField, setSortField] = useState<keyof FuelLog>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Create a map of driver_id to color index for consistent coloring
  const driverColorMap = useMemo(() => {
    const map = new Map<string, number>();
    drivers.forEach((driver, index) => {
      map.set(driver.id, index);
    });
    return map;
  }, [drivers]);

  // Create a map of driver_id to driver object for quick lookup
  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach((driver) => {
      map.set(driver.id, driver);
    });
    return map;
  }, [drivers]);

  // Form data
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicle_id: "",
    driver_id: "",
    odometer_km: "",
    actual_liters: "",
    gps_liters: "",
    unit_price: "",
    discount_price: "",
    total_amount: "",
    note: "",
    payment_status: "UNPAID",
    station_name: "",
    station_location: "",
  });

  useEffect(() => {
    fetchFuelLogs();
    fetchVehicles();
    fetchDrivers();
  }, [filterVehicle, filterDriver, filterPaymentStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicle, filterDriver, filterPaymentStatus, filterStartDate, filterEndDate, pageSize]);

  async function fetchFuelLogs() {
    try {
      const params = new URLSearchParams();
      if (filterVehicle) params.append("vehicle_id", filterVehicle);
      if (filterDriver) params.append("driver_id", filterDriver);
      if (filterPaymentStatus) params.append("payment_status", filterPaymentStatus);
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch fuel logs");
      const data = await res.json();
      setFuelLogs(data);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicles() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
    }
  }

  async function fetchDrivers() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data);
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        odometer_km: parseInt(parseFormattedNumber(formData.odometer_km)),
        actual_liters: parseFloat(parseFormattedNumber(formData.actual_liters)),
        gps_liters: formData.gps_liters ? parseFloat(parseFormattedNumber(formData.gps_liters)) : null,
        unit_price: parseInt(parseFormattedNumber(formData.unit_price)),
        discount_price: formData.discount_price ? parseInt(parseFormattedNumber(formData.discount_price)) : null,
        total_amount: parseInt(parseFormattedNumber(formData.total_amount)),
      };

      const url = editingLog
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs/${editingLog.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs`;

      const method = editingLog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to save fuel log");
      }

      await fetchFuelLogs();
      setShowForm(false);
      setEditingLog(null);
      resetForm();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa bản ghi đổ dầu này?")) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) throw new Error("Failed to delete fuel log");

      await fetchFuelLogs();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function handleEdit(log: FuelLog) {
    setEditingLog(log);
    setFormData({
      date: log.date,
      vehicle_id: log.vehicle_id,
      driver_id: log.driver_id,
      odometer_km: log.odometer_km.toString(),
      actual_liters: log.actual_liters.toString(),
      gps_liters: log.gps_liters?.toString() || "",
      unit_price: log.unit_price.toString(),
      discount_price: log.discount_price?.toString() || "",
      total_amount: log.total_amount.toString(),
      note: log.note || "",
      payment_status: log.payment_status,
      station_name: log.station_name || "",
      station_location: log.station_location || "",
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      vehicle_id: "",
      driver_id: "",
      odometer_km: "",
      actual_liters: "",
      gps_liters: "",
      unit_price: "",
      discount_price: "",
      total_amount: "",
      note: "",
      payment_status: "UNPAID",
      station_name: "",
      station_location: "",
    });
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs/import-excel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to import Excel');
      }

      const result = await res.json();

      let message = `Import thành công!\n`;
      message += `Đã nhập: ${result.imported} dòng\n`;
      if (result.skipped > 0) {
        message += `Bỏ qua: ${result.skipped} dòng\n`;
      }
      if (result.errors && result.errors.length > 0) {
        message += `\nLỗi:\n${result.errors.join('\n')}`;
      }

      alert(message);
      await fetchFuelLogs();

      // Reset file input
      e.target.value = '';
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
      e.target.value = '';
    } finally {
      setImporting(false);
    }
  }

  // Auto-calculate total amount
  useEffect(() => {
    if (formData.actual_liters && formData.unit_price) {
      const price = formData.discount_price || formData.unit_price;
      const total = parseFloat(formData.actual_liters) * parseInt(price);
      setFormData((prev) => ({ ...prev, total_amount: Math.round(total).toString() }));
    }
  }, [formData.actual_liters, formData.unit_price, formData.discount_price]);

  // Auto-calculate total amount for image upload form
  useEffect(() => {
    if (imageFormData.actual_liters && imageFormData.unit_price) {
      const total = parseFloat(imageFormData.actual_liters) * parseInt(imageFormData.unit_price);
      setImageFormData((prev) => ({ ...prev, total_amount: Math.round(total).toString() }));
    }
  }, [imageFormData.actual_liters, imageFormData.unit_price]);

  // Image upload handlers - simplified for multiple images
  function handleImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} không phải là file ảnh`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} quá lớn (tối đa 10MB)`);
        return;
      }
      if (uploadedImages.length + newFiles.length >= 5) {
        alert("Tối đa 5 ảnh");
        return;
      }
      newFiles.push(file);
    });

    // Generate previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setUploadedImages((prev) => [...prev, ...newFiles]);
  }

  function removeImage(index: number) {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function resetImageUploadForm() {
    setUploadedImages([]);
    setImagePreviews([]);
    setImageFormData({
      date: new Date().toISOString().split("T")[0],
      vehicle_id: "",
      driver_id: "",
      odometer_km: "",
      actual_liters: "",
      unit_price: "",
      total_amount: "",
      station_name: "",
      station_location: "",
      note: "",
    });
  }

  // Analyze images with AI
  async function handleAnalyzeImages() {
    if (uploadedImages.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ảnh");
      return;
    }

    setAnalyzingImages(true);
    try {
      const formDataObj = new FormData();
      uploadedImages.forEach((file) => {
        formDataObj.append("images", file);
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs/analyze-images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formDataObj,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Phân tích thất bại");
      }

      const result = await res.json();

      // Auto-fill form with extracted data
      setImageFormData((prev) => ({
        ...prev,
        date: result.date || prev.date,
        odometer_km: result.odometer_km?.toString() || prev.odometer_km,
        actual_liters: result.actual_liters?.toString() || prev.actual_liters,
        unit_price: result.unit_price?.toString() || prev.unit_price,
        total_amount: result.total_amount?.toString() || prev.total_amount,
        station_name: result.station_name || prev.station_name,
        station_location: result.station_location || prev.station_location,
      }));

      // Try to match vehicle by plate
      if (result.vehicle_plate) {
        const matchedVehicle = vehicles.find(
          (v) => v.plate_no.replace(/[.\-\s]/g, "").toLowerCase() ===
                 result.vehicle_plate.replace(/[.\-\s]/g, "").toLowerCase()
        );
        if (matchedVehicle) {
          setImageFormData((prev) => ({ ...prev, vehicle_id: matchedVehicle.id }));

          // Auto-select driver if vehicle has a default driver
          const matchedDriver = drivers.find((d) => d.id === (matchedVehicle as any).driver_id);
          if (matchedDriver) {
            setImageFormData((prev) => ({ ...prev, driver_id: matchedDriver.id }));
          }
        }
      }

      alert("Phân tích thành công! Vui lòng kiểm tra và điền các thông tin còn thiếu.");
    } catch (err: any) {
      alert("Lỗi phân tích: " + err.message);
    } finally {
      setAnalyzingImages(false);
    }
  }

  async function handleImageUploadSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (uploadedImages.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ảnh");
      return;
    }

    if (!imageFormData.vehicle_id || !imageFormData.driver_id) {
      alert("Vui lòng chọn xe và tài xế");
      return;
    }

    if (!imageFormData.odometer_km || !imageFormData.actual_liters || !imageFormData.unit_price) {
      alert("Vui lòng điền đầy đủ thông tin: Km, Lít xăng, Đơn giá");
      return;
    }

    setUploadingImages(true);
    try {
      const formDataObj = new FormData();

      // Add all images
      uploadedImages.forEach((file) => {
        formDataObj.append("images", file);
      });

      // Add form data
      formDataObj.append("date", imageFormData.date);
      formDataObj.append("vehicle_id", imageFormData.vehicle_id);
      formDataObj.append("driver_id", imageFormData.driver_id);
      formDataObj.append("odometer_km", parseFormattedNumber(imageFormData.odometer_km));
      formDataObj.append("actual_liters", parseFormattedNumber(imageFormData.actual_liters));
      formDataObj.append("unit_price", parseFormattedNumber(imageFormData.unit_price));
      formDataObj.append("total_amount", parseFormattedNumber(imageFormData.total_amount));
      if (imageFormData.station_name) formDataObj.append("station_name", imageFormData.station_name);
      if (imageFormData.station_location) formDataObj.append("station_location", imageFormData.station_location);
      if (imageFormData.note) formDataObj.append("note", imageFormData.note);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-logs/upload-images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formDataObj,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Upload failed");
      }

      alert("Tạo bản ghi thành công!");

      // Reset and close modal
      resetImageUploadForm();
      setShowImageUploadModal(false);
      await fetchFuelLogs();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setUploadingImages(false);
    }
  }

  // Filtered and sorted data
  const sortedLogs = useMemo(() => {
    return [...fuelLogs].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [fuelLogs, sortField, sortOrder]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLogs.slice(startIndex, startIndex + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedLogs.length / pageSize);

  function handleSort(field: keyof FuelLog) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  function downloadTemplate() {
    // Create Excel template data
    const headers = [
      "Ngày",
      "Số xe",
      "Tài xế",
      "Chỉ số đồng hồ Km xe",
      "Đổ thực tế",
      "Đơn giá",
      "Tổng tiền",
      "Ghi chú",
      "Trạng thái thanh toán"
    ];

    const sampleData = [
      ["2024-01-07", "50E-482.52", "Nguyễn Văn Tuyến", "129470", "250.67", "18750", "4700006", "Xe đổ dầu ngoài", "PAID"],
      ["2024-01-22", "50E-482.52", "Nguyễn Văn Tuyến", "131959", "252.82", "19780", "5000780", "Xe đổ dầu ngoài", "PAID"],
    ];

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "fuel_logs_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Theo dõi đổ dầu</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={downloadTemplate}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">⬇️ </span>Tải mẫu
          </button>
          <button
            onClick={() => setShowImageUploadModal(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Upload </span>Ảnh
          </button>
          <label className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded cursor-pointer text-xs sm:text-sm ${
            importing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}>
            {importing ? "Importing..." : <><span className="hidden sm:inline">📁 </span>Import</>}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingLog(null);
              resetForm();
            }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
          >
            {showForm ? "Đóng" : "+ Thêm"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-3 sm:p-4 border rounded bg-gray-50">
          <h2 className="font-bold mb-3 text-sm sm:text-base">
            {editingLog ? "Sửa bản ghi" : "Thêm bản ghi mới"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs mb-1">Ngày *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Số xe *</label>
              <select
                value={formData.vehicle_id}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_id: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
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
              <label className="block text-xs mb-1">Tài xế *</label>
              <select
                value={formData.driver_id}
                onChange={(e) =>
                  setFormData({ ...formData, driver_id: e.target.value })
                }
                className={`w-full text-xs border rounded px-2 py-1 ${
                  formData.driver_id
                    ? `${getDriverColor(driverColorMap.get(formData.driver_id) ?? 0).bg} ${getDriverColor(driverColorMap.get(formData.driver_id) ?? 0).text} font-medium`
                    : ""
                }`}
                required
              >
                <option value="">-- Chọn tài xế --</option>
                {drivers.map((d, idx) => (
                  <option key={d.id} value={d.id} className={`${getDriverColor(idx).bg} ${getDriverColor(idx).text}`}>
                    {getDriverDisplayName(d)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">Chỉ số đồng hồ Km *</label>
              <input
                type="text"
                value={formatNumber(formData.odometer_km)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, odometer_km: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Đổ thực tế (lít) *</label>
              <input
                type="text"
                value={formatNumber(formData.actual_liters)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*\.?\d*$/.test(raw)) {
                    setFormData({ ...formData, actual_liters: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Đổ trên định vị (lít)</label>
              <input
                type="text"
                value={formatNumber(formData.gps_liters)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*\.?\d*$/.test(raw)) {
                    setFormData({ ...formData, gps_liters: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Đơn giá (VND/lít) *</label>
              <input
                type="text"
                value={formatNumber(formData.unit_price)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, unit_price: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Giá chiết khấu (VND/lít)</label>
              <input
                type="text"
                value={formatNumber(formData.discount_price)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, discount_price: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Tổng tiền (VND) *</label>
              <input
                type="text"
                value={formatNumber(formData.total_amount)}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, total_amount: raw });
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Tên trạm</label>
              <input
                type="text"
                value={formData.station_name}
                onChange={(e) =>
                  setFormData({ ...formData, station_name: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Địa điểm trạm</label>
              <input
                type="text"
                value={formData.station_location}
                onChange={(e) =>
                  setFormData({ ...formData, station_location: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Trạng thái thanh toán *</label>
              <select
                value={formData.payment_status}
                onChange={(e) =>
                  setFormData({ ...formData, payment_status: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
                required
              >
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
              </select>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs mb-1">Ghi chú</label>
              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                className="w-full text-xs border rounded px-2 py-1"
                rows={2}
              />
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingLog ? "Cập nhật" : "Tạo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingLog(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters - Responsive */}
      <div className="mb-4 p-3 sm:p-4 border rounded bg-gray-50">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs mb-1">Xe</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="">Tất cả</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1">Tài xế</label>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className={`w-full text-xs border rounded px-2 py-1 ${
                filterDriver
                  ? `${getDriverColor(driverColorMap.get(filterDriver) ?? 0).bg} ${getDriverColor(driverColorMap.get(filterDriver) ?? 0).text} font-medium`
                  : ""
              }`}
            >
              <option value="">Tất cả</option>
              {drivers.map((d, idx) => (
                <option key={d.id} value={d.id} className={`${getDriverColor(idx).bg} ${getDriverColor(idx).text}`}>
                  {getDriverDisplayName(d)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1">Trạng thái TT</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="">Tất cả</option>
              <option value="UNPAID">Chưa TT</option>
              <option value="PAID">Đã TT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1">Từ ngày</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Đến ngày</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>

      <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />

      {/* Table - Responsive with horizontal scroll on mobile */}
      <div className="border rounded overflow-x-auto max-h-[calc(100vh-280px)]">
        <table className="w-full text-xs min-w-[800px]">
          <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
            <tr>
              <th
                className="px-2 py-2 text-left font-bold cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                onClick={() => handleSort("date")}
              >
                Ngày {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Số xe</th>
              <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Tài xế</th>
              <th
                className="px-2 py-2 text-right font-bold cursor-pointer hover:bg-gray-200 whitespace-nowrap hidden sm:table-cell"
                onClick={() => handleSort("odometer_km")}
              >
                Km {sortField === "odometer_km" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 text-right font-bold cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                onClick={() => handleSort("actual_liters")}
              >
                Lít {sortField === "actual_liters" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap hidden lg:table-cell">GPS</th>
              <th className="px-2 py-2 text-right font-bold whitespace-nowrap hidden lg:table-cell">CL</th>
              <th
                className="px-2 py-2 text-right font-bold cursor-pointer hover:bg-gray-200 whitespace-nowrap hidden md:table-cell"
                onClick={() => handleSort("unit_price")}
              >
                Đ.giá {sortField === "unit_price" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 text-right font-bold cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                onClick={() => handleSort("total_amount")}
              >
                Tổng {sortField === "total_amount" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-2 py-2 text-center font-bold whitespace-nowrap">TT</th>
              <th className="px-2 py-2 text-center font-bold whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="px-2 py-2 whitespace-nowrap">{log.date}</td>
                <td className="px-2 py-2 whitespace-nowrap">{log.vehicle_plate}</td>
                <td className="px-2 py-2">
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      log.driver_id
                        ? `${getDriverColor(driverColorMap.get(log.driver_id) ?? 0).bg} ${getDriverColor(driverColorMap.get(log.driver_id) ?? 0).text}`
                        : ""
                    }`}
                  >
                    {getDriverDisplayName(driverMap.get(log.driver_id) || { name: log.driver_name || "" })}
                  </span>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap hidden sm:table-cell">{formatNumber(log.odometer_km)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{log.actual_liters.toFixed(2)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap hidden lg:table-cell">
                  {log.gps_liters ? log.gps_liters.toFixed(2) : "-"}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap hidden lg:table-cell">
                  {log.difference_liters ? (
                    <span
                      className={
                        log.difference_liters > 0
                          ? "text-red-600"
                          : log.difference_liters < 0
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {log.difference_liters.toFixed(2)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap hidden md:table-cell">
                  {formatNumber(log.unit_price)}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap font-medium">
                  {formatNumber(log.total_amount)}
                </td>
                <td className="px-2 py-2 text-center">
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                      log.payment_status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {log.payment_status === "PAID" ? "✓" : "○"}
                  </span>
                </td>
                <td className="px-2 py-2 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(log)}
                    className="text-blue-600 hover:underline mr-1 sm:mr-2"
                    title="Sửa"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-red-600 hover:underline"
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedLogs.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="bản ghi"
      />

      {/* Image Upload Modal - Responsive */}
      {showImageUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-xl font-bold">Tạo bản ghi từ ảnh</h2>
              <button
                onClick={() => {
                  setShowImageUploadModal(false);
                  resetImageUploadForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleImageUploadSubmit}>
              {/* Simplified Image Upload Area - Responsive */}
              <div className="mb-4 sm:mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-6">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImagesSelect}
                    className="hidden"
                  />

                  {imagePreviews.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Image ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {imagePreviews.length < 5 && (
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="h-24 flex flex-col items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300 hover:bg-gray-100"
                          >
                            <Upload className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Thêm</span>
                          </button>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleAnalyzeImages}
                          disabled={analyzingImages}
                          className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 ${
                            analyzingImages ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
                          }`}
                        >
                          {analyzingImages ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Đang phân tích...
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5" />
                              Phân tích AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full py-8 flex flex-col items-center justify-center hover:bg-gray-50 rounded"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <span className="text-gray-600 font-medium">Chọn ảnh đổ xăng</span>
                      <span className="text-sm text-gray-400 mt-1">Tải lên 1-5 ảnh (bơm xăng, biển số, đồng hồ km...)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày *</label>
                  <input
                    type="date"
                    value={imageFormData.date}
                    onChange={(e) => setImageFormData({ ...imageFormData, date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Số xe *</label>
                  <select
                    value={imageFormData.vehicle_id}
                    onChange={(e) => setImageFormData({ ...imageFormData, vehicle_id: e.target.value })}
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
                  <label className="block text-sm font-medium mb-1">Tài xế *</label>
                  <select
                    value={imageFormData.driver_id}
                    onChange={(e) => setImageFormData({ ...imageFormData, driver_id: e.target.value })}
                    className={`w-full border rounded px-3 py-2 ${
                      imageFormData.driver_id
                        ? `${getDriverColor(driverColorMap.get(imageFormData.driver_id) ?? 0).bg} ${getDriverColor(driverColorMap.get(imageFormData.driver_id) ?? 0).text} font-medium`
                        : ""
                    }`}
                    required
                  >
                    <option value="">-- Chọn tài xế --</option>
                    {drivers.map((d, idx) => (
                      <option key={d.id} value={d.id} className={`${getDriverColor(idx).bg} ${getDriverColor(idx).text}`}>
                        {getDriverDisplayName(d)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Chỉ số đồng hồ Km *</label>
                  <input
                    type="text"
                    value={formatNumber(imageFormData.odometer_km)}
                    onChange={(e) => {
                      const raw = parseFormattedNumber(e.target.value);
                      if (/^\d*$/.test(raw)) {
                        setImageFormData({ ...imageFormData, odometer_km: raw });
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Đổ thực tế (lít) *</label>
                  <input
                    type="text"
                    value={formatNumber(imageFormData.actual_liters)}
                    onChange={(e) => {
                      const raw = parseFormattedNumber(e.target.value);
                      if (/^\d*\.?\d*$/.test(raw)) {
                        setImageFormData({ ...imageFormData, actual_liters: raw });
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Đơn giá (VND/lít) *</label>
                  <input
                    type="text"
                    value={formatNumber(imageFormData.unit_price)}
                    onChange={(e) => {
                      const raw = parseFormattedNumber(e.target.value);
                      if (/^\d*$/.test(raw)) {
                        setImageFormData({ ...imageFormData, unit_price: raw });
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tổng tiền (VND) *</label>
                  <input
                    type="text"
                    value={formatNumber(imageFormData.total_amount)}
                    onChange={(e) => {
                      const raw = parseFormattedNumber(e.target.value);
                      if (/^\d*$/.test(raw)) {
                        setImageFormData({ ...imageFormData, total_amount: raw });
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tên trạm xăng</label>
                  <input
                    type="text"
                    value={imageFormData.station_name}
                    onChange={(e) => setImageFormData({ ...imageFormData, station_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={imageFormData.station_location}
                    onChange={(e) => setImageFormData({ ...imageFormData, station_location: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={imageFormData.note}
                  onChange={(e) => setImageFormData({ ...imageFormData, note: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImageUploadModal(false);
                    resetImageUploadForm();
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className={`px-4 py-2 rounded text-white ${
                    uploadingImages ? "bg-gray-400" : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {uploadingImages ? "Đang tải lên..." : "Tạo bản ghi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface Certificate {
  id: string;
  employee_id: string;
  employee?: Employee;
  certificate_name: string;
  certificate_type: string;
  certificate_number?: string;
  issuing_organization?: string;
  issue_date: string;
  expiry_date?: string;
  training_id?: string;
  license_class?: string;
  file_url?: string;
  is_verified: boolean;
  alert_before_days: number;
  notes?: string;
}

const CERT_TYPES = [
  { value: "DRIVER_LICENSE", label: "Bằng lái xe", color: "bg-blue-100 text-blue-700" },
  { value: "SAFETY", label: "An toàn lao động", color: "bg-orange-100 text-orange-700" },
  { value: "PROFESSIONAL", label: "Chứng chỉ nghề", color: "bg-purple-100 text-purple-700" },
  { value: "TRAINING", label: "Đào tạo nội bộ", color: "bg-green-100 text-green-700" },
  { value: "LANGUAGE", label: "Ngoại ngữ", color: "bg-yellow-100 text-yellow-700" },
  { value: "IT", label: "CNTT", color: "bg-indigo-100 text-indigo-700" },
  { value: "OTHER", label: "Khác", color: "bg-gray-100 text-gray-700" },
];

export default function CertificationsPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterExpiring, setFilterExpiring] = useState(false);

  const [form, setForm] = useState({
    employee_id: "",
    certificate_name: "",
    certificate_type: "PROFESSIONAL",
    issuing_organization: "",
    issue_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    license_class: "",
    notes: "",
  });

  useEffect(() => {
    fetchCertificates();
    fetchEmployees();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Certificate[]>("/hrm/training/certificates");
      setCertificates(data || []);
    } catch (error) {
      console.error("Failed to fetch certificates:", error);
      // Mock data
      setCertificates([
        {
          id: "1",
          employee_id: "emp1",
          employee: { id: "emp1", employee_code: "TX001", full_name: "Nguyen Van Driver" },
          certificate_name: "Bằng lái xe hạng FC",
          certificate_type: "DRIVER_LICENSE",
          certificate_number: "FC-123456",
          issuing_organization: "Sở GTVT TP.HCM",
          issue_date: "2020-05-15",
          expiry_date: "2025-05-15",
          license_class: "FC",
          is_verified: true,
          alert_before_days: 30,
        },
        {
          id: "2",
          employee_id: "emp2",
          employee: { id: "emp2", employee_code: "NV002", full_name: "Tran Thi Safety" },
          certificate_name: "Chứng chỉ an toàn lao động",
          certificate_type: "SAFETY",
          issuing_organization: "Trung tâm ATLĐ",
          issue_date: "2024-01-10",
          expiry_date: "2025-01-10",
          is_verified: true,
          alert_before_days: 30,
        },
        {
          id: "3",
          employee_id: "emp3",
          employee: { id: "emp3", employee_code: "NV003", full_name: "Le Van English" },
          certificate_name: "TOEIC 750",
          certificate_type: "LANGUAGE",
          issuing_organization: "ETS",
          issue_date: "2023-06-20",
          expiry_date: "2025-06-20",
          is_verified: true,
          alert_before_days: 60,
        },
        {
          id: "4",
          employee_id: "emp1",
          employee: { id: "emp1", employee_code: "TX001", full_name: "Nguyen Van Driver" },
          certificate_name: "ADR - Vận chuyển hàng nguy hiểm",
          certificate_type: "SAFETY",
          issuing_organization: "Sở GTVT",
          issue_date: "2023-03-01",
          expiry_date: "2025-01-01",
          is_verified: true,
          alert_before_days: 30,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200&status=ACTIVE");
      setEmployees(data.items || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await apiFetch("/hrm/training/certificates", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      fetchCertificates();
    } catch (error: any) {
      alert(error?.message || "Thêm chứng chỉ thất bại");
    }
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpiryStatus = (cert: Certificate) => {
    const days = getDaysUntilExpiry(cert.expiry_date);
    if (days === null) return { label: "Không hết hạn", color: "text-gray-500", icon: CheckCircle };
    if (days < 0) return { label: "Đã hết hạn", color: "text-red-600", icon: AlertTriangle };
    if (days <= cert.alert_before_days)
      return { label: `Còn ${days} ngày`, color: "text-yellow-600", icon: Clock };
    return { label: `Còn ${days} ngày`, color: "text-green-600", icon: CheckCircle };
  };

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.certificate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.employee?.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || cert.certificate_type === filterType;
    const matchesExpiring =
      !filterExpiring ||
      (cert.expiry_date && getDaysUntilExpiry(cert.expiry_date)! <= 30);
    return matchesSearch && matchesType && matchesExpiring;
  });

  const expiringCount = certificates.filter(
    (c) => c.expiry_date && getDaysUntilExpiry(c.expiry_date)! <= 30 && getDaysUntilExpiry(c.expiry_date)! >= 0
  ).length;
  const expiredCount = certificates.filter(
    (c) => c.expiry_date && getDaysUntilExpiry(c.expiry_date)! < 0
  ).length;
  const validCount = certificates.filter(
    (c) => !c.expiry_date || getDaysUntilExpiry(c.expiry_date)! > 30
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chứng chỉ & Bằng cấp</h1>
          <p className="text-gray-600 mt-1">Quản lý chứng chỉ, bằng lái, giấy phép của nhân viên</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm chứng chỉ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng số</div>
              <div className="text-2xl font-bold text-gray-900">{certificates.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Còn hiệu lực</div>
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Sắp hết hạn</div>
              <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã hết hạn</div>
              <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên chứng chỉ, nhân viên..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả loại</option>
            {CERT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filterExpiring}
              onChange={(e) => setFilterExpiring(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm">Sắp hết hạn (30 ngày)</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chưa có chứng chỉ nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nhân viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Chứng chỉ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Loại
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ngày cấp
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ngày hết hạn
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCertificates.map((cert) => {
                const typeConfig = CERT_TYPES.find((t) => t.value === cert.certificate_type);
                const expiryStatus = getExpiryStatus(cert);
                const StatusIcon = expiryStatus.icon;

                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {cert.employee?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cert.employee?.employee_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{cert.certificate_name}</div>
                      {cert.issuing_organization && (
                        <div className="text-sm text-gray-500">
                          {cert.issuing_organization}
                        </div>
                      )}
                      {cert.license_class && (
                        <div className="text-sm text-blue-600">Hạng: {cert.license_class}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${typeConfig?.color}`}>
                        {typeConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {new Date(cert.issue_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {cert.expiry_date
                        ? new Date(cert.expiry_date).toLocaleDateString("vi-VN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`flex items-center justify-center gap-1 ${expiryStatus.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm">{expiryStatus.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Thêm chứng chỉ</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên chứng chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.certificate_name}
                  onChange={(e) => setForm({ ...form, certificate_name: e.target.value })}
                  placeholder="VD: Bằng lái xe hạng FC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={form.certificate_type}
                    onChange={(e) => setForm({ ...form, certificate_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {CERT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hạng (nếu có)
                  </label>
                  <input
                    type="text"
                    value={form.license_class}
                    onChange={(e) => setForm({ ...form, license_class: e.target.value })}
                    placeholder="VD: FC, B2, C..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nơi cấp
                </label>
                <input
                  type="text"
                  value={form.issuing_organization}
                  onChange={(e) => setForm({ ...form, issuing_organization: e.target.value })}
                  placeholder="VD: Sở GTVT TP.HCM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.employee_id || !form.certificate_name || !form.issue_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

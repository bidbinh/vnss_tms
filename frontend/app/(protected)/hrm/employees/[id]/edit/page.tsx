"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, User, Loader2, Link as LinkIcon, Copy, ExternalLink, Eye, RefreshCw, Share2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import BankSelect from "@/components/BankSelect";

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Position {
  id: string;
  code: string;
  name: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  position_name?: string;
}

interface NameCard {
  id: string;
  token: string;
  public_url: string;
  is_active: boolean;
  view_count: number;
  last_viewed_at: string | null;
}

interface EmployeeDetail {
  id: string;
  employee_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  id_issue_date: string | null;
  id_issue_place: string | null;
  permanent_address: string | null;
  current_address: string | null;
  employee_type: string;
  status: string;
  join_date: string | null;
  branch_id: string | null;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  tax_code: string | null;
  social_insurance_number: string | null;
  health_insurance_number: string | null;
  notes: string | null;
  avatar_url: string | null;
  zalo_phone: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  namecard: NameCard | null;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [namecard, setNamecard] = useState<NameCard | null>(null);

  const [formData, setFormData] = useState({
    employee_code: "",
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    id_number: "",
    id_issue_date: "",
    id_issue_place: "",
    permanent_address: "",
    current_address: "",
    employee_type: "FULL_TIME",
    status: "ACTIVE",
    join_date: "",
    branch_id: "",
    department_id: "",
    position_id: "",
    manager_id: "",
    bank_name: "",
    bank_account: "",
    bank_account_name: "",
    tax_code: "",
    social_insurance_number: "",
    health_insurance_number: "",
    notes: "",
    avatar_url: "",
    zalo_phone: "",
    facebook_url: "",
    linkedin_url: "",
    website_url: "",
  });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employee, deptData, posData, branchData, employeesData] = await Promise.all([
        apiFetch<EmployeeDetail>(`/hrm/employees/${employeeId}`),
        apiFetch<Department[]>("/hrm/departments").catch(() => []),
        apiFetch<Position[]>("/hrm/positions").catch(() => []),
        apiFetch<Branch[]>("/hrm/branches").catch(() => []),
        apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200").catch(() => ({ items: [] })),
      ]);

      setDepartments(deptData);
      setPositions(posData);
      setBranches(branchData);
      // Filter out current employee from manager list
      setEmployees(employeesData.items.filter(e => e.id !== employeeId));

      // Set namecard
      setNamecard(employee.namecard);

      // Map employee data to form
      setFormData({
        employee_code: employee.employee_code || "",
        full_name: employee.full_name || "",
        date_of_birth: employee.date_of_birth?.split("T")[0] || "",
        gender: employee.gender || "",
        phone: employee.phone || "",
        email: employee.email || "",
        id_number: employee.id_number || "",
        id_issue_date: employee.id_issue_date?.split("T")[0] || "",
        id_issue_place: employee.id_issue_place || "",
        permanent_address: employee.permanent_address || "",
        current_address: employee.current_address || "",
        employee_type: employee.employee_type || "FULL_TIME",
        status: employee.status || "ACTIVE",
        join_date: employee.join_date?.split("T")[0] || "",
        branch_id: employee.branch_id || "",
        department_id: employee.department_id || "",
        position_id: employee.position_id || "",
        manager_id: employee.manager_id || "",
        bank_name: employee.bank_name || "",
        bank_account: employee.bank_account || "",
        bank_account_name: employee.bank_account_name || "",
        tax_code: employee.tax_code || "",
        social_insurance_number: employee.social_insurance_number || "",
        health_insurance_number: employee.health_insurance_number || "",
        notes: employee.notes || "",
        avatar_url: employee.avatar_url || "",
        zalo_phone: employee.zalo_phone || "",
        facebook_url: employee.facebook_url || "",
        linkedin_url: employee.linkedin_url || "",
        website_url: employee.website_url || "",
      });
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      alert("Không thể tải thông tin nhân viên");
      router.push("/hrm/employees");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Filter out empty strings, convert to null for optional fields
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== "") {
          payload[key] = value;
        } else if (["branch_id", "department_id", "position_id", "manager_id"].includes(key)) {
          payload[key] = null;
        }
      }

      await apiFetch(`/hrm/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push("/hrm/employees");
    } catch (error: any) {
      console.error("Failed to update employee:", error);
      alert(error.message || "Không thể cập nhật nhân viên");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/hrm/employees"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa nhân viên</h1>
          <p className="text-gray-600">{formData.employee_code} - {formData.full_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Thông tin cơ bản
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã nhân viên
              </label>
              <input
                type="text"
                value={formData.employee_code}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">Mã không thể thay đổi</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giới tính
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0901234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ID Card */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Giấy tờ tùy thân</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số CCCD/CMND
              </label>
              <input
                type="text"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày cấp
              </label>
              <input
                type="date"
                name="id_issue_date"
                value={formData.id_issue_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nơi cấp
              </label>
              <input
                type="text"
                name="id_issue_place"
                value={formData.id_issue_place}
                onChange={handleChange}
                placeholder="Cục CS QLHC về TTXH"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Địa chỉ</h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ thường trú
              </label>
              <input
                type="text"
                name="permanent_address"
                value={formData.permanent_address}
                onChange={handleChange}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ hiện tại
              </label>
              <input
                type="text"
                name="current_address"
                value={formData.current_address}
                onChange={handleChange}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin công việc</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại nhân viên
              </label>
              <select
                name="employee_type"
                value={formData.employee_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="FULL_TIME">Toàn thời gian</option>
                <option value="PART_TIME">Bán thời gian</option>
                <option value="CONTRACT">Hợp đồng</option>
                <option value="INTERN">Thực tập</option>
                <option value="FREELANCER">Cộng tác viên</option>
                <option value="DRIVER">Tài xế</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Đang làm việc</option>
                <option value="PROBATION">Thử việc</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
                <option value="SUSPENDED">Tạm đình chỉ</option>
                <option value="RESIGNED">Đã nghỉ</option>
                <option value="TERMINATED">Chấm dứt HĐ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày vào làm
              </label>
              <input
                type="date"
                name="join_date"
                value={formData.join_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chi nhánh
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phòng ban
              </label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chức vụ
              </label>
              <select
                name="position_id"
                value={formData.position_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn chức vụ --</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quản lý trực tiếp
              </label>
              <select
                name="manager_id"
                value={formData.manager_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Không có --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} {e.position_name ? `(${e.position_name})` : `(${e.employee_code})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bank Info */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin ngân hàng</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngân hàng
              </label>
              <BankSelect
                value={formData.bank_name}
                onChange={(bankName) => setFormData((prev) => ({ ...prev, bank_name: bankName }))}
                placeholder="Chọn ngân hàng..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tài khoản
              </label>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên chủ tài khoản
              </label>
              <input
                type="text"
                name="bank_account_name"
                value={formData.bank_account_name}
                onChange={handleChange}
                placeholder="NGUYEN VAN A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Insurance & Tax */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Bảo hiểm & Thuế</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã số thuế cá nhân
              </label>
              <input
                type="text"
                name="tax_code"
                value={formData.tax_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số sổ BHXH
              </label>
              <input
                type="text"
                name="social_insurance_number"
                value={formData.social_insurance_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số thẻ BHYT
              </label>
              <input
                type="text"
                name="health_insurance_number"
                value={formData.health_insurance_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Ghi chú</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Ghi chú thêm..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Social Links & Avatar */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            Thông tin Name Card
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Thông tin này sẽ hiển thị trên Name Card online của nhân viên
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ảnh đại diện (URL)
              </label>
              <input
                type="url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Link ảnh đại diện (upload lên cloud rồi dán link vào)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số Zalo
              </label>
              <input
                type="tel"
                name="zalo_phone"
                value={formData.zalo_phone}
                onChange={handleChange}
                placeholder="0901234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Số điện thoại Zalo (thường giống số phone)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <input
                type="url"
                name="facebook_url"
                value={formData.facebook_url}
                onChange={handleChange}
                placeholder="https://facebook.com/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website cá nhân
              </label>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                placeholder="https://portfolio.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Name Card */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-purple-600" />
            Name Card Online
          </h2>

          {namecard ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  namecard.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {namecard.is_active ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                </span>
                {namecard.view_count > 0 && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {namecard.view_count} lượt xem
                  </span>
                )}
              </div>

              {/* Link */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${namecard.public_url}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${namecard.public_url}`;
                    navigator.clipboard.writeText(url);
                    alert("Đã sao chép link!");
                  }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Sao chép link"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <a
                  href={namecard.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Xem Name Card"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <p className="text-xs text-gray-500">
                Link này có thể chia sẻ công khai. Người xem không cần đăng nhập.
              </p>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Name Card sẽ được tạo tự động khi lưu nhân viên.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/hrm/employees"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Đang lưu..." : "Cập nhật"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, User, Key, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
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

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nextCode, setNextCode] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);

  // User account state
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userAccountData, setUserAccountData] = useState({
    username: "",
    password: "",
    role_ids: [] as string[],
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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
    join_date: new Date().toISOString().split("T")[0],
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
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [deptData, posData, branchData, employeesData, nextCodeData, rolesData] = await Promise.all([
        apiFetch<Department[]>("/hrm/departments").catch(() => []),
        apiFetch<Position[]>("/hrm/positions").catch(() => []),
        apiFetch<Branch[]>("/hrm/branches").catch(() => []),
        apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200").catch(() => ({ items: [] })),
        apiFetch<{ next_code: string }>("/hrm/employees/next-code").catch(() => ({ next_code: "1" })),
        apiFetch<{ roles: Role[] }>("/roles?limit=50").catch(() => ({ roles: [] })),
      ]);
      setDepartments(deptData);
      setPositions(posData);
      setBranches(branchData);
      setEmployees(employeesData.items);
      setNextCode(nextCodeData.next_code);
      setRoles(rolesData.roles);
    } catch (error) {
      console.error("Failed to fetch options:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleId: string) => {
    setUserAccountData((prev) => {
      const current = prev.role_ids;
      if (current.includes(roleId)) {
        return { ...prev, role_ids: current.filter((id) => id !== roleId) };
      } else {
        return { ...prev, role_ids: [...current, roleId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedPassword(null);

    try {
      // Filter out empty strings
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== "") {
          payload[key] = value;
        }
      }

      // Add user account data if checkbox is checked
      if (createUserAccount) {
        payload.user_account = {
          create_account: true,
          username: userAccountData.username || undefined,
          password: userAccountData.password || undefined,
          role_ids: userAccountData.role_ids,
        };
      }

      const result = await apiFetch<any>("/hrm/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Show generated password if available
      if (result.user_account?.generated_password) {
        setGeneratedPassword(result.user_account.generated_password);
        toast.success(
          `Tạo nhân viên thành công! Mật khẩu tài khoản: ${result.user_account.generated_password}`,
          { duration: 10000 }
        );
        // Wait for user to see the password before redirecting
        setTimeout(() => {
          router.push("/hrm/employees");
        }, 3000);
      } else {
        toast.success("Tạo nhân viên thành công!");
        router.push("/hrm/employees");
      }
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      toast.error(error.message || "Không thể tạo nhân viên");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Thêm nhân viên mới</h1>
          <p className="text-gray-600">Nhập thông tin nhân viên</p>
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
                value={nextCode || "Đang tạo..."}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">Mã tự động tăng</p>
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

        {/* User Account */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-green-600" />
            Tài khoản đăng nhập
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createUserAccount}
                onChange={(e) => setCreateUserAccount(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="font-medium">Tạo tài khoản đăng nhập cho nhân viên này</span>
            </label>

            {createUserAccount && (
              <div className="pl-8 space-y-4 border-l-2 border-blue-200">
                <p className="text-sm text-gray-600">
                  Tài khoản sẽ được tạo với username là số điện thoại hoặc email của nhân viên.
                  Nếu không nhập mật khẩu, hệ thống sẽ tự động tạo.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={userAccountData.username}
                      onChange={(e) =>
                        setUserAccountData((prev) => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="Mặc định: SĐT hoặc Email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu (tùy chọn)
                    </label>
                    <input
                      type="password"
                      value={userAccountData.password}
                      onChange={(e) =>
                        setUserAccountData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Để trống = tự động tạo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Phân quyền (chọn 1 hoặc nhiều role)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          userAccountData.role_ids.includes(role.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={userAccountData.role_ids.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <div>
                          <div className="font-medium text-sm">{role.name}</div>
                          <div className="text-xs text-gray-500">{role.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {roles.length === 0 && (
                    <p className="text-sm text-gray-500">Chưa có role nào. Vui lòng tạo role trước.</p>
                  )}
                  {userAccountData.role_ids.length === 0 && roles.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      * Nếu không chọn, hệ thống sẽ gán role mặc định dựa trên loại nhân viên
                    </p>
                  )}
                </div>
              </div>
            )}

            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  Mật khẩu được tạo: <span className="font-mono bg-green-100 px-2 py-1 rounded">{generatedPassword}</span>
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Hãy ghi lại mật khẩu này để cung cấp cho nhân viên.
                </p>
              </div>
            )}
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
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Đang lưu..." : "Lưu nhân viên"}
          </button>
        </div>
      </form>
    </div>
  );
}

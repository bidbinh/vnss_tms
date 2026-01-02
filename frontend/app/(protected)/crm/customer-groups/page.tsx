"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_percent: number;
  credit_limit_default: number;
  payment_terms_default: string | null;
  priority: number;
  is_active: boolean;
  customer_count: number;
  created_at: string | null;
}

interface GroupsResponse {
  items: CustomerGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function CustomerGroupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discount_percent: 0,
    credit_limit_default: 0,
    payment_terms_default: "",
    priority: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchGroups();
  }, [router, page, search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "50",
      });
      if (search) params.append("search", search);

      const res = await apiFetch<GroupsResponse>(`/crm/customer-groups?${params}`);
      setGroups(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to fetch customer groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await apiFetch(`/crm/customer-groups/${editingGroup.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch("/crm/customer-groups", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingGroup(null);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error("Failed to save customer group:", error);
      alert("Lỗi khi lưu nhóm khách hàng");
    }
  };

  const handleEdit = (group: CustomerGroup) => {
    setEditingGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || "",
      discount_percent: group.discount_percent,
      credit_limit_default: group.credit_limit_default,
      payment_terms_default: group.payment_terms_default || "",
      priority: group.priority,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (group: CustomerGroup) => {
    try {
      await apiFetch(`/crm/customer-groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !group.is_active }),
      });
      fetchGroups();
    } catch (error) {
      console.error("Failed to toggle group status:", error);
    }
  };

  const handleDelete = async (group: CustomerGroup) => {
    if (group.customer_count > 0) {
      alert(`Không thể xóa nhóm có ${group.customer_count} khách hàng. Hãy chuyển khách hàng sang nhóm khác trước.`);
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa nhóm "${group.name}"?`)) return;

    try {
      await apiFetch(`/crm/customer-groups/${group.id}`, { method: "DELETE" });
      fetchGroups();
    } catch (error) {
      console.error("Failed to delete customer group:", error);
      alert("Lỗi khi xóa nhóm khách hàng");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      discount_percent: 0,
      credit_limit_default: 0,
      payment_terms_default: "",
      priority: 0,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhóm Khách Hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý phân loại khách hàng</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingGroup(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm nhóm mới
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhóm khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên nhóm</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Giảm giá</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hạn mức TĐ</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Số KH</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-blue-600">{group.code}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{group.name}</div>
                  {group.priority > 0 && (
                    <span className="text-xs text-gray-500">Độ ưu tiên: {group.priority}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {group.description || "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {group.discount_percent > 0 ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <Percent className="w-3 h-3" />
                      {group.discount_percent}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {group.credit_limit_default > 0 ? (
                    <span className="font-medium">{formatCurrency(group.credit_limit_default)}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/crm/accounts?customer_group_id=${group.id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Users className="w-4 h-4" />
                    {group.customer_count}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(group)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      group.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {group.is_active ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Hoạt động
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        Ngừng
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Xóa"
                      disabled={group.customer_count > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Chưa có nhóm khách hàng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingGroup ? "Sửa nhóm khách hàng" : "Thêm nhóm khách hàng mới"}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã nhóm *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!!editingGroup}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên nhóm *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      % Giảm giá mặc định
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hạn mức tín dụng mặc định
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.credit_limit_default}
                      onChange={(e) => setFormData({ ...formData, credit_limit_default: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Điều khoản thanh toán
                    </label>
                    <select
                      value={formData.payment_terms_default}
                      onChange={(e) => setFormData({ ...formData, payment_terms_default: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn --</option>
                      <option value="COD">COD</option>
                      <option value="NET15">NET 15</option>
                      <option value="NET30">NET 30</option>
                      <option value="NET45">NET 45</option>
                      <option value="NET60">NET 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Độ ưu tiên
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGroup(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingGroup ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

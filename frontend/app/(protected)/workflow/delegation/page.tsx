"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  X,
  UserCheck,
  ArrowRight,
} from "lucide-react";

interface Delegation {
  id: string;
  delegator_name: string;
  delegate_name: string;
  workflow_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

// Mock data - trong thực tế sẽ gọi API
const mockDelegations: Delegation[] = [
  {
    id: "1",
    delegator_name: "Nguyễn Văn A",
    delegate_name: "Trần Văn B",
    workflow_type: "Tất cả",
    start_date: "2025-01-01",
    end_date: "2025-01-15",
    reason: "Nghỉ phép",
    status: "ACTIVE",
  },
];

export default function DelegationPage() {
  const [delegations, setDelegations] = useState<Delegation[]>(mockDelegations);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    delegate_name: "",
    workflow_type: "ALL",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const handleCreate = () => {
    const newDelegation: Delegation = {
      id: Date.now().toString(),
      delegator_name: "Người dùng hiện tại",
      delegate_name: formData.delegate_name,
      workflow_type: formData.workflow_type === "ALL" ? "Tất cả" : formData.workflow_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
      status: "ACTIVE",
    };
    setDelegations([...delegations, newDelegation]);
    setShowCreateModal(false);
    setFormData({
      delegate_name: "",
      workflow_type: "ALL",
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa ủy quyền này?")) {
      setDelegations(delegations.filter((d) => d.id !== id));
    }
  };

  const filteredDelegations = delegations.filter(
    (d) =>
      d.delegate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.delegator_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ủy quyền</h1>
          <p className="text-gray-500">Quản lý ủy quyền xử lý workflow</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo ủy quyền
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Về chức năng ủy quyền</h3>
            <p className="text-sm text-blue-700 mt-1">
              Bạn có thể ủy quyền cho người khác xử lý các workflow thay bạn trong một khoảng thời
              gian nhất định (ví dụ: khi nghỉ phép, đi công tác).
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Delegations Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Người ủy quyền
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Người được ủy quyền
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Loại workflow
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Thời gian
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDelegations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Chưa có ủy quyền nào
                </td>
              </tr>
            ) : (
              filteredDelegations.map((delegation) => (
                <tr key={delegation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <span>{delegation.delegator_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{delegation.delegate_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                      {delegation.workflow_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {delegation.start_date} - {delegation.end_date}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        delegation.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {delegation.status === "ACTIVE" ? "Đang hoạt động" : "Hết hạn"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(delegation.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Tạo ủy quyền mới</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ủy quyền cho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.delegate_name}
                  onChange={(e) => setFormData({ ...formData, delegate_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên người được ủy quyền"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại workflow</label>
                <select
                  value={formData.workflow_type}
                  onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả workflow</option>
                  <option value="APPROVAL">Phê duyệt</option>
                  <option value="PURCHASE">Mua hàng</option>
                  <option value="LEAVE">Nghỉ phép</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lý do</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Nghỉ phép, đi công tác..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tạo ủy quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

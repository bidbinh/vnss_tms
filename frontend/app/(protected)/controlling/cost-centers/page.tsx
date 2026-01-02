"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Layers, Building2 } from "lucide-react";

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  parent_id: string | null;
  manager_name: string;
  is_active: boolean;
  created_at: string;
}

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCostCenters([
        {
          id: "1",
          code: "CC001",
          name: "Bộ phận Vận tải",
          description: "Chi phí vận tải và logistics",
          type: "DEPARTMENT",
          parent_id: null,
          manager_name: "Nguyễn Văn A",
          is_active: true,
          created_at: "2024-01-15",
        },
        {
          id: "2",
          code: "CC002",
          name: "Bộ phận Kho vận",
          description: "Chi phí kho bãi và lưu trữ",
          type: "DEPARTMENT",
          parent_id: null,
          manager_name: "Trần Thị B",
          is_active: true,
          created_at: "2024-01-15",
        },
        {
          id: "3",
          code: "CC003",
          name: "Bộ phận IT",
          description: "Chi phí công nghệ thông tin",
          type: "DEPARTMENT",
          parent_id: null,
          manager_name: "Lê Văn C",
          is_active: true,
          created_at: "2024-02-01",
        },
        {
          id: "4",
          code: "CC004",
          name: "Bộ phận Nhân sự",
          description: "Chi phí nhân sự và đào tạo",
          type: "DEPARTMENT",
          parent_id: null,
          manager_name: "Phạm Thị D",
          is_active: true,
          created_at: "2024-02-01",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredCostCenters = costCenters.filter(
    (cc) =>
      cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Centers</h1>
          <p className="text-gray-500">Quản lý trung tâm chi phí</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm Cost Center
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hoặc tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tên Cost Center
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Quản lý
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCostCenters.map((cc) => (
              <tr key={cc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{cc.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{cc.name}</p>
                    <p className="text-sm text-gray-500">{cc.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {cc.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {cc.manager_name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      cc.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {cc.is_active ? "Hoạt động" : "Ngừng"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal placeholder */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Thêm Cost Center mới</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VD: CC005"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Tên cost center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Mô tả chi tiết"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

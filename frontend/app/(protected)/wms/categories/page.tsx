"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Package,
  Thermometer,
  Droplets,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Loader2,
} from "lucide-react";

interface Category {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  level: number;
  requires_lot: boolean;
  requires_serial: boolean;
  requires_expiry: boolean;
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_max: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  children?: Category[];
}

interface CategoryFormData {
  code: string;
  name: string;
  parent_id: string | null;
  requires_lot: boolean;
  requires_serial: boolean;
  requires_expiry: boolean;
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_max: number | null;
  notes: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    code: "",
    name: "",
    parent_id: null,
    requires_lot: false,
    requires_serial: false,
    requires_expiry: false,
    temperature_min: null,
    temperature_max: null,
    humidity_max: null,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/categories?size=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch categories");

      const data = await res.json();
      const items: Category[] = data.items || [];
      setFlatCategories(items);

      // Build tree structure
      const map = new Map<string, Category>();
      items.forEach((cat) => {
        map.set(cat.id, { ...cat, children: [] });
      });

      const tree: Category[] = [];
      map.forEach((cat) => {
        if (cat.parent_id && map.has(cat.parent_id)) {
          const parent = map.get(cat.parent_id)!;
          parent.children = parent.children || [];
          parent.children.push(cat);
        } else {
          tree.push(cat);
        }
      });

      // Sort by code
      const sortCategories = (cats: Category[]): Category[] => {
        return cats
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((cat) => ({
            ...cat,
            children: cat.children ? sortCategories(cat.children) : [],
          }));
      };

      setCategories(sortCategories(tree));
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Không thể tải danh mục. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(flatCategories.map((c) => c.id));
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const openCreateModal = (parentId?: string) => {
    setEditingCategory(null);
    setFormData({
      code: "",
      name: "",
      parent_id: parentId || null,
      requires_lot: false,
      requires_serial: false,
      requires_expiry: false,
      temperature_min: null,
      temperature_max: null,
      humidity_max: null,
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      parent_id: category.parent_id,
      requires_lot: category.requires_lot,
      requires_serial: category.requires_serial,
      requires_expiry: category.requires_expiry,
      temperature_min: category.temperature_min,
      temperature_max: category.temperature_max,
      humidity_max: category.humidity_max,
      notes: category.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const url = editingCategory
        ? `${API_BASE}/wms/categories/${editingCategory.id}`
        : `${API_BASE}/wms/categories`;

      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          temperature_min: formData.temperature_min || null,
          temperature_max: formData.temperature_max || null,
          humidity_max: formData.humidity_max || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save category");
      }

      setShowModal(false);
      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/categories/${category.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete category");
      }

      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể xóa danh mục";
      alert(errorMessage);
    }
  };

  const filterCategories = (cats: Category[], term: string): Category[] => {
    if (!term) return cats;
    const lowerTerm = term.toLowerCase();

    const result: Category[] = [];
    for (const cat of cats) {
      const children = cat.children ? filterCategories(cat.children, term) : [];
      const matches =
        cat.code.toLowerCase().includes(lowerTerm) ||
        cat.name.toLowerCase().includes(lowerTerm);

      if (matches || children.length > 0) {
        result.push({ ...cat, children });
      }
    }
    return result;
  };

  const filteredCategories = filterCategories(categories, searchTerm);

  const renderCategory = (category: Category, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 py-3 px-4 hover:bg-gray-50 border-b ${
            depth > 0 ? "bg-gray-50/50" : ""
          }`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => toggleExpand(category.id)}
            className={`p-1 rounded hover:bg-gray-200 ${
              !hasChildren ? "invisible" : ""
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Icon */}
          <div
            className={`p-2 rounded-lg ${
              category.is_active ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <FolderTree
              className={`w-4 h-4 ${
                category.is_active ? "text-blue-600" : "text-gray-400"
              }`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{category.name}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {category.code}
              </span>
              {!category.is_active && (
                <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                  Không hoạt động
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {category.requires_lot && (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" /> Theo lô
                </span>
              )}
              {category.requires_serial && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Serial
                </span>
              )}
              {category.requires_expiry && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Hạn dùng
                </span>
              )}
              {(category.temperature_min !== null || category.temperature_max !== null) && (
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  {category.temperature_min ?? "-"}°C ~ {category.temperature_max ?? "-"}°C
                </span>
              )}
              {category.humidity_max !== null && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> ≤{category.humidity_max}%
                </span>
              )}
            </div>
          </div>

          {/* Products count placeholder */}
          <div className="text-sm text-gray-500">
            {hasChildren && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {category.children?.length} nhóm con
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => openCreateModal(category.id)}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
              title="Thêm danh mục con"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openEditModal(category)}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
              title="Sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category)}
              className="p-1.5 hover:bg-gray-100 rounded text-red-500"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && category.children?.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh mục sản phẩm</h1>
          <p className="text-gray-500">Quản lý phân loại sản phẩm theo nhóm</p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Mở rộng tất cả
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderTree className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{flatCategories.length}</p>
              <p className="text-sm text-gray-500">Tổng danh mục</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {flatCategories.filter((c) => c.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {flatCategories.filter((c) => c.requires_lot).length}
              </p>
              <p className="text-sm text-gray-500">Theo dõi lô</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Thermometer className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {flatCategories.filter((c) => c.temperature_min !== null || c.temperature_max !== null).length}
              </p>
              <p className="text-sm text-gray-500">Yêu cầu nhiệt độ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-900">Cây danh mục</h2>
        </div>
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? "Không tìm thấy danh mục phù hợp"
              : "Chưa có danh mục nào. Nhấn \"Thêm danh mục\" để bắt đầu."}
          </div>
        ) : (
          <div className="divide-y">
            {filteredCategories.map((cat) => renderCategory(cat))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã danh mục *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="VD: CAT001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên danh mục *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="VD: Linh kiện điện tử"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục cha
                  </label>
                  <select
                    value={formData.parent_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parent_id: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Không có (Danh mục gốc) --</option>
                    {flatCategories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {"  ".repeat(cat.level - 1)}
                          {cat.code} - {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Tracking options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theo dõi sản phẩm
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_lot}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_lot: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Theo dõi lô (Lot/Batch)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_serial}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_serial: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Theo dõi Serial</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_expiry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_expiry: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Theo dõi hạn dùng</span>
                    </label>
                  </div>
                </div>

                {/* Storage conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Điều kiện bảo quản
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Nhiệt độ tối thiểu (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.temperature_min ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            temperature_min: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: 2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Nhiệt độ tối đa (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.temperature_max ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            temperature_max: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: 8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Độ ẩm tối đa (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.humidity_max ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            humidity_max: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: 60"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Mô tả thêm về danh mục..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCategory ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

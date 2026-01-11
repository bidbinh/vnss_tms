"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Plus,
  Building,
  Users,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Department {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  branch_id: string | null;
  manager: {
    id: string;
    full_name: string;
    employee_code: string;
  } | null;
  employee_count: number;
  is_active: boolean;
  children?: Department[];
}

export default function DepartmentsPage() {
  const t = useTranslations("hrm.departmentsPage");
  const tCommon = useTranslations("common");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [treeData, setTreeData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    parent_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [listData, treeDataRes] = await Promise.all([
        apiFetch<Department[]>("/hrm/departments"),
        apiFetch<Department[]>("/hrm/departments/tree"),
      ]);
      setDepartments(listData);
      setTreeData(treeDataRes);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const openCreateModal = (parentId?: string) => {
    setEditingDept(null);
    setFormData({
      code: "",
      name: "",
      parent_id: parentId || "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      parent_id: dept.parent_id || "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare payload - convert empty strings to null
      const payload = {
        ...formData,
        parent_id: formData.parent_id || null,
      };

      if (editingDept) {
        await apiFetch(`/hrm/departments/${editingDept.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/hrm/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchDepartments();
    } catch (error: any) {
      console.error("Failed to save department:", error);
      const message = error?.message || error?.detail || t("saveError");
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      await apiFetch(`/hrm/departments/${id}`, { method: "DELETE" });
      fetchDepartments();
    } catch (error: any) {
      console.error("Failed to delete department:", error);
      alert(error.message || t("deleteError"));
    }
  };

  const renderTreeNode = (dept: Department, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedIds.has(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-2 py-2 px-4 hover:bg-gray-50 border-b border-gray-100`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(dept.id)} className="p-1 hover:bg-gray-200 rounded">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Building className="w-4 h-4 text-blue-500" />

          <div className="flex-1">
            <div className="font-medium text-gray-900">{dept.name}</div>
            <div className="text-xs text-gray-500">{dept.code}</div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{dept.employee_count}</span>
          </div>

          {dept.manager && (
            <div className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded">
              {dept.manager.full_name}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setOpenMenuId(openMenuId === dept.id ? null : dept.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            {openMenuId === dept.id && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    openCreateModal(dept.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <Plus className="w-4 h-4" />
                  {t("addSubDepartment")}
                </button>
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    openEditModal(dept);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <Edit className="w-4 h-4" />
                  {t("actions.edit")}
                </button>
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    handleDelete(dept.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("actions.delete")}
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {dept.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === "list" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              {t("viewModes.list")}
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === "tree" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              {t("viewModes.tree")}
            </button>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t("addDepartment")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">{t("stats.totalDepartments")}</div>
          <div className="text-2xl font-bold text-gray-900">{departments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">{t("stats.level1Departments")}</div>
          <div className="text-2xl font-bold text-gray-900">
            {departments.filter((d) => !d.parent_id).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">{t("stats.totalEmployees")}</div>
          <div className="text-2xl font-bold text-gray-900">
            {departments.reduce((sum, d) => sum + d.employee_count, 0)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : viewMode === "tree" ? (
          <div>
            {treeData.length === 0 ? (
              <div className="text-center p-8 text-gray-500">{t("noData")}</div>
            ) : (
              treeData.map((dept) => renderTreeNode(dept))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.code")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.name")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.parent")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.manager")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.employeeCount")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{dept.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-500" />
                        <span>{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {dept.parent_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {dept.manager ? dept.manager.full_name : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{dept.employee_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(dept)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingDept ? t("modal.editTitle") : t("modal.createTitle")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.code")} *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.name")} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.parent")}
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("modal.noParent")}</option>
                  {departments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.notes")}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {editingDept ? tCommon("update") : tCommon("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

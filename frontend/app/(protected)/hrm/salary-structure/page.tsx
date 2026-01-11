"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Layers,
  Calculator,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SalaryComponent {
  id: string;
  code: string;
  name: string;
  component_type: string;
  calculation_type: string;
  default_amount: number;
  is_taxable: boolean;
  is_insurance_base: boolean;
  sort_order: number;
  is_active: boolean;
}

interface SalaryStructure {
  id: string;
  code: string;
  name: string;
  description: string | null;
  employee_type: string | null;
  is_active: boolean;
  is_default: boolean;
  components: SalaryComponent[];
}

const COMPONENT_TYPES_CONFIG = [
  { value: "EARNING", color: "bg-green-100 text-green-700" },
  { value: "DEDUCTION", color: "bg-red-100 text-red-700" },
  { value: "EMPLOYER_CONTRIBUTION", color: "bg-blue-100 text-blue-700" },
];

const CALCULATION_TYPES_CONFIG = [
  { value: "FIXED" },
  { value: "PERCENT" },
  { value: "FORMULA" },
];

const EMPLOYEE_TYPES_CONFIG = [
  { value: "" },
  { value: "FULL_TIME" },
  { value: "PART_TIME" },
  { value: "DRIVER" },
  { value: "CONTRACT" },
];

export default function SalaryStructurePage() {
  const t = useTranslations("hrm.salaryStructurePage");
  const tCommon = useTranslations("common");
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStructure, setExpandedStructure] = useState<string | null>(null);

  // Modals
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);

  // Form data
  const [structureForm, setStructureForm] = useState({
    code: "",
    name: "",
    description: "",
    employee_type: "",
  });

  const [componentForm, setComponentForm] = useState({
    code: "",
    name: "",
    component_type: "EARNING",
    calculation_type: "FIXED",
    default_amount: 0,
    is_taxable: true,
    is_insurance_base: false,
    sort_order: 0,
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SalaryStructure[]>("/hrm/payroll/structures?include_inactive=true");
      setStructures(data || []);
    } catch (error) {
      console.error("Failed to fetch structures:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async () => {
    try {
      await apiFetch("/hrm/payroll/structures", {
        method: "POST",
        body: JSON.stringify(structureForm),
      });
      setShowStructureModal(false);
      setStructureForm({ code: "", name: "", description: "", employee_type: "" });
      fetchStructures();
    } catch (error: any) {
      alert(error?.message || t("errors.createStructureFailed"));
    }
  };

  const handleCreateComponent = async () => {
    if (!selectedStructureId) return;

    try {
      await apiFetch(`/hrm/payroll/structures/${selectedStructureId}/components`, {
        method: "POST",
        body: JSON.stringify({
          structure_id: selectedStructureId,
          ...componentForm,
        }),
      });
      setShowComponentModal(false);
      setComponentForm({
        code: "",
        name: "",
        component_type: "EARNING",
        calculation_type: "FIXED",
        default_amount: 0,
        is_taxable: true,
        is_insurance_base: false,
        sort_order: 0,
      });
      fetchStructures();
    } catch (error: any) {
      alert(error?.message || t("errors.createComponentFailed"));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getComponentTypeConfig = (type: string) => {
    const config = COMPONENT_TYPES_CONFIG.find((t) => t.value === type) || COMPONENT_TYPES_CONFIG[0];
    return {
      ...config,
      label: t(`componentTypes.${type}` as any) || type
    };
  };

  const getCalculationTypeLabel = (type: string) => {
    return t(`calculationTypes.${type}` as any) || type;
  };

  const getEmployeeTypeLabel = (type: string) => {
    if (!type) return t("employeeTypes.ALL");
    return t(`employeeTypes.${type}` as any) || type;
  };

  const toggleExpand = (structureId: string) => {
    setExpandedStructure(expandedStructure === structureId ? null : structureId);
  };

  const openAddComponent = (structureId: string) => {
    setSelectedStructureId(structureId);
    setEditingComponent(null);
    setComponentForm({
      code: "",
      name: "",
      component_type: "EARNING",
      calculation_type: "FIXED",
      default_amount: 0,
      is_taxable: true,
      is_insurance_base: false,
      sort_order: 0,
    });
    setShowComponentModal(true);
  };

  // Calculate totals for each structure
  const calculateTotals = (components: SalaryComponent[]) => {
    let earnings = 0;
    let deductions = 0;

    components.forEach((comp) => {
      if (comp.is_active) {
        if (comp.component_type === "EARNING") {
          earnings += comp.default_amount;
        } else if (comp.component_type === "DEDUCTION") {
          deductions += comp.default_amount;
        }
      }
    });

    return { earnings, deductions, net: earnings - deductions };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingStructure(null);
            setStructureForm({ code: "", name: "", description: "", employee_type: "" });
            setShowStructureModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("addStructure")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("stats.totalStructures")}</div>
              <div className="text-2xl font-bold text-gray-900">{structures.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("stats.active")}</div>
              <div className="text-2xl font-bold text-green-600">
                {structures.filter((s) => s.is_active).length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("stats.totalComponents")}</div>
              <div className="text-2xl font-bold text-purple-600">
                {structures.reduce((sum, s) => sum + s.components.length, 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Settings className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("stats.default")}</div>
              <div className="text-2xl font-bold text-yellow-600">
                {structures.filter((s) => s.is_default).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structures List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : structures.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t("noStructures")}</h3>
          <p className="text-gray-500 mb-4">{t("noStructuresDesc")}</p>
          <button
            onClick={() => setShowStructureModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("addStructure")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {structures.map((structure) => {
            const isExpanded = expandedStructure === structure.id;
            const totals = calculateTotals(structure.components);
            const employeeTypeLabel = getEmployeeTypeLabel(structure.employee_type || "");

            return (
              <div
                key={structure.id}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
              >
                {/* Structure Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(structure.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{structure.name}</span>
                        <span className="text-sm text-gray-500">({structure.code})</span>
                        {structure.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            {t("labels.default")}
                          </span>
                        )}
                        {!structure.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {t("labels.inactive")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {structure.description || t("labels.noDescription")}
                        {structure.employee_type && (
                          <span className="ml-2 text-blue-600">• {employeeTypeLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{t("labels.earnings")}</div>
                      <div className="font-medium text-green-600">{formatCurrency(totals.earnings)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{t("labels.deductions")}</div>
                      <div className="font-medium text-red-600">{formatCurrency(totals.deductions)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{t("labels.netPay")}</div>
                      <div className="font-bold text-blue-600">{formatCurrency(totals.net)}</div>
                    </div>
                    <div className="text-sm text-gray-500">{structure.components.length} {t("labels.components")}</div>
                  </div>
                </div>

                {/* Components List */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{t("labels.salaryComponents")}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddComponent(structure.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="w-3 h-3" />
                        {t("labels.add")}
                      </button>
                    </div>

                    {structure.components.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {t("noComponentsYet")}
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("columns.code")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("columns.name")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("columns.type")}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("columns.calculation")}
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              {t("columns.amount")}
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              {t("columns.tax")}
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              {t("columns.insurance")}
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              {t("columns.status")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {structure.components.map((comp) => {
                            const typeConfig = getComponentTypeConfig(comp.component_type);
                            const calcTypeLabel = getCalculationTypeLabel(comp.calculation_type);

                            return (
                              <tr key={comp.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                  {comp.code}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {comp.name}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 text-xs rounded ${typeConfig.color}`}
                                  >
                                    {typeConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {calcTypeLabel}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                  {comp.calculation_type === "PERCENT"
                                    ? `${comp.default_amount}%`
                                    : formatCurrency(comp.default_amount)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {comp.is_taxable ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {comp.is_insurance_base ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {comp.is_active ? (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                      {t("labels.active")}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                      {t("labels.disabled")}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingStructure ? t("structureModal.editTitle") : t("structureModal.createTitle")}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("structureModal.structureCode")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={structureForm.code}
                  onChange={(e) => setStructureForm({ ...structureForm, code: e.target.value })}
                  placeholder={t("structureModal.structureCodePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("structureModal.structureName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  placeholder={t("structureModal.structureNamePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("structureModal.employeeType")}</label>
                <select
                  value={structureForm.employee_type}
                  onChange={(e) => setStructureForm({ ...structureForm, employee_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {EMPLOYEE_TYPES_CONFIG.map((type) => (
                    <option key={type.value} value={type.value}>
                      {getEmployeeTypeLabel(type.value)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("structureModal.description")}</label>
                <textarea
                  value={structureForm.description}
                  onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                  placeholder={t("structureModal.descriptionPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowStructureModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleCreateStructure}
                disabled={!structureForm.code || !structureForm.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingStructure ? tCommon("update") : tCommon("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Component Modal */}
      {showComponentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingComponent ? t("componentModal.editTitle") : t("componentModal.createTitle")}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("componentModal.componentCode")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={componentForm.code}
                    onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value })}
                    placeholder={t("componentModal.componentCodePlaceholder")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("componentModal.componentName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={componentForm.name}
                    onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                    placeholder={t("componentModal.componentNamePlaceholder")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("componentModal.type")}</label>
                  <select
                    value={componentForm.component_type}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, component_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {COMPONENT_TYPES_CONFIG.map((type) => (
                      <option key={type.value} value={type.value}>
                        {t(`componentTypes.${type.value}` as any)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("componentModal.calculation")}</label>
                  <select
                    value={componentForm.calculation_type}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, calculation_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CALCULATION_TYPES_CONFIG.map((type) => (
                      <option key={type.value} value={type.value}>
                        {t(`calculationTypes.${type.value}` as any)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("componentModal.defaultAmount")}
                </label>
                <input
                  type="number"
                  value={componentForm.default_amount}
                  onChange={(e) =>
                    setComponentForm({ ...componentForm, default_amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("componentModal.sortOrder")}</label>
                <input
                  type="number"
                  value={componentForm.sort_order}
                  onChange={(e) =>
                    setComponentForm({ ...componentForm, sort_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_taxable}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, is_taxable: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t("componentModal.taxable")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_insurance_base}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, is_insurance_base: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t("componentModal.insuranceBase")}</span>
                </label>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowComponentModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleCreateComponent}
                disabled={!componentForm.code || !componentForm.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingComponent ? tCommon("update") : tCommon("add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">{t("instructions.title")}</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- {t("instructions.structureDesc")}</li>
          <li>- {t("instructions.componentDesc")}</li>
          <li>- {t("instructions.overrideDesc")}</li>
          <li>- {t("instructions.taxDesc")}</li>
          <li>- {t("instructions.insuranceDesc")}</li>
        </ul>
      </div>
    </div>
  );
}

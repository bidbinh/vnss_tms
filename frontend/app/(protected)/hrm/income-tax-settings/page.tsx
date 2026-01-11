"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface IncomeTaxSetting {
  id: string;
  effective_from: string;
  effective_to: string | null;
  personal_deduction: number;
  dependent_deduction: number;
  bracket_1_limit: number;
  bracket_1_rate: number;
  bracket_2_limit: number;
  bracket_2_rate: number;
  bracket_2_deduction: number;
  bracket_3_limit: number;
  bracket_3_rate: number;
  bracket_3_deduction: number;
  bracket_4_limit: number;
  bracket_4_rate: number;
  bracket_4_deduction: number;
  bracket_5_limit: number;
  bracket_5_rate: number;
  bracket_5_deduction: number;
  bracket_6_limit: number;
  bracket_6_rate: number;
  bracket_6_deduction: number;
  bracket_7_rate: number;
  bracket_7_deduction: number;
  social_insurance_rate: number;
  health_insurance_rate: number;
  unemployment_insurance_rate: number;
  total_insurance_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  effective_from: string;
  effective_to: string;
  personal_deduction: string;
  dependent_deduction: string;
  bracket_1_limit: string;
  bracket_1_rate: string;
  bracket_2_limit: string;
  bracket_2_rate: string;
  bracket_2_deduction: string;
  bracket_3_limit: string;
  bracket_3_rate: string;
  bracket_3_deduction: string;
  bracket_4_limit: string;
  bracket_4_rate: string;
  bracket_4_deduction: string;
  bracket_5_limit: string;
  bracket_5_rate: string;
  bracket_5_deduction: string;
  bracket_6_limit: string;
  bracket_6_rate: string;
  bracket_6_deduction: string;
  bracket_7_rate: string;
  bracket_7_deduction: string;
  social_insurance_rate: string;
  health_insurance_rate: string;
  unemployment_insurance_rate: string;
  status: string;
}

export default function IncomeTaxSettingsPage() {
  const t = useTranslations("hrm.incomeTaxSettingsPage");
  const tCommon = useTranslations("common");

  const [settings, setSettings] = useState<IncomeTaxSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<IncomeTaxSetting | null>(null);
  const [formData, setFormData] = useState<FormData>({
    effective_from: "",
    effective_to: "",
    personal_deduction: "11000000",
    dependent_deduction: "4400000",
    bracket_1_limit: "5000000",
    bracket_1_rate: "0.05",
    bracket_2_limit: "10000000",
    bracket_2_rate: "0.10",
    bracket_2_deduction: "250000",
    bracket_3_limit: "18000000",
    bracket_3_rate: "0.15",
    bracket_3_deduction: "750000",
    bracket_4_limit: "32000000",
    bracket_4_rate: "0.20",
    bracket_4_deduction: "1650000",
    bracket_5_limit: "52000000",
    bracket_5_rate: "0.25",
    bracket_5_deduction: "3250000",
    bracket_6_limit: "80000000",
    bracket_6_rate: "0.30",
    bracket_6_deduction: "5850000",
    bracket_7_rate: "0.35",
    bracket_7_deduction: "9850000",
    social_insurance_rate: "0.08",
    health_insurance_rate: "0.015",
    unemployment_insurance_rate: "0.01",
    status: "ACTIVE"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/income-tax-settings/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (setting?: IncomeTaxSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        effective_from: setting.effective_from,
        effective_to: setting.effective_to || "",
        personal_deduction: setting.personal_deduction.toString(),
        dependent_deduction: setting.dependent_deduction.toString(),
        bracket_1_limit: setting.bracket_1_limit.toString(),
        bracket_1_rate: setting.bracket_1_rate.toString(),
        bracket_2_limit: setting.bracket_2_limit.toString(),
        bracket_2_rate: setting.bracket_2_rate.toString(),
        bracket_2_deduction: setting.bracket_2_deduction.toString(),
        bracket_3_limit: setting.bracket_3_limit.toString(),
        bracket_3_rate: setting.bracket_3_rate.toString(),
        bracket_3_deduction: setting.bracket_3_deduction.toString(),
        bracket_4_limit: setting.bracket_4_limit.toString(),
        bracket_4_rate: setting.bracket_4_rate.toString(),
        bracket_4_deduction: setting.bracket_4_deduction.toString(),
        bracket_5_limit: setting.bracket_5_limit.toString(),
        bracket_5_rate: setting.bracket_5_rate.toString(),
        bracket_5_deduction: setting.bracket_5_deduction.toString(),
        bracket_6_limit: setting.bracket_6_limit.toString(),
        bracket_6_rate: setting.bracket_6_rate.toString(),
        bracket_6_deduction: setting.bracket_6_deduction.toString(),
        bracket_7_rate: setting.bracket_7_rate.toString(),
        bracket_7_deduction: setting.bracket_7_deduction.toString(),
        social_insurance_rate: setting.social_insurance_rate.toString(),
        health_insurance_rate: setting.health_insurance_rate.toString(),
        unemployment_insurance_rate: setting.unemployment_insurance_rate.toString(),
        status: setting.status
      });
    } else {
      setEditingSetting(null);
      setFormData({
        effective_from: new Date().toISOString().split("T")[0],
        effective_to: "",
        personal_deduction: "11000000",
        dependent_deduction: "4400000",
        bracket_1_limit: "5000000",
        bracket_1_rate: "0.05",
        bracket_2_limit: "10000000",
        bracket_2_rate: "0.10",
        bracket_2_deduction: "250000",
        bracket_3_limit: "18000000",
        bracket_3_rate: "0.15",
        bracket_3_deduction: "750000",
        bracket_4_limit: "32000000",
        bracket_4_rate: "0.20",
        bracket_4_deduction: "1650000",
        bracket_5_limit: "52000000",
        bracket_5_rate: "0.25",
        bracket_5_deduction: "3250000",
        bracket_6_limit: "80000000",
        bracket_6_rate: "0.30",
        bracket_6_deduction: "5850000",
        bracket_7_rate: "0.35",
        bracket_7_deduction: "9850000",
        social_insurance_rate: "0.08",
        health_insurance_rate: "0.015",
        unemployment_insurance_rate: "0.01",
        status: "ACTIVE"
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSetting(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const social_insurance_rate = parseFloat(formData.social_insurance_rate);
    const health_insurance_rate = parseFloat(formData.health_insurance_rate);
    const unemployment_insurance_rate = parseFloat(formData.unemployment_insurance_rate);
    const total_insurance_rate = social_insurance_rate + health_insurance_rate + unemployment_insurance_rate;

    const payload = {
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
      personal_deduction: parseInt(formData.personal_deduction),
      dependent_deduction: parseInt(formData.dependent_deduction),
      bracket_1_limit: parseInt(formData.bracket_1_limit),
      bracket_1_rate: parseFloat(formData.bracket_1_rate),
      bracket_2_limit: parseInt(formData.bracket_2_limit),
      bracket_2_rate: parseFloat(formData.bracket_2_rate),
      bracket_2_deduction: parseInt(formData.bracket_2_deduction),
      bracket_3_limit: parseInt(formData.bracket_3_limit),
      bracket_3_rate: parseFloat(formData.bracket_3_rate),
      bracket_3_deduction: parseInt(formData.bracket_3_deduction),
      bracket_4_limit: parseInt(formData.bracket_4_limit),
      bracket_4_rate: parseFloat(formData.bracket_4_rate),
      bracket_4_deduction: parseInt(formData.bracket_4_deduction),
      bracket_5_limit: parseInt(formData.bracket_5_limit),
      bracket_5_rate: parseFloat(formData.bracket_5_rate),
      bracket_5_deduction: parseInt(formData.bracket_5_deduction),
      bracket_6_limit: parseInt(formData.bracket_6_limit),
      bracket_6_rate: parseFloat(formData.bracket_6_rate),
      bracket_6_deduction: parseInt(formData.bracket_6_deduction),
      bracket_7_rate: parseFloat(formData.bracket_7_rate),
      bracket_7_deduction: parseInt(formData.bracket_7_deduction),
      social_insurance_rate: social_insurance_rate,
      health_insurance_rate: health_insurance_rate,
      unemployment_insurance_rate: unemployment_insurance_rate,
      total_insurance_rate: total_insurance_rate,
      status: formData.status
    };

    try {
      const token = localStorage.getItem("access_token");
      const url = editingSetting
        ? `http://127.0.0.1:8000/api/v1/income-tax-settings/${editingSetting.id}`
        : "http://127.0.0.1:8000/api/v1/income-tax-settings/";
      const method = editingSetting ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchSettings();
        closeModal();
      } else {
        const error = await res.json();
        alert(`${t("errors.saveFailed")}: ${error.detail || ""}`);
      }
    } catch (error) {
      console.error("Error saving setting:", error);
      alert(t("errors.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/v1/income-tax-settings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchSettings();
      } else {
        const error = await res.json();
        alert(`${t("errors.deleteFailed")}: ${error.detail || ""}`);
      }
    } catch (error) {
      console.error("Error deleting setting:", error);
      alert(t("errors.deleteFailed"));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return <div className="p-8">{t("loading")}</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => openModal()}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          + {t("addSetting")}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-220px)]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.effectiveFrom")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.effectiveTo")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.personalDeduction")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.dependentDeduction")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.totalInsurance")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {settings.map((setting) => (
              <tr key={setting.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(setting.effective_from).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {setting.effective_to
                    ? new Date(setting.effective_to).toLocaleDateString("vi-VN")
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatCurrency(setting.personal_deduction)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatCurrency(setting.dependent_deduction)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatPercent(setting.total_insurance_rate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      setting.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {t(`status.${setting.status}` as any)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => openModal(setting)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {tCommon("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(setting.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    {tCommon("delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {settings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t("noSettings")}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingSetting ? t("modal.editTitle") : t("modal.createTitle")}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("modal.effectiveFrom")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.effective_from}
                      onChange={(e) =>
                        setFormData({ ...formData, effective_from: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t("modal.effectiveTo")}</label>
                    <input
                      type="date"
                      value={formData.effective_to}
                      onChange={(e) =>
                        setFormData({ ...formData, effective_to: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                {/* Deductions */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">{t("modal.deductionSection")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("modal.personalDeduction")}
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.personal_deduction}
                        onChange={(e) =>
                          setFormData({ ...formData, personal_deduction: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("modal.dependentDeduction")}
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.dependent_deduction}
                        onChange={(e) =>
                          setFormData({ ...formData, dependent_deduction: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Rates */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">{t("modal.insuranceSection")}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("modal.socialInsurance")}</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={formData.social_insurance_rate}
                        onChange={(e) =>
                          setFormData({ ...formData, social_insurance_rate: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">{t("modal.healthInsurance")}</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={formData.health_insurance_rate}
                        onChange={(e) =>
                          setFormData({ ...formData, health_insurance_rate: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">{t("modal.unemploymentInsurance")}</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={formData.unemployment_insurance_rate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            unemployment_insurance_rate: e.target.value
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Brackets */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">{t("modal.taxBracketsSection")}</h3>

                  {/* Bracket 1 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 1</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_1_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_1_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_1_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_1_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 2 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 2</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_2_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_2_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_2_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_2_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_2_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_2_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 3 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 3</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_3_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_3_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_3_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_3_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_3_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_3_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 4 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 4</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_4_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_4_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_4_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_4_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_4_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_4_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 5 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 5</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_5_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_5_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_5_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_5_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_5_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_5_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 6 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket")} 6</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.maxIncome")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_6_limit}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_6_limit: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_6_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_6_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_6_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_6_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket 7 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">{t("modal.bracket7Label")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">{t("modal.taxRate")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.bracket_7_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_7_rate: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">{t("modal.quickDeduction")}</label>
                        <input
                          type="number"
                          required
                          value={formData.bracket_7_deduction}
                          onChange={(e) =>
                            setFormData({ ...formData, bracket_7_deduction: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-1">{t("modal.statusLabel")}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="ACTIVE">{t("status.ACTIVE")}</option>
                    <option value="INACTIVE">{t("status.INACTIVE")}</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                  >
                    {editingSetting ? tCommon("update") : tCommon("create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import BankSelect from "@/components/BankSelect";

interface BankAccount {
  id?: string;
  customer_id: string;
  bank_name: string;
  bank_code?: string;
  bank_bin?: string;
  bank_branch?: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  notes?: string;
  is_active?: boolean;
}

interface BankAccountManagerProps {
  customerId: string;
  bankAccounts: BankAccount[];
  onUpdate: () => void;
  apiPrefix?: string; // "/customers" for TMS, "/crm/accounts" for CRM
}

export default function BankAccountManager({
  customerId,
  bankAccounts,
  onUpdate,
  apiPrefix = "/customers",
}: BankAccountManagerProps) {
  const t = useTranslations("tms.customerEdit.bankAccountManager");
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bank_name: "",
    bank_code: "",
    bank_bin: "",
    bank_branch: "",
    account_number: "",
    account_holder: "",
    is_primary: false,
    notes: "",
  });

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        bank_name: editingAccount.bank_name || "",
        bank_code: editingAccount.bank_code || "",
        bank_bin: editingAccount.bank_bin || "",
        bank_branch: editingAccount.bank_branch || "",
        account_number: editingAccount.account_number || "",
        account_holder: editingAccount.account_holder || "",
        is_primary: editingAccount.is_primary || false,
        notes: editingAccount.notes || "",
      });
    } else {
      setFormData({
        bank_name: "",
        bank_code: "",
        bank_bin: "",
        bank_branch: "",
        account_number: "",
        account_holder: "",
        is_primary: bankAccounts.length === 0,
        notes: "",
      });
    }
  }, [editingAccount, bankAccounts.length]);

  const handleBankSelect = (bankName: string, bankBin?: string) => {
    setFormData({
      ...formData,
      bank_name: bankName,
      bank_bin: bankBin || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingAccount
        ? `/api/v1${apiPrefix}/${customerId}/bank-accounts/${editingAccount.id}`
        : `/api/v1${apiPrefix}/${customerId}/bank-accounts`;

      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customer_id: customerId,
        }),
      });

      if (!res.ok) throw new Error("Failed to save bank account");

      setShowModal(false);
      setEditingAccount(null);
      onUpdate();
    } catch (error) {
      console.error("Error saving bank account:", error);
      alert(t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(
        `/api/v1${apiPrefix}/${customerId}/bank-accounts/${accountId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      onUpdate();
    } catch (error) {
      console.error("Error deleting bank account:", error);
      alert(t("deleteError"));
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      const res = await fetch(
        `/api/v1${apiPrefix}/${customerId}/bank-accounts/${accountId}/set-primary`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Failed to set primary");
      onUpdate();
    } catch (error) {
      console.error("Error setting primary:", error);
      alert(t("setPrimaryError"));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddModal = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {t("title")}
        </h3>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("addAccount")}
        </button>
      </div>

      {/* Bank Accounts List */}
      {bankAccounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{t("noAccounts")}</p>
          <button
            onClick={openAddModal}
            className="mt-2 text-blue-600 hover:underline text-sm"
          >
            {t("addFirstAccount")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className={`p-4 border rounded-lg ${
                account.is_primary
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Bank Name & Primary Badge */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">
                    {account.bank_name}
                  </span>
                </div>
                {account.is_primary && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    {t("primary")}
                  </span>
                )}
              </div>

              {/* Account Number */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-500 text-sm">{t("accountNumber")}</span>
                <span className="font-mono text-lg">{account.account_number}</span>
                <button
                  onClick={() =>
                    copyToClipboard(account.account_number, account.id!)
                  }
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title={t("copyAccount")}
                >
                  {copiedId === account.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Account Holder */}
              <div className="text-gray-700 mb-1">
                <span className="text-gray-500 text-sm">{t("accountHolder")}</span>{" "}
                {account.account_holder}
              </div>

              {/* Branch */}
              {account.bank_branch && (
                <div className="text-gray-500 text-sm mb-2">
                  {t("branch")} {account.bank_branch}
                </div>
              )}

              {/* Notes */}
              {account.notes && (
                <div className="text-gray-500 text-sm italic mb-2">
                  {account.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {!account.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(account.id!)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-100 rounded"
                  >
                    <Star className="w-3 h-3" />
                    {t("setPrimary")}
                  </button>
                )}
                <button
                  onClick={() => openEditModal(account)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Pencil className="w-3 h-3" />
                  {t("edit")}
                </button>
                <button
                  onClick={() => handleDelete(account.id!)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {editingAccount ? t("editAccount") : t("addBankAccount")}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.bank")} <span className="text-red-500">*</span>
                </label>
                <BankSelect
                  value={formData.bank_name || ""}
                  onChange={handleBankSelect}
                  placeholder={t("form.bankPlaceholder")}
                />
              </div>

              {/* Bank Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.branch")}
                </label>
                <input
                  type="text"
                  value={formData.bank_branch || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_branch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={t("form.branchPlaceholder")}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.accountNumber")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder={t("form.accountNumberPlaceholder")}
                  required
                />
              </div>

              {/* Account Holder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.accountHolder")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_holder || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_holder: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                  placeholder={t("form.accountHolderPlaceholder")}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.notes")}
                </label>
                <input
                  type="text"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={t("form.notesPlaceholder")}
                />
              </div>

              {/* Is Primary */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={formData.is_primary || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_primary: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_primary" className="text-sm text-gray-700">
                  {t("form.setPrimary")}
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t("saving") : editingAccount ? t("update") : t("add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

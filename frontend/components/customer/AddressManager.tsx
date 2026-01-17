"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============ Types ============
export type AddressType =
  | "OPERATING"
  | "BUSINESS_REGISTRATION"
  | "BILLING"
  | "SHIPPING"
  | "BRANCH"
  | "WAREHOUSE";

export interface CustomerAddress {
  id?: string;
  customer_id?: string;
  address_type: AddressType;
  name?: string;
  address: string;
  ward?: string;
  district?: string;
  city?: string;
  country: string;
  postal_code?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  is_default: boolean;
  is_same_as_operating: boolean;
  notes?: string;
  is_active?: boolean;
}

interface AddressManagerProps {
  customerId: string;
  addresses: CustomerAddress[];
  onUpdate: () => void;
  readOnly?: boolean;
  apiPrefix?: string; // "/customers" for TMS, "/crm/accounts" for CRM
}

const ADDRESS_TYPE_COLORS: Record<AddressType, string> = {
  OPERATING: "bg-blue-100 text-blue-800",
  BUSINESS_REGISTRATION: "bg-purple-100 text-purple-800",
  BILLING: "bg-green-100 text-green-800",
  SHIPPING: "bg-orange-100 text-orange-800",
  BRANCH: "bg-gray-100 text-gray-800",
  WAREHOUSE: "bg-yellow-100 text-yellow-800",
};

// ============ Address Form Modal ============
interface AddressFormProps {
  customerId: string;
  address?: CustomerAddress;
  operatingAddress?: CustomerAddress;
  onSave: () => void;
  onCancel: () => void;
  apiPrefix?: string;
}

function AddressForm({ customerId, address, operatingAddress, onSave, onCancel, apiPrefix = "/customers" }: AddressFormProps) {
  const t = useTranslations("tms.customerEdit.addressManager");
  const [form, setForm] = useState<Partial<CustomerAddress>>({
    address_type: address?.address_type || "SHIPPING",
    name: address?.name || "",
    address: address?.address || "",
    ward: address?.ward || "",
    district: address?.district || "",
    city: address?.city || "",
    country: address?.country || "Việt Nam",
    postal_code: address?.postal_code || "",
    contact_name: address?.contact_name || "",
    contact_phone: address?.contact_phone || "",
    contact_email: address?.contact_email || "",
    is_default: address?.is_default || false,
    is_same_as_operating: address?.is_same_as_operating || false,
    notes: address?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!address?.id;
  const showSameAsOperating = form.address_type === "BILLING" || form.address_type === "BUSINESS_REGISTRATION";
  const showContactFields = form.address_type === "SHIPPING";

  // Copy operating address when checkbox is checked
  const handleSameAsOperating = (checked: boolean) => {
    setForm(prev => {
      if (checked && operatingAddress) {
        return {
          ...prev,
          is_same_as_operating: true,
          address: operatingAddress.address,
          ward: operatingAddress.ward || "",
          district: operatingAddress.district || "",
          city: operatingAddress.city || "",
          country: operatingAddress.country || "Việt Nam",
          postal_code: operatingAddress.postal_code || "",
        };
      }
      return { ...prev, is_same_as_operating: checked };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address?.trim()) {
      setError(t("addressRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit) {
        await apiFetch(`/api/v1${apiPrefix}/${customerId}/addresses/${address.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch(`/api/v1${apiPrefix}/${customerId}/addresses`, {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      onSave();
    } catch (e: any) {
      setError(e?.message || t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const ADDRESS_TYPES: AddressType[] = ["OPERATING", "BUSINESS_REGISTRATION", "BILLING", "SHIPPING", "BRANCH", "WAREHOUSE"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-lg">
            {isEdit ? t("editAddress") : t("addNewAddress")}
          </h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-black text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Address Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.addressType")}</label>
              <select
                value={form.address_type}
                onChange={(e) => setForm(prev => ({ ...prev, address_type: e.target.value as AddressType }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {ADDRESS_TYPES.map((key) => (
                  <option key={key} value={key}>{t(`types.${key}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.nameLabel")}</label>
              <input
                value={form.name || ""}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t("form.namePlaceholder")}
              />
            </div>
          </div>

          {/* Same as Operating checkbox */}
          {showSameAsOperating && operatingAddress && (
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
              <input
                type="checkbox"
                checked={form.is_same_as_operating}
                onChange={(e) => handleSameAsOperating(e.target.checked)}
                className="rounded"
              />
              {t("sameAsOperating")}
            </label>
          )}

          {/* Address Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.address")} <span className="text-red-500">*</span>
            </label>
            <input
              value={form.address || ""}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={t("form.addressPlaceholder")}
              disabled={form.is_same_as_operating}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.ward")}</label>
              <input
                value={form.ward || ""}
                onChange={(e) => setForm(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={form.is_same_as_operating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.district")}</label>
              <input
                value={form.district || ""}
                onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={form.is_same_as_operating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.city")}</label>
              <input
                value={form.city || ""}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={form.is_same_as_operating}
              />
            </div>
          </div>

          {/* Contact fields for shipping */}
          {showContactFields && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t("form.shippingContact")}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t("form.contactName")}</label>
                  <input
                    value={form.contact_name || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t("form.contactPhone")}</label>
                  <input
                    value={form.contact_phone || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t("form.contactEmail")}</label>
                  <input
                    value={form.contact_email || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Default checkbox */}
          {form.address_type === "SHIPPING" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded"
              />
              {t("setAsDefault")}
            </label>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.notes")}</label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ Main Component ============
export default function AddressManager({ customerId, addresses, onUpdate, readOnly, apiPrefix = "/customers" }: AddressManagerProps) {
  const t = useTranslations("tms.customerEdit.addressManager");
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | undefined>();

  const operatingAddress = addresses.find(a => a.address_type === "OPERATING");

  // Group addresses by type
  const groupedAddresses = addresses.reduce((acc, addr) => {
    const type = addr.address_type as AddressType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(addr);
    return acc;
  }, {} as Record<AddressType, CustomerAddress[]>);

  const handleAdd = () => {
    setEditingAddress(undefined);
    setShowForm(true);
  };

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      await apiFetch(`/api/v1${apiPrefix}/${customerId}/addresses/${addressId}`, {
        method: "DELETE",
      });
      onUpdate();
    } catch (e: any) {
      alert(e?.message || t("deleteError"));
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await apiFetch(`/api/v1${apiPrefix}/${customerId}/addresses/${addressId}/set-default`, {
        method: "PATCH",
      });
      onUpdate();
    } catch (e: any) {
      alert(e?.message || t("setDefaultError"));
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingAddress(undefined);
    onUpdate();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(undefined);
  };

  const formatAddress = (addr: CustomerAddress) => {
    const parts = [addr.address, addr.ward, addr.district, addr.city].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          {t("title")} ({addresses.length})
        </h3>
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t("addAddress")}
          </button>
        )}
      </div>

      {/* Address List by Type */}
      {addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          {t("noAddresses")}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedAddresses).map(([type, addrs]) => (
            <div key={type} className="space-y-2">
              <div className="text-sm font-medium text-gray-600">
                {t(`types.${type}`)}
              </div>
              {addrs.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${ADDRESS_TYPE_COLORS[type as AddressType]}`}>
                          {t(`types.${type}`)}
                        </span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {t("default")}
                          </span>
                        )}
                        {addr.is_same_as_operating && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                            {t("equalOperating")}
                          </span>
                        )}
                        {addr.name && (
                          <span className="text-sm font-medium text-gray-700">{addr.name}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-900">{formatAddress(addr)}</div>
                      {addr.contact_name && (
                        <div className="text-sm text-gray-600 mt-1">
                          {t("contact")}: {addr.contact_name} {addr.contact_phone && `- ${addr.contact_phone}`}
                        </div>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1 ml-4">
                        {addr.address_type === "SHIPPING" && !addr.is_default && (
                          <button
                            onClick={() => handleSetDefault(addr.id!)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title={t("setAsDefault")}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(addr)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title={t("editAddress")}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(addr.id!)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title={t("delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AddressForm
          customerId={customerId}
          address={editingAddress}
          operatingAddress={operatingAddress}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          apiPrefix={apiPrefix}
        />
      )}
    </div>
  );
}

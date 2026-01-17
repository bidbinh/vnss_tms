"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Phone,
  Mail,
  User,
  Briefcase,
  Shield,
} from "lucide-react";

interface Contact {
  id?: string;
  customer_id: string;
  contact_type: string;
  name: string;
  title?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  notes?: string;
  is_active?: boolean;
}

const CONTACT_TYPE_COLORS: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-800",
  BILLING: "bg-green-100 text-green-800",
  SHIPPING: "bg-blue-100 text-blue-800",
  SALES: "bg-purple-100 text-purple-800",
  PURCHASING: "bg-orange-100 text-orange-800",
  TECHNICAL: "bg-cyan-100 text-cyan-800",
  MANAGEMENT: "bg-red-100 text-red-800",
};

interface ContactManagerProps {
  customerId: string;
  contacts: Contact[];
  onUpdate: () => void;
  apiPrefix?: string; // "/customers" for TMS, "/crm/accounts" for CRM
}

export default function ContactManager({
  customerId,
  contacts,
  onUpdate,
  apiPrefix = "/customers",
}: ContactManagerProps) {
  const t = useTranslations("tms.customerEdit.contactManager");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  const CONTACT_TYPES = ["GENERAL", "BILLING", "SHIPPING", "SALES", "PURCHASING", "TECHNICAL", "MANAGEMENT"];

  const [formData, setFormData] = useState<Partial<Contact>>({
    contact_type: "GENERAL",
    name: "",
    title: "",
    department: "",
    phone: "",
    mobile: "",
    email: "",
    is_primary: false,
    is_decision_maker: false,
    notes: "",
  });

  useEffect(() => {
    if (editingContact) {
      setFormData({
        contact_type: editingContact.contact_type || "GENERAL",
        name: editingContact.name || "",
        title: editingContact.title || "",
        department: editingContact.department || "",
        phone: editingContact.phone || "",
        mobile: editingContact.mobile || "",
        email: editingContact.email || "",
        is_primary: editingContact.is_primary || false,
        is_decision_maker: editingContact.is_decision_maker || false,
        notes: editingContact.notes || "",
      });
    } else {
      setFormData({
        contact_type: "GENERAL",
        name: "",
        title: "",
        department: "",
        phone: "",
        mobile: "",
        email: "",
        is_primary: contacts.length === 0,
        is_decision_maker: false,
        notes: "",
      });
    }
  }, [editingContact, contacts.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingContact
        ? `/api/v1${apiPrefix}/${customerId}/contacts/${editingContact.id}`
        : `/api/v1${apiPrefix}/${customerId}/contacts`;

      const method = editingContact ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customer_id: customerId,
        }),
      });

      if (!res.ok) throw new Error("Failed to save contact");

      setShowModal(false);
      setEditingContact(null);
      onUpdate();
    } catch (error) {
      console.error("Error saving contact:", error);
      alert(t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(
        `/api/v1${apiPrefix}/${customerId}/contacts/${contactId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      onUpdate();
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert(t("deleteError"));
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      const res = await fetch(
        `/api/v1${apiPrefix}/${customerId}/contacts/${contactId}/set-primary`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Failed to set primary");
      onUpdate();
    } catch (error) {
      console.error("Error setting primary:", error);
      alert(t("setPrimaryError"));
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t("title")}
        </h3>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("addContact")}
        </button>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{t("noContacts")}</p>
          <button
            onClick={openAddModal}
            className="mt-2 text-blue-600 hover:underline text-sm"
          >
            {t("addFirstContact")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => {
            const typeColor = CONTACT_TYPE_COLORS[contact.contact_type] || CONTACT_TYPE_COLORS.GENERAL;
            return (
              <div
                key={contact.id}
                className={`p-4 border rounded-lg ${
                  contact.is_primary
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {contact.name}
                        {contact.is_decision_maker && (
                          <Shield
                            className="w-4 h-4 text-red-500"
                            title={t("decisionMaker")}
                          />
                        )}
                      </div>
                      {contact.title && (
                        <div className="text-xs text-gray-500">{contact.title}</div>
                      )}
                    </div>
                  </div>
                  {contact.is_primary && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      {t("primary")}
                    </span>
                  )}
                </div>

                {/* Type Badge */}
                <div className="mb-3">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full ${typeColor}`}
                  >
                    {t(`contactTypes.${contact.contact_type}`)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-sm">
                  {contact.department && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      {contact.department}
                    </div>
                  )}
                  {(contact.phone || contact.mobile) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {contact.mobile || contact.phone}
                      {contact.mobile && contact.phone && (
                        <span className="text-gray-400">/ {contact.phone}</span>
                      )}
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline truncate"
                      >
                        {contact.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {contact.notes && (
                  <div className="mt-2 text-gray-500 text-xs italic">
                    {contact.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  {!contact.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(contact.id!)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-100 rounded"
                    >
                      <Star className="w-3 h-3" />
                      {t("setPrimary")}
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(contact)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Pencil className="w-3 h-3" />
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id!)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-medium">
                {editingContact ? t("editContact") : t("addNewContact")}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Contact Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.contactType")}
                </label>
                <select
                  value={formData.contact_type || "GENERAL"}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {CONTACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`contactTypes.${type}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={t("form.namePlaceholder")}
                  required
                />
              </div>

              {/* Title & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.title")}
                  </label>
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={t("form.titlePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.department")}
                  </label>
                  <input
                    type="text"
                    value={formData.department || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={t("form.departmentPlaceholder")}
                  />
                </div>
              </div>

              {/* Phone & Mobile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.phone")}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={t("form.phonePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.mobile")}
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={t("form.mobilePlaceholder")}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.email")}
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.notes")}
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder={t("form.notesPlaceholder")}
                />
              </div>

              {/* Flags */}
              <div className="flex flex-col gap-2">
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
                    {t("form.isPrimary")}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_decision_maker"
                    checked={formData.is_decision_maker || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_decision_maker: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="is_decision_maker"
                    className="text-sm text-gray-700"
                  >
                    {t("form.isDecisionMaker")}
                  </label>
                </div>
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
                  {loading ? t("saving") : editingContact ? t("update") : t("add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

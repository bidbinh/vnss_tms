"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  CreditCard,
  Landmark,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Briefcase,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  tax_code: string | null;
  business_license: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  country: string;
  shipping_address: string | null;
  shipping_ward: string | null;
  shipping_district: string | null;
  shipping_city: string | null;
  payment_terms: string | null;
  credit_limit: number;
  credit_days: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  industry: string | null;
  source: string | null;
  customer_since: string | null;
  assigned_to: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_position: string | null;
  notes: string | null;
  is_active: boolean;
  crm_account_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("tms.customerDetail");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [id, router]);

  const fetchData = async () => {
    try {
      const data = await apiFetch<Customer>(`/api/v1/customers/${id}`);
      setCustomer(data);
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      router.push("/tms/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/v1/customers/${id}`, { method: "DELETE" });
      router.push("/tms/customers");
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert(t("errors.deleteFailed"));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">{t("notFound")}</p>
        <Link href="/tms/customers" className="text-blue-600 hover:underline mt-2 inline-block">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const fullAddress = [customer.address, customer.ward, customer.district, customer.city, customer.country]
    .filter(Boolean)
    .join(", ");

  const shippingAddress = [customer.shipping_address, customer.shipping_ward, customer.shipping_district, customer.shipping_city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/tms/customers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToList")}
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                {customer.is_active ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t("status.active")}
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {t("status.inactive")}
                  </span>
                )}
                {customer.crm_account_id && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    CRM
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                {customer.code}
                {customer.short_name && <span className="ml-2 text-gray-400">({customer.short_name})</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/tms/customers/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              {tCommon("edit")}
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              {tCommon("delete")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin liên hệ */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("sections.contactInfo")}</h2>
            <div className="grid grid-cols-2 gap-4">
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.fax && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Fax: {customer.fax}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {customer.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("sections.address")}</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">{t("fields.companyAddress")}</div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{fullAddress || "-"}</span>
                </div>
              </div>
              {shippingAddress && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">{t("fields.shippingAddress")}</div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">{shippingAddress}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin pháp lý */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("sections.legalInfo")}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("fields.taxCode")}</div>
                <div className="font-medium">{customer.tax_code || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("fields.businessLicense")}</div>
                <div className="font-medium">{customer.business_license || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("fields.industry")}</div>
                <div className="font-medium">{customer.industry || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("fields.source")}</div>
                <div className="font-medium">{customer.source || "-"}</div>
              </div>
            </div>
          </div>

          {/* Thông tin tài chính */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("sections.financialInfo")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("fields.paymentTerms")}</div>
                <div className="font-medium">
                  {customer.payment_terms || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("fields.creditDays")}</div>
                <div className="font-medium">{customer.credit_days} {t("fields.days")}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("fields.creditLimit")}</div>
                <div className="font-medium text-green-600">{formatCurrency(customer.credit_limit)}</div>
              </div>
            </div>
          </div>

          {/* Thông tin ngân hàng */}
          {(customer.bank_name || customer.bank_account) && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                {t("sections.bankInfo")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">{t("fields.bankName")}</div>
                  <div className="font-medium">{customer.bank_name || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("fields.bankBranch")}</div>
                  <div className="font-medium">{customer.bank_branch || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("fields.bankAccount")}</div>
                  <div className="font-medium font-mono">{customer.bank_account || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("fields.bankAccountName")}</div>
                  <div className="font-medium">{customer.bank_account_name || "-"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Ghi chú */}
          {customer.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("sections.notes")}
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Liên hệ chính */}
          {customer.contact_name && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {t("sections.primaryContact")}
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">{customer.contact_name}</div>
                  {customer.contact_position && (
                    <div className="text-sm text-gray-500">{customer.contact_position}</div>
                  )}
                </div>
                {customer.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${customer.contact_phone}`} className="text-blue-600 hover:underline">
                      {customer.contact_phone}
                    </a>
                  </div>
                )}
                {customer.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${customer.contact_email}`} className="text-blue-600 hover:underline">
                      {customer.contact_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CRM Link */}
          {customer.crm_account_id && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                {t("sections.crmIntegration")}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t("crmLinked")}</span>
                </div>
                <Link
                  href={`/crm/accounts/${customer.crm_account_id}`}
                  className="flex items-center gap-2 w-full px-3 py-2 text-center text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg"
                >
                  <Briefcase className="w-4 h-4" />
                  {t("viewOnCRM")}
                </Link>
              </div>
            </div>
          )}

          {/* Thông tin hệ thống */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("sections.systemInfo")}</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">{t("fields.status")}</div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    customer.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {customer.is_active ? t("status.active") : t("status.inactive")}
                </span>
              </div>
              {customer.customer_since && (
                <div>
                  <div className="text-sm text-gray-500">{t("fields.customerSince")}</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {customer.customer_since}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">{t("fields.createdAt")}</div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  {formatDate(customer.created_at)}
                </div>
              </div>
              {customer.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">{t("fields.updatedAt")}</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(customer.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("deleteModal.title")}</h3>
            <p className="text-gray-600 mb-6">
              {t("deleteModal.message", { name: customer.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {tCommon("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

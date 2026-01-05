"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Save,
  AlertCircle,
  Building2,
  User,
  MapPin,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

interface Customer {
  id: string;
  name: string;
  code?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: string;
}

interface Site {
  id: string;
  company_name: string;
  code?: string;
  detailed_address?: string;
  site_type?: string;
}

interface TenantInfo {
  id: string;
  name: string;
  code: string;
}

export default function CreateOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { worker } = useWorker();
  const tenantId = params.tenantId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    pickup_site_id: "",
    delivery_site_id: "",
    pickup_text: "",
    delivery_text: "",
    driver_id: "",
    equipment: "",
    container_code: "",
    cargo_note: "",
    freight_charge: "",
  });

  useEffect(() => {
    if (worker && tenantId) {
      fetchReferenceData();
    }
  }, [worker, tenantId]);

  const fetchReferenceData = async () => {
    setLoading(true);
    try {
      // Fetch tenant info
      const tenantRes = await fetch(`${API_BASE}/api/v1/workspace/my-tenants`, {
        credentials: "include",
      });
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        const tenant = data.tenants?.find((t: any) => t.tenant.id === tenantId);
        if (tenant) {
          setTenantInfo(tenant.tenant);
        }
      }

      // Fetch customers
      const customersRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/customers?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }

      // Fetch drivers
      const driversRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/drivers?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.drivers || []);
      }

      // Fetch sites
      const sitesRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/sites?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      setError("Vui lòng chọn khách hàng");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        customer_id: formData.customer_id,
        order_date: formData.order_date || undefined,
        pickup_site_id: formData.pickup_site_id || undefined,
        delivery_site_id: formData.delivery_site_id || undefined,
        pickup_text: formData.pickup_text || undefined,
        delivery_text: formData.delivery_text || undefined,
        driver_id: formData.driver_id || undefined,
        equipment: formData.equipment || undefined,
        container_code: formData.container_code || undefined,
        cargo_note: formData.cargo_note || undefined,
        freight_charge: formData.freight_charge ? parseInt(formData.freight_charge) : undefined,
      };

      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders?tenant_id=${tenantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể tạo đơn hàng");
      }

      const data = await res.json();
      router.push(`/workspace/tenant/${tenantId}/orders`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (!worker) {
    return null;
  }

  const pickupSites = sites.filter(s => !s.site_type || s.site_type === "PICKUP" || s.site_type === "BOTH");
  const deliverySites = sites.filter(s => !s.site_type || s.site_type === "DELIVERY" || s.site_type === "BOTH");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/workspace/tenant/${tenantId}/orders`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Tạo đơn hàng mới</h1>
                {tenantInfo && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {tenantInfo.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
                <button type="button" onClick={() => setError("")} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Customer & Date */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                Thông tin cơ bản
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ngày đơn hàng
                  </label>
                  <input
                    type="date"
                    name="order_date"
                    value={formData.order_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Pickup & Delivery */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                Điểm lấy & giao hàng
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm lấy hàng
                  </label>
                  <select
                    name="pickup_site_id"
                    value={formData.pickup_site_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn điểm lấy hàng --</option>
                    {pickupSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm giao hàng
                  </label>
                  <select
                    name="delivery_site_id"
                    value={formData.delivery_site_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn điểm giao hàng --</option>
                    {deliverySites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hoặc nhập điểm lấy (text)
                  </label>
                  <input
                    type="text"
                    name="pickup_text"
                    value={formData.pickup_text}
                    onChange={handleChange}
                    placeholder="Địa chỉ lấy hàng..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hoặc nhập điểm giao (text)
                  </label>
                  <input
                    type="text"
                    name="delivery_text"
                    value={formData.delivery_text}
                    onChange={handleChange}
                    placeholder="Địa chỉ giao hàng..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                Phân công
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tài xế (tùy chọn)
                </label>
                <select
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa phân công --</option>
                  {drivers.filter(d => d.status === "ACTIVE").map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cargo Details */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-500" />
                Chi tiết hàng hóa
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cont
                  </label>
                  <select
                    name="equipment"
                    value={formData.equipment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="20">20 feet</option>
                    <option value="40">40 feet</option>
                    <option value="45">45 feet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số container
                  </label>
                  <input
                    type="text"
                    name="container_code"
                    value={formData.container_code}
                    onChange={handleChange}
                    placeholder="ABCD1234567"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cước vận chuyển (VND)
                  </label>
                  <input
                    type="number"
                    name="freight_charge"
                    value={formData.freight_charge}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Ghi chú hàng hóa
                </label>
                <textarea
                  name="cargo_note"
                  value={formData.cargo_note}
                  onChange={handleChange}
                  placeholder="Mô tả hàng hóa, yêu cầu đặc biệt..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Link
                href={`/workspace/tenant/${tenantId}/orders`}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Đang tạo..." : "Tạo đơn hàng"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

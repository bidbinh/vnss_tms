"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Package,
  DollarSign,
  Truck,
  Calendar,
  Loader2,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface ConnectedDriver {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  default_payment_per_order?: number;
}

export default function NewDispatcherOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { worker } = useWorker();

  const [drivers, setDrivers] = useState<ConnectedDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    // Customer
    customer_name: "",
    customer_phone: "",
    customer_company: "",

    // Pickup
    pickup_address: "",
    pickup_contact: "",
    pickup_phone: "",
    pickup_time: "",

    // Delivery
    delivery_address: "",
    delivery_contact: "",
    delivery_phone: "",
    delivery_time: "",

    // Cargo
    equipment: "",
    container_code: "",
    cargo_description: "",
    weight_kg: "",

    // Payment
    freight_charge: "",
    driver_payment: "",
    driver_id: searchParams.get("driver") || "",

    // Options
    save_as_draft: false,
  });

  useEffect(() => {
    if (worker) {
      fetchDrivers();
    }
  }, [worker]);

  const fetchDrivers = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/my-drivers`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);

        // If driver is preselected, set default payment
        const preselectedDriver = searchParams.get("driver");
        if (preselectedDriver) {
          const driver = data.find(
            (d: ConnectedDriver) => d.driver_id === preselectedDriver
          );
          if (driver?.default_payment_per_order) {
            setForm((f) => ({
              ...f,
              driver_payment: driver.default_payment_per_order.toString(),
            }));
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setForm((f) => ({ ...f, driver_id: driverId }));

    const driver = drivers.find((d) => d.driver_id === driverId);
    if (driver?.default_payment_per_order) {
      setForm((f) => ({
        ...f,
        driver_payment: driver.default_payment_per_order!.toString(),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_company: form.customer_company || null,
        pickup_address: form.pickup_address || null,
        pickup_contact: form.pickup_contact || null,
        pickup_phone: form.pickup_phone || null,
        pickup_time: form.pickup_time || null,
        delivery_address: form.delivery_address || null,
        delivery_contact: form.delivery_contact || null,
        delivery_phone: form.delivery_phone || null,
        delivery_time: form.delivery_time || null,
        equipment: form.equipment || null,
        container_code: form.container_code || null,
        cargo_description: form.cargo_description || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        freight_charge: form.freight_charge
          ? parseFloat(form.freight_charge)
          : null,
        driver_payment: form.driver_payment
          ? parseFloat(form.driver_payment)
          : null,
        driver_id: form.driver_id || null,
        status: form.save_as_draft ? "DRAFT" : "PENDING",
      };

      const res = await fetch(`${API_BASE}/api/v1/dispatcher-orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const order = await res.json();
        router.push(`/workspace/dispatcher/orders/${order.id}`);
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể tạo đơn hàng");
      }
    } catch (e) {
      console.error("Failed to create order:", e);
      alert("Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (!worker) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/dispatcher/orders"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Tạo đơn hàng mới</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Thông tin khách hàng
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Tên khách hàng"
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
                className="col-span-2 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Số điện thoại"
                value={form.customer_phone}
                onChange={(e) =>
                  setForm({ ...form, customer_phone: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Công ty"
                value={form.customer_company}
                onChange={(e) =>
                  setForm({ ...form, customer_company: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pickup */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Điểm lấy hàng
            </h3>
            <textarea
              placeholder="Địa chỉ lấy hàng"
              value={form.pickup_address}
              onChange={(e) =>
                setForm({ ...form, pickup_address: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Người liên hệ"
                value={form.pickup_contact}
                onChange={(e) =>
                  setForm({ ...form, pickup_contact: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="SĐT liên hệ"
                value={form.pickup_phone}
                onChange={(e) =>
                  setForm({ ...form, pickup_phone: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={form.pickup_time}
                onChange={(e) =>
                  setForm({ ...form, pickup_time: e.target.value })
                }
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Điểm giao hàng
            </h3>
            <textarea
              placeholder="Địa chỉ giao hàng"
              value={form.delivery_address}
              onChange={(e) =>
                setForm({ ...form, delivery_address: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Người nhận"
                value={form.delivery_contact}
                onChange={(e) =>
                  setForm({ ...form, delivery_contact: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="SĐT người nhận"
                value={form.delivery_phone}
                onChange={(e) =>
                  setForm({ ...form, delivery_phone: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={form.delivery_time}
                onChange={(e) =>
                  setForm({ ...form, delivery_time: e.target.value })
                }
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cargo */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              Thông tin hàng hóa
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Loại xe/Cont (VD: 40HC)"
                value={form.equipment}
                onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Số cont"
                value={form.container_code}
                onChange={(e) =>
                  setForm({ ...form, container_code: e.target.value })
                }
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <textarea
              placeholder="Mô tả hàng hóa"
              value={form.cargo_description}
              onChange={(e) =>
                setForm({ ...form, cargo_description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Trọng lượng (kg)"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Driver & Payment */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-500" />
              Tài xế & Thanh toán
            </h3>

            <select
              value={form.driver_id}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn tài xế --</option>
              {drivers.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.driver_name} - {d.driver_phone}
                </option>
              ))}
            </select>

            {drivers.length === 0 && (
              <p className="text-sm text-gray-500">
                Bạn chưa có tài xế nào trong mạng lưới.{" "}
                <Link
                  href="/workspace/network/search?role=DRIVER"
                  className="text-blue-600 hover:underline"
                >
                  Tìm và kết nối tài xế
                </Link>
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Cước vận chuyển (thu từ KH)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="0"
                    value={form.freight_charge}
                    onChange={(e) =>
                      setForm({ ...form, freight_charge: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Trả cho tài xế
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="0"
                    value={form.driver_payment}
                    onChange={(e) =>
                      setForm({ ...form, driver_payment: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, save_as_draft: true });
                handleSubmit(new Event("submit") as any);
              }}
              disabled={saving}
              className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl font-medium"
            >
              Lưu nháp
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Tạo đơn & Gửi
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

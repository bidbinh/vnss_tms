"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Package, Truck, FileText, Clock } from "lucide-react";

interface OrderItem {
  id: string;
  product_code: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  quantity_allocated: number;
  quantity_shipped: number;
  quantity_delivered: number;
  cs_unit_price: number;
  quoted_unit_price: number;
  approved_unit_price?: number;
  shipping_unit_cost: number;
  line_total?: number;
  tax_amount: number;
  net_amount?: number;
  notes?: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  customer_id: string;
  customer_name: string;
  delivery_address_text?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  order_date: string;
  required_delivery_date?: string;
  confirmed_date?: string;
  completed_date?: string;
  total_product_amount: number;
  total_shipping_cost: number;
  total_tax: number;
  total_discount: number;
  grand_total: number;
  currency: string;
  sales_notes?: string;
  internal_notes?: string;
  customer_notes?: string;
  rejection_reason?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

interface StatusLog {
  id: string;
  from_status?: string;
  to_status: string;
  change_reason?: string;
  changed_at: string;
  changed_by_role?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_PRICE_APPROVAL: "bg-yellow-100 text-yellow-800",
  PRICE_APPROVED: "bg-green-100 text-green-800",
  PRICE_REJECTED: "bg-red-100 text-red-800",
  PENDING_ALLOCATION: "bg-blue-100 text-blue-800",
  ALLOCATION_CONFIRMED: "bg-indigo-100 text-indigo-800",
  READY_TO_SHIP: "bg-purple-100 text-purple-800",
  IN_TRANSIT: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "items" | "history">("details");

  useEffect(() => {
    fetchOrderDetail();
    fetchStatusHistory();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<OrderDetail>(`/oms/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const data = await apiFetch<StatusLog[]>(`/oms/orders/${orderId}/status-history`);
      setStatusHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleDelete = async () => {
    if (!order || order.status !== "DRAFT") return;

    if (!confirm(`Xóa đơn hàng ${order.order_number}?`)) return;

    try {
      await apiFetch(`/oms/orders/${orderId}`, { method: "DELETE" });
      router.push("/oms/orders");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Không thể xóa đơn hàng");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Nháp",
      PENDING_PRICE_APPROVAL: "Chờ duyệt giá",
      PRICE_APPROVED: "Đã duyệt giá",
      PRICE_REJECTED: "Từ chối giá",
      PENDING_ALLOCATION: "Chờ phân bổ",
      ALLOCATION_CONFIRMED: "Đã phân bổ",
      READY_TO_SHIP: "Sẵn sàng vận chuyển",
      IN_TRANSIT: "Đang vận chuyển",
      DELIVERED: "Đã giao hàng",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-500 mb-4">Không tìm thấy đơn hàng</p>
        <Link href="/oms/orders" className="text-blue-600 hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/oms/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tạo lúc {formatDate(order.created_at)}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>

        <div className="flex space-x-2">
          {order.status === "DRAFT" && (
            <>
              <button
                onClick={() => router.push(`/oms/orders/${orderId}/edit`)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Sửa
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Chi Tiết
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "items"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Sản Phẩm ({order.items.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Lịch Sử ({statusHistory.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Thông Tin Khách Hàng</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tên Khách Hàng</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customer_name}</dd>
              </div>
              {order.delivery_contact_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Người Nhận</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.delivery_contact_name}</dd>
                </div>
              )}
              {order.delivery_contact_phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Số Điện Thoại</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.delivery_contact_phone}</dd>
                </div>
              )}
              {order.delivery_address_text && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Địa Chỉ Giao Hàng</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.delivery_address_text}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Thông Tin Đơn Hàng</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Ngày Đặt Hàng</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(order.order_date)}</dd>
              </div>
              {order.required_delivery_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ngày Giao Yêu Cầu</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(order.required_delivery_date)}
                  </dd>
                </div>
              )}
              {order.confirmed_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ngày Xác Nhận</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(order.confirmed_date)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Tổng Kết Giá</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Tổng Tiền Hàng</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.total_product_amount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Cước Vận Chuyển</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.total_shipping_cost)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Thuế VAT (10%)</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.total_tax)}
                </dd>
              </div>
              {order.total_discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <dt className="text-sm">Giảm Giá</dt>
                  <dd className="text-sm font-medium">-{formatCurrency(order.total_discount)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <dt className="text-base font-semibold text-gray-900">Tổng Cộng</dt>
                <dd className="text-base font-bold text-blue-600">
                  {formatCurrency(order.grand_total)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {(order.sales_notes || order.customer_notes || order.internal_notes) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Ghi Chú</h3>
              <div className="space-y-4">
                {order.sales_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Ghi Chú Sale</h4>
                    <p className="text-sm text-gray-600">{order.sales_notes}</p>
                  </div>
                )}
                {order.customer_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Yêu Cầu Khách Hàng</h4>
                    <p className="text-sm text-gray-600">{order.customer_notes}</p>
                  </div>
                )}
                {order.internal_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Ghi Chú Nội Bộ</h4>
                    <p className="text-sm text-gray-600">{order.internal_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "items" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã SP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên Sản Phẩm
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Số Lượng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Đơn Giá
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cước VC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Thành Tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.quantity} {item.product_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.approved_unit_price || item.quoted_unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.shipping_unit_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.net_amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {statusHistory.map((log, idx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {idx !== statusHistory.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <Clock className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-900">
                            {log.from_status && (
                              <>
                                <span className="font-medium">{getStatusLabel(log.from_status)}</span>
                                {" → "}
                              </>
                            )}
                            <span className="font-medium">{getStatusLabel(log.to_status)}</span>
                          </p>
                          {log.change_reason && (
                            <p className="mt-1 text-sm text-gray-500">{log.change_reason}</p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time dateTime={log.changed_at}>{formatDate(log.changed_at)}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

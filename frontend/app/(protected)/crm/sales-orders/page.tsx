"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SalesOrder {
  id: string;
  code: string;
  account_id: string;
  quote_id: string | null;
  order_date: string | null;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  payment_status: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string | null;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface SalesOrdersResponse {
  items: SalesOrder[];
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPED: "Đã giao hàng",
  DELIVERED: "Đã nhận",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    account_id: "",
    order_date: new Date().toISOString().split("T")[0],
    delivery_date: "",
    total_amount: 0,
    shipping_address: "",
    notes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchOrders();
    fetchAccounts();
  }, [router, search, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page_size: "100" });
      if (search) params.append("search", search);
      if (filterStatus) params.append("status", filterStatus);

      const res = await apiFetch<SalesOrdersResponse>(`/crm/sales-orders?${params}`);
      setOrders(res.items || []);
      setTotal(res.total || 0);

      // Fetch account info
      const accountIds = [...new Set(res.items?.filter((o) => o.account_id).map((o) => o.account_id) || [])];
      const accountMap: Record<string, Account> = {};
      for (const id of accountIds.slice(0, 30)) {
        try {
          const acc = await apiFetch<Account>(`/crm/accounts/${id}`);
          accountMap[id] = acc;
        } catch {
          // Ignore
        }
      }
      setAccounts(accountMap);
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch<{ items: Account[] }>("/crm/accounts?page_size=100");
      setAccountsList(res.items || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/crm/sales-orders", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          status: "DRAFT",
          payment_status: "UNPAID",
        }),
      });
      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error("Failed to create sales order:", error);
      alert("Lỗi khi tạo đơn hàng");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      account_id: "",
      order_date: new Date().toISOString().split("T")[0],
      delivery_date: "",
      total_amount: 0,
      shipping_address: "",
      notes: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const pendingOrders = orders.filter((o) => o.status === "DRAFT" || o.status === "CONFIRMED");
  const processingOrders = orders.filter((o) => o.status === "PROCESSING" || o.status === "SHIPPED");
  const completedOrders = orders.filter((o) => o.status === "DELIVERED");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-gray-600 mt-1">Theo dõi đơn hàng bán hàng</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo đơn hàng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng đơn hàng</div>
              <div className="text-xl font-bold">{total}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chờ xử lý</div>
              <div className="text-xl font-bold">{pendingOrders.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang giao</div>
              <div className="text-xl font-bold">{processingOrders.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Doanh thu</div>
              <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="SHIPPED">Đã giao hàng</option>
          <option value="DELIVERED">Đã nhận</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Order List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã ĐH</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Khách hàng</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Ngày đặt</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Ngày giao</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Tổng tiền</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Thanh toán</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-blue-600">{order.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    {order.account_id && accounts[order.account_id] ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Building2 className="w-3 h-3" />
                        {accounts[order.account_id].name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.order_date ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Calendar className="w-3 h-3" />
                        {order.order_date}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.delivery_date ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Truck className="w-3 h-3" />
                        {order.delivery_date}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        order.payment_status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : order.payment_status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[order.payment_status || "UNPAID"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 text-gray-500 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Tạo đơn hàng mới</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã đơn hàng *
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
                    Khách hàng *
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Chọn khách hàng</option>
                    {accountsList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày đặt hàng
                    </label>
                    <input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày giao hàng
                    </label>
                    <input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổng tiền
                  </label>
                  <input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ giao hàng
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tạo đơn hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

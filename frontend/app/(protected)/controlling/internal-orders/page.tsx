"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, ClipboardList, Calendar, DollarSign } from "lucide-react";

interface InternalOrder {
  id: string;
  order_number: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  actual: number;
  start_date: string;
  end_date: string;
  responsible: string;
}

export default function InternalOrdersPage() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        { id: "1", order_number: "IO-2024-001", name: "Dự án nâng cấp hệ thống IT", type: "PROJECT", status: "IN_PROGRESS", budget: 500000000, actual: 320000000, start_date: "2024-01-15", end_date: "2024-06-30", responsible: "Nguyễn Văn A" },
        { id: "2", order_number: "IO-2024-002", name: "Chiến dịch Marketing Q1", type: "MARKETING", status: "COMPLETED", budget: 200000000, actual: 185000000, start_date: "2024-01-01", end_date: "2024-03-31", responsible: "Trần Thị B" },
        { id: "3", order_number: "IO-2024-003", name: "Bảo trì xe tải", type: "MAINTENANCE", status: "IN_PROGRESS", budget: 150000000, actual: 95000000, start_date: "2024-02-01", end_date: "2024-12-31", responsible: "Lê Văn C" },
        { id: "4", order_number: "IO-2024-004", name: "Đào tạo nhân viên", type: "TRAINING", status: "PLANNED", budget: 100000000, actual: 0, start_date: "2024-04-01", end_date: "2024-04-30", responsible: "Phạm Thị D" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
      case "PLANNED": return "bg-yellow-100 text-yellow-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filteredOrders = orders.filter(
    (o) => o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.order_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internal Orders</h1>
          <p className="text-gray-500">Đơn hàng nội bộ</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo Internal Order
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngân sách</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thực tế</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phụ trách</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">{order.type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {order.start_date} - {order.end_date}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(order.budget)}</td>
                <td className="px-6 py-4 text-right">
                  <div>
                    <p className="font-medium">{formatCurrency(order.actual)}</p>
                    <p className="text-xs text-gray-500">{Math.round((order.actual / order.budget) * 100)}%</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{order.responsible}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                    <button className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, TrendingUp, Building2, BarChart3 } from "lucide-react";

interface ProfitCenter {
  id: string;
  code: string;
  name: string;
  type: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  is_active: boolean;
}

export default function ProfitCentersPage() {
  const [profitCenters, setProfitCenters] = useState<ProfitCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setProfitCenters([
        { id: "1", code: "PC001", name: "Vận tải nội địa", type: "BUSINESS_UNIT", revenue: 5200000000, cost: 3800000000, profit: 1400000000, margin: 26.9, is_active: true },
        { id: "2", code: "PC002", name: "Vận tải quốc tế", type: "BUSINESS_UNIT", revenue: 3800000000, cost: 2900000000, profit: 900000000, margin: 23.7, is_active: true },
        { id: "3", code: "PC003", name: "Dịch vụ kho bãi", type: "BUSINESS_UNIT", revenue: 1500000000, cost: 1100000000, profit: 400000000, margin: 26.7, is_active: true },
        { id: "4", code: "PC004", name: "Dịch vụ giao nhận", type: "BUSINESS_UNIT", revenue: 2100000000, cost: 1700000000, profit: 400000000, margin: 19.0, is_active: true },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  };

  const filteredProfitCenters = profitCenters.filter(
    (pc) => pc.name.toLowerCase().includes(searchTerm.toLowerCase()) || pc.code.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Profit Centers</h1>
          <p className="text-gray-500">Trung tâm lợi nhuận</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Thêm Profit Center
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Tổng doanh thu</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(12600000000)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Tổng chi phí</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(9500000000)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Tổng lợi nhuận</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(3100000000)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Biên lợi nhuận TB</p>
          <p className="text-xl font-bold">24.6%</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm profit center..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã / Tên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chi phí</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lợi nhuận</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredProfitCenters.map((pc) => (
              <tr key={pc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{pc.name}</p>
                      <p className="text-sm text-gray-500">{pc.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{pc.type}</span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-green-600">{formatCurrency(pc.revenue)}</td>
                <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(pc.cost)}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">{formatCurrency(pc.profit)}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${pc.margin >= 25 ? "bg-green-100 text-green-700" : pc.margin >= 20 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {pc.margin}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded"><BarChart3 className="w-4 h-4 text-blue-500" /></button>
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

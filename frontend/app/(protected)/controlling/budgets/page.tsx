"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, PiggyBank, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface Budget {
  id: string;
  code: string;
  name: string;
  fiscal_year: number;
  budget_type: string;
  total_amount: number;
  used_amount: number;
  status: string;
  start_date: string;
  end_date: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setBudgets([
        {
          id: "1",
          code: "BUD-2024-001",
          name: "Ngân sách Vận tải Q1/2024",
          fiscal_year: 2024,
          budget_type: "QUARTERLY",
          total_amount: 500000000,
          used_amount: 320000000,
          status: "APPROVED",
          start_date: "2024-01-01",
          end_date: "2024-03-31",
        },
        {
          id: "2",
          code: "BUD-2024-002",
          name: "Ngân sách IT năm 2024",
          fiscal_year: 2024,
          budget_type: "ANNUAL",
          total_amount: 1200000000,
          used_amount: 450000000,
          status: "APPROVED",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
        },
        {
          id: "3",
          code: "BUD-2024-003",
          name: "Ngân sách Marketing Q2/2024",
          fiscal_year: 2024,
          budget_type: "QUARTERLY",
          total_amount: 300000000,
          used_amount: 280000000,
          status: "APPROVED",
          start_date: "2024-04-01",
          end_date: "2024-06-30",
        },
        {
          id: "4",
          code: "BUD-2024-004",
          name: "Ngân sách Nhân sự 2024",
          fiscal_year: 2024,
          budget_type: "ANNUAL",
          total_amount: 2500000000,
          used_amount: 1800000000,
          status: "APPROVED",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUtilization = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "text-red-600 bg-red-100";
    if (percent >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const filteredBudgets = budgets.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-500">Quản lý ngân sách</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo ngân sách mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng ngân sách</p>
              <p className="font-semibold">{formatCurrency(4500000000)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đã sử dụng</p>
              <p className="font-semibold">{formatCurrency(2850000000)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Còn lại</p>
              <p className="font-semibold">{formatCurrency(1650000000)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cảnh báo vượt</p>
              <p className="font-semibold">2 ngân sách</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm ngân sách..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã / Tên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Thời gian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tổng ngân sách
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sử dụng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBudgets.map((budget) => {
              const utilization = getUtilization(budget.used_amount, budget.total_amount);
              return (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-blue-600">{budget.code}</p>
                      <p className="text-sm text-gray-700">{budget.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                      {budget.budget_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {budget.start_date} - {budget.end_date}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {formatCurrency(budget.total_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilization >= 90
                                ? "bg-red-500"
                                : utilization >= 70
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${getUtilizationColor(
                            utilization
                          )}`}
                        >
                          {utilization}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(budget.used_amount)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {budget.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

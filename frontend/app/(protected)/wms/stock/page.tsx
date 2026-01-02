"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Download, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface StockItem {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  warehouse: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  unit_price: number;
  total_value: number;
  status: string;
}

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("ALL");

  useEffect(() => {
    setTimeout(() => {
      setStockItems([
        { id: "1", sku: "SKU001", product_name: "Bàn phím cơ K1", category: "Phụ kiện", warehouse: "Kho HCM", quantity: 150, min_quantity: 50, unit: "Cái", unit_price: 1200000, total_value: 180000000, status: "NORMAL" },
        { id: "2", sku: "SKU002", product_name: "Chuột gaming M2", category: "Phụ kiện", warehouse: "Kho HCM", quantity: 25, min_quantity: 30, unit: "Cái", unit_price: 800000, total_value: 20000000, status: "LOW" },
        { id: "3", sku: "SKU003", product_name: "Màn hình LED 24inch", category: "Màn hình", warehouse: "Kho HN", quantity: 80, min_quantity: 20, unit: "Cái", unit_price: 4500000, total_value: 360000000, status: "NORMAL" },
        { id: "4", sku: "SKU004", product_name: "Tai nghe Bluetooth", category: "Phụ kiện", warehouse: "Kho DN", quantity: 8, min_quantity: 20, unit: "Cái", unit_price: 1500000, total_value: 12000000, status: "CRITICAL" },
        { id: "5", sku: "SKU005", product_name: "Webcam HD", category: "Phụ kiện", warehouse: "Kho HCM", quantity: 200, min_quantity: 40, unit: "Cái", unit_price: 950000, total_value: 190000000, status: "NORMAL" },
        { id: "6", sku: "SKU006", product_name: "USB Hub 4 port", category: "Phụ kiện", warehouse: "Kho HN", quantity: 350, min_quantity: 100, unit: "Cái", unit_price: 250000, total_value: 87500000, status: "NORMAL" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NORMAL": return "bg-green-100 text-green-700";
      case "LOW": return "bg-yellow-100 text-yellow-700";
      case "CRITICAL": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "NORMAL": return "Bình thường";
      case "LOW": return "Sắp hết";
      case "CRITICAL": return "Cần nhập gấp";
      default: return status;
    }
  };

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = filterWarehouse === "ALL" || item.warehouse === filterWarehouse;
    return matchesSearch && matchesWarehouse;
  });

  const warehouses = ["ALL", ...new Set(stockItems.map(i => i.warehouse))];

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
          <h1 className="text-2xl font-bold text-gray-900">Stock Overview</h1>
          <p className="text-gray-500">Tổng quan tồn kho</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng sản phẩm</p>
              <p className="text-xl font-bold">{stockItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Giá trị tồn kho</p>
              <p className="text-lg font-bold">{formatCurrency(849500000)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sắp hết hàng</p>
              <p className="text-xl font-bold text-yellow-600">
                {stockItems.filter(i => i.status === "LOW").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cần nhập gấp</p>
              <p className="text-xl font-bold text-red-600">
                {stockItems.filter(i => i.status === "CRITICAL").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {warehouses.map(w => (
            <option key={w} value={w}>{w === "ALL" ? "Tất cả kho" : w}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Sản phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tối thiểu</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá trị</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-500">{item.sku} • {item.category}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{item.warehouse}</td>
                <td className="px-6 py-4 text-right font-medium">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {item.min_quantity} {item.unit}
                </td>
                <td className="px-6 py-4 text-right text-sm">{formatCurrency(item.unit_price)}</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.total_value)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

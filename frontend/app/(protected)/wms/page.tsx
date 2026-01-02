"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Warehouse,
  Boxes,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

interface WMSStats {
  total_products: number;
  total_warehouses: number;
  total_stock_value: number;
  pending_receipts: number;
  pending_shipments: number;
  low_stock_items: number;
}

interface StockMovement {
  id: string;
  type: "IN" | "OUT" | "TRANSFER";
  product_name: string;
  quantity: number;
  warehouse: string;
  time: string;
}

export default function WMSDashboard() {
  const [stats, setStats] = useState<WMSStats>({
    total_products: 0,
    total_warehouses: 0,
    total_stock_value: 0,
    pending_receipts: 0,
    pending_shipments: 0,
    low_stock_items: 0,
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStats({
        total_products: 1850,
        total_warehouses: 5,
        total_stock_value: 15800000000,
        pending_receipts: 12,
        pending_shipments: 28,
        low_stock_items: 15,
      });
      setMovements([
        { id: "1", type: "IN", product_name: "Linh kiện máy tính A1", quantity: 500, warehouse: "Kho HCM", time: "10 phút trước" },
        { id: "2", type: "OUT", product_name: "Màn hình LED 24inch", quantity: 50, warehouse: "Kho HN", time: "25 phút trước" },
        { id: "3", type: "TRANSFER", product_name: "Bàn phím cơ K1", quantity: 200, warehouse: "HCM → HN", time: "1 giờ trước" },
        { id: "4", type: "IN", product_name: "Chuột không dây M1", quantity: 1000, warehouse: "Kho HCM", time: "2 giờ trước" },
        { id: "5", type: "OUT", product_name: "Tai nghe Bluetooth", quantity: 30, warehouse: "Kho DN", time: "3 giờ trước" },
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

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "IN":
        return <PackagePlus className="w-4 h-4 text-green-500" />;
      case "OUT":
        return <PackageMinus className="w-4 h-4 text-red-500" />;
      case "TRANSFER":
        return <ArrowLeftRight className="w-4 h-4 text-blue-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case "IN":
        return "text-green-600 bg-green-100";
      case "OUT":
        return "text-red-600 bg-red-100";
      case "TRANSFER":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">WMS Dashboard</h1>
          <p className="text-gray-500">Quản lý kho hàng</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/wms/goods-receipt"
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <PackagePlus className="w-4 h-4" />
            Nhập kho
          </a>
          <a
            href="/wms/shipping"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PackageMinus className="w-4 h-4" />
            Xuất kho
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sản phẩm</p>
              <p className="text-xl font-bold">{stats.total_products.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Warehouse className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Kho hàng</p>
              <p className="text-xl font-bold">{stats.total_warehouses}</p>
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
              <p className="text-lg font-bold">{formatCurrency(stats.total_stock_value)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <PackagePlus className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ nhập</p>
              <p className="text-xl font-bold">{stats.pending_receipts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PackageMinus className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ xuất</p>
              <p className="text-xl font-bold">{stats.pending_shipments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sắp hết</p>
              <p className="text-xl font-bold text-red-600">{stats.low_stock_items}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Biến động kho gần đây</h2>
            <a href="/wms/reports/movement" className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-3">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getMovementColor(m.type)}`}>
                    {getMovementIcon(m.type)}
                  </div>
                  <div>
                    <p className="font-medium">{m.product_name}</p>
                    <p className="text-sm text-gray-500">{m.warehouse}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${m.type === "OUT" ? "text-red-600" : "text-green-600"}`}>
                    {m.type === "OUT" ? "-" : "+"}{m.quantity}
                  </p>
                  <p className="text-xs text-gray-400">{m.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Cảnh báo hàng sắp hết</h2>
            <a href="/wms/stock" className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-3">
            {[
              { name: "Bàn phím cơ K1", stock: 15, min: 50, warehouse: "Kho HCM" },
              { name: "Chuột gaming M2", stock: 8, min: 30, warehouse: "Kho HN" },
              { name: "Tai nghe wireless", stock: 5, min: 20, warehouse: "Kho DN" },
              { name: "Webcam HD", stock: 12, min: 40, warehouse: "Kho HCM" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.warehouse}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{item.stock} / {item.min}</p>
                  <p className="text-xs text-red-500">Dưới mức tối thiểu</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="/wms/stock" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50">
          <Boxes className="w-5 h-5 text-blue-500" />
          <span>Tồn kho</span>
        </a>
        <a href="/wms/products" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50">
          <Package className="w-5 h-5 text-purple-500" />
          <span>Sản phẩm</span>
        </a>
        <a href="/wms/transfers" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50">
          <ArrowLeftRight className="w-5 h-5 text-green-500" />
          <span>Điều chuyển</span>
        </a>
        <a href="/wms/reports/inventory" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <span>Báo cáo</span>
        </a>
      </div>
    </div>
  );
}

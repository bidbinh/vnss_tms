"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, Barcode, Eye, Filter } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  price: number;
  cost: number;
  weight: number;
  is_active: boolean;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setProducts([
        { id: "1", sku: "SKU001", name: "Bàn phím cơ K1", category: "Phụ kiện", brand: "TechBrand", unit: "Cái", price: 1500000, cost: 1200000, weight: 0.8, is_active: true, created_at: "2024-01-10" },
        { id: "2", sku: "SKU002", name: "Chuột gaming M2", category: "Phụ kiện", brand: "GameGear", unit: "Cái", price: 950000, cost: 800000, weight: 0.15, is_active: true, created_at: "2024-01-15" },
        { id: "3", sku: "SKU003", name: "Màn hình LED 24inch", category: "Màn hình", brand: "ViewTech", unit: "Cái", price: 5200000, cost: 4500000, weight: 5.5, is_active: true, created_at: "2024-01-20" },
        { id: "4", sku: "SKU004", name: "Tai nghe Bluetooth", category: "Âm thanh", brand: "SoundMax", unit: "Cái", price: 1800000, cost: 1500000, weight: 0.25, is_active: true, created_at: "2024-02-01" },
        { id: "5", sku: "SKU005", name: "Webcam HD", category: "Phụ kiện", brand: "CamPro", unit: "Cái", price: 1200000, cost: 950000, weight: 0.2, is_active: true, created_at: "2024-02-05" },
        { id: "6", sku: "SKU006", name: "USB Hub 4 port", category: "Phụ kiện", brand: "ConnectPlus", unit: "Cái", price: 350000, cost: 250000, weight: 0.1, is_active: false, created_at: "2024-02-10" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  };

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Quản lý sản phẩm</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
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
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Lọc
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 bg-gray-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Barcode className="w-3 h-3" />
                    {product.sku}
                  </p>
                  <h3 className="font-semibold mt-1">{product.name}</h3>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <span>{product.brand}</span>
                <span>•</span>
                <span>{product.category}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(product.price)}</p>
                  <p className="text-xs text-gray-500">Cost: {formatCurrency(product.cost)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-500" /></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

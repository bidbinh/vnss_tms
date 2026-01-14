"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Plus, Trash2, Package, Box } from "lucide-react";

interface CargoItem {
  id: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  weight: number;
}

// Container specifications
const CONTAINER_SPECS = {
  "20DC": { name: "20' Dry Container", cbm: 33.2, maxWeight: 28200, innerL: 5.9, innerW: 2.35, innerH: 2.39 },
  "40DC": { name: "40' Dry Container", cbm: 67.7, maxWeight: 28800, innerL: 12.03, innerW: 2.35, innerH: 2.39 },
  "40HC": { name: "40' High Cube", cbm: 76.3, maxWeight: 28620, innerL: 12.03, innerW: 2.35, innerH: 2.69 },
  "45HC": { name: "45' High Cube", cbm: 86.0, maxWeight: 27700, innerL: 13.56, innerW: 2.35, innerH: 2.70 },
};

export default function CBMCalculatorPage() {
  const [items, setItems] = useState<CargoItem[]>([
    { id: "1", length: 0, width: 0, height: 0, quantity: 1, weight: 0 },
  ]);
  const [unit, setUnit] = useState<"cm" | "m" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), length: 0, width: 0, height: 0, quantity: 1, weight: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof CargoItem, value: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Convert dimensions to meters
  const toMeters = (value: number): number => {
    switch (unit) {
      case "cm":
        return value / 100;
      case "inch":
        return value * 0.0254;
      default:
        return value;
    }
  };

  // Convert weight to kg
  const toKg = (value: number): number => {
    return weightUnit === "lb" ? value * 0.453592 : value;
  };

  // Calculate CBM for a single item
  const calculateItemCBM = (item: CargoItem): number => {
    const l = toMeters(item.length);
    const w = toMeters(item.width);
    const h = toMeters(item.height);
    return l * w * h * item.quantity;
  };

  // Calculate total CBM
  const totalCBM = items.reduce((sum, item) => sum + calculateItemCBM(item), 0);

  // Calculate total weight in kg
  const totalWeightKg = items.reduce((sum, item) => sum + toKg(item.weight) * item.quantity, 0);

  // Calculate volumetric weight (for air freight: CBM * 167 kg)
  const volumetricWeightAir = totalCBM * 167;

  // Calculate volumetric weight (for sea freight: CBM * 1000 kg)
  const volumetricWeightSea = totalCBM * 1000;

  // Chargeable weight
  const chargeableWeightAir = Math.max(totalWeightKg, volumetricWeightAir);
  const chargeableWeightSea = Math.max(totalWeightKg, volumetricWeightSea);

  // Container recommendations
  const getContainerRecommendation = () => {
    const recommendations = [];
    for (const [key, spec] of Object.entries(CONTAINER_SPECS)) {
      const cbmFit = Math.floor(spec.cbm / totalCBM);
      const weightFit = Math.floor(spec.maxWeight / totalWeightKg);
      const maxUnits = Math.min(cbmFit, weightFit);
      const utilization = (totalCBM / spec.cbm) * 100;

      if (totalCBM > 0) {
        recommendations.push({
          type: key,
          name: spec.name,
          cbmCapacity: spec.cbm,
          maxWeight: spec.maxWeight,
          utilization: Math.min(utilization, 100),
          canFit: totalCBM <= spec.cbm && totalWeightKg <= spec.maxWeight,
          containersNeeded: Math.ceil(totalCBM / spec.cbm),
        });
      }
    }
    return recommendations;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">CBM Calculator</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Unit Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Đơn vị kích thước</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    {(["cm", "m", "inch"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          unit === u
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Đơn vị trọng lượng</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    {(["kg", "lb"] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeightUnit(w)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          weightUnit === w
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo Items */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Thông tin hàng hóa</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Thêm dòng
                </button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-2">
                  <div className="col-span-2">Dài ({unit})</div>
                  <div className="col-span-2">Rộng ({unit})</div>
                  <div className="col-span-2">Cao ({unit})</div>
                  <div className="col-span-2">SL</div>
                  <div className="col-span-2">KL ({weightUnit})</div>
                  <div className="col-span-1">CBM</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="number"
                      value={item.length || ""}
                      onChange={(e) => updateItem(item.id, "length", parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      value={item.width || ""}
                      onChange={(e) => updateItem(item.id, "width", parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      value={item.height || ""}
                      onChange={(e) => updateItem(item.id, "height", parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="1"
                      min="1"
                    />
                    <input
                      type="number"
                      value={item.weight || ""}
                      onChange={(e) => updateItem(item.id, "weight", parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                    <div className="col-span-1 text-sm font-medium text-slate-700">
                      {calculateItemCBM(item).toFixed(3)}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="col-span-1 p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {/* Total CBM */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Box className="w-5 h-5" />
                </div>
                <div className="text-sm text-slate-400">Tổng thể tích</div>
              </div>
              <div className="text-4xl font-bold mb-1">{totalCBM.toFixed(3)}</div>
              <div className="text-slate-400">CBM (m³)</div>
            </div>

            {/* Weight Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Trọng lượng</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trọng lượng thực</span>
                  <span className="font-medium">{totalWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TL quy đổi (Air)</span>
                  <span className="font-medium">{volumetricWeightAir.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TL quy đổi (Sea)</span>
                  <span className="font-medium">{volumetricWeightSea.toFixed(2)} kg</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-red-600">
                    <span className="font-medium">Tính cước Air</span>
                    <span className="font-bold">{chargeableWeightAir.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-blue-600 mt-2">
                    <span className="font-medium">Tính cước Sea</span>
                    <span className="font-bold">{chargeableWeightSea.toFixed(2)} kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Container Recommendation */}
            {totalCBM > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Gợi ý container</h3>
                <div className="space-y-2">
                  {getContainerRecommendation().map((rec) => (
                    <div
                      key={rec.type}
                      className={`p-3 rounded-lg border ${
                        rec.canFit
                          ? "border-green-200 bg-green-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{rec.type}</span>
                        {rec.canFit ? (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                            Phù hợp
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Cần {rec.containersNeeded} cont
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mb-2">{rec.name}</div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rec.utilization > 90
                              ? "bg-red-500"
                              : rec.utilization > 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(rec.utilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-slate-500">
                        <span>Sử dụng: {rec.utilization.toFixed(1)}%</span>
                        <span>{rec.cbmCapacity} CBM</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formula Info */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900 mb-2">Công thức tính</div>
              <ul className="space-y-1 text-xs">
                <li>• CBM = D x R x C (mét)</li>
                <li>• TL quy đổi Air = CBM x 167 kg</li>
                <li>• TL quy đổi Sea = CBM x 1000 kg</li>
                <li>• Tính cước = Max(TL thực, TL quy đổi)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

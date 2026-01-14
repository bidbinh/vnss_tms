"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Ship, Plane, Truck, Package } from "lucide-react";

type FreightType = "fcl" | "lcl" | "air" | "trucking";

const containerTypes = [
  { value: "20GP", label: "20' GP", cbm: 33 },
  { value: "40GP", label: "40' GP", cbm: 67 },
  { value: "40HC", label: "40' HC", cbm: 76 },
  { value: "45HC", label: "45' HC", cbm: 86 },
];

// Sample rates (VND)
const sampleRates = {
  fcl: {
    "20GP": { base: 25000000, perKm: 15000 },
    "40GP": { base: 35000000, perKm: 20000 },
    "40HC": { base: 38000000, perKm: 22000 },
    "45HC": { base: 42000000, perKm: 25000 },
  },
  lcl: { perCbm: 2500000, perKg: 25000, min: 1500000 },
  air: { perKg: 85000, min: 5000000, fuelSurcharge: 0.25 },
  trucking: { perKm: 18000, min: 800000 },
};

export default function FreightCalculatorPage() {
  const [freightType, setFreightType] = useState<FreightType>("fcl");
  const [containerType, setContainerType] = useState("20GP");
  const [quantity, setQuantity] = useState(1);
  const [cbm, setCbm] = useState(0);
  const [weight, setWeight] = useState(0);
  const [distance, setDistance] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    let total = 0;

    switch (freightType) {
      case "fcl": {
        const rate = sampleRates.fcl[containerType as keyof typeof sampleRates.fcl];
        total = (rate.base + rate.perKm * distance) * quantity;
        break;
      }
      case "lcl": {
        const cbmCost = cbm * sampleRates.lcl.perCbm;
        const weightCost = weight * sampleRates.lcl.perKg;
        total = Math.max(cbmCost, weightCost, sampleRates.lcl.min);
        break;
      }
      case "air": {
        const volumeWeight = (cbm * 1000000) / 6000; // cm³ to volume weight
        const chargeableWeight = Math.max(weight, volumeWeight);
        total = chargeableWeight * sampleRates.air.perKg * (1 + sampleRates.air.fuelSurcharge);
        total = Math.max(total, sampleRates.air.min);
        break;
      }
      case "trucking": {
        total = Math.max(distance * sampleRates.trucking.perKm, sampleRates.trucking.min);
        break;
      }
    }

    setResult(Math.round(total));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " VNĐ";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Tính cước vận tải</h1>
          </div>
          <Link href="/" className="flex items-center gap-1">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
            <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Freight Type Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {[
              { type: "fcl", icon: Ship, label: "FCL" },
              { type: "lcl", icon: Package, label: "LCL" },
              { type: "air", icon: Plane, label: "Air" },
              { type: "trucking", icon: Truck, label: "Nội địa" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  setFreightType(item.type as FreightType);
                  setResult(null);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  freightType === item.type
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {freightType === "fcl" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loại container
                    </label>
                    <select
                      value={containerType}
                      onChange={(e) => setContainerType(e.target.value)}
                      className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      {containerTypes.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label} ({ct.cbm} CBM)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Số lượng
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Khoảng cách (km) - từ cảng đến kho
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="VD: 50"
                  />
                </div>
              </>
            )}

            {freightType === "lcl" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Thể tích (CBM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={cbm}
                    onChange={(e) => setCbm(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="VD: 5.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="VD: 1000"
                  />
                </div>
              </div>
            )}

            {freightType === "air" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Thể tích (CBM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={cbm}
                    onChange={(e) => setCbm(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="VD: 0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trọng lượng thực (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="VD: 100"
                  />
                </div>
              </div>
            )}

            {freightType === "trucking" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Khoảng cách (km)
                </label>
                <input
                  type="number"
                  min={0}
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="VD: 100"
                />
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={calculate}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Calculator className="w-5 h-5" />
              Tính cước
            </button>

            {/* Result */}
            {result !== null && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-600 mb-1">Cước vận tải ước tính</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(result)}</p>
                <p className="text-xs text-green-500 mt-2">
                  * Giá tham khảo, chưa bao gồm phí phát sinh. Liên hệ để có báo giá chính xác.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Ghi chú</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• <strong>FCL:</strong> Full Container Load - thuê nguyên container</li>
            <li>• <strong>LCL:</strong> Less than Container Load - hàng lẻ ghép container</li>
            <li>• <strong>Air:</strong> Tính theo Chargeable Weight = max(Gross Weight, Volume Weight)</li>
            <li>• <strong>Volume Weight:</strong> CBM × 1,000,000 ÷ 6,000</li>
          </ul>
        </div>

        {/* Footer */}
        <footer className="mt-8 py-6 text-center text-sm text-slate-500">
          © 2026{" "}
          <Link href="/" className="text-red-500 hover:underline">
            9log.tech
          </Link>{" "}
          - Công cụ miễn phí cho ngành Logistics Việt Nam
        </footer>
      </main>
    </div>
  );
}

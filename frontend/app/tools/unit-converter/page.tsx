"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Scale } from "lucide-react";

type Category = "weight" | "volume" | "length" | "container";

const units = {
  weight: [
    { id: "kg", name: "Kilogram (kg)", factor: 1 },
    { id: "g", name: "Gram (g)", factor: 0.001 },
    { id: "ton", name: "Tấn (MT)", factor: 1000 },
    { id: "lb", name: "Pound (lb)", factor: 0.453592 },
    { id: "oz", name: "Ounce (oz)", factor: 0.0283495 },
  ],
  volume: [
    { id: "cbm", name: "Mét khối (CBM)", factor: 1 },
    { id: "cbf", name: "Feet khối (CBF)", factor: 0.0283168 },
    { id: "l", name: "Lít (L)", factor: 0.001 },
    { id: "gal", name: "Gallon (US)", factor: 0.00378541 },
  ],
  length: [
    { id: "m", name: "Mét (m)", factor: 1 },
    { id: "cm", name: "Centimét (cm)", factor: 0.01 },
    { id: "mm", name: "Milimét (mm)", factor: 0.001 },
    { id: "ft", name: "Feet (ft)", factor: 0.3048 },
    { id: "in", name: "Inch (in)", factor: 0.0254 },
    { id: "yd", name: "Yard (yd)", factor: 0.9144 },
  ],
  container: [
    { id: "20gp", name: "Container 20' GP", cbm: 33, payload: 28000 },
    { id: "40gp", name: "Container 40' GP", cbm: 67, payload: 26000 },
    { id: "40hc", name: "Container 40' HC", cbm: 76, payload: 26000 },
    { id: "45hc", name: "Container 45' HC", cbm: 86, payload: 25000 },
  ],
};

export default function UnitConverterPage() {
  const [category, setCategory] = useState<Category>("weight");
  const [fromUnit, setFromUnit] = useState("kg");
  const [toUnit, setToUnit] = useState("ton");
  const [value, setValue] = useState("");
  const [result, setResult] = useState("");

  // Container calculator
  const [containerType, setContainerType] = useState("20gp");
  const [cargoCbm, setCargoCbm] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [containerResult, setContainerResult] = useState<{
    byCbm: number;
    byWeight: number;
    recommended: number;
  } | null>(null);

  const convert = () => {
    if (!value) return;

    const categoryUnits = units[category as keyof typeof units];
    if (!Array.isArray(categoryUnits)) return;

    const from = categoryUnits.find((u) => u.id === fromUnit);
    const to = categoryUnits.find((u) => u.id === toUnit);

    if (from && to && "factor" in from && "factor" in to) {
      const baseValue = parseFloat(value) * from.factor;
      const converted = baseValue / to.factor;
      setResult(converted.toLocaleString("en-US", { maximumFractionDigits: 6 }));
    }
  };

  const calculateContainers = () => {
    const container = units.container.find((c) => c.id === containerType);
    if (!container || (!cargoCbm && !cargoWeight)) return;

    const cbm = parseFloat(cargoCbm) || 0;
    const weight = parseFloat(cargoWeight) || 0;

    const byCbm = cbm > 0 ? Math.ceil(cbm / container.cbm) : 0;
    const byWeight = weight > 0 ? Math.ceil(weight / container.payload) : 0;
    const recommended = Math.max(byCbm, byWeight);

    setContainerResult({ byCbm, byWeight, recommended });
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setResult("");
  };

  const handleCategoryChange = (newCategory: Category) => {
    setCategory(newCategory);
    if (newCategory !== "container") {
      const categoryUnits = units[newCategory];
      if (Array.isArray(categoryUnits) && categoryUnits.length >= 2) {
        setFromUnit(categoryUnits[0].id);
        setToUnit(categoryUnits[1].id);
      }
    }
    setValue("");
    setResult("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Chuyển đổi đơn vị</h1>
          </div>
          <Link href="/" className="flex items-center gap-1">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
            <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "weight", label: "Trọng lượng" },
            { id: "volume", label: "Thể tích" },
            { id: "length", label: "Chiều dài" },
            { id: "container", label: "Ước tính Container" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id as Category)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                category === cat.id
                  ? "bg-red-500 text-white"
                  : "bg-white border border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {category !== "container" ? (
          /* Unit Converter */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
              {/* From */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Từ</label>
                <select
                  value={fromUnit}
                  onChange={(e) => {
                    setFromUnit(e.target.value);
                    setResult("");
                  }}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg mb-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {(units[category] as { id: string; name: string }[]).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setResult("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && convert()}
                  placeholder="Nhập giá trị"
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Swap */}
              <button
                onClick={swapUnits}
                className="h-12 w-12 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-50 mb-0"
              >
                <ArrowRightLeft className="w-5 h-5 text-slate-500" />
              </button>

              {/* To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sang</label>
                <select
                  value={toUnit}
                  onChange={(e) => {
                    setToUnit(e.target.value);
                    setResult("");
                  }}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg mb-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {(units[category] as { id: string; name: string }[]).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <div className="w-full h-12 px-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center text-lg font-semibold text-red-600">
                  {result || "—"}
                </div>
              </div>
            </div>

            <button
              onClick={convert}
              className="w-full h-12 mt-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Chuyển đổi
            </button>
          </div>
        ) : (
          /* Container Calculator */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loại container</label>
                <select
                  value={containerType}
                  onChange={(e) => {
                    setContainerType(e.target.value);
                    setContainerResult(null);
                  }}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {units.container.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cbm} CBM, max {c.payload.toLocaleString()} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Thể tích hàng (CBM)
                  </label>
                  <input
                    type="number"
                    value={cargoCbm}
                    onChange={(e) => {
                      setCargoCbm(e.target.value);
                      setContainerResult(null);
                    }}
                    placeholder="VD: 150"
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trọng lượng hàng (kg)
                  </label>
                  <input
                    type="number"
                    value={cargoWeight}
                    onChange={(e) => {
                      setCargoWeight(e.target.value);
                      setContainerResult(null);
                    }}
                    placeholder="VD: 50000"
                    className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <button
                onClick={calculateContainers}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Tính số container
              </button>

              {containerResult && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-500">Theo thể tích</p>
                      <p className="text-2xl font-bold text-slate-900">{containerResult.byCbm}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Theo trọng lượng</p>
                      <p className="text-2xl font-bold text-slate-900">{containerResult.byWeight}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Khuyến nghị</p>
                      <p className="text-3xl font-bold text-green-600">{containerResult.recommended}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4 text-center">
                    * Lấy giá trị lớn hơn giữa thể tích và trọng lượng
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Thông số container tiêu chuẩn</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Loại</th>
                  <th className="px-3 py-2 text-right">Dài (m)</th>
                  <th className="px-3 py-2 text-right">Rộng (m)</th>
                  <th className="px-3 py-2 text-right">Cao (m)</th>
                  <th className="px-3 py-2 text-right">CBM</th>
                  <th className="px-3 py-2 text-right">Max (kg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">20' GP</td>
                  <td className="px-3 py-2 text-right text-slate-600">5.9</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.35</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.39</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">33</td>
                  <td className="px-3 py-2 text-right text-slate-600">28,000</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">40' GP</td>
                  <td className="px-3 py-2 text-right text-slate-600">12.0</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.35</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.39</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">67</td>
                  <td className="px-3 py-2 text-right text-slate-600">26,000</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">40' HC</td>
                  <td className="px-3 py-2 text-right text-slate-600">12.0</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.35</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.69</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">76</td>
                  <td className="px-3 py-2 text-right text-slate-600">26,000</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">45' HC</td>
                  <td className="px-3 py-2 text-right text-slate-600">13.6</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.35</td>
                  <td className="px-3 py-2 text-right text-slate-600">2.69</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">86</td>
                  <td className="px-3 py-2 text-right text-slate-600">25,000</td>
                </tr>
              </tbody>
            </table>
          </div>
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

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Scale, ArrowRightLeft, Info } from "lucide-react";

// Weight conversion factors to kg
const WEIGHT_UNITS = [
  { id: "kg", name: "Kilogram", symbol: "kg", toKg: 1 },
  { id: "g", name: "Gram", symbol: "g", toKg: 0.001 },
  { id: "ton", name: "Metric Ton", symbol: "T", toKg: 1000 },
  { id: "lb", name: "Pound", symbol: "lb", toKg: 0.453592 },
  { id: "oz", name: "Ounce", symbol: "oz", toKg: 0.0283495 },
  { id: "st", name: "Short Ton (US)", symbol: "ST", toKg: 907.185 },
  { id: "lt", name: "Long Ton (UK)", symbol: "LT", toKg: 1016.05 },
];

// Volume conversion factors to CBM
const VOLUME_UNITS = [
  { id: "cbm", name: "Cubic Meter", symbol: "m³", toCbm: 1 },
  { id: "cft", name: "Cubic Feet", symbol: "ft³", toCbm: 0.0283168 },
  { id: "l", name: "Liter", symbol: "L", toCbm: 0.001 },
  { id: "gal_us", name: "Gallon (US)", symbol: "gal", toCbm: 0.00378541 },
  { id: "gal_uk", name: "Gallon (UK)", symbol: "gal", toCbm: 0.00454609 },
];

// Length conversion factors to meters
const LENGTH_UNITS = [
  { id: "m", name: "Meter", symbol: "m", toM: 1 },
  { id: "cm", name: "Centimeter", symbol: "cm", toM: 0.01 },
  { id: "mm", name: "Millimeter", symbol: "mm", toM: 0.001 },
  { id: "ft", name: "Feet", symbol: "ft", toM: 0.3048 },
  { id: "in", name: "Inch", symbol: "in", toM: 0.0254 },
  { id: "yd", name: "Yard", symbol: "yd", toM: 0.9144 },
];

type ConversionType = "weight" | "volume" | "length" | "volumetric";

export default function WeightConverterPage() {
  const [conversionType, setConversionType] = useState<ConversionType>("weight");

  // Weight state
  const [weightValue, setWeightValue] = useState<number>(0);
  const [weightFromUnit, setWeightFromUnit] = useState("kg");
  const [weightToUnit, setWeightToUnit] = useState("lb");

  // Volume state
  const [volumeValue, setVolumeValue] = useState<number>(0);
  const [volumeFromUnit, setVolumeFromUnit] = useState("cbm");
  const [volumeToUnit, setVolumeToUnit] = useState("cft");

  // Length state
  const [lengthValue, setLengthValue] = useState<number>(0);
  const [lengthFromUnit, setLengthFromUnit] = useState("cm");
  const [lengthToUnit, setLengthToUnit] = useState("in");

  // Volumetric weight state
  const [volLength, setVolLength] = useState<number>(0);
  const [volWidth, setVolWidth] = useState<number>(0);
  const [volHeight, setVolHeight] = useState<number>(0);
  const [volUnit, setVolUnit] = useState<"cm" | "in">("cm");
  const [actualWeight, setActualWeight] = useState<number>(0);

  // Calculations
  const weightResult = useMemo(() => {
    const fromUnit = WEIGHT_UNITS.find((u) => u.id === weightFromUnit);
    const toUnit = WEIGHT_UNITS.find((u) => u.id === weightToUnit);
    if (!fromUnit || !toUnit || !weightValue) return 0;
    const inKg = weightValue * fromUnit.toKg;
    return inKg / toUnit.toKg;
  }, [weightValue, weightFromUnit, weightToUnit]);

  const volumeResult = useMemo(() => {
    const fromUnit = VOLUME_UNITS.find((u) => u.id === volumeFromUnit);
    const toUnit = VOLUME_UNITS.find((u) => u.id === volumeToUnit);
    if (!fromUnit || !toUnit || !volumeValue) return 0;
    const inCbm = volumeValue * fromUnit.toCbm;
    return inCbm / toUnit.toCbm;
  }, [volumeValue, volumeFromUnit, volumeToUnit]);

  const lengthResult = useMemo(() => {
    const fromUnit = LENGTH_UNITS.find((u) => u.id === lengthFromUnit);
    const toUnit = LENGTH_UNITS.find((u) => u.id === lengthToUnit);
    if (!fromUnit || !toUnit || !lengthValue) return 0;
    const inM = lengthValue * fromUnit.toM;
    return inM / toUnit.toM;
  }, [lengthValue, lengthFromUnit, lengthToUnit]);

  const volumetricResult = useMemo(() => {
    if (!volLength || !volWidth || !volHeight) return null;

    // Convert to cm first
    let l = volLength,
      w = volWidth,
      h = volHeight;
    if (volUnit === "in") {
      l *= 2.54;
      w *= 2.54;
      h *= 2.54;
    }

    // CBM
    const cbm = (l * w * h) / 1000000;

    // Volumetric weight calculations
    const volWeightAir = (l * w * h) / 6000; // Air freight factor
    const volWeightSea = cbm * 1000; // Sea freight (1 CBM = 1000 kg)
    const volWeightCourier = (l * w * h) / 5000; // Courier/express factor

    // Chargeable weight
    const chargeableAir = Math.max(actualWeight, volWeightAir);
    const chargeableSea = Math.max(actualWeight, volWeightSea);
    const chargeableCourier = Math.max(actualWeight, volWeightCourier);

    return {
      cbm,
      volWeightAir,
      volWeightSea,
      volWeightCourier,
      chargeableAir,
      chargeableSea,
      chargeableCourier,
    };
  }, [volLength, volWidth, volHeight, volUnit, actualWeight]);

  const swapUnits = (type: "weight" | "volume" | "length") => {
    if (type === "weight") {
      setWeightFromUnit(weightToUnit);
      setWeightToUnit(weightFromUnit);
    } else if (type === "volume") {
      setVolumeFromUnit(volumeToUnit);
      setVolumeToUnit(volumeFromUnit);
    } else {
      setLengthFromUnit(lengthToUnit);
      setLengthToUnit(lengthFromUnit);
    }
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
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Chuyển đổi trọng lượng & thể tích</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Type Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "weight", name: "Trọng lượng" },
            { id: "volume", name: "Thể tích" },
            { id: "length", name: "Chiều dài" },
            { id: "volumetric", name: "TL quy đổi" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setConversionType(type.id as ConversionType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                conversionType === type.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Weight Conversion */}
        {conversionType === "weight" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Chuyển đổi trọng lượng</h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Từ</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={weightValue || ""}
                    onChange={(e) => setWeightValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                  <select
                    value={weightFromUnit}
                    onChange={(e) => setWeightFromUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {WEIGHT_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => swapUnits("weight")}
                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 text-slate-600" />
              </button>

              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Sang</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-semibold">
                    {weightResult.toFixed(4)}
                  </div>
                  <select
                    value={weightToUnit}
                    onChange={(e) => setWeightToUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {WEIGHT_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Tham khảo nhanh</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-slate-50 p-2 rounded">1 kg = 2.205 lb</div>
                <div className="bg-slate-50 p-2 rounded">1 lb = 0.454 kg</div>
                <div className="bg-slate-50 p-2 rounded">1 T = 1,000 kg</div>
                <div className="bg-slate-50 p-2 rounded">1 kg = 35.274 oz</div>
              </div>
            </div>
          </div>
        )}

        {/* Volume Conversion */}
        {conversionType === "volume" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Chuyển đổi thể tích</h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Từ</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={volumeValue || ""}
                    onChange={(e) => setVolumeValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                  <select
                    value={volumeFromUnit}
                    onChange={(e) => setVolumeFromUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {VOLUME_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => swapUnits("volume")}
                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 text-slate-600" />
              </button>

              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Sang</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-semibold">
                    {volumeResult.toFixed(4)}
                  </div>
                  <select
                    value={volumeToUnit}
                    onChange={(e) => setVolumeToUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {VOLUME_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Tham khảo nhanh</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-slate-50 p-2 rounded">1 CBM = 35.315 CFT</div>
                <div className="bg-slate-50 p-2 rounded">1 CBM = 1,000 L</div>
                <div className="bg-slate-50 p-2 rounded">1 CFT = 28.317 L</div>
                <div className="bg-slate-50 p-2 rounded">1 gal = 3.785 L</div>
              </div>
            </div>
          </div>
        )}

        {/* Length Conversion */}
        {conversionType === "length" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Chuyển đổi chiều dài</h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Từ</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={lengthValue || ""}
                    onChange={(e) => setLengthValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                  <select
                    value={lengthFromUnit}
                    onChange={(e) => setLengthFromUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {LENGTH_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => swapUnits("length")}
                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 text-slate-600" />
              </button>

              <div className="flex-1 w-full">
                <label className="block text-sm text-slate-500 mb-1">Sang</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-semibold">
                    {lengthResult.toFixed(4)}
                  </div>
                  <select
                    value={lengthToUnit}
                    onChange={(e) => setLengthToUnit(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {LENGTH_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.symbol} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Tham khảo nhanh</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-slate-50 p-2 rounded">1 m = 3.281 ft</div>
                <div className="bg-slate-50 p-2 rounded">1 ft = 30.48 cm</div>
                <div className="bg-slate-50 p-2 rounded">1 in = 2.54 cm</div>
                <div className="bg-slate-50 p-2 rounded">1 m = 39.37 in</div>
              </div>
            </div>
          </div>
        )}

        {/* Volumetric Weight Calculator */}
        {conversionType === "volumetric" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Tính trọng lượng quy đổi</h2>

              {/* Dimension Unit */}
              <div className="mb-4">
                <label className="block text-sm text-slate-500 mb-1">Đơn vị kích thước</label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden w-fit">
                  <button
                    onClick={() => setVolUnit("cm")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      volUnit === "cm"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    cm
                  </button>
                  <button
                    onClick={() => setVolUnit("in")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      volUnit === "in"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    inch
                  </button>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Dài ({volUnit})</label>
                  <input
                    type="number"
                    value={volLength || ""}
                    onChange={(e) => setVolLength(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Rộng ({volUnit})</label>
                  <input
                    type="number"
                    value={volWidth || ""}
                    onChange={(e) => setVolWidth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Cao ({volUnit})</label>
                  <input
                    type="number"
                    value={volHeight || ""}
                    onChange={(e) => setVolHeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">TL thực (kg)</label>
                  <input
                    type="number"
                    value={actualWeight || ""}
                    onChange={(e) => setActualWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            {volumetricResult && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* CBM */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
                  <div className="text-sm text-slate-400 mb-1">Thể tích</div>
                  <div className="text-3xl font-bold">{volumetricResult.cbm.toFixed(4)}</div>
                  <div className="text-sm text-slate-400">CBM (m³)</div>
                </div>

                {/* Volumetric Weights */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Trọng lượng quy đổi</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Air Freight (÷6000)</span>
                      <span className="font-medium">{volumetricResult.volWeightAir.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sea Freight (x1000)</span>
                      <span className="font-medium">{volumetricResult.volWeightSea.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Courier (÷5000)</span>
                      <span className="font-medium">{volumetricResult.volWeightCourier.toFixed(2)} kg</span>
                    </div>
                  </div>
                </div>

                {/* Chargeable Weights */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <h3 className="font-semibold text-slate-900 mb-3">Trọng lượng tính cước</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 mb-1">Air Freight</div>
                      <div className="text-xl font-bold text-red-700">
                        {volumetricResult.chargeableAir.toFixed(2)} kg
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 mb-1">Sea Freight</div>
                      <div className="text-xl font-bold text-blue-700">
                        {volumetricResult.chargeableSea.toFixed(2)} kg
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-orange-600 mb-1">Courier</div>
                      <div className="text-xl font-bold text-orange-700">
                        {volumetricResult.chargeableCourier.toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formula Info */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-900 mb-1">Công thức tính</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Air: (D x R x C) / 6000 (cm) hoặc (D x R x C) / 366 (inch)</li>
                    <li>• Sea: CBM x 1000 kg (1 CBM = 1 Freight Ton)</li>
                    <li>• Courier: (D x R x C) / 5000 (cm)</li>
                    <li>• Tính cước = Max(TL thực, TL quy đổi)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

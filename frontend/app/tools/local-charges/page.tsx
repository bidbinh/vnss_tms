"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Ship, Plane, Info, ChevronDown, ChevronUp } from "lucide-react";

// Vietnamese ports
const PORTS = [
  { id: "VNSGN", name: "Cat Lai", city: "Ho Chi Minh", type: "sea" },
  { id: "VNHPH", name: "Hai Phong", city: "Hai Phong", type: "sea" },
  { id: "VNCLI", name: "Cai Lan", city: "Quang Ninh", type: "sea" },
  { id: "VNDAD", name: "Da Nang", city: "Da Nang", type: "sea" },
  { id: "VNQUT", name: "Quy Nhon", city: "Binh Dinh", type: "sea" },
  { id: "VNVUT", name: "Vung Tau", city: "Ba Ria Vung Tau", type: "sea" },
  { id: "VNTCT", name: "Tan Cang", city: "Ho Chi Minh", type: "sea" },
];

// Local charges data structure
const LOCAL_CHARGES_SEA = {
  import: [
    { code: "THC", name: "Terminal Handling Charge", nameVi: "Phí xếp dỡ tại cảng", unit: "cont", rate20: 95, rate40: 150, currency: "USD" },
    { code: "DOC", name: "Documentation Fee", nameVi: "Phí chứng từ", unit: "BL", rate20: 50, rate40: 50, currency: "USD" },
    { code: "CFS", name: "Container Freight Station", nameVi: "Phí kho CFS (LCL)", unit: "CBM", rate20: 15, rate40: 15, currency: "USD" },
    { code: "LOLO", name: "Lift On/Lift Off", nameVi: "Phí nâng hạ", unit: "cont", rate20: 45, rate40: 70, currency: "USD" },
    { code: "SEAL", name: "Seal Fee", nameVi: "Phí seal", unit: "cont", rate20: 15, rate40: 15, currency: "USD" },
    { code: "D/O", name: "Delivery Order", nameVi: "Phí lệnh giao hàng", unit: "BL", rate20: 50, rate40: 50, currency: "USD" },
    { code: "HANDLING", name: "Handling Fee", nameVi: "Phí làm hàng", unit: "BL", rate20: 35, rate40: 35, currency: "USD" },
    { code: "CIC", name: "Container Imbalance Charge", nameVi: "Phí mất cân bằng cont", unit: "cont", rate20: 0, rate40: 0, currency: "USD" },
    { code: "ENS", name: "Entry Summary Declaration", nameVi: "Phí khai báo ENS (EU)", unit: "BL", rate20: 35, rate40: 35, currency: "USD" },
    { code: "AMS", name: "Automated Manifest System", nameVi: "Phí khai báo AMS (US)", unit: "BL", rate20: 35, rate40: 35, currency: "USD" },
    { code: "ISF", name: "Import Security Filing", nameVi: "Phí ISF (US)", unit: "BL", rate20: 35, rate40: 35, currency: "USD" },
  ],
  export: [
    { code: "THC", name: "Terminal Handling Charge", nameVi: "Phí xếp dỡ tại cảng", unit: "cont", rate20: 95, rate40: 150, currency: "USD" },
    { code: "DOC", name: "Documentation Fee", nameVi: "Phí chứng từ", unit: "BL", rate20: 50, rate40: 50, currency: "USD" },
    { code: "VGM", name: "Verified Gross Mass", nameVi: "Phí xác nhận trọng lượng", unit: "cont", rate20: 25, rate40: 25, currency: "USD" },
    { code: "SEAL", name: "Seal Fee", nameVi: "Phí seal", unit: "cont", rate20: 15, rate40: 15, currency: "USD" },
    { code: "LOLO", name: "Lift On/Lift Off", nameVi: "Phí nâng hạ", unit: "cont", rate20: 45, rate40: 70, currency: "USD" },
    { code: "B/L", name: "Bill of Lading", nameVi: "Phí phát hành B/L", unit: "BL", rate20: 55, rate40: 55, currency: "USD" },
    { code: "HANDLING", name: "Handling Fee", nameVi: "Phí làm hàng", unit: "BL", rate20: 35, rate40: 35, currency: "USD" },
    { code: "TELEX", name: "Telex Release", nameVi: "Phí telex release", unit: "BL", rate20: 45, rate40: 45, currency: "USD" },
  ],
};

const LOCAL_CHARGES_AIR = {
  import: [
    { code: "HAWB", name: "House Airway Bill", nameVi: "Phí HAWB", unit: "AWB", rate: 35, currency: "USD" },
    { code: "HANDLING", name: "Handling Fee", nameVi: "Phí làm hàng", unit: "AWB", rate: 30, currency: "USD" },
    { code: "D/O", name: "Delivery Order", nameVi: "Phí lệnh giao hàng", unit: "AWB", rate: 30, currency: "USD" },
    { code: "STORAGE", name: "Storage Fee", nameVi: "Phí lưu kho", unit: "kg/ngày", rate: 0.03, currency: "USD" },
    { code: "CUSTOMS", name: "Customs Clearance", nameVi: "Phí thông quan", unit: "AWB", rate: 45, currency: "USD" },
    { code: "X-RAY", name: "X-Ray Fee", nameVi: "Phí soi chiếu", unit: "AWB", rate: 15, currency: "USD" },
  ],
  export: [
    { code: "HAWB", name: "House Airway Bill", nameVi: "Phí HAWB", unit: "AWB", rate: 35, currency: "USD" },
    { code: "HANDLING", name: "Handling Fee", nameVi: "Phí làm hàng", unit: "AWB", rate: 30, currency: "USD" },
    { code: "AWB", name: "Airway Bill Issuance", nameVi: "Phí phát hành AWB", unit: "AWB", rate: 45, currency: "USD" },
    { code: "SCREEN", name: "Screening Fee", nameVi: "Phí soi chiếu", unit: "kg", rate: 0.05, currency: "USD" },
    { code: "FUEL", name: "Fuel Surcharge", nameVi: "Phụ phí nhiên liệu", unit: "kg", rate: 0.8, currency: "USD" },
    { code: "SECURITY", name: "Security Surcharge", nameVi: "Phụ phí an ninh", unit: "kg", rate: 0.15, currency: "USD" },
  ],
};

type ChargeType = "import" | "export";
type TransportMode = "sea" | "air";
type ContainerSize = "20" | "40";

export default function LocalChargesPage() {
  const [transportMode, setTransportMode] = useState<TransportMode>("sea");
  const [chargeType, setChargeType] = useState<ChargeType>("import");
  const [containerSize, setContainerSize] = useState<ContainerSize>("40");
  const [containerCount, setContainerCount] = useState(1);
  const [cbm, setCbm] = useState(0);
  const [weight, setWeight] = useState(0);
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  // Get charges based on mode and type
  const charges = useMemo(() => {
    if (transportMode === "sea") {
      return LOCAL_CHARGES_SEA[chargeType];
    }
    return LOCAL_CHARGES_AIR[chargeType];
  }, [transportMode, chargeType]);

  // Initialize selected charges when charges change
  useMemo(() => {
    const essentialCodes = transportMode === "sea"
      ? ["THC", "DOC", "HANDLING", chargeType === "import" ? "D/O" : "B/L"]
      : ["HAWB", "HANDLING", chargeType === "import" ? "D/O" : "AWB"];
    setSelectedCharges(essentialCodes.filter(code => charges.some(c => c.code === code)));
  }, [transportMode, chargeType, charges]);

  // Calculate total
  const totalCharges = useMemo(() => {
    let total = 0;
    const breakdown: Array<{ code: string; name: string; amount: number }> = [];

    charges.forEach((charge) => {
      if (!selectedCharges.includes(charge.code)) return;

      let amount = 0;
      if (transportMode === "sea") {
        const seaCharge = charge as typeof LOCAL_CHARGES_SEA.import[0];
        if (seaCharge.unit === "cont") {
          const rate = containerSize === "20" ? seaCharge.rate20 : seaCharge.rate40;
          amount = rate * containerCount;
        } else if (seaCharge.unit === "BL") {
          amount = seaCharge.rate20; // BL charges are same for 20/40
        } else if (seaCharge.unit === "CBM") {
          amount = seaCharge.rate20 * cbm;
        }
      } else {
        const airCharge = charge as typeof LOCAL_CHARGES_AIR.import[0];
        if (airCharge.unit === "AWB") {
          amount = airCharge.rate;
        } else if (airCharge.unit === "kg" || airCharge.unit === "kg/ngay") {
          amount = airCharge.rate * weight;
        }
      }

      if (amount > 0) {
        total += amount;
        breakdown.push({ code: charge.code, name: charge.nameVi, amount });
      }
    });

    return { total, breakdown };
  }, [charges, selectedCharges, transportMode, containerSize, containerCount, cbm, weight]);

  const toggleCharge = (code: string) => {
    setSelectedCharges((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
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
              <span className="font-semibold text-white">Tính phí Local Charges</span>
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
            {/* Mode Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Phương thức vận chuyển</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setTransportMode("sea")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        transportMode === "sea"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Ship className="w-4 h-4" />
                      Đường biển
                    </button>
                    <button
                      onClick={() => setTransportMode("air")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        transportMode === "air"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Plane className="w-4 h-4" />
                      Đường không
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Loại hình</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setChargeType("import")}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        chargeType === "import"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Nhập khẩu
                    </button>
                    <button
                      onClick={() => setChargeType("export")}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        chargeType === "export"
                          ? "bg-green-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Xuất khẩu
                    </button>
                  </div>
                </div>
              </div>

              {/* Container/Weight inputs */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {transportMode === "sea" ? (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Kích thước cont</label>
                      <select
                        value={containerSize}
                        onChange={(e) => setContainerSize(e.target.value as ContainerSize)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="20">20'</option>
                        <option value="40">40'/40HC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Số lượng cont</label>
                      <input
                        type="number"
                        value={containerCount}
                        onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">CBM (cho LCL)</label>
                      <input
                        type="number"
                        value={cbm || ""}
                        onChange={(e) => setCbm(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Trọng lượng (kg)</label>
                      <input
                        type="number"
                        value={weight || ""}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Charges Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-4">
                Các khoản phí {chargeType === "import" ? "nhập khẩu" : "xuất khẩu"} ({transportMode === "sea" ? "đường biển" : "đường không"})
              </h2>
              <div className="space-y-2">
                {charges.map((charge) => (
                  <div key={charge.code} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        selectedCharges.includes(charge.code) ? "bg-red-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => toggleCharge(charge.code)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCharges.includes(charge.code)}
                          onChange={() => {}}
                          className="w-4 h-4 text-red-500 rounded"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{charge.code}</div>
                          <div className="text-sm text-slate-500">{charge.nameVi}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {transportMode === "sea" ? (
                            <div className="text-sm font-medium text-slate-900">
                              ${(charge as typeof LOCAL_CHARGES_SEA.import[0]).rate20} - ${(charge as typeof LOCAL_CHARGES_SEA.import[0]).rate40}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-slate-900">
                              ${(charge as typeof LOCAL_CHARGES_AIR.import[0]).rate}
                            </div>
                          )}
                          <div className="text-xs text-slate-400">/{charge.unit}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedInfo(expandedInfo === charge.code ? null : charge.code);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {expandedInfo === charge.code ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedInfo === charge.code && (
                      <div className="px-3 pb-3 bg-slate-50 text-sm text-slate-600">
                        <div className="pt-2 border-t border-slate-200">
                          <strong>{charge.name}</strong>: {charge.nameVi}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
              <div className="text-sm text-slate-400 mb-1">Tổng phí Local Charges</div>
              <div className="text-3xl font-bold">${totalCharges.total.toLocaleString()}</div>
              <div className="text-sm text-slate-400 mt-1">
                {transportMode === "sea"
                  ? `${containerCount} x ${containerSize}' container`
                  : `${weight} kg`}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Chi tiết phí</h3>
              {totalCharges.breakdown.length > 0 ? (
                <div className="space-y-2">
                  {totalCharges.breakdown.map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.code}</span>
                      <span className="font-medium">${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Tổng cộng</span>
                      <span className="text-red-600">${totalCharges.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">Chưa chọn khoản phí nào</p>
              )}
            </div>

            {/* Info */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-900 mb-1">Lưu ý</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Mức phí tham khảo, có thể thay đổi theo từng hãng tàu/hãng bay</li>
                    <li>• Chưa bao gồm phí hải quan, kiểm tra chuyên ngành</li>
                    <li>• Liên hệ forwarder để biết chính xác phí áp dụng</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

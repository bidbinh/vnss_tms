"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Calendar, Container, Ship, AlertTriangle, Info } from "lucide-react";

// Sample carrier free time policies
const CARRIERS = [
  { id: "maersk", name: "Maersk", demFree: 7, detFree: 4, demRate: 50, detRate: 30, currency: "USD" },
  { id: "msc", name: "MSC", demFree: 7, detFree: 5, demRate: 45, detRate: 25, currency: "USD" },
  { id: "cosco", name: "COSCO", demFree: 10, detFree: 7, demRate: 40, detRate: 28, currency: "USD" },
  { id: "evergreen", name: "Evergreen", demFree: 7, detFree: 4, demRate: 48, detRate: 32, currency: "USD" },
  { id: "hapag", name: "Hapag-Lloyd", demFree: 7, detFree: 5, demRate: 55, detRate: 35, currency: "USD" },
  { id: "one", name: "ONE", demFree: 7, detFree: 4, demRate: 52, detRate: 30, currency: "USD" },
  { id: "yangming", name: "Yang Ming", demFree: 10, detFree: 7, demRate: 42, detRate: 26, currency: "USD" },
  { id: "hmm", name: "HMM", demFree: 7, detFree: 5, demRate: 48, detRate: 28, currency: "USD" },
  { id: "zim", name: "ZIM", demFree: 5, detFree: 3, demRate: 60, detRate: 40, currency: "USD" },
  { id: "custom", name: "Tùy chỉnh", demFree: 7, detFree: 4, demRate: 50, detRate: 30, currency: "USD" },
];

const CONTAINER_TYPES = [
  { id: "20DC", name: "20' Dry", multiplier: 1 },
  { id: "40DC", name: "40' Dry", multiplier: 2 },
  { id: "40HC", name: "40' High Cube", multiplier: 2 },
  { id: "20RF", name: "20' Reefer", multiplier: 1.5 },
  { id: "40RF", name: "40' Reefer", multiplier: 3 },
  { id: "20OT", name: "20' Open Top", multiplier: 1.2 },
  { id: "40OT", name: "40' Open Top", multiplier: 2.4 },
];

export default function DemDetCalculatorPage() {
  const [selectedCarrier, setSelectedCarrier] = useState(CARRIERS[0]);
  const [containerType, setContainerType] = useState(CONTAINER_TYPES[1]);
  const [containerCount, setContainerCount] = useState(1);

  // Dates
  const [arrivalDate, setArrivalDate] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Custom rates (for custom carrier)
  const [customDemFree, setCustomDemFree] = useState(7);
  const [customDetFree, setCustomDetFree] = useState(4);
  const [customDemRate, setCustomDemRate] = useState(50);
  const [customDetRate, setCustomDetRate] = useState(30);

  // Get effective rates
  const effectiveCarrier = useMemo(() => {
    if (selectedCarrier.id === "custom") {
      return {
        ...selectedCarrier,
        demFree: customDemFree,
        detFree: customDetFree,
        demRate: customDemRate,
        detRate: customDetRate,
      };
    }
    return selectedCarrier;
  }, [selectedCarrier, customDemFree, customDetFree, customDemRate, customDetRate]);

  // Calculate days
  const calculations = useMemo(() => {
    if (!arrivalDate || !pickupDate) {
      return null;
    }

    const arrival = new Date(arrivalDate);
    const pickup = new Date(pickupDate);
    const returnD = returnDate ? new Date(returnDate) : null;

    // Demurrage: Days container sits at port (arrival to pickup)
    const demDays = Math.max(0, Math.ceil((pickup.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
    const demChargeableDays = Math.max(0, demDays - effectiveCarrier.demFree);

    // Detention: Days container is outside port (pickup to return)
    let detDays = 0;
    let detChargeableDays = 0;
    if (returnD) {
      detDays = Math.max(0, Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));
      detChargeableDays = Math.max(0, detDays - effectiveCarrier.detFree);
    }

    // Calculate costs
    const containerMultiplier = containerType.multiplier * containerCount;
    const demCost = demChargeableDays * effectiveCarrier.demRate * containerMultiplier;
    const detCost = detChargeableDays * effectiveCarrier.detRate * containerMultiplier;
    const totalCost = demCost + detCost;

    return {
      demDays,
      demFreeDays: effectiveCarrier.demFree,
      demChargeableDays,
      demCost,
      detDays,
      detFreeDays: effectiveCarrier.detFree,
      detChargeableDays,
      detCost,
      totalCost,
      containerMultiplier,
    };
  }, [arrivalDate, pickupDate, returnDate, effectiveCarrier, containerType, containerCount]);

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
              <span className="font-semibold text-white">Tính phí DEM/DET</span>
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
            {/* Carrier & Container Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-4">Thông tin hãng tàu & container</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Carrier Selection */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Hãng tàu</label>
                  <select
                    value={selectedCarrier.id}
                    onChange={(e) => {
                      const carrier = CARRIERS.find((c) => c.id === e.target.value);
                      if (carrier) setSelectedCarrier(carrier);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {CARRIERS.map((carrier) => (
                      <option key={carrier.id} value={carrier.id}>
                        {carrier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Container Type */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Loại container</label>
                  <select
                    value={containerType.id}
                    onChange={(e) => {
                      const type = CONTAINER_TYPES.find((t) => t.id === e.target.value);
                      if (type) setContainerType(type);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {CONTAINER_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Container Count */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Số lượng container</label>
                  <input
                    type="number"
                    value={containerCount}
                    onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Custom Rates */}
              {selectedCarrier.id === "custom" && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Tùy chỉnh mức phí</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">DEM Free (ngày)</label>
                      <input
                        type="number"
                        value={customDemFree}
                        onChange={(e) => setCustomDemFree(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">DEM Rate (USD/ngày)</label>
                      <input
                        type="number"
                        value={customDemRate}
                        onChange={(e) => setCustomDemRate(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">DET Free (ngày)</label>
                      <input
                        type="number"
                        value={customDetFree}
                        onChange={(e) => setCustomDetFree(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">DET Rate (USD/ngày)</label>
                      <input
                        type="number"
                        value={customDetRate}
                        onChange={(e) => setCustomDetRate(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-4">Thời gian</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ngày tàu cập cảng
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    <Container className="w-4 h-4 inline mr-1" />
                    Ngày lấy hàng
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={arrivalDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    <Ship className="w-4 h-4 inline mr-1" />
                    Ngày trả vỏ cont
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={pickupDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Carrier Free Time Reference */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-4">Thời gian miễn phí các hãng tàu (tham khảo)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Hãng tàu</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">DEM Free</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">DEM Rate</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">DET Free</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">DET Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CARRIERS.filter((c) => c.id !== "custom").map((carrier) => (
                      <tr
                        key={carrier.id}
                        className={`border-b border-slate-100 ${
                          selectedCarrier.id === carrier.id ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-medium">{carrier.name}</td>
                        <td className="py-2 px-3 text-center">{carrier.demFree} ngày</td>
                        <td className="py-2 px-3 text-center">${carrier.demRate}/ngày</td>
                        <td className="py-2 px-3 text-center">{carrier.detFree} ngày</td>
                        <td className="py-2 px-3 text-center">${carrier.detRate}/ngày</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                * Mức phí tham khảo cho container 20'. Container 40' thường x2, Reefer cao hơn.
              </p>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {calculations ? (
              <>
                {/* Demurrage */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Ship className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Demurrage (DEM)</div>
                      <div className="text-xs text-slate-500">Phí lưu cont tại cảng</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tổng số ngày tại cảng</span>
                      <span className="font-medium">{calculations.demDays} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số ngày miễn phí</span>
                      <span className="font-medium text-green-600">-{calculations.demFreeDays} ngày</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Số ngày tính phí</span>
                      <span className="font-bold text-orange-600">{calculations.demChargeableDays} ngày</span>
                    </div>
                    <div className="flex justify-between bg-orange-50 -mx-4 px-4 py-2 mt-2">
                      <span className="font-medium text-orange-800">Phí DEM</span>
                      <span className="font-bold text-orange-600">
                        ${calculations.demCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detention */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Container className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Detention (DET)</div>
                      <div className="text-xs text-slate-500">Phí lưu cont ngoài cảng</div>
                    </div>
                  </div>
                  {returnDate ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tổng số ngày giữ cont</span>
                        <span className="font-medium">{calculations.detDays} ngày</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Số ngày miễn phí</span>
                        <span className="font-medium text-green-600">-{calculations.detFreeDays} ngày</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2">
                        <span className="text-slate-500">Số ngày tính phí</span>
                        <span className="font-bold text-blue-600">{calculations.detChargeableDays} ngày</span>
                      </div>
                      <div className="flex justify-between bg-blue-50 -mx-4 px-4 py-2 mt-2">
                        <span className="font-medium text-blue-800">Phí DET</span>
                        <span className="font-bold text-blue-600">
                          ${calculations.detCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      Nhập ngày trả vỏ cont để tính DET
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
                  <div className="text-sm text-slate-400 mb-1">Tổng phí DEM + DET</div>
                  <div className="text-3xl font-bold">${calculations.totalCost.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    {containerCount} x {containerType.name} ({selectedCarrier.name})
                  </div>
                </div>

                {/* Warning if high cost */}
                {calculations.totalCost > 500 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                      <div>
                        <div className="font-medium text-yellow-800 mb-1">Cảnh báo chi phí cao</div>
                        <p className="text-sm text-yellow-700">
                          Chi phí DEM/DET đang cao. Cần xem xét rút hàng sớm hơn hoặc đàm phán
                          thêm ngày miễn phí với hãng tàu.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nhập ngày tàu cập cảng và ngày lấy hàng để tính phí</p>
              </div>
            )}

            {/* Info */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900 mb-2">Giải thích</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Demurrage</strong>: Phí lưu container tại cảng/depot</li>
                <li>• <strong>Detention</strong>: Phí giữ container ngoài cảng</li>
                <li>• Free time khác nhau tùy hãng tàu và hợp đồng</li>
                <li>• Mức phí có thể thay đổi theo thời điểm</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

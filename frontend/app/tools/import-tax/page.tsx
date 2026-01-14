"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator, Info, Search, ChevronDown, X, Loader2 } from "lucide-react";

interface TariffItem {
  l: number;
  hs: string;
  vi: string;
  en: string;
  u: string;
  nk_tt: string;
  nk_ud: string;
  vat: string;
  ttdb: string;
  // FTA rates
  acfta: string;
  atiga: string;
  ajcep: string;
  vjepa: string;
  akfta: string;
  aanzfta: string;
  aifta: string;
  vkfta: string;
  vcfta: string;
  vneaeu: string;
  cptpp: string;
  ahkfta: string;
  vncu: string;
  evfta: string;
  ukvfta: string;
  vnlao: string;
  vifta: string;
  rcept_a: string;
  rcept_b: string;
  rcept_c: string;
  rcept_d: string;
  rcept_e: string;
  rcept_f: string;
  bvmt: string;
  xk: string;
}

// FTA options for C/O selection
const FTA_OPTIONS = [
  { key: "nk_tt", label: "Thuế NK Thông thường (MFN)", desc: "Không có C/O ưu đãi" },
  { key: "nk_ud", label: "Thuế NK Ưu đãi", desc: "C/O Form thông thường" },
  { key: "atiga", label: "ATIGA (ASEAN)", desc: "C/O Form D" },
  { key: "acfta", label: "ACFTA (ASEAN-Trung Quốc)", desc: "C/O Form E" },
  { key: "akfta", label: "AKFTA (ASEAN-Hàn Quốc)", desc: "C/O Form AK" },
  { key: "ajcep", label: "AJCEP (ASEAN-Nhật Bản)", desc: "C/O Form AJ" },
  { key: "aanzfta", label: "AANZFTA (ASEAN-Úc-NZ)", desc: "C/O Form AANZ" },
  { key: "aifta", label: "AIFTA (ASEAN-Ấn Độ)", desc: "C/O Form AI" },
  { key: "ahkfta", label: "AHKFTA (ASEAN-HongKong)", desc: "C/O Form AHK" },
  { key: "vjepa", label: "VJEPA (Việt-Nhật)", desc: "C/O Form VJ" },
  { key: "vkfta", label: "VKFTA (Việt-Hàn)", desc: "C/O Form VK" },
  { key: "vcfta", label: "VCFTA (Việt-Chile)", desc: "C/O Form VC" },
  { key: "evfta", label: "EVFTA (Việt-EU)", desc: "C/O Form EUR.1 hoặc REX" },
  { key: "ukvfta", label: "UKVFTA (Việt-UK)", desc: "C/O Form EUR.1 UK" },
  { key: "cptpp", label: "CPTPP", desc: "C/O Form CPTPP" },
  { key: "vneaeu", label: "VN-EAEU (Liên minh Á-Âu)", desc: "C/O Form EAV" },
  { key: "vncu", label: "VN-Cuba", desc: "C/O Form S" },
  { key: "vnlao", label: "VN-Lào", desc: "C/O biên mậu" },
  { key: "vifta", label: "VIFTA (Việt-Israel)", desc: "C/O Form VI" },
  { key: "rcept_a", label: "RCEP (Nhóm A)", desc: "C/O Form RCEP" },
  { key: "rcept_b", label: "RCEP (Nhóm B)", desc: "C/O Form RCEP" },
  { key: "rcept_c", label: "RCEP (Nhóm C)", desc: "C/O Form RCEP" },
  { key: "rcept_d", label: "RCEP (Nhóm D)", desc: "C/O Form RCEP" },
  { key: "rcept_e", label: "RCEP (Nhóm E)", desc: "C/O Form RCEP" },
  { key: "rcept_f", label: "RCEP (Nhóm F)", desc: "C/O Form RCEP" },
];

export default function ImportTaxPage() {
  const searchParams = useSearchParams();
  const initialHs = searchParams.get("hs") || "";

  const [tariffData, setTariffData] = useState<TariffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [hsCode, setHsCode] = useState(initialHs);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedItem, setSelectedItem] = useState<TariffItem | null>(null);
  const [cifValue, setCifValue] = useState("");
  const [exchangeRate, setExchangeRate] = useState("25500");
  const [selectedFta, setSelectedFta] = useState("nk_tt");

  const [result, setResult] = useState<{
    cifVnd: number;
    nkRate: number;
    nkTax: number;
    ttdbRate: number;
    ttdbTax: number;
    vatRate: number;
    vatTax: number;
    bvmtTax: number;
    total: number;
    ftaName: string;
  } | null>(null);

  // Load tariff data
  useEffect(() => {
    fetch("/data/tariff-2026.json")
      .then((res) => res.json())
      .then((data) => {
        setTariffData(data);
        setLoading(false);

        // If initial HS code provided, find and select it
        if (initialHs) {
          const found = data.find((item: TariffItem) => item.hs === initialHs);
          if (found) {
            setSelectedItem(found);
            setHsCode(found.hs);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading tariff data:", err);
        setLoading(false);
      });
  }, [initialHs]);

  // Filter for dropdown
  const filteredItems = useMemo(() => {
    if (!searchTerm && !hsCode) return [];
    const term = (searchTerm || hsCode).toLowerCase().trim();
    return tariffData
      .filter(
        (item) =>
          item.hs &&
          item.hs.length === 8 && // Only show 8-digit HS codes (actual tariff items)
          (item.hs.includes(term) ||
            item.vi.toLowerCase().includes(term) ||
            item.en.toLowerCase().includes(term))
      )
      .slice(0, 50);
  }, [tariffData, searchTerm, hsCode]);

  // Parse tax rate string to number
  const parseRate = (rateStr: string): number => {
    if (!rateStr || rateStr === "") return 0;
    // Handle special formats like "*/5/8/10" - take first numeric value or 0
    if (rateStr.includes("*")) return 0;
    if (rateStr.includes("/")) {
      const parts = rateStr.split("/").filter((p) => !isNaN(parseFloat(p)));
      return parts.length > 0 ? parseFloat(parts[0]) : 0;
    }
    const num = parseFloat(rateStr);
    return isNaN(num) ? 0 : num;
  };

  // Calculate tax
  const calculate = () => {
    if (!selectedItem || !cifValue) return;

    const cif = parseFloat(cifValue);
    const rate = parseFloat(exchangeRate);
    const cifVnd = cif * rate;

    // Get tax rate based on selected FTA
    const nkRate = parseRate((selectedItem as any)[selectedFta]);
    const nkTax = cifVnd * (nkRate / 100);

    // TTDB - only if exists
    const ttdbRate = parseRate(selectedItem.ttdb);
    const ttdbTax = ttdbRate > 0 ? (cifVnd + nkTax) * (ttdbRate / 100) : 0;

    // VAT - parse and use first value
    const vatRate = parseRate(selectedItem.vat);
    const vatTax = (cifVnd + nkTax + ttdbTax) * (vatRate / 100);

    // BVMT - environmental protection tax (usually per unit, simplified here)
    const bvmtTax = 0; // Would need unit quantity to calculate properly

    const total = nkTax + ttdbTax + vatTax + bvmtTax;

    const ftaOption = FTA_OPTIONS.find((f) => f.key === selectedFta);

    setResult({
      cifVnd,
      nkRate,
      nkTax,
      ttdbRate,
      ttdbTax,
      vatRate,
      vatTax,
      bvmtTax,
      total,
      ftaName: ftaOption?.label || "Thuế NK Thông thường",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " VNĐ";
  };

  const selectItem = (item: TariffItem) => {
    setSelectedItem(item);
    setHsCode(item.hs);
    setSearchTerm("");
    setShowDropdown(false);
    setResult(null);
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
            <h1 className="text-lg font-bold text-white">Tính thuế nhập khẩu</h1>
          </div>
          <Link href="/" className="flex items-center gap-1">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
            <span className="font-bold text-white">
              log<span className="text-red-500">.tech</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="ml-3 text-slate-600">Đang tải dữ liệu biểu thuế...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* HS Code Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">1. Chọn mặt hàng</h2>

              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm || hsCode}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) {
                        setSelectedItem(null);
                        setHsCode("");
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Nhập mã HS hoặc tên hàng hóa..."
                    className="w-full h-12 pl-10 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {(searchTerm || hsCode) && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setHsCode("");
                        setSelectedItem(null);
                        setResult(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && filteredItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-20">
                    {filteredItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                            {item.hs}
                          </span>
                          <span className="text-sm text-slate-700 line-clamp-1">{item.vi}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Item Info */}
              {selectedItem && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-green-700 font-bold bg-green-100 px-3 py-1 rounded">
                      {selectedItem.hs}
                    </span>
                    <div>
                      <p className="text-green-800 font-medium">{selectedItem.vi}</p>
                      <p className="text-sm text-green-600 mt-1">{selectedItem.en}</p>
                      {selectedItem.u && (
                        <p className="text-xs text-green-500 mt-1">ĐVT: {selectedItem.u}</p>
                      )}
                    </div>
                  </div>

                  {/* Quick tax info */}
                  <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-600">NK TT:</span>
                      <span className="ml-2 font-semibold text-green-800">
                        {selectedItem.nk_tt || "—"}%
                      </span>
                    </div>
                    <div>
                      <span className="text-green-600">NK ƯĐ:</span>
                      <span className="ml-2 font-semibold text-green-800">
                        {selectedItem.nk_ud || "—"}%
                      </span>
                    </div>
                    <div>
                      <span className="text-green-600">VAT:</span>
                      <span className="ml-2 font-semibold text-green-800">
                        {selectedItem.vat || "—"}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-3">
                Hoặc{" "}
                <Link href="/tools/tariff-lookup" className="text-red-500 hover:underline">
                  tra cứu biểu thuế đầy đủ
                </Link>{" "}
                để tìm mã HS chính xác
              </p>
            </div>

            {/* Tax Calculation Form */}
            {selectedItem && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">2. Nhập thông tin tính thuế</h2>

                <div className="grid gap-4">
                  {/* FTA Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Chứng nhận xuất xứ (C/O)
                    </label>
                    <div className="relative">
                      <select
                        value={selectedFta}
                        onChange={(e) => {
                          setSelectedFta(e.target.value);
                          setResult(null);
                        }}
                        className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none cursor-pointer bg-white"
                      >
                        {FTA_OPTIONS.map((opt) => {
                          const rate = (selectedItem as any)[opt.key];
                          const hasRate = rate && rate !== "";
                          return (
                            <option key={opt.key} value={opt.key}>
                              {opt.label} {hasRate ? `(${rate}%)` : "(N/A)"}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {FTA_OPTIONS.find((f) => f.key === selectedFta)?.desc}
                    </p>
                  </div>

                  {/* CIF Value */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trị giá CIF (USD)
                    </label>
                    <input
                      type="number"
                      value={cifValue}
                      onChange={(e) => {
                        setCifValue(e.target.value);
                        setResult(null);
                      }}
                      placeholder="VD: 10000"
                      className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Exchange Rate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tỷ giá USD/VND
                    </label>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => {
                        setExchangeRate(e.target.value);
                        setResult(null);
                      }}
                      className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Tỷ giá tính thuế do Hải quan công bố hàng tuần
                    </p>
                  </div>

                  {/* Calculate Button */}
                  <button
                    onClick={calculate}
                    disabled={!cifValue}
                    className="w-full h-12 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Calculator className="w-5 h-5" />
                    Tính thuế
                  </button>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">3. Kết quả tính thuế</h2>

                {/* FTA Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Áp dụng:</strong> {result.ftaName}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Thuế suất NK: <span className="font-bold">{result.nkRate}%</span>
                    {result.ttdbRate > 0 && (
                      <span className="ml-3">TTĐB: <span className="font-bold">{result.ttdbRate}%</span></span>
                    )}
                    <span className="ml-3">VAT: <span className="font-bold">{result.vatRate}%</span></span>
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Trị giá CIF (VNĐ)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(result.cifVnd)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Thuế nhập khẩu ({result.nkRate}%)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(result.nkTax)}</span>
                  </div>
                  {result.ttdbTax > 0 && (
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-600">Thuế TTĐB ({result.ttdbRate}%)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(result.ttdbTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Thuế VAT ({result.vatRate}%)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(result.vatTax)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 border border-green-200 rounded-lg px-4 mt-4">
                    <span className="font-semibold text-green-700">Tổng thuế phải nộp</span>
                    <span className="font-bold text-green-700 text-xl">{formatCurrency(result.total)}</span>
                  </div>
                </div>

                {/* Savings comparison */}
                {selectedFta !== "nk_tt" && selectedItem && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <p className="text-amber-800">
                      <strong>So với thuế MFN:</strong> Bạn tiết kiệm được{" "}
                      <span className="font-bold text-green-600">
                        {formatCurrency(
                          result.cifVnd * (parseRate(selectedItem.nk_tt) / 100) - result.nkTax
                        )}
                      </span>{" "}
                      khi sử dụng C/O {FTA_OPTIONS.find((f) => f.key === selectedFta)?.desc}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Formula */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-red-500" />
                Công thức tính thuế
              </h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p>
                    <strong className="text-slate-900">Thuế NK</strong> = Trị giá CIF × Thuế suất NK
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p>
                    <strong className="text-slate-900">Thuế TTĐB</strong> = (CIF + Thuế NK) × Thuế suất TTĐB
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p>
                    <strong className="text-slate-900">Thuế VAT</strong> = (CIF + Thuế NK + Thuế TTĐB) × Thuế suất VAT
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>Lưu ý:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Đây là công cụ tính thuế tham khảo, không có giá trị pháp lý</li>
                  <li>Thuế suất ưu đãi FTA chỉ áp dụng khi có C/O hợp lệ từ nước xuất khẩu</li>
                  <li>Thuế VAT có thể có nhiều mức (*/5/8/10 - miễn/5%/8%/10%) tùy mặt hàng</li>
                  <li>Liên hệ Chi cục Hải quan để xác nhận thuế suất chính xác</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 py-6 text-center text-sm text-slate-500">
          © 2026{" "}
          <Link href="/" className="text-red-500 hover:underline">
            9log.tech
          </Link>{" "}
          - Công cụ tính thuế nhập khẩu miễn phí cho ngành Logistics Việt Nam
        </footer>
      </main>
    </div>
  );
}

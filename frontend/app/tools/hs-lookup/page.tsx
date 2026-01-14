"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Brain, Loader2, Info, ChevronRight, FileText } from "lucide-react";

interface TariffItem {
  l: number;
  hs: string;
  vi: string;
  en: string;
  u: string;
  nk_tt: string;
  nk_ud: string;
  vat: string;
}

// Common product categories for quick search
const QUICK_CATEGORIES = [
  { name: "Điện thoại", keywords: "điện thoại, smartphone, mobile phone" },
  { name: "Laptop", keywords: "máy tính xách tay, laptop, notebook" },
  { name: "Quần áo", keywords: "quần áo, áo, quần, apparel, clothing" },
  { name: "Giày dép", keywords: "giày, dép, footwear, shoes" },
  { name: "Thực phẩm", keywords: "thực phẩm, food, thịt, cá, rau" },
  { name: "Mỹ phẩm", keywords: "mỹ phẩm, cosmetics, son, kem" },
  { name: "Xe máy", keywords: "xe máy, xe mô tô, motorcycle" },
  { name: "Ô tô", keywords: "ô tô, xe hơi, car, automobile" },
  { name: "Máy móc", keywords: "máy móc, machinery, thiết bị" },
  { name: "Hóa chất", keywords: "hóa chất, chemicals" },
  { name: "Nhựa", keywords: "nhựa, plastic" },
  { name: "Gỗ", keywords: "gỗ, wood, timber" },
];

export default function HSLookupPage() {
  const [tariffData, setTariffData] = useState<TariffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TariffItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TariffItem | null>(null);

  // Load tariff data
  useEffect(() => {
    fetch("/data/tariff-2026.json")
      .then((res) => res.json())
      .then((data) => {
        setTariffData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading tariff data:", err);
        setLoading(false);
      });
  }, []);

  // Smart search function
  const performSearch = (term: string) => {
    if (!term.trim() || tariffData.length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const searchTerms = term.toLowerCase().split(/\s+/);

      // Score-based search
      const scored = tariffData
        .map((item) => {
          let score = 0;
          const viLower = item.vi.toLowerCase();
          const enLower = item.en.toLowerCase();
          const hsCode = item.hs;

          // Exact HS code match
          if (hsCode === term.replace(/\./g, "")) {
            score += 100;
          } else if (hsCode.startsWith(term.replace(/\./g, ""))) {
            score += 50;
          }

          // Word matching
          searchTerms.forEach((searchWord) => {
            // Vietnamese description
            if (viLower.includes(searchWord)) {
              score += 10;
              // Bonus for word at start
              if (viLower.startsWith(searchWord)) {
                score += 5;
              }
            }
            // English description
            if (enLower.includes(searchWord)) {
              score += 8;
              if (enLower.startsWith(searchWord)) {
                score += 4;
              }
            }
          });

          // Prefer items with HS codes (actual products)
          if (hsCode && hsCode.length >= 8) {
            score += 5;
          }

          return { item, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((s) => s.item);

      setSearchResults(scored);
      setIsSearching(false);
    }, 300);
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, tariffData]);

  // Find parent items for context
  const getParentContext = (item: TariffItem) => {
    if (!item.hs) return [];

    const parents: TariffItem[] = [];
    const itemIndex = tariffData.findIndex((t) => t === item);

    // Look backwards to find parent items
    for (let i = itemIndex - 1; i >= 0 && parents.length < 3; i--) {
      const prev = tariffData[i];
      if (prev.l < item.l) {
        parents.unshift(prev);
      }
    }

    return parents;
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
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Tra cứu mã HS thông minh</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-slate-900 mb-2 text-center">
              Tìm mã HS theo mô tả hàng hóa
            </h1>
            <p className="text-slate-500 text-sm text-center mb-6">
              Nhập tên sản phẩm, mô tả hàng hóa hoặc mã HS để tìm kiếm
            </p>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="VD: điện thoại di động, laptop, áo sơ mi..."
                className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />
              )}
            </div>

            {/* Quick Categories */}
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-2">Tìm nhanh:</div>
              <div className="flex flex-wrap gap-2">
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSearchTerm(cat.name)}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-purple-100 hover:text-purple-700 transition-colors"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Đang tải dữ liệu biểu thuế...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Results List */}
            <div className="lg:col-span-2">
              {searchTerm && searchResults.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Tìm thấy <strong>{searchResults.length}</strong> kết quả
                      </span>
                      <span className="text-xs text-slate-400">Sắp xếp theo độ liên quan</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {searchResults.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                          selectedItem === item ? "bg-purple-50 border-l-4 border-purple-500" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {item.hs && (
                              <div className="inline-block font-mono text-sm bg-slate-900 text-white px-2 py-0.5 rounded mb-2">
                                {item.hs}
                              </div>
                            )}
                            <div className="font-medium text-slate-900 line-clamp-2">{item.vi}</div>
                            {item.en && (
                              <div className="text-sm text-slate-500 line-clamp-1 mt-1">{item.en}</div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                        </div>
                        {item.nk_tt && (
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="text-slate-500">
                              NK: <strong className="text-red-600">{item.nk_tt}%</strong>
                            </span>
                            {item.vat && (
                              <span className="text-slate-500">
                                VAT: <strong className="text-blue-600">{item.vat}%</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchTerm && !isSearching ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Không tìm thấy kết quả phù hợp</p>
                  <p className="text-sm text-slate-400 mt-2">Thử thay đổi từ khóa tìm kiếm</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nhập tên hàng hóa để bắt đầu tìm kiếm</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Hệ thống sẽ tự động gợi ý mã HS phù hợp nhất
                  </p>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div>
              {selectedItem ? (
                <div className="space-y-4 sticky top-4">
                  {/* HS Code */}
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
                    <div className="text-sm opacity-80 mb-1">Mã HS</div>
                    <div className="text-3xl font-bold font-mono">
                      {selectedItem.hs || "N/A"}
                    </div>
                  </div>

                  {/* Parent Context */}
                  {selectedItem.hs && getParentContext(selectedItem).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-3 text-sm">Phân loại</h3>
                      <div className="space-y-2">
                        {getParentContext(selectedItem).map((parent, i) => (
                          <div
                            key={i}
                            className="text-sm text-slate-600 pl-2 border-l-2 border-slate-200"
                            style={{ marginLeft: `${i * 8}px` }}
                          >
                            {parent.vi}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-2">Mô tả</h3>
                    <p className="text-slate-700">{selectedItem.vi}</p>
                    {selectedItem.en && (
                      <p className="text-sm text-slate-500 mt-2">{selectedItem.en}</p>
                    )}
                    {selectedItem.u && (
                      <div className="mt-3 text-sm">
                        <span className="text-slate-500">Đơn vị:</span>{" "}
                        <span className="font-medium">{selectedItem.u}</span>
                      </div>
                    )}
                  </div>

                  {/* Tax Rates */}
                  {(selectedItem.nk_tt || selectedItem.vat) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-3">Thuế suất</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedItem.nk_tt && (
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <div className="text-xs text-red-600 mb-1">Thuế NK</div>
                            <div className="text-xl font-bold text-red-700">{selectedItem.nk_tt}%</div>
                          </div>
                        )}
                        {selectedItem.nk_ud && (
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <div className="text-xs text-orange-600 mb-1">NK Ưu đãi</div>
                            <div className="text-xl font-bold text-orange-700">{selectedItem.nk_ud}%</div>
                          </div>
                        )}
                        {selectedItem.vat && (
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-xs text-blue-600 mb-1">VAT</div>
                            <div className="text-xl font-bold text-blue-700">{selectedItem.vat}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/tools/tariff-lookup?q=${selectedItem.hs}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Xem chi tiết thuế
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center sticky top-4">
                  <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Chọn một kết quả để xem chi tiết</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

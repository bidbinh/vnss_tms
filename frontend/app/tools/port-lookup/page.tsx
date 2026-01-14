"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Anchor, Plane, X } from "lucide-react";

// Common Vietnam ports and international ports
const portsData = [
  // Vietnam Seaports
  { code: "VNSGN", name: "Cảng Sài Gòn", city: "TP.HCM", country: "VN", type: "sea" },
  { code: "VNCMT", name: "Cảng Cát Lái", city: "TP.HCM", country: "VN", type: "sea" },
  { code: "VNHPH", name: "Cảng Hải Phòng", city: "Hải Phòng", country: "VN", type: "sea" },
  { code: "VNDAD", name: "Cảng Đà Nẵng", city: "Đà Nẵng", country: "VN", type: "sea" },
  { code: "VNQNH", name: "Cảng Quy Nhơn", city: "Bình Định", country: "VN", type: "sea" },
  { code: "VNVUT", name: "Cảng Vũng Tàu", city: "Vũng Tàu", country: "VN", type: "sea" },
  { code: "VNCPH", name: "Cảng Cái Mép", city: "Vũng Tàu", country: "VN", type: "sea" },
  { code: "VNHON", name: "Cảng Hòn Gai", city: "Quảng Ninh", country: "VN", type: "sea" },
  { code: "VNNTG", name: "Cảng Nha Trang", city: "Khánh Hòa", country: "VN", type: "sea" },
  { code: "VNPHU", name: "Cảng Phú Mỹ", city: "Vũng Tàu", country: "VN", type: "sea" },
  // Vietnam Airports
  { code: "VNSGN", name: "Sân bay Tân Sơn Nhất", city: "TP.HCM", country: "VN", type: "air" },
  { code: "VNHAN", name: "Sân bay Nội Bài", city: "Hà Nội", country: "VN", type: "air" },
  { code: "VNDAD", name: "Sân bay Đà Nẵng", city: "Đà Nẵng", country: "VN", type: "air" },
  { code: "VNCXR", name: "Sân bay Cam Ranh", city: "Khánh Hòa", country: "VN", type: "air" },
  { code: "VNPQC", name: "Sân bay Phú Quốc", city: "Kiên Giang", country: "VN", type: "air" },
  // China
  { code: "CNSHA", name: "Port of Shanghai", city: "Shanghai", country: "CN", type: "sea" },
  { code: "CNNGB", name: "Port of Ningbo", city: "Ningbo", country: "CN", type: "sea" },
  { code: "CNSHE", name: "Port of Shenzhen", city: "Shenzhen", country: "CN", type: "sea" },
  { code: "CNCAN", name: "Port of Guangzhou", city: "Guangzhou", country: "CN", type: "sea" },
  { code: "CNQIN", name: "Port of Qingdao", city: "Qingdao", country: "CN", type: "sea" },
  { code: "CNTXG", name: "Port of Tianjin", city: "Tianjin", country: "CN", type: "sea" },
  { code: "CNXMN", name: "Port of Xiamen", city: "Xiamen", country: "CN", type: "sea" },
  // Singapore, Malaysia, Thailand
  { code: "SGSIN", name: "Port of Singapore", city: "Singapore", country: "SG", type: "sea" },
  { code: "MYPKG", name: "Port Klang", city: "Selangor", country: "MY", type: "sea" },
  { code: "MYPEN", name: "Port of Penang", city: "Penang", country: "MY", type: "sea" },
  { code: "THBKK", name: "Port of Bangkok", city: "Bangkok", country: "TH", type: "sea" },
  { code: "THLCH", name: "Laem Chabang", city: "Chonburi", country: "TH", type: "sea" },
  // Korea, Japan
  { code: "KRPUS", name: "Port of Busan", city: "Busan", country: "KR", type: "sea" },
  { code: "KRINC", name: "Port of Incheon", city: "Incheon", country: "KR", type: "sea" },
  { code: "JPTYO", name: "Port of Tokyo", city: "Tokyo", country: "JP", type: "sea" },
  { code: "JPYOK", name: "Port of Yokohama", city: "Yokohama", country: "JP", type: "sea" },
  { code: "JPOSA", name: "Port of Osaka", city: "Osaka", country: "JP", type: "sea" },
  { code: "JPNGO", name: "Port of Nagoya", city: "Nagoya", country: "JP", type: "sea" },
  { code: "JPKOB", name: "Port of Kobe", city: "Kobe", country: "JP", type: "sea" },
  // Taiwan, Hong Kong
  { code: "TWKHH", name: "Port of Kaohsiung", city: "Kaohsiung", country: "TW", type: "sea" },
  { code: "TWKEL", name: "Port of Keelung", city: "Keelung", country: "TW", type: "sea" },
  { code: "HKHKG", name: "Port of Hong Kong", city: "Hong Kong", country: "HK", type: "sea" },
  // USA, Europe
  { code: "USLAX", name: "Port of Los Angeles", city: "Los Angeles", country: "US", type: "sea" },
  { code: "USLGB", name: "Port of Long Beach", city: "Long Beach", country: "US", type: "sea" },
  { code: "USNYC", name: "Port of New York", city: "New York", country: "US", type: "sea" },
  { code: "USSEA", name: "Port of Seattle", city: "Seattle", country: "US", type: "sea" },
  { code: "NLRTM", name: "Port of Rotterdam", city: "Rotterdam", country: "NL", type: "sea" },
  { code: "DEHAM", name: "Port of Hamburg", city: "Hamburg", country: "DE", type: "sea" },
  { code: "BEANR", name: "Port of Antwerp", city: "Antwerp", country: "BE", type: "sea" },
  { code: "GBFXT", name: "Port of Felixstowe", city: "Felixstowe", country: "GB", type: "sea" },
  // India, Middle East
  { code: "INNSA", name: "Jawaharlal Nehru Port", city: "Mumbai", country: "IN", type: "sea" },
  { code: "INMAA", name: "Port of Chennai", city: "Chennai", country: "IN", type: "sea" },
  { code: "AEJEA", name: "Jebel Ali", city: "Dubai", country: "AE", type: "sea" },
  // Australia
  { code: "AUMEL", name: "Port of Melbourne", city: "Melbourne", country: "AU", type: "sea" },
  { code: "AUSYD", name: "Port of Sydney", city: "Sydney", country: "AU", type: "sea" },
];

const countryNames: Record<string, string> = {
  VN: "Việt Nam",
  CN: "Trung Quốc",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thái Lan",
  KR: "Hàn Quốc",
  JP: "Nhật Bản",
  TW: "Đài Loan",
  HK: "Hồng Kông",
  US: "Mỹ",
  NL: "Hà Lan",
  DE: "Đức",
  BE: "Bỉ",
  GB: "Anh",
  IN: "Ấn Độ",
  AE: "UAE",
  AU: "Úc",
};

export default function PortLookupPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "sea" | "air">("all");
  const [countryFilter, setCountryFilter] = useState("");

  const filteredPorts = useMemo(() => {
    let result = portsData;

    if (typeFilter !== "all") {
      result = result.filter((p) => p.type === typeFilter);
    }

    if (countryFilter) {
      result = result.filter((p) => p.country === countryFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(s) ||
          p.name.toLowerCase().includes(s) ||
          p.city.toLowerCase().includes(s)
      );
    }

    return result;
  }, [search, typeFilter, countryFilter]);

  const countries = useMemo(() => {
    const set = new Set(portsData.map((p) => p.country));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Tra cứu mã cảng</h1>
          </div>
          <Link href="/" className="flex items-center gap-1">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
            <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã UN/LOCODE, tên cảng hoặc thành phố..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "sea" | "air")}
              className="h-10 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Tất cả</option>
              <option value="sea">Cảng biển</option>
              <option value="air">Sân bay</option>
            </select>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="h-10 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500"
            >
              <option value="">Tất cả quốc gia</option>
              {countries.map((c) => (
                <option key={c} value={c}>{countryNames[c] || c}</option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Tìm thấy {filteredPorts.length} kết quả
          </p>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-[120px]">UN/LOCODE</th>
                <th className="px-4 py-3 text-left font-semibold">Tên cảng / Sân bay</th>
                <th className="px-4 py-3 text-left font-semibold">Thành phố</th>
                <th className="px-4 py-3 text-left font-semibold">Quốc gia</th>
                <th className="px-4 py-3 text-center font-semibold w-[80px]">Loại</th>
              </tr>
            </thead>
            <tbody>
              {filteredPorts.map((port, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-red-50">
                  <td className="px-4 py-3 font-mono font-semibold text-red-600">{port.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{port.name}</td>
                  <td className="px-4 py-3 text-slate-600">{port.city}</td>
                  <td className="px-4 py-3 text-slate-600">{countryNames[port.country] || port.country}</td>
                  <td className="px-4 py-3 text-center">
                    {port.type === "sea" ? (
                      <span className="inline-flex items-center gap-1 text-cyan-600">
                        <Anchor className="w-4 h-4" /> Biển
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-purple-600">
                        <Plane className="w-4 h-4" /> Bay
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPorts.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              Không tìm thấy cảng nào
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-3">UN/LOCODE là gì?</h3>
          <p className="text-sm text-slate-600">
            UN/LOCODE (United Nations Code for Trade and Transport Locations) là mã tiêu chuẩn quốc tế
            gồm 5 ký tự dùng để định danh các địa điểm thương mại và vận tải. 2 ký tự đầu là mã quốc gia (ISO 3166-1),
            3 ký tự sau là mã địa điểm.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            VD: <strong className="text-red-600">VNSGN</strong> = VN (Việt Nam) + SGN (Sài Gòn)
          </p>
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

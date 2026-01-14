"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck, Globe, Search, Info, CheckCircle, AlertCircle } from "lucide-react";

// C/O Form data for Vietnam's FTAs
const CO_DATA = [
  {
    id: "form-d",
    name: "Form D",
    fullName: "ASEAN Trade in Goods Agreement (ATIGA)",
    countries: ["Brunei", "Cambodia", "Indonesia", "Laos", "Malaysia", "Myanmar", "Philippines", "Singapore", "Thailand"],
    rooType: "WO, PE, RVC 40%, CTH, PSR",
    validDays: 365,
    selfCert: false,
    color: "bg-blue-500",
    requirements: [
      "Sản phẩm phải có xuất xứ ASEAN",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)",
      "Hoặc tiêu chí sản phẩm cụ thể (PSR)"
    ],
    documents: [
      "C/O Form D (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Áp dụng cho hàng hóa có xuất xứ từ các nước ASEAN"
  },
  {
    id: "form-e",
    name: "Form E",
    fullName: "ASEAN-China FTA (ACFTA)",
    countries: ["China"],
    rooType: "WO, RVC 40%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-red-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Trung Quốc hoặc ASEAN",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form E (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Một số mặt hàng có quy tắc riêng theo danh mục"
  },
  {
    id: "form-ak",
    name: "Form AK",
    fullName: "ASEAN-Korea FTA (AKFTA)",
    countries: ["Korea (South)"],
    rooType: "WO, RVC 40%, CTH, PSR",
    validDays: 365,
    selfCert: false,
    color: "bg-indigo-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Hàn Quốc hoặc ASEAN",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form AK (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Áp dụng AKFTA hoặc VKFTA tùy theo thuế suất ưu đãi hơn"
  },
  {
    id: "form-vk",
    name: "Form VK",
    fullName: "Vietnam-Korea FTA (VKFTA)",
    countries: ["Korea (South)"],
    rooType: "WO, RVC 40%, CTH, PSR",
    validDays: 365,
    selfCert: false,
    color: "bg-purple-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Việt Nam hoặc Hàn Quốc",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form VK (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "VKFTA thường có thuế suất tốt hơn AKFTA"
  },
  {
    id: "form-aj",
    name: "Form AJ",
    fullName: "ASEAN-Japan CEP (AJCEP)",
    countries: ["Japan"],
    rooType: "WO, RVC 40%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-pink-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Nhật Bản hoặc ASEAN",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form AJ (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "So sánh với VJEPA để chọn FTA có lợi hơn"
  },
  {
    id: "form-vj",
    name: "Form VJ",
    fullName: "Vietnam-Japan EPA (VJEPA)",
    countries: ["Japan"],
    rooType: "WO, RVC 40%, CTH, PSR",
    validDays: 365,
    selfCert: false,
    color: "bg-rose-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Việt Nam hoặc Nhật Bản",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form VJ (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "VJEPA thường có thuế suất tốt hơn AJCEP"
  },
  {
    id: "form-aanz",
    name: "Form AANZ",
    fullName: "ASEAN-Australia-New Zealand FTA (AANZFTA)",
    countries: ["Australia", "New Zealand"],
    rooType: "WO, RVC 40%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-emerald-500",
    requirements: [
      "Sản phẩm phải có xuất xứ từ các nước thành viên",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form AANZ (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Áp dụng cho Australia và New Zealand"
  },
  {
    id: "form-ai",
    name: "Form AI",
    fullName: "ASEAN-India FTA (AIFTA)",
    countries: ["India"],
    rooType: "WO, RVC 35%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-orange-500",
    requirements: [
      "Sản phẩm phải có xuất xứ Ấn Độ hoặc ASEAN",
      "Hàm lượng giá trị khu vực (RVC) >= 35%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form AI (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "RVC yêu cầu thấp hơn các FTA khác (35%)"
  },
  {
    id: "form-eur1",
    name: "EUR.1",
    fullName: "EU-Vietnam FTA (EVFTA)",
    countries: ["EU countries (27 nước)"],
    rooType: "WO, PSR, MaxNOM",
    validDays: 730,
    selfCert: true,
    color: "bg-cyan-500",
    requirements: [
      "Sản phẩm phải có xuất xứ EU hoặc Việt Nam",
      "Tuân thủ quy tắc xuất xứ cụ thể theo sản phẩm (PSR)",
      "Nguyên liệu ngoài khối không vượt quá giới hạn (MaxNOM)"
    ],
    documents: [
      "C/O EUR.1 hoặc Tự chứng nhận xuất xứ",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list",
      "Chứng từ chứng minh xuất xứ (nếu cần)"
    ],
    notes: "Từ 2023 áp dụng tự chứng nhận xuất xứ (REX)"
  },
  {
    id: "form-ukv",
    name: "Form UKV",
    fullName: "UK-Vietnam FTA (UKVFTA)",
    countries: ["United Kingdom"],
    rooType: "WO, PSR, MaxNOM",
    validDays: 730,
    selfCert: true,
    color: "bg-slate-600",
    requirements: [
      "Sản phẩm phải có xuất xứ UK hoặc Việt Nam",
      "Tuân thủ quy tắc xuất xứ cụ thể theo sản phẩm (PSR)"
    ],
    documents: [
      "C/O Form UKV hoặc Tự chứng nhận xuất xứ",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Tương tự EVFTA, áp dụng tự chứng nhận xuất xứ"
  },
  {
    id: "form-cptpp",
    name: "Form CPTPP",
    fullName: "CPTPP",
    countries: ["Japan", "Canada", "Mexico", "Chile", "Peru", "Australia", "New Zealand", "Singapore", "Malaysia", "Brunei"],
    rooType: "WO, RVC, CTH, PSR",
    validDays: 365,
    selfCert: true,
    color: "bg-teal-500",
    requirements: [
      "Sản phẩm phải có xuất xứ từ các nước CPTPP",
      "Tự chứng nhận xuất xứ hoặc chứng nhận của nhà xuất khẩu",
      "Tuân thủ quy tắc xuất xứ cụ thể (PSR)"
    ],
    documents: [
      "Tự chứng nhận xuất xứ (trên Invoice hoặc chứng từ riêng)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Không cần C/O truyền thống, chỉ cần tự chứng nhận"
  },
  {
    id: "form-rcep",
    name: "Form RCEP",
    fullName: "Regional Comprehensive Economic Partnership",
    countries: ["China", "Japan", "Korea", "Australia", "New Zealand", "ASEAN"],
    rooType: "WO, RVC 40%, CTH, PSR",
    validDays: 365,
    selfCert: true,
    color: "bg-amber-500",
    requirements: [
      "Sản phẩm phải có xuất xứ từ các nước RCEP",
      "RVC >= 40% hoặc CTH",
      "Hỗ trợ tự chứng nhận xuất xứ"
    ],
    documents: [
      "C/O Form RCEP hoặc Tự chứng nhận xuất xứ",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Có thể cộng gộp xuất xứ từ nhiều nước RCEP"
  },
  {
    id: "form-vc",
    name: "Form VC",
    fullName: "Vietnam-Chile FTA (VCFTA)",
    countries: ["Chile"],
    rooType: "WO, RVC 40%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-red-600",
    requirements: [
      "Sản phẩm phải có xuất xứ Việt Nam hoặc Chile",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form VC (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Áp dụng cho hàng xuất khẩu từ Chile"
  },
  {
    id: "form-eaeu",
    name: "Form EAV",
    fullName: "Vietnam-EAEU FTA",
    countries: ["Russia", "Belarus", "Kazakhstan", "Armenia", "Kyrgyzstan"],
    rooType: "WO, RVC 40%, CTH",
    validDays: 365,
    selfCert: false,
    color: "bg-blue-700",
    requirements: [
      "Sản phẩm phải có xuất xứ từ các nước EAEU hoặc Việt Nam",
      "Hàm lượng giá trị khu vực (RVC) >= 40%",
      "Hoặc chuyển đổi mã HS (CTH)"
    ],
    documents: [
      "C/O Form EAV (bản chính)",
      "Invoice thương mại",
      "Vận đơn (B/L hoặc AWB)",
      "Packing list"
    ],
    notes: "Liên minh Kinh tế Á-Âu: Nga, Belarus, Kazakhstan, Armenia, Kyrgyzstan"
  },
];

export default function CORequirementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCO, setSelectedCO] = useState<typeof CO_DATA[0] | null>(null);

  const filteredData = CO_DATA.filter(
    (co) =>
      co.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      co.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      co.countries.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                <FileCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Yêu cầu C/O theo FTA</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên form, FTA hoặc quốc gia (VD: Japan, EU, Form D...)"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* C/O List */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-4">
              {filteredData.map((co) => (
                <button
                  key={co.id}
                  onClick={() => setSelectedCO(co)}
                  className={`text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${
                    selectedCO?.id === co.id
                      ? "border-red-500 ring-2 ring-red-500/20"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`px-3 py-1 ${co.color} rounded-lg`}>
                      <span className="text-white font-bold text-sm">{co.name}</span>
                    </div>
                    {co.selfCert && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Tự chứng nhận
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">{co.fullName}</h3>
                  <div className="flex flex-wrap gap-1">
                    {co.countries.slice(0, 3).map((country) => (
                      <span
                        key={country}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {country}
                      </span>
                    ))}
                    {co.countries.length > 3 && (
                      <span className="text-xs text-slate-400">+{co.countries.length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            {selectedCO ? (
              <div className="space-y-4 sticky top-4">
                {/* Header */}
                <div className={`${selectedCO.color} rounded-xl p-4 text-white`}>
                  <div className="text-3xl font-bold mb-1">{selectedCO.name}</div>
                  <div className="text-white/80 text-sm">{selectedCO.fullName}</div>
                </div>

                {/* Countries */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-slate-900">Quốc gia áp dụng</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCO.countries.map((country) => (
                      <span
                        key={country}
                        className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-lg"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ROO Type */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Tiêu chí xuất xứ</h3>
                  <p className="text-sm text-slate-600 font-mono bg-slate-50 p-2 rounded">
                    {selectedCO.rooType}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">
                    <div>WO = Wholly Obtained (hoàn toàn thu được)</div>
                    <div>RVC = Regional Value Content (hàm lượng giá trị khu vực)</div>
                    <div>CTH = Change in Tariff Heading (chuyển đổi mã HS)</div>
                    <div>PSR = Product Specific Rules (quy tắc cụ thể)</div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Yêu cầu xuất xứ</h3>
                  <ul className="space-y-2">
                    {selectedCO.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Documents */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Hồ sơ cần nộp</h3>
                  <ul className="space-y-2">
                    {selectedCO.documents.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <FileCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Validity */}
                <div className="bg-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Thời hạn hiệu lực</span>
                    <span className="font-bold text-slate-900">{selectedCO.validDays} ngày</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedCO.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                      <div>
                        <div className="font-medium text-yellow-800 mb-1">Lưu ý</div>
                        <p className="text-sm text-yellow-700">{selectedCO.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center sticky top-4">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Chọn một loại C/O để xem yêu cầu chi tiết</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

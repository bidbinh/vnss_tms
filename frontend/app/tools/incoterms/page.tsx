"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ship, Truck, Package, Check, X as XIcon } from "lucide-react";

const incoterms = [
  {
    code: "EXW",
    name: "Ex Works",
    nameVi: "Giao tại xưởng",
    group: "E",
    mode: "all",
    description: "Người bán giao hàng tại cơ sở của mình. Người mua chịu mọi chi phí và rủi ro.",
    seller: ["Đóng gói hàng hóa", "Chuẩn bị chứng từ"],
    buyer: ["Xếp hàng lên xe", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế", "Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển đến kho"],
    riskTransfer: "Tại cơ sở người bán",
  },
  {
    code: "FCA",
    name: "Free Carrier",
    nameVi: "Giao cho người chuyên chở",
    group: "F",
    mode: "all",
    description: "Người bán giao hàng cho người chuyên chở do người mua chỉ định.",
    seller: ["Đóng gói", "Vận chuyển đến điểm giao", "Thủ tục xuất khẩu", "Xếp hàng (nếu tại cơ sở người bán)"],
    buyer: ["Cước vận chuyển quốc tế", "Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển đến kho"],
    riskTransfer: "Khi giao cho người chuyên chở",
  },
  {
    code: "CPT",
    name: "Carriage Paid To",
    nameVi: "Cước phí trả tới",
    group: "C",
    mode: "all",
    description: "Người bán trả cước đến địa điểm đích, nhưng rủi ro chuyển khi giao cho người chuyên chở.",
    seller: ["Đóng gói", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế"],
    buyer: ["Bảo hiểm (nếu cần)", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển từ cảng đến kho"],
    riskTransfer: "Khi giao cho người chuyên chở đầu tiên",
  },
  {
    code: "CIP",
    name: "Carriage and Insurance Paid To",
    nameVi: "Cước phí và bảo hiểm trả tới",
    group: "C",
    mode: "all",
    description: "Như CPT, người bán thêm trách nhiệm mua bảo hiểm cho người mua.",
    seller: ["Đóng gói", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế", "Bảo hiểm (110% giá trị)"],
    buyer: ["Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển từ cảng đến kho"],
    riskTransfer: "Khi giao cho người chuyên chở đầu tiên",
  },
  {
    code: "DAP",
    name: "Delivered at Place",
    nameVi: "Giao tại địa điểm",
    group: "D",
    mode: "all",
    description: "Người bán giao hàng đến địa điểm đích, sẵn sàng dỡ hàng. Người mua làm thủ tục nhập khẩu.",
    seller: ["Đóng gói", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế", "Bảo hiểm (nếu cần)", "Vận chuyển đến địa điểm đích"],
    buyer: ["Dỡ hàng", "Thủ tục nhập khẩu", "Thuế nhập khẩu"],
    riskTransfer: "Tại địa điểm đích, trước khi dỡ hàng",
  },
  {
    code: "DPU",
    name: "Delivered at Place Unloaded",
    nameVi: "Giao tại địa điểm đã dỡ hàng",
    group: "D",
    mode: "all",
    description: "Người bán giao hàng đã dỡ tại địa điểm đích. Người mua làm thủ tục nhập khẩu.",
    seller: ["Đóng gói", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế", "Bảo hiểm (nếu cần)", "Vận chuyển đến địa điểm đích", "Dỡ hàng"],
    buyer: ["Thủ tục nhập khẩu", "Thuế nhập khẩu"],
    riskTransfer: "Tại địa điểm đích, sau khi dỡ hàng",
  },
  {
    code: "DDP",
    name: "Delivered Duty Paid",
    nameVi: "Giao hàng đã nộp thuế",
    group: "D",
    mode: "all",
    description: "Người bán chịu mọi chi phí và rủi ro đến địa điểm đích, bao gồm cả thuế nhập khẩu.",
    seller: ["Đóng gói", "Vận chuyển nội địa", "Thủ tục xuất khẩu", "Cước vận chuyển quốc tế", "Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển đến kho người mua"],
    buyer: ["Dỡ hàng (nếu thỏa thuận)"],
    riskTransfer: "Tại địa điểm đích",
  },
  {
    code: "FAS",
    name: "Free Alongside Ship",
    nameVi: "Giao dọc mạn tàu",
    group: "F",
    mode: "sea",
    description: "Người bán giao hàng dọc mạn tàu tại cảng xếp hàng.",
    seller: ["Đóng gói", "Vận chuyển đến cảng", "Thủ tục xuất khẩu", "Đặt hàng dọc mạn tàu"],
    buyer: ["Xếp hàng lên tàu", "Cước biển", "Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển đến kho"],
    riskTransfer: "Khi hàng đặt dọc mạn tàu",
  },
  {
    code: "FOB",
    name: "Free On Board",
    nameVi: "Giao lên tàu",
    group: "F",
    mode: "sea",
    description: "Người bán giao hàng qua lan can tàu tại cảng xếp hàng.",
    seller: ["Đóng gói", "Vận chuyển đến cảng", "Thủ tục xuất khẩu", "Xếp hàng lên tàu"],
    buyer: ["Cước biển", "Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển đến kho"],
    riskTransfer: "Khi hàng qua lan can tàu",
  },
  {
    code: "CFR",
    name: "Cost and Freight",
    nameVi: "Tiền hàng và cước phí",
    group: "C",
    mode: "sea",
    description: "Người bán trả cước biển đến cảng đích, nhưng rủi ro chuyển khi hàng lên tàu.",
    seller: ["Đóng gói", "Vận chuyển đến cảng", "Thủ tục xuất khẩu", "Xếp hàng lên tàu", "Cước biển"],
    buyer: ["Bảo hiểm", "Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển từ cảng đến kho"],
    riskTransfer: "Khi hàng qua lan can tàu tại cảng xếp",
  },
  {
    code: "CIF",
    name: "Cost, Insurance and Freight",
    nameVi: "Tiền hàng, bảo hiểm và cước phí",
    group: "C",
    mode: "sea",
    description: "Như CFR, người bán thêm trách nhiệm mua bảo hiểm.",
    seller: ["Đóng gói", "Vận chuyển đến cảng", "Thủ tục xuất khẩu", "Xếp hàng lên tàu", "Cước biển", "Bảo hiểm (110% giá trị)"],
    buyer: ["Thủ tục nhập khẩu", "Thuế nhập khẩu", "Vận chuyển từ cảng đến kho"],
    riskTransfer: "Khi hàng qua lan can tàu tại cảng xếp",
  },
];

const groupColors: Record<string, string> = {
  E: "bg-slate-600",
  F: "bg-red-500",
  C: "bg-orange-500",
  D: "bg-green-600",
};

export default function IncotermsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<"all" | "sea">("all");

  const selectedTerm = incoterms.find((t) => t.code === selected);
  const filteredTerms = modeFilter === "all" ? incoterms : incoterms.filter((t) => t.mode === "sea");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Incoterms 2020</h1>
          </div>
          <Link href="/" className="flex items-center gap-1">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
            <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setModeFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              modeFilter === "all" ? "bg-red-500 text-white" : "bg-white border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Mọi phương thức
          </button>
          <button
            onClick={() => setModeFilter("sea")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              modeFilter === "sea" ? "bg-red-500 text-white" : "bg-white border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Ship className="w-4 h-4 inline mr-2" />
            Chỉ đường biển
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 space-y-2">
            {filteredTerms.map((term) => (
              <button
                key={term.code}
                onClick={() => setSelected(term.code)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selected === term.code
                    ? "bg-red-50 border-red-500 ring-2 ring-red-200"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${groupColors[term.group]} text-white text-xs font-bold px-2 py-1 rounded`}>
                    {term.code}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{term.name}</p>
                    <p className="text-sm text-slate-500">{term.nameVi}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedTerm ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`${groupColors[selectedTerm.group]} text-white text-lg font-bold px-3 py-1 rounded`}>
                    {selectedTerm.code}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedTerm.name}</h2>
                    <p className="text-slate-500">{selectedTerm.nameVi}</p>
                  </div>
                  {selectedTerm.mode === "sea" && (
                    <span className="ml-auto text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full">
                      <Ship className="w-3 h-3 inline mr-1" /> Chỉ đường biển
                    </span>
                  )}
                </div>

                <p className="text-slate-600 mb-6">{selectedTerm.description}</p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-amber-800">
                    📍 Điểm chuyển rủi ro: <strong>{selectedTerm.riskTransfer}</strong>
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Seller */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">S</span>
                      Người bán chịu
                    </h3>
                    <ul className="space-y-2">
                      {selectedTerm.seller.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Buyer */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs">B</span>
                      Người mua chịu
                    </h3>
                    <ul className="space-y-2">
                      {selectedTerm.buyer.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                <Truck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Chọn một điều kiện Incoterms để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Phân loại Incoterms 2020</h3>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-slate-600 text-white rounded flex items-center justify-center font-bold">E</span>
              <span className="text-slate-700">Giao hàng tại xưởng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold">F</span>
              <span className="text-slate-700">Cước chưa trả</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-500 text-white rounded flex items-center justify-center font-bold">C</span>
              <span className="text-slate-700">Cước đã trả</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-green-600 text-white rounded flex items-center justify-center font-bold">D</span>
              <span className="text-slate-700">Giao tại đích</span>
            </div>
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

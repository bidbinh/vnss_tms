"use client";

import Link from "next/link";
import {
  FileSpreadsheet,
  Calculator,
  Anchor,
  FileText,
  Scale,
  Receipt,
  Ship,
  ArrowRight,
  ArrowLeft,
  Brain,
  Container,
  FileCheck,
  Clock,
  Box,
  Globe,
} from "lucide-react";

const tools = [
  {
    id: "tariff-lookup",
    name: "Tra cứu Biểu thuế XNK",
    description: "Biểu thuế xuất nhập khẩu 2026, tra cứu theo mã HS hoặc mô tả hàng hóa",
    icon: FileSpreadsheet,
    href: "/tools/tariff-lookup",
    status: "live",
  },
  {
    id: "hs-lookup",
    name: "Tra mã HS thông minh",
    description: "Tìm mã HS theo mô tả hàng hóa, gợi ý thông minh theo từ khóa",
    icon: Brain,
    href: "/tools/hs-lookup",
    status: "live",
  },
  {
    id: "import-tax",
    name: "Tính thuế nhập khẩu",
    description: "Tính thuế NK, VAT, thuế TTĐB theo mã HS và trị giá",
    icon: Receipt,
    href: "/tools/import-tax",
    status: "live",
  },
  {
    id: "cbm-calculator",
    name: "Tính CBM & trọng lượng",
    description: "Tính thể tích, trọng lượng quy đổi và gợi ý container",
    icon: Box,
    href: "/tools/cbm-calculator",
    status: "live",
  },
  {
    id: "local-charges",
    name: "Tính phí Local Charges",
    description: "Ước tính phí THC, D/O, handling cho FCL/LCL và Air",
    icon: Calculator,
    href: "/tools/local-charges",
    status: "live",
  },
  {
    id: "demdet-calculator",
    name: "Tính phí DEM/DET",
    description: "Tính phí lưu container tại cảng và ngoài cảng",
    icon: Clock,
    href: "/tools/demdet-calculator",
    status: "live",
  },
  {
    id: "container-specs",
    name: "Thông số Container",
    description: "Kích thước, tải trọng các loại container 20/40/HC/RF",
    icon: Container,
    href: "/tools/container-specs",
    status: "live",
  },
  {
    id: "inspection-lookup",
    name: "Kiểm tra chuyên ngành",
    description: "Tra cứu yêu cầu KTCN theo chương hàng và cơ quan",
    icon: FileCheck,
    href: "/tools/inspection-lookup",
    status: "live",
  },
  {
    id: "co-requirements",
    name: "Yêu cầu C/O theo FTA",
    description: "Tra cứu form C/O và điều kiện hưởng ưu đãi FTA",
    icon: Globe,
    href: "/tools/co-requirements",
    status: "live",
  },
  {
    id: "weight-converter",
    name: "Chuyển đổi đơn vị",
    description: "Chuyển đổi kg/lb, CBM/CFT, cm/inch và tính TL quy đổi",
    icon: Scale,
    href: "/tools/weight-converter",
    status: "live",
  },
  {
    id: "freight-calculator",
    name: "Tính cước vận tải",
    description: "Tính cước FCL, LCL, Air freight và vận tải nội địa",
    icon: Calculator,
    href: "/tools/freight-calculator",
    status: "live",
  },
  {
    id: "port-lookup",
    name: "Tra cứu mã cảng",
    description: "Tra cứu UN/LOCODE, mã cảng biển và sân bay quốc tế",
    icon: Anchor,
    href: "/tools/port-lookup",
    status: "live",
  },
  {
    id: "incoterms",
    name: "Tra cứu Incoterms 2020",
    description: "Điều kiện giao hàng quốc tế, trách nhiệm người mua/bán",
    icon: FileText,
    href: "/tools/incoterms",
    status: "live",
  },
  {
    id: "vessel-schedule",
    name: "Lịch tàu",
    description: "Tra cứu lịch tàu container các hãng tàu lớn",
    icon: Ship,
    href: "/tools/vessel-schedule",
    status: "coming",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-1">
              <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-lg">9</span>
              <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
            </Link>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-900 pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-red-400 text-sm font-medium mb-3">MIỄN PHÍ 100%</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Công cụ hỗ trợ Logistics
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Bộ công cụ miễn phí dành cho doanh nghiệp xuất nhập khẩu, forwarder và đại lý hải quan
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.status === "live" ? tool.href : "#"}
              className={`block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group ${
                tool.status === "coming" ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
                    <tool.icon className="w-5 h-5 text-white" />
                  </div>
                  {tool.status === "coming" && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                      Sắp ra mắt
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-red-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-slate-500">{tool.description}</p>
                {tool.status === "live" && (
                  <div className="mt-3 flex items-center text-sm text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Mở công cụ
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Cần nhiều tính năng hơn?
          </h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Đăng ký 9log để sử dụng đầy đủ hệ thống quản lý vận tải, kho bãi và xuất nhập khẩu
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Dùng thử miễn phí
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 9log.tech - Công cụ miễn phí cho ngành Logistics Việt Nam
        </div>
      </footer>
    </div>
  );
}

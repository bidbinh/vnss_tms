"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Plus,
  ChevronLeft,
  FileText,
  Calculator,
  Calendar,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TaxSummary {
  year: number;
  vat: {
    input_vat: number;
    output_vat: number;
    net_vat: number;
  };
  withholding_tax: number;
  cit: {
    cit_amount: number;
    status: string;
  } | null;
}

const TAX_MENU = [
  {
    title: "Thuế GTGT (VAT)",
    description: "Quản lý thuế giá trị gia tăng đầu vào/đầu ra",
    href: "/accounting/tax/vat",
    icon: Receipt,
    color: "bg-blue-500",
  },
  {
    title: "Tờ khai VAT",
    description: "Kê khai và nộp thuế GTGT hàng tháng/quý",
    href: "/accounting/tax/vat-declarations",
    icon: FileText,
    color: "bg-purple-500",
  },
  {
    title: "Thuế TNCN (PIT)",
    description: "Quản lý thuế thu nhập cá nhân",
    href: "/accounting/tax/pit",
    icon: Users,
    color: "bg-green-500",
  },
  {
    title: "Thuế TNDN (CIT)",
    description: "Thuế thu nhập doanh nghiệp",
    href: "/accounting/tax/cit",
    icon: Building2,
    color: "bg-orange-500",
  },
  {
    title: "Thuế khấu trừ",
    description: "Thuế nhà thầu và các khoản khấu trừ",
    href: "/accounting/tax/withholding",
    icon: Calculator,
    color: "bg-red-500",
  },
  {
    title: "Mức thuế suất",
    description: "Cấu hình các mức thuế suất",
    href: "/accounting/tax/rates",
    icon: TrendingUp,
    color: "bg-cyan-500",
  },
];

export default function TaxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchSummary();
  }, [router, selectedYear]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TaxSummary>(
        `/accounting/tax-summary?year=${selectedYear}`
      );
      setSummary(res);
    } catch (error) {
      console.error("Failed to fetch tax summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Thuế</h1>
            <p className="text-gray-600 mt-1">VAT, TNCN, TNDN và các loại thuế khác</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">VAT đầu vào</p>
              <p className="text-lg font-semibold text-green-600">
                {loading ? "..." : formatCurrency(summary?.vat.input_vat || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">VAT đầu ra</p>
              <p className="text-lg font-semibold text-blue-600">
                {loading ? "..." : formatCurrency(summary?.vat.output_vat || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                (summary?.vat.net_vat || 0) >= 0 ? "bg-red-100" : "bg-green-100"
              }`}
            >
              <Calculator
                className={`w-5 h-5 ${
                  (summary?.vat.net_vat || 0) >= 0 ? "text-red-600" : "text-green-600"
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                VAT {(summary?.vat.net_vat || 0) >= 0 ? "phải nộp" : "được hoàn"}
              </p>
              <p
                className={`text-lg font-semibold ${
                  (summary?.vat.net_vat || 0) >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {loading
                  ? "..."
                  : formatCurrency(Math.abs(summary?.vat.net_vat || 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Thuế khấu trừ</p>
              <p className="text-lg font-semibold text-orange-600">
                {loading ? "..." : formatCurrency(summary?.withholding_tax || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TAX_MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${item.color} text-white`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Declarations */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Tờ khai gần đây</h3>
          <Link
            href="/accounting/tax/vat-declarations"
            className="text-sm text-blue-600 hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Tờ khai VAT tháng 12/{selectedYear}
                  </p>
                  <p className="text-xs text-gray-500">Hạn nộp: 20/01/{selectedYear + 1}</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                Chưa nộp
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Tờ khai VAT tháng 11/{selectedYear}
                  </p>
                  <p className="text-xs text-gray-500">Đã nộp: 15/12/{selectedYear}</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Đã nộp
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Tờ khai VAT tháng 10/{selectedYear}
                  </p>
                  <p className="text-xs text-gray-500">Đã nộp: 18/11/{selectedYear}</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Đã nộp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Hạn nộp sắp tới</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Tờ khai VAT tháng 12
                  </p>
                  <p className="text-xs text-red-600">Còn 5 ngày</p>
                </div>
              </div>
              <span className="text-sm font-medium text-red-600">
                20/01/{selectedYear + 1}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Quyết toán thuế TNCN năm {selectedYear}
                  </p>
                  <p className="text-xs text-yellow-600">Còn 60 ngày</p>
                </div>
              </div>
              <span className="text-sm font-medium text-yellow-600">
                31/03/{selectedYear + 1}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Quyết toán thuế TNDN năm {selectedYear}
                  </p>
                  <p className="text-xs text-orange-600">Còn 90 ngày</p>
                </div>
              </div>
              <span className="text-sm font-medium text-orange-600">
                30/04/{selectedYear + 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

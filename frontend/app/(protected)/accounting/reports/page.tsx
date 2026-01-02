"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Scale,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  PieChart,
  Calendar,
} from "lucide-react";

const REPORTS = [
  {
    title: "Bảng cân đối phát sinh",
    description: "Trial Balance - Tổng hợp số dư các tài khoản theo kỳ",
    href: "/accounting/reports/trial-balance",
    icon: Scale,
    color: "bg-blue-500",
  },
  {
    title: "Báo cáo Lãi lỗ",
    description: "Profit & Loss / Income Statement - Báo cáo kết quả kinh doanh",
    href: "/accounting/reports/pnl",
    icon: BarChart3,
    color: "bg-green-500",
  },
  {
    title: "Bảng cân đối kế toán",
    description: "Balance Sheet - Tình hình tài chính tại thời điểm",
    href: "/accounting/reports/balance-sheet",
    icon: Scale,
    color: "bg-purple-500",
  },
  {
    title: "Báo cáo Lưu chuyển tiền tệ",
    description: "Cash Flow Statement - Dòng tiền vào/ra theo hoạt động",
    href: "/accounting/reports/cash-flow",
    icon: TrendingUp,
    color: "bg-cyan-500",
  },
  {
    title: "Sổ cái tổng hợp",
    description: "General Ledger - Chi tiết giao dịch theo tài khoản",
    href: "/accounting/reports/general-ledger",
    icon: BookOpen,
    color: "bg-orange-500",
  },
  {
    title: "Sổ nhật ký chung",
    description: "General Journal - Tất cả bút toán theo thứ tự thời gian",
    href: "/accounting/reports/journal",
    icon: FileSpreadsheet,
    color: "bg-indigo-500",
  },
  {
    title: "Báo cáo tuổi nợ AR",
    description: "AR Aging Report - Phân tích công nợ phải thu theo thời gian",
    href: "/accounting/reports/ar-aging",
    icon: Calendar,
    color: "bg-red-500",
  },
  {
    title: "Báo cáo tuổi nợ AP",
    description: "AP Aging Report - Phân tích công nợ phải trả theo thời gian",
    href: "/accounting/reports/ap-aging",
    icon: Calendar,
    color: "bg-yellow-500",
  },
  {
    title: "Báo cáo doanh thu",
    description: "Revenue Report - Phân tích doanh thu theo nhiều chiều",
    href: "/accounting/reports/revenue",
    icon: DollarSign,
    color: "bg-emerald-500",
  },
  {
    title: "Báo cáo chi phí",
    description: "Expense Report - Phân tích chi phí theo danh mục",
    href: "/accounting/reports/expenses",
    icon: PieChart,
    color: "bg-pink-500",
  },
];

export default function AccountingReportsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/accounting" className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo Kế toán</h1>
          <p className="text-gray-600 mt-1">Các báo cáo tài chính và quản trị</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${report.color} text-white`}>
                <report.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {report.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{report.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Period Selection */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Kỳ báo cáo nhanh</h3>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
            Tháng này
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Tháng trước
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Quý này
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Quý trước
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Năm nay
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Năm trước
          </button>
        </div>
      </div>

      {/* Report Schedule */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Lịch báo cáo định kỳ</h3>
          <button className="text-sm text-blue-600 hover:underline">
            Cài đặt lịch
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Bảng cân đối phát sinh</p>
                  <p className="text-xs text-gray-500">Hàng tháng - Ngày 5</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Đang hoạt động
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Báo cáo Lãi lỗ</p>
                  <p className="text-xs text-gray-500">Hàng quý - Ngày 10</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Đang hoạt động
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Báo cáo tuổi nợ AR</p>
                  <p className="text-xs text-gray-500">Hàng tuần - Thứ 2</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                Tạm dừng
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

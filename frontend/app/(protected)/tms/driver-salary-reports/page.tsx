"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Users,
  Truck,
  DollarSign,
  Calculator,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Banknote,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================================
// TYPES
// ============================================================================

interface TripDetail {
  order_id: string;
  order_code: string;
  delivered_date: string;
  pickup_site_code?: string;
  delivery_site_code?: string;
  distance_km?: number;
  is_holiday: boolean;
  trip_number_in_day: number;
  distance_salary: number;
  port_gate_fee: number;
  flatbed_tarp_fee: number;
  warehouse_bonus: number;
  daily_trip_bonus: number;
  holiday_multiplier: number;
  total: number;
}

interface SalaryDeductions {
  gross_income: number;
  social_insurance: number;
  health_insurance: number;
  unemployment_insurance: number;
  total_insurance: number;
  personal_deduction: number;
  dependent_deduction: number;
  total_deduction: number;
  taxable_income: number;
  income_tax: number;
  advance_payment: number;
  total_deductions: number;
  net_salary: number;
}

interface DriverReport {
  driver_id: string;
  driver_name: string;
  base_salary: number;
  trips: TripDetail[];
  trip_count: number;
  total_trip_salary: number;
  monthly_bonus: number;
  seniority_bonus: number;
  gross_salary: number;
  deductions: SalaryDeductions;
  total_salary: number;
}

interface Driver {
  id: string;
  name: string;
}

interface ReportData {
  drivers: DriverReport[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DriverSalaryReportsPage() {
  // Default to previous month
  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed, so this gives previous month
  });
  const [selectedDriver, setSelectedDriver] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  // Fetch drivers
  const fetchDrivers = useCallback(async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  }, []);

  // Fetch report
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });
      if (selectedDriver) {
        params.append("driver_id", selectedDriver);
      }
      const data = await apiFetch<ReportData>(`/driver-salary-reports/monthly?${params}`);
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch salary report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, selectedDriver]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const formatCurrency = (amount: number) => amount.toLocaleString("vi-VN");
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  // Toggle expanded row
  const toggleExpand = (driverId: string) => {
    setExpandedDriver(expandedDriver === driverId ? null : driverId);
  };

  // Calculate totals
  const totals = reportData?.drivers.reduce(
    (acc, d) => ({
      totalDrivers: acc.totalDrivers + 1,
      totalTrips: acc.totalTrips + d.trip_count,
      totalSalary: acc.totalSalary + d.total_salary,
    }),
    { totalDrivers: 0, totalTrips: 0, totalSalary: 0 }
  ) || { totalDrivers: 0, totalTrips: 0, totalSalary: 0 };

  // PDF Export functions
  function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
  }

  function convertNumberToVietnameseWords(num: number): string {
    if (num === 0) return "Khong";
    const ones = ["", "mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin"];
    const teens = ["muoi", "muoi mot", "muoi hai", "muoi ba", "muoi bon", "muoi lam", "muoi sau", "muoi bay", "muoi tam", "muoi chin"];
    const tens = ["", "", "hai muoi", "ba muoi", "bon muoi", "nam muoi", "sau muoi", "bay muoi", "tam muoi", "chin muoi"];
    const scales = ["", "nghin", "trieu", "ty"];

    function convertGroup(n: number): string {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? " " + ones[one] : "");
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      let result = ones[hundred] + " tram";
      if (remainder > 0) {
        if (remainder < 10) {
          result += " le " + ones[remainder];
        } else {
          result += " " + convertGroup(remainder);
        }
      }
      return result;
    }

    const groups = [];
    let tempNum = num;
    while (tempNum > 0) {
      groups.push(tempNum % 1000);
      tempNum = Math.floor(tempNum / 1000);
    }

    let result = "";
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] > 0) {
        result += convertGroup(groups[i]) + " " + scales[i] + " ";
      }
    }

    return result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
  }

  function exportToPDF(driver: DriverReport) {
    // Helper to convert Vietnamese text for PDF
    const vn = (str: string) => removeVietnameseTones(str);

    // Portrait A4 for better readability
    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // ============ PAGE 1: Trip Details Table ============
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`BANG KE CHUYEN - THANG ${month}/${year}`, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tai xe: ${vn(driver.driver_name)}`, margin, 30);
    doc.text(`So chuyen: ${driver.trip_count}`, margin, 36);

    const tripSummary = driver.trips.reduce((sum, t) => ({
      distance_salary: sum.distance_salary + t.distance_salary,
      port_gate_fee: sum.port_gate_fee + t.port_gate_fee,
      flatbed_tarp_fee: sum.flatbed_tarp_fee + t.flatbed_tarp_fee,
      warehouse_bonus: sum.warehouse_bonus + t.warehouse_bonus,
      daily_trip_bonus: sum.daily_trip_bonus + t.daily_trip_bonus,
      total: sum.total + t.total
    }), { distance_salary: 0, port_gate_fee: 0, flatbed_tarp_fee: 0, warehouse_bonus: 0, daily_trip_bonus: 0, total: 0 });

    const tripData = driver.trips.map((trip, idx) => [
      idx + 1,
      formatDate(trip.delivered_date),
      trip.order_code,
      vn(trip.pickup_site_code || "-"),
      vn(trip.delivery_site_code || "-"),
      trip.distance_km || "-",
      formatCurrency(trip.distance_salary),
      trip.port_gate_fee > 0 ? formatCurrency(trip.port_gate_fee) : "-",
      trip.daily_trip_bonus > 0 ? formatCurrency(trip.daily_trip_bonus) : "-",
      formatCurrency(trip.total)
    ]);

    autoTable(doc, {
      startY: 42,
      head: [["STT", "Ngay", "Ma DH", "Diem lay", "Diem giao", "Km", "Luong KM", "Ve cong", "Thuong", "Tong"]],
      body: tripData,
      foot: [[
        { content: `TONG (${driver.trip_count} chuyen)`, colSpan: 6, styles: { halign: "right" as const, fontStyle: "bold" as const } },
        formatCurrency(tripSummary.distance_salary),
        formatCurrency(tripSummary.port_gate_fee),
        formatCurrency(tripSummary.daily_trip_bonus),
        formatCurrency(tripSummary.total)
      ]],
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, halign: "center" as const, valign: "middle" as const, textColor: [0, 0, 0], overflow: "linebreak" },
      headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" as const },
      footStyles: { fillColor: [255, 250, 205], textColor: [0, 0, 0], fontSize: 7, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 14 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 10, halign: "right" as const },
        6: { cellWidth: 20, halign: "right" as const },
        7: { cellWidth: 16, halign: "right" as const },
        8: { cellWidth: 16, halign: "right" as const },
        9: { cellWidth: 20, halign: "right" as const }
      },
      tableWidth: "auto",
      margin: { left: margin, right: margin },
      showFoot: "lastPage",
      didDrawPage: (data: any) => {
        // Page number
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Trang ${data.pageNumber}`, pageWidth - 20, pageHeight - 10);
      }
    });

    // ============ PAGE 2: Salary Summary (Always new page) ============
    doc.addPage();

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`PHIEU LUONG THANG ${month}/${year}`, pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Tai xe: ${vn(driver.driver_name)}`, margin, 38);
    doc.text(`So chuyen trong thang: ${driver.trip_count}`, margin, 45);

    let currentY = 58;
    const colLeft = margin;
    const colRight = pageWidth / 2 + 5;
    const valueOffset = 75;

    // Left column - Income
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("THU NHAP", colLeft, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Luong co ban:", colLeft, currentY);
    doc.text(`${formatCurrency(driver.base_salary)} VND`, colLeft + valueOffset, currentY);
    currentY += 7;

    doc.text("Luong chuyen:", colLeft, currentY);
    doc.text(`${formatCurrency(driver.total_trip_salary)} VND`, colLeft + valueOffset, currentY);
    currentY += 7;

    if (driver.seniority_bonus > 0) {
      doc.text("Thuong tham nien:", colLeft, currentY);
      doc.text(`${formatCurrency(driver.seniority_bonus)} VND`, colLeft + valueOffset, currentY);
      currentY += 7;
    }

    if (driver.monthly_bonus > 0) {
      doc.text(`Thuong san luong (${driver.trip_count} chuyen):`, colLeft, currentY);
      doc.text(`${formatCurrency(driver.monthly_bonus)} VND`, colLeft + valueOffset, currentY);
      currentY += 7;
    }

    // Right column - Deductions
    let rightY = 58;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("KHOAN TRU", colRight, rightY);
    rightY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (driver.deductions) {
      doc.text("BHXH, BHYT, BHTN:", colRight, rightY);
      doc.text(`${formatCurrency(driver.deductions.total_insurance)} VND`, colRight + valueOffset - 10, rightY);
      rightY += 6;

      doc.setFontSize(9);
      doc.text(`  - BHXH (8%):`, colRight, rightY);
      doc.text(`${formatCurrency(driver.deductions.social_insurance)}`, colRight + valueOffset - 10, rightY);
      rightY += 5;

      doc.text(`  - BHYT (1.5%):`, colRight, rightY);
      doc.text(`${formatCurrency(driver.deductions.health_insurance)}`, colRight + valueOffset - 10, rightY);
      rightY += 5;

      doc.text(`  - BHTN (1%):`, colRight, rightY);
      doc.text(`${formatCurrency(driver.deductions.unemployment_insurance)}`, colRight + valueOffset - 10, rightY);
      rightY += 7;

      doc.setFontSize(10);
      doc.text("Thue TNCN:", colRight, rightY);
      doc.text(driver.deductions.income_tax > 0 ? `${formatCurrency(driver.deductions.income_tax)} VND` : "0 VND", colRight + valueOffset - 10, rightY);
      rightY += 7;

      doc.text("Tam ung:", colRight, rightY);
      doc.text(driver.deductions.advance_payment > 0 ? `${formatCurrency(driver.deductions.advance_payment)} VND` : "0 VND", colRight + valueOffset - 10, rightY);
    }

    // Summary section
    const summaryY = Math.max(currentY, rightY) + 15;

    // Draw line
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, summaryY - 5, pageWidth - margin, summaryY - 5);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TONG THU NHAP:", colLeft, summaryY);
    doc.text(`${formatCurrency(driver.deductions?.gross_income || driver.gross_salary)} VND`, colLeft + valueOffset, summaryY);

    doc.text("TONG KHOAN TRU:", colLeft, summaryY + 8);
    doc.text(`(${formatCurrency(driver.deductions?.total_deductions || 0)}) VND`, colLeft + valueOffset, summaryY + 8);

    // Net salary highlight
    doc.setFillColor(200, 255, 200);
    doc.rect(margin - 2, summaryY + 14, pageWidth - 2 * margin + 4, 12, "F");
    doc.setDrawColor(0, 150, 0);
    doc.rect(margin - 2, summaryY + 14, pageWidth - 2 * margin + 4, 12, "S");

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("THUC LANH:", colLeft, summaryY + 22);
    doc.text(`${formatCurrency(driver.total_salary)} VND`, colLeft + valueOffset, summaryY + 22);

    // Amount in words
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(`(Bang chu: ${convertNumberToVietnameseWords(driver.total_salary)} dong)`, margin, summaryY + 35);

    // Signature section
    const sigY = summaryY + 55;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Nguoi lap phieu", margin + 20, sigY, { align: "center" });
    doc.text("Tai xe", pageWidth - margin - 30, sigY, { align: "center" });

    doc.setFontSize(8);
    doc.text("(Ky, ghi ro ho ten)", margin + 20, sigY + 5, { align: "center" });
    doc.text("(Ky, ghi ro ho ten)", pageWidth - margin - 30, sigY + 5, { align: "center" });

    // Page number for page 2
    doc.setFontSize(8);
    doc.text(`Trang ${doc.getNumberOfPages()}`, pageWidth - 25, pageHeight - 10);

    doc.save(`Phieu_Luong_${vn(driver.driver_name).replace(/\s+/g, "_")}_T${month}_${year}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-7 h-7 text-green-600" />
            Báo cáo lương tài xế
          </h1>
          <p className="text-gray-600 mt-1">
            Thống kê lương và chi tiết chuyến của tài xế theo tháng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport()}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div className="h-6 border-l border-gray-300" />

          {/* Driver */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tài xế</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 min-w-[180px]"
            >
              <option value="">Tất cả tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isLoading ? "Đang tải..." : "Xem báo cáo"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && reportData.drivers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng số tài xế</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalDrivers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng số chuyến</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalTrips}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng lương phải trả</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.totalSalary)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
            Đang tải dữ liệu...
          </div>
        ) : !reportData ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Chọn tháng và nhấn "Xem báo cáo" để xem dữ liệu</p>
          </div>
        ) : reportData.drivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có dữ liệu lương cho tháng {month}/{year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tài xế
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Số chuyến
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Lương cơ bản
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Lương chuyến
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Thưởng
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Tổng lương
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.drivers.map((driver) => {
                  const isExpanded = expandedDriver === driver.driver_id;

                  return (
                    <Fragment key={driver.driver_id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(driver.driver_id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{driver.driver_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                            {driver.trip_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {formatCurrency(driver.base_salary)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {formatCurrency(driver.total_trip_salary)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {formatCurrency(driver.monthly_bonus + driver.seniority_bonus)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-green-600">
                            {formatCurrency(driver.total_salary)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToPDF(driver);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Xuất PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            {/* Trip Details */}
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Chi tiết chuyến đi ({driver.trip_count} chuyến)
                              </h4>
                              <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                      <th className="px-2 py-2 text-center">STT</th>
                                      <th className="px-2 py-2 text-left">Ngày</th>
                                      <th className="px-2 py-2 text-left">Mã ĐH</th>
                                      <th className="px-2 py-2 text-left">Pickup</th>
                                      <th className="px-2 py-2 text-left">Delivery</th>
                                      <th className="px-2 py-2 text-center">Km</th>
                                      <th className="px-2 py-2 text-right">Lương KM</th>
                                      <th className="px-2 py-2 text-right">Phụ phí</th>
                                      <th className="px-2 py-2 text-center">Ngày lễ</th>
                                      <th className="px-2 py-2 text-right">Tổng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {driver.trips.map((trip, idx) => (
                                      <tr key={trip.order_id} className="hover:bg-gray-50">
                                        <td className="px-2 py-1.5 text-center">{idx + 1}</td>
                                        <td className="px-2 py-1.5">{formatDate(trip.delivered_date)}</td>
                                        <td className="px-2 py-1.5">{trip.order_code}</td>
                                        <td className="px-2 py-1.5">{trip.pickup_site_code || "-"}</td>
                                        <td className="px-2 py-1.5">{trip.delivery_site_code || "-"}</td>
                                        <td className="px-2 py-1.5 text-center">{trip.distance_km || "-"}</td>
                                        <td className="px-2 py-1.5 text-right">{formatCurrency(trip.distance_salary)}</td>
                                        <td className="px-2 py-1.5 text-right">
                                          {formatCurrency(trip.port_gate_fee + trip.flatbed_tarp_fee + trip.warehouse_bonus + trip.daily_trip_bonus)}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                          {trip.is_holiday ? (
                                            <span className="text-red-600 font-bold">{trip.holiday_multiplier}x</span>
                                          ) : "-"}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-semibold text-green-700">
                                          {formatCurrency(trip.total)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Salary Breakdown */}
                            <div className="grid grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
                              {/* Income */}
                              <div className="space-y-2 text-sm">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  Thu nhập
                                </h4>
                                <div className="flex justify-between">
                                  <span>Lương cơ bản:</span>
                                  <span className="font-medium">{formatCurrency(driver.base_salary)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Lương chuyến:</span>
                                  <span className="font-medium">{formatCurrency(driver.total_trip_salary)}</span>
                                </div>
                                {driver.seniority_bonus > 0 && (
                                  <div className="flex justify-between">
                                    <span>Thưởng thâm niên:</span>
                                    <span className="font-medium">{formatCurrency(driver.seniority_bonus)}</span>
                                  </div>
                                )}
                                {driver.monthly_bonus > 0 && (
                                  <div className="flex justify-between">
                                    <span>Thưởng sản lượng:</span>
                                    <span className="font-medium">{formatCurrency(driver.monthly_bonus)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between pt-2 border-t font-semibold">
                                  <span>Tổng thu nhập:</span>
                                  <span className="text-green-600">{formatCurrency(driver.gross_salary)}</span>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div className="space-y-2 text-sm">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <Calculator className="w-4 h-4 text-red-600" />
                                  Khấu trừ
                                </h4>
                                {driver.deductions && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>BHXH, BHYT, BHTN:</span>
                                      <span className="font-medium text-red-600">{formatCurrency(driver.deductions.total_insurance)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Thuế TNCN:</span>
                                      <span className={driver.deductions.income_tax > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                                        {driver.deductions.income_tax > 0 ? formatCurrency(driver.deductions.income_tax) : "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tạm ứng:</span>
                                      <span className={driver.deductions.advance_payment > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                                        {driver.deductions.advance_payment > 0 ? formatCurrency(driver.deductions.advance_payment) : "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t font-semibold">
                                      <span>Tổng khấu trừ:</span>
                                      <span className="text-red-600">({formatCurrency(driver.deductions.total_deductions)})</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Net Salary */}
                            <div className="mt-4 p-3 bg-green-100 rounded-lg flex justify-between items-center">
                              <span className="font-bold text-lg">THỰC LÃNH:</span>
                              <span className="font-bold text-2xl text-green-700">{formatCurrency(driver.total_salary)} VNĐ</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
  total_salary: number;  // This is now net_salary
}

export default function DriverSalaryReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });

      if (selectedDriver) {
        params.append("driver_id", selectedDriver);
      }

      const res = await fetch(`${API_BASE_URL}/driver-salary-reports/monthly?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to fetch report");
      }

      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("vi-VN");
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

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

  function exportToPDF(driver: DriverReport) {
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Title
    doc.setFontSize(16);
    doc.text(`PHIEU LUONG THANG ${month}/${year}`, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

    // Driver Info
    doc.setFontSize(11);
    doc.text(`Tai xe: ${removeVietnameseTones(driver.driver_name)}`, 15, 25);
    doc.text(`So chuyen: ${driver.trip_count}`, 15, 32);

    // Trip Details Table - Summary row
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
      trip.pickup_site_code || "-",
      trip.delivery_site_code || "-",
      trip.distance_km || "-",
      trip.trip_number_in_day,
      formatCurrency(trip.distance_salary),
      trip.port_gate_fee > 0 ? formatCurrency(trip.port_gate_fee) : "-",
      trip.flatbed_tarp_fee > 0 ? formatCurrency(trip.flatbed_tarp_fee) : "-",
      trip.warehouse_bonus > 0 ? formatCurrency(trip.warehouse_bonus) : "-",
      trip.daily_trip_bonus > 0 ? formatCurrency(trip.daily_trip_bonus) : "-",
      trip.is_holiday ? `${trip.holiday_multiplier}x` : "-",
      formatCurrency(trip.total)
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['STT', 'Ngay', 'Ma DH', 'Pickup', 'Delivery', 'Km', 'Chuyen\nT.Ngay', 'Luong KM', 'Ve cong', 'Bai bat', 'Hang Xa', 'Thuong\nchuyen', 'Ngay le', 'Tong']],
      body: tripData,
      foot: [[
        { content: `TONG CONG (${driver.trip_count} chuyen)`, colSpan: 7, styles: { halign: 'right' } },
        formatCurrency(tripSummary.distance_salary),
        formatCurrency(tripSummary.port_gate_fee),
        formatCurrency(tripSummary.flatbed_tarp_fee),
        formatCurrency(tripSummary.warehouse_bonus),
        formatCurrency(tripSummary.daily_trip_bonus),
        '',
        formatCurrency(tripSummary.total)
      ]],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: 255,
        fontSize: 6,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [255, 250, 205],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 14 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 10 },
        6: { cellWidth: 12 },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 16, halign: 'right' },
        9: { cellWidth: 16, halign: 'right' },
        10: { cellWidth: 16, halign: 'right' },
        11: { cellWidth: 18, halign: 'right' },
        12: { cellWidth: 12 },
        13: { cellWidth: 20, halign: 'right' }
      }
    });

    // Get Y position after table
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Phieu Luong Section - Two columns layout
    doc.setFontSize(12);
    doc.text(`Phieu Luong Thang ${month}/${year}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });

    const leftX = 15;
    const rightX = doc.internal.pageSize.getWidth() / 2 + 10;
    let leftY = finalY + 8;
    let rightY = finalY + 8;

    // LEFT COLUMN - Income
    doc.setFontSize(10);
    doc.text("LUONG THEO CHUC DANH CONG VIEC:", leftX, leftY);
    doc.setFontSize(9);
    doc.text(`${formatCurrency(driver.base_salary)} VND`, leftX + 80, leftY);
    leftY += 6;

    doc.setFontSize(10);
    doc.text("CAC KHOAN BO SUNG KHAC:", leftX, leftY);
    leftY += 5;
    doc.setFontSize(9);

    doc.text("Luong chuyen:", leftX + 5, leftY);
    doc.text(`${formatCurrency(driver.total_trip_salary)} VND`, leftX + 80, leftY);
    leftY += 5;

    if (driver.seniority_bonus > 0) {
      doc.text("Thuong tham nien:", leftX + 5, leftY);
      doc.text(`${formatCurrency(driver.seniority_bonus)} VND`, leftX + 80, leftY);
      leftY += 5;
    }

    if (driver.monthly_bonus > 0) {
      doc.text(`Thuong san luong chuyen (${driver.trip_count} chuyen):`, leftX + 5, leftY);
      doc.text(`${formatCurrency(driver.monthly_bonus)} VND`, leftX + 80, leftY);
      leftY += 5;
    }

    // RIGHT COLUMN - Deductions
    doc.setFontSize(10);
    doc.text("CAC KHOAN TRU KHAC:", rightX, rightY);
    rightY += 5;
    doc.setFontSize(9);

    if (driver.deductions) {
      doc.text("BHXH, BHYT, BHTN:", rightX + 5, rightY);
      doc.text(`${formatCurrency(driver.deductions.total_insurance)} VND`, rightX + 70, rightY);
      rightY += 5;

      doc.setFontSize(8);
      doc.text(`- BHXH (8%):`, rightX + 10, rightY);
      doc.text(formatCurrency(driver.deductions.social_insurance), rightX + 70, rightY);
      rightY += 4;

      doc.text(`- BHYT (1.5%):`, rightX + 10, rightY);
      doc.text(formatCurrency(driver.deductions.health_insurance), rightX + 70, rightY);
      rightY += 4;

      doc.text(`- BHTN (1%):`, rightX + 10, rightY);
      doc.text(formatCurrency(driver.deductions.unemployment_insurance), rightX + 70, rightY);
      rightY += 5;

      doc.setFontSize(9);
      doc.text("Thue TNCN:", rightX + 5, rightY);
      doc.text(driver.deductions.income_tax > 0 ? `${formatCurrency(driver.deductions.income_tax)} VND` : '-', rightX + 70, rightY);
      rightY += 5;

      doc.text("Tam ung:", rightX + 5, rightY);
      doc.text(driver.deductions.advance_payment > 0 ? `${formatCurrency(driver.deductions.advance_payment)} VND` : '-', rightX + 70, rightY);
    }

    // Summary Section
    const summaryY = Math.max(leftY, rightY) + 8;
    doc.setFontSize(10);
    doc.text("TONG CONG:", leftX, summaryY);
    doc.text(`${formatCurrency(driver.deductions?.gross_income || driver.gross_salary)} VND`, leftX + 80, summaryY);

    doc.text("TRU:", leftX, summaryY + 6);
    doc.text(`(${formatCurrency(driver.deductions?.total_deductions || 0)}) VND`, leftX + 80, summaryY + 6);

    // Net Salary
    doc.setFontSize(12);
    doc.setFillColor(220, 255, 220);
    doc.rect(leftX - 2, summaryY + 10, 120, 8, 'F');
    doc.text("TONG THU NHAP:", leftX, summaryY + 16);
    doc.text(`${formatCurrency(driver.total_salary)} VND`, leftX + 80, summaryY + 16);

    // Amount in words
    doc.setFontSize(8);
    doc.text(`So tien bang chu: ${convertNumberToVietnameseWords(driver.total_salary)} dong`, leftX, summaryY + 24);

    // Save PDF
    doc.save(`Phieu_Luong_${removeVietnameseTones(driver.driver_name)}_${month}_${year}.pdf`);
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-6">Báo cáo lương tài xế</h1>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 border rounded">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Năm</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tài xế</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Tất cả tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Đang tải..." : "Xem báo cáo"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {reportData && reportData.drivers && reportData.drivers.length > 0 && (
        <div className="space-y-6">
          {reportData.drivers.map((driver: DriverReport) => (
            <div key={driver.driver_id} className="border rounded-lg overflow-hidden">
              {/* Driver Summary Header */}
              <div
                className="bg-blue-50 p-4"
              >
                <div className="flex justify-between items-center">
                  <div
                    className="flex-1 cursor-pointer hover:opacity-80"
                    onClick={() => setExpandedDriver(expandedDriver === driver.driver_id ? null : driver.driver_id)}
                  >
                    <h2 className="text-lg font-bold text-blue-900">
                      {driver.driver_name}
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({driver.trip_count} chuyến)
                      </span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToPDF(driver);
                      }}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Xuất PDF
                    </button>
                    <div
                      className="text-right cursor-pointer hover:opacity-80"
                      onClick={() => setExpandedDriver(expandedDriver === driver.driver_id ? null : driver.driver_id)}
                    >
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(driver.total_salary)} VNĐ
                      </div>
                      <div className="text-xs text-gray-600">
                        {expandedDriver === driver.driver_id ? "▼ Ẩn chi tiết" : "▶ Xem chi tiết"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Row */}
                <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-600">Lương cơ bản:</span>
                    <span className="font-semibold ml-2">{formatCurrency(driver.base_salary)} VNĐ</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Lương chuyến:</span>
                    <span className="font-semibold ml-2">{formatCurrency(driver.total_trip_salary)} VNĐ</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Thưởng tháng:</span>
                    <span className="font-semibold ml-2">{formatCurrency(driver.monthly_bonus)} VNĐ</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Số chuyến:</span>
                    <span className="font-semibold ml-2">{driver.trip_count}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Trip Details */}
              {expandedDriver === driver.driver_id && (
                <div className="p-4 bg-white">
                  <h3 className="font-semibold mb-3">Chi tiết chuyến đi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-2 py-2 border text-center font-bold">STT</th>
                          <th className="px-2 py-2 border text-left font-bold">Ngày</th>
                          <th className="px-2 py-2 border text-left font-bold">Mã ĐH</th>
                          <th className="px-2 py-2 border text-left font-bold">Pickup</th>
                          <th className="px-2 py-2 border text-left font-bold">Delivery</th>
                          <th className="px-2 py-2 border text-center font-bold">Km</th>
                          <th className="px-2 py-2 border text-center font-bold">Chuyến T.Ngày</th>
                          <th className="px-2 py-2 border text-right font-bold">Lương KM</th>
                          <th className="px-2 py-2 border text-right font-bold">Vé cổng</th>
                          <th className="px-2 py-2 border text-right font-bold">Bái bạt</th>
                          <th className="px-2 py-2 border text-right font-bold">Hàng Xá</th>
                          <th className="px-2 py-2 border text-right font-bold">Thưởng chuyến</th>
                          <th className="px-2 py-2 border text-center font-bold">Ngày lễ</th>
                          <th className="px-2 py-2 border text-right font-bold">Tổng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driver.trips.map((trip: TripDetail, idx: number) => (
                          <tr key={trip.order_id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 border text-center">{idx + 1}</td>
                            <td className="px-2 py-1.5 border">{formatDate(trip.delivered_date)}</td>
                            <td className="px-2 py-1.5 border">{trip.order_code}</td>
                            <td className="px-2 py-1.5 border text-xs">{trip.pickup_site_code || "-"}</td>
                            <td className="px-2 py-1.5 border text-xs">{trip.delivery_site_code || "-"}</td>
                            <td className="px-2 py-1.5 border text-center">{trip.distance_km || "-"}</td>
                            <td className="px-2 py-1.5 border text-center">
                              <span className={trip.trip_number_in_day > 1 ? "font-bold text-blue-600" : ""}>
                                {trip.trip_number_in_day}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border text-right">{formatCurrency(trip.distance_salary)}</td>
                            <td className="px-2 py-1.5 border text-right">
                              {trip.port_gate_fee > 0 ? formatCurrency(trip.port_gate_fee) : "-"}
                            </td>
                            <td className="px-2 py-1.5 border text-right">
                              {trip.flatbed_tarp_fee > 0 ? formatCurrency(trip.flatbed_tarp_fee) : "-"}
                            </td>
                            <td className="px-2 py-1.5 border text-right">
                              {trip.warehouse_bonus > 0 ? formatCurrency(trip.warehouse_bonus) : "-"}
                            </td>
                            <td className="px-2 py-1.5 border text-right">
                              {trip.daily_trip_bonus > 0 ? formatCurrency(trip.daily_trip_bonus) : "-"}
                            </td>
                            <td className="px-2 py-1.5 border text-center">
                              {trip.is_holiday ? (
                                <span className="text-red-600 font-bold">{trip.holiday_multiplier}x</span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-2 py-1.5 border text-right font-semibold text-green-700">
                              {formatCurrency(trip.total)}
                            </td>
                          </tr>
                        ))}
                        {/* Summary Row */}
                        <tr className="bg-yellow-50 font-bold">
                          <td colSpan={7} className="px-2 py-2 border text-right">
                            TỔNG CỘNG ({driver.trip_count} chuyến):
                          </td>
                          <td className="px-2 py-2 border text-right">
                            {formatCurrency(
                              driver.trips.reduce((sum, t) => sum + t.distance_salary, 0)
                            )}
                          </td>
                          <td className="px-2 py-2 border text-right">
                            {formatCurrency(
                              driver.trips.reduce((sum, t) => sum + t.port_gate_fee, 0)
                            )}
                          </td>
                          <td className="px-2 py-2 border text-right">
                            {formatCurrency(
                              driver.trips.reduce((sum, t) => sum + t.flatbed_tarp_fee, 0)
                            )}
                          </td>
                          <td className="px-2 py-2 border text-right">
                            {formatCurrency(
                              driver.trips.reduce((sum, t) => sum + t.warehouse_bonus, 0)
                            )}
                          </td>
                          <td className="px-2 py-2 border text-right">
                            {formatCurrency(
                              driver.trips.reduce((sum, t) => sum + t.daily_trip_bonus, 0)
                            )}
                          </td>
                          <td className="px-2 py-2 border"></td>
                          <td className="px-2 py-2 border text-right text-green-700">
                            {formatCurrency(driver.total_trip_salary)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Salary Breakdown */}
                  <div className="mt-4 p-4 bg-blue-50 rounded">
                    <h4 className="font-semibold mb-3 text-center text-lg">Phiếu Lương Tháng {month}/{year}</h4>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      {/* Left Column - Income */}
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                          <span className="font-medium">Lương theo chức danh công việc:</span>
                          <span className="font-semibold">{formatCurrency(driver.base_salary)} VNĐ</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="font-semibold mb-2">Các khoản bổ sung khác:</div>
                          <div className="ml-4 space-y-1.5">
                            <div className="flex justify-between">
                              <span>Lương chuyến:</span>
                              <span className="font-medium">{formatCurrency(driver.total_trip_salary)} VNĐ</span>
                            </div>
                            {driver.seniority_bonus > 0 && (
                              <div className="flex justify-between">
                                <span>Thưởng thâm niên:</span>
                                <span className="font-medium">{formatCurrency(driver.seniority_bonus)} VNĐ</span>
                              </div>
                            )}
                            {driver.monthly_bonus > 0 && (
                              <div className="flex justify-between">
                                <span>Thưởng sản lượng chuyến ({driver.trip_count} chuyến):</span>
                                <span className="font-medium">{formatCurrency(driver.monthly_bonus)} VNĐ</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Deductions */}
                      <div className="space-y-2">
                        <div className="font-semibold mb-2">Các khoản trừ khác:</div>
                        {driver.deductions && (
                          <div className="ml-4 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span>BHXH, BHYT, BHTN:</span>
                              <span className="text-red-600 font-medium">{formatCurrency(driver.deductions.total_insurance)} VNĐ</span>
                            </div>
                            <div className="ml-3 space-y-0.5 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>- BHXH (8%):</span>
                                <span>{formatCurrency(driver.deductions.social_insurance)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>- BHYT (1.5%):</span>
                                <span>{formatCurrency(driver.deductions.health_insurance)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>- BHTN (1%):</span>
                                <span>{formatCurrency(driver.deductions.unemployment_insurance)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Thuế TNCN:</span>
                              <span className={driver.deductions.income_tax > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                                {driver.deductions.income_tax > 0 ? `${formatCurrency(driver.deductions.income_tax)} VNĐ` : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Tạm ứng:</span>
                              <span className={driver.deductions.advance_payment > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                                {driver.deductions.advance_payment > 0 ? `${formatCurrency(driver.deductions.advance_payment)} VNĐ` : "-"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Summary */}
                    <div className="mt-4 pt-3 border-t-2 border-blue-300 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">TỔNG CỘNG:</span>
                        <span className="font-semibold">{formatCurrency(driver.deductions?.gross_income || driver.gross_salary)} VNĐ</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">TRỪ:</span>
                        <span className="font-semibold text-red-600">({formatCurrency(driver.deductions?.total_deductions || 0)}) VNĐ</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-green-700 bg-green-50 p-2 rounded">
                        <span>TỔNG THU NHẬP:</span>
                        <span>{formatCurrency(driver.total_salary)} VNĐ</span>
                      </div>
                      <div className="text-xs text-gray-600 italic text-center">
                        Số tiền bằng chữ: {convertNumberToVietnameseWords(driver.total_salary)} đồng
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Grand Total Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-xl font-bold mb-4 text-center">
              BẢNG CHI TIẾT SẢN LƯỢNG THÁNG {month.toString().padStart(2, '0')} NĂM {year}
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-sm text-gray-600 mb-1">Tổng số tài xế</div>
                <div className="text-3xl font-bold text-blue-700">{reportData.drivers.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Tổng số chuyến</div>
                <div className="text-3xl font-bold text-purple-700">
                  {reportData.drivers.reduce((sum: number, d: DriverReport) => sum + d.trip_count, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Tổng lương phải trả</div>
                <div className="text-3xl font-bold text-green-700">
                  {formatCurrency(
                    reportData.drivers.reduce((sum: number, d: DriverReport) => sum + d.total_salary, 0)
                  )} VNĐ
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportData && reportData.drivers && reportData.drivers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không có dữ liệu lương cho tháng {month}/{year}
        </div>
      )}
    </div>
  );
}

// Helper function to convert number to Vietnamese words (without tones for PDF)
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

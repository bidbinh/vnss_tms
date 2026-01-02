"use client";

import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface AdvancePayment {
  id: string;
  driver_id: string;
  driver_name?: string;
  amount: number;
  payment_date: string;
  note?: string;
  is_deducted: boolean;
  deducted_month?: number;
  deducted_year?: number;
  created_at: string;
}

interface Driver {
  id: string;
  name: string;
}

export default function AdvancePaymentsPage() {
  const [payments, setPayments] = useState<AdvancePayment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterDriver, setFilterDriver] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterDeducted, setFilterDeducted] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    driver_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    note: "",
  });

  useEffect(() => {
    fetchDrivers();
    fetchPayments();
  }, [filterDriver, filterYear, filterMonth, filterDeducted]);

  async function fetchDrivers() {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setDrivers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPayments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDriver) params.append("driver_id", filterDriver);
      if (filterYear) params.append("year", filterYear.toString());
      if (filterMonth) params.append("month", filterMonth.toString());
      if (filterDeducted !== "all") {
        params.append("is_deducted", filterDeducted);
      }

      const res = await fetch(`${API_BASE_URL}/advance-payments?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      alert("Lỗi: " + err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const url = editingId
        ? `${API_BASE_URL}/advance-payments/${editingId}`
        : `${API_BASE_URL}/advance-payments`;

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseInt(formData.amount),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      alert(editingId ? "Cập nhật thành công!" : "Tạo tạm ứng thành công!");
      setShowModal(false);
      resetForm();
      fetchPayments();
    } catch (err) {
      alert("Lỗi: " + err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa tạm ứng này?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/advance-payments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to delete");
      }

      alert("Xóa thành công!");
      fetchPayments();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  function openModal(payment?: AdvancePayment) {
    if (payment) {
      setEditingId(payment.id);
      setFormData({
        driver_id: payment.driver_id,
        amount: payment.amount.toString(),
        payment_date: payment.payment_date.split("T")[0],
        note: payment.note || "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      driver_id: "",
      amount: "",
      payment_date: new Date().toISOString().split("T")[0],
      note: "",
    });
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("vi-VN");
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDeducted = payments.filter(p => p.is_deducted).reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => !p.is_deducted).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý Tạm Ứng</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Thêm Tạm Ứng
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tài xế</label>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Tất cả</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Năm</label>
            <input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tháng</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Tất cả</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select
              value={filterDeducted}
              onChange={(e) => setFilterDeducted(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">Tất cả</option>
              <option value="false">Chưa trừ</option>
              <option value="true">Đã trừ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Tổng tạm ứng</div>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalAdvance)} đ</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã trừ lương</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalDeducted)} đ</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Chưa trừ</div>
              <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalPending)} đ</div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Đang tải...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Tài xế</th>
                <th className="px-4 py-3 text-right font-bold">Số tiền</th>
                <th className="px-4 py-3 text-left font-bold">Ngày tạm ứng</th>
                <th className="px-4 py-3 text-left font-bold">Ghi chú</th>
                <th className="px-4 py-3 text-center font-bold">Trạng thái</th>
                <th className="px-4 py-3 text-center font-bold">Đã trừ</th>
                <th className="px-4 py-3 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{payment.driver_name || "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {formatCurrency(payment.amount)} đ
                  </td>
                  <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{payment.note || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {payment.is_deducted ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        Đã trừ
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                        Chưa trừ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {payment.is_deducted && payment.deducted_month && payment.deducted_year
                      ? `${payment.deducted_month}/${payment.deducted_year}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {!payment.is_deducted && (
                        <>
                          <button
                            onClick={() => openModal(payment)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-500">Không có dữ liệu tạm ứng</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Cập nhật Tạm Ứng" : "Thêm Tạm Ứng Mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tài xế <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.driver_id}
                  onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">-- Chọn tài xế --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ngày tạm ứng <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

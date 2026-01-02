"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Contract {
  id: string;
  code: string;
  name: string;
  account_id: string;
  opportunity_id: string | null;
  contract_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_value: number;
  payment_terms: string | null;
  created_at: string | null;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface ContractsResponse {
  items: Contract[];
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  ACTIVE: "Hiệu lực",
  EXPIRED: "Hết hạn",
  TERMINATED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  TERMINATED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ContractsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    account_id: "",
    contract_type: "SERVICE",
    start_date: "",
    end_date: "",
    total_value: 0,
    payment_terms: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchContracts();
    fetchAccounts();
  }, [router, search, filterStatus]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page_size: "100" });
      if (search) params.append("search", search);
      if (filterStatus) params.append("status", filterStatus);

      const res = await apiFetch<ContractsResponse>(`/crm/contracts?${params}`);
      setContracts(res.items || []);
      setTotal(res.total || 0);

      // Fetch account info
      const accountIds = [...new Set(res.items?.filter((c) => c.account_id).map((c) => c.account_id) || [])];
      const accountMap: Record<string, Account> = {};
      for (const id of accountIds.slice(0, 30)) {
        try {
          const acc = await apiFetch<Account>(`/crm/accounts/${id}`);
          accountMap[id] = acc;
        } catch {
          // Ignore
        }
      }
      setAccounts(accountMap);
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch<{ items: Account[] }>("/crm/accounts?page_size=100");
      setAccountsList(res.items || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/crm/contracts", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          status: "DRAFT",
        }),
      });
      setShowModal(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      console.error("Failed to create contract:", error);
      alert("Lỗi khi tạo hợp đồng");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      account_id: "",
      contract_type: "SERVICE",
      start_date: "",
      end_date: "",
      total_value: 0,
      payment_terms: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
  const pendingContracts = contracts.filter((c) => c.status === "PENDING_APPROVAL" || c.status === "DRAFT");
  const totalValue = activeContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);

  if (loading && contracts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Hợp đồng</h1>
          <p className="text-gray-600 mt-1">Theo dõi hợp đồng với khách hàng</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo hợp đồng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng hợp đồng</div>
              <div className="text-xl font-bold">{total}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang hiệu lực</div>
              <div className="text-xl font-bold">{activeContracts.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chờ xử lý</div>
              <div className="text-xl font-bold">{pendingContracts.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng giá trị</div>
              <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm hợp đồng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="PENDING_APPROVAL">Chờ duyệt</option>
          <option value="ACTIVE">Hiệu lực</option>
          <option value="EXPIRED">Hết hạn</option>
          <option value="TERMINATED">Đã kết thúc</option>
        </select>
      </div>

      {/* Contract List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã HĐ</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tên hợp đồng</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Khách hàng</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Thời hạn</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Giá trị</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-blue-600">{contract.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{contract.name}</div>
                    <div className="text-xs text-gray-500">{contract.contract_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    {contract.account_id && accounts[contract.account_id] ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Building2 className="w-3 h-3" />
                        {accounts[contract.account_id].name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      {contract.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {contract.start_date}
                        </div>
                      )}
                      {contract.end_date && (
                        <div className="text-xs text-gray-500">
                          - {contract.end_date}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(contract.total_value || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[contract.status] || "bg-gray-100"}`}>
                      {STATUS_LABELS[contract.status] || contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 text-gray-500 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Chưa có hợp đồng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Tạo hợp đồng mới</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã hợp đồng *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại hợp đồng
                    </label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SERVICE">Dịch vụ</option>
                      <option value="PRODUCT">Sản phẩm</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên hợp đồng *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách hàng *
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Chọn khách hàng</option>
                    {accountsList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị hợp đồng
                  </label>
                  <input
                    type="number"
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điều khoản thanh toán
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 30 ngày"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tạo hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

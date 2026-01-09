"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Copy,
  Check,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  TestTube,
  Sparkles,
} from "lucide-react";

// Types
interface ParsingInstruction {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  shipper_pattern?: string;
  shipper_keywords?: string[];
  instructions: string;
  field_mappings?: Record<string, string>;
  data_source_priority?: Record<string, string>;
  value_transforms?: Record<string, Record<string, string>>;
  examples?: Array<{ input: string; output: string }>;
  is_active: boolean;
  priority: number;
  times_applied: number;
  last_applied_at?: string;
  created_at: string;
  updated_at?: string;
}

const DEFAULT_FORM: Partial<ParsingInstruction> = {
  name: "",
  description: "",
  shipper_pattern: "",
  shipper_keywords: [],
  instructions: "",
  field_mappings: {},
  data_source_priority: {},
  value_transforms: {},
  examples: [],
  is_active: true,
  priority: 0,
};

export default function ParsingInstructionsPage() {
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState<ParsingInstruction[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ParsingInstruction | null>(null);
  const [formData, setFormData] = useState<Partial<ParsingInstruction>>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<"basic" | "mappings" | "examples">("basic");

  // Test modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testShipperName, setTestShipperName] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);

  // Preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setInstructions(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ ...DEFAULT_FORM });
    setActiveTab("basic");
    setShowModal(true);
  };

  const handleEdit = (item: ParsingInstruction) => {
    setEditItem(item);
    setFormData({
      ...item,
      shipper_keywords: item.shipper_keywords || [],
      field_mappings: item.field_mappings || {},
      data_source_priority: item.data_source_priority || {},
      value_transforms: item.value_transforms || {},
      examples: item.examples || [],
    });
    setActiveTab("basic");
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa hướng dẫn này?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchData();
        alert("Đã xóa thành công!");
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Lỗi kết nối server");
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const url = editItem
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions/${editItem.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions`;

      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Loi khi luu");
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleTest = async () => {
    if (!testShipperName.trim()) {
      alert("Nhap ten shipper de test");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions/for-shipper?shipper_name=${encodeURIComponent(testShipperName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (error) {
      console.error("Error testing:", error);
    }
  };

  const handlePreview = async (item: ParsingInstruction) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/parsing-instructions/${item.id}/test`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shipper_name: "TEST SHIPPER" }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setPreviewContent(data.generated_prompt || item.instructions);
        setShowPreviewModal(true);
      }
    } catch (error) {
      // Fallback: just show instructions
      setPreviewContent(item.instructions);
      setShowPreviewModal(true);
    }
  };

  const handleDuplicate = (item: ParsingInstruction) => {
    setEditItem(null);
    setFormData({
      ...item,
      id: undefined,
      name: `${item.name} (Copy)`,
      shipper_keywords: item.shipper_keywords || [],
      field_mappings: item.field_mappings || {},
      data_source_priority: item.data_source_priority || {},
      value_transforms: item.value_transforms || {},
      examples: item.examples || [],
    });
    setActiveTab("basic");
    setShowModal(true);
  };

  // JSON editor helpers
  const updateFieldMapping = (key: string, value: string) => {
    setFormData({
      ...formData,
      field_mappings: { ...formData.field_mappings, [key]: value },
    });
  };

  const removeFieldMapping = (key: string) => {
    const newMappings = { ...formData.field_mappings };
    delete newMappings[key];
    setFormData({ ...formData, field_mappings: newMappings });
  };

  const updateDataSourcePriority = (key: string, value: string) => {
    setFormData({
      ...formData,
      data_source_priority: { ...formData.data_source_priority, [key]: value },
    });
  };

  const removeDataSourcePriority = (key: string) => {
    const newPriority = { ...formData.data_source_priority };
    delete newPriority[key];
    setFormData({ ...formData, data_source_priority: newPriority });
  };

  const addExample = () => {
    setFormData({
      ...formData,
      examples: [...(formData.examples || []), { input: "", output: "" }],
    });
  };

  const updateExample = (index: number, field: "input" | "output", value: string) => {
    const newExamples = [...(formData.examples || [])];
    newExamples[index] = { ...newExamples[index], [field]: value };
    setFormData({ ...formData, examples: newExamples });
  };

  const removeExample = (index: number) => {
    const newExamples = [...(formData.examples || [])];
    newExamples.splice(index, 1);
    setFormData({ ...formData, examples: newExamples });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            Huong dan Parse AI
          </h1>
          <p className="text-gray-600">
            Quan ly cac huong dan rieng theo khach hang/shipper de AI parse chinh xac hon
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <TestTube className="w-5 h-5" />
            Test Matching
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Them huong dan
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tim theo ten, shipper pattern..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Tim kiem
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Dang tai...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ten
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Shipper Pattern
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Keywords
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Uu tien
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ap dung
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trang thai
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thao tac
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instructions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {item.shipper_pattern || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {item.shipper_keywords && item.shipper_keywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.shipper_keywords.slice(0, 3).map((kw, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                            {item.shipper_keywords.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{item.shipper_keywords.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{item.priority}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <span>{item.times_applied}x</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.is_active ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePreview(item)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title="Xem prompt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Sua"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="Nhan ban"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Xoa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Hien thi {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} /{" "}
                  {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {total === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chua co huong dan nao</p>
                <p className="text-sm">Bam "Them huong dan" de tao huong dan parse moi</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editItem ? "Chinh sua huong dan" : "Them huong dan moi"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("basic")}
                className={`px-4 py-3 border-b-2 ${
                  activeTab === "basic"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600"
                }`}
              >
                Thong tin co ban
              </button>
              <button
                onClick={() => setActiveTab("mappings")}
                className={`px-4 py-3 border-b-2 ${
                  activeTab === "mappings"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600"
                }`}
              >
                Field Mappings
              </button>
              <button
                onClick={() => setActiveTab("examples")}
                className={`px-4 py-3 border-b-2 ${
                  activeTab === "examples"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600"
                }`}
              >
                Vi du
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ten huong dan *</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="VD: Huong dan parse Chunqiu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mo ta</label>
                    <input
                      type="text"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Mo ta ngan gon"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Shipper Pattern
                        <span className="text-gray-400 text-xs ml-1">(glob pattern)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.shipper_pattern || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, shipper_pattern: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                        placeholder="VD: CHUNQIU*, *HONGBO*"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        * = bat ky ky tu nao. VD: ABC* khop ABCxyz, *XYZ khop 123XYZ
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Do uu tien</label>
                      <input
                        type="number"
                        value={formData.priority || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min={0}
                        max={100}
                      />
                      <p className="text-xs text-gray-500 mt-1">So lon hon = uu tien cao hon</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Keywords
                      <span className="text-gray-400 text-xs ml-1">(cach nhau boi dau phay)</span>
                    </label>
                    <input
                      type="text"
                      value={(formData.shipper_keywords || []).join(", ")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shipper_keywords: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="VD: CHUNQIU, HONGBO, GUANGZHOU"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Huong dan chi tiet *
                      <span className="text-gray-400 text-xs ml-1">(Tieng Viet)</span>
                    </label>
                    <textarea
                      value={formData.instructions || ""}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                      rows={10}
                      placeholder={`Vi du:
Voi cac chung tu cua khach hang nay:
- Truong "Consignee" tren Invoice la NGUOI NHAP KHAU (importer), khong phai exporter
- Truong "Ship by" la NGUOI XUAT KHAU (exporter)
- Neu trong Packing List co "Model No", dung gia tri do lam ma san pham
- Don vi tinh mac dinh la "PCE" neu khong ghi ro
- Gia tri "FOB Shanghai" co nghia la dieu kien giao hang FOB, cang di la Shanghai`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Viet bang tieng Viet, mo ta cach doc/hieu chung tu cua khach hang nay
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active ?? true}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_active" className="text-sm">
                      Kich hoat (ap dung khi parse)
                    </label>
                  </div>
                </div>
              )}

              {/* Mappings Tab */}
              {activeTab === "mappings" && (
                <div className="space-y-6">
                  {/* Field Mappings */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        Field Mappings
                        <span className="text-gray-400 text-xs ml-1">
                          (Ten truong tren chung tu -{">"} ten truong output)
                        </span>
                      </label>
                      <button
                        onClick={() => updateFieldMapping("", "")}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        + Them
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(formData.field_mappings || {}).map(([key, value], idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newMappings = { ...formData.field_mappings };
                              delete newMappings[key];
                              newMappings[e.target.value] = value;
                              setFormData({ ...formData, field_mappings: newMappings });
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            placeholder="Truong tren chung tu"
                          />
                          <span className="text-gray-400">-{">"}</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateFieldMapping(key, e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            placeholder="Truong output"
                          />
                          <button
                            onClick={() => removeFieldMapping(key)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {Object.keys(formData.field_mappings || {}).length === 0 && (
                        <p className="text-sm text-gray-500 py-2">
                          Chua co mapping. VD: "Consignee" -{">"} "importer_name"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Data Source Priority */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        Data Source Priority
                        <span className="text-gray-400 text-xs ml-1">
                          (Ten truong -{">"} uu tien lay tu chung tu nao)
                        </span>
                      </label>
                      <button
                        onClick={() => updateDataSourcePriority("", "")}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        + Them
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(formData.data_source_priority || {}).map(
                        ([key, value], idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => {
                                const newPriority = { ...formData.data_source_priority };
                                delete newPriority[key];
                                newPriority[e.target.value] = value;
                                setFormData({ ...formData, data_source_priority: newPriority });
                              }}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                              placeholder="Ten truong"
                            />
                            <span className="text-gray-400">uu tien:</span>
                            <select
                              value={value}
                              onChange={(e) => updateDataSourcePriority(key, e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="">Chon...</option>
                              <option value="INVOICE">Invoice</option>
                              <option value="PACKING_LIST">Packing List</option>
                              <option value="BILL_OF_LADING">Bill of Lading</option>
                              <option value="CONTRACT">Contract</option>
                            </select>
                            <button
                              onClick={() => removeDataSourcePriority(key)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      )}
                      {Object.keys(formData.data_source_priority || {}).length === 0 && (
                        <p className="text-sm text-gray-500 py-2">
                          Chua co. VD: "quantity" uu tien lay tu "PACKING_LIST"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Examples Tab */}
              {activeTab === "examples" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      Vi du Input/Output
                      <span className="text-gray-400 text-xs ml-1">
                        (Giup AI hieu cach parse)
                      </span>
                    </label>
                    <button
                      onClick={addExample}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      + Them vi du
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(formData.examples || []).map((ex, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-600">Vi du {idx + 1}</span>
                          <button
                            onClick={() => removeExample(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Input (noi dung tren chung tu)
                            </label>
                            <textarea
                              value={ex.input}
                              onChange={(e) => updateExample(idx, "input", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              rows={2}
                              placeholder='VD: "Consignee: ABC Company Ltd"'
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Output (ket qua mong muon)
                            </label>
                            <textarea
                              value={ex.output}
                              onChange={(e) => updateExample(idx, "output", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              rows={2}
                              placeholder='VD: importer_name = "ABC Company Ltd"'
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(formData.examples || []).length === 0 && (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        Chua co vi du. Them vi du de AI hieu ro hon cach parse chung tu
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Huy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Luu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Matching
              </h2>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestResults([]);
                  setTestShipperName("");
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ten Shipper</label>
                <input
                  type="text"
                  value={testShipperName}
                  onChange={(e) => setTestShipperName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VD: HONGKONG CHUNQIU INTERNATIONAL CO.,LIMITED"
                />
              </div>
              <button
                onClick={handleTest}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Kiem tra
              </button>

              {testResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Check className="w-4 h-4 text-green-600" />
                    Tim thay {testResults.length} huong dan phu hop:
                  </h3>
                  <div className="space-y-2">
                    {testResults.map((r, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-sm text-gray-600">
                          Pattern: {r.shipper_pattern || "(none)"} | Priority: {r.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testResults.length === 0 && testShipperName && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                  Khong tim thay huong dan nao phu hop voi shipper nay
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview Prompt
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                {previewContent}
              </pre>
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Dong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

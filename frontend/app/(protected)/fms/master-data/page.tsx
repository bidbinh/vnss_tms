"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Globe,
  Anchor,
  Building2,
  FileSpreadsheet,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Download,
} from "lucide-react";

// Types
interface Country {
  id: string;
  code: string;
  code_alpha3?: string;
  name_en: string;
  name_vi?: string;
  region?: string;
  currency_code?: string;
  is_fta_partner: boolean;
  is_active: boolean;
  created_at: string;
}

interface Port {
  id: string;
  code: string;
  country_code: string;
  name_en: string;
  name_vi?: string;
  port_type: string;
  city?: string;
  province?: string;
  is_customs_clearance: boolean;
  is_active: boolean;
  created_at: string;
}

interface CustomsOffice {
  id: string;
  code: string;
  parent_code?: string;
  name: string;
  name_short?: string;
  level: number;
  province?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

interface HSCodeCatalog {
  id: string;
  hs_code: string;
  description_vi: string;
  description_en?: string;
  unit_code?: string;
  import_duty_rate: number;
  vat_rate: number;
  requires_license: boolean;
  requires_inspection: boolean;
  is_active: boolean;
  created_at: string;
}

interface Currency {
  id: string;
  code: string;
  name_en: string;
  name_vi?: string;
  symbol?: string;
  exchange_rate?: number;
  is_active: boolean;
  created_at: string;
}

type TabType = "countries" | "ports" | "customs-offices" | "hs-codes" | "currencies";

const TABS = [
  { id: "countries" as TabType, label: "Quoc gia", icon: Globe },
  { id: "ports" as TabType, label: "Cang", icon: Anchor },
  { id: "customs-offices" as TabType, label: "Chi cuc HQ", icon: Building2 },
  { id: "hs-codes" as TabType, label: "Ma HS", icon: FileSpreadsheet },
  { id: "currencies" as TabType, label: "Tien te", icon: DollarSign },
];

const PORT_TYPES = [
  { value: "SEAPORT", label: "Cang bien" },
  { value: "AIRPORT", label: "San bay" },
  { value: "ICD", label: "Cang can (ICD)" },
  { value: "BORDER", label: "Cua khau" },
  { value: "BONDED_WAREHOUSE", label: "Kho ngoai quan" },
];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>("countries");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  // Data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [customsOffices, setCustomsOffices] = useState<CustomsOffice[]>([]);
  const [hsCodes, setHsCodes] = useState<HSCodeCatalog[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.append("search", search);

      let endpoint = "";
      switch (activeTab) {
        case "countries":
          endpoint = "countries";
          break;
        case "ports":
          endpoint = "ports";
          break;
        case "customs-offices":
          endpoint = "customs-offices";
          break;
        case "hs-codes":
          endpoint = "hs-codes";
          break;
        case "currencies":
          endpoint = "currencies";
          break;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/master-data/${endpoint}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setTotal(data.total || 0);

        switch (activeTab) {
          case "countries":
            setCountries(data.items || []);
            break;
          case "ports":
            setPorts(data.items || []);
            break;
          case "customs-offices":
            setCustomsOffices(data.items || []);
            break;
          case "hs-codes":
            setHsCodes(data.items || []);
            break;
          case "currencies":
            setCurrencies(data.items || []);
            break;
        }
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
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ban co chac muon xoa?")) return;

    try {
      const token = localStorage.getItem("access_token");
      let endpoint = "";
      switch (activeTab) {
        case "countries":
          endpoint = `countries/${id}`;
          break;
        case "ports":
          endpoint = `ports/${id}`;
          break;
        case "customs-offices":
          endpoint = `customs-offices/${id}`;
          break;
        case "hs-codes":
          endpoint = `hs-codes/${id}`;
          break;
        case "currencies":
          endpoint = `currencies/${id}`;
          break;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/master-data/${endpoint}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      let endpoint = "";
      switch (activeTab) {
        case "countries":
          endpoint = editItem ? `countries/${editItem.id}` : "countries";
          break;
        case "ports":
          endpoint = editItem ? `ports/${editItem.id}` : "ports";
          break;
        case "customs-offices":
          endpoint = editItem ? `customs-offices/${editItem.id}` : "customs-offices";
          break;
        case "hs-codes":
          endpoint = editItem ? `hs-codes/${editItem.id}` : "hs-codes";
          break;
        case "currencies":
          endpoint = editItem ? `currencies/${editItem.id}` : "currencies";
          break;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/master-data/${endpoint}`,
        {
          method: editItem ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

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

  const getDefaultFormData = () => {
    switch (activeTab) {
      case "countries":
        return { code: "", name_en: "", name_vi: "", region: "", currency_code: "", is_fta_partner: false };
      case "ports":
        return { code: "", country_code: "VN", name_en: "", name_vi: "", port_type: "SEAPORT", city: "", is_customs_clearance: true };
      case "customs-offices":
        return { code: "", name: "", name_short: "", level: 2, province: "", phone: "" };
      case "hs-codes":
        return { hs_code: "", description_vi: "", description_en: "", unit_code: "PCE", import_duty_rate: 0, vat_rate: 10, requires_license: false, requires_inspection: false };
      case "currencies":
        return { code: "", name_en: "", name_vi: "", symbol: "", exchange_rate: null };
      default:
        return {};
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const renderTable = () => {
    switch (activeTab) {
      case "countries":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten (EN)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten (VN)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khu vuc</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tien te</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FTA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tac</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {countries.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.name_en}</td>
                  <td className="px-4 py-3">{item.name_vi || "-"}</td>
                  <td className="px-4 py-3">{item.region || "-"}</td>
                  <td className="px-4 py-3">{item.currency_code || "-"}</td>
                  <td className="px-4 py-3">
                    {item.is_fta_partner ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Co</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Khong</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "ports":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma cang</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten cang</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quoc gia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loai</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thanh pho</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thong quan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tac</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ports.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.name_en}</td>
                  <td className="px-4 py-3">{item.country_code}</td>
                  <td className="px-4 py-3">{PORT_TYPES.find(t => t.value === item.port_type)?.label || item.port_type}</td>
                  <td className="px-4 py-3">{item.city || "-"}</td>
                  <td className="px-4 py-3">
                    {item.is_customs_clearance ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Co</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Khong</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "customs-offices":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten ngan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cap</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tinh</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dien thoai</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tac</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customsOffices.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.name_short || "-"}</td>
                  <td className="px-4 py-3">{item.level === 1 ? "Cuc" : item.level === 2 ? "Chi cuc" : "Doi"}</td>
                  <td className="px-4 py-3">{item.province || "-"}</td>
                  <td className="px-4 py-3">{item.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "hs-codes":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma HS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mo ta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DVT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thue NK</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GP/KT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tac</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hsCodes.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{item.hs_code}</td>
                  <td className="px-4 py-3 max-w-md truncate">{item.description_vi}</td>
                  <td className="px-4 py-3">{item.unit_code || "-"}</td>
                  <td className="px-4 py-3">{item.import_duty_rate}%</td>
                  <td className="px-4 py-3">{item.vat_rate}%</td>
                  <td className="px-4 py-3">
                    {item.requires_license && <span className="px-1 text-xs bg-yellow-100 text-yellow-800 rounded mr-1">GP</span>}
                    {item.requires_inspection && <span className="px-1 text-xs bg-orange-100 text-orange-800 rounded">KT</span>}
                    {!item.requires_license && !item.requires_inspection && "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "currencies":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten (EN)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten (VN)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ky hieu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ty gia (VND)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tac</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currencies.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.name_en}</td>
                  <td className="px-4 py-3">{item.name_vi || "-"}</td>
                  <td className="px-4 py-3">{item.symbol || "-"}</td>
                  <td className="px-4 py-3 font-mono">{item.exchange_rate?.toLocaleString() || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case "countries":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ma quoc gia (2 ky tu) *</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ma Alpha-3</label>
                <input
                  type="text"
                  value={formData.code_alpha3 || ""}
                  onChange={(e) => setFormData({ ...formData, code_alpha3: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VNM"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten tieng Anh *</label>
              <input
                type="text"
                value={formData.name_en || ""}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Vietnam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten tieng Viet</label>
              <input
                type="text"
                value={formData.name_vi || ""}
                onChange={(e) => setFormData({ ...formData, name_vi: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Viet Nam"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Khu vuc</label>
                <select
                  value={formData.region || ""}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Chon khu vuc</option>
                  <option value="Asia">Chau A</option>
                  <option value="Europe">Chau Au</option>
                  <option value="Americas">Chau My</option>
                  <option value="Africa">Chau Phi</option>
                  <option value="Oceania">Chau Dai Duong</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ma tien te</label>
                <input
                  type="text"
                  value={formData.currency_code || ""}
                  onChange={(e) => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VND"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_fta_partner"
                checked={formData.is_fta_partner || false}
                onChange={(e) => setFormData({ ...formData, is_fta_partner: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_fta_partner" className="text-sm">Co FTA voi Viet Nam</label>
            </div>
          </div>
        );

      case "ports":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ma cang (UN/LOCODE) *</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VNHPH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ma quoc gia *</label>
                <input
                  type="text"
                  value={formData.country_code || ""}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="VN"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten cang (EN) *</label>
              <input
                type="text"
                value={formData.name_en || ""}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Hai Phong Port"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten cang (VN)</label>
              <input
                type="text"
                value={formData.name_vi || ""}
                onChange={(e) => setFormData({ ...formData, name_vi: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Cang Hai Phong"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loai cang *</label>
                <select
                  value={formData.port_type || "SEAPORT"}
                  onChange={(e) => setFormData({ ...formData, port_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thanh pho</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Hai Phong"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_customs_clearance"
                checked={formData.is_customs_clearance ?? true}
                onChange={(e) => setFormData({ ...formData, is_customs_clearance: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_customs_clearance" className="text-sm">Cho phep thong quan</label>
            </div>
          </div>
        );

      case "customs-offices":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ma chi cuc *</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="HQHANAM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cap *</label>
                <select
                  value={formData.level || 2}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value={1}>Cuc Hai quan</option>
                  <option value={2}>Chi cuc Hai quan</option>
                  <option value={3}>Doi/To Hai quan</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten day du *</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Chi cuc Hai quan Ha Nam"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ten viet tat</label>
                <input
                  type="text"
                  value={formData.name_short || ""}
                  onChange={(e) => setFormData({ ...formData, name_short: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="HQ Ha Nam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tinh/TP</label>
                <input
                  type="text"
                  value={formData.province || ""}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ha Nam"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">So dien thoai</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0226 xxx xxx"
              />
            </div>
          </div>
        );

      case "hs-codes":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ma HS (8-10 so) *</label>
                <input
                  type="text"
                  value={formData.hs_code || ""}
                  onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="85249100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Don vi tinh</label>
                <input
                  type="text"
                  value={formData.unit_code || ""}
                  onChange={(e) => setFormData({ ...formData, unit_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="PCE"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mo ta (VN) *</label>
              <textarea
                value={formData.description_vi || ""}
                onChange={(e) => setFormData({ ...formData, description_vi: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Mo ta hang hoa bang tieng Viet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mo ta (EN)</label>
              <textarea
                value={formData.description_en || ""}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Description in English"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Thue NK (%)</label>
                <input
                  type="number"
                  value={formData.import_duty_rate || 0}
                  onChange={(e) => setFormData({ ...formData, import_duty_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">VAT (%)</label>
                <input
                  type="number"
                  value={formData.vat_rate || 10}
                  onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thue TTDB (%)</label>
                <input
                  type="number"
                  value={formData.special_consumption_rate || 0}
                  onChange={(e) => setFormData({ ...formData, special_consumption_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_license"
                  checked={formData.requires_license || false}
                  onChange={(e) => setFormData({ ...formData, requires_license: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="requires_license" className="text-sm">Can giay phep</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_inspection"
                  checked={formData.requires_inspection || false}
                  onChange={(e) => setFormData({ ...formData, requires_inspection: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="requires_inspection" className="text-sm">Can kiem tra chuyen nganh</label>
              </div>
            </div>
          </div>
        );

      case "currencies":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ma tien te (ISO) *</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="USD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ky hieu</label>
                <input
                  type="text"
                  value={formData.symbol || ""}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="$"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten tieng Anh *</label>
              <input
                type="text"
                value={formData.name_en || ""}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="US Dollar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ten tieng Viet</label>
              <input
                type="text"
                value={formData.name_vi || ""}
                onChange={(e) => setFormData({ ...formData, name_vi: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Do la My"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ty gia (VND)</label>
              <input
                type="number"
                value={formData.exchange_rate || ""}
                onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || null })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="25000"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh muc du lieu</h1>
          <p className="text-gray-600">Quan ly danh muc cho khai bao hai quan</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Them moi
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
              setSearch("");
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem..."
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
            <div className="overflow-x-auto">{renderTable()}</div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Hien thi {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total}
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
              <div className="p-8 text-center text-gray-500">Khong co du lieu</div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editItem ? "Chinh sua" : "Them moi"} - {TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">{renderForm()}</div>
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
    </div>
  );
}

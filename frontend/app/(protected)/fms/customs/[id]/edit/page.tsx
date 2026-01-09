'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  Plus,
} from 'lucide-react';

// ============================================================
// INTERFACES
// ============================================================

interface HSCodeItem {
  id: string;
  item_no: number;
  hs_code: string;
  product_code: string | null;
  supplier_code: string | null;
  product_name: string | null;
  hs_description: string | null;
  quantity: number;
  unit: string | null;
  quantity_2: number;
  unit_2: string | null;
  unit_price: number;
  total_value: number;
  gross_weight: number;
  net_weight: number;
  country_of_origin: string | null;
  customs_value: number;
  import_duty_rate: number;
  import_duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  special_consumption_rate: number;
  special_consumption_amount: number;
  exemption_code: string | null;
  vat_exemption_code: string | null;
  total_tax_amount: number;
}

interface CustomsFormData {
  // Header
  declaration_no: string;
  first_declaration_no: string;
  declaration_type: string;
  declaration_type_code: string;
  classification_code: string;
  customs_office_code: string;
  customs_office_name: string;
  registration_date: string;
  representative_hs_code: string;
  processing_unit_code: string;

  // Người nhập khẩu
  importer_code: string;
  importer_tax_code: string;
  importer_name: string;
  importer_address: string;
  importer_phone: string;
  importer_postal_code: string;

  // Người ủy thác nhập khẩu
  consignee_code: string;
  consignee_name: string;

  // Người xuất khẩu
  exporter_name: string;
  exporter_address: string;
  exporter_country: string;

  // Đại lý HQ
  customs_agent_code: string;
  customs_agent_name: string;
  customs_agent_employee_code: string;

  // Địa điểm
  warehouse_code: string;
  warehouse_name: string;
  border_gate: string;
  border_gate_name: string;
  loading_location_code: string;
  loading_location_name: string;
  unloading_location_code: string;
  unloading_location_name: string;

  // Vận đơn
  bl_no: string;
  bl_date: string;
  invoice_no: string;
  invoice_date: string;
  contract_no: string;

  // Vận chuyển
  transport_mode: string;
  vessel_name: string;
  voyage_no: string;
  loading_port: string;
  loading_port_name: string;
  discharge_port: string;
  discharge_port_name: string;
  arrival_date: string;

  // Hàng hóa
  total_packages: number;
  package_unit: string;
  gross_weight: number;
  net_weight: number;
  container_numbers: string;
  container_count: number;

  // Giá trị - Hóa đơn thương mại
  invoice_type: string;
  invoice_category: string;
  currency_code: string;
  exchange_rate: number;
  total_value: number;
  customs_value: number;
  incoterms: string;
  payment_method: string;

  // Khai trị giá
  valuation_type: string;
  valuation_currency: string;
  freight_value: number;
  freight_currency: string;
  insurance_value: number;
  insurance_currency: string;

  // Thuế
  total_import_duty: number;
  total_vat: number;
  total_tax: number;

  // Giấy phép
  license_1: string;
  license_2: string;
  license_3: string;
  license_4: string;
  license_5: string;

  // Ghi chú
  remarks: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const DECLARATION_TYPES = [
  { value: 'C11', label: 'C11 - NK tiêu dùng' },
  { value: 'C12', label: 'C12 - NK kinh doanh' },
  { value: 'C21', label: 'C21 - NK gia công' },
  { value: 'C31', label: 'C31 - NK SXXK' },
  { value: 'E11', label: 'E11 - NK EPE' },
  { value: 'A11', label: 'A11 - XK tiêu dùng' },
  { value: 'A12', label: 'A12 - XK kinh doanh' },
];

const TRANSPORT_MODES = [
  { value: '1', label: '1 - Đường biển' },
  { value: '4', label: '4 - Đường hàng không' },
  { value: '3', label: '3 - Đường bộ' },
  { value: '2', label: '2 - Đường sắt' },
];

const CLASSIFICATION_CODES = [
  { value: '1', label: '1 - Luồng xanh' },
  { value: '2', label: '2 - Luồng vàng' },
  { value: '3', label: '3 - Luồng đỏ' },
];

const PAYMENT_METHODS = [
  { value: '', label: '- Chọn -' },
  { value: 'KHONGTT', label: 'KHONGTT - Không thanh toán' },
  { value: 'TT', label: 'TT - Điện chuyển tiền' },
  { value: 'LC', label: 'LC - Thư tín dụng' },
  { value: 'DA', label: 'DA - Nhờ thu chấp nhận' },
  { value: 'DP', label: 'DP - Nhờ thu trả ngay' },
];

const INVOICE_TYPES = [
  { value: 'A', label: 'A - Hóa đơn thương mại' },
  { value: 'B', label: 'B - Chứng từ thay thế hóa đơn' },
  { value: 'D', label: 'D - Hóa đơn điện tử IVA' },
];

const INVOICE_CATEGORIES = [
  { value: 'A', label: 'A - Hàng phải trả tiền' },
  { value: 'B', label: 'B - Hàng không phải trả tiền' },
  { value: 'C', label: 'C - Hỗn hợp' },
  { value: 'D', label: 'D - Khác' },
];

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY', 'VND', 'TWD', 'KRW'];

const EXEMPTION_CODES = [
  { value: '', label: '- Không -' },
  { value: 'XNK32', label: 'XNK32' },
  { value: 'XNK01', label: 'XNK01' },
  { value: 'XNK02', label: 'XNK02' },
];

const VAT_EXEMPTION_CODES = [
  { value: '', label: '- Không -' },
  { value: 'VK130', label: 'VK130' },
  { value: 'VK101', label: 'VK101' },
];

const UNITS = [
  { value: 'PCE', label: 'PCE' },
  { value: 'SET', label: 'SET' },
  { value: 'KGM', label: 'KGM' },
  { value: 'MTR', label: 'MTR' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomsEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hsItems, setHsItems] = useState<HSCodeItem[]>([]);
  const [declaration, setDeclaration] = useState<Record<string, unknown> | null>(null);

  // Tab state - 2 tabs như VNACCS
  const [activeTab, setActiveTab] = useState<'thongtin1' | 'thongtin2' | 'danhsach'>('thongtin1');

  const [formData, setFormData] = useState<CustomsFormData>({
    declaration_no: '',
    first_declaration_no: '',
    declaration_type: 'C11',
    declaration_type_code: 'C11',
    classification_code: '1',
    customs_office_code: '',
    customs_office_name: '',
    registration_date: '',
    representative_hs_code: '',
    processing_unit_code: '',
    importer_code: '',
    importer_tax_code: '',
    importer_name: '',
    importer_address: '',
    importer_phone: '',
    importer_postal_code: '',
    consignee_code: '',
    consignee_name: '',
    exporter_name: '',
    exporter_address: '',
    exporter_country: '',
    customs_agent_code: '',
    customs_agent_name: '',
    customs_agent_employee_code: '',
    warehouse_code: '',
    warehouse_name: '',
    border_gate: '',
    border_gate_name: '',
    loading_location_code: '',
    loading_location_name: '',
    unloading_location_code: '',
    unloading_location_name: '',
    bl_no: '',
    bl_date: '',
    invoice_no: '',
    invoice_date: '',
    contract_no: '',
    transport_mode: '1',
    vessel_name: '',
    voyage_no: '',
    loading_port: '',
    loading_port_name: '',
    discharge_port: '',
    discharge_port_name: '',
    arrival_date: '',
    total_packages: 0,
    package_unit: 'PKG',
    gross_weight: 0,
    net_weight: 0,
    container_numbers: '',
    container_count: 0,
    invoice_type: 'A',
    invoice_category: 'A',
    currency_code: 'USD',
    exchange_rate: 0,
    total_value: 0,
    customs_value: 0,
    incoterms: 'FOB',
    payment_method: '',
    valuation_type: '',
    valuation_currency: 'USD',
    freight_value: 0,
    freight_currency: 'USD',
    insurance_value: 0,
    insurance_currency: 'USD',
    total_import_duty: 0,
    total_vat: 0,
    total_tax: 0,
    license_1: '',
    license_2: '',
    license_3: '',
    license_4: '',
    license_5: '',
    remarks: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchDeclaration();
      await fetchHSItems();
    };
    loadData();
  }, [id]);

  const fetchDeclaration = async () => {
    try {
      const response = await fetch(`/api/v1/fms/customs/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Declaration API error:', response.status, errorData);
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy tờ khai.');
        }
        throw new Error(`Lỗi tải tờ khai: ${response.status}`);
      }
      const data = await response.json();
      setDeclaration(data);

      // Map API response to form data
      setFormData({
        declaration_no: data.declaration_no || '',
        first_declaration_no: data.first_declaration_no || '',
        declaration_type: data.declaration_type_code || data.declaration_type || 'C11',
        declaration_type_code: data.declaration_type_code || 'C11',
        classification_code: data.customs_channel || '1',
        customs_office_code: data.customs_office_code || '',
        customs_office_name: data.customs_office_name || '',
        registration_date: data.registration_date || '',
        representative_hs_code: data.representative_hs_code || '',
        processing_unit_code: data.processing_unit_code || '',
        importer_code: data.importer_code || '',
        importer_tax_code: data.trader_tax_code || '',
        importer_name: data.trader_name || '',
        importer_address: data.trader_address || '',
        importer_phone: data.trader_phone || '',
        importer_postal_code: data.importer_postal_code || '',
        consignee_code: data.consignee_code || '',
        consignee_name: data.consignee_name || '',
        exporter_name: data.foreign_partner_name || '',
        exporter_address: data.foreign_partner_address || '',
        exporter_country: data.foreign_partner_country || '',
        customs_agent_code: data.broker_code || '',
        customs_agent_name: data.broker_name || '',
        customs_agent_employee_code: data.customs_agent_employee_code || '',
        warehouse_code: data.warehouse_code || '',
        warehouse_name: data.warehouse_name || '',
        border_gate: data.border_gate || '',
        border_gate_name: data.border_gate_name || '',
        loading_location_code: data.loading_location_code || '',
        loading_location_name: data.loading_location_name || '',
        unloading_location_code: data.unloading_location_code || '',
        unloading_location_name: data.unloading_location_name || '',
        bl_no: data.bl_no || '',
        bl_date: data.bl_date || '',
        invoice_no: data.invoice_no || '',
        invoice_date: data.invoice_date || '',
        contract_no: data.contract_no || '',
        transport_mode: data.transport_mode || '1',
        vessel_name: data.vessel_name || '',
        voyage_no: data.voyage_no || '',
        loading_port: data.loading_port || '',
        loading_port_name: data.loading_port_name || '',
        discharge_port: data.discharge_port || '',
        discharge_port_name: data.discharge_port_name || '',
        arrival_date: data.eta_date || '',
        total_packages: data.total_packages || 0,
        package_unit: data.package_unit || 'PKG',
        gross_weight: data.gross_weight || 0,
        net_weight: data.net_weight || 0,
        container_numbers: data.container_numbers || '',
        container_count: data.container_count || 0,
        invoice_type: data.invoice_type || 'A',
        invoice_category: data.invoice_category || 'A',
        currency_code: data.currency_code || 'USD',
        exchange_rate: data.exchange_rate || 0,
        total_value: data.fob_value || data.cif_value || 0,
        customs_value: data.customs_value || 0,
        incoterms: data.incoterms || 'FOB',
        payment_method: data.payment_method || '',
        valuation_type: data.valuation_type || '',
        valuation_currency: data.valuation_currency || 'USD',
        freight_value: data.freight_value || 0,
        freight_currency: data.freight_currency || 'USD',
        insurance_value: data.insurance_value || 0,
        insurance_currency: data.insurance_currency || 'USD',
        total_import_duty: data.import_duty || 0,
        total_vat: data.vat || 0,
        total_tax: data.total_tax || 0,
        license_1: data.license_1 || '',
        license_2: data.license_2 || '',
        license_3: data.license_3 || '',
        license_4: data.license_4 || '',
        license_5: data.license_5 || '',
        remarks: data.notes || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHSItems = async () => {
    try {
      const response = await fetch(`/api/v1/fms/customs/${id}/hs-codes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('HS codes API error:', response.status, errorData);
        if (response.status === 404) {
          setHsItems([]);
          return;
        }
        throw new Error(`Failed to fetch HS codes: ${response.status}`);
      }
      const data = await response.json();
      setHsItems(data || []);
    } catch (err) {
      console.error('Error fetching HS items:', err);
      setHsItems([]);
    }
  };

  const handleInputChange = (field: keyof CustomsFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/fms/customs/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          declaration_type_code: formData.declaration_type,
          customs_channel: formData.classification_code,
          customs_office_code: formData.customs_office_code,
          customs_office_name: formData.customs_office_name,
          representative_hs_code: formData.representative_hs_code,
          trader_tax_code: formData.importer_tax_code,
          trader_name: formData.importer_name,
          trader_address: formData.importer_address,
          trader_phone: formData.importer_phone,
          foreign_partner_name: formData.exporter_name,
          foreign_partner_address: formData.exporter_address,
          foreign_partner_country: formData.exporter_country,
          broker_code: formData.customs_agent_code,
          broker_name: formData.customs_agent_name,
          warehouse_code: formData.warehouse_code,
          warehouse_name: formData.warehouse_name,
          border_gate: formData.border_gate,
          border_gate_name: formData.border_gate_name,
          bl_no: formData.bl_no,
          bl_date: formData.bl_date || null,
          invoice_no: formData.invoice_no,
          invoice_date: formData.invoice_date || null,
          transport_mode: formData.transport_mode,
          vessel_name: formData.vessel_name,
          voyage_no: formData.voyage_no,
          loading_port: formData.loading_port,
          loading_port_name: formData.loading_port_name,
          discharge_port: formData.discharge_port,
          discharge_port_name: formData.discharge_port_name,
          eta_date: formData.arrival_date || null,
          total_packages: formData.total_packages,
          package_unit: formData.package_unit,
          gross_weight: formData.gross_weight,
          net_weight: formData.net_weight,
          container_numbers: formData.container_numbers,
          container_count: formData.container_count,
          currency_code: formData.currency_code,
          exchange_rate: formData.exchange_rate,
          fob_value: formData.total_value,
          customs_value: formData.customs_value,
          incoterms: formData.incoterms,
          payment_method: formData.payment_method,
          import_duty: formData.total_import_duty,
          vat: formData.total_vat,
          total_tax: formData.total_tax,
          notes: formData.remarks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save');
      }

      router.push(`/fms/customs/${id}`);
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Bạn có chắc muốn xóa dòng hàng này?')) return;
    try {
      const response = await fetch(`/api/v1/fms/customs/${id}/hs-codes/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete item');
      await fetchHSItems();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddItem = async () => {
    try {
      const newItem = {
        declaration_id: id,
        item_no: hsItems.length + 1,
        hs_code: '',
        product_name: 'Mặt hàng mới',
        quantity: 0,
        unit: 'PCE',
        unit_price: 0,
        total_value: 0,
        import_duty_rate: 0,
        vat_rate: 10,
        currency_code: formData.currency_code,
      };

      const response = await fetch(`/api/v1/fms/customs/${id}/hs-codes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newItem),
      });

      if (!response.ok) throw new Error('Failed to add item');
      await fetchHSItems();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/fms/customs" className="mt-4 inline-block text-blue-600 hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/fms/customs/${id}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            Chỉnh sửa tờ khai {(declaration?.declaration_no as string) || id.substring(0, 8)}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/fms/customs/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* VNACCS Style Tabs - giống ECUS */}
      <div className="overflow-hidden rounded-lg border bg-white">
        {/* Tab Header */}
        <div className="flex border-b bg-gray-100">
          <button
            onClick={() => setActiveTab('thongtin1')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              activeTab === 'thongtin1'
                ? 'bg-white text-blue-600 border-t-2 border-t-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Thông tin chung
          </button>
          <button
            onClick={() => setActiveTab('thongtin2')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              activeTab === 'thongtin2'
                ? 'bg-white text-blue-600 border-t-2 border-t-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Thông tin chung 2
          </button>
          <button
            onClick={() => setActiveTab('danhsach')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              activeTab === 'danhsach'
                ? 'bg-white text-blue-600 border-t-2 border-t-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Danh sách hàng
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* ============================================================ */}
          {/* TAB 1: THÔNG TIN CHUNG */}
          {/* ============================================================ */}
          {activeTab === 'thongtin1' && (
            <div className="space-y-6">
              {/* Nhóm loại hình */}
              <div className="rounded border p-4">
                <div className="mb-3 flex items-center gap-4 text-sm">
                  <label className="font-medium">Nhóm loại hình:</label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="group_type" value="1" defaultChecked /> Kinh doanh, đầu tư
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="group_type" value="2" /> Sản xuất xuất khẩu
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="group_type" value="3" /> Gia công
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="group_type" value="4" /> Chế xuất
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  {/* Row 1 */}
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Số tờ khai:</label>
                    <input
                      type="text"
                      value={formData.declaration_no}
                      disabled
                      className="w-full rounded border bg-gray-100 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-xs text-gray-500">STT:</label>
                    <input type="text" disabled className="w-full rounded border bg-gray-100 px-2 py-1 text-sm" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Số tờ khai đầu tiên:</label>
                    <input
                      type="text"
                      value={formData.first_declaration_no}
                      onChange={(e) => handleInputChange('first_declaration_no', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Số nhánh:</label>
                    <div className="flex gap-1">
                      <input type="text" className="w-16 rounded border px-2 py-1 text-sm" />
                      <span className="py-1">/</span>
                      <input type="text" className="w-16 rounded border px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số tờ khai tạm nhập tái xuất tương ứng:</label>
                    <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>

                  {/* Row 2 */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Mã loại hình: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.declaration_type}
                      onChange={(e) => handleInputChange('declaration_type', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {DECLARATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã phân loại hàng hóa:</label>
                    <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Cơ quan Hải quan: <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.customs_office_code}
                      onChange={(e) => handleInputChange('customs_office_code', e.target.value)}
                      placeholder="28NJ"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">&nbsp;</label>
                    <input
                      type="text"
                      value={formData.customs_office_name}
                      onChange={(e) => handleInputChange('customs_office_name', e.target.value)}
                      placeholder="Hải quan Hà Nam"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Ngày khai báo (dự kiến):</label>
                    <input
                      type="date"
                      value={formData.registration_date}
                      onChange={(e) => handleInputChange('registration_date', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Phân loại cá nhân/tổ chức: <span className="text-red-500">*</span></label>
                    <select className="w-full rounded border px-2 py-1 text-sm">
                      <option value="4">Hàng từ tổ chức đến tổ chức</option>
                      <option value="1">Cá nhân đến cá nhân</option>
                      <option value="2">Tổ chức đến cá nhân</option>
                      <option value="3">Cá nhân đến tổ chức</option>
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Mã bộ phận xử lý tờ khai:</label>
                    <input
                      type="text"
                      value={formData.processing_unit_code}
                      onChange={(e) => handleInputChange('processing_unit_code', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Thời hạn tái xuất:</label>
                    <input type="date" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>

                  {/* Row 4 */}
                  <div className="col-span-6 space-y-1">
                    <label className="text-xs text-gray-500">Mã hiệu phương thức vận chuyển: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.transport_mode}
                      onChange={(e) => handleInputChange('transport_mode', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {TRANSPORT_MODES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Đơn vị xuất nhập khẩu */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Đơn vị xuất nhập khẩu</h3>

                {/* Người nhập khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600">Người nhập khẩu</div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Mã:</label>
                      <input
                        type="text"
                        value={formData.importer_tax_code}
                        onChange={(e) => handleInputChange('importer_tax_code', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-9 space-y-1">
                      <label className="text-xs text-gray-500">Tên:</label>
                      <input
                        type="text"
                        value={formData.importer_name}
                        onChange={(e) => handleInputChange('importer_name', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Mã bưu chính:</label>
                      <input
                        type="text"
                        value={formData.importer_postal_code}
                        onChange={(e) => handleInputChange('importer_postal_code', e.target.value)}
                        placeholder="(+84)"
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-9 space-y-1">
                      <label className="text-xs text-gray-500">Địa chỉ:</label>
                      <input
                        type="text"
                        value={formData.importer_address}
                        onChange={(e) => handleInputChange('importer_address', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Điện thoại:</label>
                      <input
                        type="text"
                        value={formData.importer_phone}
                        onChange={(e) => handleInputChange('importer_phone', e.target.value)}
                        placeholder="(+84)"
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Người ủy thác nhập khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600">Người ủy thác nhập khẩu</div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Mã:</label>
                      <input
                        type="text"
                        value={formData.consignee_code}
                        onChange={(e) => handleInputChange('consignee_code', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-9 space-y-1">
                      <label className="text-xs text-gray-500">Tên:</label>
                      <input
                        type="text"
                        value={formData.consignee_name}
                        onChange={(e) => handleInputChange('consignee_name', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Người xuất khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600">Người xuất khẩu</div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Mã:</label>
                      <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                    </div>
                    <div className="col-span-9" />
                    <div className="col-span-12 space-y-1">
                      <label className="text-xs text-gray-500">Tên: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.exporter_name}
                        onChange={(e) => handleInputChange('exporter_name', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-xs text-gray-500">Mã bưu chính:</label>
                      <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                    </div>
                    <div className="col-span-9 space-y-1">
                      <label className="text-xs text-gray-500">Địa chỉ: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.exporter_address}
                        onChange={(e) => handleInputChange('exporter_address', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-6 space-y-1">
                      <label className="text-xs text-gray-500">Mã nước: <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.exporter_country}
                          onChange={(e) => handleInputChange('exporter_country', e.target.value)}
                          maxLength={2}
                          placeholder="CN"
                          className="w-20 rounded border px-2 py-1 text-sm"
                        />
                        <select className="flex-1 rounded border px-2 py-1 text-sm">
                          <option value="">...</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Người ủy thác xuất khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600">Người ủy thác xuất khẩu:</div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 space-y-1">
                      <label className="text-xs text-gray-500">Mã người khai Hải quan:</label>
                      <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vận đơn */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Vận đơn</h3>

                <div className="mb-3 flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" /> Khai báo số định danh theo chuẩn quản lý giám sát Hải quan tự động tại Cảng biển.
                  </label>
                </div>
                <div className="mb-3 flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" /> Khai báo số định danh theo chuẩn quản lý giám sát Hải quan tự động tại Cảng hàng không
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1 text-left">Số vận đơn</th>
                          <th className="border px-2 py-1 text-left">Ngày vận đơn</th>
                          <th className="border px-2 py-1 text-left">Số HAWB</th>
                          <th className="border px-2 py-1 text-left">Năm MAWB</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formData.bl_no}
                              onChange={(e) => handleInputChange('bl_no', e.target.value)}
                              className="w-full rounded border-0 px-1 py-0.5 text-sm"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="date"
                              value={formData.bl_date}
                              onChange={(e) => handleInputChange('bl_date', e.target.value)}
                              className="w-full rounded border-0 px-1 py-0.5 text-sm"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input type="text" className="w-full rounded border-0 px-1 py-0.5 text-sm" />
                          </td>
                          <td className="border px-1 py-1">
                            <input type="text" className="w-full rounded border-0 px-1 py-0.5 text-sm" />
                          </td>
                        </tr>
                        {[2, 3, 4, 5].map((i) => (
                          <tr key={i}>
                            <td className="border px-1 py-1"><input type="text" className="w-full rounded border-0 px-1 py-0.5 text-sm" /></td>
                            <td className="border px-1 py-1"><input type="date" className="w-full rounded border-0 px-1 py-0.5 text-sm" /></td>
                            <td className="border px-1 py-1"><input type="text" className="w-full rounded border-0 px-1 py-0.5 text-sm" /></td>
                            <td className="border px-1 py-1"><input type="text" className="w-full rounded border-0 px-1 py-0.5 text-sm" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-span-12">
                    <a href="#" className="text-blue-600 text-xs hover:underline">Khai báo thông tin ngày vận đơn trong chi tiết trị giá</a>
                  </div>
                </div>

                {/* Số lượng kiện */}
                <div className="mt-4 grid grid-cols-12 gap-4">
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Số lượng kiện: <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <select className="w-24 rounded border px-2 py-1 text-sm">
                        <option value=""></option>
                      </select>
                      <select className="flex-1 rounded border px-2 py-1 text-sm">
                        <option value=""></option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Tổng trọng lượng hàng (Gross):</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.gross_weight}
                        onChange={(e) => handleInputChange('gross_weight', Number(e.target.value))}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                      <select className="w-20 rounded border px-2 py-1 text-sm">
                        <option value="KGM">KGM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: THÔNG TIN CHUNG 2 */}
          {/* ============================================================ */}
          {activeTab === 'thongtin2' && (
            <div className="space-y-6">
              {/* Số hợp đồng */}
              <div className="rounded border p-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 space-y-1">
                    <label className="text-xs text-gray-500">Số hợp đồng:</label>
                    <input
                      type="text"
                      value={formData.contract_no}
                      onChange={(e) => handleInputChange('contract_no', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Ngày hợp đồng:</label>
                    <input type="date" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Ngày hết hạn:</label>
                    <input type="date" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                </div>
                <div className="mt-2">
                  <a href="#" className="text-blue-600 text-xs hover:underline">Khai báo thông tin HĐ theo yêu cầu của Hải quan</a>
                </div>
              </div>

              {/* Thông tin văn bản và giấy phép */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Thông tin văn bản và giấy phép</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã văn bản pháp quy khác:</label>
                    <select className="w-full rounded border px-2 py-1 text-sm">
                      <option value=""></option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-sm">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Giấy phép nhập khẩu: 1</label>
                    <select
                      value={formData.license_1}
                      onChange={(e) => handleInputChange('license_1', e.target.value)}
                      className="w-full rounded border px-2 py-1"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">2</label>
                    <select
                      value={formData.license_2}
                      onChange={(e) => handleInputChange('license_2', e.target.value)}
                      className="w-full rounded border px-2 py-1"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">3</label>
                    <select
                      value={formData.license_3}
                      onChange={(e) => handleInputChange('license_3', e.target.value)}
                      className="w-full rounded border px-2 py-1"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">4</label>
                    <select
                      value={formData.license_4}
                      onChange={(e) => handleInputChange('license_4', e.target.value)}
                      className="w-full rounded border px-2 py-1"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">5</label>
                    <select
                      value={formData.license_5}
                      onChange={(e) => handleInputChange('license_5', e.target.value)}
                      className="w-full rounded border px-2 py-1"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hóa đơn thương mại */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Hóa đơn thương mại</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phân loại hình thức hóa đơn:</label>
                    <select
                      value={formData.invoice_type}
                      onChange={(e) => handleInputChange('invoice_type', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {INVOICE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số tiếp nhận hóa đơn điện tử:</label>
                    <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số hóa đơn:</label>
                    <input
                      type="text"
                      value={formData.invoice_no}
                      onChange={(e) => handleInputChange('invoice_no', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Ngày phát hành:</label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phương thức thanh toán:</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {PAYMENT_METHODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã phân loại giá hóa đơn: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.invoice_category}
                      onChange={(e) => handleInputChange('invoice_category', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {INVOICE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Điều kiện giá hóa đơn: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.incoterms}
                      onChange={(e) => handleInputChange('incoterms', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {INCOTERMS.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Tổng trị giá hóa đơn: <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_value}
                      onChange={(e) => handleInputChange('total_value', Number(e.target.value))}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã đồng tiền của hóa đơn: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.currency_code}
                      onChange={(e) => handleInputChange('currency_code', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tờ khai trị giá */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Tờ khai trị giá</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã phân loại khai trị giá:</label>
                    <select
                      value={formData.valuation_type}
                      onChange={(e) => handleInputChange('valuation_type', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số tiếp nhận tờ khai trị giá tổng hợp:</label>
                    <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã tiền tệ:</label>
                    <select
                      value={formData.valuation_currency}
                      onChange={(e) => handleInputChange('valuation_currency', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phí vận chuyển:</label>
                    <div className="flex gap-2">
                      <select className="w-20 rounded border px-2 py-1 text-sm">
                        <option value="">Mã loại</option>
                      </select>
                      <select
                        value={formData.freight_currency}
                        onChange={(e) => handleInputChange('freight_currency', e.target.value)}
                        className="w-16 rounded border px-2 py-1 text-sm"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Phí VC"
                        value={formData.freight_value || ''}
                        onChange={(e) => handleInputChange('freight_value', Number(e.target.value))}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phí bảo hiểm:</label>
                    <div className="flex gap-2">
                      <select className="w-20 rounded border px-2 py-1 text-sm">
                        <option value="">Mã loại</option>
                      </select>
                      <select
                        value={formData.insurance_currency}
                        onChange={(e) => handleInputChange('insurance_currency', e.target.value)}
                        className="w-16 rounded border px-2 py-1 text-sm"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Phí BH"
                        value={formData.insurance_value || ''}
                        onChange={(e) => handleInputChange('insurance_value', Number(e.target.value))}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số đăng ký:</label>
                    <input type="text" className="w-full rounded border px-2 py-1 text-sm" />
                  </div>
                </div>
                {/* Chi tiết khai trị giá */}
                <div className="mt-4">
                  <label className="text-xs text-gray-500">Chi tiết khai trị giá:</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    rows={3}
                    className="w-full rounded border px-2 py-1 text-sm mt-1"
                    placeholder="Nhập chi tiết khai trị giá..."
                  />
                </div>
              </div>

              {/* Thuế và bảo lãnh */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Thuế và bảo lãnh</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã lý do đề nghị BP:</label>
                    <select className="w-full rounded border px-2 py-1 text-sm">
                      <option value=""></option>
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã xác định thời hạn nộp thuế:</label>
                    <select className="w-full rounded border px-2 py-1 text-sm">
                      <option value=""></option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thông tin đính kèm */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Thông tin đính kèm</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Địa điểm lưu kho:</label>
                    <input
                      type="text"
                      value={formData.warehouse_code}
                      onChange={(e) => handleInputChange('warehouse_code', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-8 space-y-1">
                    <label className="text-xs text-gray-500">&nbsp;</label>
                    <input
                      type="text"
                      value={formData.warehouse_name}
                      onChange={(e) => handleInputChange('warehouse_name', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phương tiện vận chuyển:</label>
                    <input
                      type="text"
                      value={formData.vessel_name}
                      onChange={(e) => handleInputChange('vessel_name', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Ngày hàng đến:</label>
                    <input
                      type="date"
                      value={formData.arrival_date}
                      onChange={(e) => handleInputChange('arrival_date', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Số lượng container:</label>
                    <input
                      type="number"
                      value={formData.container_count}
                      onChange={(e) => handleInputChange('container_count', Number(e.target.value))}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-6 space-y-1">
                    <label className="text-xs text-gray-500">Địa điểm dỡ hàng (Place of Delivery):</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.unloading_location_code}
                        onChange={(e) => handleInputChange('unloading_location_code', e.target.value)}
                        placeholder="Code"
                        className="w-24 rounded border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={formData.unloading_location_name}
                        onChange={(e) => handleInputChange('unloading_location_name', e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-6 space-y-1">
                    <label className="text-xs text-gray-500">Địa điểm xếp hàng (Port of Loading):</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.loading_port}
                        onChange={(e) => handleInputChange('loading_port', e.target.value)}
                        placeholder="Code"
                        className="w-24 rounded border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={formData.loading_port_name}
                        onChange={(e) => handleInputChange('loading_port_name', e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: DANH SÁCH HÀNG - Editable */}
          {/* ============================================================ */}
          {activeTab === 'danhsach' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between rounded bg-gray-100 p-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-gray-500">Click vào ô để chỉnh sửa. Nhấn "Lưu thay đổi" ở trên để lưu tất cả.</span>
                </div>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1 rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </button>
              </div>

              {/* Items Table - Editable */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1600px] border text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-blue-500 px-2 py-2 text-center w-10">STT</th>
                      <th className="border border-blue-500 px-2 py-2 text-left w-24">Mã HS</th>
                      <th className="border border-blue-500 px-2 py-2 text-left w-28">Mã QL riêng</th>
                      <th className="border border-blue-500 px-2 py-2 text-left min-w-[200px]">Tên hàng (mô tả)</th>
                      <th className="border border-blue-500 px-2 py-2 text-center w-14">Xuất xứ</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-20">Lượng</th>
                      <th className="border border-blue-500 px-2 py-2 text-center w-14">ĐVT</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-24">Đơn giá</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-28">Trị giá HĐ</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-14">TS NK%</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-24">Thuế NK</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-14">TS VAT%</th>
                      <th className="border border-blue-500 px-2 py-2 text-right w-24">Thuế VAT</th>
                      <th className="border border-blue-500 px-2 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsItems.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="border px-4 py-8 text-center text-gray-500">
                          Chưa có dữ liệu hàng hóa. Nhấn "Thêm dòng" để thêm mặt hàng.
                        </td>
                      </tr>
                    ) : (
                      hsItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border px-2 py-1 text-center font-bold text-blue-600">
                            {String(item.item_no || idx + 1).padStart(2, '0')}
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.hs_code || ''}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], hs_code: e.target.value };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm font-mono bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="85249100"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.product_code || ''}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], product_code: e.target.value };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="023.400UL"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.product_name || item.hs_description || ''}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], product_name: e.target.value };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="Mô tả hàng hóa..."
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.country_of_origin || ''}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], country_of_origin: e.target.value.toUpperCase() };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-center bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="CN"
                              maxLength={2}
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.quantity || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <select
                              value={item.unit || 'PCE'}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], unit: e.target.value };
                                setHsItems(updated);
                              }}
                              className="w-full px-0 py-0.5 border-0 text-sm bg-transparent focus:outline-none"
                            >
                              {UNITS.map((u) => (
                                <option key={u.value} value={u.value}>{u.value}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], unit_price: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={item.total_value || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], total_value: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.import_duty_rate || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], import_duty_rate: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.import_duty_amount || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], import_duty_amount: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.vat_rate || 10}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], vat_rate: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.vat_amount || 0}
                              onChange={(e) => {
                                const updated = [...hsItems];
                                updated[idx] = { ...updated[idx], vat_amount: Number(e.target.value) };
                                setHsItems(updated);
                              }}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Summary Footer */}
                  {hsItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-blue-100 font-medium">
                        <td colSpan={5} className="border px-2 py-2 text-right">Tổng cộng:</td>
                        <td className="border px-2 py-2 text-right">
                          {hsItems.reduce((sum, i) => sum + (i.quantity || 0), 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {hsItems.reduce((sum, i) => sum + (i.total_value || 0), 0).toLocaleString()} {formData.currency_code}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {hsItems.reduce((sum, i) => sum + (i.import_duty_amount || 0), 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {hsItems.reduce((sum, i) => sum + (i.vat_amount || 0), 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

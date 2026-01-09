'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Check,
  X,
  Download,
  Save,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Sparkles,
  Eye,
  FilePlus,
  Search,
  Database,
} from 'lucide-react';
import UploadToECUSButton from '@/components/fms/UploadToECUSButton';
import HSCodeLookup, { useHSCodeLookup } from '@/components/fms/HSCodeLookup';
import { PartnerSuggestionField } from '@/components/fms/PartnerSuggestionField';
import { CorrectionIndicator } from '@/components/fms/CorrectionIndicator';
import { AuditTrailPanel } from '@/components/fms/AuditTrailPanel';
import { History, Edit2 } from 'lucide-react';

// ============================================================
// INTERFACES
// ============================================================

interface ParsedItem {
  item_no: number;
  product_code: string | null;      // Customer PN / DELL PN / Mã quản lý riêng
  supplier_code: string | null;     // Supplier PN / Model
  product_name: string | null;      // Description of Goods / Mô tả hàng hóa
  hs_code: string | null;           // Mã số hàng hóa
  hs_description: string | null;    // Mô tả chi tiết theo HS
  quantity: number;                 // Số lượng (1)
  unit: string | null;              // ĐVT (1)
  quantity_2: number;               // Số lượng (2) - secondary quantity
  unit_2: string | null;            // ĐVT (2) - secondary unit
  unit_price: number;               // Đơn giá hóa đơn
  total_value: number;              // Trị giá hóa đơn dòng
  gross_weight: number;
  net_weight: number;
  country_of_origin: string | null; // Nước xuất xứ (mã 2 ký tự)
  // Thuế
  customs_value: number;            // Trị giá tính thuế (VND)
  import_duty_rate: number;         // Thuế suất NK (%)
  import_duty_amount: number;       // Tiền thuế NK
  vat_rate: number;                 // Thuế suất VAT (%)
  vat_amount: number;               // Tiền thuế VAT
  special_consumption_rate: number; // Thuế suất TTĐB (%)
  special_consumption_amount: number; // Tiền thuế TTĐB
  // Miễn/giảm thuế
  exemption_code: string | null;    // Mã miễn/giảm thuế (XNK32, VK130, etc.)
  exemption_name: string | null;    // Tên loại miễn/giảm
  exemption_amount: number;         // Số tiền miễn giảm
  // Phân loại
  classification_code: string | null; // Mã phân loại tài xác nhận giá
  beyond_quota_code: string | null;   // Mã ngoài hạn ngạch
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  documentType?: string;
  confidence?: number;
  itemCount?: number;
}

// Track field source info (which document provided the data)
interface FieldSource {
  documentType: string;  // INVOICE, BILL_OF_LADING, etc.
  fileName: string;
  confidence: number;    // 0-1
  sourceContent?: string;  // Original text/content from PDF that was extracted
  sourceTable?: string[][];  // Table data if extracted from a table
}

// HSCode from database
interface HSCodeOption {
  code: string;
  description: string;
  description_vi?: string;
  product_code?: string;
  tax_rate?: number;
  import_duty_rate?: number;
  vat_rate?: number;
}

// Partner match result from AI training system
interface PartnerMatchResult {
  partner_id: string | null;
  confidence: number;
  match_type: string;
  should_auto_select: boolean;
  alternatives: Array<{
    id: string;
    name: string;
    address: string;
  }>;
}

interface AIParseResult {
  success: boolean;
  error?: string;
  confidence: number;
  provider_used?: string | null;  // gemini, claude, openai
  latency_ms?: number;
  session_id?: string | null;  // AI Training session ID for audit trail
  rules_applied?: string[];  // List of rule IDs that were applied
  document_type: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  bl_no: string | null;
  bl_date: string | null;
  exporter_name: string | null;
  exporter_address: string | null;
  exporter_country: string | null;
  importer_name: string | null;
  importer_address: string | null;
  importer_tax_code: string | null;
  vessel_name: string | null;
  voyage_no: string | null;
  flight_no: string | null;
  loading_port: string | null;
  loading_port_name: string | null;
  discharge_port: string | null;
  discharge_port_name: string | null;
  eta: string | null;
  total_packages: number;
  package_unit: string | null;
  gross_weight: number;
  net_weight: number;
  volume_cbm: number;
  container_numbers: string | null;
  container_count: number;
  currency: string;
  total_value: number;
  incoterms: string | null;
  exchange_rate?: number;
  items: ParsedItem[];
  source_documents?: string[];
  // Partner matching results from AI training system
  exporter_match?: PartnerMatchResult | null;
  importer_match?: PartnerMatchResult | null;
}

interface CustomsFormData {
  // === HEADER - Thông tin chung ===
  declaration_no: string;           // Số tờ khai
  first_declaration_no: string;     // Số tờ khai đầu tiên (tờ khai tạm nhập tái xuất tương ứng)
  declaration_type: string;         // Mã loại hình (C11, C12, etc.)
  classification_code: string;      // Mã phân loại kiểm tra (1, 2, 3...)
  customs_office_code: string;      // Mã cơ quan HQ tiếp nhận (HQHANAM, 03CES14)
  customs_office_name: string;      // Tên cơ quan HQ
  registration_date: string;        // Ngày đăng ký
  amendment_date: string;           // Ngày thay đổi đăng ký
  processing_unit_code: string;     // Mã bộ phận xử lý tờ khai
  representative_hs_code: string;   // Mã số hàng hóa đại diện (8524, 8517...)
  reimport_deadline: string;        // Thời hạn tái nhập/tái xuất

  // === NGƯỜI NHẬP KHẨU ===
  importer_code: string;            // Mã người NK
  importer_tax_code: string;        // Mã số thuế
  importer_name: string;            // Tên
  importer_address: string;         // Địa chỉ
  importer_phone: string;           // Số điện thoại
  importer_postal_code: string;     // Mã bưu chính

  // === NGƯỜI ỦY THÁC NHẬP KHẨU ===
  consignee_code: string;           // Mã người ủy thác NK
  consignee_name: string;           // Tên

  // === NGƯỜI XUẤT KHẨU ===
  exporter_code: string;            // Mã người XK
  exporter_name: string;            // Tên
  exporter_address: string;         // Địa chỉ
  exporter_country: string;         // Mã nước (HK, CN, TW, US...)
  exporter_consignee_code: string;  // Mã người ủy thác XK
  exporter_consignee_name: string;  // Tên

  // === ĐẠI LÝ HẢI QUAN ===
  customs_agent_code: string;       // Mã đại lý HQ
  customs_agent_name: string;       // Tên đại lý HQ
  customs_agent_employee_code: string; // Mã nhân viên HQ

  // === ĐỊA ĐIỂM ===
  warehouse_code: string;           // Địa điểm lưu kho (15BBCQ1)
  warehouse_name: string;           // Tên (CTY XUAN CUONG)
  unloading_location_code: string;  // Địa điểm dỡ hàng (VNHUGT)
  unloading_location_name: string;  // Tên (CUA KHAU HUU NGHI LANG)
  loading_location_code: string;    // Địa điểm xếp hàng (CNSZV)
  loading_location_name: string;    // Tên (SUZHOU)
  border_gate: string;              // Cửa khẩu
  border_gate_name: string;         // Tên cửa khẩu

  // === VẬN ĐƠN ===
  bl_no: string;                    // Số vận đơn (MBL/HBL/AWB)
  bl_date: string;                  // Ngày B/L
  manifest_no: string;              // Số đính kèm khai báo điện tử

  // === VẬN CHUYỂN ===
  transport_mode: string;           // Phương thức vận chuyển (1-Biển, 3-Bộ, 4-Hàng không)
  vessel_name: string;              // Tên tàu/Số hiệu phương tiện (XE TAI/E9U115)
  voyage_no: string;                // Số chuyến
  loading_port: string;             // Cảng xếp hàng (mã)
  loading_port_name: string;        // Cảng xếp hàng (tên)
  discharge_port: string;           // Cảng dỡ hàng (mã)
  discharge_port_name: string;      // Cảng dỡ hàng (tên)
  arrival_date: string;             // Ngày hàng đến

  // === HÀNG HÓA ===
  total_packages: number;           // Số kiện
  package_unit: string;             // ĐVT kiện (PP, CT, PK...)
  package_marks: string;            // Ký hiệu và số hiệu bao bì
  gross_weight: number;             // Tổng trọng lượng (KG)
  weight_unit: string;              // ĐVT trọng lượng (KGM)
  container_numbers: string;        // Số container (CMAU...)
  inspection_result_code: string;   // Mã kết quả kiểm tra nội dung (1, 2, 3)
  container_count: number;          // Số container

  // === HÓA ĐƠN & GIÁ TRỊ ===
  invoice_no: string;               // Số hóa đơn (A - MH-B193-25120147)
  invoice_date: string;             // Ngày phát hành
  payment_method: string;           // Phương thức thanh toán (KHONGTT, TT, LC...)
  contract_no: string;              // Số hợp đồng
  currency_code: string;            // Loại tiền (USD, EUR, VND...)
  exchange_rate: number;            // Tỷ giá
  incoterms: string;                // Điều kiện giao hàng (DAP, FOB, CIF...)
  total_invoice_value: number;      // Tổng trị giá hóa đơn (ngoại tệ)
  total_customs_value: number;      // Tổng trị giá tính thuế (VND)
  total_allocation_ratio: number;   // Tổng hệ số phân bổ trị giá

  // Legacy fields (kept for compatibility)
  total_value: number;
  customs_value: number;

  // === KHAI TRỊ GIÁ ===
  valuation_method: string;         // Mã phân loại khai trị giá
  valuation_adjustment: number;     // Khoản điều chỉnh
  inspection_result: string;        // Mã kết quả kiểm tra nội dung
  valuation_detail: string;         // Chi tiết khai trị giá (text dài)

  // === THUẾ ===
  total_import_duty: number;        // Tổng thuế NK
  total_vat: number;                // Tổng thuế VAT
  total_special_consumption_tax: number; // Tổng thuế TTĐB
  total_tax: number;                // Tổng tất cả thuế

  // === PHÍ ===
  freight_value: number;            // Phi vận chuyển
  freight_currency: string;         // Đồng tiền phí vận chuyển
  insurance_value: number;          // Phi bảo hiểm
  insurance_currency: string;       // Đồng tiền phí bảo hiểm

  // === GIẤY PHÉP ===
  license_1: string;                // Giấy phép nhập khẩu 1
  license_2: string;                // Giấy phép nhập khẩu 2
  license_3: string;                // Giấy phép nhập khẩu 3
  license_4: string;                // Giấy phép nhập khẩu 4
  license_5: string;                // Giấy phép nhập khẩu 5

  // === GHI CHÚ ===
  remarks: string;                  // Phần ghi chú (HD RNQ số: 03J/2022/VNP-HONGBO-SK...)
  internal_management_code: string; // Số quản lý của nội bộ doanh nghiệp
  user_management_code: string;     // Số quản lý người sử dụng (00048)

  // === CHỈ THỊ HẢI QUAN ===
  customs_instructions: {
    date: string;
    name: string;
    content: string;
  }[];

  // === ITEMS ===
  items: ParsedItem[];
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

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

const CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY', 'VND', 'TWD', 'KRW', 'SGD', 'THB'];

const PAYMENT_METHODS = [
  { value: '', label: '- Chọn -' },
  { value: 'KHONGTT', label: 'KHONGTT - Không thanh toán' },
  { value: 'TT', label: 'TT - Điện chuyển tiền' },
  { value: 'LC', label: 'LC - Thư tín dụng' },
  { value: 'DA', label: 'DA - Nhờ thu chấp nhận' },
  { value: 'DP', label: 'DP - Nhờ thu trả ngay' },
  { value: 'CAD', label: 'CAD - Trả tiền khi giao chứng từ' },
  { value: 'OA', label: 'OA - Ghi sổ' },
];

const CLASSIFICATION_CODES = [
  { value: '1', label: '1 - Luồng xanh' },
  { value: '2', label: '2 - Luồng vàng' },
  { value: '3', label: '3 - Luồng đỏ' },
];

// Mã miễn/giảm thuế nhập khẩu phổ biến
const EXEMPTION_CODES = [
  { value: '', label: '- Không miễn giảm -' },
  { value: 'XNK32', label: 'XNK32 - Hàng NK từ nước ngoài vào khu PTQ' },
  { value: 'XNK01', label: 'XNK01 - Hàng gia công XK' },
  { value: 'XNK02', label: 'XNK02 - Hàng SXXK' },
  { value: 'XNK03', label: 'XNK03 - Hàng tạm nhập tái xuất' },
  { value: 'XNK04', label: 'XNK04 - Hàng NK cho DNCX' },
  { value: 'XNK05', label: 'XNK05 - Hàng NK theo điều ước quốc tế' },
  { value: 'XNK06', label: 'XNK06 - Hàng viện trợ' },
  { value: 'XNK07', label: 'XNK07 - Hàng tạm nhập' },
  { value: 'XNK08', label: 'XNK08 - Hàng mẫu' },
  { value: 'XNK09', label: 'XNK09 - Hàng NK cho dự án ưu đãi' },
  { value: 'XNK10', label: 'XNK10 - Máy móc thiết bị tạo TSCĐ' },
];

// Mã miễn/giảm thuế VAT phổ biến
const VAT_EXEMPTION_CODES = [
  { value: '', label: '- Không miễn giảm -' },
  { value: 'VK130', label: 'VK130 - Hàng mua bán giữa nước ngoài với khu PTQ' },
  { value: 'VK101', label: 'VK101 - Máy móc thiết bị chuyên dùng cho SXNN' },
  { value: 'VK102', label: 'VK102 - Thiết bị y tế' },
  { value: 'VK103', label: 'VK103 - Thiết bị giáo dục' },
  { value: 'VK104', label: 'VK104 - Hàng NK cho DNCX' },
];

// Detect transport mode based on parsed document data
function detectTransportMode(result: AIParseResult): string {
  // Check for flight indicators
  if (result.flight_no) return '4'; // Air

  // Check vessel name patterns for air vs sea
  const vessel = (result.vessel_name || '').toUpperCase();
  const bl = (result.bl_no || '').toUpperCase();

  // Air indicators: AWB, MAWB, flight numbers like VN123, CX789
  if (bl.includes('AWB') || bl.includes('MAWB') || /^[A-Z]{2}\d{3,4}/.test(bl)) {
    return '4'; // Air
  }

  // Sea indicators: Container numbers, vessel names, MBL/HBL
  if (bl.includes('MBL') || bl.includes('HBL') || bl.includes('BL') ||
      vessel.includes('VESSEL') || /^[A-Z]{4}\d{7}/.test(result.container_numbers || '')) {
    return '1'; // Sea
  }

  // Truck indicators (for cross-border)
  if (vessel.includes('TRUCK') || vessel.includes('CONTAINER') && !result.container_numbers) {
    return '3'; // Road
  }

  // Default: keep empty to let user select
  return '';
}

const PACKAGE_UNITS = [
  { value: 'PP', label: 'PP - Pallet' },
  { value: 'CT', label: 'CT - Carton' },
  { value: 'PK', label: 'PK - Package' },
  { value: 'BG', label: 'BG - Bag' },
  { value: 'DR', label: 'DR - Drum' },
];

const UNITS = [
  { value: 'PCE', label: 'PCE - Cái' },
  { value: 'SET', label: 'SET - Bộ' },
  { value: 'KGM', label: 'KGM - Kg' },
  { value: 'MTR', label: 'MTR - Mét' },
  { value: 'LTR', label: 'LTR - Lít' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomsImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiProviderUsed, setAiProviderUsed] = useState<string | null>(null);
  const [createdDeclarationId, setCreatedDeclarationId] = useState<string | null>(null);

  // AI Training System state
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiParseResult, setAiParseResult] = useState<AIParseResult | null>(null);
  const [corrections, setCorrections] = useState<Record<string, { original: string; current: string }>>({});
  const [selectedExporterId, setSelectedExporterId] = useState<string | null>(null);
  const [selectedImporterId, setSelectedImporterId] = useState<string | null>(null);

  // Track which document provided each field
  const [fieldSources, setFieldSources] = useState<Record<string, FieldSource>>({});

  const [formData, setFormData] = useState<CustomsFormData>({
    // Header
    declaration_no: '',
    first_declaration_no: '',
    declaration_type: 'C11',
    classification_code: '1',
    customs_office_code: '',
    customs_office_name: '',
    registration_date: new Date().toISOString().split('T')[0],
    amendment_date: '',
    processing_unit_code: '',
    representative_hs_code: '',
    reimport_deadline: '',
    // Người nhập khẩu
    importer_code: '',
    importer_tax_code: '',
    importer_name: '',
    importer_address: '',
    importer_phone: '',
    importer_postal_code: '',
    // Người ủy thác NK
    consignee_code: '',
    consignee_name: '',
    // Người xuất khẩu
    exporter_code: '',
    exporter_name: '',
    exporter_address: '',
    exporter_country: '',
    exporter_consignee_code: '',
    exporter_consignee_name: '',
    // Đại lý HQ
    customs_agent_code: '',
    customs_agent_name: '',
    customs_agent_employee_code: '',
    // Địa điểm
    warehouse_code: '',
    warehouse_name: '',
    unloading_location_code: '',
    unloading_location_name: '',
    loading_location_code: '',
    loading_location_name: '',
    border_gate: '',
    border_gate_name: '',
    // Vận đơn
    bl_no: '',
    bl_date: '',
    manifest_no: '',
    // Vận chuyển
    transport_mode: '1',
    vessel_name: '',
    voyage_no: '',
    loading_port: '',
    loading_port_name: '',
    discharge_port: '',
    discharge_port_name: '',
    arrival_date: '',
    // Hàng hóa
    total_packages: 0,
    package_unit: 'PP',
    package_marks: '',
    gross_weight: 0,
    weight_unit: 'KGM',
    container_numbers: '',
    container_count: 0,
    inspection_result_code: '',
    // Hóa đơn & Giá trị
    invoice_no: '',
    invoice_date: '',
    payment_method: '',
    contract_no: '',
    currency_code: 'USD',
    exchange_rate: 0,
    incoterms: 'DAP',
    total_invoice_value: 0,
    total_customs_value: 0,
    total_allocation_ratio: 0,
    total_value: 0,
    customs_value: 0,
    // Khai trị giá
    valuation_method: '',
    valuation_adjustment: 0,
    inspection_result: '',
    valuation_detail: '',
    // Thuế
    total_import_duty: 0,
    total_vat: 0,
    total_special_consumption_tax: 0,
    total_tax: 0,
    // Phí
    freight_value: 0,
    freight_currency: 'USD',
    insurance_value: 0,
    insurance_currency: 'USD',
    // Giấy phép
    license_1: '',
    license_2: '',
    license_3: '',
    license_4: '',
    license_5: '',
    // Ghi chú
    remarks: '',
    internal_management_code: '',
    user_management_code: '',
    // Chỉ thị HQ
    customs_instructions: [],
    // Items
    items: [],
  });

  // ============================================================
  // FILE UPLOAD HANDLERS
  // ============================================================

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setParseError(null);

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        continue;
      }

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      try {
        const response = await fetch('/api/v1/fms/customs/documents/upload', {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: formDataUpload,
        });

        if (response.ok) {
          const data = await response.json();
          newFiles.push({
            id: data.file_id,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);
  }, []);

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ============================================================
  // AI PARSING
  // ============================================================

  const handleAIParse = async () => {
    if (uploadedFiles.length === 0) return;

    setIsParsing(true);
    setParseError(null);

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    try {
      // First check AI status from database config
      const statusResponse = await fetch('/api/v1/fms/customs/documents/ai-status', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('AI Status:', status);
        if (!status.any_configured && !status.gemini_configured && !status.claude_configured && !status.openai_configured) {
          throw new Error('Chưa cấu hình AI API key. Vui lòng vào Admin > AI Settings để cấu hình API key cho ít nhất một AI provider.');
        }
      }

      // Use AI batch parsing endpoint
      const formDataParse = new FormData();
      uploadedFiles.forEach((file) => {
        formDataParse.append('file_ids', file.id);
      });

      // Call backend directly to avoid Next.js proxy timeout (AI parsing can take 60+ seconds)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/fms/customs/documents/parse-ai-batch`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formDataParse,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Parse API error:', response.status, errorData);
        throw new Error(`Failed to parse documents: ${errorMsg}`);
      }

      const result: AIParseResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'AI parsing failed');
      }

      // Store which AI provider was used
      setAiProviderUsed(result.provider_used || null);

      // Store AI Training session info
      setAiSessionId(result.session_id || null);
      setAiParseResult(result);

      // Auto-select partners if high confidence match
      if (result.exporter_match?.should_auto_select && result.exporter_match.partner_id) {
        setSelectedExporterId(result.exporter_match.partner_id);
      }
      if (result.importer_match?.should_auto_select && result.importer_match.partner_id) {
        setSelectedImporterId(result.importer_match.partner_id);
      }

      // Build field sources from source_documents with source content
      const sourceDocs = result.source_documents || [];
      const newFieldSources: Record<string, FieldSource> = {};

      // Map document types to fields they typically provide
      const docFieldMap: Record<string, string[]> = {
        'INVOICE': ['invoice_no', 'invoice_date', 'exporter_name', 'exporter_address', 'total_value', 'currency_code', 'incoterms', 'items'],
        'BILL_OF_LADING': ['bl_no', 'bl_date', 'vessel_name', 'voyage_no', 'loading_port', 'loading_port_name', 'discharge_port', 'discharge_port_name', 'gross_weight', 'container_numbers'],
        'ARRIVAL_NOTICE': ['vessel_name', 'eta', 'discharge_port', 'total_packages', 'gross_weight'],
        'PACKING_LIST': ['total_packages', 'gross_weight', 'net_weight', 'items'],
      };

      // Helper to create source content text for specific fields
      const createSourceContent = (field: string, docType: string): string | undefined => {
        switch (field) {
          case 'invoice_no':
            return result.invoice_no ? `Invoice No.: ${result.invoice_no}\nDate: ${result.invoice_date || 'N/A'}` : undefined;
          case 'bl_no':
            return result.bl_no ? `B/L No.: ${result.bl_no}\nDate: ${result.bl_date || 'N/A'}` : undefined;
          case 'exporter_name':
            return result.exporter_name ? `Exporter/Shipper:\n${result.exporter_name}\n${result.exporter_address || ''}` : undefined;
          case 'importer_name':
            return result.importer_name ? `Consignee/Buyer:\n${result.importer_name}\n${result.importer_address || ''}` : undefined;
          case 'vessel_name':
            return result.vessel_name ? `Vessel: ${result.vessel_name}\nVoyage: ${result.voyage_no || 'N/A'}` : undefined;
          case 'loading_port':
          case 'loading_port_name':
            return result.loading_port_name ? `Port of Loading:\n${result.loading_port_name} (${result.loading_port || ''})` : undefined;
          case 'discharge_port':
          case 'discharge_port_name':
            return result.discharge_port_name ? `Port of Discharge:\n${result.discharge_port_name} (${result.discharge_port || ''})` : undefined;
          case 'gross_weight':
            return `Gross Weight: ${result.gross_weight?.toLocaleString() || 0} KG`;
          case 'total_packages':
            return `Total Packages: ${result.total_packages || 0} ${result.package_unit || 'PKG'}`;
          case 'total_value':
            return `Total Value: ${result.total_value?.toLocaleString() || 0} ${result.currency || 'USD'}`;
          case 'incoterms':
            return result.incoterms ? `Delivery Terms: ${result.incoterms}` : undefined;
          case 'container_numbers':
            return result.container_numbers ? `Container(s): ${result.container_numbers}\nCount: ${result.container_count || 1}` : undefined;
          default:
            return undefined;
        }
      };

      // Helper to create items table for source display
      const createItemsTable = (): string[][] | undefined => {
        if (!result.items || result.items.length === 0) return undefined;
        // Header row
        const rows: string[][] = [
          ['#', 'Description', 'PN', 'Qty', 'Unit Price', 'Amount']
        ];
        // Data rows (max 5 items to fit in tooltip)
        result.items.slice(0, 5).forEach((item, idx) => {
          rows.push([
            String(item.item_no || idx + 1),
            (item.product_name || '').substring(0, 25) + ((item.product_name || '').length > 25 ? '...' : ''),
            item.product_code || item.supplier_code || '-',
            String(item.quantity || 0),
            String(item.unit_price || 0),
            String(item.total_value || 0),
          ]);
        });
        if (result.items.length > 5) {
          rows.push(['...', `+${result.items.length - 5} more items`, '', '', '', '']);
        }
        return rows;
      };

      // Set sources based on document types found
      sourceDocs.forEach((docType, idx) => {
        const file = uploadedFiles[idx];
        const fields = docFieldMap[docType] || [];
        fields.forEach(field => {
          const baseSource: FieldSource = {
            documentType: docType,
            fileName: file?.name || 'Unknown',
            confidence: result.confidence || 0.8,
          };

          // Add source content or table for specific fields
          if (field === 'items') {
            baseSource.sourceTable = createItemsTable();
          } else {
            baseSource.sourceContent = createSourceContent(field, docType);
          }

          newFieldSources[field] = baseSource;
        });
      });

      setFieldSources(newFieldSources);

      // Map AI result to form data
      setFormData((prev) => ({
        ...prev,
        // Exporter
        exporter_name: result.exporter_name || prev.exporter_name,
        exporter_address: result.exporter_address || prev.exporter_address,
        exporter_country: result.exporter_country || prev.exporter_country,
        // Importer
        importer_name: result.importer_name || prev.importer_name,
        importer_address: result.importer_address || prev.importer_address,
        importer_tax_code: result.importer_tax_code || prev.importer_tax_code,
        // Documents
        invoice_no: result.invoice_no || prev.invoice_no,
        invoice_date: result.invoice_date || prev.invoice_date,
        bl_no: result.bl_no || prev.bl_no,
        bl_date: result.bl_date || prev.bl_date,
        // Transport
        vessel_name: result.vessel_name || prev.vessel_name,
        voyage_no: result.voyage_no || prev.voyage_no,
        loading_port: result.loading_port || prev.loading_port,
        loading_port_name: result.loading_port_name || prev.loading_port_name,
        discharge_port: result.discharge_port || prev.discharge_port,
        discharge_port_name: result.discharge_port_name || prev.discharge_port_name,
        arrival_date: result.eta || prev.arrival_date,
        // Detect transport mode based on vessel/flight info
        transport_mode: detectTransportMode(result),
        // Cargo
        total_packages: result.total_packages || prev.total_packages,
        package_unit: result.package_unit || prev.package_unit,
        gross_weight: result.gross_weight || prev.gross_weight,
        container_numbers: result.container_numbers || prev.container_numbers,
        container_count: result.container_count || prev.container_count,
        // Values
        currency_code: result.currency || prev.currency_code,
        total_value: result.total_value || prev.total_value,
        customs_value: 0, // Để trống vì đây là tờ khai nháp
        incoterms: result.incoterms || prev.incoterms,
        exchange_rate: 0, // Để trống vì đây là tờ khai nháp
        // Items
        items: result.items.length > 0 ? result.items : prev.items,
        // Representative HS code (first item)
        representative_hs_code: result.items[0]?.hs_code?.substring(0, 4) || prev.representative_hs_code,
      }));

      // Update file info with parsed data
      setUploadedFiles((prev) =>
        prev.map((f, idx) => ({
          ...f,
          documentType: result.source_documents?.[idx] || 'UNKNOWN',
          confidence: result.confidence,
          itemCount: result.items.length,
        }))
      );

      // Auto lookup HS codes for items that have product_code but no hs_code
      if (result.items.length > 0) {
        autoLookupHSCodes(result.items);
      }

      setStep(2);
    } catch (error) {
      console.error('Parse error:', error);
      setParseError(error instanceof Error ? error.message : 'Parsing failed');
    } finally {
      setIsParsing(false);
    }
  };

  // Auto lookup HS codes after parsing - runs in background
  const autoLookupHSCodes = async (items: ParsedItem[]) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Skip if already has hs_code or no product_code
      if (item.hs_code || !item.product_code) continue;

      try {
        const response = await fetch(
          `/api/v1/fms/master-data/hs-code-catalog/lookup?product_code=${encodeURIComponent(item.product_code)}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.hs_code) {
            // Update the item in formData
            setFormData((prev) => ({
              ...prev,
              items: prev.items.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      hs_code: data.hs_code,
                      product_name: data.product_name || it.product_name,
                      import_duty_rate: data.import_duty_rate ?? it.import_duty_rate,
                      vat_rate: data.vat_rate ?? it.vat_rate,
                    }
                  : it
              ),
              // Update representative HS code if first item
              representative_hs_code: i === 0 ? data.hs_code.substring(0, 4) : prev.representative_hs_code,
            }));
          }
        }
      } catch (e) {
        console.error('Auto lookup error for', item.product_code, e);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  // ============================================================
  // AI TRAINING - CORRECTION TRACKING
  // ============================================================

  // Track a correction when user edits a field
  const trackCorrection = useCallback((
    fieldCategory: string,
    fieldName: string,
    originalValue: string | number | null,
    newValue: string | number | null,
    itemIndex?: number
  ) => {
    if (!aiSessionId) return; // No session, no tracking

    const key = itemIndex !== undefined ? `${fieldName}_${itemIndex}` : fieldName;
    const origStr = String(originalValue ?? '');
    const newStr = String(newValue ?? '');

    // Only track if value actually changed from AI original
    if (origStr !== newStr) {
      setCorrections(prev => ({
        ...prev,
        [key]: {
          original: origStr,
          current: newStr,
        }
      }));
    }
  }, [aiSessionId]);

  // Save all corrections to backend
  const saveCorrections = useCallback(async () => {
    if (!aiSessionId || Object.keys(corrections).length === 0) return;

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    try {
      // Convert corrections to API format
      const correctionItems = Object.entries(corrections).map(([key, value]) => {
        // Parse key to extract field name and item index
        const match = key.match(/^(.+)_(\d+)$/);
        const fieldName = match ? match[1] : key;
        const itemIndex = match ? parseInt(match[2]) : undefined;

        // Determine field category based on field name
        let fieldCategory = 'header';
        if (fieldName.startsWith('exporter_')) fieldCategory = 'exporter';
        else if (fieldName.startsWith('importer_')) fieldCategory = 'importer';
        else if (['vessel_name', 'voyage_no', 'loading_port', 'discharge_port', 'bl_no'].includes(fieldName)) fieldCategory = 'transport';
        else if (itemIndex !== undefined) fieldCategory = 'item';

        return {
          field_category: fieldCategory,
          field_name: fieldName,
          item_index: itemIndex,
          original_value: value.original,
          corrected_value: value.current,
          correction_type: 'MANUAL_EDIT',
        };
      });

      // Send batch corrections
      const response = await fetch(`/api/v1/fms/ai-training/sessions/${aiSessionId}/corrections/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ corrections: correctionItems }),
      });

      if (!response.ok) {
        console.error('Failed to save corrections:', await response.text());
      } else {
        console.log(`Saved ${correctionItems.length} corrections to session ${aiSessionId}`);
      }
    } catch (error) {
      console.error('Error saving corrections:', error);
    }
  }, [aiSessionId, corrections]);

  // Approve session and trigger rule learning
  const approveSessionAndLearn = useCallback(async (declarationId: string) => {
    if (!aiSessionId) return;

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    try {
      // First save any pending corrections
      await saveCorrections();

      // Then approve the session
      const response = await fetch(`/api/v1/fms/ai-training/sessions/${aiSessionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          declaration_id: declarationId,
          trigger_learning: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Session approved, rules learned:', result.rules_generated);
      } else {
        console.error('Failed to approve session:', await response.text());
      }
    } catch (error) {
      console.error('Error approving session:', error);
    }
  }, [aiSessionId, saveCorrections]);

  // ============================================================
  // FORM HANDLERS
  // ============================================================

  // Get original value from AI parse result for tracking
  // Get original item field value from AI parse result
  const getOriginalItemValue = useCallback((itemIndex: number, field: string): string | number | null => {
    if (!aiParseResult || !aiParseResult.items || itemIndex >= aiParseResult.items.length) {
      return null;
    }
    const originalItem = aiParseResult.items[itemIndex];
    if (!originalItem) return null;
    return (originalItem as Record<string, string | number | null>)[field] ?? null;
  }, [aiParseResult]);

  const getOriginalValue = useCallback((field: string): string | number | null => {
    if (!aiParseResult) return null;

    const fieldMap: Record<string, keyof AIParseResult> = {
      'invoice_no': 'invoice_no',
      'invoice_date': 'invoice_date',
      'bl_no': 'bl_no',
      'bl_date': 'bl_date',
      'exporter_name': 'exporter_name',
      'exporter_address': 'exporter_address',
      'exporter_country': 'exporter_country',
      'importer_name': 'importer_name',
      'importer_address': 'importer_address',
      'importer_tax_code': 'importer_tax_code',
      'vessel_name': 'vessel_name',
      'voyage_no': 'voyage_no',
      'loading_port': 'loading_port',
      'loading_port_name': 'loading_port_name',
      'discharge_port': 'discharge_port',
      'discharge_port_name': 'discharge_port_name',
      'total_packages': 'total_packages',
      'gross_weight': 'gross_weight',
      'container_numbers': 'container_numbers',
      'currency_code': 'currency',
      'incoterms': 'incoterms',
      'total_value': 'total_value',
    };

    const aiField = fieldMap[field];
    if (aiField && aiParseResult[aiField] !== undefined) {
      return aiParseResult[aiField] as string | number | null;
    }
    return null;
  }, [aiParseResult]);

  const updateFormField = (field: keyof CustomsFormData, value: string | number) => {
    // Track correction if we have AI session
    const originalValue = getOriginalValue(field as string);
    if (originalValue !== null) {
      const fieldCategory = field.startsWith('exporter_') ? 'exporter' :
                           field.startsWith('importer_') ? 'importer' :
                           ['vessel_name', 'voyage_no', 'loading_port', 'discharge_port', 'bl_no'].includes(field as string) ? 'transport' : 'header';
      trackCorrection(fieldCategory, field as string, originalValue, value);
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: string | number) => {
    // Track correction if we have AI session and original item data
    const originalValue = getOriginalItemValue(index, field as string);
    if (originalValue !== null && aiSessionId) {
      trackCorrection('item', field as string, originalValue, value, index);
    }

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Lookup HS code khi user nhập Mã QL riêng
  // State for lookup loading
  const [lookupLoading, setLookupLoading] = useState<Record<number, boolean>>({});

  const lookupHSCodeByProductCode = async (index: number, productCode: string) => {
    if (!productCode || productCode.length < 2) return;

    setLookupLoading((prev) => ({ ...prev, [index]: true }));
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    try {
      const response = await fetch(
        `/api/v1/fms/master-data/hs-code-catalog/lookup?product_code=${encodeURIComponent(productCode)}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`HS Lookup for "${productCode}":`, data);

        if (data && data.found && data.hs_code) {
          // Update item với HS code và tên hàng từ database
          setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) =>
              i === index
                ? {
                    ...item,
                    hs_code: data.hs_code,
                    product_name: data.product_name || item.product_name,
                    import_duty_rate: data.import_duty_rate ?? item.import_duty_rate,
                    vat_rate: data.vat_rate ?? item.vat_rate,
                  }
                : item
            ),
          }));
          console.log(`✓ HS Lookup success for ${productCode}: HS=${data.hs_code}`);
        } else {
          console.log(`✗ HS Lookup: No match found for product_code="${productCode}". Need to add to HS Code Catalog.`);
        }
      }
    } catch (e) {
      console.error('HS Lookup error for', productCode, e);
    } finally {
      setLookupLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const addItem = () => {
    const newItem: ParsedItem = {
      item_no: formData.items.length + 1,
      product_code: '',
      supplier_code: '',
      product_name: '',
      hs_code: '',
      hs_description: '',
      quantity: 0,
      unit: 'PCE',
      quantity_2: 0,
      unit_2: '',
      unit_price: 0,
      total_value: 0,
      gross_weight: 0,
      net_weight: 0,
      country_of_origin: '',
      customs_value: 0,
      import_duty_rate: 0,
      import_duty_amount: 0,
      vat_rate: 10,
      vat_amount: 0,
      special_consumption_rate: 0,
      special_consumption_amount: 0,
      exemption_code: '',
      exemption_name: '',
      exemption_amount: 0,
      classification_code: '',
      beyond_quota_code: '',
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        item_no: i + 1,
      })),
    }));
  };

  // ============================================================
  // SUBMIT HANDLER
  // ============================================================

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    try {
      // Create customs declaration with ALL fields
      const declarationResponse = await fetch('/api/v1/fms/customs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          // === THÔNG TIN TỜ KHAI ===
          declaration_type: formData.declaration_type.startsWith('C') ? 'IMPORT' : 'EXPORT',
          declaration_type_code: formData.declaration_type,
          first_declaration_no: formData.first_declaration_no || null,
          shipment_id: `SHIP-${Date.now()}`,

          // === CHI CỤC HẢI QUAN ===
          customs_office_code: formData.customs_office_code || null,
          customs_office_name: formData.customs_office_name || null,
          customs_channel: formData.classification_code || null,
          registration_date: formData.registration_date || null,
          representative_hs_code: formData.representative_hs_code || null,

          // === DOANH NGHIỆP NK ===
          importer_code: formData.importer_code || null,
          trader_name: formData.importer_name || null,
          trader_tax_code: formData.importer_tax_code || null,
          trader_address: formData.importer_address || null,
          trader_phone: formData.importer_phone || null,

          // === ĐẠI LÝ HẢI QUAN ===
          broker_code: formData.customs_agent_code || null,
          broker_name: formData.customs_agent_name || null,
          declarant_code: formData.customs_agent_employee_code || null,

          // === ĐỐI TÁC NƯỚC NGOÀI (Người XK) ===
          foreign_partner_name: formData.exporter_name || null,
          foreign_partner_address: formData.exporter_address || null,
          foreign_partner_country: formData.exporter_country || null,

          // === KHO / ĐỊA ĐIỂM ===
          warehouse_code: formData.warehouse_code || null,
          warehouse_name: formData.warehouse_name || null,
          unloading_place_code: formData.unloading_location_code || null,
          unloading_place: formData.unloading_location_name || null,
          border_gate: formData.border_gate || null,
          border_gate_name: formData.border_gate_name || null,

          // === HÓA ĐƠN ===
          invoice_no: formData.invoice_no || null,
          invoice_date: formData.invoice_date || null,
          contract_no: formData.contract_no || null,

          // === VẬN TẢI ===
          transport_mode: formData.transport_mode || null,
          bl_no: formData.bl_no || null,
          bl_date: formData.bl_date || null,
          vessel_name: formData.vessel_name || null,
          voyage_no: formData.voyage_no || null,
          loading_port: formData.loading_port || null,
          loading_port_name: formData.loading_port_name || null,
          discharge_port: formData.discharge_port || null,
          discharge_port_name: formData.discharge_port_name || null,
          eta_date: formData.arrival_date || null,

          // === HÀNG HÓA ===
          total_packages: formData.total_packages || 0,
          package_unit: formData.package_unit || null,
          gross_weight: formData.gross_weight || 0,
          net_weight: formData.gross_weight || 0, // Use gross as default for net
          container_count: formData.container_count || 0,
          container_numbers: formData.container_numbers || null,
          total_items: formData.items.length,

          // === TRỊ GIÁ ===
          currency_code: formData.currency_code || 'USD',
          exchange_rate: formData.exchange_rate || null,
          incoterms: formData.incoterms || null,
          payment_method: formData.payment_method || null,
          fob_value: formData.total_value || formData.total_invoice_value || 0,
          customs_value: formData.customs_value || formData.total_customs_value || 0,
          freight_value: formData.freight_value || 0,
          insurance_value: formData.insurance_value || 0,

          // === THUẾ ===
          import_duty: formData.total_import_duty || 0,
          vat: formData.total_vat || 0,
          special_consumption_tax: formData.total_special_consumption_tax || 0,
          total_tax: formData.total_tax || 0,

          // === GHI CHÚ ===
          notes: formData.remarks || null,
        }),
      });

      if (!declarationResponse.ok) {
        const errorData = await declarationResponse.json().catch(() => ({}));
        console.error('Declaration creation error:', declarationResponse.status, errorData);
        throw new Error(errorData.detail || `Failed to create declaration: ${declarationResponse.status}`);
      }

      const declaration = await declarationResponse.json();

      // Create HS code items with ALL fields
      console.log(`Creating ${formData.items.length} HS code items for declaration ${declaration.id}`);
      for (const item of formData.items) {
        const hsCodePayload = {
          declaration_id: declaration.id,
          item_no: item.item_no,
          hs_code: item.hs_code || '',
          product_code: item.product_code || null,
          supplier_code: item.supplier_code || null,
          product_name: item.product_name || null,
          hs_description: item.hs_description || null,
          quantity: item.quantity || 0,
          unit: item.unit || 'PCE',
          quantity_2: item.quantity_2 || 0,
          unit_2: item.unit_2 || null,
          unit_price: item.unit_price || 0,
          total_value: item.total_value || 0,
          gross_weight: item.gross_weight || 0,
          net_weight: item.net_weight || 0,
          country_of_origin: item.country_of_origin || null,
          customs_value: item.customs_value || 0,
          import_duty_rate: item.import_duty_rate || 0,
          import_duty_amount: item.import_duty_amount || 0,
          vat_rate: item.vat_rate || 0,
          vat_amount: item.vat_amount || 0,
          special_consumption_rate: item.special_consumption_rate || 0,
          special_consumption_amount: item.special_consumption_amount || 0,
          exemption_code: item.exemption_code || null,
          exemption_amount: item.exemption_amount || 0,
          currency_code: formData.currency_code || 'USD',
        };

        console.log(`Creating HS code item ${item.item_no}:`, hsCodePayload);

        const hsResponse = await fetch(`/api/v1/fms/customs/${declaration.id}/hs-codes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(hsCodePayload),
        });

        if (!hsResponse.ok) {
          const errorData = await hsResponse.json().catch(() => ({}));
          console.error(`Failed to create HS code item ${item.item_no}:`, hsResponse.status, errorData);
          throw new Error(`Failed to save HS code item ${item.item_no}: ${errorData.detail || hsResponse.status}`);
        }

        const savedHsCode = await hsResponse.json();
        console.log(`HS code item ${item.item_no} saved successfully:`, savedHsCode.id);
      }

      // Approve AI session and trigger rule learning (if we have an AI session)
      if (aiSessionId) {
        console.log(`Approving AI session ${aiSessionId} and triggering rule learning...`);
        try {
          await approveSessionAndLearn(declaration.id);
          console.log('AI session approved and rules learned successfully');
        } catch (approveError) {
          // Don't fail the whole submission if approval fails
          console.error('Failed to approve AI session:', approveError);
        }
      }

      // Save declaration ID for ECUS sync
      setCreatedDeclarationId(declaration.id);
      setStep(3);
    } catch (error) {
      console.error('Submit error:', error);
      setParseError(error instanceof Error ? error.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/fms/customs" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Tạo tờ khai hải quan từ chứng từ</h1>
              <p className="text-sm text-gray-500">
                Tải lên Invoice, Packing List, B/L để tự động điền thông tin tờ khai
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-4 mt-6">
          <StepIndicator step={1} currentStep={step} label="Tải chứng từ" />
          <div className="flex-1 h-1 bg-gray-200 rounded">
            <div
              className={`h-full bg-blue-500 rounded transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}
            />
          </div>
          <StepIndicator step={2} currentStep={step} label="Kiểm tra & sửa" />
          <div className="flex-1 h-1 bg-gray-200 rounded">
            <div
              className={`h-full bg-blue-500 rounded transition-all ${step >= 3 ? 'w-full' : 'w-0'}`}
            />
          </div>
          <StepIndicator step={3} currentStep={step} label="Hoàn thành" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 1 && (
          <Step1Upload
            uploadedFiles={uploadedFiles}
            isUploading={isUploading}
            isParsing={isParsing}
            parseError={parseError}
            onFileUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            onAIParse={handleAIParse}
          />
        )}

        {step === 2 && (
          <Step2Review
            formData={formData}
            isSubmitting={isSubmitting}
            uploadedFiles={uploadedFiles}
            fieldSources={fieldSources}
            aiProviderUsed={aiProviderUsed}
            aiSessionId={aiSessionId}
            aiParseResult={aiParseResult}
            corrections={corrections}
            selectedExporterId={selectedExporterId}
            selectedImporterId={selectedImporterId}
            setSelectedExporterId={setSelectedExporterId}
            setSelectedImporterId={setSelectedImporterId}
            setCorrections={setCorrections}
            lookupLoading={lookupLoading}
            onUpdateField={updateFormField}
            onUpdateItem={updateItem}
            onLookupHS={lookupHSCodeByProductCode}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            onAddMoreFiles={(files) => handleFileUpload(files)}
            onReparse={handleAIParse}
            isParsing={isParsing}
          />
        )}

        {step === 3 && (
          <Step3Complete
            onViewDeclarations={() => router.push('/fms/customs')}
            declarationId={createdDeclarationId || undefined}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB COMPONENTS
// ============================================================

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const isActive = currentStep >= step;
  const isCurrent = currentStep === step;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isActive
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-500'
        } ${isCurrent ? 'ring-2 ring-blue-300' : ''}`}
      >
        {currentStep > step ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

// ============================================================
// STEP 1: UPLOAD
// ============================================================

function Step1Upload({
  uploadedFiles,
  isUploading,
  isParsing,
  parseError,
  onFileUpload,
  onRemoveFile,
  onAIParse,
}: {
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  isParsing: boolean;
  parseError: string | null;
  onFileUpload: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onAIParse: () => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <div
        className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Kéo thả file PDF vào đây
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Hỗ trợ: Invoice, Packing List, Bill of Lading, Arrival Notice
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer">
          <Upload className="w-4 h-4" />
          Chọn file
          <input
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => onFileUpload(e.target.files)}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Uploaded Files - Compact */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <h3 className="font-medium text-sm mb-2">Chứng từ đã tải ({uploadedFiles.length})</h3>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded border text-sm group"
              >
                <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="font-medium truncate max-w-[150px]" title={file.name}>{file.name}</span>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)}KB</span>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Lỗi phân tích</p>
            <p className="text-sm text-red-600">{parseError}</p>
          </div>
        </div>
      )}

      {/* Action Button */}
      {uploadedFiles.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={onAIParse}
            disabled={isParsing || isUploading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang phân tích với AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gộp dữ liệu với AI
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 2: REVIEW - VNACCS FORM LAYOUT
// ============================================================

// ============================================================
// SOURCE TOOLTIP COMPONENT
// ============================================================

function SourceTooltip({ source, hasValue = false }: { source: FieldSource | undefined; hasValue?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  // Hiển thị icon khi có source HOẶC có value
  if (!source && !hasValue) return null;

  const docTypeLabels: Record<string, string> = {
    'INVOICE': 'Hóa đơn thương mại',
    'BILL_OF_LADING': 'Vận đơn B/L',
    'ARRIVAL_NOTICE': 'Thông báo hàng đến',
    'PACKING_LIST': 'Phiếu đóng gói',
    'CUSTOMS_CONTAINER_LIST': 'Danh sách container',
    'UNKNOWN': 'Chưa xác định',
  };

  const docTypeColors: Record<string, string> = {
    'INVOICE': 'text-blue-600 bg-blue-50 border-blue-200',
    'BILL_OF_LADING': 'text-green-600 bg-green-50 border-green-200',
    'ARRIVAL_NOTICE': 'text-purple-600 bg-purple-50 border-purple-200',
    'PACKING_LIST': 'text-orange-600 bg-orange-50 border-orange-200',
    'CUSTOMS_CONTAINER_LIST': 'text-teal-600 bg-teal-50 border-teal-200',
  };

  // Determine popup width based on content
  const hasTable = source?.sourceTable && source.sourceTable.length > 0;
  const hasContent = source?.sourceContent;
  const popupWidth = hasTable ? 'w-[400px]' : hasContent ? 'w-72' : 'w-56';

  return (
    <div className="relative inline-block ml-1.5">
      <button
        type="button"
        className="text-blue-500 hover:text-blue-700 transition-colors p-0.5 rounded hover:bg-blue-50"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <Eye className="w-4 h-4" />
      </button>
      {isVisible && (
        <div className={`absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 ${popupWidth} bg-white border-2 border-gray-300 text-gray-800 text-sm rounded-lg shadow-2xl overflow-hidden`}>
          {/* Header with document type */}
          <div className={`px-3 py-2 border-b ${source ? docTypeColors[source.documentType] || 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            <div className="font-bold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {source ? (docTypeLabels[source.documentType] || source.documentType) : 'Nguồn dữ liệu'}
            </div>
            {source && (
              <div className="text-xs mt-0.5 opacity-80 truncate">
                📁 {source.fileName}
              </div>
            )}
          </div>

          {/* Content area - show source content or table */}
          <div className="p-3 max-h-64 overflow-auto">
            {source?.sourceTable && source.sourceTable.length > 0 ? (
              // Render table from PDF
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {source.sourceTable.map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx === 0 ? 'bg-gray-100 font-semibold' : rowIdx % 2 === 0 ? 'bg-gray-50' : ''}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-gray-300 px-2 py-1 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : source?.sourceContent ? (
              // Render text content from PDF
              <div className="bg-gray-50 border border-gray-200 rounded p-2 font-mono text-xs whitespace-pre-wrap">
                {source.sourceContent}
              </div>
            ) : source ? (
              // Fallback - show confidence
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Độ tin cậy:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${source.confidence >= 0.8 ? 'bg-green-500' : source.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${source.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className={`font-bold ${source.confidence >= 0.8 ? 'text-green-600' : source.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(source.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-xs">
                Dữ liệu được trích xuất từ chứng từ đã upload
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
            <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-gray-300 transform rotate-45 -translate-y-1.5"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FIELD WITH SOURCE INDICATOR
// ============================================================

function FieldWithSource({
  label,
  value,
  field,
  source,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  maxLength,
  rows,
  className = '',
}: {
  label: string;
  value: string | number;
  field: string;
  source?: FieldSource;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
}) {
  // Determine if field is empty (needs attention)
  const isEmpty = value === '' || value === 0 || value === null || value === undefined;
  // Determine if confidence is low
  const isLowConfidence = source && source.confidence < 0.7;
  // Check if field has value (to show eye icon)
  const hasValue = !isEmpty;

  // Highlight colors
  const getBorderClass = () => {
    if (isEmpty) return 'border-orange-300 bg-orange-50';
    if (isLowConfidence) return 'border-yellow-300 bg-yellow-50';
    return 'border-gray-300';
  };

  const inputClass = `w-full px-2 py-1 border rounded text-sm ${getBorderClass()} ${disabled ? 'bg-gray-50' : ''} ${className}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <label className="text-xs text-gray-500">{label}</label>
        <SourceTooltip source={source} hasValue={hasValue} />
        {isEmpty && <span className="ml-1 text-xs text-orange-500">(thiếu)</span>}
        {!isEmpty && isLowConfidence && <span className="ml-1 text-xs text-yellow-600">(chưa chắc)</span>}
      </div>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={inputClass}
        />
      )}
    </div>
  );
}

// ============================================================
// HSCODE AUTOCOMPLETE COMPONENT
// ============================================================

function HSCodeAutocomplete({
  value,
  onChange,
  onSelectHSCode,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectHSCode?: (option: HSCodeOption) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<HSCodeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchHSCodes = async (query: string) => {
    if (!query || query.length < 2) {
      setOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/fms/customs/hs-codes/search?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOptions(data || []);
      }
    } catch (error) {
      console.error('HSCode search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (opt: HSCodeOption) => {
    onChange(opt.code);
    if (onSelectHSCode) {
      onSelectHSCode(opt);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            searchHSCodes(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value && value.length >= 2) {
              searchHSCodes(value);
              setIsOpen(true);
            }
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="85249100"
          className={`w-full px-1 py-0.5 border rounded text-sm ${className}`}
        />
        {isLoading && <Loader2 className="absolute right-1 w-3 h-3 animate-spin text-gray-400" />}
      </div>
      {isOpen && options.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto min-w-[350px]">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full px-2 py-1.5 text-left text-xs hover:bg-blue-50 border-b last:border-b-0"
              onMouseDown={() => handleSelectOption(opt)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-blue-600 whitespace-nowrap">{opt.code}</span>
                {opt.import_duty_rate !== undefined && (
                  <span className="text-orange-500 whitespace-nowrap">NK: {opt.import_duty_rate}%</span>
                )}
                {opt.vat_rate !== undefined && (
                  <span className="text-green-500 whitespace-nowrap">VAT: {opt.vat_rate}%</span>
                )}
              </div>
              <div className="text-gray-600 mt-0.5 line-clamp-2">
                {opt.description_vi || opt.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 2: REVIEW - VNACCS FORM LAYOUT
// ============================================================

// Format number with thousand separators
function formatNumber(value: number, decimals: number = 2): string {
  if (value === 0 || value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Parse formatted number back to float
function parseFormattedNumber(value: string): number {
  if (!value) return 0;
  // Remove thousand separators (commas)
  const cleaned = value.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

function Step2Review({
  formData,
  isSubmitting,
  uploadedFiles,
  fieldSources,
  aiProviderUsed,
  aiSessionId,
  aiParseResult,
  corrections,
  selectedExporterId,
  selectedImporterId,
  setSelectedExporterId,
  setSelectedImporterId,
  setCorrections,
  lookupLoading,
  onUpdateField,
  onUpdateItem,
  onLookupHS,
  onAddItem,
  onRemoveItem,
  onBack,
  onSubmit,
  onAddMoreFiles,
  onReparse,
  isParsing,
}: {
  formData: CustomsFormData;
  isSubmitting: boolean;
  uploadedFiles: UploadedFile[];
  fieldSources: Record<string, FieldSource>;
  aiProviderUsed: string | null;
  aiSessionId: string | null;
  aiParseResult: AIParseResult | null;
  corrections: Record<string, { original: string; current: string }>;
  selectedExporterId: string | null;
  selectedImporterId: string | null;
  setSelectedExporterId: (id: string | null) => void;
  setSelectedImporterId: (id: string | null) => void;
  setCorrections: React.Dispatch<React.SetStateAction<Record<string, { original: string; current: string }>>>;
  lookupLoading: Record<number, boolean>;
  onUpdateField: (field: keyof CustomsFormData, value: string | number) => void;
  onUpdateItem: (index: number, field: keyof ParsedItem, value: string | number) => void;
  onLookupHS: (index: number, productCode: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  onAddMoreFiles: (files: FileList | null) => void;
  onReparse: () => void;
  isParsing: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab state - 3 tabs như VNACCS
  const [activeTab, setActiveTab] = useState<'thongtin1' | 'thongtin2' | 'danhsach'>('thongtin1');

  // Handler for HS Code selection - auto-fill product name in Vietnamese
  const handleHSCodeSelect = (idx: number, option: HSCodeOption) => {
    onUpdateItem(idx, 'hs_code', option.code);
    // Auto-fill Vietnamese product name
    if (option.description_vi) {
      onUpdateItem(idx, 'product_name', option.description_vi);
    } else if (option.description) {
      onUpdateItem(idx, 'product_name', option.description);
    }
  };

  const handleExportXML = async () => {
    setIsExporting(true);
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    try {
      const response = await fetch('/api/v1/fms/customs/preview-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          declaration_type: formData.declaration_type,
          classification_code: formData.classification_code,
          customs_office_code: formData.customs_office_code,
          customs_office_name: formData.customs_office_name,
          registration_date: formData.registration_date,
          importer_tax_code: formData.importer_tax_code,
          importer_name: formData.importer_name,
          importer_address: formData.importer_address,
          importer_phone: formData.importer_phone,
          exporter_name: formData.exporter_name,
          exporter_address: formData.exporter_address,
          exporter_country: formData.exporter_country,
          invoice_no: formData.invoice_no,
          invoice_date: formData.invoice_date,
          bl_no: formData.bl_no,
          bl_date: formData.bl_date,
          transport_mode: formData.transport_mode,
          vessel_name: formData.vessel_name,
          voyage_no: formData.voyage_no,
          loading_port: formData.loading_port,
          loading_port_name: formData.loading_port_name,
          discharge_port: formData.discharge_port,
          discharge_port_name: formData.discharge_port_name,
          arrival_date: formData.arrival_date,
          total_packages: formData.total_packages,
          package_unit: formData.package_unit,
          gross_weight: formData.gross_weight,
          container_numbers: formData.container_numbers,
          container_count: formData.container_count,
          currency_code: formData.currency_code,
          exchange_rate: formData.exchange_rate,
          total_value: formData.total_value,
          customs_value: formData.customs_value,
          incoterms: formData.incoterms,
          representative_hs_code: formData.representative_hs_code,
          border_gate: formData.border_gate,
          border_gate_name: formData.border_gate_name,
          items: formData.items.map((item) => ({
            item_no: item.item_no,
            hs_code: item.hs_code || '',
            product_code: item.product_code,
            supplier_code: item.supplier_code,
            product_name: item.product_name,
            quantity: item.quantity,
            unit: item.unit || 'PCE',
            unit_price: item.unit_price,
            total_value: item.total_value,
            gross_weight: item.gross_weight,
            net_weight: item.net_weight,
            country_of_origin: item.country_of_origin,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate XML');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customs_preview_${new Date().toISOString().slice(0, 10)}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Lỗi xuất XML: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle adding more files
  const handleAddMoreFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddMoreFiles(e.target.files);
    }
  };

  // Helper function to get AI provider display name and color
  const getProviderInfo = (provider: string | null) => {
    switch (provider) {
      case 'gemini':
        return { name: 'Gemini Flash', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'claude':
        return { name: 'Claude', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'openai':
        return { name: 'OpenAI GPT', color: 'bg-green-100 text-green-700 border-green-200' };
      default:
        return { name: 'AI', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const providerInfo = getProviderInfo(aiProviderUsed);

  return (
    <div className="space-y-6">
      {/* Source Documents Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium text-purple-800">Chứng từ nguồn ({uploadedFiles.length} file)</h3>
            {aiProviderUsed && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${providerInfo.color}`}>
                Parsed by {providerInfo.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 cursor-pointer">
              <FilePlus className="w-4 h-4" />
              Thêm File
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handleAddMoreFiles}
              />
            </label>
            <button
              onClick={onReparse}
              disabled={isParsing}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Phân tích lại
                </>
              )}
            </button>
            {aiSessionId && (
              <>
                {/* Corrections count badge */}
                {Object.keys(corrections).length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg">
                    <Edit2 className="w-4 h-4" />
                    <span>{Object.keys(corrections).length} chỉnh sửa</span>
                  </div>
                )}
                <AuditTrailPanel
                  sessionId={aiSessionId}
                  trigger={
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                      <History className="w-4 h-4" />
                      Lịch sử
                    </button>
                  }
                />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border text-sm"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span className="font-medium">{file.name}</span>
              {file.documentType && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  {file.documentType}
                </span>
              )}
              {file.confidence && (
                <span className={`text-xs ${file.confidence >= 0.8 ? 'text-green-600' : file.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {(file.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-purple-200 flex items-center gap-4 text-xs">
          <span className="text-gray-500">Chú thích:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-orange-300 bg-orange-50"></div>
            <span className="text-orange-600">Thiếu dữ liệu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-yellow-300 bg-yellow-50"></div>
            <span className="text-yellow-600">AI chưa chắc chắn</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">Xem nguồn dữ liệu</span>
          </div>
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
                      placeholder="Tự động tạo khi đăng ký"
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
                      onChange={(e) => onUpdateField('first_declaration_no', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                      placeholder="Tờ khai tạm nhập/tái xuất"
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
                    <label className="text-xs text-gray-500">Mã số HS đại diện:</label>
                    <input
                      type="text"
                      value={formData.representative_hs_code}
                      onChange={(e) => onUpdateField('representative_hs_code', e.target.value)}
                      placeholder="8517"
                      className="w-full rounded border px-2 py-1 text-sm"
                      maxLength={8}
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Mã loại hình: <span className="text-red-500">*</span></label>
                    <select
                      value={formData.declaration_type}
                      onChange={(e) => onUpdateField('declaration_type', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {DECLARATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Mã phân loại kiểm tra:</label>
                    <select
                      value={formData.classification_code}
                      onChange={(e) => onUpdateField('classification_code', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {CLASSIFICATION_CODES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Cơ quan HQ: <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.customs_office_code}
                      onChange={(e) => onUpdateField('customs_office_code', e.target.value)}
                      placeholder="28NJ"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">&nbsp;</label>
                    <input
                      type="text"
                      value={formData.customs_office_name}
                      onChange={(e) => onUpdateField('customs_office_name', e.target.value)}
                      placeholder="Hải quan Hà Nam"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Mã bộ phận xử lý:</label>
                    <input
                      type="text"
                      value={formData.processing_unit_code}
                      onChange={(e) => onUpdateField('processing_unit_code', e.target.value)}
                      placeholder="60"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Ngày đăng ký:</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_date}
                      onChange={(e) => onUpdateField('registration_date', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Phân loại cá nhân/tổ chức:</label>
                    <select className="w-full rounded border px-2 py-1 text-sm">
                      <option value="4">Hàng từ tổ chức đến tổ chức</option>
                      <option value="1">Cá nhân đến cá nhân</option>
                      <option value="2">Tổ chức đến cá nhân</option>
                      <option value="3">Cá nhân đến tổ chức</option>
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Thời hạn tái xuất:</label>
                    <input
                      type="date"
                      value={formData.reimport_deadline}
                      onChange={(e) => onUpdateField('reimport_deadline', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-500">Mã hiệu PTVC:</label>
                    <select
                      value={formData.transport_mode}
                      onChange={(e) => onUpdateField('transport_mode', e.target.value)}
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
                  <div className="mb-2 font-medium text-sm text-blue-600 flex items-center gap-2">
                    Người nhập khẩu
                    {aiParseResult?.importer_match && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        aiParseResult.importer_match.should_auto_select
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        Match: {Math.round(aiParseResult.importer_match.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <FieldWithSource
                        label="Mã"
                        value={formData.importer_code}
                        field="importer_code"
                        source={fieldSources['importer_code']}
                        onChange={(v) => onUpdateField('importer_code', v)}
                        placeholder="0102595740"
                      />
                    </div>
                    <div className="col-span-9">
                      <PartnerSuggestionField
                        partnerType="IMPORTER"
                        extractedName={aiParseResult?.importer_name || formData.importer_name}
                        extractedAddress={aiParseResult?.importer_address || formData.importer_address}
                        extractedTaxCode={aiParseResult?.importer_tax_code || formData.importer_tax_code}
                        value={selectedImporterId || undefined}
                        onPartnerSelect={(partner) => {
                          if (partner) {
                            setSelectedImporterId(partner.partner_id);
                            onUpdateField('importer_name', partner.name);
                            onUpdateField('importer_address', partner.address || '');
                            onUpdateField('importer_tax_code', partner.tax_code || '');
                            // Fill additional importer fields
                            if (partner.postal_code) {
                              onUpdateField('importer_postal_code', partner.postal_code);
                            }
                            if (partner.phone) {
                              onUpdateField('importer_phone', partner.phone);
                            }
                            // Also set the importer_code to tax_code if available
                            if (partner.tax_code) {
                              onUpdateField('importer_code', partner.tax_code);
                            }
                            // Track correction if value changed
                            if (aiParseResult?.importer_name && aiParseResult.importer_name !== partner.name) {
                              setCorrections(prev => ({
                                ...prev,
                                importer_name: {
                                  original: aiParseResult.importer_name || '',
                                  current: partner.name
                                }
                              }));
                            }
                          }
                        }}
                        onCreateNew={() => {
                          setSelectedImporterId(null);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <FieldWithSource
                        label="Mã bưu chính"
                        value={formData.importer_postal_code}
                        field="importer_postal_code"
                        source={fieldSources['importer_postal_code']}
                        onChange={(v) => onUpdateField('importer_postal_code', v)}
                        placeholder="(+84)"
                      />
                    </div>
                    <div className="col-span-9">
                      <FieldWithSource
                        label="Địa chỉ"
                        value={formData.importer_address}
                        field="importer_address"
                        source={fieldSources['importer_address']}
                        onChange={(v) => onUpdateField('importer_address', v)}
                        placeholder="Số 05 Đường Phạm Hùng..."
                      />
                    </div>
                    <div className="col-span-3">
                      <FieldWithSource
                        label="Điện thoại"
                        value={formData.importer_phone}
                        field="importer_phone"
                        source={fieldSources['importer_phone']}
                        onChange={(v) => onUpdateField('importer_phone', v)}
                        placeholder="(+84)"
                      />
                    </div>
                  </div>
                </div>

                {/* Người ủy thác nhập khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600">Người ủy thác nhập khẩu</div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <FieldWithSource
                        label="Mã"
                        value={formData.consignee_code}
                        field="consignee_code"
                        source={fieldSources['consignee_code']}
                        onChange={(v) => onUpdateField('consignee_code', v)}
                      />
                    </div>
                    <div className="col-span-9">
                      <FieldWithSource
                        label="Tên"
                        value={formData.consignee_name}
                        field="consignee_name"
                        source={fieldSources['consignee_name']}
                        onChange={(v) => onUpdateField('consignee_name', v)}
                      />
                    </div>
                  </div>
                </div>

                {/* Người xuất khẩu */}
                <div className="mb-4">
                  <div className="mb-2 font-medium text-sm text-blue-600 flex items-center gap-2">
                    Người xuất khẩu
                    {aiParseResult?.exporter_match && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        aiParseResult.exporter_match.should_auto_select
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        Match: {Math.round(aiParseResult.exporter_match.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                      <PartnerSuggestionField
                        partnerType="EXPORTER"
                        extractedName={aiParseResult?.exporter_name || formData.exporter_name}
                        extractedAddress={aiParseResult?.exporter_address || formData.exporter_address}
                        value={selectedExporterId || undefined}
                        onPartnerSelect={(partner) => {
                          if (partner) {
                            setSelectedExporterId(partner.partner_id);
                            onUpdateField('exporter_name', partner.name);
                            onUpdateField('exporter_address', partner.address || '');
                            onUpdateField('exporter_country', partner.country_code || '');
                            // Track correction if value changed
                            if (aiParseResult?.exporter_name && aiParseResult.exporter_name !== partner.name) {
                              setCorrections(prev => ({
                                ...prev,
                                exporter_name: {
                                  original: aiParseResult.exporter_name || '',
                                  current: partner.name
                                }
                              }));
                            }
                          }
                        }}
                        onCreateNew={() => {
                          // Keep the AI extracted value as manual entry
                          setSelectedExporterId(null);
                        }}
                      />
                    </div>
                    <div className="col-span-9">
                      <FieldWithSource
                        label="Địa chỉ"
                        value={formData.exporter_address}
                        field="exporter_address"
                        source={fieldSources['exporter_address']}
                        onChange={(v) => onUpdateField('exporter_address', v)}
                      />
                    </div>
                    <div className="col-span-3">
                      <FieldWithSource
                        label="Mã nước"
                        value={formData.exporter_country}
                        field="exporter_country"
                        source={fieldSources['exporter_country']}
                        onChange={(v) => onUpdateField('exporter_country', v)}
                        placeholder="CN"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vận đơn */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Vận đơn</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Số vận đơn"
                      value={formData.bl_no}
                      field="bl_no"
                      source={fieldSources['bl_no']}
                      onChange={(v) => onUpdateField('bl_no', v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Ngày vận đơn"
                      value={formData.bl_date}
                      field="bl_date"
                      source={fieldSources['bl_date']}
                      onChange={(v) => onUpdateField('bl_date', v)}
                      type="date"
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldWithSource
                      label="Số lượng kiện"
                      value={formData.total_packages}
                      field="total_packages"
                      source={fieldSources['total_packages']}
                      onChange={(v) => onUpdateField('total_packages', Number(v))}
                      type="number"
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldWithSource
                      label="Tổng trọng lượng (Gross)"
                      value={formData.gross_weight}
                      field="gross_weight"
                      source={fieldSources['gross_weight']}
                      onChange={(v) => onUpdateField('gross_weight', Number(v))}
                      type="number"
                    />
                  </div>
                </div>
              </div>

              {/* Địa điểm và vận chuyển */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Địa điểm và vận chuyển</h3>
                <div className="grid grid-cols-12 gap-4">
                  {/* Row 1 */}
                  <div className="col-span-6">
                    <FieldWithSource
                      label="Mã địa điểm lưu kho hàng chờ thông quan dự kiến"
                      value={formData.warehouse_code}
                      field="warehouse_code"
                      source={fieldSources['warehouse_code']}
                      onChange={(v) => onUpdateField('warehouse_code', v)}
                      placeholder="15BBCQ1"
                    />
                  </div>
                  <div className="col-span-6">
                    <FieldWithSource
                      label="Tên địa điểm lưu kho"
                      value={formData.warehouse_name}
                      field="warehouse_name"
                      source={fieldSources['warehouse_name']}
                      onChange={(v) => onUpdateField('warehouse_name', v)}
                      placeholder="CTY XUAN CUONG"
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="col-span-12">
                    <FieldWithSource
                      label="Ký hiệu và số hiệu bao bì"
                      value={formData.package_marks}
                      field="package_marks"
                      source={fieldSources['package_marks']}
                      onChange={(v) => onUpdateField('package_marks', v)}
                      placeholder="N/M"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-gray-500">Phương tiện vận chuyển</label>
                    <select
                      value={formData.transport_mode}
                      onChange={(e) => onUpdateField('transport_mode', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {TRANSPORT_MODES.map((t) => (
                        <option key={t.value} value={t.value}>{t.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Tên/số hiệu phương tiện"
                      value={formData.vessel_name}
                      field="vessel_name"
                      source={fieldSources['vessel_name']}
                      onChange={(v) => onUpdateField('vessel_name', v)}
                      placeholder="XE TAI/E9U115"
                    />
                  </div>
                  <div className="col-span-3">
                    <FieldWithSource
                      label="Ngày hàng đến"
                      value={formData.arrival_date}
                      field="arrival_date"
                      source={fieldSources['arrival_date']}
                      onChange={(v) => onUpdateField('arrival_date', v)}
                      type="date"
                    />
                  </div>
                  <div className="col-span-3">
                    <FieldWithSource
                      label="Số lượng Container"
                      value={formData.container_count}
                      field="container_count"
                      source={fieldSources['container_count']}
                      onChange={(v) => onUpdateField('container_count', Number(v))}
                      type="number"
                    />
                  </div>

                  {/* Row 4 */}
                  <div className="col-span-3">
                    <FieldWithSource
                      label="Địa điểm dỡ hàng (mã)"
                      value={formData.unloading_location_code}
                      field="unloading_location_code"
                      source={fieldSources['unloading_location_code']}
                      onChange={(v) => onUpdateField('unloading_location_code', v)}
                      placeholder="VNHUGT"
                    />
                  </div>
                  <div className="col-span-5">
                    <FieldWithSource
                      label="Tên địa điểm dỡ hàng"
                      value={formData.unloading_location_name}
                      field="unloading_location_name"
                      source={fieldSources['unloading_location_name']}
                      onChange={(v) => onUpdateField('unloading_location_name', v)}
                      placeholder="CUA KHAU HUU NGHI LANG SON"
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Số container"
                      value={formData.container_numbers}
                      field="container_numbers"
                      source={fieldSources['container_numbers']}
                      onChange={(v) => onUpdateField('container_numbers', v)}
                      placeholder="CONT001, CONT002"
                    />
                  </div>

                  {/* Row 5 */}
                  <div className="col-span-3">
                    <FieldWithSource
                      label="Địa điểm xếp hàng (mã)"
                      value={formData.loading_location_code}
                      field="loading_location_code"
                      source={fieldSources['loading_location_code']}
                      onChange={(v) => onUpdateField('loading_location_code', v)}
                      placeholder="CNSZV"
                    />
                  </div>
                  <div className="col-span-5">
                    <FieldWithSource
                      label="Tên địa điểm xếp hàng"
                      value={formData.loading_location_name}
                      field="loading_location_name"
                      source={fieldSources['loading_location_name']}
                      onChange={(v) => onUpdateField('loading_location_name', v)}
                      placeholder="SUZHOU"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã kết quả kiểm tra nội dung</label>
                    <select
                      value={formData.inspection_result_code || ''}
                      onChange={(e) => onUpdateField('inspection_result_code', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      <option value="">-- Chọn --</option>
                      <option value="1">1 - Miễn kiểm tra</option>
                      <option value="2">2 - Kiểm tra hồ sơ</option>
                      <option value="3">3 - Kiểm tra thực tế hàng hóa</option>
                    </select>
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
              {/* Hóa đơn thương mại */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Hóa đơn thương mại</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Số hóa đơn"
                      value={formData.invoice_no}
                      field="invoice_no"
                      source={fieldSources['invoice_no']}
                      onChange={(v) => onUpdateField('invoice_no', v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Ngày hóa đơn"
                      value={formData.invoice_date}
                      field="invoice_date"
                      source={fieldSources['invoice_date']}
                      onChange={(v) => onUpdateField('invoice_date', v)}
                      type="date"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phương thức thanh toán</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => onUpdateField('payment_method', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {PAYMENT_METHODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Điều kiện giá (Incoterms)</label>
                    <select
                      value={formData.incoterms}
                      onChange={(e) => onUpdateField('incoterms', e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {INCOTERMS.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Tổng trị giá hóa đơn"
                      value={formData.total_value}
                      field="total_value"
                      source={fieldSources['total_value']}
                      onChange={(v) => onUpdateField('total_value', Number(v))}
                      type="number"
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Mã đồng tiền</label>
                    <select
                      value={formData.currency_code}
                      onChange={(e) => onUpdateField('currency_code', e.target.value)}
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
                    <label className="text-xs text-gray-500">Phí vận chuyển</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.freight_value || ''}
                        onChange={(e) => onUpdateField('freight_value', Number(e.target.value))}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                        placeholder="Phí VC"
                      />
                      <select
                        value={formData.freight_currency}
                        onChange={(e) => onUpdateField('freight_currency', e.target.value)}
                        className="w-20 rounded border px-2 py-1 text-sm"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="text-xs text-gray-500">Phí bảo hiểm</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.insurance_value || ''}
                        onChange={(e) => onUpdateField('insurance_value', Number(e.target.value))}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                        placeholder="Phí BH"
                      />
                      <select
                        value={formData.insurance_currency}
                        onChange={(e) => onUpdateField('insurance_currency', e.target.value)}
                        className="w-20 rounded border px-2 py-1 text-sm"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Trị giá tính thuế"
                      value={formData.customs_value}
                      field="customs_value"
                      source={fieldSources['customs_value']}
                      onChange={(v) => onUpdateField('customs_value', Number(v))}
                      type="number"
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Tỷ giá"
                      value={formData.exchange_rate}
                      field="exchange_rate"
                      source={fieldSources['exchange_rate']}
                      onChange={(v) => onUpdateField('exchange_rate', Number(v))}
                      type="number"
                    />
                  </div>
                </div>
              </div>

              {/* Vận chuyển */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Thông tin vận chuyển</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Tên tàu/chuyến bay"
                      value={formData.vessel_name}
                      field="vessel_name"
                      source={fieldSources['vessel_name']}
                      onChange={(v) => onUpdateField('vessel_name', v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Số chuyến"
                      value={formData.voyage_no}
                      field="voyage_no"
                      source={fieldSources['voyage_no']}
                      onChange={(v) => onUpdateField('voyage_no', v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Ngày hàng đến"
                      value={formData.arrival_date}
                      field="arrival_date"
                      source={fieldSources['arrival_date']}
                      onChange={(v) => onUpdateField('arrival_date', v)}
                      type="date"
                    />
                  </div>
                  <div className="col-span-6">
                    <FieldWithSource
                      label="Cảng xếp hàng (Port of Loading)"
                      value={formData.loading_port_name}
                      field="loading_port_name"
                      source={fieldSources['loading_port_name']}
                      onChange={(v) => onUpdateField('loading_port_name', v)}
                    />
                  </div>
                  <div className="col-span-6">
                    <FieldWithSource
                      label="Cảng dỡ hàng (Discharge Port)"
                      value={formData.discharge_port_name}
                      field="discharge_port_name"
                      source={fieldSources['discharge_port_name']}
                      onChange={(v) => onUpdateField('discharge_port_name', v)}
                    />
                  </div>
                </div>
              </div>

              {/* Địa điểm */}
              <div className="rounded border p-4">
                <h3 className="mb-3 font-medium text-gray-700">Địa điểm</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Mã địa điểm lưu kho"
                      value={formData.warehouse_code}
                      field="warehouse_code"
                      source={fieldSources['warehouse_code']}
                      onChange={(v) => onUpdateField('warehouse_code', v)}
                    />
                  </div>
                  <div className="col-span-8">
                    <FieldWithSource
                      label="Tên địa điểm lưu kho"
                      value={formData.warehouse_name}
                      field="warehouse_name"
                      source={fieldSources['warehouse_name']}
                      onChange={(v) => onUpdateField('warehouse_name', v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <FieldWithSource
                      label="Cửa khẩu"
                      value={formData.border_gate}
                      field="border_gate"
                      source={fieldSources['border_gate']}
                      onChange={(v) => onUpdateField('border_gate', v)}
                    />
                  </div>
                  <div className="col-span-8">
                    <FieldWithSource
                      label="Tên cửa khẩu"
                      value={formData.border_gate_name}
                      field="border_gate_name"
                      source={fieldSources['border_gate_name']}
                      onChange={(v) => onUpdateField('border_gate_name', v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: DANH SÁCH HÀNG - Dạng bảng 1 dòng */}
          {/* ============================================================ */}
          {activeTab === 'danhsach' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between rounded bg-gray-100 p-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-gray-500">HS Code được tự động tra cứu từ mã quản lý riêng. Click vào ô để chỉnh sửa.</span>
                </div>
                <button
                  onClick={onAddItem}
                  className="flex items-center gap-1 rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </button>
              </div>

              {/* Items Table */}
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
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="border px-4 py-8 text-center text-gray-500">
                          Chưa có dữ liệu hàng hóa. Nhấn "Thêm dòng" để thêm mặt hàng.
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border px-2 py-1 text-center font-bold text-blue-600">
                            {String(item.item_no).padStart(2, '0')}
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.hs_code || ''}
                              onChange={(e) => onUpdateItem(idx, 'hs_code', e.target.value)}
                              className="w-full px-1 py-0.5 border-0 text-sm font-mono bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="85249100"
                            />
                          </td>
                          <td className="border px-1 py-1 relative">
                            <input
                              type="text"
                              value={item.product_code || ''}
                              onChange={(e) => onUpdateItem(idx, 'product_code', e.target.value)}
                              onBlur={(e) => onLookupHS(idx, e.target.value)}
                              className={`w-full px-1 py-0.5 border-0 text-sm bg-yellow-50 focus:bg-yellow-100 focus:outline-none ${lookupLoading[idx] ? 'pr-6' : ''}`}
                              placeholder="023.400UL"
                              title="Nhập mã QL riêng rồi tab/click ra ngoài để tra cứu HS code"
                            />
                            {lookupLoading[idx] && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                              </span>
                            )}
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.product_name || ''}
                              onChange={(e) => onUpdateItem(idx, 'product_name', e.target.value)}
                              className="w-full px-1 py-0.5 border-0 text-sm bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="Mô tả hàng hóa..."
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={item.country_of_origin || ''}
                              onChange={(e) => onUpdateItem(idx, 'country_of_origin', e.target.value.toUpperCase())}
                              className="w-full px-1 py-0.5 border-0 text-sm text-center bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                              placeholder="CN"
                              maxLength={2}
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formatNumber(item.quantity, 0)}
                              onChange={(e) => onUpdateItem(idx, 'quantity', Math.round(parseFormattedNumber(e.target.value)))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <select
                              value={item.unit || 'PCE'}
                              onChange={(e) => onUpdateItem(idx, 'unit', e.target.value)}
                              className="w-full px-0 py-0.5 border-0 text-sm bg-transparent focus:outline-none"
                            >
                              {UNITS.map((u) => (
                                <option key={u.value} value={u.value}>{u.value}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formatNumber(item.unit_price, 2)}
                              onChange={(e) => onUpdateItem(idx, 'unit_price', parseFormattedNumber(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formatNumber(item.total_value, 2)}
                              onChange={(e) => onUpdateItem(idx, 'total_value', parseFormattedNumber(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right bg-yellow-50 focus:bg-yellow-100 focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.import_duty_rate || 0}
                              onChange={(e) => onUpdateItem(idx, 'import_duty_rate', Number(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formatNumber(item.import_duty_amount || 0, 0)}
                              onChange={(e) => onUpdateItem(idx, 'import_duty_amount', parseFormattedNumber(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="number"
                              value={item.vat_rate || 10}
                              onChange={(e) => onUpdateItem(idx, 'vat_rate', Number(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <input
                              type="text"
                              value={formatNumber(item.vat_amount || 0, 0)}
                              onChange={(e) => onUpdateItem(idx, 'vat_amount', parseFormattedNumber(e.target.value))}
                              className="w-full px-1 py-0.5 border-0 text-sm text-right focus:outline-none"
                            />
                          </td>
                          <td className="border px-1 py-1 text-center">
                            <button
                              onClick={() => onRemoveItem(idx)}
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
                  {formData.items.length > 0 && (
                    <tfoot>
                      <tr className="bg-blue-100 font-medium">
                        <td colSpan={5} className="border px-2 py-2 text-right">Tổng cộng:</td>
                        <td className="border px-2 py-2 text-right">
                          {formData.items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {formData.items.reduce((sum, i) => sum + i.total_value, 0).toLocaleString()} {formData.currency_code}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {formData.items.reduce((sum, i) => sum + (i.import_duty_amount || 0), 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                        <td className="border px-2 py-2 text-right">
                          {formData.items.reduce((sum, i) => sum + (i.vat_amount || 0), 0).toLocaleString()}
                        </td>
                        <td className="border px-2 py-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons - outside tabs */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportXML}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Xuất XML
                  </>
                )}
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting || formData.items.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu tờ khai
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: COMPLETE
// ============================================================

function Step3Complete({
  onViewDeclarations,
  declarationId,
}: {
  onViewDeclarations: () => void;
  declarationId?: string;
}) {
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Tạo tờ khai thành công!</h2>
      <p className="text-gray-600 mb-6">
        Tờ khai đã được lưu vào hệ thống. Bạn có thể xuất XML để nộp lên VNACCS hoặc đồng bộ trực tiếp vào ECUS.
      </p>

      {/* ECUS Sync Section */}
      {declarationId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">Đồng bộ vào phần mềm ECUS</h3>
          </div>
          <p className="text-sm text-blue-600 mb-4">
            Nếu máy tính này đã cài ECUS5VNACCS, bạn có thể đồng bộ tờ khai trực tiếp vào database ECUS.
          </p>
          <div className="flex justify-center">
            <UploadToECUSButton
              declarationId={declarationId}
              variant="primary"
              size="lg"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onViewDeclarations}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Xem danh sách tờ khai
        </button>
        <Link
          href="/fms/customs/import"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Tạo tờ khai mới
        </Link>
      </div>
    </div>
  );
}

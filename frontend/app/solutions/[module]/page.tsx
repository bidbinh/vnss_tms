"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Truck,
  Package,
  Users,
  Users2,
  Calculator,
  Route,
  Anchor,
  Zap,
  Factory,
  PiggyBank,
  FolderKanban,
  Workflow,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Brain,
  TrendingUp,
  BarChart3,
  Shield,
  Clock,
  Globe2,
  Cpu,
  Network,
  Layers,
  Target,
  Map,
  Ship,
  Plane,
  Box,
  Boxes,
  Warehouse,
  ScanLine,
  FileText,
  Receipt,
  CreditCard,
  PieChart,
  Activity,
  Gauge,
  Bell,
  Smartphone,
  Monitor,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// MODULE DATA
// ============================================================================

interface ModuleFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ModuleData {
  id: string;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  features: ModuleFeature[];
  capabilities: string[];
  aiFeatures: {
    title: string;
    description: string;
  }[];
  stats: {
    value: string;
    label: string;
  }[];
}

// Unified color scheme - all modules use same base with subtle accent
const UNIFIED_GRADIENT = "from-slate-800 via-slate-900 to-slate-950";
const UNIFIED_ACCENT = "from-red-500 to-red-600";

const MODULES_DATA: Record<string, ModuleData> = {
  tms: {
    id: "tms",
    name: "TMS",
    fullName: "Transportation Management System",
    tagline: "Quản lý vận tải thông minh với AI",
    description: "Tối ưu hóa toàn bộ quy trình vận tải từ lập kế hoạch, điều xe, theo dõi realtime đến thanh toán và báo cáo. Tích hợp AI dự báo và đề xuất tuyến đường tối ưu.",
    icon: Truck,
    color: "blue",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Map, title: "Route Optimization", description: "AI tự động tính toán tuyến đường tối ưu dựa trên traffic, thời tiết, và lịch sử" },
      { icon: Gauge, title: "Fleet Tracking", description: "Theo dõi vị trí xe realtime với GPS, cảnh báo vi phạm tốc độ và lộ trình" },
      { icon: Receipt, title: "Automated Billing", description: "Tự động tính cước, xuất hóa đơn điện tử, đối soát công nợ" },
      { icon: BarChart3, title: "Analytics Dashboard", description: "Báo cáo chi tiết về hiệu suất xe, tài xế, chi phí nhiên liệu" },
      { icon: Bell, title: "Smart Alerts", description: "Cảnh báo thông minh về bảo dưỡng, hết hạn giấy tờ, SLA" },
      { icon: Smartphone, title: "Driver App", description: "App mobile cho tài xế: nhận lệnh, chụp POD, báo cáo chi phí" },
    ],
    capabilities: [
      "Quản lý đơn hàng vận tải",
      "Điều phối xe và tài xế",
      "Theo dõi GPS realtime",
      "Quản lý chi phí nhiên liệu",
      "Tính lương tài xế tự động",
      "Báo cáo KPI vận tải",
      "Tích hợp hóa đơn điện tử",
      "Quản lý bảo dưỡng xe",
    ],
    aiFeatures: [
      { title: "Dự báo nhu cầu", description: "AI phân tích lịch sử để dự báo nhu cầu vận chuyển theo mùa, khu vực" },
      { title: "Tối ưu tuyến đường", description: "Thuật toán AI tính toán tuyến đường ngắn nhất, tiết kiệm nhiên liệu nhất" },
      { title: "Phát hiện bất thường", description: "Tự động phát hiện hành vi lái xe bất thường, gian lận nhiên liệu" },
    ],
    stats: [
      { value: "30%", label: "Giảm chi phí nhiên liệu" },
      { value: "45%", label: "Tăng hiệu suất xe" },
      { value: "2x", label: "Nhanh hơn xử lý đơn" },
      { value: "99.5%", label: "Độ chính xác GPS" },
    ],
  },
  wms: {
    id: "wms",
    name: "WMS",
    fullName: "Warehouse Management System",
    tagline: "Kho hàng thông minh, vận hành tối ưu",
    description: "Số hóa toàn bộ quy trình kho từ nhập, xuất, kiểm kê đến quản lý vị trí. AI tự động đề xuất vị trí lưu kho và tối ưu picking path.",
    icon: Package,
    color: "amber",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: ScanLine, title: "Barcode/QR Scanning", description: "Quét mã vạch nhanh chóng với app mobile, giảm sai sót nhập liệu" },
      { icon: Boxes, title: "Location Management", description: "Quản lý vị trí kho đến từng ô, kệ. AI đề xuất vị trí tối ưu" },
      { icon: Activity, title: "Stock Monitoring", description: "Theo dõi tồn kho realtime, cảnh báo hết hàng, quá hạn" },
      { icon: Layers, title: "Batch & Serial", description: "Quản lý theo lô, serial number, hạn sử dụng chi tiết" },
      { icon: TrendingUp, title: "Inventory Analytics", description: "Phân tích ABC, XYZ, dự báo nhu cầu nhập hàng" },
      { icon: Network, title: "Multi-warehouse", description: "Quản lý nhiều kho, điều chuyển nội bộ linh hoạt" },
    ],
    capabilities: [
      "Nhập kho (GRN)",
      "Xuất kho theo FIFO/LIFO",
      "Kiểm kê định kỳ",
      "Quản lý vị trí bin",
      "Picking & Packing",
      "Điều chuyển nội bộ",
      "Báo cáo tồn kho",
      "Tích hợp kế toán",
    ],
    aiFeatures: [
      { title: "Smart Slotting", description: "AI tự động đề xuất vị trí lưu kho tối ưu dựa trên tần suất xuất" },
      { title: "Demand Forecasting", description: "Dự báo nhu cầu hàng hóa để tối ưu mức tồn kho" },
      { title: "Picking Optimization", description: "Tối ưu đường đi picking, giảm thời gian lấy hàng 40%" },
    ],
    stats: [
      { value: "40%", label: "Giảm thời gian picking" },
      { value: "99.9%", label: "Độ chính xác tồn kho" },
      { value: "50%", label: "Tăng năng suất kho" },
      { value: "3x", label: "Nhanh hơn kiểm kê" },
    ],
  },
  fms: {
    id: "fms",
    name: "FMS",
    fullName: "Forwarding Management System",
    tagline: "Giao nhận quốc tế chuyên nghiệp",
    description: "Quản lý toàn diện nghiệp vụ giao nhận quốc tế: booking, chứng từ, tracking, customs. Tích hợp với các hãng tàu và airline lớn.",
    icon: Ship,
    color: "emerald",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Ship, title: "Sea Freight", description: "Quản lý FCL, LCL, Bill of Lading, Container tracking" },
      { icon: Plane, title: "Air Freight", description: "Airway Bill, Flight booking, Cargo tracking" },
      { icon: FileText, title: "Documentation", description: "Tự động tạo chứng từ: B/L, AWB, Packing List, Invoice" },
      { icon: Globe2, title: "Customs", description: "Khai báo hải quan điện tử, quản lý HS code" },
      { icon: Target, title: "Shipment Tracking", description: "Theo dõi lô hàng toàn trình từ origin đến destination" },
      { icon: CreditCard, title: "Cost Management", description: "Quản lý chi phí, profit margin theo từng shipment" },
    ],
    capabilities: [
      "Booking sea/air freight",
      "Container management",
      "B/L, AWB processing",
      "Customs declaration",
      "Shipment tracking",
      "Agent management",
      "Profit analysis",
      "Document automation",
    ],
    aiFeatures: [
      { title: "Rate Intelligence", description: "AI phân tích giá cước thị trường, đề xuất thời điểm booking tốt nhất" },
      { title: "ETA Prediction", description: "Dự báo thời gian đến chính xác dựa trên dữ liệu lịch sử" },
      { title: "Document OCR", description: "Tự động nhận dạng và nhập liệu từ chứng từ scan" },
    ],
    stats: [
      { value: "60%", label: "Giảm thời gian làm chứng từ" },
      { value: "95%", label: "Độ chính xác ETA" },
      { value: "500+", label: "Ports kết nối" },
      { value: "24/7", label: "Tracking realtime" },
    ],
  },
  pms: {
    id: "pms",
    name: "PMS",
    fullName: "Port Management System",
    tagline: "Vận hành cảng & depot hiệu quả",
    description: "Giải pháp quản lý toàn diện cho cảng biển, ICD, depot container. Tối ưu yard planning, gate operations, và vessel scheduling.",
    icon: Anchor,
    color: "cyan",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Anchor, title: "Berth Planning", description: "Lập kế hoạch cầu bến, tối ưu thời gian tàu cập cảng" },
      { icon: Box, title: "Yard Management", description: "Quản lý bãi container, vị trí block, row, tier" },
      { icon: Truck, title: "Gate Operations", description: "Quản lý cổng ra vào, eIR, appointment system" },
      { icon: Clock, title: "Detention & Demurrage", description: "Tính phí lưu bãi, lưu container tự động" },
      { icon: Warehouse, title: "Equipment Tracking", description: "Theo dõi thiết bị: RTG, reach stacker, forklift" },
      { icon: BarChart3, title: "KPI Dashboard", description: "Throughput, dwell time, productivity reports" },
    ],
    capabilities: [
      "Vessel scheduling",
      "Yard planning",
      "Gate management",
      "Container tracking",
      "Equipment management",
      "Billing & tariff",
      "Reefer monitoring",
      "Performance analytics",
    ],
    aiFeatures: [
      { title: "Yard Optimization", description: "AI tối ưu vị trí đặt container để giảm số lần move" },
      { title: "Berth Scheduling", description: "Tự động sắp xếp cầu bến tối ưu cho vessel" },
      { title: "Throughput Prediction", description: "Dự báo throughput để planning nhân sự, thiết bị" },
    ],
    stats: [
      { value: "25%", label: "Tăng throughput" },
      { value: "30%", label: "Giảm dwell time" },
      { value: "40%", label: "Giảm rehandles" },
      { value: "15min", label: "Avg truck turnaround" },
    ],
  },
  ems: {
    id: "ems",
    name: "EMS",
    fullName: "Express Management System",
    tagline: "Chuyển phát nhanh thời đại số",
    description: "Hệ thống quản lý chuyển phát nhanh từ order, sorting, delivery đến COD. Tích hợp shipper portal và tracking widget.",
    icon: Zap,
    color: "orange",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Box, title: "Order Management", description: "Nhận đơn đa kênh: API, web, app, Excel import" },
      { icon: Boxes, title: "Sorting Center", description: "Quản lý hub, cross-docking, outbound dispatch" },
      { icon: Route, title: "Route Planning", description: "AI tối ưu tuyến giao cho từng shipper" },
      { icon: Smartphone, title: "Driver App", description: "App giao hàng: scan, POD, thu COD, fail reason" },
      { icon: CreditCard, title: "COD Management", description: "Quản lý tiền thu hộ, đối soát, chuyển tiền" },
      { icon: Activity, title: "SLA Tracking", description: "Theo dõi SLA, tỷ lệ giao thành công realtime" },
    ],
    capabilities: [
      "Multi-channel orders",
      "Sorting automation",
      "Route optimization",
      "Last-mile delivery",
      "COD reconciliation",
      "Shipper portal",
      "Tracking API",
      "Performance reports",
    ],
    aiFeatures: [
      { title: "Delivery Prediction", description: "AI dự báo khả năng giao thành công dựa trên địa chỉ, lịch sử" },
      { title: "Smart Routing", description: "Tối ưu tuyến giao hàng theo realtime traffic" },
      { title: "Capacity Planning", description: "Dự báo volume để planning shipper và xe" },
    ],
    stats: [
      { value: "98%", label: "Tỷ lệ giao thành công" },
      { value: "2h", label: "Avg delivery time nội thành" },
      { value: "50K+", label: "Đơn/ngày capacity" },
      { value: "99%", label: "COD accuracy" },
    ],
  },
  mes: {
    id: "mes",
    name: "MES",
    fullName: "Manufacturing Execution System",
    tagline: "Sản xuất thông minh Industry 4.0",
    description: "Số hóa sản xuất từ BOM, work order, shop floor control đến quality management. Kết nối IoT với máy móc thiết bị.",
    icon: Factory,
    color: "slate",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: FileText, title: "Production Planning", description: "Lập kế hoạch sản xuất, MRP, capacity planning" },
      { icon: Layers, title: "BOM Management", description: "Quản lý định mức nguyên vật liệu đa cấp" },
      { icon: Activity, title: "Shop Floor Control", description: "Theo dõi tiến độ sản xuất realtime từng công đoạn" },
      { icon: Shield, title: "Quality Control", description: "Kiểm tra chất lượng, NCR, CAPA management" },
      { icon: Gauge, title: "OEE Monitoring", description: "Đo lường OEE, downtime tracking, root cause" },
      { icon: Network, title: "IoT Integration", description: "Kết nối PLC, sensors để thu thập dữ liệu tự động" },
    ],
    capabilities: [
      "Production orders",
      "Work orders",
      "BOM & routing",
      "Shop floor tracking",
      "Quality management",
      "Equipment maintenance",
      "OEE analytics",
      "Traceability",
    ],
    aiFeatures: [
      { title: "Predictive Maintenance", description: "AI dự báo hư hỏng máy móc trước khi xảy ra" },
      { title: "Quality Prediction", description: "Dự báo lỗi chất lượng dựa trên parameters sản xuất" },
      { title: "Production Optimization", description: "Tối ưu scheduling để maximize output" },
    ],
    stats: [
      { value: "20%", label: "Tăng OEE" },
      { value: "35%", label: "Giảm defects" },
      { value: "50%", label: "Giảm downtime" },
      { value: "100%", label: "Traceability" },
    ],
  },
  crm: {
    id: "crm",
    name: "CRM",
    fullName: "Customer Relationship Management",
    tagline: "Khách hàng là trọng tâm",
    description: "Quản lý toàn diện quan hệ khách hàng từ lead, opportunity, quote đến contract. Tích hợp đa kênh communication.",
    icon: Users2,
    color: "rose",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Target, title: "Lead Management", description: "Theo dõi leads từ nhiều nguồn, lead scoring với AI" },
      { icon: TrendingUp, title: "Sales Pipeline", description: "Quản lý pipeline trực quan, dự báo doanh thu" },
      { icon: FileText, title: "Quotation", description: "Tạo báo giá nhanh, approval workflow, versioning" },
      { icon: Bell, title: "Activity Tracking", description: "Log calls, emails, meetings với khách hàng" },
      { icon: PieChart, title: "Sales Analytics", description: "Phân tích win/loss, sales performance, forecast" },
      { icon: Smartphone, title: "Omnichannel", description: "Tích hợp email, phone, chat, social media" },
    ],
    capabilities: [
      "Contact management",
      "Lead tracking",
      "Opportunity pipeline",
      "Quotation & contracts",
      "Activity logging",
      "Email integration",
      "Sales forecasting",
      "Customer 360 view",
    ],
    aiFeatures: [
      { title: "Lead Scoring", description: "AI chấm điểm leads để ưu tiên follow-up" },
      { title: "Churn Prediction", description: "Dự báo khách hàng có nguy cơ rời bỏ" },
      { title: "Next Best Action", description: "Đề xuất hành động tiếp theo với từng khách hàng" },
    ],
    stats: [
      { value: "40%", label: "Tăng conversion rate" },
      { value: "25%", label: "Tăng customer retention" },
      { value: "2x", label: "Nhanh hơn sales cycle" },
      { value: "360°", label: "Customer view" },
    ],
  },
  hrm: {
    id: "hrm",
    name: "HRM",
    fullName: "Human Resource Management",
    tagline: "Quản trị nhân sự toàn diện",
    description: "Số hóa toàn bộ HR từ recruitment, onboarding, payroll đến performance management. Tự động hóa tính lương, chấm công.",
    icon: Users,
    color: "violet",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Users, title: "Employee Database", description: "Quản lý hồ sơ nhân viên, contracts, documents" },
      { icon: Clock, title: "Time & Attendance", description: "Chấm công đa hình thức: vân tay, face, GPS" },
      { icon: CreditCard, title: "Payroll", description: "Tính lương tự động theo công thức, thuế TNCN" },
      { icon: Target, title: "Recruitment", description: "Quản lý tuyển dụng từ JD đến onboarding" },
      { icon: TrendingUp, title: "Performance", description: "Đánh giá KPI, OKR, 360 feedback" },
      { icon: Activity, title: "Leave Management", description: "Quản lý nghỉ phép, approval workflow" },
    ],
    capabilities: [
      "Employee profiles",
      "Attendance tracking",
      "Leave management",
      "Payroll processing",
      "Tax calculation",
      "Recruitment",
      "Training",
      "Performance reviews",
    ],
    aiFeatures: [
      { title: "Resume Screening", description: "AI sàng lọc CV, match với JD tự động" },
      { title: "Attrition Prediction", description: "Dự báo nhân viên có nguy cơ nghỉ việc" },
      { title: "Workforce Planning", description: "Đề xuất hiring plan dựa trên growth forecast" },
    ],
    stats: [
      { value: "80%", label: "Giảm thời gian tính lương" },
      { value: "50%", label: "Giảm thời gian tuyển dụng" },
      { value: "100%", label: "Chính xác chấm công" },
      { value: "0", label: "Sai sót thuế TNCN" },
    ],
  },
  accounting: {
    id: "accounting",
    name: "Kế toán",
    fullName: "Accounting & Finance",
    tagline: "Kế toán chuẩn Việt Nam",
    description: "Hệ thống kế toán đầy đủ theo chuẩn VAS, tích hợp hóa đơn điện tử, báo cáo thuế. Tự động đối chiếu công nợ và ngân hàng.",
    icon: Calculator,
    color: "green",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: FileText, title: "General Ledger", description: "Sổ cái, nhật ký chung theo chuẩn VAS" },
      { icon: Receipt, title: "AR/AP", description: "Quản lý công nợ phải thu, phải trả chi tiết" },
      { icon: CreditCard, title: "Banking", description: "Kết nối ngân hàng, đối chiếu tự động" },
      { icon: Calculator, title: "Tax Management", description: "Tính thuế GTGT, TNDN, báo cáo thuế" },
      { icon: PieChart, title: "Financial Reports", description: "Báo cáo tài chính: P&L, Balance Sheet, Cash Flow" },
      { icon: Shield, title: "Audit Trail", description: "Lưu vết thay đổi, phân quyền chặt chẽ" },
    ],
    capabilities: [
      "Chart of accounts",
      "Journal entries",
      "Accounts receivable",
      "Accounts payable",
      "Bank reconciliation",
      "Tax reporting",
      "Financial statements",
      "Multi-currency",
    ],
    aiFeatures: [
      { title: "Auto Categorization", description: "AI tự động phân loại giao dịch ngân hàng" },
      { title: "Anomaly Detection", description: "Phát hiện bất thường trong entries" },
      { title: "Cash Flow Forecast", description: "Dự báo dòng tiền dựa trên lịch sử" },
    ],
    stats: [
      { value: "90%", label: "Tự động hóa entries" },
      { value: "100%", label: "Tuân thủ VAS" },
      { value: "1 click", label: "Báo cáo thuế" },
      { value: "Realtime", label: "Financial dashboard" },
    ],
  },
  controlling: {
    id: "controlling",
    name: "Controlling",
    fullName: "Management Accounting & Controlling",
    tagline: "Kiểm soát chi phí, tối ưu lợi nhuận",
    description: "Hệ thống controlling phân bổ chi phí, quản lý ngân sách, phân tích profit center. Hỗ trợ ra quyết định với insights chi tiết.",
    icon: PiggyBank,
    color: "pink",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Layers, title: "Cost Centers", description: "Phân bổ chi phí theo cost center, activity" },
      { icon: Target, title: "Budgeting", description: "Lập và kiểm soát ngân sách theo phòng ban, dự án" },
      { icon: TrendingUp, title: "Profit Centers", description: "Phân tích lợi nhuận theo segment, product" },
      { icon: BarChart3, title: "Variance Analysis", description: "So sánh actual vs budget, phân tích chênh lệch" },
      { icon: PieChart, title: "ABC Costing", description: "Activity-based costing chi tiết" },
      { icon: Gauge, title: "KPI Dashboard", description: "Dashboard KPIs tài chính realtime" },
    ],
    capabilities: [
      "Cost center accounting",
      "Budget planning",
      "Budget control",
      "Profit center analysis",
      "Internal orders",
      "Variance reporting",
      "ABC costing",
      "Management reports",
    ],
    aiFeatures: [
      { title: "Budget Optimization", description: "AI đề xuất phân bổ ngân sách tối ưu" },
      { title: "Cost Driver Analysis", description: "Phân tích yếu tố ảnh hưởng chi phí" },
      { title: "Profitability Insights", description: "Insights về products/customers profitable nhất" },
    ],
    stats: [
      { value: "15%", label: "Giảm chi phí overhead" },
      { value: "100%", label: "Budget visibility" },
      { value: "Realtime", label: "Cost tracking" },
      { value: "360°", label: "Profitability view" },
    ],
  },
  workflow: {
    id: "workflow",
    name: "Workflow",
    fullName: "Workflow Automation",
    tagline: "Tự động hóa quy trình doanh nghiệp",
    description: "Xây dựng và tự động hóa các quy trình phê duyệt, business process với drag & drop designer. No-code workflow builder.",
    icon: Workflow,
    color: "indigo",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Layers, title: "Visual Designer", description: "Thiết kế workflow trực quan với drag & drop" },
      { icon: Check, title: "Approval Flows", description: "Quy trình phê duyệt đa cấp, ủy quyền tự động" },
      { icon: Bell, title: "Notifications", description: "Thông báo qua email, app, SMS khi có task mới" },
      { icon: Clock, title: "SLA Tracking", description: "Theo dõi SLA, escalation tự động khi quá hạn" },
      { icon: Activity, title: "Process Analytics", description: "Phân tích bottlenecks, cycle time" },
      { icon: Network, title: "Integration", description: "Kết nối với các modules khác và external systems" },
    ],
    capabilities: [
      "Workflow designer",
      "Approval management",
      "Task assignment",
      "Deadline tracking",
      "Email notifications",
      "Mobile approvals",
      "Delegation rules",
      "Audit history",
    ],
    aiFeatures: [
      { title: "Process Mining", description: "AI phân tích logs để discover actual processes" },
      { title: "Bottleneck Detection", description: "Tự động phát hiện điểm nghẽn trong quy trình" },
      { title: "Smart Routing", description: "Tự động assign task cho người phù hợp nhất" },
    ],
    stats: [
      { value: "70%", label: "Giảm thời gian phê duyệt" },
      { value: "100%", label: "Process compliance" },
      { value: "0", label: "Missed deadlines" },
      { value: "Real-time", label: "Status visibility" },
    ],
  },
  dms: {
    id: "dms",
    name: "DMS",
    fullName: "Document Management System",
    tagline: "Quản lý tài liệu thông minh",
    description: "Lưu trữ, tổ chức và chia sẻ tài liệu an toàn. Tìm kiếm full-text, version control, và tích hợp với các modules khác.",
    icon: FolderOpen,
    color: "yellow",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: FolderOpen, title: "Folder Structure", description: "Tổ chức thư mục linh hoạt, phân quyền chi tiết" },
      { icon: FileText, title: "Version Control", description: "Quản lý phiên bản, so sánh thay đổi, restore" },
      { icon: Target, title: "Full-text Search", description: "Tìm kiếm nội dung trong file với OCR" },
      { icon: Shield, title: "Access Control", description: "Phân quyền view, edit, download từng file/folder" },
      { icon: Network, title: "Sharing", description: "Chia sẻ internal và external với link bảo mật" },
      { icon: Clock, title: "Retention", description: "Chính sách lưu trữ, auto-archive, legal hold" },
    ],
    capabilities: [
      "File storage",
      "Folder management",
      "Version history",
      "Full-text search",
      "Access permissions",
      "External sharing",
      "Document templates",
      "Archive & retention",
    ],
    aiFeatures: [
      { title: "Auto Tagging", description: "AI tự động gắn tags dựa trên nội dung file" },
      { title: "Content OCR", description: "Nhận dạng text trong ảnh và PDF scan" },
      { title: "Smart Search", description: "Tìm kiếm thông minh với NLP" },
    ],
    stats: [
      { value: "5x", label: "Nhanh hơn tìm kiếm" },
      { value: "100%", label: "Version tracking" },
      { value: "256-bit", label: "Encryption" },
      { value: "99.9%", label: "Availability" },
    ],
  },
  project: {
    id: "project",
    name: "Project",
    fullName: "Project Management",
    tagline: "Quản lý dự án hiệu quả",
    description: "Lập kế hoạch, theo dõi tiến độ và cộng tác dự án với Kanban, Gantt chart. Quản lý resources và risks.",
    icon: FolderKanban,
    color: "purple",
    gradient: UNIFIED_GRADIENT,
    features: [
      { icon: Layers, title: "Project Planning", description: "WBS, milestones, dependencies với Gantt chart" },
      { icon: Activity, title: "Kanban Board", description: "Quản lý tasks trực quan với drag & drop" },
      { icon: Users, title: "Resource Management", description: "Phân bổ resources, workload balancing" },
      { icon: Clock, title: "Time Tracking", description: "Log giờ làm việc theo task, project" },
      { icon: Shield, title: "Risk Management", description: "Theo dõi risks, issues, mitigation plans" },
      { icon: BarChart3, title: "Progress Reports", description: "Báo cáo tiến độ, burndown chart, velocity" },
    ],
    capabilities: [
      "Project planning",
      "Task management",
      "Kanban boards",
      "Gantt charts",
      "Resource allocation",
      "Time tracking",
      "Risk register",
      "Status reporting",
    ],
    aiFeatures: [
      { title: "Schedule Optimization", description: "AI đề xuất lịch trình tối ưu dựa trên resources" },
      { title: "Risk Prediction", description: "Dự báo rủi ro delay dựa trên historical data" },
      { title: "Effort Estimation", description: "Ước lượng effort cho tasks mới" },
    ],
    stats: [
      { value: "30%", label: "Tăng on-time delivery" },
      { value: "25%", label: "Giảm budget overrun" },
      { value: "100%", label: "Task visibility" },
      { value: "Real-time", label: "Progress tracking" },
    ],
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.module as string;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigate back to modules section
  const handleBackToModules = useCallback(() => {
    // Store flag in sessionStorage to scroll after navigation
    sessionStorage.setItem("scrollToModules", "true");
    router.push("/");
  }, [router]);

  const moduleData = MODULES_DATA[moduleId];

  if (!moduleData) {
    notFound();
  }

  const Icon = moduleData.icon;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200" : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                  <span className="text-white font-bold text-xl">9</span>
                </div>
                <span className={`text-xl font-bold ${scrolled ? "text-slate-900" : "text-white"}`}>
                  9log<span className="text-red-500">.tech</span>
                </span>
              </Link>
              <span className={`hidden sm:block text-sm ${scrolled ? "text-slate-400" : "text-white/50"}`}>/</span>
              <span className={`hidden sm:block text-sm font-medium ${scrolled ? "text-slate-600" : "text-white/80"}`}>
                {moduleData.name}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToModules}
                className={`hidden sm:flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
                  scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
              <Link
                href="/register"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg shadow-red-500/30"
              >
                Dùng thử miễn phí
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={`relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-br ${moduleData.gradient}`}>
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Module Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-8">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">{moduleData.fullName}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {moduleData.tagline}
            </h1>

            {/* Description */}
            <p className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed">
              {moduleData.description}
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-white text-slate-900 hover:bg-white/90 rounded-xl transition-all shadow-xl"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl transition-all"
              >
                Xem demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {moduleData.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              Giao diện trực quan
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Thiết kế hiện đại, dễ sử dụng trên mọi thiết bị
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-end">
            {/* Desktop Screenshot */}
            <div className="lg:col-span-2 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-slate-900 rounded-2xl p-2 shadow-2xl">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 rounded-t-xl">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      <span>app.9log.tech/{moduleData.id}</span>
                    </div>
                  </div>
                </div>
                {/* Screenshot Container - Desktop Mockup UI */}
                <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-800 to-slate-900 rounded-b-xl overflow-hidden p-4">
                  {/* Sidebar mockup */}
                  <div className="absolute left-4 top-4 bottom-4 w-48 bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">9</span>
                      </div>
                      <span className="text-white/80 text-sm font-medium">9log.tech</span>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-8 rounded-md ${i === 1 ? 'bg-red-500/30 border border-red-500/50' : 'bg-slate-600/30'} flex items-center px-2 gap-2`}>
                          <div className="w-4 h-4 rounded bg-slate-500/50" />
                          <div className="h-2 bg-slate-500/50 rounded flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Main content mockup */}
                  <div className="ml-52 h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="h-3 w-24 bg-white/20 rounded mb-1" />
                          <div className="h-2 w-16 bg-white/10 rounded" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-slate-600/50 rounded-md" />
                        <div className="h-8 w-8 bg-red-500/50 rounded-md" />
                      </div>
                    </div>
                    {/* Stats cards */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {moduleData.stats.slice(0, 4).map((stat, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                          <div className="text-lg font-bold text-white/90">{stat.value}</div>
                          <div className="text-[10px] text-slate-400 truncate">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Chart area */}
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      <div className="col-span-2 bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                        <div className="h-2 w-20 bg-white/20 rounded mb-3" />
                        <div className="flex items-end gap-1 h-20">
                          {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-red-500/60 to-red-400/40 rounded-t" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                        <div className="h-2 w-16 bg-white/20 rounded mb-3" />
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="absolute inset-0 rounded-full border-4 border-slate-600/50" />
                          <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent border-r-transparent rotate-45" />
                          <div className="absolute inset-3 rounded-full bg-slate-800 flex items-center justify-center">
                            <span className="text-white/80 text-xs font-bold">75%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Monitor className="w-4 h-4" />
                <span>Desktop Dashboard</span>
              </div>
            </div>

            {/* Mobile Screenshot */}
            <div className="relative group mx-auto lg:mx-0 max-w-[280px]">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-600 rounded-[2.5rem] blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl">
                {/* Phone Frame */}
                <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-2xl z-10" />
                  {/* Screenshot Container - Mobile Mockup UI */}
                  <div className="relative aspect-[9/19] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] overflow-hidden p-4 pt-8">
                    {/* Status bar */}
                    <div className="flex justify-between items-center mb-4 text-[10px] text-white/50">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white/30 rounded-sm" />
                        <div className="w-4 h-2 bg-white/30 rounded-sm" />
                        <div className="w-6 h-2 bg-green-500/50 rounded-sm" />
                      </div>
                    </div>
                    {/* App header */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-semibold">{moduleData.name}</div>
                        <div className="text-[10px] text-white/50">Dashboard</div>
                      </div>
                    </div>
                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {moduleData.stats.slice(0, 2).map((stat, i) => (
                        <div key={i} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/30">
                          <div className="text-xl font-bold text-white">{stat.value}</div>
                          <div className="text-[9px] text-slate-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* List items */}
                    <div className="space-y-2">
                      {moduleData.features.slice(0, 4).map((feature, i) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <div key={i} className="bg-slate-700/30 rounded-lg p-2.5 flex items-center gap-2 border border-slate-600/20">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500/80 to-red-600/80 rounded-lg flex items-center justify-center">
                              <FeatureIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-[11px] font-medium truncate">{feature.title}</div>
                              <div className="text-[9px] text-white/40 truncate">{feature.description.slice(0, 30)}...</div>
                            </div>
                            <ArrowRight className="w-3 h-3 text-white/30" />
                          </div>
                        );
                      })}
                    </div>
                    {/* Bottom nav */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-800/80 backdrop-blur rounded-2xl p-2 flex justify-around">
                      {[Icon, BarChart3, Bell, Users].map((NavIcon, i) => (
                        <div key={i} className={`p-2 rounded-xl ${i === 0 ? 'bg-red-500/30' : ''}`}>
                          <NavIcon className={`w-5 h-5 ${i === 0 ? 'text-red-400' : 'text-white/40'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Smartphone className="w-4 h-4" />
                <span>Mobile App</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Giải pháp toàn diện cho mọi nhu cầu nghiệp vụ
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleData.features.map((feature, i) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={i}
                  className="group p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-xl hover:border-slate-300 transition-all"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <FeatureIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">AI-Powered Features</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Trí tuệ nhân tạo tích hợp
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              AI giúp tự động hóa, dự báo và đưa ra quyết định thông minh
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {moduleData.aiFeatures.map((ai, i) => (
              <div
                key={i}
                className="p-6 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl hover:border-white/20 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-yellow-500/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{ai.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{ai.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                Khả năng toàn diện
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                {moduleData.name} cung cấp đầy đủ các chức năng cần thiết để quản lý
                và tối ưu hóa nghiệp vụ của bạn.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {moduleData.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-700">{cap}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`relative aspect-square bg-gradient-to-br ${moduleData.gradient} rounded-3xl p-1`}>
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Icon className="w-32 h-32 text-white/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Sẵn sàng trải nghiệm {moduleData.name}?
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Đăng ký miễn phí và khám phá toàn bộ tính năng trong 14 ngày
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-xl shadow-red-500/30 hover:shadow-red-500/40"
            >
              Bắt đầu miễn phí
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={handleBackToModules}
              className="inline-flex items-center gap-2 px-8 py-4 text-white border border-white/30 hover:bg-white/10 font-semibold rounded-xl transition-all cursor-pointer"
            >
              Xem các modules khác
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">9</span>
              </div>
              <span className="text-lg font-bold text-white">
                9log<span className="text-red-500">.tech</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500">
              © 2025 9log.tech · Made with ❤️ in Vietnam
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

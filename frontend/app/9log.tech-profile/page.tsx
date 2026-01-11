"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Truck,
  Package,
  Users,
  Users2,
  Calculator,
  Anchor,
  Zap,
  Factory,
  Ship,
  Globe2,
  Brain,
  Shield,
  Target,
  Heart,
  Lightbulb,
  Rocket,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Facebook,
  CheckCircle2,
  Workflow,
  FolderOpen,
  FolderKanban,
  PiggyBank,
  BarChart3,
  Clock,
  Languages,
  TrendingUp,
  Network,
  Cpu,
  Cloud,
  Sparkles,
  Layers,
  ArrowRight,
  Building2,
  Handshake,
  LineChart,
  Route,
  Blocks,
  Mic,
  MicOff,
  Hand,
  Bot,
  MessageCircle,
} from "lucide-react";

// ============================================================================
// TRANSLATIONS - Bilingual VI/EN
// ============================================================================

const translations = {
  vi: {
    // Header
    home: "Trang chủ",
    companyProfile: "Company Profile",

    // Cover
    coverTitle: "Company Profile",
    coverSlogan: "AI-Powered ERP Logistics",
    coverTagline: "Made in Vietnam for Vietnam",
    coverYear: "2026",

    // Chapter 1: About
    chapter01: "Chương 01",
    aboutTitle: "Về 9log.tech",
    aboutContent1: "9log.tech là nền tảng ERP Logistics thế hệ mới, được phát triển hoàn toàn tại Việt Nam bởi đội ngũ am hiểu sâu sắc thị trường logistics nội địa.",
    aboutContent2: "Chúng tôi tin rằng công nghệ phải phục vụ con người, không phải ngược lại. 9log được thiết kế để đơn giản hóa nghiệp vụ phức tạp, tự động hóa công việc lặp lại, và giải phóng thời gian để doanh nghiệp tập trung vào tăng trưởng.",
    aboutContent3: "Với nền tảng AI tiên tiến, 9log không chỉ là phần mềm quản lý - đó là đối tác công nghệ giúp doanh nghiệp ra quyết định thông minh hơn.",
    founded: "Thành lập",
    headquarters: "Trụ sở",
    employees: "Founder",
    targetCustomers: "Mục tiêu 2026",
    hanoi: "Hà Nội",
    foundedYear: "2026",
    founderCount: "1",
    targetCount: "100 DN",

    // Chapter 2: Vietnam Logistics Context
    chapter02: "Chương 02",
    contextTitle: "Bối cảnh Logistics VN",
    contextStat1: "42 tỷ USD",
    contextStat1Label: "Quy mô thị trường 2025",
    contextStat2: "16-18%",
    contextStat2Label: "Chi phí logistics/GDP",
    contextStat3: "30,000+",
    contextStat3Label: "Doanh nghiệp logistics",
    contextStat4: "5-7%",
    contextStat4Label: "Tỷ lệ số hóa hiện tại",
    contextProblem: "Thách thức",
    contextProblem1: "Chi phí logistics cao gấp 2x so với khu vực",
    contextProblem2: "80% doanh nghiệp vẫn quản lý thủ công",
    contextProblem3: "Thiếu giải pháp phù hợp nghiệp vụ Việt Nam",

    // National Strategy
    strategyTitle: "Chiến lược Quốc gia",
    strategySubtitle: "Nghị quyết 163/NQ-CP về Logistics",
    strategyGoal1: "Giảm chi phí logistics xuống 15% GDP đến 2030",
    strategyGoal2: "Đứng top 50 thế giới về LPI đến 2025",
    strategyGoal3: "100% doanh nghiệp logistics ứng dụng CNTT đến 2030",
    strategyQuote: "9log.tech ra đời để góp phần hiện thực hóa mục tiêu quốc gia về số hóa logistics",

    // Vision & Mission
    visionLabel: "Tầm nhìn",
    visionTitle: "Vision 2030",
    visionStatement: "Trở thành nền tảng ERP Logistics số 1 Việt Nam, đồng hành cùng 10,000+ doanh nghiệp trong hành trình chuyển đổi số, góp phần đưa Việt Nam vào top 30 quốc gia có hệ thống logistics hiệu quả nhất thế giới.",
    milestones: "Lộ trình phát triển",
    milestone1: "100 DN tin dùng",
    milestone2: "1,000 DN & Series A",
    milestone3: "10,000 DN & IPO",

    missionLabel: "Sứ mệnh",
    missionTitle: "Mission",
    missionStatement: "Số hóa toàn diện ngành logistics Việt Nam, từ doanh nghiệp 1 người đến tập đoàn lớn, bằng công nghệ AI tiên tiến và giá cả phù hợp.",
    commitments: "Cam kết",
    commitment1: "Giải pháp 100% Việt hóa, hiểu nghiệp vụ địa phương",
    commitment2: "Chi phí hợp lý, ROI rõ ràng trong 3 tháng",
    commitment3: "Hỗ trợ triển khai và đào tạo miễn phí",
    commitment4: "Cập nhật tính năng liên tục theo phản hồi khách hàng",

    // Core Values
    valuesLabel: "Giá trị cốt lõi",
    valuesTitle: "DNA của 9log",
    valueCustomer: "Khách hàng là trọng tâm",
    valueCustomerDesc: "Mọi tính năng đều xuất phát từ nhu cầu thực tế của khách hàng",
    valueInnovation: "Đổi mới không ngừng",
    valueInnovationDesc: "Áp dụng công nghệ mới nhất để giải quyết bài toán cũ",
    valueIntegrity: "Minh bạch & Tin cậy",
    valueIntegrityDesc: "Định giá rõ ràng, không phí ẩn, bảo mật dữ liệu tuyệt đối",
    valueSpeed: "Nhanh & Hiệu quả",
    valueSpeedDesc: "Triển khai trong 24h, hỗ trợ phản hồi trong 1h",

    // Solutions Overview
    chapter03: "Chương 03",
    solutionsTitle: "Hệ sinh thái 9log",
    solutionsSubtitle: "13 Modules - 1 Nền tảng thống nhất",
    operations: "Operations (Vận hành)",
    backoffice: "Back-office & Tools",
    integration: "Tích hợp không giới hạn",
    integrationDesc: "API mở, kết nối với mọi hệ thống: HDDT, Ngân hàng, GPS, Cảng biển, Hải quan điện tử...",

    // Modules
    tmsName: "TMS",
    tmsDesc: "Quản lý vận tải",
    wmsName: "WMS",
    wmsDesc: "Quản lý kho bãi",
    fmsName: "FMS",
    fmsDesc: "Giao nhận quốc tế",
    pmsName: "PMS",
    pmsDesc: "Quản lý cảng biển",
    emsName: "EMS",
    emsDesc: "Chuyển phát nhanh",
    mesName: "MES",
    mesDesc: "Quản lý sản xuất",
    crmName: "CRM",
    crmDesc: "Quản lý khách hàng",
    hrmName: "HRM",
    hrmDesc: "Quản lý nhân sự",
    accName: "ACC",
    accDesc: "Kế toán tài chính",
    ctrlName: "CTRL",
    ctrlDesc: "Kiểm soát nội bộ",
    wfName: "WF",
    wfDesc: "Workflow tự động",
    dmsName: "DMS",
    dmsDesc: "Quản lý tài liệu",
    pmName: "PM",
    pmDesc: "Quản lý dự án",

    // AI Technology
    chapter04: "Chương 04",
    techTitle: "Công nghệ AI",
    techSubtitle: "Trí tuệ nhân tạo phục vụ logistics",
    techFeature1: "Dự báo nhu cầu",
    techFeature1Desc: "Machine Learning phân tích dữ liệu lịch sử, dự báo xu hướng với độ chính xác 95%+",
    techFeature2: "Tối ưu tuyến đường",
    techFeature2Desc: "Thuật toán VRP tiên tiến, tiết kiệm 20-30% chi phí nhiên liệu và thời gian",
    techFeature3: "Nhận dạng chứng từ",
    techFeature3Desc: "OCR + NLP tự động nhập liệu từ hóa đơn, chứng từ, giảm 90% thời gian nhập thủ công",
    techFeature4: "AI Assistant",
    techFeature4Desc: "Chatbot thông minh hỗ trợ nghiệp vụ 24/7, trả lời bằng tiếng Việt tự nhiên",

    // Platform Features
    featuresLabel: "Nền tảng",
    featuresTitle: "Công nghệ & Hạ tầng",
    feature1: "Cloud-Native",
    feature1Desc: "Chạy trên AWS/GCP, auto-scaling, 99.9% uptime SLA",
    feature2: "Real-time Sync",
    feature2Desc: "Dữ liệu đồng bộ tức thì giữa tất cả thiết bị và modules",
    feature3: "Mobile-First",
    feature3Desc: "Ứng dụng mobile iOS/Android cho mọi tính năng",
    feature4: "Bảo mật chuẩn quốc tế",
    feature4Desc: "Mã hóa AES-256, tuân thủ GDPR, backup tự động",
    feature5: "Multi-tenant",
    feature5Desc: "Hỗ trợ cấu trúc tập đoàn, đa chi nhánh, đa ngôn ngữ",

    // Open Economy & Integration
    chapter05: "Chương 05",
    openEconTitle: "Kinh tế mở & Hội nhập",
    openEconSubtitle: "Logistics là xương sống của nền kinh tế",
    openEconStat1: "17 FTAs",
    openEconStat1Label: "Hiệp định thương mại đã ký",
    openEconStat2: "700+ tỷ USD",
    openEconStat2Label: "Kim ngạch XNK 2024",
    openEconStat3: "Top 20",
    openEconStat3Label: "Nền kinh tế mở nhất thế giới",
    openEconContent: "Với vị thế là một trong những nền kinh tế mở nhất thế giới, Việt Nam cần hệ thống logistics hiện đại để tận dụng cơ hội từ các FTA như CPTPP, EVFTA, RCEP. 9log.tech được thiết kế để hỗ trợ doanh nghiệp Việt Nam hội nhập quốc tế.",

    // Digital Transformation
    dxTitle: "Chuyển đổi số Logistics",
    dxSubtitle: "Industry 4.0 & Smart Logistics",
    dxPoint1: "IoT & GPS Tracking",
    dxPoint1Desc: "Giám sát real-time xe, hàng hóa, container 24/7",
    dxPoint2: "Blockchain",
    dxPoint2Desc: "Truy xuất nguồn gốc, chứng từ điện tử bất biến",
    dxPoint3: "Big Data Analytics",
    dxPoint3Desc: "Dashboard KPIs, báo cáo thông minh, dự báo xu hướng",
    dxPoint4: "API Economy",
    dxPoint4Desc: "Kết nối hệ sinh thái đối tác, khách hàng, cơ quan nhà nước",

    // Roadmap
    chapter06: "Chương 06",
    roadmapTitle: "Lộ trình sản phẩm",
    roadmapSubtitle: "Từ MVP đến Platform hoàn chỉnh",
    roadmap2026Q1: "Q1/2026",
    roadmap2026Q1Content: "Ra mắt TMS & FMS core modules",
    roadmap2026Q2: "Q2/2026",
    roadmap2026Q2Content: "Bổ sung WMS, CRM, AI Assistant",
    roadmap2026Q3: "Q3/2026",
    roadmap2026Q3Content: "Mobile apps, integrations ecosystem",
    roadmap2026Q4: "Q4/2026",
    roadmap2026Q4Content: "HRM, ACC modules, Enterprise features",

    // Why 9log
    whyTitle: "Tại sao chọn 9log?",
    whySubtitle: "So sánh với giải pháp khác",
    why1Title: "vs Phần mềm nước ngoài",
    why1Content: "Phù hợp nghiệp vụ VN, hỗ trợ tiếng Việt, giá chỉ 1/5",
    why2Title: "vs Phần mềm nội địa cũ",
    why2Content: "Cloud-native, AI-powered, UX hiện đại, cập nhật liên tục",
    why3Title: "vs Tự phát triển",
    why3Content: "Triển khai ngay, tiết kiệm 90% chi phí & thời gian",

    // Partnership
    chapter07: "Chương 07",
    partnersTitle: "Đối tác & Hệ sinh thái",
    partnersSubtitle: "Cùng phát triển, cùng thành công",
    partnerType1: "Đối tác công nghệ",
    partnerType1Desc: "AWS, Google Cloud, VNPay, MISA, các nhà mạng...",
    partnerType2: "Đối tác triển khai",
    partnerType2Desc: "Các đơn vị tư vấn, tích hợp, đào tạo trên toàn quốc",
    partnerType3: "Hiệp hội ngành",
    partnerType3Desc: "VLA, VIFFAS, các hiệp hội logistics địa phương",
    partnerCTA: "Trở thành đối tác",

    // Target Customers
    customersTitle: "Khách hàng mục tiêu",
    customersSubtitle: "Ai nên sử dụng 9log?",
    customer1: "Công ty vận tải",
    customer1Desc: "Từ 5-500 xe, quản lý đội xe, điều vận, chi phí",
    customer2: "Forwarder",
    customer2Desc: "Giao nhận XNK, FCL/LCL, Air freight, Cross-border",
    customer3: "Kho bãi 3PL",
    customer3Desc: "Quản lý kho, fulfillment, WMS tích hợp",
    customer4: "Doanh nghiệp sản xuất",
    customer4Desc: "Logistics nội bộ, quản lý chuỗi cung ứng",

    // Founder
    founderTitle: "Founder",
    founderName: "Trần Trọng Bình",
    founderRole: "Founder & CEO",
    founderBio: "15+ năm kinh nghiệm IT & Logistics. Từng làm việc tại các tập đoàn logistics lớn. Đam mê ứng dụng công nghệ để giải quyết bài toán thực tế của ngành.",
    founderQuote: "\"Tôi tin rằng mọi doanh nghiệp logistics Việt Nam đều xứng đáng có công cụ công nghệ tốt nhất với chi phí hợp lý nhất.\"",

    // Contact
    contactLabel: "Liên hệ",
    contactTitle: "Kết nối với chúng tôi",
    address: "Địa chỉ",
    addressValue: "Hà Nội, Việt Nam",
    hotline: "Hotline",
    hotlineValue: "0963 280 588",
    email: "Email",
    emailValue: "contact@9log.tech",
    website: "Website",
    websiteValue: "www.9log.tech",
    followUs: "Theo dõi",

    // TMS Module
    tmsTitle: "TMS - Transport Management",
    tmsFullDesc: "Hệ thống quản lý vận tải toàn diện, từ điều vận đến theo dõi GPS real-time",
    tmsFeature1: "Quản lý đội xe & tài xế",
    tmsFeature2: "Điều vận thông minh với AI",
    tmsFeature3: "Theo dõi GPS real-time",
    tmsFeature4: "Quản lý chi phí & nhiên liệu",
    tmsFeature5: "Báo cáo KPIs tự động",

    // WMS Module
    wmsTitle: "WMS - Warehouse Management",
    wmsFullDesc: "Quản lý kho bãi hiện đại với barcode/RFID, tối ưu không gian lưu trữ",
    wmsFeature1: "Quản lý vị trí kho (Bin Location)",
    wmsFeature2: "Barcode & RFID scanning",
    wmsFeature3: "Kiểm kê tự động",
    wmsFeature4: "Pick & Pack optimization",
    wmsFeature5: "Tích hợp e-commerce",

    // FMS Module
    fmsTitle: "FMS - Freight Forwarding",
    fmsFullDesc: "Giao nhận quốc tế chuyên nghiệp, quản lý shipment từ A-Z",
    fmsFeature1: "Quản lý booking FCL/LCL",
    fmsFeature2: "Air/Sea/Road freight",
    fmsFeature3: "Customs declaration",
    fmsFeature4: "Tracking container",
    fmsFeature5: "Profit & Loss theo shipment",

    // CTA
    ctaTitle: "Sẵn sàng bắt đầu?",
    ctaSubtitle: "Đăng ký ngay hôm nay",
    ctaFeature1: "Dùng thử miễn phí 14 ngày",
    ctaFeature2: "Không cần thẻ tín dụng",
    ctaFeature3: "Hỗ trợ setup 1-1",
    ctaFeature4: "Huỷ bất cứ lúc nào",

    // Back cover
    thankYou: "Cảm ơn bạn đã quan tâm!",
    thankYouSub: "Hãy để 9log.tech đồng hành cùng doanh nghiệp của bạn trong hành trình chuyển đổi số logistics",
    startFree: "Đăng ký dùng thử miễn phí",
    backCoverTagline: "Nền tảng ERP Logistics tích hợp AI • Sản phẩm Việt Nam",

    // Navigation
    prevPage: "Trang trước",
    nextPage: "Trang sau",
    instructions: "Nhấn phím ← → hoặc click để lật trang",

    // Voice & Camera Control
    voiceControl: "Điều khiển giọng nói",
    voiceControlOn: "Giọng nói: BẬT",
    voiceControlOff: "Giọng nói: TẮT",
    voiceListening: "Đang nghe...",
    voiceCommands: "Nói \"tiếp\" hoặc \"lùi\" để lật trang",
    gestureControl: "Điều khiển cử chỉ",
    gestureControlOn: "Cử chỉ: BẬT",
    gestureControlOff: "Cử chỉ: TẮT",
    gestureInstructions: "Vẫy tay trái/phải để lật trang",
    presentationMode: "Chế độ thuyết trình",

    // AI Voice Assistant
    aiAssistant: "Trợ lý AI",
    aiAssistantOn: "AI: BẬT",
    aiAssistantOff: "AI: TẮT",
    aiListening: "Hỏi AI...",
    aiThinking: "Đang suy nghĩ...",
    aiAskQuestion: "Hãy hỏi về 9log.tech",
  },
  en: {
    // Header
    home: "Home",
    companyProfile: "Company Profile",

    // Cover
    coverTitle: "Company Profile",
    coverSlogan: "AI-Powered ERP Logistics",
    coverTagline: "Made in Vietnam for Vietnam",
    coverYear: "2026",

    // Chapter 1: About
    chapter01: "Chapter 01",
    aboutTitle: "About 9log.tech",
    aboutContent1: "9log.tech is a next-generation ERP Logistics platform, fully developed in Vietnam by a team with deep understanding of the local logistics market.",
    aboutContent2: "We believe technology should serve people, not the other way around. 9log is designed to simplify complex operations, automate repetitive tasks, and free up time for businesses to focus on growth.",
    aboutContent3: "With advanced AI capabilities, 9log is not just management software - it's a technology partner that helps businesses make smarter decisions.",
    founded: "Founded",
    headquarters: "Headquarters",
    employees: "Founder",
    targetCustomers: "2026 Target",
    hanoi: "Hanoi",
    foundedYear: "2026",
    founderCount: "1",
    targetCount: "100 Clients",

    // Chapter 2: Vietnam Logistics Context
    chapter02: "Chapter 02",
    contextTitle: "Vietnam Logistics Context",
    contextStat1: "$42B",
    contextStat1Label: "Market size 2025",
    contextStat2: "16-18%",
    contextStat2Label: "Logistics cost/GDP",
    contextStat3: "30,000+",
    contextStat3Label: "Logistics companies",
    contextStat4: "5-7%",
    contextStat4Label: "Current digitization rate",
    contextProblem: "Challenges",
    contextProblem1: "Logistics costs 2x higher than regional average",
    contextProblem2: "80% of companies still manage manually",
    contextProblem3: "Lack of solutions tailored for Vietnamese operations",

    // National Strategy
    strategyTitle: "National Strategy",
    strategySubtitle: "Resolution 163/NQ-CP on Logistics",
    strategyGoal1: "Reduce logistics costs to 15% of GDP by 2030",
    strategyGoal2: "Top 50 globally in LPI by 2025",
    strategyGoal3: "100% logistics companies adopt IT by 2030",
    strategyQuote: "9log.tech was born to help realize the national goal of logistics digitization",

    // Vision & Mission
    visionLabel: "Vision",
    visionTitle: "Vision 2030",
    visionStatement: "Become Vietnam's #1 ERP Logistics platform, partnering with 10,000+ businesses in digital transformation, contributing to Vietnam's position in the top 30 countries with the most efficient logistics systems globally.",
    milestones: "Development Roadmap",
    milestone1: "100 trusted clients",
    milestone2: "1,000 clients & Series A",
    milestone3: "10,000 clients & IPO",

    missionLabel: "Mission",
    missionTitle: "Mission",
    missionStatement: "Fully digitize Vietnam's logistics industry, from solopreneurs to large corporations, with advanced AI technology at affordable prices.",
    commitments: "Commitments",
    commitment1: "100% localized solution, understanding local operations",
    commitment2: "Reasonable cost, clear ROI within 3 months",
    commitment3: "Free implementation support and training",
    commitment4: "Continuous feature updates based on customer feedback",

    // Core Values
    valuesLabel: "Core Values",
    valuesTitle: "9log DNA",
    valueCustomer: "Customer-Centric",
    valueCustomerDesc: "Every feature stems from real customer needs",
    valueInnovation: "Continuous Innovation",
    valueInnovationDesc: "Apply latest technology to solve old problems",
    valueIntegrity: "Transparent & Trustworthy",
    valueIntegrityDesc: "Clear pricing, no hidden fees, absolute data security",
    valueSpeed: "Fast & Efficient",
    valueSpeedDesc: "Deploy in 24h, support response in 1h",

    // Solutions Overview
    chapter03: "Chapter 03",
    solutionsTitle: "9log Ecosystem",
    solutionsSubtitle: "13 Modules - 1 Unified Platform",
    operations: "Operations",
    backoffice: "Back-office & Tools",
    integration: "Unlimited Integration",
    integrationDesc: "Open API, connect with any system: E-invoicing, Banks, GPS, Ports, E-customs...",

    // Modules
    tmsName: "TMS",
    tmsDesc: "Transport Management",
    wmsName: "WMS",
    wmsDesc: "Warehouse Management",
    fmsName: "FMS",
    fmsDesc: "Freight Forwarding",
    pmsName: "PMS",
    pmsDesc: "Port Management",
    emsName: "EMS",
    emsDesc: "Express Delivery",
    mesName: "MES",
    mesDesc: "Manufacturing",
    crmName: "CRM",
    crmDesc: "Customer Management",
    hrmName: "HRM",
    hrmDesc: "HR Management",
    accName: "ACC",
    accDesc: "Accounting & Finance",
    ctrlName: "CTRL",
    ctrlDesc: "Internal Control",
    wfName: "WF",
    wfDesc: "Workflow Automation",
    dmsName: "DMS",
    dmsDesc: "Document Management",
    pmName: "PM",
    pmDesc: "Project Management",

    // AI Technology
    chapter04: "Chapter 04",
    techTitle: "AI Technology",
    techSubtitle: "Artificial Intelligence for Logistics",
    techFeature1: "Demand Forecasting",
    techFeature1Desc: "Machine Learning analyzes historical data, forecasts trends with 95%+ accuracy",
    techFeature2: "Route Optimization",
    techFeature2Desc: "Advanced VRP algorithms, saving 20-30% on fuel and time",
    techFeature3: "Document Recognition",
    techFeature3Desc: "OCR + NLP auto-extracts data from invoices, documents, reducing 90% manual entry",
    techFeature4: "AI Assistant",
    techFeature4Desc: "Smart chatbot for 24/7 operations support, answers in natural Vietnamese",

    // Platform Features
    featuresLabel: "Platform",
    featuresTitle: "Technology & Infrastructure",
    feature1: "Cloud-Native",
    feature1Desc: "Runs on AWS/GCP, auto-scaling, 99.9% uptime SLA",
    feature2: "Real-time Sync",
    feature2Desc: "Instant data sync across all devices and modules",
    feature3: "Mobile-First",
    feature3Desc: "iOS/Android mobile apps for all features",
    feature4: "International Security Standards",
    feature4Desc: "AES-256 encryption, GDPR compliant, auto backup",
    feature5: "Multi-tenant",
    feature5Desc: "Supports group structure, multi-branch, multi-language",

    // Open Economy & Integration
    chapter05: "Chapter 05",
    openEconTitle: "Open Economy & Integration",
    openEconSubtitle: "Logistics is the backbone of the economy",
    openEconStat1: "17 FTAs",
    openEconStat1Label: "Trade agreements signed",
    openEconStat2: "$700B+",
    openEconStat2Label: "Import-Export 2024",
    openEconStat3: "Top 20",
    openEconStat3Label: "Most open economy globally",
    openEconContent: "As one of the world's most open economies, Vietnam needs modern logistics systems to leverage opportunities from FTAs like CPTPP, EVFTA, RCEP. 9log.tech is designed to help Vietnamese businesses integrate internationally.",

    // Digital Transformation
    dxTitle: "Logistics Digital Transformation",
    dxSubtitle: "Industry 4.0 & Smart Logistics",
    dxPoint1: "IoT & GPS Tracking",
    dxPoint1Desc: "24/7 real-time monitoring of vehicles, cargo, containers",
    dxPoint2: "Blockchain",
    dxPoint2Desc: "Traceability, immutable electronic documents",
    dxPoint3: "Big Data Analytics",
    dxPoint3Desc: "KPI dashboards, smart reports, trend forecasting",
    dxPoint4: "API Economy",
    dxPoint4Desc: "Connect partner ecosystem, customers, government agencies",

    // Roadmap
    chapter06: "Chapter 06",
    roadmapTitle: "Product Roadmap",
    roadmapSubtitle: "From MVP to Complete Platform",
    roadmap2026Q1: "Q1/2026",
    roadmap2026Q1Content: "Launch TMS & FMS core modules",
    roadmap2026Q2: "Q2/2026",
    roadmap2026Q2Content: "Add WMS, CRM, AI Assistant",
    roadmap2026Q3: "Q3/2026",
    roadmap2026Q3Content: "Mobile apps, integrations ecosystem",
    roadmap2026Q4: "Q4/2026",
    roadmap2026Q4Content: "HRM, ACC modules, Enterprise features",

    // Why 9log
    whyTitle: "Why choose 9log?",
    whySubtitle: "Compared to other solutions",
    why1Title: "vs Foreign Software",
    why1Content: "Fits VN operations, Vietnamese support, 1/5 the price",
    why2Title: "vs Legacy Local Software",
    why2Content: "Cloud-native, AI-powered, modern UX, continuous updates",
    why3Title: "vs Build In-house",
    why3Content: "Deploy immediately, save 90% cost & time",

    // Partnership
    chapter07: "Chapter 07",
    partnersTitle: "Partners & Ecosystem",
    partnersSubtitle: "Grow together, succeed together",
    partnerType1: "Technology Partners",
    partnerType1Desc: "AWS, Google Cloud, VNPay, MISA, telecom providers...",
    partnerType2: "Implementation Partners",
    partnerType2Desc: "Consulting, integration, training partners nationwide",
    partnerType3: "Industry Associations",
    partnerType3Desc: "VLA, VIFFAS, local logistics associations",
    partnerCTA: "Become a Partner",

    // Target Customers
    customersTitle: "Target Customers",
    customersSubtitle: "Who should use 9log?",
    customer1: "Trucking Companies",
    customer1Desc: "5-500 vehicles, fleet management, dispatch, costs",
    customer2: "Forwarders",
    customer2Desc: "Import/Export forwarding, FCL/LCL, Air freight, Cross-border",
    customer3: "3PL Warehouses",
    customer3Desc: "Warehouse management, fulfillment, integrated WMS",
    customer4: "Manufacturers",
    customer4Desc: "Internal logistics, supply chain management",

    // Founder
    founderTitle: "Founder",
    founderName: "Tran Trong Binh",
    founderRole: "Founder & CEO",
    founderBio: "15+ years experience in IT & Logistics. Worked at major logistics corporations. Passionate about applying technology to solve real industry problems.",
    founderQuote: "\"I believe every Vietnamese logistics business deserves the best technology tools at the most reasonable cost.\"",

    // Contact
    contactLabel: "Contact",
    contactTitle: "Connect with Us",
    address: "Address",
    addressValue: "Hanoi, Vietnam",
    hotline: "Hotline",
    hotlineValue: "0963 280 588",
    email: "Email",
    emailValue: "contact@9log.tech",
    website: "Website",
    websiteValue: "www.9log.tech",
    followUs: "Follow Us",

    // TMS Module
    tmsTitle: "TMS - Transport Management",
    tmsFullDesc: "Complete transport management system, from dispatch to real-time GPS tracking",
    tmsFeature1: "Fleet & driver management",
    tmsFeature2: "AI-powered dispatching",
    tmsFeature3: "Real-time GPS tracking",
    tmsFeature4: "Cost & fuel management",
    tmsFeature5: "Automated KPI reports",

    // WMS Module
    wmsTitle: "WMS - Warehouse Management",
    wmsFullDesc: "Modern warehouse management with barcode/RFID, optimized storage space",
    wmsFeature1: "Bin Location management",
    wmsFeature2: "Barcode & RFID scanning",
    wmsFeature3: "Automated inventory",
    wmsFeature4: "Pick & Pack optimization",
    wmsFeature5: "E-commerce integration",

    // FMS Module
    fmsTitle: "FMS - Freight Forwarding",
    fmsFullDesc: "Professional international freight forwarding, A-Z shipment management",
    fmsFeature1: "FCL/LCL booking management",
    fmsFeature2: "Air/Sea/Road freight",
    fmsFeature3: "Customs declaration",
    fmsFeature4: "Container tracking",
    fmsFeature5: "P&L per shipment",

    // CTA
    ctaTitle: "Ready to start?",
    ctaSubtitle: "Sign up today",
    ctaFeature1: "Free 14-day trial",
    ctaFeature2: "No credit card required",
    ctaFeature3: "1-on-1 setup support",
    ctaFeature4: "Cancel anytime",

    // Back cover
    thankYou: "Thank you for your interest!",
    thankYouSub: "Let 9log.tech accompany your business on the journey of logistics digital transformation",
    startFree: "Sign up for free trial",
    backCoverTagline: "AI-Powered ERP Logistics • Made in Vietnam",

    // Navigation
    prevPage: "Previous",
    nextPage: "Next",
    instructions: "Press ← → or click to flip pages",

    // Voice & Camera Control
    voiceControl: "Voice Control",
    voiceControlOn: "Voice: ON",
    voiceControlOff: "Voice: OFF",
    voiceListening: "Listening...",
    voiceCommands: "Say \"next\" or \"back\" to flip pages",
    gestureControl: "Gesture Control",
    gestureControlOn: "Gesture: ON",
    gestureControlOff: "Gesture: OFF",
    gestureInstructions: "Wave left/right to flip pages",
    presentationMode: "Presentation Mode",

    // AI Voice Assistant
    aiAssistant: "AI Assistant",
    aiAssistantOn: "AI: ON",
    aiAssistantOff: "AI: OFF",
    aiListening: "Ask AI...",
    aiThinking: "Thinking...",
    aiAskQuestion: "Ask about 9log.tech",
  },
};

type Language = "vi" | "en";

// ============================================================================
// BOOK SPREADS - 16 pages (8 spreads + cover + backcover = 10 total spreads)
// ============================================================================

// Logistics images from Unsplash
const IMAGES = {
  hero: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  truck: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80",
  warehouse: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
  container: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80",
  port: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80",
  ship: "https://images.unsplash.com/photo-1577993699865-81957d58c697?w=800&q=80",
  forklift: "https://images.unsplash.com/photo-1586528116493-a029325540fa?w=800&q=80",
  team: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  tech: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
  dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  vietnam: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
  cargo: "https://images.unsplash.com/photo-1605732562742-3023a888e56e?w=800&q=80",
  delivery: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&q=80",
  network: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
  globe: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80",
  // Better AI image - neural network visualization
  ai: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
  // Global trade/integration image
  globalTrade: "https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?w=800&q=80",
  // Roadmap/timeline - modern logistics
  roadmap: "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=800&q=80",
  // AI support - 24/7 chatbot
  aiSupport: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&q=80",
};

const BOOK_SPREADS = [
  { type: "cover", isSingle: true },
  { type: "spread", left: { type: "about", pageNum: 1 }, right: { type: "heroImage", pageNum: 2 } },
  { type: "spread", left: { type: "context", pageNum: 3 }, right: { type: "contextStats", pageNum: 4 } },
  { type: "spread", left: { type: "strategy", pageNum: 5 }, right: { type: "strategyImage", pageNum: 6 } },
  { type: "spread", left: { type: "vision", pageNum: 7 }, right: { type: "visionImage", pageNum: 8 } },
  { type: "spread", left: { type: "mission", pageNum: 9 }, right: { type: "values", pageNum: 10 } },
  { type: "spread", left: { type: "tmsModule", pageNum: 11 }, right: { type: "tmsImage", pageNum: 12 } },
  { type: "spread", left: { type: "wmsModule", pageNum: 13 }, right: { type: "wmsImage", pageNum: 14 } },
  { type: "spread", left: { type: "fmsModule", pageNum: 15 }, right: { type: "fmsImage", pageNum: 16 } },
  { type: "spread", left: { type: "solutions1", pageNum: 17 }, right: { type: "solutions2", pageNum: 18 } },
  { type: "spread", left: { type: "technology", pageNum: 19 }, right: { type: "aiImage", pageNum: 20 } },
  { type: "spread", left: { type: "platform", pageNum: 21 }, right: { type: "techImage", pageNum: 22 } },
  { type: "spread", left: { type: "openeconomy", pageNum: 23 }, right: { type: "globeImage", pageNum: 24 } },
  { type: "spread", left: { type: "dx", pageNum: 25 }, right: { type: "dxImage", pageNum: 26 } },
  { type: "spread", left: { type: "customers", pageNum: 27 }, right: { type: "customersImage", pageNum: 28 } },
  { type: "spread", left: { type: "partners", pageNum: 29 }, right: { type: "partnersImage", pageNum: 30 } },
  { type: "spread", left: { type: "roadmap", pageNum: 31 }, right: { type: "roadmapImage", pageNum: 32 } },
  { type: "spread", left: { type: "why9log", pageNum: 33 }, right: { type: "whyImage", pageNum: 34 } },
  { type: "spread", left: { type: "founder", pageNum: 35 }, right: { type: "teamImage", pageNum: 36 } },
  { type: "spread", left: { type: "contact", pageNum: 37 }, right: { type: "officeImage", pageNum: 38 } },
  { type: "spread", left: { type: "cta", pageNum: 39 }, right: { type: "ctaImage", pageNum: 40 } },
  { type: "backcover", isSingle: true },
];

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function EmbossedTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`relative ${className}`}>
      <span className="absolute inset-0 text-slate-300/50 translate-x-[1px] translate-y-[1px]">{children}</span>
      <span className="absolute inset-0 text-white/80 -translate-x-[0.5px] -translate-y-[0.5px]">{children}</span>
      <span className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">{children}</span>
    </h2>
  );
}

function TechTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`relative font-bold tracking-tight ${className}`}>
      <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{children}</span>
    </h2>
  );
}

function CornerOrnament({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const rotations = { tl: "rotate-0", tr: "rotate-90", br: "rotate-180", bl: "-rotate-90" };
  const positions = { tl: "top-2 left-2", tr: "top-2 right-2", bl: "bottom-2 left-2", br: "bottom-2 right-2" };
  return (
    <div className={`absolute ${positions[position]} w-4 h-4 ${rotations[position]} opacity-30`}>
      <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
        <path d="M0 0 L12 0 L12 2 L2 2 L2 12 L0 12 Z" fill="currentColor" className="text-cyan-500" />
      </svg>
    </div>
  );
}

function PageNumber({ num, side, dark = false }: { num: number; side: "left" | "right"; dark?: boolean }) {
  return (
    <div className={`absolute bottom-3 ${side === "left" ? "left-4" : "right-4"} flex items-center gap-1.5 text-[11px] ${dark ? "text-slate-300" : "text-slate-500"}`}>
      {side === "left" && <span className={`w-4 h-px ${dark ? "bg-slate-500" : "bg-slate-300"}`} />}
      <span className="font-mono font-medium">{num.toString().padStart(2, "0")}</span>
      {side === "right" && <span className={`w-4 h-px ${dark ? "bg-slate-500" : "bg-slate-300"}`} />}
    </div>
  );
}

function PageTexture() {
  return (
    <>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMDMiLz48L3N2Zz4=')] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-slate-100/30" />
    </>
  );
}

function TechBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
    </>
  );
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

function CoverPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      <div className="absolute inset-3 border border-cyan-500/20 rounded-lg" />
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/40 via-white/5 to-transparent" />

      <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
        {/* Logo */}
        <div className="mb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur-xl opacity-50" />
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-xl px-5 py-2 shadow-2xl">
            <span className="text-5xl font-black text-white">9</span>
          </div>
        </div>

        <div className="relative mb-3">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">log</span>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">.tech</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-cyan-500/50" />
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-purple-500/50" />
        </div>

        <h2 className="text-lg font-medium text-slate-300 tracking-wide mb-1">{t.coverTitle}</h2>
        <p className="text-sm bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-semibold mb-1">{t.coverSlogan}</p>
        <p className="text-xs text-slate-500 italic">{t.coverTagline}</p>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="px-3 py-1 border border-cyan-500/30 rounded-full bg-slate-900/50 backdrop-blur">
            <span className="text-cyan-400 tracking-[0.3em] text-xs font-mono">{t.coverYear}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackCoverPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-bl from-slate-900 via-blue-950 to-slate-900" />
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-3 border border-cyan-500/20 rounded-lg" />
      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-black/40 via-white/5 to-transparent" />

      <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">{t.thankYou}</h2>
        <p className="text-slate-400 mb-6 max-w-xs leading-relaxed text-xs">{t.thankYouSub}</p>

        <Link
          href="/register"
          className="group inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 text-sm"
        >
          {t.startFree}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <span className="bg-gradient-to-br from-red-500 to-red-600 rounded-l px-1.5 py-0.5 text-white font-bold text-sm">9</span>
            <span className="text-white font-bold text-sm -ml-0.5">log<span className="text-cyan-400">.tech</span></span>
          </div>
          <p className="text-slate-500 text-[10px]">{t.backCoverTagline}</p>
        </div>
      </div>
    </div>
  );
}

function AboutPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.chapter01}</p>
          <EmbossedTitle className="text-lg font-bold">{t.aboutTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="flex-1 overflow-auto text-[11px] leading-relaxed space-y-2">
          <p className="text-slate-700 first-letter:text-2xl first-letter:font-bold first-letter:text-cyan-600 first-letter:float-left first-letter:mr-1">
            {t.aboutContent1}
          </p>
          <p className="text-slate-600">{t.aboutContent2}</p>
          <p className="text-slate-600">{t.aboutContent3}</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-3">
          {[
            { label: t.founded, value: t.foundedYear, icon: Clock },
            { label: t.headquarters, value: t.hanoi, icon: Building2 },
            { label: t.employees, value: t.founderCount, icon: Users },
            { label: t.targetCustomers, value: t.targetCount, icon: Target },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-lg p-2 border border-slate-200/50 shadow-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">{item.label}</div>
                  <div className="text-xs font-bold text-slate-800">{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={1} side="left" />
    </div>
  );
}

function ContextPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.chapter02}</p>
          <EmbossedTitle className="text-lg font-bold">{t.contextTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { value: t.contextStat1, label: t.contextStat1Label },
            { value: t.contextStat2, label: t.contextStat2Label },
            { value: t.contextStat3, label: t.contextStat3Label },
            { value: t.contextStat4, label: t.contextStat4Label },
          ].map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-2 text-center">
              <div className="text-base font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-[8px] text-slate-400 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-lg p-2.5 border border-slate-200/50">
          <h3 className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Target className="w-3 h-3" />
            {t.contextProblem}
          </h3>
          <div className="space-y-1.5">
            {[t.contextProblem1, t.contextProblem2, t.contextProblem3].map((problem, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PageNumber num={3} side="right" />
    </div>
  );
}

function StrategyPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <TechTitle className="text-lg">{t.strategyTitle}</TechTitle>
          <p className="text-slate-400 text-[10px] mt-0.5">{t.strategySubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-2 flex-1">
          {[t.strategyGoal1, t.strategyGoal2, t.strategyGoal3].map((goal, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-lg p-2.5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0 text-white font-bold text-[10px]">
                {i + 1}
              </div>
              <span className="text-white text-[11px]">{goal}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg p-3 border border-cyan-500/30">
          <p className="text-cyan-300 text-[10px] italic text-center leading-relaxed">"{t.strategyQuote}"</p>
        </div>
      </div>
      <PageNumber num={5} side="left" dark />
    </div>
  );
}

function VisionPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-400 font-mono text-[10px] mb-0.5">{t.visionLabel}</p>
          <TechTitle className="text-lg">{t.visionTitle}</TechTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="bg-white/5 backdrop-blur rounded-lg p-3 mb-3 border border-white/10">
          <Target className="w-5 h-5 text-cyan-400 mb-2" />
          <p className="text-white text-[11px] leading-relaxed">{t.visionStatement}</p>
        </div>

        <div className="flex-1">
          <h3 className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide mb-2">{t.milestones}</h3>
          {[
            { year: "2026", goal: t.milestone1 },
            { year: "2028", goal: t.milestone2 },
            { year: "2030", goal: t.milestone3 },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 mb-1.5 border border-white/10">
              <span className="text-cyan-400 font-mono font-bold text-[10px]">{item.year}</span>
              <div className="w-px h-3 bg-slate-600" />
              <span className="text-slate-300 text-[10px]">{item.goal}</span>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={8} side="right" dark />
    </div>
  );
}

function MissionPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.missionLabel}</p>
          <EmbossedTitle className="text-lg font-bold">{t.missionTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg p-3 mb-3 text-white shadow-lg">
          <Rocket className="w-5 h-5 mb-1.5 text-white/90" />
          <p className="text-[11px] leading-relaxed">{t.missionStatement}</p>
        </div>

        <div className="flex-1">
          <h3 className="text-[10px] font-semibold text-slate-800 uppercase tracking-wide mb-2">{t.commitments}</h3>
          {[t.commitment1, t.commitment2, t.commitment3, t.commitment4].map((text, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 mb-1.5 border border-slate-200/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className="text-slate-700 text-[10px]">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={9} side="left" />
    </div>
  );
}

function ValuesPage({ t }: { t: typeof translations.vi }) {
  const values = [
    { icon: Heart, title: t.valueCustomer, desc: t.valueCustomerDesc, color: "from-rose-500 to-pink-500" },
    { icon: Lightbulb, title: t.valueInnovation, desc: t.valueInnovationDesc, color: "from-amber-500 to-orange-500" },
    { icon: Shield, title: t.valueIntegrity, desc: t.valueIntegrityDesc, color: "from-cyan-500 to-blue-500" },
    { icon: Zap, title: t.valueSpeed, desc: t.valueSpeedDesc, color: "from-violet-500 to-purple-500" },
  ];

  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.valuesLabel}</p>
          <EmbossedTitle className="text-lg font-bold">{t.valuesTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {values.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-200/50">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-1.5 shadow-md`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <h4 className="font-bold text-slate-800 text-[10px] mb-0.5">{item.title}</h4>
                <p className="text-[9px] text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={10} side="right" />
    </div>
  );
}

function Solutions1Page({ t }: { t: typeof translations.vi }) {
  const modules = [
    { name: t.tmsName, desc: t.tmsDesc, icon: Truck, color: "from-blue-500 to-blue-600" },
    { name: t.wmsName, desc: t.wmsDesc, icon: Package, color: "from-amber-500 to-amber-600" },
    { name: t.fmsName, desc: t.fmsDesc, icon: Ship, color: "from-emerald-500 to-emerald-600" },
    { name: t.pmsName, desc: t.pmsDesc, icon: Anchor, color: "from-cyan-500 to-cyan-600" },
    { name: t.emsName, desc: t.emsDesc, icon: Zap, color: "from-orange-500 to-orange-600" },
    { name: t.mesName, desc: t.mesDesc, icon: Factory, color: "from-slate-500 to-slate-600" },
  ];

  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-2">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.chapter03}</p>
          <EmbossedTitle className="text-base font-bold">{t.solutionsTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[9px]">{t.solutionsSubtitle}</p>
          <div className="mt-1 w-10 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <h3 className="text-[9px] font-semibold text-slate-800 uppercase tracking-wide mb-1.5">{t.operations}</h3>

        <div className="grid grid-cols-2 gap-1 flex-1 content-start">
          {modules.map((module, i) => {
            const Icon = module.icon;
            return (
              <div key={i} className="flex items-center gap-1.5 bg-white rounded-lg p-1.5 shadow-sm border border-slate-200/50">
                <div className={`w-6 h-6 rounded bg-gradient-to-br ${module.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-[10px]">{module.name}</h4>
                  <p className="text-[8px] text-slate-500 truncate">{module.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={17} side="left" />
    </div>
  );
}

function Solutions2Page({ t }: { t: typeof translations.vi }) {
  const modules = [
    { name: t.crmName, desc: t.crmDesc, icon: Users2, color: "from-rose-500 to-rose-600" },
    { name: t.hrmName, desc: t.hrmDesc, icon: Users, color: "from-violet-500 to-violet-600" },
    { name: t.accName, desc: t.accDesc, icon: Calculator, color: "from-green-500 to-green-600" },
    { name: t.ctrlName, desc: t.ctrlDesc, icon: PiggyBank, color: "from-pink-500 to-pink-600" },
    { name: t.wfName, desc: t.wfDesc, icon: Workflow, color: "from-indigo-500 to-indigo-600" },
    { name: t.dmsName, desc: t.dmsDesc, icon: FolderOpen, color: "from-yellow-500 to-yellow-600" },
    { name: t.pmName, desc: t.pmDesc, icon: FolderKanban, color: "from-purple-500 to-purple-600" },
  ];

  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />

      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-[9px] font-semibold text-slate-800 uppercase tracking-wide mb-1.5">{t.backoffice}</h3>

        <div className="grid grid-cols-2 gap-1 flex-1 content-start">
          {modules.map((module, i) => {
            const Icon = module.icon;
            return (
              <div key={i} className="flex items-center gap-1.5 bg-white rounded-lg p-1.5 shadow-sm border border-slate-200/50">
                <div className={`w-6 h-6 rounded bg-gradient-to-br ${module.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-[10px]">{module.name}</h4>
                  <p className="text-[8px] text-slate-500 truncate">{module.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-2.5 text-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-[10px]">{t.integration}</span>
          </div>
          <p className="text-[9px] text-slate-300">{t.integrationDesc}</p>
        </div>
      </div>
      <PageNumber num={18} side="right" />
    </div>
  );
}

function TechnologyPage({ t }: { t: typeof translations.vi }) {
  const features = [
    { title: t.techFeature1, desc: t.techFeature1Desc, icon: LineChart },
    { title: t.techFeature2, desc: t.techFeature2Desc, icon: Route },
    { title: t.techFeature3, desc: t.techFeature3Desc, icon: Blocks },
    { title: t.techFeature4, desc: t.techFeature4Desc, icon: Brain },
  ];

  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-400 font-mono text-[10px] mb-0.5">{t.chapter04}</p>
          <TechTitle className="text-lg">{t.techTitle}</TechTitle>
          <p className="text-slate-400 text-[9px]">{t.techSubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="flex justify-center mb-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-lg opacity-50" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <h4 className="font-semibold text-white text-[10px]">{item.title}</h4>
                </div>
                <p className="text-[9px] text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={19} side="left" dark />
    </div>
  );
}

function PlatformPage({ t }: { t: typeof translations.vi }) {
  const features = [
    { icon: Cloud, title: t.feature1, desc: t.feature1Desc },
    { icon: Zap, title: t.feature2, desc: t.feature2Desc },
    { icon: Phone, title: t.feature3, desc: t.feature3Desc },
    { icon: Shield, title: t.feature4, desc: t.feature4Desc },
    { icon: Layers, title: t.feature5, desc: t.feature5Desc },
  ];

  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-400 font-mono text-[10px] mb-0.5">{t.featuresLabel}</p>
          <TechTitle className="text-lg">{t.featuresTitle}</TechTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-1.5 flex-1">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-lg p-2 border border-white/10">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-[10px]">{item.title}</h4>
                  <p className="text-[9px] text-slate-400">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={21} side="left" dark />
    </div>
  );
}

function OpenEconomyPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-2">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.chapter05}</p>
          <EmbossedTitle className="text-base font-bold">{t.openEconTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[9px]">{t.openEconSubtitle}</p>
          <div className="mt-1 w-10 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2">
          {[
            { value: t.openEconStat1, label: t.openEconStat1Label },
            { value: t.openEconStat2, label: t.openEconStat2Label },
            { value: t.openEconStat3, label: t.openEconStat3Label },
          ].map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-2 text-center">
              <div className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-[7px] text-slate-400 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-lg p-2.5 border border-slate-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Globe2 className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-slate-800 text-[10px]">CPTPP • EVFTA • RCEP</span>
          </div>
          <p className="text-[9px] text-slate-600 leading-relaxed">{t.openEconContent}</p>
        </div>
      </div>
      <PageNumber num={23} side="left" />
    </div>
  );
}

function DxPage({ t }: { t: typeof translations.vi }) {
  const points = [
    { icon: MapPin, title: t.dxPoint1, desc: t.dxPoint1Desc },
    { icon: Blocks, title: t.dxPoint2, desc: t.dxPoint2Desc },
    { icon: BarChart3, title: t.dxPoint3, desc: t.dxPoint3Desc },
    { icon: Network, title: t.dxPoint4, desc: t.dxPoint4Desc },
  ];

  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-2">
          <EmbossedTitle className="text-base font-bold">{t.dxTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[9px]">{t.dxSubtitle}</p>
          <div className="mt-1 w-10 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-1.5 flex-1">
          {points.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-lg p-2 shadow-sm border border-slate-200/50">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-[10px]">{item.title}</h4>
                </div>
                <p className="text-[9px] text-slate-600 pl-6">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={25} side="left" />
    </div>
  );
}

function RoadmapPage({ t }: { t: typeof translations.vi }) {
  const roadmap = [
    { quarter: t.roadmap2026Q1, content: t.roadmap2026Q1Content },
    { quarter: t.roadmap2026Q2, content: t.roadmap2026Q2Content },
    { quarter: t.roadmap2026Q3, content: t.roadmap2026Q3Content },
    { quarter: t.roadmap2026Q4, content: t.roadmap2026Q4Content },
  ];

  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-400 font-mono text-[10px] mb-0.5">{t.chapter06}</p>
          <TechTitle className="text-lg">{t.roadmapTitle}</TechTitle>
          <p className="text-slate-400 text-[9px]">{t.roadmapSubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-1.5 flex-1">
          {roadmap.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {i + 1}
                </div>
                {i < roadmap.length - 1 && <div className="w-px h-6 bg-gradient-to-b from-purple-500 to-transparent" />}
              </div>
              <div className="flex-1 bg-white/5 backdrop-blur rounded-lg p-2 border border-white/10">
                <span className="text-cyan-400 font-mono text-[9px] font-bold">{item.quarter}</span>
                <p className="text-white text-[10px] mt-0.5">{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={31} side="left" dark />
    </div>
  );
}

function Why9logPage({ t }: { t: typeof translations.vi }) {
  const comparisons = [
    { title: t.why1Title, content: t.why1Content, icon: Globe2 },
    { title: t.why2Title, content: t.why2Content, icon: Cpu },
    { title: t.why3Title, content: t.why3Content, icon: Clock },
  ];

  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <TechTitle className="text-lg">{t.whyTitle}</TechTitle>
          <p className="text-slate-400 text-[9px]">{t.whySubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-2 flex-1">
          {comparisons.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <h4 className="font-semibold text-white text-[11px]">{item.title}</h4>
                </div>
                <p className="text-slate-300 text-[10px] pl-8">{item.content}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={33} side="left" dark />
    </div>
  );
}

function FounderPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.chapter07}</p>
          <EmbossedTitle className="text-lg font-bold">{t.founderTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg">
            <span className="text-3xl font-bold text-white">V</span>
          </div>

          <h3 className="font-bold text-slate-800 text-base mb-0.5">{t.founderName}</h3>
          <p className="text-cyan-600 text-[10px] font-medium mb-2">{t.founderRole}</p>

          <p className="text-slate-600 text-[10px] text-center leading-relaxed mb-3 max-w-xs">
            {t.founderBio}
          </p>

          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-slate-700 text-[10px] italic text-center">{t.founderQuote}</p>
          </div>
        </div>
      </div>
      <PageNumber num={35} side="left" />
    </div>
  );
}

function ContactPage({ t }: { t: typeof translations.vi }) {
  const contacts = [
    { icon: MapPin, label: t.address, value: t.addressValue },
    { icon: Phone, label: t.hotline, value: t.hotlineValue },
    { icon: Mail, label: t.email, value: t.emailValue },
    { icon: Globe2, label: t.website, value: t.websiteValue },
  ];

  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-cyan-600 font-mono text-[10px] mb-0.5">{t.contactLabel}</p>
          <EmbossedTitle className="text-lg font-bold">{t.contactTitle}</EmbossedTitle>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>

        <div className="space-y-1.5 flex-1">
          {contacts.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm border border-slate-200/50">
                <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">{item.label}</div>
                  <div className="font-semibold text-slate-800 text-[11px]">{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <h3 className="text-[9px] font-semibold text-slate-800 uppercase tracking-wide mb-1.5">{t.followUs}</h3>
          <div className="flex gap-1.5">
            {[Facebook, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200/50 hover:shadow-md transition-all">
                <Icon className="w-4 h-4 text-slate-600" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <PageNumber num={37} side="left" />
    </div>
  );
}

// ============================================================================
// IMAGE PAGE COMPONENT
// ============================================================================

function ImagePage({ image, pageNum, caption, dark = false }: { image: string; pageNum: number; caption: string; dark?: boolean }) {
  return (
    <div className={`h-full relative overflow-hidden ${dark ? "bg-slate-900" : "bg-slate-50"}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className={`absolute inset-0 ${dark ? "bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/60" : "bg-gradient-to-t from-white/90 via-white/20 to-white/40"}`} />
      <div className="absolute bottom-4 left-4 right-4">
        <div className={`px-3 py-1.5 rounded-lg backdrop-blur-sm inline-block ${dark ? "bg-white/10 text-white" : "bg-black/10 text-slate-800"}`}>
          <span className="text-xs font-medium">{caption}</span>
        </div>
      </div>
      <PageNumber num={pageNum} side={pageNum % 2 === 0 ? "right" : "left"} dark={dark} />
    </div>
  );
}

// ============================================================================
// ADDITIONAL PAGE COMPONENTS
// ============================================================================

function ContextStatsPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div className="text-center mb-4">
          <TechTitle className="text-lg">Vietnam Logistics 2025</TechTitle>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "42B USD", label: t.contextStat1Label, icon: TrendingUp },
            { value: "16-18%", label: t.contextStat2Label, icon: BarChart3 },
            { value: "30,000+", label: t.contextStat3Label, icon: Building2 },
            { value: "5-7%", label: t.contextStat4Label, icon: Cpu },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 text-center">
                <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <div className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-[8px] text-slate-400">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={4} side="right" dark />
    </div>
  );
}

function TMSModulePage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 shadow-lg">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <EmbossedTitle className="text-lg font-bold">{t.tmsTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[10px] mt-1">{t.tmsFullDesc}</p>
          <div className="mt-2 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
        </div>
        <div className="space-y-1.5 flex-1">
          {[t.tmsFeature1, t.tmsFeature2, t.tmsFeature3, t.tmsFeature4, t.tmsFeature5].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border border-slate-200/50">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-slate-700 text-[10px]">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={11} side="left" />
    </div>
  );
}

function WMSModulePage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-2 shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <EmbossedTitle className="text-lg font-bold">{t.wmsTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[10px] mt-1">{t.wmsFullDesc}</p>
          <div className="mt-2 w-12 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" />
        </div>
        <div className="space-y-1.5 flex-1">
          {[t.wmsFeature1, t.wmsFeature2, t.wmsFeature3, t.wmsFeature4, t.wmsFeature5].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border border-slate-200/50">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-700 text-[10px]">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={13} side="left" />
    </div>
  );
}

function FMSModulePage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-2 shadow-lg">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <EmbossedTitle className="text-lg font-bold">{t.fmsTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[10px] mt-1">{t.fmsFullDesc}</p>
          <div className="mt-2 w-12 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" />
        </div>
        <div className="space-y-1.5 flex-1">
          {[t.fmsFeature1, t.fmsFeature2, t.fmsFeature3, t.fmsFeature4, t.fmsFeature5].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border border-slate-200/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-slate-700 text-[10px]">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <PageNumber num={15} side="left" />
    </div>
  );
}

function CustomersPage({ t }: { t: typeof translations.vi }) {
  const customers = [
    { icon: Truck, title: t.customer1, desc: t.customer1Desc, color: "from-blue-500 to-blue-600" },
    { icon: Ship, title: t.customer2, desc: t.customer2Desc, color: "from-emerald-500 to-emerald-600" },
    { icon: Package, title: t.customer3, desc: t.customer3Desc, color: "from-amber-500 to-amber-600" },
    { icon: Factory, title: t.customer4, desc: t.customer4Desc, color: "from-purple-500 to-purple-600" },
  ];
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <EmbossedTitle className="text-lg font-bold">{t.customersTitle}</EmbossedTitle>
          <p className="text-slate-500 text-[10px]">{t.customersSubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>
        <div className="space-y-2 flex-1">
          {customers.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-7 h-7 rounded bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-[11px]">{item.title}</h4>
                </div>
                <p className="text-[9px] text-slate-600 pl-9">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={27} side="left" />
    </div>
  );
}

function PartnersPage({ t }: { t: typeof translations.vi }) {
  const partners = [
    { icon: Cloud, title: t.partnerType1, desc: t.partnerType1Desc },
    { icon: Handshake, title: t.partnerType2, desc: t.partnerType2Desc },
    { icon: Network, title: t.partnerType3, desc: t.partnerType3Desc },
  ];
  return (
    <div className="h-full relative p-4 flex flex-col overflow-hidden">
      <TechBackground />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mb-3">
          <TechTitle className="text-lg">{t.partnersTitle}</TechTitle>
          <p className="text-slate-400 text-[10px]">{t.partnersSubtitle}</p>
          <div className="mt-1.5 w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>
        <div className="space-y-2 flex-1">
          {partners.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-semibold text-white text-[11px]">{item.title}</h4>
                </div>
                <p className="text-[9px] text-slate-400 pl-6">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <PageNumber num={29} side="left" dark />
    </div>
  );
}

function CTAPage({ t }: { t: typeof translations.vi }) {
  return (
    <div className="h-full bg-slate-50 relative p-4 flex flex-col">
      <PageTexture />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mx-auto mb-3 shadow-xl">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <EmbossedTitle className="text-xl font-bold">{t.ctaTitle}</EmbossedTitle>
          <p className="text-slate-500 text-sm mt-1">{t.ctaSubtitle}</p>
        </div>
        <div className="space-y-2 w-full max-w-xs">
          {[t.ctaFeature1, t.ctaFeature2, t.ctaFeature3, t.ctaFeature4].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm border border-slate-200/50">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-slate-700 text-[11px]">{feature}</span>
            </div>
          ))}
        </div>
        <Link
          href="/register"
          className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all shadow-lg text-sm"
        >
          {t.startFree}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <PageNumber num={39} side="left" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CompanyProfilePage() {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipProgress, setFlipProgress] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [language, setLanguage] = useState<Language>("vi");

  // Voice & Camera control states
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceDetected, setVoiceDetected] = useState(false); // Blink when voice detected
  const [lastVoiceText, setLastVoiceText] = useState(""); // Show what was heard
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [lastGestureTime, setLastGestureTime] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // AI Voice Assistant states
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [aiListening, setAiListening] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const totalSpreads = BOOK_SPREADS.length;
  const flipDuration = 1200; // Slower flip animation

  const t = translations[language];

  const goToSpread = useCallback((direction: "next" | "prev") => {
    if (isFlipping) return;
    const canGoNext = direction === "next" && currentSpread < totalSpreads - 1;
    const canGoPrev = direction === "prev" && currentSpread > 0;
    if (!canGoNext && !canGoPrev) return;

    setFlipDirection(direction);
    setIsFlipping(true);
    setFlipProgress(0);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flipDuration, 1);
      const easeInOutCubic = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setFlipProgress(easeInOutCubic * 180);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentSpread(prev => direction === "next" ? prev + 1 : prev - 1);
        setIsFlipping(false);
        setFlipProgress(0);
      }
    };
    requestAnimationFrame(animate);
  }, [currentSpread, isFlipping, totalSpreads]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goToSpread("next"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goToSpread("prev"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToSpread]);

  // AI-powered command interpreter
  const interpretCommandWithAI = useCallback(async (input: string, type: "voice" | "gesture"): Promise<"next" | "prev" | "goto" | null> => {
    try {
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          type,
          language,
          currentPage: currentSpread + 1,
          totalPages: totalSpreads,
          context: type === "voice"
            ? "User is presenting a company profile slideshow and gave a voice command. Interpret if they want to go to next slide, previous slide, or a specific slide number. Common Vietnamese commands: tiếp/sau/kế tiếp = next, lùi/trước/quay lại = previous. English: next/forward = next, back/previous = prev. If they say a number like 'trang 5' or 'page 5' or 'slide 5', return goto:5"
            : "Gesture detection data showing motion direction. left_dominant = user swiped left = go to previous slide, right_dominant = user swiped right = go to next slide"
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("AI Command Response:", data);

        if (data.action === "next" || data.action === "prev") {
          return data.action;
        }
        if (data.action === "goto" && data.page) {
          // Handle goto specific page
          const targetSpread = Math.max(0, Math.min(data.page - 1, totalSpreads - 1));
          if (targetSpread > currentSpread) {
            return "next"; // Will need multiple calls or direct set
          } else if (targetSpread < currentSpread) {
            return "prev";
          }
        }
      }
    } catch (error) {
      console.error("AI Command error:", error);
    }
    return null;
  }, [language, currentSpread, totalSpreads]);

  // Voice Recognition - AI-powered
  useEffect(() => {
    if (!voiceEnabled) {
      setIsListening(false);
      setVoiceDetected(false);
      setLastVoiceText("");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      setVoiceEnabled(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "vi" ? "vi-VN" : "en-US";
    recognition.maxAlternatives = 1;

    let isRecognitionActive = true;
    let restartTimeout: NodeJS.Timeout;
    let processingCommand = false;

    const restartRecognition = () => {
      if (!isRecognitionActive || !voiceEnabled) return;
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        try {
          recognition.start();
          console.log("Voice recognition restarted");
        } catch (e) {
          restartTimeout = setTimeout(restartRecognition, 500);
        }
      }, 200);
    };

    recognition.onstart = () => {
      console.log("Voice recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Voice recognition ended, restarting...");
      if (isRecognitionActive && voiceEnabled) {
        restartRecognition();
      } else {
        setIsListening(false);
      }
    };

    recognition.onsoundstart = () => setVoiceDetected(true);
    recognition.onsoundend = () => setTimeout(() => setVoiceDetected(false), 500);

    recognition.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript.trim();

      // Show what was heard
      setVoiceDetected(true);
      setLastVoiceText(transcript.slice(0, 30));

      // Only process final results
      if (!result.isFinal || processingCommand) return;

      // Clear display after processing
      setTimeout(() => {
        setVoiceDetected(false);
        setLastVoiceText("");
      }, 2000);

      console.log("=== VOICE FINAL ===", transcript);

      // Use AI to interpret the command
      processingCommand = true;
      setLastVoiceText("🤖 " + transcript.slice(0, 25));

      const action = await interpretCommandWithAI(transcript, "voice");

      if (action === "next" || action === "prev") {
        console.log(">>> AI EXECUTING:", action);
        goToSpread(action);
      } else {
        console.log(">>> AI: No action for:", transcript);
      }

      processingCommand = false;
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        restartRecognition();
        return;
      }
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isRecognitionActive = false;
        setVoiceEnabled(false);
      }
    };

    try {
      recognition.start();
      console.log("Voice recognition initial start");
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }

    return () => {
      console.log("Cleaning up voice recognition");
      isRecognitionActive = false;
      clearTimeout(restartTimeout);
      try { recognition.stop(); } catch (e) { /* ignore */ }
    };
  }, [voiceEnabled, language, goToSpread, interpretCommandWithAI]);

  // Gesture Detection - AI-powered
  useEffect(() => {
    if (!gestureEnabled) return;

    let videoEl: HTMLVideoElement | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let animationFrameId: number;
    let isActive = true;
    let processingGesture = false;

    const GESTURE_COOLDOWN = 2000; // 2 seconds between gestures
    const MOTION_THRESHOLD = 200; // Lower threshold, let AI decide

    const setupCamera = async () => {
      try {
        console.log("Requesting camera access...");

        // Get list of video devices and prefer built-in laptop camera
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        console.log("Available cameras:", videoDevices.map(d => d.label || d.deviceId));

        // Find built-in camera (usually contains "integrated", "built-in", "laptop", or is the first non-virtual camera)
        let preferredDeviceId: string | undefined;

        for (const device of videoDevices) {
          const label = device.label.toLowerCase();
          // Prefer built-in/integrated camera
          if (label.includes("integrated") || label.includes("built-in") || label.includes("laptop") || label.includes("internal") || label.includes("hd webcam") || label.includes("facetime")) {
            preferredDeviceId = device.deviceId;
            console.log("Selected built-in camera:", device.label);
            break;
          }
        }

        // If no built-in found, use first available but skip phone/virtual cameras
        if (!preferredDeviceId && videoDevices.length > 0) {
          const nonVirtualCamera = videoDevices.find(d => {
            const label = d.label.toLowerCase();
            return !label.includes("virtual") && !label.includes("obs") && !label.includes("snap") && !label.includes("iphone") && !label.includes("android") && !label.includes("phone") && !label.includes("droidcam");
          });
          preferredDeviceId = nonVirtualCamera?.deviceId || videoDevices[0].deviceId;
          console.log("Selected camera:", nonVirtualCamera?.label || videoDevices[0].label || "First available");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: preferredDeviceId
            ? { deviceId: { exact: preferredDeviceId }, width: 320, height: 240 }
            : { width: 320, height: 240 }
        });
        console.log("Camera stream obtained:", stream.active);

        // Save stream for preview display IMMEDIATELY
        setCameraStream(stream);

        videoEl = document.createElement("video");
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;

        // Wait for video to be ready and play
        await new Promise<void>((resolve) => {
          videoEl!.onloadedmetadata = () => {
            videoEl!.play().then(() => {
              console.log("Hidden video playing for motion detection");
              resolve();
            }).catch((e) => {
              console.error("Video play error:", e);
              resolve();
            });
          };
        });

        canvasEl = document.createElement("canvas");
        canvasEl.width = 64;
        canvasEl.height = 48;
        const ctx = canvasEl.getContext("2d", { willReadFrequently: true });

        let prevImageData: ImageData | null = null;
        let frameCount = 0;
        let motionHistory: { left: number; right: number; total: number; time: number }[] = [];

        const detectMotion = async () => {
          if (!videoEl || !ctx || !isActive) return;

          frameCount++;
          if (frameCount % 3 !== 0) {
            animationFrameId = requestAnimationFrame(detectMotion);
            return;
          }

          ctx.drawImage(videoEl, 0, 0, 64, 48);
          const currentImageData = ctx.getImageData(0, 0, 64, 48);
          const now = Date.now();

          if (prevImageData && !processingGesture) {
            // Check cooldown
            if (now - lastGestureTime < GESTURE_COOLDOWN) {
              prevImageData = currentImageData;
              animationFrameId = requestAnimationFrame(detectMotion);
              return;
            }

            let leftMotion = 0;
            let rightMotion = 0;
            let totalMotion = 0;
            const midX = 32;

            for (let y = 8; y < 40; y += 2) {
              for (let x = 8; x < 56; x += 2) {
                const i = (y * 64 + x) * 4;
                const diff = Math.abs(currentImageData.data[i] - prevImageData.data[i]) +
                             Math.abs(currentImageData.data[i + 1] - prevImageData.data[i + 1]) +
                             Math.abs(currentImageData.data[i + 2] - prevImageData.data[i + 2]);
                if (diff > 60) {
                  totalMotion++;
                  if (x < midX) leftMotion++;
                  else rightMotion++;
                }
              }
            }

            motionHistory.push({ left: leftMotion, right: rightMotion, total: totalMotion, time: now });
            motionHistory = motionHistory.filter(m => now - m.time < 600);

            const sumLeft = motionHistory.reduce((s, m) => s + m.left, 0);
            const sumRight = motionHistory.reduce((s, m) => s + m.right, 0);
            const sumTotal = motionHistory.reduce((s, m) => s + m.total, 0);

            // If significant motion detected, send to AI
            if (sumTotal > MOTION_THRESHOLD && !processingGesture) {
              const dominance = sumLeft > sumRight * 1.5 ? "left_dominant" : sumRight > sumLeft * 1.5 ? "right_dominant" : "unclear";

              if (dominance !== "unclear") {
                processingGesture = true;
                console.log("Gesture motion detected:", { sumLeft, sumRight, dominance });

                // Send to AI for interpretation
                const gestureData = `Motion: left=${sumLeft}, right=${sumRight}, total=${sumTotal}, direction=${dominance}`;
                const action = await interpretCommandWithAI(gestureData, "gesture");

                if (action === "next" || action === "prev") {
                  console.log(">>> AI Gesture EXECUTING:", action);
                  setLastGestureTime(now);
                  motionHistory = [];
                  goToSpread(action);
                }

                processingGesture = false;
              }
            }
          }

          prevImageData = currentImageData;
          animationFrameId = requestAnimationFrame(detectMotion);
        };

        // Start motion detection immediately (video already playing)
        console.log("Starting motion detection...");
        detectMotion();
      } catch (err) {
        console.error("Camera access denied:", err);
        setGestureEnabled(false);
        setCameraStream(null);
      }
    };

    setupCamera();

    return () => {
      isActive = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoEl?.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
    };
  }, [gestureEnabled, goToSpread, lastGestureTime, interpretCommandWithAI]);

  // Text-to-Speech helper function
  const speakText = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "vi" ? "vi-VN" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);

    // Get available voices and try to find a good one
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      language === "vi"
        ? v.lang.includes("vi") || v.lang.includes("VI")
        : v.lang.includes("en") && (v.name.includes("Google") || v.name.includes("Microsoft"))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthesis.speak(utterance);
  }, [language]);

  // AI Voice Assistant - Ask questions about 9log.tech
  useEffect(() => {
    if (!aiVoiceEnabled) {
      setAiListening(false);
      setAiQuestion("");
      speechSynthesis.cancel();
      setAiSpeaking(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported for AI");
      setAiVoiceEnabled(false);
      return;
    }

    // Load voices
    if ("speechSynthesis" in window) {
      speechSynthesis.getVoices();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === "vi" ? "vi-VN" : "en-US";

    let isActive = true;

    const restartListening = () => {
      if (!isActive || !aiVoiceEnabled || aiLoading || aiSpeaking) return;
      setTimeout(() => {
        try { recognition.start(); } catch (e) { /* ignore */ }
      }, 500);
    };

    recognition.onstart = () => setAiListening(true);
    recognition.onend = () => {
      setAiListening(false);
      restartListening();
    };

    recognition.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript.trim();

      setAiQuestion(transcript);

      if (!result.isFinal) return;

      // Check if it's a navigation command - if so, ignore for AI
      const navWords = ["tiếp", "tiep", "sau", "next", "lùi", "lui", "trước", "truoc", "back", "previous"];
      const isNavCommand = navWords.some(w => transcript.toLowerCase().includes(w));
      if (isNavCommand) {
        setAiQuestion("");
        return;
      }

      // Process question with AI
      setAiLoading(true);
      setAiResponse("");

      try {
        // Call AI API
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            context: "9log.tech company profile presentation. 9log.tech is an AI-powered ERP Logistics platform made in Vietnam for Vietnam logistics companies. It includes TMS (Transport Management), WMS (Warehouse Management), FMS (Freight Forwarding), HRM, CRM, and Accounting modules.",
            language: language
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiText = data.response || data.message || "Không có phản hồi";
          setAiResponse(aiText);

          // Speak the response
          console.log("AI Response - Speaking:", aiText);
          speakText(aiText);
        } else {
          const errorMsg = language === "vi" ? "Xin lỗi, có lỗi xảy ra." : "Sorry, an error occurred.";
          setAiResponse(errorMsg);
          speakText(errorMsg);
        }
      } catch (error) {
        console.error("AI error:", error);
        const errorMsg = language === "vi" ? "Không thể kết nối AI." : "Cannot connect to AI.";
        setAiResponse(errorMsg);
        speakText(errorMsg);
      } finally {
        setAiLoading(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("AI Speech error:", event.error);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start AI recognition:", e);
    }

    return () => {
      isActive = false;
      try { recognition.stop(); } catch (e) { /* ignore */ }
      speechSynthesis.cancel();
    };
  }, [aiVoiceEnabled, language, aiLoading, aiSpeaking, speakText]);

  const renderPage = (type: string) => {
    const props = { t };
    switch (type) {
      case "about": return <AboutPage {...props} />;
      case "heroImage": return <ImagePage image={IMAGES.hero} pageNum={2} caption="Logistics Excellence" />;
      case "context": return <ContextPage {...props} />;
      case "contextStats": return <ContextStatsPage {...props} />;
      case "strategy": return <StrategyPage {...props} />;
      case "strategyImage": return <ImagePage image={IMAGES.vietnam} pageNum={6} caption="Vietnam Logistics" />;
      case "vision": return <VisionPage {...props} />;
      case "visionImage": return <ImagePage image={IMAGES.globe} pageNum={8} caption="Global Vision" />;
      case "mission": return <MissionPage {...props} />;
      case "values": return <ValuesPage {...props} />;
      case "tmsModule": return <TMSModulePage {...props} />;
      case "tmsImage": return <ImagePage image={IMAGES.truck} pageNum={12} caption="Transport Management" />;
      case "wmsModule": return <WMSModulePage {...props} />;
      case "wmsImage": return <ImagePage image={IMAGES.warehouse} pageNum={14} caption="Warehouse Management" />;
      case "fmsModule": return <FMSModulePage {...props} />;
      case "fmsImage": return <ImagePage image={IMAGES.container} pageNum={16} caption="Freight Forwarding" />;
      case "solutions1": return <Solutions1Page {...props} />;
      case "solutions2": return <Solutions2Page {...props} />;
      case "technology": return <TechnologyPage {...props} />;
      case "aiImage": return <ImagePage image={IMAGES.ai} pageNum={20} caption="AI Technology" dark />;
      case "platform": return <PlatformPage {...props} />;
      case "techImage": return <ImagePage image={IMAGES.tech} pageNum={22} caption="Cloud Platform" dark />;
      case "openeconomy": return <OpenEconomyPage {...props} />;
      case "globeImage": return <ImagePage image={IMAGES.globalTrade} pageNum={24} caption="Global Integration" />;
      case "dx": return <DxPage {...props} />;
      case "dxImage": return <ImagePage image={IMAGES.dashboard} pageNum={26} caption="Digital Transformation" />;
      case "customers": return <CustomersPage {...props} />;
      case "customersImage": return <ImagePage image={IMAGES.delivery} pageNum={28} caption="Our Customers" />;
      case "partners": return <PartnersPage {...props} />;
      case "partnersImage": return <ImagePage image={IMAGES.network} pageNum={30} caption="Partner Network" dark />;
      case "roadmap": return <RoadmapPage {...props} />;
      case "roadmapImage": return <ImagePage image={IMAGES.roadmap} pageNum={32} caption="Product Roadmap" dark />;
      case "why9log": return <Why9logPage {...props} />;
      case "whyImage": return <ImagePage image={IMAGES.cargo} pageNum={34} caption="Why 9log" dark />;
      case "founder": return <FounderPage {...props} />;
      case "teamImage": return <ImagePage image={IMAGES.team} pageNum={36} caption="Our Team" />;
      case "contact": return <ContactPage {...props} />;
      case "officeImage": return <ImagePage image={IMAGES.office} pageNum={38} caption="Contact Us" />;
      case "cta": return <CTAPage {...props} />;
      case "ctaImage": return <ImagePage image={IMAGES.port} pageNum={40} caption="Start Today" />;
      default: return null;
    }
  };

  const renderSpreadContent = (spreadIndex: number, side: "left" | "right") => {
    const spread = BOOK_SPREADS[spreadIndex];
    if (!spread || spread.type !== "spread") return null;
    const pageData = side === "left" ? (spread as any).left : (spread as any).right;
    return renderPage(pageData.type);
  };

  const currentData = BOOK_SPREADS[currentSpread];
  const nextData = currentSpread < totalSpreads - 1 ? BOOK_SPREADS[currentSpread + 1] : null;
  const prevData = currentSpread > 0 ? BOOK_SPREADS[currentSpread - 1] : null;
  const isCover = currentData.type === "cover";
  const isBackCover = currentData.type === "backcover";
  const isSpread = currentData.type === "spread";

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-11">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <Home className="w-4 h-4" />
              <span className="font-medium text-sm hidden sm:inline">{t.home}</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-br from-red-500 to-red-600 rounded px-1 py-0.5 text-white font-bold text-sm">9</span>
              <span className="font-bold text-white text-sm">log<span className="text-cyan-400">.tech</span></span>
              <span className="text-slate-500 ml-1 hidden sm:inline text-xs">{t.companyProfile}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Control Button */}
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`relative flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs ${
                  voiceEnabled
                    ? voiceDetected
                      ? "bg-green-500 text-white animate-pulse"
                      : "bg-cyan-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                }`}
                title={voiceEnabled ? t.voiceControlOn : t.voiceControlOff}
              >
                {voiceEnabled ? <Mic className={`w-3.5 h-3.5 ${voiceDetected ? "animate-bounce" : ""}`} /> : <MicOff className="w-3.5 h-3.5" />}
                {isListening && !voiceDetected && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* AI Voice Assistant Button */}
              <button
                onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
                className={`relative flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs ${
                  aiVoiceEnabled
                    ? aiLoading
                      ? "bg-yellow-500 text-white animate-pulse"
                      : "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                }`}
                title={aiVoiceEnabled ? t.aiAssistantOn : t.aiAssistantOff}
              >
                <Bot className={`w-3.5 h-3.5 ${aiListening ? "animate-bounce" : ""}`} />
                {aiListening && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                )}
              </button>

              {/* Gesture Control Button */}
              <button
                onClick={() => setGestureEnabled(!gestureEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs ${
                  gestureEnabled
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                }`}
                title={gestureEnabled ? t.gestureControlOn : t.gestureControlOff}
              >
                <Hand className="w-3.5 h-3.5" />
              </button>

              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs"
              >
                <Languages className="w-3.5 h-3.5" />
                <span className="font-medium">{language.toUpperCase()}</span>
              </button>

              <span className="text-xs text-slate-400 font-mono">{currentSpread + 1}/{totalSpreads}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Book Container */}
      <main className="flex-1 flex items-center justify-center p-2 overflow-hidden">
        <div className="relative w-full h-full max-w-[98vw] max-h-[calc(100vh-110px)] flex items-center justify-center" style={{ perspective: "2500px" }}>
          <div
            className="relative"
            style={{
              width: isCover || isBackCover ? "min(90vw, 480px)" : "min(98vw, 1100px)",
              height: isCover || isBackCover ? "min(80vh, 680px)" : "min(78vh, 600px)",
              maxHeight: "calc(100vh - 130px)",
              transformStyle: "preserve-3d",
              transition: isFlipping ? "none" : "width 0.5s ease, height 0.5s ease",
            }}
          >
            {/* Book shadow */}
            <div
              className="absolute -bottom-4 left-[5%] right-[5%] h-8 bg-black/50 blur-2xl rounded-full transition-all"
              style={{ transform: isFlipping ? `scaleX(${1 + flipProgress / 500})` : "scaleX(1)" }}
            />

            {/* Static left page */}
            {isSpread && (
              <div className="absolute left-0 top-0 w-1/2 h-full overflow-hidden rounded-l-sm shadow-xl" style={{ zIndex: 1 }}>
                {isFlipping && flipDirection === "prev" && prevData?.type === "spread"
                  ? renderSpreadContent(currentSpread - 1, "right")
                  : renderSpreadContent(currentSpread, "left")}
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Static right page */}
            {isSpread && (
              <div className="absolute right-0 top-0 w-1/2 h-full overflow-hidden rounded-r-sm shadow-xl" style={{ zIndex: 1 }}>
                {isFlipping && flipDirection === "next" && nextData?.type === "spread"
                  ? renderSpreadContent(currentSpread + 1, "left")
                  : renderSpreadContent(currentSpread, "right")}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Flipping page */}
            {isFlipping && isSpread && (
              <div
                className="absolute top-0 w-1/2 h-full"
                style={{
                  left: flipDirection === "next" ? "50%" : "0",
                  transformOrigin: flipDirection === "next" ? "left center" : "right center",
                  transform: flipDirection === "next" ? `rotateY(-${flipProgress}deg)` : `rotateY(${flipProgress}deg)`,
                  transformStyle: "preserve-3d",
                  zIndex: 10,
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-sm"
                  style={{
                    backfaceVisibility: "hidden",
                    boxShadow: `${flipDirection === "next" ? "-" : ""}${Math.sin(flipProgress * Math.PI / 180) * 12}px 0 20px rgba(0,0,0,0.25)`,
                  }}
                >
                  {flipDirection === "next" ? renderSpreadContent(currentSpread, "right") : renderSpreadContent(currentSpread, "left")}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: flipDirection === "next"
                        ? `linear-gradient(to left, rgba(0,0,0,${flipProgress / 350}) 0%, transparent 50%)`
                        : `linear-gradient(to right, rgba(0,0,0,${flipProgress / 350}) 0%, transparent 50%)`,
                    }}
                  />
                </div>
                <div
                  className="absolute inset-0 overflow-hidden rounded-sm"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    boxShadow: `${flipDirection === "next" ? "" : "-"}${Math.sin(flipProgress * Math.PI / 180) * 12}px 0 20px rgba(0,0,0,0.25)`,
                  }}
                >
                  {flipDirection === "next" && nextData?.type === "spread"
                    ? renderSpreadContent(currentSpread + 1, "left")
                    : flipDirection === "prev" && prevData?.type === "spread"
                    ? renderSpreadContent(currentSpread - 1, "right")
                    : null}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: flipDirection === "next"
                        ? `linear-gradient(to right, rgba(0,0,0,${(180 - flipProgress) / 350}) 0%, transparent 50%)`
                        : `linear-gradient(to left, rgba(0,0,0,${(180 - flipProgress) / 350}) 0%, transparent 50%)`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cover page */}
            {isCover && !isFlipping && (
              <div className="absolute inset-0 rounded-sm shadow-2xl overflow-hidden">
                <CoverPage t={t} />
              </div>
            )}

            {/* Cover flipping */}
            {isCover && isFlipping && flipDirection === "next" && (
              <>
                <div
                  className="absolute left-0 top-0 w-1/2 h-full overflow-hidden rounded-l-sm shadow-xl"
                  style={{ zIndex: 1, opacity: flipProgress > 90 ? 1 : 0, transition: "opacity 0.1s" }}
                >
                  {nextData?.type === "spread" && renderSpreadContent(currentSpread + 1, "left")}
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transformOrigin: "left center", transform: `rotateY(-${flipProgress}deg)`, transformStyle: "preserve-3d", zIndex: 10 }}
                >
                  <div
                    className="absolute inset-0 rounded-sm overflow-hidden"
                    style={{ backfaceVisibility: "hidden", boxShadow: `-${Math.sin(flipProgress * Math.PI / 180) * 20}px 0 30px rgba(0,0,0,0.35)` }}
                  >
                    <CoverPage t={t} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to left, rgba(0,0,0,${flipProgress / 280}) 0%, transparent 60%)` }} />
                  </div>
                  <div className="absolute inset-0 rounded-sm overflow-hidden bg-slate-100" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <div className="h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <div className="text-slate-300 text-4xl font-bold">9</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Back cover */}
            {isBackCover && !isFlipping && (
              <div className="absolute inset-0 rounded-sm shadow-2xl overflow-hidden">
                <BackCoverPage t={t} />
              </div>
            )}

            {/* Spine */}
            {isSpread && !isFlipping && (
              <div className="absolute left-1/2 top-0 bottom-0 w-1.5 -translate-x-1/2 z-30 pointer-events-none">
                <div className="h-full bg-gradient-to-r from-slate-400/60 via-slate-200 to-slate-400/60 shadow-md" />
              </div>
            )}

            {/* Page edges */}
            {!isCover && !isFlipping && (
              <div className="absolute left-0 top-2 bottom-2 w-1 z-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="absolute inset-y-0 rounded-l-sm" style={{ left: `${i}px`, width: "1px", background: "linear-gradient(to right, #d1d5db, #e5e7eb)" }} />
                ))}
              </div>
            )}
            {!isBackCover && !isFlipping && (
              <div className="absolute right-0 top-2 bottom-2 w-1 z-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="absolute inset-y-0 rounded-r-sm" style={{ right: `${i}px`, width: "1px", background: "linear-gradient(to left, #d1d5db, #e5e7eb)" }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Camera Preview - Floating when gesture enabled */}
      {gestureEnabled && cameraStream && (
        <div className="fixed bottom-28 right-4 z-50">
          <div className="relative">
            <video
              ref={(el) => {
                if (el && cameraStream) {
                  el.srcObject = cameraStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-32 h-24 object-cover rounded-lg border-2 border-purple-500 shadow-lg shadow-purple-500/30"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full animate-pulse flex items-center justify-center">
              <Hand className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="absolute bottom-1 left-1 right-1 text-center">
              <span className="text-[9px] bg-black/60 text-purple-300 px-1.5 py-0.5 rounded-full">
                {language === "vi" ? "Vẫy tay ← →" : "Wave ← →"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Speaking Indicator */}
      {aiSpeaking && (
        <div className="fixed bottom-28 left-4 z-50">
          <div className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-3 py-2 rounded-full shadow-lg animate-pulse">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-medium">
              {language === "vi" ? "Đang nói..." : "Speaking..."}
            </span>
            <div className="flex gap-0.5">
              <span className="w-1 h-3 bg-white rounded-full animate-[bounce_0.6s_infinite]" />
              <span className="w-1 h-4 bg-white rounded-full animate-[bounce_0.6s_infinite_0.1s]" />
              <span className="w-1 h-2 bg-white rounded-full animate-[bounce_0.6s_infinite_0.2s]" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <footer className="flex-shrink-0 py-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => goToSpread("prev")}
            disabled={currentSpread === 0 || isFlipping}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all text-xs ${
              currentSpread === 0 || isFlipping ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t.prevPage}</span>
          </button>

          <div className="flex items-center gap-1">
            {BOOK_SPREADS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== currentSpread && !isFlipping) {
                    if (i === currentSpread + 1) goToSpread("next");
                    else if (i === currentSpread - 1) goToSpread("prev");
                  }
                }}
                className={`h-1 rounded-full transition-all ${
                  i === currentSpread ? "bg-cyan-500 w-4" : Math.abs(i - currentSpread) === 1 && !isFlipping ? "bg-slate-500 hover:bg-slate-400 w-1 cursor-pointer" : "bg-slate-700 w-1 cursor-default"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => goToSpread("next")}
            disabled={currentSpread === totalSpreads - 1 || isFlipping}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all text-xs ${
              currentSpread === totalSpreads - 1 || isFlipping ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="hidden sm:inline">{t.nextPage}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center text-[10px] text-slate-500 mt-1">
          {voiceEnabled || gestureEnabled || aiVoiceEnabled ? (
            <div className="flex flex-col items-center gap-1">
              {/* Control mode indicators */}
              <span className="flex items-center justify-center gap-3 flex-wrap">
                {voiceEnabled && (
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Mic className="w-3 h-3" />
                    {isListening ? t.voiceListening : t.voiceCommands}
                    {/* Show detected voice text inline */}
                    {voiceDetected && lastVoiceText && (
                      <span className="text-green-400 font-mono animate-pulse bg-green-500/20 px-1.5 rounded ml-1">
                        "{lastVoiceText}"
                      </span>
                    )}
                  </span>
                )}
                {aiVoiceEnabled && (
                  <span className="flex items-center gap-1 text-pink-400">
                    <Bot className="w-3 h-3" />
                    {aiLoading ? t.aiThinking : aiListening ? t.aiListening : t.aiAskQuestion}
                  </span>
                )}
                {gestureEnabled && (
                  <span className="flex items-center gap-1 text-purple-400">
                    <Hand className="w-3 h-3" />
                    {t.gestureInstructions}
                  </span>
                )}
              </span>

              {/* AI Question & Response */}
              {aiVoiceEnabled && (aiQuestion || aiResponse) && (
                <div className="max-w-md mx-auto mt-1 text-[11px]">
                  {aiQuestion && (
                    <div className="flex items-center gap-1 text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded mb-0.5">
                      <MessageCircle className="w-3 h-3" />
                      <span className="font-medium">Q:</span>
                      <span className="truncate">{aiQuestion}</span>
                    </div>
                  )}
                  {aiResponse && (
                    <div className="flex items-start gap-1 text-green-300 bg-green-500/10 px-2 py-1 rounded">
                      <Bot className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="text-left">{aiResponse.slice(0, 150)}{aiResponse.length > 150 ? "..." : ""}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            t.instructions
          )}
        </div>
      </footer>
    </div>
  );
}

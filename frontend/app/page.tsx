"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSubdomain } from "@/lib/tenant";
import anime from "animejs";
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
  Menu,
  X,
  Check,
  ArrowRight,
  ChevronRight,
  MapPin,
  Ship,
  Sparkles,
  Brain,
  TrendingUp,
  Shield,
  Globe2,
  Clock,
  PhoneCall,
} from "lucide-react";

// ============================================================================
// DATA
// ============================================================================

const MODULE_GROUPS = [
  {
    title: "Vận hành",
    desc: "Core Operations",
    modules: [
      { id: "tms", name: "TMS", icon: Truck, color: "bg-blue-500" },
      { id: "wms", name: "WMS", icon: Package, color: "bg-amber-500" },
      { id: "fms", name: "FMS", icon: Ship, color: "bg-emerald-500" },
      { id: "pms", name: "PMS", icon: Anchor, color: "bg-cyan-500" },
      { id: "ems", name: "EMS", icon: Zap, color: "bg-orange-500" },
      { id: "mes", name: "MES", icon: Factory, color: "bg-slate-500" },
    ],
  },
  {
    title: "Back-office",
    desc: "Quản trị nội bộ",
    modules: [
      { id: "crm", name: "CRM", icon: Users2, color: "bg-rose-500" },
      { id: "hrm", name: "HRM", icon: Users, color: "bg-violet-500" },
      { id: "accounting", name: "Kế toán", icon: Calculator, color: "bg-green-500" },
      { id: "controlling", name: "Controlling", icon: PiggyBank, color: "bg-pink-500" },
    ],
  },
  {
    title: "Công cụ",
    desc: "Productivity Tools",
    modules: [
      { id: "workflow", name: "Workflow", icon: Workflow, color: "bg-indigo-500" },
      { id: "dms", name: "DMS", icon: FolderOpen, color: "bg-yellow-500" },
      { id: "project", name: "Project", icon: FolderKanban, color: "bg-purple-500" },
    ],
  },
];

const WHY_CHOOSE = [
  {
    icon: Brain,
    title: "AI-Powered",
    desc: "Dự báo, tối ưu tuyến đường, phát hiện bất thường tự động",
  },
  {
    icon: Globe2,
    title: "Made for Vietnam",
    desc: "Nghiệp vụ chuẩn Việt, hóa đơn điện tử, báo cáo thuế",
  },
  {
    icon: TrendingUp,
    title: "Tăng trưởng cùng bạn",
    desc: "Từ 5 đến 5000 nhân viên, hệ thống mở rộng linh hoạt",
  },
  {
    icon: Shield,
    title: "An toàn tuyệt đối",
    desc: "Mã hóa đầu cuối, backup tự động, uptime 99.9%",
  },
];

const STATS = [
  { value: "200+", label: "Doanh nghiệp tin dùng" },
  { value: "15M+", label: "Đơn hàng đã xử lý" },
  { value: "63", label: "Tỉnh thành phủ sóng" },
  { value: "99.9%", label: "Uptime cam kết" },
];

const TESTIMONIALS = [
  {
    quote: "Từ khi dùng 9log, chúng tôi giảm 40% chi phí vận hành và tăng gấp đôi số chuyến xe mỗi ngày.",
    author: "Nguyễn Văn Minh",
    role: "Giám đốc Điều hành",
    company: "Vận tải Phương Nam",
    location: "TP. Hồ Chí Minh",
  },
  {
    quote: "Phần mềm hiếm hoi hiểu đúng nghiệp vụ logistics Việt Nam. Support phản hồi nhanh, giải quyết vấn đề ngay.",
    author: "Trần Thu Hương",
    role: "Trưởng phòng Vận hành",
    company: "Giao nhận Bắc Việt",
    location: "Hà Nội",
  },
  {
    quote: "AI gợi ý tuyến đường giúp tiết kiệm 25% nhiên liệu. ROI đạt được chỉ sau 3 tháng triển khai.",
    author: "Lê Hoàng Nam",
    role: "CTO",
    company: "Express Logistics",
    location: "Đà Nẵng",
  },
];

const PRICING = [
  {
    name: "Khởi nghiệp",
    price: "Miễn phí",
    desc: "Dành cho doanh nghiệp mới",
    features: ["5 người dùng", "2 modules", "1GB lưu trữ", "Hỗ trợ email"],
    cta: "Bắt đầu ngay",
    popular: false,
  },
  {
    name: "Doanh nghiệp",
    price: "2.990.000đ",
    period: "/tháng",
    desc: "Dành cho doanh nghiệp đang phát triển",
    features: ["20 người dùng", "Tất cả modules", "50GB lưu trữ", "Hỗ trợ 24/7", "API không giới hạn", "AI Assistant"],
    cta: "Dùng thử 14 ngày",
    popular: true,
  },
  {
    name: "Tập đoàn",
    price: "Liên hệ",
    desc: "Giải pháp tùy chỉnh cho tập đoàn lớn",
    features: ["Không giới hạn users", "Tất cả modules", "Không giới hạn lưu trữ", "Dedicated support", "On-premise option", "Custom development"],
    cta: "Liên hệ tư vấn",
    popular: false,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ============================================================================
// LOGISTICS ANIMATION COMPONENT - Animated trucks, packages, routes
// ============================================================================
function LogisticsAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<anime.AnimeInstance[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Animate trucks moving along paths
    const trucks = containerRef.current.querySelectorAll('.anim-truck');
    trucks.forEach((truck, i) => {
      const anim = anime({
        targets: truck,
        translateX: [
          { value: -100, duration: 0 },
          { value: window.innerWidth + 100, duration: 8000 + i * 2000 }
        ],
        easing: 'linear',
        loop: true,
        delay: i * 3000,
      });
      animationsRef.current.push(anim);
    });

    // Animate packages floating
    const packages = containerRef.current.querySelectorAll('.anim-package');
    packages.forEach((pkg, i) => {
      const anim = anime({
        targets: pkg,
        translateY: [0, -15, 0],
        rotate: [-5, 5, -5],
        easing: 'easeInOutSine',
        duration: 3000 + i * 500,
        loop: true,
        delay: i * 400,
      });
      animationsRef.current.push(anim);
    });

    // Animate route dots pulsing
    const dots = containerRef.current.querySelectorAll('.anim-dot');
    dots.forEach((dot, i) => {
      const anim = anime({
        targets: dot,
        scale: [1, 1.5, 1],
        opacity: [0.5, 1, 0.5],
        easing: 'easeInOutSine',
        duration: 2000,
        loop: true,
        delay: i * 300,
      });
      animationsRef.current.push(anim);
    });

    // Animate connection lines
    const lines = containerRef.current.querySelectorAll('.anim-line');
    lines.forEach((line, i) => {
      const anim = anime({
        targets: line,
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 3000,
        loop: true,
        direction: 'alternate',
        delay: i * 500,
      });
      animationsRef.current.push(anim);
    });

    return () => {
      animationsRef.current.forEach(anim => anim.pause());
      animationsRef.current = [];
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ============ CONTAINER TRUCKS - Using CSS animation ============ */}
      <div
        className="absolute top-[20%] opacity-20"
        style={{ animation: 'truckMove 12s linear infinite' }}
      >
        <svg width="90" height="45" viewBox="0 0 100 50" fill="none">
          <rect x="0" y="12" width="60" height="28" rx="2" fill="white" />
          <rect x="2" y="14" width="56" height="24" fill="#3b82f6" rx="1" />
          <text x="30" y="30" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">MAERSK</text>
          <rect x="60" y="20" width="25" height="20" rx="3" fill="white" />
          <rect x="75" y="22" width="8" height="8" fill="#60a5fa" rx="1" />
          <circle cx="15" cy="42" r="5" fill="#1f2937" />
          <circle cx="15" cy="42" r="2" fill="#6b7280" />
          <circle cx="35" cy="42" r="5" fill="#1f2937" />
          <circle cx="35" cy="42" r="2" fill="#6b7280" />
          <circle cx="72" cy="42" r="5" fill="#1f2937" />
          <circle cx="72" cy="42" r="2" fill="#6b7280" />
        </svg>
      </div>
      <div
        className="absolute top-[45%] opacity-15"
        style={{ animation: 'truckMove 15s linear infinite', animationDelay: '4s' }}
      >
        <svg width="80" height="40" viewBox="0 0 100 50" fill="none">
          <rect x="0" y="12" width="60" height="28" rx="2" fill="white" />
          <rect x="2" y="14" width="56" height="24" fill="#22c55e" rx="1" />
          <text x="30" y="30" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">EVERGREEN</text>
          <rect x="60" y="20" width="25" height="20" rx="3" fill="white" />
          <rect x="75" y="22" width="8" height="8" fill="#86efac" rx="1" />
          <circle cx="15" cy="42" r="5" fill="#1f2937" />
          <circle cx="35" cy="42" r="5" fill="#1f2937" />
          <circle cx="72" cy="42" r="5" fill="#1f2937" />
        </svg>
      </div>
      <div
        className="absolute top-[70%] opacity-12"
        style={{ animation: 'truckMove 14s linear infinite', animationDelay: '8s' }}
      >
        <svg width="70" height="35" viewBox="0 0 100 50" fill="none">
          <rect x="0" y="12" width="60" height="28" rx="2" fill="white" />
          <rect x="2" y="14" width="56" height="24" fill="#ef4444" rx="1" />
          <text x="30" y="30" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">COSCO</text>
          <rect x="60" y="20" width="25" height="20" rx="3" fill="white" />
          <rect x="75" y="22" width="8" height="8" fill="#fca5a5" rx="1" />
          <circle cx="15" cy="42" r="5" fill="#1f2937" />
          <circle cx="35" cy="42" r="5" fill="#1f2937" />
          <circle cx="72" cy="42" r="5" fill="#1f2937" />
        </svg>
      </div>

      {/* ============ FREIGHT TRAIN - MEDIUM (18-22s) ============ */}
      <div
        className="absolute bottom-[42%] opacity-20"
        style={{ animation: 'trainMove 18s linear infinite' }}
      >
        <svg width="250" height="45" viewBox="0 0 250 45" fill="none">
          {/* Locomotive */}
          <rect x="200" y="12" width="40" height="22" rx="3" fill="white" />
          <rect x="202" y="14" width="18" height="10" fill="#dc2626" rx="2" />
          <rect x="222" y="14" width="6" height="6" fill="#fca5a5" rx="1" />
          <circle cx="210" cy="36" r="4" fill="#1f2937" />
          <circle cx="228" cy="36" r="4" fill="#1f2937" />
          {/* Container Cars */}
          <rect x="155" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="157" y="16" width="36" height="16" fill="#ef4444" rx="1" />
          <circle cx="165" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="185" cy="36" r="3.5" fill="#1f2937" />

          <rect x="110" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="112" y="16" width="36" height="16" fill="#3b82f6" rx="1" />
          <circle cx="120" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="140" cy="36" r="3.5" fill="#1f2937" />

          <rect x="65" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="67" y="16" width="36" height="16" fill="#22c55e" rx="1" />
          <circle cx="75" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="95" cy="36" r="3.5" fill="#1f2937" />

          <rect x="20" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="22" y="16" width="36" height="16" fill="#f59e0b" rx="1" />
          <circle cx="30" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="50" cy="36" r="3.5" fill="#1f2937" />
        </svg>
      </div>
      <div
        className="absolute bottom-[55%] opacity-15"
        style={{ animation: 'trainMoveReverse 22s linear infinite', animationDelay: '6s' }}
      >
        <svg width="200" height="40" viewBox="0 0 250 45" fill="none" style={{ transform: 'scaleX(-1)' }}>
          <rect x="200" y="12" width="40" height="22" rx="3" fill="white" />
          <rect x="202" y="14" width="18" height="10" fill="#7c3aed" rx="2" />
          <circle cx="210" cy="36" r="4" fill="#1f2937" />
          <circle cx="228" cy="36" r="4" fill="#1f2937" />

          <rect x="155" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="157" y="16" width="36" height="16" fill="#8b5cf6" rx="1" />
          <circle cx="165" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="185" cy="36" r="3.5" fill="#1f2937" />

          <rect x="110" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="112" y="16" width="36" height="16" fill="#ec4899" rx="1" />
          <circle cx="120" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="140" cy="36" r="3.5" fill="#1f2937" />

          <rect x="65" y="14" width="40" height="20" rx="2" fill="white" />
          <rect x="67" y="16" width="36" height="16" fill="#06b6d4" rx="1" />
          <circle cx="75" cy="36" r="3.5" fill="#1f2937" />
          <circle cx="95" cy="36" r="3.5" fill="#1f2937" />
        </svg>
      </div>

      {/* ============ CONTAINER SHIPS - SLOWEST (35-45s) ============ */}
      <div className="absolute bottom-[12%] left-0 animate-[shipMove_35s_linear_infinite] opacity-22">
        <svg width="180" height="70" viewBox="0 0 180 70" fill="none" className="text-white">
          {/* Hull */}
          <path d="M5,50 L20,60 L160,60 L175,50 L180,45 L170,45 L165,30 L15,30 L10,45 L0,45 Z" fill="white" />
          <path d="M15,32 L165,32 L165,48 L15,48 Z" fill="#1e3a5f" />
          {/* Container stacks */}
          <rect x="20" y="15" width="14" height="25" fill="#ef4444" rx="1" />
          <rect x="36" y="15" width="14" height="25" fill="#3b82f6" rx="1" />
          <rect x="52" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="68" y="15" width="14" height="25" fill="#f59e0b" rx="1" />
          <rect x="84" y="15" width="14" height="25" fill="#8b5cf6" rx="1" />
          <rect x="100" y="15" width="14" height="25" fill="#ef4444" rx="1" />
          <rect x="116" y="15" width="14" height="25" fill="#3b82f6" rx="1" />
          {/* Top row containers */}
          <rect x="28" y="5" width="12" height="12" fill="#06b6d4" rx="1" />
          <rect x="44" y="5" width="12" height="12" fill="#ec4899" rx="1" />
          <rect x="60" y="5" width="12" height="12" fill="#84cc16" rx="1" />
          <rect x="76" y="5" width="12" height="12" fill="#f97316" rx="1" />
          <rect x="92" y="5" width="12" height="12" fill="#14b8a6" rx="1" />
          <rect x="108" y="5" width="12" height="12" fill="#a855f7" rx="1" />
          {/* Bridge/Superstructure */}
          <rect x="140" y="8" width="22" height="32" fill="white" rx="2" />
          <rect x="142" y="10" width="8" height="6" fill="#60a5fa" rx="1" />
          <rect x="152" y="10" width="8" height="6" fill="#60a5fa" rx="1" />
          <rect x="145" y="18" width="14" height="3" fill="#1e3a5f" />
          {/* Funnel */}
          <rect x="148" y="2" width="8" height="8" fill="#1e40af" rx="1" />
          {/* Waves */}
          <path d="M0,55 Q10,52 20,55 Q30,58 40,55" stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-[28%] right-0 animate-[shipMoveReverse_45s_linear_infinite] opacity-15" style={{ animationDelay: '10s' }}>
        <svg width="140" height="55" viewBox="0 0 180 70" fill="none" className="text-white" style={{ transform: 'scaleX(-1)' }}>
          <path d="M5,50 L20,60 L160,60 L175,50 L180,45 L170,45 L165,30 L15,30 L10,45 L0,45 Z" fill="white" />
          <path d="M15,32 L165,32 L165,48 L15,48 Z" fill="#166534" />
          <rect x="20" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="36" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="52" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="68" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="84" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="100" y="15" width="14" height="25" fill="#22c55e" rx="1" />
          <rect x="140" y="8" width="22" height="32" fill="white" rx="2" />
          <text x="90" y="58" fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">EVERGREEN</text>
        </svg>
      </div>

      {/* ============ FLOATING PACKAGES / WAREHOUSE ============ */}
      <div className="anim-package absolute top-[18%] right-[12%] opacity-25">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-400">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <div className="anim-package absolute top-[38%] right-[22%] opacity-20">
        <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange-400">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      {/* Warehouse Icon */}
      <div className="anim-package absolute top-[55%] right-[8%] opacity-20">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
          <path d="M10 9h4" />
          <path d="M10 12h4" />
        </svg>
      </div>
      {/* Port/Crane Icon */}
      <div className="anim-package absolute top-[72%] right-[18%] opacity-15">
        <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-400">
          <path d="M21 12h-4l-3 9-4-18-3 9H3" strokeWidth="0" />
          <rect x="2" y="18" width="20" height="4" rx="1" />
          <path d="M6 18V8" />
          <path d="M6 8h12" />
          <path d="M18 8v4" />
          <path d="M14 12h8" />
          <rect x="16" y="12" width="4" height="6" />
        </svg>
      </div>

      {/* ============ DECORATIVE LOGISTICS ICONS - RIGHT SIDE ============ */}
      <div className="absolute right-8 top-[20%] opacity-15">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 5v4h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </div>
      <div className="absolute right-16 top-[35%] opacity-10">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <div className="absolute right-6 top-[50%] opacity-12">
        <svg width="55" height="55" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
      <div className="absolute right-20 top-[65%] opacity-10">
        <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// STATS COUNTER ANIMATION
// ============================================================================
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [displayValue, setDisplayValue] = useState("0");
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            // Parse the target value
            const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
            const suffix = value.replace(/[0-9.]/g, '');

            // Animate the counter
            const obj = { val: 0 };
            anime({
              targets: obj,
              val: numericValue,
              duration: 2000,
              easing: 'easeOutExpo',
              round: value.includes('.') ? 10 : 1,
              update: () => {
                if (value.includes('.')) {
                  setDisplayValue(obj.val.toFixed(1) + suffix);
                } else {
                  setDisplayValue(Math.round(obj.val) + suffix);
                }
              },
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={elementRef} className="text-center">
      <div className="text-3xl lg:text-4xl font-bold text-slate-900">{displayValue}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

// ============================================================================
// MODULE CARD WITH ANIMATION
// ============================================================================
function AnimatedModuleCard({ module, delay }: { module: { id: string; name: string; icon: any; color: string }; delay: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: cardRef.current,
              translateY: [30, 0],
              opacity: [0, 1],
              duration: 600,
              easing: 'easeOutCubic',
              delay: delay,
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [delay]);

  const Icon = module.icon;

  return (
    <Link
      ref={cardRef}
      href={`/solutions/${module.id}`}
      className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all hover:shadow-md group opacity-0"
    >
      <div className={`w-9 h-9 ${module.color} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="font-medium text-slate-800 group-hover:text-slate-900">{module.name}</span>
      <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subdomain = getSubdomain();
    const token = localStorage.getItem("access_token");
    if (subdomain) {
      router.replace(token ? "/dashboard" : "/login");
      return;
    }
    if (token) {
      router.replace("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero text animation
  useEffect(() => {
    if (checkingAuth || !heroRef.current) return;

    // Animate hero elements
    anime.timeline({ easing: 'easeOutExpo' })
      .add({
        targets: '.hero-badge',
        translateY: [-20, 0],
        opacity: [0, 1],
        duration: 800,
      })
      .add({
        targets: '.hero-title',
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 1000,
      }, '-=400')
      .add({
        targets: '.hero-subtitle',
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 800,
      }, '-=600')
      .add({
        targets: '.hero-cta',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 600,
      }, '-=400');
  }, [checkingAuth]);

  // Check if we should scroll to modules section (from module detail page)
  useEffect(() => {
    const shouldScroll = sessionStorage.getItem("scrollToModules");
    if (shouldScroll === "true") {
      sessionStorage.removeItem("scrollToModules");
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200" : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white font-bold text-xl">9</span>
              </div>
              <span className={`text-xl font-bold ${scrolled ? "text-slate-900" : "text-white"}`}>
                9log<span className="text-red-500">.tech</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { id: "modules", label: "Giải pháp" },
                { id: "features", label: "Tính năng" },
                { id: "pricing", label: "Bảng giá" },
                { id: "testimonials", label: "Khách hàng" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors ${
                  scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
                }`}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/40"
              >
                Dùng thử miễn phí
              </Link>
            </div>

            {/* Mobile Menu */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`w-6 h-6 ${scrolled ? "text-slate-900" : "text-white"}`} />
              ) : (
                <Menu className={`w-6 h-6 ${scrolled ? "text-slate-900" : "text-white"}`} />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {["modules", "features", "pricing", "testimonials"].map((id) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="block w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  {id === "modules" ? "Giải pháp" : id === "features" ? "Tính năng" : id === "pricing" ? "Bảng giá" : "Khách hàng"}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Link href="/login" className="block w-full text-center px-4 py-3 text-slate-700 border border-slate-200 rounded-lg">
                  Đăng nhập
                </Link>
                <Link href="/register" className="block w-full text-center px-4 py-3 text-white bg-red-500 rounded-lg font-semibold">
                  Dùng thử miễn phí
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/* HERO - Logistics Vietnam Theme with Anime.js */}
      {/* ================================================================== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background - Dark blue gradient with logistics pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          {/* Accent shapes */}
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        {/* Animated Logistics Elements */}
        <LogisticsAnimation />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-8 opacity-0">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white/90">Tích hợp AI thông minh</span>
            </div>

            {/* Headline */}
            <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight opacity-0">
              Nền tảng <span className="text-red-400">Logistics</span>
              <br />
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Made in Vietnam
              </span>
            </h1>

            {/* Subheadline */}
            <p className="hero-subtitle mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed opacity-0">
              Hệ thống quản trị doanh nghiệp logistics toàn diện.
              Từ vận tải đường bộ, kho bãi, giao nhận quốc tế đến chuyển phát nhanh —
              <strong className="text-white"> một nền tảng duy nhất.</strong>
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4 opacity-0">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-0.5"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => scrollTo("modules")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                Khám phá giải pháp
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* STATS BAR - With Counter Animation */}
      {/* ================================================================== */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <AnimatedStat key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* MODULES SECTION */}
      {/* ================================================================== */}
      <section id="modules" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              13 Modules. Một hệ sinh thái.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Được thiết kế đặc biệt cho ngành logistics Việt Nam,
              tích hợp đầy đủ từ vận hành đến quản trị
            </p>
          </div>

          {/* Module Groups - With Staggered Animation */}
          <div className="space-y-12">
            {MODULE_GROUPS.map((group, groupIndex) => {
              let moduleOffset = 0;
              for (let i = 0; i < groupIndex; i++) {
                moduleOffset += MODULE_GROUPS[i].modules.length;
              }
              return (
                <div key={groupIndex} className="bg-slate-50 rounded-2xl p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                    <span className="text-sm text-slate-400">·</span>
                    <span className="text-sm text-slate-500">{group.desc}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {group.modules.map((module, moduleIndex) => (
                      <AnimatedModuleCard
                        key={module.id}
                        module={module}
                        delay={(moduleOffset + moduleIndex) * 100}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* WHY CHOOSE - AI & Vietnam Focus */}
      {/* ================================================================== */}
      <section id="features" className="py-24 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Tại sao chọn 9log?
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Xây dựng bởi người Việt, cho doanh nghiệp Việt,
              với công nghệ AI tiên tiến nhất
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* AI Highlight */}
          <div className="mt-16 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30 shrink-0">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  AI Assistant - Trợ lý thông minh
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Tích hợp trí tuệ nhân tạo giúp dự báo nhu cầu, tối ưu tuyến đường,
                  phát hiện bất thường, và đề xuất quyết định. Tiết kiệm đến 30% chi phí vận hành
                  với các gợi ý thông minh từ AI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* TESTIMONIALS */}
      {/* ================================================================== */}
      <section id="testimonials" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              Được tin dùng bởi 200+ doanh nghiệp Việt Nam
            </h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, i) => (
              <div
                key={i}
                className="p-6 lg:p-8 bg-white border border-slate-200 rounded-2xl hover:shadow-xl transition-shadow"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>

                <p className="text-slate-700 leading-relaxed mb-6">"{item.quote}"</p>

                <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-slate-600">
                      {item.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{item.author}</div>
                    <div className="text-sm text-slate-500">{item.role}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {item.company} · {item.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING */}
      {/* ================================================================== */}
      <section id="pricing" className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              Minh bạch. Không phí ẩn.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Bắt đầu miễn phí, nâng cấp khi doanh nghiệp phát triển
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl transition-all ${
                  plan.popular
                    ? "bg-slate-900 text-white shadow-2xl scale-105 z-10"
                    : "bg-white border border-slate-200 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    Phổ biến nhất
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${plan.popular ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-1 text-sm ${plan.popular ? "text-slate-400" : "text-slate-500"}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className="mb-6">
                  <span className={`text-4xl font-bold ${plan.popular ? "text-white" : "text-slate-900"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.popular ? "text-slate-400" : "text-slate-500"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 mt-0.5 shrink-0 ${plan.popular ? "text-red-400" : "text-green-500"}`} />
                      <span className={`text-sm ${plan.popular ? "text-slate-300" : "text-slate-600"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block w-full py-3.5 text-center font-semibold rounded-xl transition-all ${
                    plan.popular
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FINAL CTA */}
      {/* ================================================================== */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Sẵn sàng nâng tầm logistics<br />doanh nghiệp của bạn?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Tham gia cùng hơn 200 doanh nghiệp đã tin dùng 9log.
            Triển khai nhanh chóng, hỗ trợ tận tình từ đội ngũ Việt Nam.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-xl shadow-red-500/30 hover:shadow-red-500/40"
            >
              Bắt đầu miễn phí ngay
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="tel:1900xxxx"
              className="inline-flex items-center gap-2 px-8 py-4 text-white border border-white/30 hover:bg-white/10 font-semibold rounded-xl transition-all"
            >
              <PhoneCall className="w-5 h-5" />
              Hotline: 1900 xxxx
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Triển khai 24h
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Bảo mật dữ liệu
            </span>
            <span className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5" />
              Hỗ trợ 24/7
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER */}
      {/* ================================================================== */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">9</span>
                </div>
                <span className="text-xl font-bold text-white">
                  9log<span className="text-red-500">.tech</span>
                </span>
              </Link>
              <p className="mt-4 text-sm text-slate-400 max-w-xs">
                Nền tảng Logistics ERP hàng đầu Việt Nam.
                Vì Việt Nam phát triển.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                🇻🇳 Proudly made in Vietnam
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Sản phẩm</h4>
              <ul className="space-y-3">
                {["Tính năng", "Modules", "Bảng giá", "API"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Công ty</h4>
              <ul className="space-y-3">
                {["Về chúng tôi", "Blog", "Tuyển dụng", "Liên hệ"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Hỗ trợ</h4>
              <ul className="space-y-3">
                {["Tài liệu", "Help Center", "Status", "Hotline"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2025 9log.tech · Bản quyền thuộc Công ty TNHH Công nghệ 9Log
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                Điều khoản
              </a>
              <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                Bảo mật
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

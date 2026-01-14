"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Loader2, X, ChevronDown, Info, ChevronRight, Calculator } from "lucide-react";

interface TariffItem {
  l: number;
  hs: string;
  vi: string;
  en: string;
  u: string;
  // Import tax rates
  nk_tt: string;
  nk_ud: string;
  vat: string;
  // FTA rates
  acfta: string;
  atiga: string;
  ajcep: string;
  vjepa: string;
  akfta: string;
  aanzfta: string;
  aifta: string;
  vkfta: string;
  vcfta: string;
  vneaeu: string;
  cptpp: string;
  ahkfta: string;
  vncu: string;
  evfta: string;
  ukvfta: string;
  vnlao: string;
  vifta: string;
  // RCEPT
  rcept_a: string;
  rcept_b: string;
  rcept_c: string;
  rcept_d: string;
  rcept_e: string;
  rcept_f: string;
  // Other taxes
  ttdb: string;
  xk: string;
  xk_cptpp: string;
  xk_ev: string;
  xk_ukv: string;
  bvmt: string;
  // Policy
  policy: string;
  vat_reduce: string;
}

// Extended item with index for hierarchy tracking
interface TariffItemWithIndex extends TariffItem {
  originalIndex: number;
}

// FTA column groups for organized display
const FTA_GROUPS = [
  {
    name: "Thuế NK",
    color: "bg-blue-600",
    columns: [
      { key: "nk_tt", label: "NK TT", fullName: "Thuế NK Thông thường" },
      { key: "nk_ud", label: "NK ƯĐ", fullName: "Thuế NK Ưu đãi" },
      { key: "vat", label: "VAT", fullName: "Thuế GTGT" },
    ]
  },
  {
    name: "ASEAN",
    color: "bg-green-600",
    columns: [
      { key: "atiga", label: "ATIGA", fullName: "ASEAN Trade in Goods Agreement" },
      { key: "acfta", label: "ACFTA", fullName: "ASEAN-China FTA" },
      { key: "akfta", label: "AKFTA", fullName: "ASEAN-Korea FTA" },
      { key: "ajcep", label: "AJCEP", fullName: "ASEAN-Japan CEP" },
      { key: "aanzfta", label: "AANZFTA", fullName: "ASEAN-Australia-New Zealand FTA" },
      { key: "aifta", label: "AIFTA", fullName: "ASEAN-India FTA" },
      { key: "ahkfta", label: "AHKFTA", fullName: "ASEAN-Hong Kong FTA" },
    ]
  },
  {
    name: "Song phương",
    color: "bg-purple-600",
    columns: [
      { key: "vjepa", label: "VJEPA", fullName: "Vietnam-Japan EPA" },
      { key: "vkfta", label: "VKFTA", fullName: "Vietnam-Korea FTA" },
      { key: "vcfta", label: "VCFTA", fullName: "Vietnam-Chile FTA" },
      { key: "evfta", label: "EVFTA", fullName: "EU-Vietnam FTA" },
      { key: "ukvfta", label: "UKVFTA", fullName: "UK-Vietnam FTA" },
      { key: "vneaeu", label: "VN-EAEU", fullName: "Vietnam-Eurasian Economic Union" },
      { key: "vncu", label: "VN-CU", fullName: "Vietnam-Cuba" },
      { key: "vnlao", label: "VN-LAO", fullName: "Vietnam-Laos" },
      { key: "vifta", label: "VIFTA", fullName: "Vietnam-Israel FTA" },
    ]
  },
  {
    name: "Đa phương",
    color: "bg-orange-600",
    columns: [
      { key: "cptpp", label: "CPTPP", fullName: "CPTPP (Hiệp định CPTPP)" },
    ]
  },
  {
    name: "RCEP",
    color: "bg-cyan-600",
    columns: [
      { key: "rcept_a", label: "RCEP-A", fullName: "RCEP - Nhóm A" },
      { key: "rcept_b", label: "RCEP-B", fullName: "RCEP - Nhóm B" },
      { key: "rcept_c", label: "RCEP-C", fullName: "RCEP - Nhóm C" },
      { key: "rcept_d", label: "RCEP-D", fullName: "RCEP - Nhóm D" },
      { key: "rcept_e", label: "RCEP-E", fullName: "RCEP - Nhóm E" },
      { key: "rcept_f", label: "RCEP-F", fullName: "RCEP - Nhóm F" },
    ]
  },
  {
    name: "Thuế khác",
    color: "bg-red-600",
    columns: [
      { key: "ttdb", label: "TTĐB", fullName: "Thuế Tiêu thụ Đặc biệt" },
      { key: "xk", label: "XK", fullName: "Thuế Xuất khẩu" },
      { key: "xk_cptpp", label: "XK-CPTPP", fullName: "Thuế XK theo CPTPP" },
      { key: "xk_ev", label: "XK-EV", fullName: "Thuế XK theo EVFTA" },
      { key: "xk_ukv", label: "XK-UKV", fullName: "Thuế XK theo UKVFTA" },
      { key: "bvmt", label: "BVMT", fullName: "Thuế Bảo vệ Môi trường" },
    ]
  },
];

const ITEMS_PER_PAGE = 50;

// Column widths state
interface ColumnWidths {
  hs: number;
  vi: number;
  unit: number;
  [key: string]: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  hs: 100,
  vi: 300,
  unit: 60,
};

// Highlight text component
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 text-yellow-900 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function TariffLookupPage() {
  const [allData, setAllData] = useState<TariffItemWithIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [chapterFilter, setChapterFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<TariffItem | null>(null);
  const [visibleGroups, setVisibleGroups] = useState<string[]>(["Thuế NK", "ASEAN"]);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [resizing, setResizing] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load data
  useEffect(() => {
    fetch("/data/tariff-2026.json")
      .then((res) => res.json())
      .then((data: TariffItem[]) => {
        // Add original index to each item for hierarchy tracking
        const dataWithIndex = data.map((item, idx) => ({
          ...item,
          originalIndex: idx
        }));
        setAllData(dataWithIndex);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading tariff data:", err);
        setLoading(false);
      });
  }, []);

  // Debounced search
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  // Find parent items for a given index
  const findParentItems = useCallback((targetIndex: number, data: TariffItemWithIndex[]): number[] => {
    const targetItem = data[targetIndex];
    if (!targetItem || targetItem.l === 0) return [];

    const parents: number[] = [];
    const targetLevel = targetItem.l;

    // Go backwards to find parents
    for (let i = targetIndex - 1; i >= 0; i--) {
      const item = data[i];
      if (item.l < targetLevel && (parents.length === 0 || item.l < data[parents[parents.length - 1]].l)) {
        parents.push(i);
        if (item.l === 0) break;
      }
    }

    return parents;
  }, []);

  // Find child items for a given index
  const findChildItems = useCallback((targetIndex: number, data: TariffItemWithIndex[]): number[] => {
    const targetItem = data[targetIndex];
    if (!targetItem) return [];

    const children: number[] = [];
    const targetLevel = targetItem.l;

    // Go forwards to find children
    for (let i = targetIndex + 1; i < data.length; i++) {
      const item = data[i];
      if (item.l <= targetLevel) break;
      children.push(i);
    }

    return children;
  }, []);

  // Filter data with parent/child hierarchy
  const filteredData = useMemo(() => {
    let result = allData;

    if (chapterFilter) {
      result = result.filter((item) => item.hs && item.hs.startsWith(chapterFilter));
    }

    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase().trim();

      // Find all matching indices
      const matchingIndices = new Set<number>();

      allData.forEach((item, idx) => {
        const matches =
          (item.hs && item.hs.toLowerCase().includes(search)) ||
          item.vi.toLowerCase().includes(search) ||
          item.en.toLowerCase().includes(search);

        if (matches) {
          matchingIndices.add(idx);

          // Add parent items
          const parents = findParentItems(idx, allData);
          parents.forEach(p => matchingIndices.add(p));

          // Add child items
          const children = findChildItems(idx, allData);
          children.forEach(c => matchingIndices.add(c));
        }
      });

      // Filter and keep original order
      result = allData.filter((_, idx) => matchingIndices.has(idx));

      // Apply chapter filter after hierarchy expansion
      if (chapterFilter) {
        // Re-filter to only include items that belong to the chapter
        const chapterIndices = new Set<number>();
        result.forEach((item) => {
          if (item.hs && item.hs.startsWith(chapterFilter)) {
            chapterIndices.add(item.originalIndex);
          }
        });

        // Add parents and children for chapter-filtered items
        const expandedIndices = new Set<number>();
        chapterIndices.forEach(idx => {
          expandedIndices.add(idx);
          findParentItems(idx, allData).forEach(p => expandedIndices.add(p));
          findChildItems(idx, allData).forEach(c => expandedIndices.add(c));
        });

        result = result.filter(item => expandedIndices.has(item.originalIndex));
      }
    }

    return result;
  }, [allData, debouncedSearch, chapterFilter, findParentItems, findChildItems]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Chapters for dropdown
  const chapters = useMemo(() => {
    const chapterSet = new Set<string>();
    allData.forEach((item) => {
      if (item.hs && item.hs.length >= 2) {
        chapterSet.add(item.hs.substring(0, 2));
      }
    });
    return Array.from(chapterSet).sort();
  }, [allData]);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setChapterFilter("");
    setCurrentPage(1);
    inputRef.current?.focus();
  };

  // Get indent based on level
  const getIndent = (level: number) => {
    return level * 16;
  };

  // Get row style based on level
  const getRowStyle = (level: number) => {
    if (level === 0) return "bg-slate-100 font-bold text-slate-900";
    if (level === 1) return "bg-slate-50 font-semibold text-slate-800";
    return "bg-white text-slate-700";
  };

  // Toggle column group visibility
  const toggleGroup = (groupName: string) => {
    setVisibleGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return FTA_GROUPS
      .filter(g => visibleGroups.includes(g.name))
      .flatMap(g => g.columns);
  }, [visibleGroups]);

  // Format rate display
  const formatRate = (rate: string) => {
    if (!rate || rate === "") return "—";
    if (rate.includes("/") || rate.includes("*")) {
      return <span className="text-xs">{rate}</span>;
    }
    const num = parseFloat(rate);
    if (isNaN(num)) return rate;
    if (num === 0) return <span className="text-green-600 font-semibold">0</span>;
    return <span className="text-blue-600">{rate}</span>;
  };

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnKey);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnKey] || 60;
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(40, startWidthRef.current + diff);
    setColumnWidths(prev => ({ ...prev, [resizing]: newWidth }));
  }, [resizing]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, handleResizeMove, handleResizeEnd]);

  // Calculate sticky left positions
  const stickyLeftPositions = useMemo(() => {
    return {
      hs: 0,
      vi: columnWidths.hs,
      unit: columnWidths.hs + columnWidths.vi,
    };
  }, [columnWidths.hs, columnWidths.vi]);

  // Total sticky width
  const totalStickyWidth = columnWidths.hs + columnWidths.vi + columnWidths.unit;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Compact Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Biểu thuế XNK 2026</h1>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {allData.length.toLocaleString()} mục · {FTA_GROUPS.reduce((a, g) => a + g.columns.length, 0)} loại thuế
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/tools/import-tax"
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Tính thuế NK</span>
            </Link>
            <Link href="/" className="flex items-center gap-1">
              <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-sm">9</span>
              <span className="font-bold text-white">log<span className="text-red-500">.tech</span></span>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Bar - Fixed */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-14 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex gap-3 flex-wrap">
            {/* Search Input */}
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập mã HS hoặc tên hàng hóa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Chapter Filter */}
            <div className="relative">
              <select
                value={chapterFilter}
                onChange={(e) => {
                  setChapterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-3 pr-8 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer"
              >
                <option value="">Tất cả chương</option>
                {chapters.map((ch) => (
                  <option key={ch} value={ch}>
                    Chương {ch}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Clear Button */}
            {(searchTerm || chapterFilter) && (
              <button
                onClick={clearSearch}
                className="h-10 px-4 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Xóa lọc
              </button>
            )}
          </div>

          {/* Column Group Toggles */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center mr-1">Hiển thị:</span>
            {FTA_GROUPS.map(group => (
              <button
                key={group.name}
                onClick={() => toggleGroup(group.name)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  visibleGroups.includes(group.name)
                    ? `${group.color} text-white`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {group.name} ({group.columns.length})
              </button>
            ))}
          </div>

          {/* Results Info */}
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>
              {loading ? "Đang tải..." : `Tìm thấy ${filteredData.length.toLocaleString()} kết quả`}
              {debouncedSearch && <span className="ml-2 text-xs text-slate-400">(bao gồm mục cha/con)</span>}
            </span>
            {totalPages > 1 && (
              <span>
                Trang {currentPage}/{totalPages}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="ml-3 text-slate-600">Đang tải dữ liệu...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">Không tìm thấy kết quả</p>
            <p className="mt-2 text-sm">Thử từ khóa khác hoặc xóa bộ lọc</p>
          </div>
        ) : (
          <>
            {/* Table Container */}
            <div
              ref={tableContainerRef}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-auto relative"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <table className="w-full text-xs border-collapse">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-30">
                  {/* Group Header Row */}
                  <tr className="bg-slate-800 text-white text-xs">
                    {/* Fixed columns - span */}
                    <th
                      rowSpan={2}
                      className="px-2 py-2 text-left font-semibold whitespace-nowrap sticky left-0 bg-slate-900 z-40 border-r border-slate-700"
                      style={{ width: columnWidths.hs, minWidth: columnWidths.hs }}
                    >
                      <div className="flex items-center justify-between">
                        <span>Mã HS</span>
                        <div
                          className="w-1 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-red-400 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, 'hs')}
                        />
                      </div>
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2 py-2 text-left font-semibold sticky bg-slate-900 z-40 border-r border-slate-700"
                      style={{
                        width: columnWidths.vi,
                        minWidth: columnWidths.vi,
                        left: stickyLeftPositions.vi
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span>Mô tả hàng hóa</span>
                        <div
                          className="w-1 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-red-400 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, 'vi')}
                        />
                      </div>
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2 py-2 text-center font-semibold sticky bg-slate-900 z-40 border-r border-slate-700"
                      style={{
                        width: columnWidths.unit,
                        minWidth: columnWidths.unit,
                        left: stickyLeftPositions.unit
                      }}
                    >
                      <div className="flex items-center justify-center relative">
                        <span>ĐVT</span>
                        <div
                          className="w-1 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-red-400 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, 'unit')}
                        />
                      </div>
                    </th>
                    {/* Group headers */}
                    {FTA_GROUPS.filter(g => visibleGroups.includes(g.name)).map(group => (
                      <th
                        key={group.name}
                        colSpan={group.columns.length}
                        className={`px-1 py-1 text-center font-semibold border-x border-slate-700 ${
                          group.name === "Thuế NK" ? "bg-slate-700" :
                          group.name === "ASEAN" ? "bg-emerald-700" :
                          group.name === "Song phương" ? "bg-violet-700" :
                          group.name === "Đa phương" ? "bg-amber-700" :
                          group.name === "RCEP" ? "bg-cyan-700" :
                          "bg-rose-700"
                        }`}
                      >
                        {group.name}
                      </th>
                    ))}
                    <th
                      rowSpan={2}
                      className="px-2 py-2 text-left font-semibold relative"
                      style={{ width: columnWidths['policy'] || 200, minWidth: 100 }}
                      title="Chính sách mặt hàng theo mã HS"
                    >
                      <div className="flex items-center justify-between relative">
                        <span>Chính sách</span>
                        <div
                          className="w-1 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-red-400 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, 'policy')}
                        />
                      </div>
                    </th>
                    <th rowSpan={2} className="px-2 py-2 text-center font-semibold w-[40px]">Chi tiết</th>
                  </tr>
                  {/* Column Header Row with Vertical Text */}
                  <tr className="bg-slate-900 text-white">
                    {/* Tax columns - vertical text */}
                    {FTA_GROUPS.filter(g => visibleGroups.includes(g.name)).map(group =>
                      group.columns.map(col => {
                        const groupBg =
                          group.name === "Thuế NK" ? "bg-slate-800" :
                          group.name === "ASEAN" ? "bg-emerald-800" :
                          group.name === "Song phương" ? "bg-violet-800" :
                          group.name === "Đa phương" ? "bg-amber-800" :
                          group.name === "RCEP" ? "bg-cyan-800" :
                          "bg-rose-800";

                        return (
                          <th
                            key={col.key}
                            className={`px-1 py-2 text-center font-semibold relative ${groupBg}`}
                            style={{ width: columnWidths[col.key] || 60, minWidth: 50, height: '80px' }}
                            title={col.fullName}
                          >
                            <div className="relative h-full flex items-end justify-start" style={{ paddingBottom: '4px', paddingLeft: '4px' }}>
                              <span
                                className="text-xs whitespace-nowrap"
                                style={{
                                  transform: 'rotate(-45deg)',
                                  transformOrigin: 'left bottom',
                                  display: 'inline-block'
                                }}
                              >
                                {col.label}
                              </span>
                              <div
                                className="w-1 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-red-400 transition-colors"
                                onMouseDown={(e) => handleResizeStart(e, col.key)}
                              />
                            </div>
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, idx) => {
                    // Check if this item matches search
                    const isDirectMatch = debouncedSearch && (
                      (item.hs && item.hs.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                      item.vi.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                      item.en.toLowerCase().includes(debouncedSearch.toLowerCase())
                    );

                    return (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 hover:bg-red-50 cursor-pointer ${getRowStyle(item.l)} ${
                          isDirectMatch ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        {/* Fixed columns */}
                        <td
                          className="px-2 py-1.5 font-mono sticky left-0 z-20 border-r border-slate-200"
                          style={{
                            width: columnWidths.hs,
                            minWidth: columnWidths.hs,
                            backgroundColor: item.l === 0 ? '#f1f5f9' : item.l === 1 ? '#f8fafc' : isDirectMatch ? '#fefce8' : 'white'
                          }}
                        >
                          {item.hs ? (
                            <span className="text-red-600 font-semibold">
                              <HighlightText text={item.hs} highlight={debouncedSearch} />
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td
                          className="px-2 py-1.5 sticky z-20 border-r border-slate-200"
                          style={{
                            width: columnWidths.vi,
                            minWidth: columnWidths.vi,
                            left: stickyLeftPositions.vi,
                            paddingLeft: `${8 + getIndent(item.l)}px`,
                            backgroundColor: item.l === 0 ? '#f1f5f9' : item.l === 1 ? '#f8fafc' : isDirectMatch ? '#fefce8' : 'white'
                          }}
                        >
                          <div className="line-clamp-2">
                            <HighlightText text={item.vi} highlight={debouncedSearch} />
                          </div>
                        </td>
                        <td
                          className="px-2 py-1.5 text-center text-slate-500 sticky z-20 border-r border-slate-200"
                          style={{
                            width: columnWidths.unit,
                            minWidth: columnWidths.unit,
                            left: stickyLeftPositions.unit,
                            backgroundColor: item.l === 0 ? '#f1f5f9' : item.l === 1 ? '#f8fafc' : isDirectMatch ? '#fefce8' : 'white'
                          }}
                        >
                          {item.u || "—"}
                        </td>
                        {/* Tax columns */}
                        {visibleColumns.map(col => (
                          <td
                            key={col.key}
                            className="px-2 py-1.5 text-center"
                            style={{ width: columnWidths[col.key] || 55 }}
                          >
                            {formatRate((item as any)[col.key])}
                          </td>
                        ))}
                        {/* Policy column */}
                        <td
                          className="px-2 py-1.5 text-left text-xs"
                          style={{ width: columnWidths['policy'] || 200 }}
                        >
                          {item.policy ? (
                            <div className="line-clamp-2 text-orange-700" title={item.policy}>
                              {item.policy}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1 flex-wrap">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Đầu
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>

                {/* Page numbers */}
                {(() => {
                  const pages: number[] = [];
                  const start = Math.max(1, currentPage - 2);
                  const end = Math.min(totalPages, currentPage + 2);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-10 py-2 text-sm border rounded ${
                        p === currentPage
                          ? "bg-red-500 text-white border-red-500"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ));
                })()}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cuối
                </button>

                {/* Jump to page */}
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Đến trang:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    className="w-16 h-9 px-2 text-sm border border-slate-300 rounded text-center focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        if (val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal - Compact */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Compact */}
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between sticky top-0 z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedItem.hs && (
                    <span className="bg-red-500 px-2 py-0.5 rounded font-mono font-bold text-sm">
                      {selectedItem.hs}
                    </span>
                  )}
                  <span className="font-semibold text-sm truncate">{selectedItem.vi}</span>
                  {selectedItem.u && (
                    <span className="text-xs text-slate-400">({selectedItem.u})</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors ml-2 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Compact */}
            <div className="p-2">
              {/* Policy Info - Compact */}
              {selectedItem.policy && (
                <div className="mb-2 p-1.5 bg-orange-50 border border-orange-200 rounded text-[10px] text-orange-700">
                  <span className="font-semibold">Chính sách:</span> {selectedItem.policy}
                </div>
              )}

              {/* All Tax Rates Grouped - Compact 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
                {FTA_GROUPS.map(group => (
                  <div key={group.name} className="border border-slate-200 rounded overflow-hidden">
                    {/* Group Header */}
                    <div className={`px-2 py-0.5 ${group.color} text-white font-semibold text-[10px]`}>
                      {group.name}
                    </div>
                    {/* Group Items */}
                    <div className="p-1 bg-slate-50 grid grid-cols-3 gap-1">
                      {group.columns.map(col => {
                        const rate = (selectedItem as any)[col.key];
                        const hasValue = rate && rate !== "";
                        return (
                          <div
                            key={col.key}
                            className={`text-center p-1 rounded border ${
                              !hasValue ? 'bg-white border-slate-200' :
                              rate === "0" ? 'bg-green-50 border-green-300' :
                              'bg-blue-50 border-blue-300'
                            }`}
                            title={col.fullName}
                          >
                            <div className="text-[10px] text-slate-600 font-medium">{col.label}</div>
                            <div className="font-bold text-xs">
                              {!hasValue ? (
                                <span className="text-slate-300">—</span>
                              ) : rate === "0" ? (
                                <span className="text-green-600">0</span>
                              ) : (
                                <span className="text-blue-600">{rate}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action + Note Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-t border-slate-200 pt-2">
                <p className="text-[9px] text-slate-500 flex-1">
                  * Thuế ưu đãi FTA cần C/O hợp lệ. VAT */5/8/10 = miễn/5%/8%/10% tùy điều kiện.
                </p>
                <Link
                  href={`/tools/import-tax?hs=${selectedItem.hs || ""}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors shrink-0"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Tính thuế NK
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 text-center text-sm text-slate-400">
          <p>Dữ liệu biểu thuế cập nhật theo Nghị định mới nhất của Chính phủ (01/2026)</p>
          <p className="mt-1">
            © 2026{" "}
            <Link href="/" className="text-red-500 hover:underline">
              9log.tech
            </Link>{" "}
            - Công cụ tra cứu miễn phí cho ngành Logistics Việt Nam
          </p>
        </div>
      </footer>
    </div>
  );
}

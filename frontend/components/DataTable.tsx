"use client";

import { useState, useRef, useCallback, useMemo, ReactNode } from "react";

// ============ Types ============
export interface Column<T> {
  key: string;
  header: string | ReactNode;
  width?: number; // Initial width in pixels
  minWidth?: number; // Minimum width when resizing
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  maxHeight?: string; // e.g. "calc(100vh - 300px)"
  stickyHeader?: boolean;
}

export type SortDirection = "asc" | "desc" | null;
export interface SortState {
  column: string | null;
  direction: SortDirection;
}

// ============ Sort Icon ============
function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") {
    return (
      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

// ============ DataTable Component ============
export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "Không có dữ liệu",
  rowKey,
  onRowClick,
  maxHeight,
  stickyHeader = true,
}: DataTableProps<T>) {
  // Column widths state (for resizing)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      widths[col.key] = col.width || 150;
    });
    return widths;
  });

  // Sort state
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });

  // Resizing state
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Handle sort click
  const handleSort = useCallback((columnKey: string) => {
    setSort((prev) => {
      if (prev.column !== columnKey) {
        return { column: columnKey, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column: columnKey, direction: "desc" };
      }
      return { column: null, direction: null };
    });
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizingColumn.current = columnKey;
      startX.current = e.clientX;
      startWidth.current = columnWidths[columnKey];

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizingColumn.current) return;
        const diff = e.clientX - startX.current;
        const col = columns.find((c) => c.key === resizingColumn.current);
        const minWidth = col?.minWidth || 60;
        const newWidth = Math.max(minWidth, startWidth.current + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizingColumn.current!]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        resizingColumn.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths, columns]
  );

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sort.column || !sort.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sort.column!];
      const bVal = (b as any)[sort.column!];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sort.direction === "asc" ? 1 : -1;
      if (bVal == null) return sort.direction === "asc" ? -1 : 1;

      // Compare
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sort.direction === "asc") {
        return aStr.localeCompare(bStr, "vi");
      }
      return bStr.localeCompare(aStr, "vi");
    });
  }, [data, sort]);

  // Total table width
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (columnWidths[col.key] || 150), 0);
  }, [columns, columnWidths]);

  const heightStyle = maxHeight === "none" ? undefined : { maxHeight: maxHeight || "calc(100vh - 320px)" };

  return (
    <div
      className="overflow-auto rounded-xl border border-gray-200 bg-white"
      style={heightStyle}
    >
      <table className="text-sm" style={{ width: totalWidth, minWidth: "100%" }}>
        <thead className={`bg-gray-50 text-gray-700 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
          <tr>
            {columns.map((col) => {
              const isSorted = sort.column === col.key;
              const sortDir = isSorted ? sort.direction : null;

              return (
                <th
                  key={col.key}
                  className={`relative px-4 py-3 font-bold text-${col.align || "left"} select-none border-r border-gray-100 last:border-r-0`}
                  style={{ width: columnWidths[col.key], minWidth: col.minWidth || 60 }}
                >
                  <div
                    className={`flex items-center ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""} ${col.sortable !== false ? "cursor-pointer hover:text-blue-600" : ""}`}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <span>{col.header}</span>
                    {col.sortable !== false && <SortIcon direction={sortDir} />}
                  </div>
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500"
                    onMouseDown={(e) => handleResizeStart(e, col.key)}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Đang tải...
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                className={`border-t hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-${col.align || "left"}`}
                    style={{ width: columnWidths[col.key] }}
                  >
                    {col.render ? col.render(row, rowIndex) : (row as any)[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============ PageSizeSelector ============
interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [50, 100, 200],
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Hiển thị:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-200 outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt} dòng
          </option>
        ))}
      </select>
    </div>
  );
}

// ============ Pagination ============
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemName?: string;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemName = "dòng",
  pageSizeOptions = [50, 100, 200],
}: PaginationProps) {
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
      <div className="flex items-center gap-4">
        <PageSizeSelector
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          options={pageSizeOptions}
        />
        <span className="text-xs text-gray-600">
          Hiển thị {startIndex} - {endIndex} / {totalItems} {itemName}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Trang đầu"
          >
            ««
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Trang trước"
          >
            «
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1;
            // Show: first, last, current-1, current, current+1
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-xs border rounded ${
                    currentPage === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 text-xs text-gray-400">
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Trang sau"
          >
            »
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Trang cuối"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}

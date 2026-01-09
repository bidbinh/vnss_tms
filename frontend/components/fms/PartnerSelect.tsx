"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, X, Building2, User, Loader2 } from "lucide-react";

// Types for partner data
export interface ExporterData {
  id: string;
  name: string;
  full_address: string;
  country_code: string | null;
  tax_code: string | null;
}

export interface ImporterData {
  id: string;
  name: string;
  tax_code: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
}

interface PartnerSelectProps<T> {
  partnerType: "exporter" | "importer";
  value: string; // Selected name
  onChange: (partner: T | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ExporterSelect({
  value,
  onChange,
  placeholder = "Chọn hoặc nhập tên người xuất khẩu...",
  disabled = false,
  className = "",
}: Omit<PartnerSelectProps<ExporterData>, "partnerType">) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<ExporterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search API
  const searchExporters = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/v1/fms/customs-partners/exporters/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error("Failed to search exporters:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        searchExporters(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, searchExporters]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Pre-fill search with current value
      if (value && !searchQuery) {
        setSearchQuery(value);
        searchExporters(value);
      }
    }
  }, [isOpen]);

  const handleSelect = (exporter: ExporterData) => {
    onChange(exporter);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (options[highlightedIndex]) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between gap-2
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-gray-400"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-300"}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${value ? "text-gray-900" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tên người xuất khẩu..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <li className="px-3 py-4 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-4 text-center text-gray-500 text-sm">
                {searchQuery ? "Không tìm thấy kết quả" : "Nhập tên để tìm kiếm"}
              </li>
            ) : (
              options.map((exporter, index) => (
                <li
                  key={exporter.id}
                  onClick={() => handleSelect(exporter)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    px-3 py-2 cursor-pointer
                    ${highlightedIndex === index ? "bg-blue-50" : "hover:bg-gray-50"}
                  `}
                >
                  <div className="font-medium text-gray-900">{exporter.name}</div>
                  <div className="text-sm text-gray-500 truncate">{exporter.full_address}</div>
                  {exporter.country_code && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                      {exporter.country_code}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ImporterSelect({
  value,
  onChange,
  placeholder = "Chọn hoặc nhập tên người nhập khẩu...",
  disabled = false,
  className = "",
}: Omit<PartnerSelectProps<ImporterData>, "partnerType">) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<ImporterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search API
  const searchImporters = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/v1/fms/customs-partners/importers/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error("Failed to search importers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        searchImporters(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, searchImporters]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      if (value && !searchQuery) {
        setSearchQuery(value);
        searchImporters(value);
      }
    }
  }, [isOpen]);

  const handleSelect = (importer: ImporterData) => {
    onChange(importer);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (options[highlightedIndex]) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between gap-2
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-gray-400"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-300"}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${value ? "text-gray-900" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tên hoặc MST..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <li className="px-3 py-4 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-4 text-center text-gray-500 text-sm">
                {searchQuery ? "Không tìm thấy kết quả" : "Nhập tên hoặc MST để tìm kiếm"}
              </li>
            ) : (
              options.map((importer, index) => (
                <li
                  key={importer.id}
                  onClick={() => handleSelect(importer)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    px-3 py-2 cursor-pointer
                    ${highlightedIndex === index ? "bg-blue-50" : "hover:bg-gray-50"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{importer.name}</span>
                    {importer.tax_code && (
                      <span className="text-sm text-blue-600 font-mono">{importer.tax_code}</span>
                    )}
                  </div>
                  {importer.address && (
                    <div className="text-sm text-gray-500 truncate">{importer.address}</div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

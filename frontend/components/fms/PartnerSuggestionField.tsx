"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Check, ChevronsUpDown, Plus, Sparkles, Search } from "lucide-react";

interface PartnerMatchResult {
  partner_id: string;
  name: string;
  address?: string;
  tax_code?: string;
  country_code?: string;
  // Importer specific fields
  postal_code?: string;
  phone?: string;
  match_method: string;
  confidence: number;
}

interface PartnerMatchResponse {
  best_match: PartnerMatchResult | null;
  alternatives: PartnerMatchResult[];
  should_auto_select: boolean;
}

// Database search result types
interface ExporterSearchResult {
  id: string;
  name: string;
  full_address: string;
  country_code: string | null;
  tax_code: string | null;
}

interface ImporterSearchResult {
  id: string;
  name: string;
  tax_code: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
}

interface PartnerSuggestionFieldProps {
  partnerType: "EXPORTER" | "IMPORTER";
  extractedName: string;
  extractedAddress?: string;
  extractedTaxCode?: string;
  value?: string; // Selected partner ID
  onPartnerSelect: (partner: PartnerMatchResult | null) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
}

export function PartnerSuggestionField({
  partnerType,
  extractedName,
  extractedAddress,
  extractedTaxCode,
  value,
  onPartnerSelect,
  onCreateNew,
  disabled = false,
}: PartnerSuggestionFieldProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<PartnerMatchResponse | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerMatchResult | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PartnerMatchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (extractedName) {
      fetchPartnerMatch();
    }
  }, [extractedName, extractedTaxCode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Search partners from database
  const searchPartners = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const endpoint = partnerType === "EXPORTER"
        ? `/api/v1/fms/customs-partners/exporters/search?q=${encodeURIComponent(query)}&limit=20`
        : `/api/v1/fms/customs-partners/importers/search?q=${encodeURIComponent(query)}&limit=20`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Convert to PartnerMatchResult format
        const results: PartnerMatchResult[] = data.map((item: ExporterSearchResult | ImporterSearchResult) => {
          if (partnerType === "EXPORTER") {
            const exp = item as ExporterSearchResult;
            return {
              partner_id: exp.id,
              name: exp.name,
              address: exp.full_address,
              tax_code: exp.tax_code || undefined,
              country_code: exp.country_code || undefined,
              match_method: "DATABASE_SEARCH",
              confidence: 1.0,
            };
          } else {
            const imp = item as ImporterSearchResult;
            return {
              partner_id: imp.id,
              name: imp.name,
              address: imp.address || undefined,
              tax_code: imp.tax_code || undefined,
              postal_code: imp.postal_code || undefined,
              phone: imp.phone || undefined,
              match_method: "DATABASE_SEARCH",
              confidence: 1.0,
            };
          }
        });
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Partner search failed:", error);
    } finally {
      setSearchLoading(false);
    }
  }, [partnerType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && searchQuery) {
        searchPartners(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, open, searchPartners]);

  const fetchPartnerMatch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/v1/fms/ai-training/partners/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_type: partnerType,
          name: extractedName,
          address: extractedAddress,
          tax_code: extractedTaxCode,
        }),
      });

      if (response.ok) {
        const data: PartnerMatchResponse = await response.json();
        setMatchResult(data);

        // Auto-select if high confidence
        if (data.should_auto_select && data.best_match && !autoSelected) {
          setSelectedPartner(data.best_match);
          onPartnerSelect(data.best_match);
          setAutoSelected(true);
        }
      }
    } catch (error) {
      console.error("Partner matching failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (partner: PartnerMatchResult) => {
    setSelectedPartner(partner);
    onPartnerSelect(partner);
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    setSelectedPartner(null);
    onPartnerSelect(null);
    onCreateNew?.();
    setOpen(false);
  };

  // Combine AI matches and search results
  const aiPartners = matchResult
    ? [matchResult.best_match, ...matchResult.alternatives].filter(
        (p): p is PartnerMatchResult => p !== null
      )
    : [];

  // Show search results if user is searching, otherwise show AI matches
  const displayPartners = searchQuery ? searchResults : aiPartners;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-700";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-700";
    return "bg-orange-100 text-orange-700";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs text-gray-500 mb-1">
        Tên {partnerType === "EXPORTER" ? "người xuất khẩu" : "người nhập khẩu"}
        {autoSelected && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
            <Sparkles className="h-3 w-3" />
            Auto-matched
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-left
          border rounded-md text-sm
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:bg-gray-50 cursor-pointer"}
          ${selectedPartner ? "border-green-300" : "border-gray-300"}
        `}
      >
        <span className="flex-1 truncate">
          {loading ? (
            <span className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm kiếm...
            </span>
          ) : selectedPartner ? (
            <span className="flex items-center gap-2">
              {selectedPartner.name}
              <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(selectedPartner.confidence)}`}>
                {Math.round(selectedPartner.confidence * 100)}%
              </span>
            </span>
          ) : extractedName ? (
            <span className="text-gray-700">{extractedName}</span>
          ) : (
            <span className="text-gray-400">Chọn đối tác...</span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gõ để tìm kiếm..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-60 overflow-auto">
            {searchLoading || loading ? (
              <div className="p-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tìm kiếm...
              </div>
            ) : displayPartners.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchQuery ? "Không tìm thấy kết quả" : "Nhập tên để tìm kiếm hoặc chọn từ gợi ý AI"}
              </div>
            ) : (
              <div className="py-1">
                {!searchQuery && aiPartners.length > 0 && (
                  <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Gợi ý từ AI
                  </div>
                )}
                {searchQuery && searchResults.length > 0 && (
                  <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Kết quả tìm kiếm
                  </div>
                )}
                {displayPartners.map((partner) => (
                  <button
                    key={partner.partner_id}
                    type="button"
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-left text-sm
                      hover:bg-gray-100
                      ${selectedPartner?.partner_id === partner.partner_id ? "bg-blue-50" : ""}
                    `}
                    onClick={() => handleSelect(partner)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{partner.name}</div>
                      {partner.address && (
                        <div className="text-xs text-gray-500 truncate">{partner.address}</div>
                      )}
                      {partner.tax_code && (
                        <div className="text-xs text-blue-600 font-mono">{partner.tax_code}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {partner.match_method !== "DATABASE_SEARCH" && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(partner.confidence)}`}>
                          {Math.round(partner.confidence * 100)}%
                        </span>
                      )}
                      {partner.country_code && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                          {partner.country_code}
                        </span>
                      )}
                      {selectedPartner?.partner_id === partner.partner_id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              onClick={handleCreateNew}
            >
              <Plus className="h-4 w-4" />
              Tạo mới / Nhập thủ công
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

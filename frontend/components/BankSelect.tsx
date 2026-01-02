"use client";

import { useState, useRef, useEffect } from "react";

// Vietnamese banks sorted by popularity (most used first)
// Name matches VietQR recognition
export const VIETNAM_BANKS = [
  { code: "VCB", name: "Vietcombank", fullName: "Ngân hàng TMCP Ngoại Thương Việt Nam", bin: "970436" },
  { code: "TCB", name: "Techcombank", fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam", bin: "970407" },
  { code: "BIDV", name: "BIDV", fullName: "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam", bin: "970418" },
  { code: "VTB", name: "Vietinbank", fullName: "Ngân hàng TMCP Công Thương Việt Nam", bin: "970415" },
  { code: "MB", name: "MBBank", fullName: "Ngân hàng TMCP Quân Đội", bin: "970422" },
  { code: "ACB", name: "ACB", fullName: "Ngân hàng TMCP Á Châu", bin: "970416" },
  { code: "VPB", name: "VPBank", fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng", bin: "970432" },
  { code: "TPB", name: "TPBank", fullName: "Ngân hàng TMCP Tiên Phong", bin: "970423" },
  { code: "STB", name: "Sacombank", fullName: "Ngân hàng TMCP Sài Gòn Thương Tín", bin: "970403" },
  { code: "HDB", name: "HDBank", fullName: "Ngân hàng TMCP Phát Triển TP.HCM", bin: "970437" },
  { code: "VIB", name: "VIB", fullName: "Ngân hàng TMCP Quốc Tế Việt Nam", bin: "970441" },
  { code: "SHB", name: "SHB", fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội", bin: "970443" },
  { code: "EIB", name: "Eximbank", fullName: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", bin: "970431" },
  { code: "MSB", name: "MSB", fullName: "Ngân hàng TMCP Hàng Hải Việt Nam", bin: "970426" },
  { code: "OCB", name: "OCB", fullName: "Ngân hàng TMCP Phương Đông", bin: "970448" },
  { code: "LPB", name: "LienVietPostBank", fullName: "Ngân hàng TMCP Bưu Điện Liên Việt", bin: "970449" },
  { code: "SEAB", name: "SeABank", fullName: "Ngân hàng TMCP Đông Nam Á", bin: "970440" },
  { code: "ABB", name: "ABBank", fullName: "Ngân hàng TMCP An Bình", bin: "970425" },
  { code: "BAB", name: "BacABank", fullName: "Ngân hàng TMCP Bắc Á", bin: "970409" },
  { code: "VARB", name: "Agribank", fullName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", bin: "970405" },
  { code: "NAB", name: "NamABank", fullName: "Ngân hàng TMCP Nam Á", bin: "970428" },
  { code: "PVCB", name: "PVcomBank", fullName: "Ngân hàng TMCP Đại Chúng Việt Nam", bin: "970412" },
  { code: "SCB", name: "SCB", fullName: "Ngân hàng TMCP Sài Gòn", bin: "970429" },
  { code: "NCB", name: "NCB", fullName: "Ngân hàng TMCP Quốc Dân", bin: "970419" },
  { code: "VAB", name: "VietABank", fullName: "Ngân hàng TMCP Việt Á", bin: "970427" },
  { code: "KLB", name: "Kienlongbank", fullName: "Ngân hàng TMCP Kiên Long", bin: "970452" },
  { code: "PGB", name: "PGBank", fullName: "Ngân hàng TMCP Xăng Dầu Petrolimex", bin: "970430" },
  { code: "BVB", name: "BaoVietBank", fullName: "Ngân hàng TMCP Bảo Việt", bin: "970438" },
  { code: "VCCB", name: "VietCapitalBank", fullName: "Ngân hàng TMCP Bản Việt", bin: "970454" },
  { code: "SAIGONBANK", name: "SaigonBank", fullName: "Ngân hàng TMCP Sài Gòn Công Thương", bin: "970400" },
  { code: "GPB", name: "GPBank", fullName: "Ngân hàng TMCP Dầu Khí Toàn Cầu", bin: "970408" },
  { code: "CIMB", name: "CIMB", fullName: "Ngân hàng CIMB Việt Nam", bin: "422589" },
  { code: "UOB", name: "UOB", fullName: "Ngân hàng UOB Việt Nam", bin: "970458" },
  { code: "WOORI", name: "Woori", fullName: "Ngân hàng Woori Việt Nam", bin: "970457" },
  { code: "SCVN", name: "StandardChartered", fullName: "Ngân hàng Standard Chartered Việt Nam", bin: "970410" },
  { code: "SHBVN", name: "ShinhanBank", fullName: "Ngân hàng Shinhan Việt Nam", bin: "970424" },
  { code: "HSBC", name: "HSBC", fullName: "Ngân hàng HSBC Việt Nam", bin: "458761" },
  { code: "CAKE", name: "CAKE", fullName: "Ngân hàng số CAKE by VPBank", bin: "546034" },
  { code: "Ubank", name: "Ubank", fullName: "Ngân hàng số Ubank by VPBank", bin: "546035" },
];

interface BankSelectProps {
  value: string;
  onChange: (bankName: string, bankBin?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function BankSelect({
  value,
  onChange,
  placeholder = "Chọn ngân hàng...",
  className = "",
  disabled = false,
}: BankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter banks based on search
  const filteredBanks = VIETNAM_BANKS.filter((bank) => {
    const searchLower = search.toLowerCase();
    return (
      bank.name.toLowerCase().includes(searchLower) ||
      bank.fullName.toLowerCase().includes(searchLower) ||
      bank.code.toLowerCase().includes(searchLower)
    );
  });

  // Find selected bank
  const selectedBank = VIETNAM_BANKS.find(
    (bank) => bank.name === value || bank.fullName === value || bank.code === value
  );

  const handleSelect = (bank: typeof VIETNAM_BANKS[0]) => {
    onChange(bank.fullName, bank.bin);
    setSearch("");
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center border rounded-lg bg-white ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer"
        } ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-300"}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedBank?.fullName || value || "")}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg outline-none bg-transparent disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="px-2 text-gray-400 hover:text-gray-600"
          disabled={disabled}
        >
          <svg className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredBanks.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Không tìm thấy ngân hàng</div>
          ) : (
            filteredBanks.map((bank) => (
              <div
                key={bank.code}
                onClick={() => handleSelect(bank)}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                  selectedBank?.code === bank.code ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <div className="font-medium text-sm">{bank.name}</div>
                <div className="text-xs text-gray-500 truncate">{bank.fullName}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FileCheck, AlertTriangle, Shield, Leaf, Pill, Zap, Building2, Info } from "lucide-react";

// Specialized inspection agencies in Vietnam
const INSPECTION_AGENCIES = {
  "MARD": { name: "Bộ Nông nghiệp & PTNT", nameEn: "Ministry of Agriculture", icon: Leaf, color: "bg-green-500" },
  "MOH": { name: "Bộ Y tế", nameEn: "Ministry of Health", icon: Pill, color: "bg-red-500" },
  "MOIT": { name: "Bộ Công Thương", nameEn: "Ministry of Industry & Trade", icon: Building2, color: "bg-blue-500" },
  "MOST": { name: "Bộ KH&CN", nameEn: "Ministry of Science & Technology", icon: Zap, color: "bg-purple-500" },
  "MOC": { name: "Bộ Xây dựng", nameEn: "Ministry of Construction", icon: Building2, color: "bg-orange-500" },
  "MONRE": { name: "Bộ TN&MT", nameEn: "Ministry of Natural Resources", icon: Leaf, color: "bg-teal-500" },
  "MOPS": { name: "Bộ Công an", nameEn: "Ministry of Public Security", icon: Shield, color: "bg-slate-700" },
};

// Sample inspection requirements data
const INSPECTION_DATA = [
  {
    hsPrefix: "01",
    chapter: "Chương 01",
    title: "Động vật sống",
    titleEn: "Live animals",
    agencies: ["MARD"],
    requirements: [
      "Giấy phép nhập khẩu động vật",
      "Giấy chứng nhận kiểm dịch động vật",
      "Giấy chứng nhận nguồn gốc"
    ],
    notes: "Cần kiểm dịch tại cửa khẩu nhập"
  },
  {
    hsPrefix: "02",
    chapter: "Chương 02",
    title: "Thịt và phụ phẩm động vật ăn được",
    titleEn: "Meat and edible meat offal",
    agencies: ["MARD", "MOH"],
    requirements: [
      "Kiểm dịch động vật",
      "Giấy chứng nhận an toàn thực phẩm",
      "Giấy phép nhập khẩu (nếu có)"
    ],
    notes: "Thịt đông lạnh cần bảo quản đúng nhiệt độ"
  },
  {
    hsPrefix: "03",
    chapter: "Chương 03",
    title: "Cá và động vật giáp xác",
    titleEn: "Fish and crustaceans",
    agencies: ["MARD"],
    requirements: [
      "Kiểm dịch thủy sản",
      "Giấy chứng nhận nguồn gốc thủy sản"
    ],
    notes: "Áp dụng quy định IUU cho thủy sản khai thác"
  },
  {
    hsPrefix: "04",
    chapter: "Chương 04",
    title: "Sản phẩm sữa, trứng, mật ong",
    titleEn: "Dairy, eggs, honey",
    agencies: ["MARD", "MOH"],
    requirements: [
      "Kiểm dịch sản phẩm động vật",
      "Giấy chứng nhận an toàn thực phẩm",
      "Công bố hợp quy"
    ],
    notes: "Sản phẩm sữa cần đăng ký công bố"
  },
  {
    hsPrefix: "06",
    chapter: "Chương 06",
    title: "Cây sống và sản phẩm hoa",
    titleEn: "Live trees and plants",
    agencies: ["MARD"],
    requirements: [
      "Giấy phép nhập khẩu thực vật",
      "Kiểm dịch thực vật",
      "Giấy chứng nhận nguồn gốc"
    ],
    notes: "Cần kiểm tra sâu bệnh tại cửa khẩu"
  },
  {
    hsPrefix: "07",
    chapter: "Chương 07",
    title: "Rau và củ quả",
    titleEn: "Vegetables",
    agencies: ["MARD"],
    requirements: [
      "Kiểm dịch thực vật",
      "Kiểm tra dư lượng thuốc BVTV"
    ],
    notes: "Có thể yêu cầu xử lý khử trùng"
  },
  {
    hsPrefix: "08",
    chapter: "Chương 08",
    title: "Quả và hạt ăn được",
    titleEn: "Edible fruit and nuts",
    agencies: ["MARD"],
    requirements: [
      "Kiểm dịch thực vật",
      "Kiểm tra dư lượng thuốc BVTV"
    ],
    notes: "Một số loại quả cần giấy phép"
  },
  {
    hsPrefix: "10",
    chapter: "Chương 10",
    title: "Ngũ cốc",
    titleEn: "Cereals",
    agencies: ["MARD"],
    requirements: [
      "Kiểm dịch thực vật",
      "Kiểm tra chất lượng"
    ],
    notes: "Kiểm tra GMO với một số loại"
  },
  {
    hsPrefix: "22",
    chapter: "Chương 22",
    title: "Đồ uống, rượu, giấm",
    titleEn: "Beverages, spirits, vinegar",
    agencies: ["MOH", "MOIT"],
    requirements: [
      "Công bố hợp quy",
      "Đăng ký an toàn thực phẩm",
      "Giấy phép nhập khẩu rượu (nếu có)"
    ],
    notes: "Rượu cần giấy phép nhập khẩu"
  },
  {
    hsPrefix: "27",
    chapter: "Chương 27",
    title: "Nhiên liệu khoáng, dầu khoáng",
    titleEn: "Mineral fuels, oils",
    agencies: ["MOIT", "MONRE"],
    requirements: [
      "Giấy phép nhập khẩu xăng dầu",
      "Đăng ký kinh doanh xăng dầu",
      "Kiểm tra chất lượng"
    ],
    notes: "Cần giấy phép kinh doanh xăng dầu"
  },
  {
    hsPrefix: "28",
    chapter: "Chương 28",
    title: "Hóa chất vô cơ",
    titleEn: "Inorganic chemicals",
    agencies: ["MOIT", "MOPS"],
    requirements: [
      "Giấy phép nhập khẩu hóa chất",
      "Phiếu an toàn hóa chất (MSDS)"
    ],
    notes: "Hóa chất độc hại cần giấy phép đặc biệt"
  },
  {
    hsPrefix: "29",
    chapter: "Chương 29",
    title: "Hóa chất hữu cơ",
    titleEn: "Organic chemicals",
    agencies: ["MOIT", "MOPS"],
    requirements: [
      "Giấy phép nhập khẩu hóa chất",
      "Phiếu an toàn hóa chất (MSDS)"
    ],
    notes: "Tiền chất cần giấy phép công an"
  },
  {
    hsPrefix: "30",
    chapter: "Chương 30",
    title: "Dược phẩm",
    titleEn: "Pharmaceutical products",
    agencies: ["MOH"],
    requirements: [
      "Giấy phép nhập khẩu thuốc",
      "Số đăng ký lưu hành",
      "Giấy chứng nhận GMP"
    ],
    notes: "Thuốc cần số đăng ký lưu hành"
  },
  {
    hsPrefix: "33",
    chapter: "Chương 33",
    title: "Tinh dầu và mỹ phẩm",
    titleEn: "Essential oils and cosmetics",
    agencies: ["MOH"],
    requirements: [
      "Công bố mỹ phẩm",
      "Phiếu công bố sản phẩm"
    ],
    notes: "Mỹ phẩm cần công bố trước khi lưu thông"
  },
  {
    hsPrefix: "38",
    chapter: "Chương 38",
    title: "Các sản phẩm hóa chất",
    titleEn: "Miscellaneous chemical products",
    agencies: ["MOIT", "MARD"],
    requirements: [
      "Giấy phép hóa chất (nếu có)",
      "Kiểm tra chất lượng"
    ],
    notes: "Thuốc BVTV cần giấy phép MARD"
  },
  {
    hsPrefix: "39",
    chapter: "Chương 39",
    title: "Plastic và sản phẩm plastic",
    titleEn: "Plastics",
    agencies: ["MONRE"],
    requirements: [
      "Giấy phép nhập khẩu phế liệu (nếu là phế liệu)"
    ],
    notes: "Phế liệu nhựa cần giấy phép môi trường"
  },
  {
    hsPrefix: "40",
    chapter: "Chương 40",
    title: "Cao su và sản phẩm cao su",
    titleEn: "Rubber",
    agencies: ["MONRE"],
    requirements: [
      "Giấy phép nhập khẩu phế liệu (nếu là phế liệu)"
    ],
    notes: "Lốp xe cũ cần kiểm tra"
  },
  {
    hsPrefix: "72",
    chapter: "Chương 72",
    title: "Sắt và thép",
    titleEn: "Iron and steel",
    agencies: ["MOIT", "MONRE"],
    requirements: [
      "Kiểm tra chất lượng thép",
      "Giấy phép phế liệu (nếu là phế liệu)"
    ],
    notes: "Thép xây dựng cần kiểm tra chất lượng"
  },
  {
    hsPrefix: "84",
    chapter: "Chương 84",
    title: "Máy móc, thiết bị cơ khí",
    titleEn: "Machinery",
    agencies: ["MOIT", "MOST"],
    requirements: [
      "Kiểm tra chất lượng (một số mặt hàng)",
      "Giấy chứng nhận hợp quy"
    ],
    notes: "Máy móc cũ cần kiểm tra"
  },
  {
    hsPrefix: "85",
    chapter: "Chương 85",
    title: "Thiết bị điện, điện tử",
    titleEn: "Electrical equipment",
    agencies: ["MOIT", "MOST"],
    requirements: [
      "Kiểm tra chất lượng điện tử",
      "Giấy chứng nhận hợp quy",
      "Đăng ký tần số (nếu có)"
    ],
    notes: "Thiết bị phát sóng cần đăng ký"
  },
  {
    hsPrefix: "87",
    chapter: "Chương 87",
    title: "Xe có động cơ và phụ tùng",
    titleEn: "Vehicles",
    agencies: ["MOIT", "MOT"],
    requirements: [
      "Giấy chứng nhận chất lượng",
      "Đăng ký kiểm định",
      "Giấy phép nhập khẩu (nếu là xe mới)"
    ],
    notes: "Ô tô cần đăng ký và kiểm định"
  },
  {
    hsPrefix: "90",
    chapter: "Chương 90",
    title: "Dụng cụ quang học, y tế",
    titleEn: "Optical, medical instruments",
    agencies: ["MOH", "MOST"],
    requirements: [
      "Giấy phép nhập khẩu thiết bị y tế",
      "Số đăng ký lưu hành (thiết bị y tế)"
    ],
    notes: "Thiết bị y tế cần số đăng ký"
  },
  {
    hsPrefix: "93",
    chapter: "Chương 93",
    title: "Vũ khí và đạn dược",
    titleEn: "Arms and ammunition",
    agencies: ["MOPS"],
    requirements: [
      "Giấy phép đặc biệt",
      "Chứng nhận người sử dụng cuối"
    ],
    notes: "Chỉ được nhập khẩu theo giấy phép đặc biệt"
  },
  {
    hsPrefix: "95",
    chapter: "Chương 95",
    title: "Đồ chơi, dụng cụ thể thao",
    titleEn: "Toys, games, sports",
    agencies: ["MOST", "MOIT"],
    requirements: [
      "Kiểm tra chất lượng đồ chơi",
      "Giấy chứng nhận hợp quy"
    ],
    notes: "Đồ chơi trẻ em cần kiểm tra an toàn"
  },
];

export default function InspectionLookupPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState(INSPECTION_DATA);
  const [selectedItem, setSelectedItem] = useState<typeof INSPECTION_DATA[0] | null>(null);

  useEffect(() => {
    let results = INSPECTION_DATA;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (item) =>
          item.hsPrefix.includes(term) ||
          item.title.toLowerCase().includes(term) ||
          item.titleEn.toLowerCase().includes(term) ||
          item.chapter.toLowerCase().includes(term)
      );
    }

    if (selectedAgency) {
      results = results.filter((item) => item.agencies.includes(selectedAgency));
    }

    setFilteredData(results);
  }, [searchTerm, selectedAgency]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tools" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Kiểm tra chuyên ngành</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập mã HS, tên hàng hóa hoặc số chương..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Agency Filters */}
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-2">Lọc theo cơ quan kiểm tra:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedAgency(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedAgency === null
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>
              {Object.entries(INSPECTION_AGENCIES).map(([key, agency]) => {
                const Icon = agency.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedAgency(selectedAgency === key ? null : key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedAgency === key
                        ? `${agency.color} text-white`
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {agency.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Results List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">
                  Danh sách chương hàng ({filteredData.length} kết quả)
                </h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredData.map((item) => (
                  <button
                    key={item.hsPrefix}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedItem?.hsPrefix === item.hsPrefix ? "bg-red-50 border-l-4 border-red-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                            {item.hsPrefix}xx
                          </span>
                          <span className="text-xs text-slate-400">{item.chapter}</span>
                        </div>
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="text-sm text-slate-500">{item.titleEn}</div>
                      </div>
                      <div className="flex gap-1">
                        {item.agencies.map((agencyKey) => {
                          const agency = INSPECTION_AGENCIES[agencyKey as keyof typeof INSPECTION_AGENCIES];
                          if (!agency) return null;
                          const Icon = agency.icon;
                          return (
                            <div
                              key={agencyKey}
                              className={`w-6 h-6 ${agency.color} rounded flex items-center justify-center`}
                              title={agency.name}
                            >
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedItem ? (
              <>
                {/* Selected Item Info */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-lg bg-slate-900 text-white px-3 py-1 rounded">
                      {selectedItem.hsPrefix}xx
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{selectedItem.title}</h3>
                  <p className="text-sm text-slate-500">{selectedItem.titleEn}</p>
                </div>

                {/* Agencies */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Cơ quan kiểm tra</h4>
                  <div className="space-y-2">
                    {selectedItem.agencies.map((agencyKey) => {
                      const agency = INSPECTION_AGENCIES[agencyKey as keyof typeof INSPECTION_AGENCIES];
                      if (!agency) return null;
                      const Icon = agency.icon;
                      return (
                        <div
                          key={agencyKey}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <div className={`w-10 h-10 ${agency.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{agency.name}</div>
                            <div className="text-xs text-slate-500">{agency.nameEn}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Yêu cầu hồ sơ</h4>
                  <ul className="space-y-2">
                    {selectedItem.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <FileCheck className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Notes */}
                {selectedItem.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                      <div>
                        <div className="font-medium text-yellow-800 mb-1">Lưu ý</div>
                        <p className="text-sm text-yellow-700">{selectedItem.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Chọn một chương hàng để xem chi tiết kiểm tra chuyên ngành</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900 mb-2">Giới thiệu</div>
              <p className="text-xs leading-relaxed">
                Đây là danh sách các mặt hàng cần kiểm tra chuyên ngành khi nhập khẩu vào Việt Nam.
                Thông tin chỉ mang tính chất tham khảo, vui lòng liên hệ cơ quan hải quan để biết
                chính xác yêu cầu cho từng mặt hàng cụ thể.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

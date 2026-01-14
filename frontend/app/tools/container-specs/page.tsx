"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Container, Box, Ruler, Weight, Info } from "lucide-react";

// Complete container specifications
const CONTAINER_DATA = [
  {
    type: "20DC",
    name: "20' Dry Container",
    nameVi: "Container khô 20 feet",
    category: "dry",
    external: { length: 6.058, width: 2.438, height: 2.591 },
    internal: { length: 5.898, width: 2.352, height: 2.393 },
    door: { width: 2.343, height: 2.280 },
    capacity: 33.2,
    tare: 2300,
    maxPayload: 28180,
    maxGross: 30480,
    description: "Container tiêu chuẩn cho hàng khô thông thường",
  },
  {
    type: "40DC",
    name: "40' Dry Container",
    nameVi: "Container khô 40 feet",
    category: "dry",
    external: { length: 12.192, width: 2.438, height: 2.591 },
    internal: { length: 12.032, width: 2.352, height: 2.393 },
    door: { width: 2.343, height: 2.280 },
    capacity: 67.7,
    tare: 3800,
    maxPayload: 26680,
    maxGross: 30480,
    description: "Container tiêu chuẩn 40 feet cho hàng khô",
  },
  {
    type: "40HC",
    name: "40' High Cube",
    nameVi: "Container cao 40 feet",
    category: "dry",
    external: { length: 12.192, width: 2.438, height: 2.896 },
    internal: { length: 12.032, width: 2.352, height: 2.698 },
    door: { width: 2.343, height: 2.585 },
    capacity: 76.3,
    tare: 3900,
    maxPayload: 26580,
    maxGross: 30480,
    description: "Container cao hơn tiêu chuẩn, thêm 1 feet chiều cao",
  },
  {
    type: "45HC",
    name: "45' High Cube",
    nameVi: "Container cao 45 feet",
    category: "dry",
    external: { length: 13.716, width: 2.438, height: 2.896 },
    internal: { length: 13.556, width: 2.352, height: 2.698 },
    door: { width: 2.343, height: 2.585 },
    capacity: 86.0,
    tare: 4800,
    maxPayload: 27700,
    maxGross: 32500,
    description: "Container dài và cao nhất, dùng cho hàng nhẹ, cồng kềnh",
  },
  {
    type: "20RF",
    name: "20' Reefer",
    nameVi: "Container lạnh 20 feet",
    category: "reefer",
    external: { length: 6.058, width: 2.438, height: 2.591 },
    internal: { length: 5.444, width: 2.294, height: 2.270 },
    door: { width: 2.290, height: 2.260 },
    capacity: 28.3,
    tare: 3080,
    maxPayload: 27400,
    maxGross: 30480,
    tempRange: "-30°C đến +30°C",
    description: "Container lạnh cho thực phẩm, dược phẩm cần bảo quản lạnh",
  },
  {
    type: "40RF",
    name: "40' Reefer High Cube",
    nameVi: "Container lạnh 40 feet cao",
    category: "reefer",
    external: { length: 12.192, width: 2.438, height: 2.896 },
    internal: { length: 11.557, width: 2.294, height: 2.554 },
    door: { width: 2.290, height: 2.544 },
    capacity: 67.8,
    tare: 4800,
    maxPayload: 29180,
    maxGross: 34000,
    tempRange: "-30°C đến +30°C",
    description: "Container lạnh cao, dùng cho hàng đông lạnh số lượng lớn",
  },
  {
    type: "20OT",
    name: "20' Open Top",
    nameVi: "Container mở nóc 20 feet",
    category: "special",
    external: { length: 6.058, width: 2.438, height: 2.591 },
    internal: { length: 5.898, width: 2.352, height: 2.350 },
    door: { width: 2.343, height: 2.280 },
    capacity: 32.6,
    tare: 2400,
    maxPayload: 28080,
    maxGross: 30480,
    description: "Container mở nóc để xếp hàng từ trên xuống bằng cẩu",
  },
  {
    type: "40OT",
    name: "40' Open Top",
    nameVi: "Container mở nóc 40 feet",
    category: "special",
    external: { length: 12.192, width: 2.438, height: 2.591 },
    internal: { length: 12.032, width: 2.352, height: 2.350 },
    door: { width: 2.343, height: 2.280 },
    capacity: 66.5,
    tare: 4000,
    maxPayload: 26480,
    maxGross: 30480,
    description: "Container mở nóc 40 feet cho hàng quá khổ",
  },
  {
    type: "20FR",
    name: "20' Flat Rack",
    nameVi: "Container sàn phẳng 20 feet",
    category: "special",
    external: { length: 6.058, width: 2.438, height: 2.591 },
    internal: { length: 5.638, width: 2.228, height: 2.315 },
    door: { width: 0, height: 0 },
    capacity: 29.0,
    tare: 2740,
    maxPayload: 27740,
    maxGross: 30480,
    description: "Container sàn phẳng cho hàng siêu trường, siêu trọng",
  },
  {
    type: "40FR",
    name: "40' Flat Rack",
    nameVi: "Container sàn phẳng 40 feet",
    category: "special",
    external: { length: 12.192, width: 2.438, height: 2.103 },
    internal: { length: 12.080, width: 2.126, height: 1.955 },
    door: { width: 0, height: 0 },
    capacity: 50.3,
    tare: 5000,
    maxPayload: 40000,
    maxGross: 45000,
    description: "Flat rack 40 feet cho máy móc, thiết bị lớn",
  },
  {
    type: "20TK",
    name: "20' Tank Container",
    nameVi: "Container bồn 20 feet",
    category: "tank",
    external: { length: 6.058, width: 2.438, height: 2.591 },
    internal: { length: 0, width: 0, height: 0 },
    door: { width: 0, height: 0 },
    capacity: 21.0,
    tare: 3070,
    maxPayload: 27410,
    maxGross: 30480,
    description: "Container bồn chứa chất lỏng, hóa chất",
  },
];

const CATEGORIES = [
  { id: "all", name: "Tất cả", nameEn: "All" },
  { id: "dry", name: "Container khô", nameEn: "Dry Container" },
  { id: "reefer", name: "Container lạnh", nameEn: "Reefer" },
  { id: "special", name: "Container đặc biệt", nameEn: "Special" },
  { id: "tank", name: "Container bồn", nameEn: "Tank" },
];

export default function ContainerSpecsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedContainer, setSelectedContainer] = useState<typeof CONTAINER_DATA[0] | null>(null);

  const filteredContainers =
    selectedCategory === "all"
      ? CONTAINER_DATA
      : CONTAINER_DATA.filter((c) => c.category === selectedCategory);

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
                <Container className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Thông số kỹ thuật Container</span>
            </div>
          </div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Container List */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-4">
              {filteredContainers.map((container) => (
                <button
                  key={container.type}
                  onClick={() => setSelectedContainer(container)}
                  className={`text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${
                    selectedContainer?.type === container.type
                      ? "border-red-500 ring-2 ring-red-500/20"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{container.type}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        container.category === "reefer"
                          ? "bg-blue-100 text-blue-700"
                          : container.category === "special"
                          ? "bg-orange-100 text-orange-700"
                          : container.category === "tank"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {CATEGORIES.find((c) => c.id === container.category)?.name}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{container.name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{container.nameVi}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-xs text-slate-500">CBM</div>
                      <div className="font-semibold text-slate-900">{container.capacity}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-xs text-slate-500">Payload</div>
                      <div className="font-semibold text-slate-900">{(container.maxPayload / 1000).toFixed(1)}T</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-xs text-slate-500">Tare</div>
                      <div className="font-semibold text-slate-900">{(container.tare / 1000).toFixed(1)}T</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            {selectedContainer ? (
              <div className="space-y-4 sticky top-4">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
                  <div className="text-3xl font-bold mb-1">{selectedContainer.type}</div>
                  <div className="text-slate-300">{selectedContainer.name}</div>
                  <div className="text-sm text-slate-400">{selectedContainer.nameVi}</div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-600">{selectedContainer.description}</p>
                  {selectedContainer.tempRange && (
                    <div className="mt-2 flex items-center gap-2 text-blue-600">
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                        Nhiệt độ: {selectedContainer.tempRange}
                      </span>
                    </div>
                  )}
                </div>

                {/* External Dimensions */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Box className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-slate-900">Kích thước ngoài (m)</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Dài</div>
                      <div className="font-bold text-slate-900">{selectedContainer.external.length}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Rộng</div>
                      <div className="font-bold text-slate-900">{selectedContainer.external.width}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Cao</div>
                      <div className="font-bold text-slate-900">{selectedContainer.external.height}</div>
                    </div>
                  </div>
                </div>

                {/* Internal Dimensions */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Ruler className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-slate-900">Kích thước trong (m)</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">Dài</div>
                      <div className="font-bold text-blue-900">{selectedContainer.internal.length}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">Rộng</div>
                      <div className="font-bold text-blue-900">{selectedContainer.internal.width}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">Cao</div>
                      <div className="font-bold text-blue-900">{selectedContainer.internal.height}</div>
                    </div>
                  </div>
                </div>

                {/* Door Opening */}
                {selectedContainer.door.width > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Kích thước cửa (m)</h3>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-green-600 mb-1">Rộng cửa</div>
                        <div className="font-bold text-green-900">{selectedContainer.door.width}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-green-600 mb-1">Cao cửa</div>
                        <div className="font-bold text-green-900">{selectedContainer.door.height}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weight */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Weight className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-slate-900">Trọng lượng (kg)</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Trọng lượng vỏ (Tare)</span>
                      <span className="font-semibold">{selectedContainer.tare.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tải trọng tối đa (Payload)</span>
                      <span className="font-semibold text-green-600">
                        {selectedContainer.maxPayload.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Tổng trọng tối đa (Gross)</span>
                      <span className="font-bold text-red-600">
                        {selectedContainer.maxGross.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white">
                  <div className="text-sm opacity-80 mb-1">Dung tích</div>
                  <div className="text-3xl font-bold">{selectedContainer.capacity} m³</div>
                  <div className="text-sm opacity-80">CBM (Cubic Meter)</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center sticky top-4">
                <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Chọn một loại container để xem thông số chi tiết</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

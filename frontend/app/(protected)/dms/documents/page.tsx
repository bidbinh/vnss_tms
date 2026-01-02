"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Upload, File, FileText, FileSpreadsheet, Image, Eye, Download, Share2, Trash2, MoreVertical, Filter } from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  folder: string;
  version: number;
  created_by: string;
  created_at: string;
  modified_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    setTimeout(() => {
      setDocuments([
        { id: "1", name: "Báo cáo doanh thu Q4.xlsx", type: "spreadsheet", size: "2.5 MB", folder: "Báo cáo tài chính", version: 3, created_by: "Nguyễn Văn A", created_at: "2024-01-15", modified_at: "2024-02-18" },
        { id: "2", name: "Hợp đồng ABC Corp.pdf", type: "pdf", size: "1.2 MB", folder: "Hợp đồng", version: 1, created_by: "Trần Thị B", created_at: "2024-02-10", modified_at: "2024-02-10" },
        { id: "3", name: "Quy trình vận chuyển.docx", type: "document", size: "850 KB", folder: "Dự án", version: 5, created_by: "Lê Văn C", created_at: "2024-01-20", modified_at: "2024-02-15" },
        { id: "4", name: "Logo công ty.png", type: "image", size: "450 KB", folder: "Marketing", version: 2, created_by: "Phạm Thị D", created_at: "2024-02-01", modified_at: "2024-02-05" },
        { id: "5", name: "Danh sách nhân viên.xlsx", type: "spreadsheet", size: "1.8 MB", folder: "Nhân sự", version: 12, created_by: "HR Admin", created_at: "2024-01-01", modified_at: "2024-02-18" },
        { id: "6", name: "Kế hoạch Marketing 2024.pptx", type: "presentation", size: "5.2 MB", folder: "Marketing", version: 4, created_by: "Marketing Team", created_at: "2024-01-25", modified_at: "2024-02-12" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "spreadsheet": return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case "pdf": return <FileText className="w-5 h-5 text-red-500" />;
      case "image": return <Image className="w-5 h-5 text-purple-500" />;
      case "presentation": return <File className="w-5 h-5 text-orange-500" />;
      default: return <File className="w-5 h-5 text-blue-500" />;
    }
  };

  const filteredDocuments = documents.filter(
    (d) => d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500">Quản lý tài liệu</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Upload className="w-4 h-4" />
          Upload tài liệu
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : ""}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded ${viewMode === "list" ? "bg-blue-100 text-blue-600" : ""}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Documents List */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên file</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thư mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kích thước</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cập nhật</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.type)}
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.folder}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.size}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded">v{doc.version}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.modified_at}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded" title="Xem">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Tải về">
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Chia sẻ">
                        <Share2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Xóa">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  {getFileIcon(doc.type)}
                </div>
                <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <h3 className="font-medium text-sm truncate">{doc.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{doc.size} • v{doc.version}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

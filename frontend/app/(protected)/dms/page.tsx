"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Share2,
  Archive,
  Clock,
  Search,
  Upload,
  MoreVertical,
  Eye,
  Download,
  Trash2,
} from "lucide-react";

interface DMSStats {
  total_documents: number;
  total_folders: number;
  shared_with_me: number;
  archived: number;
  storage_used: string;
}

interface RecentDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  modified_at: string;
  modified_by: string;
}

export default function DMSDashboard() {
  const [stats, setStats] = useState<DMSStats>({
    total_documents: 0,
    total_folders: 0,
    shared_with_me: 0,
    archived: 0,
    storage_used: "0 GB",
  });
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStats({
        total_documents: 1250,
        total_folders: 85,
        shared_with_me: 42,
        archived: 156,
        storage_used: "12.5 GB",
      });
      setRecentDocs([
        { id: "1", name: "Báo cáo doanh thu Q4.xlsx", type: "spreadsheet", size: "2.5 MB", modified_at: "10 phút trước", modified_by: "Nguyễn Văn A" },
        { id: "2", name: "Hợp đồng KH001.pdf", type: "pdf", size: "1.2 MB", modified_at: "30 phút trước", modified_by: "Trần Thị B" },
        { id: "3", name: "Quy trình vận chuyển.docx", type: "document", size: "850 KB", modified_at: "1 giờ trước", modified_by: "Lê Văn C" },
        { id: "4", name: "Logo công ty.png", type: "image", size: "450 KB", modified_at: "2 giờ trước", modified_by: "Phạm Thị D" },
        { id: "5", name: "Danh sách tài xế.xlsx", type: "spreadsheet", size: "1.8 MB", modified_at: "3 giờ trước", modified_by: "Hoàng Văn E" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "spreadsheet":
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "image":
        return <Image className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-blue-500" />;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-500">Quản lý tài liệu</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Upload className="w-4 h-4" />
          Upload tài liệu
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm tài liệu..."
          className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <File className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tài liệu</p>
              <p className="text-xl font-bold">{stats.total_documents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FolderOpen className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Thư mục</p>
              <p className="text-xl font-bold">{stats.total_folders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Share2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Được chia sẻ</p>
              <p className="text-xl font-bold">{stats.shared_with_me}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Lưu trữ</p>
              <p className="text-xl font-bold">{stats.archived}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dung lượng</p>
              <p className="text-xl font-bold">{stats.storage_used}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/dms/folders"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <FolderOpen className="w-6 h-6 text-yellow-500" />
          <span className="font-medium">Thư mục</span>
        </a>
        <a
          href="/dms/documents"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <File className="w-6 h-6 text-blue-500" />
          <span className="font-medium">Tài liệu</span>
        </a>
        <a
          href="/dms/shared"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <Share2 className="w-6 h-6 text-green-500" />
          <span className="font-medium">Được chia sẻ</span>
        </a>
        <a
          href="/dms/templates"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <FileText className="w-6 h-6 text-purple-500" />
          <span className="font-medium">Mẫu tài liệu</span>
        </a>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Tài liệu gần đây</h2>
        </div>
        <div className="divide-y">
          {recentDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getFileIcon(doc.type)}
                </div>
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.size} • {doc.modified_by} • {doc.modified_at}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Xem">
                  <Eye className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Tải về">
                  <Download className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Chia sẻ">
                  <Share2 className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

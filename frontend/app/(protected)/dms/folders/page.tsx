"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FolderOpen, Folder, MoreVertical, Edit, Trash2, Share2, Lock, Users } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  documents_count: number;
  subfolders_count: number;
  is_shared: boolean;
  is_private: boolean;
  created_by: string;
  created_at: string;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>(["Root"]);

  useEffect(() => {
    setTimeout(() => {
      setFolders([
        { id: "1", name: "Hợp đồng", parent_id: null, documents_count: 45, subfolders_count: 3, is_shared: true, is_private: false, created_by: "Admin", created_at: "2024-01-10" },
        { id: "2", name: "Báo cáo tài chính", parent_id: null, documents_count: 120, subfolders_count: 12, is_shared: false, is_private: true, created_by: "Kế toán", created_at: "2024-01-15" },
        { id: "3", name: "Nhân sự", parent_id: null, documents_count: 89, subfolders_count: 5, is_shared: true, is_private: false, created_by: "HR", created_at: "2024-01-20" },
        { id: "4", name: "Marketing", parent_id: null, documents_count: 34, subfolders_count: 2, is_shared: true, is_private: false, created_by: "Marketing", created_at: "2024-02-01" },
        { id: "5", name: "Dự án", parent_id: null, documents_count: 156, subfolders_count: 8, is_shared: true, is_private: false, created_by: "PM", created_at: "2024-02-05" },
        { id: "6", name: "Templates", parent_id: null, documents_count: 28, subfolders_count: 4, is_shared: true, is_private: false, created_by: "Admin", created_at: "2024-02-10" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredFolders = folders.filter(
    (f) => f.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Folders</h1>
          <p className="text-gray-500">Quản lý thư mục tài liệu</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo thư mục mới
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {currentPath.map((path, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && <span className="text-gray-400">/</span>}
            <button className="hover:text-blue-600">{path}</button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thư mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFolders.map((folder) => (
          <div
            key={folder.id}
            className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  {folder.is_private ? (
                    <Lock className="w-6 h-6 text-yellow-600" />
                  ) : folder.is_shared ? (
                    <Users className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <Folder className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{folder.name}</h3>
                  <p className="text-xs text-gray-500">
                    {folder.documents_count} files, {folder.subfolders_count} folders
                  </p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-gray-500">
              <span>{folder.created_by}</span>
              <div className="flex items-center gap-2">
                {folder.is_shared && <Share2 className="w-3 h-3" />}
                {folder.is_private && <Lock className="w-3 h-3" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

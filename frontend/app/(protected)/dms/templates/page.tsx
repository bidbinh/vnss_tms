"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Search,
  Plus,
  Filter,
  Star,
  MoreVertical,
  Copy,
  Download,
} from "lucide-react";

type TemplateCategory = "HR" | "Finance" | "Operations" | "Legal" | "Sales";

interface TemplateItem {
  id: string;
  name: string;
  category: TemplateCategory;
  format: "docx" | "xlsx" | "pptx" | "pdf";
  updated_at: string;
  owner: string;
  usage_count: number;
  is_favorite: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "All">("All");

  useEffect(() => {
    setTimeout(() => {
      setTemplates([
        {
          id: "tpl-01",
          name: "Employee Onboarding Checklist",
          category: "HR",
          format: "docx",
          updated_at: "2024-02-18",
          owner: "HR Admin",
          usage_count: 128,
          is_favorite: true,
        },
        {
          id: "tpl-02",
          name: "Quarterly Budget Plan",
          category: "Finance",
          format: "xlsx",
          updated_at: "2024-02-12",
          owner: "Finance Team",
          usage_count: 74,
          is_favorite: false,
        },
        {
          id: "tpl-03",
          name: "Shipment Handover Form",
          category: "Operations",
          format: "pdf",
          updated_at: "2024-02-10",
          owner: "Ops Lead",
          usage_count: 209,
          is_favorite: true,
        },
        {
          id: "tpl-04",
          name: "Master Service Agreement",
          category: "Legal",
          format: "docx",
          updated_at: "2024-02-05",
          owner: "Legal",
          usage_count: 33,
          is_favorite: false,
        },
        {
          id: "tpl-05",
          name: "Sales Pitch Deck",
          category: "Sales",
          format: "pptx",
          updated_at: "2024-02-01",
          owner: "Sales",
          usage_count: 61,
          is_favorite: false,
        },
        {
          id: "tpl-06",
          name: "Expense Reimbursement Form",
          category: "Finance",
          format: "xlsx",
          updated_at: "2024-01-28",
          owner: "Accounting",
          usage_count: 185,
          is_favorite: true,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, categoryFilter, searchTerm]);

  const getFormatIcon = (format: TemplateItem["format"]) => {
    switch (format) {
      case "xlsx":
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-600" />;
      case "pptx":
        return <FileImage className="w-5 h-5 text-orange-600" />;
      case "docx":
        return <File className="w-5 h-5 text-blue-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
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
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500">Reusable document templates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | "All")}
            className="border rounded-lg px-3 py-2 bg-white"
          >
            <option value="All">All categories</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
            <option value="Legal">Legal</option>
            <option value="Sales">Sales</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTemplates.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getFormatIcon(item.format)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.category} • {item.format.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-gray-100" title="Favorite">
                  <Star className={`w-4 h-4 ${item.is_favorite ? "text-yellow-500" : "text-gray-400"}`} />
                </button>
                <button className="p-1 rounded hover:bg-gray-100" title="More">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <div>
                <p>Owner: {item.owner}</p>
                <p>Updated: {item.updated_at}</p>
              </div>
              <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg">
                {item.usage_count} uses
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                <Copy className="w-4 h-4" />
                Use Template
              </button>
              <button className="p-2 border rounded-lg hover:bg-gray-50" title="Download">
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

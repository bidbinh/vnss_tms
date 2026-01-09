'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Building2,
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface Exporter {
  id: string;
  seq_no: number | null;
  name: string;
  notes: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_line_3: string | null;
  address_line_4: string | null;
  country_code: string | null;
  tax_code: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface Importer {
  id: string;
  seq_no: number | null;
  name: string;
  postal_code: string | null;
  tax_code: string | null;
  address: string | null;
  phone: string | null;
  address_line_3: string | null;
  address_line_4: string | null;
  contact_name: string | null;
  email: string | null;
  fax: string | null;
  is_active: boolean;
  created_at: string;
}

interface Location {
  id: string;
  seq_no: number | null;
  code: string;
  name: string;
  location_type: string | null;
  address: string | null;
  province: string | null;
  country_code: string | null;
  customs_office_code: string | null;
  is_active: boolean;
  created_at: string;
}

type TabType = 'exporters' | 'importers' | 'locations';

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomsPartnersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('exporters');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Exporters
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [exportersTotal, setExportersTotal] = useState(0);
  const [exportersPage, setExportersPage] = useState(1);
  const [exportersSortBy, setExportersSortBy] = useState('seq_no');
  const [exportersSortOrder, setExportersSortOrder] = useState<'asc' | 'desc'>('asc');

  // Importers
  const [importers, setImporters] = useState<Importer[]>([]);
  const [importersTotal, setImportersTotal] = useState(0);
  const [importersPage, setImportersPage] = useState(1);
  const [importersSortBy, setImportersSortBy] = useState('seq_no');
  const [importersSortOrder, setImportersSortOrder] = useState<'asc' | 'desc'>('asc');

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsTotal, setLocationsTotal] = useState(0);
  const [locationsPage, setLocationsPage] = useState(1);
  const [locationsSortBy, setLocationsSortBy] = useState('seq_no');
  const [locationsSortOrder, setLocationsSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal
  const [editingItem, setEditingItem] = useState<Exporter | Importer | Location | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const pageSize = 50;

  // Column widths (resizable)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  };

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchExporters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: exportersPage.toString(),
        page_size: pageSize.toString(),
        sort_by: exportersSortBy,
        sort_order: exportersSortOrder,
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/fms/customs-partners/exporters?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch exporters');
      const data = await res.json();
      setExporters(data.items);
      setExportersTotal(data.total);
    } catch (e) {
      setError('Failed to load exporters');
    } finally {
      setIsLoading(false);
    }
  }, [exportersPage, exportersSortBy, exportersSortOrder, search]);

  const fetchImporters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: importersPage.toString(),
        page_size: pageSize.toString(),
        sort_by: importersSortBy,
        sort_order: importersSortOrder,
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/fms/customs-partners/importers?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch importers');
      const data = await res.json();
      setImporters(data.items);
      setImportersTotal(data.total);
    } catch (e) {
      setError('Failed to load importers');
    } finally {
      setIsLoading(false);
    }
  }, [importersPage, importersSortBy, importersSortOrder, search]);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: locationsPage.toString(),
        page_size: pageSize.toString(),
        sort_by: locationsSortBy,
        sort_order: locationsSortOrder,
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/fms/customs-partners/locations?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch locations');
      const data = await res.json();
      setLocations(data.items);
      setLocationsTotal(data.total);
    } catch (e) {
      setError('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [locationsPage, locationsSortBy, locationsSortOrder, search]);

  useEffect(() => {
    if (activeTab === 'exporters') fetchExporters();
    else if (activeTab === 'importers') fetchImporters();
    else if (activeTab === 'locations') fetchLocations();
  }, [activeTab, fetchExporters, fetchImporters, fetchLocations]);

  // ============================================================
  // SORTING
  // ============================================================

  const handleSort = (column: string) => {
    if (activeTab === 'exporters') {
      if (exportersSortBy === column) {
        setExportersSortOrder(exportersSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setExportersSortBy(column);
        setExportersSortOrder('asc');
      }
    } else if (activeTab === 'importers') {
      if (importersSortBy === column) {
        setImportersSortOrder(importersSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setImportersSortBy(column);
        setImportersSortOrder('asc');
      }
    } else if (activeTab === 'locations') {
      if (locationsSortBy === column) {
        setLocationsSortOrder(locationsSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLocationsSortBy(column);
        setLocationsSortOrder('asc');
      }
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    const sortBy = activeTab === 'exporters' ? exportersSortBy : activeTab === 'importers' ? importersSortBy : locationsSortBy;
    const sortOrder = activeTab === 'exporters' ? exportersSortOrder : activeTab === 'importers' ? importersSortOrder : locationsSortOrder;

    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  const handleAdd = () => {
    if (activeTab === 'exporters') {
      setEditingItem({
        id: '',
        seq_no: null,
        name: '',
        notes: null,
        address_line_1: null,
        address_line_2: null,
        address_line_3: null,
        address_line_4: null,
        country_code: null,
        tax_code: null,
        contact_name: null,
        phone: null,
        email: null,
        is_active: true,
        created_at: '',
      } as Exporter);
    } else if (activeTab === 'importers') {
      setEditingItem({
        id: '',
        seq_no: null,
        name: '',
        postal_code: null,
        tax_code: null,
        address: null,
        phone: null,
        address_line_3: null,
        address_line_4: null,
        contact_name: null,
        email: null,
        fax: null,
        is_active: true,
        created_at: '',
      } as Importer);
    } else {
      setEditingItem({
        id: '',
        seq_no: null,
        code: '',
        name: '',
        location_type: null,
        address: null,
        province: null,
        country_code: null,
        customs_office_code: null,
        is_active: true,
        created_at: '',
      } as Location);
    }
    setIsModalOpen(true);
  };

  const handleEdit = (item: Exporter | Importer | Location) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;

    try {
      const endpoint = activeTab === 'exporters' ? 'exporters' : activeTab === 'importers' ? 'importers' : 'locations';
      const res = await fetch(`/api/v1/fms/customs-partners/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
      setSuccess('Đã xóa thành công');
      if (activeTab === 'exporters') fetchExporters();
      else if (activeTab === 'importers') fetchImporters();
      else fetchLocations();
    } catch (e) {
      setError('Xóa thất bại');
    }
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setIsSaving(true);

    try {
      const endpoint = activeTab === 'exporters' ? 'exporters' : activeTab === 'importers' ? 'importers' : 'locations';
      const isNew = !editingItem.id;
      const url = isNew
        ? `/api/v1/fms/customs-partners/${endpoint}`
        : `/api/v1/fms/customs-partners/${endpoint}/${editingItem.id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingItem),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Save failed');
      }

      setSuccess(isNew ? 'Đã thêm mới thành công' : 'Đã cập nhật thành công');
      setIsModalOpen(false);
      setEditingItem(null);

      if (activeTab === 'exporters') fetchExporters();
      else if (activeTab === 'importers') fetchImporters();
      else fetchLocations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // IMPORT EXCEL
  // ============================================================

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/fms/customs-partners/import-excel', {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Import failed');
      }

      const result = await res.json();
      setSuccess(
        `Import thành công: ${result.results.exporters.created} exporters, ${result.results.importers.created} importers, ${result.results.locations.created} locations`
      );

      // Refresh data
      fetchExporters();
      fetchImporters();
      fetchLocations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import thất bại');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // COLUMN RESIZE
  // ============================================================

  const handleColumnResize = (columnKey: string, newWidth: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnKey]: Math.max(50, newWidth) }));
  };

  const ResizeHandle = ({ columnKey }: { columnKey: string }) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths[columnKey] || 150;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        handleColumnResize(columnKey, startWidth + diff);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
        onMouseDown={handleMouseDown}
      />
    );
  };

  // ============================================================
  // PAGINATION
  // ============================================================

  const currentPage = activeTab === 'exporters' ? exportersPage : activeTab === 'importers' ? importersPage : locationsPage;
  const currentTotal = activeTab === 'exporters' ? exportersTotal : activeTab === 'importers' ? importersTotal : locationsTotal;
  const totalPages = Math.ceil(currentTotal / pageSize);

  const handlePageChange = (page: number) => {
    if (activeTab === 'exporters') setExportersPage(page);
    else if (activeTab === 'importers') setImportersPage(page);
    else setLocationsPage(page);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Danh mục Đối tác Hải quan
          </h1>
          <p className="text-sm text-gray-500">Quản lý người xuất khẩu, nhập khẩu và địa điểm</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xls,.xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Excel
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2.5 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-green-700 flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b flex">
          <button
            onClick={() => setActiveTab('exporters')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'exporters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Người Xuất Khẩu ({exportersTotal})
          </button>
          <button
            onClick={() => setActiveTab('importers')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'importers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Người Nhập Khẩu ({importersTotal})
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'locations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Địa điểm ({locationsTotal})
          </button>
          <div className="flex-1" />
          <div className="px-4 py-2 flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-9 pr-3 py-1.5 text-sm border rounded w-64"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {activeTab === 'exporters' && (
                <ExportersTable
                  data={exporters}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSort={handleSort}
                  SortIcon={SortIcon}
                  columnWidths={columnWidths}
                  ResizeHandle={ResizeHandle}
                />
              )}
              {activeTab === 'importers' && (
                <ImportersTable
                  data={importers}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSort={handleSort}
                  SortIcon={SortIcon}
                  columnWidths={columnWidths}
                  ResizeHandle={ResizeHandle}
                />
              )}
              {activeTab === 'locations' && (
                <LocationsTable
                  data={locations}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSort={handleSort}
                  SortIcon={SortIcon}
                  columnWidths={columnWidths}
                  ResizeHandle={ResizeHandle}
                />
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
          <div className="text-gray-500">
            Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, currentTotal)} / {currentTotal}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {'<<'}
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {'<'}
            </button>
            <span className="px-3">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {'>'}
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {'>>'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingItem && (
        <EditModal
          activeTab={activeTab}
          item={editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          onChange={setEditingItem}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// ============================================================
// EXPORTERS TABLE
// ============================================================

function ExportersTable({
  data,
  onEdit,
  onDelete,
  onSort,
  SortIcon,
  columnWidths,
  ResizeHandle,
}: {
  data: Exporter[];
  onEdit: (item: Exporter) => void;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
  columnWidths: Record<string, number>;
  ResizeHandle: React.FC<{ columnKey: string }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_seq'] || 60 }}>
            <button onClick={() => onSort('seq_no')} className="flex items-center gap-1">
              TT <SortIcon column="seq_no" />
            </button>
            <ResizeHandle columnKey="exp_seq" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_name'] || 300 }}>
            <button onClick={() => onSort('name')} className="flex items-center gap-1">
              Tên người Xuất Khẩu <SortIcon column="name" />
            </button>
            <ResizeHandle columnKey="exp_name" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_notes'] || 300 }}>
            Ghi chú
            <ResizeHandle columnKey="exp_notes" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_addr1'] || 200 }}>
            Địa chỉ 1
            <ResizeHandle columnKey="exp_addr1" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_addr2'] || 150 }}>
            Địa chỉ 2
            <ResizeHandle columnKey="exp_addr2" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['exp_addr3'] || 150 }}>
            Địa chỉ 3
            <ResizeHandle columnKey="exp_addr3" />
          </th>
          <th className="px-3 py-2 text-center font-semibold border-b w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 border-b">{item.seq_no}</td>
            <td className="px-3 py-2 border-b font-medium">{item.name}</td>
            <td className="px-3 py-2 border-b text-gray-600 text-xs">{item.notes}</td>
            <td className="px-3 py-2 border-b text-xs">{item.address_line_1}</td>
            <td className="px-3 py-2 border-b text-xs">{item.address_line_2}</td>
            <td className="px-3 py-2 border-b text-xs">{item.address_line_3}</td>
            <td className="px-3 py-2 border-b">
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => onEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
              Không có dữ liệu
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ============================================================
// IMPORTERS TABLE
// ============================================================

function ImportersTable({
  data,
  onEdit,
  onDelete,
  onSort,
  SortIcon,
  columnWidths,
  ResizeHandle,
}: {
  data: Importer[];
  onEdit: (item: Importer) => void;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
  columnWidths: Record<string, number>;
  ResizeHandle: React.FC<{ columnKey: string }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_seq'] || 60 }}>
            <button onClick={() => onSort('seq_no')} className="flex items-center gap-1">
              TT <SortIcon column="seq_no" />
            </button>
            <ResizeHandle columnKey="imp_seq" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_name'] || 300 }}>
            <button onClick={() => onSort('name')} className="flex items-center gap-1">
              Người Nhập Khẩu <SortIcon column="name" />
            </button>
            <ResizeHandle columnKey="imp_name" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_postal'] || 100 }}>
            Mã Bưu Chính
            <ResizeHandle columnKey="imp_postal" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_tax'] || 120 }}>
            <button onClick={() => onSort('tax_code')} className="flex items-center gap-1">
              Mã số thuế <SortIcon column="tax_code" />
            </button>
            <ResizeHandle columnKey="imp_tax" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_addr'] || 300 }}>
            Địa chỉ
            <ResizeHandle columnKey="imp_addr" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['imp_phone'] || 120 }}>
            Số điện thoại
            <ResizeHandle columnKey="imp_phone" />
          </th>
          <th className="px-3 py-2 text-center font-semibold border-b w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 border-b">{item.seq_no}</td>
            <td className="px-3 py-2 border-b font-medium">{item.name}</td>
            <td className="px-3 py-2 border-b">{item.postal_code}</td>
            <td className="px-3 py-2 border-b font-mono">{item.tax_code}</td>
            <td className="px-3 py-2 border-b text-xs">{item.address}</td>
            <td className="px-3 py-2 border-b">{item.phone}</td>
            <td className="px-3 py-2 border-b">
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => onEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
              Không có dữ liệu
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ============================================================
// LOCATIONS TABLE
// ============================================================

function LocationsTable({
  data,
  onEdit,
  onDelete,
  onSort,
  SortIcon,
  columnWidths,
  ResizeHandle,
}: {
  data: Location[];
  onEdit: (item: Location) => void;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
  columnWidths: Record<string, number>;
  ResizeHandle: React.FC<{ columnKey: string }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['loc_seq'] || 60 }}>
            <button onClick={() => onSort('seq_no')} className="flex items-center gap-1">
              TT <SortIcon column="seq_no" />
            </button>
            <ResizeHandle columnKey="loc_seq" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['loc_code'] || 120 }}>
            <button onClick={() => onSort('code')} className="flex items-center gap-1">
              Mã địa điểm <SortIcon column="code" />
            </button>
            <ResizeHandle columnKey="loc_code" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['loc_name'] || 300 }}>
            <button onClick={() => onSort('name')} className="flex items-center gap-1">
              Tên địa điểm <SortIcon column="name" />
            </button>
            <ResizeHandle columnKey="loc_name" />
          </th>
          <th className="px-3 py-2 text-left font-semibold border-b relative" style={{ width: columnWidths['loc_type'] || 150 }}>
            <button onClick={() => onSort('location_type')} className="flex items-center gap-1">
              Loại địa điểm <SortIcon column="location_type" />
            </button>
            <ResizeHandle columnKey="loc_type" />
          </th>
          <th className="px-3 py-2 text-center font-semibold border-b w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 border-b">{item.seq_no}</td>
            <td className="px-3 py-2 border-b font-mono font-semibold text-blue-600">{item.code}</td>
            <td className="px-3 py-2 border-b font-medium">{item.name}</td>
            <td className="px-3 py-2 border-b">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{item.location_type}</span>
            </td>
            <td className="px-3 py-2 border-b">
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => onEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
              Không có dữ liệu
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================

function EditModal({
  activeTab,
  item,
  onClose,
  onSave,
  onChange,
  isSaving,
}: {
  activeTab: TabType;
  item: Exporter | Importer | Location;
  onClose: () => void;
  onSave: () => void;
  onChange: (item: Exporter | Importer | Location) => void;
  isSaving: boolean;
}) {
  const isNew = !item.id;
  const title = isNew
    ? activeTab === 'exporters'
      ? 'Thêm Người Xuất Khẩu'
      : activeTab === 'importers'
      ? 'Thêm Người Nhập Khẩu'
      : 'Thêm Địa điểm'
    : activeTab === 'exporters'
    ? 'Sửa Người Xuất Khẩu'
    : activeTab === 'importers'
    ? 'Sửa Người Nhập Khẩu'
    : 'Sửa Địa điểm';

  const handleChange = (field: string, value: string | number | null) => {
    onChange({ ...item, [field]: value } as Exporter | Importer | Location);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'exporters' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">STT</label>
                  <input
                    type="number"
                    value={(item as Exporter).seq_no || ''}
                    onChange={(e) => handleChange('seq_no', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã nước</label>
                  <input
                    type="text"
                    value={(item as Exporter).country_code || ''}
                    onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded"
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên người Xuất Khẩu *</label>
                <input
                  type="text"
                  value={(item as Exporter).name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={(item as Exporter).notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ 1</label>
                  <input
                    type="text"
                    value={(item as Exporter).address_line_1 || ''}
                    onChange={(e) => handleChange('address_line_1', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ 2</label>
                  <input
                    type="text"
                    value={(item as Exporter).address_line_2 || ''}
                    onChange={(e) => handleChange('address_line_2', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ 3</label>
                  <input
                    type="text"
                    value={(item as Exporter).address_line_3 || ''}
                    onChange={(e) => handleChange('address_line_3', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ 4</label>
                  <input
                    type="text"
                    value={(item as Exporter).address_line_4 || ''}
                    onChange={(e) => handleChange('address_line_4', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'importers' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">STT</label>
                  <input
                    type="number"
                    value={(item as Importer).seq_no || ''}
                    onChange={(e) => handleChange('seq_no', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã Bưu Chính</label>
                  <input
                    type="text"
                    value={(item as Importer).postal_code || ''}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người Nhập Khẩu *</label>
                <input
                  type="text"
                  value={(item as Importer).name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={(item as Importer).tax_code || ''}
                    onChange={(e) => handleChange('tax_code', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={(item as Importer).phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={(item as Importer).address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
            </>
          )}

          {activeTab === 'locations' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">STT</label>
                  <input
                    type="number"
                    value={(item as Location).seq_no || ''}
                    onChange={(e) => handleChange('seq_no', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã địa điểm *</label>
                  <input
                    type="text"
                    value={(item as Location).code || ''}
                    onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên địa điểm *</label>
                <input
                  type="text"
                  value={(item as Location).name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại địa điểm</label>
                  <select
                    value={(item as Location).location_type || ''}
                    onChange={(e) => handleChange('location_type', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="Địa điểm dỡ hàng">Địa điểm dỡ hàng</option>
                    <option value="Kho ngoại quan">Kho ngoại quan</option>
                    <option value="Cảng">Cảng</option>
                    <option value="Cửa khẩu">Cửa khẩu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã nước</label>
                  <input
                    type="text"
                    value={(item as Location).country_code || ''}
                    onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded"
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={(item as Location).address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

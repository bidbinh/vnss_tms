'use client';

import React, { useState, useCallback, useRef } from 'react';

interface ParsedItem {
  item_no: number;
  product_code: string | null;
  product_name: string | null;
  hs_code: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_value: number;
  gross_weight: number;
  net_weight: number;
  country_of_origin: string | null;
}

interface ParsedDocument {
  document_type: string | null;
  confidence: number;
  invoice_no: string | null;
  invoice_date: string | null;
  bl_no: string | null;
  bl_date: string | null;
  seller_name: string | null;
  seller_address: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  vessel_name: string | null;
  voyage_no: string | null;
  flight_no: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  eta: string | null;
  total_packages: number;
  gross_weight: number;
  net_weight: number;
  volume: number;
  container_numbers: string | null;
  currency: string;
  total_value: number;
  incoterms: string | null;
  items: ParsedItem[];
  warnings: string[];
  extracted_fields: Record<string, unknown>;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  parsed?: ParsedDocument;
  parsing: boolean;
  error?: string;
}

interface DocumentUploadProps {
  onDataExtracted?: (data: ParsedDocument) => void;
  onMergedData?: (data: ParsedDocument[]) => void;
  apiBaseUrl?: string;
}

const DOCUMENT_TYPES = [
  { value: 'INVOICE', label: 'Hóa đơn (Invoice)' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'BILL_OF_LADING', label: 'Vận đơn đường biển (B/L)' },
  { value: 'AIRWAY_BILL', label: 'Vận đơn hàng không (AWB)' },
  { value: 'ARRIVAL_NOTICE', label: 'Thông báo hàng đến' },
];

export default function DocumentUpload({
  onDataExtracted,
  onMergedData,
  apiBaseUrl = '/api/v1/fms',
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadAndParse = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (selectedType) {
      formData.append('document_type', selectedType);
    }

    try {
      const response = await fetch(`${apiBaseUrl}/customs/documents/parse-direct`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to parse document');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const processFiles = async (newFiles: FileList) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    const validFiles: UploadedFile[] = [];

    for (const file of Array.from(newFiles)) {
      const isValid = allowedTypes.some(
        (type) => file.type === type || file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')
      );

      if (!isValid) {
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        parsing: true,
      };

      validFiles.push(uploadedFile);
      setFiles((prev) => [...prev, uploadedFile]);

      // Parse the file
      try {
        const parsed = await uploadAndParse(file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, parsing: false, parsed }
              : f
          )
        );

        if (onDataExtracted) {
          onDataExtracted(parsed);
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, parsing: false, error: error instanceof Error ? error.message : 'Unknown error' }
              : f
          )
        );
      }
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await processFiles(e.dataTransfer.files);
    },
    [selectedType]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string | null) => {
    if (!type) return 'Không xác định';
    const found = DOCUMENT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleMergeAll = () => {
    const parsedDocs = files.filter((f) => f.parsed).map((f) => f.parsed!);
    if (onMergedData && parsedDocs.length > 0) {
      onMergedData(parsedDocs);
    }
  };

  return (
    <div className="space-y-4">
      {/* Document type selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">
          Loại chứng từ (tùy chọn):
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tự động nhận dạng</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-blue-600">Nhấp để chọn file</span>{' '}
          hoặc kéo thả vào đây
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Excel (.xlsx, .xls), CSV - Tối đa 10MB
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Chứng từ đã tải ({files.length})
            </h4>
            {files.filter((f) => f.parsed).length > 1 && (
              <button
                onClick={handleMergeAll}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                Gộp dữ liệu
              </button>
            )}
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* File icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    {file.name.endsWith('.pdf') ? (
                      <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>

                    {/* Status */}
                    {file.parsing && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-blue-600">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang phân tích...
                      </div>
                    )}

                    {file.error && (
                      <p className="mt-1 text-sm text-red-600">{file.error}</p>
                    )}

                    {file.parsed && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">Loại:</span>
                          <span className="font-medium">
                            {getDocumentTypeLabel(file.parsed.document_type)}
                          </span>
                          <span className={`text-xs ${getConfidenceColor(file.parsed.confidence)}`}>
                            ({Math.round(file.parsed.confidence * 100)}% chính xác)
                          </span>
                        </div>

                        {file.parsed.invoice_no && (
                          <div className="text-sm text-gray-600">
                            Invoice: <span className="font-medium">{file.parsed.invoice_no}</span>
                          </div>
                        )}

                        {file.parsed.bl_no && (
                          <div className="text-sm text-gray-600">
                            B/L: <span className="font-medium">{file.parsed.bl_no}</span>
                          </div>
                        )}

                        {file.parsed.items.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Mặt hàng: <span className="font-medium">{file.parsed.items.length} dòng</span>
                          </div>
                        )}

                        {file.parsed.warnings.length > 0 && (
                          <div className="mt-2">
                            {file.parsed.warnings.map((warning, idx) => (
                              <p key={idx} className="text-xs text-yellow-600">
                                ⚠️ {warning}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {file.parsed && (
                    <button
                      onClick={() => setShowPreview(showPreview === file.id ? null : file.id)}
                      className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      {showPreview === file.id ? 'Ẩn' : 'Chi tiết'}
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Preview expanded */}
              {showPreview === file.id && file.parsed && (
                <div className="mt-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="mb-2 font-medium text-gray-900">Thông tin chung</h5>
                      <dl className="space-y-1">
                        {file.parsed.seller_name && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Người bán:</dt>
                            <dd>{file.parsed.seller_name}</dd>
                          </div>
                        )}
                        {file.parsed.consignee_name && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Người nhận:</dt>
                            <dd>{file.parsed.consignee_name}</dd>
                          </div>
                        )}
                        {file.parsed.vessel_name && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Tàu:</dt>
                            <dd>{file.parsed.vessel_name}</dd>
                          </div>
                        )}
                        {file.parsed.loading_port && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Cảng xếp:</dt>
                            <dd>{file.parsed.loading_port}</dd>
                          </div>
                        )}
                        {file.parsed.discharge_port && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Cảng dỡ:</dt>
                            <dd>{file.parsed.discharge_port}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div>
                      <h5 className="mb-2 font-medium text-gray-900">Giá trị</h5>
                      <dl className="space-y-1">
                        {file.parsed.total_value > 0 && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Tổng giá trị:</dt>
                            <dd>
                              {file.parsed.currency} {file.parsed.total_value.toLocaleString()}
                            </dd>
                          </div>
                        )}
                        {file.parsed.gross_weight > 0 && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Trọng lượng:</dt>
                            <dd>{file.parsed.gross_weight.toLocaleString()} kg</dd>
                          </div>
                        )}
                        {file.parsed.total_packages > 0 && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Số kiện:</dt>
                            <dd>{file.parsed.total_packages}</dd>
                          </div>
                        )}
                        {file.parsed.container_numbers && (
                          <div className="flex gap-2">
                            <dt className="text-gray-500">Container:</dt>
                            <dd>{file.parsed.container_numbers}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  {/* Items table */}
                  {file.parsed.items.length > 0 && (
                    <div className="mt-4">
                      <h5 className="mb-2 font-medium text-gray-900">
                        Chi tiết hàng hóa ({file.parsed.items.length} dòng)
                      </h5>
                      <div className="max-h-64 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left">STT</th>
                              <th className="px-2 py-1 text-left">Mã SP</th>
                              <th className="px-2 py-1 text-left">Tên hàng</th>
                              <th className="px-2 py-1 text-left">HS Code</th>
                              <th className="px-2 py-1 text-right">SL</th>
                              <th className="px-2 py-1 text-right">Đơn giá</th>
                              <th className="px-2 py-1 text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {file.parsed.items.slice(0, 20).map((item) => (
                              <tr key={item.item_no}>
                                <td className="whitespace-nowrap px-2 py-1">{item.item_no}</td>
                                <td className="px-2 py-1">{item.product_code || '-'}</td>
                                <td className="max-w-xs truncate px-2 py-1" title={item.product_name || ''}>
                                  {item.product_name || '-'}
                                </td>
                                <td className="px-2 py-1">{item.hs_code || '-'}</td>
                                <td className="whitespace-nowrap px-2 py-1 text-right">
                                  {item.quantity.toLocaleString()} {item.unit || ''}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right">
                                  {item.unit_price.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right">
                                  {item.total_value.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {file.parsed.items.length > 20 && (
                          <p className="mt-2 text-center text-xs text-gray-500">
                            Và {file.parsed.items.length - 20} dòng khác...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

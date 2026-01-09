'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface HSCodeItem {
  id: string;
  item_no: number;
  hs_code: string;
  product_name: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_value: number;
  customs_value: number;
  import_duty_rate: number;
  import_duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_tax_amount: number;
}

interface CustomsDeclaration {
  id: string;
  shipment_id: string;
  declaration_no: string | null;
  declaration_type: string;
  status: string;
  customs_channel: string | null;
  customs_office_name: string | null;
  trader_name: string | null;
  trader_tax_code: string | null;
  bl_no: string | null;
  vessel_name: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  customs_value: number;
  total_packages: number;
  gross_weight: number;
  import_duty: number;
  vat: number;
  total_tax: number;
  registration_date: string | null;
  release_date: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  RELEASED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  RELEASED: 'Đã thông quan',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const CHANNEL_COLORS: Record<string, string> = {
  GREEN: 'bg-green-500 text-white',
  YELLOW: 'bg-yellow-500 text-white',
  RED: 'bg-red-500 text-white',
};

export default function CustomsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [declaration, setDeclaration] = useState<CustomsDeclaration | null>(null);
  const [hsItems, setHsItems] = useState<HSCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    fetchDeclaration();
    fetchHSItems();
  }, [id]);

  const fetchDeclaration = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/fms/customs/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch declaration');
      const data = await response.json();
      setDeclaration(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHSItems = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/fms/customs/${id}/hs-codes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch HS codes');
      const data = await response.json();
      setHsItems(data);
    } catch (err) {
      console.error('Error fetching HS items:', err);
    }
  };

  const handleExportXML = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/fms/customs/${id}/export/xml`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to export XML');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customs_${declaration?.declaration_no || id}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Lỗi khi xuất XML: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa tờ khai này?')) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/fms/customs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete');
      }
      router.push('/fms/customs');
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !declaration) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error || 'Không tìm thấy tờ khai'}</p>
        <Link href="/fms/customs" className="mt-4 inline-block text-blue-600 hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/fms/customs" className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Tờ khai {declaration.declaration_no || 'Nháp'}
            </h1>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[declaration.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[declaration.status] || declaration.status}
            </span>
            {declaration.customs_channel && (
              <span className={`rounded px-2 py-1 text-xs font-medium ${CHANNEL_COLORS[declaration.customs_channel] || 'bg-gray-500 text-white'}`}>
                Luồng {declaration.customs_channel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Loại: {declaration.declaration_type === 'IMPORT' ? 'Nhập khẩu' : 'Xuất khẩu'}
            {declaration.registration_date && ` • Ngày đăng ký: ${new Date(declaration.registration_date).toLocaleDateString('vi-VN')}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportXML}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Xuất XML
          </button>

          {declaration.status === 'DRAFT' && (
            <>
              <Link
                href={`/fms/customs/${id}/edit`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Chỉnh sửa
              </Link>
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
              >
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Parties */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Thông tin các bên</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Chi cục HQ</dt>
              <dd className="font-medium">{declaration.customs_office_name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Người nhập khẩu</dt>
              <dd className="font-medium">{declaration.trader_name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Mã số thuế</dt>
              <dd className="font-medium">{declaration.trader_tax_code || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Transport */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Vận chuyển</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Số B/L</dt>
              <dd className="font-medium">{declaration.bl_no || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tên tàu</dt>
              <dd className="font-medium">{declaration.vessel_name || '-'}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Cảng xếp</dt>
                <dd className="font-medium">{declaration.loading_port || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Cảng dỡ</dt>
                <dd className="font-medium">{declaration.discharge_port || '-'}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Cargo */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Hàng hóa</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Số kiện</dt>
              <dd className="text-xl font-bold">{declaration.total_packages.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Trọng lượng</dt>
              <dd className="text-xl font-bold">{declaration.gross_weight.toLocaleString()} kg</dd>
            </div>
          </dl>
        </div>

        {/* Tax Summary */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Thuế</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Trị giá tính thuế</dt>
              <dd className="font-medium">{declaration.customs_value.toLocaleString()} VND</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Thuế NK</dt>
              <dd className="font-medium">{declaration.import_duty.toLocaleString()} VND</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Thuế GTGT</dt>
              <dd className="font-medium">{declaration.vat.toLocaleString()} VND</dd>
            </div>
            <div className="flex justify-between border-t pt-2">
              <dt className="font-medium text-gray-900">Tổng thuế</dt>
              <dd className="text-xl font-bold text-blue-600">{declaration.total_tax.toLocaleString()} VND</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* HS Code Items */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Chi tiết hàng hóa ({hsItems.length} dòng)
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">STT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Mã HS</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tên hàng</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">SL</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Đơn giá</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Trị giá</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Thuế NK</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Tổng thuế</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hsItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">{item.item_no}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-blue-600">
                    {item.hs_code}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3" title={item.product_name || ''}>
                    {item.product_name || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {item.quantity.toLocaleString()} {item.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {item.unit_price.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {item.total_value.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div>{item.import_duty_amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">({item.import_duty_rate}%)</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div>{item.vat_amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">({item.vat_rate}%)</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {item.total_tax_amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right">Tổng cộng:</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {hsItems.reduce((sum, item) => sum + item.total_value, 0).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {hsItems.reduce((sum, item) => sum + item.import_duty_amount, 0).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {hsItems.reduce((sum, item) => sum + item.vat_amount, 0).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-blue-600">
                  {hsItems.reduce((sum, item) => sum + item.total_tax_amount, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {hsItems.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            Chưa có chi tiết hàng hóa
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Lịch sử</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Tạo tờ khai</p>
              <p className="text-sm text-gray-500">
                {new Date(declaration.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {declaration.registration_date && (
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Đăng ký tờ khai</p>
                <p className="text-sm text-gray-500">
                  Số: {declaration.declaration_no}
                  {' • '}
                  {new Date(declaration.registration_date).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          )}

          {declaration.release_date && (
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Thông quan</p>
                <p className="text-sm text-gray-500">
                  Luồng {declaration.customs_channel}
                  {' • '}
                  {new Date(declaration.release_date).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

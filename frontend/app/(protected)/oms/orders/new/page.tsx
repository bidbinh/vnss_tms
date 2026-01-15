"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface OrderItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  cs_unit_price: number;
  quoted_unit_price: number;
  shipping_unit_cost: number;
  notes?: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    external_reference: "",
    delivery_contact_name: "",
    delivery_contact_phone: "",
    required_delivery_date: "",
    sales_notes: "",
    customer_notes: "",
  });

  const [items, setItems] = useState<OrderItem[]>([
    {
      product_id: "prod-001",
      product_code: "PP-001",
      product_name: "PP Hạt Nhựa Grade A",
      product_unit: "KG",
      quantity: 1000,
      cs_unit_price: 25000,
      quoted_unit_price: 24000,
      shipping_unit_cost: 200,
      notes: "",
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: `prod-${Date.now()}`,
        product_code: "",
        product_name: "",
        product_unit: "KG",
        quantity: 0,
        cs_unit_price: 0,
        quoted_unit_price: 0,
        shipping_unit_cost: 0,
        notes: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    let productTotal = 0;
    let shippingTotal = 0;

    items.forEach((item) => {
      productTotal += item.quoted_unit_price * item.quantity;
      shippingTotal += item.shipping_unit_cost * item.quantity;
    });

    const subtotal = productTotal + shippingTotal;
    const tax = subtotal * 0.1; // VAT 10%
    const grandTotal = subtotal + tax;

    return { productTotal, shippingTotal, tax, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }

    if (!formData.customer_id) {
      alert("Vui lòng chọn khách hàng");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        customer_id: formData.customer_id || "cust-default",
        items: items.map((item) => ({
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          product_unit: item.product_unit,
          quantity: Number(item.quantity),
          cs_unit_price: Number(item.cs_unit_price),
          quoted_unit_price: Number(item.quoted_unit_price),
          shipping_unit_cost: Number(item.shipping_unit_cost),
          notes: item.notes || undefined,
        })),
      };

      const result = await apiFetch("/oms/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/oms/orders/${result.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Không thể tạo đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const totals = calculateTotal();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/oms/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tạo Đơn Hàng Mới</h1>
            <p className="text-sm text-gray-500 mt-1">
              Nhập thông tin đơn hàng và sản phẩm
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Thông Tin Khách Hàng</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã Khách Hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value })
                }
                placeholder="CUST-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã Tham Chiếu (Nếu có)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.external_reference}
                onChange={(e) =>
                  setFormData({ ...formData, external_reference: e.target.value })
                }
                placeholder="PO-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người Nhận
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.delivery_contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_contact_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số Điện Thoại
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.delivery_contact_phone}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_contact_phone: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày Giao Yêu Cầu
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.required_delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, required_delivery_date: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sản Phẩm</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm Sản Phẩm
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã SP
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên SP
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    SL
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    ĐVT
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Giá CS
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Giá Chào
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Cước VC
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={item.product_code}
                        onChange={(e) =>
                          updateItem(index, "product_code", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        value={item.product_name}
                        onChange={(e) =>
                          updateItem(index, "product_name", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={item.product_unit}
                        onChange={(e) => updateItem(index, "product_unit", e.target.value)}
                      >
                        <option value="KG">KG</option>
                        <option value="TAN">TẤN</option>
                        <option value="BAO">BÀO</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        value={item.cs_unit_price}
                        onChange={(e) =>
                          updateItem(index, "cs_unit_price", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        value={item.quoted_unit_price}
                        onChange={(e) =>
                          updateItem(index, "quoted_unit_price", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        value={item.shipping_unit_cost}
                        onChange={(e) =>
                          updateItem(index, "shipping_unit_cost", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Tổng Kết</h3>
          <dl className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Tổng Tiền Hàng</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatCurrency(totals.productTotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Cước Vận Chuyển</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatCurrency(totals.shippingTotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Thuế VAT (10%)</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatCurrency(totals.tax)}
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <dt className="text-base font-semibold text-gray-900">Tổng Cộng</dt>
              <dd className="text-base font-bold text-blue-600">
                {formatCurrency(totals.grandTotal)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Ghi Chú</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi Chú Sale
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.sales_notes}
                onChange={(e) => setFormData({ ...formData, sales_notes: e.target.value })}
                placeholder="Ghi chú nội bộ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yêu Cầu Khách Hàng
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.customer_notes}
                onChange={(e) =>
                  setFormData({ ...formData, customer_notes: e.target.value })
                }
                placeholder="Yêu cầu đặc biệt từ khách hàng..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/oms/orders"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang Tạo...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Tạo Đơn Hàng
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

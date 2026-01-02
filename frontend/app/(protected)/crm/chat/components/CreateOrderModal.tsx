"use client";

import { useState, useEffect } from "react";
import { X, ShoppingCart, Package, MapPin, Truck, Calendar, DollarSign, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface OrderItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  accountId?: string;
  accountName?: string;
  conversationId?: string;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  accountName,
  conversationId,
}: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: accountName || "",
    pickup_address: "",
    delivery_address: "",
    pickup_date: "",
    notes: "",
  });
  const [items, setItems] = useState<OrderItem[]>([
    { description: "", quantity: 1, unit: "thung", unit_price: 0 }
  ]);

  useEffect(() => {
    if (isOpen && accountName) {
      setFormData(prev => ({ ...prev, customer_name: accountName }));
    }
  }, [isOpen, accountName]);

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unit: "thung", unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.pickup_address || !formData.delivery_address) {
      alert("Vui long dien day du thong tin bat buoc");
      return;
    }

    setLoading(true);
    try {
      // Create sales order in CRM
      const orderData = {
        account_id: accountId,
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: formData.pickup_date || null,
        shipping_address: formData.delivery_address,
        notes: formData.notes,
        status: "DRAFT",
        items: items.filter(i => i.description).map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        })),
        conversation_id: conversationId,
        source: "CHAT",
      };

      const res = await apiFetch<{ id: string }>("/crm/sales-orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      onSuccess(res.id);
      handleClose();
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Khong the tao don hang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customer_name: "",
      pickup_address: "",
      delivery_address: "",
      pickup_date: "",
      notes: "",
    });
    setItems([{ description: "", quantity: 1, unit: "thung", unit_price: 0 }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Tao don hang tu chat</h3>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Customer Info */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Thong tin khach hang
            </h4>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Ten khach hang *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Addresses */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Dia chi lay hang *
              </label>
              <textarea
                value={formData.pickup_address}
                onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                placeholder="Nhap dia chi lay hang"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Truck className="w-4 h-4 inline mr-1" />
                Dia chi giao hang *
              </label>
              <textarea
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                placeholder="Nhap dia chi giao hang"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Ngay lay hang
            </label>
            <input
              type="date"
              value={formData.pickup_date}
              onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Hang hoa
              </h4>
              <button
                onClick={handleAddItem}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Them dong
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    placeholder="Mo ta hang hoa"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                    placeholder="SL"
                    min={1}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                    className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="thung">Thung</option>
                    <option value="kien">Kien</option>
                    <option value="pallet">Pallet</option>
                    <option value="kg">Kg</option>
                    <option value="tan">Tan</option>
                    <option value="cai">Cai</option>
                  </select>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, "unit_price", parseInt(e.target.value) || 0)}
                    placeholder="Don gia"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 hover:bg-red-100 rounded text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-3 flex justify-end">
              <div className="text-right">
                <span className="text-gray-500 mr-2">Tong cong:</span>
                <span className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat("vi-VN").format(calculateTotal())} d
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chu
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ghi chu cho don hang..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Huy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Dang tao...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Tao don hang
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

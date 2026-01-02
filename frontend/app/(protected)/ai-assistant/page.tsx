"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  order_data?: any;
  confidence?: number;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Xin chào! Tôi là AI Assistant của hệ thống TMS.\n\n🚚 Bạn có thể:\n• Gửi tin nhắn booking để tôi tự động tạo đơn hàng\n• Upload ảnh POD để trích xuất thông tin\n• Hỏi tôi về tài xế phù hợp cho tuyến đường\n\nHãy thử gửi tin nhắn booking hoặc kéo thả ảnh vào đây!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const payload: any = {
        message: input
      };

      if (selectedImage) {
        // Extract base64 from data URL
        const base64 = selectedImage.split(',')[1];
        payload.image = base64;
        payload.image_type = "image/jpeg";
      }

      const res = await fetch(`${API_BASE_URL}/ai-assistant/parse-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to parse message");
      }

      const data = await res.json();

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: formatAssistantResponse(data),
        timestamp: new Date(),
        order_data: data.order_data,
        confidence: data.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSelectedImage(null);

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Lỗi: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatAssistantResponse = (data: any): string => {
    const { order_data, confidence } = data;

    let response = `✅ Đã trích xuất thông tin đơn hàng (Độ tin cậy: ${(confidence * 100).toFixed(0)}%)\n\n`;

    if (order_data.pickup) {
      response += `📍 **Điểm đón:**\n`;
      response += `  • Địa điểm: ${order_data.pickup.location || "N/A"}\n`;
      response += `  • Địa chỉ: ${order_data.pickup.address || "N/A"}\n`;
      if (order_data.pickup.date) {
        response += `  • Ngày: ${order_data.pickup.date}\n`;
      }
      response += `\n`;
    }

    if (order_data.delivery) {
      response += `🎯 **Điểm giao:**\n`;
      response += `  • Công ty: ${order_data.delivery.company_name || "N/A"}\n`;
      response += `  • Địa chỉ: ${order_data.delivery.address || "N/A"}\n`;
      response += `  • Người nhận: ${order_data.delivery.contact_name || "N/A"}\n`;
      response += `  • SĐT: ${order_data.delivery.contact_phone || "N/A"}\n`;
      if (order_data.delivery.date) {
        response += `  • Ngày giao: ${order_data.delivery.date}\n`;
      }
      if (order_data.delivery.instructions) {
        response += `  • Ghi chú: ${order_data.delivery.instructions}\n`;
      }
      response += `\n`;
    }

    if (order_data.cargo) {
      response += `📦 **Hàng hóa:**\n`;
      response += `  • Mô tả: ${order_data.cargo.description || "N/A"}\n`;
      if (order_data.cargo.weight_tons) {
        response += `  • Trọng lượng: ${order_data.cargo.weight_tons} tấn\n`;
      }
      if (order_data.cargo.quantity) {
        response += `  • Số lượng: ${order_data.cargo.quantity} ${order_data.cargo.unit || ""}\n`;
      }
      response += `\n`;
    }

    response += `\n💡 **Bước tiếp theo:**\n`;
    response += `1. Kiểm tra thông tin trên\n`;
    response += `2. Click "Tạo đơn hàng" để lưu vào hệ thống\n`;
    response += `3. Hoặc gửi tin nhắn "sửa [thông tin]" để chỉnh sửa`;

    return response;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateOrder = async (orderData: any) => {
    if (!orderData) return;

    try {
      const res = await fetch(`${API_BASE_URL}/ai-assistant/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({
          order_data: orderData,
          auto_create: true
        })
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const data = await res.json();

      const successMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Đã tạo đơn hàng thành công!\n\nMã đơn: ${data.order_id}\n\nBạn có thể xem chi tiết tại trang Orders.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, successMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Lỗi khi tạo đơn hàng: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">🤖 AI Assistant</h1>
        <p className="text-blue-100">Trợ lý AI thông minh - Tạo đơn hàng tự động từ tin nhắn</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 shadow-md ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.order_data && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <button
                    onClick={() => handleCreateOrder(message.order_data)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    ✅ Tạo đơn hàng
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(message.order_data, null, 2));
                      alert("Đã copy dữ liệu!");
                    }}
                    className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    📋 Copy JSON
                  </button>
                </div>
              )}

              <div className="mt-2 text-xs opacity-70">
                {message.timestamp.toLocaleTimeString("vi-VN")}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">AI đang suy nghĩ...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {selectedImage && (
        <div className="px-6 py-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={selectedImage} alt="Selected" className="h-16 w-16 object-cover rounded" />
              <span className="text-sm text-gray-700">Ảnh đã chọn</span>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              ❌ Xóa
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Upload ảnh POD"
            >
              <span className="text-2xl">📷</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn booking hoặc hỏi AI... (Enter để gửi, Shift+Enter để xuống dòng)"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !selectedImage)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors h-full"
            >
              {loading ? "⏳" : "🚀"} Gửi
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            💡 Tip: Bạn có thể paste tin nhắn từ Zalo/Telegram/WhatsApp hoặc kéo thả ảnh POD vào đây
          </div>
        </div>
      </div>
    </div>
  );
}

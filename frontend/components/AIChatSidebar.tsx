"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Bot, User, Sparkles, RotateCcw, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: string;
  tenant_name?: string;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Suggested prompts for quick actions
const QUICK_PROMPTS = [
  "Tạo đơn hàng mới",
  "Xem báo cáo doanh thu",
  "Hướng dẫn thêm tài xế",
  "Kiểm tra đơn hàng",
];

export default function AIChatSidebar({ isOpen, onClose }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load user info
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserInfo({
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email?.split("@")[0],
          role: user.role || user.system_role || "user",
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name || user.company_name,
        });
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
  }, []);

  // Set initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const firstName = userInfo?.full_name?.split(" ").pop() || "bạn";
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: `Chào ${firstName}! 👋\n\nMình là trợ lý AI của 9log. Hôm nay mình có thể giúp gì cho bạn?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [userInfo]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      const userContext = userInfo
        ? {
            user_id: userInfo.id,
            user_name: userInfo.full_name,
            user_email: userInfo.email,
            user_role: userInfo.role,
            tenant_id: userInfo.tenant_id,
            tenant_name: userInfo.tenant_name,
            is_logged_in: true,
          }
        : { is_logged_in: false };

      const response = await fetch("/api/v1/ai/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          user_context: userContext,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.detail || "Bạn đã hết lượt chat. Thử lại sau nhé! 😊",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response || "Xin lỗi, mình gặp chút trục trặc.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Ối, mình không kết nối được. Bạn thử lại sau nhé!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetConversation = () => {
    const firstName = userInfo?.full_name?.split(" ").pop() || "bạn";
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: `Chào ${firstName}! 👋\n\nMình sẵn sàng giúp bạn rồi. Hỏi gì đi!`,
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">9log AI</h2>
              <p className="text-xs text-white/70">
                {userInfo ? `Xin chào, ${userInfo.full_name?.split(" ").pop()}` : "Trợ lý của bạn"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetConversation}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cuộc trò chuyện mới"
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message bubble */}
            <div className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block rounded-2xl px-4 py-2.5 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>

              {/* Message actions */}
              <div
                className={`flex items-center gap-2 mt-1 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <span className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.role === "assistant" && message.id !== "greeting" && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Sao chép"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts (show when no messages or just greeting) */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-500 mb-2">Gợi ý:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi gì đi..."
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              disabled={isLoading}
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Nhấn Enter để gửi • Shift+Enter để xuống dòng
        </p>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, RotateCcw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string for storage
}

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: string;
  tenant_name?: string;
}

interface ChatWidgetProps {
  apiUrl?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
}

// Generate or get visitor ID for anonymous users
function getVisitorId(): string {
  const VISITOR_KEY = "9log_visitor_id";
  let visitorId = localStorage.getItem(VISITOR_KEY);

  if (!visitorId) {
    // Generate a unique visitor ID
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  return visitorId;
}

// Get chat history storage key based on user/visitor
function getChatStorageKey(userInfo: UserInfo | null): string {
  if (userInfo?.id) {
    return `9log_chat_${userInfo.id}`;
  }
  return `9log_chat_${getVisitorId()}`;
}

// Save messages to localStorage
function saveMessages(messages: Message[], userInfo: UserInfo | null, conversationId: string | null): void {
  const key = getChatStorageKey(userInfo);
  const stored: StoredMessage[] = messages.map(m => ({
    ...m,
    timestamp: m.timestamp.toISOString(),
  }));

  localStorage.setItem(key, JSON.stringify({
    messages: stored,
    conversationId,
    lastUpdated: new Date().toISOString(),
  }));
}

// Load messages from localStorage
function loadMessages(userInfo: UserInfo | null): { messages: Message[], conversationId: string | null } | null {
  const key = getChatStorageKey(userInfo);
  const data = localStorage.getItem(key);

  if (!data) return null;

  try {
    const parsed = JSON.parse(data);
    const messages: Message[] = parsed.messages.map((m: StoredMessage) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    // Check if data is not too old (7 days)
    const lastUpdated = new Date(parsed.lastUpdated);
    const daysDiff = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      localStorage.removeItem(key);
      return null;
    }

    return {
      messages,
      conversationId: parsed.conversationId || null,
    };
  } catch {
    return null;
  }
}

export default function AIChatWidget({
  apiUrl = "/api/v1/ai/widget/chat",
  position = "bottom-right",
  primaryColor = "#2563eb",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user info from localStorage
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
    setIsInitialized(true);
  }, []);

  // Load saved chat history or set greeting
  useEffect(() => {
    if (!isInitialized) return;

    const saved = loadMessages(userInfo);

    if (saved && saved.messages.length > 0) {
      // Restore previous chat
      setMessages(saved.messages);
      setConversationId(saved.conversationId);
    } else {
      // Set greeting for new chat
      const visitorId = getVisitorId();
      const firstName = userInfo?.full_name?.split(" ").pop();

      let greeting: string;
      if (firstName) {
        greeting = `Chào ${firstName}! 👋 Mình là trợ lý AI của 9log. Mình có thể giúp gì cho bạn?`;
      } else {
        // Check if returning visitor
        const hasVisited = localStorage.getItem("9log_has_visited");
        if (hasVisited) {
          greeting = "Chào mừng bạn quay lại! 👋 Mình là trợ lý AI của 9log. Bạn cần tìm hiểu thêm về giải pháp nào?";
        } else {
          greeting = "Xin chào! 👋 Mình là trợ lý AI của 9log. Bạn cần tìm hiểu về giải pháp nào?";
          localStorage.setItem("9log_has_visited", "true");
        }
      }

      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [userInfo, isInitialized]);

  // Save messages whenever they change
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      saveMessages(messages, userInfo, conversationId);
    }
  }, [messages, userInfo, conversationId, isInitialized]);

  // Listen for openAIChat event (from "Chat với AI" button)
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener("openAIChat", handleOpenChat);
    return () => window.removeEventListener("openAIChat", handleOpenChat);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get auth token
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      // Get visitor ID for anonymous users
      const visitorId = userInfo ? null : getVisitorId();

      // Build user context
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
        : {
            visitor_id: visitorId,
            is_logged_in: false,
          };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          conversation_id: conversationId,
          user_context: userContext,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      // Handle rate limit
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

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || "Xin lỗi, mình gặp chút trục trặc. Bạn thử lại nhé!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
      // Re-focus input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [input, isLoading, userInfo, apiUrl, conversationId, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    const firstName = userInfo?.full_name?.split(" ").pop();
    const greeting = firstName
      ? `Chào ${firstName}! 👋 Mình sẵn sàng giúp bạn rồi!`
      : "Xin chào! 👋 Mình sẵn sàng giúp bạn rồi!";

    const newMessages = [
      {
        id: "greeting",
        role: "assistant" as const,
        content: greeting,
        timestamp: new Date(),
      },
    ];

    setMessages(newMessages);
    setConversationId(null);

    // Clear saved chat history for fresh start
    const key = getChatStorageKey(userInfo);
    localStorage.removeItem(key);
  };

  const positionClasses =
    position === "bottom-right" ? "right-4" : "left-4";

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 ${positionClasses} z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110`}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-20 ${positionClasses} z-50 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200`}
        >
          {/* Header */}
          <div
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">9log AI</h3>
                <p className="text-xs opacity-80">
                  {userInfo ? `Xin chào, ${userInfo.full_name?.split(" ").pop()}` : "Hỗ trợ AI 24/7"}
                </p>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cuộc trò chuyện mới"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  style={message.role === "user" ? { backgroundColor: primaryColor } : {}}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                  style={message.role === "user" ? { backgroundColor: primaryColor } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-white/70"
                        : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
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

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi gì đi..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Powered by Claude AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}

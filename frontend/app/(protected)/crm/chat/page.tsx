"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info,
  Star,
  StarOff,
  User,
  Users,
  Building2,
  Settings,
  Plus,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  X,
  Inbox,
  Archive,
  Tag,
  UserPlus,
  Link2,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Channel Icons
const ZaloIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.06-.06-.16-.04-.23-.02-.1.02-1.62 1.03-4.58 3.03-.43.3-.82.44-1.17.43-.39-.01-1.13-.22-1.68-.4-.68-.22-1.22-.34-1.17-.72.02-.2.3-.4.8-.6 3.15-1.37 5.25-2.28 6.3-2.72 3-1.27 3.63-1.49 4.03-1.5.09 0 .29.02.42.12.11.09.14.21.16.3-.01.06.01.24 0 .37z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  ZALO_OA: <ZaloIcon />,
  FACEBOOK: <FacebookIcon />,
  WHATSAPP: <WhatsAppIcon />,
  WEBSITE: <MessageSquare className="w-5 h-5" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  ZALO_OA: "text-blue-600 bg-blue-100",
  FACEBOOK: "text-blue-700 bg-blue-100",
  WHATSAPP: "text-green-600 bg-green-100",
  WEBSITE: "text-purple-600 bg-purple-100",
};

const MESSAGE_STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3 text-gray-400" />,
  SENT: <Check className="w-3 h-3 text-gray-400" />,
  DELIVERED: <CheckCheck className="w-3 h-3 text-gray-400" />,
  READ: <CheckCheck className="w-3 h-3 text-blue-500" />,
  FAILED: <AlertCircle className="w-3 h-3 text-red-500" />,
};

interface Conversation {
  id: string;
  channel: {
    id: string;
    name: string;
    type: string;
  };
  customer: {
    channel_id: string;
    name: string;
    avatar: string | null;
    phone: string | null;
  };
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  status: string;
  assigned_to: string | null;
  priority: number;
  is_starred: boolean;
  message_count: number;
  unread_count: number;
  last_message: {
    content: string;
    direction: string;
    created_at: string;
  } | null;
  last_message_at: string | null;
  tags: string[];
  sentiment_score: number | null;
}

interface Message {
  id: string;
  direction: string;
  message_type: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  created_at: string;
  sentiment: string | null;
}

interface InboxStats {
  open: number;
  pending: number;
  resolved: number;
  my_conversations: number;
  unassigned: number;
  unread_messages: number;
  starred: number;
  by_channel: Record<string, number>;
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [assignFilter, setAssignFilter] = useState<string>("me");

  // Side panel
  const [showDetails, setShowDetails] = useState(false);

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<Array<{id: string; title: string; content: string; shortcut?: string}>>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchStats();
    fetchConversations();
    fetchQuickReplies();
  }, [router]);

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, channelFilter, assignFilter, search]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = async () => {
    try {
      const res = await apiFetch<InboxStats>("/crm/chat/stats");
      setStats(res);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (channelFilter) params.set("channel_type", channelFilter);
      if (assignFilter) params.set("assigned_to", assignFilter);
      if (search) params.set("search", search);
      params.set("page_size", "100");

      const res = await apiFetch<{ items: Conversation[] }>(`/crm/chat/conversations?${params.toString()}`);
      setConversations(res.items);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await apiFetch<{ items: Message[] }>(`/crm/chat/conversations/${conversationId}/messages`);
      setMessages(res.items);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const res = await apiFetch<{ items: Array<{id: string; title: string; content: string; shortcut?: string}> }>("/crm/chat/quick-replies");
      setQuickReplies(res.items);
    } catch (error) {
      console.error("Failed to fetch quick replies:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await apiFetch(`/crm/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: newMessage,
          message_type: "TEXT",
        }),
      });
      setNewMessage("");
      fetchMessages(selectedConversation.id);
      fetchConversations(); // Refresh list to update last message
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStarConversation = async (conv: Conversation) => {
    try {
      await apiFetch(`/crm/chat/conversations/${conv.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_starred: !conv.is_starred }),
      });
      fetchConversations();
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation({ ...conv, is_starred: !conv.is_starred });
      }
    } catch (error) {
      console.error("Failed to star conversation:", error);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;
    try {
      await apiFetch(`/crm/chat/conversations/${selectedConversation.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      fetchConversations();
      fetchStats();
      setSelectedConversation(null);
    } catch (error) {
      console.error("Failed to close conversation:", error);
    }
  };

  const useQuickReply = (reply: { content: string }) => {
    setNewMessage(reply.content);
    setShowQuickReplies(false);
    messageInputRef.current?.focus();
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Hom qua";
    } else if (days < 7) {
      return date.toLocaleDateString("vi-VN", { weekday: "short" });
    } else {
      return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-100">
      {/* Left Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Tin nhan</h1>
            <button
              onClick={() => router.push("/crm/chat/channels")}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Cai dat kenh"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              statusFilter === "OPEN"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mo ({stats?.open || 0})
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              statusFilter === "PENDING"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cho ({stats?.pending || 0})
          </button>
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              statusFilter === "RESOLVED"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Xong ({stats?.resolved || 0})
          </button>
        </div>

        {/* Filters */}
        <div className="p-2 border-b border-gray-200 flex gap-2">
          <select
            value={assignFilter}
            onChange={(e) => setAssignFilter(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
          >
            <option value="me">Cua toi</option>
            <option value="unassigned">Chua phan cong</option>
            <option value="">Tat ca</option>
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
          >
            <option value="">Tat ca kenh</option>
            <option value="ZALO_OA">Zalo</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Inbox className="w-12 h-12 mb-2" />
              <p className="text-sm">Khong co cuoc hoi thoai nao</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conv.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with channel badge */}
                  <div className="relative flex-shrink-0">
                    {conv.customer.avatar ? (
                      <img
                        src={conv.customer.avatar}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${CHANNEL_COLORS[conv.channel.type] || "bg-gray-100"}`}>
                      {CHANNEL_ICONS[conv.channel.type]}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {conv.customer.name || "Khach hang"}
                        </span>
                        {conv.is_starred && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    {conv.account && (
                      <div className="text-xs text-blue-600 mb-1 truncate">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {conv.account.name}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {conv.last_message?.direction === "OUTBOUND" && (
                          <span className="text-gray-400">Ban: </span>
                        )}
                        {conv.last_message?.content || "Chua co tin nhan"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedConversation.customer.avatar ? (
                  <img
                    src={selectedConversation.customer.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {selectedConversation.customer.name || "Khach hang"}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded ${CHANNEL_COLORS[selectedConversation.channel.type]}`}>
                    {selectedConversation.channel.name}
                  </span>
                  {selectedConversation.customer.phone && (
                    <span>{selectedConversation.customer.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStarConversation(selectedConversation)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title={selectedConversation.is_starred ? "Bo danh dau" : "Danh dau sao"}
              >
                {selectedConversation.is_starred ? (
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ) : (
                  <StarOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`p-2 rounded-lg ${showDetails ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
                title="Thong tin chi tiet"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={handleCloseConversation}
                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg"
              >
                Dong cuoc hoi thoai
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p>Chua co tin nhan nao</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.direction === "OUTBOUND"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.sender_type === "staff" && msg.sender_name && (
                      <div className={`text-xs mb-1 ${msg.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-500"}`}>
                        {msg.sender_name}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.media_url && (
                      <img src={msg.media_url} alt="" className="mt-2 max-w-full rounded" />
                    )}
                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                      msg.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"
                    }`}>
                      <span>{formatTime(msg.created_at)}</span>
                      {msg.direction === "OUTBOUND" && MESSAGE_STATUS_ICONS[msg.status]}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {/* Quick Replies */}
            {showQuickReplies && quickReplies.length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                <div className="text-xs text-gray-500 mb-2">Tra loi nhanh</div>
                <div className="space-y-1">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => useQuickReply(reply)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white rounded"
                    >
                      <span className="font-medium">{reply.title}</span>
                      {reply.shortcut && (
                        <span className="text-xs text-gray-400 ml-2">{reply.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Dinh kem file">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Gui hinh anh">
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={`p-2 rounded-lg ${showQuickReplies ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
                  title="Tra loi nhanh"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhap tin nhan..."
                rows={1}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ maxHeight: "120px" }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
          <MessageSquare className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium mb-2">Chon cuoc hoi thoai</h3>
          <p className="text-sm">Chon mot cuoc hoi thoai tu danh sach ben trai de bat dau</p>
        </div>
      )}

      {/* Right Sidebar - Details Panel */}
      {showDetails && selectedConversation && (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Thong tin</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="text-center mb-4">
              {selectedConversation.customer.avatar ? (
                <img
                  src={selectedConversation.customer.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full mx-auto mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <h4 className="font-medium text-gray-900">
                {selectedConversation.customer.name || "Khach hang"}
              </h4>
              {selectedConversation.customer.phone && (
                <p className="text-sm text-gray-500">{selectedConversation.customer.phone}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Hanh dong</h4>
            {!selectedConversation.account ? (
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg">
                <Link2 className="w-4 h-4 text-blue-600" />
                Lien ket voi khach hang CRM
              </button>
            ) : (
              <Link
                href={`/crm/accounts/${selectedConversation.account.id}`}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                Xem ho so: {selectedConversation.account.name}
              </Link>
            )}
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              Tao don hang moi
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg">
              <UserPlus className="w-4 h-4 text-purple-600" />
              Chuyen cho nguoi khac
            </button>
          </div>

          {/* Tags */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Nhan</h4>
            <div className="flex flex-wrap gap-1">
              {selectedConversation.tags.length > 0 ? (
                selectedConversation.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Chua co nhan</span>
              )}
              <button className="px-2 py-1 border border-dashed border-gray-300 text-gray-400 text-xs rounded-full hover:border-gray-400">
                + Them
              </button>
            </div>
          </div>

          {/* Conversation Stats */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Thong ke</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tong tin nhan</span>
                <span className="text-gray-900">{selectedConversation.message_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kenh</span>
                <span className="text-gray-900">{selectedConversation.channel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trang thai</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  selectedConversation.status === "OPEN" ? "bg-green-100 text-green-700" :
                  selectedConversation.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {selectedConversation.status === "OPEN" ? "Mo" :
                   selectedConversation.status === "PENDING" ? "Cho" :
                   selectedConversation.status === "RESOLVED" ? "Xong" : selectedConversation.status}
                </span>
              </div>
              {selectedConversation.sentiment_score !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cam xuc</span>
                  <span className={`text-sm ${
                    selectedConversation.sentiment_score > 0.3 ? "text-green-600" :
                    selectedConversation.sentiment_score < -0.3 ? "text-red-600" :
                    "text-gray-600"
                  }`}>
                    {selectedConversation.sentiment_score > 0.3 ? "Tich cuc" :
                     selectedConversation.sentiment_score < -0.3 ? "Tieu cuc" :
                     "Trung lap"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatInboxPage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <PageContent />
    </Suspense>
  );
}

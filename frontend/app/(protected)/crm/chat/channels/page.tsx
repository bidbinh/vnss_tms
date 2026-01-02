"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Edit,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Channel Icons
const ZaloIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.06-.06-.16-.04-.23-.02-.1.02-1.62 1.03-4.58 3.03-.43.3-.82.44-1.17.43-.39-.01-1.13-.22-1.68-.4-.68-.22-1.22-.34-1.17-.72.02-.2.3-.4.8-.6 3.15-1.37 5.25-2.28 6.3-2.72 3-1.27 3.63-1.49 4.03-1.5.09 0 .29.02.42.12.11.09.14.21.16.3-.01.06.01.24 0 .37z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const CHANNEL_CONFIG = {
  ZALO_OA: {
    name: "Zalo Official Account",
    icon: ZaloIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Ket noi voi Zalo OA de nhan va gui tin nhan tu khach hang",
    fields: [
      { key: "zalo_oa_id", label: "OA ID", placeholder: "Nhap OA ID cua ban" },
      { key: "access_token", label: "Access Token", placeholder: "Access token tu Zalo Developer" },
      { key: "refresh_token", label: "Refresh Token", placeholder: "Refresh token (optional)" },
    ],
  },
  FACEBOOK: {
    name: "Facebook Messenger",
    icon: FacebookIcon,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    description: "Ket noi voi Facebook Page de nhan tin nhan tu Messenger",
    fields: [
      { key: "fb_page_id", label: "Page ID", placeholder: "Nhap Page ID cua ban" },
      { key: "access_token", label: "Page Access Token", placeholder: "Token tu Facebook Developer" },
    ],
  },
  WHATSAPP: {
    name: "WhatsApp Business",
    icon: WhatsAppIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Ket noi voi WhatsApp Business API",
    fields: [
      { key: "wa_phone_number_id", label: "Phone Number ID", placeholder: "Phone Number ID tu Meta" },
      { key: "wa_business_account_id", label: "Business Account ID", placeholder: "WhatsApp Business Account ID" },
      { key: "access_token", label: "Access Token", placeholder: "Permanent Access Token" },
    ],
  },
};

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  channel_id: string;
  channel_name: string | null;
  status: string;
  is_active: boolean;
  webhook_verified: boolean;
  auto_reply_enabled: boolean;
  auto_reply_message: string | null;
  access_token: string | null;
  refresh_token: string | null;
  total_conversations: number;
  total_messages: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: "Dang hoat dong", color: "text-green-600", icon: <CheckCircle className="w-4 h-4" /> },
  DISCONNECTED: { label: "Mat ket noi", color: "text-red-600", icon: <AlertCircle className="w-4 h-4" /> },
  PENDING: { label: "Cho ket noi", color: "text-yellow-600", icon: <Clock className="w-4 h-4" /> },
  EXPIRED: { label: "Token het han", color: "text-orange-600", icon: <AlertCircle className="w-4 h-4" /> },
};

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchChannels();
  }, [router]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Channel[] }>("/crm/chat/channels");
      setChannels(res.items);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!selectedType || !formData.name || !formData.channel_id) {
      alert("Vui long dien day du thong tin");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/crm/chat/channels", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          channel_type: selectedType,
          channel_id: formData.channel_id,
          access_token: formData.access_token,
          refresh_token: formData.refresh_token,
          auto_reply_enabled: true,
        }),
      });
      setShowAddModal(false);
      setSelectedType(null);
      setFormData({});
      fetchChannels();
    } catch (error) {
      console.error("Failed to add channel:", error);
      alert("Khong the them kenh. Vui long thu lai.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Ban co chac muon xoa kenh nay?")) return;

    try {
      await apiFetch(`/crm/chat/channels/${channelId}`, { method: "DELETE" });
      fetchChannels();
    } catch (error) {
      console.error("Failed to delete channel:", error);
      alert("Khong the xoa kenh. Vui long thu lai.");
    }
  };

  const openEditModal = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      access_token: channel.access_token || "",
      refresh_token: channel.refresh_token || "",
      auto_reply_message: channel.auto_reply_message || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel) return;

    setSaving(true);
    try {
      await apiFetch(`/crm/chat/channels/${editingChannel.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          access_token: formData.access_token || null,
          refresh_token: formData.refresh_token || null,
          auto_reply_enabled: formData.auto_reply_enabled !== "false",
          auto_reply_message: formData.auto_reply_message || null,
        }),
      });
      setShowEditModal(false);
      setEditingChannel(null);
      setFormData({});
      fetchChannels();
    } catch (error) {
      console.error("Failed to update channel:", error);
      alert("Khong the cap nhat kenh. Vui long thu lai.");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = (channelType: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000";
    const webhookUrl = `${baseUrl}/api/v1/crm/chat/webhook/${channelType.toLowerCase()}`;
    navigator.clipboard.writeText(webhookUrl);
    alert("Da copy Webhook URL");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/crm/chat"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kenh Chat</h1>
            <p className="text-gray-600 mt-1">Quan ly cac kenh ket noi Zalo, Facebook, WhatsApp</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Them kenh moi
        </button>
      </div>

      {/* Channel List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : channels.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chua co kenh nao</h3>
          <p className="text-gray-500 mb-4">
            Ket noi voi Zalo, Facebook hoac WhatsApp de bat dau nhan tin nhan tu khach hang
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Them kenh dau tien
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const config = CHANNEL_CONFIG[channel.channel_type as keyof typeof CHANNEL_CONFIG];
            const statusConfig = STATUS_CONFIG[channel.status] || STATUS_CONFIG.PENDING;
            const Icon = config?.icon || MessageSquare;

            return (
              <div key={channel.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className={`p-4 ${config?.bgColor || "bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={config?.color || "text-gray-600"}>
                        <Icon />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{channel.name}</h3>
                        <p className="text-sm text-gray-500">{config?.name || channel.channel_type}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${statusConfig.color}`}>
                      {statusConfig.icon}
                      <span className="text-xs">{statusConfig.label}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cuoc hoi thoai</span>
                    <span className="font-medium">{channel.total_conversations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tin nhan</span>
                    <span className="font-medium">{channel.total_messages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tu dong tra loi</span>
                    <span className={`${channel.auto_reply_enabled ? "text-green-600" : "text-gray-400"}`}>
                      {channel.auto_reply_enabled ? "Bat" : "Tat"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Webhook</span>
                    <span className={`${channel.webhook_verified ? "text-green-600" : "text-yellow-600"}`}>
                      {channel.webhook_verified ? "Da xac nhan" : "Chua xac nhan"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 p-3 flex justify-between">
                  <button
                    onClick={() => copyWebhookUrl(channel.channel_type)}
                    className="p-2 hover:bg-gray-100 rounded text-gray-500"
                    title="Copy Webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(channel)}
                      className="p-2 hover:bg-gray-100 rounded text-gray-500"
                      title="Cai dat"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="p-2 hover:bg-red-100 rounded text-red-500"
                      title="Xoa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedType ? `Them ${CHANNEL_CONFIG[selectedType as keyof typeof CHANNEL_CONFIG]?.name}` : "Chon loai kenh"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedType(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {!selectedType ? (
                <div className="space-y-3">
                  {Object.entries(CHANNEL_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors`}
                      >
                        <div className={config.color}>
                          <Icon />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{config.name}</div>
                          <div className="text-sm text-gray-500">{config.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ten kenh *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Zalo 9LOG, FB Page chinh"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channel ID *
                    </label>
                    <input
                      type="text"
                      value={formData.channel_id || ""}
                      onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                      placeholder={CHANNEL_CONFIG[selectedType as keyof typeof CHANNEL_CONFIG]?.fields[0]?.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {CHANNEL_CONFIG[selectedType as keyof typeof CHANNEL_CONFIG]?.fields.slice(1).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSelectedType(null);
                        setFormData({});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Quay lai
                    </button>
                    <button
                      onClick={handleAddChannel}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Dang them..." : "Them kenh"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {showEditModal && editingChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cai dat kenh</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingChannel(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ten kenh *
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="text"
                  value={formData.access_token || ""}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder="Nhap access token moi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refresh Token
                </label>
                <input
                  type="text"
                  value={formData.refresh_token || ""}
                  onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                  placeholder="Nhap refresh token moi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tu dong tra loi
                </label>
                <select
                  value={formData.auto_reply_enabled || "true"}
                  onChange={(e) => setFormData({ ...formData, auto_reply_enabled: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Bat</option>
                  <option value="false">Tat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Noi dung tra loi tu dong
                </label>
                <textarea
                  value={formData.auto_reply_message || ""}
                  onChange={(e) => setFormData({ ...formData, auto_reply_message: e.target.value })}
                  placeholder="VD: Cam on ban da lien he. Chung toi se phan hoi trong it phut."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000"}/api/v1/crm/chat/webhook/${editingChannel.channel_type.toLowerCase()}`}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600"
                  />
                  <button
                    onClick={() => copyWebhookUrl(editingChannel.channel_type)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dien URL nay vao phan cai dat webhook cua {editingChannel.channel_type}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingChannel(null);
                  setFormData({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Huy
              </button>
              <button
                onClick={handleUpdateChannel}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Dang luu..." : "Luu thay doi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

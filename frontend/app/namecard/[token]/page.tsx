"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Phone, Mail, Building2, Download, QrCode, Globe, User, MessageCircle, Linkedin, ExternalLink } from "lucide-react";

type NameCardData = {
  employee: {
    full_name: string;
    employee_code: string;
    avatar_url?: string;
    phone?: string;
    email?: string;
  };
  organization: {
    department?: { id: string; name: string };
    position?: { id: string; name: string };
    branch?: { id: string; name: string };
  };
  company: {
    name?: string;
    logo_url?: string;
    tagline?: string;
    website?: string;
  };
  social?: {
    zalo?: string;
    facebook?: string;
    linkedin?: string;
    website?: string;
  };
  theme: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    layout: string;
    show_company_logo: boolean;
    show_qr_code: boolean;
  };
  qr_code_url?: string;
};

// Facebook icon component (lucide doesn't have exact FB icon)
const FacebookIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Zalo icon component
const ZaloIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 48 48" fill="currentColor" className={className} style={style}>
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm-1.278 30.5H12.5v-2.606h7.056l-7.5-9.444v-2.094h10.611v2.611h-6.833l7.389 9.278v2.255h-.5zm8.778-3.722c-1.056.889-2.389 1.333-4 1.333-1.722 0-3.111-.5-4.167-1.5-.611-.556-1-1.278-1.167-2.167l2.889-.444c.111.556.389.944.833 1.222.444.278 1 .389 1.611.389.667 0 1.167-.111 1.5-.389.333-.222.5-.556.5-.944 0-.333-.167-.611-.5-.833-.333-.167-.889-.333-1.611-.5l-1.333-.333c-1.111-.278-1.944-.667-2.5-1.222-.556-.5-.833-1.222-.833-2.111 0-.833.222-1.5.667-2.056.444-.5 1.056-.889 1.833-1.167.778-.222 1.611-.333 2.556-.333 1.5 0 2.722.333 3.611 1.056.889.667 1.444 1.556 1.611 2.722l-2.889.389c-.111-.5-.389-.889-.778-1.167-.389-.278-.944-.389-1.611-.389-.611 0-1.056.111-1.389.333-.333.222-.5.5-.5.889 0 .333.167.611.5.778.333.222.833.389 1.556.5l1.333.333c1.167.278 2.056.667 2.667 1.222.611.5.889 1.222.889 2.111 0 .889-.278 1.667-.833 2.278z"/>
  </svg>
);

export default function NameCardPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<NameCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCard() {
      try {
        const res = await fetch(`/api/v1/public/namecard/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Name card không tồn tại hoặc đã bị vô hiệu hóa");
          } else if (res.status === 403) {
            setError("Name card này không khả dụng");
          } else {
            setError("Không thể tải thông tin");
          }
          return;
        }
        const cardData = await res.json();
        setData(cardData);
      } catch {
        setError("Lỗi kết nối");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchCard();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Không tìm thấy</h1>
          <p className="text-white/60">{error || "Name card không tồn tại"}</p>
        </div>
      </div>
    );
  }

  const { employee, organization, company, social, theme } = data;

  // Get initials for avatar fallback
  const initials = employee.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Check if there are any social links
  const hasSocialLinks = social && (social.zalo || social.facebook || social.linkedin || social.website);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)`,
      }}
    >
      {/* Card Container */}
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: theme.background_color }}
        >
          {/* Header Section */}
          <div
            className="relative pt-16 pb-20 px-6 text-center"
            style={{
              background: `linear-gradient(180deg, ${theme.accent_color}22 0%, transparent 100%)`,
            }}
          >
            {/* Company Logo */}
            {company.logo_url && theme.show_company_logo && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <img
                  src={company.logo_url}
                  alt={company.name || "Company"}
                  className="h-8 object-contain opacity-60"
                />
              </div>
            )}

            {/* Avatar */}
            <div className="relative inline-block">
              <div
                className="w-32 h-32 rounded-full border-4 overflow-hidden shadow-xl"
                style={{ borderColor: theme.accent_color }}
              >
                {employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{
                      backgroundColor: theme.accent_color,
                      color: theme.background_color,
                    }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Status dot */}
              <div
                className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 bg-green-500"
                style={{ borderColor: theme.background_color }}
              />
            </div>

            {/* Name & Title */}
            <h1
              className="mt-5 text-2xl font-bold"
              style={{ color: theme.text_color }}
            >
              {employee.full_name}
            </h1>

            {organization.position && (
              <p
                className="mt-1 text-lg font-medium"
                style={{ color: theme.accent_color }}
              >
                {organization.position.name}
              </p>
            )}

            {organization.department && (
              <p className="mt-1 text-sm opacity-60" style={{ color: theme.text_color }}>
                {organization.department.name}
              </p>
            )}
          </div>

          {/* Contact Info */}
          <div className="px-6 pb-6 space-y-3">
            {employee.phone && (
              <a
                href={`tel:${employee.phone}`}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.accent_color}10`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.accent_color }}
                >
                  <Phone className="w-5 h-5" style={{ color: theme.background_color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs opacity-50" style={{ color: theme.text_color }}>
                    Điện thoại
                  </p>
                  <p className="font-semibold" style={{ color: theme.text_color }}>
                    {employee.phone}
                  </p>
                </div>
              </a>
            )}

            {employee.email && (
              <a
                href={`mailto:${employee.email}`}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.accent_color}10`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.accent_color }}
                >
                  <Mail className="w-5 h-5" style={{ color: theme.background_color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs opacity-50" style={{ color: theme.text_color }}>
                    Email
                  </p>
                  <p className="font-semibold" style={{ color: theme.text_color }}>
                    {employee.email}
                  </p>
                </div>
              </a>
            )}

            {organization.branch && (
              <div
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  backgroundColor: `${theme.accent_color}10`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.accent_color }}
                >
                  <Building2 className="w-5 h-5" style={{ color: theme.background_color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs opacity-50" style={{ color: theme.text_color }}>
                    Chi nhánh
                  </p>
                  <p className="font-semibold" style={{ color: theme.text_color }}>
                    {organization.branch.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Social Links Section */}
          {hasSocialLinks && (
            <div
              className="px-6 pb-6 pt-2 border-t"
              style={{ borderColor: `${theme.text_color}10` }}
            >
              <p className="text-xs opacity-50 mb-3" style={{ color: theme.text_color }}>
                Kết nối
              </p>
              <div className="flex gap-3 flex-wrap">
                {social?.zalo && (
                  <a
                    href={`https://zalo.me/${social.zalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                    style={{ backgroundColor: "#0068FF", color: "white" }}
                  >
                    <ZaloIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Zalo</span>
                  </a>
                )}

                {social?.facebook && (
                  <a
                    href={social.facebook.startsWith("http") ? social.facebook : `https://facebook.com/${social.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                    style={{ backgroundColor: "#1877F2", color: "white" }}
                  >
                    <FacebookIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Facebook</span>
                  </a>
                )}

                {social?.linkedin && (
                  <a
                    href={social.linkedin.startsWith("http") ? social.linkedin : `https://linkedin.com/in/${social.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                    style={{ backgroundColor: "#0A66C2", color: "white" }}
                  >
                    <Linkedin className="w-5 h-5" />
                    <span className="text-sm font-medium">LinkedIn</span>
                  </a>
                )}

                {social?.website && (
                  <a
                    href={social.website.startsWith("http") ? social.website : `https://${social.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                    style={{ backgroundColor: theme.accent_color, color: theme.background_color }}
                  >
                    <Globe className="w-5 h-5" />
                    <span className="text-sm font-medium">Website</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Company Section */}
          <div
            className="px-6 py-5 border-t"
            style={{ borderColor: `${theme.text_color}10` }}
          >
            <div className="flex items-center justify-between">
              <div>
                {company.name && (
                  <p className="font-bold" style={{ color: theme.text_color }}>
                    {company.name}
                  </p>
                )}
                {company.tagline && (
                  <p className="text-sm opacity-60" style={{ color: theme.text_color }}>
                    {company.tagline}
                  </p>
                )}
              </div>

              {company.website && (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl transition-all hover:scale-110"
                  style={{ backgroundColor: `${theme.accent_color}20` }}
                >
                  <Globe className="w-5 h-5" style={{ color: theme.accent_color }} />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-2 flex gap-3">
            <a
              href={`/api/v1/public/namecard/${token}/vcard`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: theme.accent_color,
                color: theme.background_color,
              }}
            >
              <Download className="w-5 h-5" />
              Lưu liên hệ
            </a>

            {theme.show_qr_code && (
              <button
                className="p-3 rounded-xl transition-all hover:scale-110"
                style={{
                  backgroundColor: `${theme.accent_color}20`,
                  color: theme.accent_color,
                }}
                onClick={() => {
                  // Show QR code modal or share link
                  navigator.share?.({
                    title: employee.full_name,
                    url: window.location.href,
                  });
                }}
              >
                <QrCode className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm opacity-40 text-white">
          Powered by 9log.tech
        </p>
      </div>
    </div>
  );
}

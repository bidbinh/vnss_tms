"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  User,
  Building2,
  UserCircle,
  Upload,
  FileText,
  Image,
  Trash2,
  Tag,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface AttachmentPreview {
  file: File;
  preview?: string;
  type: "image" | "document";
}

const PRIORITIES = [
  { value: "LOW", label: "Thấp", color: "bg-gray-100 text-gray-600" },
  { value: "NORMAL", label: "Bình thường", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", label: "Cao", color: "bg-orange-100 text-orange-600" },
  { value: "URGENT", label: "Khẩn cấp", color: "bg-red-100 text-red-600" },
];

const SCOPES = [
  { value: "COMPANY", label: "Công ty", icon: Building2, description: "Công việc liên quan đến công ty" },
  { value: "PERSONAL", label: "Cá nhân", icon: UserCircle, description: "Việc riêng cá nhân" },
];

const SUGGESTED_TAGS = [
  { value: "urgent", label: "Gấp", color: "bg-red-100 text-red-700" },
  { value: "review", label: "Review", color: "bg-purple-100 text-purple-700" },
  { value: "meeting", label: "Họp", color: "bg-blue-100 text-blue-700" },
  { value: "report", label: "Báo cáo", color: "bg-green-100 text-green-700" },
  { value: "follow-up", label: "Theo dõi", color: "bg-yellow-100 text-yellow-700" },
  { value: "approval", label: "Phê duyệt", color: "bg-orange-100 text-orange-700" },
];

export default function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("COMPANY");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Dropdown states
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showWatcherDropdown, setShowWatcherDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [watcherSearch, setWatcherSearch] = useState("");

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const data = await apiFetch<{ items: UserOption[] }>("/my-tasks/users");
        setUsers(data.items || []);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on search - exclude users already selected in the other field
  const filteredAssignees = users.filter(
    (u) =>
      !watchers.includes(u.id) && // Exclude users already in watchers
      (u.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(assigneeSearch.toLowerCase()))
  );

  const filteredWatchers = users.filter(
    (u) =>
      !assignees.includes(u.id) && // Exclude users already in assignees
      (u.full_name.toLowerCase().includes(watcherSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(watcherSearch.toLowerCase()))
  );

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentPreview[] = [];

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const attachment: AttachmentPreview = {
        file,
        type: isImage ? "image" : "document",
      };

      if (isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview!);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  // Toggle assignee
  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Toggle watcher
  const toggleWatcher = (userId: string) => {
    setWatchers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Add custom tag
  const addCustomTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setNewTag("");
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề task");
      return;
    }

    try {
      setLoading(true);

      // Build payload
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        scope,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      // Assignees - use first one as primary, rest as watchers
      if (assignees.length > 0) {
        payload.assigned_to_id = assignees[0];
        const primaryAssignee = users.find((u) => u.id === assignees[0]);
        if (primaryAssignee) {
          payload.assigned_to_name = primaryAssignee.full_name;
        }
      }

      // All selected users as watchers
      const allWatchers = [...new Set([...assignees.slice(1), ...watchers])];
      if (allWatchers.length > 0) {
        payload.watchers_json = JSON.stringify(allWatchers);
      }

      // Tags
      if (tags.length > 0) {
        payload.tags_json = JSON.stringify(tags);
      }

      // Attachments - store as JSON for now (file upload can be done separately)
      if (attachments.length > 0) {
        const attachmentData = attachments.map((att) => ({
          name: att.file.name,
          size: att.file.size,
          type: att.file.type,
        }));
        payload.attachments_json = JSON.stringify(attachmentData);
      }

      await apiFetch("/my-tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Đã tạo task mới");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo task");
    } finally {
      setLoading(false);
    }
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get selected users display
  const getSelectedUsers = (ids: string[]) => {
    return ids.map((id) => users.find((u) => u.id === id)).filter(Boolean) as UserOption[];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Tạo task mới</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề công việc..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết công việc..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Đính kèm
            </label>

            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click để chọn file hoặc kéo thả vào đây</p>
              <p className="text-xs text-gray-400 mt-1">Hỗ trợ: Ảnh, PDF, Word, Excel...</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="relative group border rounded-lg p-2 flex items-center gap-2"
                  >
                    {att.type === "image" && att.preview ? (
                      <img
                        src={att.preview}
                        alt={att.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{att.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(att.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>

            {/* Suggested tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    tags.includes(tag.value)
                      ? `${tag.color} ring-2 ring-offset-1 ring-current`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                placeholder="Thêm tag mới..."
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!newTag.trim()}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Thêm
              </button>
            </div>

            {/* Selected custom tags */}
            {tags.filter((t) => !SUGGESTED_TAGS.find((st) => st.value === t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags
                  .filter((t) => !SUGGESTED_TAGS.find((st) => st.value === t))
                  .map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Two columns for scope and priority */}
          <div className="grid grid-cols-2 gap-4">
            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phạm vi</label>
              <div className="space-y-2">
                {SCOPES.map((s) => {
                  const Icon = s.icon;
                  const isSelected = scope === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setScope(s.value)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Độ ưu tiên</label>
              <div className="space-y-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                      priority === p.value
                        ? `${p.color} ring-2 ring-offset-1 ring-current`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              Deadline
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Assignees - Multi-select */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              Giao cho
            </label>

            {/* Selected assignees */}
            <div
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className="w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer flex flex-wrap gap-1.5 items-center hover:border-blue-400"
            >
              {assignees.length === 0 ? (
                <span className="text-gray-400 text-sm">Chọn người thực hiện...</span>
              ) : (
                getSelectedUsers(assignees).map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    <span className="w-4 h-4 bg-blue-500 text-white rounded-full text-[10px] flex items-center justify-center">
                      {getInitials(user.full_name)}
                    </span>
                    {user.full_name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssignee(user.id);
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </div>

            {/* Dropdown - positioned above to avoid being cut off */}
            {showAssigneeDropdown && (
              <div className="absolute z-20 w-full bottom-full mb-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Tìm kiếm..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {loadingUsers ? (
                    <p className="text-sm text-gray-500 p-3">Đang tải...</p>
                  ) : filteredAssignees.length === 0 ? (
                    <p className="text-sm text-gray-500 p-3">Không tìm thấy</p>
                  ) : (
                    filteredAssignees.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAssignee(user.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                      >
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {getInitials(user.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        {assignees.includes(user.id) && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Watchers - Multi-select */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Người theo dõi
            </label>

            {/* Selected watchers */}
            <div
              onClick={() => setShowWatcherDropdown(!showWatcherDropdown)}
              className="w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer flex flex-wrap gap-1.5 items-center hover:border-blue-400"
            >
              {watchers.length === 0 ? (
                <span className="text-gray-400 text-sm">Chọn người theo dõi...</span>
              ) : (
                getSelectedUsers(watchers).map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                  >
                    <span className="w-4 h-4 bg-gray-500 text-white rounded-full text-[10px] flex items-center justify-center">
                      {getInitials(user.full_name)}
                    </span>
                    {user.full_name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatcher(user.id);
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </div>

            {/* Dropdown - positioned above to avoid being cut off */}
            {showWatcherDropdown && (
              <div className="absolute z-20 w-full bottom-full mb-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={watcherSearch}
                      onChange={(e) => setWatcherSearch(e.target.value)}
                      placeholder="Tìm kiếm..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {loadingUsers ? (
                    <p className="text-sm text-gray-500 p-3">Đang tải...</p>
                  ) : filteredWatchers.length === 0 ? (
                    <p className="text-sm text-gray-500 p-3">Không tìm thấy</p>
                  ) : (
                    filteredWatchers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleWatcher(user.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                      >
                        <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {getInitials(user.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        {watchers.includes(user.id) && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang tạo..." : "Tạo task"}
          </button>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showAssigneeDropdown || showWatcherDropdown) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => {
            setShowAssigneeDropdown(false);
            setShowWatcherDropdown(false);
          }}
        />
      )}
    </div>
  );
}

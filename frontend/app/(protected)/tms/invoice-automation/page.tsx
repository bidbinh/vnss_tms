"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Building2,
  Receipt,
  Package,
  Upload,
  Image as ImageIcon,
  X,
  Camera,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000";

interface Depot {
  code: string;
  name: string;
  url: string;
  description: string;
}

interface Job {
  job_id: string;
  depot_code: string;
  receipt_number: string;
  container_code: string;
  status: string;
  message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface OCRResult {
  success: boolean;
  receipt_number: string | null;
  container_code: string | null;
  depot_code: string | null;
  amount: string | null;
  raw_text: string | null;
  message: string | null;
}

export default function InvoiceAutomationPage() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [containerCode, setContainerCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available depots
  useEffect(() => {
    fetchDepots();
    fetchJobs();
  }, []);

  // Auto-refresh jobs every 5 seconds if there are running jobs
  useEffect(() => {
    const hasRunningJobs = jobs.some(j => j.status === "running" || j.status === "pending");
    if (hasRunningJobs) {
      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [jobs]);

  const fetchDepots = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/v1/invoice-automation/depots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDepots(data);
        if (data.length > 0) {
          setSelectedDepot(data[0].code);
        }
      }
    } catch (e) {
      console.error("Failed to fetch depots", e);
    }
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/v1/invoice-automation/jobs?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setOcrResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    setError(null);
    setOcrResult(null);

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", selectedImage);

      const res = await fetch(`${API_BASE}/api/v1/invoice-automation/ocr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data: OCRResult = await res.json();
      setOcrResult(data);

      if (data.success) {
        // Auto-fill form with extracted data
        if (data.receipt_number) setReceiptNumber(data.receipt_number);
        if (data.container_code) setContainerCode(data.container_code);
        if (data.depot_code) setSelectedDepot(data.depot_code);
        setSuccessMessage("OCR completed! Data has been auto-filled.");
      } else {
        setError(data.message || "OCR failed");
      }
    } catch (e) {
      setError("Failed to process image");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedDepot || !receiptNumber || !containerCode) {
      setError("Vui long dien day du thong tin");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/v1/invoice-automation/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          depot_code: selectedDepot,
          receipt_number: receiptNumber,
          container_code: containerCode,
        }),
      });

      if (res.ok) {
        const job = await res.json();
        setSuccessMessage(`Job ${job.job_id} da duoc tao. Dang xu ly...`);
        setReceiptNumber("");
        setContainerCode("");
        clearImage();
        fetchJobs();
      } else {
        const err = await res.json();
        setError(err.detail || "Co loi xay ra");
      }
    } catch (e) {
      setError("Khong the ket noi den server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoan thanh";
      case "failed":
        return "That bai";
      case "running":
        return "Dang chay";
      default:
        return "Dang cho";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedDepotInfo = depots.find(d => d.code === selectedDepot);

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Invoice Automation
          </h1>
          <p className="text-gray-500 mt-1">
            Tu dong lay hoa don VAT tu cac depot - Ho tro upload anh phieu thu
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Image Upload Section */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Upload anh phieu thu
              </h2>

              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    imagePreview ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Receipt preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage();
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Click de chon anh hoac keo tha vao day
                      </p>
                      <p className="text-xs text-gray-400">
                        Ho tro: JPG, PNG (max 5MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* OCR Button */}
                {selectedImage && (
                  <button
                    onClick={handleImageUpload}
                    disabled={isUploading}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Dang doc anh...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Doc thong tin tu anh (OCR)
                      </>
                    )}
                  </button>
                )}

                {/* OCR Result */}
                {ocrResult && (
                  <div className={`p-4 rounded-lg ${ocrResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <h4 className={`font-medium mb-2 ${ocrResult.success ? "text-green-800" : "text-red-800"}`}>
                      {ocrResult.success ? "Ket qua OCR:" : "Loi:"}
                    </h4>
                    {ocrResult.success ? (
                      <div className="text-sm space-y-1 text-green-700">
                        <p>So phieu thu: <strong>{ocrResult.receipt_number || "Khong tim thay"}</strong></p>
                        <p>So container: <strong>{ocrResult.container_code || "Khong tim thay"}</strong></p>
                        <p>Depot: <strong>{ocrResult.depot_code || "Khong xac dinh"}</strong></p>
                        {ocrResult.amount && <p>So tien: <strong>{ocrResult.amount} VND</strong></p>}
                      </div>
                    ) : (
                      <p className="text-sm text-red-700">{ocrResult.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Manual Form Section */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Thong tin hoa don
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Depot Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depot
                  </label>
                  <select
                    value={selectedDepot}
                    onChange={(e) => setSelectedDepot(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {depots.map((depot) => (
                      <option key={depot.code} value={depot.code}>
                        {depot.name} ({depot.code})
                      </option>
                    ))}
                  </select>
                  {selectedDepotInfo && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedDepotInfo.description}
                    </p>
                  )}
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Receipt className="w-4 h-4 inline mr-1" />
                    So phieu thu
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="VD: NH5932291"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Container Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    So container
                  </label>
                  <input
                    type="text"
                    value={containerCode}
                    onChange={(e) => setContainerCode(e.target.value.toUpperCase())}
                    placeholder="VD: JXLU6143159"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {successMessage}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dang xu ly...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Tao hoa don
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Jobs History Section */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Lich su yeu cau
              </h2>
              <button
                onClick={fetchJobs}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Lam moi"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chua co yeu cau nao
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <div>
                          <div className="font-medium text-sm">
                            {job.receipt_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            {job.container_code} | {job.depot_code}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    {job.message && (
                      <div
                        className={`mt-2 text-xs p-2 rounded ${
                          job.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {job.message}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Guide */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Huong dan</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Upload anh phieu thu de tu dong doc thong tin</li>
                <li>2. Hoac nhap thu cong so phieu thu va container</li>
                <li>3. Bam "Tao hoa don" va doi ket qua</li>
                <li>4. Hoa don se duoc gui ve email dang ky</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Available Depots Info */}
        <div className="mt-6 bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Depot ho tro
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {depots.map((depot) => (
              <div
                key={depot.code}
                className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium">{depot.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Code: {depot.code}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {depot.description}
                </div>
                <a
                  href={depot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-2 block"
                >
                  {depot.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

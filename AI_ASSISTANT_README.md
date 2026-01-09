# 🤖 AI Assistant - Hướng dẫn sử dụng

## Tổng quan

AI Assistant là tính năng trợ lý AI thông minh giúp tự động tạo đơn hàng từ tin nhắn hoặc hình ảnh. Sử dụng Claude AI để phân tích và trích xuất thông tin.

## Tính năng chính

### 1. **Text-to-Order** 📝
Paste tin nhắn booking từ Zalo/Telegram/WhatsApp → AI tự động tạo đơn hàng

**Ví dụ:**
```
ĐÓNG KHO LIVABIN
GIAO CTY MÀNG BV ĐÔNG Á:
- ĐỊA CHỈ: NGỌC LÃNG, NGỌC LÂM, MỸ HÀO, HƯNG YÊN
- NGƯỜI NHẬN: C GẤM - 0961636730
- TRƯỚC 9H SÁNG NGÀY 22/12/2025
- CHỜ TIỀN MỚI HẠ HÀNG
LLDPE-SA CD18N (24.75T KIỆN)
```

AI sẽ trích xuất:
- ✅ Điểm đón: KHO LIVABIN
- ✅ Điểm giao: CTY MÀNG BV ĐÔNG Á, Ngọc Lãng, Ngọc Lâm, Mỹ Hào, Hưng Yên
- ✅ Người nhận: C Gấm - 0961636730
- ✅ Thời gian: 22/12/2025 trước 9h sáng
- ✅ Hàng hóa: LLDPE-SA CD18N, 24.75 tấn kiện
- ✅ Ghi chú: Chờ tiền mới hạ hàng

### 2. **Image-to-Order** 📷
Upload ảnh POD/booking → AI đọc và trích xuất thông tin

Hỗ trợ:
- Ảnh POD (Proof of Delivery)
- Ảnh booking note
- Ảnh chụp màn hình tin nhắn
- Ảnh giấy tờ vận chuyển

### 3. **Smart Suggestions** 💡
AI gợi ý:
- Tài xế phù hợp cho tuyến đường
- Xe phù hợp dựa trên trọng tải
- Thời gian giao hàng hợp lý

## Cài đặt

### Bước 1: Lấy API Key

**Gemini (Khuyên dùng - Rẻ hơn ~40x):**
1. Truy cập: https://aistudio.google.com/app/apikey
2. Tạo API Key mới
3. Copy API key (dạng: `AIzaSy...`)

**Claude (Anthropic):**
1. Truy cập: https://console.anthropic.com/settings/keys
2. Tạo API Key mới
3. Copy API key (dạng: `sk-ant-api03-...`)

### Bước 2: Cấu hình qua Admin UI (Khuyên dùng)

1. Đăng nhập với tài khoản Super Admin
2. Vào **Admin > AI Settings** (`/admin/ai-settings`)
3. Click vào provider (Gemini/Claude/OpenAI)
4. Nhập API Key và click **Test Connection**
5. Bật **Enabled** và **Save**

> **Lưu ý**: API keys giờ được lưu trong database, không cần cấu hình `.env`

### Bước 3: Cài đặt dependencies (nếu chưa có)

```bash
cd backend
pip install anthropic google-generativeai openai
```

### Bước 4: Restart backend

```bash
cd backend
.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Cách sử dụng

### 1. Truy cập AI Assistant

- Vào menu sidebar → Click "🤖 AI Assistant"
- Hoặc truy cập: `/ai-assistant`

### 2. Gửi tin nhắn

**Cách 1: Paste text**
1. Copy tin nhắn booking từ Zalo/Telegram
2. Paste vào ô chat
3. Enter để gửi

**Cách 2: Upload ảnh**
1. Click icon 📷
2. Chọn ảnh POD/booking
3. AI sẽ tự động đọc ảnh

**Cách 3: Kết hợp text + ảnh**
1. Chọn ảnh
2. Nhập thêm ghi chú (nếu cần)
3. Gửi

### 3. Kiểm tra kết quả

AI sẽ hiển thị:
- ✅ Thông tin đã trích xuất
- 📊 Độ tin cậy (confidence score)
- 💡 Gợi ý bước tiếp theo

### 4. Tạo đơn hàng

Click nút **"✅ Tạo đơn hàng"** để lưu vào hệ thống

## API Endpoints

### POST `/api/v1/ai-assistant/parse-message`

Parse tin nhắn và trích xuất thông tin

**Request:**
```json
{
  "message": "ĐÓNG KHO LIVABIN\nGIAO CTY MÀNG BV ĐÔNG Á...",
  "image": "base64_encoded_image_data",
  "image_type": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "order_data": {
    "pickup": {
      "location": "KHO LIVABIN",
      "address": "...",
      "date": "2025-12-22"
    },
    "delivery": {
      "company_name": "CTY MÀNG BV ĐÔNG Á",
      "address": "NGỌC LÃNG, NGỌC LÂM, MỸ HÀO, HƯNG YÊN",
      "contact_name": "C GẤM",
      "contact_phone": "0961636730",
      "instructions": "CHỜ TIỀN MỚI HẠ HÀNG"
    },
    "cargo": {
      "description": "LLDPE-SA CD18N",
      "weight_tons": 24.75,
      "unit": "kiện"
    }
  },
  "confidence": 0.95
}
```

### POST `/api/v1/ai-assistant/create-order`

Tạo đơn hàng từ dữ liệu AI

**Request:**
```json
{
  "order_data": { /* data from parse-message */ },
  "auto_create": true
}
```

### POST `/api/v1/ai-assistant/upload-pod`

Upload ảnh POD

**Form data:**
- `file`: Image file (multipart/form-data)

## Tips & Tricks

### ✅ Làm sao để AI chính xác hơn?

1. **Cung cấp đầy đủ thông tin**:
   - Địa chỉ đầy đủ (số nhà, đường, xã, huyện, tỉnh)
   - Số điện thoại đầy đủ 10 số
   - Ngày giờ cụ thể

2. **Format rõ ràng**:
   ```
   ĐÓNG: [Tên kho]
   GIAO: [Tên công ty]
   ĐỊA CHỈ: [Địa chỉ đầy đủ]
   NGƯỜI NHẬN: [Tên - SĐT]
   HÀNG HÓA: [Mô tả - Trọng lượng]
   ```

3. **Ảnh rõ nét**:
   - Độ phân giải tốt
   - Không bị mờ/nhòe
   - Đủ ánh sáng

### ⚠️ Lưu ý

- AI có thể nhầm với địa chỉ phức tạp → **Luôn kiểm tra trước khi tạo đơn**
- Confidence < 80% → Nên xem xét kỹ
- Thiếu thông tin → AI sẽ để trống, bạn điền thủ công

### 🚀 Shortcuts

- `Enter`: Gửi tin nhắn
- `Shift + Enter`: Xuống dòng
- `Ctrl + V`: Paste (text hoặc ảnh)
- Kéo thả ảnh: Drag & drop ảnh vào chat

## Troubleshooting

### Lỗi: "API key not configured"

**Nguyên nhân**: Chưa cấu hình API key

**Giải pháp**:
1. Vào **Admin > AI Settings** (`/admin/ai-settings`)
2. Cấu hình API key cho Gemini hoặc Claude
3. Test connection và bật Enabled

### Lỗi: "Invalid token" hoặc 401

**Nguyên nhân**: API key không đúng hoặc hết hạn

**Giải pháp**:
1. Kiểm tra API key tại console của provider
2. Tạo API key mới nếu cần
3. Cập nhật trong **Admin > AI Settings**

### AI trả về kết quả sai

**Nguyên nhân**: Tin nhắn không rõ ràng hoặc thiếu thông tin

**Giải pháp**:
1. Format lại tin nhắn rõ ràng hơn
2. Thêm chi tiết cụ thể
3. Hoặc nhập thủ công phần bị sai

### Upload ảnh bị lỗi

**Nguyên nhân**: File quá lớn hoặc format không hỗ trợ

**Giải pháp**:
1. Compress ảnh (< 5MB)
2. Dùng format: JPG, PNG, WebP
3. Đảm bảo ảnh rõ nét

## Chi phí

### Gemini Flash 2.0 (Khuyên dùng)
- Input tokens: **$0.075 / 1M tokens**
- Output tokens: **$0.30 / 1M tokens**

**Ước tính**:
- 1 tin nhắn booking: ~500-1000 tokens = **~$0.0001 - $0.0003** (gần như miễn phí!)
- 1 ảnh POD: ~1000-2000 tokens = **~$0.0003 - $0.0006**

### Claude Sonnet
- Input tokens: $3 / 1M tokens
- Output tokens: $15 / 1M tokens

**So sánh**: Gemini rẻ hơn **~40x** so với Claude!

→ Rất rẻ so với lợi ích tiết kiệm thời gian!

## Roadmap

### v1.1 (Next)
- [ ] Voice input (nói để tạo đơn)
- [ ] Multi-language support
- [ ] Export chat history
- [ ] AI suggestions cho pricing

### v1.2 (Future)
- [ ] WhatsApp Bot integration
- [ ] Zalo Bot integration
- [ ] Auto-assign driver
- [ ] Predictive routing

## Support

Có câu hỏi? Liên hệ:
- GitHub Issues: [vnss_tms/issues](https://github.com/vnss/tms/issues)
- Email: support@vnss.com

---

**Phát triển bởi**: VNSS Team
**Sử dụng**: Claude AI (Anthropic)
**License**: MIT

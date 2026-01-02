# Hướng dẫn Import Fuel Logs từ Excel

## File mẫu

File Excel template đã được tạo tại: `backend/fuel_logs_template.xlsx`

## Định dạng file Excel

File Excel phải có các cột theo đúng thứ tự sau (dòng đầu tiên là header):

| Cột | Tên cột | Kiểu dữ liệu | Bắt buộc | Ví dụ |
|-----|---------|--------------|----------|-------|
| 1 | Ngày | Date hoặc Text | Có | 2024-01-07 hoặc 07/01/2024 |
| 2 | Số xe | Text | Có | 50E-482.52 |
| 3 | Tài xế | Text | Có | Nguyễn Văn Tuyến |
| 4 | Chỉ số đồng hồ Km xe | Number | Có | 129470 |
| 5 | Đổ thực tế | Number | Có | 250.67 |
| 6 | Đơn giá | Number | Có | 18750 |
| 7 | Tổng tiền | Number | Có | 4700006 |
| 8 | Ghi chú | Text | Không | Xe đổ dầu ngoài |
| 9 | Trạng thái thanh toán | Text | Không | PAID hoặc UNPAID |

## Lưu ý quan trọng

### 1. Xe và tài xế phải tồn tại trong hệ thống
- **Biển số xe** phải khớp chính xác với xe đã tạo trong trang Vehicles
- **Tên tài xế** phải khớp chính xác với tên đã tạo trong trang Drivers
- Nếu xe hoặc tài xế không tồn tại, dòng đó sẽ bị bỏ qua

### 2. Định dạng ngày
Hệ thống hỗ trợ 3 định dạng ngày:
- `YYYY-MM-DD` (khuyến nghị): 2024-01-07
- `DD/MM/YYYY`: 07/01/2024
- `MM/DD/YYYY`: 01/07/2024

### 3. Trùng lặp
Hệ thống tự động bỏ qua các bản ghi trùng lặp dựa trên:
- Xe (vehicle_id)
- Ngày (date)
- Số km (odometer_km)

### 4. Trạng thái thanh toán
- Nếu để trống hoặc không điền, mặc định là `UNPAID`
- Chỉ chấp nhận: `PAID` hoặc `UNPAID`

## Cách import

1. Mở trang **Fuel Logs** trong hệ thống
2. Click nút **"📁 Import Excel"**
3. Chọn file Excel (.xlsx hoặc .xls)
4. Hệ thống sẽ hiển thị kết quả:
   - Số dòng đã import thành công
   - Số dòng bị bỏ qua (trùng lặp hoặc lỗi)
   - Danh sách lỗi (tối đa 10 lỗi đầu tiên)

## Ví dụ dữ liệu

```
Ngày        | Số xe       | Tài xế              | Chỉ số đồng hồ | Đổ thực tế | Đơn giá | Tổng tiền | Ghi chú            | Trạng thái
2024-01-07  | 50E-482.52  | Nguyễn Văn Tuyến    | 129470         | 250.67     | 18750   | 4700006   | Xe đổ dầu ngoài    | PAID
2024-01-22  | 50E-482.52  | Nguyễn Văn Tuyến    | 131959         | 252.82     | 19780   | 5000780   | Xe đổ dầu ngoài    | PAID
```

## Xử lý lỗi thường gặp

### Lỗi: "Vehicle 'XXX' not found"
- **Nguyên nhân**: Biển số xe không tồn tại trong hệ thống
- **Giải pháp**: Tạo xe trong trang Vehicles trước khi import

### Lỗi: "Driver 'XXX' not found"
- **Nguyên nhân**: Tên tài xế không tồn tại trong hệ thống
- **Giải pháp**: Tạo tài xế trong trang Drivers trước khi import

### Lỗi: "Invalid date format"
- **Nguyên nhân**: Ngày không đúng định dạng
- **Giải pháp**: Sử dụng định dạng YYYY-MM-DD (ví dụ: 2024-01-07)

### Lỗi: "File must be Excel format"
- **Nguyên nhân**: File không phải định dạng Excel
- **Giải pháp**: Chỉ chấp nhận file .xlsx hoặc .xls

## Tips

1. **Kiểm tra dữ liệu trước khi import**: Đảm bảo tất cả xe và tài xế đã được tạo
2. **Import từng đợt nhỏ**: Nếu có nhiều dữ liệu, nên chia nhỏ để dễ kiểm soát lỗi
3. **Backup dữ liệu**: Nên export dữ liệu cũ trước khi import dữ liệu mới
4. **Kiểm tra sau khi import**: Vào trang Fuel Reports để xem dữ liệu đã được tính toán đúng chưa

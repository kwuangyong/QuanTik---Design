# Chạy thử Quét toàn sàn → Quant (30/10/2026)

Bản dựng dùng trực tiếp `Screener`, `AnalysisPage` và `LiveQuantReport` của main
`610c684`. Không thay component production, backend, proxy, API contract hoặc
cách tính mô hình. Preview dùng router cục bộ và bộ phản hồi tổng hợp trong bộ
nhớ; CSP chặn kết nối mạng. Không dùng làm fallback cho dữ liệu thật.

## Mở bản thử

```bash
npm ci
npm run build
npm run preview:flow
```

Mở `preview/QuanTik_Scan_Quant_Test.html` trực tiếp bằng trình duyệt, kể cả khi
offline. Font Latin/tiếng Việt và KaTeX được đóng gói trong cùng file.

1. Kích hoạt kết quả: hai nhóm 5 mã, mỗi bảng có đủ 42 cột.
2. Bấm mã: popup screening; nút Quant mở đúng mã được chọn.
3. Gửi/xác nhận yêu cầu mẫu: trạng thái chạy rồi nhận báo cáo sau lần poll kế
   tiếp (khoảng 5 giây). Xem 16 module, tooltip và biểu đồ tương tác.
4. Chọn tình huống trên đầu trang: đủ dữ liệu; chỉ screening; Quant thiếu một
   phần/chưa khả dụng/đã tắt/tính lỗi; quét chưa công bố/lỗi kết nối.

Các mã thật chỉ là nhãn để thử điều hướng. Tất cả cùng dùng một bộ số tổng hợp
theo ngày mẫu 16/10/2026; không thể so sánh hay dùng làm tín hiệu của doanh
nghiệp. Số vốn nhập vào chỉ thử thao tác gửi; kết quả cố định ở quy mô tham chiếu.
Nhóm screening có điểm phân phối khác nhau để thử bảng 5+5 nhưng cùng kết luận
Quant WATCH, minh họa rằng thứ hạng screening không thay thế Action Gate.

## Kết luận từ mã nguồn

- Nút kích hoạt quét chỉ đọc bản công bố bằng GET; không chạy engine quét.
- Thiếu enrichment Quant thì bảng 42 cột có ô —; bảng “Dữ liệu quét hiện có”
  vẫn có giá/khối lượng/điểm screening. Không lấy điểm screening lấp điểm Quant.
- Phân tích Quant tạo yêu cầu riêng, poll trạng thái rồi đọc report; không tự
  chạy khi chỉ xem bảng quét hoặc mở trang phân tích.
- Route hiện tại dùng báo cáo 16 module (`LiveQuantReport`). Component
  `SimpleQuantReport` có trong repo nhưng chưa nối vào route mặc định.
- Mẫu chỉ kiểm tra giao diện/hợp đồng phản hồi. Chưa xác minh API/VPS thật,
  quyền gói thật, chất lượng dự báo hoặc pipeline có tính đủ mô hình hay không.

## Kiểm chứng

`frontend/tests/scan-quant-preview.spec.ts` kiểm tra chính file HTML offline trên
desktop/mobile: 5+5/42 cột, giữ false, popup HPG → yêu cầu HPG → 16 module,
ARIMA có biểu đồ, chuyển tình huống thiếu/lỗi, chỉ một lần submit giả lập và
không phát request HTTP(S). Các bộ screening/Quant hiện có kiểm tra chi tiết
tooltip, 2D/3D, HMM và năm tình huống dữ liệu của từng module.

Trình duyệt local không khởi động do giới hạn sandbox. Kết quả browser phải lấy
từ CI trên đúng commit của PR nháp; không coi việc build thành công là browser
test thành công. PR nháp chỉ để chạy thử và review, chưa merge/deploy.

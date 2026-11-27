# Giao diện QuanTik

## Gốc thiết kế

Giữ Home cũ nguyên vẹn. Terminal dùng nền xanh đen của bản QuanTik hiện tại, điểm nhấn cam và màu giá theo bảng điện chứng khoán. Inter (có subset tiếng Việt) cho văn bản, menu và điều khiển; IBM Plex Mono cho số và mã. Báo cáo Quant mới dùng token `--q-*` trong `globals.css` (màu giá `--q-up/down/ref` tách khỏi màu trạng thái `--q-status-*`, đạt WCAG AA), chữ có nghĩa tối thiểu 14 px, chú thích phụ 13 px; các token này chỉ có tác dụng khi bật `NEXT_PUBLIC_QUANT_READER_V2`.

| Thành phần | Cỡ chữ |
| --- | --- |
| Tiêu đề trang | 30–32px |
| Tiêu đề nhóm | 18–20px |
| Nội dung | 15–16px |
| Nhãn/điều khiển | 14px |
| Số trong bảng điện | 14px |
| Nhãn cột bảng điện | 13px |

Không thêm ghi chú kỹ thuật lặp lại, điểm tổng hợp tự tạo hoặc thẻ chi tiết FPT dưới bảng. Trang mở đầu Quét toàn sàn bám ảnh tham chiếu: tiêu đề lớn, hình nến và kính lúp trang trí, nút quét rõ ràng.

## Luồng và bố cục

Menu chỉ gồm Dashboard, Quét toàn sàn, Phân tích Quant. Home vẫn mở từ logo và liên kết Trang chủ.

Dashboard xếp dọc: bốn chỉ số → bảng điện → nhóm ngành. Theo dõi là tab trong bảng. Bộ lọc ngành và sàn dùng chung một bảng. Ba mức giá, thống kê và nước ngoài có điều khiển bật/tắt.

Bấm mã mở dialog chart. Chart mặc định TradingView thật; Quant nằm bên cạnh, có nút mở/thu và mở toàn màn hình. Nguồn Quantik có vùng hiển thị để nối dữ liệu sau. Trên màn hình hẹp, Quant chuyển xuống dưới chart; các bảng cuộn ngang trong vùng riêng.

Quét toàn sàn ban đầu chỉ hiện trang mở đầu; bấm Quét toàn sàn mới nạp và hiện 5 mã mỗi nhóm từ dữ liệu mẫu. Xem Tiêu chí & trọng số qua nút phụ; đóng bước này không nạp kết quả. Quét lại trở về trang mở đầu. Giải thích và bảng chỉ tiêu mở/thu bằng details. Không dựng bộ nạp dữ liệu, loop hoặc thuật toán xếp hạng. Chỉ tiêu chia theo hiệu suất, mô hình, lợi nhuận/chi phí, rủi ro T+2, dữ liệu/thanh khoản và kế hoạch. Trọng số ví dụ lấy từ demo.json, không phải hệ số của hệ thống thật. Giao diện chỉ giữ nhãn mô phỏng chung ở thanh trên, bỏ ghi chú Excel/JSON nhỏ trong trang quét.

Phân tích Quant có ô nhập mã, bước xem tiêu chí trước khi chạy và vùng kết quả. Nút chạy cuối cùng để trạng thái chưa kết nối. Không giả tiến trình chạy hoặc kết quả mới. Mẫu Excel giữ rõ ngày và nhãn công bố.

## Truy cập

Dùng label cho điều khiển, aria-pressed cho trạng thái mở/thu, dialog native cho chart và bước xem trước. Escape đóng dialog, khôi phục focus về nút mở. Theme và Theo dõi lưu trên thiết bị. Màu luôn đi cùng số hoặc nhãn. Tôn trọng reduced motion.

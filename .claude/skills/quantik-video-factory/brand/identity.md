# Nhận diện QuanTik cho video

## Màu (đồng bộ `frontend/src/app/globals.css`, theme tối)

| Vai trò | Mã | Dùng cho |
| --- | --- | --- |
| Nền | `#080d0b` | nền video, có lưới mờ 60px |
| Bề mặt | `#0d1913` | panel, chart |
| Viền | `#294337` | khung panel, trục |
| Chữ | `#edf4ef` | chữ chính |
| Chữ phụ | `#a6b9ad` | nhãn, ghi chú |
| Nhấn | `#ff914d` (cam) | hook, số quan trọng, đường chính của chart |
| Tăng | `#67d6a5` | giá/lợi suất dương, “thực ra” trong myth-buster |
| Giảm | `#f08088` | giá/lợi suất âm, “bạn nghĩ” trong myth-buster |
| Trung tính | `#e3c16c` | số trong phụ đề, chú thích |

Màu luôn đi cùng chữ hoặc số (giống quy tắc giao diện web): không để người mù màu phải đoán.

## Chữ

- Thương hiệu dùng **IBM Plex Mono** cho số, mã và code. Thả `IBMPlexMono-Regular.ttf` và `IBMPlexMono-Bold.ttf` (giấy phép OFL) vào `brand/assets/fonts/` thì pipeline tự dùng; chưa có thì dùng JetBrains Mono.
- Chữ thường: Be Vietnam Pro nếu có trong `brand/assets/fonts/`, không thì Inter. Cả hai đủ dấu tiếng Việt.
- Hook 80–96px, đậm nhất. Phụ đề 42px đậm, tối đa 2 dòng. Chữ nhỏ nhất trên video 20px.

## Logo

`brand/assets/logo.jpg` (lấy từ `frontend/public/quantik-logo.jpg`). Góc trên trái mỗi cảnh, to ở thẻ cuối.

## Khung hình

- 1080×1920, 30 fps, H.264 + AAC.
- Vùng an toàn (tránh nút và caption của TikTok/Reels/Shorts): x 60–940, y 170–1500. Mọi chữ phải nằm trong vùng này; `qa/check_format.py` bắt lỗi.
- Phụ đề luôn bật (nhiều người xem không bật tiếng).

## Giọng văn: chuyên gia, dễ hiểu

- Nói như một người làm quant giải thích cho bạn thông minh nhưng không học tài chính. Câu ngắn, động từ mạnh, mỗi câu một ý.
- Luôn đi từ trực giác → công thức → con số do code tính → giới hạn của mô hình.
- Dùng “mình” và “bạn”. Thuật ngữ tiếng Anh giữ nguyên lần đầu kèm nghĩa Việt: “volatility, tức độ biến động”.
- Không hô hào, không hứa hẹn, không giật tít sai sự thật. Hook gây tò mò bằng nghịch lý có thật (“Sharpe cao hơn mà lãi ít hơn?”), không bằng lời hứa.
- Kết bằng một câu “mang về được” và giới hạn của mô hình.

Ví dụ tốt: “Biến động không rải đều. Nó đi thành cụm. GARCH đo đúng điều đó.”
Ví dụ tránh: “Bí kíp GARCH giúp bạn bắt đáy chuẩn 100%!”

## Sản phẩm (dùng cho CTA và video quảng bá)

Theo `README.md` và `docs/` của repo này, cập nhật đến 11/2026:

- **Dashboard**: bảng điện realtime từ AGR (HOSE, HNX, UPCoM), VN-INDEX, VN30, UPCOM, HNX-INDEX, bảng nhóm ngành.
- **Quét toàn sàn**: đọc bản công bố screening mới nhất, 5 mã điểm cao nhất và 5 mã nên tránh nhất theo thứ hạng screening, 34 cột chỉ tiêu có định nghĩa.
- **Phân tích Quant**: chọn mã → kết luận dễ đọc, xu hướng, vùng giá mô phỏng, rủi ro, mô hình 3D tương tác; phần chuyên sâu có 16 nhóm chỉ tiêu, HMM, GARCH, Monte Carlo.
- **Gói**: Free 30 ngày cho tài khoản mới (5 yêu cầu/ngày); QuanTik Pro 149.000đ/30 ngày (giá niêm yết 229.000đ), 20 yêu cầu/ngày — theo `docs/LAUNCH-OFFER-PRODUCTION.md` (ưu đãi từ 19/10/2026, chưa có ngày kết thúc). **Đối chiếu https://quantik.io.vn/plans trước khi nhắc giá.**
- Website: quantik.io.vn

CTA mặc định: “Xem mô hình này chạy trên dữ liệu thật tại quantik.io.vn”. CTA quảng bá không nói “screening chọn cổ phiếu tốt cho bạn”; nói “screening xếp hạng theo bộ chỉ tiêu công bố”.

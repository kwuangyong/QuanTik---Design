# Kho hook

Hook = 1–2 giây đầu quyết định người xem có ở lại. Kho này chia hai phần: **đã kiểm chứng** (có số view thật) và **ứng viên** (chưa đăng hoặc chưa đủ dữ liệu). Không được chuyển hook lên “đã kiểm chứng” khi chưa có số liệu thật.

## Cách cập nhật

1. Sau khi đăng, ghi view vào `knowledge/episodes.csv` (cột `views_tiktok`, `views_reels`, `views_youtube`) sau 7 ngày.
2. Có kết nối vidIQ thì lấy số tự động: `vidiq_user_videos` / `vidiq_video_stats` cho YouTube, `vidiq_tiktok_profile_videos` cho TikTok.
3. Hook nào có view ≥ 2× trung vị kênh trong 30 ngày → chuyển lên bảng “đã kiểm chứng”, ghi rõ số và ngày.
4. Hook nào < 0,5× trung vị sau 3 lần dùng → đánh dấu “bỏ”.

## Đã kiểm chứng

| Hook | Mẫu | Video | View (nền tảng, sau 7 ngày) | Ngày |
| --- | --- | --- | --- | --- |
| _(chưa có — kênh chưa đăng video nào qua pipeline này)_ | | | | |

## Mẫu hook (dùng để viết hook mới)

| Mẫu | Ví dụ | Vì sao hiệu quả |
| --- | --- | --- |
| Nghịch lý có số | “Chiến lược B lãi 25,2% một năm, A chỉ 21,3%. Vậy mà A tốt hơn.” | Mâu thuẫn với trực giác → phải xem tiếp để hiểu |
| Hiểu lầm phổ biến | “VaR nói bạn lỗ tối đa 2,8% một ngày? Phiên tệ nhất lỗ 26,4%.” | Người xem nhận ra mình từng nghĩ vậy |
| Quan sát quen thuộc | “Thị trường yên 3 tuần rồi giật liên tục 5 phiên. Không phải ngẫu nhiên.” | Ai chơi chứng khoán cũng từng thấy |
| Câu hỏi đo được | “Bao lâu thì một khoảng chênh lệch quay về một nửa? Có công thức.” | Hứa một câu trả lời cụ thể, không hứa lợi nhuận |
| Rủi ro ngầm | “Thắng 55% mỗi lần. Vẫn có cách khiến bạn mất gần hết.” | Sợ mất tiền mạnh hơn mong lãi |
| Con số lạ | “1.000 tương lai của cùng một cổ phiếu.” | Hình ảnh cụ thể, tò mò |

Tránh: hứa lãi (“x2 tài khoản”), giật tít sai (“bí kíp bắt đáy”), nhắc mã cụ thể kèm kỳ vọng giá.

## Ứng viên (chưa kiểm chứng)

Lấy từ `video_defaults.hook` của từng mô hình; số trong hook là placeholder, điền từ code lúc dựng.

| Chủ đề | Hook | Mẫu |
| --- | --- | --- |
| garch | Thị trường yên 3 tuần rồi giật liên tục 5 phiên. Không phải ngẫu nhiên. | Quan sát quen thuộc |
| hurst | Một con số cho biết chuỗi giá đang quay đầu hay có quán tính. | Câu hỏi đo được |
| ou | Bao lâu thì một khoảng chênh lệch quay về một nửa? Có công thức. | Câu hỏi đo được |
| hmm | Bạn không nhìn thấy trạng thái thị trường. Nhưng có thể tính xác suất của nó. | Nghịch lý |
| monte_carlo | Cùng một cổ phiếu, {n_paths} tương lai khác nhau. Bao nhiêu kết thúc ở mức lỗ? | Con số lạ |
| sharpe | Chiến lược B lãi {cagr_b} một năm, A chỉ {cagr_a}. Vậy mà A tốt hơn. | Nghịch lý có số |
| var_cvar | VaR nói bạn lỗ tối đa {var95} một ngày? Phiên tệ nhất ở đây lỗ {worst}. | Hiểu lầm phổ biến |
| kelly | Thắng {W} mỗi lần, có lợi thế rõ ràng. Vẫn có cách khiến bạn mất gần hết. | Rủi ro ngầm |

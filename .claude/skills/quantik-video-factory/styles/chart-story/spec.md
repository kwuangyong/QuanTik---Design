# chart-story

Một biểu đồ kể chuyện theo chương: chart vẽ dần, dừng ở từng mốc, mỗi chương có tên (“Yên ắng” → “Cú sốc” → “Tắt dần”). Kết bằng 3D.

**Hợp với:** chuỗi thời gian có diễn biến: GARCH (cụm biến động), Monte Carlo (đường toả ra), OU (kéo về), HMM (đổi trạng thái), Sharpe (hai NAV). Chuyện lịch sử (LTCM, Medallion) xem `knowledge/stories/` — cần dữ liệu và `facts` có nguồn, không vẽ đường giả.

| # | Cảnh | Trường episode |
| --- | --- | --- |
| 1 | hook | `hook`, `kicker` |
| 2..n | chương i: chart vẽ từ mốc trước đến `story[i].at` (0–1), nhãn chương | `story[i].label`, `story[i].say` |
| n+1 | 3D xoay | `beats[3]` |
| n+2 | mang về | `takeaway` |
| n+3 | thẻ cuối | `cta` |

**Viết lời:** 3–4 chương. `at` tăng dần, chương cuối `at: 1.0`. Mỗi `say` mô tả đúng đoạn chart đang hiện, không nói trước phần chưa vẽ.

Mẫu: `sample.mp4` (Monte Carlo).

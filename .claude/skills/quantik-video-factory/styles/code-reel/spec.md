# code-reel

Kiểu reel “code chạy thật”: hàm Python gõ ra từng ký tự → chạy ra số → chart → 3D xoay → câu mang về → thẻ cuối. Đây là style chủ lực, chứng minh mọi con số đến từ code.

**Hợp với:** mọi mô hình có code ngắn (≤ 16 dòng): GARCH, OU, Monte Carlo, Kelly, VaR. Người xem thích kỹ thuật, dev, sinh viên tài chính.

| # | Cảnh | Trường episode | Thời lượng tối thiểu |
| --- | --- | --- | --- |
| 1 | hook — chữ lớn bật từng từ, chip `kicker` | `hook`, `kicker` | 2,6s |
| 2 | code gõ ra, công thức hiện dưới | `beats[0]`, `formula` | 6s |
| 3 | terminal in kết quả, thẻ số nổi bật | `beats[1]`, `outputs` (một mục `highlight: true`) | 5s |
| 4 | chart 2D vẽ dần trái → phải | `beats[2]`, `chart_title` (tuỳ chọn) | 5s |
| 5 | 3D xoay | `beats[3]` | 5,5s |
| 6 | câu mang về | `takeaway` | 2,5s |
| 7 | thẻ cuối: logo, CTA, miễn trừ | `cta` | 3,5s |

Thời lượng thật = max(tối thiểu, độ dài giọng đọc + 0,45s). Mục tiêu 35–55s.

**Viết lời:** `beats[0]` đọc công thức bằng lời thường; `beats[1]` đọc các số terminal đang in (dùng placeholder); `beats[2]` chỉ vào màu trên chart (“đường cam…”); `beats[3]` giải thích trục 3D bằng trực giác.

Mẫu: `sample.mp4` (GARCH, bản 540×960, không giọng — môi trường dựng mẫu không có mạng TTS).

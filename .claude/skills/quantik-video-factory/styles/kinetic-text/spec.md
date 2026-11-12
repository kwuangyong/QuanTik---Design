# kinetic-text

Không mặt, không code: chữ rơi vào từng từ, số chính của mỗi ý đếm lên thật to. Nhịp nhanh, hợp người lướt TikTok không quan tâm code.

**Hợp với:** khái niệm có một con số “đắt”: Hurst (0,50 / 0,19 / 0,81), Monte Carlo (49% số đường lỗ), Kelly.

| # | Cảnh | Trường episode |
| --- | --- | --- |
| 1 | hook | `hook`, `kicker` |
| 2–3 | beat: số đầu tiên trong câu đếm lên cỡ 210px, chữ hiện dần | `beats[0]`, `beats[1]` |
| 4 | chart (vì `beats[2]` mô tả chart) | `beats[2]` |
| 5 | 3D xoay | `beats[3]` |
| 6 | mang về | `takeaway` |
| 7 | thẻ cuối | `cta` |

**Viết lời:** đặt con số quan trọng nhất lên **đầu** câu trong `beats[0]`/`beats[1]` nếu muốn nó thành số đếm lớn (style lấy số đầu tiên xuất hiện). Câu ngắn: chữ chiếm tối đa ~6 dòng.

Mẫu: `sample.mp4` (Hurst).

# VaR và CVaR — đo mức lỗ ở đuôi

Nguồn định nghĩa gốc: `glossary.json` id `var` (Phân vị mức lỗ) và `cvar` (Tổn thất kỳ vọng ở đuôi). VaR là phân vị của mức lỗ, **không phải** mức lỗ tối đa.

## Công thức

$$\mathrm{VaR}_\alpha(L)=q_\alpha(L),\qquad \mathrm{ES}_\alpha(L)=\frac{1}{1-\alpha}\int_\alpha^1 q_u(L)\,du$$

Lịch sử: VaR = phân vị α của chuỗi lỗ; CVaR = trung bình các mức lỗ từ ngưỡng VaR trở lên. Tham số chuẩn: VaR = −(μ − z·σ), z = 1,645 (95%), 2,326 (99%).

## Tham số đẹp để minh hoạ

2.500 phiên Student-t bậc tự do 3, thang 1,2%, seed 13 → VaR95 ≈ 2,8%, CVaR95 ≈ 4,8%; VaR99 lịch sử ≈ 5,5% so với VaR99 giả định chuẩn ≈ 4,8% (thấp hơn khoảng 13%); CVaR99 ≈ 8,9%; phiên tệ nhất ≈ 26%.

## Ngưỡng đọc nhanh (glossary)

- VaR(95%): > 5% vốn tệ · 2–5% bình thường · < 2% tốt.
- CVaR: > 7% tệ · 3–7% bình thường · < 3% tốt.
- Luôn ghi rõ độ tin cậy và horizon.

## Ví dụ HOSE

- Biên độ ±7%/phiên chặn lỗ một phiên của cổ phiếu HOSE ở 7%, nhưng chuỗi phiên sàn liên tiếp (mất thanh khoản) tạo lỗ nhiều phiên lớn hơn nhiều. VaR 1 phiên đánh giá thấp rủi ro này; xét horizon nhiều phiên.
- T+2: horizon tối thiểu thực tế cho vị thế mới là 2–3 phiên.

## Sai lầm hay gặp

- “VaR 95% = 2,8% nghĩa là tôi không bao giờ lỗ quá 2,8%.” Sai: 5% số phiên lỗ lớn hơn.
- Dùng VaR giả định chuẩn cho tài sản đuôi dày ở độ tin cậy cao.
- Quy đổi horizon bằng √t khi lợi suất có tự tương quan hoặc cụm biến động.

## video_defaults

```json
{
  "tag": "VaR · CVaR",
  "title": "VaR không phải mức lỗ tối đa. CVaR mới cho thấy đuôi rủi ro",
  "hook": "VaR nói bạn lỗ tối đa {var95} một ngày? Phiên tệ nhất ở đây lỗ {worst}.",
  "kicker": "Rủi ro đuôi",
  "beats": [
    "Code tạo {n_days} phiên lợi suất đuôi dày. VaR 95 là ngưỡng mà chỉ 5 phần trăm số phiên lỗ vượt qua. CVaR là trung bình của chính những phiên đó.",
    "Kết quả: VaR 95 bằng {var95}, CVaR 95 bằng {cvar95}. Ở mức 99, VaR lịch sử là {var99}, còn giả định phân phối chuẩn chỉ cho {var99_normal}.",
    "Cột đỏ là {tail_days} phiên nằm ngoài ngưỡng VaR. Vạch cam là VaR, vạch đỏ đứt là CVaR, xa hơn hẳn.",
    "Bề mặt 3D: VaR tăng theo độ tin cậy và theo số phiên nắm giữ. Đuôi càng xa, con số càng dốc."
  ],
  "outputs": [
    {"label": "VaR 95% (1 phiên)", "key": "var95"},
    {"label": "CVaR 95%", "key": "cvar95", "highlight": true},
    {"label": "VaR 99% lịch sử", "key": "var99"},
    {"label": "VaR 99% giả định chuẩn", "key": "var99_normal"},
    {"label": "phiên tệ nhất", "key": "worst"}
  ],
  "takeaway": "VaR cho biết ranh giới. CVaR cho biết bên kia ranh giới tệ đến mức nào. Quản lý rủi ro cần cả hai.",
  "cta": "Xem VaR, CVaR của từng mã trong phân tích Quant tại quantik.io.vn",
  "myth": "VaR 95% bằng {var95}, vậy một ngày tôi lỗ tối đa {var95}.",
  "fact": "Sai. Có {tail_days} phiên lỗ vượt {var95}; trung bình các phiên đó là {cvar95}, phiên tệ nhất {worst}.",
  "meme": {
    "format": "expectation-reality",
    "setup": "Kỳ vọng: VaR {var95} là lỗ tối đa",
    "punch": "Thực tế: phiên tệ nhất lỗ {worst}",
    "truth": "VaR là ngưỡng. CVaR 95 bằng {cvar95} mới là trung bình ở đuôi."
  },
  "story": [
    {"at": 0.45, "label": "Phiên bình thường", "say": "Phần lớn các phiên tập trung quanh 0, lãi lỗ nhỏ."},
    {"at": 0.8, "label": "Ngưỡng VaR", "say": "Từ {var95} trở đi là đuôi: {tail_days} phiên tệ nhất."},
    {"at": 1.0, "label": "Đuôi dày", "say": "Trung bình đuôi là {cvar95}. Ở mức 99, giả định chuẩn đánh giá thấp VaR khoảng {underestimate}."}
  ],
  "formula": "\\mathrm{ES}_\\alpha(L)=\\frac{1}{1-\\alpha}\\int_\\alpha^1 q_u(L)\\,du",
  "formula_parts": [
    "\\mathrm{VaR}_\\alpha(L)=q_\\alpha(L)",
    "\\mathrm{ES}_\\alpha(L)=\\frac{1}{1-\\alpha}\\int_\\alpha^1 q_u(L)\\,du"
  ],
  "formula_numeric": "\\mathrm{VaR}_{95}=<<var95>>,\\quad \\mathrm{ES}_{95}=<<cvar95>>",
  "symbols": [
    {"sym": "q_\\alpha(L)", "say": "Phân vị α của mức lỗ: ngưỡng mà chỉ một phần nhỏ số phiên vượt qua."},
    {"sym": "\\int_\\alpha^1 q_u(L)\\,du", "say": "Cộng dồn tất cả mức lỗ phía sau ngưỡng."},
    {"sym": "\\frac{1}{1-\\alpha}", "say": "Chia cho phần đuôi để ra trung bình."}
  ],
  "caption": "VaR là ngưỡng, không phải mức lỗ tối đa. CVaR là trung bình các phiên vượt ngưỡng. Code chạy thật trên 2.500 phiên mô phỏng đuôi dày.",
  "hashtags": ["quant", "VaR", "quanlyruiro", "chungkhoan", "dautu", "QuanTik"],
  "allowed_literals": ["95", "99", "95%", "99%", "5 phần trăm", "1 phiên"]
}
```

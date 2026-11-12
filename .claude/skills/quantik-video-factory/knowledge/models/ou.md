# Ornstein–Uhlenbeck (OU) — quá trình hồi quy về trung bình

Không có trong `glossary.json` của QuanTik; định nghĩa theo chuẩn giáo trình (Uhlenbeck & Ornstein, 1930; dùng phổ biến cho pairs trading và lãi suất — mô hình Vasicek).

## Công thức

$$dX_t=\theta(\mu-X_t)\,dt+\sigma\,dW_t$$

- θ: tốc độ kéo về; μ: mức trung bình dài hạn; σ: độ nhiễu.
- Rời rạc theo phiên: X_t = a + b·X_{t−1} + ε, với b = e^{−θ}. Ước lượng θ = −ln(b) bằng hồi quy AR(1).
- Nửa đời: ln 2 / θ — số phiên để độ lệch khỏi μ giảm một nửa.

## Tham số đẹp để minh hoạ

θ = 0,10, μ = 0, σ = 0,6, xuất phát X₀ = 4, 1.000 phiên, seed 1 → ước lượng θ ≈ 0,10, nửa đời ≈ 6,6 phiên (thật 6,9).

## Ngưỡng đọc nhanh

- Nửa đời ngắn hơn chu kỳ nắm giữ dự định: spread có thể kịp quay về trong thời gian bạn chịu được.
- Nửa đời rất dài (> 60 phiên): quay về chậm, rủi ro “trung bình dịch chuyển” lớn.
- b ≥ 1 trong hồi quy AR(1): không có hồi quy, OU không phù hợp.

## Ví dụ HOSE

- Spread giữa hai mã cùng ngành (ví dụ hai ngân hàng) là ứng viên điển hình; phải kiểm định đồng liên kết trước khi fit OU.
- Biên độ ±7% và T+2 làm việc vào/ra spread chậm hơn mô hình liên tục giả định; nửa đời quá ngắn (1–2 phiên) khó tận dụng.

## Sai lầm hay gặp

- Fit OU lên giá một cổ phiếu (thường không dừng) thay vì spread đã kiểm định.
- Quên rằng μ có thể dịch chuyển: mô hình ước lượng trên quá khứ.
- Đọc dải ±2σ như “chắc chắn quay về”.

## video_defaults

```json
{
  "tag": "ORNSTEIN–UHLENBECK",
  "title": "Spread lệch xa rồi sẽ quay về? Mô hình OU và nửa đời",
  "hook": "Bao lâu thì một khoảng chênh lệch quay về một nửa? Có công thức.",
  "kicker": "Mean reversion",
  "beats": [
    "Mô phỏng một spread bắt đầu ở {start}, bị kéo về 0 với tốc độ θ bằng {theta_true}. Sau đó code ước lượng lại θ bằng hồi quy AR(1).",
    "Code ước lượng θ bằng {theta_hat}. Nửa đời là ln 2 chia θ, khoảng {half_life} phiên. Giá trị thật là {half_life_true} phiên.",
    "Đường cam xuất phát xa rồi rơi về vùng xanh quanh 0. Vùng xanh rộng khoảng cộng trừ {band}.",
    "Bề mặt 3D là phân phối của spread theo thời gian: đỉnh trượt dần về 0 rồi đứng yên. Đó là trạng thái dừng."
  ],
  "outputs": [
    {"label": "θ thật", "key": "theta_true"},
    {"label": "θ ước lượng", "key": "theta_hat"},
    {"label": "nửa đời (phiên)", "key": "half_life", "highlight": true},
    {"label": "nửa đời thật", "key": "half_life_true"},
    {"label": "μ ước lượng", "key": "mu_hat"}
  ],
  "takeaway": "Nửa đời biến cảm giác “sắp quay về” thành một con số kiểm tra được. Nhưng trung bình có thể dịch chuyển; hãy kiểm định lại thường xuyên.",
  "cta": "Tìm hiểu các mô hình định lượng QuanTik dùng tại quantik.io.vn",
  "myth": "Spread lệch càng xa thì càng chắc chắn sắp quay về.",
  "fact": "Chỉ đúng khi spread thật sự hồi quy. Ở đây θ bằng {theta_hat}, nửa đời {half_life} phiên — và phải kiểm định lại khi dữ liệu đổi.",
  "meme": {
    "format": "expectation-reality",
    "setup": "Kỳ vọng: lệch là quay về ngay",
    "punch": "Thực tế: nó quay về... theo nửa đời",
    "truth": "Với θ bằng {theta_hat}, nửa đời khoảng {half_life} phiên."
  },
  "story": [
    {"at": 0.08, "label": "Lệch xa", "say": "Spread xuất phát ở {start}, rất xa mức trung bình."},
    {"at": 0.3, "label": "Kéo về", "say": "Mỗi phiên, θ kéo nó về gần 0 hơn một chút. Sau khoảng {half_life} phiên, độ lệch còn một nửa."},
    {"at": 1.0, "label": "Dao động quanh 0", "say": "Sau đó spread chỉ dao động quanh 0, phần lớn trong khoảng cộng trừ {band}."}
  ],
  "formula": "dX_t=\\theta(\\mu-X_t)\\,dt+\\sigma\\,dW_t",
  "formula_parts": [
    "dX_t",
    "dX_t=\\theta(\\mu-X_t)\\,dt",
    "dX_t=\\theta(\\mu-X_t)\\,dt+\\sigma\\,dW_t",
    "t_{1/2}=\\frac{\\ln 2}{\\theta}"
  ],
  "formula_numeric": "t_{1/2}=\\frac{\\ln 2}{<<theta_hat>>}\\approx <<half_life>>\\ phiên",
  "symbols": [
    {"sym": "\\theta(\\mu-X_t)", "say": "Lực kéo: càng xa trung bình μ, lực kéo về càng mạnh."},
    {"sym": "\\sigma\\,dW_t", "say": "Nhiễu ngẫu nhiên đẩy spread lệch đi mỗi phiên."},
    {"sym": "\\frac{\\ln 2}{\\theta}", "say": "Nửa đời: số phiên để độ lệch giảm còn một nửa."}
  ],
  "caption": "Ornstein–Uhlenbeck: mô hình hồi quy về trung bình. Từ θ ra nửa đời, tức bao lâu để độ lệch giảm một nửa. Code chạy thật, dữ liệu mô phỏng.",
  "hashtags": ["quant", "meanreversion", "pairstrading", "chungkhoan", "QuanTik"],
  "allowed_literals": ["ln 2", "AR(1)", "0"]
}
```

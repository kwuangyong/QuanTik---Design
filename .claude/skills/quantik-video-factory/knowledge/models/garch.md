# GARCH(1,1) — phương sai có điều kiện

Nguồn định nghĩa gốc: `frontend/src/content/legacy/glossary.json` id `garch` (mô hình phương sai có điều kiện).

## Công thức

$$\sigma_t^2=\omega+\alpha\,\epsilon_{t-1}^2+\beta\,\sigma_{t-1}^2$$

- ε_{t−1}: cú sốc lợi suất phiên trước; σ²_{t−1}: phương sai phiên trước.
- ω > 0, α, β ≥ 0. Điều kiện dừng: α + β < 1.
- Phương sai dài hạn: ω / (1 − α − β). Nửa đời cú sốc: ln(0,5) / ln(α + β).

## Tham số đẹp để minh hoạ

ω = 2·10⁻⁶, α = 0,09, β = 0,89 → α + β = 0,98, biến động dài hạn khoảng 16%/năm, nửa đời cú sốc khoảng 34 phiên. Bộ này giống cổ phiếu vốn hoá lớn: phản ứng vừa phải với cú sốc, nhớ lâu.

## Ngưỡng đọc nhanh

- α + β gần 1 (0,95–0,99): cú sốc tắt chậm, biến động đi thành cụm dài. Phổ biến ở cổ phiếu và chỉ số.
- α lớn (> 0,15): phản ứng mạnh với tin tức một phiên.
- α + β ≥ 1: không có phương sai dài hạn hữu hạn (IGARCH); cần mô hình khác hoặc cửa sổ khác.

## Ví dụ HOSE

- Biên độ giá HOSE ±7%/phiên (HNX ±10%, UPCoM ±15%) cắt cụt đuôi lợi suất. Phiên chạm trần/sàn liên tiếp làm cú sốc thật bị chia ra nhiều phiên, nên α ước lượng thấp hơn và β cao hơn thực tế. Khi fit trên dữ liệu HOSE, nói rõ điều này.
- Cổ phiếu thanh khoản thấp có nhiều phiên lợi suất bằng 0 → phương sai bị kéo xuống. Lọc theo thanh khoản (ADV20) trước khi so sánh.

## Sai lầm hay gặp

- Coi σ_t của GARCH là dự báo hướng giá. GARCH chỉ nói về độ lớn biến động, không nói tăng hay giảm.
- Fit trên giá thay vì lợi suất.
- Quên năm hoá đúng: σ_năm = σ_ngày × √252.
- So sánh α, β giữa hai mô hình khác phân phối (normal vs Student-t) như thể cùng thang.

## video_defaults

```json
{
  "tag": "GARCH(1,1)",
  "title": "Vì sao biến động đi thành cụm? GARCH giải thích bằng code chạy thật",
  "hook": "Thị trường yên 3 tuần rồi giật liên tục 5 phiên. Không phải ngẫu nhiên.",
  "kicker": "Volatility clustering",
  "beats": [
    "Đây là GARCH(1,1). Phương sai hôm nay bằng một hằng số, cộng α nhân cú sốc hôm qua, cộng β nhân phương sai hôm qua.",
    "Chạy {n_days} phiên mô phỏng: α là {alpha}, β là {beta}. Tổng α cộng β bằng {persistence}, nên một cú sốc cần khoảng {half_life} phiên mới tắt một nửa.",
    "Cột xanh đỏ là lợi suất từng phiên. Đường cam là biến động năm hoá, dao động từ {vol_min} đến {vol_peak}. Phiên lớn tụ lại thành cụm.",
    "Nhìn 3D: mỗi lát cắt là phân phối lợi suất của một phiên. Khi biến động cao, phân phối bè ra. Đuôi rủi ro dày lên đúng lúc thị trường căng."
  ],
  "outputs": [
    {"label": "α (phản ứng cú sốc)", "key": "alpha"},
    {"label": "β (trí nhớ)", "key": "beta"},
    {"label": "α + β", "key": "persistence", "highlight": true},
    {"label": "nửa đời cú sốc (phiên)", "key": "half_life"},
    {"label": "σ dài hạn / năm", "key": "long_run_vol"},
    {"label": "σ cao nhất / năm", "key": "vol_peak"}
  ],
  "takeaway": "GARCH không đoán giá lên hay xuống. Nó cho biết lúc nào rủi ro đang phình to, để bạn chỉnh khối lượng cho phù hợp.",
  "cta": "Xem GARCH chạy trên dữ liệu thật tại quantik.io.vn",
  "myth": "Biến động là ngẫu nhiên, hôm nay giật mạnh không nói gì về ngày mai.",
  "fact": "Biến động có trí nhớ. Với α + β = {persistence}, một cú sốc cần khoảng {half_life} phiên mới tắt một nửa.",
  "meme": {
    "format": "expectation-reality",
    "setup": "Kỳ vọng: biến động rải đều mỗi ngày",
    "punch": "Thực tế: yên ắng... rồi giật liên tục",
    "truth": "GARCH gọi đó là volatility clustering. Ở đây α + β = {persistence}."
  },
  "story": [
    {"at": 0.25, "label": "Yên ắng", "say": "Những phiên đầu, biến động quanh {vol_min}. Mọi thứ có vẻ bình thường."},
    {"at": 0.6, "label": "Cú sốc", "say": "Rồi vài phiên lớn xuất hiện. GARCH đẩy biến động lên ngay, vì α nhân với cú sốc hôm qua."},
    {"at": 1.0, "label": "Tắt dần", "say": "Biến động đạt đỉnh {vol_peak} rồi giảm chậm. β = {beta} giữ trí nhớ rất lâu."}
  ],
  "formula": "\\sigma_t^2=\\omega+\\alpha\\,\\epsilon_{t-1}^2+\\beta\\,\\sigma_{t-1}^2",
  "formula_parts": [
    "\\sigma_t^2",
    "\\sigma_t^2=\\omega",
    "\\sigma_t^2=\\omega+\\alpha\\,\\epsilon_{t-1}^2",
    "\\sigma_t^2=\\omega+\\alpha\\,\\epsilon_{t-1}^2+\\beta\\,\\sigma_{t-1}^2"
  ],
  "formula_numeric": "\\sigma_t^2=\\omega+<<alpha>>\\,\\epsilon_{t-1}^2+<<beta>>\\,\\sigma_{t-1}^2",
  "symbols": [
    {"sym": "\\sigma_t^2", "say": "Phương sai hôm nay, tức bình phương độ biến động."},
    {"sym": "\\alpha\\,\\epsilon_{t-1}^2", "say": "Phản ứng với cú sốc hôm qua. α lớn thì thị trường giật theo tin nhanh."},
    {"sym": "\\beta\\,\\sigma_{t-1}^2", "say": "Trí nhớ. β lớn thì biến động cao kéo dài nhiều phiên."}
  ],
  "caption": "Biến động không rải đều mà đi thành cụm. GARCH(1,1) mô tả điều đó bằng 3 tham số. Code chạy thật, dữ liệu mô phỏng có seed cố định.",
  "hashtags": ["quant", "GARCH", "chungkhoan", "dautu", "phantichdinhluong", "QuanTik"],
  "allowed_literals": ["GARCH(1,1)", "252", "3 tuần", "5 phiên"]
}
```

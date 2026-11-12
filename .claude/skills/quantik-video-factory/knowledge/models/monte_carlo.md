# Monte Carlo — 1.000 tương lai của một cổ phiếu

Nguồn định nghĩa gốc: `glossary.json` id `monte_carlo`: Ê[f(X)] = (1/M) Σ f(X^{(m)}). Mô hình sinh đường trong demo: chuyển động Brown hình học (GBM).

## Công thức

$$\widehat{E}[f(X)]=\frac{1}{M}\sum_{m=1}^{M}f(X^{(m)})$$

GBM rời rạc: S_{t+1} = S_t · exp((μ − σ²/2)Δt + σ√Δt · Z), Z ~ N(0,1), Δt = 1/252.

## Tham số đẹp để minh hoạ

S₀ = 100, μ = 10%/năm, σ = 35%/năm (cổ phiếu biến động cao), 1.000 đường × 60 phiên, seed 21 → P5 ≈ 76, trung vị ≈ 100, P95 ≈ 133, tần suất lỗ ≈ 49%.

## Ngưỡng đọc nhanh

- Dải P5–P95 là vùng mô phỏng theo giả định, **không** phải khoảng tin cậy đã hiệu chuẩn (glossary).
- Tần suất lỗ mô phỏng gần 50% với horizon ngắn là bình thường: trôi μ nhỏ so với nhiễu σ.
- Thêm đường mô phỏng làm ước lượng ổn định hơn nhưng không sửa được giả định sai.

## Ví dụ HOSE

- GBM không có biên độ ±7%/phiên; đường mô phỏng có thể vượt trần/sàn. Khi dùng cho HOSE, nói rõ hoặc cắt lợi suất phiên theo biên độ.
- T+2 nghĩa là không thể bán trong 2 phiên sau mua; horizon rủi ro tối thiểu thực tế dài hơn 1 phiên.

## Sai lầm hay gặp

- Đọc trung vị mô phỏng như dự báo giá.
- Dùng σ quá khứ ngắn (vài tuần) để mô phỏng nhiều tháng.
- Quên đính kèm seed, horizon, số mẫu (glossary yêu cầu).

## video_defaults

```json
{
  "tag": "MONTE CARLO",
  "title": "1.000 tương lai của một cổ phiếu: Monte Carlo bằng code chạy thật",
  "hook": "Cùng một cổ phiếu, {n_paths} tương lai khác nhau. Bao nhiêu kết thúc ở mức lỗ?",
  "kicker": "Mô phỏng Monte Carlo",
  "beats": [
    "Code sinh {n_paths} đường giá, mỗi đường {days} phiên, từ giá {s0}, biến động {sigma} một năm. Mỗi phiên là một cú tung xúc xắc chuẩn.",
    "Kết quả: phân vị 5 là {p5}, trung vị {p50}, phân vị 95 là {p95}. Có {prob_loss} số đường kết thúc dưới giá ban đầu.",
    "Đường cam là trung vị, dải cam là vùng 5 đến 95. Những đường xám mờ là từng tương lai riêng lẻ.",
    "Nhìn 3D: phân phối giá bè dần theo thời gian. Càng xa hôm nay, vùng có thể xảy ra càng rộng."
  ],
  "outputs": [
    {"label": "số đường mô phỏng", "key": "n_paths"},
    {"label": "phân vị 5", "key": "p5"},
    {"label": "trung vị", "key": "p50"},
    {"label": "phân vị 95", "key": "p95"},
    {"label": "tần suất lỗ", "key": "prob_loss", "highlight": true}
  ],
  "takeaway": "Monte Carlo không cho bạn một con số dự báo. Nó cho bạn hình dạng của rủi ro, theo đúng giả định bạn đưa vào.",
  "cta": "Xem vùng giá mô phỏng cho từng mã trong phân tích Quant tại quantik.io.vn",
  "myth": "Mô phỏng ra trung vị {p50}, vậy giá sẽ về khoảng {p50}.",
  "fact": "Không. {prob_loss} số đường kết thúc dưới {s0}; vùng 5–95 trải từ {p5} đến {p95}. Trung vị chỉ là đường giữa của giả định.",
  "meme": {
    "format": "expectation-reality",
    "setup": "Kỳ vọng: một đường dự báo đẹp",
    "punch": "Thực tế: {n_paths} đường, cái nào cũng có thể",
    "truth": "Ở đây {prob_loss} số tương lai mô phỏng kết thúc ở mức lỗ."
  },
  "story": [
    {"at": 0.15, "label": "Cùng xuất phát", "say": "Tất cả {n_paths} tương lai bắt đầu ở cùng giá {s0}."},
    {"at": 0.55, "label": "Toả ra", "say": "Mỗi phiên, nhiễu ngẫu nhiên đẩy các đường xa nhau dần."},
    {"at": 1.0, "label": "Phiên {days}", "say": "Đến phiên {days}, vùng 5 đến 95 trải từ {p5} đến {p95}. Đường tệ nhất về {worst}."}
  ],
  "formula": "\\widehat{E}[f(X)]=\\frac{1}{M}\\sum_{m=1}^{M}f(X^{(m)})",
  "formula_parts": [
    "f(X^{(m)})",
    "\\sum_{m=1}^{M}f(X^{(m)})",
    "\\widehat{E}[f(X)]=\\frac{1}{M}\\sum_{m=1}^{M}f(X^{(m)})"
  ],
  "formula_numeric": "\\widehat{P}(S_T<S_0)=\\frac{1}{<<n_paths>>}\\sum_{m}\\mathbf{1}[S_T^{(m)}<S_0]=<<prob_loss>>",
  "symbols": [
    {"sym": "X^{(m)}", "say": "Một tương lai mô phỏng, đánh số m."},
    {"sym": "f(\\cdot)", "say": "Điều bạn muốn đo: giá cuối kỳ, có lỗ hay không."},
    {"sym": "\\frac{1}{M}\\sum", "say": "Lấy trung bình trên M tương lai. M càng lớn, ước lượng càng ổn định."}
  ],
  "caption": "Monte Carlo: sinh 1.000 tương lai để thấy hình dạng rủi ro thay vì một con số dự báo. Code chạy thật, GBM với seed cố định.",
  "hashtags": ["quant", "montecarlo", "chungkhoan", "quanlyruiro", "QuanTik"],
  "allowed_literals": ["5", "95"]
}
```

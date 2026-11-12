# HMM — trạng thái thị trường ẩn (Hidden Markov Model)

Nguồn định nghĩa gốc: `glossary.json` id `hmm` (Trạng thái Markov ẩn): P(z_t = k | x_{1:t}), 3 trạng thái, cửa sổ 60–120 phiên. Radar QuanTik dùng xác suất **filtered** (xem `docs/RADAR-SCORING-V2.md`).

## Công thức (bộ lọc tiến)

$$P(z_t=k\mid x_{1:t})\propto p(x_t\mid z_t=k)\sum_j P_{jk}\,P(z_{t-1}=j\mid x_{1:t-1})$$

- z_t: trạng thái ẩn (tăng / giảm / đi ngang); x_t: lợi suất quan sát; P: ma trận chuyển trạng thái.
- Thời gian ở lại trung bình của trạng thái k: 1 / (1 − P_kk).

## Tham số đẹp để minh hoạ

μ = (0,12%; −0,20%; 0,01%)/phiên, σ = (0,9%; 2,2%; 0,6%), P_kk = 0,97 / 0,95 / 0,96, 600 phiên, seed 5. Tham số được giả định là biết trước (để minh hoạ bộ lọc, không chạy Baum–Welch).

## Ngưỡng đọc nhanh (glossary)

- Xác suất trạng thái trội < 50%: không rõ ràng, dễ nhiễu.
- 50–75%: bình thường. > 75%: trạng thái rõ.
- Đây là xác suất trạng thái ẩn của mô hình, **không phải** xác suất cổ phiếu tăng.

## Ví dụ HOSE

- VN-INDEX có những giai đoạn biến động cao kéo dài (ví dụ quanh các đợt bán giải chấp); trạng thái “giảm” thường đi kèm σ lớn hơn hẳn, nên HMM nhận ra nhờ biến động trước cả nhờ dấu lợi suất.
- Nhãn tăng/giảm/ngang phải gán sau khi fit (glossary nhấn mạnh); thứ tự trạng thái của thuật toán là tuỳ ý.

## Sai lầm hay gặp

- Dùng xác suất smoothed (nhìn cả tương lai) để backtest — rò rỉ dữ liệu. Chỉ dùng filtered.
- Đọc “P(tăng) = 88%” thành “88% khả năng cổ phiếu tăng”.
- Fit quá nhiều trạng thái trên chuỗi ngắn.

## video_defaults

```json
{
  "tag": "HMM",
  "title": "Thị trường đang ở trạng thái nào? Mô hình Markov ẩn",
  "hook": "Bạn không nhìn thấy trạng thái thị trường. Nhưng có thể tính xác suất của nó.",
  "kicker": "Hidden Markov Model",
  "beats": [
    "Code mô phỏng {n_days} phiên chuyển qua lại giữa ba trạng thái: tăng, giảm, đi ngang. Rồi một bộ lọc tiến tính xác suất từng trạng thái, chỉ dùng dữ liệu đến hôm đó.",
    "Phiên cuối: xác suất trạng thái tăng là {p_bull_last}, giảm {p_bear_last}, đi ngang {p_side_last}. Trạng thái tăng kéo dài trung bình {bull_len} phiên.",
    "Màu xanh, vàng, đỏ là xác suất ba trạng thái theo thời gian. Bộ lọc đoán đúng trạng thái thật {accuracy} số phiên.",
    "Trong 3D, mỗi điểm là bộ ba xác suất của một phiên. Chuỗi điểm nhảy giữa các góc khi thị trường đổi trạng thái."
  ],
  "outputs": [
    {"label": "P(tăng) phiên cuối", "key": "p_bull_last", "highlight": true},
    {"label": "P(giảm) phiên cuối", "key": "p_bear_last"},
    {"label": "P(ngang) phiên cuối", "key": "p_side_last"},
    {"label": "khớp trạng thái thật", "key": "accuracy"},
    {"label": "tăng kéo dài TB (phiên)", "key": "bull_len"}
  ],
  "takeaway": "Xác suất {p_bull_last} là xác suất trạng thái của mô hình, không phải xác suất giá tăng. Đọc đúng thì HMM giúp đổi chiến lược theo bối cảnh.",
  "cta": "QuanTik dùng HMM filtered trong phân tích Quant — xem tại quantik.io.vn",
  "myth": "HMM nói P(tăng) bằng {p_bull_last}, vậy cổ phiếu có {p_bull_last} khả năng tăng.",
  "fact": "Sai. Đó là xác suất mô hình đang ở trạng thái “tăng”, tính từ dữ liệu đến hôm nay. Không phải xác suất giá ngày mai.",
  "meme": {
    "format": "nobody-quant",
    "setup": "Thị trường: đi ngang 3 tuần",
    "punch": "Dân quant: “P(ngang) cao, đừng đổi chiến lược vội”",
    "truth": "Bộ lọc tiến chỉ dùng dữ liệu đến hôm nay. Ở đây nó khớp trạng thái thật {accuracy} số phiên."
  },
  "story": [
    {"at": 0.3, "label": "Trạng thái tăng", "say": "Phần lớn thời gian mô hình ở trạng thái tăng, xác suất màu xanh chiếm ưu thế."},
    {"at": 0.65, "label": "Chuyển trạng thái", "say": "Khi biến động bùng lên, xác suất đỏ tăng vọt. Mô hình nhận ra nhờ độ lớn biến động."},
    {"at": 1.0, "label": "Hôm nay", "say": "Phiên cuối, P(tăng) là {p_bull_last}. Đây là trạng thái trội của mô hình."}
  ],
  "formula": "P(z_t=k\\mid x_{1:t})",
  "formula_parts": [
    "z_t",
    "P(z_t=k\\mid x_{1:t})",
    "P(z_t=k\\mid x_{1:t})\\propto p(x_t\\mid k)\\sum_j P_{jk}\\,\\alpha_{t-1}(j)"
  ],
  "formula_numeric": "P(z_T=\\mathrm{tăng}\\mid x_{1:T})=<<p_bull_last>>",
  "symbols": [
    {"sym": "z_t", "say": "Trạng thái ẩn hôm nay: tăng, giảm hay đi ngang."},
    {"sym": "x_{1:t}", "say": "Chỉ dữ liệu đến hôm nay, không nhìn tương lai."},
    {"sym": "P_{jk}", "say": "Xác suất chuyển từ trạng thái j sang k. Gần 1 nghĩa là trạng thái bám lâu."}
  ],
  "caption": "HMM tính xác suất thị trường đang ở trạng thái tăng, giảm hay đi ngang. Đó là xác suất trạng thái, không phải xác suất giá tăng. Code chạy thật, dữ liệu mô phỏng.",
  "hashtags": ["quant", "HMM", "chungkhoan", "dautu", "machinelearning", "QuanTik"],
  "allowed_literals": ["3 tuần", "ba trạng thái"]
}
```

# Sharpe — hiệu suất điều chỉnh biến động

Nguồn định nghĩa gốc: `glossary.json` id `sharpe`: mean(r − r_f) / s(r − r_f) × √252, Rf = 0% mặc định, lợi suất ngày.

## Công thức

$$\mathrm{Sharpe}=\frac{\overline{r-r_f}}{s(r-r_f)}\sqrt{252}$$

## Tham số đẹp để minh hoạ

Hai chiến lược, 750 phiên, seed 12: A có trung bình 0,06%/phiên, σ 1,0%; B có 0,09%/phiên, σ 2,2%. Kết quả mẫu: Sharpe A ≈ 1,31, B ≈ 0,82; nhưng lợi nhuận năm B ≈ 25% > A ≈ 21%; sụt giảm lớn nhất B ≈ −30%, A ≈ −11%.

## Ngưỡng đọc nhanh (glossary)

< 0 tệ · 0–1 bình thường · 1–2 tốt · > 2 rất tốt.

## Ví dụ HOSE

- Lãi suất phi rủi ro VND không bằng 0; khi so với tiền gửi, đặt r_f bằng lợi suất trái phiếu chính phủ cùng kỳ hạn.
- Cổ phiếu ít thanh khoản có nhiều phiên lợi suất 0 làm σ thấp giả tạo → Sharpe cao giả tạo.

## Sai lầm hay gặp

- Sharpe cao trên mẫu ngắn; glossary nhấn mạnh Sharpe cao chưa chứng minh chiến lược bền vững (xem thêm PSR/DSR trong glossary).
- So Sharpe tính theo ngày với Sharpe theo tháng mà không quy đổi.
- Phân phối đuôi dày/lệch: Sharpe bỏ qua.

## video_defaults

```json
{
  "tag": "SHARPE",
  "title": "Lãi nhiều hơn mà Sharpe thấp hơn? Đọc đúng chỉ số Sharpe",
  "hook": "Chiến lược B lãi {cagr_b} một năm, A chỉ {cagr_a}. Vậy mà A tốt hơn.",
  "kicker": "Sharpe ratio",
  "beats": [
    "Code tạo hai chiến lược trong {n_days} phiên. Sharpe bằng lợi suất vượt trội trung bình chia độ lệch chuẩn, nhân căn 252 để quy ra năm.",
    "Kết quả: Sharpe A bằng {sharpe_a}, B bằng {sharpe_b}. B lãi nhiều hơn nhưng biến động {vol_b} một năm, gấp đôi A.",
    "Đường xanh là A, đường đỏ là B. B có lúc sụt {dd_b}, A chỉ sụt {dd_a}.",
    "Bề mặt 3D: Sharpe tăng khi lợi nhuận tăng, nhưng giảm nhanh khi biến động phình ra."
  ],
  "outputs": [
    {"label": "lợi nhuận năm A", "key": "cagr_a"},
    {"label": "lợi nhuận năm B", "key": "cagr_b"},
    {"label": "Sharpe A", "key": "sharpe_a", "highlight": true},
    {"label": "Sharpe B", "key": "sharpe_b"},
    {"label": "sụt giảm lớn nhất B", "key": "dd_b"}
  ],
  "takeaway": "Sharpe hỏi: mỗi đơn vị rủi ro mang lại bao nhiêu lợi nhuận. Lãi nhiều mà sụt sâu thì khó cầm đến cuối.",
  "cta": "Xem Sharpe, Sortino, Calmar của từng mã tại quantik.io.vn",
  "myth": "Chiến lược lãi nhiều hơn là chiến lược tốt hơn.",
  "fact": "B lãi {cagr_b} nhưng Sharpe chỉ {sharpe_b} và từng sụt {dd_b}. A lãi {cagr_a}, Sharpe {sharpe_a}.",
  "meme": {
    "format": "nobody-quant",
    "setup": "Bạn: “Chiến lược này lãi {cagr_b} một năm!”",
    "punch": "Dân quant: “Sharpe bao nhiêu? Sụt tối đa bao nhiêu?”",
    "truth": "Sharpe {sharpe_b}, từng sụt {dd_b}. Lợi nhuận chỉ là một nửa câu chuyện."
  },
  "story": [
    {"at": 0.3, "label": "Ngang nhau", "say": "Ban đầu hai chiến lược khó phân biệt."},
    {"at": 0.65, "label": "B rung lắc", "say": "B tăng nhanh hơn nhưng rung lắc mạnh, có lúc sụt {dd_b}."},
    {"at": 1.0, "label": "Về đích", "say": "Cuối kỳ B lãi {cagr_b} một năm, A lãi {cagr_a}. Nhưng Sharpe của A là {sharpe_a}, gần gấp rưỡi B."}
  ],
  "formula": "\\mathrm{Sharpe}=\\frac{\\overline{r-r_f}}{s(r-r_f)}\\sqrt{252}",
  "formula_parts": [
    "\\overline{r-r_f}",
    "\\frac{\\overline{r-r_f}}{s(r-r_f)}",
    "\\mathrm{Sharpe}=\\frac{\\overline{r-r_f}}{s(r-r_f)}\\sqrt{252}"
  ],
  "formula_numeric": "\\mathrm{Sharpe}_A=<<sharpe_a>>,\\quad \\mathrm{Sharpe}_B=<<sharpe_b>>",
  "symbols": [
    {"sym": "\\overline{r-r_f}", "say": "Lợi suất vượt lãi suất phi rủi ro, lấy trung bình."},
    {"sym": "s(r-r_f)", "say": "Độ lệch chuẩn: thước đo rủi ro tổng thể."},
    {"sym": "\\sqrt{252}", "say": "Quy từ ngày ra năm, giả định 252 phiên."}
  ],
  "caption": "Lãi nhiều hơn chưa chắc tốt hơn. Sharpe đo lợi nhuận trên mỗi đơn vị rủi ro. Code chạy thật trên 2 chiến lược mô phỏng.",
  "hashtags": ["quant", "sharpe", "chungkhoan", "dautu", "quanlyruiro", "QuanTik"],
  "allowed_literals": ["252", "2 chiến lược"]
}
```

# Hệ số Hurst — chuỗi có trí nhớ không?

Nguồn định nghĩa gốc: `glossary.json` id `hurst`: E[(X_{t+τ} − X_t)²] ∝ τ^{2H}.

## Công thức

$$E\left[(X_{t+\tau}-X_t)^2\right]\propto\tau^{2H}$$

Cách ước lượng trong code: lấy độ lệch chuẩn của chênh lệch theo độ trễ τ, vẽ log(σ_τ) theo log(τ), độ dốc chính là H.

## Tham số đẹp để minh hoạ

Ba chuỗi cùng một nguồn nhiễu (seed 1, 3.000 bước, độ trễ 2–49):
- bước ngẫu nhiên → H ≈ 0,50
- chuỗi hồi quy AR(1) hệ số 0,9 → H ≈ 0,19
- chuỗi có số gia AR(1) hệ số 0,9 (quán tính) → H ≈ 0,81

## Ngưỡng đọc nhanh

- H ≈ 0,5: không có trí nhớ đáng kể (mốc Brownian).
- H < 0,5: có xu hướng quay đầu (mean-reverting).
- H > 0,5: có quán tính (persistent).
- Glossary nhấn mạnh: H = 0,7 chỉ *gợi ý* persistence dưới mô hình phù hợp; không chứng minh có alpha.

## Ví dụ HOSE

- Chuỗi giá cổ phiếu ít thanh khoản có nhiều phiên không đổi giá → H ước lượng bị lệch. Lọc thanh khoản trước.
- Ước lượng H trên cửa sổ ngắn (vài tháng) dao động mạnh; báo cáo kèm cửa sổ và phương pháp.

## Sai lầm hay gặp

- Tính H trên lợi suất rồi đọc như tính trên giá (hoặc ngược lại) — hai cách cho kết quả khác.
- Coi H > 0,5 là tín hiệu mua. H mô tả cấu trúc phụ thuộc, không phải hướng.
- Dùng một phương pháp duy nhất (R/S cổ điển lệch lên với mẫu nhỏ).

## video_defaults

```json
{
  "tag": "HURST",
  "title": "Giá có trí nhớ không? Đo bằng hệ số Hurst",
  "hook": "Một con số cho biết chuỗi giá đang quay đầu hay có quán tính.",
  "kicker": "Hệ số Hurst",
  "beats": [
    "Code tạo ba chuỗi từ cùng một nguồn nhiễu, rồi đo độ lệch của chênh lệch theo từng độ trễ. Độ dốc trên thang log chính là H.",
    "Kết quả: bước ngẫu nhiên cho H bằng {h_walk}. Chuỗi hồi quy cho {h_meanrev}. Chuỗi có quán tính cho {h_trend}.",
    "Đường cam liên tục kéo về giữa. Đường xanh đi xa dần theo một hướng. Đường xám ở giữa hai thái cực.",
    "Trên bề mặt 3D: H càng cao, độ lệch càng tăng nhanh theo độ trễ. Đó là trí nhớ của chuỗi."
  ],
  "outputs": [
    {"label": "H bước ngẫu nhiên", "key": "h_walk"},
    {"label": "H chuỗi hồi quy", "key": "h_meanrev"},
    {"label": "H chuỗi quán tính", "key": "h_trend", "highlight": true},
    {"label": "số độ trễ dùng", "key": "n_lags"}
  ],
  "takeaway": "H cho biết cấu trúc của chuỗi, không cho biết giá sẽ đi đâu. Luôn hỏi: đo trên cửa sổ nào, bằng phương pháp nào?",
  "cta": "Xem các chỉ số định lượng của từng mã tại quantik.io.vn",
  "myth": "Giá cổ phiếu là bước đi ngẫu nhiên, quá khứ không nói gì.",
  "fact": "Có thể đo. H bằng {h_walk} là ngẫu nhiên; {h_meanrev} là hồi quy; {h_trend} là quán tính.",
  "meme": {
    "format": "nobody-quant",
    "setup": "Không ai hỏi:",
    "punch": "Dân quant: “Chuỗi này H bằng {h_trend}, nó có trí nhớ đấy”",
    "truth": "Nhưng đúng toán: H trên 0,5 nghĩa là có quán tính, không phải tín hiệu mua."
  },
  "story": [
    {"at": 0.3, "label": "Cùng xuất phát", "say": "Ba chuỗi dùng cùng một nguồn nhiễu, cùng điểm xuất phát."},
    {"at": 0.65, "label": "Tách nhau", "say": "Chuỗi hồi quy cứ bị kéo về giữa. Chuỗi quán tính đi xa dần."},
    {"at": 1.0, "label": "Đo bằng H", "say": "Hệ số Hurst lần lượt là {h_meanrev}, {h_walk} và {h_trend}."}
  ],
  "formula": "E\\left[(X_{t+\\tau}-X_t)^2\\right]\\propto\\tau^{2H}",
  "formula_parts": [
    "X_{t+\\tau}-X_t",
    "E\\left[(X_{t+\\tau}-X_t)^2\\right]",
    "E\\left[(X_{t+\\tau}-X_t)^2\\right]\\propto\\tau^{2H}"
  ],
  "formula_numeric": "H_{ngẫu\\ nhiên}=<<h_walk>>,\\quad H_{hồi\\ quy}=<<h_meanrev>>,\\quad H_{quán\\ tính}=<<h_trend>>",
  "symbols": [
    {"sym": "X_{t+\\tau}-X_t", "say": "Chênh lệch giá sau τ phiên."},
    {"sym": "\\tau^{2H}", "say": "Chênh lệch tăng theo τ mũ 2H. H lớn thì càng để lâu càng đi xa."},
    {"sym": "H=0{,}5", "say": "Mốc không trí nhớ. Dưới mốc là hồi quy, trên mốc là quán tính."}
  ],
  "caption": "Hệ số Hurst đo trí nhớ của chuỗi giá: dưới 0,5 là hồi quy, trên 0,5 là quán tính. Code chạy thật trên 3 chuỗi mô phỏng.",
  "hashtags": ["quant", "Hurst", "chungkhoan", "dautu", "thongke", "QuanTik"],
  "allowed_literals": ["0,5", "2H", "3 chuỗi"]
}
```

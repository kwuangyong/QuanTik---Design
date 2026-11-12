# Tiêu chuẩn Kelly — đặt bao nhiêu là vừa?

Nguồn định nghĩa gốc: `glossary.json` id `kelly`: f* = W − (1 − W)/R, Half-Kelly = 0,5 × f* khi áp dụng thực tế.

## Công thức

$$f^*=W-\frac{1-W}{R}$$

- W: tỷ lệ thắng (0–1); R: lãi trung bình / lỗ trung bình.
- Tốc độ tăng trưởng log mỗi lần: g(f) = W·ln(1 + fR) + (1 − W)·ln(1 − f). f* là điểm cực đại của g.

## Tham số đẹp để minh hoạ

W = 55%, R = 1 → f* = 10%. 2.000 người × 500 lần đặt, seed 4. Trung vị tài sản cuối: ½ Kelly ≈ 6,5 lần, Kelly ≈ 12,2 lần, 2× Kelly ≈ 0,9 lần (lỗ dù có lợi thế), 4× Kelly ≈ gần về 0.

## Ngưỡng đọc nhanh (glossary)

- f* < 0: kỳ vọng âm, không nên tham gia.
- 0–20%: dùng Half-Kelly để giảm rủi ro thực tế.
- > 20%: kỳ vọng dương mạnh — vẫn nên chiết giảm.

## Ví dụ HOSE

- W và R ước lượng từ backtest luôn có sai số; đặt quá tay vì ước lượng lạc quan là rủi ro lớn nhất, nên thực tế dùng ½ hoặc ¼ Kelly.
- Kelly mô hình hoá cược độc lập; danh mục cổ phiếu tương quan (cùng ngành ngân hàng chẳng hạn) không độc lập.

## Sai lầm hay gặp

- Nghĩ “có lợi thế thì đặt càng nhiều càng giàu”. Vượt 2× Kelly thì tăng trưởng log âm.
- Dùng f* như tỷ trọng danh mục tối ưu (glossary: không mặc nhiên đúng).
- Quên đòn bẩy và phí giao dịch làm thay đổi R.

## video_defaults

```json
{
  "tag": "KELLY",
  "title": "Có lợi thế mà vẫn mất tiền? Bài toán Kelly",
  "hook": "Thắng {W} mỗi lần, có lợi thế rõ ràng. Vẫn có cách khiến bạn mất gần hết.",
  "kicker": "Kelly criterion",
  "beats": [
    "Công thức Kelly: tỷ lệ thắng trừ tỷ lệ thua chia cho tỷ lệ lãi lỗ. Code mô phỏng 2.000 người, mỗi người đặt {bets} lần, với bốn mức cược khác nhau.",
    "Với tỷ lệ thắng {W}, Kelly là {f_star} vốn mỗi lần. Đặt đúng mức đó, tài sản trung vị nhân {med_full}. Đặt gấp đôi, chỉ còn {med_double}.",
    "Bốn đường là bốn mức cược. Đường đỏ đặt {quad_kelly} mỗi lần: cùng lợi thế, nhưng gần như mất sạch.",
    "Bề mặt 3D là tốc độ tăng trưởng theo mức cược và tỷ lệ thắng. Có một đỉnh. Vượt qua đỉnh, càng đặt nhiều càng nghèo."
  ],
  "outputs": [
    {"label": "tỷ lệ thắng W", "key": "W"},
    {"label": "Kelly f*", "key": "f_star", "highlight": true},
    {"label": "trung vị, ½ Kelly", "key": "med_half"},
    {"label": "trung vị, Kelly", "key": "med_full"},
    {"label": "trung vị, 2× Kelly", "key": "med_double"},
    {"label": "trung vị, 4× Kelly", "key": "med_quad"}
  ],
  "takeaway": "Lợi thế chưa đủ. Quy mô vị thế quyết định bạn có sống sót để lợi thế phát huy hay không. Thực tế, dân quant thường dùng nửa Kelly.",
  "cta": "Xem Kelly và các tham số quản lý vốn trong phân tích Quant tại quantik.io.vn",
  "myth": "Có lợi thế thì càng đặt nhiều càng giàu nhanh.",
  "fact": "Sai. Cùng tỷ lệ thắng {W}, đặt {f_star} cho trung vị {med_full}; đặt {double_kelly} chỉ còn {med_double}.",
  "meme": {
    "format": "nobody-quant",
    "setup": "Bạn: “Mình thắng {W}, đặt hết vốn luôn!”",
    "punch": "Kelly: “Bình tĩnh. {f_star} thôi.”",
    "truth": "Đặt {quad_kelly} mỗi lần, tài sản trung vị gần như về 0 dù có lợi thế."
  },
  "story": [
    {"at": 0.2, "label": "Xuất phát", "say": "Bốn nhóm người, cùng lợi thế, chỉ khác mức cược."},
    {"at": 0.6, "label": "Tách đôi", "say": "Nhóm cược vừa phải tăng đều. Nhóm cược lớn rung lắc dữ dội."},
    {"at": 1.0, "label": "Kết quả", "say": "Kelly nhân {med_full}. Gấp đôi Kelly còn {med_double}. Gấp bốn gần như về 0."}
  ],
  "formula": "f^*=W-\\frac{1-W}{R}",
  "formula_parts": [
    "f^*",
    "f^*=W",
    "f^*=W-\\frac{1-W}{R}"
  ],
  "formula_numeric": "f^*=<<W>>-\\frac{1-<<W>>}{1}=<<f_star>>",
  "symbols": [
    {"sym": "W", "say": "Tỷ lệ thắng mỗi lần."},
    {"sym": "R", "say": "Lãi trung bình chia lỗ trung bình."},
    {"sym": "f^*", "say": "Tỷ lệ vốn đặt mỗi lần để tài sản tăng nhanh nhất về dài hạn."}
  ],
  "caption": "Có lợi thế vẫn có thể mất tiền nếu đặt quá tay. Kelly tìm mức cược tối ưu, và vì sao dân quant chỉ dùng một nửa. Code chạy thật, mô phỏng seed cố định.",
  "hashtags": ["quant", "kelly", "quanlyvon", "chungkhoan", "dautu", "QuanTik"],
  "allowed_literals": ["2.000", "1", "0", "bốn mức"]
}
```

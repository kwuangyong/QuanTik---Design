# whiteboard-math

Công thức viết dần ra trên bảng (kiểu Manim, có chấm bút), từng ký hiệu được khoanh và giải thích, rồi thay số thật vào và hiện kết quả lớn.

**Hợp với:** công thức ngắn, nhiều ý nghĩa trên mỗi ký hiệu: Kelly, Sharpe, GARCH, OU (nửa đời), VaR/CVaR. Người xem muốn “hiểu công thức”.

| # | Cảnh | Trường episode |
| --- | --- | --- |
| 1 | hook | `hook`, `kicker` |
| 2 | viết công thức qua các bước | `formula_parts` (mỗi phần là LaTeX dài dần), `beats[0]` |
| 3..k | khoanh ký hiệu | `symbols[i].sym` (LaTeX), `symbols[i].say` |
| k+1 | thay số + thẻ số nổi bật | `formula_numeric` (số dạng `<<key>>`), `beats[1]`, `outputs[highlight]` |
| k+2 | chart | `beats[2]` |
| k+3 | mang về | `takeaway` |
| k+4 | thẻ cuối | `cta` |

**Viết LaTeX:** matplotlib mathtext (không phải LaTeX đầy đủ): `\frac`, `\sqrt`, `\sum`, `\int`, `\overline`, `\mathrm{}`, chỉ số trên/dưới đều được; không có `\begin{align}`. Số trong LaTeX dùng `<<key>>` (không dùng `{key}` vì xung đột ngoặc nhọn); dấu phẩy thập phân tự đổi thành `{,}`.

Mẫu: `sample.mp4` (Sharpe). Thời lượng tối đa 75s.

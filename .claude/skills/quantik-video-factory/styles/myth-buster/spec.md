# myth-buster

“Bạn nghĩ X → thực ra Y”, chia đôi màn hình: nửa trên đỏ (hiểu lầm, bị gạch chéo), nửa dưới xanh (sự thật với số từ code), sau đó chart làm bằng chứng.

**Hợp với:** hiểu lầm phổ biến có thể bác bằng số: “VaR là lỗ tối đa”, “lãi nhiều là tốt hơn” (Sharpe), “có lợi thế thì đặt càng nhiều càng tốt” (Kelly), “P(tăng) 88% là 88% khả năng giá tăng” (HMM).

| # | Cảnh | Trường episode |
| --- | --- | --- |
| 1 | hook, chip “Hiểu lầm phổ biến” | `hook` |
| 2 | thẻ BẠN NGHĨ | `myth` |
| 3 | gạch hiểu lầm, thẻ THỰC RA trượt lên | `fact` (có placeholder số) |
| 4 | chart + “Bằng chứng từ code chạy thật” | `beats[2]` |
| 5 | 3D | `beats[3]` |
| 6 | mang về | `takeaway` |
| 7 | thẻ cuối | `cta` |

**Viết lời:** `myth` viết như người xem thật sự nghĩ (không bôi xấu). `fact` phải chứa ít nhất một số từ code. Không biến myth thành lời khuyên ngược (“vậy hãy bán…”).

Mẫu: `sample.mp4` (Kelly).

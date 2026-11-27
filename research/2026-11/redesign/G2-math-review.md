# G2 - Rà soát toán và thống kê văn bản báo cáo Quant

Ngày: 2026-11-27. Phạm vi: câu mẫu, glossary và diễn giải trong `G2-ux-spec.md`; văn bản hiển thị và dữ liệu mẫu trong `demo/index.html`.
Đối chiếu: `G2-quant-spec.md`, `frontend/src/lib/quant-interpretation-thresholds.ts`, `frontend/tests/fixtures/quant-report-sample.ts` (ca `complete`) và `frontend/tests/fixtures/analysis.ts` (nền của fixture: `research.*`, `evaluated_at`, `simulation_count`).

Mức độ:
- **Chặn**: sai số liệu, sai diễn giải, hoặc vi phạm ràng buộc 1-4 của G2-ux §0. Phải sửa trước Gate 3.
- **Nhỏ**: sửa chữ hoặc làm rõ, không đổi kết luận.

Số dòng: `ux` là `G2-ux-spec.md`, `demo` là `demo/index.html`, `fx` là `analysis.ts`, `qs` là `quant-report-sample.ts`.

---

## 1. Tóm tắt

- Không có câu ra lệnh mua hoặc bán. Các chỗ có "nên mua" đều là phủ định. Nút "Xem kế hoạch có điều kiện" đúng ràng buộc 4.
- Các số liệu chính của demo khớp fixture (xem mục 4).
- Tone của đa số module khớp `quant-interpretation-thresholds.ts`. Hai ngoại lệ: Monte Carlo (B7) và Chi phí (B8).
- Có 9 lỗi chặn (mục 2) và 17 lỗi nhỏ (mục 3). Phần lớn lỗi chặn tập trung ở HMM, nhận định tổng hợp, Monte Carlo và kế hoạch vị thế.

---

## 2. Lỗi chặn

### B1. HMM được gọi là "xác suất lọc" trong khi API không có loại xác suất

- Vị trí: `demo` dòng 526 (module 05), 525 (tone), mục glossary `filt` (dòng 281). `ux` dòng 236-239 (khung 05), dòng 360 (glossary #19). `ux` dòng 505 (mục 11) ghi chưa xác nhận filtered hay smoothed.
- Câu gốc: "Mô hình nhận ra pha tăng ở phiên cuối, với xác suất lọc 67%." và "Xác suất lọc chỉ dùng dữ liệu đến phiên cuối."
- Vấn đề: fixture không có `hmm.probability_kind`. Trường này chỉ được đọc ở `quant-radar-scoring.ts:50`, và `docs` ghi là chưa có trong BE. `G2-quant` §3 chỉ cho nhãn "filtered" khi `probability_kind === 'filtered'`. Ràng buộc 3 của `ux` §0 cấm khẳng định khi chưa xác nhận.
- Sửa đề xuất: "Mô hình gọi phiên cuối là pha tăng, độ chắc 67%." Chữ "lọc" chỉ hiện khi `probability_kind === 'filtered'`. Thiếu trường thì ghi "Loại xác suất chưa được cung cấp; không xác nhận là phiên cuối." Glossary #19 bỏ câu "Chỉ dùng dữ liệu đến phiên cuối" cho đến khi xác nhận.

### B2. Nhận định tổng hợp (module 16) trình bày dòng tiền và pha tăng như lý do ủng hộ

- Vị trí: `demo` dòng 577 ("Điểm hỗ trợ"), 576 (verdict). `ux` dòng 312-314 (mục 16). Fixture: `qs` dòng 24 có "Tín hiệu đang theo dõi" và "Bối cảnh pha tăng".
- Câu gốc: "Điểm hỗ trợ: pha tăng [05], dòng tiền nghiêng bên mua [06], sau phí còn +3,5% [11]." và "Báo cáo xếp tín hiệu đang theo dõi, chưa đủ điều kiện thực thi."
- Vấn đề: CMF (dòng tiền) và pha HMM được đưa vào như lý do mua, trái ràng buộc 2 và 4. Chữ "tín hiệu" không khớp nhãn BE "Mô hình: theo dõi" và bị cấm cho module mô tả.
- Sửa đề xuất: đổi "Điểm hỗ trợ" thành "Các điểm mô tả". Viết: "HMM phiên cuối gọi là pha tăng [05]; CMF dương chỉ là mô tả dòng tiền ước lượng [06]; dự báo sau phí dương nhưng chưa đủ điều kiện thời điểm [11, 15]." Verdict: "Mô hình đang ở trạng thái theo dõi, chưa đủ điều kiện thực thi." Sửa `qs` dòng 24 cùng lúc, hoặc tách văn bản mẫu khỏi fixture.

### B3. Histogram module 02 lấy nhầm nguồn và gọi là "lợi suất trong mẫu"

- Vị trí: `demo` dòng 508 (caption), dòng 583 (`histo()`). `ux` dòng 201-207 (module 02, nguồn ở dòng 207).
- Câu gốc: "Phân bố lợi suất trong mẫu: 3 nhóm (20%, 50%, 30%)."
- Vấn đề: 3 nhóm 20/50/30 là `research.distribution` của `fx` dòng 20. `G2-quant` §3 (mục 10) và mục 1 của bảng đường dẫn định nghĩa đây là phân phối cuối kỳ của Monte Carlo. Histogram lợi suất lịch sử của module 02 cần `_price_close` đủ dài. Fixture chỉ có 7 điểm giá (`fx` dòng 11, `qs`), không đủ để vẽ.
- Sửa đề xuất: module 02 không vẽ histogram, thay bằng "Chưa đủ chuỗi lợi suất để vẽ hình phân phối". Chuyển histogram 3 nhóm sang module 10, nhãn "phân phối giá cuối kỳ mô phỏng, không phải lợi suất lịch sử". Ghi rõ đây là 3 nhóm, không phải phân phối đầy đủ.

### B4. Câu "trong 100 lần mô phỏng" sai số lần mô phỏng

- Vị trí: `demo` dòng 298 (dải Rủi ro lớn nhất), dòng 342 và các dòng quanh (thẻ Monte Carlo), dòng 611 và thẻ nhóm C (`8/100`). `ux` dòng 194-195 (module 10), dòng 77 (wireframe, "8% khả năng").
- Câu gốc: "Trong 100 lần mô phỏng, 62 lần giá sau 3 phiên cao hơn hôm nay, 38 lần thấp hơn hoặc bằng." và "có 8 lần lỗ hơn 3%".
- Vấn đề: `fx` dòng 18 có `simulation_count: 1000`. Câu trên nói số lần là 100, sai. 62 và 8 là tỷ lệ phần trăm (`prob_up`, `prob_loss_gt_3pct`), không phải đếm trên 100 lần. `G2-quant` §4 cấm dùng `simulation_count` làm mẫu số nếu chưa đối chiếu.
- Sửa đề xuất: "Trong mô phỏng, khoảng 62% kịch bản cho giá sau 3 phiên cao hơn hôm nay; khoảng 8% kịch bản lỗ hơn 3% khi chờ." Khi cần nêu số lần, lấy từ `research.simulation_count`. Lưới 100 chấm ghi "mỗi chấm là 1% kịch bản".

### B5. Lỗ 3 triệu được ghi là "1% tài sản" và "trên vốn mẫu 100 triệu", hai câu mâu thuẫn

- Vị trí: `demo` dòng 301 (kv "Lỗ ước tính nếu kế hoạch sai"), dòng 555-557 (trade plan, "VND, 1% tài sản"). `ux` dòng 282-283 (module 12), dòng 508 (mục 11, "Vốn ví dụ 100 triệu").
- Câu gốc: "3 triệu trên vốn mẫu 100 triệu đồng" và "Lỗ ước tính 3.000.000 VND (1% tài sản)".
- Vấn đề: 3 triệu / 100 triệu = 3%, không phải 1%. Fixture `fx` dòng 34 và `qs` dòng 53: `pos.max_loss` 3.000.000, `pos.risk_pct_nav` 1, `pos.pct_acct` 33,33, `pos.value` 100.000.000. Suy ra tài sản ngầm 300 triệu (3 triệu = 1% tài sản; 100 triệu = 33,33% tài sản). "100 triệu" là giá trị vị thế, không phải tài sản. Code `moduleAnalysis` dùng 100 triệu làm khoản minh họa, nên không được ghép với "1% tài sản".
- Sửa đề xuất: dùng tài sản 300 triệu theo fixture: "3 triệu, tương đương 1% tài sản." Hoặc dùng ví dụ 100 triệu: "3 triệu, tương đương 3% khoản 100 triệu." Thêm số cổ phiếu để giải thích: "1.000 cổ phiếu × (100.000 − 97.000) = 3 triệu."

### B6. Module 07 mở đầu bằng hướng của momentum

- Vị trí: `demo` dòng 544 (verdict module 07). `ux` dòng 263 (kết luận module 07). `G2-quant` dòng 185 cấm đúng cụm "đà nghiêng về tăng".
- Câu gốc: "Đà gần đây nghiêng về tăng, nhưng bằng chứng ngoài mẫu còn yếu."
- Vấn đề: câu kết luận đưa hướng giá từ momentum. Ràng buộc 2 và `ux` dòng 262 ("Momentum không bao giờ thành tín hiệu") cấm cách trình bày này.
- Sửa đề xuất: "Điểm động lượng 20 phiên là 0,4 (dương), chỉ là mô tả. Bằng chứng ngoài mẫu còn yếu."

### B7. Tone "Thận trọng" của Monte Carlo dựa trên ngưỡng không có trong code

- Vị trí: `demo` dòng 496 (`tone:'caution'`, module 10). `ux` dòng 193 (module 10), dòng 152 (§4.1: tone chỉ dùng ngưỡng trong `thresholds.ts`).
- Câu gốc: "Thêm `caution` nếu `lock_risk.prob_loss_gt_3pct` có mặt và > 0 ... không đặt cutoff riêng."
- Vấn đề: `quant-interpretation-thresholds.ts` có `simulation_risk: { balancedUpPct: 50 }`, không có ngưỡng nào cho lỗ khi chờ. Đặt "caution" khi lớn hơn 0 là tạo ngưỡng mới ngầm, trái nguyên tắc §4.1.
- Sửa đề xuất: một trong hai. (a) Thêm ngưỡng vào `thresholds.ts` (cần quyết định sản phẩm). (b) Đặt tone MC là `neutral`, giữ nguyên câu "có 8% kịch bản lỗ hơn 3%". Ghi lựa chọn vào §4.1.

### B8. Chi phí có chip "Ổn theo mốc" cho một dự báo

- Vị trí: `demo` dòng 559 (`tone:'ok'`, module 11). `ux` dòng 144 (§4.1, ok khi sau phí dương), dòng 152 (không gán ok cho dự báo), dòng 289 (module 11).
- Câu gốc: tone `ok` với nhãn "Còn dương sau phí" cho dự báo net +3,5%.
- Vấn đề: `ux` tự mâu thuẫn. Dòng 144 cho `ok` khi sau phí dương; dòng 152 cấm gán `ok` cho dự báo. Trong nhóm Mua bán, chip xanh trên dự báo dương dễ bị đọc như "nên mua", gần với ràng buộc 4.
- Sửa đề xuất: đổi tone module 11 thành `neutral`, nhãn "Sau phí: +3,5%, mốc 0". Sửa `ux` §4.1 để bỏ ngoại lệ hoặc nêu rõ không dùng cho dự báo.

### B9. R:R sau chi phí 1,92 không suy ra được từ các số hiển thị

- Vị trí: `demo` dòng 434 (glossary `rr`), dòng 553-557 (trade plan, "còn 1,92 sau chi phí"). `ux` dòng 282 (module 12).
- Câu gốc: "Tỷ lệ lãi/lỗ 3,33 (còn 1,92 sau chi phí)."
- Vấn đề: 3,33 đúng: (110.000 − 100.000) / (100.000 − 97.000) = 3,33. Nhưng với chi phí khứ hồi 0,6% (600 đồng mỗi cổ phiếu ở giá 100.000), công thức đơn giản cho (10.000 − 600) / (3.000 + 600) = 2,61, không phải 1,92. Công thức `rr_net_cost` của BE chưa được ghi (`G2-quant` §8 mục 7).
- Sửa đề xuất: chưa đưa 1,92 vào UI cho đến khi BE công bố công thức. Đề xuất BE ghi công thức trong `docs`. Nếu giữ, thêm "theo công thức của báo cáo".

---

## 3. Lỗi nhỏ

| # | Vị trí | Câu gốc (trích) | Vấn đề | Sửa đề xuất |
|---|---|---|---|---|
| N1 | `demo` 491; `ux` 186 | "dao động cao hôm nay còn ảnh hưởng nhiều phiên sau" | Không có ngưỡng biến động trong `thresholds.ts`, từ "cao" không có căn cứ | "Dao động hôm nay khoảng 2% mỗi phiên; cú sốc còn ảnh hưởng vài phiên sau." |
| N2 | `demo` 422; `ux` 362 và 228 | "Từ 0,3 trở xuống" (demo); "Dưới 0,3" (`ux` glossary #21) | Biên 0,3 không nhất quán giữa ba chỗ | Thống nhất theo `quant-interpretation.ts` (cần đọc để xác nhận dấu so sánh) |
| N3 | `ux` 350 | "VaR / CVaR: Mức lỗ có thể gặp trong tình huống xấu" | Định nghĩa không đúng | "VaR: mức lỗ không bị vượt với xác suất đã chọn trong khoảng thời gian đã chọn. CVaR: lỗ trung bình trong các trường hợp vượt VaR. Báo cáo chưa có hai số này." |
| N4 | `demo` 430; `ux` 374 | "P95 thì ngược lại" | Mơ hồ | "P95: 95 trong 100 kịch bản thấp hơn mức này." |
| N5 | `ux` 380 | "Cách chia vốn theo tỷ lệ thắng" | Kelly cần cả tỷ lệ thắng và tỷ lệ lãi/lỗ | "Cách chia vốn theo tỷ lệ thắng và tỷ lệ lãi/lỗ. Chỉ hiện khi báo cáo bật; không là khuyến nghị." |
| N6 | `demo` 432; `ux` 376 | "Chi phí hai chiều: Phí mua cộng phí bán" | Định nghĩa quá hẹp. `G2-quant` §2.1: API chỉ có tổng, có thể gồm thuế và trượt giá | "Tổng chi phí hai chiều theo giả định của báo cáo; có thể gồm phí, thuế và trượt giá. BE không tách." |
| N7 | `demo` 546 | "Thứ hạng trong rổ 80%" | `rank_pct` 80 hiện như xác suất | "Vị trí 80 trên 100 trong rổ." |
| N8 | `demo` 354 | "Lỗ tối đa khi chờ -4%" | "Tối đa" gợi trường hợp xấu nhất. Thống kê của `max_dd_lock_pct` chưa rõ (trung vị, trung bình hay phân vị) | Ghi thống kê theo BE, hoặc "Sụt giảm khi chờ trong mô phỏng (theo BE)". |
| N9 | `demo` 298 | "Rủi ro lớn nhất: ..." | Không có quy tắc chọn; cùng dòng có cả sụt giảm lịch sử 12% | "Rủi ro nổi bật" kèm quy tắc chọn (ví dụ module nhóm C đầu tiên có nhãn Thận trọng hoặc Rủi ro cao). |
| N10 | `demo` 342 | "Chín trong mười lần, giá nằm trong dải P05 đến P95." | Tỷ lệ áp dụng cho từng phiên, không cho cả đường | "Ở mỗi phiên, theo mô phỏng, 9 trong 10 lần giá nằm trong dải P05 đến P95." |
| N11 | `demo` 512 | "Sức chứa tham chiếu 20.000 cổ phiếu" | Cơ sở chưa rõ (`G2-quant` §8 mục 9) | Thêm "(cơ sở theo BE)" hoặc bỏ đến khi rõ. |
| N12 | `ux` 145 | Liệt kê Sharpe, CMF, Hurst, HMM là "không có ngưỡng tốt/xấu" | `thresholds.ts` có `sharpeFair`, `sharpeStrong`, `neutralFlow`, `randomHurst`, `majorityPct` | Sửa ví dụ: "neutral: không có tone ok hoặc risk, dù có mốc đọc (Sharpe, Hurst, HMM, CMF)." |
| N13 | `demo` 537; `ux` 254 | ARIMA có chip `ok` "Ổn theo mốc" trong nhóm Triển vọng | Chip xanh trên chẩn đoán ADF dễ bị đọc là triển vọng | Ghi "Chẩn đoán, không phải dự báo" ngay trên chip, hoặc đổi nhãn sang "Mô tả". Ngưỡng 0,05 khớp `adfSignificance`. |
| N14 | `demo` 537; `ux` 255 | "Chuỗi lợi suất đủ ổn định để mô hình ARIMA đọc được." | ADF chỉ bác bỏ nghiệm đơn vị ở mức 5%, không đảm bảo ARIMA dùng được | "ADF p 0,012 bác bỏ giả thuyết không ổn định ở mức 5%." |
| N15 | `demo` 610; `demo` 521; `ux` 229 | "dòng tiền nghiêng bên mua ... Cả hai chỉ là mô tả quá khứ"; "CMF 0,21 trên 0 là áp lực mua" | CMF là ước lượng từ phiên gần đây, không phải quá khứ. "Áp lực mua" là cách đọc mua | "CMF dương (0,21): giá đóng cửa gần đỉnh phiên hơn. Chỉ là mô tả." Sửa "quá khứ" thành "trong giai đoạn quan sát". |
| N16 | `demo` 526; `ux` 236 | "Mô hình nhận ra pha tăng" | Động từ khẳng định hơn mức mô hình | "Mô hình gọi phiên cuối là pha tăng." |
| N17 | `ux` 77 | "mô phỏng có 8% khả năng lỗ >3%" | Thiếu "theo mô phỏng", không đồng bộ với B4 | "Theo mô phỏng, khoảng 8% kịch bản lỗ hơn 3% khi chờ." |
| N18 | `demo` 514-516 (module 01); `demo` 610 (thẻ nhóm A) | "Lợi nhuận trên rủi ro khá" | Đúng ngưỡng nhưng `sharpe` không ghi kỳ tính (năm hay tháng) | Ghi "Sharpe (quy đổi năm, theo BE)" khi BE xác nhận. |
| N19 | `demo` 588-591; fixture `fx` 19, `analysis` | Hiện cùng lúc ARIMA +0,6%, MC P50 +2,9%, ensemble +4,1% | Ba dự báo 3 phiên khác nhau, không có chú thích. `research.drawdown` chỉ đến -3% trong khi `max_dd_pct` là -12% | Thêm chú thích cạnh module 03 và 09, hoặc sửa fixture. Ghi rõ đây là dữ liệu mẫu. |
| N20 | `qs` dòng 18 | Nhãn factor "An toàn T+2" | T+2 chưa xác minh (`G2-quant` §1). Khi dùng fixture làm UI, phải thay bằng placeholder | Đổi nhãn thành "An toàn thanh toán [chờ Haiku xác minh]". |
| N21 | `demo` 588-591 | Nhãn "+1, +2, +3" cho ba giá ARIMA | Chưa xác nhận mảng `forecast.prices` ứng với phiên 1-3 (`G2-quant` §8 mục 10) | Giữ nhãn, thêm "theo BE, chưa xác nhận vị trí phiên" vào ghi chú nội bộ. |

---

## 4. Đã kiểm, không có lỗi

- α + β = 0,09 + 0,87 = 0,96. Chu kỳ bán rã = ln(0,5) / ln(0,96) ≈ 17,0 phiên, khớp 17.
- Độ lệch -0,49 âm nghĩa là đuôi trái dài (đúng cách đọc). Độ nhọn dư 2,44 > 0. `is_gaussian` = false. Tone caution của module 02 đúng ngưỡng `normalExcessKurtosis = 0`.
- ADF p = 0,012 < 0,05 (`adfSignificance`). Tone ok đúng.
- Chi phí: 4,1 − 0,6 = 3,5.
- R:R gộp: (110.000 − 100.000) / (100.000 − 97.000) = 3,33.
- Lỗ tại cắt lỗ: 1.000 × 3.000 = 3 triệu. Sụt giảm 12% từ 100 triệu còn 88 triệu.
- Thanh khoản: 120 tỷ VND, `pass` = true, tone ok đúng.
- Sharpe 1,2 nằm giữa mốc 1 và 2. ER 0,58 > 0,3. Hurst 0,61 > 0,5. Momentum 0,4 > 0. Tone đúng.
- Độ phủ 80 < 100 nên caution. Dữ liệu PASS nên ok. `executable` = false nên "Chưa đủ điều kiện".
- Tổng HMM: 67 + 24 + 9 = 100. Mốc đa số 50 khớp `majorityPct`.
- Cone đơn điệu p05 ≤ p25 ≤ p50 ≤ p75 ≤ p95, trùng `fx` dòng 19.
- "Năm qua" đúng: `research.start` 2025-10-30 đến `end` 2026-10-16, 252 quan sát.
- "Đánh giá 2026-10-17 08:00 UTC" khớp `evaluated_at` trong `fx` dòng 7.
- Giá 102.000 khớp giá đóng cửa cuối của `_price_close` (phiên 2026-10-16).
- Tóm tắt nhóm (thẻ lớp 1) đúng quy tắc: nhóm C caution, A neutral, B caution, D "Chưa đủ điều kiện".
- Từ cấm (sẽ, chắc chắn, đảm bảo, mua ngay, bán ngay, nên mua, nên bán, dấu chấm than): chỉ xuất hiện trong dạng phủ định hoặc trong danh sách cấm của `ux` §4.3. Không có câu mệnh lệnh.

---

## 5. Ghi chú cho bước tiếp theo

- Trước Gate 3, cần BE xác nhận: `hmm.probability_kind` (B1), công thức `rr_net_cost` (B9), thống kê của `max_dd_lock_pct` (N8), vị trí `forecast.prices` (N21), cơ sở `capacity_shares` (N11).
- Quyết định sản phẩm: B7 (thêm ngưỡng cho lỗ khi chờ, hay để neutral) và B8 (chip cho dự báo sau phí).
- Phạm vi không kiểm: nội dung `quant-interpretation.ts` và `quant-radar-scoring.ts` chỉ được tham chiếu, không đọc toàn bộ. Các chỉ báo CMF, MA200 và momentum chưa đối chiếu với `docs/QUANT-RESEARCH-2026-11.md`.

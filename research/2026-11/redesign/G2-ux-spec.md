# G2 - Đặc tả UX báo cáo Quant (thiết kế, chưa triển khai)

Ngày: 2026-11-27. Gate 2. Không sửa mã sản phẩm trong `frontend/`. Đầu vào: `G1-cognition-ux.md`, `G1-quant-tech.md`, các tệp `quant-*.tsx`, `quant-reader.ts`, `quant-interpretation*.ts`, fixture `quant-report-sample.ts` (ca `complete`), `docs/DESIGN.md`, `globals.css`. Demo kèm theo: `demo/index.html` (dữ liệu mẫu lấy từ fixture `complete`, không phải dữ liệu thật).

Quyết định đã duyệt (giữ nguyên): Kết luận 30 giây, rồi C. Rủi ro, A. Hiện trạng, B. Triển vọng, D. Mua bán, kèm dải "Có tin được báo cáo không?". Ba lớp đọc: 30 giây, 3 phút, Chuyên sâu (đủ 16 module).

Ràng buộc bắt buộc (kiểm lại ở mỗi đợt Gate 3):
1. Không con số hay tín hiệu nằm ngoài dữ liệu API thật. Thiếu thì hiện "—" và thẻ "Chưa đủ dữ liệu", không bao giờ là 0 hay "trung tính".
2. Momentum, MA200, CMF và pha HMM không trình bày như lý do mua hay điểm hỗ trợ (nghiên cứu nội bộ ghi chúng trượt OOS ở VN). Chúng chỉ mô tả quá khứ, kèm câu "chưa chứng minh dự báo được ngoài mẫu". Không dùng chữ "tín hiệu", "điểm hỗ trợ", "đà nghiêng về tăng" cho các module này.
3. HMM chỉ được gọi là "xác suất lọc" khi `hmm.probability_kind === 'filtered'`. Thiếu trường này thì hiện "Chưa rõ loại xác suất (lọc/làm mượt)" và module chỉ mô tả. Không dùng nhãn làm mượt (smoothed) của lịch sử làm căn cứ.
4. Không câu ra lệnh mua/bán. Nút chính là "Xem kế hoạch có điều kiện", không có "Mua ngay".
5. Không gamification: không confetti, huy hiệu, bảng xếp hạng thúc giao dịch, đếm ngược, streak, số người đang xem.
6. Nội dung pháp lý (T+, biên độ giá, phí, thuế) là placeholder `[chờ Haiku xác minh]`. Miễn trừ đánh dấu `[chờ rà soát pháp lý VN]`.

---

## 1. Kiến trúc thông tin

### 1.1 Từ 16 module sang 4 câu hỏi (đã duyệt)

| Nhóm | Câu hỏi | Module (tên trong mã) | Số cũ |
|---|---|---|---|
| Kết luận | Mô hình nói gì hôm nay? | `decision` + tóm tắt `quantSummary` | 15 |
| C. Rủi ro | Có thể mất bao nhiêu? | `garch`, `simulation_risk`, `distribution`, `liquidity` | 04, 10, 02, 13 |
| A. Hiện trạng | Cổ phiếu đang thế nào? | `statistics`, `technical`, `hmm`, `context` | 01, 06, 05, 08 |
| B. Triển vọng | Giá có thể đi đâu? | `arima`, `directional_alpha`, `agreement` | 03, 07, 09 |
| D. Mua bán | Nếu hành động thì thế nào? | `trade_plan`, `costs`, `decision` | 12, 11, 15 |
| Dải tin cậy | Có tin được báo cáo không? | `data_quality`, `commentary` | 14, 16 |

Ghi chú: `decision` xuất hiện hai lần có chủ ý. Ở đầu trang là thẻ Kết luận (hành động và lý do của backend, giữ nguyên chữ). Ở nhóm D là phần điều kiện thực thi chi tiết. Cùng một nguồn dữ liệu, không tính lại. Ba module chạm nhiều nhóm (`costs`, `liquidity`, `hmm`) được đặt theo câu hỏi chính của chúng; số thứ tự 01-16 vẫn hiện nhỏ ở lớp Chuyên sâu để khớp tài liệu hiện có.

### 1.2 Ba lớp đọc

| Lớp | Tên trên giao diện | Thời gian | Chứa | Mặc định |
|---|---|---|---|---|
| 1 | Tóm tắt (30 giây) | 30 s | Thẻ kết luận, 1 dòng rủi ro lớn nhất, 4 thẻ nhóm với nhãn trạng thái, dải tin cậy, miễn trừ | Luôn hiện đầu trang |
| 2 | Hiểu vì sao (3 phút) | 3 phút | 4 nhóm theo thứ tự C, A, B, D; mỗi module một thẻ 4 phần (Kết luận, Vì sao, tối đa 3 số, Lưu ý) và 1 hình nhỏ | Cuộn xuống; mỗi nhóm có thể thu |
| 3 | Chuyên sâu | tùy | 16 module hiện có (bảng chỉ số, "Ý nghĩa & phân tích", 3D, điều hướng 16 nút) | Sau nút "Xem toàn bộ phân tích" |

Bộ chuyển "Tóm tắt / Hiểu vì sao / Chuyên sâu" ở đầu trang (3 nút, `role="tablist"` không bắt buộc; dùng nhóm `aria-pressed`). Lựa chọn lưu bằng `localStorage` (bọc `try/catch`, mặc định Tóm tắt khi không đọc được). Chuyển lớp không tải lại trang và giữ vị trí cuộn (scroll anchoring).

---

## 2. Luồng từ "Quét toàn sàn"

Luồng hiện có (đã đọc `screener.tsx`, `analysis.tsx`, `quant-request.tsx`): `/screener` quét -> hai bảng "5 mã xếp hạng cao nhất" và "5 mã cần thận trọng" -> bấm mã -> `/analysis?symbol=...&target_session=...` -> chọn phiên và xem tiêu chí -> gửi yêu cầu -> job -> báo cáo.

Thiết kế giữ nguyên các bước kỹ thuật này, chỉ thêm ba thứ: (a) câu dẫn ở mỗi chỗ chuyển, (b) báo cáo mở ở lớp Tóm tắt, (c) đường quay lại bảng quét với đúng phiên.

```
[1] /screener (trang mở đầu)        "Quét toàn sàn" -> nút Quét
        Câu dẫn mới: "Bảng xếp hạng là bước lọc. Xếp hạng không phải khuyến nghị mua."
[2] Kết quả quét: 2 bảng x 5 mã      Mỗi dòng có nút "Mở báo cáo Quant" (không "Mua")
        Dòng mã: mã | điểm nhóm | nhãn cột có chữ; không tô đỏ/xanh thay cho nhãn
[3] /analysis?symbol=FPT&target_session=2026-10-16
        Thanh ngữ cảnh: "Từ Quét toàn sàn, phiên 2026-10-16"  [Quay lại bảng quét]
        Bước xem tiêu chí (giữ) -> "Chạy phân tích" (giữ, không giả tiến trình)
[4] Báo cáo, lớp Tóm tắt -> (Hiểu vì sao) -> (Chuyên sâu)
        Tour 4 bước chỉ hiện ở lần đầu; có nút "Cách đọc" ở thanh đầu
```

Điểm nhấn: người từ bảng "cần thận trọng" mở báo cáo vẫn thấy cùng một bố cục và cùng thứ tự C trước D. Không có biến thể hiển thị "mua" riêng cho nhóm xếp hạng cao.

### 2.1 Wireframe text - desktop 1440 (cột nội dung 1120 px, lưới 12 cột, khoảng cách 24)

```
+--------------------------------------------------------------------------------------+
| QuanTik   Dashboard | Quét toàn sàn | Phân tích Quant         [Giảm hiệu ứng] [?] [Sáng/Tối] |
+--------------------------------------------------------------------------------------+
| Từ Quét toàn sàn · phiên 2026-10-16            [Quay lại bảng quét]                  |
| FPT · Báo cáo Quant · dữ liệu đến 2026-10-16        Mức đọc: (Tóm tắt)(Hiểu vì sao)(Chuyên sâu) |
+---------------------------------------------------+----------------------------------+
| KẾT LUẬN HÔM NAY                                  | Dải tin cậy                      |
| Mô hình: theo dõi                                 | Dữ liệu: Đạt · 95/100            |
| Chờ hoàn tất điều kiện. Lý do: chưa đủ điều kiện  | 80% mô hình tham gia             |
| thời điểm vào lệnh.                               | 0 cảnh báo · [Xem chi tiết]      |
| Rủi ro lớn nhất: theo mô phỏng, khoảng 8 trong 100 lần lỗ >3%   |                                  |
| khi chờ cổ phiếu về. [chờ Haiku xác minh: T+]     |                                  |
| Miễn trừ ... [chờ rà soát pháp lý VN]             |                                  |
+---------------------------------------------------+----------------------------------+
| 4 THẺ NHÓM (1 hàng x 4 cột, thứ tự đọc C, A, B, D)                                    |
| [C Rủi ro: Thận trọng] [A Hiện trạng: Mô tả] [B Triển vọng: Mô tả] [D Mua bán: Chưa   |
|  1 câu + 1 số         ] [ 1 câu + 1 số       ] [ 1 câu + 1 số      ]  đủ điều kiện]  |
+--------------------------------------------------------------------------------------+
| (lớp 2) C. RỦI RO - "Có thể mất bao nhiêu?"                                          |
|  [GARCH ][Monte Carlo + lưới 100 chấm ][Phân phối ][Thanh khoản ]  (2 cột x 2 hàng)  |
| A. HIỆN TRẠNG ... B. TRIỂN VỌNG ... D. MUA BÁN (thang giá) ...                        |
+--------------------------------------------------------------------------------------+
| (lớp 3) [Xem toàn bộ phân tích] -> nav 16 nút + 16 module hiện có                    |
+--------------------------------------------------------------------------------------+
```

### 2.2 Wireframe text - mobile 375 (gutter 16, một cột, chạm >= 44 px)

```
[≡] QuanTik        [?] [☾]
FPT · Báo cáo Quant
Dữ liệu đến 2026-10-16
(Tóm tắt)(Hiểu vì sao)(Chuyên sâu)   <- cuộn ngang được nếu hẹp, không cắt chữ
---------------------------------
KẾT LUẬN HÔM NAY
Mô hình: theo dõi
Chờ hoàn tất điều kiện.
Rủi ro lớn nhất: ...
[Dải tin cậy: Đạt · 95/100  v]   <- thu gọn
---------------------------------
C Rủi ro   [Thận trọng]  1 câu  >
A Hiện trạng [Mô tả]     1 câu  >     <- 4 hàng, mỗi hàng là nút mở lớp 2 của nhóm
B Triển vọng [Mô tả]     1 câu  >
D Mua bán  [Chưa đủ ĐK]  1 câu  >
---------------------------------
Miễn trừ ngắn ... [chờ rà soát pháp lý VN]
```
Lớp 2 trên mobile: mỗi nhóm là một accordion (một nút `aria-expanded`), trong đó mỗi module là một thẻ dọc không cao hơn khoảng một màn hình. Tooltip thuật ngữ thành bottom sheet (mục 7.3).

---

## 3. Trạng thái dữ liệu: đủ, một phần, thiếu, lỗi

Nguồn trạng thái: `moduleAvailability()` hiện có ("Có dữ liệu", "Dữ liệu một phần", "Thiếu dữ liệu", "Đã tắt") và `section.status` (`AVAILABLE`, `UNAVAILABLE`, `DISABLED`) cùng `readableMetrics()` (loại `error`, `disabled`). Năm ca fixture: `complete`, `partial`, `unavailable`, `disabled`, `failed`.

| Trạng thái | Điều kiện | Thẻ module | Thẻ nhóm / Kết luận | Cấm |
|---|---|---|---|---|
| Đủ | `AVAILABLE`, mọi số trong `moduleGuides[m].metrics` hợp lệ | Khung 4 phần đầy đủ, chip tone theo ngưỡng | Nhãn theo quy tắc mục 4.1 | - |
| Một phần | `AVAILABLE` nhưng thiếu một số số | Vẫn hiện khung; số thiếu là "—" kèm "chưa công bố"; chip thêm huy hiệu "Một phần"; câu Kết luận chỉ dùng số có thật | Nhãn nhóm lấy từ module còn đủ; ghi "x/y module đủ" | Suy số thiếu, tính lại số, ẩn mất dòng |
| Thiếu | `UNAVAILABLE` hoặc không có số hợp lệ | Thẻ "Chưa đủ dữ liệu": vì sao (mã lý do qua `analysisReason`), hệ quả ("kết luận của nhóm này kém chắc hơn"), việc có thể làm ("Chạy lại với phiên khác" hoặc "Xem danh sách thiếu") | Nhãn "Chưa đủ dữ liệu" khi quá nửa module của nhóm thiếu | Ô trống, số 0, "trung tính" |
| Tắt | `DISABLED` | Thẻ "Đã tắt" + lý do; không tính vào độ phủ | Như trên | Hiện số cũ còn trong bộ nhớ |
| Lỗi | Có `error` trong metric, job `FAILED`, hoặc tải báo cáo lỗi | Thẻ "Không tính được" + mã lỗi qua `analysisReason`, nút "Thử lại" nếu job cho phép | Kết luận chính vẫn lấy `decision` của backend; nếu `decision` lỗi: "Chưa có kết luận" | Dùng fixture/mẫu thay thế |
| Đang chạy | Job `QUEUED`/`RUNNING` | Tên bước thật của job (theo `jobStatuses`); không thanh phần trăm giả | Khung xương (skeleton) tĩnh, không nhấp nháy | Giả tiến trình |
| Chưa bắt đầu | Trước khi chạy | 2 câu: "Báo cáo trả lời 4 câu hỏi nào", ví dụ mã, hạn mức còn lại | - | - |

Quy tắc bất biến (khớp `quant-module-samples.test.cjs`): giá trị 0 và `false` là dữ liệu thật và phải hiện ("0", "Không"). Ca `unavailable`, `disabled`, `failed` phải cho "—" ở mọi ô số của thẻ mới, kể cả khi bộ nhớ vẫn giữ số cũ như 100.000, 412,6, 24,5.

---

## 4. Ngôn ngữ trạng thái và quy tắc sinh văn bản

### 4.1 Nhãn trạng thái (chip) và thẻ nhóm

Năm nhãn, mỗi nhãn có màu, biểu tượng và chữ (không dựa vào màu):

| Tone | Nhãn | Biểu tượng | Dùng khi |
|---|---|---|---|
| `ok` | Ổn theo mốc | dấu tích | Chỉ khi có điều kiện cụ thể đã nằm trong ngưỡng của chẩn đoán hoặc kiểm tra (ví dụ ADF p dưới 0,05; thanh khoản `pass=true`; dữ liệu `PASS`). Không dùng cho dự báo, kể cả dự báo sau phí |
| `neutral` | Mô tả | dấu ngang | Module chỉ mô tả, hoặc không có ngưỡng trong `quant-interpretation-thresholds.ts`. Có mốc đọc (Sharpe, Hurst, HMM, CMF) nhưng mốc đó không tạo tone `ok` hay `risk` |
| `caution` | Thận trọng | tam giác | Có điều kiện cảnh báo trong ngưỡng (persistence từ 0,9; kurtosis dư trên 0; độ phủ dưới 100%; không đạt Gaussian) |
| `risk` | Rủi ro cao | hình thoi đặc | Chỉ khi vượt giới hạn cứng (persistence từ 1; dữ liệu `FAIL`; thanh khoản `pass=false`; sau phí âm) |
| `nodata` | Chưa đủ dữ liệu | dấu hỏi | Thiếu, tắt, lỗi |

Nhãn nhóm (thẻ lớp 1) = mức nặng nhất trong các chip có tone của nhóm theo thứ tự `risk > caution > nodata(nếu quá nửa) > neutral`. Thẻ nhóm không bao giờ hiện `ok`, để một dòng xanh không bị đọc là "nên mua". Nhãn nhóm D có thể là "Chưa đủ điều kiện" (từ `decision.executable=false`) dùng đúng chữ backend.

Tone chỉ được dùng ngưỡng đã có trong `quant-interpretation-thresholds.ts` (file ghi rõ chỉ là mốc đọc, không đưa vào điểm hay cổng hành động). Vì vậy: không gán `ok`/`risk` cho AIC, beta, điểm chất lượng hay dự báo. Không có ngưỡng thì chip là "Mô tả". Hệ quả: Monte Carlo (không có ngưỡng cho lỗ khi chờ) và Chi phí (dự báo sau phí) dùng `neutral`. Muốn có `caution` cho lỗ khi chờ thì phải thêm ngưỡng vào `thresholds.ts` trước (quyết định sản phẩm).

### 4.2 Khung 4 phần cho mọi thẻ module

```
[chip tone: biểu tượng + nhãn chữ]   Tên dễ hiểu (Tên kỹ thuật)        [số cũ 05]
KẾT LUẬN   1 câu, <= 20 từ, có động từ, tối đa 1 thuật ngữ
VÌ SAO     <= 2 câu: số so với mốc, nói bằng nghĩa thường
CON SỐ     <= 3 số: nhãn dễ hiểu | giá trị | mốc | chú thích 1 dòng
LƯU Ý      1 câu giới hạn hoặc điều kiện làm kết luận sai
[Xem chi tiết (mở module ở lớp 3)] [thuật ngữ gạch chân đứt]
```

### 4.3 Mức đọc lớp 6-8 cho tiếng Việt (quy tắc kiểm được bằng máy)

Không có thang Flesch-Kincaid chuẩn cho tiếng Việt. Dùng bộ quy tắc thay thế, kiểm tự động trong `quant-plain.test.cjs` (đợt 1):
1. Câu Kết luận <= 20 từ (đếm theo khoảng trắng). Câu Vì sao và Lưu ý <= 25 từ mỗi câu, tối đa 2 câu.
2. Tối đa 1 thuật ngữ mỗi câu; thuật ngữ nằm trong `glossary.ts` và gạch chân lần đầu mỗi nhóm.
3. Số: dùng định dạng Việt (1.234,5), làm tròn theo `number()` hiện có; giá VND ở lớp 1-2 làm tròn nghìn.
4. Cấm: "sẽ", "chắc chắn", "đảm bảo", "nên mua", "nên bán", "mua ngay", "bán ngay", dấu chấm than, emoji. Từ thay: "có thể", "trong mô phỏng", "dựa trên quá khứ".
5. Số đi cùng đơn vị và mốc ("1,2, mốc 1 là khá"). Mỗi thẻ có đủ cả hai phía (tốt và xấu) cùng cỡ chữ.
6. Kiểm thử người: 5 người không nền tài chính đọc 1 thẻ, trả lời "nói gì, rủi ro gì, sẽ làm gì"; đạt khi >= 4/5 đúng (từ G1).

---

## 5. Khung văn bản cho 16 module

Mọi nhánh dưới đây dùng đúng ngưỡng trong `interpretationThresholds` (ký hiệu `T.nhóm.khóa`). Ví dụ số lấy từ fixture `complete` và chỉ là minh họa. Văn bản sinh bằng hàm thuần mới `quantPlain(name, report)` đọc cùng `readableMetrics()` như `moduleAnalysis()`, không sửa `quant-interpretation.ts`.

### Nhóm C. Rủi ro (đọc trước)

**04 GARCH - "Dự báo độ rung lắc giá"** (`garch`)
- Tone: `p = garch.garch.persistence`. `p >= T.garch.stationaryLimit (1)` -> `risk`. `p >= T.garch.persistent (0,9)` -> `caution`. `0 < p < 0,9` -> `neutral`. Thiếu -> `nodata`.
- Kết luận (nhánh 0,9 đến dưới 1): "Giá đang dao động khoảng 2% mỗi phiên và cú sốc có thể kéo dài." Nhánh dưới 0,9: "...và cú sốc thường lắng nhanh hơn." Nhánh từ 1: "Mô hình không cho kết luận ổn định về độ rung lắc dài hạn."
- Vì sao: "Chỉ số dai dẳng α+β là 0,96, trên mốc tham khảo 0,9. Nghĩa là cú sốc dao động hôm nay còn ảnh hưởng vài phiên sau."
- Số: Biến động hiện tại `current_vol_pct` 2 %/phiên | Dai dẳng α+β `persistence` 0,96, mốc 0,9 và 1 | Chu kỳ bán rã `half_life` 17 phiên (chỉ hiện khi `0<p<1`, nếu không hiện "không xác định").
- Lưu ý: "Đây là độ lớn dao động, không cho biết giá lên hay xuống." EGARCH γ (nếu có) chỉ ở lớp 3.
- Hình lớp 2: ba thanh biến động dự báo (`forecast_vol`, 3 giá trị) và thang persistence có hai vạch mốc 0,9 và 1.
- Ghi chú dữ liệu: "volatility cone" (phân vị lịch sử theo horizon) chưa có trong API; xem mục 11 (khoảng trống). Demo chỉ vẽ dữ liệu có thật.

**10 Monte Carlo - "Mô phỏng nhiều kịch bản giá"** (`simulation_risk`)
- Tone: luôn `neutral` ("Mô tả") hoặc `nodata`. Mốc `T.simulation_risk.balancedUpPct = 50` chỉ để nói "trên/dưới nửa". `thresholds.ts` không có ngưỡng cho `prob_loss_gt_3pct`, nên không gán `caution` theo giá trị này.
- Kết luận: "Khoảng 62 trong mỗi 100 lần (từ 1.000 lần mô phỏng), giá sau 3 phiên cao hơn hôm nay; khoảng 38 lần thấp hơn hoặc bằng." Số 62 là `mc.prob_up` (phần trăm); 1.000 là `research.simulation_count`; 62% × 1.000 = 620.
- Vì sao: "Mô phỏng dùng biến động GARCH-t. Khoảng 8 trong mỗi 100 lần (khoảng 80 trên 1.000 lần mô phỏng) lỗ hơn 3% trong thời gian chờ thanh toán [chờ Haiku xác minh: T+]."
- Số: Giá cuối kỳ cao hơn `mc.prob_up` 62 trên 100, mốc 50 | Sụt giảm khi chờ `lock_risk.max_dd_lock_pct` -4% (thống kê theo BE, chưa rõ) | Lỗ trên 3% `prob_loss_gt_3pct` 8 trên 100.
- Lưu ý: "Mô phỏng dựa trên giả định về dao động quá khứ, không phải lời hứa; giá thật có thể ra ngoài dải."
- Hình: lưới 100 chấm, mỗi chấm là 1% trong 1.000 lần mô phỏng, gom nhóm (62 chấm xanh dương nhạt = cao hơn, 38 chấm xám = thấp hơn hoặc bằng; không dùng đỏ/xanh giá) và fan chart P05-P95, P25-P75, P50 từ `research.cone`. Cả hai phía cùng cỡ. Ở lớp 3 thêm histogram 3 nhóm từ `research.distribution`, nhãn "Phân phối giá cuối kỳ mô phỏng, không phải lợi suất lịch sử".
- Nếu `prob_up` ngoài 0-100 hoặc thiếu: không vẽ lưới, thẻ `nodata`.

**02 Phân phối - "Hình dạng lợi suất lịch sử"** (`distribution`)
- Tone: `is_gaussian===false` hoặc `excess_kurtosis > T.distribution.normalExcessKurtosis (0)` -> `caution`; ngược lại `neutral`; thiếu -> `nodata`.
- Kết luận: "Lợi suất quá khứ có đuôi dày: các cú tăng giảm lớn xảy ra nhiều hơn mức bình thường."
- Vì sao: "Độ nhọn dư 2,44, trên mốc 0 của phân phối chuẩn. Độ lệch -0,49 nghĩa là phía giảm có đuôi dài hơn."
- Số: Độ nhọn dư `excess_kurtosis` 2,44, mốc 0 | Độ lệch `skewness` -0,49, mốc 0 (âm: lệch trái) | Giống phân phối chuẩn? `is_gaussian` "Không".
- Lưu ý: "Không có VaR/CVaR lịch sử trong báo cáo, nên chưa đo được mức lỗ ở đuôi." (đúng chữ `moduleAnalysis`).
- Hình: histogram lợi suất lịch sử chỉ vẽ khi có chuỗi `_price_close` đủ dài (fixture chỉ có 7 điểm cho 252 quan sát, nên thẻ ghi "Chưa đủ chuỗi lợi suất lịch sử để vẽ hình phân phối"). `research.distribution` là phân phối mô phỏng Monte Carlo, thuộc module 10, không dùng ở đây.

**13 Thanh khoản - "Dễ mua bán nhanh"** (`liquidity`)
- Tone: `pass===true` -> `ok`; `pass===false` -> `risk`; thiếu -> `nodata`.
- Kết luận: "Cổ phiếu đạt điều kiện thanh khoản của báo cáo." Nhánh false: "Cổ phiếu chưa đạt điều kiện thanh khoản; vào ra lệnh lớn có thể khó."
- Vì sao: "Giá trị giao dịch trung bình 20 phiên khoảng 120 tỷ đồng. Nhịp gần đây cao hơn nền 1,2 lần (mốc 1)."
- Số: Giá trị giao dịch TB 20 phiên `adv20_value_vnd` 120 tỷ VND | Tỷ lệ 5/20 phiên `value_ratio_5_20` 1,2x, mốc `T.liquidity.unchangedVolumeRatio` 1 | Sức chứa tham chiếu `capacity_shares` 20.000 cổ phiếu.
- Lưu ý: "Giao dịch nhiều không có nghĩa là tiền đang vào ròng; lệnh lớn vẫn có thể trượt giá."

### Nhóm A. Hiện trạng

**01 Hiệu suất - "Lợi nhuận trên mỗi đơn vị rủi ro"** (`statistics`)
- Tone: `neutral` (mốc Sharpe chỉ để đọc). Nhãn phụ chữ: "Khá" khi `sharpe >= T.statistics.sharpeFair (1)`, "Rất tốt theo mốc" khi `>= sharpeStrong (2)`, "Hạn chế" khi `0 < sharpe < 1`, "Không vượt mức tham chiếu" khi `<= 0`. Không đặt tone `ok`.
- Kết luận: "Năm qua cổ phiếu sinh lời khá so với mức dao động đã chịu."
- Vì sao: "Sharpe 1,2, nằm giữa mốc khá (1) và rất tốt (2). Sụt giảm sâu nhất là -12%: mỗi 100 đồng ở đỉnh từng còn khoảng 88 đồng ở đáy."
- Số: Lợi suất quy đổi năm `ann_return_pct` 24,5% | Sụt giảm tối đa `max_dd_pct` -12% | Sharpe `sharpe` 1,2, mốc 1 và 2.
- Lưu ý: "Đây là quá khứ, không đảm bảo năm tới." Sortino, biến động năm, n ở lớp 3.
- Chỉ dùng ví dụ theo tỷ lệ (mỗi 100 đồng), không dùng số tiền cụ thể, để không lệch với `% tài sản` của module 12. Chỉ khi `-100 <= dd <= 0`.

**06 Kỹ thuật - "Dòng tiền và chất lượng xu hướng"** (`technical`)
- Tone: luôn `neutral` hoặc `nodata`. Cấm dùng `ok`. Huy hiệu cố định "Mô tả, chưa kiểm chứng ngoài mẫu" (xuất phát từ nghiên cứu nội bộ ghi CMF, MA200, momentum, R² xu hướng trượt OOS ở VN).
- Kết luận: "Trong giai đoạn quan sát, CMF dương và đường giá khá rõ hướng. Chỉ mô tả, chưa chứng minh dự báo được ngoài mẫu." (nhánh theo dấu `cmf` so `T.technical.neutralFlow` 0 và `er` so `T.technical.noisyER` 0,3: ER từ 0,3 trở xuống, khớp `er<=noisyER` trong code, thì câu thành "đường giá còn nhiều nhiễu").
- Vì sao: "CMF 0,21, trên 0: giá đóng cửa gần đỉnh phiên hơn. ER 0,58 trên mốc nhiễu 0,3. Chỉ mô tả quá khứ."
- Số: Dòng tiền CMF `flow.cmf` 0,21, mốc 0 | Hiệu quả xu hướng ER `trend.er` 0,58, mốc 0,3 | Sức mạnh 20 phiên so với VN-Index `alpha.cross_sectional.rs_20d_pct` +4,2%.
- Lưu ý: "CMF là ước lượng từ giá và khối lượng, không phải tiền nạp rút thật. Chưa chứng minh dự báo được ngoài mẫu."
- Cấm: chữ "tín hiệu", "áp lực mua", "nghiêng về bên mua", "xu hướng tốt", dùng màu `up` cho chip.

**05 HMM - "Trạng thái thị trường đang là gì"** (`hmm`)
- Tone: `neutral`; nếu `method==='fallback'`: `nodata` kèm "Đang dùng phương pháp thay thế" và không hiện xác suất.
- Huy hiệu: khi thiếu `hmm.probability_kind`, huy hiệu "Chưa rõ loại xác suất (lọc/làm mượt)" và module chỉ mô tả. Chữ "lọc" chỉ hiện khi `probability_kind === 'filtered'`.
- Kết luận: "Mô hình gọi phiên cuối là pha tăng, độ chắc 67%. Chỉ mô tả." Pha giảm/đi ngang dùng cùng khung, không ngôn ngữ tốt/xấu.
- Vì sao: "Chưa rõ loại xác suất (lọc/làm mượt). 67% vượt một nửa (mốc 50%); pha đi ngang 24%, pha giảm 9%."
- Số: Xác suất pha tăng 67% | đi ngang 24% | giảm 9% (`state_probs`, tổng 100).
- Lưu ý: "Đây là độ chắc của việc gọi tên trạng thái, không phải xác suất lãi, và không dùng để ra lệnh. Chưa chứng minh dự báo được ngoài mẫu."
- Lưới 100 chấm gom nhóm theo ba trạng thái (67/24/9), thứ tự cố định.
- Không vẽ dải lịch sử `research.regime` ở lớp 2. Ở lớp 3, nếu vẽ, ghi rõ "nhãn xem lại, chỉ mô tả quá khứ"; chỉ cho phép khi API xác nhận đó là xác suất lọc (mục 11).

**08 Thị trường và ngành - "So với ngành và thị trường"** (`context`)
- Tone: `neutral`.
- Kết luận: "Ngành Công nghệ đang ở xu hướng tăng, và các mã trong ngành khá cùng chiều."
- Vì sao: "Tương quan trung bình giữa các mã là 0,64, trên mốc 0 (cùng chiều). Ngành tăng 3,1% trong 20 phiên."
- Số: Ngành `sector.name` Công nghệ | Nhãn xu hướng ngành `sector.trend.trend_label` Tăng | Tương quan TB `cross_corr.avg_pairwise_corr` 0,64, mốc 0.
- Lưu ý: "Tương quan cao nghĩa là ngành lên xuống cùng nhau, nên đa dạng hóa trong ngành giúp ít."
- Hình: một thanh -1 đến +1 có chấm tại 0,64.

### Nhóm B. Triển vọng

**03 ARIMA - "Kiểm tra giá có ổn định hay không"** (`arima`)
- Tone: `adf_p < T.arima.adfSignificance (0,05)` và `stationary===true` -> `ok`; `stationary===false` hoặc p từ 0,05 -> `caution`; thiếu -> `nodata`. Không có tone cho AIC/BIC.
- Chip: "Đạt mốc ADF" (chẩn đoán, không phải dự báo).
- Kết luận: "ADF p 0,012 bác bỏ giả thuyết chuỗi không ổn định ở mức 5%. Đây là chẩn đoán, không phải dự báo."
- Vì sao: "ADF p-value 0,012, dưới mốc 0,05. Mô hình chọn cấu hình (1, 0, 1)."
- Số: ADF p-value `adf_p` 0,012, mốc 0,05 | Cấu hình `best.order` (1, 0, 1) | Dự báo 3 phiên `forecast.prices` 102.200 đến 102.600 (chỉ khi có mảng).
- Lưu ý: "ARIMA là chẩn đoán tham khảo; đường dự báo không phải giá sẽ đi theo. AIC thấp không có nghĩa mô hình đúng."
- Hình: đường 3 điểm dự báo kèm điểm giá hiện tại; nếu thiếu `forecast`, thẻ ghi "Chưa có chuỗi dự báo" (ca `partial`).

**07 Alpha có hướng - "Đà, tính duy trì và so sánh trong rổ"** (`directional_alpha`)
- Tone: luôn `neutral`/`nodata`, huy hiệu "Mô tả, chưa kiểm chứng ngoài mẫu". Momentum không bao giờ được trình bày như lý do mua.
- Kết luận: "Điểm động lượng 0,4 (dương), chỉ mô tả quá khứ. Chưa chứng minh dự báo được ngoài mẫu."
- Vì sao: "Điểm động lượng 0,4 trên mốc 0. Hurst 0,61 trên mốc 0,5, gợi ý xu hướng có tính duy trì."
- Số: Điểm động lượng `momentum_alpha.score` 0,4, mốc 0 | Hurst `hurst.hurst` 0,61, mốc 0,5 | Vị trí trong rổ (LightGBM) `lightgbm_cross_sectional.rank_pct` 80 trên 100, không phải xác suất (chỉ khi `available===true`).
- Lưu ý: "Thứ hạng không phải xác suất lãi. Hồi quy phần dư chưa kích hoạt và không được tính như một phiếu."
- Nếu `momentum*proj_pct < 0`: thêm "LightGBM trái chiều với đà gần đây".

**09 Đồng thuận - "Các mô hình có nhất trí không"** (`agreement`)
- Tone: `coverage_pct < T.agreement.fullCoveragePct (100)` -> `caution`; bằng 100 -> `neutral`; thiếu -> `nodata`.
- Kết luận: "Các mô hình khá nhất trí, nhưng mới 80% mô hình tham gia."
- Vì sao: "Dự báo tổng hợp +4,1% trong 3 phiên, đồng thuận 75%. Độ phủ 80% nghĩa là còn mô hình chưa tham gia."
- Số: Dự báo tổng hợp `ensemble_ret_pct` +4,1% trong 3 phiên | Đồng thuận `agreement_pct` 75% | Độ phủ `coverage_pct` 80%, mốc 100.
- Lưu ý: "Nhất trí không phải xác suất lãi; các mô hình dùng chung dữ liệu nên bằng chứng không độc lập."
- Cấm: hiện 75% như thanh "xác suất".

### Nhóm D. Mua bán (chỉ khi đủ dữ liệu; luôn nhãn "kế hoạch có điều kiện, không phải lệnh")

**12 Kế hoạch vị thế - "Các mức giá của kế hoạch"** (`trade_plan`)
- Tone: bốn mức theo thứ tự `SL < Entry < TP1 <= TP2` và đều `> T.trade_plan.minPrice (0)` -> `neutral` ("Hợp lệ về thứ tự"); sai thứ tự -> `caution` + "Chưa tạo thành kế hoạch hợp lệ"; thiếu -> `nodata`.
- Kết luận: "Kế hoạch có điều kiện: nếu vào ở 100.000 và sai, lỗ ước tính khoảng 1% tài sản (3.000.000 VND)."
- Vì sao: "Cắt lỗ 97.000, mục tiêu 105.000 và 110.000. Tỷ lệ lãi/lỗ tới mục tiêu 2 là 3,33 (`sl.rr2`, kiểm lại: (110.000 - 100.000) / (100.000 - 97.000)). Báo cáo ghi 1,92 sau chi phí (`sl.rr_net_cost`; công thức chưa công bố nên giao diện không tự suy ra)."
- Số (thứ tự xấu trước): Lỗ ước tính tại cắt lỗ `pos.risk_pct_nav` 1% tài sản (`pos.max_loss` 3.000.000 VND) | Giá vào `sl.entry` 100.000 | Mục tiêu 1 `sl.tp1` 105.000 / mục tiêu 2 `sl.tp2` 110.000.
- Lưu ý: "Cắt lỗ không đảm bảo bán được đúng giá khi giá nhảy hoặc thanh khoản thấp. Biên độ giá và thời gian chờ cổ phiếu về [chờ Haiku xác minh]."
- Hình: thang giá nằm ngang SL-Entry-TP1-TP2, đoạn lỗ và đoạn lãi cùng độ dày; chỉ ghi % tài sản và số tiền `pos.max_loss` có trong báo cáo, không thêm vốn ví dụ. Không tô nút.
- Quy mô cá nhân (`PERSONALIZED`) hay tham chiếu (`REFERENCE`) hiện thành nhãn chữ; Kelly chỉ hiện khi `kelly.available===true` và là ô thu gọn.

**11 Chi phí - "Còn lại bao nhiêu sau phí"** (`costs`)
- Tone: `neutral` ("Mô tả") với mọi giá trị đủ dữ liệu, vì đây là dự báo; mốc `T.costs.breakEvenPct (0)` chỉ để đọc "trên/dưới 0". Thiếu -> `nodata`. Không dùng `ok` hay `risk`.
- Kết luận: "Dự báo gộp 4,1%, trừ phí còn 3,5%."
- Vì sao: "Chi phí hai chiều là 0,6% [chờ Haiku xác minh: mức phí và thuế]. Sau phí là +3,5%, mốc hòa vốn 0. Dự báo dương không bảo đảm có lãi."
- Số: Trước phí `gross_forecast_pct` 4,1% | Chi phí hai chiều `roundtrip_cost_pct` 0,6% | Sau phí `net_forecast_pct` 3,5%, mốc 0.
- Lưu ý: "Mức phí và thuế thực tế khác theo công ty chứng khoán [chờ Haiku xác minh]."
- Hình: waterfall 3 cột (gộp, phí, ròng).

**15 Quyết định - "Điều kiện để hành động"** (`decision`)
- Tone: `executable===true` -> `ok` ("Đủ điều kiện thực thi"); `false` -> `caution` ("Chờ hoàn tất điều kiện"); thiếu -> `nodata`.
- Kết luận: dùng đúng nhãn `actionNames` (WATCH: "Mô hình: theo dõi"). `BUY_NOW` hiện đúng nhãn `actionNames` hiện có, không đổi thành lệnh. Chữ "tín hiệu" trong nhãn đó cần rà lại ở Gate 3.
- Vì sao: lý do từ `report.decision.reason_codes` qua `analysisReason` (ví dụ TIMING_NOT_READY: "Chưa đủ điều kiện thời điểm vào lệnh.").
- Số: Điểm Quant `rec.score` 72/100 (nhãn "điểm xếp hạng, không phải xác suất") | Cổng điều kiện `action.gate_pass` Không | Thực thi `action.executable` Không.
- Lưu ý: "Điểm cao không có nghĩa là nên mua."

### Dải "Có tin được báo cáo không?"

**14 Dữ liệu - "Chất lượng dữ liệu đầu vào"** (`data_quality`)
- Tone: `PASS` -> `ok`; `FAIL` -> `risk`; trạng thái khác -> `neutral`; thiếu -> `nodata`. Cảnh báo `report.warnings.length>0` -> thêm `caution`.
- Kết luận: "Dữ liệu qua các kiểm tra của hệ thống, điểm 95 trên 100."
- Vì sao: "Qua kiểm tra nghĩa là đã đúng các quy tắc đã cài, không chứng minh mọi lỗi đã được bắt."
- Số: Trạng thái `status` Đạt | Điểm `score` 95/100 (thang 0-100 theo `T.data_quality`) | Số cảnh báo `warnings.length` 0.
- Lưu ý: "Điểm chấm dữ liệu đầu vào, không chấm chất lượng cổ phiếu."

**16 Nhận định - "Tóm tắt bằng lời"** (`commentary`)
- Tone: `neutral`. Dùng `quantSummary()` nhưng đổi nhãn "Điểm hỗ trợ" thành "Các điểm mô tả" và không đưa CMF, momentum, pha HMM vào như lý do ủng hộ (cần sửa `quantSummary()` và fixture ở Gate 3). Kết luận: "Mô hình đang ở trạng thái theo dõi, chưa đủ điều kiện thực thi." Mỗi câu có chú thích số module nguồn, ví dụ [05], [10], để truy ngược.
- Lưu ý cố định: "Đoạn văn tổng hợp; số liệu gốc ở từng module." Không thêm số nào không có trong module.

---

## 6. Hình minh họa (quy tắc chung)

| Hình | Dữ liệu | Quy tắc |
|---|---|---|
| Fan chart | `research.cone` (p05, p25, p50, p75, p95) + giá cuối `_price_close` | Dải P05-P95 nhạt, P25-P75 đậm hơn, P50 nét đặc; điểm gốc là giá hôm nay; chỉ vẽ số phiên có thật (fixture: 3); nhãn "9 trong 10 lần" |
| Lưới 100 chấm | `prob_up`, `state_probs` | Gom nhóm theo hàng (không rải ngẫu nhiên); dùng màu "kịch bản" (xanh dương/xám) không dùng đỏ/xanh giá; kèm số bằng chữ |
| Thang giá | `sl.*`, `pos.*` | Nằm ngang; đoạn lỗ trước, đoạn lãi sau; có số tiền theo vốn ví dụ |
| Thang persistence | `garch.garch.persistence` | Thang 0 đến 1,2 với vạch 0,9 và 1 |
| Histogram | `research.distribution` | Không tô theo dấu |
| Waterfall chi phí | `costs.*` | 3 cột |
| 3D | cảnh hiện có (GARCH, Monte Carlo, radar) | Chỉ ở lớp 3, lazy-load, không tự xoay, luôn có 2D, bảng số và mô tả |

Mỗi hình có `role="img"` hoặc nhóm có `aria-label`, đoạn mô tả `<figcaption>`, và bảng số thay thế (đóng sẵn). Số trên hình dùng ký tự thật trong SVG và chữ >= 12 px sau scale (hiện `LiveQuantReport` đã cân chữ SVG; giữ cơ chế này).

---

## 7. Thuật ngữ, tour và trang "Cách đọc"

### 7.1 Glossary (nguồn duy nhất: `glossary.ts`)

Định dạng mỗi mục: `id`, `ten` (tên dễ hiểu), `nghia` (<= 2 câu), `viDu` (mẫu có chỗ trống điền số thật của báo cáo, nếu thiếu thì bỏ dòng), `module`. Mục đánh dấu [P] là pháp lý/thị trường: nội dung giữ placeholder `[chờ Haiku xác minh]`.

| # | Thuật ngữ | Tên dễ hiểu | Nghĩa (rút gọn) | Module |
|---|---|---|---|---|
| 1 | Sharpe | Lợi nhuận trên mỗi đơn vị rủi ro | Lợi suất vượt mức tham chiếu chia cho dao động. Mốc đọc: 1 là khá, 2 là rất tốt | 01 |
| 2 | Sortino | Lợi nhuận so với dao động xấu | Giống Sharpe nhưng chỉ tính dao động đi xuống. Mốc đọc 1 | 01 |
| 3 | Sụt giảm tối đa | Mức giảm sâu nhất từ đỉnh | Từ đỉnh cao nhất đến đáy sau đó, trong cửa sổ quan sát | 01 |
| 4 | Lợi suất quy đổi năm | Lợi nhuận tính theo năm | Quy đổi từ dữ liệu quá khứ, không phải cam kết năm tới | 01 |
| 5 | Biến động năm | Độ rung lắc theo năm | Mức phân tán lợi suất, không phải mức lỗ tối đa | 01 |
| 6 | Độ lệch | Đuôi nào dài hơn | Âm: phía giảm có đuôi dài hơn. Dương: phía tăng dài hơn | 02 |
| 7 | Độ nhọn dư | Độ dày đuôi | Trên 0 nghĩa là cú tăng giảm lớn xảy ra nhiều hơn phân phối chuẩn | 02 |
| 8 | Phân phối chuẩn (Gaussian) | Hình chuông chuẩn | Mốc so sánh quen thuộc; thị trường thường lệch khỏi nó | 02 |
| 9 | VaR / CVaR | Mức lỗ ở đuôi | VaR: mức lỗ không bị vượt với xác suất và kỳ đã chọn. CVaR: lỗ trung bình khi đã vượt VaR. Báo cáo hiện chưa công bố | 02 |
| 10 | ARIMA | Mô hình đọc quán tính của chuỗi | Dùng quá khứ của chuỗi để dự báo bước kế tiếp | 03 |
| 11 | ADF p-value | Kiểm tra chuỗi có ổn định không | Dưới 0,05 thì ủng hộ chuỗi ổn định. Không phải xác suất mô hình đúng | 03 |
| 12 | Tính dừng | Chuỗi không trôi theo thời gian | Điều kiện để mô hình ARIMA hoạt động tốt | 03 |
| 13 | AIC / BIC | Điểm so sánh mô hình | Thấp hơn là gọn hơn khi so cùng dữ liệu. Không có mốc tốt tuyệt đối | 03 |
| 14 | GARCH | Dự báo độ rung lắc giá | Biến động hôm nay phụ thuộc cú sốc và biến động hôm qua | 04 |
| 15 | Độ dai dẳng α+β | Cú sốc kéo dài bao lâu | Từ 0,9 là kéo dài; từ 1 là không có mức dài hạn ổn định | 04 |
| 16 | Chu kỳ bán rã | Số phiên để cú sốc giảm một nửa | Của biến động, không phải của giá | 04 |
| 17 | EGARCH γ | Giá giảm có làm rung lắc hơn không | γ âm: cú sốc giảm tác động mạnh hơn cú sốc tăng | 04 |
| 18 | HMM | Trạng thái thị trường ẩn | Mô hình đoán thị trường đang ở pha tăng, đi ngang hay giảm | 05 |
| 19 | Xác suất trạng thái | Độ chắc của nhãn trạng thái | Chưa rõ loại xác suất (lọc/làm mượt) cho đến khi `probability_kind` có. Không phải xác suất lãi | 05 |
| 20 | CMF | Dòng tiền ước lượng | Từ vị trí đóng cửa và khối lượng. Trên 0: giá đóng cửa gần đỉnh phiên hơn. Chỉ mô tả, chưa chứng minh dự báo được ngoài mẫu. Không phải tiền thật | 06 |
| 21 | ER | Hiệu quả xu hướng | Từ 0,3 trở xuống là đường giá nhiều nhiễu | 06 |
| 22 | R² xu hướng | Độ khớp đường xu hướng | Gần 1 là khớp hơn, không nói hướng | 06 |
| 23 | RS20 | Sức mạnh 20 phiên so với VN-Index | Dương: lợi suất 20 phiên vượt VN-Index | 06 |
| 24 | Beta | Độ nhạy với thị trường | Không phải mức lợi nhuận | 06 |
| 25 | Momentum | Đà giá gần đây | Điểm có dấu; mô tả quá khứ, chưa chứng minh dự báo được ngoài mẫu | 07 |
| 26 | Hurst | Xu hướng duy trì hay đảo chiều | Trên 0,5 gợi ý duy trì, dưới 0,5 gợi ý đảo chiều | 07 |
| 27 | Vị trí trong rổ | Vị trí so với các mã khác | Không phải xác suất lãi | 07 |
| 28 | Alpha | Phần lợi nhuận vượt thị trường | Dự báo của mô hình, chưa chắc có thật ngoài mẫu | 07 |
| 29 | Tương quan | Hai mã có cùng chiều không | Từ -1 đến +1; gần 0 không chứng minh độc lập | 08 |
| 30 | Độ phủ | Bao nhiêu mô hình tham gia | 100% là đầy đủ theo cách tính của báo cáo | 09 |
| 31 | Đồng thuận | Mức nhất trí giữa các mô hình | Không phải xác suất lãi | 09 |
| 32 | Monte Carlo | Mô phỏng nhiều kịch bản giá | Chạy nhiều đường giá ngẫu nhiên theo giả định về dao động | 10 |
| 33 | P05 / P50 / P95 | 5 / 50 / 95 trong 100 | P05: 5 trong 100 kịch bản thấp hơn mức này. P95: 95 trong 100 kịch bản thấp hơn mức này | 10 |
| 34 | T+ (chờ cổ phiếu về) [P] | Thời gian chờ thanh toán | [chờ Haiku xác minh] | 10, 12 |
| 35 | Chi phí hai chiều | Tổng chi phí mua và bán | Giả định của báo cáo, có thể gồm phí, thuế, trượt giá (không tách); thực tế theo công ty chứng khoán [chờ Haiku xác minh] | 11 |
| 36 | Biên độ giá [P] | Giới hạn giá mỗi phiên | [chờ Haiku xác minh] | 12 |
| 37 | Cắt lỗ / Mục tiêu | Mức giá của kế hoạch | Điều kiện của kế hoạch, không phải dự báo sẽ chạm | 12 |
| 38 | Tỷ lệ lãi/lỗ (R:R) | So lãi mục tiêu với lỗ nếu sai | Trước chi phí: (mục tiêu - vào) / (vào - cắt lỗ). Giá trị sau chi phí lấy nguyên từ `sl.rr_net_cost`, công thức chưa công bố. Không nói xác suất chạm mức nào | 12 |
| 39 | Kelly | Cách chia vốn theo tỷ lệ thắng và tỷ lệ lãi/lỗ | Chỉ hiện khi báo cáo bật; không là khuyến nghị | 12 |
| 40 | Giá trị giao dịch TB 20 phiên (ADV20) | Dòng tiền giao dịch quen thuộc | Thước đo độ dễ vào ra | 13 |
| 41 | Sức chứa | Số cổ phiếu có thể giao dịch tham chiếu | Theo giả định nguồn, không đảm bảo có bên đối ứng | 13 |
| 42 | Cổng điều kiện | Các điều kiện phải đạt trước khi hành động | Điểm cao vẫn có thể bị chặn | 15 |
| 43 | Điểm Quant | Điểm xếp hạng chất lượng | Không phải xác suất lãi | 15 |
| 44 | Chất lượng dữ liệu | Dữ liệu đầu vào có sạch không | Đạt nghĩa là qua các kiểm tra đã cài | 14 |

Tương tác: gạch chân đứt; hover, focus hoặc chạm mở thẻ <= 2 câu + "Ví dụ trong báo cáo này" + "Đọc thêm" (mở trang Cách đọc đúng mục). Desktop: popover neo, `role="tooltip"`, mở khi focus, đóng bằng Esc, không biến mất khi rê chuột vào (WCAG 1.4.13). Mobile: bottom sheet `role="dialog"`. Một thuật ngữ chỉ gạch chân ở lần đầu mỗi nhóm.

### 7.2 Tour 4 bước (chỉ lần đầu, popover neo, không overlay tối toàn trang)

| Bước | Neo | Nội dung (<= 25 từ) |
|---|---|---|
| 1/4 | Thẻ Kết luận | "Kết luận của mô hình ở đây. Đây là nhãn của mô hình, không phải lệnh mua bán." |
| 2/4 | Thẻ nhóm C | "Xem rủi ro trước khi xem cơ hội: bạn có thể mất bao nhiêu và trong tình huống nào." |
| 3/4 | Dải tin cậy | "Kiểm tra độ tin cậy của dữ liệu. Thiếu dữ liệu thì kết luận kém chắc hơn." |
| 4/4 | Bộ chuyển mức đọc | "Đổi giữa Tóm tắt, Hiểu vì sao và Chuyên sâu bất cứ lúc nào." |

Điều khiển: Bỏ qua (có từ bước 1), Quay lại, Tiếp, Xong; Esc đóng; focus vào popover và trả về nút cũ; `role="dialog"`, `aria-labelledby`. Không đếm ngược, không phần thưởng khi xong. Lưu cờ đã xem bằng `localStorage` (try/catch); nút "Cách đọc" (dấu ?) mở lại.

### 7.3 Trang / ngăn kéo "Cách đọc" (1 phút)
Mục lục: 1. Báo cáo trả lời 4 câu hỏi nào. 2. Ba mức đọc. 3. Nhãn trạng thái nghĩa là gì (bảng 5 nhãn, mục 4.1). 4. Đọc rủi ro trước cơ hội. 5. Xác suất trong báo cáo ("khoảng 62 trong mỗi 100 lần, từ 1.000 lần mô phỏng" nghĩa là gì, và không phải là gì). 6. Vì sao mô hình có thể sai (giới hạn, dữ liệu thiếu). 7. Bảng thuật ngữ (glossary đầy đủ). 8. Miễn trừ `[chờ rà soát pháp lý VN]`. Có ví dụ báo cáo mẫu đã chú thích, ghi rõ "dữ liệu mẫu". Route đề xuất `/analysis/guide`, mở dạng ngăn kéo trong báo cáo.

---

## 8. Design tokens

Giữ nền xanh đen và điểm nhấn cam hiện có trong `.terminal` (không đổi biến cũ, chỉ thêm biến mới tiền tố `--q-`). Tỷ lệ tương phản đã tính bằng công thức WCAG 2.x (script trong phiên làm việc); số liệu dưới đây là kết quả đo, trên `--surface`.

### 8.1 Màu giá (chỉ cho số và đường giá) và màu trạng thái (chỉ cho chip, viền thẻ) tách riêng

| Token | Vai trò | Tối | Sáng | Tương phản chữ trên surface (tối / sáng) |
|---|---|---|---|---|
| `--q-up` | Giá tăng | `#67d6a5` | `#167554` | 10,07 / 5,67 |
| `--q-down` | Giá giảm | `#f08088` | `#ba354b` | 6,99 / 5,68 |
| `--q-ref` | Tham chiếu | `#e3c16c` | `#7a5700` | 10,39 / 6,58 |
| `--q-status-ok` | Ổn theo mốc | `#6cb6ff` | `#0b5cad` | 8,38 / 6,67 |
| `--q-status-neutral` | Mô tả | `#b7c3cb` | `#4a5a63` | 10,02 / 7,16 |
| `--q-status-caution` | Thận trọng | `#f2b04a` | `#8a5200` | 9,51 / 6,39 |
| `--q-status-risk` | Rủi ro cao | `#f08cd4` | `#a3166f` | 8,07 / 7,24 |
| `--q-status-nodata` | Chưa đủ dữ liệu | `#9fb0a6` | `#56655e` | 7,92 / 6,14 |
| `--q-band` | Dải bất định (fan chart, lưới chấm "cao hơn") | `#8c9bd8` | `#4c5fb0` | 6,69 / 5,88 |
| `--accent` | CTA, tiêu điểm (sẵn có) | `#ff914d` | `#b94b0a` | 8,07 / 5,16 |
| `--text`, `--muted` (sẵn có) | Chữ | `#edf4ef`, `#a6b9ad` | `#18292f`, `#526b74` | 16,12 và 8,72 / 15,03 và 5,65 |

Quy tắc dùng: `up/down/ref` chỉ xuất hiện trên số giá, mũi tên và đường giá, luôn kèm dấu +/- hoặc mũi tên. `status-*` chỉ trên chip và vạch trái thẻ, luôn kèm biểu tượng và chữ. Không dùng `down` cho "rủi ro" và không dùng `up` cho "ổn" (giá giảm không luôn là rủi ro cao). Màu chip `risk` là hồng-tím, không phải đỏ, để không lẫn với giá giảm; màu `ok` là xanh dương, không phải xanh lá. Đường viền điều khiển cần >= 3:1: dùng `--q-line-strong` dark `#557766` (3,62 trên surface) và light `#74897e` (3,74 trên surface trắng, 3,41 trên nền trang); đã đo, đạt 3:1. Đường viền trang trí (`--border` hiện có) không phải thành phần chức năng nên không bị yêu cầu 3:1.

Kiểm lại ở đợt 1 bằng script đo tương phản trong CI (không chỉ nhìn bằng mắt), và mô phỏng mù màu đỏ-xanh (deuteranopia): chip và hình phải đọc được khi chỉ còn độ sáng và biểu tượng.

### 8.2 Chữ

| Vai trò | Họ chữ | Cỡ / dòng | Ghi chú |
|---|---|---|---|
| Văn bản dài, kết luận, giải thích | Inter (đã bundle, có subset vietnamese) | 16-17 px / 1,6 | Độ rộng dòng 60-72 ký tự (`max-width: 68ch`) |
| Tiêu đề thẻ | Inter 600 | 18-20 px / 1,3 | |
| Tiêu đề nhóm | Inter 600 | 22 px | |
| Tiêu đề trang | Inter 600 | 30-32 px | |
| Số lớn trong thẻ | IBM Plex Mono 500 | 24-32 px | `tabular-nums` |
| Số trong bảng, mã | IBM Plex Mono | 14 px | căn phải |
| Nhãn, chip, điều khiển | Inter 500 | 14 px tối thiểu | Không có chữ có nghĩa dưới 14 px |
| Chú thích phụ | Inter | 13 px | Chỉ cho thông tin không thiết yếu (khớp bài e2e "13px minimum") |

Phát hiện: `docs/DESIGN.md` nói IBM Plex Mono cho nội dung, nhưng `globals.css` đặt `--font-sans: "Inter"` cho thân trang và layout đã nạp Inter có subset vietnamese. Đề xuất Gate 3 cập nhật DESIGN.md cho khớp thực tế: Inter cho văn bản, Plex Mono cho số/mã. Không cần thêm phông mới (Be Vietnam Pro chỉ là phương án nếu thử người dùng cho thấy Inter khó đọc).

### 8.3 Khoảng cách, bo góc, chuyển động

- Thang 4/8 px: 4, 8, 12, 16, 24, 32, 48. Gutter mobile 16, desktop 24. Cột nội dung tối đa 1120 px.
- Thẻ: bo góc 8 px (hiện dùng `rounded` 4 px; đề xuất 8 để chip và thẻ đọc rõ ranh giới), viền 1 px `--border`, nền `--surface`, padding 16 (mobile) / 24 (desktop).
- Mục tiêu chạm >= 44 px trên mobile.
- Chuyển động: phản hồi nhỏ 100-200 ms; mở rộng/đổi lớp 200-250 ms; vẽ biểu đồ lần đầu <= 700 ms, một lần, khi vào khung nhìn (`IntersectionObserver`). Chỉ animate `transform`, `opacity`, `stroke-dashoffset`. Easing: `cubic-bezier(.2,.7,.2,1)` khi vào. Mọi chuyển động ánh xạ tới dữ liệu có thật; không dữ liệu thì không vẽ.
- `prefers-reduced-motion: reduce` tắt hết chuyển động không thiết yếu; thêm nút "Giảm hiệu ứng" trong app (lưu `localStorage`, ghi đè hệ thống theo hướng chỉ thêm giảm). Không có gì nhấp nháy.

---

## 9. Trợ năng

Tương phản chữ >= 4,5:1 và thành phần UI >= 3:1 ở cả hai chủ đề; màu không là kênh duy nhất; `lang="vi"`; thứ tự focus theo thứ tự đọc C, A, B, D; nút thu/mở là `button` với `aria-expanded`; có skip link tới "Nội dung báo cáo"; reflow 320 px; hình có mô tả và bảng thay thế; tooltip đóng bằng Esc; mỗi chip đọc thành "Trạng thái: Thận trọng" cho trình đọc màn hình.

---

## 10. Kế hoạch Gate 3 (5 đợt)

Nguyên tắc chung: đợt 1-4 nằm sau cờ `NEXT_PUBLIC_QUANT_READER_V2` (mặc định tắt), nên mọi test hiện có chạy như cũ. Chỉ đợt 5 bật cờ và cập nhật có chủ đích các test/e2e bị ảnh hưởng. Mọi hàm mới là hàm thuần, không sửa báo cáo (giữ khẳng định `JSON.stringify(report)===before`).

### Bất biến phải giữ để `tests/quant-module-samples.test.cjs` không vỡ

1. Không đổi markup do `QuantModelSection` sinh: thuộc tính `data-quant-module`, chuỗi "Ý nghĩa & phân tích", số lượng `<dd ` (>= số metric của `moduleGuides`), `aria-label="Dự báo giá riêng ARIMA"` và `<rect` của histogram.
2. `quantModuleItems.length===16`; không đổi `moduleGuides`, `moduleAvailability`, `readableMetrics`, `moduleAnalysis`, `quantSummary`.
3. `SimpleQuantReport` giữ 5 `aria-label`: "Tổng hợp kết quả mô hình", "Xu hướng dễ hiểu", "Kịch bản giá dễ hiểu", "Rủi ro dễ hiểu", "Kế hoạch giao dịch".
4. `completeQuantReport()` và `quantReportSample()` chỉ được thêm, không đổi số; nếu cần dữ liệu phụ (ví dụ chuỗi `forecast_vol` dài), thêm vào ca mới, không sửa `complete`.
5. Thẻ mới sinh trong năm ca `complete`, `partial`, `unavailable`, `disabled`, `failed` không có `undefined|NaN|Infinity`; ở `unavailable/disabled/failed` các ô số là "—" và không chứa 100.000, 412,6, 24,5.
6. `quant-reader-layout.test.cjs`: đúng 16 `details[data-quant-module]`, đúng 1 không `hidden` (chế độ đầy đủ), tất cả `hidden` (compact); "Hành động thực thi" đứng trước "Phân tích từng module". Thẻ Kết luận mới có thể đứng trước "Hành động thực thi".

### Đợt 1 - Nền: token, từ điển, bộ sinh văn bản (không đổi giao diện)

Tệp mới: `frontend/src/lib/quant-glossary.ts`, `frontend/src/lib/quant-plain.ts` (hàm `quantPlain(name, report)` trả `{tone, chip, verdict, why, numbers[], caution, state}`), `frontend/src/lib/quant-tone.ts` (quy tắc mục 4.1, nhóm), `tests/quant-plain.test.cjs`, `tests/quant-glossary.test.cjs`. Sửa cộng thêm: `frontend/src/app/globals.css` (khối `--q-*` trong `.terminal` và `[data-theme="light"]`, không đổi biến cũ), `docs/DESIGN.md` (khớp phông Inter + Plex Mono, cỡ chữ mới).
Xong khi: (a) 16 module x 5 ca fixture sinh đúng khung, không số ngoài dữ liệu; (b) lint văn bản đạt (Kết luận <= 20 từ, không từ cấm); (c) mỗi nhánh tone được test bằng các giá trị biên của `interpretationThresholds` (0,9; 1; 0,05; 0, 0,3, 50, 100); (d) glossary >= 40 mục, mọi mục `module` hợp lệ, các mục [P] chứa đúng placeholder; (e) test cũ xanh nguyên văn; (f) script tương phản đạt AA cho mọi cặp ở mục 8.1.

### Đợt 2 - Lớp 30 giây

Tệp mới: `frontend/src/components/quant-glance.tsx` (Thẻ Kết luận, 4 thẻ nhóm, dải tin cậy, miễn trừ), `quant-glance.module.css`, `quant-chip.tsx`, `quant-reading-level.tsx` (bộ chuyển + `localStorage` an toàn). Sửa: `quant-live-report.tsx` (chèn trước `QuantActionSummary` khi cờ bật; giữ nguyên phần còn lại).
Xong khi: ba kích thước (375, 768, 1440) không cuộn ngang; thẻ Kết luận lấy đúng `actionNames` và `analysisReason`; ca `unavailable` hiện "Chưa có kết luận" và nhãn "Chưa đủ dữ liệu"; test bố cục mục 6 ở trên xanh; thêm `quant-glance.test.cjs` kiểm thứ tự C, A, B, D và không có câu cấm.

### Đợt 3 - Lớp 3 phút: thẻ module, hình, thuật ngữ

Tệp mới: `quant-group-section.tsx`, `quant-module-card.tsx`, `quant-dot-grid.tsx` (lưới 100 chấm), `quant-fan-chart.tsx` (SVG từ `research.cone`), `quant-price-ladder.tsx`, `quant-term.tsx` (tooltip/bottom sheet), CSS module tương ứng. Dùng SVG tự vẽ; không thêm thư viện. Sửa: `quant-live-report.tsx` (nhóm thứ tự C, A, B, D; lớp Chuyên sâu đặt sau nút "Xem toàn bộ phân tích", DOM giữ nguyên 16 `details`).
Xong khi: 16 thẻ khớp khung mục 5 ở cả 5 ca; số chấm trong lưới đúng bằng `prob_up` (hoặc `state_probs`) làm tròn, tổng 100; fan chart chỉ vẽ số phiên có trong `cone`; tooltip mở bằng focus, đóng bằng Esc, bottom sheet trên 375 px; mọi hình có `aria-label` và bảng số; e2e mới `quant-reader-v2.spec.ts` (bằng Playwright, cờ bật) chạy.

### Đợt 4 - Dẫn nhập: tour, "Cách đọc", cầu nối Quét toàn sàn, trạng thái

Tệp mới: `quant-tour.tsx`, `frontend/src/app/(workspace)/analysis/guide/page.tsx` (hoặc ngăn kéo), `quant-states.tsx` (thẻ thiếu/lỗi/đang chạy). Sửa nhẹ: `screener.tsx` (câu dẫn, nhãn nút "Mở báo cáo Quant", giữ `target_session`), `analysis.tsx` (thanh ngữ cảnh + liên kết quay lại).
Xong khi: tour đúng 4 bước, có Bỏ qua từ bước 1, focus trap và trả focus đúng, không hiện lại sau khi xem; trang Cách đọc có đủ 8 mục; luồng quét -> báo cáo -> quay lại giữ phiên; không có từ khóa gamification (grep CI: confetti, streak, badge, leaderboard); e2e `screening.spec.ts` và `onboarding.spec.ts` hiện có vẫn xanh.

### Đợt 5 - Chuyển động, trợ năng, bật cờ, đo hiểu

Việc: chuyển động có nghĩa (fan chart mở 600 ms, lưới chấm theo hàng, thang trượt 250 ms) + nút "Giảm hiệu ứng" + `prefers-reduced-motion`; đưa 3D vào lớp 3; kiểm axe/Playwright cho cả hai chủ đề; bật cờ mặc định; cập nhật có chủ đích `tests/quant-reader-layout.test.cjs` (mặc định Tóm tắt) và các e2e `quant-modules.spec.ts` (chọn mức Chuyên sâu trước); cập nhật `docs/QUANT-SIMPLE-READER.md`, `docs/quant-reader-ui-review.md`.
Xong khi: axe không lỗi nghiêm trọng ở 375/1440 x sáng/tối; không phần tử nào có chữ có nghĩa dưới 14 px (trừ chú thích phụ >= 13); với reduced-motion, mọi hình hiện ngay trạng thái cuối; toàn bộ test (`node --test tests/*.test.cjs` và Playwright) xanh; chạy thử đọc hiểu 5 người, đạt >= 4/5; nội dung pháp lý vẫn là placeholder cho tới khi Haiku xác minh và pháp lý rà soát.

---

## 11. Khoảng trống dữ liệu và việc cần xác nhận

| Mục | Vấn đề | Hành động |
|---|---|---|
| GARCH volatility cone | API chưa công bố phân vị lịch sử biến động theo horizon; chỉ có `current_vol_pct` và `forecast_vol` | Cần backend thêm trường nếu muốn vẽ cone; Gate 3 chỉ vẽ thang persistence và 3 thanh dự báo |
| HMM filtered vs smoothed | `research.regime` không ghi là xác suất lọc hay làm mượt; tài liệu hiện có ghi xác suất là "trong mẫu, phiên cuối" | Xác nhận với đội mô hình; trong lúc chờ (thiếu `hmm.probability_kind`), không gọi là "xác suất lọc"; lớp 2 hiện "Chưa rõ loại xác suất (lọc/làm mượt)" và chỉ mô tả, lịch sử HMM chỉ ở lớp 3 kèm nhãn "xem lại" |
| Đường dẫn Monte Carlo | Fixture chỉ có 3 phiên trong `cone`; fan chart ngắn | Thiết kế co giãn theo số phiên thật; không nội suy |
| Giá cuối làm điểm gốc | Lấy từ `_price_close[-1]` của `statistics`; nếu thiếu thì fan chart không có điểm gốc, hiện chú thích | Xác nhận trường chính thức cho "giá hôm nay" |
| Ví dụ tiền | Fixture không có trường NAV; chỉ suy ngầm NAV = 300 triệu từ `risk_pct_nav` 1% và `max_loss` 3 triệu. Vốn ví dụ 100 triệu trong `moduleAnalysis` lệch với con số này | Giao diện chỉ nói "% tài sản" kèm `pos.max_loss`, bỏ vốn ví dụ; cho người dùng nhập vốn ở Gate sau |
| Pháp lý | T+, biên độ, phí, thuế, miễn trừ | Placeholder `[chờ Haiku xác minh]` và `[chờ rà soát pháp lý VN]`; không in số cụ thể |
| Nghiên cứu OOS | Việc gắn nhãn "chưa kiểm chứng ngoài mẫu" cho CMF, momentum, R² xu hướng dựa trên `docs/QUANT-RESEARCH-2026-11.md` (đọc qua G1) | Xác nhận câu chữ chính xác với đội nghiên cứu |
| Fixture `complete` | Cone p50 (103.000 đến 105.000) khác dự báo ARIMA (102.200 đến 102.600) | Chỉ là dữ liệu mẫu; không phải mâu thuẫn của hệ thống thật |

## 12. Kiểm tra so với ràng buộc

| Ràng buộc | Đáp ứng ở |
|---|---|
| Không số ngoài API | Mục 3, 5 (mỗi số gắn đường dẫn trường), 10 bất biến 5 |
| Momentum/MA200/CMF không là tín hiệu mua | Mục 4.1, khung 06 và 07 (tone cố định `neutral`, huy hiệu mô tả) |
| HMM chỉ gọi "xác suất lọc" khi `probability_kind` xác nhận | Khung 05, mục 11 |
| Không câu ra lệnh | Mục 4.3 (danh sách cấm, test lint), khung 15 |
| Không gamification | Mục 7.2, đợt 4 (grep CI) |
| Pháp lý placeholder | Mục 5 (các dấu `[chờ Haiku xác minh]`), glossary [P], mục 11 |

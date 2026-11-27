# G1 – Tâm lý đọc hiểu và UX cho báo cáo Quant 16 module

Ngày: 2026-11-27. Phạm vi: nghiên cứu, không sửa code. Nguồn ghi cuối mỗi mục; mục "kiến thức nền" là tài liệu kinh điển tôi nhớ, chưa tra lại từng trang.

## 0. Hiện trạng (đọc lướt repo)

- Đã có: tóm tắt + 4 thẻ minh họa (giá/xu hướng, vùng giá mô phỏng, rủi ro, mức lệnh có điều kiện); "Đọc nhận định đầy đủ"; "Xem phân tích chuyên sâu" mở 16 module thu gọn (docs/QUANT-SIMPLE-READER.md). Lưới 01-16 + "Ý nghĩa & phân tích" sinh từ ngưỡng (docs/quant-reader-ui-review.md). Radar 9 nhân tố, cảnh 3D SVG tự dựng (kéo/phím/slider, không autoplay).
- Điểm mạnh: nguyên tắc "không bịa dữ liệu", UNAVAILABLE không thành số chính, BUY_NOW không thực thi => "Chờ hoàn tất điều kiện", phân biệt độ tin cậy phân loại với xác suất lãi. Đây là nền tin cậy cần giữ.
- Khoảng trống: (a) ngôn ngữ vẫn thuật ngữ (Sharpe, GARCH, HMM, ADF, Hurst, CMF) xuất hiện sớm; (b) 16 module theo thứ tự kỹ thuật (01 Hiệu suất ... 16 Nhận định), không theo câu hỏi nhà đầu tư; (c) chưa có hướng dẫn sử dụng/onboarding, chưa có 3 lớp đọc rõ ràng; (d) xác suất trình bày bằng % và dải P05-P95, chưa có tần suất tự nhiên/icon array; (e) 3D hiện là công cụ khám phá, chưa gắn chặt vào "so what"; (f) font toàn IBM Plex Mono (hợp bảng số, mệt khi đọc văn dài); (g) DESIGN.md quy định nội dung 15-16px, nhãn 14px, nhãn bảng 13px - dưới ngưỡng thoải mái cho người lớn tuổi/di động.

## 1. Tâm lý đọc hiểu

| Nguyên lý | Ý chính | Áp dụng cho QuanTik |
|---|---|---|
| Cognitive load (Sweller) | Bộ nhớ làm việc xử lý được rất ít mục cùng lúc (Miller 7±2, Cowan ~4 chunk). Tải ngoại lai (trang trí, thuật ngữ chưa giải thích) cạnh tranh với tải thực sự cần cho quyết định | Mỗi màn hình tối đa 3-4 ý chính; 1 biểu đồ = 1 thông điệp; bỏ trang trí không mang dữ liệu |
| Progressive disclosure (NN/g) | Hiện trước cái 80% người cần, ẩn phần còn lại sau 1 cú chạm rõ ràng; tối đa 2 cấp | 3 lớp đọc (mục 3) thay cho 16 section mở |
| Chunking | Gom thành nhóm có nhãn câu hỏi | Gom 16 module thành 4 câu hỏi (mục 5) |
| F-pattern / Z-pattern | Người đọc web quét dạng F với văn bản dày, Z với trang thưa; 2 từ đầu dòng quyết định có đọc tiếp không (NN/g eyetracking) | Kết luận đặt góc trên-trái; mỗi đoạn mở bằng từ khóa kết luận; Z cho thẻ tóm tắt đầu trang |
| Plain language | Cơ quan chính phủ Mỹ (plainlanguage.gov) và CFPB khuyên câu ngắn, từ thông dụng, chủ động. Mục tiêu lớp 6-8 (Flesch-Kincaid) cho người đọc đại chúng. Tiếng Việt không có FK chuẩn: dùng quy tắc thay thế (câu ≤ 20 từ, ≤ 1 thuật ngữ mỗi câu, mỗi thuật ngữ có giải nghĩa lần đầu) | Xem mục 5.4 |
| Số liệu thành ý nghĩa ("so what") | Con số trần trụi không tạo quyết định; cần mốc so sánh + hệ quả | Luôn đi kèm: so với cái gì (mốc/ngành/lịch sử) + nghĩa là gì cho túi tiền |
| Framing effect (Tversky-Kahneman 1981) | Cùng sự thật, "90% sống sót" vs "10% tử vong" cho quyết định khác nhau | Trình bày đối xứng: luôn hiện cả kịch bản tốt và xấu cùng cỡ chữ; không chỉ khung lãi |
| Natural frequencies / icon arrays (Gigerenzer & Hoffrage 1995; Galesic, Garcia-Retamero, Gigerenzer 2009) | "Trong 100 lần mô phỏng, 62 lần giá cao hơn hôm nay" dễ hiểu hơn "P(tăng)=62%". Icon array giúp cả người kém toán. Lưu ý: có nghiên cứu cho hiệu ứng yếu (Pighin 2016) và icon array rải ngẫu nhiên làm người đọc thấy rủi ro cao hơn mảng gom nhóm (2022) - phải chọn kiểu có chủ đích | Dùng lưới 100 chấm (10x10) gom nhóm cho Monte Carlo, xác suất trạng thái HMM, tỷ lệ thắng; luôn nêu "mô phỏng, không phải lời hứa" |
| Overconfidence / illusion of control | Nhiều thông tin và biểu đồ phức tạp làm nhà đầu tư tự tin quá mức hơn là chính xác hơn (Barber & Odean: giao dịch nhiều, lợi suất thấp hơn) | Khoảng/dải thay cho một con số; hiện độ không chắc chắn bằng hình (fan chart) và chữ; tránh số lẻ giả chính xác (giá 24.350 chứ không 24.347,82 ở lớp 1) |
| Anchoring | Con số đầu tiên neo phán đoán | Neo vào giá hiện tại và biên độ rủi ro (mức lỗ tối đa) trước, không neo vào giá mục tiêu |
| Loss aversion / disposition effect | Mất đau gấp ~2x được; người ta giữ lỗ, bán lãi sớm | Hiện "lỗ tối đa nếu sai" tương xứng "lãi kỳ vọng"; mức cắt lỗ viết thành số tiền VND trên một lượng vốn ví dụ |
| Information overload / choice overload | Nhiều lựa chọn => trì hoãn hoặc chọn bừa | 1 kết luận chính + 1 hành động mặc định, các cái khác ẩn |

Nguồn: Sweller 1988 (Cognitive Load Theory); Miller 1956; Cowan 2001; [NN/g Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/); [NN/g F-shaped pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/); [plainlanguage.gov](https://www.plainlanguage.gov/); Tversky & Kahneman 1981; Gigerenzer & Hoffrage 1995; Galesic et al. 2009 (Med Decis Making); Gigerenzer et al. 2007 (Psychol Sci Public Interest, "Helping doctors and patients make sense of health statistics"); Pighin et al. 2016 (Med Decis Making 36(6)); Barber & Odean 2000 (J Finance). Kết quả tra cứu: [PMC4504147](https://pmc.ncbi.nlm.nih.gov/articles/PMC4504147), [Frontiers 2015](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00932/full).

## 2. Mẫu UI tài chính: học gì, tránh gì

| Sản phẩm | Đáng học | Cần tránh / thận trọng |
|---|---|---|
| Simply Wall St (snowflake) | Một hình 5 trục tóm tắt (giá trị, tương lai, quá khứ, sức khỏe, cổ tức) + checklist "đạt/không đạt" bằng ngôn ngữ thường; mỗi trục bấm vào ra lý do | Hình đơn giản dễ bị đọc như "điểm tổng thể = nên mua". Phải ghi rõ không phải khuyến nghị |
| Morningstar | Thang sao + "Fair value" và vùng "đắt/rẻ" dạng thanh; bố cục báo cáo analyst có tóm tắt bullish/bearish đối xứng; mục "Risk" riêng; báo cáo chia "Thesis / Valuation / Risk / Moat" | Sao dễ bị coi là bảo đảm |
| TradingView | Chart là trung tâm, widget lớp (indicator) bật/tắt, tooltip tại chỗ; chế độ sáng/tối; lưu bố cục | Mật độ cao dành cho người đã quen; đã có trong QuanTik |
| Koyfin | Dashboard module hóa, bảng so sánh theo ngành, heatmap; màu có nghĩa | Quá nhiều ô cho người mới |
| Robinhood | Giao diện tối giản, một con số lớn + sparkline, ngôn ngữ thân thiện, giải thích thuật ngữ trong app (Learn) | Dark pattern đã bị cơ quan quản lý nêu: confetti sau lệnh đầu, thông báo đẩy, bảng xếp hạng/"top movers" thúc giao dịch, đòn bẩy trang trí. SEC (2021) lấy ý kiến về "digital engagement practices"; Massachusetts phạt 7,5 triệu USD (2024) vì gamification. Robinhood bỏ confetti |
| Fidelity / Vanguard | Hiện chi phí và rủi ro rõ, biểu đồ "dải kết quả có thể" thay vì một đường | Trình bày nhàm, ít hướng dẫn |

Nguyên tắc rút ra:
1. Học: một con số/hình tóm tắt + lý do bấm vào được; checklist đạt/chưa đạt bằng ngôn ngữ thường; đối xứng lợi-hại; thuật ngữ giải nghĩa tại chỗ; màu có nghĩa kèm nhãn chữ.
2. Tránh tuyệt đối trong QuanTik (nền tảng phân tích, không phải sàn lệnh): confetti/âm thanh/huy hiệu khi "mua"; đếm ngược khan hiếm; "đang hot" xếp hạng thúc hành động; mặc định nút "Mua"; số lượng người đang xem/mua; animation ăn mừng khi lãi; nhắc nhở streak. Nút hành động chính nên là "Xem kế hoạch" hoặc "Lưu để theo dõi", không phải "Mua ngay".
3. Màu đỏ/xanh: thị trường Việt Nam dùng xanh = tăng, đỏ = giảm, tím = trần, xanh lơ = sàn, vàng = tham chiếu; giữ đúng quy ước bảng điện, kèm ký hiệu (mũi tên, +/-) để không dựa vào màu đơn thuần (WCAG 1.4.1).

Nguồn: [Fortune 2021 - SEC inquiry gamification](https://fortune.com/2021/08/27/robinhood-sec-inquiry-gamification-trading/); [Vinson & Elkins - Robinhood $7.5M](https://velaw.com/insights/game-over-robinhood-pays-7-5-million-to-resolve-gamification-securities-violations); [BTLJ 2025 - gamification US vs EU](https://btlj.org/2025/11/the-gamification-of-investments-a-comparative-approach-between-the-us-and-eu/). Phần Simply Wall St/Morningstar/Koyfin/TradingView dựa trên kiến thức về sản phẩm, chưa tra lại giao diện hiện hành.

## 3. Onboarding và hướng dẫn: 3 lớp đọc

### 3.1 Ba lớp đọc (progressive disclosure có tên gọi)
| Lớp | Thời gian | Người đọc | Nội dung | Mặc định |
|---|---|---|---|---|
| 30 giây "Tóm tắt" | 30 s | Người mới | Kết luận 1 câu cho mỗi trong 4 câu hỏi; 1 hình chính; 1 dòng "Rủi ro lớn nhất"; nhãn độ tin cậy dữ liệu | Luôn hiện đầu trang |
| 3 phút "Hiểu vì sao" | 3 phút | Người đã biết cơ bản | 4 nhóm, mỗi nhóm 2-4 thẻ module (kết luận, vì sao, con số chính, lưu ý), biểu đồ có chú thích | Cuộn xuống/mở nhóm |
| Chuyên sâu | tùy | Người thạo | 16 module đầy đủ, bảng tham số, kiểm định, cảnh báo, phiên bản mô hình, 3D khám phá | Sau nút "Xem toàn bộ phân tích" (giữ lazy-load hiện có) |

Bộ chuyển "Đơn giản / Chi tiết / Chuyên gia" ở đầu trang, ghi nhớ lựa chọn (localStorage, bọc try/catch). Mặc định lần đầu: Đơn giản.

### 3.2 Coach marks / tour
- Chỉ lần đầu, 3-4 bước (không hơn): (1) "Kết luận ở đây", (2) "Bấm chấm để xem vì sao", (3) "Rủi ro ở đây", (4) "Đổi mức đọc". Có nút Bỏ qua ngay từ bước 1, mở lại bằng nút "Cách đọc báo cáo" (dấu ?) trên thanh đầu.
- Không chặn nội dung bằng overlay tối toàn trang; dùng popover neo vào phần tử, đóng bằng Esc, focus trap đúng, hỗ trợ bàn phím và screen reader (role=dialog, aria-labelledby).
- Thêm trang/ngăn kéo "Hướng dẫn 1 phút" có ví dụ báo cáo thật đã chú thích (ảnh chụp có mũi tên) cho ai không muốn tour.

### 3.3 Empty / loading / lỗi
- Trước khi quét: giải thích 1-2 câu "Báo cáo này trả lời 4 câu hỏi nào", ví dụ mã, thời gian ước tính, hạn mức.
- Đang chạy: trạng thái thật (không giả tiến trình, đúng nguyên tắc hiện tại) theo các bước có tên.
- Dữ liệu thiếu: "Chưa đủ dữ liệu để kết luận" + nguyên nhân + việc người dùng có thể làm; không dùng ô trống hay 0.

### 3.4 Glossary tooltip
- Thuật ngữ gạch chân đứt; bấm/hover/focus hiện thẻ ≤ 2 câu: "Nghĩa là gì" + "Ví dụ trong báo cáo này" + liên kết "Đọc thêm". Trên di động dùng bottom sheet (tooltip hover không hoạt động). Một nguồn thuật ngữ duy nhất (glossary.ts) để mọi module dùng chung, nhất quán giọng văn.
- Mỗi thuật ngữ chỉ giải nghĩa gạch chân ở lần xuất hiện đầu trong một nhóm.

Nguồn: kiến thức NN/g (onboarding, tooltip guidelines), [W3C WAI-ARIA APG - Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), Material/Apple HIG về coach marks. Chưa tra lại bản mới nhất.

## 4. Motion và 3D

Khi giúp hiểu:
- Chuyển trạng thái (mở/đóng, đổi lớp đọc) để giữ ngữ cảnh không gian; thể hiện thay đổi dữ liệu (số đếm lên, thanh co giãn) khi dữ liệu thật đổi; phân kỳ "vẽ" fan chart theo thời gian đúng chiều dự báo; làm nổi phần tử đang giải thích (highlight tương ứng giữa văn bản và chart).
- 3D chỉ có giá trị khi có chiều thứ ba thật (ví dụ đã có: phân vị x phiên x giá; HMM 3 xác suất). Với 2-chiều, 3D gây méo, khó đọc giá trị (chart junk, Tufte), tốn pin, khó truy cập.

Khi gây nhiễu: lặp vô hạn, parallax, hiệu ứng "ăn mừng", animation chạy khi đang cố đọc, chuyển động ở ngoại vi, đếm số dài > 1 giây (chậm đọc), 3D xoay tự động.

Quy tắc:
1. Có nghĩa và theo dữ liệu thật: mọi chuyển động phải ánh xạ tới một thay đổi dữ liệu hoặc trạng thái; không dữ liệu giả để "đẹp". Khi không có dữ liệu: không vẽ.
2. Thời lượng: phản hồi vi mô 100-200 ms, chuyển cảnh/mở rộng ≤ 300 ms, vẽ biểu đồ lần đầu ≤ 600-800 ms (một lần, không lặp). Easing ease-out khi vào, ease-in khi ra. (NN/g: 100-500 ms; Material: 200-300 ms trên desktop.)
3. prefers-reduced-motion: tắt hoàn toàn chuyển động không thiết yếu (WCAG 2.3.3 AAA, khuyến nghị; WCAG 2.2.2 cho nội dung chuyển động > 5 s phải dừng được). Thay bằng chuyển mờ tức thời hoặc không đổi. Cần nút "Giảm hiệu ứng" trong app, không chỉ dựa trên cài đặt hệ điều hành.
4. Không có gì nhấp nháy > 3 lần/giây (WCAG 2.3.1).
5. 3D luôn đi kèm: bản 2D tương đương (đã có), bảng số, mô tả văn bản (alt/aria-describedby), điều khiển bàn phím (đã có); 3D không phải nơi duy nhất chứa thông tin; mặc định không tự xoay; tải lazy.
6. Hiệu năng: giữ 60 fps trên điện thoại tầm trung; chỉ animate transform/opacity; dùng IntersectionObserver để chạy khi vào khung nhìn.
7. Màu động (đổi theo trạng thái) không được là kênh duy nhất truyền thông tin.

Gợi ý chuyển động có nghĩa cho QuanTik (không hiệu ứng ăn mừng):
- Fan chart giá: dải P05-P95 "mở ra" từ giá hôm nay sang phải một lần khi vào khung nhìn (600 ms) - thể hiện độ bất định tăng theo thời gian.
- Thanh thang rủi ro và đồng hồ độ tin cậy trượt đến giá trị thật (250 ms), không bật nảy.
- Lưới 100 chấm: tô màu theo nhóm lần lượt theo hàng (≤ 600 ms tổng) hoặc hiện tĩnh khi reduced-motion.
- Chuyển lớp đọc: nội dung mở rộng 200-250 ms, scroll-anchoring giữ vị trí.
- Hover/focus nối văn bản <-> biểu đồ (làm nổi vùng tương ứng).

Nguồn: [WCAG 2.2 - 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), 2.2.2, 2.3.1; [NN/g Animation duration](https://www.nngroup.com/articles/animation-duration/); Tufte 1983 (The Visual Display of Quantitative Information); Material Motion. Đây là kiến thức nền, chưa mở lại từng trang.

## 5. Đề xuất product cho QuanTik

### 5.1 Cấu trúc trang mới (từ 16 module sang 4 câu hỏi)

Đầu trang (lớp 30 giây): Thẻ "Kết luận hôm nay" = hành động của backend (giữ nguyên, kể cả "Chờ hoàn tất điều kiện") + 1 câu lý do + 1 câu rủi ro lớn nhất + nhãn "Độ tin cậy dữ liệu" (từ module 14) + ngày giờ dữ liệu + dòng miễn trừ ngắn. Dưới đó 4 thẻ câu hỏi, mỗi thẻ có đèn trạng thái (Thuận lợi / Trung tính / Thận trọng / Chưa đủ dữ liệu) kèm chữ và ký hiệu.

| # | Câu hỏi | Module (số hiện tại) | Hình chính | Ghi chú |
|---|---|---|---|---|
| A | Cổ phiếu này đang thế nào? (chất lượng và xu hướng) | 01 Hiệu suất, 02 Phân phối, 06 Kỹ thuật, 07 Alpha, 08 Thị trường/ngành, 09 Đồng thuận | Sparkline giá + radar 9 nhân tố rút gọn thành 5 nhóm | Trả lời "đang tốt hay xấu, so với ngành/thị trường" |
| B | Giá có thể đi đâu? (kịch bản) | 03 ARIMA, 05 HMM, 10 Monte Carlo, 11 Chi phí (dự báo ròng) | Fan chart P05-P95 + lưới 100 chấm; trạng thái HMM bằng 3 thanh | Luôn nói "kịch bản mô phỏng" |
| C | Rủi ro bao nhiêu? | 04 GARCH, 01 (mức giảm lịch sử), 13 Thanh khoản, T+2 (nếu có trong 12/13) | Thang rủi ro 5 bậc + "nếu xấu nhất ~X% trong N phiên"; ví dụ tiền: "10 triệu có thể thành 8,6 - 11,2 triệu" | Đặt trước phần mua/bán trong thứ tự đọc |
| D | Mua bán thế nào? (hành động) | 12 Kế hoạch, 15 Quyết định, 16 Nhận định | Thang giá nằm ngang: cắt lỗ - vào - mục tiêu 1 - mục tiêu 2, kèm số tiền lỗ/lãi theo vốn ví dụ | Chỉ hiện khi đủ điều kiện; nhãn "có điều kiện, không phải lệnh" |
| E | Có tin được báo cáo không? | 14 Dữ liệu, cảnh báo, phiên bản | Huy hiệu chất lượng dữ liệu + danh sách thiếu | Đặt thành dải ngay dưới kết luận, chi tiết ở chuyên sâu |

Thứ tự đọc đề xuất: Kết luận -> C (rủi ro) -> A -> B -> D -> E. Lý do: đặt rủi ro trước hành động để giảm anchoring vào mục tiêu lãi và tôn trọng loss aversion; người xem "Có nên mua?" thấy ngay "mất tối đa bao nhiêu". Nếu cần giữ nhãn "Có nên mua?" cho thẻ đầu, đó là thẻ Kết luận tổng hợp, không phải một module mới.

Việc ánh xạ chính xác module nào vào nhóm nào nên xác nhận với đội mô hình (một số module như 11, 12, 13 chạm nhiều nhóm). Số thứ tự 01-16 vẫn hiển thị nhỏ ở lớp chuyên sâu để tương thích tài liệu và hỗ trợ.

### 5.2 Mẫu văn bản chuẩn cho mỗi module (thẻ)
```
[Đèn trạng thái + nhãn chữ]  Tên dễ hiểu (Tên kỹ thuật) 
KẾT LUẬN (1 câu, <= 20 từ, có động từ, không thuật ngữ)
VÌ SAO (1-2 câu: số liệu so với mốc, nói bằng nghĩa thường)
CON SỐ CHÍNH (tối đa 3: nhãn dễ hiểu + giá trị + mốc so sánh + chú thích 1 dòng)
LƯU Ý (1 câu: giới hạn, điều kiện làm kết luận sai)
[Xem chi tiết]  [? thuật ngữ]
```
Quy tắc: kết luận sinh từ cùng bộ nhánh ngưỡng hiện có (quant-interpretation), không thay đổi tín hiệu; thiếu dữ liệu -> thẻ riêng "Chưa đủ dữ liệu: vì sao + hệ quả"; giữ đúng 0/false.

Ví dụ (Sharpe, module 01):
- Kết luận: "Trong 1 năm qua, cổ phiếu sinh lời tạm ổn so với mức dao động bạn phải chịu."
- Vì sao: "Chỉ số Sharpe 0,9 (thang tham khảo: dưới 1 là trung bình, trên 2 là rất tốt). Nghĩa là mỗi 1% dao động chịu đựng đổi lại chưa đến 1% lợi nhuận vượt lãi suất an toàn."
- Con số chính: Lợi nhuận 1 năm +18% | Mức giảm sâu nhất -27% | Dao động trung bình 31%/năm.
- Lưu ý: "Đây là quá khứ; không đảm bảo tương lai."
(Số trong ví dụ là minh họa, không phải dữ liệu thật.)

Ví dụ (Monte Carlo, module 10) với tần suất tự nhiên: "Trong 100 lần mô phỏng, 58 lần giá sau 20 phiên cao hơn hôm nay, 42 lần thấp hơn. Trường hợp xấu (5 trong 100) giá xuống dưới 22.400." + lưới 100 chấm. Lưu ý: "Mô phỏng dựa trên giả định về dao động trong quá khứ; giá thực tế có thể ra ngoài dải."

### 5.3 Biểu diễn xác suất và rủi ro
- Ưu tiên "X trong 100" + lưới 100 chấm gom nhóm (không rải ngẫu nhiên); % chỉ là phụ.
- Dải thay cho điểm: "thường nằm trong 21.000-27.500" (P05-P95 diễn đạt "9 trong 10 lần").
- Ví dụ bằng tiền cho 10 triệu VND vốn mẫu (người dùng sửa được): tránh tỷ lệ trừu tượng.
- So sánh với mốc: ngành, VN-Index, chính nó 1 năm trước.
- Luôn nêu cả hai phía với cùng cỡ chữ; thứ tự "xấu nhất" trước "tốt nhất" khi nói về mức lệnh.
- Không dùng từ chắc chắn: "sẽ", "chắc chắn", "đảm bảo". Dùng "có thể", "trong mô phỏng", "dựa trên quá khứ".

### 5.4 Giọng văn tiếng Việt
- Xưng hô: không "bạn/tôi" quá thân; dùng câu trung tính, đôi chỗ "bạn" để hướng dẫn hành động ("Bạn có thể đặt mức cắt lỗ ở...").
- Câu ≤ 20 từ; một ý một câu; chủ động; số trước đơn vị rõ ràng ("giảm 27%", không "mức sụt giảm tương đối đạt 27%").
- Thuật ngữ: tên dễ hiểu trước, tên kỹ thuật trong ngoặc ở lần đầu. Bảng gợi ý: Sharpe -> "Lợi nhuận trên mỗi đơn vị rủi ro"; GARCH -> "Dự báo độ rung lắc giá"; HMM -> "Trạng thái thị trường đang là gì (tăng, đi ngang, giảm)"; ADF -> "Kiểm tra giá có xu hướng ổn định hay không"; Hurst -> "Xu hướng có duy trì hay đảo chiều"; CMF -> "Dòng tiền vào/ra"; Alpha -> "Phần lợi nhuận vượt thị trường"; Monte Carlo -> "Mô phỏng nhiều kịch bản giá"; Drawdown -> "Mức giảm sâu nhất từ đỉnh"; T+2 -> "Phải chờ 2 ngày mới bán được cổ phiếu vừa mua"; Thanh khoản -> "Dễ mua bán nhanh mà không đẩy giá".
- Tránh: từ mệnh lệnh "Mua ngay!", cảm thán, emoji cảm xúc, từ viết tắt tiếng Anh không giải nghĩa.
- Nhãn trạng thái: Thuận lợi / Trung tính / Thận trọng / Rủi ro cao / Chưa đủ dữ liệu. Không dùng "Tốt/Xấu" (đánh giá giá trị) cho mô hình.
- Miễn trừ ngắn đặt đúng chỗ (dưới kết luận và dưới mức lệnh), không chỉ chân trang: "Thông tin phân tích tham khảo từ mô hình, không phải lời khuyên đầu tư. Quyết định và rủi ro thuộc về bạn." (Kiểm tra với pháp lý theo quy định chứng khoán VN: Luật Chứng khoán 2019 và hướng dẫn về tư vấn đầu tư.)
- Kiểm thử đọc hiểu: 5 người không có nền tài chính đọc thẻ, hỏi lại "báo cáo nói gì, rủi ro gì, bạn sẽ làm gì" - tiêu chí đạt >= 4/5 trả lời đúng.

### 5.5 Design tokens, màu, chữ

Màu (giữ nền xanh đen và điểm nhấn cam hiện tại; thêm token ngữ nghĩa). Giá trị là đề xuất, cần kiểm tra tương phản bằng công cụ trước khi chốt.
```
--bg: #0B1620 (tối) / #F6F8FA (sáng)       --surface: #12212E / #FFFFFF
--text: #E8EEF3 / #14212B                    --text-muted: #9FB0BF / #4A5A68  (>= 4.5:1)
--accent: cam hiện tại (CTA, tiêu điểm)
--up: xanh tăng   --down: đỏ giảm   --ref: vàng tham chiếu   (đúng quy ước bảng điện VN)
--status-ok / --status-neutral / --status-caution / --status-risk / --status-nodata
   mỗi trạng thái = màu + biểu tượng (check, dấu ngang, tam giác, cấm, dấu hỏi) + chữ
--uncertainty: một họ xanh lam nhạt cho fan chart (dải P05-P95 nhạt, P25-P75 đậm hơn, P50 nét đặc)
```
Tách màu "tăng/giảm giá" khỏi màu "tốt/xấu" của trạng thái module để tránh đọc nhầm (giá giảm không luôn là rủi ro cao). Kiểm tra mù màu đỏ-xanh (deuteranopia): dùng thêm dạng/độ đậm/mũi tên.

Chữ: IBM Plex Mono giữ cho số, mã, bảng; thêm một sans có tiếng Việt cho văn bản dài (đề xuất IBM Plex Sans hoặc Be Vietnam Pro, bundle local như hiện nay). Thang cỡ chữ đề xuất (nâng so với DESIGN.md hiện 13-16px): thân bài 16-17px (line-height 1,6, độ rộng dòng 60-75 ký tự), nhãn 14px tối thiểu, số liệu lớn trong thẻ 24-32px, tiêu đề thẻ 18-20px. Tối thiểu 14px cho mọi chữ có ý nghĩa; chú thích 12-13px chỉ cho thông tin phụ không thiết yếu. Số dùng tabular-nums, căn phải trong bảng. Định dạng số kiểu Việt (1.234,5) nhất quán.

Khoảng cách và bố cục: lưới 4/8 px; thẻ bo góc nhất quán; tối đa 1 cột trên di động, 2 cột từ >= 768px; mục tiêu chạm >= 44x44 px (WCAG 2.5.5 AAA / 2.5.8 AA là 24px); một thẻ không cao hơn ~1 màn hình di động ở lớp 3 phút.

### 5.6 Trợ năng (accessibility)
- Tương phản văn bản >= 4.5:1, thành phần UI/đồ thị >= 3:1 (WCAG 1.4.3, 1.4.11), cả sáng và tối.
- Không dùng màu làm kênh duy nhất (1.4.1): luôn có chữ/ký hiệu.
- Mọi chart có tiêu đề + mô tả văn bản + bảng dữ liệu thay thế (đã làm ở radar/3D, mở rộng cho fan chart và lưới chấm).
- Thứ tự focus theo thứ tự đọc; skip link; disclosure dùng button với aria-expanded; tooltip hiện cả khi focus, đóng bằng Esc và không biến mất khi rê chuột vào (WCAG 1.4.13).
- Reflow 320 px, zoom 200% không mất nội dung (1.4.10), khoảng cách chữ có thể chỉnh (1.4.12).
- Dùng lang="vi"; screen reader đọc đúng "VND", đơn vị, % (aria-label cho ký hiệu).
- Giảm chuyển động (mục 4); nút Giảm hiệu ứng trong app.
- Chế độ in/PDF đơn giản cho lớp 1 để chia sẻ (tùy chọn).

### 5.7 Kiểm thử và đo lường (không gamification)
- Đo hiểu, không đo giao dịch: tỷ lệ trả lời đúng bài kiểm đọc hiểu 5 câu; thời gian đến "tôi hiểu rủi ro"; tỷ lệ mở lớp chuyên sâu; tỷ lệ bấm thuật ngữ; tỷ lệ bỏ tour.
- Không dùng KPI "số lượt hành động mua" làm thước đo thành công của UI.
- A/B test các cách diễn đạt xác suất (% vs X/100 vs icon array) với mẫu người dùng thật trước khi triển khai rộng.

## 6. Ưu tiên triển khai gợi ý
1. (Nhanh, ít rủi ro) Thẻ Kết luận + 4 câu hỏi + mẫu văn bản chuẩn + glossary tooltip + nâng cỡ chữ thân bài + sans cho văn bản. Không đổi API.
2. Bộ chuyển 3 lớp đọc, coach marks 4 bước, trang "Cách đọc".
3. Lưới 100 chấm + fan chart có chuyển động có nghĩa + thang giá hành động có số tiền ví dụ.
4. Tinh chỉnh 3D chỉ cho chỗ có chiều thật, đưa vào lớp chuyên sâu; tiếp tục kiểm thử trợ năng.

## 7. Rủi ro và giả định
- Tôi chưa chạy ứng dụng hay xem ảnh chụp, chỉ đọc tài liệu và mã; nhận xét giao diện hiện tại dựa trên tài liệu.
- Ngưỡng văn bản (Sharpe 0/1/2, v.v.) lấy từ docs/quant-reader-ui-review.md, đã nằm trong quant-interpretation-thresholds.ts; mọi câu chữ mới phải dùng cùng ngưỡng, không tự thêm tín hiệu.
- Giá trị màu/cỡ chữ là đề xuất khởi điểm.
- Văn bản miễn trừ cần rà soát pháp lý Việt Nam.
- Một số nghiên cứu (natural frequencies, icon array) có kết quả không đồng nhất; nên thử nghiệm với người dùng QuanTik.

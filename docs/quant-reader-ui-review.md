# QuanTik: rà soát giao diện Phân tích Quant

Bản cập nhật ngày 29/10/2026. Phạm vi: React/CSS và diễn giải kết quả đã công bố. Không sửa API, proxy, mô hình, backtest, phép tính tài chính, nguồn dữ liệu hoặc quyết định.

## Khám phá và bố cục

Frontend dùng React/Next.js. `AnalysisReport.sections[name].metrics` cung cấp số liệu; `report.research` cung cấp biểu đồ đã tổng hợp. `quant-live-report.tsx` ghép các component. CSS riêng được giới hạn trong `.quant-report`; font IBM Plex Mono đã được bundle local.

Khối hành động ở đầu, tiếp đến lưới 01–16 có màu và trạng thái. Chọn ô sẽ mở và cuộn tới đúng module, chỉ một module hiển thị để giảm rối. Đã bỏ khối “Xâu chuỗi các mô hình và khuyến nghị”; tìm trong mã nguồn không còn khối render hoặc dữ liệu riêng của khối này.

Tất cả các chỉ số có nhãn của module được hiển thị trực tiếp, không còn “Xem thêm N chỉ số”. Giá trị thiếu hiện —. Bên dưới số liệu/biểu đồ có đoạn “Ý nghĩa & phân tích”; phần phân tích sâu mở qua “Phân tích chi tiết kết quả”. Kiến thức nền và cách đọc biểu đồ mặc định đóng. Module 16 giữ bốn ý ngắn từ các module trước, không lặp radar.

## Sinh diễn giải và các mốc đọc

`moduleAnalysis` đọc đúng số liệu đang trình bày, dùng nhánh theo giá trị để tạo đoạn văn với con số cụ thể, ý nghĩa và câu hàm ý quyết định. Các mốc nằm riêng ở `quant-interpretation-thresholds.ts`. Chúng chỉ chọn câu chữ, không cấp tín hiệu, tính điểm hoặc thay đổi hành động.

| Module | Mốc/điều kiện dùng để diễn giải |
|---|---|
| 01 Hiệu suất | Sharpe 0/1/2; Sortino tham khảo 1; mức giảm và biến động lịch sử giữ nguyên |
| 02 Phân phối | Độ lệch 0; độ nhọn dư 0; kết luận Gaussian từ nguồn |
| 03 ARIMA | ADF 0,05; AIC/BIC chỉ so trong cùng dữ liệu, không gán ngưỡng cổ phiếu tốt |
| 04 GARCH | Độ dai dẳng 0,9 tham khảo; miền 0 < α+β < 1; dấu γ theo phương trình nguồn |
| 05 HMM | Nhãn trạng thái nguồn; xác suất 50% chỉ phân biệt quá nửa; phân biệt fallback |
| 06 Kỹ thuật | CMF 0; ER 0,3 tham khảo độ nhiễu; dấu độ dốc và RS20 |
| 07 Alpha | Momentum 0; Hurst 0,5; trạng thái tham gia/khả dụng do nguồn xác nhận |
| 08 Thị trường/ngành | Nhãn ngành nguồn; tương quan âm/0/dương, không suy nhân quả |
| 09 Đồng thuận | Độ phủ 100% để phân biệt đầy đủ/còn thiếu; không đặt ngưỡng mua |
| 10 Monte Carlo | P(tăng) so 50% trong mô phỏng; phân biệt cuối kỳ với T-lock |
| 11 Chi phí | Dự báo ròng âm/0/dương, không tính lại chênh lệch |
| 12 Kế hoạch | Giá dương và SL < Entry < TP1 ≤ TP2; dùng số lượng/lỗ công bố |
| 13 Thanh khoản | Tỷ lệ 5/20 so 1×; đạt/không đạt giữ từ nguồn |
| 14 Dữ liệu | Thang công bố 0–100; PASS/FAIL và cảnh báo gốc, không tự chấm đạt |
| 15 Quyết định | Điểm công bố 0–100; hành động, thực thi và lý do giữ nguyên |
| 16 Nhận định | Tổng hợp hỗ trợ/rủi ro/phần thiếu/kết luận; không tạo quyết định mới |

Thiếu dữ liệu toàn bộ, module tắt hoặc chưa khả dụng sẽ hiện “Chưa đủ dữ liệu để diễn giải”. Nhánh lỗi hoặc available=false được lọc trước khi tạo câu; giữ đúng số 0 và false. Một phần còn thiếu không được coi là trung tính. Không có thống kê hiệu quả dự báo ngoài mẫu thì không suy diễn độ chính xác của từng model.

## Chuyển động 3D

Các hình hiện tại là Canvas 2D phối cảnh (Monte Carlo/GARCH) và DOM/CSS 3D (nhân tố), không có WebGL renderer để dispose. Bổ sung tự xoay GARCH và nhân tố; Monte Carlo tiếp tục phát lại phân vị nguồn. Dùng delta-time, requestAnimationFrame, giới hạn vẽ khoảng 30fps, DPR canvas ≤2. Dừng khi ra viewport/tab ẩn, tôn trọng reduced-motion; tự xoay tạm ngừng khi kéo và có nút dừng. Dọn rAF, observer, listener khi hủy. Frame Monte Carlo dùng ref, tránh tạo lại toàn bộ observer theo từng phiên. HMM cũng dừng hiệu ứng khi bị ẩn.

Đây là chuyển động giao diện trên dữ liệu của báo cáo, không phải dữ liệu thị trường trực tiếp; không tạo thêm giá hoặc đường dự báo.

## Bằng chứng và giới hạn kiểm tra

- Trước: ảnh người dùng cho thấy ba chỉ số bị giấu sau “Xem thêm 3 chỉ số”, diễn giải chung dài và ít gắn số liệu.
- Sau qua server render: đủ 16 ô, chỉ một module mở, khối hành động trước điều hướng; module hiệu suất có đủ sáu nhãn trong lưới trực tiếp, không còn thanh giấu chỉ số. Diễn giải Phân phối thay đổi khi đổi dấu độ lệch; con số 0,491 và 2,442 xuất hiện trong đúng câu mô tả đuôi phải/đuôi dày.
- Node tests: 33/33 qua. Có kiểm tra không đột biến báo cáo, không dùng số bị lỗi/tắt, giữ số 0/false, đổi câu theo số liệu và ngưỡng, và giữ nguyên quyết định nguồn.
- Production build: qua. Rà nguồn tám component render báo cáo/biểu đồ: không có khai báo cỡ chữ dưới 13px. Màu nhấn so nền tối #0d1913 đạt tương phản từ 7,86:1 đến 10,39:1.
- Truy vấn computed style: `frontend/tests/helpers/quant-ui-audit.ts`, được gọi trong `quant-modules.spec.ts` khi mở từng module, các details và tooltip. Kiểm tra cỡ chữ tính toán, font IBM Plex Mono, cỡ chữ SVG sau biến đổi viewBox. Canvas đọc cỡ chữ tối thiểu từ CSS variable, không dùng cỡ font theo DPR.
- **Chưa xác minh bằng trình duyệt trong phiên này**: công cụ trình duyệt không khởi động được vì filesystem của kernel chỉ đọc. Vì vậy chưa có ảnh “sau” mới, chưa có kết quả computed-style thực chạy, và chưa có profile hiệu năng/rò rỉ bộ nhớ thực tế. Không tuyên bố các mục đó đã qua. Bộ kiểm tra trình duyệt đã được cập nhật để chạy khi môi trường hoạt động.

## Tệp sửa trong lần này

| Tệp | Mục đích |
|---|---|
| frontend/src/components/quant-model-section.tsx | Hiện đủ chỉ số; ý nghĩa ngắn và phân tích chi tiết; nhận định 4 ý |
| frontend/src/components/quant-module-navigation.tsx | Badge trạng thái trên đủ 16 ô, màu có biến thể sáng |
| frontend/src/components/quant-live-report.tsx | Truyền trạng thái và giữ chữ SVG đúng kích thước trên màn hình |
| frontend/src/components/quant-reader.module.css | Biến typography, nhịp đoạn, badge, font tooltip và công thức |
| frontend/src/components/quant-action-summary.tsx | Màu Entry/SL/TP theo ý nghĩa |
| frontend/src/components/quant-scenario-3d.tsx | Tự xoay, dừng tương tác/reduced-motion, giảm tạo lại observer |
| frontend/src/components/quant-report-views.tsx | GARCH và hồ sơ nhân tố chuyển động, tạm dừng/khôi phục |
| frontend/src/components/hmm-phase-triangle.tsx | Dừng hiệu ứng khi ẩn và dùng biến font tối thiểu |
| frontend/src/components/term-hint.tsx | Tiêu đề tooltip tiếng Việt riêng trong báo cáo Quant |
| frontend/src/lib/quant-reader.ts | Nhãn trạng thái và thời gian dự báo tiếng Việt |
| frontend/src/lib/quant-presentation.ts | Chia sẻ lọc dữ liệu trình bày và trạng thái thiếu/một phần |
| frontend/src/lib/quant-interpretation.ts | Đoạn diễn giải động cho từng module |
| frontend/src/lib/quant-interpretation-thresholds.ts | Mốc đọc riêng, tách khỏi tính toán quant |
| frontend/tests/helpers/quant-ui-audit.ts | Truy vấn computed style và kích thước chữ SVG thực |
| frontend/tests/quant-modules.spec.ts | Nghiệm thu đủ chỉ số, diễn giải, font và tooltip tiếng Việt |
| tests/quant-interpretation.test.cjs | Số liệu trái dấu, ngưỡng, thiếu/lỗi, bất biến đầu vào |
| tests/quant-reader-layout.test.cjs | Sáu chỉ số hiệu suất hiện đủ, điều hướng 16 module |
| docs/quant-reader-ui-review.md | Phạm vi, mốc diễn giải và bằng chứng kiểm tra |


## Bổ sung: đầy đủ hồ sơ nhân tố

Ảnh phản hồi cho thấy Radar chỉ có 3 đỉnh do bản xem dùng fixture 3 nhân tố. Đối chiếu `AdaptiveScorer.WEIGHTS` trong repo tham chiếu xác định 12 ID: sharpe, forecast_ret, forecast_conf, cmf, trend_quality, alpha_composite, hmm_regime, lock_safety, vol_regime, distribution_quality, liquidity, data_quality.

`quant-factors.ts` bổ sung danh mục tên đầy đủ và hàm trình bày dùng chung. Bản xem riêng có 12 giá trị mẫu chuẩn hóa, được gắn rõ là dữ liệu mẫu. Báo cáo thật giữ nguyên giá trị/min/max từ API, không dùng mẫu để bù thiếu. Radar và 3D giữ đủ trục/cột; dữ liệu thiếu không được thay bằng 0, không tô đa giác qua khoảng thiếu. ID mới ngoài danh mục vẫn được giữ, không giới hạn số lượng.

Tệp bổ sung/sửa: `frontend/src/lib/quant-factors.ts`, `frontend/src/lib/quant-reader.ts`, `frontend/src/components/quant-research.tsx`, `frontend/src/components/quant-report-views.tsx`, `frontend/preview/quant-reader.tsx`, `tests/quant-factor-catalog.test.cjs`, `frontend/tests/quant-modules.spec.ts`.

Kiểm thử bổ sung: đủ 12 trục và 12 nhãn, chỉ vẽ các điểm thực có; giữ đúng số 0, miền nguồn và đầu vào bất biến; không cắt ID thứ 13; không vẽ giá trị thiếu, không hữu hạn hoặc ngoài miền. Giới hạn kiểm tra bằng trình duyệt ở trên vẫn áp dụng.

## Điều chỉnh hồ sơ theo yêu cầu mới: 9 nhân tố có tên trực tiếp

Hồ sơ Radar/3D hiện dùng danh sách trình bày cố định 9 nhân tố: Sharpe, Dự báo sau phí, Độ tin cậy dự báo, Dòng tiền, Chất lượng xu hướng, Alpha tổng hợp, Trạng thái HMM, Trạng thái biến động, Thanh khoản. Bỏ An toàn T+2, Chất lượng phân phối và Chất lượng dữ liệu khỏi hồ sơ; dữ liệu gốc và các module khác giữ nguyên.

Radar thay số thứ tự bằng tên trực tiếp, nhãn dài chia hai dòng, cỡ chữ tối thiểu 13px. 3D dùng tên ngắn dưới cột và tên đầy đủ ở bảng giá trị. Hai góc nhìn và bảng dữ liệu cùng dùng `profileFactorIds`; không tự thêm các nhân tố ngoài danh sách được chọn. Kiểm thử đã cập nhật để xác nhận đúng 9 trục, nhãn tên và ba mục bị loại, đồng thời giữ nguyên số liệu nguồn.

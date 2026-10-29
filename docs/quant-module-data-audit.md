# Rà soát dữ liệu hiển thị 16 module Quant

Ngày 29/10/2026. Phạm vi: giao diện, diễn giải và fixture kiểm thử. Không sửa backend, API/proxy, engine, nguồn giá, backtest hoặc cách tính nhân tố.

## Kết quả tìm lỗi

1. Preview kế thừa fixture ARIMA `UNAVAILABLE` / `arima: null`, nên toàn bộ ô trống dù giao diện có đường đọc kết quả.
2. Preview ghi đè `statistics.metrics`, làm mất `_price_close` / `_price_dates` dùng cho histogram Phân phối. Thiếu `n`, độ dốc, beta, giá trị vị thế và lỗ tại SL trong mẫu.
3. Test cũ điền `0.5` cho trường thiếu, kể cả order, tên ngành, nhãn trạng thái, boolean. Test đó không chứng minh tương thích kiểu dữ liệu.
4. Khối Hành động, adapter 3D Monte Carlo/GARCH/HMM và biểu đồ bổ sung chưa chặn đầy đủ `UNAVAILABLE`: có thể trình bày số cũ còn trong payload. Đã thống nhất chặn trạng thái và kết quả lỗi/tắt.
5. Nếu thiếu hẳn một section, module biến mất. Nay vẫn giữ module và hiển thị trạng thái thiếu dữ liệu, không tạo số thay thế.

## Bộ mẫu chung và đường đọc được kiểm tra

`frontend/tests/fixtures/quant-report-sample.ts` chỉ dành cho preview/test. Không được import vào route production hay dùng làm fallback cho API.

| Module | Dữ liệu mẫu / phần hiển thị được kiểm tra |
|---|---|
| 01 Hiệu suất | 6 chỉ số, số quan sát, đường sụt giảm, diễn giải Sharpe/Sortino |
| 02 Phân phối | Gaussian=false, skew/kurtosis, histogram từ chuỗi giá lịch sử |
| 03 ARIMA | order=[1,0,1], AIC=412.6, BIC=423.1, ADF=.012, stationary=true, 3 giá dự báo |
| 04 GARCH | biến động, alpha/beta, persistence, half-life, EGARCH, đường 2D và adapter 3D |
| 05 HMM | nhãn, phương pháp, 3 xác suất, lịch sử và tam giác chuyển pha |
| 06 Kỹ thuật | CMF, ER, R², độ dốc, RS20, beta |
| 07 Alpha | Momentum/cửa sổ, Hurst/regime, LightGBM và trạng thái hồi quy phần dư |
| 08 Thị trường & ngành | tên ngành, xu hướng, tương quan |
| 09 Đồng thuận | dự báo, đồng thuận, độ phủ, mức ủng hộ, horizon |
| 10 Monte Carlo | horizon, xác suất cuối kỳ, T-lock, 5 phân vị và histogram cuối kỳ |
| 11 Chi phí | gộp/khứ hồi/ròng và biểu đồ |
| 12 Kế hoạch vị thế | Entry/SL/TP1/TP2, số lượng, giá trị, lỗ tại SL, cách tính quy mô |
| 13 Thanh khoản | đạt/không đạt, giá trị TB, tỷ lệ, sức chứa |
| 14 Dữ liệu | PASS/score và diễn giải |
| 15 Quyết định | điểm, WATCH, executable=false, gate=false; không tự đổi hành động |
| 16 Nhận định | 4 đoạn tổng hợp từ đúng module và quyết định của báo cáo |

Hành động đầu trang có mẫu Kelly, R:R, quy mô và thời gian khóa thanh toán. Tất cả chỉ số guide có giá trị đúng kiểu. Số 0 / false là kết quả thật, không bị đổi thành thiếu. Mẫu không phải kết quả tính mô hình FPT thực tế.

## Tình huống kiểm thử

- `complete`: đủ dữ liệu, cả 16 module render; không ô KPI guide nào thiếu.
- `partial`: thiếu forecast ARIMA, EGARCH, Sortino và Kelly; vẫn giữ kết quả còn lại, không tự điền.
- `unavailable`: giữ cố ý số cũ nhưng status UNAVAILABLE; không để số cũ lọt vào hành động/biểu đồ.
- `disabled`: giữ số cũ, status DISABLED; không hiển thị như kết quả khả dụng.
- `failed`: nhánh kết quả có error, vẫn giữ số cũ để kiểm tra bộ lọc.
- Bổ sung thiếu hẳn section ARIMA, AIC/ADF=0 và stationary=false; input báo cáo không bị sửa bởi renderer.

Preview có liên kết riêng cho 5 tình huống. Bộ mẫu dùng chung cho Node SSR và Playwright; bỏ vòng lặp điền 0.5. Có ảnh ARIMA/Phân phối, kiểm tra runtime, điều hướng, số liệu, font/SVG và mobile trong Playwright.

## Kiểm tra và giới hạn

- Local: 44/44 Node tests đạt; TypeScript và production build đạt; diff whitespace đạt.
- Trình duyệt local không khởi động: `bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`. Không tuyên bố đã xác minh screenshot/computed style bằng local browser. Kết quả browser của GitHub Actions được ghi trên PR.
- Chưa lấy báo cáo thật của API/VPS; đây là kiểm tra hợp đồng render bằng dữ liệu tổng hợp, không chứng nhận pipeline production tính đủ mô hình.
- PR gồm toàn bộ thay đổi giao diện reader và hồ sơ 9 nhân tố đã duyệt trong phiên, cộng phần audit này. Không gồm PR quét sàn/Watchlist #12.

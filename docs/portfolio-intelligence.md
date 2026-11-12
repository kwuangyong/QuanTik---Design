# Portfolio Intelligence — bản thử nghiệm

Route: `/portfolio`. Quản lý vị thế, đánh giá rủi ro, mô phỏng đa chiều và kiểm chứng phương án giảm vị thế. Bản thử nghiệm dùng dữ liệu mẫu, không gọi API thị trường hoặc đặt lệnh.

## Luồng sử dụng

1. **Tổng quan:** chọn một trong ba danh mục mẫu, nhập/sửa/xóa vị thế qua Modal có sẵn. Giá mua dùng VND/cổ phiếu, khối lượng số nguyên. Có tiền mặt, hoàn tác xóa, lưu trình duyệt và CSV.
2. **Rủi ro & tương quan:** xem tương quan mã và ngành, biến động năm, beta và đóng góp phương sai. Đọc HMM riêng từng mã làm bối cảnh.
3. **Kịch bản biến động:** chọn 5/20/60 phiên; cú sốc thị trường/ngành/mã; mức tăng tương quan và hệ số biến động. Bấm **Chạy mô phỏng**. Đổi thiết lập hoặc danh mục sẽ đánh dấu kết quả cũ, không âm thầm thay kết quả.
4. **Action plan:** đặt trần mã/ngành/biến động/ngân sách lỗ, đọc ưu tiên P1/P2 và căn cứ–hướng xử lý–điều kiện. Bấm **Tạo & kiểm chứng phương án** để xem lượng giảm hợp nhất và trước–sau. Không sửa danh mục gốc hoặc đặt lệnh.

## Kiến trúc có thể tái sử dụng

- `frontend/src/lib/portfolio-engine.ts`: kiểu dữ liệu, validation, covariance, Pearson, tương quan ngành, định giá, P&L, biến động năm và đóng góp rủi ro. Không phụ thuộc React, DOM hoặc API.
- `frontend/src/lib/portfolio.ts`: sáu mã và ba danh mục mẫu, lấy giá/ngành/nến qua adapter dùng chung; định dạng tiền/tỉ lệ.
- `frontend/src/lib/portfolio-resources.ts`: tái sử dụng `getStock`, `getScanResult`, `getDemoResult`, `getDemoCandles`, `getAnalysisVisuals`, `factorProfile`, `moduleReading` và `analysisReason`. Căn chỉnh nến theo giao nhãn phiên; chuẩn hóa báo cáo đã công bố theo đúng mã/phiên/ca và section availability.
- `frontend/src/lib/portfolio-quant-adapter.ts`: GARCH/HMM đọc qua `getAnalysisVisuals`, không đọc JSON riêng; từ chối thiếu model hoặc tham số không hợp lệ.
- `frontend/src/lib/portfolio-simulation.ts`: Cholesky, mô phỏng có seed, phân vị/đuôi lỗ, phân rã tác động và phương án tái phân bổ. Nhận danh mục và tập asset làm đối số, không cần UI.
- `frontend/src/components/portfolio-intelligence.tsx` và `portfolio.module.css`: UI bốn tab; dùng Shell, Modal và token theme hiện có. Có hỗ trợ bàn phím và `prefers-reduced-motion`.

Các module engine có thể được import từ quét toàn sàn hoặc trang Quant; bản này chưa thay đổi logic hai trang đó.

## Đơn vị và công thức

- Giá/giá vốn/tài sản/P&L dùng VND. Lợi suất, tỉ trọng, volatility trong engine dùng số thập phân; chỉ nhân 100 khi hiển thị.
- Giá/ngành từ snapshot dùng chung của `mock-data.ts`; nguồn ghi rõ đơn vị nghìn đồng nên đổi sang VND đúng một lần. Lợi suất `close[t]/close[t−1]−1` từ nến mẫu 1D của Quant. Hiện có 48 nến chung, tương ứng 47 quan sát; không tự sinh thêm chuỗi 252 phiên. Đây vẫn là dữ liệu mẫu, không phải lịch sử thị trường thực.
- Beta cho cú sốc thị trường vẫn là giả định theo mã, chưa được fit với benchmark đồng bộ. Hệ số 252 trong quy đổi volatility chỉ là số phiên năm, không phải số quan sát hiện có.
- Snapshot quét chỉ gồm 10 dòng mẫu; sáu mã Portfolio hiện không nằm trong tập này. Ghi `NOT_IN_SAMPLE` và điểm `null`, không suy là bị loại hoặc điểm 0. Quant demo được ghi nhãn riêng, không thay thế screening thực hay action gate.
- Giá vốn của danh mục người dùng lưu được giữ nguyên khi đổi nguồn giá. Chỉ giá vốn của các danh mục mẫu mới được đặt theo tỉ lệ giá snapshot.
- Covariance chia `n−1`; volatility năm = `sqrt(wᵀΣw × 252)`; đóng góp phương sai = `wᵢ(Σw)ᵢ / (wᵀΣw)`. Tỉ trọng tính trên tổng tài sản gồm tiền mặt.
- Tương quan ngành gộp các mã đang nắm giữ theo tỉ trọng giá trị cố định. Không thay thế tương quan các chỉ số ngành toàn thị trường.
- GARCH lấy alpha/beta/omega và volatility cuối cùng trong `backend/mock/analysis-visuals.json`. `valuePct / 100`, `omega / 10000`. Phương sai kỳ vọng theo kỳ: `h[t+1] = omega + (alpha+beta) × h[t]`.
- Đây là lognormal Gaussian với phương sai kỳ vọng GARCH; không phải GARCH–t, cũng không phải mô phỏng phương sai đường đi đầy đủ. Tham số Quant và cửa sổ nến mẫu chưa được hiệu chỉnh cùng nhau.
- Ma trận tương quan = `(1−stress) × (0,98 × R + 0,02 × I) + stress × J`. I là ma trận đơn vị, J toàn số 1. Co về I và trộn J giữ PSD; Cholesky có kiểm tra pivot.
- Cú sốc tổng kỳ cộng theo log: `beta × log(1+shock thị trường) + log(1+shock ngành) + log(1+shock mã)` khi đúng đối tượng. Chia đều qua số phiên. Drift log cơ sở `−variance/2` giữ kỳ vọng giá cơ sở không tăng/giảm.
- 1.200 đường chung cho toàn bộ sáu mã; seed mặc định 42. Trước–sau luôn giữ cùng thứ tự universe và nhiễu, kể cả mã đã bán hết. Tiền mặt không có biến động/lãi suất.
- Phân vị P05/P25/P50/P75/P95 lấy trực tiếp từ tổng giá trị mỗi đường tại từng phiên, không cộng phân vị từng mã. Phân vị cắt ngang không phải một đường giá dự đoán duy nhất.
- VaR 95%: phân vị 95% của tổn thất cuối kỳ. CVaR 95%: trung bình 5% đường tổn thất lớn nhất. Hai chỉ số chặn dưới ở 0. Xác suất lỗ cuối kỳ và xác suất có ít nhất một phiên chạm ngân sách là hai chỉ số khác nhau.
- Phân rã tác động theo mã/ngành có cả cú sốc thuần và thay đổi giá trị kỳ vọng Monte Carlo. Bảng nhạy thay thị trường × ngành, giữ cú sốc riêng mã, chỉ báo tác động thuần.
- HMM là xác suất trạng thái mẫu từng mã. Không bình quân thành HMM danh mục hoặc xác suất thắng. Không bổ sung ARIMA/LightGBM khi thiếu đầu vào đồng bộ.

## Phương án Action

Thứ tự: trần từng mã → trần ngành → giảm đồng đều nếu vượt volatility → giảm đồng đều nếu VaR 95% vượt ngân sách. Mọi phần giảm chuyển sang tiền mặt và giữ nguyên tổng tài sản tại thời điểm giả lập. Trần luôn tính trên tổng tài sản gốc. Lượng giữ lại làm tròn xuống số nguyên, tương đương lượng giảm làm tròn lên một cổ phiếu. Mỗi mã chỉ có một dòng giảm cuối cùng.

Sau làm tròn, chạy lại và kiểm tra giới hạn; nếu chưa đạt sẽ gắn nhãn cần rà soát. Phương án là một heuristic giảm vị thế, không phải tối ưu hóa lợi nhuận hoặc nghiệm tối ưu toàn cục. VaR không phải mức lỗ tối đa; ngân sách VaR không bảo đảm xác suất chạm ngân sách bằng 0. Phí, thuế, thanh khoản, trượt giá, quy tắc lô và giới hạn giao dịch chưa tính.

## Chạy tại máy

```sh
npm ci
npm run dev
# Mở http://localhost:3000/portfolio
npm run typecheck
npm test
npm run build
npm run test:e2e --workspace frontend -- portfolio.spec.ts
```

Playwright tự khởi động backend test và Next server. Có thể chỉ định Chromium có sẵn bằng biến `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; nếu không đặt, dùng browser Playwright mặc định.

Xuất HTML sau build:

```sh
PREVIEW_ROUTE=/portfolio npm run preview:export
```

PowerShell: `$env:PREVIEW_ROUTE='/portfolio'; npm run preview:export`. HTML ở `preview/index.html`, đã nhúng CSS, JavaScript, logo và font tiếng Việt. Portfolio hoạt động trực tiếp khi mở tệp. Các trang khác trong shell vẫn là preview của repo, có thể cần backend và không nằm trong phạm vi bàn giao Portfolio.

## Kiểm thử

Unit test bao gồm phép tính tay covariance, đơn vị GARCH, đóng góp phòng vệ âm, phân vị, seed, PSD, bảo toàn tài sản và so sánh cùng nhiễu. Browser test bao gồm nhập/sửa/xóa/hoàn tác/CSV, lưu trình duyệt, trạng thái kết quả cũ, mô phỏng 5/60 phiên, Action trước–sau, bốn tab, hai theme và overflow desktop/mobile. Kết quả xác minh của từng lần thay đổi được ghi trong PR/CI; có thể chạy lại bằng các lệnh ở trên.

## Ranh giới kết nối kết quả công bố

`publishedPortfolioEvidence` nhận hợp đồng `ScreeningLatest`/`ScreeningResults` và `AnalysisReport` sẵn có của hai module. Adapter phân biệt thiếu, sai mã/phiên/ca, ca cũ và không có mã trong tập công bố; chỉ đọc section AVAILABLE. Quyết định/executable và lý do được giữ từ nguồn, không suy từ điểm. Adapter này chưa gọi API, chưa thay mode mẫu của Site và không âm thầm fallback sang demo khi báo cáo thực thiếu. Điểm/hồ sơ nhân tố dùng để đối chiếu, chưa đưa forecast mẫu vào drift hoặc tự tạo lượng mua/bán.

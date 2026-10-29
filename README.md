# QuanTik Design

UI hiện dùng Tailwind CSS v4 trên các component; stylesheet nền chỉ giữ theme/reset và font/KaTeX. Xem [Tailwind, luồng đăng nhập và bảo vệ admin](docs/TAILWIND-AND-ACCESS.md).

## Tài khoản, mua gói và quản trị

Đã bổ sung các màn `/login`, `/account`, `/plans`, `/orders/{id}` và `/admin` theo API Quantik hiện có. Các màn này gọi API thật; dữ liệu demo của dashboard/Quant vẫn giữ riêng như bên dưới. Cấu hình kết nối mẫu ở `frontend/.env.example`.

Xem [bàn giao và điều kiện callback Google](docs/ACCOUNT-ADMIN-IMPLEMENTATION.md), [kế hoạch nhóm ưu tiên](docs/AUTH-USERS-BILLING-ADMIN-PLAN.md) và [bản đồ tích hợp tổng thể](docs/BACKEND-ALIGNMENT.md). Không có thay đổi backend trong repo này.

Vỏ giao diện **Next.js + Tailwind CSS + TypeScript**, lấy QuanTik hiện tại làm gốc.

Home giữ nội dung, logo và các visual tham chiếu từ `kwuangyong/QuanTik-website`, snapshot tree `521a093b56fefd21493026adb4ead77882cdf082`; phần trình bày đã chuyển sang utility Tailwind. Các trang bên trong dùng chung theme và component.

## Chạy local

Node.js 20.9 trở lên:

```bash
npm ci
npm run dev
```

Mở `http://localhost:3000`. Bấm **Đăng nhập hệ thống**; sau đăng nhập Google sẽ vào Dashboard. Admin dùng đường dẫn riêng `/admin`, chỉ hiện form đăng nhập khi chưa có phiên admin hợp lệ.

## Bố cục

- **Dashboard**: VN-INDEX, VN30, UPCOM, HNX-INDEX → bảng điện có TC/trần/sàn, ba mức dư mua/bán, khớp lệnh, tổng KL, GTGD, thống kê và nước ngoài → bảng nhóm ngành. Theo dõi nằm trong cùng bảng. Bấm mã mở cửa sổ chart với Quant bên cạnh; có thể thu/mở Quant hoặc mở trang phân tích toàn màn hình.
- **Quét toàn sàn**: kích hoạt để đọc bản công bố mới nhất, hiển thị hai bảng 5 mã tốt nhất và 5 mã nên tránh nhất theo thứ hạng screening. Mỗi bảng có đủ 42 chỉ số theo sheet lọc cổ phiếu, thu gọn trong 34 cột, chia nhóm và cuộn ngang, cố định mã và nút Quant. Bấm tiêu đề bất kỳ để xem định nghĩa/cách tính; bấm mã để mở screening, nút Quant mở luồng yêu cầu hiện có. Các trường Quant/tên doanh nghiệp chưa có trong API giữ trạng thái thiếu dữ liệu; không lấy điểm screening làm điểm Quant và không chạy phân tích ngầm.

- **Phân tích Quant**: chọn mã → gửi yêu cầu → đọc kết luận dễ hiểu, biểu đồ xu hướng/kịch bản/rủi ro và các mốc giá cần theo dõi. Có mô hình 3D tương tác từ dữ liệu báo cáo; phần mô hình chuyên sâu mở thêm khi cần.
- **Biểu đồ**: giữ đường dẫn `/charts?symbol=FPT` cho chế độ toàn màn hình. Biểu đồ nằm trong luồng chọn mã, không thêm mục riêng vào menu.

Hợp đồng API và xác nhận production: [Screening tables](docs/SCREENING-TABLES.md).

## Dữ liệu và phạm vi

Bảng điện AGR đã lên production ngày 18/10/2026. Xem [bằng chứng và khôi phục release](docs/AGR-PRICEBOARD-PRODUCTION.md).

Biểu đồ đã chuyển sang iframe VPS và nội dung giao diện đã được rút gọn. Xem [release VPS Chart](docs/VPS-CHART-PRODUCTION.md).

`backend/` chỉ có **mock JSON**, không có API server, scheduler, job runner, scoring, backtest hoặc engine Quant. Không dựng lại bộ nạp dữ liệu hay vòng lặp hai lần/ngày. Theme, Theo dõi, lọc và trạng thái mở/thu chỉ là tương tác giao diện cục bộ.

- Bảng điện Dashboard dùng dữ liệu AGR thật: tải snapshot qua `/api/market/agr`, sau đó nhận delta qua `wss://trading.agr.vn/market/socket.io/` (Engine.IO 3 / Socket.IO 2), đăng ký `e:HOSE`, `e:HNX`, `e:UPCOM`. Kết nối trực tiếp từ trình duyệt, có heartbeat, tự nối lại và tải snapshot sau reconnect/đổi phiên/quay lại tab. Không cần API key ở thời điểm tích hợp. Chỉ báo “Đã kết nối AGR” sau khi đăng ký thành công và tải được snapshot; ngày phiên hiển thị riêng vì ngoài giờ không có giao dịch mới. Nếu lỗi, giữ dữ liệu đã nhận và báo trạng thái; không thay bằng giá mẫu. Bảng cổ phiếu loại chứng quyền/phái sinh; giá theo nghìn đồng, KL theo cổ phiếu, GTGD theo triệu đồng, hỗ trợ ATO/ATC/PLO. Quant để trống vì AGR không cung cấp điểm Quant. API/protocol công khai của AGR có thể thay đổi, cần kiểm tra lại khi kết nối bị từ chối.
- VN-INDEX, VN30, UPCOM và HNX-INDEX trên Dashboard dùng giá trị/biến động thật từ AGR, tải ban đầu rồi cập nhật qua các kênh `idx` trên cùng WebSocket bảng điện. Không lấy giá trị từ JSON mẫu. Xem [release chỉ số AGR](docs/AGR-INDICES-PRODUCTION.md).
- `market.json`: snapshot 16 mã được giữ cho các màn mẫu và metadata ngành hiện có. Mã AGR chưa có metadata hiển thị “Chưa phân ngành”. Bảng ngành vẫn là số liệu tham khảo, không tính từ bảng giá AGR. GTGD không phải tiền ròng vào/ra.
- `scan.json`: bản mẫu cũ từ **LỌC CỔ PHIẾU.xlsx**, sheet **Summary_20261005_2338**, lưu tham khảo bố cục. Trang screening hiện dùng API bản công bố, không đọc file mẫu này.
- File Excel không chứa bảng hệ số trọng số %. Giao diện ghi rõ phần còn thiếu, không tự đặt hệ số hoặc công thức.
- `analysis.json`, `charts.json`: vùng dữ liệu để nối sau; không có dự báo giả hoặc nến tự sinh.
- Biểu đồ nhúng iframe **VPS Chart** tại `https://chart.vps.com.vn/tv/`, truyền `symbol`, `allowFullscreen=true`, `resolution` (1D/1W/1M) và `lang=vi`. Bấm mã ở Dashboard sẽ dẫn đến trang `/charts?symbol=...`; giữ sidebar Quant và liên kết mở biểu đồ riêng. Không sử dụng nến mẫu trong giao diện này. Nội dung và độ trễ bên trong iframe do VPS cung cấp.

## Kiểm tra và xem thử

Tooltip thuật ngữ dùng nguyên văn 57 định nghĩa đã được ghép từ `metrics.json`, `glossary.js` và `term-education.js` của repo `QuanTik-website`, commit `521a093b56fefd21493026adb4ead77882cdf082`. Công thức được render bằng KaTeX; giữ đủ lý thuyết, công thức, biến, tham số, ví dụ, điều kiện và cách sử dụng. `frontend/src/content/legacy/glossary.json` giữ nguyên mọi trường của nguồn. Riêng 42 cột Summary của screening có định nghĩa trình bày tại `frontend/src/content/screening-sheet.ts`, đối chiếu core tham chiếu; không sửa glossary gốc. Các quy tắc phân loại và tham số thực vẫn theo phiên bản báo cáo được công bố.

```bash
npm run typecheck
npm test
npm run build
npm run preview:export
```

`preview/index.html` dùng cùng các component frontend, với router thay thế để mở độc lập. TradingView cần Internet và môi trường cho phép script/iframe bên ngoài.

`npm run test:e2e` kiểm tra các luồng giao diện desktop/mobile. CI chạy tự động trên main. Trong kiểm thử, nội dung iframe VPS được thay bằng trang kiểm thử để kiểm tra tham số và bố cục ổn định; kiểm thử không xác nhận nguồn giá realtime.

## Chế độ kiểm tra bằng dữ liệu tự do

`backend/mock/demo.json` bật `enabled: true` để nạp 4 chỉ số mô phỏng, khối lượng lần khớp mẫu, 16 kết quả Quant và các bộ nến mẫu 48/24/12 phiên cho ngày/tuần/tháng. Các trọng số nhóm cộng 100% là ví dụ kiểm thử, không được lấy từ Excel hay hệ thống thật. Đặt `enabled: false` để trở về vỏ chưa nối bộ chạy.

Ở chế độ này, **Chạy phân tích mẫu** nạp JSON có sẵn và không gọi API, không chạy mô hình, không tạo kết quả phân tích mới. Biểu đồ trong ứng dụng dùng iframe VPS; nến kiểm thử vẫn lưu trong JSON phục vụ kiểm thử và không được hiển thị bởi `ChartSurface`. Home và các snapshot gốc được giữ nguyên.

## Diễn giải và biểu đồ Quant

Phân tích Quant ưu tiên cách đọc đơn giản: kết luận → xu hướng → vùng giá mô phỏng → rủi ro và các mốc theo dõi. Mô hình 3D dùng các lớp giá hoặc tỷ lệ trạng thái từ đúng báo cáo API, có thể xoay và chọn phiên; không dựng dữ liệu mẫu để lấp phần thiếu. Nhận định gốc, 16 nhóm chỉ tiêu, định nghĩa và biểu đồ nghiên cứu nằm trong phần mở rộng. Xem [Quant simple reader](docs/QUANT-SIMPLE-READER.md).

`backend/mock/analysis-visuals.json` chứa 25 báo cáo minh họa, xác suất trạng thái, đường biến động, các đường giá và phân vị đã lưu. Đây là fixture trình bày, không phải kết quả mô hình của các mã và không phải trọng số mới. Không khớp GARCH/HMM hoặc chạy Monte Carlo trong trình duyệt.

3D trong báo cáo thật dùng SVG với phép chiếu 3D, hỗ trợ kéo, phím mũi tên, thanh xoay và đổi theme; không tự chạy chuyển động. Home và các fixture minh họa giữ renderer riêng.

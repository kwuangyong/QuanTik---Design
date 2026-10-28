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

- **Phân tích Quant**: nhập/chọn mã → xem tiêu chí trước khi chạy → vùng kết quả. Các nút chạy cuối cùng chưa nối backend.
- **Biểu đồ**: giữ đường dẫn `/charts?symbol=FPT` cho chế độ toàn màn hình. Biểu đồ nằm trong luồng chọn mã, không thêm mục riêng vào menu.

Hợp đồng API và xác nhận production: [Screening tables](docs/SCREENING-TABLES.md).

## Dữ liệu và phạm vi

`backend/` chỉ có **mock JSON**, không có API server, scheduler, job runner, scoring, backtest hoặc engine Quant. Không dựng lại bộ nạp dữ liệu hay vòng lặp hai lần/ngày. Theme, Theo dõi, lọc và trạng thái mở/thu chỉ là tương tác giao diện cục bộ.

- `market.json`: 16 mã mẫu chép từ bảng điện QuanTik tại thời điểm đọc; nguồn gốc `vnstock_price_board`. Snapshot cố định, không phải realtime. Giá theo nghìn đồng; KL theo cổ phiếu; GTGD bảng điện theo triệu đồng. Bảng ngành là snapshot toàn thị trường, GTGD theo tỷ đồng, không tính từ 16 mã mẫu. GTGD không phải tiền ròng vào/ra. Chỉ số thị trường thiếu nguồn được để `null`, hiển thị “—”.
- `scan.json`: bản mẫu cũ từ **LỌC CỔ PHIẾU.xlsx**, sheet **Summary_20261005_2338**, lưu tham khảo bố cục. Trang screening hiện dùng API bản công bố, không đọc file mẫu này.
- File Excel không chứa bảng hệ số trọng số %. Giao diện ghi rõ phần còn thiếu, không tự đặt hệ số hoặc công thức.
- `analysis.json`, `charts.json`: vùng dữ liệu để nối sau; không có dự báo giả hoặc nến tự sinh.
- Chart **TradingView** nhúng script Advanced Chart thật, giữ cách cấu hình của repo gốc. Không dùng SVG giả làm TradingView. Dữ liệu, độ trễ và quyền khung intraday phụ thuộc TradingView. Nguồn “Dữ liệu Quantik” giữ vùng hiển thị trống để nối hệ thống cũ.

## Kiểm tra và xem thử

Tooltip thuật ngữ dùng nguyên văn 57 định nghĩa đã được ghép từ `metrics.json`, `glossary.js` và `term-education.js` của repo `QuanTik-website`, commit `521a093b56fefd21493026adb4ead77882cdf082`. Công thức được render bằng KaTeX; giữ đủ lý thuyết, công thức, biến, tham số, ví dụ, điều kiện và cách sử dụng. `frontend/src/content/legacy/glossary.json` giữ nguyên mọi trường của nguồn. Riêng 42 cột Summary của screening có định nghĩa trình bày tại `frontend/src/content/screening-sheet.ts`, đối chiếu core tham chiếu; không sửa glossary gốc. Các quy tắc phân loại và tham số thực vẫn theo phiên bản báo cáo được công bố.

```bash
npm run typecheck
npm test
npm run build
npm run preview:export
```

`preview/index.html` dùng cùng các component frontend, với router thay thế để mở độc lập. TradingView cần Internet và môi trường cho phép script/iframe bên ngoài.

`npm run test:e2e` kiểm tra các luồng giao diện desktop/mobile. CI chạy tự động trên main. Trong kiểm thử, script bên ngoài của TradingView được thay bằng stub để kiểm tra cấu hình và bố cục ổn định; kiểm thử không xác nhận nguồn giá realtime.

## Chế độ kiểm tra bằng dữ liệu tự do

`backend/mock/demo.json` bật `enabled: true` để nạp 4 chỉ số mô phỏng, khối lượng lần khớp mẫu, 16 kết quả Quant và các bộ nến mẫu 48/24/12 phiên cho ngày/tuần/tháng. Các trọng số nhóm cộng 100% là ví dụ kiểm thử, không được lấy từ Excel hay hệ thống thật. Đặt `enabled: false` để trở về vỏ chưa nối bộ chạy.

Ở chế độ này, **Chạy phân tích mẫu** nạp JSON có sẵn và không gọi API, không chạy mô hình, không tạo kết quả phân tích mới. Nguồn **Dữ liệu mẫu** dùng nến giả lập, ghi rõ không phải TradingView. Chọn **TradingView** vẫn dùng widget thật trong bản Next.js hoặc HTML độc lập. Home và các snapshot gốc được giữ nguyên.

## Diễn giải và biểu đồ Quant

Phân tích Quant đọc theo thứ tự Hành động → Hiệu suất & dòng tiền → HMM/Hurst → GARCH → Monte Carlo → Rủi ro & kế hoạch. Biểu đồ nằm trong phần diễn giải tương ứng; **Hiểu mô hình** mở định nghĩa, đầu vào, đầu ra và giới hạn. Nhận định gốc và toàn bộ chỉ tiêu vẫn có thể mở khi cần.

`backend/mock/analysis-visuals.json` chứa 25 báo cáo minh họa, xác suất trạng thái, đường biến động, các đường giá và phân vị đã lưu. Đây là fixture trình bày, không phải kết quả mô hình của các mã và không phải trọng số mới. Không khớp GARCH/HMM hoặc chạy Monte Carlo trong trình duyệt.

3D dùng canvas nhẹ, mặc định đứng yên; phát chuyển động tối đa 30 khung/giây, dừng lịch vẽ khi không còn trong màn hình hoặc tab bị ẩn. Tôn trọng reduced motion, hỗ trợ kéo/phím mũi tên và đổi theme. Sidebar chỉ dựng biểu đồ khi mở phần diễn giải. Home giữ nguyên renderer cũ.

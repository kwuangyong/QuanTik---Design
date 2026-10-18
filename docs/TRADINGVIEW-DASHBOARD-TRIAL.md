# Dashboard bảng điện và popup TradingView

Nhánh thử `codex/tradingview-dashboard-mock-20261018`, từ main `b7dc9509c837ed31eca4686304a5e60c508e04e7`.

## Hành vi

Dashboard chỉ hiển thị bảng điện chứng khoán: TC/trần/sàn, ba mức giá và khối lượng mua/bán tách cột, khớp lệnh, tổng KL, giá trị giao dịch, thống kê và khối ngoại. Có tìm mã, lọc sàn/ngành và danh sách theo dõi. Toàn bộ bảng điện, nút, ô tìm kiếm và bộ lọc dùng IBM Plex Mono. Preview nhúng font WOFF2 cục bộ để không phụ thuộc Google Fonts. Bản xem trước dùng snapshot 16 mã đã có trong repo, không phải feed realtime và không tạo thêm mã/số liệu.

Bấm mã hoặc biểu tượng chart mở popup chứa duy nhất chart nhúng TradingView. Không có bộ chọn nguồn, chart mẫu, thanh chọn mã/timeframe/indicator bên ngoài hay panel/nút Quant trong popup. Timeframe, Indicators và công cụ vẽ dùng thanh công cụ gốc trong widget. Không có chart thường trực hoặc khối ngành bên dưới bảng điện. Phân tích Quant và Quét toàn sàn vẫn ở các trang riêng.

Preview dùng đúng route cho Dashboard, Gói phân tích, Tài khoản và các màn khác; route chưa hỗ trợ hiện trạng thái không tìm thấy. Không dùng Dashboard làm fallback cho mọi đường dẫn. Có history cho điều hướng và nút Back. Tài khoản/gói vẫn cần API thật; preview không dựng giá gói hay phiên đăng nhập giả.

## Kiểm tra

`npm test`, `npm run typecheck`, `npm run build`, `npm run preview:export`.

Node tests kiểm tra dashboard không có bộ chọn nguồn/nội dung mua gói, route Gói và Tài khoản không render bảng điện, popup chỉ có embed, giữ đúng sàn và mã chữ số. Browser tests kiểm tra click mã/mở đóng popup, cấu hình toolbar và thử lại khi script lỗi; script TradingView trong CI được thay bằng stub, không xác nhận dữ liệu giá thật.

## Giới hạn dữ liệu TradingView

Widget không cung cấp API giá cho bảng điện QuanTik. Giá của bảng và widget có nguồn riêng. Quyền hiển thị mã và khung intraday phụ thuộc TradingView; không coi dựng iframe hoặc HTTP 200 là xác nhận giá/realtime. Không tự thay mã lỗi bằng mã khác hoặc nến mẫu. Lỗi tải có nút thử lại và liên kết mở TradingView.

Nguồn: https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/demos/technical-analysis/ và https://www.tradingview.com/widget-docs/faq/data/.

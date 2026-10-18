# Dashboard TradingView — nhánh thử

Nhánh `codex/tradingview-dashboard-mock-20261018`, tạo từ `main` tại `b7dc9509c837ed31eca4686304a5e60c508e04e7`.

## Phạm vi

- Dashboard mặc định dùng widget Market Data (danh mục 16 mã, chia HNX/UPCoM/HOSE), danh sách theo dõi và tab bảng thị trường Việt Nam của TradingView.
- Chart Advanced Chart thật, mặc định PVS (HNX); toolbar chọn khung, Indicators và công cụ vẽ được bật. Bộ khung ngoài gồm 1/5/15/30 phút, 1/4 giờ, ngày/tuần/tháng; bốn bộ chỉ báo ban đầu. Người dùng dùng Indicators trong widget để chọn thêm các chỉ báo được TradingView cung cấp.
- Nhập mã có sàn, gồm cả mã chữ số như HNX:A32; không đoán mọi mã là HOSE. Có NASDAQ:AAPL để đối chiếu khi kiểm tra nguồn nhúng.
- Có trạng thái đang tải, lỗi tải script/không tạo iframe sau 20 giây, nút thử lại và mở trực tiếp TradingView. Dựng iframe không được gắn nhãn thành công dữ liệu/realtime.
- Nguồn mẫu vẫn là lựa chọn rõ ràng, không ngầm thay thế TradingView. Dashboard và chart có lựa chọn nguồn riêng. Chỉ số/ngành mẫu có nhãn. Không sửa code quét toàn sàn, thuật toán, API backend hoặc auth.

## Giới hạn của widget

Bảng nhúng là bảng giá TradingView, không phải bảng điện level 2 với ba mức dư mua/bán. Danh mục 16 mã không đại diện full listing Việt Nam; tab thị trường Việt Nam dùng bộ lọc của widget, dữ liệu do TradingView quyết định.

Tài liệu thị trường nhúng hiện công bố HNX và UPCoM ở mức EOD. HOSE không có trong danh sách này, nên không bảo đảm mã HOSE/intraday hiển thị được. Không thay mã không có quyền bằng một mã khác. Tài khoản TradingView trả phí không thay đổi quyền dữ liệu widget.

Widget iframe không cung cấp callback chọn mã chung cho React. Market Data được cấu hình `largeChartUrl` trỏ dashboard, nhận `tvwidgetsymbol` khi widget điều hướng; không giả lập sự kiện click trong iframe. Có bộ chọn/ô nhập mã riêng trên chart. Không đọc giá từ iframe vào bảng Quant.

Đổi timeframe/preset/theme qua điều khiển ngoài sẽ dựng lại widget, có thể mất thao tác trong chart; dùng toolbar bên trong để tiếp tục phiên chart hiện tại. Đổi mã dùng bộ chọn/ô nhập QuanTik, giữ chart và panel Quant cùng mã. Tắt đổi mã bên trong widget để tránh lệch mã với panel Quant.

## Chạy và kiểm tra

`npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm run preview:export`.

Preview xuất từ chính các component của nhánh này. Preview tĩnh phục vụ thử dashboard/Quant mẫu; tài khoản, thanh toán và API không nằm trong bản demo tĩnh. Thử PVS, AAPL, đổi timeframe/Indicators, theme, tải lại widget, chuyển dữ liệu mẫu; kiểm tra mobile và quay lại Quét toàn sàn.

Kiểm tra tự động: render React mặc định có hai slot widget, khung/indicator; nhận đúng exchange và mã chữ số; không hiện nến mẫu mặc định; giữ đường chart từ scan. Build/typecheck và các test có sẵn được chạy. Các script chart/Market Data được kiểm tra HTTP riêng, không coi HTTP 200 là xác nhận giá.

Browser QA và dữ liệu thật trong iframe chưa được xác nhận trong môi trường này vì thiếu control-browser được hỗ trợ. Không dùng nhãn realtime hay khẳng định tất cả mã/timeframe hoạt động.

## Nguồn chính thức

- https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/demos/technical-analysis/
- https://www.tradingview.com/widget-docs/widgets/watchlists/market-data/
- https://www.tradingview.com/widget-docs/widgets/screeners/screener/demos/stock/
- https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/dynamic-symbols/
- https://www.tradingview.com/widget-docs/markets/asia-pacific/
- https://www.tradingview.com/widget-docs/faq/data/

# Rà soát luồng trước khi sửa giao diện — 30/10/2026

## Phạm vi và chứng cứ

Rà soát source trước mọi thay đổi frontend của lượt này:

- Quant gốc: `kwuangyong/Quant-VN-Stock-Market@d0694a5`.
- Website/API tham chiếu: `kwuangyong/QuanTik-website@521a093`.
- Design: `610c684` và preview kiểm thử `8041224`.
- Watchlist(1).xlsx người dùng gửi: 23 nhóm, 278 ô mã, 223 mã duy nhất,
  48 mã xuất hiện ở nhiều nhóm. Nội dung khớp toàn bộ JSON Watchlist hiện có
  trong Design, bao gồm thứ tự, mã lặp, ô trống và nhãn “Báo hiểm”.

Chưa có source `quantik-server`, response thật của endpoint `/screenings`,
cấu hình upstream hoặc traffic VPS. Những kết luận về source dưới đây không
được coi là chứng nhận production đã dùng đúng phiên bản/đường chuyển dữ liệu.
Không đổi backend, proxy, nguồn dữ liệu, thuật toán, ranking hoặc quyền truy cập.

## Các luồng đã đối chiếu

| Luồng | Logic được xác nhận | Ranh giới cần giữ |
|---|---|---|
| Universe → crawler | `crawl_data.py`: lấy mã theo sàn/nhóm, OHLCV, 21 tiêu chí, đánh giá screening, Excel top ứng viên | Điểm Mạnh/Tích lũy/Phân phối không phải điểm Quant |
| Crawler → Quant gốc | `ScreenerBridge.read_screener_excel` đọc mã rồi tải lại giá; hoặc `run_pipeline(symbols=...)` | File Watchlist nhiều cột khác file kết quả screener; không truyền lẫn |
| Dữ liệu → analyze | Cắt nến hoàn tất, sàn, chất lượng dữ liệu và thanh khoản; từ chối sớm có thể chưa tính model phía sau | Không biến báo cáo bị loại thành kết quả đầy đủ |
| analyze → batch | analyze giữ score PENDING và LightGBM placeholder; batch bổ sung ngành/tương quan/LightGBM/residual, tính lại agreement/cost/position, chấm điểm rồi Action Gate | analyze đơn lẻ không tương đương báo cáo batch cuối |
| Batch → Summary | `summary_table` xuất thống kê, dự báo, T+2, chi phí, kế hoạch, ngành và nhận xét | Nhiều default 0/chuỗi rỗng trong exporter; cần xem error/status của report gốc |
| Summary → Google Sheets | `_simplify_user_summary` đổi nhãn và chia Entry/SL/TP cho 1.000; ADV20_Bn đã theo tỷ | Không đọc giá hiển thị trên Sheets như VND nguyên gốc |
| Batch → Website API | `backend/engine.py:scan_all` thực sự chạy Quant cho tập mã, rồi `fields_from_summary` xuất trường snake_case; highlights có enrichment cho publication cũ | Không được mặc định nguồn này chỉ có screening cơ bản |
| Website highlights → chọn 5+5 | `select_highlights`: Action Gate, điểm Quant, trạng thái dữ liệu, hai nhóm không trùng | Không đồng nhất với Design OVERALL/DISTRIBUTION |
| Design → API/proxy | refresh/access token → `/me` → `/screenings/latest` → `/screenings/{id}/results`; proxy chuyển nguyên response, không map key | `/scans/...` chưa nằm trong allowlist; không chỉ đổi URL vì auth/envelope/ranking cũng khác |
| Kích hoạt → refresh | Chỉ GET sau khi kích hoạt, pin một publication; refresh khi hiện trang, giữ dữ liệu cũ có nhãn khi lỗi, 401/403 gỡ private data | Không tạo job Quant khi chỉ xem quét; popup giữ run cũ khi bảng đổi |
| Bảng → popup → Quant | Mã mở chi tiết cùng run; nút Quant giữ symbol trong URL; không tự submit | Chỉ hiển thị tên thực được payload cung cấp; không tự đặt tên từ ticker |
| Quant request → report | Guard → options/entitlements → optional sizing → confirm → POST với idempotency key → poll job → GET report; mở lại history/URL không submit lại | Giữ hạn mức, trạng thái chờ/lỗi và retry cùng key; không đổi xác thực |
| Report → 16 module | `QuantReport` gọi `LiveQuantReport`; status/available/error/disabled lọc giá trị cũ; biểu đồ đọc research đúng schema/symbol/units | Không lấp dữ liệu thiếu; giữ 0/false; giữ HMM labels riêng với xác suất hiện tại, MC là phân vị đã công bố |
| Dashboard → chart/sidebar | AGR cung cấp giá/FullName, metadata cục bộ hỗ trợ một tập mã; chart iframe VPS; sidebar dùng cùng QuantRequestPanel | Không đổi AGR/WebSocket, chart, font, metadata bảng điện hoặc dùng Watchlist làm giá mẫu |
| Login/profile/plans/orders/admin | Session/refresh/cookie riêng user/admin; Google callback, hoàn thiện hồ sơ, quyền gói và idempotent order; nhận trạng thái thanh toán từ server | Không thay các luồng chung này khi sửa bảng quét; chạy regression suite đầy đủ |

## Dữ liệu Quant: đủ nguồn không đồng nghĩa đã đi qua API đích

Đã chạy **chính `QuantPipeline.summary_table` và `_simplify_user_summary`** của
repo Quant với một report tổng hợp, rồi gọi chính `fields_from_summary` của
Website, không gọi provider, không fit model, không chạy job hoặc ghi DB.
Kết quả: projection + metadata wrapper có đường cấp cho **42/42 key** của bảng
Design. Đã kiểm tra ví dụ: `Entry=100000` → Sheet `100.0`, API `entry_vnd=100000`;
ADV20 nguồn 120.000.000.000 VND → Summary 120 tỷ → API giữ VND nguyên gốc.

| Nhóm cột Design | Nguồn Quant / projection Website |
|---|---|
| symbol; action/gate_pass/gate_reasons | Symbol; Action/GatePass/GateReasons; `report.action` |
| score/rating/holding_sessions/index_trend | Score/Rating; `fcast.horizon`; metadata VNI/vni_trend được bridge chuyển tiếp |
| sector/sector_trend/sector_return_20d_pct | NhomNganh/XuHuongNganh/NganhRet20D%; `sector.name/trend` |
| sector_correlation/sector_lead_lag | TuongQuanNganh/MaDanDatNganh; `cross_corr` |
| sharpe/up_day_ratio_pct/max_drawdown_pct/annual_return_pct | Sharpe/WinRate/MaxDD/AnnRet; `stats` (WinRate là tỷ lệ ngày tăng, không phải lệnh thắng) |
| hmm_regime/volatility_regime | HMM/VolReg; `hmm.current`, `vol.regime` |
| forecast_direction/ensemble_return_pct/agreement_pct | Forecast/EnsRet%/Agreement; `fcast` |
| gross_forecast_pct/roundtrip_cost_pct/net_forecast_pct | GrossFc%/CostRT%/NetFc%; `costs` |
| mc_volatility_source/lock_drawdown_pct/probability_loss_gt_3pct | MCVol/LockDD%/PLoss3%; `fcast.mc/lock_risk` |
| data_quality_status/data_quality_score/data_quality_flags | DQStatus/DQScore/DQFlags; `data_quality` |
| liquidity_tier/adv20_value_vnd/capacity_shares/gap_abs_p95_pct | LiqTier; ADV20 từ `liquidity` VND nguyên gốc; CapacityShares/GapP95% |
| entry_vnd/stop_loss_vnd/take_profit_1_vnd/take_profit_2_vnd | Entry/SL/TP1/TP; `sl` |
| trade_model_agreement_pct/risk_pct_nav/commentary | ModelAgreement%/RiskPctNAV/Analysis; `sl`, `pos`, commentary |

Vì vậy, “nhiều ô —” có ít nhất bốn khả năng cần tách:

1. Report gốc bị gate, model lỗi/tắt/thiếu dữ liệu hoặc chưa có đủ ngữ cảnh.
2. Có kết quả trong engine nhưng chưa lưu/xuất vào publication của API đích.
3. Đang dùng một contract khác, sai tên key/cấu trúc/kiểu hoặc đơn vị.
4. Có trường trong payload nhưng frontend không render (đã tái hiện với tên).

Website còn dùng `/quant/jobs`, status chữ thường, `module_reports` và
`research.schemaVersion`; Design dùng `/analyses`, status chữ hoa, `sections`
và `research.schema_version`. Không nạp trực tiếp hai kiểu report vào nhau.

## 16 module và lý do thiếu hợp lệ

| Module | Nguồn chính trong engine |
|---|---|
| Hiệu suất | stats; số quan sát/giá/ngày; chưa qua gate đầu vào thì có thể chưa tính |
| Phân phối | dist; histogram lịch sử cần chuỗi giá, không dùng MC thay thế |
| ARIMA | arima; cần thư viện statsmodels, đủ quan sát và fit thành công |
| GARCH | garch.garch/egarch; cần arch, đủ quan sát, fit; half-life có thể None khi persistence ngoài (0,1) |
| HMM | hmm; có fallback, method và xác suất phải đọc đúng kết quả nguồn |
| Kỹ thuật | flow/trend/alpha; số hữu hạn hoặc trạng thái thiếu |
| Alpha | momentum_alpha/hurst/lightgbm_cross_sectional/conditional_mr; LightGBM cần batch và tập huấn luyện đủ; residual có thể không active hợp lệ |
| Thị trường & ngành | sector/cross_corr; tương quan cần tối thiểu hai mã với dữ liệu chung |
| Đồng thuận | fcast sau combine; thiếu model phải phản ánh coverage, không coi là phiếu xác nhận |
| Monte Carlo | fcast.mc/lock_risk và các phân vị research đã xuất; không tự dựng đường mô phỏng |
| Chi phí | costs; đọc gộp/phí/ròng cùng horizon |
| Kế hoạch vị thế | sl/pos/kelly; core **chủ động tắt Kelly**, không được làm mẫu Kelly khả dụng rồi coi là output thật |
| Thanh khoản | liquidity; gate fail có thể kết thúc sớm pipeline gốc |
| Dữ liệu | data_quality; FAIL phải chặn sử dụng kết quả |
| Quyết định | rec + action cuối batch; không suy BUY từ forecast dương |
| Nhận định | commentary từ cùng report và Action Gate |

## Tên doanh nghiệp

Core `crawl_data.py` chỉ lấy danh sách symbol và không giữ organ_name trong kết
quả crawler; `quant.py:summary_table` cũng không có trường tên doanh nghiệp.
Website giải quyết riêng qua `resolve_company_names()` (`all_symbols`, cột
`organ_name`), lỗi lookup thì dùng ticker làm name.

Design có khai báo name/company_name, nhưng `ScreeningSheet` và `ScreeningValues`
chỉ render symbol. Tên từ preview/API dù tồn tại cũng biến mất. Sửa chắc chắn ở
frontend: render tên hợp lệ trong cả hai bảng và popup; thiếu tên/tên chỉ lặp
ticker thì nói rõ chưa được cung cấp, không tạo tên hoặc thêm lookup bên ngoài.

## Watchlist và ngành mô hình

- 17 ngành + 6 rổ: BĐS Khu công nghiệp, Viettel, FPT nhóm, Vingroup,
  Tự doanh Tuấn Mượt, List CMSC. Rổ có thể cắt ngang ngành.
- FPT: Công nghệ, FPT nhóm, Bán lẻ, List CMSC; VTP: Công nghệ, Viettel.
- `SectorEngine.map_symbols`: ưu tiên ICB level 2; thiếu thì fallback
  WATCHLIST_SECTORS, giữ nhóm đầu tiên của mã theo thứ tự **dict trong core**.
  Không lấy nhóm hiển thị đầu tiên trên Excel rồi ghi đè ngành đã tính model.
- Trend ngành chỉ tính trên các mã hợp lệ đang được đưa vào batch; không mặc
  nhiên là toàn bộ danh sách 223 mã hay toàn thị trường.
- Không cộng GTGD cả 23 nhóm thành tổng thị trường vì các nhóm chồng lấn;
  ngay 17 PURE_SECTORS vẫn có một số mã trùng, cần xử lý tập hợp nếu tính tổng.
- Chạy chính helper `load_watchlist_sectors_from_excel` trên file gửi: chỉ còn
  265 ô mã; **13 ô/11 mã** bị `.isalpha()` bỏ: VC7, L14, DC4, G36, C4G, C32,
  HT1, PC1, TV2, TV1, NT2 (DC4 và PC1 xuất hiện hai lần).
- Helper này không phải đường nạp map của batch hiện tại: batch dùng ICB rồi
  dict hard-code. `run_pipeline` đã bỏ gọi export dòng tiền ngành, tham số
  `sector_flow_watchlist` không cập nhật sector_map. Chưa có bằng chứng lỗi
  helper là nguyên nhân trực tiếp của ô — trên VPS. Ghi nhận, không sửa core.

## Phạm vi sửa sau rà soát

1. Render tên công ty từ trường hiện có, không thêm endpoint hay dữ liệu giả.
2. Popup liệt kê đầy đủ membership Watchlist, tách rõ ngành và rổ; giữ nguyên
   trường sector/số liệu Quant do API cung cấp. Watchlist giữ nguyên nội dung.
3. Preview bổ sung tình huống đặc trưng core: Kelly disabled, một ngành chỉ có
   một mã nên correlation thiếu, LightGBM chưa đủ batch; tách khỏi mẫu đủ KPI.
4. Kiểm tra không còn tên bị bỏ và không đổi route, POST job, 42 cột, thứ hạng,
   hạn mức hay dữ liệu đầu vào. Chạy lại regression cả các luồng chung.

Để sửa dứt điểm dữ liệu thật bị thiếu cần đối chiếu response `/screenings` và
phiên bản backend đích. Không thể kết luận an toàn bằng cách tự đổi proxy sang
Website hoặc lấp bằng mẫu. Phần này còn chưa được xác minh, không báo là đã sửa.

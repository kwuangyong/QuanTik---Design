# G2 – Đặc tả biểu đồ, dữ liệu và quy định cho báo cáo Quant 16 module

Ngày: 2026-11-27. Phạm vi: thiết kế, không sửa code sản phẩm, không commit.
Nguồn code đã đọc: `frontend/src/lib/api/analysis.ts`, `frontend/src/components/quant-research.tsx`, `quant-module-evidence.tsx`, `quant-report-views.tsx`, `quant-scenario-3d.tsx`, `quant-scenario-data.ts`, `quant-radar-scoring.ts`, `quant-module-navigation.tsx`, `quant-interpretation.ts`, `quant-reader.ts`, `frontend/tests/fixtures/quant-report-sample.ts`, `frontend/tests/fixtures/analysis.ts`, `docs/QUANT-RESULT-FE-HANDOFF.md`, `docs/quant-module-data-audit.md`, `docs/QUANT-RESEARCH-2026-11.md`.

Quy ước: **[đã đọc code]** = thấy trong mã nguồn repo; **[fixture]** = chỉ thấy trong fixture tổng hợp, chưa đối chiếu báo cáo BE thật; **[chưa xác minh]** = không có nguồn chính thức đã mở được.

---

## 0. Kết luận nhanh

1. **Quy định VN: chưa xác minh được từ văn bản gốc trong lượt này.** Các trang chính thức (hsx.vn, hnx.vn, vsd.vn, mof.gov.vn, ssc.gov.vn) không truy cập được hoặc không có nội dung quy định. Chỉ có nguồn thứ cấp. Không hiển thị chu kỳ thanh toán, biên độ, thuế hay phí như sự thật cho đến khi có văn bản gốc.
2. **API không có trường phí, thuế, chu kỳ thanh toán, biên độ hay sàn.** `costs` chỉ có tổng `roundtrip_cost_pct`. Không thể làm waterfall phí/thuế tách riêng.
3. **Các biểu đồ sau không làm được từ API hiện có** (nói thẳng, không thay bằng số giả):
   - Fan chart ARIMA dải 50/80/95%: API chỉ có 3 giá dự báo điểm, không có phân vị hay khoảng.
   - Volatility cone GARCH (phân vị lịch sử theo horizon): không có chuỗi biến động lịch sử hay phân vị.
   - Đường mẫu Monte Carlo (20–30 path): `_mc_paths` không đưa ra FE (xem handoff). Chỉ có 5 phân vị theo phiên.
   - Biểu đồ IC/t/DSR theo cửa sổ của module Alpha: API không trả IC, t, DSR, tier.
   - Chỉ số VN-Index chuẩn hoá 100 (module Thị trường): API không trả chuỗi VN-Index.
   - Ma trận đồng thuận mô hình × horizon: API chỉ có một horizon và tổng hợp.
   - Thang giá có kiểm tra trần/sàn: không có trường sàn/trần hay mã sàn giao dịch.
4. **3D GARCH không phải 3D thật theo thời gian.** Mặt 3D hiện có là công thức `h = ω + αε² + βh` dựng từ tham số công bố `simulation_params`, không phải dữ liệu theo horizon. Đề xuất giữ làm chế độ phụ, gắn nhãn rõ, hoặc bỏ.
5. **Ba điểm vi phạm điều kiện cần sửa trong code hiện tại** (không sửa trong G2, chỉ ghi lại):
   - `quant-radar-scoring.ts` dòng 51: khi thiếu `hmm.probability_kind` vẫn chấp nhận (`kind != null && kind !== 'filtered'`). Phải đổi thành yêu cầu `=== 'filtered'`, thiếu thì trả "thiếu loại xác suất".
   - `quant-scenario-data.ts` và `quant-radar-scoring.ts` dùng hai dung sai khác nhau cho tổng xác suất HMM (±1,5 và ±0,2). Thống nhất một giá trị.
   - Đường dẫn `decision`: `quant-simple-report.tsx` và `quant-action-summary.tsx` đọc `report.decision.action` (cấp cao nhất), còn `quant-reader.ts` và fixture đọc `sections.decision.metrics.action.action`. Cần đối chiếu báo cáo BE thật trước khi chốt.
6. **Câu mẫu trong G2-ux-spec.md:** file `research/2026-11/redesign/G2-ux-spec.md` chưa tồn tại tại thời điểm làm việc này, nên bỏ qua mục 5 của nhiệm vụ.

---

## 1. Quy định Việt Nam

Trạng thái: **chưa xác minh từ văn bản gốc**. Mọi mục dưới đây là thông tin thứ cấp hoặc chưa kiểm được.

| Hạng mục | Thông tin thu được | Nguồn đã thử | Trạng thái |
|---|---|---|---|
| Chu kỳ thanh toán cổ phiếu | Nguồn thứ cấp (Finhay) ghi T+2 cho cổ phiếu và ETF trên HOSE, HNX, UPCoM; trái phiếu T+1. Không có văn bản gốc nêu rõ T+2 còn hiệu lực năm 2026. G1 ghi "T+2,5" không được xác nhận. | WebSearch; thuvienphapluat.vn | **chưa xác minh** |
| KRX | Có tài liệu về chuyển đổi hệ thống KRX (VNDIRECT, SHS). Không xác định được "KRX thay đổi gì" đối với chu kỳ thanh toán. | WebSearch | **chưa xác minh** |
| Biên độ HOSE thường | ±7% (G1 dẫn stockbiz.vn; WebSearch tóm tắt cùng con số) | stockbiz.vn chưa mở | **chưa xác minh gốc** |
| Biên độ HNX thường | ±10% (cùng nguồn) | như trên | **chưa xác minh gốc** |
| Biên độ UPCoM thường | ±15% (cùng nguồn) | như trên | **chưa xác minh gốc** |
| Biên độ ngày đầu niêm yết | Mâu thuẫn: WebSearch nêu HOSE ±20%, HNX ±30% (ví dụ BVB) và cho biết căn cứ là Quy chế niêm yết ban hành kèm Quyết định 22/QĐ-HĐTV ngày 16/3/2026 của sàn; G1 nêu UPCoM có thể tới 40% hoặc 20%. | WebSearch; G1 | **mâu thuẫn, chưa xác minh** |
| Thuế TNCN chuyển nhượng | Luật Thuế TNCN (hiệu lực từ 01/7/2026, thay Luật 2007) theo nguồn thứ cấp. Nghị định 253/2026/NĐ-CP và Thông tư 87/2026/TT-BTC. Mức 0,1% trên giá chuyển nhượng được nêu cho **chứng khoán phái sinh**, theo từng lần chuyển nhượng. Trang thuvienphapluat không nêu mức cho cổ phiếu niêm yết. | luatvietnam.vn; thuvienphapluat.vn (đã mở, không có mức cổ phiếu) | **cổ phiếu: chưa xác minh**. Số hiệu và ngày hiệu lực cần đối chiếu Công báo. |
| Thông tư 68/2024/TT-BTC | Ban hành 18/9/2024, hiệu lực 02/11/2024, sửa quy định giao dịch, bù trừ và thanh toán. Trọng tâm là pre-funding; không thấy nêu đổi chu kỳ T+2. | WebSearch; luatminhkhue.vn (chưa mở) | nguồn thứ cấp, chưa đọc nguyên văn |
| Phí môi giới | Không tìm được biểu phí chuẩn. Nghiên cứu nội bộ dùng 0,15%/chiều (`docs/QUANT-RESEARCH-2026-11.md` mục 2) làm giả định. | nội bộ | **giả định nội bộ, chưa đối chiếu biểu phí CTCK** |

Hệ quả cho báo cáo:
- Giả định thuế bán 0,1% trong nghiên cứu nội bộ được đặt trước khi Luật TNCN 2026 có hiệu lực. Cần kiểm lại trước khi giữ con số này trong bất kỳ UI nào.
- Không hiển thị "T+2" như sự thật trong UI. Có thể hiện nhãn "Thời gian chờ thanh toán: theo `simulation_risk.lock_risk.lock_sessions`" vì đó là số BE tính.
- Văn bản miễn trừ: cần rà pháp lý (Luật Chứng khoán 2019 và hướng dẫn tư vấn đầu tư), không đưa bản nháp vào sản phẩm.

---

## 2. Đối chiếu API và đường dẫn trường

Đường dẫn dưới đây lấy từ code đọc (`[đã đọc code]`) và fixture (`[fixture]`). Báo cáo BE thật chỉ được xác nhận cho các trường mà handoff ghi rõ (xem `docs/QUANT-RESULT-FE-HANDOFF.md`, mục "Cấu trúc dữ liệu" và "Contract biểu đồ"). Nếu một trường chỉ có trong fixture, ghi chú **[fixture]**.

### 2.1 Phí, thuế, thanh toán trong payload

| Khái niệm | Có trong API? | Trường gần nhất | Ghi chú |
|---|---|---|---|
| Phí môi giới từng chiều | Không | — | Chỉ có tổng khứ hồi |
| Thuế bán | Không | — | |
| Trượt giá | Không | — | Chỉ nằm trong tổng `roundtrip_cost_pct` (không tách) |
| Chu kỳ thanh toán (số ngày) | Không trực tiếp | `sections.simulation_risk.metrics.simulation_risk.lock_risk.lock_sessions` | Là số phiên khóa mà BE tính; không ghi rõ quy định nào |
| Sàn giao dịch | Không | — | Có reason `UNKNOWN_EXCHANGE` nhưng không có trường `exchange` |
| Trần/sàn ngày | Không | — | Không tính được khoảng giá sàn/trần |

Kết luận: **không có chỗ nào trong payload để hiển thị phí, thuế hay chu kỳ thanh toán tách riêng**. Đây là thay đổi contract BE (đề xuất `costs.components[]` và `exchange`, `price_band_pct`), theo quy trình handoff: đề xuất BE trước, cập nhật type, fixture, test cùng lúc.

### 2.2 Bảng đường dẫn theo module

| # | Module (key) | Trường chính xác | Nguồn |
|---|---|---|---|
| 01 | statistics | `sections.statistics.metrics.stats.{sharpe, sortino, max_dd_pct, ann_vol_pct, ann_return_pct}`; `sections.statistics.metrics.n`; `sections.statistics.metrics._price_close[]`, `_price_dates[]`; `research.drawdown[{date, valuePct}]`; `research.observations`, `research.start`, `research.end` | đã đọc code; `sortino`, `ann_return_pct`, `n` chỉ thấy [fixture] |
| 02 | distribution | `sections.distribution.metrics.dist.verdict.is_gaussian`, `dist.skewness`, `dist.excess_kurtosis`; lịch sử từ `_price_close` | [fixture] cho `dist.*`; `_price_close` đã đọc code |
| 03 | arima | `sections.arima.metrics.arima.best.{order, aic, bic}`; `arima.stationarity.{adf_p, stationary}`; `arima.forecast.prices[]` | [fixture]. Không có khoảng dự báo |
| 04 | garch | `sections.garch.metrics.garch.garch.{current_vol_pct, alpha, beta, persistence, half_life, forecast_vol[]}`; `garch.garch.simulation_params.{omega_pct2, alpha, beta}`; `sections.garch.metrics.garch.egarch.gamma` | đã đọc code (`quant-research.tsx`, `quant-report-views.tsx`); `simulation_params` và `egarch` [fixture] |
| 05 | hmm | `sections.hmm.metrics.hmm.{current, method, prob_pct}`; `hmm.state_probs.{BULL, SIDEWAY, BEAR}` (%); `research.regime[{date, price, state}]`; `hmm.probability_kind` (chưa có trong API) | đã đọc code; `probability_kind` chỉ được đọc trong radar, chưa có BE |
| 06 | technical | `sections.technical.metrics.flow.cmf`; `trend.{er, r2, slope_pct}`; `alpha.cross_sectional.{rs_20d_pct, beta}` | [fixture] và code |
| 07 | directional_alpha | `sections.directional_alpha.metrics.momentum_alpha.{score, active, components.{ret_5d_pct, ret_10d_pct, ret_20d_pct, ret_60d_pct}}`; `hurst.{hurst, regime, confidence, windows[{window, hurst}]}`; `lightgbm_cross_sectional.{available, active, proj_pct, rank_pct, predicted_alpha_pct, horizon_sessions, as_of}`; `conditional_mr.{active, reason}` | đã đọc code và fixture |
| 08 | context | `sections.context.metrics.sector.{name, trend.{trend_label, ret_20D_pct}}`; `cross_corr.avg_pairwise_corr` | [fixture] |
| 09 | agreement | `sections.agreement.metrics.fcast.{horizon, ensemble_ret_pct, agreement_pct, coverage_pct, support_pct}` | đã đọc code và handoff |
| 10 | simulation_risk | `sections.simulation_risk.metrics.simulation_risk.{horizon, mc.{vol_source, prob_up}, lock_risk.{max_dd_lock_pct, prob_loss_gt_3pct, lock_sessions}}`; `research.cone[{session, p05, p25, p50, p75, p95}]`; `research.distribution[{returnPct, probabilityPct, lowerPct, upperPct, count}]`; `research.simulation_count`, `research.horizon_sessions` | đã đọc code và handoff |
| 11 | costs | `sections.costs.metrics.costs.{gross_forecast_pct, roundtrip_cost_pct, net_forecast_pct}` | đã đọc code và handoff |
| 12 | trade_plan | `sections.trade_plan.metrics.sl.{entry, sl_swing, tp1, tp2, rr2, rr_net_cost, lock_risk_flag}`; `pos.{shares, pct_acct, risk_pct_nav, value, max_loss}`; `sizing_mode`; `kelly.{available, full_pct, half_pct, disabled}` | đã đọc code và handoff; `kelly` và `pos.value` [fixture] |
| 13 | liquidity | `sections.liquidity.metrics.liquidity.{pass, adv20_value_vnd, value_ratio_5_20, capacity_shares}` | [fixture] |
| 14 | data_quality | `sections.data_quality.metrics.data_quality.{status, score}` | [fixture] |
| 15 | decision | `decision.{action, executable, gate_pass, reason_codes}` **hoặc** `sections.decision.metrics.action.{action, executable, gate_pass}`; `sections.decision.metrics.rec.score` | **mâu thuẫn**: code đọc cấp cao nhất, fixture để trong `sections.decision.metrics.action`. Phải đối chiếu BE thật |
| 16 | commentary | `commentary.{summary, detailed}` | đã đọc code và handoff |

Trường không có trong API (không được vẽ hoặc suy ra): `arima` khoảng dự báo; `garch` phân vị lịch sử; `hmm.probability_kind`; `directional_alpha` IC, t, DSR, PBO, tier; `context` chuỗi VN-Index; `agreement` thành phần từng mô hình; `trade_plan` trần/sàn; `data_quality` danh sách kiểm tra từng mục; `simulation_risk` xác suất chạm TP trước SL.

### 2.3 Luật hiển thị đã có trong code (giữ nguyên)

- Giá VND, không nhân chia 1.000. Phần trăm đã là phần trăm, không nhân 100 lần nữa.
- `p05 ≤ p25 ≤ p50 ≤ p75 ≤ p95`. Không dùng `mc_path.lower/upper` (là P2,5/P97,5).
- HMM lịch sử là nhãn cứng; không suy xác suất lịch sử từ xác suất hiện tại.
- R:R gộp chỉ tính khi `0 < SL < Entry < TP2`.
- `UNAVAILABLE`, `DISABLED`, `null` không thành số 0 hay 100%.

---

## 3. Đặc tả biểu đồ theo module

Chuyển động: mọi chuyển động có ý nghĩa đều tắt khi `prefers-reduced-motion: reduce` và có nút "Giảm hiệu ứng". Không chuyển động lặp vô hạn. Dữ liệu cập nhật chỉ khi báo cáo thay đổi.

Thứ tự trình bày theo nhóm đề xuất ở mục 6.

### Nhóm C. Rủi ro

**04 GARCH** (module nhóm C)
- Biểu đồ chính: đường biến động dự báo `garch.garch.forecast_vol[]` theo phiên (1 đến n), trục y "% mỗi phiên", đường ngang nét đứt tại `current_vol_pct` nhãn "biến động hiện tại".
- Chú thích: "Biến động theo phiên, không biểu thị hướng giá."
- Bảng thay thế: phiên, biến động dự báo (%).
- Thiếu dữ liệu: hiện "Chưa đủ dữ liệu để tính biến động dự báo" và nguyên nhân từ `reason_codes`.
- KHÔNG làm: volatility cone. Lý do: không có phân vị lịch sử. Thay bằng so sánh một điểm với đường dự báo.
- Chuyển động: đường vẽ từ trái sang phải một lần, 400 ms, ease-out. Tắt khi reduced-motion.
- Persistence: hiện `α + β` kèm half-life. Nếu `α + β ≥ 1`, hiện "không hội tụ", không hiện số vô hạn.
- EGARCH `gamma`: chỉ hiện khi có, nhãn "bất đối xứng" và giải thích một câu.

**10 Monte Carlo** (nhóm C, nhưng dải giá và xác suất hiển thị trong nhóm B theo đề xuất; xem mục 6)
- Biểu đồ chính: dải phân vị `research.cone`, trục x "phiên dự báo", trục y VND, đường giữa P50 đặc, dải P25–P75 đậm, dải P05–P95 nhạt (dùng `LinePlot band` hiện có).
- Chú thích: "Phân vị theo từng phiên, không phải các đường kịch bản."
- Histogram cuối kỳ từ `research.distribution[]`: trục x `returnPct` (%), cột theo `probabilityPct`, nhãn "phân phối cuối kỳ, không phải xác suất chạm TP/SL".
- Lưới 100 chấm: xem mục 4.
- Thiếu dữ liệu: nếu `cone` rỗng thì ẩn cả dải và lưới, hiện trạng thái thiếu.
- Chuyển động: dải "mở ra" từ phiên 0 sang phiên cuối, 600 ms, một lần khi vào khung nhìn (IntersectionObserver). Không vẽ đường mẫu vì API không có.

**13 Thanh khoản** (nhóm C)
- Biểu đồ chính: một thanh "quy mô vị thế so với sức chứa" (`pos.shares` so với `liquidity.capacity_shares`) có nhãn ngưỡng. Không suy số phiên thoát khi chưa biết cơ sở `capacity_shares`.
- Thang: đạt/không đạt (`liquidity.pass`) kèm chữ.
- Chú thích: ADV20 là trung bình, không phản ánh phiên không khớp.
- Thiếu dữ liệu: không có số phiên thoát, không có số phiên không giao dịch.
- Chuyển động: thanh trượt 250 ms, không bật nảy.

**Phân phối cuối kỳ và mức giảm sâu** (module 02 Phân phối và 01 Hiệu suất phần sụt giảm)
- 02: histogram lịch sử từ `_price_close` (đường nền bình thường) kèm nhãn Gaussian đúng/sai từ `verdict.is_gaussian`. Q–Q plot không làm được từ API (không có chuỗi lợi suất đầy đủ; chỉ có giá đóng cửa 7 điểm trong fixture). Ghi rõ.
- 01 drawdown: `research.drawdown[{date, valuePct}]`, vùng tô đỏ nhạt dưới 0, nhãn "mức giảm so với đỉnh". Đề xuất đưa đường drawdown vào nhóm C; xem mục 6.

### Nhóm A. Hiện trạng

**01 Hiệu suất** (nhóm A)
- Biểu đồ chính: `research.drawdown` vùng đỏ nhạt và, khi có, đường giá đóng cửa từ `_price_close` với `_price_dates`.
- Bảng 6 chỉ số: sharpe, sortino, ann_return_pct, max_dd_pct, ann_vol_pct, n. Mỗi chỉ số có nhãn thường và số quan sát.
- Chú thích bắt buộc: "Quá khứ, không đảm bảo tương lai." Sharpe kèm `n`.
- Thiếu: bất kỳ chỉ số nào `null` hiện "chưa có", không hiện 0.
- Chuyển động: không cần; đường giá có thể vẽ 400 ms một lần.

**05 HMM** (nhóm A)
- Biểu đồ chính: lịch sử nhãn `research.regime[]` trên trục giá VND, dải màu nền theo nhãn BULL/SIDEWAY/BEAR (regime ribbon). Trạng thái hiện tại lấy từ `hmm.current`.
- Thanh xác suất hiện tại: 3 thanh `state_probs` (%), tổng 100, nhãn kèm chữ. Đây là xác suất **hiện tại**, không phải lịch sử.
- Nhãn bắt buộc: "Xác suất filtered (dùng để đọc hiện tại)" chỉ khi `hmm.probability_kind === 'filtered'`. Nếu thiếu trường đó, hiện: "Loại xác suất chưa được cung cấp; không thể xác nhận là filtered."
- Không dùng tam giác chuyển pha làm mặc định. G1 cho rằng tam giác chỉ có ích khi 3 xác suất rõ nghĩa; thay bằng thanh chồng (stacked bar) mặc định, giữ tam giác trong chế độ chuyên sâu.
- Không gọi là "tín hiệu".
- Thiếu: `method === 'fallback'` hiện "mô hình thay thế, không phải HMM đã fit".
- Chuyển động: đổi dải màu không có chuyển động; thanh xác suất trượt 250 ms; tắt khi reduced-motion. Màu luôn đi kèm chữ.

**06 Kỹ thuật** (nhóm A)
- Biểu đồ chính: thang phân vị hoặc thanh chuẩn hoá cho CMF, ER, R², độ dốc, RS20, beta. Không vẽ nhiều chỉ báo chồng một trục.
- Mỗi chỉ báo có nhãn "mô tả" và chú thích: nghiên cứu nội bộ ghi các chỉ báo xu hướng và dòng tiền này không vượt kiểm định ngoài mẫu ở thị trường VN.
- Không tô xanh hay đỏ như tín hiệu mua/bán cho momentum, MA200, CMF. Dùng màu trung tính.
- Thiếu: phân vị lịch sử của từng chỉ báo không có trong API. Không tự tính phân vị từ dữ liệu chưa có; hiện giá trị thô kèm nhãn "không có phân vị lịch sử".
- Chuyển động: không.

**08 Thị trường & ngành** (nhóm A)
- Biểu đồ chính: thẻ ngành (`sector.name`), xu hướng (`trend_label`), `ret_20D_pct`, `avg_pairwise_corr`.
- Không vẽ chỉ số hoá 100 so với VN-Index (không có chuỗi).
- Chú thích: tương quan cao lúc thị trường giảm mạnh tăng lên; tương quan không đảm bảo bảo vệ danh mục.
- Thiếu: "Nguồn dữ liệu chưa có phân ngành cho mã này" (`SYMBOL_SECTOR_UNAVAILABLE`).

### Nhóm B. Triển vọng

**03 ARIMA** (nhóm B)
- Biểu đồ chính: đường dự báo điểm `arima.forecast.prices[]` (VND) theo "phiên +1..+n", nét đứt, cùng điểm giá đóng cửa gần nhất từ `_price_close` làm mốc.
- KHÔNG làm fan chart. Không có khoảng dự báo trong API. Ghi: "Không có khoảng dự báo từ mô hình."
- Chú thích bắt buộc: "Dự báo điểm; trong kiểm định nội bộ, dự báo ARIMA ngoài mẫu gần bằng dự báo ngẫu nhiên (naive)." (Đây là diễn giải theo `docs/QUANT-RESEARCH-2026-11.md` và G1, không phải số.)
- Bảng: order, AIC, BIC, ADF p, dừng hay không. Chú thích: ADF thấp không có nghĩa xác suất 99% là dừng; kiểm trên lợi suất.
- Thiếu: nếu `arima` thiếu hoặc `UNAVAILABLE`, ô trống không được hiện; ẩn cả biểu đồ và hiện trạng thái.
- Chuyển động: đường vẽ từ điểm mốc sang các phiên, 400 ms, một lần.

**07 Alpha** (nhóm B)
- Biểu đồ chính: bảng trạng thái từng thành phần (momentum, Hurst, LightGBM, hồi quy phần dư), không phải bar IC vì không có IC.
- Hurst: thanh giá trị `hurst` với mốc 0,5, kèm `regime` và `confidence`. Chú thích: ước lượng R/S sai lệch khi mẫu ngắn.
- Momentum: `score` kèm `active`. Không dùng chữ "đà nghiêng về tăng" như khuyến nghị. Thêm nhãn: "Momentum kiểu Mỹ không đạt kiểm định ngoài mẫu ở VN (nghiên cứu nội bộ)."
- LightGBM: `proj_pct`, `rank_pct`, `predicted_alpha_pct`, nhãn "mô tả, không nhân quả", `horizon_sessions` và `as_of`.
- Nhãn tầng bắt buộc (theo `docs/QUANT-RESEARCH-2026-11.md` mục 4.4): Đã kiểm chứng / Thử nghiệm / Mô tả. API hiện không trả tầng; mặc định là "Mô tả" và không suy ra cao hơn.
- Thiếu: các trường IC, t, DSR không có; hiện "Chưa có kết quả kiểm định ngoài mẫu trong báo cáo này."
- Chuyển động: không.

**09 Đồng thuận** (nhóm B)
- Biểu đồ chính: 3 số trong thẻ (`agreement_pct`, `coverage_pct`, `support_pct`) và `ensemble_ret_pct`, kèm `horizon` và chú thích "Các mô hình dùng chung dữ liệu, không độc lập; đồng thuận không phải xác suất".
- Không làm ma trận mô hình × horizon: chỉ có một horizon và không có thành phần.
- Không dùng thanh "tỷ lệ đồng thuận" làm xác suất.
- Chuyển động: không.

### Nhóm D. Mua bán và quyết định

**12 Kế hoạch vị thế** (nhóm D)
- Biểu đồ chính: thang giá dọc hoặc ngang với bốn mốc, theo thứ tự thấp đến cao: `sl_swing`, `entry`, `tp1`, `tp2`. Chỉ vẽ khi `0 < SL < Entry < TP2`. Nhãn: "Dừng lỗ", "Giá vào", "Mục tiêu 1", "Mục tiêu 2".
- Số tiền: lỗ tại SL = `pos.max_loss` (VND) khi có, hoặc tính từ `pos.shares` × (entry − sl_swing) khi cả ba có giá trị. Ghi rõ "theo vốn mẫu X" (vốn mẫu do người dùng nhập, không mặc định là số giả).
- R:R: `rr2` (gộp) và `rr_net_cost` (sau chi phí), hai nhãn riêng; không gọi R:R là xác suất.
- Kelly: chỉ hiện khi `kelly.available === true`. Nếu `disabled`, ghi "không áp dụng". Không cho rằng Kelly là khuyến nghị.
- Ngưỡng cảnh báo khi `lock_risk_flag === true`: hiện văn bản cảnh báo, không đổi màu duy nhất.
- KHÔNG làm: kiểm tra SL có nằm trong biên độ sàn/trần. Lý do: không có sàn/trần trong API.
- Chuyển động: thang giá không chuyển động; nếu có, trượt 250 ms.

**11 Chi phí** (nhóm D)
- Biểu đồ chính: thác nước (waterfall) hai bước: dự báo gộp `gross_forecast_pct` → trừ `roundtrip_cost_pct` → còn `net_forecast_pct`. Không có bước phí và thuế riêng.
- Điểm hoà vốn: đây là `roundtrip_cost_pct` theo đơn vị %. Ghi "theo giả định chi phí khứ hồi của báo cáo". Không hiện điểm hoà vốn bằng giá VND trừ khi có `entry`.
- Chú thích: chi phí khứ hồi là giả định cho cả mua và bán, có thể gồm phí, thuế, trượt giá; giá khớp thực tế có thể khác.
- Thiếu: nếu một trong ba trường null, hiện "chưa đủ dữ liệu chi phí", không suy ra.
- Chuyển động: cột thác nước vẽ tuần tự, 300 ms tổng, tắt khi reduced-motion.

**15 Quyết định** (nhóm D)
- Hiển thị: `action`, `executable`, `gate_pass`, `reason_codes` (dịch bằng `analysisReason`), thanh điểm `rec.score` có nhãn "điểm tổng hợp, không phải xác suất".
- Hành động phải đọc nguyên văn từ BE. Không suy BUY từ dự báo dương, điểm hay màu biểu đồ.
- Khi `executable === false` hiện nổi bật, không để chữ nhỏ.
- Nút chính: "Xem kế hoạch" hoặc "Lưu để theo dõi", không "Mua ngay" (theo G1 cognition, mục 2).
- Chuyển động: không.

### Dải "Có tin được báo cáo không?"

**14 Dữ liệu** (dải)
- Huy hiệu trạng thái `data_quality.status` (PASS, hoặc giá trị khác) kèm `score` (không phải xác suất).
- Danh sách kiểm tra FAIL/WARN chỉ hiện khi BE trả; API hiện không có danh sách từng mục, nên ghi "chi tiết kiểm tra không có trong báo cáo".
- Ngày cập nhật: `data_observed_at` và `evaluated_at`, múi giờ ứng dụng; không đổi ngày giao dịch bằng cách coi là UTC.

**16 Nhận định** (dải)
- Hiển thị `commentary.summary` (ngắn) và `commentary.detailed` (mở rộng).
- Không thêm số không có trong module. Kiểm tra: các số trong đoạn văn phải có trong payload; nếu không, không hiển thị đoạn đó.
- Nếu `UNAVAILABLE`, ghi cảnh báo, không tự viết thay.

---

## 4. Lưới 100 chấm (Monte Carlo và HMM)

**Monte Carlo** (module 10)
- Số liệu: `simulation_risk.metrics.simulation_risk.mc.prob_up` (phần trăm, đã là %), làm tròn về số nguyên gần nhất. Không làm tròn trong tính toán khác.
- Quy tắc: 100 ô, mỗi ô là 1%. Tô `round(prob_up)` ô đầu tiên, theo hàng từ trên xuống, từ trái sang phải. Không rải ngẫu nhiên (G1 cognition, mục 1: icon array rải ngẫu nhiên làm người đọc thấy rủi ro cao hơn).
- Nhãn: "X trong 100 lần mô phỏng, giá cuối kỳ cao hơn giá hôm nay." Tổng có chú thích "làm tròn đến 1%".
- Chú thích bắt buộc: "Mô phỏng dựa trên giả định phân phối từ quá khứ, không phải lời hứa."
- Lưu ý: số mô phỏng thực tế là `research.simulation_count`; không dùng số này làm mẫu số của lưới nếu chưa đối chiếu với `prob_up`.
- Thiếu: nếu `prob_up` null, ẩn lưới.
- Chuyển động: tô ô tuần tự từng hàng, tổng tối đa 600 ms, một lần; tắt khi reduced-motion (hiện tĩnh).
- Màu: không mã hoá tăng/giảm bằng màu đơn thuần; thêm nhãn chữ bên dưới.

**HMM** (module 05)
- Số liệu: `state_probs.{BULL, SIDEWAY, BEAR}` (%), tổng phải 100 ± dung sai thống nhất (xem mục 0).
- Quy tắc: 100 ô, mỗi trạng thái một màu có nhãn chữ và hình dạng khác nhau. Làm tròn từng trạng thái, cộng lại phải đúng 100; nếu lệch do làm tròn, điều chỉnh ô lớn nhất và ghi chú.
- Điều kiện: chỉ hiện khi `probability_kind === 'filtered'`. Thiếu thì ghi "loại xác suất chưa được cung cấp".

---

## 5. GARCH 3D và ngân sách bundle

**3D GARCH: đánh giá thẳng**
- Dữ liệu có sẵn trong API: `forecast_vol[]` là một chuỗi một chiều theo phiên; `current_vol_pct`; `alpha`, `beta`, `persistence`, `half_life`; và `simulation_params.{omega_pct2, alpha, beta}` **[fixture, chưa xác nhận trong BE]**.
- Không có chuỗi biến động theo horizon × phân vị. Không có phân vị lịch sử. Vì vậy **không làm được 3D "biến động theo thời gian × horizon" thật**.
- Mặt hiện có trong `quant-report-views.tsx` (`garchResponseScene`) là mặt phản ứng: `h = ω + αε² + βh_trước`, với ε trong ±3σ, h_trước trong khoảng từ 0,25σ² đến 2σ². Đây là công thức từ tham số, không phải dự báo theo thời gian. Phải gắn nhãn đúng như vậy, không để người đọc hiểu là dự báo.
- Đề xuất: giữ như chế độ phụ, mở khi người dùng bấm, gắn nhãn "Mặt phản ứng từ tham số mô hình, không phải dự báo theo thời gian"; ẩn khi thiếu `simulation_params`. Hoặc bỏ đi nếu nhóm sản phẩm không muốn 3D không có chiều thời gian.
- 3D Monte Carlo (`quant-scenario-3d.tsx`, dựng từ `research.cone`): dữ liệu là thật (phiên, 5 phân vị, giá). Nhưng 5 phân vị cố định làm trục thứ ba gần như danh nghĩa. Giữ 2D là mặc định; 3D là tuỳ chọn.

**Ngân sách bundle [chưa đo]**
- `frontend/package.json` không có three.js, visx, d3 hay motion. Các dependency runtime là: next, react, react-dom, lucide-react, katex, @fontsource/inter, @fontsource/ibm-plex-mono.
- Đường 3D hiện tại là canvas và CSS tự viết (`quant-scenario-3d.tsx`, `quant-factor-3d.tsx`), không dùng three.js. Con số 150 KB cho three.js trong G1 không áp dụng cho repo này.
- Khuyến nghị: không thêm dependency mới cho báo cáo. Chart SVG tự vẽ từ d3-scale hoặc tự viết nếu cần. Không dùng canvas cho đường mẫu vì không có đường mẫu.
- Cách đo: chạy `next build` và đọc kích thước chunk của route báo cáo. Chưa thực hiện trong lượt này; ngân sách cụ thể cần số đo, không lấy từ bài so sánh bên thứ ba.
- Đề xuất ngân sách: không tăng kích thước chunk khởi đầu của trang báo cáo quá mức hiện tại; code 3D và biểu đồ chuyên sâu nằm sau lazy load, không tải khi mở tóm tắt.

---

## 6. Gom nhóm: kiểm tra cơ sở toán học

Nhóm đã duyệt: Kết luận 30 giây + C.Rủi ro (garch, simulation_risk, distribution, liquidity) → A.Hiện trạng (statistics, technical, hmm, context) → B.Triển vọng (arima, directional_alpha, agreement) → D.Mua bán (trade_plan, costs, decision) + dải (data_quality, commentary). Tổng 4+4+3+3+2 = 16.

Nhận xét:

1. **Hiệu suất (01) có hai phần khác bản chất.** Sharpe và lợi nhuận đo chất lượng quá khứ (phù hợp nhóm A). Max drawdown đo rủi ro (phù hợp nhóm C). Đề nghị: giữ 01 ở A, nhưng đưa đường drawdown sang C, hoặc hiện drawdown ở cả hai nơi với một nguồn dữ liệu.
2. **HMM (05) ở A là hợp lý về toán.** Xác suất filtered là ước lượng trạng thái hiện tại, không dự báo. Nhưng vì đây là nhận định trạng thái, không phải dự báo, cần tránh đọc thành triển vọng. Giữ ở A, không đưa lên B.
3. **Kỹ thuật (06) ở A có rủi ro diễn giải.** Các chỉ báo là mô tả. Chúng không độc lập (R², ER, độ dốc cùng đo xu hướng) và nhiều chỉ báo đã trượt ngoài mẫu. Ở A được, miễn là nhãn "mô tả" và trung tính màu.
4. **ARIMA (03) ở B có rủi ro lớn nhất.** Không có khoảng dự báo, dự báo điểm gần như trung bình. Đặt ở B dễ bị đọc là "giá sẽ đi đến đâu". Nếu giữ ở B, phải có chú thích so với dự báo ngẫu nhiên và không có khoảng. Đề xuất đặt ở B nhưng với thẻ có trạng thái "Mô tả", không "Triển vọng" đậm.
5. **Đồng thuận (09) ở B: chỉ có một horizon và tổng hợp**, không độc lập; giữ ở B với chú thích, không để là bằng chứng.
6. **Thanh khoản (13) ở C là hợp lý**: nó giới hạn kích thước rủi ro khi thoát lệnh, nhưng cần lưu ý `capacity_shares` chưa rõ cơ sở.
7. **Chi phí (11) ở D là hợp lý**: chi phí được trừ vào dự báo, nên đọc cùng kế hoạch.
8. **Monte Carlo (10) ở C**: đây là phân phối rủi ro cuối kỳ và phân vị, hợp lý ở C. Nhưng nếu dải giá nằm ở C, cần chú thích đây là phân vị mô phỏng, không phải khoảng tin cậy của trung bình.
9. **Dữ liệu (14) và nhận định (16) ở dải**: đúng vì một là điều kiện tin cậy, hai là tóm tắt.
10. **Kết luận 30 giây** phải đọc `decision` từ BE, không suy từ các nhóm.

Không tìm thấy lý do toán học bắt buộc để đổi thứ tự nhóm. Các điểm 1, 3, 4 là lưu ý về cách hiển thị, không phải lý do chuyển module.

---

## 7. Mục 5 nhiệm vụ: kiểm tra G2-ux-spec.md

File `research/2026-11/redesign/G2-ux-spec.md` chưa tồn tại tại thời điểm hoàn thành. Không có câu mẫu để kiểm tra toán. Cần chạy lại kiểm tra sau khi file được tạo.

---

## 8. Danh sách chưa xác minh

1. Chu kỳ thanh toán T+2 hiện hành (văn bản gốc).
2. Ý nghĩa "KRX thay đổi gì" đối với chu kỳ thanh toán.
3. Biên độ HOSE, HNX, UPCoM thường: con số đến từ nguồn thứ cấp.
4. Biên độ ngày đầu niêm yết: nguồn mâu thuẫn (±20%/±30% so với 20%/40% cho UPCoM).
5. Thuế TNCN 0,1% với cổ phiếu niêm yết từ 01/7/2026: chưa tìm được nguồn cho cổ phiếu. Số hiệu Luật, Nghị định 253/2026/NĐ-CP và Thông tư 87/2026/TT-BTC chưa đối chiếu Công báo.
6. Biểu phí môi giới: không có nguồn; 0,15% là giả định nội bộ.
7. Vị trí `decision.action` trong báo cáo BE thật.
8. `simulation_params`, `egarch`, `kelly`, `pos.value`, `n`, `sortino`, `dist.*`, `liquidity.*`, `data_quality.*` chỉ thấy trong fixture; cần đối chiếu BE thật.
9. Cơ sở của `liquidity.capacity_shares` (tỷ lệ ADV bao nhiêu).
10. Ý nghĩa `arima.forecast.prices[]` theo phiên: fixture có ba giá, chưa rõ có tương ứng phiên +1..+3 không.
11. Số mô phỏng và `prob_up` có cùng mẫu số không.
12. Ngân sách bundle: chưa đo bằng `next build`.
13. Số liệu nghiên cứu nội bộ (IC, t, DSR) không được kiểm lại trong lượt này; chỉ dùng để ghi chú diễn giải.

---

## 9. Yêu cầu thay đổi nhỏ (đề xuất cho dev FE, không làm trong G2)

1. `quant-radar-scoring.ts`: yêu cầu `probability_kind === 'filtered'`, thiếu thì missing.
2. Thống nhất dung sai tổng xác suất HMM ở `quant-scenario-data.ts` và `quant-radar-scoring.ts`.
3. Đối chiếu đường dẫn `decision` với BE thật, chọn một nguồn duy nhất.
4. Bỏ mọi câu gợi "đà tăng" hoặc "tín hiệu" cho momentum, MA200, CMF trong `quant-interpretation.ts` và `quant-factor-readings.ts`.
5. Đề xuất BE (contract): `costs.components[]` (phí, thuế, trượt giá riêng), `exchange`, `price_band_pct`, `arima.forecast.interval`, `garch.vol_cone`, `hmm.probability_kind`, `directional_alpha` IC/t/tier, `agreement` theo mô hình. Theo handoff, đề xuất BE trước, cập nhật type/fixture/test cùng lúc.

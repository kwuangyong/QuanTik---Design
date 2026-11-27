# G1 – Nghiên cứu Quant / Toán / Tech cho 16 module báo cáo Quant

Ngày: 2026-11-27. Phạm vi: đọc `docs/QUANT-RESEARCH-2026-11.md`, `docs/quant-module-data-audit.md` và danh sách `frontend/src/components/quant-*.tsx`, `frontend/src/lib/quant-*.ts`. Không sửa code, không commit.

Quy ước: mỗi module có (1) ý nghĩa toán học, (2) trực quan hoá chuẩn, (3) lỗi diễn giải phổ biến, (4) top metric. Mục "Nguồn" ghi URL đã tìm qua WebSearch; mục đánh dấu **[kiến thức nền, chưa kiểm nguồn]** là phần không có nguồn trong lượt tìm này, cần xác minh trước khi dùng làm nội dung hiển thị.

---

## Phần 1. Module Quant

### 01. Hiệu suất (statistics)

1. **Ý nghĩa.** Đo lợi nhuận đã điều chỉnh rủi ro (Sharpe, Sortino) và mức sụt giảm lớn nhất (max drawdown) của chuỗi lợi suất.
   - Ẩn dụ: Sharpe giống "số km đi được trên mỗi lít xăng" – cùng một quãng đường nhưng xe chạy giật cục có thể cho cùng số, bạn phải xem thêm đồng hồ nhiên liệu (drawdown).
2. **Trực quan chuẩn.** Đường equity curve kèm vùng drawdown dưới trục 0 (tô đỏ nhạt); bảng 6 chỉ số có n quan sát và khoảng thời gian rõ ràng. Không cần 3D.
   - Gợi ý animated có ý nghĩa: vẽ equity curve "tăng dần theo thời gian" một lần khi vào trang (tắt khi reduced-motion); không gợi ý 3D.
3. **Lỗi diễn giải.**
   - Coi Sharpe cao là bằng chứng chắc chắn; Sharpe là ước lượng có sai số lớn, nhất là khi n nhỏ. Blog cảnh báo: Sharpe không phân biệt biến động lên/xuống, và chọn "strategy tốt nhất trong nhiều thử nghiệm" làm lạc quan (selection bias).
   - Annualize Sharpe bằng căn 252 giả định lợi suất độc lập; chuỗi có tự tương quan sẽ bị méo.
   - Cảnh báo cần thiết: số liệu in-sample là kết quả đã chọn, không phải dự báo.
4. **Top metric.** (a) Max drawdown + thời gian hồi phục; (b) Sharpe kèm n và khoảng tin cậy; (c) Sortino (nếu muốn xem phần thua).
- Nguồn: https://5x5x5x5.github.io/quant-lessons/backtest/metrics/ ; https://dev.to/pickuma/what-the-sharpe-ratio-actually-tells-you-and-where-it-misleads-8pj ; https://www.institutionalinvestor.com/article/2bsx0awq6ya67ilnzka9s/opinion/the-sharpe-ratio-broke-investors-brains ; https://dev.to/pickuma/sharpe-vs-sortino-vs-calmar-choosing-a-risk-adjusted-return-metric-12o6 ; https://papers.ssrn.com/abstract=2460551 (Deflated Sharpe, Bailey & López de Prado)

### 02. Phân phối (distribution)

1. **Ý nghĩa.** Cho biết lợi suất có đối xứng hay không (skewness), đuôi dày đến đâu (kurtosis) và có gần chuẩn Gaussian hay không.
   - Ẩn dụ: đo "độ lệch và độ dày đuôi" của cơn mưa – trung bình mưa không cho biết khi nào có trận lũ quét ở đuôi.
2. **Trực quan chuẩn.** Histogram lợi suất với đường Gaussian cùng μ, σ chồng lên; Q–Q plot so với chuẩn (điểm bẻ khỏi đường ở hai đầu = đuôi dày). Không cần 3D; có thể dùng biểu đồ "tail zoom" nhấn vùng 1%–5% đầu đuôi.
3. **Lỗi diễn giải.**
   - Đọc "Gaussian = false" như tín hiệu bán/mua; đây chỉ là đặc tính rủi ro.
   - Jarque–Bera với n lớn gần như luôn bác bỏ chuẩn vì sai lệch nhỏ; cần đi kèm Q–Q plot.
   - Hiểu kurtosis = "độ biến động cao"; thực ra là xác suất cực trị.
4. **Top metric.** (a) Excess kurtosis; (b) skewness; (c) số phiên vượt ±3σ so với kỳ vọng chuẩn.
- Nguồn: https://bookdown.org/palomar/portfoliooptimizationbook/2.3-non-gaussianity-asymmetry-and-heavy-tails.html ; https://fderyckel.github.io/posts/quant-part1/normality-returns/index.html ; https://arxiv.org/pdf/1412.3126 (chuỗi cổ phiếu Mexico; kurtosis > 3, QQ plot)

### 03. ARIMA

1. **Ý nghĩa.** Mô hình tự hồi quy + trung bình trượt: dự báo giá (hoặc lợi suất) kỳ tới dựa trên giá trị và sai số quá khứ, kèm khoảng dự báo.
   - Ẩn dụ: đoán nhiệt độ ngày mai từ hôm qua và sai số dự báo hôm qua; khoảng dự báo càng xa càng loang như "quạt".
2. **Trực quan chuẩn.** Fan chart: đường trung vị + dải 50/80/95%, loang theo horizon (nguồn: fanplot, Wikipedia "fan chart"). Với chỉ 3 điểm dự báo (như fixture hiện tại), nên hiển thị dải thay vì vẽ đường dày; ghi rõ horizon.
   - Gợi ý animated: "bung" dải theo từng bước horizon khi scroll; không cần 3D.
3. **Lỗi diễn giải.**
   - Coi đường dự báo là giá sẽ đi theo. Phần lớn lợi nhuận ARIMA ngoài mẫu gần bằng 0 với cổ phiếu; dự báo ~ trung bình.
   - Coi dải 95% là "chắc chắn 95%". Dải được xây từ giả định phân phối sai số; sai khi có biến động thay đổi (dùng cùng GARCH để kiểm).
   - AIC/BIC thấp ≠ mô hình đúng. ADF p-value thấp không có nghĩa "xác suất 99% là dừng"; đây là lỗi đọc p-value phổ biến (nguồn: https://arxiv.org/pdf/1709.04059). Dùng giá trị ADF trên lợi suất, không trên giá, vì giá thường không dừng.
4. **Top metric.** (a) Độ rộng dải 80% tại horizon hiện tại; (b) so sánh với baseline "random walk" (naive forecast) – lỗi OOS; (c) dấu của trung vị so với giá hiện tại.
- Nguồn: https://guyabel.github.io/fanplot/articles/fanplot.html ; https://en.wikipedia.com/wiki/Fan_chart_(time_series) ; https://hvplot.holoviz.org/en/docs/latest/gallery/time-series/forecast_bands.html

### 04. GARCH

1. **Ý nghĩa.** Mô hình hoá biến động thay đổi theo thời gian: biến động hôm nay phụ thuộc vào cú sốc và biến động hôm qua; persistence α+β cho biết cú sốc tồn tại bao lâu.
   - Ẩn dụ: sóng biển sau bão – sóng lớn sẽ dịu dần; half-life là số giờ để sóng giảm còn một nửa.
2. **Trực quan chuẩn.**
   - Chuỗi thời gian biến động điều kiện (conditional vol) kèm đường dài hạn.
   - Volatility cone: với mỗi horizon (20, 40, 60, 90, 120 phiên) vẽ phân vị lịch sử của biến động thực hiện, đánh dấu biến động hiện tại (LuxAlgo, OpenBB). Cone rộng ở horizon ngắn và hẹp dần ở horizon dài.
   - Gợi ý 3D: có thể tạo "surface" biến động theo thời gian × horizon, nhưng khó đọc trên mobile. Khuyến nghị 2D cone; 3D chỉ hợp lý như chế độ phụ, không mặc định.
3. **Lỗi diễn giải.**
   - Coi biến động cao = giá sẽ giảm. GARCH chỉ mô tả độ lớn, không cho hướng.
   - Coi half-life là ngày "giá hồi phục". Half-life là của biến động, không của giá.
   - α+β ≥ 1 (không dừng) thì half-life không xác định; hiển thị "không hội tụ" thay vì số vô hạn. Nguồn cảnh báo ước lượng persistence có thể bị phóng đại khi có thay đổi tham số chưa được tính.
4. **Top metric.** (a) biến động hiện tại so với phân vị lịch sử (cone position); (b) persistence α+β và half-life (kèm cảnh báo); (c) EGARCH asymmetry (nếu có) để biết biến động tăng nhiều hơn khi giá giảm.
- Nguồn: https://search.r-project.org/CRAN/packages/tsgarch/vignettes/garch_models.pdf ; https://sittha33.github.io/time-series-interactive-lab/chapters/ch26.html ; https://www.luxalgo.com/library/concept/volatility-cones/ ; https://docs.openbb.co/odp/python/reference/technical/cones

### 05. HMM (mô hình Markov ẩn)

1. **Ý nghĩa.** Giả định thị trường có các "trạng thái ẩn" (ví dụ tăng ổn định, biến động cao, đi ngang) và xác suất chuyển trạng thái; mô hình suy ra xác suất đang ở từng trạng thái.
   - Ẩn dụ: đoán thời tiết (nắng/mưa/bão) chỉ từ việc thấy ai đó mang ô hay không; bạn luôn chỉ đoán được xác suất, không thấy trực tiếp.
2. **Trực quan chuẩn.**
   - Regime ribbon: dải màu nền phía dưới đường giá, màu theo trạng thái có xác suất cao nhất; hoặc stacked area của 3 xác suất (tổng = 1).
   - Tam giác chuyển pha (trong báo cáo hiện tại) là hình ternary; chỉ hữu ích khi 3 xác suất có ý nghĩa rõ, nếu không nên thay bằng stacked area.
   - Không cần 3D; animation không có ý nghĩa dữ liệu trừ khi biểu thị diễn biến theo thời gian.
3. **Lỗi diễn giải.**
   - Dùng xác suất **smoothed** (dùng dữ liệu tương lai để gán nhãn lịch sử) rồi tưởng nó là tín hiệu thực thi. Nguồn khuyến nghị: tín hiệu hành động phải dùng **filtered** probability; smoothed chỉ để xem lại lịch sử.
   - Refit mô hình trên dữ liệu mới làm thay đổi nhãn quá khứ.
   - Trạng thái "tên đẹp" (bull/bear) là nhãn sau khi đặt, không phải sự thật.
   - Một kiểm định out-of-sample (blog, không peer-review) cho thấy xác suất regime không vượt biến động 21 phiên đơn giản trong việc dự báo biến động thực hiện. Đây là câu hỏi cần kiểm tra, không phải kết luận.
4. **Top metric.** (a) xác suất filtered của trạng thái hiện tại; (b) thời gian kỳ vọng ở trạng thái (≈ 1/(1 − p_ii)); (c) so với baseline biến động.
- Nguồn: https://www.luxalgo.com/library/concept/hidden-markov-markov-switching-regimes.md ; https://arxiv.org/pdf/2605.27848 (Regime-based allocation: lọc Hamilton, làm mượt RTS) ; https://arxiv.org/pdf/2602.03874 (khuyến nghị filtered cho triển khai)

### 06. Kỹ thuật (technical)

1. **Ý nghĩa.** Tập hợp chỉ báo mô tả hình dạng giá: CMF (dòng tiền), ER (hiệu suất/nhiễu), R² và độ dốc xu hướng, RS20 (sức mạnh tương đối), beta.
   - Ẩn dụ: bảng đồng hồ xe – mỗi đồng hồ đo một thứ; nhìn nhiều đồng hồ cùng lúc dễ tự thuyết phục bản thân.
2. **Trực quan chuẩn.** Chuẩn hoá từng chỉ báo thành điểm phân vị so với lịch sử cổ phiếu (0–100) và hiển thị dạng "bar/gauge" đồng nhất; không vẽ nhiều chỉ báo chồng lên một trục.
3. **Lỗi diễn giải.**
   - Đếm số chỉ báo đồng thuận như xác suất. Các chỉ báo tương quan cao nên không độc lập.
   - Nghiên cứu nội bộ (docs/QUANT-RESEARCH-2026-11.md) báo cáo momentum, trend R², MA200, CMF, đảo chiều đều trượt OOS ở thị trường VN. Nếu hiển thị như "tín hiệu tốt", đó là sai lệch so với bằng chứng hiện có.
   - Chỉ báo chạy trên giá lịch sử đã điều chỉnh (adjusted) có thể lệch thời điểm.
4. **Top metric.** (a) phân vị của RS20 và R² trong lịch sử; (b) trạng thái OOS đã kiểm chứng/không đạt (lấy từ nghiên cứu, không tự suy); (c) beta.
- Nguồn: docs/QUANT-RESEARCH-2026-11.md (nội bộ, bảng kết quả OOS). Phần khái niệm: **[kiến thức nền, chưa kiểm nguồn]**.

### 07. Alpha (directional_alpha)

1. **Ý nghĩa.** Ước lượng xem có tín hiệu nào dự báo được lợi suất cắt ngang (rank IC) không, sau khi kiểm định ngoài mẫu. Gồm momentum theo cửa sổ, Hurst/regime, LightGBM và phần dư hồi quy.
   - Ẩn dụ: thử nhiều loại thuốc trên cùng một nhóm bệnh nhân; loại tốt nhất trong 20 thử nghiệm có thể chỉ may mắn.
2. **Trực quan chuẩn.** Bar chart IC theo cửa sổ, kèm khoảng tin cậy và tách rõ in-sample / out-of-sample. Với LightGBM, bar feature importance (SHAP) có nhãn "mô tả, không nhân quả".
3. **Lỗi diễn giải.**
   - Hurst: H < 0,5 gợi ý hồi quy về trung bình; H > 0,5 gợi ý xu hướng. Ước lượng R/S có sai lệch (bias) khi mẫu ngắn; nguồn cảnh báo kết luận mean-reversion từ R/S có thể là giả.
   - Momentum "kiểu Mỹ" không hoạt động OOS ở VN theo nghiên cứu nội bộ; hiển thị như cơ hội là sai.
   - Nhiều thử nghiệm → cần Deflated Sharpe / điều chỉnh số lần thử.
4. **Top metric.** (a) rank IC OOS và t (Newey–West); (b) DSR hoặc số lần thử đã khai báo; (c) tỷ lệ mẫu OOS so với IS.
- Nguồn: https://digitalcollections.ohsu.edu/record/3948/files/csetech-265.pdf ; https://blogs.cfainstitute.org/investor/2013/01/30/rescaled-range-analysis-a-method-for-detecting-persistence-randomness-or-mean-reversion-in-financial-markets ; https://papers.ssrn.com/abstract=2460551 ; docs/QUANT-RESEARCH-2026-11.md

### 08. Thị trường & ngành (context)

1. **Ý nghĩa.** So sánh cổ phiếu với VN-Index và ngành (tương quan, sức mạnh tương đối, xu hướng ngành).
   - Ẩn dụ: đo một người chạy nhanh hay chậm so với cả đoàn và đoàn đang chạy hướng nào.
2. **Trực quan chuẩn.** Đường chỉ số hoá về 100 (cổ phiếu vs VN-Index vs ngành); heatmap tương quan nhỏ; không 3D.
3. **Lỗi diễn giải.** Tương quan cao lúc thị trường giảm mạnh tăng lên (đồng pha khủng hoảng); tương quan lịch sử không đảm bảo bảo vệ danh mục. Gán nhầm ngành (phân loại đổi) làm sai so sánh.
4. **Top metric.** (a) RS so với VN-Index; (b) tương quan 60 phiên và thay đổi của nó; (c) xu hướng ngành.
- Nguồn: **[kiến thức nền, chưa kiểm nguồn]**; chọn đúng phân loại ngành là dữ liệu backend, cần đối chiếu.

### 09. Đồng thuận (agreement)

1. **Ý nghĩa.** Tổng hợp mức đồng ý giữa các mô hình/ tín hiệu (dự báo, đồng thuận, độ phủ, mức ủng hộ, horizon).
   - Ẩn dụ: hỏi năm người bạn về một quán ăn; nếu cả năm đều đi cùng một con đường từ cùng một bản đồ, sự đồng ý không tăng thêm nhiều thông tin.
2. **Trực quan chuẩn.** Dot strip hoặc ma trận đồng thuận (mô hình × horizon), với màu chỉ số đồng thuận; không dùng bar "tỷ lệ đồng thuận" như xác suất.
3. **Lỗi diễn giải.** Coi "5/6 mô hình đồng ý" là xác suất 83%. Các mô hình dùng cùng dữ liệu và cùng giả định nên tương quan cao; đồng thuận không phải bằng chứng độc lập.
4. **Top metric.** (a) số mô hình độc lập (sau khi loại trùng dữ liệu); (b) mức đồng thuận kèm horizon; (c) độ phủ (có bao nhiêu mô hình trả kết quả).
- Nguồn: **[kiến thức nền, chưa kiểm nguồn]**.

### 10. Monte Carlo (simulation_risk)

1. **Ý nghĩa.** Mô phỏng nhiều đường giá tương lai dưới giả định phân phối; từ đó tính xác suất cuối kỳ, các phân vị và xác suất chạm mức.
   - Ẩn dụ: thả hàng nghìn quả bóng từ cùng một điểm theo gió ngẫu nhiên; bạn xem nơi chúng rơi xuống, không phải một quả duy nhất.
2. **Trực quan chuẩn.** Fan chart: dải phân vị (5–95, 25–75) quanh đường trung vị, kèm 20–30 đường mẫu mờ; histogram giá cuối kỳ với đường TP/SL. Đây là chuẩn ngành (MathWorks fanchart, các công cụ GBM).
   - Gợi ý 3D: không cần; nếu muốn, chỉ "density" 3D theo thời gian × giá, chế độ phụ. Ưu tiên 2D fan chart.
   - Animation hữu ích: vẽ dần các đường mẫu để thấy dải hình thành; tắt khi reduced-motion.
3. **Lỗi diễn giải.**
   - Coi dải phân vị là khoảng tin cậy của giá trung bình. Dải là phân vị của phân phối giá mô phỏng, không phải CI của trung bình.
   - Tin kết quả vì "10.000 đường", trong khi mọi đường đều dựa cùng một mô hình (GBM hoặc khác) và cùng tham số; số đường không sửa được lỗi mô hình.
   - Xác suất chạm TP trước SL phụ thuộc đường đi (path-dependent); xác suất cuối kỳ không trả lời câu này.
4. **Top metric.** (a) xác suất lỗ cuối kỳ và phân vị 5%; (b) xác suất chạm SL trước TP (path-based); (c) độ nhạy với tham số σ.
- Nguồn: https://www.mathworks.com/matlabcentral/fileexchange/48006-fanchart-visualize-percentiles-of-time-series-data ; https://dev.to/ayratmurtazin/visualizing-expected-stock-price-movement-with-python-and-volatility-multipliers-1o14 ; https://www.tradingview.com/scripts/distrubution/ (ghi chú về ý nghĩa dải phân vị)

### 11. Chi phí (costs)

1. **Ý nghĩa.** Tách lợi nhuận gộp, phí khứ hồi và lợi nhuận ròng sau chi phí; xác định mức biến động tối thiểu để hoà vốn.
   - Ẩn dụ: mua một món hàng giá rẻ nhưng phải trả phí ship và thuế trước khi biết bạn lời hay lỗ.
2. **Trực quan chuẩn.** Waterfall: gộp → phí → thuế → ròng; vạch ngang "điểm hoà vốn" trên biểu đồ giá. Không cần 3D.
3. **Lỗi diễn giải.** Bỏ qua chi phí khi so sánh chiến lược ngắn hạn (chi phí là phần lớn lợi nhuận kỳ vọng). Mức phí và thuế thực tế phải đối chiếu biểu phí của công ty chứng khoán và quy định hiện hành; không suy từ bài viết.
4. **Top metric.** (a) mức hoà vốn (% giá); (b) tỷ lệ chi phí/lợi nhuận gộp; (c) lợi nhuận ròng.
- Nguồn: **[cần xác minh phí và thuế hiện hành với công ty chứng khoán và văn bản pháp luật; không có nguồn trong lượt tìm này]**. Quy định biên độ: https://stockbiz.vn/en/learn/glossary/price-limits

### 12. Kế hoạch vị thế (trade_plan)

1. **Ý nghĩa.** Tính điểm vào lệnh, cắt lỗ, chốt lời, số lượng và R:R (lợi nhuận/rủi ro) dựa trên quy mô vốn và rủi ro mỗi lệnh.
   - Ẩn dụ: thiết kế lối thoát hiểm trước khi vào phòng – biết trước cửa nào và mất bao nhiêu nếu phải ra.
2. **Trực quan chuẩn.** Thang giá dọc (price ladder) với Entry / SL / TP1 / TP2 và lỗ/lãi tiềm năng tính bằng VND; không cần 3D.
3. **Lỗi diễn giải.**
   - Coi R:R cao là kế hoạch tốt; R:R không cho biết xác suất đạt từng mức (xem Monte Carlo).
   - Bỏ qua trần/sàn: biên độ ±7% (HOSE), ±10% (HNX), ±15% (UPCoM) có thể khiến SL không khớp đúng mức giá, và lỗ thực có thể lớn hơn dự kiến (theo nguồn về biên độ giá).
   - Kelly/tỷ lệ cố định nghe chính xác nhưng dựa trên xác suất đã biết; thực tế gần như không biết. Nguồn đều khuyến nghị fractional Kelly vì sai số ước lượng dễ dẫn đến đặt quá cỡ.
4. **Top metric.** (a) lỗ tại SL (VND và % vốn); (b) R:R kèm xác suất chạm SL trước TP; (c) quy mô vị thế theo % vốn rủi ro.
- Nguồn: https://stockbiz.vn/en/learn/glossary/price-limits ; https://arxiv.org/pdf/1710.01787 (On Kelly Betting: Some Limitations) ; https://en.wikipedia.org/wiki/Kelly_criterion

### 13. Thanh khoản (liquidity)

1. **Ý nghĩa.** Đo khả năng vào/ra lệnh mà không làm giá trượt: giá trị giao dịch bình quân (ADV), số phiên cần để thoát vị thế và sức chứa.
   - Ẩn dụ: bán nhà trong khu dân cư đông người mua (thanh khoản cao) hay ở vùng vắng (thanh khoản thấp, phải hạ giá nhiều).
2. **Trực quan chuẩn.** Bar "số phiên để thoát" so với ngưỡng; biểu đồ ADV theo thời gian có đường phân vị. Không cần 3D.
3. **Lỗi diễn giải.**
   - ADV trung bình che giấu các phiên không có giao dịch hoặc bị khoá trần/sàn.
   - Amihud (|r|/khối lượng) là thước đo tác động giá, không phải chi phí giao dịch trực tiếp. Chuyển sang công thức căn bậc hai (√(Q/ADV)) cần hiệu chỉnh, nguồn tìm được không xác nhận hệ số cụ thể.
   - Sức chứa "10% ADV" nghe an toàn; thực tế phụ thuộc mức khớp lệnh và quy mô lệnh.
4. **Top metric.** (a) số phiên thoát ở 10%–20% ADV; (b) ADV20 kèm số phiên không giao dịch; (c) sức chứa tối đa.
- Nguồn: https://www.cis.upenn.edu/~mkearns/finread/amihud.pdf ; https://arxiv.org/pdf/1412.0141 (tác động phi tuyến: tuyến tính nhỏ, căn bậc hai lớn) ; https://pubsonline.informs.org/doi/10.1287/mnsc.2023.02505 (Realized Illiquidity)

### 14. Dữ liệu (data_quality)

1. **Ý nghĩa.** Kiểm tra độ đầy đủ, nhất quán và bất thường của dữ liệu trước khi tin kết quả (PASS/điểm).
   - Ẩn dụ: kiểm tra nguyên liệu trước khi nấu; nguyên liệu sạch không đảm bảo món ngon, nhưng nguyên liệu hỏng thì món nào cũng hỏng.
2. **Trực quan chuẩn.** Checklist từng kiểm tra (đạt/không đạt/cảnh báo) và timeline coverage; không dùng điểm đơn lẻ làm kết luận.
3. **Lỗi diễn giải.** Coi PASS là "dữ liệu đúng". PASS chỉ nghĩa là đã qua các kiểm tra được cài; lỗi chưa được kiểm tra vẫn còn. Nghiên cứu nội bộ ghi rõ ví dụ dữ liệu có bước nhảy qua đêm vượt biên độ và mã hủy niêm yết tính 0% (thiên lệch survivorship).
4. **Top metric.** (a) danh sách kiểm tra FAIL/WARN; (b) tỷ lệ thiếu dữ liệu; (c) ngày cập nhật cuối.
- Nguồn: docs/QUANT-RESEARCH-2026-11.md (mục giới hạn dữ liệu). Khung kiểm tra: **[kiến thức nền, chưa kiểm nguồn]**.

### 15. Quyết định (decision)

1. **Ý nghĩa.** Tổng hợp điểm, gate (cổng) và trạng thái (WATCH, executable=false) từ các module trên; mục tiêu là quy trình, không phải lệnh mua.
   - Ẩn dụ: bảng kiểm trước khi máy bay cất cánh; đèn "chưa đủ điều kiện" không có nghĩa là có lỗi thiết kế, nhưng cũng không cho phép cất cánh.
2. **Trực quan chuẩn.** Checklist cổng: từng gate hiển thị lý do bằng chữ, không chỉ một con số; thanh điểm có nhãn "tổng hợp, không phải xác suất".
3. **Lỗi diễn giải.** Nhìn điểm cao rồi hiểu là "nên mua". Điểm tổng hợp phụ thuộc trọng số đã chọn; báo cáo ghi executable=false cần được hiển thị nổi bật để người đọc không hiểu thành tín hiệu giao dịch.
4. **Top metric.** (a) các gate đạt/không đạt kèm lý do; (b) trạng thái thực thi (executable); (c) điểm tổng hợp kèm thành phần.
- Nguồn: **[kiến thức nền, chưa kiểm nguồn]**; nguyên tắc tiêu chí đã kiểm chứng/thử nghiệm/mô tả: docs/QUANT-RESEARCH-2026-11.md.

### 16. Nhận định (commentary)

1. **Ý nghĩa.** Đoạn văn tổng hợp (4 đoạn) giải thích kết quả các module; mục tiêu là đọc hiểu, không thêm số liệu mới.
   - Ẩn dụ: bản tóm tắt sách; hay nhưng phải có chú thích trang gốc, không được thay thế cuốn sách.
2. **Trực quan chuẩn.** Không cần biểu đồ; nên gắn liên kết từng câu với module nguồn (ví dụ chú thích số [03], [10]) để người đọc truy ngược.
3. **Lỗi diễn giải.** Văn trôi chảy làm mất độ bất định; người đọc tin đoạn văn hơn bảng số. Cần câu cảnh báo cố định và không được có số không có trong module.
4. **Top metric.** Không áp dụng metric; thay bằng (a) số câu có liên kết đến module nguồn; (b) nhãn độ tin cậy; (c) cảnh báo khi dữ liệu UNAVAILABLE.
- Nguồn: **[kiến thức nền, chưa kiểm nguồn]**; yêu cầu chặn trạng thái UNAVAILABLE: docs/quant-module-data-audit.md.

---

## Phần 2. Tech: thư viện, bundle và hiệu năng

Lưu ý nguồn: số liệu bundle từ bài so sánh của đối thủ (TanStack Charts) và blog, chưa tự đo; cần đo bằng bundler của dự án trước khi chốt.

| Nhu cầu | Gợi ý | Kích thước (ghi chú nguồn) | Ghi chú |
|---|---|---|---|
| Fan chart, histogram, Q–Q, waterfall, cone | SVG tự vẽ với d3-scale + d3-shape, hoặc visx | visx xychart ~49 KB gzip; D3 ~90 KB gzip (số từ TanStack, cần đo lại) | Bundle nhẹ nhất khi chỉ dùng scale + shape; tránh import cả d3 |
| 3D (GARCH surface, mô phỏng) | react-three-fiber (R3F) + three.js, lazy load | three.js ~150 KB gzip trước nội dung; R3F cộng thêm reconciler | Chỉ tải khi người dùng mở chế độ 3D; luôn có fallback 2D; không mặc định |
| Animation UI | CSS transitions/keyframes cho đa số; motion (framer-motion) với LazyMotion nếu cần | Tài liệu vendor: LazyMotion xuống khoảng dưới 5 KB ban đầu; số đo khác nhau tuỳ phiên bản | Dùng domAnimation thay vì domMax nếu không cần layout animation |
| Chart đồng bộ nhiều biểu đồ, tương tác | d3 + React state (không đưa vào virtual DOM toàn bộ) | — | Cẩn thận khi nhiều path Monte Carlo: dùng canvas nếu > vài nghìn đường |

**Hiệu năng mobile.**
- Monte Carlo 10.000 đường trên SVG sẽ chậm; tính phân vị trên server hoặc trong worker, chỉ vẽ dải và 20–30 đường mẫu.
- Dùng canvas cho đường mẫu, SVG cho trục và nhãn (tách lớp).
- 3D trên mobile: giới hạn số đối tượng và DPR; ưu tiên 2D.

**prefers-reduced-motion.**
- CSS: bọc animation trong `@media (prefers-reduced-motion: no-preference)`; mặc định là không chuyển động. Đây là kỹ thuật được W3C liệt kê (C39) cho WCAG 2.3.3 (cấp AAA).
- JS: `window.matchMedia('(prefers-reduced-motion: reduce)')` và lắng nghe thay đổi; với motion dùng `MotionConfig reducedMotion`.
- Lưu ý: query chỉ xử lý chuyển động theo tương tác/tự động; tự động phát liên tục (như đường mẫu MC chạy vòng) cần nút tạm dừng (WCAG 2.2.2).
- Áp dụng riêng cho HMM (regime chuyển động), GARCH (cone đang vẽ) và Monte Carlo (đường mẫu).

**Khuyến nghị tổng quát.** Đa số module cần 2D SVG/canvas chính xác. 3D chỉ hợp lý cho một cảnh (GARCH surface hoặc phân phối đa horizon) và phải là chế độ tuỳ chọn. Không đưa 3D cho radar nhân tố hay HMM vì không tăng thông tin.

**Nguồn tech:**
- https://tanstack.com/charts/latest/docs/comparison (số bundle; cạnh tranh, cần kiểm)
- https://www.framer.com/motion/guide-reduce-bundle-size/ ; https://motion.dev/docs/react-reduce-bundle-size
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39 ; https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries_for_accessibility
- https://v3.gatsbyjs.com/blog/performance-optimization-for-three-js-web-animations (tối ưu three.js)

---

## Phần 3. Ghi chú cho lượt kiểm tra tiếp theo

- "T+2.5" trong một số tài liệu chưa được xác nhận; nguồn tìm được ghi T+2 làm việc. Không nên hiển thị thời hạn thanh toán trước khi kiểm tra quy định hiện hành.
- Biên độ trần/sàn: HOSE ±7%, HNX ±10%, UPCoM ±15% (nguồn: stockbiz.vn). Nguồn khác ghi ngoại lệ ngày đầu niêm yết (UPCoM có thể tới 40%, nguồn khác ghi 20%); cần xác minh.
- Chưa tìm được công thức chuyển Amihud sang chi phí căn bậc hai; không dùng hệ số cụ thể nếu chưa có nguồn.
- Chưa tìm được nguồn về "xác suất lợi nhuận" cho nhà đầu tư cá nhân; không đưa diễn giải này nếu chưa có dữ liệu.
- Mọi nội dung từ nghiên cứu nội bộ (docs/QUANT-RESEARCH-2026-11.md) là kết quả đã thực hiện trong repo; không phải kiểm chứng độc lập của lượt này.

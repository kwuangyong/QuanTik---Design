# Catalog chủ đề QuanTik

Sinh bởi `pipeline/catalog.py` ngày 2026-11-12 từ QuanTik---Design `ac77629` và QuanTik-website `521a093`. Đừng sửa tay — chạy lại script.

**199 chủ đề**: 166 chỉ số có công thức, 27 engine, 6 trường mô tả (ít hợp làm video riêng).

Mọi id dưới đây dùng được làm `--topics`. Cột *Mô hình demo* là mô hình chạy code thật dùng cho chart/3D; trống nghĩa là video dùng công thức, ngưỡng đọc và code trích từ engine.

| id | Tên | Nhóm | Loại | Engine | Mô hình demo |
| --- | --- | --- | --- | --- | --- |
| `engine_action` | Bộ quyết định hành động (ActionEngine) | Engine | engine | ActionEngine |  |
| `engine_adaptive_scorer` | Chấm điểm thích ứng (AdaptiveScorer) | Engine | engine | AdaptiveScorer |  |
| `engine_agreement` | Đồng thuận alpha (AgreementEngine) | Engine | engine | AgreementEngine |  |
| `engine_alpha` | Trích xuất alpha (AlphaEngine) | Engine | engine | AlphaEngine |  |
| `engine_analysis` | Phân tích kỹ thuật (AnalysisEngine) | Engine | engine | AnalysisEngine |  |
| `engine_arima` | ARIMA (ARIMAEngine) | Engine | engine | ARIMAEngine |  |
| `engine_conditional_residual_reversion` | Đảo chiều phần dư có điều kiện (ConditionalResidualReversionEngine) | Engine | engine | ConditionalResidualReversionEngine | ou |
| `engine_cost` | Chi phí giao dịch (CostEngine) | Engine | engine | CostEngine |  |
| `engine_cross_correlation` | Tương quan trễ giữa các mã (CrossCorrelationEngine) | Engine | engine | CrossCorrelationEngine |  |
| `engine_cross_sectional_light_gbm` | LightGBM cắt ngang (CrossSectionalLightGBMEngine) | Engine | engine | CrossSectionalLightGBMEngine |  |
| `engine_data_quality` | Kiểm tra chất lượng dữ liệu (DataQualityEngine) | Engine | engine | DataQualityEngine |  |
| `engine_distribution_analyzer` | Kiểm định phân phối lợi suất (DistributionAnalyzer) | Engine | engine | DistributionAnalyzer |  |
| `engine_fcast` | Ensemble dự báo (FcastEngine) | Engine | engine | FcastEngine |  |
| `engine_feature` | Đặc trưng kỹ thuật (FeatureEngine) | Engine | engine | FeatureEngine |  |
| `engine_garch` | GARCH(1,1)-t / EGARCH (GARCHEngine) | Engine | engine | GARCHEngine | garch |
| `engine_hmm` | HMM trạng thái thị trường (HMMEngine) | Engine | engine | HMMEngine | hmm |
| `engine_hurst_regime` | Hurst regime (HurstRegimeEngine) | Engine | engine | HurstRegimeEngine | hurst |
| `engine_liquidity` | Bộ lọc thanh khoản (LiquidityEngine) | Engine | engine | LiquidityEngine |  |
| `engine_market_analyzer` | Phân tích thị trường (MarketAnalyzer) | Engine | engine | MarketAnalyzer |  |
| `engine_meta_label` | Meta-label (MetaLabelEngine) | Engine | engine | MetaLabelEngine |  |
| `engine_momentum_alpha` | Momentum đa khung (MomentumAlphaEngine) | Engine | engine | MomentumAlphaEngine |  |
| `engine_risk` | Động cơ rủi ro (RiskEng) | Engine | engine | RiskEng |  |
| `engine_screening` | Quét toàn sàn (ScreeningEngine) | Engine | engine | ScreeningEngine |  |
| `engine_sector` | Xu hướng ngành (SectorEngine) | Engine | engine | SectorEngine |  |
| `engine_stat` | Thống kê lợi suất (StatEngine) | Engine | engine | StatEngine |  |
| `engine_structure` | Cấu trúc giá (StructureEngine) | Engine | engine | StructureEngine |  |
| `engine_vn_market_rules` | Quy tắc thị trường Việt Nam (VNMarketRules) | Engine | engine | VNMarketRules |  |
| `action_agreement` | Đồng thuận mô hình (Weighted model agreement) |  | metric | AgreementEngine |  |
| `action_allocation` | Tỷ trọng vị thế theo NAV (Position allocation / NAV) |  | metric | ActionEngine |  |
| `action_cost` | Chi phí khứ hồi ước tính (Round-trip cost) |  | metric | CostEngine |  |
| `action_decision` | Hành động theo báo cáo (Execution action) |  | metric | ActionEngine |  |
| `action_executable` | Điều kiện thực thi (Execution eligibility) |  | metric | ActionEngine |  |
| `action_forecast` | Lợi nhuận dự báo tổng hợp (Ensemble forecast) |  | metric | FcastEngine |  |
| `action_gross` | Dự báo gộp trước chi phí (Gross forecast) |  | metric | ActionEngine |  |
| `action_kelly` | Kelly và điều kiện khả dụng (Kelly Criterion) |  | metric | RiskEng | kelly |
| `action_kelly_full` | Tỷ lệ Full Kelly (Full Kelly) |  | metric | RiskEng | kelly |
| `action_kelly_half` | Tỷ lệ Half Kelly (Half Kelly) |  | metric | RiskEng | kelly |
| `action_liquidity` | Điều kiện thanh khoản (Liquidity eligibility) |  | metric | LiquidityEngine |  |
| `action_lock_drawdown` | Sụt giảm mô phỏng trong thời gian chờ T+2 (Settlement-lock downside (P05)) |  | metric | RiskEng | monte_carlo |
| `action_lock_flag` | Cờ rủi ro trước khi cổ phiếu về tài khoản (Settlement risk flag) |  | metric | RiskEng |  |
| `action_lock_loss` | Xác suất mô phỏng lỗ trên 3% trong T+2 (Probability of loss > 3% during settlement) |  | metric | RiskEng |  |
| `action_net` | Dự báo sau chi phí (Net forecast after costs) |  | metric | ActionEngine |  |
| `action_quality` | Chất lượng và điểm dữ liệu (Data quality status and score) |  | metric | DataQualityEngine |  |
| `action_risk_nav` | Rủi ro vị thế theo NAV (Position risk / NAV) |  | metric | ActionEngine |  |
| `action_rr_net` | R:R sau chi phí (Net reward / risk) |  | metric | RiskEng |  |
| `action_rr_tp2` | R:R TP2 trước chi phí (TP2 reward / risk) |  | metric | RiskEng |  |
| `action_shares` | Số cổ phiếu của phương án (Position size in shares) |  | metric | ActionEngine |  |
| `action_sizing` | Cơ sở vốn của phương án (Position sizing capital basis) |  | metric | RiskEng |  |
| `active_model_count` | Số mô hình hoạt động (Active Models) | Giá và chỉ báo | metric | AgreementEngine |  |
| `adv20_value_vnd` | Giá trị giao dịch bình quân 20 phiên (ADV20) | Giá và chỉ báo | metric | LiquidityEngine |  |
| `annual_return` | Lợi nhuận quy đổi năm (Annual Return) | Performance Metrics | metric |  | sharpe |
| `ask` | Lệnh bán chờ (Dư bán) | Giá và chỉ báo | metric | CrossSectionalLightGBMEngine |  |
| `atr` | Biên độ thực trung bình (ATR) | Giá và chỉ báo | metric | RiskEng |  |
| `beta` | Độ nhạy với thị trường (Beta) | Giá và chỉ báo | metric | GARCHEngine |  |
| `bid` | Lệnh mua chờ (Dư mua) | Giá và chỉ báo | metric |  |  |
| `bollinger` | Dải Bollinger (Bollinger Bands) | Giá và chỉ báo | metric |  |  |
| `calmar` | Lợi nhuận trên mức sụt giảm (Calmar) | Performance Metrics | metric | StatEngine | sharpe |
| `ceil` | Giá trần (Trần) | Giá và chỉ báo | metric | VNMarketRules |  |
| `cmf` | Dòng tiền Chaikin (CMF) | Market Statistics | metric | StructureEngine |  |
| `confidence` | Đồng thuận mô hình (Confidence) | Forecasting | metric | FcastEngine |  |
| `cvar` | Tổn thất kỳ vọng ở đuôi (CVaR) | Tail Risk | metric | RiskEng | var_cvar |
| `directional_support_pct` | Hỗ trợ hướng dự báo (Directional Support) | Giá và chỉ báo | metric | AgreementEngine |  |
| `dsr` | Deflated Sharpe Ratio (DSR) | Giá và chỉ báo | metric |  | sharpe |
| `ema` | Trung bình động lũy thừa (EMA) | Giá và chỉ báo | metric | AlphaEngine |  |
| `ensemble_return` | Lợi nhuận dự báo tổng hợp (Ensemble Return) | Forecasting | metric | FcastEngine |  |
| `entry` | Điểm vào (Entry) | Giá và chỉ báo | metric | RiskEng |  |
| `entry_quality` | Chất lượng Entry/SL (Entry/SL Quality) | Trading Parameters | metric | DataQualityEngine |  |
| `floor` | Giá sàn (Sàn) | Giá và chỉ báo | metric | VNMarketRules |  |
| `gap_abs_p95_pct` | Phân vị 95% khoảng trống giá (Gap P95) | Giá và chỉ báo | metric | RiskEng |  |
| `garch` | Mô hình phương sai có điều kiện (GARCH) | Giá và chỉ báo | metric | GARCHEngine | garch |
| `hmm` | Trạng thái Markov ẩn (HMM Regime) | Market Statistics | metric | HMMEngine | hmm |
| `home_agreement` | Kiểm tra sự xác nhận (Agreement & Meta-label) | GATE / CONFIRM | metric | AgreementEngine |  |
| `home_alpha` | Lợi thế theo bối cảnh (Directional Alpha) | ALPHA / SIGNAL | metric | CrossSectionalLightGBMEngine |  |
| `home_garch` | Biến động có điều kiện (GARCH(1,1)–t) | GARCH / VOL | metric | GARCHEngine | garch |
| `home_hmm` | Nhận diện trạng thái (Hidden Markov Model) | HMM / REGIME | metric | HMMEngine | hmm |
| `home_hurst` | Định tuyến theo hành vi (Hurst Regime) | H / ROUTING | metric | HurstRegimeEngine | hurst |
| `home_monte` | Phân phối & kịch bản (GARCH–t Monte Carlo) | MC / RISK | metric | FcastEngine |  |
| `hurst` | Hệ số Hurst (Hurst) | Giá và chỉ báo | metric | HurstRegimeEngine | hurst |
| `kelly` | Tiêu chuẩn Kelly (Kelly) | Trading Parameters | metric | RiskEng | kelly |
| `kurtosis` | Độ dày đuôi phân phối (Kurtosis) | Tail Risk | metric | DistributionAnalyzer | var_cvar |
| `lightgbm_alpha_pct` | Dự báo alpha của mô hình (LightGBM Alpha) | Giá và chỉ báo | metric | CrossSectionalLightGBMEngine |  |
| `lightgbm_rank_pct` | Percentile xếp hạng mô hình (LightGBM Rank) | Giá và chỉ báo | metric | CrossSectionalLightGBMEngine |  |
| `liquidity` | Giá trị giao dịch (Thanh khoản) | Giá và chỉ báo | metric | LiquidityEngine |  |
| `lock_drawdown` | Ngưỡng khóa theo sụt giảm (Lock Drawdown) | Lock Risk | metric | RiskEng | monte_carlo |
| `macd` | Động lượng hội tụ/phân kỳ (MACD) | Giá và chỉ báo | metric | AlphaEngine |  |
| `matched` | Giá giao dịch gần nhất (Khớp lệnh) | Giá và chỉ báo | metric |  |  |
| `max_drawdown` | Sụt giảm tối đa (Max Drawdown) | Performance Metrics | metric |  | sharpe |
| `mc_volatility` | Biến động mô phỏng (Monte Carlo Volatility) | Forecasting | metric | GARCHEngine | garch |
| `meta_trust_pct` | Độ tin cậy meta-model (Meta Trust) | Giá và chỉ báo | metric | MetaLabelEngine |  |
| `model_coverage` | Độ phủ mô hình (Model Coverage) | Giá và chỉ báo | metric | AgreementEngine |  |
| `module_adf_p` | p-value kiểm định tính dừng (ADF p-value) |  | metric | ARIMAEngine | ou |
| `module_aic` | Tiêu chí AIC (Akaike information criterion) |  | metric | ARIMAEngine |  |
| `module_annual_vol` | Biến động năm (Annualized volatility) |  | metric | GARCHEngine | garch |
| `module_arima_order` | Cấu hình ARIMA được chọn (ARIMA order (p,d,q)) |  | metric | ARIMAEngine |  |
| `module_bic` | Tiêu chí BIC (Bayesian information criterion) |  | metric | ARIMAEngine |  |
| `module_egarch_gamma` | γ · Tác động bất đối xứng trong EGARCH (EGARCH γ · Asymmetric shocks) |  | metric | GARCHEngine | garch |
| `module_er` | Hiệu quả xu hướng ER (Efficiency ratio) |  | metric | StructureEngine |  |
| `module_garch_alpha` | α · Phản ứng với cú sốc mới (GARCH α · Shock sensitivity) |  | metric | GARCHEngine | garch |
| `module_garch_beta` | β · Ghi nhớ phương sai trước (GARCH β · Variance memory) |  | metric | GARCHEngine | garch |
| `module_garch_half_life` | Chu kỳ bán rã ảnh hưởng cú sốc (GARCH volatility-shock half-life) |  | metric | GARCHEngine | garch |
| `module_garch_persistence` | Độ dai dẳng của cú sốc biến động (GARCH persistence α + β) |  | metric | GARCHEngine | garch |
| `module_garch_volatility` | Biến động có điều kiện hiện tại (Conditional volatility σ) |  | metric | GARCHEngine | garch |
| `module_gate` | Kết quả cổng điều kiện (Execution gate result) |  | metric | ActionEngine |  |
| `module_gaussian` | Kết luận kiểm định Gaussian (Gaussian distribution verdict) |  | metric | DistributionAnalyzer | var_cvar |
| `module_hmm_bear` | Xác suất trạng thái BEAR (HMM BEAR probability) |  | metric | HMMEngine | hmm |
| `module_hmm_bull` | Xác suất trạng thái BULL (HMM BULL probability) |  | metric | HMMEngine | hmm |
| `module_hmm_method` | Phương pháp nhận diện trạng thái (Regime estimation method) |  | metric | HMMEngine | hmm |
| `module_hmm_prob` | Xác suất trạng thái hiện tại (Current-state probability) |  | metric | HMMEngine | hmm |
| `module_hmm_sideway` | Xác suất trạng thái SIDEWAY (HMM SIDEWAY probability) |  | metric | HMMEngine | hmm |
| `module_hmm_state` | Trạng thái HMM hiện tại (Current HMM state) |  | metric | HMMEngine | hmm |
| `module_hurst` | Hurst từ nhiều cửa sổ lợi suất (Multi-window Hurst exponent) |  | metric | HurstRegimeEngine | hurst |
| `module_hurst_confidence` | Độ tin cậy của ước lượng Hurst (Hurst estimate confidence) |  | metric | HurstRegimeEngine | hurst |
| `module_hurst_regime` | Regime Hurst do báo cáo công bố (Reported Hurst regime) |  | metric | HurstRegimeEngine | hurst |
| `module_hurst_windows` | Các cửa sổ ước lượng Hurst (Hurst estimates by window) |  | metric | HurstRegimeEngine | hurst |
| `module_lightgbm` | Dự báo lợi suất riêng LightGBM (LightGBM return forecast) |  | metric | CrossSectionalLightGBMEngine |  |
| `module_lightgbm_available` | Khả dụng và tham gia của mô hình (Model availability and participation) |  | metric | CrossSectionalLightGBMEngine |  |
| `module_liquidity_ratio` | Tỷ lệ thanh khoản 5/20 (5/20-session traded-value ratio) |  | metric | LiquidityEngine |  |
| `module_mc_source` | Nguồn biến động mô phỏng (Simulation volatility source) |  | metric | RiskEng | monte_carlo |
| `module_mc_up` | Xác suất tăng cuối kỳ (Terminal upside probability) |  | metric | RiskEng | monte_carlo |
| `module_momentum` | Điểm động lượng nhiều cửa sổ (Multi-horizon momentum) |  | metric | MomentumAlphaEngine |  |
| `module_momentum_windows` | Lợi suất đã quan sát theo cửa sổ (Observed momentum returns) |  | metric | MomentumAlphaEngine |  |
| `module_observations` | Số quan sát (Observation count) |  | metric | DataQualityEngine |  |
| `module_position_loss` | Lỗ ước tính tại SL (Estimated stop loss amount) |  | metric | RiskEng |  |
| `module_position_value` | Giá trị vị thế (Position value) |  | metric | RiskEng |  |
| `module_quality_score` | Điểm chất lượng dữ liệu (Data quality score) |  | metric | DataQualityEngine |  |
| `module_r2` | Mức phù hợp đường xu hướng (Trend regression R²) |  | metric | StructureEngine |  |
| `module_residual` | Hồi quy phần dư có điều kiện (Conditional residual reversion) |  | metric | ConditionalResidualReversionEngine | ou |
| `module_rs20` | Sức mạnh tương đối 20 phiên (20-session relative strength) |  | metric | StructureEngine |  |
| `module_sector_corr` | Tương quan trung bình trong ngành (Average pairwise correlation) |  | metric | CrossCorrelationEngine |  |
| `module_sector_name` | Nhóm ngành (Sector classification) |  | metric | SectorEngine |  |
| `module_sector_trend` | Xu hướng ngành (Reported sector trend) |  | metric | SectorEngine |  |
| `module_slope` | Độ thay đổi trên cửa sổ xu hướng (Price change over trend window) |  | metric | StructureEngine |  |
| `module_stationary` | Kết luận tính dừng (Reported stationarity result) |  | metric | ARIMAEngine | ou |
| `monte_carlo` | Mô phỏng Monte Carlo (Monte Carlo) | Giá và chỉ báo | metric | RiskEng | monte_carlo |
| `net_forecast` | Lợi nhuận dự báo ròng (Net Forecast) | Giá và chỉ báo | metric | FcastEngine |  |
| `probability_loss` | Xác suất lỗ vượt 3% (Probability Loss >3%) | Lock Risk | metric | RiskEng | monte_carlo |
| `psr` | Probabilistic Sharpe Ratio (PSR) | Giá và chỉ báo | metric |  | sharpe |
| `quant_factor` | Nhân tố định lượng (Quant Factor) | Giá và chỉ báo | metric | AdaptiveScorer |  |
| `quant_score` | Điểm tổng hợp (Điểm Quant) | Giá và chỉ báo | metric | AdaptiveScorer |  |
| `ref` | Giá tham chiếu (Tham chiếu) | Giá và chỉ báo | metric | VNMarketRules |  |
| `risk_pct_nav` | Rủi ro theo NAV (RiskPctNAV) | Giá và chỉ báo | metric | RiskEng |  |
| `risk_reward` | Tỷ lệ lợi nhuận/rủi ro (Risk/Reward (TP2R–TP3R)) | Trading Parameters | metric | RiskEng | kelly |
| `rsi` | Chỉ số sức mạnh tương đối (RSI) | Market Statistics | metric | AlphaEngine |  |
| `sector_change` | Lợi suất ngành minh họa (Thay đổi trung bình nhóm) | Giá và chỉ báo | metric | SectorEngine |  |
| `sharpe` | Hiệu suất điều chỉnh biến động (Sharpe) | Performance Metrics | metric | AdaptiveScorer | sharpe |
| `sheet-action` | Tổng quan · Sheet lọc cổ phiếu (Khuyến nghị) | overview | metric | ActionEngine |  |
| `sheet-adv20_value_vnd` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (GTGD TB 20 phiên (tỷ)) | quality | metric | LiquidityEngine |  |
| `sheet-agreement_pct` | Dự báo & chi phí · Sheet lọc cổ phiếu (Đồng thuận (%)) | forecast | metric | AgreementEngine |  |
| `sheet-annual_return_pct` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (Annual Return (%)) | performance | metric |  | sharpe |
| `sheet-capacity_shares` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Sức chứa tối đa (cổ phiếu)) | quality | metric | LiquidityEngine |  |
| `sheet-data_quality_flags` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Cảnh báo dữ liệu) | quality | metric | DataQualityEngine |  |
| `sheet-data_quality_score` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Điểm dữ liệu) | quality | metric | DataQualityEngine |  |
| `sheet-data_quality_status` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Chất lượng dữ liệu) | quality | metric | DataQualityEngine |  |
| `sheet-ensemble_return_pct` | Dự báo & chi phí · Sheet lọc cổ phiếu (Lợi nhuận dự báo (%)) | forecast | metric | FcastEngine |  |
| `sheet-entry_vnd` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (Entry) | trade | metric | RiskEng |  |
| `sheet-forecast_direction` | Dự báo & chi phí · Sheet lọc cổ phiếu (Dự báo) | forecast | metric | FcastEngine |  |
| `sheet-gap_abs_p95_pct` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Khoảng trống giá 95% (%)) | quality | metric | RiskEng |  |
| `sheet-gate_pass` | Tổng quan · Sheet lọc cổ phiếu (Đạt bộ lọc) | overview | metric | ActionEngine |  |
| `sheet-gate_reasons` | Tổng quan · Sheet lọc cổ phiếu (Giải thích điều kiện) | overview | metric | ActionEngine |  |
| `sheet-gross_forecast_pct` | Dự báo & chi phí · Sheet lọc cổ phiếu (Lợi nhuận gộp (%)) | forecast | metric | FcastEngine |  |
| `sheet-hmm_regime` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (HMM) | performance | metric | HMMEngine | hmm |
| `sheet-index_trend` | Thị trường & ngành · Sheet lọc cổ phiếu (Xu hướng VN-Index) | sector | metric |  |  |
| `sheet-liquidity_tier` | Dữ liệu & thanh khoản · Sheet lọc cổ phiếu (Thanh khoản) | quality | metric | LiquidityEngine |  |
| `sheet-lock_drawdown_pct` | Rủi ro T+2 · Sheet lọc cổ phiếu (Sụt giảm khi chờ T+2 (%)) | risk | metric | RiskEng | monte_carlo |
| `sheet-max_drawdown_pct` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (Max DD (%)) | performance | metric |  | sharpe |
| `sheet-mc_volatility_source` | Rủi ro T+2 · Sheet lọc cổ phiếu (Biến động mô phỏng) | risk | metric | GARCHEngine | garch |
| `sheet-net_forecast_pct` | Dự báo & chi phí · Sheet lọc cổ phiếu (Lợi nhuận ròng (%)) | forecast | metric | FcastEngine |  |
| `sheet-probability_loss_gt_3pct` | Rủi ro T+2 · Sheet lọc cổ phiếu (Xác suất lỗ trên 3% (%)) | risk | metric | RiskEng | monte_carlo |
| `sheet-rating` | Tổng quan · Sheet lọc cổ phiếu (Đánh giá) | overview | metric | AdaptiveScorer |  |
| `sheet-risk_pct_nav` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (RiskPctNAV) | trade | metric | RiskEng |  |
| `sheet-roundtrip_cost_pct` | Dự báo & chi phí · Sheet lọc cổ phiếu (Chi phí (%)) | forecast | metric | CostEngine |  |
| `sheet-score` | Tổng quan · Sheet lọc cổ phiếu (Điểm) | overview | metric | AdaptiveScorer |  |
| `sheet-sector` | Thị trường & ngành · Sheet lọc cổ phiếu (Nhóm ngành) | sector | metric | SectorEngine |  |
| `sheet-sector_correlation` | Thị trường & ngành · Sheet lọc cổ phiếu (Tương quan ngành) | sector | metric | CrossCorrelationEngine |  |
| `sheet-sector_lead_lag` | Thị trường & ngành · Sheet lọc cổ phiếu (Mã dẫn dắt ngành) | sector | metric | SectorEngine |  |
| `sheet-sector_return_20d_pct` | Thị trường & ngành · Sheet lọc cổ phiếu (Lợi nhuận ngành 20 phiên (%)) | sector | metric | SectorEngine |  |
| `sheet-sector_trend` | Thị trường & ngành · Sheet lọc cổ phiếu (Xu hướng ngành) | sector | metric | SectorEngine |  |
| `sheet-sharpe` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (Sharpe) | performance | metric | AdaptiveScorer | sharpe |
| `sheet-stop_loss_vnd` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (SL) | trade | metric | RiskEng |  |
| `sheet-take_profit_1_vnd` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (TP1) | trade | metric | RiskEng |  |
| `sheet-take_profit_2_vnd` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (TP2) | trade | metric | RiskEng |  |
| `sheet-trade_model_agreement_pct` | Kế hoạch giao dịch · Sheet lọc cổ phiếu (Model Agreement (%)) | trade | metric | AgreementEngine |  |
| `sheet-up_day_ratio_pct` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (Win Rate (%)) | performance | metric |  |  |
| `sheet-volatility_regime` | Hiệu suất & trạng thái · Sheet lọc cổ phiếu (Volatility Regime) | performance | metric | GARCHEngine | garch |
| `skewness` | Độ bất đối xứng (Skewness) | Giá và chỉ báo | metric | DistributionAnalyzer | var_cvar |
| `sma` | Trung bình động đơn giản (SMA) | Giá và chỉ báo | metric |  |  |
| `sortino` | Hiệu suất điều chỉnh rủi ro giảm (Sortino) | Performance Metrics | metric | StatEngine | sharpe |
| `stop_loss` | Ngưỡng dừng lỗ (Stop loss) | Giá và chỉ báo | metric | RiskEng |  |
| `take_profit` | Mục tiêu giá (Take profit) | Giá và chỉ báo | metric | RiskEng |  |
| `up_day_ratio` | Tỷ lệ ngày có lợi suất dương (Tỷ lệ phiên tăng) | Giá và chỉ báo | metric | StatEngine |  |
| `var` | Phân vị mức lỗ (VaR) | Tail Risk | metric | RiskEng | var_cvar |
| `volatility_regime` | Trạng thái biến động (Volatility Regime) | Market Statistics | metric | GARCHEngine | garch |
| `win_rate` | Tỷ lệ lệnh thắng (Win Rate) | Performance Metrics | metric | RiskEng | sharpe |
| `action_horizon` | Thời gian nắm giữ dự kiến (Forecast horizon) |  | field | ActionEngine |  |
| `action_lock_sessions` | Cửa sổ khóa thanh toán (Settlement lock window) |  | field | RiskEng |  |
| `home_iv` | Coming soon (Implied Volatility Surface) | IV / OPTIONS | field | AgreementEngine |  |
| `sheet-commentary` | Nhận xét · Sheet lọc cổ phiếu (Nhận xét chi tiết) | notes | field |  |  |
| `sheet-holding_sessions` | Tổng quan · Sheet lọc cổ phiếu (Thời gian nắm giữ) | overview | field |  |  |
| `sheet-symbol` | Tổng quan · Sheet lọc cổ phiếu (Mã) | overview | field | CrossSectionalLightGBMEngine |  |

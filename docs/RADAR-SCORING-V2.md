# Radar scoring v2 — ngưỡng chỉ số gốc

Thay cách lấy z-score cho Sharpe, CMF, ER, HMM và thanh khoản trên radar. Chỉ thay lớp trình bày; không sửa Quant engine, mô hình dự báo, action gate hay điểm `decision.rec.score`.

## Quy tắc đã chốt

| Trục | Nguồn | Quy tắc |
|---|---|---|
| Sharpe | `sections.statistics.metrics.stats.sharpe` | <0 xấu; 0–2 bình thường; >2 tốt |
| CMF | `sections.technical.metrics.flow.cmf` | <0 xấu; 0–0.1 bình thường; >0.1 tốt; CMF phải trong [-1,1] |
| Chất lượng xu hướng | `sections.technical.metrics.trend.er` | <0.3 nhiễu; 0.3–0.6 vừa; >0.6 sạch; >0.8 rất hiếm. Không nhân dấu độ dốc; xu hướng giảm cũng có thể sạch |
| HMM | `sections.hmm.metrics.hmm.state_probs` | `P_BULL_pct + 0.5 * P_SIDEWAY_pct`. <30 bear rõ, 30–70 chưa rõ, >70 bull rõ; 50 trung tính |
| Thanh khoản | Rổ snapshot ADV20/Amihud20 cùng phiên | `0.5 * rank(log(ADV20)) + 0.5 * (100 - rank(Amihud20))` |
| Alpha tổng hợp | Điểm từng module | Trung bình cộng module hợp lệ, mỗi module một phiếu; hiển thị độ phủ |
| Dự báo sau phí, độ tin cậy, biến động | `research.factors` | Giữ nguyên công thức `(value-min)/(max-min)*100`; không tự đảo chiều |

Các trục Sharpe/CMF/ER: xấu <50 điểm, bình thường 50–70, tốt >70. HMM dùng ngưỡng riêng 30–70. Không gọi 50 là trung tính cho tất cả trục. Màu, tooltip, Đọc nhanh, Radar và 3D dùng cùng một quy tắc.

### Nội suy để có điểm 0–100

Ngưỡng trên do người dùng chốt. Công thức nội suy dưới đây là lựa chọn triển khai trình bày, không phải ngưỡng thực nghiệm mới hoặc hiệu chỉnh xác suất:

- Sharpe `s<0`: `50/(1-s/2)`; `0≤s≤2`: `50+10s`; `s>2`: `70+30*(1-2/s)`. Hai đuôi tiệm cận 0/100, dùng độ rộng vùng bình thường (=2) làm hệ số tỷ lệ; không phải xếp hạng tương đối.
- CMF: nội suy tuyến tính qua (-1,0), (0,50), (0.1,70), (1,100).
- ER: nội suy tuyến tính qua (0,0), (0.3,50), (0.6,70), (1,100).
- Ba trục này làm tròn đến điểm nguyên nhưng giữ đúng vùng: giá trị dưới ngưỡng thấp không bị làm tròn lên 50; trên ngưỡng cao không bị làm tròn xuống 70. HMM, thanh khoản và trung bình Alpha giữ độ chính xác tính toán; nhãn hình hiển thị tối đa một số lẻ.
- Không khôi phục chỉ số gốc từ z-score, không dùng z-score cũ thay thế chỉ số gốc bị thiếu. Ví dụ Sharpe -0.134 cho 47 điểm, dù `research.factors.sharpe.value` cũ bằng 0.466.

## HMM và đơn vị

API hiện trả `state_probs` theo phần trăm, đủ BULL/SIDEWAY/BEAR, mỗi giá trị 0–100 và tổng 100±0.2 (dung sai làm tròn). Không tự đoán 0–1 hay nhân thêm 100. Không dùng nhãn hard state làm posterior. Fallback, output lỗi/tắt/không khả dụng hoặc `probability_kind` khác `filtered` được để trống.

Trong hợp đồng hiện tại, `state_probs` là posterior tại quan sát cuối cùng của đúng cửa sổ chạy (`predict_proba(features)[-1]` ở engine tham chiếu); tại điểm cuối không có dữ liệu tương lai để smoothing. Nhà cung cấp posterior khác phải xuất `hmm.probability_kind: 'filtered'`; không được gắn nhãn filtered cho chuỗi smoothing lịch sử hoặc xác suất dự báo phiên tiếp theo.

## Dữ liệu bổ sung cho API

Repo này không có engine hoặc dữ liệu OHLCV toàn rổ. Trường sau là **hợp đồng bổ sung tùy chọn**, chưa xác nhận đã có trên máy chủ production. Không lấy các mã trong danh sách giao diện hoặc các báo cáo chạy lần lượt để dựng một rổ giả.

```json
{
  "research": {
    "radar_scoring": {
      "schema_version": 1,
      "as_of": "2026-11-06",
      "liquidity_universe": {
        "universe_id": "tracked-universe-v1",
        "members": [
          {"symbol":"EVF","adv20_value_vnd":120000000000,"amihud20":2e-12},
          {"symbol":"FPT","adv20_value_vnd":240000000000,"amihud20":1e-12}
        ]
      },
      "module_scores": [
        {"id":"arima","score":62,"method":"published-module-rule-v1"},
        {"id":"garch","score":58,"method":"published-module-rule-v1"}
      ]
    }
  }
}
```

Đây là ví dụ cấu trúc, không phải dữ liệu hoặc quy tắc chấm ARIMA/GARCH thật.

- `as_of` phải trùng `target_session` (hoặc `research.end`, rồi ngày `data_as_of` nếu thiếu target); `research` phải đúng schema, mã và đơn vị báo cáo.
- ADV20 là trung bình giá trị giao dịch bằng VND trên 20 phiên hoàn chỉnh. Amihud20 là trung bình `abs(simple_daily_return)/daily_traded_value_vnd` trên cùng 20 phiên; lợi suất ở dạng thập phân. Upstream phải dùng cùng nguồn, đơn vị và cách xử lý phiên không giao dịch cho toàn rổ; không gửi giá trị mặc định cho mã chưa có đủ 20 quan sát.
- Rổ phải đầy đủ, có tên/version, có mã hiện tại, ít nhất hai mã duy nhất; ADV20 >0, Amihud20 ≥0 và hữu hạn. Thiếu một đầu vào thì không tính thanh khoản. Không thay bằng ADV-only hay hạng A/B/C/D.
- Phân vị dùng midrank: `100 * (count_less + (count_equal-1)/2) / (N-1)`. Đồng hạng có cùng điểm; toàn bộ bằng nhau hợp lệ cho 50. Không nhầm với trường hợp thiếu dữ liệu.

## Alpha tổng hợp và độ phủ

14 module phân tích: data_quality, liquidity, distribution, statistics, arima, garch, hmm, technical, context, directional_alpha, agreement, simulation_risk, costs, trade_plan. Loại `decision` và `commentary` vì đây là kết quả tổng hợp; không đưa Alpha vào chính nó. Mẫu số cố định độ phủ là 14, mẫu số trung bình là số module thực sự có điểm, không phải số trường số có mặt.

| Module đã có quy tắc | Điểm dùng |
|---|---|
| statistics | Sharpe đã quy đổi |
| technical | Trung bình điểm CMF và ER; cần đủ cả hai |
| hmm | Công thức filtered HMM |
| liquidity | Công thức ADV20/Amihud20 |
| costs | Điểm dự báo sau phí giữ nguyên |
| agreement | Điểm độ tin cậy giữ nguyên |
| data_quality | `data_quality.score` gốc hợp lệ trong 0–100 |

Bảy module còn lại nhận `module_scores` từ báo cáo, mỗi id đúng một lần, điểm hữu hạn trong 0–100, có `method` nêu quy tắc chuẩn hóa. Chỉ dùng khi section AVAILABLE và output mô hình có dữ liệu hợp lệ. Không tự gán good/bad cho AIC, p-value, persistence hoặc mô phỏng để lấp đủ 14 module. Điểm supplied không được ghi đè các quy tắc đã chốt ở bảng trên. Upstream cần thiết kế và công bố các quy tắc còn thiếu trước khi đạt độ phủ 14/14.

Mọi module thiếu, disabled, failed hoặc chưa có quy tắc được loại khỏi mẫu số trung bình. Điểm 0 hợp lệ vẫn tính. UI hiển thị `x/14`, ghi "tổng hợp một phần" nếu thiếu, kèm danh sách điểm từng module. Không quảng bá trung bình này là tối ưu danh mục, lợi nhuận alpha hay điểm mua.

## Kiểm chứng

Regression bao gồm EVF Sharpe âm nhưng z dương, BEAR 100%, các biên Sharpe/CMF/ER và HMM 30/70, hợp đồng HMM sai đơn vị/fallback/smoothed, đồng hạng phân vị, rổ thanh khoản sai ngày/thiếu/trùng mã, Alpha trọng số bằng nhau/điểm 0/thiếu/module lỗi/điểm trùng và render Radar/3D.

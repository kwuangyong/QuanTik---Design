# Nghiên cứu định lượng 11/2026: kiểm định nhân tố cổ phiếu VN và chiến lược VN30F

Tài liệu nghiên cứu, không phải khuyến nghị đầu tư. Mọi số liệu là backtest giả định trên dữ liệu lịch sử, có các thiên lệch nêu ở mục 5.

Orchestra: Sonnet nghiên cứu phương pháp và chạy backtest. Opus duyệt từng gate, tự viết lại code độc lập để kiểm tra các kết quả quyết định, rồi chốt hướng thuật toán.

Báo cáo đầy đủ, script và kết quả: [`research/2026-11/`](../research/2026-11/).

- [Spec phương pháp](../research/2026-11/methodology-spec.md)
- [Backtest nhân tố cổ phiếu](../research/2026-11/equity-factor-backtest.md)
- [Backtest VN30F](../research/2026-11/vn30f-strategy-backtest.md)

## 1. Dữ liệu

- **Nguồn:** API chart công khai của DNSE, cùng nhà cung cấp mà backend đang dùng (vnstock gen-6/DNSE).
  - Cổ phiếu: `/ohlcs/stock`. Chỉ số VNINDEX: `/ohlcs/index`. Phái sinh: `/ohlcs/derivative`.
  - Giá tính bằng nghìn đồng và đã điều chỉnh ngược (back-adjusted).
- **Cổ phiếu:** 1.505/1.519 mã đang niêm yết, dữ liệu ngày từ 2016-01 đến 2026-11.
- **VN30F1M/F2M:** từ 2018-10, có nến 1D, 1H, 15, 5 và 1 phút. VN30 intraday chỉ có từ 2020-05.

## 2. Chuẩn kiểm định

- Rank IC theo tuần, t Newey-West (lag 4).
- Ngưỡng t>3 theo Harvey–Liu–Zhu cho tín hiệu mới, t>2 cho tín hiệu đã đăng ký trước.
- Chia trong mẫu (IS) 2017–2020 và ngoài mẫu (OOS) 2021–2026. Walk-forward cho phái sinh.
- Deflated Sharpe Ratio (DSR) với số lần thử khai báo trung thực, PBO tính theo CSCV.
- Chi phí cổ phiếu: phí 0,15% mỗi chiều, thuế bán 0,1%, trượt giá 0,1–0,3%. Vào lệnh ở giá đóng T+1, giữ ít nhất 1 tuần.
- Chi phí VN30F: khoảng 31.400 VND mỗi vòng, tức 1 bước giá trượt mỗi chiều cộng phí.

## 3. Kết quả đã qua gate Opus

### 3.1 Nhân tố cổ phiếu

| Nhân tố | IC IS / OOS | t IS / OOS | Gate | Opus kiểm lại độc lập |
|---|---|---|---|---|
| Biến động riêng 63 phiên (thấp tốt hơn) | −0,057 / −0,064 | −5,9 / −5,3 | **Đạt t>3** | −0,062 / −0,070, t −5,0 / −4,7 ✔ |
| Amihud (thanh khoản cao tốt hơn, trong universe ≥1 tỷ) | −0,037 / −0,040 | −4,2 / −5,1 | **Đạt t>3** | — |
| MAX5, hiệu ứng "xổ số" (thấp tốt hơn) | −0,036 / −0,040 | −4,1 / −4,2 | **Đạt t>3** | — |
| Gần đỉnh 52 tuần | +0,053 / +0,031 | +4,0 / +2,3 | Đạt t>2 OOS | — |
| Tần suất chạm trần 63 phiên (thấp tốt hơn) | −0,017 / −0,017 | −2,2 / −2,4 | Chỉ đạt t>2 | — |
| Momentum 12-1, 6-1, residual momentum, trend R², MA200, CMF, đảo chiều | ≈0 | <2 OOS | **Trượt** | — |

**Kết luận:**
- Ở VN, tín hiệu mạnh và bền là **tránh cổ phiếu "xổ số"**: biến động riêng cao, hay có phiên tăng sốc, thanh khoản kém.
- **Momentum kiểu Mỹ không hoạt động ngoài mẫu.**
- Composite B (trọng số theo IC trong mẫu) có rank IC OOS 0,053, t 4,4.
- Nhóm điểm thấp nhất mất khoảng −13%/năm trước chi phí OOS. Đây là bằng chứng mạnh nhất, và phù hợp đúng với bảng "5 mã cần thận trọng".
- **Long-only sau chi phí** có lợi thế nhỏ:
  - Top decile: +3,9%/năm, Sharpe 0,29.
  - Hidden gem top-10 (hai tercile thanh khoản dưới): +9,8%/năm, Sharpe 0,59.
  - So sánh: VNINDEX +6,3%/năm; universe đồng tỷ trọng −4,1%/năm.
  - **DSR chỉ 0,16–0,51 và t vượt trội chỉ 0,7–1,0.** Chưa được gọi là alpha đã kiểm chứng.
- Bộ lọc VNINDEX > MA200 giảm drawdown trong mẫu nhưng không cải thiện Sharpe OOS. Không dùng làm lời hứa sinh lời.

### 3.2 VN30F1M

| Chiến lược | Sharpe sau phí | t NW | DSR | Gate |
|---|---|---|---|---|
| **Opening range breakout 15 phút**, dừng ở cạnh đối diện, đóng 14:25 | 1,73 (WF OOS 1,52) | 5,0 (OOS 3,8) | 0,92 | **Đạt có điều kiện**: edge suy giảm, 2024 Sharpe ≈ 0,5 |
| Momentum 30 phút đầu | 0,83 | 2,3 | 0,10 | Trượt |
| Gap fade hoặc tiếp diễn | ≈0 | — | — | Trượt |
| Basis OU/Kalman intraday | ≈0 | 0,5 | — | Trượt |
| Trend ngày / TSMOM | 0,2–0,43 (mua giữ 0,54) | ≤1,2 | ≈0 | Trượt |

**Opus kiểm lại ORB15 bằng ba cách cài đặt độc lập:**

| Cách cài đặt | Sharpe | Điểm/lệnh | Tỉ lệ thắng | Ghi chú |
|---|---|---|---|---|
| Python của Sonnet | 1,73 | 1,22 | — | |
| Python của Opus | 1,70 | 1,23 | — | |
| Engine JS của bàn phái sinh | 1,57 | 1,14 | 41,3% | Khớp ở giá đóng nến kế tiếp, chặt hơn so với giá mở |

## 4. Quyết định thuật toán (Opus)

1. **"Cổ phiếu khỏe" v3 không dùng momentum.** Spec ban đầu đề xuất `0,30·residual momentum + 0,25·trend R² + …`, nhưng dữ liệu VN bác bỏ hướng này: residual momentum có t −0,6 IS và +1,4 OOS.
2. **Strength score v3**, tính bằng z-score cắt ngang sau winsorize 1/99, trung hòa ngành khi backend có ngành:

   `S = 0,30·z(−ivol63) + 0,25·z(−MAX5) + 0,25·z(high52) + 0,10·z(−Amihud) + 0,10·z(−ceil_freq63)`

   - Trọng số là bản đăng ký trước, làm tròn từ tỉ lệ ICIR trong mẫu. Không tối ưu lại trên dữ liệu OOS.
   - Mọi thay đổi trọng số phải được tính thêm vào số lần thử của DSR.
3. **Cổng universe:**
   - ADV20 ≥ 3 tỷ VND, và ít nhất 15/20 phiên có giao dịch.
   - Giá ≥ 5.000 VND.
   - Loại mã có từ 3 phiên trần khóa trong 20 phiên.
   - UPCOM yêu cầu ADV ≥ 5 tỷ.
4. **Phân tầng hiển thị:**
   - *Đã kiểm chứng:* xếp hạng tránh (nhóm điểm thấp).
   - *Thử nghiệm:* top/hidden gem long-only.
   - *Mô tả:* các chỉ số còn lại.
   - Giao diện ghi rõ tầng của từng kết quả.
5. **Hidden gem:**
   - Thuộc tercile ADV dưới (vẫn ≥ cổng thanh khoản), S nằm trong top 10%.
   - Điểm "pump" dưới phân vị 80.
   - Sức chứa khoảng 0,6 tỷ VND mỗi mã ở mức 10% ADV.
6. **Phái sinh:** chỉ ORB15 được đưa vào bàn với nhãn "Đã kiểm định". Các mô hình khác giữ vai trò công cụ mô phỏng.
   - Quy tắc tạm dừng: t Newey-West 250 phiên < 1 hoặc kỳ vọng < 0,3 điểm/lệnh.
   - Vốn khuyến nghị cho mỗi hợp đồng: ≥ 90 triệu VND (khoảng 2,5 lần ký quỹ).
7. **Track record forward:**
   - Mỗi bản công bố screening phải được đóng băng danh sách và lợi suất 5/20 phiên sau đó.
   - Đây là bằng chứng bán hàng mạnh nhất, mạnh hơn mọi backtest.

## 5. Thiên lệch và giới hạn

- **Survivorship:** dữ liệu chỉ gồm mã đang niêm yết. Lợi suất tuyệt đối, nhất là nhóm hidden gem, bị **thổi phồng**. Phần bù "chống xổ số" có lẽ bị **đánh giá thấp**.
- Mã hủy niêm yết bị tính lợi suất 0% thay vì −100%.
- 12.165 bước nhảy qua đêm vượt 15,75% bị coi là lỗi dữ liệu.
- ADV lịch sử bị đánh giá thấp vì giá đã điều chỉnh ngược.
- Trạng thái trần/sàn khóa là giá trị xấp xỉ. Trượt giá không phụ thuộc quy mô lệnh.
- Nến 5 phút không mô phỏng được dừng lỗ trong nến. Có thể đã khám phá nhiều biến thể hơn N = 21 đã khai báo.
- Lệ phí, biên độ và ký quỹ dùng mức phổ biến; cần đối chiếu văn bản HNX/VSDC hiện hành.

## 6. Việc cho backend (quantik-server)

Không làm trong PR frontend này. Đây là đề xuất cho backend.

1. Thêm các nhân tố ở mục 4.2 vào pipeline screening, cùng phiên bản `policy` mới và cổng universe ở mục 4.3.
2. Lưu `strength_score`, `tier` (VERIFIED/EXPERIMENTAL/DESCRIPTIVE) và từng z thành phần vào payload `ScreeningResult`. Frontend sẽ hiển thị khi các trường xuất hiện, không cần endpoint mới.
3. Job track record: đóng băng top/avoid mỗi lần công bố và tính lợi suất forward 5/20 phiên. Nên công khai sau ít nhất 3 tháng.
4. HMM: trả `probability_kind` (`filtered`) và refit theo cửa sổ mở rộng. Hiện backend không trả trường này, nên frontend không thể bắt buộc.

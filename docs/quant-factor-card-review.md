# Rà soát card Hồ sơ nhân tố

Phạm vi: giao diện React/SVG/CSS và diễn giải từ số liệu đã có. Không sửa backend, mô hình, cách tính nhân tố, backtest, chi phí, quyết định hoặc nguồn dữ liệu.

## Khám phá và thay đổi

Trước: `quant-research.tsx` tự vẽ radar SVG và bọc card bằng `Panel`; `quant-factors.ts` chọn 9 nhân tố; `quant-report-views.tsx` dựng cột bằng DOM/CSS 3D. Không có thư viện radar bên ngoài và không có renderer WebGL.

Sau: card riêng `QuantFactorProfile`, hiển thị toàn chiều rộng vùng biểu đồ. Một ghi chú thang duy nhất, Radar mặc định, Đọc nhanh ngay dưới hình, rồi 9 thẻ theo bốn nhóm. Mỗi thẻ có điểm lớn, badge màu kèm ký hiệu, thanh mốc 50, câu đo lường và hai câu diễn giải. Giá trị nguồn chỉ mở qua tooltip; bỏ bảng/list số nguồn và các dòng phạm vi lặp lại. Hover hoặc focus thẻ và đỉnh dùng chung nhân tố đang chọn.

Radar có mốc 0 ở tâm, vòng 50 nét đứt và vòng 100; mỗi đỉnh có điểm, màu và ký hiệu. Nhãn chữ sáng, chia dòng. Vị trí callout được giãn khi các điểm gần nhau hoặc cùng bằng 0. Trên màn hình hẹp, vùng hình cuộn ngang để giữ nguyên chữ tối thiểu 13px, thay vì ép nhỏ nhãn.

## Điểm hiển thị, ngưỡng và chiều

Điểm = round((value − min) / (max − min) × 100), chỉ khi số nguồn hữu hạn, phạm vi hợp lệ và giá trị nằm trong phạm vi. Với [-1;1], công thức tương đương round((value + 1) / 2 × 100). Không tính lại hoặc ghi đè giá trị nguồn. Thiếu/không hợp lệ giữ điểm null, không thay bằng 0 hoặc 50.

Mốc chung: ≥70 = ▲ Mạnh; 50–69 = ▬ Vừa; <50 = ▼ Yếu. Đây là mốc diễn giải giao diện, không là cổng giao dịch hay xác suất có lãi. Bảng ngưỡng, ý nghĩa và câu theo từng mức nằm trong `quant-factor-readings.ts`.

| Nhân tố, theo thứ tự trên hình | Nhóm | Chiều thuận lợi đã kiểm tra | Phạm vi hợp đồng tham chiếu |
|---|---|---|---|
| Sharpe | Hiệu quả | Cao hơn: lợi nhuận điều chỉnh biến động thuận lợi hơn tương đối | [-1;1] |
| Dòng tiền | Hiệu quả | Cao hơn: nhân tố CMF thuận lợi hơn tương đối | [-1;1] |
| Alpha tổng hợp | Hiệu quả | Cao hơn: alpha nguồn thuận lợi hơn tương đối | [-1;1] |
| Dự báo sau phí | Dự báo | Cao hơn: dự báo ròng thuận lợi hơn tương đối | [-1;1] |
| Độ tin cậy dự báo | Dự báo | Cao hơn: chỉ tiêu tin cậy/hỗ trợ nguồn thuận lợi hơn tương đối | [-1;1] |
| Chất lượng xu hướng | Trạng thái | Cao hơn: ER nhân dấu độ dốc thuận lợi hơn trước chuẩn hóa | [-1;1] |
| Trạng thái HMM | Trạng thái | Cao hơn: trạng thái có hướng thuận lợi hơn trước chuẩn hóa | [-1;1] |
| Trạng thái biến động | Trạng thái | Cao hơn đã thuận lợi: nguồn dùng 1 − vol_ratio trước chuẩn hóa; không đảo thêm | [-1;1] |
| Thanh khoản | Thực thi | Cao hơn: hạng thanh khoản nguồn thuận lợi hơn trước chuẩn hóa | [-1;1] |

Bằng chứng chiều: `QuanTik-website/backend/quant_engine/quant.py`, `AdaptiveScorer.extract_factors` và vòng tạo `factor_details`. `backend/quant_service.py` xuất `factor_details[*].z` cùng min=-1, max=1. Vì vậy các giá trị đang đọc là **nhân tố đã chuẩn hóa tương đối**, không phải Sharpe/CMF/vol_ratio hoặc xác suất gốc. Không suy từ z âm rằng vol_ratio chắc chắn >1, cũng không suy từ thanh khoản 90 rằng chắc chắn khớp đủ lệnh và ít trượt giá.

Không có chiều nào bị đoán hoặc đảo dấu. Bằng chứng trên thuộc checkout tham chiếu đã đọc; chưa xác minh phản hồi API của máy chủ sản xuất trong phiên này. Nếu máy chủ sử dụng hợp đồng khác, cần đối chiếu hợp đồng đó. Bộ quy đổi đã kiểm tra với phạm vi [0;4]: value=2 hiển thị 50. Chưa gặp phạm vi khác trong hợp đồng tham chiếu hiện có.

## Sinh Đọc nhanh

Chỉ xếp thứ tự các điểm hợp lệ, lấy hai nhân tố cao nhất và thấp nhất, đếm các nhân tố dưới 50 và số thiếu. Kiểm tra cặp dự báo sau phí ≥70 nhưng độ tin cậy <70. Chọn câu theo ngưỡng, gắn khái niệm đo lường vào câu, nối bằng “tuy nhiên/dù vậy”, kết bằng đúng một câu hàm ý. Không tạo điểm trung bình, tổng hợp, điểm mua hoặc hành động mua/bán mới.

| Bộ dữ liệu kiểm tra | Có dữ liệu | Dưới 50 | Phát hiện cặp dự báo/tin cậy |
|---|---:|---:|---|
| Đủ 9 nhân tố | 9/9 | 1 | Có: 78 so với 65 |
| Thiếu 3 nhân tố | 6/9 | 1 | Không suy cặp khi thiếu độ tin cậy |
| Nhiều nhân tố yếu | 9/9 | 8 | Có: 75 so với 30 |

Bộ đủ dữ liệu: Thanh khoản 90, HMM 84 đứng đầu; biến động 40 thấp nhất; dự báo sau phí 78 đi cùng tin cậy 65. Câu diễn giải yêu cầu đối chiếu độ phủ và rủi ro, không xác nhận mua. Chi tiết đầu ra được lưu trong `quant-factor-review-cases.json`.

## Tab 3D

Giữ để người dùng quyết định, không tự xóa. Cùng điểm và màu với Radar; có mặt phẳng 50, tên và ký hiệu số trên cột. Tự xoay nhẹ bằng rAF/delta-time, giới hạn cập nhật khoảng 30fps, dừng khi ngoài viewport/tab ẩn hoặc khi tương tác, tôn trọng reduced-motion và dọn rAF/observer/listener lúc hủy. Đây là DOM/CSS 3D, không có canvas/WebGL hay tài nguyên renderer để dispose; giới hạn DPR không áp dụng cho DOM. Các canvas Quant khác giữ giới hạn DPR ≤2 đã có.

Đề xuất sản phẩm: Radar mặc định để đọc nhanh; 3D chỉ là tab phụ. Chờ người dùng chốt giữ/bỏ tab này.

## Kiểm chứng và hình ảnh

- Bộ kiểm thử Node: 40/40 qua; 7 kiểm thử liên quan được chạy lại sau vòng chỉnh cuối và đều qua. Typecheck và build production qua.
- Có kiểm tra mốc 49/50/69/70, 0 nguồn →50, làm tròn 0,67→84, -0,2 biến động→40, miền khác nguồn, không đổi đầu vào và xử lý thiếu/ngoài phạm vi.
- Server render: đúng một ghi chú thang, 9 thẻ, 9 câu đo lường và diễn giải; đủ dữ liệu có 9 điểm số; chỉ ba mốc tham chiếu; không có chữ “miền” hoặc giá trị nguồn trong HTML mặc định; 3D có 9 cột và mốc 50.
- Callout được kiểm thử không chồng nhau với dữ liệu đủ, tất cả điểm 0, tất cả điểm 50 và nhiều điểm sát nhau.
- Script computed style: `frontend/tests/helpers/quant-ui-audit.ts`, gồm chữ SVG theo CTM và font canvas. Browser spec mở tooltip, kiểm tra hover hai chiều, đổi tab và reduced-motion; có lệnh chụp `quant-factor-card-after.png` khi chạy trên môi trường trình duyệt hoạt động.
- **Chưa chạy được nghiệm thu trình duyệt, computed-style thực tế, ảnh chụp website hoặc profile hiệu năng trong phiên này** do lỗi hạ tầng trình duyệt đã ghi nhận. Không coi rà nguồn/server-render là kết quả computed style.
- Bản kiểm tra hình học radar được xuất trực tiếp từ SVG component và render tĩnh tại `assets/quant-factor-radar-after-static.png`; đã xem để rà nhãn và điểm. **Đây không phải ảnh chụp website**, không xác nhận font thực tế của trình duyệt hay tương tác. Ảnh trước là các ảnh người dùng đã gửi trong luồng; chưa có cặp screenshot website trước/sau mới.

## Tệp sửa

| Tệp | Mục đích |
|---|---|
| frontend/src/components/quant-factor-profile.tsx | Card, thẻ, hover/focus, tooltip nguồn, Đọc nhanh |
| frontend/src/components/quant-factor-profile.module.css | Typography, màu mức, nhóm, responsive, 3D |
| frontend/src/components/quant-factor-radar.tsx | Ba mốc, điểm/ký hiệu tại đỉnh, nhóm ngoài rìa |
| frontend/src/components/quant-factor-3d.tsx | Cùng điểm số, mặt phẳng 50, vòng lặp chuyển động và dọn tài nguyên |
| frontend/src/lib/quant-factor-readings.ts | Ngưỡng, ý nghĩa, chiều và câu mẫu theo từng nhân tố; tổng kết động |
| frontend/src/lib/quant-factor-radar-layout.ts | Tách các nhãn điểm gần nhau, không sửa số liệu |
| frontend/src/lib/quant-factors.ts | Điểm hiển thị nguyên theo min/max nguồn, thứ tự bốn nhóm |
| frontend/preview/quant-reader.tsx | Thêm góc xem riêng card qua ?view=factors để duyệt nhanh; giữ nguyên dữ liệu mẫu và báo cáo đầy đủ |
| frontend/src/components/quant-research.tsx | Thay card/list cũ bằng card mới |
| frontend/src/components/quant-report-views.tsx | Bỏ renderer nhân tố cũ, giữ nguyên GARCH |
| frontend/src/components/quant-module-evidence.tsx | Dùng component nhân tố chung ở đường render tham chiếu |
| frontend/tests/helpers/quant-ui-audit.ts | Thêm card vào truy vấn, kiểm tra font canvas |
| frontend/tests/quant-modules.spec.ts | Tooltip mới, hover, ba mốc, 3D/reduced-motion và chụp ảnh khi có browser |
| tests/quant-factor-catalog.test.cjs | Cập nhật nghiệm thu chín nhân tố và dữ liệu thiếu |
| tests/quant-factor-readings.test.cjs | Quy đổi, ba bộ dữ liệu, câu theo ngưỡng, callout và HTML card |
| docs/quant-factor-review-cases.json | Đầu ra thực của ba bộ kiểm tra |
| docs/quant-factor-card-review.md | Bằng chứng, bảng chiều/ngưỡng và giới hạn nghiệm thu |
| docs/assets/quant-factor-radar-after-static.png | Bản render SVG tĩnh để kiểm tra hình học |

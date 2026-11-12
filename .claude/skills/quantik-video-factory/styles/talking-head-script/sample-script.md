# Kịch bản quay — hmm-talking-head-script

**Chủ đề:** HMM · **Thời lượng dự kiến:** 52s · **Khung:** dọc 9:16, mặt ở 1/3 trên, chữ không che mặt

| Thời điểm | Đoạn | Lời thoại | Hình / ghi chú quay |
| --- | --- | --- | --- |
|    0–5s | **hook** | Bạn không nhìn thấy trạng thái thị trường. Nhưng có thể tính xác suất của nó. | Nhìn thẳng camera, nói nhanh, không chào hỏi. |
|    5–16s | **beat1** | Code mô phỏng 600 phiên chuyển qua lại giữa ba trạng thái: tăng, giảm, đi ngang. Rồi một bộ lọc tiến tính xác suất từng trạng thái, chỉ dùng dữ liệu đến hôm đó. | Cắt sang B-roll: công thức / code (broll/formula.png). |
|   16–23s | **beat2** | Phiên cuối: xác suất trạng thái tăng là 88%, giảm 3%, đi ngang 10%. Trạng thái tăng kéo dài trung bình 33 phiên. | Nửa khung là mặt, nửa khung là số liệu (broll/chart.png). |
|   23–31s | **beat3** | Màu xanh, vàng, đỏ là xác suất ba trạng thái theo thời gian. Bộ lọc đoán đúng trạng thái thật 78% số phiên. | B-roll: chart (broll/chart.png), chỉ tay theo đường cam. |
|   31–39s | **beat4** | Trong 3D, mỗi điểm là bộ ba xác suất của một phiên. Chuỗi điểm nhảy giữa các góc khi thị trường đổi trạng thái. | B-roll: 3D xoay (broll/surface3d.png) hoặc ghép từ bản code-reel. |
|   39–47s | **takeaway** | Xác suất 88% là xác suất trạng thái của mô hình, không phải xác suất giá tăng. Đọc đúng thì HMM giúp đổi chiến lược theo bối cảnh. | Quay lại mặt, chậm lại, nhấn câu cuối. |
|   47–52s | **cta** | QuanTik dùng HMM filtered trong phân tích Quant — xem tại quantik.io.vn | Chỉ xuống caption / link. Câu miễn trừ đã có trong caption. |

## Chuẩn bị

- Mở `teleprompter.mp4` trên máy tính bảng / điện thoại đặt sát ống kính.
- B-roll trong `broll/`: công thức, chart, 3D — đều tính từ cùng code với số trong lời thoại.
- Đọc đúng số trên kịch bản; đổi số nghĩa là phải chạy lại pipeline (qa/check_numbers.py).
- Thẻ cuối: logo QuanTik + câu miễn trừ (có thể lấy `thumbnail.jpg` của bản code-reel cùng chủ đề).

## Câu miễn trừ (đọc hoặc để chữ ở thẻ cuối)

Nội dung giáo dục về phương pháp định lượng, không phải khuyến nghị mua bán chứng khoán. Kết quả mô hình phụ thuộc giả định và dữ liệu; hiệu suất quá khứ không đảm bảo tương lai.

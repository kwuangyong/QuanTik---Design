// Reading notes retained from the approved full-report preview.
export const moduleEvidenceReadings: Record<string,[string,string]> = {
  "statistics": [
    "Tổn thất đã xảy ra",
    "Đồ thị sụt giảm phản ánh mất mát so với đỉnh lịch sử. Đọc Sharpe cùng lợi suất và sụt giảm tối đa để thấy cả hiệu quả lẫn mặt rủi ro."
  ],
  "distribution": [
    "Hình dạng lợi suất quan sát",
    "Histogram được chia nhóm từ chuỗi giá đóng cửa đã công bố. Độ lệch và đuôi dày cần đọc cùng kết luận kiểm định; đây là lịch sử, khác phân phối Monte Carlo tương lai."
  ],
  "arima": [
    "Chẩn đoán và dự báo riêng",
    "Đường dự báo chỉ xuất hiện khi báo cáo công bố chuỗi forecast ARIMA. AIC/BIC là tiêu chí chọn trong mẫu; ADF kiểm tra tính dừng. Chúng không thay cho forecast tổng hợp hoặc action gate."
  ],
  "garch": [
    "Rủi ro biến động, không phải hướng giá",
    "Đường 2D là σ dự báo theo phiên. Mặt 3D giải thích phản ứng phương sai theo tham số đã fit; không phải tập đường giá mô phỏng. α/β của GARCH và γ của EGARCH thuộc hai mô hình riêng."
  ],
  "hmm": [
    "Đọc ba trạng thái cùng nhau",
    "Các thanh mô tả xác suất trạng thái hiện tại. Lịch sử màu thể hiện nhãn do báo cáo công bố, không phải xác suất lịch sử. Nếu dùng fallback, đọc giới hạn của phương pháp thay thế."
  ],
  "technical": [
    "Tách hướng và chất lượng",
    "CMF có dấu, đo áp lực giá–khối lượng. ER và R² không có dấu hướng: xu hướng giảm đều cũng có thể đạt giá trị cao. Đọc thêm độ dốc và RS20 trước khi kết luận."
  ],
  "context": [
    "Đặt mã trong rổ ngành",
    "Nhãn ngành và xu hướng được giữ từ báo cáo. Tương quan trung bình đo mức đồng biến giữa các mã, không phải xác suất ngành tăng hoặc beta của mã với VN-Index."
  ],
  "agreement": [
    "Nhất quán phải đi cùng độ phủ",
    "Đồng thuận và độ phủ là hai phép đo khác nhau. Đồng thuận cao nhưng độ phủ thấp vẫn có ít bằng chứng tham gia. Các thanh không phải xác suất giao dịch thắng."
  ],
  "simulation_risk": [
    "Phân vị không phải đường giá chắc chắn",
    "Dải giá mô tả phân bố theo phiên; histogram mô tả lợi suất cuối horizon. Rủi ro khi chờ cổ phiếu về được xét riêng. Không dùng xác suất tăng cuối kỳ làm xác suất TP chạm trước SL."
  ],
  "costs": [
    "Lợi thế còn lại sau chi phí",
    "Đọc lần lượt dự báo gộp, chi phí hai chiều và dự báo ròng. Chi phí có thể làm dự báo ròng âm; kết quả ròng dương vẫn cần qua các cổng rủi ro và thực thi."
  ],
  "trade_plan": [
    "Một kế hoạch có điều kiện",
    "Khoảng giá cho thấy vị trí tương đối của SL, Entry và hai mục tiêu. Số cổ phiếu, giá trị vị thế và lỗ tại SL phải được đọc cùng loại vốn, Kelly và giới hạn thanh khoản ở khối hành động."
  ],
  "liquidity": [
    "Quy mô phải phù hợp sức giao dịch",
    "Tỷ lệ 5/20 so mức giao dịch gần đây với nền 20 phiên; mốc 1 là bằng nhau. Đọc cùng giá trị giao dịch bình quân và sức chứa; tỷ lệ lớn không tự xác nhận lực mua."
  ],
  "data_quality": [
    "Kiểm tra trước khi tin tín hiệu",
    "Điểm dữ liệu mô tả chất lượng đầu vào, khác điểm Quant. Đọc trạng thái kiểm tra và mọi cảnh báo của báo cáo; không lấy điểm cao để bỏ qua một cổng bị chặn."
  ],
  "decision": [
    "Giữ kết luận của báo cáo",
    "Các ô điều kiện bên cạnh hiển thị đúng cờ được công bố. Giao diện không tự nâng hành động khi forecast dương hoặc điểm cao; lý do chặn vẫn phải được giữ nguyên."
  ],
  "commentary": [
    "Xâu chuỗi bằng chứng",
    "Hồ sơ nhân tố giúp đối chiếu các trục đã công bố với nhận định của báo cáo. Mỗi trục có miền riêng; hình dạng radar hay cột 3D không phải xác suất hoặc điểm mua tổng hợp."
  ]
};

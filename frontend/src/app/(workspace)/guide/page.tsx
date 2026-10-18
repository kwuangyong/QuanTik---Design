import { PageHeading } from "@/components/ui";
export default function Page() {
  return <><PageHeading title="Hướng dẫn" description="Bắt đầu hành trình đầu tư cùng dữ liệu."/><div className="website-guide-grid">{[
    ["01", "Đọc bảng giá", "Giá hiển thị theo nghìn đồng, khối lượng theo cổ phiếu. Xanh là tăng, đỏ là giảm, vàng là tham chiếu, tím là trần và xanh lam là sàn."],
    ["02", "Tạo danh sách theo dõi", "Bấm ngôi sao cạnh mã cổ phiếu rồi mở trang Theo dõi. Danh sách được lưu trên trình duyệt của bạn."],
    ["03", "Khám phá một cổ phiếu", "Chọn mã để mở cửa sổ biểu đồ. Dữ liệu mẫu luôn được ghi nhãn; bạn có thể mở dữ liệu thật trên TradingView."],
    ["04", "Chạy phân tích Quant", "Đăng nhập, chọn mã và phiên, kiểm tra yêu cầu trước khi gửi. Theo dõi tiến độ và đọc báo cáo trong panel cạnh biểu đồ hoặc ở trang Phân tích Quant."],
  ].map(([number, title, description]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></article>)}</div></>;
}

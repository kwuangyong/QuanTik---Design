// Early-access benefits for paid (Pro) plans. Roadmap items are labelled; dates are announced in-app.
export type PerkStatus = "beta" | "soon";
export type ProPerk = { id: "portfolio" | "options" | "index-futures" | "futures" | "warrants"; name: string; short: string; description: string; status: PerkStatus; href?: string };

export const perkStatusLabel: Record<PerkStatus, string> = { beta: "Bản thử nghiệm", soon: "Sắp ra mắt" };

export const proPerks: ProPerk[] = [
  { id: "portfolio", name: "Portfolio Intelligence", short: "Danh mục", status: "beta", href: "/portfolio",
    description: "Tương quan, đóng góp rủi ro, mô phỏng kịch bản và kế hoạch giảm vị thế cho cả danh mục." },
  { id: "options", name: "Định giá quyền chọn", short: "Options", status: "soon",
    description: "Giá lý thuyết, Greeks và bề mặt biến động hàm ý theo giá thực hiện và kỳ hạn." },
  { id: "index-futures", name: "Phái sinh chỉ số VN30F", short: "Phái sinh", status: "soon",
    description: "Basis giữa hợp đồng và VN30, rủi ro đòn bẩy theo ký quỹ và kịch bản đáo hạn." },
  { id: "futures", name: "Hợp đồng tương lai", short: "Futures", status: "soon",
    description: "Cấu trúc kỳ hạn, chi phí roll và phân phối lãi/lỗ theo từng kỳ đáo hạn." },
  { id: "warrants", name: "Chứng quyền có bảo đảm", short: "Chứng quyền", status: "soon",
    description: "Giá trị hợp lý, độ nhạy và điểm hòa vốn của chứng quyền theo cổ phiếu cơ sở." },
];

export const proPerksNote = "Gói Pro được mở sớm mọi mô hình mới ngay khi ra mắt. Lộ trình có thể thay đổi; thời điểm ra mắt được thông báo trong ứng dụng.";

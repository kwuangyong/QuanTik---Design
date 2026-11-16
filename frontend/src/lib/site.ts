export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://quantik.io.vn").replace(/\/$/, "");
export const siteName = "QuanTik";
export const siteDescription = "Kiểm định một cổ phiếu Việt Nam qua 9 lớp bằng chứng định lượng: dữ liệu, thanh khoản, xu hướng, rủi ro và điều kiện hành động — trước khi bạn xuống tiền.";
export const siteTitle = `${siteName} — Kiểm định cổ phiếu trước khi xuống tiền`;
export const openGraphBase = { type: "website" as const, locale: "vi_VN", siteName, title: siteTitle, description: siteDescription };

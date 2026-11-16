import type { Metadata } from "next";
import { PlansPage } from "@/components/account/customer";
import { openGraphBase, siteName } from "@/lib/site";

const description = "Bảng giá QuanTik: gói phân tích theo thời hạn, hạn mức lượt phân tích mỗi ngày, thanh toán chuyển khoản QR và tự kích hoạt.";
export const metadata: Metadata = {
  title: "Bảng giá",
  description,
  alternates: { canonical: "/plans" },
  openGraph: { ...openGraphBase, url: "/plans", title: `Bảng giá · ${siteName}`, description },
};
export default function Page() { return <PlansPage />; }

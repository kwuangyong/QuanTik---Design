"use client";
import { accountStyles } from "@/components/account/styles";
import Link from "next/link";
import { Guard, useSession } from "../account/session";
import { PageHeading, Panel } from "../ui";
import { IntegrationsPage } from "./integrations";
import { ConfigurationPage } from "./configuration";
import { AdminPaymentsPage, AuditPage, JobsPage, ReconciliationPage, TasksPage, UsersPage } from "./management";
import { AdminPlansPage, AdminOrdersPage } from "./billing";
import { DemoPage } from "./demo";
const pages = [
    ["orders", "Đơn hàng", "Tra cứu đơn, khách hàng, giao dịch và kỳ gói."],
    ["users", "Người dùng", "Khóa, mở và tra cứu tài khoản."],
    ["plans", "Gói dịch vụ", "Tạo phiên bản gói và quản lý mở bán."],
    ["payments", "Giao dịch", "Theo dõi thanh toán đã ghi nhận."],
    ["reconciliation", "Đối soát", "Xử lý giao dịch cần ghép đơn."],
    ["config/integrations", "Tích hợp", "Thông tin nhận tiền SePay và key Vnstock."],
    ["config/operations", "Vận hành", "Quản lý phiên bản policy tự động."],
    ["config/calendar", "Lịch giao dịch", "Phiên giao dịch và nguồn tham chiếu."],
    ["audit", "Nhật ký", "Lịch sử thao tác quản trị."],
    ["demo", "Tài khoản demo", "Cấp mã, đăng nhập và reset tài khoản demo cho máy booth triển lãm."],
];
function Overview() {
    const session = useSession("admin");
    return <><PageHeading title="Quản trị QuanTik"/><p>Đang đăng nhập: <strong>{session.profile?.username || session.profile?.id}</strong></p><div className="account-grid grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] [gap:20px] [margin:20px_0]">{pages.map(([path, title, description]) => <Link key={path} className="panel account-card account-admin-link [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] [color:inherit] [text-decoration:none] [transition:border-color_.2s] [&:hover]:[border-color:var(--accent)] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden" href={`/admin/${path}`}><h2>{title} ↗</h2><p>{description}</p></Link>)}</div><Panel title="Theo dõi vận hành"><div className="account-card account-actions [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] flex items-center flex-wrap [gap:12px] [margin:18px_0] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px]"><Link className={accountStyles.buttonSecondary} href="/admin/jobs">Yêu cầu phân tích</Link><Link className={accountStyles.buttonSecondary} href="/admin/subscriptions">Các kỳ gói</Link><Link className={accountStyles.buttonSecondary} href="/admin/scheduled-tasks">Tác vụ theo lịch</Link></div></Panel></>;
}
export function AdminConsole({ section }: {
    section: string;
}) {
    const views: Record<string, React.ReactNode> = {
        "": <Overview />, users: <UsersPage />, plans: <AdminPlansPage />, orders: <AdminOrdersPage />, payments: <AdminPaymentsPage />,
        subscriptions: <AdminPaymentsPage subscription/>, reconciliation: <ReconciliationPage />,
        "config/integrations": <IntegrationsPage />, "config/operations": <ConfigurationPage key="operations"/>,
        "config/calendar": <ConfigurationPage key="calendar" calendar/>, audit: <AuditPage />, "scheduled-tasks": <TasksPage />, jobs: <JobsPage />, demo: <DemoPage />,
    };
    return <Guard role="admin">{views[section] || <><h1>Không tìm thấy màn quản trị</h1><Link href="/admin">Về quản trị</Link></>}</Guard>;
}

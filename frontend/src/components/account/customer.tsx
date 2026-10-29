"use client";
import { accountStyles } from "@/components/account/styles";
import { launchOffer } from "@/lib/launch-offer";
import { rememberPurchase, clearPurchase } from "@/lib/purchase-intent";
import { tw } from "@/lib/tailwind";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, mutation } from "@/lib/api/client";
import { money, stamp, dailyLimit, paymentStatus, paymentReason, type Bucket, type Entitlement, type Order, type Plan, type Page, type Subscription } from "@/lib/api/contracts";
import { PageHeading, Panel } from "../ui";
import { Guard, loadSession, useSession } from "./session";
import { ProfileForm } from "./profile";
import { Confirm, ErrorNotice, PagedTable, ResourceState, useResource, type Column } from "./common";
const dateColumn = (key: string, label: string): Column => ({ key, label, render: value => stamp(value as number | null) });
const orderColumns: Column[] = [{ key: "reference", label: "Mã đơn" }, { key: "amount_vnd", label: "Số tiền", render: value => money(Number(value)) }, { key: "status", label: "Trạng thái", render: value => orderStatus(String(value)) }, dateColumn("created_at", "Tạo lúc"), dateColumn("expires_at", "Hạn thanh toán")];
export function orderStatus(value: string) { return ({ PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", EXPIRED: "Hết hạn", CANCELLED: "Đã hủy" } as Record<string, string>)[value] || value; }
function periodStatus(from: number, until: number) {
    const now = Date.now() / 1000;
    return now < from ? "Sắp tới" : now >= until ? "Đã kết thúc" : "Đang hiệu lực";
}
export function AccountPage() { return <Guard><Account /></Guard>; }
function Account() {
    const session = useSession("user");
    const [editing, setEditing] = useState(false);
    const rights = useResource<Entitlement>("me/entitlements");
    const usage = useResource<{
        buckets: Bucket[];
    }>("me/usage");
    return <><PageHeading title="Tài khoản"><Link className={accountStyles.buttonPrimary} href="/plans">Xem các gói</Link></PageHeading>
    <div className="account-grid grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] [gap:20px] [margin:20px_0]"><Panel title="Thông tin tài khoản"><div className={accountStyles.card}><h2>{session.profile?.display_name || "Tài khoản của bạn"}</h2><dl className={accountStyles.facts}><div><dt>Email</dt><dd>{session.profile?.email || "Chưa có email được xác minh"}</dd></div><div><dt>Ngày sinh</dt><dd>{session.profile?.date_of_birth || "Chưa bổ sung"}</dd></div><div><dt>Tuổi</dt><dd>{session.profile?.age ?? "—"}</dd></div><div><dt>Số điện thoại</dt><dd>{session.profile?.phone_number || "Chưa bổ sung"}</dd></div><div><dt>Phương thức đăng nhập</dt><dd>Google</dd></div></dl>{(!session.profile?.display_name || !session.profile?.email) && <p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Đăng xuất và đăng nhập Google lại để cập nhật thông tin tài khoản.</p>}{editing && session.profile ? <><ProfileForm profile={session.profile} onSaved={() => setEditing(false)}/><button className={accountStyles.buttonSecondary} onClick={() => setEditing(false)}>Đóng chỉnh sửa</button></> : <button className={accountStyles.buttonSecondary} onClick={() => setEditing(true)}>Cập nhật thông tin</button>}<details><summary>Mã tài khoản</summary><code className="account-id [overflow-wrap:anywhere] [font-size:12px]">{session.profile?.id}</code></details><p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Danh sách theo dõi và giao diện đang lưu trên thiết bị này.</p></div></Panel>
    <Panel title="Quyền sử dụng"><div className={accountStyles.card}><ResourceState {...rights} retry={rights.reload}/>{rights.data && <><h2>{rights.data.active ? rights.data.plan?.name || "Gói đang có hiệu lực" : "Chưa có gói hiệu lực"}</h2><dl className={accountStyles.facts}><div><dt>Yêu cầu còn lại hôm nay</dt><dd>{rights.data.remaining}</dd></div><div><dt>Giới hạn yêu cầu đồng thời</dt><dd>{rights.data.active_limit}</dd></div><div><dt>Gói có hiệu lực đến</dt><dd>{stamp(rights.data.valid_until)}</dd></div></dl>{rights.data.next_subscription && <p className="my-3 text-sm leading-7">Kỳ tiếp theo: {rights.data.next_subscription.plan?.name} · bắt đầu {stamp(rights.data.next_subscription.valid_from)}.</p>}{rights.data.active && <p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Mỗi yêu cầu được nhận thành công tính vào hạn mức ngày. Đặt lại lúc 00:00 giờ Việt Nam.</p>}</>}</div></Panel></div>
    <Panel title="Lịch sử yêu cầu theo ngày"><details className="p-5"><summary className="cursor-pointer text-sm text-[var(--accent)]">Xem lịch sử theo ngày</summary><div className={accountStyles.card}><ResourceState {...usage} retry={usage.reload}/>{usage.data && <div className={accountStyles.table}><table><thead><tr><th>Kỳ sử dụng</th><th>Trạng thái</th><th>Giới hạn/ngày</th><th>Đã tạo</th><th>Còn lại</th><th>Yêu cầu đang hoạt động</th></tr></thead><tbody>{usage.data.buckets.map(b => <tr key={b.id}><td>{stamp(b.valid_from)} → {stamp(b.valid_until)}</td><td>{periodStatus(b.valid_from, b.valid_until)}</td><td>{b.total}</td><td>{b.created ?? b.consumed + b.reserved}</td><td>{Math.max(0, b.total - (b.created ?? b.consumed + b.reserved))}</td><td>{b.active_jobs}/{b.active_limit}</td></tr>)}</tbody></table>{!usage.data.buckets.length && <p>Chưa có lịch sử.</p>}</div>}</div></details></Panel>
    <Panel title="Các kỳ gói" className="mt-5"><details className="p-5"><summary className="cursor-pointer text-sm text-[var(--accent)]">Xem các kỳ sử dụng</summary><div className={accountStyles.card}><PagedTable path="subscription" role="user" columns={[{ key: "plan", label: "Gói", render: value => (value as Plan | undefined)?.name || "Thông tin gói cũ" }, { key: "period", label: "Trạng thái", render: (_, row) => periodStatus(Number(row.valid_from), Number(row.valid_until)) }, dateColumn("valid_from", "Bắt đầu"), dateColumn("valid_until", "Kết thúc")]} action={row => row.order_id ? <Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href={`/orders/${row.order_id}`}>Xem đơn →</Link> : <span className="text-xs text-[var(--muted)]">Cấp khi đăng ký</span>}/></div></details></Panel>
    <div className={accountStyles.actions}><Link className={accountStyles.buttonSecondary} href="/account/orders">Lịch sử đơn hàng</Link><Link className={accountStyles.buttonSecondary} href="/account/payments">Lịch sử giao dịch</Link></div>
  </>;
}
export function PlansPage() {
    const result = useResource<{
        payments_enabled: boolean;
        items: Plan[];
    }>("plans", "public");
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === "visible") result.reload(); };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
    }, [result.reload]);
    return <><PageHeading title="Gói phân tích" description="Gói có hiệu lực theo thời hạn, giới hạn số yêu cầu mỗi ngày. Mua tiếp sẽ nối sau các kỳ đã mua."></PageHeading><ResourceState {...result} retry={result.reload}/>{result.data && <>{!result.data.payments_enabled && <p className="account-notice [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px]" role="status">Thanh toán hiện đang tạm đóng. Bạn vẫn có thể xem các gói được công bố.</p>}<div className="account-grid grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] [gap:20px] [margin:20px_0]">{result.data.items.map(plan => <PlanCard key={plan.id} plan={plan} enabled={result.data!.payments_enabled}/>)}</div>{!result.data.items.length && <Panel title="Gói dịch vụ đang được cập nhật"><div className="space-y-3 p-6 text-sm leading-7"><p>Hiện chưa có gói được công bố. Danh sách sẽ xuất hiện tại đây khi gói được mở bán.</p><p>Các gói bạn đã mua vẫn được quản lý trong tài khoản.</p><Link className="text-[var(--accent)] underline" href="/account">Xem tài khoản và các kỳ gói →</Link></div></Panel>}</>}</>;
}
function PlanCard({ plan, enabled }: {
    plan: Plan;
    enabled: boolean;
}) {
    const session = useSession("user"), router = useRouter();
    const discounted = launchOffer.enabled && plan.price_vnd === launchOffer.priceVnd;
    const [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null);
    const key = useRef<string | null>(null);
    const card = useRef<HTMLElement>(null);
    useEffect(() => { if (new URLSearchParams(location.search).get("selected") === plan.id) { card.current?.scrollIntoView({ behavior: "smooth", block: "center" }); card.current?.focus({ preventScroll: true }); } }, [plan.id]);
    async function buy() {
        if (busy || !enabled)
            return;
        if (session.state !== "ready" || !session.profile) { setError(new Error("Vui lòng đăng nhập lại để tạo đơn.")); return; }
        setBusy(true);
        setError(null);
        const storageKey = `quantik.order.intent.${session.profile!.id}.${plan.id}`;
        // Persist only an opaque request key, so a timeout followed by reload can retry safely.
        if (!key.current) {
            try {
                key.current = sessionStorage.getItem(storageKey);
            }
            catch { /* Storage may be disabled. */ }
        }
        key.current ??= crypto.randomUUID();
        try {
            sessionStorage.setItem(storageKey, key.current);
        }
        catch { /* In-memory fallback. */ }
        try {
            const order = await api<Order>("user", "orders", mutation("POST", { plan_id: plan.id }, key.current));
            try {
                sessionStorage.removeItem(storageKey);
            }
            catch { /* Optional storage. */ }
            key.current = null;
            clearPurchase();
            router.push(`/orders/${order.id}`);
        }
        catch (err) {
            setError(err as Error);
        }
        finally {
            setBusy(false);
        }
    }
    return <article ref={card} tabIndex={-1} className="panel account-card plan-card [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><span className="account-eyebrow [font-size:11px] [letter-spacing:.16em] [color:var(--accent)]">{plan.duration_days} NGÀY</span><h2>{plan.name}</h2>{discounted && <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><del className="text-[var(--muted)]" aria-label="Giá niêm yết">{money(launchOffer.listPriceVnd)}</del><span className="rounded border border-[var(--accent)] px-2 py-1 text-[var(--accent)]">Ưu đãi đăng ký đợt này</span></div>}<strong className="account-price block [color:var(--accent)] [font-size:clamp(24px,4vw,34px)] [margin:20px_0]">{money(plan.price_vnd)}</strong><dl className={accountStyles.facts}><div><dt>Yêu cầu mỗi ngày</dt><dd>{dailyLimit(plan)}</dd></div><div><dt>Yêu cầu đồng thời</dt><dd>{plan.active_limit}</dd></div></dl><p>Sàng lọc toàn sàn và phân tích Quant. Hạn mức yêu cầu đặt lại lúc 00:00 giờ Việt Nam.</p><ErrorNotice error={error}/>
    {plan.price_vnd === 0 ? <><p>Miễn phí tháng đầu (30 ngày) cho tài khoản mới đăng ký trong đợt ưu đãi này. Cấp tự động một lần, không cần thanh toán.</p><Link className={accountStyles.buttonSecondary} href={session.state === "ready" ? "/account" : "/login"}>{session.state === "ready" ? "Xem quyền sử dụng của tôi" : "Đăng nhập để bắt đầu"}</Link></> : session.state === "idle" || session.state === "loading" ? <button className="min-h-10 rounded-[4px] border border-[var(--border)] px-4 text-sm" disabled>Đang kiểm tra đăng nhập…</button> : session.state === "error" ? <button className="min-h-10 rounded-[4px] border border-[var(--border)] px-4 text-sm" onClick={() => void loadSession("user")}>Thử lại kết nối đăng nhập</button> : session.state === "ready" ? <button className={accountStyles.buttonPrimary} disabled={!enabled || busy} onClick={() => void buy()}>Tiếp tục thanh toán</button> : <Link className={accountStyles.buttonSecondary} onClick={() => rememberPurchase("plan", plan.id)} href="/login">Đăng nhập để mua</Link>}
  </article>;
}
export function OrderPage({ id, supportHref }: {
    id: string; supportHref?: string;
}) { return <Guard><OrderDetail id={id} supportHref={supportHref}/></Guard>; }
function OrderDetail({ id, supportHref }: {
    id: string; supportHref?: string;
}) {
    const result = useResource<Order>(`orders/${encodeURIComponent(id)}`);
    const [error, setError] = useState<Error | null>(null), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [copied, setCopied] = useState("");
    const [now, setNow] = useState(() => Date.now());
    const serverOffset = useRef(0);
    const [settlement, setSettlement] = useState<{ id: string; rights?: Entitlement; error?: Error } | null>(null);
    useEffect(() => {
        if (result.data?.status !== "PENDING") return;
        const timer = setInterval(() => setNow(Date.now() + serverOffset.current), 1000);
        return () => clearInterval(timer);
    }, [result.data?.status]);
    useEffect(() => {
        if (result.data?.status !== "PENDING" && result.data?.payment_resolution !== "RECONCILIATION")
            return;
        let timer: ReturnType<typeof setTimeout>;
        const poll = () => {
            timer = setTimeout(() => {
                if (document.visibilityState === "visible")
                    result.reload();
                else
                    poll();
            }, result.error || result.data?.payment_resolution === "RECONCILIATION" ? 20000 : 5000);
        };
        if (!result.loading)
            poll();
        const visible = () => {
            if (document.visibilityState === "visible") {
                clearTimeout(timer);
                result.reload();
            }
        };
        document.addEventListener("visibilitychange", visible);
        return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
    }, [result.data?.status, result.data?.payment_resolution, result.loading, result.error, result.reload]);
    useEffect(() => {
        if (result.data?.status !== "PAID") return;
        let active = true;
        setSettlement(null);
        void api<Entitlement>("user", "me/entitlements").then(rights => {
            if (active) setSettlement({ id, rights });
        }).catch(error => { if (active) setSettlement({ id, error }); });
        return () => { active = false; };
    }, [id, result.data]);
    const initialRetries = useRef(0);
    useEffect(() => { initialRetries.current = 0; }, [id]);
    useEffect(() => {
        if (result.loading || result.data || !result.error || initialRetries.current >= 3) return;
        if (result.error instanceof ApiError && result.error.status > 0 && result.error.status < 500) return;
        const timer = setTimeout(() => { initialRetries.current++; result.reload(); }, 2000 * 2 ** initialRetries.current);
        return () => clearTimeout(timer);
    }, [result.loading, result.data, result.error, result.reload]);
    const order = result.data;
    useEffect(() => { if (typeof result.data?.server_now === "number") { serverOffset.current = result.data.server_now * 1000 - Date.now(); setNow(Date.now() + serverOffset.current); } }, [result.data]);
    const canTransfer = !result.error && order?.payment_resolution !== "RECONCILIATION" && order?.status === "PENDING" && order.expires_at * 1000 > now;
    async function copy(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(`Đã sao chép ${label}.`);
        }
        catch {
            setCopied("Không sao chép được. Bạn có thể chọn và sao chép thông tin bên dưới.");
        }
    }
    return <><PageHeading title="Chi tiết đơn hàng"><Link className={accountStyles.buttonSecondary} href="/account/orders">Các đơn của tôi</Link></PageHeading><ResourceState {...result} retry={result.reload}/><ErrorNotice error={error}/>{order && <section className="panel account-card [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><div className="account-section-heading flex justify-between [gap:15px] flex-wrap items-center"><h2>{order.reference}</h2><span className={tw(`account-status ${order.status === "PAID" ? "positive" : ""}`)}>{orderStatus(order.status)}</span></div><strong className="account-price block [color:var(--accent)] [font-size:clamp(24px,4vw,34px)] [margin:20px_0]">{money(order.amount_vnd)}</strong>
    {order.plan && <div className="my-4 space-y-2 text-sm leading-7"><h3 className="text-lg font-semibold">{order.plan.name}</h3><p>{order.plan.duration_days} ngày · tối đa {dailyLimit(order.plan)} yêu cầu/ngày · {order.plan.active_limit} yêu cầu đồng thời.</p>{order.expected_valid_from && <p>{order.subscription ? "Hiệu lực" : "Hiệu lực dự kiến khi thanh toán"}: {stamp(order.expected_valid_from)} → {stamp(order.expected_valid_until)}.</p>}</div>}
    {canTransfer && <><p role="status">{order.expires_at * 1000 > now ? `Còn ${Math.floor((order.expires_at * 1000 - now) / 60000)} phút ${Math.floor((order.expires_at * 1000 - now) / 1000) % 60} giây` : "Đã đến hạn thanh toán; đang chờ cập nhật trạng thái."}</p><div className="account-checkout grid [grid-template-columns:minmax(200px,280px)_minmax(0,1fr)] [gap:30px] [align-items:start] max-[640px]:[grid-template-columns:1fr]">{order.qr_url && <div><img className="account-qr block w-full [height:auto] [border-radius:4px] [background:white] max-[640px]:[max-width:280px] max-[640px]:[margin:auto]" src={order.qr_url} width={280} height={330} alt="Mã QR thanh toán đơn hàng" onError={e => { e.currentTarget.hidden = true; }}/><p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Nếu QR không hiển thị, chuyển khoản theo thông tin bên cạnh.</p></div>}<dl className={accountStyles.facts}><div><dt>Ngân hàng</dt><dd>{order.bank}</dd></div><div><dt>Chủ tài khoản</dt><dd>{order.account_name}</dd></div><div><dt>Số tài khoản</dt><dd>{order.account_number} <button className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" onClick={() => void copy(order.account_number, "số tài khoản")}>Sao chép</button></dd></div><div><dt>Số tiền</dt><dd>{money(order.amount_vnd)} <button className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" onClick={() => void copy(String(order.amount_vnd), "số tiền")}>Sao chép</button></dd></div><div><dt>Nội dung</dt><dd>{order.transfer_content} <button className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" onClick={() => void copy(order.transfer_content, "nội dung")}>Sao chép</button></dd></div></dl></div><p className="account-notice [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px]">Chuyển đúng số tiền và giữ nguyên nội dung. Hệ thống tự xác nhận khi nhận được giao dịch.</p><p aria-live="polite">{copied}</p><div className={accountStyles.actions}><button className={accountStyles.buttonSecondary} disabled={busy} onClick={() => setConfirm(true)}>Hủy đơn</button></div></>}
    {order.status === "PENDING" && result.error && <p role="status">Tạm ẩn thông tin chuyển khoản vì chưa cập nhật được trạng thái đơn. Hệ thống sẽ tự thử lại; nếu đã chuyển tiền, không chuyển thêm.</p>}
    {order.status === "PENDING" && order.payment_resolution !== "RECONCILIATION" && !result.error && !canTransfer && <p role="status">Đã hết thời gian chuyển khoản. Đang chờ máy chủ xác nhận trạng thái đơn; không chuyển tiền vào đơn này.</p>}
    {order.payment_resolution === "RECONCILIATION" && <div className="my-5 rounded-[4px] border border-[var(--accent)] p-5 leading-7" role="status"><h3>Giao dịch đang được đối soát</h3><p>Đã có giao dịch liên quan đến đơn. Bạn không cần chuyển thêm tiền hoặc tạo đơn mới cho lần thanh toán này.</p><p>Mã tham chiếu: <strong>{order.reference}</strong></p><button className="text-[var(--accent)] underline" onClick={() => void copy(order.reference, "mã tham chiếu")}>Sao chép mã hỗ trợ</button>{supportHref ? <a className="block text-[var(--accent)] underline" href={supportHref} target="_blank" rel="noopener noreferrer">{supportHref === "mailto:support@quantik.example" ? "support@quantik.example (email minh họa)" : "Liên hệ hỗ trợ thanh toán"}</a> : <p>Lưu mã tham chiếu để liên hệ bộ phận hỗ trợ.</p>}</div>}
    {order.status === "PAID" && settlement?.id === id && <div className="my-5 rounded-[4px] border border-[var(--border)] p-4" aria-live="polite">
      <ErrorNotice error={settlement.error}/>
      {settlement.error && <button className="text-[var(--accent)] underline" onClick={result.reload}>Tải lại quyền sử dụng</button>}
      {settlement.rights && <p>{settlement.rights.active ? "Hôm nay còn " + settlement.rights.remaining + " yêu cầu; gói có hiệu lực đến " + stamp(settlement.rights.valid_until) + "." : "Chưa có kỳ gói đang hiệu lực. Xem lịch các kỳ gói trong tài khoản."}</p>}
    </div>}
    {order.status === "PAID" && <p className="account-notice positive [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px] [.terminal_&]:[color:var(--positive)]">Thanh toán đã được xác nhận. Nếu đang có gói, kỳ vừa mua sẽ nối tiếp kỳ hiện tại. <Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href="/account">Xem gói và hạn mức ngày →</Link></p>}
    {order.payment_resolution !== "RECONCILIATION" && (order.status === "EXPIRED" || order.status === "CANCELLED") && <p>Đơn đã đóng. <Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href="/plans">Chọn gói và tạo đơn mới →</Link></p>}
    <p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Tạo lúc {stamp(order.created_at)} · Hạn {stamp(order.expires_at)}{order.paid_at ? ` · Thanh toán lúc ${stamp(order.paid_at)}` : ""}</p>
    {confirm && <Confirm title="Hủy đơn chờ thanh toán?" busy={busy} onCancel={() => setConfirm(false)} onConfirm={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                        await api("user", `orders/${encodeURIComponent(id)}/cancel`, mutation("POST"));
                        setConfirm(false);
                        result.reload();
                    }
                    catch (err) {
                        setError(err as Error);
                        result.reload();
                    }
                    finally {
                        setBusy(false);
                    }
                }}><p>Chỉ hủy khi bạn chưa chuyển khoản. Nếu đã chuyển tiền, hãy chờ hệ thống xác nhận để tránh giao dịch phải đối soát.</p></Confirm>}
  </section>}</>;
}
export function HistoryPage({ payments = false }: {
    payments?: boolean;
}) { return <Guard><PageHeading title={payments ? "Lịch sử giao dịch" : "Lịch sử đơn hàng"}><Link className={accountStyles.buttonSecondary} href="/account">Tài khoản</Link></PageHeading><Panel title={payments ? "Giao dịch của tôi" : "Đơn hàng của tôi"}><div className={accountStyles.card}><PagedTable role="user" path={payments ? "payments" : "orders"} columns={payments ? [{ key: "id", label: "Mã giao dịch" }, { key: "amount_vnd", label: "Số tiền", render: v => money(Number(v)) }, { key: "status", label: "Trạng thái", render: paymentStatus }, { key: "reason", label: "Lý do", render: paymentReason }, dateColumn("received_at", "Ghi nhận lúc")] : orderColumns} action={row => row.order_id || !payments ? <Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href={`/orders/${payments ? row.order_id : row.id}`}>Xem đơn →</Link> : <span>Chưa khớp đơn</span>}/></div></Panel></Guard>; }

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, mutation } from "@/lib/api/client";
import { stamp } from "@/lib/api/contracts";
import { accountStyles } from "@/components/account/styles";
import { Confirm, ErrorNotice, Field } from "@/components/account/common";
import { PageHeading, Panel } from "@/components/ui";
import { demoLogin } from "@/components/account/session";

type DemoCode = {
    id: string; created_by: string | null; created_at: number; expires_at: number | null;
    revoked: boolean; used_count: number; last_used_at: number | null; code?: string;
};

export function DemoPage() {
    const router = useRouter();
    const [codes, setCodes] = useState<DemoCode[]>([]);
    const [created, setCreated] = useState<DemoCode | null>(null);
    const [expires, setExpires] = useState("");
    const [loginCode, setLoginCode] = useState("");
    const [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null);
    const [notice, setNotice] = useState(""), [confirmReset, setConfirmReset] = useState(false);
    const [copied, setCopied] = useState(false);
    const load = () => api<{ items: DemoCode[] }>("admin", "admin/demo/codes")
        .then(result => setCodes(result.items)).catch(err => setError(err as Error));
    useEffect(() => { void load(); }, []);
    const create = async () => {
        setBusy(true); setError(null); setNotice(""); setCreated(null);
        try {
            const result = await api<DemoCode>("admin", "admin/demo/codes", mutation("POST",
                { expires_in_days: expires.trim() ? Number(expires) : null }));
            setCreated(result); setCodes([result, ...codes]); setExpires("");
        } catch (err) { setError(err as Error); } finally { setBusy(false); }
    };
    const revoke = async (id: string) => {
        setBusy(true); setError(null);
        try {
            const result = await api<DemoCode>("admin", `admin/demo/codes/${id}/revoke`, mutation("POST", {}));
            setCodes(codes.map(code => code.id === id ? result : code));
            setNotice("Đã thu hồi mã demo. Các máy đang dùng mã này vẫn giữ phiên hiện tại cho tới khi hết hạn hoặc reset, máy mới không vào được nữa.");
        } catch (err) { setError(err as Error); } finally { setBusy(false); }
    };
    const reset = async () => {
        setBusy(true); setError(null);
        try {
            const result = await api<{ sessions_revoked: number; jobs_deleted: number }>("admin", "admin/demo/reset", mutation("POST", {}));
            setConfirmReset(false);
            setNotice(`Đã reset tài khoản demo: thu hồi ${result.sessions_revoked} phiên, xóa ${result.jobs_deleted} yêu cầu/báo cáo demo.`);
        } catch (err) { setError(err as Error); } finally { setBusy(false); }
    };
    return <>
        <PageHeading title="Tài khoản demo" description="Cấp mã cho máy trải nghiệm ở booth triển lãm. Tài khoản demo dùng chung, không giới hạn tính năng client, không tạo đơn thanh toán thật." />
        <ErrorNotice error={error} />
        {notice && <p role="status" className="account-notice [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0]">{notice}</p>}
        <Panel title="Tạo mã demo mới"><div className="account-card [padding:24px]">
            <form className="account-form grid [gap:18px]" onSubmit={e => { e.preventDefault(); void create(); }}>
                <Field label="Hết hạn sau (ngày, để trống là không hết hạn cho tới khi thu hồi)"><input type="number" min={1} max={365} value={expires} onChange={e => setExpires(e.target.value)} /></Field>
                <button className={accountStyles.buttonPrimary} disabled={busy}>Tạo mã</button>
            </form>
            {created?.code && <div className="mt-5 rounded-[4px] border border-[var(--accent)] p-4">
                <p className="font-medium">Mã demo mới — chỉ hiện một lần, sao chép ngay cho máy booth:</p>
                <code className="[overflow-wrap:anywhere] [font-size:14px]">{created.code}</code>
                <div className="mt-3"><button className={accountStyles.buttonSecondary} onClick={() => { void navigator.clipboard?.writeText(created.code!); setCopied(true); }}>{copied ? "Đã sao chép" : "Sao chép mã"}</button></div>
            </div>}
        </div></Panel>
        <Panel title="Đăng nhập demo trên máy này"><div className="account-card [padding:24px]">
            <p className="text-sm text-[var(--muted)]">Dùng khi máy này chính là máy booth: nhập mã demo để chuyển sang tài khoản demo mà không mất phiên quản trị.</p>
            <form className="account-form grid [gap:18px] [margin-top:18px]" onSubmit={e => { e.preventDefault(); if (!loginCode.trim()) return; setBusy(true); setError(null); demoLogin(loginCode.trim()).then(() => router.push("/dashboard")).catch(err => setError(err as Error)).finally(() => setBusy(false)); }}>
                <Field label="Mã demo"><input maxLength={128} required value={loginCode} onChange={e => setLoginCode(e.target.value)} /></Field>
                <button className={accountStyles.buttonSecondary} disabled={busy}>Đăng nhập demo</button>
            </form>
        </div></Panel>
        <Panel title="Các mã demo"><div className="account-card [padding:24px]">
            {codes.length === 0 ? <p className="text-sm text-[var(--muted)]">Chưa có mã demo nào.</p> : <table className="w-full text-sm"><thead><tr><th className="text-left">Mã</th><th className="text-left">Tạo lúc</th><th className="text-left">Hết hạn</th><th className="text-left">Lượt dùng</th><th className="text-left">Dùng gần nhất</th><th /></tr></thead><tbody>
                {codes.map(code => <tr key={code.id}><td><code>{code.id.slice(0, 8)}…</code></td><td>{stamp(code.created_at)}</td><td>{code.expires_at ? stamp(code.expires_at) : "Không hết hạn"}</td><td>{code.used_count}</td><td>{code.last_used_at ? stamp(code.last_used_at) : "—"}</td><td>{code.revoked ? "Đã thu hồi" : <button className={accountStyles.buttonSecondary} disabled={busy} onClick={() => void revoke(code.id)}>Thu hồi</button>}</td></tr>)}
            </tbody></table>}
        </div></Panel>
        <Panel title="Reset tài khoản demo"><div className="account-card [padding:24px]">
            <p className="text-sm leading-7 text-[var(--muted)]">Thu hồi toàn bộ phiên demo đang chạy và xóa yêu cầu phân tích/báo cáo của tài khoản demo, để khách tham quan tiếp theo bắt đầu sạch. Mã demo không bị xóa; mã đã thu hồi vẫn giữ trạng thái thu hồi.</p>
            <button className={accountStyles.buttonSecondary} disabled={busy} onClick={() => setConfirmReset(true)}>Reset tài khoản demo</button>
            {confirmReset && <Confirm title="Reset tài khoản demo?" busy={busy} onCancel={() => setConfirmReset(false)} onConfirm={() => void reset()}><p>Toàn bộ máy booth đang dùng demo sẽ bị đăng xuất và mất lịch sử phân tích demo.</p></Confirm>}
        </div></Panel>
    </>;
}

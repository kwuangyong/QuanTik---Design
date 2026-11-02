"use client";
import { accountStyles } from "@/components/account/styles";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, raw } from "@/lib/api/client";
import { adminLogin, demoLogin, useSession } from "./session";
import { ErrorNotice, Field } from "./common";
export function Login({ admin = false }: {
    admin?: boolean;
}) {
    const router = useRouter(), query = useSearchParams();
    const session = useSession(admin ? "admin" : "user");
    const [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null);
    const [username, setUsername] = useState(""), [password, setPassword] = useState("");
    const [demoCode, setDemoCode] = useState("");
    const [retryUntil, setRetryUntil] = useState(0), [clock, setClock] = useState(0);
    const remaining = Math.max(0, Math.ceil((retryUntil-clock)/1000));
    useEffect(() => {
        if (!retryUntil) return;
        const timer = setInterval(() => { const now = Date.now(); setClock(now); if (now >= retryUntil) clearInterval(timer); }, 1000);
        return () => clearInterval(timer);
    }, [retryUntil]);
    useEffect(() => {
        if (session.state === "ready") {
            router.replace(admin ? "/admin" : "/dashboard");
            if (admin)
                router.refresh();
        }
    }, [session.state, admin, router]);
    async function submit() {
        if (busy || remaining > 0) return;
        setBusy(true);
        setError(null);
        try {
            if (admin) {
                await adminLogin(username, password);
                setPassword("");
            }
            else {
                const result = await raw<{
                    authorization_url: string;
                }>("auth/google/start");
                const url = new URL(result.authorization_url);
                if (url.origin !== "https://accounts.google.com")
                    throw new Error("Địa chỉ đăng nhập không hợp lệ.");
                location.assign(url.href);
            }
        }
        catch (err) {
            if (err instanceof ApiError && err.status === 401) setPassword("");
            if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
                const now = Date.now(); setClock(now); setRetryUntil(now + err.retryAfter*1000);
            }
            setError(admin && err instanceof ApiError && err.status === 401 ? new ApiError(401, "INVALID_ADMIN_CREDENTIALS", err.requestId) : err as Error);
        }
        finally {
            setBusy(false);
        }
    }
    if (session.state === "ready")
        return <p role="status">Đang mở {admin ? "khu vực quản trị" : "dashboard"}…</p>;
    return <section className="panel account-card account-login [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [max-width:560px] [margin:36px_auto] [.auth-stage_&]:[width:min(100%,_460px)] [.auth-stage_&]:[margin:0] [.auth-stage_&]:[padding:36px] [.auth-stage_&_h1]:[font-size:26px] [.auth-stage_&_>_p]:[color:var(--muted)] [.auth-stage_&_>_p]:[font-size:13px] max-[640px]:[.auth-stage_&]:[padding:26px_22px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] max-[640px]:[margin:15px_auto] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><div className="auth-brand flex [gap:12px] items-center [margin-bottom:26px] [font-size:24px] [font-weight:600] [&_img]:[border-radius:4px] [&_>_span_>_span]:[color:var(--accent)]"><img src="/quantik-logo.jpg" width="38" height="38" alt=""/><span>Quan<span>Tik</span></span></div><h1>{admin ? "Đăng nhập quản trị" : "Đăng nhập hệ thống"}</h1><p>{admin ? "Dành cho tài khoản quản trị đã được cấp." : "Một tài khoản để truy cập thị trường và phân tích Quant."}</p>
    {query.has("error") && <p role="alert" className="account-notice negative [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px] [.terminal_&]:[color:var(--negative)]">{query.get("error") === "backend" ? "Chưa kết nối được máy chủ đăng nhập." : "Đăng nhập Google chưa hoàn tất hoặc đã hết hạn. Vui lòng thử lại."}</p>}
    <ErrorNotice error={error}/>
    {session.state === "error" && <ErrorNotice error={session.error}/>}
    <form className="account-form grid [gap:18px] [margin:22px_0] [&_fieldset]:[border-width:0] [&_fieldset]:[padding:0] [&_fieldset]:[margin:0] [&_fieldset]:grid [&_fieldset]:[gap:18px] [&_fieldset]:min-w-0" onSubmit={e => { e.preventDefault(); void submit(); }}>
      {admin && <><Field label="Tên đăng nhập"><input autoComplete="username" maxLength={255} required value={username} onChange={e => setUsername(e.target.value)}/></Field><Field label="Mật khẩu"><input type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={e => setPassword(e.target.value)}/></Field></>}
      <button className={accountStyles.buttonPrimary} disabled={busy || remaining > 0}>{busy ? "Đang kết nối…" : remaining > 0 ? `Thử lại sau ${remaining} giây` : admin ? "Đăng nhập" : "Tiếp tục với Google"}</button>
    </form>
    {!admin && <><details className="mt-4"><summary className="cursor-pointer text-sm text-[var(--muted)]">Dùng mã demo cho máy trải nghiệm</summary><form className="account-form grid [gap:18px] [margin:22px_0]" onSubmit={e => { e.preventDefault(); if (busy || remaining > 0 || !demoCode.trim()) return; setBusy(true); setError(null); demoLogin(demoCode.trim()).then(() => router.replace("/dashboard")).catch(err => setError(err as Error)).finally(() => setBusy(false)); }}><Field label="Mã demo do quản trị cấp"><input autoComplete="off" maxLength={128} required value={demoCode} onChange={e => setDemoCode(e.target.value)}/></Field><button className={accountStyles.buttonSecondary} disabled={busy || remaining > 0}>Vào tài khoản demo</button><p className="text-sm text-[var(--muted)]">Tài khoản demo dùng chung cho khách tham quan, không giới hạn tính năng client và không tạo đơn thanh toán thật.</p></form></details><Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href="/">← Về trang chủ</Link></>}
  </section>;
}

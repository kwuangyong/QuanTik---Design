"use client";
import { accountStyles } from "@/components/account/styles";
import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { accept, api, ApiError, authPath, forget, onExpired, raw, mutation } from "@/lib/api/client";
import { rememberPurchase } from "@/lib/purchase-intent";
import type { Profile, Role } from "@/lib/api/contracts";
type Session = {
    state: "idle" | "loading" | "ready" | "anonymous" | "error";
    profile?: Profile;
    error?: Error;
};
const initial: Session = { state: "idle" };
const sessions: Record<Role, Session> = { user: initial, admin: initial };
const subscribers = new Set<() => void>();
const epochs: Record<Role, number> = { user: 0, admin: 0 };
let channel: BroadcastChannel | undefined;
function set(role: Role, value: Session) { sessions[role] = value; subscribers.forEach(fn => fn()); }
onExpired(role => { epochs[role]++; set(role, { state: "anonymous" }); });
function broadcast() {
    if (!channel && typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("quantik-session");
        channel.onmessage = event => {
            const message = event.data;
            if (message === "user" || message === "admin") forget(message);
            else if ((message?.role === "user" || message?.role === "admin") && message.action === "login") {
                forget(message.role);
                void loadSession(message.role);
            }
        };
    }
    return channel;
}
export function SessionEvents() {
    useEffect(() => {
        const check = () => {
            broadcast();
            if (!document.cookie.split("; ").some(cookie => cookie.startsWith("quantik_login_event="))) return;
            document.cookie = "quantik_login_event=; Path=/; Max-Age=0; SameSite=Lax";
            forget("user");
            void loadSession("user");
            broadcast()?.postMessage({ role: "user", action: "login" });
        };
        check(); window.addEventListener("focus", check);
        return () => window.removeEventListener("focus", check);
    }, []);
    return null;
}
export async function loadSession(role: Role) {
    if (sessions[role].state === "loading")
        return;
    const epoch = ++epochs[role];
    set(role, { state: "loading" });
    try {
        const profile = await api<Profile>(role, role === "admin" ? "admin/me" : "me");
        if (epochs[role] !== epoch)
            return;
        if (profile.role !== role) {
            forget(role);
            return;
        }
        set(role, { state: "ready", profile });
    }
    catch (error) {
        if (epochs[role] !== epoch)
            return;
        set(role, { state: error instanceof ApiError && [401, 403].includes(error.status) ? "anonymous" : "error", error: error as Error });
    }
}
export function useSession(role: Role) {
    const session = useSyncExternalStore(fn => { subscribers.add(fn); return () => { subscribers.delete(fn); }; }, () => sessions[role], () => initial);
    useEffect(() => {
        broadcast();
        if (sessions[role].state === "idle")
            void loadSession(role);
    }, [role]);
    return session;
}
export async function adminLogin(username: string, password: string) {
    const result = await raw<{
        access_token: string;
        expires_in: number;
    }>("admin/auth/login", mutation("POST", { username, password }));
    accept("admin", result);
    epochs.admin++;
    set("admin", { state: "idle" });
    await loadSession("admin");
    broadcast()?.postMessage({ role: "admin", action: "login" });
    if (sessions.admin.state !== "ready")
        throw sessions.admin.error || new Error("Không xác nhận được phiên quản trị.");
}
export async function demoLogin(code: string) {
    const result = await raw<{
        access_token: string;
        expires_in: number;
    }>("auth/demo/exchange", mutation("POST", { code }));
    accept("user", result);
    epochs.user++;
    set("user", { state: "idle" });
    await loadSession("user");
    broadcast()?.postMessage({ role: "user", action: "login" });
    if (sessions.user.state !== "ready")
        throw sessions.user.error || new Error("Không xác nhận được phiên demo.");
}
export async function logout(role: Role) {
    await raw(`${authPath(role)}/logout`, mutation("POST"));
    forget(role);
    broadcast()?.postMessage(role);
}
export function Guard({ role = "user", children }: {
    role?: Role;
    children: ReactNode;
}) {
    const session = useSession(role);
    if (session.state === "idle" || session.state === "loading")
        return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
    if (session.state === "error")
        return <section className="panel account-card [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><p role="alert">{session.error?.message}</p><button className={accountStyles.buttonSecondary} onClick={() => void loadSession(role)}>Thử lại</button></section>;
    if (session.state !== "ready")
        return <section className="panel account-card [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><h1>Cần đăng nhập</h1><p>{role === "admin" ? "Đăng nhập tài khoản quản trị để tiếp tục." : "Đăng nhập để quản lý tài khoản và mua gói phân tích."}</p><Link className={accountStyles.buttonPrimary} onClick={() => { if (role === "user") { const match = location.pathname.match(/^\/orders\/([a-zA-Z0-9-]+)$/); if (match) rememberPurchase("order", match[1]); } }} href={role === "admin" ? "/admin/login" : "/login"}>Đăng nhập</Link></section>;
    // Key prevents private view state being reused when the account changes.
    return <div key={session.profile!.id}>{children}</div>;
}

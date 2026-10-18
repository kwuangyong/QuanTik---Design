"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChartNoAxesCombined, Home, LayoutDashboard, Menu, Moon, Search, SlidersHorizontal, Star, Sun, X, CircleHelp } from "lucide-react";
import { usePreferences } from "./preferences";
import { SessionMenu } from "./account/session-menu";
import { ProfileGate } from "./account/profile";

const navigation = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/dashboard", label: "Thị trường", icon: LayoutDashboard },
  { href: "/screener", label: "Quét toàn sàn", icon: Search },
  { href: "/watch", label: "Theo dõi", icon: Star },
  { href: "/analysis", label: "Phân tích Quant", icon: ChartNoAxesCombined },
  { href: "/guide", label: "Hướng dẫn", icon: CircleHelp },
];

export function WebsiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(), router = useRouter();
  const { theme, toggleTheme } = usePreferences();
  const [mobile, setMobile] = useState(false), [command, setCommand] = useState(""), [notice, setNotice] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const input = useRef<HTMLInputElement>(null), menu = useRef<HTMLButtonElement>(null), sidebar = useRef<HTMLElement>(null);
  const current = navigation.find(item => item.href === pathname)?.label ?? ({ "/charts": "Biểu đồ", "/plans": "Gói phân tích" }[pathname] || "Tài khoản");
  useEffect(() => {
    setClock(new Date());
    const timer = setInterval(() => setClock(new Date()), 1000);
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open], [role="dialog"]')) return;
      const target = event.target;
      if (event.key === "/" && !(target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable))) { event.preventDefault(); input.current?.focus(); }
      if (event.key === "Escape") { setMobile(false); setCommand(""); if (menu.current?.getAttribute("aria-expanded") === "true") menu.current.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { clearInterval(timer); document.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => { setMobile(false); setNotice(""); }, [pathname]);
  useEffect(() => {
    if (!mobile) return;
    const links = sidebar.current?.querySelectorAll<HTMLAnchorElement>("a");
    links?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !links?.length) return;
      const first = links[0], last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [mobile]);
  function execute(event: React.FormEvent) {
    event.preventDefault();
    const text = command.trim().toUpperCase();
    if (["WATCH", "MARKET"].includes(text)) { router.push(text === "WATCH" ? "/watch" : "/dashboard"); setCommand(""); setNotice(""); return; }
    const match = text.match(/^([A-Z0-9]{2,16})(?:\s+(Q|CHART))?$/);
    if (!match) { setNotice("Nhập mã như FPT, FPT Q, WATCH hoặc MARKET."); return; }
    router.push(`/${match[2] === "Q" ? "analysis" : "charts"}?symbol=${encodeURIComponent(match[1])}`);
    setCommand(""); setNotice("");
  }
  return <div className="terminal website-shell" data-theme={theme}>
    <a className="website-skip" href="#workspace">Đến nội dung</a>
    {mobile && <button className="website-scrim" aria-label="Đóng menu" onClick={() => { setMobile(false); menu.current?.focus(); }}/>}
    <aside className={`website-sidebar ${mobile ? "is-open" : ""}`} ref={sidebar} id="website-navigation">
      <Link href="/" className="website-brand" aria-label="QuanTik — Trang chủ"><img src="/quantik-logo.jpg" width="120" height="120" alt="QuanTik"/></Link>
      <div className="website-nav-label">KHÔNG GIAN ĐẦU TƯ</div>
      <nav aria-label="Điều hướng chính">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined} onClick={() => setMobile(false)}><Icon size={20}/><span>{label}</span>{pathname === href && <i/>}</Link>)}</nav>
      <div className="website-sidebar-bottom"><div className="website-demo-card"><span className="website-eyebrow">BẢN TRẢI NGHIỆM</span><b>Hiểu dữ liệu.<br/>Chủ động quyết định.</b><p>Khám phá công cụ phân tích định lượng cho cổ phiếu Việt Nam.</p><Link href="/guide">Khám phá QuanTik ↗</Link></div><div className="website-profile"><span>QT</span><div><Link href="/account">Không gian cá nhân</Link><small>Tài khoản và gói sử dụng</small></div></div><Link className="website-plans" href="/plans"><SlidersHorizontal size={14}/> Gói phân tích <ArrowUpRight size={14}/></Link></div>
    </aside>
    <div className="website-workspace">
      <header className="website-topbar"><button ref={menu} className="website-icon website-menu" aria-label={mobile ? "Đóng menu" : "Mở menu"} aria-expanded={mobile} aria-controls="website-navigation" onClick={() => setMobile(value => !value)}>{mobile ? <X size={20}/> : <Menu size={20}/>}</button><span className="website-breadcrumb">Không gian đầu tư <span>/</span> <b>{current}</b></span><div className="website-top-actions"><span className="website-badge">Bản thử nghiệm</span><SessionMenu role="user"/><button className="website-icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Chuyển chế độ sáng" : "Chuyển chế độ tối"}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
      <main id="workspace" className="website-content">
        <div className="website-context"><span className="website-eyebrow">VIETNAM EQUITIES / QuanTik</span><time className="website-clock" suppressHydrationWarning>{clock && <><b>{clock.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</b><span>{clock.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })} ICT</span></>}</time></div>
        <form className="website-command" role="search" onSubmit={execute}><label htmlFor="global-search"><Search size={20}/><span>Tra cứu nhanh</span></label><input id="global-search" ref={input} value={command} onChange={event => setCommand(event.target.value)} placeholder="Nhập mã cổ phiếu · FPT hoặc FPT Q" autoComplete="off" spellCheck={false}/><kbd>/</kbd><button type="submit">Mở ↗</button></form>
        {notice && <p role="status" className="website-error">{notice}</p>}
        <ProfileGate>{children}</ProfileGate>
        <footer className="website-footer"><span>© {clock?.getFullYear() ?? 2026} QuanTik · Quantitative insights</span><span>Dữ liệu theo phiên công bố · Không phải khuyến nghị đầu tư</span></footer>
      </main>
    </div>
  </div>;
}

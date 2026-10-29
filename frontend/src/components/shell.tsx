"use client";
import { tw } from "@/lib/tailwind";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, LayoutDashboard, Menu, Moon, Search, SlidersHorizontal, Sparkles, Sun, X, } from "lucide-react";
import { stocks } from "@/lib/mock-data";
import { usePreferences } from "./preferences";
import { SessionMenu } from "./account/session-menu";
import { ProfileGate } from "./account/profile";
const navigation = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/screener", label: "Quét toàn sàn", icon: SlidersHorizontal },
    { href: "/analysis", label: "Phân tích Quant", icon: Sparkles },
    { href: "/plans", label: "Gói phân tích", icon: SlidersHorizontal },
    { href: "/account", label: "Tài khoản", icon: LayoutDashboard },
];
const adminNavigation = [
    { href: "/admin", label: "Quản trị", icon: LayoutDashboard },
    { href: "/admin/users", label: "Người dùng", icon: LayoutDashboard },
    { href: "/admin/plans", label: "Gói dịch vụ", icon: SlidersHorizontal },
    { href: "/admin/orders", label: "Đơn hàng", icon: SlidersHorizontal },
    { href: "/admin/payments", label: "Giao dịch", icon: SlidersHorizontal },
    { href: "/admin/reconciliation", label: "Đối soát", icon: SlidersHorizontal },
    { href: "/admin/config/integrations", label: "Cấu hình tích hợp", icon: SlidersHorizontal },
    { href: "/admin/config/operations", label: "Vận hành", icon: SlidersHorizontal },
    { href: "/admin/config/calendar", label: "Lịch giao dịch", icon: SlidersHorizontal },
    { href: "/admin/jobs", label: "Yêu cầu phân tích", icon: Sparkles },
    { href: "/admin/subscriptions", label: "Các kỳ gói", icon: SlidersHorizontal },
    { href: "/admin/scheduled-tasks", label: "Tác vụ theo lịch", icon: SlidersHorizontal },
    { href: "/admin/audit", label: "Nhật ký", icon: SlidersHorizontal },
];
export function Shell({ children }: {
    children: ReactNode;
}) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");
    const links = isAdmin ? adminNavigation : navigation;
    const router = useRouter();
    const { theme, toggleTheme } = usePreferences();
    const [mobile, setMobile] = useState(false);
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");
    const search = useRef<HTMLInputElement>(null);
    const mobileButton = useRef<HTMLButtonElement>(null);
    const sidebar = useRef<HTMLElement>(null);
    const current = links.find((item) => item.href === pathname)?.label ?? "QuanTik";
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if (document.querySelector("dialog[open]"))
                return;
            if (event.key === "/" &&
                !(event.target instanceof HTMLElement &&
                    (event.target.matches("input,textarea,select") ||
                        event.target.isContentEditable))) {
                event.preventDefault();
                search.current?.focus();
            }
            if (event.key === "Escape") {
                setQuery("");
                setMobile(false);
                if (mobileButton.current?.getAttribute("aria-expanded") === "true")
                    mobileButton.current.focus();
            }
        };
        document.addEventListener("keydown", key);
        return () => document.removeEventListener("keydown", key);
    }, []);
    useEffect(() => {
        if (!mobile)
            return;
        const links = sidebar.current?.querySelectorAll<HTMLAnchorElement>("a");
        links?.[0]?.focus();
        const trap = (event: KeyboardEvent) => {
            if (event.key !== "Tab" || !links?.length)
                return;
            if (event.shiftKey && document.activeElement === links[0]) {
                event.preventDefault();
                links[links.length - 1].focus();
            }
            else if (!event.shiftKey &&
                document.activeElement === links[links.length - 1]) {
                event.preventDefault();
                links[0].focus();
            }
        };
        document.addEventListener("keydown", trap);
        return () => document.removeEventListener("keydown", trap);
    }, [mobile]);
    const open = (symbol: string) => {
        setQuery("");
        setError("");
        router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`);
    };
    return (<div className={tw(`terminal${isAdmin ? " terminal-admin" : ""}`)} data-theme={theme}>
      <a className="skip-link fixed [z-index:100] [left:16px] [top:12px] [padding:12px] [background:var(--accent)] [color:var(--background)]! [transform:translateY(-180%)] [&:focus]:[transform:none]" href="#workspace">
        Đến nội dung
      </a>
      {mobile && (<button className="sidebar-scrim max-[700px]:fixed max-[700px]:[inset:0] max-[700px]:[z-index:39] max-[700px]:[background:#0009] max-[700px]:[border-width:0]" onClick={() => {
                setMobile(false);
                mobileButton.current?.focus();
            }} aria-label="Đóng menu"/>)}
      <aside className={tw(`terminal-sidebar ${mobile ? "is-open" : ""}`)} id="terminal-navigation" ref={sidebar}>
        <Link className="terminal-brand [.terminal-admin_&]:[flex-shrink:0] flex items-center [gap:11px] [padding:0_12px] [letter-spacing:-1px] [font-size:25px] [font-weight:600] [&_img]:[border-radius:4px] [&_img]:[object-fit:cover] [&_>_span_>_span]:[color:var(--accent)] max-[900px]:[font-size:22px] max-[900px]:[gap:8px] max-[900px]:[padding:0_8px] max-[900px]:[&_img]:[width:32px] max-[900px]:[&_img]:[height:32px] max-[700px]:[font-size:25px]" href="/" aria-label="QuanTik — Trang chủ">
          <img src="/quantik-logo.jpg" width="38" height="38" alt=""/>
          <span>
            Quan<span>Tik</span>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính">
          {links.map(({ href, label, icon: Icon }) => (<Link key={href} href={href} className={tw(pathname === href ? "active" : "")} aria-current={pathname === href ? "page" : undefined} onClick={() => setMobile(false)}>
              <Icon size={20}/>
              <span>{label}</span>
              {pathname === href && (<ChevronRight size={16} className="nav-chevron [margin-left:auto]"/>)}
            </Link>))}
        </nav>
        <div className="sidebar-foot [.terminal-admin_&]:[flex-shrink:0] [.terminal-admin_&]:[gap:12px] [.terminal-admin_&]:[padding-top:16px] [margin-top:auto] grid [gap:24px] [padding:24px_12px_0] [color:var(--muted)] [font-size:14px] [&_a]:flex [&_a]:items-center [&_a]:[gap:10px] [&_>_span]:[font-size:14px]">
          {isAdmin && <Link href="/dashboard">Về hệ thống <ArrowUpRight size={17}/></Link>}
          <Link href="/">
            Trang chủ <ArrowUpRight size={17}/>
          </Link>
          <span>© 2026 QuanTik</span>
        </div>
      </aside>
      <div className="terminal-workspace [margin-left:216px] min-w-0 max-[900px]:[margin-left:192px] max-[700px]:[margin-left:0]">
        <header className="terminal-topbar [height:80px] flex items-center [gap:24px] justify-between [padding:0_32px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [background:var(--surface)] max-[1250px]:[gap:16px] max-[1250px]:[padding:0_24px] max-[900px]:[padding:0_20px] max-[700px]:[height:auto] max-[700px]:[min-height:74px] max-[700px]:[padding:15px_18px] max-[700px]:[gap:12px] max-[700px]:flex-wrap">
          <div className="topbar-location [&_>_span]:flex [&_>_span]:items-center [&_>_span]:[gap:12px] [&_>_span]:[font-size:14px] [&_>_span]:[color:var(--muted)] [&_>_span]:whitespace-nowrap [&_b]:[font-weight:500] [&_b]:[color:var(--text)] max-[1250px]:[&_>_span_>_svg]:hidden max-[1250px]:[&_>_span]:[font-size:0] max-[1250px]:[&_b]:[font-size:14px] max-[900px]:hidden max-[700px]:flex max-[700px]:items-center max-[700px]:[&_>_span]:hidden">
            <button ref={mobileButton} className="icon-button mobile-menu hidden items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)] max-[700px]:flex" onClick={() => setMobile((value) => !value)} aria-label={mobile ? "Đóng menu" : "Mở menu"} aria-expanded={mobile} aria-controls="terminal-navigation">
              {mobile ? <X size={20}/> : <Menu size={20}/>}
            </button>
            <span>
              QuanTik <ChevronRight size={15}/> <b>{current}</b>
            </span>
          </div>
          <form className="global-search flex [gap:10px] items-center [background:var(--background)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [padding:9px_12px] [width:min(320px,_30vw)] [color:var(--muted)] relative [&_input]:[outline:none] [&_input]:[border-width:0] [&_input]:min-w-0 [&_input]:[flex:1] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:[font-size:14px] [&_input:focus-visible]:[outline:none] [&:focus-within]:[border-color:var(--accent)] [&_kbd]:[border-width:1px] [&_kbd]:[border-style:solid] [&_kbd]:[border-color:var(--border)] [&_kbd]:[border-radius:3px] [&_kbd]:[padding:0_5px] [&_kbd]:[font:13px_var(--font-mono),_monospace] max-[900px]:[width:260px] max-[700px]:[order:3] max-[700px]:w-full max-[700px]:[padding:10px_12px]" role="search" onSubmit={(event) => {
            event.preventDefault();
            const stock = stocks.find((s) => s.symbol === query.trim().toUpperCase());
            if (stock)
                open(stock.symbol);
            else
                setError("Chưa tìm thấy mã cổ phiếu này.");
        }}>
            <Search size={18}/>
            <label className="sr-only" htmlFor="global-search">
              Tra cứu mã cổ phiếu
            </label>
            <input id="global-search" ref={search} value={query} onChange={(event) => {
            setQuery(event.target.value.toUpperCase());
            setError("");
        }} placeholder="Tìm mã cổ phiếu" autoComplete="off"/>
            <kbd>/</kbd>
            {query && (<div className="search-results absolute [left:0] [right:0] [top:calc(100%_+_7px)] [z-index:30] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [box-shadow:0_20px_40px_#0004] [padding:6px] [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:[gap:10px] [&_button]:[background:none] [&_button]:[border-width:0] [&_button]:[color:var(--text)] [&_button]:[padding:11px_8px] [&_button]:[border-radius:4px] [&_button]:text-left [&_button:hover]:[background:var(--raised)] [&_button_span]:[font-size:14px] [&_button_span]:[color:var(--muted)] [&_button_span]:[flex:1] [&_p]:[padding:12px] [&_p]:[font-size:14px]">
                {stocks
                .filter((s) => `${s.symbol} ${s.name}`.toUpperCase().includes(query))
                .slice(0, 5)
                .map((stock) => (<button type="button" key={stock.symbol} onClick={() => open(stock.symbol)}>
                      <b>{stock.symbol}</b>
                      <span>{stock.name}</span>
                      <ArrowUpRight size={16}/>
                    </button>))}
                {!stocks.some((s) => `${s.symbol} ${s.name}`.toUpperCase().includes(query)) && <p>Chưa tìm thấy mã phù hợp.</p>}
              </div>)}
          </form>
          <div className="topbar-actions flex items-center [gap:14px] [flex-shrink:0] max-[700px]:[margin-left:auto]">
            <span className="mock-badge [font-size:14px] [color:var(--muted)] whitespace-nowrap flex items-center [gap:8px] [&:before]:[content:''] [&:before]:[width:6px] [&:before]:[height:6px] [&:before]:[border-radius:50%] [&:before]:[background:var(--accent)] max-[700px]:[font-size:14px]">{isAdmin ? "Quản trị" : pathname === "/screener" ? "Kết quả định kỳ" : pathname === "/analysis" ? "Yêu cầu phân tích" : pathname === "/charts" ? "Biểu đồ" : pathname === "/dashboard" ? "Bảng điện AGR" : "Tài khoản"}</span>
            <SessionMenu role={isAdmin ? "admin" : "user"}/><button className="icon-button inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)]" onClick={toggleTheme} aria-label={theme === "dark" ? "Chuyển chế độ sáng" : "Chuyển chế độ tối"}>
              {theme === "dark" ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
          </div>
        </header>
        <main className="workspace-content [max-width:1660px] [padding:32px] [margin:0_auto] max-[1250px]:[padding:28px_24px] max-[900px]:[padding:26px_20px] max-[700px]:[padding:24px_18px_32px]" id="workspace">
          {error && (<p className="error-message" role="alert">
              {error}
            </p>)}
          {isAdmin ? children : <ProfileGate>{children}</ProfileGate>}
        </main>
      </div>
    </div>);
}

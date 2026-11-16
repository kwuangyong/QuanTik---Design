"use client";
import type { ReactNode } from "react";
import { usePreferences } from "../preferences";
export function AuthSurface({ children }: {
    children: ReactNode;
}) {
    const { theme } = usePreferences();
    return <div className="terminal auth-surface [overflow-x:clip] [font-family:var(--font-sans),_system-ui,_sans-serif] [color:var(--text)] [background:var(--background)] [min-height:100dvh] [font-size:15px] [line-height:1.55] [color-scheme:dark] [&[data-theme='light']]:[color-scheme:light] [&_:focus-visible]:[outline:2px_solid_var(--accent,_#ff914d)] [&_:focus-visible]:[outline-offset:4px] [&_a]:[text-decoration:none] [&_a]:[color:inherit] [&_select]:[border-width:1px] [&_select]:[border-style:solid] [&_select]:[border-color:var(--border)] [&_select]:[border-radius:4px] [&_select]:[background:var(--background)] [&_select]:[color:var(--text)] [&_select]:[font-size:14px] [&_select]:[padding:9px_26px_9px_12px] [&_select]:[max-width:100%] motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*]:[animation:none]!" data-theme={theme}><main className="auth-stage [min-height:100dvh] grid [place-items:center] [padding:32px_20px] box-border">{children}</main></div>;
}

"use client";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { track } from "@/lib/analytics";

// Shared marketing primitives. Sizes and colours come from tokens in globals.css (@theme).

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-2 font-mono text-eyebrow uppercase text-signal ${className}`}>
    <i aria-hidden="true" className="block size-1.5 rounded-full bg-signal" />{children}
  </span>;
}

export function SectionHeader({ kicker, title, lead, aside, center = false }: { kicker: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode; center?: boolean }) {
  return <div className={`mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between max-md:mb-8 ${center ? "items-center text-center md:flex-col md:items-center" : ""}`}>
    <div className={center ? "max-w-2xl" : "max-w-3xl"}>
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-ink md:text-4xl [&_em]:not-italic [&_em]:text-brand">{title}</h2>
      {lead && <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">{lead}</p>}
    </div>
    {aside}
  </div>;
}

export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`scroll-mt-24 border-t border-line py-20 max-md:py-14 ${className}`}>{children}</section>;
}

const base = "inline-flex min-h-12 items-center justify-center gap-3 whitespace-nowrap rounded-md px-5 text-base font-semibold transition-[background,transform,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-safe:hover:-translate-y-0.5";
export const buttonStyles = {
  primary: `${base} bg-brand text-brand-ink hover:bg-brand-hover`,
  secondary: `${base} border border-line-strong bg-panel-raised text-ink hover:border-ink-subtle`,
  ghost: `${base} px-3 text-ink-muted hover:text-ink`,
};

type Variant = keyof typeof buttonStyles;
export function CtaLink({ href, variant = "primary", location, className = "", children, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; location: string }) {
  return <Link href={href} className={`${buttonStyles[variant]} ${className}`} onClick={() => track("cta_click", { location, target: String(href) })} {...rest}>{children}</Link>;
}

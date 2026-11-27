"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { fillGlossaryExample, glossaryById } from "@/lib/quant-glossary";
import styles from "./quant-glance.module.css";

// Glossary tooltip for the V2 reader. Opens on hover/focus/tap, closes with Esc, outside click or the close button.
// Text comes only from quant-glossary.ts; the example line appears only when every slot has a real value.
export function QuantTerm({ id, values, children }: { id: string; values?: Readonly<Record<string, string | number | null | undefined>>; children: ReactNode }) {
  const entry = glossaryById(id);
  const uid = useId(), root = useRef<HTMLSpanElement>(null), button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setPinned(false); button.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setPinned(false); } };
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  if (!entry) return <>{children}</>;
  const example = entry.legal ? null : fillGlossaryExample(entry, values ?? {});
  const close = () => { setOpen(false); setPinned(false); button.current?.focus(); };
  return <span ref={root} className={styles.termRoot} onPointerLeave={event => { if (event.pointerType === "mouse" && !pinned) setOpen(false); }}>
    <button ref={button} type="button" data-quant-term className={styles.term} aria-expanded={open} aria-describedby={open ? uid : undefined}
      onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
      onFocus={() => setOpen(true)} onBlur={event => { if (!pinned && !root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onClick={() => { if (open && pinned) { setOpen(false); setPinned(false); } else { setOpen(true); setPinned(true); } }}>{children}</button>
    {open && <span id={uid} role="tooltip" className={styles.pop}>
      <button type="button" className={styles.popClose} aria-label="Đóng giải thích" onClick={close}>×</button>
      <strong className={styles.popTitle}>{entry.term}: {entry.plain}</strong>
      <span className={styles.popText}>{entry.meaning}</span>
      {example && <span className={styles.popEx}>Ví dụ: {example}</span>}
      <a className={styles.popMore} href={`/analysis/guide#term-${id}`} target="_blank" rel="noopener">Đọc thêm</a>
    </span>}
  </span>;
}

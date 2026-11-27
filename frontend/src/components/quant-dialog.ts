"use client";
import { useEffect, type RefObject } from "react";

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Shared by the "Cách đọc" drawer and the tour: Esc closes, Tab and Shift+Tab stay inside, and focus returns to the control that opened it.
export function useDialog(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const root = ref.current, opener = document.activeElement as HTMLElement | null;
    if (!root) return;
    const items = () => [...root.querySelectorAll<HTMLElement>(focusable)].filter(el => el.offsetParent !== null || el === document.activeElement);
    const first = items()[0];
    (first ?? root).focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const list = items();
      if (!list.length) { event.preventDefault(); root.focus(); return; }
      const head = list[0], tail = list[list.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === head || !root.contains(active))) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && (active === tail || !root.contains(active))) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

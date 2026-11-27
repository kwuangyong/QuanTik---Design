"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./quant-glance.module.css";

// "Giảm hiệu ứng" (G2-ux-spec 8.3): an in-app switch that only ever adds reduction on top of prefers-reduced-motion.
// The choice is kept in localStorage (try/catch) and mirrored as data-reduce-motion on <html> so CSS can switch motion off.
export const reduceMotionKey = "quantik.quant.reduceMotion";
export const motionEvent = "quantik:motion";

/** True when the system asks for reduced motion or the viewer turned "Giảm hiệu ứng" on. Safe to call on the server. */
export function reducedMotionNow(): boolean {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true; } catch { /* ignore */ }
  return document.documentElement.dataset.reduceMotion === "true";
}

export function useReduceEffects(enabled = true): [boolean, (next: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    try { if (window.localStorage.getItem(reduceMotionKey) === "1") setOn(true); } catch { /* keep default */ }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (on) root.dataset.reduceMotion = "true"; else delete root.dataset.reduceMotion;
    window.dispatchEvent(new Event(motionEvent));
    return () => { delete root.dataset.reduceMotion; };
  }, [enabled, on]);
  const choose = useCallback((next: boolean) => {
    setOn(next);
    try { window.localStorage.setItem(reduceMotionKey, next ? "1" : "0"); } catch { /* not persisted */ }
  }, []);
  return [on, choose];
}

export function QuantReduceEffects({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return <button type="button" className={styles.toolBtn} aria-pressed={on} data-reduce-effects onClick={() => onChange(!on)}>Giảm hiệu ứng</button>;
}

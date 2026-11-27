"use client";

// Motion follows the system prefers-reduced-motion setting only (the in-app switch was removed by product decision).
export const reduceMotionKey = "quantik.quant.reduceMotion";
export const motionEvent = "quantik:motion";

/** True when the system asks for reduced motion or the viewer turned "Giảm hiệu ứng" on. Safe to call on the server. */
export function reducedMotionNow(): boolean {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true; } catch { /* ignore */ }
  return document.documentElement.dataset.reduceMotion === "true";
}

"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./quant-glance.module.css";

export type ReadingLevel = "summary" | "why" | "deep";
export const readingLevels: { id: ReadingLevel; label: string }[] = [{ id: "summary", label: "Tóm tắt" }, { id: "why", label: "Hiểu vì sao" }, { id: "deep", label: "Chuyên sâu" }];
export const readingLevelKey = "quantik.quant.readingLevel";
const isLevel = (v: unknown): v is ReadingLevel => v === "summary" || v === "why" || v === "deep";

// Default is "summary" on the server and first paint; the stored choice is applied after mount. Storage may be blocked or throw.
export function useReadingLevel(enabled = true): [ReadingLevel, (level: ReadingLevel) => void] {
  const [level, setLevel] = useState<ReadingLevel>("summary");
  useEffect(() => { if (!enabled) return; try { const stored = window.localStorage.getItem(readingLevelKey); if (isLevel(stored)) setLevel(stored); } catch { /* keep default */ } }, [enabled]);
  const choose = useCallback((next: ReadingLevel) => { setLevel(next); try { window.localStorage.setItem(readingLevelKey, next); } catch { /* not persisted */ } }, []);
  return [level, choose];
}

export function QuantReadingLevel({ level, onChange }: { level: ReadingLevel; onChange: (level: ReadingLevel) => void }) {
  return <div role="group" aria-label="Mức đọc" className={styles.levels} data-quant-levels>
    {readingLevels.map(item => <button key={item.id} type="button" aria-pressed={level === item.id} data-level={item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>;
}

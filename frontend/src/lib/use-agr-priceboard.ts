"use client";

import { useEffect, useState } from "react";
import { stocks, type Stock } from "./mock-data";
import { AGR_INDEX_DEFINITIONS, connectAgrPriceboard, expandAgrIndexRecord, expandAgrRecord, mergeAgrRecord, toAgrIndices, toAgrStock, type AgrRecord } from "./agr-priceboard";

export function useAgrPriceboard() {
  const [items, setItems] = useState<Stock[]>([]);
  const [status, setStatus] = useState("Đang kết nối AGR…");
  const [tradingDate, setTradingDate] = useState("");
  const [indices, setIndices] = useState(() => toAgrIndices(new Map()));
  const [indexStatus, setIndexStatus] = useState("Đang tải chỉ số…");
  useEffect(() => {
    let disposed = false, ready = false, synced = false, attempts = 0;
    let records = new Map<string, AgrRecord>();
    let indexRecords = new Map<string, AgrRecord>();
    const metadata = new Map(stocks.map((stock) => [stock.symbol, stock]));
    let retry: ReturnType<typeof setTimeout> | undefined;
    let snapshotRetry: ReturnType<typeof setTimeout> | undefined;
    let flush: ReturnType<typeof setTimeout> | undefined;
    let stopSocket: (() => void) | undefined;
    let request: AbortController | undefined;
    const publish = () => {
      if (disposed || flush) return;
      flush = setTimeout(() => {
        flush = undefined;
        if (disposed) return;
        const rows = [...records.values()].map((row) => toAgrStock(row, metadata.get(String(row.symbol)))).filter((row): row is Stock => row !== null);
        setItems(rows);
        setIndices(toAgrIndices(indexRecords));
        setTradingDate(String([...records.values()].find((row) => row.tradingdate)?.tradingdate ?? ""));
      }, 200);
    };
    const mergeIndices = (rows: AgrRecord[]) => {
      for (const raw of rows) {
        const row = expandAgrIndexRecord(raw), code = String(row.marketCode ?? "");
        if (AGR_INDEX_DEFINITIONS.some(item => item.code === code)) indexRecords.set(code, mergeAgrRecord(indexRecords.get(code), row));
      }
      publish();
    };
    const merge = (rows: AgrRecord[]) => {
      for (const raw of rows) {
        const row = expandAgrRecord(raw), symbol = String(row.symbol ?? "");
        if (symbol) records.set(symbol, mergeAgrRecord(records.get(symbol), row));
      }
      publish();
    };
    const snapshot = async (reset = false) => {
      request?.abort();
      const controller = new AbortController(); request = controller;
      clearTimeout(snapshotRetry);
      synced = false;
      // Keep updates received while the snapshot is in flight, including on a new session.
      const buffered: AgrRecord[] = [];
      const bufferedIndices: AgrRecord[] = [];
      pending = buffered;
      pendingIndices = bufferedIndices;
      setIndexStatus("Đang cập nhật chỉ số…");
      if (ready) setStatus("Đang đồng bộ AGR…");
      try {
        const response = await fetch("/api/market/agr", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("snapshot");
        const body = await response.json();
        if (!Array.isArray(body.records) || !body.records.length) throw new Error("snapshot");
        if (disposed || controller.signal.aborted) return;
        if (reset) records = new Map();
        merge(body.records); merge(buffered); pending = null;
        const receivedIndices = new Map<string, AgrRecord>((Array.isArray(body.indices) ? body.indices : []).map((raw: AgrRecord) => {
          const row = expandAgrIndexRecord(raw);
          return [String(row.marketCode), row];
        }));
        if (Array.isArray(body.indices)) {
          mergeIndices([...receivedIndices.values()]); mergeIndices(bufferedIndices);
        }
        pendingIndices = null;
        const complete = toAgrIndices(receivedIndices).every(row => row.value !== null && row.change !== null);
        setIndexStatus(complete ? "Chỉ số thị trường" : "Chưa cập nhật được chỉ số");
        if (!complete) snapshotRetry = setTimeout(() => { void snapshot(); }, 10000);
        synced = true;
        setStatus(ready ? "Đã kết nối AGR" : "AGR · Mất kết nối, đang thử lại…");
      } catch {
        if (disposed || controller.signal.aborted) return;
        pending = null;
        pendingIndices = null;
        setIndexStatus("Chưa cập nhật được chỉ số");
        setStatus("AGR · Chưa đồng bộ được dữ liệu, đang thử lại…");
        snapshotRetry = setTimeout(() => { void snapshot(reset); }, 10000);
      }
    };
    let pending: AgrRecord[] | null = null;
    let pendingIndices: AgrRecord[] | null = null;
    const connect = () => {
      if (disposed) return;
      setStatus("Đang kết nối AGR…");
      stopSocket = connectAgrPriceboard({
        onReady: () => { ready = true; attempts = 0; void snapshot(true); },
        onRecords: (rows) => { if (pending) pending.push(...rows); merge(rows); },
        onIndices: (rows) => { if (pendingIndices) pendingIndices.push(...rows); mergeIndices(rows); },
        onReset: () => { void snapshot(true); },
        onDisconnect: () => {
          if (disposed) return;
          ready = false;
          setIndexStatus("Kết nối gián đoạn · Đang thử lại…");
          setStatus(synced ? "AGR · Mất kết nối, đang thử lại…" : "AGR · Chưa có kết nối, đang thử lại…");
          retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts++) + Math.random() * 500);
        },
      });
    };
    void snapshot(); connect();
    const resume = () => { if (document.visibilityState === "visible") void snapshot(true); };
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true; request?.abort(); stopSocket?.();
      clearTimeout(retry); clearTimeout(snapshotRetry); clearTimeout(flush);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return { items, status, tradingDate, indices, indexStatus };
}

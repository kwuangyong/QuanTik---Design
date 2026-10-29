import type { Stock } from "./mock-data";

export type AgrRecord = Record<string, unknown>;
export const AGR_SOCKET_URL = "wss://trading.agr.vn/market/socket.io/?EIO=3&transport=websocket&__sails_io_sdk_version=1.2.1&__sails_io_sdk_platform=browser&__sails_io_sdk_language=javascript";
export const AGR_INDEX_DEFINITIONS = [
  { code: "HOSE", name: "VN-INDEX" }, { code: "30", name: "VN30" },
  { code: "UPCOM", name: "UPCOM" }, { code: "HNX", name: "HNX-INDEX" },
] as const;
export const AGR_TOPICS = ["e:HOSE", "e:HNX", "e:UPCOM", ...AGR_INDEX_DEFINITIONS.map(({ code }) => `idx:${code}`)];
export type AgrIndex = { name: string; value: number | null; change: number | null };

export function expandAgrIndexRecord(record: AgrRecord): AgrRecord {
  const aliases: Record<string, string> = { MC: "marketCode", MI: "marketIndex", IPC: "indexPercentChange", ICH: "indexChange", PPMI: "priorMarketIndex", TD: "tradingdate", t: "ts" };
  const expanded = Object.fromEntries(Object.entries(record).map(([key, value]) => [aliases[key] ?? key, value]));
  const code = String(expanded.marketCode ?? expanded.marketId ?? "");
  expanded.marketCode = ({ "10": "HOSE", "02": "HNX", "04": "UPCOM" } as Record<string, string>)[code] ?? code;
  return expanded;
}
export function toAgrIndices(records: Map<string, AgrRecord>): AgrIndex[] {
  return AGR_INDEX_DEFINITIONS.map(({ code, name }) => {
    const row = records.get(code);
    return { name, value: numberOrNull(row?.marketIndex), change: numberOrNull(row?.indexPercentChange) };
  });
}

const fields: Record<string, string> = {
  SB: "symbol", FN: "FullName", TD: "tradingdate", EX: "exchange", FC: "FloorCode",
  RE: "reference", CL: "ceiling", FL: "floor", CP: "closePrice", CV: "closeVol",
  CHP: "changePercent", CH: "change", TT: "totalTrading", TV: "totalTradingValue",
  OP: "open", HI: "high", LO: "low", FB: "foreignBuy", FS: "foreignSell", FR: "foreignRemain",
  B1: "bidPrice1", B2: "bidPrice2", B3: "bidPrice3", V1: "bidVol1", V2: "bidVol2", V3: "bidVol3",
  S1: "offerPrice1", S2: "offerPrice2", S3: "offerPrice3", U1: "offerVol1", U2: "offerVol2", U3: "offerVol3",
};
export function numberOrNull(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function expandAgrRecord(record: AgrRecord): AgrRecord {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [fields[key] ?? key, value]));
}
export function mergeAgrRecord(previous: AgrRecord | undefined, incoming: AgrRecord): AgrRecord {
  const next = expandAgrRecord(incoming);
  // Sequence numbers restart each trading day. Within a session, ignore stale snapshots/packets.
  if (previous && (!previous.tradingdate || !next.tradingdate || next.tradingdate === previous.tradingdate)) {
    const oldTime = numberOrNull(previous.ts), newTime = numberOrNull(next.ts);
    if (oldTime !== null && newTime !== null && newTime < oldTime) return { ...next, ...previous };
    const oldSeq = numberOrNull(previous.s), newSeq = numberOrNull(next.s);
    if (oldSeq !== null && newSeq !== null && newSeq < oldSeq) return { ...next, ...previous };
  }
  return { ...previous, ...next };
}
export function toAgrStock(record: AgrRecord, metadata?: Stock): Stock | null {
  const symbol = String(record.symbol ?? "");
  const exchange = String(record.exchange ?? ({ "10": "HOSE", "02": "HNX", "04": "UPCOM" } as Record<string, string>)[String(record.FloorCode)] ?? "");
  if (!/^[A-Z][A-Z0-9]{1,4}$/.test(symbol) || !["HOSE", "HNX", "UPCOM"].includes(exchange)) return null;
  const price = (value: unknown) => { const n = numberOrNull(value); return n === null ? null : n / 1000; };
  const quote = (side: "bid" | "offer", level: number) => {
    const raw = record[`${side}Price${level}`];
    return { price: price(raw), volume: numberOrNull(record[`${side}Vol${level}`]), priceLabel: ["ATO", "ATC", "PLO"].includes(String(raw)) ? String(raw) : undefined };
  };
  const reference = price(record.reference), close = price(record.closePrice);
  return {
    symbol, name: String(record.FullName ?? metadata?.name ?? symbol), exchange,
    sector: metadata?.sector ?? "Chưa phân ngành", quantScore: null,
    reference, ceiling: price(record.ceiling), floor: price(record.floor), price: close,
    change: reference && close !== null && close > 0 ? (close - reference) / reference * 100 : numberOrNull(record.changePercent),
    volume: numberOrNull(record.totalTrading), matchedVolume: numberOrNull(record.closeVol),
    value: numberOrNull(record.totalTradingValue) === null ? null : Number(record.totalTradingValue) / 1e6,
    open: price(record.open), high: price(record.high), low: price(record.low),
    foreignBuy: numberOrNull(record.foreignBuy), foreignSell: numberOrNull(record.foreignSell), foreignRoom: numberOrNull(record.foreignRemain),
    bid: [1, 2, 3].map((level) => quote("bid", level)), ask: [1, 2, 3].map((level) => quote("offer", level)),
  };
}

// AGR currently uses Engine.IO 3 / Socket.IO 2 over WebSocket. No polling or login channel.
export function connectAgrPriceboard(callbacks: {
  onReady: () => void;
  onRecords: (records: AgrRecord[]) => void;
  onIndices: (records: AgrRecord[]) => void;
  onDisconnect: () => void;
  onReset: () => void;
}, createSocket: (url: string) => WebSocket = (url) => new WebSocket(url)) {
  const socket = createSocket(AGR_SOCKET_URL);
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let deadline = 85000;
  const armWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(() => socket.close(), deadline); };
  const handshake = setTimeout(() => socket.close(), 15000);
  socket.onmessage = ({ data }) => {
    if (typeof data !== "string") return;
    try {
      if (data.startsWith("0")) {
        const hello = JSON.parse(data.slice(1));
        const interval = Math.max(1000, Math.min(60000, Number(hello.pingInterval) || 25000));
        deadline = interval + Math.max(1000, Math.min(120000, Number(hello.pingTimeout) || 60000));
        clearInterval(heartbeat);
        heartbeat = setInterval(() => { if (socket.readyState === 1) socket.send("2"); }, interval);
        armWatchdog();
      } else if (data === "3") armWatchdog();
      else if (data === "40") {
        socket.send(`420${JSON.stringify(["get", { url: "/client/subscribe", method: "get", headers: {}, data: { op: "subscribe", args: AGR_TOPICS } }])}`);
      } else if (data.startsWith("430")) {
        const [ack] = JSON.parse(data.slice(3));
        if (ack?.statusCode !== 200) { socket.close(); return; }
        clearTimeout(handshake);
        callbacks.onReady();
      } else if (data.startsWith("42")) {
        const [event, payload] = JSON.parse(data.slice(2));
        if (event === "i" && Array.isArray(payload?.d)) callbacks.onRecords(payload.d.filter((row: unknown) => row && typeof row === "object"));
        if (event === "idx" && payload?.a === "u" && Array.isArray(payload.d)) callbacks.onIndices(payload.d.filter((row: unknown) => row && typeof row === "object"));
        if (["initday", "quotes_change", "system_open"].includes(event)) callbacks.onReset();
      } else if (data === "41" || data.startsWith("44")) socket.close();
    } catch { /* Ignore malformed frames; heartbeat still detects a dead connection. */ }
  };
  const clearTimers = () => { clearInterval(heartbeat); clearTimeout(watchdog); clearTimeout(handshake); };
  socket.onerror = () => socket.close();
  socket.onclose = () => { clearTimers(); callbacks.onDisconnect(); };
  return () => { clearTimers(); socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.close(); };
}

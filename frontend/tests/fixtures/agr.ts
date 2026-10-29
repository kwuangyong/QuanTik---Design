import type { Page, WebSocketRoute } from "@playwright/test";
import market from "../../../backend/mock/market.json";

export async function agrFixture(page: Page) {
  const state = { snapshots: 0, connections: [] as WebSocketRoute[], subscriptions: [] as unknown[], fail: false, failIndices: false };
  const indices = [
    { marketCode: "HOSE", marketIndex: "1705.91", indexPercentChange: "0.45", ts: 100 },
    { marketCode: "30", marketIndex: "1855.41", indexPercentChange: "0.63", ts: 100 },
    { marketCode: "UPCOM", marketIndex: "124.87", indexPercentChange: "0.58", ts: 100 },
    { marketCode: "HNX", marketIndex: "259.13", indexPercentChange: "-0.06", ts: 100 },
  ];
  const records = market.stocks.map((stock) => ({
    symbol: stock.symbol, FullName: stock.name, exchange: stock.exchange, tradingdate: "16/10/2026",
    reference: stock.reference === null ? null : stock.reference * 1000,
    closePrice: stock.price === null ? null : stock.price * 1000,
    ceiling: stock.ceiling === null ? null : stock.ceiling * 1000,
    floor: stock.floor === null ? null : stock.floor * 1000,
    totalTrading: stock.volume, totalTradingValue: stock.value === null ? null : stock.value * 1e6,
    bidPrice1: 58000, bidVol1: 100, ts: 100, s: 10,
  }));
  await page.route("**/api/market/agr", route => {
    state.snapshots++;
    return route.fulfill({ status: state.fail ? 502 : 200, contentType: "application/json", body: JSON.stringify(state.fail ? { error: "unavailable" } : { records, indices: state.failIndices ? null : indices }) });
  });
  await page.routeWebSocket("wss://trading.agr.vn/market/socket.io/**", socket => {
    state.connections.push(socket);
    socket.onMessage(message => {
      if (message === "2") socket.send("3");
      if (typeof message === "string" && message.startsWith("420")) {
        state.subscriptions.push(JSON.parse(message.slice(3)));
        socket.send('430[{"statusCode":200}]');
      }
    });
    socket.send('0{"sid":"fixture","pingInterval":25000,"pingTimeout":60000}');
    socket.send("40");
  });
  return state;
}

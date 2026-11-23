import snapshot from "@/content/agr-equities.json";
import type { AgrEquity, AgrEquitySnapshot } from "./agr-priceboard";
import type { Portfolio } from "./portfolio-engine";

// AGR board, HOSE/HNX/UPCoM, regular equities (StockType 2). Prices are already in VND.
export const portfolioMarketSnapshot: AgrEquitySnapshot = {
  tradingDate: snapshot.tradingDate,
  items: snapshot.items.map(([symbol, name, exchange, price]) => ({
    symbol: String(symbol), name: String(name), exchange: String(exchange), price: Number(price),
  })),
};

export function portfolioValuation(portfolio: Portfolio, quotes: ReadonlyMap<string, Pick<AgrEquity, "price">>) {
  const rows = portfolio.positions.map(position => {
    const price = quotes.get(position.symbol)?.price ?? null;
    const invested = position.quantity * position.cost;
    const value = price === null ? null : position.quantity * price;
    const profit = value === null ? null : value - invested;
    return { ...position, price, invested, value, profit };
  });
  const invested = rows.reduce((sum, row) => sum + row.invested, 0);
  const equity = rows.every(row => row.value !== null) ? rows.reduce((sum, row) => sum + (row.value ?? 0), 0) : null;
  const total = equity === null ? null : equity + portfolio.cash;
  const profit = equity === null ? null : equity - invested;
  const holdings = rows.map(row => ({ ...row, weight: total && row.value !== null ? row.value / total : null }));
  return { holdings, invested, total, profit };
}

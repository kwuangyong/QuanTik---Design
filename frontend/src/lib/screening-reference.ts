import columns from "@/content/industry-watchlist.json";

// Matches SectorEngine.THEMATIC_GROUPS at Quant-VN-Stock-Market d0694a5.
// Membership is presentation metadata, never a replacement for API sector.
const thematicNames = new Set(["BĐS Khu công nghiệp", "Viettel", "FPT nhóm", "Vingroup", "Tự doanh Tuấn Mượt", "List CMSC"]);
export const watchlistGroups = columns.map(column => ({ ...column, kind: thematicNames.has(column.name) ? "thematic" as const : "sector" as const }));
export const watchlistGroupCounts = {
  sectors: watchlistGroups.filter(group => group.kind === "sector").length,
  thematic: watchlistGroups.filter(group => group.kind === "thematic").length,
};
export function watchlistMemberships(symbol: string) {
  const code = symbol.trim().toUpperCase();
  return watchlistGroups.filter(group => group.symbols.includes(code));
}

export function screeningCompanyName(item?: { symbol: string; name?: string | null; company_name?: string | null }) {
  if (!item) return undefined;
  return [item.company_name, item.name].find(value => typeof value === "string" && value.trim() && value.trim().toUpperCase() !== item.symbol.trim().toUpperCase())?.trim();
}

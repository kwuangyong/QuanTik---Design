import { toAgrEquities } from "@/lib/agr-priceboard";

export const runtime = "nodejs";
const instruments = "https://trading.agr.vn/datafeed/instruments";
const responseHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const portfolio = new URL(request.url).searchParams.get("view") === "portfolio";
  try {
    const [upstream, indices] = await Promise.all([
      fetch(instruments, { cache: "no-store", signal: AbortSignal.timeout(portfolio ? 30000 : 15000) }),
      portfolio ? null : fetch("https://trading.agr.vn/datafeed/indexsnaps/HOSE,30,UPCOM,HNX", { cache: "no-store", signal: AbortSignal.timeout(15000) })
        .then(async response => {
          if (!response.ok) return null;
          const body = await response.json();
          return body.s === "ok" && Array.isArray(body.d) ? body.d : null;
        }).catch(() => null),
    ]);
    if (!upstream.ok) throw new Error("AGR unavailable");
    const payload = await upstream.json();
    if (payload.s !== "ok" || !Array.isArray(payload.d) || !payload.d.length) throw new Error("Invalid AGR snapshot");
    if (portfolio) {
      const snapshot = toAgrEquities(payload.d);
      if (!snapshot.items.length || !snapshot.tradingDate) throw new Error("Invalid AGR equity snapshot");
      return Response.json(snapshot, { headers: responseHeaders });
    }
    return Response.json({ records: payload.d, indices }, { headers: responseHeaders });
  } catch {
    return Response.json({ error: "Không tải được bảng điện AGR. Đang thử kết nối lại." }, { status: 502, headers: responseHeaders });
  }
}

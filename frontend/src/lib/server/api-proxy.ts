import { gateCookie } from "./admin-cookie";
// Fixed upstream and explicit routes: this handler is not an arbitrary HTTP proxy.
const routes: [string, RegExp][] = [
  ["GET", /^(analyses|analyses\/options|analyses\/[a-zA-Z0-9-]+|reports\/[a-zA-Z0-9-]+)$/],
  ["POST", /^analyses$/],
  ["PATCH", /^me\/profile$/],
  ["GET", /^admin\/(screening\/backfill-options|scheduled-tasks\/[a-zA-Z0-9-]+)$/],
  ["POST", /^admin\/screening\/backfills$/],
  ["GET", /^screenings\/(latest|[a-zA-Z0-9-]+\/(results|symbols\/[A-Za-z0-9]{2,16}))$/],
  ["GET", /^(plans|me|me\/(usage|entitlements)|subscription|orders|orders\/[a-zA-Z0-9-]+|payments)$/],
  ["POST", /^(orders|orders\/[a-zA-Z0-9-]+\/cancel)$/],
  ["GET", /^auth\/google\/start$/],
  ["POST", /^auth\/(refresh|logout|demo\/exchange)$/],
  ["GET", /^admin\/demo\/codes$/],
  ["POST", /^admin\/demo\/(codes|codes\/[a-zA-Z0-9-]+\/revoke|reset)$/],
  ["POST", /^admin\/auth\/(login|refresh|logout)$/],
  ["GET", /^admin\/(me|users|jobs|payments|subscriptions|orders|orders\/[a-zA-Z0-9-]+|plans|reconciliation|audit|scheduled-tasks|operations\/health)$/],
  ["POST", /^admin\/(plans|plans\/[a-zA-Z0-9-]+\/availability|users\/[a-zA-Z0-9-]+\/state|reconciliation\/[a-zA-Z0-9-]+\/apply)$/],
  ["GET", /^admin\/integrations\/(sepay|vnstock)$/],
  ["PATCH", /^admin\/integrations\/(sepay|vnstock)$/],
  ["GET", /^admin\/configs\/(OPERATIONS|TRADING_CALENDAR)$/],
  ["POST", /^admin\/configs\/(OPERATIONS|TRADING_CALENDAR)\/(versions|[a-f0-9]{64}\/activate)$/],
];

export function allowed(method: string, path: string) {
  return routes.some(([verb, pattern]) => method === verb && pattern.test(path));
}
export function appOrigin(request: Request) {
  return new URL(process.env.QUANTIK_APP_ORIGIN || request.url).origin;
}
export function upstreamOrigin() {
  return new URL(process.env.QUANTIK_UPSTREAM_ORIGIN || "http://localhost:8000").origin;
}
function failure(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}
export function copyCookies(source: Response, headers: Headers) {
  for (const cookie of source.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
}
export async function upstream(path: string, init: RequestInit = {}) {
  const base = process.env.QUANTIK_API_URL || "http://127.0.0.1:8000";
  const headers = new Headers(init.headers);
  headers.set("Origin", upstreamOrigin());
  return fetch(new URL(`/api/v1/${path}`, base), {
    ...init, headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000),
  });
}
export async function proxy(request: Request, path: string) {
  if (!allowed(request.method, path)) return failure(404, "NOT_FOUND");
  if (request.method !== "GET" && request.headers.get("origin") !== appOrigin(request)) {
    return failure(403, "INVALID_ORIGIN");
  }
  // Strip unrelated cookies, forwarding only the cookies required by this auth flow.
  const role = path.startsWith("admin/") ? "admin" : "user";
  const names = [`quantik_${role}_refresh`, ...(path === "auth/google/start" ? ["quantik_oauth_browser"] : [])];
  const cookie = (request.headers.get("cookie") || "").split(";").map(v => v.trim())
    .filter(v => names.includes(v.split("=")[0])).join("; ");
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (cookie) headers.set("Cookie", cookie);
  // The deployed edge overwrites this header; BE also verifies our private peer.
  const clientIp = request.headers.get("x-real-ip");
  if (clientIp) headers.set("X-Real-IP", clientIp);
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 131072) return failure(413, "REQUEST_TOO_LARGE");
    const response = await upstream(path + new URL(request.url).search, { method: request.method, headers, body });
    if (response.status >= 300 && response.status < 400) return failure(502, "UPSTREAM_REDIRECT");
    const outgoing = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-type", "x-request-id", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    copyCookies(response, outgoing);
    const bytes = response.status === 204 ? null : await response.arrayBuffer();
    if (response.ok && /^admin\/auth\/(login|refresh)$/.test(path) && bytes) {
      const token = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof token.access_token === "string" && Number.isFinite(token.expires_in)) {
        outgoing.append("Set-Cookie", gateCookie(token.access_token, token.expires_in, appOrigin(request).startsWith("https:")));
      }
    }
    if ((path === "admin/auth/logout" && response.ok) || (path === "admin/auth/refresh" && response.status === 401)) {
      outgoing.append("Set-Cookie", gateCookie("", 0, appOrigin(request).startsWith("https:")));
    }
    return new Response(bytes, { status: response.status, headers: outgoing });
  } catch {
    return failure(502, "BACKEND_UNAVAILABLE");
  }
}

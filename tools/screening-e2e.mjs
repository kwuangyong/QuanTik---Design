// Full browser -> Next proxy -> FastAPI -> SQLite test, with isolated fixture data.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.resolve(root, "../quantik-server");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "quantik-screening-e2e-"));
const python = process.env.SCREENING_E2E_PYTHON || path.join(os.homedir(), ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const children = [];
const port = Number(process.env.SCREENING_E2E_PORT || 18317);
const origin = `http://127.0.0.1:${port}`;
const apiOrigin = `http://127.0.0.1:${port+1}`;
let browser;
const environment = { ...process.env, PYTHONPATH: path.join(server, "backend/src") };
async function ready(url) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Test service not ready: " + url);
}
function launch(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: "ignore" });
  children.push(child); return child;
}
try {
  // This stdout contains a test refresh credential. Keep it only in memory.
  const output = execFileSync(python, ["backend/tests/browser_screening_seed.py", directory], { cwd: server, env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const state = JSON.parse(output.trim().split(/\r?\n/).at(-1));
  launch(python, ["-m", "uvicorn", "service.api:create_app", "--factory", "--host", "127.0.0.1", "--port", String(port+1), "--no-access-log", "--log-level", "error"], server, {
    ...environment, QUANTIK_ENVIRONMENT: "test", QUANTIK_DATABASE_URL: state.database_url,
    QUANTIK_JWT_PRIVATE_KEY_PATH: state.private, QUANTIK_JWT_PUBLIC_KEY_PATH: state.public,
    QUANTIK_ALLOW_FIXTURE_ANALYSIS: "true", QUANTIK_PUBLIC_ORIGIN: origin,
  });
  await ready(`${apiOrigin}/health/ready`);
  launch(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], path.join(root, "frontend"), {
    ...process.env, QUANTIK_API_URL: apiOrigin, QUANTIK_UPSTREAM_ORIGIN: origin, QUANTIK_APP_ORIGIN: origin,
  });
  await ready(`${origin}/screener`);
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([{ name: "quantik_user_refresh", value: state.refresh_cookie, domain: "127.0.0.1", path: "/api/v1/auth", httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors = [], results = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (/\/screenings\/[^/]+\/(board$|results)/.test(response.url())) results.push(response); });
    await page.goto(`${origin}/screener`);
    assert.equal(await page.getByRole("button", { name: /Kích hoạt quét|Quét lại/ }).count(), 0);
    await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
    await page.getByRole("button", { name: "FPT", exact: true }).first().waitFor();
    const best = page.getByRole("region", { name: "5 mã xếp hạng cao nhất", exact: true });
    const worst = page.getByRole("region", { name: "5 mã cần thận trọng", exact: true });
    assert.equal(await best.locator("tbody tr").count(), 5);
    assert.equal(await worst.locator("tbody tr").count(), 5);
    assert.equal(await page.getByRole("navigation", { name: "Phân trang screening" }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Quét toàn sàn", exact: true }).count(), 0);
    assert.equal(await page.getByText("Xem tiêu chí và lý do", { exact: true }).count(), 0);
    assert.equal(await page.getByLabel("Ca công bố", { exact: true }).count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // One metered /board read, or two /results reads on a server without /board (its 404 is not counted).
    const served = results.filter(response => response.status() !== 404);
    assert(served.length === 1 || served.length === 2, `unexpected screening reads: ${served.length}`);
    for (const response of served) {
      assert.equal(response.status(), 200);
      const payload = await response.json();
      assert.equal(payload.run_id, state.run_id);
      const items = payload.overall ? [...payload.overall, ...payload.distribution] : payload.items;
      if (payload.overall) assert(payload.overall.length === 5 && payload.distribution.length === 5);
      else assert(payload.items.length === 5 && ["OVERALL", "DISTRIBUTION"].includes(payload.group));
      assert(items.every(item => item.groups && !item.policy_version && !item.groups.STRONG.criteria));
    }
    fs.mkdirSync(path.join(root, "frontend/test-results/screening"), { recursive: true });
    await page.screenshot({ path: path.join(root, `frontend/test-results/screening/backend-${viewport.width}.png`), fullPage: true });
    const detailResponse = page.waitForResponse(response => /\/symbols\/FPT$/.test(response.url()));
    await best.getByRole("button", { name: "FPT", exact: true }).click();
    const response = await detailResponse;
    assert.equal(response.status(), 200);
    const detail = await response.json();
    assert.equal(detail.run_id, state.run_id);
    assert(detail.assessment.investor_note && detail.market.regime_label);
    await page.getByRole("dialog").getByRole("heading", { name: "Bối cảnh VNINDEX", exact: true }).waitFor();
    assert(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth+1));
    await page.screenshot({ path: path.join(root, `frontend/test-results/screening/backend-modal-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    const entitlement = await page.evaluate(async () => {
      const refresh = await fetch("/api/v1/auth/refresh", { method: "POST" });
      const session = await refresh.json();
      const response = await fetch("/api/v1/me/entitlements", { headers: { Authorization: "Bearer " + session.access_token } });
      const data = await response.json(); return { status: response.status, created: data.created_today, remaining: data.remaining };
    });
    assert.deepEqual(entitlement, { status: 200, created: 0, remaining: 20 });
    assert.deepEqual(errors, []);
    console.log(`Fixture API browser ${viewport.width}px: two top-five tables from 80 symbols via ${served.length === 1 ? "/board" : "/results fallback"}, detail modal, cookie/proxy authorization, analysis quota unchanged, no overflow/errors PASS`);
    // Rotation changed the cookie; preserve it for the next independent viewport.
    state.refresh_cookie = (await context.cookies()).find(cookie => cookie.name === "quantik_user_refresh").value;
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  for (const child of children.reverse()) {
    if (process.platform === "win32") { try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); } catch {} }
    else child.kill("SIGTERM");
  }
  const resolved = path.resolve(directory), parent = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith("quantik-screening-e2e-")) throw new Error("Unexpected cleanup directory");
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

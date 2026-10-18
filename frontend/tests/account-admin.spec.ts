import { test, expect, type Page, type Route } from "@playwright/test";

test("Admin: chờ Retry-After, giữ mật khẩu và đăng nhập lại sau khóa", async ({ page }) => {
  await page.clock.install();
  await fixture(page);
  let posts = 0;
  await page.route("**/api/v1/admin/auth/login", async route => {
    posts++;
    if (posts === 1) return route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "3", "X-Request-ID": "login-rate-fixture" }, body: JSON.stringify({ code: "LOGIN_RATE_LIMITED" }) });
    await route.fallback();
  });
  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập").fill("operator");
  await page.getByLabel("Mật khẩu").fill("fixture-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: /Thử lại sau/ })).toBeDisabled();
  await expect(page.getByLabel("Mật khẩu")).toHaveValue("fixture-password");
  await expect(page.locator(".account-notice[role=alert]")).toContainText("login-rate-fixture");
  await page.clock.fastForward(4000);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect(posts).toBe(2);
});

const accountId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";
const plan = { id: planId, name: "Gói kiểm thử", price_vnd: 150000, duration_days: 30, analysis_quota: 25, daily_request_limit: 25, replaces_plan_id: null, active_limit: 2, available: true, currency: "VND", features: { screening: true, analysis: true } };
const token = { access_token: "fixture-access-only", expires_in: 900 };
async function fixture(page: Page, options: { user?: boolean; admin?: boolean } = {}) {
  const origin = String(test.info().project.use.baseURL || "http://127.0.0.1:3107");
  if (options.admin) await page.context().addCookies([{ name: "quantik_admin_gate", value: "fixture-access-only", domain: new URL(origin).hostname, path: "/admin", httpOnly: true, sameSite: "Strict" }]);
  const state = { user: options.user ?? false, admin: options.admin ?? false, paid: false, creates: 0, keys: [] as string[], failOrder: false, revision: 2, patches: [] as Record<string, unknown>[], conflict: false, enabled: true, userChanges: [] as unknown[], applies: [] as unknown[], plans: [plan] };
  const unknown: string[] = [];
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace("/api/v1/", ""), method = request.method();
    const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(value) });
    const gate = { "set-cookie": "quantik_admin_gate=fixture-access-only; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=900" };
    if (path === "auth/refresh" || path === "admin/auth/refresh") return json(state[path.startsWith("admin") ? "admin" : "user"] ? token : { code: "UNAUTHENTICATED" }, state[path.startsWith("admin") ? "admin" : "user"] ? 200 : 401, path.startsWith("admin") && state.admin ? gate : {});
    if (path === "admin/auth/login") { state.admin = request.postDataJSON().password === "fixture-password"; return json(state.admin ? token : { code: "UNAUTHENTICATED" }, state.admin ? 200 : 401, state.admin ? gate : {}); }
    if (path.endsWith("auth/logout")) { state[path.startsWith("admin") ? "admin" : "user"] = false; return route.fulfill({ status: 204, headers: path.startsWith("admin") ? { "set-cookie": "quantik_admin_gate=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0" } : {} }); }
    if (path === "plans") return json({ payments_enabled: true, items: state.plans.filter(p => p.available) });
    if (path === "me") return json({ id: accountId, role: "user", display_name: "Người dùng QuanTik", email: "customer@example.test" });
    if (path === "admin/me") return json({ id: "fixture-admin", role: "admin", username: "operator" });
    if (path === "me/entitlements") return json({ active: state.paid, remaining: state.paid ? 25 : 0, active_limit: state.paid ? 2 : 0, valid_until: null, daily_limit: 25, created_today: 0, });
    if (path === "me/usage") return json({ buckets: [] });
    if (path === "subscription") return json({ items: [], next_cursor: null });
    if (path === "orders" && method === "POST") {
      state.creates++; state.keys.push(request.headers()["idempotency-key"]);
      if (state.failOrder && state.creates === 1) return json({ code: "BACKEND_UNAVAILABLE" }, 502);
      return json(order(), 201);
    }
    if (path === `orders/${orderId}`) return json(order());
    if (path === `orders/${orderId}/cancel`) return state.paid ? json({ code: "PAID_ORDER_CANNOT_CANCEL" }, 409) : json({ ...order(), status: "CANCELLED" });
    if (path === "orders" || path === "payments") return json({ items: [], next_cursor: null });
    if (path === "admin/integrations/sepay") {
      if (method === "PATCH") { state.patches.push(request.postDataJSON()); if (state.conflict) return json({ code: "INTEGRATION_REVISION_CONFLICT" }, 409); state.revision++; }
      return json({ provider: "sepay", revision: state.revision, source: "ADMIN_DATABASE", encryption_ready: true, updated_at: null, bank_code: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_prefix: "", requires_transfer_prefix: false, payments_enabled: false, webhook_api_key_configured: true, configuration_complete: true, missing_fields: [] });
    }
    if (path === "admin/integrations/vnstock") return json({ provider: "vnstock", revision: 0, source: "ENVIRONMENT", encryption_ready: true, updated_at: null, api_key_configured: false, scheduled_provider_enabled: false });
    if (path === `admin/orders/${orderId}`) return json({ ...order(), customer: { id: accountId, display_name: "Người mua kiểm thử", email: "buyer@example.test" }, plan, payments: [], subscription: null });
    if (path === "admin/users") return json({ items: [{ id: accountId, enabled: state.enabled }], next_cursor: null });
    if (path === `admin/users/${accountId}/state`) { state.userChanges.push(request.postDataJSON()); state.enabled = request.postDataJSON().enabled; return json({ id: accountId, enabled: state.enabled }); }
    if (path === "admin/plans") {
      if (method === "POST") { const created = { ...request.postDataJSON(), analysis_quota: request.postDataJSON().daily_request_limit, id: "new-plan", available: false, currency: "VND" }; state.plans.push(created); return json(created, 201); }
      return json({ items: state.plans, next_cursor: null });
    }
    if (path === `admin/plans/${planId}/availability`) return json({ ...plan, available: request.postDataJSON().available });
    if (path.startsWith("admin/configs/")) {
      const id = "a".repeat(64), previous = "b".repeat(64);
      const payload = { enabled: true, ingestion_enabled: false, screening_enabled: true, snapshots_enabled: true, training_enabled: true, auto_promote: true, retry_seconds: 300, maximum_attempts: 36, task_timeout_seconds: 28800, history_calendar_days: 1900 };
      if (path.endsWith("/activate")) { state.applies.push(request.postDataJSON()); return json({ code: "CONFIG_ACTIVATION_CONFLICT" }, 409); }
      if (path.endsWith("/versions")) return json({ id, kind: "OPERATIONS", payload: request.postDataJSON().payload, created_at: 1792000000 }, 201);
      return json({ active_version: previous, items: [{ id, kind: "OPERATIONS", payload, created_at: 1792000000 }], next_cursor: null, runtime_gates: { scheduled_provider_enabled: false } });
    }
    if (["admin/orders", "admin/jobs", "admin/subscriptions", "admin/payments", "admin/reconciliation", "admin/audit", "admin/scheduled-tasks"].includes(path)) return json({ items: [], next_cursor: null });
    if (path === "admin/screening/backfill-options") return json({ sessions: ["2026-10-15"], enabled: false, latest_task: null });
    if (path === "admin/operations/health") return json({ calendar_status: "READY", processes: [], screening: { published: null, latest_attempt: null, scheduled_provider_enabled: false, operations: { enabled: true, ingestion_enabled: false, screening_enabled: true } } });
    unknown.push(`${method} ${path}`); return json({ code: "UNHANDLED_FIXTURE" }, 500);
  });
  function order() { return { plan, id: orderId, plan_id: planId, amount_vnd: 150000, reference: "QTKFIXTURE", status: state.paid ? "PAID" : "PENDING", created_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 1800, paid_at: state.paid ? Math.floor(Date.now() / 1000) : null, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKFIXTURE", qr_url: null }; }
  return { state, unknown };
}

test("Mua gói: retry giữ Idempotency-Key, mở lại đơn và nhận thanh toán từ BE", async ({ page }) => {
  const { state, unknown } = await fixture(page, { user: true }); state.failOrder = true;
  await page.goto("/plans");
  await page.getByRole("button", { name: "Tiếp tục thanh toán", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Xác nhận tạo đơn", exact: true })).toHaveCount(0);
  await expect(page.locator(".account-notice[role=alert]")).toContainText("Chưa kết nối");
  await page.getByRole("button", { name: "Tiếp tục thanh toán", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByText("000123456", { exact: false }).first()).toBeVisible();
  expect(state.keys).toHaveLength(2); expect(state.keys[0]).toBeTruthy(); expect(state.keys[0]).toBe(state.keys[1]);
  await page.reload(); await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kiểm tra thanh toán" })).toHaveCount(0);
  state.paid = true;
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => Object.values(localStorage).join(" "))).not.toContain("fixture-access-only");
  await expect(page.getByText(/Hôm nay còn 25 yêu cầu/)).toBeVisible();
  await page.screenshot({ path: `test-results/billing/${test.info().project.name}-paid.png`, fullPage: true });
  expect(unknown).toEqual([]);
});

test("Admin login: sai mật khẩu, đăng nhập thành công và logout thu hồi giao diện", async ({ page }) => {
  const { unknown } = await fixture(page);
  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("operator");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".account-notice[role=alert]")).toContainText("mật khẩu không đúng");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quản trị QuanTik", exact: true })).toBeVisible();
  await page.locator("header details summary").click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  expect(unknown).toEqual([]);
});

test("Admin config: PATCH đúng revision, không gửi secret giữ nguyên; conflict không tự ghi đè", async ({ page }) => {
  const { state, unknown } = await fixture(page, { admin: true }); state.conflict = true;
  await page.goto("/admin/config/integrations");
  const panel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "SePay · nhận thanh toán", exact: true }) });
  await panel.getByLabel("Tên chủ tài khoản", { exact: true }).fill("QUANTIK UPDATED");
  await panel.getByLabel("Lý do (10–500 ký tự)").fill("Cập nhật tên nhận tiền theo đối chiếu");
  await panel.getByRole("button", { name: "Kiểm tra thay đổi" }).click();
  await panel.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("người khác thay đổi");
  expect(state.patches).toEqual([{ account_name: "QUANTIK UPDATED", expected_revision: 2, reason: "Cập nhật tên nhận tiền theo đối chiếu" }]);
  expect(state.patches[0]).not.toHaveProperty("webhook_api_key");
  expect(state.patches).toHaveLength(1); expect(unknown).toEqual([]);
});

test("Người dùng: khóa có lý do, cập nhật trạng thái; không có sửa hồ sơ giả", async ({ page }) => {
  const { state, unknown } = await fixture(page, { admin: true });
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Quản lý", exact: true }).click();
  await page.getByLabel("Lý do (10–500 ký tự)").fill("Khóa theo yêu cầu kiểm tra tài khoản");
  await page.getByRole("button", { name: "Khóa tài khoản", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Tài khoản đang bị khóa.", { exact: true })).toBeVisible();
  expect(state.userChanges).toEqual([{ enabled: false, reason: "Khóa theo yêu cầu kiểm tra tài khoản" }]);
  expect(unknown).toEqual([]);
});

test("Vận hành: kích hoạt gửi expected_version và conflict yêu cầu review lại", async ({ page }) => {
  const { state, unknown } = await fixture(page, { admin: true });
  await page.goto("/admin/config/operations");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await page.getByLabel("Lý do (10–500 ký tự)").fill("Áp dụng cấu hình đã được kiểm tra");
  await page.getByRole("button", { name: "Xác nhận áp dụng", exact: true }).click();
  await expect(page.locator(".account-notice[role=alert]")).toContainText("Phiên bản đang áp dụng đã thay đổi");
  expect(state.applies).toEqual([{ expected_version: "b".repeat(64), reason: "Áp dụng cấu hình đã được kiểm tra" }]);
  expect(unknown).toEqual([]);
});

test("Customer không có phiên admin: chặn màn quản trị; mobile không tràn ngang", async ({ page }) => {
  const { unknown } = await fixture(page, { user: true });
  await page.goto("/admin/config/integrations");
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByLabel("Tên chủ tài khoản", { exact: true })).toHaveCount(0);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Người dùng QuanTik", exact: true })).toBeVisible();
  await expect(page.locator("#workspace").getByText("customer@example.test", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  expect(unknown).toEqual([]);
});

test("Mở các màn mới với API fixture, giữ bố cục và chụp preview cấu hình", async ({ page }) => {
  const { unknown } = await fixture(page, { user: true, admin: true });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/admin", "/admin/orders", "/admin/plans", "/admin/payments", "/admin/subscriptions", "/admin/reconciliation", "/admin/jobs", "/admin/audit", "/admin/scheduled-tasks", "/admin/config/calendar", "/account/orders", "/account/payments"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText("Đang kiểm tra phiên đăng nhập…", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route).toBeTruthy();
  }
  await page.goto("/admin/config/integrations");
  await expect(page.getByLabel("Tên chủ tài khoản", { exact: true })).toHaveValue("QUANTIK");
  await page.screenshot({ path: `test-results/account-admin/${test.info().project.name}/integrations.png`, fullPage: true });
  await page.getByRole("button", { name: "Chuyển chế độ sáng", exact: true }).click();
  await page.screenshot({ path: `test-results/account-admin/${test.info().project.name}/integrations-light.png`, fullPage: true });
  expect(errors).toEqual([]); expect(unknown).toEqual([]);
});

test("Đổi khóa tích hợp: chỉ gửi secret mới, xóa nội dung form sau lưu", async ({ page }) => {
  const { state, unknown } = await fixture(page, { admin: true });
  await page.goto("/admin/config/integrations");
  const panel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "SePay · nhận thanh toán", exact: true }) });
  await panel.getByLabel("Khóa webhook", { exact: true }).selectOption("replace");
  await panel.getByLabel("Khóa mới", { exact: true }).fill("fixture-secret-not-real");
  await panel.getByLabel("Lý do (10–500 ký tự)").fill("Thay khóa theo quy trình kiểm thử");
  await panel.getByRole("button", { name: "Kiểm tra thay đổi" }).click();
  await panel.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(panel.getByText("Đã lưu cấu hình.", { exact: false })).toBeVisible();
  expect(state.patches).toEqual([{ webhook_api_key: "fixture-secret-not-real", expected_revision: 2, reason: "Thay khóa theo quy trình kiểm thử" }]);
  await expect(panel.getByLabel("Khóa mới", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("fixture-secret-not-real");
  expect(unknown).toEqual([]);
});

test("Hủy đơn đua với thanh toán: phản ánh PAID và không tự đổi trạng thái", async ({ page }) => {
  const { state, unknown } = await fixture(page, { user: true });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
  state.paid = true;
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.locator(".account-notice[role=alert]")).toContainText("không thể hủy");
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  expect(unknown).toEqual([]);
});

test("Admin: URL trực tiếp, cookie giả và HTML không JavaScript đều không lộ menu", async ({ page, browser }) => {
  await fixture(page);
  for (const route of ["/admin", "/admin/users", "/admin/config/integrations"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.locator(".terminal-sidebar")).toHaveCount(0);
    await expect(page.getByLabel("Tên chủ tài khoản", { exact: true })).toHaveCount(0);
  }
  const origin = String(test.info().project.use.baseURL);
  await page.context().addCookies([{ name: "quantik_admin_gate", value: "forged-admin", domain: new URL(origin).hostname, path: "/admin", httpOnly: true }]);
  await page.goto("/admin/config/integrations");
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const anonymous = await context.newPage();
  await anonymous.goto(origin + "/admin/users");
  await expect(anonymous.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
  await expect(anonymous.getByRole("navigation")).toHaveCount(0);
  await anonymous.screenshot({ path: `test-results/account-admin/${test.info().project.name}/admin-login-locked.png` });
  await context.close();
});

test("Khách hàng đã đăng nhập vào dashboard từ trang đăng nhập", async ({ page }) => {
  await fixture(page, { user: true });
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Toàn cảnh thị trường", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
});


test("Quản lý gói: sao chép phiên bản, sửa quyền lợi, tạo đóng bán rồi mở bán", async ({ page }) => {
  const { state, unknown } = await fixture(page, { admin: true });
  await page.goto("/admin/plans");
  await page.getByRole("button", { name: "Tạo phiên bản từ gói này" }).click();
  await expect(page.getByLabel("Tên gói", { exact: true })).toHaveValue(plan.name);
  await page.getByLabel("Tên gói", { exact: true }).fill("Gói nâng cấp");
  await page.getByLabel("Giá (VND)", { exact: true }).fill("250000");
  await page.getByRole("button", { name: "Xem lại gói mới" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã tạo phiên bản gói mới" })).toBeVisible();
  expect(state.plans[0]).toEqual(plan);
  expect(state.plans[1]).toMatchObject({ name: "Gói nâng cấp", price_vnd: 250000, available: false });
  const row = page.locator("article").filter({ has: page.getByRole("heading", { name: "Gói nâng cấp", exact: true }) });
  await expect(row).toContainText("Đang đóng bán");
  let body: unknown;
  await page.route("**/api/v1/admin/plans/new-plan/availability", route => {
    body = route.request().postDataJSON(); state.plans[1].available = true;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(state.plans[1]) });
  });
  await row.getByRole("button", { name: "Mở bán", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(row).toContainText("Đang mở bán");
  expect(body).toEqual({ available: true, replace_existing: true }); expect(unknown).toEqual([]);
  await page.screenshot({ path: `test-results/billing/${test.info().project.name}-plans.png`, fullPage: true });
});

test("Đơn hết thời gian: ngừng hiển thị thông tin chuyển khoản trước khi BE đổi trạng thái", async ({ page }) => {
  await fixture(page, { user: true });
  await page.route("**/api/v1/orders/" + orderId, route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: orderId, reference: "QTKEXPIRED", amount_vnd: 150000, status: "PENDING", created_at: 1, expires_at: 2, paid_at: null, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKEXPIRED", qr_url: null }) }));
  await page.goto("/orders/" + orderId);
  await expect(page.getByText(/Đã hết thời gian chuyển khoản/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép", exact: true })).toHaveCount(0);
  await expect(page.getByText("000123456")).toHaveCount(0);
});

test("Tài khoản: phân biệt kỳ hiện tại, sắp tới và đã kết thúc", async ({ page }) => {
  await fixture(page, { user: true }); const now = Math.floor(Date.now() / 1000);
  await page.route("**/api/v1/subscription*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [
    { id: "past", plan_id: "Gói cũ", plan: { ...plan, name: "Gói cũ" }, order_id: orderId, valid_from: now - 300, valid_until: now - 200 },
    { id: "current", plan_id: "Gói hiện tại", plan: { ...plan, name: "Gói hiện tại" }, order_id: orderId, valid_from: now - 100, valid_until: now + 100 },
    { id: "next", plan_id: "Gói tiếp theo", plan: { ...plan, name: "Gói tiếp theo" }, order_id: orderId, valid_from: now + 100, valid_until: now + 200 }
  ], next_cursor: null }) }));
  await page.goto("/account");
  const panel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Các kỳ gói", exact: true }) });
  await panel.locator("summary").click();
  await expect(panel.getByRole("row").filter({ hasText: "Gói cũ" })).toContainText("Đã kết thúc");
  await expect(panel.getByRole("row").filter({ hasText: "Gói hiện tại" })).toContainText("Đang hiệu lực");
  await expect(panel.getByRole("row").filter({ hasText: "Gói tiếp theo" })).toContainText("Sắp tới");
});

test("Hủy đơn chờ thanh toán: máy chủ xác nhận rồi ngừng hướng dẫn chuyển khoản", async ({ page }) => {
  await fixture(page, { user: true }); let cancelled = false;
  await page.route(new RegExp("/api/v1/orders/" + orderId + "(?:/cancel)?$"), route => {
    if (route.request().url().endsWith("/cancel")) cancelled = true;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: orderId, reference: "QTKCANCEL", status: cancelled ? "CANCELLED" : "PENDING", amount_vnd: 150000, expires_at: Math.floor(Date.now()/1000)+1800, created_at: 1, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKCANCEL", qr_url: null }) });
  });
  await page.goto("/orders/" + orderId);
  await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép", exact: true })).toHaveCount(0);
});


test("Đối soát: review số tiền, đơn và lý do trước khi áp dụng; tải lại danh sách", async ({ page }) => {
  await fixture(page, { admin: true }); let applied = false; let body: unknown;
  await page.route("**/api/v1/admin/reconciliation?*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: applied ? [] : [{ id: "late-transfer", amount_vnd: 150000, reason: "ORDER_CLOSED_OR_LATE", references: ["QTKLATE"], received_at: 1792000000 }], next_cursor: null }) }));
  await page.route("**/api/v1/admin/reconciliation/late-transfer/apply", route => {
    applied = true; body = route.request().postDataJSON();
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "late-transfer", status: "APPLIED" }) });
  });
  await page.goto("/admin/reconciliation");
  await page.getByRole("button", { name: "Đối soát", exact: true }).click();
  await page.getByLabel("Mã đơn hàng", { exact: true }).fill(orderId);
  await page.getByLabel("Lý do (10–500 ký tự)").fill("Đã đối chiếu giao dịch đến muộn với ngân hàng");
  await page.getByRole("button", { name: "Xem lại đối soát" }).click();
  expect(applied).toBe(false);
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã áp dụng giao dịch" })).toBeVisible();
  expect(body).toEqual({ order_id: orderId, reason: "Đã đối chiếu giao dịch đến muộn với ngân hàng" });
  await expect(page.getByRole("button", { name: "Đối soát", exact: true })).toHaveCount(0);
});

test("Gói đóng bán: admin thấy bước thiếu, mở bán xong khách thấy gói từ API", async ({ page }) => {
  const { state } = await fixture(page, { admin: true, user: true });
  state.plans[0] = { ...plan, available: false };
  await page.route("**/api/v1/admin/plans/" + planId + "/availability", route => {
    state.plans[0].available = route.request().postDataJSON().available;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(state.plans[0]) });
  });
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Gói dịch vụ đang được cập nhật" })).toBeVisible();
  await page.goto("/admin/plans");
  await expect(page.getByLabel("Tình trạng mở bán")).toContainText("0 gói đang mở bán");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: plan.name, exact: true }) });
  await expect(card).toContainText("khách chưa thấy");
  await card.getByRole("button", { name: "Mở bán", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByLabel("Tình trạng mở bán")).toContainText("1 gói đang mở bán");
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: plan.name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục thanh toán", exact: true })).toBeEnabled();
});

test("Đơn admin: lọc, xem khách/giao dịch/kỳ gói và mở từ liên kết trực tiếp", async ({ page }) => {
  const { unknown } = await fixture(page, { admin: true }); let status = "";
  const record = { id: orderId, reference: "QTKADMIN", status: "PAID", amount_vnd: 150000, created_at: 1792000000, expires_at: 1792001800, paid_at: 1792000010, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKADMIN", qr_url: null, account_id: accountId, display_name: "Khách mua gói", email: "buyer@example.test", plan_name: plan.name };
  await page.route("**/api/v1/admin/orders?*", route => {
    status = new URL(route.request().url()).searchParams.get("status") || "";
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [record], next_cursor: null }) });
  });
  await page.route("**/api/v1/admin/orders/" + orderId, route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...record, customer: { id: accountId, display_name: record.display_name, email: record.email }, plan, payments: [{ id: "bank-123", status: "APPLIED", amount_vnd: 150000, received_at: 1792000010 }], subscription: { id: "period-123", bucket_id: "bucket-123", valid_from: 1792000010, valid_until: 1794592010 } }) }));
  await page.goto("/admin/orders");
  await page.getByLabel("Trạng thái đơn", { exact: true }).selectOption("PAID");
  await page.getByRole("button", { name: "Lọc đơn hàng" }).click();
  await expect(page.getByRole("row").filter({ hasText: "QTKADMIN" })).toContainText("buyer@example.test");
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  const detail = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Chi tiết đơn hàng", exact: true }) });
  await expect(detail).toContainText("bank-123"); await expect(detail).toContainText("period-123");
  expect(status).toBe("PAID"); expect(unknown).toEqual([]);
  await page.screenshot({ path: "test-results/billing/" + test.info().project.name + "-admin-orders.png", fullPage: true });
  await page.goto("/admin/orders?order_id=" + orderId);
  await expect(page.getByRole("heading", { name: "Chi tiết đơn hàng", exact: true })).toBeVisible();
});

test("Danh mục công khai vẫn hiện gói khi refresh phiên khách trả 401", async ({ page }) => {
  await fixture(page);
  let publicRequests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/plans") publicRequests++; });
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: plan.name, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập để mua", exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Phiên đăng nhập" })).toHaveCount(0);
  expect(publicRequests).toBeGreaterThan(0);
});

test("Phiên admin: cookie bảo vệ trang hết hạn được phục hồi, không lặp login", async ({ page }) => {
  await fixture(page, { admin: true }); await page.context().clearCookies();
  let refreshes = 0;
  await page.route("**/api/v1/admin/auth/refresh", route => {
    refreshes++;
    return route.fulfill({ contentType: "application/json", headers: refreshes > 1 ? { "set-cookie": "quantik_admin_gate=fixture-access-only; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=900" } : {}, body: JSON.stringify(token) });
  });
  await page.goto("/admin/plans");
  await expect(page.getByRole("heading", { name: "Gói dịch vụ", exact: true })).toBeVisible();
  expect(refreshes).toBe(2);
});

test("Gói: chưa kiểm tra xong phiên thì không gợi ý đăng nhập sai", async ({ page }) => {
  await fixture(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/auth/refresh", async route => {
    await pending; return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHENTICATED" }) });
  });
  await page.goto("/plans");
  await expect(page.getByRole("button", { name: "Đang kiểm tra đăng nhập…", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập để mua" })).toHaveCount(0);
  release();
  await expect(page.getByRole("link", { name: "Đăng nhập để mua" })).toBeVisible();
});

test("Thanh toán mất kết nối: ẩn QR/thông tin cũ, tự phục hồi và nhận PAID", async ({ page }) => {
  await fixture(page, { user: true }); await page.clock.install(); let reads = 0;
  await page.route("**/api/v1/orders/" + orderId, route => {
    reads++;
    if (reads === 2) return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ code: "BACKEND_UNAVAILABLE" }) });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: orderId, reference: "QTKRECONNECT", status: reads > 2 ? "PAID" : "PENDING", amount_vnd: 150000, expires_at: Math.floor(Date.now()/1000)+1800, created_at: 1, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKRECONNECT", qr_url: null }) });
  });
  await page.goto("/orders/" + orderId);
  await expect(page.getByText("000123456", { exact: false })).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.getByText(/Tạm ẩn thông tin chuyển khoản/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép", exact: true })).toHaveCount(0);
  await page.clock.fastForward(21000);
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
});

test("Đối soát: HTTP200 chưa APPLIED không được báo thành công", async ({ page }) => {
  await fixture(page, { admin: true });
  await page.route("**/api/v1/admin/reconciliation?*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [{ id: "pending-review", amount_vnd: 150000, reason: "ACCOUNT_DISABLED" }], next_cursor: null }) }));
  await page.route("**/api/v1/admin/reconciliation/pending-review/apply", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "RECONCILIATION" }) }));
  await page.goto("/admin/reconciliation");
  await page.getByRole("button", { name: "Đối soát", exact: true }).click();
  await page.getByLabel("Mã đơn hàng", { exact: true }).fill(orderId);
  await page.getByLabel("Lý do (10–500 ký tự)").fill("Kiểm tra giao dịch với tài khoản bị khóa");
  await page.getByRole("button", { name: "Xem lại đối soát" }).click();
  await expect(page.getByText(/Người mua kiểm thử/)).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Giao dịch chưa được áp dụng" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Đã áp dụng giao dịch" })).toHaveCount(0);
});

test("Admin đăng nhập ở tab khác: cập nhật phiên thay vì đẩy tab hiện tại ra login", async ({ page }) => {
  await fixture(page, { admin: true }); let meReads = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/admin/me") meReads++; });
  await page.goto("/admin/plans"); await expect(page.getByRole("heading", { name: "Gói dịch vụ", exact: true })).toBeVisible();
  const before = meReads;
  const other = await page.context().newPage(); await fixture(other); await other.goto("/plans");
  await other.evaluate(() => { const channel = new BroadcastChannel("quantik-session"); channel.postMessage({ role: "admin", action: "login" }); channel.close(); });
  await expect.poll(() => meReads).toBeGreaterThan(before);
  await expect(page.getByRole("heading", { name: "Gói dịch vụ", exact: true })).toBeVisible();
  await other.close();
});

test("Gói tháng hiển thị giới hạn ngày và admin không có hủy/hoàn lượt", async ({ page }) => {
  await fixture(page, { admin: true, user: true });
  await page.goto("/plans");
  await expect(page.getByText("Yêu cầu mỗi ngày", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hạn mức yêu cầu đặt lại lúc 00:00/)).toBeVisible();
  await page.goto("/admin/jobs");
  await expect(page.getByRole("button", { name: /hoàn lượt|hủy yêu cầu/i })).toHaveCount(0);
  await page.locator("header details summary").click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị", exact: true })).toBeVisible();
});

test("Đơn hết hạn có giao dịch cần đối soát: không gợi ý trả tiền lại", async ({ page }) => {
  await fixture(page, { user: true });
  await page.route("**/api/v1/orders/" + orderId, route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: orderId, reference: "QTKREVIEW", amount_vnd: 150000, status: "EXPIRED", plan, created_at: 1, expires_at: 2, paid_at: null, payment_resolution: "RECONCILIATION", qr_url: null }) }));
  await page.goto("/orders/" + orderId);
  await expect(page.getByRole("heading", { name: "Giao dịch đang được đối soát" })).toBeVisible();
  await expect(page.getByText(/không cần chuyển thêm tiền/)).toBeVisible();
  await expect(page.getByRole("link", { name: /tạo đơn mới/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toHaveCount(0);
});

test("Chọn gói trước login: dashboard giữ bước tiếp tục, không tự tạo đơn", async ({ page }) => {
  const { state } = await fixture(page);
  await page.goto("/plans");
  await page.getByRole("link", { name: "Đăng nhập để mua", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập hệ thống", exact: true })).toBeVisible();
  state.user = true;
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Tiếp tục mua gói", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/plans\\?selected=" + planId));
  await expect(page.getByRole("button", { name: "Tiếp tục thanh toán", exact: true })).toBeEnabled();
  expect(state.creates).toBe(0);
});

test("Google login event: cập nhật phiên khách ở các tab đang mở", async ({ page }) => {
  const first = await fixture(page); await page.goto("/plans");
  await expect(page.getByRole("link", { name: "Đăng nhập để mua", exact: true })).toBeVisible();
  const second = await page.context().newPage(); const other = await fixture(second); await second.goto("/plans");
  await expect(second.getByRole("link", { name: "Đăng nhập để mua", exact: true })).toBeVisible();
  first.state.user = true; other.state.user = true;
  await page.evaluate(() => { document.cookie = "quantik_login_event=test-event; Path=/; Max-Age=60; SameSite=Lax"; window.dispatchEvent(new Event("focus")); });
  await expect(page.getByRole("button", { name: "Tiếp tục thanh toán", exact: true })).toBeEnabled();
  await expect(second.getByRole("button", { name: "Tiếp tục thanh toán", exact: true })).toBeEnabled();
  expect(first.state.creates + other.state.creates).toBe(0);
  await second.close();
});

test("Tạo gói mất phản hồi: retry dùng lại key, không nhân phiên bản", async ({ page }) => {
  const { state } = await fixture(page, { admin: true }); let created: any; const keys: string[] = [];
  await page.route("**/api/v1/admin/plans", route => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (!created) { created = { ...route.request().postDataJSON(), id: "new-plan", analysis_quota: route.request().postDataJSON().daily_request_limit, available: false, currency: "VND" }; state.plans.push(created); }
    return route.fulfill({ status: keys.length === 1 ? 502 : 201, contentType: "application/json", body: JSON.stringify(keys.length === 1 ? { code: "BACKEND_UNAVAILABLE" } : created) });
  });
  await page.goto("/admin/plans"); await page.getByLabel("Tên gói", { exact: true }).fill("Gói hạn mức ngày");
  await page.getByRole("button", { name: "Xem lại gói mới" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.locator(".account-notice[role=alert]")).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã tạo phiên bản gói mới" })).toBeVisible();
  expect(keys).toHaveLength(2); expect(keys[0]).toBeTruthy(); expect(keys[1]).toBe(keys[0]); expect(state.plans).toHaveLength(2);
});

test("GET đơn lỗi đầu tiên: tự phục hồi, hạn thanh toán theo đồng hồ server", async ({ page }) => {
  await fixture(page, { user: true }); await page.clock.install(); let reads = 0;
  const serverNow = Math.floor(Date.now() / 1000) - 3600;
  await page.route("**/api/v1/orders/" + orderId, route => {
    reads++;
    return route.fulfill({ status: reads === 1 ? 502 : 200, contentType: "application/json", body: JSON.stringify(reads === 1 ? { code: "BACKEND_UNAVAILABLE" } : {
      id: orderId, reference: "QTKCLOCK", status: "PENDING", amount_vnd: 150000, plan, server_now: serverNow,
      expires_at: serverNow + 600, created_at: serverNow, bank: "TPBANK", account_number: "000123456", account_name: "QUANTIK", transfer_content: "QTKCLOCK", qr_url: null,
    }) });
  });
  await page.goto("/orders/" + orderId);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.clock.fastForward(2100);
  await expect(page.getByText("000123456", { exact: false })).toBeVisible();
  expect(reads).toBe(2);
  await expect(page.getByText(/Đơn đã hết thời gian/)).toHaveCount(0);
});

test("Chạy bù screening: retry giữ key, tự theo dõi và mở lại trang xem tác vụ", async ({ page }) => {
  const { unknown } = await fixture(page, { admin: true });
  const keys: string[] = [];
  let reads = 0;
  const task = { id: "backfill-task", target_session: "2026-10-15", kind: "BACKFILL", slot: "PM", status: "RUNNING", attempt: 1, reason: null, deadline: Math.floor(Date.now()/1000)+3600, result: null };
  await page.route("**/api/v1/admin/screening/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path.endsWith("/backfill-options")) return json({ sessions: ["2026-10-15", "2026-10-14"], enabled: true, latest_task: keys.length ? task : null });
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toEqual({ target_session: "2026-10-15", reason: "Kiểm tra dữ liệu kết phiên" });
    return json(keys.length === 1 ? { code: "BACKEND_UNAVAILABLE" } : task, keys.length === 1 ? 502 : 202);
  });
  await page.route("**/api/v1/admin/scheduled-tasks/backfill-task", route => {
    reads++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...task, status: reads > 1 ? "SUCCEEDED" : "RUNNING" }) });
  });
  await page.goto("/admin/scheduled-tasks");
  await expect(page.getByLabel("Phiên cần chạy bù")).toHaveValue("2026-10-15");
  await page.getByLabel("Lý do (10–500 ký tự)").fill("Kiểm tra dữ liệu kết phiên");
  await page.getByRole("button", { name: "Chạy bù phiên đã chọn" }).click();
  await expect(page.locator(".account-notice[role=alert]")).toContainText("Chưa kết nối được máy chủ");
  await page.getByRole("button", { name: "Chạy bù phiên đã chọn" }).click();
  await expect(page.getByText(/Đang nạp dữ liệu và quét/)).toBeVisible();
  await expect(page.getByText(/Đã có kết quả/)).toBeVisible({ timeout: 10000 });
  expect(keys).toHaveLength(2); expect(keys[0]).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
  await page.reload();
  await expect(page.getByText(/Đã có kết quả/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  await page.screenshot({ path: `test-results/account-admin/${test.info().project.name}/screening-backfill.png`, fullPage: true });
  expect(unknown).toEqual([]);
});

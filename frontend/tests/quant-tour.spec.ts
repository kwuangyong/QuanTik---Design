import { test, expect, type Page } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";
import { deepLayer, v2 } from "./helpers/quant-v2";

async function openReport(page: Page, options: { tour?: boolean } = {}) {
  const state = await analysisFixture(page, options);
  state.status = "SUCCEEDED";
  state.jobs.push({ id: "job-1", symbol: "FPT", target_session: "2026-10-16", status: "SUCCEEDED", created_at: 1792224000, deadline: 1792310400, attempt: 1, report_id: "report-1", reason: null, quota_effect: "CONSUMED" });
  state.report.sections.simulation_risk.metrics = { simulation_risk: { lock_risk: { max_dd_lock_pct: -4, prob_loss_gt_3pct: 8, lock_sessions: 2 } } };
  await page.goto("/analysis?symbol=FPT&job=job-1");
  return state;
}
const tourKey = "quantik.quant.tourSeen";
const stored = (page: Page, key: string) => page.evaluate(k => { try { return window.localStorage.getItem(k); } catch { return "blocked"; } }, key);
const insideDialog = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

if (!v2) {
  test("Quant V2 tắt: không có tour, nút Cách đọc hay nút Giảm hiệu ứng", async ({ page }) => {
    await openReport(page, { tour: true });
    await expect(page.locator(".quant-report-section")).toHaveCount(16);
    await expect(page.locator("[data-quant-tour], [data-quant-guide-open], [data-reduce-effects]")).toHaveCount(0);
  });
} else {
  test("Tour 4 bước: bàn phím, focus trap, Quay lại, Esc và chỉ hiện ở lần đầu", async ({ page }) => {
    await openReport(page, { tour: true });
    const tour = page.getByRole("dialog", { name: "Kết luận", exact: true });
    await expect(tour).toBeVisible();
    await expect(tour).toContainText("Bước 1/4");
    await expect(tour).toContainText("không phải lệnh mua bán");
    await expect(tour.getByRole("button", { name: "Bỏ qua", exact: true })).toBeFocused();
    await expect(tour.getByRole("button", { name: "Quay lại" })).toHaveCount(0);
    // Focus never leaves the popover while tabbing in either direction.
    for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); expect(await insideDialog(page)).toBe(true); }
    for (let i = 0; i < 5; i++) { await page.keyboard.press("Shift+Tab"); expect(await insideDialog(page)).toBe(true); }
    await tour.getByRole("button", { name: "Tiếp", exact: true }).focus();
    await page.keyboard.press("Enter");
    const risk = page.getByRole("dialog", { name: "Rủi ro trước", exact: true });
    await expect(risk).toContainText("Bước 2/4");
    await expect(risk).toContainText("Xem rủi ro trước khi xem cơ hội");
    await expect(page.locator("[data-glance-risk]")).toHaveAttribute("data-tour-active", "true");
    await page.keyboard.press("Shift+Tab");
    await expect(risk.getByRole("button", { name: "Quay lại", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Kết luận", exact: true })).toContainText("Bước 1/4");
    for (const [n, title] of [[2, "Rủi ro trước"], [3, "Ba lớp đọc"], [4, "Thuật ngữ"]] as const) {
      await page.getByRole("button", { name: "Tiếp", exact: true }).click();
      await expect(page.getByRole("dialog", { name: title, exact: true })).toContainText(`Bước ${n}/4`);
    }
    await expect(page.getByRole("button", { name: "Tiếp", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const box = await page.getByRole("dialog", { name: "Thuật ngữ", exact: true }).boundingBox(), size = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
    await page.getByRole("button", { name: "Xong", exact: true }).click();
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
    await expect(page.locator("[data-tour-active]")).toHaveCount(0);
    expect(await stored(page, tourKey)).toBe("1");
    await page.reload();
    await expect(page.locator("[data-quant-glance]")).toBeVisible();
    await page.waitForTimeout(900);
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
  });

  test("Tour: Esc và Bỏ qua đóng ngay và được nhớ; localStorage bị chặn vẫn không hiện lại trong phiên", async ({ page }) => {
    await openReport(page, { tour: true });
    await expect(page.getByRole("dialog", { name: "Kết luận", exact: true })).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
    expect(await stored(page, tourKey)).toBe("1");
    await page.evaluate(() => window.localStorage.removeItem("quantik.quant.tourSeen"));
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Kết luận", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bỏ qua", exact: true }).click();
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
    expect(await stored(page, tourKey)).toBe("1");
  });

  test("Tour: không có localStorage thì vẫn hoạt động và không lặp trong cùng phiên trang", async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await openReport(page, { tour: true });
    await expect(page.getByRole("dialog", { name: "Kết luận", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bỏ qua", exact: true }).click();
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
    await page.getByRole("button", { name: "Hiểu vì sao", exact: true }).click();
    await page.getByRole("button", { name: "Tóm tắt", exact: true }).click();
    await page.waitForTimeout(900);
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("Cách đọc: mở bằng nút, đủ 8 mục, Esc trả focus, mở lại tour", async ({ page }) => {
    await openReport(page);
    const open = page.getByRole("button", { name: "Cách đọc", exact: true });
    await open.click();
    const guide = page.getByRole("dialog", { name: "Cách đọc báo cáo", exact: true });
    await expect(guide).toBeVisible();
    expect(await insideDialog(page)).toBe(true);
    await expect(guide.getByRole("navigation", { name: "Mục lục Cách đọc" }).getByRole("link")).toHaveCount(8);
    for (const section of ["Báo cáo trả lời 4 câu hỏi nào", "Ba mức đọc", "Nhãn trạng thái nghĩa là gì", "Đọc rủi ro trước cơ hội", "Xác suất trong báo cáo", "Vì sao mô hình có thể sai", "Bảng thuật ngữ", "Miễn trừ trách nhiệm"]) {
      await expect(guide.getByRole("heading", { name: new RegExp(section) })).toHaveCount(1);
    }
    await expect(guide.locator("[data-guide-tone]")).toHaveCount(5);
    await expect(guide.locator("[data-guide-term]")).toHaveCount(44);
    await expect(guide.locator('[data-guide-term="settlement"]')).toContainText("theo quy định hiện hành của công ty chứng khoán");
    await expect(guide).toContainText("[chờ rà soát pháp lý VN]");
    await expect(guide).not.toContainText(/T\+2|undefined|NaN/);
    for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); expect(await insideDialog(page)).toBe(true); }
    await page.keyboard.press("Escape");
    await expect(guide).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.click();
    await guide.getByRole("button", { name: "Xem lại hướng dẫn 4 bước", exact: true }).click();
    await expect(guide).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Kết luận", exact: true })).toContainText("Bước 1/4");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-quant-tour]")).toHaveCount(0);
  });

  test("Trang /analysis/guide có đủ 8 mục, bảng thuật ngữ và điểm neo theo từng thuật ngữ", async ({ page }) => {
    await analysisFixture(page);
    await page.goto("/analysis/guide#term-sharpe");
    await expect(page.getByRole("heading", { level: 1, name: /Cách đọc báo cáo Quant/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(8);
    await expect(page.locator("#term-sharpe")).toBeInViewport();
    await expect(page.locator("[data-guide-term]")).toHaveCount(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("Giảm hiệu ứng: nút trong app được nhớ, hình hiện ngay trạng thái cuối, 3D không tự xoay", async ({ page }) => {
    await openReport(page);
    const button = page.getByRole("button", { name: "Giảm hiệu ứng", exact: true });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    const enterAnimation = () => page.locator("[data-quant-glance]").evaluate(el => getComputedStyle(el.parentElement!).animationName);
    expect(await enterAnimation()).not.toBe("none");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
    expect(await enterAnimation()).toBe("none");
    await page.reload();
    await expect(page.getByRole("button", { name: "Giảm hiệu ứng", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
    await page.getByRole("button", { name: "Hiểu vì sao", exact: true }).click();
    const figures = page.locator("[data-quant-explain] [data-figure]");
    expect(await figures.count()).toBeGreaterThan(0);
    for (const phase of await figures.evaluateAll(list => list.map(el => el.getAttribute("data-phase")))) expect(phase).toBe("static");
    await deepLayer(page);
    await page.getByRole("button", { name: "Monte Carlo", exact: true }).click();
    const group = page.locator('details[data-quant-module="simulation_risk"]').getByRole("group", { name: "Chuyển 2D/3D Monte Carlo" });
    await group.getByRole("button", { name: /3D/ }).click();
    await expect(page.getByRole("button", { name: "Đã giảm chuyển động", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Giảm hiệu ứng", exact: true }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-reduce-motion", "true");
    await expect(page.getByRole("button", { name: "Đã giảm chuyển động", exact: true })).toHaveCount(0);
  });

  test("prefers-reduced-motion: hình hiện ngay trạng thái cuối, không hoạt ảnh vào lớp", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openReport(page);
    expect(await page.locator("[data-quant-glance]").evaluate(el => getComputedStyle(el.parentElement!).animationName)).toBe("none");
    await page.getByRole("button", { name: "Hiểu vì sao", exact: true }).click();
    const figures = page.locator("[data-quant-explain] [data-figure]");
    expect(await figures.count()).toBeGreaterThan(0);
    for (const phase of await figures.evaluateAll(list => list.map(el => el.getAttribute("data-phase")))) expect(phase).toBe("static");
    const opacities = await page.locator("[data-quant-explain] [data-figure] svg").evaluateAll(list => list.map(el => getComputedStyle(el).opacity));
    expect(opacities.every(o => o === "1")).toBe(true);
  });
}

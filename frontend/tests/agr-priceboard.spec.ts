import { test, expect } from "@playwright/test";
import { agrFixture } from "./fixtures/agr";

test("Bảng điện AGR nhận giá, giữ delta và đồng bộ sau reconnect", async ({ page }) => {
  const state = await agrFixture(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("status").filter({ hasText: "Đã kết nối AGR" })).toBeVisible();
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  const row = page.locator(".price-board tbody tr").filter({ has: page.getByRole("link", { name: "FPT", exact: true }) });
  await expect(row).toHaveCount(1);
  await expect(page.getByRole("status")).not.toContainText("Phiên");
  await expect(page.locator("#workspace")).not.toContainText(/snapshot|mẫu|mock|mã phiên/i);
  const cards = page.locator(".index-card");
  for (const [i, value] of ["1.705,91", "1.855,41", "124,87", "259,13"].entries()) await expect(cards.nth(i).locator("strong")).toHaveText(value);
  state.connections.at(-1)!.send('42["idx",{"a":"u","d":[{"MC":"HOSE","MI":"1710.25","IPC":"0.70","t":101},{"MC":"30","IPC":0,"t":101}]}]');
  await expect(cards.nth(0).locator("strong")).toHaveText("1.710,25");
  await expect(cards.nth(0)).toContainText("+0,70%");
  await expect(cards.nth(1)).toContainText("0,00%");
  await expect(cards.nth(1).locator("strong")).toHaveText("1.855,41");
  state.connections.at(-1)!.send('42["i",{"a":"u","d":[{"SB":"FPT","CP":99000,"TV":123000000,"TT":54321,"B1":"ATC","V1":0,"ts":101,"s":11}]}]');
  await expect(row).toContainText("99,00");
  await expect(row).toContainText("54.321");
  await expect(row).toContainText("123,00");
  await expect(row).toContainText("ATC");
  state.connections.at(-1)!.send('42["i",{"a":"u","d":[{"SB":"FPT","CP":100000,"ts":102,"s":12}]}]');
  await expect(row).toContainText("100,00");
  await expect(row).toContainText("54.321");
  const before = state.snapshots;
  state.connections.at(-1)!.close({ code: 1001, reason: "test disconnect" });
  await expect(page.getByRole("status").filter({ hasText: "Mất kết nối" })).toBeVisible();
  await expect.poll(() => state.connections.length).toBeGreaterThan(1);
  await expect.poll(() => state.snapshots).toBeGreaterThan(before);
  await expect(page.getByRole("status").filter({ hasText: "Đã kết nối AGR" })).toBeVisible();
  await expect(cards.nth(0).locator("strong")).toHaveText("1.710,25");
  expect(state.subscriptions.length).toBeGreaterThan(1);
});

test("AGR lỗi snapshot hiển thị chờ, không thay bằng giá mẫu", async ({ page }) => {
  const state = await agrFixture(page); state.fail = true;
  await page.goto("/dashboard");
  await expect(page.getByRole("status").filter({ hasText: "Chưa đồng bộ" })).toBeVisible();
  await expect(page.locator(".price-board tbody tr")).toHaveCount(0);
  await expect(page.getByText("Đang chờ dữ liệu bảng điện AGR", { exact: true })).toBeVisible();
  await expect(page.locator(".index-card strong")).toHaveText(["—", "—", "—", "—"]);
});

test("Chỉ số thiếu nguồn để trống, bảng cổ phiếu vẫn hoạt động", async ({ page }) => {
  const state = await agrFixture(page); state.failIndices = true;
  await page.goto("/dashboard");
  await expect(page.getByText("Chưa cập nhật được chỉ số", { exact: true })).toBeVisible();
  await expect(page.locator(".index-card strong")).toHaveText(["—", "—", "—", "—"]);
  await expect(page.locator(".price-board tbody tr")).toHaveCount(8);
});

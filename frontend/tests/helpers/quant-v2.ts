import { expect, type Page } from "@playwright/test";

// Build-time flag mirrored at test time: V2 is on unless the build (and this run) set NEXT_PUBLIC_QUANT_READER_V2=0/false/off.
export const v2 = !/^(0|false|off)$/i.test((process.env.NEXT_PUBLIC_QUANT_READER_V2 ?? "").trim());

// With V2 the report opens on "Tóm tắt"; the 16-module reader is the "Chuyên sâu" layer. Legacy builds show it at once.
export async function deepLayer(page: Page) {
  if (!v2) return;
  const button = page.getByRole("button", { name: "Chuyên sâu", exact: true });
  await expect(button).toBeVisible({ timeout: 15000 });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

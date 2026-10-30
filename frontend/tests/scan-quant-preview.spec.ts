import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const previewURL = pathToFileURL(resolve(__dirname,"../../preview/QuanTik_Scan_Quant_Test.html")).href;

test("Standalone preview: quét 5+5 → popup → Quant HPG → 16 module, không gửi request thật", async ({ page }, info) => {
  const errors: string[] = [], requests: string[] = [];
  page.on("pageerror", error=>errors.push(error.message));
  page.on("request", request=>{ if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(previewURL);
  await expect(page.getByRole("button",{name:"Kích hoạt kết quả",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Kích hoạt kết quả",exact:true}).click();
  const best=page.getByRole("region",{name:"5 mã tốt nhất",exact:true}), worst=page.getByRole("region",{name:"5 mã nên tránh nhất",exact:true});
  for(const table of [best,worst]) {
    await expect(table.locator("tbody tr")).toHaveCount(5);
    await expect(table.locator("thead th")).toHaveCount(42);
  }
  await expect(best.locator('[data-sheet-column="net_forecast_pct"]').first()).toHaveText("3,5%");
  await expect(best.locator('[data-sheet-column="gate_pass"]').first()).toHaveText("Chưa đạt");
  await page.screenshot({path:info.outputPath("preview-screening.png"),fullPage:true});
  await best.getByRole("button",{name:"HPG",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Ghi chú mẫu");
  await page.getByRole("dialog").getByRole("link",{name:/Phân tích Quant/}).click();
  await expect(page.getByLabel("Chọn mã phân tích",{exact:true})).toHaveValue("HPG");
  await page.getByRole("button",{name:"Gửi yêu cầu Quant HPG",exact:true}).click();
  await page.getByRole("button",{name:"Xác nhận",exact:true}).click();
  await expect(page.getByRole("heading",{name:/HPG.*Đã hoàn tất/})).toBeVisible({timeout:15000});
  await expect(page.locator(".quant-report-section")).toHaveCount(16);
  await expect(page.locator('.quant-report')).toContainText("HPG · Ví dụ số liệu tổng hợp");
  const nav=page.getByRole("navigation",{name:"Điều hướng module",exact:true});
  await nav.getByRole("button",{name:"ARIMA",exact:true}).click();
  await expect(page.locator('[data-quant-module="arima"]')).toContainText("412,6");
  await expect(page.locator('[data-quant-module="arima"]').getByRole("img")).toHaveCount(1);
  await page.screenshot({path:info.outputPath("preview-quant.png"),fullPage:true});
  for(const scenario of ["partial","unavailable","disabled","failed"]) {
    await page.getByLabel("Tình huống thử dữ liệu",{exact:true}).selectOption(scenario);
    await expect(page.locator(".quant-report-section")).toHaveCount(16);
    await nav.getByRole("button",{name:"ARIMA",exact:true}).click();
    const arima=page.locator('[data-quant-module="arima"]');
    if(scenario==="partial") await expect(arima).toContainText("Chưa có chuỗi forecast ARIMA");
    else { await expect(arima.getByRole("img")).toHaveCount(0); await expect(arima).not.toContainText("412,6"); }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  const calls=await page.evaluate(()=>(window as unknown as {__quantikPreview:{calls:{path:string;method:string}[]}}).__quantikPreview.calls);
  expect(calls.filter(call=>call.method==="POST"&&call.path==="analyses")).toHaveLength(1);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test("Standalone preview: screening cơ bản, chưa công bố và lỗi kết nối giữ trạng thái rõ ràng", async ({ page }) => {
  await page.goto(previewURL);
  await page.getByLabel("Tình huống thử dữ liệu",{exact:true}).selectOption("basic");
  await page.getByRole("button",{name:"Kích hoạt kết quả",exact:true}).click();
  const best=page.getByRole("region",{name:"5 mã tốt nhất",exact:true});
  await expect(best.locator('[data-sheet-column="score"]').first()).toHaveText("—");
  await best.getByRole("button",{name:"Dữ liệu quét hiện có",exact:true}).click();
  await expect(best.locator("tbody tr").first()).toContainText("100.000");
  for(const scenario of ["waiting","network"]) {
    await page.getByLabel("Tình huống thử dữ liệu",{exact:true}).selectOption(scenario);
    await page.getByRole("button",{name:"Kích hoạt kết quả",exact:true}).click();
    if(scenario==="waiting") await expect(page.getByRole("heading",{name:"Chưa có kết quả được công bố",exact:true})).toBeVisible();
    else await expect(page.getByRole("button",{name:"Thử lại",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"FPT",exact:true})).toHaveCount(0);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

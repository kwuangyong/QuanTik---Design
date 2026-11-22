import { test, expect } from "@playwright/test";

test.beforeEach(async ({page}) => {
  await page.route("**/api/v1/**",route=>route.fulfill({status:401,contentType:"application/json",body:'{"code":"UNAUTHENTICATED"}'}));
  await page.route("**/api/market/agr?view=portfolio", route => route.fulfill({ status: 502 }));
  await page.goto("/portfolio");
  await expect(page.getByRole("heading",{name:"Portfolio Intelligence",exact:true})).toBeVisible();
});
test("Nhập sửa xóa, hoàn tác, lưu danh mục và CSV",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.getByRole("button",{name:"Thêm vị thế",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Mã cổ phiếu").fill("SSI");
  await dialog.getByRole("option", { name: /^SSI / }).click();
  await dialog.getByLabel("Khối lượng (cổ phiếu)").fill("1234");
  await dialog.getByLabel("Giá mua (VND/cổ phiếu)").fill("30000");
  await dialog.getByRole("button",{name:"Lưu vị thế"}).click();
  await expect(page.getByRole("button",{name:"Sửa SSI",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Sửa SSI",exact:true}).click();
  await dialog.getByLabel("Khối lượng (cổ phiếu)").fill("1000");
  await dialog.getByRole("button",{name:"Lưu vị thế"}).click();
  await page.reload();await expect(page.getByRole("button",{name:"Sửa SSI",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Xóa SSI",exact:true}).click();
  await expect(page.getByRole("button",{name:"Sửa SSI",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Hoàn tác xóa"}).click();
  await expect(page.getByRole("button",{name:"Sửa SSI",exact:true})).toBeVisible();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Xuất CSV"}).click();expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole("button",{name:"Sửa SSI",exact:true}).click();await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Danh mục mở dưới Quant và lưu nhiều lần mua trên các sàn", async ({ page, isMobile }) => {
  if (isMobile) await page.getByRole("button", { name: "Mở menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  const links = await navigation.getByRole("link").allTextContents();
  expect(links[links.indexOf("Phân tích Quant") + 1]).toBe("Portfolio Intelligence");
  if (isMobile) await navigation.getByRole("link", { name: "Portfolio Intelligence" }).click();

  await page.route("**/api/market/agr?view=portfolio", route => route.fulfill({ json: {
    tradingDate: "23/11/2026", items: [
      { symbol: "HUT", name: "Công ty Cổ phần Tasco", exchange: "HNX", price: 16000 },
      { symbol: "A32", name: "Công ty cổ phần 32", exchange: "UPCOM", price: null },
      { symbol: "BID", name: "Ngân hàng BIDV", exchange: "HOSE", price: 40000 },
    ],
  } }));
  await page.getByRole("button", { name: "Thêm vị thế", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Thêm vị thế" });
  await expect(dialog.getByText(/AGR phiên 23\/11\/2026/)).toBeVisible();
  const size = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - size.height / 2)).toBeLessThan(2);
  if (!isMobile) {
    await page.mouse.move(box.x + box.width / 2, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + 60, { steps: 5 });
    await page.mouse.up();
    expect((await dialog.boundingBox())!.x).toBeGreaterThan(box.x + 50);
  }

  const fillPurchase = async (index: number, search: string, symbol: string, quantity: string, price: string) => {
    if (index > 1) await dialog.getByRole("button", { name: "Thêm dòng" }).click();
    const row = dialog.getByRole("group", { name: `Lần mua ${index}` });
    await row.getByLabel("Mã cổ phiếu").fill(search);
    await row.getByRole("option", { name: new RegExp(`^${symbol} `) }).click();
    await row.getByLabel("Khối lượng (cổ phiếu)").fill(quantity);
    await row.getByLabel("Giá mua (VND/cổ phiếu)").fill(price);
  };
  await fillPurchase(1, "cong ty co phan tasco", "HUT", "100", "10000");
  await fillPurchase(2, "A32", "A32", "200", "25000");
  await fillPurchase(3, "HUT", "HUT", "300", "14000");
  await fillPurchase(4, "BID", "BID", "200", "30000");
  await dialog.getByRole("button", { name: "Lưu 4 lần mua" }).click();
  await expect(dialog).toHaveCount(0);
  const hut = page.getByRole("row").filter({ has: page.getByRole("link", { name: "HUT", exact: true }) });
  await expect(hut.getByRole("cell").nth(1)).toHaveText("400");
  await expect(hut.getByRole("cell").nth(2)).toHaveText("13.000");
  await expect(hut.getByRole("cell").nth(3)).toHaveText("16.000");
  await expect(page.getByRole("row").filter({ has: page.getByRole("link", { name: "A32", exact: true }) }).getByRole("cell").nth(3)).toHaveText("—");
  await expect(page.getByRole("link", { name: "BID", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Kịch bản biến động/ }).click();
  await expect(page.getByRole("tabpanel").getByText(/Mã thiếu dữ liệu: HUT, A32, BID/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "HUT", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "A32", exact: true })).toBeVisible();
});
test("Kịch bản đa chiều phân biệt thiết lập chưa chạy và kết quả đã chạy",async({page})=>{
  await page.getByRole("tab",{name:/Kịch bản biến động/}).click();
  await page.getByRole("button",{name:"Căng thẳng đồng thời",exact:true}).click();
  await page.getByRole("combobox",{name:"Kỳ mô phỏng",exact:true}).selectOption("60");
  await page.getByRole("combobox",{name:"Mã chịu cú sốc",exact:true}).selectOption("HPG");
  await page.getByRole("button",{name:"Chạy mô phỏng",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Dải giá trị danh mục",exact:true})).toBeVisible();
  await expect(page.getByText(/Lần chạy: 60 phiên/)).toBeVisible();
  await expect(page.getByRole("heading",{name:"Phân rã tác động có hướng"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Độ nhạy: thị trường × ngành"})).toBeVisible();
  await page.getByRole("combobox",{name:"Kỳ mô phỏng",exact:true}).selectOption("5");
  await expect(page.getByText(/Thiết lập hoặc danh mục đã đổi/)).toBeVisible();
  await expect(page.getByText(/Lần chạy: 60 phiên/)).toBeVisible();
  await page.getByRole("button",{name:"Chạy mô phỏng",exact:true}).click();
  await expect(page.getByText(/Lần chạy: 5 phiên/)).toBeVisible();
  await expect(page.getByText(/Thiết lập hoặc danh mục đã đổi/)).toHaveCount(0);
});
test("Action hợp nhất và trước–sau không thay danh mục gốc",async({page})=>{
  await page.getByLabel("Danh mục mẫu").selectOption("1");
  await page.getByRole("tab",{name:/Action plan/}).click();
  await expect(page.getByRole("heading",{name:/Giảm tập trung FPT/})).toBeVisible();
  await page.getByRole("button",{name:"Tạo & kiểm chứng phương án"}).click();
  await expect(page.getByRole("heading",{name:"Tác động dự kiến: trước → sau"})).toBeVisible();
  const table=page.getByRole("table").last(),total=table.getByRole("row").filter({hasText:"Tổng tài sản"});
  expect(await total.locator("td").nth(1).innerText()).toEqual(await total.locator("td").nth(2).innerText());
  await page.getByRole("combobox",{name:"Tỉ trọng tối đa mỗi mã",exact:true}).selectOption("0.2");
  await expect(page.getByText(/Danh mục, giới hạn hoặc kịch bản đã đổi/)).toBeVisible();
  await page.getByRole("tab",{name:/Tổng quan/}).click();
  await page.getByRole("button",{name:"Sửa FPT",exact:true}).click();
  await expect(page.getByRole("dialog").getByLabel("Khối lượng (cổ phiếu)")).toHaveValue("5000");
});
test("Bốn tab, theme sáng tối và mobile không tràn trang",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  for(const theme of ["dark","light"]){
    if(theme==='light')await page.getByRole("button",{name:"Chuyển chế độ sáng"}).click();
    for(const name of [/Tổng quan/,/Rủi ro & tương quan/,/Kịch bản biến động/,/Action plan/]){
      await page.getByRole("tab",{name}).click();
      if(String(name).includes("Kịch")){await page.getByRole("button",{name:"Chạy mô phỏng",exact:true}).click();await expect(page.getByRole("heading",{name:"Dải giá trị danh mục",exact:true})).toBeVisible();}
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);expect(overflow).toBe(false);
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`test-results/portfolio/${testInfo.project.name}-${theme}-${await page.getByRole('tab',{selected:true}).getAttribute('id')}.png`,fullPage:true});
    }
  }
  expect(errors).toEqual([]);
});

import { test, expect } from "@playwright/test";

test.beforeEach(async ({page}) => {
  await page.route("**/api/v1/**",route=>route.fulfill({status:401,contentType:"application/json",body:'{"code":"UNAUTHENTICATED"}'}));
  await page.goto("/portfolio");
  await expect(page.getByRole("heading",{name:"Portfolio Intelligence",exact:true})).toBeVisible();
});
test("Nhập sửa xóa, hoàn tác, lưu danh mục và CSV",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.getByRole("button",{name:"Thêm vị thế",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Mã cổ phiếu").selectOption("SSI");
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

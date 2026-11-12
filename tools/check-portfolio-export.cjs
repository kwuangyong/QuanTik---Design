/** Kiểm tra chính HTML bàn giao qua file:// hoặc máy chủ tĩnh, không cần backend. */
const {chromium,devices}=require('@playwright/test');
const {pathToFileURL}=require('node:url');
const {resolve,join}=require('node:path');
const {mkdir,writeFile}=require('node:fs/promises');
const assert=require('node:assert/strict');

(async()=>{
  const input=process.argv[2]||'preview/index.html',html=/^https?:/.test(input)?input:pathToFileURL(resolve(input)).href,destination=resolve(process.argv[3]||'preview/qa');
  await mkdir(destination,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true});
  const report=[];
  try {
    for(const kind of ['desktop','mobile']){
      const context=await browser.newContext(kind==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1440,height:1000}});
      const page=await context.newPage(),errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>{
        const url=route.request().url();
        if(url===html)return route.continue();
        if(url.startsWith('http:')||url.startsWith('https:')){requests.push(url);return route.abort();}
        return route.continue();
      });
      await page.goto(html);
      await page.getByRole('heading',{name:'Portfolio Intelligence',exact:true}).waitFor();
      await page.evaluate(()=>document.fonts.ready);
      for(const theme of ['dark','light']){
        if(theme==='light')await page.getByRole('button',{name:'Chuyển chế độ sáng'}).click();
        for(const [index,label] of ['Tổng quan','Rủi ro & tương quan','Kịch bản biến động','Action plan'].entries()){
          await page.getByRole('tab',{name:new RegExp(label.replace('&','&'))}).click();
          if(index===2){
            await page.getByRole('button',{name:'Căng thẳng đồng thời',exact:true}).click();
            await page.getByRole('button',{name:'Chạy mô phỏng',exact:true}).click();
            await page.getByRole('heading',{name:'Dải giá trị danh mục',exact:true}).waitFor();
          }
          if(index===3){
            await page.getByRole('button',{name:'Tạo & kiểm chứng phương án'}).click();
            await page.getByRole('heading',{name:'Tác động dự kiến: trước → sau'}).waitFor();
            const cells=await page.getByRole('table').last().getByRole('row').filter({hasText:'Tổng tài sản'}).locator('td').allTextContents();
            assert.equal(cells[1],cells[2]);
          }
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:join(destination,`${kind}-${theme}-${index}.png`),fullPage:true});
        }
      }
      await page.getByRole('tab',{name:/Tổng quan/}).click();
      await page.getByRole('button',{name:'Thêm vị thế',exact:true}).click();
      const dialog=page.getByRole('dialog');
      await dialog.getByRole('combobox',{name:'Mã cổ phiếu',exact:true}).selectOption('SSI');
      await dialog.getByLabel('Khối lượng (cổ phiếu)').fill('1000');
      await dialog.getByLabel('Giá mua (VND/cổ phiếu)').fill('30000');
      await dialog.getByRole('button',{name:'Lưu vị thế'}).click();
      await page.getByRole('button',{name:'Sửa SSI',exact:true}).waitFor();
      const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV'}).click();
      assert.match((await download).suggestedFilename(),/\.csv$/);
      await page.reload();await page.getByRole('button',{name:'Sửa SSI',exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      // Các request tài khoản cũ của Shell có thể bị chặn, Portfolio không phụ thuộc chúng.
      const externalAssets=requests.filter(url=>!url.includes('/api/v1/'));
      assert.deepEqual(externalAssets,[]);
      report.push({kind,themes:2,tabs:4,errors,externalAssets,passed:true});
      await context.close();
    }
  } finally { await browser.close(); }
  await writeFile(join(destination,'export-check.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exit(1);});

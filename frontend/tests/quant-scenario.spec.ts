import {test,expect,type Page} from "@playwright/test";
import {analysisFixture} from "./fixtures/analysis";

async function openReport(page:Page,missing=false){
 const state=await analysisFixture(page);state.status="SUCCEEDED";
 state.report.sections.hmm.metrics={hmm:{current:"BULL",method:"multivariate_hmm",state_probs:{BULL:67,SIDEWAY:24,BEAR:9}}};
 if(missing){state.report.research!.cone=[];state.report.research!.regime=[];state.report.sections.hmm.metrics={};}
 state.jobs.push({id:"job-1",symbol:"FPT",target_session:"2026-10-16",status:"SUCCEEDED",created_at:1792224000,deadline:1792310400,attempt:1,report_id:"report-1",reason:null,quota_effect:"CONSUMED"});
 await page.goto('/analysis?symbol=FPT&job=job-1');
 await expect(page.locator('.quant-report-section')).toHaveCount(16);await page.getByText("Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo",{exact:true}).click();return state;
}

test('HMM triangle plays observed phase changes and keeps present probabilities separate',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const state=await openReport(page),triangle=page.getByRole('region',{name:'HMM · Tam giác chuyển pha',exact:true}).first();
 await triangle.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await triangle.getByRole('slider',{name:'Chọn phiên chuyển pha HMM',exact:true}).press('Home');
 await expect(triangle.getByRole('img')).toHaveAttribute('aria-label','Tam giác chuyển pha HMM tại 2026-10-14: BEAR');
 await triangle.getByRole('button',{name:'Phát chuyển pha',exact:true}).click();
 await expect(triangle.getByRole('slider')).toHaveValue('1');
 await expect(triangle.getByRole('img')).toHaveAttribute('aria-label','Tam giác chuyển pha HMM tại 2026-10-15: SIDEWAY');
 await expect(triangle.getByRole('slider')).toHaveValue('2');
 await expect(triangle.getByRole('slider')).toHaveValue('0');
 await triangle.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await triangle.getByRole('button',{name:'Xác suất hiện tại',exact:true}).click();
 await expect(triangle.getByRole('img')).toHaveAttribute('aria-label','Tam giác xác suất HMM hiện tại');
 await expect(triangle.getByRole('slider')).toHaveCount(0);
 const xy=await triangle.locator('[data-phase-point]').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return[m.e,m.f];});
 expect(xy[0]).toBeCloseTo(266.7,2);expect(xy[1]).toBeCloseTo(126.58,2);
 await triangle.getByText('Biểu đồ này đọc như thế nào?',{exact:true}).click();
 await expect(triangle).toContainText('hiệu ứng minh họa');
 expect(state.created).toBe(0);expect(state.unknown).toEqual([]);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test('Monte Carlo 3D switches safely and follows published sessions',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await openReport(page);
 const gallery=page.getByRole('region',{name:'Visual Quant FPT',exact:true});
 const control=gallery.getByRole('group',{name:'Chuyển 2D/3D Monte Carlo',exact:true});
 await expect(gallery.getByRole('img',{name:'Dải giá Monte Carlo FPT',exact:true})).toBeVisible();
 await control.getByRole('button',{name:'3D',exact:true}).click();
 const view=gallery.getByRole('region',{name:'Monte Carlo · Khám phá 3D',exact:true});
 await expect(view.getByRole('img',{name:'Monte Carlo 3D theo phiên',exact:true})).toBeVisible();
 await view.getByRole('img').press('ArrowRight');
 await view.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await view.getByRole('slider',{name:'Chọn phiên Monte Carlo 3D',exact:true}).press('Home');
 await expect(view).toContainText('Phiên +1');
 await view.getByRole('button',{name:'Phát theo phiên',exact:true}).click();
 await expect(view.getByRole('slider')).toHaveValue('1',{timeout:6000});
 expect(errors).toEqual([]);
 await control.getByRole('button',{name:'2D',exact:true}).click();
 await expect(gallery.getByRole('img',{name:'Dải giá Monte Carlo FPT',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test('Missing data retains explanations; reduced-motion users control the selected session manually',async({page})=>{
 await openReport(page,true);
 const triangle=page.getByRole('region',{name:'HMM · Tam giác chuyển pha',exact:true}).first();
 await expect(triangle.getByRole('img')).toHaveCount(0);await expect(triangle.getByRole('status')).toContainText('Chưa có đủ');
 const gallery=page.getByRole('region',{name:'Visual Quant FPT',exact:true});
 await gallery.getByRole('group',{name:'Chuyển 2D/3D Monte Carlo',exact:true}).getByRole('button',{name:'Khám phá 3D',exact:true}).click();
 await expect(gallery.getByRole('region',{name:'Monte Carlo · Khám phá 3D',exact:true}).getByRole('status')).toContainText('chưa công bố đủ phân vị');
 await page.emulateMedia({reducedMotion:'reduce'});await openReport(page);
 const next=page.getByRole('region',{name:'HMM · Tam giác chuyển pha',exact:true}).first();
 await expect(next.getByRole('button',{name:'Phát chuyển pha',exact:true})).toBeDisabled();
 await next.getByRole('slider').press('Home');await expect(next.getByRole('img')).toHaveAttribute('aria-label','Tam giác chuyển pha HMM tại 2026-10-14: BEAR');
});

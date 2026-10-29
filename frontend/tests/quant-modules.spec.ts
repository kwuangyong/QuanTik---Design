import {test,expect,type Page} from '@playwright/test';
import {analysisFixture} from './fixtures/analysis';
import {quantReportSample} from './fixtures/quant-report-sample';
import {quantModuleItems} from '../src/components/quant-module-navigation';
import {moduleGuides} from '../src/lib/quant-reader';
import {moduleMetricTerms} from '../src/content/quant-module-terms';
import {auditQuantTypography} from './helpers/quant-ui-audit';
import {getTerm} from '../src/content/legacy/glossary';

async function openReport(page:Page, scenario: Parameters<typeof quantReportSample>[0] = "complete") {
  const state=await analysisFixture(page); state.status='SUCCEEDED';
  state.report=quantReportSample(scenario);
  if(scenario==='complete') state.report.sections.directional_alpha.metrics.momentum_alpha={score:0,active:false,components:{ret_5d_pct:1,ret_10d_pct:2,ret_20d_pct:3,ret_60d_pct:4}};
  state.jobs.push({id:'job-1',symbol:'FPT',target_session:'2026-10-16',status:'SUCCEEDED',created_at:1792224000,deadline:1792310400,attempt:1,report_id:'report-1',reason:null,quota_effect:'CONSUMED'});
  await page.goto('/analysis?symbol=FPT&job=job-1');
  await expect(page.locator('.quant-report-section')).toHaveCount(16);
  return state;
}

test('All 16 module buttons reopen their section and metrics open distinct five-part explanations',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const state=await openReport(page),nav=page.getByRole('navigation',{name:'Điều hướng module',exact:true});
  await expect(nav.getByRole('button')).toHaveCount(16);
  for(const [name,label] of quantModuleItems) {
    // Moving the page beneath a stationary test cursor can open an unrelated
    // hover definition. Dismiss it before exercising the next navigation item.
    await page.mouse.move(0,0); await page.keyboard.press('Escape');
    const section=page.locator(`[data-quant-module="${name}"]`);
    await nav.getByRole('button',{name:label,exact:true}).click();
    await page.mouse.move(0,0); await page.keyboard.press('Escape');
    await expect(section).toHaveAttribute('open','');
    if(name==='commentary'){await expect(section).toContainText('Điểm hỗ trợ');continue;}
    await expect(section.getByText('Hiểu mô hình · phương pháp & điều kiện',{exact:true})).toBeVisible();
    if(name==='directional_alpha') {
      await expect(section.getByLabel('Bằng chứng Momentum',{exact:true})).toBeVisible();
      await expect(section.locator('[data-alpha-value="momentum"]')).toHaveText('0');
    } else {
      await expect(section.getByRole('heading',{name:'Biểu đồ & bằng chứng',exact:true})).toBeVisible();
      for(const [,path] of moduleGuides[name].metrics) expect(getTerm(moduleMetricTerms[path])).toBeTruthy();
    }
  }
  for(const name of ['garch','hmm']) {
    await nav.getByRole('button',{name:quantModuleItems.find(([id])=>id===name)![1],exact:true}).click();
    const section=page.locator(`[data-quant-module="${name}"]`);
    for(const [label,path] of moduleGuides[name].metrics) {
      const trigger=section.locator('dt').getByRole('button',{name:label,exact:true});
      await trigger.focus(); await trigger.press('Enter');
      const popup=page.getByRole('tooltip');
      await expect(popup.locator('.term-title')).toHaveText(getTerm(moduleMetricTerms[path])!.vi);
      await expect(popup.getByRole('heading')).toHaveCount(5);
      await expect(popup.locator('.katex-error')).toHaveCount(0);
      const typography=await page.evaluate(auditQuantTypography);expect(typography.violations).toEqual([]);
      await page.keyboard.press('Escape'); await trigger.blur();
    }
  }
  expect(errors).toEqual([]);expect(state.created).toBe(0);expect(state.unknown).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await nav.getByRole('button',{name:'GARCH',exact:true}).click();
  await page.locator('[data-quant-module="garch"]').screenshot({path:`test-results/ui/${test.info().project.name}/quant-garch-module.png`,scale:'css'});
});

test('GARCH surface and factor 3D preserve their source values and return to original 2D charts',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await openReport(page);
  await page.getByRole('navigation',{name:'Điều hướng module',exact:true}).getByRole('button',{name:'GARCH',exact:true}).click();
  const garch=page.locator('[data-quant-module="garch"]');
  await garch.getByRole('group',{name:'Góc nhìn biến động GARCH',exact:true}).getByRole('button',{name:'3D',exact:true}).click();
  await expect(garch.getByRole('img',{name:'Mặt phản ứng GARCH 3D FPT',exact:true})).toBeVisible();
  await garch.getByRole('img').press('ArrowRight');
  await expect(garch).toContainText('không phải phân phối hoặc một dự báo mới');
  await garch.getByRole('button',{name:'2D',exact:true}).click();
  await expect(garch.getByRole('img',{name:'Đường biến động trong module GARCH',exact:true})).toBeVisible();
  await page.getByText('Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo',{exact:true}).click();
  const factors=page.getByRole('region',{name:'Visual Quant FPT',exact:true});
  await factors.getByRole('group',{name:'Góc nhìn hồ sơ nhân tố',exact:true}).getByRole('button',{name:'3D',exact:true}).click();
  await expect(factors.getByRole('img',{name:'Hồ sơ nhân tố 3D từ báo cáo',exact:true})).toBeVisible();
  await factors.getByRole('slider',{name:'Xoay góc nhân tố',exact:true}).press('End');
  await expect(factors.locator('[data-factor-column]')).toHaveCount(9);
  await factors.getByRole('button',{name:'Xem giá trị nguồn Dòng tiền',exact:true}).click();
  await expect(factors.getByRole('tooltip')).toContainText('Giá trị nguồn: 0,3');
  await page.keyboard.press('Escape');
  await factors.getByRole('button',{name:'Radar',exact:true}).click();
  await expect(factors.getByRole('img',{name:'Hồ sơ nhân tố chuẩn hóa',exact:true})).toBeVisible();
  await expect(factors.locator('[data-factor-axis]')).toHaveCount(9);
  await expect(factors.locator('[data-factor-legend]')).toHaveCount(9);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});


test('Readable report: one module, numbered blocks, 13px minimum and actual interpretation',async({page})=>{
  const state=await openReport(page);
  const report=page.locator('.quant-report'),nav=page.getByRole('navigation',{name:'Điều hướng module',exact:true});
  await expect(page.getByRole('heading',{name:'Xâu chuỗi các mô hình và khuyến nghị',exact:true})).toHaveCount(0);
  await expect(report.locator('[data-quant-module]:visible')).toHaveCount(1);
  await expect(report.locator('[data-quant-module="statistics"]')).toBeVisible();
  await expect(nav.getByRole('button')).toHaveCount(16);
  await expect(nav.getByRole('button',{name:'Hiệu suất',exact:true})).toContainText('01');
  await expect(nav.getByRole('button',{name:'Nhận định',exact:true})).toContainText('16');
  await expect(report.getByRole('heading',{name:'Ý nghĩa & phân tích',exact:true})).toBeVisible();
  await nav.getByRole('button',{name:'Phân phối',exact:true}).click();
  await expect(report.locator('[data-quant-module]:visible')).toHaveCount(1);
  await expect(report.locator('[data-quant-module="distribution"]')).toContainText('Gaussian');
  await page.evaluate(()=>document.fonts.ready);
  for(const [name,label] of quantModuleItems) {
    await nav.getByRole('button',{name:label,exact:true}).click();
    const section=page.locator(`[data-quant-module="${name}"]`);
    await section.locator('details > summary').evaluateAll(items=>items.forEach(item=>{(item.parentElement as HTMLDetailsElement).open=true;}));
    const audit=await page.evaluate(auditQuantTypography);
    expect(audit.checked).toBeGreaterThan(0);expect(audit.fontLoaded).toBeTruthy();expect(audit.violations,name).toEqual([]);
  }
  expect(await report.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('IBM Plex Mono');
  expect(state.created).toBe(0);expect(state.unknown).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await report.screenshot({path:`test-results/ui/${test.info().project.name}/quant-readable-report.png`,scale:'css'});
});

test('Factor card links radar hover, raw-value tooltips, 9 explanations and reduced-motion 3D',async({page})=>{
 await openReport(page);
 await page.getByText('Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo',{exact:true}).click();
 const profile=page.locator('[data-factor-profile="true"]');
 await expect(profile.locator('[data-factor-scale]')).toHaveCount(1);
 await expect(profile.locator('[data-factor-card]')).toHaveCount(9);
 await expect(profile.locator('[data-factor-reference]')).toHaveCount(3);
 await expect(profile).not.toContainText('miền');
 await profile.locator('[data-factor-card="cmf"]').hover();
 await expect(profile.locator('[data-factor-point="cmf"]')).toHaveAttribute('data-active','true');
 await profile.locator('[data-factor-point="hmm_regime"]').focus();
 await expect(profile.locator('[data-factor-card="hmm_regime"]')).toHaveAttribute('data-active','true');
 await profile.getByRole('button',{name:'Xem giá trị nguồn Dòng tiền',exact:true}).click();
 await expect(profile.getByRole('tooltip')).toContainText('Giá trị nguồn: 0,3');
 await page.keyboard.press('Escape');await expect(profile.getByRole('tooltip')).toHaveCount(0);
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 let audit=await page.evaluate(auditQuantTypography);expect(audit.violations).toEqual([]);
 await page.emulateMedia({reducedMotion:'reduce'});
 await profile.getByRole('button',{name:'3D',exact:true}).click();
 await expect(profile.locator('[data-factor-column]')).toHaveCount(9);
 await expect(profile.locator('[data-factor-reference="50"]')).toHaveCount(1);
 await expect(profile.getByRole('button',{name:'Đã giảm chuyển động',exact:true})).toBeDisabled();
 audit=await page.evaluate(auditQuantTypography);expect(audit.violations).toEqual([]);
 await profile.screenshot({path:`test-results/ui/${test.info().project.name}/quant-factor-card-after.png`,scale:'css'});
});

for(const scenario of ['complete','partial','unavailable','disabled','failed'] as const) {
 test(`All modules preserve data state: ${scenario}`,async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const state=await openReport(page,scenario);
  const nav=page.getByRole('navigation',{name:'Điều hướng module',exact:true});
  for(const [name,label] of quantModuleItems) {
   await page.mouse.move(0,0);await page.keyboard.press('Escape');
   await nav.getByRole('button',{name:label,exact:true}).click();
   const section=page.locator(`[data-quant-module="${name}"]`);
   await expect(section).toBeVisible();
   await expect(section).toContainText('Ý nghĩa & phân tích');
   if(scenario==='complete' && name!=='commentary') {
    await expect(section).not.toContainText('Thiếu dữ liệu');
    await expect(section.locator('dd').filter({hasText:/^—$/})).toHaveCount(0);
   }
   if(['unavailable','disabled'].includes(scenario)&&name!=='commentary') {
    await expect(section).toContainText('Chưa đủ dữ liệu để diễn giải');
    await expect(section.locator('canvas,svg[role="img"]')).toHaveCount(0);
   }
   if(scenario==='complete'&&['arima','distribution'].includes(name)) {
    await expect(section.getByRole('img')).toHaveCount(1);
    await section.screenshot({path:`test-results/ui/${test.info().project.name}/quant-${name}-sample.png`,scale:'css'});
   }
  }
  expect(errors).toEqual([]);expect(state.created).toBe(0);expect(state.unknown).toEqual([]);
 });
}

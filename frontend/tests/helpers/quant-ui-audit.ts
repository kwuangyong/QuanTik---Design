// Run in the browser after fonts.ready, including opened details and tooltips.
// SVG CTM also checks rendered text size, since computed style alone misses viewBox scaling.
export function auditQuantTypography() {
  const roots = [...document.querySelectorAll('.quant-report,[data-quant-report="true"],[data-factor-profile="true"]')];
  const all = [...new Set(roots.flatMap(root => [root,...root.querySelectorAll('*')]))];
  const violations: { text: string; computedPx: number; renderedPx: number; font: string }[] = [];
  let checked = 0;
  for (const el of all) {
    const closed = el.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(el)) continue;
    if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
    if (![...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) continue;
    if (['STYLE','SCRIPT','TITLE','OPTION'].includes(el.tagName.toUpperCase())) continue;
    const style=getComputedStyle(el),size=Number.parseFloat(style.fontSize);
    const matrix=el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
    const rendered=matrix ? size*Math.hypot(matrix.c,matrix.d) : size;
    checked++;
    const math=Boolean(el.closest('.katex'));
    if(size<12.99 || rendered<12.99 || !math && !style.fontFamily.includes('IBM Plex Mono')) violations.push({text:(el.textContent||'').slice(0,100),computedPx:size,renderedPx:rendered,font:style.fontFamily});
  }
  const canvases=all.filter((el):el is HTMLCanvasElement=>el instanceof HTMLCanvasElement && el.getClientRects().length>0);
  const canvasChecks=canvases.map(canvas=>{
    const font=canvas.getContext('2d')?.font||'',match=font.match(/([0-9.]+)px/),size=match?Number(match[1]):null;
    const box=canvas.getBoundingClientRect(),pixelRatio=box.width?canvas.width/box.width:0;
    if(size!=null&&size<13)violations.push({text:'Nhãn canvas',computedPx:size,renderedPx:size,font});
    return {font,size,pixelRatio};
  });
  return { checked, fontLoaded:document.fonts.check('14px "IBM Plex Mono"'), violations, canvasChecks };
}

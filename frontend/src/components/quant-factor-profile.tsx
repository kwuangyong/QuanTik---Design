"use client";
import {useEffect,useId,useMemo,useState,type CSSProperties} from 'react';
import type {QuantResearch} from '@/lib/api/analysis';
import {presentFactors,type PresentedFactor} from '@/lib/quant-factors';
import {factorGroups,factorLevel,factorLevelNames,factorLevelSymbols,factorReading,factorReadingRules,factorQuickRead,factorScaleNote} from '@/lib/quant-factor-readings';
import {number} from '@/lib/quant-reader';
import {FactorRadar} from './quant-factor-radar';
import {FactorThreeD} from './quant-factor-3d';
import styles from './quant-factor-profile.module.css';

type Hint={factor:PresentedFactor;left:number;top:number;pinned:boolean};
export function QuantFactorProfile({data}:{data:QuantResearch['factors']}) {
  const factors=useMemo(()=>presentFactors(data),[data]),reading=useMemo(()=>factorQuickRead(factors),[factors]);
  const [view,setView]=useState<'radar'|'3d'>('radar'),[active,setActive]=useState<string|null>(null),[hint,setHint]=useState<Hint|null>(null),hintId=useId();
  const highlight=active||hint?.factor.id;
  const showHint=(factor:PresentedFactor,anchor:Element,pin=false)=>{
    const rect=anchor.getBoundingClientRect(),width=Math.min(320,innerWidth-24),left=Math.max(12,Math.min(rect.left,innerWidth-width-12)),top=rect.bottom+290<innerHeight?rect.bottom+10:Math.max(12,rect.top-290);
    setHint(current=>pin&&current?.pinned&&current.factor.id===factor.id?null:!pin&&current?.pinned?current:{factor,left,top,pinned:pin});
  };
  const hideHint=()=>setHint(current=>current?.pinned?current:null);
  useEffect(()=>{if(!hint)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setHint(null);};const outside=(event:PointerEvent)=>{if(!(event.target instanceof Element)||!event.target.closest('[data-factor-card],[data-factor-point],[data-factor-column],[data-factor-tooltip]'))setHint(null);};const reposition=()=>setHint(null);document.addEventListener('keydown',dismiss);document.addEventListener('pointerdown',outside);document.addEventListener('scroll',reposition,true);window.addEventListener('resize',reposition);return()=>{document.removeEventListener('keydown',dismiss);document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',reposition,true);window.removeEventListener('resize',reposition);};},[hint]);
  return <section className={styles.profile} aria-label="Hồ sơ nhân tố" data-factor-profile="true">
    <div className={styles.heading}><h3>Hồ sơ nhân tố</h3><span className={styles.scale}>{factors.filter(p=>p.score!=null).length}/9 nhân tố có dữ liệu</span></div>
    <p className={styles.scale} data-factor-scale="true">{factorScaleNote}</p>
    <div className={styles.tabs} role="group" aria-label="Góc nhìn hồ sơ nhân tố">{[['radar','Radar'],['3d','3D']].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>{setView(id as 'radar'|'3d');setHint(null);}}>{label}</button>)}</div>
    {view==='radar'?<FactorRadar factors={factors} activeId={highlight} onActive={setActive} onHint={showHint} onHideHint={hideHint}/>:<FactorThreeD factors={factors} activeId={highlight} onActive={setActive} onHint={showHint} onHideHint={hideHint}/>}
    <section className={styles.quick} aria-label="Đọc nhanh hồ sơ nhân tố"><h4>Đọc nhanh</h4><div className={styles.chips}>{reading.chips.map(([label,value])=><span key={label} className={styles.chip}><strong>{label}: </strong>{value}</span>)}</div><p>{reading.paragraph}</p></section>
    {factorGroups.map(group=><section key={group.id} className={styles.group} style={{'--group-color':group.color} as CSSProperties} aria-label={`Nhóm ${group.label}`}><h4>{group.label}</h4><div className={styles.cards}>{factors.filter(p=>p.group===group.id).map(p=>{const level=factorLevel(p.score);return <article key={p.id} className={styles.card} data-factor-card={p.id} data-factor-legend={p.id} data-active={highlight===p.id} data-missing={p.score==null} tabIndex={0} onPointerEnter={()=>setActive(p.id)} onPointerLeave={()=>setActive(null)} onFocus={()=>setActive(p.id)} onBlur={event=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setActive(null);}}>
      <div className={styles.cardHead}><h5>{p.label}</h5><span className={`${styles.badge} ${styles[level]}`}>{factorLevelSymbols[level]} {factorLevelNames[level]}</span></div>
      <button type="button" className={`${styles.bigScore} ${styles[level]}`} aria-label={`Xem giá trị nguồn ${p.label}`} aria-describedby={hint?.factor.id===p.id?hintId:undefined} onPointerEnter={event=>showHint(p,event.currentTarget)} onPointerLeave={hideHint} onFocus={event=>showHint(p,event.currentTarget)} onBlur={hideHint} onClick={event=>showHint(p,event.currentTarget,true)}>{p.score==null?'—':p.score}<small>/ 100</small></button>
      <div role="img" aria-label={`${p.label}: ${p.score==null?'Chưa có dữ liệu':`${p.score}/100`}, mốc trung tính 50`} className={styles.bar}>{p.score!=null&&<div className={`${styles.fill} ${styles[level]}`} style={{width:`${p.score}%`}}/>}<span className={styles.midpoint}/></div>
      <p><strong>Đo điều gì: </strong>{factorReadingRules[p.id].measure}</p><p><strong>Đang nói gì: </strong>{factorReading(p.id,p.score)}</p>
    </article>;})}</div></section>)}
    <p className={styles.footer}>Đọc từng nhân tố, không tự tổng hợp thành điểm mua. Các điểm phản ánh nhân tố chuẩn hóa của báo cáo, không phải xác suất có lãi.</p>
    {hint&&<div role="tooltip" id={hintId} className={styles.tooltip} data-factor-tooltip="true" data-quant-report="true" style={{left:hint.left,top:hint.top}}><strong>{hint.factor.label}</strong><p>Giá trị nguồn: {number(hint.factor.value)}.</p><p>{hint.factor.score==null?`Không quy đổi: ${hint.factor.status.replace("miền","phạm vi").toLowerCase()}. Phạm vi nguồn: [${number(hint.factor.min)}; ${number(hint.factor.max)}].`:`Quy đổi hiển thị: (${number(hint.factor.value)} − (${number(hint.factor.min)})) / (${number(hint.factor.max)} − (${number(hint.factor.min)})) × 100 ≈ ${hint.factor.score}.`}</p><p>{factorReadingRules[hint.factor.id].directionNote}</p><button type="button" onClick={()=>setHint(null)}>Đóng giải thích</button></div>}
  </section>;
}

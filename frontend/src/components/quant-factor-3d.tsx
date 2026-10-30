"use client";
import {useEffect,useId,useRef,useState} from 'react';
import type {FactorPlotProps} from './quant-factor-radar';
import {factorLevel,factorLevelNames,factorLevelSymbols} from '@/lib/quant-factor-readings';
import styles from './quant-factor-profile.module.css';
export function FactorThreeD({factors,activeId,onActive,onHint,onHideHint}:FactorPlotProps) {
  const stage=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null),angleRef=useRef(-12),interacting=useRef(false),drag=useRef<number|null>(null);
  const [angle,setAngle]=useState(-12),[spinning,setSpinning]=useState(true),[reduced,setReduced]=useState(false),id=useId();
  useEffect(()=>{angleRef.current=angle;},[angle]);
  useEffect(()=>{
    const element=stage.current;if(!element)return;
    const media=matchMedia('(prefers-reduced-motion: reduce)');let frame:number|null=null,visible=false,disposed=false,last=0,lastDraw=0,time=0;
    const tick=(now:number)=>{frame=null;if(disposed||!visible||document.hidden||media.matches||!spinning)return;const dt=Math.min((now-last)/1000,.05);last=now;if(!interacting.current)time+=dt;
      if(world.current&&now-lastDraw>=1000/30){world.current.style.transform=`rotateX(12deg) rotateY(${angleRef.current+Math.sin(time*.35)*6}deg)`;lastDraw=now;}frame=requestAnimationFrame(tick);};
    const sync=()=>{if(frame!=null)cancelAnimationFrame(frame);frame=null;last=performance.now();setReduced(media.matches);if(visible&&!document.hidden&&!media.matches&&spinning)frame=requestAnimationFrame(tick);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(element);media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{disposed=true;if(frame!=null)cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);};
  },[spinning]);
  return <div>
    <p className={styles.scale}>Mặt phẳng nét đứt: 50 · Trung tính. Rê chuột hoặc chạm vào cột để xem giá trị nguồn.</p>
    <div ref={stage} className={styles.threeStage} onPointerEnter={()=>{interacting.current=true;}} onPointerLeave={()=>{interacting.current=false;drag.current=null;}} onPointerDown={event=>{if(event.pointerType==='mouse'){drag.current=event.clientX;interacting.current=true;event.currentTarget.setPointerCapture(event.pointerId);}}} onPointerMove={event=>{if(drag.current==null)return;setAngle(value=>Math.max(-40,Math.min(40,value+(event.clientX-drag.current!)*.15)));drag.current=event.clientX;}} onPointerUp={()=>{drag.current=null;interacting.current=false;}} onPointerCancel={()=>{drag.current=null;interacting.current=false;}} onLostPointerCapture={()=>{drag.current=null;interacting.current=false;}}>
      <div ref={world} role="img" aria-label="Hồ sơ nhân tố 3D từ báo cáo" className={styles.threeWorld} style={{transform:`rotateX(12deg) rotateY(${angle}deg)`}}>
        <div className={styles.neutralPlane} data-factor-reference="50"/>
        {factors.map(p=>{const level=factorLevel(p.score);return <button key={p.id} type="button" data-factor-column={p.id} data-active={activeId===p.id} data-missing={p.score==null} className={`${styles.column} ${styles[level]}`} style={{height:p.score==null?170:Math.max(1,p.score*1.7)}} aria-label={`${p.label}: ${p.score==null?'Chưa có dữ liệu':`${p.score}/100, ${factorLevelNames[level]}`}`} onPointerEnter={event=>{onActive?.(p.id);onHint?.(p,event.currentTarget);}} onPointerLeave={()=>{onActive?.(null);onHideHint?.();}} onFocus={event=>{interacting.current=true;onActive?.(p.id);onHint?.(p,event.currentTarget);}} onBlur={()=>{interacting.current=false;onActive?.(null);onHideHint?.();}} onClick={event=>onHint?.(p,event.currentTarget,true)}><span className={styles.columnValue}>{p.score==null?'—':`${factorLevelSymbols[level]} ${p.score}`}</span><span className={styles.columnName}>{p.shortLabel}</span></button>;})}
      </div>
    </div>
    <div className={styles.threeControls}><button className={styles.control} type="button" disabled={reduced} aria-pressed={spinning&&!reduced} onClick={()=>setSpinning(!spinning)}>{reduced?'Đã giảm chuyển động':spinning?'Dừng tự xoay':'Tự xoay'}</button><label htmlFor={id}>Xoay góc nhân tố</label><input id={id} type="range" min="-40" max="40" step="1" value={angle} onChange={event=>setAngle(Number(event.target.value))} onPointerDown={()=>{interacting.current=true;}} onPointerUp={()=>{interacting.current=false;}} onKeyDown={()=>{interacting.current=true;}} onKeyUp={()=>{interacting.current=false;}} onBlur={()=>{interacting.current=false;}}/><button type="button" className={styles.control} onClick={()=>setAngle(-12)}>Đặt lại góc</button></div>
  </div>;
}

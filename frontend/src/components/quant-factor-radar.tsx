"use client";
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {PresentedFactor} from '@/lib/quant-factors';
import {factorGroups,factorLevel,factorLevelNames,factorLevelSymbols} from '@/lib/quant-factor-readings';
import {factorRadarLabels} from '@/lib/quant-factor-radar-layout';
import styles from './quant-factor-profile.module.css';
export type FactorPlotProps = {
  factors:PresentedFactor[];activeId?:string|null;onActive?:(id:string|null)=>void;
  onHint?:(factor:PresentedFactor,anchor:Element,pin?:boolean)=>void;onHideHint?:()=>void;title?:string;
};
export function FactorRadar({factors,activeId,onActive,onHint,onHideHint,title='Hồ sơ nhân tố chuẩn hóa'}:FactorPlotProps) {
  const host=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null),[width,setWidth]=useState(640);
  useEffect(()=>{const element=host.current;if(!element)return;const resize=new ResizeObserver(()=>setWidth(Math.max(560,Math.min(760,element.clientWidth))));resize.observe(element);return()=>resize.disconnect();},[]);
  useEffect(()=>{if(scroll.current)scroll.current.scrollLeft=(scroll.current.scrollWidth-scroll.current.clientWidth)/2;},[width]);
  const W=width,R=Math.min(190,(W/2-100)/1.34),H=R*2+170,cx=W/2,cy=R+80;
  const point=(i:number,fraction:number)=>{const angle=-Math.PI/2+Math.PI*2*i/factors.length;return [cx+Math.cos(angle)*R*fraction,cy+Math.sin(angle)*R*fraction];};
  const polygon=(fraction:number)=>factors.map((_,i)=>point(i,fraction).join(',')).join(' ');
  const labels=useMemo(()=>factorRadarLabels(factors.map(p=>p.score),cx,cy,R),[factors,cx,cy,R]);
  const complete=factors.every(p=>p.score!=null);
  return <div ref={host} className={styles.chart}>
    <div className={styles.groupKey}>{factorGroups.map(group=><span key={group.id} style={{'--group-color':group.color} as CSSProperties}>{group.label}</span>)}</div>
    <div ref={scroll} className={styles.chartScroll}>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{width:W}}>
        <title>{title}</title>
        <circle cx={cx} cy={cy} r="2" fill="var(--muted)" data-factor-reference="0"/><text x={cx+9} y={cy+15} fill="var(--muted)">0</text>
        <polygon points={polygon(1)} fill="none" stroke="var(--border)" data-factor-reference="100"/>
        <polygon points={polygon(.5)} className={styles.neutralRing} data-factor-reference="50"/>
        <text x={cx+8} y={cy-R/2+16} fill="var(--neutral)">50 · Trung tính</text><text x={cx+8} y={cy-R-8} fill="var(--muted)">100</text>
        {factorGroups.map(group=>{const indices=factors.flatMap((p,i)=>p.group===group.id?[i]:[]);if(!indices.length)return null;const delta=Math.PI*2/factors.length,r=R+8,a=-Math.PI/2+(indices[0]-.4)*delta,b=-Math.PI/2+(indices.at(-1)!+.4)*delta;return <path key={group.id} d={`M ${cx+Math.cos(a)*r} ${cy+Math.sin(a)*r} A ${r} ${r} 0 ${b-a>Math.PI?1:0} 1 ${cx+Math.cos(b)*r} ${cy+Math.sin(b)*r}`} fill="none" stroke={group.color} strokeWidth="3" opacity=".75"/>;})}
        {factors.map((p,i)=>{const [x,y]=point(i,1.34),end=point(i,1),anchor=Math.abs(x-cx)<5?'middle':x>cx?'start':'end';return <g key={p.id} data-factor-axis={p.id} className={`${activeId===p.id?styles.axisActive:''} ${p.score==null?styles.axisMissing:''}`}><line className={styles.axisLine} x1={cx} y1={cy} x2={end[0]} y2={end[1]}/><text x={x} y={y-(p.axisLabels.length-1)*8} aria-label={p.label} className={styles.axisLabel} textAnchor={anchor}>{p.axisLabels.map((line,j)=><tspan key={line} x={x} dy={j?17:0}>{j?' '+line:line}</tspan>)}</text></g>;})}
        {complete?<polygon points={factors.map((p,i)=>point(i,p.score!/100).join(',')).join(' ')} fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="2"/>:factors.map((p,i)=>{const next=factors[(i+1)%factors.length];return p.score!=null&&next.score!=null?<line key={p.id} x1={point(i,p.score/100)[0]} y1={point(i,p.score/100)[1]} x2={point((i+1)%factors.length,next.score/100)[0]} y2={point((i+1)%factors.length,next.score/100)[1]} stroke="var(--accent)" strokeWidth="2"/>:null;})}
        {labels.map(label=>{const p=factors[label.index],level=factorLevel(p.score),color=level==='strong'?'var(--positive)':level==='medium'?'var(--neutral)':'var(--negative)';return <g key={p.id} className={`${styles.point} ${styles[level]}`} data-factor-point={p.id} data-factor-value={p.id} data-active={activeId===p.id} role="button" tabIndex={0} aria-label={`${p.label}: ${p.score}/100, ${factorLevelNames[level]}`} onPointerEnter={event=>{onActive?.(p.id);onHint?.(p,event.currentTarget);}} onPointerLeave={()=>{onActive?.(null);onHideHint?.();}} onFocus={event=>{onActive?.(p.id);onHint?.(p,event.currentTarget);}} onBlur={()=>{onActive?.(null);onHideHint?.();}} onClick={event=>onHint?.(p,event.currentTarget,true)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onHint?.(p,event.currentTarget,true);}}}>
          {activeId===p.id&&<circle cx={label.pointX} cy={label.pointY} r="11" fill="none" stroke={color} strokeWidth="2"/>}<circle cx={label.pointX} cy={label.pointY} r="5" fill={color} stroke="var(--surface)" strokeWidth="1.5"/>
          <line x1={label.pointX} y1={label.pointY} x2={label.x} y2={label.y} stroke={color} opacity=".5"/>
          <rect x={label.x-28} y={label.y-12} width="56" height="24" rx="4" fill="var(--surface)" stroke={color}/><text className={styles.scoreLabel} x={label.x} y={label.y+4} textAnchor="middle" fill={color}>{`${factorLevelSymbols[level]} ${p.score}`}</text>
        </g>;})}
      </svg>
    </div>
    <p className={styles.panHint}>Vuốt ngang để xem đủ nhãn và điểm trên radar.</p>
  </div>;
}

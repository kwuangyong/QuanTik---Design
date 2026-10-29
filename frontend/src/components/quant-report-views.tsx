"use client";
import {useMemo,useState,type ReactNode} from "react";
import type {AnalysisReport,QuantResearch} from "@/lib/api/analysis";
import {number,record} from "@/lib/quant-reader";
import type {ScenarioScene} from "@/lib/quant-scenario-data";
import {SceneCanvas} from "./quant-scenario-3d";
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const button="rounded border px-3 py-2 text-[13px]";
function Switch({name,view,onChange,labels=["2D","3D"]}:{name:string;view:number;onChange:(n:number)=>void;labels?:string[]}) {return <div role="group" aria-label={name} className="mb-4 flex flex-wrap gap-2">{labels.map((label,i)=><button key={label} type="button" aria-pressed={view===i} onClick={()=>onChange(i)} className={`${button} ${view===i?"border-[var(--accent)] text-[var(--accent)]":"border-[var(--border)] text-[var(--muted)]"}`}>{label}</button>)}</div>;}
export function garchResponseScene(report:AnalysisReport):ScenarioScene|null {
 const section=report.sections.garch,outer=record(section?.metrics.garch),garch=record(outer.garch),params=record(garch.simulation_params);
 const omega=params.omega_pct2,alpha=params.alpha,beta=params.beta,sigma=garch.current_vol_pct;
 if(!section||section.status!=="AVAILABLE"||[outer,garch].some(v=>v.error||v.disabled===true||v.available===false)||![omega,alpha,beta,sigma].every(finite)||Number(omega)<0||Number(alpha)<0||Number(beta)<0||Number(sigma)<=0)return null;
 const rows=Array.from({length:13},(_,i)=>{const previous=Number(sigma)**2*(.25+i/12*1.75);return {name:`Phương sai trước ${number(previous)}`,color:i===6?"accent" as const:"positive" as const,points:Array.from({length:17},(_,j)=>{const shock=Number(sigma)*(-3+j/16*6);return {x:shock,y:previous,z:Number(omega)+Number(alpha)*shock**2+Number(beta)*previous,label:"Phản ứng phương sai"};})};});
 const series=[...rows,...Array.from({length:17},(_,j)=>({name:`Cú sốc ${j}`,color:"positive" as const,points:rows.map(row=>row.points[j])}))],points=series.flatMap(s=>s.points);
 if(points.some(p=>![p.x,p.y,p.z].every(finite)))return null;
 return {series,labels:[],axes:["Cú sốc ε (%)","Phương sai trước (%²)","Phương sai tiếp theo (%²)"],domains:[[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x))],[Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))],[Math.min(...points.map(p=>p.z)),Math.max(...points.map(p=>p.z))]]};
}
export function QuantGarchView({report,children}:{report:AnalysisReport;children:ReactNode}) {
 const [view,setView]=useState(0),scene=useMemo(()=>garchResponseScene(report),[report]);
 return <><Switch name="Góc nhìn biến động GARCH" view={view} onChange={setView}/>{view===0?children:scene?<><SceneCanvas scene={scene} frame={16} autoRotate title={`Mặt phản ứng GARCH 3D ${report.symbol}`}/><p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">Mặt phản ứng h = ω + αε² + βh trước, dùng tham số công bố. Khoảng trục minh hoạ quanh biến động hiện tại; đây không phải phân phối hoặc một dự báo mới.</p></>:<p className="py-8 text-[13px] leading-6 text-[var(--muted)]">Báo cáo chưa có đủ ω, α, β và biến động hiện tại để vẽ mặt phản ứng 3D. Biểu đồ biến động 2D vẫn giữ nguyên.</p>}</>;
}

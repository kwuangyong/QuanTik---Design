"use client";
import {lazy,Suspense,useState,type CSSProperties,type ComponentProps,type ReactNode} from "react";
import type {AnalysisReport} from "@/lib/api/analysis";
import type {ScenarioKind} from "@/lib/quant-scenario-data";

// The canvas code (2D context drawing, rotation, playback) is loaded only when a viewer opens a 3D scene.
const Scene=lazy(()=>import("./quant-scenario-3d-scene").then(m=>({default:m.SceneCanvas})));
const ThreeD=lazy(()=>import("./quant-scenario-3d-scene").then(m=>({default:m.QuantScenarioThreeD})));
const loading=<p role="status" style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)",padding:"24px 0"}}>Đang tải cảnh 3D…</p>;

export function SceneCanvas(props: ComponentProps<typeof Scene>) {return <Suspense fallback={loading}><Scene {...props}/></Suspense>;}
export function QuantScenarioThreeD(props: {report:AnalysisReport;kind:ScenarioKind}) {return <Suspense fallback={loading}><ThreeD {...props}/></Suspense>;}

const button: CSSProperties = {border:"1px solid var(--border)",borderRadius:3,background:"var(--surface)",padding:"7px 11px",fontSize:"var(--fs-min,13px)",lineHeight:"20px",color:"var(--muted)",cursor:"pointer"};
const active: CSSProperties = {...button,borderColor:"var(--accent)",color:"var(--accent)"};
const group: CSSProperties = {display:"flex",flexWrap:"wrap",alignItems:"center",gap:8};

export function QuantScenarioView({report,kind,children}: {report:AnalysisReport;kind:ScenarioKind;children?:ReactNode}) {
  const [open,setOpen]=useState(false),name="Monte Carlo";
  return <div style={{minWidth:0}}><div role="group" aria-label={`Chuyển 2D/3D ${name}`} style={{...group,marginBottom:12,marginTop:12}}>{(children||open)&&<button type="button" style={!open?active:button} aria-pressed={!open} onClick={()=>setOpen(false)}>2D</button>}<button type="button" style={open?active:button} aria-pressed={open} onClick={()=>setOpen(true)}>{children||open?"3D":"Khám phá 3D"}</button></div>{open?<QuantScenarioThreeD report={report} kind={kind}/>:children}</div>;
}

"use client";
import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import type {AnalysisReport} from "@/lib/api/analysis";
import {number} from "@/lib/quant-reader";
import {scenarioScenes,type ScenarioKind,type ScenarioScene} from "@/lib/quant-scenario-data";

const button: CSSProperties = {border:"1px solid var(--border)",borderRadius:3,background:"var(--surface)",padding:"7px 11px",fontSize:"var(--fs-min,13px)",lineHeight:"20px",color:"var(--muted)",cursor:"pointer"};
const active: CSSProperties = {...button,borderColor:"var(--accent)",color:"var(--accent)"};
const group: CSSProperties = {display:"flex",flexWrap:"wrap",alignItems:"center",gap:8};

export function SceneCanvas({scene,frame,title,autoRotate = true}: {scene:ScenarioScene;frame:number;title:string;autoRotate?:boolean}) {
  const [rotating,setRotating] = useState(true), [reduced,setReduced] = useState(false);
  const frameRef=useRef(frame);
  useEffect(()=>{frameRef.current=frame;redraw.current();},[frame]);
  const canvasRef = useRef<HTMLCanvasElement>(null), rotation = useRef({yaw:-.62,pitch:.45}), drag = useRef<{x:number;y:number}|null>(null), redraw = useRef(()=>{});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext("2d"); if(!canvas||!ctx)return;
    let width=0,height=0,disposed=false;
    const terminal=canvas.closest(".terminal");
    let palette: Record<string,string>={};
    const colors=()=>{const css=getComputedStyle(canvas);palette=Object.fromEntries(["border","muted","text","accent","positive","negative","neutral"].map(key=>[key,css.getPropertyValue(`--${key}`).trim()]));};
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    let animation:number|null=null,lastRotation=0,inView=false,lastDraw=0;
    const spin=(now:number)=>{animation=null;if(disposed||!inView||document.hidden)return;if(!drag.current)rotation.current.yaw+=Math.min((now-lastRotation)/1000,.05)*.12;lastRotation=now;if(now-lastDraw>=1000/30){draw();lastDraw=now;}animation=requestAnimationFrame(spin);};
    const syncAnimation=()=>{if(animation!==null)cancelAnimationFrame(animation);animation=null;lastRotation=performance.now();if(inView&&!document.hidden)draw();if(autoRotate&&rotating&&!motion.matches&&inView&&!document.hidden)animation=requestAnimationFrame(spin);};
    const visible=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;syncAnimation();});visible.observe(canvas);document.addEventListener("visibilitychange",syncAnimation);
    const preference=()=>{setReduced(motion.matches);syncAnimation();};motion.addEventListener("change",preference);preference();
    const normalize=(v:number,i:number)=>{const [lo,hi]=scene.domains[i];return hi === lo ? .5 : (v-lo)/(hi-lo);};
    const project=(x:number,y:number,z:number):[number,number]=>{const a=x*Math.cos(rotation.current.yaw)-y*Math.sin(rotation.current.yaw),b=x*Math.sin(rotation.current.yaw)+y*Math.cos(rotation.current.yaw);return[width*.5+a*width*.245,height*.73+b*height*.17*Math.cos(rotation.current.pitch)-z*height*.29];};
    const point=(x:number,y:number,z:number)=>project(normalize(x,0)*2-1,normalize(y,1)*2-1,normalize(z,2)*1.65);
    const line=(points:[number,number][],color:string,weight=1,opacity=1)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.globalAlpha=opacity;points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.globalAlpha=1;};
    function draw(){
      if(disposed||!width||!ctx)return;ctx.clearRect(0,0,width,height);
      for(let i=0;i<=6;i++){const n=-1+i/3;line([project(n,-1,0),project(n,1,0)],palette.border);line([project(-1,n,0),project(1,n,0)],palette.border);}
      line([project(-1,-1,0),project(-1,-1,1.65)],palette.muted);
      for(const series of scene.series){
          const points=series.points.slice(0,frameRef.current+1);
          for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];line([point(a.x,a.y,a.z),point(b.x,b.y,b.z)],palette[series.color],series.color==="accent"?2.4:1.3,series.color==="accent"?1:.65);}
          if(points.length){const p=points.at(-1)!,[x,y]=point(p.x,p.y,p.z);ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=palette[series.color];ctx.fill();}
      }
      ctx.font=`${Math.max(13,parseFloat(getComputedStyle(canvas!).getPropertyValue("--fs-min"))||13)}px "IBM Plex Mono",ui-monospace,monospace`;ctx.fillStyle=palette.muted;ctx.textAlign="left";ctx.fillText(scene.axes[2],8,17);ctx.fillText(`${number(scene.domains[2][0])} → ${number(scene.domains[2][1])}`,8,34);ctx.fillText(scene.axes[1],8,height-12);ctx.textAlign="right";ctx.fillText(scene.axes[0],width-8,height-12);
    }
    const resize=()=>{const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=box.width;height=box.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);colors();draw();};
    const observer=new ResizeObserver(resize),theme=new MutationObserver(()=>{colors();draw();});observer.observe(canvas);if(terminal)theme.observe(terminal,{attributes:true,attributeFilter:["data-theme"]});redraw.current=()=>{if(inView&&!document.hidden)draw();};resize();document.fonts.ready.then(()=>{if(!disposed)draw();});
    return()=>{disposed=true;observer.disconnect();theme.disconnect();visible.disconnect();document.removeEventListener("visibilitychange",syncAnimation);motion.removeEventListener("change",preference);if(animation!==null)cancelAnimationFrame(animation);redraw.current=()=>{};};
  },[scene,autoRotate,rotating]);
  const rotate=(yaw:number,pitch=0)=>{rotation.current.yaw+=yaw;rotation.current.pitch=Math.max(-.5,Math.min(.9,rotation.current.pitch+pitch));redraw.current();};
  return <><div style={{...group,justifyContent:"space-between",marginTop:12}}><span style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)"}}>Kéo để xoay · dùng phím mũi tên</span><div style={group}><button type="button" style={button} disabled={reduced||!autoRotate} aria-pressed={rotating&&autoRotate&&!reduced} onClick={()=>setRotating(!rotating)}>{reduced?"Đã giảm chuyển động":rotating&&autoRotate?"Dừng tự xoay":"Tự xoay"}</button><button type="button" style={button} aria-label="Xoay 3D sang trái" onClick={()=>rotate(-.15)}>↶</button><button type="button" style={button} aria-label="Xoay 3D sang phải" onClick={()=>rotate(.15)}>↷</button><button type="button" style={button} onClick={()=>{rotation.current={yaw:-.62,pitch:.45};redraw.current();}}>Đặt lại góc</button></div></div><canvas ref={canvasRef} role="img" aria-label={title} tabIndex={0} style={{display:"block",width:"100%",height:330,touchAction:"pan-y",cursor:"grab"}} onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();rotate(event.key==="ArrowLeft"?-.1:event.key==="ArrowRight"?.1:0,event.key==="ArrowUp"?.07:event.key==="ArrowDown"?-.07:0);}} onPointerDown={event=>{drag.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!drag.current)return;rotate((event.clientX-drag.current.x)*.007,event.pointerType==="mouse"?(event.clientY-drag.current.y)*.004:0);drag.current={x:event.clientX,y:event.clientY};}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}/></>;
}

function SceneExplorer({scene,kind}: {scene:ScenarioScene;kind:ScenarioKind}) {
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(true),[reduced,setReduced]=useState(false),wrapper=useRef<HTMLDivElement>(null),frameRef=useRef(frame);
  const index=Math.max(0,Math.min(frame,scene.labels.length-1));
  frameRef.current=index;
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)"),sync=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync);},[]);
  useEffect(()=>{
    if(!playing||reduced)return;
    let raf:number|null=null,last=0,elapsed=0,visible=false,disposed=false;const from=frameRef.current;
    const cancel=()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;};
    const tick=(now:number)=>{raf=null;if(disposed||!visible||document.hidden)return;elapsed+=Math.max(0,Math.min(now-last,100));last=now;const next=(from+Math.floor(elapsed/Math.max(180,10000/scene.labels.length)))%scene.labels.length;setFrame(next);raf=requestAnimationFrame(tick);};
    const sync=()=>{cancel();last=performance.now();if(visible&&!document.hidden)raf=requestAnimationFrame(tick);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});if(wrapper.current)observer.observe(wrapper.current);document.addEventListener("visibilitychange",sync);
    return()=>{disposed=true;cancel();observer.disconnect();document.removeEventListener("visibilitychange",sync);};
  },[playing,reduced,scene]);
  const label="Monte Carlo";
  return <div ref={wrapper}>
    <p style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)"}}>Phát lại phân vị đã công bố · Lặp liên tục khi bật phát</p><SceneCanvas scene={scene} frame={index} autoRotate={playing&&!reduced} title={`${label} 3D theo phiên`}/>
    {<><div style={{...group,justifyContent:"space-between",fontSize:"var(--fs-min,13px)",marginTop:8}}><span aria-live={playing?"off":"polite"}>{scene.labels[index]}</span><button type="button" style={button} disabled={reduced} aria-pressed={playing} onClick={()=>{if(!playing&&frame>=scene.labels.length-1)setFrame(0);setPlaying(!playing);}}>{playing?"Tạm dừng":"Phát theo phiên"}</button></div><input type="range" aria-label={`Chọn phiên ${label} 3D`} min={0} max={scene.labels.length-1} step={1} value={index} onChange={event=>{setPlaying(false);setFrame(Number(event.target.value));}} style={{width:"100%",accentColor:"var(--accent)",marginTop:12}}/>{reduced&&<p style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)"}}>Chế độ giảm chuyển động: dùng thanh chọn phiên để xem từng điểm.</p>}</>}
    <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:10,fontSize:"var(--fs-min,13px)",marginTop:14}}>{scene.series.map(series=>{const p=series.points[Math.min(index,series.points.length-1)];return <div key={series.name}><dt style={{color:`var(--${series.color})`}}>{series.name}</dt><dd style={{margin:0,marginTop:4,fontFamily:"var(--font-mono),monospace"}}>{number(p.z," VND")}</dd></div>;})}</dl>
    <details style={{fontSize:"var(--fs-min,13px)",lineHeight:"22px",color:"var(--muted)",marginTop:14}}><summary style={{cursor:"pointer",color:"var(--accent)"}}>Ý nghĩa các trục & giới hạn mô phỏng</summary><p>Trục X: {scene.axes[0]}. Trục Y: {scene.axes[1]}. Trục đứng: {scene.axes[2]}.</p><p>Năm đường P05, P25, P50, P75 và P95 là các phân vị từ báo cáo; đường cam là P50. Đây không phải các đường kịch bản riêng lẻ. Phát theo phiên chỉ lần lượt hiển thị các điểm đã công bố; không chạy lại mô hình hoặc tạo dự báo mới.</p></details>
  </div>;
}

export function QuantScenarioThreeD({report,kind}: {report:AnalysisReport;kind:ScenarioKind}) {
  const data=useMemo(()=>scenarioScenes(report,kind),[report,kind]);
  return <section aria-label="Monte Carlo · Khám phá 3D" style={{minWidth:0}}>{data.history?<SceneExplorer scene={data.history} kind={kind}/>:<p role="status" style={{fontSize:"var(--fs-min,13px)",lineHeight:"24px",padding:"24px 0",color:"var(--muted)"}}>Báo cáo chưa công bố đủ phân vị hợp lệ để vẽ 3D. Biểu đồ 2D và phần giải thích vẫn được giữ nguyên.</p>}</section>;
}

export function QuantScenarioView({report,kind,children}: {report:AnalysisReport;kind:ScenarioKind;children?:ReactNode}) {
  const [open,setOpen]=useState(false),name="Monte Carlo";
  return <div style={{minWidth:0}}><div role="group" aria-label={`Chuyển 2D/3D ${name}`} style={{...group,marginBottom:12,marginTop:12}}>{(children||open)&&<button type="button" style={!open?active:button} aria-pressed={!open} onClick={()=>setOpen(false)}>2D</button>}<button type="button" style={open?active:button} aria-pressed={open} onClick={()=>setOpen(true)}>{children||open?"3D":"Khám phá 3D"}</button></div>{open?<QuantScenarioThreeD report={report} kind={kind}/>:children}</div>;
}

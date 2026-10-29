"use client";
import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import type {AnalysisReport} from "@/lib/api/analysis";
import {number} from "@/lib/quant-reader";
import {hmmPhaseData,type HmmState} from "@/lib/quant-scenario-data";

const vertices: Record<HmmState,[number,number]> = {BULL:[240,52],BEAR:[62,278],SIDEWAY:[418,278]};
const colors: Record<HmmState,string> = {BULL:"var(--positive)",BEAR:"var(--negative)",SIDEWAY:"var(--neutral)"};
const labels: Record<HmmState,string> = {BULL:"Pha tăng",BEAR:"Pha giảm",SIDEWAY:"Đi ngang"};
const states: HmmState[] = ["BULL","BEAR","SIDEWAY"];
const button: CSSProperties = {border:"1px solid var(--border)",borderRadius:3,background:"var(--surface)",padding:"7px 11px",fontSize:"var(--fs-min,13px)",lineHeight:"20px",color:"var(--muted)",cursor:"pointer"};
const active: CSSProperties = {...button,borderColor:"var(--accent)",color:"var(--accent)"};
const row: CSSProperties = {display:"flex",flexWrap:"wrap",alignItems:"center",gap:8};

export function HmmPhaseTriangle({report}: {report:AnalysisReport}) {
  const data=useMemo(()=>hmmPhaseData(report),[report]),[mode,setMode]=useState<"history"|"current">("history"),[frame,setFrame]=useState(0),[playing,setPlaying]=useState(true),[reduced,setReduced]=useState(false),[animating,setAnimating]=useState(false),wrapper=useRef<HTMLDivElement>(null),frameRef=useRef(frame);
  const index=Math.min(frame,Math.max(0,data.history.length-1)),current=data.history[index],probabilities=data.probabilities;
  frameRef.current=index;
  useEffect(()=>{setFrame(0);setPlaying(data.history.length>=2);},[data]);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)"),sync=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync);},[]);
  useEffect(()=>{
    if(!playing||reduced||mode!=="history"||data.history.length<2){setAnimating(false);return;}
    let timer:ReturnType<typeof setInterval>|null=null,visible=false;
    const cancel=()=>{if(timer!==null)clearInterval(timer);timer=null;};
    const sync=()=>{cancel();setAnimating(visible&&!document.hidden);if(visible&&!document.hidden)timer=setInterval(()=>{const nextChange=data.history.findIndex((p,i)=>i>frameRef.current&&p.state!==data.history[frameRef.current].state);const next=nextChange<0?(frameRef.current>=data.history.length-1?0:data.history.length-1):nextChange;frameRef.current=next;setFrame(next);},1200);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});if(wrapper.current)observer.observe(wrapper.current);document.addEventListener("visibilitychange",sync);
    return()=>{cancel();observer.disconnect();document.removeEventListener("visibilitychange",sync);};
  },[playing,reduced,mode,data]);
  const position: [number,number] | null = mode==="history" ? current ? vertices[current.state] : null : probabilities ? (()=>{const total=states.reduce((sum,state)=>sum+probabilities[state],0);return [states.reduce((sum,state)=>sum+vertices[state][0]*probabilities[state]/total,0),states.reduce((sum,state)=>sum+vertices[state][1]*probabilities[state]/total,0)] as [number,number];})() : null;
  const trail = mode==="history" ? data.history.slice(0,index+1).filter((p,i,arr)=>i===0||p.state!==arr[i-1].state).slice(-8) : [];
  const hasData=mode==="history"?data.history.length>=2:!!probabilities;
  return <section ref={wrapper} aria-label="HMM · Tam giác chuyển pha" style={{minWidth:0,marginTop:18,paddingTop:16,borderTop:"1px solid var(--border)"}}>
    <div style={{...row,justifyContent:"space-between"}}><h5 style={{fontSize:"var(--fs-min,13px)",fontWeight:500,margin:0}}>HMM · Tam giác chuyển pha</h5><span style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)"}}>BULL / SIDEWAY / BEAR</span></div>
    <p style={{fontSize:"var(--fs-min,13px)",color:"var(--muted)",marginTop:10}}>Phát lại các pha đã công bố · Lặp liên tục khi bật phát</p><div role="group" aria-label="Góc nhìn tam giác HMM" style={{...row,marginTop:14}}><button type="button" style={mode==="history"?active:button} aria-pressed={mode==="history"} onClick={()=>{setMode("history");setPlaying(false);}}>Diễn biến trạng thái</button><button type="button" style={mode==="current"?active:button} aria-pressed={mode==="current"} onClick={()=>{setMode("current");setPlaying(false);}}>Xác suất hiện tại</button></div>
    {data.fallback&&<p style={{fontSize:"var(--fs-min,13px)",lineHeight:"22px",color:"var(--muted)"}}>Nguồn dùng phương pháp thay thế; đọc nhãn theo phương pháp báo cáo công bố.</p>}
    {hasData&&position?<>
      <svg role="img" aria-label={mode==="history"?`Tam giác chuyển pha HMM tại ${current.date}: ${current.state}`:"Tam giác xác suất HMM hiện tại"} viewBox="0 0 480 350" style={{display:"block",width:"100%",maxHeight:390,marginTop:10,overflow:"visible"}}>
        <title>{mode==="history"?`${current.date} · ${current.state} · ${number(current.price)} VND`:"Vị trí bên trong tam giác biểu diễn ba xác suất hiện tại"}</title>
        <polygon points="240,52 418,278 62,278" fill="var(--raised)" stroke="var(--border)" strokeWidth="1.5"/>
        {[.25,.5,.75].map(f=>{const bx=240+(62-240)*f,by=52+(278-52)*f,sx=240+(418-240)*f;return <g key={f} stroke="var(--border)" strokeWidth=".7" opacity=".6"><line x1={bx} y1={by} x2={sx} y2={by}/><line x1={62+(418-62)*f} y1="278" x2={240+(418-240)*f} y2={52+(278-52)*f}/><line x1={62+(418-62)*f} y1="278" x2={62+(240-62)*f} y2={278+(52-278)*f}/></g>;})}
        {states.map(state=>{const [x,y]=vertices[state],isBull=state==="BULL";return <g key={state}><circle cx={x} cy={y} r="7" fill={colors[state]} opacity={mode==="history"&&current.state!==state?.45:1}/><text x={x} y={isBull?23:310} fill={colors[state]} fontFamily="var(--font-mono),monospace" textAnchor="middle" fontSize="13">{state}</text><text x={x} y={isBull?39:328} fill="var(--muted)" textAnchor="middle" fontSize="13">{mode==="current"&&probabilities?`${number(probabilities[state])}%`:labels[state]}</text></g>;})}
        {mode==="history"&&trail.length>1&&<polyline points={trail.map(p=>vertices[p.state].join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeDasharray="5 6" opacity=".6"/>}
        <g data-phase-point="true" style={{transform:`translate(${position[0]}px,${position[1]}px)`,transition:!reduced&&animating?"transform 600ms ease-in-out":"none"}}><circle r="17" fill="var(--accent)" opacity=".12">{animating&&!reduced&&<animate attributeName="r" values="12;23;12" dur="1.4s" repeatCount="indefinite"/>}</circle><circle r="6" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2"/></g>
        <text x="240" y="187" fill="var(--muted)" textAnchor="middle" fontSize="13">{mode==="history"?"Vệt nhãn đã quan sát":"Ba xác suất hiện tại"}</text>
      </svg>
      {mode==="history"&&<><div style={{...row,justifyContent:"space-between",marginTop:5,fontSize:"var(--fs-min,13px)"}}><div aria-live={playing?"off":"polite"}><span style={{color:colors[current.state]}}>{current.state}</span><span style={{color:"var(--muted)"}}> · {current.date} · </span><span>{number(current.price)} VND</span></div><button type="button" style={{...button,opacity:reduced?.5:1}} disabled={reduced} aria-pressed={playing} onClick={()=>{if(!playing&&index>=data.history.length-1){frameRef.current=0;setFrame(0);}setPlaying(!playing);}}>{playing?"Tạm dừng":"Phát chuyển pha"}</button></div><input type="range" aria-label="Chọn phiên chuyển pha HMM" min={0} max={data.history.length-1} step={1} value={index} onChange={event=>{setPlaying(false);setFrame(Number(event.target.value));}} style={{display:"block",width:"100%",accentColor:"var(--accent)",marginTop:14}}/><div style={{...row,justifyContent:"space-between",color:"var(--muted)",fontSize:"var(--fs-min,13px)"}}><span>{data.history[0].date}</span><span>{data.history.at(-1)!.date}</span></div></>}
      {mode==="current"&&probabilities&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,fontSize:"var(--fs-min,13px)"}}>{states.map(state=><div key={state}><span style={{color:colors[state]}}>{state}</span><p style={{margin:"6px 0",fontFamily:"var(--font-mono),monospace"}}>{number(probabilities[state],"%")}</p></div>)}</div>}
    </>:<p role="status" style={{padding:"24px 0",fontSize:"var(--fs-min,13px)",lineHeight:"24px",color:"var(--muted)"}}>Chưa có đủ {mode==="history"?"lịch sử nhãn trạng thái":"ba xác suất hợp lệ"} để dựng tam giác. {mode==="history"&&probabilities?"Có thể chuyển sang Xác suất hiện tại.":"Giữ nguyên các kết quả và giải thích đã công bố."}</p>}
    <details style={{marginTop:14,fontSize:"var(--fs-min,13px)",lineHeight:"23px",color:"var(--muted)"}}><summary style={{cursor:"pointer",color:"var(--accent)"}}>Biểu đồ này đọc như thế nào?</summary><p>Mỗi đỉnh là một pha: BULL, SIDEWAY hoặc BEAR. Ở Diễn biến trạng thái, chấm chạy theo nhãn từng phiên đã có trong báo cáo; vệt nét đứt nối các lần đổi nhãn gần đây. Nút phát chuyển qua các phiên đổi pha; thanh chọn vẫn xem được từng phiên. Chuyển động giữa các đỉnh là hiệu ứng minh họa, không phải các xác suất trung gian được ước lượng.</p><p>Ở Xác suất hiện tại, vị trí chấm là trọng tâm theo ba xác suất đã công bố. Càng gần một đỉnh, tỷ trọng xác suất pha đó càng lớn; sai số làm tròn được chuẩn hóa khi đặt vị trí. Xác suất trạng thái không phải xác suất giao dịch thắng.</p><p>Báo cáo chưa công bố chuỗi xác suất lịch sử hoặc ma trận chuyển pha nên giao diện không tạo thêm dữ liệu đó. Không có dự báo hoặc quyết định mới được tính từ tam giác.</p>{reduced&&<p>Chế độ giảm chuyển động: dùng thanh chọn phiên để xem từng trạng thái.</p>}</details>
  </section>;
}

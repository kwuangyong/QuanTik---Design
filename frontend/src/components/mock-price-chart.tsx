"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, CandlestickData } from "lightweight-charts";
import { movingAverage, previewBars, relativeStrength, type PreviewBar, type PreviewFrame } from "@/lib/chart-preview";
import { usePreferences } from "./preferences";

export function MockPriceChart({symbol,exchange}:{symbol:string;exchange:string}) {
  const {theme} = usePreferences();
  const [frame,setFrame] = useState<PreviewFrame>("D");
  const [sma,setSma] = useState(true),[ema,setEma] = useState(false),[rsi,setRsi] = useState(false);
  const [hover,setHover] = useState<Pick<PreviewBar,"open"|"high"|"low"|"close"> | null>(null);
  const [state,setState] = useState("loading");
  const mount = useRef<HTMLDivElement>(null), chartRef = useRef<IChartApi | null>(null);
  const bars = useMemo(()=>previewBars(symbol,frame),[symbol,frame]);
  const active = hover || bars[bars.length-1];
  useEffect(()=>{
    let disposed=false;
    setState("loading");setHover(null);
    void import("lightweight-charts").then(({createChart,CandlestickSeries,HistogramSeries,LineSeries,ColorType})=>{
      if(disposed || !mount.current || !bars.length)return;
      const light=theme==="light",line=light?"#d7e0e3":"#294337";
      const chart=createChart(mount.current,{autoSize:true,height:500,layout:{background:{type:ColorType.Solid,color:light?"#ffffff":"#080d0b"},textColor:light?"#526b74":"#a6b9ad",fontFamily:'"IBM Plex Mono", monospace',fontSize:12,attributionLogo:true},grid:{vertLines:{color:line},horzLines:{color:line}},rightPriceScale:{borderColor:line},timeScale:{borderColor:line,timeVisible:false},localization:{locale:"vi-VN"}});
      chartRef.current=chart;
      const price=chart.addSeries(CandlestickSeries,{upColor:"#67d6a5",downColor:"#f08088",wickUpColor:"#67d6a5",wickDownColor:"#f08088",borderVisible:false});
      price.setData(bars);
      const volume=chart.addSeries(HistogramSeries,{priceFormat:{type:"volume"},priceScaleId:"volume"});
      volume.setData(bars.map(bar=>({time:bar.time,value:bar.volume,color:bar.close>=bar.open?"#67d6a54d":"#f080884d"})));
      price.priceScale().applyOptions({scaleMargins:{top:0.08,bottom:0.25}});
      volume.priceScale().applyOptions({scaleMargins:{top:0.8,bottom:0}});
      for(const [enabled,exponential,color] of [[sma,false,"#ff914d"],[ema,true,"#86a8ff"]] as const){if(enabled){const series=chart.addSeries(LineSeries,{color,lineWidth:2,priceLineVisible:false,lastValueVisible:false});series.setData(movingAverage(bars,20,exponential));}}
      if(rsi&&bars.length>14){const indicator=chart.addSeries(LineSeries,{color:"#c8a6ff",lineWidth:2,priceLineVisible:false,priceFormat:{type:"price",precision:1,minMove:0.1}},1);indicator.setData(relativeStrength(bars));for(const value of [30,70])indicator.createPriceLine({price:value,color:line,lineWidth:1,lineStyle:2,axisLabelVisible:true});chart.panes()[1].setHeight(130);}
      chart.subscribeCrosshairMove(event=>{const point=event.seriesData.get(price) as CandlestickData | undefined;setHover(point&&"open" in point?{open:point.open,high:point.high,low:point.low,close:point.close}:null);});
      chart.timeScale().fitContent();
      setState("ready");
    }).catch(()=>{if(!disposed)setState("error");});
    return()=>{disposed=true;chartRef.current?.remove();chartRef.current=null;};
  },[bars,theme,sma,ema,rsi]);
  const button=(label:string,pressed:boolean,onClick:()=>void,disabled=false)=><button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick} className={`rounded px-2 py-1.5 text-xs ${pressed?"bg-[var(--accent-soft)] text-[var(--accent)]":"text-[var(--muted)]"} disabled:opacity-40`}>{label}</button>;
  return <div data-chart-engine="lightweight-mock" data-chart-state={state} className="font-mono">
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
      <strong className="mr-2 text-sm">{symbol} <span className="text-xs font-normal text-[var(--muted)]">{exchange}</span></strong>
      <div role="group" aria-label="Khung biểu đồ mock">{(["D","W","M"] as const).map(value=><span key={value}>{button(value,frame===value,()=>setFrame(value))}</span>)}</div>
      <div role="group" aria-label="Chỉ báo mock" className="flex gap-1 border-l border-[var(--border)] pl-2">{button("SMA 20",sma,()=>setSma(!sma),bars.length<20)}{button("EMA 20",ema,()=>setEma(!ema),bars.length<20)}{button("RSI 14",rsi,()=>setRsi(!rsi),bars.length<=14)}</div>
      <button type="button" className="ml-auto px-2 text-xs text-[var(--muted)]" onClick={()=>chartRef.current?.timeScale().fitContent()}>Vừa khung</button>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-xs text-[var(--muted)]" aria-live="off">{active&&(["open","high","low","close"] as const).map(key=><span key={key}>{({open:"O",high:"H",low:"L",close:"C"})[key]} <b className="text-[var(--text)]">{active[key].toLocaleString("vi-VN",{minimumFractionDigits:2,maximumFractionDigits:2})}</b></span>)}</div>
    {bars.length?<div ref={mount} className="h-[500px] w-full" role="img" aria-label={`Chart mô phỏng ${symbol}, khung ${frame}, ${bars.length} nến`}/>:<p className="p-8 text-sm">Chưa có dữ liệu mô phỏng cho mã này.</p>}
    {state==="error"&&<p role="alert" className="px-3 py-2 text-sm">Chưa dựng được chart. Hãy tải lại trang.</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-3 text-xs text-[var(--muted)]"><span className="text-[var(--accent)]">MÔ PHỎNG · Giá nghìn ₫ · Không phải dữ liệu thị trường</span><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™ · © 2025 TradingView, Inc. ↗</a></div>
  </div>;
}

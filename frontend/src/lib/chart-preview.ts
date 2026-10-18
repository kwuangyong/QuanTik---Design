import fixture from "@/content/chart-preview.json";

export type PreviewBar = { time: string; open: number; high: number; low: number; close: number; volume: number };
export type PreviewFrame = "D" | "W" | "M";
const day = 86400000;
export function previewBars(symbol: string, frame: PreviewFrame = "D"): PreviewBar[] {
  const series = fixture.series.find(item => item.symbol === symbol);
  if (!series) return [];
  let date = Date.UTC(2026, 7, 3);
  const bars = series.daily.map(candle => {
    while ([0,6].includes(new Date(date).getUTCDay())) date += day;
    const bar = {time: new Date(date).toISOString().slice(0,10),open:candle.open,high:candle.high,low:candle.low,close:candle.close,volume:candle.volume};
    date += day;
    return bar;
  });
  return aggregateBars(bars, frame);
}
export function aggregateBars(bars: PreviewBar[], frame: PreviewFrame): PreviewBar[] {
  if (frame === "D") return bars.map(bar => ({...bar}));
  const groups = new Map<string, PreviewBar>();
  for (const bar of bars) {
    const date = new Date(`${bar.time}T00:00:00Z`);
    if (frame === "W") date.setUTCDate(date.getUTCDate() - (date.getUTCDay()+6)%7);
    else date.setUTCDate(1);
    const key = date.toISOString().slice(0,10), previous = groups.get(key);
    groups.set(key, previous ? {...previous,high:Math.max(previous.high,bar.high),low:Math.min(previous.low,bar.low),close:bar.close,volume:previous.volume+bar.volume} : {...bar,time:key});
  }
  return [...groups.values()];
}
export function movingAverage(bars: PreviewBar[], period = 20, exponential = false) {
  const result: {time:string;value:number}[] = [];
  let sum = 0, value = 0;
  for (let index=0;index<bars.length;index++) {
    sum += bars[index].close;
    if (index >= period) sum -= bars[index-period].close;
    if (index < period-1) continue;
    value = index === period-1 || !exponential ? sum/period : bars[index].close*2/(period+1)+value*(1-2/(period+1));
    result.push({time:bars[index].time,value});
  }
  return result;
}
export function relativeStrength(bars: PreviewBar[], period = 14) {
  const result: {time:string;value:number}[] = [];
  let gain=0,loss=0;
  for (let index=1;index<bars.length;index++) {
    const delta=bars[index].close-bars[index-1].close;
    if(index<=period){gain+=Math.max(0,delta)/period;loss+=Math.max(0,-delta)/period;}
    else {gain=(gain*(period-1)+Math.max(0,delta))/period;loss=(loss*(period-1)+Math.max(0,-delta))/period;}
    if(index>=period)result.push({time:bars[index].time,value:gain===0&&loss===0?50:loss===0?100:100-100/(1+gain/loss)});
  }
  return result;
}

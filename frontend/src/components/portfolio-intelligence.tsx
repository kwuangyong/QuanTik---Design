"use client";
import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Download, Plus, Pencil, Trash2, ShieldAlert, Layers3, Activity, Info, Play, RotateCcw, Wallet, TrendingUp, Gauge, Target } from "lucide-react";
import { Modal } from "./ui";
import { portfolioAssets as assets, portfolioSamples, portfolioResources, portfolioDataInfo, money, pct } from "@/lib/portfolio";
import { portfolioRisk, validatePortfolio, type Portfolio, type Position } from "@/lib/portfolio-engine";
import { defaultScenario, scenarioPresets, defaultLimits, simulatePortfolio, deterministicImpact, rebalancePreview, type Scenario, type Limits } from "@/lib/portfolio-simulation";
import { quantModel } from "@/lib/portfolio-quant-adapter";
import s from "./portfolio.module.css";

type Simulation = ReturnType<typeof simulatePortfolio>;
type Plan = ReturnType<typeof rebalancePreview>;
const tabs = ["Tổng quan", "Rủi ro & tương quan", "Kịch bản biến động", "Action plan"];
const storageKey = "quantik.portfolio.v1";
const initial = portfolioSamples[0].portfolio;
const signedMoney = (value: number) => `${value > 0 ? "+" : ""}${money(value)}`;

export function PortfolioIntelligence() {
  const [portfolio, setPortfolio] = useState<Portfolio>(initial);
  const [sample, setSample] = useState("0"), [tab, setTab] = useState(0);
  const [loaded, setLoaded] = useState(false), [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Position | "new" | null>(null), [undo, setUndo] = useState<Portfolio | null>(null);
  const [scenario, setScenario] = useState<Scenario>(defaultScenario), [limits, setLimits] = useState<Limits>(defaultLimits);
  const [run, setRun] = useState<{ key: string; result: Simulation; portfolio: Portfolio } | null>(null);
  const [plan, setPlan] = useState<{ key: string; result: Plan; scenario: Scenario; limits: Limits } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const risk = useMemo(() => portfolioRisk(portfolio, assets), [portfolio]);
  const simulationKey = JSON.stringify({portfolio,scenario});
  const planKey = JSON.stringify({portfolio,scenario,limits});
  const largest = [...risk.holdings].sort((a,b)=>b.weight-a.weight)[0];
  const biggestRisk = [...risk.holdings].sort((a,b)=>b.riskContribution-a.riskContribution)[0];
  const concentrated = largest && largest.weight > limits.stock;
  const correlatedPair = risk.holdings.flatMap((a,i)=>risk.holdings.slice(i+1).map(b=>({a:a.symbol,b:b.symbol,value:risk.correlation[a.index][b.index]}))).sort((a,b)=>b.value-a.value)[0];
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) { const parsed = JSON.parse(saved) as Portfolio; validatePortfolio(parsed,assets); setPortfolio(parsed); setSample("custom"); setStatus("Đã khôi phục danh mục lưu trên trình duyệt."); }
    } catch { setStatus("Không đọc được dữ liệu đã lưu; đang dùng danh mục mẫu."); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(storageKey,JSON.stringify(portfolio)); }
    catch { setStatus("Trình duyệt không cho lưu dữ liệu. Bạn vẫn có thể xuất CSV."); }
  }, [portfolio,loaded]);
  const update = (next: Portfolio) => { validatePortfolio(next,assets); setPortfolio(next); setSample("custom"); setError(""); };
  const execute = (kind: "scenario" | "plan") => {
    setBusy(true); setError("");
    // Cho trình duyệt vẽ trạng thái chạy trước phép tính đồng bộ có giới hạn.
    window.setTimeout(() => {
      try {
        if(kind==="scenario") setRun({key:simulationKey,result:simulatePortfolio(portfolio,assets,scenario),portfolio});
        else setPlan({key:planKey,result:rebalancePreview(portfolio,assets,limits,scenario),scenario:{...scenario},limits:{...limits}});
        setStatus(kind==="scenario" ? "Đã chạy 1.200 đường mô phỏng." : "Đã kiểm chứng phương án bằng cùng seed và giả định.");
      } catch (e) { setError(e instanceof Error ? e.message : "Không thể tính kết quả."); }
      finally { setBusy(false); }
    },40);
  };
  const exportCsv = () => {
    const csv = "\uFEFFMã,Khối lượng,Giá mua VND,Giá mẫu VND,Giá trị VND,Lãi lỗ VND\r\n" + risk.holdings.map(h=>[h.symbol,h.quantity,h.cost,h.price,h.value,h.profit].join(",")).join("\r\n") + `\r\nTIEN_MAT,,,,${portfolio.cash},\r\n`;
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})), link=document.createElement("a"); link.href=url; link.download="QuanTik-Danh-muc-mau.csv"; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); setStatus("Đã xuất danh mục CSV, gồm tiền mặt.");
  };
  return <div className={s.page} data-portfolio>
    <header className={s.heading}>
      <div><p className={s.eyebrow}>QUANTIK / PORTFOLIO LAB</p><h1>Portfolio Intelligence</h1><p className={s.muted}>Hiểu <strong>nguồn rủi ro</strong>. Kiểm chứng <strong>kịch bản</strong>. Chủ động với <strong>danh mục</strong>.</p></div>
      <div className={s.actions}><button className={s.button} onClick={exportCsv}><Download size={15}/>Xuất CSV</button><button className={`${s.button} ${s.primary}`} onClick={()=>setEditor("new")}><Plus size={16}/>Thêm vị thế</button></div>
    </header>
    <div className={s.notice}><Info size={16}/><span>Dữ liệu minh họa dùng chung · Giá/ngành từ snapshot, nến và Quant từ các module gốc. Chưa hiệu chỉnh với thị trường thật.</span></div>
    <div className={s.toolbar}>
      <label className={s.field}>Danh mục đang xem<select aria-label="Danh mục mẫu" value={sample} onChange={e=>{const index=Number(e.target.value); setPortfolio(structuredClone(portfolioSamples[index].portfolio));setSample(String(index));setUndo(null);setStatus(`Đã nạp ${portfolioSamples[index].name.toLowerCase()}.`);}}><option value="custom" disabled>Danh mục của bạn</option>{portfolioSamples.map((item,i)=><option key={item.name} value={i}>{item.name}</option>)}</select></label>
      <span className={s.muted}>Đơn vị: VND · {risk.holdings.length} mã · {risk.sectors.length} ngành</span>
    </div>
    <div className={s.tabs} role="tablist" aria-label="Portfolio Intelligence">{tabs.map((label,i)=><button key={label} id={`pi-tab-${i}`} type="button" role="tab" aria-selected={tab===i} aria-controls={`pi-panel-${i}`} tabIndex={tab===i?0:-1} onClick={()=>setTab(i)} onKeyDown={e=>{let next=i;if(e.key==="ArrowRight")next=(i+1)%4;else if(e.key==="ArrowLeft")next=(i+3)%4;else if(e.key==="Home")next=0;else if(e.key==="End")next=3;else return;e.preventDefault();setTab(next);document.getElementById(`pi-tab-${next}`)?.focus();}}><span>0{i+1}</span>{label}</button>)}</div>
    <div className={s.status} role="status">{status}{undo && <button className={s.button} style={{marginLeft:12}} onClick={()=>{update(undo);setUndo(null);setStatus("Đã khôi phục vị thế vừa xóa.");}}><RotateCcw size={14}/>Hoàn tác xóa</button>}</div>
    {error && <p className={s.error} role="alert">{error}</p>}
    <div key={tab} className={s.content} role="tabpanel" id={`pi-panel-${tab}`} aria-labelledby={`pi-tab-${tab}`}>
      {tab===0 && <>
        <div className={s.stats}>
          <Stat kind="capital" label="Tổng tài sản" value={money(risk.total)} note="Cổ phiếu + tiền mặt · VND"/>
          <Stat kind="return" label="Lãi / lỗ chưa thực hiện" value={signedMoney(risk.profit)} note={`${pct(risk.returnPct)} trên giá vốn cổ phiếu`} tone={risk.profit>=0?s.positive:s.negative}/>
          <Stat kind="risk" label="Biến động năm" value={pct(risk.volatility)} note={`${portfolioDataInfo.observations} phiên lợi suất từ ${portfolioDataInfo.candles} nến mẫu dùng chung`}/>
          <Stat label="Beta danh mục" value={risk.beta.toFixed(2)} note="Theo giả định beta từng mã, gồm tiền mặt"/>
        </div>
        <section className={s.priority}><ShieldAlert size={26} className={s.accent}/><div className={s.priorityText}><span className={s.kicker}>Ưu tiên cần xem</span><h2>{!risk.total ? "Bắt đầu với một vị thế hoặc tiền mặt" : concentrated ? `${largest.symbol} chiếm ${pct(largest.weight)} tổng tài sản` : risk.volatility>limits.volatility ? "Biến động vượt giới hạn đang đặt" : "Kiểm tra sức chịu đựng trước khi điều chỉnh"}</h2><p className={s.muted}><Highlighted>{concentrated ? `Vượt giới hạn mỗi mã ${pct(limits.stock)}. ${largest.symbol} đóng góp ${pct(largest.riskContribution)} phương sai danh mục.` : "Đi từ rủi ro tập trung đến kịch bản xấu, rồi kiểm chứng phương án giảm vị thế sang tiền mặt."}</Highlighted></p></div><button className={s.button} onClick={()=>setTab(3)}>Xem Action plan<ArrowRight size={15}/></button></section>
        <div className={s.grid}>
          <Panel title="Cấu trúc danh mục" subtitle="Tỉ trọng theo giá trị thị trường mẫu, gồm tiền mặt." tag="PHÂN BỔ"><Allocation risk={risk}/></Panel>
          <Panel title="Điều cần chú ý" subtitle="Tách nguồn rủi ro trước khi nhìn vào lợi nhuận.">
            <Insight icon={<Activity size={18}/>} title={biggestRisk ? `${biggestRisk.symbol} dẫn đầu đóng góp rủi ro` : "Chưa có rủi ro cổ phiếu"}>{biggestRisk ? `${pct(biggestRisk.riskContribution)} phương sai từ ${pct(biggestRisk.weight)} tài sản. Tỉ trọng vốn không đồng nghĩa tỉ trọng rủi ro.` : "Tiền mặt được giả định không có biến động và không sinh lãi."}</Insight>
            <Insight icon={<Layers3 size={18}/>} title={correlatedPair ? `${correlatedPair.a} × ${correlatedPair.b}: ${correlatedPair.value.toFixed(2)}` : "Cần ít nhất hai mã để so tương quan"}>{correlatedPair ? "Đây là cặp cùng biến động mạnh nhất trong mẫu. Kiểm tra cả tương quan trong ngành và giữa các ngành." : "Một mã không tạo ra đa dạng hóa giữa cổ phiếu."}</Insight>
            <Insight icon={<ShieldAlert size={18}/>} title={`${pct(risk.cashWeight)} tài sản là tiền mặt`}>Mô phỏng kiểm tra khả năng chạm mức lỗ {pct(scenario.budget)} trong kỳ, bên cạnh lỗ tại cuối kỳ.</Insight>
          </Panel>
        </div>
        <Panel title="Vị thế đang nắm giữ" subtitle="Giá mua và giá mẫu đều tính bằng VND/cổ phiếu." tag={`${risk.holdings.length} MÃ`}>
          {risk.holdings.length ? <div className={s.scroll}><table className={s.table}><thead><tr><th>Mã / ngành</th><th>Khối lượng</th><th>Giá mua</th><th>Giá mẫu</th><th>Giá trị</th><th>Lãi / lỗ</th><th>Tỉ trọng</th><th>Thao tác</th></tr></thead><tbody>{risk.holdings.map(h=><tr key={h.symbol}><td><Link href={`/analysis?symbol=${h.symbol}`}>{h.symbol}</Link><small>{h.sector}</small></td><td>{money(h.quantity)}</td><td>{money(h.cost)}</td><td>{money(h.price)}</td><td>{money(h.value)}</td><td className={h.profit>=0?s.positive:s.negative}>{signedMoney(h.profit)}</td><td>{pct(h.weight)}</td><td><div className={s.actions}><button className={s.button} aria-label={`Sửa ${h.symbol}`} onClick={()=>setEditor({symbol:h.symbol,quantity:h.quantity,cost:h.cost})}><Pencil size={14}/></button><button className={s.button} aria-label={`Xóa ${h.symbol}`} onClick={()=>{setUndo(portfolio);update({...portfolio,positions:portfolio.positions.filter(p=>p.symbol!==h.symbol)});setStatus(`Đã xóa ${h.symbol}.`);}}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div> : <div className={s.empty}>Chưa có cổ phiếu. Thêm vị thế để bắt đầu phân tích.</div>}
          <div className={s.foot}><label className={s.field}>Tiền mặt (VND)<input aria-label="Tiền mặt VND" type="number" min="0" max="1000000000000" step="1" value={portfolio.cash} onChange={e=>{try{update({...portfolio,cash:Number(e.target.value)});}catch(err){setStatus((err as Error).message);}}}/></label><p className={s.muted}>Tự lưu trên trình duyệt này · Không đồng bộ lên máy chủ.</p></div>
        </Panel>
      </>}
      {tab===1 && <>
        <section className={s.priority}><div><h2>Nguồn rủi ro nằm ở đâu?</h2><p className={s.muted}><Highlighted>Tương quan Pearson, biến động và đóng góp phương sai dùng cùng cửa sổ nến mẫu của module Quant.</Highlighted></p></div><button className={s.button} onClick={()=>setTab(2)}>Kiểm chứng kịch bản<ArrowRight size={15}/></button></section>
        <div className={s.grid}>
          <Panel title="Tương quan giữa các mã" subtitle="−1: ngược chiều · 0: ít liên hệ tuyến tính · +1: cùng chiều.">{risk.holdings.length ? <Matrix labels={risk.holdings.map(h=>h.symbol)} values={risk.holdings.map(a=>risk.holdings.map(b=>risk.correlation[a.index][b.index]))}/> : <p className={s.empty}>Thêm vị thế để xem tương quan.</p>}</Panel>
          <Panel title="Đóng góp rủi ro" subtitle="Tỉ lệ phương sai danh mục; tổng bằng 100% khi có cổ phiếu.">{[...risk.holdings].sort((a,b)=>b.riskContribution-a.riskContribution).map(h=><div key={h.symbol}><div className={s.row}><span>{h.symbol}<small className={s.muted}> · vốn {pct(h.weight)}</small></span><span>{pct(h.riskContribution)}</span></div><div className={s.bar}><span style={{width:`${Math.min(100,Math.max(0,h.riskContribution*100))}%`}}/></div></div>)}<p className={s.muted}>Đóng góp có thể âm với vị thế có tác dụng phòng vệ. Phần thanh chỉ hiển thị giá trị dương.</p></Panel>
        </div>
        <Panel title="Tương quan giữa các ngành" subtitle="Lợi suất ngành được gộp từ các mã đang nắm giữ, theo tỉ trọng giá trị cố định. Không đại diện chỉ số ngành toàn thị trường.">{risk.sectors.length ? <Matrix labels={risk.sectors.map(a=>a.name)} values={sectorCorrelation(risk)}/> : <p className={s.empty}>Chưa có ngành để so sánh.</p>}</Panel>
        <Panel title="Hồ sơ từng mã & bối cảnh Quant" subtitle="Volatility là biến động năm của chuỗi tổng hợp. HMM là xác suất trạng thái mẫu từng mã, không phải xác suất thắng."><div className={s.scroll}><table className={s.table}><thead><tr><th>Mã</th><th>Biến động năm</th><th>Beta mẫu</th><th>Đóng góp rủi ro</th><th>HMM tăng / ngang / giảm</th><th>GARCH σ phiên đầu</th></tr></thead><tbody>{risk.holdings.map(h=>{const model=quantModel(h.symbol);return <tr key={h.symbol}><td>{h.symbol}</td><td>{pct(h.volatility)}</td><td>{h.beta.toFixed(2)}</td><td>{pct(h.riskContribution)}</td><td>{pct(model.hmm.bull,0)} / {pct(model.hmm.sideways,0)} / {pct(model.hmm.bear,0)}</td><td>{pct(Math.sqrt(model.variance),2)}</td></tr>;})}</tbody></table></div></Panel>
      </>}
      {tab===2 && <div className={s.scenarioGrid}>
        <section className={`${s.panel} ${s.settings}`}><div className={s.sectionHeading}><div><h2>Thiết lập kịch bản</h2><p className={s.muted}>Cú sốc cộng dồn trong cả kỳ.</p></div></div>
          <div className={s.presets}>{scenarioPresets.map(p=><button key={p.name} className={s.button} aria-pressed={Object.entries(p.settings).every(([k,v])=>scenario[k as keyof Scenario]===v)} onClick={()=>setScenario({...scenario,...p.settings})}>{p.name}</button>)}</div>
          <ScenarioControls scenario={scenario} setScenario={setScenario}/>
          <div className={s.actions}><button className={`${s.button} ${s.primary}`} disabled={busy} onClick={()=>execute("scenario")}><Play size={15}/>{busy ? "Đang tính…" : "Chạy mô phỏng"}</button></div><p className={s.muted}>1.200 đường · seed 42 · Gaussian có tương quan · phương sai kỳ vọng GARCH. Thay thiết lập rồi bấm chạy để cập nhật kết quả.</p>
        </section>
        <div className={s.result} aria-busy={busy}>{!run ? <Panel title="Kiểm chứng trước khi ra quyết định"><div className={s.empty}><Activity size={32} style={{margin:"0 auto 18px"}}/><h3>Chọn giả định. Chạy. Đọc khoảng bất định.</h3><p className={s.muted}>Bạn sẽ thấy dải phân vị, tổn thất đuôi, xác suất lỗ và nguồn tác động theo mã/ngành.</p></div></Panel> : <>
          {run.key!==simulationKey && <div className={s.dirty} role="status"><strong>Thiết lập hoặc danh mục đã đổi.</strong> Bên dưới là <strong>kết quả lần chạy trước</strong>; bấm “Chạy mô phỏng” để cập nhật.</div>}
          <div className={s.notice}><Info size={15}/><span>Lần chạy: {run.result.scenario.horizon} phiên · thị trường {pct(run.result.scenario.marketShock)} · {run.result.scenario.sector} {pct(run.result.scenario.sectorShock)} · {run.result.scenario.symbol} {pct(run.result.scenario.symbolShock)} · stress {pct(run.result.scenario.stress,0)} · volatility ×{run.result.scenario.volatility} · ngân sách {pct(run.result.scenario.budget)}.</span></div>
          <SimulationResults result={run.result}/>
          <Panel title="Phân rã tác động có hướng" subtitle="Cú sốc thuần so với thay đổi giá trị kỳ vọng Monte Carlo. Không cộng phân vị từng mã thành phân vị danh mục."><Attribution result={run.result}/></Panel>
          <Panel title="Độ nhạy: thị trường × ngành" subtitle={`Thay hai cú sốc trên danh mục lần chạy trước; giữ cú sốc riêng mã. Kết quả là tác động thuần, không phải VaR hay dự báo.`}><Sensitivity portfolio={run.portfolio} scenario={run.result.scenario}/></Panel>
          <button className={s.button} onClick={()=>setTab(3)}>Kiểm chứng phương án trong Action plan<ArrowRight size={15}/></button>
        </>}</div>
      </div>}
      {tab===3 && <>
        <section className={s.priority}><div className={s.priorityText}><h2>Từ cảnh báo đến phương án có điều kiện</h2><p className={s.muted}><Highlighted>Giảm vị thế vượt giới hạn sang tiền mặt; hợp nhất từng mã để tránh cộng trùng. Không thay đổi danh mục gốc, không tạo lệnh giao dịch.</Highlighted></p></div><ShieldAlert size={26} className={s.accent}/></section>
        <Panel title="Giới hạn & giả định kiểm chứng" subtitle="Kiểm tra VaR 95% cuối kỳ so với ngân sách lỗ. Xác suất chạm ngân sách trong kỳ được báo riêng, không phải ràng buộc bảo đảm."><div className={s.controls}>{([['stock','Tỉ trọng tối đa mỗi mã'],['sector','Tỉ trọng tối đa mỗi ngành'],['volatility','Biến động năm tối đa'],['budget','Ngân sách lỗ cuối kỳ (VaR 95%)']] as const).map(([key,label])=><label className={s.field} key={key}>{label}<select value={limits[key]} onChange={e=>setLimits({...limits,[key]:Number(e.target.value)})}>{(key==='stock'?[.2,.3,.4,.5]:key==='sector'?[.3,.45,.6,.8]:key==='volatility'?[.15,.22,.3,.4]:[.05,.1,.15,.2]).map(v=><option key={v} value={v}>{pct(v,0)}</option>)}</select></label>)}</div><div className={s.foot}><p className={s.muted}>Giả định đang chọn: {scenario.horizon} phiên · thị trường {pct(scenario.marketShock)} · {scenario.sector} {pct(scenario.sectorShock)} · {scenario.symbol} {pct(scenario.symbolShock)} · stress {pct(scenario.stress,0)} · σ ×{scenario.volatility}. Ngân sách Action thay ngân sách mô phỏng.</p><button className={s.button} onClick={()=>setTab(2)}>Sửa kịch bản</button><button className={`${s.button} ${s.primary}`} disabled={busy} onClick={()=>execute("plan")}>{busy?"Đang kiểm chứng…":"Tạo & kiểm chứng phương án"}</button></div></Panel>
        <div className={s.actionList}>
          {risk.holdings.some(h=>portfolioResources.find(r=>r.symbol===h.symbol)?.quant.label==="THẬN TRỌNG") && <Action priority="P2" title="Đối chiếu bằng chứng Quant dùng chung" evidence={`Các mã có nhãn THẬN TRỌNG trong Quant mẫu: ${risk.holdings.filter(h=>portfolioResources.find(r=>r.symbol===h.symbol)?.quant.label==="THẬN TRỌNG").map(h=>h.symbol).join(", ")}.`} direction="Đọc hồ sơ nhân tố và điều kiện nguồn trước khi xem xét tăng vị thế; không suy quyết định từ điểm số đơn lẻ." condition="Đây là nhãn mẫu, không phải action gate đã công bố. Không tự chuyển thành lệnh mua/bán hoặc lượng giảm."/>}
          {risk.holdings.filter(h=>h.weight>limits.stock).map(h=><Action key={h.symbol} priority="P1" title={`Giảm tập trung ${h.symbol}`} evidence={`${pct(h.weight)} tài sản, cao hơn giới hạn ${pct(limits.stock)}; đóng góp ${pct(h.riskContribution)} phương sai.`} direction={`Đưa giá trị ${h.symbol} về tối đa ${money(risk.total*limits.stock)} VND; phần giảm chuyển sang tiền mặt.`} condition="Chỉ xem xét nếu giới hạn này phù hợp mục tiêu và nhu cầu thanh khoản. Kiểm tra tác động hợp nhất ở bảng trước–sau."/>)}
          {risk.sectors.filter(h=>h.weight>limits.sector).map(h=><Action key={h.name} priority="P1" title={`Hạ tập trung ngành ${h.name}`} evidence={`${pct(h.weight)} tài sản trong ngành so với trần ${pct(limits.sector)}.`} direction="Sau khi áp trần từng mã, giảm theo tỉ lệ các mã còn lại trong ngành; không cộng lại phần đã đề xuất giảm." condition="Giữ các ngành khác cố định ở bước này; kiểm tra tiếp volatility và tổn thất đuôi trước khi kết luận."/>)}
          <Action priority={risk.volatility>limits.volatility || plan?.key===planKey && plan.result.baseline.var95>risk.total*limits.budget?"P1":"P2"} title={risk.volatility>limits.volatility?"Hạ mức biến động toàn danh mục":"Kiểm chứng rủi ro đuôi và ngân sách lỗ"} evidence={`Biến động năm ${pct(risk.volatility)}, giới hạn ${pct(limits.volatility)}. Ngân sách lỗ ${pct(limits.budget)} = ${money(risk.total*limits.budget)} VND. ${plan?.key===planKey?`VaR 95% trước điều chỉnh: ${money(plan.result.baseline.var95)} VND, ${plan.result.baseline.var95>risk.total*limits.budget?'vượt':'trong'} ngân sách.`:'Cần chạy kiểm chứng để đối chiếu VaR với ngân sách.'}`} direction="Sau trần mã/ngành, giảm đồng đều phần cổ phiếu còn lại nếu vượt trần biến động hoặc VaR 95%." condition="So sánh cùng kịch bản, seed, số đường. VaR không phải mức lỗ tối đa; vẫn có thể lỗ vượt ngân sách."/>
        </div>
        {plan && <>
          {plan.key!==planKey && <div className={s.dirty} role="status"><strong>Danh mục, giới hạn hoặc kịch bản đã đổi.</strong> Đây là <strong>phương án lần trước</strong>; tạo lại để kiểm chứng dữ liệu mới.</div>}
          <Panel title="Phương án hợp nhất · xem trước" subtitle={`${plan.scenario.horizon} phiên · seed ${plan.scenario.seed} · 1.200 đường mỗi phương án · ngân sách ${pct(plan.limits.budget)}. Số lượng giảm làm tròn lên đến một cổ phiếu, chưa áp quy tắc lô giao dịch.`} tag={plan.result.compliant?"ĐẠT GIỚI HẠN MẪU":"CẦN RÀ SOÁT"}>
            {plan.result.changes.length ? <div className={s.scroll}><table className={s.table}><thead><tr><th>Mã</th><th>Khối lượng giảm</th><th>Chuyển sang tiền mặt</th></tr></thead><tbody>{plan.result.changes.map(c=><tr key={c.symbol}><td>{c.symbol}</td><td>{money(c.quantity)}</td><td>{money(c.proceeds)} VND</td></tr>)}</tbody></table></div> : <p className={s.muted}>Không cần giảm vị thế theo các giới hạn và giả định đã kiểm chứng.</p>}
            <div className={s.foot}><p className={s.muted}>Phí, thuế, trượt giá, giới hạn thanh khoản và lô giao dịch chưa được tính. Danh mục gốc được giữ nguyên.</p></div>
          </Panel>
          <Panel title="Tác động dự kiến: trước → sau" subtitle="Cùng đường nhiễu trên toàn bộ sáu mã, cùng seed và giả định. Tổng tài sản giữ nguyên tại thời điểm giả lập."><Comparison plan={plan.result}/></Panel>
        </>}
      </>}
    </div>
    <SharedEvidence symbols={risk.holdings.map(h=>h.symbol)}/><details className={`${s.panel} ${s.method}`}><summary>Phương pháp, nguồn mẫu & giới hạn diễn giải</summary><ul><li>Giá/ngành tái sử dụng snapshot chung, đổi từ nghìn đồng sang VND. Pearson/covariance dùng lợi suất close-to-close trên các nến 1D mẫu có nhãn phiên giao nhau, cùng thứ tự; không sinh thêm chuỗi riêng.</li><li>Biến động năm = độ lệch chuẩn phiên × √252; đóng góp rủi ro = wᵢ(Σw)ᵢ / (wᵀΣw). Beta stress vẫn là giả định, được gộp theo tỉ trọng tài sản; tiền mặt beta 0. Chưa có hồi quy beta với benchmark đồng bộ.</li><li>GARCH lấy alpha/beta/omega và volatility mẫu từ analysis-visuals.json, quy đổi % sang số thập phân. Phương sai kỳ vọng hₜ₊₁ = ω + (α+β)hₜ. Đây không phải mô phỏng GARCH cập nhật phương sai theo từng cú sốc thực hiện.</li><li>Monte Carlo dùng nhiễu Gaussian tương quan, không gắn nhãn GARCH–t. Co tương quan 2% về I, rồi trộn với ma trận toàn số 1 theo mức stress để giữ tính xác định dương. Tương quan dùng chung giữa các kỳ.</li><li>Cú sốc thị trường đi qua beta, cộng cú sốc ngành và riêng mã theo log, phân bổ đều qua kỳ. Drift cơ sở bằng 0 theo kỳ vọng giá, không fit ARIMA/LightGBM. Tiền mặt không sinh lãi.</li><li>Phân vị lấy từ tổng giá trị từng đường chung; VaR/CVaR 95% là lỗ cuối kỳ so với tài sản đầu kỳ, chặn dưới ở 0. CVaR là trung bình 5% đường lỗ nhất. Xác suất chạm ngân sách xét tất cả phiên trong kỳ.</li><li>HMM chỉ mô tả trạng thái mẫu từng mã; không gộp thành HMM danh mục hay xác suất thắng. Tham số Quant và cửa sổ nến mẫu chưa hiệu chỉnh chung. Không suy diễn kết quả thành khuyến nghị mua bán thực tế.</li></ul></details>
    {editor && <PositionEditor position={editor} portfolio={portfolio} onClose={()=>setEditor(null)} onSave={position=>{const positions=editor==="new"?[...portfolio.positions,position]:portfolio.positions.map(p=>p.symbol===position.symbol?position:p);update({...portfolio,positions});setEditor(null);setStatus(`Đã lưu vị thế ${position.symbol}.`);}}/>}
  </div>;
}

// Bôi đậm có chọn lọc bằng phần tử ngữ nghĩa, không chèn HTML từ chuỗi.
const emphasisPattern = /(không phải mức lỗ tối đa|không thay đổi danh mục gốc|không tạo lệnh giao dịch|không cộng trùng|không cộng lại|không sinh lãi|cùng seed và giả định|cùng kịch bản|vượt giới hạn|vượt ngân sách|giảm vị thế|rủi ro tập trung|đóng góp rủi ro|ngân sách lỗ|ngân sách|tương quan|tiền mặt|tổn thất đuôi|phân vị|trước–sau|CVaR\s*95%|VaR\s*95%|Monte Carlo|GARCH|HMM|P05–P95|P25–P75|P50|\b(?:FPT|VCB|HPG|MBB|SSI|VNM)\b|[+−-]?\d+(?:[.,]\d+)*(?:\s*%|\s*VND)?)/gi;
function Highlighted({children}:{children:ReactNode}) {
  return <>{Children.map(children,child=>typeof child==="string" ? child.split(emphasisPattern).map((part,i)=>i%2 ? <strong key={i}>{part}</strong> : part) : child)}</>;
}
function SharedEvidence({symbols}:{symbols:string[]}) {
  const resources=portfolioResources.filter(r=>symbols.includes(r.symbol));
  const scanCount=resources.filter(r=>r.screening.status==="SNAPSHOT").length;
  const quantCount=resources.filter(r=>r.quant.status==="DEMO").length;
  return <details className={`${s.panel} ${s.method}`}><summary>Nguồn dùng chung · {portfolioDataInfo.candles} nến mẫu · {portfolioDataInfo.observations} phiên lợi suất</summary>
    <p><Highlighted>{`Giá snapshot: ${portfolioDataInfo.priceLabel}. Giá/ngành và nến dùng cùng tài nguyên với các module gốc; giá vốn bạn đã nhập được giữ nguyên. Các cửa sổ mẫu chưa được hiệu chỉnh chung.`}</Highlighted></p>
    <p><Highlighted>{`Độ phủ trong danh mục: snapshot Quét toàn sàn ${scanCount}/${resources.length} mã; Quant mẫu ${quantCount}/${resources.length} mã. Không nằm trong 10 dòng snapshot không có nghĩa bị loại hoặc điểm bằng 0.`}</Highlighted></p>
    <div className={s.scroll}><table className={s.table}><thead><tr><th>Mã</th><th>Quét toàn sàn · snapshot</th><th>Quant · mẫu</th><th>Sharpe</th><th>Hurst</th><th>Dòng tiền CMF</th><th>Dự báo sau phí</th></tr></thead><tbody>{resources.map(r=>{const raw=(label:string)=>r.quant.factors.find(f=>f.label===label)?.raw??"—";return <tr key={r.symbol}><td>{r.symbol}</td><td>{r.screening.score===null?r.screening.label:`${r.screening.label} · ${r.screening.score}/100`}</td><td>{r.quant.score===null?"—":`${r.quant.label} · ${r.quant.score}/100`}</td><td>{raw("Hiệu quả rủi ro")}</td><td>{raw("Độ bền xu hướng")}</td><td>{raw("Dòng tiền")}</td><td>{raw("Dự báo sau phí")}</td></tr>;})}</tbody></table></div>
    <p>Điểm xếp hạng và dự báo mẫu không phải xác suất có lời. Beta stress vẫn là giả định. Các đầu ra nguồn chưa được dùng thay cho action gate hoặc drift của Monte Carlo.</p>
  </details>;
}
function Stat({label,value,note,tone="",kind="info"}:{label:string;value:string;note:string;tone?:string;kind?:"capital"|"return"|"risk"|"loss"|"info"}) {
  const Icon=kind==="capital"?Wallet:kind==="return"?TrendingUp:kind==="info"?Target:Gauge;
  return <div className={s.stat} data-kind={kind}><span className={s.statLabel}><span>{label}</span><span className={s.statIcon} aria-hidden="true"><Icon size={16}/></span></span><div className={`${s.number} ${tone}`}>{value}</div><p className={s.muted}><Highlighted>{note}</Highlighted></p></div>;
}
function Panel({title,subtitle,tag,children}:{title:string;subtitle?:string;tag?:string;children:ReactNode}) { return <section className={s.panel}><div className={s.sectionHeading}><div><h2>{title}</h2>{subtitle&&<p className={s.muted}><Highlighted>{subtitle}</Highlighted></p>}</div>{tag&&<span className={s.tag}>{tag}</span>}</div>{children}</section>; }
function Insight({icon,title,children}:{icon:ReactNode;title:string;children:ReactNode}) { return <div className={s.insight}>{icon}<div><h3>{title}</h3><p className={s.muted}><Highlighted>{children}</Highlighted></p></div></div>; }
function Allocation({risk}:{risk:ReturnType<typeof portfolioRisk>}) {
  const slices=[...risk.sectors,{name:"Tiền mặt",weight:risk.cashWeight,color:"var(--muted)"}].filter(p=>p.weight>0);
  let start=0;const gradient=slices.map(item=>{const low=start;start+=item.weight*100;return `${item.color} ${low}% ${start}%`;}).join(",");
  return <div className={s.allocation}><div className={s.donut} role="img" aria-label="Biểu đồ phân bổ; số liệu chi tiết ở bên cạnh" style={{background:gradient?`conic-gradient(${gradient})`:"var(--raised)"}}><div className={s.donutCenter}><b>{risk.holdings.length}</b><span className={s.muted}>mã cổ phiếu</span></div></div><div className={s.legend}>{slices.map(item=><div className={s.row} key={item.name}><span className={s.legendLabel}><span className={s.dot} style={{background:item.color}}/>{item.name}</span><strong>{pct(item.weight)}</strong></div>)}{!slices.length&&<p className={s.muted}>Danh mục trống.</p>}</div></div>;
}
function Matrix({labels,values}:{labels:string[];values:number[][]}) { return <div className={s.scroll}><table className={`${s.table} ${s.matrix}`}><thead><tr><th aria-label="Cặp tương quan"/>{labels.map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{values.map((row,i)=><tr key={labels[i]}><th scope="row">{labels[i]}</th>{row.map((v,j)=><td key={labels[j]} className={i===j?s.diagonal:""} style={i===j?undefined:{background:`color-mix(in srgb, ${v>=0?"var(--info)":"#b49adf"} ${Math.round(Math.abs(v)*38+5)}%, var(--surface))`}}>{v.toFixed(2)}</td>)}</tr>)}</tbody></table></div>; }
function sectorCorrelation(risk:ReturnType<typeof portfolioRisk>) { return risk.sectorCorrelation; }
function PositionEditor({position,portfolio,onSave,onClose}:{position:Position|"new";portfolio:Portfolio;onSave:(p:Position)=>void;onClose:()=>void}) {
  const available=assets.filter(a=>!portfolio.positions.some(p=>p.symbol===a.symbol));
  const [symbol,setSymbol]=useState(position==="new"?available[0]?.symbol??"":position.symbol),[quantity,setQuantity]=useState(position==="new"?"100":String(position.quantity)),[cost,setCost]=useState(position==="new"?String(assets.find(a=>a.symbol===symbol)?.price??0):String(position.cost)),[error,setError]=useState("");
  return <Modal title={position==="new"?"Thêm vị thế":"Sửa vị thế"} onClose={onClose}><form className={s.form} onSubmit={e=>{e.preventDefault();try{const next={symbol,quantity:Number(quantity),cost:Number(cost)};validatePortfolio({...portfolio,positions:position==="new"?[...portfolio.positions,next]:portfolio.positions.map(p=>p.symbol===symbol?next:p)},assets);onSave(next);}catch(err){setError((err as Error).message);}}}>
    {available.length===0&&position==="new"?<p className={s.muted}>Bạn đã thêm đủ sáu mã mẫu. Có thể sửa từng vị thế hiện tại.</p>:<><label className={s.field}>Mã cổ phiếu<select aria-label="Mã cổ phiếu" disabled={position!=="new"} value={symbol} onChange={e=>{setSymbol(e.target.value);setCost(String(assets.find(a=>a.symbol===e.target.value)!.price));}}>{(position==="new"?available:assets.filter(a=>a.symbol===symbol)).map(a=><option key={a.symbol} value={a.symbol}>{a.symbol} · {a.name}</option>)}</select></label><label className={s.field}>Khối lượng (cổ phiếu)<input required type="number" min="1" max="10000000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className={s.field}>Giá mua (VND/cổ phiếu)<input required type="number" min="0.01" max="100000000" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label><p className={s.muted}>Giá mẫu hiện tại: {money(assets.find(a=>a.symbol===symbol)?.price??0)} VND. Chỉ hỗ trợ sáu mã có đủ dữ liệu minh họa.</p>{error&&<p className={s.error} role="alert">{error}</p>}<div className={s.actions}><button type="button" className={s.button} onClick={onClose}>Hủy</button><button className={`${s.button} ${s.primary}`}>Lưu vị thế</button></div></>}
  </form></Modal>;
}
function ScenarioControls({scenario,setScenario}:{scenario:Scenario;setScenario:(s:Scenario)=>void}) {
  const field=(key:keyof Scenario,value:string)=>setScenario({...scenario,[key]:Number(value)});
  return <div className={s.controls}><label className={s.field}>Kỳ mô phỏng<select value={scenario.horizon} onChange={e=>field("horizon",e.target.value)}>{[5,20,60].map(v=><option key={v} value={v}>{v} phiên</option>)}</select></label><label className={s.field}>Ngân sách lỗ<select value={scenario.budget} onChange={e=>field("budget",e.target.value)}>{[.05,.1,.15,.2].map(v=><option key={v} value={v}>{pct(v,0)}</option>)}</select></label>
    <Range label="Cú sốc thị trường" value={scenario.marketShock*100} min={-50} max={50} step={1} display={pct(scenario.marketShock,0)} onChange={v=>field("marketShock",String(v/100))}/>
    <label className={s.field}>Ngành chịu cú sốc<select value={scenario.sector} onChange={e=>setScenario({...scenario,sector:e.target.value})}>{[...new Set(assets.map(a=>a.sector))].map(a=><option key={a}>{a}</option>)}</select></label>
    <Range label="Cú sốc ngành" value={scenario.sectorShock*100} min={-50} max={50} step={1} display={pct(scenario.sectorShock,0)} onChange={v=>field("sectorShock",String(v/100))}/>
    <label className={s.field}>Mã chịu cú sốc<select value={scenario.symbol} onChange={e=>setScenario({...scenario,symbol:e.target.value})}>{assets.map(a=><option key={a.symbol}>{a.symbol}</option>)}</select></label>
    <Range label="Cú sốc riêng mã" value={scenario.symbolShock*100} min={-50} max={50} step={1} display={pct(scenario.symbolShock,0)} onChange={v=>field("symbolShock",String(v/100))}/>
    <Range label="Tương quan căng thẳng" value={scenario.stress*100} min={0} max={100} step={5} display={pct(scenario.stress,0)} onChange={v=>field("stress",String(v/100))}/>
    <Range label="Hệ số biến động" value={scenario.volatility} min={.5} max={3} step={.1} display={`×${scenario.volatility.toFixed(1)}`} onChange={v=>field("volatility",String(v))}/>
  </div>;
}
function Range({label,value,min,max,step,display,onChange}:{label:string;value:number;min:number;max:number;step:number;display:string;onChange:(v:number)=>void}) { return <label className={`${s.field} ${s.wide}`}><span className={s.row}>{label}<strong className={s.accent}>{display}</strong></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>; }
function SimulationResults({result:r}:{result:Simulation}) { return <>
  <div className={s.stats}><Stat kind="loss" label="VaR 95% cuối kỳ" value={money(r.var95)} note={`${pct(r.var95/(r.total||1))} tài sản đầu kỳ · VND`}/><Stat kind="loss" label="CVaR 95% cuối kỳ" value={money(r.cvar95)} note="Lỗ trung bình 5% đường xấu nhất · VND"/><Stat kind="risk" label="Xác suất lỗ cuối kỳ" value={pct(r.lossProbability)} note="Giá trị cuối kỳ dưới tài sản đầu kỳ"/><Stat kind="risk" label="Chạm ngân sách trong kỳ" value={pct(r.breachProbability)} note={`Có ít nhất một phiên lỗ ≥ ${pct(r.scenario.budget)}`}/></div>
  <Panel title="Dải giá trị danh mục" subtitle={`P05–P95 · ${r.scenario.horizon} phiên · Giá trị tính bằng triệu VND. Phân vị cắt ngang từng phiên, không phải một đường giá chắc chắn.`}><Cone result={r}/><div className={s.chartLegend}><span>P05–P95</span><span>P25–P75</span><span>P50</span></div><div className={s.foot}><span className={s.muted}>Cuối kỳ: P05 {money(r.cone.at(-1)!.p05)} · P50 {money(r.cone.at(-1)!.p50)} · P95 {money(r.cone.at(-1)!.p95)} VND</span></div></Panel>
  <Panel title="Phân phối giá trị cuối kỳ" subtitle={`${r.paths} đường · trục ngang: triệu VND · chiều cao: số đường rơi vào khoảng.`}><div className={s.histogram} role="img" aria-label="Histogram giá trị cuối kỳ">{r.histogram.map((b,i)=><div key={i} style={{height:`${b.count/Math.max(1,...r.histogram.map(h=>h.count))*100}%`}} title={`${money(b.low)}–${money(b.high)} VND: ${b.count} đường`}/>)}</div><div className={s.histLabels}><span>{money(r.histogram[0].low/1e6)}</span><span>{money(r.histogram.at(-1)!.high/1e6)}</span></div><details className={s.method}><summary>Xem số đường theo khoảng giá trị</summary><div className={s.scroll}><table className={s.table}><thead><tr><th>Khoảng VND</th><th>Số đường</th></tr></thead><tbody>{r.histogram.map((b,i)=><tr key={i}><td>{money(b.low)}–{money(b.high)}</td><td>{b.count}</td></tr>)}</tbody></table></div></details></Panel>
  </>; }
function Cone({result:r}:{result:Simulation}) {
  const low=Math.min(...r.cone.map(p=>p.p05)),high=Math.max(...r.cone.map(p=>p.p95)),gap=(high-low)*.08||1,lo=low-gap,hi=high+gap;
  const x=(day:number)=>62+day/r.scenario.horizon*586,y=(value:number)=>220-(value-lo)/(hi-lo)*190;
  const line=(key:"p05"|"p25"|"p50"|"p75"|"p95")=>r.cone.map(p=>`${x(p.day)},${y(p[key])}`).join(" ");
  const band=(a:"p05"|"p25",b:"p75"|"p95")=>line(a)+" "+[...r.cone].reverse().map(p=>`${x(p.day)},${y(p[b])}`).join(" ");
  return <div className={s.scroll}><svg className={s.chart} viewBox="0 0 680 264" role="img" aria-label={`Dải phân vị danh mục qua ${r.scenario.horizon} phiên; giá trị cuối kỳ có trong phần chữ bên dưới`}><title>Phân vị tổng danh mục trên các đường Monte Carlo chung</title>{[0,.25,.5,.75,1].map(t=>{const val=lo+(hi-lo)*t;return <g key={t}><line className={s.gridline} x1="62" x2="648" y1={y(val)} y2={y(val)}/><text x="52" y={y(val)+4} textAnchor="end">{money(val/1e6)}</text></g>;})}<polygon className={s.outer} points={band("p05","p95")}/><polygon className={s.inner} points={band("p25","p75")}/><polyline className={s.median} points={line("p50")}/>{[0,.25,.5,.75,1].map(t=><text key={t} x={x(t*r.scenario.horizon)} y="247" textAnchor="middle">+{Math.round(t*r.scenario.horizon)}</text>)}</svg></div>;
}
function Attribution({result:r}:{result:Simulation}) { return <div className={s.scroll}><table className={s.table}><thead><tr><th>Mã / ngành</th><th>Cú sốc thuần VND</th><th>Thay đổi kỳ vọng VND</th></tr></thead><tbody>{r.attribution.map(a=><tr key={a.symbol}><td>{a.symbol}<small>{a.sector}</small></td><td className={a.shock>=0?s.positive:s.negative}>{signedMoney(a.shock)}</td><td className={a.mean>=0?s.positive:s.negative}>{signedMoney(a.mean)}</td></tr>)}{r.sectorAttribution.map(a=><tr key={a.name}><td>Tổng {a.name}</td><td>{signedMoney(a.shock)}</td><td>{signedMoney(a.mean)}</td></tr>)}</tbody></table></div>; }
function Sensitivity({portfolio,scenario}:{portfolio:Portfolio;scenario:Scenario}) { const risk=portfolioRisk(portfolio,assets);return <div className={s.scroll}><table className={`${s.table} ${s.matrix}`}><thead><tr><th>Thị trường ↓ / ngành →</th>{[-.15,0,.1].map(v=><th key={v}>{pct(v,0)}</th>)}</tr></thead><tbody>{[-.15,-.05,.05].map(m=><tr key={m}><th scope="row">{pct(m,0)}</th>{[-.15,0,.1].map(v=>{const effect=risk.holdings.reduce((sum,h)=>sum+h.value*deterministicImpact(h,{...scenario,marketShock:m,sectorShock:v}),0)/(risk.total||1);return <td key={v} className={effect>=0?s.positive:s.negative}>{pct(effect)}</td>;})}</tr>)}</tbody></table></div>; }
function Action({priority,title,evidence,direction,condition}:{priority:string;title:string;evidence:string;direction:string;condition:string}) { return <article className={s.actionCard} data-priority={priority}><h3><span className={s.tag}>{priority} · {priority==="P1"?"Ưu tiên cao":"Theo dõi"}</span>{title}</h3><div className={s.actionDetails}><p className={s.muted}><span className={s.actionLabel}>Căn cứ</span><Highlighted>{evidence}</Highlighted></p><p className={s.muted}><span className={s.actionLabel}>Hướng xử lý</span><Highlighted>{direction}</Highlighted></p><p className={s.muted}><span className={s.actionLabel}>Điều kiện</span><Highlighted>{condition}</Highlighted></p></div></article>; }
function Comparison({plan:p}:{plan:Plan}) {
  const rows=[{name:"Tổng tài sản (VND)",before:money(p.before.total),after:money(p.after.total)},{name:"Tiền mặt",before:pct(p.before.cashWeight),after:pct(p.after.cashWeight)},{name:"Tỉ trọng mã lớn nhất",before:pct(Math.max(0,...p.before.holdings.map(h=>h.weight))),after:pct(Math.max(0,...p.after.holdings.map(h=>h.weight)))},{name:"Tỉ trọng ngành lớn nhất",before:pct(Math.max(0,...p.before.sectors.map(h=>h.weight))),after:pct(Math.max(0,...p.after.sectors.map(h=>h.weight)))},{name:"Biến động năm",before:pct(p.before.volatility),after:pct(p.after.volatility)},{name:"VaR 95% cuối kỳ (VND)",before:money(p.baseline.var95),after:money(p.simulation.var95)},{name:"CVaR 95% cuối kỳ (VND)",before:money(p.baseline.cvar95),after:money(p.simulation.cvar95)},{name:"Xác suất lỗ cuối kỳ",before:pct(p.baseline.lossProbability),after:pct(p.simulation.lossProbability)},{name:"Chạm ngân sách trong kỳ",before:pct(p.baseline.breachProbability),after:pct(p.simulation.breachProbability)}];
  return <div className={s.scroll}><table className={`${s.table} ${s.comparison}`}><thead><tr><th>Chỉ tiêu</th><th>Trước</th><th>Sau giả lập</th></tr></thead><tbody>{rows.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.before}</td><td>{r.after}</td></tr>)}</tbody></table></div>;
}

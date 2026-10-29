"use client";
import { useState } from "react";
import type { AnalysisReport, QuantResearch } from "@/lib/api/analysis";
import { analysisMessages } from "@/lib/api/analysis";
import { stamp } from "@/lib/api/contracts";
import { actionNames, number, record, researchFor } from "@/lib/quant-reader";
import { LinePlot } from "./quant-research";
import { ScenarioSpace, StateSpace } from "./quant-space";
import styles from "./quant-simple.module.css";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const numbers = (value: unknown): value is number[] => Array.isArray(value) && value.length > 0 && value.every(finite);
const stateNames: Record<string, string> = { BULL: "Nghiêng về xu hướng tăng", SIDEWAY: "Giá đang đi ngang", BEAR: "Nghiêng về xu hướng giảm" };
const money = (value: unknown) => finite(value) && value > 0 ? `${number(Math.round(value))} ₫` : "Chưa có dữ liệu";
function metric(report: AnalysisReport, section: string, path: string) {
  if (report.sections[section]?.status !== "AVAILABLE") return undefined;
  let value: unknown = report.sections[section].metrics;
  for (const part of path.split(".")) {
    const node = record(value);
    if (node.available === false || node.error) return undefined;
    value = node[part];
  }
  const node = record(value);
  return node.available === false || node.error ? undefined : value;
}
function Empty({ children = "Báo cáo chưa có đủ dữ liệu để vẽ phần này." }: { children?: string }) {
  return <p className={styles.empty} role="status">{children}</p>;
}
function validCone(rows: QuantResearch["cone"]): boolean {
  return Array.isArray(rows) && rows.length >= 2 && rows.every((row, i) =>
    Number.isInteger(row.session) && row.session > 0 && (!i || row.session > rows[i-1].session) &&
    [row.p05, row.p25, row.p50, row.p75, row.p95].every(value => finite(value) && value > 0) &&
    row.p05 <= row.p25 && row.p25 <= row.p50 && row.p50 <= row.p75 && row.p75 <= row.p95);
}

export function SimpleQuantReport({ report, showAction, compact = false }: { report: AnalysisReport; showAction: boolean; compact?: boolean }) {
  const research = researchFor(report), action = String(report.decision.action || ""), executable = report.decision.executable === true;
  const net = metric(report, "costs", "costs.net_forecast_pct"), drawdown = metric(report, "statistics", "stats.max_dd_pct");
  const hmm = metric(report, "hmm", "hmm.current"), fallback = metric(report, "hmm", "hmm.method") === "fallback";
  const state = typeof hmm === "string" ? stateNames[hmm.toUpperCase()] : undefined;
  const horizon = metric(report, "agreement", "fcast.horizon");
  const explanation: Record<string, string> = {
    BUY_NOW: executable ? "Báo cáo ghi nhận tín hiệu mua và các điều kiện thực hiện đã đạt. Đọc thêm vùng giá và rủi ro trước khi sử dụng kết quả." : "Có tín hiệu mua, nhưng báo cáo chưa xác nhận đủ điều kiện thực hiện. Hãy xem các điều kiện còn thiếu bên dưới.",
    BUY_SETUP: "Đã có điều kiện đáng theo dõi. Báo cáo vẫn yêu cầu chờ điểm mua phù hợp.",
    WATCH: "Kết quả hiện tại phù hợp để theo dõi thêm. Bạn có thể xem xu hướng, vùng giá mô phỏng và các mốc cần chú ý bên dưới.",
    AVOID: "Báo cáo đề nghị tránh mở vị thế mới ở thời điểm này. Hãy xem phần rủi ro để hiểu các điểm cần thận trọng.",
  };
  const conclusion = action === "BUY_NOW" && !executable ? "Chờ hoàn tất điều kiện" : actionNames[action] || "Chưa có kết luận đầy đủ";
  const rawReasons = Array.isArray(report.decision.reason_codes) ? report.decision.reason_codes.map(String) : [];
  const reasons = [...new Set([...rawReasons, ...report.warnings].map(code => analysisMessages[code] || "Một điều kiện của báo cáo chưa được xác nhận. Xem phần chuyên sâu để biết thêm."))];
  return <div className={`${styles.report} ${compact ? styles.compact : ""}`}>
    <section className={styles.hero} aria-label="Tổng hợp và khuyến nghị">
      <p className={styles.eyebrow}>HIỂU NHANH {report.symbol} · KẾT QUẢ PHÂN TÍCH</p>
      <h3>{showAction ? conclusion : `Bức tranh tổng quan của ${report.symbol}`}</h3>
      <p className={styles.intro}>{showAction ? explanation[action] || "Báo cáo chưa đưa ra kết luận đủ rõ. Chỉ những phần có dữ liệu được hiển thị bên dưới." : "Bắt đầu từ xu hướng, xem các vùng giá có thể xảy ra rồi đối chiếu với rủi ro và kế hoạch của báo cáo."}</p>
      <dl className={styles.facts}>
        <div><dt>Xu hướng hiện tại</dt><dd>{state || "Chưa xác định"}</dd><p>{fallback ? "Đang dùng cách nhận diện thay thế; chưa có độ tin cậy từ mô hình chính." : state ? "Cho biết mô hình đang nhìn nhận trạng thái giá như thế nào." : "Báo cáo chưa xác nhận được trạng thái giá hiện tại."}</p></div>
        <div><dt>Kỳ vọng sau chi phí</dt><dd>{finite(net) ? number(net, "%") : "Chưa có dữ liệu"}</dd><p>{finite(net) ? `${finite(horizon) && horizon > 0 ? `Ước tính cho ${number(horizon)} phiên giao dịch.` : "Ước tính trong khung dự báo của báo cáo."} ${net <= 0 ? "Kỳ vọng còn lại chưa dương." : "Con số này có thể thay đổi khi điều kiện thị trường đổi."}` : "Chưa thể đọc kỳ vọng sau chi phí từ báo cáo này."}</p></div>
        <div><dt>Mức giảm sâu nhất từng gặp</dt><dd>{finite(drawdown) ? number(drawdown, "%") : "Chưa có dữ liệu"}</dd><p>{finite(drawdown) ? "Mức giảm từ một đỉnh trước đó, trong giai đoạn dữ liệu được phân tích." : "Chưa có đủ dữ liệu để đọc mức giảm sâu nhất trong giai đoạn phân tích."}</p></div>
      </dl>
      <div className={styles.meta}><span>Phiên {report.target_session || report.data_as_of.slice(0,10)}</span><span>Phân tích lúc {stamp(report.evaluated_at)}</span>{finite(research.observations) && research.observations > 0 && <span>{number(research.observations)} phiên dữ liệu</span>}</div>
    </section>
    <div className={styles.grid}>
      <div className={styles.column}><TrendCard report={report}/><RiskCard report={report}/></div>
      <div className={styles.column}><ScenarioCard report={report}/><PlanCard report={report}/></div>
    </div>
    <section className={`${styles.card} ${styles.notes}`} aria-label="Điều cần theo dõi"><h3>Cần chú ý điều gì tiếp theo?</h3>
      <ul>{(reasons.length ? reasons : ["Theo dõi bản phân tích ở phiên tiếp theo để xem tín hiệu và rủi ro có thay đổi hay không."]).map((text, index) => <li key={index}>{text}</li>)}</ul>
    </section>
  </div>;
}

function TrendCard({ report }: { report: AnalysisReport }) {
  const [view, setView] = useState<"price" | "states">("price");
  const prices = metric(report, "statistics", "_price_close"), dates = metric(report, "statistics", "_price_dates");
  const raw = record(metric(report, "hmm", "hmm.state_probs"));
  const keys = ["BULL", "SIDEWAY", "BEAR"] as const;
  const values = keys.map(key => raw[key]);
  const valid = values.every(value => finite(value) && value >= 0 && value <= 100) && Math.abs((values as number[]).reduce((sum, value) => sum+value, 0)-100) <= 1;
  const fallback = metric(report, "hmm", "hmm.method") === "fallback";
  const probabilities = valid && !fallback ? raw as Record<typeof keys[number], number> : null;
  return <section className={styles.card} aria-label="Xu hướng dễ hiểu"><div><p className={styles.step}>XU HƯỚNG</p><h3>Giá đang đi như thế nào?</h3><p className={styles.copy}>Đường giá giúp bạn thấy cổ phiếu đã tăng, giảm hay đi ngang trong giai đoạn phân tích.</p></div>
    <div className={styles.tabs} role="group" aria-label="Cách xem xu hướng"><button aria-pressed={view === "price"} onClick={() => setView("price")}>Đường giá</button><button aria-pressed={view === "states"} onClick={() => setView("states")}>Trạng thái 3D</button></div>
    {view === "price" ? numbers(prices) && prices.length >= 2 && prices.every(price => price > 0) ? <LinePlot title={`Lịch sử giá đóng cửa ${report.symbol}`} unit="VND" plain rows={prices.map((value, i) => ({ x: i+1, value, label: Array.isArray(dates) && dates.length === prices.length ? String(dates[i]).slice(0,10) : undefined }))}/> : <Empty/> : probabilities ? <StateSpace probabilities={probabilities} symbol={report.symbol}/> : <Empty>{fallback ? "Đang dùng cách nhận diện thay thế. Báo cáo chưa có tỷ lệ trạng thái từ mô hình chính để vẽ 3D." : "Báo cáo chưa có đủ tỷ lệ tăng, đi ngang và giảm để vẽ 3D."}</Empty>}
    <p className={styles.takeaway}>{view === "price" ? "Nhìn từ trái sang phải để thấy những gì đã xảy ra. Đường giá lịch sử không cho biết chắc phiên tiếp theo sẽ thế nào." : "Cột càng cao, mô hình càng nghiêng về trạng thái đó. Tỷ lệ phân loại này không phải tỷ lệ giao dịch có lời."}</p>
  </section>;
}

function ScenarioCard({ report }: { report: AnalysisReport }) {
  const research = researchFor(report), [view, setView] = useState<"3d" | "2d">("3d");
  const [day, setDay] = useState(Math.max(0, research.cone?.length - 1));
  const rows = report.sections.simulation_risk?.status === "AVAILABLE" && validCone(research.cone) ? research.cone : [];
  const selected = Math.max(0, Math.min(day, rows.length-1)), current = rows[selected];
  return <section className={styles.card} aria-label="Kịch bản giá dễ hiểu"><div><p className={styles.step}>CÁC KỊCH BẢN</p><h3>Giá có thể dao động trong vùng nào?</h3><p className={styles.copy}>Mô hình xem xét nhiều diễn biến có thể xảy ra. Các lớp giá bên dưới được lấy từ mô phỏng của báo cáo.</p></div>
    <div className={styles.tabs} role="group" aria-label="Cách xem kịch bản"><button aria-pressed={view === "3d"} onClick={() => setView("3d")}>Mô hình 3D</button><button aria-pressed={view === "2d"} onClick={() => setView("2d")}>Biểu đồ 2D</button></div>
    {current ? <>
      {view === "3d" ? <ScenarioSpace rows={rows} symbol={report.symbol} selected={selected}/> : <LinePlot title={`Dải giá Monte Carlo ${report.symbol}`} unit="VND" band plain selectedIndex={selected} rows={rows.map(point => ({ x: point.session, value: point.p50, low: point.p05, innerLow: point.p25, innerHigh: point.p75, high: point.p95 }))}/>}
      <label className={styles.sessionControl}>Xem tại phiên +{current.session}<input aria-label="Phiên mô phỏng đang xem" type="range" min={0} max={rows.length-1} step={1} value={selected} onChange={event => setDay(Number(event.target.value))}/></label>
      <dl className={styles.readout} aria-live="polite"><div><dt>Mốc thấp · 5%</dt><dd>{money(current.p05)}</dd></div><div><dt>Mốc giữa · 50%</dt><dd>{money(current.p50)}</dd></div><div><dt>Mốc cao · 95%</dt><dd>{money(current.p95)}</dd></div></dl>
      <p className={styles.takeaway}>Tại phiên +{current.session}, vùng {money(current.p05)}–{money(current.p95)} chứa khoảng 90% kịch bản mô phỏng. Vùng rộng hơn cho thấy độ không chắc chắn lớn hơn.</p>
    </> : <Empty>Báo cáo chưa có dữ liệu mô phỏng hợp lệ để vẽ kịch bản 2D hoặc 3D.</Empty>}
    <details className={styles.reading}><summary>Hiểu ba mốc giá này thế nào?</summary><p>Mốc giữa chia đôi số kịch bản mô phỏng. Khoảng 5% kịch bản nằm dưới mốc thấp và 5% nằm trên mốc cao. Các lớp giá không phải những đường giá chắc chắn sẽ xảy ra.</p></details>
  </section>;
}

function RiskCard({ report }: { report: AnalysisReport }) {
  const [view, setView] = useState<"past" | "swings">("past"), research = researchFor(report);
  const history = report.sections.statistics?.status === "AVAILABLE" && Array.isArray(research.drawdown) ? research.drawdown : [];
  const validHistory = history.length >= 2 && history.every(point => finite(point.valuePct) && point.valuePct <= 0);
  const forecast = metric(report, "garch", "garch.garch.forecast_vol");
  return <section className={styles.card} aria-label="Rủi ro dễ hiểu"><div><p className={styles.step}>MẶT TRÁI CẦN NHÌN</p><h3>Nếu giá đi ngược kỳ vọng thì sao?</h3><p className={styles.copy}>Xem những lần giá rời xa đỉnh cũ, hoặc độ dao động mà mô hình đang ước tính cho các phiên tới.</p></div>
    <div className={styles.tabs} role="group" aria-label="Cách xem rủi ro"><button aria-pressed={view === "past"} onClick={() => setView("past")}>Mức giảm đã xảy ra</button><button aria-pressed={view === "swings"} onClick={() => setView("swings")}>Độ dao động sắp tới</button></div>
    {view === "past" ? validHistory ? <LinePlot title={`Sụt giảm từ đỉnh ${report.symbol}`} unit="%" drawdown plain rows={history.map((point, i) => ({ x: i+1, value: point.valuePct, label: point.date }))}/> : <Empty/> : numbers(forecast) && forecast.length >= 2 && forecast.every(value => value >= 0) ? <LinePlot title="Biến động dự báo GARCH" unit="% / phiên" plain rows={forecast.map((value, i) => ({ x: i+1, value }))}/> : <Empty/>}
    <p className={styles.takeaway}>{view === "past" ? "Càng xuống thấp hơn mốc 0%, giá càng giảm xa đỉnh trước đó. Đây là tổn thất đã quan sát trong dữ liệu lịch sử." : "Đường càng cao, giá được ước tính có thể dao động càng mạnh. Biểu đồ này đo độ dao động, không dự báo hướng tăng hay giảm."}</p>
  </section>;
}

function PlanCard({ report }: { report: AnalysisReport }) {
  const sizing = metric(report, "trade_plan", "sizing_mode"), executable = report.decision.executable === true;
  const levels = [["Mốc xem xét vào lệnh", "sl.entry", "var(--accent)"], ["Mốc giới hạn lỗ", "sl.sl_swing", "var(--negative)"], ["Mục tiêu thứ nhất", "sl.tp1", "var(--positive)"], ["Mục tiêu thứ hai", "sl.tp2", "var(--positive)"]];
  return <section className={styles.card} aria-label="Kế hoạch giao dịch"><div><p className={styles.step}>CÁC MỐC THEO DÕI</p><h3>Nếu tiếp tục theo dõi, nên nhìn mốc nào?</h3><p className={styles.copy}>Đây là các mức giá của kế hoạch trong báo cáo. Dùng để đối chiếu khi giá thay đổi.</p></div>
    <dl className={styles.plan}>{levels.map(([label, path, color]) => <div className={styles.planRow} style={{ borderLeftColor: color }} key={path}><dt>{label}</dt><dd>{money(metric(report, "trade_plan", path))}</dd></div>)}</dl>
    <p className={styles.takeaway}>{executable ? "Báo cáo xác nhận đủ điều kiện thực hiện tại thời điểm phân tích." : "Kế hoạch có điều kiện: báo cáo chưa xác nhận đủ điều kiện thực hiện."}</p>
    <p className={styles.planHint}>{sizing === "PERSONALIZED" ? "Quy mô được tính theo vốn đã cung cấp." : sizing === "REFERENCE" ? "Quy mô trong báo cáo dùng vốn tham chiếu; chưa cá nhân hóa theo tài khoản của bạn." : "Báo cáo chưa xác nhận cách tính quy mô vị thế."} Giá có thể vượt qua mốc dừng lỗ khi biến động mạnh hoặc khó khớp lệnh.</p>
  </section>;
}

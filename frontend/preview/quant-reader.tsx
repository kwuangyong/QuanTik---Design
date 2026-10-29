import { createRoot } from "react-dom/client";
import { Preferences, usePreferences } from "../src/components/preferences";
import { QuantFactorProfile } from "../src/components/quant-factor-profile";
import { LiveQuantReport } from "../src/components/quant-live-report";
import { quantReportSample, quantSampleCases, type QuantSampleCase } from "../tests/fixtures/quant-report-sample";

const query = new URLSearchParams(window.location.search);
const sampleCase = quantSampleCases.includes(query.get("case") as QuantSampleCase) ? query.get("case") as QuantSampleCase : "complete";
const report = quantReportSample(sampleCase);
function Preview() {
  const { theme, toggleTheme } = usePreferences();
  const factorView = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "factors";
  return <main className="terminal" data-theme={theme} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", padding: "clamp(16px,4vw,48px)", fontFamily: '"IBM Plex Mono",monospace' }}>
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 28, flexWrap: "wrap" }}><div><p style={{ color: "var(--accent)", fontSize: 13, letterSpacing: ".1em" }}>QUANTIK / BẢN XEM THỬ</p><h1 style={{ fontSize: "clamp(24px,4vw,36px)", marginTop: 8 }}>Đọc dữ liệu. Hiểu quyết định.</h1><p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10 }}>Dữ liệu mẫu để duyệt giao diện · Không phải báo cáo hoặc tín hiệu đầu tư thật.</p></div><button onClick={toggleTheme} style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</button></header>
      <p style={{marginBottom:20,fontSize:13}}><a style={{color:"var(--accent)",textDecoration:"underline"}} href={factorView?`?view=report&case=${sampleCase}`:`?view=factors&case=${sampleCase}`}>{factorView?"← Xem báo cáo đầy đủ":"Xem riêng Hồ sơ nhân tố →"}</a></p>
      <nav aria-label="Tình huống dữ liệu mẫu" style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:13,marginBottom:24}}>{quantSampleCases.map(id=><a key={id} href={`?view=${factorView?"factors":"report"}&case=${id}`} aria-current={sampleCase===id?"page":undefined} style={{padding:"8px 12px",border:"1px solid var(--border)",color:sampleCase===id?"var(--accent)":"var(--muted)"}}>{{complete:"Mẫu đầy đủ",partial:"Thiếu một phần",unavailable:"Chưa khả dụng",disabled:"Module đã tắt",failed:"Tính thất bại"}[id]}</a>)}</nav>
      {factorView?<QuantFactorProfile data={report.research!.factors}/>:<LiveQuantReport report={report}/>}
    </div>
  </main>;
}
const root = document.getElementById("quant-reader-preview");
if (root) createRoot(root).render(<Preferences><Preview/></Preferences>);

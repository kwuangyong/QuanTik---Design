import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PreviewRouter, usePathname, useRouter } from "./router";
import { Preferences, usePreferences } from "../src/components/preferences";
import { Screener } from "../src/components/screener";
import { AnalysisPage } from "../src/components/analysis";
import { createPreviewApi, type PreviewCase } from "./scan-quant-api";

const api = createPreviewApi();
window.fetch = api.fetch;
Object.assign(window, { __quantikPreview: api });
const cases: [PreviewCase,string][] = [["complete","Đủ dữ liệu"],["basic","Chỉ dữ liệu screening"],["partial","Quant thiếu một phần"],["unavailable","Quant chưa khả dụng"],["disabled","Module Quant đã tắt"],["failed","Module Quant tính lỗi"],["waiting","Chưa công bố quét"],["network","Quét lỗi kết nối"]];
function Preview() {
  const pathname = usePathname(), router = useRouter(), { theme, toggleTheme } = usePreferences();
  const [scenario, setScenario] = useState<PreviewCase>("complete");
  const [revision, setRevision] = useState(0);
  const [routeRevision, setRouteRevision] = useState(0);
  const navigate = (route: string) => { router.push(route); setRouteRevision(value => value+1); };
  return <main className="terminal" data-theme={theme} style={{ minHeight:"100vh", background:"var(--background)", color:"var(--text)", padding:"clamp(12px,3vw,36px)", fontFamily:'"IBM Plex Mono",monospace' }}>
    <div style={{ maxWidth:1400, margin:"0 auto", minWidth:0 }}>
      <header className="sample-toolbar">
        <p style={{color:"var(--accent)",letterSpacing:".08em",fontSize:13}}>QUANTIK / CHẠY THỬ LUỒNG QUÉT → QUANT</p>
        <h1 style={{fontSize:"clamp(22px,4vw,32px)",margin:"10px 0"}}>Từ toàn sàn đến từng mã.</h1>
        <p style={{fontSize:13,lineHeight:1.8,color:"var(--muted)"}}>Dữ liệu tổng hợp · Ngày mẫu 16/10/2026 · Không phải giá hoặc tín hiệu thật. Các mã dùng chung bộ số minh họa; không chạy mô hình hoặc gửi yêu cầu lên hệ thống thật.</p>
        <nav aria-label="Điều khiển bản thử" style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginTop:16}}>
          <button onClick={()=>navigate("/screener")}>1 · Quét toàn sàn</button>
          <button onClick={()=>navigate("/analysis?symbol=FPT")}>2 · Phân tích FPT</button>
          <label>Tình huống <select aria-label="Tình huống thử dữ liệu" value={scenario} onChange={event=>{ const value=event.target.value as PreviewCase; api.setCase(value); setScenario(value); setRevision(v=>v+1); }}>
            {cases.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
          <button onClick={toggleTheme}>{theme==="dark"?"Giao diện sáng":"Giao diện tối"}</button>
        </nav>
        <p style={{fontSize:13,lineHeight:1.8,marginTop:14}}>Bấm “Kích hoạt kết quả” → xem 5+5 mã → bấm mã xem chi tiết hoặc nút Quant → gửi và xác nhận yêu cầu mẫu → chờ khoảng 5 giây để nhận báo cáo 16 module. Vốn nhập vào chỉ thử thao tác; báo cáo dùng quy mô tham chiếu cố định.</p>
        <p role="status" style={{fontSize:13,color:"var(--accent)",marginTop:10}}>Đang thử: {cases.find(([id])=>id===scenario)?.[1]} · Đổi tình huống sẽ tải lại màn hiện tại.</p>
      </header>
      <section key={`${revision}-${routeRevision}`} style={{minWidth:0}}>
        {pathname==="/screener"?<Screener/>:pathname==="/analysis"?<AnalysisPage/>:<p>Chọn Quét toàn sàn hoặc Phân tích FPT ở phía trên để tiếp tục bản thử.</p>}
      </section>
    </div>
  </main>;
}
const root = document.getElementById("quantik-design-preview");
if (root) createRoot(root).render(<PreviewRouter><Preferences><Preview/></Preferences></PreviewRouter>);

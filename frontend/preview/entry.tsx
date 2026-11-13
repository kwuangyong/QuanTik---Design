import {createRoot} from "react-dom/client";
import {PreviewRouter,usePathname,useRouter} from "./router";
import {Preferences} from "../src/components/preferences";
import {Shell} from "../src/components/shell";
import {Dashboard} from "../src/components/dashboard";
import {Screener} from "../src/components/screener";
import {AnalysisPage} from "../src/components/analysis";
import {ChartWorkspace} from "../src/components/chart-workspace";
import {PortfolioIntelligence} from "../src/components/portfolio-intelligence";
import HomePage from "../src/components/home/home-page";
function Preview(){
  const pathname=usePathname(),router=useRouter();
  if(pathname==="/")return <HomePage onNavigate={()=>router.push("/dashboard")} onInspect={symbol=>router.push("/analysis?symbol="+encodeURIComponent(symbol))}/>;
  return <Shell>{pathname==="/portfolio"?<PortfolioIntelligence/>:pathname==="/screener"?<Screener/>:pathname==="/analysis"?<AnalysisPage/>:pathname==="/charts"?<ChartWorkspace/>:<Dashboard/>}</Shell>;
}
const root=document.getElementById("quantik-design-preview");
if(root)createRoot(root).render(<PreviewRouter><Preferences><Preview/></Preferences></PreviewRouter>);

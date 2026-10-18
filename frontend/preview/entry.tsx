import {createRoot} from "react-dom/client";
import {PreviewRouter,usePathname,useRouter} from "./router";
import {Preferences} from "../src/components/preferences";
import {Shell} from "../src/components/shell";
import {Dashboard} from "../src/components/dashboard";
import {Screener} from "../src/components/screener";
import {AnalysisPage} from "../src/components/analysis";
import {ChartWorkspace} from "../src/components/chart-workspace";
import GuidePage from "../src/app/(workspace)/guide/page";
import HomePage from "../src/components/home/home-page";
function Preview(){
  const pathname=usePathname(),router=useRouter();
  if(pathname==="/")return <HomePage onNavigate={()=>router.push("/dashboard")} onInspect={symbol=>router.push("/analysis?symbol="+encodeURIComponent(symbol))}/>;
  return <Shell>{pathname==="/screener"?<Screener/>:pathname==="/analysis"?<AnalysisPage/>:pathname==="/charts"?<ChartWorkspace/>:pathname==="/guide"?<GuidePage/>:<Dashboard key={pathname} watchOnly={pathname==="/watch"}/>}</Shell>;
}
const root=document.getElementById("quantik-design-preview");
if(root)createRoot(root).render(<PreviewRouter><Preferences><Preview/></Preferences></PreviewRouter>);

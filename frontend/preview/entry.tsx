import {createRoot} from "react-dom/client";
import {PreviewRouter,usePathname,useRouter} from "./router";
import {Preferences} from "../src/components/preferences";
import {Shell} from "../src/components/shell";
import {PreviewContent} from "./routes";
import {Login} from "../src/components/account/login";
import {AuthSurface} from "../src/components/account/auth-surface";
import HomePage from "../src/components/home/home-page";
function Preview(){
  const pathname=usePathname(),router=useRouter();
  if(pathname==="/")return <HomePage onNavigate={()=>router.push("/dashboard")} onInspect={symbol=>router.push("/analysis?symbol="+encodeURIComponent(symbol))}/>;
  if(pathname==="/login")return <AuthSurface><Login/></AuthSurface>;
  return <Shell><PreviewContent pathname={pathname}/></Shell>;
}
const root=document.getElementById("quantik-design-preview");
if(root)createRoot(root).render(<PreviewRouter><Preferences><Preview/></Preferences></PreviewRouter>);

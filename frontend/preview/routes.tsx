import { Dashboard } from "../src/components/dashboard";
import { Screener } from "../src/components/screener";
import { AnalysisPage } from "../src/components/analysis";
import { ChartWorkspace } from "../src/components/chart-workspace";
import { AccountPage, PlansPage, HistoryPage, OrderPage } from "../src/components/account/customer";
import { EmptyState } from "../src/components/ui";

/** Keep preview paths identical to Next routes: never fall back to Dashboard. */
export function PreviewContent({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/dashboard": return <Dashboard/>;
    case "/screener": return <Screener/>;
    case "/analysis": return <AnalysisPage/>;
    case "/charts": return <ChartWorkspace/>;
    case "/plans": return <PlansPage/>;
    case "/account": return <AccountPage/>;
    case "/account/orders": return <HistoryPage/>;
    case "/account/payments": return <HistoryPage payments/>;
    default:
      if (/^\/orders\/[^/]+$/.test(pathname)) return <OrderPage id={pathname.split("/")[2]}/>;
      return <EmptyState title="Không tìm thấy trang"/>;
  }
}

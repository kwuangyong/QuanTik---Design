import {Suspense} from "react";
import {Dashboard} from "@/components/dashboard";
export const metadata={title:"Dashboard"};
export default function Page(){return <Suspense fallback={<p role="status">Đang mở dashboard…</p>}><Dashboard/></Suspense>;}

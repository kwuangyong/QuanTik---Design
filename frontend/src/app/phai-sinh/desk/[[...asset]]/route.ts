import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { upstream } from "@/lib/server/api-proxy";

export const dynamic = "force-dynamic";
const mime: Record<string, string> = { html:"text/html; charset=utf-8", js:"text/javascript", css:"text/css", jpg:"image/jpeg" };
const headers = { "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" };

export async function GET(request: NextRequest, context: {params: Promise<{asset?: string[]}>}) {
  const token = request.cookies.get("quantik_desk")?.value;
  if (!token) return new Response("Cần đăng nhập lại để mở Phòng phái sinh.", {status:401,headers});
  try {
    const rights = await upstream("me/entitlements",{headers:{Authorization:"Bearer "+token}});
    if (!rights.ok) return new Response("Chưa xác nhận được quyền truy cập.",{status:rights.status===401?401:503,headers});
    const data = await rights.json();
    if (data.active!==true || data.plan?.name!=="QuanTik Pro" || !(data.valid_until>Date.now()/1000)) {
      return new Response('<meta charset="utf-8"><body style="background:#101917;color:white;font:18px system-ui;padding:2rem"><h1>Phòng phái sinh</h1><p>Tính năng dành cho tài khoản QuanTik Pro còn hiệu lực.</p><a style="color:#5ce2d4" href="/plans" target="_top">Xem gói Pro</a>',{status:403,headers:{...headers,"Content-Type":mime.html}});
    }
  } catch { return new Response("Tạm thời chưa kiểm tra được gói.",{status:503,headers}); }
  const {asset} = await context.params;
  if (!asset?.length) return Response.redirect(new URL("/phai-sinh/desk/index.html"+request.nextUrl.search,request.url),307);
  const file = asset[0];
  if (asset.length!==1 || !/^[a-z0-9-]+(?:\.min)?\.(html|css|js|jpg)$/.test(file)) return new Response(null,{status:404,headers});
  try {
    const bytes = await readFile(path.join(process.cwd(),"private","derivatives",file));
    return new Response(new Uint8Array(bytes),{headers:{...headers,"Content-Type":mime[path.extname(file).slice(1)]}});
  } catch { return new Response(null,{status:404,headers}); }
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "QuanTik — Kiểm định cổ phiếu trước khi xuống tiền";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/og", file));

export default async function OpenGraphImage() {
  const [l4, v4, l6, v6, logo] = await Promise.all([
    font("inter-latin-400-normal.woff"), font("inter-vietnamese-400-normal.woff"),
    font("inter-latin-600-normal.woff"), font("inter-vietnamese-600-normal.woff"),
    readFile(join(process.cwd(), "public/quantik-logo.jpg")),
  ]);
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`;
  const stages = ["Dữ liệu", "Thanh khoản", "Xu hướng", "Rủi ro", "Điều kiện"];
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg,#080e0b 0%,#0f1e15 60%,#13281b 100%)", color: "#f0f2e9", fontFamily: "Inter" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={56} height={56} style={{ borderRadius: 8 }} alt="" />
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: -1 }}><span>Quan</span><span style={{ color: "#ff914d" }}>Tik</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 66, fontWeight: 600, lineHeight: 1.1, letterSpacing: -2 }}>
          <span>Nghe một mã.</span>
          <span style={{ color: "#ff914d" }}>Kiểm định trước khi xuống tiền.</span>
        </div>
        <div style={{ fontSize: 30, color: "#b9c9b7", maxWidth: 940, lineHeight: 1.4 }}>9 lớp bằng chứng định lượng cho cổ phiếu Việt Nam: kết luận, vùng giá và giới hạn rủi ro.</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {stages.map((s, i) => <div key={s} style={{ display: "flex", padding: "12px 20px", border: "1px solid #35503b", borderRadius: 8, background: "#122218", fontSize: 24, color: i === stages.length - 1 ? "#ffab74" : "#cfe0d2" }}>{s}</div>)}
        <div style={{ display: "flex", marginLeft: "auto", alignItems: "center", fontSize: 26, color: "#79dba4" }}>quantik.io.vn</div>
      </div>
    </div>,
    { ...size, fonts: [
      { name: "Inter", data: l4, weight: 400, style: "normal" }, { name: "Inter", data: v4, weight: 400, style: "normal" },
      { name: "Inter", data: l6, weight: 600, style: "normal" }, { name: "Inter", data: v6, weight: 600, style: "normal" },
    ] },
  );
}

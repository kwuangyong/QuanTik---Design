import type { ProPerk } from "@/content/pro-perks";

// Small explanatory drawings for each early-access model. Colours follow the app theme
// variables when present (workspace), with marketing fallbacks (home page).
const accent = "var(--accent, #ff914d)", signal = "var(--positive, #79dba4)", grid = "var(--border, #294337)", dim = "var(--muted, #93a897)";

export function PerkVisual({ id, className = "" }: { id: ProPerk["id"]; className?: string }) {
  const common = { viewBox: "0 0 120 72", className, "aria-hidden": true, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const axes = <><path d="M10 62H112" stroke={grid} /><path d="M10 8V62" stroke={grid} /></>;
  switch (id) {
    case "portfolio": {
      // Donut of weights plus risk-contribution bars.
      const arcs: [number, number, string][] = [[0, 0.42, accent], [0.42, 0.68, signal], [0.68, 0.86, "#a7bfff"], [0.86, 1, dim]];
      const pt = (f: number, r: number) => [34 + r * Math.sin(f * 2 * Math.PI), 36 - r * Math.cos(f * 2 * Math.PI)];
      return <svg {...common}>
        {arcs.map(([a, b, c]) => { const [x1, y1] = pt(a, 22), [x2, y2] = pt(b - 0.01, 22); return <path key={a} d={`M${x1} ${y1}A22 22 0 ${b - a > 0.5 ? 1 : 0} 1 ${x2} ${y2}`} stroke={c} strokeWidth="8" strokeLinecap="butt" />; })}
        {[34, 22, 14, 8].map((w, i) => <rect key={i} x="70" y={16 + i * 12} width={w + 6} height="6" rx="2" fill={[accent, signal, "#a7bfff", dim][i]} opacity=".9" />)}
      </svg>;
    }
    case "options":
      // Call payoff at expiry (hockey stick) vs smooth value before expiry.
      return <svg {...common}>{axes}
        <path d="M10 52H58L104 14" stroke={dim} strokeDasharray="3 3" />
        <path d="M10 51C34 50 46 46 58 40S84 24 104 12" stroke={accent} strokeWidth="2.5" />
        <circle cx="58" cy="52" r="2.5" fill={signal} /><path d="M58 56V62" stroke={signal} />
      </svg>;
    case "index-futures":
      // Futures and spot converge at expiry (basis → 0).
      return <svg {...common}>{axes}
        <path d="M12 22C34 26 48 30 62 32S90 38 104 40" stroke={accent} strokeWidth="2.5" />
        <path d="M12 48C34 46 48 44 62 42S90 40 104 40" stroke={signal} strokeWidth="2" />
        <path d="M30 25V47M54 31V44M78 36V41" stroke={dim} strokeDasharray="2 2" />
        <circle cx="104" cy="40" r="3" fill={accent} />
      </svg>;
    case "futures":
      // Term structure across maturities.
      return <svg {...common}>{axes}
        <path d="M16 50C34 38 52 30 70 26S96 22 106 20" stroke={accent} strokeWidth="2.5" />
        {[[16, 50], [40, 35], [70, 26], [106, 20]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="3" fill={signal} /><path d={`M${x} ${y + 5}V62`} stroke={grid} strokeDasharray="2 2" /></g>)}
      </svg>;
    case "warrants":
      // Delta S-curve with break-even marker.
      return <svg {...common}>{axes}
        <path d="M12 58C40 58 48 56 58 44S72 16 108 14" stroke={accent} strokeWidth="2.5" />
        <path d="M70 8V62" stroke={signal} strokeDasharray="3 3" />
        <circle cx="70" cy="27" r="3" fill={signal} />
      </svg>;
  }
}

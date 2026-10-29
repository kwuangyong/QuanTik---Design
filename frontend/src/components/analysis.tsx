"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeading } from "./ui";
import { QuantPanel } from "./quant-panel";
import { accountStyles } from "./account/styles";

export function AnalysisPage() {
  const router = useRouter(), query = useSearchParams();
  const symbol = (query.get("symbol") || "FPT").toUpperCase();
  const [draft, setDraft] = useState(symbol), [error, setError] = useState("");
  useEffect(() => { setDraft(symbol); setError(""); }, [symbol]);
  return <>
    <PageHeading title="Phân tích Quant" description="Hiểu tín hiệu, xem các kịch bản và biết những rủi ro cần theo dõi.">
      <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
        event.preventDefault(); const next = draft.trim().toUpperCase();
        if (!/^[A-Z0-9]{2,16}$/.test(next)) { setError("Nhập mã cổ phiếu hợp lệ."); return; }
        router.replace(`/analysis?symbol=${encodeURIComponent(next)}`);
      }}>
        <label className="sr-only" htmlFor="analysis-symbol">Chọn mã phân tích</label>
        <input id="analysis-symbol" className="min-h-11 w-32 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-3 font-mono" value={draft} maxLength={16} onChange={event => setDraft(event.target.value.toUpperCase())}/>
        <button className={accountStyles.buttonSecondary}>Chọn mã</button>
      </form>
    </PageHeading>
    {error && <p role="alert" className="mb-4 text-[var(--negative)]">{error}</p>}
    <QuantPanel key={symbol} symbol={symbol}/>
  </>;
}

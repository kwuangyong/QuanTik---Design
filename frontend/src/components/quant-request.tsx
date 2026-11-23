"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, mutation } from "@/lib/api/client";
import { stamp, type Entitlement } from "@/lib/api/contracts";
import { analysisReason, jobStatuses, terminalJob, type AnalysisJob, type AnalysisOptions, type AnalysisReport } from "@/lib/api/analysis";
import { Guard } from "./account/session";
import { Confirm, ErrorNotice, Field, PagedTable, ResourceState, useResource } from "./account/common";
import { accountStyles } from "./account/styles";
import { Panel } from "./ui";
import { QuantReport } from "./quant-report";

export function QuantRequestPanel(props: { symbol: string; compact?: boolean }) {
  return <Guard><RequestPanel {...props}/></Guard>;
}

function RequestPanel({ symbol, compact = false }: { symbol: string; compact?: boolean }) {
  const router = useRouter(), query = useSearchParams();
  const [session, setSession] = useState("");
  const options = useResource<AnalysisOptions>("analyses/options" + (session ? "?target_session=" + session : ""));
  const rights = useResource<Entitlement>("me/entitlements");
  const [jobId, setJobId] = useState(compact ? "" : query.get("job") || "");
  const [revision, setRevision] = useState(0), [review, setReview] = useState(false), [busy, setBusy] = useState(false);
  const [personalized, setPersonalized] = useState(false), [capital, setCapital] = useState(""), [risk, setRisk] = useState("2");
  const [error, setError] = useState<Error | null>(null);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const selected = session || options.data?.selected_session || "";
  const body = { symbol, target_session: selected, ...(personalized ? { sizing: { account_size_vnd: Number(capital), max_position_risk_ratio: Number(risk)/100 } } : {}) };
  const samePending = !!pending.current && pending.current.payload === JSON.stringify(body);
  const canSize = !personalized || (Number.isFinite(Number(capital)) && Number(capital) > 0 && Number(risk) > 0 && Number(risk) <= 10);
  const canSend = samePending || (!!rights.data?.active && rights.data.remaining > 0 && (rights.data.active_jobs || 0) < rights.data.active_limit
    && !!options.data?.ready && options.data.symbols.includes(symbol) && !options.loading && !options.error && !rights.error && !rights.loading && canSize);
  const settled = useCallback(() => { rights.reload(); setRevision(value => value + 1); }, [rights.reload]);
  const openJob = (id: string, code: string) => {
    if (compact) setJobId(id);
    else router.replace(`/analysis?symbol=${encodeURIComponent(code)}&job=${encodeURIComponent(id)}`, { scroll: false });
  };
  useEffect(() => { if (!compact) setJobId(query.get("job") || ""); }, [query, compact]);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") { options.reload(); rights.reload(); setRevision(value => value + 1); } }, 30000);
    return () => clearInterval(timer);
  }, [options.reload, rights.reload]);
  return <div className="grid min-w-0 gap-6">
    <Panel title={`Phân tích ${symbol}`}><div className="p-5 text-sm leading-7">
      <ResourceState {...rights} retry={rights.reload}/><ResourceState {...options} retry={options.reload}/><ErrorNotice error={error}/>
      {rights.data && <>
        {!rights.data.active ? <p>Cần có gói còn hiệu lực để gửi yêu cầu. <Link className="text-[var(--accent)] underline" href="/plans">Xem gói phân tích</Link></p>
          : <p>Còn {rights.data.remaining}/{rights.data.daily_limit ?? rights.data.remaining} yêu cầu hôm nay · Đang xử lý {rights.data.active_jobs || 0}/{rights.data.active_limit}.</p>}
        {rights.data.active && rights.data.remaining === 0 && <p role="status">Đã đạt giới hạn ngày. Mở lại hạn mức lúc {stamp(rights.data.daily_reset_at)}.</p>}
        {rights.data.active && (rights.data.active_jobs || 0) >= rights.data.active_limit && <p role="status">Chờ một yêu cầu đang xử lý kết thúc trước khi gửi thêm.</p>}
      </>}
      {options.data && !options.data.ready && <div className="mt-3 border-l-2 border-[var(--accent)] pl-3">
        <p role="status">
          {options.data.selected_session && <>Phiên {options.data.selected_session}. </>}
          {analysisReason(options.data.reason)} Chưa tiếp nhận yêu cầu và chưa tính hạn mức.
        </p>
        <button type="button" className={accountStyles.buttonSecondary} disabled={options.loading} onClick={options.reload}>Kiểm tra lại trạng thái Quant</button>
      </div>}
      {options.data?.ready && !options.data.symbols.includes(symbol) && <p role="status">Mã {symbol} chưa có dữ liệu phân tích mới nhất.</p>}
      {samePending && error && <p role="status">Chưa xác định được kết quả gửi. Gửi lại cùng nội dung sẽ truy hồi yêu cầu cũ, không tạo thêm yêu cầu.</p>}
      <form className="mt-4 grid gap-3" onSubmit={event => { event.preventDefault(); if (canSend) setReview(true); }}>
        <fieldset disabled={busy || review} className="grid min-w-0 gap-3">
          <details><summary className="cursor-pointer text-[var(--accent)]">Quy mô vị thế theo vốn (tùy chọn)</summary>
            <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={personalized} onChange={event => setPersonalized(event.target.checked)}/>Sử dụng vốn của tôi</label>
            {personalized && <div className="grid gap-3 sm:grid-cols-2"><Field label="Vốn tài khoản (VND)"><input required type="number" min="1" step="1" value={capital} onChange={event => setCapital(event.target.value)}/></Field>
              <Field label="Rủi ro tối đa mỗi vị thế (%)"><input required type="number" min="0.01" max="10" step="0.01" value={risk} onChange={event => setRisk(event.target.value)}/></Field></div>}
          </details>
          <button className={accountStyles.buttonPrimary} disabled={!canSend}>{busy ? "Đang gửi…" : `Gửi yêu cầu Quant ${symbol}`}</button>
        </fieldset>
      </form>
      {review && <Confirm title="Gửi yêu cầu phân tích?" busy={busy} disabled={!canSend} onCancel={() => setReview(false)} onConfirm={async () => {
        setBusy(true); setError(null);
        setSession(selected);
        const payload = JSON.stringify(body);
        if (pending.current?.payload !== payload) pending.current = { payload, key: crypto.randomUUID() };
        try {
          const job = await api<AnalysisJob>("user", "analyses", mutation("POST", body, pending.current.key));
          pending.current = null; setSession(""); setReview(false); openJob(job.id, job.symbol); settled();
        } catch (err) { if (err instanceof ApiError && err.status >= 400 && err.status < 500) { pending.current = null; setSession(""); } setError(err as Error); setReview(false); rights.reload(); options.reload(); }
        finally { setBusy(false); }
      }}><p>{symbol} · Phiên {selected}. {personalized ? `Vốn ${Number(capital).toLocaleString("vi-VN")} VND · rủi ro ${risk}%.` : "Quy mô vị thế tham chiếu."}</p>
        <p>Yêu cầu được tiếp nhận sẽ tính vào giới hạn ngày. Có thể đóng trang rồi quay lại xem kết quả; yêu cầu không hỗ trợ hủy.</p></Confirm>}
    </div></Panel>
    {jobId && <JobStatus key={jobId} id={jobId} compact={compact} onSettled={settled}/>}
    <Panel title={compact ? `Lịch sử yêu cầu ${symbol}` : "Lịch sử yêu cầu"}><div className="p-5"><PagedTable role="user" revision={revision} resetOnRevision={false} path={compact ? `analyses?symbol=${encodeURIComponent(symbol)}` : "analyses"}
      columns={[{ key: "symbol", label: "Mã" }, { key: "target_session", label: "Phiên" }, { key: "status", label: "Trạng thái", render: value => jobStatuses[value as AnalysisJob["status"]] || String(value) },
        { key: "created_at", label: "Gửi lúc", render: value => stamp(value as number) }]}
      action={row => <button className={accountStyles.buttonSecondary} onClick={() => openJob(String(row.id), String(row.symbol))}>Xem yêu cầu</button>}/></div></Panel>
  </div>;
}

function JobStatus({ id, compact, onSettled }: { id: string; compact: boolean; onSettled: () => void }) {
  const result = useResource<AnalysisJob>(`analyses/${encodeURIComponent(id)}`);
  useEffect(() => {
    if (result.data && terminalJob(result.data.status)) { onSettled(); return; }
    const timer = setInterval(() => { if (document.visibilityState === "visible") result.reload(); }, 5000);
    return () => clearInterval(timer);
  }, [result.data?.status, result.reload, onSettled]);
  const job = result.data;
  return <section className="min-w-0 rounded-[4px] border border-[var(--border)] p-5" aria-label="Yêu cầu phân tích">
    <ResourceState {...result} retry={result.reload}/>
    {job && <><div aria-live="polite" className="mb-5 text-sm leading-7"><h2 className="text-lg font-semibold">{job.symbol} · {job.target_session} · {jobStatuses[job.status]}</h2>
      <p>Gửi lúc {stamp(job.created_at)} · Lần xử lý {job.attempt}</p>
      {!terminalJob(job.status) && <p>{analysisReason(job.reason)} Hạn xử lý: {stamp(job.deadline)}. Có thể quay lại xem sau.</p>}
      {job.status === "FAILED" && <p role="status">{analysisReason(job.reason)} Yêu cầu đã tiếp nhận vẫn tính vào giới hạn ngày.</p>}
    </div>
      {job.status === "SUCCEEDED" && job.report_id && <Report key={job.report_id} id={job.report_id} targetSession={job.target_session} compact={compact}/>}
      {compact && <Link className="text-[var(--accent)] underline" href={`/analysis?symbol=${job.symbol}&job=${job.id}`}>Mở toàn bộ yêu cầu</Link>}
    </>}
  </section>;
}

function Report({ id, targetSession, compact }: { id: string; targetSession: string; compact: boolean }) {
  const result = useResource<AnalysisReport>(`reports/${encodeURIComponent(id)}`);
  return <><ResourceState {...result} retry={result.reload}/>{result.data && !result.error && <QuantReport result={{ ...result.data, target_session: result.data.target_session || targetSession }} compact={compact}/>}</>;
}

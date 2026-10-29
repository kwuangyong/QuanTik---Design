"use client";
import { accountStyles } from "@/components/account/styles";
import { useEffect, useState } from "react";
import { api, mutation } from "@/lib/api/client";
import { stamp, type ConfigPage, type ConfigVersion } from "@/lib/api/contracts";
import { PageHeading, Panel } from "../ui";
import { Confirm, DataTable, ErrorNotice, Field, Reason, ResourceState, useResource } from "../account/common";
const operationFields = ["enabled", "ingestion_enabled", "screening_enabled", "snapshots_enabled", "training_enabled", "auto_promote"];
const labels: Record<string, string> = { enabled: "Vận hành tự động", ingestion_enabled: "Nạp dữ liệu", screening_enabled: "Sàng lọc", snapshots_enabled: "Chuẩn bị dữ liệu phân tích", training_enabled: "Huấn luyện", auto_promote: "Tự công bố mô hình đạt kiểm định", retry_seconds: "Khoảng thử lại (giây)", maximum_attempts: "Số lần thử tối đa", task_timeout_seconds: "Thời gian tối đa mỗi tác vụ (giây)", history_calendar_days: "Số ngày lịch sử" };
const numeric: [
    string,
    number,
    number,
    number
][] = [["retry_seconds", 30, 1800, 300], ["maximum_attempts", 1, 100, 36], ["task_timeout_seconds", 120, 43200, 28800], ["history_calendar_days", 730, 3650, 1900]];
function validateCalendar(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Lịch phải là một đối tượng JSON.");
    const data = value as Record<string, unknown>;
    const sessions = data.sessions;
    const validDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
    if (!validDate(data.start) || !validDate(data.end) || data.start > data.end)
        throw new Error("Ngày bắt đầu/kết thúc không hợp lệ.");
    if (!Array.isArray(sessions) || !sessions.length || sessions.length > 800 || sessions.some((v, i) => !validDate(v) || v < String(data.start) || v > String(data.end) || (i > 0 && v <= sessions[i - 1])))
        throw new Error("Các phiên phải đúng ngày, tăng dần, không trùng và nằm trong khoảng lịch.");
    if (!Array.isArray(data.source_urls) || !data.source_urls.length || data.source_urls.some(v => typeof v !== "string" || !v.startsWith("https://")))
        throw new Error("Cần nguồn tham chiếu HTTPS.");
    if (typeof data.review_note !== "string" || data.review_note.trim().length < 20)
        throw new Error("Ghi chú rà soát cần ít nhất 20 ký tự.");
    return data;
}
export function ConfigurationPage({ calendar = false }: {
    calendar?: boolean;
}) {
    const kind = calendar ? "TRADING_CALENDAR" : "OPERATIONS";
    const [cursors, setCursors] = useState<string[]>([""]);
    const result = useResource<ConfigPage>(`admin/configs/${kind}?limit=10${cursors.at(-1) ? `&cursor=${encodeURIComponent(cursors.at(-1)!)}` : ""}`, "admin");
    const [draft, setDraft] = useState<Record<string, unknown>>({ enabled: true, ingestion_enabled: false, screening_enabled: true, snapshots_enabled: true, training_enabled: true, auto_promote: true, retry_seconds: 300, maximum_attempts: 36, task_timeout_seconds: 28800, history_calendar_days: 1900 });
    const [json, setJson] = useState(""), [sourceId, setSourceId] = useState<string | null>(null);
    const [review, setReview] = useState<Record<string, unknown> | null>(null), [activation, setActivation] = useState<{
        version: ConfigVersion;
        expected: string | null;
    } | null>(null);
    const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null), [notice, setNotice] = useState("");
    useEffect(() => { setCursors([""]); setSourceId(null); setJson(""); setReview(null); setActivation(null); setNotice(""); }, [kind]);
    function edit(version: ConfigVersion) { setDraft(version.payload); setJson(JSON.stringify(version.payload, null, 2)); setSourceId(version.id); setNotice("Đã nạp nội dung phiên bản vào bản nháp. Chỉnh sửa không thay đổi phiên bản đã lưu."); }
    async function create() {
        if (!review || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            const version = await api<ConfigVersion>("admin", `admin/configs/${kind}/versions`, mutation("POST", { payload: review }));
            setReview(null);
            setNotice(`Đã lưu phiên bản ${version.id}. Chưa kích hoạt.`);
            result.reload();
        }
        catch (err) {
            setError(err as Error);
        }
        finally {
            setBusy(false);
        }
    }
    async function activate() {
        if (!activation || busy || reason.trim().length < 10)
            return;
        setBusy(true);
        setError(null);
        try {
            await api("admin", `admin/configs/${kind}/${activation.version.id}/activate`, mutation("POST", { expected_version: activation.expected, reason: reason.trim() }));
            setActivation(null);
            setReason("");
            setNotice("Đã áp dụng phiên bản.");
            result.reload();
        }
        catch (err) {
            setError(err as Error);
            setActivation(null);
            result.reload();
        }
        finally {
            setBusy(false);
        }
    }
    return <><PageHeading title={calendar ? "Lịch giao dịch" : "Cấu hình vận hành"} description="Lưu bản nháp thành phiên bản mới, sau đó chọn kích hoạt. Có thể áp dụng lại phiên bản cũ."/><ResourceState {...result} retry={result.reload}/><ErrorNotice error={error}/>{notice && <p className="account-notice [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px]" role="status">{notice}</p>}
    {result.data && <Panel title="Các phiên bản"><div className={accountStyles.card}><p>Đang áp dụng: <code className="account-id [overflow-wrap:anywhere] [font-size:12px]">{result.data.active_version || "Chưa có"}</code></p>{!calendar && <p className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Quyền nạp dữ liệu theo lịch từ môi trường: {result.data.runtime_gates.scheduled_provider_enabled ? "Đã bật" : "Chưa bật"}. Thay policy không tự bật quyền này.</p>}<DataTable items={result.data.items.map(v => ({ ...v }))} columns={[{ key: "id", label: "Phiên bản", render: v => <code title={String(v)}>{String(v).slice(0, 12)}…</code> }, { key: "created_at", label: "Tạo lúc", render: v => stamp(Number(v)) }]} action={row => <div className={accountStyles.actions}><button className={accountStyles.buttonSecondary} disabled={busy} onClick={() => edit(row as unknown as ConfigVersion)}>Xem / dùng làm bản nháp</button><button className={accountStyles.buttonSecondary} disabled={busy || row.id === result.data!.active_version} onClick={() => { setReason(""); setActivation({ version: row as unknown as ConfigVersion, expected: result.data!.active_version }); }}>Áp dụng</button></div>}/><div className={accountStyles.actions}><button className={accountStyles.buttonSecondary} disabled={cursors.length === 1 || result.loading} onClick={() => setCursors(v => v.slice(0, -1))}>Trang trước</button><button className={accountStyles.buttonSecondary} disabled={!result.data.next_cursor || result.loading} onClick={() => setCursors(v => [...v, result.data!.next_cursor!])}>Trang sau</button></div></div></Panel>}
    {activation && <section className="panel account-card [padding:24px] min-w-0 [&_>_p]:[line-height:1.7] [&_>_p]:[margin:12px_0] [&_h1]:[font-size:clamp(24px,4vw,36px)] [&_h1]:[margin:14px_0] [&_h2]:[font-size:19px] [&_h2]:[margin:10px_0] [&_h3]:[font-size:16px] [&_pre]:[white-space:pre-wrap] [&_pre]:[overflow-wrap:anywhere] [&_pre]:[max-height:400px] [&_pre]:overflow-auto [&_pre]:[font-size:11px] max-[640px]:[padding:18px] [background:var(--surface)] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] overflow-hidden"><h2>Xác nhận áp dụng phiên bản</h2><p>Phiên bản {activation.version.id.slice(0, 12)}…</p><details><summary>Nội dung sẽ áp dụng</summary><pre>{JSON.stringify(activation.version.payload, null, 2)}</pre></details><Reason value={reason} onChange={setReason}/><div className={accountStyles.actions}><button className={accountStyles.buttonSecondary} disabled={busy} onClick={() => setActivation(null)}>Quay lại</button><button className={accountStyles.buttonPrimary} disabled={busy || reason.trim().length < 10} onClick={() => void activate()}>Xác nhận áp dụng</button></div></section>}
    <Panel title="Bản nháp mới"><div className={accountStyles.card}>{sourceId && <p className="muted account-id [overflow-wrap:anywhere] [font-size:12px] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">Dựa trên {sourceId}</p>}{calendar && <p className="account-notice [padding:16px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-left-width:3px] [border-left-style:solid] [border-left-color:var(--accent)] [border-radius:4px] [line-height:1.7] [margin:16px_0] [overflow-wrap:anywhere] [&_small]:block [&_small]:[font-size:11px]">Nhập lịch đã được đối chiếu với thông báo sàn; hệ thống không tự suy đoán ngày nghỉ hoặc phiên giao dịch.</p>}<form className="account-form grid [gap:18px] [margin:22px_0] [&_fieldset]:[border-width:0] [&_fieldset]:[padding:0] [&_fieldset]:[margin:0] [&_fieldset]:grid [&_fieldset]:[gap:18px] [&_fieldset]:min-w-0" onSubmit={e => {
            e.preventDefault();
            setError(null);
            setNotice("");
            try {
                setReview(calendar ? validateCalendar(JSON.parse(json)) : { ...draft });
            }
            catch (err) {
                setError(err as Error);
            }
        }}><fieldset disabled={busy || !!review}>
      {calendar ? <><Field label="Dữ liệu lịch giao dịch (JSON)"><textarea className="account-json [.account-field_&]:[min-height:280px] [.account-field_&]:[font-family:var(--font-mono),monospace] [.account-field_&]:[font-size:12px]" required value={json} placeholder={'{"start":"YYYY-MM-DD","end":"YYYY-MM-DD","sessions":[],"source_urls":[],"review_note":"","provenance":"EXCHANGE_REFERENCE"}'} onChange={e => setJson(e.target.value)}/></Field><Field label="Hoặc nhập từ file JSON"><input type="file" accept=".json,application/json" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file)
                    return;
                if (file.size > 100000) {
                    setError(new Error("File quá lớn; tối đa 100 KB."));
                    return;
                }
                try {
                    setJson(await file.text());
                }
                catch {
                    setError(new Error("Không đọc được file."));
                }
            }}/></Field></> : <div className="account-form-grid grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))] [gap:18px] [margin:15px_0]">{operationFields.map(key => <label className="account-check flex [gap:10px] items-center [font-size:12px] [min-height:44px] [&_input]:[accent-color:var(--accent)] [&_input]:[width:18px] [&_input]:[height:18px]" key={key}><input type="checkbox" checked={!!draft[key]} onChange={e => setDraft(v => ({ ...v, [key]: e.target.checked }))}/>{labels[key]}</label>)}{numeric.map(([key, min, max, fallback]) => <Field key={key} label={labels[key]}><input type="number" required min={min} max={max} step={1} value={Number(draft[key] ?? fallback)} onChange={e => setDraft(v => ({ ...v, [key]: Number(e.target.value) }))}/></Field>)}</div>}
      <button className={accountStyles.buttonPrimary} disabled={!result.data}>Xem lại bản nháp</button></fieldset></form>
      {review && <Confirm title="Lưu phiên bản cấu hình mới?" busy={busy} onCancel={() => setReview(null)} onConfirm={() => void create()}><pre>{JSON.stringify(review, null, 2)}</pre><p>Thao tác này chỉ lưu phiên bản, chưa thay đổi cấu hình đang áp dụng.</p></Confirm>}
    </div></Panel>
  </>;
}

export type Role = "user" | "admin";
export type Profile = { id: string; role: Role; username?: string; display_name?: string | null; email?: string | null; date_of_birth?: string | null; age?: number | null; phone_number?: string | null; profile_required?: boolean; is_demo?: boolean };
export type Page<T> = { items: T[]; next_cursor: string | null };
export type Plan = { id: string; name: string; price_vnd: number; duration_days: number; analysis_quota: number; active_limit: number; available: boolean; currency: string; features: Record<string, boolean>; daily_request_limit?: number; replaces_plan_id?: string | null; quota_period?: "DAY" };
export type Order = { id: string; plan_id: string; amount_vnd: number; reference: string; status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED"; created_at: number; expires_at: number; paid_at: number | null; bank: string; account_number: string; account_name: string; transfer_content: string; qr_url: string | null; server_now?: number; plan?: Plan; subscription?: Subscription | null; payment_resolution?: "UNPAID" | "RECONCILIATION" | "PAID"; payment_summary?: { id: string; status: string; reason: string | null; amount_vnd: number }[]; expected_valid_from?: number; expected_valid_until?: number };
export type Entitlement = { active: boolean; remaining: number; active_limit: number; active_jobs?: number; valid_until: number | null; plan?: Plan | null; daily_limit?: number; created_today?: number; daily_reset_at?: number | null; next_subscription?: Subscription | null };
export type Bucket = { id: string; total: number; reserved: number; consumed: number; active_jobs: number; active_limit: number; valid_from: number; valid_until: number; created?: number; quota_period?: "DAY" | "LEGACY" };
export type Subscription = { id: string; plan_id: string; order_id: string | null; valid_from: number; valid_until: number; account_id?: string; bucket_id: string; plan?: Plan };
export type Integration = { provider: "sepay" | "vnstock"; revision: number; source: string; encryption_ready: boolean; updated_at: number | null; api_key_configured?: boolean; scheduled_provider_enabled?: boolean; bank_code?: string; account_number?: string; account_name?: string; transfer_prefix?: string; requires_transfer_prefix?: boolean; payments_enabled?: boolean; webhook_api_key_configured?: boolean; configuration_complete?: boolean; missing_fields?: string[]; pending_orders?: number; reconciliation_count?: number; last_payment_received_at?: number | null };
export type ConfigVersion = { id: string; kind: string; payload: Record<string, unknown>; created_at: number };
export type ConfigPage = Page<ConfigVersion> & { active_version: string | null; runtime_gates: { scheduled_provider_enabled?: boolean } };
export const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
export const stamp = (value: number | string | null | undefined) => value == null ? "—" : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(typeof value === "number" ? value * 1000 : value));

export function paymentStatus(value: unknown): string {
  return ({ APPLIED: "Đã xác nhận", RECONCILIATION: "Cần đối soát" } as Record<string, string>)[String(value)] || "Đang xử lý";
}
export function paymentReason(value: unknown): string {
  if (!value) return "—";
  return ({ AMOUNT_MISMATCH: "Số tiền không khớp đơn", WRONG_BANK_ACCOUNT: "Tài khoản nhận tiền không khớp", OUTBOUND_TRANSFER: "Giao dịch chuyển tiền đi", REFERENCE_MISSING_OR_AMBIGUOUS: "Thiếu hoặc không xác định được mã đơn", ORDER_NOT_FOUND: "Không tìm thấy đơn", ORDER_CLOSED_OR_LATE: "Giao dịch đến sau hạn hoặc đơn đã đóng", ORDER_CANCELLED: "Đơn đã hủy", ORDER_ALREADY_PAID: "Đơn đã được thanh toán", ACCOUNT_DISABLED: "Tài khoản đang bị khóa", FUTURE_TRANSACTION: "Thời gian giao dịch cần kiểm tra" } as Record<string, string>)[String(value)] || "Giao dịch cần kiểm tra thêm";
}

export const dailyLimit = (plan: Plan) => plan.daily_request_limit ?? plan.analysis_quota;

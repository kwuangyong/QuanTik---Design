"use client";
import type { Role } from "./contracts";
import { analysisMessages } from "./analysis";
const messages: Record<string, string> = {
  ...analysisMessages,
  BACKFILL_SESSION_NOT_COMPLETED: "Phiên này chưa kết thúc hoặc không thuộc lịch giao dịch.",
  BACKFILL_OPERATIONS_DISABLED: "Cần bật vận hành, nạp dữ liệu, screening và kết nối nguồn dữ liệu trước khi chạy bù.",
  BACKFILL_ALREADY_PENDING: "Một phiên khác đang được chạy bù. Chờ tác vụ đó kết thúc trước.",
  BACKFILL_REASON_REQUIRED: "Nhập lý do chạy bù ít nhất 10 ký tự.",
  CALENDAR_NOT_READY: "Chưa cấu hình lịch giao dịch.",
  CALENDAR_OUT_OF_RANGE: "Lịch giao dịch chưa bao phủ ngày hiện tại. Cần cập nhật lịch trước.",
  UNAUTHENTICATED: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", LOGIN_RATE_LIMITED: "Đăng nhập đang tạm khóa do vượt số lần thử. Vui lòng chờ hết thời gian khóa.",
  INVALID_ADMIN_CREDENTIALS: "Tên đăng nhập hoặc mật khẩu không đúng.", RATE_LIMITED: "Bạn đang thao tác quá nhanh. Vui lòng chờ rồi thử lại.",
  BACKEND_UNAVAILABLE: "Chưa kết nối được máy chủ. Vui lòng thử lại.", GOOGLE_NOT_CONFIGURED: "Đăng nhập Google chưa được cấu hình.",
  INVALID_ORIGIN: "Địa chỉ ứng dụng chưa khớp cấu hình kết nối.", PAYMENTS_DISABLED: "Thanh toán hiện đang tạm đóng.",
  PAYMENT_CONFIGURATION_MISSING: "Thông tin nhận thanh toán chưa đầy đủ.", PLAN_UNAVAILABLE: "Gói này hiện chưa được mở bán.",
  PENDING_ORDER_LIMIT: "Bạn đang có nhiều đơn chờ thanh toán. Hãy mở lại đơn hiện có.", PAID_ORDER_CANNOT_CANCEL: "Đơn đã thanh toán nên không thể hủy.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu trùng mã nhưng khác nội dung. Hãy kiểm tra lại.", INTEGRATION_REVISION_CONFLICT: "Cấu hình vừa được người khác thay đổi. Tải lại trước khi sửa tiếp.",
  CONFIG_ACTIVATION_CONFLICT: "Phiên bản đang áp dụng đã thay đổi. Tải lại và kiểm tra trước khi kích hoạt.",
  INVALID_CONFIG: "Cấu hình không đúng yêu cầu. Kiểm tra dữ liệu và nguồn tham chiếu.", INVALID_REQUEST: "Thông tin gửi lên chưa hợp lệ.",
  DAILY_REQUEST_LIMIT: "Bạn đã dùng hết hạn mức yêu cầu hôm nay. Hạn mức đặt lại lúc 00:00 giờ Việt Nam.",
  QUOTA_OR_JOB_LIMIT: "Đã chạm hạn mức yêu cầu trong ngày hoặc giới hạn xử lý đồng thời.", ACTIVE_JOB_LIMIT: "Các yêu cầu trước đang được xử lý. Vui lòng chờ hoàn thành.", NO_ENTITLEMENT: "Bạn chưa có gói đang hiệu lực.", PROFILE_REQUIRED: "Bổ sung hồ sơ tài khoản trước khi gửi yêu cầu.", SIGNUP_PLAN_MANAGED: "Gói miễn phí được cấp tự động khi đăng ký.",
  WEBHOOK_KEY_IN_USE: "Chưa thể xóa khóa khi còn đơn chờ hoặc giao dịch cần đối soát.", PAYMENT_REVIEW_REQUIRED: "Đơn đã có giao dịch cần xử lý. Không tạo thanh toán mới cho cùng lần mua.",
  PLAN_REPLACEMENT_CONFIRMATION_REQUIRED: "Cần xác nhận thay thế phiên bản gói đang bán.", PLAN_REPLACEMENT_CONFLICT: "Đã có phiên bản khác thay thế gói cũ. Tải lại danh mục để kiểm tra.",
  INVALID_CURSOR: "Trang dữ liệu đã không còn hợp lệ. Vui lòng quay lại đầu danh sách.", REQUEST_FAILED: "Không thể hoàn tất yêu cầu. Vui lòng thử lại hoặc cung cấp mã hỗ trợ.",
  NOT_FOUND: "Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.", PAYMENT_DOES_NOT_MATCH: "Giao dịch không khớp với đơn đã chọn.", DEMO_ORDER_NOT_ALLOWED: "Tài khoản demo không tạo đơn thanh toán thật.",
  SCREENING_SUBSCRIPTION_REQUIRED: "Bạn cần gói phân tích còn hiệu lực để xem kết quả quét.",
  SCREENING_NOT_READY: "Chưa có kết quả quét được công bố cho ca này.",
  SCREENING_LIVE_DATA_REQUIRED: "Kết quả chưa đủ điều kiện dữ liệu để công bố.",
  SCREENING_RUN_NOT_READY: "Kỳ quét này chưa hoàn tất. Vui lòng cập nhật kết quả.",
};
export class ApiError extends Error {
  payload?: Record<string, unknown>;
  constructor(public status: number, public code: string, public requestId?: string, details?: { location: (string | number)[]; type: string }[], public retryAfter?: number) {
    const fields: Record<string, string> = { name: "Tên gói", daily_request_limit: "Giới hạn yêu cầu/ngày", analysis_quota: "Giới hạn yêu cầu/ngày", duration_days: "Thời hạn", price_vnd: "Giá", active_limit: "Số yêu cầu đồng thời", account_number: "Số tài khoản", account_name: "Tên chủ tài khoản", bank_code: "Ngân hàng", reason: "Lý do", api_key: "Khóa dịch vụ", webhook_api_key: "Khóa webhook" };
    const labels = [...new Set((details || []).map(d => fields[String(d.location?.at(-1))]).filter(Boolean))];
    super(labels.length ? "Thông tin chưa hợp lệ: " + labels.join(", ") + "." : messages[code] || "Không thể hoàn tất thao tác. Vui lòng kiểm tra thông tin và thử lại.");
  }
}
export async function raw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try { response = await fetch(`/api/v1/${path}`, { ...init, headers, credentials: "same-origin", cache: "no-store", signal: init.signal || AbortSignal.timeout(20000) }); }
  catch { throw new ApiError(0, "BACKEND_UNAVAILABLE"); }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const delay = Number(response.headers.get("retry-after"));
    const retryAfter = Number.isFinite(delay) && delay > 0 && delay <= 86400 ? Math.ceil(delay) : undefined;
    const error = new ApiError(response.status, data.code || (response.status === 429 ? "RATE_LIMITED" : "REQUEST_FAILED"), data.request_id || response.headers.get("x-request-id"), data.details, retryAfter);
    error.payload = data;
    throw error;
  }
  return data as T;
}
type Token = { access_token: string; expires_in: number };
const tokens: Partial<Record<Role, { value: string; until: number }>> = {};
const generations: Record<Role, number> = { user: 0, admin: 0 };
const refreshing: Partial<Record<Role, { generation: number; promise: Promise<string> }>> = {};
const listeners = new Set<(role: Role) => void>();
export function onExpired(listener: (role: Role) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function forget(role: Role) { generations[role]++; delete tokens[role]; listeners.forEach(fn => fn(role)); }
function store(role: Role, token: Token) { tokens[role] = { value: token.access_token, until: Date.now() + token.expires_in * 1000 - 20000 }; }
export function accept(role: Role, token: Token) { generations[role]++; store(role, token); }
export function authPath(role: Role) { return role === "admin" ? "admin/auth" : "auth"; }
export async function refresh(role: Role): Promise<string> {
  const active = refreshing[role];
  if (active) {
    if (active.generation === generations[role]) return active.promise;
    return active.promise.catch(() => undefined).then(() => refresh(role));
  }
  const generation = generations[role];
  const work = async () => {
    try {
      const result = await raw<Token>(`${authPath(role)}/refresh`, { method: "POST" });
      if (generation !== generations[role]) throw new ApiError(401, "UNAUTHENTICATED");
      store(role, result); return result.access_token;
    } catch (error) {
      if (generation === generations[role] && error instanceof ApiError && (error.status === 401 || error.status === 403)) forget(role);
      throw error;
    }
  };
  // Serialize refresh rotation across same-origin tabs; tokens remain in memory only.
  const run = async (): Promise<string> => {
    if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request(`quantik-refresh-${role}`, work);
    return await work();
  };
  const promise = run().finally(() => { if (refreshing[role]?.promise === promise) delete refreshing[role]; });
  refreshing[role] = { generation, promise };
  return promise;
}
export async function api<T>(role: Role, path: string, init: RequestInit = {}): Promise<T> {
  const token = tokens[role];
  const access = token && token.until > Date.now() ? token.value : await refresh(role);
  const send = (value: string) => raw<T>(path, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${value}` } });
  try { return await send(access); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const next = await refresh(role);
    try { return await send(next); } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) forget(role);
      throw retryError;
    }
  }
}
export function mutation(method: "POST" | "PATCH", body?: unknown, key?: string): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body), headers: key ? { "Idempotency-Key": key } : undefined };
}

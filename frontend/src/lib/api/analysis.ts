export type AnalysisJob = {
  id: string; symbol: string; target_session: string; created_at: number; deadline: number; attempt: number;
  status: "QUEUED" | "WAITING_DATA" | "RUNNING" | "RETRY_WAIT" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  reason: string | null; quota_effect: string; report_id: string | null;
};
export type AnalysisOptions = { sessions: string[]; selected_session: string | null; symbols: string[]; ready: boolean; reason: string | null };
export type ReportSection = { status: "AVAILABLE" | "UNAVAILABLE" | "DISABLED"; reason_codes: string[]; metrics: Record<string, unknown>; units: Record<string, string> };
// Optional, report-bound inputs for display scoring; never used by trade/action gates.
export type RadarScoringInputs = {
  schema_version: 1; as_of: string;
  module_scores?: { id: string; score: number | null; method: string }[];
  liquidity_universe?: { universe_id: string; members: { symbol: string; adv20_value_vnd: number; amihud20: number }[] };
};
export type QuantResearch = {
  schema_version: 1; symbol: string; units: { price: "VND"; return: "pct" };
  observations?: number; start?: string | null; end?: string | null; horizon_sessions?: number; simulation_count?: number;
  cone: { session: number; p05: number; p25: number; p50: number; p75: number; p95: number }[];
  distribution: { returnPct: number; probabilityPct: number; lowerPct?: number; upperPct?: number; count?: number }[];
  regime: { date: string; price: number; state: string }[];
  drawdown: { date: string; valuePct: number }[];
  factors: { id: string; label: string; value: number; min: number; max: number }[];
  risk_metrics: { id: string; label: string; value: number; unit: string }[];
  radar_scoring?: RadarScoringInputs;
};
export type AnalysisReport = {
  report_id: string; schema_version: "1.0"; job_id: string; symbol: string; target_session?: string | null;
  evaluated_at: string; data_as_of: string; data_observed_at?: string | null;
  input_mode: "COMPLETED_DAILY"; sections: Record<string, ReportSection>;
  decision: Record<string, unknown>; commentary: { summary?: string; detailed?: string }; warnings: string[]; versions: Record<string, unknown>;
  research?: QuantResearch | null;
};
export const jobStatuses: Record<AnalysisJob["status"], string> = {
  QUEUED: "Đã tiếp nhận", WAITING_DATA: "Đang chuẩn bị dữ liệu", RUNNING: "Đang phân tích", RETRY_WAIT: "Đang chờ thử lại",
  SUCCEEDED: "Đã hoàn tất", FAILED: "Không hoàn tất", CANCELLED: "Đã dừng (lịch sử)",
};
export const terminalJob = (status: string) => ["SUCCEEDED", "FAILED", "CANCELLED"].includes(status);
export const analysisMessages: Record<string, string> = {
  INVALID_FORECAST: "Dự báo không đủ điều kiện sử dụng.", UNKNOWN_EXCHANGE: "Chưa xác định được sàn giao dịch.",
  VNI_DATA_MISSING: "Thiếu dữ liệu chỉ số thị trường.", DATA_QUALITY_FAIL: "Dữ liệu không đạt kiểm tra chất lượng.",
  LIQUIDITY_FAIL: "Thanh khoản chưa đạt điều kiện.", VNI_CRISIS: "Thị trường đang ở trạng thái rủi ro cao.",
  TIMING_BLOCKED: "Điều kiện thời điểm đang chặn tín hiệu.", SETTLEMENT_LOCK_RISK: "Có cảnh báo rủi ro trong thời gian chờ thanh toán.",
  NET_FORECAST_TOO_LOW: "Dự báo sau chi phí chưa đạt ngưỡng.", INVALID_TRADE_PLAN: "Kế hoạch vị thế chưa hợp lệ.",
  ZERO_POSITION_SIZE: "Quy mô vị thế tính được bằng không.", TIMING_NOT_READY: "Chưa đủ điều kiện thời điểm vào lệnh.",
  DATA_NOT_READY: "Chưa có bộ dữ liệu hoàn chỉnh cho phiên này.", SYMBOL_DATA_NOT_READY: "Mã này chưa có dữ liệu hợp lệ cho phiên đã chọn.",
  UNIVERSE_NOT_VALIDATED: "Danh sách thị trường chưa hoàn tất kiểm định cho Quant.", QUANT_DATA_NOT_VALIDATED: "Dữ liệu chưa hoàn tất kiểm định cho Quant.",
  LIVE_DATA_NOT_VALIDATED: "Dữ liệu chưa hoàn tất kiểm định cho Quant.", MODEL_NOT_READY: "Mô hình phân tích cho phiên này chưa sẵn sàng.",
  MODEL_EXPIRED_OR_FUTURE: "Chưa có mô hình còn hiệu lực phù hợp với phiên dữ liệu.", SNAPSHOT_NOT_READY: "Đang chuẩn bị dữ liệu phân tích dùng chung.",
  CALENDAR_NOT_READY: "Chưa cấu hình lịch giao dịch.", CALENDAR_OUT_OF_RANGE: "Lịch giao dịch cần được cập nhật.",
  ANALYSIS_SESSION_NOT_COMPLETED: "Chỉ phân tích phiên đã kết thúc và có trong lịch giao dịch.", UNKNOWN_INSTRUMENT: "Mã không thuộc danh sách được hỗ trợ.",
  DEPENDENCY_OPERATIONS_NOT_READY: "Dịch vụ chuẩn bị dữ liệu chưa được cấu hình.", DEPENDENCY_OPERATOR_PAUSED: "Dịch vụ chuẩn bị dữ liệu đang tạm dừng.",
  DAILY_REQUEST_LIMIT: "Bạn đã đạt giới hạn yêu cầu trong ngày.", ACTIVE_JOB_LIMIT: "Bạn đang có đủ số yêu cầu được xử lý đồng thời.",
  NO_ENTITLEMENT: "Cần có gói phân tích còn hiệu lực để gửi yêu cầu.", DEPENDENCY_DEADLINE: "Hết thời gian chờ dữ liệu phân tích.",
  EXECUTION_TIMEOUT: "Phân tích vượt thời gian xử lý cho phép.", ATTEMPTS_EXHAUSTED: "Không hoàn tất sau số lần thử cho phép.",
  ACCOUNT_DISABLED: "Tài khoản đã bị khóa.", SYMBOL_SNAPSHOT_INELIGIBLE: "Mã chưa đủ điều kiện phân tích trong bộ dữ liệu này.",
  COMPONENT_UNAVAILABLE: "Chưa đủ dữ liệu để tính mục này.", MODEL_UNAVAILABLE: "Thành phần mô hình chưa khả dụng.",
};
export const analysisReason = (code?: string | null) => code ? analysisMessages[code] || "Chưa hoàn tất bước xử lý. Mã: " + code : "Hệ thống đang xử lý yêu cầu.";

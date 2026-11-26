import type { SheetValues } from "@/content/screening-sheet";

export type ScreeningSlot = "ALL" | "AM" | "PM";
export type ScreeningGroup = "STRONG" | "ACCUMULATION" | "DISTRIBUTION";
export type ScreeningLatest = { id: string; target_session: string; published_at: number; stale: boolean; refresh_after_seconds: number;
  /** Today's screening view quota; null for demo or unmetered accounts. */
  screening_quota?: { limit: number; used: number; remaining: number } | null };
export type ScreeningScore = { score: number | null; met_count: number; total_count: number; unavailable_count: number };
export type ScreeningItem = SheetValues & {
  // Optional published presentation fields. No new endpoint or computed fallback.
  name?: string | null; company_name?: string | null;
  symbol: string; exchange: string | null; price_vnd: number | null; change_ratio: number | null;
  change_5d_ratio: number | null; change_20d_ratio: number | null;
  volume_shares: number | null; average_volume_20_shares: number | null;
  volume_ratio_20: number | null; price_to_high20_ratio: number | null;
  groups: Record<ScreeningGroup, ScreeningScore>; eligible: boolean;
  status: "ELIGIBLE" | "INSUFFICIENT_DATA" | "LOW_LIQUIDITY";
};
export type ScreeningResults = { run_id: string; group: "OVERALL" | "DISTRIBUTION"; items: ScreeningItem[] };
export type ScreeningDetail = {
  run_id: string; target_session: string; published_at: number; input_mode: string; observed_at: string | null;
  item: ScreeningItem;
  assessment: Record<"overall_signal" | "adjusted_signal" | "money_flow" | "trend" | "strength" | "investor_note" | "broker_note", string | null>;
  market: {
    last_close: number | null; regime_label: string | null; combined_score: number | null; risk_label: string | null;
    change_5d_ratio: number | null; change_20d_ratio: number | null; above_ma20: boolean | null; atr_pct: number | null;
    investor_strategy: string | null; broker_strategy: string | null;
  };
};
export const screeningReason = (code: string | null | undefined) => ({
  TASK_DEADLINE: "Ca quét đã quá hạn xử lý", SCREENING_DEADLINE: "Ca quét đã quá hạn công bố", MANIFEST_NOT_READY: "Đang chờ dữ liệu thị trường",
  HISTORY_NOT_READY: "Đang chờ lịch sử giá", UNIVERSE_NOT_VALIDATED: "Danh sách mã chưa được kiểm định", LIVE_DATA_NOT_VALIDATED: "Dữ liệu chưa đạt kiểm định",
  SCREENING_COVERAGE_NOT_READY: "Độ phủ dữ liệu chưa đạt", SCREENING_ZERO_ELIGIBLE: "Chưa có mã đủ điều kiện xếp hạng", PM_DATA_NOT_COMPLETED: "Đang chờ dữ liệu cuối ngày",
  LATEST_RUN_UNAVAILABLE: "Ca mới nhất chưa công bố thành công", EXPECTED_SLOT_UNPUBLISHED: "Chưa có kết quả cho ca dự kiến gần nhất",
  CALENDAR_OUT_OF_RANGE: "Lịch giao dịch cần cập nhật", PUBLICATION_AGE: "Bản công bố đã cũ", INSUFFICIENT_HISTORY: "Chưa đủ lịch sử giá",
  CORPORATE_ACTION_ADJUSTMENT_UNVERIFIED: "Điều chỉnh giá do sự kiện doanh nghiệp chưa được xác minh",
  NONFINITE_BARS: "Dữ liệu giá hoặc khối lượng không hợp lệ", INPUT_UNAVAILABLE: "Thiếu dữ liệu đầu vào", INVALID_OR_MISSING_BARS: "Thiếu dữ liệu giá",
  NO_COMPARISON_SESSIONS: "Chưa đủ phiên tăng và giảm để so sánh",
  DISTRIBUTION_COVERAGE_INCOMPLETE: "Chưa đủ chỉ tiêu phân phối", INSUFFICIENT_HISTORY_OR_LIQUIDITY: "Chưa đủ lịch sử hoặc thanh khoản",
} as Record<string, string>)[code || ""] || (code ? `Trạng thái dữ liệu: ${code}` : "Đang chờ dữ liệu hoặc xử lý");

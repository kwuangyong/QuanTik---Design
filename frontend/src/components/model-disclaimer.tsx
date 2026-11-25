import { ShieldAlert } from "lucide-react";

/** Shared, always-visible statement of what a QuanTik output is and is not. */
export const disclaimerText = {
  quant: "Kết quả mô hình định lượng chạy trên dữ liệu lịch sử, chưa được kiểm chứng ngoài mẫu. Đây là thông tin tham khảo, không phải khuyến nghị đầu tư hay lời mời mua bán. Bạn tự chịu trách nhiệm với quyết định giao dịch của mình.",
  screening: "Xếp hạng theo bộ tiêu chí công bố của phiên, chưa được kiểm chứng hiệu quả sinh lời. Không phải khuyến nghị mua hoặc bán; hãy đối chiếu thanh khoản, tin tức và khẩu vị rủi ro của bạn.",
  portfolio: "Mô phỏng rủi ro dựa trên giả định thống kê. Lỗ thực tế có thể vượt VaR/CVaR, đặc biệt khi thị trường chạm biên độ hoặc mất thanh khoản. Không phải tư vấn phân bổ tài sản.",
} as const;

export function ModelDisclaimer({ kind, className = "" }: { kind: keyof typeof disclaimerText; className?: string }) {
  return <p role="note" aria-label="Lưu ý về mô hình" className={`flex items-start [gap:8px] [border:1px_solid_var(--border)] [border-left:3px_solid_var(--accent)] [padding:10px_12px] [font-size:12.5px] [line-height:1.5] [color:var(--muted)] [background:var(--surface)] ${className}`}>
    <ShieldAlert size={15} aria-hidden="true" className="shrink-0 [margin-top:2px] [color:var(--accent)]"/>
    <span>{disclaimerText[kind]}</span>
  </p>;
}

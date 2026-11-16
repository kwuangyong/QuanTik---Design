// Illustrative layout of a QuanTik report. Fixed numbers, clearly labelled; not a model result for any real stock.
const evidence: [string, string, "pass" | "wait" | "fail"][] = [
  ["Chất lượng dữ liệu", "Đủ phiên, không có bước nhảy bất thường", "pass"],
  ["Khả năng mua bán", "Thanh khoản đủ cho quy mô vốn đã nhập", "pass"],
  ["Xu hướng & dòng tiền", "Momentum trung hạn hỗ trợ", "pass"],
  ["Đồng thuận mô hình", "Mới 2/3 nhánh cùng chiều", "wait"],
  ["Rủi ro đuôi", "Biến động trong ngân sách rủi ro", "pass"],
];
const chip = {
  pass: "border-signal/40 bg-signal/10 text-signal",
  wait: "border-caution/40 bg-caution/10 text-caution",
  fail: "border-[#f08088]/40 bg-[#f08088]/10 text-[#f08088]",
};
const chipLabel = { pass: "Đạt", wait: "Chờ", fail: "Không đạt" };

export function SampleReport() {
  return <figure className="m-0 overflow-hidden rounded-xl border border-line-strong bg-panel shadow-[0_30px_120px_#0007]" aria-label="Ví dụ minh họa bố cục báo cáo QuanTik">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 max-sm:px-4">
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap rounded-md bg-panel-raised px-2.5 py-1 font-mono text-sm font-semibold text-ink">MÃ MẪU</span>
        <span className="text-sm text-ink-subtle">Báo cáo kiểm định · horizon 20 phiên</span>
      </div>
      <span className="rounded border border-caution/50 px-2 py-0.5 text-xs text-caution">Số liệu minh họa</span>
    </div>

    <div className="grid gap-px bg-line md:grid-cols-[1.1fr_1fr]">
      <div className="bg-panel p-6 max-sm:p-4">
        <p className="text-sm text-ink-subtle">Kết luận</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <strong className="text-2xl font-semibold text-caution">Chờ xác nhận</strong>
          <span className="font-mono text-xs text-ink-subtle">BUY_SETUP</span>
        </div>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">Xu hướng trung hạn tích cực nhưng đồng thuận chưa đủ. Chỉ cân nhắc khi giá đóng cửa vượt vùng kháng cự kèm khối lượng xác nhận.</p>

        <p className="mt-6 text-sm text-ink-subtle">Vùng giá mô phỏng sau 20 phiên</p>
        <div className="relative mt-8 h-2 rounded-full bg-gradient-to-r from-[#f08088]/70 via-caution/70 to-signal/70" role="img" aria-label="Phân vị 10%: giảm 8%; trung vị: tăng 3%; phân vị 90%: tăng 12%">
          {[["P10", "−8%", "8%"], ["Trung vị", "+3%", "52%"], ["P90", "+12%", "92%"]].map(([label, value, left]) => <span key={label} className="absolute -top-7 -translate-x-1/2 text-center" style={{ left }}>
            <b className="block font-mono text-sm font-medium text-ink">{value}</b>
            <span className="absolute left-1/2 top-7 block h-4 w-0.5 -translate-x-1/2 bg-ink" />
            <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap text-xs text-ink-subtle">{label}</span>
          </span>)}
        </div>
        <dl className="mt-14 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-panel-raised p-3"><dt className="text-ink-subtle">Điểm dừng lỗ</dt><dd className="m-0 mt-1 font-mono text-lg text-ink">−6,5%</dd></div>
          <div className="rounded-lg border border-line bg-panel-raised p-3"><dt className="text-ink-subtle">Tỷ lệ lời/lỗ kỳ vọng</dt><dd className="m-0 mt-1 font-mono text-lg text-ink">1 : 1,8</dd></div>
        </dl>
      </div>

      <div className="bg-panel p-6 max-sm:p-4">
        <p className="text-sm text-ink-subtle">Bằng chứng theo lớp</p>
        <ul className="m-0 mt-3 list-none space-y-2 p-0">
          {evidence.map(([name, note, state]) => <li key={name} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
            <span><b className="block text-sm font-medium text-ink">{name}</b><span className="text-sm text-ink-subtle">{note}</span></span>
            <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${chip[state]}`}>{chipLabel[state]}</span>
          </li>)}
        </ul>
        <p className="mt-5 text-sm text-ink-subtle">Điều kiện kích hoạt</p>
        <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-ink-muted">
          <li>☐ Đóng cửa trên vùng kháng cự</li>
          <li>☐ Khối lượng ≥ 1,3 × trung bình 20 phiên</li>
          <li>☑ Thị trường chung không ở trạng thái giảm</li>
        </ul>
      </div>
    </div>
    <figcaption className="border-t border-line px-6 py-3 text-xs text-ink-subtle max-sm:px-4">Ví dụ minh họa bố cục — không phải kết quả của một cổ phiếu thật và không phải khuyến nghị đầu tư.</figcaption>
  </figure>;
}

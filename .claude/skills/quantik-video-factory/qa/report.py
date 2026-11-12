"""Write qa_report.md (the pass/fail sheet, layout follows qa/qa_report.md) into a video's output folder."""
from __future__ import annotations

import datetime as dt
from pathlib import Path


def _mark(res):
    if res is None:
        return "— (chưa chạy)"
    return "❌ KHÔNG ĐẠT" if res["fail"] else "✅ ĐẠT"


def summary(nums, banned, fmt):
    return (f"  QA  số liệu: {_mark(nums)} ({nums['checked']} số)   cụm cấm: {_mark(banned)}   "
            f"định dạng: {_mark(fmt)}")


def write(out: Path, ep, nums, banned, fmt, status, extra=None):
    lines = [f"# Phiếu QA — {ep['id']}", "",
             f"- Ngày: {dt.datetime.now():%Y-%m-%d %H:%M}",
             f"- Chủ đề × style: `{ep['topic']}` × `{ep['style']}`",
             f"- **Kết luận: {status}**"]
    for k, v in (extra or {}).items():
        lines.append(f"- {k}: {v}")
    lines += ["", "| Hạng mục | Kết quả | Chi tiết |", "| --- | --- | --- |"]
    det = "; ".join(f"`{b['number']}` trong “{b['in']}”" for b in nums["unsourced"]) or f"{nums['checked']} số đều có nguồn"
    lines.append(f"| Số khớp code | {_mark(nums)} | {det} |")
    det = "; ".join(f"“{h['phrase']}” trong “{h['in']}”" for h in banned["hits"]) or f"không dính {banned['checked_phrases']} cụm cấm"
    lines.append(f"| Cụm cấm | {_mark(banned)} | {det} |")
    if fmt is not None:
        det = "; ".join(fmt["issues"]) or ", ".join(f"{k} {v}" for k, v in fmt["facts"].items())
        lines.append(f"| Định dạng / khung chữ | {_mark(fmt)} | {det} |")
    lines += ["", "## Người duyệt kiểm tra bằng mắt trước khi đăng", "",
              "- [ ] Xem hết video có tiếng; giọng đọc đúng số trên màn hình",
              "- [ ] Nhãn “Dữ liệu mô phỏng” hoặc nguồn dữ liệu thật hiển thị rõ",
              "- [ ] Không có câu nào đọc như lời khuyên mua/bán mã cụ thể",
              "- [ ] Caption có câu miễn trừ; giá gói (nếu nhắc) khớp trang /plans hiện tại",
              "- [ ] Nhạc nền có giấy phép (hoặc là pad tự tạo của pipeline)", ""]
    (Path(out) / "qa_report.md").write_text("\n".join(lines), encoding="utf-8")

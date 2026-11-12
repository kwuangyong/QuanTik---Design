# talking-head-script

Cho bạn tự quay: không giọng máy, không nhạc. Pipeline xuất:

- `script.md` — bảng thời điểm · đoạn · lời thoại · gợi ý hình (nhìn camera / cắt B-roll), câu miễn trừ.
- `teleprompter.mp4` — chữ lớn từng đoạn, vạch cam chạy dọc lề theo nhịp đọc (~3,6 âm tiết/giây).
- `broll/` — `formula.png`, `chart.png`, `surface3d.png` tính từ cùng code, để dựng chèn.

**Hợp với:** chủ đề cần sự tin cậy của người thật (HMM, giải thích sản phẩm QuanTik), livestream, video dài hơn.

Đoạn: `hook` → `beats[0..3]` → `takeaway` → `cta`. Gợi ý quay cho từng đoạn nằm trong `CUES` của `template.py`; sửa ở đó nếu đổi cách quay.

**Lưu ý:** đọc đúng số trong kịch bản. Muốn đổi số → đổi seed/dữ liệu và chạy lại pipeline để QA kiểm tra lại.

Mẫu: `sample.mp4` (teleprompter HMM) và `sample-script.md`.

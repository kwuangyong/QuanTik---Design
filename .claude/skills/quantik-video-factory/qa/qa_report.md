# Phiếu QA (mẫu)

Mỗi video có một phiếu `qa_report.md` trong thư mục đầu ra (`social-output/<id>/`), do `qa/report.py` sinh. Video chỉ được đăng khi kết luận **ĐẠT** và người duyệt đã tick hết phần kiểm tra bằng mắt.

| Hạng mục | Script | Đạt khi |
| --- | --- | --- |
| Số khớp code | `check_numbers.py` | Mọi số trong lời đọc, chữ trên màn hình, caption, tiêu đề đều có trong `values.json` (đúng định dạng vi-VN), trong `facts` có nguồn, hoặc trong `allowed_literals` |
| Cụm cấm | `check_banned.py` | Không dính cụm nào trong `brand/compliance.md` (câu miễn trừ được loại trừ) |
| Định dạng | `check_format.py` | 9:16; 12s ≤ thời lượng ≤ `max_seconds`; có âm thanh; không chữ nào tràn khung hay ra ngoài vùng an toàn x 60–940, y 170–1500. Carousel: 1080×1920 / 1080×1350, 3–10 slide |

Số và cụm cấm được kiểm **trước khi render** (sai thì dừng, không tốn thời gian dựng). `--force` chỉ để xem thử, không bao giờ đăng bản đó.

Chạy lại riêng trên một thư mục đầu ra:

```bash
python qa/check_numbers.py social-output/garch-code-reel
python qa/check_banned.py social-output/garch-code-reel
python qa/check_format.py social-output/garch-code-reel
```

## Phần người duyệt

- [ ] Xem hết video có tiếng; giọng đọc đúng số trên màn hình
- [ ] Nhãn “Dữ liệu mô phỏng” hoặc nguồn dữ liệu thật hiển thị rõ
- [ ] Không có câu nào đọc như lời khuyên mua/bán mã cụ thể
- [ ] Caption có câu miễn trừ; giá gói (nếu nhắc) khớp trang /plans hiện tại
- [ ] Nhạc nền có giấy phép (hoặc là pad tự tạo của pipeline)

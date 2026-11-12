# LTCM 1998 — khi mô hình đúng nhưng đòn bẩy sai

Dùng cho `chart-story` / `myth-buster` / `talking-head-script`. Đây là sự kiện lịch sử: mọi số phải đưa vào `facts` của episode kèm `source` (qa/check_numbers.py chỉ cho qua số có trong `facts`). **Đối chiếu lại nguồn trước khi đăng**; nếu không chắc một con số, bỏ nó.

## Tóm tắt

Long-Term Capital Management (thành lập 1994, John Meriwether; có Myron Scholes và Robert Merton — Nobel kinh tế 1997) kinh doanh chênh lệch giá trái phiếu với đòn bẩy rất cao. Sau khi Nga vỡ nợ (8/1998), chênh lệch giãn ra thay vì hội tụ; quỹ mất khoảng 4,6 tỷ USD trong chưa đầy bốn tháng. Fed New York đứng ra điều phối 14 ngân hàng góp khoảng 3,6 tỷ USD để tiếp quản (23/9/1998), tránh bán tháo dây chuyền.

## facts mẫu

```json
{
  "facts": {
    "ltcm_founded": {"value": "1994", "source": "Lowenstein, When Genius Failed (2000)"},
    "ltcm_loss": {"value": "4,6 tỷ USD", "source": "Lowenstein (2000); President's Working Group on Financial Markets, Hedge Funds, Leverage, and the Lessons of LTCM (4/1999)"},
    "ltcm_banks": {"value": "14", "source": "President's Working Group (1999)"},
    "ltcm_bailout": {"value": "3,6 tỷ USD", "source": "President's Working Group (1999)"},
    "ltcm_leverage": {"value": "25", "source": "President's Working Group (1999): tỷ lệ tài sản/vốn khoảng 25 lần đầu 1998"}
  }
}
```

## Bài học quant (nối sang mô hình trong kho)

- **VaR/CVaR:** VaR trên dữ liệu yên ắng đánh giá thấp đuôi; khủng hoảng làm tương quan nhảy về 1 (`var_cvar`).
- **Kelly:** đặt vượt xa mức Kelly với ước lượng lợi thế lạc quan → một cú sốc là đủ xoá sổ (`kelly`).
- **OU:** “spread sẽ quay về” đúng về dài hạn nhưng bạn phải sống sót qua giai đoạn nó giãn thêm (`ou`).

## Không được

- Vẽ “NAV LTCM” bằng đường bịa. Nếu không có chuỗi dữ liệu có nguồn, dùng chart mô hình (ví dụ Kelly 4×) và ghi “minh hoạ bằng mô phỏng”.

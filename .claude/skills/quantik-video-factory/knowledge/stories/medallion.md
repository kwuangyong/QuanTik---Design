# Quỹ Medallion — hiệu suất ngoại lệ và vì sao không sao chép được

Sự kiện lịch sử: số đưa vào `facts` kèm `source`. **Đối chiếu nguồn trước khi đăng.**

## Tóm tắt

Medallion là quỹ nội bộ của Renaissance Technologies (Jim Simons). Theo Gregory Zuckerman, *The Man Who Solved the Market* (2019), giai đoạn 1988–2018 quỹ đạt trung bình khoảng 66%/năm trước phí, khoảng 39%/năm sau phí. Quỹ đóng với nhà đầu tư bên ngoài từ giữa thập niên 2000, chỉ nhân viên góp vốn.

## facts mẫu

```json
{
  "facts": {
    "medallion_gross": {"value": "66%", "source": "Zuckerman, The Man Who Solved the Market (2019)"},
    "medallion_net": {"value": "39%", "source": "Zuckerman (2019)"},
    "medallion_period": {"value": "1988–2018", "source": "Zuckerman (2019)"}
  }
}
```

## Góc kể hợp với QuanTik

- Không phải “một công thức thần kỳ”: rất nhiều tín hiệu nhỏ, vòng quay nhanh, chi phí giao dịch thấp, quy mô giới hạn có chủ ý.
- Nối sang `sharpe` (lợi nhuận trên rủi ro), `kelly` (quy mô vị thế), PSR/DSR trong glossary (tránh ảo tưởng từ backtest).
- Không ngụ ý người xem có thể đạt hiệu suất tương tự bằng QuanTik.

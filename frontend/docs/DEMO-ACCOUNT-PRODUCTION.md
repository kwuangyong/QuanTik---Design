# Tài khoản demo: triển khai frontend

Tài liệu này mô tả phần frontend của tính năng tài khoản demo cho máy
trải nghiệm ở booth triển lãm. Phần backend (API, migration, bypass
giới hạn, triển khai) xem `deploy/production/DEMO-ACCOUNT.md` trong repo
`quantik-server`.

Bản triển khai trên VPS: release `20261028-demo-01`, frontend image
`882598d6`, trang `/admin/demo` và mục mã demo ở trang đăng nhập đã
kiểm chứng live ngày 2026-10-28.

## Luồng sử dụng

### Quản trị cấp mã

1. Quản trị đăng nhập tại `/admin/login`, mở `/admin/demo`
   (component `frontend/src/components/admin/demo.tsx`, route
   `frontend/src/app/admin/[[...section]]/page.tsx`).
2. Form "Tạo mã demo mới": nhập số ngày hết hạn (để trống là không
   hết hạn cho tới khi thu hồi), bấm "Tạo mã".
3. Mã gốc hiện một lần duy nhất trong khung nổi bật, kèm nút sao chép.
   Sau khi rời trang, mã gốc không thể xem lại; danh sách mã chỉ hiện
   id rút gọn, thời điểm tạo/hết hạn, số lượt dùng và trạng thái thu
   hồi.
4. Nút "Thu hồi" trên từng mã, và nút "Reset tài khoản demo" kèm hộp
   xác nhận (thu hồi phiên demo, xóa job/báo cáo demo).

### Máy booth đăng nhập demo

Có hai cách, cùng dẫn tới một phiên khách demo:

- **Máy booth mới (chưa có phiên admin):** mở `/login`, mở mục "Dùng
  mã demo cho máy trải nghiệm", nhập mã, bấm "Vào tài khoản demo".
- **Máy đang có phiên admin:** mở `/admin/demo`, nhập mã vào form
  "Đăng nhập demo trên máy này". Phiên admin được giữ nguyên vì token
  admin và token khách lưu tách biệt theo role; sau khi đăng nhập
  demo, trình duyệt chuyển tới `/dashboard` với vai trò khách demo.

Hàm đăng nhập demo dùng chung nằm ở
`frontend/src/components/account/session.tsx` (`demoLogin`): gọi
`auth/demo/exchange`, lưu token khách bằng `accept("user", ...)`, tải
lại phiên khách. Profile khách demo có cờ `is_demo: true`
(`frontend/src/lib/api/contracts.ts`, kiểu `Profile`).

## Route proxy

`frontend/src/lib/server/api-proxy.ts` cho phép các route sau đi qua
proxy tới backend (các route khác vẫn bị chặn theo allowlist sẵn có):

- `POST /api/v1/auth/demo/exchange` (vai trò khách).
- `GET /api/v1/admin/demo/codes`, `POST /api/v1/admin/demo/codes`,
  `POST /api/v1/admin/demo/codes/{id}/revoke`,
  `POST /api/v1/admin/demo/reset` (vai trò quản trị).

Lưu ý: gọi API quản trị từ ngoài trình duyệt mà thiếu header `Origin`
đúng (`https://quantik.io.vn`) sẽ bị proxy trả 403, không phải do sai
mật khẩu. Đây là hành vi có chủ đích của proxy, không phải lỗi đăng
nhập.

## Thông báo lỗi

- `DEMO_ORDER_NOT_ALLOWED`: "Tài khoản demo không tạo đơn thanh toán
  thật." Đây là chặn có chủ đích ở backend, hiển thị khi tài khoản
  demo cố tạo đơn.
- Mã demo sai, đã thu hồi hoặc đã hết hạn: đăng nhập demo trả 401 và
  hiển thị thông báo lỗi chung của form; quản trị kiểm tra trạng thái
  mã tại `/admin/demo` và tạo mã mới.
- Tạo mã trả 500: lỗi phía server, xem log API
  (`docker logs quantik-api-1`) và tài liệu backend; hai lỗi đã biết
  (revision schema, tràn số nguyên Postgres) đều đã sửa ở backend.

## Kiểm chứng đã thực hiện (2026-10-28)

- `npm run typecheck` sạch, `npm run build` thành công trước khi
  merge PR frontend #2.
- Trên VPS sau deploy: `/admin/demo` trả 200, đổi mã demo sai trả
  401, gọi API demo không có quyền trả 401.
- Test end-to-end bằng tài khoản quản trị: tạo mã 200, danh sách mã
  không lộ mã gốc, đổi mã lấy phiên demo 200, profile demo có
  `is_demo = true`. Mã test đã thu hồi và tài khoản demo đã reset
  sau khi test.

## Lưu ý vận hành

- Deploy frontend chỉ recreate container `web`, không chạm backend
  hay database. Trang demo sẽ trả lỗi cho tới khi backend có endpoint
  demo tương ứng, nên deploy backend trước hoặc cùng lúc khi đưa tính
  năng mới lên.
- Không ghi mã demo, mật khẩu quản trị hay token vào tài liệu, ảnh
  chụp màn hình demo, hay log. Mã demo chỉ đưa trực tiếp cho máy
  booth và thu hồi khi hết đợt triển lãm.

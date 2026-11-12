# Tài sản thương hiệu

- `logo.jpg` — logo QuanTik (bản sao của `frontend/public/quantik-logo.jpg`).
- `fonts/` — thả font vào đây để pipeline dùng thay font hệ thống:
  - `IBMPlexMono-Regular.ttf`, `IBMPlexMono-Bold.ttf` (font thương hiệu, OFL)
  - `BeVietnamPro-Regular.ttf`, `BeVietnamPro-Bold.ttf`, `BeVietnamPro-ExtraBold.ttf` (tuỳ chọn, OFL)
- `music/` — nhạc nền **có giấy phép** (mp3/wav/m4a). Pipeline lấy file đầu tiên theo tên. Ghi nguồn và loại giấy phép vào `music/LICENSES.md` cho từng file. Không có file nào thì pipeline tự tổng hợp một đoạn pad nhẹ (sóng sin, tự tạo, không vướng bản quyền).

Không đưa nhạc thịnh hành trên TikTok vào đây: chúng chỉ được dùng qua thư viện âm thanh trong app, không được ghép sẵn vào file.

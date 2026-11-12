---
name: quantik-video-factory
description: Dựng video ngắn và carousel cho mạng xã hội của QuanTik (TikTok, Reels, YouTube Shorts, Facebook) giải thích công thức, mô hình và thuật ngữ quant finance — code Python chạy thật, chart, 3D xoay, phụ đề, giọng đọc tiếng Việt, kèm caption từng nền tảng và phiếu QA. Có 8 style (code-reel, kinetic-text, chart-story, myth-buster, whiteboard-math, talking-head-script, carousel, meme-quant), 8 mô hình chạy code thật (GARCH, Hurst, OU, HMM, Monte Carlo, Sharpe, VaR/CVaR, Kelly) và catalog gần 200 chủ đề lấy từ chính QuanTik: mọi thuật ngữ glossary, chỉ số 16 module báo cáo Quant, trường hành động, cột sheet quét sàn và 27 engine trong quant.py (ARIMA, EGARCH, LightGBM, meta-label, agreement, residual reversion…). Dùng skill này bất cứ khi nào người dùng muốn làm nội dung social media, video, reel, short, TikTok, carousel, kịch bản quay, caption, hook, lịch đăng hoặc nội dung quảng bá cho QuanTik — kể cả khi chỉ nói "làm video về GARCH", "giải thích Sharpe cho TikTok", "viết kịch bản về VaR", "làm loạt bài về Kelly" hay "quảng bá gói Pro" mà không nhắc tới skill.
---

# QuanTik Video Factory

Biến một chủ đề quant thành video dọc 9:16 (hoặc carousel) đúng thương hiệu QuanTik. Nguyên tắc cốt lõi: **mọi con số người xem nghe hoặc thấy đều do code trong video tính ra.** Lời thoại dùng placeholder `{key}`; pipeline chạy mô hình, điền số, rồi QA chặn mọi số không có nguồn. Đó là thứ phân biệt QuanTik với nội dung tài chính "nói cho hay".

Đường dẫn trong file này tính từ thư mục skill: `.claude/skills/quantik-video-factory/`.

```
SKILL.md                 ← bạn đang đọc: điều phối
brand/                   identity.md (màu, chữ, giọng văn, thông tin sản phẩm) · compliance.md (cụm cấm, miễn trừ)
                         pronunciation.json (cách TTS đọc thuật ngữ) · assets/ (logo, font, nhạc có giấy phép)
knowledge/models/*.md    8 mô hình viết tay: công thức, tham số đẹp, ngưỡng, ví dụ HOSE, sai lầm hay gặp, video_defaults
knowledge/catalog.json   ~200 chủ đề sinh tự động từ QuanTik (định nghĩa, công thức, ngưỡng đọc, code engine trích)
knowledge/CATALOG.md     bảng tra id → tên, nhóm, engine, mô hình demo
knowledge/episodes.csv   tập đã dựng/đăng → tránh trùng, nối mạch, ghi view
knowledge/hooks.md       kho hook (đã kiểm chứng bằng view thật / ứng viên)
knowledge/stories/       chuyện lịch sử có nguồn (LTCM, Medallion)
styles/<style>/          spec.md (cấu trúc cảnh) + template.py (dựng cảnh) + mẫu
pipeline/                models.py (code mô hình) · batch.py (lệnh chính) · render/voiceover/assemble
qa/                      check_numbers · check_banned · check_format · qa_report.md (mẫu phiếu)
episodes/                episode JSON đã viết (ghi đè mặc định của mô hình)
```

## Quy trình

### 1. Chốt yêu cầu

Xác định từ lời người dùng (hỏi lại chỉ khi thật sự mơ hồ):

- **Chủ đề → topic.** Có hai tầng:
  - **Viết tay (sâu nhất):** `garch`, `hurst`, `ou`, `hmm`, `monte_carlo`, `sharpe`, `var_cvar`, `kelly`. Code mô hình chạy thật trong video, mọi số đến từ lần chạy đó.
  - **Catalog (rộng nhất):** mọi id trong `knowledge/CATALOG.md`, gồm thuật ngữ (`sortino`, `calmar`, `cmf`, `psr`…), chỉ số module (`module_egarch_gamma`, `module_adf_p`, `module_lightgbm`…), trường hành động (`action_kelly_half`…), cột sheet (`sheet-…`), mô hình trang Home (`home_…`) và engine (`engine_garch`, `engine_meta_label`, `engine_cross_sectional_light_gbm`…). Tìm: `python pipeline/catalog.py --list | grep -i <từ khoá>`; xem chi tiết: `--show <id>`.
  - Người dùng nói tên thường ("EGARCH", "meta-label", "độ phủ mô hình") thì tra catalog để ra id. Chủ đề trùng một mô hình viết tay thì ưu tiên bản viết tay.
- **Style.** Người dùng không chọn thì gợi ý theo bảng:

| Style | Khi nào | Độ dài |
| --- | --- | --- |
| `code-reel` | mặc định cho người thích kỹ thuật; chứng minh số từ code | 35–55s |
| `kinetic-text` | lướt nhanh, một con số "đắt" | 30–45s |
| `chart-story` | chuỗi thời gian có diễn biến, kể theo chương | 35–55s |
| `myth-buster` | có một hiểu lầm phổ biến để bác bằng số | 35–50s |
| `whiteboard-math` | người xem muốn hiểu từng ký hiệu công thức | 45–75s |
| `talking-head-script` | bạn tự quay: kịch bản + teleprompter + B-roll | 45–90s |
| `carousel` | feed Facebook/TikTok photo, đọc chậm, 7 slide | — |
| `meme-quant` | giải trí, kéo người mới, 12–20s | 12–20s |

- **Số lượng.** "Làm loạt", "cả tuần" → nhiều cặp topic × style, chạy một lệnh batch.

Đọc `knowledge/episodes.csv` trước: tránh trùng cặp topic × style đã đăng; nếu là loạt bài, tham chiếu tập trước trong hook hoặc CTA ("Tập trước mình nói về GARCH…").

### 2. Đọc kiến thức và thương hiệu

- `knowledge/models/<topic>.md` — nội dung chuyên môn và `video_defaults` (hook, beats, outputs, myth/fact, meme, story, công thức, symbols, caption, hashtags).
- `brand/identity.md` phần **Giọng văn** và **Sản phẩm**; `brand/compliance.md` toàn bộ. Không đọc được hai file này thì không viết lời.
- `styles/<style>/spec.md` — style dùng trường nào, cảnh nào.

### 3. Viết episode (khi cần khác mặc định)

`video_defaults` đủ để dựng ngay. Viết episode JSON vào `episodes/<id>.json` khi người dùng muốn góc riêng, hook khác, giọng khác, hay ghép chủ đề thời sự. Chỉ cần ghi các trường muốn đổi, cộng `topic`, `style`, `id`:

```json
{"id": "kelly-meme-tap03", "topic": "kelly", "style": "meme-quant",
 "meme": {"format": "nobody-quant", "setup": "...", "punch": "...", "truth": "... {f_star} ..."}}
```

Quy tắc viết lời — mỗi quy tắc đều có lý do:

- **Số chỉ đi qua placeholder** `{key}` hoặc `{key:fmt}` (fmt: `pct0..3`, `num0..3`, `int`, `vnd`, `x1`, `x2`). Xem các key có sẵn: `python pipeline/models.py <topic>`. Gõ tay "biến động 35%" sẽ bị QA chặn, vì giọng nói một số còn chart vẽ số khác là cách nhanh nhất mất uy tín.
- Trong LaTeX (`formula_numeric`) dùng `<<key>>` vì ngoặc nhọn đã thuộc về LaTeX.
- Số không do code tính: số nhỏ dùng như chữ (0–10) tự qua; con số cố định của công thức ("252", "GARCH(1,1)") vào `allowed_literals`; sự kiện lịch sử vào `facts` kèm `source`.
- Mỗi beat một ý, câu ngắn, đọc to được trong 6–10 giây. Beat mô tả đúng thứ đang hiện trên màn hình ("đường cam là…").
- Hook gây tò mò bằng nghịch lý hoặc quan sát có thật, không bằng lời hứa lãi. Tham khảo `knowledge/hooks.md`; ưu tiên hook đã kiểm chứng.
- Kết bằng giới hạn của mô hình hoặc một câu mang về được. Không bao giờ chuyển thành lời khuyên mua/bán.
- CTA quảng bá: chỉ nói tính năng đúng như `identity.md`. Nhắc giá gói thì đối chiếu https://quantik.io.vn/plans trước, vì ưu đãi có thể đã đổi.

### 4. Dựng

Chạy từ thư mục `pipeline/`:

```bash
python batch.py --topics garch --styles code-reel                      # một video
python batch.py --topics garch,kelly --styles myth-buster,meme-quant   # 4 video
python batch.py --episode ../episodes/kelly-meme-tap03.json            # episode tự viết
python batch.py --topics var_cvar --styles code-reel --prices FPT.csv --data-source "FPT, HOSE, 2023–2025"
```

Tuỳ chọn: `--scale 0.5` (bản xem nhanh 540×960, dựng lại `--scale 1` trước khi đăng) · `--voice male` · `--voice-engine edge|gtts|espeak|silent` · `--music <file có giấy phép>|none` · `--no-log` (không ghi episodes.csv, dùng khi thử) · `--force` (dựng dù QA trước render thất bại — chỉ để xem, không đăng).

Mỗi video ra `social-output/<id>/` (thư mục gốc repo): `final.mp4`, `thumbnail.jpg`, `captions.md`, `subtitles.srt`, `qa_report.md`, `values.json` (số + code đã chạy), `layout.json`. Carousel ra `slides/1080x1920/` và `slides/1080x1350/`. Talking-head ra `teleprompter.mp4`, `script.md`, `broll/`. Một video mất khoảng 1–2 phút dựng.

**Dữ liệu thật:** `--prices` nhận CSV có cột `close`. Chỉ dùng để minh hoạ cách tính, nhãn nguồn hiện trên màn hình; vẫn không nói gì về hướng giá của mã đó. Không có `--prices` thì luôn là dữ liệu mô phỏng có seed cố định, và màn hình ghi "Dữ liệu mô phỏng".

**Giọng đọc:** edge-tts (vi-VN-HoaiMyNeural / NamMinhNeural) cần Internet tới `speech.platform.bing.com`. Không vào được thì pipeline lùi về gTTS → espeak-ng → không giọng (phụ đề vẫn đầy đủ, thời lượng ước theo số chữ). Engine thực tế ghi trong `qa_report.md` — phải báo người dùng nếu video không có giọng, kèm cách khắc phục: chạy lệnh trên máy có Internet, hoặc thêm host đó vào allowlist mạng của môi trường.

### 5. Kiểm tra

1. QA tự chạy: số khớp code và cụm cấm **trước** khi render (sai thì dừng), định dạng và khung chữ **sau** render. Đọc `qa_report.md`; KHÔNG ĐẠT thì sửa episode và dựng lại, không lách bằng `--force`.
2. Tự xem: mở `thumbnail.jpg` và trích 5–7 khung hình rải đều video (`ffmpeg -ss <t> -i final.mp4 -frames:v 1 f.png`), xem chữ có đè chart, chart có đọc được trên điện thoại, lời và hình có khớp không. QA máy không bắt được lỗi "nhìn xấu".

### 6. Trả kết quả trong chat

Người dùng muốn **văn bản trong chat để copy đăng ngay**. Với mỗi video:

- Tiêu đề, đường dẫn file (`social-output/<id>/final.mp4`), thời lượng, kết luận QA, engine giọng.
- Caption từng nền tảng lấy từ `captions.md` (TikTok · Facebook/Reels · YouTube Shorts), trong khối copy được, có hashtag và câu miễn trừ.
- Lưu ý còn lại cho người duyệt (giọng thiếu, giá gói cần đối chiếu, nhạc chưa có giấy phép…).

Sau khi đăng, nhắc người dùng ghi view vào `knowledge/episodes.csv` sau 7 ngày (hoặc lấy qua công cụ vidIQ nếu có kết nối) để `hooks.md` dần có hook đã kiểm chứng.

## Chủ đề catalog

Mỗi chủ đề catalog dựng được ngay bằng mọi style, không cần viết gì thêm. `pipeline/term_topic.py` sinh episode từ định nghĩa đã duyệt của QuanTik:

- **Lời thoại:** định nghĩa → cách đọc theo ngưỡng → biến số trong công thức → ví dụ → giới hạn. Câu được rút từ chính định nghĩa, nên mọi số trong đó là sự kiện có nguồn (`facts` trỏ về file và id gốc). QA số vẫn chạy.
- **Code:** đoạn trích thật từ engine tương ứng trong `QuanTik-website/backend/quant_engine/quant.py`, ghi "trích, chỉ đọc". Video không chạy đoạn này, nên không gán số nào cho nó. Đừng viết lời kiểu "code này tính ra…".
- **Chart/3D:** chủ đề thuộc họ một mô hình viết tay (cột *Mô hình demo*, ví dụ `module_egarch_gamma` → garch) thì mô hình đó chạy trên dữ liệu mô phỏng và được ghi rõ là minh hoạ. Nếu không thuộc họ nào: thang ngưỡng đọc vẽ từ định nghĩa; không có ngưỡng thì dùng thẻ công thức hoặc thẻ engine (mục đích + hàm chính).
- **Engine (`engine_*`):** mục đích, số dòng code, hàm công khai, và các chỉ số báo cáo lấy kết quả từ engine đó (đếm từ catalog).

Lời tự sinh mới đạt mức **bản nháp đúng**: chính xác nhưng khô. Trước khi đăng, nên viết episode JSON ghi đè `hook`, `beats`, `takeaway` (giữ nguyên số và ý của định nghĩa) theo giọng văn ở `brand/identity.md`. Viết đè thì vẫn phải bám định nghĩa catalog; muốn nói số không có trong định nghĩa thì đó là chủ đề cho mô hình viết tay.

Một số tổ hợp bị từ chối có lý do: `chart-story` cần chart, `code-reel` cần code engine. Batch báo rõ lý do rồi chạy tiếp. Hai chủ đề bị QA chặn có chủ đích: `sheet-action` có nhãn hệ thống "BUY_NOW: mua ngay", `take_profit` có "giá mục tiêu". Muốn làm thì viết episode diễn đạt lại ("nhãn hành động", "mức chốt lời"), không dùng `--force`.

`python batch.py --topics all --styles carousel --scale 0.5 --no-log` dựng toàn bộ catalog một style (mất vài giờ, chạy nền).

**Làm mới catalog** khi frontend hoặc engine đổi (catalog đã commit nên skill chạy được cả khi không có hai repo nguồn):

```bash
git clone --depth 1 https://github.com/kwuangyong/QuanTik-website /tmp/QuanTik-website
python pipeline/catalog.py --design <đường dẫn QuanTik---Design> --website /tmp/QuanTik-website
```

Cần Node 22.6+ (đọc file TypeScript trực tiếp). Script ghi `knowledge/catalog.json` và `knowledge/CATALOG.md`, kèm commit nguồn để biết catalog lấy từ phiên bản nào.

## Mở rộng

**Nâng một chủ đề catalog lên viết tay** khi nó quan trọng (đăng nhiều, cần số chạy thật). Ví dụ `sortino`:
1. `pipeline/models.py`: `sortino_demo` (≤ 16 dòng, ≤ 56 ký tự/dòng — đây là code hiện lên màn hình), `compute_sortino` → (values, formats, series), `plot2d_sortino(ax, s, upto)` (cố định ylim theo toàn chuỗi để chart không nhảy khi vẽ dần), `surface_sortino` (bề mặt `X,Y,Z` hoặc `lines`/`line`), thêm vào `TOPICS`.
2. `knowledge/models/sortino.md`: các mục như file có sẵn + khối `## video_defaults` JSON đủ trường. Định nghĩa lấy từ `glossary.json` để thống nhất với web.
3. `python batch.py --topics sortino --styles code-reel,carousel --scale 0.5 --no-log` và xem khung hình.

**Thêm style:** thư mục `styles/<tên>/` với `spec.md` và `template.py` có `KIND` (`video`/`carousel`), `DEFAULTS`, `build(ep, model, ctx) -> list[Scene]`, tuỳ chọn `VOICE`, `MUSIC`, `export()`. Ghép từ `pipeline/scenes.py`; mọi chữ vẽ bằng `frames.text_box` để QA đo được tràn khung.

**Cài đặt:** Python 3.10+, `pip install -r requirements.txt`, ffmpeg. Font thương hiệu IBM Plex Mono: thả vào `brand/assets/fonts/`.

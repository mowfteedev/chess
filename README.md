# Gambit — Hẹn nhau một ván cờ.

**[Mở game](https://mowfteedev.github.io/chess/)** · [Kiến trúc và API](docs/ARCHITECTURE.md)

Game cờ hai người trên hai thiết bị. Tạo phòng, gửi mã/link và cùng chơi; không có đối thủ máy.

## Cách chơi

1. Chọn **Tạo phòng mới**, nhập tên, màu quân và **1, 5 hoặc 10 phút mỗi bên** (mặc định 5 phút).
2. Gửi mã 6 ký tự hoặc link mời. Người thứ hai chọn **Tham gia phòng** hoặc mở link.
3. Đồng hồ bắt đầu khi đủ hai người, không cộng giây. **Giờ vẫn chạy khi mất kết nối.**
4. Máy chủ kiểm luật và lưu nước đi. Đấu lại cần cả hai đồng ý, đổi màu và đặt lại giờ.

Hỗ trợ chạm, kéo thả, bàn phím, phong cấp, nhập thành, bắt qua đường, đầu hàng, PGN, âm thanh và thông báo vào/rời bàn. Phiên khách theo tab; mất phiên có thể mất ghế. Phòng nhận thao tác trong 48 giờ; dữ liệu hết hạn chưa tự xóa.

## Chạy và kiểm tra

Dùng Node.js 22 trở lên; Docker cần chạy cho E2E.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Điền URL, publishable key và region của Supabase vào `.env.local`. Project hiện tại: `gzkwwqofoslzyjikpbie`, Sydney (`ap-southeast-2`), bật Anonymous Sign-ins.

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

E2E dùng Supabase Docker riêng `gambit-chess-test`, tạo cấu hình ignored `.env.test.local`. Build production sau E2E để dùng lại cấu hình cloud.

## Cấu trúc

- `src/App.tsx`: điều phối luồng; `components/layout` và `components/room`: khung trang, màn hình, hộp thoại.
- `src/hooks`: state và vòng đời giao diện; `src/multiplayer`: kết nối, đồng bộ và phục hồi.
- `src/styles`: CSS theo chức năng; `src/index.css` giữ thứ tự import.
- `supabase/functions`: luật dùng chung và Edge Function; `supabase/migrations`: lịch sử schema.
- `test`: kiểm tra luật, giao diện, mạng, đồng hồ và phân quyền.

## Triển khai

Push `main` để GitHub Actions kiểm tra và deploy Pages. Repository variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_FUNCTION_REGION`. Quyền quản trị Supabase không được đưa vào frontend hoặc Git.

Khi thay đổi backend, dùng CLI đã đăng nhập đúng tài khoản:

```bash
npx supabase db push --linked --project-ref YOUR_PROJECT_REF --dry-run --skip-vault
npx supabase db push --linked --project-ref YOUR_PROJECT_REF --skip-vault
npx supabase functions deploy chess-rooms --project-ref YOUR_PROJECT_REF --use-api
```

Không sửa migration đã áp dụng; thêm migration mới. `supabase/config.toml` phục vụ local test; không push toàn bộ cấu hình này lên production. Khi đổi domain, cập nhật CORS của Edge Function.

## Vận hành

Máy cá nhân không cần bật; xóa bản local không xóa bản đã deploy. Giữ repository/Pages và project Supabase. Gói Free có thể tạm dừng project ít hoạt động trong khoảng 7 ngày; Supabase gửi email cảnh báo, và project đã pause có thể khôi phục bằng **Resume project** trong dashboard. Xem [chính sách Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).

Mã phiên bản ở cuối trang có nút kiểm tra cập nhật. Link có phiên bản giúp tránh cache HTML cũ; không tự reload giữa ván. Nếu cần rollback giao diện, revert commit rồi deploy lại, giữ nguyên dữ liệu/migration backend.

Font Manrope được phục vụ tại chỗ; [giấy phép](public/fonts/OFL.txt). Bản bàn giao và báo cáo trước đợt dọn repo được giữ ở tag [`v1.0.0`](https://github.com/mowfteedev/chess/tree/v1.0.0).

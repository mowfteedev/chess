# Gambit

**[Chơi ngay](https://mowfteedev.github.io/gambit/)** — cờ vua hai người, vào bàn bằng mã hoặc link mời.

Chọn 1, 5 hoặc 10 phút mỗi bên. Có âm thanh, thông báo vào/rời bàn và giao diện điện thoại.

## Chạy local

Cần Node.js 22+. Điền cấu hình Supabase vào `.env.local` theo `.env.example` và bật Anonymous Sign-ins.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## Kiểm tra

```bash
npm test
npx playwright install chromium
npm run test:e2e  # Cần Docker; dùng Supabase local riêng
npm run build    # Build production sau E2E
```

## Triển khai

Push `main` để GitHub Actions kiểm tra và deploy GitHub Pages. Khai báo repository variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_FUNCTION_REGION`. Chỉ dùng public key ở frontend.

Giao diện nằm trong `src/`, backend và migration trong `supabase/`, kiểm thử và cấu hình Playwright trong `test/`.

Máy cá nhân không cần bật. Supabase Free có thể [tạm dừng project ít hoạt động](https://supabase.com/docs/guides/platform/free-project-pausing); khôi phục bằng **Resume project** trong dashboard.

Font Manrope: [giấy phép](public/fonts/OFL.txt).

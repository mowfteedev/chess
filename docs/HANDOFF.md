# Gambit — bàn giao bản chốt

Ngày 27/10/2026. Game cờ hai người, GitHub Pages + Supabase.

## Bản online và nơi lưu dữ liệu

- Game: https://mowfteedev.github.io/chess/
- Mã nguồn và lịch sử: https://github.com/mowfteedev/chess
- Supabase project: `gzkwwqofoslzyjikpbie` — Sydney (`ap-southeast-2`).
- GitHub Actions tự kiểm tra rồi triển khai giao diện khi push lên `main`.
- Backend hiện có hai migration và Edge Function `chess-rooms`; lần chốt giao diện này không đổi backend hoặc cấu hình cloud.

Máy cá nhân không cần bật. Xóa bản local không xóa bản đã push/deploy. Giữ repository, cấu hình Pages và project Supabase để tiếp tục phục vụ game. Code có thể clone lại từ GitHub.

## Cấu trúc để bảo trì

| Vùng                                  | Trách nhiệm                                                             |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `src/App.tsx`                         | Nối state, luồng vào/rời phòng, chia sẻ và cập nhật phiên bản           |
| `src/components/layout`               | Header/footer và thông tin phiên bản                                    |
| `src/components/room`                 | Tạo/tham gia, phòng chờ, màn chơi và các hộp thoại                      |
| `src/hooks/useChessGame.ts`           | Trạng thái bàn, thao tác quân, âm thanh và vòng đời trang               |
| `src/hooks/useRoomDialogs.ts`         | Trạng thái hộp thoại và kết quả ván                                     |
| `src/multiplayer/RoomClient.ts`       | Kết nối Supabase, presence, đồng bộ và phản hồi nước đi                 |
| `src/styles`                          | Style theo chức năng; `responsive.css` giữ thứ tự breakpoint dùng chung |
| `supabase/functions/_shared/chess.ts` | Luật và contract dùng chung giữa browser/server                         |
| `supabase/migrations`                 | Lịch sử schema đã áp dụng; thay đổi tiếp theo cần migration mới         |
| `test/e2e`                            | Kiểm tra giao diện, mạng, đồng hồ, âm thanh và quyền                    |

Quân cờ dùng SVG trong `ChessPieceIcon.tsx`; bộ PNG cũ đã bỏ. Giao diện dùng CSS/SVG, không thêm thư viện hiệu ứng hoặc dịch vụ ngoài.

## Nếu cần làm tiếp

1. Clone repo, dùng Node.js 22 trở lên, chạy `npm ci`.
2. Copy `.env.example` sang `.env.local`; điền URL, publishable key và region từ project hiện có.
3. `npm run dev` để phát triển. Docker cần chạy cho `npm run test:e2e`; test dùng stack local riêng.
4. Chạy `npm test`, `npm run test:e2e`, `npm run build` trước khi push.
5. Với thay đổi backend: dry-run migration, áp dụng đúng project rồi deploy Edge Function; không push toàn bộ config local lên production.

Repository variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_FUNCTION_REGION` cấp cấu hình cho build GitHub Pages. Không đưa service role key, mật khẩu hoặc access token vào Git. Khóa publishable là cấu hình công khai của browser; quyền được thực thi ở server/RLS.

## Duy trì với gói Free

Supabase có thể tạm dừng project ít hoạt động trong khoảng 7 ngày. Theo dõi email và trạng thái project; nếu bị pause, vào dashboard để khôi phục. Giao diện Pages có thể vẫn hiện trong khi backend đang tạm dừng. Đây là chính sách dịch vụ, không phụ thuộc việc giữ code trên máy. Xem [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Phòng nhận thao tác trong 48 giờ; dữ liệu hết hạn chưa được tự purge. Phiên khách theo tab, mất phiên có thể mất ghế. Không có bot, tài khoản dài hạn hoặc cam kết sức tải nhiều bàn chưa được đo. Bản bàn giao không thêm cron giữ project thức hay nâng cấp gói.

## Phiên bản và phục hồi

Mã Git hiện ở cuối trang; nút cạnh mã dùng để kiểm tra cập nhật. Khi vừa deploy, dùng link có query phiên bản để tránh HTML cũ. Người chơi tự chọn cập nhật, ván đang chơi không tự bị tải lại.

Nếu bản giao diện có lỗi, revert commit liên quan rồi để GitHub Actions deploy lại. Giữ dữ liệu và migration đã áp dụng; không drop bảng để rollback giao diện. Xem [kiến trúc](ARCHITECTURE.md), [kiểm thử](QA.md).

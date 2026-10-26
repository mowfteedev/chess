# Tự kiểm tra Gambit Rooms — Supabase

Ngày 26/10/2026. Thay đổi dựa trên `cbbbefb7bb1def659c21f02cd6249648ca038d32`; cùng người triển khai và tự kiểm, không phải review độc lập.

## Phạm vi

| Tiêu chí              | Bằng chứng                                                                                                                      | Kết quả |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Chỉ chơi với người    | Sảnh tạo/tham gia; không có UI và module máy                                                                                    | PASS    |
| Hai người đồng bộ     | Hai browser context, PostgreSQL/Auth/Realtime/Edge Runtime cục bộ thật; WebRTC bị chặn trong các context này                    | PASS    |
| Hai ghế và phân quyền | Từ chối người thứ ba; hai người cùng xin ghế cuối chỉ một người được nhận; publishable key không thay thế JWT                   | PASS    |
| Máy chủ giữ luật      | Sai lượt bị từ chối, gửi trùng chỉ áp dụng một lần, PATCH trực tiếp trạng thái bị 403                                           | PASS    |
| Nghiệp vụ             | Cả hai màu, kéo thả, keyboard, PGN, nhập thành, bắt qua đường, phong cấp/hủy, chiếu bí, đầu hàng, đấu lại đồng thuận và đổi màu | PASS    |
| Phục hồi              | Reload hai phía, đọc lại lịch sử từ server, đóng tab, xác nhận rời phòng, retry tạo phòng sau lỗi mạng                          | PASS    |
| Mobile                | 320×740, 390×844, 768×1024; không tràn ngang; nút tiện ích ≥44px; bàn cờ và dialog thao tác được                                | PASS    |
| Cache                 | Manifest chống cache, reload có version, không tự tải lại ván, entry JS bị lỗi có màn khôi phục                                 | PASS    |
| TypeScript/luật cờ    | Frontend + server được kiểm type; `npm test` 5/5                                                                                | PASS    |

Lần chạy cuối với `CI=true` đạt **37/37 ca Playwright** trong 46,5 giây: 30 ca UI/trình duyệt, 1 ca HTTP auth và 6 ca protocol. `npm test` đạt 5/5; TypeScript frontend/server đều qua. CI chạy lại toàn bộ suite trên commit phát hành trước khi deploy: [GitHub Actions](https://github.com/mowfteedev/chess/actions/workflows/deploy.yml).

Đã tái hiện và sửa việc phản hồi hiện diện cũ ghi đè heartbeat mới. Ca gây trễ một HTTP read thật xác minh kết nối và ô đang chọn không bị trả về trạng thái cũ. Ca này cùng reload khách qua 8 lượt kiểm tra lặp; kiểm tra reload chờ chủ phòng nhận heartbeat mới trước khi đi tiếp. Ca retry tạo phòng cũng đã đỏ trước bản vá, xanh sau bản vá.

Môi trường cục bộ: Chromium headless/Linux, stack Docker `gambit-chess-test`, API `127.0.0.1:56321`. Không dùng project production cho bộ E2E hoặc mock transport của các ca chơi cờ. Khóa môi trường test được sinh từ CLI status và nằm trong file ignored.

## Kiểm tra runtime với Supabase thật

Hai browser context riêng tại frontend phát triển đã tạo/tham gia phòng trên Supabase cloud, đồng bộ `e4`, `e5` và ghi nhận 2 nửa nước. GET health sau triển khai trả 200 với protocol 2. Không có lỗi JavaScript trong ca này.

Quét Axe trên 9 trạng thái của cùng lượt chạy không ghi nhận vi phạm tự động: sảnh desktop/mobile, tạo phòng, phòng chờ, tham gia mobile, ván desktop/mobile, dialog màu bàn và biên bản mobile. Ảnh trong `docs/screenshots` được chụp từ lượt này. Đây là bằng chứng kiểm tra tự động, không phải chứng nhận WCAG hoặc thay cho thử trên thiết bị thật.

## Migration và triển khai

Đã kiểm tra project đích chưa có bảng public trước khi tạo đối tượng Gambit. `db push --dry-run` chỉ liệt kê migration `202610260001_gambit_rooms.sql`. Migration đã qua PostgreSQL cục bộ và các ca API/RLS trước khi áp dụng lên Supabase.

Backend được áp dụng bằng CLI có migration history, Edge Function triển khai riêng. Không đưa mật khẩu, access token hay service_role key vào frontend/GitHub repository. Frontend chỉ nhận URL và publishable key qua cấu hình public.

## Giới hạn

Chưa thử screen reader thực, máy cảm ứng thật, Safari/Firefox hoặc hai mạng 4G riêng biệt. Kiến trúc mới dùng HTTPS/WebSocket tới Supabase, không còn yêu cầu TURN/P2P. Phiên ẩn danh thuộc tab; mất phiên có thể mất quyền vào lại. Phòng hết hạn nhận thao tác sau 48 giờ; chưa tự purge dữ liệu. Khả năng phục vụ lâu dài phụ thuộc quota và trạng thái project Supabase.

Không cần migration phá hủy dữ liệu để quay lại giao diện cũ; giữ bảng khi rollback. Xem [ADR](ARCHITECTURE.md).

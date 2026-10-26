# Tự kiểm tra — đồng hồ, âm thanh và phản hồi

Ngày 26/10/2026, thay đổi dựa trên `351317a`. Kiểm tra do cùng nhóm triển khai thực hiện; không phải nghiệm thu độc lập.

## Kết quả

`CI=true npm run test:e2e`: **52/52** trong khoảng một phút trên Chromium/Linux với PostgreSQL/Auth/Realtime/Edge Runtime Docker thật, project cô lập `gambit-chess-test`. `npm test`: **5/5**. TypeScript frontend và Edge đều qua. CI chạy lại trên commit phát hành trước khi deploy: [GitHub Actions](https://github.com/mowfteedev/chess/actions/workflows/deploy.yml).

| Tiêu chí              | Bằng chứng                                                                                                          | Kết quả |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| Preset và bắt đầu giờ | 1/5/10 phút, mặc định 5, chờ ghế không mất giờ, bắt đầu khi ghép ghế                                                | PASS    |
| Đồng hồ server        | Chỉ trừ bên đang đi, reload giữ giờ, claim sớm bị 409, preset lạ bị 400                                             | PASS    |
| Hết giờ và đấu lại    | Chốt timeout, không nhận nước tới muộn; dừng khi kết thúc; đồng thuận reset và đổi màu                              | PASS    |
| Mất kết nối           | Đồng hồ tiếp tục, thành viên đang online vẫn đi đúng lượt; thông báo vào/rời bàn                                    | PASS    |
| Phản hồi ngay         | Giữ POST, quân xuất hiện trước ACK; lỗi đọc nền không xóa pending; POST bị từ chối trả quân lại và có thể thử tiếp  | PASS    |
| Âm thanh              | Gesture mở AudioContext, phát nước/lượt, mute không tạo nốt mới và tắt âm đã lên lịch; autoplay bị chặn không crash | PASS    |
| Quyền và đồng thời    | Người thứ ba, hai join đồng thời, sai lượt, gửi trùng, PATCH trực tiếp và publishable key thiếu JWT                 | PASS    |
| Hồi quy cờ và cache   | Chiếu bí, nhập thành, bắt qua đường, phong cấp/hủy, PGN, keyboard, reload, cập nhật có xác nhận                     | PASS    |
| Responsive            | 320/390/768/1440px; tên dài và đồng hồ không tràn ngang; tiện ích chạm ≥44px                                        | PASS    |

Quét Axe trên 8 trạng thái (sảnh 320px, setup thời gian 320px, phòng chờ, desktop có đồng hồ/toast, game 320px tên dài, game 390px, màu bàn và biên bản mobile): không có vi phạm tự động, không có lỗi JavaScript. Chờ animation dialog kết thúc trước khi quét. Ảnh game desktop/mobile trong `docs/screenshots` phản ánh bản này. Đây không phải chứng nhận WCAG.

## Đo độ trễ

Một ván QA, 10 nửa nước hợp lệ; bỏ 2 nước đầu làm warm-up, lấy 8 mẫu, cùng Chromium/Linux và đường mạng. Đo từ thao tác ô đích tới UI của người đi và đối thủ; bao gồm overhead thao tác Playwright. Trước: frontend GitHub Pages ở `351317a`; sau: preview production cục bộ dùng **Supabase cloud thật**. Khác origin frontend nên không dùng số liệu này để so tốc độ tải trang.

| Chỉ số                   | Trước                  | Sau                                           |
| ------------------------ | ---------------------- | --------------------------------------------- |
| Người đi, p50            | 1.025 ms               | 42 ms                                         |
| Người đi, p95 trên 8 mẫu | 2.259 ms               | 55 ms                                         |
| Đối thủ, p50             | 1.494 ms               | 774 ms                                        |
| Đối thủ, p95 trên 8 mẫu  | 3.344 ms               | 979 ms                                        |
| Region hàm quan sát được | Seoul `ap-northeast-2` | Sydney `ap-southeast-2`, cùng region database |

[Raw samples](performance/rooms-20261026.json), script tái lập: `node scripts/measure-room-latency.mjs <frontend-url> [label]`. Script tạo một phòng QA và đi 10 nửa nước, không phải load test. Bản sau vẫn có cold start: yêu cầu tạo phòng đầu sau deploy mất khoảng 6,1 giây. Tối ưu phản hồi cục bộ không có nghĩa server đã xác nhận ngay. Không ngoại suy p95 từ 8 mẫu thành cam kết cho mọi mạng hay sức tải.

## Migration và giới hạn

Migration mới `202610260002_gambit_clocks.sql` đã kiểm local, dry-run chỉ liệt kê chính migration này rồi mới áp dụng cloud. Không sửa migration đã áp dụng, không backfill clock cho ván cũ. Edge triển khai sau SQL; client cũ không gửi preset vẫn tạo phòng không tính giờ. Bảng/receipt và service RPC giữ RLS/quyền; kiểm SQL trong transaction rollback bao phủ flag race, idempotency, offline, đầu hàng và rematch offer/decline không chạy lại giờ.

Chưa thử điện thoại cảm ứng thật, screen reader, Safari/Firefox hoặc hai mạng 4G độc lập. Mất mạng đột ngột có thể cần tới 45 giây để xác định hiện diện. Cả hai offline thì timeout được ghi nhận ở yêu cầu hợp lệ tiếp theo dựa trên giờ database. Phiên theo tab; mất phiên có thể mất ghế. Phòng hết hạn sau 48 giờ, chưa tự purge. Không nâng cấp gói Supabase hoặc chuyển region database.

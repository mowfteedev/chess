# Ghi nhận bàn giao giao diện Gambit

Ngày 26/10/2026. Thay đổi được triển khai và tự kiểm tra trong working tree dựa trên commit `1917dad`; đây là tự kiểm tra của cùng người thực hiện.

## Tiêu chí và bằng chứng

| Tiêu chí | Kiểm chứng | Kết quả |
| --- | --- | --- |
| Thiết kế mới, quân vector và bố cục thích ứng | Ảnh desktop/mobile từ production preview; 6 viewport từ 320 đến 1920px; 64 ô, tỷ lệ vuông, không tràn ngang | PASS |
| Chơi máy hoạt động liên tục | Nước đầu và lượt tiếp theo ở cả 3 độ khó; máy đi trước khi người chơi chọn đen; đi lại đúng lượt | PASS |
| Không áp dụng nước máy đã hủy | Đi lại/đặt lại khi Worker đang khởi động; đổi độ khó giữa lượt; không kéo quân máy khi máy đang tính | PASS |
| Giữ chức năng chơi cờ | Chơi hai người, kéo thả, lật bàn, nhập thành, bắt qua đường, phong cấp/hủy phong cấp, chiếu bí/xem lại/đi lại | PASS |
| Biên bản và tùy chọn | Đọc nội dung file PGN tải thực; màu bàn và âm thanh giữ sau reload | PASS |
| Bàn phím và dialog | Mũi tên/Enter để đi quân; focus quay về nút mở khi đóng; Esc thoát focus mode | PASS |
| Kiểm tra accessibility tự động | Axe với các nhóm WCAG 2 A/AA, 2.1 AA, 2.2 AA ở 6 trạng thái sau khi hiệu ứng mở dialog hoàn tất; không ghi nhận vi phạm | PASS |
| Hosting tại thư mục con | Phục vụ build tại `/chess/`; font tải được, máy trả lời và không có request lỗi/pageerror | PASS |
| Build và kiểm tra hiện có | `npm test`: 5/5; `npm run test:e2e`: 21/21; E2E chạy `npm run build` trước preview | PASS |

Viewport đã kiểm tra: 320×740, 390×844, 768×1024, 1024×768, 1440×900 và 1920×1080. Môi trường: Chromium headless trên Linux. Test E2E nằm ở `test/e2e/game.spec.ts`; không có `pageerror` trong các ca chạy qua.

Sáu trạng thái scanner: bàn cờ desktop, dialog hướng dẫn desktop, bàn cờ mobile, màu Rừng đêm trên mobile, chế độ Cùng bạn và chế độ tập trung trên mobile. Không ghi nhận lỗi tải tài nguyên trong lượt kiểm tra này.

## Lỗi đã xác minh và sửa

- **Máy đứng sau nước đầu:** bản gốc chỉ ghi `1. e4` sau 1,5 giây. Đối tượng Chess bị thay đổi tại chỗ, nhưng effect máy không theo dõi thế cờ mới; cờ ref “đang nghĩ” cũng không được giải phóng khi timer bị hủy. Bản mới dùng FEN làm dependency và Worker có cleanup theo vòng đời; các ca máy/đổi độ khó/hủy nước đã qua trên production build.
- **Kéo quân hộ máy:** đường thả quân nay kiểm tra lượt người chơi và trạng thái phong cấp/kết thúc ván, ngoài việc vô hiệu hóa draggable.
- **Thống kê quân sau phong cấp:** đếm quân bị bắt từ lịch sử bắt quân, không suy từ chênh lệch số quân ban đầu.
- **Focus sau dialog:** test trình duyệt đã phát hiện focus mất khi dialog bị unmount; cleanup hiện trả focus rõ ràng về phần tử đã mở.

## Đo độ phản hồi

Thử cùng hàm `getBestBotMove`, mức hard, với thế cờ sau `1. e4`, theo dõi khoảng cách giữa các callback `requestAnimationFrame` trong Chromium:

| Cách chạy | Thời gian tính và chờ | Khoảng ngắt khung hình lớn nhất |
| --- | --- | --- |
| Hàm đồng bộ trên luồng giao diện | 625 ms | 617 ms |
| Cùng thuật toán trong Worker | 661 ms | 17 ms |

Đây là một phép đo cục bộ, so sánh hai cách thực thi cùng thuật toán trong harness. Worker giữ giao diện phản hồi; kết quả không chứng minh máy tính cờ nhanh hơn. Thuật toán minimax được giữ nguyên. Dữ liệu thế cờ, lịch sử và trạng thái kết thúc cũng được memo hóa theo FEN; confetti tải khi cần.

## Giới hạn kiểm tra

Chưa kiểm tra bằng screen reader thực, thiết bị cảm ứng thật, Firefox hoặc Safari. Kết quả scanner không phải chứng nhận WCAG. Build và đường dẫn asset được kiểm tra cục bộ; kết quả phát hành công khai được ghi theo commit tại [GitHub Actions](https://github.com/mowfteedev/chess/actions/workflows/deploy.yml).

## Phát hành và khôi phục

Địa chỉ công khai: [mowfteedev.github.io/chess](https://mowfteedev.github.io/chess/). Push vào `main` kích hoạt workflow build và deploy hiện có. Bản ổn định trước thay đổi này là `1917dade2bd04bcbbd6ab7a3a5e854dc8b898c46`; khi cần khôi phục, revert commit giao diện và push commit revert để pipeline phát hành lại. Không có migration hoặc dữ liệu máy chủ cần khôi phục.

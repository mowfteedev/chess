# ADR: GitHub Pages + Supabase cho phòng cờ hai người

## Lựa chọn

Giữ React/Vite trên GitHub Pages. Dùng Supabase cho Anonymous Auth, PostgreSQL, Realtime và Edge Function kiểm tra luật cờ. Bản thử P2P đã chứng minh giao diện nhưng không xác minh được TURN; transport mới không cần kết nối trực tiếp giữa hai thiết bị.

## Dữ liệu và quyền

- `gambit_rooms`: mã phòng, hai UID người chơi, trạng thái ván, revision, thời điểm hiện diện và hết hạn.
- `gambit_commands`: ID lệnh, UID, fingerprint và revision đã áp dụng; khóa chính `(room_code, command_id)`.
- Khóa ngoại ràng buộc danh tính Auth. Hai ghế có UID khác nhau. Mã phòng 6 ký tự được sinh bằng Web Crypto.
- RLS chỉ cho thành viên đọc phòng của mình. `anon` và `authenticated` không được ghi trực tiếp room hoặc đọc/ghi bảng receipt.
- Các RPC tạo/ghép/commit chỉ cho `service_role`; heartbeat chỉ cho `authenticated` và luôn dùng `auth.uid()` để chọn trường hiện diện được phép thay đổi.
- Token đăng nhập thuộc `sessionStorage` của tab. Tên, màu bàn và âm thanh là tùy chọn thiết bị. Mất phiên Auth có thể mất quyền vào lại ghế; chưa có tài khoản liên kết để khôi phục khác thiết bị.

## Đường ghi

Browser đăng nhập ẩn danh rồi gửi JWT đến `chess-rooms`. Handler gọi `auth.getUser()` để xác minh người dùng thực. Publishable key đứng riêng không được gửi thao tác chơi.

- `POST { action: create, name, color }`: kiểm dữ liệu, tạo mã ngẫu nhiên và phòng. Giới hạn 20 phòng/UID/giờ được kiểm dưới advisory lock.
- `POST { action: join, code, name }`: RPC khóa hàng `FOR UPDATE`, xác nhận hạn và ghế. Cùng UID có thể nối lại; người thứ ba bị từ chối. Hai yêu cầu cùng xin ghế cuối chỉ một yêu cầu được nhận.
- `POST { action: command, code, id, round, ply, command }`: xác minh membership, lookup receipt, kiểm round/ply, dựng lại lịch sử và kiểm luật chess.js.
- Commit dưới khóa hàng kiểm lại membership, hiện diện, revision và receipt. Trùng ID/cùng fingerprint trả trạng thái hiện tại; trùng ID/khác payload bị từ chối. Revision cũ không được ghi đè.
- Đấu lại cần hai phía đồng ý; tăng round, đặt lại lịch sử và đổi màu. Đầu hàng đồng bộ kết quả tới cả hai.

Các lỗi dùng HTTP 400/401/403/404/409/410/422/429/503 và `{ error: { code, message } }`. Không đưa chi tiết database hoặc thông tin xác thực vào lỗi công khai.

Gateway đặt `verify_jwt=false`; handler tự xác thực JWT trên mọi POST. GET chỉ kiểm tra runtime và truy cập bảng với truy vấn rỗng, trả trạng thái health không chứa dữ liệu phòng. CORS giới hạn frontend GitHub Pages và các origin phát triển đã khai báo; CORS không thay thế xác thực/RLS.

## Đồng bộ và mất mạng

Client chỉ hiển thị nước đi sau xác nhận từ server. Realtime Postgres Changes gửi row đã được RLS cho phép. Fallback đọc lại mỗi 3 giây; heartbeat mỗi 12 giây. Trình duyệt đọc trạng thái trực tiếp nhưng không viết board trực tiếp. Hiện diện được xem là hết hạn sau 45 giây; đóng trang gửi heartbeat offline bằng request keepalive. Phát hiện sự cố không được bảo đảm tức thì trên mọi thiết bị.

Chỉ replay board khi revision thay đổi; cập nhật hiện diện không dựng lại lịch sử. Những phản hồi của kết nối cũ bị loại theo generation. Nước đi có pending ID để phản hồi cũ không ghi đè một thao tác mới.

Với cùng phòng, timestamp hiện diện của từng ghế chỉ tiến về phía trước khi nhận HTTP/Realtime. Một thông báo offline đến muộn không được ghi đè heartbeat mới hơn; row có revision cũ bị bỏ qua.

Một ván giới hạn 2048 nửa nước. Phòng hết hạn sau 48 giờ; chưa tự purge dữ liệu hết hạn. Mất mạng sau khi server nhận yêu cầu tạo phòng có thể để lại phòng chưa sử dụng; dữ liệu ván đã được xác nhận không phụ thuộc vào trình duyệt chủ phòng tiếp tục mở.

## Triển khai và hồi phục

SQL migration chỉ tạo đối tượng `gambit_*`; không sửa bảng khác. Chạy dry-run trước, áp dụng bằng Supabase CLI để giữ migration history, rồi deploy Edge Function đúng project ref. Không push toàn bộ cấu hình local lên production.

CI khởi động stack Supabase Docker riêng, dùng `.env.test.local` rồi build production bằng repository variables. Playwright dùng lại Edge Runtime đã được CLI khởi động khi health của stack riêng sẵn sàng; preview frontend luôn được tạo mới trong CI. SDK chỉ tải khi người dùng vào phòng. Không có secret key trong bundle frontend.

Rollback giao diện bằng revert và deploy GitHub Pages lại; giữ bảng mới để không mất ván. Backend thay đổi tiếp theo cần migration mới, không sửa migration đã áp dụng. Không tự drop bảng để rollback.

## Cache

Vite phát manifest phiên bản cùng mã Git. Client kiểm tra qua query mới với `no-store`; chỉ cập nhật khi người dùng chọn, có xác nhận nếu đang ở phòng. Reload giữ hash phòng và đổi query `v`. HTML fallback hỗ trợ khi entry asset đã đổi tên. Không tuyên bố thay được header cache của GitHub Pages.

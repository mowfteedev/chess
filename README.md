# Gambit — Đến lượt bạn.

Một không gian chơi cờ yên tĩnh với nền xanh rừng, bàn cờ gỗ và bộ quân vector. Chơi với máy hoặc cùng bạn trên một thiết bị; mọi nước đi được xử lý trong trình duyệt.

**Chơi trên GitHub Pages:** [mowfteedev.github.io/chess](https://mowfteedev.github.io/chess/).

![Giao diện Gambit trên máy tính](docs/screenshots/desktop.png)

## Chạy dự án

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị, mặc định là `http://localhost:5173`.

```bash
npm test                     # Các ca luật cờ hiện có
npx playwright install chromium
npm run test:e2e             # Kiểm thử giao diện trên bản production
npm run build                # Kiểm tra TypeScript và build
npm run preview              # Xem bản build
```

Bộ E2E tự build và mở preview ở `127.0.0.1:4174`. Trong CI, cài trình duyệt bằng `npx playwright install --with-deps chromium` trước khi chạy.

## Trải nghiệm

- **Với máy:** ba mức Thư giãn, Cân bằng, Thử thách; chọn quân trắng hoặc đen. Minimax và alpha-beta chạy trong Web Worker để giao diện tiếp tục phản hồi trong lúc tính nước đi.
- **Cùng bạn:** hai người thay phiên trên một thiết bị, hỗ trợ nhấn chọn và kéo thả quân.
- **Bàn cờ:** năm bảng màu, quân SVG, tọa độ ngoài bàn, gợi ý nước hợp lệ, đánh dấu nước vừa đi và vua bị chiếu.
- **Tiện ích:** đi lại, lật bàn cờ, bật/tắt âm thanh, chế độ tập trung, tải biên bản PGN và lưu lựa chọn màu/âm thanh trên thiết bị.
- **Nước đi đặc biệt:** nhập thành, bắt tốt qua đường và phong cấp với lựa chọn Hậu/Xe/Tượng/Mã. Nhận diện chiếu bí và các trạng thái hòa được chess.js hỗ trợ.
- **Bàn phím:** Tab vào bàn cờ; phím mũi tên chọn ô; Enter hoặc Space chọn quân/đi quân; Esc bỏ chọn hoặc thoát chế độ tập trung. Hộp thoại giữ focus bên trong và trả focus khi đóng.
- **Responsive:** xếp bàn cờ và thiết lập cạnh nhau trên desktop; chuyển thành một cột trên màn hình từ 960px trở xuống. Cho phép zoom và tôn trọng reduced motion.

Khi tạo ván mới giữa trận, ứng dụng cho phép lưu PGN trước khi đặt lại. Ván cờ không tự lưu khi tải lại trang; chỉ màu bàn cờ và âm thanh được lưu. Chế độ Cùng bạn hoạt động trên cùng một thiết bị, không phải chơi qua mạng.

## Thiết kế và kỹ thuật

Giao diện sử dụng một hệ màu chung: nền `#141b18`, panel `#1a231e`, điểm nhấn `#c0dda5`; serif cho tiêu đề và Manrope cho nội dung. Font và hình quân được phục vụ tại chỗ, không cần CDN khi chơi. Giấy phép font Manrope nằm ở [public/fonts/OFL.txt](public/fonts/OFL.txt).

React 19, TypeScript, Vite, Tailwind CSS v4, chess.js, Lucide và Web Audio API. Confetti chỉ tải khi chiếu bí và không chạy khi thiết bị yêu cầu reduced motion. Giữ cấu hình đường dẫn tương đối để chạy tại thư mục con trên GitHub Pages.

Quy trình GitHub Actions hiện có vẫn build và phát hành khi push vào `main`. Xem [ghi nhận kiểm thử](docs/QA.md) và [ảnh mobile](docs/screenshots/mobile.png).

# ♟️ Cờ Vua Minimalist (FIDE Chess)

Game cờ vua phong cách đồ họa tối giản (Minimalist Solid & Outline), vận hành 100% Client-side và được phát hành tự động trên **GitHub Pages**.

👉 **Chơi ngay tại**: [https://mowfteedev.github.io/chess/](https://mowfteedev.github.io/chess/)

---

## ✨ Tính Năng Nổi Bật

- **Bộ quân cờ Minimalist**: Thiết kế đồ họa dày dặn, tương phản cao, sắc nét trên mọi màn hình.
- **Chuẩn luật FIDE 100%**:
  - Nhập thành (*Castling*) cả hai cánh Vua và Hậu.
  - Bắt tốt qua đường (*En Passant*).
  - Phong cấp Tốt (*Pawn Promotion*) với hộp thoại chọn Hậu, Xe, Tượng, Mã.
  - Tự động nhận diện Chiếu tướng, Chiếu bí (*Checkmate*), Hòa cờ (*Stalemate*, luật 50 nước, lặp thế cờ 3 lần).
- **Chế độ chơi đa dạng**:
  - **Pass & Play**: 2 người chơi lần lượt trên cùng một thiết bị với tính năng lật bàn cờ linh hoạt.
  - **Đấu Với Máy (AI Bot)**: Thuật toán Minimax + Alpha-Beta Pruning với 3 cấp độ (Dễ, Vừa, Khó).
- **Hiệu ứng âm thanh Procedural**: Tạo âm thanh di chuyển, ăn quân, chiếu tướng bằng **Web Audio API** trực tiếp (không tốn băng thông tải file âm thanh).
- **Tùy biến bàn cờ**: 5 bộ màu (Emerald Chess.com, Gỗ cổ điển, Xám Slate, Đen trắng tối giản, Obsidian).
- **Tiện ích thi đấu**: Biên bản nước đi PGN, nút Đi lại (Undo), Lật bàn cờ (Flip board), Bật/Tắt âm thanh.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Engine luật cờ**: `chess.js`
- **Âm thanh**: Web Audio API
- **Hiệu ứng**: Canvas Confetti
- **CI/CD**: GitHub Actions tự động build và deploy lên GitHub Pages khi push code vào nhánh `main`.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ

1. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```

2. Chạy môi trường phát triển (Dev server):
   ```bash
   npm run dev
   ```

3. Chạy bộ kiểm thử tự động (Unit tests):
   ```bash
   npm test
   ```

4. Đóng gói bản Production:
   ```bash
   npm run build
   ```

---

## 📜 Giấy Phép & Bản Quyền
Dự án được xây dựng bởi Quản gia Bang hội cho đại ca **@mowfteedev**.

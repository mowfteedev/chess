import {
  ArrowRight,
  Copy,
  Link2,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Share2,
  ShieldCheck,
  Swords,
  Users,
  WifiOff,
} from "lucide-react";
import type { RoomState } from "../../multiplayer/protocol";
interface WaitingRoomProps {
  room: RoomState;
  shareUrl: string;
  leave: () => void;
  copy: (value: string, label: string) => Promise<void>;
  share: () => Promise<void>;
  retry: () => void;
}
export function WaitingRoom({
  room,
  shareUrl,
  leave,
  copy,
  share,
  retry,
}: WaitingRoomProps) {
  return (
    <main className="waiting-main" id="main" tabIndex={-1}>
      <button className="back-to-lobby" onClick={leave}>
        <LogOut size={15} />
        Về sảnh
      </button>
      <div
        className={`waiting-card ${room.status === "error" ? "waiting-error" : ""}`}
      >
        <div className="waiting-icon">
          {room.status === "error" ? (
            <WifiOff size={33} />
          ) : room.status === "opening" || room.status === "reconnecting" ? (
            <LoaderCircle size={35} className="spinning" />
          ) : (
            <Swords size={35} strokeWidth={1.4} />
          )}
        </div>
        <div className="eyebrow">
          {room.status === "error"
            ? "MÌNH THỬ LẠI NHÉ"
            : room.role === "host"
              ? "BÀN CỜ ĐÃ CÓ HẸN"
              : "ĐANG THEO LỜI MỜI"}
        </div>
        <h1>
          {room.status === "error"
            ? "Chưa gặp được nhau."
            : room.status === "opening"
              ? room.role === "host"
                ? "Đang mở bàn cờ…"
                : "Đang tìm bạn…"
              : room.role === "host"
                ? "Hẹn bạn một ván cờ."
                : "Đợi nhau một chút."}
        </h1>
        <p role={room.status === "error" ? "alert" : undefined}>
          {room.error ??
            (room.role === "host"
              ? "Gửi mã phòng hoặc link này cho bạn của bạn.\nVán cờ bắt đầu khi cả hai cùng ngồi vào bàn."
              : "Mình đang kết nối với chủ phòng.\nGiữ trang mở thêm một chút nhé.")}
        </p>
        {room.role === "host" && room.status === "waiting" && (
          <>
            <div className="waiting-code">
              <span>MÃ PHÒNG CỦA BẠN</span>
              <button
                onClick={() => void copy(room.code, "Đã sao chép mã phòng")}
                aria-label={`Sao chép mã phòng ${room.code}`}
              >
                <strong data-testid="room-code">{room.code}</strong>
                <Copy size={20} />
              </button>
            </div>
            <div className="waiting-share">
              <button className="primary-button" onClick={() => void share()}>
                <Share2 size={18} />
                Gửi lời mời
                <ArrowRight size={18} />
              </button>
              <button
                className="secondary-button"
                onClick={() => void copy(shareUrl, "Đã sao chép link mời")}
              >
                <Link2 size={17} />
                Sao chép link
              </button>
            </div>
            <div className="waiting-players">
              <span className="waiting-player-avatar">
                {room.hostName.slice(0, 1).toUpperCase()}
              </span>
              <span className="waiting-line">
                <i />
                <i />
                <i />
              </span>
              <span className="empty-player">
                <Users size={21} />
              </span>
            </div>
            <span className="waiting-status">
              <span className="live-dot" />
              {room.hostName} đang đợi bạn vào…
            </span>
          </>
        )}
        {(room.status === "error" || room.status === "reconnecting") && (
          <button className="primary-button retry-button" onClick={retry}>
            Thử kết nối lại
            <RefreshCw size={17} />
          </button>
        )}
        {room.status === "opening" && (
          <span className="waiting-status" role="status">
            <LoaderCircle size={15} className="spinning" />
            Đang kết nối phòng…
          </span>
        )}
      </div>
      <p className="waiting-footnote">
        <ShieldCheck size={14} />
        Một phòng dành cho đúng hai người.
      </p>
    </main>
  );
}

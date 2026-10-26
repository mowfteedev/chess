import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Copy,
  Link2,
  LoaderCircle,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Swords,
  Users,
  WifiOff,
} from "lucide-react";
import { ChessPieceIcon } from "./ChessPieceIcon";
import type { RoomState } from "../multiplayer/protocol";
import type { PieceType } from "../types/chess";

function BoardIllustration() {
  const pieces: Record<string, { type: PieceType; color: "w" | "b" }> = {
    "0-6": { type: "k", color: "b" },
    "1-5": { type: "p", color: "b" },
    "1-7": { type: "p", color: "b" },
    "2-3": { type: "n", color: "b" },
    "3-4": { type: "p", color: "w" },
    "4-2": { type: "n", color: "w" },
    "5-5": { type: "p", color: "w" },
    "6-1": { type: "p", color: "w" },
    "6-6": { type: "k", color: "w" },
    "7-0": { type: "r", color: "w" },
  };
  return (
    <div className="lobby-illustration" aria-hidden="true">
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <span className="illustration-time">
        <Clock3 size={13} />1 · 5 · 10 phút
      </span>
      <div className="illustration-stamp">
        <span>64</span>
        <small>
          Ô CỜ
          <br />
          MỘT CUỘC HẸN
        </small>
      </div>
      <div className="illustration-board">
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8),
            column = index % 8;
          const piece = pieces[`${row}-${column}`];
          return (
            <span key={index} className={(row + column) % 2 ? "dark" : "light"}>
              {piece && <ChessPieceIcon {...piece} />}
            </span>
          );
        })}
      </div>
      <span className="illustration-label">
        <span />
        Một bàn cờ. Hai người bạn.
      </span>
      <div className="illustration-invite">
        <span className="invite-avatar">m.</span>
        <span>
          Rủ một người bạn.<strong>Cùng đi một nước hay.</strong>
        </span>
        <ArrowUpRight size={17} />
      </div>
    </div>
  );
}

export function Lobby({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <main className="lobby-main" id="main">
      <section className="lobby-hero">
        <div className="lobby-intro">
          <div className="eyebrow">
            <span className="live-dot" />
            HẸN NHAU TRÊN 64 Ô CỜ
          </div>
          <h1>
            Một lời mời.
            <br />
            <em>Một ván cờ</em>
            <span>.</span>
          </h1>
          <p>
            Khoảng cách không quan trọng.
            <br className="desktop-break" /> Chỉ cần một người bạn và một nước
            đi đầu tiên.
          </p>
          <div className="lobby-benefits">
            <span>
              <Users size={15} />
              Chỉ bạn và người bạn chọn
            </span>
            <span>
              <Link2 size={15} />
              Vào bàn bằng mã hoặc link
            </span>
          </div>
        </div>
        <BoardIllustration />
      </section>
      <section className="lobby-choices" aria-label="Chọn cách vào bàn cờ">
        <button
          className="lobby-choice create-choice"
          aria-labelledby="create-room-title"
          aria-describedby="create-room-description"
          onClick={onCreate}
        >
          <div className="choice-top">
            <span className="choice-icon">
              <Plus size={27} strokeWidth={1.5} />
            </span>
            <span className="choice-number">01</span>
          </div>
          <h2 id="create-room-title">Tạo phòng mới</h2>
          <p id="create-room-description">
            Mở bàn cờ của bạn. Gửi một lời mời.
            <br />
            Đợi bạn tới và bắt đầu cuộc đấu trí.
          </p>
          <span className="choice-action">
            Tạo một cuộc hẹn
            <ArrowRight size={19} />
          </span>
        </button>
        <button
          className="lobby-choice join-choice"
          aria-labelledby="join-room-title"
          aria-describedby="join-room-description"
          onClick={onJoin}
        >
          <div className="choice-top">
            <span className="choice-icon">
              <LogIn size={26} strokeWidth={1.5} />
            </span>
            <span className="choice-number">02</span>
          </div>
          <h2 id="join-room-title">Tham gia phòng</h2>
          <p id="join-room-description">
            Đã nhận được lời mời?
            <br />
            Nhập mã phòng và ngồi vào bàn thôi.
          </p>
          <span className="choice-action">
            Mình có mã phòng
            <ArrowRight size={19} />
          </span>
        </button>
      </section>
      <div className="lobby-bottom-note">
        <span className="small-star">✦</span>Không cần tài khoản. Chọn nhịp
        chơi. Cùng tận hưởng ván cờ.
      </div>
    </main>
  );
}

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

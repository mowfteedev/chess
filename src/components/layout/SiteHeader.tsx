import { CircleHelp, Copy, LoaderCircle, LogOut, Wifi } from "lucide-react";
import { ChessPieceIcon } from "../ChessPieceIcon";
import type { RoomState } from "../../multiplayer/protocol";
interface SiteHeaderProps {
  room: RoomState;
  onLeave: () => void;
  onHelp: () => void;
  onCopyCode: () => void;
}
export function SiteHeader({
  room,
  onLeave,
  onHelp,
  onCopyCode,
}: SiteHeaderProps) {
  const isLobby = room.status === "idle",
    connected = room.status === "connected";
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          if (!isLobby) onLeave();
        }}
        aria-label="Gambit — về trang chủ"
      >
        <span className="brand-mark">
          <ChessPieceIcon type="n" color="w" />
        </span>
        <span>
          gambit<span className="brand-period">.</span>
          <small className="brand-caption">CHESS FOR TWO</small>
        </span>
      </a>
      {!isLobby && (
        <button
          className="header-room-code"
          onClick={onCopyCode}
          aria-label={`Sao chép mã phòng ${room.code}`}
        >
          <span>PHÒNG</span>
          <strong>{room.code}</strong>
          <Copy size={13} />
        </button>
      )}
      <div className="header-actions">
        {isLobby ? (
          <>
            <span className="header-tagline">
              <span className="live-dot" />A GOOD GAME, TOGETHER.
            </span>
            <button className="help-button" onClick={onHelp}>
              <CircleHelp size={17} />
              <span>Cách chơi</span>
            </button>
          </>
        ) : (
          <>
            <span
              className={`connection-badge ${connected ? "" : "not-connected"}`}
            >
              {connected ? (
                <Wifi size={14} />
              ) : (
                <LoaderCircle size={14} className="spinning" />
              )}
              <span>
                {connected
                  ? "2/2 đã kết nối"
                  : room.status === "waiting"
                    ? "Đợi bạn vào"
                    : "Đang kết nối"}
              </span>
            </span>
            <button
              className="icon-button leave-button"
              title="Rời phòng"
              aria-label="Rời phòng"
              onClick={onLeave}
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

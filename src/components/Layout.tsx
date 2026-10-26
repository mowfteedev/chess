import {
  CircleHelp,
  Copy,
  Heart,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { ChessPieceIcon } from "./ChessPieceIcon";
import { APP_RELEASE, type useAppUpdate } from "../hooks/useAppUpdate";
import type { RoomState } from "../multiplayer/protocol";

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

export function SiteFooter({
  update,
}: {
  update: ReturnType<typeof useAppUpdate>;
}) {
  return (
    <>
      {" "}
      <footer className="site-footer">
        <span>64 ô cờ. Vô vàn câu chuyện.</span>
        <div>
          <span className="footer-love">
            Made for two
            <Heart size={11} />
          </span>
          <button
            className="build-version"
            onClick={() => void update.check()}
            aria-label="Kiểm tra cập nhật"
            title={`Bản ${APP_RELEASE.version} · ${APP_RELEASE.builtAt}`}
          >
            <RefreshCw
              size={11}
              className={update.status === "checking" ? "spinning" : ""}
            />
            {APP_RELEASE.revision}
          </button>
        </div>
      </footer>
      {update.status === "current" && !update.available && (
        <span className="sr-only" role="status">
          Bạn đang dùng bản mới nhất.
        </span>
      )}
      {update.status === "error" && (
        <div className="update-check-error" role="status">
          Chưa kiểm tra được cập nhật. Bạn có thể thử lại ở mã phiên bản cuối
          trang.
        </div>
      )}
    </>
  );
}

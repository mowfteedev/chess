import {
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  Flag,
  Palette,
  RotateCcw,
  Share2,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { ChessBoard } from "../ChessBoard";
import { CapturedPieces } from "../CapturedPieces";
import { GameClock } from "../GameClock";
import { MoveHistory } from "../MoveHistory";
import { Controls } from "../Controls";
import type { useChessGame } from "../../hooks/useChessGame";
import type { BoardTheme, Color } from "../../types/chess";
import { opposite } from "../../multiplayer/protocol";
interface GameScreenProps {
  game: ReturnType<typeof useChessGame>;
  theme: BoardTheme;
  setTheme: (theme: BoardTheme) => void;
  share: () => Promise<void>;
  exportPgn: () => void;
  requestRematch: () => void;
  onAppearance: () => void;
  onHistory: () => void;
  onHelp: () => void;
  onResign: () => void;
}
export function GameScreen({
  game,
  theme,
  setTheme,
  share,
  exportPgn,
  requestRematch,
  onAppearance,
  onHistory,
  onHelp,
  onResign,
}: GameScreenProps) {
  const { room, client } = game,
    connected = room.status === "connected";
  const myName =
    room.myColor === room.hostColor ? room.hostName : room.guestName;
  const opponentName =
    room.myColor === room.hostColor ? room.guestName : room.hostName;
  const topColor = game.isFlipped ? "w" : "b";
  const playerBar = (color: Color) => (
    <CapturedPieces
      playerName={color === room.hostColor ? room.hostName : room.guestName}
      subtitle={`${color === "w" ? "Quân trắng" : "Quân đen"} · ${color === room.myColor ? "Tự tin với nước đi của mình" : connected ? "Đã ngồi vào bàn" : "Đang kết nối lại"}`}
      isSelf={color === room.myColor}
      isTurn={!game.isGameOver && game.turn === color}
      color={color}
      captured={color === "w" ? game.capturedBlack : game.capturedWhite}
      materialAdvantage={
        color === "w" ? game.materialAdvantage : -game.materialAdvantage
      }
      clock={
        room.clock ? (
          <GameClock
            game={client.clockGame()}
            color={color}
            now={client.serverNow}
            onExpired={client.claimTimeout}
          />
        ) : undefined
      }
    />
  );
  const gameStatus = room.pendingMove
    ? "Đang gửi nước đi…"
    : game.isGameOver
      ? "Ván đấu đã kết thúc"
      : !connected && !room.clock
        ? "Ván cờ tạm dừng · chờ kết nối"
        : game.isCheck
          ? `${game.turn === room.myColor ? "Bạn đang" : "Bạn chơi đang"} bị chiếu`
          : game.turn === room.myColor
            ? "Đến lượt bạn"
            : `Đang chờ ${opponentName}`;

  return (
    <main className="play-main" id="play" tabIndex={-1}>
      <div className="play-heading">
        <div>
          <div className="eyebrow">BẠN, MỘT NGƯỜI BẠN & 64 Ô CỜ</div>
          <h1>
            Một ván cờ hay<span>.</span>
          </h1>
        </div>
        <span className="round-label">
          Ván {(room.round + 1).toString().padStart(2, "0")}
          <i />
          {room.clock
            ? `${room.clock.initialMs / 60000} phút mỗi bên`
            : "Không tính giờ"}
        </span>
      </div>
      {!connected && (
        <div className="reconnect-banner" role="status">
          <WifiOff size={18} />
          <div>
            <strong>Đợi nhau một chút nhé.</strong>
            <span>
              {room.error ??
                (room.clock
                  ? room.opponentPresent
                    ? "Đang đồng bộ lại kết nối của bạn. Đồng hồ vẫn chạy."
                    : "Bạn chơi đang ngoại tuyến. Đồng hồ vẫn chạy; bạn vẫn có thể đi quân khi đến lượt."
                  : "Kết nối đang gián đoạn. Giữ trang mở để tiếp tục từ đúng nước vừa đi.")}
            </span>
          </div>
          <button onClick={client.retry}>Kết nối lại</button>
        </div>
      )}
      {room.error && connected && (
        <div className="inline-error" role="alert">
          {room.error}
        </div>
      )}
      <div className="game-layout">
        <section className="board-column" aria-label="Khu vực chơi cờ">
          {playerBar(topColor)}
          <ChessBoard
            chess={game.chess}
            theme={theme}
            isFlipped={game.isFlipped}
            selectedSquare={game.selectedSquare}
            validMoves={game.validMoves}
            lastMove={game.lastMove}
            kingInCheckSquare={game.kingInCheckSquare}
            currentTurn={game.turn}
            canInteract={game.canInteract}
            onSelectSquare={game.selectSquare}
            onDropMove={game.handleMoveAttempt}
          />
          {playerBar(opposite(topColor))}
          <div
            className={`game-status ${game.isCheck ? "check-status" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span
              className={room.pendingMove ? "thinking-status" : "status-ring"}
            />
            {gameStatus}
          </div>
          <div
            className="board-controls"
            role="group"
            aria-label="Tiện ích bàn cờ"
          >
            <button onClick={onAppearance}>
              <Palette size={19} />
              <span>Màu bàn</span>
            </button>
            <button onClick={game.toggleFlip}>
              <ArrowUpDown size={19} />
              <span>Lật bàn</span>
            </button>
            <button
              aria-label={game.soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              aria-pressed={game.soundEnabled}
              onClick={game.toggleSound}
            >
              {game.soundEnabled ? (
                <Volume2 size={19} />
              ) : (
                <VolumeX size={19} />
              )}
              <span>Âm thanh</span>
            </button>
            <button onClick={onHistory}>
              <BookOpen size={19} />
              <span>Nước đi</span>
            </button>
            <button disabled={!connected || game.isGameOver} onClick={onResign}>
              <Flag size={18} />
              <span>Đầu hàng</span>
            </button>
          </div>
          <div className="board-caption">
            <span>
              <ShieldCheck size={13} />
              Nhập thành · Bắt qua đường · Phong cấp
            </span>
            <button onClick={onHelp}>
              Mẹo thao tác
              <ChevronRight size={12} />
            </button>
          </div>
        </section>
        <aside
          className="game-sidebar"
          aria-label="Thông tin phòng và biên bản"
        >
          <section className="panel room-info-panel">
            <div className="panel-heading">
              <h2>Bàn cờ của chúng mình</h2>
              <Users size={17} />
            </div>
            <div className="room-session-summary">
              <span>PHÒNG RIÊNG</span>
              <strong>{room.code}</strong>
              <small>
                {room.clock
                  ? `${room.clock.initialMs / 60000} phút mỗi bên · Không cộng giây`
                  : "Một cuộc hẹn không vội"}
              </small>
            </div>
            <div className="room-members">
              <div>
                <span className="member-avatar">
                  {myName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {myName}
                    <small>BẠN</small>
                  </strong>
                  <span>Quân {room.myColor === "w" ? "trắng" : "đen"}</span>
                </div>
                <span className="live-dot" />
              </div>
              <div>
                <span className="member-avatar friend-avatar">
                  {opponentName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{opponentName}</strong>
                  <span>Quân {room.myColor === "w" ? "đen" : "trắng"}</span>
                </div>
                <span
                  className={`live-dot ${connected ? "" : "offline-dot"}`}
                />
              </div>
            </div>
            <button className="secondary-button" onClick={() => void share()}>
              <Share2 size={16} />
              Chia sẻ phòng
            </button>
            <Controls currentTheme={theme} onSelectTheme={setTheme} />
          </section>
          <MoveHistory history={game.moveHistory} onExport={exportPgn} />
          {game.isGameOver && (
            <button
              className="primary-button"
              disabled={!connected || Boolean(room.rematchBy)}
              onClick={requestRematch}
            >
              {room.rematchBy === room.myColor
                ? "Đợi bạn đồng ý đấu lại…"
                : "Mời bạn đấu lại"}
              <RotateCcw size={16} />
            </button>
          )}
          <p className="game-sidebar-note">
            Nước đi được đồng bộ giữa hai người.
            <br />
            Giữ trang mở trong suốt ván cờ nhé.
          </p>
        </aside>
      </div>
      {game.isGameOver && (
        <div className="mobile-result-action">
          <button
            className="primary-button"
            disabled={!connected || Boolean(room.rematchBy)}
            onClick={requestRematch}
          >
            {room.rematchBy ? "Đợi bạn đồng ý đấu lại…" : "Mời bạn đấu lại"}
            <RotateCcw size={16} />
          </button>
        </div>
      )}
    </main>
  );
}

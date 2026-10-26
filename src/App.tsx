import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  Flag,
  Heart,
  Link2,
  LoaderCircle,
  LogOut,
  Palette,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
  Swords,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useChessGame } from "./hooks/useChessGame";
import { usePreference } from "./hooks/usePreference";
import { APP_RELEASE, useAppUpdate } from "./hooks/useAppUpdate";
import { ChessBoard } from "./components/ChessBoard";
import { CapturedPieces } from "./components/CapturedPieces";
import { MoveHistory } from "./components/MoveHistory";
import { Controls } from "./components/Controls";
import { PromotionModal } from "./components/PromotionModal";
import { GameOverModal } from "./components/GameOverModal";
import { ChessPieceIcon } from "./components/ChessPieceIcon";
import { Dialog } from "./components/Dialog";
import { Lobby } from "./components/Lobby";
import { GameClock } from "./components/GameClock";
import { RoomNotifications } from "./components/RoomNotifications";
import { useRoomEvents } from "./hooks/useRoomEvents";
import {
  gamePgn,
  opposite,
  readCode,
  validCode,
  type TimeControl,
} from "./multiplayer/protocol";
import { BOARD_THEMES } from "./utils/themes";
import type { BoardTheme, Color } from "./types/chess";

export function App() {
  const [inviteCode] = useState(() => {
    const code =
      new URLSearchParams(location.hash.slice(1)).get("room")?.toUpperCase() ??
      "";
    return validCode(code) ? code : "";
  });
  const game = useChessGame(inviteCode);
  const { room, client } = game;
  const update = useAppUpdate();
  const [theme, setTheme] = usePreference<BoardTheme>(
    "board-theme",
    "wood",
    (value): value is BoardTheme =>
      typeof value === "string" &&
      Object.prototype.hasOwnProperty.call(BOARD_THEMES, value),
  );
  const [nickname, setNickname] = usePreference(
    "nickname",
    "",
    (value): value is string => typeof value === "string" && value.length <= 24,
  );
  const [entry, setEntry] = useState<"create" | "join" | null>(
    inviteCode ? "join" : null,
  );
  const [codeInput, setCodeInput] = useState(inviteCode);
  const [hostColor, setHostColor] = useState<Color>("w");
  const [timeControl, setTimeControl] = usePreference<TimeControl>(
    "time-control",
    300,
    (value): value is TimeControl =>
      value === 60 || value === 300 || value === 600,
  );
  const [formError, setFormError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<
    "leave" | "resign" | "update" | null
  >(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [copied, setCopied] = useState("");
  const isLobby = room.status === "idle";
  const hasBoard =
    room.status === "connected" ||
    room.hasGuest ||
    room.moves.length > 0 ||
    (room.status === "reconnecting" && room.guestName !== "Bạn chơi");
  const connected = room.status === "connected";
  const myName =
    room.myColor === room.hostColor ? room.hostName : room.guestName;
  const opponentName =
    room.myColor === room.hostColor ? room.guestName : room.hostName;
  const { notice, dismissNotice } = useRoomEvents({
    code: room.code,
    role: room.role,
    opponentName,
    opponentPresent: room.opponentPresent,
    soundEnabled: game.soundEnabled,
    active: !isLobby,
  });
  const shareUrl = new URL(location.pathname, location.origin);
  shareUrl.searchParams.set("v", APP_RELEASE.version);
  shareUrl.hash = `room=${room.code}`;

  useEffect(() => {
    if (!isLobby) setEntry(null);
  }, [isLobby]);
  useEffect(() => {
    if (!isLobby)
      document
        .getElementById(hasBoard ? "play" : "main")
        ?.focus({ preventScroll: true });
  }, [isLobby, hasBoard]);
  useEffect(() => {
    setResultDismissed(false);
  }, [room.round]);
  useEffect(() => {
    if (!game.isGameOver) setResultDismissed(false);
  }, [game.isGameOver]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(""), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    if (room.code && room.status !== "idle") {
      const url = new URL(location.href);
      url.hash = `room=${room.code}`;
      history.replaceState(null, "", url);
    }
  }, [room.code, room.status]);

  const leave = () => {
    client.leave();
    setConfirmation(null);
    setHistoryOpen(false);
    setAppearanceOpen(false);
    setShareOpen(false);
    const url = new URL(location.href);
    url.hash = "";
    history.replaceState(null, "", url);
  };
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setShareOpen(true);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Hẹn bạn một ván cờ — Gambit",
          text: `Vào phòng ${room.code}, mình đợi bạn nhé.`,
          url: shareUrl.href,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copy(shareUrl.href, "Đã sao chép lời mời");
  };
  const submitEntry = (event: FormEvent) => {
    event.preventDefault();
    if (entry === "join") {
      const code = readCode(codeInput);
      if (!validCode(code)) {
        setFormError(
          "Mã phòng gồm 6 ký tự, ví dụ ABC234. Bạn kiểm tra lại nhé.",
        );
        return;
      }
      client.join(code, nickname);
    } else client.create(nickname, hostColor, timeControl);
    setEntry(null);
    setFormError("");
  };
  const exportPgn = () => {
    const url = URL.createObjectURL(
      new Blob([gamePgn(room)], {
        type: "application/x-chess-pgn;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `gambit-${room.code}.pgn`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const requestRematch = () => {
    if (client.command({ kind: "rematch" })) setResultDismissed(true);
  };
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
  const gameStatus = game.isGameOver
    ? "Ván đấu đã kết thúc"
    : !connected && !room.clock
      ? "Ván cờ tạm dừng · chờ kết nối"
      : room.pendingMove
        ? "Đang gửi nước đi…"
        : game.isCheck
          ? `${game.turn === room.myColor ? "Bạn đang" : "Bạn chơi đang"} bị chiếu`
          : game.turn === room.myColor
            ? "Đến lượt bạn"
            : `Đang chờ ${opponentName}`;

  return (
    <div className={`app-shell rooms-app ${hasBoard ? "in-game" : ""}`}>
      <a className="skip-link" href={hasBoard ? "#play" : "#main"}>
        Đến nội dung chính
      </a>
      {update.available && (
        <div className="update-banner" role="status">
          <RefreshCw size={15} />
          <span>Có phiên bản mới của Gambit.</span>
          <button
            onClick={() => {
              if (!isLobby) setConfirmation("update");
              else update.reload();
            }}
          >
            Cập nhật ngay
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      <RoomNotifications notice={notice} onDismiss={dismissNotice} />
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            if (isLobby) return;
            if (room.moves.length) setConfirmation("leave");
            else leave();
          }}
          aria-label="Gambit — về trang chủ"
        >
          <span className="brand-mark">
            <ChessPieceIcon type="n" color="w" />
          </span>
          <span>
            gambit<span className="brand-period">.</span>
          </span>
        </a>
        {!isLobby && (
          <button
            className="header-room-code"
            onClick={() => void copy(room.code, "Đã sao chép mã phòng")}
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
              <button className="help-button" onClick={() => setHelpOpen(true)}>
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
                onClick={() => {
                  if (room.moves.length) setConfirmation("leave");
                  else leave();
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>
      {isLobby ? (
        <Lobby
          onCreate={() => {
            setFormError("");
            setEntry("create");
          }}
          onJoin={() => {
            setFormError("");
            setEntry("join");
          }}
        />
      ) : hasBoard ? (
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
                  className={
                    room.pendingMove ? "thinking-status" : "status-ring"
                  }
                />
                {gameStatus}
              </div>
              <div
                className="board-controls"
                role="group"
                aria-label="Tiện ích bàn cờ"
              >
                <button onClick={() => setAppearanceOpen(true)}>
                  <Palette size={19} />
                  <span>Màu bàn</span>
                </button>
                <button onClick={game.toggleFlip}>
                  <ArrowUpDown size={19} />
                  <span>Lật bàn</span>
                </button>
                <button
                  aria-label={
                    game.soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"
                  }
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
                <button onClick={() => setHistoryOpen(true)}>
                  <BookOpen size={19} />
                  <span>Nước đi</span>
                </button>
                <button
                  disabled={!connected || game.isGameOver}
                  onClick={() => setConfirmation("resign")}
                >
                  <Flag size={18} />
                  <span>Đầu hàng</span>
                </button>
              </div>
              <div className="board-caption">
                <span>
                  <ShieldCheck size={13} />
                  Nhập thành · Bắt qua đường · Phong cấp
                </span>
                <button onClick={() => setHelpOpen(true)}>
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
                <button
                  className="secondary-button"
                  onClick={() => void share()}
                >
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
      ) : (
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
              ) : room.status === "opening" ||
                room.status === "reconnecting" ? (
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
                  <button
                    className="primary-button"
                    onClick={() => void share()}
                  >
                    <Share2 size={18} />
                    Gửi lời mời
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      void copy(shareUrl.href, "Đã sao chép link mời")
                    }
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
              <button
                className="primary-button retry-button"
                onClick={client.retry}
              >
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
      )}
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
      {copied && (
        <div className="copy-toast" role="status">
          <Check size={16} />
          {copied}
        </div>
      )}
      {entry && isLobby && (
        <Dialog
          title={
            entry === "create" ? "Mở một bàn cờ mới." : "Bạn đang được chờ."
          }
          description={
            entry === "create"
              ? "Một cái tên, một lời mời. Chừng đó là đủ."
              : "Nhập mã bạn nhận được để cùng ngồi vào bàn."
          }
          onClose={() => {
            setEntry(null);
            setFormError("");
          }}
        >
          <form className="entry-form" onSubmit={submitEntry}>
            <label htmlFor="nickname">
              Tên của bạn<span>Không bắt buộc</span>
            </label>
            <input
              id="nickname"
              name="nickname"
              autoComplete="nickname"
              maxLength={24}
              placeholder="Bạn muốn được gọi là gì?"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoFocus
            />
            {entry === "join" ? (
              <>
                <label htmlFor="room-code-input">Mã phòng</label>
                <input
                  id="room-code-input"
                  name="room"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  placeholder="ABC234"
                  value={codeInput}
                  maxLength={6}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={
                    formError ? "entry-error" : "room-code-hint"
                  }
                  onChange={(event) => {
                    setCodeInput(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, ""),
                    );
                    setFormError("");
                  }}
                  onPaste={(event) => {
                    const code = readCode(event.clipboardData.getData("text"));
                    if (validCode(code)) {
                      event.preventDefault();
                      setCodeInput(code);
                      setFormError("");
                    }
                  }}
                  className="room-code-input"
                />
                <p id="room-code-hint" className="input-hint">
                  Bạn có thể dán cả link mời vào ô này.
                </p>
              </>
            ) : (
              <>
                <fieldset className="choose-color">
                  <legend>Bạn muốn cầm quân nào?</legend>
                  <div>
                    {(["w", "b"] as const).map((color) => (
                      <button
                        type="button"
                        key={color}
                        aria-pressed={hostColor === color}
                        className={hostColor === color ? "active" : ""}
                        onClick={() => setHostColor(color)}
                      >
                        <ChessPieceIcon type="k" color={color} />
                        <span>
                          {color === "w" ? "Quân trắng" : "Quân đen"}
                          <small>
                            {color === "w"
                              ? "Đi trước một bước"
                              : "Đón một nước hay"}
                          </small>
                        </span>
                        {hostColor === color && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="choose-time">
                  <legend>Thời gian mỗi bên</legend>
                  <div>
                    {([60, 300, 600] as const).map((seconds) => (
                      <button
                        type="button"
                        key={seconds}
                        aria-pressed={timeControl === seconds}
                        className={timeControl === seconds ? "active" : ""}
                        onClick={() => setTimeControl(seconds)}
                      >
                        {seconds / 60} phút
                      </button>
                    ))}
                  </div>
                  <p>
                    Giờ bắt đầu khi đủ hai người. Không cộng giây sau mỗi nước.
                  </p>
                </fieldset>
              </>
            )}
            {formError && (
              <p className="form-error" id="entry-error" role="alert">
                {formError}
              </p>
            )}
            <button className="primary-button" type="submit">
              {entry === "create" ? "Tạo phòng & mời bạn" : "Ngồi vào bàn"}
              <ArrowRight size={18} />
            </button>
            <p className="form-note">
              Chơi trực tiếp với người bạn mời. Không cần đăng ký.
            </p>
          </form>
        </Dialog>
      )}
      {helpOpen && (
        <Dialog
          title="Hẹn nhau thật đơn giản."
          description="Hai người, hai thiết bị, một bàn cờ."
          onClose={() => setHelpOpen(false)}
          className="help-dialog"
        >
          <div className="help-step">
            <span>01</span>
            <div>
              <strong>Một người tạo phòng.</strong>
              <p>
                Chọn tên và màu quân, rồi gửi mã 6 ký tự hoặc link mời cho bạn.
              </p>
            </div>
          </div>
          <div className="help-step">
            <span>02</span>
            <div>
              <strong>Một người vào bàn.</strong>
              <p>
                Mở link mời hoặc chọn “Tham gia phòng” và nhập mã. Phòng chỉ
                nhận hai người.
              </p>
            </div>
          </div>
          <div className="help-step">
            <span>03</span>
            <div>
              <strong>Cùng đi một nước hay.</strong>
              <p>
                Chạm quân của bạn rồi chạm ô hợp lệ để đi. Trên máy tính, có thể
                kéo thả hoặc dùng phím mũi tên và Enter. Giữ trang mở; khi mạng
                gián đoạn, đồng hồ của ván tính giờ vẫn chạy. Giữ trang mở để
                kết nối lại.
              </p>
            </div>
          </div>
          <button className="primary-button" onClick={() => setHelpOpen(false)}>
            Mình hiểu rồi
            <ArrowRight size={18} />
          </button>
        </Dialog>
      )}
      {appearanceOpen && (
        <Dialog
          title="Một bàn cờ hợp ý."
          description="Chọn sắc màu khiến bạn muốn ngồi lại lâu hơn."
          onClose={() => setAppearanceOpen(false)}
        >
          <Controls currentTheme={theme} onSelectTheme={setTheme} />
        </Dialog>
      )}
      {historyOpen && (
        <Dialog
          title="Câu chuyện của ván cờ."
          description={`Phòng ${room.code} · Ván ${room.round + 1}`}
          onClose={() => setHistoryOpen(false)}
          className="history-dialog"
        >
          <MoveHistory history={game.moveHistory} onExport={exportPgn} />
        </Dialog>
      )}
      {shareOpen && (
        <Dialog
          title="Gửi bạn một lời mời."
          description="Chọn và sao chép link bên dưới để chia sẻ."
          onClose={() => setShareOpen(false)}
        >
          <label className="share-input-label" htmlFor="share-link">
            Link phòng {room.code}
          </label>
          <input
            id="share-link"
            className="share-input"
            readOnly
            value={shareUrl.href}
            onFocus={(event) => event.target.select()}
          />
          <p className="input-hint">
            Bạn chơi chỉ cần mở link và chọn “Ngồi vào bàn”.
          </p>
        </Dialog>
      )}
      {confirmation && (
        <Dialog
          title={
            confirmation === "leave"
              ? "Rời bàn cờ một chút?"
              : confirmation === "resign"
                ? "Khép lại ván cờ này?"
                : "Cập nhật Gambit?"
          }
          description={
            confirmation === "leave"
              ? "Kết nối với bạn chơi sẽ đóng. Hai người có thể hẹn nhau trong một phòng mới."
              : confirmation === "resign"
                ? "Đầu hàng sẽ ghi nhận chiến thắng cho bạn chơi. Hai người vẫn có thể mời nhau đấu lại."
                : "Trang sẽ tải lại để nhận phiên bản mới. Phiên phòng được giữ trên thiết bị để thử kết nối lại; bạn có thể tải PGN trước khi cập nhật."
          }
          onClose={() => setConfirmation(null)}
        >
          <div className="confirm-actions">
            {confirmation === "update" && game.moveHistory.length > 0 && (
              <button className="secondary-button" onClick={exportPgn}>
                <Download size={16} />
                Lưu biên bản PGN
              </button>
            )}
            <button
              className="primary-button"
              onClick={() => {
                if (confirmation === "leave") leave();
                else if (confirmation === "resign") {
                  client.command({ kind: "resign" });
                  setConfirmation(null);
                } else update.reload();
              }}
            >
              {confirmation === "leave"
                ? "Rời phòng"
                : confirmation === "resign"
                  ? "Xác nhận đầu hàng"
                  : "Cập nhật & kết nối lại"}
              <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmation(null)}
            >
              Ở lại bàn cờ
            </button>
          </div>
        </Dialog>
      )}
      {game.pendingPromotion && (
        <PromotionModal
          promotion={game.pendingPromotion}
          onSelect={game.completePromotion}
          onCancel={game.cancelPromotion}
        />
      )}
      {game.isGameOver &&
        !room.pendingMove &&
        !isLobby &&
        !resultDismissed &&
        !room.rematchBy && (
          <GameOverModal
            isCheckmate={game.isCheckmate}
            isStalemate={game.isStalemate}
            isThreefold={game.isThreefold}
            isInsufficientMaterial={game.isInsufficientMaterial}
            currentTurn={game.turn}
            resignationWinner={room.resignation?.winner}
            timeout={room.timeout}
            onNewGame={requestRematch}
            onReview={() => setResultDismissed(true)}
          />
        )}
      {room.rematchBy && room.rematchBy !== room.myColor && connected && (
        <Dialog
          title="Thêm một ván nữa nhé?"
          description={`${opponentName} mời bạn đấu lại. Hai người sẽ đổi màu quân và bắt đầu ván mới.`}
          onClose={() => {
            client.command({ kind: "rematch-answer", accept: false });
            setResultDismissed(true);
          }}
        >
          <button
            className="primary-button"
            onClick={() =>
              client.command({ kind: "rematch-answer", accept: true })
            }
          >
            Nhận lời mời
            <RotateCcw size={17} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              client.command({ kind: "rematch-answer", accept: false });
              setResultDismissed(true);
            }}
          >
            Để lần sau nhé
          </button>
        </Dialog>
      )}
    </div>
  );
}
export default App;

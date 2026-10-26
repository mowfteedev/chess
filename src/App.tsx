import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { useChessGame } from "./hooks/useChessGame";
import { usePreference } from "./hooks/usePreference";
import { APP_RELEASE, useAppUpdate } from "./hooks/useAppUpdate";
import { Lobby, WaitingRoom } from "./components/Lobby";
import { RoomNotifications } from "./components/RoomNotifications";
import { useRoomEvents } from "./hooks/useRoomEvents";
import {
  gamePgn,
  readCode,
  validCode,
  type TimeControl,
} from "./multiplayer/protocol";
import { SiteHeader, SiteFooter } from "./components/Layout";
import { GameScreen } from "./components/GameScreen";
import {
  RoomEntryDialog,
  RoomDialogs,
  useRoomDialogs,
} from "./components/RoomDialogs";
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
  const dialogs = useRoomDialogs(room.round, game.isGameOver);
  const {
    setHelpOpen,
    setAppearanceOpen,
    setShareOpen,
    setHistoryOpen,
    setConfirmation,
    setResultDismissed,
  } = dialogs;
  const [copied, setCopied] = useState("");
  const isLobby = room.status === "idle";
  const hasBoard =
    room.status === "connected" ||
    room.hasGuest ||
    room.moves.length > 0 ||
    (room.status === "reconnecting" && room.guestName !== "Bạn chơi");
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
  const requestLeave = () => {
    if (room.moves.length) setConfirmation("leave");
    else leave();
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
      <SiteHeader
        room={room}
        onLeave={requestLeave}
        onHelp={() => setHelpOpen(true)}
        onCopyCode={() => void copy(room.code, "Đã sao chép mã phòng")}
      />

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
        <GameScreen
          game={game}
          theme={theme}
          setTheme={setTheme}
          share={share}
          exportPgn={exportPgn}
          requestRematch={requestRematch}
          onAppearance={() => setAppearanceOpen(true)}
          onHistory={() => setHistoryOpen(true)}
          onHelp={() => setHelpOpen(true)}
          onResign={() => setConfirmation("resign")}
        />
      ) : (
        <WaitingRoom
          room={room}
          shareUrl={shareUrl.href}
          leave={leave}
          copy={copy}
          share={share}
          retry={client.retry}
        />
      )}
      <SiteFooter update={update} />
      {copied && (
        <div className="copy-toast" role="status">
          <Check size={16} />
          {copied}
        </div>
      )}
      {entry && isLobby && (
        <RoomEntryDialog
          entry={entry}
          nickname={nickname}
          hostColor={hostColor}
          timeControl={timeControl}
          codeInput={codeInput}
          formError={formError}
          setNickname={setNickname}
          setHostColor={setHostColor}
          setTimeControl={setTimeControl}
          setCodeInput={setCodeInput}
          setFormError={setFormError}
          onClose={() => {
            setEntry(null);
            setFormError("");
          }}
          submitEntry={submitEntry}
        />
      )}
      <RoomDialogs
        game={game}
        dialogs={dialogs}
        update={update}
        theme={theme}
        setTheme={setTheme}
        shareUrl={shareUrl}
        opponentName={opponentName}
        leave={leave}
        exportPgn={exportPgn}
        requestRematch={requestRematch}
      />
    </div>
  );
}
export default App;

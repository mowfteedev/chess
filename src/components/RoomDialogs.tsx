import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Download, RotateCcw } from "lucide-react";
import { Dialog } from "./Dialog";
import { Controls } from "./Controls";
import { MoveHistory } from "./MoveHistory";
import { PromotionModal } from "./PromotionModal";
import { GameOverModal } from "./GameOverModal";
import { ChessPieceIcon } from "./ChessPieceIcon";
import type { useChessGame } from "../hooks/useChessGame";
import type { useAppUpdate } from "../hooks/useAppUpdate";
import { readCode, validCode, type TimeControl } from "../multiplayer/protocol";
import type { BoardTheme, Color } from "../types/chess";

export type Confirmation = "leave" | "resign" | "update";
export function useRoomDialogs(round: number, isGameOver: boolean) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  useEffect(() => setResultDismissed(false), [round]);
  useEffect(() => {
    if (!isGameOver) setResultDismissed(false);
  }, [isGameOver]);
  return {
    helpOpen,
    setHelpOpen,
    appearanceOpen,
    setAppearanceOpen,
    shareOpen,
    setShareOpen,
    historyOpen,
    setHistoryOpen,
    confirmation,
    setConfirmation,
    resultDismissed,
    setResultDismissed,
  };
}

interface RoomEntryDialogProps {
  entry: "create" | "join";
  nickname: string;
  hostColor: Color;
  timeControl: TimeControl;
  codeInput: string;
  formError: string;
  setNickname: (value: string) => void;
  setHostColor: (value: Color) => void;
  setTimeControl: (value: TimeControl) => void;
  setCodeInput: (value: string) => void;
  setFormError: (value: string) => void;
  onClose: () => void;
  submitEntry: (event: FormEvent) => void;
}
export function RoomEntryDialog({
  entry,
  nickname,
  hostColor,
  timeControl,
  codeInput,
  formError,
  setNickname,
  setHostColor,
  setTimeControl,
  setCodeInput,
  setFormError,
  onClose,
  submitEntry,
}: RoomEntryDialogProps) {
  return (
    <Dialog
      title={entry === "create" ? "Mở một bàn cờ mới." : "Bạn đang được chờ."}
      description={
        entry === "create"
          ? "Một cái tên, một lời mời. Chừng đó là đủ."
          : "Nhập mã bạn nhận được để cùng ngồi vào bàn."
      }
      onClose={onClose}
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
              aria-describedby={formError ? "entry-error" : "room-code-hint"}
              onChange={(event) => {
                setCodeInput(
                  event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
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
              <p>Giờ bắt đầu khi đủ hai người. Không cộng giây sau mỗi nước.</p>
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
  );
}

interface RoomDialogsProps {
  game: ReturnType<typeof useChessGame>;
  dialogs: ReturnType<typeof useRoomDialogs>;
  update: ReturnType<typeof useAppUpdate>;
  theme: BoardTheme;
  setTheme: (theme: BoardTheme) => void;
  shareUrl: URL;
  opponentName: string;
  leave: () => void;
  exportPgn: () => void;
  requestRematch: () => void;
}
export function RoomDialogs({
  game,
  dialogs,
  update,
  theme,
  setTheme,
  shareUrl,
  opponentName,
  leave,
  exportPgn,
  requestRematch,
}: RoomDialogsProps) {
  const { room, client } = game,
    isLobby = room.status === "idle",
    connected = room.status === "connected";
  const {
    helpOpen,
    setHelpOpen,
    appearanceOpen,
    setAppearanceOpen,
    historyOpen,
    setHistoryOpen,
    shareOpen,
    setShareOpen,
    confirmation,
    setConfirmation,
    resultDismissed,
    setResultDismissed,
  } = dialogs;
  return (
    <>
      {" "}
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
                Chọn tên, màu quân và thời gian, rồi gửi mã 6 ký tự hoặc link
                mời cho bạn.
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
                kéo thả hoặc dùng phím mũi tên và Enter. Đồng hồ của ván tính
                giờ vẫn chạy khi mất kết nối. Giữ trang mở để kết nối lại.
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
    </>
  );
}

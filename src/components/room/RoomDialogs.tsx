import { ArrowRight, Download, RotateCcw } from "lucide-react";
import { Dialog } from "../Dialog";
import { Controls } from "../Controls";
import { MoveHistory } from "../MoveHistory";
import { PromotionModal } from "../PromotionModal";
import { GameOverModal } from "../GameOverModal";
import type { useChessGame } from "../../hooks/useChessGame";
import type { useRoomDialogs } from "../../hooks/useRoomDialogs";
import type { useAppUpdate } from "../../hooks/useAppUpdate";
import type { BoardTheme } from "../../types/chess";
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

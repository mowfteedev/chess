import type { FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Dialog } from "../Dialog";
import { ChessPieceIcon } from "../ChessPieceIcon";
import {
  readCode,
  validCode,
  type TimeControl,
} from "../../multiplayer/protocol";
import type { Color } from "../../types/chess";
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

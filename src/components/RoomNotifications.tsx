import { LogIn, LogOut, X } from "lucide-react";
import type { RoomNotice } from "../hooks/useRoomEvents";
import "./RoomNotifications.css";

export function RoomNotifications({
  notice,
  onDismiss,
}: {
  notice: RoomNotice | null;
  onDismiss: () => void;
}) {
  return (
    <div
      className="room-notifications"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {notice && (
        <div
          className={`room-notice room-notice--${notice.kind}`}
          key={notice.id}
          data-testid="room-notification"
        >
          <span className="room-notice__icon" aria-hidden="true">
            {notice.kind === "leave" ? (
              <LogOut size={19} />
            ) : (
              <LogIn size={19} />
            )}
          </span>
          <div className="room-notice__content">
            <strong>{notice.message}</strong>
            <span>
              {notice.kind === "leave"
                ? "Mình đợi bạn kết nối lại nhé."
                : "Hẹn nhau một ván cờ hay."}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="room-notice__dismiss"
            aria-label="Ẩn thông báo vào/rời bàn"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

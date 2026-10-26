import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { clockRemaining, type GameState } from "../multiplayer/protocol";
import type { Color } from "../types/chess";

export function GameClock({
  game,
  color,
  now,
  onExpired,
}: {
  game: GameState;
  color: Color;
  now: () => number;
  onExpired: () => void;
}) {
  const [, tick] = useState(0);
  const running =
    Boolean(game.clock?.runningSince) &&
    !game.timeout &&
    !game.resignation &&
    (game.moves.length % 2 === 0 ? "w" : "b") === color;
  const remaining = clockRemaining(game, now())[color];
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      tick((value) => value + 1);
      if (clockRemaining(game, now())[color] <= 0) onExpired();
    }, 100);
    return () => window.clearInterval(timer);
  }, [game, color, running, now, onExpired]);
  if (!game.clock) return null;
  const seconds = Math.ceil(remaining / 1000);
  const text = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <div
      className={`game-clock ${running ? "running" : ""} ${remaining < 10000 ? "low-time" : ""}`}
      data-testid={`clock-${color}`}
      aria-label={`Đồng hồ quân ${color === "w" ? "trắng" : "đen"}`}
      role="timer"
      aria-live="off"
      title={running ? "Đồng hồ đang chạy" : "Đồng hồ đang dừng"}
    >
      <Clock3 size={13} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

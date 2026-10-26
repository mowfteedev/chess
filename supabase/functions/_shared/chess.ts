import { Chess } from "chess.js";
import type { Color, PieceSymbol as PieceType, Square } from "chess.js";

export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export type RoomStatus =
  "idle" | "opening" | "waiting" | "connected" | "reconnecting" | "error";
export type RoomRole = "host" | "guest";
export type TimeControl = 60 | 300 | 600;
export interface GameClock {
  initialMs: number;
  whiteMs: number;
  blackMs: number;
  runningSince: number | null;
}
export interface TimeoutResult {
  winner: Color | null;
}
export interface Resignation {
  winner: Color;
  kind: "resign";
}
export interface GameState {
  round: number;
  moves: string[];
  hostColor: Color;
  hostName: string;
  guestName: string;
  resignation: Resignation | null;
  rematchBy: Color | null;
  clock?: GameClock | null;
  timeout?: TimeoutResult | null;
}
export interface RoomState extends GameState {
  status: RoomStatus;
  role: RoomRole | null;
  code: string;
  myColor: Color;
  error: string | null;
  pendingMove: boolean;
  opponentPresent: boolean;
  hasGuest: boolean;
}
export type MoveInput = { from: Square; to: Square; promotion?: PieceType };
export type Command =
  | { kind: "move"; move: MoveInput }
  | { kind: "resign" }
  | { kind: "rematch" }
  | { kind: "rematch-answer"; accept: boolean }
  | { kind: "claim-timeout" };
export const opposite = (color: Color): Color => (color === "w" ? "b" : "w");
export const cleanName = (name: string) =>
  name.trim().replace(/\s+/g, " ").slice(0, 24) || "Người chơi";
export function generateCode() {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (value) => ROOM_ALPHABET[value % 32],
  ).join("");
}
export function readCode(value: string) {
  let code = value.trim();
  try {
    code = new URLSearchParams(new URL(code).hash.slice(1)).get("room") ?? code;
  } catch {
    /* A bare code is expected too. */
  }
  return code.toUpperCase();
}
export const validCode = (value: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const color = (value: unknown): value is Color =>
  value === "w" || value === "b";
const integer = (value: unknown, max = 2048): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= max;
const name = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 24;
export const validToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9-]{16,80}$/.test(value);
const square = (value: unknown): value is Square =>
  typeof value === "string" && /^[a-h][1-8]$/.test(value);
export const isTimeControl = (value: unknown): value is TimeControl =>
  value === 60 || value === 300 || value === 600;

export function isGameClock(value: unknown): value is GameClock {
  return (
    record(value) &&
    typeof value.initialMs === "number" &&
    [60000, 300000, 600000].includes(value.initialMs) &&
    integer(value.whiteMs, value.initialMs) &&
    integer(value.blackMs, value.initialMs) &&
    (value.runningSince === null ||
      integer(value.runningSince, Number.MAX_SAFE_INTEGER))
  );
}

export function isGameState(value: unknown): value is GameState {
  if (
    !record(value) ||
    !integer(value.round, 10000) ||
    !color(value.hostColor) ||
    !name(value.hostName) ||
    !name(value.guestName)
  )
    return false;
  if (
    !Array.isArray(value.moves) ||
    value.moves.length > 2048 ||
    !value.moves.every(
      (move) =>
        typeof move === "string" && move.length > 0 && move.length <= 16,
    )
  )
    return false;
  if (value.rematchBy !== null && !color(value.rematchBy)) return false;
  if (value.clock != null && !isGameClock(value.clock)) return false;
  if (
    value.timeout != null &&
    (!record(value.timeout) ||
      (value.timeout.winner !== null && !color(value.timeout.winner)))
  )
    return false;
  return (
    value.resignation === null ||
    (record(value.resignation) &&
      value.resignation.kind === "resign" &&
      color(value.resignation.winner))
  );
}
export function isCommand(value: unknown): value is Command {
  if (!record(value)) return false;
  if (
    value.kind === "resign" ||
    value.kind === "rematch" ||
    value.kind === "claim-timeout"
  )
    return true;
  if (value.kind === "rematch-answer") return typeof value.accept === "boolean";
  return (
    value.kind === "move" &&
    record(value.move) &&
    square(value.move.from) &&
    square(value.move.to) &&
    (value.move.promotion === undefined ||
      (typeof value.move.promotion === "string" &&
        ["q", "r", "b", "n"].includes(value.move.promotion)))
  );
}
export function replayGame(game: GameState) {
  const chess = new Chess();
  for (const san of game.moves) {
    if (chess.isGameOver()) throw new Error("Moves after game over");
    const move = chess.move(san);
    if (!move || move.san !== san) throw new Error("Invalid move history");
  }
  if ((game.resignation || game.timeout) && chess.isGameOver())
    throw new Error("Conflicting results");
  if (game.resignation && game.timeout) throw new Error("Conflicting results");
  return chess;
}

export function clockRemaining(
  game: GameState,
  now: number,
): { w: number; b: number } {
  const clock = game.clock;
  if (!clock) return { w: 0, b: 0 };
  const remaining = { w: clock.whiteMs, b: clock.blackMs };
  if (clock.runningSince !== null && !game.resignation && !game.timeout) {
    const turn = game.moves.length % 2 === 0 ? "w" : "b";
    remaining[turn] = Math.max(
      0,
      remaining[turn] - Math.max(0, Math.floor(now - clock.runningSince)),
    );
  }
  return remaining;
}

export function winnerOnTime(game: GameState): Color | null {
  const chess = replayGame(game);
  const winner = opposite(chess.turn());
  if (chess.isInsufficientMaterial()) return null;
  // A bare king can never deliver mate, even with the opponent's help.
  return chess
    .board()
    .flat()
    .some((piece) => piece?.color === winner && piece.type !== "k")
    ? winner
    : null;
}

export function gamePgn(game: GameState) {
  const chess = replayGame(game);
  const winner =
    game.resignation?.winner ??
    game.timeout?.winner ??
    (chess.isCheckmate() ? opposite(chess.turn()) : null);
  const result =
    winner === "w"
      ? "1-0"
      : winner === "b"
        ? "0-1"
        : chess.isDraw() || game.timeout
          ? "1/2-1/2"
          : "*";
  chess.header(
    "Event",
    "Gambit friendly game",
    "White",
    game.hostColor === "w" ? game.hostName : game.guestName,
    "Black",
    game.hostColor === "b" ? game.hostName : game.guestName,
    "Round",
    String(game.round + 1),
    "Result",
    result,
  );
  if (game.clock)
    chess.header("TimeControl", String(game.clock.initialMs / 1000));
  if (game.timeout) chess.header("Termination", "time forfeit");
  return chess.pgn();
}

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export function initialGame(
  hostName: string,
  hostColor: Color,
  timeControl?: TimeControl,
): GameState {
  return {
    round: 0,
    moves: [],
    hostColor,
    hostName: cleanName(hostName),
    guestName: "Bạn chơi",
    resignation: null,
    rematchBy: null,
    ...(timeControl
      ? {
          clock: {
            initialMs: timeControl * 1000,
            whiteMs: timeControl * 1000,
            blackMs: timeControl * 1000,
            runningSince: null,
          },
          timeout: null,
        }
      : {}),
  };
}
export function applyCommand(
  game: GameState,
  actor: Color,
  command: Command,
  now = Date.now(),
): GameState {
  if (!isCommand(command))
    throw new GameError("invalid_command", "Yêu cầu chưa hợp lệ.", 400);
  const chess = replayGame(game);
  const finished =
    chess.isGameOver() || Boolean(game.resignation) || Boolean(game.timeout);
  if (!finished && game.clock && game.clock.runningSince !== null) {
    const remaining = clockRemaining(game, now);
    if (remaining[chess.turn()] === 0)
      return {
        ...game,
        clock: {
          ...game.clock,
          whiteMs: remaining.w,
          blackMs: remaining.b,
          runningSince: null,
        },
        timeout: { winner: winnerOnTime(game) },
        rematchBy: null,
      };
  }
  if (command.kind === "claim-timeout") {
    if (game.timeout) return game;
    throw new GameError("clock_running", "Đồng hồ chưa hết giờ.");
  }
  const withClock = (next: GameState, stop: boolean): GameState => {
    if (!game.clock) return next;
    const remaining = clockRemaining(game, now);
    return {
      ...next,
      clock: {
        ...game.clock,
        whiteMs: remaining.w,
        blackMs: remaining.b,
        runningSince: stop ? null : now,
      },
    };
  };
  if (command.kind === "move") {
    if (finished) throw new GameError("game_finished", "Ván đấu đã kết thúc.");
    if (game.clock && game.clock.runningSince === null)
      throw new GameError(
        "game_not_started",
        "Đợi người thứ hai vào bàn để bắt đầu nhé.",
      );
    if (chess.turn() !== actor)
      throw new GameError("wrong_turn", "Chưa đến lượt của bạn.");
    if (game.moves.length >= 2048)
      throw new GameError(
        "game_limit",
        "Ván đấu đã đạt giới hạn lưu biên bản.",
      );
    try {
      const moved = chess.move({
        ...command.move,
        promotion: command.move.promotion ?? "q",
      });
      if (!moved) throw new Error("Invalid move");
    } catch {
      throw new GameError(
        "illegal_move",
        "Nước đi chưa hợp lệ. Bạn chọn lại quân nhé.",
        422,
      );
    }
    return withClock({ ...game, moves: chess.history() }, chess.isGameOver());
  }
  if (command.kind === "resign") {
    if (finished) throw new GameError("game_finished", "Ván đấu đã kết thúc.");
    return withClock(
      {
        ...game,
        resignation: { kind: "resign", winner: opposite(actor) },
        rematchBy: null,
      },
      true,
    );
  }
  if (!finished)
    throw new GameError(
      "game_in_progress",
      "Đấu lại sau khi ván hiện tại kết thúc nhé.",
    );
  const reset = () => ({
    ...game,
    round: game.round + 1,
    hostColor: opposite(game.hostColor),
    moves: [],
    resignation: null,
    rematchBy: null,
    timeout: null,
    ...(game.clock
      ? {
          clock: {
            initialMs: game.clock.initialMs,
            whiteMs: game.clock.initialMs,
            blackMs: game.clock.initialMs,
            runningSince: now,
          },
        }
      : {}),
  });
  if (command.kind === "rematch")
    return game.rematchBy && game.rematchBy !== actor
      ? reset()
      : { ...game, rematchBy: actor };
  if (!game.rematchBy || game.rematchBy === actor)
    throw new GameError("no_offer", "Chưa có lời mời đấu lại từ bạn chơi.");
  return command.accept ? reset() : { ...game, rematchBy: null };
}

export interface RoomRecord {
  code: string;
  host_uid: string;
  guest_uid: string | null;
  game: GameState;
  revision: number;
  host_seen: string;
  guest_seen: string | null;
  host_left: boolean;
  guest_left: boolean;
  created_at: string;
  expires_at: string;
}
export interface RoomSnapshot {
  code: string;
  game: GameState;
  revision: number;
  role: RoomRole;
  hostPresent: boolean;
  guestPresent: boolean;
  serverNow?: number;
  hasGuest?: boolean;
}
export function roomSnapshot(
  room: RoomRecord,
  userId: string,
  now = Date.now(),
): RoomSnapshot {
  if (userId !== room.host_uid && userId !== room.guest_uid)
    throw new GameError("not_member", "Bạn chưa thuộc phòng này.", 403);
  if (Date.parse(room.expires_at) <= now)
    throw new GameError(
      "room_expired",
      "Phòng đã hết hạn. Hai người tạo phòng mới nhé.",
      410,
    );
  return {
    code: room.code,
    game: room.game,
    revision: room.revision,
    role: userId === room.host_uid ? "host" : "guest",
    serverNow: now,
    hasGuest: room.guest_uid !== null,
    hostPresent: !room.host_left && now - Date.parse(room.host_seen) < 45000,
    guestPresent: Boolean(
      room.guest_uid &&
      !room.guest_left &&
      room.guest_seen &&
      now - Date.parse(room.guest_seen) < 45000,
    ),
  };
}
export function isRoomRecord(value: unknown): value is RoomRecord {
  if (!record(value)) return false;
  return (
    typeof value.code === "string" &&
    validCode(value.code) &&
    typeof value.host_uid === "string" &&
    (value.guest_uid === null || typeof value.guest_uid === "string") &&
    isGameState(value.game) &&
    integer(value.revision, Number.MAX_SAFE_INTEGER) &&
    typeof value.host_seen === "string" &&
    (value.guest_seen === null || typeof value.guest_seen === "string") &&
    typeof value.host_left === "boolean" &&
    typeof value.guest_left === "boolean" &&
    typeof value.expires_at === "string"
  );
}

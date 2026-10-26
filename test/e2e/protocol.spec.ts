import { test, expect } from "@playwright/test";
import {
  applyCommand,
  clockRemaining,
  gamePgn,
  initialGame,
  isCommand,
  isGameState,
  isTimeControl,
  readCode,
  replayGame,
  roomSnapshot,
  validCode,
  type GameState,
  type RoomRecord,
} from "../../src/multiplayer/protocol";
const state = (): GameState => ({
  round: 0,
  moves: [],
  hostColor: "w",
  hostName: "Minh",
  guestName: "An",
  resignation: null,
  rematchBy: null,
});
test("commands reject invalid coordinates, promotion types and oversized history", () => {
  expect(isCommand({ kind: "move", move: { from: "e2", to: "e4" } })).toBe(
    true,
  );
  expect(isCommand({ kind: "move", move: { from: "z9", to: "e4" } })).toBe(
    false,
  );
  expect(
    isCommand({
      kind: "move",
      move: { from: "e7", to: "e8", promotion: ["q"] },
    }),
  ).toBe(false);
  expect(isGameState({ ...state(), moves: Array(2049).fill("e4") })).toBe(
    false,
  );
});
test("authoritative game transition rejects illegal moves and wrong turns", () => {
  expect(() =>
    applyCommand(state(), "b", {
      kind: "move",
      move: { from: "e7", to: "e5" },
    }),
  ).toThrow("Chưa đến lượt");
  expect(() =>
    applyCommand(state(), "w", {
      kind: "move",
      move: { from: "e2", to: "e5" },
    }),
  ).toThrow("chưa hợp lệ");
  expect(
    applyCommand(state(), "w", { kind: "move", move: { from: "e2", to: "e4" } })
      .moves,
  ).toEqual(["e4"]);
  expect(() => applyCommand(state(), "w", { kind: "rematch" })).toThrow(
    "Đấu lại sau",
  );
});
test("snapshot replay rejects illegal and post-game moves", () => {
  expect(() => replayGame({ ...state(), moves: ["e5"] })).toThrow();
  expect(() =>
    replayGame({ ...state(), moves: ["f3", "e5", "g4", "Qh4#", "a3"] }),
  ).toThrow();
  expect(() =>
    replayGame({
      ...state(),
      moves: ["f3", "e5", "g4", "Qh4#"],
      resignation: { kind: "resign", winner: "w" },
    }),
  ).toThrow();
});
test("PGN records names, round and resignation result", () => {
  const pgn = gamePgn({
    ...state(),
    round: 1,
    hostColor: "b",
    moves: ["e4", "e5"],
    resignation: { kind: "resign", winner: "b" },
  });
  expect(pgn).toContain('[White "An"]');
  expect(pgn).toContain('[Black "Minh"]');
  expect(pgn).toContain('[Round "2"]');
  expect(pgn).toContain("1. e4 e5 0-1");
});
test("room codes support invitation links and reject ambiguous characters", () => {
  expect(readCode("ab2345")).toBe("AB2345");
  expect(readCode("https://example.com/chess/?v=release#room=AB2345")).toBe(
    "AB2345",
  );
  expect(validCode("ABC234")).toBe(true);
  expect(validCode("ABC0O1")).toBe(false);
});
test("server snapshot enforces membership and expiry", () => {
  const row: RoomRecord = {
    code: "ABC234",
    host_uid: "host",
    guest_uid: "guest",
    game: state(),
    revision: 1,
    host_seen: new Date().toISOString(),
    guest_seen: new Date().toISOString(),
    host_left: false,
    guest_left: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60000).toISOString(),
  };
  expect(roomSnapshot(row, "host").guestPresent).toBe(true);
  expect(() => roomSnapshot(row, "third")).toThrow("chưa thuộc phòng");
  expect(() =>
    roomSnapshot({ ...row, expires_at: "2000-01-01T00:00:00Z" }, "host"),
  ).toThrow("hết hạn");
});

test("timed games accept only supported presets and preserve legacy untimed games", () => {
  for (const seconds of [60, 300, 600] as const) {
    const game = initialGame("Minh", "w", seconds);
    expect(game.clock).toEqual({
      initialMs: seconds * 1000,
      whiteMs: seconds * 1000,
      blackMs: seconds * 1000,
      runningSince: null,
    });
    expect(isGameState(game)).toBe(true);
  }
  expect(initialGame("Minh", "w").clock).toBeUndefined();
  expect(isTimeControl(123)).toBe(false);
  expect(isTimeControl("60")).toBe(false);
  expect(
    isGameState({
      ...state(),
      clock: {
        initialMs: 60000,
        whiteMs: -1,
        blackMs: 60000,
        runningSince: null,
      },
    }),
  ).toBe(false);
});

test("only the active clock counts down and moving switches the running side", () => {
  const waiting = initialGame("Minh", "w", 60);
  expect(clockRemaining(waiting, 10000)).toEqual({ w: 60000, b: 60000 });
  expect(() =>
    applyCommand(
      waiting,
      "w",
      { kind: "move", move: { from: "e2", to: "e4" } },
      10000,
    ),
  ).toThrow("Đợi người thứ hai");
  const game = { ...waiting, clock: { ...waiting.clock!, runningSince: 1000 } };
  expect(clockRemaining(game, 3500)).toEqual({ w: 57500, b: 60000 });
  const moved = applyCommand(
    game,
    "w",
    { kind: "move", move: { from: "e2", to: "e4" } },
    3500,
  );
  expect(moved.moves).toEqual(["e4"]);
  expect(clockRemaining(moved, 5500)).toEqual({ w: 57500, b: 58000 });
  expect(clockRemaining(moved, 3000)).toEqual({ w: 57500, b: 60000 });
});

test("early timeout claims fail and a move at flag fall cannot change the board", () => {
  const initial = initialGame("Minh", "w", 60);
  const game = { ...initial, clock: { ...initial.clock!, runningSince: 1000 } };
  expect(() =>
    applyCommand(game, "b", { kind: "claim-timeout" }, 60999),
  ).toThrow("Đồng hồ chưa hết giờ");
  const flagged = applyCommand(
    game,
    "w",
    { kind: "move", move: { from: "e2", to: "e4" } },
    61000,
  );
  expect(flagged.moves).toEqual([]);
  expect(flagged.timeout).toEqual({ winner: "b" });
  expect(flagged.clock).toEqual({
    initialMs: 60000,
    whiteMs: 0,
    blackMs: 60000,
    runningSince: null,
  });
  const claimed = applyCommand(game, "b", { kind: "claim-timeout" }, 62000);
  expect(claimed).toEqual(flagged);
  expect(gamePgn(claimed)).toContain('[TimeControl "60"]');
  expect(gamePgn(claimed)).toContain('[Termination "time forfeit"]');
  expect(gamePgn(claimed)).toContain("0-1");
});

test("resignation stops time and only accepted rematch resets both clocks", () => {
  const initial = initialGame("Minh", "w", 300);
  const game = { ...initial, clock: { ...initial.clock!, runningSince: 1000 } };
  const resigned = applyCommand(game, "w", { kind: "resign" }, 3500);
  expect(clockRemaining(resigned, 999999)).toEqual({ w: 297500, b: 300000 });
  const offered = applyCommand(resigned, "w", { kind: "rematch" }, 4000);
  expect(offered.clock).toEqual(resigned.clock);
  const declined = applyCommand(
    offered,
    "b",
    { kind: "rematch-answer", accept: false },
    5000,
  );
  expect(declined.clock).toEqual(resigned.clock);
  const offeredAgain = applyCommand(declined, "w", { kind: "rematch" }, 6000);
  const accepted = applyCommand(
    offeredAgain,
    "b",
    { kind: "rematch-answer", accept: true },
    7000,
  );
  expect(accepted.round).toBe(1);
  expect(accepted.hostColor).toBe("b");
  expect(accepted.clock).toEqual({
    initialMs: 300000,
    whiteMs: 300000,
    blackMs: 300000,
    runningSince: 7000,
  });
  expect(accepted.timeout).toBeNull();
});

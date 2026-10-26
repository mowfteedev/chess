import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  Color,
  PieceType,
  Square,
  PendingPromotion,
  CapturedPieceGroup,
} from "../types/chess";
import { RoomClient } from "../multiplayer/RoomClient";
import { sounds } from "../utils/sound";
import { usePreference } from "./usePreference";

const VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function useChessGame(inviteCode?: string) {
  const [client] = useState(() => new RoomClient());
  const room = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = usePreference(
    "sound",
    true,
    (value): value is boolean => typeof value === "boolean",
  );
  const previous = useRef({ round: 0, moves: 0 });
  const previousResult = useRef({ code: "", round: 0, finished: false });
  useEffect(() => {
    client.restore(inviteCode);
    const onHide = () => client.dispose();
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) client.restore(inviteCode);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") client.wake();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", client.wake);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", client.wake);
      document.removeEventListener("visibilitychange", onVisible);
      client.dispose();
    };
  }, [client, inviteCode]);
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);
  useEffect(() => {
    setIsFlipped(room.myColor === "b");
  }, [room.myColor, room.code]);
  useEffect(() => {
    setSelectedSquare(null);
    setValidMoves([]);
    setPendingPromotion(null);
  }, [room.moves, room.round, room.status]);

  const position = useMemo(() => {
    const chess = client.chess;
    const history = chess.history({ verbose: true });
    const captured: Record<Color, CapturedPieceGroup[]> = { w: [], b: [] };
    for (const color of ["w", "b"] as const)
      for (const type of ["p", "n", "b", "r", "q"] as const) {
        const count = history.filter(
          (move) => move.captured === type && move.color !== color,
        ).length;
        if (count) captured[color].push({ color, type, count });
      }
    let materialAdvantage = 0;
    let kingInCheckSquare: Square | null = null;
    const isCheck = chess.inCheck();
    for (const row of chess.board())
      for (const piece of row) {
        if (!piece) continue;
        materialAdvantage +=
          VALUES[piece.type] * (piece.color === "w" ? 1 : -1);
        if (isCheck && piece.type === "k" && piece.color === chess.turn())
          kingInCheckSquare = piece.square;
      }
    const last = history[history.length - 1];
    return {
      chess,
      turn: chess.turn(),
      isCheck,
      kingInCheckSquare,
      materialAdvantage,
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      isThreefold: chess.isThreefoldRepetition(),
      isInsufficientMaterial: chess.isInsufficientMaterial(),
      isGameOver:
        chess.isGameOver() ||
        Boolean(room.resignation) ||
        Boolean(room.timeout),
      lastMove: last ? { from: last.from, to: last.to } : null,
      moveHistory: history.map((move) => ({
        san: move.san,
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
      })),
      capturedWhite: captured.w,
      capturedBlack: captured.b,
    };
  }, [client, room.moves, room.round, room.resignation, room.timeout]);

  useEffect(() => {
    const current = { round: room.round, moves: room.moves.length };
    const play =
      current.round === previous.current.round &&
      current.moves === previous.current.moves + 1;
    previous.current = current;
    if (!play) return;
    if (position.isGameOver) return;
    if (position.isCheck) sounds.playCheck();
    else if (position.moveHistory[position.moveHistory.length - 1]?.captured)
      sounds.playCapture();
    else if (["O-O", "O-O-O"].includes(room.moves[room.moves.length - 1]))
      sounds.playCastle();
    else if (position.turn === room.myColor) sounds.playYourTurn();
    else sounds.playMove();
  }, [room.round, room.moves.length, position]);

  useEffect(() => {
    if (room.pendingMove) return;
    const before = previousResult.current;
    if (
      before.code === room.code &&
      before.round === room.round &&
      !before.finished &&
      position.isGameOver
    )
      sounds.playVictory();
    previousResult.current = {
      code: room.code,
      round: room.round,
      finished: position.isGameOver,
    };
  }, [room.code, room.round, room.pendingMove, position.isGameOver]);

  const canInteract =
    (room.status === "connected" ||
      (room.status === "reconnecting" &&
        !room.error &&
        room.hasGuest &&
        Boolean(room.clock))) &&
    !room.pendingMove &&
    !position.isGameOver &&
    position.turn === room.myColor;
  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      if (!canInteract || pendingPromotion) return false;
      const chess = client.chess;
      const piece = chess.get(from);
      if (!piece || piece.color !== room.myColor) return false;
      const legal = chess
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to);
      if (!legal) return false;
      if (piece.type === "p" && (to.endsWith("1") || to.endsWith("8"))) {
        setPendingPromotion({ from, to, color: piece.color });
        return true;
      }
      return client.move({ from, to });
    },
    [canInteract, pendingPromotion, client, room.myColor],
  );
  const selectSquare = useCallback(
    (square: Square) => {
      if (!canInteract || pendingPromotion) return;
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
      if (selectedSquare && validMoves.includes(square)) {
        handleMoveAttempt(selectedSquare, square);
        return;
      }
      const piece = client.chess.get(square);
      if (piece?.color === room.myColor) {
        setSelectedSquare(square);
        setValidMoves([
          ...new Set(
            client.chess
              .moves({ square, verbose: true })
              .map((move) => move.to),
          ),
        ]);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [
      canInteract,
      pendingPromotion,
      selectedSquare,
      validMoves,
      handleMoveAttempt,
      client,
      room.myColor,
    ],
  );
  const cancelPromotion = () => {
    setPendingPromotion(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };
  const completePromotion = (piece: PieceType) => {
    if (canInteract && pendingPromotion && ["q", "r", "b", "n"].includes(piece))
      client.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: piece,
      });
    cancelPromotion();
  };
  return {
    ...position,
    client,
    room,
    selectedSquare,
    validMoves,
    pendingPromotion,
    isFlipped,
    soundEnabled,
    canInteract,
    selectSquare,
    handleMoveAttempt,
    completePromotion,
    cancelPromotion,
    toggleFlip: () => setIsFlipped((value) => !value),
    toggleSound: () => {
      const next = !soundEnabled;
      sounds.setEnabled(next);
      if (next) {
        sounds.unlock();
        sounds.playMove();
      }
      setSoundEnabled(next);
    },
  };
}

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Chess } from 'chess.js'
import type {
  Square,
  Color,
  PieceType,
  GameMode,
  BotDifficulty,
  MoveLogItem,
  CapturedPieceGroup,
  PendingPromotion,
} from '../types/chess'
import { sounds } from '../utils/sound'
import { usePreference } from './usePreference'
import type { BotResponse } from '../workers/chess.worker'

const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export function useChessGame() {
  const [chess] = useState(() => new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [validMoves, setValidMoves] = useState<Square[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>('vs-bot')
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [soundEnabled, setSoundEnabled] = usePreference(
    'sound',
    true,
    (value): value is boolean => typeof value === 'boolean',
  )
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [botError, setBotError] = useState(false)
  const [botRetry, setBotRetry] = useState(0)

  useEffect(() => {
    sounds.setEnabled(soundEnabled)
  }, [soundEnabled])

  const position = useMemo(() => {
    const board = chess.board()
    const history = chess.history({ verbose: true })
    const moveHistory: MoveLogItem[] = history.map((move) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      piece: move.piece,
      color: move.color,
      captured: move.captured,
    }))
    const captured: Record<Color, CapturedPieceGroup[]> = { w: [], b: [] }
    for (const color of ['w', 'b'] as const) {
      for (const type of ['p', 'n', 'b', 'r', 'q'] as const) {
        const count = history.filter(
          (move) => move.captured === type && move.color !== color,
        ).length
        if (count) captured[color].push({ type, color, count })
      }
    }
    let materialAdvantage = 0
    let kingInCheckSquare: Square | null = null
    const isCheck = chess.inCheck()
    for (const row of board) {
      for (const piece of row) {
        if (!piece) continue
        materialAdvantage += PIECE_VALUES[piece.type] * (piece.color === 'w' ? 1 : -1)
        if (isCheck && piece.type === 'k' && piece.color === chess.turn())
          kingInCheckSquare = piece.square
      }
    }
    const last = history[history.length - 1]
    return {
      board,
      moveHistory,
      materialAdvantage,
      kingInCheckSquare,
      lastMove: last ? { from: last.from, to: last.to } : null,
      capturedWhite: captured.w,
      capturedBlack: captured.b,
      turn: chess.turn(),
      isCheck,
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      isThreefold: chess.isThreefoldRepetition(),
      isInsufficientMaterial: chess.isInsufficientMaterial(),
      isGameOver: chess.isGameOver(),
    }
  }, [chess, fen])

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setValidMoves([])
  }, [])

  const executeMove = useCallback(
    (from: Square, to: Square, promotion: PieceType = 'q') => {
      try {
        const move = chess.move({ from, to, promotion })
        if (!move) return false
        setFen(chess.fen())
        clearSelection()
        if (chess.isGameOver()) sounds.playVictory()
        else if (chess.inCheck()) sounds.playCheck()
        else if (move.flags.includes('k') || move.flags.includes('q')) sounds.playCastle()
        else if (move.captured) sounds.playCapture()
        else sounds.playMove()
        return true
      } catch {
        return false
      }
    },
    [chess, clearSelection],
  )

  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      if (
        pendingPromotion ||
        chess.isGameOver() ||
        (gameMode === 'vs-bot' && chess.turn() !== playerColor)
      )
        return false
      const piece = chess.get(from)
      if (!piece || piece.color !== chess.turn()) return false
      if (piece.type === 'p' && (to.endsWith('8') || to.endsWith('1'))) {
        if (!chess.moves({ square: from, verbose: true }).some((move) => move.to === to))
          return false
        setPendingPromotion({ from, to, color: piece.color })
        return true
      }
      return executeMove(from, to)
    },
    [chess, pendingPromotion, gameMode, playerColor, executeMove],
  )

  const selectSquare = useCallback(
    (square: Square) => {
      if (
        pendingPromotion ||
        chess.isGameOver() ||
        (gameMode === 'vs-bot' && chess.turn() !== playerColor)
      )
        return
      if (selectedSquare === square) {
        clearSelection()
        return
      }
      if (selectedSquare && validMoves.includes(square)) {
        handleMoveAttempt(selectedSquare, square)
        return
      }
      const piece = chess.get(square)
      if (piece?.color === chess.turn()) {
        setSelectedSquare(square)
        setValidMoves([...new Set(chess.moves({ square, verbose: true }).map((move) => move.to))])
      } else clearSelection()
    },
    [
      chess,
      pendingPromotion,
      gameMode,
      playerColor,
      selectedSquare,
      validMoves,
      handleMoveAttempt,
      clearSelection,
    ],
  )

  const completePromotion = useCallback(
    (piece: PieceType) => {
      if (pendingPromotion && ['q', 'r', 'b', 'n'].includes(piece)) {
        executeMove(pendingPromotion.from, pendingPromotion.to, piece)
        setPendingPromotion(null)
      }
    },
    [pendingPromotion, executeMove],
  )

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
    clearSelection()
  }, [clearSelection])

  const undoMove = useCallback(() => {
    if (pendingPromotion) {
      cancelPromotion()
      return
    }
    const history = chess.history({ verbose: true })
    if (
      !history.length ||
      (gameMode === 'vs-bot' && !history.some((move) => move.color === playerColor))
    )
      return
    chess.undo()
    // Return control to the human when the bot has already replied.
    if (gameMode === 'vs-bot' && chess.turn() !== playerColor && chess.history().length)
      chess.undo()
    setFen(chess.fen())
    clearSelection()
    sounds.playMove()
  }, [chess, pendingPromotion, cancelPromotion, gameMode, playerColor, clearSelection])

  const resetGame = useCallback(() => {
    chess.reset()
    setFen(chess.fen())
    setPendingPromotion(null)
    clearSelection()
    sounds.playMove()
  }, [chess, clearSelection])

  useEffect(() => {
    clearSelection()
    setPendingPromotion(null)
    if (gameMode === 'vs-bot') setIsFlipped(playerColor === 'b')
  }, [gameMode, playerColor, clearSelection])

  useEffect(() => {
    setBotError(false)
    if (
      gameMode !== 'vs-bot' ||
      chess.turn() === playerColor ||
      chess.isGameOver() ||
      pendingPromotion
    ) {
      setIsBotThinking(false)
      return
    }
    setIsBotThinking(true)
    let worker: Worker | undefined
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../workers/chess.worker.ts', import.meta.url), {
          type: 'module',
        })
        worker.onmessage = (event: MessageEvent<BotResponse>) => {
          if (chess.fen() !== fen) return
          const { move, error } = event.data
          const moved = move && executeMove(move.from, move.to, move.promotion)
          setBotError(Boolean(error) || !moved)
          setIsBotThinking(false)
          worker?.terminate()
        }
        worker.onerror = () => {
          setBotError(true)
          setIsBotThinking(false)
          worker?.terminate()
        }
        worker.postMessage({ fen, difficulty: botDifficulty })
      } catch {
        setBotError(true)
        setIsBotThinking(false)
      }
    }, 240)
    return () => {
      window.clearTimeout(timer)
      worker?.terminate()
    }
  }, [chess, fen, gameMode, playerColor, botDifficulty, pendingPromotion, executeMove, botRetry])

  return {
    chess,
    fen,
    ...position,
    selectedSquare,
    validMoves,
    pendingPromotion,
    isFlipped,
    gameMode,
    botDifficulty,
    playerColor,
    soundEnabled,
    isBotThinking,
    botError,
    canUndo:
      gameMode === 'pass-and-play'
        ? position.moveHistory.length > 0
        : position.moveHistory.some((move) => move.color === playerColor),
    selectSquare,
    handleMoveAttempt,
    completePromotion,
    cancelPromotion,
    undoMove,
    resetGame,
    toggleFlip: () => setIsFlipped((value) => !value),
    toggleSound: () => setSoundEnabled((value) => !value),
    retryBot: () => setBotRetry((value) => value + 1),
    setGameMode,
    setBotDifficulty,
    setPlayerColor,
  }
}

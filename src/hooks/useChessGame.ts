import { useState, useCallback, useEffect, useRef } from 'react'
import { Chess, type Square as ChessSquare } from 'chess.js'
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
import { getBestBotMove } from '../utils/bot'

const INITIAL_PIECES: Record<PieceType, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export function useChessGame() {
  const [chess] = useState<Chess>(() => new Chess())
  const [, setTick] = useState(0) // Forces component re-render on game update

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [validMoves, setValidMoves] = useState<Square[]>([])
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [moveHistory, setMoveHistory] = useState<MoveLogItem[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  // Settings
  const [isFlipped, setIsFlipped] = useState<boolean>(false)
  const [gameMode, setGameMode] = useState<GameMode>('pass-and-play')
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const isBotThinking = useRef<boolean>(false)

  // Update sound manager toggle
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      sounds.setEnabled(next)
      return next
    })
  }, [])

  // Calculate captured pieces & material difference
  const calculateCaptured = useCallback(() => {
    const currentCounts: Record<Color, Record<PieceType, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    }

    const board = chess.board()
    for (const row of board) {
      for (const sq of row) {
        if (sq) {
          currentCounts[sq.color][sq.type]++
        }
      }
    }

    const capturedW: CapturedPieceGroup[] = []
    const capturedB: CapturedPieceGroup[] = []
    let whiteMaterial = 0
    let blackMaterial = 0

    const pieceOrder: PieceType[] = ['p', 'n', 'b', 'r', 'q']

    for (const p of pieceOrder) {
      const whiteCaptured = INITIAL_PIECES[p] - currentCounts.w[p]
      if (whiteCaptured > 0) {
        capturedW.push({ type: p, color: 'w', count: whiteCaptured })
      }

      const blackCaptured = INITIAL_PIECES[p] - currentCounts.b[p]
      if (blackCaptured > 0) {
        capturedB.push({ type: p, color: 'b', count: blackCaptured })
      }

      whiteMaterial += currentCounts.w[p] * PIECE_VALUES[p]
      blackMaterial += currentCounts.b[p] * PIECE_VALUES[p]
    }

    return {
      capturedWhite: capturedW, // White pieces captured by Black
      capturedBlack: capturedB, // Black pieces captured by White
      materialAdvantage: whiteMaterial - blackMaterial, // > 0: White ahead, < 0: Black ahead
    }
  }, [chess])

  const executeMove = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceType) => {
      try {
        const move = chess.move({
          from,
          to,
          promotion: promotionPiece || 'q',
        })

        if (!move) return false

        // Play appropriate sound
        if (chess.isCheckmate() || chess.isDraw()) {
          sounds.playVictory()
        } else if (chess.inCheck()) {
          sounds.playCheck()
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          sounds.playCastle()
        } else if (move.captured) {
          sounds.playCapture()
        } else {
          sounds.playMove()
        }

        setLastMove({ from, to })
        setSelectedSquare(null)
        setValidMoves([])
        setMoveHistory((prev) => [
          ...prev,
          {
            san: move.san,
            from: move.from as Square,
            to: move.to as Square,
            piece: move.piece as PieceType,
            color: move.color as Color,
            captured: move.captured as PieceType | undefined,
          },
        ])
        setTick((t) => t + 1)
        return true
      } catch {
        return false
      }
    },
    [chess]
  )

  // Promotion handling
  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      const piece = chess.get(from)
      if (!piece) return false

      // Check if this move requires pawn promotion
      const isPawnPromotion =
        piece.type === 'p' &&
        ((piece.color === 'w' && to.endsWith('8')) ||
          (piece.color === 'b' && to.endsWith('1')))

      if (isPawnPromotion) {
        // Check if the move is legal first
        const legalMoves = chess.moves({ square: from, verbose: true })
        const isLegal = legalMoves.some((m) => m.to === to)
        if (isLegal) {
          setPendingPromotion({ from, to, color: piece.color as Color })
          return true
        }
        return false
      }

      return executeMove(from, to)
    },
    [chess, executeMove]
  )

  const completePromotion = useCallback(
    (promotionPiece: PieceType) => {
      if (!pendingPromotion) return
      executeMove(pendingPromotion.from, pendingPromotion.to, promotionPiece)
      setPendingPromotion(null)
    },
    [pendingPromotion, executeMove]
  )

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
    setSelectedSquare(null)
    setValidMoves([])
  }, [])

  // User square selection
  const selectSquare = useCallback(
    (sq: Square) => {
      if (pendingPromotion) return

      // If playing vs bot and it's bot's turn, ignore clicks
      if (gameMode === 'vs-bot' && chess.turn() !== playerColor) {
        return
      }

      // If a piece was already selected
      if (selectedSquare) {
        // If clicking the same square, deselect
        if (selectedSquare === sq) {
          setSelectedSquare(null)
          setValidMoves([])
          return
        }

        // If clicking a valid move square, execute move
        if (validMoves.includes(sq)) {
          handleMoveAttempt(selectedSquare, sq)
          return
        }

        // Otherwise, if clicking another of own pieces, switch selection
        const targetPiece = chess.get(sq)
        if (targetPiece && targetPiece.color === chess.turn()) {
          setSelectedSquare(sq)
          const moves = chess.moves({ square: sq, verbose: true })
          setValidMoves(moves.map((m) => m.to as Square))
          return
        }

        // Clicked invalid empty/opponent square, deselect
        setSelectedSquare(null)
        setValidMoves([])
        return
      }

      // No square currently selected: select if piece belongs to current turn
      const piece = chess.get(sq)
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(sq)
        const moves = chess.moves({ square: sq, verbose: true })
        setValidMoves(moves.map((m) => m.to as Square))
      }
    },
    [chess, selectedSquare, validMoves, pendingPromotion, gameMode, playerColor, handleMoveAttempt]
  )

  // Undo move
  const undoMove = useCallback(() => {
    if (pendingPromotion) {
      setPendingPromotion(null)
      return
    }

    if (moveHistory.length === 0) return

    if (gameMode === 'vs-bot') {
      // In bot mode, undo 2 moves (both bot and player)
      chess.undo()
      chess.undo()
      setMoveHistory((prev) => prev.slice(0, -2))
    } else {
      chess.undo()
      setMoveHistory((prev) => prev.slice(0, -1))
    }

    setSelectedSquare(null)
    setValidMoves([])
    const history = chess.history({ verbose: true })
    if (history.length > 0) {
      const last = history[history.length - 1]
      setLastMove({ from: last.from as Square, to: last.to as Square })
    } else {
      setLastMove(null)
    }
    setTick((t) => t + 1)
    sounds.playMove()
  }, [chess, pendingPromotion, moveHistory.length, gameMode])

  // Reset game
  const resetGame = useCallback(() => {
    chess.reset()
    setSelectedSquare(null)
    setValidMoves([])
    setLastMove(null)
    setMoveHistory([])
    setPendingPromotion(null)
    isBotThinking.current = false
    setTick((t) => t + 1)
    sounds.playMove()
  }, [chess])

  // Flip board orientation
  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  // Bot Turn Automation
  useEffect(() => {
    if (
      gameMode === 'vs-bot' &&
      chess.turn() !== playerColor &&
      !chess.isGameOver() &&
      !isBotThinking.current
    ) {
      isBotThinking.current = true
      const timer = setTimeout(() => {
        const botMove = getBestBotMove(chess.fen(), botDifficulty)
        if (botMove) {
          executeMove(botMove.from as Square, botMove.to as Square, botMove.promotion as PieceType)
        }
        isBotThinking.current = false
      }, 350)

      return () => clearTimeout(timer)
    }
  }, [chess, gameMode, playerColor, botDifficulty, executeMove])

  // Auto flip board when setting player color in bot mode
  useEffect(() => {
    if (gameMode === 'vs-bot') {
      setIsFlipped(playerColor === 'b')
    }
  }, [gameMode, playerColor])

  // Find King square for check warning highlight
  const findKingSquare = useCallback(
    (color: Color): Square | null => {
      const board = chess.board()
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c]
          if (piece && piece.type === 'k' && piece.color === color) {
            const file = String.fromCharCode('a'.charCodeAt(0) + c)
            const rank = (8 - r).toString()
            return `${file}${rank}` as ChessSquare
          }
        }
      }
      return null
    },
    [chess]
  )

  const inCheck = chess.inCheck()
  const kingInCheckSquare = inCheck ? findKingSquare(chess.turn()) : null
  const { capturedWhite, capturedBlack, materialAdvantage } = calculateCaptured()

  return {
    chess,
    fen: chess.fen(),
    board: chess.board(),
    turn: chess.turn() as Color,
    isCheck: inCheck,
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isThreefold: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isGameOver: chess.isGameOver(),
    selectedSquare,
    validMoves,
    lastMove,
    moveHistory,
    pendingPromotion,
    kingInCheckSquare,
    capturedWhite,
    capturedBlack,
    materialAdvantage,
    isFlipped,
    gameMode,
    botDifficulty,
    playerColor,
    soundEnabled,
    selectSquare,
    handleMoveAttempt,
    completePromotion,
    cancelPromotion,
    undoMove,
    resetGame,
    toggleFlip,
    setGameMode,
    setBotDifficulty,
    setPlayerColor,
    toggleSound,
  }
}

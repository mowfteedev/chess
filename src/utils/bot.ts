import { Chess, type Move } from 'chess.js'
import type { BotDifficulty } from '../types/chess'

// Standard Piece Values
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Position tables for positional play
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
]

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
]

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
]

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
]

const KING_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
]

function evaluateBoard(game: Chess): number {
  let score = 0
  const board = game.board()

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (!piece) continue

      let val = PIECE_VALUES[piece.type] || 0
      const sqIndex = r * 8 + c
      const flippedIndex = (7 - r) * 8 + c

      if (piece.type === 'p') {
        val += piece.color === 'w' ? PAWN_TABLE[flippedIndex] : PAWN_TABLE[sqIndex]
      } else if (piece.type === 'n') {
        val += piece.color === 'w' ? KNIGHT_TABLE[flippedIndex] : KNIGHT_TABLE[sqIndex]
      } else if (piece.type === 'b') {
        val += piece.color === 'w' ? BISHOP_TABLE[flippedIndex] : BISHOP_TABLE[sqIndex]
      } else if (piece.type === 'r') {
        val += piece.color === 'w' ? ROOK_TABLE[flippedIndex] : ROOK_TABLE[sqIndex]
      } else if (piece.type === 'k') {
        val += piece.color === 'w' ? KING_TABLE[flippedIndex] : KING_TABLE[sqIndex]
      }

      if (piece.color === 'w') {
        score += val
      } else {
        score -= val
      }
    }
  }

  return score
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) {
      return isMaximizing ? -99999 : 99999
    }
    if (game.isDraw()) {
      return 0
    }
    return evaluateBoard(game)
  }

  const moves = game.moves({ verbose: true })

  // Sort captures first for faster alpha-beta cutoff
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      game.move(move)
      const evaluation = minimax(game, depth - 1, alpha, beta, false)
      game.undo()
      maxEval = Math.max(maxEval, evaluation)
      alpha = Math.max(alpha, evaluation)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      game.move(move)
      const evaluation = minimax(game, depth - 1, alpha, beta, true)
      game.undo()
      minEval = Math.min(minEval, evaluation)
      beta = Math.min(beta, evaluation)
      if (beta <= alpha) break
    }
    return minEval
  }
}

export function getBestBotMove(
  fen: string,
  difficulty: BotDifficulty = 'medium'
): Move | null {
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) return null

  // Easy: 60% random or depth 1
  if (difficulty === 'easy') {
    if (Math.random() < 0.5) {
      return moves[Math.floor(Math.random() * moves.length)]
    }
  }

  const isMaximizing = game.turn() === 'w'
  const depth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1

  let bestMove: Move = moves[0]
  let bestScore = isMaximizing ? -Infinity : Infinity

  // Shuffle moves slightly to avoid deterministic repetitive openings
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5)

  for (const move of shuffledMoves) {
    game.move(move)
    const score = minimax(
      game,
      depth - 1,
      -Infinity,
      Infinity,
      !isMaximizing
    )
    game.undo()

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    } else {
      if (score < bestScore) {
        bestScore = score
        bestMove = move
      }
    }
  }

  return bestMove
}

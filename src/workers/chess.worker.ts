import { getBestBotMove } from '../utils/bot'
import type { BotDifficulty, PieceType, Square } from '../types/chess'

export interface BotResponse {
  move?: { from: Square; to: Square; promotion?: PieceType }
  error?: boolean
}

self.onmessage = (event: MessageEvent<{ fen: string; difficulty: BotDifficulty }>) => {
  try {
    const move = getBestBotMove(event.data.fen, event.data.difficulty)
    self.postMessage({
      move: move ? { from: move.from, to: move.to, promotion: move.promotion } : undefined,
    } satisfies BotResponse)
  } catch {
    self.postMessage({ error: true } satisfies BotResponse)
  }
}

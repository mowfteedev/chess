import type { Square as ChessJsSquare, PieceSymbol, Color as ChessJsColor } from 'chess.js'

export type Square = ChessJsSquare
export type Color = ChessJsColor
export type PieceType = PieceSymbol

export type BoardTheme = 'emerald' | 'wood' | 'slate' | 'classic' | 'dark'

export interface BoardThemeColors {
  name: string
  light: string
  dark: string
  highlightLight: string
  highlightDark: string
}

export interface CapturedPieceGroup {
  type: PieceType
  color: Color
  count: number
}

export interface MoveLogItem {
  san: string
  from: Square
  to: Square
  piece: PieceType
  color: Color
  captured?: PieceType
}

export interface PendingPromotion {
  from: Square
  to: Square
  color: Color
}

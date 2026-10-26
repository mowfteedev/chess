import type { ReactNode, DragEvent } from 'react'
import type { Square as ChessSquare, BoardTheme } from '../types/chess'
import { BOARD_THEMES } from '../utils/themes'

interface SquareProps {
  square: ChessSquare
  isLight: boolean
  theme: BoardTheme
  isSelected: boolean
  isLastMove: boolean
  isValidMove: boolean
  hasPiece: boolean
  isKingInCheck: boolean
  label: string
  tabIndex: number
  children?: ReactNode
  onClick: () => void
  onDropMove: (from: ChessSquare, to: ChessSquare) => void
}

export function Square({
  square,
  isLight,
  theme,
  isSelected,
  isLastMove,
  isValidMove,
  hasPiece,
  isKingInCheck,
  label,
  tabIndex,
  children,
  onClick,
  onDropMove,
}: SquareProps) {
  const colors = BOARD_THEMES[theme]
  const backgroundColor = isSelected
    ? colors.highlightDark
    : isLastMove
      ? isLight
        ? colors.highlightLight
        : colors.highlightDark
      : isLight
        ? colors.light
        : colors.dark
  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const from = event.dataTransfer.getData('text/plain')
    if (/^[a-h][1-8]$/.test(from) && from !== square) onDropMove(from as ChessSquare, square)
  }
  return (
    <button
      type="button"
      role="gridcell"
      data-square={square}
      data-valid={isValidMove || undefined}
      aria-label={`${label}${isValidMove ? ', nước đi hợp lệ' : ''}${isKingInCheck ? ', đang bị chiếu' : ''}`}
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onClick={onClick}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={handleDrop}
      style={{ backgroundColor }}
      className={`board-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isKingInCheck ? 'in-check' : ''}`}
    >
      {children}
      {isValidMove && <span className={hasPiece ? 'valid-capture' : 'valid-move'} />}
    </button>
  )
}

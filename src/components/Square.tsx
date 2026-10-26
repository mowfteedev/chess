import React from 'react'
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
  showFileLabel?: string
  showRankLabel?: string
  children?: React.ReactNode
  onClick: () => void
  onDropMove: (from: ChessSquare, to: ChessSquare) => void
}

export const Square: React.FC<SquareProps> = ({
  square,
  isLight,
  theme,
  isSelected,
  isLastMove,
  isValidMove,
  hasPiece,
  isKingInCheck,
  showFileLabel,
  showRankLabel,
  children,
  onClick,
  onDropMove,
}) => {
  const themeColors = BOARD_THEMES[theme]
  const baseBg = isLight ? themeColors.light : themeColors.dark

  // Highlight overlays
  let overlayStyle = ''
  if (isSelected) {
    overlayStyle = 'bg-amber-400/40'
  } else if (isLastMove) {
    overlayStyle = isLight ? 'bg-amber-200/50' : 'bg-amber-500/30'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const fromSquare = e.dataTransfer.getData('text/plain') as ChessSquare
    if (fromSquare && fromSquare !== square) {
      onDropMove(fromSquare, square)
    }
  }

  return (
    <div
      style={{ backgroundColor: baseBg }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full h-full flex items-center justify-center transition-colors select-none ${
        isKingInCheck ? 'bg-red-600/80 animate-pulse' : ''
      }`}
    >
      {/* Last move or selected highlight */}
      {overlayStyle && <div className={`absolute inset-0 ${overlayStyle} pointer-events-none`} />}

      {/* Valid Move Indicator */}
      {isValidMove && !hasPiece && (
        <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/25 pointer-events-none ring-2 ring-black/10" />
      )}

      {/* Valid Capture Target Ring */}
      {isValidMove && hasPiece && (
        <div className="absolute inset-1 rounded-full border-4 border-black/30 pointer-events-none" />
      )}

      {/* Coordinate Labels: Rank at top-left/bottom-left, File at bottom-right */}
      {showRankLabel && (
        <span
          className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none ${
            isLight ? 'text-zinc-700/60' : 'text-zinc-200/60'
          }`}
        >
          {showRankLabel}
        </span>
      )}
      {showFileLabel && (
        <span
          className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none ${
            isLight ? 'text-zinc-700/60' : 'text-zinc-200/60'
          }`}
        >
          {showFileLabel}
        </span>
      )}

      {/* Piece child */}
      {children}
    </div>
  )
}

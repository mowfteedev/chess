import React from 'react'
import type { Square as ChessSquare, BoardTheme, Color } from '../types/chess'
import { Square } from './Square'
import { Piece } from './Piece'
import type { Chess } from 'chess.js'

interface ChessBoardProps {
  chess: Chess
  theme: BoardTheme
  isFlipped: boolean
  selectedSquare: ChessSquare | null
  validMoves: ChessSquare[]
  lastMove: { from: ChessSquare; to: ChessSquare } | null
  kingInCheckSquare: ChessSquare | null
  currentTurn: Color
  onSelectSquare: (sq: ChessSquare) => void
  onDropMove: (from: ChessSquare, to: ChessSquare) => void
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  theme,
  isFlipped,
  selectedSquare,
  validMoves,
  lastMove,
  kingInCheckSquare,
  currentTurn,
  onSelectSquare,
  onDropMove,
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8']

  const displayFiles = isFlipped ? [...files].reverse() : files
  const displayRanks = isFlipped ? ranks : [...ranks].reverse()

  return (
    <div className="w-full max-w-[560px] aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-800/80 bg-zinc-900 select-none">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as ChessSquare
            const fileNum = file.charCodeAt(0) - 'a'.charCodeAt(0)
            const rankNum = parseInt(rank, 10) - 1
            const isLight = (fileNum + rankNum) % 2 !== 0

            const piece = chess.get(square)
            const isSelected = selectedSquare === square
            const isLast = lastMove?.from === square || lastMove?.to === square
            const isValid = validMoves.includes(square)
            const isKingCheck = kingInCheckSquare === square

            // Show coordinates on border squares
            const showRank = fIdx === 0 ? rank : undefined
            const showFile = rIdx === 7 ? file : undefined

            return (
              <Square
                key={square}
                square={square}
                isLight={isLight}
                theme={theme}
                isSelected={isSelected}
                isLastMove={isLast}
                isValidMove={isValid}
                hasPiece={!!piece}
                isKingInCheck={isKingCheck}
                showRankLabel={showRank}
                showFileLabel={showFile}
                onClick={() => onSelectSquare(square)}
                onDropMove={onDropMove}
              >
                {piece && (
                  <Piece
                    type={piece.type}
                    color={piece.color}
                    square={square}
                    isDraggable={piece.color === currentTurn}
                  />
                )}
              </Square>
            )
          })
        )}
      </div>
    </div>
  )
}

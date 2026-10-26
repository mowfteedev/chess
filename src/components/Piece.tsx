import type { DragEvent } from 'react'
import type { PieceType, Color, Square } from '../types/chess'
import { ChessPieceIcon } from './ChessPieceIcon'

export function Piece({
  type,
  color,
  square,
  isDraggable = true,
}: {
  type: PieceType
  color: Color
  square: Square
  isDraggable?: boolean
}) {
  const handleDragStart = (event: DragEvent) => {
    if (!isDraggable) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData('text/plain', square)
    event.dataTransfer.effectAllowed = 'move'
    event.currentTarget.classList.add('is-dragging')
  }
  return (
    <span
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={(event) => event.currentTarget.classList.remove('is-dragging')}
      className={`board-piece ${isDraggable ? 'draggable' : ''}`}
    >
      <ChessPieceIcon type={type} color={color} />
    </span>
  )
}

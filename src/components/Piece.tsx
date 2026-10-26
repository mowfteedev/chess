import React from 'react'
import type { PieceType, Color, Square } from '../types/chess'

interface PieceProps {
  type: PieceType
  color: Color
  square: Square
  isDraggable?: boolean
}

export const Piece: React.FC<PieceProps> = ({
  type,
  color,
  square,
  isDraggable = true,
}) => {
  const code = `${color}${type.toUpperCase()}`
  const src = `./pieces/${code}.png`

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', square)
    e.dataTransfer.effectAllowed = 'move'

    // Add dragging styling to ghost
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`w-full h-full flex items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-transform duration-100 select-none ${
        isDraggable ? 'hover:scale-105' : ''
      }`}
    >
      <img
        src={src}
        alt={`${color === 'w' ? 'White' : 'Black'} ${type}`}
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
        loading="eager"
      />
    </div>
  )
}

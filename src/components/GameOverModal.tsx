import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import type { Color } from '../types/chess'

interface GameOverModalProps {
  isCheckmate: boolean
  isStalemate: boolean
  isThreefold: boolean
  isInsufficientMaterial: boolean
  isDraw: boolean
  currentTurn: Color
  onNewGame: () => void
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isCheckmate,
  isStalemate,
  isThreefold,
  isInsufficientMaterial,
  currentTurn,
  onNewGame,
}) => {
  const winner = currentTurn === 'w' ? 'Đen' : 'Trắng'

  useEffect(() => {
    if (isCheckmate) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        })
      } catch {
        // Fallback gracefully
      }
    }
  }, [isCheckmate])

  let title = 'Ván đấu kết thúc'
  let subtitle = ''

  if (isCheckmate) {
    title = `Bên ${winner} Chiến Thắng! 🎉`
    subtitle = `Chiếu bí vua đối phương hoàn hảo.`
  } else if (isStalemate) {
    title = 'Hòa Cờ (Stalemate)'
    subtitle = 'Vua không bị chiếu nhưng không còn nước đi hợp lệ.'
  } else if (isThreefold) {
    title = 'Hòa Cờ (Lặp Thế Cờ)'
    subtitle = 'Thế cờ bị lặp lại 3 lần liên tiếp.'
  } else if (isInsufficientMaterial) {
    title = 'Hòa Cờ (Thiếu Lực Lượng)'
    subtitle = 'Cả hai bên không còn đủ quân để chiếu bí.'
  } else {
    title = 'Hòa Cờ'
    subtitle = 'Ván đấu kết thúc theo luật 50 nước.'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-750 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-sm w-full text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
          {isCheckmate ? '👑' : '🤝'}
        </div>

        <h3 className="text-xl font-bold text-zinc-100 mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-zinc-400 mb-6">{subtitle}</p>

        <button
          onClick={onNewGame}
          className="w-full py-3 px-4 rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg hover:shadow-amber-500/25 active:scale-98 transition-all"
        >
          Bắt Đầu Ván Mới
        </button>
      </div>
    </div>
  )
}

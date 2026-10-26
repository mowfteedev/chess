import { useEffect } from 'react'
import { Crown, Handshake, ArrowRight } from 'lucide-react'
import type { Color } from '../types/chess'
import { Dialog } from './Dialog'

interface GameOverModalProps {
  isCheckmate: boolean
  isStalemate: boolean
  isThreefold: boolean
  isInsufficientMaterial: boolean
  currentTurn: Color
  onNewGame: () => void
  onReview: () => void
}

export function GameOverModal({
  isCheckmate,
  isStalemate,
  isThreefold,
  isInsufficientMaterial,
  currentTurn,
  onNewGame,
  onReview,
}: GameOverModalProps) {
  useEffect(() => {
    if (!isCheckmate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let active = true
    void import('canvas-confetti')
      .then(({ default: confetti }) => {
        if (active)
          confetti({
            particleCount: 70,
            spread: 75,
            colors: ['#b6dca0', '#f2dfbc', '#6b9e82'],
            origin: { y: 0.6 },
            disableForReducedMotion: true,
          })
      })
      .catch(() => {
        /* Celebration is optional. */
      })
    return () => {
      active = false
    }
  }, [isCheckmate])
  const title = isCheckmate
    ? `Quân ${currentTurn === 'w' ? 'đen' : 'trắng'} chiến thắng.`
    : 'Một ván cờ cân sức.'
  const description = isCheckmate
    ? 'Chiếu bí! Một nước đi đẹp để khép lại ván đấu.'
    : isStalemate
      ? 'Hòa do hết nước đi hợp lệ dù vua không bị chiếu.'
      : isThreefold
        ? 'Hòa vì cùng một thế cờ đã xuất hiện ba lần.'
        : isInsufficientMaterial
          ? 'Hòa vì cả hai bên không còn đủ quân để chiếu bí.'
          : 'Ván đấu hòa theo luật 50 nước.'
  return (
    <Dialog title={title} description={description} onClose={onReview} className="result-dialog">
      <div className="result-icon">
        {isCheckmate ? <Crown size={35} /> : <Handshake size={35} />}
      </div>
      <button className="primary-button" onClick={onNewGame}>
        Thêm một ván nữa
        <ArrowRight size={18} />
      </button>
      <button className="text-button" onClick={onReview}>
        Xem lại bàn cờ
      </button>
    </Dialog>
  )
}

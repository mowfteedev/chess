import React from 'react'
import type { PieceType, PendingPromotion } from '../types/chess'

interface PromotionModalProps {
  promotion: PendingPromotion
  onSelect: (piece: PieceType) => void
  onCancel: () => void
}

const PROMOTION_OPTIONS: { type: PieceType; label: string }[] = [
  { type: 'q', label: 'Hậu' },
  { type: 'r', label: 'Xe' },
  { type: 'b', label: 'Tượng' },
  { type: 'n', label: 'Mã' },
]

export const PromotionModal: React.FC<PromotionModalProps> = ({
  promotion,
  onSelect,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
        <h3 className="text-lg font-bold text-zinc-100 mb-1">Phong Cấp Tốt</h3>
        <p className="text-xs text-zinc-400 mb-6">
          Chọn quân cờ bạn muốn nâng cấp cho quân Tốt tại ô {promotion.to}
        </p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {PROMOTION_OPTIONS.map((opt) => {
            const code = `${promotion.color}${opt.type.toUpperCase()}`
            return (
              <button
                key={opt.type}
                onClick={() => onSelect(opt.type)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 hover:border-amber-500/50 hover:scale-105 active:scale-95 transition-all shadow-md group"
              >
                <img
                  src={`./pieces/${code}.png`}
                  alt={opt.label}
                  className="w-12 h-12 object-contain mb-2 group-hover:drop-shadow-md"
                />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400">
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Hủy nước đi
        </button>
      </div>
    </div>
  )
}

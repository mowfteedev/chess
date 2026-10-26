import type { PieceType, PendingPromotion } from '../types/chess'
import { Dialog } from './Dialog'
import { ChessPieceIcon, PIECE_NAMES } from './ChessPieceIcon'

export function PromotionModal({
  promotion,
  onSelect,
  onCancel,
}: {
  promotion: PendingPromotion
  onSelect: (piece: PieceType) => void
  onCancel: () => void
}) {
  return (
    <Dialog
      title="Một bước tiến lớn."
      description={`Tốt đã đến ô ${promotion.to}. Chọn quân để phong cấp.`}
      onClose={onCancel}
    >
      <div className="promotion-options">
        {(['q', 'r', 'b', 'n'] as const).map((type) => (
          <button key={type} onClick={() => onSelect(type)}>
            <ChessPieceIcon type={type} color={promotion.color} />
            <span>{PIECE_NAMES[type]}</span>
          </button>
        ))}
      </div>
      <button className="text-button" onClick={onCancel}>
        Hủy nước đi
      </button>
    </Dialog>
  )
}

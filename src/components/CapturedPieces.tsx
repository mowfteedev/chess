import { UserRound } from 'lucide-react'
import type { CapturedPieceGroup } from '../types/chess'
import { ChessPieceIcon, PIECE_NAMES } from './ChessPieceIcon'

export function CapturedPieces({
  captured,
  materialAdvantage,
  playerName,
  subtitle,
  isTurn,
  isSelf,
  color,
}: {
  captured: CapturedPieceGroup[]
  materialAdvantage: number
  playerName: string
  subtitle: string
  isTurn: boolean
  isSelf: boolean
  color: 'w' | 'b'
}) {
  return (
    <div className={`player-bar ${isTurn ? 'active-player' : ''}`}>
      <div className={`player-avatar ${isSelf ? '' : 'friend-avatar'}`}>
        <UserRound size={23} />
        <span className={`color-dot ${color}`} />
      </div>
      <div className="player-details">
        <strong>
          {playerName}
          {isSelf && <span className="mini-label">BẠN</span>}
        </strong>
        <span>{subtitle}</span>
      </div>
      <div className="captured-pieces" aria-label="Quân đã bắt">
        {captured.map((group) => {
          const label = `${group.count} ${PIECE_NAMES[group.type]} ${group.color === 'w' ? 'trắng' : 'đen'}`
          return (
            <span key={group.type} title={label} role="img" aria-label={label}>
              <ChessPieceIcon type={group.type} color={group.color} />
              {group.count > 1 && <small>×{group.count}</small>}
            </span>
          )
        })}
        {materialAdvantage > 0 && <b>+{materialAdvantage}</b>}
      </div>
      {isTurn && (
        <span className="turn-indicator">
          <i />
          Lượt đi
        </span>
      )}
    </div>
  )
}

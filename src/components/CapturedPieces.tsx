import { Bot, UserRound } from 'lucide-react'
import type { CapturedPieceGroup } from '../types/chess'
import { ChessPieceIcon, PIECE_NAMES } from './ChessPieceIcon'

interface CapturedPiecesProps {
  captured: CapturedPieceGroup[]
  materialAdvantage: number
  playerName: string
  subtitle: string
  isTurn: boolean
  isBot?: boolean
  isThinking?: boolean
  color: 'w' | 'b'
}

export function CapturedPieces({
  captured,
  materialAdvantage,
  playerName,
  subtitle,
  isTurn,
  isBot,
  isThinking,
  color,
}: CapturedPiecesProps) {
  return (
    <div className={`player-bar ${isTurn ? 'active-player' : ''}`}>
      <div className={`player-avatar ${isBot ? 'bot-avatar' : ''}`}>
        {isBot ? <Bot size={23} /> : <UserRound size={22} />}
        <span className={`color-dot ${color}`} />
      </div>
      <div className="player-details">
        <strong>
          {playerName}
          {isBot && <span className="mini-label">BOT</span>}
        </strong>
        <span>{isThinking ? 'Đang tìm nước đi tốt nhất…' : subtitle}</span>
      </div>
      <div className="captured-pieces" aria-label="Quân đã bắt">
        {captured.map((group) => (
          <span
            key={group.type}
            title={`${group.count} ${PIECE_NAMES[group.type]} ${group.color === 'w' ? 'trắng' : 'đen'}`}
          >
            <ChessPieceIcon type={group.type} color={group.color} />
            {group.count > 1 && <small>×{group.count}</small>}
          </span>
        ))}
        {materialAdvantage > 0 && <b>+{materialAdvantage}</b>}
      </div>
      {isTurn && (
        <span className="turn-indicator">
          {isThinking ? (
            <span className="thinking-dots">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <>
              <i />
              Lượt đi
            </>
          )}
        </span>
      )}
    </div>
  )
}

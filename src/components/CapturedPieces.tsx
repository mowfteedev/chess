import React from 'react'
import type { CapturedPieceGroup } from '../types/chess'

interface CapturedPiecesProps {
  captured: CapturedPieceGroup[]
  materialAdvantage?: number // > 0: current side has advantage
  playerName: string
  isTurn: boolean
  color: 'w' | 'b'
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  captured,
  materialAdvantage,
  playerName,
  isTurn,
  color,
}) => {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
        isTurn
          ? 'bg-zinc-800/90 border border-amber-500/40 shadow-sm'
          : 'bg-zinc-900/60 border border-zinc-800/40'
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <div
          className={`w-3.5 h-3.5 rounded-full border ${
            color === 'w' ? 'bg-zinc-100 border-zinc-400' : 'bg-zinc-900 border-zinc-600'
          }`}
        />
        <span className="font-semibold text-sm text-zinc-200">{playerName}</span>
        {isTurn && (
          <span className="text-[11px] font-medium bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
            Lượt đi
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1">
        {captured.map((group) => {
          const code = `${group.color}${group.type.toUpperCase()}`
          return (
            <div key={group.type} className="flex items-center relative group">
              <img
                src={`./pieces/${code}.png`}
                alt={group.type}
                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
              />
              {group.count > 1 && (
                <span className="text-[10px] font-bold text-zinc-400 ml-0.5">
                  ×{group.count}
                </span>
              )}
            </div>
          )
        })}

        {materialAdvantage && materialAdvantage > 0 ? (
          <span className="text-xs font-bold text-emerald-400 ml-2 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
            +{materialAdvantage}
          </span>
        ) : null}
      </div>
    </div>
  )
}

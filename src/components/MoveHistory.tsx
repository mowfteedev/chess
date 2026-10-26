import React, { useEffect, useRef } from 'react'
import type { MoveLogItem } from '../types/chess'

interface MoveHistoryProps {
  history: MoveLogItem[]
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history.length])

  // Group moves into pairs (White & Black)
  const movePairs: { num: number; white?: MoveLogItem; black?: MoveLogItem }[] = []
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    })
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 rounded-xl border border-zinc-800/80 overflow-hidden shadow-lg">
      <div className="px-4 py-3 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Biên bản nước đi (PGN)</h3>
        <span className="text-xs text-zinc-500 font-mono">
          {history.length} nước
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-0.5 max-h-56 sm:max-h-80"
      >
        {movePairs.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-zinc-600 italic">
            Chưa có nước đi nào
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.num}
              className="grid grid-cols-[36px_1fr_1fr] px-2 py-1.5 rounded hover:bg-zinc-800/60 transition-colors"
            >
              <span className="text-zinc-500 font-medium">{pair.num}.</span>
              <span className="text-zinc-200 font-semibold">{pair.white?.san || ''}</span>
              <span className="text-zinc-400 font-semibold">{pair.black?.san || ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

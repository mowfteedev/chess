import React from 'react'
import {
  RotateCcw,
  Undo2,
  ArrowUpDown,
  Volume2,
  VolumeX,
  Bot,
  Users,
  Palette,
} from 'lucide-react'
import type { GameMode, BotDifficulty, BoardTheme, Color } from '../types/chess'
import { BOARD_THEMES } from '../utils/themes'

interface ControlsProps {
  gameMode: GameMode
  botDifficulty: BotDifficulty
  playerColor: Color
  currentTheme: BoardTheme
  soundEnabled: boolean
  canUndo: boolean
  onNewGame: () => void
  onUndo: () => void
  onFlipBoard: () => void
  onToggleSound: () => void
  onSelectTheme: (theme: BoardTheme) => void
  onSelectGameMode: (mode: GameMode) => void
  onSelectBotDifficulty: (diff: BotDifficulty) => void
  onSelectPlayerColor: (color: Color) => void
}

export const Controls: React.FC<ControlsProps> = ({
  gameMode,
  botDifficulty,
  playerColor,
  currentTheme,
  soundEnabled,
  canUndo,
  onNewGame,
  onUndo,
  onFlipBoard,
  onToggleSound,
  onSelectTheme,
  onSelectGameMode,
  onSelectBotDifficulty,
  onSelectPlayerColor,
}) => {
  return (
    <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/80 p-4 shadow-lg space-y-4">
      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
        <button
          onClick={() => onSelectGameMode('pass-and-play')}
          className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            gameMode === 'pass-and-play'
              ? 'bg-zinc-800 text-amber-400 shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pass & Play</span>
        </button>

        <button
          onClick={() => onSelectGameMode('vs-bot')}
          className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            gameMode === 'vs-bot'
              ? 'bg-zinc-800 text-amber-400 shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Đấu Với Máy</span>
        </button>
      </div>

      {/* Bot Options (Visible only in vs-bot mode) */}
      {gameMode === 'vs-bot' && (
        <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Độ khó:</span>
            <div className="flex space-x-1.5">
              {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onSelectBotDifficulty(d)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    botDifficulty === d
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d === 'easy' ? 'Dễ' : d === 'medium' ? 'Vừa' : 'Khó'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Bạn cầm quân:</span>
            <div className="flex space-x-1.5">
              <button
                onClick={() => onSelectPlayerColor('w')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                  playerColor === 'w'
                    ? 'bg-zinc-200 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400" />
                <span>Trắng</span>
              </button>
              <button
                onClick={() => onSelectPlayerColor('b')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                  playerColor === 'b'
                    ? 'bg-zinc-200 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-600" />
                <span>Đen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Đi lại nước cờ"
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 text-xs font-medium border border-zinc-700/50 active:scale-95 transition-all"
        >
          <Undo2 className="w-4 h-4 mb-1" />
          <span>Đi lại</span>
        </button>

        <button
          onClick={onFlipBoard}
          title="Đổi chiều bàn cờ"
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700/50 active:scale-95 transition-all"
        >
          <ArrowUpDown className="w-4 h-4 mb-1" />
          <span>Lật cờ</span>
        </button>

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700/50 active:scale-95 transition-all"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 mb-1 text-amber-400" />
          ) : (
            <VolumeX className="w-4 h-4 mb-1 text-zinc-500" />
          )}
          <span>Âm thanh</span>
        </button>

        <button
          onClick={onNewGame}
          title="Bắt đầu ván mới"
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4 mb-1" />
          <span>Ván mới</span>
        </button>
      </div>

      {/* Theme Picker */}
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
          <Palette className="w-3.5 h-3.5" />
          <span>Màu bàn cờ:</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((themeKey) => {
            const t = BOARD_THEMES[themeKey]
            const isSelected = currentTheme === themeKey
            return (
              <button
                key={themeKey}
                onClick={() => onSelectTheme(themeKey)}
                title={t.name}
                className={`w-5 h-5 rounded-full overflow-hidden border-2 transition-transform ${
                  isSelected ? 'border-amber-400 scale-110 shadow' : 'border-zinc-700 hover:scale-105'
                }`}
              >
                <div className="w-full h-full flex">
                  <div className="w-1/2 h-full" style={{ backgroundColor: t.light }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: t.dark }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

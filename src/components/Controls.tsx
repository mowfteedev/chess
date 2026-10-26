import { ArrowRight, Bot, Users, Check, Sparkles } from 'lucide-react'
import type { GameMode, BotDifficulty, BoardTheme, Color } from '../types/chess'
import { BOARD_THEMES } from '../utils/themes'
import { ChessPieceIcon } from './ChessPieceIcon'

interface ControlsProps {
  gameMode: GameMode
  botDifficulty: BotDifficulty
  playerColor: Color
  currentTheme: BoardTheme
  onNewGame: () => void
  onSelectTheme: (theme: BoardTheme) => void
  onSelectGameMode: (mode: GameMode) => void
  onSelectBotDifficulty: (difficulty: BotDifficulty) => void
  onSelectPlayerColor: (color: Color) => void
}

export const DIFFICULTY_LABELS = { easy: 'Thư giãn', medium: 'Cân bằng', hard: 'Thử thách' }

export function Controls({
  gameMode,
  botDifficulty,
  playerColor,
  currentTheme,
  onNewGame,
  onSelectTheme,
  onSelectGameMode,
  onSelectBotDifficulty,
  onSelectPlayerColor,
}: ControlsProps) {
  return (
    <section className="panel setup-panel" aria-labelledby="setup-heading">
      <div className="panel-heading">
        <h2 id="setup-heading">Ván cờ của bạn</h2>
        <span className="eyebrow">TÙY CHỈNH</span>
      </div>
      <div className="mode-switch" role="group" aria-label="Chế độ chơi">
        <button
          aria-pressed={gameMode === 'vs-bot'}
          className={gameMode === 'vs-bot' ? 'active' : ''}
          onClick={() => onSelectGameMode('vs-bot')}
        >
          <Bot size={17} />
          Với máy
        </button>
        <button
          aria-pressed={gameMode === 'pass-and-play'}
          className={gameMode === 'pass-and-play' ? 'active' : ''}
          onClick={() => onSelectGameMode('pass-and-play')}
        >
          <Users size={17} />
          Cùng bạn
        </button>
      </div>
      {gameMode === 'vs-bot' ? (
        <>
          <div className="opponent-card">
            <div className="opponent-art">
              <ChessPieceIcon type="n" color="w" />
              <span>✦</span>
            </div>
            <div>
              <strong>Gambit Bot</strong>
              <p>Một đối thủ. Vô vàn khả năng.</p>
            </div>
            <Sparkles size={16} className="opponent-spark" />
          </div>
          <div className="setting-row">
            <span>Độ khó</span>
            <span className="setting-hint">
              {botDifficulty === 'easy'
                ? 'Khởi động nhẹ nhàng'
                : botDifficulty === 'medium'
                  ? 'Vừa sức, đủ thú vị'
                  : 'Sẵn sàng bứt phá'}
            </span>
          </div>
          <div className="difficulty-switch" role="group" aria-label="Độ khó">
            {(['easy', 'medium', 'hard'] as const).map((difficulty, index) => (
              <button
                key={difficulty}
                aria-pressed={botDifficulty === difficulty}
                className={botDifficulty === difficulty ? 'active' : ''}
                onClick={() => onSelectBotDifficulty(difficulty)}
              >
                <span className="level-bars" aria-hidden="true">
                  {[0, 1, 2].map((bar) => (
                    <i key={bar} className={bar <= index ? 'filled' : ''} />
                  ))}
                </span>
                {DIFFICULTY_LABELS[difficulty]}
              </button>
            ))}
          </div>
          <div className="color-setting">
            <span>Bạn cầm quân</span>
            <div role="group" aria-label="Màu quân của bạn">
              {(['w', 'b'] as const).map((color) => (
                <button
                  key={color}
                  aria-pressed={playerColor === color}
                  className={playerColor === color ? 'active' : ''}
                  onClick={() => onSelectPlayerColor(color)}
                >
                  <span className={`color-dot ${color}`} />
                  {color === 'w' ? 'Trắng' : 'Đen'}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="friends-description">
          <Users size={31} />
          <strong>Ngồi cạnh nhau. Cùng đấu trí.</strong>
          <p>Hai người, một bàn cờ. Thay phiên đi và lật bàn cờ bất cứ lúc nào.</p>
        </div>
      )}
      <div className="theme-setting" id="appearance">
        <div className="setting-row">
          <span>Màu bàn cờ</span>
          <span className="setting-hint">{BOARD_THEMES[currentTheme].name}</span>
        </div>
        <div className="theme-options" role="group" aria-label="Màu bàn cờ">
          {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((theme) => (
            <button
              key={theme}
              title={BOARD_THEMES[theme].name}
              aria-label={BOARD_THEMES[theme].name}
              aria-pressed={currentTheme === theme}
              className={`theme-swatch ${currentTheme === theme ? 'active' : ''}`}
              onClick={() => onSelectTheme(theme)}
            >
              <span
                style={{
                  background: `conic-gradient(${BOARD_THEMES[theme].dark} 25%, ${BOARD_THEMES[theme].light} 0 50%, ${BOARD_THEMES[theme].dark} 0 75%, ${BOARD_THEMES[theme].light} 0)`,
                }}
              />
              {currentTheme === theme && <Check size={13} />}
            </button>
          ))}
        </div>
      </div>
      <button className="primary-button new-game-button" onClick={onNewGame}>
        Bắt đầu ván mới
        <ArrowRight size={18} />
      </button>
      <p className="setup-note">
        <span />
        Chơi tự do · Không giới hạn thời gian
      </p>
    </section>
  )
}

import { Check } from 'lucide-react'
import type { BoardTheme } from '../types/chess'
import { BOARD_THEMES } from '../utils/themes'

export function Controls({
  currentTheme,
  onSelectTheme,
}: {
  currentTheme: BoardTheme
  onSelectTheme: (theme: BoardTheme) => void
}) {
  return (
    <div className="appearance-settings" id="appearance">
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
  )
}

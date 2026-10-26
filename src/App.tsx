import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Coffee,
  Command,
  Heart,
  Leaf,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  ShieldCheck,
  Swords,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useChessGame } from './hooks/useChessGame'
import { usePreference } from './hooks/usePreference'
import { ChessBoard } from './components/ChessBoard'
import { CapturedPieces } from './components/CapturedPieces'
import { MoveHistory } from './components/MoveHistory'
import { Controls, DIFFICULTY_LABELS } from './components/Controls'
import { PromotionModal } from './components/PromotionModal'
import { GameOverModal } from './components/GameOverModal'
import { ChessPieceIcon } from './components/ChessPieceIcon'
import { Dialog } from './components/Dialog'
import { BOARD_THEMES } from './utils/themes'
import type { BoardTheme } from './types/chess'

export function App() {
  const game = useChessGame()
  const [theme, setTheme] = usePreference<BoardTheme>(
    'board-theme',
    'wood',
    (value): value is BoardTheme =>
      typeof value === 'string' && Object.prototype.hasOwnProperty.call(BOARD_THEMES, value),
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const topColor = game.isFlipped ? 'w' : 'b'
  const bottomColor = game.isFlipped ? 'b' : 'w'

  useEffect(() => {
    if (!game.isGameOver) setResultDismissed(false)
  }, [game.isGameOver])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const newGame = () => {
    game.resetGame()
    setConfirmReset(false)
    setResultDismissed(false)
  }
  const requestNewGame = () => {
    if (game.moveHistory.length && !game.isGameOver) setConfirmReset(true)
    else newGame()
  }
  const exportPgn = () => {
    const blob = new Blob([game.chess.pgn()], { type: 'application/x-chess-pgn;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'gambit-van-co.pgn'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const playerInfo = (color: 'w' | 'b') => {
    const isBot = game.gameMode === 'vs-bot' && color !== game.playerColor
    return (
      <CapturedPieces
        captured={color === 'w' ? game.capturedBlack : game.capturedWhite}
        materialAdvantage={color === 'w' ? game.materialAdvantage : -game.materialAdvantage}
        playerName={
          isBot
            ? 'Gambit Bot'
            : game.gameMode === 'vs-bot'
              ? 'Bạn'
              : `Người chơi ${color === 'w' ? 'Trắng' : 'Đen'}`
        }
        subtitle={
          isBot
            ? `${DIFFICULTY_LABELS[game.botDifficulty]} · Quân ${color === 'w' ? 'trắng' : 'đen'}`
            : `Quân ${color === 'w' ? 'trắng' : 'đen'} · ${game.gameMode === 'vs-bot' ? 'Cứ tự tin với nước đi của mình' : 'Cùng chơi trên một thiết bị'}`
        }
        isTurn={!game.isGameOver && game.turn === color}
        isBot={isBot}
        isThinking={isBot && game.isBotThinking}
        color={color}
      />
    )
  }
  const status = game.isGameOver
    ? 'Ván đấu đã kết thúc'
    : game.isCheck
      ? `Chiếu tướng! Quân ${game.turn === 'w' ? 'trắng' : 'đen'} cần bảo vệ vua.`
      : game.gameMode === 'vs-bot' && game.turn !== game.playerColor
        ? game.botError
          ? 'Đang chờ máy thử lại'
          : 'Gambit đang suy nghĩ'
        : game.gameMode === 'vs-bot'
          ? 'Đến lượt của bạn'
          : `Đến lượt quân ${game.turn === 'w' ? 'trắng' : 'đen'}`

  return (
    <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
      <a href="#play" className="skip-link">
        Đến bàn cờ
      </a>
      <aside className="sidebar">
        <a className="brand" href="#play" aria-label="Gambit — về bàn cờ">
          <span className="brand-mark">
            <ChessPieceIcon type="n" color="w" />
          </span>
          <span>
            gambit<span className="brand-period">.</span>
          </span>
        </a>
        <div className="sidebar-section-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <a className="nav-item active" href="#play" aria-current="page">
            <Swords size={19} />
            Chơi cờ
            <span className="nav-active-dot" />
          </a>
          <button className="nav-item" onClick={() => setHelpOpen(true)}>
            <BookOpen size={18} />
            Góc nhập môn
            <ArrowUpRight size={14} className="nav-end" />
          </button>
          <button
            className="nav-item"
            onClick={() => {
              document.getElementById('appearance')?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
                block: 'center',
              })
              document
                .querySelector<HTMLButtonElement>('.theme-swatch.active')
                ?.focus({ preventScroll: true })
            }}
          >
            <Palette size={18} />
            Giao diện
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <span className="quote-mark">“</span>
            <p>
              Nước đi hay nhất
              <br />
              là nước đi tiếp theo.
            </p>
            <span className="quote-rule" />
            <small>BÌNH TĨNH. QUAN SÁT. TIẾN LÊN.</small>
            <ChessPieceIcon type="n" color="w" className="quote-knight" />
          </div>
          <div className="local-status">
            <span className="live-dot" />
            Không gian riêng của bạn
          </div>
          <button className="sidebar-help" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} />
            Hướng dẫn chơi
            <ChevronRight size={15} />
          </button>
          <div className="profile">
            <span className="profile-avatar">m.</span>
            <div>
              <strong>mowftee</strong>
              <span>Just enjoy the game.</span>
            </div>
            <Leaf size={17} />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Câu lạc bộ</span>
            <ChevronRight size={12} />
            <strong>Bàn cờ tự do</strong>
          </div>
          <div className="topbar-actions">
            <span className="quiet-badge">
              <span className="live-dot" />
              CHẬM LẠI MỘT NHỊP
            </span>
            <button
              className="icon-button"
              aria-label="Hướng dẫn chơi"
              title="Hướng dẫn chơi"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={19} />
            </button>
            <span className="topbar-avatar">m.</span>
          </div>
        </header>
        <main id="play" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow page-eyebrow">
                <span />
                MỘT CHÚT TẬP TRUNG, MỘT CHÚT ĐAM MÊ
              </div>
              <h1>
                Đến lượt bạn<span>.</span>
              </h1>
              <p>Gác lại ồn ào. Thưởng thức một ván cờ hay.</p>
            </div>
            <div className="session-tag">
              <span className="session-icon">
                <Swords size={19} />
              </span>
              <div>
                <strong>
                  {game.gameMode === 'vs-bot' ? 'Bạn & Gambit' : 'Một bàn cờ, hai người bạn'}
                </strong>
                <span>
                  Đấu giao hữu <i /> Không tính giờ
                </span>
              </div>
            </div>
          </div>
          <div className="game-layout">
            <section className="board-column" aria-label="Khu vực chơi cờ">
              {playerInfo(topColor)}
              <ChessBoard
                chess={game.chess}
                theme={theme}
                isFlipped={game.isFlipped}
                selectedSquare={game.selectedSquare}
                validMoves={game.validMoves}
                lastMove={game.lastMove}
                kingInCheckSquare={game.kingInCheckSquare}
                currentTurn={game.turn}
                canInteract={
                  !game.isGameOver && (game.gameMode !== 'vs-bot' || game.turn === game.playerColor)
                }
                onSelectSquare={game.selectSquare}
                onDropMove={game.handleMoveAttempt}
              />
              {playerInfo(bottomColor)}
              <div className="board-toolbar">
                <div
                  className={`game-status ${game.isCheck ? 'check-status' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className={game.isBotThinking ? 'thinking-status' : 'status-ring'} />
                  {status}
                </div>
                <div className="board-actions">
                  <button
                    className="icon-button"
                    aria-label="Đi lại nước cờ"
                    title="Đi lại nước cờ"
                    disabled={!game.canUndo}
                    onClick={game.undoMove}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Lật bàn cờ"
                    title="Lật bàn cờ"
                    onClick={game.toggleFlip}
                  >
                    <ArrowUpDown size={17} />
                  </button>
                  <button
                    className={`icon-button ${game.soundEnabled ? 'sound-on' : ''}`}
                    aria-label={game.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                    title={game.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                    aria-pressed={game.soundEnabled}
                    onClick={game.toggleSound}
                  >
                    {game.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    className="icon-button"
                    aria-label={focusMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung'}
                    title={focusMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung'}
                    aria-pressed={focusMode}
                    onClick={() => setFocusMode((value) => !value)}
                  >
                    {focusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                  </button>
                </div>
              </div>
              {game.botError && (
                <div className="bot-error" role="alert">
                  Máy chưa thể tính nước đi.<button onClick={game.retryBot}>Thử lại</button>
                </div>
              )}
              <div className="board-caption">
                <span>
                  <ShieldCheck size={13} />
                  Hỗ trợ nhập thành & phong cấp
                </span>
                <button onClick={() => setHelpOpen(true)}>
                  <Command size={12} />
                  Mẹo thao tác
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </section>
            <aside className="game-sidebar" aria-label="Thiết lập và biên bản">
              <Controls
                gameMode={game.gameMode}
                botDifficulty={game.botDifficulty}
                playerColor={game.playerColor}
                currentTheme={theme}
                onNewGame={requestNewGame}
                onSelectTheme={setTheme}
                onSelectGameMode={game.setGameMode}
                onSelectBotDifficulty={game.setBotDifficulty}
                onSelectPlayerColor={game.setPlayerColor}
              />
              <MoveHistory history={game.moveHistory} onExport={exportPgn} />
              <div className="little-note">
                <Coffee size={17} />
                <p>
                  Không cần vội.
                  <br />
                  <span>Nước đi hay xứng đáng được chờ đợi.</span>
                </p>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <span>64 ô cờ. Vô vàn khả năng.</span>
            <span>
              Made for the love of the game
              <Heart size={11} />
              <span className="footer-signature">gambit.</span>
            </span>
          </footer>
        </main>
      </div>
      {helpOpen && (
        <Dialog
          title="Bắt đầu thật đơn giản."
          description="Một bàn cờ nhỏ. Một thế giới để khám phá."
          onClose={() => setHelpOpen(false)}
          className="help-dialog"
        >
          <div className="help-step">
            <span>01</span>
            <div>
              <strong>Chọn quân, chọn nước đi.</strong>
              <p>
                Nhấn quân của bạn để xem các ô hợp lệ, rồi nhấn ô đích. Trên máy tính, bạn cũng có
                thể kéo thả.
              </p>
            </div>
          </div>
          <div className="help-step">
            <span>02</span>
            <div>
              <strong>Chơi theo cách của bạn.</strong>
              <p>
                Đấu với Gambit ở ba mức độ, hoặc chọn “Cùng bạn” để hai người thay phiên trên một
                thiết bị.
              </p>
            </div>
          </div>
          <div className="help-step">
            <span>03</span>
            <div>
              <strong>Bảo vệ vua. Tìm cơ hội.</strong>
              <p>
                Chiếu bí vua đối phương để thắng. Nhập thành, bắt tốt qua đường và phong cấp đều
                được hỗ trợ.
              </p>
            </div>
          </div>
          <div className="keyboard-tip">
            <Command size={17} />
            <p>
              <strong>Thử dùng bàn phím</strong>
              <span>
                Tab vào bàn cờ · ↑ ↓ ← → chọn ô · Enter đi quân · Esc bỏ chọn. Esc cũng thoát chế độ
                tập trung.
              </span>
            </p>
          </div>
          <button className="primary-button" onClick={() => setHelpOpen(false)}>
            Sẵn sàng vào ván
            <ArrowRight size={18} />
          </button>
        </Dialog>
      )}
      {confirmReset && (
        <Dialog
          title="Một khởi đầu mới?"
          description="Ván hiện tại sẽ được đặt lại. Bạn có thể tải biên bản trước khi bắt đầu lại."
          onClose={() => setConfirmReset(false)}
        >
          <div className="confirm-actions">
            <button className="secondary-button" onClick={exportPgn}>
              <ArrowDownToLine size={16} />
              Lưu biên bản PGN
            </button>
            <button className="primary-button" onClick={newGame}>
              Bắt đầu ván mới
              <RotateCcw size={16} />
            </button>
            <button className="text-button" onClick={() => setConfirmReset(false)}>
              Tiếp tục ván hiện tại
            </button>
          </div>
        </Dialog>
      )}
      {game.pendingPromotion && (
        <PromotionModal
          promotion={game.pendingPromotion}
          onSelect={game.completePromotion}
          onCancel={game.cancelPromotion}
        />
      )}
      {game.isGameOver && !resultDismissed && (
        <GameOverModal
          isCheckmate={game.isCheckmate}
          isStalemate={game.isStalemate}
          isThreefold={game.isThreefold}
          isInsufficientMaterial={game.isInsufficientMaterial}
          currentTurn={game.turn}
          onNewGame={newGame}
          onReview={() => setResultDismissed(true)}
        />
      )}
    </div>
  )
}
export default App

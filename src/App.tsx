import { useState } from 'react'
import { useChessGame } from './hooks/useChessGame'
import { ChessBoard } from './components/ChessBoard'
import { CapturedPieces } from './components/CapturedPieces'
import { MoveHistory } from './components/MoveHistory'
import { Controls } from './components/Controls'
import { PromotionModal } from './components/PromotionModal'
import { GameOverModal } from './components/GameOverModal'
import type { BoardTheme } from './types/chess'

export function App() {
  const [theme, setTheme] = useState<BoardTheme>('emerald')

  const {
    chess,
    turn,
    isCheck,
    isCheckmate,
    isDraw,
    isStalemate,
    isThreefold,
    isInsufficientMaterial,
    isGameOver,
    selectedSquare,
    validMoves,
    lastMove,
    moveHistory,
    pendingPromotion,
    kingInCheckSquare,
    capturedWhite,
    capturedBlack,
    materialAdvantage,
    isFlipped,
    gameMode,
    botDifficulty,
    playerColor,
    soundEnabled,
    selectSquare,
    handleMoveAttempt,
    completePromotion,
    cancelPromotion,
    undoMove,
    resetGame,
    toggleFlip,
    setGameMode,
    setBotDifficulty,
    setPlayerColor,
    toggleSound,
  } = useChessGame()

  // Determine top/bottom player details based on board flip
  const topColor = isFlipped ? 'w' : 'b'
  const bottomColor = isFlipped ? 'b' : 'w'

  const getPlayerLabel = (color: 'w' | 'b') => {
    if (gameMode === 'vs-bot') {
      return color === playerColor
        ? `Bạn (${color === 'w' ? 'Trắng' : 'Đen'})`
        : `Máy (${botDifficulty === 'easy' ? 'Dễ' : botDifficulty === 'medium' ? 'Vừa' : 'Khó'})`
    }
    return color === 'w' ? 'Bên Trắng' : 'Bên Đen'
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-3 sm:p-6 lg:p-8 font-sans">
      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-850 border border-zinc-700/80 flex items-center justify-center shadow-md">
            <img src="./pieces/wK.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Cờ Vua
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Minimalist
              </span>
            </h1>
            <p className="text-xs text-zinc-500">Chuẩn luật FIDE quốc tế</p>
          </div>
        </div>

        {/* Turn & Check Status Badge */}
        <div className="flex items-center space-x-2">
          {isCheck && (
            <span className="animate-pulse px-2.5 py-1 text-xs font-bold bg-red-950/80 text-red-400 border border-red-700/60 rounded-lg shadow-sm">
              CHIẾU TƯỚNG!
            </span>
          )}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <div
              className={`w-3 h-3 rounded-full border ${
                turn === 'w' ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-600'
              }`}
            />
            <span className="text-zinc-300">
              Lượt: {turn === 'w' ? 'Trắng' : 'Đen'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start my-auto">
        {/* Left Column: Board and Player Bars */}
        <div className="flex flex-col items-center w-full max-w-[560px] mx-auto space-y-2">
          {/* Top Player Info */}
          <div className="w-full">
            <CapturedPieces
              captured={topColor === 'w' ? capturedBlack : capturedWhite}
              materialAdvantage={topColor === 'w' ? materialAdvantage : -materialAdvantage}
              playerName={getPlayerLabel(topColor)}
              isTurn={turn === topColor}
              color={topColor}
            />
          </div>

          {/* Chess Board */}
          <ChessBoard
            chess={chess}
            theme={theme}
            isFlipped={isFlipped}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            lastMove={lastMove}
            kingInCheckSquare={kingInCheckSquare}
            currentTurn={turn}
            onSelectSquare={selectSquare}
            onDropMove={handleMoveAttempt}
          />

          {/* Bottom Player Info */}
          <div className="w-full">
            <CapturedPieces
              captured={bottomColor === 'w' ? capturedBlack : capturedWhite}
              materialAdvantage={bottomColor === 'w' ? materialAdvantage : -materialAdvantage}
              playerName={getPlayerLabel(bottomColor)}
              isTurn={turn === bottomColor}
              color={bottomColor}
            />
          </div>
        </div>

        {/* Right Column: Controls & Move Notation */}
        <div className="flex flex-col space-y-4 w-full">
          <Controls
            gameMode={gameMode}
            botDifficulty={botDifficulty}
            playerColor={playerColor}
            currentTheme={theme}
            soundEnabled={soundEnabled}
            canUndo={moveHistory.length > 0}
            onNewGame={resetGame}
            onUndo={undoMove}
            onFlipBoard={toggleFlip}
            onToggleSound={toggleSound}
            onSelectTheme={setTheme}
            onSelectGameMode={setGameMode}
            onSelectBotDifficulty={setBotDifficulty}
            onSelectPlayerColor={setPlayerColor}
          />

          <MoveHistory history={moveHistory} />
        </div>
      </main>

      {/* Modals */}
      {pendingPromotion && (
        <PromotionModal
          promotion={pendingPromotion}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {isGameOver && (
        <GameOverModal
          isCheckmate={isCheckmate}
          isStalemate={isStalemate}
          isThreefold={isThreefold}
          isInsufficientMaterial={isInsufficientMaterial}
          isDraw={isDraw}
          currentTurn={turn}
          onNewGame={resetGame}
        />
      )}

      {/* Footer */}
      <footer className="w-full max-w-5xl mt-6 text-center text-[11px] text-zinc-600">
        Phát triển cho đại ca @mowfteedev • Chạy tĩnh trên GitHub Pages
      </footer>
    </div>
  )
}
export default App

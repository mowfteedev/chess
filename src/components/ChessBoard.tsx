import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Chess } from "chess.js";
import type {
  Square as ChessSquare,
  BoardTheme,
  Color,
  PieceType,
} from "../types/chess";
import { BOARD_THEMES } from "../utils/themes";
import { ChessPieceIcon, PIECE_NAMES } from "./ChessPieceIcon";

interface ChessBoardProps {
  chess: Chess;
  theme: BoardTheme;
  isFlipped: boolean;
  selectedSquare: ChessSquare | null;
  validMoves: ChessSquare[];
  lastMove: { from: ChessSquare; to: ChessSquare } | null;
  kingInCheckSquare: ChessSquare | null;
  currentTurn: Color;
  canInteract: boolean;
  onSelectSquare: (square: ChessSquare) => void;
  onDropMove: (from: ChessSquare, to: ChessSquare) => void;
}

export function ChessBoard({
  chess,
  theme,
  isFlipped,
  selectedSquare,
  validMoves,
  lastMove,
  kingInCheckSquare,
  currentTurn,
  canInteract,
  onSelectSquare,
  onDropMove,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [focusedSquare, setFocusedSquare] = useState<ChessSquare>("e2");
  const files = (isFlipped ? "hgfedcba" : "abcdefgh").split("");
  const ranks = (isFlipped ? "12345678" : "87654321").split("");

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const square = target.dataset.square;
    if (!square) return;
    const column = files.indexOf(square[0]);
    const row = ranks.indexOf(square[1]);
    let nextColumn = column;
    let nextRow = row;
    if (event.key === "ArrowLeft") nextColumn = Math.max(0, column - 1);
    else if (event.key === "ArrowRight") nextColumn = Math.min(7, column + 1);
    else if (event.key === "ArrowUp") nextRow = Math.max(0, row - 1);
    else if (event.key === "ArrowDown") nextRow = Math.min(7, row + 1);
    else if (event.key === "Home") nextColumn = 0;
    else if (event.key === "End") nextColumn = 7;
    else if (event.key === "Escape") {
      if (selectedSquare) onSelectSquare(selectedSquare);
      return;
    } else return;
    event.preventDefault();
    const nextSquare = `${files[nextColumn]}${ranks[nextRow]}` as ChessSquare;
    setFocusedSquare(nextSquare);
    boardRef.current
      ?.querySelector<HTMLButtonElement>(`[data-square="${nextSquare}"]`)
      ?.focus();
  };

  return (
    <div className="board-frame">
      <div className="board-ranks" aria-hidden="true">
        {ranks.map((rank) => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      <div
        className="chess-board"
        ref={boardRef}
        role="grid"
        aria-label="Bàn cờ. Dùng phím mũi tên để di chuyển, Enter để chọn quân và ô đích."
        onKeyDown={onKeyDown}
      >
        {ranks.map((rank) => (
          <div className="board-row" role="row" key={rank}>
            {files.map((file) => {
              const square = `${file}${rank}` as ChessSquare;
              const piece = chess.get(square);
              const isLight =
                (file.charCodeAt(0) - 97 + Number(rank) - 1) % 2 !== 0;
              const label = `${square}${piece ? `, ${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "trắng" : "đen"}` : ", ô trống"}`;
              return (
                <Square
                  key={square}
                  square={square}
                  label={label}
                  theme={theme}
                  isLight={isLight}
                  isSelected={selectedSquare === square}
                  isLastMove={
                    lastMove?.from === square || lastMove?.to === square
                  }
                  isValidMove={validMoves.includes(square)}
                  hasPiece={Boolean(piece)}
                  isKingInCheck={kingInCheckSquare === square}
                  tabIndex={focusedSquare === square ? 0 : -1}
                  onClick={() => {
                    setFocusedSquare(square);
                    onSelectSquare(square);
                  }}
                  onDropMove={onDropMove}
                >
                  {piece && (
                    <Piece
                      type={piece.type}
                      color={piece.color}
                      square={square}
                      isDraggable={canInteract && piece.color === currentTurn}
                    />
                  )}
                </Square>
              );
            })}
          </div>
        ))}
      </div>
      <div className="board-files" aria-hidden="true">
        {files.map((file) => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
}

interface SquareProps {
  square: ChessSquare;
  isLight: boolean;
  theme: BoardTheme;
  isSelected: boolean;
  isLastMove: boolean;
  isValidMove: boolean;
  hasPiece: boolean;
  isKingInCheck: boolean;
  label: string;
  tabIndex: number;
  children?: ReactNode;
  onClick: () => void;
  onDropMove: (from: ChessSquare, to: ChessSquare) => void;
}

function Square({
  square,
  isLight,
  theme,
  isSelected,
  isLastMove,
  isValidMove,
  hasPiece,
  isKingInCheck,
  label,
  tabIndex,
  children,
  onClick,
  onDropMove,
}: SquareProps) {
  const colors = BOARD_THEMES[theme];
  const backgroundColor = isSelected
    ? colors.highlightDark
    : isLastMove
      ? isLight
        ? colors.highlightLight
        : colors.highlightDark
      : isLight
        ? colors.light
        : colors.dark;
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const from = event.dataTransfer.getData("text/plain");
    if (/^[a-h][1-8]$/.test(from) && from !== square)
      onDropMove(from as ChessSquare, square);
  };
  return (
    <button
      type="button"
      role="gridcell"
      data-square={square}
      data-valid={isValidMove || undefined}
      aria-label={`${label}${isValidMove ? ", nước đi hợp lệ" : ""}${isKingInCheck ? ", đang bị chiếu" : ""}`}
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onClick={onClick}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={handleDrop}
      style={{ backgroundColor }}
      className={`board-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isKingInCheck ? "in-check" : ""}`}
    >
      {children}
      {isValidMove && (
        <span className={hasPiece ? "valid-capture" : "valid-move"} />
      )}
    </button>
  );
}

function Piece({
  type,
  color,
  square,
  isDraggable = true,
}: {
  type: PieceType;
  color: Color;
  square: ChessSquare;
  isDraggable?: boolean;
}) {
  const handleDragStart = (event: DragEvent) => {
    if (!isDraggable) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", square);
    event.dataTransfer.effectAllowed = "move";
    event.currentTarget.classList.add("is-dragging");
  };
  return (
    <span
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={(event) => event.currentTarget.classList.remove("is-dragging")}
      className={`board-piece ${isDraggable ? "draggable" : ""}`}
    >
      <ChessPieceIcon type={type} color={color} />
    </span>
  );
}

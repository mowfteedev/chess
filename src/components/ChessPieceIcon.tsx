import type { Color, PieceType } from '../types/chess'

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'Tốt',
  n: 'Mã',
  b: 'Tượng',
  r: 'Xe',
  q: 'Hậu',
  k: 'Vua',
}

export function ChessPieceIcon({
  type,
  color,
  className = '',
}: {
  type: PieceType
  color: Color
  className?: string
}) {
  const detail = color === 'w' ? '#455b50' : '#a2b7a5'
  return (
    <svg
      viewBox="0 0 48 48"
      fill={color === 'w' ? '#fff8e9' : '#263e34'}
      stroke={color === 'w' ? '#384c41' : '#152b21'}
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`chess-piece-icon ${className}`}
      aria-hidden="true"
    >
      {type === 'p' && (
        <>
          <circle cx="24" cy="13" r="6.1" />
          <path d="M19 20h10l-2 4c0 5 1.8 8.5 5 11H16c3.2-2.5 5-6 5-11z" />
          <path d="M16 35h16l3 5H13z" />
          <path d="M19 23h10" stroke={detail} />
        </>
      )}
      {type === 'r' && (
        <>
          <path d="M13 8h5v5h4V8h4v5h4V8h5v11l-5 4v10l4 3H14l4-3V23l-5-4z" />
          <path d="M14 36h20l2 5H12z" />
          <path d="M16 19h16M18 24h12M18 32h12" stroke={detail} />
        </>
      )}
      {type === 'n' && (
        <>
          <path d="m17 7 7 3 6-3 1 8c6 5 7 12 5 21H14c1-6 3-10 8-14l-5 2-6-3 3-7 6-4z" />
          <path d="M14 36h22l2 5H12z" />
          <path d="m28 14-3 8c-1 5 0 8 3 11M15 19l3 1" fill="none" stroke={detail} />
          <circle cx="22" cy="15.5" r="1.3" fill={detail} stroke="none" />
        </>
      )}
      {type === 'b' && (
        <>
          <circle cx="24" cy="7" r="2.3" />
          <path d="M24 10c-6 4-10 8-8 13 1 3 4 4 5 4l-2 7h10l-2-7c5-2 7-5 5-9-2-3-5-6-8-8z" />
          <path d="m26 13-5 8M19 28h10" fill="none" stroke={detail} />
          <path d="M16 34h16l4 7H12z" />
          <path d="M16 37h16" stroke={detail} />
        </>
      )}
      {type === 'q' && (
        <>
          <path d="m12 14 6 5 6-8 6 8 6-5-5 16H17z" />
          <circle cx="11" cy="11" r="2.5" />
          <circle cx="24" cy="8" r="2.5" />
          <circle cx="37" cy="11" r="2.5" />
          <path d="M17 30h14l-1 5 5 6H13l5-6z" />
          <path d="M18 26h12M18 34h12M17 38h14" stroke={detail} />
        </>
      )}
      {type === 'k' && (
        <>
          <path d="M24 5v10M20 9h8" fill="none" strokeWidth="2.8" />
          <path d="M24 17c-5-6-12-3-11 3 0 4 4 7 6 9l-1 6h12l-1-6c2-2 6-5 6-9 1-6-6-9-11-3z" />
          <path d="M18 35h12l5 6H13z" />
          <path d="M18 28h12M19 32h10M18 38h12M24 18v7" fill="none" stroke={detail} />
        </>
      )}
    </svg>
  )
}

import { Chess } from 'chess.js'
import type { Color, PieceSymbol as PieceType, Square } from 'chess.js'

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export type RoomStatus = 'idle' | 'opening' | 'waiting' | 'connected' | 'reconnecting' | 'error'
export type RoomRole = 'host' | 'guest'
export interface Resignation {
  winner: Color
  kind: 'resign'
}
export interface GameState {
  round: number
  moves: string[]
  hostColor: Color
  hostName: string
  guestName: string
  resignation: Resignation | null
  rematchBy: Color | null
}
export interface RoomState extends GameState {
  status: RoomStatus
  role: RoomRole | null
  code: string
  myColor: Color
  error: string | null
  pendingMove: boolean
}
export type MoveInput = { from: Square; to: Square; promotion?: PieceType }
export type Command =
  | { kind: 'move'; move: MoveInput }
  | { kind: 'resign' }
  | { kind: 'rematch' }
  | { kind: 'rematch-answer'; accept: boolean }
export const opposite = (color: Color): Color => (color === 'w' ? 'b' : 'w')
export const cleanName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').slice(0, 24) || 'Người chơi'
export function generateCode() {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (value) => ROOM_ALPHABET[value % 32],
  ).join('')
}
export function readCode(value: string) {
  let code = value.trim()
  try {
    code = new URLSearchParams(new URL(code).hash.slice(1)).get('room') ?? code
  } catch {
    /* A bare code is expected too. */
  }
  return code.toUpperCase()
}
export const validCode = (value: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(value)
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const color = (value: unknown): value is Color => value === 'w' || value === 'b'
const integer = (value: unknown, max = 2048): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
const name = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 24
export const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9-]{16,80}$/.test(value)
const square = (value: unknown): value is Square =>
  typeof value === 'string' && /^[a-h][1-8]$/.test(value)

export function isGameState(value: unknown): value is GameState {
  if (
    !record(value) ||
    !integer(value.round, 10000) ||
    !color(value.hostColor) ||
    !name(value.hostName) ||
    !name(value.guestName)
  )
    return false
  if (
    !Array.isArray(value.moves) ||
    value.moves.length > 2048 ||
    !value.moves.every((move) => typeof move === 'string' && move.length > 0 && move.length <= 16)
  )
    return false
  if (value.rematchBy !== null && !color(value.rematchBy)) return false
  return (
    value.resignation === null ||
    (record(value.resignation) &&
      value.resignation.kind === 'resign' &&
      color(value.resignation.winner))
  )
}
export function isCommand(value: unknown): value is Command {
  if (!record(value)) return false
  if (value.kind === 'resign' || value.kind === 'rematch') return true
  if (value.kind === 'rematch-answer') return typeof value.accept === 'boolean'
  return (
    value.kind === 'move' &&
    record(value.move) &&
    square(value.move.from) &&
    square(value.move.to) &&
    (value.move.promotion === undefined ||
      (typeof value.move.promotion === 'string' &&
        ['q', 'r', 'b', 'n'].includes(value.move.promotion)))
  )
}
export function replayGame(game: GameState) {
  const chess = new Chess()
  for (const san of game.moves) {
    if (chess.isGameOver()) throw new Error('Moves after game over')
    const move = chess.move(san)
    if (!move || move.san !== san) throw new Error('Invalid move history')
  }
  if (game.resignation && chess.isGameOver()) throw new Error('Conflicting results')
  return chess
}

export function gamePgn(game: GameState) {
  const chess = replayGame(game)
  const winner = game.resignation?.winner ?? (chess.isCheckmate() ? opposite(chess.turn()) : null)
  const result = winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : chess.isDraw() ? '1/2-1/2' : '*'
  chess.header(
    'Event',
    'Gambit friendly game',
    'White',
    game.hostColor === 'w' ? game.hostName : game.guestName,
    'Black',
    game.hostColor === 'b' ? game.hostName : game.guestName,
    'Round',
    String(game.round + 1),
    'Result',
    result,
  )
  return chess.pgn()
}

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message)
  }
}
export function initialGame(hostName: string, hostColor: Color): GameState {
  return {
    round: 0,
    moves: [],
    hostColor,
    hostName: cleanName(hostName),
    guestName: 'Bạn chơi',
    resignation: null,
    rematchBy: null,
  }
}
export function applyCommand(game: GameState, actor: Color, command: Command): GameState {
  if (!isCommand(command)) throw new GameError('invalid_command', 'Yêu cầu chưa hợp lệ.', 400)
  const chess = replayGame(game)
  const finished = chess.isGameOver() || Boolean(game.resignation)
  if (command.kind === 'move') {
    if (finished) throw new GameError('game_finished', 'Ván đấu đã kết thúc.')
    if (chess.turn() !== actor) throw new GameError('wrong_turn', 'Chưa đến lượt của bạn.')
    if (game.moves.length >= 2048)
      throw new GameError('game_limit', 'Ván đấu đã đạt giới hạn lưu biên bản.')
    try {
      const moved = chess.move({ ...command.move, promotion: command.move.promotion ?? 'q' })
      if (!moved) throw new Error('Invalid move')
    } catch {
      throw new GameError('illegal_move', 'Nước đi chưa hợp lệ. Bạn chọn lại quân nhé.', 422)
    }
    return { ...game, moves: chess.history() }
  }
  if (command.kind === 'resign') {
    if (finished) throw new GameError('game_finished', 'Ván đấu đã kết thúc.')
    return { ...game, resignation: { kind: 'resign', winner: opposite(actor) }, rematchBy: null }
  }
  if (!finished)
    throw new GameError('game_in_progress', 'Đấu lại sau khi ván hiện tại kết thúc nhé.')
  const reset = () => ({
    ...game,
    round: game.round + 1,
    hostColor: opposite(game.hostColor),
    moves: [],
    resignation: null,
    rematchBy: null,
  })
  if (command.kind === 'rematch')
    return game.rematchBy && game.rematchBy !== actor ? reset() : { ...game, rematchBy: actor }
  if (!game.rematchBy || game.rematchBy === actor)
    throw new GameError('no_offer', 'Chưa có lời mời đấu lại từ bạn chơi.')
  return command.accept ? reset() : { ...game, rematchBy: null }
}

export interface RoomRecord {
  code: string
  host_uid: string
  guest_uid: string | null
  game: GameState
  revision: number
  host_seen: string
  guest_seen: string | null
  host_left: boolean
  guest_left: boolean
  created_at: string
  expires_at: string
}
export interface RoomSnapshot {
  code: string
  game: GameState
  revision: number
  role: RoomRole
  hostPresent: boolean
  guestPresent: boolean
}
export function roomSnapshot(room: RoomRecord, userId: string, now = Date.now()): RoomSnapshot {
  if (userId !== room.host_uid && userId !== room.guest_uid)
    throw new GameError('not_member', 'Bạn chưa thuộc phòng này.', 403)
  if (Date.parse(room.expires_at) <= now)
    throw new GameError('room_expired', 'Phòng đã hết hạn. Hai người tạo phòng mới nhé.', 410)
  return {
    code: room.code,
    game: room.game,
    revision: room.revision,
    role: userId === room.host_uid ? 'host' : 'guest',
    hostPresent: !room.host_left && now - Date.parse(room.host_seen) < 45000,
    guestPresent: Boolean(
      room.guest_uid &&
      !room.guest_left &&
      room.guest_seen &&
      now - Date.parse(room.guest_seen) < 45000,
    ),
  }
}
export function isRoomRecord(value: unknown): value is RoomRecord {
  if (!record(value)) return false
  return (
    typeof value.code === 'string' &&
    validCode(value.code) &&
    typeof value.host_uid === 'string' &&
    (value.guest_uid === null || typeof value.guest_uid === 'string') &&
    isGameState(value.game) &&
    integer(value.revision, Number.MAX_SAFE_INTEGER) &&
    typeof value.host_seen === 'string' &&
    (value.guest_seen === null || typeof value.guest_seen === 'string') &&
    typeof value.host_left === 'boolean' &&
    typeof value.guest_left === 'boolean' &&
    typeof value.expires_at === 'string'
  )
}

import { test, expect } from '@playwright/test'
import {
  applyCommand,
  gamePgn,
  isCommand,
  isGameState,
  readCode,
  replayGame,
  roomSnapshot,
  validCode,
  type GameState,
  type RoomRecord,
} from '../../src/multiplayer/protocol'
const state = (): GameState => ({
  round: 0,
  moves: [],
  hostColor: 'w',
  hostName: 'Minh',
  guestName: 'An',
  resignation: null,
  rematchBy: null,
})
test('commands reject invalid coordinates, promotion types and oversized history', () => {
  expect(isCommand({ kind: 'move', move: { from: 'e2', to: 'e4' } })).toBe(true)
  expect(isCommand({ kind: 'move', move: { from: 'z9', to: 'e4' } })).toBe(false)
  expect(isCommand({ kind: 'move', move: { from: 'e7', to: 'e8', promotion: ['q'] } })).toBe(false)
  expect(isGameState({ ...state(), moves: Array(2049).fill('e4') })).toBe(false)
})
test('authoritative game transition rejects illegal moves and wrong turns', () => {
  expect(() =>
    applyCommand(state(), 'b', { kind: 'move', move: { from: 'e7', to: 'e5' } }),
  ).toThrow('Chưa đến lượt')
  expect(() =>
    applyCommand(state(), 'w', { kind: 'move', move: { from: 'e2', to: 'e5' } }),
  ).toThrow('chưa hợp lệ')
  expect(
    applyCommand(state(), 'w', { kind: 'move', move: { from: 'e2', to: 'e4' } }).moves,
  ).toEqual(['e4'])
  expect(() => applyCommand(state(), 'w', { kind: 'rematch' })).toThrow('Đấu lại sau')
})
test('snapshot replay rejects illegal and post-game moves', () => {
  expect(() => replayGame({ ...state(), moves: ['e5'] })).toThrow()
  expect(() => replayGame({ ...state(), moves: ['f3', 'e5', 'g4', 'Qh4#', 'a3'] })).toThrow()
  expect(() =>
    replayGame({
      ...state(),
      moves: ['f3', 'e5', 'g4', 'Qh4#'],
      resignation: { kind: 'resign', winner: 'w' },
    }),
  ).toThrow()
})
test('PGN records names, round and resignation result', () => {
  const pgn = gamePgn({
    ...state(),
    round: 1,
    hostColor: 'b',
    moves: ['e4', 'e5'],
    resignation: { kind: 'resign', winner: 'b' },
  })
  expect(pgn).toContain('[White "An"]')
  expect(pgn).toContain('[Black "Minh"]')
  expect(pgn).toContain('[Round "2"]')
  expect(pgn).toContain('1. e4 e5 0-1')
})
test('room codes support invitation links and reject ambiguous characters', () => {
  expect(readCode('ab2345')).toBe('AB2345')
  expect(readCode('https://example.com/chess/?v=release#room=AB2345')).toBe('AB2345')
  expect(validCode('ABC234')).toBe(true)
  expect(validCode('ABC0O1')).toBe(false)
})
test('server snapshot enforces membership and expiry', () => {
  const row: RoomRecord = {
    code: 'ABC234',
    host_uid: 'host',
    guest_uid: 'guest',
    game: state(),
    revision: 1,
    host_seen: new Date().toISOString(),
    guest_seen: new Date().toISOString(),
    host_left: false,
    guest_left: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60000).toISOString(),
  }
  expect(roomSnapshot(row, 'host').guestPresent).toBe(true)
  expect(() => roomSnapshot(row, 'third')).toThrow('chưa thuộc phòng')
  expect(() => roomSnapshot({ ...row, expires_at: '2000-01-01T00:00:00Z' }, 'host')).toThrow(
    'hết hạn',
  )
})

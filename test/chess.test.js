import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

test('AC-1: Initial Chess Setup', () => {
  const game = new Chess()
  assert.equal(game.turn(), 'w', 'White should move first')
  assert.equal(game.isGameOver(), false, 'Game should not be over at start')
  // 16 pawn moves (single & double step) + 4 knight moves = 20 legal moves
  assert.equal(game.moves().length, 20, 'White should have exactly 20 initial legal moves')
})

test('AC-2: FIDE Castling Rules (Kingside & Queenside)', () => {
  const game = new Chess()
  // Setup Kingside castling for White
  game.move('e4')
  game.move('e5')
  game.move('Nf3')
  game.move('Nc6')
  game.move('Bc4')
  game.move('Bc5')

  const moves = game.moves()
  assert.ok(moves.includes('O-O'), 'Kingside castling O-O should be legal')

  const moveRes = game.move('O-O')
  assert.ok(moveRes, 'Castling move should succeed')
  assert.equal(game.get('g1')?.type, 'k', 'King should be on g1')
  assert.equal(game.get('f1')?.type, 'r', 'Rook should be on f1')
})

test('AC-2: FIDE En Passant Capture', () => {
  const game = new Chess()
  game.move('e4')
  game.move('a6')
  game.move('e5')
  game.move('d5') // Black pawn moves 2 squares past White pawn

  const moves = game.moves()
  assert.ok(moves.includes('exd6'), 'En passant capture exd6 should be legal')

  game.move('exd6')
  assert.equal(game.get('d5'), undefined, 'Captured black pawn on d5 should be removed')
  assert.equal(game.get('d6')?.type, 'p', 'White pawn should be on d6')
})

test('AC-3: Checkmate Detection (Scholar Mate)', () => {
  const game = new Chess()
  game.move('e4')
  game.move('e5')
  game.move('Qh5')
  game.move('Nc6')
  game.move('Bc4')
  game.move('Nf6')
  game.move('Qxf7#')

  assert.equal(game.inCheck(), true, 'King should be in check')
  assert.equal(game.isCheckmate(), true, 'Game should be in checkmate')
  assert.equal(game.isGameOver(), true, 'Game should be over')
})

test('AC-3: Pawn Promotion Detection', () => {
  // Setup FEN with a white pawn on 7th rank ready to promote
  const game = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1')
  const moves = game.moves({ verbose: true })
  const promotionMoves = moves.filter((m) => m.from === 'e7' && m.to === 'e8')

  assert.equal(promotionMoves.length, 4, 'Should offer 4 promotion options: q, r, b, n')
  const promoted = game.move({ from: 'e7', to: 'e8', promotion: 'q' })
  assert.ok(promoted)
  assert.equal(game.get('e8')?.type, 'q', 'Promoted piece should be queen')
})

import { createClient } from '@supabase/supabase-js'
import {
  applyCommand,
  cleanName,
  GameError,
  generateCode,
  initialGame,
  isCommand,
  opposite,
  roomSnapshot,
  validCode,
  type RoomRecord,
} from '../_shared/chess.ts'

const projectUrl = Deno.env.get('SUPABASE_URL')!
const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(projectUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const allowedOrigins = new Set([
  'https://mowfteedev.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])
const messages: Record<string, [number, string]> = {
  room_not_found: [404, 'Không tìm thấy phòng. Bạn kiểm tra lại mã nhé.'],
  room_expired: [410, 'Phòng đã hết hạn. Hai người tạo phòng mới nhé.'],
  room_full: [409, 'Phòng đã đủ hai người. Nhờ bạn gửi mã của một phòng mới nhé.'],
  host_offline: [409, 'Chủ phòng đang ngoại tuyến. Nhờ bạn mở lại trang tạo phòng nhé.'],
  opponent_offline: [409, 'Ván cờ tạm dừng trong lúc chờ bạn chơi kết nối lại.'],
  not_member: [403, 'Bạn chưa thuộc phòng này.'],
  stale_state: [409, 'Bàn cờ vừa được cập nhật. Đồng bộ lại rồi thử nước đi nhé.'],
  idempotency_conflict: [409, 'Mã yêu cầu đã được sử dụng cho một thao tác khác.'],
  room_rate_limit: [429, 'Bạn đã tạo nhiều phòng. Chờ một chút rồi thử lại nhé.'],
}
function dbError(message: string): never {
  const code = Object.keys(messages).find((key) => message.includes(key))
  if (code) throw new GameError(code, messages[code][1], messages[code][0])
  throw new GameError('server_error', 'Máy chủ chưa xử lý được yêu cầu. Bạn thử lại nhé.', 503)
}
const validId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
async function fingerprint(value: unknown) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('')
}
Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  })
  if (origin && allowedOrigins.has(origin)) headers.set('Access-Control-Allow-Origin', origin)
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })
  if (origin && !allowedOrigins.has(origin))
    return respond(
      { error: { code: 'origin_denied', message: 'Nguồn truy cập chưa được hỗ trợ.' } },
      403,
    )
  if (request.method === 'GET') {
    const { error } = await admin.from('gambit_rooms').select('code').limit(0)
    return respond({ status: error ? 'unavailable' : 'ok', protocol: 2 }, error ? 503 : 200)
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST')
    return respond(
      { error: { code: 'method_not_allowed', message: 'Phương thức chưa được hỗ trợ.' } },
      405,
    )
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) throw new GameError('not_authenticated', 'Phiên chơi chưa được xác thực.', 401)
    const { data: auth, error: authError } = await admin.auth.getUser(token)
    if (authError || !auth.user)
      throw new GameError('not_authenticated', 'Phiên chơi đã hết hạn. Bạn kết nối lại nhé.', 401)
    const actor = auth.user.id
    const raw = await request.text()
    if (raw.length > 4096) throw new GameError('payload_too_large', 'Yêu cầu quá dài.', 413)
    let input: Record<string, unknown>
    try {
      input = JSON.parse(raw)
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error()
    } catch {
      throw new GameError('invalid_json', 'Yêu cầu chưa hợp lệ.', 400)
    }
    if (input.action === 'create') {
      if (
        typeof input.name !== 'string' ||
        input.name.length > 48 ||
        typeof input.color !== 'string' ||
        !['w', 'b'].includes(input.color)
      )
        throw new GameError('invalid_input', 'Tên hoặc màu quân chưa hợp lệ.', 400)
      const game = initialGame(input.name, input.color as 'w' | 'b')
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await admin.rpc('gambit_create_room', {
          p_actor: actor,
          p_code: generateCode(),
          p_game: game,
        })
        if (error?.code === '23505') continue
        if (error) dbError(error.message)
        return respond({ room: roomSnapshot(data as RoomRecord, actor) }, 201)
      }
      throw new GameError('code_busy', 'Chưa cấp được mã phòng. Bạn thử lại nhé.', 503)
    }
    if (typeof input.code !== 'string' || !validCode(input.code))
      throw new GameError('invalid_code', 'Mã phòng gồm 6 ký tự.', 400)
    const code = input.code
    if (input.action === 'join') {
      if (typeof input.name !== 'string' || input.name.length > 48)
        throw new GameError('invalid_name', 'Tên người chơi chưa hợp lệ.', 400)
      const { data, error } = await admin.rpc('gambit_join_room', {
        p_actor: actor,
        p_code: code,
        p_name: cleanName(input.name),
      })
      if (error) dbError(error.message)
      return respond({ room: roomSnapshot(data as RoomRecord, actor) })
    }
    if (
      input.action !== 'command' ||
      !validId(input.id) ||
      !isCommand(input.command) ||
      !Number.isInteger(input.round) ||
      !Number.isInteger(input.ply)
    )
      throw new GameError('invalid_command', 'Yêu cầu chưa hợp lệ.', 400)
    const { data: row, error: readError } = await admin
      .from('gambit_rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle()
    if (readError) dbError(readError.message)
    if (!row) throw new GameError('room_not_found', messages.room_not_found[1], 404)
    const room = row as RoomRecord
    const snapshot = roomSnapshot(room, actor)
    const hash = await fingerprint(input.command)
    const { data: previous, error: lookupError } = await admin
      .from('gambit_commands')
      .select('actor_uid,fingerprint')
      .eq('room_code', code)
      .eq('command_id', input.id)
      .maybeSingle()
    if (lookupError) dbError(lookupError.message)
    if (previous) {
      if (previous.actor_uid !== actor || previous.fingerprint !== hash)
        throw new GameError('idempotency_conflict', messages.idempotency_conflict[1])
      return respond({ room: snapshot })
    }
    if (input.round !== room.game.round || input.ply !== room.game.moves.length)
      throw new GameError('stale_state', messages.stale_state[1])
    const color = snapshot.role === 'host' ? room.game.hostColor : opposite(room.game.hostColor)
    const next = applyCommand(room.game, color, input.command)
    const { data: changed, error: commitError } = await admin.rpc('gambit_commit_command', {
      p_actor: actor,
      p_code: code,
      p_command: input.id,
      p_fingerprint: hash,
      p_revision: room.revision,
      p_game: next,
    })
    if (commitError) dbError(commitError.message)
    return respond({ room: roomSnapshot(changed as RoomRecord, actor) })
  } catch (error) {
    if (error instanceof GameError)
      return respond({ error: { code: error.code, message: error.message } }, error.status)
    return respond(
      {
        error: { code: 'server_error', message: 'Máy chủ chưa phản hồi. Bạn thử kết nối lại nhé.' },
      },
      503,
    )
  }
})

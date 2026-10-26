begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Expand only: existing games stay untimed, existing function signatures remain usable.
-- The JSON clock is initialized by verified Edge code and never written by browser roles.
create or replace function public.gambit_join_room(p_actor uuid, p_code text, p_name text)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare r public.gambit_rooms; next_game jsonb; joined_at timestamptz;
begin
  if char_length(p_name) < 1 or char_length(p_name) > 24 then raise exception 'invalid_name'; end if;
  select * into r from public.gambit_rooms where code = p_code for update;
  if not found then raise exception 'room_not_found'; end if;
  joined_at := clock_timestamp();
  if r.expires_at <= joined_at then raise exception 'room_expired'; end if;
  if r.host_uid = p_actor then
    update public.gambit_rooms set host_seen = joined_at, host_left = false where code = p_code returning * into r;
  elsif r.guest_uid = p_actor then
    update public.gambit_rooms set guest_seen = joined_at, guest_left = false where code = p_code returning * into r;
  elsif r.guest_uid is not null then
    raise exception 'room_full';
  elsif r.host_left or r.host_seen < joined_at - interval '45 seconds' then
    raise exception 'host_offline';
  else
    next_game := jsonb_set(r.game, '{guestName}', to_jsonb(p_name));
    if jsonb_typeof(next_game->'clock') = 'object' then
      next_game := jsonb_set(next_game, '{clock,runningSince}', to_jsonb(floor(extract(epoch from joined_at) * 1000)::bigint));
    end if;
    update public.gambit_rooms set guest_uid = p_actor, guest_seen = joined_at, guest_left = false,
      game = next_game, revision = revision + 1
      where code = p_code returning * into r;
  end if;
  return r;
end $$;

-- One database round trip replaces separate room and idempotency-receipt reads.
create function public.gambit_command_context(p_actor uuid, p_code text, p_command uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'room', to_jsonb(r),
    'receipt', case when c.command_id is null then null else jsonb_build_object('actor_uid', c.actor_uid, 'fingerprint', c.fingerprint) end,
    'serverNow', floor(extract(epoch from statement_timestamp()) * 1000)::bigint
  ) into result
  from public.gambit_rooms r
  left join public.gambit_commands c on c.room_code = r.code and c.command_id = p_command
  where r.code = p_code;
  if result is null then raise exception 'room_not_found'; end if;
  if p_actor::text is distinct from result->'room'->>'host_uid'
     and p_actor::text is distinct from result->'room'->>'guest_uid' then
    raise exception 'not_member';
  end if;
  return result;
end $$;

-- Legal chess transitions are verified in Edge; membership/revision/idempotency and
-- elapsed time are checked again under the same row lock that commits the move.
create function public.gambit_commit_command_v2(
  p_actor uuid, p_code text, p_command uuid, p_fingerprint text, p_revision bigint,
  p_game jsonb, p_kind text, p_timeout_winner text, p_finished boolean
)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare
  r public.gambit_rooms;
  previous public.gambit_commands;
  next_game jsonb := p_game;
  current_clock jsonb;
  committed_at timestamptz;
  at_ms bigint;
  elapsed_ms bigint;
  white_ms bigint;
  black_ms bigint;
  initial_ms bigint;
  turn_color text;
  winner_color text;
  new_round boolean;
  timed boolean;
begin
  select * into r from public.gambit_rooms where code = p_code for update;
  if not found then raise exception 'room_not_found'; end if;
  committed_at := clock_timestamp();
  at_ms := floor(extract(epoch from committed_at) * 1000)::bigint;
  if p_actor is distinct from r.host_uid and p_actor is distinct from r.guest_uid then raise exception 'not_member'; end if;
  if r.expires_at <= committed_at then raise exception 'room_expired'; end if;
  select * into previous from public.gambit_commands where room_code = p_code and command_id = p_command;
  if found then
    if previous.actor_uid <> p_actor or previous.fingerprint <> p_fingerprint then raise exception 'idempotency_conflict'; end if;
    return r;
  end if;
  if r.revision <> p_revision then raise exception 'stale_state'; end if;
  if p_kind not in ('move', 'resign', 'rematch', 'rematch-answer', 'claim-timeout') or p_finished is null then raise exception 'invalid_state'; end if;
  if p_game->>'hostName' is distinct from r.game->>'hostName' or p_game->>'guestName' is distinct from r.game->>'guestName' then raise exception 'invalid_state'; end if;
  if p_game->>'hostColor' is distinct from r.game->>'hostColor' and (p_game->>'round')::integer = (r.game->>'round')::integer then raise exception 'invalid_state'; end if;
  new_round := (p_game->>'round')::integer = (r.game->>'round')::integer + 1;
  if not new_round and p_game->>'round' is distinct from r.game->>'round' then raise exception 'invalid_state'; end if;
  current_clock := r.game->'clock';
  timed := jsonb_typeof(current_clock) = 'object';
  if r.guest_uid is null then raise exception 'opponent_offline'; end if;
  -- Timed games continue when the other player disconnects; a new round still
  -- requires both players online and their independently verified consent.
  if (not coalesce(timed, false) or new_round) and (
    r.host_left or r.guest_left or r.host_seen < committed_at - interval '45 seconds'
    or r.guest_seen < committed_at - interval '45 seconds'
  ) then raise exception 'opponent_offline'; end if;

  if coalesce(timed, false) then
    initial_ms := (current_clock->>'initialMs')::bigint;
    white_ms := (current_clock->>'whiteMs')::bigint;
    black_ms := (current_clock->>'blackMs')::bigint;
    if initial_ms not in (60000, 300000, 600000) or (p_game->'clock'->>'initialMs')::bigint is distinct from initial_ms then raise exception 'invalid_state'; end if;
    turn_color := case when jsonb_array_length(r.game->'moves') % 2 = 0 then 'w' else 'b' end;
    winner_color := case when turn_color = 'w' then 'b' else 'w' end;
    if p_timeout_winner is not null and p_timeout_winner <> winner_color then raise exception 'invalid_state'; end if;
    if current_clock->>'runningSince' is not null then
      elapsed_ms := greatest(0, at_ms - (current_clock->>'runningSince')::bigint);
      if turn_color = 'w' then white_ms := greatest(0, white_ms - elapsed_ms);
      else black_ms := greatest(0, black_ms - elapsed_ms); end if;
    end if;

    if current_clock->>'runningSince' is not null and ((turn_color = 'w' and white_ms = 0) or (turn_color = 'b' and black_ms = 0)) then
      -- Even a move validated just before expiry loses if it reaches the commit
      -- lock after flag fall. Preserve the last confirmed board in that case.
      next_game := r.game || jsonb_build_object(
        'clock', jsonb_build_object('initialMs', initial_ms, 'whiteMs', white_ms, 'blackMs', black_ms, 'runningSince', null),
        'timeout', jsonb_build_object('winner', p_timeout_winner),
        'rematchBy', null
      );
    elsif p_kind = 'claim-timeout' then
      if r.game->'timeout' is null or r.game->'timeout' = 'null'::jsonb then raise exception 'clock_running'; end if;
      return r;
    elsif new_round then
      next_game := p_game || jsonb_build_object('clock', jsonb_build_object(
        'initialMs', initial_ms, 'whiteMs', initial_ms, 'blackMs', initial_ms, 'runningSince', at_ms
      ), 'timeout', null);
    else
      next_game := jsonb_set(p_game, '{clock}', jsonb_build_object(
        'initialMs', initial_ms, 'whiteMs', white_ms, 'blackMs', black_ms,
        'runningSince', case when p_finished or current_clock->>'runningSince' is null then null else at_ms end
      ));
    end if;
  elsif p_kind = 'claim-timeout' then
    raise exception 'clock_running';
  end if;

  update public.gambit_rooms set game = next_game, revision = revision + 1,
    host_seen = case when p_actor = host_uid then committed_at else host_seen end,
    guest_seen = case when p_actor = guest_uid then committed_at else guest_seen end
    where code = p_code returning * into r;
  insert into public.gambit_commands(room_code, command_id, actor_uid, fingerprint, applied_revision)
    values (p_code, p_command, p_actor, p_fingerprint, r.revision);
  return r;
end $$;

revoke all on function public.gambit_join_room(uuid,text,text), public.gambit_command_context(uuid,text,uuid), public.gambit_commit_command_v2(uuid,text,uuid,text,bigint,jsonb,text,text,boolean) from public, anon, authenticated;
grant execute on function public.gambit_join_room(uuid,text,text), public.gambit_command_context(uuid,text,uuid), public.gambit_commit_command_v2(uuid,text,uuid,text,bigint,jsonb,text,text,boolean) to service_role;
commit;
